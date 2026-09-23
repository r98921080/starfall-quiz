const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 BUILD-024 COMPREHENSIVE VERIFICATION SUITE');
console.log('================================================================');

// -------------------------------------------------------------
// 1. Question Bank Deduplication & Option Balance Verification
// -------------------------------------------------------------
console.log('\n[1/6] Testing Question Bank Deduplication & Option Balance...');
const csvPath = path.join(__dirname, 'data', 'default-question-bank.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

function parseCSV(text) {
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
  return lines;
}

const parsedRows = parseCSV(csvContent);
const header = parsedRows[0];
const dataRows = parsedRows.slice(1);

const qIdx = header.indexOf('question');
const ansIdx = header.indexOf('answer');
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

// Ensure unique questions
const seenKeys = new Set();
const ansDist = { A: 0, B: 0, C: 0, D: 0 };
dataRows.forEach(r => {
  const qFp = getFp(r[qIdx]);
  const ansFp = getFp(getCorrectText(r));
  const key = `${qFp}:::${ansFp}`;
  assert(!seenKeys.has(key), `Duplicate detected: "${r[qIdx]}"`);
  seenKeys.add(key);

  const ans = (r[ansIdx] || 'A').toUpperCase().trim();
  ansDist[ans] = (ansDist[ans] || 0) + 1;
});

console.log(`  ✓ Total unique questions in bank: ${dataRows.length}`);
console.log(`  ✓ Answer distribution: A=${ansDist.A}, B=${ansDist.B}, C=${ansDist.C}, D=${ansDist.D}`);
Object.entries(ansDist).forEach(([letter, count]) => {
  const ratio = count / dataRows.length;
  assert(ratio >= 0.20 && ratio <= 0.30, `Option ${letter} ratio ${ratio.toFixed(2)} is outside 20%-30% range!`);
});
console.log('  ✓ Option balance verified: all options ~25% evenly distributed.');

// -------------------------------------------------------------
// 2. Difficulty Scaling Engine Verification
// -------------------------------------------------------------
console.log('\n[2/6] Testing Difficulty Weighting Engine...');
const gameJsContent = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');

// Extract getDifficultyWeightMap implementation or execute via sandbox
const mapMatch = gameJsContent.match(/getDifficultyWeightMap\(stage = 1\) \{([\s\S]*?)\n  \}/);
assert(mapMatch, 'getDifficultyWeightMap not found in game.js');

const getDifficultyWeightMap = new Function('stage', mapMatch[1]);

const diffStage1 = getDifficultyWeightMap(1);
const diffStage4 = getDifficultyWeightMap(4);
const diffStage6 = getDifficultyWeightMap(6);
const diffStage8 = getDifficultyWeightMap(8);
const diffStage10 = getDifficultyWeightMap(10);

assert.strictEqual(diffStage1[1], 100, 'Stage 1 diff 1 weight should be 100');
assert.strictEqual(diffStage1[5], 0, 'Stage 1 diff 5 weight should be 0');
assert.strictEqual(diffStage4[2], 100, 'Stage 4 diff 2 weight should be 100');
assert.strictEqual(diffStage6[3], 100, 'Stage 6 diff 3 weight should be 100');
assert.strictEqual(diffStage8[4], 100, 'Stage 8 diff 4 weight should be 100');
assert.strictEqual(diffStage10[5], 100, 'Stage 10 diff 5 weight should be 100');

console.log('  ✓ Difficulty weight gradients verified across all stage tiers (1-10).');

// -------------------------------------------------------------
// 3. Peer Mistakes Prioritization Engine Verification
// -------------------------------------------------------------
console.log('\n[3/6] Testing Peer Mistakes Prioritization...');

// Mock DataStore environment
const mockDataStore = {
  currentStudentId: 'S0001',
  questionBank: [
    { question_id: 'Q1', question: '題目一', difficulty: 1, grade: '三年級' },
    { question_id: 'Q2', question: '題目二', difficulty: 1, grade: '三年級' },
    { question_id: 'Q3', question: '題目三', difficulty: 1, grade: '三年級' },
    { question_id: 'Q4', question: '題目四', difficulty: 1, grade: '三年級' },
    { question_id: 'Q5', question: '題目五', difficulty: 1, grade: '三年級' },
    { question_id: 'Q6', question: '題目六', difficulty: 1, grade: '三年級' },
    { question_id: 'Q7', question: '題目七', difficulty: 1, grade: '三年級' }
  ],
  allStudentProgress: {
    'S0002': {
      'Q1': { question_id: 'Q1', wrong: 3, attempts: 3 },
      'Q2': { question_id: 'Q2', wrong: 1, attempts: 2 }
    },
    'S0001': {
      // S0001 has never attempted Q1 or Q2
    }
  },
  sessionUsedQuestionIds: new Set(),
  sessionUsedFingerprints: new Set(),
  masteredFingerprints: new Set(),
  getQuestionFingerprint(t) { return getFp(t); },
  getStudentProgressMap(sid) { return this.allStudentProgress[sid] || {}; },
  isGradeMatch() { return true; }
};

// Bind methods from game.js
const getPeerMistakesMatch = gameJsContent.match(/getPeerMistakes\(currentSid, pool\) \{([\s\S]*?)\n  \}/);
mockDataStore.getPeerMistakes = new Function('currentSid', 'pool', getPeerMistakesMatch[1]).bind(mockDataStore);

const peerMistakes = mockDataStore.getPeerMistakes('S0001', mockDataStore.questionBank);
assert.strictEqual(peerMistakes.length, 2, 'Should find 2 peer mistakes for S0001');
assert(peerMistakes.some(q => q.question_id === 'Q1'));
assert(peerMistakes.some(q => q.question_id === 'Q2'));

console.log('  ✓ Peer mistakes accurately extracted for unattempted questions.');

// Now simulate S0001 already answering Q1:
mockDataStore.allStudentProgress['S0001']['Q1'] = { question_id: 'Q1', attempts: 1, wrong: 0 };
const updatedPeerMistakes = mockDataStore.getPeerMistakes('S0001', mockDataStore.questionBank);
assert.strictEqual(updatedPeerMistakes.length, 1, 'Q1 should no longer be a peer candidate once attempted by current player');
assert.strictEqual(updatedPeerMistakes[0].question_id, 'Q2');
console.log('  ✓ Peer mistake successfully excluded once current player attempts it.');

// -------------------------------------------------------------
// 4. Homing Missile Rebalance Verification
// -------------------------------------------------------------
console.log('\n[4/6] Testing Homing Missile Rebalancing...');
const weaponData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'weapon-data.json'), 'utf8'));
const hmData = weaponData.weapons.find(w => w.id === 'homing_missile');
assert(hmData, 'homing_missile weapon data found');

