const test = require('node:test');
const assert = require('node:assert');
const G = require('../js/generator.js');
const S = require('../js/stats.js');

// Helper: a round at local day `day` (YYYY-MM-DD), hour h.
function round(mode, day, score, questions, h = 12, extra = {}) {
  const [y, m, d] = day.split('-').map(Number);
  return { id: Math.random().toString(36).slice(2), startedAt: new Date(y, m - 1, d, h, 0, 0).toISOString(), mode, score, questions: questions || [], settings: {}, ...extra };
}
function q(op, a, b, timeMs, wrongAttempts = 0) { return { ...G.makeQuestion(op, a, b), timeMs, wrongAttempts }; }

test('median, weighted median, stdev, slope', () => {
  assert.strictEqual(S.median([3, 1, 2]), 2);
  assert.strictEqual(S.median([4, 1, 2, 3]), 2.5);
  assert.strictEqual(S.weightedMedian([1, 2, 3], [1, 1, 1]), 2);
  assert.strictEqual(S.weightedMedian([1, 10], [0.5, 1]), 10);
  assert.ok(Math.abs(S.stdev([2, 4, 4, 4, 5, 5, 7, 9]) - 2.138) < 0.001);
  assert.strictEqual(S.slope([1, 2, 3, 4]), 1);
});

test('sessions group by local day and number globally', () => {
  const rs = [
    round('P2', '2026-10-01', 15, [], 9), round('P2', '2026-10-01', 17, [], 10),
    round('TABLES', '2026-10-02', 30), round('P2', '2026-10-03', 20),
    round('EXTERNAL', '2026-10-03', 19, [], 13, { linkedMode: 'P2' })
  ];
  const ss = S.sessionsForMode(rs, 'P2');
  assert.deepStrictEqual(ss.map(s => s.number), [1, 3]);
  assert.deepStrictEqual(ss[0].scores, [15, 17]);
  assert.deepStrictEqual(ss[1].scores, [20, 19]);
  assert.strictEqual(ss[0].stats.avg, 16);
  assert.strictEqual(ss[0].stats.first, 15);
  assert.strictEqual(S.sessionNumber(rs, '2026-10-04'), 4);
});

test('freeze detection flags > 3x median', () => {
  const r = round('P2', '2026-10-01', 5, [q('mul', 3, 4, 1000), q('mul', 5, 6, 1100), q('div', 7, 91, 12032), q('mul', 2, 9, 900), q('mul', 4, 4, 1000)]);
  const f = S.freezes(r);
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].q.shown, '637 ÷ 7');
  assert.match(f[0].advice, /630 ÷ 7 = 90/);
  assert.strictEqual(S.slowest(r, 2)[0].shown, '637 ÷ 7');
});

test('fatigue', () => {
  assert.strictEqual(S.fatigue([20, 20, 20, 19, 16, 16]), null); // 19 > 17
  assert.ok(S.fatigue([20, 20, 20, 17, 16, 15]));
  assert.strictEqual(S.fatigue([20, 20, 20, 15, 15]), null); // too few rounds
});

// Sessions as sessionsForMode gives them: { number (the chart's x), stats: { avg } }.
const sess = (xs, ys) => xs.map((number, i) => ({ number, stats: { avg: ys[i] } }));

test('slope on uneven spacing regresses on the session number, not the point index', () => {
  const xs = [2, 12, 15, 16], ys = [25.8, 36.2, 37.4, 37.8];
  assert.ok(Math.abs(S.slope(ys, xs) - 0.88) < 0.01, String(S.slope(ys, xs)));
  assert.ok(S.slope(ys) > 3.5);   // what the index gave: +3.7
  const f = S.fit(ys, xs);
  assert.ok(f.se > 0 && f.se < 0.2);
  assert.strictEqual(S.fit([1, 2], [3, 3]), null);   // no spread in x
});

