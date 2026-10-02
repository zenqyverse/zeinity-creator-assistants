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
});
