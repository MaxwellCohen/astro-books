import node from '@astrojs/node';
import partytown from '@astrojs/partytown';
import solid from '@astrojs/solid-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField, fontProviders, memoryCache } from 'astro/config';

const isNetlify = !!process.env.NETLIFY;
const isCloudflare = !!(process.env.CLOUDFLARE || process.env.WORKERS_CI || process.env.CF_PAGES);
const isVercel = !!process.env.VERCEL;
// feature-tests/bundle-analysis: `ANALYZE=1 astro build` adds rollup-plugin-visualizer (Astro's recipe).
const isAnalyze = !!process.env.ANALYZE;

// Goodreads cover hosts. Covers go through astro:assets <Image>, which each adapter maps to the
// host's image CDN (Vercel Image Optimization, Netlify Image CDN) and to sharp on the node server.
const COVER_DOMAINS = ['images.gr-assets.com', 's.gr-assets.com'];
// Covers are at most ~320px wide at the source, so larger widths would only re-encode the original.
const COVER_WIDTHS = [160, 240, 320, 480];

async function pickAdapter() {
  if (isNetlify) return (await import('@astrojs/netlify')).default({ imageCDN: true });
  if (isCloudflare) return (await import('@astrojs/cloudflare')).default({ imageService: 'passthrough' });
  if (isVercel)
    return (await import('@astrojs/vercel')).default({
      // Domains come from `image.domains` below; the adapter merges them in.
      imageService: true,
      imagesConfig: { sizes: COVER_WIDTHS, formats: ['image/avif', 'image/webp'] },
    });
  return node({ mode: 'standalone' });
}

// Route cache provider per host: CDN headers on Vercel / Netlify / Cloudflare, in-memory on the node server.
async function pickCacheProvider() {
  if (isNetlify) return (await import('@astrojs/netlify/cache')).cacheNetlify();
  if (isCloudflare) return (await import('@astrojs/cloudflare/cache')).cacheCloudflare();
  if (isVercel) return (await import('@astrojs/vercel/cache')).cacheVercel();
  return memoryCache();
}

// Catalog data changes rarely; matches the 1 h data-cache TTL in src/lib/catalog-cache.ts.
const CATALOG_PAGE_CACHE = { maxAge: 3600, swr: 86400, tags: ['catalog'] };

async function analyzePlugins() {
  if (!isAnalyze) return [];
  const { visualizer } = await import('rollup-plugin-visualizer');
  return [
    visualizer({
      filename: process.env.ANALYZE_OUT || 'feature-tests/reports/bundle-stats.html',
      template: 'treemap',
      gzipSize: true,
    }),
  ];
}

export default defineConfig({
  output: 'server',
  adapter: await pickAdapter(),
  // Built-in prefetch: every same-site link is fetched on hover/focus, so the CDN-cached page is
  // already in the browser cache when the ClientRouter navigates. (ClientRouter already implied
  // prefetchAll; this states it explicitly.)
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // Ship project CSS as <style> in the HTML: removes the render-blocking stylesheet request.
  build: { inlineStylesheets: 'always' },
  image: { domains: COVER_DOMAINS },
  // feature-tests/islands + reactivity: Solid islands (official integration).
  // feature-tests/third-party-scripts: official Partytown integration.
  integrations: [solid(), partytown()],
  // Built-in Fonts API: Astro downloads Geist / Geist Mono at build time, serves them from
  // /_astro/fonts, writes @font-face + metric-matched fallbacks, and <Font preload> adds the preload.
  fonts: [
    {
      name: 'Geist',
      cssVariable: '--font-geist-sans',
      provider: fontProviders.fontsource(),
      weights: ['100 900'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      display: 'swap',
    },
    {
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      provider: fontProviders.fontsource(),
      weights: ['100 900'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'],
      fallbacks: ['ui-monospace', 'monospace'],
      display: 'swap',
    },
    // feature-tests/font-optimization: built-in Fonts API with a local (self-hosted) source.
    {
      name: 'Geist FT',
      cssVariable: '--font-ft',
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: ['./node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
      display: 'swap',
    },
  ],
  // Built-in route cache (astro@7). On the hosts the adapter's provider turns these rules into
  // Vercel-CDN-Cache-Control / Netlify-CDN-Cache-Control / Cloudflare-CDN-Cache-Control + cache tags.
  // feature-tests/caching runs on the node server with the in-memory provider.
  cache: { provider: await pickCacheProvider() },
  routeRules: {
    '/': CATALOG_PAGE_CACHE,
    '/[id]': CATALOG_PAGE_CACHE,
  },
  vite: {
    plugins: [tailwindcss(), ...(await analyzePlugins())],
    resolve: {
      alias: isCloudflare
        ? [{ find: /^(.*)\/catalog-kv$/, replacement: '$1/catalog-kv.cloudflare' }]
        : [],
    },
  },
  env: {
    schema: {
      POSTGRES_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      API_DELAY_MS: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
