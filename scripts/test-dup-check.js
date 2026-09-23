const apiUrl = 'https://script.google.com/macros/s/AKfycbya45DjgtDBPxYlnc1YWa6cWk6iqoRcjOXTLGA5P_gQ7oW542-obQHPuScCHtVyVJ2y/exec';

function getFp(t) {
  return String(t || '').trim()
    .replace(/[\s\r\n\t]/g, '')
    .replace(/[「」『』""''，。、？！：；,.?!:;（）()]/g, '')
    .toLowerCase();
}

fetch(apiUrl + '?action=questions')
  .then(r => r.json())
  .then(data => {
    console.log('Total questions from cloud:', data.questions.length);
    const dupMap = new Map();
    data.questions.forEach((q, idx) => {
      let opts = Array.isArray(q.options) ? q.options.filter(Boolean) : [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
      if (opts.length < 2) opts = ['選項A', '選項B', '選項C', '選項D'];
      const ansLetter = String(q.answer || 'A').trim().toUpperCase();
      let ansIdx = 'ABCD'.indexOf(ansLetter);
      if (ansIdx < 0 || ansIdx >= opts.length) ansIdx = 0;
      const correctText = opts[ansIdx] || '';
      const key = `${getFp(q.question)}:::${getFp(correctText)}`;
      if (!dupMap.has(key)) dupMap.set(key, []);
      dupMap.get(key).push({ q, opts, ansIdx, ansLetter });
    });
    console.log('dupMap size:', dupMap.size);
    let sampleKeys = Array.from(dupMap.keys()).slice(0, 5);
    console.log('Sample keys:', sampleKeys);
  })
  .catch(console.error);
