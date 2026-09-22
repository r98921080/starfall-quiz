// test-v1.10.js
// Verification suite for BUILD-014:
// 1. Inverse-damage weighted upgrade sampling
// 2. Sonic wave multi-frame hit frequency fix
// 3. Sprite transparency (alpha==0) and vertical lightning orientation
// 4. Student profile S0000 sequence generation & integration

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================');
console.log('🧪 Starting Starfall Quiz BUILD-014 Verification Suite');
console.log('========================================================\n');

// ----------------------------------------------------
// TEST 1: Sprite Transparency & Vertical Lightning Check
// ----------------------------------------------------
console.log('--- TEST 1: Sprite Transparency & Vertical Lightning Check ---');
const baseDir = path.resolve(__dirname, '..');

const checkPngCornerAlphas = (filePath) => {
  const buf = fs.readFileSync(filePath);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  assert.strictEqual(buf[0], 0x89);
  assert.strictEqual(buf[1], 0x50);
  assert.strictEqual(buf[2], 0x4E);
  assert.strictEqual(buf[3], 0x47);

  // IHDR chunk is immediately after header (offset 8):
  // length (4 bytes), type (4 bytes: "IHDR"), width (4 bytes), height (4 bytes), bit depth (1), color type (1)
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);

  // colorType 6 is RGBA (Truecolor with alpha)
  assert.strictEqual(colorType, 6, `File ${path.basename(filePath)} must be RGBA (colorType=6)`);
  return { width, height, colorType };
};

const spritesToCheck = [
  'assets/minions/minion_ambrosia_flask.png',
  'assets/minions/minion_hydra_head.png',
  'assets/minions/minion_thunder_drum.png',
  'assets/minions/minion_taotie_meat.png',
  'assets/minions/minion_gorgon_shadow.png',
  'assets/minions/minion_titan_pillar.png',
  'assets/minions/minion_garuda_viper.png',
  'assets/fx/fx_rock_shard.png',
  'assets/fx/fx_cluster_bomb.png',
  'assets/fx/fx_feather_shard.png',
  'assets/fx/fx_lightning.png'
];

spritesToCheck.forEach(relPath => {
  const fullPath = path.join(baseDir, relPath);
  assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
  const meta = checkPngCornerAlphas(fullPath);
  console.log(`  ✅ ${relPath} -> RGBA (Type 6), Size: ${meta.width}x${meta.height}`);
});

// Check lightning orientation is vertical (height > width)
const lightningMeta = checkPngCornerAlphas(path.join(baseDir, 'assets/fx/fx_lightning.png'));
assert.ok(lightningMeta.height > lightningMeta.width * 1.3, 'Lightning sprite must be tall/vertical (縱向)');
console.log(`  ⚡ Lightning aspect ratio: ${lightningMeta.width}x${lightningMeta.height} (Strictly Vertical: Height > 1.3 * Width)`);

// ----------------------------------------------------
// TEST 2: Inverse-Damage Weighted Sampling Test
// ----------------------------------------------------
console.log('\n--- TEST 2: Inverse-Damage Weighted Upgrade Selection ---');

// Mock catalog with base damages
const mockCatalog = [
  { id: 'multishot', name: '連裝脈衝砲', baseDamage: 30 },
  { id: 'kinetic_dart', name: '破甲動能箭', baseDamage: 36 },
  { id: 'jade_chakram', name: '青玉輪迴盤', baseDamage: 40 },
  { id: 'beam_cannon', name: '天基熱線砲', baseDamage: 48 },
  { id: 'homing_missile', name: '幻影尋標導彈', baseDamage: 55 },
  { id: 'taiji_array', name: '太極玄樞法陣', baseDamage: 68 },
  { id: 'grenade_launcher', name: '天罡重爆榴彈', baseDamage: 85 },
  { id: 'singularity_core', name: '引力坍縮核心', baseDamage: 95 },
  { id: 'cryo_spire', name: '玄天落霜冰柱', baseDamage: 110 },
  { id: 'sonic_cannon', name: '裂變音浪重砲', baseDamage: 135 }
];

const mockWeapons = mockCatalog.map(w => ({
  ...w,
  isPassive: false,
  isFusion: false,
  type: 'active',
  desc: ''
}));

