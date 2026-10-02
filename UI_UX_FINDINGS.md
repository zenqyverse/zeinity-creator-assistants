# Inventaris Temuan Audit UI/UX: Zeinity Creator Assistant

Dokumen ini memuat seluruh temuan audit terstruktur yang diidentifikasi melalui inspeksi kode sumber, pengujian rendering DOM aktual di browser (Chromium/Edge), analisis aliran interaksi pengguna, evaluasi aksesibilitas WCAG 2.1 AA, dan analisis responsif.

---

## DAFTAR TEMUAN BERDASARKAN TINGKAT SEVERITY

* **P0 — Kritis (3 Temuan):** F-01, F-02, F-03
* **P1 — Tinggi (6 Temuan):** F-04, F-05, F-06, F-07, F-08, F-09
* **P2 — Sedang (8 Temuan):** F-10, F-11, F-12, F-13, F-14, F-15, F-16, F-17
* **P3 — Rendah (5 Temuan):** F-18, F-19, F-20, F-21, F-22

---

## TEMUAN TINGKAT P0 — KRITIS

### [F-01] Risiko Kehilangan Data Input Draf Ide Akibat Klik Tidak Sengaja di Luar Modal atau Tombol Escape

* **Kategori:** Form / Interaction / UX Debt
* **Severity:** P0 — KRITIS
* **Route:** Global (`#/overview`, `#/ideas`, `#/research`, `#/scripts`, `#/published`)
* **Component:** `src/components/AddIdeaModal.tsx` & `src/App.tsx`

#### Observasi
Ketika pengguna sedang mengetik judul ide atau catatan riset yang panjang di dalam modal tambah/edit ide, modal dapat tertutup secara tiba-tiba tanpa konfirmasi atau pengecekan apakah form telah diubah (*dirty state*). Hal ini terjadi jika pengguna mengklik area backdrop di luar kartu modal atau menekan tombol `Escape` pada keyboard. Seluruh teks yang belum disimpan akan hilang seketika.

#### Bukti
1. Pada `src/components/AddIdeaModal.tsx` baris 103:
   ```tsx
   <div
     className={`modal-layer ${open ? 'open' : ''}`}
     role="dialog"
     aria-modal="true"
     aria-labelledby="idea-modal-title"
     onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
   >
   ```
   Klik pada `e.currentTarget` (backdrop luar) langsung mengeksekusi `onClose()`.
2. Pada `src/App.tsx` baris 519–527:
   ```tsx
   const handleKey = (e: KeyboardEvent) => {
     if (e.key === 'Escape') {
       setSidebarOpen(false);
       setAddIdeaOpen(false);
       setImportOpen(false);
       setBulkImportOpen(false);
       closeTerminal();
     }
   };
   ```
   Menekan `Escape` langsung mengatur `setAddIdeaOpen(false)` tanpa dialog konfirmasi pembatalan.

#### Dampak terhadap Pengguna
Kreator konten sering kali merumuskan ide atau riset naratif langsung di kolom *"Konteks / catatan singkat"*. Kehilangan data akibat salah klik kecil menciptakan frustrasi ekstrem, merusak kepercayaan pengguna terhadap keandalan sistem, dan membuang waktu produktif.

#### Alasan
Prinsip dasar pencegahan kesalahan (*Error Prevention - Nielsen Norman Group*) mewajibkan aplikasi melindungi data pengguna dari tindakan destruktif yang tidak disengaja. Form dengan data yang belum disimpan harus menerapkan penjaga perubahan (*unsaved changes guard*).

#### Rekomendasi
1. Tambahkan pelacak status perubahan (`isDirty`) di `AddIdeaModal.tsx`.
2. Jika pengguna mengklik backdrop atau menekan `Escape` saat form kotor, tampilkan konfirmasi *"Tinggalkan Halaman? Perubahan yang belum disimpan akan hilang."*
3. Nonaktifkan penutupan modal otomatis pada klik backdrop saat kolom input terisi.

---

### [F-02] Aksi "Simpan Semua Pengaturan" Menimpa Provider AI Pilihan Menjadi Mode Custom Secara Sepihak

* **Kategori:** Form / Logic / Technical Debt
* **Severity:** P0 — KRITIS
* **Route:** `#/settings`
* **Component:** `src/views/Settings.tsx`

#### Observasi
Pada halaman Pengaturan, ketika pengguna memilih AI Provider lain (misalnya Google Gemini, OpenRouter, atau Ollama Local) lalu mengklik tombol utama *"Simpan Semua Pengaturan"*, sistem secara sepihak menuliskan nilai `'custom'` ke dalam kunci `active_provider` di database/cache lokal. Akibatnya, pilihan provider pengguna tertimpa dan kembali ke 9Router/Custom Gateway tanpa disadari pengguna.

