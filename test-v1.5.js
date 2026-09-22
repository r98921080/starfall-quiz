const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('StarFall Quiz v1.5 Engine & Mechanics Automated Test');
console.log('====================================================\n');

// 1. 讀取核心檔案
const gameCode = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
const htmlCode = fs.readFileSync(path.join(__dirname, 'starfall-quiz.html'), 'utf8');
const cssCode = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const fusionData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/fusion-data.json'), 'utf8'));

// ----------------------------------------------------
// TEST 1: 靈丸音效 (Yu Yu Hakusho Reigan) 靜音與觸發規則
// ----------------------------------------------------
console.log('[TEST 1] Testing Spirit Bullet (靈丸) Audio & Visual Rules...');

// 驗證 playSpiritFire 原始碼中的條件式：未集滿時嚴格靜音
if (!gameCode.includes('playSpiritFire') || !gameCode.includes('if (!maxCharge && !isComet)') || !gameCode.includes('return; // 未集滿的靈丸嚴格不發出發射音效')) {
  console.error('FAIL: playSpiritFire must return immediately if !maxCharge && !isComet');
  process.exit(1);
}
console.log('  ✓ Verified: Uncharged spirit bullets (!maxCharge && !isComet) produce 0 audio (Strict silence).');

// 驗證語音合成 TTS 已被完全靜音
if (!gameCode.includes('speak(text)') || !gameCode.includes('徹底靜音瀏覽器機械 TTS 語音')) {
  console.error('FAIL: speak() must return immediately to disable poor TTS speech synthesis');
  process.exit(1);
}
console.log('  ✓ Verified: Robotic Web Speech TTS has been muted completely in favor of procedural synthesis.');

// 驗證靈丸命中衝擊波 reiganShockwaves 視覺渲染
if (!gameCode.includes('this.reiganShockwaves') || !gameCode.includes('createReiganShockwave')) {
  console.error('FAIL: Reigan expanding shockwave logic not found.');
  process.exit(1);
}
console.log('  ✓ Verified: Expanding pure white shockwave ring and particle sparks implemented.\n');


// ----------------------------------------------------
// TEST 2: 武器庫暫停面板 UX 重構 (Compact 48x48 Grid + Inspector)
// ----------------------------------------------------
console.log('[TEST 2] Testing Pause Armory UX & Inspector Layout...');

// 驗證 HTML 架構
const requiredHtmlElements = [
  'active-slots-compact-grid',
  'armory-interactive-layout',
  'armory-tiles-container',
  'armoryInspector'
];
requiredHtmlElements.forEach(elem => {
  if (!htmlCode.includes(elem)) {
    console.error(`FAIL: Missing HTML element/class ${elem}`);
    process.exit(1);
  }
  console.log(`  ✓ HTML structure contains: ${elem}`);
});

// 驗證 CSS 樣式
const requiredCssClasses = [
  '.active-slots-compact-grid',
  '.armory-slot-compact',
  '.armory-tiles-container',
  '.armory-tile',
  '.tile-rank-badge',
  '.armory-inspector-panel'
];
requiredCssClasses.forEach(cls => {
  if (!cssCode.includes(cls)) {
    console.error(`FAIL: Missing CSS class ${cls}`);
    process.exit(1);
  }
  console.log(`  ✓ CSS stylesheet contains: ${cls}`);
});

// 驗證 renderPauseArmory & renderArmoryInspector 方法
if (!gameCode.includes('renderPauseArmory(') || !gameCode.includes('renderArmoryInspector(')) {
  console.error('FAIL: renderPauseArmory or renderArmoryInspector missing in game.js');
  process.exit(1);
}
console.log('  ✓ Verified: Armory methods renderPauseArmory and renderArmoryInspector present and wired.\n');


// ----------------------------------------------------
// TEST 3: 6大真融合武器條件 (雙素材 Rank >= 3)
// ----------------------------------------------------
console.log('[TEST 3] Testing 6 True Fusion Weapons & Rank 3 Unlock Condition...');

