# Feature tests

Checks every Framework Compare capability label for Astro against this app, using a production build.

```sh
pnpm install
pnpm test:features   # node feature-tests/run.mjs
```

`run.mjs` does the following:

1. Runs the `build` project: `bundle-analysis` and `multi-host-deployment`. These run `astro build` with different env vars, and the last build leaves `dist/` as the Node build.
2. Starts `node dist/server/entry.mjs` on `FT_PORT` (default 4119) and runs the `browser` project with Playwright. It uses the system Chrome at `/home/maxc/.local/bin/google-chrome`; set `CHROME_PATH` to override.
3. Writes `feature-tests/results.json`.

Each spec records its `method` and `evidence` as test annotations, and `run.mjs` copies them into the JSON.
Pages live at `/feature-tests/<id>` (`src/pages/feature-tests/`).

| Feature | Implementation | What the test proves |
| --- | --- | --- |
| css-inlining | default `build.inlineStylesheets: 'auto'` | the route's scoped CSS is in an inline `<style>` and in no linked stylesheet |
| font-optimization | `fonts` config (local provider) + `<Font cssVariable preload />` | `<link rel=preload as=font>` to `/_astro/fonts/…`, `@font-face` with `font-display:swap`, no Google Fonts requests, font loaded |
| image-pipeline | `<Image layout="constrained" />` (Sharp) | `srcset` has ≥2 widths, `width`/`height` are set, the offscreen image has `loading=lazy`, and a srcset URL returns `image/webp` |
| caching | `cache: { provider: memoryCache() }` + `Astro.cache.set({ maxAge: 5, tags })` | the timestamp repeats on the 2nd request (`x-astro-cache: HIT`) and changes after `cache.invalidate({ tags })` and after the TTL |
| route-prefetching | `prefetch: true` config + `data-astro-prefetch="hover"` | hovering requests the target route before the click |
| islands | Solid `client:load` island + Solid component without a directive | the island counter works, and the static component's marker string is in no shipped JS |
| render-modes | `prerender = true` vs `prerender = false` | the prerendered HTML exists in `dist/client` with a stable timestamp; the on-demand route's timestamp changes per request |
| reactivity | Solid `createSignal` via `@astrojs/solid-js` | the text updates 0→3 while the component's render counter stays at 1 |
| bundle-analysis | `rollup-plugin-visualizer` when `ANALYZE=1` | `feature-tests/reports/bundle-stats.html` is written |
| third-party-scripts | `@astrojs/partytown` + `type="text/partytown"` | the tag doesn't block parsing, the script is fetched and run in the worker (no main-thread global), and its DOM write lands |
| multi-host-deployment | adapters picked by env: `@astrojs/vercel`, `@astrojs/netlify`, `@astrojs/node` | `.vercel/output`, `.netlify/v1/functions/ssr` and `dist/server/entry.mjs` exist after each build |

Label note: Framework Compare marks reactivity as **first-party**, but `.astro` components have no reactivity of their own. It only works by installing a UI-framework integration (here Solid), so the results suggest **third-party**.
