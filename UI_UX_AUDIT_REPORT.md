# Laporan Audit Menyeluruh UI/UX & Produk: Zeinity Creator Assistant

**Proyek:** Zeinity Creator Assistant (*Zeinity Executive Report Web App*)  
**Peran Auditor:** Senior UI/UX Auditor, Senior UX Designer, UX Researcher, Product Designer, Accessibility Specialist, Frontend UX Reviewer  
**Metodologi:** Codebase Deep Inspection, Actual Headless Browser DOM Testing (Microsoft Edge/Chromium), WCAG 2.1 AA Evaluation, User Flow Stress Testing  
**Status Pengujian Otomatis:** 36 Test Suites, 238 Tests Passed (100% Pass Rate)  
**Dokumen Pendukung Terkait:**
* [`UI_UX_AUDIT_SUMMARY.md`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/UI_UX_AUDIT_SUMMARY.md) (Ringkasan Eksekutif)
* [`UI_UX_FINDINGS.md`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/UI_UX_FINDINGS.md) (Basis Data Temuan Terstruktur)
* [`UI_UX_REMEDIATION_PLAN.md`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/UI_UX_REMEDIATION_PLAN.md) (Rencana Perbaikan 5 Fase)

---

## TAHAP 0 — PEMAHAMAN ARSITEKTUR & STRUKTUR APLIKASI

### 1. Struktur Folder & Organisasi Modul
* `src/components/`: Komponen antarmuka umum (`Sidebar.tsx`, `Topbar.tsx`, `AddIdeaModal.tsx`, `ImportModal.tsx`, `BulkImportModal.tsx`, `AlertModal.tsx`, `Terminal.tsx`, `Toast.tsx`).
* `src/components/script/`: Sub-studio naskah modular (`OutlineWorkspace.tsx`, `ResearchWorkspace.tsx`, `ScriptDraftStudio.tsx`, `ScriptPreflightBar.tsx`, `ThumbnailTitleStudio.tsx`).
* `src/views/`: Komponen halaman utama (`Overview.tsx`, `ContentTable.tsx`, `ScriptDetail.tsx`, `PublishedDetail.tsx`, `FileManager.tsx`, `Analytics.tsx`, `TrendRadar.tsx`, `RSSReader.tsx`, `Settings.tsx`).
* `src/hooks/`: Custom state hooks (`useContent.ts`, `useSettings.ts`, `useFiles.ts`, `useTerminal.ts`, `useAlert.ts`).
* `src/lib/`: Layanan eksternal & utilitas (`navigation.ts`, `gemini.ts`, `supabase.ts`, `trendsService.ts`, `rssService.ts`, `bulkImport.ts`, `docx.ts`, `draftSnapshots.ts`, `date.ts`).
* `src/types.ts`: Model data sentral (status naskah, pilar konten, hook formula, model gateway AI, RSS & trend items).

### 2. Frontend & Backend Stack
* **Frontend:** React 18.3.1, TypeScript 5.5.3, Vite 5.4.2, Tailwind CSS 3.4.1 (dikombinasikan dengan 2.594 baris custom CSS kaca/glassmorphism di `src/index.css`), Lucide React 0.446.0 (ikonografi), Mammoth 1.8.0 (ekstraksi berkas Word `.docx`).
* **Backend & Integrasi:**
  * Supabase Client (`@supabase/supabase-js` 2.57.4) dengan fallback offline cerdas via `offlineFetch` jika environment variable (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) tidak disediakan.
  * AI Gateway: Google Generative AI SDK (`@google/generative-ai` 0.24.0) untuk Gemini Direct, serta fetcher OpenAI-compatible untuk OpenRouter, Ollama Local (`localhost:11434`), dan 9Router Gateway (`localhost:20128/v1`).
  * Telegram Bot API: Polling & verifikasi token terisolasi untuk menangkap ide otomatis dari chat Telegram.
  * RSS & Google Trends XML: RSS 2.0 / Atom parser lokal dan Google Trends Daily RSS scraper.

