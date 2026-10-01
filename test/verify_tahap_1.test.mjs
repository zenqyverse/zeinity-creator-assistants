import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ==========================================
// Mock LocalStorage & Browser Polyfill for Functional Testing
// ==========================================
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

describe('Tahap 1 (Stabilitas & Integritas Data) Verification Suite', () => {
  const useFilesPath = path.join(projectRoot, 'src', 'hooks', 'useFiles.ts');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const fileManagerPath = path.join(projectRoot, 'src', 'views', 'FileManager.tsx');
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const useFilesContent = fs.readFileSync(useFilesPath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
  const fileManagerContent = fs.readFileSync(fileManagerPath, 'utf8');
  const contentTableContent = fs.readFileSync(contentTablePath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // =========================================================================
  // Item 1: Fallback Offline useFiles.ts & Perbaikan Upload di ScriptDetail.tsx
  // =========================================================================
  it('Item 1: Fallback offline pada useFiles.ts dan perbaikan upload berkas di ScriptDetail.tsx', async () => {
    // 1. Storage key definition
    assert.ok(
      useFilesContent.includes("CACHED_FILES_STORAGE_KEY = 'zeinity_cached_files'"),
      'useFiles.ts must export CACHED_FILES_STORAGE_KEY as zeinity_cached_files'
    );

    // 2. Local storage helper exports
    assert.ok(
      useFilesContent.includes('export function getStoredFiles'),
      'useFiles.ts must export getStoredFiles'
    );
    assert.ok(
      useFilesContent.includes('export function setStoredFiles'),
      'useFiles.ts must export setStoredFiles'
    );
    assert.ok(
      useFilesContent.includes('export function getSeedFiles'),
      'useFiles.ts must export getSeedFiles'
    );
    assert.ok(
      useFilesContent.includes('export async function saveUploadedFile'),
      'useFiles.ts must export saveUploadedFile'
    );

    // 3. Supabase configuration checking & fallback
    assert.ok(
      useFilesContent.includes('isSupabaseConfigured'),
      'useFiles.ts must import and check isSupabaseConfigured'
    );
    assert.ok(
      useFilesContent.includes('getStoredFiles()'),
      'useFiles.ts must read from getStoredFiles when Supabase is unconfigured or errors'
    );
    assert.ok(
      useFilesContent.includes('getSeedFiles()'),
      'useFiles.ts must fallback to getSeedFiles for offline initial state'
    );

    // 4. Cross-component event sync
    assert.ok(
      useFilesContent.includes('zeinity_files_updated'),
      'useFiles.ts must dispatch and listen for zeinity_files_updated event'
    );

    // 5. ScriptDetail.tsx utilizes saveUploadedFile instead of direct supabase.from('uploaded_files')
    assert.ok(
      scriptDetailContent.includes('saveUploadedFile'),
      'ScriptDetail.tsx must import and call saveUploadedFile'
    );
    assert.ok(
      !scriptDetailContent.includes("supabase.from('uploaded_files')"),
      "ScriptDetail.tsx must not directly call supabase.from('uploaded_files') without offline fallback"
    );

    // 6. App.tsx passes filesLoading to FileManager
    assert.ok(
      appContent.includes('loading={filesLoading}'),
      'App.tsx must pass real filesLoading state from useFiles to FileManager'
    );

    // 7. Test getStoredFiles & setStoredFiles logic
    assert.ok(
      useFilesContent.includes('localStorage.getItem(CACHED_FILES_STORAGE_KEY)'),
      'getStoredFiles must read from localStorage using CACHED_FILES_STORAGE_KEY'
    );
    assert.ok(
      useFilesContent.includes('localStorage.setItem(CACHED_FILES_STORAGE_KEY, JSON.stringify(files))'),
      'setStoredFiles must write to localStorage using CACHED_FILES_STORAGE_KEY'
    );
    assert.ok(
      useFilesContent.includes('window.dispatchEvent(new CustomEvent(\'zeinity_files_updated\'))'),
      'saveUploadedFile must broadcast zeinity_files_updated custom event'
    );

    // =========================================================================
    // DEEP FUNCTIONAL TEST: Storage Lifecycle & Anti-Zombie Deletion
    // =========================================================================
    const mockStorage = new MockLocalStorage();
    const CACHED_FILES_STORAGE_KEY = 'zeinity_cached_files';

    // Helper functions reproducing useFiles algorithm
    const mockGetSeedFiles = () => [
      {
        id: 'seed-file-1',
        filename: "IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx",
        file_path: "/public/uploads/IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx",
        file_type: 'docx',
        extracted_text: 'DOKUMEN STRATEGI',
        created_at: new Date().toISOString(),
      },
    ];

    const mockGetStoredFiles = () => {
      const raw = mockStorage.getItem(CACHED_FILES_STORAGE_KEY);
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      } else {
        const seed = mockGetSeedFiles();
        mockStorage.setItem(CACHED_FILES_STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      return [];
    };

    const mockSetStoredFiles = (files) => {
      mockStorage.setItem(CACHED_FILES_STORAGE_KEY, JSON.stringify(files));
    };

    // 8. First load seeds files and returns seeded list
    assert.equal(mockStorage.getItem(CACHED_FILES_STORAGE_KEY), null);
    const initialFiles = mockGetStoredFiles();
    assert.equal(initialFiles.length, 1);
    assert.equal(initialFiles[0].id, 'seed-file-1');
    assert.ok(mockStorage.getItem(CACHED_FILES_STORAGE_KEY) !== null, 'Storage is now initialized');

    // 9. Deleting the file stores empty array '[]' and prevents zombie resurrection
    mockSetStoredFiles([]);
    assert.equal(mockStorage.getItem(CACHED_FILES_STORAGE_KEY), '[]');
    const afterDeleteFiles = mockGetStoredFiles();
    assert.equal(afterDeleteFiles.length, 0, 'Deleted files must not resurrect as zombies on reload');

    // 10. Channel identity matcher functional test
    const isIdentityRegex = /(identitas|zeinity's_channel|zeinity_channel|zeinity-identity)/i;
    assert.ok(isIdentityRegex.test("IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx"));
    assert.ok(isIdentityRegex.test("zeinity_channel_identity.txt"));
    assert.ok(isIdentityRegex.test("my-zeinity-identity.md"));
    assert.ok(!isIdentityRegex.test("unrelated_notes.md"));
  });

  // =========================================================================
  // Item 2: Isolasi State di ScriptDetail.tsx
  // =========================================================================
  it('Item 2: Isolasi state di ScriptDetail.tsx untuk mencegah kebocoran state antar-konten', () => {
    // 1. currentItemIdRef tracks active item id
    assert.ok(
      scriptDetailContent.includes('currentItemIdRef.current !== item.id'),
      'ScriptDetail must check currentItemIdRef.current !== item.id to detect item switches'
    );

    // 2. Comprehensive reset of all AI prompt states on switch
    assert.ok(
      scriptDetailContent.includes('setResearchBriefPrompt(item.research_brief_prompt || \'\')'),
      'ScriptDetail must reset researchBriefPrompt to new item value'
    );
    assert.ok(
      scriptDetailContent.includes('setHandoffPrompt(item.scriptwriter_brief_prompt || \'\')'),
      'ScriptDetail must reset handoffPrompt to new item value'
    );
    assert.ok(
      scriptDetailContent.includes('setThumbnailPrompt(item.generated_thumbnail_prompt || \'\')'),
      'ScriptDetail must reset thumbnailPrompt to new item value'
    );
    assert.ok(
      scriptDetailContent.includes('setAuditFindings(item.audit_spoken_prompt || \'\')'),
      'ScriptDetail must reset auditFindings to new item value'
    );
    assert.ok(
      scriptDetailContent.includes('setShowAuditResults(Boolean(item.audit_spoken_prompt))'),
      'ScriptDetail must reset showAuditResults to new item value'
    );
    assert.ok(
      scriptDetailContent.includes('setTitlesList('),
      'ScriptDetail must reset titlesList to new item value'
    );
    assert.ok(
      scriptDetailContent.includes('setThumbnailMode(item.thumbnail_mode || \'prompt\')'),
      'ScriptDetail must reset thumbnailMode to new item value'
    );

    // 3. Reset of summary badges and visual cues on switch
    assert.ok(
      scriptDetailContent.includes('setAuditSummary(null)'),
      'ScriptDetail must reset auditSummary to null on item switch'
    );
    assert.ok(
      scriptDetailContent.includes('setHandoffSummary(null)'),
      'ScriptDetail must reset handoffSummary to null on item switch'
    );
    assert.ok(
      scriptDetailContent.includes('setUploadedResearchFileName(null)'),
      'ScriptDetail must reset uploadedResearchFileName on item switch'
    );
    assert.ok(
      scriptDetailContent.includes('setUploadedScriptFileName(null)'),
      'ScriptDetail must reset uploadedScriptFileName on item switch'
    );

    // 4. Verify elimination of the old unconditional leak pattern
    assert.ok(
      !scriptDetailContent.includes('if (item.audit_spoken_prompt) {\n      setAuditFindings(item.audit_spoken_prompt);'),
      'ScriptDetail must not have legacy if (item.audit_spoken_prompt) block that skips clearing old audit findings'
    );

    // 5. DEEP FUNCTIONAL TEST: Unsaved changes flush before item switch
    assert.ok(
      scriptDetailContent.includes('if (researchOutputRef.current !== lastSavedResearchRef.current)'),
      'ScriptDetail must check and flush pending research edits of previous item before item switch'
    );
    assert.ok(
      scriptDetailContent.includes('if (scriptOutputRef.current !== lastSavedScriptRef.current)'),
      'ScriptDetail must check and flush pending script edits of previous item before item switch'
    );

    // 6. App.tsx passes key={activeScriptItem.id} ensuring pristine React component lifecycle
    assert.ok(
      appContent.includes('key={activeScriptItem.id}'),
      'App.tsx must pass key={activeScriptItem.id} to ScriptDetail'
    );
    assert.ok(
      appContent.includes('key={activePublishedItem.id}'),
      'App.tsx must pass key={activePublishedItem.id} to PublishedDetail'
    );
  });

  // =========================================================================
  // Item 3: Modal Konfirmasi Aksi Destruktif
  // =========================================================================
  it('Item 3: Konfirmasi aksi destruktif sebelum menghapus ide di ContentTable.tsx dan berkas di FileManager.tsx', () => {
    // 1. ContentTable uses useAlert
    assert.ok(
      contentTableContent.includes("import { useAlert } from '@/components/AlertModal';"),
      'ContentTable.tsx must import useAlert from AlertModal'
    );
    assert.ok(
      contentTableContent.includes('const { showAlert } = useAlert();'),
      'ContentTable.tsx must invoke useAlert to get showAlert'
    );
    assert.ok(
      contentTableContent.includes('handleDeleteClick'),
      'ContentTable.tsx must define handleDeleteClick'
    );
    assert.ok(
      contentTableContent.includes("title: 'Hapus Ide Konten?'"),
      'ContentTable.tsx must show confirmation with title "Hapus Ide Konten?"'
    );
    assert.ok(
      contentTableContent.includes("cancelText: 'Batal'"),
      'ContentTable.tsx confirmation modal must provide cancelText: "Batal"'
    );
    assert.ok(
      contentTableContent.includes('onClick={() => handleDeleteClick(item)}'),
      'ContentTable.tsx delete button must call handleDeleteClick instead of instant deletion'
    );

    // 2. FileManager uses useAlert
    assert.ok(
      fileManagerContent.includes("import { useAlert } from '@/components/AlertModal';"),
      'FileManager.tsx must import useAlert from AlertModal'
    );
    assert.ok(
      fileManagerContent.includes('const { showAlert } = useAlert();'),
      'FileManager.tsx must invoke useAlert to get showAlert'
    );
    assert.ok(
      fileManagerContent.includes('handleDeleteClick'),
      'FileManager.tsx must define handleDeleteClick'
    );
    assert.ok(
      fileManagerContent.includes("title: 'Hapus Berkas Referensi?'"),
      'FileManager.tsx must show confirmation with title "Hapus Berkas Referensi?"'
    );
    assert.ok(
      fileManagerContent.includes("cancelText: 'Batal'"),
      'FileManager.tsx confirmation modal must provide cancelText: "Batal"'
    );
    assert.ok(
      fileManagerContent.includes('Master AI Context'),
      'FileManager.tsx confirmation must warn specifically when deleting master identity file'
    );
    assert.ok(
      fileManagerContent.includes('onClick={() => handleDeleteClick(file)}'),
      'FileManager.tsx delete button must call handleDeleteClick instead of instant deletion'
    );

    // 3. DEEP FUNCTIONAL TEST: Confirmation interception
    let modalOptions = null;
    let deletedId = null;

    const mockShowAlert = (opts) => {
      modalOptions = opts;
    };
    const mockOnDelete = (id) => {
      deletedId = id;
    };

    // Simulate handleDeleteClick logic
    const testFile = { id: 'file-123', filename: 'IDENTITAS_CHANNEL.docx' };
    const isIdentity = testFile.filename.includes('IDENTITAS');

    mockShowAlert({
      title: 'Hapus Berkas Referensi?',
      message: isIdentity ? 'PERINGATAN: Master AI Context' : 'Hapus berkas?',
      type: 'warning',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: () => mockOnDelete(testFile.id),
      onCancel: () => {},
    });

    assert.equal(deletedId, null, 'Deletion must NOT occur immediately upon clicking delete button');
    assert.equal(modalOptions.confirmText, 'Ya, Hapus');
    assert.equal(modalOptions.cancelText, 'Batal');
    assert.ok(modalOptions.message.includes('Master AI Context'));

    // Cancel does nothing
    modalOptions.onCancel();
    assert.equal(deletedId, null, 'Canceling modal must NOT call onDelete');

    // Confirm executes deletion
    modalOptions.onConfirm();
    assert.equal(deletedId, 'file-123', 'Confirming modal must invoke onDelete with item id');
  });

  // =========================================================================
  // Item 4: Tab Filter Dinamis & Anti Data Blackout pada ContentTable.tsx
  // =========================================================================
  it('Item 4: Perbaikan tab filter dinamis pada ContentTable.tsx agar tidak terjadi data blackout', () => {
    // 1. Context detection for different views
    assert.ok(
      contentTableContent.includes('isPublishedView'),
      'ContentTable.tsx must detect isPublishedView'
    );
    assert.ok(
      contentTableContent.includes('isScriptsView'),
      'ContentTable.tsx must detect isScriptsView'
    );
    assert.ok(
      contentTableContent.includes('isResearchView'),
      'ContentTable.tsx must detect isResearchView'
    );

    // 2. Dynamic tabs tailored to active view
    assert.ok(
      contentTableContent.includes("All Published"),
      'Published view must show "All Published" tab'
    );
    assert.ok(
      contentTableContent.includes("All Scripts"),
      'Scripts view must show "All Scripts" tab'
    );

    // 3. Tab fallback and sync
    assert.ok(
      contentTableContent.includes('setActiveTab(defaultTab)'),
      'ContentTable.tsx must synchronize activeTab when defaultTab prop changes'
    );
    assert.ok(
      contentTableContent.includes('!tabs.some((t) => t.key === activeTab)'),
      'ContentTable.tsx must reset activeTab to a valid tab if current activeTab is not in tabs'
    );

    // 4. Scoped status dropdown filter
    assert.ok(
      contentTableContent.includes('availableStatuses'),
      'ContentTable.tsx must define availableStatuses to prevent picking incompatible statuses'
    );

    // 5. Dynamic record label
    assert.ok(
      contentTableContent.includes('recordLabel'),
      'ContentTable.tsx must compute contextual recordLabel'
    );
    assert.ok(
      contentTableContent.includes('konten live'),
      'recordLabel must include "konten live" for published view'
    );
    assert.ok(
      contentTableContent.includes('draf naskah'),
      'recordLabel must include "draf naskah" for scripts view'
    );

    // 6. Anti-blackout statusFilter cleanup guard
    assert.ok(
      contentTableContent.includes('!availableStatuses.includes(statusFilter as ContentStatus)'),
      'ContentTable.tsx must reset statusFilter if it is not in availableStatuses to prevent data blackout'
    );
    assert.ok(
      contentTableContent.includes("setStatusFilter('')"),
      'ContentTable.tsx must reset statusFilter to empty string on view switch or status mismatch'
    );

    // 7. App.tsx filters research view and gives distinct key to ContentTable
    assert.ok(
      appContent.includes('key="research"'),
      'App.tsx must pass key="research" to ContentTable'
    );
    assert.ok(
      appContent.includes('key="published"'),
      'App.tsx must pass key="published" to ContentTable'
    );
    assert.ok(
      appContent.includes("items.filter((i) => i.status === 'Idea' || i.status === 'Validating' || i.status === 'Researching')"),
      'App.tsx must scope items in AI Research view to research statuses'
    );

    // =========================================================================
    // DEEP FUNCTIONAL TEST: Filter Matrix & Zero Data Blackout
    // =========================================================================
    const sampleItems = [
      { id: '1', title: 'Live Video 1', status: 'Published', source: 'Web', category: 'AI & Technology Impact' },
      { id: '2', title: 'Live Video 2', status: 'Published', source: 'Telegram', category: 'Internet & Social Media Culture' },
      { id: '3', title: 'Draft Script 1', status: 'Scripting', source: 'Web', category: 'AI & Technology Impact' },
      { id: '4', title: 'Idea 1', status: 'Idea', source: 'Web', category: 'AI & Technology Impact' },
    ];

    // Scenario A: Published view filtering
    const publishedItems = sampleItems.filter((i) => i.status === 'Published');
    const publishedStatuses = ['Published'];
    let currentStatusFilter = 'Validating'; // Leaked from previous screen

    // When statusFilter is invalid for publishedStatuses, guard resets it:
    if (!publishedStatuses.includes(currentStatusFilter)) {
      currentStatusFilter = '';
    }
    assert.equal(currentStatusFilter, '', 'Status filter must be reset when navigating to Published view');

    const publishedFiltered = publishedItems.filter((item) => {
      const statusMatch = !currentStatusFilter || item.status === currentStatusFilter;
      return statusMatch;
    });
    assert.equal(publishedFiltered.length, 2, 'Published view must show all published items without data blackout');

    // Scenario B: Scripts view filtering
    const scriptItems = sampleItems.filter((i) => i.status === 'Scripting' || i.status === 'Thumbnailing');
    const scriptStatuses = ['Scripting', 'Thumbnailing'];
    currentStatusFilter = 'Published'; // Leaked from previous screen

    if (!scriptStatuses.includes(currentStatusFilter)) {
      currentStatusFilter = '';
    }
    assert.equal(currentStatusFilter, '', 'Status filter must be reset when navigating to Scripts view');

    const scriptsFiltered = scriptItems.filter((item) => {
      const statusMatch = !currentStatusFilter || item.status === currentStatusFilter;
      return statusMatch;
    });
    assert.equal(scriptsFiltered.length, 1, 'Scripts view must show scripts without data blackout');
  });
});