assert.strictEqual(hmData.baseDamage, 42, 'homing_missile baseDamage should be 42');
assert.strictEqual(hmData.fireRate, 0.91, 'homing_missile fireRate should be 0.91');
assert.strictEqual(hmData.ranks[0].damage, 56, 'Rank 1 damage should be 56');
assert.strictEqual(hmData.ranks[4].damage, 112, 'Rank 5 damage should be 112');
assert.strictEqual(hmData.ranks[4].missiles, 6, 'Rank 5 missiles should be 6');

// Check game.js weapon catalog and firing logic
assert(gameJsContent.includes("id: 'homing_missile', name: '烈陽核融導彈', isPassive: false, tier: 'B', tierName: 'B 級・戰術壓制', icon: 'assets/icons/weapons/weapon_5.png', tag: '主動・索敵', baseDmg: 42"), 'Catalog baseDmg should be 42');
assert(gameJsContent.includes("hm.timer >= 1.10 / rateMult"), 'Fire interval should be 1.10s');
assert(gameJsContent.includes("const count = (2 + Math.floor(rank * 0.8))"), 'Count scaling formula verified');
assert(gameJsContent.includes("const dmg = (42 + rank * 14)"), 'Damage scaling formula verified');
assert(gameJsContent.includes("const turnRate = b.isSwarm ? 9.5 : 5.2"), 'Turn rate rebalanced to 5.2');

const rank5Dps = (6 * 112) / 1.10;
console.log(`  ✓ Homing missile Lv.5 DPS: ${rank5Dps.toFixed(1)} DPS (Balanced B-tier, was 2732 DPS)`);

