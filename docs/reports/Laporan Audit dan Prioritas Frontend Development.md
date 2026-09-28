Berdasarkan audit mendalam dan uji kritis (*adversarial fact-checking*) pada seluruh basis kode **frontend** (*components, hooks, views, state management, dan prompt generation*), berikut adalah laporan lengkap temuan celah, *bug*, cacat alur (*UX defect*), inkonsistensi, *placeholder*, serta redundansi fungsi yang dikelompokkan berdasarkan skala prioritas: **🔴 Parah / Kritis $\rightarrow$ 🟡 Tinggi $\rightarrow$ 🔵 Sedang $\rightarrow$ 🟢 Minor**.

---

## 📑 Ringkasan Eksekutif & Peta Masalah Frontend

Codebase frontend Zeinity Web App memiliki fondasi desain antarmuka yang sangat modern dan terstruktur. Namun, terdapat beberapa celah arsitektural di mana **state tidak terisolasi dengan aman**, **penanganan offline belum merata antar-fitur**, serta **beberapa aksi destruktif belum memiliki pengaman/konfirmasi**.

Berikut rincian lengkapnya:

---

## 🔴 Kategori 1: PARAH / KRITIS (Harus Diprioritaskan Pertama)
*Celah yang berpotensi menghilangkan data pengguna secara permanen, menyebabkan aplikasi lumpuh (*crash*/*blank*), atau kebocoran data antar-item konten.*

### 1. File Manager & Master Identity Lumpuh Total Saat Offline
- **Lokasi Kode**: [`useFiles.ts` (baris 30–55)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/hooks/useFiles.ts#L30-L55) & [`ScriptDetail.tsx` (baris 472)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L472)
- **Celah & Dampak**:
  Berbeda dengan [`useContent.ts`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/hooks/useContent.ts) yang memiliki sistem *fallback* cadangan `localStorage`, [`useFiles.ts`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/hooks/useFiles.ts) langsung memanggil query `supabase.from('uploaded_files')` tanpa mengecek konfigurasi Supabase (`isSupabaseConfigured`).
  - **Efeknya**: Saat aplikasi dijalankan tanpa koneksi Supabase, File Manager akan selamanya kosong (`files = []`), berkas identitas default (*Master Docx SEED_FILES*) lenyap, dan tombol upload berkas referensi di [`ScriptDetail.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx) gagal menyimpan berkas karena melakukan direct query insert Supabase tanpa penanganan offline.

### 2. Kebocoran State Antar-Konten (*Cross-Item State Leakage*) di Workspace Naskah
- **Lokasi Kode**: [`ScriptDetail.tsx` (baris 324–342)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L324-L342)
- **Celah & Dampak**:
  Ketika pengguna berpindah dari satu video ke video lain di workspace:
  ```ts
  useEffect(() => {
    if (item.research_brief_prompt) setResearchBriefPrompt(item.research_brief_prompt);
    if (item.scriptwriter_brief_prompt) setHandoffPrompt(item.scriptwriter_brief_prompt);
    if (item.audit_spoken_prompt) {
      setAuditFindings(item.audit_spoken_prompt);
      setShowAuditResults(true);
    }
    // ...
  }, [item.research_brief_prompt, ...]);
  ```
  Semua kondisi hanya menggunakan `if (item.xxx)` tanpa cabang `else` / reset state, dan `item.id` tidak dipantau untuk me-reset state lokal. Jika pengguna membuka Video A (yang sudah diaudit), lalu berpindah membuka Video B (yang masih baru/kosong):
  - Hasil audit dan prompt naskah dari Video A **bocor dan tertampil di layar Video B**.
  - Kreator bisa mengira video baru tersebut sudah diaudit atau salah menyalin naskah video lain.

### 3. Aksi Destruktif Hapus Data Tanpa Dialog Konfirmasi (*Accidental Data Loss*)
- **Lokasi Kode**:
  - Hapus Ide: [`ContentTable.tsx` (baris 316)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ContentTable.tsx#L316) $\rightarrow$ [`App.tsx` (baris 314–325)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/App.tsx#L314-L325)
  - Hapus Berkas: [`FileManager.tsx` (baris 117)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/FileManager.tsx#L117) $\rightarrow$ [`App.tsx` (baris 565–572)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/App.tsx#L565-L572)
- **Celah & Dampak**:
  Mengklik ikon tong sampah di tabel ide atau daftar file **langsung mengeksekusi penghapusan permanen tanpa konfirmasi apa pun**. Pengguna yang berniat menekan tombol edit tetapi tidak sengaja mengeklik ikon sampah di sebelahnya akan kehilangan seluruh draf naskah, catatan riset, dan prompt AI yang sudah disusun berhari-hari. Komponen modal konfirmasi ([`AlertModal.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/AlertModal.tsx)) sudah tersedia di proyek namun belum dihubungkan ke tombol-tombol hapus ini.

### 4. Tab Filter Tabel Mengosongkan Baris Data (*Data Blackout*) di Halaman Published & Scripts
- **Lokasi Kode**: [`ContentTable.tsx` (baris 94–100 & 77–83)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ContentTable.tsx#L77-L100)
- **Celah & Dampak**:
  Komponen [`ContentTable.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ContentTable.tsx) digunakan ulang di berbagai halaman (`Ideas`, `Research`, `Scripts`, `Published`). Namun tab filternya didefinisikan secara statis:
  `["All Ideas", "Telegram", "Web", "Needs Validation", "In Production"]`.
  Ketika pengguna berada di halaman **Published** atau **Scripts**, tab *"Needs Validation"* dan *"In Production"* tetap muncul. Jika pengguna mengklik tab *"Needs Validation"*, tabel seketika menjadi **0 data / kosong melompong** karena item yang berstatus `'Published'` tidak memenuhi kondisi status tab tersebut. Selain itu, indikator di bagian bawah tabel selalu bertuliskan `"ide aktif"` apapun halamannya.

---

## 🟡 Kategori 2: TINGGI (Cacat Alur & Fungsionalitas Signifikan)
*Fitur yang belum matang, membingungkan proses kerja pengguna, atau menghasilkan output AI yang tidak sesuai harapan.*

### 5. Naskah Disembunyikan Total di Tahap Thumbnailing & Hilang di Published Detail
- **Lokasi Kode**: [`ScriptDetail.tsx` (baris 1431, 2012–2060)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L1431) & [`PublishedDetail.tsx` (baris 283–305)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/PublishedDetail.tsx#L283-L305)
- **Celah & Dampak**:
  - Di [`ScriptDetail.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx), tampilan editor naskah dikunci dengan `item.status === 'Scripting'`. Begitu status dinaikkan ke `'Thumbnailing'`, seluruh teks naskah dan hasil audit langsung lenyap dari layar, hanya digantikan instruksi prompt thumbnail. Padahal kreator butuh melihat naskah untuk mencocokkan hook thumbnail dengan kata kunci naskah.
  - Di [`PublishedDetail.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/PublishedDetail.tsx), halaman hanya menampilkan metadata, metrik, dan thumbnail prompt, tetapi **tidak ada satu pun kartu yang menampilkan naskah final video**.

### 6. Janji Palsu "Draft Asli Tidak Akan Hilang Dari Riwayat" Tanpa Adanya Versi / Undo
- **Lokasi Kode**: [`ScriptDetail.tsx` (baris 693–702 & 412–415)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L693-L702)
- **Celah & Dampak**:
  Ketika audit spoken AI selesai, modal menampilkan pesan:
  > *"Apakah Anda ingin menerapkan draft revisi ke kotak input? Draft asli tidak akan hilang dari riwayat."*
  Faktanya, fungsi `handleApplyToDraft` langsung menimpa `scriptOutput` tanpa menyimpan teks lama ke `localStorage` atau properti draf cadangan. **Tidak ada sistem riwayat versi naskah**. Jika naskah revisi AI ternyata tidak disukai oleh pengguna, teks draf asli buatan pengguna sudah hilang tertimpa.

### 7. Catatan Konteks Awal (`research_text`) Diabaikan & Dibuang oleh AI Generator
- **Lokasi Kode**: [`App.tsx` (baris 358–363)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/App.tsx#L358-L363), [`ScriptDetail.tsx` (baris 512–517)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L512-L517), [`gemini.ts` (baris 495–511)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/gemini.ts#L495-L511)
- **Celah & Dampak**:
  Form `AddIdeaModal` menyediakan kolom isian *"Konteks / catatan singkat"* (`research_text`). Namun fungsi perumus prompt AI `generateResearchBriefPrompt` hanya menerima `(config, title, category, identityText)`. Semua catatan riset awal atau URL referensi yang sudah diketik pengguna diabaikan dan tidak dimasukkan ke dalam prompt AI.

### 8. Fitur Zombie / Placeholder: Judul Mode A / Mode B
- **Lokasi Kode**: [`types.ts` (baris 74–75)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/types.ts#L74-L75) & [`PublishedDetail.tsx` (baris 285–291)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/PublishedDetail.tsx#L285-L291)
- **Celah & Dampak**:
  Tampilan `PublishedDetail` memiliki seksi khusus "Final Title (Mode A)" dan "Alt Title (Mode B)". Namun tidak ada satu pun fungsi di [`gemini.ts`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/gemini.ts) maupun antarmuka input yang pernah menghasilkan atau mengedit `generated_title_a` atau `generated_title_b`. Tampilan ini menjadi elemen mati (*dead UI*).

### 9. Context Window Prompt AI Membebani Model Lokal Ollama
- **Lokasi Kode**: [`gemini.ts` (baris 744 & 431)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/gemini.ts#L744)
- **Celah & Dampak**:
  Prompt audit spoken memotong naskah hingga `slice(0, 60000)` karakter (~15.000 token). Angka ini aman untuk Gemini Flash (1 juta token), tetapi fungsi `callOllama` tidak menentukan parameter `options: { num_ctx }` (secara default Ollama dibatasi 2048 token). Akibatnya jika pengguna memilih Ollama, model lokal akan mengalami pemotongan teks secara mendadak (*silent clipping*), halusinasi, atau *timeout*.

### 10. Dropzone `ScriptDetail` Menolak Berkas Dokumen `.docx`
- **Lokasi Kode**: [`ScriptDetail.tsx` (baris 436–444)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L436-L444)
- **Celah & Dampak**:
  Input unggah naskah di workspace hanya menerima berkas `.md` (`accept: '.md,text/markdown'`). Padahal proyek sudah dilengkapi library `mammoth.js` dan fungsi ekstraksi [`extractTextFromFile`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/docx.ts#L74). Pengguna yang menulis naskah di Microsoft Word atau Google Docs terpaksa mengonversi berkas secara manual.

---

## 🔵 Kategori 3: SEDANG (Cacat UX, Navigasi, & Redundansi Kode)
*Masalah yang mengganggu kenyamanan navigasi harian atau duplikasi kode yang memberatkan pemeliharaan.*

### 11. Navigasi Revert di `PublishedDetail` Menjebak Pengguna di Layar Published
- **Lokasi Kode**: [`PublishedDetail.tsx` (baris 59–64)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/PublishedDetail.tsx#L59-L64) & [`App.tsx` (baris 418 & 457–464)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/App.tsx#L418)
- **Celah & Dampak**:
  Ketika pengguna menekan tombol *"Revert ke Thumbnailing"* di `PublishedDetail`, status item di database berhasil diubah. Namun state `publishedItem` di [`App.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/App.tsx) tidak di-reset ke `null`. Akibatnya pengguna tetap terkunci di layar `PublishedDetail` dengan tampilan aneh (judul seksi tetap "Published", namun status badge berubah menjadi "Thumbnailing"). Pengguna tidak otomatis dialihkan kembali ke editor `ScriptDetail`.

### 12. Tombol "Import File" Menyesatkan Pengguna di Pipeline Ide
- **Lokasi Kode**: [`App.tsx` (baris 473, 504)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/App.tsx#L473) & [`ImportModal.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/ImportModal.tsx)
- **Celah & Dampak**:
  Di header halaman *Content Ideas*, terdapat tombol *"Import File"* di samping tombol *"Tambah Ide"*. Pengguna berekspektasi tombol ini dapat mengimpor draf ide dari file CSV atau teks. Kenyataannya, tombol ini membuka modal upload referensi ke File Manager. Jika user mengunggah CSV ide, berkas tersebut hanya menjadi teks referensi pasif di File Manager, bukan baris ide di pipeline.

### 13. Judul Ide di Tabel Tidak Dapat Diklik (*Unclickable Title*)
- **Lokasi Kode**: [`ContentTable.tsx` (baris 257)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ContentTable.tsx#L257) & [`Overview.tsx` (baris 144)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/Overview.tsx#L144)
- **Celah & Dampak**:
  Elemen judul konten di tabel pipeline dan overview hanya berupa teks biasa tanpa event klik (`onClick`) atau kursor *pointer*. Pengguna harus menggeser mata ke ujung kanan tabel untuk mencari tombol aksi kecil. Khusus untuk status `'Idea'`, bahkan tidak ada tombol untuk membuka workspace detail (hanya ada tombol "Validasi AI").

### 14. Duplikasi Fungsi Pembersih Prompt (*Redundant Utility*)
- **Lokasi Kode**: [`formatPromptText` di `ScriptDetail.tsx` (baris 25–65)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L25-L65) dan [`formatStructuredPrompt` di `gemini.ts` (baris 562–612)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/gemini.ts#L562-L612)
- **Celah & Dampak**:
  Kedua fungsi ini menjalankan ~50 baris regex pembersihan XML tag (`<think>`, `<research_brief>`, dll) yang nyaris identik. Jika aturan format tag AI diubah di masa depan, pengembang harus memperbarui regex di dua tempat berbeda.

### 15. Kalkulasi "Avg Production Time" Rusak oleh Auto-Save
- **Lokasi Kode**: [`Analytics.tsx` (baris 56–59)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/Analytics.tsx#L56-L59)
- **Celah & Dampak**:
  Formula menghitung selisih waktu antara `created_at` dan `updated_at`. Karena sistem menerapkan *auto-save* setiap kali draf naskah diedit, video yang masih berstatus *drafting* selama berminggu-minggu akan mengacaukan metrik rata-rata durasi produksi di dashboard analitik.

---

## 🟢 Kategori 4: MINOR & KOSMETIK (Polishing & Kode Bersih)
*Peringatan linting, pesan teks statis yang kurang pas, dan kolom data yang belum terpakai.*

### 16. Fast Refresh Warnings (ESLint) pada Hook Ekspor
- **Lokasi Kode**: [`AlertModal.tsx` (baris 43, 51)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/AlertModal.tsx#L43) dan [`Terminal.tsx` (baris 25)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/Terminal.tsx#L25)
- **Dampak**: Peringatan `react-refresh/only-export-components`. Saat berkas ini diedit saat masa pengembangan (*development*), Vite terpaksa me-*reload* seluruh halaman (*full page refresh*) alih-alih melakukan *hot reload* instan.

### 

Error: The stream was interrupted. Please continue the task you were working on. (Error ID: 8b31e408-afaa-40f7-8744-f0963c351343-32)

Melanjutkan laporan dari kategori minor:

### 17. Pesan Parsing Word Statis Saat Mengunggah Berkas Teks Murni
- **Lokasi Kode**: [`ImportModal.tsx` (baris 102)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/ImportModal.tsx#L102)
- **Dampak**: Teks status menampilkan pesan *"Mengekstrak teks dokumen Word (Mammoth.js)..."* bahkan ketika pengguna sedang mengunggah berkas `.txt` atau `.csv`.

### 18. Dead Schema di Definisi Tipe TypeScript
- **Lokasi Kode**: [`types.ts` (baris 69, 78)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/types.ts#L69)
- **Dampak**: Kolom `script_outline` dan `target_publish_date` didefinisikan dalam antarmuka `ContentItem`, namun tidak pernah dibaca, diedit, atau dirender di bagian mana pun dalam antarmuka UI.

### 19. Search Bar Topbar Pasif di Halaman Non-Tabel
- **Lokasi Kode**: [`Topbar.tsx` (baris 53)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/Topbar.tsx#L53)
- **Dampak**: Kotak input pencarian di bilah atas tetap aktif dan dapat diketik saat berada di halaman *Analytics*, *Settings*, atau *File Manager*, padahal *event filtering* hanya bekerja untuk tabel konten pipeline.

---

## 🗺️ Roadmap Prioritas Pengembangan Frontend (Bertahap)

Berdasarkan analisis dampak di atas, berikut urutan rekomendasi pengerjaan agar proses pengembangan Anda terarah dan tidak membingungkan:

```
[Tahap 1: Proteksi Data & Alur Kritis] 
       ⬇ (Segera dikerjakan: Cegah data hilang & perbaiki offline)
[Tahap 2: Kontinuitas Naskah & Integrasi AI] 
       ⬇ (Tingkatkan akurasi AI & kenyamanan penulisan naskah)
[Tahap 3: Pembersihan Fitur Zombie, Metrik, & Polishing]
         (Rapikan duplikasi, dead UI, dan UX detail)
```

---

### 🎯 Tahap 1: Proteksi Data & Alur Kritis (Prioritas Tertinggi — Segera)
1. **Fallback Offline `useFiles.ts`**:
   - Tambahkan pengecekan `if (!isSupabaseConfigured)` dan simpan daftar file ke `localStorage` (mirip seperti pola di [`useContent.ts`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/hooks/useContent.ts)).
   - Ini memastikan File Manager dan berkas identitas saluran tetap dapat dibuka dan dioperasikan tanpa Supabase.
2. **Pencegahan State Leakage di `ScriptDetail.tsx`**:
   - Reset seluruh state turunan AI (`researchBriefPrompt`, `handoffPrompt`, `auditFindings`, `showAuditResults`, dll.) saat `item.id` berganti, sehingga hasil audit video sebelumnya tidak bocor ke video baru.
3. **Dialog Konfirmasi Penghapusan Data**:
   - Hubungkan tombol hapus di [`ContentTable.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ContentTable.tsx) dan [`FileManager.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/FileManager.tsx) ke [`AlertModal.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/AlertModal.tsx) dengan tipe `'warning'` agar tidak ada draf naskah yang terhapus karena salah klik.
4. **Perbaikan Tab Filter `ContentTable.tsx`**:
   - Sesuaikan daftar tab filter dengan halaman yang sedang aktif agar halaman `Published` dan `Scripts` tidak menampilkan 0 data saat tab diklik.

---

### 🎯 Tahap 2: Kontinuitas Naskah & Integrasi AI (Prioritas Signifikan)
1. **Kontinuitas Naskah di Semua Tahapan**:
   - Pastikan teks naskah tetap dapat dibaca/disalin dalam mode *read-only / collapsible* saat berada di tahap `Thumbnailing` dan di halaman [`PublishedDetail.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/PublishedDetail.tsx).
2. **Kirim Konteks Awal (`research_text`) ke AI**:
   - Teruskan catatan singkat/tautan yang diinput pengguna di modal ide baru ke dalam fungsi prompt [`generateResearchBriefPrompt`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/gemini.ts#L495).
3. **Dukungan Format `.docx` di Dropzone Naskah**:
   - Izinkan berkas `.docx` pada dropzone naskah [`ScriptDetail.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx) menggunakan fungsi [`extractTextFromFile`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/docx.ts#L74).
4. **Pencegahan Overload Model Lokal Ollama**:
   - Batasi karakter teks audit khusus untuk Ollama (maks 10.000–12.000 karakter) atau teruskan parameter `num_ctx: 16384` pada panggilan API lokal.

---

### 🎯 Tahap 3: Pembersihan Fitur Zombie & Polishing (Prioritas Sedang / Minor)
1. **Keputusan Fitur Judul Mode A / Mode B**:
   - Putuskan apakah fitur judul A/B testing ini akan diimplementasikan ke generator thumbnail, atau dihapus dari tampilan agar tidak membingungkan pengguna.
2. **Koreksi Logika Revert di `PublishedDetail`**:
   - Pastikan saat status dikembalikan ke `Thumbnailing` atau `Scripting`, sistem mengarahkan pengguna kembali ke editor workspace naskah.
3. **Satukan Utilitas Pembersih Prompt**:
   - Hapus duplikasi [`formatPromptText`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L25) dan pusatkan pada [`formatStructuredPrompt`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/gemini.ts#L562).
4. **Perbaiki Metrik Produksi di Analitik**:
   - Filter kalkulasi durasi produksi rata-rata hanya dari video yang berstatus `'Published'`.
5. **Bersihkan Warning ESLint**:
   - Pindahkan deklarasi hook dari [`AlertModal.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/AlertModal.tsx) dan [`Terminal.tsx`](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/Terminal.tsx) ke berkas hook terpisah.

---

### 💡 Hal yang Perlu Keputusan Anda:
Sebelum kita mulai mengeksekusi perbaikan bertahap di masa mendatang, ada 3 hal yang memerlukan arahan Anda:
1. **Fitur Judul Mode A & Mode B**: Apakah Anda ingin fitur ini diaktifkan (misalnya AI meng-generate 2 variasi judul video untuk A/B testing CTR di YouTube), atau sebaiknya disederhanakan menjadi 1 judul saja?
2. **Riwayat Draf Naskah (Draft Versioning)**: Ketika AI menerapkan revisi spoken audit, apakah Anda menginginkan sistem snapshot draf sederhana (misal menyimpan 3–5 versi naskah sebelumnya di `localStorage` sehingga bisa di-*undo*)?
3. **Tombol "Import File" di Header Ide**: Apakah tombol ini sebaiknya diubah menjadi fitur import daftar ide konten masal dari file `.csv`/`.txt`, atau cukup disembunyikan dari halaman ide dan difokuskan di File Manager saja?

Sesuai instruksi Anda, **belum ada kode yang diubah/dieksekusi**. Anda dapat meninjau laporan ini terlebih dahulu dan memberi tahu saya bagian mana yang ingin diprioritaskan untuk diperbaiki saat Anda siap melangkah ke tahap implementasi.