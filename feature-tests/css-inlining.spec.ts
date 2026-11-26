import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('route CSS is inlined, no render-blocking stylesheet link', async ({ request }, info) => {
  const html = await (await request.get('/feature-tests/css-inlining')).text();
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const routeStyle = styles.find((s) => s.includes('--ft-css-marker:inlined'));
  expect(routeStyle, 'inline <style> containing the route CSS').toBeTruthy();
  const links = html.match(/<link[^>]*rel=["']?stylesheet[^>]*>/g) ?? [];
  expect(links).toEqual([]);
  note(info, "build.inlineStylesheets: 'always' in astro.config.mjs",
    `inline <style> contains the route's scoped .ft-css-marker rule; ${links.length} <link rel=stylesheet> in the HTML`);
});
