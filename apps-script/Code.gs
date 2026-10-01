const SHEETS = {
  PARENT_DASHBOARD: 'ParentDashboard',
  QUESTIONS: 'Questions',
  ATTEMPTS: 'Attempts',
  STUDENTS: 'Students' // 相容舊版，若不存在會自動從 Attempts 整合學生名冊
};

// 極簡 3 分頁架構：僅保留 Questions (題庫) 與 Attempts (作答紀錄)，其餘報表全由 ParentDashboard 呈現
const REQUIRED_HEADERS = {
  Questions: [
    'question_id', 'enabled', 'grade', 'subject', 'unit', 'skill',
    'question_type', 'difficulty', 'question', 'option_a', 'option_b',
    'option_c', 'option_d', 'answer', 'explanation_short',
    'explanation_detail', 'memory_tip', 'target_words', 'concept_tags',
    'error_pattern', 'next_step', 'source_type', 'review_priority'
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
    .addItem('📊 立即更新家長報表 (ParentDashboard)', 'refreshReports')
    .addItem('✨ 題庫智慧去重與選項均衡清洗', 'cleanDuplicateQuestions')
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
  SpreadsheetApp.getUi().alert('初始化完成', '已檢查資料表並將工作表極簡化為 3 個核心分頁：\n1. 【ParentDashboard】家長學習總覽\n2. 【Questions】題目庫\n3. 【Attempts】即時作答紀錄', SpreadsheetApp.getUi().ButtonSet.OK);
}

function doGet(e) {
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
    return jsonOutput_({
      ok: true,
      service: 'Starfall Quiz Learning API',
      version: '1.2.6',
      actions: ['questions', 'students', 'student_progress', 'register_student', 'attempt', 'attempt_batch', 'settings', 'report', 'clean_questions', 'clean_sheets']
    });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
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
  return ss.getSheetByName(SHEETS.QUESTIONS) ||
         ss.getSheetByName('Questions') ||
         ss.getSheetByName('Question') ||
         ss.getSheetByName('Quetions') ||
         ss.getSheetByName('題庫') ||
         ss.getSheetByName('questions') ||
         null;
}

function getQuestions_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getQuestionsSheet_(ss);
  const rows = sheetObjects_(sheet);
  const grade = params && params.grade ? String(params.grade).trim() : '';
  const enabledOnly = !params || String(params.enabled || 'true').toLowerCase() !== 'false';
  const questions = rows.filter(function(row) {
    const enabled = String(row.enabled).toUpperCase() !== 'FALSE';
    return (!enabledOnly || enabled) && (!grade || row.grade === grade);
  }).map(function(row) {
    return {
      question_id: row.question_id,
      grade: row.grade,
      subject: row.subject,
      unit: row.unit,
      skill: row.skill,
      question_type: row.question_type,
      difficulty: Number(row.difficulty) || 1,
      question: row.question,
      options: [row.option_a, row.option_b, row.option_c, row.option_d],
      answer: row.answer,
      explanation_short: row.explanation_short,
      explanation_detail: row.explanation_detail,
      memory_tip: row.memory_tip,
      target_words: splitTags_(row.target_words),
      concept_tags: splitTags_(row.concept_tags),
      error_pattern: row.error_pattern,
      next_step: row.next_step,
      review_priority: Number(row.review_priority) || 1
    };
  });
  return { ok: true, updated_at: new Date().toISOString(), count: questions.length, questions: questions };
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
  const questions = sheetObjects_(getQuestionsSheet_(ss));
  const students = sheetObjects_(ss.getSheetByName(SHEETS.STUDENTS));
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

function cleanAllExtraSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const res = cleanAllExtraSheets_(ss);
  const msg = res.deleted.length > 0
    ? '✅ 簡化成功！已刪除以下多餘工作表：\n' + res.deleted.join('、') + '\n\n目前試算表已極簡化為 3 個核心分頁：\n1. 【ParentDashboard】家長學習總覽（第一頁）\n2. 【Questions】題目庫\n3. 【Attempts】即時作答紀錄'
    : 'ℹ️ 目前試算表已是極簡 3 分頁狀態（ParentDashboard、Questions、Attempts），無多餘工作表。';
  SpreadsheetApp.getUi().alert('工作表極簡化完成', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

function cleanAllExtraSheets_(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  // 欲刪除的多餘分頁名稱（統計表、記錄表、設定表、獨立學生名單、未命名的空工作表）
  const legacyNames = ['QuestionStats', 'WordStats', 'SkillStats', 'ActivityLog', 'Settings', 'Students', 'Sheet1', '工作表1'];
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

  // 確保三大核心分頁存在
  ensureSheetAndHeaders_(ss, SHEETS.QUESTIONS, REQUIRED_HEADERS.Questions);
  ensureSheetAndHeaders_(ss, SHEETS.ATTEMPTS, REQUIRED_HEADERS.Attempts);
  ensureReportSheets_(ss);

  // 將 ParentDashboard 移到最左側第一個分頁，打開試算表第一眼即見家長總覽
  const dash = ss.getSheetByName(SHEETS.PARENT_DASHBOARD);
  if (dash) {
    ss.setActiveSheet(dash);
    ss.moveActiveSheet(1);
  }

  // 重新產生最新家長報表
  refreshReports();
  return { ok: true, deleted: deleted };
}

function cleanLegacySheets_(ss) {
  return cleanAllExtraSheets_(ss);
}

function sheetObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(function(v) { return String(v).trim(); });
  return values.filter(function(row) { return row.some(function(cell) { return cell !== '' && cell !== null; }); }).map(function(row) {
    const obj = {};
    headers.forEach(function(header, i) { obj[header] = row[i]; });
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

  const headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  const qidIdx = headers.indexOf('question_id');
  const qIdx = headers.indexOf('question');
  const ansIdx = headers.indexOf('answer');

  if (qIdx === -1 || ansIdx === -1) {
    throw new Error('Questions 工作表缺少 question 或 answer 標題列');
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
    const ansVal = String(row[ansIdx] || '').trim().toUpperCase();
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

