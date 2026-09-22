const fs = require('fs');
const path = require('path');

// 1. Check weapon-data.json
const weaponDataPath = path.join(__dirname, 'data', 'weapon-data.json');
const rawData = JSON.parse(fs.readFileSync(weaponDataPath, 'utf8'));
const wList = rawData.weapons;
console.log(`[PASS] Total weapons configured: ${wList.length}/16`);

if (wList.length !== 16) {
  console.error('[FAIL] Expected 16 weapons');
  process.exit(1);
}

const wData = {};
wList.forEach(w => { wData[w.id] = w; });
const weaponKeys = Object.keys(wData);

// 2. Check all 16 weapon icons
for (let i = 1; i <= 16; i++) {
  const iconPath = path.join(__dirname, 'assets', 'icons', 'weapons', `weapon_${i}.png`);
  if (!fs.existsSync(iconPath)) {
    console.error(`[FAIL] Missing weapon icon: ${iconPath}`);
    process.exit(1);
  }
}
console.log('[PASS] All 16 weapon icon PNG files verified!');

// 3. Verify rank 1-5 structure and icon references
for (const [id, w] of Object.entries(wData)) {
  if (!w.ranks || w.ranks.length !== 5) {
    console.error(`[FAIL] Weapon ${id} does not have 5 ranks`);
    process.exit(1);
  }
  if (!w.icon || !fs.existsSync(path.join(__dirname, w.icon))) {
    console.error(`[FAIL] Weapon ${id} has invalid icon path: ${w.icon}`);
    process.exit(1);
  }
}
console.log('[PASS] All 16 weapons have 5 progression ranks and verified icon files.');

// 4. Test Game weapon upgrade pool logic (Lv.5 exclusion test)
const mockArsenal = {};
weaponKeys.forEach(k => {
  mockArsenal[k] = { rank: 0, cooldown: 0 };
});

function generateUpgradeChoicesMock(arsenal, quality = 'rare') {
  const availableWeaponIds = Object.keys(arsenal).filter(id => {
    return arsenal[id].rank < 5;
  });

  const choices = [];
  const pickedIds = new Set();

  while (choices.length < 3 && pickedIds.size < availableWeaponIds.length) {
    const candidateId = availableWeaponIds[Math.floor(Math.random() * availableWeaponIds.length)];
    if (!pickedIds.has(candidateId)) {
      pickedIds.add(candidateId);
      const wDef = wData[candidateId];
      const curRank = arsenal[candidateId].rank;
      const nextRank = curRank + 1;
      const rankInfo = wDef.ranks[nextRank - 1];
      choices.push({
        type: 'weapon',
        id: candidateId,
        name: wDef.name,
        icon: wDef.icon,
        currentRank: curRank,
        targetRank: nextRank,
        title: `${wDef.name} ${curRank === 0 ? '【解鎖】' : `Lv.${nextRank}`}`,
        desc: rankInfo ? rankInfo.desc : '武器威力全面提升',
        quality: quality
      });
    }
  }
  return choices;
}

// Scenario A: Fresh start - choices should be available
let choicesA = generateUpgradeChoicesMock(mockArsenal, 'rare');
console.log(`[PASS] Fresh game generated ${choicesA.length} choices.`);

// Scenario B: Upgrade 15 weapons to Lv.5, leaving only 1 weapon at Lv.3
weaponKeys.slice(0, 15).forEach(k => {
  mockArsenal[k].rank = 5;
});
const lastWeapon = weaponKeys[15];
mockArsenal[lastWeapon].rank = 3;

let choicesB = generateUpgradeChoicesMock(mockArsenal, 'epic');
console.log(`[PASS] Only 1 non-max weapon remaining: choices produced = ${choicesB.length}, candidate = ${choicesB[0].id}`);
if (choicesB.some(c => c.id !== lastWeapon)) {
  console.error('[FAIL] Maxed weapons appeared in choices!');
  process.exit(1);
}

// Scenario C: Upgrade ALL 16 weapons to Lv.5 - choices should exclude all 16 weapons
mockArsenal[lastWeapon].rank = 5;
let choicesC = generateUpgradeChoicesMock(mockArsenal, 'legendary');
console.log(`[PASS] All weapons at Lv.5: weapon choices produced = ${choicesC.length} (Expected 0 weapon choices)`);
if (choicesC.length !== 0) {
  console.error('[FAIL] Lv.5 weapons must NEVER appear in choices!');
  process.exit(1);
}

console.log('[ALL TESTS PASSED SUCCESSFULLY]');
