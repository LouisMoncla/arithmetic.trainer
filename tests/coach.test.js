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

test('plan: blocks; Focus A and B are the two costliest families; complements are never picked', () => {
  const slowQs = [];
  for (let i = 0; i < 20; i++) slowQs.push(q('sub', 27, 45, 3500), q('mul', 7, 86, 4000), q('div', 7, 84, 3900), q('add', 45, 29, 1700));
  const rs = [round('P3', '2026-10-01', slowQs)];
  const p = C.plan(rs, '2026-10-02');
  // + and − lose the most (− with borrow: 5% of questions × 1.6 s), then ÷ big (÷ 7 only: 2% × 1.7 s), then × big (2% × 1.6 s)
  assert.deepStrictEqual(p.blocks.map((b) => [b.block, b.mode || b.drill, b.rounds]),
    [[1, 'TABLES', 1], [2, 'P2', 2], [3, 'borrow', 3], [4, 'mult', 3], [5, 'P3', 4], [6, 'NORMAL120', 2]]);
  const fb = p.blocks.find((b) => b.block === 4);
  assert.strictEqual(fb.family, 'divbig');
  assert.deepStrictEqual(fb.n, [7, 12, 11]);   // ÷ 7 loses time; the rest have no data: higher N first
  assert.strictEqual(C.blockLabel(fb), 'Focus B: × ÷ by 7, 12 and 11');
  assert.strictEqual(p.next.block, 1);
  assert.strictEqual(p.started, false);
  // complements are never picked, even untrained or slow
  const comp = [];
  for (let i = 0; i < 20; i++) comp.push({ op: 'cp', type: 'c100', a: 37, b: 100, timeMs: 3000, wrongAttempts: 0 });
  rs.push(round('R60', '2026-10-01', comp, { settings: { drill: 'comp' } }));
  assert.ok(C.focusPicks(rs, '2026-10-02').every((x) => x.drill !== 'comp'));
  assert.ok(C.focusPicks([], '2026-10-02').every((x) => x.drill !== 'comp'));
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
  assert.match(text, /^Families \(lost ms a question, points\): \+ and − \d+ ms \([\d.]+\), × big 0 ms \(0\.0\), ÷ big 0 ms \(0\.0\)\.$/m);
  assert.match(text, /^Accuracy \(per category, lost to wrong attempts\): 0 ms a question \(0\.0 points\); overall 0% wrong, .*; in the focus pool; wrong-attempt rate by session: 2026-10-01 0%, 2026-10-02 0%\.$/m);
  assert.match(text, /Benchmark by time of day: morning 46\.0 \(n2\), afternoon –, evening –, late 42\.0 \(n2\)/);
  assert.match(text, /Warm-up curve \(Speed by round of the day, 2\+ days each\): R1 30\.0 \(2d\)/);
  assert.match(text, /^A day runs from 05:00 to 05:00 local/m);
});

// ---------- the day boundary, extra rounds, families, accuracy ----------

const S = require('../js/stats.js');
const iso = (y, m, d, h, min) => new Date(y, m - 1, d, h, min || 0).toISOString();
// n questions of one kind, `wrong` of them with a wrong attempt (wrong ones take wrongMs).
function mix(make, n, wrong, cleanMs, wrongMs) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(i < wrong ? Object.assign(make(wrongMs), { wrongAttempts: 1 }) : make(cleanMs));
  return out;
}

test('a day runs from 05:00 to 05:00 local', () => {
  assert.strictEqual(S.dayKey(iso(2026, 10, 2, 4, 59)), '2026-10-01');
  assert.strictEqual(S.dayKey(iso(2026, 10, 2, 5, 0)), '2026-10-02');
  assert.strictEqual(S.dayKey(iso(2026, 10, 2, 23, 59)), '2026-10-02');
  assert.strictEqual(S.dayKey(iso(2026, 11, 1, 0, 30)), '2026-10-31');   // across a month
  assert.strictEqual(S.dayKey(iso(2026, 1, 1, 2, 0)), '2025-12-31');     // and a year
});

test('tagExtras: rounds started after the day\'s session was complete, including after midnight', () => {
  const rs = coachDay('2026-11-08', [37, 34], { hour: 18 });   // the session completes with the 2nd benchmark at 18:xx
  const mk = (idn, mode, at, more) => Object.assign({ id: idn, startedAt: at, mode, score: 20, settings: {}, questions: [] }, more || {});
  rs.push(
    mk('before', 'P3', iso(2026, 11, 8, 12)),                                // before the session finished
    mk('evening', 'NORMAL120', iso(2026, 11, 8, 21)),                        // after: extra
    mk('night', 'WTABLES', iso(2026, 11, 9, 0, 4)),                          // 00:04 belongs to 11-08: extra
    mk('ext', 'EXTERNAL', iso(2026, 11, 8, 22), { linkedMode: 'NORMAL120' }),   // typed in: never tagged
    mk('nextday', 'P3', iso(2026, 11, 9, 9)),                                // 11-09 has no session
    mk('late-coach', 'P3', iso(2026, 11, 8, 22), { coach: { block: 5, test: false } })
  );
  assert.strictEqual(C.tagExtras(rs), 2);
  const tagged = rs.filter((r) => r.extra).map((r) => r.id).sort();
  assert.deepStrictEqual(tagged, ['evening', 'night']);
  assert.strictEqual(C.tagExtras(rs), 0);   // idempotent
  assert.strictEqual(C.isExtraNow(rs, S.dayKey(iso(2026, 11, 9, 0, 20))), true);
  assert.strictEqual(C.isExtraNow(rs, S.dayKey(iso(2026, 11, 9, 5, 0))), false);
});

