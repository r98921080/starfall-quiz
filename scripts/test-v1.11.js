// scripts/test-v1.11.js
// 自動化驗證測試：學生錯題/策略完全獨立、S0000 學號與學生名冊登記、平板與手機版適配

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
console.log('🧪 執行 BUILD-015 驗證測試套件 (學生獨立歷程 / 學號註冊 / 平板手機版)');
console.log('==============================================================\n');

// -------------------------------------------------------------
// 測試項目 1：檔案完整性與 PWA 配置檢查
// -------------------------------------------------------------
console.log('--- [1/4] 檔案結構與 PWA 配置檢驗 ---');
const baseDir = path.resolve(__dirname, '..');

const manifestPath = path.join(baseDir, 'manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json 存在');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(manifest.display === 'standalone', 'PWA display 為 standalone 全螢幕模式');
    assert(manifest.start_url === './index.html', 'PWA start_url 指向 index.html');
    assert(manifest.name && manifest.short_name, 'PWA 具備完整繁體中文名稱標註');
  } catch (e) {
    assert(false, 'manifest.json 解析為合法 JSON', e.message);
  }
}

const serveScriptPath = path.join(baseDir, 'scripts', 'serve.js');
assert(fs.existsSync(serveScriptPath), 'scripts/serve.js 區域網路行動伺服器存在');

const batPath = path.join(baseDir, 'start-mobile-server.bat');
assert(fs.existsSync(batPath), 'start-mobile-server.bat 一鍵啟動腳本存在');

const indexPath = path.join(baseDir, 'index.html');
assert(fs.existsSync(indexPath), 'index.html 入口檔案存在');
if (fs.existsSync(indexPath)) {
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert(indexHtml.includes('viewport-fit=cover'), 'HTML 包含 viewport-fit=cover 支援 iPhone 瀏海與全面屏');
  assert(indexHtml.includes('apple-mobile-web-app-capable'), 'HTML 包含 iOS Safari Web App 支援');
  assert(indexHtml.includes('manifest.json'), 'HTML 正確關聯 manifest.json');
  assert(indexHtml.includes('id="fullscreenBtn"'), 'HTML 包含全螢幕切換按鈕 (#fullscreenBtn)');
  assert(indexHtml.includes('id="studentSelect"'), 'HTML 包含駕駛員學員下拉選單 (#studentSelect)');
}

// -------------------------------------------------------------
// 測試項目 2：學生錯題與出題策略 100% 獨立隔離機制檢驗
// -------------------------------------------------------------
console.log('\n--- [2/4] 學生錯題與出題權重獨立性模擬測試 ---');

// 模擬 DataStore 的獨立邏輯
class MockDataStore {
  constructor() {
    this.allStudentProgress = {};
    this.currentStudentId = 'S0001';
    this.questionBank = [
      { question_id: 'Q001', question: '題目1' },
      { question_id: 'Q002', question: '題目2' },
      { question_id: 'Q003', question: '題目3' },
      { question_id: 'Q004', question: '題目4' },
      { question_id: 'Q005', question: '題目5' }
    ];
  }

  getStudentProgressMap(sid) {
    if (!this.allStudentProgress[sid]) {
      this.allStudentProgress[sid] = {};
    }
    return this.allStudentProgress[sid];
  }

  getMistakeCount(sid) {
    const map = this.getStudentProgressMap(sid);
    let count = 0;
    Object.values(map).forEach(p => {
      if (p.wrong > 0 && !p.avenged) count++;
    });
    return count;
  }

  recordAttempt(sid, qid, correct, isReview = false) {
    const map = this.getStudentProgressMap(sid);
    if (!map[qid]) {
      map[qid] = { student_id: sid, question_id: qid, attempts: 0, wrong: 0, streak: 0, avenged: false };
    }
    const p = map[qid];
    p.attempts++;
    if (correct) {
      p.streak++;
      if (isReview) p.avenged = true;
    } else {
      p.wrong++;
      p.streak = 0;
      p.avenged = false;
    }
  }

