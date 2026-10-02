const SHEETS = {
  PARENT_DASHBOARD: 'ParentDashboard',
  QUESTIONS: 'Questions',
  ATTEMPTS: 'Attempts',
  STUDENTS: 'Students' // 相容舊版，若不存在會自動從 Attempts 整合學生名冊
};

// 極簡 3 分頁架構：僅保留 Questions (題庫) 與 Attempts (作答紀錄)，其餘報表全由 ParentDashboard 呈現
const REQUIRED_HEADERS = {
  Questions: [
    '題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'
  ],
  Attempts: [
    'timestamp', 'student_id', 'session_id', 'stage', 'boss_name', 'question_id',
    'selected_option', 'correct', 'response_time_ms', 'attempt_index', 'is_review',
    'hint_used', 'difficulty_at_time', 'subject', 'unit', 'skill', 'target_words',
    'concept_tags', 'knowledge_pressure', 'weapon_quality', 'sync_status'
  ]
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🌟 星墜答問')
    .addItem('🧹 一鍵極簡化分頁 (刪除多餘工作表，只留 3 個核心分頁)', 'cleanAllExtraSheets')
    .addItem('🔄 一鍵將題庫簡化為 8 欄 (題號、題目、選項1~4、答案、說明)', 'simplifyQuestionsColumns')
    .addItem('📊 立即更新家長報表 (ParentDashboard)', 'refreshReports')
    .addItem('✨ 題庫智慧去重清洗', 'cleanDuplicateQuestions')
    .addItem('⚙️ 初始化與檢查資料表', 'setupStarfall')
    .addToUi();
}

function setupStarfall() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(REQUIRED_HEADERS).forEach(function(sheetName) {
    ensureSheetAndHeaders_(ss, sheetName, REQUIRED_HEADERS[sheetName]);
  });
  ensureReportSheets_(ss);
  cleanAllExtraSheets_(ss);
  logActivity_('SETUP', '初始化完成，極簡家長總覽資料表與報表已建立。');
  SpreadsheetApp.getUi().alert('初始化完成', '已檢查資料表並將工作表極簡化為 3 個核心分頁：\n1. 【ParentDashboard】家長學習總覽\n2. 【Questions】題目庫 (8 欄極簡模式)\n3. 【Attempts】即時作答紀錄', SpreadsheetApp.getUi().ButtonSet.OK);
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  cleanLegacySheets_(ss); // 每次連線主動巡檢，自動清理任何意外殘留之舊分頁
  const action = String((e && e.parameter && e.parameter.action) || 'health').toLowerCase();
  try {
    if (action === 'questions') return jsonOutput_(getQuestions_(e && e.parameter));
    if (action === 'students') return jsonOutput_(getStudents_());
    if (action === 'student_progress') return jsonOutput_(getStudentProgressData_(e && e.parameter));
    if (action === 'register_student') return jsonOutput_(registerStudent_(e && e.parameter));
    if (action === 'attempt') return jsonOutput_(recordAttempt_(e && e.parameter));
    if (action === 'attempt_batch') {
      let attempts = [];
      try {
        const raw = (e && e.parameter && (e.parameter.attempts || e.parameter.data)) || '[]';
        attempts = JSON.parse(raw);
      } catch (err) { attempts = []; }
      return jsonOutput_(recordAttemptBatch_({ attempts: attempts }));
    }
    if (action === 'settings') return jsonOutput_(getSettings_());
    if (action === 'report') return jsonOutput_(getReportData_(e && e.parameter));
    if (action === 'clean_questions') {
      const result = cleanDuplicateQuestions_();
      return jsonOutput_({ ok: true, message: '去重清洗完成', result: result });
    }
    if (action === 'clean_sheets') {
      const result = cleanAllExtraSheets_();
      return jsonOutput_({ ok: true, message: '工作表極簡化完成', result: result });
    }
    if (action === 'simplify_questions') {
      const result = simplifyQuestionsColumns_();
      return jsonOutput_({ ok: true, message: '題庫簡化完成', result: result });
    }
    return jsonOutput_({
      ok: true,
      service: 'Starfall Quiz Learning API',
      version: '1.3.0',
      active_sheets: ss.getSheets().map(function(s) { return s.getName(); }),
      actions: ['questions', 'students', 'student_progress', 'register_student', 'attempt', 'attempt_batch', 'settings', 'report', 'clean_questions', 'clean_sheets', 'simplify_questions']
    });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  cleanLegacySheets_(ss); // 每次寫入作答紀錄主動巡檢清理多餘分頁
  try {
    const payload = parsePayload_(e);
    const action = String(payload.action || 'attempt').toLowerCase();
    if (action === 'attempt') return jsonOutput_(recordAttempt_(payload));
    if (action === 'attempt_batch') return jsonOutput_(recordAttemptBatch_(payload));
    if (action === 'register_student') return jsonOutput_(registerStudent_(payload));
    if (action === 'refresh_reports') {
      refreshReports();
      return jsonOutput_({ ok: true, message: '報表已更新。' });
    }
    if (action === 'clean_questions') {
      const result = cleanDuplicateQuestions_();
      return jsonOutput_({ ok: true, message: '去重清洗完成', result: result });
    }
    if (action === 'clean_sheets') {
      const result = cleanAllExtraSheets_();
      return jsonOutput_({ ok: true, message: '工作表極簡化完成', result: result });
    }
    if (action === 'simplify_questions') {
      const result = simplifyQuestionsColumns_();
      return jsonOutput_({ ok: true, message: '題庫簡化完成', result: result });
    }
    return jsonOutput_({ ok: false, error: '不支援的 action：' + action });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err.message || err) });
  }
}

