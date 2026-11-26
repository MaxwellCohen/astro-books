// Builds, serves and runs every feature spec, then writes feature-tests/results.json.
import { execSync, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const PORT = process.env.FT_PORT || '4119';
const LABELS = {
  'css-inlining': 'first-party', 'font-optimization': 'first-party', 'image-pipeline': 'first-party',
  caching: 'first-party', 'route-prefetching': 'first-party', islands: 'first-party',
  'render-modes': 'first-party', reactivity: 'first-party', 'bundle-analysis': 'third-party',
  'third-party-scripts': 'first-party', 'multi-host-deployment': 'first-party',
};
const pw = (project, report) =>
  spawnSync('node_modules/.bin/playwright', ['test', '-c', 'feature-tests/playwright.config.ts', `--project=${project}`], {
    stdio: 'inherit', env: { ...process.env, FT_PORT: PORT, FT_REPORT: report },
  });

mkdirSync('feature-tests/.out', { recursive: true });
// 1. Build-time features (these also leave dist/ as the node production build).
pw('build', '.out/build.json');

// 2. Production node server on PORT, runtime features.
const server = spawn('node', ['dist/server/entry.mjs'], { env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/feature-tests`)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  pw('browser', '.out/browser.json');
} finally {
  server.kill();
}

// 3. Collect results.
const results = {};
for (const file of ['build', 'browser']) {
  let report;
  try { report = JSON.parse(readFileSync(`feature-tests/.out/${file}.json`, 'utf8')); } catch { continue; }
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      const id = spec.file.replace(/^.*\//, '').replace(/\.spec\.ts$/, '');
      const t = spec.tests[0];
      const r = t.results.at(-1);
      const ann = Object.fromEntries((r?.annotations ?? t.annotations ?? []).map((a) => [a.type, a.description]));
      const ok = t.status === 'expected';
      results[id] = {
        claimedLabel: LABELS[id],
        status: ok ? 'pass' : 'fail',
        method: ann.method ?? '',
        evidence: ok ? ann.evidence : (r?.error?.message ?? 'failed').split('\n')[0].replace(/\u001b\[[0-9;]*m/g, ''),
        test: `feature-tests/${id}.spec.ts`,
      };
    }
    for (const s of suite.suites ?? []) walk(s);
  };
  for (const s of report.suites) walk(s);
}
for (const id of Object.keys(LABELS)) {
  results[id] ??= { claimedLabel: LABELS[id], status: 'fail', method: '', evidence: 'spec did not run', test: `feature-tests/${id}.spec.ts` };
}
// Label notes found while implementing (see README).
if (results.reactivity) results.reactivity.suggestedLabel = 'third-party';

const ordered = Object.fromEntries(Object.keys(LABELS).map((k) => [k, results[k]]));
const out = {
  framework: 'astro', repo: 'astro-books',
  commit: execSync('git rev-parse HEAD').toString().trim(),
  ranAt: new Date().toISOString(), results: ordered,
};
writeFileSync('feature-tests/results.json', JSON.stringify(out, null, 2) + '\n');
const failed = Object.values(ordered).filter((r) => r.status !== 'pass').length;
console.log(`\nfeature-tests/results.json written: ${11 - failed}/11 pass`);
process.exit(failed ? 1 : 0);
