'use strict';
/**
 * Test Suite: v1.21 Arsenal Expansion, Tier Allocation, Zero-Repeat Mastery,
 * Boss Desperation Mechanics, and Compact 3-Choice UI
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Mock DOM and Window
global.localStorage = { getItem() { return null; }, setItem() {} };
global.Image = class { constructor() { this.src = ''; this.complete = true; this.naturalWidth = 100; } };
global.window = {
  AudioContext: class {
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
    createOscillator() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  },
  addEventListener() {},
  removeEventListener() {},
  localStorage: global.localStorage,
  location: { search: '' },
  indexedDB: null
};
global.document = {
  getElementById: (id) => ({
    textContent: '',
    style: {},
    classList: { add() {}, remove() {} },
    innerHTML: '',
    appendChild() {},
    setAttribute() {},
    addEventListener() {}
  }),
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add() {}, remove() {} },
    appendChild() {}
  }),
  addEventListener() {},
  removeEventListener() {},
  activeElement: { blur() {} }
};

// Load game.js in test context
const gameCode = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
const vm = require('vm');
const context = vm.createContext({
  ...global,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Math
});
vm.runInContext(gameCode + '\n;globalThis.Game = Game; globalThis.STARFALL_WEAPONS_CATALOG = STARFALL_WEAPONS_CATALOG;', context);

const canvas = {
  getContext: () => ({
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, closePath() {}, arc() {}, fill() {}, stroke() {},
    fillRect() {}, strokeRect() {}, clearRect() {}, moveTo() {}, lineTo() {},
    drawImage() {}, createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} })
  }),
  addEventListener() {},
  style: {},
  width: 440,
  height: 780,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 440, height: 780 })
};

const game = new context.Game(canvas);

console.log('====================================================');
console.log('🧪 RUNNING BUILD-021 VERIFICATION TEST SUITE');
console.log('====================================================\n');

// TEST 1: Catalog & Arsenal completeness (25 Weapons)
console.log('--- TEST 1: 25 WEAPONS CATALOG & ARSENAL INTEGRITY ---');
const catalog = context.STARFALL_WEAPONS_CATALOG;
assert.strictEqual(catalog.length, 25, `Expected 25 weapons in STARFALL_WEAPONS_CATALOG, got ${catalog.length}`);
console.log(`✓ STARFALL_WEAPONS_CATALOG contains exactly ${catalog.length} weapons.`);

const expectedTiers = ['C', 'B', 'A', 'S'];
catalog.forEach((w, idx) => {
  assert(w.id, `Weapon at index ${idx} missing id`);
  assert(w.name, `Weapon ${w.id} missing name`);
  assert(expectedTiers.includes(w.tier), `Weapon ${w.id} invalid tier: ${w.tier}`);
  assert(w.icon, `Weapon ${w.id} missing icon`);
  assert(game.arsenal[w.id], `Weapon ${w.id} missing from game.arsenal`);
  // Verify icon exists on disk
  const iconPath = path.join(__dirname, w.icon);
  assert(fs.existsSync(iconPath), `Icon file missing for ${w.id}: ${iconPath}`);
});
console.log('✓ All 25 weapons have valid id, name, tier (C/B/A/S), and icon file on disk.');
console.log('✓ All 25 weapons are registered in game.arsenal.');

// TEST 2: Weapon Tier Loadout Generation by Quiz Score (User Request 1)
console.log('\n--- TEST 2: WEAPON TIER DISTRIBUTION BY QUIZ RESULT ---');
// 0 correct: 3 survival perks
const choices0 = game.generateUpgradeChoices(0);
assert.strictEqual(choices0.length, 3, 'Choices for 0 correct should be 3');
assert(choices0.every(c => c.isPerk), 'All 0-correct choices must be survival perks');
console.log('✓ 0 correct answers: 100% survival perks (no weapons offered).');

// 1 or 2 correct: C tier only
for (let cCount of [1, 2]) {
  for (let trial = 0; trial < 10; trial++) {
    const choices = game.generateUpgradeChoices(cCount);
    assert.strictEqual(choices.length, 3, `Expected 3 choices for ${cCount} correct`);
    const weaponChoices = choices.filter(c => !c.isPerk && !c.isFusion);
    assert(weaponChoices.length > 0, `Expected weapon choices for ${cCount} correct`);
    weaponChoices.forEach(w => {
      assert.strictEqual(w.tierRating, 'C', `Expected only C tier for ${cCount} correct, got ${w.tierRating} (${w.name})`);
    });
  }
}
console.log('✓ 1 and 2 correct answers: Strictly C-tier weapons only (tested across 20 random rolls).');

// 3 correct: B tier or below, with at least ONE B tier guaranteed
for (let trial = 0; trial < 15; trial++) {
  const choices = game.generateUpgradeChoices(3);
  assert.strictEqual(choices.length, 3);
  const weaponChoices = choices.filter(c => !c.isPerk && !c.isFusion);
  weaponChoices.forEach(w => {
    assert(w.tierRating === 'B' || w.tierRating === 'C', `3 correct must be B or C, got ${w.tierRating}`);
  });
  const hasB = weaponChoices.some(w => w.tierRating === 'B');
  assert(hasB, '3 correct must guarantee at least one B-tier weapon');
}
console.log('✓ 3 correct answers: B or C tier, with AT LEAST ONE B-tier weapon guaranteed (tested across 15 random rolls).');

// 4 correct: A tier or below, with at least ONE A tier guaranteed
for (let trial = 0; trial < 15; trial++) {
  const choices = game.generateUpgradeChoices(4);
  assert.strictEqual(choices.length, 3);
  const weaponChoices = choices.filter(c => !c.isPerk && !c.isFusion);
  weaponChoices.forEach(w => {
    assert(w.tierRating === 'A' || w.tierRating === 'B' || w.tierRating === 'C', `4 correct must be A/B/C, got ${w.tierRating}`);
  });
  const hasA = weaponChoices.some(w => w.tierRating === 'A');
  assert(hasA, '4 correct must guarantee at least one A-tier weapon');
}
console.log('✓ 4 correct answers: A/B/C tier, with AT LEAST ONE A-tier weapon guaranteed (tested across 15 random rolls).');

// 5 correct: S tier or below, with at least ONE S tier guaranteed
for (let trial = 0; trial < 15; trial++) {
  const choices = game.generateUpgradeChoices(5);
  assert.strictEqual(choices.length, 3);
  const weaponChoices = choices.filter(c => !c.isPerk && !c.isFusion);
  const hasS = weaponChoices.some(w => w.tierRating === 'S');
  assert(hasS, '5 correct must guarantee at least one S-tier weapon');
}
console.log('✓ 5 correct answers: Guaranteed at least ONE S-tier mythical weapon (tested across 15 random rolls).');

// TEST 3: Compact UI Card Layout Data (User Request 4)
console.log('\n--- TEST 3: COMPACT 3-CHOICE UI CARD LAYOUT DATA ---');
const sampleChoices = game.generateUpgradeChoices(4);
sampleChoices.forEach(c => {
  assert(c.name, 'Card must have name');
  assert(c.icon, 'Card must have icon');
  assert(c.statProgression, 'Card must have compact statProgression');
  assert(!c.statProgression.includes('\n'), 'statProgression must be single line');
  console.log(`  - [${c.tierRating || 'Perk'}] ${c.name}: "${c.statProgression}"`);
});
console.log('✓ Card items provide compact, single-line statProgression without verbose paragraphs.');

// TEST 4: Question Bank Expansion & Zero-Repeat Cooldown (User Request 3)
console.log('\n--- TEST 4: QUESTION BANK EXPANSION & ZERO-REPEAT MASTERY ---');
const csvContent = fs.readFileSync(path.join(__dirname, 'data', 'default-question-bank.csv'), 'utf8');
const lines = csvContent.trim().split('\n').filter(l => l.trim().length > 0);
const questionCount = lines.length - 1; // subtract header
console.log(`✓ Total questions in default-question-bank.csv: ${questionCount}`);
assert(questionCount >= 150, `Expected >= 150 questions, got ${questionCount}`);

// Verify Zero-Repeat logic in pickAdaptiveQuestions
const ds = game.dataStore;
// Populate questionBank
ds.questionBank = ds.parseCSV(csvContent);
assert(ds.questionBank.length >= 150, 'DataStore questionBank must have >= 150 questions');

// Simulate student who has answered 5 questions correctly
const studentId = 'TEST_STUDENT_001';
ds.currentStudentId = studentId;
const initialPick = ds.pickAdaptiveQuestions(5);
assert.strictEqual(initialPick.length, 5);

// Record all 5 as answered correctly
initialPick.forEach(q => {
  ds.recordAttempt({
    student_id: studentId,
    question_id: q.question_id,
    selected_option: 'A',
    correct: true,
    timestamp: new Date().toISOString()
  });
});

// Pick next 5 questions 10 times in a row: NONE of the mastered questions should appear!
const answeredIds = new Set(initialPick.map(q => q.question_id));
let repeatedCount = 0;
for (let i = 0; i < 10; i++) {
  const nextPick = ds.pickAdaptiveQuestions(5);
  nextPick.forEach(q => {
    if (answeredIds.has(q.question_id)) {
      repeatedCount++;
    }
  });
}
assert.strictEqual(repeatedCount, 0, `Mastered questions repeated ${repeatedCount} times! Expected strictly 0.`);
console.log('✓ Zero-Repeat Mastery Cooldown verified: Answered questions have 0% repeat probability while fresh questions exist.');

// TEST 5: Stage 1-3 Boss Desperation Mechanics (User Requests 2 & 5)
console.log('\n--- TEST 5: STAGE 1-3 BOSS DESPERATION & ANTI-BRUTE-FORCE ---');
// Stage 1: Garuda Desperation at HP <= 15%
const garuda = { stage: 1, name: '迦樓羅', hp: 1000, maxHp: 1000, hitboxRadius: 40 };
game.currentBoss = garuda;
game.bossMinions = [];

// Deal damage bringing HP to 14%
game.damageBoss(garuda, 860, 'normal', 'bullet');
assert(garuda.desperationTriggered, 'Garuda desperation should trigger at HP <= 15%');
assert(garuda.invulnerable, 'Garuda must be invulnerable during desperation');
const featherAnchors = game.bossMinions.filter(m => m.type === 'garuda_feather_anchor');
assert.strictEqual(featherAnchors.length, 4, 'Garuda must spawn 4 feather anchors');
console.log('✓ Stage 1 Garuda: Triggers Nirvana Feather Barrier with 4 feather anchors and invulnerability at <= 15% HP.');

// Stage 2: Leigong Desperation at HP <= 15%
const leigong = { stage: 2, name: '雷公', hp: 2000, maxHp: 2000, hitboxRadius: 40 };
game.currentBoss = leigong;
game.bossMinions = [];
game.damageBoss(leigong, 1750, 'normal', 'bullet');
assert(leigong.desperationTriggered, 'Leigong desperation should trigger at HP <= 15%');
assert(leigong.invulnerable, 'Leigong must be invulnerable during desperation');
const drumAnchors = game.bossMinions.filter(m => m.type === 'thunder_drum_anchor');
assert.strictEqual(drumAnchors.length, 2, 'Leigong must spawn 2 thunder drum anchors');
console.log('✓ Stage 2 Leigong: Triggers Thunder Cage with 2 thunder drum anchors and invulnerability at <= 15% HP.');

// Stage 3: Medusa Desperation at HP <= 15%
const medusa = { stage: 3, name: '美杜莎', hp: 3000, maxHp: 3000, hitboxRadius: 40 };
game.currentBoss = medusa;
game.bossMinions = [];
game.damageBoss(medusa, 2600, 'normal', 'bullet');
assert(medusa.desperationTriggered, 'Medusa desperation should trigger at HP <= 15%');
const mirrors = game.bossMinions.filter(m => m.type === 'gorgon_hex_mirror');
assert.strictEqual(mirrors.length, 3, 'Medusa must spawn 3 hex mirrors');
console.log('✓ Stage 3 Medusa: Triggers 3 rotating Gorgon Hex-Mirrors at <= 15% HP.');

// TEST 6: 100% Graze Sync EMP Shield-Breaker
console.log('\n--- TEST 6: 100% GRAZE SYNC EMP SPIRIT BULLET SHIELD BREAKER ---');
game.player.grazeSync = 100;
game.ebullets = [{ x: 100, y: 100, r: 5 }, { x: 200, y: 200, r: 5 }];
game.spiritCharge = { isCharging: true, currentTier: 5 };
game.releaseSpiritCharge();

// 1. All enemy bullets cancelled
assert.strictEqual(game.ebullets.length, 0, 'EMP must cancel all enemy bullets');
// 2. Graze sync consumed
assert.strictEqual(game.player.grazeSync, 0, 'EMP must consume 100% Graze Sync');
// 3. Last bullet fired is EMP
const lastBullet = game.bullets[game.bullets.length - 1];
assert(lastBullet.isGrazeEmp, 'Fired Spirit bullet must have isGrazeEmp = true');
console.log('✓ 100% Graze Sync EMP: Cancels screen-wide bullets and fires overload breaker Spirit Bullet.');

console.log('\n====================================================');
console.log('🎉 ALL 6 VERIFICATION TEST SUITES PASSED PERFECTLY!');
console.log('====================================================');
