const test = require('node:test');
const assert = require('node:assert');
const G = require('../js/generator.js');
const C = require('../js/coach.js');

const q = (op, a, b, timeMs, extra) => Object.assign({ op, a, b, timeMs: timeMs || 1500, wrongAttempts: 0 }, extra || {});
let id = 0;
// A round on `day` (YYYY-MM-DD) at `hour`.
function round(mode, day, questions, more) {
  const [y, m, d] = day.split('-').map(Number);
  return Object.assign({ id: 'c' + (id++), startedAt: new Date(y, m - 1, d, (more && more.hour) || 10, id % 60).toISOString(), mode, score: 30, settings: {}, questions }, more || {});
}

test('classify: every category, with its edges', () => {
  const cases = [
    [q('add', 34, 25), 'add-nocarry'], [q('add', 40, 51), 'add-nocarry'],
    [q('add', 45, 29), 'add-carry'], [q('add', 5, 5), 'add-carry'],            // 5 + 5: units carry exactly
    [q('sub', 23, 45), 'sub-noborrow'], [q('sub', 10, 20), 'sub-noborrow'],    // 68 − 23, 30 − 10
    [q('sub', 27, 45), 'sub-borrow'], [q('sub', 9, 13), 'sub-borrow'],         // 72 − 27, 22 − 9
    [q('sub', 93, 13), 'sub-cross100'], [q('sub', 1, 99), 'sub-cross100'],     // 106 − 93, 100 − 1
    [q('sub', 50, 50), 'sub-cross100'],                                        // 100 − 50: no borrow, still from 100
    [q('mul', 7, 8), 'mul-table'], [q('mul', 12, 12), 'mul-table'],
    [q('div', 7, 8), 'div-table'], [q('div', 12, 2), 'div-table'],
    [q('mul', 7, 13), 'mul-big-7'], [q('mul', 13, 7), 'mul-big-7'], [q('mul', 12, 86), 'mul-big-12'],
    [q('div', 7, 84), 'div-big-7'], [q('div', 4, 13), 'div-big-4'],
    [q('mul', 13, 14), null], [{ op: 'tr', type: 'sq5' }, null]
  ];
  for (const [x, want] of cases) assert.strictEqual(G.classify(x), want, JSON.stringify(x));
  assert.strictEqual(G.classify({ op: 'cp', type: 'c100', a: 37, b: 100 }), 'comp-100');
  assert.strictEqual(G.classify({ op: 'cp', type: 'cten', a: 237, b: 240 }), 'comp-ten');
});

test('drills give only their category, answers are right, hints never give the answer', () => {
  const rng = G.mulberry32(7);
  const want = { carry: 'add-carry', borrow: 'sub-borrow', cross: 'sub-cross100' };
  for (const d of Object.keys(want)) {
    for (let i = 0; i < 300; i++) {
      const x = G.drillQuestion(d, 0, rng);
      assert.strictEqual(G.classify(x), want[d]);
      assert.ok(x.a >= 2 && x.a <= 100 && x.b >= 2 && x.b <= 100);
      const h = G.hint(x);
      assert.ok(h && !new RegExp('(^|[^\\d])' + x.answer + '$').test(h), d + ': ' + h + ' = ' + x.answer);
    }
  }
  let ten = 0;
  for (let i = 0; i < 1000; i++) {
    const x = G.drillQuestion('comp', 0, rng);
    assert.strictEqual(x.answer, x.b - x.a);
    if (x.type === 'cten') { ten++; assert.ok(x.a >= 101 && x.a <= 999 && x.b % 10 === 0 && x.answer > 0 && x.answer < 10); }
    else assert.ok(x.a >= 2 && x.a <= 98 && x.b === 100);
  }
  assert.ok(ten > 230 && ten < 370, ten + ' to-the-next-ten in 1000');
  for (let i = 0; i < 200; i++) {
    const x = G.drillQuestion('mult', 7, rng);
    assert.strictEqual(x.a, 7);
    assert.ok(['mul', 'div'].includes(x.op) && x.b >= 2 && x.b <= 100);
  }
});

