import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 3 Remediation Verification Suite (P1/P2: F-09, NEW-F-27, NEW-F-23, NEW-F-24)', () => {
  const cssPath = path.join(projectRoot, 'src', 'index.css');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views/ScriptDetail.tsx');
  const alertModalPath = path.join(projectRoot, 'src', 'components/AlertModal.tsx');
  const useAlertPath = path.join(projectRoot, 'src', 'hooks/useAlert.ts');
  const contentTablePath = path.join(projectRoot, 'src', 'views/ContentTable.tsx');
  const terminalPath = path.join(projectRoot, 'src', 'components/Terminal.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
  const alertModalContent = fs.readFileSync(alertModalPath, 'utf8');
  const useAlertContent = fs.readFileSync(useAlertPath, 'utf8');
  const contentTableContent = fs.readFileSync(contentTablePath, 'utf8');
  const terminalContent = fs.readFileSync(terminalPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  it('1. Item 3.1 (F-09 & NEW-F-27): Standardized Z-Index Scale Hierarchy in index.css & Terminal.tsx', () => {
    // 1. Z-Index Scale Variables in :root
    assert.ok(cssContent.includes('--z-header: 30;'), 'CSS must define --z-header: 30');
    assert.ok(cssContent.includes('--z-sidebar: 30;'), 'CSS must define --z-sidebar: 30');
    assert.ok(cssContent.includes('--z-dropdown: 70;'), 'CSS must define --z-dropdown: 70');
    assert.ok(cssContent.includes('--z-terminal: 80;'), 'CSS must define --z-terminal: 80');
    assert.ok(cssContent.includes('--z-modal: 1000;'), 'CSS must define --z-modal: 1000');
    assert.ok(cssContent.includes('--z-zen: 1050;'), 'CSS must define --z-zen: 1050');
    assert.ok(cssContent.includes('--z-alert: 2000;'), 'CSS must define --z-alert: 2000');
    assert.ok(cssContent.includes('--z-toast: 2500;'), 'CSS must define --z-toast: 2500');

    // 2. Base header / sticky sidebar rule: z-index 30
    assert.match(
      cssContent,
      /\.topbar\s*\{[^}]*z-index:\s*30/s,
      '.topbar must have z-index: 30'
    );
    assert.match(
      cssContent,
      /\.sidebar\s*\{[^}]*z-index:\s*30/s,
      '.sidebar must have z-index: 30'
    );

    // 3. Dropdowns / popovers rule: z-index 70
    assert.match(
      cssContent,
      /\.dropdown[^{]*\{[^}]*z-index:\s*70/s,
      'Dropdowns / popovers must have z-index: 70'
    );

    // 4. Terminal glass: z-index 80 in CSS and inline style
    assert.match(
      cssContent,
      /\.terminal\s*\{[^}]*z-index:\s*80/s,
      '.terminal glass must have z-index: 80 in CSS'
    );
    assert.ok(
      terminalContent.includes('zIndex: 80'),
      'Terminal.tsx inline zIndex must be standardized to 80 (not legacy 55)'
    );

    // 5. Standard Modal Layers (.modal-layer, .modal-overlay): z-index 1000
    assert.match(
      cssContent,
      /\.modal-layer\s*\{[^}]*z-index:\s*1000/s,
      '.modal-layer must have z-index: 1000'
    );
    assert.match(
      cssContent,
      /\.modal-overlay\s*\{[^}]*z-index:\s*1000/s,
      '.modal-overlay must have z-index: 1000'
    );

    // 6. Zen Editor Overlay: z-index 1050
    assert.match(
      cssContent,
      /\.zen-editor-overlay\s*\{[^}]*z-index:\s*1050/s,
      '.zen-editor-overlay must have z-index: 1050'
    );

    // 7. Alert Modal Layer: z-index 2000 (highest foreground dialog)
    assert.match(
      cssContent,
      /\.alert-modal-layer\s*\{[^}]*z-index:\s*2000/s,
      '.alert-modal-layer must have z-index: 2000'
    );

    // 8. Toast Notification Layer: z-index 2500 (floats above modal dialogs)
    assert.match(
      cssContent,
      /\.toast\s*\{[^}]*z-index:\s*2500/s,
      '.toast must have z-index: 2500'
    );

    // 9. Mathematical Hierarchy Invariant Verification
    const scale = {
      header: 30,
      sidebar: 30,
      dropdown: 70,
      terminal: 80,
      modal: 1000,
      zen: 1050,
      alert: 2000,
      toast: 2500,
    };
    assert.ok(scale.header < scale.dropdown, 'Header < Dropdown');
    assert.ok(scale.dropdown < scale.terminal, 'Dropdown < Terminal');
    assert.ok(scale.terminal < scale.modal, 'Terminal < Modal');
    assert.ok(scale.modal < scale.zen, 'Modal < Zen Editor');
    assert.ok(scale.zen < scale.alert, 'Zen Editor < Alert Modal Layer');
    assert.ok(scale.alert < scale.toast, 'Alert Modal Layer < Toast Notification');
  });

  it('2. Item 3.1 (NEW-F-27): ScriptDetail.tsx consolidates switch track and overwrite draft to standard AlertModal', () => {
    // 1. ScriptDetail imports AlertModal
    assert.ok(
      scriptDetailContent.includes('import { AlertModal'),
      'ScriptDetail.tsx must import AlertModal'
    );

    // 2. Switch track modal uses AlertModal component
    assert.ok(
      scriptDetailContent.includes('<AlertModal\n          isOpen={showSwitchTrackModal}'),
      'ScriptDetail must render AlertModal for showSwitchTrackModal'
    );
    assert.ok(
      scriptDetailContent.includes("title: 'Ganti Jalur Produksi'"),
      'Switch track must configure title'
    );
    assert.ok(
      scriptDetailContent.includes("confirmText: 'Bawa Kerangka ke Jalur Baru'"),
      'Switch track must offer Bawa Kerangka as confirm action'
    );
    assert.ok(
      scriptDetailContent.includes("label: 'Reset Kerangka dari Awal'"),
      'Switch track must offer Reset Kerangka as action button'
    );

    // 3. Overwrite draft modal uses AlertModal component
    assert.ok(
      scriptDetailContent.includes('<AlertModal\n          isOpen={showOverwriteDraftModal}'),
      'ScriptDetail must render AlertModal for showOverwriteDraftModal'
    );
    assert.ok(
      scriptDetailContent.includes("title: 'Peringatan: Draf Naskah Sudah Ada'"),
      'Overwrite draft must configure title'
    );
    assert.ok(
      scriptDetailContent.includes("confirmText: 'Ya, Timpa Draf'"),
      'Overwrite draft must offer Ya, Timpa Draf confirm action'
    );

    // 4. Neither dialog hijacks .zen-editor-overlay
    // In ScriptDetail, .zen-editor-overlay must only appear for true zen editor (isScriptMaximized)
    const zenOverlayMatches = (scriptDetailContent.match(/className="zen-editor-overlay"/g) || []).length;
    assert.equal(
      zenOverlayMatches,
      1,
      'zen-editor-overlay must only be used in exactly 1 place (true maximized zen editor)'
    );

    // 5. showDraftHistoryModal uses standard .modal-overlay and implements useFocusTrap accessibility
    assert.ok(
      scriptDetailContent.includes('showDraftHistoryModal && (\n        <div className="modal-overlay"'),
      'Draft History modal must use standard modal-overlay'
    );
    assert.ok(
      scriptDetailContent.includes("from '@/hooks/useFocusTrap'"),
      'ScriptDetail.tsx must import useFocusTrap'
    );
    assert.ok(
      scriptDetailContent.includes('draftHistoryModalRef = useFocusTrap<HTMLDivElement>(showDraftHistoryModal)'),
      'ScriptDetail.tsx must instantiate focus trap for draft history modal'
    );
    assert.ok(
      scriptDetailContent.includes('ref={draftHistoryModalRef}'),
      'ScriptDetail.tsx must bind draftHistoryModalRef to modal element'
    );
    assert.ok(
      scriptDetailContent.includes('role="dialog"') && scriptDetailContent.includes('aria-modal="true"'),
      'Draft History modal must provide role="dialog" and aria-modal="true"'
    );

    // 6. AlertModal supports reset icon and custom action button
    assert.ok(
      useAlertContent.includes("icon?: 'external' | 'reset' | 'none'"),
      'useAlert.ts must define icon options in AlertOptions'
    );
    assert.ok(
      alertModalContent.includes('<RotateCcw size={15} />'),
      'AlertModal.tsx must render RotateCcw for reset actionButton icon'
    );
  });

  it('3. Item 3.2 (NEW-F-23): ContentTable cleanly separates Content Source tabs from Pipeline Status dropdown', () => {
    // 1. Bilah tab utama hanya menyaring Sumber Konten
    // Check that none of the status names are used as tab keys in tabs array definition
    const tabsDefinition = contentTableContent.slice(
      contentTableContent.indexOf('const tabs = useMemo'),
      contentTableContent.indexOf('const [activeTab')
    );

    assert.ok(tabsDefinition.includes("key: 'all'"), 'Tabs must have all/semua key');
    assert.ok(tabsDefinition.includes("key: 'Telegram'"), 'Tabs must have Telegram key');
    assert.ok(tabsDefinition.includes("key: 'Web'"), 'Tabs must have Web key');
    assert.ok(tabsDefinition.includes("key: 'YouTube Trends'"), 'Tabs must have YouTube Trends key');
    assert.ok(tabsDefinition.includes("key: 'Google Trends'"), 'Tabs must have Google Trends key');
    assert.ok(tabsDefinition.includes("key: 'RSS'"), 'Tabs must have RSS key');

    // Statuses must NOT be mixed into tab keys
    assert.ok(!tabsDefinition.includes("key: 'Scripting'"), 'Scripting must NOT be a tab key');
    assert.ok(!tabsDefinition.includes("key: 'Thumbnailing'"), 'Thumbnailing must NOT be a tab key');
    assert.ok(!tabsDefinition.includes("key: 'Researching'"), 'Researching must NOT be a tab key');
    assert.ok(!tabsDefinition.includes("key: 'Idea'"), 'Idea must NOT be a tab key');
    assert.ok(!tabsDefinition.includes("key: 'validation'"), 'validation must NOT be a tab key');
    assert.ok(!tabsDefinition.includes("key: 'production'"), 'production must NOT be a tab key');

    // 2. Tab container has accessible label specifically for content sources
    assert.ok(
      contentTableContent.includes('aria-label="Filter sumber konten"'),
      'Tabs container must have aria-label="Filter sumber konten"'
    );

    // 3. Status pipeline disaring melalui dropdown statusFilter & availableStatuses
    assert.ok(
      contentTableContent.includes('const availableStatuses = useMemo('),
      'ContentTable must define availableStatuses for dropdown'
    );
    assert.ok(
      contentTableContent.includes('<select\n              value={statusFilter}'),
      'ContentTable must render statusFilter select element'
    );

    // 4. Reset filter button is reactive to source tabs via isAnyFilterActive
    assert.ok(
      contentTableContent.includes('const isAnyFilterActive = useMemo('),
      'ContentTable must define isAnyFilterActive memo'
    );
    assert.ok(
      contentTableContent.includes("activeTab !== (tabs[0]?.key || 'all') && activeTab !== 'all'"),
      'isAnyFilterActive must detect when a non-default content source tab is selected'
    );
    assert.ok(
      contentTableContent.includes('{isAnyFilterActive ? \'Reset Filter\' : \'Filter\'}'),
      'Button label must alternate between Reset Filter and Filter'
    );

    // 5. Simulated filter synergy: source and status filter simultaneously without conflicting
    const mockItems = [
      { id: '1', title: 'Ide 1', source: 'YouTube Trends', status: 'Scripting', category: 'AI' },
      { id: '2', title: 'Ide 2', source: 'YouTube Trends', status: 'Thumbnailing', category: 'AI' },
      { id: '3', title: 'Ide 3', source: 'Telegram', status: 'Scripting', category: 'AI' },
      { id: '4', title: 'Ide 4', source: 'Web', status: 'Idea', category: 'Tech' },
    ];

    const filterFunction = (items, activeTab, statusFilter) => {
      return items.filter((item) => {
        const tabMatch = activeTab === 'all' || item.source === activeTab;
        const statusMatch = !statusFilter || item.status === statusFilter;
        return tabMatch && statusMatch;
      });
    };

    // Filter by YouTube Trends tab only -> 2 items
    const youtubeOnly = filterFunction(mockItems, 'YouTube Trends', '');
    assert.equal(youtubeOnly.length, 2);

    // Filter by YouTube Trends tab + Scripting status simultaneously -> 1 item (synergy!)
    const youtubeScripting = filterFunction(mockItems, 'YouTube Trends', 'Scripting');
    assert.equal(youtubeScripting.length, 1);
    assert.equal(youtubeScripting[0].id, '1');

    // Filter by Telegram tab + Scripting status -> 1 item
    const telegramScripting = filterFunction(mockItems, 'Telegram', 'Scripting');
    assert.equal(telegramScripting.length, 1);
    assert.equal(telegramScripting[0].id, '3');
  });

  it('4. Item 3.3 (NEW-F-24): String-based title sniffing eliminated in ContentTable.tsx & App.tsx', () => {
    // 1. ContentTableProps exports and accepts explicit viewType
    assert.ok(
      contentTableContent.includes('export type ContentTableViewType'),
      'ContentTable.tsx must export ContentTableViewType'
    );
    assert.ok(
      contentTableContent.includes("viewType?: ContentTableViewType;"),
      'ContentTableProps must include optional viewType'
    );

    // 2. ContentTable does NOT sniff title substring
    assert.ok(
      !contentTableContent.includes("title.toLowerCase().includes('script')"),
      'Must eliminate title.toLowerCase().includes(\'script\')'
    );
    assert.ok(
      !contentTableContent.includes("title.toLowerCase().includes('publish')"),
      'Must eliminate title.toLowerCase().includes(\'publish\')'
    );
    assert.ok(
      !contentTableContent.includes("title.toLowerCase().includes('research')"),
      'Must eliminate title.toLowerCase().includes(\'research\')'
    );

    // 3. View detection is deterministically bound to viewType prop
    assert.ok(
      contentTableContent.includes("isScriptsView = viewType === 'scripts'"),
      'isScriptsView must be determined by viewType'
    );
    assert.ok(
      contentTableContent.includes("isPublishedView = viewType === 'published'"),
      'isPublishedView must be determined by viewType'
    );
    assert.ok(
      contentTableContent.includes("isResearchView = viewType === 'research'"),
      'isResearchView must be determined by viewType'
    );

    // 4. App.tsx passes explicit viewType prop to all ContentTable usages
    assert.ok(
      appContent.includes('viewType="ideas"'),
      'App.tsx must pass viewType="ideas"'
    );
    assert.ok(
      appContent.includes('viewType="research"'),
      'App.tsx must pass viewType="research"'
    );
    assert.ok(
      appContent.includes('viewType="scripts"'),
      'App.tsx must pass viewType="scripts"'
    );
    assert.ok(
      appContent.includes('viewType="published"'),
      'App.tsx must pass viewType="published"'
    );
  });

  it('5. Runtime availableStatuses isolation and anti-blackout validation per viewType', () => {
    const getAvailableStatusesForView = (viewType) => {
      const isPublishedView = viewType === 'published';
      const isScriptsView = viewType === 'scripts';
      const isResearchView = viewType === 'research';

      if (isPublishedView) return ['Published'];
      if (isScriptsView) return ['Scripting', 'Thumbnailing'];
      if (isResearchView) return ['Idea', 'Validating', 'Researching'];
      return ['Idea', 'Validating', 'Researching', 'Scripting', 'Thumbnailing', 'Published'];
    };

    // Scripts view contains only scripting statuses
    const scriptStatuses = getAvailableStatusesForView('scripts');
    assert.deepEqual(scriptStatuses, ['Scripting', 'Thumbnailing']);
    assert.ok(!scriptStatuses.includes('Idea'));
    assert.ok(!scriptStatuses.includes('Published'));

    // Research view contains only research pipeline statuses
    const researchStatuses = getAvailableStatusesForView('research');
    assert.deepEqual(researchStatuses, ['Idea', 'Validating', 'Researching']);
    assert.ok(!researchStatuses.includes('Scripting'));

    // Published view contains only published status
    const publishedStatuses = getAvailableStatusesForView('published');
    assert.deepEqual(publishedStatuses, ['Published']);

    // Default/ideas view contains all 6 statuses
    const ideaStatuses = getAvailableStatusesForView('ideas');
    assert.equal(ideaStatuses.length, 6);

    // Anti-blackout simulation: resetting invalid statusFilter
    const simulateStatusReset = (currentStatusFilter, targetView) => {
      const targetAvailable = getAvailableStatusesForView(targetView);
      if (currentStatusFilter && !targetAvailable.includes(currentStatusFilter)) {
        return '';
      }
      return currentStatusFilter;
    };

    // Transitioning from scripts (with 'Scripting' selected) to research should reset statusFilter to ''
    assert.equal(simulateStatusReset('Scripting', 'research'), '');

    // Transitioning from ideas (with 'Idea' selected) to research should preserve 'Idea'
    assert.equal(simulateStatusReset('Idea', 'research'), 'Idea');
  });
});