#### Bukti
Pada `src/views/Settings.tsx` baris 246–249:
```tsx
for (const k of keysToSave) {
  const valToSave = k === 'telegram_token' ? tgVal : k === 'active_provider' ? 'custom' : (values[k] || '');
  const ok = await onSave(k, valToSave);
  if (ok === false) allOk = false;
}
```
Perhatikan potongan kode `k === 'active_provider' ? 'custom' : (values[k] || '')`. Logika ternary ini secara sengaja memaksa nilai string `'custom'` dan mengabaikan nilai `values.active_provider` yang sebenarnya dipilih pengguna.

#### Dampak terhadap Pengguna
Pengguna yang telah membayar API Key Google Gemini atau OpenRouter mendapati bahwa panggilan AI mereka tetap diarahkan ke endpoint lokal 9Router (`http://localhost:20128/v1`). Jika endpoint lokal mati, validasi ide dan pembuatan naskah akan gagal total dengan error 401/koneksi terputus.

#### Alasan
Pelanggaran integritas konfigurasi pengguna. Tindakan "Simpan" harus menyimpan apa yang dipilih dan dilihat pengguna pada formulir, bukan nilai konstan yang di-hardcode.

#### Rekomendasi
Hapus pemaksaan nilai `'custom'` pada baris 247 di `Settings.tsx` dan simpan nilai dinamis `values.active_provider || 'custom'`.

---

### [F-03] Kesalahan Deklarasi Atribut Bahasa Dokumen HTML (`<html lang="en">` pada UI Berbahasa Indonesia)

* **Kategori:** Accessibility
* **Severity:** P0 — KRITIS
* **Route:** Global (Semua Rute)
* **Component:** `index.html`

#### Observasi
File root `index.html` mendeklarasikan atribut bahasa sebagai `lang="en"` (English), sedangkan seluruh antarmuka aplikasi, teks panduan, label tombol, notifikasi toast, dan konten naskah menggunakan Bahasa Indonesia.

#### Bukti
Pada `index.html` baris 2:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
```

#### Dampak terhadap Pengguna
Perangkat lunak pembaca layar (*screen reader*) seperti NVDA, JAWS, dan VoiceOver membaca seluruh teks antarmuka menggunakan aksen dan aturan pelafalan fonetik bahasa Inggris. Teks seperti *"Tambah Ide Baru"* atau *"Operasi Konten Internal"* dilafalkan secara kacau sehingga mustahil dipahami oleh pengguna tunanetra atau pengguna dengan gangguan penglihatan.

#### Alasan
Pelanggaran langsung terhadap kriteria sukses WCAG 2.1 Level A (3.1.1 Language of Page). Atribut bahasa dokumen adalah fondasi utama aksesibilitas web semantik.

#### Rekomendasi
Ubah nilai atribut menjadi `<html lang="id">` pada `index.html`.

---

## TEMUAN TINGKAT P1 — TINGGI

### [F-04] Ketiadaan Pengunci Fokus (*Focus Trap*) pada Seluruh Komponen Modal Dialog

* **Kategori:** Accessibility / Interaction
* **Severity:** P1 — TINGGI
* **Route:** Global (Semua Rute yang Membuka Modal)
* **Component:** `AddIdeaModal.tsx`, `ImportModal.tsx`, `BulkImportModal.tsx`, `AlertModal.tsx`, `ThumbnailTitleStudio.tsx`

#### Observasi
Ketika modal terbuka, fokus keyboard tidak diarahkan ke dalam modal dan tidak terkunci di dalam area dialog. Saat pengguna menekan tombol `Tab`, fokus keyboard dapat keluar dari modal dan berinteraksi dengan elemen-elemen tombol, tabel, dan topbar di latar belakang yang tertutup visual backdrop.

#### Bukti
Inspeksi kode pada kelima komponen modal membuktikan tidak adanya implementasi `useRef` untuk elemen fokus pertama/terakhir, tidak ada *keyboard focus trap listener*, dan tidak ada pemanggilan `.focus()` pada saat modal pertama kali dibuka (`useEffect` saat `open === true`).
Hasil inspeksi DOM `scratch/analyze_a11y.cjs` menunjukkan seluruh 8 modal layer berada dalam DOM tanpa atribut `inert` pada konten latar belakang saat terbuka.

#### Dampak terhadap Pengguna
Pengguna disabilitas motorik dan pengguna yang hanya mengandalkan keyboard (*keyboard-only users*) tersesat di dalam dokumen. Mereka dapat secara tidak sengaja mengklik tombol hapus atau link navigasi di latar belakang saat mencoba mengisi formulir di dalam modal.

#### Alasan
Pelanggaran kriteria sukses WCAG 2.1 Level A (2.1.2 No Keyboard Trap) dan Level AA (2.4.3 Focus Order). Modal dialog menurut standar WAI-ARIA Modal Dialog Pattern wajib mengunci fokus di dalam dirinya sendiri hingga modal ditutup.

#### Rekomendasi
Terapkan hook `useFocusTrap` atau atribut HTML `inert` pada elemen `#root > .app-shell` ketika modal aktif, serta kembalikan fokus ke tombol pemicu (*trigger button*) saat modal ditutup.

