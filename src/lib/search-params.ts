import { parseSearchParams, type SearchParams } from '@/lib/url-state';

/** Parses URL query params into catalog state, dropping empty values. */
export function getSearchParams(url: URL): SearchParams {
  const parsed = parseSearchParams(Object.fromEntries(url.searchParams));
  const clean: SearchParams = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined && value !== '') clean[key as keyof SearchParams] = value;
  }
  return clean;
}
