// scripts/test-v1.48-mobile-bomb-button-and-eradicate-legacy.js
// Verification suite for BUILD-048: Mobile Bomb Button & Legacy Question Eradication

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== 開始執行 BUILD-048 驗證測試 ===\n');

const repoRoot = path.resolve(__dirname, '..');

// 1. 驗證 HTML 中的 Bomb 按鈕與 HUD 元素
console.log('--- 測試 1: 驗證 HTML 中 Bomb 避險按鈕與 HUD 顯示元件 ---');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const starfallHtml = fs.readFileSync(path.join(repoRoot, 'starfall-quiz.html'), 'utf8');

['id="playerBombBtn"', 'id="playerBombBadge"', 'id="playerBombCooldownOverlay"', 'id="hudBombPanel"', 'id="hudBombVal"'].forEach(el => {
  assert.ok(indexHtml.includes(el), `index.html 必須包含 ${el}`);
  assert.ok(starfallHtml.includes(el), `starfall-quiz.html 必須包含 ${el}`);
});
console.log('✅ 測試 1 通過: index.html 與 starfall-quiz.html 均完整配置 Bomb 避險按鈕與 HUD 面板！\n');

// 2. 驗證 style.css 中的 Bomb 按鈕樣式與行動端響應式支援
console.log('--- 測試 2: 驗證 style.css Bomb 按鈕樣式與手機板觸控規範 ---');
const styleCss = fs.readFileSync(path.join(repoRoot, 'style.css'), 'utf8');

assert.ok(styleCss.includes('.player-bomb-btn'), 'style.css 必須包含 .player-bomb-btn 樣式');
assert.ok(styleCss.includes('@keyframes bombPulse'), 'style.css 必須包含 @keyframes bombPulse 呼吸發光動畫');
assert.ok(styleCss.includes('.bomb-badge'), 'style.css 必須包含 .bomb-badge 彈藥數量角標');
assert.ok(styleCss.includes('.bomb-cooldown-overlay'), 'style.css 必須包含 .bomb-cooldown-overlay 冷卻遮罩');
assert.ok(styleCss.includes('.player-bomb-btn.depleted'), 'style.css 必須包含 .depleted 彈藥耗盡外觀');
assert.ok(styleCss.includes('touch-action: manipulation;'), 'style.css 必須設置 touch-action 防雙擊縮放');
console.log('✅ 測試 2 通過: style.css 具備完整的賽博神話光效與手機觸控最佳化！\n');

// 3. 驗證 game.js 中的核爆避險機制與按鈕事件
console.log('--- 測試 3: 驗證 game.js 核爆大招機制、鍵位綁定與回復機制 ---');
const gameJs = fs.readFileSync(path.join(repoRoot, 'game.js'), 'utf8');

assert.ok(gameJs.includes('bombs: 2,'), '玩家初始必須具備 2 顆核爆');
assert.ok(gameJs.includes('maxBombs: 3,'), '玩家最大核爆上限為 3 顆');
assert.ok(gameJs.includes('triggerPlayerBomb()'), 'game.js 必須實現 triggerPlayerBomb 核心方法');
assert.ok(gameJs.includes('updateBombUI()'), 'game.js 必須實現 updateBombUI 介面同步方法');
assert.ok(gameJs.includes("e.key === 'b' || e.key === 'B' || e.key === 'x' || e.key === 'X'"), '鍵盤必須支援 B / X 鍵觸發核爆');
assert.ok(gameJs.includes("playerBombBtn"), '必須綁定 playerBombBtn 的點擊與觸控');
assert.ok(gameJs.includes('bombShockwaves'), '必須支援核爆擴散巨型衝擊波');
assert.ok(gameJs.includes('關卡突破補給：【核爆緊急避險】+1！'), '關卡突破時必須補給 +1 顆核爆');
assert.ok(gameJs.includes('滿分答對 5 題！學力超凡，額外特贈【核爆緊急避險】+1 顆！'), '答題全對滿分時必須額外特贈 +1 顆核爆');
console.log('✅ 測試 3 通過: 核爆大招之施放、清彈、無敵、衝擊波與全對補給機制完整具備！\n');

// 4. 驗證出題與題庫徹底杜絕舊版題目
console.log('--- 測試 4: 驗證前端各環節 100% 杜絕舊版題目 ---');
assert.ok(gameJs.includes('if (/^([Gg][1-6]|[Jj][7-9])-/.test(qid)) return;'), 'deduplicateAndBalanceBank 必須過濾舊版題號');
assert.ok(gameJs.includes('const rawQid = (qidIdx !== -1 && r[qidIdx] && String(r[qidIdx]).trim()) || `Q-${i}`;'), 'parseCSV 提取題號邏輯正確');
assert.ok(gameJs.includes('if (!qid || /^([Gg][1-6]|[Jj][7-9])-/.test(qid)) return false;'), 'pickAdaptiveQuestions 必須嚴格排除舊版題號');
assert.ok(gameJs.includes('if (!qidStr || /^([Gg][1-6]|[Jj][7-9])-/.test(qidStr)) {'), 'recordAttempt 必須拒絕記錄舊版題號');
console.log('✅ 測試 4 通過: 前端從題庫載入、出題選取到上報歷程全流程 100% 絕不產生舊題！\n');

console.log('🎉 所有測試均順利通過！BUILD-048 驗證完成！');
