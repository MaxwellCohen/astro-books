import { defineMiddleware } from 'astro:middleware'

const VERCEL_DOCUMENT_CACHE_CONTROL = 'public, max-age=0, must-revalidate'
const PRIVATE_DOCUMENT_CACHE_CONTROL = 'private, no-cache, no-store, max-age=0, must-revalidate'

const isVercel = !!process.env.VERCEL && !process.env.CLOUDFLARE

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next()
  if (!response.headers.get('content-type')?.includes('text/html')) return response
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', isVercel ? VERCEL_DOCUMENT_CACHE_CONTROL : PRIVATE_DOCUMENT_CACHE_CONTROL)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
})
