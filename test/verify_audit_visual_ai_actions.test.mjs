import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Transforms B & C: Audit & Visual Cue AI Actions Verification', () => {
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');

  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  const cssPath = path.join(projectRoot, 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('gemini.ts exports runSpokenAudit and parseJsonResponse, and removes runVisualCueAnnotation', async () => {
    assert.ok(geminiContent.includes('export async function runSpokenAudit('), 'Must export runSpokenAudit');
    assert.ok(!geminiContent.includes('export async function runVisualCueAnnotation('), 'Must permanently remove runVisualCueAnnotation per user request');
    assert.ok(geminiContent.includes('export function parseJsonResponse'), 'Must export parseJsonResponse helper');
    assert.ok(!geminiContent.includes('export async function generateAuditSpokenPrompt('), 'Must remove generateAuditSpokenPrompt');
    assert.ok(!geminiContent.includes('export async function generateVisualCuePrompt('), 'Must remove generateVisualCuePrompt');

    // Test parseJsonResponse behavior
    const geminiModule = await import('../src/lib/gemini.ts');
    const parse = geminiModule.parseJsonResponse;
    assert.equal(typeof parse, 'function');

    // Valid JSON
    const res1 = parse('{"findings":"OK","revisedDraft":"REV","summary":"SUM"}');
    assert.equal(res1.findings, 'OK');
    assert.equal(res1.revisedDraft, 'REV');
    assert.equal(res1.summary, 'SUM');

    // JSON inside markdown codeblock
    const res2 = parse('```json\n{"summary":"Done"}\n```');
    assert.equal(res2.summary, 'Done');
  });

  it('runSpokenAudit prompt specifications are direct actions', () => {
    assert.ok(geminiContent.includes('LANGSUNG AUDIT naskah berikut. JANGAN buat instruksi audit'), 'Audit prompt must execute direct audit');
    assert.ok(geminiContent.includes('A. Struktur Kalimat'), 'Audit must cover dimension A: Struktur Kalimat');
    assert.ok(geminiContent.includes('B. Punctuation & Prosodi TTS'), 'Audit must cover dimension B: Punctuation & Prosodi TTS');
    assert.ok(geminiContent.includes('C. Naturalitas Lisan & AI Tropes'), 'Audit must cover dimension C: Naturalitas Lisan & AI Tropes');
    assert.ok(geminiContent.includes('D. Larangan Voice-Over'), 'Audit must cover dimension D: Larangan Voice-Over');
  });

  it('ScriptDetail.tsx removes visual cue and implements Spoken Audit, 5 Titles, and Thumbnail Studio', () => {
    // Left column checks
    assert.ok(!scriptDetailContent.includes('Audit Spoken & TTS Prompt'), 'Must not render Audit Prompt card in left column');
    assert.ok(!scriptDetailContent.includes('Visual Cue & B-Roll Director Prompt'), 'Must not render Visual Cue Prompt card in left column');

    // Action button checks
    assert.ok(scriptDetailContent.includes('Audit Spoken & TTS ✨'), 'ScriptDetail must render "Audit Spoken & TTS ✨" button');
    assert.ok(!scriptDetailContent.includes('Anotasi Visual Cue ✨'), 'ScriptDetail must permanently remove "Anotasi Visual Cue ✨" button');
    assert.ok(scriptDetailContent.includes('Generate Rekomendasi Judul ✨'), 'ScriptDetail must render "Generate Rekomendasi Judul ✨" button');
    assert.ok(
      scriptDetailContent.includes('Studio Pembuatan Thumbnail') ||
      scriptDetailContent.includes('Studio Thumbnail') ||
      scriptDetailContent.includes('Studio Generate Thumbnail'),
      'ScriptDetail must render Studio Thumbnail / Studio Pembuatan Thumbnail'
    );

    // Results panel checks
    assert.ok(scriptDetailContent.includes('audit-results-panel'), 'ScriptDetail must render audit-results-panel');
    assert.ok(scriptDetailContent.includes('ai-summary-badge'), 'ScriptDetail must render ai-summary-badge');
    assert.ok(scriptDetailContent.includes('auditSummary'), 'ScriptDetail must scope audit summary to auditSummary state');
    assert.ok(scriptDetailContent.includes('Terapkan ke Draft'), 'ScriptDetail must offer "Terapkan ke Draft" button');
    assert.ok(scriptDetailContent.includes("cancelText: 'Nanti Saja'"), 'ScriptDetail showAlert must support declining draft revision');
  });

  it('AlertModal supports cancelText and renders alert-cancel-btn', () => {
    const alertModalPath = path.join(projectRoot, 'src', 'components', 'AlertModal.tsx');
    const alertModalContent = fs.readFileSync(alertModalPath, 'utf8');
    assert.ok(alertModalContent.includes('cancelText?: string;'), 'AlertOptions must define cancelText');
    assert.ok(alertModalContent.includes('alert-cancel-btn'), 'AlertModal must render alert-cancel-btn');
  });

  it('index.css contains styles for AI summary badges and results panels', () => {
    assert.ok(cssContent.includes('.ai-summary-badge'), 'Must define .ai-summary-badge style');
    assert.ok(cssContent.includes('.ai-summary-badge.handoff'), 'Must define .ai-summary-badge.handoff style');
    assert.ok(cssContent.includes('.audit-results-panel'), 'Must define .audit-results-panel style');
    assert.ok(cssContent.includes('.audit-section'), 'Must define .audit-section style');
    assert.ok(cssContent.includes('.audit-pre'), 'Must define .audit-pre style');
  });

  it('ScriptDetail and index.css support "Sudah Diterapkan" feedback, auto-scroll glow, and Zen editor maximize', () => {
    // Applied button feedback
    assert.ok(scriptDetailContent.includes('Sudah Diterapkan'), 'Must render "Sudah Diterapkan" when appliedKey matches');
    assert.ok(scriptDetailContent.includes('btn-applied'), 'Must attach btn-applied class on applied state');
    assert.ok(cssContent.includes('.btn-applied'), 'index.css must define .btn-applied class');

    // Auto-scroll and highlight feedback
    assert.ok(scriptDetailContent.includes('scrollIntoView({ behavior: \'smooth\', block: \'center\' })'), 'Must smoothly scroll to textarea');
    assert.ok(scriptDetailContent.includes('draft-highlight-pulse'), 'Must apply draft-highlight-pulse class on apply');
    assert.ok(cssContent.includes('.draft-highlight-pulse'), 'index.css must define .draft-highlight-pulse animation');

    // Maximize editor mode
    assert.ok(scriptDetailContent.includes('editor-maximize-btn'), 'Must render editor-maximize-btn button');
    assert.ok(scriptDetailContent.includes('isScriptMaximized'), 'Must manage isScriptMaximized state');
    assert.ok(scriptDetailContent.includes('zen-editor-overlay'), 'Must render zen-editor-overlay when maximized');
    assert.ok(scriptDetailContent.includes('zen-editor-textarea'), 'Must render full zen-editor-textarea');
    assert.ok(cssContent.includes('.editor-maximize-btn'), 'index.css must define .editor-maximize-btn');
    assert.ok(cssContent.includes('.zen-editor-overlay'), 'index.css must define .zen-editor-overlay');
    assert.ok(cssContent.includes('.zen-editor-textarea'), 'index.css must define .zen-editor-textarea');
  });
});