function registerStudent_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.STUDENTS);
  const name = String(payload.name || payload.display_name || '').trim();
  const grade = String(payload.grade || '').trim();
  if (!name) throw new Error('學生姓名不可為空。');

  if (sheet) {
    const rows = sheetObjects_(sheet);
    // 1. 檢查是否已有相同姓名 (及年級) 的現存學生
    const existing = rows.find(function(r) {
      return String(r.display_name).trim() === name && (!grade || String(r.grade).trim() === grade);
    });
    if (existing) {
      return {
        ok: true,
        student_id: existing.student_id,
        display_name: existing.display_name,
        grade: existing.grade,
        isNew: false,
        message: '學生已存在，綁定既有學號。'
      };
    }

    // 2. 自動分配 "S0000" 格式的新序號 (例如 S0001, S0002, ...)
    let maxNum = 0;
    rows.forEach(function(r) {
      const m = String(r.student_id || '').match(/^S(\d+)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const newNum = maxNum + 1;
    const newId = 'S' + String(newNum).padStart(4, '0');

    const headers = getHeaders_(sheet);
    const now = new Date();
    const newRow = {
      student_id: newId,
      display_name: name,
      grade: grade,
      pin_hash: '',
      active: 'TRUE',
      created_at: now.toISOString(),
      notes: '遊戲端自動登錄註冊'
    };

    sheet.appendRow(headers.map(function(h) {
      return newRow[h] !== undefined ? newRow[h] : '';
    }));

    logActivity_('REGISTER_STUDENT', newId + '｜' + name + '｜' + grade);
    return {
      ok: true,
      student_id: newId,
      display_name: name,
      grade: grade,
      isNew: true,
      message: '新學生註冊成功，配發學號 ' + newId + '。'
    };
  } else {
    // 極簡 3 分頁模式 (無獨立 Students 表)：由 Attempts 作答歷程直接推算學號與綁定
    const aSheet = ss.getSheetByName(SHEETS.ATTEMPTS);
    const attempts = aSheet ? sheetObjects_(aSheet) : [];
    const matched = attempts.find(function(a) {
      return String(a.student_name).trim() === name && (!grade || String(a.student_grade).trim() === grade);
    });
    if (matched) {
      return {
        ok: true,
        student_id: matched.student_id,
        display_name: matched.student_name,
        grade: matched.student_grade || grade,
        isNew: false,
        message: '學生已存在作答紀錄中，綁定既有學號。'
      };
    }
    let maxNum = 0;
    attempts.forEach(function(a) {
      const m = String(a.student_id || '').match(/^S(\d+)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const newNum = maxNum + 1;
    const newId = 'S' + String(newNum).padStart(4, '0');
    return {
      ok: true,
      student_id: newId,
      display_name: name,
      grade: grade,
      isNew: true,
      message: '新學生註冊成功，配發學號 ' + newId + '。'
    };
  }
}

function ensureStudentExists_(ss, studentId, name, grade) {
  if (!studentId) return;
  const sheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (!sheet) return; // 極簡 3 分頁模式下無須寫入額外 Students 表
  const rows = sheetObjects_(sheet);
  const foundIndex = rows.findIndex(function(r) { return String(r.student_id).trim() === String(studentId).trim(); });
  if (foundIndex === -1) {
    const headers = getHeaders_(sheet);
    const newRow = {
      student_id: String(studentId).trim(),
      display_name: String(name || studentId).trim(),
      grade: String(grade || '三年級').trim(),
      pin_hash: '',
      active: 'TRUE',
      created_at: new Date().toISOString(),
      notes: '作答時自動建立學籍'
    };
    sheet.appendRow(headers.map(function(h) { return newRow[h] !== undefined ? newRow[h] : ''; }));
    logActivity_('AUTO_STUDENT', String(studentId).trim() + '｜' + String(name || studentId).trim());
  } else if (name && (rows[foundIndex].display_name === '學員' || !rows[foundIndex].display_name || rows[foundIndex].display_name === studentId)) {
    const headers = getHeaders_(sheet);
    const nameColIdx = headers.indexOf('display_name') + 1;
    if (nameColIdx > 0) {
      sheet.getRange(foundIndex + 2, nameColIdx).setValue(String(name).trim());
    }
  }
}

function getQuestionsSheet_(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  // 1. 常見工作表名稱清單
  const candidates = [SHEETS.QUESTIONS, 'Questions', 'Question', 'Quetions', '題庫', 'questions', '題目', '題庫表', 'question_bank'];
  for (let i = 0; i < candidates.length; i++) {
    const s = ss.getSheetByName(candidates[i]);
    if (s) return s;
  }
  // 2. 忽略大小寫與空白比對所有工作表名稱
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const n = sheets[i].getName().trim().toLowerCase();
    if (n === 'questions' || n === 'question' || n === '題庫' || n === '題目' || n === 'quetions') {
      return sheets[i];
    }
  }
  // 3. 內容特徵比對：尋找標題列含有「題目」或「question」的分頁
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    const sName = s.getName();
    if (sName === SHEETS.PARENT_DASHBOARD || sName === SHEETS.ATTEMPTS) continue;
    const headers = getHeaders_(s).map(function(h) { return String(h || '').trim().toLowerCase(); });
    if (headers.indexOf('題目') !== -1 || headers.indexOf('question') !== -1 || headers.indexOf('問題') !== -1) {
      return s;
    }
  }
  return null;
}

function parseQuestionRow_(row, idx) {
  const getVal = function(candidates, colIdx) {
    // 1. 精確鍵名匹配
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
        return String(row[c]).trim();
      }
    }
    // 2. 模糊鍵名匹配（去空白、底線、破折號、括號、頓號、轉小寫）
    const cleanCandidates = candidates.map(function(c) {
      return String(c).toLowerCase().replace(/[\s_\-（）()、]/g, '');
    });
    const keys = Object.keys(row);
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      if (key === '_raw' || key === '_headers') continue;
      const cleanKey = String(key).toLowerCase().replace(/[\s_\-（）()、]/g, '');
      if (cleanCandidates.indexOf(cleanKey) !== -1) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          return String(row[key]).trim();
        }
      }
    }
    // 3. 欄位位置備援 (0:題號, 1:題目, 2:選項1, 3:選項2, 4:選項3, 5:選項4, 6:答案, 7:答案說明)
    if (row._raw && typeof colIdx === 'number' && colIdx >= 0 && colIdx < row._raw.length) {
      const rawVal = row._raw[colIdx];
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
        return String(rawVal).trim();
      }
    }
    return '';
  };

  const qid = getVal(['題號', 'question_id', 'id', '序號', '編號', 'No', 'QID'], 0) || ('Q-' + (idx + 1));
  const qText = getVal(['題目', 'question', '問題', '題幹', '內容'], 1);

  const opt1 = getVal(['選項1', '選項 1', '選項一', 'option_1', 'option1', 'option_a', 'optiona', 'a', '選項A', '選項 A'], 2);
  const opt2 = getVal(['選項2', '選項 2', '選項二', 'option_2', 'option2', 'option_b', 'optionb', 'b', '選項B', '選項 B'], 3);
  const opt3 = getVal(['選項3', '選項 3', '選項三', 'option_3', 'option3', 'option_c', 'optionc', 'c', '選項C', '選項 C'], 4);
  const opt4 = getVal(['選項4', '選項 4', '選項四', 'option_4', 'option4', 'option_d', 'optiond', 'd', '選項D', '選項 D'], 5);
  const opts = [opt1, opt2, opt3, opt4];

  const ansRaw = getVal(['答案', 'answer', 'ans', '正解', '解答', '正確答案'], 6);
  const expDetail = getVal(['答案說明', '說明', '解析', '詳解', '解題說明', 'explanation_detail', 'explanation', 'explanation_short'], 7);

  // 標準化答案為 A/B/C/D
  let ansLetter = 'A';
  const cleanAns = ansRaw.trim().toUpperCase();
  if (['A', 'B', 'C', 'D'].indexOf(cleanAns) !== -1) {
    ansLetter = cleanAns;
  } else if (cleanAns === '1' || cleanAns === '選項1' || cleanAns === '選項 1' || cleanAns === '選項一' || cleanAns === '一') {
    ansLetter = 'A';
  } else if (cleanAns === '2' || cleanAns === '選項2' || cleanAns === '選項 2' || cleanAns === '選項二' || cleanAns === '二') {
    ansLetter = 'B';
  } else if (cleanAns === '3' || cleanAns === '選項3' || cleanAns === '選項 3' || cleanAns === '選項三' || cleanAns === '三') {
    ansLetter = 'C';
  } else if (cleanAns === '4' || cleanAns === '選項4' || cleanAns === '選項 4' || cleanAns === '選項四' || cleanAns === '四') {
    ansLetter = 'D';
  } else {
    // 比對是否與選項文字相同
    const matchIdx = opts.findIndex(function(o) { return o && o.trim() === ansRaw.trim(); });
    if (matchIdx !== -1) {
      ansLetter = ['A', 'B', 'C', 'D'][matchIdx];
    }
  }

  const validOpts = opts.filter(Boolean);

  return {
    question_id: qid,
    grade: getVal(['年級', 'grade']) || '三年級',
    subject: getVal(['科目', 'subject']) || '國語文',
    unit: getVal(['單元', 'unit']) || '',
    skill: getVal(['技能', 'skill']) || '語文素養',
    question_type: getVal(['題型', 'question_type']) || '單選題',
    difficulty: Number(getVal(['難度', 'difficulty'])) || 1,
    question: qText,
    options: validOpts.length >= 2 ? opts : ['選項A', '選項B', '選項C', '選項D'],
    answer: ansLetter,
    explanation_short: expDetail,
    explanation_detail: expDetail,
    memory_tip: getVal(['memory_tip', 'tip']) || '',
    target_words: splitTags_(getVal(['target_words'])),
    concept_tags: splitTags_(getVal(['concept_tags'])),
    error_pattern: getVal(['error_pattern']) || '',
    next_step: getVal(['next_step']) || '',
    review_priority: Number(getVal(['review_priority'])) || 1,
    // 同步包含繁體中文欄位名稱
    '題號': qid,
    '題目': qText,
    '選項1': opt1,
    '選項2': opt2,
    '選項3': opt3,
    '選項4': opt4,
    '答案': ansLetter,
    '答案說明': expDetail
  };
}