test('trend: last 14 sessions, at least 4 spanning 7 days, else not enough data', () => {
  // the example above: only 12, 15, 16 are within 14 of 16
  let t = S.trend(sess([2, 12, 15, 16], [25.8, 36.2, 37.4, 37.8]), 60);
  assert.strictEqual(t.ok, false);
  assert.strictEqual(t.n, 3);
  assert.strictEqual(t.slope, null);
  assert.strictEqual(t.projection, null);
  // 4 sessions but only 5 days apart (10–14): not enough
  assert.strictEqual(S.trend(sess([10, 11, 13, 14], [30, 31, 32, 33]), 60).ok, false);
  // 4 sessions spanning 7 days (8–14): enough; slope per session on the numbers
  t = S.trend(sess([8, 10, 12, 14], [30, 31, 32, 33]), 60);
  assert.strictEqual(t.ok, true);
  assert.strictEqual(t.slope, 0.5);
  assert.deepStrictEqual([t.first, t.last, t.n], [8, 14, 4]);
  // the window is anchored on the latest session overall: no recent days of this mode → not enough data
  assert.strictEqual(S.trend(sess([8, 10, 12, 14], [30, 31, 32, 33]), 60, 30).ok, false);
});

test('projection: a range from slope ± 1 SE, plateau when flat, uncertain or far', () => {
  // steady +1 a session with a little noise: a short range around 10 sessions
  let t = S.trend(sess([1, 3, 5, 7, 9, 11, 13, 14], [20, 22.3, 23.8, 26.2, 28, 29.9, 32.1, 33]), 43);
  assert.strictEqual(t.projection.state, 'range');
  assert.ok(t.projection.low <= 10 && t.projection.high >= 10 && t.projection.low < t.projection.high, JSON.stringify(t.projection));
  const P = require('../js/progression.js');
  assert.match(P.projectionText(t), /^About \d+–\d+ practice days at the current pace$/);
  // slope 0.2 or less: plateau
  t = S.trend(sess([1, 4, 7, 10], [30, 30.5, 30.9, 31.5]), 60);
  assert.ok(t.slope <= 0.2);
  assert.strictEqual(t.projection.state, 'plateau');
  assert.strictEqual(P.projectionText(t), 'Plateau — no projection');
  // noisy: slope − 1 SE ≤ 0
  assert.strictEqual(S.trend(sess([1, 4, 7, 10], [30, 40, 25, 38]), 60).projection.state, 'plateau');
  // clear but slow: the slow end needs more than 90 sessions
  assert.strictEqual(S.trend(sess([1, 4, 7, 10], [20, 21, 22.1, 23]), 60).projection.state, 'plateau');
  // already there
  assert.strictEqual(S.trend(sess([1, 4, 7, 10], [20, 21, 22, 23]), 22).projection.state, 'reached');
  assert.strictEqual(S.trend(sess([1, 2], [1, 2]), 5).ok, false);
});

test('weak facts: slow fact is weak, fast facts are not', () => {
  const now = new Date(2026, 9, 3, 20).getTime();
  const qs = [];
  for (let i = 0; i < 30; i++) qs.push(q('mul', 2 + (i % 5), 3, 1000)); // fast tables
  for (let i = 0; i < 4; i++) qs.push(q('mul', 8, 9, 2500));            // slow 8×9
  const rs = [round('P2', '2026-10-01', 30, qs)];
  const fs = S.factStats(rs, now);
  const f89 = fs.find(f => f.key === '8x9');
  assert.strictEqual(f89.status, 'weak');
  assert.strictEqual(f89.attempts, 4);
  assert.ok(f89.slowness >= 2.4);
  assert.strictEqual(fs.find(f => f.key === '2x3').status, 'ok');
  const targets = S.drillTargets(fs);
  assert.strictEqual(targets[0].key, '8x9');
  const lines = S.weakLines(targets);
  assert.strictEqual(lines[0].label, '72 = 6×12 = 8×9');
  const pool = S.drillPool(targets);
  assert.ok(pool.some(p => p.key === '6x12'), 'family member added');
});

test('a single stall (> 3× my op median) in the last 2 sessions makes a fact weak, and says so', () => {
  const qs = [];
  for (let i = 0; i < 20; i++) qs.push(q('div', 7, 10 + i, 1500));
  qs.push(q('div', 7, 91, 6000));
  const fs = S.factStats([round('P2', '2026-10-01', 21, qs)], new Date(2026, 9, 1, 20).getTime());
  const f = fs.find(f => f.key === '7x91');
  assert.strictEqual(f.status, 'weak');
  assert.strictEqual(f.froze, true);
  assert.strictEqual(fs.find(f => f.key === '7x90s').status, 'weak');
  assert.strictEqual(fs.find(f => f.key === '7x10').froze, false);
});

