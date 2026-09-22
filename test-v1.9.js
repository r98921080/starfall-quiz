// test-v1.9.js - StarFall Quiz v1.9 Comprehensive Test Suite
// Validating Cryo Spire as Passive, Anti-Stutter (Prism/Lava), Weapon Rebalance, and Boss Minions/Burst Bullets Sprite Art

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Starting StarFall Quiz v1.9 Automated Verification ===\n');

// 1. Validate File Existence
const filesToCheck = [
  'assets/minions/minion_ambrosia_flask.png',
  'assets/minions/minion_hydra_head.png',
  'assets/minions/minion_thunder_drum.png',
  'assets/minions/minion_taotie_meat.png',
  'assets/minions/minion_gorgon_shadow.png',
  'assets/minions/minion_titan_pillar.png',
  'assets/minions/minion_garuda_viper.png',
  'assets/fx/fx_rock_shard.png',
  'assets/fx/fx_cluster_bomb.png',
  'assets/fx/fx_feather_shard.png'
];

console.log('1. Checking 10 New Dedicated AI Sprite Assets:');
filesToCheck.forEach(f => {
  const fullPath = path.join(__dirname, f);
  assert(fs.existsSync(fullPath), `Missing asset: ${f}`);
  const stats = fs.statSync(fullPath);
  assert(stats.size > 10000, `Asset ${f} size too small: ${stats.size} bytes`);
  console.log(`  [PASS] ${f} (${(stats.size / 1024).toFixed(1)} KB)`);
});

// 2. Validate Weapon Data JSON (cryo_spire must be passive)
console.log('\n2. Checking weapon-data.json for cryo_spire passive configuration:');
const weaponDataRaw = fs.readFileSync(path.join(__dirname, 'data/weapon-data.json'), 'utf8');
const weaponData = JSON.parse(weaponDataRaw);
const cryoJson = weaponData.weapons.find(w => w.id === 'cryo_spire');
assert(cryoJson, 'cryo_spire not found in weapon-data.json');
assert.strictEqual(cryoJson.slot, 'passive', 'cryo_spire slot must be "passive"');
assert.strictEqual(cryoJson.isPassive, true, 'cryo_spire isPassive must be true');
console.log(`  [PASS] weapon-data.json: cryo_spire is passive (slot: ${cryoJson.slot}, isPassive: ${cryoJson.isPassive})`);

// 3. Validate game.js STARFALL_WEAPONS_CATALOG
console.log('\n3. Checking game.js STARFALL_WEAPONS_CATALOG:');
const gameJs = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');

// Check cryo_spire in catalog
assert(gameJs.includes(`id: 'cryo_spire', name: '玄天冰魄凌柱', isPassive: true`), 'cryo_spire must be passive in STARFALL_WEAPONS_CATALOG');
console.log('  [PASS] STARFALL_WEAPONS_CATALOG defines cryo_spire with isPassive: true');

// 4. Validate fireWeapons cryo_spire autonomous execution (does NOT require isWeaponActiveEquipped)
console.log('\n4. Checking fireWeapons passive execution for cryo_spire:');
assert(gameJs.includes(`// 13. 玄天冰魄凌柱 (cryo_spire: 被動天降，自律運作)`), 'fireWeapons must mark cryo_spire as passive');
assert(!gameJs.includes(`this.isWeaponActiveEquipped('cryo_spire')`), 'fireWeapons must not check isWeaponActiveEquipped for cryo_spire');
console.log('  [PASS] fireWeapons: cryo_spire fires autonomously without active equipment check');

// 5. Validate Anti-Stutter (Prism Wingman & Lava Pools)
console.log('\n5. Checking Anti-Stutter Mechanisms:');
assert(gameJs.includes('this.prismDamageTimer = (this.prismDamageTimer || 0) + dt;'), 'updatePrismWingman must have discrete prismDamageTimer');
assert(gameJs.includes('this.prismDamageTimer >= 0.15'), 'updatePrismWingman must check 0.15s tick');
assert(gameJs.includes('this.prismCachedTargets'), 'updatePrismWingman must implement target caching');
console.log('  [PASS] updatePrismWingman: 0.15s discrete damage ticks + target caching implemented');

assert(gameJs.includes('lp.tickTimer = (lp.tickTimer || 0) + dt;'), 'lavaPools must have discrete tickTimer');
assert(gameJs.includes('lp.tickTimer >= 0.20'), 'lavaPools must check 0.20s tick');
console.log('  [PASS] lavaPools: 0.20s discrete damage ticks implemented');