test('hints read like the spec', () => {
  assert.strictEqual(G.hint(q('add', 45, 29)), '45 + 29 → 45 + 30 − 1');
  assert.strictEqual(G.hint(q('sub', 87, 28)), '115 − 87 → 87 → 90 → 115');
  assert.strictEqual(G.hint({ op: 'cp', type: 'c100', a: 37, b: 100 }), '37 → 40 → 100');
  assert.strictEqual(G.hint(q('mul', 7, 86)), '7 × 86 → 560 + 42');
  assert.strictEqual(G.hint(q('mul', 9, 86)), '9 × 86 → 860 − 86');
  assert.strictEqual(G.hint(q('mul', 12, 86)), '12 × 86 → 860 + 172');
  assert.strictEqual(G.hint(q('div', 7, 84)), '588 ÷ 7 → 7 × 80 = 560, 28 left');
  assert.match(G.hint(q('div', 8, 43)), /^344 ÷ 8 → halve three times/);
  assert.strictEqual(G.hint(q('mul', 7, 8)), null);   // tables keep their own advice
});

test('category stats: last 3 days, widened until 15 answers, else flagged with the target', () => {
  const rs = [];
  // 6 days of Speed rounds: one + carry question a day at 3 s, ten − borrow questions a day at 2.5 s.
  for (let d = 1; d <= 6; d++) {
    const qs = [q('add', 45, 29, 3000)];
    for (let i = 0; i < 10; i++) qs.push(q('sub', 27, 45, 2500));
    rs.push(round('P3', '2026-10-0' + d, qs));
  }
  rs.push(round('DRILL', '2026-10-06', [q('sub', 27, 45, 100)]));   // not Normal-format: ignored
  rs.push(round('P3', '2026-10-06', [q('sub', 27, 45, 100, { unanswered: true })]));   // cut off: ignored
  const st = C.categoryStats(rs);
  assert.strictEqual(st['sub-borrow'].n, 30);          // 3 days are enough
  assert.strictEqual(st['sub-borrow'].days, 3);
  assert.strictEqual(st['sub-borrow'].median, 2500);
  assert.strictEqual(st['sub-borrow'].flagged, false);
  assert.strictEqual(st['add-carry'].n, 6);            // widened to all 6 days, still short
  assert.strictEqual(st['add-carry'].flagged, true);
  assert.strictEqual(st['add-carry'].used, 1800);      // the target stands in
  assert.strictEqual(st['add-carry'].median, 3000);
  // before: only earlier days
  assert.strictEqual(C.categoryStats(rs, { before: '2026-10-04' })['sub-borrow'].n, 30);
  assert.strictEqual(C.categoryStats(rs, { before: '2026-10-02' })['sub-borrow'].n, 10);
});

test('frequencies come from the Normal generator and add up to 1', () => {
  const f = C.frequencies();
  const total = Object.values(f).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  const fam = (p) => Object.keys(f).filter((k) => k.startsWith(p)).reduce((a, k) => a + f[k], 0);
  for (const op of ['add', 'sub', 'mul', 'div']) assert.ok(Math.abs(fam(op) - 0.25) < 0.02, op);
  assert.ok(f['mul-big-7'] > 0.015 && f['mul-big-7'] < 0.025);
});

test('estimated score: every category at target scores 58–62; a slow one tops the lost-time list', () => {
  const at = C.estimate({});
  assert.ok(at.score >= 58 && at.score <= 62, String(at.score));
  assert.ok(at.lost.every((r) => r.lostMs === 0 && r.flagged));
  const slow = { 'sub-borrow': { key: 'sub-borrow', n: 40, median: 3100, used: 3100, flagged: false, wrong: 0.2 } };
  const e = C.estimate(slow);
  assert.strictEqual(e.lost[0].key, 'sub-borrow');
  assert.ok(e.score < at.score);
  assert.ok(e.lost[0].points > 0);
  assert.strictEqual(Math.floor(120000 / (e.perQ - e.lost[0].lostMs)), at.score);
});

// A full coach day: `bench` scores for the benchmark; focus drills as given.
function coachDay(day, bench, opts) {
  opts = opts || {};
  const test = !!opts.test, out = [];
  const tag = (block) => ({ coach: { block, test } });
  out.push(round('TABLES', day, [], tag(1)));
  out.push(round('P2', day, opts.p2 || [], tag(2)), round('P2', day, [], tag(2)));
  if (!test) {
    for (let i = 0; i < 3; i++) out.push(round('R60', day, [], Object.assign(tag(3), { settings: { drill: 'carry' } })));
    for (let i = 0; i < 3; i++) out.push(round('R60', day, [], Object.assign(tag(4), { settings: { drill: 'comp' } })));
    for (let i = 0; i < 4; i++) out.push(round('P3', day, opts.p3 || [], tag(5)));
  }
  bench.forEach((s) => out.push(round('NORMAL120', day, [], Object.assign(tag(6), { score: s, hour: opts.hour || 10 }))));
  return out;
}

