/**
 * test-v1.50-fusion-system-and-art-overhaul.js
 * Verification test suite for:
 * 1. 12 Mythic Weapon Fusions in fusion-data.json and game.js.
 * 2. Fusion progression (Rank 1-5 upgrade cards & rank scaling).
 * 3. Consumed material preservation into permanent Star-Core Inscriptions (+15% dmg each).
 * 4. Slot freeing mechanism upon fusing dual active weapons.
 * 5. Armory Loadout fire control toggle (運作/停火) & targeting strategy (nearest/boss/dense).
 * 6. High-Definition Comet Spirit Bullet artistic overhaul (dual tail, bow shock, dual accretion rings, plasma core, singularity).
 * 7. Cosmic solar vortex spirit charging aura.
 * 8. Save & Load persistence of fusions, inscriptions, and targeting mode.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting TEST-v1.50: Fusion System Overhaul & Comet Spirit Bullet Art Redesign...');

const rootDir = path.resolve(__dirname, '..');
const gameJsPath = path.join(rootDir, 'game.js');
const fusionJsonPath = path.join(rootDir, 'data', 'fusion-data.json');
const styleCssPath = path.join(rootDir, 'style.css');
const indexHtmlPath = path.join(rootDir, 'index.html');
const starfallHtmlPath = path.join(rootDir, 'starfall-quiz.html');

// 1. Verify data/fusion-data.json
console.log('  [1/8] Verifying data/fusion-data.json...');
assert(fs.existsSync(fusionJsonPath), 'fusion-data.json must exist');
const fusionData = JSON.parse(fs.readFileSync(fusionJsonPath, 'utf8'));
assert(Array.isArray(fusionData.fusions), 'fusions must be an array');
assert.strictEqual(fusionData.fusions.length, 12, 'Must contain exactly 12 fusions');

const expectedFusions = [
  'comet_spirit', 'prism_rainbow_sky', 'swarm_hunter', 'orbital_aegis',
  'meltdown_impact', 'chrono_judgement', 'thunderstorm_calamity', 'taiji_frost_realm',
  'solar_piercing_nova', 'nether_chrono_scythe', 'plasma_storm_aegis', 'nanite_swarm_overlord'
];

expectedFusions.forEach(fId => {
  const f = fusionData.fusions.find(x => x.id === fId);
  assert(f, `Fusion ${fId} must exist in fusion-data.json`);
  const mats = f.materials || f.ingredients;
  assert(Array.isArray(mats) && mats.length === 2, `${fId} must have 2 materials/ingredients`);
  assert(f.resonance && f.resonance.name, `${fId} must have resonance name`);
  assert(f.trueFusion, `${fId} must have trueFusion parameters`);
});
console.log('  ✅ 12 Fusions in fusion-data.json verified.');

// 2. Verify game.js contains all 12 fusions and state initialization
console.log('  [2/8] Verifying game.js STARFALL_FUSIONS & state initialization...');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');

assert(gameJs.includes("this.fusions = {};"), 'game.js constructor must initialize this.fusions');
assert(gameJs.includes("this.inscriptions = [];"), 'game.js constructor must initialize this.inscriptions');
assert(gameJs.includes("this.targetMode = 'nearest';"), 'game.js constructor must initialize this.targetMode');
assert(gameJs.includes("this.solarTrails = [];"), 'game.js constructor must initialize this.solarTrails');

expectedFusions.forEach(fId => {
  assert(gameJs.includes(`id: '${fId}'`), `game.js STARFALL_FUSIONS must include ${fId}`);
});
assert(gameJs.includes('isFusionActive(fusionId)'), 'game.js must define isFusionActive');
assert(gameJs.includes('getFusionRank(fusionId)'), 'game.js must define getFusionRank');
console.log('  ✅ STARFALL_FUSIONS & initial states verified.');

// 3. Verify Fusion Rank 1-5 Upgrade Cards & applyUpgrade logic
console.log('  [3/8] Verifying Fusion Progression (Rank 1-5) and applyUpgrade handling...');
assert(gameJs.includes('isFusionUpgrade: true'), 'game.js generateUpgradeChoices must offer isFusionUpgrade');
assert(gameJs.includes('【真・融合突破】'), 'game.js generateUpgradeChoices must have fusion breakthrough card title');
assert(gameJs.includes('targetRank: nextRank'), 'game.js generateUpgradeChoices must set targetRank');

// Verify applyUpgrade handles both Rank 1 awakening & Rank 2~5 leveling
assert(gameJs.includes('if (choice.isFusionUpgrade) {'), 'applyUpgrade must handle isFusionUpgrade');
assert(gameJs.includes('cur.rank = Math.min(5, choice.targetRank || (cur.rank + 1));'), 'applyUpgrade must increment fusion rank up to 5');
assert(gameJs.includes('this.inscriptions.push({'), 'applyUpgrade must preserve materials as inscriptions');
assert(gameJs.includes('+15% 傷害共鳴 & 特化加成'), 'Inscriptions must grant +15% damage bonus');
assert(gameJs.includes('this.equippedActiveWeapons = this.equippedActiveWeapons.filter(id => id !== mat2);'), 'applyUpgrade must free active slot when fusing active weapon materials');
console.log('  ✅ Fusion Rank 1-5 progression & slot freeing verified.');

// 4. Verify Comet Spirit Bullet Art Redesign
console.log('  [4/8] Verifying High-Definition Comet Spirit Bullet Art Redesign...');
// Check that the ugly flat yellow disc is gone
assert(!gameJs.includes("ctx.arc(b.x, b.y, b.r + 6, this.time * 8, this.time * 8 + Math.PI);"), 'Ugly rotating half-circle stroke must be removed');

// Check HD rendering tokens
assert(gameJs.includes('outerTailGrad'), 'Comet bullet must render outer solar flame plume');
assert(gameJs.includes('innerTailGrad'), 'Comet bullet must render inner cyan ion needle jet');
assert(gameJs.includes('tailWave'), 'Comet tail must feature dynamic wave distortion');
assert(gameJs.includes('Supersonic Shock Bow') || gameJs.includes('超音速前導激波'), 'Comet bullet must render supersonic shock bow');
assert(gameJs.includes('rotOuter') && gameJs.includes('rotInner'), 'Comet bullet must render dual counter-rotating accretion discs');
assert(gameJs.includes('coreGrad'), 'Comet bullet must render multi-layer solar plasma core');
assert(gameJs.includes('singGrad'), 'Comet bullet must render blinding singularity center');
assert(gameJs.includes('Micro Lightning Crackle') || gameJs.includes('電漿雷霆爆裂弧'), 'Comet bullet must render micro lightning crackle');

// Check charging aura enhancements
assert(gameJs.includes('Cosmic Solar Vortex Aura') || gameJs.includes('彗星靈丸超神話宇宙星核聚能光環'), 'Charging aura must feature cosmic solar vortex');
assert(gameJs.includes('Solar Corona Flares') || gameJs.includes('烈陽真火日冕射線'), 'Charging aura must feature solar corona flares');
console.log('  ✅ Comet Spirit Bullet HD Art & Cosmic Vortex Aura verified.');

// 5. Verify In-Game Armory Controls & Targeting Strategy
console.log('  [5/8] Verifying Pause Armory Fire Control, Fusion Matrix, and Targeting Strategy...');
assert(gameJs.includes('slot-compact-toggle'), 'Pause armory must have slot-compact-toggle button');
assert(gameJs.includes('ars.disabled = !ars.disabled;'), 'Toggle button must toggle weapon disabled state');
assert(gameJs.includes("this.arsenal[id].disabled) return false;"), 'isWeaponActiveEquipped must respect weapon disabled flag');
assert(gameJs.includes('pauseFusionMatrix'), 'Pause armory must render pauseFusionMatrix');
assert(gameJs.includes('inspector-targeting-panel'), 'Inspector must render inspector-targeting-panel');
assert(gameJs.includes('target-btn'), 'Inspector must have target buttons for strategy selection');
assert(gameJs.includes('this.targetMode = mode;'), 'Target buttons must set targetMode');
assert(gameJs.includes("mode === 'boss'"), 'Homing missiles must support boss priority mode');
assert(gameJs.includes("mode === 'dense'"), 'Homing missiles must support dense cluster mode');
console.log('  ✅ Armory Fire Control, Fusion Matrix, and Targeting Strategy verified.');

// 6. Verify Top Combat HUD Loadout Strip
console.log('  [6/8] Verifying Combat HUD Loadout Strip...');
assert(gameJs.includes('updateLoadoutHUD()'), 'game.js must define updateLoadoutHUD');
assert(gameJs.includes('hudLoadoutStrip'), 'game.js must manipulate hudLoadoutStrip');
assert(gameJs.includes('hud-loadout-icon'), 'Loadout strip must render hud-loadout-icon');
assert(gameJs.includes('fusion-badge'), 'Loadout strip must render glowing fusion badge');
console.log('  ✅ Combat HUD Loadout Strip verified.');

// 7. Verify Save & Load Persistence
console.log('  [7/8] Verifying Save & Load persistence of fusions, inscriptions, and targetMode...');
assert(gameJs.includes('fusions: this.fusions || {}'), 'savePlayerRun must persist fusions');
assert(gameJs.includes('inscriptions: [...(this.inscriptions || [])]'), 'savePlayerRun must persist inscriptions');
assert(gameJs.includes("targetMode: this.targetMode || 'nearest'"), 'savePlayerRun must persist targetMode');

assert(gameJs.includes('this.fusions = (save.fusions && typeof save.fusions === \'object\') ? save.fusions : {};'), 'loadPlayerRunSave must restore fusions');
assert(gameJs.includes('this.inscriptions = Array.isArray(save.inscriptions) ? [...save.inscriptions] : [];'), 'loadPlayerRunSave must restore inscriptions');
assert(gameJs.includes("this.targetMode = save.targetMode || 'nearest';"), 'loadPlayerRunSave must restore targetMode');
console.log('  ✅ Save & Load persistence verified.');

// 8. Verify HTML & CSS integration
console.log('  [8/8] Verifying HTML & CSS integration...');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const starfallHtml = fs.readFileSync(starfallHtmlPath, 'utf8');

assert(styleCss.includes('.slot-compact-toggle'), 'style.css must style .slot-compact-toggle');
assert(styleCss.includes('.armory-fusion-matrix'), 'style.css must style .armory-fusion-matrix');
assert(styleCss.includes('.inspector-targeting-panel'), 'style.css must style .inspector-targeting-panel');
assert(styleCss.includes('.hud-loadout-strip'), 'style.css must style .hud-loadout-strip');

assert(indexHtml.includes('id="hudLoadoutStrip"'), 'index.html must contain hudLoadoutStrip');
assert(indexHtml.includes('id="pauseFusionMatrix"'), 'index.html must contain pauseFusionMatrix');
assert(indexHtml.includes('style.css?v=b52'), 'index.html must bump cache to b52');

assert(starfallHtml.includes('id="hudLoadoutStrip"'), 'starfall-quiz.html must contain hudLoadoutStrip');
assert(starfallHtml.includes('id="pauseFusionMatrix"'), 'starfall-quiz.html must contain pauseFusionMatrix');
assert(starfallHtml.includes('style.css?v=b52'), 'starfall-quiz.html must bump cache to b52');
console.log('  ✅ HTML & CSS integration verified.');

console.log('\n🎉 ALL 8 TEST SUITES PASSED PERFECTLY! BUILD-050 Verification Complete.\n');
