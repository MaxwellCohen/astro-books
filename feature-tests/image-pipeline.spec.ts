import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('responsive, sized, lazy, modern-format images', async ({ page, request }, info) => {
  await page.goto('/feature-tests/image-pipeline');
  const imgs = await page.$$eval('img', (els) => els.map((e) => ({
    id: e.id, srcset: e.getAttribute('srcset') ?? '', width: e.getAttribute('width'),
    height: e.getAttribute('height'), loading: e.getAttribute('loading'),
  })));
  const hero = imgs.find((i) => i.id === 'ft-hero')!;
  const off = imgs.find((i) => i.id === 'ft-offscreen')!;
  const widths = [...new Set(hero.srcset.split(',').map((s) => s.trim().split(/\s+/)[1]).filter(Boolean))];
  expect(widths.length).toBeGreaterThanOrEqual(2);
  expect(hero.width).toBeTruthy();
  expect(hero.height).toBeTruthy();
  expect(off.loading).toBe('lazy');

  const first = hero.srcset.split(',')[0].trim().split(/\s+/)[0];
  const res = await request.get(first);
  expect(res.status()).toBe(200);
  const type = res.headers()['content-type'];
  expect(type).toMatch(/image\/(avif|webp)/);
  note(info, '<Image layout="constrained" /> from astro:assets with the default Sharp service',
    `srcset has ${widths.length} widths (${widths.join(' ')}); width=${hero.width} height=${hero.height}; offscreen img loading=${off.loading}; ${first} → ${type}`);
});
