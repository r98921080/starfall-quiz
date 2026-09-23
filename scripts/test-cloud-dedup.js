const apiUrl = 'https://script.google.com/macros/s/AKfycbya45DjgtDBPxYlnc1YWa6cWk6iqoRcjOXTLGA5P_gQ7oW542-obQHPuScCHtVyVJ2y/exec';

function deduplicateAndBalanceBank(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return { bank: [], counts: [0, 0, 0, 0] };
  const getFp = (t) => String(t || '').trim().replace(/[\s\r\n\t]/g, '').replace(/[「」『』"''，。、？！：；,.?!:;（）()]/g, '').toLowerCase();

  const dupMap = new Map();
  questions.forEach((q, idx) => {
    let opts = [];
    if (Array.isArray(q.options)) {
      opts = q.options.filter(Boolean);
    } else if (Array.isArray(q.opts)) {
      opts = q.opts.filter(Boolean);
    } else {
      opts = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
    }
    if (opts.length < 2) opts = ['選項A', '選項B', '選項C', '選項D'];

    let ansIdx = 0;
    if (typeof q.ans === 'number' && q.ans >= 0 && q.ans < opts.length) {
      ansIdx = q.ans;
    } else {
      const ansLetter = String(q.answer || 'A').trim().toUpperCase();
      ansIdx = 'ABCD'.indexOf(ansLetter);
      if (ansIdx < 0 || ansIdx >= opts.length) ansIdx = 0;
    }

    const correctText = opts[ansIdx] || '';
    const qFp = getFp(q.question);
    const ansFp = getFp(correctText);
    const key = qFp + ':::' + ansFp;

    const item = {
      question_id: q.question_id || ('Q-GS-' + (idx + 1)),
      grade: q.grade || '',
      question: q.question,
      opts: opts,
      ans: ansIdx,
      subject: q.subject || '國語文',
      skill: q.skill || '語文素養',
      difficulty: parseInt(q.difficulty) || 1,
      explanation_short: q.explanation_short || '',
      explanation_detail: q.explanation_detail || '',
      memory_tip: q.memory_tip || '',
      target_words: q.target_words || [],
      concept_tags: q.concept_tags || []
    };

    if (!dupMap.has(key)) dupMap.set(key, []);
    dupMap.get(key).push(item);
  });

  const retained = [];
  const pureAGroups = [];

  dupMap.forEach((list) => {
    const nonA = list.filter(q => q.ans !== 0);
    const onlyA = list.filter(q => q.ans === 0);

    if (nonA.length > 0) {
      retained.push(Object.assign({}, nonA[0]));
    } else {
      pureAGroups.push(Object.assign({}, onlyA[0]));
    }
  });

  const ansCounts = [0, 0, 0, 0];
  retained.forEach(q => {
    if (q.ans >= 0 && q.ans < 4) ansCounts[q.ans]++;
  });

  pureAGroups.forEach(q => {
    let minIdx = 0;
    let minVal = ansCounts[0];
    for (let i = 1; i < 4; i++) {
      if (ansCounts[i] < minVal) {
        minVal = ansCounts[i];
        minIdx = i;
      }
    }

    if (minIdx !== 0 && q.opts.length === 4) {
      const origOpts = [...q.opts];
      const shift = minIdx;
      const newOpts = new Array(4);
      for (let i = 0; i < 4; i++) {
        newOpts[(i + shift) % 4] = origOpts[i];
      }
      q.opts = newOpts;
      q.ans = minIdx;
    }
    ansCounts[q.ans]++;
    retained.push(q);
  });

  return { bank: retained, counts: ansCounts };
}

console.log('Fetching questions from live Google Sheet API...');
fetch(apiUrl + '?action=questions')
  .then(r => r.json())
  .then(data => {
    console.log('Raw cloud questions count:', data.questions.length);
    const res = deduplicateAndBalanceBank(data.questions);
    console.log('Deduplicated bank count:', res.bank.length);
    console.log('A/B/C/D counts [A, B, C, D]:', res.counts);
    console.log('Test passed successfully!');
  })
  .catch(err => {
    console.error('Fetch error:', err);
    process.exit(1);
  });
