# Laporan Analisis Audit UI/UX Tampilan Mobile — Infinix GT 20 Pro

Dokumen ini memuat analisis mendalam (*forensic UI/UX audit*) terhadap hasil tangkapan layar pengujian mandiri pada perangkat fisik smartphone **Infinix GT 20 Pro** (resolusi native FHD+ 1080 × 2436 px, rasio layar 20.3:9, Android 14 / XOS, peramban Chrome Mobile pada *environment production* Vercel).

Analisis berfokus pada **anomali visual, keanehan perilaku (quirks), dan ketidaksesuaian ekspektasi pengguna** di seluruh layar aplikasi yang diuji, dengan sorotan khusus pada **ergonomi Navbar / Topbar** yang tampak pada tangkapan layar.

---

## 1. IKHTISAR EKSEKUTIF

Hasil audit mandiri di HP fisik menunjukkan bahwa meskipun Topbar berhasil dipaksa menjadi 2 baris (mencegah overflow 3 baris di desktop sebelumnya), **solusi penyembunyian teks melahirkan bencana UX baru: sebuah "Icon Soup" (deretan 6 ikon misterius tanpa label) yang membingungkan dan rawan salah pencet**.

Masalah paling mencolok terbagi ke dalam 5 tema besar:
1. **Navbar Clutter & Mystery Meat Navigation (KRITIS)**: Deretan 6 tombol/indikator ikon abstrak tanpa label dipadatkan di baris pertama selebar 360px (`[≡] [Z] [●⚡v] [●🤖] [>_] [ZA]`), menciptakan ambiguitas arti, salah sentuh jempol (*fat-finger*), dan memakan 115px tinggi layar secara permanen (sticky).
2. **Critical Off-Screen Push & Clipping**: Komponen form dan tabel yang melebar melampaui viewport (contoh paling fatal: tombol *Simpan Key* YouTube di Radar Tren terlempar keluar layar ke kanan sehingga tidak bisa ditekan, dan kolom aksi/status tabel tersembunyi tanpa layout kartu alternatif).
3. **Kerapuhan Tipografi & Truncation Kasar**: Teks dropdown terpotong di tengah kata (`Semua Kate{` dan `Semua Statu`), tombol dobel tanda tambah (`+ + Tambah Ide Baru`), dan pembungkusan teks canggung 3-baris (`Import Ide \n Masal \n (CSV/TXT)`).
4. **Inkonsistensi Bahasa Antar-Halaman (Bilingual Mixing)**: Tab filter utama berganti-ganti bahasa antara Indonesia dan Inggris (`Semua` di Ideas, `All Items` di Research, `All Scripts` di Scripts, `All Published` di Published).
5. **Ergonomi Navigasi & Ruang Vertikal Terbuang (*Filter Avalanche*)**: Tumpukan 6 baris tombol pilar di RSS Reader memakan 1.5 layar sebelum pengguna bisa melihat 1 kartu konten, tombol *Kelola Sumber* terduplikasi di layar yang sama, dan celah drawer mengambang membocorkan elemen background di bagian bawah.

---

## 2. BEDAH KHUSUS: ANOMALI & PENGALAMAN PENGGUNA PADA NAVBAR / TOPBAR MOBILE

Pada tangkapan layar close-up Navbar, baris pertama menampilkan 6 elemen berjajar sangat rapat:
```
[ ≡ ]  [ Z ]  [ ● ⚡ ∨ ]  [ ● 🤖 ]  [ >_ ]  [ ZA ]
[ 🔍 Cari ide, judul, atau sumber...             ]
```

### Apa yang Akan Dialami Pengguna Nyata (User Experience Breakdown)?

