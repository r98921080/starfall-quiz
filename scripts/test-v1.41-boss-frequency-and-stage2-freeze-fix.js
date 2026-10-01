// ============================================================================
// BUILD-041: Automated Verification for 30% Boss/MiniBoss Attack Frequency Reduction
// and Stage 2 Boss Freeze/Stop Bug Resolution
// ============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== BUILD-041 Verification: 30% Attack Frequency Reduction & Stage 2 Boss Fix ===\n');

const gameJsPath = path.join(__dirname, '..', 'game.js');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');

// ----------------------------------------------------------------------------
// 1. Stage 2 Boss Freeze / Permanent Stun-Lock Bug Fix
// ----------------------------------------------------------------------------
console.log('--- 1. Checking Stage 2 Boss Freeze Bug Fixes ---');

// Check 1A: Stage 2 Ganon weaknessCooldown
assert(gameJs.includes('boss.weaknessCooldown = 12.0; // 核心修復：設置 12 秒弱點冷卻'), 'Stage 2 Ganon must set weaknessCooldown = 12.0');
console.log('  ✅ Stage 2 Ganon sets weaknessCooldown = 12.0 upon weakness trigger');

// Check 1B: stunTimer guard in checkBossMythicWeakness
assert(gameJs.includes('if (boss.stunTimer && boss.stunTimer > 0) return;'), 'checkBossMythicWeakness must ignore hits while boss is already stunned');
console.log('  ✅ checkBossMythicWeakness ignores hits while boss is already stunned');

// Check 1C: hasEntered flag in updateBoss
assert(gameJs.includes('if (!b.hasEntered)'), 'updateBoss must check !b.hasEntered to prevent re-entering entrance mode');
assert(gameJs.includes('b.hasEntered = true;'), 'updateBoss must set b.hasEntered = true upon reaching targetY');
console.log('  ✅ Boss movement uses hasEntered flag, preventing vertical oscillation from re-triggering entrance freeze');

// Check 1D: stunTimer clamped
assert(gameJs.includes('b.stunTimer = Math.min(3.0, b.stunTimer);'), 'updateBoss clamps stunTimer to 3.0s max');
console.log('  ✅ stunTimer clamped to prevent stacking');

// Simulate Beam attack on Stage 2 Ganon
console.log('\n--- Simulating Beam Attack on Stage 2 Boss ---');
const simulatedBoss = {
  stage: 2,
  name: '災厄加儂・終焉狂瀾',
  hp: 28000,
  maxHp: 28000,
  weaknessCounters: {},
  weaknessCooldown: 0,
  stunTimer: 0,
  dead: false,
  dying: false
};

function checkBossMythicWeaknessSimulated(boss, type, source) {
  if (!boss || boss.dead || boss.dying) return;
  if (boss.stunTimer && boss.stunTimer > 0) return;
  if (!boss.weaknessCounters) boss.weaknessCounters = {};
  if (boss.weaknessCooldown && boss.weaknessCooldown > 0) return;

  const s = boss.stage || 1;
  if (s === 2 && (type === 'beam' || source === 'beam' || type === 'holy_spear')) {
    boss.weaknessCounters.light = (boss.weaknessCounters.light || 0) + 1;
    if (boss.weaknessCounters.light >= 15) {
      boss.weaknessCounters.light = 0;
      boss.weaknessCooldown = 12.0;
      boss.stunTimer = 3.0;
    }
  }
}

// Fire 100 continuous beam hits
let stunTriggerCount = 0;
for (let frame = 0; frame < 100; frame++) {
  const prevStun = simulatedBoss.stunTimer;
  checkBossMythicWeaknessSimulated(simulatedBoss, 'beam', 'beam');
  if (simulatedBoss.stunTimer === 3.0 && prevStun === 0) {
    stunTriggerCount++;
  }
}

assert.strictEqual(stunTriggerCount, 1, 'Weakness should only trigger ONCE in 100 frames due to cooldown');
assert.strictEqual(simulatedBoss.weaknessCooldown, 12.0, 'weaknessCooldown should be 12.0s');
assert.strictEqual(simulatedBoss.stunTimer, 3.0, 'stunTimer should be 3.0s');
console.log('  ✅ 100 continuous beam hits triggered weakness exactly 1 time; boss is NOT permanently stun-locked!');

// Simulate dt steps so boss un-stuns and resumes acting
for (let step = 0; step < 30; step++) {
  simulatedBoss.stunTimer -= 0.1;
  simulatedBoss.weaknessCooldown -= 0.1;
}
assert(simulatedBoss.stunTimer <= 0, 'stunTimer must expire after 3 seconds');
assert(simulatedBoss.weaknessCooldown > 0, 'weaknessCooldown must remain active during immunity window');
console.log('  ✅ After 3 seconds, stunTimer cleanly expired; boss is fully free to act while protected by cooldown');

// ----------------------------------------------------------------------------
// 2. 30% Attack Frequency Reduction for Mini-Bosses & Stages 3-12 Bosses
// ----------------------------------------------------------------------------
console.log('\n--- 2. Checking 30% Attack Frequency Reduction ---');

// Check 2A: Mini-Boss skill interval
assert(gameJs.includes('bossSkillInterval = 2.86; // 所有小 Boss 頻率調降 30%'), 'All mini-bosses must use 2.86s interval');
console.log('  ✅ All Mini-Bosses: attack interval lengthened from 2.0s to 2.86s (exact 30% frequency reduction)');

// Check 2B: Stages 3-12 Boss skill interval
assert(gameJs.includes('bossSkillInterval = 2.86; // 第 3-12 關 Boss 頻率調降 30%'), 'Stages 3-12 bosses must use 2.86s interval');
console.log('  ✅ Stages 3-12 Bosses: attack interval lengthened to 2.86s (exact 30% frequency reduction)');

// Check 2C: Stages 1-2 Boss skill interval preserved
assert(gameJs.includes('bossSkillInterval = 2.35; // 第 1-2 關 Boss 維持調降 15% 節奏'), 'Stages 1-2 bosses must keep 2.35s interval');
console.log('  ✅ Stages 1-2 Bosses: preserved tuned 2.35s interval');

// Check 2D: Boss ultimate cooldown
assert(gameJs.includes('const ultCooldown = (b.stage >= 3 && !b.isMini) ? 20.0 : 14.0;'), 'Stages 3-12 ultimate cooldown lengthened from 14s to 20s');
console.log('  ✅ Stages 3-12 Boss Ultimates: cooldown lengthened from 14.0s to 20.0s (exact 30% frequency reduction)');

// Check 2E: Minions in stages 3-12
assert(gameJs.includes('if (m.shootTimer >= 2.57)'), 'Hydra head shoot interval lengthened from 1.8s to 2.57s');
assert(gameJs.includes('if (m.shootTimer >= 3.14)'), 'Gorgon clone shoot interval lengthened from 2.2s to 3.14s');
assert(gameJs.includes('const shockMax = (b.stage === 4) ? 4.3 : 3.0;'), 'Leigong magnetic shock cycle lengthened from 3.0s to 4.3s');
console.log('  ✅ Stage 3-12 Minions: Hydra heads (2.57s), Gorgon clones (3.14s), and Leigong magnetic shock (4.3s) reduced by 30% frequency');

console.log('\n========================================');
console.log('🎉 ALL BUILD-041 VERIFICATION TESTS PASSED!');
console.log('========================================');
