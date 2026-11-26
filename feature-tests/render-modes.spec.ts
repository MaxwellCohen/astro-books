import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { note } from './helpers';

const stampOf = (html: string) => html.match(/id="ft-stamp">([^<]+)</)![1];

test('prerendered route is static; on-demand route renders per request', async ({ request }, info) => {
  const file = 'dist/client/feature-tests/render-modes/index.html';
  expect(existsSync(file)).toBe(true);
  expect(existsSync('dist/client/feature-tests/render-modes/ssr/index.html')).toBe(false);
  const s1 = stampOf(await (await request.get('/feature-tests/render-modes')).text());
  const s2 = stampOf(await (await request.get('/feature-tests/render-modes')).text());
  expect(s2).toBe(s1);
  const d1 = stampOf(await (await request.get('/feature-tests/render-modes/ssr')).text());
  const d2 = stampOf(await (await request.get('/feature-tests/render-modes/ssr')).text());
  expect(d2).not.toBe(d1);
  note(info, "output: 'server' with export const prerender = true / false per page",
    `${file} exists and its stamp is stable across requests; /render-modes/ssr has no HTML in build output and its stamp changed between requests`);
});