1. **Kebingungan Kognitif & Ambiguitas Arti (*Mystery Meat Navigation*)**:
   - **`[ ● ⚡ ∨ ]`**: Tanpa teks *"9Router"* atau *"Gemini"*, pengguna tidak tahu apa fungsi tombol ini. Apakah indikator fast-charging baterai? Status listrik? Pengguna awam tidak akan menduga bahwa tombol ini adalah pemilih provider AI backend.
   - **`[ ● 🤖 ]`**: Ikon robot dengan titik abu-abu. Apakah ini chatbot AI? Mengapa titiknya abu-abu (apakah mati/rusak)? Pengguna tidak menyadari bahwa ini adalah status bot Telegram.
   - **`[ >_ ]`**: Simbol CLI terminal command-prompt. Pengguna kreator konten biasa di ponsel akan merasa terintimidasi atau mengira ini tombol developer yang bocor. Di ponsel, **kreator video tidak membutuhkan jendela console terminal hitam melayang di layar mereka**.
   - **`[ ZA ]`**: Avatar inisial tanpa label. Apakah membuka profil akun, pengaturan, atau logout?
   - **`[ Z ]`**: Ikon logo tanpa nama *"ZEINITY"*. Hilangnya brand text menghilangkan konteks identitas aplikasi.

2. **Bencana Salah Pencet Jempol (*Fat-Finger Hell / Accidental Tap*)**:
   - Terdapat **6 elemen interaktif** yang dijejalkan di layar selebar ~360–393px. Jarak (*gap*) antar tombol hanya berkisar 4–6px.
   - Saat pengguna menggunakan satu tangan (ibu jari) untuk menekan menu hamburger `[ ≡ ]` atau membuka pemilih provider `[ ● ⚡ ∨ ]`, mereka sangat rentan secara tidak sengaja menekan logo `[ Z ]` atau tombol terminal `[ >_ ]`.
   - Mengklik tombol terminal `[ >_ ]` secara tidak sengaja akan memunculkan jendela hitam terminal yang menutupi separuh layar ponsel, mengganggu alur kerja pengguna secara drastis.

3. **Navbar "Rakus Ruang Vertikal" (*Screen Estate Cannibalization*)**:
   - Baris 1 (Ikon): ~48px.
   - Baris 2 (Input Pencarian): ~44px.
   - Padding & Border: ~18px.
   - **Total Tinggi**: ~110px – 115px. Ditambah status bar Android (28px), **hampir 20% tinggi layar ponsel dihabiskan hanya untuk sticky navbar**.
   - Konten kerja kreatif di bawahnya menjadi sangat terhimpit dan sempit.

4. **Kesan Internal Developer Tools, Bukan Produk Konsumen Elegan**:
   - Deretan ikon status, bot indicator, dan terminal CLI membuat antarmuka terasa seperti *internal debugging dashboard* programmer daripada asisten kreator YouTube eksekutif yang ramah dan intuitif.

---

## 3. ANALISIS RINCI PER TANGKAPAN LAYAR (12 SCREENSHOTS)

### Screenshot 1 (`1.jpg`): Sidebar Navigation Drawer (Drawer Buka)
* **Konteks**: Pengguna membuka menu drawer sidebar mobile di atas halaman Settings.
* **Anomali & Kejanggalan**:
  1. **Celah Drawer Mengambang (*Floating Drawer Gap Leak*)**:
     - *Observasi*: Drawer `.sidebar` memiliki margin `top: 14px; bottom: 14px;` dan `border-radius: 16px;`.
     - *Kejanggalan*: Di bagian paling bawah layar (di bawah kartu *AI Provider Gateway*), terdapat celah vertikal selebar 14px yang memperlihatkan sepotong tombol `⚡ Test Koneksi...` dari halaman Settings di latar belakang.
     - *Ekspektasi*: Pada perangkat mobile, drawer navigasi umumnya menempel penuh dari atas ke bawah (`height: 100dvh; bottom: 0; top: 0; border-radius: 0 16px 16px 0;`) untuk mencegah bocornya elemen interaktif halaman latar belakang yang tampak seperti visual glitch.
  2. **Kartu Provider Gateway Menyita Ruang Drawer**:
     - *Observasi*: Panel `.provider-panel` di bawah menu navigasi menampilkan URL tunnel monospaced panjang (`https://rje2m9z.abc-tunnel.us/v1`) yang terbungkus sempit.
     - *Dampak*: Menghabiskan 35% tinggi vertikal drawer di mobile.

---

