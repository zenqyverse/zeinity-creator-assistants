import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ==========================================
// Mock LocalStorage & Browser Polyfill for Functional Testing
// ==========================================
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new MockLocalStorage();
globalThis.window = { localStorage: globalThis.localStorage };

describe('Tahap 2 (Kontinuitas Naskah & AI Engine) Verification Suite', () => {
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const publishedDetailPath = path.join(projectRoot, 'src', 'views', 'PublishedDetail.tsx');
  const bulkModalPath = path.join(projectRoot, 'src', 'components', 'BulkImportModal.tsx');
  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const geminiContent = fs.readFileSync(geminiPath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
  const publishedDetailContent = fs.readFileSync(publishedDetailPath, 'utf8');
  const bulkModalContent = fs.readFileSync(bulkModalPath, 'utf8');
  const useContentContent = fs.readFileSync(useContentPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  it('Fitur 1: Kontinuitas Naskah di Seluruh Tahapan (ScriptDetail Thumbnailing & PublishedDetail)', () => {
    // 1. ScriptDetail.tsx maintains script viewer in Thumbnailing stage
    assert.ok(
      scriptDetailContent.includes("item.status === 'Thumbnailing'"),
      'ScriptDetail.tsx must handle Thumbnailing stage'
    );
    assert.ok(
      scriptDetailContent.includes('Naskah Video Final (Read-Only Viewer)'),
      'ScriptDetail.tsx must render Read-Only Viewer for final script in Thumbnailing stage'
    );
    assert.ok(
      scriptDetailContent.includes('isThumbnailScriptCollapsed'),
      'ScriptDetail.tsx must support collapsible state for script viewer in Thumbnailing stage'
    );
    assert.ok(
      scriptDetailContent.includes("copyText(scriptOutput, 'thumbScript')"),
      'ScriptDetail.tsx must provide copy button for script in Thumbnailing stage'
    );
    assert.ok(
      scriptDetailContent.includes('setIsScriptMaximized(true)'),
      'ScriptDetail.tsx must support maximizing script editor/viewer in Thumbnailing stage'
    );
    assert.ok(
      scriptDetailContent.includes('Arsip Audit Spoken & TTS'),
      'ScriptDetail.tsx must preserve Spoken Audit archives in Thumbnailing stage'
    );
    assert.ok(
      !scriptDetailContent.includes('Arsip Anotasi Visual Cue'),
      'ScriptDetail.tsx must remove Visual Cue archives in Thumbnailing stage per user request'
    );

    // 2. PublishedDetail.tsx renders final script viewer card
    assert.ok(
      publishedDetailContent.includes('Naskah Video Final (Arsip & Review)'),
      'PublishedDetail.tsx must render final script viewer section'
    );
    assert.ok(
      publishedDetailContent.includes('isScriptCollapsed'),
      'PublishedDetail.tsx must support collapsible script viewer'
    );
    assert.ok(
      publishedDetailContent.includes("copyText(finalScriptText, 'finalScript')"),
      'PublishedDetail.tsx must provide copy button for final script'
    );
    assert.ok(
      publishedDetailContent.includes('finalScriptWordCount'),
      'PublishedDetail.tsx must display word count stats for final script'
    );
  });

  it('Fitur 2: Sistem Riwayat Snapshot Draf (Draft Versioning / Undo Revisi AI)', async () => {
    // 1. Source code assertions
    assert.ok(
      scriptDetailContent.includes('export function getDraftSnapshots') ||
      scriptDetailContent.includes('export { DRAFT_HISTORY_PREFIX, getDraftSnapshots, saveDraftSnapshot }'),
      'ScriptDetail.tsx must export getDraftSnapshots'
    );
    assert.ok(
      scriptDetailContent.includes('export function saveDraftSnapshot') ||
      scriptDetailContent.includes('export { DRAFT_HISTORY_PREFIX, getDraftSnapshots, saveDraftSnapshot }'),
      'ScriptDetail.tsx must export saveDraftSnapshot'
    );
    assert.ok(
      scriptDetailContent.includes('handleRestoreSnapshot'),
      'ScriptDetail.tsx must implement handleRestoreSnapshot'
    );
    assert.ok(
      scriptDetailContent.includes('handleUndoLatestAiRevision'),
      'ScriptDetail.tsx must implement handleUndoLatestAiRevision'
    );
    assert.ok(
      scriptDetailContent.includes('showDraftHistoryModal'),
      'ScriptDetail.tsx must track showDraftHistoryModal state'
    );
    assert.ok(
      scriptDetailContent.includes('Riwayat Snapshot Draf Naskah'),
      'ScriptDetail.tsx must render Draft Snapshot History Modal'
    );
    assert.ok(
      scriptDetailContent.includes('zeinity_draft_history_'),
      'Draft history must use zeinity_draft_history_ prefix'
    );

    // 2. Functional testing of real production snapshot versioning logic
    const { saveDraftSnapshot, getDraftSnapshots, DRAFT_HISTORY_PREFIX } = await import('../src/lib/draftSnapshots.ts');

    const testItemId = 'test-item-snap-456';
    globalThis.localStorage.removeItem(`${DRAFT_HISTORY_PREFIX}${testItemId}`);

    // Snapshot 1
    const snap1 = saveDraftSnapshot(testItemId, 'Draf naskah awal versi pertama yang ditulis.');
    assert.equal(snap1.length, 1);
    assert.equal(snap1[0].wordCount, 7);
    assert.equal(snap1[0].content, 'Draf naskah awal versi pertama yang ditulis.');

    // Duplicate content should not add duplicate snapshot
    const snapDup = saveDraftSnapshot(testItemId, 'Draf naskah awal versi pertama yang ditulis.');
    assert.equal(snapDup.length, 1, 'Duplicate content should be ignored');

    // Add snapshots up to and exceeding limit (5 max)
    saveDraftSnapshot(testItemId, 'Draf versi 2 revisi hook pembuka.');
    saveDraftSnapshot(testItemId, 'Draf versi 3 penyesuaian spoken voice.');
    saveDraftSnapshot(testItemId, 'Draf versi 4 penambahan bukti riset.');
    saveDraftSnapshot(testItemId, 'Draf versi 5 anotasi visual awal.');
    const snap6 = saveDraftSnapshot(testItemId, 'Draf versi 6 revisi pamungkas.');

    // Limit check: must cap at 5 snapshots
    assert.equal(snap6.length, 5, 'Must keep at most 5 recent snapshots');
    assert.equal(snap6[0].content, 'Draf versi 6 revisi pamungkas.');

    // getDraftSnapshots retrieves the exact stored items
    const retrieved = getDraftSnapshots(testItemId);
    assert.equal(retrieved.length, 5);
    assert.equal(retrieved[0].content, 'Draf versi 6 revisi pamungkas.');
  });

  it('Fitur 3: Generator Judul Alternatif (Mode A & Mode B) Sesuai Standar Komunitas YouTube', async () => {
    // 1. gemini.ts exports generateAlternativeTitles
    assert.ok(
      geminiContent.includes('export async function generateAlternativeTitles'),
      'gemini.ts must export generateAlternativeTitles'
    );
    assert.ok(
      geminiContent.includes('Mode A (Curiosity & Mobile Optimized)'),
      'Prompt must specify Mode A requirements'
    );
    assert.ok(
      geminiContent.includes('Mode B (Keyword & Authority Focused)'),
      'Prompt must specify Mode B requirements'
    );
    assert.ok(
      geminiContent.includes('5 sampai 8 kata') || geminiContent.includes('5-8 kata') || geminiContent.includes('5–8 kata'),
      'Prompt must specify 5-8 words rule for Mode A'
    );

    // 2. parseJsonResponse includes titleA, titleB, explanation in fallback keys
    const { parseJsonResponse } = await import('../src/lib/gemini.ts');
    const mockLLMTitleResponse = `
    Berikut adalah judul alternatif terbaik untuk video YouTube Anda:
    \`\`\`json
    {
      "titleA": "Skandal AI yang Dirahasiakan Silicon Valley",
      "titleB": "Regulasi AI 2026: Dampak Krisis Etika terhadap Bisnis Global",
      "explanation": "Mode A optimal 6 kata untuk layar HP, Mode B untuk authority search."
    }
    \`\`\`
    `;
    const parsed = parseJsonResponse(mockLLMTitleResponse);
    assert.equal(parsed.titleA, 'Skandal AI yang Dirahasiakan Silicon Valley');
    assert.equal(parsed.titleB, 'Regulasi AI 2026: Dampak Krisis Etika terhadap Bisnis Global');

    // 3. ScriptDetail.tsx and PublishedDetail.tsx UI integration
    assert.ok(
      scriptDetailContent.includes('handleGenerateTitles'),
      'ScriptDetail.tsx must implement handleGenerateTitles'
    );
    assert.ok(
      scriptDetailContent.includes('Generate Rekomendasi Judul ✨') || scriptDetailContent.includes('Buat Judul A/B ✨'),
      'ScriptDetail.tsx must render title recommendation action button'
    );
    assert.ok(
      scriptDetailContent.includes('Curiosity Gap') || scriptDetailContent.includes('MODE A — CURIOSITY / INTRIGUE'),
      'ScriptDetail.tsx must render Curiosity Gap / Mode A formula'
    );
    assert.ok(
      scriptDetailContent.includes('SEO Keyword') || scriptDetailContent.includes('MODE B — SEO KEYWORD & AUTHORITY'),
      'ScriptDetail.tsx must render SEO Keyword / Mode B formula'
    );

    assert.ok(
      publishedDetailContent.includes('MODE A — CURIOSITY / INTRIGUE'),
      'PublishedDetail.tsx must render Mode A card'
    );
    assert.ok(
      publishedDetailContent.includes('MODE B — SEO KEYWORD & AUTHORITY'),
      'PublishedDetail.tsx must render Mode B card'
    );
    assert.ok(
      publishedDetailContent.includes('Buat Ulang Judul A/B'),
      'PublishedDetail.tsx must provide title regenerate button'
    );
  });

  it('Fitur 4: Bulk Import Ide Masal (CSV, MD, TXT)', async () => {
    // 1. Static checks on BulkImportModal.tsx
    assert.ok(
      bulkModalContent.includes('export function parseBulkIdeasText') ||
      bulkModalContent.includes('parseBulkIdeasText'),
      'BulkImportModal.tsx must export parseBulkIdeasText'
    );
    assert.ok(
      bulkModalContent.includes('CONTENT_PILLARS'),
      'BulkImportModal.tsx must use official CONTENT_PILLARS'
    );
    assert.ok(
      bulkModalContent.includes('normalizeContentPillar'),
      'BulkImportModal.tsx must normalize categories'
    );

    // 2. Functional test of the real production parser logic (CSV, Markdown, TXT)
    const { parseBulkIdeasText } = await import('../src/lib/bulkImport.ts');

    // Test a: CSV Parsing with headers
    const csvData = `Judul,Pilar Konten,Catatan Riset
Misteri Algoritma Finansial,Internet & Social Media Culture,Data dari Wall Street Journal
Kebangkitan Robotika Domestik,Hardware & Robotics,Sumber dari IEEE spectrum 2026`;
    const parsedCsv = parseBulkIdeasText(csvData, 'csv');
    assert.equal(parsedCsv.length, 2);
    assert.equal(parsedCsv[0].title, 'Misteri Algoritma Finansial');
    assert.equal(parsedCsv[0].category, 'Internet & Social Media Culture');
    assert.equal(parsedCsv[0].research_text, 'Data dari Wall Street Journal');
    assert.equal(parsedCsv[1].title, 'Kebangkitan Robotika Domestik');

    // Test a2: Semicolon-delimited CSV (pasted without ext)
    const csvSemicolon = `Judul;Pilar Konten;Catatan Riset
Misteri Algoritma Finansial;Internet & Social Media Culture;Data dari Wall Street Journal
Kebangkitan Robotika Domestik;AI & Technology Impact;Sumber dari IEEE`;
    const parsedSemicolon = parseBulkIdeasText(csvSemicolon, 'txt');
    assert.equal(parsedSemicolon.length, 2);
    assert.equal(parsedSemicolon[0].title, 'Misteri Algoritma Finansial');
    assert.equal(parsedSemicolon[1].category, 'AI & Technology Impact');

    // Test a3: CSV with escaped quotes
    const csvEscapedQuotes = `"Misteri ""Black Box"" Algoritma",Internet & Social Media Culture,Catatan`;
    const parsedQuotes = parseBulkIdeasText(csvEscapedQuotes, 'csv');
    assert.equal(parsedQuotes.length, 1);
    assert.equal(parsedQuotes[0].title, 'Misteri "Black Box" Algoritma');

    // Test b: Markdown list parsing with [Pillar] and notes separator
    const mdData = `
- [AI & Automation] Mengapa AI Agent Menggantikan Konsultan: Studi Kasus McKinsey 2026
* [Gaming & Virtual Economy] Krisis Server Game Global | Kerugian 50 Juta Dolar
1. [Cybersecurity & Digital Rights] Hacker Membobol Satelit Komunikasi — Analisis Forensik
`;
    const parsedMd = parseBulkIdeasText(mdData, 'md');
    assert.equal(parsedMd[0].category, 'AI & Technology Impact');
    assert.equal(parsedMd[1].category, 'Digital Economy & Creator Economy');
    assert.equal(parsedMd[0].title, 'Mengapa AI Agent Menggantikan Konsultan');
    assert.equal(parsedMd[0].research_text, 'Studi Kasus McKinsey 2026');

    // Test b2: Markdown with label prefix stripping (Judul: ..., Topik: ...)
    const mdPrefixData = `- Judul: 5 Kesalahan Fatal Content Creator di 2026
- Topik: Eksodus Pengembang ke Model Open Source`;
    const parsedPrefix = parseBulkIdeasText(mdPrefixData, 'md');
    assert.equal(parsedPrefix.length, 2);
    assert.equal(parsedPrefix[0].title, '5 Kesalahan Fatal Content Creator di 2026');
    assert.equal(parsedPrefix[1].title, 'Eksodus Pengembang ke Model Open Source');

    // Test b3: Delimiter // for notes in list
    const mdSlashDelimiter = `- DeepSeek R1 // Solusi Murah Pengganti OpenAI`;
    const parsedSlash = parseBulkIdeasText(mdSlashDelimiter, 'md');
    assert.equal(parsedSlash.length, 1);
    assert.equal(parsedSlash[0].title, 'DeepSeek R1');
    assert.equal(parsedSlash[0].research_text, 'Solusi Murah Pengganti OpenAI');

    // Test c: Plain text list fallback
    const txtData = `Ide Pertama Tanpa Format
Ide Kedua: Dengan Catatan Penting`;
    const parsedTxt = parseBulkIdeasText(txtData, 'txt');
    assert.equal(parsedTxt.length, 2);
    assert.equal(parsedTxt[0].title, 'Ide Pertama Tanpa Format');
    assert.equal(parsedTxt[1].title, 'Ide Kedua');
    assert.equal(parsedTxt[1].research_text, 'Dengan Catatan Penting');

    // 3. Check bulkAddIdeas in useContent.ts & App.tsx
    assert.ok(
      useContentContent.includes('bulkAddIdeas'),
      'useContent.ts must export bulkAddIdeas'
    );
    assert.ok(
      appContent.includes('BulkImportModal'),
      'App.tsx must import BulkImportModal'
    );
    assert.ok(
      appContent.includes('handleBulkImportIdeas'),
      'App.tsx must connect handleBulkImportIdeas'
    );
  });

  it('Fitur 5: Meneruskan Catatan Ide Awal (research_text) ke AI Generator', () => {
    // 1. generateResearchBriefPrompt accepts researchText
    assert.ok(
      geminiContent.includes('researchText?: string | null'),
      'generateResearchBriefPrompt must accept researchText parameter'
    );
    assert.ok(
      geminiContent.includes('<initial_research_notes>'),
      'generateResearchBriefPrompt must embed <initial_research_notes>'
    );
    assert.ok(
      geminiContent.includes('${initialNotesBlock}'),
      'generateResearchBriefPrompt must interpolate initialNotesBlock into <context>'
    );

    // 2. App.tsx and ScriptDetail.tsx pass item.research_text
    assert.ok(
      appContent.includes('item.research_text'),
      'App.tsx must pass item.research_text into generateResearchBriefPrompt'
    );
    assert.ok(
      scriptDetailContent.includes('item.research_text'),
      'ScriptDetail.tsx must pass item.research_text to prompt generator'
    );
  });

  it('Fitur 6: Dukungan Format .docx di Dropzone Naskah & Riset', () => {
    // 1. Dropzones in ScriptDetail accept .docx
    assert.ok(
      scriptDetailContent.includes('.docx,.md,.markdown,.txt'),
      'ScriptDetail file dropzones must accept .docx files'
    );

    // 2. handleMdFileUpload handles docx via extractTextFromFile
    assert.ok(
      scriptDetailContent.includes("allowed = ['md', 'markdown', 'docx', 'txt']"),
      'handleMdFileUpload must allow docx extension'
    );
    assert.ok(
      scriptDetailContent.includes('extractTextFromFile(file)'),
      'handleMdFileUpload must call extractTextFromFile'
    );
  });

  it('Fitur 7: Optimasi Context Window untuk Model Lokal Ollama', () => {
    // 1. callAI sends num_ctx: 16384 for Ollama
    assert.ok(
      geminiContent.includes('num_ctx: 16384'),
      'Ollama API call must configure 16k context window (num_ctx: 16384)'
    );

    // 2. runSpokenAudit and runVisualCueAnnotation bounds context to 12000 chars for Ollama
    assert.ok(
      geminiContent.includes("config.provider === 'ollama'"),
      'Audit and visual cue actions must detect Ollama provider'
    );
    assert.ok(
      geminiContent.includes('maxTotal: 12000'),
      'Audit and visual cue actions must use 12,000 char boundary for Ollama'
    );
  });
});
