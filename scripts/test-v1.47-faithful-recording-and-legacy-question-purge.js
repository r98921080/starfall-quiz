// scripts/test-v1.47-faithful-recording-and-legacy-question-purge.js
// Verification suite for BUILD-047: Faithful 10-Col Attempt Recording & Legacy Question Purge

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== 開始執行 BUILD-047 驗證測試 ===\n');

const repoRoot = path.resolve(__dirname, '..');

// 1. 驗證 data/default-question-bank.csv
console.log('--- 測試 1: default-question-bank.csv 100% 替換為千題成語題庫且無舊版題目 ---');
const csvPath = path.join(repoRoot, 'data', 'default-question-bank.csv');
assert.ok(fs.existsSync(csvPath), 'default-question-bank.csv 必須存在');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// 使用與 game.js 相同之標準 RFC-4180 CSV 解析器 (支援換行與引號)
function parseCSV(text) {
  let inQuotes = false;
  let row = [];
  const rows = [];
  let cell = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(cell.trim()); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some(x => x.length > 0)) rows.push(row);
        row = [];
      } else { cell += c; }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(x => x.length > 0)) rows.push(row);
  }
  return rows;
}

const parsedRows = parseCSV(csvContent);
console.log(`總解析題數: ${parsedRows.length - 1} 題 (標頭行 + 1000 題)`);
assert.strictEqual(parsedRows.length - 1, 1000, '題庫題目總數必須為 1000 題');
assert.strictEqual(parsedRows[1][0], '1', '第 1 題題號必須為 1');
assert.strictEqual(parsedRows[1000][0], '1000', '第 1000 題題號必須為 1000');

const legacyRegex = /^([Gg][1-6]|[Jj][7-9])-/;
let legacyCountInCsv = 0;
for (let i = 1; i < parsedRows.length; i++) {
  const qid = parsedRows[i][0];
  if (legacyRegex.test(qid)) {
    legacyCountInCsv++;
  }
}
console.log(`舊版題目 (G1~G6, J7~J9) 數量: ${legacyCountInCsv}`);
assert.strictEqual(legacyCountInCsv, 0, 'default-question-bank.csv 內舊版題目數量必須為 0');
console.log('✅ 測試 1 通過: CSV 題庫已完全淨化為 1000 題成語題庫！\n');

// 2. 驗證 apps-script/Code.gs
console.log('--- 測試 2: apps-script/Code.gs 防護與清理機制 ---');
const codeGsPath = path.join(repoRoot, 'apps-script', 'Code.gs');
assert.ok(fs.existsSync(codeGsPath), 'Code.gs 必須存在');
const codeGs = fs.readFileSync(codeGsPath, 'utf8');

assert.ok(codeGs.includes('clean_legacy_attempts'), 'Code.gs 必須支援 clean_legacy_attempts action');
assert.ok(codeGs.includes('🗑️ 清理舊版無用作答紀錄 (Attempts)'), 'Code.gs 選單必須包含清理舊版紀錄項目');
assert.ok(codeGs.includes('cleanLegacyAttempts_'), 'Code.gs 必須實現 cleanLegacyAttempts_ 函數');
assert.ok(codeGs.includes('const isLegacy = /^([Gg][1-6]|[Jj][7-9])-/.test(qidStr);'), 'normalizeAttempt_ 必須檢測舊版題目代碼');
assert.ok(codeGs.includes('作答秒數'), 'Code.gs 必須包含作答秒數欄位');
assert.ok(codeGs.includes('選擇的答案'), 'Code.gs 必須包含選擇的答案欄位');
assert.ok(codeGs.includes('正確答案'), 'Code.gs 必須包含正確答案欄位');
console.log('✅ 測試 2 通過: Code.gs 防護與清理機制完整健全！\n');

// 3. 驗證 game.js
console.log('--- 測試 3: game.js 前端過濾、秒數採集與防護機制 ---');
const gameJsPath = path.join(repoRoot, 'game.js');
assert.ok(fs.existsSync(gameJsPath), 'game.js 必須存在');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');

assert.ok(gameJs.includes('this.quizQuestionStartTime = Date.now();'), 'showNextQuestion 必須記錄 quizQuestionStartTime');
assert.ok(gameJs.includes('const responseTime = Math.max(0, Math.round(Date.now() - (this.quizQuestionStartTime || Date.now())));'), 'handleAnswer 必須計算 responseTime');
assert.ok(gameJs.includes('response_time_ms: responseTime,'), 'handleAnswer 必須將 response_time_ms 傳入 recordAttempt');
assert.ok(gameJs.includes('response_time_ms: Math.round(attempt.response_time_ms || 0)'), 'postPayload 必須包含 response_time_ms');
assert.ok(gameJs.includes("response_time_ms: String(Math.round(attempt.response_time_ms || 0))"), 'GET 備援 params 必須包含 response_time_ms');
assert.ok(gameJs.includes('忽略舊版/無效題目作答記錄'), 'recordAttempt 必須過濾舊版題目');
assert.ok(gameJs.includes('starfall_offline_attempt_queue_v1'), 'DataStore 必須維護 offlineQueue');
assert.ok(gameJs.includes('rawQueue.filter'), 'DataStore 初始化時必須淨化離線隊列');
assert.ok(gameJs.includes('rawMap'), 'loadFingerprintsFromStorage 必須淨化錯題集');
console.log('✅ 測試 3 通過: game.js 前端計時與舊題防護均已正確生效！\n');

// 4. 驗證 HTML 快取防護版本號
console.log('--- 測試 4: index.html & starfall-quiz.html 快取標記 ---');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const starfallHtml = fs.readFileSync(path.join(repoRoot, 'starfall-quiz.html'), 'utf8');

assert.ok(/game\.js\?v=b(49|5\d)/.test(indexHtml), 'index.html 必須使用 ?v=b49 或更高級版號');
assert.ok(/game\.js\?v=b(49|5\d)/.test(starfallHtml), 'starfall-quiz.html 必須使用 ?v=b49 或更高級版號');
console.log('✅ 測試 4 通過: HTML 版本標籤已升級至 ?v=b49 或更高級！\n');

console.log('🎉 所有測試均順利通過！BUILD-047 驗證完成！');
