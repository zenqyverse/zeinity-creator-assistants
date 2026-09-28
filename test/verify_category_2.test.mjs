import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Kategori 2 (SEDANG / SIGNIFIKAN) Verification Suite', async () => {
  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const useSettingsPath = path.join(projectRoot, 'src', 'hooks', 'useSettings.ts');
  const addIdeaModalPath = path.join(projectRoot, 'src', 'components', 'AddIdeaModal.tsx');
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const publishedDetailPath = path.join(projectRoot, 'src', 'views', 'PublishedDetail.tsx');
  const analyticsPath = path.join(projectRoot, 'src', 'views', 'Analytics.tsx');
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const topbarPath = path.join(projectRoot, 'src', 'components', 'Topbar.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const typesContent = fs.readFileSync(typesPath, 'utf8');
  const useSettingsContent = fs.readFileSync(useSettingsPath, 'utf8');
  const addIdeaModalContent = fs.readFileSync(addIdeaModalPath, 'utf8');
  const contentTableContent = fs.readFileSync(contentTablePath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
  const publishedDetailContent = fs.readFileSync(publishedDetailPath, 'utf8');
  const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');
  const topbarContent = fs.readFileSync(topbarPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  it('Item 1: Status Pipeline Revert & Edit Status Capabilities', () => {
    // 1. ScriptDetail has status selector dropdown and handleStatusChange
    assert.ok(
      scriptDetailContent.includes('handleStatusChange'),
      'ScriptDetail.tsx must define handleStatusChange'
    );
    assert.ok(
      scriptDetailContent.includes('pipelineStatusSelect') || scriptDetailContent.includes('status-selector-dropdown'),
      'ScriptDetail.tsx must render pipeline status selector dropdown'
    );

    // 2. ScriptDetail provides explicit Revert buttons for stages
    assert.ok(
      scriptDetailContent.includes('Revert ke Idea'),
      'ScriptDetail.tsx must provide button to revert to Idea'
    );
    assert.ok(
      scriptDetailContent.includes('Revert ke Researching'),
      'ScriptDetail.tsx must provide button to revert to Researching'
    );
    assert.ok(
      scriptDetailContent.includes('Revert ke Scripting'),
      'ScriptDetail.tsx must provide button to revert to Scripting'
    );
    assert.ok(
      scriptDetailContent.includes('Revert ke Thumbnailing'),
      'ScriptDetail.tsx must provide button to revert to Thumbnailing'
    );
    assert.ok(
      scriptDetailContent.includes('revert-stage-btn'),
      'ScriptDetail.tsx must style revert buttons with revert-stage-btn'
    );

    // 3. ScriptDetail handles Idea & Validating stages to prevent blank screen
    assert.ok(
      scriptDetailContent.includes("item.status === 'Idea' || item.status === 'Validating'"),
      'ScriptDetail.tsx must render Draft Studio view for Idea & Validating stages'
    );
    assert.ok(
      scriptDetailContent.includes('Mulai Riset (Lanjut ke Researching)'),
      'ScriptDetail.tsx must provide action to advance to Researching from Idea/Validating'
    );

    // 4. PublishedDetail provides status dropdown and revert button
    assert.ok(
      publishedDetailContent.includes('publishedStatusSelect') || publishedDetailContent.includes('status-selector-dropdown'),
      'PublishedDetail.tsx must render status selector dropdown'
    );
    assert.ok(
      publishedDetailContent.includes('Revert ke Thumbnailing'),
      'PublishedDetail.tsx must provide Revert ke Thumbnailing button'
    );

    // 5. AddIdeaModal provides status dropdown in edit mode
    assert.ok(
      addIdeaModalContent.includes('ideaStatus'),
      'AddIdeaModal.tsx must provide ideaStatus field'
    );
    assert.ok(
      addIdeaModalContent.includes('Status Pipeline'),
      'AddIdeaModal.tsx must label Status Pipeline field'
    );
    assert.ok(
      addIdeaModalContent.includes('initialData?.status'),
      'AddIdeaModal.tsx must populate initial status from initialData'
    );

    // 6. ContentTable accepts onStatusChange and renders interactive status dropdown
    assert.ok(
      contentTableContent.includes('onStatusChange?: (item: ContentItem, newStatus: ContentStatus) => void') ||
      contentTableContent.includes('onStatusChange?:'),
      'ContentTable.tsx must declare onStatusChange prop'
    );
    assert.ok(
      contentTableContent.includes('<select') && contentTableContent.includes('onStatusChange(item,'),
      'ContentTable.tsx must render interactive status dropdown when onStatusChange is provided'
    );

    // 7. App.tsx passes onStatusChange to ContentTable, transitions reverted published items, and handles status in AddIdeaModal
    assert.ok(
      appContent.includes('handleTableStatusChange'),
      'App.tsx must define handleTableStatusChange'
    );
    assert.ok(
      appContent.includes('onStatusChange={handleTableStatusChange}'),
      'App.tsx must pass onStatusChange to ContentTable'
    );
    assert.ok(
      appContent.includes('status: editItem.status'),
      'App.tsx must pass status in initialData to AddIdeaModal'
    );
    assert.ok(
      appContent.includes("updates.status && updates.status !== 'Published'"),
      'App.tsx must transition reverted publishedItem to scriptItem'
    );
  });

  it('Item 2: Sinkronisasi 5 Pilar Konten Resmi Zeinity', async () => {
    const officialPillars = [
      'Internet & Social Media Culture',
      'AI & Technology Impact',
      'Digital Economy & Creator Economy',
      'Gaming & Digital Entertainment',
      'Modern Life & Digital Psychology',
    ];

    // 1. types.ts exports CONTENT_PILLARS and normalizeContentPillar
    assert.ok(typesContent.includes('CONTENT_PILLARS'), 'types.ts must export CONTENT_PILLARS');
    assert.ok(typesContent.includes('normalizeContentPillar'), 'types.ts must export normalizeContentPillar');
    for (const pillar of officialPillars) {
      assert.ok(typesContent.includes(pillar), `types.ts must include pillar "${pillar}"`);
    }

    // 2. useSettings.ts DEFAULT_CHANNEL_IDENTITY matches the 5 official pillars
    for (const pillar of officialPillars) {
      assert.ok(useSettingsContent.includes(pillar), `useSettings.ts must include pillar "${pillar}"`);
    }

    // 3. AddIdeaModal.tsx and ContentTable.tsx import CONTENT_PILLARS
    assert.ok(addIdeaModalContent.includes('CONTENT_PILLARS'), 'AddIdeaModal.tsx must use CONTENT_PILLARS');
    assert.ok(contentTableContent.includes('CONTENT_PILLARS'), 'ContentTable.tsx must use CONTENT_PILLARS');
    assert.ok(analyticsContent.includes('CONTENT_PILLARS'), 'Analytics.tsx must use CONTENT_PILLARS');
    assert.ok(analyticsContent.includes('normalizeContentPillar'), 'Analytics.tsx must use normalizeContentPillar');

    // 4. gemini.ts prompt templates enforce the 5 official pillars
    for (const pillar of officialPillars) {
      assert.ok(geminiContent.includes(pillar), `gemini.ts prompt templates must enforce pillar "${pillar}"`);
    }

    // 5. Test normalizeContentPillar directly for edge cases
    const { normalizeContentPillar } = await import('../src/types.ts');
    assert.equal(normalizeContentPillar(''), 'Internet & Social Media Culture');
    assert.equal(normalizeContentPillar('   '), 'Internet & Social Media Culture');
    assert.equal(normalizeContentPillar(null), 'Internet & Social Media Culture');
    assert.equal(normalizeContentPillar('internet & social media'), 'Internet & Social Media Culture');
    assert.equal(normalizeContentPillar('AI & Technology'), 'AI & Technology Impact');
    assert.equal(normalizeContentPillar('Consumer Culture'), 'Digital Economy & Creator Economy');
    assert.equal(normalizeContentPillar('Gaming'), 'Gaming & Digital Entertainment');
    assert.equal(normalizeContentPillar('Human Behavior'), 'Modern Life & Digital Psychology');
  });

  it('Item 3: Smart Context Window & Pencegahan Silent Truncation Naskah Panjang', async () => {
    // 1. gemini.ts exports extractSmartScriptContext
    assert.ok(
      geminiContent.includes('export function extractSmartScriptContext'),
      'gemini.ts must export extractSmartScriptContext'
    );

    // 2. generateThumbnailPrompt does NOT cut off at substring(0, 4000)
    assert.ok(
      !geminiContent.includes('${scriptOutput.substring(0, 4000)}'),
      'gemini.ts must eliminate narrow substring(0, 4000) truncation in generateThumbnailPrompt'
    );
    assert.ok(
      geminiContent.includes('extractSmartScriptContext(scriptOutput'),
      'generateThumbnailPrompt must use extractSmartScriptContext'
    );

    // 3. Import and directly test extractSmartScriptContext behavior
    const { extractSmartScriptContext } = await import('../src/lib/gemini.ts');

    // Test a) Teks di bawah atau sama dengan maxTotal (misal 10,000 karakter) tidak dipotong
    const sampleScript = 'A'.repeat(10000);
    const preservedResult = extractSmartScriptContext(sampleScript, { maxTotal: 20000 });
    assert.equal(preservedResult.length, 10000, 'Scripts up to maxTotal must be preserved 100% without truncation');

    // Test b) Teks melampaui maxTotal (misal 30,000 karakter) diekstrak secara cerdas (head + tail)
    const longScript = 'HEAD_HOOK_' + 'X'.repeat(25000) + '_TAIL_CLIMAX';
    const smartExtracted = extractSmartScriptContext(longScript, { maxTotal: 20000, headChars: 4000, tailChars: 4000 });
    assert.ok(smartExtracted.startsWith('HEAD_HOOK_'), 'Smart extraction must preserve head hook');
    assert.ok(smartExtracted.endsWith('_TAIL_CLIMAX'), 'Smart extraction must preserve tail climax');
    assert.ok(smartExtracted.includes('[... Bagian tengah'), 'Smart extraction must note middle summary');

    // Test c) Edge case: headChars + tailChars >= text.length returns full text without duplicate overlap
    const boundaryScript = 'HEAD_12345_TAIL';
    const noDuplicate = extractSmartScriptContext(boundaryScript, { maxTotal: 10, headChars: 10, tailChars: 10 });
    assert.equal(noDuplicate, boundaryScript, 'Must return full text when headChars + tailChars >= length');

    // Test d) Edge case: headChars + tailChars > maxTotal scales proportionally
    const oversizedScript = 'A'.repeat(1000);
    const scaled = extractSmartScriptContext(oversizedScript, { maxTotal: 200, headChars: 300, tailChars: 300 });
    assert.ok(scaled.length <= 300, 'Scaled output must fit within reasonable window with summary notice');

    // Test e) Empty / whitespace inputs
    assert.equal(extractSmartScriptContext(''), '');
    assert.equal(extractSmartScriptContext('   '), '');

    // 4. generateScriptwriterHandoff, runSpokenAudit, and runVisualCueAnnotation use proportional limits
    assert.ok(
      geminiContent.includes('extractSmartScriptContext(researchOutput'),
      'generateScriptwriterHandoff must use extractSmartScriptContext'
    );
    assert.ok(
      geminiContent.includes('extractSmartScriptContext(scriptText'),
      'runSpokenAudit and runVisualCueAnnotation must use extractSmartScriptContext'
    );
  });

  it('Item 4: Verifikasi & Konsistensi Status Gateway Topbar', () => {
    // 1. Topbar accepts activeProvider prop
    assert.ok(
      topbarContent.includes('activeProvider?:'),
      'Topbar.tsx must accept activeProvider prop'
    );

    // 2. Topbar handles Ollama without misleading "API Key belum diisi"
    assert.ok(
      topbarContent.includes('Endpoint belum terhubung'),
      'Topbar.tsx must accurately report Ollama endpoint status when offline'
    );

    // 3. Topbar shows active provider name in online and offline status
    assert.ok(
      topbarContent.includes('providerLabel'),
      'Topbar.tsx must dynamically display the active provider name'
    );

    // 4. App.tsx passes activeProvider to Topbar
    assert.ok(
      appContent.includes('activeProvider={settings.active_provider || \'gemini\'}'),
      'App.tsx must pass activeProvider to Topbar'
    );
  });
});
