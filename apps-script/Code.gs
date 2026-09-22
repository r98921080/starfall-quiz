const SHEETS = {
  QUESTIONS: 'Questions',
  STUDENTS: 'Students',
  ATTEMPTS: 'Attempts',
  SETTINGS: 'Settings',
  QUESTION_STATS: 'QuestionStats',
  WORD_STATS: 'WordStats',
  SKILL_STATS: 'SkillStats',
  PARENT_DASHBOARD: 'ParentDashboard',
  ACTIVITY_LOG: 'ActivityLog'
};

const REQUIRED_HEADERS = {
  Questions: [
    'question_id', 'enabled', 'grade', 'subject', 'unit', 'skill',
    'question_type', 'difficulty', 'question', 'option_a', 'option_b',
    'option_c', 'option_d', 'answer', 'explanation_short',
    'explanation_detail', 'memory_tip', 'target_words', 'concept_tags',
    'error_pattern', 'next_step', 'source_type', 'review_priority'
  ],
  Students: ['student_id', 'display_name', 'grade', 'pin_hash', 'active', 'created_at', 'notes'],
  Attempts: [
    'timestamp', 'student_id', 'session_id', 'stage', 'boss_name', 'question_id',
    'selected_option', 'correct', 'response_time_ms', 'attempt_index', 'is_review',
    'hint_used', 'difficulty_at_time', 'subject', 'unit', 'skill', 'target_words',
    'concept_tags', 'knowledge_pressure', 'weapon_quality', 'sync_status'
  ],
  Settings: ['setting_key', 'setting_value', 'description']
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('星墜答問')
    .addItem('初始化與檢查資料表', 'setupStarfall')
    .addItem('更新家長報表', 'refreshReports')
    .addItem('建立測試作答資料', 'createDemoAttempts')
    .addToUi();
}

function setupStarfall() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(REQUIRED_HEADERS).forEach(function(sheetName) {
    ensureSheetAndHeaders_(ss, sheetName, REQUIRED_HEADERS[sheetName]);
  });
  ensureReportSheets_(ss);
  refreshReports();
  logActivity_('SETUP', '初始化完成，資料表與報表已建立。');
  SpreadsheetApp.getUi().alert('初始化完成', '已檢查資料表並建立家長報表。請回到試算表查看新增的報表分頁。', SpreadsheetApp.getUi().ButtonSet.OK);
}

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'health').toLowerCase();
  try {
    if (action === 'questions') return jsonOutput_(getQuestions_(e && e.parameter));
    if (action === 'students') return jsonOutput_(getStudents_());
    if (action === 'student_progress') return jsonOutput_(getStudentProgressData_(e && e.parameter));
    if (action === 'settings') return jsonOutput_(getSettings_());
    if (action === 'report') return jsonOutput_(getReportData_(e && e.parameter));
    return jsonOutput_({
      ok: true,
      service: 'Starfall Quiz Learning API',
      version: '1.0.0',
      actions: ['questions', 'students', 'student_progress', 'settings', 'report']
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
    return jsonOutput_({ ok: false, error: '不支援的 action：' + action });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err.message || err) });
  }
}

function registerStudent_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (!sheet) throw new Error('找不到 Students 資料表。');
  const rows = sheetObjects_(sheet);
  const name = String(payload.name || payload.display_name || '').trim();
  const grade = String(payload.grade || '').trim();
  if (!name) throw new Error('學生姓名不可為空。');

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
}

function getQuestions_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rows = sheetObjects_(ss.getSheetByName(SHEETS.QUESTIONS));
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
  const students = sheetObjects_(ss.getSheetByName(SHEETS.STUDENTS))
    .filter(function(row) { return String(row.active).toUpperCase() !== 'FALSE'; })
    .map(function(row) {
      return { student_id: row.student_id, display_name: row.display_name, grade: row.grade, notes: row.notes || '' };
    });
  return { ok: true, students: students };
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
  const settings = {};
  sheetObjects_(ss.getSheetByName(SHEETS.SETTINGS)).forEach(function(row) {
    if (row.setting_key) settings[row.setting_key] = coerceValue_(row.setting_value);
  });
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
  const question = findQuestion_(ss, payload.question_id);
  if (!question) throw new Error('找不到 question_id：' + payload.question_id);
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
    sync_status: 'synced'
  };
}

