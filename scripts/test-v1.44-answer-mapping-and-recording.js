const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== BUILD-044 Verification: 1-4 vs ABCD Answer Mapping & 3-Sheet Recording Bugfix ===\n');

const codeGs = fs.readFileSync('apps-script/Code.gs', 'utf8');
const gameJs = fs.readFileSync('game.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// =========================================================================
// 1. Static Configuration & Regex Checks
// =========================================================================
console.log('--- 1. Testing Static Configurations & Function Declarations ---');
assert(codeGs.includes("version: '1.4.4'") || codeGs.includes("version: '1.4.5'"), 'API version in Code.gs must be 1.4.4+');
assert(codeGs.includes('function normalizeAnswerToIndex_'), 'Code.gs must implement normalizeAnswerToIndex_');
assert(gameJs.includes('function normalizeAnswerToIndex'), 'game.js must implement normalizeAnswerToIndex');
assert(codeGs.includes('getOrCreateAttemptsSheet_'), 'Code.gs must implement getOrCreateAttemptsSheet_');
assert(codeGs.includes('getAttemptsSheet_'), 'Code.gs must implement getAttemptsSheet_');
assert(codeGs.includes('getQuestionsSheet_'), 'Code.gs must implement getQuestionsSheet_');
assert(!gameJs.includes('<span class="opt-key">'), 'Quiz option buttons must not show opt-key badge (ABCD or 1234)');
assert(gameJs.includes('btn.innerHTML = `<span>${cleanText || optText}</span>`;'), 'Quiz option buttons must cleanly display option text without ABCD/1234');
assert(gameJs.includes("e.key === '1' || e.key === 'a'"), 'game.js keyboard listener must accept keys 1~4 and A~D');
console.log('  ✅ Static signatures and clean UI templates verified!');

// =========================================================================
// 2. Testing Answer Normalization in Code.gs and game.js (VM Execution)
// =========================================================================
console.log('\n--- 2. Testing normalizeAnswerToIndex Logic Across All Variations ---');

// Extract normalizeAnswerToIndex from game.js
const extractGameFn = new Function(gameJs.slice(
  gameJs.indexOf('function normalizeAnswerToIndex('),
  gameJs.indexOf('class DataStore')
) + '\nreturn normalizeAnswerToIndex;');
const normalizeAnswerGame = extractGameFn();

// Extract normalizeAnswerToIndex_ from Code.gs
const extractCodeFn = new Function(codeGs.slice(
  codeGs.indexOf('function normalizeAnswerToIndex_('),
  codeGs.indexOf('function parseQuestionRow_(')
) + '\nreturn normalizeAnswerToIndex_;');
const normalizeAnswerCode = extractCodeFn();

const testCases = [
  // [rawAns, opts, expectedIndex, label]
  ['1', ['甲', '乙', '丙', '丁'], 0, 'Standard 1'],
  ['2', ['甲', '乙', '丙', '丁'], 1, 'Standard 2'],
  ['3', ['甲', '乙', '丙', '丁'], 2, 'Standard 3'],
  ['4', ['甲', '乙', '丙', '丁'], 3, 'Standard 4'],
  ['A', ['甲', '乙', '丙', '丁'], 0, 'Standard A'],
  ['B', ['甲', '乙', '丙', '丁'], 1, 'Standard B'],
  ['c', ['甲', '乙', '丙', '丁'], 2, 'Lowercase c'],
  ['D', ['甲', '乙', '丙', '丁'], 3, 'Standard D'],
  ['①', ['甲', '乙', '丙', '丁'], 0, 'Circled ①'],
  ['②', ['甲', '乙', '丙', '丁'], 1, 'Circled ②'],
  ['③', ['甲', '乙', '丙', '丁'], 2, 'Circled ③'],
  ['④', ['甲', '乙', '丙', '丁'], 3, 'Circled ④'],
  ['(1)', ['甲', '乙', '丙', '丁'], 0, 'Parenthesized (1)'],
  ['(2)', ['甲', '乙', '丙', '丁'], 1, 'Parenthesized (2)'],
  ['（３）', ['甲', '乙', '丙', '丁'], 2, 'Full-width parenthesized （３）'],
  ['（４）', ['甲', '乙', '丙', '丁'], 3, 'Full-width parenthesized （４）'],
  ['１', ['甲', '乙', '丙', '丁'], 0, 'Full-width １'],
  ['２', ['甲', '乙', '丙', '丁'], 1, 'Full-width ２'],
  ['３', ['甲', '乙', '丙', '丁'], 2, 'Full-width ３'],
  ['４', ['甲', '乙', '丙', '丁'], 3, 'Full-width ４'],
  ['一', ['甲', '乙', '丙', '丁'], 0, 'Chinese numeral 一'],
  ['二', ['甲', '乙', '丙', '丁'], 1, 'Chinese numeral 二'],
  ['三', ['甲', '乙', '丙', '丁'], 2, 'Chinese numeral 三'],
  ['四', ['甲', '乙', '丙', '丁'], 3, 'Chinese numeral 四'],
  ['1.', ['甲', '乙', '丙', '丁'], 0, 'Dotted 1.'],
  ['2、', ['甲', '乙', '丙', '丁'], 1, 'Pause 2、'],
  ['選項 3', ['甲', '乙', '丙', '丁'], 2, 'Prefix 選項 3'],
  ['Option D', ['甲', '乙', '丙', '丁'], 3, 'Prefix Option D'],
  // Option text matching
  ['光合作用', ['蒸散作用', '呼吸作用', '光合作用', '發酵作用'], 2, 'Literal text matching'],
  ['光合作用', ['1. 蒸散作用', '2. 呼吸作用', '3. 光合作用', '4. 發酵作用'], 2, 'Text matching with numbered option prefixes'],
  ['(3) 光合作用', ['蒸散作用', '呼吸作用', '光合作用', '發酵作用'], 2, 'Answer has prefix, option has clean text'],
  ['呼吸作用', ['(A) 蒸散作用', '(B) 呼吸作用', '(C) 光合作用', '(D) 發酵作用'], 1, 'Letter prefix stripping']
];

testCases.forEach(([rawAns, opts, expected, label]) => {
  const resGame = normalizeAnswerGame(rawAns, opts);
  const resCode = normalizeAnswerCode(rawAns, opts);
  assert.strictEqual(resGame, expected, `game.js failed on ${label}: got ${resGame}, expected ${expected}`);
  assert.strictEqual(resCode, expected, `Code.gs failed on ${label}: got ${resCode}, expected ${expected}`);
});
console.log(`  ✅ All ${testCases.length} answer format variations successfully mapped to correct indices in both game.js and Code.gs!`);

// =========================================================================
// 3. Testing CSV Parsing with 1~4 Option Column Headers in game.js
// =========================================================================
console.log('\n--- 3. Testing CSV Parsing with "1, 2, 3, 4" Column Headers in game.js ---');

const mockCsvWithNumericHeaders = [
  '題號,題目,1,2,3,4,答案,答案說明',
  'Q01,地球最大的天然衛星是什麼？,木衛三,月球,泰坦,歐羅巴,2,月球是地球唯一的天然衛星。',
  'Q02,太陽系中心的天體是？,地球,火星,太陽,金星,3,太陽為太陽系的中心恆星。',
  'Q03,哪一種氣體佔大氣層比例最高？,氮氣,氧氣,二氧化碳,氫氣,1,氮氣約佔 78%。',
  'Q04,水的化學式是？,CO2,NaCl,CH4,H2O,4,水由氫與氧組成。'
].join('\n');

const mockDataStore = {
  parseCSV: (new Function('normalizeAnswerToIndex', gameJs.slice(
    gameJs.indexOf('parseCSV(text) {'),
    gameJs.indexOf('isGradeMatch(qGrade, sGrade) {')
  ).replace('parseCSV(text) {', 'return function parseCSV(text) {') + ';'))(normalizeAnswerGame)
};

const parsedBank = mockDataStore.parseCSV(mockCsvWithNumericHeaders);
assert.strictEqual(parsedBank.length, 4, 'Should parse 4 questions');
assert.strictEqual(parsedBank[0].opts[1], '月球', 'Col 2 should map to Option 2');
assert.strictEqual(parsedBank[0].ans, 1, 'Answer "2" should map to index 1 (B)');
assert.strictEqual(parsedBank[0].answer, 'B', 'Answer display letter should be B');
assert.strictEqual(parsedBank[1].ans, 2, 'Answer "3" should map to index 2 (C)');
assert.strictEqual(parsedBank[2].ans, 0, 'Answer "1" should map to index 0 (A)');
assert.strictEqual(parsedBank[3].ans, 3, 'Answer "4" should map to index 3 (D)');
console.log('  ✅ parseCSV correctly mapped headers named "1, 2, 3, 4" to options and answer numbers 1~4!');

// =========================================================================
// 4. Testing Apps Script Attempt Recording & 3-Sheet Persistence (VM)
// =========================================================================
console.log('\n--- 4. Testing Apps Script Recording with Sheet Renaming & Auto-Creation ---');

class MockSheet {
  constructor(name, data) {
    this.name = name;
    this.data = data || [];
  }
  getName() { return this.name; }
  setName(n) { this.name = n; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data[0] ? this.data[0].length : 0; }
  getMaxRows() { return Math.max(10, this.data.length); }
  getMaxColumns() { return Math.max(8, this.data[0] ? this.data[0].length : 8); }
  getDataRange() {
    const d = this.data;
    return { getValues: () => d };
  }
  clear() { this.data = []; }
  clearContents() { this.data = []; }
  clearFormats() {}
  insertColumnsAfter() {}
  deleteColumns(start, count) {
    this.data = this.data.map(row => row.slice(0, start - 1));
  }
  insertRowsAfter() {}
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
      },
      setValue(v) {
        while (sheet.data.length <= rowIdx) sheet.data.push([]);
        sheet.data[rowIdx][colIdx] = v;
      },
      setBackground() { return this; },
      setFontColor() { return this; },
      setFontWeight() { return this; },
      setFontSize() { return this; },
      setHorizontalAlignment() { return this; },
      setNumberFormat() { return this; }
    };
  }
  setFrozenRows() {}
  autoResizeColumns() {}
  appendRow(row) { this.data.push(row); }
}

