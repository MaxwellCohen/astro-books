import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

const isNetlify = !!process.env.NETLIFY;
const isCloudflare = !!(process.env.CLOUDFLARE || process.env.WORKERS_CI || process.env.CF_PAGES);
const isVercel = !!process.env.VERCEL;

async function pickAdapter() {
  if (isNetlify) return (await import('@astrojs/netlify')).default();
  if (isCloudflare) return (await import('@astrojs/cloudflare')).default({ imageService: 'passthrough' });
  if (isVercel) return (await import('@astrojs/vercel')).default();
  return node({ mode: 'standalone' });
}

export default defineConfig({
  output: 'server',
  adapter: await pickAdapter(),
  vite: { plugins: [tailwindcss()] },
  env: {
    schema: {
      POSTGRES_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      API_DELAY_MS: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
