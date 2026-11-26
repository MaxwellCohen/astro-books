import { expect, test } from '@playwright/test';
import { note } from './helpers';

const stampOf = (html: string) => html.match(/id="ft-stamp">([^<]+)</)![1];

test('route cache reuses the render within maxAge, refreshes after invalidation and TTL', async ({ request }, info) => {
  // Start from a clean entry.
  await request.post('/feature-tests/caching-invalidate');
  const r1 = await request.get('/feature-tests/caching');
  const r2 = await request.get('/feature-tests/caching');
  const a = stampOf(await r1.text());
  const b = stampOf(await r2.text());
  expect(b).toBe(a);
  const hit = r2.headers()['x-astro-cache'];

  const inv = await request.post('/feature-tests/caching-invalidate');
  expect(inv.ok()).toBe(true);
  const c = stampOf(await (await request.get('/feature-tests/caching')).text());
  expect(c).not.toBe(a);

  await new Promise((r) => setTimeout(r, 6_500)); // maxAge is 5 s
  const d = stampOf(await (await request.get('/feature-tests/caching')).text());
  expect(d).not.toBe(c);
  note(info, "cache: { provider: memoryCache() } + Astro.cache.set({ maxAge: 5, tags }) + cache.invalidate({ tags })",
    `2nd request reused stamp ${a} (x-astro-cache: ${hit}); after invalidate → new stamp; after 6.5 s TTL → new stamp again`);
});
