Berikut adalah laporan hasil audit menyeluruh terhadap arsitektur kode, keamanan, alur kerja (workflow), serta konsistensi antarmuka aplikasi.

Laporan ini disusun secara hierarkis dari **Kritis / Parah (potensi data loss & celah keamanan)** hingga **Minor (placeholder & dead code)** untuk membantu Anda menentukan prioritas pengembangan tahap berikutnya tanpa merasa kewalahan.

---

# 🔴 Kategori 1: PARAH / KRITIS (Prioritas Utama)
*Masalah yang dapat menyebabkan data hilang, crash aplikasi, atau celah keamanan sensitif.*

### 1. Celah Keamanan API Key & Token di Supabase (Public Exposure)
- **Lokasi**: [20260926150503_create_zeinity_schema.sql](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/supabase/migrations/20260926150503_create_zeinity_schema.sql#L105-L108) & [useSettings.ts](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/hooks/useSettings.ts#L64-L74)
- **Temuan**: Tabel `settings` diatur dengan RLS terbuka untuk anon:
  ```sql
  CREATE POLICY "anon_select_settings" ON settings FOR SELECT TO anon, authenticated USING (true);
  ```
  Nilai `gemini_api_key`, `openrouter_api_key`, dan `telegram_token` disimpan dalam bentuk *plaintext*. Siapapun yang menginspeksi browser dan mengambil kunci `anon` publik Supabase dapat membaca seluruh API Key Anda via REST API.
- **Rekomendasi Solusi**: Jika aplikasi ini hanya digunakan secara lokal/pribadi (*single-user*), simpan API key sensitif hanya di `localStorage` peramban Anda dan jangan di-sinkronisasi ke tabel database publik.

---

### 2. Risiko Data Loss: Teks Riset & Naskah Draft Hanya Disimpan saat `onBlur`
- **Lokasi**: [ScriptDetail.tsx (baris 781–785 & 1016–1020)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L781-L785)
- **Temuan**: Textarea naskah (yang bisa berisi ribuan karakter) hanya memicu fungsi `onUpdate` saat kursor keluar (*blur*):
  ```tsx
  onBlur={() => {
    if (scriptOutput !== item.external_script_output) {
      onUpdate(item.id, { external_script_output: scriptOutput });
    }
  }}
  ```
  Jika Anda sedang mengetik naskah panjang lalu browser tertutup, komputer mati mendadak, atau Anda menekan tombol *Back* browser tanpa mengklik di luar kotak, **seluruh ketikan baru akan hilang**.
- **Rekomendasi Solusi**: Tambahkan mekanisme *debounced auto-save* (misal simpan otomatis setiap 800ms setelah Anda berhenti mengetik) disertai indikator status "Menyimpan…" / "Semua perubahan tersimpan".

---

### 3. Ketiadaan Timeout & AbortSignal pada Panggilan AI
- **Lokasi**: [gemini.ts (baris 312 & 337)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/gemini.ts#L312)
- **Temuan**: Panggilan ke OpenRouter dan Ollama menggunakan `fetch()` standar tanpa `AbortController` maupun batas waktu (*timeout*). Jika server OpenRouter *rate-limited* atau Ollama lokal hang/macet, UI aplikasi akan terkunci di status *"Memproses…"* selamanya tanpa pesan error dan tanpa tombol batal.
- **Rekomendasi Solusi**: Pasang timeout (misal 45 detik) menggunakan `AbortController` dengan pesan peringatan jika server AI tidak merespons.

---

### 4. Supabase Down Menyebabkan Layar Kosong (Tanpa Cache Offline)
- **Lokasi**: [useContent.ts (baris 218–222)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/hooks/useContent.ts#L218-L222)
- **Temuan**: Tidak seperti `useSettings` yang memiliki fallback ke `localStorage`, `useContent` akan langsung mengosongkan state `items: []` jika koneksi internet putus atau Supabase gagal dihubungi. Semua ide dan naskah Anda mendadak hilang dari tabel saat offline.
- **Rekomendasi Solusi**: Simpan snapshot `items` ke `localStorage` sebagai cache baca saat offline.

---

# 🟡 Kategori 2: SEDANG / SIGNIFIKAN (Prioritas Menengah)
*Kelemahan alur kerja (workflow blocker), inkonsistensi data, dan batasan logika.*

### 5. Status Pipeline Satu Arah (Tidak Bisa Mundur/Diturunkan)
- **Lokasi**: [ScriptDetail.tsx](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L367-L377) & [AddIdeaModal.tsx](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/AddIdeaModal.tsx)
- **Temuan**: Alur pipeline bersifat searah: `Idea` $\rightarrow$ `Researching` $\rightarrow$ `Scripting` $\rightarrow$ `Thumbnailing` $\rightarrow$ `Published`. Jika Anda tidak sengaja mengklik "Lanjut ke Tahap Scripting", **tidak ada tombol untuk membatalkan atau mengembalikan status ke tahap sebelumnya**. Modal edit ide pun tidak menyediakan pilihan status.

---

### 6. Indikator "AI Gateway Online" di Topbar Tidak Akurat
- **Lokasi**: [App.tsx (baris 560)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/App.tsx#L560)
- **Temuan**:
  ```tsx
  isGatewayOnline={Boolean(settings.gemini_api_key?.trim())}
  ```
  Topbar hanya mengecek `gemini_api_key`. Jika Anda mengaktifkan **OpenRouter** (dengan API key OpenRouter yang valid) atau **Ollama** lokal, Topbar tetap menampilkan titik kuning: *"AI Gateway offline (API Key belum diisi)"*.

---

### 7. Inkonsistensi Nama Pilar Konten (Prompt vs UI)
- **Temuan**: Terdapat ketidaksinkronan nama pilar antara Dokumen Strategi AI dengan menu pilihan di UI:
  | Dokumen Identitas AI ([useSettings.ts](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/hooks/useSettings.ts#L18-L22)) | Dropdown Input ([AddIdeaModal.tsx](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/AddIdeaModal.tsx#L14-L18)) |
  | :--- | :--- |
  | `Internet & Social Media` | `Internet & Social Media Culture` |
  | `AI & Technology` | `AI & Technology Impact` |
  | `Digital Economy & Consumer Culture` | `Digital Economy & Creator Economy` |
  | `Modern Life & Human Behavior` | `Modern Life & Digital Psychology` |
- **Dampak**: Model AI terkadang bingung memetakan instruksi pilar karena teks kategori yang dikirim dari form tidak sama persis dengan aturan di system prompt.

---

### 8. Pemotongan Teks Naskah Panjang Secara Senyap (*Silent Truncation*)
- **Lokasi**: [gemini.ts (baris 682)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/lib/gemini.ts#L682)
- **Temuan**: Pada fitur pembuatan Thumbnail, naskah dipotong secara paksa:
  ```ts
  ${scriptOutput.substring(0, 4000)}
  ```
  Jika naskah Anda berdurasi 10–12 menit (~10.000–12.000 karakter), AI hanya membaca sepertiga awal naskah. AI tidak melihat resolusi atau kejutan di akhir cerita saat merumuskan konsep teks thumbnail.

---

# 🟢 Kategori 3: MINOR & POLISHING (Prioritas Rendah / Opsional)
*Fitur placeholder, dead code, dan penyempurnaan kosmetik.*

### 9. Fitur Phantom "Telegram Bot Integration"
- **Lokasi**: [Settings.tsx (baris 371–398)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/Settings.tsx#L371-L398)
- **Temuan**: Input field "Bot Token Telegram" dapat diisi dan disimpan ke database, namun **tidak ada kode backend, webhook, atau polling** apapun yang menjalankan bot Telegram. Pilihan sumber "Telegram" di tabel hanya input manual.

---

### 10. File Manager Menggunakan Jalur Berkas Dummy
- **Lokasi**: [App.tsx (baris 238)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/App.tsx#L238)
- **Temuan**: Saat dokumen `.docx` atau `.md` diunggah, hanya teks hasil ekstraksi yang disimpan ke database. Berkas aslinya tidak diunggah ke storage cloud (jalurnya berupa string dummy `/public/uploads/...`), sehingga berkas fisik tidak bisa diunduh kembali.

---

### 11. Layout 2-Kolom ScriptDetail Kaku di Layar Sedang/Tablet
- **Lokasi**: [ScriptDetail.tsx (baris 633)](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/views/ScriptDetail.tsx#L633)
- **Temuan**: Menggunakan inline CSS `gridTemplateColumns: '1fr 1fr'`. Jika browser diperkecil ke ukuran tablet atau layar split setengah monitor, kolom kiri dan kanan menjadi sangat sempit karena tidak otomatis turun ke bawah (*stack vertical*).

---

### 12. Dead Code (File Sampah yang Tidak Dipakai)
- [template_UI_UX.html](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/src/components/template_UI_UX.html) (42.8 KB): Berkas HTML mockup lama di dalam folder `src/components/` yang tidak pernah di-import.
- [test_models_and_analytics.mjs](file:///c:/Users/seink/Documents/antigravity/Zeinity%20Executive%20Report%20Web%20App/project/test_models_and_analytics.mjs) (34.4 KB): Berkas tes mandiri yang tertinggal di root folder proyek.

---

# 🗺️ Rekomendasi Peta Jalan (Roadmap) Bertahap

Agar proses pengembangan tidak membingungkan, Anda cukup fokus pada tahapan ini:

| Tahap | Fokus Pengembangan | Target yang Diselesaikan |
| :--- | :--- | :--- |
| **Fase 1** *(Segera)* | **Penyelamatan & Keamanan Data** | • Debounced auto-save untuk naskah draft.<br>• Amankan API Key (prioritaskan storage lokal).<br>• Perbaiki deteksi online Gateway Topbar. |
| **Fase 2** *(Penyempurnaan Workflow)* | **Kelancaran Alur Kerja** | • Tombol mundur status / dropdown edit status.<br>• Timeout pada request AI (cegah loading abadi).<br>• Sinkronisasi nama 5 pilar konten. |
| **Fase 3** *(Opsional / Masa Depan)* | **Integrasi & Pembersihan** | • Hapus dead code (`template_UI_UX.html`).<br>• Implementasi real webhook Telegram (jika memang dibutuhkan).<br>• Perbaikan responsivitas mobile/tablet. |

Silakan pelajari laporan ini. Ketika Anda siap, Anda bisa menentukan bagian mana dari **Fase 1** yang ingin kita eksekusi terlebih dahulu!