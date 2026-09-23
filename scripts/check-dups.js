const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '..', 'data', 'default-question-bank.csv'), 'utf8');

const parseScript = require('./test-parse-3000.js');
// Let's inspect duplicate question texts in the 3000 questions:
const lines = content.split('\n').filter(Boolean);
console.log('Total lines:', lines.length);

const qMap = new Map();
const duplicates = [];

// Simple CSV parser for questions
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  // extract question_id (col 0) and question (col 8)
  const parts = line.split(',');
  const qid = parts[0];
  const qtext = line;
  if (qMap.has(qid)) {
    duplicates.push({ qid, line: i + 1 });
  } else {
    qMap.set(qid, i + 1);
  }
}
console.log('Duplicate IDs:', duplicates.length);