---

### [F-05] Perilaku Polimorfik Judul Tabel yang Membingungkan Pengguna

* **Kategori:** Information Architecture / Interaction / Predictability
* **Severity:** P1 — TINGGI
* **Route:** `#/ideas`, `#/research`, `#/scripts`, `#/published`
* **Component:** `src/views/ContentTable.tsx`

#### Observasi
Kolom pertama tabel menampilkan judul konten sebagai tombol yang dapat diklik (`cell-title cell-title-btn`). Namun, mengklik judul tersebut menghasilkan tiga aksi yang sama sekali berbeda bergantung pada status item, tanpa adanya indikator visual pembeda (misal: ikon eksternal atau ikon pensil).

#### Bukti
Pada `src/views/ContentTable.tsx` baris 305–313:
```tsx
const handleTitleClick = (item: ContentItem) => {
  if (item.status === 'Published') {
    onViewPublished(item);
  } else if (item.status === 'Researching' || item.status === 'Scripting' || item.status === 'Thumbnailing') {
    onViewScript(item);
  } else {
    onEdit(item);
  }
};
```
Baris dengan status `Idea` membuka modal dialog, baris dengan status `Scripting` melakukan navigasi halaman penuh ke `ScriptDetail`, dan baris dengan status `Published` melakukan navigasi ke `PublishedDetail`.

#### Dampak terhadap Pengguna
Melanggar prinsip *Predictability*. Pengguna merasa bingung mengapa beberapa klik judul memunculkan dialog pop-up sementara judul lainnya memindahkan layar mereka ke antarmuka editor yang sangat berbeda.

#### Alasan
Dalam desain antarmuka enterprise, elemen yang tampak identik secara visual harus memiliki perilaku yang konsisten.

#### Rekomendasi
Pisahkan tindakan: jadikan klik judul secara konsisten membuka detail/workspace konten, dan gunakan tombol aksi *"Edit Ide"* (ikon pensil) secara eksplisit jika ingin mengedit metadata judul/kategori dalam bentuk pop-up modal.

---

### [F-06] Bilah Pencarian Global (*Global Search*) Tidak Responsif pada 6 dari 10 Halaman Utama

* **Kategori:** Navigation / UX / Discoverability
* **Severity:** P1 — TINGGI
* **Route:** `#/overview`, `#/trends`, `#/rss`, `#/files`, `#/analytics`, `#/settings`
* **Component:** `src/components/Topbar.tsx` & `src/App.tsx`

#### Observasi
Bilah pencarian di `Topbar.tsx` berukuran besar dan diletakkan di posisi paling mencolok di bagian atas layar. Namun, saat pengguna berada di halaman selain tabel pipeline (`overview`, `trends`, `rss`, `files`, `analytics`, `settings`), mengetikkan teks di bilah pencarian tidak melakukan apa pun di layar dan tidak mengarahkan pengguna ke hasil pencarian.

#### Bukti
1. Pada `src/App.tsx` baris 760:
   ```tsx
   const isTableActive = ['ideas', 'research', 'scripts', 'published'].includes(activeView) && !scriptItem && !publishedItem;
   ```
2. Pada `src/App.tsx` baris 762–764:
   ```tsx
   const handleSearchChange = (val: string) => {
     setSearchQuery(val);
   };
   ```
   Fungsi `handleSearchChange` hanya memperbarui state `searchQuery` tanpa mengubah `activeView` ke `'ideas'` atau menyaring konten halaman aktif.

#### Dampak terhadap Pengguna
Pengguna mengira aplikasi macet atau fitur pencarian rusak karena mengetik kata kunci di halaman Overview atau Radar Tren tidak memberikan respons apa pun.

#### Alasan
Sebuah bilah pencarian global di header utama memiliki ekspektasi UX bahwa ia dapat mencari konten kapan saja dari halaman mana saja (*universal search affordance*).