class MockSpreadsheet {
  constructor(sheets) {
    this.sheets = sheets || [];
  }
  getSheets() { return this.sheets; }
  getSheetByName(name) {
    return this.sheets.find(s => s.getName() === name) || null;
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
    ['Q01', '太陽是什麼？', '行星', '恆星', '彗星', '衛星', '2', '太陽是恆星']
  ]),
  // User sheet named '作答紀錄' instead of 'Attempts'
  new MockSheet('作答紀錄', [
    ['時間', '學號', '姓名', '關卡', '題號', '學生選擇', '是否答對', '作答秒數']
  ])
]);

const sandbox = {
  console: console,
  Utilities: {
    getUuid: () => 'uuid-' + Math.random().toString(36).slice(2, 8),
    formatDate: (d) => '2026/10/02 14:00:00'
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

// Test 4a: Check getAttemptsSheet_ finds '作答紀錄'
const attemptsSheet = sandbox.getAttemptsSheet_(mockSs);
assert(attemptsSheet !== null, 'getAttemptsSheet_ must find Chinese tab "作答紀錄"');
assert.strictEqual(attemptsSheet.getName(), '作答紀錄');
console.log('  ✅ getAttemptsSheet_ successfully recognized tab named "作答紀錄"!');

// Test 4b: Record attempt with answer formatted as "2 (B)" and check 8-col recording
const recordRes = sandbox.recordAttempt_({
  student_id: 'S001',
  student_name: '林小明',
  student_grade: '三年級',
  stage: 1,
  question_id: 'Q01',
  selected_option: '2 (B)',
  correct: true,
  response_time_ms: 2500
});

assert(recordRes.ok, 'recordAttempt_ must succeed');
assert.strictEqual(attemptsSheet.data.length, 2, 'Attempts sheet must have 2 rows (header + 1 attempt)');
const recordedRow = attemptsSheet.data[1];
console.log('  Recorded row:', recordedRow);
assert.strictEqual(recordedRow[1], 'S001', 'Student ID must be S001');
assert.strictEqual(recordedRow[2], '林小明', 'Student name must be 林小明');
assert.strictEqual(recordedRow[4], 'Q01', 'Question ID must be Q01');
if (attemptsSheet.data[0].length === 10) {
  assert.strictEqual(recordedRow[8], 'TRUE', 'Correct must be TRUE');
  assert.strictEqual(Number(recordedRow[9]), 2.5, 'Duration seconds must be 2.5');
} else {
  assert.strictEqual(recordedRow[6], 'TRUE', 'Correct must be TRUE');
  assert.strictEqual(Number(recordedRow[7]), 2.5, 'Duration seconds must be 2.5');
}
console.log('  ✅ Attempt successfully appended to "作答紀錄" in Chinese format!');

// Test 4c: Check ParentDashboard was automatically updated
const dashSheet = mockSs.getSheetByName('ParentDashboard');
assert(dashSheet !== null, 'ParentDashboard sheet must be auto-created and updated');
assert(dashSheet.data.length > 5, 'ParentDashboard must have populated report rows');
console.log(`  ✅ ParentDashboard auto-refreshed with ${dashSheet.data.length} rows of report data!`);

// Test 4d: Record attempt when no Attempts sheet exists at all
const mockEmptySs = new MockSpreadsheet([
  new MockSheet('Questions', [
    ['題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'],
    ['Q01', '月亮是什麼？', '恆星', '衛星', '行星', '流星', '2', '月球是地球的衛星']
  ])
]);
const createdSheet = sandbox.getOrCreateAttemptsSheet_(mockEmptySs);
assert(createdSheet !== null, 'getOrCreateAttemptsSheet_ must auto-create Attempts sheet if missing');
assert.strictEqual(createdSheet.getName(), 'Attempts', 'Auto-created sheet must be named Attempts');
assert(createdSheet.data[0].length === 10 || createdSheet.data[0].length === 8, 'Created sheet must have 8 or 10 headers');
console.log('  ✅ getOrCreateAttemptsSheet_ auto-creates Attempts with Chinese headers if sheet is missing!');

// Test 4e: cleanLegacySheets_ does not delete Questions even if tab is named '工作表1'
const mockSsWithWorksheet1 = new MockSpreadsheet([
  new MockSheet('工作表1', [
    ['題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'],
    ['Q01', '什麼星會發光？', '行星', '恆星', '衛星', '彗星', '2', '恆星會自體發光']
  ])
]);
sandbox.cleanLegacySheets_(mockSsWithWorksheet1);
const questionsFound = sandbox.getQuestionsSheet_(mockSsWithWorksheet1);
assert(questionsFound !== null, 'Questions data in 工作表1 must NOT be deleted by cleanLegacySheets_');
console.log('  ✅ cleanLegacySheets_ safely protects question bank data in default worksheets!');

// Test 4f: simplifyAllTables_ works cleanly
const simplifyRes = sandbox.simplifyAllTables_(mockSs);
assert(simplifyRes.ok, 'simplifyAllTables_ must return ok: true');
console.log('  ✅ simplifyAllTables_ executed successfully without errors!');

console.log('\n========================================');
console.log('🎉 ALL BUILD-044 VERIFICATION TESTS PASSED!');
console.log('========================================');
