import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 3: Data Integrity, Forms & Settings Extension Verification', async () => {
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const analyticsPath = path.join(projectRoot, 'src', 'views', 'Analytics.tsx');
  const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const useSettingsPath = path.join(projectRoot, 'src', 'hooks', 'useSettings.ts');
  const fileManagerPath = path.join(projectRoot, 'src', 'views', 'FileManager.tsx');
  const indexPath = path.join(projectRoot, 'src', 'index.css');

  const contentTableSrc = fs.readFileSync(contentTablePath, 'utf8');
  const appSrc = fs.readFileSync(appPath, 'utf8');
  const analyticsSrc = fs.readFileSync(analyticsPath, 'utf8');
  const settingsSrc = fs.readFileSync(settingsPath, 'utf8');
  const useSettingsSrc = fs.readFileSync(useSettingsPath, 'utf8');
  const fileManagerSrc = fs.readFileSync(fileManagerPath, 'utf8');
  const indexCss = fs.readFileSync(indexPath, 'utf8');

  it('F-04: Button differentiation on ContentTable & App.tsx', () => {
    // 1. ContentTableProps supports custom import & add idea labels and optional onImportFile
    assert.ok(contentTableSrc.includes('importButtonLabel?: string;'));
    assert.ok(contentTableSrc.includes('addIdeaButtonLabel?: string;'));
    assert.ok(contentTableSrc.includes('onImportFile?: () => void;'));

    // 2. ContentTable hides import button on scripts & published view
    assert.ok(contentTableSrc.includes('!isScriptsView && !isPublishedView'));

    // 3. App.tsx passes "Import Ide Masal (CSV/TXT)" for ideas and research
    assert.ok(appSrc.includes('importButtonLabel="Import Ide Masal (CSV/TXT)"'));

    // 4. App.tsx customizes add idea label for scripts and gives toast guidance
    assert.ok(appSrc.includes('addIdeaButtonLabel="+ Tambah Ide Baru"'));
    assert.ok(appSrc.includes("showToast('Ide berhasil ditambahkan (lihat di tab Content Ideas)')"));
  });

  it('F-08: Production duration & Monthly Chart Filter in Analytics.tsx', () => {
    // 1. Durasi produksi uses published_at strictly, no fallback to updated_at
    assert.ok(analyticsSrc.includes('i.status === \'Published\' && i.created_at && i.published_at'));
    assert.ok(!analyticsSrc.includes('cur.published_at ? new Date(cur.published_at).getTime() : new Date(cur.updated_at).getTime()'));

    // 2. Monthly production chart only includes produced statuses (Scripting, Thumbnailing, Published)
    assert.ok(analyticsSrc.includes("['Scripting', 'Thumbnailing', 'Published']"));
    assert.ok(analyticsSrc.includes('producedItems.forEach'));

    // 3. Runtime data integrity simulation
    const mockItems = [
      {
        id: '1',
        title: 'Published Item 1',
        status: 'Published',
        created_at: '2026-09-01T00:00:00.000Z',
        published_at: '2026-09-03T00:00:00.000Z', // 48 hours
        updated_at: '2026-09-28T00:00:00.000Z', // metric edit does NOT affect calculation
      },
      {
        id: '2',
        title: 'Raw Idea',
        status: 'Idea',
        created_at: '2026-09-01T00:00:00.000Z',
        published_at: null,
      },
      {
        id: '3',
        title: 'Scripting Item',
        status: 'Scripting',
        created_at: '2026-09-10T00:00:00.000Z',
        published_at: null,
      },
    ];

    const publishedOnly = mockItems.filter(
      (i) => i.status === 'Published' && i.created_at && i.published_at
    );
    assert.equal(publishedOnly.length, 1);
    const prodDurationHours =
      (new Date(publishedOnly[0].published_at).getTime() - new Date(publishedOnly[0].created_at).getTime()) / 3600000;
    assert.equal(prodDurationHours, 48); // Not 648 hours

    const producedStatuses = ['Scripting', 'Thumbnailing', 'Published'];
    const produced = mockItems.filter((i) => producedStatuses.includes(i.status));
    assert.equal(produced.length, 2);
    assert.ok(!produced.some((i) => i.status === 'Idea' || i.status === 'Researching'));
  });

  it('F-10: Hotspot hover disabled from App.tsx and index.css', () => {
    // 1. App.tsx does not have hotspot div with onMouseEnter
    assert.ok(!appSrc.includes('onMouseEnter={() => setSidebarOpen(true)}'));
    assert.ok(!appSrc.includes('<div className="hotspot"'));

    // 2. index.css disables .hotspot
    assert.ok(indexCss.includes('.hotspot {\n  display: none !important;\n}'));
  });

  it('F-12: Consolidated Save & Dirty State in Settings.tsx', () => {
    // 1. Settings.tsx implements isDirty calculation
    assert.ok(settingsSrc.includes('const isDirty = useMemo'));
    assert.ok(settingsSrc.includes('handleSaveAll'));

    // 2. Renders "Simpan Semua Pengaturan" button
    assert.ok(settingsSrc.includes('Simpan Semua Pengaturan'));

    // 3. Renders dirty indicator
    assert.ok(settingsSrc.includes('Perubahan belum disimpan'));

    // 4. Runtime dirty state evaluation test
    const keysToCheck = [
      'gemini_api_key',
      'gemini_model_version',
      'openrouter_api_key',
      'openrouter_model_version',
      'ollama_endpoint',
      'ollama_model_version',
      'active_provider',
      'telegram_token',
      'telegram_allowed_chat_ids',
    ];

    const baseSettings = {
      gemini_api_key: 'AIzaSy123',
      gemini_model_version: 'gemini-1.5-flash',
      openrouter_api_key: '',
      openrouter_model_version: 'openrouter/free',
      ollama_endpoint: 'http://localhost:11434',
      ollama_model_version: 'llama3',
      active_provider: 'gemini',
      telegram_token: '',
      telegram_allowed_chat_ids: '',
    };

    const isDirtyCheck = (vals, currentSettings) =>
      keysToCheck.some((k) => (vals[k] ?? '').trim() !== (currentSettings[k] ?? '').trim());

    // Initially clean
    assert.equal(isDirtyCheck({ ...baseSettings }, baseSettings), false);

    // Dirty when user modifies any tracked field
    assert.equal(isDirtyCheck({ ...baseSettings, gemini_api_key: 'AIzaSyNewKey' }, baseSettings), true);
    assert.equal(isDirtyCheck({ ...baseSettings, telegram_allowed_chat_ids: '123456' }, baseSettings), true);

    // Whitespace only is treated as clean if matching trimmed
    assert.equal(isDirtyCheck({ ...baseSettings, telegram_token: '   ' }, baseSettings), false);
  });

  it('F-27: Friendly CORS handling in useSettings.ts and Settings.tsx', async () => {
    // 1. isCorsBlocked in TelegramVerificationResult
    assert.ok(useSettingsSrc.includes('isCorsBlocked?: boolean;'));

    // 2. Friendly error message in useSettings.ts
    assert.ok(
      useSettingsSrc.includes('Pengujian langsung dari browser dibatasi oleh kebijakan keamanan CORS Telegram')
    );

    // 3. Settings.tsx shows informative CORS explanation and micro tooltip
    assert.ok(settingsSrc.includes('botVerificationResult?.isCorsBlocked'));
    assert.ok(settingsSrc.includes('Informasi Keamanan Browser (CORS)'));
    assert.ok(settingsSrc.includes('Catatan Keamanan Browser (CORS)'));

    // 4. Runtime check for CORS error message
    const { verifyTelegramBotToken } = await import('../src/hooks/useSettings.ts');
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };
      const res = await verifyTelegramBotToken('123456789:ABCdefGhIJKlmNoPQRsTUVwxyZa12345678');
      assert.equal(res.success, false);
      assert.equal(res.isCorsBlocked, true);
      assert.ok(res.error?.includes('CORS Telegram'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('F-29: Expanded Global Search Filter in ContentTable.tsx', () => {
    // 1. ContentTable filters category, research_text, and ai_output
    assert.ok(contentTableSrc.includes('item.category.toLowerCase().includes(query)'));
    assert.ok(contentTableSrc.includes('item.research_text.toLowerCase().includes(query)'));
    assert.ok(contentTableSrc.includes('item.ai_output.toLowerCase().includes(query)'));

    // 2. Runtime filter evaluation
    const runtimeFilter = (item, query) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        Boolean(item.title && item.title.toLowerCase().includes(q)) ||
        Boolean(item.category && item.category.toLowerCase().includes(q)) ||
        Boolean(item.research_text && item.research_text.toLowerCase().includes(q)) ||
        Boolean(item.ai_output && item.ai_output.toLowerCase().includes(q)) ||
        Boolean(item.source && item.source.toLowerCase().includes(q))
      );
    };

    const mockItem = {
      title: 'YouTube AI Automation Workflow',
      category: 'AI & Technology Impact',
      research_text: 'Deep dive into LLM automation pipelines and scripting.',
      ai_output: 'High engagement score CTR 8.2%',
      source: 'Web',
    };

    assert.ok(runtimeFilter(mockItem, 'automation'));
    assert.ok(runtimeFilter(mockItem, 'Technology'));
    assert.ok(runtimeFilter(mockItem, 'LLM'));
    assert.ok(runtimeFilter(mockItem, 'CTR 8.2%'));
    assert.ok(runtimeFilter(mockItem, 'web'));
    assert.ok(runtimeFilter(mockItem, ''));
    assert.equal(runtimeFilter(mockItem, 'nonexistent_query'), false);
    // Null-safe
    assert.doesNotThrow(() => runtimeFilter({ title: undefined, category: null }, 'test'));
    assert.equal(runtimeFilter({ title: undefined, category: null }, 'test'), false);
  });

  it('F-32: Extended File Formats Label in FileManager.tsx', () => {
    // 1. FileManager upload button text
    assert.ok(fileManagerSrc.includes('Upload Dokumen (.docx, .md, .txt, .csv)'));
  });
});
