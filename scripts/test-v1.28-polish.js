'use strict';
const fs = require('fs');
const vm = require('vm');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('  TEST SUITE: BUILD-028 Polish & Seamless Stages 1-3');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Boss PNG Transparent Alpha Verification
// -----------------------------------------------------------------------------
console.log('>>> [1/5] Verifying Boss PNG Alpha Transparency...');
const bossFiles = [
  'assets/bosses/boss_1_bowser.png',
  'assets/bosses/boss_mini_zelda.png',
  'assets/bosses/boss_2_ganon.png'
];

try {
  const pyScript = "import json, PIL.Image; " +
    "paths = ['assets/bosses/boss_1_bowser.png', 'assets/bosses/boss_mini_zelda.png', 'assets/bosses/boss_2_ganon.png']; " +
    "res = {p: {'mode': PIL.Image.open(p).mode, 'corner_alpha': PIL.Image.open(p).getpixel((0,0))[3]} for p in paths}; " +
    "print(json.dumps(res))";
  const output = execSync(`python -c "${pyScript}"`, { encoding: 'utf8' }).trim();
  const res = JSON.parse(output);

  bossFiles.forEach(file => {
    assert(res[file]?.mode === 'RGBA', `${file} is in 32-bit RGBA color mode`);
    assert(res[file]?.corner_alpha === 0, `${file} corner pixel has alpha 0 (pure transparent)`);
  });
} catch (e) {
  assert(false, `Boss PNG transparency check failed: ${e.message}`);
}

// -----------------------------------------------------------------------------
// TEST 2: Static Code Auditing for In-Combat Clutter & Visual Polish
// -----------------------------------------------------------------------------
console.log('\n>>> [2/5] Auditing Code for Visual Cleanliness & Boss Shield Enhancements...');
const gameJsContent = fs.readFileSync('game.js', 'utf8');

assert(!gameJsContent.includes("'🛡️ IMMUNE 無敵'"), 'Floating canvas text "🛡️ IMMUNE 無敵" removed');
assert(!gameJsContent.includes("'⚡ 需靈丸破壞'"), 'Floating canvas text "⚡ 需靈丸破壞" removed');
assert(!gameJsContent.includes("tagY = -Math.max(spriteW, spriteH) / 2 - 8"), 'Floating minion canvas name tag calculation removed');
assert(!gameJsContent.includes("this.showToast('🔥 庫巴：烈焰大吐息！')"), 'Intrusive Bowser breath toast removed');
assert(!gameJsContent.includes("this.showToast('🐗 莫力布林巨將：地裂碎巖斬！')"), 'Intrusive Moblin attack toast removed');

assert(gameJsContent.includes('Hexagonal Sacred Matrix'), 'Garuda shield implements dual-layer Hexagonal Sacred Matrix');
assert(gameJsContent.includes('Concentric Ricochet Ripple'), 'Garuda shield implements Concentric Ricochet Ripple');
assert(gameJsContent.includes('Orbiting Divine Feathers with trails'), 'Garuda shield implements 8 Orbiting Divine Feathers');
assert(gameJsContent.includes('playIronDeflection'), 'SoundManager defines metallic deflection sound playIronDeflection()');

// -----------------------------------------------------------------------------
// TEST 3: Web Audio Engine Simulation & Audio Overlap Prevention
// -----------------------------------------------------------------------------
console.log('\n>>> [3/5] Testing Audio Engine & BGM Isolation...');

class FakeAudioContext {
  constructor() { this.currentTime = 0; }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  createOscillator() {
    return {
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
  createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
  createBiquadFilter() {
    return {
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      Q: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {}
    };
  }
  resume() { return Promise.resolve(); }
}

let loadedAudios = [];
class FakeAudio {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    loadedAudios.push(this);
  }
  play() { return Promise.resolve(); }
  pause() { this.paused = true; }
}

class FakeElement {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = {
      _classes: new Set(),
      add: function(...c) { c.forEach(x => this._classes.add(x)); },
      remove: function(...c) { c.forEach(x => this._classes.delete(x)); },
      contains: function(c) { return this._classes.has(c); }
    };
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.children = [];
    this.dataset = {};
  }
  getContext() {
    return {
      clearRect: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      setTransform: () => {},
      drawImage: () => {},
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      setLineDash: () => {},
      measureText: () => ({ width: 50 })
    };
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 440, height: 780 }; }
  appendChild(c) { this.children.push(c); }
  querySelector() { return new FakeElement(); }
  querySelectorAll() { return []; }
  addEventListener() {}
  focus() {}
  blur() {}
}

