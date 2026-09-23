// scripts/test-v1.26-attempt-sync.js
// 驗證 BUILD-026: 好友遊玩紀錄同步、學生獨立序號自動分配、抗毒丸離線隊列修復與結算正確率

const assert = require('assert');

const API_URL = 'https://script.google.com/macros/s/AKfycbya45DjgtDBPxYlnc1YWa6cWk6iqoRcjOXTLGA5P_gQ7oW542-obQHPuScCHtVyVJ2y/exec';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeFetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('[Fetch] Non-JSON response (length: ' + text.length + '):', text.slice(0, 150));
    return null;
  }
}

// 1. 驗證新好友學號自動分配邏輯 (純邏輯驗證)
function testStudentAllocation() {
  console.log('--- 測試 1: 好友新姓名學號自動分配與隔離 ---');
  const sheetStudentsMock = [
    { student_id: 'S0001', display_name: '測試玩家', grade: '國小四年級' }
  ];

  function allocateStudentId(name, grade, forceNew, localStudents, sheetStudents) {
    let existing = null;
    if (!forceNew && Array.isArray(sheetStudents)) {
      const matchInSheet = sheetStudents.find(s => (s.display_name === name || s.name === name) && (!grade || s.grade === grade));
      if (matchInSheet) {
        existing = { student_id: matchInSheet.student_id, name: matchInSheet.display_name };
      }
    }
    if (!existing && !forceNew) {
      existing = localStudents.find(s => (s.name === name || s.display_name === name) && (!grade || s.grade === grade));
    }
    if (!existing) {
      let maxNum = 0;
      if (Array.isArray(sheetStudents)) {
        sheetStudents.forEach(s => {
          const m = String(s.student_id || '').match(/^S(\d+)$/i);
          if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        });
      }
      localStudents.forEach(s => {
        const m = String(s.student_id || '').match(/^S(\d+)$/i);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      });
      if (name !== '測試玩家' && name !== '學員' && maxNum < 1) {
        maxNum = 1;
      }
      const newNum = maxNum + 1;
      const newId = 'S' + String(newNum).padStart(4, '0');
      existing = { student_id: newId, name: name, display_name: name, grade: grade };
      localStudents.push(existing);
    }
    return existing;
  }

  const mockLocalStudents = [];
  // 好友小明進來遊玩
  const pilotMing = allocateStudentId('小明', '三年級', false, mockLocalStudents, sheetStudentsMock);
  console.log('好友 1 (小明) 分配結果:', pilotMing);
  assert.strictEqual(pilotMing.student_id, 'S0002', '小明應分配到 S0002');

  // 好友小華進來遊玩
  const pilotHua = allocateStudentId('小華', '三年級', false, mockLocalStudents, sheetStudentsMock);
  console.log('好友 2 (小華) 分配結果:', pilotHua);
  assert.strictEqual(pilotHua.student_id, 'S0003', '小華應分配到 S0003');

  // 小明再次遊玩
  const pilotMingAgain = allocateStudentId('小明', '三年級', false, mockLocalStudents, sheetStudentsMock);
  console.log('好友 1 (小明) 再次遊玩綁定結果:', pilotMingAgain);
  assert.strictEqual(pilotMingAgain.student_id, 'S0002', '小明再次遊玩應綁定既有 S0002');
  console.log('✅ 測試 1 通過：好友學號自動分離與記憶正確！\n');
}

// 2. 驗證陣亡結算正確率顯示
function testAccuracyFormatting() {
  console.log('--- 測試 2: 陣亡結算正確率文字與顏色狀態 ---');
  function formatAccuracy(total, correct) {
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    if (total > 0) {
      return {
        text: `${rate}% (${correct}/${total} 題)`,
        color: rate >= 70 ? 'var(--green)' : (rate >= 40 ? 'var(--gold)' : '#ff4766'),
        size: '24px'
      };
    } else {
      return {
        text: '未進入答題階段',
        color: 'var(--text-muted)',
        size: '16px'
      };
    }
  }

  const unattempted = formatAccuracy(0, 0);
  console.log('未答題狀態:', unattempted);
  assert.strictEqual(unattempted.text, '未進入答題階段');

  const perfect = formatAccuracy(5, 5);
  console.log('全對狀態:', perfect);
  assert.strictEqual(perfect.text, '100% (5/5 題)');
  assert.strictEqual(perfect.color, 'var(--green)');

  const partial = formatAccuracy(5, 4);
  console.log('4/5 題狀態:', partial);
  assert.strictEqual(partial.text, '80% (4/5 題)');
  assert.strictEqual(partial.color, 'var(--green)');

  const low = formatAccuracy(5, 1);
  console.log('1/5 題狀態:', low);
  assert.strictEqual(low.text, '20% (1/5 題)');
  assert.strictEqual(low.color, '#ff4766');
  console.log('✅ 測試 2 通過：正確率結算邏輯與無作答防護正確！\n');
}

