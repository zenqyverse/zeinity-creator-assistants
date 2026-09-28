import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonResponse } from '../src/lib/gemini.ts';

describe('Robust parseJsonResponse Verification', () => {
  it('parses standard valid JSON', () => {
    const raw = JSON.stringify({
      findings: 'All good',
      revisedDraft: 'Script content',
      summary: 'Done'
    });
    const parsed = parseJsonResponse(raw);
    assert.equal(parsed.findings, 'All good');
    assert.equal(parsed.revisedDraft, 'Script content');
    assert.equal(parsed.summary, 'Done');
  });

  it('handles markdown codeblocks with ```json wrapper', () => {
    const raw = '```json\n{"summary": "Ringkasan", "annotatedScript": "Naskah"}\n```';
    const parsed = parseJsonResponse(raw);
    assert.equal(parsed.summary, 'Ringkasan');
    assert.equal(parsed.annotatedScript, 'Naskah');
  });

  it('handles literal unescaped newlines inside strings without corruption', () => {
    const raw = `
{
  "findings": "BAGIAN ASLI: line 1\nline 2",
  "revisedDraft": "Rev line 1\nRev line 2",
  "summary": "Summary text"
}
`;
    const parsed = parseJsonResponse(raw);
    assert.equal(parsed.findings, 'BAGIAN ASLI: line 1\nline 2');
    assert.equal(parsed.revisedDraft, 'Rev line 1\nRev line 2');
    assert.equal(parsed.summary, 'Summary text');
  });

  it('handles keys in any arbitrary order without swallowing sibling keys', () => {
    const raw = `
{
  "summary": "Summary text",
  "revisedDraft": "Rev line 1\\nline 2",
  "findings": "Findings text"
}
`;
    const parsed = parseJsonResponse(raw);
    assert.equal(parsed.summary, 'Summary text');
    assert.equal(parsed.revisedDraft, 'Rev line 1\nline 2');
    assert.equal(parsed.findings, 'Findings text');
  });

  it('handles visual cue annotation with summary first', () => {
    const raw = `
{
  "summary": "Ditambahkan 5 tag",
  "annotatedScript": "Naskah dengan [BUKTI]\\ndan [JELASKAN]"
}
`;
    const parsed = parseJsonResponse(raw);
    assert.equal(parsed.summary, 'Ditambahkan 5 tag');
    assert.equal(parsed.annotatedScript, 'Naskah dengan [BUKTI]\ndan [JELASKAN]');
  });

  it('handles unescaped internal quotes and trailing commas cleanly', () => {
    const raw = `
{
  "summary": "Ditambahkan 2 tag",
  "annotatedScript": "Narasi \\"penting\\" dimulai.\n[BUKTI Grafik 1]\nSelesai narasi.",
}
`;
    const parsed = parseJsonResponse(raw);
    assert.equal(parsed.summary, 'Ditambahkan 2 tag');
    assert.ok(parsed.annotatedScript?.includes('[BUKTI Grafik 1]'));
  });

  it('returns empty object safely when input is corrupted non-json', () => {
    const parsed = parseJsonResponse('Bukan JSON sama sekali.');
    assert.deepEqual(parsed, {});
  });
});
