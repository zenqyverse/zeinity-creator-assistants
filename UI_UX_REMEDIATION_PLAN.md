# Rencana Remediasi & Implementasi Aman UI/UX: Zeinity Creator Assistant

Dokumen ini memuat peta jalan perbaikan (*remediation roadmap*) 5 fase untuk menindaklanjuti seluruh temuan audit UI/UX pada aplikasi **Zeinity Creator Assistant**. Rencana ini dirancang dengan prinsip kehati-hatian tinggi: **tidak merusak fungsionalitas yang sudah berjalan, tidak melakukan rewrite besar yang berisiko, dan mempertahankan integritas 238 tes pengujian yang sudah ada.**

---

## IKHTISAR 5 FASE PERBAIKAN

* **FASE 1 — Perbaikan Kritis (P0):** Integritas data, pencegahan kehilangan data, dan aksesibilitas dasar.
* **FASE 2 — Perbaikan Prioritas Tinggi (P1):** Aksesibilitas modal (focus trap), ergonomi pencarian global, navigasi desktop, dan prediksi aksi judul tabel.
* **FASE 3 — Konsistensi & Design System (P2):** Unifikasi arsitektur modal, migrasi gaya inline ke token CSS, harmonisasi tipografi dan status badge.
* **FASE 4 — Aksesibilitas & Responsiveness (P2):** Peningkatan kontras teks, optimasi tata letak tablet (<=960px), perapihan header mobile (375px), dan bypass link.
* **FASE 5 — Polish, Refinement & Microcopy (P3):** Standardisasi bahasa Indonesia, loading skeleton, pembersihan kode legacy, dan optimasi tata letak minor.

---

## FASE 1: PERBAIKAN KRITIS (P0)

### Item 1.1: Penjaga Kehilangan Data Input pada Modal Tambah/Edit Ide (F-01)
* **File Terdampak:** `src/components/AddIdeaModal.tsx`, `src/App.tsx`
* **Komponen Terdampak:** `<AddIdeaModal>`, `<App>`
* **Deskripsi Perbaikan:**
  1. Tambahkan state `isDirty` di `AddIdeaModal.tsx` yang membandingkan nilai input saat ini dengan `initialData`.
  2. Cegah `onClose()` langsung saat backdrop diklik jika `isDirty === true`, ganti dengan konfirmasi peringatan.
  3. Perbarui handler `Escape` di `App.tsx` agar tidak menutup modal secara paksa saat modal sedang dalam kondisi kotor (*dirty*).
* **Dependency:** `useAlert` untuk menampilkan konfirmasi pembatalan.
* **Tingkat Kompleksitas:** Rendah (Low)
* **Risiko Regresi:** Sangat rendah (tidak mengubah format payload submit).
* **Strategi Verifikasi:**
  * Buka `AddIdeaModal`, ketik teks pada kolom judul dan konteks.
  * Klik area backdrop di luar modal → pastikan modal TIDAK tertutup dan muncul dialog konfirmasi.
  * Tekan tombol `Escape` → pastikan modal TIDAK tertutup langsung.
  * Kosongkan form lalu klik backdrop atau tekan `Escape` → pastikan modal tertutup normal.

### Item 1.2: Koreksi Bug Logika Penyimpanan Form Settings (F-02)
* **File Terdampak:** `src/views/Settings.tsx`
* **Komponen Terdampak:** `<Settings>`
* **Deskripsi Perbaikan:**
  Pada baris 247, ganti ternary hardcoded `k === 'active_provider' ? 'custom' : ...` menjadi nilai aktual yang dipilih pengguna: `k === 'active_provider' ? (values.active_provider || 'custom') : ...`.