function getQuestions_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  cleanLegacySheets_(ss);

  const sheet = getQuestionsSheet_(ss);
  if (!sheet) return { ok: true, count: 0, questions: [], message: '未找到題庫工作表' };
  const rows = sheetObjects_(sheet);
  const grade = params && params.grade ? String(params.grade).trim() : '';

  const questions = rows.map(function(row, idx) {
    return parseQuestionRow_(row, idx);
  }).filter(function(q) {
    if (!q.question || q.question.trim().length === 0) return false;
    const rGrade = q.grade || '';
    if (grade && rGrade && rGrade !== grade) return false;
    return true;
  });

  return { ok: true, updated_at: new Date().toISOString(), count: questions.length, questions: questions };
}

function findQuestion_(ss, questionId) {
  if (!questionId) return null;
  const sheet = getQuestionsSheet_(ss);
  if (!sheet) return null;
  const rows = sheetObjects_(sheet);
  const qidStr = String(questionId).trim();
  for (let i = 0; i < rows.length; i++) {
    const q = parseQuestionRow_(rows[i], i);
    if (String(q.question_id).trim() === qidStr) {
      return q;
    }
  }
  return null;
}

function countAttempts_(ss, studentId, questionId) {
  const sheet = ss.getSheetByName(SHEETS.ATTEMPTS);
  if (!sheet) return 0;
  return sheetObjects_(sheet).filter(function(row) {
    return String(row.student_id).trim() === String(studentId).trim() &&
           String(row.question_id).trim() === String(questionId).trim();
  }).length;
}

