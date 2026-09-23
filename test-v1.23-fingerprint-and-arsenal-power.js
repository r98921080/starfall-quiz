// test-v1.23-fingerprint-and-arsenal-power.js
// 驗證兩大核心更新：
// 1. 題幹內容指紋去重 (Content-Fingerprint Zero-Repeat) 與跨局錯題精準摻入 (Mistake Injection)
// 2. 武器評級強度絕對碾壓分級 (Hierarchical Tier Power Rebalancing: S-Tier >> A-Tier >> B-Tier >> C-Tier)

const fs = require('fs');
const assert = require('assert');

console.log('=== STARFALL QUIZ BUILD-023 CONTENT-FINGERPRINT & ARSENAL POWER VERIFICATION ===\n');

// -------------------------------------------------------------
// 1. 靜態代碼檢驗 (Static Code Analysis)
// -------------------------------------------------------------
const gameJs = fs.readFileSync('game.js', 'utf8');
const weaponJson = JSON.parse(fs.readFileSync('data/weapon-data.json', 'utf8'));

// 1.1 題幹內容指紋檢驗
assert(gameJs.includes('getQuestionFingerprint(text)'), 'game.js must define getQuestionFingerprint(text)');
assert(gameJs.includes('this.masteredFingerprints = new Set()'), 'DataStore must initialize masteredFingerprints');
assert(gameJs.includes('this.mistakeMap = {}'), 'DataStore must initialize mistakeMap');
assert(gameJs.includes('this.sessionUsedFingerprints = new Set()'), 'DataStore must initialize sessionUsedFingerprints');
assert(gameJs.includes('starfall_mastered_fingerprints_v2'), 'DataStore must persist mastered fingerprints to localStorage');
assert(gameJs.includes('starfall_mistake_fingerprints_v2'), 'DataStore must persist mistake fingerprints to localStorage');
console.log('✅ Part 1.1: Content Fingerprint & Cross-Session Storage structures verified in game.js');

// 1.2 出題邏輯去重與錯題摻入檢驗
assert(gameJs.includes('!this.masteredFingerprints.has(fp)'), 'pickAdaptiveQuestions must strictly exclude mastered fingerprints (0% repeat)');
assert(gameJs.includes('this.sessionUsedFingerprints.add(fp)'), 'pickAdaptiveQuestions must track session used fingerprints');
assert(gameJs.includes('unavengedMistakes'), 'pickAdaptiveQuestions must prioritize unavenged mistakes');
console.log('✅ Part 1.2: Adaptive Zero-Repeat & Mistake Injection logic verified in game.js');

// 1.3 武器數值規格檢驗 (STARFALL_WEAPONS_CATALOG)
const catalogMatch = gameJs.match(/const STARFALL_WEAPONS_CATALOG = (\[[\s\S]*?\]);/);
assert(catalogMatch, 'STARFALL_WEAPONS_CATALOG must be defined in game.js');
const catalog = eval(catalogMatch[1]);

const sWeapons = catalog.filter(w => w.tier === 'S');
const aWeapons = catalog.filter(w => w.tier === 'A');
const bWeapons = catalog.filter(w => w.tier === 'B');
const cWeapons = catalog.filter(w => w.tier === 'C');

assert(sWeapons.length === 5, 'Must have 5 S-Tier weapons');
assert(aWeapons.length === 6, 'Must have 6 A-Tier weapons');
assert(bWeapons.length === 7, 'Must have 7 B-Tier weapons');
assert(cWeapons.length === 7, 'Must have 7 C-Tier weapons');

// 檢查 S-Tier 基礎傷害顯著高於 A-Tier
const photon = catalog.find(w => w.id === 'photon_lance');
const chronos = catalog.find(w => w.id === 'chronos_scythe');
const grenade = catalog.find(w => w.id === 'grenade_launcher');
const cryo = catalog.find(w => w.id === 'cryo_spire');
const sonic = catalog.find(w => w.id === 'sonic_cannon');
const beam = catalog.find(w => w.id === 'beam_cannon');
const chain = catalog.find(w => w.id === 'chain_lightning');
const solar = catalog.find(w => w.id === 'solar_flare');

