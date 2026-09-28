import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 4 Verification Suite (F-004, F-005, F-008)', async () => {
  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const migrationPath = path.join(projectRoot, 'supabase', 'migrations', '20260928130000_add_telegram_metadata_to_content.sql');
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const overviewPath = path.join(projectRoot, 'src', 'views', 'Overview.tsx');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const publishedDetailPath = path.join(projectRoot, 'src', 'views', 'PublishedDetail.tsx');
  const addIdeaModalPath = path.join(projectRoot, 'src', 'components', 'AddIdeaModal.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const indexCssPath = path.join(projectRoot, 'src', 'index.css');
  const useSettingsPath = path.join(projectRoot, 'src', 'hooks', 'useSettings.ts');
  const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const edgeFunctionPath = path.join(projectRoot, 'supabase', 'functions', 'telegram-webhook', 'index.ts');
  const archDocPath = path.join(projectRoot, 'docs', 'telegram_integration_architecture.md');

  const typesSource = fs.readFileSync(typesPath, 'utf8');
  const migrationSource = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';
  const contentTableSource = fs.readFileSync(contentTablePath, 'utf8');
  const overviewSource = fs.readFileSync(overviewPath, 'utf8');
  const scriptDetailSource = fs.readFileSync(scriptDetailPath, 'utf8');
  const publishedDetailSource = fs.readFileSync(publishedDetailPath, 'utf8');
  const addIdeaModalSource = fs.readFileSync(addIdeaModalPath, 'utf8');
  const appSource = fs.readFileSync(appPath, 'utf8');
  const useContentSource = fs.readFileSync(useContentPath, 'utf8');
  const indexCssSource = fs.readFileSync(indexCssPath, 'utf8');
  const useSettingsSource = fs.readFileSync(useSettingsPath, 'utf8');
  const settingsSource = fs.readFileSync(settingsPath, 'utf8');
  const edgeFunctionSource = fs.existsSync(edgeFunctionPath) ? fs.readFileSync(edgeFunctionPath, 'utf8') : '';
  const archDocSource = fs.existsSync(archDocPath) ? fs.readFileSync(archDocPath, 'utf8') : '';

  it('F-008: Metadata Verifikasi Asal Pesan Telegram pada ContentItem, Migration SQL & UI', async () => {
    // 1. Verifikasi field metadata Telegram di types.ts
    assert.ok(
      typesSource.includes('telegram_message_id?: number | null;'),
      'ContentItem in types.ts must declare optional telegram_message_id'
    );
    assert.ok(
      typesSource.includes('telegram_chat_id?: string | null;'),
      'ContentItem in types.ts must declare optional telegram_chat_id'
    );
    assert.ok(
      typesSource.includes('telegram_sender_username?: string | null;'),
      'ContentItem in types.ts must declare optional telegram_sender_username'
    );

    // 2. Verifikasi berkas migrasi SQL Supabase
    assert.ok(fs.existsSync(migrationPath), 'Migration file 20260928130000_add_telegram_metadata_to_content.sql must exist');
    assert.ok(
      migrationSource.includes('ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_message_id bigint;'),
      'Migration must add telegram_message_id bigint'
    );
    assert.ok(
      migrationSource.includes('ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_chat_id text;'),
      'Migration must add telegram_chat_id text'
    );
    assert.ok(
      migrationSource.includes('ALTER TABLE content ADD COLUMN IF NOT EXISTS telegram_sender_username text;'),
      'Migration must add telegram_sender_username text'
    );
    assert.ok(
      migrationSource.includes('idx_content_telegram_message_id'),
      'Migration must create index for telegram_message_id'
    );
    assert.ok(
      migrationSource.includes('idx_content_telegram_msg_chat'),
      'Migration must create composite index for telegram deduplication'
    );

    // 3. Verifikasi penanda visual "Verified Bot" di ContentTable.tsx
    assert.ok(
      contentTableSource.includes('item.telegram_message_id'),
      'ContentTable.tsx must inspect item.telegram_message_id'
    );
    assert.ok(
      contentTableSource.includes('Verified Bot'),
      'ContentTable.tsx must render "Verified Bot" badge'
    );
    assert.ok(
      contentTableSource.includes('source-verified-bot'),
      'ContentTable.tsx must use source-verified-bot CSS class'
    );

    // 4. Verifikasi penanda visual "Verified Bot" di Overview.tsx
    assert.ok(
      overviewSource.includes('item.telegram_message_id'),
      'Overview.tsx must inspect item.telegram_message_id'
    );
    assert.ok(
      overviewSource.includes('Verified Bot'),
      'Overview.tsx must render "Verified Bot" badge'
    );

    // 5. Verifikasi penanda visual di ScriptDetail.tsx & PublishedDetail.tsx
    assert.ok(
      scriptDetailSource.includes('item.telegram_message_id'),
      'ScriptDetail.tsx must inspect item.telegram_message_id'
    );
    assert.ok(
      scriptDetailSource.includes('Verified Bot'),
      'ScriptDetail.tsx must render "Verified Bot" badge'
    );
    assert.ok(
      publishedDetailSource.includes('item.telegram_message_id'),
      'PublishedDetail.tsx must inspect item.telegram_message_id'
    );
    assert.ok(
      publishedDetailSource.includes('Verified Bot'),
      'PublishedDetail.tsx must render "Verified Bot" badge'
    );

    // 6. Verifikasi penanda visual & passing metadata di AddIdeaModal.tsx & App.tsx
    assert.ok(
      addIdeaModalSource.includes('telegram_message_id'),
      'AddIdeaModal.tsx must inspect telegram_message_id on initialData'
    );
    assert.ok(
      addIdeaModalSource.includes('Verified Bot'),
      'AddIdeaModal.tsx must render Verified Bot indicator banner'
    );
    assert.ok(
      appSource.includes('telegram_message_id?: number | null;'),
      'App.tsx handleAddIdea must accept telegram_message_id'
    );
    assert.ok(
      useContentSource.includes('telegram_message_id?: number | null;'),
      'useContent.ts addIdea must accept telegram_message_id'
    );

    // 7. Verifikasi styling CSS di index.css
    assert.ok(
      indexCssSource.includes('.source-verified-bot'),
      'index.css must define .source-verified-bot styles'
    );
  });

  it('F-005: Whitelist Chat/User ID Telegram di useSettings.ts & Settings.tsx', async () => {
    // 1. Verifikasi DEFAULT_SETTINGS di useSettings.ts
    assert.ok(
      useSettingsSource.includes("telegram_allowed_chat_ids: ''"),
      'DEFAULT_SETTINGS in useSettings.ts must define telegram_allowed_chat_ids as empty string'
    );

    // 2. Runtime testing fungsi helper whitelist di useSettings.ts
    const { DEFAULT_SETTINGS, parseAllowedChatIds, isChatIdAllowed } = await import('../src/hooks/useSettings.ts');
    assert.equal(DEFAULT_SETTINGS.telegram_allowed_chat_ids, '');

    // Test parseAllowedChatIds
    const parsedA = parseAllowedChatIds('12345, 67890, -100987654');
    assert.deepEqual(parsedA, ['12345', '67890', '-100987654']);

    const parsedEmpty = parseAllowedChatIds('');
    assert.deepEqual(parsedEmpty, []);

    const parsedNull = parseAllowedChatIds(null);
    assert.deepEqual(parsedNull, []);

    // Test isChatIdAllowed
    const allowedConfig = '12345678, 87654321, -1001234567890, @zeinity_admin';
    assert.equal(isChatIdAllowed('12345678', allowedConfig), true, 'Direct ID match should be allowed');
    assert.equal(isChatIdAllowed(87654321, allowedConfig), true, 'Numeric ID should be converted and matched');
    assert.equal(isChatIdAllowed('-1001234567890', allowedConfig), true, 'Group ID should be allowed');
    assert.equal(isChatIdAllowed('zeinity_admin', allowedConfig), true, 'Username match without @ should be allowed');
    assert.equal(isChatIdAllowed('@zeinity_admin', allowedConfig), true, 'Username match with @ should be allowed');

    assert.equal(isChatIdAllowed('99999999', allowedConfig), false, 'Unknown ID should be rejected');
    assert.equal(isChatIdAllowed('unknown_user', allowedConfig), false, 'Unknown username should be rejected');
    assert.equal(isChatIdAllowed('12345678', ''), false, 'Empty whitelist should reject all');
    assert.equal(isChatIdAllowed(null, allowedConfig), false, 'Null target should be rejected');

    // 3. Verifikasi input field & helper tooltip di Settings.tsx
    assert.ok(
      settingsSource.includes('telegram_allowed_chat_ids'),
      'Settings.tsx must bind to telegram_allowed_chat_ids'
    );
    assert.ok(
      settingsSource.includes('Allowed Chat/User IDs'),
      'Settings.tsx must render "Allowed Chat/User IDs" label'
    );
    assert.ok(
      settingsSource.includes('Anti-Spam') || settingsSource.includes('anti-spam'),
      'Settings.tsx must explain anti-spam security mechanism in helper/tooltip'
    );
    assert.ok(
      settingsSource.includes("handleSave('telegram_allowed_chat_ids')"),
      'Settings.tsx must have a button to save telegram_allowed_chat_ids'
    );
  });

  it('F-004: Blueprint Supabase Edge Function Webhook Receiver (telegram-webhook/index.ts)', async () => {
    // 1. Verifikasi keberadaan berkas Edge Function
    assert.ok(fs.existsSync(edgeFunctionPath), 'Edge function telegram-webhook/index.ts must exist');

    // 2. Import modul Edge Function untuk runtime unit testing
    const edgeModule = await import('../supabase/functions/telegram-webhook/index.ts');
    const {
      validateSecretToken,
      parseAllowedChatIds,
      isSenderAllowed,
      sanitizeTelegramText,
      detectContentPillar,
      extractIdeaFromTelegramMessage,
      handleWebhookRequest,
      escapeHtml,
      constantTimeCompare,
    } = edgeModule;

    // Test A: validateSecretToken & constantTimeCompare
    assert.equal(constantTimeCompare('test-secret', 'test-secret'), true);
    assert.equal(constantTimeCompare('test-secret', 'wrong-secret'), false);
    assert.equal(constantTimeCompare('short', 'longer-string'), false);

    const validSecret = 'my-super-secret-token-12345';
    assert.equal(validateSecretToken(validSecret, validSecret).valid, true);
    assert.equal(validateSecretToken('wrong-token', validSecret).valid, false);
    assert.equal(validateSecretToken(null, validSecret).valid, false);
    assert.equal(validateSecretToken(undefined, validSecret).valid, false);
    assert.equal(validateSecretToken('any-token', '').valid, true, 'Unconfigured secret should fallback gracefully');

    // Test B: sanitizeTelegramText & escapeHtml
    assert.equal(escapeHtml('React <Suspense> & Test "Quotes"'), 'React &lt;Suspense&gt; &amp; Test &quot;Quotes&quot;');
    const dirtyText = 'Ide Video Baru!\0\x01\x02\r\nBaris kedua dengan riset.\n\n\n\n\nBaris ketiga.';
    const cleaned = sanitizeTelegramText(dirtyText);
    assert.ok(!cleaned.includes('\0'), 'Null bytes must be stripped');
    assert.ok(!cleaned.includes('\x01'), 'ASCII control char \x01 must be stripped');
    assert.ok(!cleaned.includes('\r\n'), 'Carriage return must be normalized');
    assert.ok(!cleaned.includes('\n\n\n'), 'Excessive consecutive newlines must be collapsed');
    assert.ok(cleaned.includes('Baris kedua dengan riset.'), 'Clean text must be preserved');

    // Test C: detectContentPillar
    assert.equal(detectContentPillar('Riset tentang #AI dan model LLM'), 'AI & Technology Impact');
    assert.equal(detectContentPillar('Analisis monetisasi #creator dan #economy'), 'Digital Economy & Creator Economy');
    assert.equal(detectContentPillar('Bedah mekanik game RPG di #gaming'), 'Gaming & Digital Entertainment');
    assert.equal(detectContentPillar('Dampak layar dan #psikologi atensi manusia'), 'Modern Life & Digital Psychology');
    assert.equal(detectContentPillar('Tren viral meme di medsos #culture'), 'Internet & Social Media Culture');

    // Test D: extractIdeaFromTelegramMessage
    const mockMessage = {
      message_id: 1042,
      from: {
        id: 778899,
        is_bot: false,
        first_name: 'Creator',
        username: 'zeinity_creator',
      },
      chat: {
        id: 778899,
        type: 'private',
        first_name: 'Creator',
        username: 'zeinity_creator',
      },
      date: 1727500000,
      text: '#ai Cara Kerja Multi-Agent LLM dalam Scriptwriting\n\nPoin riset penting:\n1. Mengurangi waktu penulisan hingga 50%.\n2. Butuh pengawasan human-in-the-loop.',
    };

    const extracted = extractIdeaFromTelegramMessage(mockMessage);
    assert.ok(extracted !== null, 'Extracted idea must not be null');
    assert.equal(extracted.title, 'Cara Kerja Multi-Agent LLM dalam Scriptwriting');
    assert.equal(extracted.category, 'AI & Technology Impact');
    assert.ok(extracted.notes.includes('Poin riset penting:'));
    assert.equal(extracted.telegram_message_id, 1042);
    assert.equal(extracted.telegram_chat_id, '778899');
    assert.equal(extracted.telegram_sender_username, 'zeinity_creator');

    // Test E: isSenderAllowed
    const allowedWhitelist = ['778899', '112233', 'zeinity_admin'];
    assert.equal(
      isSenderAllowed({ chatId: '778899', senderId: 778899, senderUsername: 'zeinity_creator', allowedList: allowedWhitelist }),
      true,
      'Whitelisted chatId/senderId should be accepted'
    );
    assert.equal(
      isSenderAllowed({ chatId: '999999', senderId: 999999, senderUsername: 'zeinity_admin', allowedList: allowedWhitelist }),
      true,
      'Whitelisted username should be accepted'
    );
    assert.equal(
      isSenderAllowed({ chatId: '999999', senderId: 999999, senderUsername: 'stranger', allowedList: allowedWhitelist }),
      false,
      'Unlisted sender should be rejected'
    );
    assert.equal(
      isSenderAllowed({ chatId: '778899', senderId: 778899, allowedList: [] }),
      false,
      'Empty whitelist should reject (zero-trust)'
    );

    // Test F: End-to-end simulation of handleWebhookRequest
    // Scenario 1: OPTIONS CORS Preflight
    const optionsReq = new Request('https://edge.supabase.co/telegram-webhook', { method: 'OPTIONS' });
    const optionsRes = await handleWebhookRequest(optionsReq);
    assert.equal(optionsRes.status, 200);

    // Scenario 2: Method not allowed (GET)
    const getReq = new Request('https://edge.supabase.co/telegram-webhook', { method: 'GET' });
    const getRes = await handleWebhookRequest(getReq);
    assert.equal(getRes.status, 405);

    // Scenario 3: Secret Token Mismatch (401)
    const badSecretReq = new Request('https://edge.supabase.co/telegram-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret',
      },
      body: JSON.stringify({ update_id: 1, message: mockMessage }),
    });
    const badSecretRes = await handleWebhookRequest(badSecretReq, { secretToken: 'expected-secret' });
    assert.equal(badSecretRes.status, 401);

    // Scenario 4a: Non-whitelisted sender rejection
    const unwhitelistedReq = new Request('https://edge.supabase.co/telegram-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'correct-secret',
      },
      body: JSON.stringify({
        update_id: 2,
        message: {
          ...mockMessage,
          chat: { id: 99999, type: 'private' },
          from: { id: 99999, is_bot: false, first_name: 'Spammer', username: 'spammer_bot' },
        },
      }),
    });
    const unwhitelistedRes = await handleWebhookRequest(unwhitelistedReq, {
      secretToken: 'correct-secret',
      allowedChatIds: '778899, 112233',
    });
    assert.equal(unwhitelistedRes.status, 200); // 200 OK so Telegram does not retry spam, but status is forbidden
    const unwhitelistedJson = await unwhitelistedRes.json();
    assert.equal(unwhitelistedJson.ok, false);
    assert.equal(unwhitelistedJson.status, 'forbidden');

    // Scenario 4b: Zero-Trust Empty Whitelist Rejection
    const emptyWhitelistReq = new Request('https://edge.supabase.co/telegram-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'correct-secret',
      },
      body: JSON.stringify({ update_id: 21, message: mockMessage }),
    });
    const emptyWhitelistRes = await handleWebhookRequest(emptyWhitelistReq, {
      secretToken: 'correct-secret',
      allowedChatIds: '',
    });
    assert.equal(emptyWhitelistRes.status, 200);
    const emptyWhitelistJson = await emptyWhitelistRes.json();
    assert.equal(emptyWhitelistJson.ok, false);
    assert.equal(emptyWhitelistJson.status, 'forbidden');
    assert.ok(emptyWhitelistJson.reason.includes('zero-trust'));

    // Scenario 5: Success with mock Supabase client
    let insertedRecord = null;
    const mockSupabase = {
      from: (table) => {
        assert.equal(table, 'content');
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: (payload) => {
            insertedRecord = payload;
            return {
              select: () => ({
                single: async () => ({ data: { id: 'supabase-content-999', ...payload }, error: null }),
              }),
            };
          },
        };
      },
    };

    const successReq = new Request('https://edge.supabase.co/telegram-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'correct-secret',
      },
      body: JSON.stringify({ update_id: 3, message: mockMessage }),
    });

    const successRes = await handleWebhookRequest(successReq, {
      supabaseClient: mockSupabase,
      secretToken: 'correct-secret',
      allowedChatIds: '778899, 112233',
    });

    assert.equal(successRes.status, 200);
    const successJson = await successRes.json();
    assert.equal(successJson.ok, true);
    assert.ok(insertedRecord !== null, 'Content record must be inserted into Supabase');
    assert.equal(insertedRecord.title, 'Cara Kerja Multi-Agent LLM dalam Scriptwriting');
    assert.equal(insertedRecord.source, 'Telegram');
    assert.equal(insertedRecord.status, 'Idea');
    assert.equal(insertedRecord.telegram_message_id, 1042);
    assert.equal(insertedRecord.telegram_chat_id, '778899');
    assert.equal(insertedRecord.telegram_sender_username, 'zeinity_creator');

    // Scenario 6: Idempotent message deduplication
    const mockSupabaseExisting = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'existing-content-123',
                  title: 'Sudah Ada',
                  status: 'Idea',
                  telegram_message_id: 1042,
                  telegram_chat_id: '778899',
                },
                error: null,
              }),
            }),
          }),
        }),
        insert: () => {
          assert.fail('insert must NOT be called for duplicate message');
        },
      }),
    };

    const duplicateReq = new Request('https://edge.supabase.co/telegram-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'correct-secret',
      },
      body: JSON.stringify({ update_id: 4, message: mockMessage }),
    });

    const duplicateRes = await handleWebhookRequest(duplicateReq, {
      supabaseClient: mockSupabaseExisting,
      secretToken: 'correct-secret',
      allowedChatIds: '778899, 112233',
    });
    assert.equal(duplicateRes.status, 200);
    const duplicateJson = await duplicateRes.json();
    assert.equal(duplicateJson.ok, true);
    assert.equal(duplicateJson.status, 'already_processed');
    assert.equal(duplicateJson.item.id, 'existing-content-123');

    // Scenario 7: Malformed payload (missing chat)
    const malformedReq = new Request('https://edge.supabase.co/telegram-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'correct-secret',
      },
      body: JSON.stringify({ update_id: 99, message: { message_id: 555 } }),
    });
    const malformedRes = await handleWebhookRequest(malformedReq, { secretToken: 'correct-secret' });
    assert.equal(malformedRes.status, 200);
    const malformedJson = await malformedRes.json();
    assert.equal(malformedJson.status, 'ignored');
  });

  it('F-004: Dokumentasi Arsitektur Lengkap (docs/telegram_integration_architecture.md)', () => {
    assert.ok(fs.existsSync(archDocPath), 'docs/telegram_integration_architecture.md must exist');
    assert.ok(archDocSource.includes('Telegram Bot'), 'Architecture doc must cover Telegram Bot');
    assert.ok(archDocSource.includes('F-004'), 'Architecture doc must reference F-004');
    assert.ok(archDocSource.includes('F-005'), 'Architecture doc must reference F-005');
    assert.ok(archDocSource.includes('F-008'), 'Architecture doc must reference F-008');
    assert.ok(archDocSource.includes('X-Telegram-Bot-Api-Secret-Token'), 'Architecture doc must explain secret token header');
    assert.ok(archDocSource.includes('telegram_allowed_chat_ids'), 'Architecture doc must explain whitelist mechanism');
    assert.ok(archDocSource.includes('telegram_message_id'), 'Architecture doc must explain message verification metadata');
    assert.ok(archDocSource.includes('Verified Bot'), 'Architecture doc must explain Verified Bot UI indicators');
    assert.ok(archDocSource.includes('Runbook') || archDocSource.includes('Deployment'), 'Architecture doc must provide deployment runbook');
  });
});
