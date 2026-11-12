// A realistic history for the Stats specs: `days` days of Road to 60 sessions with per-question data (warm-up,
// Foundations ×2, two focus drills ×3, Speed ×4, benchmark ×2), getting faster over time, plus a Squares round and a
// matrix round now and then. Deterministic (fixed seed), dated back from `now`.
const G = require('../../js/generator.js');
const C = require('../../js/coach.js');

function richHistory(now, days) {
  days = days || 14;
  const rng = G.mulberry32(2026), out = [];
  let n = 0;
  // Seconds per answer by category, slower the further back; × big and − from 100 stay slow (they cost the most).
  const base = { 'add-nocarry': 1.4, 'sub-noborrow': 1.5, 'add-carry': 1.9, 'sub-borrow': 2.2, 'sub-cross100': 3.2, 'mul-table': 1.0, 'div-table': 1.1, 'comp-100': 1.3, 'comp-ten': 1.2 };
  const secs = (q, ago) => {
    const k = G.classify(q) || 'x', big = /-big-(\d+)$/.exec(k);
    const s = big ? 2.4 + (+big[1] >= 6 ? +big[1] / 5 : 0) : base[k] || 2;
    return Math.round((s * (1 + ago / 40) * (0.7 + rng() * 0.6)) * 1000);
  };
  function round(mode, at, settings, gen, extra, ago) {
    const dur = (settings.duration || 60) * 1000, qs = [];
    let t = 0;
    while (true) {
      const q = gen.next(), ms = secs(q, ago);
      if (t + ms > dur) { qs.push(Object.assign({}, q, { timeMs: dur - t, wrongAttempts: 0, unanswered: true })); break; }
      t += ms;
      qs.push(Object.assign({}, q, { timeMs: ms, wrongAttempts: rng() < 0.07 ? 1 : 0 }));
    }
    out.push(Object.assign({ id: 'h' + (n++), startedAt: at.toISOString(), mode, settings, score: qs.filter((q) => !q.unanswered).length, questions: qs }, extra));
  }
  for (let ago = days; ago >= 1; ago--) {
    if (ago % 5 === 3) continue;   // a day off now and then
    const d = new Date(now); d.setDate(d.getDate() - ago); d.setHours(18, 0, 0, 0);
    let min = 0;
    const at = () => new Date(d.getTime() + (min += 3) * 60000);
    const tag = (block) => ({ coach: { block, test: false } });
    const std = (mode, block) => { const s = G.modeSettings(mode); round(mode, at(), s, G.makeGenerator(s, rng), tag(block), ago); };
    std('TABLES', 1); std('P2', 2); std('P2', 2);
    for (let i = 0; i < 3; i++) round('R60', at(), { duration: 60, drill: 'cross' }, G.makeDrillGenerator('cross', 0, rng), tag(3), ago);
    for (let i = 0; i < 3; i++) round('R60', at(), { duration: 60, drill: 'mult', n: [8, 7, 9] }, G.makeDrillGenerator('mult', [8, 7, 9], rng), tag(4), ago);
    for (let i = 0; i < 4; i++) std('P3', 5);
    std('NORMAL120', 6); std('NORMAL120', 6);
    if (ago % 4 === 0) { const s = G.modeSettings('SQUARES'); round('SQUARES', at(), s, G.makeGenerator(s, rng), {}, ago); }
    if (ago % 6 === 0) {
      const s = { lo: -9, hi: 9, duration: 60 };
      round('MATRIX', at(), s, G.makeMatrixGenerator(s, rng), {}, ago);
    }
  }
  return out;
}

module.exports = { richHistory, C };
