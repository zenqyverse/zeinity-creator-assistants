import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Kategori 1 (PARAH / KRITIS) Verification Suite', async () => {
  const supabasePath = path.join(projectRoot, 'src', 'lib', 'supabase.ts');
  const useSettingsPath = path.join(projectRoot, 'src', 'hooks', 'useSettings.ts');
  const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const alertModalPath = path.join(projectRoot, 'src', 'components', 'AlertModal.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const supabaseContent = fs.readFileSync(supabasePath, 'utf8');
  const useSettingsContent = fs.readFileSync(useSettingsPath, 'utf8');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');
  const useContentContent = fs.readFileSync(useContentPath, 'utf8');
  const alertModalContent = fs.readFileSync(alertModalPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  it('Item 1: Keamanan API Key & Token di Supabase & useSettings', () => {
    // 1. Kunci sensitif terdefinisi dan dipisahkan
    assert.ok(useSettingsContent.includes('SENSITIVE_SETTINGS_KEYS'), 'Must define SENSITIVE_SETTINGS_KEYS');
    assert.ok(useSettingsContent.includes("'gemini_api_key'"), 'Must protect gemini_api_key');
    assert.ok(useSettingsContent.includes("'openrouter_api_key'"), 'Must protect openrouter_api_key');
    assert.ok(useSettingsContent.includes("'telegram_token'"), 'Must protect telegram_token');
    assert.ok(useSettingsContent.includes('SENSITIVE_STORAGE_KEY'), 'Must define SENSITIVE_STORAGE_KEY');

    // 2. Kunci sensitif tidak dikirim ke Supabase pada upsertSetting
    assert.ok(
      useSettingsContent.includes('SENSITIVE_KEYS_SET.has(key)') ||
      useSettingsContent.includes('SENSITIVE_SETTINGS_KEYS.includes(key)'),
      'Must check if key is sensitive before upserting'
    );
    assert.ok(
      useSettingsContent.includes('setStoredSensitiveKey(key, value)'),
      'Must save sensitive keys only to localStorage'
    );

    // 3. fetchSettings tidak mengambil nilai kunci sensitif dari Supabase dan secara proaktif membersihkannya
    assert.ok(
      useSettingsContent.includes('!SENSITIVE_KEYS_SET.has(row.key)'),
      'fetchSettings must not trust plaintext sensitive keys from Supabase'
    );
    assert.ok(
      useSettingsContent.includes("supabase.from('settings').delete().eq('key', row.key)"),
      'fetchSettings must proactively purge lingering sensitive keys in Supabase'
    );

    // 4. UI Settings mengindikasikan penyimpanan aman di localStorage
    assert.ok(
      settingsContent.includes('localStorage'),
      'Settings.tsx must mention localStorage in subtitle for security clarity'
    );

    // 5. App.tsx Topbar menghormati active_provider saat memeriksa gateway online
    assert.ok(
      appContent.includes('settings.active_provider') &&
      appContent.includes('openrouter_api_key') &&
      appContent.includes('ollama_endpoint'),
      'App.tsx must accurately check gateway online status for all active providers'
    );
  });

  it('Item 2: Pencegahan Data Loss & Auto-Save di ScriptDetail.tsx', () => {
    // 1. Debounced auto-save hooks
    assert.ok(
      scriptDetailContent.includes('setResearchSaveStatus'),
      'ScriptDetail must track researchSaveStatus'
    );
    assert.ok(
      scriptDetailContent.includes('setScriptSaveStatus'),
      'ScriptDetail must track scriptSaveStatus'
    );
    assert.ok(
      scriptDetailContent.includes('setTimeout(async () => {') ||
      scriptDetailContent.includes('setTimeout('),
      'ScriptDetail must implement debounced save'
    );
    assert.ok(
      scriptDetailContent.includes('900') || scriptDetailContent.includes('800') || scriptDetailContent.includes('1000'),
      'Debounce delay must be around 800-1000ms'
    );

    // 2. Feedback visual indikator simpan
    assert.ok(
      scriptDetailContent.includes('renderSaveIndicator'),
      'ScriptDetail must provide renderSaveIndicator'
    );
    assert.ok(
      scriptDetailContent.includes('Menyimpan...'),
      'Indicator must show "Menyimpan..."'
    );
    assert.ok(
      scriptDetailContent.includes('Tersimpan'),
      'Indicator must show "Tersimpan"'
    );

    // 3. Anti-clobbering race condition protection
    assert.ok(
      scriptDetailContent.includes('scriptOutputRef.current === lastSavedScriptRef.current'),
      'ScriptDetail must protect against clobbering active user typing when prop updates'
    );
    assert.ok(
      scriptDetailContent.includes('scriptOutputRef.current === textToSave'),
      'ScriptDetail must only mark saved if user has not typed further during in-flight save'
    );

    // 4. beforeunload flush listener & handleBack navigation flush
    assert.ok(
      scriptDetailContent.includes('beforeunload'),
      'ScriptDetail must register beforeunload listener to flush unsaved text'
    );
    assert.ok(
      scriptDetailContent.includes('handleBack'),
      'ScriptDetail must provide handleBack to flush unsaved changes before navigation'
    );

    // 5. Immediate flush onBlur
    assert.ok(
      scriptDetailContent.includes('onBlur'),
      'ScriptDetail must keep onBlur as immediate flush'
    );

    // 6. Zen Editor modal includes indicator
    assert.ok(
      scriptDetailContent.includes('zen-editor-stats'),
      'Zen editor modal must render stats and indicator'
    );
  });

  it('Item 3: Timeout & AbortController pada Panggilan AI di gemini.ts & AlertModal', async () => {
    // 1. callAI supports timeout parameter
    assert.ok(
      geminiContent.includes('timeoutMs: number = 60000') || geminiContent.includes('timeoutMs = 60000'),
      'callAI must support timeoutMs parameter with 60s default'
    );

    // 2. AbortController usage for all providers
    assert.ok(
      geminiContent.includes('new AbortController()'),
      'callAI must instantiate AbortController'
    );
    assert.ok(
      geminiContent.includes('controller.abort()'),
      'callAI must trigger controller.abort on timeout'
    );

    // 3. Descriptive Indonesian timeout messages
    assert.ok(
      geminiContent.includes('Batas waktu habis') || geminiContent.includes('Timeout: Permintaan ke Google Gemini'),
      'callAI must provide clear timeout error message for Gemini'
    );
    assert.ok(
      geminiContent.includes('Server OpenRouter tidak merespons'),
      'callAI must provide clear timeout error message for OpenRouter'
    );
    assert.ok(
      geminiContent.includes('Layanan Ollama lokal di') || geminiContent.includes('Ollama lokal'),
      'callAI must provide clear timeout error message for Ollama'
    );

    // 4. parseAIError timeout handling
    assert.ok(
      geminiContent.includes('Permintaan AI Melebihi Batas Waktu (Timeout)'),
      'parseAIError must have dedicated timeout branch'
    );

    // 5. Functional test of parseAIError with timeout error
    const { parseAIError, callAI } = await import('../src/lib/gemini.ts');
    const parsed = parseAIError(new Error('Batas waktu habis (60 detik): Google Gemini tidak merespons tepat waktu.'));
    assert.equal(parsed.title, 'Permintaan AI Melebihi Batas Waktu (Timeout)');
    assert.ok(parsed.solution?.includes('koneksi internet') || parsed.solution?.includes('Settings'));

    // 6. Functional execution test of timeout rejection
    await assert.rejects(
      async () => {
        await callAI(
          'test timeout prompt',
          { provider: 'openrouter', apiKey: 'sk-test-fake-key' },
          1 // 1ms timeout triggers timeout immediately
        );
      },
      (err) => {
        return err instanceof Error && (err.message.includes('Batas waktu habis') || err.message.includes('tidak merespons'));
      },
      'callAI must reject with descriptive timeout message when request exceeds timeout'
    );
  });

  it('Item 4: Offline / Fallback Cache di useContent.ts', () => {
    // 1. Cache storage key
    assert.ok(
      useContentContent.includes("CACHED_CONTENT_STORAGE_KEY = 'zeinity_cached_content_items'"),
      'Must define CACHED_CONTENT_STORAGE_KEY as zeinity_cached_content_items'
    );

    // 2. Local storage helper functions
    assert.ok(
      useContentContent.includes('getStoredContentItems'),
      'useContent.ts must export getStoredContentItems'
    );
    assert.ok(
      useContentContent.includes('setStoredContentItems'),
      'useContent.ts must export setStoredContentItems'
    );

    // 3. Fallback when Supabase fails & optimistic offline updates
    assert.ok(
      useContentContent.includes('getStoredContentItems()'),
      'useContent.ts must read fallback cached items when network/Supabase errors'
    );
    assert.ok(
      useContentContent.includes('optimisticItem'),
      'useContent.ts must perform optimistic updates for offline resilience'
    );
    assert.ok(
      useContentContent.includes('setStoredContentItems(updated)'),
      'useContent.ts must save snapshot on mutation'
    );

    // 4. Stable fetchAll preventing constant reconnects
    assert.ok(
      useContentContent.includes('}, []);'),
      'fetchAll must have empty dependency array for stable lifecycle'
    );
  });

  it('Item 5: Graceful Handling jika Supabase Config Hilang di supabase.ts', () => {
    // 1. No unconditional throw new Error at root module level
    assert.ok(
      !supabaseContent.includes("throw new Error('Missing Supabase URL or Anon Key"),
      'supabase.ts must not throw error at module root to prevent White Screen of Death'
    );

    // 2. Export isSupabaseConfigured flag
    assert.ok(
      supabaseContent.includes('export const isSupabaseConfigured'),
      'supabase.ts must export isSupabaseConfigured boolean flag'
    );

    // 3. Safe URL validation
    assert.ok(
      supabaseContent.includes('isValidHttpUrl'),
      'supabase.ts must validate URL format before passing to createClient'
    );

    // 4. Fallback offline dummy URL/key to instantiate client safely
    assert.ok(
      supabaseContent.includes('placeholder-offline') || supabaseContent.includes('placeholder'),
      'supabase.ts must provide safe placeholder URL to avoid invalid URL errors'
    );
    assert.ok(
      supabaseContent.includes('console.warn'),
      'supabase.ts must log warning when config is missing'
    );
  });
});
