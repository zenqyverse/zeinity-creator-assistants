import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('6 Prompt Features Alignment with implementation_plan_Gambaran_Output_Prompt.md', () => {
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');

  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const useContentContent = fs.readFileSync(useContentPath, 'utf8');

  it('Fitur 1: Research Brief Prompt contains 10 Narrative Assets & verification boundaries', () => {
    assert.ok(geminiContent.includes('generateResearchBriefPrompt'), 'Must export generateResearchBriefPrompt');
    assert.ok(geminiContent.includes('10 Narrative Assets') || geminiContent.includes('10 NARRATIVE ASSETS'), 'Must require 10 Narrative Assets');
    assert.ok(geminiContent.includes('Strongest Opening Evidence'), 'Asset 1: Strongest Opening Evidence');
    assert.ok(geminiContent.includes('Central Contradiction'), 'Asset 2: Central Contradiction');
    assert.ok(geminiContent.includes('Obvious Answer'), 'Asset 3: Obvious Answer');
    assert.ok(geminiContent.includes('Mechanism'), 'Asset 4: Mechanism');
    assert.ok(geminiContent.includes('Escalation Evidence'), 'Asset 5: Escalation Evidence');
    assert.ok(geminiContent.includes('Hidden Incentive') || geminiContent.includes('Hidden Cost'), 'Asset 6: Hidden Incentive');
    assert.ok(geminiContent.includes('Best Counterargument'), 'Asset 7: Best Counterargument');
    assert.ok(geminiContent.includes('Analogy Candidate'), 'Asset 8: Analogy Candidate');
    assert.ok(geminiContent.includes('Bigger Picture'), 'Asset 9: Bigger Picture');
    assert.ok(geminiContent.includes('Unresolved Question'), 'Asset 10: Unresolved Question');
    assert.ok(geminiContent.includes('[PERLU VERIFIKASI]'), 'Must enforce [PERLU VERIFIKASI] for unconfirmed data');
    assert.ok(geminiContent.includes('FACT') && geminiContent.includes('COMMUNITY SIGNAL') && geminiContent.includes('INFERENCE'), 'Must enforce 4-tier data categorization');
  });

  it('Fitur 2: Script Outline Prompt enforces 8-12 min duration, 5 sections with Obvious Answer & Escalation, and 5 elements per section', () => {
    assert.ok(geminiContent.includes('8–12 menit'), 'Must specify 8–12 menit duration');
    assert.ok(geminiContent.includes('HOOK & CLICK VALIDATION (0–30 Detik)'), 'Must include Stage 1 Hook');
    assert.ok(geminiContent.includes('OBVIOUS ANSWER VS REALITY'), 'Must include Stage 2 Obvious Answer');
    assert.ok(geminiContent.includes('THE HIDDEN MECHANISM'), 'Must include Stage 3 Mechanism');
    assert.ok(geminiContent.includes('COMPLICATION & ESCALATION'), 'Must include Stage 4 Complication & Escalation');
    assert.ok(geminiContent.includes('SYNTHESIS & BIGGER PICTURE'), 'Must include Stage 5 Synthesis');
    assert.ok(geminiContent.includes('Phenomenon -> Mechanism -> Incentive -> Human Impact -> Counter View'), 'Must preserve framework sequence');

    // 5 elements per section
    assert.ok(geminiContent.includes('Fungsi Bagian:'), 'Must specify Fungsi Bagian');
    assert.ok(geminiContent.includes('Isi Utama:'), 'Must specify Isi Utama');
    assert.ok(geminiContent.includes('Argumen:'), 'Must specify Argumen');
    assert.ok(geminiContent.includes('Bukti / Data:'), 'Must specify Bukti / Data');
    assert.ok(geminiContent.includes('Arah Transisi:'), 'Must specify Arah Transisi');
  });

  it('Fitur 3: Scriptwriter Brief Prompt enforces 14 spoken-first & TTS rules, bans em dash/colons in VO, and bans AI clichés', () => {
    assert.ok(geminiContent.includes('SPOKEN-FIRST + TTS-AWARE + DYNAMIC SENTENCE LENGTH'), 'Must enforce Spoken-First principle');
    assert.ok(geminiContent.includes('DILARANG KERAS menggunakan em dash (—) dan tanda titik dua (:) dalam narasi voice-over'), 'Must ban em dash and colons in VO');
    assert.ok(geminiContent.includes('Bukan X, melainkan Y'), 'Must ban AI cliché "Bukan X, melainkan Y"');
    assert.ok(geminiContent.includes('Ini bukan soal X tapi Y'), 'Must ban AI cliché "Ini bukan soal X tapi Y"');
    assert.ok(geminiContent.includes('dan BOOM'), 'Must ban "dan BOOM"');
    assert.ok(geminiContent.includes('eh bentar deh'), 'Must ban "eh bentar deh"');
  });

  it('Fitur 4: Spoken & TTS Audit implements 4 dimensions and BAGIAN ASLI -> MASALAH -> REVISI -> ALASAN format', () => {
    assert.ok(geminiContent.includes('runSpokenAudit'), 'Must export runSpokenAudit');
    assert.ok(geminiContent.includes('BAGIAN ASLI:'), 'Must require BAGIAN ASLI:');
    assert.ok(geminiContent.includes('MASALAH:'), 'Must require MASALAH:');
    assert.ok(geminiContent.includes('REVISI:'), 'Must require REVISI:');
    assert.ok(geminiContent.includes('ALASAN:'), 'Must require ALASAN:');
  });

  it('Fitur 5: Visual Cue Annotation permanently removed as standalone AI action per user request', () => {
    assert.ok(!geminiContent.includes('export async function runVisualCueAnnotation('), 'gemini.ts must not export runVisualCueAnnotation');
    assert.ok(!scriptDetailContent.includes('handleRunVisualCueAnnotation'), 'ScriptDetail must not define handleRunVisualCueAnnotation');
    assert.ok(!scriptDetailContent.includes('Anotasi Visual Cue ✨'), 'ScriptDetail must not render visual cue action button');
  });

  it('Fitur 6: Thumbnail Copy Prompt implements 3 CTR options, stakes vs question, and 2-4 words uppercase', () => {
    assert.ok(geminiContent.includes('generateThumbnailPrompt'), 'Must export generateThumbnailPrompt');
    assert.ok(geminiContent.includes('3 opsi'), 'Must require 3 options');
    assert.ok(geminiContent.includes('Maksimal 2 sampai 4 kata') || geminiContent.includes('2 sampai 4 kata'), 'Must constrain 2-4 words');
    assert.ok(geminiContent.includes('huruf kapital') || geminiContent.includes('UPPERCASE'), 'Must require uppercase');
    assert.ok(geminiContent.includes('stakes'), 'Must focus on stakes and consequences');
  });

  it('UI & Data Integration: ScriptDetail.tsx and useContent.ts handle Thumbnail Studio and 5 Titles', () => {
    assert.ok(
      scriptDetailContent.includes('Studio Pembuatan Thumbnail') ||
      scriptDetailContent.includes('Studio Thumbnail') ||
      scriptDetailContent.includes('Studio Generate Thumbnail'),
      'ScriptDetail must render Studio Thumbnail / Studio Pembuatan Thumbnail'
    );
    assert.ok(scriptDetailContent.includes('Generate Rekomendasi Judul ✨'), 'ScriptDetail must render Generate Rekomendasi Judul ✨');
    assert.ok(scriptDetailContent.includes('handleGenerateTitles'), 'ScriptDetail must define handleGenerateTitles');

    // Types & LocalStorage
    assert.ok(typesContent.includes('generated_titles'), 'types.ts must include generated_titles');
    assert.ok(useContentContent.includes('TITLES_STORAGE_PREFIX'), 'useContent.ts must have localStorage prefix for generated titles');
  });
});