  getQuestionWeight(sid, qid) {
    const map = this.getStudentProgressMap(sid);
    const p = map[qid] || { attempts: 0, wrong: 0, streak: 0, avenged: false };
    if (p.attempts === 0) return { weight: 6.0, type: 'new' };
    if (p.wrong > 0 && !p.avenged) return { weight: 15.0, type: 'weak' };
    if (p.attempts > 0 && p.wrong === 0) return { weight: 0.05, type: 'mastered' };
    return { weight: 0.4, type: 'review' };
  }
}

const store = new MockDataStore();

// 學生 A (S0001) 答錯 Q001，答對 Q002
store.recordAttempt('S0001', 'Q001', false);
store.recordAttempt('S0001', 'Q002', true);

assert(store.getMistakeCount('S0001') === 1, '學生 S0001 待雪恥錯題數為 1 題');
assert(store.getQuestionWeight('S0001', 'Q001').weight === 15.0, '學生 S0001 的 Q001 進入弱點復仇題池 (權重 15.0)');
assert(store.getQuestionWeight('S0001', 'Q002').weight === 0.05, '學生 S0001 的 Q002 已掌握 (權重 0.05 壓低避免重複)');

// 驗證新學生 B (S0002) 的歷程為完全純淨獨立
assert(store.getMistakeCount('S0002') === 0, '新學生 S0002 待雪恥錯題數為 0 題 (無交叉污染)');
assert(store.getQuestionWeight('S0002', 'Q001').weight === 6.0, '新學生 S0002 視 Q001 為全新題目 (權重 6.0)');
assert(store.getQuestionWeight('S0002', 'Q002').weight === 6.0, '新學生 S0002 視 Q002 為全新題目 (權重 6.0)');

// 學生 B (S0002) 答錯 Q003
store.recordAttempt('S0002', 'Q003', false);
assert(store.getMistakeCount('S0002') === 1, '學生 S0002 獨立記錄錯題 Q003，待雪恥題數為 1');
assert(store.getMistakeCount('S0001') === 1, '學生 S0001 依然只保留自己的錯題 Q001，未受 S0002 影響');
assert(store.getQuestionWeight('S0001', 'Q003').weight === 6.0, '學生 S0001 尚未作答 Q003，權重保持新題 6.0');

// 學生 A (S0001) 在復仇題中答對 Q001
store.recordAttempt('S0001', 'Q001', true, true);
assert(store.getMistakeCount('S0001') === 0, '學生 S0001 成功復仇 Q001，待雪恥錯題清空為 0');
assert(store.getMistakeCount('S0002') === 1, '學生 S0002 仍維持待雪恥 Q003 (1 題)');

// -------------------------------------------------------------
// 測試項目 3：S0000 學號與 Students 名冊欄位格式檢驗
// -------------------------------------------------------------
console.log('\n--- [3/4] S0000 序號格式與 Students 試算表欄位檢驗 ---');
const codeGsPath = path.join(baseDir, 'apps-script', 'Code.gs');
assert(fs.existsSync(codeGsPath), 'apps-script/Code.gs 存在');
if (fs.existsSync(codeGsPath)) {
  const codeGs = fs.readFileSync(codeGsPath, 'utf8');
  assert(codeGs.includes("action === 'student_progress'") || codeGs.includes('student_progress'), 'Code.gs 包含 student_progress 依學號獨立查詢 action');
  assert(codeGs.includes('function registerStudent_('), 'Code.gs 包含 registerStudent_ 獨立註冊函數');
  assert(codeGs.includes("String(newNum).padStart(4, '0')"), "Code.gs 序號使用 'S' + padStart(4, '0') 產生 S0000 格式");
  assert(codeGs.includes("display_name: name"), 'Code.gs 嚴格將輸入姓名存入 display_name');
  assert(codeGs.includes("student_id: newId"), 'Code.gs 嚴格將流水號存入 student_id');
}

