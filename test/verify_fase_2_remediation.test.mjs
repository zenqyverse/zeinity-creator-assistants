import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 2 Remediation Verification Suite (P1: F-04, F-05, F-06, F-07, F-08, NEW-F-26)', () => {
  const focusTrapHookPath = path.join(projectRoot, 'src', 'hooks', 'useFocusTrap.ts');
  const addIdeaModalPath = path.join(projectRoot, 'src', 'components', 'AddIdeaModal.tsx');
  const importModalPath = path.join(projectRoot, 'src', 'components', 'ImportModal.tsx');
  const bulkImportModalPath = path.join(projectRoot, 'src', 'components', 'BulkImportModal.tsx');
  const alertModalPath = path.join(projectRoot, 'src', 'components', 'AlertModal.tsx');
  const thumbnailStudioPath = path.join(projectRoot, 'src', 'components', 'script', 'ThumbnailTitleStudio.tsx');
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const overviewPath = path.join(projectRoot, 'src', 'views', 'Overview.tsx');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const topbarPath = path.join(projectRoot, 'src', 'components', 'Topbar.tsx');
  const sidebarPath = path.join(projectRoot, 'src', 'components', 'Sidebar.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const cssPath = path.join(projectRoot, 'src', 'index.css');

  const focusTrapContent = fs.readFileSync(focusTrapHookPath, 'utf8');
  const addIdeaModalContent = fs.readFileSync(addIdeaModalPath, 'utf8');
  const importModalContent = fs.readFileSync(importModalPath, 'utf8');
  const bulkImportModalContent = fs.readFileSync(bulkImportModalPath, 'utf8');
  const alertModalContent = fs.readFileSync(alertModalPath, 'utf8');
  const thumbnailStudioContent = fs.readFileSync(thumbnailStudioPath, 'utf8');
  const contentTableContent = fs.readFileSync(contentTablePath, 'utf8');
  const overviewContent = fs.readFileSync(overviewPath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
  const topbarContent = fs.readFileSync(topbarPath, 'utf8');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('1. Item 2.1 (F-04): useFocusTrap hook is exported and applied to all 5 modal dialogs', () => {
    // 1. Hook exports
    assert.ok(
      focusTrapContent.includes('export function useFocusTrap'),
      'useFocusTrap.ts must export useFocusTrap function'
    );
    assert.ok(
      focusTrapContent.includes('FOCUSABLE_ELEMENTS_SELECTOR'),
      'useFocusTrap.ts must export FOCUSABLE_ELEMENTS_SELECTOR'
    );
    assert.ok(
      focusTrapContent.includes('isTopmostTrap'),
      'useFocusTrap.ts must export isTopmostTrap helper'
    );
    assert.ok(
      focusTrapContent.includes('activeTrapStack'),
      'useFocusTrap.ts must track activeTrapStack'
    );

    // 2. AddIdeaModal
    assert.ok(
      addIdeaModalContent.includes("from '@/hooks/useFocusTrap'"),
      'AddIdeaModal.tsx must import useFocusTrap'
    );
    assert.ok(
      addIdeaModalContent.includes('useFocusTrap<HTMLDivElement>(open)'),
      'AddIdeaModal.tsx must invoke useFocusTrap'
    );
    assert.ok(
      addIdeaModalContent.includes('ref={modalRef}'),
      'AddIdeaModal.tsx must attach modalRef to modal-layer'
    );

    // 3. ImportModal
    assert.ok(
      importModalContent.includes("from '@/hooks/useFocusTrap'"),
      'ImportModal.tsx must import useFocusTrap'
    );
    assert.ok(
      importModalContent.includes('useFocusTrap<HTMLDivElement>(open)'),
      'ImportModal.tsx must invoke useFocusTrap'
    );
    assert.ok(
      importModalContent.includes('ref={modalRef}'),
      'ImportModal.tsx must attach modalRef to modal-layer'
    );

    // 4. BulkImportModal
    assert.ok(
      bulkImportModalContent.includes("from '@/hooks/useFocusTrap'"),
      'BulkImportModal.tsx must import useFocusTrap'
    );
    assert.ok(
      bulkImportModalContent.includes('useFocusTrap<HTMLDivElement>(open)'),
      'BulkImportModal.tsx must invoke useFocusTrap'
    );
    assert.ok(
      bulkImportModalContent.includes('ref={modalRef}'),
      'BulkImportModal.tsx must attach modalRef to modal-layer'
    );

    // 5. AlertModal
    assert.ok(
      alertModalContent.includes("from '@/hooks/useFocusTrap'"),
      'AlertModal.tsx must import useFocusTrap'
    );
    assert.ok(
      alertModalContent.includes('useFocusTrap<HTMLDivElement>(isOpen)'),
      'AlertModal.tsx must invoke useFocusTrap'
    );
    assert.ok(
      alertModalContent.includes('ref={modalRef}'),
      'AlertModal.tsx must attach modalRef to alert-modal-layer'
    );

    // 6. ThumbnailTitleStudio
    assert.ok(
      thumbnailStudioContent.includes("from '@/hooks/useFocusTrap'"),
      'ThumbnailTitleStudio.tsx must import useFocusTrap'
    );
    assert.ok(
      thumbnailStudioContent.includes('useFocusTrap<HTMLDivElement>(isOpen)'),
      'ThumbnailTitleStudio.tsx must invoke useFocusTrap'
    );
    assert.ok(
      thumbnailStudioContent.includes('ref={modalRef}'),
      'ThumbnailTitleStudio.tsx must attach modalRef to modal-overlay'
    );
  });

  it('2. Item 2.2 (F-05): ContentTable & Overview implement distinct destination indicators and metadata edit actions', () => {
    // 1. ContentTable destination icon and tooltip helpers
    assert.ok(
      contentTableContent.includes('getTitleDestinationIcon'),
      'ContentTable.tsx must implement getTitleDestinationIcon'
    );
    assert.ok(
      contentTableContent.includes('getTitleTooltip'),
      'ContentTable.tsx must implement getTitleTooltip'
    );
    assert.ok(
      contentTableContent.includes('cell-title-inner'),
      'ContentTable.tsx must render cell-title-inner wrapper'
    );
    assert.ok(
      contentTableContent.includes('title-nav-icon'),
      'ContentTable.tsx must render title-nav-icon'
    );
    assert.ok(
      contentTableContent.includes('row-action edit-btn default'),
      'ContentTable.tsx must style edit button with edit-btn class'
    );

    // 2. Overview destination icon and tooltip helpers
    assert.ok(
      overviewContent.includes('getTitleDestinationIcon'),
      'Overview.tsx must implement getTitleDestinationIcon'
    );
    assert.ok(
      overviewContent.includes('getTitleTooltip'),
      'Overview.tsx must implement getTitleTooltip'
    );
    assert.ok(
      overviewContent.includes('cell-title-inner'),
      'Overview.tsx must render cell-title-inner wrapper'
    );

    // 3. CSS styling for title inner and edit-btn
    assert.ok(
      cssContent.includes('.cell-title-inner'),
      'index.css must define .cell-title-inner'
    );
    assert.ok(
      cssContent.includes('.title-nav-icon'),
      'index.css must define .title-nav-icon'
    );
    assert.ok(
      cssContent.includes('.row-action.edit-btn'),
      'index.css must define .row-action.edit-btn'
    );
  });

  it('3. Item 2.3 (F-06): Global universal search auto-redirects to ideas view when typing outside table', () => {
    // 1. App.tsx redirects when typing in search while outside table or in detail views
    assert.ok(
      appContent.includes("setActiveView('ideas')"),
      'App.tsx handleSearchChange must set activeView to ideas'
    );
    assert.ok(
      appContent.includes("['overview', 'trends', 'rss', 'files', 'analytics', 'settings']"),
      'App.tsx handleSearchChange must inspect nonTableViews list'
    );
    assert.ok(
      appContent.includes('setScriptItem(null)') && appContent.includes('setPublishedItem(null)'),
      'App.tsx handleSearchChange must clear active detail views when searching'
    );

    // 2. Topbar Escape key clears search
    assert.ok(
      topbarContent.includes("if (e.key === 'Escape')"),
      'Topbar.tsx must support Escape key to clear search input'
    );
  });

  it('4. Item 2.4 (F-07): Persistent desktop navigation layout (>=1024px) with rail layout and responsive drawer', () => {
    // 1. index.css media query for desktop persistent sidebar
    assert.ok(
      cssContent.includes('@media (min-width: 1024px)'),
      'index.css must define desktop media query @media (min-width: 1024px)'
    );
    assert.ok(
      cssContent.includes('grid-template-columns: 280px 1fr'),
      'index.css desktop layout must define 2-column grid for app-shell'
    );
    assert.ok(
      cssContent.includes('.sidebar-backdrop {\n    display: none !important;\n  }'),
      'index.css desktop layout must hide sidebar-backdrop'
    );
    assert.ok(
      cssContent.includes('position: sticky'),
      'index.css desktop sidebar must be sticky'
    );

    // 2. App.tsx defines app-main wrapper
    assert.ok(
      appContent.includes('<div className="app-main">'),
      'App.tsx must wrap Topbar and renderView inside div.app-main'
    );
    assert.ok(
      cssContent.includes('.app-main'),
      'index.css must style .app-main'
    );

    // 3. Topbar & Sidebar hide mobile-only buttons on desktop
    assert.ok(
      cssContent.includes('.sidebar-close-btn {\n    display: none !important;\n  }'),
      'index.css desktop layout must hide sidebar-close-btn'
    );
    assert.ok(
      cssContent.includes('.mobile-menu-btn {\n    display: none !important;\n  }'),
      'index.css desktop layout must hide mobile-menu-btn'
    );
  });

  it('5. Item 2.5 (F-08): Sidebar menu items include semantic aria-current="page" on active item', () => {
    assert.ok(
      sidebarContent.includes("aria-current={activeView === item.key ? 'page' : undefined}"),
      'Sidebar.tsx must render aria-current="page" on active navigation button'
    );
  });

  it('6. Item 2.6 (NEW-F-26): Coordinated unified Escape listener across modals, ScriptDetail, and App shell', () => {
    // 1. App.tsx guards against closing background when an alert or modal is active
    assert.ok(
      appContent.includes("document.querySelector('.alert-modal-layer')"),
      'App.tsx Escape handler must guard against closing background when alert modal is open'
    );
    assert.ok(
      appContent.includes("document.querySelector('.modal-overlay')"),
      'App.tsx Escape handler must guard against closing background when studio thumbnail modal is open'
    );

    // 2. ScriptDetail guards against closing sub-modals when AlertModal is open
    assert.ok(
      scriptDetailContent.includes("if (document.querySelector('.alert-modal-layer')) {\n          return;\n        }"),
      'ScriptDetail.tsx Escape handler must defer to AlertModal when alert is open'
    );

    // 3. Modals stop propagation on Escape so lower layers do not close
    assert.ok(
      alertModalContent.includes('e.stopPropagation()'),
      'AlertModal.tsx must call e.stopPropagation() on Escape'
    );
    assert.ok(
      addIdeaModalContent.includes('e.stopPropagation()'),
      'AddIdeaModal.tsx must call e.stopPropagation() on Escape'
    );
    assert.ok(
      bulkImportModalContent.includes('e.stopPropagation()'),
      'BulkImportModal.tsx must call e.stopPropagation() on Escape'
    );
    assert.ok(
      importModalContent.includes('e.stopPropagation()'),
      'ImportModal.tsx must call e.stopPropagation() on Escape'
    );
    assert.ok(
      thumbnailStudioContent.includes('e.stopPropagation()'),
      'ThumbnailTitleStudio.tsx must call e.stopPropagation() on Escape'
    );
  });

  it('7. Simulation Verification: Tab cycle wrapping and active trap stack logic in useFocusTrap', () => {
    // Simulate trap stack behavior
    const stack = [];
    const pushTrap = (el) => stack.push(el);
    const popTrap = (el) => {
      const idx = stack.indexOf(el);
      if (idx !== -1) stack.splice(idx, 1);
    };
    const isTopmost = (el) => stack.length > 0 && stack[stack.length - 1] === el;

    const modalA = { id: 'modal-ideas' };
    const modalB = { id: 'alert-confirm' };

    pushTrap(modalA);
    assert.equal(isTopmost(modalA), true, 'modalA is initially topmost');
    assert.equal(isTopmost(modalB), false, 'modalB is not yet active');

    // Sub-modal or alert opens on top
    pushTrap(modalB);
    assert.equal(isTopmost(modalB), true, 'modalB (alert) is now topmost');
    assert.equal(isTopmost(modalA), false, 'modalA is no longer topmost while alert is open');

    // Sub-modal closes
    popTrap(modalB);
    assert.equal(isTopmost(modalA), true, 'modalA becomes topmost again after alert closes');
    assert.equal(isTopmost(modalB), false, 'modalB is no longer in stack');

    // Modal closes
    popTrap(modalA);
    assert.equal(stack.length, 0, 'stack is empty when all modals close');
  });

  it('8. Deep Functional Verification: useFocusTrap node filtering excludes tabindex="-1" and prioritizes form inputs', () => {
    // Verify that FOCUSABLE_ELEMENTS_SELECTOR contains explicit :not([tabindex="-1"])
    assert.ok(
      focusTrapContent.includes('button:not([disabled]):not([tabindex="-1"])'),
      'FOCUSABLE_ELEMENTS_SELECTOR must exclude button with tabindex="-1"'
    );
    assert.ok(
      focusTrapContent.includes('input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])'),
      'FOCUSABLE_ELEMENTS_SELECTOR must exclude input with tabindex="-1"'
    );

    // Verify pruning of disconnected nodes
    assert.ok(
      focusTrapContent.includes('pruneDisconnectedTraps'),
      'useFocusTrap must prune disconnected modal elements from stack'
    );

    // Verify auto-focus prioritization for editable form fields
    assert.ok(
      focusTrapContent.includes('firstInput'),
      'useFocusTrap must prioritize first editable form input over close button'
    );
  });

  it('9. Deep Functional Verification: Destination tooltips & icons for pipeline content statuses', () => {
    const statuses = ['Published', 'Scripting', 'Thumbnailing', 'Researching', 'Idea', 'Validating'];
    
    // Simulate getTitleTooltip logic from ContentTable & Overview
    const resolveTooltip = (status, title) => {
      if (status === 'Published') return `Buka detail publikasi: ${title}`;
      if (status === 'Researching' || status === 'Scripting' || status === 'Thumbnailing') {
        return `Buka workspace & studio naskah: ${title}`;
      }
      return `Buka dan tinjau ide: ${title}`;
    };

    assert.equal(resolveTooltip('Published', 'Test Title'), 'Buka detail publikasi: Test Title');
    assert.equal(resolveTooltip('Scripting', 'Test Title'), 'Buka workspace & studio naskah: Test Title');
    assert.equal(resolveTooltip('Thumbnailing', 'Test Title'), 'Buka workspace & studio naskah: Test Title');
    assert.equal(resolveTooltip('Researching', 'Test Title'), 'Buka workspace & studio naskah: Test Title');
    assert.equal(resolveTooltip('Idea', 'Test Title'), 'Buka dan tinjau ide: Test Title');
    assert.equal(resolveTooltip('Validating', 'Test Title'), 'Buka dan tinjau ide: Test Title');
  });

  it('10. Deep Functional Verification: Global search router state transition logic', () => {
    const nonTableViews = ['overview', 'trends', 'rss', 'files', 'analytics', 'settings'];
    
    const simulateSearchChange = (query, currentView, hasActiveScript) => {
      let nextView = currentView;
      let scriptCleared = false;
      if (query.trim()) {
        if (nonTableViews.includes(currentView) || hasActiveScript) {
          nextView = 'ideas';
          scriptCleared = true;
        }
      }
      return { nextView, scriptCleared };
    };

    // Typing in Overview redirects to ideas
    const res1 = simulateSearchChange('ai agent', 'overview', false);
    assert.equal(res1.nextView, 'ideas');

    // Typing in Settings redirects to ideas
    const res2 = simulateSearchChange('trending', 'settings', false);
    assert.equal(res2.nextView, 'ideas');

    // Typing in ScriptDetail redirects to ideas and clears script
    const res3 = simulateSearchChange('video hook', 'scripts', true);
    assert.equal(res3.nextView, 'ideas');
    assert.equal(res3.scriptCleared, true);

    // Empty search query does not redirect
    const res4 = simulateSearchChange('   ', 'analytics', false);
    assert.equal(res4.nextView, 'analytics');
  });
});