### 3. Routing & Navigasi
Aplikasi menggunakan routing berbasis hash (`window.location.hash`) dengan sinkronisasi ke `localStorage` melalui `src/lib/navigation.ts`. Rute yang didukung meliputi:
* `#/overview` atau `#`
* `#/ideas`, `#/research`, `#/scripts`, `#/published`
* `#/trends`, `#/rss`
* `#/files`, `#/analytics`, `#/settings`
* Detail rute dinamis: `#/script/:id` dan `#/published/:id`

### 4. Akumulasi Utang Teknis & Kode Warisan (*Legacy Debt*)
* **Fragmentasi Kunci LocalStorage:** Karena tabel Supabase pada iterasi awal tidak memiliki semua kolom naskah terbaru, data disimpan secara terfragmentasi di puluhan kunci localStorage per ID: `zeinity_audit_prompt_<id>`, `zeinity_casual_audit_prompt_<id>`, `zeinity_generated_titles_<id>`, `zeinity_hook_type_<id>`, `zeinity_hook_draft_<id>`, `zeinity_hook_notes_<id>`, dll.
* **Residu Pembersihan Fitur Terhapus:** Pada baris 20–34 di `src/hooks/useContent.ts`, terdapat script pembersih residual untuk kunci `zeinity_visual_cue_prompt_` yang menandakan fitur tersebut pernah dihapus secara bertahap namun kodenya tetap dieksekusi setiap mount.
* **Deprecation Schema:** Field `target_publish_date` ditandai `@deprecated` di `src/types.ts` baris 220, namun masih terbawa di antarmuka dan mock data.

---

## TAHAP 1 — INVENTARIS APLIKASI & FITUR LENGKAP

| Route / Layar | Tujuan Halaman & User Goal | Primary CTA | Secondary Action | Komponen Kunci |
| :--- | :--- | :--- | :--- | :--- |
| `#/overview` | Ringkasan metrik pipeline, ide baru hari ini, dan Radar Sinyal Terhangat (3 tren Google teratas). | `+ Tambah Ide` | `Impor Berkas`, `+ Ide dari Tren` | `<Overview>`, `<TopTrendsWidget>`, `<RecentActivityTable>` |
| `#/ideas` | Bank ide konten lengkap dari Web dan Telegram, siap divalidasi AI. | `+ Tambah Ide` | `Import Ide Masal (CSV/TXT)`, Filter Pilar/Status, Ubah Status | `<ContentTable>`, `<AddIdeaModal>`, `<BulkImportModal>` |
| `#/research` | Tahap validasi konsep dan penyusunan Research Brief mendalam. | `⚡ Validasi AI` | `Workspace Riset`, Upload `.docx/.md`, Revert status | `<ContentTable>`, `<ResearchWorkspace>` |
| `#/scripts` | Editor penulisan naskah (Dual-Pane Studio: Outline + Zen Draft Editor). | `✍️ Setujui & Tulis Naskah` | Target Kata/Durasi, Audit Spoken, Audit Casual, Snapshot Undo | `<ScriptDetail>`, `<OutlineWorkspace>`, `<ScriptDraftStudio>` |
| `#/published` | Pemantauan konten live, metrik YouTube (Views, Likes, Comments, Engagement Rate). | `Simpan Metrik` | `Revert ke Scripting`, Salin Naskah, Ekspor `.md/.txt` | `<PublishedDetail>`, Metrik Card |
| `#/trends` | Radar tren waktu-nyata dari YouTube Trending & Google Trends Daily Indonesia. | `+ Tambah ke Pipeline` | Ganti Region (ID, US, JP, UK), Ganti Kategori YouTube | `<TrendRadar>`, Region Selector |
| `#/rss` | Kurasi artikel berita dari feed media kredibel sesuai 5 Pilar Zeinity. | `+ Jadikan Ide Konten` | Kelola Sumber RSS, Filter Pilar, Bookmark, Tandai Dibaca | `<RSSReader>`, `<ManageFeedsModal>` |
| `#/files` | Gudang dokumen referensi pendukung riset AI & Master Channel Identity. | `Upload Dokumen` | Pratinjau Teks, Salin Teks, Hapus Berkas | `<FileManager>`, `<ImportModal>`, File Preview Modal |
| `#/analytics` | Visualisasi analitik performa pipeline, distribusi pilar konten, dan tren 6 bulan. | — | Donut Chart Hover, Durasi Produksi Rata-rata | `<Analytics>`, Donut Chart, Production Bar Chart |
| `#/settings` | Konfigurasi API keys, 9Router Gateway, katalog model AI, Timeout, Bot Telegram. | `Simpan Semua Pengaturan` | Test Koneksi 9Router, Segarkan Katalog, Verifikasi Bot | `<Settings>`, `<Terminal>` |