#### Rekomendasi
Jika pengguna mulai mengetik di bilah pencarian saat tidak berada di tabel ide, otomatis alihkan tampilan ke tab `Content Ideas` (`setActiveView('ideas')`) atau tampilkan dropdown *instant search result* di bawah input.

---

### [F-07] Navigasi Desktop Tersembunyi di Balik Drawer Hamburger (Inefisiensi Alur Kerja)

* **Kategori:** Navigation / Responsive / Layout
* **Severity:** P1 — TINGGI
* **Route:** Global (Semua Rute di Desktop)
* **Component:** `src/components/Sidebar.tsx` & `src/index.css`

#### Observasi
Pada layar desktop lebar (1440px ke atas), menu navigasi samping (`Sidebar`) disembunyikan secara default di luar layar dan hanya dapat dibuka dengan mengklik tombol hamburger di `Topbar`. Setiap kali menu dibuka, backdrop hitam menutupi seluruh layar kerja. Begitu pengguna memilih salah satu menu, drawer tertutup kembali secara otomatis.

#### Bukti
Pada `src/index.css` baris 838–851:
```css
.sidebar {
  position: fixed;
  z-index: 30;
  left: 14px;
  top: 14px;
  bottom: 14px;
  width: min(330px, calc(100% - 28px));
  border-radius: var(--radius-xl);
  padding: 17px;
  transform: translateX(calc(-100% - 30px));
  transition: transform .35s cubic-bezier(.2, .8, .2, 1);
  display: flex;
  flex-direction: column;
}
```
Tidak ada media query desktop (`@media (min-width: 1024px)`) yang membuat sidebar menjadi statis atau persisten.

#### Dampak terhadap Pengguna
Di layar monitor besar, terdapat ruang kosong horizontal yang sangat luas di sisi kiri dan kanan, namun pengguna terpaksa melakukan 2 klik berulang kali untuk setiap perpindahan halaman, disertai efek kedipan backdrop modal yang melelahkan mata.

#### Alasan
Pola drawer modal diperuntukkan bagi perangkat mobile dengan ruang layar terbatas. Pada dashboard operasi desktop, sidebar persisten (atau *collapsible rail*) adalah pola standar industri untuk efisiensi navigasi cepat.

#### Rekomendasi
Tambahkan tata letak responsif desktop pada lebar layar `>= 1024px`: tampilkan sidebar secara statis/persisten di sisi kiri konten tanpa backdrop overlay, dan sediakan tombol toggle untuk menyusutkan sidebar (*mini rail mode*).

---

### [F-08] Ketiadaan Atribut Semantik `aria-current="page"` pada Navigasi Aktif

* **Kategori:** Accessibility
* **Severity:** P1 — TINGGI
* **Route:** Global
* **Component:** `src/components/Sidebar.tsx`

#### Observasi
Tombol menu navigasi pada `Sidebar.tsx` hanya menandai status aktif menggunakan kelas visual `className="nav-item active"`. Tidak terdapat atribut ARIA semantik `aria-current="page"`.

#### Bukti
Pada `src/components/Sidebar.tsx` baris 48–57:
```tsx
<button
  key={item.key}
  className={`nav-item ${activeView === item.key ? 'active' : ''}`}
  type="button"
  onClick={() => onNavigate(item.key)}
>
  <Icon size={17} />
  {item.label}
</button>
```

#### Dampak terhadap Pengguna
Pengguna pembaca layar mendengar daftar 10 item menu tanpa mengetahui menu mana yang sedang aktif atau halaman mana yang sedang mereka buka.

#### Alasan
Pelanggaran WCAG 2.1 Level A (4.1.2 Name, Role, Value & 1.3.1 Info and Relationships).

#### Rekomendasi
Tambahkan atribut `aria-current={activeView === item.key ? 'page' : undefined}` pada tombol navigasi di `Sidebar.tsx`.

---

### [F-09] Fragmentasi Tiga Arsitektur Modal Terpisah dengan Z-Index dan Styling yang Bertabrakan

* **Kategori:** Consistency / Design System / UI Debt
* **Severity:** P1 — TINGGI
* **Route:** Global
* **Component:** `AddIdeaModal.tsx`, `AlertModal.tsx`, `ThumbnailTitleStudio.tsx`

#### Observasi
Aplikasi memiliki tiga implementasi modal yang dikembangkan secara terpisah pada berbagai iterasi, menghasilkan tiga tumpukan kelas CSS, tingkat z-index, radius sudut, dan backdrop yang saling bertentangan.

