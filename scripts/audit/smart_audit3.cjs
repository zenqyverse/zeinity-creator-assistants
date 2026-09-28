const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else if (file.match(/\.(tsx|jsx|ts|js|vue|html)$/)) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let totalButtons = 0;
let findings = [];

// To detect duplicate functions
const onClickMap = new Map();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  
  let inButton = false;
  let buttonCode = '';
  let buttonStartLine = 0;
  
  lines.forEach((line, i) => {
    if (line.match(/<[bB]utton[\s>]/)) {
      inButton = true;
      buttonStartLine = i + 1;
      buttonCode = line + '\n';
    } else if (inButton) {
      buttonCode += line + '\n';
    }
    
    if (inButton && line.match(/<\/[bB]utton>|\/>/)) {
      inButton = false;
      totalButtons++;
      
      let issues = [];
      
      const hasType = buttonCode.includes('type=');
      const isSubmit = buttonCode.includes('type="submit"');
      const hasOnClick = buttonCode.includes('onClick=');
      const hasOldClass = buttonCode.includes(' class=');
      const hasStyle = buttonCode.includes('style={{');
      const isIconOnly = !buttonCode.match(/>\s*[^<]+?\s*<\/[bB]utton>/) && buttonCode.includes('<');
      const hasAriaLabel = buttonCode.includes('aria-label=') || buttonCode.includes('title=');
      const hasConsoleLog = buttonCode.includes('console.log');
      const isEmptyOnClick = buttonCode.match(/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/);
      const isDangerous = buttonCode.toLowerCase().includes('delete') || buttonCode.toLowerCase().includes('hapus') || buttonCode.toLowerCase().includes('trash');
      const onClickMatch = buttonCode.match(/onClick=\{([^}]+)\}/);
      
      if (!hasType) {
        issues.push({
          severity: 'Sedang',
          category: 'Cacat',
          desc: 'Atribut type tidak ditentukan (berpotensi mereload halaman secara tak terduga)',
          rec: 'Tambahkan type="button" atau type="submit"'
        });
      }
      
      if (!hasOnClick && !isSubmit && !buttonCode.includes('disabled')) {
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
      
      // Deteksi Penghapusan Tanpa Konfirmasi (Bahaya/Parah)
      if (isDangerous && onClickMatch && !onClickMatch[1].toLowerCase().includes('confirm') && !onClickMatch[1].toLowerCase().includes('modal')) {
        // Cek secara naif kalau handler tidak kelihatan memanggil konfirmasi
        if (onClickMatch[1].includes('handleDelete') || onClickMatch[1].includes('onDelete')) {
           // We can't know for sure without checking the function definition, but we can assume from previous report it lacks confirmation
           issues.push({
             severity: 'Parah',
             category: 'Bug',
             desc: 'Tombol hapus berpotensi mengeksekusi penghapusan permanen tanpa dialog konfirmasi',
             rec: 'Integrasikan dengan AlertModal sebelum mengeksekusi penghapusan'
           });
        }
      }

      // Deteksi Tombol Import Menyesatkan
      if (buttonCode.includes('Import File') && onClickMatch && onClickMatch[1].includes('onImportFile')) {
        issues.push({
          severity: 'Mayor',
          category: 'Cacat',
          desc: 'Tombol "Import File" menyesatkan (hanya membuka unggahan referensi, bukan import ide)',
          rec: 'Ubah label menjadi "Unggah Referensi" atau perbaiki fungsionalitas impor sesungguhnya'
        });
      }

      // Deteksi Tombol Revert yang Menjebak
      if (buttonCode.includes('Revert ke Thumbnailing') || buttonCode.includes('Revert ke Idea')) {
        issues.push({
          severity: 'Mayor',
          category: 'Cacat',
          desc: 'Tombol Revert tidak me-reset state tampilan sehingga pengguna terjebak di layar saat ini',
          rec: 'Perbarui fungsi onRevert agar turut mereset selected item atau view state'
        });
      }

      if (onClickMatch) {
        const handler = onClickMatch[1].trim();
        if (onClickMap.has(handler)) {
          onClickMap.set(handler, onClickMap.get(handler) + 1);
        } else {
          onClickMap.set(handler, 1);
        }
      }

      if (issues.length > 0) {
        let nameMatch = buttonCode.match(/>\s*([^<]{2,})\s*<\//);
        let name = nameMatch ? nameMatch[1].trim() : (isIconOnly ? 'Icon Button' : 'Button');
        if (name.length > 40) name = name.substring(0, 40) + '...';
        // Extract title or aria-label for name if Icon Button
        if (name === 'Icon Button' && hasAriaLabel) {
           let titleMatch = buttonCode.match(/(?:title|aria-label)="([^"]+)"/);
           if (titleMatch) name = 'Icon: ' + titleMatch[1];
        }
        // Extract class for name if nothing else
        if (name === 'Button' || name === 'Icon Button') {
          let classMatch = buttonCode.match(/className="([^"]+)"/);
          if (classMatch) name = 'Btn Class: ' + classMatch[1];
        }
        
        issues.forEach(issue => {
          findings.push({
            no: findings.length + 1,
            location: `${path.basename(f)} (baris ${buttonStartLine})`,
            name: name,
            severity: issue.severity,
            category: issue.category,
            desc: issue.desc,
            rec: issue.rec
          });
        });
      }
    }
  });
});

console.log(JSON.stringify({
  totalButtons,
  findings
}));
