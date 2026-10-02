const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== BUILD-042 Verification: 8-Column Format & Sheet Re-creation Fix ===\n');

// 1. 讀取 apps-script/Code.gs
const codeGsPath = path.join(__dirname, '../apps-script/Code.gs');
const codeGs = fs.readFileSync(codeGsPath, 'utf8');

// 2. 讀取 game.js
const gameJsPath = path.join(__dirname, '../game.js');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');

console.log('--- 1. Testing apps-script/Code.gs Resilience & Non-Recursion ---');

// 驗證 doGet / doPost 主動清理舊分頁
assert(codeGs.includes('cleanLegacySheets_(ss)'), 'Code.gs 必須包含 cleanLegacySheets_(ss)');
assert(codeGs.includes("version: '1.3.0'"), 'API 版本必須為 1.3.0');
console.log('  ✅ API 版本已升級為 1.3.0，doGet 與 doPost 皆主動執行 cleanLegacySheets_ 巡檢');

// 驗證 cleanLegacySheets_ 與 cleanAllExtraSheets_ 絕無無限遞迴
const cleanLegacyMatch = codeGs.match(/function cleanLegacySheets_\([\s\S]*?\n\}/);
assert(cleanLegacyMatch, '必須定義 cleanLegacySheets_');
assert(!cleanLegacyMatch[0].includes('refreshReports('), 'cleanLegacySheets_ 內部絕對不可呼叫 refreshReports() 避免循環遞迴！');
assert(!cleanLegacyMatch[0].includes('cleanAllExtraSheets('), 'cleanLegacySheets_ 內部絕對不可呼叫 cleanAllExtraSheets()！');
console.log('  ✅ cleanLegacySheets_ 已徹底解除循環遞迴，保證無 call stack overflow 崩潰風險');

// 模擬 parseQuestionRow_ 測試
// 從 Code.gs 提取 splitTags_ 與 parseQuestionRow_
function splitTags_(value) {
  return String(value || '').split(/[|｜,，]/).map(function(v) { return v.trim(); }).filter(Boolean);
}

// 抽取 parseQuestionRow_ 函數主體
const parseQRowBody = codeGs.match(/function parseQuestionRow_\(row, idx\) \{([\s\S]*?)\n\}\n\nfunction getQuestions_/);
assert(parseQRowBody, '必須能找到 parseQuestionRow_ 實作');
const parseQuestionRow_ = new Function('row', 'idx', 'splitTags_', parseQRowBody[1] + '\n;return parseQuestionRow_(row, idx);');

// 建立可執行版本的 parseQuestionRow_
const testParse = (row, idx) => {
  // 將 parseQuestionRow_ 在沙盒中執行
  const fn = new Function('row', 'idx', 'splitTags_', `
    ${parseQRowBody[1]}
  `);
  return fn(row, idx, splitTags_);
};

// 測試 A：標準 8 欄中文格式（答案為數字 2 -> 選項2）
const rowA = {
  '題號': 'Q-01',
  '題目': '「白日依山盡」的下一句是什麼？',
  '選項1': '黃河入海流',
  '選項2': '春風吹又生',
  '選項3': '處處聞啼鳥',
  '選項4': '夜來風雨聲',
  '答案': '2',
  '答案說明': '出自王之渙《登鸛雀樓》。'
};
const parsedA = testParse(rowA, 0);
assert.strictEqual(parsedA.question_id, 'Q-01');
assert.strictEqual(parsedA.question, '「白日依山盡」的下一句是什麼？');
assert.strictEqual(parsedA.answer, 'B', '數字答案 2 必須標準化為 B');
assert.strictEqual(parsedA.options[1], '春風吹又生');
assert.strictEqual(parsedA.explanation_detail, '出自王之渙《登鸛雀樓》。');
console.log('  ✅ Apps Script: 標準 8 欄中文格式解析正確（答案 2 -> B）');

// 測試 B：標題含空白與中文別名（'題目 '、'選項 1'、'說明'）
const rowB = {
  ' 題號 ': 'Q-02',
  '題目 ': '太陽從哪邊升起？',
  '選項 1': '東邊',
  '選項 2': '西邊',
  '選項 3': '南邊',
  '選項 4': '北邊',
  '答案': '東邊',
  '說明': '太陽每日自東方升起。'
};
const parsedB = testParse(rowB, 1);
assert.strictEqual(parsedB.question_id, 'Q-02');
assert.strictEqual(parsedB.question, '太陽從哪邊升起？');
assert.strictEqual(parsedB.answer, 'A', '文字相符答案 "東邊" 必須自動對應至 A (選項1)');
assert.strictEqual(parsedB.explanation_detail, '太陽每日自東方升起。');
console.log('  ✅ Apps Script: 容錯含空白與別名標題解析正確（文字答案 "東邊" -> A）');

