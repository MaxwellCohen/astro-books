import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('only the island ships JS and hydrates; static component code is not shipped', async ({ page }, info) => {
  const js: { url: string; body: string }[] = [];
  page.on('response', async (r) => {
    const t = r.headers()['content-type'] ?? '';
    if (t.includes('javascript')) js.push({ url: r.url(), body: await r.text().catch(() => '') });
  });
  await page.goto('/feature-tests/islands');
  await expect(page.locator('#ft-static')).toBeVisible();
  const island = page.locator('#ft-island');
  await expect(page.locator('astro-island:not([ssr])')).toHaveCount(1);
  await island.click();
  await island.click();
  await expect(island).toHaveText(/clicks: 2/);
  await page.waitForLoadState('networkidle');

  const inline = await page.$$eval('script:not([src])', (s) => s.map((x) => x.textContent ?? '').join('\n'));
  const leaked = js.filter((f) => f.body.includes('FT_STATIC_ONLY_MARKER_9c41')).map((f) => f.url);
  expect(leaked).toEqual([]);
  expect(inline.includes('FT_STATIC_ONLY_MARKER_9c41')).toBe(false);
  expect(js.some((f) => f.body.includes('Island clicks'))).toBe(true);
  note(info, 'Solid component with client:load (island) next to a Solid component with no client directive (@astrojs/solid-js)',
    `island counter reached 2 after hydration; ${js.length} JS files fetched, marker of the static component found in 0 of them; island code found in client JS`);
});
