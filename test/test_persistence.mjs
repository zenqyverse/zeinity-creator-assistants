/**
 * Empirical Adversarial Test Harness: LocalStorage Persistence & Reload Verification
 * Challenger BM3-1
 *
 * Verification Objectives:
 * 1. Simulate adding a new idea and advancing it through all pipeline stages:
 *    Idea -> Validating -> Researching -> Scripting -> Thumbnailing -> Published.
 * 2. Simulate updating metrics (views, likes, comments, platform) on a published item.
 * 3. Simulate a complete page reload: clear all in-memory variables and re-initialize
 *    from `localStorage.getItem('zeinity_cached_content_items')`.
 * 4. Assert that updated metrics, status, prompts, outputs, and timestamps are 100% preserved.
 * 5. Test edge cases: empty storage, corrupted JSON, missing fields, multiple rapid updates,
 *    cross-tab sync events, quota exceeded resilience, extreme strings/prompts, deletion persistence,
 *    and multi-tab race simulations.
 */

import React from 'react';

// ==========================================
// 1. Mock Browser Environment Setup
// ==========================================

class MockLocalStorage {
  constructor() {
    this.store = new Map();
    this.quotaExceeded = false;
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    if (this.quotaExceeded) {
      const err = new Error('QuotaExceededError: DOMException 22');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get length() {
    return this.store.size;
  }

  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockStorage = new MockLocalStorage();

class MockWindow extends EventTarget {
  constructor() {
    super();
    this.localStorage = mockStorage;
  }
}

const mockWindow = new MockWindow();
globalThis.window = mockWindow;
globalThis.localStorage = mockStorage;

globalThis.CustomEvent = class CustomEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail;
  }
};

globalThis.StorageEvent = class StorageEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this.key = eventInitDict?.key;
    this.oldValue = eventInitDict?.oldValue;
    this.newValue = eventInitDict?.newValue;
    this.storageArea = eventInitDict?.storageArea;
  }
};

// Polyfill crypto if needed
if (!globalThis.crypto) {
  const nodeCrypto = await import('node:crypto');
  globalThis.crypto = nodeCrypto.webcrypto;
}

// ==========================================
// 2. React Hook Test Harness Runner
// ==========================================

class HookRunner {
  constructor(useContentHook) {
    this.useContentHook = useContentHook;
    this.reset();
  }

  reset() {
    this.stateStore = [];
    this.cleanups = [];
    this.effects = [];
    this.hookInstance = null;
  }

  mount() {
    let stateIdx = 0;
    this.effects = [];

    const dispatcher = {
      useState: (initial) => {
        const idx = stateIdx++;
        if (this.stateStore[idx] === undefined) {
          this.stateStore[idx] = typeof initial === 'function' ? initial() : initial;
        }
        const setState = (newVal) => {
          this.stateStore[idx] = typeof newVal === 'function' ? newVal(this.stateStore[idx]) : newVal;
        };
        return [this.stateStore[idx], setState];
      },
      useCallback: (fn) => fn,
      useEffect: (effect) => {
        this.effects.push(effect);
      },
      useRef: (initial) => {
        const idx = stateIdx++;
        if (this.stateStore[idx] === undefined) {
          this.stateStore[idx] = { current: initial };
        }
        return this.stateStore[idx];
      },
    };

    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
    this.hookInstance = this.useContentHook();

    // Run registered mount effects
    for (const effect of this.effects) {
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        this.cleanups.push(cleanup);
      }
    }

    return this.hookInstance;
  }

  unmount() {
    for (const cleanup of this.cleanups) {
      try {
        cleanup();
      } catch {
        // ignore
      }
    }
    this.cleanups = [];
    this.hookInstance = null;
  }

  get items() {
    return this.stateStore[0] || [];
  }

  get loading() {
    return this.stateStore[1];
  }

  get error() {
    return this.stateStore[2];
  }
}

// Import useContent module dynamically
const contentModule = await import('../src/hooks/useContent.ts');
const {
  useContent,
  getStoredContentItems,
  getStoredItemsSafely,
  CACHED_CONTENT_STORAGE_KEY,
} = contentModule;

const STORAGE_KEY = CACHED_CONTENT_STORAGE_KEY;