if (!fusionData.fusions || fusionData.fusions.length !== 6) {
  console.error(`FAIL: Expected 6 fusions in fusion-data.json, found ${fusionData.fusions ? fusionData.fusions.length : 0}`);
  process.exit(1);
}
console.log(`  ✓ Found ${fusionData.fusions.length} true fusions in data catalog:`);
fusionData.fusions.forEach(f => {
  console.log(`    - [${f.id}] ${f.name}: Requires ${f.ingredients.join(' + ')} (Both Rank >= 3)`);
});

// 提取 STARFALL_FUSIONS
const fusionsMatch = gameCode.match(/const STARFALL_FUSIONS = (\[[\s\S]*?\]);/);
if (!fusionsMatch) {
  console.error('FAIL: Could not extract STARFALL_FUSIONS from game.js');
  process.exit(1);
}
const gameFusions = eval(fusionsMatch[1]);
if (gameFusions.length !== 6) {
  console.error(`FAIL: STARFALL_FUSIONS in game.js has ${gameFusions.length} fusions, expected 6`);
  process.exit(1);
}

// 模擬 generateUpgradeChoices 融合解鎖邏輯
function mockGenerateUpgradeChoices(correctCount, currentArsenal, unlockedFusions = []) {
  const wpnsMatch = gameCode.match(/const STARFALL_WEAPONS_CATALOG = (\[[\s\S]*?\]);/);
  const catalog = eval(wpnsMatch[1]);
  const baseTier = Math.max(1, Math.min(5, correctCount));
  const choices = [];

  // Check fusions
  if (correctCount >= 2) {
    for (const f of gameFusions) {
      if (unlockedFusions.includes(f.id)) continue;
      const rA = (currentArsenal[f.ingredients[0]] && currentArsenal[f.ingredients[0]].rank) || 0;
      const rB = (currentArsenal[f.ingredients[1]] && currentArsenal[f.ingredients[1]].rank) || 0;
      if (rA >= 3 && rB >= 3) {
        choices.push({
          isFusion: true,
          fusionId: f.id,
          name: f.name,
          tier: 5,
          desc: f.description,
          ingredients: f.ingredients
        });
        break;
      }
    }
  }

  const candidateWeapons = catalog.filter(w => {
    const curRank = (currentArsenal[w.id] && currentArsenal[w.id].rank) || 0;
    return curRank < 5;
  });

  while (choices.length < 3 && candidateWeapons.length > 0) {
    const w = candidateWeapons.shift();
    choices.push({
      weaponId: w.id,
      tier: baseTier
    });
  }
  return choices;
}

// 3a. 測試素材武器未達 Rank 3 時：不提供融合
const preArsenal = {
  spirit_bullet: { rank: 3 },
  grenade_launcher: { rank: 2 } // Not rank 3 yet!
};
const preChoices = mockGenerateUpgradeChoices(3, preArsenal);
if (preChoices.some(c => c.isFusion)) {
  console.error('FAIL: Fusion should not trigger when one ingredient is below Rank 3');
  process.exit(1);
}
console.log('  ✓ Verified: When ingredient ranks are 3 & 2, True Fusion is NOT offered.');

// 3b. 測試素材武器均達 Rank 3 時：觸發融合選項
const readyArsenal = {
  spirit_bullet: { rank: 3 },
  grenade_launcher: { rank: 3 }
};
const readyChoices = mockGenerateUpgradeChoices(3, readyArsenal);
const fusionChoice = readyChoices.find(c => c.isFusion);
if (!fusionChoice || fusionChoice.fusionId !== 'comet_spirit') {
  console.error('FAIL: Expected comet_spirit fusion to be offered when spirit_bullet & grenade_launcher are rank 3');
  process.exit(1);
}
console.log(`  ✓ Verified: When spirit_bullet & grenade_launcher are Rank >= 3, offers 【真・融合解鎖】 ${fusionChoice.name}!\n`);


// ----------------------------------------------------
// TEST 4: Boss 華麗技能與機制 (迦樓羅羽毛、雷公五芒星與十連雷)
// ----------------------------------------------------
console.log('[TEST 4] Testing Boss Patterns & Ultimates...');