---

## TAHAP 2 — AUDIT BROWSER AKTUAL (LIVE RENDERING)

Pengujian rendering nyata dilakukan menggunakan browser engine Chromium/Edge headless pada local development server `http://localhost:5174/` dengan berbagai skenario interaksi:

1. **Pengujian DOM Dump:**
   Semua 10 halaman utama berhasil di-render dan dianalisis secara akurat (`dom_overview.html`, `dom_ideas.html`, `dom_trends.html`, `dom_rss.html`, `dom_files.html`, `dom_analytics.html`, `dom_settings.html`, `dom_script_1.html`).
2. **Karakteristik Tampilan Aktual:**
   * Latar belakang kaca (*glassmorphism*) dirender dengan backdrop blur 20px–24px.
   * Efek animasi pulsa hijau aktif pada dot 9Router Gateway dan badge verified bot Telegram.
   * Modals disuntikkan secara statis di tingkat root `App.tsx` (`modal-layer` dengan `display: none` saat tidak aktif).
3. **Penyimpangan Aktual di Browser:**
   * Di browser desktop (1440px), sidebar tidak pernah terlihat secara default; layar hanya menampilkan bilah topbar melayang dan kontainer konten selebar 1600px dengan banyak ruang kosong di samping kiri/kanan.
   * Pada resolusi ponsel (375px), baris pertama topbar mengalami sesak elemen parah di mana menu, logo, pill status 9Router, bot status, tombol terminal, dan avatar bertabrakan.

---

## TAHAP 3 — AUDIT ALIRAN PENGGUNA (*USER FLOW*)

### 1. Discoverability (Keterlihatan Fitur)
* **Kekuatan:** Tombol CTA utama (`+ Tambah Ide`, `⚡ Validasi AI`, `✍️ Setujui & Tulis Naskah`) memiliki warna mencolok (hijau emerald gradasi dan cyan menyala) yang sangat mudah ditemukan.
* **Kelemahan:** Fitur *Finishing & Packaging* dan generator alternatif judul tersembunyi di dalam tab sekunder `ScriptDetail.tsx` (Tab 2: `FINISHING & PACKAGING`). Banyak pengguna baru tidak menyadari bahwa rekomendasi 5 judul YouTube dan thumbnail studio berada di tab kedua tersebut.

### 2. Comprehension (Kemudahan Pemahaman)
* **Kekuatan:** Penamaan 5 Pilar Konten Zeinity sangat jelas dan terdefinisi baik: *Internet & Social Media Culture*, *AI & Technology Impact*, *Digital Economy & Creator Economy*, *Gaming & Digital Entertainment*, dan *Modern Life & Digital Psychology*.
* **Kelemahan:** Terlalu banyak jargon teknis model AI yang terekspos di layar utama: *"Creator-Combo Presets"*, *"Direct Model Groq Llama 3.3 70B"*, *"9Router Gateway"*, dan *"Ollama Context Window"*. Bagi seorang kreator atau eksekutif non-teknis, istilah-istilah ini membebani pemahaman fungsional.

### 3. Efficiency (Efisiensi Alur Kerja)
* **Kelemahan Kritis:** Alur navigasi desktop sangat tidak efisien. Membuka menu mana pun mengharuskan pengguna mengklik tombol menu hamburger, menunggu drawer slide-in dan backdrop hitam muncul, mengklik menu, lalu drawer tertutup. Ini memerlukan 2 klik konstan untuk setiap navigasi.

