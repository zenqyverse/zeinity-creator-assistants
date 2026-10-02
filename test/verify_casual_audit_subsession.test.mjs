import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Verification Suite: Sub-Sesi Audit Kasual Friendly di Studio Naskah', () => {
  const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
  const geminiContent = fs.readFileSync(geminiPath, 'utf8');

  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const useContent = fs.readFileSync(useContentPath, 'utf8');

  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');

  const scriptDraftStudioPath = path.join(projectRoot, 'src', 'components', 'script', 'ScriptDraftStudio.tsx');
  const scriptDraftStudioContent = fs.readFileSync(scriptDraftStudioPath, 'utf8');

  it('1. gemini.ts exports formatExternalCasualAuditPrompt and runCasualAudit', () => {
    assert.ok(
      geminiContent.includes('export function formatExternalCasualAuditPrompt('),
      'gemini.ts must export formatExternalCasualAuditPrompt'
    );
    assert.ok(
      geminiContent.includes('export async function runCasualAudit('),
      'gemini.ts must export runCasualAudit'
    );
  });

  it('2. formatExternalCasualAuditPrompt embodies Zeinity casual-friendly principles and strict constraints', () => {
    const sampleScript = 'Berdasarkan analisis tersebut, kita dapat menyimpulkan bahwa fenomena ini sangat penting.';
    // Extract formatExternalCasualAuditPrompt implementation and test output
    const match = geminiContent.match(/export function formatExternalCasualAuditPrompt\([\s\S]*?\n\}/);
    assert.ok(match, 'Must find formatExternalCasualAuditPrompt function body');
    const jsCode = match[0]
      .replace('export function formatExternalCasualAuditPrompt(scriptText: string): string', 'function formatExternalCasualAuditPrompt(scriptText)')
      .replace(': string', '');
    const fn = new Function(`${jsCode}; return formatExternalCasualAuditPrompt;`)();
    const promptOutput = fn(sampleScript);

    assert.ok(promptOutput.includes('GAYA KASUAL FRIENDLY'), 'Prompt must specify casual friendly style');
    assert.ok(promptOutput.includes('Diksi & Frasa') || promptOutput.includes('Nada Kaku'), 'Prompt must guide diction transformation');
    assert.ok(promptOutput.includes('DILARANG menggunakan bahasa alay') || promptOutput.includes('DILARANG'), 'Prompt must prohibit excessive slang / alay');
    assert.ok(promptOutput.includes('em dash (—)'), 'Prompt must reinforce VO TTS constraints');
    assert.ok(promptOutput.includes('**BAGIAN ASLI:**'), 'Prompt must require BAGIAN ASLI output format');
    assert.ok(promptOutput.includes('**MASALAH:**'), 'Prompt must require MASALAH output format');
    assert.ok(promptOutput.includes('**REVISI:**'), 'Prompt must require REVISI output format');
    assert.ok(promptOutput.includes('**ALASAN:**'), 'Prompt must require ALASAN output format');
    assert.ok(promptOutput.includes(sampleScript), 'Prompt must embed input script text');
  });

  it('3. types.ts and useContent.ts support audit_casual_prompt persistence and cache fallback', () => {
    assert.ok(
      typesContent.includes('audit_casual_prompt?: string | null;'),
      'types.ts ScriptItem must include audit_casual_prompt'
    );
    assert.ok(
      useContent.includes('CASUAL_AUDIT_STORAGE_PREFIX'),
      'useContent.ts must define CASUAL_AUDIT_STORAGE_PREFIX'
    );
    assert.ok(
      useContent.includes('getStoredCasualAuditPrompt'),
      'useContent.ts must implement getStoredCasualAuditPrompt'
    );
    assert.ok(
      useContent.includes('setStoredCasualAuditPrompt'),
      'useContent.ts must implement setStoredCasualAuditPrompt'
    );
    assert.ok(
      useContent.includes('audit_casual_prompt:'),
      'useContent.ts must merge audit_casual_prompt'
    );
  });

  it('4. ScriptDetail.tsx implements handleRunCasualAudit and wires casual props to ScriptDraftStudio', () => {
    assert.ok(
      scriptDetailContent.includes('const [casualFindings, setCasualFindings]'),
      'ScriptDetail must declare casualFindings state'
    );
    assert.ok(
      scriptDetailContent.includes('const [casualRevisedDraft, setCasualRevisedDraft]'),
      'ScriptDetail must declare casualRevisedDraft state'
    );
    assert.ok(
      scriptDetailContent.includes('const handleRunCasualAudit = async ()'),
      'ScriptDetail must implement handleRunCasualAudit'
    );
    assert.ok(
      scriptDetailContent.includes('runCasualAudit(targetConfig, item.title, scriptOutput)'),
      'handleRunCasualAudit must call runCasualAudit with targetConfig'
    );
    assert.ok(
      scriptDetailContent.includes('casualFindings={casualFindings}'),
      'ScriptDetail must pass casualFindings prop to ScriptDraftStudio'
    );
    assert.ok(
      scriptDetailContent.includes('onRunCasualAudit={handleRunCasualAudit}'),
      'ScriptDetail must pass onRunCasualAudit prop to ScriptDraftStudio'
    );
  });

  it('5. ScriptDraftStudio.tsx provides Sub-Session switcher and dedicated Casual Friendly Studio view', () => {
    assert.ok(
      scriptDraftStudioContent.includes('Evaluasi Spoken &amp; TTS (Wajib)') ||
      scriptDraftStudioContent.includes('Evaluasi Spoken & TTS (Wajib)'),
      'ScriptDraftStudio must provide Evaluasi Spoken & TTS (Wajib)'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Poles Kasual Friendly (Opsional)'),
      'ScriptDraftStudio must provide Poles Kasual Friendly (Opsional)'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Sub-Sesi: Transformasi Kasual Friendly'),
      'ScriptDraftStudio must render header for Sub-Sesi Transformasi Kasual Friendly'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Salin Prompt Kasual Friendly'),
      'ScriptDraftStudio must provide button to copy Casual Friendly prompt'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Draf Narasi Kasual Friendly Tersedia'),
      'ScriptDraftStudio must render banner when casual revised draft is ready'
    );
    assert.ok(
      scriptDraftStudioContent.includes('Audit Spoken Selesai — Lanjutkan ke Sub-Sesi Kasual Friendly?'),
      'ScriptDraftStudio must render bridge banner to guide creator to casual sub-session'
    );
  });
});