test('plan: blocks, focus from lost time, one drill per pick, complements replace Focus B until fast', () => {
  const slowQs = [];
  for (let i = 0; i < 20; i++) slowQs.push(q('sub', 27, 45, 3500), q('mul', 7, 86, 4000), q('div', 7, 84, 3900), q('add', 45, 29, 1700));
  const rs = [round('P3', '2026-10-01', slowQs)];
  const p = C.plan(rs, '2026-10-02');
  // − with borrow loses the most (5% of questions × 1.6 s); complements were never trained, so they take Focus B
  assert.deepStrictEqual(p.blocks.map((b) => [b.block, b.mode || b.drill, b.rounds]),
    [[1, 'TABLES', 1], [2, 'P2', 2], [3, 'borrow', 3], [4, 'comp', 3], [5, 'P3', 4], [6, 'NORMAL120', 2]]);
  assert.strictEqual(p.next.block, 1);
  assert.strictEqual(p.started, false);
  // fast complements: Focus B is the next drill by lost time; ÷ 7 and × 7 share the × ÷ 7 drill, picked once
  const comp = [];
  for (let i = 0; i < 20; i++) comp.push({ op: 'cp', type: 'c100', a: 37, b: 100, timeMs: 900, wrongAttempts: 0 });
  rs.push(round('R60', '2026-10-01', comp, { settings: { drill: 'comp' } }));
  const picks = C.focusPicks(rs, '2026-10-02');
  assert.deepStrictEqual(picks.map((x) => [x.drill, x.n]), [['borrow', undefined], ['mult', 7]]);
  // a slow complement median (over 1.2 s) brings them back
  rs.push(round('R60', '2026-10-01', comp.map((x) => Object.assign({}, x, { timeMs: 1500 })).concat(comp.map((x) => Object.assign({}, x, { timeMs: 1500 }))), { settings: { drill: 'comp' } }));
  assert.strictEqual(C.focusPicks(rs, '2026-10-02')[1].drill, 'comp');
});

test('plan: progress comes from today\'s coach rounds; every 7th session is a test day', () => {
  const rs = [];
  const day = coachDay('2026-10-01', [40, 42]).slice(0, 4);   // blocks 1–2 and the first Focus A round
  rs.push(...day);
  const p = C.plan(rs, '2026-10-01');
  assert.strictEqual(p.started, true);
  assert.strictEqual(p.next.block, 3);
  assert.strictEqual(p.blocks.find((b) => b.block === 3).done, 1);
  for (let d = 2; d <= 7; d++) rs.push(...coachDay('2026-10-0' + d, d === 7 ? [40, 42, 41, 43] : [40, 42], { test: d === 7 }));
  assert.strictEqual(C.plan(rs, '2026-10-08').test, false);
  assert.strictEqual(C.plan(rs, '2026-10-08').n, 8);
  const t = C.plan(rs, '2026-10-07');
  assert.strictEqual(t.n, 7);
  assert.strictEqual(t.test, true);
  assert.deepStrictEqual(t.blocks.map((b) => [b.block, b.rounds]), [[1, 1], [2, 2], [6, 4]]);
  assert.strictEqual(t.done, true);
  assert.strictEqual(C.isExtraNow(rs, '2026-10-07'), true);
  assert.strictEqual(C.isExtraNow(rs, '2026-10-09'), false);
});

