import { readCatalogKv } from './catalog-kv'

export const CATALOG_CACHE_REVALIDATE_SECONDS = 3600

const TTL_MS = CATALOG_CACHE_REVALIDATE_SECONDS * 1000

type Entry<T> = { expiresAt: number; value: T }

const memory = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

function envFlag(name: string) {
  try {
    return typeof process !== 'undefined' ? process.env?.[name] : undefined
  } catch {
    return undefined
  }
}

function isVercel() {
  return Boolean(envFlag('VERCEL')) && !envFlag('CLOUDFLARE')
}

function isNetlify() {
  return (
    Boolean(envFlag('NETLIFY') || envFlag('NETLIFY_BLOBS_CONTEXT')) && !envFlag('CLOUDFLARE') && !envFlag('VERCEL')
  )
}

function memoryGet<T>(key: string): T | undefined {
  const hit = memory.get(key) as Entry<T> | undefined
  if (hit && hit.expiresAt > Date.now()) return hit.value
}

function memorySet<T>(key: string, value: T) {
  memory.set(key, { expiresAt: Date.now() + TTL_MS, value })
}

function kv() {
  try {
    return readCatalogKv()
  } catch {
    return undefined
  }
}

function edgeRequest(key: string) {
  return new Request(`https://example.com/books-catalog-cache/v1/${encodeURIComponent(key)}`)
}

function edgeCache(): Cache | undefined {
  return (globalThis as typeof globalThis & { caches?: CacheStorage & { default?: Cache } }).caches?.default
}

async function platformGet<T>(key: string): Promise<T | undefined> {
  try {
    const store = kv()
    if (store) {
      const value = await store.get(key, 'json')
      if (value != null) return value as T
      return
    }
  } catch {
    // KV optional / not bound.
  }

  try {
    if (isVercel()) {
      const { getCache } = await import('@vercel/functions')
      const value = await getCache({ namespace: 'catalog' }).get(key)
      if (value != null) return value as T
      return
    }
  } catch {
    // Not running on Vercel.
  }

  try {
    if (isNetlify()) {
      const { getStore } = await import('@netlify/blobs')
      const stored = (await getStore('catalog-cache').get(key, { type: 'json' })) as Entry<T> | null
      if (stored && stored.expiresAt > Date.now()) return stored.value
      return
    }
  } catch {
    // Not running on Netlify.
  }

  try {
    const cache = edgeCache()
    if (cache) {
      const hit = await cache.match(edgeRequest(key))
      if (hit?.ok) return (await hit.json()) as T
    }
  } catch {
    // Ignore Cache API failures.
  }
}

async function platformSet<T>(key: string, value: T): Promise<void> {
  try {
    const store = kv()
    if (store) {
      await store.put(key, JSON.stringify(value), { expirationTtl: CATALOG_CACHE_REVALIDATE_SECONDS })
      return
    }
  } catch {
    // KV optional / not bound.
  }

  try {
    if (isVercel()) {
      const { getCache } = await import('@vercel/functions')
      await getCache({ namespace: 'catalog' }).set(key, value, {
        tags: ['catalog'],
        ttl: CATALOG_CACHE_REVALIDATE_SECONDS,
      })
      return
    }
  } catch {
    // Not running on Vercel.
  }

  try {
    if (isNetlify()) {
      const { getStore } = await import('@netlify/blobs')
      await getStore('catalog-cache').setJSON(key, { expiresAt: Date.now() + TTL_MS, value })
      return
    }
  } catch {
    // Not running on Netlify.
  }

  try {
    const cache = edgeCache()
    if (cache) {
      await cache.put(
        edgeRequest(key),
        new Response(JSON.stringify(value), {
          headers: {
            'Cache-Control': `max-age=${CATALOG_CACHE_REVALIDATE_SECONDS}`,
            'Content-Type': 'application/json',
          },
        }),
      )
    }
  } catch {
    // Ignore Cache API write failures.
  }
}

export async function cacheLifeHours<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cached = memoryGet<T>(key)
  if (cached !== undefined) return cached

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const next = (async () => {
    const remote = await platformGet<T>(key)
    if (remote !== undefined) {
      memorySet(key, remote)
      return remote
    }

    const value = await load()
    memorySet(key, value)
    await platformSet(key, value)
    return value
  })().finally(() => {
    inflight.delete(key)
  })

  inflight.set(key, next)
  return next
}

export function withTtlCache<Args extends unknown[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return (...args: Args) => cacheLifeHours(`${name}:${JSON.stringify(args)}`, () => fn(...args))
}
