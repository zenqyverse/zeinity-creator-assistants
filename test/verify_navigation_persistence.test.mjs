import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Mock browser globals for testing navigation utilities in node
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

describe('Page Refresh Persistence & Navigation Routing', async () => {
  const navModulePath = path.join(projectRoot, 'src', 'lib', 'navigation.ts');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const navContent = fs.readFileSync(navModulePath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Dynamically import compiled or ts-stripped module or test logic directly
  const { parseHash } = await import('../src/lib/navigation.ts');

  it('Hash parser handles all main views, detail scripts, and published routes', () => {
    assert.deepEqual(parseHash('#/analytics'), { view: 'analytics', scriptId: null, publishedId: null });
    assert.deepEqual(parseHash('#/research'), { view: 'research', scriptId: null, publishedId: null });
    assert.deepEqual(parseHash('#/settings'), { view: 'settings', scriptId: null, publishedId: null });
    assert.deepEqual(parseHash('#/script/abc-123'), { view: 'scripts', scriptId: 'abc-123', publishedId: null });
    assert.deepEqual(parseHash('#/published/pub-456'), { view: 'published', scriptId: null, publishedId: 'pub-456' });
    assert.equal(parseHash(''), null);
    assert.equal(parseHash('#/'), null);
  });

  it('Navigation module exports complete persistent storage keys', () => {
    assert.ok(navContent.includes('STORAGE_KEY_VIEW ='), 'Must define view storage key');
    assert.ok(navContent.includes('STORAGE_KEY_SCRIPT_ID ='), 'Must define script ID storage key');
    assert.ok(navContent.includes('STORAGE_KEY_CACHED_SCRIPT ='), 'Must define cached script storage key');
    assert.ok(navContent.includes('STORAGE_KEY_PUBLISHED_ID ='), 'Must define published ID storage key');
    assert.ok(navContent.includes('getInitialNavigation'), 'Must export getInitialNavigation');
    assert.ok(navContent.includes('syncNavigation'), 'Must export syncNavigation');
  });

  it('App.tsx initializes state from getInitialNavigation preventing reset to overview on refresh', () => {
    assert.ok(
      appContent.includes('useState(() => getInitialNavigation())'),
      'App.tsx must initialize navigation state from getInitialNavigation'
    );
    assert.ok(
      appContent.includes('useState<ViewKey>(initialNav.view)'),
      'App.tsx must restore activeView from initialNav instead of hardcoded overview'
    );
    assert.ok(
      appContent.includes('useState<ContentItem | null>(initialNav.cachedScriptItem)'),
      'App.tsx must restore scriptItem from cached navigation state'
    );
    assert.ok(
      appContent.includes('useState<ContentItem | null>(initialNav.cachedPublishedItem)'),
      'App.tsx must restore publishedItem from cached navigation state'
    );
  });

  it('App.tsx maintains syncNavigation effect and browser Back/Forward listener', () => {
    assert.ok(
      appContent.includes('syncNavigation(activeView, scriptItem, publishedItem)'),
      'App.tsx must synchronize view changes to URL hash and localStorage'
    );
    assert.ok(
      appContent.includes("window.addEventListener('hashchange', onHashChange)"),
      'App.tsx must listen to hashchange for browser navigation buttons'
    );
    assert.ok(
      appContent.includes('handleBackFromScript'),
      'App.tsx must provide a dedicated back handler that restores previous view'
    );
  });
});