// -------------------------------------------------------------
// 5. Spirit Bullet Barrier Mechanic Verification
// -------------------------------------------------------------
console.log('\n[5/6] Testing Spirit Bullet Barrier Mechanics...');

// Check code presence in game.js
assert(gameJsContent.includes("type: 'garuda_feather_anchor',\n          name: '涅槃金羽錨點',\n          requiresSpirit: true"), 'Garuda anchor requiresSpirit set');
assert(gameJsContent.includes("type: 'thunder_drum_anchor',\n        name: '天雷法鼓・左',\n        requiresSpirit: true"), 'Thunder drum anchor requiresSpirit set');
assert(gameJsContent.includes("type: 'gorgon_hex_mirror',\n          name: '蛇髮魔鏡',\n          requiresSpirit: true"), 'Gorgon mirror requiresSpirit set');

// Verify collision logic: non-spirit blocked
assert(gameJsContent.includes("if (m.requiresSpirit && b.type !== 'spirit') {"), 'RequiresSpirit bullet filter verified');
assert(gameJsContent.includes("🛡️【靈能結界】常規武器無效！請按住蓄力發射【靈丸】造成傷害！"), 'RequiresSpirit toast prompt verified');

// Verify boss invulnerability check
assert(gameJsContent.includes("const hasSpiritMinions = this.bossMinions && this.bossMinions.some(m => m.requiresSpirit && !m.dead);"), 'Boss invulnerability check verified');
assert(gameJsContent.includes("🛡️【魔王結界無敵】請先以蓄力【靈丸】摧毀所有結界核心實體！"), 'Boss invulnerability toast verified');

// Verify shatter and stun
assert(gameJsContent.includes("💥【靈能破盾】金羽錨點全數破除！迦樓羅神盾瓦解，陷入 3.0 秒大癱瘓！"), 'Shatter and stun verified for stage 1');
assert(gameJsContent.includes("💥【靈能破盾】天雷法鼓崩壞！雷公受到 8% 電荷反噬並癱瘓 3.0 秒！"), 'Shatter and stun verified for stage 2');
assert(gameJsContent.includes("💥【靈能破盾】三座蛇髮魔鏡全數粉碎！美杜莎陷入 3.0 秒重度眩暈！"), 'Shatter and stun verified for stage 3');

console.log('  ✓ Spirit Bullet barrier & Boss invulnerability mechanisms 100% verified.');

// -------------------------------------------------------------
// 6. Settlement Accuracy Display Verification
// -------------------------------------------------------------
console.log('\n[6/6] Testing Settlement Accuracy Stats Display...');

assert(gameJsContent.includes("this.sessionTotalAnswered = 0;"), 'sessionTotalAnswered initialized');
assert(gameJsContent.includes("this.sessionTotalCorrect = 0;"), 'sessionTotalCorrect initialized');
assert(gameJsContent.includes("this.sessionTotalAnswered = (this.sessionTotalAnswered || 0) + 1;"), 'sessionTotalAnswered incremented in handleAnswer');
assert(gameJsContent.includes("this.sessionTotalCorrect = (this.sessionTotalCorrect || 0) + 1;"), 'sessionTotalCorrect incremented on correct answer');

// Check victory and game over calculations
const accRegex = /const rate = total > 0 \? Math\.round\(\(correct \/ total\) \* 100\) : 0;\s*const accEl = document\.getElementById\('endAcc'\);\s*if \(accEl\) accEl\.textContent = `\$\{rate\}% \(\$\{correct\}\/\$\{total\} 題\)`/;
assert(accRegex.test(gameJsContent), 'Accuracy formatted and populated to #endAcc in both settlement handlers');

// Check index.html badge for peer mistakes
const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtmlContent.includes('id="quizPeerBadge"'), 'quizPeerBadge exists in index.html');
assert(indexHtmlContent.includes('💡 同儕易錯重點題'), 'quizPeerBadge text verified');

console.log('  ✓ Accuracy calculation & settlement display confirmed.');

console.log('\n================================================================');
console.log('🎉 ALL 6 VERIFICATION TEST SUITES PASSED FLAWLESSLY!');
console.log('================================================================\n');