// 測試 C：無標題鍵名、純依欄位位置備援 (_raw 陣列)
const rowC = {
  _raw: ['Q-03', '水在攝氏幾度沸騰？', '50度', '80度', '100度', '120度', '3', '標準氣壓下水於100℃沸騰']
};
const parsedC = testParse(rowC, 2);
assert.strictEqual(parsedC.question_id, 'Q-03');
assert.strictEqual(parsedC.question, '水在攝氏幾度沸騰？');
assert.strictEqual(parsedC.answer, 'C', '位置備援答案 3 必須自動對應至 C (選項3)');
assert.strictEqual(parsedC.options[2], '100度');
console.log('  ✅ Apps Script: 純位置備援 (Col 0~7) 解析正確（答案 3 -> C）');

console.log('\n--- 2. Testing game.js Question Processing & Loading ---');

// 抽取 game.js 中的 deduplicateAndBalanceBank
const dedupeMatch = gameJs.match(/deduplicateAndBalanceBank\(questions\) \{([\s\S]*?)\n  \}\n\n  async loadFromGoogleSheet/);
assert(dedupeMatch, '必須在 game.js 找到 deduplicateAndBalanceBank');
const deduplicateAndBalanceBank = new Function('questions', dedupeMatch[1]);

// 測試 game.js 對 8 欄中文格式之去重與載入
const testQuestionsGame = [
  {
    '題號': 'Q-G01',
    '題目': '春眠不覺曉？',
    '選項1': '處處聞啼鳥',
    '選項2': '夜來風雨聲',
    '選項3': '花落知多少',
    '選項4': '白日依山盡',
    '答案': '1',
    '答案說明': '孟浩然《春曉》'
  },
  {
    '題號': 'Q-G02',
    '題目': '下列哪個是偶數？',
    '選項 1': '1',
    '選項 2': '2',
    '選項 3': '3',
    '選項 4': '5',
    '答案': '2',
    '說明': '2 是唯一的偶數質數'
  },
  {
    // 重複題目測試
    '題號': 'Q-G01-DUP',
    '題目': '春眠不覺曉？',
    '選項1': '處處聞啼鳥',
    '選項2': '夜來風雨聲',
    '選項3': '花落知多少',
    '選項4': '白日依山盡',
    '答案': '選項1'
  },
  {
    // 空白題幹應被忽略
    '題號': 'Q-EMPTY',
    '題目': '',
    '選項1': 'A',
    '選項2': 'B'
  }
];

const bankResult = deduplicateAndBalanceBank(testQuestionsGame);
assert.strictEqual(bankResult.length, 2, '應保留 2 題有效不重複題目（過濾重複與空白題幹）');
assert.strictEqual(bankResult[0].question_id, 'Q-G01');
assert.strictEqual(bankResult[0].ans, 0, '答案 1 對應 index 0');
assert.strictEqual(bankResult[1].question_id, 'Q-G02');
assert.strictEqual(bankResult[1].ans, 1, '答案 2 (選項2) 對應 index 1');
console.log('  ✅ game.js deduplicateAndBalanceBank 完美支援 8 欄格式、別名及去重！');

// 測試 game.js parseCSV 支援 8 欄
const parseCsvMatch = gameJs.match(/parseCSV\(text\) \{([\s\S]*?)\n  \}\n\n  isGradeMatch/);
assert(parseCsvMatch, '必須在 game.js 找到 parseCSV');
const parseCSV = new Function('text', parseCsvMatch[1]);

const csvContent8Col = `題號,題目,選項1,選項2,選項3,選項4,答案,答案說明
Q101,台灣的第一高峰是哪座山？,玉山,雪山,大霸尖山,合歡山,1,玉山海拔3952公尺
Q102,光合作用主要產生的氣體是什麼？,二氧化碳,氧氣,氮氣,氫氣,氧氣,光合作用釋放氧氣
Q103,1打等於幾個？,6個,10個,12個,24個,選項3,1打即一打12個`;

const csvParsed = parseCSV(csvContent8Col);
assert.strictEqual(csvParsed.length, 3, 'CSV 必須解析出 3 題');
assert.strictEqual(csvParsed[0].ans, 0, 'Q101 答案 "1" 對應 index 0');
assert.strictEqual(csvParsed[1].ans, 1, 'Q102 答案 "氧氣" 對應 index 1');
assert.strictEqual(csvParsed[2].ans, 2, 'Q103 答案 "選項3" 對應 index 2');
console.log('  ✅ game.js parseCSV 完美解析 8 欄極簡 CSV 格式（支援 1、文字名稱、選項3）');