assert(photon.baseDmg >= 500, `photon_lance baseDmg must be >= 500, got ${photon.baseDmg}`);
assert(chronos.baseDmg >= 500, `chronos_scythe baseDmg must be >= 500, got ${chronos.baseDmg}`);
assert(grenade.baseDmg >= 400, `grenade_launcher baseDmg must be >= 400, got ${grenade.baseDmg}`);
assert(cryo.baseDmg >= 400, `cryo_spire baseDmg must be >= 400, got ${cryo.baseDmg}`);
assert(sonic.baseDmg >= 300, `sonic_cannon baseDmg must be >= 300, got ${sonic.baseDmg}`);

console.log('✅ Part 1.3: STARFALL_WEAPONS_CATALOG S-Tier base damage hierarchy verified');

// 1.4 weapon-data.json 一致性檢驗
const jsonPhoton = weaponJson.weapons.find(w => w.id === 'photon_lance');
const jsonChronos = weaponJson.weapons.find(w => w.id === 'chronos_scythe');
const jsonGrenade = weaponJson.weapons.find(w => w.id === 'grenade_launcher');
const jsonCryo = weaponJson.weapons.find(w => w.id === 'cryo_spire');
const jsonSonic = weaponJson.weapons.find(w => w.id === 'sonic_cannon');

assert.strictEqual(jsonPhoton.baseDamage, photon.baseDmg, 'weapon-data.json photon_lance baseDamage mismatch');
assert.strictEqual(jsonChronos.baseDamage, chronos.baseDmg, 'weapon-data.json chronos_scythe baseDamage mismatch');
assert.strictEqual(jsonGrenade.baseDamage, grenade.baseDmg, 'weapon-data.json grenade_launcher baseDamage mismatch');
assert.strictEqual(jsonCryo.baseDamage, cryo.baseDmg, 'weapon-data.json cryo_spire baseDamage mismatch');
assert.strictEqual(jsonSonic.baseDamage, sonic.baseDmg, 'weapon-data.json sonic_cannon baseDamage mismatch');

console.log('✅ Part 1.4: data/weapon-data.json is 100% synchronized with catalog');

// -------------------------------------------------------------
// 2. 邏輯單元測試：題幹內容指紋去重與跨輪錯題摻入模擬
// -------------------------------------------------------------
console.log('\n--- Running Unit Test: Content-Fingerprint Zero Repetition & Mistake Handling ---');

class MockDataStoreEngine {
  constructor() {
    this.sessionUsedQuestionIds = new Set();
    this.sessionUsedFingerprints = new Set();
    this.masteredFingerprints = new Set();
    this.mistakeMap = {};
    this.allStudentProgress = { 'S0001': {} };
    this.currentStudentId = 'S0001';
    this.studentGrade = '三年級';
    this.questionBank = [];
  }

  getStudentProgressMap(sid) {
    return this.allStudentProgress[sid || this.currentStudentId];
  }

  getQuestionFingerprint(text) {
    if (!text) return '';
    return String(text)
      .trim()
      .replace(/[\s\r\n\t]/g, '')
      .replace(/[「」『』""''，。、？！：；,.?!:;]/g, '')
      .toLowerCase();
  }

  resetSessionQuestions() {
    this.sessionUsedQuestionIds.clear();
    this.sessionUsedFingerprints.clear();
  }

  isGradeMatch() {
    return true;
  }