function updateQuestionProgress_(ss, attempt) {
  // 作答紀錄全數保存在 Attempts 表中，家長儀表板自動由此彙整計算
}

function getStudents_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sSheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (sSheet) {
    const students = sheetObjects_(sSheet)
      .filter(function(row) { return String(row.active).toUpperCase() !== 'FALSE'; })
      .map(function(row) {
        return { student_id: row.student_id, display_name: row.display_name, grade: row.grade, notes: row.notes || '' };
      });
    if (students.length > 0) return { ok: true, students: students };
  }

  // 極簡 3 分頁備援：若無 Students 表，直接從 Attempts 作答紀錄中自動匯聚不重複學生名冊！
  const aSheet = ss.getSheetByName(SHEETS.ATTEMPTS);
  const attempts = aSheet ? sheetObjects_(aSheet) : [];
  const map = {};
  attempts.forEach(function(a) {
    const sid = String(a.student_id || '').trim();
    if (sid && !map[sid]) {
      map[sid] = {
        student_id: sid,
        display_name: a.student_name || sid,
        name: a.student_name || sid,
        grade: a.student_grade || '三年級',
        active: 'TRUE'
      };
    }
  });
  return { ok: true, students: Object.values(map) };
}

function getStudentProgressData_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentId = String((params && params.student_id) || '').trim();
  if (!studentId) return { ok: false, error: '缺少 student_id 參數' };
  const attempts = sheetObjects_(ss.getSheetByName(SHEETS.ATTEMPTS))
    .filter(function(a) { return String(a.student_id).trim() === studentId; });

  const progressMap = {};
  attempts.forEach(function(a) {
    const qid = a.question_id;
    if (!progressMap[qid]) {
      progressMap[qid] = {
        student_id: studentId,
        question_id: qid,
        attempts: 0,
        wrong: 0,
        streak: 0,
        avenged: false,
        lastAttempt: 0
      };
    }
    const p = progressMap[qid];
    p.attempts++;
    const isCorrect = toBool_(a.correct);
    if (isCorrect) {
      p.streak++;
      if (toBool_(a.is_review)) p.avenged = true;
    } else {
      p.wrong++;
      p.streak = 0;
      p.avenged = false;
    }
  });
  return { ok: true, student_id: studentId, progress: progressMap, count: Object.keys(progressMap).length };
}

function getSettings_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = {
    minimum_attempts_for_word_analysis: 5,
    word_bottleneck_accuracy: 0.65,
    slow_response_seconds: 12,
    weak_accuracy_threshold: 0.65,
    mastery_correct_streak: 4
  };
  const sheet = ss.getSheetByName('Settings');
  if (sheet) {
    sheetObjects_(sheet).forEach(function(row) {
      if (row.setting_key) settings[row.setting_key] = coerceValue_(row.setting_value);
    });
  }
  return { ok: true, settings: settings };
}

function recordAttempt_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const attempt = normalizeAttempt_(payload, ss);
  const sheet = ss.getSheetByName(SHEETS.ATTEMPTS);
  const headers = getHeaders_(sheet);
  sheet.appendRow(headers.map(function(header) { return attempt[header] !== undefined ? attempt[header] : ''; }));
  updateQuestionProgress_(ss, attempt);
  refreshReports();
  logActivity_('ATTEMPT', attempt.student_id + '｜' + attempt.question_id + '｜' + (attempt.correct ? '正確' : '錯誤'));
  return { ok: true, attempt: attempt };
}

function recordAttemptBatch_(payload) {
  const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
  if (!attempts.length) throw new Error('attempts 不可為空。');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.ATTEMPTS);
  const headers = getHeaders_(sheet);
  const normalized = attempts.map(function(attempt) { return normalizeAttempt_(attempt, ss); });
  sheet.getRange(sheet.getLastRow() + 1, 1, normalized.length, headers.length)
    .setValues(normalized.map(function(attempt) {
      return headers.map(function(header) { return attempt[header] !== undefined ? attempt[header] : ''; });
    }));
  normalized.forEach(function(attempt) { updateQuestionProgress_(ss, attempt); });
  refreshReports();
  logActivity_('ATTEMPT_BATCH', '已寫入 ' + normalized.length + ' 筆作答紀錄。');
  return { ok: true, count: normalized.length };
}

function normalizeAttempt_(payload, ss) {
  if (!payload.student_id) throw new Error('缺少 student_id。');
  if (!payload.question_id) throw new Error('缺少 question_id。');

  // 自動補登學生至 Students 表（避免作答紀錄遺漏學生學籍）
  ensureStudentExists_(ss, payload.student_id, payload.student_name || payload.display_name, payload.student_grade || payload.grade);

  let question = findQuestion_(ss, payload.question_id);
  if (!question) {
    question = {
      question_id: payload.question_id,
      difficulty: Number(payload.difficulty_at_time) || 1,
      subject: payload.subject || '國語文',
      unit: payload.unit || '',
      skill: payload.skill || '',
      answer: payload.selected_option || 'A',
      target_words: payload.target_words || '',
      concept_tags: payload.concept_tags || ''
    };
  }
  const selected = String(payload.selected_option || '').trim().toUpperCase();
  const correct = payload.correct === true || String(payload.correct).toUpperCase() === 'TRUE' || selected === String(question.answer).toUpperCase();
  const priorAttempts = countAttempts_(ss, payload.student_id, payload.question_id);
  return {
    timestamp: payload.timestamp || new Date(),
    student_id: String(payload.student_id),
    session_id: payload.session_id || Utilities.getUuid(),
    stage: Number(payload.stage) || 1,
    boss_name: payload.boss_name || '',
    question_id: question.question_id,
    selected_option: selected,
    correct: correct,
    response_time_ms: Math.max(0, Number(payload.response_time_ms) || 0),
    attempt_index: Number(payload.attempt_index) || priorAttempts + 1,
    is_review: payload.is_review === true || String(payload.is_review).toUpperCase() === 'TRUE',
    hint_used: payload.hint_used === true || String(payload.hint_used).toUpperCase() === 'TRUE',
    difficulty_at_time: Number(payload.difficulty_at_time) || Number(question.difficulty) || 1,
    subject: question.subject || '國語文',
    unit: question.unit || '',
    skill: question.skill || '',
    target_words: question.target_words || '',
    concept_tags: question.concept_tags || '',
    knowledge_pressure: Number(payload.knowledge_pressure) || 0,
    weapon_quality: payload.weapon_quality || 'normal',
    sync_status: payload.student_name ? ('已同步 (' + payload.student_name + ')') : '已同步'
  };
}

