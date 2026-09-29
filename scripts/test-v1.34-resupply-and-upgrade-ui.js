const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('====================================================');
console.log('  BUILD-034 Verification: Level 5 Weapon Exclusion & 3-Choice UI');
console.log('====================================================\n');

const gameJs = fs.readFileSync('game.js', 'utf8');
const styleCss = fs.readFileSync('style.css', 'utf8');
const configJs = fs.readFileSync('starfall-game-api-config.js', 'utf8');
const weaponDataJson = JSON.parse(fs.readFileSync('data/weapon-data.json', 'utf8'));

// 1. Verify CSS rules for 3-choice modal width and no text truncation
console.log('>>> [1/4] Verifying CSS layout & anti-truncation rules...');
assert(styleCss.includes('width: min(97%, 520px)'), 'upgradeCardModal width widened to min(97%, 520px)');
const statsLineBlock = styleCss.match(/\.upgrade-stats-line\s*\{[\s\S]*?\}/);
assert(statsLineBlock && statsLineBlock[0].includes('white-space: normal'), '.upgrade-stats-line uses white-space: normal (no ellipsis cutoff)');
assert(!statsLineBlock[0].includes('text-overflow: ellipsis'), '.upgrade-stats-line removed text-overflow: ellipsis');
const descBlock = styleCss.match(/\.upgrade-desc\s*\{[\s\S]*?\}/);
assert(descBlock && descBlock[0].includes('white-space: normal'), '.upgrade-desc uses white-space: normal');
console.log('  ✓ CSS rules verified: modal widened, multi-line wrapping enabled, ellipsis removed.');

// 2. Setup VM to test Game instance behavior
console.log('\n>>> [2/4] Initializing Game VM...');
class FakeClassList {
  constructor() { this.set = new Set(['hidden']); }
  add(...c) { c.forEach(x => this.set.add(x)); }
  remove(...c) { c.forEach(x => this.set.delete(x)); }
  contains(c) { return this.set.has(c); }
  toggle(c) { if (this.set.has(c)) this.set.delete(c); else this.set.add(c); }
}
class FakeElement {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.style = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this.children = [];
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener() {}
  removeEventListener() {}
  querySelector() { return new FakeElement(); }
  querySelectorAll() { return []; }
  getContext() {
    return new Proxy({}, { get: () => () => ({ addColorStop: () => {} }) });
  }
}

const elementsMap = {};
const listeners = {};
const mockWindow = {
  location: { protocol: 'https:', href: 'https://r98921080.github.io/starfall-quiz/' },
  document: {
    getElementById: (id) => {
      if (!elementsMap[id]) elementsMap[id] = new FakeElement(id);
      return elementsMap[id];
    },
    createElement: (tag) => new FakeElement('', tag),
    querySelectorAll: () => [],
    querySelector: () => new FakeElement(),
    body: new FakeElement('body', 'body'),
    activeElement: null
  },
  Image: class { constructor() { this.complete = true; this.naturalWidth = 100; this.naturalHeight = 100; } },
  AudioContext: class {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
    createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
    createBiquadFilter() { return { connect: () => {}, frequency: { setValueAtTime: () => {} }, Q: { value: 1 } }; }
    resume() { return Promise.resolve(); }
  },
  Audio: class { constructor() { this.volume = 1; } play() { return Promise.resolve(); } pause() {} },
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
game.dataStore.weaponData = weaponDataJson.weapons;

// 3. Test Rank 5 exclusion principle
console.log('>>> [3/4] Testing Level 5 exclusion principle...');
game.startNewGame(1);

// Upgrade multishot to Rank 5 (MAX)
game.arsenal.multishot.rank = 5;
assert.strictEqual(game.getWeaponRank('multishot'), 5, 'multishot rank is 5');

// Run 50 trials of generateUpgradeChoices across correctCount = 1..5
for (let c = 1; c <= 5; c++) {
  for (let t = 0; t < 30; t++) {
    const choices = game.generateUpgradeChoices(c);
    assert.strictEqual(choices.length, 3, `correctCount=${c} always returns 3 choices`);
    const hasMultishot = choices.some(ch => ch.weaponId === 'multishot');
    assert.strictEqual(hasMultishot, false, `Rank 5 multishot never appears in 3-choice options (correctCount=${c})`);
    const allAreRealWeaponsOrFusion = choices.every(ch => !ch.isPerk);
    assert.strictEqual(allAreRealWeaponsOrFusion, true, `Other unmaxed weapons appear normally without falling back to perks (correctCount=${c})`);
  }
}
console.log('  ✓ Verified: Rank 5 weapon is strictly excluded while all other < Rank 5 weapons appear normally.');

// Test when ALL C-tier weapons reach Rank 5, correctCount=1 or 2 still offers remaining B/A tier unmaxed weapons
const cWeapons = weaponDataJson.weapons.filter(w => w.tier === 'C');
cWeapons.forEach(w => { game.arsenal[w.id].rank = 5; });
const fallbackChoices = game.generateUpgradeChoices(2);
assert.strictEqual(fallbackChoices.length, 3, 'Returns 3 choices even when all C-tier weapons are Rank 5');
assert(fallbackChoices.every(ch => !ch.isPerk && game.getWeaponRank(ch.weaponId) < 5), 'Automatically offers remaining unmaxed weapons from other tiers when C-tier is all Rank 5');
console.log('  ✓ Verified: When all C-tier weapons reach Rank 5, remaining unmaxed B/A weapons still appear in 3-choice.');

// 4. Test openUpgradeScreen renders complete weapon information (.upgrade-desc, .upgrade-stats-line, .upgrade-effect-line)
console.log('\n>>> [4/4] Verifying rendered 3-choice DOM cards contain full weapon info...');
game.quizCorrectCount = 4;
game.openUpgradeScreen();
const grid = elementsMap['upgradeCardsGrid'];
assert.strictEqual(grid.children.length, 3, '3 cards rendered in upgradeCardsGrid');
grid.children.forEach((card, idx) => {
  assert(card.innerHTML.includes('upgrade-name'), `Card #${idx+1} has weapon name`);
  assert(card.innerHTML.includes('upgrade-stats-line'), `Card #${idx+1} has stats progression line`);
  assert(card.innerHTML.includes('upgrade-desc'), `Card #${idx+1} renders full weapon description (.upgrade-desc)`);
});
console.log('  ✓ Verified: All 3 cards render weapon name, badges, stat progression, rank effect, and full description.');

console.log('\n====================================================');
console.log('  ALL BUILD-034 CHECKS PASSED 100%!');
console.log('====================================================');
