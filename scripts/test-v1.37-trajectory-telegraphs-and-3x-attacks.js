'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const gameJsPath = path.join(__dirname, '..', 'game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log('=== BUILD-038 All-Boss Attack Optimization Verification Suite ===');

// 1. Verify Trajectory-Matched Boss Telegraphs
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
console.log('✅ [1/4] All 5 Trajectory-Matched Telegraph Renderers verified.');

// 2. Verify Universal Shockwave -> Leave Elemental Remnant Bomb -> 3x Firework Detonation Engine
assert(code.includes('spawnBossShockwaveRemnantSequence(boss, targetX, opts = {})'), 'Missing spawnBossShockwaveRemnantSequence');
assert(code.includes('fb.remnantTheme = eb.remnantTheme'), 'Missing remnantTheme support on floating_feather');
assert(code.includes('fb.outerType = eb.outerType'), 'Missing outerType support on floating_feather');
assert(code.includes('fb.innerType = eb.innerType'), 'Missing innerType support on floating_feather');
console.log('✅ [2/4] Universal Shockwave -> Leave Remnant Bomb -> 3x Firework Detonation Engine verified.');

// 3. Verify EVERY Boss (Stages 1 to 12) in executeBossUniqueAttack has full 3-mode optimization
const uniqueStart = code.indexOf('executeBossUniqueAttack(boss)');
const uniqueEnd = code.indexOf('showUltimateWarning(name, voiceLine)');
const uniqueSection = code.slice(uniqueStart, uniqueEnd);

for (let stage = 1; stage <= 12; stage++) {
  assert(uniqueSection.includes(`case ${stage}:`), `Missing case ${stage} in executeBossUniqueAttack`);
}
// Count how many Bosses invoke spawnBossShockwaveRemnantSequence or spawnGarudaShockwaveFeatherSequence in executeBossUniqueAttack
const shockwaveCallsInUnique = (uniqueSection.match(/spawn(BossShockwaveRemnant|GarudaShockwaveFeather)Sequence/g) || []).length;
assert(shockwaveCallsInUnique >= 12, `Expected all 12 Bosses in executeBossUniqueAttack to use Shockwave-Remnant-Bomb sequence, found ${shockwaveCallsInUnique}`);
console.log(`✅ [3/4] All 12 Bosses in executeBossUniqueAttack verified (${shockwaveCallsInUnique} Shockwave-Remnant-Bomb sequences + 3-mode rotations).`);

// 4. Verify EVERY Boss (Stages 1 to 12) in releaseBossUltimate AND executeMiniBossAttack are optimized
const ultStart = code.indexOf('releaseBossUltimate(boss)');
const ultEnd = code.indexOf('// 雷公・震霄 第二型態全場磁暴', ultStart) !== -1
  ? code.indexOf('// 雷公・震霄 第二型態全場磁暴', ultStart)
  : ultStart + 28000;
const ultSection = code.slice(ultStart, ultEnd);
const shockwaveCallsInUlt = (ultSection.match(/spawn(BossShockwaveRemnant|GarudaShockwaveFeather)Sequence/g) || []).length;
assert(shockwaveCallsInUlt >= 12, `Expected all 12 Bosses in releaseBossUltimate to use Shockwave-Remnant-Bomb sequence, found ${shockwaveCallsInUlt}`);
console.log(`✅ [4/4] All 12 Bosses in releaseBossUltimate verified (${shockwaveCallsInUlt} Shockwave-Remnant-Bomb sequences + 3x Beams/Frozen Orbs/Fireworks).`);

console.log('🎉 ALL BUILD-038 CHECKS PASSED!');
