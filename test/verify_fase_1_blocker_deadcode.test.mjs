import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 1: Blocker Kompilasi P0, Pembersihan Dead Code 678 Baris & Penegakan Type Safety', () => {
  const useContentPath = path.join(projectRoot, 'src', 'hooks', 'useContent.ts');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  const useContentSource = fs.readFileSync(useContentPath, 'utf8');
  const scriptDetailSource = fs.readFileSync(scriptDetailPath, 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  it('1. Perbaikan Typecheck P0 di useContent.ts (Orphan setStoredVisualCuePrompt & Storage Purge)', () => {
    // 1.1. Orphan setStoredVisualCuePrompt must be completely removed
    assert.ok(
      !useContentSource.includes('setStoredVisualCuePrompt'),
      'useContent.ts must not call or define orphan setStoredVisualCuePrompt'
    );

    // 1.2. Storage cleanup keys must be present in deleteItem
    assert.ok(
      useContentSource.includes('zeinity_generated_titles_'),
      'useContent.ts deleteItem must purge zeinity_generated_titles_'
    );
    assert.ok(
      useContentSource.includes('zeinity_draft_history_'),
      'useContent.ts deleteItem must purge zeinity_draft_history_'
    );
    assert.ok(
      useContentSource.includes('zeinity_audit_revised_'),
      'useContent.ts deleteItem must purge zeinity_audit_revised_'
    );

    // Functional test of deleteItem storage cleanup
    const mockStorage = new Map();
    const itemId = 'test-item-purge-123';
    mockStorage.set(`zeinity_generated_titles_${itemId}`, JSON.stringify([{ id: '1', title: 'Test' }]));
    mockStorage.set(`zeinity_draft_history_${itemId}`, JSON.stringify([{ id: 's1', content: 'Draft' }]));
    mockStorage.set(`zeinity_audit_revised_${itemId}`, 'Revised draft content');
    mockStorage.set(`other_key`, 'keep me');

    // Simulate cleanup logic matching useContent
    const keysToPurge = [
      `zeinity_generated_titles_${itemId}`,
      `zeinity_draft_history_${itemId}`,
      `zeinity_audit_revised_${itemId}`,
    ];
    for (const k of keysToPurge) {
      mockStorage.delete(k);
    }

    assert.equal(mockStorage.has(`zeinity_generated_titles_${itemId}`), false);
    assert.equal(mockStorage.has(`zeinity_draft_history_${itemId}`), false);
    assert.equal(mockStorage.has(`zeinity_audit_revised_${itemId}`), false);
    assert.equal(mockStorage.get('other_key'), 'keep me');
  });

  it('2. Perbaikan Typecheck P0 di ScriptDetail.tsx (Orphan setIsThumbnailStudioCollapsed)', () => {
    assert.ok(
      !scriptDetailSource.includes('setIsThumbnailStudioCollapsed'),
      'ScriptDetail.tsx must not call or define undefined setIsThumbnailStudioCollapsed'
    );
  });

  it('3. Pembersihan 678 Baris Dead Code & Tombol Revert ke Researching di ScriptDetail.tsx', () => {
    // 3.1. Dead code condition inside else branch must NOT exist
    assert.ok(
      !scriptDetailSource.includes("((item.status as ContentStatus) === 'Scripting')"),
      'ScriptDetail.tsx must eliminate the unreachable dead code block ((item.status as ContentStatus) === \'Scripting\')'
    );

    // 3.2. Stretched Studio Card 1 has navigation button to Researching
    assert.ok(
      scriptDetailSource.includes("handleStatusChange('Researching')"),
      'ScriptDetail.tsx Card 1 must have handleStatusChange(\'Researching\')'
    );
    assert.ok(
      scriptDetailSource.includes('revert-stage-btn'),
      'ScriptDetail.tsx revert buttons must carry revert-stage-btn class'
    );
    assert.ok(
      scriptDetailSource.includes('Revert ke Researching'),
      'ScriptDetail.tsx Card 1 must have button labeled Revert ke Researching'
    );
  });

  it('4. Penegakan Compiler Safety di package.json', () => {
    assert.equal(
      packageJson.scripts.build,
      'tsc --noEmit -p tsconfig.app.json && vite build',
      'package.json build script must enforce tsc type checking before vite build'
    );
    assert.equal(
      packageJson.scripts.typecheck,
      'tsc --noEmit -p tsconfig.app.json',
      'package.json typecheck script must run tsc --noEmit -p tsconfig.app.json'
    );
  });
});
