import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('signal updates the bound text without re-running the component', async ({ page }, info) => {
  await page.goto('/feature-tests/reactivity');
  await expect(page.locator('astro-island:not([ssr])')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__ftRenders)).toBe(1);
  for (let i = 0; i < 3; i++) await page.click('#ft-inc');
  await expect(page.locator('#ft-count')).toHaveText('3');
  const renders = await page.evaluate(() => window.__ftRenders);
  expect(renders).toBe(1);
  note(info, 'Solid signal (createSignal) in a client:load island via the official @astrojs/solid-js integration',
    `count text went 0 → 3 after 3 clicks; component render counter stayed at ${renders}`);
});

declare global {
  interface Window { __ftRenders?: number }
}
