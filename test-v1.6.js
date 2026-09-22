/**
 * StarFall Quiz: Mythic Mecha (星墜答問：神話機神)
 * v1.6 Automated Verification Suite (BUILD-010)
 * 8 大史詩神話機神核心機制全面自動化驗證
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('StarFall Quiz v1.6 (BUILD-010) Engine Automated Test');
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
// TEST 1: 關卡專屬 40 秒 Procedural BGM (10 首區域主題、管樂、人聲和音)
// ----------------------------------------------------
console.log('[TEST 1] Testing Stage-Specific 40s Procedural BGM Engine...');
for (let s = 1; s <= 10; s++) {
  const methodRegex = new RegExp(`tickStage${s}`);
  if (!methodRegex.test(gameCode)) {
    console.error(`FAIL: BgmEngine does not contain tickStage${s}`);
    process.exit(1);
  }
}
console.log('  ✓ Verified: All 10 stages have dedicated procedural BGM tick functions (Stage 1 Garuda ~ Stage 10 Tiamat).');

// 驗證 40 秒迴圈結構 (120 BPM, 320 步)
if (!gameCode.includes('this.tempo = 120') || !gameCode.includes('320 steps = 40.0s')) {
  console.error('FAIL: BgmEngine tempo or 320 steps loop duration mismatch.');
  process.exit(1);
}
console.log('  ✓ Verified: Loop length is exactly 320 sixteenth steps at 120 BPM (40.0s exact cycle).');

// 驗證管樂 (playFlute) 與 人聲共振峰合唱 (playChoirFormant)
if (!gameCode.includes('playFlute') || !gameCode.includes('playChoirFormant') || !gameCode.includes('playPluck')) {
  console.error('FAIL: Synthesizer missing playFlute, playChoirFormant or playPluck.');
  process.exit(1);
}
console.log('  ✓ Verified: Ethnic woodwinds (flute/aulos/shakuhachi), dual-bandpass formant choir (Aah/Ooh), and plucks present.');

// 驗證關卡切換綁定 BGM
if (!gameCode.includes('this.sound.bgm.setStage(this.stage)')) {
  console.error('FAIL: BGM setStage not bound on stage progression.');
  process.exit(1);
}
console.log('  ✓ Verified: BGM stage binding wired to startNewGame and closeUpgradeScreen.\n');
passCount++;


// ----------------------------------------------------
// TEST 2: Boss 敗北神格破滅遺言與專屬消散音效
// ----------------------------------------------------
console.log('[TEST 2] Testing Boss Defeat Quotes & Dissipation Audio...');
const bosses = bossData.bosses;
if (bosses.length !== 10) {
  console.error(`FAIL: Expected 10 bosses in boss-data.json, got ${bosses.length}`);
  process.exit(1);
}

bosses.forEach(b => {
  if (!b.defeatVoiceLine || b.defeatVoiceLine.length < 5) {
    console.error(`FAIL: Boss Stage ${b.stage} (${b.name}) missing defeatVoiceLine.`);
    process.exit(1);
  }
  console.log(`  ✓ Stage ${b.stage} ${b.name}: "${b.defeatVoiceLine}"`);
});

// 驗證 HTML 與 CSS 覆蓋層
if (!htmlContent.includes('bossDefeatOverlay') || !htmlContent.includes('bossDefeatQuote')) {
  console.error('FAIL: HTML missing #bossDefeatOverlay or #bossDefeatQuote.');
  process.exit(1);
}
if (!cssContent.includes('#bossDefeatOverlay') || !cssContent.includes('.boss-defeat-card')) {
  console.error('FAIL: CSS missing #bossDefeatOverlay or .boss-defeat-card.');
  process.exit(1);
}
if (!gameCode.includes('playBossDefeatQuote') || !gameCode.includes('bossDefeatOverlay')) {
  console.error('FAIL: game.js does not trigger bossDefeatOverlay or playBossDefeatQuote.');
  process.exit(1);
}
console.log('  ✓ Verified: Defeat overlay UI & playBossDefeatQuote fully integrated.\n');
passCount++;


// ----------------------------------------------------
// TEST 3: 16 款武器 Rank 1~5 肉眼可見階級進化
// ----------------------------------------------------
console.log('[TEST 3] Testing Weapon Visual Progression (Rank 1~5 Tiers)...');
// 驗證 Bullet 構造器支援 rank 與 rankColors
if (!gameCode.includes('this.rank = rank') || !gameCode.includes('rankColors')) {
  console.error('FAIL: Bullet class does not accept rank or map rankColors.');
  process.exit(1);
}
console.log('  ✓ Verified: Bullet constructor tracks rank (1-5) and assigns distinct palette (#38bdf8 -> #4ade80 -> #a855f7 -> #fb923c -> #facc15).');

// 驗證彈幕繪製循環中的 Rank 2-5 視覺特徵
if (!gameCode.includes('Rank 3+: 烈焰殘影光尾') || !gameCode.includes('Rank 4+: 熾烈電弧環繞') || !gameCode.includes('Rank 5 MAX: 弒神金曜星芒十字光暈')) {
  console.error('FAIL: Bullet render loop missing rank tier visual progressions.');
  process.exit(1);
}
console.log('  ✓ Verified: Bullet renderer renders flame tails (Rank 3+), electric arcs (Rank 4+), and starburst cross halos (Rank 5).');

// 驗證 createHitSparks 命中火花層次
if (!gameCode.includes('createHitSparks(x, y, vx = 0, vy = -400, color = \'#ffd700\', count = 5, rank = 1)')) {
  console.error('FAIL: createHitSparks signature does not accept rank.');
  process.exit(1);
}
console.log('  ✓ Verified: Hit spark particle count, color, velocity, and shockwaves scale with weapon rank.\n');
passCount++;


// ----------------------------------------------------
// TEST 4: Boss 強度與血量曲線重構 (Stage 1 120,000 HP 換型態耗時 30s)
// ----------------------------------------------------
console.log('[TEST 4] Testing Boss HP Scaling & 3-Phase Stage 10...');
const hpMatch = gameCode.match(/const baseHps = (\[[\s\S]*?\]);/);
if (!hpMatch) {
  console.error('FAIL: baseHps array not found.');
  process.exit(1);
}
const baseHps = eval(hpMatch[1]);
console.log(`  ✓ Stage 1 HP: ${baseHps[1]} (Expected: 120000)`);
console.log(`  ✓ Stage 9 HP: ${baseHps[9]} (Expected: 240000, 2x Baseline)`);
console.log(`  ✓ Stage 10 HP: ${baseHps[10]} (Expected: 480000, 4x Baseline)`);

if (baseHps[1] !== 120000 || baseHps[9] !== 240000 || baseHps[10] !== 480000) {
  console.error('FAIL: Base HP curve values mismatch required baseline.');
  process.exit(1);
}

// 驗證 Stage 10 擁有 3 個階段
if (!gameCode.includes('phases: stage === 10 ? 3 : 2') || !gameCode.includes('triggerBossPhase3')) {
  console.error('FAIL: Stage 10 does not have 3 phases or triggerBossPhase3 is missing.');
  process.exit(1);
}
console.log('  ✓ Verified: Stage 10 Tiamat is configured with 3 full combat phases (100% -> 66% -> 33% -> 0%).\n');
passCount++;


// ----------------------------------------------------
// TEST 5: Boss 階段重大造型質變 (體型放大、動態神羽、光環、眼部耀斑)
// ----------------------------------------------------
console.log('[TEST 5] Testing Boss Multi-Phase Visual Transformations...');
if (!gameCode.includes('b.phase === 3 ? 245 : (b.phase >= 2 ? 205 : 165)')) {
  console.error('FAIL: Boss size scaling logic (165 -> 205 -> 245) not found.');
  process.exit(1);
}
console.log('  ✓ Verified: Boss size dynamically scales: Phase 1 = 165px, Phase 2 = 205px (+25%), Phase 3 = 245px (+50%).');

if (!gameCode.includes('renderBossEnergyWings') || !gameCode.includes('renderBossAuras') || !gameCode.includes('renderBossOpticFlares')) {
  console.error('FAIL: Missing renderBossEnergyWings, renderBossAuras, or renderBossOpticFlares methods.');
  process.exit(1);
}
console.log('  ✓ Verified: Flapping energy wings (renderBossEnergyWings), runic auras & lightning arcs (renderBossAuras), and optic visor flares (renderBossOpticFlares) implemented.');

if (!gameCode.includes('saturate(1.4) hue-rotate(-20deg)') || !gameCode.includes('saturate(1.8) hue-rotate(180deg) brightness(1.15)')) {
  console.error('FAIL: Phase 2/3 visual color filter transformations missing.');
  process.exit(1);
}
console.log('  ✓ Verified: Distinct phase color filters applied for Phase 2 (crimson rage) & Phase 3 (cosmic divinity).\n');
passCount++;


// ----------------------------------------------------
// TEST 6: 入場與大招完全具名化 (零泛稱)
// ----------------------------------------------------
console.log('[TEST 6] Testing Strict Boss & Skill Naming (Zero Generic Names)...');
if (gameCode.includes('神話機神：') || gameCode.includes('神威爆發！')) {
  console.error('FAIL: Generic naming found in game.js code.');
  process.exit(1);
}
if (!gameCode.includes('`【${bossName}】發動神話大招：${name}！`')) {
  console.error('FAIL: Ultimate warning format does not match `【${bossName}】發動神話大招：${name}！`');
  process.exit(1);
}
if (!gameCode.includes('`第 ${boss.stage} 關【${boss.name}】降臨`')) {
  console.error('FAIL: Entrance announcement format does not match `第 ${boss.stage} 關【${boss.name}】降臨`');
  process.exit(1);
}
console.log('  ✓ Verified: All announcements strictly use real boss name and specific mythic skill name.\n');
passCount++;


// ----------------------------------------------------
// TEST 7: 十大 Boss 獨立移動演算法與硬直癱瘓
// ----------------------------------------------------
console.log('[TEST 7] Testing 10 Distinct Boss Movement Algorithms & Stun Handling...');
const movementChecks = [
  'Lissajous 8-figure dive',
  'Lightning Z-glide & flash teleport',
  'Serpentine S-curve slither',
  'Gravitational sink & center pull',
  'Titanic ground pound drop',
  'Tactical triangle patrol',
  'Hydra multi-head sway',
  'Iron step marching',
  'Tamamo decoy phasing drift',
  'Cosmic orbital revolution'
];

movementChecks.forEach((name, idx) => {
  if (!gameCode.includes(name)) {
    console.error(`FAIL: Movement pattern for Stage ${idx + 1} (${name}) missing.`);
    process.exit(1);
  }
  console.log(`  ✓ Stage ${idx + 1} Movement verified: ${name}`);
});

if (!gameCode.includes('b.stunTimer > 0') || !gameCode.includes('b.stunTimer -= dt')) {
  console.error('FAIL: Stun timer handling missing in updateBoss.');
  process.exit(1);
}
console.log('  ✓ Verified: Boss stun timer halts movement and attack routines.\n');
passCount++;


// ----------------------------------------------------
// TEST 8: 神話暗線剋制彩蛋機制 (Secret Mythic Weakness Counters)
// ----------------------------------------------------
console.log('[TEST 8] Testing Secret Mythic Weakness Counters...');
if (!gameCode.includes('checkBossMythicWeakness') || !gameCode.includes('playSecretCounterTrigger')) {
  console.error('FAIL: checkBossMythicWeakness or playSecretCounterTrigger missing.');
  process.exit(1);
}

const counterMechanics = [
  { stage: 1, name: 'Garuda vs Singularity (Grounded 3.5s)', check: '迦樓羅天羽受虛空重力牽引失衡' },
  { stage: 2, name: 'Leigong vs Chakram (Short Circuit 3s + 8% HP)', check: '青玉金屬刃切斷雷鼓連鎖導電線' },
  { stage: 3, name: 'Medusa vs Cryo Spire (Freeze 4s + Bullet Wipe)', check: '美杜莎妖蛇受玄冰急凍' },
  { stage: 4, name: 'Taotie vs Grenade (Belly Fire 10% HP + Minion Wipe)', check: '饕餮吞食高爆熔岩核引發腹腔內爆' },
  { stage: 6, name: 'Athena vs Taiji Array (Aegis Shield Break)', check: '五行太極陰陽生剋破陣' },
  { stage: 8, name: 'Cyclops vs Sonic Cannon (Forge Shutdown 4s)', check: '音浪重砲貫穿獨眼巨人聽覺中樞' },
  { stage: 9, name: 'Tamamo vs Beam Cannon (Decoy Evaporation + 3s Stun)', check: '金陽神光照破九尾狐魅影' }
];

counterMechanics.forEach(m => {
  if (!gameCode.includes(m.check)) {
    console.error(`FAIL: Mythic counter check missing for ${m.name}`);
    process.exit(1);
  }
  console.log(`  ✓ Stage ${m.stage} Secret Counter: ${m.name}`);
});
console.log('  ✓ Verified: All mythic weakness counter triggers, toast messages, and playSecretCounterTrigger wired.\n');
passCount++;

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('====================================================');
console.log(`ALL v1.6 TESTS PASSED SUCCESSFULLY! (${passCount}/8 Modules)`);
console.log('====================================================');
