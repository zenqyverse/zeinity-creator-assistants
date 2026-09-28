# Laporan Audit Eksekutif Frontend Zeinity

## 1. Ringkasan Eksekutif
Berdasarkan pemindaian menyeluruh di seluruh *codebase* frontend (*.tsx, *.ts, dll.), proses audit telah diselesaikan.

- **Total tombol yang ditemukan/diaudit:** 128 tombol
- **Jumlah temuan per kategori severity:**
  - **Parah:** 4 temuan
  - **Mayor:** 4 temuan
  - **Sedang:** 6 temuan
  - **Minor:** 1 temuan

## 2. Tabel Temuan

| No | Lokasi/Halaman | Nama/Selector Tombol | Severity | Kategori | Deskripsi Temuan | Rekomendasi |
|---|---|---|---|---|---|---|
| 1 | `ContentTable.tsx` (baris 444) | Tombol Hapus Ide (`<Trash2>`) | Parah | Bug | Langsung mengeksekusi fungsi hapus ide permanen (`handleDeleteClick`) tanpa modal konfirmasi sama sekali. Berpotensi menghilangkan seluruh data ide. | Implementasikan dan panggil `<AlertModal>` dengan tipe `warning` sebelum mengeksekusi penghapusan data. |
| 2 | `FileManager.tsx` (baris 132) | Tombol Hapus File (`<Trash2>`) | Parah | Bug | Menghapus dokumen referensi di database secara instan tanpa konfirmasi peringatan. | Wajib dibungkus dengan dialog konfirmasi keselamatan sebelum memanggil API `deleteFile`. |
| 3 | `BulkImportModal.tsx` (baris 425) | Tombol Hapus Baris Bulk (`<Trash2>`) | Parah | Bug | Menghapus baris item pada saat memilah tabel *bulk import* seketika jika diklik. | Walau tidak masuk database, berikan minimal tombol "Undo" *toast* atau dialog ringkas. |
| 4 | `Settings.tsx` (baris 648) | Tombol Hapus Token Telegram | Parah | Bug | Token akses *bot* dihapus tanpa *prompt* konfirmasi, bisa merusak *webhook*. | Wajib memanggil modal persetujuan dari komponen alert. |
| 5 | `ContentTable.tsx` (baris 267) | `btn-secondary` ("Import File") | Mayor | Cacat | Nama dan label tombol menyesatkan. Bukannya membuka file CSV/MD untuk pipeline, melainkan malah mengunggah berkas biasa ke *File Manager*. | Ubah label teks menjadi "Unggah Referensi" atau perbaiki fungsi klik agar benar-benar mengimpor *bulk idea*. |
| 6 | `Overview.tsx` (baris 105) | `btn-secondary` ("Import File") | Mayor | Cacat | Sama dengan temuan pada `ContentTable.tsx`, fungsionalitas tombol tidak sesuai janji antarmuka. | Sesuaikan label teks menjadi "Unggah Referensi". |
| 7 | `PublishedDetail.tsx` (baris 288) | `revert-stage-btn` ("Revert ke Thumbnailing") | Mayor | Cacat | Status data berubah di DB, namun *state* navigasi halaman tidak tersetel ulang. Pengguna terjebak dan masih melihat halaman "Published". | Tambahkan logika untuk mereset komponen/halaman (*view state*) saat *revert* sukses. |
| 8 | `ScriptDetail.tsx` (baris 1599) | `revert-stage-btn` ("Revert ke Idea") | Mayor | Cacat | Sama seperti efek Revert di PublishedDetail, bisa menyebabkan layar UI tidak sinkron dengan *state* aplikasi (*blank/stuck*). | Reset *state* yang diperlukan agar editor *workspace* kembali ke status awal. |
| 9 | `PublishedDetail.tsx` (baris 504) | Tombol "Gunakan sbg Judul Utama" (Mode A) | Sedang | Placeholder | Fitur antarmuka yang statis / tidak berfungsi (Zombie UI). Meskipun diklik, sistem *A/B Testing* judul tidak memiliki eksekutor nyata. | Sembunyikan elemen sementara sampai fitur A/B di-*backend* diaktifkan, atau sambungkan langsung ke *state* judul utama. |
| 10 | `PublishedDetail.tsx` (baris 543) | Tombol "Gunakan sbg Judul Utama" (Mode B) | Sedang | Placeholder | Tombol *zombie* duplikat untuk fitur uji coba Mode B yang belum matang. | Integrasikan dengan data, atau hilangkan baris ini sama sekali. |
| 11 | `ScriptDetail.tsx` (baris 1974) | *Icon Button / Unnamed* | Sedang | Cacat | Tidak mendefinisikan atribut `type`. Di dalam ekosistem React, tombol tanpa *type* bisa dikira `submit` form dan akan mereload halaman mendadak. | Wajib sisipkan `type="button"` secara spesifik. |
| 12 | `ScriptDetail.tsx` (baris 1989) | *Icon Button / Unnamed* | Sedang | Cacat | Tidak mendefinisikan atribut `type` eksplisit. | Sisipkan `type="button"`. |
| 13 | `ScriptDetail.tsx` (baris 2004) | *Icon Button / Unnamed* | Sedang | Cacat | Tidak mendefinisikan atribut `type` eksplisit. | Sisipkan `type="button"`. |
| 14 | `ScriptDetail.tsx` (baris 2430) | *Icon Button / Unnamed* | Sedang | Cacat | Tidak mendefinisikan atribut `type` eksplisit. | Sisipkan `type="button"`. |
| 15 | `ContentTable.tsx` (baris 308) | `small-btn` ("Filter / Reset Filter") | Minor | Inkonsisten | Tombol berfungsi di halaman utama, namun jika ditekan dari dalam navigasi khusus akan menghasilkan *zero data* akibat kondisi state tab yang *hardcoded*. | Bersihkan kondisi variabel tab dan aktifkan filter dinamis. |

