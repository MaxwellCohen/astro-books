# Astro Books

Goodreads catalog demo built with Astro (SSR, `@astrojs/node` standalone), Tailwind CSS v4, Drizzle + Neon. State lives in URL query params (`search, page, year, rating, pages, language, list, delay`); queries run on the server per request. `<ClientRouter />` provides client navigation.

## Env

- `POSTGRES_URL`: Neon Postgres connection string. When unset, a small preview catalog is served.
- `API_DELAY_MS`: optional artificial API delay in milliseconds.

Copy `.env.example` to `.env`. Both are read at runtime on the server.

## Commands

- `pnpm dev`: dev server
- `pnpm build`: production build
- `pnpm start`: run the built server (`HOST=127.0.0.1 PORT=4321 node --env-file=.env ./dist/server/entry.mjs`; `.env` is not auto-loaded in production)
- `pnpm typecheck`: `astro check`