### 4. Error Prevention (Pencegahan Kesalahan)
* **Kelemahan Fatal (P0):** Pada `AddIdeaModal.tsx`, jika pengguna tidak sengaja mengklik 1 piksel di luar area kartu modal (pada area backdrop) atau menekan tombol `Escape`, modal langsung tertutup tanpa konfirmasi dan teks yang sedang diketik langsung hilang permanen.

### 5. Error Recovery (Pemulihan Kesalahan)
* **Kekuatan Unggulan:** Fitur *Draft History Snapshots* (`zeinity_draft_history_<id>`) pada studio naskah sangat luar biasa. Setiap kali revisi AI dilakukan, draf sebelumnya otomatis diarsipkan sehingga pengguna dapat melakukan *Undo Revisi Terakhir* kapan saja.
* **Kekuatan Unggulan:** Setiap tahap produksi naskah memiliki tombol *Revert* (`Revert ke Idea`, `Revert ke Researching`, `Revert ke Scripting`, `Revert ke Thumbnailing`) dengan dialog konfirmasi aman.

### 6. Feedback Loops (Umpan Balik Sistem)
* **Kekuatan:** Toast notification (`Toast.tsx`) muncul dengan mulus selama 2.8 detik di pojok layar. Log aktivitas terminal (`Terminal.tsx`) memberikan rincian proses API yang sangat transparan (menampilkan progres persen, waktu respons, dan status).

---

## TAHAP 4 — AUDIT ARSITEKTUR INFORMASI (IA)

1. **Struktur Menu Samping (Sidebar):**
   Menu samping memuat 10 item dalam daftar datar vertikal tunggal tanpa pengelompokan (*grouping*):
   * *Overview*
   * *Content Ideas*
   * *AI Research*
   * *Scripts*
   * *Published*
   * *Radar Tren*
   * *RSS Reader*
   * *File Manager*
   * *Analytics*
   * *Settings*
   Hal ini mencampurkan 3 domain yang berbeda: **Alur Produksi Inti** (Overview s/d Published), **Pencarian Ide Baru** (Radar Tren & RSS), dan **Pengelolaan Sistem** (Files, Analytics, Settings).
2. **Kepadatan Informasi (*Information Density*):**
   * Halaman `Overview` dan `ContentTable` memiliki kepadatan informasi yang sangat baik (*balanced density*).
   * Sebaliknya, halaman `ScriptDetail.tsx` mengalami kelebihan beban informasi (*cognitive overload*) karena menyatukan Pre-flight Bar, Angle Notes, Hook Selector, 5-Beat Outline, Zen Script Editor, Audit Spoken Diff, Audit Casual Diff, 5 Rekomendasi Judul, dan Thumbnail Studio dalam satu layar monolitik.

---

## TAHAP 5 — AUDIT VISUAL UI

1. **Tipografi:**
   * Font utama: `"DM Sans"` untuk antarmuka umum dan `"Space Mono"` untuk kode/prompt.
   * Masalah: Terdapat elemen teks penting yang ukurannya jatuh di bawah 12px (antara 9.9px hingga 11.3px), seperti `.eyebrow` (`.71rem`), badge router (`0.62rem`), dan pill status bot (`0.66rem`).
2. **Warna & Kontras:**
   * Palet neon di atas permukaan gelap (`#071327` / `#10134a`) memberikan kontras yang sangat tinggi untuk warna aksen utama (`#4fe8ff` Cyan rasio >10:1; `#53f2ad` Green rasio >9:1).
   * Namun, warna teks sekunder (`#7890af` dan `#94a3b8`) pada beberapa kartu dengan background semi-transparan memiliki rasio kontras sekitar 3.8:1 – 4.2:1, yang berada di bawah standar WCAG AA (minimal 4.5:1 untuk teks normal).