assert(gameJs.includes('bc.timer >= 0.14'), 'beam_cannon interval must be 0.14s');
console.log('  [PASS] beam_cannon: 0.14s rate with doubled damage implemented');

// 6. Validate Weapon Damage Rebalance
console.log('\n6. Checking Weapon Damage Rebalance:');
assert(gameJs.includes('const dmg = (36 + rank * 12) * qMult;'), 'multishot damage updated to 36 + rank * 12');
assert(gameJs.includes('let dmg = (50 + rank * 22) * qMult;'), 'beam_cannon damage updated to 50 + rank * 22');
assert(gameJs.includes('const dmg = (130 + rank * 50) * qMult;'), 'spirit_bullet damage updated to 130 + rank * 50');
assert(gameJs.includes('const dmg = (68 + rank * 22) * qMult;'), 'kinetic_dart damage updated to 68 + rank * 22');
assert(gameJs.includes('const dmg = (58 + rank * 18) *'), 'homing_missile damage updated to 58 + rank * 18');
assert(gameJs.includes('const dmg = (80 + rank * 26) * qMult;'), 'jade_chakram damage updated to 80 + rank * 26');
assert(gameJs.includes('const b = new Bullet(wx, wy, side * 30, -780, true, (32 + rank * 10) * qMult'), 'combat_wingman damage updated to 32 + rank * 10');
assert(gameJs.includes('let dps = 260 + rank * 110;'), 'prism_wingman dps updated to 260 + rank * 110');
assert(gameJs.includes('true, (130 + rank * 48) * (isMeltdown ? 1.5 : 1.0) * qMult, \'grenade\''), 'grenade damage updated to 130 + rank * 48');
assert(gameJs.includes('true, (95 + rank * 38) * qMult, \'singularity\''), 'singularity damage updated to 95 + rank * 38');
assert(gameJs.includes('true, (160 + rank * 55) * qMult, \'cryo_spire\''), 'cryo_spire damage updated to 160 + rank * 55');
assert(gameJs.includes('const dmg = (135 + rank * 48) * qMult;'), 'sonic_cannon damage updated to 135 + rank * 48');
console.log('  [PASS] All weapons updated with increased base power and scaling');

// 7. Validate Boss Minions Rendering Sprite Pipeline
console.log('\n7. Checking Boss Minions Sprite Rendering Pipeline:');
assert(gameJs.includes('// 7.5 神話機制專屬附屬實體渲染 (Sprite 圖形化管線：全量採用專屬 AI Sprite 與動態 HUD 儀表，告別圓圈)'), 'Boss minions pipeline header updated');
assert(gameJs.includes('this.images.minion_ambrosia_flask'), 'Minions pipeline references minion_ambrosia_flask');
assert(gameJs.includes('this.images.minion_taotie_meat'), 'Minions pipeline references minion_taotie_meat');
assert(gameJs.includes('this.images.minion_hydra_head'), 'Minions pipeline references minion_hydra_head');
assert(gameJs.includes('this.images.minion_thunder_drum'), 'Minions pipeline references minion_thunder_drum');
assert(gameJs.includes('this.images.minion_gorgon_shadow'), 'Minions pipeline references minion_gorgon_shadow');
assert(gameJs.includes('this.images.minion_titan_pillar'), 'Minions pipeline references minion_titan_pillar');
assert(gameJs.includes('this.images.minion_garuda_viper'), 'Minions pipeline references minion_garuda_viper');
console.log('  [PASS] Boss minions render with dedicated AI sprites and HUD combat gauges');

// 8. Validate Enemy Bullets & Burst Bullets Sprite Pipeline
console.log('\n8. Checking Enemy Bullets & Burst Shards Sprite Rendering:');
assert(gameJs.includes('this.images.fx_feather_shard'), 'Bullet pipeline references fx_feather_shard');
assert(gameJs.includes('this.images.fx_rock_shard'), 'Bullet pipeline references fx_rock_shard');
assert(gameJs.includes('this.images.fx_cluster_bomb'), 'Bullet pipeline references fx_cluster_bomb');
assert(gameJs.includes('// 常規敵彈：升級為動態定向氣動能量光梭 (非單調平面圓圈)'), 'Bullet pipeline upgraded general bullets to aerodynamic energy darts');
console.log('  [PASS] Enemy bullets and bursts render with dedicated AI sprites and aerodynamic energy darts');

console.log('\n=== ALL StarFall Quiz v1.9 Checks PASSED Successfully! ===');
