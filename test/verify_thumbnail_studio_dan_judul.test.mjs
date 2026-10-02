import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Verification Suite: Reorganisasi Fitur, Penghapusan Visual Cue, 5 Rekomendasi Judul & Studio Thumbnail Dual-Mode', () => {
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');

  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const useContentContent = fs.readFileSync(useContentPath, 'utf8');

  const cssPath = path.join(projectRoot, 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('1. Fitur Anotasi Visual Cue sepenuhnya dihapus dari gemini.ts dan ScriptDetail UI', () => {
    // gemini.ts should not export runVisualCueAnnotation
    assert.ok(
      !geminiContent.includes('export async function runVisualCueAnnotation('),
      'gemini.ts must not export runVisualCueAnnotation'
    );

    // ScriptDetail.tsx should not import or declare visual cue states/handlers
    assert.ok(
      !scriptDetailContent.includes('generatingVisualCue'),
      'ScriptDetail must not have generatingVisualCue state'
    );
    assert.ok(
      !scriptDetailContent.includes('annotatedScript'),
      'ScriptDetail must not have annotatedScript state'
    );
    assert.ok(
      !scriptDetailContent.includes('showVisualCueResults'),
      'ScriptDetail must not have showVisualCueResults state'
    );
    assert.ok(
      !scriptDetailContent.includes('handleRunVisualCueAnnotation'),
      'ScriptDetail must not have handleRunVisualCueAnnotation'
    );
    assert.ok(
      !scriptDetailContent.includes('Anotasi Visual Cue ✨'),
      'ScriptDetail must not render "Anotasi Visual Cue ✨" button'
    );
    assert.ok(
      !scriptDetailContent.includes('Arsip Anotasi Visual Cue'),
      'ScriptDetail must not render "Arsip Anotasi Visual Cue" section'
    );
  });

  it('2. Urutan Smart Checklist pada naskah tersusun: Audit Spoken -> Generate Rekomendasi Judul -> Generate Thumbnail', () => {
    const cardAuditIdx = scriptDetailContent.indexOf('Card 1: Spoken Audit');
    const cardTitleIdx = scriptDetailContent.indexOf('Card 2: Generate Rekomendasi Judul');
    const cardThumbIdx = scriptDetailContent.indexOf('Card 3: Generate Thumbnail');

    assert.ok(cardAuditIdx !== -1, 'Must have Card 1: Spoken Audit');
    assert.ok(cardTitleIdx !== -1, 'Must have Card 2: Generate Rekomendasi Judul');
    assert.ok(cardThumbIdx !== -1, 'Must have Card 3: Generate Thumbnail');

    assert.ok(cardAuditIdx < cardTitleIdx, 'Card 1 (Audit) must come before Card 2 (Judul)');
    assert.ok(cardTitleIdx < cardThumbIdx, 'Card 2 (Judul) must come before Card 3 (Thumbnail)');

    // Smart reminder text alignment
    assert.ok(
      scriptDetailContent.includes('Audit Spoken & TTS'),
      'Smart reminder mentions Audit Spoken & TTS'
    );
    assert.ok(
      scriptDetailContent.includes('Generate Rekomendasi Judul'),
      'Smart reminder mentions Generate Rekomendasi Judul'
    );
    assert.ok(
      scriptDetailContent.includes('Generate Thumbnail'),
      'Smart reminder mentions Generate Thumbnail'
    );
  });

  it('3. Generate Rekomendasi Judul menghasilkan 5 varian formula hook Zeinity dengan badge mobile-safe dan aksi salin/terapkan', () => {
    // gemini.ts prompt definitions
    assert.ok(
      geminiContent.includes('Formula 1 — Curiosity Gap (Pertanyaan Universal)'),
      'gemini.ts must implement Formula 1'
    );
    assert.ok(
      geminiContent.includes('Formula 2 — Paradoks & Kontradiksi (Membongkar Ilusi)'),
      'gemini.ts must implement Formula 2'
    );
    assert.ok(
      geminiContent.includes('Formula 3 — Mekanisme Tersembunyi (Invisible Mechanism)'),
      'gemini.ts must implement Formula 3'
    );
    assert.ok(
      geminiContent.includes('Formula 4 — SEO Keyword & Otoritas (High-Intent Search)'),
      'gemini.ts must implement Formula 4'
    );
    assert.ok(
      geminiContent.includes('Formula 5 — Dampak Manusia & Perilaku Digital'),
      'gemini.ts must implement Formula 5'
    );
    assert.ok(
      geminiContent.includes('5 sampai 8 kata'),
      'gemini.ts must enforce 5-8 words YouTube mobile safe rule'
    );

    // types.ts and useContent.ts support
    assert.ok(
      typesContent.includes('interface TitleRecommendationItem'),
      'types.ts must define TitleRecommendationItem'
    );
    assert.ok(
      typesContent.includes('generated_titles?: TitleRecommendationItem[] | null;'),
      'types.ts ContentItem must include generated_titles'
    );
    assert.ok(
      useContentContent.includes('TITLES_STORAGE_PREFIX'),
      'useContent.ts must have TITLES_STORAGE_PREFIX'
    );

    // ScriptDetail.tsx UI
    assert.ok(
      scriptDetailContent.includes('title-recommendations-grid'),
      'ScriptDetail must render 5 title recommendations grid'
    );
    assert.ok(
      scriptDetailContent.includes('Aman Mobile (5–8 kata)'),
      'ScriptDetail must render Aman Mobile (5–8 kata) indicator'
    );
    assert.ok(
      scriptDetailContent.includes('handleApplyTitleAsMain'),
      'ScriptDetail must support applying recommendation as main title'
    );
    assert.ok(
      scriptDetailContent.includes('Gunakan sbg Judul'),
      'ScriptDetail must render "Gunakan sbg Judul" button'
    );
  });

  it('4. Studio Generate Thumbnail Dual-Mode menyediakan Opsi 1 (Prompt Text AI) dan Opsi 2 (Visual Image AI Canvas Preview)', () => {
    // Studio Section anchor
    assert.ok(
      scriptDetailContent.includes('id="studio-thumbnail-section"'),
      'ScriptDetail must have id="studio-thumbnail-section" for direct scrolling'
    );

    // Dual-Mode Tabs
    assert.ok(
      scriptDetailContent.includes('Copywriting Prompt (Text AI)'),
      'Must offer Tab 1 Copywriting Prompt'
    );
    assert.ok(
      scriptDetailContent.includes('Visual Image AI (Placeholder)') ||
      scriptDetailContent.includes('Opsi 2: Visual Image AI (Placeholder)'),
      'Must offer Tab 2 Visual Image AI Placeholder'
    );

    // Tab 1: Guidelines and Copy Button
    assert.ok(
      scriptDetailContent.includes('Aturan Thumbnail Zeinity (Bab 13)'),
      'Tab 1 must highlight Zeinity Thumbnail Rules'
    );
    assert.ok(
      scriptDetailContent.includes('Salin Thumbnail Prompt'),
      'Tab 1 must offer copy prompt button'
    );

    // Tab 2: Visual controls & 16:9 Canvas Preview
    assert.ok(
      scriptDetailContent.includes('thumbnailAspectRatio'),
      'Tab 2 must manage aspect ratio state'
    );
    assert.ok(
      scriptDetailContent.includes('thumbnailProvider'),
      'Tab 2 must manage AI image provider selection'
    );
    assert.ok(
      scriptDetailContent.includes('handleExportMockupSvg'),
      'Tab 2 must support exporting mockup SVG'
    );
    assert.ok(
      scriptDetailContent.includes('SAFE ZONE 80%'),
      'Tab 2 canvas must display 80% safe zone overlay'
    );
    assert.ok(
      scriptDetailContent.includes('Unduh Mockup SVG'),
      'Tab 2 must have "Unduh Mockup SVG" button'
    );
  });

  it('5. CSS styles include responsive grid for 5 title formulas and thumbnail studio panel', () => {
    assert.ok(
      cssContent.includes('.title-recommendations-grid'),
      'index.css must define .title-recommendations-grid'
    );
    assert.ok(
      cssContent.includes('.formula-card'),
      'index.css must define .formula-card'
    );
    assert.ok(
      cssContent.includes('.thumbnail-studio-panel'),
      'index.css must define .thumbnail-studio-panel'
    );
    assert.ok(
      cssContent.includes('.thumbnail-tab-btn'),
      'index.css must define .thumbnail-tab-btn'
    );
  });

  it('6. Smart Checklist Card 3 triggers Modal Studio Thumbnail and eliminates redundant pipeline button in Scripting', () => {
    // Card 3 opens modal
    assert.ok(
      scriptDetailContent.includes('setIsThumbnailModalOpen(true)'),
      'Smart Checklist Card 3 must trigger setIsThumbnailModalOpen(true)'
    );

    // Card 3 has clean tooltip without old pipeline advance text
    assert.ok(
      scriptDetailContent.includes('title="Buka Studio Pembuatan Thumbnail"') ||
      scriptDetailContent.includes('title="Buka Studio Generate Thumbnail (Dual-Mode)"'),
      'Card 3 must have clean title tooltip'
    );
    assert.ok(
      scriptDetailContent.includes('aria-label="Buka Studio Pembuatan Thumbnail"') ||
      scriptDetailContent.includes('aria-label="Buka Studio Generate Thumbnail (Dual-Mode)"'),
      'Card 3 must have clean aria-label'
    );

    // Scripting workspace right panel does NOT contain the redundant bottom button
    const scriptingWorkspaceMatch = scriptDetailContent.match(/\{item\.status === 'Scripting' \? \([\s\S]*?\n\s+\) : \(/);
    assert.ok(scriptingWorkspaceMatch, 'Must match Scripting workspace block');
    const scriptingBlock = scriptingWorkspaceMatch[0];

    assert.ok(
      !scriptingBlock.includes('Lanjut ke Pipeline Berikutnya: Generate Thumbnail'),
      'Scripting workspace must not contain the redundant "Lanjut ke Pipeline Berikutnya: Generate Thumbnail" button'
    );
    assert.ok(
      !scriptingBlock.includes('Lanjut ke Thumbnailing'),
      'Scripting workspace must not contain "Lanjut ke Thumbnailing" button'
    );
  });

  it('7. Interactive Modal Studio Thumbnail provides dual-mode tabs and direct publish transition', () => {
    // Modal state declaration
    assert.ok(
      scriptDetailContent.includes('const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState'),
      'ScriptDetail must define isThumbnailModalOpen state'
    );

    // Modal structure
    assert.ok(
      scriptDetailContent.includes('isThumbnailModalOpen && ('),
      'ScriptDetail must conditionally render modal overlay'
    );
    assert.ok(
      scriptDetailContent.includes('className="modal-container thumbnail-modal-container"'),
      'Modal must use thumbnail-modal-container class'
    );

    // Modal Header: title and close button (no in-modal collapse toggle)
    assert.ok(
      scriptDetailContent.includes('Studio Pembuatan Thumbnail') ||
      scriptDetailContent.includes('Studio Generate Thumbnail (Dual-Mode)'),
      'Modal header must display title'
    );
    assert.ok(
      scriptDetailContent.includes('className="close-btn"'),
      'Modal header must have close button'
    );

    // Modal Footer: Tutup and Publish transition
    assert.ok(
      scriptDetailContent.includes('className="modal-footer"'),
      'Modal must have modal-footer'
    );
    assert.ok(
      scriptDetailContent.includes('Tandai Siap Publikasi / Publish ➔'),
      'Modal footer must have primary publish transition button'
    );
    assert.ok(
      scriptDetailContent.includes('await handlePublish()'),
      'Modal footer publish button must call handlePublish()'
    );

    // Escape key listener closes modal
    assert.ok(
      scriptDetailContent.includes("if (isThumbnailModalOpen) {\n          setIsThumbnailModalOpen(false);\n          return;\n        }"),
      'Escape key handler must close isThumbnailModalOpen with early return'
    );
  });

  it('8. index.css styles and layout constraints for modal dialog and right panel balance', () => {
    // Modal CSS classes
    assert.ok(cssContent.includes('.modal-overlay'), 'CSS must define .modal-overlay');
    assert.ok(cssContent.includes('.modal-container.thumbnail-modal-container'), 'CSS must define .modal-container.thumbnail-modal-container');
    assert.ok(cssContent.includes('.modal-header'), 'CSS must define .modal-header');
    assert.ok(cssContent.includes('.modal-body'), 'CSS must define .modal-body');
    assert.ok(cssContent.includes('.modal-footer'), 'CSS must define .modal-footer');
    assert.ok(cssContent.includes('.close-btn'), 'CSS must define .close-btn');

    // Flex constraints to prevent overflow on small viewports
    assert.ok(cssContent.includes('flex-shrink: 0;'), 'Modal header/footer must have flex-shrink: 0');
    assert.ok(cssContent.includes('min-height: 0;'), 'Modal body must have min-height: 0');
  });
});
