const fs = require('fs');
const path = require('path');

const apiUrl = 'https://script.google.com/macros/s/AKfycbya45DjgtDBPxYlnc1YWa6cWk6iqoRcjOXTLGA5P_gQ7oW542-obQHPuScCHtVyVJ2y/exec';

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) val = val.join('|');
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function exportBank() {
  console.log('Fetching questions from Google Apps Script Web App...');
  const res = await fetch(apiUrl + '?action=questions', { redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (!data.ok || !Array.isArray(data.questions)) {
    throw new Error('Failed to load questions: ' + JSON.stringify(data));
  }
  console.log('Successfully fetched ' + data.questions.length + ' questions.');

  const headers = [
    'question_id', 'enabled', 'grade', 'subject', 'unit', 'skill',
    'question_type', 'difficulty', 'question', 'option_a', 'option_b',
    'option_c', 'option_d', 'answer', 'explanation_short',
    'explanation_detail', 'memory_tip', 'target_words', 'concept_tags',
    'error_pattern', 'next_step', 'source_type', 'review_priority'
  ];

  const lines = [headers.join(',')];

  data.questions.forEach(q => {
    const opts = Array.isArray(q.options) ? q.options : [q.option_a, q.option_b, q.option_c, q.option_d];
    const row = [
      q.question_id || '',
      'TRUE',
      q.grade || '',
      q.subject || '國語文',
      q.unit || '',
      q.skill || '',
      q.question_type || 'multiple_choice',
      q.difficulty || 1,
      q.question || '',
      opts[0] || '',
      opts[1] || '',
      opts[2] || '',
      opts[3] || '',
      q.answer || 'A',
      q.explanation_short || '',
      q.explanation_detail || '',
      q.memory_tip || '',
      q.target_words || [],
      q.concept_tags || [],
      q.error_pattern || '',
      q.next_step || '',
      q.source_type || 'google_sheet',
      q.review_priority || 1
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  });

  const targetPath = path.join(__dirname, '..', 'data', 'default-question-bank.csv');
  const content = lines.join('\n');
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('Saved to ' + targetPath);
  console.log('Total lines: ' + lines.length + ' (Header + ' + (lines.length - 1) + ' questions)');
  console.log('File size: ' + Buffer.byteLength(content, 'utf8') + ' bytes');
}

exportBank().catch(err => {
  console.error('Export error:', err);
  process.exit(1);
});
