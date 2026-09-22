const fs = require('fs');
const html = fs.readFileSync('starfall-quiz.html', 'utf8');
const js = fs.readFileSync('game.js', 'utf8');

const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const jsIds = new Set();
while ((match = regex.exec(js)) !== null) {
  jsIds.add(match[1]);
}

console.log('Total unique getElementById in game.js:', jsIds.size);
const missing = [];
for (const id of jsIds) {
  const idRegex = new RegExp(`id=["']${id}["']`);
  if (!idRegex.test(html)) {
    missing.push(id);
  }
}

console.log('Missing IDs in starfall-quiz.html:');
missing.forEach(id => console.log(' -', id));
