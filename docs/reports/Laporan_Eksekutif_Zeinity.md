# Laporan Eksekutif & Spesifikasi Teknis: Zeinity Creator Assistant

Dokumen komprehensif ini merupakan gabungan dari dua pilar utama proyek Zeinity Creator Assistant: 
1. **Laporan Keputusan Naratif**, yang menceritakan filosofi dan keputusan strategis di balik setiap fitur.
2. **Product Requirements Document (PRD)**, yang berisi cetak biru spesifikasi teknis kaku untuk keperluan pengembangan (*engineering*).

---

## BAGIAN I: LAPORAN KEPUTUSAN STRATEGIS (NARASI WAWANCARA)

### 1. Fondasi Arsitektur & Infrastruktur
Pada tahap awal, diputuskan bahwa aplikasi ini akan di-*deploy* murni secara **lokal** (localhost). Keputusan ini diambil untuk menjamin keamanan data dan memastikan operasional yang 100% gratis tanpa batasan cloud. Database yang disepakati adalah **SQLite** karena sifatnya yang simpel dan berbasis file (*file-base*), dipadukan dengan sistem otentikasi (login) statis yang sederhana.

Guna mempercepat proses pengumpulan ide, disepakati integrasi **Telegram Bot** yang tersambung langsung dengan *web app*. Untuk urusan pemrosesan kecerdasan buatan, pilihan berevolusi menjadi **Multi-AI Routing**. Sistem menyertakan **Ollama** (agar pemrosesan bisa berjalan lokal tanpa batas kuota API), serta menjadikan OpenRouter atau Gemini sebagai opsi cadangan (*fallback*).

### 2. Alur Kerja (Workflow) & Mekanika Sistem
Dalam hal memvalidasi ide konten yang masuk, metode **Validasi Manual** dipilih untuk menghemat kuota API. Bot Telegram dirancang untuk merespons secara aktif dengan menyematkan **Tombol Inline Keyboard ("Validasi AI Langsung")**, memungkinkan eksekusi AI jarak jauh.

Untuk riset konten, sistem mendukung (1) unggah dokumen fisik (`.docx`, `.txt`, `.md`, `.csv`), dan (2) salin-tempel teks secara manual. Seluruh dokumen fisik yang diunggah akan diarsipkan permanen di dalam direktori `uploads/`. Output *prompt* AI disajikan dalam format **Semi-Matang** di dalam *Human-in-the-Loop editor* transparan, sehingga pengguna leluasa merevisinya sebelum menyalin.

### 3. Anatomi Antarmuka (UI) & Pengalaman Pengguna (UX)
Antarmuka utama menggunakan **Tabel Data** interaktif yang mencakup kolom krusial: Kategori Konten, Target Publish, Platform Tujuan, Ide Judul (AI), dan Prompt Thumbnail. Fitur **Analytics** dipisahkan ke halaman khusus. 

Semua **Tombol Aksi AI** pada baris tabel bersifat **dinamis**—hanya muncul menyesuaikan tahapan status baris tersebut (Ide ➔ Riset ➔ Scripting). Tema besar visualnya adalah estetika **Premium Glassmorphism** (bernuansa biru indigo gradient). Navigasi **Sidebar** disepakati menggunakan mode *Hidden/Floating*, dan tata letak diwajibkan **Responsif** untuk akses sesekali melalui *smartphone*.

---

## BAGIAN II: PRODUCT REQUIREMENTS DOCUMENT (PRD)

*Bagian ini dikhususkan sebagai Master Prompt untuk mesin AI Builder agar dapat membangun aplikasi dengan akurasi 100%.*

### 1. TUMPUKAN TEKNOLOGI & ARSITEKTUR
- **Frontend & Backend API**: Next.js (App Router / Pages Router).
- **Custom Server**: Menggunakan `server.js` (Node.js) untuk membungkus Next.js agar Bot Telegram berjalan serentak menggunakan *long-polling*.
- **Database**: SQLite menggunakan Prisma ORM.
- **Styling**: Vanilla CSS (CSS Modules). **DILARANG KERAS menggunakan Tailwind**. Harus menggunakan gaya Premium Glassmorphism.

### 2. PANDUAN UI / UX
- **Tema Visual**: Gradien biru indigo, penggunaan `backdrop-filter: blur()`, kartu semi-transparan, dan *glowing borders*.
- **Navigasi**: Sidebar **disembunyikan secara default**. Hanya muncul melayang (*slide-in overlay*) saat di-hover ke kiri atau ikon menu diklik.
- **Status Interaktif**: 
  - Tombol aksi tabel harus dinamis (muncul sesuai status).
  - Kolom tabel harus mencegah *blowout* (`text-overflow: ellipsis` atau `max-width`).
  - **Jendela Log AI**: Antarmuka terminal transparan *overlay* untuk menampilkan proses AI secara *real-time*.

### 3. SKEMA DATABASE (Prisma)
1. `Content`: `id`, `title`, `source` (Web/Telegram), `status` (Idea, Validating, Research, Scripting, Published), `category`, `researchText`, `generatedTitle` (Mode A/B), `generatedThumbnailPrompt`, `createdAt`, `updatedAt`.
2. `Setting`: `key` (UNIQUE), `value` (Untuk Kunci API seperti Token Telegram & Gemini, menggantikan fungsi `.env`).

### 4. FITUR UTAMA & ALUR KERJA
**A. Bot Telegram (Long-Polling)**
- Menyimpan pesan teks ke tabel `Content` sebagai Ide (Source: Telegram).
- Membalas dengan tombol *Inline Keyboard* `[ Validasi AI Langsung ]`. Mengeklik tombol ini memicu validasi AI di latar belakang dan mengubah status database.

**B. Multi-AI Provider Gateway**
- Mendukung pergantian dinamis antara Gemini API, OpenRouter, dan Ollama (Localhost).

**C. Alur Kerja "Validate AI"**
- Memunculkan indikator *loading* baris tabel (tanpa *reload* halaman).
- Mengekstrak teks dari `IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx` (`/public/uploads/`).
- Klasifikasi 5 Pilar Konten, perumusan Judul Mode A & B, serta perumusan Thumbnail Prompt (1-3 kata kontras).
- Tabel Frontend diperbarui seketika (*real-time*).

**D. Manajemen File**
- Dukungan unggah `.docx` dan `.csv`.
- File fisik disimpan di `/public/uploads/`.
- Backend dapat mengekstrak teks untuk Konteks AI.

### 5. ALUR KERJA PENGEMBANGAN (BUILDER WORKFLOW)
1. Inisialisasi proyek Next.js baru.
2. Siapkan Prisma & SQLite.
3. Buat `server.js` untuk Custom Next.js + Bot Telegram.
4. Bangun variabel CSS Glassmorphism dan layout UI.
5. Terapkan rute API CRUD Database.
6. Terapkan rute API AI Gateway terpusat (`/api/content/validate`).
7. Sambungkan tombol aksi Frontend ke API Backend (Fetch/Axios).
