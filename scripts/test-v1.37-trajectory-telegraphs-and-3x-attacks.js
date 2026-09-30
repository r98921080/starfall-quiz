'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const gameJsPath = path.join(__dirname, '..', 'game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log('=== BUILD-037 Automated Verification Suite ===');

// 1. Verify Trajectory-Matched Boss Telegraphs (Request 1)
const requiredTelegraphRenderers = [
  'renderHazardConeTelegraph',
  'renderHazardSpiralTelegraph',
  'renderHazardWaveTelegraph',
  'renderHazardRingNovaTelegraph',
  'renderHazardGarudaFeatherPathTelegraph'
];
for (const fnName of requiredTelegraphRenderers) {
  assert(code.includes(`${fnName}(ctx, h)`), `Missing telegraph renderer: ${fnName}`);
}
assert(code.includes("h.type === 'cone'"), 'Missing cone telegraph dispatch in render()');
assert(code.includes("h.type === 'spiral'"), 'Missing spiral telegraph dispatch in render()');
assert(code.includes("h.type === 'wave'"), 'Missing wave telegraph dispatch in render()');
assert(code.includes("h.type === 'ring_nova'"), 'Missing ring_nova telegraph dispatch in render()');
assert(code.includes("h.type === 'garuda_feather_path'"), 'Missing garuda_feather_path telegraph dispatch in render()');
console.log('✅ [1/3] Trajectory-Matched Boss Telegraphs (cone, spiral, wave, ring_nova, garuda_feather_path) verified.');

// 2. Verify 3x Post-Telegraph Attacks, Diablo II Frozen Orb, and Firework Burst Shells (Request 2)
assert(code.includes('spawnMythicFrozenOrb(opts = {})'), 'Missing spawnMythicFrozenOrb helper');
assert(code.includes("'frozen_orb'"), 'Missing frozen_orb bullet type');
assert(code.includes('spawnFireworkBurstShell(opts = {})'), 'Missing spawnFireworkBurstShell helper');
assert(code.includes("'firework_shell'"), 'Missing firework_shell bullet type');
assert(code.includes('isMega = true'), 'Missing isMega flag on enhanced boss bullets');
assert(code.includes("if (eb.type !== 'floating_feather' && (eb.isMega || (eb.r && eb.r >= 12)))"), 'Missing 3x megaScale automatic canvas scaling in render()');
assert(code.includes('ctx.scale(megaScale, megaScale);'), 'Missing ctx.scale(megaScale, megaScale) for 3x bullets');
console.log('✅ [2/3] 3x Colossal Post-Telegraph Attacks, Diablo Frozen Orbs (frozen_orb), and Multi-Stage Firework Shells (firework_shell) verified.');

// 3. Verify Garuda's 3-Stage Sequence: Telegraph -> Shockwave (Giant Beam + Giant Shockwave Orb) -> Leave Feathers -> Feather Explosion (Request 3)
assert(code.includes('spawnGarudaShockwaveFeatherSequence(boss, targetX, dropYs = [165, 285, 405], warningTime = 1.0)'), 'Missing spawnGarudaShockwaveFeatherSequence helper');
assert(code.includes("'garuda_shockwave'"), 'Missing garuda_shockwave projectile type');
assert(code.includes('eb.dropCheckpoints'), 'Missing checkpoint feather-dropping logic on garuda_shockwave');
assert(code.includes("'floating_feather'"), 'Missing floating_feather dropped in wake of garuda_shockwave');
assert(code.includes('BUILD-037: 迦樓羅第二段「衝擊波遺留之滯空金羽」，倒數結束後引發 3 倍巨型羽刃煙火大爆炸！'), 'Missing 3x feather firework detonation');
console.log('✅ [3/3] Garuda 3-stage sequence (Warning -> 3x Shockwave Beam & Shockwave Orb -> Leave Feathers -> 3x Feather Firework Detonation) verified.');

console.log('🎉 ALL BUILD-037 CHECKS PASSED!');