* **Dependency:** `useSettings` (fungsi `upsertSetting`).
* **Tingkat Kompleksitas:** Sangat Rendah (Trivial)
* **Risiko Regresi:** Nol (memperbaiki bug yang melanggar kontrak penyimpanan).
* **Strategi Verifikasi:**
  * Buka tab `Settings`.
  * Pilih provider `Google Gemini` atau `OpenRouter`.
  * Klik tombol *"Simpan Semua Pengaturan"*.
  * Refresh halaman web (`F5`) → pastikan provider yang tersimpan tetap `Google Gemini` atau `OpenRouter`, bukan kembali ke `'custom'`.

### Item 1.3: Koreksi Deklarasi Bahasa Dokumen HTML (F-03)
* **File Terdampak:** `index.html`
* **Komponen Terdampak:** Root HTML Document
* **Deskripsi Perbaikan:**
  Ubah `<html lang="en">` menjadi `<html lang="id">`.
* **Dependency:** Tidak ada.
* **Tingkat Kompleksitas:** Trivial
* **Risiko Regresi:** Nol.
* **Strategi Verifikasi:**
  * Inspeksi DOM elemen `html` di browser menggunakan developer tools atau dump DOM.
  * Uji menggunakan screen reader (VoiceOver/NVDA) dan pastikan teks dibaca dengan modul sintesis suara Bahasa Indonesia.

---

## FASE 2: PERBAIKAN PRIORITAS TINGGI (P1)

### Item 2.1: Implementasi Focus Trap dan Focus Management pada Seluruh Modal Dialog (F-04)
* **File Terdampak:** `src/components/AddIdeaModal.tsx`, `src/components/ImportModal.tsx`, `src/components/BulkImportModal.tsx`, `src/components/AlertModal.tsx`, `src/components/script/ThumbnailTitleStudio.tsx`
* **Komponen Terdampak:** Seluruh modal layer
* **Deskripsi Perbaikan:**
  1. Buat hook utilitas terisolasi `useFocusTrap(isOpen, containerRef)`.
  2. Saat modal terbuka, kunci siklus tombol `Tab` dan `Shift+Tab` agar hanya berputar di dalam elemen interaktif modal.
  3. Berikan fokus otomatis ke kolom input pertama saat modal terbuka.
  4. Kembalikan fokus ke elemen pemicu (*trigger button*) saat modal ditutup.
* **Dependency:** React standard hooks (`useEffect`, `useRef`).
* **Tingkat Kompleksitas:** Sedang (Medium)
* **Risiko Regresi:** Rendah jika diuji di semua modal.
* **Strategi Verifikasi:**
  * Navigasi modal menggunakan tombol keyboard `Tab` dari tombol pertama hingga tombol terakhir.
  * Pastikan pada tombol terakhir, penekanan tombol `Tab` kembali ke tombol pertama di dalam modal, tanpa pernah menyentuh elemen di balik backdrop.

### Item 2.2: Prediktabilitas Klik Judul Konten pada Tabel Pipeline (F-05)
* **File Terdampak:** `src/views/ContentTable.tsx`
* **Komponen Terdampak:** `<ContentTable>`
* **Deskripsi Perbaikan:**
  1. Ubah klik judul konten agar selalu membuka workspace/detail konten secara konsisten:
     * Untuk status `Idea` dan `Validating`: klik judul membuka drawer/modal pratinjau ide (bukan langsung form edit).
     * Sediakan ikon pensil yang jelas untuk aksi *"Edit Ide"*.
  2. Berikan ikon penanda tujuan di samping judul (misal: ikon eksternal untuk item terbit, ikon dokumen untuk naskah).
* **Dependency:** Handler `onViewScript`, `onViewPublished`, `onEdit`.
* **Tingkat Kompleksitas:** Rendah (Low)
* **Risiko Regresi:** Rendah.
* **Strategi Verifikasi:**
  * Uji klik judul pada setiap status (`Idea`, `Researching`, `Scripting`, `Published`) dan pastikan ada umpan balik visual yang jelas sebelum aksi dieksekusi.