test('families: many slow × big multipliers beat one + / − category; Focus A is the mix of the 3 worst', () => {
  const rs = [];
  const slow = { 12: 5000, 8: 4600, 6: 4400, 7: 4000, 9: 3800 };
  for (let d = 1; d <= 3; d++) {
    const qs = [];
    Object.keys(slow).forEach((n) => { for (let i = 0; i < 6; i++) qs.push(q('mul', +n, 40 + i, slow[n])); });
    for (let i = 0; i < 6; i++) qs.push(q('sub', 60, 70, 2600));   // − from 100: 13% of questions × 0.6 s, more than any one × N
    rs.push(round('P3', '2026-10-0' + d, qs));
  }
  const est = C.estimate(C.categoryStats(rs));
  const fams = C.families(est);
  assert.deepStrictEqual(fams.map((f) => f.id), ['mulbig', 'addsub', 'divbig']);
  assert.ok(fams[0].rows.every((r) => r.lostMs <= fams[1].lostMs));   // no single × N beats − from 100 alone
  const picks = C.focusPicks(rs, '2026-10-04');
  assert.deepStrictEqual(picks.map((p) => [p.drill, p.n, p.family]), [['mult', [12, 8, 6], 'mulbig'], ['cross', undefined, 'addsub']]);
  assert.deepStrictEqual(picks[0].keys, ['mul-big-12', 'mul-big-8', 'mul-big-6']);
  // a mastered multiplier leaves its family's total and the mix
  const without = C.families(est, { 'mul-big-12': '2026-10-01' }).find((f) => f.id === 'mulbig');
  assert.ok(without.lostMs < fams[0].lostMs);
  assert.ok(without.rows.every((r) => r.key !== 'mul-big-12'));
});

test('families: + / − first picks its costliest drill; ÷ big second gives a ÷ family mix; no data still gives 2 picks', () => {
  const qs = [];
  for (let i = 0; i < 20; i++) qs.push(q('sub', 60, 70, 3000), q('div', 7, 84, 4500), q('add', 45, 29, 1900));
  const picks = C.focusPicks([round('P3', '2026-10-01', qs)], '2026-10-02');
  assert.deepStrictEqual(picks.map((p) => [p.drill, p.family]), [['cross', 'addsub'], ['mult', 'divbig']]);
  assert.strictEqual(picks[1].n[0], 7);
  const none = C.focusPicks([], '2026-10-02');
  assert.deepStrictEqual(none.map((p) => p.drill), ['carry', 'mult']);
  assert.deepStrictEqual(none[1].n, [12, 11, 10]);
});

test('mixed × ÷ drill: only the given multipliers, both × and ÷; labels and modes', () => {
  const gen = G.makeDrillGenerator('mult', [12, 8, 6], G.mulberry32(3)), ops = new Set(), ns = new Set();
  for (let i = 0; i < 300; i++) {
    const x = gen.next();
    ops.add(x.op);
    ns.add(x.a);   // the multiplier (× a × b, ÷ shown as a·b ÷ a)
    assert.ok(x.b >= 2 && x.b <= 100);
  }
  assert.deepStrictEqual([...ops].sort(), ['div', 'mul']);
  assert.deepStrictEqual([...ns].sort((a, b) => a - b), [6, 8, 12]);
  assert.strictEqual(G.drillLabel('mult', [12, 8, 6]), '× ÷ by 12, 8 and 6');
  assert.strictEqual(G.drillLabel('mult', 7), '× ÷ 7 drill');
  assert.strictEqual(S.effMode({ mode: 'R60', settings: { drill: 'mult', n: [12, 8, 6] } }), 'R60-mult-12-8-6');
  assert.strictEqual(S.effMode({ mode: 'R60', settings: { drill: 'mult', n: 7 } }), 'R60-mult-7');
  const P = require('../js/progression.js');
  assert.strictEqual(P.modeLabel('R60-mult-12-8-6'), 'Road to 60: × ÷ by 12, 8 and 6');
  assert.strictEqual(P.modeLabel('R60-mult-7'), 'Road to 60: × ÷ 7 drill');
  assert.strictEqual(P.modeLabel('R60-acc'), 'Road to 60: Accuracy round');
  const acc = G.makeDrillGenerator('acc', 0, G.mulberry32(4));   // the Speed generator
  for (let i = 0; i < 50; i++) assert.ok(['add', 'sub', 'mul', 'div'].includes(acc.next().op));
});

