const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== BUILD-045 Verification: Attempts Sheet Rich Logging (Stem, Formatted Chosen & Correct Answers) ===\n');

const codeGs = fs.readFileSync('apps-script/Code.gs', 'utf8');
const gameJs = fs.readFileSync('game.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const starfallHtml = fs.readFileSync('starfall-quiz.html', 'utf8');

// =========================================================================
// 1. Static Configuration & Regex Checks
// =========================================================================
console.log('--- 1. Testing Static Configurations & Function Declarations ---');
assert(/version: '1\.4\.[56]'/.test(codeGs), 'API version in Code.gs must be 1.4.5+');
assert(codeGs.includes('formatOptionWithIndex_'), 'Code.gs must implement formatOptionWithIndex_');
assert(codeGs.includes('ensureAttemptsHeaders_'), 'Code.gs must implement ensureAttemptsHeaders_');
assert(codeGs.includes('simplifyAttemptsColumns_'), 'Code.gs must implement simplifyAttemptsColumns_');

// Attempts 10 headers check
const expectedAttemptsHeaders = [
  '時間', '學號', '姓名', '關卡', '題號', '題目', '選擇的答案', '正確答案', '是否答對', '作答秒數'
];
expectedAttemptsHeaders.forEach(h => {
  assert(codeGs.includes(`'${h}'`), `Code.gs REQUIRED_HEADERS.Attempts must include header '${h}'`);
});

// Cache busters
assert(/game\.js\?v=b(4[6-9]|[5-9]\d)/.test(indexHtml), 'index.html must use game.js?v=b46 or newer');
assert(/game\.js\?v=b(4[6-9]|[5-9]\d)/.test(starfallHtml), 'starfall-quiz.html must use game.js?v=b46 or newer');
console.log('  ✅ Static signatures, 10 standard column headers and cache busters verified!');

// =========================================================================
// 2. Unit Testing formatOptionWithIndex_ in Code.gs
// =========================================================================
console.log('\n--- 2. Testing formatOptionWithIndex_ Option Formatting in Code.gs ---');

const extractFormatFn = new Function(codeGs.slice(
  codeGs.indexOf('function formatOptionWithIndex_('),
  codeGs.indexOf('function parseQuestionRow_(')
) + '\nreturn formatOptionWithIndex_;');
const formatOptionWithIndex = extractFormatFn();

const formatCases = [
  { idx: 0, text: '緣木求魚', expected: '1：緣木求魚' },
  { idx: 0, text: '1. 緣木求魚', expected: '1：緣木求魚' },
  { idx: 0, text: '(1) 緣木求魚', expected: '1：緣木求魚' },
  { idx: 0, text: '（一）緣木求魚', expected: '1：緣木求魚' },
  { idx: 0, text: 'A. 緣木求魚', expected: '1：緣木求魚' },
  { idx: 0, text: '1：緣木求魚', expected: '1：緣木求魚' },
  { idx: 2, text: '目無全牛', expected: '3：目無全牛' },
  { idx: 2, text: '3. 目無全牛', expected: '3：目無全牛' },
  { idx: 2, text: '3：目無全牛', expected: '3：目無全牛' },
  { idx: 2, text: '(C) 目無全牛', expected: '3：目無全牛' },
  { idx: 3, text: '【4】鋌而走險', expected: '4：鋌而走險' },
  { idx: 1, text: '② 臥薪嚐膽', expected: '2：臥薪嚐膽' }
];

formatCases.forEach(({ idx, text, expected }) => {
  const actual = formatOptionWithIndex(idx, text);
  assert.strictEqual(actual, expected, `formatOptionWithIndex_(${idx}, "${text}") returned "${actual}", expected "${expected}"`);
});
console.log(`  ✅ All ${formatCases.length} format cases passed: automatically cleans duplicate prefixes and outputs clean '序號：選項文字'!`);

// =========================================================================
// 3. Testing game.js Attempt Formatting and Payload Construction
// =========================================================================
console.log('\n--- 3. Testing game.js Attempt Construction & Payload ---');

assert(gameJs.includes('selectedOptionFormatted'), 'game.js handleAnswer must compute selectedOptionFormatted');
assert(gameJs.includes('correctAnswerFormatted'), 'game.js handleAnswer must compute correctAnswerFormatted');
assert(gameJs.includes('correct_answer: correctAnswerFormatted'), 'game.js handleAnswer must pass correct_answer to recordAttempt');
assert(gameJs.includes("correct_answer: attempt.correct_answer || corAns || ''"), 'game.js recordAttempt must include correct_answer in postPayload and GET params');
assert(gameJs.includes("question: qText"), 'game.js recordAttempt must include question stem in postPayload and GET params');
console.log('  ✅ game.js includes question, formatted selected_option, and correct_answer in all transmission paths!');

// =========================================================================
// 4. End-to-End VM Simulation of Code.gs 10-Column Attempt Recording & Auto-Upgrade
// =========================================================================
console.log('\n--- 4. VM Simulation: 10-Column Recording, Auto-Upgrade & Retroactive Backfill ---');

class MockRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  setValues(vals) {
    for (let r = 0; r < vals.length; r++) {
      const targetR = this.row - 1 + r;
      if (!this.sheet.data[targetR]) this.sheet.data[targetR] = [];
      for (let c = 0; c < vals[r].length; c++) {
        this.sheet.data[targetR][this.col - 1 + c] = vals[r][c];
      }
    }
    return this;
  }
  getValues() {
    const res = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowArr = [];
      const srcRow = this.sheet.data[this.row - 1 + r] || [];
      for (let c = 0; c < this.numCols; c++) {
        rowArr.push(srcRow[this.col - 1 + c] !== undefined ? srcRow[this.col - 1 + c] : '');
      }
      res.push(rowArr);
    }
    return res;
  }
  setBackground() { return this; }
  setFontColor() { return this; }
  setFontWeight() { return this; }
  setHorizontalAlignment() { return this; }
  setNumberFormat() { return this; }
}

