import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  await context.cache.invalidate({ tags: ['ft-cache'] });
  return new Response(JSON.stringify({ invalidated: ['ft-cache'] }), {
    headers: { 'content-type': 'application/json' },
  });
};