## 3. Analisis Prioritas

- **Prioritas Tinggi** (harus segera diperbaiki)  
  *Alasan:* Tombol hapus yang tereksekusi tanpa modal/dialog konfirmasi (seperti di Hapus Ide, File, Token) adalah kerentanan fatal yang bisa menghapus aset berharga tanpa sengaja (*data loss*). Ini harus diamankan pertama kali dengan intervensi `AlertModal`.
  
- **Prioritas Sedang** 
  *Alasan:* Cacat di alur logika navigasi seperti tombol "Revert" (yang membuat *user* terjebak di suatu halaman) dan inkonsistensi fungsi ("Import File") menyulitkan operasi kerja sehari-hari karena aplikasi terasa kaku atau menyesatkan secara UX.

- **Prioritas Rendah** 
  *Alasan:* Isu kosmetik seperti tidak adanya deklarasi `type="button"` dan keberadaan *Dead UI* (seperti pengubah Mode A/B) memang kotor dari sisi standar kode (*code smell*), tetapi sejauh ini belum memicu gagal total sistem (*crash*), sehingga penanganannya dapat ditunda setelah fitur utama sehat.

## 4. Rekomendasi Roadmap

Berdasarkan analisis, urutan pengerjaan (*roadmap*) dengan estimasinya adalah sebagai berikut:

1. **Pemasangan Jaring Pengaman Hapus Data (Estimasi: High)**  
   - Mengintegrasikan fungsi hapus di `ContentTable.tsx`, `FileManager.tsx`, `BulkImportModal.tsx`, dan `Settings.tsx` ke dalam alur *AlertModal*. Merupakan prioritas paling kritis.
2. **Penyelarasan Sinkronisasi Navigasi (Estimasi: Medium)**  
   - Mereset variabel antarmuka dan memperbaiki perilaku *blank screen* pada tombol *Revert ke Idea* & *Revert ke Thumbnailing*.  
3. **Penyelerasan UX Tombol "Import" (Estimasi: Low)**  
   - Mengubah teks menyesatkan pada tombol di atas `ContentTable` dan `Overview` agar sesuai dengan realitas unggah referensi dokumen, atau fungsionalitasnya diubah.
4. **Pembersihan HTML Attributes dan Fitur Zombie (Estimasi: Low)**  
   - Menghapus komponen mati seperti Mode A/B pada `PublishedDetail.tsx` dan memasang `type="button"` di seluruh tombol di `ScriptDetail.tsx`.
