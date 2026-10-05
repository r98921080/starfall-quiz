// scripts/test-v1.49-triple-tap-bomb.js
// Verification suite for BUILD-049: Triple-Tap Ship Body Bomb & Hidden On-Screen Button

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== 開始執行 BUILD-049 驗證測試 ===\n');

const repoRoot = path.resolve(__dirname, '..');

// 1. 驗證 HTML 與版本號更新至 b51
console.log('--- 測試 1: 驗證 HTML 結構、Tooltip 與版本號更新至 b51 ---');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const starfallHtml = fs.readFileSync(path.join(repoRoot, 'starfall-quiz.html'), 'utf8');

['id="playerBombBtn"', 'id="playerBombBadge"', 'id="playerBombCooldownOverlay"', 'id="hudBombPanel"', 'id="hudBombVal"'].forEach(el => {
  assert.ok(indexHtml.includes(el), `index.html 必須包含 ${el}`);
  assert.ok(starfallHtml.includes(el), `starfall-quiz.html 必須包含 ${el}`);
});

assert.ok(indexHtml.includes('style.css?v=b51'), 'index.html 必須引用 style.css?v=b51');
assert.ok(indexHtml.includes('game.js?v=b51'), 'index.html 必須引用 game.js?v=b51');
assert.ok(starfallHtml.includes('style.css?v=b51'), 'starfall-quiz.html 必須引用 style.css?v=b51');
assert.ok(starfallHtml.includes('game.js?v=b51'), 'starfall-quiz.html 必須引用 game.js?v=b51');

assert.ok(indexHtml.includes('title="核爆緊急避險：連擊機身 3 下或按 B / X 釋放"'), 'index.html 必須包含連擊機身 3 下提示');
assert.ok(starfallHtml.includes('title="核爆緊急避險：連擊機身 3 下或按 B / X 釋放"'), 'starfall-quiz.html 必須包含連擊機身 3 下提示');
console.log('✅ 測試 1 通過: HTML 與 HUD 元素齊全，版本號更新至 b51！\n');

// 2. 驗證 style.css 徹底隱藏畫面上的炸彈按鈕以防遮擋視野與移動
console.log('--- 測試 2: 驗證 style.css 中 .player-bomb-btn 設置為 display: none !important ---');
const styleCss = fs.readFileSync(path.join(repoRoot, 'style.css'), 'utf8');
assert.ok(styleCss.includes('display: none !important;'), 'style.css 必須將按鈕徹底隱藏');
assert.ok(styleCss.includes('pointer-events: none !important;'), 'style.css 必須禁用按鈕的指標事件');
console.log('✅ 測試 2 通過: 畫面中已徹底隱藏炸彈按鈕，釋放觸控移動與視野空間！\n');

// 3. 驗證 game.js 機身連擊 3 下自動施放與靈丸打斷邏輯
console.log('--- 測試 3: 驗證 game.js 戰機機身連擊 3 下檢測與靈丸中斷機制 ---');
const gameJs = fs.readFileSync(path.join(repoRoot, 'game.js'), 'utf8');

assert.ok(gameJs.includes('const distToPlayer = Math.hypot(lastTouchX - this.player.x, lastTouchY - this.player.y);'), 'game.js 必須計算點擊與機身中心距離');
assert.ok(gameJs.includes('this._shipTapTimes.length >= 3'), 'game.js 必須檢測連續 3 次點擊');
assert.ok(gameJs.includes('this.triggerPlayerBomb();'), '連擊達標時必須觸發 triggerPlayerBomb()');
assert.ok(gameJs.includes('this.spiritCharge.isCharging = false;'), '觸發核爆時必須重設並打斷靈丸蓄力狀態');
console.log('✅ 測試 3 通過: 機身 3 次連擊檢測與靈丸打斷邏輯完整部署！\n');

// 4. 模擬連擊邏輯單元測試
console.log('--- 測試 4: 模擬連擊行為單元測試 ---');
class MockShipTapSimulator {
  constructor() {
    this.player = { x: 220, y: 680, visualWidth: 64, bombs: 2, bombCooldown: 0 };
    this.spiritCharge = { isCharging: false, chargeTime: 0 };
    this.bombTriggered = 0;
    this._shipTapTimes = [];
  }

  triggerPlayerBomb() {
    this.bombTriggered++;
    this.player.bombs--;
    if (this.spiritCharge) {
      this.spiritCharge.isCharging = false;
      this.spiritCharge.chargeTime = 0;
    }
  }

  simulateTap(x, y, now) {
    const distToPlayer = Math.hypot(x - this.player.x, y - this.player.y);
    const shipTapRadius = Math.max(58, (this.player.visualWidth || 64) * 0.95);

    if (distToPlayer <= shipTapRadius) {
      this._shipTapTimes.push(now);
      this._shipTapTimes = this._shipTapTimes.filter(t => now - t <= 750);
      if (this._shipTapTimes.length >= 3) {
        this._shipTapTimes = [];
        if (this.spiritCharge) {
          this.spiritCharge.isCharging = false;
          this.spiritCharge.chargeTime = 0;
        }
        this.triggerPlayerBomb();
        return;
      }
    } else {
      this._shipTapTimes = [];
    }
    this.spiritCharge.isCharging = true;
    this.spiritCharge.chargeTime = 0.1;
  }
}

const sim = new MockShipTapSimulator();

// 案例 A：點擊遠處 (移動機身) 不觸發核爆
sim.simulateTap(50, 100, 1000);
sim.simulateTap(60, 110, 1100);
sim.simulateTap(70, 120, 1200);
assert.strictEqual(sim.bombTriggered, 0, '點擊遠處不得觸發核爆');
assert.strictEqual(sim._shipTapTimes.length, 0, '點擊遠處連擊計數必須清空');

// 案例 B：連續點擊機身 3 下 (間隔 150ms) 成功觸發核爆，並打斷靈丸蓄力
sim.simulateTap(225, 685, 2000); // 距機身中心約 7px
assert.strictEqual(sim._shipTapTimes.length, 1);
assert.strictEqual(sim.spiritCharge.isCharging, true);

sim.simulateTap(220, 680, 2150); // 距機身中心 0px
assert.strictEqual(sim._shipTapTimes.length, 2);

sim.simulateTap(215, 675, 2300); // 距機身中心約 7px，第 3 下！
assert.strictEqual(sim.bombTriggered, 1, '第 3 下必須成功引爆核爆');
assert.strictEqual(sim.player.bombs, 1, '核爆庫存必須扣減 1 顆');
assert.strictEqual(sim.spiritCharge.isCharging, false, '靈丸蓄力必須被打斷');
assert.strictEqual(sim._shipTapTimes.length, 0, '連擊計數器必須歸零');

// 案例 C：點擊間隔過長 (超時 > 750ms) 不觸發核爆
sim.simulateTap(220, 680, 3000);
sim.simulateTap(220, 680, 3900); // 間隔 900ms，超時被過濾
sim.simulateTap(220, 680, 4100);
assert.strictEqual(sim.bombTriggered, 1, '超時間隔不得觸發核爆');

console.log('✅ 測試 4 通過: 連擊 3 下引爆、遠處點擊防誤觸、超時防誤觸及蓄力打斷全部驗證無誤！\n');

console.log('🎉 所有測試均順利通過！BUILD-049 驗證完成！');