test('milestones need 2 sessions in a row, the gate 3 in a row at 60; incomplete sessions are skipped', () => {
  const rs = [
    ...coachDay('2026-10-01', [44, 46]),   // 45
    ...coachDay('2026-10-02', [41, 41]),   // 41
    ...coachDay('2026-10-03', [46, 46]),   // 46
    round('TABLES', '2026-10-04', [], { coach: { block: 1, test: false } }),   // incomplete: neither counts nor breaks
    ...coachDay('2026-10-05', [45, 47]),   // 46 → 45 reached (3rd and 5th: in a row)
    ...coachDay('2026-10-06', [60, 62]),
    ...coachDay('2026-10-08', [61, 61]),
    ...coachDay('2026-10-09', [59, 62])    // 60.5
  ];
  const p = C.progress(rs);
  assert.strictEqual(p.sessions.length, 7);
  const got = Object.fromEntries(p.milestones.map((m) => [m.m, m.day]));
  assert.deepStrictEqual(got, { 40: '2026-10-02', 45: '2026-10-05', 50: '2026-10-08', 55: '2026-10-08', 60: '2026-10-08' });
  assert.strictEqual(p.gateRun, 3);
  assert.strictEqual(p.gatePassed, '2026-10-09');
  assert.strictEqual(p.next, null);
});

test('mastery: at or under target at the end of 3 complete sessions in a row; then out of the focus pool', () => {
  const fast = [], slow = [];
  for (let i = 0; i < 20; i++) { fast.push(q('sub', 27, 45, 1500)); slow.push(q('add', 45, 29, 3000)); }
  const rs = [];
  for (let d = 1; d <= 3; d++) rs.push(...coachDay('2026-10-0' + d, [40, 40], { p3: fast.concat(slow) }));
  const m = C.mastered(rs);
  assert.strictEqual(m['sub-borrow'], '2026-10-03');
  assert.strictEqual(m['add-carry'], undefined);
  const picks = C.focusPicks(rs, '2026-10-04').map((p) => p.drill);
  assert.ok(!picks.includes('borrow'));
  assert.strictEqual(picks[0], 'carry');
});

test('benchmark by time of day and the time-of-day buckets', () => {
  assert.strictEqual(C.timeOfDay(new Date(2026, 9, 1, 8).toISOString()), 'morning');
  assert.strictEqual(C.timeOfDay(new Date(2026, 9, 1, 12).toISOString()), 'afternoon');
  assert.strictEqual(C.timeOfDay(new Date(2026, 9, 1, 22, 59).toISOString()), 'evening');
  assert.strictEqual(C.timeOfDay(new Date(2026, 9, 1, 23).toISOString()), 'late');
  assert.strictEqual(C.timeOfDay(new Date(2026, 9, 1, 4).toISOString()), 'late');
  const rs = [...coachDay('2026-10-01', [40, 44], { hour: 23 }), ...coachDay('2026-10-02', [50, 50], { hour: 9 })];
  const by = Object.fromEntries(C.benchByTime(rs).map((x) => [x.tod, x]));
  assert.strictEqual(by.late.avg, 42);
  assert.strictEqual(by.morning.avg, 50);
  assert.strictEqual(by.afternoon.n, 0);
});

test('the report has a Coach section with benchmarks, categories, focus history and the warm-up curve', () => {
  const P = require('../js/progression.js');
  const Storage = require('../js/storage.js');
  const data = Storage.defaults();
  const p3 = [];
  for (let i = 0; i < 20; i++) p3.push(q('sub', 27, 45, 3100), q('add', 45, 29, 2900));
  data.rounds = [...coachDay('2026-10-01', [41, 43], { p3, hour: 23 }), ...coachDay('2026-10-02', [45, 47], { p3 })];
  const text = P.summary(data, new Date(2026, 9, 2, 20).getTime());
  assert.match(text, /^## Coach \(Road to 60\)$/m);
  assert.match(text, /S1 2026-10-01: 41, 43 {2}avg 42\.0/);
  assert.match(text, /Milestones reached: 40 \(next 45, 1\/2 in a row\)\. Gate 60: 0\/3\./);
  assert.match(text, /^ {2}sub-borrow \| 160 \| 3\.1 \| 1\.9 \| 0% \| [\d.]+ \| –$/m);
  assert.match(text, /^ {2}no answers yet: add-nocarry, div-big-10, /m);
  assert.match(text, /Focus history: 2026-10-01: carry \+ comp; 2026-10-02: carry \+ comp/);
  assert.match(text, /Benchmark by time of day: morning 46\.0 \(n2\), afternoon –, evening –, late 42\.0 \(n2\)/);
  assert.match(text, /Warm-up curve \(Speed by round of the day\): R1 30\.0/);
});