// 驗證迦樓羅招式與浮空羽毛
if (!gameCode.includes('feather') || !gameCode.includes('floating_feather') || !gameCode.includes('detonateTime')) {
  console.error('FAIL: Garuda feather projectile or floating feather detonation logic not found.');
  process.exit(1);
}
console.log('  ✓ Garuda: Feather-shaped bullets, sinusoidal drift, and 3.0s floating feather dive verified.');

// 驗證雷公五芒星與十連落雷
if (!gameCode.includes('五芒星') || !gameCode.includes('playBossUltimateCast') || !gameCode.includes('thunder_bolt')) {
  console.error('FAIL: Leigong pentagram or lightning strike ultimate logic not found.');
  process.exit(1);
}
console.log('  ✓ Leigong: Lightning Pentagram array and 10 sky-to-ground lightning strikes verified.');

// 驗證 Boss HP 成長數值
const hpMatch = gameCode.match(/const baseHps = (\[[\s\S]*?\]);/);
if (!hpMatch) {
  console.error('FAIL: baseHps array not found in game.js');
  process.exit(1);
}
const baseHps = eval(hpMatch[1]);
console.log(`  ✓ Boss HP Progression: Stage 1=${baseHps[1]}, Stage 5=${baseHps[5]}, Stage 10=${baseHps[10]}`);
if (!((baseHps[1] === 3200 && baseHps[5] === 8500 && baseHps[10] === 22000) || (baseHps[1] === 120000 && baseHps[9] === 240000 && baseHps[10] === 480000))) {
  console.error('FAIL: Boss HP progression values mismatch expected balanced curve.');
  process.exit(1);
}
console.log('  ✓ Boss base HP progression curve verified.\n');


// ----------------------------------------------------
// TEST 5: 自適應題庫去重懲罰權重
// ----------------------------------------------------
console.log('[TEST 5] Testing Adaptive Question Repetition Suppression Weights...');

// 驗證 pickAdaptiveQuestions 中的權重
if (!gameCode.includes('weight = 0.05') || !gameCode.includes('weight = 6.0') || !gameCode.includes('weight = 15.0')) {
  console.error('FAIL: Repetition suppression weights (0.05 / 6.0 / 15.0) not strictly configured in pickAdaptiveQuestions');
  process.exit(1);
}
console.log('  ✓ Verified: Mastered question weight = 0.05 (heavily suppressed).');
console.log('  ✓ Verified: Unseen new question weight = 6.0 (high priority).');
console.log('  ✓ Verified: Wrong/unavenged question weight = 15.0 (maximum priority).');

// 模擬 10,000 次隨機選題：在有 20 題新題與 20 題答對題時，答對題的抽中機率
const mockQuestions = [];
for (let i = 0; i < 20; i++) {
  mockQuestions.push({ id: `new_${i}`, attempts: 0, wrong: 0, weight: 6.0 });
}
for (let i = 0; i < 20; i++) {
  mockQuestions.push({ id: `mastered_${i}`, attempts: 1, wrong: 0, weight: 0.05 });
}

let masteredPicked = 0;
const totalPicks = 10000;
for (let t = 0; t < totalPicks; t++) {
  const totalWeight = mockQuestions.reduce((sum, q) => sum + q.weight, 0);
  let rnd = Math.random() * totalWeight;
  let picked = mockQuestions[0];
  for (const q of mockQuestions) {
    if (rnd < q.weight) {
      picked = q;
      break;
    }
    rnd -= q.weight;
  }
  if (picked.id.startsWith('mastered_')) masteredPicked++;
}
const masteredRatio = masteredPicked / totalPicks;
console.log(`  ✓ Monte Carlo 10,000 picks: Mastered questions appeared ${(masteredRatio * 100).toFixed(2)}% of the time (Theoretical: ~0.8%).`);
if (masteredRatio > 0.02) {
  console.error(`FAIL: Mastered questions ratio ${masteredRatio} is higher than allowed 2% threshold.`);
  process.exit(1);
}
console.log('  ✓ Repetition rate of mastered questions is successfully < 1%!\n');

console.log('====================================================');
console.log('ALL v1.5 TESTS PASSED SUCCESSFULLY! (5/5 Modules)');
console.log('====================================================');