### Item 2.3: Fungsionalitas Pencarian Global (*Universal Global Search*) (F-06)
* **File Terdampak:** `src/components/Topbar.tsx`, `src/App.tsx`
* **Komponen Terdampak:** `<Topbar>`, `<App>`
* **Deskripsi Perbaikan:**
  Pada `App.tsx`, perbarui `handleSearchChange`: jika pengguna mulai mengetik saat berada di luar tabel pipeline (`overview`, `trends`, `rss`, `files`, `analytics`, `settings`), otomatis alihkan tampilan ke tab `Content Ideas` (`setActiveView('ideas')`) agar hasil pencarian langsung terlihat seketika.
* **Dependency:** State `activeView` dan `searchQuery` di `App.tsx`.
* **Tingkat Kompleksitas:** Rendah (Low)
* **Risiko Regresi:** Sangat rendah.
* **Strategi Verifikasi:**
  * Buka halaman `Overview` atau `Analytics`.
  * Ketikkan kata kunci pencarian di header.
  * Pastikan layar otomatis beralih ke tabel ide dan menampilkan baris yang difilter sesuai kata kunci.

### Item 2.4: Tata Letak Navigasi Desktop Persisten (>=1024px) (F-07)
* **File Terdampak:** `src/components/Sidebar.tsx`, `src/index.css`, `src/App.tsx`
* **Komponen Terdampak:** `<Sidebar>`, `.app-shell` layout
* **Deskripsi Perbaikan:**
  1. Pada `src/index.css`, tambahkan media query desktop (`@media (min-width: 1024px)`):
     * `.sidebar`: Posisi statis/sticky (`position: sticky; top: 18px; transform: none;`).
     * `.sidebar-backdrop`: Sembunyikan (`display: none;`).
     * `.app-shell`: Gunakan grid 2 kolom (`display: grid; grid-template-columns: 280px 1fr; gap: 24px;`).
  2. Pertahankan pola drawer hamburger saat ini untuk layar mobile dan tablet (`< 1024px`).
* **Dependency:** Layout shell CSS.
* **Tingkat Kompleksitas:** Sedang (Medium)
* **Risiko Regresi:** Membutuhkan pengetesan visual di resolusi 1440px, 1024px, 768px, dan 375px.
* **Strategi Verifikasi:**
  * Buka aplikasi di resolusi desktop 1440px: pastikan sidebar tampil permanen tanpa backdrop, navigasi 1-klik berfungsi mulus.
  * Buka aplikasi di resolusi tablet/mobile (<1024px): pastikan tombol hamburger tetap bekerja seperti sedia kala.

### Item 2.5: Penambahan Semantik `aria-current="page"` pada Navigasi (F-08)
* **File Terdampak:** `src/components/Sidebar.tsx`
* **Komponen Terdampak:** `<Sidebar>`
* **Deskripsi Perbaikan:**
  Tambahkan atribut `aria-current={activeView === item.key ? 'page' : undefined}` pada tombol menu di `Sidebar.tsx`.
* **Tingkat Kompleksitas:** Trivial
* **Risiko Regresi:** Nol.
* **Strategi Verifikasi:**
  * Inspeksi DOM pada elemen tombol navigasi yang aktif, pastikan atribut `aria-current="page"` hadir.

---

## FASE 3: KONSISTENSI & DESIGN SYSTEM (P2)

### Item 3.1: Konsolidasi Arsitektur Modal ke Komponen Dialog Standar (F-09)
* **File Terdampak:** `src/components/AddIdeaModal.tsx`, `src/components/ImportModal.tsx`, `src/components/BulkImportModal.tsx`, `src/components/AlertModal.tsx`, `src/components/script/ThumbnailTitleStudio.tsx`, `src/index.css`
* **Deskripsi Perbaikan:**
  Standarisasikan kelas wrapper modal menjadi satu pola:
  * Gunakan z-index berjenjang yang aman: Modal Standar (`z-index: 50`), Alert Dialog Kritis (`z-index: 100`).
  * Gunakan radius sudut seragam (`var(--radius-xl)` = 18px).
  * Satukan animasi kemunculan (`animation: modal-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1)`).