### Screenshot 2 (`2.png`): Overview Dashboard (`#/overview`)
* **Konteks**: Dashboard ringkasan intelijen konten, metrik, sinyal tren terhangat, dan aktivitas terbaru.
* **Anomali & Kejanggalan**:
  1. **Tabel "Aktivitas Terbaru" Terpotong Horisontal Kasar**:
     - *Observasi*: Tabel di bagian bawah kartu hanya menampilkan kolom `JUDUL` dan sebagian kecil kolom `SUM...` (`We...`, `Tel...`).
     - *Kejanggalan*: Seluruh kolom status, tanggal, dan tombol navigasi terlempar keluar layar ke kanan tanpa ada visual cue yang jelas.
     - *Ekspektasi*: Di layar ponsel dengan lebar ~360–393px, tabel desktop multi-kolom seharusnya bertransformasi (*reflow*) menjadi daftar kartu bertumpuk (*stacked item list*) sehingga informasi judul, tanggal, dan status tampil utuh dalam satu kartu vertikal yang rapi.
  2. **Placeholder Pencarian Tidak Relevan**:
     - *Observasi*: Kotak pencarian Topbar menampilkan: `"Cari ide (ketik untuk cari di tabel).."`.
     - *Kejanggalan*: Di halaman Overview, jika pengguna mengetik di kotak ini, sistem secara mendadak mengalihkan (*redirect*) pengguna ke halaman `#/ideas`. Pengguna yang ingin mencari konten di halaman saat ini akan merasa disorientasi.

---

### Screenshot 3 (`3.png`): Content Ideas (`#/ideas`)
* **Konteks**: Pipeline kurasi ide konten dari Web dan Telegram.
* **Anomali & Kejanggalan**:
  1. **Asimetri & Tipografi Timpang Tombol Aksi Utama**:
     - *Observasi*: Tombol kiri `[+ Tambah Ide]` memiliki tinggi ideal, teks 1 baris, latar biru terang. Tombol kanan `[↑ Import Ide Masal (CSV/TXT)]` teksnya terpecah menjadi 3 baris:
       ```
       ↑  Import Ide
           Masal
         (CSV/TXT)
       ```
     - *Dampak*: Terjadi disparitas visual yang berat sebelah dan tidak estetis.
  2. **Teks Dropdown Filter Terpotong Rusak (*Truncated Text Bug*)**:
     - *Observasi*: Dropdown kategori terpotong menjadi `[Semua Kate{]`, dan dropdown status terpotong menjadi `[Semua Statu]`.
     - *Penyebab*: Lebar kontainer dropdown atau properti `text-overflow: ellipsis` bersama padding internal yang terlalu sempit di viewport 360–393px.
  3. **Tabel Pipeline Konten Tanpa Kartu Mobile (Aksi Tersembunyi)**:
     - *Observasi*: Hanya kolom `JUDUL` dan 2 huruf badge `SUMBER` (`We...`) yang terlihat.
     - *Dampak Sangat Kritis*: Pengguna mobile **tidak dapat melihat status ide, skor AI, maupun tombol aksi penting (Validasi AI, Edit, Hapus)** tanpa menyadari adanya geseran horisontal tersembunyi.

---

### Screenshot 4 (`4.png`): AI Research (`#/research`)
* **Konteks**: Validasi & riset AI untuk ide-ide yang sedang diproses.
* **Anomali & Kejanggalan**:
  1. **Inkonsistensi Bahasa Tab Pertama**:
     - *Observasi*: Di halaman `Content Ideas` (`3.png`), tab pertama bernama **`Semua`** (Bahasa Indonesia). Namun di halaman `AI Research` (`4.png`), tab pertama bernama **`All Items`** (Bahasa Inggris).
     - *Ekspektasi*: Konsistensi bahasa penuh menggunakan istilah Indonesia (misalnya `Semua` atau `Semua Riset`).
  2. **Pengulangan Bug Dropdown & Tombol Impor**:
     - Sama seperti `3.png`: teks `Semua Kate{` dan `Semua Statu` terpotong, serta tombol impor 3-baris yang canggung.

---

### Screenshot 5 (`5.png`): Scripts (`#/scripts`)
* **Konteks**: Editor dan daftar naskah semi-matang dari AI.
* **Anomali & Kejanggalan**:
  1. **Bug Dobel Tanda Tambah / Ikon Dobel (`+ + Tambah Ide Baru`)**:
     - *Observasi*: Tombol utama berwarna cyan bertuliskan:
       `[+  + Tambah Ide Baru]`
     - *Penyebab*: Komponen merender ikon SVG `<Plus />` dan sekaligus string teks `" + Tambah Ide Baru"`.
     - *Dampak*: Terlihat sangat amatir dan merupakan *obvious copy bug*.
  2. **Inkonsistensi Bahasa Tab**:
     - *Observasi*: Tab pertama bernama **`All Scripts`** (Bahasa Inggris), padahal seluruh antarmuka berbahasa Indonesia.
  3. **Layout Tombol Berbeda Sendiri**:
     - *Observasi*: Berbeda dengan `3.png` dan `4.png` yang memiliki tombol `Tambah` berdampingan dengan `Import`, di `Scripts` tombol dibuat selebar 100% penuh sendirian.