test('the stall bar follows my pace, not a fixed 4 s', () => {
  const now = new Date(2026, 9, 1, 20).getTime();
  // Slow player (median 2 s): 4.5 s is only 2.25× usual, not a stall.
  const slow = [];
  for (let i = 0; i < 20; i++) slow.push(q('mul', 3, 2 + (i % 10), 2000));
  slow.push(q('mul', 7, 8, 4500));
  assert.strictEqual(S.factStats([round('TABLES', '2026-10-01', 21, slow)], now).find(f => f.key === '7x8').status, 'ok');
  // Fast player (median 0.8 s): 3 s is a stall even though it is under 4 s.
  const fast = [];
  for (let i = 0; i < 20; i++) fast.push(q('mul', 3, 2 + (i % 10), 800));
  fast.push(q('mul', 7, 8, 3000));
  assert.strictEqual(S.factStats([round('TABLES', '2026-10-01', 21, fast)], now).find(f => f.key === '7x8').status, 'weak');
});

test('weak fact → improving → mastered after 3 good sessions', () => {
  const filler = () => { const a = []; for (let i = 0; i < 20; i++) a.push(q('mul', 3, 2 + (i % 10), 1500)); return a; };
  const rs = [round('P2', '2026-10-01', 20, [...filler(), q('mul', 8, 9, 5000), q('mul', 9, 8, 4500), q('div', 8, 9, 4800)])];
  const now = new Date(2026, 9, 10).getTime();
  assert.strictEqual(S.factStats(rs, now).find(f => f.key === '8x9').status, 'weak');
  rs.push(round('P2', '2026-10-02', 20, [...filler(), q('mul', 8, 9, 1000)]));
  assert.strictEqual(S.factStats(rs, now).find(f => f.key === '8x9').status, 'improving');
  rs.push(round('P2', '2026-10-03', 20, [...filler(), q('mul', 8, 9, 1000)]));
  rs.push(round('P2', '2026-10-04', 20, [...filler(), q('div', 9, 8, 1100)]));
  assert.strictEqual(S.factStats(rs, now).find(f => f.key === '8x9').status, 'mastered');
});

test('time decay: attempts older than 21 days count half', () => {
  const now = new Date(2026, 9, 30).getTime();
  const rs = [
    round('P2', '2026-10-01', 1, [q('mul', 8, 9, 9000)]),           // old, weight 0.5
    round('P2', '2026-10-29', 1, [q('mul', 8, 9, 1000)])            // recent, weight 1
  ];
  assert.strictEqual(S.factStats(rs, now).find(f => f.key === '8x9').medianTime, 1000);
});

test('mistakes: wrong or stalled (> 3× my op median) in last 3 sessions', () => {
  const filler = (ms) => { const a = []; for (let i = 0; i < 10; i++) a.push(q('mul', 3, 2 + (i % 10), ms)); return a; };
  const rs = [
    round('P2', '2026-10-01', 1, [...filler(1000), q('mul', 2, 2, 5000)]),   // stalled, but too long ago
    round('P2', '2026-10-02', 1, [...filler(1000), q('mul', 3, 3, 1000, 1)]),
    round('P2', '2026-10-03', 1, [...filler(1000), q('mul', 4, 4, 2500)]),   // slow, not a stall
    round('P2', '2026-10-04', 1, [...filler(1000), q('mul', 5, 5, 3500)])    // under 4 s, still a stall
  ];
  assert.deepStrictEqual(S.mistakes(rs).map(x => x.shown), ['3 × 3', '5 × 5']);
});

test('round index averages: 2 days or more per round number, rounds 12 and later in one 12+ bucket', () => {
  const rs = [round('P2', '2026-10-01', 10, [], 9), round('P2', '2026-10-01', 14, [], 10), round('P2', '2026-10-02', 12, [], 9)];
  // round 2 was played on one day only: left out
  assert.deepStrictEqual(S.roundIndexAverages(rs, 'P2').map(x => [x.idx, x.label, x.avg, x.n, x.days]), [[1, '1', 11, 2, 2]]);
  // two days of 15 rounds: rounds 12–15 of both days share the 12+ bucket
  const long = [];
  ['2026-10-03', '2026-10-04'].forEach((d) => { for (let i = 0; i < 15; i++) long.push(round('P3', d, 20 + i, [], 6 + Math.floor(i / 2), { startedAt: undefined })); });
  long.forEach((r, i) => { const [y, m, dd] = (i < 15 ? '2026-10-03' : '2026-10-04').split('-').map(Number); r.startedAt = new Date(y, m - 1, dd, 6, i % 15).toISOString(); });
  const c = S.roundIndexAverages(long, 'P3');
  assert.strictEqual(c.length, 12);
  assert.deepStrictEqual(c[11], { idx: 12, label: '12+', avg: (31 + 32 + 33 + 34) / 4, n: 8, days: 2 });
});