* **Tingkat Kompleksitas:** Sedang (Medium)
* **Risiko Regresi:** Rendah.

### Item 3.2: Migrasi Gaya Inline ke Token CSS Desain Sistem (F-10)
* **File Terdampak:** `src/components/Topbar.tsx`, `src/views/Overview.tsx`, `src/views/ContentTable.tsx`, `src/views/ScriptDetail.tsx`
* **Deskripsi Perbaikan:**
  Ganti properti inline `style={{ background: '#091222', border: '1px solid #162842' }}` yang berulang dengan kelas utilitas baru (misal: `.panel-surface-dark`, `.border-subtle`).
* **Tingkat Kompleksitas:** Sedang (Medium)
* **Risiko Regresi:** Rendah.

### Item 3.3: Harmonisasi Kapitalisasi dan Eliminasi Double Modal (F-06, F-12)
* **File Terdampak:** `src/views/ScriptDetail.tsx`, `src/components/AddIdeaModal.tsx`
* **Deskripsi Perbaikan:**
  1. Ubah `📦 2. FINISHING & PACKAGING` menjadi `📦 2. Finishing & Packaging`.
  2. Pada `AddIdeaModal.tsx`, saat judul kosong, tampilkan pesan error inline berwarna merah di bawah input tanpa memunculkan `AlertModal` di atas dialog.
* **Tingkat Kompleksitas:** Rendah (Low)
* **Risiko Regresi:** Nol.

---

## FASE 4: AKSESIBILITAS & RESPONSIVENESS (P2)

### Item 4.1: Peningkatan Kontras Warna dan Ukuran Tipografi Minimal (F-13)
* **File Terdampak:** `src/index.css`, `src/components/Topbar.tsx`, `src/components/Sidebar.tsx`
* **Deskripsi Perbaikan:**
  1. Tingkatkan seluruh teks dengan ukuran `< 0.75rem` (12px) menjadi minimal `0.75rem` (12px).
  2. Perbaiki kontras teks `--muted` dari `#7890af` menjadi `#9eb3cf` atau `#cbd5e1` pada latar belakang gelap untuk mencapai rasio kontras 4.5:1.
* **Tingkat Kompleksitas:** Rendah (Low)
* **Risiko Regresi:** Nol.

### Item 4.2: Optimasi Tata Letak Tablet untuk Studio Naskah (<=960px) (F-14)
* **File Terdampak:** `src/views/ScriptDetail.tsx`, `src/index.css`
* **Deskripsi Perbaikan:**
  Pada lebar layar `<=960px`, alih-alih menumpuk outline setinggi 1000px di atas editor, sediakan tombol tab pengalih sub-panel: `[Outline Kerangka]` vs `[Editor Draf Naskah]` sehingga pengguna tablet dapat fokus menulis tanpa terdistraksi scrolling panjang.
* **Tingkat Kompleksitas:** Sedang (Medium)
* **Risiko Regresi:** Rendah.

### Item 4.3: Perapihan Header Mobile Resolusi 375px (F-15)
* **File Terdampak:** `src/components/Topbar.tsx`, `src/index.css`
* **Deskripsi Perbaikan:**
  Pada media query `@media (max-width: 620px)`:
  * Sembunyikan label teks panjang pada pill status router (hanya tampilkan titik hijau/merah dan ikon kilat).
  * Sembunyikan badge teks *"Bot —"* (hanya tampilkan ikon bot).
  * Pastikan target sentuh setiap ikon minimal 44px x 44px.
* **Tingkat Kompleksitas:** Rendah (Low)
* **Risiko Regresi:** Rendah.

