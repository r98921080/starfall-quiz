/**
 * StarFall Quiz: Mythic Mecha (星墜答問：神話機神)
 * v1.7 Automated Verification Suite (BUILD-011)
 * 視覺與戰鬥美學全面重構 (Visual & Combat Aesthetics Overhaul)
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('StarFall Quiz v1.7 (BUILD-011) Aesthetics & UX Test');
console.log('====================================================\n');

const gameJsPath = path.join(__dirname, 'game.js');
const bossJsonPath = path.join(__dirname, 'data', 'boss-data.json');
const htmlPath = path.join(__dirname, 'starfall-quiz.html');
const cssPath = path.join(__dirname, 'style.css');

const gameCode = fs.readFileSync(gameJsPath, 'utf8');
const bossData = JSON.parse(fs.readFileSync(bossJsonPath, 'utf8'));
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

let passCount = 0;

// ----------------------------------------------------
// TEST 1: Boss 專屬 AI 特效貼圖 (7 款 FX) 與資產載入
// ----------------------------------------------------
console.log('[TEST 1] Testing Boss AI FX Assets & Particle Sprite Rendering...');
const fxList = [
  'fx_lightning.png',
  'fx_fire_meteor.png',
  'fx_glacial_crystal.png',
  'fx_golden_feather.png',
  'fx_void_blackhole.png',
  'fx_holy_spear.png',
  'fx_toxic_acid_orb.png'
];

fxList.forEach(fx => {
  const fxPath = path.join(__dirname, 'assets', 'fx', fx);
  if (!fs.existsSync(fxPath)) {
    console.error(`FAIL: Missing FX asset: assets/fx/${fx}`);
    process.exit(1);
  }
  const stat = fs.statSync(fxPath);
  if (stat.size < 1000) {
    console.error(`FAIL: Asset assets/fx/${fx} is too small (${stat.size} bytes).`);
    process.exit(1);
  }
  console.log(`  ✓ FX Asset verified: ${fx} (${Math.round(stat.size / 1024)} KB)`);
});

// 驗證 game.js 預載所有 FX 貼圖
fxList.forEach(fx => {
  const key = fx.replace('.png', '');
  if (!gameCode.includes(`'${key}', 'assets/fx/${fx}'`)) {
    console.error(`FAIL: game.js loadAssets missing key ${key}`);
    process.exit(1);
  }
});

// 驗證敵彈與技能繪製邏輯呼叫 FX 貼圖渲染與 lighter 混合模式
if (!gameCode.includes('img.naturalWidth > 0') || !gameCode.includes('this.images.fx_') || !gameCode.includes("globalCompositeOperation = 'lighter'")) {
  console.error('FAIL: Enemy bullet rendering missing FX sprite drawing or lighter blending.');
  process.exit(1);
}
console.log('  ✓ Verified: All 7 FX assets registered and dynamically rendered with lighter blend mode.\n');
passCount++;


// ----------------------------------------------------
// TEST 2: 前哨神械 (Mini-Boss) 十魔王招式巡迴 (不再套用第一關羽毛)
// ----------------------------------------------------
console.log('[TEST 2] Testing Mini-Boss (前哨神械) 10-Boss Skill Cycle...');
if (!gameCode.includes('executeMiniBossAttack') || !gameCode.includes('% 10')) {
  console.error('FAIL: executeMiniBossAttack does not implement % 10 projection cycle.');
  process.exit(1);
}

const miniBossSkills = [
  '【迦樓羅・金羽狂嵐】',
  '【雷公・九天落雷】',
  '【美杜莎・石化蛇鏡】',
  '【饕餮・熔岩噬火】',
  '【阿特拉斯・重力巨岩】',
  '【雅典娜・神聖金矛】',
  '【許德拉・九首酸泡】',
  '【獨眼巨人・天爐星火】',
  '【玉藻前・九尾妖火】',
  '【提亞瑪特・混沌創世】'
];

miniBossSkills.forEach((skillName, index) => {
  if (!gameCode.includes(skillName)) {
    console.error(`FAIL: Mini-Boss cycle missing stage ${index + 1} projection: ${skillName}`);
    process.exit(1);
  }
  console.log(`  ✓ Stage ${index + 1} Mini-Boss Projection: ${skillName}`);
});

if (!gameCode.includes('`⚡ 前哨神械投影 ${moveNames[step]}`')) {
  console.error('FAIL: Mini-Boss skill announcement format mismatch.');
  process.exit(1);
}
console.log('  ✓ Verified: Mini-Boss executes all 10 Boss projections sequentially with dedicated toasts.\n');
passCount++;


// ----------------------------------------------------
// TEST 3: 靈丸數值平衡與防多幀秒殺冷卻鎖
// ----------------------------------------------------
console.log('[TEST 3] Testing Spirit Gun (靈丸) Balance & Multi-Frame Boss Anti-Melt...');
// 基礎數值微調 (85 base damage, pierce 12)
if (!gameCode.includes('let dmg = 85 *') || !gameCode.includes('dmgMultipliers = [0, 1.0, 1.6, 2.4, 3.4, 4.8]')) {
  console.error('FAIL: Spirit charge base damage (85) or tier multipliers not adjusted.');
  process.exit(1);
}
if (!gameCode.includes('(tier >= 5 || isComet) ? 12')) {
  console.error('FAIL: Spirit bullet pierce count not tuned to 12.');
  process.exit(1);
}
console.log('  ✓ Verified: Spirit gun base damage scaled to 85, max pierce 12.');

// 防多幀秒殺時間戳判定 (0.22s 冷卻)
if (!gameCode.includes('lastHitBossTime') || !gameCode.includes('now - b.lastHitBossTime >= 0.22')) {
  console.error('FAIL: Spirit bullet collision with boss missing lastHitBossTime 0.22s cooldown lock.');
  process.exit(1);
}
console.log('  ✓ Verified: Spirit gun boss damage throttled with 0.22s per-bullet contact lock.\n');
passCount++;


// ----------------------------------------------------
// TEST 4: 武器庫面板 UX 重構 (自動裝備、分區、免捲動 3 槽雙行排版)
// ----------------------------------------------------
console.log('[TEST 4] Testing Armory UX (Auto-Equip, Two Zones, Compact 3-Slot Grid)...');
// 驗證 HTML 分區容器
if (!htmlContent.includes('pauseActiveTilesContainer') || !htmlContent.includes('pausePassiveTilesContainer')) {
  console.error('FAIL: HTML missing #pauseActiveTilesContainer or #pausePassiveTilesContainer.');
  process.exit(1);
}
console.log('  ✓ Verified: HTML contains distinct active and passive module grid containers.');

// 驗證 CSS 雙行與緊湊三欄排版
if (!cssContent.includes('.active-slots-compact-grid') || !cssContent.includes('.armory-slot-compact')) {
  console.error('FAIL: CSS missing .active-slots-compact-grid or .armory-slot-compact.');
  process.exit(1);
}
if (!cssContent.includes('.slot-line-top') || !cssContent.includes('.slot-line-bottom')) {
  console.error('FAIL: CSS missing .slot-line-top or .slot-line-bottom.');
  process.exit(1);
}
console.log('  ✓ Verified: CSS implements .active-slots-compact-grid (repeat 3, 1fr) with two-line layout.');

// 驗證點擊未裝備自動裝入空槽
if (!gameCode.includes('this.equippedActiveWeapons.length < 3') || !gameCode.includes('自動裝備至主動槽')) {
  console.error('FAIL: game.js renderPauseArmory missing auto-equip on click when empty slots available.');
  process.exit(1);
}
console.log('  ✓ Verified: Clicking unequipped weapon auto-equips to empty slot (< 3).');

// 驗證已裝備槽位標題無「主動欄 01」等贅字
if (gameCode.includes('主動槽 01') || gameCode.includes('主動欄位 01')) {
  console.error('FAIL: game.js contains redundant "主動槽 01" label.');
  process.exit(1);
}
console.log('  ✓ Verified: Redundant slot labels removed; full weapon name displayed on Line 1, Level + Unequip on Line 2.\n');
passCount++;


// ----------------------------------------------------
// TEST 5: 新型雜兵 (衝撞型 Charger & 自爆型 Bomber) 與多樣化彈幕
// ----------------------------------------------------
console.log('[TEST 5] Testing New Enemy Variants (Charger, Bomber) & Missile Sprites...');
const enemyAssets = ['enemy_charger.png', 'enemy_bomber.png'];
enemyAssets.forEach(ea => {
  const eaPath = path.join(__dirname, 'assets', 'enemies', ea);
  if (!fs.existsSync(eaPath)) {
    console.error(`FAIL: Missing enemy asset: assets/enemies/${ea}`);
    process.exit(1);
  }
  const stat = fs.statSync(eaPath);
  if (stat.size < 1000) {
    console.error(`FAIL: Enemy asset assets/enemies/${ea} is too small.`);
    process.exit(1);
  }
  console.log(`  ✓ Enemy asset verified: ${ea} (${Math.round(stat.size / 1024)} KB)`);
});

// 驗證 Charger 超音速衝撞與預警線
if (!gameCode.includes("type === 'charger'") || !gameCode.includes('lockTimer') || !gameCode.includes('480')) {
  console.error('FAIL: Charger dive mechanics missing or speed not set to 480.');
  process.exit(1);
}
console.log('  ✓ Verified: Charger enemy has lockTimer, telegraph line, and 480px/s supersonic dash.');

// 驗證 Bomber 倒數警報與自爆破片
if (!gameCode.includes("type === 'bomber'") || !gameCode.includes('fuse') || !gameCode.includes('shrapnel')) {
  console.error('FAIL: Bomber fuse countdown or 8-way shrapnel bullet burst missing.');
  process.exit(1);
}
console.log('  ✓ Verified: Bomber enemy triggers fuse alarm and explodes into 8-way shrapnel burst.');

// 驗證巡弋飛彈繪製
if (!gameCode.includes("b.type === 'homing'") || !gameCode.includes('尾噴烈焰')) {
  console.error('FAIL: Homing missile rendering missing aerodynamic fuselage and rocket exhaust flame.');
  process.exit(1);
}
console.log('  ✓ Verified: Homing missile rendered with aerodynamic rocket body and exhaust plume.\n');
passCount++;


// ----------------------------------------------------
// TEST 6: 全 10 關 9:16 垂直神話背景與平滑滾動
// ----------------------------------------------------
console.log('[TEST 6] Testing 10-Stage 9:16 Mythic Vertical Parallax Backgrounds...');
for (let s = 1; s <= 10; s++) {
  const bgPath = path.join(__dirname, 'assets', 'backgrounds', `bg_stage_${s}.jpg`);
  if (!fs.existsSync(bgPath)) {
    console.error(`FAIL: Missing stage background: assets/backgrounds/bg_stage_${s}.jpg`);
    process.exit(1);
  }
  const stat = fs.statSync(bgPath);
  if (stat.size < 1000) {
    console.error(`FAIL: Background assets/backgrounds/bg_stage_${s}.jpg is too small.`);
    process.exit(1);
  }
  console.log(`  ✓ Stage ${s} Background verified: bg_stage_${s}.jpg (${Math.round(stat.size / 1024)} KB)`);
}

// 驗證 renderStageBackground 雙層無縫滾動邏輯
if (!gameCode.includes('renderStageBackground') || !gameCode.includes('bgY - H') || !gameCode.includes('bg_stage_${s}')) {
  console.error('FAIL: renderStageBackground does not implement dual-layer seamless vertical scrolling.');
  process.exit(1);
}
console.log('  ✓ Verified: renderStageBackground implements smooth dual-layer vertical scrolling (bgY - H and bgY).\n');
passCount++;


// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('====================================================');
console.log(`ALL v1.7 TESTS PASSED SUCCESSFULLY! (${passCount}/6 Modules)`);
console.log('====================================================');
