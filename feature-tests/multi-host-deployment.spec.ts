import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { note } from './helpers';

const build = (env: Record<string, string>) =>
  execSync('node_modules/.bin/astro build', { env: { ...process.env, ...env }, stdio: 'pipe' });

test('builds for several hosts with official adapters', async ({}, info) => {
  const seen: string[] = [];

  rmSync('.vercel/output', { recursive: true, force: true });
  build({ VERCEL: '1' });
  expect(existsSync('.vercel/output/config.json')).toBe(true);
  expect(existsSync('.vercel/output/functions/_render.func')).toBe(true);
  seen.push('vercel → .vercel/output/{config.json,functions/_render.func}');

  rmSync('.netlify', { recursive: true, force: true });
  build({ NETLIFY: '1' });
  expect(existsSync('.netlify/v1/functions/ssr')).toBe(true);
  seen.push('netlify → .netlify/v1/functions/ssr');

  // Node last so dist/ is left as the node build used by the browser tests.
  rmSync('dist', { recursive: true, force: true });
  build({});
  expect(existsSync('dist/server/entry.mjs')).toBe(true);
  expect(existsSync('dist/client')).toBe(true);
  seen.push('node → dist/server/entry.mjs');

  note(info, 'official adapters picked by env in astro.config.mjs: @astrojs/vercel, @astrojs/netlify, @astrojs/node',
    `3 builds succeeded: ${seen.join('; ')}`);
});