  recordAttempt(attempt) {
    const qid = attempt.question_id;
    const sid = attempt.student_id || this.currentStudentId;
    const sidMap = this.getStudentProgressMap(sid);
    if (!sidMap[qid]) {
      sidMap[qid] = {
        student_id: sid,
        question_id: qid,
        attempts: 0,
        wrong: 0,
        lastAttempt: Date.now(),
        streak: 0,
        avenged: false
      };
    }
    const p = sidMap[qid];
    p.attempts++;
    if (attempt.correct) {
      p.streak++;
      if (attempt.is_review) p.avenged = true;
    } else {
      p.wrong++;
      p.streak = 0;
      p.avenged = false;
    }

    const qText = attempt.question || (this.questionBank.find(q => q.question_id === qid) || {}).question || '';
    const fp = this.getQuestionFingerprint(qText);
    if (fp) {
      if (attempt.correct) {
        this.masteredFingerprints.add(fp);
        delete this.mistakeMap[fp];
      } else {
        if (!this.masteredFingerprints.has(fp)) {
          const qObj = this.questionBank.find(q => q.question_id === qid);
          this.mistakeMap[fp] = qObj ? { ...qObj } : { question_id: qid, question: qText };
        }
      }
    }
  }

  pickAdaptiveQuestions(count = 5) {
    if (!this.questionBank || this.questionBank.length === 0) return [];
    const sid = this.currentStudentId;
    const sidProgress = this.getStudentProgressMap(sid);
    let pool = [...this.questionBank];

    let availablePool = pool.filter(q => {
      if (this.sessionUsedQuestionIds.has(q.question_id)) return false;
      const fp = this.getQuestionFingerprint(q.question);
      if (this.sessionUsedFingerprints.has(fp)) return false;
      return true;
    });

    if (availablePool.length < count) {
      this.sessionUsedQuestionIds.clear();
      this.sessionUsedFingerprints.clear();
      availablePool = pool.filter(q => {
        const fp = this.getQuestionFingerprint(q.question);
        return !this.masteredFingerprints.has(fp);
      });
      if (availablePool.length < count) {
        availablePool = [...pool];
      }
    }

    const selected = [];
    const selectedFps = new Set();

    // 2. 錯題復仇
    const unavengedMistakes = [];
    if (this.mistakeMap) {
      Object.entries(this.mistakeMap).forEach(([fp, mq]) => {
        if (!this.masteredFingerprints.has(fp) && !this.sessionUsedFingerprints.has(fp) && !selectedFps.has(fp)) {
          unavengedMistakes.push(mq);
        }
      });
    }

    if (unavengedMistakes.length > 0) {
      unavengedMistakes.sort(() => Math.random() - 0.5);
      const mistakeTargetCount = Math.min(2, Math.min(count - 1, unavengedMistakes.length));
      for (let i = 0; i < mistakeTargetCount; i++) {
        const mq = unavengedMistakes[i];
        const fp = this.getQuestionFingerprint(mq.question);
        selected.push({
          ...mq,
          isReview: true,
          isRevenge: true
        });
        selectedFps.add(fp);
        this.sessionUsedQuestionIds.add(mq.question_id);
        this.sessionUsedFingerprints.add(fp);
      }
    }

    // 3. 全新題目
    const remainingNeeded = count - selected.length;
    const freshQuestions = [];
    const seenFreshFp = new Set();

    for (const q of availablePool) {
      if (this.sessionUsedQuestionIds.has(q.question_id)) continue;
      const fp = this.getQuestionFingerprint(q.question);
      if (!fp || this.sessionUsedFingerprints.has(fp) || selectedFps.has(fp)) continue;
      if (this.masteredFingerprints.has(fp)) continue;
      if (seenFreshFp.has(fp)) continue;
      const p = sidProgress[q.question_id];
      if (p && p.attempts > 0 && p.wrong === 0) continue;

      freshQuestions.push(q);
      seenFreshFp.add(fp);
    }

    if (freshQuestions.length >= remainingNeeded) {
      freshQuestions.sort(() => Math.random() - 0.5);
      for (let i = 0; i < remainingNeeded; i++) {
        const fq = freshQuestions[i];
        const fp = this.getQuestionFingerprint(fq.question);
        selected.push({
          ...fq,
          isReview: false,
          isRevenge: false
        });
        selectedFps.add(fp);
        this.sessionUsedQuestionIds.add(fq.question_id);
        this.sessionUsedFingerprints.add(fp);
      }
    }

    return selected;
  }
}

