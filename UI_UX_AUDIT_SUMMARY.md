# Ringkasan Eksekutif Audit UI/UX & Produk: Zeinity Creator Assistant

Dokumen ini menyajikan ringkasan strategis dari audit menyeluruh terhadap aplikasi web **Zeinity Creator Assistant** (sebelumnya *Zeinity Executive Report Web App*). Audit ini berfokus pada analisis arsitektur aktual, pengujian interaksi antarmuka nyata (browser), inspeksi kode sumber, konsistensi sistem desain, aksesibilitas WCAG 2.1 AA, serta utang antarmuka (*UI/UX debt*) yang terakumulasi dari berbagai siklus iterasi sebelumnya (Fase 1–4, Tahap 1–3, Transform A & D).

---

## 1. Kondisi Umum Aplikasi

* **Arsitektur & Fondasi:** Aplikasi dibangun dengan stack modern: React 18, TypeScript 5, Vite 5, Tailwind CSS 3 (dengan custom CSS kaca/glassmorphism intensif di `src/index.css`), serta Supabase JS Client dengan mekanisme *graceful offline fallback* berbasis `localStorage`.
* **Kematangan Fungsional:** Alur logika backend dan integrasi AI (Gemini, OpenRouter, Ollama, 9Router Gateway) sangat tangguh dan didukung oleh 238 unit & integration tests yang semuanya lulus (*pass rate* 100%).
* **Status Antarmuka:** Antarmuka visual memiliki estetika bertema gelap (*cyber/command-center dark aesthetic*) dengan palet warna neon cyan (`#4fe8ff`), ungu (`#9985ff`), hijau mint (`#53f2ad`), dan kuning amber (`#f9c74f`).
* **Kelemahan Sistemik:** Karena telah melalui banyak fase penambahan fitur secara iteratif, antarmuka mengalami **visual drift**, **behavioral drift**, **fragmentasi sistem modal**, dan **kebocoran gaya inline (*inline styling proliferation*)**. Banyak pola UX yang tidak seragam antarmenu serta risiko kehilangan data (*data loss risk*) pada modal penambahan ide.

---

## 2. Masalah UX Utama (User Experience & Usability)

1. **Risiko Kehilangan Data Input (P0 - Kritis):**
   Pada `AddIdeaModal.tsx`, jika pengguna sedang mengetik judul panjang atau catatan riset mendalam, mengklik 1 piksel saja di luar kartu modal (pada area backdrop) langsung memicu `onClose()` tanpa konfirmasi atau pengecekan *dirty state*. Hal serupa terjadi saat menekan tombol `Escape` di `App.tsx`, seluruh draf yang belum disimpan seketika musnah.
2. **Bug Penyimpanan Form Settings Menimpa Pilihan Provider (P0 - Kritis):**
   Pada `Settings.tsx` (baris 247), tombol aksi *"Simpan Semua Pengaturan"* memiliki logika `k === 'active_provider' ? 'custom' : ...` yang secara sepihak memaksakan provider aktif kembali ke `'custom'` (9Router). Jika pengguna sebelumnya memilih Google Gemini, OpenRouter, atau Ollama, preferensi mereka ditimpa secara diam-diam.
3. **Perilaku Polimorfik Judul Tabel yang Membingungkan (P1 - Tinggi):**
   Pada `ContentTable.tsx`, mengklik teks judul konten di dalam tabel memicu tiga tindakan berbeda tergantung status baris tersebut:
   * Status `Idea` / `Validating`: Membuka modal dialog *Edit Ide*.
   * Status `Researching` / `Scripting` / `Thumbnailing`: Berpindah halaman ke *ScriptDetail Workspace*.
   * Status `Published`: Berpindah halaman ke *PublishedDetail*.
   Pengguna tidak diberikan indikator visual apakah klik akan memunculkan pop-up atau melakukan navigasi halaman penuh.
4. **Bilah Pencarian Utama (*Global Search*) Tidak Responsif di Sebagian Besar Menu (P1 - Tinggi):**
   Input pencarian di `Topbar.tsx` terlihat menonjol di bagian atas layar setiap saat. Namun, fungsionalitas pencarian dinonaktifkan (`isTableActive = false`) saat pengguna berada di halaman *Overview*, *Radar Tren*, *RSS Reader*, *File Manager*, *Analytics*, dan *Settings*. Mengetik teks tidak memberikan hasil apa pun dan tidak mengarahkan pengguna ke tabel ide.
