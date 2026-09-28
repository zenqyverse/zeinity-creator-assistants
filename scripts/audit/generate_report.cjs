const fs = require('fs');

const data = JSON.parse(fs.readFileSync('buttons_dump.json', 'utf8'));

let findings = [];
let no = 1;

let stats = {
  parah: 0,
  mayor: 0,
  sedang: 0,
  minor: 0,
  totalButtons: data.length
};

data.forEach((btn) => {
  let issues = [];
  const code = btn.code;
  const lowerCode = code.toLowerCase();
  
  const hasType = code.includes('type=');
  const isSubmit = code.includes('type="submit"');
  const hasOnClick = code.includes('onClick=');
  const hasOldClass = code.includes(' class=');
  const hasStyle = code.includes('style={{');
  
  const isIconOnly = !code.match(/>\s*[^<]+?\s*<\/button>/) && code.includes('<');
  const hasAriaLabel = code.includes('aria-label=') || code.includes('title=');
  const hasConsoleLog = code.includes('console.log');
  const isEmptyOnClick = code.match(/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/);
  
  const isDangerous = lowerCode.includes('delete') || lowerCode.includes('hapus') || lowerCode.includes('trash');
  const onClickMatch = code.match(/onClick=\{([^}]+)\}/);
  
  let nameMatch = code.match(/>\s*([^<]{2,})\s*<\/button>/);
  let name = nameMatch ? nameMatch[1].trim() : (isIconOnly ? 'Icon Button' : 'Button');
  if (name.length > 40) name = name.substring(0, 40) + '...';
  if (name === 'Icon Button' && hasAriaLabel) {
     let titleMatch = code.match(/(?:title|aria-label)="([^"]+)"/);
     if (titleMatch) name = 'Icon: ' + titleMatch[1];
  }
  if (name === 'Button' || name === 'Icon Button') {
    let classMatch = code.match(/className="([^"]+)"/);
    if (classMatch) name = 'Btn Class: ' + classMatch[1];
  }

  if (!hasType) {
    issues.push({
      severity: 'Sedang',
      category: 'Cacat',
      desc: 'Tidak mendefinisikan atribut type eksplisit. Di dalam ekosistem React, tombol tanpa type bisa dikira submit form dan akan mereload halaman mendadak.',
      rec: 'Wajib sisipkan type="button" secara spesifik.'
    });
  }
  
  if (!hasOnClick && !isSubmit && !code.includes('disabled')) {
    issues.push({
      severity: 'Mayor',
      category: 'Tidak Berfungsi',
      desc: 'Tombol tidak memiliki aksi onClick',
      rec: 'Implementasikan event handler onClick'
    });
  }
  
  if (isEmptyOnClick) {
    issues.push({
      severity: 'Mayor',
      category: 'Placeholder',
      desc: 'Fungsi onClick hanya berisi placeholder kosong',
      rec: 'Implementasikan fungsi aksi yang sebenarnya'
    });
  }
  
  if (hasConsoleLog) {
    issues.push({
      severity: 'Minor',
      category: 'Placeholder',
      desc: 'Terdapat console.log yang tersisa pada event onClick',
      rec: 'Hapus console.log untuk pembersihan kode'
    });
  }
  
  if (hasOldClass) {
    issues.push({
      severity: 'Sedang',
      category: 'Inkonsisten',
      desc: 'Menggunakan atribut HTML class bukannya className (React)',
      rec: 'Ganti atribut class dengan className'
    });
  }

  if (hasStyle) {
    issues.push({
      severity: 'Minor',
      category: 'Inkonsisten',
      desc: 'Terdapat styling inline yang dihardcode (style={{...}})',
      rec: 'Pindahkan styling ke file CSS terpusat'
    });
  }

  if (isIconOnly && !hasAriaLabel) {
    issues.push({
      severity: 'Minor',
      category: 'Cacat',
      desc: 'Tombol icon tidak memiliki aria-label atau title untuk aksesibilitas',
      rec: 'Tambahkan atribut aria-label atau title'
    });
  }
  
  if (isDangerous && onClickMatch && !onClickMatch[1].toLowerCase().includes('confirm') && !onClickMatch[1].toLowerCase().includes('modal')) {
    if (onClickMatch[1].includes('handleDelete') || onClickMatch[1].includes('onDelete') || code.includes('Trash2')) {
       issues.push({
         severity: 'Parah',
         category: 'Bug',
         desc: 'Tombol hapus berpotensi mengeksekusi penghapusan permanen tanpa dialog konfirmasi',
         rec: 'Integrasikan dengan AlertModal sebelum mengeksekusi penghapusan'
       });
    }
  }

  if (code.includes('Import File') && onClickMatch && onClickMatch[1].includes('onImportFile')) {
    issues.push({
      severity: 'Mayor',
      category: 'Cacat',
      desc: 'Tombol "Import File" menyesatkan (hanya membuka unggahan referensi, bukan import ide)',
      rec: 'Ubah label menjadi "Unggah Referensi" atau perbaiki fungsionalitas impor sesungguhnya'
    });
  }

  if (code.includes('Revert ke Thumbnailing') || code.includes('Revert ke Idea')) {
    issues.push({
      severity: 'Mayor',
      category: 'Cacat',
      desc: 'Tombol Revert tidak me-reset state tampilan sehingga pengguna terjebak di layar saat ini',
      rec: 'Perbarui fungsi onRevert agar turut mereset selected item atau view state'
    });
  }
  
  if (code.includes('Gunakan sbg Judul Utama')) {
     issues.push({
       severity: 'Sedang',
       category: 'Placeholder',
       desc: 'Fitur antarmuka yang statis / tidak berfungsi (Zombie UI). Meskipun diklik, sistem A/B Testing judul tidak memiliki eksekutor nyata.',
       rec: 'Sembunyikan elemen sementara sampai fitur A/B di-backend diaktifkan, atau sambungkan langsung ke state judul utama.'
     });
  }

  if (code.includes('Filter') && btn.file === 'ContentTable.tsx' && code.includes('btn-secondary')) {
     issues.push({
       severity: 'Minor',
       category: 'Inkonsisten',
       desc: 'Tombol berfungsi di halaman utama, namun jika ditekan dari dalam navigasi khusus akan menghasilkan zero data akibat kondisi state tab yang hardcoded.',
       rec: 'Bersihkan kondisi variabel tab dan aktifkan filter dinamis.'
     });
  }

  issues.forEach(iss => {
    findings.push({
      no: no++,
      location: `\`${btn.file}\` (baris ${btn.line})`,
      name: name.replace(/\n/g, '').trim(),
      severity: iss.severity,
      category: iss.category,
      desc: iss.desc,
      rec: iss.rec
    });
    
    if (iss.severity === 'Parah') stats.parah++;
    else if (iss.severity === 'Mayor') stats.mayor++;
    else if (iss.severity === 'Sedang') stats.sedang++;
    else if (iss.severity === 'Minor') stats.minor++;
  });
});

