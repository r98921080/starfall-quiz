'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

console.log('====================================================');
console.log('🧪 BUILD-027 VERIFICATION: Mario & Zelda Tutorial Stages, 12 Stages Expansion & Permission Lock');
console.log('====================================================\n');

// 1. Check data/boss-data.json
console.log('1. Checking data/boss-data.json:');
try {
  const bossData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'boss-data.json'), 'utf8'));
  assert(bossData.mini_boss !== undefined, 'mini_boss exists');
  assert(bossData.mini_boss_zelda !== undefined, 'mini_boss_zelda (Moblin Berserker) exists');
  assert(bossData.mini_boss_zelda.baseHp === 10000, `mini_boss_zelda HP is 10000 (actual: ${bossData.mini_boss_zelda?.baseHp})`);
  assert(bossData.mini_boss_zelda.asset === 'assets/bosses/boss_mini_zelda.png', 'mini_boss_zelda asset path is correct');

  assert(Array.isArray(bossData.bosses) && bossData.bosses.length === 12, `bosses array contains 12 bosses (actual: ${bossData.bosses?.length})`);

  const boss1 = bossData.bosses.find(b => b.stage === 1);
  assert(boss1 !== undefined && boss1.id === 'bowser', 'Stage 1 boss is Bowser');
  assert(boss1.baseHp === 16000, `Stage 1 boss HP is 16000 (actual: ${boss1?.baseHp})`);
  assert(boss1.asset === 'assets/bosses/boss_1_bowser.png', 'Stage 1 boss asset is boss_1_bowser.png');

  const boss2 = bossData.bosses.find(b => b.stage === 2);
  assert(boss2 !== undefined && boss2.id === 'calamity_ganon', 'Stage 2 boss is Calamity Ganon');
  assert(boss2.baseHp === 28000, `Stage 2 boss HP is 28000 (actual: ${boss2?.baseHp})`);
  assert(boss2.asset === 'assets/bosses/boss_2_ganon.png', 'Stage 2 boss asset is boss_2_ganon.png');

  const boss3 = bossData.bosses.find(b => b.stage === 3);
  assert(boss3 !== undefined && boss3.id === 'garuda', 'Stage 3 boss is Garuda');

  const boss4 = bossData.bosses.find(b => b.stage === 4);
  assert(boss4 !== undefined && boss4.id === 'leigong', 'Stage 4 boss is Leigong');

  const boss5 = bossData.bosses.find(b => b.stage === 5);
  assert(boss5 !== undefined && boss5.id === 'medusa', 'Stage 5 boss is Medusa');

  const boss12 = bossData.bosses.find(b => b.stage === 12);
  assert(boss12 !== undefined && boss12.id === 'tiamat', 'Stage 12 boss is Tiamat');
} catch (e) {
  assert(false, `Failed to parse boss-data.json: ${e.message}`);
}

// 2. Check Assets (Images and Audio)
console.log('\n2. Checking Assets:');
const bossData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'boss-data.json'), 'utf8'));

// Check mini boss assets
[bossData.mini_boss, bossData.mini_boss_zelda].forEach(mb => {
  const p = path.join(ROOT, mb.asset);
  assert(fs.existsSync(p) && fs.statSync(p).size > 0, `Mini-boss asset exists: ${mb.asset} (${fs.existsSync(p) ? fs.statSync(p).size + ' bytes' : 'missing'})`);
});

// Check all 12 major boss assets
bossData.bosses.forEach(b => {
  const p = path.join(ROOT, b.asset);
  assert(fs.existsSync(p) && fs.statSync(p).size > 0, `Stage ${b.stage} (${b.name}) boss asset exists: ${b.asset} (${fs.existsSync(p) ? fs.statSync(p).size + ' bytes' : 'missing'})`);
});

// Check all 12 backgrounds
for (let s = 1; s <= 12; s++) {
  const bgPath = path.join(ROOT, `assets/backgrounds/bg_stage_${s}.jpg`);
  assert(fs.existsSync(bgPath) && fs.statSync(bgPath).size > 0, `Stage ${s} background exists: assets/backgrounds/bg_stage_${s}.jpg (${fs.existsSync(bgPath) ? fs.statSync(bgPath).size + ' bytes' : 'missing'})`);
}

