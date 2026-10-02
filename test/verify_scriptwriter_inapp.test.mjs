import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('In-App AI Scriptwriter & Dual-Track Studio Verification Suite', () => {
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');

  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  const cssPath = path.join(projectRoot, 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('Layer 1: types.ts defines active script_outline and scripting metadata fields', () => {
    assert.ok(typesContent.includes('script_outline?: string | null;'), 'ContentItem must include script_outline');
    assert.ok(typesContent.includes('script_target_duration?: string | null;'), 'ContentItem must include script_target_duration');
    assert.ok(typesContent.includes('script_target_words?: number | null;'), 'ContentItem must include script_target_words');
    assert.ok(typesContent.includes('script_angle_notes?: string | null;'), 'ContentItem must include script_angle_notes');
    assert.ok(typesContent.includes("script_production_track?: 'in_app' | 'external' | null;"), 'ContentItem must include script_production_track');
    assert.ok(typesContent.includes('script_outline_approved?: boolean | null;'), 'ContentItem must include script_outline_approved');
  });

  it('Layer 2: gemini.ts exports all required outline & scriptwriting functions', async () => {
    assert.ok(geminiContent.includes('export async function generateZeinityOutline('), 'Must export generateZeinityOutline');
    assert.ok(geminiContent.includes('export async function generateZeinityFullScript('), 'Must export generateZeinityFullScript');
    assert.ok(geminiContent.includes('export function formatExternalOutlinePrompt('), 'Must export formatExternalOutlinePrompt');
    assert.ok(geminiContent.includes('export function formatExternalScriptingPrompt('), 'Must export formatExternalScriptingPrompt');
    assert.ok(geminiContent.includes('export function calculateTargetWords('), 'Must export calculateTargetWords');

    const geminiModule = await import('../src/lib/gemini.ts');
    assert.equal(typeof geminiModule.generateZeinityOutline, 'function');
    assert.equal(typeof geminiModule.generateZeinityFullScript, 'function');
    assert.equal(typeof geminiModule.formatExternalOutlinePrompt, 'function');
    assert.equal(typeof geminiModule.formatExternalScriptingPrompt, 'function');
    assert.equal(typeof geminiModule.calculateTargetWords, 'function');
  });

  it('Layer 2: calculateTargetWords correctly calculates target words for presets, unicode en-dashes & custom mode', async () => {
    const { calculateTargetWords } = await import('../src/lib/gemini.ts');

    // Presets with standard hyphen
    assert.equal(calculateTargetWords('60s'), 150);
    assert.equal(calculateTargetWords('1-3m'), 350);
    assert.equal(calculateTargetWords('5-8m'), 1200);
    assert.equal(calculateTargetWords('8-12m'), 1600);

    // Presets with Unicode en-dash (–) as commonly used in UI labels & Indonesian typography
    assert.equal(calculateTargetWords('1–3m'), 350);
    assert.equal(calculateTargetWords('5–8m (Default)'), 1200);
    assert.equal(calculateTargetWords('8–12m'), 1600);

    // Custom Mode - Target Words (number & string input)
    assert.equal(calculateTargetWords('custom', 'words', 1650), 1650);
    assert.equal(calculateTargetWords('custom', 'words', '1.400'), 1400); // formatted string with dot
    assert.equal(calculateTargetWords('custom', 'words', '1500'), 1500); // string number
    assert.equal(calculateTargetWords('custom', 'words', 0), 1200); // fallback for 0
    assert.equal(calculateTargetWords('custom', 'words', -10), 1200); // fallback for negative
    assert.equal(calculateTargetWords('custom', 'words', null), 1200); // fallback for null

    // Custom Mode - Minutes (150 wpm rate)
    assert.equal(calculateTargetWords('custom', 'minutes', 5), 750);
    assert.equal(calculateTargetWords('custom', 'minutes', 10), 1500);
    assert.equal(calculateTargetWords('custom', 'minutes', '12'), 1800);
    assert.equal(calculateTargetWords('custom', 'minutes', 0), 1200); // fallback for 0

    // Unknown or default fallback
    assert.equal(calculateTargetWords('unknown'), 1200);
    assert.equal(calculateTargetWords(null), 1200);
  });

  it('Layer 2: formatExternalOutlinePrompt builds a comprehensive prompt containing 5 stages and persona constraints', async () => {
    const { formatExternalOutlinePrompt } = await import('../src/lib/gemini.ts');

    const prompt = formatExternalOutlinePrompt(
      'Mengapa Otak Kita Ketagihan Notifikasi Merah?',
      'Riset menunjukkan notifikasi merah memicu dopamin tidak terduga.',
      'Psikologi & Teknologi',
      'Fokus pada aplikasi media sosial populer',
      'Tekankan sisi loop dopamin yang sulit dihentikan',
      1400,
      '5-8m'
    );

    assert.ok(prompt.includes('Mengapa Otak Kita Ketagihan Notifikasi Merah?'), 'Must include title');
    assert.ok(prompt.includes('Riset menunjukkan notifikasi merah'), 'Must include research data');
    assert.ok(prompt.includes('Psikologi & Teknologi'), 'Must include category');
    assert.ok(prompt.includes('Fokus pada aplikasi media sosial populer'), 'Must include initial notes');
    assert.ok(prompt.includes('Tekankan sisi loop dopamin'), 'Must include custom angle');
    assert.ok(prompt.includes('1400 Kata'), 'Must include target words');
    assert.ok(prompt.includes('HOOK & CLICK VALIDATION'), 'Must include Stage I Hook');
    assert.ok(prompt.includes('OBVIOUS ANSWER VS REALITY'), 'Must include Stage II Obvious Answer');
    assert.ok(prompt.includes('THE HIDDEN MECHANISM & INCENTIVES'), 'Must include Stage III Hidden Mechanism');
    assert.ok(prompt.includes('COMPLICATION & HUMAN IMPACT'), 'Must include Stage IV Complication');
    assert.ok(prompt.includes('SYNTHESIS & BIGGER PICTURE'), 'Must include Stage V Synthesis');
    assert.ok(prompt.includes('5 TAHAP ZEINITY'), 'Must mention 5 Tahap Zeinity');
  });

  it('Layer 2: formatExternalScriptingPrompt builds 0-token instant prompt with approved outline & VO bans', async () => {
    const { formatExternalScriptingPrompt } = await import('../src/lib/gemini.ts');

    const prompt = formatExternalScriptingPrompt(
      'Mengapa Otak Kita Ketagihan Notifikasi Merah?',
      'I. Hook\nII. Obvious Answer\nIII. Mechanism\nIV. Complication\nV. Synthesis',
      'Identitas Zeinity: Analitis, lugas, santai elegan.',
      1500,
      'Fokus pada dopamine loop'
    );

    assert.ok(prompt.includes('Mengapa Otak Kita Ketagihan Notifikasi Merah?'), 'Must include title');
    assert.ok(prompt.includes('KERANGKA NASKAH YANG TELAH DISETUJUI'), 'Must include approved outline header');
    assert.ok(prompt.includes('I. Hook'), 'Must include outline text');
    assert.ok(prompt.includes('1500 Kata'), 'Must include target words count');
    assert.ok(prompt.includes('Fokus pada dopamine loop'), 'Must include angleNotes when provided');
    assert.ok(prompt.includes('em dash (—)'), 'Must enforce em dash prohibition');
    assert.ok(prompt.includes('ATURAN SPOKEN-FIRST & TTS'), 'Must enforce Spoken-First & TTS rules');
  });

  it('Layer 3: ScriptDetail.tsx implements Pre-Flight Configuration bar with mode switcher and custom word inputs', () => {
    assert.ok(
      scriptDetailContent.includes('Konfigurasi Parameter Naskah (Pre-Flight Settings)') ||
      scriptDetailContent.includes('ScriptPreflightBar'),
      'Must render Pre-Flight Configuration bar'
    );
    assert.ok(scriptDetailContent.includes('handleSelectTrack'), 'Must implement handleSelectTrack');
    assert.ok(scriptDetailContent.includes('In-App AI Scriptwriter'), 'Must support In-App AI Scriptwriter track');
    assert.ok(scriptDetailContent.includes('AI Eksternal (ChatGPT / Claude)'), 'Must support External AI track');
    assert.ok(scriptDetailContent.includes('Target Kata (Disarankan)'), 'Must provide Target Kata accessibility option');
    assert.ok(scriptDetailContent.includes('Ketik Durasi Menit'), 'Must provide Ketik Durasi Menit option');
    assert.ok(scriptDetailContent.includes('Angle Tambahan / Fokus Khusus'), 'Must provide extra angle notes input');
  });

  it('Layer 3: ScriptDetail.tsx implements Stretched Dual-Pane with Human Approval Gate & Undo Terakhir', () => {
    assert.ok(
      scriptDetailContent.includes('Pipeline Kerangka (Outline Studio)'),
      'Must render Outline Studio left pane'
    );
    assert.ok(
      scriptDetailContent.includes('Draft Studio (Ruang Kerja Produksi)'),
      'Must render Draft Studio right pane'
    );
    assert.ok(
      !scriptDetailContent.includes('PANEL KIRI: PIPELINE KERANGKA'),
      'Must not leak directional wireframe PANEL KIRI'
    );
    assert.ok(
      !scriptDetailContent.includes('PANEL KANAN: DRAFT STUDIO'),
      'Must not leak directional wireframe PANEL KANAN'
    );
    assert.ok(scriptDetailContent.includes('Tahap 2: Human Approval Gate'), 'Must render Human Approval Gate in Outline Studio');
    assert.ok(scriptDetailContent.includes('Setujui & Tulis Naskah'), 'Must provide Setujui & Tulis Naskah approval CTA');
    assert.ok(scriptDetailContent.includes('Undo Terakhir'), 'Must provide Undo Terakhir button for outline regeneration rollback');
    assert.ok(scriptDetailContent.includes('Regenerate Outline'), 'Must provide Regenerate Outline button');
    assert.ok(scriptDetailContent.includes('Catatan Revisi Regenerasi'), 'Must provide revision note input for outline');
  });

  it('Layer 3: ScriptDetail.tsx implements Overwrite Draft Guard & Track Switch confirmation modals', () => {
    assert.ok(scriptDetailContent.includes('showOverwriteDraftModal'), 'Must manage showOverwriteDraftModal state');
    assert.ok(scriptDetailContent.includes('Peringatan: Draf Naskah Sudah Ada'), 'Must render overwrite draft modal warning');
    assert.ok(scriptDetailContent.includes('showSwitchTrackModal'), 'Must manage showSwitchTrackModal state');
    assert.ok(scriptDetailContent.includes('Ganti Jalur Produksi'), 'Must render track switch confirmation modal');
    assert.ok(scriptDetailContent.includes('Bawa Kerangka ke Jalur Baru'), 'Must offer bringing outline to new track');
    assert.ok(scriptDetailContent.includes('Reset Kerangka dari Awal'), 'Must offer resetting outline');
  });

  it('Layer 3: ScriptDetail.tsx implements Smart Production Checklist downstream toolbar and reminder banner', () => {
    assert.ok(scriptDetailContent.includes('SMART CHECKLIST PEMOLESAN NASKAH'), 'Must render Smart Production Checklist header');
    assert.ok(scriptDetailContent.includes('Pengingat Cerdas Workflow:'), 'Must render Smart Reminder banner');
    assert.ok(
      scriptDetailContent.includes('setIsThumbnailModalOpen(true)') ||
      scriptDetailContent.includes('Tandai Siap Publikasi / Publish ➔'),
      'Must provide forward transition CTA via Thumbnail Studio modal'
    );
  });

  it('Layer 3: CSS styling defines stretched grid, checklist cards, and responsive rules', () => {
    assert.ok(cssContent.includes('.scripting-workspace-stretched'), 'Must define .scripting-workspace-stretched');
    assert.ok(cssContent.includes('.scripting-dual-pane-grid'), 'Must define .scripting-dual-pane-grid');
    assert.ok(cssContent.includes('.checklist-card-interactive'), 'Must define .checklist-card-interactive');
    assert.ok(cssContent.includes('.smart-reminder-banner'), 'Must define .smart-reminder-banner');
  });

  it('Layer 3: ScriptDetail.tsx implements debounced auto-save & ref tracking for outline and angle notes', () => {
    assert.ok(scriptDetailContent.includes('lastSavedOutlineRef'), 'Must track lastSavedOutlineRef to prevent state corruption');
    assert.ok(scriptDetailContent.includes('lastSavedAngleNotesRef'), 'Must track lastSavedAngleNotesRef to prevent state corruption');
    assert.ok(scriptDetailContent.includes('// Debounced auto-save for outlineText'), 'Must implement debounced auto-save for outline');
    assert.ok(scriptDetailContent.includes('// Debounced auto-save for angleNotes'), 'Must implement debounced auto-save for angle notes');
    assert.ok(scriptDetailContent.includes('outlineTextRef.current !== lastSavedOutlineRef.current'), 'Must flush unsaved outline on item switch or unload');
  });

  it('Layer 3: ScriptDetail.tsx flushes all unsaved buffers on handleBack and handleProceedToThumbnailing', () => {
    // Verify handleBack flushes both outline and angle notes
    const handleBackMatch = scriptDetailContent.match(/const handleBack = \(\) => {([\s\S]*?)onBack\(\);/);
    assert.ok(handleBackMatch, 'handleBack function must exist');
    assert.ok(handleBackMatch[1].includes('outlineTextRef.current !== lastSavedOutlineRef.current'), 'handleBack must flush outlineText');
    assert.ok(handleBackMatch[1].includes('angleNotesRef.current !== lastSavedAngleNotesRef.current'), 'handleBack must flush angleNotes');

    // Verify handleProceedToThumbnailing flushes researchOutput
    const proceedMatch = scriptDetailContent.match(/const handleProceedToThumbnailing = async \(\) => {([\s\S]*?)};/);
    assert.ok(proceedMatch, 'handleProceedToThumbnailing function must exist');
    assert.ok(proceedMatch[1].includes('external_research_output: researchOutput'), 'handleProceedToThumbnailing must persist researchOutput');
  });

  it('Layer 1 & Hook: useContent.ts preserves all scripting metadata during Supabase fallback queries', () => {
    const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
    const useContentContent = fs.readFileSync(useContentPath, 'utf8');

    assert.ok(useContentContent.includes('script_target_duration: updates.script_target_duration'), 'Must preserve script_target_duration');
    assert.ok(useContentContent.includes('script_target_words: updates.script_target_words'), 'Must preserve script_target_words');
    assert.ok(useContentContent.includes('script_angle_notes: updates.script_angle_notes'), 'Must preserve script_angle_notes');
    assert.ok(useContentContent.includes('script_production_track: updates.script_production_track'), 'Must preserve script_production_track');
    assert.ok(useContentContent.includes('script_outline_approved: updates.script_outline_approved'), 'Must preserve script_outline_approved');
  });
});