5. **Navigasi Desktop Dipaksa Menjadi Drawer Tersembunyi (P1 - Tinggi):**
   Pada layar monitor desktop lebar (1440px – 1920px), menu navigasi utama (`Sidebar.tsx`) disembunyikan secara default di balik ikon hamburger. Setiap pergantian halaman membutuhkan 2 kali klik (Buka Hamburger → Pilih Menu) dan memicu kemunculan backdrop gelap yang menutupi layar, mengurangi efisiensi pengguna harian.
6. **Anti-Pola Dialog Bertumpuk (*Double Modal Anti-Pattern*) (P1 - Tinggi):**
   Saat pengguna menekan tombol simpan dengan judul kosong di `AddIdeaModal.tsx`, sistem menampilkan pesan error inline sekaligus memunculkan dialog pop-up `AlertModal` di atas modal penambahan ide, memblokir alur kerja dengan dialog berlapis.

---

## 3. Masalah UI Utama (Visual & Layout)

1. **Fragmentasi Tiga Arsitektur Modal Berbeda:**
   Terdapat tiga implementasi modal yang terpisah tanpa standar komponen terpadu:
   * `.modal-layer` + `.modal`: Digunakan di `AddIdeaModal`, `ImportModal`, `BulkImportModal` (`z-index: 40`, radius 18px).
   * `.alert-modal-layer` + `.alert-modal-card`: Digunakan di `AlertModal` (`z-index: 9999`, radius 16px).
   * `.modal-overlay` + `.modal-container`: Digunakan di `ThumbnailTitleStudio` (`z-index: 1000`, radius 12px).
   Masing-masing memiliki gaya tombol tutup, animasi, dan tingkat keburaman latar belakang yang berbeda.
2. **Proliferasi Ribuan Baris Gaya Inline (*Inline Styles*):**
   Banyak elemen antarmuka di `Topbar.tsx`, `Overview.tsx`, `ContentTable.tsx`, dan `ScriptDetail.tsx` menggunakan gaya inline langsung (misal: `style={{ background: '#091222', border: '1px solid #162842' }}`) alih-alih memanfaatkan kelas utility atau variabel token CSS `:root` yang sudah disediakan di `src/index.css`.
3. **Inkonsistensi Huruf Kapital (*Casing Inconsistency*):**
   Pada navigasi sub-tahap `ScriptDetail.tsx`: Tab 1 ditulis dalam Title Case (`✍️ 1. Studio Naskah`), sedangkan Tab 2 ditulis dalam Huruf Kapital Penuh (`📦 2. FINISHING & PACKAGING`).

---

## 4. Masalah Aksesibilitas (WCAG 2.1 AA)

1. **Deklarasi Bahasa Dokumen Salah (`<html lang="en">`) (P0 - Kritis):**
   Di `index.html`, atribut bahasa dideklarasikan sebagai `lang="en"`, padahal 100% teks antarmuka dan konten aplikasi menggunakan Bahasa Indonesia. Pembaca layar (*screen reader*) mencoba membaca kata-kata Indonesia dengan fonetik bahasa Inggris, menyebabkan disorientasi total bagi pengguna tunanetra (Pelanggaran WCAG 3.1.1).
2. **Ketiadaan Pengunci Fokus (*Focus Trap*) pada Seluruh Modal (P1 - Tinggi):**
   Tidak ada satupun modal dialog (`AddIdeaModal`, `ImportModal`, `BulkImportModal`, `AlertModal`, `ThumbnailTitleStudio`) yang mengunci navigasi tombol `Tab`. Pengguna keyboard dapat melompat keluar dari modal dan memfokuskan tombol-tombol yang tertutup di latar belakang (Pelanggaran WCAG 2.1.2 & 2.4.3).
3. **Ketiadaan Atribut `aria-current="page"` pada Navigasi Aktif (P1 - Tinggi):**
   Pada menu `Sidebar.tsx`, penanda menu aktif hanya mengandalkan kelas CSS visual `.active` tanpa atribut semantik `aria-current="page"`, sehingga teknologi asistif tidak mengetahui halaman mana yang sedang aktif (Pelanggaran WCAG 4.1.2).
4. **Avatar Pengguna Non-Interaktif Mendapat Fokus Keyboard (P2 - Sedang):**
   Elemen avatar di `Topbar.tsx` memiliki atribut `tabIndex={0}`, sehingga dapat difokuskan dengan keyboard, namun tidak memiliki interaksi apa pun saat ditekan (tidak membuka profil atau dropdown) (Pelanggaran WCAG 4.1.2).
5. **Kontras Teks Muted dan Tipografi Terlalu Kecil (P2 - Sedang):**
   Beberapa label teks penting (`.eyebrow`, badge model router, pill counter) menggunakan ukuran huruf sangat kecil (antara 9.9px hingga 11.3px) dengan warna abu-abu kebiruan (`#7890af`), yang berada di bawah ambang batas kontras minimum 4.5:1 untuk teks normal.

