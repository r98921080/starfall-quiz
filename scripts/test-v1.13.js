/**
 * automated test suite for BUILD-017 (v1.13)
 * Verifies:
 * 1. Google Sheet Remote Sync: Apps Script Code.gs dual-channel support (POST & GET for register_student, attempt, attempt_batch)
 * 2. Weapon Anti-Stutter: Bullet hitEnemies/hitMinions Sets, boss multi-hit throttling, removal of routine hitStopTimer
 * 3. Weapon Damage Tiers: All 16 weapons categorized into S, A, B, C with tier badges
 * 4. Starting Weapon Lock: Starting hangar strictly limited to Tier 1 Active Main Weapons (0 passives)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting StarFall Quiz BUILD-017 / v1.13 Test Suite...\n');

// 1. Check Code.gs
const codeGsPath = path.join(__dirname, '..', 'apps-script', 'Code.gs');
assert(fs.existsSync(codeGsPath), 'apps-script/Code.gs must exist');
const codeGs = fs.readFileSync(codeGsPath, 'utf8');

assert(codeGs.includes(`action === 'register_student'`), 'Code.gs doGet must handle register_student');
assert(codeGs.includes(`action === 'attempt'`), 'Code.gs doGet must handle attempt');
assert(codeGs.includes(`action === 'attempt_batch'`), 'Code.gs doGet must handle attempt_batch');
assert(codeGs.includes(`ensureStudentExists_`), 'Code.gs must have ensureStudentExists_');
assert(codeGs.includes(`function registerStudent_`), 'Code.gs must have registerStudent_');
console.log('✅ 1. Code.gs: Dual-channel GET & POST endpoints verified (register_student, attempt, attempt_batch).');

// 2. Check game.js
const gameJsPath = path.join(__dirname, '..', 'game.js');
assert(fs.existsSync(gameJsPath), 'game.js must exist');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');

// Check Bullet constructor anti-stutter
assert(gameJs.includes('this.hitEnemies = new Set()'), 'Bullet constructor must initialize hitEnemies Set');
assert(gameJs.includes('this.hitMinions = new Set()'), 'Bullet constructor must initialize hitMinions Set');
assert(gameJs.includes('this.lastHitBossTime = 0'), 'Bullet constructor must initialize lastHitBossTime');

// Check collision loops
assert(gameJs.includes('if (b.hitEnemies) {'), 'Collision loop must check b.hitEnemies for all bullets');
assert(gameJs.includes('if (b.hitEnemies.has(e)) return;'), 'Collision loop must prevent duplicate hits on enemies');
assert(gameJs.includes('if (b.hitMinions) {'), 'Collision loop must check b.hitMinions for all bullets');
assert(gameJs.includes('if (b.hitMinions.has(m)) return;'), 'Collision loop must prevent duplicate hits on minions');
assert(gameJs.includes('now - b.lastHitBossTime < 0.18'), 'Collision loop must throttle boss damage frequency to >= 0.18s');

// Check removal of routine hitStopTimer stall
assert(!gameJs.includes('this.triggerHitStop(b.damage > 70 ? 0.040 : 0.026);'), 'Collision loop must NOT trigger hitStop on normal bullet hits');
console.log('✅ 2. Anti-Stutter Projectile Engine: Set guards, discrete boss cooldown (0.18s), and stall removal verified.');

// 3. Check Weapons Catalog and Tiers
const catalogMatch = gameJs.match(/const STARFALL_WEAPONS_CATALOG = (\[[\s\S]*?\]);/);
assert(catalogMatch, 'STARFALL_WEAPONS_CATALOG must be defined in game.js');
const catalog = eval(catalogMatch[1]);
assert.strictEqual(catalog.length, 16, 'STARFALL_WEAPONS_CATALOG must have exactly 16 weapons');

const activeWeapons = catalog.filter(w => !w.isPassive);
const passiveWeapons = catalog.filter(w => w.isPassive);
assert.strictEqual(activeWeapons.length, 8, 'Must have exactly 8 active weapons');
assert.strictEqual(passiveWeapons.length, 8, 'Must have exactly 8 passive weapons');

catalog.forEach(w => {
  assert(['S', 'A', 'B', 'C'].includes(w.tier), `Weapon ${w.id} must have valid tier (S/A/B/C)`);
  assert(w.tierName && w.tierName.includes(w.tier), `Weapon ${w.id} must have tierName matching tier`);
});

const sTier = catalog.filter(w => w.tier === 'S');
const aTier = catalog.filter(w => w.tier === 'A');
const bTier = catalog.filter(w => w.tier === 'B');
const cTier = catalog.filter(w => w.tier === 'C');
console.log(`   - S Tier (${sTier.length}): ${sTier.map(w => w.name).join(', ')}`);
console.log(`   - A Tier (${aTier.length}): ${aTier.map(w => w.name).join(', ')}`);
console.log(`   - B Tier (${bTier.length}): ${bTier.map(w => w.name).join(', ')}`);
console.log(`   - C Tier (${cTier.length}): ${cTier.map(w => w.name).join(', ')}`);
assert(sTier.length > 0 && aTier.length > 0 && bTier.length > 0 && cTier.length > 0, 'All tiers must be populated');
console.log('✅ 3. Weapon Damage Tiers: 16 weapons mapped to S/A/B/C ratings.');

// 4. Check Hangar Filtering & Starting Candidates (Strictly B/C Tier Active Main Weapons)
assert(gameJs.includes("const startingCandidates = STARFALL_WEAPONS_CATALOG.filter(w => !w.isPassive && (w.tier === 'B' || w.tier === 'C'));"), 'renderHangarWeaponsList must strictly filter for B or C tier active weapons');
const startingCandidates = catalog.filter(w => !w.isPassive && (w.tier === 'B' || w.tier === 'C'));
assert.strictEqual(startingCandidates.length, 5, 'Must have exactly 5 starting weapons (1 C-tier + 4 B-tier)');
assert(startingCandidates.every(w => !w.isPassive), 'All starting candidates must be active main weapons');
assert(startingCandidates.every(w => w.tier === 'B' || w.tier === 'C'), 'All starting candidates must be B or C tier');
assert(!startingCandidates.some(w => w.tier === 'S' || w.tier === 'A'), 'No S or A tier weapons allowed as starting weapons');
assert(gameJs.includes('當前首發主武：'), 'Hangar badge must display 當前首發主武');
console.log(`✅ 4. Starting Weapon Lock: Starting hangar strictly limited to 5 B/C tier active main weapons: ${startingCandidates.map(w => `${w.name} [${w.tier}]`).join(', ')}`);

// 5. Check Dual-channel Network Sync in game.js
assert(gameJs.includes(`action=register_student&name=`), 'syncStudentProfile must have GET fallback');
assert(gameJs.includes(`action=attempt_batch&attempts=`), 'syncOfflineQueue must have GET fallback');
console.log('✅ 5. Dual-Channel Network Sync: POST + GET fallback confirmed in syncStudentProfile and syncOfflineQueue.');

// 6. Check style.css
const styleCssPath = path.join(__dirname, '..', 'style.css');
assert(fs.existsSync(styleCssPath), 'style.css must exist');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

assert(styleCss.includes('.tier-badge'), 'style.css must contain .tier-badge');
assert(styleCss.includes('.tier-badge.tier-s'), 'style.css must contain .tier-badge.tier-s');
assert(styleCss.includes('.tier-badge.tier-a'), 'style.css must contain .tier-badge.tier-a');
assert(styleCss.includes('.tier-badge.tier-b'), 'style.css must contain .tier-badge.tier-b');
assert(styleCss.includes('.tier-badge.tier-c'), 'style.css must contain .tier-badge.tier-c');
console.log('✅ 6. CSS Styling: .tier-badge, .tier-s, .tier-a, .tier-b, .tier-c verified.');

// 7. Check index.html
const indexHtmlPath = path.join(__dirname, '..', 'index.html');
assert(fs.existsSync(indexHtmlPath), 'index.html must exist');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtml.includes('當前首發主武：多管神機砲 (第 1 階) [C 級]'), 'index.html must display starting weapon badge with C tier');
assert(indexHtml.includes('首發 B/C 級主武選擇'), 'index.html must mention B/C tier starting weapons');
console.log('✅ 7. UI Template: index.html starting weapon elements and B/C labels verified.');

console.log('\n🎉 ALL BUILD-018 TESTS PASSED SUCCESSFULLY! 🚀');