3. **Komponen Antarmuka:**
   * Komponen tombol memiliki hierarki yang jelas: `.btn-primary` (gradasi hijau/cyan dengan glow), `.btn-secondary` (kaca gelap dengan border tipis), dan `.btn-danger` (merah muda).
   * Namun, status badge tabel diimplementasikan sebagai elemen `<select>` langsung yang menghilangkan indikator panah dropdown standar di beberapa browser.

---

## TAHAP 6 — AUDIT KONSISTENSI (DRIFT ANALYSIS)

1. **Fragmentasi Sistem Modal Dialog:**
   Ditemukan 3 sistem modal terpisah:
   * Pola A (`.modal-layer` + `.modal`): Radius 18px, z-index 40, padding 22px (`AddIdeaModal`, `ImportModal`, `BulkImportModal`).
   * Pola B (`.alert-modal-layer` + `.alert-modal-card`): Radius 16px, z-index 9999, border merah/kuning semantik (`AlertModal`).
   * Pola C (`.modal-overlay` + `.modal-container`): Radius 12px, z-index 1000, backdrop blur 8px (`ThumbnailTitleStudio`).
2. **Inkonsistensi Huruf Kapital (*Casing Drift*):**
   Pada tombol tab tahapan naskah: `✍️ 1. Studio Naskah` (Title Case) berdampingan langsung dengan `📦 2. FINISHING & PACKAGING` (All Caps).
3. **Inkonsistensi Bahasa (Language Drift):**
   Menu `Radar Tren` (ID) dicampur dengan 9 menu lain berbahasa Inggris. Tombol `Cancel` (EN) berdampingan dengan `Simpan Ide` (ID).

---

## TAHAP 7 — AUDIT SISTEM DESAIN (DESIGN SYSTEM GAP)

1. **Token Desain CSS Tersedia di `:root`:**
   `--bg-1`, `--bg-2`, `--panel`, `--panel-strong`, `--border`, `--text`, `--muted`, `--cyan`, `--violet`, `--green`, `--amber`, `--danger`, `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`.
2. **Kesenjangan Desain Sistem (*Design System Gap*):**
   Meskipun variabel CSS di atas tersedia, ratusan baris kode di `Topbar.tsx`, `Overview.tsx`, `ContentTable.tsx`, dan `ScriptDetail.tsx` tidak menggunakannya dan memilih mendeklarasikan kode warna heksadesimal langsung di atribut `style={{ ... }}` (misal: `#091222`, `#0a101d`, `#162842`, `#293963`). Hal ini menciptakan pemisahan (*decoupling*) dari token desain pusat.

---

## TAHAP 8 — AUDIT STATUS KOMPONEN (*COMPONENT STATES*)

* **Tombol (*Buttons*):** Memiliki status default, hover, active, focus-visible, dan disabled yang sangat baik. Status loading pada tombol AI dilengkapi dengan ikon `Loader2` yang berputar halus.
* **Input Formulir:** Memiliki penanganan focus-visible (`outline: 3px solid rgba(79, 232, 255, .65)`). Namun, saat terjadi kesalahan validasi di `AddIdeaModal`, input hanya diberi border merah tanpa aria-invalid atau aria-describedby.
* **Data State:** Memiliki penanganan komprehensif untuk *Loading*, *Populated*, *Partial*, dan *Error*. Pada tabel ide, jika data kosong karena filter, sistem menampilkan pesan ramah dengan tombol reset filter langsung.
* **Status Penyimpanan Otomatis (*Auto-Save Indicators*):** Studio naskah dan riset memiliki indikator status penyimpanan real-time: `idle`, `unsaved` (kuning), `saving` (spinner), dan `saved` (hijau) yang sangat membantu ketenangan pikiran kreator.

---

## TAHAP 9 — AUDIT LOADING, EMPTY, ERROR, DAN SUCCESS STATES

1. **Loading State:**
   * Di tabel ide dan editor naskah, loading indikator sangat jelas dan tidak menyebabkan layout jumping yang liar.
   * Di halaman Analitik dan RSS Reader, transisi data feed baru hanya mengandalkan spinner di tengah tanpa *Skeleton Placeholder*, memicu pergeseran tata letak (*layout shift*) saat data selesai dirender.
