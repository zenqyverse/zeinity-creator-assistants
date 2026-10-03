import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getMediaQueryBlock(css, query) {
  const index = css.indexOf(query);
  if (index === -1) return '';
  let depth = 0;
  let start = -1;
  for (let i = index; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        return css.substring(start + 1, i);
      }
    }
  }
  return '';
}

describe('Mobile & Tablet Responsiveness Verification Suite (17 Audit Items)', () => {
  const indexCss = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const topbarTsx = fs.readFileSync(path.join(rootDir, 'src/components/Topbar.tsx'), 'utf8');
  const rssReaderTsx = fs.readFileSync(path.join(rootDir, 'src/views/RSSReader.tsx'), 'utf8');
  const scriptDetailTsx = fs.readFileSync(path.join(rootDir, 'src/views/ScriptDetail.tsx'), 'utf8');
  const scriptDraftStudioTsx = fs.readFileSync(path.join(rootDir, 'src/components/script/ScriptDraftStudio.tsx'), 'utf8');
  const outlineWorkspaceTsx = fs.readFileSync(path.join(rootDir, 'src/components/script/OutlineWorkspace.tsx'), 'utf8');
  const trendRadarTsx = fs.readFileSync(path.join(rootDir, 'src/views/TrendRadar.tsx'), 'utf8');
  const contentTableTsx = fs.readFileSync(path.join(rootDir, 'src/views/ContentTable.tsx'), 'utf8');
  const fileManagerTsx = fs.readFileSync(path.join(rootDir, 'src/views/FileManager.tsx'), 'utf8');
  const settingsTsx = fs.readFileSync(path.join(rootDir, 'src/views/Settings.tsx'), 'utf8');
  const analyticsTsx = fs.readFileSync(path.join(rootDir, 'src/views/Analytics.tsx'), 'utf8');
  const overviewTsx = fs.readFileSync(path.join(rootDir, 'src/views/Overview.tsx'), 'utf8');

  const media768 = getMediaQueryBlock(indexCss, '@media (max-width: 768px)');
  const media640 = getMediaQueryBlock(indexCss, '@media (max-width: 640px)');
  const media620 = getMediaQueryBlock(indexCss, '@media (max-width: 620px)');
  const media480 = getMediaQueryBlock(indexCss, '@media (max-width: 480px)');
  const mediaTablet = getMediaQueryBlock(indexCss, '@media (min-width: 621px) and (max-width: 1023px)');
  const media960 = getMediaQueryBlock(indexCss, '@media (max-width: 960px)');

  it('1. [CRITICAL] Auto-Zoom di iOS Safari: enforces font-size 16px !important on all form inputs and textareas on mobile', () => {
    assert.ok(media768, 'Must define @media (max-width: 768px)');
    assert.match(
      media768,
      /input[^{]*\{[^}]*font-size:\s*16px\s*!important/s,
      'Must enforce font-size 16px !important on inputs <= 768px'
    );
    assert.ok(media768.includes('.zen-editor-textarea'), 'Must include .zen-editor-textarea in 16px rule');
    assert.ok(media768.includes('.field input'), 'Must include .field input in 16px rule');
    assert.ok(media768.includes('.status-badge select'), 'Must include .status-badge select in 16px rule');
  });

  it('2. [CRITICAL] Inversi Z-Index Topbar & Sidebar Backdrop: backdrop 90 and sidebar 95 to properly dim Topbar 30', () => {
    assert.match(indexCss, /--z-sidebar-backdrop:\s*90;/, ':root must define --z-sidebar-backdrop: 90');
    assert.match(indexCss, /--z-sidebar-drawer:\s*95;/, ':root must define --z-sidebar-drawer: 95');
    assert.match(indexCss, /\.sidebar-backdrop\s*\{[^}]*z-index:\s*90;/s, '.sidebar-backdrop must have z-index: 90');
    assert.match(indexCss, /\.sidebar\s*\{[^}]*z-index:\s*95;/s, '.sidebar must have z-index: 95');
  });

  it('3. [CRITICAL] Pop-Up Menu Model 9Router di Topbar: quick-provider-dropdown bottom sheet, backdrop containing-block trap prevention & touchstart', () => {
    assert.ok(
      topbarTsx.includes('quick-provider-dropdown'),
      'Topbar dropdown container must include quick-provider-dropdown class'
    );
    assert.match(
      media640,
      /\.quick-provider-dropdown\s*\{[^}]*position:\s*fixed\s*!important;[^}]*bottom:\s*calc\(16px \+ env\(safe-area-inset-bottom/s,
      'quick-provider-dropdown must be fixed to bottom with safe-area support on <= 640px'
    );
    // Backdrop-filter containing-block trap prevention on topbar
    assert.match(
      media640,
      /\.topbar\s*\{[^}]*backdrop-filter:\s*none\s*!important/s,
      'topbar must disable backdrop-filter on <= 640px to prevent trapping fixed-position descendants'
    );
    // Touchstart event handler for mobile devices
    assert.ok(
      topbarTsx.includes("document.addEventListener('touchstart', handleOutsideClick)"),
      'Topbar must register touchstart listener to dismiss dropdown smoothly on mobile'
    );
  });

  it('4. [CRITICAL] Breakpoint Topbar Tablet (621px–1023px): flex wrapping, hidden labels and full-width search row', () => {
    assert.ok(mediaTablet, 'Must define @media (min-width: 621px) and (max-width: 1023px)');
    assert.match(
      mediaTablet,
      /\.topbar\s*\{[^}]*flex-wrap:\s*wrap;/s,
      'Tablet topbar must wrap elements'
    );
    assert.match(
      mediaTablet,
      /\.search-box\s*\{[^}]*order:\s*3;[^}]*flex-basis:\s*100%;/s,
      'Search box must fill full-width second row on tablet'
    );
  });

  it('5. [CRITICAL] Scrolling Drawer Sidebar Mobile: touch scrolling, overscroll containment and max-height', () => {
    assert.match(indexCss, /\.sidebar\s*\{[^}]*overflow-y:\s*auto;/s, '.sidebar must have overflow-y: auto');
    assert.match(indexCss, /\.sidebar\s*\{[^}]*-webkit-overflow-scrolling:\s*touch;/s, '.sidebar must have -webkit-overflow-scrolling: touch');
    assert.match(indexCss, /\.sidebar\s*\{[^}]*overscroll-behavior:\s*contain;/s, '.sidebar must have overscroll-behavior: contain');
    assert.match(indexCss, /\.sidebar\s*\{[^}]*max-height:\s*calc\(100vh - 28px\);/s, '.sidebar must have max-height: calc(100vh - 28px)');
  });

  it('6. [HIGH] Overflow Horizontal RSSReader: cards grid minmax(min(100%, 280px), 1fr) and wrapping footer', () => {
    assert.ok(
      rssReaderTsx.includes('minmax(min(100%, 280px), 1fr)'),
      'RSSReader grid must use minmax(min(100%, 280px), 1fr) to prevent overflow on < 320px screens'
    );
    assert.ok(
      rssReaderTsx.includes("flexWrap: 'wrap'"),
      'RSSReader card footer must have flexWrap: wrap'
    );
  });

  it('7. [HIGH] Textarea Naskah Adaptif Virtual Keyboard: min-height 220px, height 45dvh, scroll-margin-bottom 280px', () => {
    assert.match(
      media640,
      /\.script-draft-textarea[^}]*min-height:\s*220px\s*!important;[^}]*height:\s*45dvh\s*!important;[^}]*scroll-margin-bottom:\s*280px;/s,
      'Adaptive keyboard styling must be configured for script-draft-textarea in <= 640px'
    );
    assert.ok(
      scriptDraftStudioTsx.includes('script-draft-textarea'),
      'ScriptDraftStudio textarea must declare script-draft-textarea class'
    );
    assert.ok(
      scriptDetailTsx.includes('className="script-draft-textarea"'),
      'ScriptDetail thumbnailing textarea must declare script-draft-textarea class'
    );
  });

  it('8. [HIGH] Stepper Finishing & Packaging: 3-column compact horizontal grid and hidden long descriptions on <= 960px', () => {
    assert.ok(media960, 'Must define @media (max-width: 960px)');
    assert.match(
      media960,
      /grid-template-columns:\s*repeat\(3,\s*1fr\)\s*!important;/s,
      'Finishing stepper must transform into 3-column compact layout on screens <= 960px'
    );
    assert.ok(
      media960.includes('.finishing-stepper-card .stepper-desc'),
      'Must hide stepper-desc on <= 960px'
    );
  });

  it('9. [HIGH] Tombol Aksi Modal Dialog: column-reverse, gap 10px, 100% width, min-height 44px on <= 640px', () => {
    assert.match(
      media640,
      /\.modal-actions[^}]*flex-direction:\s*column-reverse;[^}]*gap:\s*10px;/s,
      'Modal actions must stack vertically in column-reverse on <= 640px'
    );
    assert.match(
      media640,
      /\.modal-actions\s+\.btn[^}]*min-height:\s*44px;/s,
      'Modal action buttons must have min-height 44px'
    );
  });

  it('10. [HIGH] Sticky Topbar Mobile 2 Baris: logo-only branding, compact status bot and height <= 105px on <= 480px', () => {
    assert.ok(media480, 'Must define @media (max-width: 480px)');
    assert.match(
      media480,
      /\.topbar\s*\{[^}]*max-height:\s*105px;/s,
      'Topbar max-height must be <= 105px on <= 480px'
    );
    assert.match(
      media480,
      /\.topbar\s+\.brand-name\s*\{[^}]*display:\s*none\s*!important;/s,
      'Brand name text ZEINITY must be hidden on mobile <= 480px'
    );
    assert.match(
      media480,
      /\.topbar\s+\.bot-status-dot\s+\.bot-label\s*\{[^}]*display:\s*none\s*!important;/s,
      'Bot status text must be hidden on mobile <= 480px'
    );
  });

  it('11. [HIGH] Touch Target WCAG: min 40px touch targets for table row actions, close buttons, and status selects', () => {
    assert.match(
      media768,
      /\.row-action[^}]*min-height:\s*40px;\s*min-width:\s*40px;/s,
      'Row action buttons and close buttons must meet 40px touch target minimum'
    );
    assert.match(
      media768,
      /\.status-badge\s+select[^}]*min-height:\s*40px;/s,
      'Pipeline status select dropdowns must meet 40px touch target minimum'
    );
  });

  it('12. [MEDIUM] Terminal Bottom Dock: fixed bottom dock with top: auto, 100% width, top rounded corners, and max-height 40vh', () => {
    assert.match(
      media640,
      /\.terminal\s*\{[^}]*left:\s*0\s*!important;[^}]*right:\s*0\s*!important;[^}]*bottom:\s*0\s*!important;[^}]*top:\s*auto\s*!important;[^}]*width:\s*100%\s*!important;[^}]*border-radius:\s*16px 16px 0 0\s*!important;[^}]*max-height:\s*40vh\s*!important;/s,
      'Terminal must dock neatly to bottom on mobile <= 640px with top: auto override'
    );
  });

  it('13. [MEDIUM] Safe Area Insets: viewport-fit=cover in index.html, safe-area env() in app-shell, toast, and terminal', () => {
    assert.ok(
      indexHtml.includes('viewport-fit=cover'),
      'index.html meta viewport must specify viewport-fit=cover'
    );
    assert.ok(
      indexCss.includes('env(safe-area-inset-bottom'),
      'index.css must integrate env(safe-area-inset-bottom)'
    );
  });

  it('14. [MEDIUM] Donut Chart Analytics: column layout with centered alignment and 100% width legend on <= 480px', () => {
    assert.match(
      media480,
      /\.donut-chart\s*\{[^}]*flex-direction:\s*column;[^}]*align-items:\s*center;[^}]*gap:\s*16px;/s,
      'Donut chart must stack vertically with centered alignment on <= 480px'
    );
    assert.match(
      media480,
      /\.donut-legend\s*\{[^}]*margin-left:\s*0\s*!important;[^}]*width:\s*100%\s*!important;/s,
      'Donut legend must have margin-left: 0 and width: 100%'
    );
  });

  it('15. [MEDIUM] Fade Mask pada Tab Scroll: linear-gradient right mask hint on mobile tabs', () => {
    assert.match(
      media640,
      /\.tabs\s*\{[^}]*mask-image:\s*linear-gradient\(to right,\s*black\s*85%,\s*transparent\s*100%\);/s,
      'Tabs must render gradient fade mask hint on mobile <= 640px'
    );
  });

  it('16. [LOW] Tipografi Mikro & Form Settings: ScriptDraftStudio & OutlineWorkspace have no font < 12px (0.75rem), and settings buttons full width', () => {
    const sub12pxRegex = /fontSize:\s*'0\.(?:[0-6]\d|7[0-4])rem'/g;
    const scriptDraftMatches = scriptDraftStudioTsx.match(sub12pxRegex);
    const outlineMatches = outlineWorkspaceTsx.match(sub12pxRegex);
    assert.strictEqual(
      scriptDraftMatches,
      null,
      `ScriptDraftStudio must not contain font sizes < 0.75rem (12px), found: ${JSON.stringify(scriptDraftMatches)}`
    );
    assert.strictEqual(
      outlineMatches,
      null,
      `OutlineWorkspace must not contain font sizes < 0.75rem (12px), found: ${JSON.stringify(outlineMatches)}`
    );
    assert.match(
      media640,
      /\.settings-card\s+button\.btn[^}]*width:\s*100%\s*!important;/s,
      'Settings buttons must be 100% width on mobile <= 640px'
    );
  });

  it('17. [LOW] Toast Max Width: max-width calc(100vw - 32px) and word-break break-word', () => {
    assert.match(
      indexCss,
      /\.toast\s*\{[^}]*max-width:\s*calc\(100vw - 32px\);[^}]*word-break:\s*break-word;/s,
      '.toast must declare max-width calc(100vw - 32px) and word-break: break-word'
    );
  });

  it('18. [CRITICAL] Item M-01: Form Simpan Key YouTube di Radar Tren (TrendRadar.tsx & index.css)', () => {
    // TrendRadar.tsx markup
    assert.ok(trendRadarTsx.includes('className="trend-radar-content-area"'), 'TrendRadar must define .trend-radar-content-area');
    assert.ok(!trendRadarTsx.includes('style={{ padding: \'20px\' }}'), 'TrendRadar must avoid rigid inline padding on content area');
    assert.ok(trendRadarTsx.includes('className="yt-alert-card"'), 'TrendRadar must declare .yt-alert-card class');
    assert.ok(trendRadarTsx.includes('className="yt-alert-inner"'), 'TrendRadar must declare .yt-alert-inner class');
    assert.ok(trendRadarTsx.includes('className="yt-api-key-form"'), 'TrendRadar must declare .yt-api-key-form class');
    assert.ok(trendRadarTsx.includes('className="yt-api-key-input"'), 'TrendRadar must declare .yt-api-key-input class');
    assert.ok(trendRadarTsx.includes('className="btn btn-primary yt-api-key-button"'), 'TrendRadar must declare .yt-api-key-button class');
    assert.ok(trendRadarTsx.includes('className="yt-alert-actions"'), 'TrendRadar must declare .yt-alert-actions class');

    // Base CSS
    assert.match(indexCss, /\.trend-radar-content-area\s*\{[^}]*padding:\s*20px;/s, 'trend-radar-content-area must define base padding');
    assert.match(indexCss, /\.yt-alert-card\s*\{[^}]*overflow-wrap:\s*anywhere;/s, 'yt-alert-card must protect against text overflow');
    assert.match(indexCss, /\.yt-api-key-form\s*\{[^}]*display:\s*flex;/s, 'yt-api-key-form must define display: flex');

    // Mobile CSS (<= 640px)
    assert.match(
      media640,
      /\.yt-api-key-form\s*\{[^}]*flex-direction:\s*column\s*!important;[^}]*width:\s*100%\s*!important;/s,
      'yt-api-key-form must be full-width vertical column on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.yt-api-key-input\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-height:\s*42px\s*!important;/s,
      'yt-api-key-input must be 100% width with min 42px height on <= 640px'
    );
    assert.match(
      media640,
      /\.yt-api-key-button\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-height:\s*44px\s*!important;/s,
      'yt-api-key-button must be 100% width with min 44px touch target on <= 640px'
    );
    assert.match(
      media640,
      /\.yt-alert-card\s*\{[^}]*box-sizing:\s*border-box\s*!important;[^}]*max-width:\s*100%\s*!important;/s,
      'yt-alert-card must constrain width and prevent horizontal push on <= 640px'
    );
  });

  it('19. [CRITICAL] Item M-02: Transformasi Tabel Desktop ke Mobile Card List (ContentTable.tsx & index.css)', () => {
    // ContentTable.tsx markup
    assert.ok(contentTableTsx.includes('className="desktop-table"'), 'ContentTable must identify desktop table with .desktop-table');
    assert.ok(contentTableTsx.includes('className="mobile-card-list"'), 'ContentTable must declare .mobile-card-list');
    assert.ok(contentTableTsx.includes('className="idea-mobile-card glass"'), 'ContentTable must render .idea-mobile-card');
    assert.ok(contentTableTsx.includes('mobile-card-title-btn'), 'Mobile card must provide clickable title button');
    assert.ok(contentTableTsx.includes('mobile-card-source'), 'Mobile card must display source badge');
    assert.ok(contentTableTsx.includes('renderSourceBadge'), 'ContentTable must use renderSourceBadge helper');
    assert.ok(contentTableTsx.includes('mobile-card-status'), 'Mobile card must display status badge');
    assert.ok(contentTableTsx.includes('mobile-card-hook-badge'), 'Mobile card must display hook formula badge');
    assert.ok(contentTableTsx.includes('validating-indicator'), 'ContentTable must mark validating row action with validating-indicator');
    assert.ok(contentTableTsx.includes('mobile-card-actions'), 'Mobile card must provide thumb-friendly action row');
    assert.ok(contentTableTsx.includes('mobile-card-primary-action'), 'Mobile card must render primary action');
    assert.ok(contentTableTsx.includes('mobile-card-secondary-actions'), 'Mobile card must render edit and delete actions');

    // Base CSS
    assert.match(indexCss, /\.mobile-card-list\s*\{[^}]*display:\s*none;/s, '.mobile-card-list must be hidden on desktop');
    assert.match(indexCss, /\.mobile-card-hook-badge\s*\{[^}]*display:\s*inline-flex;/s, 'index.css must style .mobile-card-hook-badge');

    // Mobile CSS (<= 640px)
    assert.match(
      media640,
      /\.desktop-table[^}]*display:\s*none\s*!important;/s,
      'Desktop table must be hidden on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.mobile-card-list\s*\{[^}]*display:\s*flex\s*!important;[^}]*flex-direction:\s*column\s*!important;/s,
      'mobile-card-list must be active vertical flex container on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.mobile-card-title-btn\s*\{[^}]*min-width:\s*0\s*!important;[^}]*width:\s*100%\s*!important;/s,
      'mobile-card-title-btn must constrain width and min-width to prevent flex overflow'
    );
    assert.match(
      media640,
      /\.mobile-card-actions\s*\{[^}]*flex-wrap:\s*wrap/s,
      'mobile-card-actions must wrap gracefully on narrow screens'
    );
    assert.match(
      media640,
      /\.mobile-card-primary-action\s+\.row-action\s*\{[^}]*min-height:\s*42px\s*!important;/s,
      'Mobile card primary thumb action must meet 40-44px touch target minimum'
    );
    assert.match(
      media640,
      /\.mobile-card-secondary-actions\s+\.row-action\s*\{[^}]*min-height:\s*42px\s*!important;[^}]*min-width:\s*42px\s*!important;/s,
      'Mobile card secondary thumb actions must meet 40-44px touch target minimum'
    );
  });

  it('20. [CRITICAL] Item M-03: Kartu Berkas Responsif di File Manager (FileManager.tsx & index.css)', () => {
    // FileManager.tsx markup
    assert.ok(!fileManagerTsx.includes('<div className="table-scroll">'), 'FileManager must eliminate rigid .table-scroll wrapper');
    assert.ok(fileManagerTsx.includes('className="file-list-container"'), 'FileManager must declare .file-list-container');
    assert.ok(fileManagerTsx.includes('className="file-cards-grid"'), 'FileManager must declare .file-cards-grid');
    assert.ok(fileManagerTsx.includes('className="file-card-main"'), 'FileManager must declare .file-card-main');
    assert.ok(fileManagerTsx.includes('className="file-card-actions"'), 'FileManager must declare .file-card-actions');
    assert.ok(fileManagerTsx.includes('Pratinjau'), 'FileManager must render Pratinjau button');
    assert.ok(fileManagerTsx.includes('Hapus'), 'FileManager must render Hapus button');
    assert.ok(!fileManagerTsx.includes('style={{ display: \'inline-flex\', alignItems: \'center\', gap: 4 }}'), 'FileManager must avoid redundant inline button styling');

    // Base CSS
    assert.match(indexCss, /\.file-card-main\s*\{[^}]*display:\s*flex;/s, '.file-card-main must be flex container');
    assert.match(indexCss, /\.file-card-actions\s*\{[^}]*display:\s*flex;/s, '.file-card-actions must be flex container');

    // Mobile CSS (<= 640px)
    assert.match(
      media640,
      /\.file-card\s*\{[^}]*flex-direction:\s*column\s*!important;[^}]*align-items:\s*stretch\s*!important;[^}]*gap:\s*12px\s*!important;/s,
      'file-card must stack vertically with stretch alignment on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.file-card-actions\s*\{[^}]*width:\s*100%\s*!important;/s,
      'file-card-actions must span full width on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.file-card-actions\s+\.row-action\s*\{[^}]*flex:\s*1\s+1\s+0\s*!important;[^}]*min-height:\s*42px\s*!important;/s,
      'file-card action buttons must be proportionally stretched with min 42px touch target'
    );
    assert.match(
      media640,
      /\.file-info\s+strong\s*\{[^}]*white-space:\s*normal\s*!important;[^}]*word-break:\s*break-word\s*!important;/s,
      'file-info strong must wrap long filenames without horizontal overflow'
    );
    assert.match(
      media640,
      /\.file-info\s+strong\s*\{[^}]*min-width:\s*0\s*!important;/s,
      'file-info strong must declare min-width: 0 on mobile to prevent flex blowout'
    );
  });

  it('21. [FASE 2 / N-01, N-02] Redesain Navbar Mobile: Terminal & Bot Telegram disembunyikan dari navbar mobile, brand ZEINITY dipulihkan', () => {
    // 1. Terminal button & bot status indicator are hidden on mobile <= 640px
    assert.match(
      media640,
      /\.topbar\s+\.topbar-terminal-btn[^}]*display:\s*none\s*!important;/s,
      'Terminal button must be hidden from Topbar on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.topbar\s+\.bot-status-dot[^}]*display:\s*none\s*!important;/s,
      'Bot Telegram indicator must be hidden from Topbar on mobile <= 640px'
    );

    // 2. Brand identity restored on mobile with higher specificity
    assert.match(
      media640,
      /\.topbar\s+\.brand\s+\.brand-name\s*\{[^}]*display:\s*inline-block\s*!important;/s,
      'Brand name ZEINITY must be restored with higher specificity in mobile navbar'
    );

    // 3. Provider pill communicative label on mobile
    assert.match(
      media640,
      /\.quick-provider-pill\s+\.quick-pill-provider[^}]*display:\s*inline-block\s*!important;/s,
      'Provider pill must display readable provider label on mobile'
    );

    // 4. Markup contains identifying classes
    assert.ok(topbarTsx.includes('topbar-terminal-btn'), 'Topbar must declare topbar-terminal-btn class');
    assert.ok(topbarTsx.includes('topbar-bot-status'), 'Topbar must declare topbar-bot-status class');
    assert.ok(topbarTsx.includes('quick-pill-provider'), 'Topbar must declare quick-pill-provider for mobile');
    assert.ok(topbarTsx.includes('quick-provider-wrapper'), 'Topbar must declare quick-provider-wrapper for flex right-alignment');
    assert.ok(topbarTsx.includes('brand-name'), 'Topbar must render brand-name');
    assert.ok(topbarTsx.includes('quick-provider-pill'), 'Topbar must render quick-provider-pill');

    // 5. CSS right-side alignment & name suppression
    assert.match(
      media640,
      /\.topbar\s+\.quick-provider-wrapper\s*\{[^}]*margin-left:\s*auto\s*!important;/s,
      'quick-provider-wrapper must align to right on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.quick-provider-pill\s+\.quick-pill-name[^}]*display:\s*none\s*!important;/s,
      'quick-pill-name must be suppressed on mobile <= 640px to prevent pill overflow'
    );
  });

  it('22. [FASE 2 / N-01, N-02] Akses Terminal & Status Bot Telegram di Sidebar Drawer (Sidebar.tsx & index.css)', () => {
    const sidebarTsx = fs.readFileSync(path.join(rootDir, 'src/components/Sidebar.tsx'), 'utf8');

    // 1. Sidebar imports and uses Terminal and Bot
    assert.ok(sidebarTsx.includes('useTerminal'), 'Sidebar must import useTerminal hook');
    assert.ok(sidebarTsx.includes('sidebar-system-tools'), 'Sidebar must declare sidebar-system-tools section');
    assert.ok(sidebarTsx.includes('Log Terminal Aktivitas'), 'Sidebar must provide terminal access button');
    assert.ok(sidebarTsx.includes('Bot Telegram'), 'Sidebar must provide Telegram Bot status item');

    // 2. CSS styles for sidebar-system-tools and 44px touch targets on mobile
    assert.match(indexCss, /\.sidebar-system-tools\s*\{[^}]*display:\s*flex;/s, 'index.css must style .sidebar-system-tools');
    assert.match(indexCss, /\.sidebar-tool-item\s*\{[^}]*min-height:\s*40px;/s, 'Sidebar tool items must meet base touch target');
    assert.match(media768, /\.sidebar-tool-item\s*\{[^}]*min-height:\s*44px\s*!important;/s, 'Sidebar tool items must meet 44px touch target on mobile <= 768px');
  });

  it('23. [FASE 2 / M-11] Penutupan Celah Drawer Mengambang di Layar Mobile (index.css)', () => {
    // Media 768 must attach drawer full height with 0 top/bottom and right-only border-radius
    assert.match(
      media768,
      /\.sidebar\s*\{[^}]*top:\s*0\s*!important;[^}]*bottom:\s*0\s*!important;[^}]*height:\s*100dvh\s*!important;[^}]*border-radius:\s*0\s+16px\s+16px\s+0\s*!important;/s,
      'Mobile drawer must attach full viewport height (100dvh) without floating margin gaps'
    );
  });

  it('24. [FASE 2 / N-03, M-10] Pencarian Adaptif Peka Konteks & Navbar Mobile Slim 56px–60px (Topbar.tsx, App.tsx, index.css)', () => {
    const appTsx = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');

    // 1. Topbar applies non-table class when not on table views
    assert.ok(topbarTsx.includes('topbar-non-table'), 'Topbar must conditionally apply topbar-non-table');
    assert.ok(topbarTsx.includes('mobile-search-toggle'), 'Topbar must provide collapsible mobile search toggle');
    assert.ok(topbarTsx.includes('searchInputRef'), 'Topbar must bind searchInputRef for auto-focus');

    // 2. CSS hides search box on non-table views on mobile <= 640px and keeps height <= 62px
    assert.match(
      media640,
      /\.topbar\.topbar-non-table:not\(\.mobile-search-open\)\s+\.search-box\s*\{[^}]*display:\s*none\s*!important;/s,
      'Search box must be hidden on non-table views by default on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.topbar\.topbar-non-table:not\(\.mobile-search-open\)\s*\{[^}]*max-height:\s*62px\s*!important;[^}]*min-height:\s*56px\s*!important;/s,
      'Topbar height must be compressed to <= 62px on non-table views on mobile'
    );

    // 3. App.tsx context-aware search placeholder and safe routing without forced keystroke redirect
    assert.ok(appTsx.includes('searchPlaceholder'), 'App.tsx must provide contextual searchPlaceholder');
    assert.ok(appTsx.includes('handleSearchChange'), 'App.tsx must define handleSearchChange');
    assert.ok(appTsx.includes('handleSearchSubmit'), 'App.tsx must define handleSearchSubmit for explicit Enter submission');
    assert.ok(appTsx.includes('isTableActive'), 'App.tsx must define isTableActive');

    // CRITICAL: handleSearchChange MUST NOT forcibly redirect to 'ideas' on keystroke in non-table views
    const searchChangeFnMatch = appTsx.match(/const handleSearchChange\s*=\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\};/);
    assert.ok(searchChangeFnMatch, 'handleSearchChange function must be defined');
    assert.ok(
      !searchChangeFnMatch[1].includes("setActiveView('ideas')"),
      'handleSearchChange must NOT redirect to ideas on keystroke in non-table views'
    );
  });

  it('25. [FASE 3 / M-05] Transformasi Filter Pilar RSS Menjadi Swipeable Chips Horizontal (RSSReader.tsx & index.css)', () => {
    // 1. rss-pillar-chips has overflow-x: auto and no-wrap in mobile <= 640px
    assert.match(
      media640,
      /\.rss-pillar-chips[^{]*\{[^}]*display:\s*flex\s*!important;[^}]*overflow-x:\s*auto\s*!important;[^}]*flex-wrap:\s*nowrap\s*!important;/s,
      'RSS pillar container must be a horizontal swipeable flex row without wrapping on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.rss-pillar-chips[^{]*\{[^}]*gap:\s*8px\s*!important;[^}]*padding-bottom:\s*6px\s*!important;[^}]*-webkit-overflow-scrolling:\s*touch\s*!important;[^}]*scrollbar-width:\s*none\s*!important;/s,
      'RSS pillar container must include smooth touch scrolling and hidden scrollbar'
    );

    // 2. Chip buttons do not shrink, wrap or overflow
    assert.match(
      media640,
      /\.rss-pillar-chip[^{]*\{[^}]*flex-shrink:\s*0\s*!important;[^}]*white-space:\s*nowrap\s*!important;[^}]*border-radius:\s*999px\s*!important;/s,
      'RSS pillar chips must have flex-shrink: 0, white-space: nowrap, and rounded pill border-radius'
    );
    assert.match(
      indexCss,
      /\.rss-pillar-chip\s*\{[^}]*flex-shrink:\s*0;/s,
      'RSS pillar chips must also have flex-shrink: 0 in base CSS for non-crushing layout'
    );

    // 3. RSSReader markup contains chip container and chips
    assert.ok(rssReaderTsx.includes('rss-pillar-chips'), 'RSSReader must render rss-pillar-chips container');
    assert.ok(rssReaderTsx.includes('rss-pillar-chip'), 'RSSReader must render rss-pillar-chip class on buttons');
    assert.ok(rssReaderTsx.includes('rss-filter-bar'), 'RSSReader must render rss-filter-bar class');
    assert.ok(rssReaderTsx.includes('rss-filter-search'), 'RSSReader must render rss-filter-search class');
  });

  it('26. [FASE 3 / M-12] Eliminasi Duplikasi Tombol Kelola Sumber di RSSReader (RSSReader.tsx)', () => {
    // 1. Single consolidated button in hero action header
    assert.match(
      rssReaderTsx,
      /<div className="hero-actions">[\s\S]*?Kelola Sumber Feed[\s\S]*?<\/div>/s,
      'RSSReader must render single consolidated Kelola Sumber Feed button in hero-actions'
    );

    // 2. Status switcher row does NOT contain duplicate Kelola Sumber button
    const statusSwitcherMatch = rssReaderTsx.match(/className="rss-status-switcher"[\s\S]*?<\/div>/);
    assert.ok(statusSwitcherMatch, 'rss-status-switcher must be defined');
    assert.ok(
      !statusSwitcherMatch[0].includes('Kelola Sumber'),
      'rss-status-switcher must NOT contain duplicate Kelola Sumber button'
    );

    // 3. Count occurrences of interactive buttons with "Kelola Sumber" in the main reader view (outside modals/alerts)
    const buttonRegex = /<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?Kelola Sumber(?:(?!<\/button>)[\s\S])*?<\/button>/g;
    const buttonMatches = [...rssReaderTsx.matchAll(buttonRegex)];
    assert.strictEqual(
      buttonMatches.length,
      1,
      'RSSReader must have exactly ONE button with "Kelola Sumber" (eliminating duplication)'
    );
  });

  it('27. [FASE 3 / M-07] Layout 1 Kolom Model Router di Pengaturan (Settings.tsx & index.css)', () => {
    // 1. Settings.tsx applies model-mode-grid and model-mode-card classes
    assert.ok(settingsTsx.includes('model-mode-grid'), 'Settings.tsx must apply model-mode-grid');
    assert.ok(settingsTsx.includes('model-router-grid'), 'Settings.tsx must apply model-router-grid');
    assert.ok(settingsTsx.includes('model-mode-card'), 'Settings.tsx must apply model-mode-card');
    assert.ok(settingsTsx.includes('model-select-row'), 'Settings.tsx must apply model-select-row');
    assert.ok(settingsTsx.includes('recommendation-chips'), 'Settings.tsx must apply recommendation-chips');

    // 2. CSS enforces 1-column layout on mobile <= 768px and <= 640px
    assert.match(
      media768,
      /\.model-mode-grid[^{]*\{[^}]*grid-template-columns:\s*1fr\s*!important;[^}]*width:\s*100%\s*!important;/s,
      'model-mode-grid must enforce 1 column and 100% width on mobile <= 768px'
    );
    assert.match(
      media640,
      /\.model-mode-grid[^{]*\{[^}]*grid-template-columns:\s*1fr\s*!important;[^}]*width:\s*100%\s*!important;/s,
      'model-mode-grid must enforce 1 column and 100% width on mobile <= 640px'
    );

    // 3. Cards & Recommendation chips take full width and stack 1 column on mobile / tablet <= 768px
    assert.match(
      media768,
      /\.model-mode-card\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-width:\s*0\s*!important;/s,
      'model-mode-card must take 100% width and min-width: 0 on mobile'
    );
    assert.match(
      media768,
      /\.recommendation-chips\s*\{[^}]*flex-direction:\s*column\s*!important;[^}]*width:\s*100%\s*!important;/s,
      'recommendation-chips must stack in 1 column on mobile <= 768px'
    );
    assert.match(
      media640,
      /\.recommendation-chips\s*\{[^}]*flex-direction:\s*column\s*!important;[^}]*width:\s*100%\s*!important;/s,
      'recommendation-chips must stack in 1 column on mobile <= 640px'
    );
  });

  it('28. [FASE 3 / M-14] Harmonisasi Filter Region & Kategori di Radar Tren (TrendRadar.tsx & index.css)', () => {
    // 1. TrendRadar.tsx applies harmonized controls and icons
    assert.ok(trendRadarTsx.includes('trend-radar-controls-bar'), 'TrendRadar must declare trend-radar-controls-bar');
    assert.ok(trendRadarTsx.includes('trend-radar-filters'), 'TrendRadar must declare trend-radar-filters');
    assert.ok(trendRadarTsx.includes('trend-radar-filter-item'), 'TrendRadar must declare trend-radar-filter-item');
    assert.ok(trendRadarTsx.includes('trend-radar-tabs'), 'TrendRadar must declare trend-radar-tabs');

    // Both Region (Globe) and Category (Tag) icons are rendered
    assert.match(
      trendRadarTsx,
      /<div className="trend-radar-filter-item"[^>]*>[\s\S]*?<Globe/s,
      'Region filter item must render Globe icon'
    );
    assert.match(
      trendRadarTsx,
      /<div className="trend-radar-filter-item"[^>]*>[\s\S]*?<Tag/s,
      'Category filter item must render Tag icon'
    );

    // CRITICAL: Filter selects must NOT have inline border/background causing ugly double-border boxes
    const filterItemSnippetMatch = trendRadarTsx.match(/className="trend-radar-filter-item"[\s\S]*?<\/select>/);
    assert.ok(filterItemSnippetMatch, 'trend-radar-filter-item must encapsulate select');
    assert.ok(
      !filterItemSnippetMatch[0].includes("border: '1px solid"),
      'Select must NOT have inline border overriding pill container'
    );

    // 2. CSS enforces balanced grid and >= 40px touch targets on mobile <= 640px
    assert.match(
      media640,
      /\.trend-radar-filters\s*\{[^}]*display:\s*grid\s*!important;/s,
      'trend-radar-filters must use responsive grid on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.trend-radar-filter-item\s*\{[^}]*min-height:\s*40px\s*!important;/s,
      'trend-radar-filter-item must enforce minimum touch target 40px on mobile <= 640px'
    );
    assert.match(
      media640,
      /\.trend-radar-tabs\s+\.tab\s*\{[^}]*min-height:\s*40px\s*!important;/s,
      'trend-radar-tabs must enforce minimum touch target 40px on mobile <= 640px'
    );
  });

  it('29. [FASE 4 / M-04] Card Padding & Spacing Breathing Room pada Mobile (index.css & views)', () => {
    // 1. Mobile container padding 12px-14px for major containers
    assert.match(
      media640,
      /\.pipeline-panel[^{]*\{[^}]*padding:\s*14px\s*!important;[^}]*box-sizing:\s*border-box\s*!important;/s,
      'Container cards must provide 14px compact padding on mobile <= 640px'
    );
    assert.ok(
      media640.includes('.overview-card'),
      'media640 must include .overview-card in mobile breathing room rule'
    );
    assert.ok(
      media640.includes('.analytics-card'),
      'media640 must include .analytics-card in mobile breathing room rule'
    );
    assert.ok(
      media640.includes('.detail-card'),
      'media640 must include .detail-card in mobile breathing room rule'
    );

    // 2. Word break and text overflow protection
    assert.match(
      media640,
      /word-break:\s*break-word;[^}]*overflow-wrap:\s*anywhere;[^}]*min-width:\s*0;/s,
      'Headings, paragraphs, and cards must prevent flex blowout with word-break and overflow-wrap'
    );

    // 3. Overview views declare overview-card
    assert.ok(overviewTsx.includes('overview-card'), 'Overview.tsx must declare overview-card class');
  });

  it('30. [FASE 4 / M-06] Visual Hint Tab Scroll Indicator & Fade Masking (index.css & views)', () => {
    // 1. Gradient fade mask hint on horizontal swipeable tab and chip containers
    assert.match(
      media640,
      /\.sub-tabs[^{]*\{[^}]*mask-image:\s*linear-gradient\(to right,\s*black\s*calc\(100% - 24px\),\s*transparent\s*100%\);/s,
      'Scrollable tabs must render right edge gradient fade hint on mobile <= 640px'
    );
    assert.ok(
      media640.includes('.radar-tabs'),
      'media640 must include .radar-tabs in fade mask rule'
    );
    assert.ok(
      media640.includes('.rss-pillar-chips'),
      'media640 must include .rss-pillar-chips in fade mask rule'
    );

    // 2. Component markup declares swipeable tab identifiers
    assert.ok(trendRadarTsx.includes('radar-tabs'), 'TrendRadar must declare radar-tabs class');
    assert.ok(trendRadarTsx.includes('sub-tabs'), 'TrendRadar must declare sub-tabs class');
    assert.ok(rssReaderTsx.includes('rss-pillar-chips'), 'RSSReader must declare rss-pillar-chips class');
  });

  it('31. [FASE 4 / M-08, M-09] Virtual Keyboard Ergonomics & Bottom Safe Area Inset pada Kanvas Naskah (ScriptDetail.tsx, ScriptDraftStudio.tsx & index.css)', () => {
    // 1. Adaptive keyboard margin, dynamic viewport height, and bottom safe-area inset
    assert.match(
      media640,
      /\.zen-editor-textarea[^{]*\{[^}]*scroll-margin-bottom:\s*240px;[^}]*height:\s*min\(48dvh,\s*380px\);[^}]*min-height:\s*220px;[^}]*padding-bottom:\s*calc\(16px \+ env\(safe-area-inset-bottom,\s*0px\)\);/s,
      'Script editor textarea must apply scroll-margin-bottom 240px, dynamic dvh height, and safe-area padding on mobile'
    );
    assert.ok(
      media640.includes('.script-editor-container'),
      'media640 must include .script-editor-container in keyboard ergonomics rule'
    );
    assert.ok(
      media640.includes('.dual-pane-editor'),
      'media640 must include .dual-pane-editor in keyboard ergonomics rule'
    );

    // 2. Thumb-friendly bottom action rows with min 44px touch targets and safe area insets
    assert.match(
      media640,
      /\.script-bottom-actions[^{]*\{[^}]*padding-bottom:\s*calc\(12px \+ env\(safe-area-inset-bottom,\s*0px\)\)\s*!important;/s,
      'Bottom action rows must include safe-area inset bottom on mobile'
    );
    assert.match(
      media640,
      /\.script-bottom-actions\s+\.btn[^{]*\{[^}]*min-height:\s*44px\s*!important;/s,
      'Bottom action buttons must have min 44px touch target on mobile'
    );

    // 3. Narrative beat tabs single-row horizontal swipeable layout
    assert.match(
      media640,
      /\.beat-deconstruction-bar\s*\{[^}]*flex-wrap:\s*nowrap\s*!important;[^}]*overflow-x:\s*auto\s*!important;/s,
      'Beat tabs must be single-row horizontal scrollable on mobile'
    );

    // 4. Script views declare identifying classes
    assert.ok(scriptDetailTsx.includes('dual-pane-editor'), 'ScriptDetail must declare dual-pane-editor class');
    assert.ok(scriptDetailTsx.includes('script-editor-container'), 'ScriptDetail must declare script-editor-container class');
    assert.ok(scriptDraftStudioTsx.includes('script-editor-container'), 'ScriptDraftStudio must declare script-editor-container class');
    assert.ok(scriptDraftStudioTsx.includes('zen-editor-textarea'), 'ScriptDraftStudio must declare zen-editor-textarea class');
    assert.ok(scriptDraftStudioTsx.includes('script-bottom-actions'), 'ScriptDraftStudio must declare script-bottom-actions class');
    assert.ok(scriptDraftStudioTsx.includes('finishing-bottom-actions'), 'ScriptDraftStudio must declare finishing-bottom-actions class');
    assert.ok(outlineWorkspaceTsx.includes('outline-approval-bar'), 'OutlineWorkspace must declare outline-approval-bar class');
  });

  it('32. [FASE 4 / M-13, M-15] Harmonisasi Donut Chart & Tipografi Mikro (Analytics.tsx & index.css)', () => {
    // 1. Donut chart column layout and legend below chart without truncation on <= 480px
    assert.match(
      media480,
      /\.donut-chart\s*\{[^}]*flex-direction:\s*column;[^}]*align-items:\s*center;[^}]*gap:\s*16px;/s,
      'Donut chart must stack vertically with centered alignment on <= 480px'
    );
    assert.match(
      media480,
      /\.donut-legend\s*\{[^}]*margin-left:\s*0\s*!important;[^}]*width:\s*100%\s*!important;/s,
      'Donut legend must take 100% width on <= 480px'
    );
    assert.match(
      media480,
      /\.legend-item\s*\{[^}]*font-size:\s*0\.8rem\s*!important;[^}]*justify-content:\s*space-between;/s,
      'Donut legend items must be >= 12px (0.8rem) with space-between layout'
    );

    // 2. High-contrast micro typography (AMOLED contrast & font >= 12px / 0.75rem)
    assert.match(
      media640,
      /\.bar-label\s*\{[^}]*font-size:\s*0\.75rem\s*!important;[^}]*color:\s*#cbd5e1\s*!important;/s,
      'Bar chart label must be >= 0.75rem (12px) with high-contrast color on mobile'
    );
    assert.match(
      media640,
      /\.metric-change\s*\{[^}]*font-size:\s*0\.75rem\s*!important;[^}]*color:\s*#cbd5e1\s*!important;/s,
      'Metric change badge must be >= 0.75rem (12px) with high-contrast color on mobile'
    );
    assert.match(
      media640,
      /\.status-badge[^{]*\{[^}]*font-size:\s*0\.75rem\s*!important;/s,
      'Status badges and micro tags must enforce >= 0.75rem (12px) font size on mobile'
    );

    // 3. Analytics.tsx markup uses analytics-card and does not contain sub-12px font sizes
    assert.ok(analyticsTsx.includes('analytics-card'), 'Analytics.tsx must declare analytics-card class');
    assert.ok(analyticsTsx.includes('legend-label-group'), 'Analytics.tsx must group dot and text in legend-label-group');
    assert.match(
      indexCss,
      /\.legend-dot\s*\{[^}]*flex-shrink:\s*0/s,
      'legend-dot must have flex-shrink: 0 to prevent shrinking to 0 width'
    );
    const sub12pxRegex = /fontSize:\s*['"]0\.(?:[0-6]\d|7[0-4])rem['"]/g;
    const analyticsMatches = analyticsTsx.match(sub12pxRegex);
    assert.strictEqual(
      analyticsMatches,
      null,
      `Analytics.tsx must not contain font sizes < 0.75rem (12px), found: ${JSON.stringify(analyticsMatches)}`
    );
  });
});
