import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Transform A: Scriptwriter Handoff Verification', () => {
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');

  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  it('gemini.ts exports generateScriptwriterHandoff and eliminates generateScriptOutlineAndBrief', () => {
    assert.ok(geminiContent.includes('export async function generateScriptwriterHandoff('), 'Must export generateScriptwriterHandoff');
    assert.ok(!geminiContent.includes('export async function generateScriptOutlineAndBrief('), 'Must remove generateScriptOutlineAndBrief');
  });

  it('generateScriptwriterHandoff embeds 5 Tahap Zeinity and Spoken-First rules', () => {
    assert.ok(geminiContent.includes('Scriptwriter Handoff Document'), 'Must frame as single Scriptwriter Handoff Document');
    assert.ok(geminiContent.includes('8–12 menit') || geminiContent.includes('8-12 menit'), 'Must require 8-12 min duration');
    assert.ok(geminiContent.includes('HOOK & CLICK VALIDATION'), 'Must include Stage 1 Hook');
    assert.ok(geminiContent.includes('OBVIOUS ANSWER VS REALITY'), 'Must include Stage 2 Obvious Answer');
    assert.ok(geminiContent.includes('THE HIDDEN MECHANISM'), 'Must include Stage 3 Mechanism');
    assert.ok(geminiContent.includes('COMPLICATION & ESCALATION'), 'Must include Stage 4 Complication & Escalation');
    assert.ok(geminiContent.includes('SYNTHESIS & BIGGER PICTURE'), 'Must include Stage 5 Synthesis');

    // 5 elements
    assert.ok(geminiContent.includes('Fungsi Bagian:'), 'Must require Fungsi Bagian');
    assert.ok(geminiContent.includes('Isi Utama:'), 'Must require Isi Utama');
    assert.ok(geminiContent.includes('Argumen:'), 'Must require Argumen');
    assert.ok(geminiContent.includes('Bukti / Data:'), 'Must require Bukti / Data');
    assert.ok(geminiContent.includes('Arah Transisi:'), 'Must require Arah Transisi');

    // Spoken-First & prohibitions
    assert.ok(geminiContent.includes('SPOKEN-FIRST + TTS-AWARE + DYNAMIC SENTENCE LENGTH'), 'Must enforce spoken-first TTS standard');
    assert.ok(geminiContent.includes('DILARANG KERAS menggunakan em dash (—) dan tanda titik dua (:)'), 'Must ban em dash and colons in VO');
    assert.ok(geminiContent.includes('Bukan X, melainkan Y'), 'Must ban AI cliché');
    assert.ok(geminiContent.includes('## SCRIPTWRITER HANDOFF —'), 'Must enforce output format starting with Handoff header');
  });

  it('ScriptDetail.tsx renders unified Scriptwriter Handoff with badges and handlers', () => {
    assert.ok(scriptDetailContent.includes('generateScriptwriterHandoff'), 'ScriptDetail must import generateScriptwriterHandoff');
    assert.ok(scriptDetailContent.includes('handleGenerateHandoff'), 'ScriptDetail must define handleGenerateHandoff');
    assert.ok(scriptDetailContent.includes('Scriptwriter Handoff'), 'ScriptDetail must render Scriptwriter Handoff card');
    assert.ok(scriptDetailContent.includes('Outline Dinamis'), 'ScriptDetail must render [Outline Dinamis] badge');
    assert.ok(scriptDetailContent.includes('Spoken-First'), 'ScriptDetail must render [Spoken-First] badge');
    assert.ok(scriptDetailContent.includes('Generate Ulang Handoff'), 'ScriptDetail must render Generate Ulang Handoff button');
    assert.ok(scriptDetailContent.includes('Lanjut: Generate Scriptwriter Handoff'), 'ScriptDetail must render advance button for handoff');

    // Deduplication check: Research Brief header should appear exactly once in Pipeline Naskah
    const researchBriefOccurrences = (scriptDetailContent.match(/<FileText size=\{16\} style=\{\{ color: 'var\(--cyan\)' \}\} \/> Research Brief/g) || []).length;
    assert.equal(researchBriefOccurrences, 1, 'Research Brief card must be rendered exactly once (no duplicates)');
    assert.ok(scriptDetailContent.includes('handoffSummary'), 'ScriptDetail must support handoffSummary badge');
  });
});
