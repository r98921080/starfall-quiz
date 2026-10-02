const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== BUILD-043 Verification: Questions 8-Col & Attempts 8-Col Simplification ===\n');

const codeGs = fs.readFileSync('apps-script/Code.gs', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const gameJs = fs.readFileSync('game.js', 'utf8');

// --- 1. Checking Code.gs Static Structure ---
console.log('--- 1. Testing Code.gs Static Configurations ---');
assert(/version:\s*'1\.4\.[0-9]+'/.test(codeGs), 'API version must be 1.4.x');
assert(
  codeGs.includes("'時間', '學號', '姓名', '關卡', '題號', '學生選擇', '是否答對', '作答秒數'") ||
  codeGs.includes("'時間', '學號', '姓名', '關卡', '題號', '題目', '選擇的答案', '正確答案', '是否答對', '作答秒數'"),
  'REQUIRED_HEADERS.Attempts must have standard Chinese columns'
);
assert(codeGs.includes("'題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'"), 'REQUIRED_HEADERS.Questions must be 8 Chinese columns');
assert(codeGs.includes('simplifyAttemptsColumns_'), 'simplifyAttemptsColumns_ must be implemented');
assert(codeGs.includes('simplifyAllTables_'), 'simplifyAllTables_ must be implemented');
assert(codeGs.includes('getAttemptsSheet_'), 'getAttemptsSheet_ must be implemented');
console.log('  ✅ Code.gs version, headers, and function exports configured correctly!');

// --- 2. Testing VM Simulation of Apps Script Functions ---
console.log('\n--- 2. Simulating Apps Script Execution in VM ---');

class MockSheet {
  constructor(name, data) {
    this.name = name;
    this.data = data || [];
  }
  getName() { return this.name; }
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
    // simulate trimming columns
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

const mockContext = {
  console: console,
  Utilities: {
    getUuid: () => 'uuid-' + Math.random().toString(36).slice(2, 8),
    formatDate: (d) => '2026/10/02 11:30:00'
  },
  Session: {
    getScriptTimeZone: () => 'Asia/Taipei'
  },
  SpreadsheetApp: {}
};
vm.createContext(mockContext);
vm.runInContext(codeGs, mockContext);

// Test Questions simplification with 23 columns
const mock23QHeaders = [
  'question_id', 'grade', 'subject', 'unit', 'skill', 'question_type', 'difficulty',
  'question', 'option_a', 'option_b', 'option_c', 'option_d', 'answer',
  'explanation_short', 'explanation_detail', 'memory_tip', 'target_words',
  'concept_tags', 'error_pattern', 'next_step', 'review_priority', 'enabled', 'source'
];
const mock23QRow = [
  'Q001', '三年級', '國語文', '第一單元', '字形辨析', '單選題', '1',
  '日出東方的日是什麼意思？', '太陽', '月亮', '星星', '雲朵', 'A',
  '日指太陽', '日指太陽詳細說明', '', '', '', '', '', '', 'TRUE', ''
];
const qSheet = new MockSheet('Questions', [mock23QHeaders, mock23QRow]);

// Test Attempts simplification with 21 columns
const mock21AHeaders = [
  'timestamp', 'student_id', 'session_id', 'stage', 'boss_name', 'question_id',
  'selected_option', 'correct', 'response_time_ms', 'attempt_index', 'is_review',
  'hint_used', 'difficulty_at_time', 'subject', 'unit', 'skill', 'target_words',
  'concept_tags', 'knowledge_pressure', 'weapon_quality', 'sync_status'
];
const mock21ARow = [
  '2026-10-02T03:00:00.000Z', 'S0001', 'SES01', 1, '魔王', 'Q001',
  'A', true, 3200, 1, false,
  false, 1, '國語文', '', '', '',
  '', 0, 'normal', '已同步 (小明)'
];
const aSheet = new MockSheet('Attempts', [mock21AHeaders, mock21ARow]);
const dashSheet = new MockSheet('ParentDashboard', []);
const legacySheet = new MockSheet('QuestionStats', [['dummy']]);

const mockSpreadsheet = {
  sheets: [dashSheet, qSheet, aSheet, legacySheet],
  getSheets() { return this.sheets; },
  getSheetByName(name) { return this.sheets.find(s => s.name === name) || null; },
  insertSheet(name) {
    const s = new MockSheet(name, []);
    this.sheets.push(s);
    return s;
  },
  deleteSheet(s) {
    this.sheets = this.sheets.filter(x => x !== s);
  },
  setActiveSheet() {},
  moveActiveSheet() {}
};

// Run simplifyAllTables_
const simAllRes = mockContext.simplifyAllTables_(mockSpreadsheet);
console.log('  simplifyAllTables_ result:', simAllRes);
assert.strictEqual(simAllRes.ok, true, 'simplifyAllTables_ must return ok: true');
assert.strictEqual(simAllRes.questions_count, 1, 'Questions count must be 1');
assert.strictEqual(simAllRes.attempts_count, 1, 'Attempts count must be 1');

// Verify Questions 8 columns
assert.deepStrictEqual(
  qSheet.data[0],
  ['題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'],
  'Questions headers must be converted to standard 8 Chinese columns'
);
assert.strictEqual(qSheet.data[1][0], 'Q001');
assert.strictEqual(qSheet.data[1][1], '日出東方的日是什麼意思？');
assert.strictEqual(qSheet.data[1][6], 'A');
console.log('  ✅ Questions table successfully simplified to 8 Chinese columns!');

// Verify Attempts columns
if (aSheet.data[0].length === 10) {
  assert.deepStrictEqual(
    aSheet.data[0],
    ['時間', '學號', '姓名', '關卡', '題號', '題目', '選擇的答案', '正確答案', '是否答對', '作答秒數']
  );
  assert.strictEqual(aSheet.data[1][1], 'S0001'); // 學號
  assert.strictEqual(aSheet.data[1][3], 1);       // 關卡
  assert.strictEqual(aSheet.data[1][4], 'Q001');  // 題號
  assert.strictEqual(aSheet.data[1][8], 'TRUE');  // 是否答對
  assert.strictEqual(aSheet.data[1][9], '3.2');   // 作答秒數
} else {
  assert.deepStrictEqual(
    aSheet.data[0],
    ['時間', '學號', '姓名', '關卡', '題號', '學生選擇', '是否答對', '作答秒數']
  );
  assert.strictEqual(aSheet.data[1][1], 'S0001'); // 學號
  assert.strictEqual(aSheet.data[1][3], 1);       // 關卡
  assert.strictEqual(aSheet.data[1][4], 'Q001');  // 題號
  assert.strictEqual(aSheet.data[1][5], 'A');     // 學生選擇
  assert.strictEqual(aSheet.data[1][6], 'TRUE');  // 是否答對
  assert.strictEqual(aSheet.data[1][7], '3.2');   // 作答秒數
}
console.log('  ✅ Attempts table successfully simplified to standard Chinese columns!');

// Verify Legacy sheet deleted
assert.strictEqual(mockSpreadsheet.getSheetByName('QuestionStats'), null, 'Legacy sheets must be purged');
console.log('  ✅ Legacy sheets successfully removed!');

// Test Empty Questions and Attempts simplification
const emptyQSheet = new MockSheet('Questions', [['old_header_1', 'old_header_2']]);
const emptyASheet = new MockSheet('Attempts', [['old_header_1', 'old_header_2']]);
const emptySS = {
  sheets: [emptyQSheet, emptyASheet],
  getSheets() { return this.sheets; },
  getSheetByName(name) { return this.sheets.find(s => s.name === name) || null; },
  insertSheet(name) { const s = new MockSheet(name, []); this.sheets.push(s); return s; },
  deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
};
mockContext.simplifyQuestionsColumns_(emptySS);
mockContext.simplifyAttemptsColumns_(emptySS);
assert.deepStrictEqual(
  emptyQSheet.data[0],
  ['題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'],
  'Empty Questions sheet must also have headers formatted to 8 Chinese columns'
);
assert(
  emptyASheet.data[0].length === 10 || emptyASheet.data[0].length === 8,
  'Empty Attempts sheet must also have headers formatted to standard Chinese columns'
);
console.log('  ✅ Empty/header-only sheets correctly convert headers to standard columns!');

// Test Recording and Reading Attempt with Attempts Sheet
const newAttemptPayload = {
  action: 'attempt',
  student_id: 'S0002',
  student_name: '小華',
  student_grade: '三年級',
  stage: 2,
  question_id: 'Q001',
  selected_option: 'A',
  correct: true,
  response_time_ms: 2500
};

const norm = mockContext.normalizeAttempt_(newAttemptPayload, mockSpreadsheet);
const aHeaders = aSheet.data[0];
aSheet.appendRow(aHeaders.map(h => norm[h] !== undefined ? norm[h] : ''));

const lastRow = aSheet.data[aSheet.data.length - 1];
assert.strictEqual(lastRow[1], 'S0002', 'Student ID must be S0002');
assert.strictEqual(lastRow[2], '小華', 'Student name must be 小華');
assert.strictEqual(lastRow[3], 2, 'Stage must be 2');
assert.strictEqual(lastRow[4], 'Q001', 'Question ID must be Q001');
if (aHeaders.length === 10) {
  assert.strictEqual(lastRow[8], 'TRUE', 'Correct must be TRUE');
  assert.strictEqual(lastRow[9], '2.5', 'Seconds must be 2.5');
} else {
  assert.strictEqual(lastRow[6], 'TRUE', 'Correct must be TRUE');
  assert.strictEqual(lastRow[7], '2.5', 'Seconds must be 2.5');
}

// Test getStudentProgressData_ reading from 8 Chinese columns
// Temporarily point SpreadsheetApp.getActiveSpreadsheet to mockSpreadsheet
mockContext.SpreadsheetApp.getActiveSpreadsheet = () => mockSpreadsheet;
const progRes = mockContext.getStudentProgressData_({ student_id: 'S0002' });
assert.strictEqual(progRes.ok, true);
assert.strictEqual(progRes.progress['Q001'].attempts, 1);
assert.strictEqual(progRes.progress['Q001'].wrong, 0);

// Test getStudents_ reading from 8 Chinese columns
const studentsRes = mockContext.getStudents_(mockSpreadsheet);
assert.strictEqual(studentsRes.ok, true);
assert(studentsRes.students.some(s => s.student_id === 'S0002' && s.display_name === '小華'));
console.log('  ✅ Recording and reading attempts with 8 Chinese columns verified!');

// --- 3. Testing HTML & Frontend Button Wiring ---
console.log('\n--- 3. Testing UI Elements & Wiring in index.html & game.js ---');
assert(indexHtml.includes('id="gsSimplifyAllBtn"'), 'index.html must have gsSimplifyAllBtn');
assert(indexHtml.includes('id="gsSimplifyAttemptsBtn"'), 'index.html must have gsSimplifyAttemptsBtn');
assert(indexHtml.includes('id="gsSimplifyBtn"'), 'index.html must have gsSimplifyBtn');
assert(indexHtml.includes('id="gsCleanSheetsBtn"'), 'index.html must have gsCleanSheetsBtn');
assert(gameJs.includes('simplifyAllBtn = document.getElementById(\'gsSimplifyAllBtn\')'), 'game.js must bind gsSimplifyAllBtn');
assert(gameJs.includes('action=simplify_all'), 'game.js must send action=simplify_all');
assert(gameJs.includes('action=simplify_attempts'), 'game.js must send action=simplify_attempts');
assert(gameJs.includes('checkUrlIsExec'), 'game.js must guide users who paste direct spreadsheet links');
console.log('  ✅ UI modal buttons and event handlers in game.js verified!');

console.log('\n========================================');
console.log('🎉 ALL BUILD-043 VERIFICATION TESTS PASSED!');
console.log('========================================');
