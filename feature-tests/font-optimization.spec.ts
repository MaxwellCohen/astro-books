import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('font is self-hosted, uses font-display and is preloaded', async ({ page }, info) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('/feature-tests/font-optimization');
  await page.evaluate(() => document.fonts.ready);
  const html = await page.content();

  const preload = html.match(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/)?.[0];
  expect(preload, '<link rel=preload as=font>').toBeTruthy();
  const href = preload!.match(/href="([^"]+)"/)![1];
  expect(href.startsWith('/_astro/fonts/')).toBe(true);

  const faces = html.match(/@font-face\{[^}]*\}/g) ?? [];
  expect(faces.length).toBeGreaterThan(0);
  expect(faces.every((f) => /font-display:swap/.test(f))).toBe(true);
  const fallback = faces.some((f) => /size-adjust/.test(f));

  expect(urls.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u))).toEqual([]);
  const fontReqs = urls.filter((u) => u.includes('/_astro/fonts/'));
  expect(fontReqs.length).toBeGreaterThan(0);
  const loaded = await page.evaluate(() => document.fonts.check('600 24px "Geist FT"'));
  expect(loaded).toBe(true);
  note(info, "top-level `fonts` config (fontProviders.local, Geist woff2) + <Font cssVariable preload /> from astro:assets",
    `preload ${href}; ${faces.length} @font-face with font-display:swap${fallback ? ' incl. size-adjusted fallback' : ''}; font served from /_astro/fonts, 0 Google Fonts requests; document.fonts reports Geist FT loaded`);
});
