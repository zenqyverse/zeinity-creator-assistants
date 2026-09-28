const fs = require('fs');
const file = 'src/views/ScriptDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\s*onDoubleClick=\{[^}]+\}/g, '');
content = content.replace(/\s*title=\{is[^?]+\? 'Klik 2x[^:]+:\s*'Klik 2x[^}]+\}/g, '');
content = content.replace(/title="Klik 2x[^"]+"/g, '');
content = content.replace(/Ringkas • Klik 2x/g, 'Ringkas');
content = content.replace(/Klik 2x atau tombol Buka untuk memperluas/g, 'Telah diringkas');

fs.writeFileSync(file, content);
