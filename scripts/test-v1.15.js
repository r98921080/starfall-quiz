/**
 * scripts/test-v1.15.js
 * BUILD-020 Automated Verification Test Suite
 * 
 * Verifies:
 * 1. Name 4-state visual differentiation styles & classes in style.css and game.js
 * 2. Stage 1-3 Boss HP reduced by 30% in data/boss-data.json and game.js
 * 3. Stage 1-3 Boss bullet counts reduced by 30% in game.js
 * 4. Garuda Phase 2 Feather Barrier (10,000 HP, absorption, 1.8s stun) & rendering
 * 5. Leigong Phase 2 Thunder Stun (0.5s stun every 3s, telegraph)
 * 6. Medusa Phase 2 Gorgon Slow (-50% move speed, beam cannon 4s purge)
 * 7. Comprehensive 10-Boss Strategy Guide in docs/BOSS_STRATEGY_GUIDE.md
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('🚀 Running BUILD-020 Test Suite: Name Differentiation, Stage 1-3 Nerf (-30%), Boss Mechanics & Strategy Guide...\n');

// 1. Name Differentiation Styles in style.css
test('style.css defines .name-active, .name-passive, .name-perk, .name-fusion with glowing & border styles', () => {
  const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
  assert(css.includes('.upgrade-name.name-active'), 'Missing .upgrade-name.name-active');
  assert(css.includes('.upgrade-name.name-passive'), 'Missing .upgrade-name.name-passive');
  assert(css.includes('.upgrade-name.name-perk'), 'Missing .upgrade-name.name-perk');
  assert(css.includes('.upgrade-name.name-fusion'), 'Missing .upgrade-name.name-fusion');
  assert(css.includes('fusionNameGlow'), 'Missing fusionNameGlow animation');
  assert(css.includes('.upgrade-card.card-active'), 'Missing card-active border accent');
  assert(css.includes('.upgrade-card.card-fusion'), 'Missing card-fusion border accent');
});

// 2. OpenUpgradeScreen generates correct nameClass and cardTypeClass in game.js
test('game.js openUpgradeScreen assigns nameClass and cardTypeClass across 4 states', () => {
  const js = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  assert(js.includes("let nameClass = 'name-active';"), 'Missing default nameClass');
  assert(js.includes("nameClass = 'name-fusion';"), 'Missing name-fusion assignment');
  assert(js.includes("nameClass = 'name-perk';"), 'Missing name-perk assignment');
  assert(js.includes("nameClass = 'name-passive';"), 'Missing name-passive assignment');
  assert(js.includes('${nameClass}'), 'Missing nameClass injection in card innerHTML');
});

// 3. Stage 1-3 Boss Base HP reduced by 30% in data/boss-data.json
test('data/boss-data.json has 30% reduced HP for stages 1-3 and mini-boss', () => {
  const bossData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/boss-data.json'), 'utf8'));
  assert.strictEqual(bossData.mini_boss.baseHp, 21000, 'Mini-boss HP should be 21,000');
  const garuda = bossData.bosses.find(b => b.id === 'garuda');
  const leigong = bossData.bosses.find(b => b.id === 'leigong');
  const medusa = bossData.bosses.find(b => b.id === 'medusa');
  assert.strictEqual(garuda.baseHp, 50400, 'Garuda HP should be 50,400');
  assert.strictEqual(leigong.baseHp, 56700, 'Leigong HP should be 56,700');
  assert.strictEqual(medusa.baseHp, 65100, 'Medusa HP should be 65,100');
});

// 4. Stage 1-3 Base HP in game.js spawnMajorBoss and spawnMiniBoss
test('game.js baseHps array and spawnMiniBoss reflect 30% reduction', () => {
  const js = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  assert(js.includes('50400'), 'game.js missing Garuda HP 50400');
  assert(js.includes('56700'), 'game.js missing Leigong HP 56700');
  assert(js.includes('65100'), 'game.js missing Medusa HP 65100');
  assert(js.includes('21000'), 'game.js missing Mini-Boss HP 21000');
});

// 5. Stage 1-3 Bullet counts reduced by 30% in game.js
test('game.js has reduced bullet counts for stages 1-3 in miniBossAttack, executeBossUniqueAttack, releaseBossUltimate', () => {
  const js = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  // MiniBoss
  assert(js.includes('3 向金羽風刃'), 'MiniBoss Garuda attack should be 3-way');
  assert(js.includes('2 道垂直落雷預警'), 'MiniBoss Leigong attack should be 2-way');
  assert(js.includes('5 向蛇髮石化光線'), 'MiniBoss Medusa attack should be 5-way');
  // Garuda unique attack
  assert(js.includes('模式 1：神鳥羽刃旋風 (Feather Barrage) - 7 -> 5 枚金羽'), 'Garuda unique attack feather count reduced');
  // Garuda ultimate attack
  assert(js.includes('const featherCount = 16;'), 'Garuda Ult 1 featherCount should be 16 (down from 24)');
  assert(js.includes('原8發減少30%為5發'), 'Garuda Ult 2 bullet count should be 5');
  // Leigong ultimate attack
  assert(js.includes('原4道/20發減少30%為3道/13發'), 'Leigong Ult 1 bullet counts reduced');
  assert(js.includes('原16發減少30%為11發'), 'Leigong Ult 2 bullet counts reduced');
  // Medusa ultimate attack
  assert(js.includes('原20發減少30%為14發紫色旋轉鏡面光束'), 'Medusa Ult 1 bullet counts reduced');
  assert(js.includes('原14發減少30%為9發毒晶碎屑'), 'Medusa Ult 2 bullet counts reduced');
});

// 6. Garuda Phase 2 Feather Barrier (10,000 HP, stun 1.8s, shield rendering)
test('game.js implements Garuda Phase 2 featherBarrierHp (10000 HP), absorption, break stun (1.8s)', () => {
  const js = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  assert(js.includes('boss.featherBarrierHp = 10000'), 'Missing featherBarrierHp = 10000 initialization');
  assert(js.includes('boss.stunTimer = 1.8'), 'Missing Garuda shield break 1.8s stun');
  assert(js.includes('金羽神盾環繞羽刃屏障'), 'Missing Garuda feather barrier aura rendering');
});

// 7. Leigong Phase 2 Shock Stun (0.5s stun every 3s, telegraph)
test('game.js implements Leigong Phase 2 shockCycleTimer, telegraph (0.6s) and player stun (0.5s)', () => {
  const js = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  assert(js.includes('b.shockCycleTimer'), 'Missing shockCycleTimer');
  assert(js.includes('this.player.stunTimer = 0.5'), 'Missing player stun 0.5s assignment');
  assert(js.includes('九天磁暴預警'), 'Missing telegraph notification');
  assert(js.includes('if (this.player.stunTimer && this.player.stunTimer > 0) return;'), 'Missing pointer/keyboard stun check');
});

// 8. Medusa Phase 2 Gorgon Slow (-50% move speed, beam cannon purge)
test('game.js implements Medusa Phase 2 gorgonSlowActive (-50% speed) and beam cannon purge', () => {
  const js = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  assert(js.includes('this.player.gorgonSlowActive = true'), 'Missing gorgonSlowActive activation');
  assert(js.includes('0.22 * slow'), 'Missing player movement slow multiplier');
  assert(js.includes('gorgonPurgeTimer'), 'Missing gorgonPurgeTimer handling');
  assert(js.includes('驅散美杜莎石化凝視'), 'Missing beam cannon purge toast');
});

// 9. docs/BOSS_STRATEGY_GUIDE.md exists and covers all 10 bosses
test('docs/BOSS_STRATEGY_GUIDE.md exists and contains guides for all 10 Bosses', () => {
  const guidePath = path.join(__dirname, '../docs/BOSS_STRATEGY_GUIDE.md');
  assert(fs.existsSync(guidePath), 'docs/BOSS_STRATEGY_GUIDE.md does not exist');
  const content = fs.readFileSync(guidePath, 'utf8');
  const expectedBosses = [
    '迦樓羅',
    '雷公',
    '美杜莎',
    '饕餮',
    '阿特拉斯',
    '雅典娜',
    '許德拉',
    '獨眼巨人',
    '玉藻前',
    '提亞瑪特'
  ];
  for (const b of expectedBosses) {
    assert(content.includes(b), `Strategy guide missing section for boss: ${b}`);
  }
  assert(content.includes('金羽天罡神盾屏障'), 'Guide missing Garuda feather barrier details');
  assert(content.includes('九天磁暴・靜電拘束'), 'Guide missing Leigong thunder stun details');
  assert(content.includes('美杜莎之眸・石化凝視領域'), 'Guide missing Medusa stone gaze details');
});

console.log(`\n========================================`);
console.log(`Results: ${passedTests}/${totalTests} Tests Passed`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