// 3. Check HTML UI (index.html & starfall-quiz.html)
console.log('\n3. Checking HTML UI (index.html & starfall-quiz.html):');
['index.html', 'starfall-quiz.html'].forEach(file => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert(content.includes('id="stageSelectContainer"'), `${file} contains #stageSelectContainer for permission gating`);
  assert(content.includes('id="startStageSelect"'), `${file} contains #startStageSelect`);
  assert(content.includes('id="labBossSelect"'), `${file} contains #labBossSelect`);
  
  // Count stage options in startStageSelect
  const matchStart = content.match(/id="startStageSelect"[^>]*>([\s\S]*?)<\/select>/);
  if (matchStart) {
    const opts = matchStart[1].match(/<option[^>]*>.*?<\/option>/g) || [];
    assert(opts.length === 12, `${file} startStageSelect has exactly 12 options (actual: ${opts.length})`);
    assert(opts[0].includes('庫巴') || opts[0].includes('瑪利歐'), `${file} stage 1 is Mario/Bowser`);
    assert(opts[1].includes('加儂') || opts[1].includes('薩爾達'), `${file} stage 2 is Zelda/Ganon`);
  } else {
    assert(false, `${file} could not extract startStageSelect options`);
  }

  // Count stage options in labBossSelect
  const matchLab = content.match(/id="labBossSelect"[^>]*>([\s\S]*?)<\/select>/);
  if (matchLab) {
    const opts = matchLab[1].match(/<option[^>]*>.*?<\/option>/g) || [];
    assert(opts.length === 12, `${file} labBossSelect has exactly 12 options (actual: ${opts.length})`);
  } else {
    assert(false, `${file} could not extract labBossSelect options`);
  }
});

// 4. Check game.js Implementations
console.log('\n4. Checking game.js Implementations:');
const gameJs = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');

assert(gameJs.includes('this.maxStage = 12'), 'maxStage is set to 12');
assert(gameJs.includes('Math.min(12, stage)'), 'BgmEngine.setStage clamps up to stage 12');
assert(gameJs.includes('tickStage1Mario'), 'BgmEngine has tickStage1Mario chiptune synthesis');
assert(gameJs.includes('tickStage2Zelda'), 'BgmEngine has tickStage2Zelda heroic synthesis');

assert(gameJs.includes('playMarioCoin()'), 'SoundManager has playMarioCoin()');
assert(gameJs.includes('playMarioStomp()'), 'SoundManager has playMarioStomp()');
assert(gameJs.includes('playZeldaSecretChime()'), 'SoundManager has playZeldaSecretChime()');
assert(gameJs.includes('playZeldaSwordSlash()'), 'SoundManager has playZeldaSwordSlash()');

// Check Permission gating
assert(gameJs.includes("const isTester = (curId === 'S0001')"), 'updatePermissionUI checks curId === S0001 for tester role');
assert(gameJs.includes("if (stageSelectContainer) stageSelectContainer.style.display = isTester ? '' : 'none'"), 'stageSelectContainer is hidden for non-S0001 players');
assert(gameJs.includes("const s = (isTester && select) ? (parseInt(select.value) || 1) : 1;"), 'Non-testers are forced to start at Stage 1');

// Check Wave Logic
assert(gameJs.includes("if (this.stage === 1) {") && gameJs.includes("this.spawnMajorBoss(1);"), 'Stage 1 wave 1 jumps directly to Bowser (no mini-boss)');
assert(gameJs.includes("if (this.stage === 2) {") && gameJs.includes("this.spawnMiniBoss();"), 'Stage 2 spawns mini-boss Moblin Berserker');
assert(gameJs.includes("this.stage === 2") && gameJs.includes("boss_mini_zelda"), 'spawnMiniBoss loads boss_mini_zelda for Stage 2');

// Check Boss HP
assert(gameJs.includes('16000,  // 1: 機甲庫巴'), 'Bowser HP is set to 16,000 for easy stress relief');
assert(gameJs.includes('28000,  // 2: 災厄加儂'), 'Ganon HP is set to 28,000 for balanced 30s battle');

// Check Desperation & HUD checks
assert(gameJs.includes('// 3-5 關魔王絕境背水一戰機制 (Desperation Overload - 迦樓羅/雷公/美杜莎)'), 'Desperation overload documented for stages 3-5');
assert(gameJs.includes('b.stage === 3') && gameJs.includes('garuda_feather_anchor'), 'Garuda desperation uses b.stage === 3');
assert(gameJs.includes('b.stage === 4') && gameJs.includes('thunder_drum_anchor'), 'Leigong desperation uses b.stage === 4');
assert(gameJs.includes('b.stage === 5') && gameJs.includes('gorgon_hex_mirror'), 'Medusa desperation uses b.stage === 5');

// Check Victory Text
assert(gameJs.includes('神話登頂！全十二關通關！'), 'Game victory title is updated to 全十二關通關');
assert(gameJs.includes('第 12 關 (全破)'), 'End stage text indicates 第 12 關 (全破)');
assert(gameJs.includes('十二位神話機神全數擊破'), 'Victory voice line updated to 十二位神話機神');

console.log('\n====================================================');
console.log(`Summary: Passed: ${passCount}, Failed: ${failCount}`);
console.log('====================================================');
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL VERIFICATION CHECKS PASSED!');
  process.exit(0);
}