---

### Screenshot 6 (`6.png`): Published (`#/published`)
* **Konteks**: Daftar konten yang telah terbit dan dipantau performanya.
* **Anomali & Kejanggalan**:
  1. **Inkonsistensi Bahasa Tab**:
     - *Observasi*: Tab pertama bernama **`All Published`** (Bahasa Inggris).
  2. **Inkonsistensi Teks Tombol**:
     - *Observasi*: Tombol di sini bertuliskan `[+ Tambah Ide]` (1 tanda tambah), berbeda dengan halaman Scripts yang bertuliskan `[+ + Tambah Ide Baru]`.
  3. **Tabel Kosong Tanpa Context Link**:
     - *Observasi*: 1 konten terbit hanya terlihat judulnya, sedangkan link URL publikasi dan tombol aksi terlempar ke kanan luar layar.

---

### Screenshot 7 (`7.png`): Radar Tren (`#/trends`)
* **Konteks**: Pantauan tren YouTube dan Google Trends secara real-time.
* **Anomali & Kejanggalan**:
  1. **CRITICAL: Tombol "Simpan Key" Terlempar Keluar Layar ke Kanan (Offscreen Form)**:
     - *Observasi*: Pada alert card merah *"YouTube API Key belum dikonfigurasi"*, input password *"Tempel YouTube API Key"* dan tombol `[🔑 Simpan Key]` berada dalam form flex satu baris.
     - *Penyebab*: Input mengambil seluruh sisa lebar fleksibel, sehingga tombol `[Simpan Key]` berwarna biru terdorong sepenuhnya keluar layar ke sisi kanan (hanya sekelumit warna biru di tepi kanan layar yang tersisa).
     - *Dampak Fatal*: Pengguna di HP fisik **tidak bisa mengklik tombol Simpan Key**! Selain itu, kartu alert meluap keluar layar, menyebabkan judul *"YouTube API Key belum dikonfi"* dan teks deskripsi *"panel pengatura"* terpotong kasar di ujung kanan.
  2. **Asimetri Kontrol Region vs Kategori**:
     - *Observasi*: Filter Region `🌐 Indonesia (ID)` memiliki ikon bola dunia di sebelah kiri, sedangkan dropdown `Semua Kategori` di bawahnya tidak memiliki ikon dan memakan satu baris penuh sendirian.
  3. **Topbar Search Disconnect**:
     - *Observasi*: Placeholder tetap bertuliskan *"Cari ide (ketik untuk cari di tabel).."* meskipun halaman ini berisi feed kartu video/tren, bukan tabel data.

---

