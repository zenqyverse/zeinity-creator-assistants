import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Workspace Dynamic Regenerate Buttons & Progression Logic', () => {
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const content = fs.readFileSync(scriptDetailPath, 'utf8');

  it('Researching workspace: hasGeneratedScriptBrief conditionally renders Generate Ulang button on the left', () => {
    assert.ok(content.includes('hasGeneratedScriptBrief'), 'Must compute hasGeneratedScriptBrief flag');
    assert.ok(
      content.includes('{hasGeneratedScriptBrief && (') &&
      content.includes('Generate Ulang Handoff'),
      'Generate Ulang Handoff button must only render when hasGeneratedScriptBrief is true'
    );
    assert.ok(content.includes('handleProceedToScripting'), 'Must provide handleProceedToScripting transition');
    assert.ok(content.includes('Lanjut ke Scripting'), 'Must label advance button as Lanjut ke Scripting when brief exists');
    assert.ok(content.includes('Lanjut: Generate Scriptwriter Handoff'), 'Must show initial generate button before first generation');
  });

  it('Scripting workspace: hasGeneratedThumbnail conditionally renders Generate Ulang Thumbnail button on the left', () => {
    assert.ok(content.includes('hasGeneratedThumbnail'), 'Must compute hasGeneratedThumbnail flag');
    assert.ok(
      content.includes('{hasGeneratedThumbnail && (') &&
      content.includes('Generate Ulang Thumbnail'),
      'Generate Ulang Thumbnail button must only render when hasGeneratedThumbnail is true'
    );
    assert.ok(content.includes('handleProceedToThumbnailing'), 'Must provide handleProceedToThumbnailing transition');
    assert.ok(content.includes('Lanjut ke Thumbnailing'), 'Must label advance button as Lanjut ke Thumbnailing when thumbnail exists');
  });

  it('Thumbnailing workspace: allows Regenerating Thumbnail alongside Publishing', () => {
    assert.ok(content.includes("item.status === 'Thumbnailing'"), 'Must handle Thumbnailing status');
    assert.ok(
      content.includes('title="Generate ulang Thumbnail Copy Prompt berdasarkan naskah"'),
      'Thumbnailing view must have a Generate Ulang Thumbnail button'
    );
    assert.ok(content.includes('Tandai Selesai (Publish)'), 'Must retain publishing capability');
  });

  it('Prompt cards in left column use clean, comfortable copy-action-btn buttons without clipping', () => {
    assert.ok(content.includes('copy-action-btn'), 'Must use copy-action-btn class on copy buttons');
    assert.ok(content.includes("copyText(formatPromptText(item.research_brief_prompt"), 'Must have Copy button on Research Brief Prompt');
    assert.ok(content.includes("copyText(formatPromptText(item.scriptwriter_brief_prompt"), 'Must have Copy button on Scriptwriter Handoff');
    assert.ok(content.includes("copyText(formatPromptText(item.generated_thumbnail_prompt"), 'Must have Copy button on Thumbnail Prompt');
    assert.ok(!content.includes('style={{ height: 28 }}'), 'Must not have height 28 inline clamping that causes text overflow');
  });
});
