const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 BUILD-025 VERIFICATION: CLOUD DEDUP & GOOGLE SHEET SYNC');
console.log('================================================================\n');

// 1. Check default-question-bank.csv headers against apps-script REQUIRED_HEADERS
console.log('[1/4] Verifying Headers Compatibility between CSV & Google Sheets...');
const csvText = fs.readFileSync(path.join(__dirname, '..', 'data', 'default-question-bank.csv'), 'utf8');
const firstLine = csvText.split(/\r?\n/)[0];
const csvHeaders = firstLine.split(',').map(h => h.trim());

const codeGs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
const headersMatch = codeGs.match(/Questions:\s*\[([\s\S]*?)\]/);
assert(headersMatch, 'Questions headers found in Code.gs');
const expectedHeaders = eval('[' + headersMatch[1] + ']');

assert.strictEqual(csvHeaders.length, expectedHeaders.length, 'Header column counts must match');
for (let i = 0; i < csvHeaders.length; i++) {
  assert.strictEqual(csvHeaders[i], expectedHeaders[i], `Header column ${i} matches: ${csvHeaders[i]}`);
}
console.log(`  ✓ All ${csvHeaders.length} columns in CSV and Google Sheets match in exact order!`);

// 2. Test game.js DataStore.prototype.deduplicateAndBalanceBank
console.log('\n[2/4] Testing DataStore.prototype.deduplicateAndBalanceBank in game.js...');
const gameJs = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');

const fnStart = gameJs.indexOf('deduplicateAndBalanceBank(questions) {');
assert(fnStart !== -1, 'deduplicateAndBalanceBank method exists in game.js');
const nextFnStart = gameJs.indexOf('async loadFromGoogleSheet(apiUrl) {', fnStart);
const fnCode = gameJs.slice(fnStart, nextFnStart).trim();

// Evaluate deduplicateAndBalanceBank in sandbox
const sandbox = {
  console: console,
  Map: Map,
  Array: Array,
  String: String,
  Number: Number,
  parseInt: parseInt,
  Object: Object,
  Math: Math
};
vm.createContext(sandbox);

const dataStore = vm.runInContext(`
  ({
    ${fnCode}
  })
`, sandbox);

// Synthesize 1000 duplicate questions (10 unique questions, each repeated 100 times with answer 'A')
const rawSynth = [];
for (let i = 1; i <= 10; i++) {
  for (let copy = 0; copy < 100; copy++) {
    rawSynth.push({
      question_id: 'Q-TEST-' + i + '-' + copy,
      question: '這是一道測試用題目，編號為：' + i + '？',
      option_a: '正確答案' + i,
      option_b: '錯誤干擾一' + i,
      option_c: '錯誤干擾二' + i,
      option_d: '錯誤干擾三' + i,
      answer: 'A',
      difficulty: 2
    });
  }
}

const cleaned = dataStore.deduplicateAndBalanceBank(rawSynth);
assert.strictEqual(cleaned.length, 10, 'Deduplication must collapse 1000 duplicates into exactly 10 unique questions');

const ansFreq = [0, 0, 0, 0];
cleaned.forEach(q => { ansFreq[q.ans]++; });
console.log('  ✓ 1000 duplicate items deduplicated to:', cleaned.length);
console.log('  ✓ Options balanced across [A, B, C, D]:', ansFreq);
assert(ansFreq.every(c => c >= 2 && c <= 3), 'Answers must be evenly balanced across 10 questions (~2-3 each)');

// 3. Test New Question Addition Tolerance (Preserving new questions from Google Sheet)
console.log('\n[3/4] Testing Future Maintenance: Adding New Questions to Bank...');
// Add 2 completely new questions to the 10 cleaned questions
const updatedSheet = [...rawSynth, {
  question_id: 'Q-NEW-01',
  question: '全新的成語題目：下列何者非四季？',
  option_a: '春風',
  option_b: '夏雨',
  option_c: '秋霜',
  option_d: '冬雪',
  answer: 'A'
}, {
  question_id: 'Q-NEW-02',
  question: '全新科學題目：光合作用產生的氣體是？',
  option_a: '氧氣',
  option_b: '二氧化碳',
  option_c: '氮氣',
  option_d: '氫氣',
  answer: 'A'
}];

const updatedCleaned = dataStore.deduplicateAndBalanceBank(updatedSheet);
assert.strictEqual(updatedCleaned.length, 12, '10 unique + 2 new questions must equal 12 questions');
const hasNew1 = updatedCleaned.some(q => q.question.includes('下列何者非四季'));
const hasNew2 = updatedCleaned.some(q => q.question.includes('光合作用產生的氣體'));
assert(hasNew1 && hasNew2, 'Both newly added questions must be present in bank');
console.log('  ✓ New questions added to Google Sheet successfully recognized and appended! (Total: 12)');

// 4. Verify Code.gs cleanDuplicateQuestions Implementation
console.log('\n[4/4] Verifying Apps Script Code.gs Clean Functions...');
assert(codeGs.includes('cleanDuplicateQuestions()'), 'cleanDuplicateQuestions function exists in Code.gs');
assert(codeGs.includes('cleanDuplicateQuestions_()'), 'cleanDuplicateQuestions_ helper exists in Code.gs');
assert(codeGs.includes("'clean_questions'"), 'clean_questions action registered in doGet & doPost');
console.log('  ✓ Google Apps Script one-click cleaner and API action verified!');

console.log('\n================================================================');
console.log('🎉 ALL BUILD-025 CLOUD SYNC & DEDUP VERIFICATIONS PASSED!');
console.log('================================================================\n');