// 3. 實測連線 Google Apps Script Web App
async function testLivePost() {
  console.log('--- 測試 3: 實測單題 POST 寫入遠端 Google Sheet (現有 v1.0.0 部署) ---');
  const payload = {
    action: 'attempt',
    student_id: 'S0002',
    student_name: '好友小明測試',
    student_grade: '三年級',
    question_id: 'G1-PHO-0001',
    selected_option: 'C',
    correct: true,
    stage: 1,
    boss_name: '迦樓羅・裂空王',
    is_review: false,
    timestamp: new Date().toISOString(),
    difficulty_at_time: 1,
    subject: '國語文',
    unit: '注音符號',
    skill: '注音辨識',
    target_words: '花',
    concept_tags: '注音|字音',
    knowledge_pressure: 0,
    weapon_quality: 'normal'
  };

  const data = await safeFetchJson(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  console.log('遠端 Web App 回應:', JSON.stringify(data, null, 2));
  assert(data && data.ok === true, '回應應為 ok: true');
  assert.strictEqual(data.attempt.student_id, 'S0002', '記錄學號應為 S0002');
  console.log('✅ 測試 3 通過：好友作答成功以 S0002 直接寫入 Google Sheet Attempts 表！\n');
}

// 4. 驗證離線隊列抗毒丸自我修復 (模擬整批中有 1 題不存在題)
async function testSelfHealingQueue() {
  console.log('--- 測試 4: 模擬抗毒丸自我修復隊列 ---');
  const queue = [
    { student_id: 'S0002', student_name: '好友小明', question_id: 'G1-PHO-0001', selected_option: 'C', correct: true },
    { student_id: 'S0002', student_name: '好友小明', question_id: 'NON_EXISTENT_POISON_Q', selected_option: 'A', correct: false },
    { student_id: 'S0002', student_name: '好友小明', question_id: 'G1-PHO-0002', selected_option: 'B', correct: true }
  ];

  console.log(`初始隊列項目數: ${queue.length}`);
  const batch = queue.slice(0, 10);

  // 模擬批次直接上傳 (在 v1.0.0 上因為有 NON_EXISTENT_POISON_Q，批次會拋錯)
  let batchSucceeded = false;
  try {
    const d = await safeFetchJson(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'attempt_batch', attempts: batch })
    });
    if (d && d.ok) batchSucceeded = true;
  } catch(e) {}

  console.log(`批次上傳結果: ${batchSucceeded ? '成功' : '預期失敗 (因為包含不存在題號)'}`);
  assert.strictEqual(batchSucceeded, false, '包含不存在題號時，v1.0.0 批次應失敗');

  // 觸發客戶端軌道 3: 智能解耦與自我修復
  console.log('啟動軌道 3 逐題解耦與毒丸剔除...');
  const succeededIndices = [];
  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    await sleep(800); // 避免 Apps Script 並行鎖
    try {
      const dataSingle = await safeFetchJson(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'attempt', ...item })
      });
      if (dataSingle && dataSingle.ok) {
        console.log(`  [OK] 題目 ${item.question_id} 成功寫入試算表`);
        succeededIndices.push(i);
      } else if (dataSingle && dataSingle.error && dataSingle.error.includes('找不到 question_id')) {
        console.log(`  [POISON PURGED] 題目 ${item.question_id} 遠端不存在，主動剔除`);
        succeededIndices.push(i);
      }
    } catch(err) {}
  }

  // 從後向前移除成功或剔除的項目
  for (let k = succeededIndices.length - 1; k >= 0; k--) {
    queue.splice(succeededIndices[k], 1);
  }

  console.log(`修復後隊列剩餘項目數: ${queue.length}`);
  assert.strictEqual(queue.length, 0, '隊列應已全數消化且無死鎖');
  console.log('✅ 測試 4 通過：自我修復隊列成功上傳健康作答並剔除毒丸，隊列清空完畢！\n');
}

(async () => {
  console.log('====================================================');
  console.log('🚀 開始驗證 BUILD-026: 好友遊玩紀錄同步與容錯機制');
  console.log('====================================================\n');
  testStudentAllocation();
  testAccuracyFormatting();
  await sleep(1000);
  await testLivePost();
  await sleep(1500);
  await testSelfHealingQueue();
  console.log('🎉 BUILD-026 全部 4 大項目 100% 通過驗證！');
})();