function refreshReports() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureReportSheets_(ss);
  const attempts = sheetObjects_(ss.getSheetByName(SHEETS.ATTEMPTS));
  const questions = sheetObjects_(ss.getSheetByName(SHEETS.QUESTIONS));
  const students = sheetObjects_(ss.getSheetByName(SHEETS.STUDENTS));
  const settings = settingsObject_(ss);
  writeQuestionStats_(ss, attempts, questions, settings);
  writeWordStats_(ss, attempts, settings);
  writeSkillStats_(ss, attempts, settings);
  writeParentDashboard_(ss, attempts, questions, students, settings);
  logActivity_('REPORT', '家長報表已更新。');
}

function writeQuestionStats_(ss, attempts, questions, settings) {
  const byQuestion = {};
  questions.forEach(function(q) { byQuestion[q.question_id] = { question: q, attempts: [] }; });
  attempts.forEach(function(a) {
    if (!byQuestion[a.question_id]) byQuestion[a.question_id] = { question: { question_id: a.question_id, question: '', grade: '', unit: a.unit, skill: a.skill, difficulty: a.difficulty_at_time, target_words: a.target_words }, attempts: [] };
    byQuestion[a.question_id].attempts.push(a);
  });
  const rows = Object.keys(byQuestion).sort().map(function(id) {
    const item = byQuestion[id];
    const list = item.attempts;
    const total = list.length;
    const correct = list.filter(function(a) { return toBool_(a.correct); }).length;
    const wrong = total - correct;
    const accuracy = total ? correct / total : '';
    const avgMs = total ? Math.round(list.reduce(function(sum, a) { return sum + Number(a.response_time_ms || 0); }, 0) / total) : '';
    const first = total ? list[0] : null;
    const review = list.filter(function(a) { return toBool_(a.is_review); });
    const reviewCorrect = review.filter(function(a) { return toBool_(a.correct); }).length;
    const smoothWrong = (wrong + Number(settings.smoothing_wrong_prior || 2)) / (total + Number(settings.smoothing_total_prior || 4));
    const status = masteryStatus_(total, correct, wrong, list, settings);
    return [id, item.question.grade || '', item.question.unit || '', item.question.skill || '', item.question.difficulty || '', item.question.question || '', item.question.target_words || '', total, correct, wrong, accuracy, avgMs, first ? first.correct : '', review.length, reviewCorrect, smoothWrong, status];
  });
  writeTable_(ss.getSheetByName(SHEETS.QUESTION_STATS), [
    'question_id', 'grade', 'unit', 'skill', 'difficulty', 'question', 'target_words', 'total_attempts', 'correct_count', 'wrong_count', 'accuracy', 'avg_response_time_ms', 'first_attempt_correct', 'review_attempts', 'review_correct_count', 'smoothed_wrong_rate', 'mastery_status'
  ], rows);
}

function writeWordStats_(ss, attempts, settings) {
  const byStudentWord = {};
  attempts.forEach(function(a) {
    const words = splitTags_(a.target_words);
    words.forEach(function(word) {
      const key = a.student_id + '||' + word;
      if (!byStudentWord[key]) byStudentWord[key] = { student_id: a.student_id, word: word, attempts: [] };
      byStudentWord[key].attempts.push(a);
    });
  });
  const minAttempts = Number(settings.minimum_attempts_for_word_analysis || 5);
  const threshold = Number(settings.word_bottleneck_accuracy || 0.65);
  const slowSeconds = Number(settings.slow_response_seconds || 12);
  const rows = Object.keys(byStudentWord).sort().map(function(key) {
    const item = byStudentWord[key];
    const list = item.attempts;
    const total = list.length;
    const correct = list.filter(function(a) { return toBool_(a.correct); }).length;
    const accuracy = total ? correct / total : '';
    const avgMs = total ? Math.round(list.reduce(function(sum, a) { return sum + Number(a.response_time_ms || 0); }, 0) / total) : '';
    const wrongOptions = {};
    list.filter(function(a) { return !toBool_(a.correct); }).forEach(function(a) { wrongOptions[a.selected_option || '未作答'] = (wrongOptions[a.selected_option || '未作答'] || 0) + 1; });
    const commonWrong = Object.keys(wrongOptions).sort(function(a, b) { return wrongOptions[b] - wrongOptions[a]; })[0] || '';
    let diagnosis = '樣本不足';
    if (total >= minAttempts) {
      if (accuracy < threshold && avgMs > slowSeconds * 1000) diagnosis = '正確率偏低且作答偏慢';
      else if (accuracy < threshold) diagnosis = '正確率偏低';
      else if (avgMs > slowSeconds * 1000) diagnosis = '理解可能不足或作答偏慢';
      else diagnosis = '表現穩定';
    }
    return [item.student_id, item.word, total, correct, total - correct, accuracy, avgMs, commonWrong, diagnosis];
  });
  writeTable_(ss.getSheetByName(SHEETS.WORD_STATS), ['student_id', 'target_word', 'total_occurrences', 'correct_count', 'wrong_count', 'accuracy', 'avg_response_time_ms', 'common_wrong_option', 'diagnosis'], rows);
}