test('tableCells keeps × and each ÷ direction apart', () => {
  const rs = [round('TABLES', '2026-10-01', 4, [
    q('mul', 7, 8, 1000), q('mul', 8, 7, 1200),   // same × cell
    q('div', 7, 8, 3000),                          // 56 ÷ 7 = 8
    q('div', 8, 7, 1500, 1),                       // 56 ÷ 8 = 7, one wrong attempt
    q('div', 7, 91, 9000)                          // 637 ÷ 7: not a tables fact
  ])];
  const c = S.tableCells(rs, new Date(2026, 9, 1, 20).getTime());
  assert.deepStrictEqual(Object.keys(c.mul), ['7x8']);
  assert.strictEqual(c.mul['7x8'].attempts, 2);
  assert.strictEqual(c.mul['7x8'].medianTime, 1100);
  assert.deepStrictEqual(Object.keys(c.div).sort(), ['7/8', '8/7']);
  assert.strictEqual(c.div['7/8'].medianTime, 3000);
  assert.strictEqual(c.div['8/7'].wrongRate, 1);
});

test('tableWeights: empty history → 242 equal items, 50% × and 50% ÷', () => {
  const w = S.tableWeights({ mul: {}, div: {} });
  assert.strictEqual(w.length, 242);
  assert.ok(w.every(x => x.weight === w[0].weight));
  const mulShare = w.filter(x => x.q.op === 'mul').reduce((a, x) => a + x.share, 0);
  assert.ok(Math.abs(mulShare - 50) < 1e-9);
});

test('tableWeights: a slow division is weighted on its own', () => {
  const qs = [];
  for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) { qs.push(q('mul', a, b, 1000)); qs.push(q('div', a, b, 1000)); }
  qs.push(q('div', 7, 8, 2000), q('div', 7, 8, 2000)); // 56 ÷ 7 now has median 2000
  const cells = S.tableCells([round('TABLES', '2026-10-01', 1, qs)], new Date(2026, 9, 1, 20).getTime());
  const w = Object.fromEntries(S.tableWeights(cells).map(x => [x.q.op + x.q.a + '/' + x.q.b, x]));
  assert.ok(Math.abs(w['div7/8'].weight - 4) < 1e-9, 'twice the reference time → weight 4');
  assert.strictEqual(w['div8/7'].weight, 1, 'the other direction stays normal');
  assert.strictEqual(w['mul7/8'].weight, 1, '7×8 itself stays normal');
  const all = Object.values(w);
  assert.ok(all.every(x => x.weight >= 0.25 && x.weight <= 6));
  assert.ok(Math.abs(all.reduce((a, x) => a + x.share, 0) - 100) < 1e-9);
});

test('sessionReport: scores per mode with previous averages', () => {
  const rs = [
    round('P2', '2026-10-01', 14, [], 9), round('P2', '2026-10-01', 16, [], 10),
    round('P2', '2026-10-02', 18, [], 9),
    round('P2', '2026-10-03', 20, [], 9), round('TABLES', '2026-10-03', 30, [], 8), round('P2', '2026-10-03', 22, [], 10)
  ];
  const rep = S.sessionReport(rs, '2026-10-03');
  assert.strictEqual(rep.number, 3);
  assert.strictEqual(rep.prevDay, '2026-10-02');
  assert.strictEqual(rep.nextDay, null);
  assert.deepStrictEqual(rep.scores.map(s => s.mode), ['TABLES', 'P2']);
  const p2 = rep.scores[1];
  assert.deepStrictEqual(p2.scores, [20, 22]);
  assert.strictEqual(p2.lastAvg, 18);
  assert.strictEqual(p2.prevAvg, 16.5); // mean of 15 and 18
  assert.strictEqual(p2.threshold, 18);
});