class MockSheet {
  constructor(name, initialData = []) {
    this.name = name;
    this.data = JSON.parse(JSON.stringify(initialData));
  }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  getLastRow() { return this.data.length; }
  getLastColumn() {
    return this.data.reduce((max, r) => Math.max(max, r ? r.length : 0), 0);
  }
  getMaxColumns() { return Math.max(this.getLastColumn(), 10); }
  getMaxRows() { return Math.max(this.data.length, 100); }
  insertRowsAfter() {}
  getDataRange() {
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }
  getRange(r, c, nr, nc) {
    const sheet = this;
    let rowIdx = 0;
    let colIdx = 0;
    if (typeof r === 'string') {
      const match = r.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i);
      if (match) {
        colIdx = match[1].toUpperCase().charCodeAt(0) - 65;
        rowIdx = parseInt(match[2], 10) - 1;
      }
    } else {
      rowIdx = (r - 1);
      colIdx = (c - 1);
    }
    return {
      getValues() {
        const res = [];
        for (let i = 0; i < (nr || 1); i++) {
          const ri = rowIdx + i;
          const rArr = sheet.data[ri] || [];
          res.push(rArr.slice(colIdx, colIdx + (nc || 1)));
        }
        return res;
      },
      setValues(vals) {
        for (let i = 0; i < vals.length; i++) {
          const ri = rowIdx + i;
          while (sheet.data.length <= ri) sheet.data.push([]);
          for (let j = 0; j < vals[i].length; j++) {
            const ci = colIdx + j;
            sheet.data[ri][ci] = vals[i][j];
          }
        }
        return this;
      },
      setValue(v) {
        while (sheet.data.length <= rowIdx) sheet.data.push([]);
        sheet.data[rowIdx][colIdx] = v;
        return this;
      },
      setBackground() { return this; },
      setFontColor() { return this; },
      setFontWeight() { return this; },
      setFontSize() { return this; },
      setHorizontalAlignment() { return this; },
      setNumberFormat() { return this; }
    };
  }
  appendRow(rowArr) {
    this.data.push([...rowArr]);
  }
  clear() { this.data = []; }
  clearContents() { this.data = []; }
  clearFormats() {}
  insertColumnsAfter() {}
  deleteColumns() {}
  setFrozenRows() {}
  autoResizeColumns() {}
}

class MockSpreadsheet {
  constructor(sheets = []) {
    this.sheets = sheets;
  }
  getSheets() { return this.sheets; }
  getSheetByName(name) {
    return this.sheets.find(s => s.getName().toLowerCase() === name.toLowerCase()) || null;
  }
  insertSheet(name) {
    const s = new MockSheet(name);
    this.sheets.push(s);
    return s;
  }
  deleteSheet(s) {
    const idx = this.sheets.indexOf(s);
    if (idx !== -1) this.sheets.splice(idx, 1);
  }
  setActiveSheet() {}
  moveActiveSheet() {}
}

const mockSs = new MockSpreadsheet([
  new MockSheet('Questions', [
    ['題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'],
    ['Q01', '下列何者形容技藝純熟精湛？', '緣木求魚', '臥薪嚐膽', '目無全牛', '鋌而走險', '3', '目無全牛比喻技藝熟練到了純熟的地步']
  ]),
  // 模擬舊版 8 欄 Attempts 工作表
  new MockSheet('Attempts', [
    ['時間', '學號', '姓名', '關卡', '題號', '學生選擇', '是否答對', '作答秒數'],
    ['2026/10/01 10:00:00', 'S0001', '王小明', 1, 'Q01', '3', 'TRUE', '2.5']
  ])
]);