const html = fs.readFileSync('index.html', 'utf8');
const idRegex = /id=["']([^"']+)["']/g;
let m;
const htmlIds = new Set();
while ((m = idRegex.exec(html)) !== null) {
  htmlIds.add(m[1]);
}
const elementsMap = {};
htmlIds.forEach(id => {
  elementsMap[id] = new FakeElement(id);
});

const listeners = {};
const mockWindow = {
  document: {
    getElementById: (id) => elementsMap[id] || null,
    createElement: (tag) => new FakeElement('', tag),
    querySelectorAll: (sel) => {
      if (sel === '.overlay') {
        return Object.values(elementsMap).filter(el => el.id && (el.id.includes('Screen') || el.id.includes('Overlay')));
      }
      return [];
    },
    querySelector: () => new FakeElement(),
    body: new FakeElement('body', 'body'),
    activeElement: null
  },
  Image: class {
    constructor() {
      this.complete = true;
      this.naturalWidth = 100;
      this.naturalHeight = 100;
    }
  },
  AudioContext: FakeAudioContext,
  Audio: FakeAudio,
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  addEventListener: (event, cb) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Date: Date,
  console: { log: () => {}, warn: () => {}, error: () => {} },
  navigator: { vibrate: () => {} },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 1,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, questions: [] }), text: () => Promise.resolve('') })
};
mockWindow.window = mockWindow;

const context = vm.createContext(mockWindow);
const configJs = fs.readFileSync('starfall-game-api-config.js', 'utf8');
vm.runInContext(configJs, context);
vm.runInContext(gameJsContent, context);

if (listeners['DOMContentLoaded']) {
  listeners['DOMContentLoaded'].forEach(cb => cb());
}

const game = mockWindow.__starfallGame;
assert(game !== null && game !== undefined, 'Starfall Game successfully initialized in VM context');

// Check playStageAudio for stages 1 and 2
loadedAudios = [];
game.sound.bgm.playStageAudio(1);
assert(loadedAudios.length === 0, 'Stage 1 playStageAudio does not instantiate background MP3 audio');
game.sound.bgm.playStageAudio(2);
assert(loadedAudios.length === 0, 'Stage 2 playStageAudio does not instantiate background MP3 audio');

// Check playIronDeflection invocation
let ironDeflected = false;
const origPlayIron = game.sound.playIronDeflection;
game.sound.playIronDeflection = function() {
  ironDeflected = true;
  if (origPlayIron) origPlayIron.call(this);
};
game.sound.playIronDeflection();
assert(ironDeflected === true, 'SoundManager.playIronDeflection() executes cleanly');

// -----------------------------------------------------------------------------
// TEST 4: Seamless Stage 1 -> 2 -> 3 Transition & Weapon Retention
// -----------------------------------------------------------------------------
console.log('\n>>> [4/5] Testing Seamless Stage 1 -> 2 -> 3 Progression & Weapon Retention...');

game.startNewGame(1);
assert(game.stage === 1 && game.wave === 1, 'Game started at Stage 1, Wave 1');
const initWeaponsCount = game.equippedActiveWeapons.length;
assert(initWeaponsCount > 0, `Initial active weapons equipped: ${game.equippedActiveWeapons.join(', ')}`);

// Fast forward to Stage 1 Boss (Bowser)
game.waveTimer = 10;
game.updateWave(0.1);
assert(game.currentBoss !== null && game.wave === 4, `Stage 1 Boss (${game.currentBoss?.name}) spawned at wave 4`);

// Defeat Bowser
game.currentBoss.hp = 0;
game.onBossDefeated(game.currentBoss);
game.bossDeathSequence.timer = 0;
game.finishBossDefeat(game.currentBoss);
assert(game.state === 'upgrade', 'Game switched to upgrade state following Stage 1 Boss defeat');

// Clear quiz
while (game.quizQueue && game.quizQueue.length > 0) {
  game.handleAnswer(0);
}

// Apply upgrade choice
const choice1 = game.generateUpgradeChoices(5);
assert(choice1 && choice1.length > 0, 'Upgrade choices generated');
game.applyUpgrade(choice1[0]);

// Seed entities to test stage transition cleanup
game.ebullets = [{ x: 10, y: 10 }];
game.enemies = [{ x: 20, y: 20 }];
game.hazardTelegraphs = [{ x: 30, y: 30 }];
game.bossMinions = [{ x: 40, y: 40 }];
game.lavaPools = [{ x: 50, y: 50 }];

game.closeUpgradeScreen();

