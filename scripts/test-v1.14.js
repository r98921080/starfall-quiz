/**
 * automated test suite for BUILD-019 (v1.14)
 * Verifies:
 * 1. Weapon Tier Mapping: Quiz scores 1-5 strictly map to weapon tiers (1-2: C only, 3: B guaranteed, 4: A guaranteed, 5: S guaranteed, 0: perks only)
 * 2. Active & Passive Badges: Explicit .type-badge styles and HTML generation (.type-active, .type-passive, .type-perk, .type-fusion)
 * 3. Stage 1-3 Difficulty Nerf (-40%): Boss HP (72000, 81000, 93000, mini 30000) in both boss-data.json and game.js
 * 4. 10 Boss Attribute Ultimates: All 10 bosses have 2+ themed ultimates in boss-data.json and game.js releaseBossUltimate
 * 5. Persistent Attempt Logging: Immediate GET single-attempt sync, localStorage offline queue persistence, strict sync validation
 * 6. Fusion Material Indicators: Upgrade choices annotate fusions with partner weapon names, ownership status, and .upgrade-fusion-indicator
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting StarFall Quiz BUILD-019 / v1.14 Test Suite...\n');

// 1. Check data/boss-data.json
const bossDataPath = path.join(__dirname, '..', 'data', 'boss-data.json');
assert(fs.existsSync(bossDataPath), 'data/boss-data.json must exist');
const bossData = JSON.parse(fs.readFileSync(bossDataPath, 'utf8'));

// Verify HP for stages 1-3 and mini-boss (reduced in BUILD-019 and BUILD-020)
assert([21000, 30000].includes(bossData.mini_boss.baseHp), 'Mini boss baseHp must be 21,000 (-30%) or 30,000 (-40%)');

const bStage1 = bossData.bosses.find(b => b.stage === 1);
const bStage2 = bossData.bosses.find(b => b.stage === 2);
const bStage3 = bossData.bosses.find(b => b.stage === 3);
assert([50400, 72000].includes(bStage1.baseHp), 'Stage 1 Garuda baseHp must be 50,400 or 72,000');
assert([56700, 81000].includes(bStage2.baseHp), 'Stage 2 Leigong baseHp must be 56,700 or 81,000');
assert([65100, 93000].includes(bStage3.baseHp), 'Stage 3 Medusa baseHp must be 65,100 or 93,000');

// Verify all 10 bosses have >= 2 ultimates with specific attribute themes
for (let s = 1; s <= 10; s++) {
  const stage = bossData.bosses.find(b => b.stage === s);
  assert(stage, `Stage ${s} must exist in boss-data.json`);
  assert(stage.ultimates && stage.ultimates.length >= 2, `Stage ${s} (${stage.name}) must have at least 2 ultimates`);
}
console.log('✅ 1. boss-data.json: Stage 1-3 HP nerfed and all 10 bosses have 2+ ultimates.');

// 2. Check game.js
const gameJsPath = path.join(__dirname, '..', 'game.js');
assert(fs.existsSync(gameJsPath), 'game.js must exist');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');

assert(gameJs.includes('50400') || gameJs.includes('72000'), 'spawnMajorBoss must use nerfed HP for stages 1-3');
assert(gameJs.includes('21000') || gameJs.includes('30000'), 'spawnMiniBoss must use nerfed HP for stages 1-3');

// Check releaseBossUltimate covers variant 1 for all 10 bosses
for (let s = 1; s <= 10; s++) {
  assert(gameJs.includes(`case ${s}:`), `releaseBossUltimate must have case ${s}`);
}
assert(gameJs.includes('// 新增大招 2：暴風神喙・萬里穿雲擊'), 'Stage 1 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：乾坤雷煞・雷暴核心超載'), 'Stage 2 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：邪眼凝視・深淵石化射線'), 'Stage 3 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：暴食狂宴・混沌嘔火熔流'), 'Stage 4 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：墜星天罰・億萬流星雨'), 'Stage 5 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：智慧法陣・聖光十字誅絕'), 'Stage 6 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：九首齊鳴・滅世腐蝕毒濤'), 'Stage 7 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：巨神重錘・震地熔岩碎裂波'), 'Stage 8 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：殺生結界・八面魅影幻滅'), 'Stage 9 must have ultimate variant 1');
assert(gameJs.includes('// 新增大招 2：虛數深淵・維度坍縮黑星'), 'Stage 10 must have ultimate variant 1');
console.log('✅ 2. Boss Mechanics & Ultimates: 10 bosses attribute ultimates and HP nerf confirmed in game.js.');

// 3. Check Persistent Attempt Logging & Network Resilience
assert(gameJs.includes('starfall_offline_attempt_queue_v1'), 'DataStore must use localStorage queue starfall_offline_attempt_queue_v1');
assert(gameJs.includes("action: 'attempt'") && gameJs.includes("student_id: sid"), 'recordAttempt must send immediate GET request for attempt');
assert(gameJs.includes('data.ok && (data.count !== undefined || data.attempt !== undefined)'), 'syncOfflineQueue must strictly validate sync response');
console.log('✅ 3. Persistent Attempt Logging: Immediate GET single-attempt sync & localStorage offline queue verified.');

// 4. Check style.css for badges and fusion indicators
const styleCssPath = path.join(__dirname, '..', 'style.css');
assert(fs.existsSync(styleCssPath), 'style.css must exist');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

assert(styleCss.includes('.type-badge'), 'style.css must define .type-badge');
assert(styleCss.includes('.type-badge.type-active'), 'style.css must define .type-active');
assert(styleCss.includes('.type-badge.type-passive'), 'style.css must define .type-passive');
assert(styleCss.includes('.type-badge.type-perk'), 'style.css must define .type-perk');
assert(styleCss.includes('.type-badge.type-fusion'), 'style.css must define .type-fusion');
assert(styleCss.includes('.upgrade-fusion-indicator'), 'style.css must define .upgrade-fusion-indicator');
assert(styleCss.includes('.upgrade-fusion-indicator.partner-owned'), 'style.css must define .partner-owned');
console.log('✅ 4. Visual Badges & Indicators: .type-badge, .type-active, .type-passive, .upgrade-fusion-indicator verified.');

// 5. Test Mock Game Instance for Weapon Tier Generation & Badges
// Extract STARFALL_WEAPONS_CATALOG and STARFALL_FUSIONS
const catalogMatch = gameJs.match(/const STARFALL_WEAPONS_CATALOG = (\[[\s\S]*?\]);/);
assert(catalogMatch, 'STARFALL_WEAPONS_CATALOG must be in game.js');
const STARFALL_WEAPONS_CATALOG = eval(catalogMatch[1]);

const fusionsMatch = gameJs.match(/const STARFALL_FUSIONS = (\[[\s\S]*?\]);/);
assert(fusionsMatch, 'STARFALL_FUSIONS must be in game.js');
const STARFALL_FUSIONS = eval(fusionsMatch[1]);
global.STARFALL_WEAPONS_CATALOG = STARFALL_WEAPONS_CATALOG;
global.STARFALL_FUSIONS = STARFALL_FUSIONS;

// Create mock game engine matching game.js logic
class MockGame {
  constructor() {
    this.arsenal = {};
    this.equipped = {};
    STARFALL_WEAPONS_CATALOG.forEach(w => {
      this.arsenal[w.id] = { id: w.id, rank: 0, quality: 'quality-good' };
    });
  }
  findEquippedWeapon(id) {
    return this.arsenal[id] || null;
  }
  isFusionActive(id) {
    return false;
  }
}

// Extract generateUpgradeChoices method from game.js
const start = gameJs.indexOf('generateUpgradeChoices(correctCount = 3) {') + 'generateUpgradeChoices(correctCount = 3) {'.length;
const end = gameJs.indexOf('findEquippedWeapon(id) {');
assert(start > 0 && end > start, 'generateUpgradeChoices method must be extractable from game.js');
const body = gameJs.slice(start, end).trim().replace(/}\s*$/, '');
MockGame.prototype.generateUpgradeChoices = new Function('correctCount = 3', body);

const mockGame = new MockGame();

// Test 5A: 0 correct answers -> 3 survival perks
const choices0 = mockGame.generateUpgradeChoices(0);
assert.strictEqual(choices0.length, 3, '0 correct answers must yield 3 perks');
assert(choices0.every(c => c.isPerk), 'All choices for 0 correct answers must be perks');
console.log('✅ 5A. 0 correct answers: Yields 3 emergency survival perks, 0 weapons.');

// Test 5B: 1 correct answer -> Only C tier weapons
for (let i = 0; i < 50; i++) {
  const choices1 = mockGame.generateUpgradeChoices(1);
  assert.strictEqual(choices1.length, 3, 'Must yield 3 choices');
  choices1.forEach(c => {
    assert.strictEqual(c.tierRating, 'C', `1 correct: Choice ${c.name} must be C tier, got ${c.tierRating}`);
  });
}
console.log('✅ 5B. 1 correct answer: 100% strictly C-tier weapons across 50 trials.');

// Test 5C: 2 correct answers -> Only C tier weapons
for (let i = 0; i < 50; i++) {
  const choices2 = mockGame.generateUpgradeChoices(2);
  assert.strictEqual(choices2.length, 3, 'Must yield 3 choices');
  choices2.forEach(c => {
    assert.strictEqual(c.tierRating, 'C', `2 correct: Choice ${c.name} must be C tier, got ${c.tierRating}`);
  });
}
console.log('✅ 5C. 2 correct answers: 100% strictly C-tier weapons across 50 trials.');

// Test 5D: 3 correct answers -> B and C tier weapons, guaranteed >= 1 B tier
for (let i = 0; i < 50; i++) {
  const choices3 = mockGame.generateUpgradeChoices(3);
  assert.strictEqual(choices3.length, 3, 'Must yield 3 choices');
  assert(choices3.every(c => c.tierRating === 'B' || c.tierRating === 'C'), 'All choices must be B or C tier');
  assert(choices3.some(c => c.tierRating === 'B'), 'Must guarantee at least 1 B-tier weapon');
  assert(!choices3.some(c => c.tierRating === 'S' || c.tierRating === 'A'), 'Must NOT have S or A tier');
}
console.log('✅ 5D. 3 correct answers: B and C tier weapons with guaranteed >= 1 B tier across 50 trials.');

// Test 5E: 4 correct answers -> A, B, C tier weapons, guaranteed >= 1 A tier
for (let i = 0; i < 50; i++) {
  const choices4 = mockGame.generateUpgradeChoices(4);
  assert.strictEqual(choices4.length, 3, 'Must yield 3 choices');
  assert(choices4.every(c => ['A', 'B', 'C'].includes(c.tierRating)), 'All choices must be A, B or C tier');
  assert(choices4.some(c => c.tierRating === 'A'), 'Must guarantee at least 1 A-tier weapon');
  assert(!choices4.some(c => c.tierRating === 'S'), 'Must NOT have S tier');
}
console.log('✅ 5E. 4 correct answers: A, B, C tier weapons with guaranteed >= 1 A tier across 50 trials.');

// Test 5F: 5 correct answers -> Guaranteed >= 1 S tier
for (let i = 0; i < 50; i++) {
  const choices5 = mockGame.generateUpgradeChoices(5);
  assert.strictEqual(choices5.length, 3, 'Must yield 3 choices');
  assert(choices5.some(c => c.tierRating === 'S'), 'Must guarantee at least 1 S-tier weapon');
}
console.log('✅ 5F. 5 correct answers: Guaranteed >= 1 S-tier god weapon across 50 trials.');

// Test 6: Check Fusion Material Hints
// Equipping spirit_bullet rank 1
mockGame.arsenal['spirit_bullet'].rank = 1;
// Now check choices for 5 correct (which can include grenade_launcher)
let foundFusionHintWithOwnedPartner = false;
let foundFusionHintWithoutOwnedPartner = false;
for (let i = 0; i < 100; i++) {
  const choices = mockGame.generateUpgradeChoices(5);
  choices.forEach(c => {
    if (c.fusionHints && c.fusionHints.length > 0) {
      c.fusionHints.forEach(hint => {
        if (hint.partnerId === 'spirit_bullet' && hint.hasPartner) {
          foundFusionHintWithOwnedPartner = true;
        }
        if (hint.partnerId === 'prism_wingman' && !hint.hasPartner) {
          foundFusionHintWithoutOwnedPartner = true;
        }
      });
    }
  });
  if (foundFusionHintWithOwnedPartner && foundFusionHintWithoutOwnedPartner) break;
}
assert(foundFusionHintWithOwnedPartner, 'Must correctly identify owned fusion partner (spirit_bullet -> grenade_launcher)');
assert(foundFusionHintWithoutOwnedPartner, 'Must correctly identify unowned fusion partner (prism_wingman)');
console.log('✅ 6. Fusion Material Indicators: Dynamic partner detection and ownership tags verified.');

console.log('\n🎉 ALL BUILD-019 TESTS PASSED SUCCESSFULLY! 🚀');
