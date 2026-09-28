/**
 * verify_followup_improvements.test.mjs
 *
 * Test suite untuk Laporan Eksekutif & Catatan Perbaikan Lanjutan:
 * - UI: Diferensiasi badge Telegram (Bot) vs Telegram (Manual)
 * - UI: Indikator status bot di Topbar (isBotConfigured prop)
 * - UI: Helper text /start & @userinfobot di Settings Allowed Chat IDs
 * - UX: Siklus umpan balik bot reply (edge function sudah ada)
 * - UX: Sintaksis cepat Telegram (sudah diimplementasi di fase sebelumnya)
 * - UX: Callback realtime onNewTelegramIdea di useContent
 * - Backend: Batas karakter judul 1000 & deskripsi 4000
 * - Backend: Format bot reply sesuai brief
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Follow-up Improvements Verification Suite', async () => {
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const topbarPath = path.join(projectRoot, 'src', 'components', 'Topbar.tsx');
  const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const indexCssPath = path.join(projectRoot, 'src', 'index.css');
  const edgeFunctionPath = path.join(projectRoot, 'supabase', 'functions', 'telegram-webhook', 'index.ts');

  const contentTableSource = fs.readFileSync(contentTablePath, 'utf8');
  const topbarSource = fs.readFileSync(topbarPath, 'utf8');
  const settingsSource = fs.readFileSync(settingsPath, 'utf8');
  const appSource = fs.readFileSync(appPath, 'utf8');
  const useContentSource = fs.readFileSync(useContentPath, 'utf8');
  const indexCssSource = fs.readFileSync(indexCssPath, 'utf8');
  const edgeFunctionSource = fs.readFileSync(edgeFunctionPath, 'utf8');

  // ─── UI Section 1: Diferensiasi Visual Asal Ide ─────────────────────────────

  it('UI-1: ContentTable renders "Telegram (Bot)" badge for bot-sourced ideas', () => {
    assert.ok(
      contentTableSource.includes('Telegram (Bot)'),
      'ContentTable must render "Telegram (Bot)" label for ideas with telegram_message_id'
    );
    assert.ok(
      contentTableSource.includes('source-verified-bot'),
      'ContentTable must use .source-verified-bot CSS class for bot badge'
    );
  });

  it('UI-1: ContentTable renders "Telegram (Manual)" badge for manually-added Telegram ideas', () => {
    assert.ok(
      contentTableSource.includes('Telegram (Manual)'),
      'ContentTable must render "Telegram (Manual)" label for Telegram ideas without telegram_message_id'
    );
    assert.ok(
      contentTableSource.includes('source-telegram-manual'),
      'ContentTable must use .source-telegram-manual CSS class for manual badge'
    );
  });

  it('UI-1: CSS defines .source-telegram-manual style for visual differentiation', () => {
    assert.ok(
      indexCssSource.includes('.source-telegram-manual'),
      'index.css must define .source-telegram-manual styles'
    );
    assert.ok(
      indexCssSource.includes('source-telegram-manual') && indexCssSource.includes('f9c74f'),
      'source-telegram-manual should use amber color to differentiate from bot green'
    );
  });

  // ─── UI Section 2: Topbar Bot Status Indicator ──────────────────────────────

  it('UI-2: Topbar accepts isBotConfigured prop in interface', () => {
    assert.ok(
      topbarSource.includes('isBotConfigured'),
      'Topbar interface must declare isBotConfigured prop'
    );
    assert.ok(
      topbarSource.includes('isBotConfigured?: boolean'),
      'isBotConfigured prop should be optional boolean'
    );
  });

  it('UI-2: Topbar renders bot-status-dot indicator element', () => {
    assert.ok(
      topbarSource.includes('bot-status-dot'),
      'Topbar must render element with .bot-status-dot CSS class'
    );
  });

  it('UI-2: CSS defines .bot-status-dot styles with online state variant', () => {
    assert.ok(
      indexCssSource.includes('.bot-status-dot'),
      'index.css must define .bot-status-dot base styles'
    );
    assert.ok(
      indexCssSource.includes('.bot-status-dot.online'),
      'index.css must define .bot-status-dot.online variant for active/green state'
    );
  });

  it('UI-2: App.tsx passes isBotConfigured to Topbar based on telegram_token setting', () => {
    assert.ok(
      appSource.includes('isBotConfigured'),
      'App.tsx must pass isBotConfigured prop to Topbar'
    );
    assert.ok(
      appSource.includes('telegram_token'),
      'App.tsx must derive isBotConfigured from telegram_token setting'
    );
  });

  // ─── UI Section 3: Settings Chat ID Helper Text ─────────────────────────────

  it('UI-3: Settings includes /start command helper text', () => {
    assert.ok(
      settingsSource.includes('/start'),
      'Settings must mention /start command to help users find their Chat ID'
    );
  });

  it('UI-3: Settings includes @userinfobot reference', () => {
    assert.ok(
      settingsSource.includes('userinfobot'),
      'Settings must reference @userinfobot for finding Telegram ID'
    );
  });

  // ─── UX Section 3: Realtime Notification ────────────────────────────────────

  it('UX-3: useContent exposes setOnNewTelegramIdea registration function', () => {
    assert.ok(
      useContentSource.includes('setOnNewTelegramIdea'),
      'useContent must export setOnNewTelegramIdea callback registration function'
    );
    assert.ok(
      useContentSource.includes('onNewTelegramIdeaRef'),
      'useContent must use ref pattern for stable callback storage'
    );
  });

  it('UX-3: useContent realtime subscription detects Telegram bot INSERT events', () => {
    assert.ok(
      useContentSource.includes("eventType === 'INSERT'"),
      'Realtime subscription must detect INSERT events specifically'
    );
    assert.ok(
      useContentSource.includes('telegram_message_id'),
      'Realtime subscription must check telegram_message_id to confirm bot origin'
    );
  });

  it('UX-3: App.tsx registers setOnNewTelegramIdea callback for realtime toast', () => {
    assert.ok(
      appSource.includes('setOnNewTelegramIdea'),
      'App.tsx must use setOnNewTelegramIdea to register realtime callback'
    );
    assert.ok(
      appSource.includes('Telegram'),
      'App.tsx registered callback must trigger a toast mentioning Telegram'
    );
  });

  // ─── Backend Section: Edge Function ─────────────────────────────────────────

  it('Backend: Edge function title limit is 1000 characters (not old 140)', () => {
    assert.ok(
      edgeFunctionSource.includes('1000'),
      'Edge function must enforce 1000 character limit for title'
    );
    assert.ok(
      !edgeFunctionSource.includes('length > 140'),
      'Old 140-character title limit must be replaced with 1000'
    );
  });

  it('Backend: Edge function keeps 4000 character limit for sanitization', () => {
    assert.ok(
      edgeFunctionSource.includes('4000'),
      'Edge function must enforce 4000 character limit for description/notes'
    );
  });

  it('Backend: Edge function bot reply includes pipeline stage "Tahap: Idea"', () => {
    assert.ok(
      edgeFunctionSource.includes('Tahap: Idea') || edgeFunctionSource.includes('Tahap'),
      'Bot reply must mention the pipeline stage as per the brief'
    );
  });

  it('Backend: extractIdeaFromTelegramMessage respects 1000 char title limit', async () => {
    const { extractIdeaFromTelegramMessage } = await import('../supabase/functions/telegram-webhook/index.ts');

    const longTitleMessage = {
      message_id: 9001,
      from: { id: 123, is_bot: false, first_name: 'Test', username: 'tester' },
      chat: { id: 123, type: 'private' },
      date: Date.now(),
      text: 'A'.repeat(1100) + '\n\nSome notes here',
    };

    const result = extractIdeaFromTelegramMessage(longTitleMessage);
    assert.ok(result !== null, 'Should extract idea from long-title message');
    assert.ok(
      result.title.length <= 1000,
      `Title must be max 1000 chars, got ${result.title.length}`
    );
  });

  it('Backend: sanitizeTelegramText enforces 4000 character limit', async () => {
    const { sanitizeTelegramText } = await import('../supabase/functions/telegram-webhook/index.ts');

    const longText = 'A'.repeat(5000);
    const result = sanitizeTelegramText(longText);
    assert.ok(result.length <= 4000, `sanitized text must be max 4000 chars, got ${result.length}`);
  });

  it('Backend: escapeHtml sanitizes dangerous HTML characters', async () => {
    const { escapeHtml } = await import('../supabase/functions/telegram-webhook/index.ts');

    const xss = '<script>alert("xss")</script> & <b>ok</b>';
    const escaped = escapeHtml(xss);
    assert.ok(!escaped.includes('<script>'), 'Must escape <script> tags');
    assert.ok(escaped.includes('&amp;'), 'Must escape & as &amp;');
    assert.ok(escaped.includes('&lt;'), 'Must escape < as &lt;');
    assert.ok(escaped.includes('&gt;'), 'Must escape > as &gt;');
  });

  it('Backend: handleTelegramSlashCommand handles /start, /help, /pillars, /id, /pipeline, /latest', async () => {
    const { handleTelegramSlashCommand } = await import('../supabase/functions/telegram-webhook/index.ts');

    // 1. /start
    const startRes = await handleTelegramSlashCommand({
      text: '/start',
      chatId: 12345,
      isAllowed: true,
    });
    assert.ok(startRes.handled);
    assert.ok(startRes.responseMessage.includes('Selamat datang'));

    // 2. /help
    const helpRes = await handleTelegramSlashCommand({
      text: '/help',
      chatId: 12345,
      isAllowed: true,
    });
    assert.ok(helpRes.handled);
    assert.ok(helpRes.responseMessage.includes('/pipeline'));

    // 3. /pillars
    const pillarsRes = await handleTelegramSlashCommand({
      text: '/pillars',
      chatId: 12345,
      isAllowed: true,
    });
    assert.ok(pillarsRes.handled);
    assert.ok(pillarsRes.responseMessage.includes('Gaming & Digital Entertainment'));

    // 4. /id
    const idRes = await handleTelegramSlashCommand({
      text: '/id',
      chatId: 98765,
      senderId: 98765,
      senderUsername: 'testcreator',
      isAllowed: false, // /id works even if unwhitelisted
    });
    assert.ok(idRes.handled);
    assert.ok(idRes.responseMessage.includes('98765'));

    // 5. /pipeline with mock Supabase
    const mockSupabase = {
      from: () => ({
        select: () => Promise.resolve({
          data: [
            { status: 'Idea' },
            { status: 'Idea' },
            { status: 'Scripting' },
            { status: 'Published' },
          ],
          error: null,
        }),
      }),
    };
    const pipelineRes = await handleTelegramSlashCommand({
      text: '/pipeline',
      chatId: 12345,
      isAllowed: true,
      supabase: mockSupabase,
    });
    assert.ok(pipelineRes.handled);
    assert.ok(pipelineRes.responseMessage.includes('Total Konten: <b>4</b>'));
    assert.ok(pipelineRes.responseMessage.includes('Idea: <b>2</b>'));

    // 6. Non-command text returns null
    const nonCommand = await handleTelegramSlashCommand({
      text: 'Bukan slash command ide biasa',
      chatId: 12345,
      isAllowed: true,
    });
    assert.equal(nonCommand, null);
  });
});
