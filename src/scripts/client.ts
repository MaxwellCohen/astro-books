import { navigate } from 'astro:transitions/client';
import { MAX_PAGES, MAX_YEAR, MIN_RATING } from '@/features/book/book-constants';
import {
  buildHref,
  formatApiDelay,
  parseSearchParams,
  stringifySearchParams,
  withFilters,
} from '@/lib/url-state';
import type { SearchParams } from '@/lib/url-state';

const SEARCH_DEBOUNCE_MS = 220;
const THEME_KEY = 'theme';

let searchTimer: ReturnType<typeof setTimeout> | undefined;
let keepSidebarOpen = false;

function currentParams(): SearchParams {
  return parseSearchParams(Object.fromEntries(new URLSearchParams(location.search)));
}

const sidebar = () => document.querySelector<HTMLElement>('[data-mobile-sidebar]');
const isSidebarOpen = () => sidebar()?.hasAttribute('data-open') ?? false;
const setSidebarOpen = (open: boolean) => sidebar()?.toggleAttribute('data-open', open);

function setPending() {
  document.querySelector('[data-search-form]')?.setAttribute('data-filtering', '');
}

function updateFilters(patch: Partial<SearchParams>, replace = true) {
  keepSidebarOpen = isSidebarOpen();
  void navigate(buildHref(withFilters(currentParams(), patch)), { history: replace ? 'replace' : 'push' });
}

function updateDelay(delay: string | undefined) {
  const next = { ...currentParams(), delay };
  if (!delay) delete next.delay;
  const query = stringifySearchParams(next);
  keepSidebarOpen = isSidebarOpen();
  void navigate(query ? `${location.pathname}?${query}` : location.pathname, { history: 'replace' });
}

function submitSearch(value: string) {
  clearTimeout(searchTimer);
  const search = value.trim() || undefined;
  if (search === (currentParams().search || undefined) && location.pathname === '/') return;
  void navigate(buildHref(withFilters(currentParams(), { search })), {
    history: location.pathname === '/' ? 'replace' : 'push',
  });
}

function readRange(input: HTMLInputElement): number {
  const values = JSON.parse(input.dataset.values ?? '[]') as number[];
  return values[Number(input.value)] ?? 0;
}

function formatReadout(name: string, value: number): string {
  switch (name) {
    case 'year':
      return value === MAX_YEAR ? 'Any year' : String(value);
    case 'rating':
      return value > MIN_RATING ? `${value}+ stars` : 'Any rating';
    case 'pages':
      return value === MAX_PAGES ? 'Any length' : `${value.toLocaleString()} pages`;
    default:
      return formatApiDelay(value);
  }
}

function applyTheme(theme: string) {
  const dark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

function storedTheme(): string {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function syncThemeButtons() {
  const theme = storedTheme();
  document.querySelectorAll<HTMLElement>('[data-theme-set]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeSet === theme));
  });
}

function syncSearchInput() {
  const input = document.querySelector<HTMLInputElement>('[data-search-form] input[name="search"]');
  if (input && document.activeElement !== input) input.value = currentParams().search ?? '';
}

function markFailedCovers() {
  const failed = (window as unknown as { __coverFailed?: (img: HTMLImageElement) => void }).__coverFailed;
  document.querySelectorAll<HTMLImageElement>('img[onerror]').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) failed?.(img);
  });
}

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.name === 'search' && target.closest('[data-search-form]')) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => submitSearch(target.value), SEARCH_DEBOUNCE_MS);
  } else if (target.dataset.range) {
    const readout = document.querySelector(`[data-readout="${target.id}"]`);
    if (readout) readout.textContent = formatReadout(target.dataset.range, readRange(target));
  }
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.range) {
    const value = readRange(target);
    switch (target.dataset.range) {
      case 'year':
        return updateFilters({ year: value === MAX_YEAR ? undefined : String(value) });
      case 'rating':
        return updateFilters({ rating: value === MIN_RATING ? undefined : String(value) });
      case 'pages':
        return updateFilters({ pages: value === MAX_PAGES ? undefined : String(value) });
      default:
        return updateDelay(value === 0 ? undefined : String(value));
    }
  }
  if (target instanceof HTMLInputElement && target.dataset.filterList) {
    return updateFilters({ list: target.checked ? target.dataset.filterList : undefined });
  }
  if (target instanceof HTMLSelectElement && target.dataset.filter === 'language') {
    return updateFilters({ language: target.value || undefined });
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches('[data-search-form]')) return;
  event.preventDefault();
  submitSearch(form.querySelector<HTMLInputElement>('input[name="search"]')?.value ?? '');
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const themeButton = target.closest<HTMLElement>('[data-theme-set]');
  if (themeButton) {
    const theme = themeButton.dataset.themeSet ?? 'system';
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
    applyTheme(theme);
    syncThemeButtons();
    return;
  }

  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  switch (action) {
    case 'open-sidebar':
      return setSidebarOpen(true);
    case 'close-sidebar':
      return setSidebarOpen(false);
    case 'clear-search': {
      const input = document.querySelector<HTMLInputElement>('[data-search-form] input[name="search"]');
      if (input) input.value = '';
      return submitSearch('');
    }
    case 'clear-filters':
      return updateFilters({
        search: undefined,
        year: undefined,
        rating: undefined,
        pages: undefined,
        language: undefined,
        list: undefined,
      });
    case 'back':
      if (history.length > 1) history.back();
      else void navigate(buildHref(currentParams()));
      return;
    case 'reload':
      return location.reload();
  }

  if (target.closest('[data-mobile-sidebar-panel] a[href]')) setSidebarOpen(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSidebarOpen(false);
});

document.addEventListener('astro:before-preparation', setPending);

document.addEventListener('astro:before-swap', (event) => {
  if (keepSidebarOpen) {
    (event as Event & { newDocument: Document }).newDocument
      .querySelector('[data-mobile-sidebar]')
      ?.setAttribute('data-open', '');
  }
  keepSidebarOpen = false;
});

document.addEventListener('astro:page-load', () => {
  document.querySelector('[data-search-form]')?.removeAttribute('data-filtering');
  syncThemeButtons();
  syncSearchInput();
  markFailedCovers();
});