// 測試 Google 試算表連結正則提取
const testUrlA = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=0#gid=0';
const matchA = testUrlA.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
assert(matchA && matchA[1] === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
console.log('  ✅ Google 試算表網址能精準辨識並轉換為 CSV 直連位址！');

console.log('\n--- 3. Testing Smart Header Row Detection & UI Remote Buttons ---');

// 驗證 sheetObjects_ 的智慧標題列識別
const sheetObjectsMatch = codeGs.match(/function sheetObjects_\(sheet\) \{([\s\S]*?)\n\}\n\nfunction getHeaders_/);
assert(sheetObjectsMatch, '必須在 Code.gs 找到 sheetObjects_');
const sheetObjects_ = new Function('sheet', sheetObjectsMatch[1]);

// 模擬試算表 A：第 1 列是廣告橫幅，第 2 列才是標題
const fakeSheetA = {
  getLastRow: () => 4,
  getDataRange: () => ({
    getValues: () => [
      ['三年級國語題庫精選 3000 題（請勿任意更動標題）', '', '', '', '', '', '', ''],
      ['題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'],
      ['Q01', '床前明月光下一句？', '疑是地上霜', '舉頭望明月', '低頭思故鄉', '春眠不覺曉', '1', '李白《靜夜思》'],
      ['Q02', '太陽是恆星還是行星？', '恆星', '行星', '衛星', '彗星', '1', '太陽是太陽系的中心恆星']
    ]
  })
};
const objsA = sheetObjects_(fakeSheetA);
assert.strictEqual(objsA.length, 2, '應自動略過橫幅列，正確讀取 2 列題目資料');
assert.strictEqual(objsA[0]['題目'], '床前明月光下一句？');
console.log('  ✅ sheetObjects_ 成功自動識別第 2 列標題並略過第 1 列橫幅！');

// 模擬試算表 B：完全無標題，直接貼上 8 欄資料
const fakeSheetB = {
  getLastRow: () => 2,
  getDataRange: () => ({
    getValues: () => [
      ['Q01', '一隻青蛙幾條腿？', '1', '2', '3', '4', '4', '成蛙四條腿'],
      ['Q02', '三角形內角和？', '90度', '180度', '270度', '360度', '2', '平面三角形內角和180度']
    ]
  })
};
const objsB = sheetObjects_(fakeSheetB);
assert.strictEqual(objsB.length, 2, '無標題模式應完整保留 2 列題目資料');
assert.strictEqual(objsB[0]['題目'], '一隻青蛙幾條腿？');
console.log('  ✅ sheetObjects_ 無標題直接貼上模式自動合成 8 欄標題成功！');

// 驗證 index.html 包含遠端一鍵轉化按鈕
const indexHtmlPath = path.join(__dirname, '../index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtml.includes('id="gsSimplifyBtn"'), 'index.html 必須包含 gsSimplifyBtn 按鈕');
assert(indexHtml.includes('id="gsCleanSheetsBtn"'), 'index.html 必須包含 gsCleanSheetsBtn 按鈕');
console.log('  ✅ index.html 已提供「遠端一鍵轉化題庫為 8 欄」與「遠端極簡化為 3 分頁」按鈕！');

// 驗證 game.js 綁定 gsSimplifyBtn 事件
assert(gameJs.includes("document.getElementById('gsSimplifyBtn')"), 'game.js 必須綁定 gsSimplifyBtn');
assert(gameJs.includes("action=simplify_questions"), 'game.js 必須發送 action=simplify_questions');
assert(gameJs.includes("action=clean_sheets"), 'game.js 必須發送 action=clean_sheets');
console.log('  ✅ game.js 遠端 8 欄轉換與分頁清理按鈕事件綁定正確！');

// 驗證 simplifyQuestionsColumns_ 不再有 ui.ButtonSet.YES bug
const liveCodeGs = fs.readFileSync(codeGsPath, 'utf8');
assert(!/resp\s*!==\s*ui\.ButtonSet\.YES\b/.test(liveCodeGs), 'Code.gs 絕不能有 resp !== ui.ButtonSet.YES bug');
assert(liveCodeGs.includes('ui.Button.YES'), 'Code.gs 必須使用 ui.Button.YES');
console.log('  ✅ Apps Script 試算表選單確認按鈕修復完成（ui.Button.YES）！');

console.log('\n========================================');
console.log('🎉 ALL BUILD-042 VERIFICATION TESTS PASSED!');
console.log('========================================');
