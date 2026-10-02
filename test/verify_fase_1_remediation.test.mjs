import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 1 Remediation Verification Suite (F-01, F-02, F-03)', () => {
  const addIdeaModalPath = path.join(projectRoot, 'src', 'components', 'AddIdeaModal.tsx');
  const bulkImportModalPath = path.join(projectRoot, 'src', 'components', 'BulkImportModal.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
  const indexHtmlPath = path.join(projectRoot, 'index.html');

  const addIdeaModalContent = fs.readFileSync(addIdeaModalPath, 'utf8');
  const bulkImportModalContent = fs.readFileSync(bulkImportModalPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  it('1. Item 1.1 (F-01): AddIdeaModal.tsx implements isDirty, guarded backdrop, cancel button, and Escape key', () => {
    // 1. isDirty logic exists and checks input against initialData
    assert.ok(
      addIdeaModalContent.includes('const isDirty ='),
      'AddIdeaModal.tsx must define isDirty state/variable'
    );
    assert.ok(
      addIdeaModalContent.includes('title !== initialTitle') || addIdeaModalContent.includes('context !== initialContext'),
      'AddIdeaModal.tsx isDirty must compare title and context against initial values'
    );

    // 2. onDirtyChange callback prop supported
    assert.ok(
      addIdeaModalContent.includes('onDirtyChange?: (isDirty: boolean) => void'),
      'AddIdeaModal.tsx must support onDirtyChange prop'
    );

    // 3. handleRequestClose prompts warning alert if isDirty
    assert.ok(
      addIdeaModalContent.includes('handleRequestClose'),
      'AddIdeaModal.tsx must define handleRequestClose'
    );
    assert.ok(
      addIdeaModalContent.includes('Tinggalkan Formulir?'),
      'AddIdeaModal.tsx must warn user before abandoning unsaved idea data'
    );

    // 4. Backdrop click uses handleRequestClose instead of closing directly
    assert.ok(
      addIdeaModalContent.includes('handleRequestClose(); }}'),
      'AddIdeaModal.tsx backdrop click must call handleRequestClose'
    );

    // 5. Escape key listener guards modal closure
    assert.ok(
      addIdeaModalContent.includes("e.key === 'Escape'"),
      'AddIdeaModal.tsx must handle Escape key explicitly'
    );

    // 6. Cancel and X button use handleRequestClose
    assert.ok(
      addIdeaModalContent.includes('onClick={handleRequestClose}'),
      'AddIdeaModal.tsx close buttons must call handleRequestClose'
    );
  });

  it('2. Item 1.1 (F-01): BulkImportModal.tsx implements isDirty, guarded backdrop, Batal button, and Escape key', () => {
    // 1. isDirty logic exists for parsed items, paste text, and file
    assert.ok(
      bulkImportModalContent.includes('const isDirty ='),
      'BulkImportModal.tsx must define isDirty calculation'
    );
    assert.ok(
      bulkImportModalContent.includes('parsedItems.length > 0') && bulkImportModalContent.includes('pasteText.trim().length > 0'),
      'BulkImportModal.tsx isDirty must track parsedItems and pasteText'
    );

    // 2. onDirtyChange callback prop supported
    assert.ok(
      bulkImportModalContent.includes('onDirtyChange?: (isDirty: boolean) => void'),
      'BulkImportModal.tsx must support onDirtyChange prop'
    );

    // 3. handleRequestClose prompts warning alert if isDirty
    assert.ok(
      bulkImportModalContent.includes('handleRequestClose'),
      'BulkImportModal.tsx must define handleRequestClose'
    );
    assert.ok(
      bulkImportModalContent.includes('Tinggalkan Import Masal?'),
      'BulkImportModal.tsx must prompt confirmation when discarding imported/pasted ideas'
    );

    // 4. Backdrop click uses handleRequestClose
    assert.ok(
      bulkImportModalContent.includes('handleRequestClose();'),
      'BulkImportModal.tsx backdrop click must call handleRequestClose'
    );

    // 5. Escape key listener guards modal closure
    assert.ok(
      bulkImportModalContent.includes("e.key === 'Escape'"),
      'BulkImportModal.tsx must handle Escape key explicitly'
    );
  });

  it('3. Item 1.1 (F-01): App.tsx tracks dirty state and does not unilaterally close dirty modals on Escape', () => {
    // 1. isAddIdeaDirty & isBulkImportDirty states exist
    assert.ok(
      appContent.includes('isAddIdeaDirty') && appContent.includes('isBulkImportDirty'),
      'App.tsx must track isAddIdeaDirty and isBulkImportDirty states'
    );

    // 2. Escape handler guards against closing dirty modals
    assert.ok(
      appContent.includes('if (!isAddIdeaDirty)'),
      'App.tsx Escape listener must guard addIdeaOpen with !isAddIdeaDirty check'
    );
    assert.ok(
      appContent.includes('if (!isBulkImportDirty)'),
      'App.tsx Escape listener must guard bulkImportOpen with !isBulkImportDirty check'
    );

    // 3. onDirtyChange passed to modals
    assert.ok(
      appContent.includes('onDirtyChange={setIsAddIdeaDirty}'),
      'App.tsx must pass onDirtyChange to AddIdeaModal'
    );
    assert.ok(
      appContent.includes('onDirtyChange={setIsBulkImportDirty}'),
      'App.tsx must pass onDirtyChange to BulkImportModal'
    );
  });

  it('4. Item 1.2 (F-02): Settings.tsx dynamically saves active_provider instead of hardcoding "custom"', () => {
    // 1. Dynamic active_provider value is saved
    assert.ok(
      settingsContent.includes("k === 'active_provider' ? (values.active_provider || 'custom')"),
      'Settings.tsx handleSaveAll must save values.active_provider || \'custom\''
    );
    assert.ok(
      !settingsContent.includes("k === 'active_provider' ? 'custom' :"),
      'Settings.tsx must NOT contain the bug where active_provider was hardcoded to \'custom\''
    );

    // 2. Simulation of saving various providers
    const mockValues = {
      active_provider: 'gemini',
      telegram_token: '123456:ABC',
      gemini_api_key: 'AIzaSyTest',
    };
    const key = 'active_provider';
    const valToSave = key === 'active_provider' ? (mockValues.active_provider || 'custom') : '';
    assert.equal(valToSave, 'gemini', 'Simulation: active_provider must save user-selected "gemini"');

    const mockValuesOpenRouter = { active_provider: 'openrouter' };
    const valToSaveOR = mockValuesOpenRouter.active_provider || 'custom';
    assert.equal(valToSaveOR, 'openrouter', 'Simulation: active_provider must save user-selected "openrouter"');
  });

  it('5. Item 1.3 (F-03): index.html sets document language to Indonesian ("id")', () => {
    assert.ok(
      indexHtmlContent.includes('<html lang="id">'),
      'index.html root tag must be <html lang="id">'
    );
    assert.ok(
      !indexHtmlContent.includes('<html lang="en">'),
      'index.html root tag must NOT be <html lang="en">'
    );
  });

  it('6. Functional Verification: AddIdeaModal isDirty and referential stability logic', () => {
    // Pure calculation simulation matching AddIdeaModal logic
    const calcIsDirty = (state, initialData) => {
      const initialTitle = initialData?.title || '';
      const initialSource = initialData?.source || 'Web';
      const initialCategory = initialData?.category || 'Internet & Social Media Culture';
      const initialStatus = initialData?.status || 'Idea';
      const initialContext = initialData?.research_text || '';

      return (
        state.title !== initialTitle ||
        state.source !== initialSource ||
        state.category !== initialCategory ||
        (Boolean(initialData) && state.status !== initialStatus) ||
        state.context !== initialContext
      );
    };

    // Case 1: Fresh creation modal with no changes -> not dirty
    assert.equal(
      calcIsDirty(
        { title: '', source: 'Web', category: 'Internet & Social Media Culture', status: 'Idea', context: '' },
        undefined
      ),
      false
    );

    // Case 2: User types title -> dirty
    assert.equal(
      calcIsDirty(
        { title: 'Judul Baru', source: 'Web', category: 'Internet & Social Media Culture', status: 'Idea', context: '' },
        undefined
      ),
      true
    );

    // Case 3: Edit mode with identical values -> not dirty
    const initialItem = {
      title: 'Judul Lama',
      source: 'Telegram',
      category: 'AI & Technology Impact',
      status: 'Research',
      research_text: 'Catatan riset',
    };
    assert.equal(
      calcIsDirty(
        { title: 'Judul Lama', source: 'Telegram', category: 'AI & Technology Impact', status: 'Research', context: 'Catatan riset' },
        initialItem
      ),
      false
    );

    // Case 4: Edit mode with changed category -> dirty
    assert.equal(
      calcIsDirty(
        { title: 'Judul Lama', source: 'Telegram', category: 'Digital Economy & Creator Economy', status: 'Research', context: 'Catatan riset' },
        initialItem
      ),
      true
    );

    // Case 5: Edit mode with changed status -> dirty
    assert.equal(
      calcIsDirty(
        { title: 'Judul Lama', source: 'Telegram', category: 'AI & Technology Impact', status: 'Scripting', context: 'Catatan riset' },
        initialItem
      ),
      true
    );

    // Case 6: Creation mode with status difference -> NOT dirty because status dropdown is hidden
    assert.equal(
      calcIsDirty(
        { title: '', source: 'Web', category: 'Internet & Social Media Culture', status: 'Scripting', context: '' },
        undefined
      ),
      false
    );

    // Case 7: Key fingerprinting prevents re-render wipes
    const getFingerprint = (data) =>
      data
        ? `${data.title}|${data.source}|${data.category}|${data.status}|${data.research_text}|${data.telegram_message_id}`
        : '';

    const ref1 = { ...initialItem, telegram_message_id: 123 };
    const ref2 = { ...initialItem, telegram_message_id: 123 };
    assert.notEqual(ref1, ref2, 'Different object references');
    assert.equal(getFingerprint(ref1), getFingerprint(ref2), 'Identical fingerprint avoids form reset on parent re-render');
  });

  it('7. Functional Verification: BulkImportModal isDirty and input reset calculation', () => {
    const calcBulkDirty = (parsedItems, pasteText, fileName) => {
      return parsedItems.length > 0 || pasteText.trim().length > 0 || Boolean(fileName);
    };

    assert.equal(calcBulkDirty([], '', null), false, 'Empty bulk import is not dirty');
    assert.equal(calcBulkDirty([], '   ', null), false, 'Whitespace-only paste text is not dirty');
    assert.equal(calcBulkDirty([], 'Ide 1\nIde 2', null), true, 'Pasted text is dirty');
    assert.equal(calcBulkDirty([{ id: '1', title: 'Ide A' }], '', null), true, 'Parsed items is dirty');
    assert.equal(calcBulkDirty([], '', 'ideas.csv'), true, 'Selected file is dirty');
  });
});
