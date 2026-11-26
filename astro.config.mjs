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

async function pickAdapter() {
  if (isNetlify) return (await import('@astrojs/netlify')).default();
  if (isCloudflare) return (await import('@astrojs/cloudflare')).default({ imageService: 'passthrough' });
  if (isVercel) return (await import('@astrojs/vercel')).default();
  return node({ mode: 'standalone' });
}

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
  // feature-tests/route-prefetching: loads Astro's prefetch script so data-astro-prefetch links work.
  // `true` (not prefetchAll) leaves links without the attribute alone.
  prefetch: true,
  // feature-tests/islands + reactivity: Solid islands (official integration).
  // feature-tests/third-party-scripts: official Partytown integration.
  integrations: [solid(), partytown()],
  // feature-tests/font-optimization: built-in Fonts API with a local (self-hosted) source.
  fonts: [
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
  // feature-tests/caching: built-in route cache (astro@7) with the in-memory provider.
  cache: { provider: memoryCache() },
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