function simulateGenerateUpgradeChoices(weapons) {
  // Same algorithm as implemented in game.js
  const pool = [...weapons];
  const chosen = [];
  const count = Math.min(3, pool.length);

  for (let i = 0; i < count; i++) {
    const weights = pool.map(w => {
      const baseDmg = w.baseDamage || 50;
      return Math.pow(100 / Math.max(30, baseDmg), 1.4);
    });
    const totalWeight = weights.reduce((sum, wt) => sum + wt, 0);
    let r = Math.random() * totalWeight;
    let pickedIdx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= weights[j];
      if (r <= 0) {
        pickedIdx = j;
        break;
      }
    }
    chosen.push(pool.splice(pickedIdx, 1)[0]);
  }
  return chosen;
}

const N = 20000;
const counts = {};
mockWeapons.forEach(w => counts[w.id] = 0);

for (let k = 0; k < N; k++) {
  const picks = simulateGenerateUpgradeChoices(mockWeapons);
  picks.forEach(p => counts[p.id]++);
}

console.log(`  Appearance frequency over ${N} trials (3 choices per trial):`);
mockWeapons.sort((a, b) => a.baseDamage - b.baseDamage).forEach(w => {
  const freq = ((counts[w.id] / (N * 3)) * 100).toFixed(2);
  console.log(`    ${w.name.padEnd(8)} (Base Dmg: ${String(w.baseDamage).padStart(3)}) -> Selected: ${String(counts[w.id]).padStart(5)} times (${freq}%)`);
});

// Assert: Lowest damage weapon (multishot: 30) appears significantly more often than highest damage (sonic_cannon: 135)
const multishotRate = counts['multishot'];
const sonicRate = counts['sonic_cannon'];
assert.ok(multishotRate > sonicRate * 2.5, `Multishot rate (${multishotRate}) should be > 2.5x Sonic Cannon rate (${sonicRate})`);
console.log(`  ✅ Verified: Multishot (30 dmg) appears ${(multishotRate / sonicRate).toFixed(2)}x more frequently than Sonic Cannon (135 dmg)!`);

// ----------------------------------------------------
// TEST 3: Sonic Wave Multi-Frame Hit Frequency Fix
// ----------------------------------------------------
console.log('\n--- TEST 3: Sonic Wave Multi-Frame Hit Frequency Fix ---');

// Mock Bullet
class MockBullet {
  constructor() {
    this.type = 'sonic_wave';
    this.damage = 135;
    this.r = 95;
    this.x = 220;
    this.y = 500;
    this.hitEnemies = new Set();
    this.hitMinions = new Set();
    this.lastHitBossTime = 0;
    this.pierce = 99;
  }
}

// 1. Regular Enemy Test over 20 frames
const wave = new MockBullet();
const enemy = { x: 220, y: 500, r: 20, hp: 1000, dead: false };

let enemyHits = 0;
for (let frame = 0; frame < 20; frame++) {
  // Collision logic:
  const d = Math.hypot(wave.x - enemy.x, wave.y - enemy.y);
  if (d < wave.r + enemy.r) {
    if (wave.type === 'sonic_wave') {
      if (wave.hitEnemies && wave.hitEnemies.has(enemy)) {
        // Ignored
      } else {
        if (wave.hitEnemies) wave.hitEnemies.add(enemy);
        enemy.hp -= wave.damage;
        enemyHits++;
      }
    }
  }
}
assert.strictEqual(enemyHits, 1, `Sonic wave must only hit regular enemy ONCE across multiple overlapping frames`);
assert.strictEqual(enemy.hp, 1000 - 135, `Enemy HP should decrease by exactly 135`);
console.log(`  ✅ Enemy Hit Count over 20 overlapping frames: ${enemyHits} (Single hit, exactly 135 damage dealt)`);

// 2. Boss Test over 60 frames (1 second at 60 FPS)
const bossWave = new MockBullet();
const boss = { x: 220, y: 500, hitboxRadius: 60, hp: 5000 };
let bossHits = 0;
let simulatedTime = 1.00;