### Screenshot 8 & 9 (`8.png`, `9.png`): RSS Reader Studio (`#/rss`)
* **Konteks**: Agregator berita & riset konten berdasarkan 5 Pilar Zeinity (tampilan loading `8.png` dan tampilan feed terisi `9.png`).
* **Anomali & Kejanggalan**:
  1. **Filter Avalanche (Longsor Filter 6 Baris Menumpuk Vertikal)**:
     - *Observasi*: 5 tombol pilar konten Zeinity:
       1. `Semua Pilar`
       2. `Internet & Social Media Culture`
       3. `AI & Technology Impact`
       4. `Digital Economy & Creator Economy`
       5. `Gaming & Digital Entertainment`
       6. `Modern Life & Digital Psychology`
     - *Masalah*: Karena nama setiap pilar sangat panjang (180–250px), `flexWrap: 'wrap'` memaksa setiap pilar turun ke baris baru. Hasilnya adalah **6 baris tombol bertumpuk ke bawah**.
     - *Dampak Sangat Berat*: Halaman atas menjadi sangat panjang:
       - Header Judul + Deskripsi
       - 2 Tombol Aksi Besar (Kelola Sumber & Sinkronkan)
       - Kategori Tabs
       - Status Switcher Buttons (Semua, Belum Dibaca, Disimpan)
       - 6 Baris Pilar Pills
       - Input Pencarian Artikel
       - Kotak Peringatan Sumber Gagal
       Pengguna harus menggulir sejauh **1.5 layar penuh** hanya untuk dapat melihat kartu artikel berita yang pertama!
  2. **Redundansi / Duplikasi Tombol "Kelola Sumber"**:
     - *Observasi*: Terdapat kartu tombol besar di bagian atas: `[Kelola Sumber Feed (10)]`, dan tepat di bawahnya di baris status switcher terdapat tombol kecil lain: `[⚙ Kelola Sumber]`. Dua tombol identik ini hanya berjarak beberapa piksel di layar yang sama.
  3. **Kategori Tab Terpotong Horisontal**:
     - *Observasi*: Tab kategori hanya menampilkan `[📰 Media & Berita]` dan `[🤖 Blog Teknologi & AI]`. Dua kategori lainnya (`Komunitas & Forum` dan `Newsletter Global`) tersembunyi di kanan tanpa affordance visual yang jelas.

---

### Screenshot 10 (`10.jpg`): File Manager (`#/files`)
* **Konteks**: Manajemen berkas referensi diekstrak (.docx, .md, .txt, .csv) untuk konteks AI.
* **Anomali & Kejanggalan**:
  1. **CRITICAL: Tombol Aksi Berkas (`Pratinjau` & `Hapus`) Terpotong di Luar Layar**:
     - *Observasi*: Kartu berkas `.file-card` dibungkus oleh `.table-scroll`. Nama file dokumen panjang (`IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx`) membentangkan kartu ke kanan melebihi lebar layar HP.
     - *Dampak Fatal*: Tombol aksi `[👁 Pratinjau]` dan `[🗑 Hapus]` tersembunyi 100% di luar layar kanan. Pada screenshot terlihat scrollbar indikator yang menunjukkan bahwa hanya 35% lebar kartu yang tampak di layar. Pengguna tidak bisa melihat atau menekan tombol aksi berkas tanpa melakukan swipe horisontal pada kartu tersebut.

---

### Screenshot 11 (`11.png`): Analytics (`#/analytics`)
* **Konteks**: Metrik analitik performa konten, grafik bulanan, distribusi pipeline, dan proporsi sumber ide.
* **Anomali & Kejanggalan**:
  1. **Topbar Search Misleading**:
     - *Observasi*: Placeholder tetap bertuliskan *"Cari ide (ketik untuk cari di tabel).."* meskipun halaman Analytics adalah dashboard visual tanpa tabel apapun.
  2. **Observasi Positif**:
     - 4 kartu metrik (2x2 grid), bar chart bulanan, diagram donat (lingkaran di atas, legenda di bawah), dan progress bar kategori/sumber tertata sangat rapi dan proporsional di Infinix GT 20 Pro.

---

### Screenshot 12 (`12.png`): Settings (`#/settings`)
* **Konteks**: Konfigurasi sistem, 9Router AI Gateway, request timeout, model selection, dan integrasi Telegram.
* **Anomali & Kejanggalan**:
  1. **Dua Kartu Pilihan Mode Tergencet Menjadi 2 Kolom Sempit**:
     - *Observasi*: Kartu `⚡ Combo Presets (3-Tier Auto-Fallback)` dan `🎯 Model Spesifik (Direct Model)` dipaksakan tampil berdampingan dalam 2 kolom.
     - *Dampak*: Masing-masing kartu hanya berukuran ~150px, menyebabkan teks deskripsi panjang ("Rekomendasi Utama: Otomatis failover bila kuota habis atau timeout") terpecah menjadi banyak baris sempit yang sesak dan sulit dibaca.
  2. **Multiplikasi & Fragmentasi Tombol "Simpan" (UX Debt)**:
     - *Observasi*: Terdapat tombol *"Simpan Semua Pengaturan"* di paling atas, tombol *"Simpan"* di bawah URL endpoint, tombol *"Simpan"* di bawah Bearer Key, tombol *"Simpan Pilihan"* di bawah Combo Preset, dan tombol *"Simpan"* di bawah Direct Model.
     - *Dampak*: Pengguna mobile merasa ragu dan bingung mengenai status persistensi data mereka—apakah menekan tombol simpan lokal sudah cukup, atau harus scroll kembali ke atas untuk menekan *"Simpan Semua Pengaturan"*.

