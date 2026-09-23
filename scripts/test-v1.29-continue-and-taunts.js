'use strict';
const fs = require('fs');
const vm = require('vm');

console.log('====================================================');
console.log('  TEST SUITE: BUILD-029 Resupply Continue & Taunts');
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
// TEST 1: DOM Elements in HTML files
// -----------------------------------------------------------------------------
console.log('>>> [1/5] Verifying DOM Elements in HTML Files...');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const starfallHtml = fs.readFileSync('starfall-quiz.html', 'utf8');

assert(indexHtml.includes('id="tauntBanner"'), 'index.html contains #tauntBanner');
assert(indexHtml.includes('id="tauntBannerText"'), 'index.html contains #tauntBannerText');
assert(indexHtml.includes('id="resupplyRetryBtn"'), 'index.html contains #resupplyRetryBtn');

assert(starfallHtml.includes('id="tauntBanner"'), 'starfall-quiz.html contains #tauntBanner');
assert(starfallHtml.includes('id="tauntBannerText"'), 'starfall-quiz.html contains #tauntBannerText');
assert(starfallHtml.includes('id="resupplyRetryBtn"'), 'starfall-quiz.html contains #resupplyRetryBtn');

// -----------------------------------------------------------------------------
// TEST 2: CSS Styles for Taunt Banner
// -----------------------------------------------------------------------------
console.log('\n>>> [2/5] Verifying CSS Styles in style.css...');
const css = fs.readFileSync('style.css', 'utf8');
assert(css.includes('.taunt-banner'), 'style.css defines .taunt-banner class');
assert(css.includes('.taunt-badge'), 'style.css defines .taunt-badge class');
assert(css.includes('.taunt-text'), 'style.css defines .taunt-text class');
assert(css.includes('tauntSlideDown'), 'style.css defines tauntSlideDown animation');

// -----------------------------------------------------------------------------
// TEST 3: TAUNT_MESSAGES Specifications
// -----------------------------------------------------------------------------
console.log('\n>>> [3/5] Verifying TAUNT_MESSAGES Specifications (20 Sentences)...');
const gameJs = fs.readFileSync('game.js', 'utf8');

const match = gameJs.match(/const TAUNT_MESSAGES = (\[[\s\S]*?\]);/);
assert(match !== null, 'TAUNT_MESSAGES array found in game.js');

let tauntList = [];
try {
  tauntList = eval(match[1]);
} catch (e) {
  assert(false, `Failed to parse TAUNT_MESSAGES: ${e.message}`);
}

assert(tauntList.length === 20, `TAUNT_MESSAGES contains exactly 20 items (actual: ${tauntList.length})`);
assert(tauntList[0].includes('我阿罵都比你強'), 'Sentence #1 (3rd continue) includes "我阿罵都比你強"');
assert(tauntList[1].includes('你是不是用腳在玩'), 'Sentence #2 (6th continue) includes "你是不是用腳在玩"');
assert(tauntList[19].includes('你該休息了寶貝，我沒辦法再多說什麼了'), 'Sentence #20 (60th continue) is "你該休息了寶貝，我沒辦法再多說什麼了"');

// -----------------------------------------------------------------------------
// TEST 4: Virtual Machine Runtime Testing
// -----------------------------------------------------------------------------
console.log('\n>>> [4/5] Testing Runtime Game Engine Resupply Continue Flow...');

class FakeAudioContext {
  constructor() { this.currentTime = 0; }
  createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {} }; }
  createOscillator() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
  createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
  createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
  createBiquadFilter() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
  resume() { return Promise.resolve(); }
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

const idRegex = /id=["']([^"']+)["']/g;
let m;
const htmlIds = new Set();
while ((m = idRegex.exec(indexHtml)) !== null) {
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
      if (sel === '.opt-btn') {
        return [new FakeElement(), new FakeElement(), new FakeElement(), new FakeElement()];
      }
      return [];
    },
    querySelector: () => new FakeElement(),
    body: new FakeElement('body', 'body'),
    activeElement: null
  },
  Image: class { constructor() { this.complete = true; this.naturalWidth = 100; this.naturalHeight = 100; } },
  AudioContext: FakeAudioContext,
  Audio: class { constructor() { this.volume = 1; } play() { return Promise.resolve(); } pause() {} },
  localStorage: { getItem: () => null, setItem: () => {} },
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
vm.runInContext(gameJs, context);

if (listeners['DOMContentLoaded']) {
  listeners['DOMContentLoaded'].forEach(cb => cb());
}

const game = mockWindow.__starfallGame;
assert(game !== null, 'Game initialized in VM');

// Populate mock question bank (400 questions to support 65 continue cycles)
game.dataStore.questionBank = [];
for (let i = 1; i <= 400; i++) {
  game.dataStore.questionBank.push({
    question_id: `Q${i}`,
    question: `測試題目${i}`,
    opts: ['A', 'B', 'C', 'D'],
    ans: i % 4,
    stage: 2,
    difficulty: 1
  });
}

// Start Game at Stage 2 Wave 2 (Mini-Boss)
game.startNewGame(2);
game.wave = 2;
assert(game.stage === 2 && game.wave === 2, 'Game running at Stage 2 Wave 2');
assert(game.continueCount === 0, 'Initial continueCount is 0');

