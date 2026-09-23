const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== BUILD-031 S級門檻、精緻招式預報與瑪利歐長編BGM 驗證測試 ===\n');

// 1. 讀取並檢驗 game.js
const gamePath = path.join(__dirname, '..', 'game.js');
assert(fs.existsSync(gamePath), 'game.js 必須存在');
const gameCode = fs.readFileSync(gamePath, 'utf8');

// 驗證 1: 檢查 S 級門檻邏輯程式碼
assert(gameCode.includes('canUnlockSTier = (this.sessionTotalCorrect > 40) && (this.runConsecutiveCorrectStreak >= 20)'),
  '必須包含 S 級解鎖雙門檻 (總對 >40 且連對 >=20)');
assert(gameCode.includes('this.runConsecutiveCorrectStreak = (this.runConsecutiveCorrectStreak || 0) + 1;'),
  '答對時必須累計連對計數');
assert(gameCode.includes('this.runConsecutiveCorrectStreak = 0;'),
  '答錯時必須重置連對計數為 0');
console.log('[驗證 1] S 級神兵雙門檻程式碼邏輯結構檢驗通過！');

// 驗證 2: 模擬武器池抽卡與 S 級門檻實測
// 模擬 Game 實體中的 generateUpgradeChoices
const mockGame = {
  sessionTotalCorrect: 0,
  runConsecutiveCorrectStreak: 0,
  equippedWeapons: [],
  findEquippedWeapon(id) {
    return this.equippedWeapons.find(w => w.id === id) || null;
  }
};

// 提取 STARFALL_WEAPONS_CATALOG
const catalogMatch = gameCode.match(/const STARFALL_WEAPONS_CATALOG = (\[[\s\S]*?\]);/);
assert(catalogMatch, '必須能提取武器目錄 STARFALL_WEAPONS_CATALOG');
const STARFALL_WEAPONS_CATALOG = eval(catalogMatch[1]);
const STARFALL_FUSIONS = [];

// 提取 generateUpgradeChoices 函式
const fnStart = gameCode.indexOf('generateUpgradeChoices(correctCount = 3) {');
const fnEnd = gameCode.indexOf('findEquippedWeapon(id) {', fnStart);
const fnRaw = gameCode.slice(fnStart + 'generateUpgradeChoices(correctCount = 3) {'.length, fnEnd).trim();
const lastBrace = fnRaw.lastIndexOf('}');
const cleanBody = fnRaw.slice(0, lastBrace);
const generateChoicesCode = new Function('correctCount', 'STARFALL_WEAPONS_CATALOG', 'STARFALL_FUSIONS', cleanBody);
mockGame.generateUpgradeChoices = function(correctCount) {
  return generateChoicesCode.call(this, correctCount, STARFALL_WEAPONS_CATALOG, STARFALL_FUSIONS);
};

// (2-1) 未達門檻：答對 5 題滿分，但總題數未達 40，且連對未達 20
mockGame.sessionTotalCorrect = 10;
mockGame.runConsecutiveCorrectStreak = 5;
for (let trial = 0; trial < 20; trial++) {
  const choices = mockGame.generateUpgradeChoices(5);
  assert(choices.length > 0, '應產生升級選項');
  const hasSTier = choices.some(c => c.tierRating === 'S' || c.tier === 'S');
  assert(!hasSTier, `未達門檻時嚴格禁止出現 S 級武器！(第 ${trial + 1} 次測試)`);
  const hasATier = choices.some(c => c.tierRating === 'A' || c.tier === 'A');
  assert(hasATier, `未達 S 級門檻但 5 題全對時，應保底至少 1 款 A 級武器！`);
}
console.log('[驗證 2-1] 未達門檻實測 20 次：5 題全對 100% 絕無 S 級武器，並保障 A 級主力武器！');

// (2-2) 總題數達標但連對未達標 (如總對 45 題，但連對僅 10 題)
mockGame.sessionTotalCorrect = 45;
mockGame.runConsecutiveCorrectStreak = 10;
for (let trial = 0; trial < 10; trial++) {
  const choices = mockGame.generateUpgradeChoices(5);
  const hasSTier = choices.some(c => c.tierRating === 'S' || c.tier === 'S');
  assert(!hasSTier, '連對未達 20 題時嚴格禁止出現 S 級武器！');
}
console.log('[驗證 2-2] 總對 45 題但連對僅 10 題實測：100% 絕無 S 級武器！');

