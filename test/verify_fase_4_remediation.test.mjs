import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper to calculate relative luminance of sRGB hex color
function hexToLuminance(hex) {
  const cleanHex = hex.replace('#', '').trim();
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Calculate WCAG contrast ratio between two hex colors
function getContrastRatio(hex1, hex2) {
  const lum1 = hexToLuminance(hex1);
  const lum2 = hexToLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('Fase 4 Remediation Verification Suite (Aksesibilitas & Ergonomi Responsif P2)', () => {
  const cssPath = path.join(projectRoot, 'src', 'index.css');
  const topbarPath = path.join(projectRoot, 'src', 'components', 'Topbar.tsx');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const topbarContent = fs.readFileSync(topbarPath, 'utf8');
  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
  const contentTableContent = fs.readFileSync(contentTablePath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // ─── 1. Item 4.1: Kontras Warna Token --muted & Tipografi Mikro (NEW-F-30 & F-13) ───
  describe('1. Item 4.1: Kontras Warna Token --muted & Tipografi Mikro', () => {
    it('Token --muted must be upgraded to high-contrast #9eb3cf and satisfy WCAG AA >= 4.5:1 against dark surfaces', () => {
      assert.match(
        cssContent,
        /--muted:\s*#9eb3cf;/,
        'src/index.css must define --muted as #9eb3cf'
      );

      // Contrast ratio test against dark backgrounds (#071327 and #061125)
      const contrastBg1 = getContrastRatio('#9eb3cf', '#071327');
      const contrastBg2 = getContrastRatio('#9eb3cf', '#061125');
      assert.ok(
        contrastBg1 >= 4.5,
        `Contrast ratio against --bg-1 (#071327) must be >= 4.5:1, got ${contrastBg1.toFixed(2)}:1`
      );
      assert.ok(
        contrastBg2 >= 4.5,
        `Contrast ratio against gradient dark (#061125) must be >= 4.5:1, got ${contrastBg2.toFixed(2)}:1`
      );
    });

    it('Micro-typography font sizes in index.css must be upgraded to >= 0.75rem (12px)', () => {
      // Check key classes
      const microClasses = [
        '.eyebrow',
        '.key-mask',
        '.provider-note',
        '.provider-line',
        '.file-info span',
        '.title-card .mode-label',
        '.alert-category-badge',
        '.alert-diag-label',
        '.alert-root-cause-title',
        '.alert-tech-box-header',
        '.rec-badge',
        '.rec-check',
        '.editor-maximize-btn',
        '.collapsed-pill',
        '.word-meter-pill',
      ];

      for (const cls of microClasses) {
        assert.ok(
          cssContent.includes(cls),
          `src/index.css must contain styles for ${cls}`
        );
      }

      // Check specific font-size values for micro classes are 0.75rem
      assert.match(cssContent, /\.eyebrow\s*\{[^}]*font-size:\s*0\.75rem/s);
      assert.match(cssContent, /\.key-mask\s*\{[^}]*font-size:\s*0\.75rem/s);
      assert.match(cssContent, /\.provider-note\s*\{[^}]*font-size:\s*0\.75rem/s);
      assert.match(cssContent, /\.provider-line\s*\{[^}]*font-size:\s*0\.75rem/s);
    });

    it('Topbar.tsx dropdowns have legible typography with font sizes >= 0.75rem', () => {
      // No remaining sub-12px inline styles in Topbar dropdowns
      assert.ok(
        !topbarContent.includes("fontSize: '0.62rem'") && !topbarContent.includes('fontSize: "0.62rem"'),
        'Topbar.tsx must not contain sub-12px font-size 0.62rem'
      );
      assert.ok(
        !topbarContent.includes("fontSize: '0.64rem'") && !topbarContent.includes('fontSize: "0.64rem"'),
        'Topbar.tsx must not contain sub-12px font-size 0.64rem'
      );
      assert.ok(
        !topbarContent.includes("fontSize: '0.68rem'") && !topbarContent.includes('fontSize: "0.68rem"'),
        'Topbar.tsx must not contain sub-12px font-size 0.68rem'
      );
      assert.ok(
        !topbarContent.includes("fontSize: '0.72rem'") && !topbarContent.includes('fontSize: "0.72rem"'),
        'Topbar.tsx must not contain sub-12px font-size 0.72rem'
      );
    });
  });

  // ─── 2. Item 4.2: Optimasi Tata Letak Tablet Studio Naskah <= 960px (F-14) ───
  describe('2. Item 4.2: Optimasi Tata Letak Tablet Studio Naskah (<= 960px)', () => {
    it('ScriptDetail.tsx implements tablet sub-tab toggle state and controls', () => {
      assert.ok(
        scriptDetailContent.includes('tabletStudioTab'),
        'ScriptDetail.tsx must define tabletStudioTab state'
      );
      assert.ok(
        scriptDetailContent.includes('setTabletStudioTab'),
        'ScriptDetail.tsx must define setTabletStudioTab setter'
      );
      assert.ok(
        scriptDetailContent.includes('tablet-studio-toggle'),
        'ScriptDetail.tsx must render .tablet-studio-toggle container'
      );
      assert.ok(
        scriptDetailContent.includes('Outline Studio'),
        'ScriptDetail.tsx must render Outline Studio tab button'
      );
      assert.ok(
        scriptDetailContent.includes('Draft Studio'),
        'ScriptDetail.tsx must render Draft Studio tab button'
      );
      assert.ok(
        scriptDetailContent.includes('role="tablist"'),
        'ScriptDetail.tsx must specify role="tablist" for tablet sub-tab bar'
      );
      assert.ok(
        scriptDetailContent.includes('aria-selected'),
        'ScriptDetail.tsx must use aria-selected for active tablet sub-tab'
      );
    });

    it('ScriptDetail.tsx wraps outline and draft studios in responsive column wrappers', () => {
      assert.ok(
        scriptDetailContent.includes('outline-studio-col'),
        'ScriptDetail.tsx must wrap outline workspace in outline-studio-col'
      );
      assert.ok(
        scriptDetailContent.includes('draft-studio-col'),
        'ScriptDetail.tsx must wrap draft workspace in draft-studio-col'
      );
      assert.ok(
        scriptDetailContent.includes('tablet-view-'),
        'ScriptDetail.tsx must add dynamic tablet-view class to scripting-dual-pane-grid'
      );
    });

    it('index.css implements tablet responsive rules (<= 960px) for studio tabs', () => {
      assert.match(
        cssContent,
        /@media\s*\(max-width:\s*960px\)\s*\{[\s\S]*?\.tablet-studio-toggle\s*\{/s,
        'index.css must display .tablet-studio-toggle under max-width: 960px'
      );
      assert.match(
        cssContent,
        /\.tablet-view-outline\s+\.draft-studio-col\s*\{[^}]*display:\s*none\s*!important/s,
        'index.css must hide draft-studio-col when tablet-view-outline is active'
      );
      assert.match(
        cssContent,
        /\.tablet-view-draft\s+\.outline-studio-col\s*\{[^}]*display:\s*none\s*!important/s,
        'index.css must hide outline-studio-col when tablet-view-draft is active'
      );
      assert.match(
        cssContent,
        /\.tablet-tab-btn\s*\{[^}]*min-height:\s*44px/s,
        'index.css must provide minimum 44px height on tablet-tab-btn for touch ergonomics'
      );
    });
  });

  // ─── 3. Item 4.3: Pembersihan Header Mobile Resolusi 375px <= 620px (F-15) ────
  describe('3. Item 4.3: Pembersihan Header Mobile Resolusi 375px (<= 620px)', () => {
    it('Topbar.tsx wraps secondary pill texts with classes for mobile suppression', () => {
      assert.ok(
        topbarContent.includes('quick-pill-name'),
        'Topbar.tsx must wrap provider name in .quick-pill-name'
      );
      assert.ok(
        topbarContent.includes('quick-pill-badge'),
        'Topbar.tsx must wrap provider model badge in .quick-pill-badge'
      );
      assert.ok(
        topbarContent.includes('quick-pill-status'),
        'Topbar.tsx must wrap provider status text in .quick-pill-status'
      );
      assert.ok(
        topbarContent.includes('bot-label'),
        'Topbar.tsx must wrap bot text in .bot-label'
      );
    });

    it('index.css suppresses secondary header text labels on small viewports (<= 620px)', () => {
      assert.match(
        cssContent,
        /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.quick-pill-name[^}]*display:\s*none\s*!important/s,
        'index.css must hide .quick-pill-name under max-width: 620px'
      );
      assert.match(
        cssContent,
        /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.bot-label[^}]*display:\s*none\s*!important/s,
        'index.css must hide .bot-label under max-width: 620px'
      );
    });

    it('index.css guarantees minimum 44x44px touch targets on mobile topbar actions', () => {
      assert.match(
        cssContent,
        /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.avatar\s*\{[^}]*width:\s*44px;\s*height:\s*44px/s,
        'index.css must enforce 44x44px avatar touch target under max-width: 620px'
      );
      assert.match(
        cssContent,
        /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.quick-provider-pill\s*\{[^}]*min-height:\s*44px/s,
        'index.css must enforce minimum 44px touch target on .quick-provider-pill under max-width: 620px'
      );
      assert.match(
        cssContent,
        /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.bot-status-dot\s*\{[^}]*min-height:\s*44px/s,
        'index.css must enforce minimum 44px touch target on .bot-status-dot under max-width: 620px'
      );
    });
  });

  // ─── 4. Item 4.4: Bypass Link "Lewati ke Konten Utama" (F-17) ─────────────────
  describe('4. Item 4.4: Bypass Link "Lewati ke Konten Utama"', () => {
    it('App.tsx renders skip-link at root and targets main-content container with tabIndex={-1}', () => {
      assert.ok(
        appContent.includes('<a href="#main-content" className="skip-link">'),
        'App.tsx must render skip link targeting #main-content'
      );
      assert.ok(
        appContent.includes('Lewati ke Konten Utama'),
        'App.tsx skip link must contain accessible text'
      );
      assert.ok(
        appContent.includes('id="main-content"'),
        'App.tsx main content wrapper must have id="main-content"'
      );
      assert.ok(
        appContent.includes('tabIndex={-1}'),
        'App.tsx main content wrapper must have tabIndex={-1} for programmatic focus'
      );
    });

    it('index.css styles skip-link off-screen by default and slides into visible viewport on focus', () => {
      assert.match(
        cssContent,
        /\.skip-link\s*\{[^}]*position:\s*absolute/s,
        '.skip-link must be positioned absolutely'
      );
      assert.match(
        cssContent,
        /\.skip-link\s*\{[^}]*top:\s*-\d+px/s,
        '.skip-link must be off-screen by default'
      );
      assert.match(
        cssContent,
        /\.skip-link:focus[^{]*\{[^}]*top:\s*\d+px/s,
        '.skip-link:focus must slide into visible area with positive top offset'
      );
      assert.match(
        cssContent,
        /\.skip-link\s*\{[^}]*z-index:\s*9999/s,
        '.skip-link must have topmost z-index: 9999'
      );
    });
  });

  // ─── 5. Item 4.5: Diferensiasi Empty Filter vs Zero-State Onboarding (NEW-F-25) ─
  describe('5. Item 4.5: Diferensiasi Empty Filter vs Zero-State Onboarding', () => {
    it('ContentTable.tsx differentiates total empty workspace vs filtered empty state', () => {
      assert.ok(
        contentTableContent.includes('items.length === 0'),
        'ContentTable.tsx must inspect items.length === 0 for total empty state'
      );
      assert.ok(
        contentTableContent.includes('zero-state-onboarding'),
        'ContentTable.tsx must render .zero-state-onboarding when workspace has zero items'
      );
      assert.ok(
        contentTableContent.includes('Selamat Datang di Zeinity Creator Assistant'),
        'ContentTable.tsx must show welcoming onboarding title'
      );
      assert.ok(
        contentTableContent.includes('+ Tambah Ide Pertama'),
        'ContentTable.tsx must show CTA "+ Tambah Ide Pertama"'
      );
      assert.ok(
        contentTableContent.includes('onClick={onAddIdea}'),
        'ContentTable.tsx onboarding button must trigger onAddIdea'
      );
    });

    it('ContentTable.tsx retains filtered empty state with reset button when items exist', () => {
      assert.ok(
        contentTableContent.includes('emptyMessage'),
        'ContentTable.tsx must render contextual emptyMessage when filtered'
      );
      assert.ok(
        contentTableContent.includes('Reset Filter'),
        'ContentTable.tsx must offer Reset Filter button for filtered results'
      );
      assert.ok(
        contentTableContent.includes('onClick={handleResetFilters}'),
        'ContentTable.tsx Reset Filter button must trigger handleResetFilters'
      );
    });
  });

  // ─── 6. Item 4.6: Pembersihan tabIndex Avatar Non-Interaktif (F-11) ───────────
  describe('6. Item 4.6: Pembersihan tabIndex Avatar Non-Interaktif (F-11)', () => {
    it('Topbar.tsx user avatar has role, descriptive accessibility tags, and no misleading tabIndex={0}', () => {
      assert.ok(
        topbarContent.includes('className="avatar user-avatar"'),
        'Topbar.tsx avatar must have user-avatar class'
      );
      assert.ok(
        topbarContent.includes('role="img"'),
        'Topbar.tsx avatar must have role="img"'
      );
      assert.ok(
        !topbarContent.includes('tabIndex={0}'),
        'Topbar.tsx non-interactive avatar must NOT have tabIndex={0} (WCAG 4.1.2, F-11)'
      );
      assert.ok(
        topbarContent.includes('title="Akun: Zeinity Admin (Sesi Lokal)"'),
        'Topbar.tsx avatar must have descriptive title'
      );
      assert.ok(
        topbarContent.includes('aria-label="Profil Pengguna: Zeinity Admin"'),
        'Topbar.tsx avatar must have descriptive aria-label'
      );
    });
  });

  // ─── 7. Item 4.7: Transisi Langsung ke Detail Publikasi (F-16) ────────────────
  describe('7. Item 4.7: Transisi Langsung ke Detail Publikasi & Clean Residual Card', () => {
    it('ScriptDetail.tsx replaces temporary "Konten Selesai!" card with transition CTA and preserves revert button', () => {
      // Temporary card text must be removed
      assert.ok(
        !scriptDetailContent.includes('<h3>Konten Selesai!</h3>'),
        'ScriptDetail.tsx must remove obsolete <h3>Konten Selesai!</h3> placeholder'
      );
      assert.ok(
        scriptDetailContent.includes('Buka Detail Publikasi ➔'),
        'ScriptDetail.tsx must provide "Buka Detail Publikasi ➔" action button'
      );
      assert.ok(
        scriptDetailContent.includes('Revert ke Thumbnailing'),
        'ScriptDetail.tsx must preserve "Revert ke Thumbnailing" button for pipeline continuity'
      );
      assert.ok(
        scriptDetailContent.includes('revert-stage-btn'),
        'ScriptDetail.tsx must preserve revert-stage-btn class'
      );
    });

    it('ScriptDetail.tsx automatically triggers onViewPublished when item status is Published', () => {
      assert.ok(
        scriptDetailContent.includes('onViewPublished'),
        'ScriptDetail.tsx must accept onViewPublished prop'
      );
      assert.ok(
        scriptDetailContent.includes("if (item.status === 'Published' && onViewPublished)"),
        'ScriptDetail.tsx must auto-transition to onViewPublished when item status is Published'
      );
    });

    it('App.tsx supports direct transition to published workspace upon publication and synchronizes activeView', () => {
      assert.ok(
        appContent.includes('handleViewPublished'),
        'App.tsx must define handleViewPublished'
      );
      assert.match(
        appContent,
        /handleViewPublished\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*setActiveView\('published'\)/s,
        'App.tsx handleViewPublished must switch activeView to published'
      );
      assert.ok(
        appContent.includes("updates.status === 'Published'"),
        'App.tsx handleUpdateItem must detect transition to Published'
      );
      assert.ok(
        appContent.includes("setActiveView('published')"),
        'App.tsx must transition activeView to published'
      );
      assert.ok(
        appContent.includes('#/published/'),
        'App.tsx must update URL hash to #/published/:id'
      );
    });
  });
});
