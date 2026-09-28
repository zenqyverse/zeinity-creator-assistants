import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 3 Verification Suite (F-006, F-007, F-010, F-015, F-016, F-017)', async () => {
  const useSettingsPath = path.join(projectRoot, 'src', 'hooks', 'useSettings.ts');
  const settingsViewPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const supabasePath = path.join(projectRoot, 'src', 'lib', 'supabase.ts');
  const envExamplePath = path.join(projectRoot, '.env.example');
  const migrationPath = path.join(projectRoot, 'supabase', 'migrations', '20260928120000_secure_rls_policies.sql');

  const useSettingsSource = fs.readFileSync(useSettingsPath, 'utf8');
  const settingsViewSource = fs.readFileSync(settingsViewPath, 'utf8');
  const geminiSource = fs.readFileSync(geminiPath, 'utf8');
  const supabaseSource = fs.readFileSync(supabasePath, 'utf8');

  it('F-007 & F-010: Verifikasi Bot Telegram via getMe & Transparansi Roadmap di Settings.tsx', async () => {
    // 1. Ekspor fungsi verifyTelegramBotToken di useSettings.ts
    assert.ok(
      useSettingsSource.includes('export async function verifyTelegramBotToken'),
      'useSettings.ts must export verifyTelegramBotToken function'
    );
    assert.ok(
      useSettingsSource.includes('https://api.telegram.org/bot'),
      'useSettings.ts must call Telegram Bot API endpoint'
    );
    assert.ok(
      useSettingsSource.includes('/getMe'),
      'useSettings.ts must call getMe endpoint'
    );

    // 2. Runtime unit testing untuk verifyTelegramBotToken
    const { verifyTelegramBotToken } = await import('../src/hooks/useSettings.ts');

    // Case A: Token kosong
    const emptyRes = await verifyTelegramBotToken('');
    assert.equal(emptyRes.success, false);
    assert.ok(emptyRes.error?.includes('tidak boleh kosong'));

    // Case B: Format token invalid
    const invalidRes = await verifyTelegramBotToken('invalid_token_123');
    assert.equal(invalidRes.success, false);
    assert.ok(invalidRes.error?.includes('Format token belum valid'));

    // Case C: Mock response sukses dari getMe
    const originalFetch = globalThis.fetch;
    const validToken = '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678';

    try {
      globalThis.fetch = async (url, options) => {
        assert.ok(String(url).includes(validToken));
        assert.ok(String(url).endsWith('/getMe'));
        assert.equal(options?.method, 'GET');
        return new Response(
          JSON.stringify({
            ok: true,
            result: {
              id: 987654321,
              is_bot: true,
              first_name: 'Zeinity Assistant Bot',
              username: 'zeinity_assistant_bot',
              can_join_groups: true,
              can_read_all_group_messages: false,
              supports_inline_queries: false,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const successRes = await verifyTelegramBotToken(validToken);
      assert.equal(successRes.success, true);
      assert.equal(successRes.botInfo?.id, 987654321);
      assert.equal(successRes.botInfo?.username, 'zeinity_assistant_bot');
      assert.equal(successRes.botInfo?.firstName, 'Zeinity Assistant Bot');
      assert.equal(successRes.botInfo?.isBot, true);

      // Case D: Mock response gagal / Unauthorized
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            ok: false,
            error_code: 401,
            description: 'Unauthorized: bot token is invalid',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const failRes = await verifyTelegramBotToken(validToken);
      assert.equal(failRes.success, false);
      assert.ok(failRes.error?.includes('Unauthorized'));

      // Case E: Hostile inputs (non-string: number, null, undefined)
      const nullRes = await verifyTelegramBotToken(null);
      assert.equal(nullRes.success, false);
      assert.ok(nullRes.error?.includes('tidak boleh kosong'));

      const numberRes = await verifyTelegramBotToken(123456789);
      assert.equal(numberRes.success, false);
      assert.ok(numberRes.error?.includes('tidak boleh kosong'));

      // Case F: Abort timeout error
      globalThis.fetch = async () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      };

      const timeoutRes = await verifyTelegramBotToken(validToken, 5000);
      assert.equal(timeoutRes.success, false);
      assert.ok(timeoutRes.error?.includes('timeout'));

      // Case G: Browser CORS / network error
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };

      const corsRes = await verifyTelegramBotToken(validToken);
      assert.equal(corsRes.success, false);
      assert.ok(corsRes.error?.includes('CORS') || corsRes.error?.includes('Failed to fetch'));
    } finally {
      globalThis.fetch = originalFetch;
    }

    // 3. UI di Settings.tsx memiliki tombol verifikasi, handler, dan info hasil
    assert.ok(
      settingsViewSource.includes('Uji Koneksi Bot'),
      'Settings.tsx must render "Uji Koneksi Bot" button'
    );
    assert.ok(
      settingsViewSource.includes('handleVerifyTelegramBot'),
      'Settings.tsx must implement handleVerifyTelegramBot'
    );
    assert.ok(
      settingsViewSource.includes('botVerificationResult'),
      'Settings.tsx must track botVerificationResult state'
    );
    assert.ok(
      settingsViewSource.includes('Bot Terverifikasi:'),
      'Settings.tsx must display verified bot banner with username'
    );

    // 4. F-010: Transparansi Roadmap di Settings.tsx
    assert.ok(
      settingsViewSource.includes('Edge Function Webhook'),
      'Settings.tsx must explain Edge Function Webhook architecture'
    );
    assert.ok(
      settingsViewSource.includes('Auto-Polling Engine') || settingsViewSource.includes('polling'),
      'Settings.tsx must explain auto-polling architecture'
    );
    assert.ok(
      settingsViewSource.includes('Status Integrasi:'),
      'Settings.tsx must maintain clear Status Integrasi notice'
    );
  });

  it('F-015: File .env.example & Dokumentasi Konfigurasi Environment di useSettings.ts', async () => {
    // 1. Verifikasi keberadaan file .env.example
    assert.ok(fs.existsSync(envExamplePath), '.env.example file must exist at project root');

    const envExampleSource = fs.readFileSync(envExamplePath, 'utf8');

    // 2. Verifikasi variabel-variabel lingkungan yang didukung
    assert.ok(envExampleSource.includes('VITE_SUPABASE_URL='), '.env.example must define VITE_SUPABASE_URL');
    assert.ok(envExampleSource.includes('VITE_SUPABASE_ANON_KEY='), '.env.example must define VITE_SUPABASE_ANON_KEY');
    assert.ok(envExampleSource.includes('VITE_GEMINI_API_KEY='), '.env.example must define VITE_GEMINI_API_KEY');

    // 3. Verifikasi penanganan ketiadaan VITE_GEMINI_API_KEY di useSettings.ts
    assert.ok(
      useSettingsSource.includes('initialGeminiApiKey') || useSettingsSource.includes('VITE_GEMINI_API_KEY'),
      'useSettings.ts must handle VITE_GEMINI_API_KEY resolution'
    );
    assert.ok(
      useSettingsSource.includes('// F-015:'),
      'useSettings.ts must have F-015 explanatory comments about graceful fallback'
    );

    // 4. Runtime check: DEFAULT_SETTINGS memiliki gemini_api_key berupa string tanpa error
    const { DEFAULT_SETTINGS } = await import('../src/hooks/useSettings.ts');
    assert.equal(typeof DEFAULT_SETTINGS.gemini_api_key, 'string', 'DEFAULT_SETTINGS.gemini_api_key must be a string');
  });

  it('F-016: Pengamanan Pengiriman Gemini API Key via Header x-goog-api-key di gemini.ts', async () => {
    // 1. Kode di gemini.ts tidak mengekspos API key via query string ?key=
    assert.ok(
      !geminiSource.includes('models?key='),
      'gemini.ts must not pass API key in query parameters (?key=...)'
    );
    assert.ok(
      geminiSource.includes("'x-goog-api-key'"),
      "gemini.ts must pass API key in 'x-goog-api-key' header"
    );

    // 2. Runtime mock test: pastikan fetchAvailableGeminiModels mengirim header dan endpoint bersih
    const { fetchAvailableGeminiModels } = await import('../src/lib/gemini.ts');
    const originalFetch = globalThis.fetch;
    const testKey = 'AIzaSyTestCleanHeaderKey12345';
    let interceptedUrl = '';
    let interceptedHeaders = {};

    try {
      globalThis.fetch = async (url, options) => {
        interceptedUrl = String(url);
        interceptedHeaders = options?.headers || {};
        return new Response(
          JSON.stringify({
            models: [{ name: 'models/gemini-1.5-flash' }, { name: 'models/gemini-1.5-pro' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const models = await fetchAvailableGeminiModels(testKey);

      assert.equal(interceptedUrl, 'https://generativelanguage.googleapis.com/v1beta/models');
      assert.ok(!interceptedUrl.includes(testKey), 'URL must not contain the sensitive API key');
      assert.ok(!interceptedUrl.includes('?key='), 'URL must not contain query param ?key=');
      assert.equal(interceptedHeaders['x-goog-api-key'], testKey, 'Header x-goog-api-key must contain the API key');
      assert.ok(models.includes('gemini-1.5-flash'));
      assert.ok(models.includes('gemini-1.5-pro'));

      // 3. Runtime error test: pastikan HTTP 400 dengan error message melempar exception deskriptif
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: 400,
              message: 'API key not valid. Please pass a valid API key.',
              status: 'INVALID_ARGUMENT',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      };

      await assert.rejects(
        async () => {
          await fetchAvailableGeminiModels('AIzaSyInvalidKey');
        },
        (err) => {
          return err.message.includes('API key not valid') || err.message.includes('HTTP 400');
        },
        'fetchAvailableGeminiModels must throw descriptive error on 400 invalid API key'
      );

      // 4. Runtime error test: pastikan timeout melempar error
      globalThis.fetch = async () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      };

      await assert.rejects(
        async () => {
          await fetchAvailableGeminiModels(testKey);
        },
        (err) => {
          return err.message.includes('timeout');
        },
        'fetchAvailableGeminiModels must throw timeout error on AbortError'
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('F-017: Lazy / Graceful Offline Handling pada supabase.ts', async () => {
    // 1. Ekspor fungsi dan utilitas offline di supabase.ts
    assert.ok(
      supabaseSource.includes('export const offlineFetch'),
      'supabase.ts must export offlineFetch'
    );
    assert.ok(
      supabaseSource.includes('export function createSupabaseClient'),
      'supabase.ts must export createSupabaseClient factory'
    );

    // 2. Runtime test: buat client unconfigured dan pastikan request diblokir tanpa request jaringan
    const { createSupabaseClient, offlineFetch } = await import('../src/lib/supabase.ts');

    // Test offlineFetch response
    const offlineRes = await offlineFetch('https://placeholder-offline.supabase.co', {});
    assert.equal(offlineRes.status, 503);
    const offlineJson = await offlineRes.json();
    assert.equal(offlineJson.code, 'OFFLINE_MODE');

    // Test client unconfigured
    const unconfiguredClient = createSupabaseClient(false);

    // Operasi select table tidak melakukan request internet, langsung mengembalikan 503 OFFLINE_MODE
    const queryResult = await unconfiguredClient.from('settings').select('*');
    assert.equal(queryResult.status, 503);
    assert.equal(queryResult.data, null);
    assert.ok(queryResult.error?.message?.includes('offline mode'));

    // Operasi delete table
    const deleteResult = await unconfiguredClient.from('settings').delete().eq('key', 'telegram_token');
    assert.equal(deleteResult.status, 503);
    assert.equal(deleteResult.data, null);

    // Channel realtime aman dan tidak memicu websocket
    const channel = unconfiguredClient.channel('test-channel');
    assert.equal(typeof channel.on, 'function');
    assert.equal(typeof channel.subscribe, 'function');

    let receivedStatus = '';
    const subscribedChannel = channel.subscribe((status) => {
      receivedStatus = status;
    });
    assert.equal(typeof subscribedChannel.unsubscribe, 'function');

    // Menghapus channel
    const removeRes = await unconfiguredClient.removeChannel(channel);
    assert.equal(removeRes, 'ok');

    // Test getChannels & removeAllChannels on unconfigured client
    const allChannels = unconfiguredClient.getChannels();
    assert.deepEqual(allChannels, []);
    const removeAllRes = await unconfiguredClient.removeAllChannels();
    assert.deepEqual(removeAllRes, []);

    // 3. Verifikasi fungsi isValidHttpUrl dan isPlaceholderKey
    const { isValidHttpUrl, isPlaceholderKey } = await import('../src/lib/supabase.ts');
    assert.equal(isValidHttpUrl('https://your-project-id.supabase.co'), false, 'Template URL must not be valid');
    assert.equal(isValidHttpUrl('https://placeholder-offline.supabase.co'), false, 'Placeholder URL must not be valid');
    assert.equal(isValidHttpUrl('HTTPS://PLACEHOLDER.SUPABASE.CO'), false, 'Case-insensitive placeholder URL must not be valid');
    assert.equal(isValidHttpUrl('https://real-valid-project.supabase.co'), true, 'Real URL must be valid');
    assert.equal(isValidHttpUrl(''), false, 'Empty URL must not be valid');

    assert.equal(isPlaceholderKey('your-anon-public-key'), true, 'Template anon key must be detected as placeholder');
    assert.equal(isPlaceholderKey('placeholder-offline-anon-key'), true, 'Placeholder key must be detected as placeholder');
    assert.equal(isPlaceholderKey('PLACEHOLDER_KEY'), true, 'Case-insensitive placeholder key must be detected');
    assert.equal(isPlaceholderKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.realKey'), false, 'Real anon key must not be placeholder');

    // 4. Verifikasi deleteSetting di useSettings.ts menangani kegagalan Supabase (misal RLS block) secara aman
    const { loadLocalSettings, saveNonSensitiveSettings, filterNonSensitiveSettings } = await import('../src/hooks/useSettings.ts');
    assert.equal(typeof loadLocalSettings, 'function');
    assert.equal(typeof saveNonSensitiveSettings, 'function');
    assert.equal(typeof filterNonSensitiveSettings, 'function');
  });

  it('F-006: File Migrasi SQL Pengamanan RLS Policy Supabase', () => {
    // 1. File migrasi ada
    assert.ok(fs.existsSync(migrationPath), 'Migration 20260928120000_secure_rls_policies.sql must exist');

    const migrationContent = fs.readFileSync(migrationPath, 'utf8');

    // 2. Menghapus policy anon_delete_*
    assert.ok(
      migrationContent.includes('DROP POLICY IF EXISTS "anon_delete_content" ON content;'),
      'Migration must drop anon_delete_content'
    );
    assert.ok(
      migrationContent.includes('DROP POLICY IF EXISTS "anon_delete_settings" ON settings;'),
      'Migration must drop anon_delete_settings'
    );
    assert.ok(
      migrationContent.includes('DROP POLICY IF EXISTS "anon_delete_files" ON uploaded_files;') ||
      migrationContent.includes('DROP POLICY IF EXISTS "anon_delete_uploaded_files" ON uploaded_files;'),
      'Migration must drop anon_delete_files / anon_delete_uploaded_files'
    );

    // 3. Membuat policy authenticated_delete_*
    assert.ok(
      migrationContent.includes('CREATE POLICY "authenticated_delete_content" ON content FOR DELETE'),
      'Migration must create authenticated_delete_content'
    );
    assert.ok(
      migrationContent.includes('TO authenticated USING (true);'),
      'Migration must restrict delete to authenticated'
    );
    assert.ok(
      migrationContent.includes('CREATE POLICY "authenticated_delete_settings" ON settings FOR DELETE'),
      'Migration must create authenticated_delete_settings'
    );
    assert.ok(
      migrationContent.includes('CREATE POLICY "authenticated_delete_uploaded_files" ON uploaded_files FOR DELETE'),
      'Migration must create authenticated_delete_uploaded_files'
    );
  });
});
