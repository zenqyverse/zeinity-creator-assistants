# Implementasi Alur Kerja Content Intelligence & Integrasi Gemini

Berdasarkan penjelasan Anda, kita akan merombak web app ini menjadi **Prompt-Generation & Workflow-Tracking Hub**. Aplikasi akan berfungsi sebagai "otak" yang merumuskan prompt (Research Brief, Scriptwriter Brief, Thumbnail Prompt) untuk di-copy-paste ke AI eksternal, dan menyimpan hasil kembaliannya.

## User Review Required

> [!IMPORTANT]
> **Database:** Mengingat proyek ini belum memiliki setup Supabase yang aktif (hanya kerangka dari Bolt.new), saya mengusulkan kita beralih ke **LocalStorage Adapter** sementara waktu untuk MVP ini. Ini memungkinkan Anda langsung menguji seluruh alur kerja dan integrasi AI hari ini tanpa terhambat oleh proses instalasi & setup database. Apakah Anda setuju?
> 
> **Dokumen Identitas:** Saya akan menggunakan `mammoth.js` untuk mengekstrak teks dari `.docx` secara langsung di browser ketika Anda mengunggah file `IDENTITAS_&_STRATEGI_...docx`.

## Open Questions

> [!CAUTION]
> 1. Apakah Anda setuju dengan transisi status berikut ini?
>    `Idea` -> `Validating` -> `Researching` (menghasilkan Research Brief) -> `Scripting` (menghasilkan Outline & Script Brief) -> `Thumbnailing` (menghasilkan Thumbnail Prompt) -> `Published`
> 2. Apakah saya boleh langsung menginstal dependensi tambahan yaitu `@google/generative-ai` (untuk LLM) dan `mammoth` (untuk membaca file docx)?

## Proposed Changes

---

### 1. Model & Data Layer (Types & Database)

Pembaruan pada schema agar mendukung field prompt yang dihasilkan AI dan teks masukan dari AI eksternal.

#### [MODIFY] `src/types.ts`
- Menambahkan status `Thumbnailing` ke `ContentStatus`.
- Menambahkan field baru pada `ContentItem`: `research_brief_prompt`, `external_research_output`, `script_outline`, `scriptwriter_brief_prompt`, `external_script_output`.

#### [MODIFY] `src/hooks/useContent.ts`
- Mengganti pemanggilan API `supabase` dengan wrapper **LocalStorage** (CRUD sederhana) agar aplikasi bisa menyimpan state meskipun di-refresh, tanpa perlu koneksi database riil.

---

### 2. Integrasi AI (Google Gemini)

Penambahan logic untuk mengeksekusi instruksi ke Gemini berdasarkan tahapan.

#### [NEW] `src/lib/gemini.ts`
- Membangun service untuk memanggil Gemini API menggunakan API key dari `settings`.
- Menyediakan fungsi-fungsi khusus:
  - `generateValidationAndResearchBrief(idea, identityText)`
  - `generateScriptOutlineAndBrief(idea, researchOutput, identityText)`
  - `generateThumbnailPrompt(idea, scriptOutput)`

---

### 3. Ekstraksi File Dokumen (.docx & .txt)

#### [MODIFY] `src/App.tsx` (atau File Manager)
- Mengintegrasikan `mammoth.js` pada fungsi `handleImportFile`.
- Ketika `.docx` diunggah, teks akan diekstrak dan disimpan ke dalam state aplikasi (atau tabel settings/files) sebagai `channel_identity_text` agar bisa dikirim sebagai context ke Gemini.

---

### 4. Workflow UI & ScriptEditor Updates

Pembaruan antarmuka untuk menyesuaikan dengan alur yang mensyaratkan user meng-copy prompt ke eksternal AI dan mem-paste hasilnya kembali.

#### [MODIFY] `src/App.tsx`
- Memperbarui fungsi `handleValidate` untuk benar-benar memanggil Gemini API (menggantikan `setTimeout` mock).
- Menambahkan logic transisi status (misal: tombol "Selesai Riset -> Lanjut Scripting").

#### [MODIFY] `src/views/ScriptDetail.tsx` (dan mungkin membuat `ResearchDetail.tsx`)
- Merombak desain menjadi **Workspace Dua Arah**:
  - **Kiri/Atas:** Area output dari AI internal (menampilkan prompt *Research Brief*, *Scriptwriter Brief*, dsb dengan tombol Copy).
  - **Kanan/Bawah:** Area textarea/input agar user dapat mem-paste hasil (*output*) dari AI eksternal, dengan tombol "Submit / Lanjut ke Tahap Berikutnya".

## Verification Plan

### Manual Verification
1. Anda akan mengunggah dokumen Identitas Channel (.docx) di UI.
2. Anda akan membuat ide baru, lalu mengeklik tombol Validasi.
3. Kita akan memastikan web app memanggil Gemini menggunakan API Key dari settings, menghasilkan *Research Brief Prompt*.
4. Anda akan menyimulasikan copy-paste dari eksternal AI (memasukkan sembarang teks sebagai riset), dan sistem lanjut membuahkan *Script Outline* & *Scriptwriter Brief*.
5. Verifikasi semua status berhasil disimpan di LocalStorage.