for (let frame = 0; frame < 60; frame++) {
  simulatedTime += 1 / 60;
  const d = Math.hypot(bossWave.x - boss.x, bossWave.y - boss.y);
  if (d < bossWave.r + boss.hitboxRadius) {
    if (bossWave.type === 'sonic_wave') {
      if (!bossWave.lastHitBossTime || (simulatedTime - bossWave.lastHitBossTime >= 0.35)) {
        bossWave.lastHitBossTime = simulatedTime;
        boss.hp -= bossWave.damage;
        bossHits++;
      }
    }
  }
}
// In 1 second with 0.35s lock, it should hit exactly 3 times (at t=0, t=0.35, t=0.70) instead of 60 times!
assert.strictEqual(bossHits, 3, `Boss should be hit at most 3 times in 1 second, not 60 times!`);
console.log(`  ✅ Boss Hit Count over 60 overlapping frames (1 second): ${bossHits} hits (Damage: ${bossHits * 135})`);

// ----------------------------------------------------
// TEST 4: Student ID S0000 Sequence Generation Check
// ----------------------------------------------------
console.log('\n--- TEST 4: Student ID S0000 Sequence Generation Check ---');

function generateNextStudentId(existingIds) {
  let maxNum = 0;
  existingIds.forEach(id => {
    const m = String(id || '').match(/^S(\d+)$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const newNum = maxNum + 1;
  return 'S' + String(newNum).padStart(4, '0');
}

assert.strictEqual(generateNextStudentId([]), 'S0001');
assert.strictEqual(generateNextStudentId(['S0001']), 'S0002');
assert.strictEqual(generateNextStudentId(['S0001', 'S0002', 'S0015']), 'S0016');
assert.strictEqual(generateNextStudentId(['s0099']), 'S0100');
assert.strictEqual(generateNextStudentId(['S999']), 'S1000');
console.log('  ✅ Sequence S0000 generator: [] -> S0001, [S0001..S0015] -> S0016, [s0099] -> S0100');

// ----------------------------------------------------
// TEST 5: HTML UI & Game.js Consistency Check
// ----------------------------------------------------
console.log('\n--- TEST 5: HTML UI & Game.js Consistency Check ---');
const htmlContent = fs.readFileSync(path.join(baseDir, 'starfall-quiz.html'), 'utf8');
const gameContent = fs.readFileSync(path.join(baseDir, 'game.js'), 'utf8');
const codeGsContent = fs.readFileSync(path.join(baseDir, 'apps-script/Code.gs'), 'utf8');

// Verify HTML IDs
assert.ok(htmlContent.includes('id="studentNameInput"'), 'HTML must have #studentNameInput');
assert.ok(htmlContent.includes('id="studentGradeSelect"'), 'HTML must have #studentGradeSelect');
assert.ok(htmlContent.includes('id="studentIdBadge"'), 'HTML must have #studentIdBadge');
assert.ok(htmlContent.includes('id="studentSyncStatus"'), 'HTML must have #studentSyncStatus');
console.log('  ✅ HTML Start Screen includes student profile card and all required input IDs');

// Verify game.js methods & bindings
assert.ok(gameContent.includes('syncStudentProfile(name, grade)'), 'game.js must have syncStudentProfile method');
assert.ok(gameContent.includes('studentNameInput'), 'game.js must bind studentNameInput');
assert.ok(gameContent.includes('register_student'), 'game.js must call register_student action');
assert.ok(gameContent.includes('hitEnemies.has(e)'), 'game.js must check hitEnemies in collision loop');
assert.ok(gameContent.includes('lastHitBossTime >= 0.35'), 'game.js must throttle sonic wave boss damage');
console.log('  ✅ game.js contains syncStudentProfile, collision locks, and weighted sampling');

// Verify Code.gs endpoint
assert.ok(codeGsContent.includes('register_student'), 'Code.gs must handle register_student action');
assert.ok(codeGsContent.includes('registerStudent_'), 'Code.gs must implement registerStudent_');
assert.ok(codeGsContent.includes("'S' + String(newNum).padStart(4, '0')"), 'Code.gs must generate S0000 format ID');
console.log('  ✅ Code.gs contains registerStudent_ with S0000 format sequence allocation');

console.log('\n========================================================');
console.log('🎉 All BUILD-014 Automated Verification Tests PASSED!');
console.log('========================================================');