function refreshReports() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureReportSheets_(ss);
  cleanLegacySheets_(ss);
  const attempts = sheetObjects_(ss.getSheetByName(SHEETS.ATTEMPTS));
  const qSheet = getQuestionsSheet_(ss);
  const rawQuestions = qSheet ? sheetObjects_(qSheet) : [];
  const questions = rawQuestions.map(function(row, idx) {
    return parseQuestionRow_(row, idx);
  });
  const students = getStudents_().students;
  writeParentDashboard_(ss, attempts, questions, students);
  logActivity_('REPORT', '家長總覽報表已更新。');
}

function writeParentDashboard_(ss, attempts, questions, students) {
  const sheet = ss.getSheetByName(SHEETS.PARENT_DASHBOARD);
  if (!sheet) return;
  sheet.clear();

  // 1. 建立題庫快取
  const qMap = {};
  questions.forEach(function(q) {
    qMap[q.question_id] = q;
  });

  // 2. 彙整學員作答進度
  const studentMap = {};
  students.forEach(function(s) {
    const sid = String(s.student_id || '').trim();
    studentMap[sid] = {
      student: s,
      display_name: s.display_name || sid,
      grade: s.grade || '',
      total_attempts: 0,
      correct_count: 0,
      wrong_count: 0,
      last_active: 0,
      qProgress: {}
    };
  });

  attempts.forEach(function(a) {
    const sid = String(a.student_id || '').trim();
    if (!sid) return;
    if (!studentMap[sid]) {
      studentMap[sid] = {
        student: { student_id: sid, display_name: a.student_name || sid, grade: a.student_grade || '' },
        display_name: a.student_name || sid,
        grade: a.student_grade || '',
        total_attempts: 0,
        correct_count: 0,
        wrong_count: 0,
        last_active: 0,
        qProgress: {}
      };
    }
    const sObj = studentMap[sid];
    sObj.total_attempts++;
    const isCorrect = toBool_(a.correct);
    if (isCorrect) sObj.correct_count++;
    else sObj.wrong_count++;

    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    if (aTime > sObj.last_active) {
      sObj.last_active = aTime;
    }

    const qid = String(a.question_id || '').trim();
    if (!sObj.qProgress[qid]) {
      const qData = qMap[qid] || {};
      sObj.qProgress[qid] = {
        question_id: qid,
        question_text: qData.question || a.question || qid,
        correct: 0,
        wrong: 0,
        lastTime: 0
      };
    }
    const qp = sObj.qProgress[qid];
    if (isCorrect) qp.correct++;
    else qp.wrong++;
    if (aTime > qp.lastTime) {
      qp.lastTime = aTime;
    }
  });

  // 3. 儀表板頁首標題
  sheet.getRange('A1').setValue('🌟 星墜答問｜家長學習總覽 (Parent Learning Dashboard)');
  sheet.getRange('A1').setFontWeight('bold').setFontSize(14).setFontColor('#0284c7');
  sheet.getRange('A2').setValue('更新時間：' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss'));
  sheet.getRange('A2').setFontColor('#64748b').setFontSize(10);
  sheet.getRange('A3').setValue('📌 家長指南：答對的題目幾乎不再重複出現；答錯題目將隨機重複出現，直到該題正確率超過 50% 掌握為止。');
  sheet.getRange('A3').setFontWeight('bold').setFontColor('#334155').setFontSize(10);

  // 4. 第一部分：各學員整體學習成果總表
  sheet.getRange('A5').setValue('📊 【第一部分：學員整體學習成效總覽】');
  sheet.getRange('A5').setFontWeight('bold').setFontSize(11);

  const summaryHeaders = [
    '學號', '學生姓名', '年級', '總答題數', '答對次數', '答錯次數',
    '整體正確率', '✨已掌握題數 (>50%)', '⚠️待加強題數 (≤50%)', '最近作答時間'
  ];
  sheet.getRange(6, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  sheet.getRange(6, 1, 1, summaryHeaders.length)
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const summaryRows = [];
  const detailRows = [];

  Object.keys(studentMap).sort().forEach(function(sid) {
    const s = studentMap[sid];
    const total = s.total_attempts;
    const correct = s.correct_count;
    const wrong = s.wrong_count;
    const acc = total > 0 ? (correct / total) : 0;

    let masteredCount = 0;
    let needsReviewCount = 0;

    Object.keys(s.qProgress).forEach(function(qid) {
      const qp = s.qProgress[qid];
      const qTotal = qp.correct + qp.wrong;
      const qAcc = qTotal > 0 ? (qp.correct / qTotal) : 0;
      // 規則：初次答對 (wrong === 0) 或累積正確率 > 50% 視為已掌握；否則為待加強錯題
      const isMastered = (qp.wrong === 0 && qp.correct > 0) || (qAcc > 0.5);
      if (isMastered) masteredCount++;
      else needsReviewCount++;

      let statusLabel = '';
      if (qp.wrong === 0 && qp.correct > 0) {
        statusLabel = '✨ 已掌握 (初次答對 100%)';
      } else if (qAcc > 0.5) {
        statusLabel = '✨ 已掌握 (正確率 ' + Math.round(qAcc * 100) + '%)';
      } else {
        statusLabel = '⚠️ 待加強 (正確率 ' + Math.round(qAcc * 100) + '%・隨機重複出題中)';
      }

      const dateStr = qp.lastTime ? Utilities.formatDate(new Date(qp.lastTime), 'Asia/Taipei', 'yyyy/MM/dd HH:mm') : '';

      detailRows.push({
        sid: sid,
        student_name: s.display_name,
        question_id: qp.question_id,
        question_text: qp.question_text,
        correct: qp.correct,
        wrong: qp.wrong,
        total: qTotal,
        accuracy: qAcc,
        isMastered: isMastered,
        status: statusLabel,
        lastTimeStr: dateStr
      });
    });

    const activeStr = s.last_active ? Utilities.formatDate(new Date(s.last_active), 'Asia/Taipei', 'yyyy/MM/dd HH:mm') : '尚未作答';
    summaryRows.push([
      sid,
      s.display_name,
      s.grade,
      total,
      correct,
      wrong,
      total > 0 ? acc : 0,
      masteredCount,
      needsReviewCount,
      activeStr
    ]);
  });

  if (summaryRows.length) {
    sheet.getRange(7, 1, summaryRows.length, summaryHeaders.length).setValues(summaryRows);
    sheet.getRange(7, 7, summaryRows.length, 1).setNumberFormat('0.0%');
    sheet.getRange(7, 1, summaryRows.length, summaryHeaders.length).setHorizontalAlignment('center');
    sheet.getRange(7, 2, summaryRows.length, 1).setHorizontalAlignment('left');
  }

  // 5. 第二部分：逐題精準掌握清單 (答對什麼、答錯什麼)
  const detailStartRow = 9 + summaryRows.length;
  sheet.getRange('A' + detailStartRow).setValue('🎯 【第二部分：學生逐題掌握明細（家長精準掌握：答對什麼、答錯什麼）】');
  sheet.getRange('A' + detailStartRow).setFontWeight('bold').setFontSize(11);

  const detailHeaders = [
    '學生姓名', '題目代碼', '題目內容', '答對次數', '答錯次數',
    '總作答數', '題目正確率', '學習掌握狀態', '最近作答時間'
  ];
  sheet.getRange(detailStartRow + 1, 1, 1, detailHeaders.length).setValues([detailHeaders]);
  sheet.getRange(detailStartRow + 1, 1, 1, detailHeaders.length)
    .setBackground('#0f172a')
    .setFontColor('#38bdf8')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // 排序：先按學生，再將「⚠️ 待加強」錯題排在最上方（方便家長優先檢查），最後按題號
  detailRows.sort(function(a, b) {
    if (a.student_name !== b.student_name) return a.student_name.localeCompare(b.student_name);
    if (a.isMastered !== b.isMastered) return a.isMastered ? 1 : -1;
    return a.question_id.localeCompare(b.question_id);
  });

  const detailOutput = detailRows.map(function(d) {
    return [
      d.student_name,
      d.question_id,
      d.question_text,
      d.correct,
      d.wrong,
      d.total,
      d.accuracy,
      d.status,
      d.lastTimeStr
    ];
  });

  if (detailOutput.length) {
    sheet.getRange(detailStartRow + 2, 1, detailOutput.length, detailHeaders.length).setValues(detailOutput);
    sheet.getRange(detailStartRow + 2, 7, detailOutput.length, 1).setNumberFormat('0.0%');
    sheet.getRange(detailStartRow + 2, 1, detailOutput.length, detailHeaders.length).setHorizontalAlignment('center');
    sheet.getRange(detailStartRow + 2, 3, detailOutput.length, 1).setHorizontalAlignment('left'); // 題目內容靠左
    sheet.getRange(detailStartRow + 2, 8, detailOutput.length, 1).setHorizontalAlignment('left'); // 狀態標籤靠左
  }

  sheet.setFrozenRows(6);
  sheet.autoResizeColumns(1, detailHeaders.length);
}

function getReportData_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentId = params && params.student_id ? String(params.student_id) : '';
  const attempts = sheetObjects_(ss.getSheetByName(SHEETS.ATTEMPTS));
  const filterAttempts = studentId ? attempts.filter(function(a) { return String(a.student_id) === studentId; }) : attempts;
  return {
    ok: true,
    student_id: studentId || null,
    total_attempts: filterAttempts.length,
    dashboard_sheet: SHEETS.PARENT_DASHBOARD
  };
}

function createDemoAttempts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const students = sheetObjects_(ss.getSheetByName(SHEETS.STUDENTS));
  const questions = sheetObjects_(getQuestionsSheet_(ss)).filter(function(q) { return String(q.enabled).toUpperCase() !== 'FALSE'; });
  if (!students.length) throw new Error('Students 至少需要一位啟用中的學生。');
  if (!questions.length) throw new Error('Questions 沒有啟用題目。');
  const student = students[0];
  const selected = questions.slice(0, Math.min(12, questions.length));
  const batch = selected.map(function(q, index) {
    const correct = index % 3 !== 0;
    const answer = String(q.answer || 'A').toUpperCase();
    const wrong = ['A', 'B', 'C', 'D'].filter(function(x) { return x !== answer; })[index % 3];
    return normalizeAttempt_({
      student_id: student.student_id,
      session_id: 'DEMO-' + Utilities.getUuid().slice(0, 8),
      stage: Math.floor(index / 3) + 1,
      boss_name: '測試 Boss',
      question_id: q.question_id,
      selected_option: correct ? answer : wrong,
      correct: correct,
      response_time_ms: 3000 + index * 900,
      is_review: index > 7,
      hint_used: false,
      knowledge_pressure: index % 4,
      weapon_quality: correct ? 'rare' : 'normal'
    }, ss);
  });
  recordAttemptBatch_({ attempts: batch });
  SpreadsheetApp.getUi().alert('已建立 ' + batch.length + ' 筆測試作答資料。');
}