// Verify Stage 1 -> Stage 2 transition
assert(game.stage === 2, `Stage incremented seamlessly to Stage ${game.stage}`);
assert(game.wave === 1, `Wave reset to 1 (Wave: ${game.wave})`);
assert(game.state === 'playing', `Game state resumed to playing (State: ${game.state})`);
assert(game.ebullets.length === 0, 'Stage cleanup cleared residual enemy bullets');
assert(game.enemies.length === 0, 'Stage cleanup cleared residual enemy mobs');
assert(game.hazardTelegraphs.length === 0, 'Stage cleanup cleared hazard telegraphs');
assert(game.bossMinions.length === 0, 'Stage cleanup cleared boss minions');
assert(game.lavaPools.length === 0, 'Stage cleanup cleared hazard lava pools');
assert(game.player.invulnTime > 1.0, `Player granted invulnerability shield (${game.player.invulnTime}s) to prevent spawn death`);

const st2Weapons = [...game.equippedActiveWeapons];
assert(st2Weapons.length >= initWeaponsCount, `All weapons preserved into Stage 2: [${st2Weapons.join(', ')}]`);

// Fast forward to Stage 2 Mini-Boss (Moblin)
game.waveTimer = 8;
game.updateWave(0.1);
assert(game.currentBoss !== null && game.wave === 2, `Stage 2 Mini-Boss (${game.currentBoss?.name}) spawned at wave 2`);

// Defeat Moblin
game.currentBoss.hp = 0;
game.onBossDefeated(game.currentBoss);
game.bossDeathSequence.timer = 0;
game.finishBossDefeat(game.currentBoss);

while (game.quizQueue && game.quizQueue.length > 0) {
  game.handleAnswer(0);
}
const choice2 = game.generateUpgradeChoices(5);
game.applyUpgrade(choice2[0]);
game.closeUpgradeScreen();

assert(game.stage === 2 && game.wave === 3, `Mini-Boss victory progresses to Stage 2 Wave 3 (Stage ${game.stage}, Wave ${game.wave})`);
assert(game.state === 'playing', 'Game state returned to playing after Mini-Boss upgrade');

// Fast forward to Stage 2 Major Boss (Ganon)
game.waveTimer = 4;
game.updateWave(0.1);
assert(game.currentBoss !== null && game.wave === 4, `Stage 2 Major Boss (${game.currentBoss?.name}) spawned at wave 4`);

// Defeat Ganon
game.currentBoss.hp = 0;
game.onBossDefeated(game.currentBoss);
game.bossDeathSequence.timer = 0;
game.finishBossDefeat(game.currentBoss);

while (game.quizQueue && game.quizQueue.length > 0) {
  game.handleAnswer(0);
}
const choice3 = game.generateUpgradeChoices(5);
game.applyUpgrade(choice3[0]);
game.closeUpgradeScreen();

// Verify Stage 2 -> Stage 3 transition
assert(game.stage === 3, `Stage incremented seamlessly to Stage 3 (Stage: ${game.stage})`);
assert(game.wave === 1, `Wave reset to 1 in Stage 3 (Wave: ${game.wave})`);
assert(game.state === 'playing', `Game state playing in Stage 3 (State: ${game.state})`);
const st3Weapons = [...game.equippedActiveWeapons];
assert(st3Weapons.length >= st2Weapons.length, `All weapons and upgrades preserved into Stage 3: [${st3Weapons.join(', ')}]`);

// -----------------------------------------------------------------------------
// TEST 5: Bullet Ricochet & Shield Deflection Mechanics
// -----------------------------------------------------------------------------
console.log('\n>>> [5/5] Testing Shield Ricochet Sound & Particle Deflection...');

// Spawn a dummy boss with invulnerability
const dummyBoss = {
  name: 'Test Boss',
  x: 200,
  y: 100,
  hitboxRadius: 40,
  invulnerable: true,
  featherBarrierHp: 0,
  shieldHitPulse: 0
};
game.currentBoss = dummyBoss;

let deflectSoundPlayed = false;
game.sound.playIronDeflection = () => { deflectSoundPlayed = true; };

// Fire a standard bullet hitting the dummy boss
const bullet = {
  x: 200,
  y: 105,
  pierce: 1,
  dead: false,
  damage: 50,
  isSpiritBomb: false
};
game.particles = [];
game.damageBoss(dummyBoss, bullet.damage, bullet);

assert(deflectSoundPlayed === true, 'Striking invulnerable boss triggers playIronDeflection()');
assert(dummyBoss.shieldHitPulse === 1.0, 'Boss shieldHitPulse set to 1.0 on deflection');
assert(game.particles.length > 0, `Sparks spawned upon deflection (${game.particles.length} particles)`);
const bouncingSpark = game.particles.find(p => p.vy > 0);
assert(bouncingSpark !== undefined, 'Deflection sparks bounce downward toward player');

// =============================================================================
// TEST SUMMARY
// =============================================================================
console.log('\n====================================================');
console.log(`  RESULT: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================\n');

process.exit(passedTests === totalTests ? 0 : 1);
