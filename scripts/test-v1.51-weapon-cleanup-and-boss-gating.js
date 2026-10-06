/**
 * test-v1.51-weapon-cleanup-and-boss-gating.js
 * Verification test suite for:
 * 1. Persistent weapon visuals cleanup (activePrisms & orbitals on switch, unequip, disable, restart).
 * 2. HUD simplification (removal of knowledge pressure & armory loadout strip).
 * 3. Boss Phase Gating, Transformation Invulnerability, and prevention of premature death.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting TEST-v1.51: Persistent Weapon Cleanup, HUD Simplification & Boss Phase Gating...');

const rootDir = path.resolve(__dirname, '..');
const gameJsPath = path.join(rootDir, 'game.js');
const indexHtmlPath = path.join(rootDir, 'index.html');
const starfallHtmlPath = path.join(rootDir, 'starfall-quiz.html');

const gameJs = fs.readFileSync(gameJsPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const starfallHtml = fs.readFileSync(starfallHtmlPath, 'utf8');

// ============================================================
// 1. HUD Simplification Verification
// ============================================================
console.log('  [1/4] Verifying HUD simplification in index.html & starfall-quiz.html...');

[ { name: 'index.html', html: indexHtml }, { name: 'starfall-quiz.html', html: starfallHtml } ].forEach(({ name, html }) => {
  assert(!html.includes('id="hudPressurePanel"'), `${name} must not contain #hudPressurePanel`);
  assert(!html.includes('id="hudPressure"'), `${name} must not contain #hudPressure`);
  assert(!html.includes('id="hudLoadoutPanel"'), `${name} must not contain #hudLoadoutPanel`);
  assert(!html.includes('id="hudLoadoutStrip"'), `${name} must not contain #hudLoadoutStrip`);

  // Preserved HUD elements
  assert(html.includes('id="hudStageWave"'), `${name} must keep #hudStageWave`);
  assert(html.includes('id="hudScore"'), `${name} must keep #hudScore`);
  assert(html.includes('id="hudBombPanel"'), `${name} must keep #hudBombPanel`);
  assert(html.includes('id="hudHpCells"'), `${name} must keep #hudHpCells`);
  assert(html.includes('id="hudSyncBar"'), `${name} must keep #hudSyncBar`);

  // Cache buster check
  assert(html.includes('game.js?v=b53'), `${name} must load game.js with ?v=b53`);
});

// Verify updateHUD null check in game.js
assert(gameJs.includes('const pressEl = document.getElementById(\'hudPressure\');\n    if (pressEl) {'),
  'updateHUD in game.js must safely check if (pressEl)');
console.log('  ✅ HUD simplification verified.');

// ============================================================
// 2. Persistent Weapon Cleanup Verification
// ============================================================
console.log('  [2/4] Verifying persistent weapon cleanup across game cycles & armory actions...');

// A. startNewGame & loadPlayerRunSave reset arrays
assert(gameJs.includes('this.activePrisms = [];\n    this.prismCachedTargets = {};\n    this.orbitals = [];'),
  'startNewGame and loadPlayerRunSave must clear activePrisms, prismCachedTargets, orbitals');

// B. fireWeapons clears inactive/disabled prism and shield
assert(gameJs.includes('this.updatePrismWingman(pw.rank, dt);\n    } else {\n      this.activePrisms = [];\n      this.prismCachedTargets = {};\n    }'),
  'fireWeapons must clear activePrisms and prismCachedTargets if prism_wingman is inactive/disabled');
assert(gameJs.includes('this.updateAegisShields(qs.rank, qs.quality, dt);\n    } else {\n      this.orbitals = [];\n    }'),
  'fireWeapons must clear orbitals if quantum_shield is inactive/disabled');

// C. render() purge check
assert(gameJs.includes('if (!pw || pw.rank <= 0 || pw.disabled) {\n        this.activePrisms = [];\n        this.prismCachedTargets = {};'),
  'render must purge activePrisms immediately if prism_wingman is disabled or not active');
assert(gameJs.includes('if (!qs || qs.rank <= 0 || qs.disabled) {\n        this.orbitals = [];'),
  'render must purge orbitals immediately if quantum_shield is disabled or not active');

// D. Armory toggle and unequip clear logic
assert(gameJs.includes("if (wepId === 'prism_wingman') {\n                this.activePrisms = [];\n                this.prismCachedTargets = {};\n              } else if (wepId === 'quantum_shield') {\n                this.orbitals = [];\n              }"),
  'armory toggleBtn must clear activePrisms and orbitals when disabled');
assert(gameJs.includes("if (wepId === 'prism_wingman') {\n              this.activePrisms = [];\n              this.prismCachedTargets = {};\n            } else if (wepId === 'quantum_shield') {\n              this.orbitals = [];\n            }"),
  'armory unequipBtn must clear activePrisms and orbitals when unequipped');

console.log('  ✅ Persistent weapon cleanup verified.');

// ============================================================
// 3. Boss Phase Gating & Transformation Immunity Static Checks
// ============================================================
console.log('  [3/4] Verifying Boss Phase Gating & Transformation Immunity static code structure...');

// A. isTransforming check in damageBoss
assert(gameJs.includes('if (boss.isTransforming) {\n      if (this.sound && this.sound.playIronDeflection) {\n        this.sound.playIronDeflection();\n      }\n      boss.shieldHitPulse = 1.0;\n      return;\n    }'),
  'damageBoss must completely block damage while boss.isTransforming is true');

// B. EMP/spirit invuln pierce strictly requires desperationActive
assert(gameJs.includes('if (boss.desperationActive && source === \'spirit\' && type === \'spirit\' && (this.lastEmpFired || damage > 500))'),
  'damageBoss must ONLY allow spirit/EMP to strip invulnerability if boss.desperationActive is true');

// C. Phase Health Gate in damageBoss
assert(gameJs.includes('let minHpForPhase = 0;'), 'damageBoss must calculate minHpForPhase');
assert(gameJs.includes('minHpForPhase = Math.round(boss.maxHp * 0.50);'), 'Phase 1 of 2-phase boss must gate at 50% maxHp');
assert(gameJs.includes('minHpForPhase = Math.round(boss.maxHp * 0.66);'), 'Phase 1 of 3-phase boss must gate at 66% maxHp');
assert(gameJs.includes('minHpForPhase = Math.round(boss.maxHp * 0.33);'), 'Phase 2 of 3-phase boss must gate at 33% maxHp');
assert(gameJs.includes('finalDmg = Math.min(finalDmg, Math.max(0, boss.hp - minHpForPhase));'),
  'damageBoss must clamp finalDmg to not exceed phase threshold');

// D. triggerBossPhase2 sets isTransforming and locks HP to 50%
assert(gameJs.includes('boss.isTransforming = true;') && gameJs.includes('boss.invulnTimer = 2.5;') && gameJs.includes('boss.hp = Math.round(boss.maxHp * 0.5);'),
  'triggerBossPhase2 must set isTransforming, 2.5s invulnTimer, and 50% HP');

// E. triggerBossPhase3 sets isTransforming and locks HP to 33%
assert(gameJs.includes('boss.hp = Math.round(boss.maxHp * 0.33);'),
  'triggerBossPhase3 must set isTransforming, 2.5s invulnTimer, and 33% HP');

// F. updateBoss clears isTransforming on timer expiry
assert(gameJs.includes('b.invulnerable = false;\n        b.invulnTimer = 0;\n        b.isTransforming = false;'),
  'updateBoss must clear isTransforming when invulnTimer expires');

// G. startBossDefeatCinematic ultimate fail-safe
assert(gameJs.includes('if (boss.phases > 1 && boss.phase < boss.phases) {\n      // 絕對防禦保護：若魔王尚有後續階段未展開，絕不可直接判定死亡結算，安全導向型態轉換！'),
  'startBossDefeatCinematic must safeguard against calling defeat before final phase');

console.log('  ✅ Static Boss Phase Gating code verified.');

// ============================================================
// 4. Behavioral Simulation: Boss Damage & Phase Progression
// ============================================================
console.log('  [4/4] Executing Behavioral Simulation of Boss Phase Transitions & Damage Gating...');

// Create a simulated environment replicating game.js phase gating logic
class MockGame {
  constructor() {
    this.equipped = { passive2: { rank: 0 } };
    this.fusionActive = [];
    this.sound = { playIronDeflection() {}, playHit() {}, playCrit() {}, playExplosion() {}, playWarningAlert() {}, speak() {} };
    this.particles = [];
    this.ebullets = [];
    this.totalDamageDealt = 0;
    this.score = 0;
    this.defeatCinematicCalled = false;
  }

  isFusionActive(id) {
    return this.fusionActive.includes(id);
  }

  syncBossHpBar(b, zero = false) {}
  showToast(msg) {}
  shake(mag, dur) {}
  checkBossMythicWeakness(boss, type, source) {}

  triggerBossPhase2(boss) {
    if (!boss || boss.dead || boss.dying) return;
    if (boss.phase >= 2) return;
    boss.phase = 2;
    boss.isTransforming = true;
    boss.invulnerable = true;
    boss.invulnTimer = 2.5;
    boss.hp = Math.round(boss.maxHp * 0.5);
  }

  triggerBossPhase3(boss) {
    if (!boss || boss.dead || boss.dying) return;
    if (boss.phase >= 3) return;
    boss.phase = 3;
    boss.isTransforming = true;
    boss.invulnerable = true;
    boss.invulnTimer = 2.5;
    boss.hp = Math.round(boss.maxHp * 0.33);
  }

  startBossDefeatCinematic(boss) {
    if (!boss || boss.dying) return;
    if (boss.phases > 1 && boss.phase < boss.phases) {
      if (boss.phases >= 3 && boss.phase === 2) {
        this.triggerBossPhase3(boss);
      } else {
        this.triggerBossPhase2(boss);
      }
      return;
    }
    boss.dying = true;
    boss.invulnerable = true;
    boss.hp = 0;
    this.defeatCinematicCalled = true;
  }

  damageBoss(boss, damage, type = 'normal', source = 'bullet') {
    if (!boss || boss.dead || boss.dying) return;
    if (boss.isTransforming) {
      boss.shieldHitPulse = 1.0;
      return;
    }
    if (boss.invulnerable) {
      if (boss.desperationActive && source === 'spirit' && type === 'spirit' && (this.lastEmpFired || damage > 500)) {
        boss.invulnerable = false;
        boss.desperationActive = false;
      } else {
        boss.shieldHitPulse = 1.0;
        return;
      }
    }

    let finalDmg = damage;

    // Phase Health Gate
    let minHpForPhase = 0;
    if (boss.phases >= 3) {
      if (boss.phase === 1) {
        minHpForPhase = Math.round(boss.maxHp * 0.66);
      } else if (boss.phase === 2) {
        minHpForPhase = Math.round(boss.maxHp * 0.33);
      }
    } else if (boss.phases > 1 && boss.phase === 1) {
      minHpForPhase = Math.round(boss.maxHp * 0.50);
    }

    if (minHpForPhase > 0) {
      finalDmg = Math.min(finalDmg, Math.max(0, boss.hp - minHpForPhase));
    }

    boss.hp -= finalDmg;

    // Phase transition or defeat
    if (boss.phases >= 3) {
      if (boss.hp <= boss.maxHp * 0.66 && boss.phase === 1) {
        this.triggerBossPhase2(boss);
      } else if (boss.hp <= boss.maxHp * 0.33 && boss.phase === 2) {
        this.triggerBossPhase3(boss);
      } else if (boss.hp <= 0 && boss.phase >= boss.phases && !boss.dying) {
        this.startBossDefeatCinematic(boss);
      }
    } else {
      if (boss.hp <= boss.maxHp * 0.5 && boss.phase === 1 && boss.phases > 1) {
        this.triggerBossPhase2(boss);
      } else if (boss.hp <= 0 && (boss.phase >= boss.phases || boss.phases <= 1) && !boss.dying) {
        this.startBossDefeatCinematic(boss);
      }
    }
  }

  updateBoss(dt, boss) {
    if (!boss || boss.dead || boss.dying) return;
    if (boss.invulnerable) {
      boss.invulnTimer -= dt;
      if (boss.invulnTimer <= 0) {
        boss.invulnerable = false;
        boss.invulnTimer = 0;
        boss.isTransforming = false;
      }
    }
  }
}

// SIMULATION 1: 2-Phase Boss (Stage 3 Garuda, 50,400 maxHp)
const game1 = new MockGame();
const boss1 = {
  isBoss: true, stage: 3, name: '迦樓羅・裂空王',
  hp: 50400, maxHp: 50400, phase: 1, phases: 2,
  invulnerable: false, invulnTimer: 0, isTransforming: false, dying: false, dead: false
};

// Test fail-safe: Even if external code attempts to call startBossDefeatCinematic while in Phase 1:
const prematureBoss = {
  isBoss: true, stage: 3, name: '測試魔王',
  hp: 50400, maxHp: 50400, phase: 1, phases: 2,
  invulnerable: false, invulnTimer: 0, isTransforming: false, dying: false, dead: false
};
game1.startBossDefeatCinematic(prematureBoss);
assert.strictEqual(prematureBoss.dying, false, 'Boss must NOT be dying if phase < phases');
assert.strictEqual(prematureBoss.phase, 2, 'Boss must safely route to Phase 2 instead of dying');
assert.strictEqual(game1.defeatCinematicCalled, false, 'Defeat cinematic flag must not be true');

// Deal 40,000 burst damage in Phase 1 (would bring un-gated HP to 10,400, triggering premature transition bleed)
game1.damageBoss(boss1, 40000, 'spirit', 'spirit');
assert.strictEqual(boss1.phase, 2, 'Boss must trigger Phase 2');
assert.strictEqual(boss1.hp, 25200, 'Boss HP in Phase 2 must be gated and reset to 50% (25,200)');
assert.strictEqual(boss1.isTransforming, true, 'Boss must be in isTransforming state');
assert.strictEqual(boss1.invulnerable, true, 'Boss must be invulnerable');
assert.strictEqual(game1.defeatCinematicCalled, false, 'Defeat cinematic must NOT be called in Phase 1 transition');

// During transformation (2.5s window), fire 10 heavy spirit bullets (5,000 dmg each)
for (let i = 0; i < 10; i++) {
  game1.damageBoss(boss1, 5000, 'spirit', 'spirit');
}
assert.strictEqual(boss1.hp, 25200, 'Damage during transformation must be 0 (immune)');
assert.strictEqual(game1.defeatCinematicCalled, false, 'Boss must not die during transformation');

// Advance time by 2.6 seconds (transformation completes)
game1.updateBoss(2.6, boss1);
assert.strictEqual(boss1.isTransforming, false, 'isTransforming must expire');
assert.strictEqual(boss1.invulnerable, false, 'invulnerable must expire');

// In Phase 2, take damage legitimately
game1.damageBoss(boss1, 10000, 'normal', 'bullet');
assert.strictEqual(boss1.hp, 15200, 'Phase 2 damage must register');

// Deal lethal damage in Phase 2
game1.damageBoss(boss1, 20000, 'normal', 'bullet');
assert.strictEqual(boss1.hp, 0, 'HP must be 0 upon defeat');
assert.strictEqual(boss1.dying, true, 'Boss must be marked dying');
assert.strictEqual(game1.defeatCinematicCalled, true, 'Defeat cinematic must legitimately trigger in Phase 2');
console.log('  ✅ Simulation 1 (2-Phase Boss) passed.');

// SIMULATION 2: 3-Phase Boss (Stage 12 Tiamat, 480,000 maxHp)
const game2 = new MockGame();
const boss2 = {
  isBoss: true, stage: 12, name: '提亞瑪特・混沌母艦',
  hp: 480000, maxHp: 480000, phase: 1, phases: 3,
  invulnerable: false, invulnTimer: 0, isTransforming: false, dying: false, dead: false
};

// Deal massive burst in Phase 1
game2.damageBoss(boss2, 300000, 'spirit', 'spirit');
assert.strictEqual(boss2.phase, 2, 'Tiamat must enter Phase 2 at 66% threshold');
assert.strictEqual(boss2.hp, 240000, 'Tiamat HP in Phase 2 must be 240,000');
assert.strictEqual(boss2.isTransforming, true, 'Tiamat must be transforming');

// Finish transformation
game2.updateBoss(2.6, boss2);

// Deal massive burst in Phase 2
game2.damageBoss(boss2, 300000, 'spirit', 'spirit');
assert.strictEqual(boss2.phase, 3, 'Tiamat must enter Phase 3 at 33% threshold');
assert.strictEqual(boss2.hp, 158400, 'Tiamat HP in Phase 3 must be 33% (158,400)');
assert.strictEqual(boss2.isTransforming, true, 'Tiamat must be transforming');

// Finish transformation
game2.updateBoss(2.6, boss2);

// In Phase 3, deal lethal damage
game2.damageBoss(boss2, 200000, 'normal', 'bullet');
assert.strictEqual(boss2.hp, 0, 'Tiamat HP must reach 0');
assert.strictEqual(boss2.dying, true, 'Tiamat must legitimately die in Phase 3');
assert.strictEqual(game2.defeatCinematicCalled, true, 'Defeat cinematic triggered in Phase 3');
console.log('  ✅ Simulation 2 (3-Phase Boss) passed.');

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (TEST-v1.51)');
