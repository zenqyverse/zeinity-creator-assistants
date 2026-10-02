import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Verification Suite: Finishing & Packaging Studio Consolidation', () => {
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  const scriptDraftStudioPath = path.join(projectRoot, 'src', 'components', 'script', 'ScriptDraftStudio.tsx');
  const scriptDraftStudioContent = fs.readFileSync(scriptDraftStudioPath, 'utf8');

  const cssPath = path.join(projectRoot, 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('1. Top Workflow Tabs Consolidation in ScriptDetail.tsx: 2 Workspace Tabs (Studio Naskah & Finishing & Packaging)', () => {
    // Top tab strip must contain tab 1 and tab 2, and NOT tab 3 button
    assert.ok(
      scriptDetailContent.includes('✍️ 1. Studio Naskah'),
      'ScriptDetail tab strip must include Tab 1: Studio Naskah'
    );
    assert.ok(
      scriptDetailContent.includes('📦 2. Finishing & Packaging'),
      'ScriptDetail tab strip must include Tab 2: Finishing & Packaging'
    );

    // Old Tab 3 button in strip should be gone
    const tabStripMatch = scriptDetailContent.match(/<div className="scripting-workflow-tabs-strip">([\s\S]*?)<\/div>/);
    assert.ok(tabStripMatch, 'Must find scripting-workflow-tabs-strip in ScriptDetail.tsx');
    const tabStripContent = tabStripMatch[1];
    assert.ok(
      !tabStripContent.includes('🎨 3. Thumbnail'),
      'Tab strip must not contain obsolete Tab 3 button'
    );
    assert.ok(
      !tabStripContent.includes('🏷️ 2. Judul & Audit'),
      'Tab strip must not use obsolete label "2. Judul & Audit"'
    );
    assert.ok(
      !scriptDetailContent.includes('📦 2. FINISHING & PACKAGING'),
      'ScriptDetail tab strip must not contain all-caps "📦 2. FINISHING & PACKAGING"'
    );
  });

  it('2. ScriptDraftStudio.tsx exports parseAuditFindings and correctly parses diff blocks & edge cases', () => {
    assert.ok(
      scriptDraftStudioContent.includes('export function parseAuditFindings('),
      'ScriptDraftStudio must export parseAuditFindings function'
    );

    // Extract parseAuditFindings implementation from ScriptDraftStudio.tsx and execute in Node
    const fnMatch = scriptDraftStudioContent.match(/export function parseAuditFindings\([\s\S]*?\n\}/);
    assert.ok(fnMatch, 'Must find parseAuditFindings function body');
    const jsCode = fnMatch[0]
      .replace('export function parseAuditFindings(findingsText: string): DiffItem[]', 'function parseAuditFindings(findingsText)')
      .replace(': RegExpExecArray | null', '')
      .replace(': DiffItem[] = []', '= []')
      .replace('(s: string)', '(s)')
      .replace(': string | undefined', '')
      .replace(/: DiffItem\[\]/g, '')
      .replace(/: string/g, '');
    const fn = new Function(`${jsCode}; return parseAuditFindings;`)();

    const sampleAuditText = `
**BAGIAN ASLI:**
Di era digital yang serba cepat ini, kita sering melihat bahwa algoritma mengontrol perilaku kita.

**MASALAH:**
AI trope klise ("Di era digital yang serba cepat ini") dan bahasa kaku ensiklopedia ("kita sering melihat bahwa").

**REVISI:**
Sekarang algoritma diam-diam membentuk rutinitas harian kita tanpa kita sadari.

**ALASAN:**
Lebih langsung, personal, dan luwes untuk pembacaan narasi TTS.

**BAGIAN ASLI:**
Hal tersebut menunjukkan bahwa sistem telah rusak.

**MASALAH:**
Transisi formal artikel ("Hal tersebut menunjukkan bahwa").

**REVISI:**
Artinya, sistem ini memang dari awal dirancang untuk gagal.

**ALASAN:**
Lebih bertenaga dan conversational.
    `.trim();

    const results = fn(sampleAuditText);
    assert.equal(results.length, 2, 'Should match 2 findings blocks');
    assert.equal(results[0].id, 1);
    assert.ok(results[0].original.startsWith('Di era digital'));
    assert.ok(!results[0].original.startsWith('**'), 'Original must not leak leading markdown asterisks');
    assert.ok(!results[0].problem.startsWith('**'), 'Problem must not leak leading markdown asterisks');
    assert.ok(!results[0].revision.startsWith('**'), 'Revision must not leak leading markdown asterisks');
    assert.ok(!results[0].reason.startsWith('**'), 'Reason must not leak leading markdown asterisks');
    assert.ok(results[0].original.includes('Di era digital'));
    assert.ok(results[0].problem.includes('AI trope klise'));
    assert.ok(results[0].revision.includes('Sekarang algoritma'));
    assert.ok(results[0].reason.includes('Lebih langsung'));

    // Also test colon outside asterisks and quoted text cleanup
    const sample2 = `
**BAGIAN ASLI**:
"Kalimat asli dengan kutipan"

**MASALAH**:
Masalah lisan

**REVISI**:
"Kalimat revisi luwes"

**ALASAN**:
Alasan logis
    `.trim();
    const results2 = fn(sample2);
    assert.equal(results2.length, 1);
    assert.equal(results2[0].original, 'Kalimat asli dengan kutipan');
    assert.equal(results2[0].revision, 'Kalimat revisi luwes');
  });

  it('3. 2-Panel Master-Detail Architecture in Finishing & Packaging: Left Panel Stepper & Right Panel Canvas', () => {
    // 2-Panel Layout CSS and JSX
    assert.ok(
      scriptDraftStudioContent.includes('className="finishing-packaging-layout"'),
      'ScriptDraftStudio must render finishing-packaging-layout'
    );
    assert.ok(
      scriptDraftStudioContent.includes('className="finishing-stepper-panel"'),
      'ScriptDraftStudio must render finishing-stepper-panel'
    );
    assert.ok(
      scriptDraftStudioContent.includes('className="finishing-substudio-canvas"'),
      'ScriptDraftStudio must render finishing-substudio-canvas'
    );

    // Left Panel Progress Bar
    assert.ok(
      scriptDraftStudioContent.includes('Progres Packaging:'),
      'Left panel must render Progres Packaging indicator'
    );
    assert.ok(
      scriptDraftStudioContent.includes('dari 3 Selesai'),
      'Left panel must render "X dari 3 Selesai" progress'
    );

    // Header casing in ScriptDraftStudio
    assert.ok(
      scriptDraftStudioContent.includes('<span>Finishing &amp; Packaging</span>') ||
      scriptDraftStudioContent.includes('<span>Finishing & Packaging</span>'),
      'Stepper header in ScriptDraftStudio must use Title Case Finishing & Packaging'
    );
    assert.ok(
      !scriptDraftStudioContent.includes('<span>FINISHING &amp; PACKAGING</span>') &&
      !scriptDraftStudioContent.includes('<span>FINISHING & PACKAGING</span>'),
      'Stepper header must not use all-caps FINISHING & PACKAGING'
    );

    // Fokus Menulis info box casing in ScriptDraftStudio
    assert.ok(
      scriptDraftStudioContent.includes('"2. Finishing &amp; Packaging"') ||
      scriptDraftStudioContent.includes('"2. Finishing & Packaging"'),
      'Fokus Menulis banner must reference "2. Finishing & Packaging" in Title Case'
    );
    assert.ok(
      !scriptDraftStudioContent.includes('"2. FINISHING &amp; PACKAGING"') &&
      !scriptDraftStudioContent.includes('"2. FINISHING & PACKAGING"'),
      'Fokus Menulis banner must not contain all-caps "2. FINISHING & PACKAGING"'
    );

    // 3 Large Stepper Cards (Clean titles without redundant number prefixes)
    assert.ok(
      scriptDraftStudioContent.includes('Audit Spoken &amp; TTS') ||
      scriptDraftStudioContent.includes('Audit Spoken & TTS'),
      'Left panel must render Card 1 for Audit Spoken & TTS'
    );
    assert.ok(
      scriptDraftStudioContent.includes('5 Formula Judul'),
      'Left panel must render Card 2 for 5 Formula Judul'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Studio Thumbnail'),
      'Left panel must render Card 3 for Studio Thumbnail'
    );
    assert.ok(
      !scriptDraftStudioContent.includes('1. Audit Spoken'),
      'Left panel must not contain redundant prefix "1. Audit Spoken"'
    );
    assert.ok(
      !scriptDraftStudioContent.includes('2. 5 Formula Judul'),
      'Left panel must not contain redundant prefix "2. 5 Formula Judul"'
    );
    assert.ok(
      !scriptDraftStudioContent.includes('3. Studio Thumbnail'),
      'Left panel must not contain redundant prefix "3. Studio Thumbnail"'
    );

    // Accessibility attributes on Stepper Cards
    assert.ok(
      scriptDraftStudioContent.includes('aria-label="Langkah 1: Audit Spoken & TTS"'),
      'Card 1 must include accessible aria-label'
    );
    assert.ok(
      scriptDraftStudioContent.includes('aria-label="Langkah 2: 5 Formula Judul"'),
      'Card 2 must include accessible aria-label'
    );
    assert.ok(
      scriptDraftStudioContent.includes('aria-label="Langkah 3: Studio Thumbnail"'),
      'Card 3 must include accessible aria-label'
    );
    assert.ok(
      scriptDraftStudioContent.includes('aria-current={activeFinishingStep === 1 ? \'step\' : undefined}'),
      'Stepper cards must declare aria-current step indicator'
    );

    // SVG Mockup Asset consistency
    const svgPath = path.join(projectRoot, 'finishing_packaging_mockup.svg');
    if (fs.existsSync(svgPath)) {
      const svgContent = fs.readFileSync(svgPath, 'utf8');
      assert.ok(
        !svgContent.includes('2. 5 Formula Judul'),
        'SVG mockup must not have redundant prefix "2. 5 Formula Judul"'
      );
      assert.ok(
        !svgContent.includes('1. Audit Spoken &amp; TTS'),
        'SVG mockup must not have redundant prefix "1. Audit Spoken & TTS"'
      );
      assert.ok(
        !svgContent.includes('3. Studio Thumbnail'),
        'SVG mockup must not have redundant prefix "3. Studio Thumbnail"'
      );
      assert.ok(
        svgContent.includes('📦 2. Finishing &amp; Packaging') || svgContent.includes('📦 2. Finishing & Packaging'),
        'SVG mockup must use Title Case for Tab 2'
      );
    }

    // Return to Studio Naskah Button
    assert.ok(
      scriptDraftStudioContent.includes('Kembali ke Studio Naskah'),
      'Left panel must include button to return to Studio Naskah'
    );
  });

  it('4. Elimination of Redundant SMART CHECKLIST PEMOLESAN NASKAH at bottom of ScriptDraftStudio', () => {
    assert.ok(
      !scriptDraftStudioContent.includes('className="smart-checklist-toolbar"'),
      'ScriptDraftStudio must completely eliminate the redundant smart-checklist-toolbar'
    );
    assert.ok(
      !scriptDraftStudioContent.includes('🛠️ SMART CHECKLIST PEMOLESAN NASKAH'),
      'ScriptDraftStudio must not render redundant checklist header'
    );
  });

  it('5. Sub-Studio 1: Audit Spoken & TTS with Interactive Diff Cards and Navigation', () => {
    assert.ok(
      scriptDraftStudioContent.includes('interactive-diff-card'),
      'Sub-Studio 1 must render interactive-diff-card'
    );
    assert.ok(
      scriptDraftStudioContent.includes('BAGIAN ASLI'),
      'Diff cards must display BAGIAN ASLI'
    );
    assert.ok(
      scriptDraftStudioContent.includes('REVISI SPOKEN / TTS'),
      'Diff cards must display REVISI SPOKEN / TTS'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Terapkan Revisi ke Draf Naskah'),
      'Sub-Studio 1 must provide "Terapkan Revisi ke Draf Naskah" button'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Lanjut ke 5 Formula Judul ➔'),
      'Sub-Studio 1 must provide navigation button to Step 2'
    );
  });

  it('6. Sub-Studio 2: 5 Formula Judul with Active Highlight and Navigation', () => {
    assert.ok(
      scriptDraftStudioContent.includes('title-recommendations-grid'),
      'Sub-Studio 2 must render title-recommendations-grid'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Judul Utama Aktif ✓'),
      'Sub-Studio 2 must highlight active title with "Judul Utama Aktif ✓" badge'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Gunakan sbg Judul'),
      'Sub-Studio 2 must provide "Gunakan sbg Judul" button'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Lanjut ke Studio Thumbnail ➔'),
      'Sub-Studio 2 must provide navigation button to Step 3'
    );
  });

  it('7. Sub-Studio 3: Inline Studio Thumbnail with Split 2-Column, Safe Zone 80%, Presets, and Direct Publish', () => {
    // Preset chips
    assert.ok(
      scriptDraftStudioContent.includes('ILUSI DIBONGKAR'),
      'Sub-Studio 3 must include preset ILUSI DIBONGKAR'
    );
    assert.ok(
      scriptDraftStudioContent.includes('FAKTA TERSEMBUNYI'),
      'Sub-Studio 3 must include preset FAKTA TERSEMBUNYI'
    );
    assert.ok(
      scriptDraftStudioContent.includes('JEBAKAN SISTEM'),
      'Sub-Studio 3 must include preset JEBAKAN SISTEM'
    );
    assert.ok(
      scriptDraftStudioContent.includes('AKHIRNYA TERUNGKAP'),
      'Sub-Studio 3 must include preset AKHIRNYA TERUNGKAP'
    );

    // Aspect ratio & safe zone
    assert.ok(
      scriptDraftStudioContent.includes('SAFE ZONE 80%'),
      'Sub-Studio 3 mockup canvas must render SAFE ZONE 80% guide'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Unduh Mockup SVG (Vektor HD)'),
      'Sub-Studio 3 must provide "Unduh Mockup SVG (Vektor HD)" button'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Standar Mutu Thumbnail Zeinity (Bab 13)'),
      'Sub-Studio 3 must render Bab 13 checklist'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Tandai Siap Publikasi / Publish ➔'),
      'Sub-Studio 3 footer hero bar must provide "Tandai Siap Publikasi / Publish ➔" button'
    );
  });

  it('8. CSS Stylesheet defines finishing-packaging layout, stepper cards, and interactive diff cards', () => {
    assert.ok(
      cssContent.includes('.finishing-packaging-layout'),
      'index.css must define .finishing-packaging-layout'
    );
    assert.ok(
      cssContent.includes('.finishing-stepper-panel'),
      'index.css must define .finishing-stepper-panel'
    );
    assert.ok(
      cssContent.includes('.finishing-stepper-card'),
      'index.css must define .finishing-stepper-card'
    );
    assert.ok(
      cssContent.includes('.interactive-diff-card'),
      'index.css must define .interactive-diff-card'
    );
    assert.ok(
      cssContent.includes('.formula-card.active-title'),
      'index.css must define .formula-card.active-title'
    );
  });
});