test('sessionReport: pace thirds follow when answers landed', () => {
  const qs = [];
  for (let i = 0; i < 10; i++) qs.push(q('mul', 3, 4 + i, 1000));   // 0–10 s: first third
  qs.push(q('mul', 7, 8, 15000), q('mul', 6, 9, 15000));            // land at 25 s and 40 s
  qs.push({ ...q('div', 7, 91, 9000), unanswered: true });           // ends at 49 s, not counted
  const rep = S.sessionReport([round('P2', '2026-10-01', 12, qs, 9, { settings: { duration: 60 } })], '2026-10-01');
  const p = rep.pace[0];
  assert.deepStrictEqual(p.thirds.map(t => t.answers), [10, 1, 1]);
  assert.strictEqual(p.thirds[0].median, 1000);
  assert.strictEqual(p.thirds[2].median, 15000);
  assert.ok(p.change > 10);
});

test('sessionReport: mistakes grouped, ops and moved facts compared with before', () => {
  const fast = [], before = [];
  for (let i = 0; i < 20; i++) fast.push(q('mul', 2, 3 + (i % 5), 1000));
  for (let i = 0; i < 3; i++) before.push(q('mul', 7, 8, 1000), q('mul', 6, 9, 3000));
  const rs = [
    round('P2', '2026-10-01', 26, [...fast, ...before]),
    round('P2', '2026-10-02', 25, [...fast, q('mul', 7, 8, 2500, 1), q('mul', 7, 8, 2600), q('mul', 6, 9, 1000), q('mul', 6, 9, 1100), q('div', 7, 91, 12000, 2)], 9),
    round('P2', '2026-10-02', 21, [...fast, q('div', 7, 91, 11000, 1)], 10)
  ];
  const rep = S.sessionReport(rs, '2026-10-02');
  assert.strictEqual(rep.mistakes[0].q.shown, '637 ÷ 7');
  assert.strictEqual(rep.mistakes[0].seen, 2);
  assert.strictEqual(rep.mistakes[0].wrong, 3);
  assert.strictEqual(rep.mistakes[0].freezes, 2);
  assert.match(rep.mistakes[0].advice, /630 ÷ 7/);
  const mul = rep.ops.find(o => o.op === 'mul');
  assert.strictEqual(mul.n, 44);
  assert.strictEqual(mul.usualN, 26);
  assert.ok(rep.slower.some(f => f.key === '7x8'), '7×8 slower today');
  assert.ok(rep.faster.some(f => f.key === '6x9'), '6×9 faster today');
});

test('sessionReport: zetamac.com-only day has scores but no pace or mistakes', () => {
  const rs = [round('EXTERNAL', '2026-10-01', 28, [], 9, { linkedMode: 'NORMAL120' }), round('EXTERNAL', '2026-10-01', 24, [], 10, { linkedMode: 'NORMAL120' })];
  const rep = S.sessionReport(rs, '2026-10-01');
  assert.strictEqual(rep.scores[0].mode, 'NORMAL120');
  assert.strictEqual(rep.scores[0].external, 2);
  assert.deepStrictEqual([rep.pace.length, rep.mistakes.length, rep.ops.length], [0, 0, 0]);
  assert.strictEqual(rep.median, null);
});

// A 60 s P2 round: `n` fast multiplications, then the given extra questions.
function p2Round(day, score, extra, n = 10, h = 12) {
  const qs = [];
  for (let i = 0; i < n; i++) qs.push(q('mul', 3, 4 + i, 1000));
  return round('P2', day, score, qs.concat(extra || []), h, { settings: { duration: 60 } });
}

test('roundReport: summary numbers, buckets, pace and rank', () => {
  const earlier = [p2Round('2026-10-01', 15), p2Round('2026-10-01', 18, [], 10, 13)];
  const r = p2Round('2026-10-02', 20, [q('mul', 7, 8, 2500, 1), q('div', 7, 91, 15000), q('mul', 6, 9, 15000), { ...q('mul', 9, 9, 5000), unanswered: true }]);
  const rep = S.roundReport([...earlier, r], r);
  assert.strictEqual(rep.answered, 13);
  assert.strictEqual(rep.wrongAttempts, 1);
  assert.strictEqual(rep.firstTry, 12 / 13);
  assert.strictEqual(rep.buckets.reduce((a, b) => a + b, 0), 13);
  assert.deepStrictEqual(rep.buckets, [0, 10, 1, 0, 2]);
  assert.strictEqual(rep.series.length, 13);
  assert.strictEqual(rep.series.filter(x => x.frozen).length, 2);
  assert.deepStrictEqual(rep.pace.thirds.map(t => t.answers), [11, 1, 1]);
  assert.ok(rep.pace.change > 1);
  assert.deepStrictEqual(rep.rank, { place: 1, of: 3, best: true, tied: false, bestToday: false });
  assert.strictEqual(rep.avg7, 16.5);
  assert.strictEqual(rep.vsThreshold, 2);
  assert.strictEqual(rep.usualMedian, 1000);
  assert.match(rep.takeaways[0], /personal best.*2 above/);
  assert.match(rep.takeaways[1], /2 above the step threshold of 18/);
  assert.ok(rep.takeaways.length <= 3);
});

