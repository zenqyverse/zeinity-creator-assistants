# 📡 Panduan Praktis: Menemukan & Menggunakan Link RSS Feed

Panduan ini menjelaskan cara menemukan link **RSS/Atom Feed** resmi dari sebuah website, memahami mengapa URL website mentah (seperti `https://tekno.kompas.com/`) tidak bisa langsung dimasukkan, serta solusi jika website tujuan tidak memiliki RSS bawaan.

---

## 1. Mengapa Link Web Biasa Mengalami "Gagal Dimuat"?

Ketika Anda memasukkan URL seperti `https://tekno.kompas.com/` ke dalam RSS Reader, aplikasi akan menampilkan status **"Gagal dimuat"**. Mengapa demikian?

* **Halaman Web Biasa (`.html`)**: Dirancang untuk dibaca oleh **manusia melalui browser**. Isinya penuh dengan kode layout CSS, JavaScript, tag banner iklan, dan struktur visual rumit yang tidak bisa di-parse sebagai data feed artikel.
* **RSS/Atom Feed (`.xml` atau endpoint feed)**: Dirancang untuk dibaca oleh **mesin / aplikasi agregator**. Formatnya terstruktur rapi menggunakan format XML (`<rss>`, `<channel>`, `<item>`, `<title>`, `<link>`, `<pubDate>`).

> [!IMPORTANT]
> **RSS Reader hanya dapat membaca data berformat XML (RSS 2.0 / Atom)**, bukan halaman web HTML biasa.

Selain itu, beberapa portal berita besar di Indonesia (seperti **Kompas.com** dan **Detik.com**) telah **menonaktifkan layanan RSS publik resmi mereka** beberapa tahun terakhir demi mendorong pembaca langsung mengunjungi website atau aplikasi seluler mereka.

---

## 2. 4 Cara Mudah Menemukan Link RSS dari Suatu Website

Jika Anda memiliki website rujukan (blog, media, podcast) dan ingin mengambil data RSS-nya, gunakan 4 metode berikut secara bertahap:

### Metode 1: Tebak Pola URL Standar (Paling Cepat)
Sebagian besar platform berbasis WordPress, Ghost, Substack, Medium, dan CMS berita menggunakan pola URL standar:

| Platform / Website | Pola URL RSS yang Sering Digunakan |
|---|---|
| **Portal Berita / Blog** | `https://domain.com/rss`<br>`https://domain.com/feed`<br>`https://domain.com/rss.xml`<br>`https://domain.com/feed.xml`<br>`https://domain.com/atom.xml` |
| **Kanal / Kategori Tertentu** | `https://domain.com/[kategori]/rss`<br>`https://domain.com/category/[kategori]/feed`<br>`https://domain.com/rss/[kategori]` |
| **Substack** | `https://[nama-buletin].substack.com/feed` |
| **Medium** | `https://medium.com/feed/@[username]` |
| **YouTube Channel** | `https://www.youtube.com/feeds/videos.xml?channel_id=[CHANNEL_ID]` |
| **Reddit Subreddit** | `https://www.reddit.com/r/[nama_subreddit]/.rss` |

---

### Metode 2: Cek Source Code Halaman (`View Page Source`)
Banyak website menanamkan tag pendeteksi RSS di dalam kode `<head>` mereka:

1. Buka website target di browser (misalnya Google Chrome, Brave, atau Edge).
2. Tekan **`Ctrl + U`** (atau klik kanan lalu pilih **View Page Source** / **Lihat Sumber Halaman**).
3. Tekan **`Ctrl + F`** untuk membuka pencarian, lalu ketik salah satu dari kata kunci berikut:
   * `application/rss+xml`
   * `application/atom+xml`
4. Jika website menyediakan RSS, Anda akan melihat baris seperti:
   ```html
   <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="https://example.com/feed/" />
   ```
5. **Salin URL** yang ada di dalam atribut `href="..."`. Itulah link RSS resmi yang siap dimasukkan ke Zeinity RSS Reader!

---

### Metode 3: Gunakan Ekstensi Browser "RSS Finder" (Otomatis)
Jika Anda sering mengumpulkan sumber berita, cara paling praktis adalah memasang ekstensi browser gratis:

