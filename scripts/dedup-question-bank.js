const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'data', 'default-question-bank.csv');
const text = fs.readFileSync(csvPath, 'utf8');

function parseCSV(csv) {
  const lines = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (inQuotes) {
      if (c === '"') {
        if (csv[i+1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else { cell += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell.trim()); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && csv[i+1] === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some(x => x.length > 0)) lines.push(row);
        row = [];
      } else { cell += c; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell.trim()); if (row.some(x => x.length > 0)) lines.push(row); }
  return lines;
}

const rows = parseCSV(text);
const header = rows[0];
const dataRows = rows.slice(1);

const qIdx = header.indexOf('question');
const ansIdx = header.indexOf('answer');
const qidIdx = header.indexOf('question_id');
const aIdx = header.indexOf('option_a');
const bIdx = header.indexOf('option_b');
const cIdx = header.indexOf('option_c');
const dIdx = header.indexOf('option_d');

function getFp(t) {
  return String(t || '').trim().replace(/[\s\r\n\t]/g, '').replace(/[「」『』""''，。、？！：；,.?!:;]/g, '').toLowerCase();
}
function getCorrectText(r) {
  const ansLetter = (r[ansIdx] || 'A').toUpperCase().trim();
  const map = { A: aIdx, B: bIdx, C: cIdx, D: dIdx };
  return r[map[ansLetter] || aIdx] || '';
}

// 1. Group by (question fp + answer text fp)
const dupMap = new Map();
dataRows.forEach(r => {
  const qFp = getFp(r[qIdx]);
  const ansTextFp = getFp(getCorrectText(r));
  const key = `${qFp}:::${ansTextFp}`;
  if (!dupMap.has(key)) dupMap.set(key, []);
  dupMap.get(key).push(r);
});

let deletedA = 0;
let deletedNonA = 0;
const retainedRows = [];
const pureAGroups = [];

dupMap.forEach((list, key) => {
  const nonA = list.filter(r => (r[ansIdx] || '').toUpperCase().trim() !== 'A');
  const onlyA = list.filter(r => (r[ansIdx] || '').toUpperCase().trim() === 'A');

  if (nonA.length > 0) {
    // Keep first non-A, delete all A copies (priority deleting A) and any other non-A copies
    const chosen = [...nonA[0]];
    deletedA += onlyA.length;
    deletedNonA += (nonA.length - 1);
    retainedRows.push(chosen);
  } else {
    // Only A copies exist
    const chosen = [...onlyA[0]];
    deletedA += (onlyA.length - 1);
    pureAGroups.push(chosen);
  }
});

// Count answers currently in retainedRows:
const currentAnsCounts = { A: 0, B: 0, C: 0, D: 0 };
retainedRows.forEach(r => {
  const a = (r[ansIdx] || 'A').toUpperCase().trim();
  currentAnsCounts[a] = (currentAnsCounts[a] || 0) + 1;
});

// Target ~25% distribution across A, B, C, D
const target = { A: 39, B: 39, C: 40, D: 39 };
const needed = {
  A: Math.max(0, target.A - currentAnsCounts.A),
  B: Math.max(0, target.B - currentAnsCounts.B),
  C: Math.max(0, target.C - currentAnsCounts.C),
  D: Math.max(0, target.D - currentAnsCounts.D)
};

function rotateOptions(row, targetLetter) {
  const newRow = [...row];
  const origOpts = [row[aIdx], row[bIdx], row[cIdx], row[dIdx]];
  const origAnsLetter = (row[ansIdx] || 'A').toUpperCase().trim();
  const origAnsIdx = { A: 0, B: 1, C: 2, D: 3 }[origAnsLetter] || 0;
  const targetAnsIdx = { A: 0, B: 1, C: 2, D: 3 }[targetLetter] || 0;

  if (origAnsIdx === targetAnsIdx) {
    newRow[ansIdx] = targetLetter;
    return newRow;
  }

  const shift = (targetAnsIdx - origAnsIdx + 4) % 4;
  const newOpts = new Array(4);
  for (let i = 0; i < 4; i++) {
    newOpts[(i + shift) % 4] = origOpts[i];
  }

  newRow[aIdx] = newOpts[0];
  newRow[bIdx] = newOpts[1];
  newRow[cIdx] = newOpts[2];
  newRow[dIdx] = newOpts[3];
  newRow[ansIdx] = targetLetter;
  return newRow;
}

let allocatedA = 0, allocatedB = 0, allocatedC = 0, allocatedD = 0;

pureAGroups.forEach((r) => {
  let targetLetter = 'A';
  if (allocatedB < needed.B) {
    targetLetter = 'B';
    allocatedB++;
  } else if (allocatedC < needed.C) {
    targetLetter = 'C';
    allocatedC++;
  } else if (allocatedD < needed.D) {
    targetLetter = 'D';
    allocatedD++;
  } else {
    targetLetter = 'A';
    allocatedA++;
  }
  const rotated = rotateOptions(r, targetLetter);

  // Verification: ensure the correct text is exactly preserved
  const origCorrect = getCorrectText(r);
  const newCorrect = getCorrectText(rotated);
  if (origCorrect !== newCorrect) {
    throw new Error(`Integrity error for ${r[qidIdx]}: "${origCorrect}" !== "${newCorrect}"`);
  }

  retainedRows.push(rotated);
});

// Sort by question_id or original order
retainedRows.sort((a, b) => (a[qidIdx] || '').localeCompare(b[qidIdx] || ''));

// Final tally
const finalAnsCounts = { A: 0, B: 0, C: 0, D: 0 };
retainedRows.forEach(r => {
  const a = (r[ansIdx] || 'A').toUpperCase().trim();
  finalAnsCounts[a] = (finalAnsCounts[a] || 0) + 1;
});

function toCSV(headers, data) {
  function formatCell(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
  const lines = [];
  lines.push(headers.map(formatCell).join(','));
  for (const r of data) {
    lines.push(r.map(formatCell).join(','));
  }
  return lines.join('\n');
}

const newCsvContent = toCSV(header, retainedRows);

// Save clean CSV
fs.writeFileSync(csvPath, newCsvContent, 'utf8');

const report = {
  totalOriginal: dataRows.length,
  totalDeleted: deletedA + deletedNonA,
  deletedAnswerA: deletedA,
  deletedAnswerOther: deletedNonA,
  totalRetained: retainedRows.length,
  finalDistribution: finalAnsCounts
};

console.log('CLEANING SUCCESSFUL!');
console.log(JSON.stringify(report, null, 2));