test('roundReport: the op that cost the most time and facts slower than usual', () => {
  const div = n => Array.from({ length: n }, () => q('div', 7, 8, 1000));
  const earlier = [p2Round('2026-10-01', 22, div(5)), p2Round('2026-10-01', 23, div(5), 10, 13)];
  const r = p2Round('2026-10-01', 21, Array.from({ length: 5 }, () => q('div', 7, 8, 2500)), 10, 14);
  const rep = S.roundReport([...earlier, r], r);
  const d = rep.ops.find(o => o.op === 'div');
  assert.strictEqual(d.n, 5);
  assert.strictEqual(d.usualMedian, 1000);
  assert.strictEqual(d.cost, 7500);
  assert.strictEqual(rep.rank.place, 3);
  assert.ok(rep.takeaways.some(t => /^Division cost you about 8 s more than usual: 2\.5 s median against 1\.0 s\.$/.test(t)));
  assert.ok(rep.slower.some(f => f.key === '7x8'));
  assert.deepStrictEqual(rep.faster, []);
});

test('roundReport: a first round and a round with no answers do not throw', () => {
  const first = p2Round('2026-10-01', 10);
  assert.match(S.roundReport([first], first).takeaways[0], /first round in this mode/);
  const empty = round('P3', '2026-10-01', 0, [{ ...q('add', 2, 3, 60000), unanswered: true }], 12, { settings: { duration: 60 } });
  const rep = S.roundReport([empty], empty);
  assert.strictEqual(rep.answered, 0);
  assert.strictEqual(rep.median, null);
  assert.strictEqual(rep.firstTry, null);
  assert.strictEqual(rep.pace, null);
  assert.deepStrictEqual(rep.ops, []);
});

test('trick questions count as facts but stay out of Zetamac drills, mistakes and per-op times', () => {
  const tq = (type, a, b, timeMs, wrongAttempts = 0) => ({ ...G.makeTrick(type, a, b), timeMs, wrongAttempts });
  const rs = [];
  for (let d = 1; d <= 3; d++) {
    rs.push(round('SQUARES', `2026-10-0${d}`, 10, [tq('sq50', 47, undefined, 9000, 1), tq('sq5', 35, undefined, 1500), tq('sq5', 45, undefined, 1600), tq('sq5', 55, undefined, 1400)]));
  }
  rs.push(round('P2', '2026-10-03', 20, [q('mul', 7, 8, 1200), q('mul', 6, 9, 1100)]));
  const fs = S.factStats(rs, new Date(2026, 9, 3, 20).getTime());
  const sq50 = fs.find((f) => f.key === 'tr-sq50');
  assert.strictEqual(sq50.cat, 'tr');
  assert.strictEqual(sq50.status, 'weak');                       // slow against your trick median, and often wrong
  assert.ok(S.drillTargets(fs).every((f) => f.cat !== 'tr'));     // the weak-fact drill stays Zetamac
  assert.ok(S.mistakes(rs).every((x) => x.op !== 'tr'));
  const t = S.timeByOp(rs);                                       // used to crash on an unknown op
  assert.deepStrictEqual(Object.keys(t).sort(), ['add', 'div', 'mul', 'sub']);
  const rep = S.sessionReport(rs, '2026-10-03');
  assert.ok(rep.mistakes.some((m) => m.q.op === 'tr' && /Near 50/.test(m.advice)));
  assert.ok(S.roundReport(rs, rs[2]).takeaways.length);
});