test('accuracy: per category, Σ freq × wrong rate × (median wrong − median clean), 5 wrong and 5 clean needed', () => {
  const f = C.frequencies();
  const cross = (ms) => q('sub', 60, 70, ms), mul7 = (ms) => q('mul', 7, 86, ms);
  const rs = [round('P3', '2026-10-01', mix(cross, 15, 5, 2000, 5000).concat(mix(mul7, 20, 4, 3000, 9000)))];
  const a = C.accuracy(rs);
  assert.deepStrictEqual(a.cats.map((c) => c.key), ['sub-cross100']);   // × 7 has only 4 wrong: adds 0
  assert.ok(Math.abs(a.lostMs - f['sub-cross100'] * (5 / 15) * 3000) < 1e-9);
  assert.ok(a.points > 0);
  assert.strictEqual(a.rate, 9 / 35);   // overall figures, for the text
});

test('accuracy controls for difficulty: hard questions are slower and more often wrong, but cost only their own gap', () => {
  const easy = (ms) => q('add', 34, 25, ms), hard = (ms) => q('mul', 7, 86, ms);
  const rs = [round('P3', '2026-10-01', mix(easy, 25, 5, 1000, 1200).concat(mix(hard, 25, 20, 4000, 4200)))];
  const a = C.accuracy(rs), f = C.frequencies();
  const want = f['add-nocarry'] * (5 / 25) * 200 + f['mul-big-7'] * (20 / 25) * 200;
  assert.ok(Math.abs(a.lostMs - want) < 1e-9);
  const global = a.rate * (a.medWrong - a.medClean);   // what the overall numbers would claim
  assert.ok(global > 10 * a.lostMs, global + ' vs ' + a.lostMs);
});

test('accuracy widens to older days until a category has 5 wrong and 5 clean answers', () => {
  const cross = (ms) => q('sub', 60, 70, ms);
  const rs = [
    round('P3', '2026-10-01', mix(cross, 10, 2, 2000, 5000)),
    round('P3', '2026-10-02', mix(cross, 10, 1, 2000, 5000)),
    round('P3', '2026-10-03', mix(cross, 10, 1, 2000, 5000)),
    round('P3', '2026-10-04', mix(cross, 10, 2, 2000, 5000))
  ];
  assert.strictEqual(C.accuracy(rs).cats[0].wrongN, 6);   // days 2–4 have 4 wrong: day 1 is added
  assert.strictEqual(C.accuracy(rs.slice(1)).lostMs, 0);   // without day 1: not enough
});

test('accuracy leaves the pool under 8% for 3 complete sessions in a row and comes back above 12%', () => {
  const add = (ms) => q('add', 34, 25, ms);
  const at = (pctWrong) => ({ p3: mix(add, 100, pctWrong, 1500, 6000) });
  const rs = [
    ...coachDay('2026-10-01', [40, 40], at(5)),
    ...coachDay('2026-10-02', [40, 40], at(6)),
    round('TABLES', '2026-10-03', [], { coach: { block: 1, test: false } }), round('P3', '2026-10-03', mix(add, 100, 30, 1500, 6000)),   // incomplete: skipped
    ...coachDay('2026-10-04', [40, 40], at(7))
  ];
  let st = C.accuracyState(rs);
  assert.strictEqual(st.inPool, false);
  assert.deepStrictEqual(st.out, ['2026-10-04']);
  assert.deepStrictEqual(st.rates.map((x) => x.day), ['2026-10-01', '2026-10-02', '2026-10-04']);
  assert.ok(C.accuracy(rs, { before: '2026-10-05' }).lostMs > 0);
  assert.ok(C.focusPicks(rs, '2026-10-05').every((p) => p.drill !== 'acc'));   // out of the pool
  rs.push(...coachDay('2026-10-05', [40, 40], at(10)));
  assert.strictEqual(C.accuracyState(rs).inPool, false);   // 10%: still out
  rs.push(...coachDay('2026-10-06', [40, 40], at(13)));
  st = C.accuracyState(rs);
  assert.strictEqual(st.inPool, true);
  assert.strictEqual(st.since, '2026-10-06');
  // back in, and wrong answers cost more than any family: Focus A is the accuracy round, Focus B the top family
  const picks = C.focusPicks(rs, '2026-10-07');
  assert.strictEqual(picks[0].drill, 'acc');
  assert.strictEqual(picks[1].family, C.families(C.estimate(C.categoryStats(rs, { before: '2026-10-07' }))).at(0).id);
});
