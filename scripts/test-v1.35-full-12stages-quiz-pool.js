const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('====================================================');
console.log('  BUILD-035 Verification: Full 136-Question Pool Across All 12 Stages');
console.log('====================================================\n');

const gameJs = fs.readFileSync('game.js', 'utf8');
const configJs = fs.readFileSync('starfall-game-api-config.js', 'utf8');
const csvText = fs.readFileSync('data/default-question-bank.csv', 'utf8');

class FakeClassList {
  constructor() { this.set = new Set(['hidden']); }
  add(...c) { c.forEach(x => this.set.add(x)); }
  remove(...c) { c.forEach(x => this.set.delete(x)); }
  contains(c) { return this.set.has(c); }
}
class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.classList = new FakeClassList();
    this.children = [];
    this.innerHTML = '';
    this.textContent = '';
  }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener() {}
  removeEventListener() {}
  querySelector() { return new FakeElement(); }
  querySelectorAll() { return []; }
  getContext() { return new Proxy({}, { get: () => () => ({ addColorStop: () => {} }) }); }
}

const elementsMap = {};
const listeners = {};
const mockWindow = {
  location: { protocol: 'https:', href: 'https://r98921080.github.io/starfall-quiz/' },
  document: {
    getElementById: (id) => { if (!elementsMap[id]) elementsMap[id] = new FakeElement(id); return elementsMap[id]; },
    createElement: () => new FakeElement(),
    querySelectorAll: () => [],
    querySelector: () => new FakeElement(),
    body: new FakeElement('body')
  },
  Image: class { constructor() { this.complete = true; this.naturalWidth = 100; this.naturalHeight = 100; } },
  AudioContext: class {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
    createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
    createBiquadFilter() { return { connect: () => {}, frequency: { setValueAtTime: () => {} }, Q: { value: 1 } }; }
    resume() { return Promise.resolve(); }
  },
  Audio: class { constructor() {} play() { return Promise.resolve(); } pause() {} },
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: (ev, cb) => { if (!listeners[ev]) listeners[ev] = []; listeners[ev].push(cb); },
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  Math: Math,
  Date: Date,
  console: { log: () => {}, warn: () => {}, error: () => {} },
  navigator: { vibrate: () => {} },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 1,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, questions: [] }), text: () => Promise.resolve('') })
};
mockWindow.window = mockWindow;

const ctx = vm.createContext(mockWindow);
vm.runInContext(configJs, ctx);
vm.runInContext(gameJs, ctx);
if (listeners['DOMContentLoaded']) listeners['DOMContentLoaded'].forEach(cb => cb());

const game = mockWindow.__starfallGame;
game.dataStore.questionBank = game.dataStore.parseCSV(csvText);
game.dataStore.studentGrade = '四年級'; // Only 15 questions in 國小四年級!

console.log('Total questions in bank:', game.dataStore.questionBank.length);
assert.strictEqual(game.dataStore.questionBank.length, 136, 'Question bank has 136 questions');

game.startNewGame(1);

// Simulate 27 consecutive 5-question quizzes (135 questions) + 28th quiz (remaining 1 question topped up to 5)
for (let quizRound = 1; quizRound <= 28; quizRound++) {
  const stage = Math.min(12, Math.ceil(quizRound / 2));
  const picked = game.dataStore.pickAdaptiveQuestions(5, stage);
  assert.strictEqual(picked.length, 5, `Quiz #${quizRound} (Stage ${stage}) always delivers full 5 questions (got ${picked.length})`);
}

console.log(`  ✓ All 28 consecutive quizzes (covering Stage 1 -> Stage 12+) delivered a full 5 questions each!`);
console.log(`  ✓ Total unique questions used: ${game.dataStore.sessionUsedQuestionIds.size} / 136`);
assert.strictEqual(game.dataStore.sessionUsedQuestionIds.size, 136, 'All 136 unique questions used after 28th quiz');
assert.strictEqual(game.dataStore.isQuestionBankExhausted('S0001'), true, 'Bank is only marked exhausted after all 136 questions are used');

console.log('\n====================================================');
console.log('  ALL BUILD-035 CHECKS PASSED 100%!');
console.log('====================================================');
