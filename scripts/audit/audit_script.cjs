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
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src');
let output = '';
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('<button') || (line.includes('<a ') && line.includes('role="button"'))) {
      output += `\n--- ${f} : ${i+1} ---\n`;
      output += lines.slice(Math.max(0, i-1), i+3).join('\n') + '\n';
    }
  });
});
fs.writeFileSync('button_audit.txt', output);
