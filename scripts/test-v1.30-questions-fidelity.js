const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== BUILD-030 題庫真實性與選項保真度驗證測試 ===\n');

// 1. 驗證 CSV 題庫
const csvPath = path.join(__dirname, '..', 'data', 'default-question-bank.csv');
assert(fs.existsSync(csvPath), 'default-question-bank.csv 必須存在');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// 模擬 parseCSV
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
      question_id: r[qidIdx] || `Q-${i}`,
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

const parsedBank = parseCSV(csvContent);
console.log(`[驗證 1] CSV 成功解析題數: ${parsedBank.length} 題`);
assert.strictEqual(parsedBank.length, 136, '題庫必須剛好 136 題課綱真題');

// 2. 驗證年級涵蓋分佈
const gradeCounts = {};
parsedBank.forEach(q => {
  gradeCounts[q.grade] = (gradeCounts[q.grade] || 0) + 1;
});
console.log('[驗證 2] 年級題數分佈:');
const expectedGrades = [
  '國小一年級', '國小二年級', '國小三年級',
  '國小四年級', '國小五年級', '國小六年級',
  '國中一年級', '國中二年級', '國中三年級'
];
expectedGrades.forEach(g => {
  console.log(`  - ${g}: ${gradeCounts[g] || 0} 題`);
  assert(gradeCounts[g] >= 15, `${g} 題目數應 >= 15`);
});

// 3. 驗證真題選項與答案完全未受竄改
const qMap = new Map();
parsedBank.forEach(q => qMap.set(q.question_id, q));

// G1-PHO-0001: 「花」的注音是哪一個？, ㄏㄨㄚ, ㄏㄨㄛ, ㄈㄚ, ㄏㄚ, A
const q1 = qMap.get('G1-PHO-0001');
assert(q1, 'G1-PHO-0001 必須存在');
assert.strictEqual(q1.question, '「花」的注音是哪一個？');
assert.deepStrictEqual(q1.opts, ['ㄏㄨㄚ', 'ㄏㄨㄛ', 'ㄈㄚ', 'ㄏㄚ']);
assert.strictEqual(q1.ans, 0, 'G1-PHO-0001 答案必須為 A (0)');
console.log('[驗證 3-1] G1-PHO-0001 保真度通過: 答案為 A (0)，選項順序完整！');

// G1-PHO-0002: 下列哪一個注音有第三聲？, ㄇㄚ, ㄇㄚˊ, ㄇㄚˇ, ㄇㄚˋ, C
const q2 = qMap.get('G1-PHO-0002');
assert(q2, 'G1-PHO-0002 必須存在');
assert.deepStrictEqual(q2.opts, ['ㄇㄚ', 'ㄇㄚˊ', 'ㄇㄚˇ', 'ㄇㄚˋ']);
assert.strictEqual(q2.ans, 2, 'G1-PHO-0002 答案必須為 C (2)');
console.log('[驗證 3-2] G1-PHO-0002 保真度通過: 答案為 C (2)，選項順序完整！');

// G1-CHR-0003: 下列哪一個字是「木」？, 本, 木, 禾, 未, B
const q3 = qMap.get('G1-CHR-0003');
assert(q3, 'G1-CHR-0003 必須存在');
assert.deepStrictEqual(q3.opts, ['本', '木', '禾', '未']);
assert.strictEqual(q3.ans, 1, 'G1-CHR-0003 答案必須為 B (1)');
console.log('[驗證 3-3] G1-CHR-0003 保真度通過: 答案為 B (1)，選項順序完整！');

// G1-CHR-0004: 「好」字裡面有哪一個字？, 女, 水, 火, 口, A
const q4 = qMap.get('G1-CHR-0004');
assert(q4, 'G1-CHR-0004 必須存在');
assert.deepStrictEqual(q4.opts, ['女', '水', '火', '口']);
assert.strictEqual(q4.ans, 0, 'G1-CHR-0004 答案必須為 A (0)');
console.log('[驗證 3-4] G1-CHR-0004 保真度通過: 答案為 A (0)，選項順序完整！');

// 4. 驗證 game.js 中的 deduplicateAndBalanceBank
// 測試去重與「絕對不輪轉選項、不修改答案」
const gameCode = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');

// 檢查 game.js 是否已移除選項輪轉程式碼
assert(!gameCode.includes('newOpts[(i + shift) % 4]'), 'game.js 絕不可包含動態選項輪轉位移邏輯！');
assert(!gameCode.includes('q.ans = minIdx'), 'game.js 絕不可包含動態答案篡改邏輯！');
console.log('[驗證 4] game.js 已徹底清除 newOpts[(i + shift) % 4] 與 q.ans = minIdx 輪轉位移程式碼！');

// 5. 驗證 Apps Script Code.gs
const gsCode = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
assert(gsCode.includes('getQuestionsSheet_'), 'Code.gs 必須支援 getQuestionsSheet_ 容錯探測');
assert(gsCode.includes('Quetions'), 'Code.gs 必須支援 Quetions 手誤容錯');
assert(gsCode.includes('題庫'), 'Code.gs 必須支援 中文「題庫」工作表名稱');
assert(!gsCode.includes('newOpts[(i + shift) % 4]'), 'Code.gs 絕不可包含破壞性選項輪轉位移！');
console.log('[驗證 5] apps-script/Code.gs 已支援多工作表名稱容錯探測，並移除選項輪轉位移！');

console.log('\n🎉 所有 BUILD-030 題庫保真度與修復測試全部通過！');