// Test statistics
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function testAssert(condition, name, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${name}${details ? ' (' + details + ')' : ''}`);
  } else {
    failedTests++;
    const msg = `  [FAIL] ${name}${details ? ' (' + details + ')' : ''}`;
    console.error(msg);
    failureDetails.push(msg);
  }
}

console.log('================================================================');
console.log('  CHALLENGER BM3-1: ADVERSARIAL LOCALSTORAGE PERSISTENCE HARNESS');
console.log('================================================================\n');

// ================================================================
// SUITE 0: Audit Findings F-012 & F-013 Module Exports & Storage Key
// ================================================================
console.log('--- SUITE 0: Audit Findings F-012 & F-013 Module Exports & Storage Key ---');
{
  testAssert(typeof getStoredContentItems === 'function', 'F-012: getStoredContentItems is exported as a function');
  testAssert(typeof getStoredItemsSafely === 'function', 'F-012: getStoredItemsSafely alias is exported as a function');
  testAssert(getStoredItemsSafely === getStoredContentItems, 'F-012: getStoredItemsSafely is an alias referencing getStoredContentItems');
  testAssert(typeof CACHED_CONTENT_STORAGE_KEY === 'string', 'F-013: CACHED_CONTENT_STORAGE_KEY is exported');
  testAssert(STORAGE_KEY === 'zeinity_cached_content_items', 'F-013: STORAGE_KEY matches production zeinity_cached_content_items');
}

// ================================================================
// SUITE 1: Empty LocalStorage & Seed Initialization
// ================================================================
console.log('\n--- SUITE 1: Empty LocalStorage & Seed Initialization ---');
{
  mockStorage.clear();
  testAssert(mockStorage.getItem(STORAGE_KEY) === null, 'Storage begins completely empty');

  const runner = new HookRunner(useContent);
  const hook = runner.mount();

  await hook.fetchAll();

  testAssert(runner.items.length === 6, 'Mounting with empty storage initializes 6 seed items', `Count: ${runner.items.length}`);
  testAssert(mockStorage.getItem(STORAGE_KEY) !== null, 'LocalStorage contains initialized JSON payload');

  const parsed = JSON.parse(mockStorage.getItem(STORAGE_KEY));
  testAssert(Array.isArray(parsed) && parsed.length === 6, 'Stored JSON is array with exactly 6 items');
  testAssert(runner.loading === false, 'Loading flag is false after initialization');
  testAssert(runner.error === null, 'Error is null after initialization');

  // Verify seed items contain expected statuses
  const statuses = new Set(runner.items.map((i) => i.status));
  testAssert(statuses.has('Idea'), 'Seeds contain Idea');
  testAssert(statuses.has('Validating'), 'Seeds contain Validating');
  testAssert(statuses.has('Researching'), 'Seeds contain Researching');
  testAssert(statuses.has('Scripting'), 'Seeds contain Scripting');
  testAssert(statuses.has('Thumbnailing'), 'Seeds contain Thumbnailing');
  testAssert(statuses.has('Published'), 'Seeds contain Published');

  runner.unmount();
}

// ================================================================
// SUITE 2: Full Lifecycle Pipeline & Metric Update
// ================================================================
console.log('\n--- SUITE 2: Full Idea-to-Published Pipeline Progression ---');
let createdItemId = null;
const promptA = 'Detailed research brief prompt testing sequential framework: Phenomenon -> Mechanism -> Incentive -> Human Impact -> Counter View';
const researchOutputText = 'Riset mendalam mengenai fenomena ekonomi kreator di platform streaming modern 2026.';
const scriptOutlineText = 'I. Phenomenon: Over-saturation\nII. Mechanism: Algorithmic bias\nIII. Incentive: Ad-revenue optimization\nIV. Impact: Burnout\nV. Counter: Decentralization';
const scriptwriterPromptText = 'Tulis naskah YouTube 12 menit dengan pacing cepat dan retensi tinggi.';
const scriptOutputText = 'Halo semuanya! Hari ini kita akan membongkar bagaimana algoritma sebenarnya mengontrol apa yang kita tonton...';
const thumbPromptText = 'Foto close-up ekspresi kaget dengan grafik merah tajam bertuliskan "ALGORITMA BOHONG"';
const titleA = 'Mengapa Algoritma YouTube Merusak Kreativitas 2026';
const titleB = 'Rahasia Gelap Rekomendasi Video Yang Dirahasiakan';

{
  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  // 1. Add Idea
  const newIdea = await hook.addIdea({
    title: 'Analisis Algoritma Rekomendasi Video 2026',
    source: 'Telegram',
    category: 'Internet & Social Media Culture',
    research_text: 'Fenomena perubahan distribusi feed pada platform video pendek dan panjang.',
  });
  createdItemId = newIdea.id;

  testAssert(Boolean(createdItemId), 'Idea created with unique ID', `ID: ${createdItemId}`);
  testAssert(newIdea.status === 'Idea', 'Initial status is "Idea"');
  testAssert(newIdea.research_brief_prompt === null, 'Initial research_brief_prompt is null');
  testAssert(newIdea.views === null, 'Initial views is null');

  // 2. Advance to Validating
  const validatingItem = await hook.updateItem(createdItemId, {
    status: 'Validating',
    ai_output: 'Membuat Research Brief...',
  });
  testAssert(validatingItem.status === 'Validating', 'Advanced to Validating');

  // 3. Advance to Researching
  const researchingItem = await hook.updateItem(createdItemId, {
    status: 'Researching',
    research_brief_prompt: promptA,
    ai_output: 'Research Brief siap. Silakan salin ke AI eksternal untuk riset mendalam.',
  });
  testAssert(researchingItem.status === 'Researching', 'Advanced to Researching');
  testAssert(researchingItem.research_brief_prompt === promptA, 'research_brief_prompt set accurately');

  // 4. Advance to Scripting
  const scriptingItem = await hook.updateItem(createdItemId, {
    status: 'Scripting',
    external_research_output: researchOutputText,
    script_outline: scriptOutlineText,
    scriptwriter_brief_prompt: scriptwriterPromptText,
    generated_title_a: titleA,
    generated_title_b: titleB,
    ai_output: 'Outline & Scriptwriter Brief siap.',
  });
  testAssert(scriptingItem.status === 'Scripting', 'Advanced to Scripting');
  testAssert(scriptingItem.external_research_output === researchOutputText, 'external_research_output preserved');
  testAssert(scriptingItem.script_outline === scriptOutlineText, 'script_outline preserved');
  testAssert(scriptingItem.scriptwriter_brief_prompt === scriptwriterPromptText, 'scriptwriter_brief_prompt preserved');
  testAssert(scriptingItem.generated_title_a === titleA, 'generated_title_a preserved');
  testAssert(scriptingItem.generated_title_b === titleB, 'generated_title_b preserved');

  // 5. Advance to Thumbnailing
  const thumbItem = await hook.updateItem(createdItemId, {
    status: 'Thumbnailing',
    external_script_output: scriptOutputText,
    generated_thumbnail_prompt: thumbPromptText,
    ai_output: 'Thumbnail Prompt siap.',
  });
  testAssert(thumbItem.status === 'Thumbnailing', 'Advanced to Thumbnailing');
  testAssert(thumbItem.external_script_output === scriptOutputText, 'external_script_output preserved');
  testAssert(thumbItem.generated_thumbnail_prompt === thumbPromptText, 'generated_thumbnail_prompt preserved');

  // 6. Advance to Published
  const publishTimestamp = '2026-09-26T22:30:00.000Z';
  const publishedItem = await hook.updateItem(createdItemId, {
    status: 'Published',
    published_at: publishTimestamp,
    views: 0,
    likes: 0,
    comments: 0,
    target_platform: 'YouTube',
    ai_output: 'Konten berhasil dipublikasikan.',
  });
  testAssert(publishedItem.status === 'Published', 'Advanced to Published');
  testAssert(publishedItem.published_at === publishTimestamp, 'published_at timestamp saved');
  testAssert(publishedItem.views === 0, 'Initial published views initialized to 0');
  testAssert(publishedItem.likes === 0, 'Initial published likes initialized to 0');
  testAssert(publishedItem.comments === 0, 'Initial published comments initialized to 0');

  // 7. Update Metrics on Published Item (Simulating PublishedDetail.tsx form submission)
  const updatedItem = await hook.updateItem(createdItemId, {
    views: 185400,
    likes: 12430,
    comments: 1875,
    target_platform: 'YouTube',
  });
  testAssert(updatedItem.views === 185400, 'Metrics views updated to 185,400');
  testAssert(updatedItem.likes === 12430, 'Metrics likes updated to 12,430');
  testAssert(updatedItem.comments === 1875, 'Metrics comments updated to 1,875');
  testAssert(updatedItem.target_platform === 'YouTube', 'target_platform confirmed');

  runner.unmount();
}

// ================================================================
// SUITE 3: Simulated Browser Page Reload & 100% Data Preservation
// ================================================================
console.log('\n--- SUITE 3: Simulated Browser Page Reload (Cold Reboot) ---');
{
  // WIPE ALL IN-MEMORY VARIABLES:
  // HookRunner unmounted, local scope reset, only mockStorage remains.
  testAssert(Boolean(createdItemId), 'Created item ID is known for reload verification');

  // Verify directly in raw LocalStorage string before reboot
  const rawStorage = mockStorage.getItem(STORAGE_KEY);
  testAssert(rawStorage !== null, 'LocalStorage contains raw data string');
  const diskItems = JSON.parse(rawStorage);
  const diskItem = diskItems.find((i) => i.id === createdItemId);
  testAssert(Boolean(diskItem), 'Item exists on simulated persistent storage disk');
  testAssert(diskItem.views === 185400, 'Persistent storage contains updated views (185,400)');
  testAssert(diskItem.likes === 12430, 'Persistent storage contains updated likes (12,430)');
  testAssert(diskItem.comments === 1875, 'Persistent storage contains updated comments (1,875)');

  // BOOT FRESH SESSION (Simulating page reload: constructor, fresh memory, mount)
  console.log('  [Action] Simulating user pressing F5 (hard page reload)...');
  const freshSessionRunner = new HookRunner(useContent);
  const freshHook = freshSessionRunner.mount();
  await freshHook.fetchAll();

  testAssert(freshSessionRunner.loading === false, 'Fresh session loaded successfully');
  testAssert(freshSessionRunner.error === null, 'Fresh session has 0 errors');
  testAssert(freshSessionRunner.items.length === 7, 'Total items count is 7 (6 seeds + 1 new)', `Count: ${freshSessionRunner.items.length}`);

  const reloadedItem = freshSessionRunner.items.find((i) => i.id === createdItemId);
  testAssert(Boolean(reloadedItem), 'Reloaded session located target item');

  // VERIFY 100% DATA FIDELITY
  testAssert(reloadedItem.title === 'Analisis Algoritma Rekomendasi Video 2026', 'Title preserved verbatim');
  testAssert(reloadedItem.source === 'Telegram', 'Source preserved');
  testAssert(reloadedItem.category === 'Internet & Social Media Culture', 'Category preserved');
  testAssert(reloadedItem.status === 'Published', 'Status is 100% preserved as "Published"');
  testAssert(reloadedItem.target_platform === 'YouTube', 'target_platform is preserved');
  testAssert(reloadedItem.published_at === '2026-09-26T22:30:00.000Z', 'published_at timestamp preserved verbatim');

  // Verify Metrics
  testAssert(reloadedItem.views === 185400, 'Views metric 100% preserved (185,400)');
  testAssert(reloadedItem.likes === 12430, 'Likes metric 100% preserved (12,430)');
  testAssert(reloadedItem.comments === 1875, 'Comments metric 100% preserved (1,875)');

  // Verify All Prompts and AI Outputs
  testAssert(reloadedItem.research_brief_prompt === promptA, 'research_brief_prompt preserved verbatim');
  testAssert(reloadedItem.external_research_output === researchOutputText, 'external_research_output preserved verbatim');
  testAssert(reloadedItem.script_outline === scriptOutlineText, 'script_outline preserved verbatim');
  testAssert(reloadedItem.scriptwriter_brief_prompt === scriptwriterPromptText, 'scriptwriter_brief_prompt preserved verbatim');
  testAssert(reloadedItem.external_script_output === scriptOutputText, 'external_script_output preserved verbatim');
  testAssert(reloadedItem.generated_title_a === titleA, 'generated_title_a preserved verbatim');
  testAssert(reloadedItem.generated_title_b === titleB, 'generated_title_b preserved verbatim');
  testAssert(reloadedItem.generated_thumbnail_prompt === thumbPromptText, 'generated_thumbnail_prompt preserved verbatim');

  // Verify getStoredItemsSafely also returns the exact same item
  const safeItems = getStoredItemsSafely();
  const safeItem = safeItems.find((i) => i.id === createdItemId);
  testAssert(Boolean(safeItem) && safeItem.views === 185400, 'getStoredItemsSafely returns the exact matching item');

  freshSessionRunner.unmount();
}

// ================================================================
// SUITE 4: Edge Case — Empty & Corrupted Storage Attacks
// ================================================================
console.log('\n--- SUITE 4: Edge Case — Corrupted Storage & Hostile Inputs ---');
{
  // 1. Corrupted Malformed JSON Syntax
  mockStorage.setItem(STORAGE_KEY, '{ broken json syntax !!!');
  const runner1 = new HookRunner(useContent);
  const hook1 = runner1.mount();
  await hook1.fetchAll();

  testAssert(runner1.items.length === 0, 'Broken JSON sets items to []');
  testAssert(Boolean(runner1.error), 'Broken JSON records descriptive error in state', `Error: ${runner1.error}`);
  testAssert(!runner1.error.includes('unhandled'), 'Broken JSON does not crash or leave unhandled exception');

  // Test self-healing: addIdea succeeds even if storage is corrupted
  const healedItem = await hook1.addIdea({
    title: 'Self-healed Idea After Corrupted Storage',
    source: 'Web',
    category: 'AI & Technology Impact',
    research_text: 'Testing storage recovery.',
  });
  testAssert(Boolean(healedItem.id), 'addIdea self-heals corrupted storage without crashing');
  testAssert(getStoredItemsSafely().length === 1, 'LocalStorage repaired to valid JSON array with 1 item');
  runner1.unmount();

  // 2. Non-array JSON values
  const nonArrayPayloads = [
    { val: '12345', desc: 'Numeric scalar' },
    { val: '"a raw string"', desc: 'String scalar' },
    { val: 'true', desc: 'Boolean scalar' },
    { val: 'null', desc: 'JSON null literal' },
    { val: '{"id":"single-object"}', desc: 'Single JSON object (not array)' },
  ];

  for (const { val, desc } of nonArrayPayloads) {
    mockStorage.setItem(STORAGE_KEY, val);
    const runner = new HookRunner(useContent);
    const hook = runner.mount();
    await hook.fetchAll();

    testAssert(
      runner.items.length === 6,
      `Non-array payload (${desc}) resets cleanly to 6 seed items`,
      `Got ${runner.items.length} items`
    );
    testAssert(runner.error === null, `No error set on non-array recovery (${desc})`);
    runner.unmount();
  }

  // 3. Array containing null or non-object primitives
  mockStorage.setItem(STORAGE_KEY, JSON.stringify([null, 42, 'invalid', { id: 'valid-item', title: 'Valid', created_at: new Date().toISOString() }]));
  const runnerArrayNull = new HookRunner(useContent);
  const hookArrayNull = runnerArrayNull.mount();
  await hookArrayNull.fetchAll();

  testAssert(
    runnerArrayNull.error !== null,
    'Array with null element triggers controlled error catch in fetchAll',
    `Error: ${runnerArrayNull.error}`
  );
  testAssert(runnerArrayNull.items.length === 0, 'Items fallback to empty array safely');

  // getStoredItemsSafely filters out nulls safely
  const safeFiltered = getStoredItemsSafely();
  testAssert(safeFiltered.length === 1 && safeFiltered[0].id === 'valid-item', 'getStoredItemsSafely filters null/primitives without throwing');
  runnerArrayNull.unmount();
}

// ================================================================
// SUITE 5: Missing Fields & Legacy Status Auto-Migration
// ================================================================
console.log('\n--- SUITE 5: Missing Fields & Legacy Status Auto-Migration ---');
{
  // 1. Legacy Status 'Research' -> 'Researching'
  const legacyItem = {
    id: 'legacy-item-001',
    title: 'Legacy Status Item',
    source: 'Web',
    status: 'Research', // Legacy enum
    category: 'Digital Economy & Creator Economy',
    created_at: '2026-09-20T10:00:00.000Z',
    updated_at: '2026-09-20T10:00:00.000Z',
  };
  mockStorage.setItem(STORAGE_KEY, JSON.stringify([legacyItem]));

  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  testAssert(runner.items.length === 1, 'Legacy item loaded');
  testAssert(runner.items[0].status === 'Researching', 'Legacy status "Research" normalized in-memory to "Researching"');

  // Verify it persisted normalized status back to storage
  const persistedRaw = JSON.parse(mockStorage.getItem(STORAGE_KEY));
  testAssert(persistedRaw[0].status === 'Researching', 'Normalized status persisted to LocalStorage');

  // 2. Missing Metrics Coalescing (Simulating items created before BM2 metrics added)
  const itemWithoutMetrics = {
    id: 'pre-bm2-item',
    title: 'Pre-BM2 Content Item',
    source: 'Web',
    status: 'Published',
    category: 'AI & Technology Impact',
    created_at: '2026-09-21T10:00:00.000Z',
    updated_at: '2026-09-21T10:00:00.000Z',
    // views, likes, comments, published_at intentionally omitted
  };
  mockStorage.setItem(STORAGE_KEY, JSON.stringify([itemWithoutMetrics]));

  await hook.fetchAll();
  const loaded = runner.items[0];
  testAssert(loaded.views === undefined, 'Missing views is undefined in raw object');
  testAssert((loaded.views ?? 0) === 0, 'Nullish coalescing (views ?? 0) resolves to 0 without NaN');
  testAssert((loaded.likes ?? 0) === 0, 'Nullish coalescing (likes ?? 0) resolves to 0 without NaN');
  testAssert((loaded.comments ?? 0) === 0, 'Nullish coalescing (comments ?? 0) resolves to 0 without NaN');

  runner.unmount();
}

// ================================================================
// SUITE 6: High Concurrency & Rapid Successive Updates Stress Test
// ================================================================
console.log('\n--- SUITE 6: Rapid Sequential Updates Stress Test ---');
{
  mockStorage.clear();
  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  const stressItem = await hook.addIdea({
    title: 'Stress Test Target Item',
    source: 'Web',
    category: 'Gaming & Digital Entertainment',
    research_text: 'High-frequency update stress test',
  });

  console.log('  [Action] Executing 50 rapid successive metric increments...');
  const iterations = 50;
  for (let i = 1; i <= iterations; i++) {
    await hook.updateItem(stressItem.id, {
      views: i * 1000,
      likes: i * 50,
      comments: i * 10,
    });
  }

  // Verify in memory and in storage
  const finalStateItem = runner.items.find((i) => i.id === stressItem.id);
  testAssert(finalStateItem.views === 50000, 'State views reaches 50,000 after 50 updates', `Views: ${finalStateItem.views}`);
  testAssert(finalStateItem.likes === 2500, 'State likes reaches 2,500 after 50 updates', `Likes: ${finalStateItem.likes}`);
  testAssert(finalStateItem.comments === 500, 'State comments reaches 500 after 50 updates', `Comments: ${finalStateItem.comments}`);

  const diskItems = JSON.parse(mockStorage.getItem(STORAGE_KEY));
  const finalDiskItem = diskItems.find((i) => i.id === stressItem.id);
  testAssert(finalDiskItem.views === 50000, 'LocalStorage disk views reaches 50,000', `Views: ${finalDiskItem.views}`);
  testAssert(finalDiskItem.likes === 2500, 'LocalStorage disk likes reaches 2,500', `Likes: ${finalDiskItem.likes}`);
  testAssert(finalDiskItem.comments === 500, 'LocalStorage disk comments reaches 500', `Comments: ${finalDiskItem.comments}`);

  // Test Rapid Creation of 20 Items
  console.log('  [Action] Executing rapid creation of 20 distinct items...');
  const createPromises = [];
  for (let i = 1; i <= 20; i++) {
    createPromises.push(
      hook.addIdea({
        title: `Rapid Idea Batch #${i}`,
        source: i % 2 === 0 ? 'Telegram' : 'Web',
        category: 'Modern Life & Digital Psychology',
        research_text: `Batch description ${i}`,
      })
    );
  }
  await Promise.all(createPromises);

  const totalExpected = 6 + 1 + 20; // 6 seeds + 1 stress item + 20 batch
  testAssert(runner.items.length === totalExpected, `Memory contains all ${totalExpected} items`, `Got ${runner.items.length}`);
  const diskCount = JSON.parse(mockStorage.getItem(STORAGE_KEY)).length;
  testAssert(diskCount === totalExpected, `LocalStorage disk contains all ${totalExpected} items`, `Got ${diskCount}`);

  runner.unmount();
}

