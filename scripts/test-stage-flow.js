'use strict';
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('game.js', 'utf8');
const configJs = fs.readFileSync('starfall-game-api-config.js', 'utf8');

const idRegex = /id=["']([^"']+)["']/g;
let m;
const htmlIds = new Set();
while ((m = idRegex.exec(html)) !== null) {
  htmlIds.add(m[1]);
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
  AudioContext: class {
    constructor() { this.currentTime = 0; }
    createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {} }; }
    createOscillator() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
    createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
    resume() { return Promise.resolve(); }
  },
  Audio: class { constructor() { this.volume = 1; } play() { return Promise.resolve(); } pause() {} },
  localStorage: {
    getItem: (k) => null,
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
  console: console,
  navigator: { vibrate: () => {} },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 1,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, questions: [] }), text: () => Promise.resolve('') })
};
mockWindow.window = mockWindow;

const context = vm.createContext(mockWindow);
vm.runInContext(configJs, context);
vm.runInContext(js, context);

if (listeners['DOMContentLoaded']) {
  listeners['DOMContentLoaded'].forEach(cb => cb());
}

const game = mockWindow.__starfallGame;
console.log('Game initialized! State:', game.state);

// Start Game at Stage 1
game.startNewGame(1);
console.log(`\n=== STAGE 1 STARTED: Stage ${game.stage}, Wave ${game.wave} ===`);
console.log('Active weapons:', game.equippedActiveWeapons);

// Fast-forward wave 1
game.waveTimer = 10;
game.updateWave(0.1);
console.log('Stage 1 Boss spawned:', game.currentBoss?.name, 'wave:', game.wave);

// Defeat Bowser
game.currentBoss.hp = 0;
game.onBossDefeated(game.currentBoss);
game.bossDeathSequence.timer = 0;
game.finishBossDefeat(game.currentBoss);
console.log('Stage 1 Boss defeated! State:', game.state);

// Quiz
while (game.quizQueue.length > 0) {
  game.handleAnswer(0);
}
console.log('Quiz done, state:', game.state);

// Upgrade
const up1 = game.generateUpgradeChoices(5);
game.applyUpgrade(up1[0]);
game.closeUpgradeScreen();

console.log(`\n=== TRANSITION RESULT: Stage ${game.stage}, Wave ${game.wave}, State ${game.state} ===`);
console.log('Active weapons:', game.equippedActiveWeapons);

// Now in Stage 2:
game.waveTimer = 8;
game.updateWave(0.1);
console.log('\nStage 2 Mini-Boss spawned:', game.currentBoss?.name, 'wave:', game.wave);

// Defeat Moblin
game.currentBoss.hp = 0;
game.onBossDefeated(game.currentBoss);
game.bossDeathSequence.timer = 0;
game.finishBossDefeat(game.currentBoss);

while (game.quizQueue.length > 0) {
  game.handleAnswer(0);
}
const up2 = game.generateUpgradeChoices(5);
game.applyUpgrade(up2[0]);
game.closeUpgradeScreen();

console.log(`After Mini-Boss Upgrade: Stage ${game.stage}, Wave ${game.wave}, State ${game.state}`);
console.log('Active weapons:', game.equippedActiveWeapons);

// Stage 2 Wave 3 -> Major Boss Ganon
game.waveTimer = 4;
game.updateWave(0.1);
console.log('\nStage 2 Major Boss spawned:', game.currentBoss?.name, 'wave:', game.wave);

// Defeat Ganon
game.currentBoss.hp = 0;
game.onBossDefeated(game.currentBoss);
game.bossDeathSequence.timer = 0;
game.finishBossDefeat(game.currentBoss);

while (game.quizQueue.length > 0) {
  game.handleAnswer(0);
}
const up3 = game.generateUpgradeChoices(5);
game.applyUpgrade(up3[0]);
game.closeUpgradeScreen();

console.log(`\n=== STAGE 2 -> STAGE 3 TRANSITION RESULT: Stage ${game.stage}, Wave ${game.wave}, State ${game.state} ===`);
console.log('Active weapons:', game.equippedActiveWeapons);
console.log('All weapons in arsenal with rank > 0:');
Object.keys(game.arsenal).filter(k => game.arsenal[k].rank > 0).forEach(k => {
  console.log(`  - ${k}: rank ${game.arsenal[k].rank}`);
});
