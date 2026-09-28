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
    } else if (file.match(/\.(tsx|jsx)$/)) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src');
let allButtons = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const buttonRegex = /<button[\s\S]*?<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const linesBefore = content.substring(0, match.index).split('\n').length;
    allButtons.push({ file: path.basename(f), line: linesBefore, code: match[0] });
  }
});
console.log(`Found ${allButtons.length} buttons.`);
fs.writeFileSync('buttons_dump.json', JSON.stringify(allButtons, null, 2));