function writeSkillStats_(ss, attempts, settings) {
  const bySkill = {};
  attempts.forEach(function(a) {
    const key = [a.student_id, a.grade || '', a.unit || '', a.skill || '', a.concept_tags || ''].join('||');
    if (!bySkill[key]) bySkill[key] = { student_id: a.student_id, grade: a.grade || '', unit: a.unit || '', skill: a.skill || '', concept_tags: a.concept_tags || '', attempts: [] };
    bySkill[key].attempts.push(a);
  });
  const rows = Object.keys(bySkill).sort().map(function(key) {
    const item = bySkill[key];
    const list = item.attempts;
    const total = list.length;
    const correct = list.filter(function(a) { return toBool_(a.correct); }).length;
    const accuracy = total ? correct / total : '';
    const avgMs = total ? Math.round(list.reduce(function(sum, a) { return sum + Number(a.response_time_ms || 0); }, 0) / total) : '';
    const reviews = list.filter(function(a) { return toBool_(a.is_review); });
    const reviewAccuracy = reviews.length ? reviews.filter(function(a) { return toBool_(a.correct); }).length / reviews.length : '';
    let diagnosis = '觀察中';
    if (total >= 3 && accuracy < Number(settings.weak_accuracy_threshold || 0.65)) diagnosis = '弱項：建議提高出題權重';
    else if (total >= 3 && avgMs > Number(settings.slow_response_seconds || 12) * 1000) diagnosis = '作答偏慢：建議先用簡化題型複習';
    else if (total >= 3 && accuracy >= 0.85) diagnosis = '熟練：可降低出現頻率';
    return [item.student_id, item.grade, item.unit, item.skill, item.concept_tags, total, correct, total - correct, accuracy, avgMs, reviews.length, reviewAccuracy, diagnosis];
  });
  writeTable_(ss.getSheetByName(SHEETS.SKILL_STATS), ['student_id', 'grade', 'unit', 'skill', 'concept_tags', 'total_attempts', 'correct_count', 'wrong_count', 'accuracy', 'avg_response_time_ms', 'review_attempts', 'review_accuracy', 'diagnosis'], rows);
}

function writeParentDashboard_(ss, attempts, questions, students, settings) {
  const sheet = ss.getSheetByName(SHEETS.PARENT_DASHBOARD);
  sheet.clear();
  sheet.getRange('A1').setValue('星墜答問｜家長學習儀表板');
  sheet.getRange('A2').setValue('更新時間');
  sheet.getRange('B2').setValue(new Date());
  sheet.getRange('A4').setValue('學生總覽');
  const byStudent = {};
  students.forEach(function(s) { byStudent[s.student_id] = { student: s, attempts: [] }; });
  attempts.forEach(function(a) {
    if (!byStudent[a.student_id]) byStudent[a.student_id] = { student: { student_id: a.student_id, display_name: a.student_id, grade: '' }, attempts: [] };
    byStudent[a.student_id].attempts.push(a);
  });
  const header = ['student_id', 'display_name', 'grade', 'total_attempts', 'correct_count', 'accuracy', 'avg_response_time_seconds', 'first_attempt_accuracy', 'review_accuracy', 'weak_skill_count', 'word_bottleneck_count', 'recent_7_day_attempts'];
  const rows = Object.keys(byStudent).sort().map(function(id) {
    const item = byStudent[id];
    const list = item.attempts;
    const total = list.length;
    const correct = list.filter(function(a) { return toBool_(a.correct); }).length;
    const avgSecs = total ? list.reduce(function(sum, a) { return sum + Number(a.response_time_ms || 0); }, 0) / total / 1000 : '';
    const firsts = list.filter(function(a) { return Number(a.attempt_index) === 1; });
    const reviews = list.filter(function(a) { return toBool_(a.is_review); });
    const recent = list.filter(function(a) { return new Date(a.timestamp).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000; });
    const weakCount = countWeakSkills_(ss, id);
    const wordCount = countWordBottlenecks_(ss, id);
    return [id, item.student.display_name || '', item.student.grade || '', total, correct, total ? correct / total : '', avgSecs, firsts.length ? firsts.filter(function(a) { return toBool_(a.correct); }).length / firsts.length : '', reviews.length ? reviews.filter(function(a) { return toBool_(a.correct); }).length / reviews.length : '', weakCount, wordCount, recent.length];
  });
  sheet.getRange(5, 1, 1, header.length).setValues([header]);
  if (rows.length) sheet.getRange(6, 1, rows.length, header.length).setValues(rows);
  sheet.getRange('A' + (8 + rows.length)).setValue('閱讀方式');
  sheet.getRange('A' + (9 + rows.length)).setValue('弱項請查看 SkillStats；瓶頸生字／詞彙請查看 WordStats；逐題紀錄請查看 Attempts；每次答題後可由遊戲端或「星墜答問」選單更新報表。');
  sheet.setFrozenRows(5);
  sheet.autoResizeColumns(1, header.length);
  sheet.getRange('A1:B2').setFontWeight('bold');
}

