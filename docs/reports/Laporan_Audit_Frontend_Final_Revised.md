# Laporan Audit Eksekutif Frontend Zeinity

## 1. Ringkasan Eksekutif
Berdasarkan pemindaian menyeluruh di seluruh codebase frontend (*.tsx, *.ts, *.jsx, *.js, *.html, *.css, *.vue), berikut adalah temuan audit elemen tombol.

- **Total tombol yang ditemukan/diaudit:** 128 tombol
- **Jumlah temuan per kategori severity:**
  - **Parah:** 5 temuan
  - **Mayor:** 5 temuan
  - **Sedang:** 6 temuan
  - **Minor:** 55 temuan

## 2. Tabel Temuan

| No | Lokasi/Halaman | Nama/Selector Tombol | Severity | Kategori | Deskripsi Temuan | Rekomendasi |
|---|---|---|---|---|---|---|
| 1 | `BulkImportModal.tsx` (baris 183) | setActiveTab('file')}                st... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 2 | `BulkImportModal.tsx` (baris 191) | setActiveTab('paste')}                s... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 3 | `BulkImportModal.tsx` (baris 280) | Parsing Ide Konten | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 4 | `BulkImportModal.tsx` (baris 318) | {parsedItems.every((i) => i.selected) ? ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 5 | `BulkImportModal.tsx` (baris 326) | Ganti Berkas | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 6 | `BulkImportModal.tsx` (baris 425) |  | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 7 | `BulkImportModal.tsx` (baris 425) |  | Parah | Bug | Tombol hapus berpotensi mengeksekusi penghapusan permanen tanpa dialog konfirmasi | Integrasikan dengan AlertModal sebelum mengeksekusi penghapusan |
| 8 | `BulkImportModal.tsx` (baris 448) | {isSubmitting ? 'Mengimpor...' : `Import... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 9 | `Terminal.tsx` (baris 275) |  | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 10 | `Terminal.tsx` (baris 275) |  | Parah | Bug | Tombol hapus berpotensi mengeksekusi penghapusan permanen tanpa dialog konfirmasi | Integrasikan dengan AlertModal sebelum mengeksekusi penghapusan |
| 11 | `Terminal.tsx` (baris 286) |  | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 12 | `Topbar.tsx` (baris 86) | )} | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 13 | `ContentTable.tsx` (baris 267) | Import File | Mayor | Cacat | Tombol "Import File" menyesatkan (hanya membuka unggahan referensi, bukan import ide) | Ubah label menjadi "Unggah Referensi" atau perbaiki fungsionalitas impor sesungguhnya |
| 14 | `ContentTable.tsx` (baris 308) | {(categoryFilter || statusFilter) ? 'Res... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 15 | `ContentTable.tsx` (baris 435) |  | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 16 | `ContentTable.tsx` (baris 444) |  | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 17 | `ContentTable.tsx` (baris 444) |  | Parah | Bug | Tombol hapus berpotensi mengeksekusi penghapusan permanen tanpa dialog konfirmasi | Integrasikan dengan AlertModal sebelum mengeksekusi penghapusan |
| 18 | `FileManager.tsx` (baris 123) | Preview | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 19 | `FileManager.tsx` (baris 132) |  | Parah | Bug | Tombol hapus berpotensi mengeksekusi penghapusan permanen tanpa dialog konfirmasi | Integrasikan dengan AlertModal sebelum mengeksekusi penghapusan |
| 20 | `FileManager.tsx` (baris 194) | } {copied ? 'Tersalin' : 'Salin Teks'} | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 21 | `Overview.tsx` (baris 105) | Import File | Mayor | Cacat | Tombol "Import File" menyesatkan (hanya membuka unggahan referensi, bukan import ide) | Ubah label menjadi "Unggah Referensi" atau perbaiki fungsionalitas impor sesungguhnya |
| 22 | `PublishedDetail.tsx` (baris 288) | Revert ke Thumbnailing | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 23 | `PublishedDetail.tsx` (baris 288) | Revert ke Thumbnailing | Mayor | Cacat | Tombol Revert tidak me-reset state tampilan sehingga pengguna terjebak di layar saat ini | Perbarui fungsi onRevert agar turut mereset selected item atau view state |
| 24 | `PublishedDetail.tsx` (baris 458) | )} | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 25 | `PublishedDetail.tsx` (baris 504) | handleApplyTitleAsMain(activeTitleA)}  ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 26 | `PublishedDetail.tsx` (baris 504) | handleApplyTitleAsMain(activeTitleA)}  ... | Sedang | Placeholder | Fitur antarmuka yang statis / tidak berfungsi (Zombie UI). Meskipun diklik, sistem A/B Testing judul tidak memiliki eksekutor nyata. | Sembunyikan elemen sementara sampai fitur A/B di-backend diaktifkan, atau sambungkan langsung ke state judul utama. |
| 27 | `PublishedDetail.tsx` (baris 543) | handleApplyTitleAsMain(activeTitleB)}  ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 28 | `PublishedDetail.tsx` (baris 543) | handleApplyTitleAsMain(activeTitleB)}  ... | Sedang | Placeholder | Fitur antarmuka yang statis / tidak berfungsi (Zombie UI). Meskipun diklik, sistem A/B Testing judul tidak memiliki eksekutor nyata. | Sembunyikan elemen sementara sampai fitur A/B di-backend diaktifkan, atau sambungkan langsung ke state judul utama. |
| 29 | `ScriptDetail.tsx` (baris 1102) | Kembali ke Pipeline | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 30 | `ScriptDetail.tsx` (baris 1364) | Kembali ke Ide | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 31 | `ScriptDetail.tsx` (baris 1372) | )} | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 32 | `ScriptDetail.tsx` (baris 1599) | Revert ke Idea | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 33 | `ScriptDetail.tsx` (baris 1599) | Revert ke Idea | Mayor | Cacat | Tombol Revert tidak me-reset state tampilan sehingga pengguna terjebak di layar saat ini | Perbarui fungsi onRevert agar turut mereset selected item atau view state |
| 34 | `ScriptDetail.tsx` (baris 1610) | {generatingHandoff ? 'Meregenerasi...' :... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 35 | `ScriptDetail.tsx` (baris 1622) | )} | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 36 | `ScriptDetail.tsx` (baris 1745) |  | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 37 | `ScriptDetail.tsx` (baris 1964) | Revert ke Researching | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 38 | `ScriptDetail.tsx` (baris 1974) | ) : (                      'Audit Spoke... | Sedang | Cacat | Tidak mendefinisikan atribut type eksplisit. Di dalam ekosistem React, tombol tanpa type bisa dikira submit form dan akan mereload halaman mendadak. | Wajib sisipkan type="button" secara spesifik. |
| 39 | `ScriptDetail.tsx` (baris 1974) | ) : (                      'Audit Spoke... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 40 | `ScriptDetail.tsx` (baris 1989) | ) : (                      'Anotasi Vis... | Sedang | Cacat | Tidak mendefinisikan atribut type eksplisit. Di dalam ekosistem React, tombol tanpa type bisa dikira submit form dan akan mereload halaman mendadak. | Wajib sisipkan type="button" secara spesifik. |
| 41 | `ScriptDetail.tsx` (baris 1989) | ) : (                      'Anotasi Vis... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 42 | `ScriptDetail.tsx` (baris 2004) | )} | Sedang | Cacat | Tidak mendefinisikan atribut type eksplisit. Di dalam ekosistem React, tombol tanpa type bisa dikira submit form dan akan mereload halaman mendadak. | Wajib sisipkan type="button" secara spesifik. |
| 43 | `ScriptDetail.tsx` (baris 2004) | )} | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 44 | `ScriptDetail.tsx` (baris 2022) | {generatingThumbnail ? 'Meregenerasi...'... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 45 | `ScriptDetail.tsx` (baris 2034) | )} | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 46 | `ScriptDetail.tsx` (baris 2085) |  | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 47 | `ScriptDetail.tsx` (baris 2125) | handleApplyTitleAsMain(titleA)}        ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 48 | `ScriptDetail.tsx` (baris 2162) | handleApplyTitleAsMain(titleB)}        ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 49 | `ScriptDetail.tsx` (baris 2270) | {appliedKey === 'audit' ? 'Sudah Diterap... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 50 | `ScriptDetail.tsx` (baris 2365) | {appliedKey === 'visual' ? 'Sudah Ditera... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 51 | `ScriptDetail.tsx` (baris 2398) | Revert ke Scripting | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 52 | `ScriptDetail.tsx` (baris 2408) | {generatingThumbnail ? 'Meregenerasi...'... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 53 | `ScriptDetail.tsx` (baris 2419) | {generatingTitles ? 'Membuat Judul...' :... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 54 | `ScriptDetail.tsx` (baris 2430) | )} | Sedang | Cacat | Tidak mendefinisikan atribut type eksplisit. Di dalam ekosistem React, tombol tanpa type bisa dikira submit form dan akan mereload halaman mendadak. | Wajib sisipkan type="button" secara spesifik. |
| 55 | `ScriptDetail.tsx` (baris 2430) | )} | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 56 | `ScriptDetail.tsx` (baris 2476) |  | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 57 | `ScriptDetail.tsx` (baris 2516) | handleApplyTitleAsMain(titleA)}        ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 58 | `ScriptDetail.tsx` (baris 2553) | handleApplyTitleAsMain(titleB)}        ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 59 | `ScriptDetail.tsx` (baris 2753) | Revert ke Thumbnailing | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 60 | `ScriptDetail.tsx` (baris 2753) | Revert ke Thumbnailing | Mayor | Cacat | Tombol Revert tidak me-reset state tampilan sehingga pengguna terjebak di layar saat ini | Perbarui fungsi onRevert agar turut mereset selected item atau view state |
| 61 | `ScriptDetail.tsx` (baris 2784) | Selesai / Perkecil (Esc) | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 62 | `ScriptDetail.tsx` (baris 2837) | setShowDraftHistoryModal(false)}       ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 63 | `ScriptDetail.tsx` (baris 2913) | Pulihkan Draf Ini | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 64 | `Settings.tsx` (baris 380) | }                    {saving === p.key ... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 65 | `Settings.tsx` (baris 452) | {isImporting ? 'Mengambil…' : 'Auto Impo... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 66 | `Settings.tsx` (baris 463) | }                      {saving === cfg.... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 67 | `Settings.tsx` (baris 627) | {verifyingBot ? 'Menguji…' : 'Uji Koneks... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 68 | `Settings.tsx` (baris 638) | }                {saving === 'telegram_... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 69 | `Settings.tsx` (baris 648) | {deletingToken ? 'Menghapus…' : 'Hapus T... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |
| 70 | `Settings.tsx` (baris 648) | {deletingToken ? 'Menghapus…' : 'Hapus T... | Parah | Bug | Tombol hapus berpotensi mengeksekusi penghapusan permanen tanpa dialog konfirmasi | Integrasikan dengan AlertModal sebelum mengeksekusi penghapusan |
| 71 | `Settings.tsx` (baris 778) | }                {saving === 'telegram_... | Minor | Inkonsisten | Terdapat styling inline yang dihardcode (style={{...}}) | Pindahkan styling ke file CSS terpusat |

## 3. Analisis Prioritas

- **Prioritas Tinggi** (harus segera diperbaiki)
  *Alasan:* Temuan dengan severity "Parah" melibatkan hilangnya data (penghapusan permanen tanpa konfirmasi). Ini adalah kerentanan fungsional fatal yang berpotensi merugikan pengguna. Selain itu, temuan "Mayor" terkait ketiadaan handler aksi harus diperbaiki agar fitur inti bisa berfungsi.
  
- **Prioritas Sedang**
  *Alasan:* Tombol yang tidak mendefinisikan `type` dapat memicu *submit* tak terduga dan mereload *state* aplikasi (*refresh*). Tombol-tombol dengan logika *Revert* yang tidak memperbarui *view state* membingungkan pengguna secara UX.
  
- **Prioritas Rendah**
  *Alasan:* Isu kosmetik seperti penggunaan atribut `class`, ketiadaan `aria-label`, elemen *zombie/placeholder*, dan *console.log* tidak menyebabkan kegagalan sistem, namun menumpuk *technical debt*. Perbaikan ini dapat dijadwalkan pada siklus optimasi akhir.

## 4. Rekomendasi Roadmap

Berdasarkan analisis, urutan pengerjaan (*roadmap*) yang disarankan beserta estimasi effortnya adalah:

1. **Prioritas Tinggi - Pencegahan Data Loss & Fungsionalitas Dasar (Estimasi: High)**
   - Perbaiki semua tombol hapus agar dibungkus oleh konfirmasi `AlertModal` (mis. Hapus Ide, Hapus File, Hapus Token).
   - Lengkapi tombol-tombol fungsional yang tidak memiliki aksi (tidak ada `onClick`).

2. **Prioritas Sedang - Stabilitas UI dan Navigasi (Estimasi: Medium)**
   - Tambahkan atribut `type="button"` pada seluruh tombol untuk mencegah *reload* halaman tak disengaja.
   - Perbaiki alur logika *revert state* agar UI selaras dengan basis data.
   - Perbaiki label "Import File" menjadi "Unggah Referensi" untuk mencegah ekspektasi keliru.

3. **Prioritas Rendah - Pembersihan Technical Debt (Estimasi: Low)**
   - Tambahkan label aksesibilitas (`aria-label`) pada tombol-tombol *icon*.
   - Hapus *console.log*, ganti atribut `class` dengan `className`.
   - Sembunyikan elemen UI fitur eksperimental (A/B testing) sampai *backend* siap.