#### Bukti
1. Sistem 1 (`AddIdeaModal`, `ImportModal`, `BulkImportModal`): Kelas `.modal-layer` (`z-index: 40`, backdrop `rgba(1, 6, 20, .65)`, radius 18px).
2. Sistem 2 (`AlertModal`): Kelas `.alert-modal-layer` (`z-index: 9999`, backdrop `rgba(0, 0, 0, 0.75)`, radius 16px).
3. Sistem 3 (`ThumbnailTitleStudio`): Kelas `.modal-overlay` (`z-index: 1000`, backdrop `rgba(3, 8, 20, 0.85)` dengan `backdrop-filter: blur(8px)`, radius 12px).

#### Dampak terhadap Pengguna
Sensasi visual yang tidak kohesif, efek animasi pembukaan dialog yang berbeda-beda, dan risiko tumpang-tindih z-index di mana modal satu dapat tertutup sebagian oleh backdrop modal lainnya.

#### Alasan
Utang teknis antarmuka (*UI Debt*) akibat penambahan fitur bertahap tanpa standardisasi komponen dasar (*Design System Gap*).

#### Rekomendasi
Konsolidasikan seluruh dialog menjadi satu komponen dasar `<ModalRoot>` atau `<Dialog>` terpadu dengan varian ukuran (`sm`, `md`, `lg`, `xl`) dan z-index terstandarisasi.

---

## TEMUAN TINGKAT P2 — SEDANG

### [F-10] Proliferasi Ribuan Baris Gaya Inline (*Inline Styles*) yang Memintas Token CSS

* **Kategori:** Design System / Consistency / Technical Debt
* **Severity:** P2 — SEDANG
* **Route:** Global
* **Component:** `Topbar.tsx`, `Overview.tsx`, `ContentTable.tsx`, `ScriptDetail.tsx`

#### Observasi
Terdapat ratusan elemen antarmuka yang didefinisikan dengan objek `style={{ ... }}` langsung di dalam file TSX (misal: warna background hardcoded `#091222`, `#0a101d`, `#162842`), alih-alih menggunakan variabel CSS tokens (`var(--panel)`, `var(--panel-strong)`, `var(--border)`) atau utility Tailwind CSS.

#### Bukti
Contoh nyata pada `src/components/Topbar.tsx` baris 236–250, 260–267, 307–320:
```tsx
<div
  className="glass"
  style={{
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 320,
    borderRadius: 14,
    padding: 12,
    background: 'rgba(10, 20, 48, 0.96)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(79, 232, 255, 0.35)',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
    zIndex: 70,
  }}
>
```

#### Dampak terhadap Pengguna
Perbedaan halus pada tingkat kecerahan latar belakang antarhalaman yang mengurangi kesan profesionalitas aplikasi executive. Pemeliharaan tema menjadi sangat rapuh jika terjadi perubahan palet warna dasar di masa depan.

#### Alasan
Penggunaan inline styling berlebih melanggar prinsip modularitas CSS dan mempersulit penegakan design system yang konsisten.

#### Rekomendasi
Pindahkan styling inline berulang ke kelas utilitas atau komponen reusable terstandarisasi di `src/index.css`.

---

### [F-11] Elemen Avatar Pengguna Non-Interaktif Memiliki `tabIndex={0}`

* **Kategori:** Accessibility
* **Severity:** P2 — SEDANG
* **Route:** Global (Header Topbar)
* **Component:** `src/components/Topbar.tsx`

#### Observasi
Elemen avatar pengguna di ujung kanan header memiliki atribut `tabIndex={0}` dan gaya hover, namun tidak memiliki event listener klik atau keyboard (`onClick`, `onKeyDown`), dan tidak membuka menu profil apa pun.

#### Bukti
Pada `src/components/Topbar.tsx` baris 599–606:
```tsx
<div
  className="avatar user-avatar"
  role="img"
  tabIndex={0}
  title="Akun: Zeinity Admin (Sesi Lokal)"
  aria-label="Profil Pengguna: Zeinity Admin"
>
  ZA
</div>
```

#### Dampak terhadap Pengguna
Pengguna keyboard yang menekan `Tab` akan terhenti pada avatar, menekan `Enter` atau `Space`, namun tidak ada yang terjadi. Hal ini menimbulkan kebingungan apakah antarmuka sedang hang atau tombol rusak.

#### Alasan
Pelanggaran WCAG 2.1 (4.1.2 Name, Role, Value). Elemen yang menerima fokus keyboard harus berupa kontrol interaktif nyata.

#### Rekomendasi
Jika avatar belum memiliki menu profil atau dialog logout, hapus atribut `tabIndex={0}` agar tidak masuk ke urutan navigasi tab keyboard.