2. **Empty State:**
   * Tabel ide memiliki empty state yang luar biasa: menjelaskan bahwa tidak ada ide yang cocok dengan filter aktif dan menyediakan tombol *"Reset Filter"* instan.
   * File manager menjelaskan bahwa belum ada dokumen terunggah dan mengarahkan pengguna ke tombol upload.
3. **Error State:**
   * Komponen `AlertModal` dan fungsi `parseAIError` di `gemini.ts` adalah salah satu implementasi error handling terbaik: menguraikan kode error 401, 404, 503, model overload, atau kehabisan kuota menjadi bahasa manusia yang dilengkapi dengan saran solusi (*actionable solution*) dan tombol jalan pintas ke Settings.
4. **Success State:**
   * Tindakan simpan ide, salin teks, impor masal, dan perubahan status selalu disertai feedback visual ganda: notifikasi Toast di kanan atas dan status badge pada kartu.

---

## TAHAP 10 — AUDIT FORMULIR & RISIKO KEHILANGAN DATA

1. **Validasi & Error Message:**
   * Formulir `AddIdeaModal` memvalidasi input judul kosong. Namun, penanganannya memicu anti-pola: menampilkan pesan inline merah sekaligus memunculkan `AlertModal` pop-up di atas modal form.
2. **Risiko Kehilangan Data (P0):**
   * Di `AddIdeaModal`, tidak ada konfirmasi pembatalan saat pengguna mengklik backdrop atau menekan tombol `Escape`. Draf yang belum disimpan akan langsung musnah.
3. **Bug Form Settings (P0):**
   * Tombol *"Simpan Semua Pengaturan"* di `Settings.tsx` menimpa pilihan provider pengguna menjadi `'custom'` akibat logika ternary yang di-hardcode.

---

## TAHAP 11 — AUDIT RESPONSIF MULTI-VIEWPORT

1. **Desktop Besar (1440px – 1920px):**
   * Tampilan terasa terlalu kosong di area tepi karena sidebar disembunyikan dalam drawer. Navigasi terasa lambat karena membutuhkan 2 klik untuk setiap perpindahan halaman.
2. **Laptop (1024px – 1366px):**
   * Tata letak tabel dan analitik bekerja secara optimal. Studio naskah dua kolom (`.scripting-dual-pane-grid`) mulai terasa sempit pada resolusi 1024px.
3. **Tablet (768px – 960px):**
   * Pada lebar `<=960px`, Studio Naskah mengubah tata letak dua kolom menjadi 1 kolom vertikal. Panel kerangka (*outline*) menumpuk di atas editor draf, memaksa pengguna menggulir sangat jauh ke bawah untuk melihat naskah.
   * Tabel 7 kolom terkompresi secara ekstrem dan memaksa scroll horizontal.
4. **Ponsel Mobile (375px – 428px):**
   * Baris pertama Topbar memuat 6 elemen sekaligus (menu, logo, router pill, bot status, terminal, avatar) yang lebarnya mencapai ~424px, menyebabkan penumpukan dan risiko salah tap.

---

## TAHAP 12 — AUDIT AKSESIBILITAS WCAG 2.1 AA

| Kriteria WCAG | Status | Deskripsi Evaluasi |
| :--- | :--- | :--- |
| **3.1.1 Language of Page (Level A)** | ❌ GAGAL | `index.html` menyatakan `lang="en"`, padahal antarmuka 100% Bahasa Indonesia. Screen reader membaca dengan fonetik bahasa Inggris. |
| **2.1.2 No Keyboard Trap (Level A)** | ❌ GAGAL | Seluruh modal dialog (`AddIdeaModal`, `ImportModal`, `BulkImportModal`, `AlertModal`, `ThumbnailTitleStudio`) tidak mengunci fokus keyboard (*no focus trap*). |
| **2.4.3 Focus Order (Level A)** | ❌ GAGAL | Saat modal terbuka, tombol `Tab` keyboard dapat melompat keluar ke elemen-elemen di balik backdrop. |
| **4.1.2 Name, Role, Value (Level A)** | ❌ GAGAL | Menu sidebar aktif tidak memiliki `aria-current="page"`. Avatar non-interaktif memiliki `tabIndex={0}`. File input dropzone tidak memiliki accessible label. |
| **2.4.1 Bypass Blocks (Level A)** | ❌ GAGAL | Ketiadaan link aksesibilitas *"Skip to Content"* di awal dokumen. |
| **1.4.3 Contrast Minimum (Level AA)** | ⚠️ SEBAGIAN | Teks aksen neon memiliki kontras sangat tinggi (>9:1), namun teks muted kecil (`#7890af` pada surface gelap) berada di bawah ambang batas 4.5:1. |
| **2.4.7 Focus Visible (Level AA)** | ✅ LULUS | Semua tombol dan input memiliki outline fokus cyan (`outline: 3px solid rgba(79, 232, 255, .65)`). |