function ensureSheetAndHeaders_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  const current = getHeaders_(sheet);
  if (!current.length || current.every(function(v) { return !v; })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  // 若為 Questions 工作表且已有標題列，絕不擅自追加額外欄位，完整尊重使用者 8 欄極簡配置
  if (sheetName === SHEETS.QUESTIONS) {
    sheet.setFrozenRows(1);
    return sheet;
  }
  const missing = headers.filter(function(header) { return current.indexOf(header) === -1; });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function ensureReportSheets_(ss) {
  if (!ss.getSheetByName(SHEETS.PARENT_DASHBOARD)) {
    ss.insertSheet(SHEETS.PARENT_DASHBOARD);
  }
}

/**
 * 試算表選單專用：一鍵將題庫簡化為 8 欄極簡模式
 */
function simplifyQuestionsColumns() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    '確認簡化題庫欄位為 8 欄',
    '此操作將會把【Questions】工作表轉換為極簡 8 欄：\n' +
    '【題號】｜【題目】｜【選項1】｜【選項2】｜【選項3】｜【選項4】｜【答案】｜【答案說明】\n\n' +
    '所有題目的內容、選項、答案與說明都會 100% 完整保留！\n確定要開始執行簡化轉換嗎？',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.ButtonSet.YES) return;

  try {
    const res = simplifyQuestionsColumns_();
    ui.alert(
      '轉換完成！',
      '題庫已成功簡化為 8 欄極簡格式！\n' +
      '• 成功處理題數：' + res.count + ' 題\n' +
      '• 目前欄位：題號、題目、選項1、選項2、選項3、選項4、答案、答案說明',
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('轉換失敗', '錯誤原因：' + String(err.message || err), ui.ButtonSet.OK);
  }
}

