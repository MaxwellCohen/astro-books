import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('route CSS is inlined, no render-blocking stylesheet link for it', async ({ request }, info) => {
  const html = await (await request.get('/feature-tests/css-inlining')).text();
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const routeStyle = styles.find((s) => s.includes('--ft-css-marker:inlined'));
  expect(routeStyle, 'inline <style> containing the route CSS').toBeTruthy();
  const links = html.match(/<link[^>]*rel=["']?stylesheet[^>]*>/g) ?? [];
  // The route's CSS must not be in any linked stylesheet (the shared Tailwind sheet may stay linked).
  const linkedWithMarker: string[] = [];
  for (const link of links) {
    const href = link.match(/href=["']?([^"'\s>]+)/)?.[1];
    if (!href) continue;
    const css = await (await request.get(href)).text();
    if (css.includes('--ft-css-marker')) linkedWithMarker.push(href);
  }
  expect(linkedWithMarker).toEqual([]);
  note(info, "Astro default build.inlineStylesheets: 'auto' (no config change)",
    `inline <style> contains the route's scoped .ft-css-marker rule; ${links.length} <link rel=stylesheet> in the HTML, none holding the route rule`);
});
