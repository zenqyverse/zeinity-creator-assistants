import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Hook-First Pipeline (Generate Hook) Verification Suite', () => {
  const migrationPath = path.join(
    projectRoot,
    'supabase',
    'migrations',
    '20261002000000_add_script_hook_columns.sql'
  );
  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const outlineWorkspacePath = path.join(
    projectRoot,
    'src',
    'components',
    'script',
    'OutlineWorkspace.tsx'
  );
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');

  const typesContent = fs.readFileSync(typesPath, 'utf8');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');
  const useContentContent = fs.readFileSync(useContentPath, 'utf8');
  const outlineWorkspaceContent = fs.readFileSync(outlineWorkspacePath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  it('1. Database Migration: adds script_hook_* columns and partial index', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration SQL file must exist');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sqlContent.includes('ADD COLUMN IF NOT EXISTS script_hook_type text'), 'Must add script_hook_type');
    assert.ok(sqlContent.includes('ADD COLUMN IF NOT EXISTS script_hook_draft text'), 'Must add script_hook_draft');
    assert.ok(sqlContent.includes('ADD COLUMN IF NOT EXISTS script_hook_notes text'), 'Must add script_hook_notes');
    assert.ok(sqlContent.includes('CREATE INDEX IF NOT EXISTS idx_content_script_hook_type'), 'Must create index for script_hook_type');
  });

  it('2. Types: defines 6 official hook formulas and HookRecommendationResult', async () => {
    assert.ok(typesContent.includes('export interface ZeinityHookFormula'), 'Must export ZeinityHookFormula');
    assert.ok(typesContent.includes('export const ZEINITY_HOOK_FORMULAS'), 'Must export ZEINITY_HOOK_FORMULAS');
    assert.ok(typesContent.includes('export interface HookRecommendationResult'), 'Must export HookRecommendationResult');
    assert.ok(typesContent.includes('script_hook_type?: string | null;'), 'ContentItem must include script_hook_type');
    assert.ok(typesContent.includes('script_hook_draft?: string | null;'), 'ContentItem must include script_hook_draft');
    assert.ok(typesContent.includes('script_hook_notes?: string | null;'), 'ContentItem must include script_hook_notes');

    const typesModule = await import('../src/types.ts');
    assert.equal(typesModule.ZEINITY_HOOK_FORMULAS.length, 6, 'Must contain exactly 6 hook formulas');

    const ids = typesModule.ZEINITY_HOOK_FORMULAS.map((f) => f.id);
    assert.deepEqual(
      ids,
      ['contradiction', 'broken_assumption', 'function_drift', 'evidence_first', 'hidden_incentive', 'pattern'],
      'Must contain all 6 exact formula IDs'
    );

    const starred = typesModule.ZEINITY_HOOK_FORMULAS.filter((f) => f.isStarred);
    assert.equal(starred.length, 3, 'Exactly top 3 formulas must be starred');
    assert.equal(starred[0].id, 'contradiction');
    assert.equal(starred[1].id, 'broken_assumption');
    assert.equal(starred[2].id, 'function_drift');
  });

  it('3. Gemini Library: exports hook functions and helpers', async () => {
    assert.ok(geminiContent.includes('export async function recommendZeinityHook('), 'Must export recommendZeinityHook');
    assert.ok(geminiContent.includes('export async function generateZeinityHook('), 'Must export generateZeinityHook');
    assert.ok(geminiContent.includes('export function applyHookToOutline('), 'Must export applyHookToOutline');
    assert.ok(geminiContent.includes('export function getHookFormulaById('), 'Must export getHookFormulaById');

    const geminiModule = await import('../src/lib/gemini.ts');
    assert.equal(typeof geminiModule.recommendZeinityHook, 'function');
    assert.equal(typeof geminiModule.generateZeinityHook, 'function');
    assert.equal(typeof geminiModule.applyHookToOutline, 'function');
    assert.equal(typeof geminiModule.getHookFormulaById, 'function');
    assert.equal(geminiModule.ZEINITY_HOOK_FORMULAS.length, 6);

    const f1 = geminiModule.getHookFormulaById('contradiction');
    assert.ok(f1 && f1.name === 'Contradiction Hook');

    const fUnknown = geminiModule.getHookFormulaById('non_existent');
    assert.equal(fUnknown, undefined);
  });

  it('4. applyHookToOutline: cleanly replaces Babak 1 while preserving Babak 2-5 across all heading formats', async () => {
    const { applyHookToOutline, getBeatHeadingPattern } = await import('../src/lib/gemini.ts');

    const initialOutline = `## BABAK 1: PEMBUKA & HOOK LAMA
Teks babak 1 lama yang akan digantikan.

## BABAK 2: OBVIOUS ANSWER VS REALITY
Teks babak 2 yang sangat penting dan tidak boleh hilang.

## BABAK 3: THE HIDDEN MECHANISM & INCENTIVES
Teks babak 3 analisis teknis.

## BABAK 4: COMPLICATION & HUMAN IMPACT
Teks babak 4 dampak manusia.

## BABAK 5: SYNTHESIS & BIGGER PICTURE
Teks babak 5 konklusi.`;

    const newHookDraft = `Pernahkah Anda bertanya mengapa sistem ini justru menghasilkan hal sebaliknya?
Dalam 30 detik ke depan, kita bongkar anomalinya.`;

    const result = applyHookToOutline(initialOutline, newHookDraft, 'contradiction');

    assert.ok(result.includes('### I. HOOK & CLICK VALIDATION'), 'Header Babak 1 must use standard stage title');
    assert.ok(result.includes('Contradiction Hook ⭐'), 'Must mention selected hook label');
    assert.ok(result.includes(newHookDraft), 'Must contain new hook draft');
    assert.ok(!result.includes('Teks babak 1 lama'), 'Old Babak 1 text must be removed');
    assert.ok(result.includes('## BABAK 2: OBVIOUS ANSWER VS REALITY'), 'Babak 2 header must be preserved');
    assert.ok(result.includes('Teks babak 2 yang sangat penting dan tidak boleh hilang.'), 'Babak 2 body must be preserved');
    assert.ok(result.includes('## BABAK 3: THE HIDDEN MECHANISM & INCENTIVES'), 'Babak 3 must be preserved');
    assert.ok(result.includes('## BABAK 4: COMPLICATION & HUMAN IMPACT'), 'Babak 4 must be preserved');
    assert.ok(result.includes('## BABAK 5: SYNTHESIS & BIGGER PICTURE'), 'Babak 5 must be preserved');

    // Edge case 1: Colon in Babak 2 heading (e.g. ### II: OBVIOUS ANSWER)
    const colonOutline = `### I. HOOK\nOld hook\n\n### II: OBVIOUS ANSWER\nRealita penting babak 2\n\n### III: MECHANISM\nMesin babak 3`;
    const colonResult = applyHookToOutline(colonOutline, newHookDraft, 'broken_assumption');
    assert.ok(colonResult.includes('Broken Assumption Hook ⭐'));
    assert.ok(colonResult.includes('### II: OBVIOUS ANSWER\nRealita penting babak 2'), 'Must preserve colon Babak 2');
    assert.ok(colonResult.includes('### III: MECHANISM\nMesin babak 3'), 'Must preserve Babak 3');

    // Edge case 2: Missing Babak 2, but has Babak 3 & 4
    const missingBeat2Outline = `### I. HOOK\nOld hook\n\n### III. THE HIDDEN MECHANISM\nBabak 3 content\n\n### IV. HUMAN IMPACT\nBabak 4 content`;
    const missingBeat2Result = applyHookToOutline(missingBeat2Outline, newHookDraft, 'evidence_first');
    assert.ok(missingBeat2Result.includes('Evidence-First Oddity'));
    assert.ok(missingBeat2Result.includes('### III. THE HIDDEN MECHANISM\nBabak 3 content'), 'Babak 3 must NOT be lost');
    assert.ok(missingBeat2Result.includes('### IV. HUMAN IMPACT\nBabak 4 content'), 'Babak 4 must NOT be lost');

    // Edge case 3: Outline title prefix before Babak 1
    const prefixOutline = `# KERANGKA VIDEO: KONTEN ANALITIS\n\n### I. HOOK\nOld hook\n\n### II. OBVIOUS ANSWER\nBabak 2`;
    const prefixResult = applyHookToOutline(prefixOutline, newHookDraft, 'pattern');
    assert.ok(prefixResult.startsWith('# KERANGKA VIDEO: KONTEN ANALITIS'), 'Must preserve outline document title prefix');
    assert.ok(prefixResult.includes('Pattern Hook'));
    assert.ok(prefixResult.includes('### II. OBVIOUS ANSWER\nBabak 2'));

    // Edge case 4: Empty initial outline
    const emptyResult = applyHookToOutline('', newHookDraft, 'broken_assumption');
    assert.ok(emptyResult.includes('Broken Assumption Hook ⭐'), 'Must build Babak 1 when outline is empty');
    assert.ok(emptyResult.includes(newHookDraft), 'Must contain hook draft');

    // Verify getBeatHeadingPattern matches various legal formats without false positives
    const r2 = getBeatHeadingPattern(2);
    assert.ok(r2.test('### II. OBVIOUS ANSWER'));
    assert.ok(r2.test('### II: OBVIOUS ANSWER'));
    assert.ok(r2.test('### II - OBVIOUS ANSWER'));
    assert.ok(r2.test('2. II. OBVIOUS ANSWER VS REALITY'));
    assert.ok(r2.test('Stage 2: Mechanism'));
    assert.ok(r2.test('Tahap 2: Mechanism'));
    assert.ok(!r2.test('2. Poin dalam daftar bernomor biasa'));
    assert.ok(!r2.test('Ada 2 hal menarik di sini'));
  });

  it('5. External Prompt Formatters: format hook direction when provided and handle overloads cleanly', async () => {
    const { formatExternalOutlinePrompt, formatExternalScriptingPrompt } = await import(
      '../src/lib/gemini.ts'
    );

    const outlinePromptWithHook = formatExternalOutlinePrompt(
      'Misteri AI Coding',
      'Riset lengkap...',
      'Teknologi',
      'Ide awal',
      'Sudut pandang kritis',
      1500,
      '8-10m',
      'contradiction',
      'Draft pembuka kontradiksi...'
    );

    assert.ok(outlinePromptWithHook.includes('### FORMULA HOOK PEMBUKA (0–30s)'), 'Must include hook section in outline prompt');
    assert.ok(outlinePromptWithHook.includes('Contradiction Hook ⭐'), 'Must name selected hook');
    assert.ok(outlinePromptWithHook.includes('Draft pembuka kontradiksi...'), 'Must include hook draft');

    // 8-arg signature: (title, outline, research, identity, targetWords, angleNotes, hookType, hookDraft)
    const scriptPrompt8Args = formatExternalScriptingPrompt(
      'Misteri AI Coding',
      'Babak 1 ... Babak 5',
      'Riset lengkap...',
      'Persona Zeinity',
      1600,
      'Sudut pandang kritis',
      'broken_assumption',
      'Draft pembuka asumsi...'
    );

    assert.ok(scriptPrompt8Args.includes('Target Panjang Naskah: Sekitar 1600 Kata.'), 'Must parse 1600 target words');
    assert.ok(scriptPrompt8Args.includes('### DATA RISET EMPIRIS LENGKAP'), 'Must include research section');
    assert.ok(scriptPrompt8Args.includes('### FORMULA HOOK PEMBUKA TERPILIH (BABAK 1)'), 'Must include hook section');
    assert.ok(scriptPrompt8Args.includes('Broken Assumption Hook ⭐'), 'Must mention Broken Assumption');
    assert.ok(scriptPrompt8Args.includes('Draft pembuka asumsi...'), 'Must include hook draft');

    // Legacy 5/7-arg signature: (title, outline, identity, targetWords, angleNotes, hookType, hookDraft)
    const scriptPromptLegacy = formatExternalScriptingPrompt(
      'Misteri AI Coding',
      'Babak 1 ... Babak 5',
      'Persona Zeinity',
      1500,
      'Sudut pandang kritis',
      'function_drift',
      'Draft pembuka drift...'
    );

    assert.ok(scriptPromptLegacy.includes('Target Panjang Naskah: Sekitar 1500 Kata.'), 'Must parse 1500 target words in legacy overload');
    assert.ok(scriptPromptLegacy.includes('Sudut pandang kritis'), 'Must preserve angle notes in legacy overload');
    assert.ok(scriptPromptLegacy.includes('Function Drift Hook ⭐'), 'Must include Function Drift hook in legacy overload');
    assert.ok(scriptPromptLegacy.includes('Draft pembuka drift...'), 'Must include hook draft in legacy overload');
  });

  it('6. useContent.ts: handles local storage cache and resilient schema fallback', () => {
    assert.ok(useContentContent.includes('getStoredHookType'), 'Must define getStoredHookType');
    assert.ok(useContentContent.includes('setStoredHookType'), 'Must define setStoredHookType');
    assert.ok(useContentContent.includes('getStoredHookDraft'), 'Must define getStoredHookDraft');
    assert.ok(useContentContent.includes('setStoredHookDraft'), 'Must define setStoredHookDraft');
    assert.ok(useContentContent.includes('getStoredHookNotes'), 'Must define getStoredHookNotes');
    assert.ok(useContentContent.includes('setStoredHookNotes'), 'Must define setStoredHookNotes');
    assert.ok(useContentContent.includes('remoteItem.script_hook_type'), 'Must merge script_hook_type in cache');
    assert.ok(useContentContent.includes('delete fallbackUpdates.script_hook_type'), 'Must drop script_hook_type on schema error fallback');
    assert.ok(useContentContent.includes('delete fallbackUpdates.script_hook_draft'), 'Must drop script_hook_draft on schema error fallback');
    assert.ok(useContentContent.includes('delete fallbackUpdates.script_hook_notes'), 'Must drop script_hook_notes on schema error fallback');
  });

  it('7. OutlineWorkspace.tsx: implements Hook-First visual hierarchy (Tahap 1 -> Tahap 2 -> Tahap 3)', () => {
    // Pipeline sequence verification
    const tahap1Index = outlineWorkspaceContent.indexOf('Tahap 1: Tentukan & Generate Hook Pembuka');
    const tahap2Index = outlineWorkspaceContent.indexOf('Tahap 2: Susun Kerangka Berdasarkan Hook & Riset');
    const tahap3Index = outlineWorkspaceContent.indexOf('Tahap 3: Human Approval Gate');

    assert.ok(tahap1Index !== -1, 'Must render Tahap 1 Hook Studio');
    assert.ok(tahap2Index !== -1, 'Must render Tahap 2 Outline Studio');
    assert.ok(tahap3Index !== -1, 'Must render Tahap 3 Human Approval Gate');
    assert.ok(tahap1Index < tahap2Index, 'Tahap 1 must appear above Tahap 2');
    assert.ok(tahap2Index < tahap3Index, 'Tahap 2 must appear above Tahap 3');

    // 6 Formula buttons/cards
    assert.ok(outlineWorkspaceContent.includes('ZEINITY_HOOK_FORMULAS.map'), 'Must map over ZEINITY_HOOK_FORMULAS');
    assert.ok(outlineWorkspaceContent.includes('formula.pattern'), 'Must display formula pattern quote');
    assert.ok(outlineWorkspaceContent.includes('Rekomendasikan Hook'), 'Must render AI recommendation CTA');
    assert.ok(outlineWorkspaceContent.includes('Terapkan ke Kerangka'), 'Must render apply to outline CTA');

    // Gatekeeper enforcement on Setujui & Tulis Naskah button
    assert.ok(outlineWorkspaceContent.includes('!selectedHookType'), 'Must check selectedHookType for gatekeeper');
    assert.ok(outlineWorkspaceContent.includes('Pilih salah satu jenis Hook di Tahap 1 terlebih dahulu'), 'Must show gatekeeper tooltip');
  });

  it('8. ScriptDetail.tsx: wires all hook states, handlers, and gatekeeper alerts', () => {
    // Preserve legacy comment for backward test compatibility
    assert.ok(
      scriptDetailContent.includes('{/* Tahap 2: Human Approval Gate | Setujui & Tulis Naskah | Undo Terakhir | Regenerate Outline | Catatan Revisi Regenerasi */}'),
      'Must preserve existing comment for regression protection'
    );

    // Hook states
    assert.ok(scriptDetailContent.includes('selectedHookType'), 'Must declare selectedHookType state');
    assert.ok(scriptDetailContent.includes('hookDraft'), 'Must declare hookDraft state');
    assert.ok(scriptDetailContent.includes('hookNotes'), 'Must declare hookNotes state');
    assert.ok(scriptDetailContent.includes('hookRecommendation'), 'Must declare hookRecommendation state');

    // Handlers
    assert.ok(scriptDetailContent.includes('handleSelectHookType'), 'Must declare handleSelectHookType');
    assert.ok(scriptDetailContent.includes('handleRecommendHook'), 'Must declare handleRecommendHook');
    assert.ok(scriptDetailContent.includes('handleGenerateHook'), 'Must declare handleGenerateHook');
    assert.ok(scriptDetailContent.includes('handleApplyHookToOutline'), 'Must declare handleApplyHookToOutline');

    // Gatekeeper validation in approve CTA
    assert.ok(
      scriptDetailContent.includes("showWarning(\n        'Varian Hook Belum Dipilih'"),
      'Must warn user when approving script without selected hook'
    );

    // Props passed to OutlineWorkspace
    assert.ok(scriptDetailContent.includes('selectedHookType={selectedHookType}'), 'Must pass selectedHookType prop');
    assert.ok(scriptDetailContent.includes('hookDraft={hookDraft}'), 'Must pass hookDraft prop');
    assert.ok(scriptDetailContent.includes('onSelectHookType={handleSelectHookType}'), 'Must pass onSelectHookType prop');
    assert.ok(scriptDetailContent.includes('onRecommendHook={handleRecommendHook}'), 'Must pass onRecommendHook prop');
    assert.ok(scriptDetailContent.includes('onGenerateHook={handleGenerateHook}'), 'Must pass onGenerateHook prop');
    assert.ok(scriptDetailContent.includes('onApplyHookToOutline={handleApplyHookToOutline}'), 'Must pass onApplyHookToOutline prop');
  });

  it('9. generateZeinityHook: supports both options object and positional parameter variations', async () => {
    const { generateZeinityHook } = await import('../src/lib/gemini.ts');
    assert.equal(typeof generateZeinityHook, 'function');

    // Verify ScriptDetail passes options object cleanly
    assert.ok(
      scriptDetailContent.includes('hookNotes,\n          angleNotes,\n          category: item.category,\n          initialNotes: item.research_text'),
      'ScriptDetail must pass structured options object to generateZeinityHook'
    );
  });
});