---

## 5. Masalah Responsif (Multi-Device)

1. **Cakupan Media Query Sangat Minim:**
   Di dalam 2.594 baris `src/index.css`, hanya terdapat 5 deklarasi `@media`. Rentang layar tablet (768px – 1024px) tidak memiliki penyesuaian khusus yang memadai.
2. **Tabel 7 Kolom Terhimpit di Layar Tablet:**
   Tabel pipeline pada `ContentTable.tsx` memiliki 7 kolom data. Di layar 768px, sel-sel data terkompresi secara ekstrem dan memaksa scroll horizontal yang kaku.
3. **Kepadatan Ekstrem Header Mobile (375px):**
   Pada resolusi ponsel (375px), baris pertama `Topbar.tsx` memuat tombol menu hamburger, logo Zeinity, pill status 9Router, status bot, tombol terminal, dan avatar pengguna secara bersamaan. Total lebar gabungan mencapai ~424px, memicu tumpang tindih visual dan potensi overflow horizontal.
4. **Penyusunan Vertikal Studio Naskah di Tablet:**
   Di bawah lebar 960px, tata letak dua kolom Studio Naskah (`OutlineWorkspace` dan `ScriptDraftStudio`) ditumpuk secara vertikal. Pengguna harus menggulir ratusan baris kerangka (*outline*) sebelum dapat melihat kanvas penulisan draf naskah.

---

## 6. Masalah Konsistensi & Microcopy

1. **Percampuran Bahasa yang Tidak Harmonis:**
   Menu samping mencampurkan istilah Bahasa Indonesia dan Inggris: *"Radar Tren"* (ID) bersanding dengan *"Content Ideas"*, *"AI Research"*, *"Scripts"*, *"Published"*, *"File Manager"*, *"Analytics"*, dan *"Settings"* (EN). Tombol aksi juga tidak konsisten: *"Cancel"* versus *"Simpan Ide"*; *"Import Ide Masal"* versus *"Upload Dokumen"*.
2. **Eksposisi Jargon Teknis yang Berlebihan:**
   Label-label seperti *"9Router Gateway"*, *"Creator-Combo Presets"*, *"Context Window Ollama"*, dan *"TTS Anotasi"* terekspos langsung di antarmuka tingkat atas, membingungkan kreator konten non-teknis.

---

## 7. UI/UX & Technical Debt (Akumulasi Iterasi)

1. **Fragmentasi Cache LocalStorage:**
   Terdapat lebih dari 10 kunci terpisah untuk menyimpan satu entitas konten: `zeinity_cached_content_items`, `zeinity_audit_prompt_<id>`, `zeinity_casual_audit_prompt_<id>`, `zeinity_generated_titles_<id>`, `zeinity_hook_type_<id>`, `zeinity_hook_draft_<id>`, `zeinity_hook_notes_<id>`, dll. Hal ini merupakan kompensasi sementara atas belum sinkronnya kolom skema Supabase di masa lalu.
2. **Residu Pembersihan Fitur Lama:**
   Pada baris 20–33 di `src/hooks/useContent.ts`, masih terdapat kode pembersih residual untuk `zeinity_visual_cue_prompt_` yang menandakan fitur tersebut pernah dihapus secara bertahap namun meninggalkan jejak kode migrasi.
3. **Ukuran Komponen Terlalu Raksasa (*Monolithic Components*):**
   * `src/views/ScriptDetail.tsx`: 3.755 baris kode.
   * `src/lib/gemini.ts`: 3.470 baris kode.
   * `src/index.css`: 2.594 baris kode.
   * `src/components/script/ScriptDraftStudio.tsx`: 2.474 baris kode.
   * `src/views/Settings.tsx`: 1.627 baris kode.

---

## 8. Area yang Membutuhkan Perhatian Mendesak

1. **Prioritas 1 (Integritas Data & Fungsionalitas Dasar):** Perbaiki penutupan modal tanpa konfirmasi di `AddIdeaModal.tsx` dan perbaiki bug hardcode provider di `Settings.tsx`. Ubah atribut `lang="id"` pada `index.html`.
2. **Prioritas 2 (Ergonomi Kerja & Navigasi):** Sediakan mode sidebar persisten untuk layar desktop (>=1024px), perbaiki fungsionalitas pencarian global agar otomatis mengarahkan ke tabel, dan buat indikator jelas untuk klik judul tabel.
3. **Prioritas 3 (Aksesibilitas & Standardisasi):** Satukan ketiga varian modal menjadi satu komponen dialog terstandarisasi dengan *focus trap* dan dukungan keyboard penuh.