---

### [F-12] Inkonsistensi Huruf Kapital dan Percampuran Bahasa Inggris–Indonesia

* **Kategori:** Microcopy / Consistency
* **Severity:** P2 — SEDANG
* **Route:** Global (`#/scripts`, `#/overview`)
* **Component:** `ScriptDetail.tsx`, `Sidebar.tsx`, `ContentTable.tsx`

#### Observasi
Terdapat percampuran istilah dan kapitalisasi yang tidak rapi:
1. Pada `ScriptDetail.tsx` baris 2443 & 2450: Tab 1 menggunakan Title Case (`✍️ 1. Studio Naskah`), sedangkan Tab 2 menggunakan All Caps (`📦 2. FINISHING & PACKAGING`).
2. Pada `Sidebar.tsx`: Menu ke-6 menggunakan Bahasa Indonesia (`Radar Tren`), sedangkan 9 menu lainnya menggunakan Bahasa Inggris (`Overview`, `Content Ideas`, `AI Research`, `Scripts`, `Published`, `RSS Reader`, dll).
3. Tombol aksi: Tombol dialog menggunakan *"Cancel"* bersanding dengan *"Simpan Ide"*.

#### Bukti
Kutipan kode `ScriptDetail.tsx` baris 2443–2451:
```tsx
<button ...>✍️ 1. Studio Naskah</button>
<button ...>📦 2. FINISHING & PACKAGING</button>
```

#### Dampak terhadap Pengguna
Menimbulkan kesan produk tidak dipoles (*unpolished*) dan dibangun secara terburu-buru tanpa panduan editorial microcopy yang jelas.

#### Alasan
Konsistensi tata bahasa (*linguistic consistency*) adalah bagian vital dari kredibilitas pengalaman produk (*product credibility*).

#### Rekomendasi
Tetapkan standar: Gunakan Title Case untuk seluruh tab (`📦 2. Finishing & Packaging`) dan selaraskan istilah bahasa utama (prioritaskan Bahasa Indonesia yang konsisten di seluruh antarmuka).

---

### [F-13] Penggunaan Tipografi Mikro Di Bawah Batas Keterbacaan Minimum (<12px)

* **Kategori:** Visual UI / Accessibility
* **Severity:** P2 — SEDANG
* **Route:** Global
* **Component:** `src/index.css`, `Topbar.tsx`, `Sidebar.tsx`

#### Observasi
Banyak elemen antarmuka menggunakan ukuran font sangat kecil (antara 9.9px hingga 11.3px) dengan warna kontras rendah.

#### Bukti
1. `src/index.css` baris 249: `.eyebrow { font-size: .71rem; }` (11.36px).
2. `src/index.css` baris 926: `.key-mask { font-size: .69rem; }` (11.04px).
3. `src/components/Topbar.tsx` baris 274: `fontSize: '0.62rem'` (9.92px) dan baris 286: `fontSize: '0.66rem'` (10.56px).

#### Dampak terhadap Pengguna
Pengguna dengan penglihatan kurang tajam atau pengguna yang bekerja di monitor beresolusi tinggi (4K/Retina) mengalami kelelahan mata ekstrem saat membaca status router dan sub-judul.

#### Alasan
Pedoman desain aksesibilitas merekomendasikan ukuran font minimal 12px untuk teks fungsional dan 14px untuk teks isi (*body text*).

#### Rekomendasi
Tingkatkan ukuran font minimal menjadi setidaknya `0.75rem` (12px) dengan kontras warna yang ditingkatkan menjadi minimal 4.5:1 terhadap latar belakang.

---

### [F-14] Penumpukan Vertikal Ekstrem pada Studio Naskah di Layar Tablet (<=960px)

* **Kategori:** Responsive / Usability
* **Severity:** P2 — SEDANG
* **Route:** `#/scripts`, `#/script/:id`
* **Component:** `src/views/ScriptDetail.tsx` & `src/index.css`

#### Observasi
Pada lebar layar 960px ke bawah (tablet seperti iPad landscape atau portrait), tata letak kisi ganda (`.scripting-dual-pane-grid`) otomatis beralih menjadi 1 kolom penuh. Hal ini memaksa panel *Outline Studio* berada di atas dan kanvas penulisan naskah *Script Draft Studio* berada jauh di bawah.

