import type { ViewKey, ContentItem } from '@/types';

export const VALID_VIEWS: ViewKey[] = [
  'overview',
  'ideas',
  'research',
  'scripts',
  'published',
  'files',
  'analytics',
  'settings',
  'trends',
  'rss',
];

export const STORAGE_KEY_VIEW = 'zeinity_active_view';
export const STORAGE_KEY_SCRIPT_ID = 'zeinity_active_script_id';
export const STORAGE_KEY_CACHED_SCRIPT = 'zeinity_cached_script_item';
export const STORAGE_KEY_PUBLISHED_ID = 'zeinity_active_published_id';
export const STORAGE_KEY_CACHED_PUBLISHED = 'zeinity_cached_published_item';

export interface ParsedRoute {
  view: ViewKey;
  scriptId: string | null;
  publishedId: string | null;
}

/**
 * Parses window.location.hash into a view and optional detail ID.
 * Examples:
 * - '#/analytics' -> { view: 'analytics', scriptId: null, publishedId: null }
 * - '#/script/abc' -> { view: 'scripts', scriptId: 'abc', publishedId: null }
 * - '#/published/xyz' -> { view: 'published', scriptId: null, publishedId: 'xyz' }
 */
export function parseHash(hash: string): ParsedRoute | null {
  const clean = hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '');
  if (!clean) return null;

  if (clean.startsWith('script/')) {
    const id = clean.replace(/^script\//, '').trim();
    if (id) {
      return { view: 'scripts', scriptId: id, publishedId: null };
    }
  }

  if (clean.startsWith('published/')) {
    const id = clean.replace(/^published\//, '').trim();
    if (id) {
      return { view: 'published', scriptId: null, publishedId: id };
    }
  }

  if (VALID_VIEWS.includes(clean as ViewKey)) {
    return { view: clean as ViewKey, scriptId: null, publishedId: null };
  }

  return null;
}

export interface InitialNavigationState {
  view: ViewKey;
  cachedScriptItem: ContentItem | null;
  cachedPublishedItem: ContentItem | null;
  pendingScriptId: string | null;
  pendingPublishedId: string | null;
}

/**
 * Recovers navigation state from URL hash and localStorage on initial mount / page refresh.
 */
export function getInitialNavigation(): InitialNavigationState {
  let view: ViewKey = 'overview';
  let cachedScriptItem: ContentItem | null = null;
  let cachedPublishedItem: ContentItem | null = null;
  let pendingScriptId: string | null = null;
  let pendingPublishedId: string | null = null;

  // 1. Check URL Hash
  if (typeof window !== 'undefined') {
    const fromHash = parseHash(window.location.hash);
    if (fromHash) {
      view = fromHash.view;
      pendingScriptId = fromHash.scriptId;
      pendingPublishedId = fromHash.publishedId;
    }
  }

  // 2. Check LocalStorage fallback
  if (typeof window !== 'undefined') {
    try {
      const storedView = localStorage.getItem(STORAGE_KEY_VIEW);
      if ((!window.location.hash || window.location.hash === '#/') && storedView && VALID_VIEWS.includes(storedView as ViewKey)) {
        view = storedView as ViewKey;
      }

      const storedScriptId = localStorage.getItem(STORAGE_KEY_SCRIPT_ID);
      const cachedScriptStr = localStorage.getItem(STORAGE_KEY_CACHED_SCRIPT);
      if (cachedScriptStr) {
        const parsed = JSON.parse(cachedScriptStr) as ContentItem;
        if (parsed && (!pendingScriptId || parsed.id === pendingScriptId)) {
          cachedScriptItem = parsed;
          if (!pendingScriptId) pendingScriptId = parsed.id;
        }
      } else if (!pendingScriptId && storedScriptId) {
        pendingScriptId = storedScriptId;
      }

      const storedPublishedId = localStorage.getItem(STORAGE_KEY_PUBLISHED_ID);
      const cachedPublishedStr = localStorage.getItem(STORAGE_KEY_CACHED_PUBLISHED);
      if (cachedPublishedStr) {
        const parsed = JSON.parse(cachedPublishedStr) as ContentItem;
        if (parsed && (!pendingPublishedId || parsed.id === pendingPublishedId)) {
          cachedPublishedItem = parsed;
          if (!pendingPublishedId) pendingPublishedId = parsed.id;
        }
      } else if (!pendingPublishedId && storedPublishedId) {
        pendingPublishedId = storedPublishedId;
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
  }

  return {
    view,
    cachedScriptItem,
    cachedPublishedItem,
    pendingScriptId,
    pendingPublishedId,
  };
}

/**
 * Synchronizes the active view and detail state to window.location.hash and localStorage.
 */
export function syncNavigation(
  view: ViewKey,
  scriptItem: ContentItem | null,
  publishedItem: ContentItem | null
) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_VIEW, view);

    if (scriptItem) {
      localStorage.setItem(STORAGE_KEY_SCRIPT_ID, scriptItem.id);
      localStorage.setItem(STORAGE_KEY_CACHED_SCRIPT, JSON.stringify(scriptItem));
      const targetHash = `#/script/${scriptItem.id}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_SCRIPT_ID);
      localStorage.removeItem(STORAGE_KEY_CACHED_SCRIPT);
    }

    if (publishedItem) {
      localStorage.setItem(STORAGE_KEY_PUBLISHED_ID, publishedItem.id);
      localStorage.setItem(STORAGE_KEY_CACHED_PUBLISHED, JSON.stringify(publishedItem));
      const targetHash = `#/published/${publishedItem.id}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_PUBLISHED_ID);
      localStorage.removeItem(STORAGE_KEY_CACHED_PUBLISHED);
    }

    if (!scriptItem && !publishedItem) {
      const targetHash = view === 'overview' ? '#/' : `#/${view}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}