function getReportData_(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentId = params && params.student_id ? String(params.student_id) : '';
  const filterRows = function(sheetName) {
    const rows = sheetObjects_(ss.getSheetByName(sheetName));
    return studentId ? rows.filter(function(r) { return r.student_id === studentId; }) : rows;
  };
  return { ok: true, student_id: studentId || null, question_stats: filterRows(SHEETS.QUESTION_STATS), word_stats: filterRows(SHEETS.WORD_STATS), skill_stats: filterRows(SHEETS.SKILL_STATS) };
}

function createDemoAttempts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const students = sheetObjects_(ss.getSheetByName(SHEETS.STUDENTS));
  const questions = sheetObjects_(ss.getSheetByName(SHEETS.QUESTIONS)).filter(function(q) { return String(q.enabled).toUpperCase() !== 'FALSE'; });
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
  [SHEETS.QUESTION_STATS, SHEETS.WORD_STATS, SHEETS.SKILL_STATS, SHEETS.PARENT_DASHBOARD, SHEETS.ACTIVITY_LOG].forEach(function(name) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });
  const logSheet = ss.getSheetByName(SHEETS.ACTIVITY_LOG);
  if (!getHeaders_(logSheet).length) logSheet.getRange(1, 1, 1, 3).setValues([['timestamp', 'event_type', 'message']]);
  logSheet.setFrozenRows(1);
}

function findQuestion_(ss, questionId) {
  const rows = sheetObjects_(ss.getSheetByName(SHEETS.QUESTIONS));
  return rows.find(function(row) { return String(row.question_id) === String(questionId); }) || null;
}

function countAttempts_(ss, studentId, questionId) {
  return sheetObjects_(ss.getSheetByName(SHEETS.ATTEMPTS)).filter(function(row) {
    return String(row.student_id) === String(studentId) && String(row.question_id) === String(questionId);
  }).length;
}

function updateQuestionProgress_(ss, attempt) {
  // 原始作答紀錄保留在 Attempts；統計由 refreshReports 從原始資料重建，避免資料不一致。
}

function countWeakSkills_(ss, studentId) {
  const rows = sheetObjects_(ss.getSheetByName(SHEETS.SKILL_STATS));
  return rows.filter(function(r) { return r.student_id === studentId && String(r.diagnosis).indexOf('弱項') !== -1; }).length;
}

function countWordBottlenecks_(ss, studentId) {
  const rows = sheetObjects_(ss.getSheetByName(SHEETS.WORD_STATS));
  return rows.filter(function(r) { return r.student_id === studentId && (String(r.diagnosis).indexOf('偏低') !== -1 || String(r.diagnosis).indexOf('偏慢') !== -1); }).length;
}

function masteryStatus_(total, correct, wrong, list, settings) {
  if (!total) return '新題';
  const required = Number(settings.mastery_correct_streak || 4);
  let streak = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (toBool_(list[i].correct)) streak++;
    else break;
  }
  if (streak >= required) return '熟練';
  if (wrong && list.length && !toBool_(list[list.length - 1].correct)) return '待複習';
  if (total >= 3 && correct / total < Number(settings.weak_accuracy_threshold || 0.65)) return '弱點';
  return '學習中';
}

function settingsObject_(ss) {
  const result = {};
  sheetObjects_(ss.getSheetByName(SHEETS.SETTINGS)).forEach(function(row) {
    if (row.setting_key) result[row.setting_key] = coerceValue_(row.setting_value);
  });
  return result;
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.ACTIVITY_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.ACTIVITY_LOG);
    sheet.getRange(1, 1, 1, 3).setValues([['timestamp', 'event_type', 'message']]);
  }
  sheet.appendRow([new Date(), eventType, message]);
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