* **RSS Feed Reader** (Chrome / Firefox / Edge)
* **Feedbro** (Chrome / Firefox)
* **Get RSS Feed URL** (Chrome Web Store)

**Cara kerja**: Begitu Anda membuka suatu halaman web, ikon ekstensi di pojok kanan atas browser akan menyala jingga (orange) dan otomatis menampilkan daftar link RSS yang tersedia untuk disalin dengan 1 klik.

---

### Metode 4: Periksa Bagian Footer Website
Scroll ke bagian paling bawah (footer) halaman web. Cari:
* Ikon gelombang radio berwarna jingga (**RSS Icon** 📡).
* Teks tautan bertuliskan **"RSS"**, **"Feed"**, **"Sindikasi"**, atau **"Syndication"**.

---

## 3. Bagaimana Jika Website Tidak Memiliki RSS (Seperti Kompas atau Detik)?

Jika website tujuan tidak menyediakan RSS resmi, Anda bisa mengubah halaman web HTML mereka menjadi RSS XML menggunakan **RSS Bridge / RSS Generator gratis**:

1. **[RSS.app](https://rss.app/)**
   * Buka rss.app -> Pilih *RSS Feed Generator*.
   * Tempelkan link web mentah (misal: `https://tekno.kompas.com/`).
   * Layanan akan otomatis memindai judul artikel dan membuatkan URL feed XML yang siap dimasukkan ke Zeinity.
2. **[PolitePol](https://politepol.com/)**
   * Alat gratis untuk mengubah website apa pun menjadi RSS dengan memilih elemen judul dan ringkasan.
3. **[RSSHub](https://docs.rsshub.app/)**
   * Proyek open-source populer yang menyediakan feed RSS untuk ribuan platform yang aslinya tidak punya RSS (seperti Twitter/X, Instagram, bilibili, dan media berita lokal).

---

## 4. Daftar RSS Feed Media Berita Teknologi Indonesia (Siap Pakai & Teruji Aktif)

Berikut adalah daftar link RSS feed media teknologi dan bisnis Indonesia yang telah **diverifikasi aktif dan valid (200 OK)** untuk langsung Anda tambahkan ke **Zeinity RSS Reader Studio**:

| Nama Media | Kategori di Zeinity | Pilar Zeinity | URL RSS Feed Valid |
|---|---|---|---|
| **CNN Indonesia - Teknologi** | Media & Berita | AI & Technology Impact | `https://www.cnnindonesia.com/teknologi/rss` |
| **Antara News - Tekno** | Media & Berita | AI & Technology Impact | `https://www.antaranews.com/rss/tekno` |
| **CNBC Indonesia - Tech** | Media & Berita | Digital Economy & Creator Economy | `https://www.cnbcindonesia.com/tech/rss` |
| **DailySocial.id** | Blog Teknologi & AI | Digital Economy & Creator Economy | `https://dailysocial.id/feed` |
| **Jagat Review** | Blog Teknologi & AI | Gaming & Digital Entertainment | `https://www.jagatreview.com/feed/` |
| **Selular.id** | Media & Berita | AI & Technology Impact | `https://selular.id/feed/` |

---

## 5. Cara Menambahkan & Mengelola di Zeinity RSS Reader

1. Buka menu **RSS Reader** di sidebar Zeinity.
2. Klik tombol **"Kelola Sumber Feed"** di kanan atas.
3. Masukkan:
   * **Nama Sumber**: contoh *"CNN Indonesia Tekno"*
   * **URL RSS / Atom**: contoh `https://www.cnnindonesia.com/teknologi/rss`
   * **Kategori Sumber**: pilih tab yang sesuai (Media & Berita / Blog Teknologi & AI / Forum & Komunitas / Koleksi Saya)
   * **Pilar Zeinity**: petakan ke salah satu dari 5 Pilar Konten Zeinity
4. Klik **"Tambahkan ke Sumber Aktif"**.
5. Jika ingin mengubah URL/kategori/pilar, klik tombol **✏️ (Edit)** pada baris feed tersebut. Jika ingin menghapus permanen, klik tombol **🗑️ (Hapus)**.
