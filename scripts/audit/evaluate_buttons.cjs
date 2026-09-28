const fs = require('fs');

const data = JSON.parse(fs.readFileSync('buttons_dump.json', 'utf8'));

let findings = [];
let no = 1;

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
     // Check if it's the specific filter button issue
     issues.push({
       severity: 'Minor',
       category: 'Inkonsisten',
       desc: 'Tombol berfungsi di halaman utama, namun jika ditekan dari dalam navigasi khusus akan menghasilkan zero data akibat kondisi state tab yang hardcoded.',
       rec: 'Bersihkan kondisi variabel tab dan aktifkan filter dinamis.'
     });
  }

  issues.forEach(iss => {
    findings.push({
      No: no++,
      'Lokasi/Halaman': `\`${btn.file}\` (baris ${btn.line})`,
      'Nama/Selector Tombol': name,
      Severity: iss.severity,
      Kategori: iss.category,
      'Deskripsi Temuan': iss.desc,
      Rekomendasi: iss.rec
    });
  });
});

console.log(JSON.stringify(findings, null, 2));