// ================================================================
// SUITE 7: Cross-Tab StorageEvent & CustomEvent Synchronization
// ================================================================
console.log('\n--- SUITE 7: Cross-Tab StorageEvent & CustomEvent Synchronization ---');
{
  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  const initialCount = runner.items.length;

  // 1. Simulate an external tab writing to LocalStorage and emitting StorageEvent
  const externalTabItem = {
    id: 'tab-2-external-item',
    title: 'Created by Tab 2 in background',
    source: 'Telegram',
    status: 'Idea',
    category: 'Internet & Social Media Culture',
    research_text: 'External tab test',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const existingInStorage = JSON.parse(mockStorage.getItem(STORAGE_KEY));
  const newStorageState = [externalTabItem, ...existingInStorage];
  const serialized = JSON.stringify(newStorageState);
  mockStorage.setItem(STORAGE_KEY, serialized);

  // Dispatch StorageEvent
  mockWindow.dispatchEvent(
    new StorageEvent('storage', {
      key: STORAGE_KEY,
      oldValue: null,
      newValue: serialized,
      storageArea: mockStorage,
    })
  );

  testAssert(runner.items.length === initialCount + 1, 'StorageEvent updates in-memory items', `New count: ${runner.items.length}`);
  testAssert(runner.items[0].id === 'tab-2-external-item', 'External tab item placed at top (sorted by created_at desc)');

  // 2. Simulate CustomEvent (zeinity_content_sync)
  const customSyncItem = {
    id: 'custom-sync-item-999',
    title: 'Sync via CustomEvent',
    source: 'Web',
    status: 'Published',
    category: 'AI & Technology Impact',
    views: 9999,
    likes: 888,
    comments: 77,
    created_at: new Date(Date.now() + 5000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const nextPayload = [customSyncItem, ...runner.items];
  mockWindow.dispatchEvent(
    new CustomEvent('zeinity_content_sync', {
      detail: nextPayload,
    })
  );

  testAssert(runner.items[0].id === 'custom-sync-item-999', 'CustomEvent updates in-memory items immediately');
  testAssert(runner.items[0].views === 9999, 'CustomEvent updates item metrics to 9,999');

  runner.unmount();
}

// ================================================================
// SUITE 8: Storage Quota Exceeded & Hostile Error Resilience
// ================================================================
console.log('\n--- SUITE 8: Quota Exceeded & Hostile Error Resilience ---');
{
  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  // Arm Quota Exceeded
  mockStorage.quotaExceeded = true;

  let addIdeaErrorCaught = false;
  try {
    await hook.addIdea({
      title: 'Should fail gracefully when quota is exceeded',
      source: 'Web',
      category: 'AI & Technology Impact',
      research_text: 'Quota test',
    });
  } catch (err) {
    addIdeaErrorCaught = true;
    testAssert(err.name === 'QuotaExceededError', 'addIdea propagates QuotaExceededError rejection');
  }
  testAssert(addIdeaErrorCaught, 'addIdea properly threw rejection on storage failure');
  testAssert(runner.error !== null, 'useContent hook recorded error state on storage failure');

  let updateErrorCaught = false;
  try {
    const targetId = runner.items[0]?.id || 'offline-init-1';
    await hook.updateItem(targetId, {
      views: 999999,
    });
  } catch (err) {
    updateErrorCaught = true;
    testAssert(err.name === 'QuotaExceededError', 'updateItem propagates QuotaExceededError rejection');
  }
  testAssert(updateErrorCaught, 'updateItem properly threw rejection on storage failure');

  // Disarm Quota Exceeded
  mockStorage.quotaExceeded = false;
  runner.unmount();
}

// ================================================================
// SUITE 9: Extreme Values, Unicode, Special Characters & Prompt Byte Integrity
// ================================================================
console.log('\n--- SUITE 9: Extreme Values, Unicode & Prompt Byte Integrity ---');
{
  mockStorage.clear();
  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  // 1. Extreme 60,000-character prompt (checking byte integrity across serialization/deserialization)
  const hugePrompt = 'PROMPT_CHUNK_HEADER_'.repeat(3000); // 60,000 chars
  testAssert(hugePrompt.length === 60000, 'Constructed 60,000 character prompt payload');

  // 2. Complex Unicode, Emoji, RTL, and Special Characters in Title & Outlines
  const complexTitle = '🔥 Zeinity 2026: AI & Ekonomi Digital 🚀 (Bahasa Indonesia — العربية — 日本語) — "Test Quotes" & <script>alert(1)</script>';

  const extremeItem = await hook.addIdea({
    title: complexTitle,
    source: 'Web',
    category: 'Internet & Social Media Culture',
    research_text: 'Teks riset dengan karakter khusus: \n\t\\ / " \' ` ~ @ # $ % ^ & * ( ) _ + = { } [ ] : ; < > , . ?',
  });

  await hook.updateItem(extremeItem.id, {
    status: 'Scripting',
    research_brief_prompt: hugePrompt,
    views: Number.MAX_SAFE_INTEGER, // 9,007,199,254,740,991
    likes: 2147483647,
    comments: 0,
  });

  // Cold reboot simulation
  runner.unmount();
  const rebootRunner = new HookRunner(useContent);
  const rebootHook = rebootRunner.mount();
  await rebootHook.fetchAll();

  const retrieved = rebootRunner.items.find((i) => i.id === extremeItem.id);
  testAssert(Boolean(retrieved), 'Extreme item found after reboot');
  testAssert(retrieved.title === complexTitle, 'Complex Unicode, Emoji, and XSS string preserved verbatim');
  testAssert(retrieved.research_brief_prompt.length === 60000, '60,000 character prompt length 100% preserved');
  testAssert(retrieved.research_brief_prompt === hugePrompt, '60,000 character prompt byte-for-byte identical');
  testAssert(retrieved.views === Number.MAX_SAFE_INTEGER, 'MAX_SAFE_INTEGER views preserved accurately');
  testAssert(retrieved.likes === 2147483647, 'Max 32-bit integer likes preserved accurately');

  rebootRunner.unmount();
}

// ================================================================
// SUITE 10: Empty String ("") in LocalStorage & Self-Healing
// ================================================================
console.log('\n--- SUITE 10: Empty String ("") in LocalStorage & Self-Healing ---');
{
  mockStorage.setItem(STORAGE_KEY, ''); // Empty string, not null
  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  testAssert(runner.items.length === 0, 'Empty string in storage sets items to []');
  testAssert(runner.error !== null, 'Empty string in storage triggers non-fatal error state');

  // Verify getStoredItemsSafely returns []
  testAssert(getStoredItemsSafely().length === 0, 'getStoredItemsSafely safely returns [] for empty string');

  // Verify addIdea self-heals empty string
  const healed = await hook.addIdea({
    title: 'Healed From Empty String',
    source: 'Telegram',
    category: 'Digital Economy & Creator Economy',
    research_text: null,
  });
  testAssert(Boolean(healed.id), 'addIdea succeeds on empty string storage');
  testAssert(getStoredItemsSafely().length === 1, 'Storage repaired into valid JSON array with 1 item');

  runner.unmount();
}

// ================================================================
// SUITE 11: Deletion Persistence, Sequential Deletion & Cold Reboot
// ================================================================
console.log('\n--- SUITE 11: Deletion Persistence, Sequential Deletion & Cold Reboot ---');
{
  mockStorage.clear();
  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  testAssert(runner.items.length === 6, 'Started with 6 seed items');
  const firstToDelete = runner.items[0].id;
  const secondToDelete = runner.items[1].id;

  console.log(`  [Action] Deleting first item: ${firstToDelete}...`);
  await hook.deleteItem(firstToDelete);
  testAssert(runner.items.length === 5, 'In-memory count reduced to 5 after first deletion');
  testAssert(!runner.items.some((i) => i.id === firstToDelete), 'First item deleted from memory');

  // Sequential deletion test: delete second item immediately
  console.log(`  [Action] Deleting second item immediately (sequential deletion): ${secondToDelete}...`);
  await hook.deleteItem(secondToDelete);
  testAssert(runner.items.length === 4, 'In-memory count reduced to 4 after second deletion');
  testAssert(!runner.items.some((i) => i.id === secondToDelete), 'Second item deleted from memory');
  testAssert(!runner.items.some((i) => i.id === firstToDelete), 'CRITICAL: First item did NOT resurrect after second deletion');

  // Verify persistent disk
  const diskAfterTwoDeletes = JSON.parse(mockStorage.getItem(STORAGE_KEY));
  testAssert(diskAfterTwoDeletes.length === 4, 'LocalStorage disk contains 4 items');
  testAssert(!diskAfterTwoDeletes.some((i) => i.id === firstToDelete || i.id === secondToDelete), 'Both deleted items absent from LocalStorage');

  // Test addIdea after deletion does NOT resurrect deleted items
  console.log('  [Action] Adding new idea after deletions to check non-resurrection...');
  const newPostDeleteIdea = await hook.addIdea({
    title: 'New Idea After Deletion',
    source: 'Web',
    category: 'AI & Technology Impact',
    research_text: 'Testing non-resurrection',
  });
  testAssert(runner.items.length === 5, 'Count is 5 (4 remaining + 1 new idea)');
  testAssert(!runner.items.some((i) => i.id === firstToDelete), 'CRITICAL: First item did NOT resurrect after addIdea');
  testAssert(!runner.items.some((i) => i.id === secondToDelete), 'CRITICAL: Second item did NOT resurrect after addIdea');

  // Delete remaining items down to 0
  console.log('  [Action] Deleting all remaining items down to 0...');
  const remainingIds = [...runner.items.map((i) => i.id)];
  for (const id of remainingIds) {
    await hook.deleteItem(id);
  }
  testAssert(runner.items.length === 0, 'In-memory count reaches 0 after deleting all items');
  const diskEmpty = JSON.parse(mockStorage.getItem(STORAGE_KEY));
  testAssert(Array.isArray(diskEmpty) && diskEmpty.length === 0, 'LocalStorage disk contains empty array []');

  // Simulate Hard Reboot from 0 items
  runner.unmount();
  console.log('  [Action] Simulating hard page reload when all items have been deleted...');
  const rebootRunner = new HookRunner(useContent);
  const rebootHook = rebootRunner.mount();
  await rebootHook.fetchAll();

  testAssert(rebootRunner.items.length === 0, 'Post-reload memory contains exactly 0 items (did NOT re-seed deleted items)');
  testAssert(JSON.parse(mockStorage.getItem(STORAGE_KEY)).length === 0, 'Post-reload LocalStorage disk remains empty array []');

  rebootRunner.unmount();
}

// ================================================================
// SUITE 12: Missing or Invalid created_at Resilience in Sorting
// ================================================================
console.log('\n--- SUITE 12: Invalid Date & Sorting Resilience ---');
{
  const corruptDateItems = [
    {
      id: 'no-date-1',
      title: 'Item with missing created_at',
      status: 'Idea',
      source: 'Web',
      // created_at missing
      updated_at: new Date().toISOString(),
    },
    {
      id: 'invalid-date-2',
      title: 'Item with invalid date string',
      status: 'Idea',
      source: 'Telegram',
      created_at: 'NOT_A_VALID_DATE_STRING_XYZ',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'valid-date-3',
      title: 'Item with valid ISO date',
      status: 'Idea',
      source: 'Web',
      created_at: '2026-09-26T12:00:00.000Z',
      updated_at: '2026-09-26T12:00:00.000Z',
    },
  ];

  mockStorage.setItem(STORAGE_KEY, JSON.stringify(corruptDateItems));
  const runner = new HookRunner(useContent);
  const hook = runner.mount();

  let sortCrashed = false;
  try {
    await hook.fetchAll();
  } catch {
    sortCrashed = true;
  }

  testAssert(!sortCrashed, 'fetchAll does not crash on invalid/missing created_at in sort');
  testAssert(runner.items.length === 3, 'All 3 items returned despite invalid/missing created_at');

  runner.unmount();
}

// ================================================================
// SUITE 13: Non-Existent ID Handling on Update & Delete
// ================================================================
console.log('\n--- SUITE 13: Non-Existent ID Handling ---');
{
  mockStorage.clear();
  const runner = new HookRunner(useContent);
  const hook = runner.mount();
  await hook.fetchAll();

  let updateNonExistentCaught = false;
  try {
    await hook.updateItem('id-that-does-not-exist-99999', { views: 500 });
  } catch (err) {
    updateNonExistentCaught = true;
    testAssert(err.message.includes('tidak ditemukan'), 'updateItem throws descriptive error when ID not found');
  }
  testAssert(updateNonExistentCaught, 'updateItem rejected non-existent ID cleanly');

  // deleteItem on non-existent ID should be a clean no-op without crashing
  let deleteCrashed = false;
  try {
    await hook.deleteItem('id-that-does-not-exist-88888');
  } catch {
    deleteCrashed = true;
  }
  testAssert(!deleteCrashed, 'deleteItem on non-existent ID completes cleanly as no-op');
  testAssert(runner.items.length === 6, 'Item count remains unchanged after deleting non-existent ID');

  runner.unmount();
}

// ================================================================
// FINAL TEST RESULTS SUMMARY
// ================================================================
console.log('\n================================================================');
console.log(`  FINAL RESULTS: ${passedTests} PASSED | ${failedTests} FAILED | ${totalTests} TOTAL`);
console.log('================================================================\n');

if (failedTests > 0) {
  console.error('FAILURES DETECTED:');
  for (const f of failureDetails) {
    console.error(f);
  }
  process.exit(1);
} else {
  console.log('ALL 13 SUITES PASSED! LocalStorage persistence across reloads verified with 100% empirical certainty.\n');
  process.exit(0);
}