test('a skipped trick counts as a miss for its fact, but not as an answer or a freeze', () => {
  const tq = (type, a, timeMs, extra = {}) => ({ ...G.makeTrick(type, a), timeMs, wrongAttempts: 0, ...extra });
  const qs = [tq('sq5', 35, 1500), tq('sq5', 45, 1600), tq('sq5', 55, 1400), tq('sq50', 47, 9000, { unanswered: true, skipped: true })];
  const r = round('SQUARES', '2026-10-01', 3, qs);
  const fs = S.factStats([r], new Date(2026, 9, 1, 20).getTime());
  const sq50 = fs.find(f => f.key === 'tr-sq50');
  assert.strictEqual(sq50.attempts, 1);
  assert.strictEqual(sq50.wrongRate, 1);
  const rep = S.roundReport([r], r);
  assert.strictEqual(rep.answered, 3);
  assert.strictEqual(rep.skipped, 1);
  assert.strictEqual(rep.freezes.length, 0);
  const day = S.sessionReport([r], '2026-10-01');
  assert.ok(day.mistakes.some(m => m.q.type === 'sq50' && m.wrong === 1));
});

test('time running out is still not an attempt', () => {
  const r = round('TABLES', '2026-10-01', 1, [q('mul', 2, 3, 900), { ...q('mul', 7, 8, 9000), unanswered: true }]);
  assert.ok(!S.factStats([r], new Date(2026, 9, 1, 20).getTime()).some(f => f.key === '7x8'));
});

test('fractions by heart: unseen pairs weigh most, a slow pair weighs more than a fast one', () => {
  const tq = (type, a, b, timeMs, wrongAttempts = 0) => ({ ...G.makeTrick(type, a, b), timeMs, wrongAttempts });
  const qs = [];
  for (const [n, d] of [[1, 2], [1, 4], [3, 4], [1, 5]]) qs.push(tq('fd', n, d, 1000), tq('df', n, d, 1100));
  qs.push(tq('fd', 3, 7, 4000), tq('df', 3, 7, 3500, 1));
  const cells = S.fractionCells([round('LEARN', '2026-10-01', 10, qs, 12, { settings: { types: ['fd', 'df'], lesson: 'fractions' } })]);
  assert.strictEqual(cells.length, 49);
  const at = (n, d) => cells.find((c) => c.n === n && c.d === d);
  assert.ok(at(3, 7).weight > at(1, 2).weight);
  assert.ok(at(3, 7).slow && !at(1, 2).slow);
  assert.strictEqual(at(5, 9).f, null);
  assert.strictEqual(at(5, 9).weight, Math.max(...cells.filter((c) => c.f).map((c) => c.weight)));
  const pool = S.fractionPool(cells);
  assert.strictEqual(pool.length, 98);
  assert.deepStrictEqual(pool.slice(0, 2).map((p) => p.q.type), ['fd', 'df']);
  assert.strictEqual(S.effMode({ mode: 'LEARN', settings: { types: ['fd', 'df'], lesson: 'fractions' } }), 'LEARN-fractions');
});

test('tableCoverage: × pairs once, ÷ directions apart, 2 answers to count, ready at 150 of 187', () => {
  const q = (op, a, b) => ({ op, a, b, timeMs: 1500, wrongAttempts: 0 });
  const day = new Date(2026, 9, 1, 10).toISOString();
  const rs = [{ id: 'x', startedAt: day, mode: 'TABLES', score: 1, settings: {},
    questions: [q('mul', 7, 8), q('mul', 8, 7), q('div', 7, 8), q('div', 8, 7), q('div', 3, 4), q('div', 3, 4), q('mul', 5, 6)] }];
  const c = S.tableCoverage(S.tableCells(rs, new Date(2026, 9, 1, 20).getTime()));
  assert.strictEqual(c.total, 187);
  assert.strictEqual(c.measured, 2);            // 7×8 (both orders) and 3/4; 7/8, 8/7 and 5×6 have one answer each
  assert.strictEqual(c.ready, false);
  const empty = S.tableCoverage({ mul: {}, div: {} });
  assert.deepStrictEqual([empty.measured, empty.total, empty.need, empty.ready], [0, 187, 150, false]);
});

// ---------- Stats levels: one definition per idea ----------