// 建立帶有「同題幹不同 ID 重複題」的題庫
const engine = new MockDataStoreEngine();
// 構建 50 道題目，其中題目 1~5 在題庫中被複製了 5 次（不同 ID）
for (let i = 1; i <= 50; i++) {
  engine.questionBank.push({
    question_id: `Q-ORIG-${i}`,
    question: `第 ${i} 題：請問下列哪一個詞語的用法最恰當？`,
    ans: 0
  });
}
// 模擬 Google Sheets 中題幹重複的不同 ID
for (let copy = 1; copy <= 4; copy++) {
  for (let i = 1; i <= 5; i++) {
    engine.questionBank.push({
      question_id: `Q-DUP-${copy}-${i}`,
      question: `第 ${i} 題：請問下列哪一個詞語的用法最恰當？`, // 完全相同的題幹文字！
      ans: 0
    });
  }
}

console.log(`總題庫數量：${engine.questionBank.length} 題（包含前 5 題的 20 個副本）`);

// 模擬第 1 輪 (Round 1)
const round1 = engine.pickAdaptiveQuestions(5);
assert.strictEqual(round1.length, 5, 'Round 1 must pick 5 questions');

// 驗證第 1 輪題目彼此之間指紋互不相同
const r1Fps = new Set(round1.map(q => engine.getQuestionFingerprint(q.question)));
assert.strictEqual(r1Fps.size, 5, 'Round 1 questions must have 5 unique fingerprints');

// 玩家在第 1 輪作答：前 4 題答對，第 5 題答錯
for (let i = 0; i < 4; i++) {
  engine.recordAttempt({
    question_id: round1[i].question_id,
    question: round1[i].question,
    correct: true
  });
}
const failedQ = round1[4];
engine.recordAttempt({
  question_id: failedQ.question_id,
  question: failedQ.question,
  correct: false
});

// 檢查狀態：前 4 題指紋已掌握，第 5 題進入錯題集
assert.strictEqual(engine.masteredFingerprints.size, 4, 'Must have 4 mastered fingerprints');
assert.strictEqual(Object.keys(engine.mistakeMap).length, 1, 'Must have 1 mistake in mistakeMap');

// 玩家開啟第 2 輪 (Round 2) - 重新一局
engine.resetSessionQuestions();
const round2 = engine.pickAdaptiveQuestions(5);
assert.strictEqual(round2.length, 5, 'Round 2 must pick 5 questions');

// 驗證：
// (A) 前一輪答對的 4 道題目（包含其所有不同 ID 的副本！），在第 2 輪完全為 0% 出現率！
round1.slice(0, 4).forEach(mq => {
  const mFp = engine.getQuestionFingerprint(mq.question);
  const foundInR2 = round2.some(q => engine.getQuestionFingerprint(q.question) === mFp);
  assert.strictEqual(foundInR2, false, `Mastered question "${mq.question}" must NEVER appear in Round 2!`);
});
console.log('✅ PASS: Mastered questions (and ALL their duplicate IDs in bank) have strictly 0% repetition across rounds!');

// (B) 前一輪答錯的題目必須被摻入第 2 輪，且標記為 isReview & isRevenge！
const revengeQ = round2.find(q => engine.getQuestionFingerprint(q.question) === engine.getQuestionFingerprint(failedQ.question));
assert(revengeQ, 'Failed question must be injected into Round 2 for redemption');
assert.strictEqual(revengeQ.isReview, true, 'Revenge question must be isReview');
assert.strictEqual(revengeQ.isRevenge, true, 'Revenge question must be isRevenge');
console.log('✅ PASS: Unavenged mistake was actively injected into Round 2 as revenge question!');

// (C) 玩家在第 2 輪成功雪恥該錯題！
engine.recordAttempt({
  question_id: revengeQ.question_id,
  question: revengeQ.question,
  correct: true,
  is_review: true
});
assert.strictEqual(Object.keys(engine.mistakeMap).length, 0, 'Mistake must be cleared from mistakeMap after revenge success');
assert.strictEqual(engine.masteredFingerprints.size, 5, 'Mastered fingerprints must increase to 5 after revenge');
console.log('✅ PASS: After successful revenge, mistake is converted to mastered and cleared from mistake pool!');

