// scripts/test-v1.12.js
// 自動化驗證測試：S0001 專屬 LAB 與 Google Sheet 權限隔離、其他學員隱藏、跨網域部署配置

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, extraInfo = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${testName} ${extraInfo ? '-> ' + extraInfo : ''}`);
    failCount++;
  }
}

console.log('==============================================================');
console.log('🧪 執行 BUILD-016 驗證測試套件 (S0001 專屬權限隔離與公網部署)');
console.log('==============================================================\n');

const baseDir = path.resolve(__dirname, '..');

// -------------------------------------------------------------
// 測試項目 1：game.js 權限隔離邏輯與守衛檢驗
// -------------------------------------------------------------
console.log('--- [1/3] game.js 權限隔離邏輯與函數檢驗 ---');
const gameJsPath = path.join(baseDir, 'game.js');
assert(fs.existsSync(gameJsPath), 'game.js 檔案存在');

if (fs.existsSync(gameJsPath)) {
  const gameCode = fs.readFileSync(gameJsPath, 'utf8');

  assert(gameCode.includes('updatePermissionUI()'), '包含 updatePermissionUI() 權限更新方法');
  assert(gameCode.includes("curId === 'S0001'"), "明確以 curId === 'S0001' 作為測試玩家判定基準");
  assert(gameCode.includes("labBtn.style.display = isTester ? '' : 'none'"), '頂部 HUD #labBtn 依據 isTester 動態顯示/隱藏');
  assert(gameCode.includes("pauseLabBtn.style.display = isTester ? '' : 'none'"), '暫停選單 #pauseLabBtn 依據 isTester 動態顯示/隱藏');
  assert(gameCode.includes("pauseGsBtn.style.display = isTester ? '' : 'none'"), '暫停選單 #pauseGsBtn 依據 isTester 動態顯示/隱藏');
  assert(gameCode.includes("openGsBtn.style.display = isTester ? '' : 'none'"), '開始畫面 #openGsBtn 依據 isTester 動態顯示/隱藏');
  assert(gameCode.includes("權限不足：僅有 S0001 測試玩家可使用 LAB 面板"), 'openLab() 具備嚴格權限阻擋提示');
  assert(gameCode.includes("權限不足：僅有 S0001 測試玩家可設定 Google Sheet"), 'openGs() 具備嚴格權限阻擋提示');
  assert(gameCode.includes('this.updatePermissionUI()'), '在生命週期中主動觸發 updatePermissionUI()');
}

// -------------------------------------------------------------
// 測試項目 2：UI 元素動態顯示與隱藏模擬測試
// -------------------------------------------------------------
console.log('\n--- [2/3] 學員切換與權限隔離模擬測試 ---');

class MockElement {
  constructor(id) {
    this.id = id;
    this.style = { display: '' };
    this.classList = {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    };
  }
}

class MockGamePermissionSystem {
  constructor() {
    this.elements = {
      labBtn: new MockElement('labBtn'),
      pauseLabBtn: new MockElement('pauseLabBtn'),
      pauseGsBtn: new MockElement('pauseGsBtn'),
      openGsBtn: new MockElement('openGsBtn'),
      labOverlay: new MockElement('labOverlay'),
      gsOverlay: new MockElement('gsOverlay')
    };
    this.dataStore = { currentStudentId: 'S0001' };
    this.toasts = [];
  }

  showToast(msg) {
    this.toasts.push(msg);
  }

  updatePermissionUI() {
    const curId = (this.dataStore && this.dataStore.currentStudentId) || 'S0001';
    const isTester = (curId === 'S0001');

    const labBtn = this.elements.labBtn;
    const pauseLabBtn = this.elements.pauseLabBtn;
    const pauseGsBtn = this.elements.pauseGsBtn;
    const openGsBtn = this.elements.openGsBtn;

    if (labBtn) labBtn.style.display = isTester ? '' : 'none';
    if (pauseLabBtn) pauseLabBtn.style.display = isTester ? '' : 'none';
    if (pauseGsBtn) pauseGsBtn.style.display = isTester ? '' : 'none';
    if (openGsBtn) openGsBtn.style.display = isTester ? '' : 'none';
  }

  openLab() {
    const curId = (this.dataStore && this.dataStore.currentStudentId) || '';
    if (curId !== 'S0001') {
      this.showToast('權限不足：僅有 S0001 測試玩家可使用 LAB 面板');
      return false;
    }
    this.elements.labOverlay.classList.remove('hidden');
    return true;
  }

  openGs() {
    const curId = (this.dataStore && this.dataStore.currentStudentId) || '';
    if (curId !== 'S0001') {
      this.showToast('權限不足：僅有 S0001 測試玩家可設定 Google Sheet');
      return false;
    }
    this.elements.gsOverlay.classList.remove('hidden');
    return true;
  }
}

const mock = new MockGamePermissionSystem();

// 情境 A: 預設 S0001 (測試玩家)
mock.dataStore.currentStudentId = 'S0001';
mock.updatePermissionUI();
assert(mock.elements.labBtn.style.display === '', 'S0001 帳號：頂部 HUD #labBtn 正常顯示');
assert(mock.elements.pauseLabBtn.style.display === '', 'S0001 帳號：暫停選單 #pauseLabBtn 正常顯示');
assert(mock.elements.pauseGsBtn.style.display === '', 'S0001 帳號：暫停選單 #pauseGsBtn 正常顯示');
assert(mock.elements.openGsBtn.style.display === '', 'S0001 帳號：開始畫面 #openGsBtn 正常顯示');
assert(mock.openLab() === true, 'S0001 帳號：調用 openLab() 成功開啟');
assert(mock.openGs() === true, 'S0001 帳號：調用 openGs() 成功開啟');

// 情境 B: 切換至 S0002 (一般學生)
mock.dataStore.currentStudentId = 'S0002';
mock.updatePermissionUI();
assert(mock.elements.labBtn.style.display === 'none', 'S0002 帳號：頂部 HUD #labBtn 直接隱藏 (none)');
assert(mock.elements.pauseLabBtn.style.display === 'none', 'S0002 帳號：暫停選單 #pauseLabBtn 直接隱藏 (none)');
assert(mock.elements.pauseGsBtn.style.display === 'none', 'S0002 帳號：暫停選單 #pauseGsBtn 直接隱藏 (none)');
assert(mock.elements.openGsBtn.style.display === 'none', 'S0002 帳號：開始畫面 #openGsBtn 直接隱藏 (none)');
assert(mock.openLab() === false, 'S0002 帳號：調用 openLab() 遭到安全守衛拒絕阻擋');
assert(mock.openGs() === false, 'S0002 帳號：調用 openGs() 遭到安全守衛拒絕阻擋');

// 情境 C: 註冊新學生 (__new__ 狀態)
mock.dataStore.currentStudentId = '__new__';
mock.updatePermissionUI();
assert(mock.elements.labBtn.style.display === 'none', '註冊新學員狀態：LAB 按鈕維持隱藏');
assert(mock.elements.pauseLabBtn.style.display === 'none', '註冊新學員狀態：暫停 LAB 按鈕維持隱藏');
assert(mock.elements.pauseGsBtn.style.display === 'none', '註冊新學員狀態：暫停 Google Sheet 按鈕維持隱藏');

// 情境 D: 切回 S0001 (測試玩家)
mock.dataStore.currentStudentId = 'S0001';
mock.updatePermissionUI();
assert(mock.elements.labBtn.style.display === '', '切回 S0001 帳號：所有管理者元件完整恢復顯示');

// -------------------------------------------------------------
// 測試項目 3：跨網域公網網址部署配置檢驗
// -------------------------------------------------------------
console.log('\n--- [3/3] 跨網域公網部署與相對路徑檢驗 ---');

const indexPath = path.join(baseDir, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

assert(!indexHtml.includes('http://localhost'), 'index.html 無寫死本機 localhost 參照 (適合公網部署)');
assert(!indexHtml.includes('http://192.168.'), 'index.html 無寫死區域網路 IP (全站支援公網)');
assert(indexHtml.includes('src="starfall-game-api-config.js"'), 'index.html 載入雲端 Google Apps Script 設定檔');

const configPath = path.join(baseDir, 'starfall-game-api-config.js');
assert(fs.existsSync(configPath), 'starfall-game-api-config.js 存在');
if (fs.existsSync(configPath)) {
  const configText = fs.readFileSync(configPath, 'utf8');
  assert(configText.includes('https://script.google.com/macros/s/'), '雲端 Apps Script API URL 採用公網 HTTPS 協定');
}

console.log('\n==============================================================');
console.log(`🎉 測試完成！ 通過: ${passCount} 項，失敗: ${failCount} 項`);
console.log('==============================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