const sandbox = {
  console: console,
  Utilities: {
    getUuid: () => 'uuid-' + Math.random().toString(36).slice(2, 8),
    formatDate: (d) => '2026/10/02 15:30:00'
  },
  Session: {
    getScriptTimeZone: () => 'Asia/Taipei'
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => mockSs,
    getUi: () => ({
      createMenu: () => ({ addItem: function() { return this; }, addToUi: () => {} }),
      alert: () => {}
    })
  }
};
vm.createContext(sandbox);
vm.runInContext(codeGs, sandbox);

// Test 4a: ensureAttemptsHeaders_ triggers simplifyAttemptsColumns_ to upgrade 8 cols -> 10 cols
console.log('--- 4a: Testing Auto-Upgrade from 8 cols to 10 cols with retroactive enrichment ---');
const attemptsSheet = mockSs.getSheetByName('Attempts');
sandbox.ensureAttemptsHeaders_(attemptsSheet, mockSs);

assert.deepStrictEqual(attemptsSheet.data[0], expectedAttemptsHeaders, 'Headers must be updated to 10 standard columns');
console.log('  Updated headers:', attemptsSheet.data[0]);

// Verify the historical row was retroactively backfilled!
const historicalRow = attemptsSheet.data[1];
console.log('  Retroactively backfilled historical row:', historicalRow);
assert.strictEqual(historicalRow[1], 'S0001', 'Student ID must be preserved');
assert.strictEqual(historicalRow[4], 'Q01', 'Question ID must be preserved');
assert.strictEqual(historicalRow[5], '下列何者形容技藝純熟精湛？', 'Stem must be retroactively backfilled from Questions');
assert.strictEqual(historicalRow[6], '3：目無全牛', 'Chosen answer must be formatted as 3：目無全牛');
assert.strictEqual(historicalRow[7], '3：目無全牛', 'Correct answer must be backfilled as 3：目無全牛');
assert.strictEqual(historicalRow[8], 'TRUE', 'Correct must be preserved');
assert.strictEqual(Number(historicalRow[9]), 2.5, 'Time must be preserved');
console.log('  ✅ Existing historical attempt row was successfully backfilled with question stem, chosen answer text, and correct answer text!');

// Test 4b: Record a new attempt with rich fields (e.g. chosen = 1：緣木求魚, wrong)
console.log('\n--- 4b: Recording New Attempt with 10 Columns ---');
const recordRes = sandbox.recordAttempt_({
  student_id: 'S0002',
  student_name: '李小華',
  stage: 1,
  question_id: 'Q01',
  question: '下列何者形容技藝純熟精湛？',
  selected_option: '1：緣木求魚',
  correct_answer: '3：目無全牛',
  correct: false,
  response_time_ms: 3800
});

assert(recordRes.ok, 'recordAttempt_ must succeed');
assert.strictEqual(attemptsSheet.data.length, 3, 'Attempts sheet must now have 3 rows (header + 2 attempts)');
const newRow = attemptsSheet.data[2];
console.log('  New recorded row:', newRow);
assert.strictEqual(newRow[1], 'S0002');
assert.strictEqual(newRow[2], '李小華');
assert.strictEqual(newRow[3], 1);
assert.strictEqual(newRow[4], 'Q01');
assert.strictEqual(newRow[5], '下列何者形容技藝純熟精湛？', 'Question column must contain stem');
assert.strictEqual(newRow[6], '1：緣木求魚', 'Chosen answer must be 1：緣木求魚');
assert.strictEqual(newRow[7], '3：目無全牛', 'Correct answer must be 3：目無全牛');
assert.strictEqual(newRow[8], 'FALSE', 'Correct must be FALSE');
assert.strictEqual(newRow[9], '3.8', 'Seconds must be 3.8');
console.log('  ✅ New attempt successfully written with all 10 columns intact!');

// Test 4c: Record an attempt where client sends raw option number '1' without colon
console.log('\n--- 4c: Recording Attempt where Client sends Raw Option "1" ---');
const rawRecordRes = sandbox.recordAttempt_({
  student_id: 'S0003',
  student_name: '張大同',
  stage: 1,
  question_id: 'Q01',
  selected_option: '1',
  correct: false,
  response_time_ms: 1200
});
assert(rawRecordRes.ok, 'recordAttempt_ must succeed');
const rawRow = attemptsSheet.data[3];
console.log('  Raw recorded row:', rawRow);
assert.strictEqual(rawRow[5], '下列何者形容技藝純熟精湛？', 'Stem must be looked up from Questions sheet');
assert.strictEqual(rawRow[6], '1：緣木求魚', 'Raw selected option 1 must be auto-formatted to 1：緣木求魚');
assert.strictEqual(rawRow[7], '3：目無全牛', 'Correct answer must be auto-formatted to 3：目無全牛');
console.log('  ✅ Server-side auto-enrichment successfully translated raw option "1" into "1：緣木求魚" and filled correct answer "3：目無全牛"!');

console.log('\n🎉 ALL BUILD-045 TESTS PASSED SUCCESSFULLY! 🎉');
