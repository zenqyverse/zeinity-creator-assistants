import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Prompting Flow Synchronization & Audit Compliance Verification Suite', () => {
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');

  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  it('1. formatExternalScriptingPrompt: 6-parameter signature injects empirical research data', async () => {
    const { formatExternalScriptingPrompt } = await import('../src/lib/gemini.ts');

    const prompt = formatExternalScriptingPrompt(
      'Misteri Algoritma Rekomendasi',
      'I. Hook\nII. Obvious Answer\nIII. Mechanism\nIV. Complication\nV. Synthesis',
      'DATA RISET: 78% pengguna mengalami rabbit hole kognitif.',
      'Identitas Zeinity: Analitis, lugas, santai elegan.',
      1400,
      'Fokus pada arsitektur neural network'
    );

    assert.ok(prompt.includes('Misteri Algoritma Rekomendasi'), 'Must include video title');
    assert.ok(prompt.includes('<data_riset_empiris_lengkap>'), 'Must include empirical research wrapper');
    assert.ok(prompt.includes('78% pengguna mengalami rabbit hole kognitif.'), 'Must inject empirical facts');
    assert.ok(prompt.includes('Identitas Zeinity: Analitis, lugas, santai elegan.'), 'Must include channel identity');
    assert.ok(prompt.includes('1400 Kata'), 'Must specify target words');
    assert.ok(prompt.includes('Fokus pada arsitektur neural network'), 'Must include angle notes');
    assert.ok(prompt.includes('[PERLU VERIFIKASI]'), 'Must enforce evidence safety on unverified claims');
    assert.ok(prompt.includes('em dash (—)'), 'Must forbid em dash in VO');
    assert.ok(prompt.includes('Hal tersebut menunjukkan bahwa...'), 'Must ban academic clichés');
  });

  it('2. formatExternalScriptingPrompt: backwards compatibility for 5-parameter legacy calls (both numeric and null targetWords)', async () => {
    const { formatExternalScriptingPrompt } = await import('../src/lib/gemini.ts');

    // Case A: 5-arg call with numeric targetWords
    const promptNumeric = formatExternalScriptingPrompt(
      'Topik Tradisional',
      'Kerangka Naskah',
      'Persona Khusus Channel',
      1600,
      'Angle A'
    );
    assert.ok(promptNumeric.includes('Persona Khusus Channel'), 'Case A: Must preserve identityText');
    assert.ok(promptNumeric.includes('1600 Kata'), 'Case A: Must respect numeric wordsTarget');
    assert.ok(!promptNumeric.includes('<data_riset_empiris_lengkap>\nPersona Khusus Channel'), 'Case A: Must not confuse identity with research data');

    // Case B: 5-arg call with null targetWords (probed edge case fix)
    const promptNullWords = formatExternalScriptingPrompt(
      'Topik Tradisional B',
      'Kerangka Naskah B',
      'Persona Khusus Channel B',
      null,
      'Angle B'
    );
    assert.ok(promptNullWords.includes('Persona Khusus Channel B'), 'Case B: Must preserve identityText when wordsTarget is null');
    assert.ok(promptNullWords.includes('Angle B'), 'Case B: Must preserve angleNotes when wordsTarget is null');
    assert.ok(!promptNullWords.includes('<data_riset_empiris_lengkap>\nPersona Khusus Channel B'), 'Case B: Must not put identity into research section');
  });

  it('3. formatExternalAuditPrompt: generates ready-to-copy spoken & TTS audit prompt with 4 dimensions and strict format', async () => {
    const { formatExternalAuditPrompt } = await import('../src/lib/gemini.ts');
    assert.equal(typeof formatExternalAuditPrompt, 'function');

    const sampleScript = 'Ini adalah naskah uji coba—yang menggunakan em dash: dan titik dua.';
    const prompt = formatExternalAuditPrompt(sampleScript);

    assert.ok(prompt.includes('<naskah_untuk_diaudit>'), 'Must enclose script in audit wrapper');
    assert.ok(prompt.includes(sampleScript), 'Must include script text');
    assert.ok(prompt.includes('A. Struktur Kalimat'), 'Dimension A: Sentence structure');
    assert.ok(prompt.includes('B. Punctuation & Prosodi TTS'), 'Dimension B: TTS Prosody');
    assert.ok(prompt.includes('C. Naturalitas Lisan & Pantangan AI'), 'Dimension C: Natural Spoken & AI clichés');
    assert.ok(prompt.includes('D. Larangan Voice-Over'), 'Dimension D: VO Bans');
    assert.ok(prompt.includes('**BAGIAN ASLI:**'), 'Strict format: BAGIAN ASLI');
    assert.ok(prompt.includes('**MASALAH:**'), 'Strict format: MASALAH');
    assert.ok(prompt.includes('**REVISI:**'), 'Strict format: REVISI');
    assert.ok(prompt.includes('**ALASAN:**'), 'Strict format: ALASAN');
  });

  it('4. formatExternalFinalRevisionPrompt: generates ready-to-copy script revision prompt for external AI', async () => {
    const { formatExternalFinalRevisionPrompt } = await import('../src/lib/gemini.ts');
    assert.equal(typeof formatExternalFinalRevisionPrompt, 'function');

    const original = 'Draft awal dengan beberapa kelemahan.';
    const findings = '**BAGIAN ASLI:** Draft awal\n**MASALAH:** Kaku\n**REVISI:** Pembuka luwes\n**ALASAN:** Lebih mengalir';
    const notes = 'Pertegas bagian klimaks babak 4.';

    const prompt = formatExternalFinalRevisionPrompt(original, findings, notes);

    assert.ok(prompt.includes('<naskah_asli>'), 'Must enclose original script');
    assert.ok(prompt.includes(original), 'Must include original script content');
    assert.ok(prompt.includes('<hasil_audit>'), 'Must enclose audit findings');
    assert.ok(prompt.includes(findings), 'Must include audit findings content');
    assert.ok(prompt.includes(notes), 'Must include creator revision notes');
    assert.ok(prompt.includes('ATURAN REVISI'), 'Must specify revision rules');
  });

  it('5. formatExternalTitlePrompt: enforces 5 formula hook titles and 5-8 words constraint', async () => {
    const { formatExternalTitlePrompt } = await import('../src/lib/gemini.ts');
    assert.equal(typeof formatExternalTitlePrompt, 'function');

    const prompt = formatExternalTitlePrompt(
      'Kecanduan Algoritma TikTok',
      'AI & Technology Impact',
      'Riset menunjukkan retensi ekstrem pengguna muda.'
    );

    assert.ok(prompt.includes('Formula 1 — Curiosity Gap'), 'Must include Formula 1 Curiosity Gap');
    assert.ok(prompt.includes('Formula 2 — Paradoks & Kontradiksi'), 'Must include Formula 2 Paradox');
    assert.ok(prompt.includes('Formula 3 — Mekanisme Tersembunyi'), 'Must include Formula 3 Mechanism');
    assert.ok(prompt.includes('Formula 4 — SEO Keyword & Otoritas'), 'Must include Formula 4 SEO');
    assert.ok(prompt.includes('Formula 5 — Dampak Manusia'), 'Must include Formula 5 Human Impact');
    assert.ok(prompt.includes('5 sampai 8 kata'), 'Must enforce strict 5-8 words constraint');
  });

  it('6. Dynamic Narrative Engine & Evidence Safety in gemini.ts prompt definitions', () => {
    // Narrative Engine dynamic beats
    assert.ok(geminiContent.includes('HOOK & CLICK VALIDATION'), 'Must include Click Validation beat');
    assert.ok(geminiContent.includes('OBVIOUS ANSWER VS REALITY'), 'Must include Obvious Answer vs Reality beat');
    assert.ok(geminiContent.includes('THE HIDDEN MECHANISM'), 'Must include Hidden Mechanism beat');
    assert.ok(geminiContent.includes('COMPLICATION & HUMAN IMPACT') || geminiContent.includes('COMPLICATION & ESCALATION'), 'Must include Complication beat');
    assert.ok(geminiContent.includes('SYNTHESIS & BIGGER PICTURE'), 'Must include Synthesis beat');

    // 10 Narrative Assets
    assert.ok(geminiContent.includes('10 NARRATIVE ASSETS'), 'Must mandate 10 Narrative Assets');
    assert.ok(geminiContent.includes('Strongest Opening Evidence'), 'Asset: Strongest Opening Evidence');
    assert.ok(geminiContent.includes('Central Contradiction'), 'Asset: Central Contradiction');
    assert.ok(geminiContent.includes('Escalation Evidence'), 'Asset: Escalation Evidence');

    // Strict Evidence Safety
    assert.ok(geminiContent.includes('ATURAN KETAT EVIDENCE SAFETY'), 'Must enforce Evidence Safety section');
    assert.ok(
      geminiContent.includes('[PERLU VERIFIKASI] DILARANG KERAS dijadikan fakta mutlak') ||
      geminiContent.includes('[PERLU VERIFIKASI] DILARANG KERAS disajikan sebagai fakta'),
      'Must forbid presenting [PERLU VERIFIKASI] data as established facts'
    );

    // Negative constraints blacklist
    assert.ok(geminiContent.includes('Hal tersebut menunjukkan bahwa...'), 'Must ban "Hal tersebut menunjukkan bahwa..."');
    assert.ok(geminiContent.includes('Dapat disimpulkan bahwa...'), 'Must ban "Dapat disimpulkan bahwa..."');
    assert.ok(geminiContent.includes('Selanjutnya, mari kita membahas...'), 'Must ban "Selanjutnya, mari kita membahas..."');
    assert.ok(geminiContent.includes('Di era digital yang serba cepat ini'), 'Must ban "Di era digital yang serba cepat ini"');
    assert.ok(geminiContent.includes('Bukan X, melainkan Y'), 'Must ban "Bukan X, melainkan Y"');
  });

  it('7. ScriptDetail.tsx: Research Tab progression button is "Lanjut ke Naskah (Scripting)" without forced upfront AI handoff', () => {
    assert.ok(
      scriptDetailContent.includes('Lanjut ke Naskah (Scripting)'),
      'Primary progression button must be "Lanjut ke Naskah (Scripting)"'
    );
    assert.ok(
      scriptDetailContent.includes('handleProceedToScripting'),
      'Must have handler handleProceedToScripting for progression'
    );
    assert.ok(
      scriptDetailContent.includes('Generate Scriptwriter Handoff'),
      'Handoff generator must remain available on-demand'
    );
  });

  it('8. ScriptDetail.tsx: External Track provides Mode 1-Pintu and Mode 2-Langkah with full research injection', () => {
    assert.ok(
      scriptDetailContent.includes('Mode 1-Pintu (One-Shot Handoff)'),
      'Must offer Mode 1-Pintu'
    );
    assert.ok(
      scriptDetailContent.includes('Mode 2-Langkah (Alur Bertahap)'),
      'Must offer Mode 2-Langkah'
    );
    assert.ok(
      scriptDetailContent.includes('Tahap 1: Salin Prompt Outline'),
      'Must offer Step 1 Copy Outline Prompt'
    );
    assert.ok(
      scriptDetailContent.includes('Tahap 2: Tempel') && scriptDetailContent.includes('Tinjau Kerangka'),
      'Must offer Step 2 Paste & Review Outline'
    );
    assert.ok(
      scriptDetailContent.includes('Tahap 3: Prompt Naskah Instan Siap Salin'),
      'Must offer Step 3 Copy Scripting Prompt'
    );
  });

  it('9. ScriptDetail.tsx: Audit Spoken provides "Salin Prompt Audit" alongside in-app audit', () => {
    assert.ok(
      scriptDetailContent.includes('Salin Prompt Audit'),
      'Must provide Salin Prompt Audit action'
    );
    assert.ok(
      scriptDetailContent.includes('formatExternalAuditPrompt'),
      'Must invoke formatExternalAuditPrompt'
    );
    assert.ok(
      scriptDetailContent.includes('formatExternalFinalRevisionPrompt'),
      'Must invoke formatExternalFinalRevisionPrompt for Tahap 5 revisions'
    );
  });

  it('10. ScriptDetail.tsx: Title recommendations and Thumbnail Packaging Strategy alignment', () => {
    assert.ok(
      scriptDetailContent.includes('Salin Prompt 5 Formula Judul') || scriptDetailContent.includes('Salin Prompt 5 Judul'),
      'Must provide copy prompt button for 5 Title Formulas'
    );
    assert.ok(
      scriptDetailContent.includes('formatExternalTitlePrompt'),
      'Must invoke formatExternalTitlePrompt'
    );
    assert.ok(
      scriptDetailContent.includes('Aturan Thumbnail Zeinity (Bab 13)'),
      'Thumbnail modal must highlight Thumbnail Packaging Strategy rules'
    );
  });
});
