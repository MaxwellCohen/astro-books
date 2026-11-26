import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('hovering a link prefetches the target before click', async ({ page }, info) => {
  const log: { url: string; at: number }[] = [];
  page.on('request', (r) => log.push({ url: r.url(), at: Date.now() }));
  await page.goto('/feature-tests/route-prefetching');
  await page.waitForLoadState('networkidle');
  const isTarget = (u: string) => new URL(u).pathname.replace(/\/$/, '') === '/feature-tests/prefetch-target';
  expect(log.some((r) => isTarget(r.url))).toBe(false);

  await page.hover('#ft-prefetch-link');
  await expect.poll(() => log.some((r) => isTarget(r.url)), { timeout: 5_000 }).toBe(true);
  const prefetchedAt = log.find((r) => isTarget(r.url))!.at;
  const clickAt = Date.now();
  await page.click('#ft-prefetch-link');
  await expect(page.locator('#ft-prefetch-target')).toBeVisible();
  expect(prefetchedAt).toBeLessThan(clickAt);
  note(info, "prefetch: { prefetchAll: true, defaultStrategy: 'hover' } + data-astro-prefetch=\"hover\"",
    `no request for the target on load; hover fired GET /feature-tests/prefetch-target ${clickAt - prefetchedAt} ms before the click`);
});