---

## TAHAP 13 — AUDIT MICROCOPY & KONTEN

1. **Percampuran Bahasa:**
   Terdapat percampuran Bahasa Indonesia dan Inggris yang tidak beraturan:
   * Menu: *"Radar Tren"* (ID) bersanding dengan *"Content Ideas"* (EN), *"AI Research"* (EN), *"Scripts"* (EN).
   * Tombol: *"Cancel"* (EN) bersanding dengan *"Simpan Ide"* (ID).
2. **Kejelasan Label:**
   Label-label utama sangat deskriptif dan mencerminkan operasional Zeinity (seperti formula hook: *"Contradiction Hook"*, *"Broken Assumption Hook"*, *"Function Drift Hook"*).
3. **Pesan Kesalahan:**
   Pesan kesalahan AI sangat informatif dan mendidik pengguna tentang penyebab kegagalan API serta cara mengatasinya.

---

## TAHAP 14 — AUDIT SKENARIO EKSTREM & EDGE CASES

1. **Jaringan Terputus / Supabase Offline:**
   Aplikasi menangani skenario offline dengan sangat baik berkat `offlineFetch` di `supabase.ts` dan sistem fallback cache lokal di `useContent.ts`.
2. **Teks Sangat Panjang:**
   * Judul konten yang sangat panjang pada tabel dipotong dengan rapi menggunakan `text-overflow: ellipsis` dan dilengkapi atribut `title` lengkap saat kursor diarahkan ke judul.
   * Dropzone naskah mampu menangani file markdown/word hingga puluhan ribu karakter (teruji pada *Erosi Kepemilikan Media Digital* dengan 64.542 karakter).
3. **Pemberian Input Kosong:**
   * Validasi mencegah pengiriman ide tanpa judul.

---

## TAHAP 15 — KLASIFIKASI UTANG UI/UX & TEKNIKAL

1. **Masalah Fungsional / Logika:** Bug hardcode provider di `Settings.tsx` (F-02).
2. **Masalah UX & Aliran Kerja:** Risiko kehilangan data input modal ide (F-01), pencarian global mati di menu non-tabel (F-06), polimorfisme klik judul tabel (F-05).
3. **Masalah Aksesibilitas:** Tag `<html lang="en">` (F-03), ketiadaan focus trap di semua modal (F-04), ketiadaan `aria-current="page"` (F-08), avatar fokus non-interaktif (F-11), ketiadaan bypass skip link (F-17).
4. **Masalah Responsif:** Ketiadaan layout sidebar persisten di desktop (F-07), penumpukan vertikal studio naskah di tablet (F-14), kepadatan ekstrem header mobile 375px (F-15).
5. **Masalah Desain Sistem & Konsistensi:** Fragmentasi 3 arsitektur modal berbeda (F-09), proliferasi ratusan gaya inline (F-10), inkonsistensi kapitalisasi & istilah bahasa (F-12), tipografi mikro <12px (F-13).
6. **Utang Teknikal / Legacy:** Cache fragmentasi localStorage, residu pembersihan visual cue di `useContent.ts` (F-20), ukuran file komponen monolitik ribuan baris (F-22).

---