test('week windows: the last 7 calendar days and the 7 before, across a month end', () => {
  const w = S.weekWindows('2026-11-12');
  assert.deepStrictEqual([w.now[0], w.now[6], w.before[0], w.before[6]], ['2026-11-06', '2026-11-12', '2026-10-30', '2026-11-05']);
  assert.strictEqual(S.shiftDay('2026-03-02', -6), '2026-02-24');
  assert.strictEqual(S.dayDiff('2026-10-30', '2026-11-12'), 13);
});

test('arrow: a move beyond ±0.5, flat inside, none when a window is empty', () => {
  assert.deepStrictEqual(S.arrow(10, 9.4).dir, 'up');
  assert.deepStrictEqual(S.arrow(10, 9.5).dir, 'flat');
  assert.deepStrictEqual(S.arrow(9, 9.6).dir, 'down');
  assert.deepStrictEqual(S.arrow(null, 3), { diff: null, dir: null });
  assert.deepStrictEqual(S.arrow(3, undefined), { diff: null, dir: null });
  assert.strictEqual(S.arrow(0.84, 0.83, 0.005).dir, 'up');   // accuracy: half a percentage point
});

test('isWrong and accuracy: a wrong attempt, a wrong final answer or a skip; unanswered questions do not count', () => {
  assert.ok(S.isWrong({ wrongAttempts: 1 }) && S.isWrong({ correct: false }) && S.isWrong({ skipped: true }));
  assert.ok(!S.isWrong({ wrongAttempts: 0, correct: true }));
  const r = round('P3', '2026-10-01', 3, [q('add', 2, 3, 900), q('add', 4, 5, 900, 1), { op: 'iv', correct: false, timeMs: 3000 },
    { op: 'add', a: 1, b: 1, timeMs: 500, unanswered: true }]);
  assert.ok(Math.abs(S.accuracy([r]) - 1 / 3) < 1e-9);
  assert.strictEqual(S.accuracy([round('P3', '2026-10-01', 0)]), null);
});

test('activity and streak: 28 days; the streak ends today, or yesterday while today has no round', () => {
  const rs = ['2026-11-12', '2026-11-11', '2026-11-10', '2026-11-08'].map((d) => round('P3', d, 20));
  const a = S.activity(rs, '2026-11-12');
  assert.strictEqual(a.length, 28);
  assert.deepStrictEqual(a.slice(-5).map((x) => x.played), [true, false, true, true, true]);
  assert.strictEqual(S.streak(rs, '2026-11-12'), 3);
  assert.strictEqual(S.streak(rs.slice(1), '2026-11-12'), 2);   // nothing yet today: counts up to yesterday
  assert.strictEqual(S.streak(rs.slice(3), '2026-11-12'), 0);
});

test('time per operation is a median: per day (timeByOp) and over a window (opMedians)', () => {
  const rs = [round('P3', '2026-10-01', 3, [q('add', 2, 3, 1000), q('add', 4, 5, 1000), q('add', 6, 7, 4000), q('mul', 3, 4, 2000)]),
    round('P3', '2026-10-02', 1, [q('add', 2, 3, 3000)])];
  assert.strictEqual(S.timeByOp(rs).add[0].ms, 1000);   // a mean would say 2000
  const m = S.opMedians(rs, ['2026-10-01']);
  assert.strictEqual(m.add, 1000);
  assert.strictEqual(m.mul, 2000);
  assert.strictEqual(m.div, null);
});

test('sessionReport: rounds without + − × ÷ get median times from their own questions', () => {
  const tr = (t) => ({ op: 'tr', type: 'sq5', a: 35, shown: '35²', answer: 1225, timeMs: t, wrongAttempts: 0 });
  const rs = [round('SQUARES', '2026-10-01', 2, [tr(2000), tr(4000)]), round('SQUARES', '2026-10-02', 2, [tr(1000), tr(3000), tr(5000)])];
  const rep = S.sessionReport(rs, '2026-10-02');
  assert.strictEqual(rep.median, 3000);
  assert.strictEqual(rep.usualMedian, 3000);
});

test('roundReport asOf: a past round reads as it did then', () => {
  const a = round('P3', '2026-10-01', 30, [q('add', 2, 3, 900)]), b = round('P3', '2026-10-02', 40, [q('add', 2, 3, 900)]);
  const now = S.roundReport([a, b], a), then = S.roundReport([a, b], a, a.startedAt);
  assert.strictEqual(now.rank.of, 2);
  assert.strictEqual(then.rank.of, 1);
  assert.strictEqual(then.avg7, null);
});
