/**
 * verify_fase_4_polish.test.mjs
 *
 * Test suite untuk Fase 4: Responsiveness, Design System & Accessibility Polish
 * - F-28: Responsivitas Tabel & Penghapusan min-width 1080px kaku di CSS
 * - F-09: Standarisasi Badge Sumber Telegram di seluruh view
 * - F-17: Konsolidasi Duplikasi Fungsi Pemformat Tanggal formatDate
 * - F-19: Status & Aksesibilitas Avatar "ZA" di Topbar
 * - F-20: Harmonisasi Bahasa Antarmuka
 * - F-21 & F-24: Kontras Warna Teks Muted & Standarisasi Token Border-Radius
 * - F-22 & F-23: Tombol Reset Filter Empty State & Validasi Metrik Views vs Likes
 * - F-30 & F-31: Aksesibilitas ARIA Form/Checkbox & Pembersihan Media Query CSS Duplikat
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Fase 4 Polish Verification Suite (F-09, F-17, F-19, F-20, F-21, F-22, F-23, F-24, F-28, F-30, F-31)', async () => {
  const indexCssPath = path.join(projectRoot, 'src', 'index.css');
  const dateLibPath = path.join(projectRoot, 'src', 'lib', 'date.ts');
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
  const overviewPath = path.join(projectRoot, 'src', 'views', 'Overview.tsx');
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const publishedDetailPath = path.join(projectRoot, 'src', 'views', 'PublishedDetail.tsx');
  const fileManagerPath = path.join(projectRoot, 'src', 'views', 'FileManager.tsx');
  const topbarPath = path.join(projectRoot, 'src', 'components', 'Topbar.tsx');
  const bulkImportPath = path.join(projectRoot, 'src', 'components', 'BulkImportModal.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');

  const indexCss = fs.readFileSync(indexCssPath, 'utf8');
  const contentTableSrc = fs.readFileSync(contentTablePath, 'utf8');
  const overviewSrc = fs.readFileSync(overviewPath, 'utf8');
  const scriptDetailSrc = fs.readFileSync(scriptDetailPath, 'utf8');
  const publishedDetailSrc = fs.readFileSync(publishedDetailPath, 'utf8');
  const fileManagerSrc = fs.readFileSync(fileManagerPath, 'utf8');
  const topbarSrc = fs.readFileSync(topbarPath, 'utf8');
  const bulkImportSrc = fs.readFileSync(bulkImportPath, 'utf8');
  const appSrc = fs.readFileSync(appPath, 'utf8');

  // ─── 1. F-28: Responsivitas Tabel & Penghapusan min-width 1080px ─────────────
  it('F-28: CSS table min-width 1080px removed and responsive table-container defined', () => {
    // Rigid 1080px table min-width must NOT exist
    assert.ok(
      !indexCss.includes('min-width: 1080px;'),
      'index.css must not have min-width: 1080px on table'
    );
    // Table must use min-width: 100%
    assert.ok(
      indexCss.includes('min-width: 100%;'),
      'index.css table must have min-width: 100%'
    );
    // .table-container utility exists with overflow-x auto and -webkit-overflow-scrolling
    assert.ok(
      indexCss.includes('.table-container'),
      'index.css must declare .table-container class'
    );
    assert.ok(
      indexCss.includes('overflow-x: auto;'),
      'index.css .table-container must have overflow-x: auto'
    );
    assert.ok(
      indexCss.includes('-webkit-overflow-scrolling: touch;'),
      'index.css .table-container must support smooth mobile touch scrolling'
    );

    // Wrapper in ContentTable and Overview must include table-container
    assert.ok(
      contentTableSrc.includes('table-container'),
      'ContentTable.tsx must wrap table in responsive .table-container'
    );
    assert.ok(
      overviewSrc.includes('table-container'),
      'Overview.tsx must wrap table in responsive .table-container'
    );
  });

  // ─── 2. F-09: Standarisasi Badge Sumber Telegram ────────────────────────────
  it('F-09: Telegram source badge is standardized across Overview, ScriptDetail, PublishedDetail, and ContentTable', () => {
    // All 4 views must render Telegram (Bot) for verified messages
    assert.ok(contentTableSrc.includes('Telegram (Bot)'), 'ContentTable must render Telegram (Bot)');
    assert.ok(overviewSrc.includes('Telegram (Bot)'), 'Overview must render Telegram (Bot)');
    assert.ok(scriptDetailSrc.includes('Telegram (Bot)'), 'ScriptDetail must render Telegram (Bot)');
    assert.ok(publishedDetailSrc.includes('Telegram (Bot)'), 'PublishedDetail must render Telegram (Bot)');

    // All 4 views must render Telegram (Manual) for manual entries
    assert.ok(contentTableSrc.includes('Telegram (Manual)'), 'ContentTable must render Telegram (Manual)');
    assert.ok(overviewSrc.includes('Telegram (Manual)'), 'Overview must render Telegram (Manual)');
    assert.ok(scriptDetailSrc.includes('Telegram (Manual)'), 'ScriptDetail must render Telegram (Manual)');
    assert.ok(publishedDetailSrc.includes('Telegram (Manual)'), 'PublishedDetail must render Telegram (Manual)');

    // All 4 views must use .source-verified-bot and .source-telegram-manual classes
    for (const [name, src] of [
      ['ContentTable', contentTableSrc],
      ['Overview', overviewSrc],
      ['ScriptDetail', scriptDetailSrc],
      ['PublishedDetail', publishedDetailSrc],
    ]) {
      assert.ok(src.includes('source-verified-bot'), `${name} must use source-verified-bot CSS class`);
      assert.ok(src.includes('source-telegram-manual'), `${name} must use source-telegram-manual CSS class`);
    }
  });

  // ─── 3. F-17: Konsolidasi Duplikasi Fungsi formatDate ────────────────────────
  it('F-17: Centralized formatDate utility in src/lib/date.ts and duplicates eliminated', async () => {
    assert.ok(fs.existsSync(dateLibPath), 'src/lib/date.ts must exist');

    // Runtime testing of formatDate
    const { formatDate, formatFullDate } = await import('../src/lib/date.ts');
    assert.equal(formatDate(null), '—', 'null returns em-dash');
    assert.equal(formatDate('invalid-date'), '—', 'invalid date returns em-dash');

    // Recent date: just now
    const nowIso = new Date().toISOString();
    assert.equal(formatDate(nowIso), 'Baru saja', 'Date within 1 hour returns "Baru saja"');

    // Earlier today (> 1 hour)
    const earlierToday = new Date();
    if (earlierToday.getHours() >= 2) {
      earlierToday.setHours(earlierToday.getHours() - 2);
      assert.ok(formatDate(earlierToday.toISOString()).startsWith('Hari ini, '), 'Earlier today returns "Hari ini, HH:mm"');
    } else {
      // Between 00:00 and 02:00, no timestamp on the current calendar day is > 1 hour ago.
      // Test same-day recent timestamp returns 'Baru saja'
      assert.equal(formatDate(earlierToday.toISOString()), 'Baru saja');
    }

    // Yesterday (calendar day boundary test, e.g. yesterday at 23:00)
    const yesterdayLate = new Date();
    yesterdayLate.setDate(yesterdayLate.getDate() - 1);
    yesterdayLate.setHours(23, 0, 0, 0);
    assert.equal(formatDate(yesterdayLate.toISOString()), 'Kemarin', 'Yesterday night returns "Kemarin"');

    // Future date must not return 'Baru saja'
    const futureDate = '2027-01-01T00:00:00.000Z';
    const formattedFuture = formatDate(futureDate);
    assert.notEqual(formattedFuture, 'Baru saja', 'Future date must not return "Baru saja"');
    assert.ok(formattedFuture.includes('2027'), 'Future date includes year');

    // Full date format includes year
    const testDate = '2026-09-28T12:00:00.000Z';
    const fullFormatted = formatFullDate(testDate);
    assert.ok(fullFormatted.includes('2026'), 'formatFullDate must include 4-digit year');
    assert.ok(fullFormatted.includes('Sep'), 'formatFullDate must include Indonesian month');

    // Verify all consumer views import from @/lib/date
    assert.ok(contentTableSrc.includes("from '@/lib/date'"), "ContentTable.tsx must import from '@/lib/date'");
    assert.ok(overviewSrc.includes("from '@/lib/date'"), "Overview.tsx must import from '@/lib/date'");
    assert.ok(fileManagerSrc.includes("from '@/lib/date'"), "FileManager.tsx must import from '@/lib/date'");
    assert.ok(publishedDetailSrc.includes("from '@/lib/date'"), "PublishedDetail.tsx must import from '@/lib/date'");

    // Verify no duplicate local definitions of `function formatDate`
    assert.ok(!contentTableSrc.includes('function formatDate('), 'ContentTable.tsx must not define local formatDate');
    assert.ok(!overviewSrc.includes('function formatDate('), 'Overview.tsx must not define local formatDate');
    assert.ok(!fileManagerSrc.includes('function formatDate('), 'FileManager.tsx must not define local formatDate');
    assert.ok(!publishedDetailSrc.includes('function formatDate('), 'PublishedDetail.tsx must not define local formatDate');
  });

  // ─── 4. F-19 & F-11: Status & Aksesibilitas Avatar "ZA" di Topbar ───────────
  it('F-19 & F-11: Topbar avatar has descriptive accessibility attributes, role, and no misleading tabIndex={0}', () => {
    assert.ok(topbarSrc.includes('user-avatar'), 'Topbar.tsx avatar must have user-avatar class');
    assert.ok(topbarSrc.includes('role="img"'), 'Topbar.tsx avatar must have role="img"');
    assert.ok(!topbarSrc.includes('tabIndex={0}'), 'Topbar.tsx non-interactive avatar must not have tabIndex={0} (F-11, WCAG 4.1.2)');
    assert.ok(
      topbarSrc.includes('title="Akun: Zeinity Admin (Sesi Lokal)"'),
      'Topbar.tsx avatar must have descriptive title attribute'
    );
    assert.ok(
      topbarSrc.includes('aria-label="Profil Pengguna: Zeinity Admin"'),
      'Topbar.tsx avatar must have aria-label="Profil Pengguna: Zeinity Admin"'
    );

    // CSS styling for .avatar hover and focus-visible
    assert.ok(indexCss.includes('.avatar:hover'), 'index.css must style .avatar:hover');
    assert.ok(indexCss.includes('.avatar:focus-visible'), 'index.css must style .avatar:focus-visible');
  });

  // ─── 5. F-20: Harmonisasi Bahasa Antarmuka ──────────────────────────────────
  it('F-20: User interface language is harmonized to professional Indonesian', () => {
    // Topbar
    assert.ok(topbarSrc.includes('Alihkan Log Aktivitas'), 'Topbar must use Indonesian for terminal toggle aria-label');
    assert.ok(topbarSrc.includes('Log Aktivitas'), 'Topbar must use Log Aktivitas for title');

    // Overview
    assert.ok(overviewSrc.includes('Total Ide'), 'Overview must use "Total Ide"');
    assert.ok(overviewSrc.includes('Dalam Produksi'), 'Overview must use "Dalam Produksi"');
    assert.ok(overviewSrc.includes('Telah Terbit'), 'Overview must use "Telah Terbit"');
    assert.ok(overviewSrc.includes('Aktivitas Terbaru'), 'Overview must use "Aktivitas Terbaru"');
    assert.ok(overviewSrc.includes('Operasi Konten Internal'), 'Overview hero eyebrow must be in Indonesian');
    assert.ok(overviewSrc.includes('Intelijen Konten'), 'Overview hero title must be in Indonesian');

    // ContentTable
    assert.ok(contentTableSrc.includes('Pipeline Konten'), 'ContentTable must use "Pipeline Konten"');
    assert.ok(contentTableSrc.includes('Semua Kategori'), 'ContentTable must use "Semua Kategori"');
    assert.ok(contentTableSrc.includes('Semua Status'), 'ContentTable must use "Semua Status"');

    // FileManager
    assert.ok(fileManagerSrc.includes('Berkas Terunggah'), 'FileManager must use "Berkas Terunggah"');
    assert.ok(fileManagerSrc.includes('Pratinjau'), 'FileManager must use "Pratinjau" for preview button');
  });

  // ─── 6. F-21 & F-24: Kontras Muted & Token Border-Radius ─────────────────────
  it('F-21 & F-24: Low contrast color #64748b is replaced and border-radius tokens are defined', () => {
    // 1. WCAG AA contrast check: #64748b must be eliminated from ScriptDetail.tsx
    assert.ok(!scriptDetailSrc.includes('#64748b'), 'ScriptDetail.tsx must not contain inaccessible #64748b color');

    // 2. CSS variables for radius tokens in :root
    assert.ok(indexCss.includes('--radius-sm: 6px;'), 'index.css :root must define --radius-sm');
    assert.ok(indexCss.includes('--radius-md: 10px;'), 'index.css :root must define --radius-md');
    assert.ok(indexCss.includes('--radius-lg: 14px;'), 'index.css :root must define --radius-lg');
    assert.ok(indexCss.includes('--radius-xl: 18px;'), 'index.css :root must define --radius-xl');
    assert.ok(indexCss.includes('--radius-full: 9999px;'), 'index.css :root must define --radius-full');

    // 3. Verify design tokens are applied across component rules
    assert.ok(indexCss.includes('border-radius: var(--radius-sm);'), 'index.css must apply var(--radius-sm)');
    assert.ok(indexCss.includes('border-radius: var(--radius-md);'), 'index.css must apply var(--radius-md)');
    assert.ok(indexCss.includes('border-radius: var(--radius-lg);'), 'index.css must apply var(--radius-lg)');
    assert.ok(indexCss.includes('border-radius: var(--radius-xl);'), 'index.css must apply var(--radius-xl)');
    assert.ok(indexCss.includes('border-radius: var(--radius-full);'), 'index.css must apply var(--radius-full)');
  });

  // ─── 7. F-22 & F-23: Reset Filter Empty State & Validasi Metrik Views vs Likes ─
  it('F-22 & F-23: ContentTable empty state provides Reset Filter button and PublishedDetail validates likes vs views', () => {
    // 1. ContentTable empty state Reset Filter
    assert.ok(contentTableSrc.includes('onResetSearch?: () => void;'), 'ContentTableProps must declare onResetSearch');
    assert.ok(contentTableSrc.includes('handleResetFilters'), 'ContentTable must define handleResetFilters');
    assert.ok(
      contentTableSrc.includes('<Filter size={13} /> Reset Filter'),
      'ContentTable empty state must render Reset Filter button'
    );
    assert.ok(appSrc.includes('onResetSearch='), 'App.tsx must pass onResetSearch callback to ContentTable');

    // 2. PublishedDetail validation warning when likes > views
    assert.ok(
      publishedDetailSrc.includes('Jumlah likes tidak lazim melebihi total views'),
      'PublishedDetail must display warning when likes > views'
    );
    assert.ok(
      publishedDetailSrc.includes('AlertTriangle'),
      'PublishedDetail must show warning alert icon'
    );
    assert.ok(
      publishedDetailSrc.includes('formatDate(publishDate, true)'),
      'PublishedDetail must use centralized formatDate for published date'
    );
    assert.ok(
      publishedDetailSrc.includes('Tanggal Terbit'),
      'PublishedDetail must use Indonesian label "Tanggal Terbit"'
    );
  });

  // ─── 8. F-30 & F-31: Aksesibilitas ARIA & Pembersihan Media Query Duplikat ────
  it('F-30 & F-31: ARIA labels on modal/table checkboxes and inputs, and duplicate CSS media query is removed', () => {
    // 1. BulkImportModal ARIA labels
    assert.ok(
      bulkImportSrc.includes('aria-label="Pilih semua baris ide impor"'),
      'BulkImportModal must provide aria-label for select-all checkbox'
    );
    assert.ok(
      bulkImportSrc.includes('aria-label={`Pilih ide:'),
      'BulkImportModal must provide dynamic aria-label for row checkboxes'
    );
    assert.ok(
      bulkImportSrc.includes('aria-label="Pilih berkas dokumen masal'),
      'BulkImportModal must provide aria-label for file input'
    );
    assert.ok(
      bulkImportSrc.includes('aria-label="Kotak teks untuk menempel daftar ide masal"'),
      'BulkImportModal must provide aria-label for paste textarea'
    );

    // 2. ContentTable ARIA labels
    assert.ok(
      contentTableSrc.includes('aria-label="Filter berdasarkan kategori"'),
      'ContentTable must have aria-label on category filter'
    );
    assert.ok(
      contentTableSrc.includes('aria-label="Filter berdasarkan status"'),
      'ContentTable must have aria-label on status filter'
    );
    assert.ok(
      contentTableSrc.includes('aria-label={`Edit ide:'),
      'ContentTable must have aria-label on edit button'
    );
    assert.ok(
      contentTableSrc.includes('aria-label={`Hapus ide:'),
      'ContentTable must have aria-label on delete button'
    );
    assert.ok(
      contentTableSrc.includes('aria-label={`Validasi AI untuk ide:'),
      'ContentTable must have aria-label on AI validate action'
    );
    assert.ok(
      contentTableSrc.includes('aria-label={`Buka detail terbit:'),
      'ContentTable must have aria-label on open published action'
    );

    // 3. index.css duplicate media query removal check
    // @media (max-width: 768px) with title-comparison must not exist
    assert.ok(
      !indexCss.includes('@media (max-width: 768px) {\n  .title-comparison'),
      'Duplicate @media (max-width: 768px) block for .title-comparison must be removed'
    );
  });
});