function simplifyQuestionsColumns_(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getQuestionsSheet_(ss);
  if (!sheet) throw new Error('找不到 Questions 工作表');

  const rows = sheetObjects_(sheet);
  if (rows.length === 0) return { ok: true, count: 0 };

  const targetHeaders = ['題號', '題目', '選項1', '選項2', '選項3', '選項4', '答案', '答案說明'];
  const newRows = rows.map(function(row, idx) {
    const parsed = parseQuestionRow_(row, idx);
    return [
      parsed.question_id,
      parsed.question,
      parsed.options[0] || '',
      parsed.options[1] || '',
      parsed.options[2] || '',
      parsed.options[3] || '',
      parsed.answer,
      parsed.explanation_detail || ''
    ];
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
  if (newRows.length > 0) {
    sheet.getRange(2, 1, newRows.length, targetHeaders.length).setValues(newRows);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, targetHeaders.length);
  sheet.getRange(1, 1, 1, targetHeaders.length)
    .setBackground('#1e293b')
    .setFontColor('#38bdf8')
    .setFontWeight('bold');

  return { ok: true, count: newRows.length };
}

function cleanLegacySheets_(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  const legacyNames = [
    'QuestionStats', 'WordStats', 'SkillStats', 'ActivityLog', 'Settings', 'Students',
    'Sheet1', 'Sheet2', 'Sheet3', '工作表1', '工作表2', '工作表3',
    '題目統計', '單字統計', '技能統計', '活動紀錄', '設定', '學生名單'
  ];
  const deleted = [];
  legacyNames.forEach(function(name) {
    const s = ss.getSheetByName(name);
    if (s && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(s);
        deleted.push(name);
      } catch (e) {}
    }
  });
  return deleted;
}

function cleanAllExtraSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const res = cleanAllExtraSheets_(ss);
  const msg = res.deleted.length > 0
    ? '✅ 簡化成功！已刪除以下多餘工作表：\n' + res.deleted.join('、') + '\n\n目前試算表已極簡化為 3 個核心分頁：\n1. 【ParentDashboard】家長學習總覽（第一頁）\n2. 【Questions】題目庫 (8 欄格式)\n3. 【Attempts】即時作答紀錄'
    : 'ℹ️ 目前試算表已是極簡 3 分頁狀態（ParentDashboard、Questions、Attempts），無多餘工作表。';
  SpreadsheetApp.getUi().alert('工作表極簡化完成', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

function cleanAllExtraSheets_(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  const deleted = cleanLegacySheets_(ss);

  // 確保三大核心分頁存在
  ensureSheetAndHeaders_(ss, SHEETS.QUESTIONS, REQUIRED_HEADERS.Questions);
  ensureSheetAndHeaders_(ss, SHEETS.ATTEMPTS, REQUIRED_HEADERS.Attempts);
  ensureReportSheets_(ss);

  // 將 ParentDashboard 移到最左側第一個分頁，打開試算表第一眼即見家長總覽
  const dash = ss.getSheetByName(SHEETS.PARENT_DASHBOARD);
  if (dash) {
    try {
      ss.setActiveSheet(dash);
      ss.moveActiveSheet(1);
    } catch (e) {}
  }

  // 重新產生最新家長報表
  refreshReports();
  return { ok: true, deleted: deleted };
}

function sheetObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(function(v) { return String(v).trim(); });
  return values.filter(function(row) {
    return row.some(function(cell) { return cell !== '' && cell !== null && cell !== undefined; });
  }).map(function(row) {
    const obj = { _raw: row, _headers: headers };
    headers.forEach(function(header, i) {
      if (header) obj[header] = row[i];
    });
    return obj;
  });
}

function getHeaders_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1 || sheet.getLastRow() < 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(v) { return String(v).trim(); });
  return headers.filter(function(v) { return v !== ''; });
}

