import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 2: Architecture Deconstruction & Per-Beat Generation Verification Suite', () => {
  const componentsDir = path.join(projectRoot, 'src', 'components', 'script');
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  it('1. Sub-komponen modular ScriptDetail terisolasi dalam src/components/script/ dan diekspor via index.ts', () => {
    const requiredFiles = [
      'ScriptPreflightBar.tsx',
      'ResearchWorkspace.tsx',
      'OutlineWorkspace.tsx',
      'ScriptDraftStudio.tsx',
      'ThumbnailTitleStudio.tsx',
      'index.ts',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(componentsDir, file);
      assert.ok(fs.existsSync(filePath), `File ${file} must exist in src/components/script/`);
    }

    const indexContent = fs.readFileSync(path.join(componentsDir, 'index.ts'), 'utf8');
    assert.ok(indexContent.includes("export * from './ScriptPreflightBar';"), 'index.ts exports ScriptPreflightBar');
    assert.ok(indexContent.includes("export * from './ResearchWorkspace';"), 'index.ts exports ResearchWorkspace');
    assert.ok(indexContent.includes("export * from './OutlineWorkspace';"), 'index.ts exports OutlineWorkspace');
    assert.ok(indexContent.includes("export * from './ScriptDraftStudio';"), 'index.ts exports ScriptDraftStudio');
    assert.ok(indexContent.includes("export * from './ThumbnailTitleStudio';"), 'index.ts exports ThumbnailTitleStudio');

    // ScriptDetail.tsx imports from @/components/script
    assert.ok(
      scriptDetailContent.includes("from '@/components/script'"),
      'ScriptDetail.tsx must import sub-components from @/components/script'
    );
    assert.ok(scriptDetailContent.includes('<ScriptPreflightBar'), 'ScriptDetail renders <ScriptPreflightBar');
    assert.ok(scriptDetailContent.includes('<ResearchWorkspace'), 'ScriptDetail renders <ResearchWorkspace');
    assert.ok(scriptDetailContent.includes('<OutlineWorkspace'), 'ScriptDetail renders <OutlineWorkspace');
    assert.ok(scriptDetailContent.includes('<ScriptDraftStudio'), 'ScriptDetail renders <ScriptDraftStudio');
    assert.ok(scriptDetailContent.includes('<ThumbnailTitleStudio'), 'ScriptDetail renders <ThumbnailTitleStudio');
  });

  it('2. SCRIPT_BEATS registry mendefinisikan 5 babak standar Zeinity dengan rasio kumulatif 100%', async () => {
    const { SCRIPT_BEATS, getScriptBeatInfo } = await import('../src/lib/gemini.ts');

    assert.equal(SCRIPT_BEATS.length, 5, 'Must have exactly 5 beats');

    const totalRatio = SCRIPT_BEATS.reduce((acc, beat) => acc + beat.targetRatio, 0);
    assert.ok(Math.abs(totalRatio - 1.0) < 0.001, 'Beat target ratios must sum up to 1.0 (100%)');

    const expectedStages = [
      'HOOK & CLICK VALIDATION',
      'OBVIOUS ANSWER VS REALITY',
      'THE HIDDEN MECHANISM & INCENTIVES',
      'COMPLICATION & HUMAN IMPACT',
      'SYNTHESIS & BIGGER PICTURE',
    ];

    SCRIPT_BEATS.forEach((beat, index) => {
      assert.equal(beat.beatNumber, index + 1);
      assert.equal(beat.stageName, expectedStages[index]);
      assert.ok(beat.shortName.length > 0);
      assert.ok(beat.description.length > 10);
    });

    // Test getScriptBeatInfo helper
    const beat3 = getScriptBeatInfo(3);
    assert.equal(beat3.beatNumber, 3);
    assert.equal(beat3.stageName, 'THE HIDDEN MECHANISM & INCENTIVES');
  });

  it('3. calculateBeatTargetWords menghitung alokasi kata per babak secara proporsional dan memiliki batas minimum', async () => {
    const { calculateBeatTargetWords } = await import('../src/lib/gemini.ts');

    // Total 1000 kata: 15% (150), 20% (200), 30% (300), 20% (200), 15% (150)
    assert.equal(calculateBeatTargetWords(1, 1000), 150);
    assert.equal(calculateBeatTargetWords(2, 1000), 200);
    assert.equal(calculateBeatTargetWords(3, 1000), 300);
    assert.equal(calculateBeatTargetWords(4, 1000), 200);
    assert.equal(calculateBeatTargetWords(5, 1000), 150);

    // Total 1400 kata: 15% (210), 20% (280), 30% (420), 20% (280), 15% (210)
    assert.equal(calculateBeatTargetWords(1, 1400), 210);
    assert.equal(calculateBeatTargetWords(2, 1400), 280);
    assert.equal(calculateBeatTargetWords(3, 1400), 420);
    assert.equal(calculateBeatTargetWords(4, 1400), 280);
    assert.equal(calculateBeatTargetWords(5, 1400), 210);

    // Minimum clamp (80 kata) jika total kata sangat kecil
    assert.equal(calculateBeatTargetWords(1, 100), 80);
  });

  it('4. extractBeatFromScript dan replaceBeatInScript mengisolasi pembacaan dan pembaruan babak naskah secara presisi', async () => {
    const { extractBeatFromScript, replaceBeatInScript } = await import('../src/lib/gemini.ts');

    const sampleScript = `### BABAK 1: HOOK & CLICK VALIDATION
Opening 20 detik langsung membuktikan paradoks algoritma rekomendasi.
Data menunjukkan 70% tontonan berasal dari beranda.

### BABAK 2: OBVIOUS ANSWER VS REALITY
Banyak yang mengira algoritma hanya mengejar clickbait murahan.
Namun kenyataannya, retensi panjang dan satisfaction score jauh lebih menentukan.

### BABAK 3: THE HIDDEN MECHANISM & INCENTIVES
Inilah mekanisme neural candidate generation dan two-tower ranking.
Sistem membedah interaksi implisit penonton.

### BABAK 4: COMPLICATION & HUMAN IMPACT
Dampak psikologis bagi kreator adalah burnout akibat algoritma yang tidak menentu.
Satu perubahan parameter bisa menghancurkan penghasilan bulanan.

### BABAK 5: SYNTHESIS & BIGGER PICTURE
Bukan soal melawan algoritma, melainkan memahami psikologi manusia yang dipetakan oleh mesin.
Pertanyaan besarnya: apakah kita yang menonton, atau kita yang dikendalikan?`;

    // 1. Ekstraksi Babak
    const beat1 = extractBeatFromScript(sampleScript, 1);
    assert.ok(beat1);
    assert.ok(beat1.includes('BABAK 1'));
    assert.ok(beat1.includes('Opening 20 detik'));
    assert.ok(!beat1.includes('BABAK 2'));

    const beat3 = extractBeatFromScript(sampleScript, 3);
    assert.ok(beat3);
    assert.ok(beat3.includes('BABAK 3'));
    assert.ok(beat3.includes('neural candidate generation'));
    assert.ok(!beat3.includes('BABAK 4'));

    const beat5 = extractBeatFromScript(sampleScript, 5);
    assert.ok(beat5);
    assert.ok(beat5.includes('BABAK 5'));
    assert.ok(beat5.includes('apakah kita yang menonton'));

    // 2. Penggantian Babak di Tengah (Babak 3)
    const newBeat3 = `### BABAK 3: THE HIDDEN MECHANISM & INCENTIVES
REVISI BARU: Mekanisme eksplorasi multi-armed bandit dan reinforcement learning.`;
    const updatedScript = replaceBeatInScript(sampleScript, 3, newBeat3);

    assert.ok(updatedScript.includes(newBeat3), 'New beat 3 content must be inserted');
    assert.ok(!updatedScript.includes('neural candidate generation'), 'Old beat 3 content must be removed');
    assert.ok(updatedScript.includes('### BABAK 1: HOOK'), 'Babak 1 must remain intact');
    assert.ok(updatedScript.includes('### BABAK 2: OBVIOUS'), 'Babak 2 must remain intact');
    assert.ok(updatedScript.includes('### BABAK 4: COMPLICATION'), 'Babak 4 must remain intact');
    assert.ok(updatedScript.includes('### BABAK 5: SYNTHESIS'), 'Babak 5 must remain intact');

    // 3. Penggantian Babak Pertama (Babak 1)
    const newBeat1 = `### BABAK 1: HOOK & CLICK VALIDATION\nHook baru yang sangat kuat.`;
    const updatedBeat1Script = replaceBeatInScript(sampleScript, 1, newBeat1);
    assert.ok(updatedBeat1Script.startsWith('### BABAK 1: HOOK & CLICK VALIDATION\nHook baru yang sangat kuat.'));
    assert.ok(updatedBeat1Script.includes('### BABAK 2: OBVIOUS ANSWER'));

    // 4. Penggantian Babak Terakhir (Babak 5)
    const newBeat5 = `### BABAK 5: SYNTHESIS & BIGGER PICTURE\nClosing baru yang elegan.`;
    const updatedBeat5Script = replaceBeatInScript(sampleScript, 5, newBeat5);
    assert.ok(updatedBeat5Script.endsWith('Closing baru yang elegan.'));
    assert.ok(updatedBeat5Script.includes('### BABAK 4: COMPLICATION'));

    // 5. Naskah kosong atau babak belum ada
    assert.equal(replaceBeatInScript('', 1, newBeat1), newBeat1);
    const appended = replaceBeatInScript('Teks naskah pengantar.', 2, newBeat3);
    assert.ok(appended.includes('Teks naskah pengantar.'));
    assert.ok(appended.includes(newBeat3));

    // 6. Dukungan Heading Markdown Tebal (**Babak 1: Hook**) dan Teks Polos (Babak 1: Hook)
    const boldScript = `**Babak 1: Hook**\nPembuka tebal.\n\n**Babak 2: Curiosity**\nCuriosity tebal.\n\nBabak 3: Core Mechanism\nMekanisme polos.`;
    const extractedBold1 = extractBeatFromScript(boldScript, 1);
    assert.ok(extractedBold1 && extractedBold1.includes('Pembuka tebal'));
    const extractedPlain3 = extractBeatFromScript(boldScript, 3);
    assert.ok(extractedPlain3 && extractedPlain3.includes('Mekanisme polos'));

    // 7. Penyisipan Kronologis: Babak yang hilang di tengah disisipkan sebelum babak berikutnya
    const missingMiddleScript = `### BABAK 1: HOOK\nPembuka.\n\n### BABAK 3: MECHANISM\nMekanisme.`;
    const insertedBeat2 = `### BABAK 2: CURIOSITY\nRasa ingin tahu baru.`;
    const chronologicalResult = replaceBeatInScript(missingMiddleScript, 2, insertedBeat2);
    const pos1 = chronologicalResult.indexOf('BABAK 1: HOOK');
    const pos2 = chronologicalResult.indexOf('BABAK 2: CURIOSITY');
    const pos3 = chronologicalResult.indexOf('BABAK 3: MECHANISM');
    assert.ok(pos1 < pos2 && pos2 < pos3, 'Missing beat 2 must be inserted chronologically between beat 1 and beat 3');
  });

  it('5. formatExternalBeatPrompt dan generateZeinityBeatScript memuat Spoken-First rules & Negative Constraints', async () => {
    const { formatExternalBeatPrompt } = await import('../src/lib/gemini.ts');

    const prompt = formatExternalBeatPrompt(
      3,
      'Misteri AI Generatif',
      'I. Hook\nII. Obvious\nIII. Mechanism\nIV. Complication\nV. Synthesis',
      'RISET: Arsitektur Transformer menggunakan self-attention.',
      'Identitas: Lugas, santai elegan.',
      1400,
      'Fokus pada cost komputasi per token',
      'Tolong perdalam analogi perpustakaan'
    );

    assert.ok(prompt.includes('BABAK 3'), 'Includes beat 3 mention');
    assert.ok(prompt.includes('THE HIDDEN MECHANISM & INCENTIVES'), 'Includes stage name');
    assert.ok(prompt.includes('420 Kata'), 'Calculates 30% of 1400 = 420 words');
    assert.ok(prompt.includes('Misteri AI Generatif'), 'Includes topic title');
    assert.ok(prompt.includes('Arsitektur Transformer menggunakan self-attention.'), 'Includes research data');
    assert.ok(prompt.includes('Fokus pada cost komputasi per token'), 'Includes angle notes');
    assert.ok(prompt.includes('Tolong perdalam analogi perpustakaan'), 'Includes revision notes');
    assert.ok(prompt.includes('em dash (—)'), 'Enforces em dash ban');
    assert.ok(prompt.includes('tanda titik dua (:)'), 'Enforces colon ban');

    // Check function existence in gemini.ts
    assert.ok(
      geminiContent.includes('export async function generateZeinityBeatScript('),
      'gemini.ts must export generateZeinityBeatScript'
    );
  });

  it('6. ScriptDetail dan ScriptDraftStudio mengintegrasikan kontrol Per-Beat Generation & Snapshot History', () => {
    // ScriptDraftStudio contains per-beat navigation / generator UI
    const draftStudioPath = path.join(componentsDir, 'ScriptDraftStudio.tsx');
    const draftStudioContent = fs.readFileSync(draftStudioPath, 'utf8');

    assert.ok(
      draftStudioContent.includes('generatingBeatNumber'),
      'ScriptDraftStudio must accept and indicate generatingBeatNumber'
    );
    assert.ok(
      draftStudioContent.includes('onGenerateBeat'),
      'ScriptDraftStudio must provide onGenerateBeat callback'
    );
    assert.ok(
      draftStudioContent.includes('Regenerate Babak') ||
      draftStudioContent.includes('Tulis/Perbarui Babak'),
      'ScriptDraftStudio provides per-beat generation action button'
    );

    // ScriptDetail implements handleGenerateBeat with auto-snapshot protection
    assert.ok(
      scriptDetailContent.includes('handleGenerateBeat = async (beatNumber: ScriptBeatNumber'),
      'ScriptDetail must implement handleGenerateBeat'
    );
    assert.ok(
      scriptDetailContent.includes('saveDraftSnapshot(item.id, scriptOutput, snapLabel)'),
      'ScriptDetail must snapshot draft before rewriting a beat'
    );
    assert.ok(
      scriptDetailContent.includes('replaceBeatInScript('),
      'ScriptDetail must call replaceBeatInScript to update draft with newly generated beat'
    );
  });
});
