import { env } from 'cloudflare:workers'
import type { CatalogKv } from './catalog-kv'

/** Workers KV binding. Aliased in place of catalog-kv.ts when building for Cloudflare. */
export function readCatalogKv(): CatalogKv | undefined {
  return (env as { CATALOG_CACHE?: CatalogKv }).CATALOG_CACHE
}
