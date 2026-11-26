import { expect, test } from '@playwright/test';
import { note } from './helpers';

test('stand-in third-party script runs in a Partytown worker without blocking render', async ({ page }, info) => {
  const html = await (await page.request.get('/feature-tests/third-party-scripts')).text();
  const head = html.split('</head>')[0];
  const tag = head.match(/<script[^>]*ft-third-party\.js[^>]*>/)?.[0];
  expect(tag).toContain('type="text/partytown"');
  // Parser-blocking = external classic script without async/defer (module and partytown types never block).
  const blocking = (head.match(/<script\b[^>]*>/g) ?? []).filter(
    (t) => /\ssrc=/.test(t) && !/\stype="(module|text\/partytown)"/.test(t) && !/\s(async|defer)[\s>=]/.test(t),
  );
  expect(blocking).toEqual([]);

  const loads: string[] = [];
  page.context().on('request', (r) => { if (r.url().includes('/ft-third-party.js')) loads.push(r.resourceType()); });
  await page.goto('/feature-tests/third-party-scripts');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-third-party-ran', 'yes', { timeout: 20_000 });

  // In the worker the script is fetched with fetch() and evaluated there; a main-thread
  // fallback would load it as a <script> and set the global on window.
  expect(loads).toEqual(['fetch']);
  expect(await page.evaluate(() => (window as any).__ftThirdParty)).toBeUndefined();
  expect(await page.$$eval('script[src*="ft-third-party"]', (s) => s.map((x) => x.type))).toEqual(['text/partytown-x']);
  note(info, '@astrojs/partytown integration + <script type="text/partytown" src="/ft-third-party.js">',
    'tag is type=text/partytown and nothing in <head> is parser-blocking; the script was fetched by the Partytown worker (resourceType fetch, never as <script>), set body[data-third-party-ran] through the DOM proxy, and its window global is absent on the main thread');
});