#### Bukti
Pada `src/index.css` baris 2309–2314:
```css
@media (max-width: 960px) {
  .scripting-dual-pane-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

#### Dampak terhadap Pengguna
Pengguna tablet harus menggulir ke bawah melewati kartu formula hook, catatan revisi, dan draf outline yang panjang sebelum dapat melihat draf naskah video atau menyunting isi naskah.

#### Alasan
Pada perangkat dengan ketinggian layar terbatas, menumpuk dua panel yang sama-sama panjang menciptakan efek *"infinite scroll"* yang mengganggu proses menulis.

#### Rekomendasi
Pada layar tablet (`<=960px`), sediakan tab pengalih (*sub-tab toggle*) antara *"Kerangka / Outline"* dan *"Draf Naskah / Editor"*, atau sediakan tombol lipat (*collapse panel*) pada panel Outline.

---

### [F-15] Kepadatan Berlebih Header Mobile (Resolusi 375px)

* **Kategori:** Responsive / Mobile UX
* **Severity:** P2 — SEDANG
* **Route:** Global (Tampilan Layar Mobile)
* **Component:** `src/components/Topbar.tsx` & `src/index.css`

#### Observasi
Pada pengujian viewport mobile 375px x 812px (iPhone SE/13), baris pertama `Topbar` memuat tombol menu hamburger, logo Zeinity, pill status router, status bot Telegram, tombol log terminal, dan avatar secara bersamaan. Total lebar gabungan elemen melebihi lebar layar 375px.

#### Bukti
Inspeksi file hasil dump DOM mobile `scratch/dom_mobile_375.html` dan `src/index.css` baris 1591–1597:
```css
@media (max-width: 620px) {
  .topbar { flex-wrap: wrap; }
  .search-box { order: 3; flex-basis: 100%; max-width: none; margin-left: 0; }
}
```
Aturan ini hanya memindahkan `search-box` ke baris baru, sementara 6 kontrol interaktif lainnya tetap dijejalkan di baris pertama tanpa pengaturan persembunyian elemen sekunder.

#### Dampak terhadap Pengguna
Tombol-tombol di header menjadi sangat berhimpitan, meningkatkan risiko salah sentuh (*mis-click/mis-tap*) pada layar sentuh.

#### Alasan
Pedoman Apple Human Interface Guidelines dan Google Material Design mensyaratkan target sentuh minimal 44x44px dengan jarak aman antarkontrol.

#### Rekomendasi
Pada resolusi `<=620px`, sembunyikan badge detail *"ROUTER ONLINE 🟢"* dan *"Bot —"*, ganti dengan indikator titik sederhana (*dot indicator*), dan pindahkan tombol terminal ke dalam menu sidebar drawer.

---

### [F-16] Duplikasi State Penyelesaian Konten Terbit di `ScriptDetail.tsx` dan `PublishedDetail.tsx`

* **Kategori:** UX Debt / Consistency
* **Severity:** P2 — SEDANG
* **Route:** `#/scripts`, `#/published`
* **Component:** `ScriptDetail.tsx` (baris 3432–3447) & `PublishedDetail.tsx`

#### Observasi
Ketika konten mencapai status `Published`, `ScriptDetail.tsx` memiliki blok tampilan penyelesaian sementara berupa ikon centang besar dan pesan *"Konten Selesai!"*. Sementara itu, aplikasi sebenarnya sudah memiliki halaman lengkap `PublishedDetail.tsx` yang memantau analitik views, likes, dan metrik publikasi.

#### Bukti
Pada `src/views/ScriptDetail.tsx` baris 3432–3447:
```tsx
{item.status === 'Published' && (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 200, color: 'var(--green)' }}>
    <Check size={48} style={{ marginBottom: 16 }} />
    <h3>Konten Selesai!</h3>
    <p style={{ color: '#7890af', marginBottom: 16 }}>Konten ini telah selesai melalui seluruh pipeline AI.</p>
    <button ...>Revert ke Thumbnailing</button>
  </div>
)}
```

#### Dampak terhadap Pengguna
Pengguna melihat dua antarmuka yang berbeda untuk status yang sama. Setelah menandai konten selesai di `ScriptDetail`, pengguna melihat kartu minimalis ini sebelum akhirnya diarahkan ke `PublishedDetail`.

#### Alasan
Residu kode dari iterasi masa lalu sebelum `PublishedDetail.tsx` diimplementasikan secara penuh.

#### Rekomendasi
Saat pengguna mengklik publish di `ScriptDetail`, lakukan transisi langsung ke `PublishedDetail` tanpa merender kartu placeholder sementara ini.

---

### [F-17] Ketiadaan Link Aksesibilitas "Skip to Content" (*Bypass Blocks*)

* **Kategori:** Accessibility
* **Severity:** P2 — SEDANG
* **Route:** Global
* **Component:** `src/App.tsx` / `index.html`

