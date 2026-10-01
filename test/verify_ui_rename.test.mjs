import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Transform D: Rename UI Framing Verification', () => {
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const content = fs.readFileSync(scriptDetailPath, 'utf8');

  it('Columns are renamed from AI Prompts/Output to Pipeline Naskah & Draft Studio', () => {
    assert.ok(content.includes('Pipeline Naskah'), 'Must use "Pipeline Naskah" as left column title');
    assert.ok(!content.includes('Internal AI Prompts</h3>'), 'Must eliminate "Internal AI Prompts" heading');
    assert.ok(content.includes('Draft Studio'), 'Must use "Draft Studio" as right column title');
    assert.ok(!content.includes('External AI Output</h3>'), 'Must eliminate "External AI Output" heading');
  });

  it('Sections and buttons are properly renamed without obsolete "Prompt" framing', () => {
    assert.ok(content.includes('Research Brief'), 'Must include "Research Brief" title');
    assert.ok(!content.includes('Research Brief Prompt</h4>'), 'Must not append "Prompt" to Research Brief title');

    assert.ok(content.includes('Thumbnail Generator'), 'Must use "Thumbnail Generator" title');
    assert.ok(!content.includes('Thumbnail Prompt (High CTR)</h4>'), 'Must eliminate "Thumbnail Prompt (High CTR)" title');

    assert.ok(content.includes('Audit Spoken & TTS ✨'), 'Audit button must have sparkles ✨');
    assert.ok(!content.includes('Anotasi Visual Cue ✨'), 'Visual cue button must be removed per user request');
    assert.ok(content.includes('Generate Rekomendasi Judul ✨'), 'Must render "Generate Rekomendasi Judul ✨" button');
    assert.ok(content.includes('Generate Ulang Handoff'), 'Regenerate button must be "Generate Ulang Handoff"');
    assert.ok(content.includes('Lanjut: Generate Scriptwriter Handoff'), 'Advance button must be "Lanjut: Generate Scriptwriter Handoff"');

    // Tooltip checks
    assert.ok(!content.includes('title="Salin Research Brief Prompt"'), 'Must eliminate "Prompt" from Research Brief copy title');
    assert.ok(!content.includes('title="Salin Thumbnail Prompt"'), 'Must eliminate "Prompt" from Thumbnail copy title');
  });
});