### Item 4.4: Penambahan Bypass Link "Lewati ke Konten Utama" (F-17)
* **File Terdampak:** `src/App.tsx`, `src/index.css`
* **Deskripsi Perbaikan:**
  Tambahkan tautan skip link di baris pertama render `App.tsx`:
  `<a href="#main-content" className="sr-only focus:not-sr-only skip-link">Lewati ke konten utama</a>`
* **Tingkat Kompleksitas:** Trivial
* **Risiko Regresi:** Nol.

---

## FASE 5: POLISH, REFINEMENT & MICROCOPY (P3)

### Item 5.1: Harmonisasi Kosakata Microcopy (F-12)
* **File Terdampak:** Seluruh komponen tampilan (`Sidebar.tsx`, `ContentTable.tsx`, `FileManager.tsx`)
* **Deskripsi Perbaikan:**
  Selaraskan istilah menu dan aksi:
  * Ubah tombol *"Cancel"* menjadi *"Batal"*.
  * Ubah *"Import Ide Masal"* dan *"Upload Dokumen"* menjadi padanan kata baku yang seragam.
  * Tinjau istilah menu samping: putuskan penggunaan Bahasa Indonesia penuh (*Ide Konten*, *Riset AI*, *Naskah*, *Terbit*, *Radar Tren*, *Pembaca RSS*, *Manajer Berkas*, *Analitik*, *Pengaturan*).
* **Tingkat Kompleksitas:** Rendah (Low)
* **Risiko Regresi:** Nol.

### Item 5.2: Skeleton Loading State (F-19)
* **File Terdampak:** `src/views/Analytics.tsx`, `src/views/RSSReader.tsx`
* **Deskripsi Perbaikan:**
  Ganti teks statis *"Memuat data…"* dengan komponen `<SkeletonCard>` yang memiliki efek pulsa halus (*pulse animation*) untuk mereduksi *layout shift*.
* **Tingkat Kompleksitas:** Rendah (Low)
* **Risiko Regresi:** Nol.

### Item 5.3: Pembersihan Kode Legacy dan Penanda Deprecated (F-20, F-21)
* **File Terdampak:** `src/hooks/useContent.ts`, `src/lib/gemini.ts`
* **Deskripsi Perbaikan:**
  Beri komentar penjelasan atau rapikan sisa pembersih `zeinity_visual_cue_prompt_`. Normalisasikan simbol en-dash pada string durasi.
* **Tingkat Kompleksitas:** Trivial
* **Risiko Regresi:** Pastikan seluruh 238 unit test tetap lulus 100%.

---

## STRATEGI VERIFIKASI DAN PENGUJIAN REGRESI

Untuk setiap perbaikan yang diimplementasikan pada siklus eksekusi berikutnya, wajib dilakukan verifikasi bertingkat:

1. **Pengujian Suite Otomatis:**
   Jalankan `npm run test` (36 suites, 238 test cases) untuk memastikan tidak ada kontrak modul yang rusak.
2. **Pemeriksaan Typecheck & Lint:**
   Jalankan `npm run typecheck` (`tsc --noEmit -p tsconfig.app.json`) dan `npm run lint` untuk memastikan 0 type errors.
3. **Pengujian Browser Aktual (Edge/Chromium):**
   Gunakan browser headless/visual untuk memeriksa rendering DOM asli, kelancaran transisi modal, dan tidak adanya console error.
4. **Pengujian Responsif Multi-Viewport:**
   Uji pada 4 breakpoint kunci:
   * Desktop Lebar: 1440 x 900 px
   * Laptop: 1024 x 768 px
   * Tablet: 768 x 1024 px
   * Ponsel: 375 x 812 px
5. **Pengujian Aksesibilitas Keyboard:**
   Pastikan seluruh navigasi modal, formulir, dan menu dapat dioperasikan secara penuh hanya menggunakan tombol `Tab`, `Shift+Tab`, `Space`, `Enter`, dan `Escape`.