---

## 4. MATRIKS KLASIFIKASI TEMUAN BERDASARKAN SEVERITY

| ID | Lokasi / Komponen | Masalah Spesifik | Severity | Rekomendasi Solusi Teknis |
|:---|:---|:---|:---:|:---|
| **N-01** | `Topbar.tsx` (Navbar Mobile) | **Mystery Meat Navigation & Icon Soup**: 6 ikon abstrak tanpa label dipadatkan di baris 1 (`[≡] [Z] [●⚡v] [●🤖] [>_] [ZA]`), rawan salah pencet (*fat finger*) dan memakan 115px tinggi layar. | **CRITICAL** | Redesain Navbar Mobile: Pindahkan Terminal `[>_]` dan Status Bot `[●🤖]` ke dalam Sidebar Drawer. Tampilkan hanya `[≡]`, logo `ZEINITY`, pemilih AI Provider dengan label jelas / pill ringkas, dan Avatar `[ZA]`. Jadikan search bar collapsible atau hanya di halaman tabel. |
| **M-01** | `TrendRadar.tsx` (Alert Card) | Input API Key mendorong tombol `[Simpan Key]` keluar layar ke kanan (*off-screen push*). | **CRITICAL** | Ubah form menjadi `flex-direction: column; width: 100%;` di mobile sehingga tombol `[Simpan Key]` berada di bawah input dengan lebar 100%. |
| **M-02** | `ContentTable.tsx` (Semua Halaman Tabel) | Tabel desktop multi-kolom membuat status, skor, dan aksi (`Validasi`, `Edit`, `Hapus`) tersembunyi di luar layar. | **CRITICAL** | Tambahkan mode tampilan **Mobile Card List** (di `@media (max-width: 640px)`): sembunyikan tag `<table>` dan render kartu bertumpuk per ide berisi judul, badge status/sumber, dan tombol aksi sejajar di bawah. |
| **M-03** | `FileManager.tsx` (`.file-card`) | Kartu berkas memanjang ke kanan di dalam `.table-scroll`; tombol `[Pratinjau]` dan `[Hapus]` terlempar keluar layar. | **CRITICAL** | Ubah `.file-card` di mobile menjadi `flex-direction: column; align-items: stretch;`. Berikan tombol aksi baris tersendiri di bawah judul file dengan `width: 100%`. |
| **M-04** | `ContentTable.tsx` (Dropdown Filters) | Teks opsi dropdown terpotong cacat di tengah kata (`Semua Kate{`, `Semua Statu`). | **HIGH** | Tingkatkan fleksibilitas kontainer filter: gunakan `min-width: 0; flex: 1 1 auto;`, kurangi padding horizontal berlebih, atau gunakan grid 2-kolom seimbang untuk kedua select. |
| **M-05** | `RSSReader.tsx` (Pilar Filter) | 5 pilar konten Zeinity menumpuk menjadi 6 baris vertikal (*Filter Avalanche*) menyita 1.5 layar sebelum konten. | **HIGH** | Ubah kontainer pilar di mobile menjadi horizontal scrollable chip row (`display: flex; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 6px;`) atau sediakan dropdown `<select>` ringkas. |
| **M-06** | `ContentTable.tsx` (Header Aksi) | Disparitas visual antara `[Tambah Ide]` (1 baris) dan `[Import Ide Masal (CSV/TXT)]` (3 baris canggung). | **HIGH** | Ringkas teks tombol impor di mobile menjadi `[Impor Masal]` atau buat teksnya 1 baris seimbang dengan font 0.8rem dan padding proporsional. |
| **M-07** | `Settings.tsx` (Model Mode) | Kartu *Combo Presets* dan *Model Spesifik* dipaksa 2 kolom sempit di mobile sehingga teks tergencet. | **HIGH** | Ubah grid di mobile (`<= 640px`) menjadi 1 kolom bertumpuk (`grid-template-columns: 1fr; gap: 12px;`). |
| **M-08** | `ContentTable.tsx` (Scripts View) | Bug dobel tanda tambah: tombol utama menampilkan teks `+ + Tambah Ide Baru`. | **MEDIUM** | Hapus tanda `+` redundan di teks string, cukup gunakan ikon `<Plus />` dan teks `"Tambah Ide Baru"`. |
| **M-09** | `ContentTable.tsx` (Tab Bar) | Inkonsistensi bahasa: Tab pertama berganti `Semua`, `All Items`, `All Scripts`, dan `All Published`. | **MEDIUM** | Standardisasi bahasa Indonesia konsisten: gunakan `"Semua"` di seluruh tab pipeline konten. |
| **M-10** | `Topbar.tsx` & `App.tsx` (Search Box) | Placeholder *"Cari ide (ketik untuk cari di tabel).."* tampil di halaman non-tabel dan me-redirect paksa jika diketik. | **MEDIUM** | Buat placeholder peka konteks (*context-aware*): jika di Radar Tren tampilkan *"Cari tren YouTube & Google..."*, jika di RSS tampilkan *"Cari di RSS..."*, dan jika di non-tabel jangan lakukan redirect tiba-tiba. |
| **M-11** | `Sidebar.tsx` & `index.css` | Drawer melayang menyisakan celah 14px di bawah yang membocorkan elemen background yang aktif. | **MEDIUM** | Pada drawer mobile, gunakan `height: 100dvh; top: 0; bottom: 0; border-radius: 0 16px 16px 0;` menempel penuh ke tepi layar. |
| **M-12** | `RSSReader.tsx` (Header Control) | Tombol *Kelola Sumber* terduplikasi dua kali berdekatan di layar yang sama. | **MEDIUM** | Sembunyikan salah satu tombol di mobile (misalnya cukup pertahankan tombol ringkas di samping tab atau tombol utama di atas). |
| **M-13** | `Settings.tsx` (Tombol Simpan) | Terdapat 5 tombol simpan terpisah yang membingungkan alur persistensi data pengguna. | **LOW** | Tambahkan sticky bottom bar untuk simpan global atau berikan kejelasan visual pada masing-masing scope penyimpanan. |
| **M-14** | `TrendRadar.tsx` (Region & Kategori) | Dropdown Region memiliki ikon globe, sedangkan Kategori polos di bawahnya tanpa ikon. | **LOW** | Sejajarkan kedua dropdown dalam grid 2-kolom simetris di bawah tab atau tambahkan ikon kategori yang serasi. |
| **M-15** | `ContentTable.tsx` & `RSSReader.tsx` | Tab kategori terpotong di tepi kanan tanpa indikator swipe yang tegas. | **LOW** | Tambahkan indikator visual (fade gradient mask atau ikon scroll cue `›`) yang lebih tegas pada scrollable tab bar. |

