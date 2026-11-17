# Astro Books

Goodreads catalog demo built with Astro (SSR, `@astrojs/node` standalone), Tailwind CSS v4, Drizzle + Neon. State lives in URL query params (`search, page, year, rating, pages, language, list, delay`); queries run on the server per request. `<ClientRouter />` provides client navigation.

## Env

- `POSTGRES_URL`: Neon Postgres connection string. When unset, a small preview catalog is served.
- `API_DELAY_MS`: optional artificial API delay in milliseconds.

Copy `.env.example` to `.env`. Both are read at runtime on the server.

## Commands

- `pnpm dev`: dev server
- `pnpm build`: production build
- `pnpm start`: run the built server (`HOST`/`PORT` are honored; loads `.env` via `node --env-file-if-exists`)
- `pnpm typecheck`: `astro check`

## Deployment

| Host | URL | Build flag |
| --- | --- | --- |
| Vercel | https://astro-books-eta.vercel.app | `VERCEL=1` (set by Vercel) |
| Netlify | https://max-astro-books.netlify.app | `NETLIFY=1` |
| Cloudflare Workers | https://astro-books.to-email-max.workers.dev | `CLOUDFLARE=1` (or `WORKERS_CI`, set by Workers Builds) |
| Vercel (`optimized` branch) | https://astro-books-optimized.vercel.app | `VERCEL=1` |
| Netlify (`optimized` branch) | https://astro-books-max-optimized.netlify.app | `NETLIFY=1` |
| Cloudflare Workers (`optimized`) | https://astro-books-optimized.to-email-max.workers.dev | `CLOUDFLARE=1` |

- Vercel and Netlify are connected to this repo: a push to `main` builds and deploys to both. Cloudflare is deployed with `pnpm deploy:cloudflare`.
- The build picks the host adapter from the flag above; with no flag it targets Node.
- `POSTGRES_URL` is set on every host (Vercel and Netlify environment variable, Cloudflare secret). Without it the app serves the preview catalog.
- Manual deploys: `pnpm deploy:vercel`, `pnpm deploy:netlify`, `pnpm deploy:cloudflare`.

### `optimized` branch

- Self-hosted Geist and Geist Mono (`@fontsource-variable/*`) replace the Google Fonts links, so fonts are served from the app's own origin.
- Catalog queries are cached for 1 hour with in-flight de-dup (in-memory, plus Vercel runtime cache, Netlify Blobs, or Workers KV `CATALOG_CACHE`), and HTML and hashed-asset `Cache-Control` headers are set per host.
