import { execSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('ANALYZE=1 astro build writes a rollup-plugin-visualizer report', async ({}, info) => {
  const out = 'feature-tests/reports/bundle-stats.html';
  rmSync(out, { force: true });
  execSync('node_modules/.bin/astro build', { env: { ...process.env, ANALYZE: '1' }, stdio: 'pipe' });
  expect(existsSync(out)).toBe(true);
  const size = statSync(out).size;
  expect(size).toBeGreaterThan(1000);
  note(info, 'rollup-plugin-visualizer added to vite.plugins when ANALYZE=1 (Astro "analyze bundle size" recipe)',
    `ANALYZE=1 astro build wrote ${out} (${Math.round(size / 1024)} kB treemap)`);
});