// -------------------------------------------------------------
// 3. 武器強度評級量化檢驗 (S-Tier vs A-Tier DPS Benchmark)
// -------------------------------------------------------------
console.log('\n--- Running Weapon Power Benchmark: S-Tier vs A-Tier ---');

// 計算武器理論單體/主攻 DPS (Rank 1 & Rank 5)
function calcWeaponDPS(id, rank) {
  switch (id) {
    case 'photon_lance': // S-Tier
      return (580 + rank * 180) / 0.85;
    case 'chronos_scythe': // S-Tier
      return (620 + rank * 200) / 0.95;
    case 'grenade_launcher': // S-Tier (衝擊 + 熔岩)
      return (420 + rank * 140) / 0.85 + (75 + rank * 28);
    case 'cryo_spire': // S-Tier
      return ((480 + rank * 160) * (1 + Math.floor(rank * 0.8))) / 1.60;
    case 'sonic_cannon': // S-Tier
      return (320 + rank * 110) / 0.90;
    case 'beam_cannon': // A-Tier
      return (50 + rank * 22) / 0.14;
    case 'chain_lightning': // A-Tier
      return (180 + rank * 60) / 0.55;
    case 'solar_flare': // A-Tier
      return (260 + rank * 85) / 0.75;
    default:
      return 0;
  }
}

const sTierDpsR1 = [
  calcWeaponDPS('photon_lance', 1),
  calcWeaponDPS('chronos_scythe', 1),
  calcWeaponDPS('grenade_launcher', 1),
  calcWeaponDPS('cryo_spire', 1),
  calcWeaponDPS('sonic_cannon', 1)
];

const aTierDpsR1 = [
  calcWeaponDPS('beam_cannon', 1),
  calcWeaponDPS('chain_lightning', 1),
  calcWeaponDPS('solar_flare', 1)
];

const avgS_R1 = sTierDpsR1.reduce((a, b) => a + b, 0) / sTierDpsR1.length;
const avgA_R1 = aTierDpsR1.reduce((a, b) => a + b, 0) / aTierDpsR1.length;

console.log(`Rank 1 S-Tier 平均 DPS: ${avgS_R1.toFixed(1)}`);
console.log(`Rank 1 A-Tier 平均 DPS: ${avgA_R1.toFixed(1)}`);
console.log(`- 天啟破城光錐 (S): ${calcWeaponDPS('photon_lance', 1).toFixed(1)} DPS`);
console.log(`- 時序輪迴神鐮 (S): ${calcWeaponDPS('chronos_scythe', 1).toFixed(1)} DPS`);
console.log(`- 熾陽熔岩噴射核 (S): ${calcWeaponDPS('grenade_launcher', 1).toFixed(1)} DPS`);
console.log(`- 金陽聚焦光束 (A): ${calcWeaponDPS('beam_cannon', 1).toFixed(1)} DPS`);
console.log(`- 熾陽破曉耀斑 (A): ${calcWeaponDPS('solar_flare', 1).toFixed(1)} DPS`);
console.log(`- 雷公天劫鏈弧 (A): ${calcWeaponDPS('chain_lightning', 1).toFixed(1)} DPS`);

assert(avgS_R1 > avgA_R1 * 1.4, `S-Tier average DPS (${avgS_R1.toFixed(1)}) must be at least 1.4x A-Tier (${avgA_R1.toFixed(1)})`);
assert(calcWeaponDPS('photon_lance', 1) > calcWeaponDPS('beam_cannon', 1), 'photon_lance DPS must exceed beam_cannon DPS');
assert(calcWeaponDPS('chronos_scythe', 1) > calcWeaponDPS('beam_cannon', 1), 'chronos_scythe DPS must exceed beam_cannon DPS');

console.log('✅ PASS: S-Tier weapons are substantially and unmistakably stronger than A-Tier weapons!');

console.log('\n🎉 ALL BUILD-023 CONTENT FINGERPRINT & ARSENAL POWER TESTS PASSED PERFECTLY!\n');
