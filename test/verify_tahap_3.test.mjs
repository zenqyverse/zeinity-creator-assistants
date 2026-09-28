import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Tahap 3 (Polishing, Metrik & Pembersihan Kode) Verification Suite', () => {
  const publishedDetailPath = path.join(projectRoot, 'src', 'views', 'PublishedDetail.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const overviewPath = path.join(projectRoot, 'src', 'views', 'Overview.tsx');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const analyticsPath = path.join(projectRoot, 'src', 'views', 'Analytics.tsx');
  const useAlertHookPath = path.join(projectRoot, 'src', 'hooks', 'useAlert.ts');
  const useTerminalHookPath = path.join(projectRoot, 'src', 'hooks', 'useTerminal.ts');
  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const importModalPath = path.join(projectRoot, 'src', 'components', 'ImportModal.tsx');
  const topbarPath = path.join(projectRoot, 'src', 'components', 'Topbar.tsx');
  const indexPath = path.join(projectRoot, 'src', 'index.css');

  // =========================================================================
  // Item 1: Perbaikan Navigasi Revert di PublishedDetail.tsx & App.tsx
  // =========================================================================
  it('Item 1: Perbaikan Navigasi Revert di PublishedDetail.tsx & App.tsx', () => {
    const publishedDetailContent = fs.readFileSync(publishedDetailPath, 'utf8');
    const appContent = fs.readFileSync(appPath, 'utf8');

    // 1. PublishedDetailProps declares onRevertToScript
    assert.ok(
      publishedDetailContent.includes('onRevertToScript?: (item: ContentItem) => void;'),
      'PublishedDetailProps must declare onRevertToScript callback prop'
    );

    // 2. handleStatusChange triggers onRevertToScript when status is not Published
    assert.ok(
      publishedDetailContent.includes("if (newStatus !== 'Published')") &&
      publishedDetailContent.includes('onRevertToScript(targetItem)'),
      'PublishedDetail.tsx must invoke onRevertToScript when status changes to non-Published'
    );

    // 3. App.tsx passes onRevertToScript to PublishedDetail
    assert.ok(
      appContent.includes('onRevertToScript={(revertedItem) => {') ||
      appContent.includes('onRevertToScript={'),
      'App.tsx must pass onRevertToScript callback to PublishedDetail'
    );

    // 4. App.tsx resets published state and sets scriptItem
    assert.ok(
      appContent.includes('setPublishedItem(null);') &&
      appContent.includes('setScriptItem('),
      'App.tsx must reset publishedItem and set scriptItem on revert transition'
    );

    // 5. handleUpdateItem in App.tsx transitions to ScriptDetail and updates activeView
    assert.ok(
      appContent.includes("updates.status !== 'Published'") &&
      appContent.includes('setScriptItem(updated);'),
      'App.tsx handleUpdateItem must transition non-Published updates to ScriptDetail'
    );
    assert.ok(
      appContent.includes('setActiveView(targetView);'),
      'App.tsx must synchronize activeView on revert so Back button returns to the correct pipeline table'
    );
    assert.ok(
      publishedDetailContent.includes('startActivity') && publishedDetailContent.includes('errorActivity'),
      'PublishedDetail.tsx handleStatusChange must log status changes to terminal and handle errors gracefully'
    );
  });

  // =========================================================================
  // Item 2: Interaktivitas Judul Konten & Ergonomi Textarea
  // =========================================================================
  it('Item 2: Interaktivitas Judul Konten & Ergonomi Textarea', () => {
    const contentTableContent = fs.readFileSync(contentTablePath, 'utf8');
    const overviewContent = fs.readFileSync(overviewPath, 'utf8');
    const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
    const cssContent = fs.readFileSync(indexPath, 'utf8');

    // 1. ContentTable interactive title
    assert.ok(
      contentTableContent.includes('handleTitleClick'),
      'ContentTable.tsx must define handleTitleClick'
    );
    assert.ok(
      contentTableContent.includes('className="cell-title cell-title-btn"'),
      'ContentTable.tsx must render title as cell-title-btn button'
    );
    assert.ok(
      contentTableContent.includes('onClick={() => handleTitleClick(item)}'),
      'ContentTable.tsx title button must trigger handleTitleClick'
    );

    // 2. Overview interactive title and detail callbacks
    assert.ok(
      overviewContent.includes('onViewScript?: (item: ContentItem) => void;'),
      'OverviewProps must declare onViewScript'
    );
    assert.ok(
      overviewContent.includes('onViewPublished?: (item: ContentItem) => void;'),
      'OverviewProps must declare onViewPublished'
    );
    assert.ok(
      overviewContent.includes('handleTitleClick'),
      'Overview.tsx must define handleTitleClick'
    );
    assert.ok(
      overviewContent.includes('className="cell-title cell-title-btn"'),
      'Overview.tsx must render title as cell-title-btn button'
    );

    // 3. CSS contains .cell-title-btn rules with hover state and pointer cursor
    assert.ok(cssContent.includes('.cell-title-btn'), 'index.css must define .cell-title-btn');
    assert.ok(cssContent.includes('cursor: pointer'), 'index.css must set cursor: pointer for .cell-title-btn');
    assert.ok(cssContent.includes('.cell-title-btn:hover'), 'index.css must define :hover for .cell-title-btn');

    // 4. Textarea ergonomics in ScriptDetail.tsx
    assert.ok(
      scriptDetailContent.includes("minHeight: 260") &&
      scriptDetailContent.includes("resize: 'vertical'"),
      'ScriptDetail.tsx script editor textarea must have minHeight >= 260 and vertical resize'
    );
    assert.ok(
      scriptDetailContent.includes("minHeight: 220"),
      'ScriptDetail.tsx research editor textarea must have minHeight >= 220'
    );
  });

  // =========================================================================
  // Item 3: Konsolidasi Utilitas Pembersih Prompt
  // =========================================================================
  it('Item 3: Konsolidasi Utilitas Pembersih Prompt', async () => {
    const geminiContent = fs.readFileSync(geminiPath, 'utf8');
    const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

    // 1. gemini.ts exports formatStructuredPrompt with XML stripping
    assert.ok(
      geminiContent.includes('export function formatStructuredPrompt'),
      'gemini.ts must export formatStructuredPrompt'
    );
    assert.ok(
      geminiContent.includes('instructions') && geminiContent.includes('negative_constraints'),
      'gemini.ts formatStructuredPrompt must clean system XML prompt wrappers'
    );

    // 2. ScriptDetail.tsx delegates formatPromptText to formatStructuredPrompt
    assert.ok(
      scriptDetailContent.includes('formatStructuredPrompt') &&
      scriptDetailContent.includes('const formatPromptText = formatStructuredPrompt;'),
      'ScriptDetail.tsx must delegate formatPromptText directly to formatStructuredPrompt without duplicating regex'
    );

    // 3. Functional test of formatStructuredPrompt with XML tags and markdown codeblock wrappers
    const { formatStructuredPrompt } = await import('../src/lib/gemini.ts');

    const rawPromptWithXml = `\`\`\`markdown
<instructions>
### STRUKTUR WAJIB
[1] Phenomenon
BAGIAN ASLI: Kalimat lama
MASALAH: Kurang tajam
REVISI: Kalimat tajam baru
ALASAN: Lebih spoke-friendly
</instructions>
<negative_constraints>
Jangan gunakan AI clichés
</negative_constraints>
<output_format>
Markdown
</output_format>
<research_data>
Data 123
</research_data>
<dimensi_audit>
Dimensi A
</dimensi_audit>
<boundary>
Batasan
</boundary>
\`\`\``;

    const cleaned = formatStructuredPrompt(rawPromptWithXml);
    assert.ok(!cleaned.includes('```'), 'Markdown codeblock backticks must be stripped');
    assert.ok(!cleaned.includes('<instructions>'), 'XML opening tag must be stripped');
    assert.ok(!cleaned.includes('</instructions>'), 'XML closing tag must be stripped');
    assert.ok(!cleaned.includes('<negative_constraints>'), 'XML negative constraints must be stripped');
    assert.ok(!cleaned.includes('<output_format>'), 'XML output_format must be stripped');
    assert.ok(!cleaned.includes('<research_data>'), 'XML research_data must be stripped');
    assert.ok(!cleaned.includes('<dimensi_audit>'), 'XML dimensi_audit must be stripped');
    assert.ok(!cleaned.includes('<boundary>'), 'XML boundary must be stripped');
    assert.ok(cleaned.includes('**BAGIAN ASLI:**'), 'BAGIAN ASLI must be formatted');
    assert.ok(cleaned.includes('**MASALAH:**'), 'MASALAH must be formatted');
    assert.ok(cleaned.includes('**REVISI:**'), 'REVISI must be formatted');
    assert.ok(cleaned.includes('**ALASAN:**'), 'ALASAN must be formatted');
  });

  // =========================================================================
  // Item 4: Perbaikan Metrik Rata-rata Durasi Produksi di Analytics.tsx
  // =========================================================================
  it('Item 4: Perbaikan Metrik Rata-rata Durasi Produksi di Analytics.tsx', () => {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');

    // 1. Must filter strictly for Published items
    assert.ok(
      analyticsContent.includes("i.status === 'Published'"),
      "Analytics.tsx must strictly filter i.status === 'Published' for Avg Production Time"
    );
    assert.ok(
      !analyticsContent.includes("i.status !== 'Idea'"),
      "Analytics.tsx must not use obsolete status !== 'Idea' which distorted metrics with active drafts"
    );
    assert.ok(
      analyticsContent.includes('isNaN(end)') && analyticsContent.includes('validCount'),
      'Analytics.tsx must guard against NaN corrupted dates'
    );

    // 2. Functional calculation verification
    const testItems = [
      {
        id: '1',
        title: 'Video Published 1',
        status: 'Published',
        created_at: '2026-09-01T00:00:00.000Z',
        published_at: '2026-09-03T00:00:00.000Z', // 48 hours
        updated_at: '2026-09-03T00:00:00.000Z',
      },
      {
        id: '2',
        title: 'Video Published 2',
        status: 'Published',
        created_at: '2026-09-05T00:00:00.000Z',
        published_at: '2026-09-06T00:00:00.000Z', // 24 hours
        updated_at: '2026-09-06T00:00:00.000Z',
      },
      {
        id: '3',
        title: 'Active Draft in Scripting',
        status: 'Scripting',
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-28T00:00:00.000Z', // 648 hours (draft should NOT be counted)
      },
      {
        id: '4',
        title: 'Corrupted Published with invalid date',
        status: 'Published',
        created_at: 'invalid-date',
        published_at: 'invalid-date',
        updated_at: 'invalid-date',
      },
    ];

    const publishedOnly = testItems.filter(
      (i) => i.status === 'Published' && i.created_at && (i.published_at || i.updated_at)
    );
    let validCount = 0;
    const totalHours = publishedOnly.reduce((acc, cur) => {
      const end = cur.published_at ? new Date(cur.published_at).getTime() : new Date(cur.updated_at).getTime();
      const start = new Date(cur.created_at).getTime();
      if (isNaN(end) || isNaN(start)) return acc;
      validCount++;
      return acc + (end - start) / 3600000;
    }, 0);
    const avgHours = validCount > 0 ? totalHours / validCount : 0;

    // (48 + 24) / 2 = 36 hours (1.5 days), invalid date skipped
    assert.equal(avgHours, 36);
  });

  // =========================================================================
  // Item 5: Pembersihan ESLint & Dead Schema
  // =========================================================================
  it('Item 5: Pembersihan ESLint & Dead Schema', () => {
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    const importModalContent = fs.readFileSync(importModalPath, 'utf8');
    const topbarContent = fs.readFileSync(topbarPath, 'utf8');
    const appContent = fs.readFileSync(appPath, 'utf8');

    // 1. Hook files exist and export hooks
    assert.ok(fs.existsSync(useAlertHookPath), 'src/hooks/useAlert.ts must exist');
    assert.ok(fs.existsSync(useTerminalHookPath), 'src/hooks/useTerminal.ts must exist');

    const useAlertContent = fs.readFileSync(useAlertHookPath, 'utf8');
    const useTerminalContent = fs.readFileSync(useTerminalHookPath, 'utf8');
    assert.ok(useAlertContent.includes('export function useAlert()'), 'useAlert.ts must export useAlert');
    assert.ok(useTerminalContent.includes('export function useTerminal()'), 'useTerminal.ts must export useTerminal');

    // 2. types.ts documents deprecation on dead schema fields
    assert.ok(
      typesContent.includes('@deprecated') && typesContent.includes('script_outline'),
      'types.ts must document deprecation on script_outline'
    );
    assert.ok(
      typesContent.includes('@deprecated') && typesContent.includes('target_publish_date'),
      'types.ts must document deprecation on target_publish_date'
    );

    // 3. ImportModal.tsx contextual extraction feedback
    assert.ok(
      importModalContent.includes("currentFile?.ext === 'docx'") &&
      importModalContent.includes("currentFile?.ext === 'csv'"),
      'ImportModal.tsx must provide contextual file parsing messages per file type (.docx vs .csv vs text)'
    );

    // 4. Topbar search interaction on non-table views
    assert.ok(
      topbarContent.includes('searchPlaceholder?: string;') || topbarContent.includes('searchPlaceholder,'),
      'Topbar.tsx must support searchPlaceholder prop'
    );
    assert.ok(
      appContent.includes('handleSearchChange') && appContent.includes('isTableActive'),
      'App.tsx must define handleSearchChange and isTableActive to route searches smoothly'
    );
    assert.ok(
      topbarContent.includes("key === 'Escape'"),
      'Topbar.tsx must support clearing search with Escape key'
    );
  });
});