---

## 5. KESIMPULAN & REKOMENDASI ARSITEKTUR MOBILE

Audit fisik pada **Infinix GT 20 Pro** membuktikan bahwa perbaikan responsivitas tidak cukup hanya dengan media query CSS global, melainkan membutuhkan **adaptasi pola komponen UI (Component Pattern Adaptation)** antara Desktop dan Mobile:

1. **Penyederhanaan Navbar Mobile**: Hapus elemen developer/status internal (`>_` dan `● 🤖`) dari navbar ponsel dan pindahkan ke Sidebar. Navbar ponsel harus bersih, bernapas, dan memprioritaskan navigasi utama serta branding.
2. **Dari Data Table ke Card List**: Tabel tabular 5–6 kolom di desktop tidak cocok untuk layar ponsel 360–390px. Mengubah baris tabel menjadi kartu bertumpuk (*card list*) di mobile akan langsung menyelesaikan masalah terpotongnya status, skor AI, dan tombol aksi.
3. **Dari Multi-Line Wrap ke Horizontal Scroll**: Kontrol filter yang memiliki banyak pilihan panjang (seperti 5 Pilar Zeinity) harus dialihkan ke *horizontal swipeable chips* agar tidak menenggelamkan konten berita.

> [!NOTE]
> Laporan ini disusun murni sebagai analisis diagnostik dan inventaris anomali sesuai permintaan. **Tidak ada kode atau file aplikasi yang diubah pada tahap ini.** Tindakan perbaikan siap dieksekusi setelah mendapatkan arahan dan prioritas dari Anda.