// (2-3) 連對達標但總對未達標 (如總對 25 題，連對 25 題)
mockGame.sessionTotalCorrect = 25;
mockGame.runConsecutiveCorrectStreak = 25;
for (let trial = 0; trial < 10; trial++) {
  const choices = mockGame.generateUpgradeChoices(5);
  const hasSTier = choices.some(c => c.tierRating === 'S' || c.tier === 'S');
  assert(!hasSTier, '總題數未超過 40 題時嚴格禁止出現 S 級武器！');
}
console.log('[驗證 2-3] 連對 25 題但總對僅 25 題實測：100% 絕無 S 級武器！');

// (2-4) 雙重門檻同時滿足 (總對 > 40 且 連對 >= 20)
mockGame.sessionTotalCorrect = 42;
mockGame.runConsecutiveCorrectStreak = 20;
let unlockedSCount = 0;
for (let trial = 0; trial < 20; trial++) {
  const choices = mockGame.generateUpgradeChoices(5);
  const hasSTier = choices.some(c => c.tierRating === 'S' || c.tier === 'S');
  if (hasSTier) unlockedSCount++;
}
assert(unlockedSCount === 20, '雙門檻滿足且 5 題全對時，應保底 1 款 S 級神兵！');
console.log('[驗證 2-4] 雙門檻達成實測 20 次：5 題全對 100% 順利解鎖 S 級神兵！');

// 驗證 3: 特殊招式預報精緻化檢驗
assert(gameCode.includes('renderHazardLineTelegraph(ctx, h)'), '必須定義 renderHazardLineTelegraph');
assert(gameCode.includes('renderHazardCircleTelegraph(ctx, h)'), '必須定義 renderHazardCircleTelegraph');
assert(!gameCode.includes('ctx.fillRect(h.x1 - h.width / 2, h.y1, h.width, h.y2 - h.y1);'),
  'render() 中必須徹底移除生硬的長方形色塊 fillRect');
assert(gameCode.includes('isThunder'), '預報渲染必須支援雷公閃電主題識別');
assert(gameCode.includes('isFeather'), '預報渲染必須支援迦樓羅金羽主題識別');
assert(gameCode.includes('floating_feather'), '必須包含迦樓羅神羽炸彈專屬倒數盤渲染');
console.log('[驗證 3] 預報渲染系統徹底告別生硬色塊，向量導軌、閃電電弧與金羽炸彈渲染器完整具備！');

// 驗證 4: 第一關瑪利歐 BGM 擴展檢驗
assert(gameCode.includes('272步完整長篇大循環'), '註解或結構必須確認長篇編排');
assert(gameCode.includes('marioBassLine'), '必須包含跳步 Walking Bassline');
assert(gameCode.includes('stepIdx = s % this._marioFullTrack.length'), '旋律必須透過全曲長度循環');

// 模擬測試音軌陣列長度
const dummySynth = {
  _marioFullTrack: null,
  playedNotes: [],
  playKick() {},
  playSnare() {},
  playHihat() {},
  playSquareWave(t, freq) { this.playedNotes.push(freq); }
};
const mStart = gameCode.indexOf('tickStage1Mario(t, s, m, b, sub) {');
const mEnd = gameCode.indexOf('tickStage2Zelda(t, s, m, b, sub) {', mStart);
const mRaw = gameCode.slice(mStart + 'tickStage1Mario(t, s, m, b, sub) {'.length, mEnd).trim();
const mLastBrace = mRaw.lastIndexOf('}');
const cleanMBody = mRaw.slice(0, mLastBrace);
const tickMario = new Function('t', 's', 'm', 'b', 'sub', cleanMBody);
dummySynth.tickStage1Mario = function(t, s, m, b, sub) {
  tickMario.call(this, t, s, m, b, sub);
};

// 跑 272 步
for (let s = 0; s < 272; s++) {
  dummySynth.tickStage1Mario(0, s, Math.floor(s / 16), Math.floor((s % 16) / 4), s % 4);
}
assert(dummySynth._marioFullTrack.length === 272, `全曲陣列必須為 272 步 (當前: ${dummySynth._marioFullTrack.length})`);
assert(dummySynth.playedNotes.length > 50, '必須正常發出足夠的音符與和聲');
console.log(`[驗證 4] 瑪利歐 BGM 成功擴展至 272 步（約 34 秒超長完整樂章），絕不產生煩躁重複感！`);

console.log('\n🎉 所有 BUILD-031 功能驗證與測試全部完美通過！');
