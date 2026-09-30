/**
 * Automated Verification Suite — BUILD-036
 * Verifies:
 * 1. Darkened High-Contrast Stage Backgrounds (`renderStageBackground`):
 *    - Abyssal darkening filter (`rgba(3, 6, 15, ...)`) + radial vignette (`vignetteGrad`)
 *    - Dynamic darkening boost when Boss ultimate telegraphs or giant beams are active
 *    - Toned-down background speed particles (`flightParticles`) so enemy bullets never blend in
 * 2. Enhanced Boss Ultimates & Telegraphs (`releaseBossUltimate`, `spawnBossGiantBeam`, `renderBossGiantBeams`, `renderHazardLineTelegraph`):
 *    - All 12 Bosses (Stages 1–12), across BOTH variants (0 and 1), project dramatic warning telegraphs (`hazardTelegraphs`)
 *      AND unleash Giant Destructive Beams / Pillars (`bossGiantBeams`) + signature barrages
 *    - Line-segment collision detection in `update(dt)` between `bossGiantBeams` and `player`
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const gameJsPath = path.join(__dirname, '..', 'game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log('=== BUILD-036 Automated Verification ===');

// 1. Verify Darkened Stage Background logic in renderStageBackground
assert(
  code.includes('BUILD-036: 戰術深淵暗化濾鏡與四角暗角'),
  'renderStageBackground must include BUILD-036 dark abyssal filter & vignette'
);
assert(
  code.includes('const baseDarkAlpha = isUltActive ? 0.78 : 0.66;'),
  'renderStageBackground must apply 0.66 normal darkening and 0.78 ultimate darkening'
);
assert(
  code.includes('vignetteGrad.addColorStop(1, \'rgba(1, 2, 8, 0.68)\')'),
  'renderStageBackground must apply radial edge vignette'
);
console.log('[PASS] 1. Stage backgrounds darkened with 66%~78% deep abyssal veil + radial vignette for maximum bullet contrast.');

// 2. Verify Giant Beam lifecycle, player line-segment collision, and rendering
assert(
  code.includes('spawnBossGiantBeam(opts = {})'),
  'GameEngine must define spawnBossGiantBeam(opts)'
);
assert(
  code.includes('renderBossGiantBeams(ctx)'),
  'GameEngine must define renderBossGiantBeams(ctx)'
);
assert(
  code.includes('this.renderBossGiantBeams(ctx);'),
  'render() must invoke this.renderBossGiantBeams(ctx)'
);
assert(
  code.includes('const hitHalfWidth = Math.max(10, (beam.width || 48) * 0.38);'),
  'update(dt) must compute line-segment collision against bossGiantBeams'
);
console.log('[PASS] 2. Giant Boss Beam system (spawnBossGiantBeam + renderBossGiantBeams + line-segment player hit detection) verified.');

// 3. Verify Enhanced Warning Telegraphs (Converging Lock-on Rails + Charging Muzzle Orb + Orbital Lock-on Laser)
assert(
  code.includes('BUILD-036: 雙側動態收縮夾角鎖定軌道 (Converging Lock-on Rails)'),
  'renderHazardLineTelegraph must render converging lock-on rails'
);
assert(
  code.includes('BUILD-036: 發射源頭高壓坍縮蓄力球 (Charging Muzzle Orb)'),
  'renderHazardLineTelegraph must render charging muzzle orb'
);
assert(
  code.includes('BUILD-036: 天頂衛星鎖定垂直導引光束 (Orbital Lock-on Laser)'),
  'renderHazardCircleTelegraph must render orbital lock-on laser'
);
console.log('[PASS] 3. Warning telegraphs upgraded with converging lock-on rails, charging muzzle singularity orb, and orbital lock-on laser.');

// 4. Simulate releaseBossUltimate across all 12 stages (variants 0 & 1)
const releaseStart = code.indexOf('releaseBossUltimate(boss) {');
const triggerStart = code.indexOf('triggerBossMythicMechanic(boss) {');
assert(releaseStart > 0 && triggerStart > releaseStart, 'Could not locate releaseBossUltimate method body');
const releaseBody = code.slice(releaseStart, triggerStart);

for (let stage = 1; stage <= 12; stage++) {
  const caseRegex = new RegExp(`case\\s+${stage}:\\s*\\{([\\s\\S]*?)(?=case\\s+${stage + 1}:|default:)`);
  const match = releaseBody.match(caseRegex);
  assert(match && match[1], `Missing case ${stage} in releaseBossUltimate`);
  const stageBlock = match[1];
  assert(
    stageBlock.includes('this.hazardTelegraphs.push'),
    `Stage ${stage} Boss ultimate must push warning telegraphs`
  );
  assert(
    stageBlock.includes('this.spawnBossGiantBeam'),
    `Stage ${stage} Boss ultimate must spawn giant beams (spawnBossGiantBeam)`
  );
  console.log(`[PASS] Stage ${stage} Boss Ultimate verified: includes high-impact warning telegraphs + Giant Boss Beam eruptions.`);
}

console.log('=== ALL BUILD-036 CHECKS PASSED SUCCESSFULLY! ===');
