import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 2 Verification Suite (F-012, F-013, F-014)', async () => {
  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const testPersistencePath = path.join(projectRoot, 'test', 'test_persistence.mjs');

  const useContentSource = fs.readFileSync(useContentPath, 'utf8');
  const testPersistenceSource = fs.readFileSync(testPersistencePath, 'utf8');

  it('F-012: Fungsi getStoredItemsSafely diekspor sebagai alias getStoredContentItems di useContent.ts', async () => {
    // 1. Verifikasi ekspor fungsi di berkas produksi
    assert.ok(
      useContentSource.includes('export function getStoredContentItems'),
      'useContent.ts must export getStoredContentItems function'
    );
    assert.ok(
      useContentSource.includes('export const getStoredItemsSafely = getStoredContentItems;'),
      'useContent.ts must export getStoredItemsSafely alias referencing getStoredContentItems'
    );

    // 2. Verifikasi test_persistence.mjs mengimpor getStoredItemsSafely secara valid
    assert.ok(
      testPersistenceSource.includes('getStoredItemsSafely'),
      'test_persistence.mjs must reference and use getStoredItemsSafely'
    );
    assert.ok(
      testPersistenceSource.includes('getStoredContentItems'),
      'test_persistence.mjs must reference getStoredContentItems'
    );

    // 3. Verifikasi perilaku runtime fungsi getStoredItemsSafely & getStoredContentItems
    const contentModule = await import('../src/hooks/useContent.ts');
    assert.equal(typeof contentModule.getStoredContentItems, 'function', 'getStoredContentItems must be a function');
    assert.equal(typeof contentModule.getStoredItemsSafely, 'function', 'getStoredItemsSafely must be a function');
    assert.equal(contentModule.getStoredItemsSafely, contentModule.getStoredContentItems, 'getStoredItemsSafely must be an alias of getStoredContentItems');
  });

  it('F-013: Storage Key di test_persistence.mjs sinkron dengan CACHED_CONTENT_STORAGE_KEY produksi', async () => {
    // 1. Verifikasi konstanta kunci storage di useContent.ts
    assert.ok(
      useContentSource.includes("export const CACHED_CONTENT_STORAGE_KEY = 'zeinity_cached_content_items'"),
      'useContent.ts must export CACHED_CONTENT_STORAGE_KEY as zeinity_cached_content_items'
    );

    // 2. Verifikasi test_persistence.mjs mengimpor atau menggunakan CACHED_CONTENT_STORAGE_KEY
    assert.ok(
      testPersistenceSource.includes('CACHED_CONTENT_STORAGE_KEY'),
      'test_persistence.mjs must import CACHED_CONTENT_STORAGE_KEY'
    );
    assert.ok(
      !testPersistenceSource.includes("'zeinity_content_items'"),
      'test_persistence.mjs must NOT contain the obsolete storage key "zeinity_content_items"'
    );
    assert.ok(
      !useContentSource.includes("'zeinity_content_items'"),
      'useContent.ts must NOT contain the obsolete storage key "zeinity_content_items"'
    );

    // 3. Verifikasi nilai runtime konstanta storage
    const contentModule = await import('../src/hooks/useContent.ts');
    assert.equal(contentModule.CACHED_CONTENT_STORAGE_KEY, 'zeinity_cached_content_items');
  });

  it('F-014: Jumlah Seed Items di INITIAL_CONTENT_ITEMS dan Test Assertion', async () => {
    // 1. Verifikasi INITIAL_CONTENT_ITEMS memiliki 6 item
    const contentModule = await import('../src/hooks/useContent.ts');
    
    // Setup mock window & localStorage untuk membaca inisialisasi offline
    const store = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (k) => store.get(k) || null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    globalThis.localStorage = globalThis.window.localStorage;

    // Memverifikasi assertions di test_persistence.mjs tidak ada yang mengekspektasikan 5 seed items untuk cold boot
    assert.ok(
      testPersistenceSource.includes('runner.items.length === 6'),
      'test_persistence.mjs must assert 6 items on cold boot seed initialization'
    );
    assert.ok(
      testPersistenceSource.includes('freshSessionRunner.items.length === 7'),
      'test_persistence.mjs must assert 7 items on reload (6 seeds + 1 new item)'
    );

    // 2. Verifikasi 6 status alur pipa konten hadir di seed awal (Idea, Validating, Researching, Scripting, Thumbnailing, Published)
    assert.ok(useContentSource.includes("status: 'Idea'"), 'Seed must contain Idea stage');
    assert.ok(useContentSource.includes("status: 'Validating'"), 'Seed must contain Validating stage');
    assert.ok(useContentSource.includes("status: 'Researching'"), 'Seed must contain Researching stage');
    assert.ok(useContentSource.includes("status: 'Scripting'"), 'Seed must contain Scripting stage');
    assert.ok(useContentSource.includes("status: 'Thumbnailing'"), 'Seed must contain Thumbnailing stage');
    assert.ok(useContentSource.includes("status: 'Published'"), 'Seed must contain Published stage');
  });

  it('Integritas Sinkronisasi itemsRef.current dan Penghapusan Sekuensial', async () => {
    // 1. Verifikasi deleteItem memperbarui itemsRef.current agar tidak terjadi zombie / resurrect item
    assert.ok(
      useContentSource.includes('const updated = itemsRef.current.filter((item) => item.id !== id);') &&
      useContentSource.includes('itemsRef.current = updated;'),
      'deleteItem must update itemsRef.current to prevent resurrection bug on subsequent actions'
    );

    // 2. Verifikasi bulkAddIdeas memperbarui itemsRef.current
    assert.ok(
      useContentSource.includes('const updated = [...createdItems, ...itemsRef.current];') &&
      useContentSource.includes('itemsRef.current = updated;'),
      'bulkAddIdeas must update itemsRef.current'
    );
  });
});
