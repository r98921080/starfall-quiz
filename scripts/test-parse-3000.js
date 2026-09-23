const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'data', 'default-question-bank.csv'), 'utf8');

function parseCSV(text) {
  if (!text) return [];
  const lines = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else { cell += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(cell.trim()); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some(x => x.length > 0)) lines.push(row);
        row = [];
      } else { cell += c; }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(x => x.length > 0)) lines.push(row);
  }
  if (lines.length < 2) return [];

  const headers = lines[0].map(h => h.toLowerCase());
  const idx = (name) => headers.indexOf(name);
  const qidIdx = idx('question_id');
  const gradeIdx = idx('grade');
  const qIdx = idx('question');
  const aIdx = idx('option_a');
  const bIdx = idx('option_b');
  const cIdx = idx('option_c');
  const dIdx = idx('option_d');
  const ansIdx = idx('answer');
  const expSIdx = idx('explanation_short');
  const expDIdx = idx('explanation_detail');
  const tipIdx = idx('memory_tip');
  const skillIdx = idx('skill');
  const subIdx = idx('subject');
  const diffIdx = idx('difficulty');

  const bank = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i];
    if (!r[qIdx]) continue;
    const opts = [r[aIdx], r[bIdx], r[cIdx], r[dIdx]].filter(Boolean);
    if (opts.length < 2) continue;
    let ansLetter = (r[ansIdx] || 'A').toUpperCase();
    let ansNum = 'ABCD'.indexOf(ansLetter);
    if (ansNum < 0) ansNum = 0;

    bank.push({
      question_id: r[qidIdx] || ('Q-' + i),
      grade: r[gradeIdx] || '',
      question: r[qIdx],
      opts: opts,
      ans: ansNum,
      subject: r[subIdx] || '國語文',
      skill: r[skillIdx] || '語文素養',
      difficulty: parseInt(r[diffIdx]) || 1,
      explanation_short: r[expSIdx] || '',
      explanation_detail: r[expDIdx] || '',
      memory_tip: r[tipIdx] || ''
    });
  }
  return bank;
}

const bank = parseCSV(content);
console.log('Parsed bank count:', bank.length);
console.log('First question:', bank[0]);
console.log('Last question (index ' + (bank.length - 1) + '):', bank[bank.length - 1]);