## TAHAP 16 — EVALUASI PENGALAMAN PRODUK (PRODUCT EXPERIENCE)

* **Pengguna Baru (*First-Time User*):**
  * Halaman Overview menyambut pengguna dengan ringkasan metrik yang jelas dan widget Radar Tren terhangat.
  * Hambatan: Pengguna baru mungkin bingung mengapa sidebar tertutup dan harus terus-menerus mengklik hamburger icon.
* **Pengguna Mahir (*Returning Power User*):**
  * Efisiensi pembuatan naskah sangat tinggi berkat fitur *Pre-flight Bar*, kalkulator target kata otomatis, dan arsip riwayat draf naskah.
  * Hambatan: Ketiadaan shortcut pencarian global instan dan keterbatasan navigasi drawer di monitor desktop.

---

## TAHAP 17–19 — MATRIKS PRIORITAS PERBAIKAN

### P0 — Kritis (Harus Diperbaiki Segera)
1. `F-01`: Penjaga kehilangan data input pada `AddIdeaModal.tsx` dan `App.tsx`.
2. `F-02`: Koreksi bug logika hardcode provider `'custom'` pada tombol simpan di `Settings.tsx`.
3. `F-03`: Koreksi atribut bahasa dokumen `<html lang="id">` pada `index.html`.

### P1 — Tinggi (Dampak Signifikan pada Alur Kerja)
1. `F-04`: Penerapan *focus trap* dan manajemen fokus pada seluruh modal dialog.
2. `F-05`: Penataan ulang aksi klik judul tabel agar prediktif dan konsisten.
3. `F-06`: Fungsionalitas pencarian global (*universal search*) yang otomatis mengarahkan ke tabel ide.
4. `F-07`: Implementasi sidebar navigasi persisten untuk layar desktop (`>=1024px`).
5. `F-08`: Penambahan atribut semantik `aria-current="page"` pada menu navigasi aktif.
6. `F-09`: Standarisasi arsitektur modal dialog untuk mengeliminasi benturan z-index dan gaya.

### P2 — Sedang (Peningkatan Kualitas & Ergonomi)
1. `F-10`: Migrasi gaya inline di komponen utama ke token desain CSS.
2. `F-11`: Penghapusan `tabIndex={0}` pada avatar non-interaktif di header.
3. `F-12`: Harmonisasi kapitalisasi Title Case dan eliminasi double modal error.
4. `F-13`: Peningkatan kontras teks muted dan ukuran font minimal 12px.
5. `F-14`: Sub-tab pengalih Outline vs Draft Studio untuk tampilan tablet (`<=960px`).
6. `F-15`: Penyederhanaan elemen header pada layar ponsel mobile (375px).
7. `F-16`: Transisi langsung ke `PublishedDetail` saat konten ditandai selesai di `ScriptDetail`.
8. `F-17`: Penambahan link aksesibilitas *"Skip to Content"*.

### P3 — Rendah (Polish & Pembersihan Kode)
1. `F-18`: Penambahan `aria-label` pada file input dropzone.
2. `F-19`: Terapkan skeleton loading pada halaman Analitik & RSS Reader.
3. `F-20`: Pembersihan residu logika pembersih visual cue di `useContent.ts`.
4. `F-21`: Normalisasi karakter en-dash pada string opsi durasi.
5. `F-22`: Penjadwalan refactoring file monolitik ke sub-komponen yang lebih ringkas.

---

## TAHAP 20 — PRINSIP KESELAMATAN ARSITEKTUR

Seluruh temuan dan rencana perbaikan di atas dirancang tanpa melanggar fungsionalitas yang ada:
* **TIDAK** mengganti framework dasar (tetap React 18 & Vite).
* **TIDAK** merombak routing internal (tetap sinkron dengan sistem hash `navigation.ts`).
* **TIDAK** mengubah struktur database Supabase atau kontrak API AI di `gemini.ts`.
* **TIDAK** menghapus fitur apa pun yang sudah diverifikasi oleh 238 unit test.
* Implementasi hanya dilakukan setelah hasil audit dan rencana perbaikan ditinjau dan disetujui.
