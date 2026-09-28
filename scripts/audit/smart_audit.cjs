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
let fileButtons = {};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  
  let inButton = false;
  let buttonCode = '';
  let buttonStartLine = 0;
  
  lines.forEach((line, i) => {
    // Basic heuristic for <button or <Button
    if (line.match(/<[bB]utton/)) {
      inButton = true;
      buttonStartLine = i + 1;
      buttonCode = line + '\n';
    } else if (inButton) {
      buttonCode += line + '\n';
    }
    
    if (inButton && line.match(/<\/[bB]utton>|\/>/)) {
      inButton = false;
      totalButtons++;
      
      // Analyze buttonCode
      let issues = [];
      const isSubmit = buttonCode.includes('type="submit"');
      const hasType = buttonCode.includes('type=');
      const hasOnClick = buttonCode.includes('onClick=');
      const hasClass = buttonCode.includes('className=');
      const hasOldClass = buttonCode.includes(' class=');
      const isIconOnly = !buttonCode.match(/>[^<a-zA-Z]*[a-zA-Z]+[^<]*<\//) && buttonCode.includes('<'); // very rough
      const hasAriaLabel = buttonCode.includes('aria-label=') || buttonCode.includes('title=');
      const hasConsoleLog = buttonCode.includes('console.log');
      const isEmptyOnClick = buttonCode.match(/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/);

      if (!hasType) {
        issues.push({
          severity: 'Sedang',
          category: 'Cacat',
          desc: 'Atribut type tidak ditentukan (berpotensi mereload halaman secara tak terduga)',
          rec: 'Tambahkan type="button" atau type="submit"'
        });
      }
      
      if (!hasOnClick && !isSubmit) {
        issues.push({
          severity: 'Mayor',
          category: 'Tidak Berfungsi',
          desc: 'Tombol tidak memiliki event onClick dan bukan type submit',
          rec: 'Tambahkan event handler onClick'
        });
      }
      
      if (isEmptyOnClick) {
        issues.push({
          severity: 'Mayor',
          category: 'Placeholder',
          desc: 'Fungsi onClick kosong (placeholder)',
          rec: 'Implementasikan fungsi yang sesuai'
        });
      }
      
      if (hasConsoleLog) {
        issues.push({
          severity: 'Minor',
          category: 'Placeholder',
          desc: 'Terdapat console.log pada event handler',
          rec: 'Hapus console.log dan implementasikan logika'
        });
      }
      
      if (hasOldClass) {
        issues.push({
          severity: 'Sedang',
          category: 'Inkonsisten',
          desc: 'Menggunakan atribut class, bukan className (React)',
          rec: 'Ubah class menjadi className'
        });
      }

      if (issues.length > 0) {
        // Extract text/name for the button if possible
        let nameMatch = buttonCode.match(/>([^<]{2,})<\//);
        let name = nameMatch ? nameMatch[1].trim() : 'Icon Button / Unnamed';
        if (name.length > 30) name = name.substring(0, 30) + '...';
        
        issues.forEach(issue => {
          findings.push({
            no: findings.length + 1,
            location: `${path.basename(f)}:${buttonStartLine}`,
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