// Simulate player death
game.player.hp = 0;
game.onGameOver();

assert(game.state === 'gameover', 'Game state transitioned to "gameover" on death');
const goScreen = elementsMap['gameOverScreen'];
assert(!goScreen.classList.contains('hidden'), 'gameOverScreen is visible');
const resupplyBtn = elementsMap['resupplyRetryBtn'];
assert(resupplyBtn.style.display !== 'none', 'resupplyRetryBtn is displayed on gameover');

// Add hazards and bullets on screen before continue
game.ebullets = [{ x: 100, y: 100 }, { x: 150, y: 150 }];
game.hazardTelegraphs = [{ x: 200, y: 200 }];
game.lavaPools = [{ x: 300, y: 300 }];

// Player clicks "補給再挑戰" (resupplyRetryBtn)
game.triggerResupplyContinue();

assert(game.continueCount === 1, `continueCount incremented to 1 (actual: ${game.continueCount})`);
assert(game.isResupplyContinue === true, 'isResupplyContinue flag set to true');
assert(game.state === 'quiz', 'Game state switched to "quiz" phase');
assert(goScreen.classList.contains('hidden'), 'gameOverScreen hidden when starting quiz');
assert(game.quizQueue && game.quizQueue.length > 0, `Quiz queue loaded with 5 questions (actual: ${game.quizQueue.length})`);

// Answer questions and complete quiz phase
game.quizCorrectCount = 5;
game.endQuizPhase();
assert(game.state === 'upgrade', 'Game state switched to "upgrade" phase after quiz completion');

// Generate and apply upgrade
const choices = game.generateUpgradeChoices(5);
assert(choices && choices.length > 0, 'Upgrade choices generated');
game.applyUpgrade(choices[0]);

// Close upgrade screen (finish resupply continue)
game.closeUpgradeScreen();

assert(game.state === 'playing', 'Game state resumed to "playing"');
assert(game.isResupplyContinue === false, 'isResupplyContinue reset to false after closing upgrade');
assert(game.stage === 2 && game.wave === 2, `Stage and Wave remain intact (Stage: ${game.stage}, Wave: ${game.wave})`);
assert(game.player.hp === game.player.maxHp, `Player HP restored to full: ${game.player.hp}/${game.player.maxHp}`);
assert(game.ebullets.length === 0, 'All enemy bullets cleared from screen');
assert(game.hazardTelegraphs.length === 0, 'All hazard telegraphs cleared from screen');
assert(game.lavaPools.length === 0, 'All hazard lava pools cleared from screen');
assert(game.player.invulnTime >= 3.0, `Player granted 3.0s invulnerability shield (actual: ${game.player.invulnTime}s)`);

// -----------------------------------------------------------------------------
// TEST 5: Every 3rd Continue Mocking Taunts Triggering (up to 60)
// -----------------------------------------------------------------------------
console.log('\n>>> [5/5] Testing 20 Mocking Taunts Math & Display Boundary...');

const tauntBannerEl = elementsMap['tauntBanner'];
const tauntTextEl = elementsMap['tauntBannerText'];

let displayedTaunts = [];

for (let c = 2; c <= 65; c++) {
  // Clear banner state
  tauntBannerEl.classList.add('hidden');
  tauntTextEl.textContent = '';

  // Simulate continue c
  game.continueCount = c - 1; // triggerResupplyContinue will increment to c
  game.triggerResupplyContinue();

  // Answer quiz & close upgrade to keep state clean
  game.endQuizPhase();
  game.closeUpgradeScreen();

  if (c % 3 === 0 && c <= 60) {
    const expectedIdx = (c / 3) - 1;
    const expectedText = tauntList[expectedIdx];
    assert(!tauntBannerEl.classList.contains('hidden'), `Continue #${c}: tauntBanner is shown`);
    assert(tauntTextEl.textContent === expectedText, `Continue #${c}: matches taunt [${expectedIdx + 1}/20]: ${expectedText}`);
    displayedTaunts.push({ continueNum: c, text: tauntTextEl.textContent });
  } else {
    assert(tauntBannerEl.classList.contains('hidden'), `Continue #${c}: tauntBanner is NOT shown (as intended)`);
  }
}

assert(displayedTaunts.length === 20, `Exactly 20 taunts displayed across 65 continues (actual: ${displayedTaunts.length})`);
assert(displayedTaunts[0].text.includes('我阿罵都比你強'), 'First triggered taunt at continue #3 is "我阿罵都比你強"');
assert(displayedTaunts[1].text.includes('你是不是用腳在玩'), 'Second triggered taunt at continue #6 is "你是不是用腳在玩"');
assert(displayedTaunts[19].text.includes('你該休息了寶貝，我沒辦法再多說什麼了'), '20th triggered taunt at continue #60 is "你該休息了寶貝，我沒辦法再多說什麼了"');

// Test playAgainBtn resetting continue count
const playAgainBtn = elementsMap['playAgainBtn'];
game.continueCount = 15;
game.startNewGame(1);
assert(game.continueCount === 0, `startNewGame resets continueCount to 0 (actual: ${game.continueCount})`);

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n====================================================');
console.log(`  RESULT: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================\n');

process.exit(passedTests === totalTests ? 0 : 1);