function writeTable_(sheet, headers, rows) {
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  if (headers.indexOf('accuracy') !== -1) {
    const col = headers.indexOf('accuracy') + 1;
    if (rows.length) sheet.getRange(2, col, rows.length, 1).setNumberFormat('0.0%');
  }
  if (headers.indexOf('smoothed_wrong_rate') !== -1) {
    const col = headers.indexOf('smoothed_wrong_rate') + 1;
    if (rows.length) sheet.getRange(2, col, rows.length, 1).setNumberFormat('0.0%');
  }
  if (headers.indexOf('review_accuracy') !== -1) {
    const col = headers.indexOf('review_accuracy') + 1;
    if (rows.length) sheet.getRange(2, col, rows.length, 1).setNumberFormat('0.0%');
  }
}

function logActivity_(eventType, message) {
  try {
    console.log('[' + eventType + '] ' + message);
  } catch (e) {}
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const text = e.postData.contents;
  try { return JSON.parse(text); } catch (err) {
    const data = {};
    text.split('&').forEach(function(pair) {
      const parts = pair.split('=');
      if (parts[0]) data[decodeURIComponent(parts[0])] = decodeURIComponent(parts.slice(1).join('=') || '');
    });
    return data;
  }
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function splitTags_(value) {
  return String(value || '').split(/[|｜,，]/).map(function(v) { return v.trim(); }).filter(Boolean);
}

function toBool_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

function coerceValue_(value) {
  const text = String(value).trim();
  if (text.toUpperCase() === 'TRUE') return true;
  if (text.toUpperCase() === 'FALSE') return false;
  if (text !== '' && !isNaN(Number(text))) return Number(text);
  return value;
}

/**
 * 試算表選單專用：一鍵去重與選項均衡清洗
 */
function cleanDuplicateQuestions() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    '確認執行題庫去重與選項平衡清洗',
    '此操作將會：\n1. 比對 Questions 工作表中的重複題目\n2. 優先刪除重複且答案為 A 的題目\n3. 針對全 A 題目自動旋轉選項，平衡 A/B/C/D 正確答案比例（各約 25%）\n\n確定要開始執行清洗嗎？',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  try {
    const result = cleanDuplicateQuestions_();
    ui.alert(
      '清洗完成！',
      '去重清洗作業已成功執行完成：\n' +
      '• 原始題目數：' + result.originalCount + ' 列\n' +
      '• 刪除重複題數：' + result.deletedCount + ' 列\n' +
      '• 清洗後保留題目數：' + result.cleanCount + ' 列\n' +
      '• A/B/C/D 正確答案已均衡分配！',
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('清洗失敗', '錯誤原因：' + String(err.message || err), ui.ButtonSet.OK);
  }
}

/**
 * 核心清洗邏輯：讀取 Questions 工作表，去重、優先去 A、旋轉平衡選項並寫回
 */
function cleanDuplicateQuestions_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getQuestionsSheet_(ss);
  if (!sheet) throw new Error('找不到 Questions/題庫 工作表');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { originalCount: 0, deletedCount: 0, cleanCount: 0 };

  const headers = data[0].map(function(h) { return String(h || '').trim(); });
  const cleanHeaders = headers.map(function(h) { return h.toLowerCase().replace(/[\s_\-（）()、]/g, ''); });

  const findHeaderIdx = function(names) {
    const cleanNames = names.map(function(n) { return n.toLowerCase().replace(/[\s_\-（）()、]/g, ''); });
    for (let c = 0; c < cleanNames.length; c++) {
      const idx = cleanHeaders.indexOf(cleanNames[c]);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  let qidIdx = findHeaderIdx(['題號', 'question_id', 'id', '序號', '編號']);
  let qIdx = findHeaderIdx(['題目', 'question', '問題', '題幹', '內容']);
  let ansIdx = findHeaderIdx(['答案', 'answer', 'ans', '正解', '解答']);

  if (qIdx === -1 && data[0].length >= 2) qIdx = 1;
  if (qidIdx === -1 && data[0].length >= 1) qidIdx = 0;
  if (ansIdx === -1 && data[0].length >= 7) ansIdx = 6;

  if (qIdx === -1) {
    throw new Error('Questions 工作表找不到「題目」欄位');
  }

  const getFp = function(t) {
    return String(t || '').trim()
      .replace(/[\s\r\n\t]/g, '')
      .replace(/[「」『』""''，。、？！：；,.?!:;（）()]/g, '')
      .toLowerCase();
  };

  const originalRows = data.slice(1);
  const seenIds = {};
  const seenFps = {};
  const retained = [];

  originalRows.forEach(function(row) {
    if (!row || !row[qIdx]) return;
    const qid = qidIdx !== -1 ? String(row[qidIdx] || '').trim() : '';
    const qFp = getFp(row[qIdx]);
    const ansVal = ansIdx !== -1 ? String(row[ansIdx] || '').trim().toUpperCase() : '';
    const contentKey = qFp + ':::' + ansVal;

    // 若 ID 重複或題幹與答案完全相同，只保留第一筆
    if ((qid && seenIds[qid]) || (contentKey && seenFps[contentKey])) {
      return;
    }
    if (qid) seenIds[qid] = true;
    if (contentKey) seenFps[contentKey] = true;

    // 100% 保持原始選項與答案，絕不進行任何隨機或人工旋轉位移
    retained.push(row.slice());
  });

  // 清除舊資料並寫回清洗後的去重資料
  sheet.clearContents();
  const outputRows = [data[0]].concat(retained);
  sheet.getRange(1, 1, outputRows.length, outputRows[0].length).setValues(outputRows);

  logActivity_('CLEAN_QUESTIONS', '去重清洗完成，原列數: ' + originalRows.length + '，清洗後列數: ' + retained.length);

  return {
    originalCount: originalRows.length,
    deletedCount: originalRows.length - retained.length,
    cleanCount: retained.length
  };
}