#### Observasi
Aplikasi tidak memiliki link tersembunyi *"Lewati ke Konten Utama"* (*Skip to Main Content*) di awal halaman untuk navigasi keyboard.

#### Bukti
Hasil analisis skrip `scratch/analyze_a11y.cjs`:
`"hasSkipLink": false` di seluruh 8 rute halaman.

#### Dampak terhadap Pengguna
Pengguna keyboard harus menekan tombol `Tab` melewati tombol hamburger, bilah pencarian, pemilih provider, status bot, tombol terminal, dan avatar di header sebelum dapat mencapai konten utama atau tabel pipeline.

#### Alasan
Pelanggaran WCAG 2.1 Level A (2.4.1 Bypass Blocks).

#### Rekomendasi
Tambahkan tautan `<a href="#main-content" className="skip-link">Lewati ke konten utama</a>` di awal render `App.tsx`.

---

## TEMUAN TINGKAT P3 — RENDAH (POLISH & REFINEMENT)

### [F-18] Input File Dropzone Tanpa Label Aksesibel
* **Kategori:** Accessibility
* **Severity:** P3 — RENDAH
* **Route:** `#/files`, Modal Impor
* **Component:** `src/components/ImportModal.tsx` baris 842 & `src/views/FileManager.tsx`
* **Observasi:** Elemen `<input type="file" accept=".docx,.csv,.txt,.md" style="display: none;">` tidak memiliki atribut `aria-label` atau `id` yang terhubung dengan elemen label.
* **Rekomendasi:** Berikan atribut `aria-label="Pilih berkas referensi untuk diunggah"`.

### [F-19] Ketiadaan Feedback Loading Visual Skeleton pada Halaman Analitik & RSS
* **Kategori:** Feedback / Loading State
* **Severity:** P3 — RENDAH
* **Route:** `#/analytics`, `#/rss`
* **Component:** `Analytics.tsx`, `RSSReader.tsx`
* **Observasi:** Saat memuat feed RSS baru atau menghitung analitik metrik, UI hanya menggunakan teks *"Memuat data…"* atau spinner kecil di tengah layar tanpa skeleton placeholder, menyebabkan pergeseran tata letak visual (*layout shift*).
* **Rekomendasi:** Terapkan skeleton card sederhana yang mempertahankan dimensi kotak metrik dan kartu artikel RSS selama proses fetch.

### [F-20] Residu Logika Pembersihan Residual Kunci Legacy di Hook useContent
* **Kategori:** Technical Debt
* **Severity:** P3 — RENDAH
* **Route:** Inisialisasi Hook
* **Component:** `src/hooks/useContent.ts` baris 20–34
* **Observasi:** Masih terdapat kode perulangan `localStorage` untuk menghapus kunci lama `zeinity_visual_cue_prompt_` yang dieksekusi setiap kali modul diimpor.
* **Rekomendasi:** Berikan tanda dokumentasi `@deprecated` atau jadwalkan pembersihan permanen setelah siklus migrasi selesai.

### [F-21] Pilihan Durasi Naskah Menggunakan Simbol Unicode En-Dash yang Rawan Parsing
* **Kategori:** Microcopy / Technical Debt
* **Severity:** P3 — RENDAH
* **Route:** `#/scripts`
* **Component:** `src/lib/gemini.ts` baris 39, `ScriptPreflightBar.tsx`
* **Observasi:** Pilihan durasi preset menggunakan karakter en-dash (`–`) alih-alih tanda minus standar (`-`), sehingga memerlukan penanganan regex ganda di fungsi `calculateTargetWords`.
* **Rekomendasi:** Normalisasikan nilai enum durasi internal menggunakan format standar string (misal: `'5-8'`, `'8-12'`, `'12-15'`).

### [F-22] Monolithic File Sizes (File Kode Terlalu Gemuk)
* **Kategori:** Technical Debt / Code Health
* **Severity:** P3 — RENDAH
* **Route:** Kode Sumber
* **Component:** `ScriptDetail.tsx` (3.755 baris), `gemini.ts` (3.470 baris), `index.css` (2.594 baris), `ScriptDraftStudio.tsx` (2.474 baris)
* **Observasi:** File-file di atas sangat padat dan menggabungkan puluhan tanggung jawab sekaligus, memperlambat proses review dan meningkatkan risiko regresi saat pengeditan.
* **Rekomendasi:** Jadwalkan refactor pemecahan komponen ke sub-modul yang lebih kecil pada siklus pemeliharaan berikutnya tanpa mengubah kontrak API publik.