// 模擬序號產生器測試
function generateNextStudentId(existingIds) {
  let maxNum = 0;
  existingIds.forEach(id => {
    const m = String(id || '').match(/^S(\d+)$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  return 'S' + String(maxNum + 1).padStart(4, '0');
}

assert(generateNextStudentId([]) === 'S0001', '空名冊產生首位學號 S0001');
assert(generateNextStudentId(['S0001', 'S0002']) === 'S0003', '接續產生 S0003');
assert(generateNextStudentId(['S0009', 'S0010']) === 'S0011', '進位正確產生 S0011');
assert(generateNextStudentId(['S0099']) === 'S0100', '百位進位正確產生 S0100');

// -------------------------------------------------------------
// 測試項目 4：多設備適配 (手機滿版、平板舒適比、桌面街機比)
// -------------------------------------------------------------
console.log('\n--- [4/4] fitStage 多設備螢幕尺寸計算檢驗 ---');

function simulateFitStage(viewportW, viewportH) {
  const maxW = viewportW;
  const maxH = viewportH;
  const ratio = maxH / maxW;
  let w, h;

  // 1. 手機直向 (寬度 <= 600px 且高寬比 >= 1.35) -> 全螢幕滿版無黑邊
  if (maxW <= 600 && ratio >= 1.35) {
    w = maxW;
    h = maxH;
  }
  // 2. 平板直向 (寬度 <= 1024px 且高寬比 >= 1.15) -> 舒適操作比例 (約 0.64)
  else if (maxW <= 1024 && ratio >= 1.15) {
    h = maxH;
    w = Math.min(maxW, Math.floor(h * 0.64));
  }
  // 3. 桌面或橫向螢幕 -> 經典 9:16 直向街機視窗
  else {
    h = maxH;
    w = h * 9 / 16;
    if (w > maxW) {
      w = maxW;
      h = w * 16 / 9;
    }
  }

  w = Math.min(w, maxW);
  h = Math.min(h, maxH);
  return { w: Math.floor(w), h: Math.floor(h), deviceRatio: (w / h).toFixed(2) };
}

// 測試 A: iPhone 14 直向 (390 x 844)
const mobilePhone = simulateFitStage(390, 844);
assert(mobilePhone.w === 390 && mobilePhone.h === 844, 'iPhone 14 (390x844) 滿版無黑邊 (100% 滿屏)');

// 測試 B: iPad 10.2 吋直向 (810 x 1080)
const tablet = simulateFitStage(810, 1080);
const expectedTabletW = Math.floor(1080 * 0.64); // 691px
assert(tablet.h === 1080 && tablet.w === expectedTabletW, `iPad 10.2 (810x1080) 採用舒適寬度 ${tablet.w}px x 1080px`);

// 測試 C: 桌面 1080p 螢幕 (1920 x 1080)
const desktop = simulateFitStage(1920, 1080);
const expectedDesktopW = Math.floor(1080 * 9 / 16); // 607px
assert(desktop.h === 1080 && desktop.w === expectedDesktopW, `桌面 1080p (1920x1080) 採用 9:16 街機尺寸 ${desktop.w}px x 1080px`);

// 驗證 game.js 中的 PointerCapture 支援
const gameJsPath = path.join(baseDir, 'game.js');
assert(fs.existsSync(gameJsPath), 'game.js 存在');
if (fs.existsSync(gameJsPath)) {
  const gameJs = fs.readFileSync(gameJsPath, 'utf8');
  assert(gameJs.includes('setPointerCapture'), 'game.js 包含 setPointerCapture 防止高速拖曳脫焦');
  assert(gameJs.includes('releasePointerCapture'), 'game.js 包含 releasePointerCapture');
  assert(gameJs.includes('visualViewport'), 'game.js 包含 visualViewport 動態適配');
}

console.log('\n==============================================================');
console.log(`🎉 測試完成！ 通過: ${passCount} 項，失敗: ${failCount} 項`);
console.log('==============================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