let markdown = `# Laporan Audit Eksekutif Frontend Zeinity

## 1. Ringkasan Eksekutif
Berdasarkan pemindaian menyeluruh di seluruh codebase frontend (*.tsx, *.ts, *.jsx, *.js, *.html, *.css, *.vue), berikut adalah temuan audit elemen tombol.

- **Total tombol yang ditemukan/diaudit:** ${stats.totalButtons} tombol
- **Jumlah temuan per kategori severity:**
  - **Parah:** ${stats.parah} temuan
  - **Mayor:** ${stats.mayor} temuan
  - **Sedang:** ${stats.sedang} temuan
  - **Minor:** ${stats.minor} temuan

## 2. Tabel Temuan

| No | Lokasi/Halaman | Nama/Selector Tombol | Severity | Kategori | Deskripsi Temuan | Rekomendasi |
|---|---|---|---|---|---|---|
`;

findings.forEach(f => {
  markdown += `| ${f.no} | ${f.location} | ${f.name} | ${f.severity} | ${f.category} | ${f.desc} | ${f.rec} |\n`;
});

markdown += `
## 3. Analisis Prioritas

- **Prioritas Tinggi** (harus segera diperbaiki)
  *Alasan:* Temuan dengan severity "Parah" melibatkan hilangnya data (penghapusan permanen tanpa konfirmasi). Ini adalah kerentanan fungsional fatal yang berpotensi merugikan pengguna. Selain itu, temuan "Mayor" terkait ketiadaan handler aksi harus diperbaiki agar fitur inti bisa berfungsi.
  
- **Prioritas Sedang**
  *Alasan:* Tombol yang tidak mendefinisikan \`type\` dapat memicu *submit* tak terduga dan mereload *state* aplikasi (*refresh*). Tombol-tombol dengan logika *Revert* yang tidak memperbarui *view state* membingungkan pengguna secara UX.
  
- **Prioritas Rendah**
  *Alasan:* Isu kosmetik seperti penggunaan atribut \`class\`, ketiadaan \`aria-label\`, elemen *zombie/placeholder*, dan *console.log* tidak menyebabkan kegagalan sistem, namun menumpuk *technical debt*. Perbaikan ini dapat dijadwalkan pada siklus optimasi akhir.

## 4. Rekomendasi Roadmap

Berdasarkan analisis, urutan pengerjaan (*roadmap*) yang disarankan beserta estimasi effortnya adalah:

1. **Prioritas Tinggi - Pencegahan Data Loss & Fungsionalitas Dasar (Estimasi: High)**
   - Perbaiki semua tombol hapus agar dibungkus oleh konfirmasi \`AlertModal\` (mis. Hapus Ide, Hapus File, Hapus Token).
   - Lengkapi tombol-tombol fungsional yang tidak memiliki aksi (tidak ada \`onClick\`).

2. **Prioritas Sedang - Stabilitas UI dan Navigasi (Estimasi: Medium)**
   - Tambahkan atribut \`type="button"\` pada seluruh tombol untuk mencegah *reload* halaman tak disengaja.
   - Perbaiki alur logika *revert state* agar UI selaras dengan basis data.
   - Perbaiki label "Import File" menjadi "Unggah Referensi" untuk mencegah ekspektasi keliru.

3. **Prioritas Rendah - Pembersihan Technical Debt (Estimasi: Low)**
   - Tambahkan label aksesibilitas (\`aria-label\`) pada tombol-tombol *icon*.
   - Hapus *console.log*, ganti atribut \`class\` dengan \`className\`.
   - Sembunyikan elemen UI fitur eksperimental (A/B testing) sampai *backend* siap.
`;

fs.writeFileSync('c:/Users/seink/Documents/antigravity/Zeinity Executive Report Web App/Laporan_Audit_Frontend_Final_Revised.md', markdown);
