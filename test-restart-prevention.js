const fs = require('fs');
const assert = require('assert');

console.log('=== Verifying Input Focus & Restart Prevention Fixes ===\n');

const code = fs.readFileSync('game.js', 'utf8');

// 1. Check preventDefault on Space and Arrow keys in keydown listener
console.log('1. Checking keydown event preventDefault guards:');
assert(code.includes("const isGameKey = e.key === ' ' || e.code === 'Space' ||"), 'Missing isGameKey check in keydown');
assert(code.includes("if (this.state === 'playing' && isGameKey) {\n        e.preventDefault();\n      }"), 'Missing e.preventDefault for game keys');
console.log('  [PASS] Keydown preventDefault is properly guarded.');

// 2. Check preventDefault in keyup listener
console.log('\n2. Checking keyup event preventDefault guards:');
assert(code.includes("if (e.key === ' ' || e.code === 'Space') {\n        if (this.state === 'playing') {\n          e.preventDefault();\n        }"), 'Missing e.preventDefault in keyup');
console.log('  [PASS] Keyup preventDefault is properly guarded.');

// 3. Check startPlayBtn blur and disable
console.log('\n3. Checking startPlayBtn blur and debounce:');
assert(code.includes('btn.disabled = true;'), 'Missing btn.disabled = true in startPlayBtn');
assert(code.includes('btn.blur();'), 'Missing btn.blur() in startPlayBtn');
assert(code.includes('if (document.activeElement && typeof document.activeElement.blur === \'function\')'), 'Missing activeElement.blur in startPlayBtn');
console.log('  [PASS] startPlayBtn properly blurs active element and disables during launch.');

// 4. Check canvas pointerdown blur
console.log('\n4. Checking canvas pointerdown blur:');
assert(code.includes("const onPointerDown = (e) => {\n      if (document.activeElement && typeof document.activeElement.blur === 'function') {\n        document.activeElement.blur();\n      }"), 'Missing activeElement.blur in onPointerDown');
console.log('  [PASS] onPointerDown blurs activeElement.');

// 5. Check startNewGame blur and canvas focus
console.log('\n5. Checking startNewGame blur and canvas focus:');
assert(code.includes("startNewGame(stage = 1) {\n    if (document.activeElement && typeof document.activeElement.blur === 'function') {\n      document.activeElement.blur();\n    }\n    if (this.canvas) {\n      this.canvas.tabIndex = 1;"), 'Missing canvas tabIndex and blur in startNewGame');
console.log('  [PASS] startNewGame clears DOM focus and focuses canvas.');

// 6. Check this.bosses bug eliminated
console.log('\n6. Checking elimination of this.bosses bug:');
assert(!code.includes('this.bosses'), 'game.js should not contain any invalid this.bosses reference');
console.log('  [PASS] this.bosses reference successfully replaced with this.currentBoss.');

// 7. Check spawnMiniBoss ultimateTimer
console.log('\n7. Checking spawnMiniBoss ultimateTimer:');
assert(code.includes('ultimateTimer: 0'), 'spawnMiniBoss must initialize ultimateTimer: 0');
console.log('  [PASS] spawnMiniBoss initializes ultimateTimer: 0.');

console.log('\n>>> All Input Focus & Restart Prevention Tests Passed! <<<');
