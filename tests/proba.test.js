// Learn › Probability: the validator (on crafted cards, the sample cards and the real bank), filters, the Learn queue,
// the number parser, mastery across the 05:00 boundary, the cheat sheet, the report, storage, and the rule that
// probability rounds change nothing in Zetamac / Road to 60 (benchmark, trend, milestones, weak facts, overview).
const test = require('node:test');
const assert = require('node:assert');
const PB = require('../js/proba.js');
const S = require('../js/stats.js');
const CO = require('../js/coach.js');
const G = require('../js/generator.js');
const P = require('../js/progression.js');
const Storage = require('../js/storage.js');
const REAL = require('../js/proba-cards.js');
const FX = require('./proba-fixture.js');

// The sample bank's own meta: the real file's version changes with every bank the coach delivers.
const META = { version: '2026-11-12-sample', lectures: REAL.PROBA_META.lectures };
const BY = Object.fromEntries(FX.map((c) => [c.id, c]));
const dk = S.dayKey;
const at = (day, h, m) => { const [y, mo, d] = day.split('-').map(Number); return new Date(y, mo - 1, d, h || 12, m || 0, 0).getTime(); };

// A saved Probability round: qs = [[id, correct, seconds, extra?]], started on `day` at hour h.
let rid = 0;
function pround(day, qs, o) {
  o = o || {};
  return {
    id: 'pb' + (rid++), startedAt: new Date(at(day, o.h || 12, o.m || 0)).toISOString(), mode: 'LEARN', score: qs.filter((x) => x[1]).length,
    settings: { lesson: o.lesson || 'proba-learn' },
    questions: qs.map((x) => Object.assign({ op: 'pb', id: x[0], game: BY[x[0]] ? BY[x[0]].game : 'laws', correct: x[1], timeMs: x[2] * 1000, hinted: false, shown: 'q', answer: 'a', given: 'g' }, x[3] || {}))
  };
}
const state = (rounds, id) => PB.stats(FX, rounds, dk)[id].state;

// ---------- validator ----------

test('the 25 sample cards and the real bank pass the validator', () => {
  assert.strictEqual(FX.length, 25);
  assert.deepStrictEqual(PB.validateCards(FX), []);
  assert.deepStrictEqual(PB.validateCards(REAL.PROBA_CARDS), []);
  assert.ok(Object.keys(META.lectures).length === 6);
});

test('the validator rejects each kind of bad card', () => {
  const mcq = FX.find((c) => c.id === 'L3-geo-var'), tf = FX.find((c) => c.id === 'L1-cantor'), num = FX.find((c) => c.id === 'L3-bin-pmf');
  const bad = (card, re) => { const e = PB.validateCards([card]); assert.ok(e.some((x) => re.test(x)), re + ' in ' + JSON.stringify(e)); };
  const w = (c, o) => Object.assign({}, c, o);
  bad(w(mcq, { id: 'geo-var' }), /id must match/);
  bad(w(mcq, { id: 'L3-Geo' }), /id must match/);
  bad(w(mcq, { id: 'L9-x', lecture: 9 }), /lecture must be 1 to 6/);
  bad(w(mcq, { lecture: 0 }), /lecture must be 1 to 6/);
  bad(w(mcq, { game: 'quiz' }), /game must be one of/);
  bad(w(mcq, { prompt: '  ' }), /prompt is empty/);
  bad(w(mcq, { explain: '' }), /explain is empty/);
  bad(w(mcq, { distractors: ['a', 'b'] }), /3 to 5/);
  bad(w(mcq, { distractors: ['a', 'b', 'c', 'd', 'e', 'f'] }), /3 to 5/);
  bad(w(mcq, { distractors: ['a', 'a ', 'c'] }), /repeats another distractor/);
  bad(w(mcq, { distractors: ['a', ' ' + mcq.answer + ' ', 'c'] }), /repeats the answer/);
  bad(w(mcq, { distractors: ['a', 3, 'c'] }), /not a non-empty string/);
  bad(w(mcq, { answer: 5 }), /answer must be a non-empty string/);
  bad(w(tf, { answer: 'true' }), /true or false/);
  bad(w(tf, { distractors: ['x', 'y', 'z'] }), /no distractors/);
  bad(w(num, { answer: NaN }), /finite number/);
  bad(w(num, { answer: '0.375' }), /finite number/);
  bad(w(num, { tol: 0 }), /tol must be/);
  bad(w(num, { tol: -1 }), /tol must be/);
  bad(w(mcq, { prompt: 'odd $x' }), /Unclosed \$/);
  bad(w(mcq, { prompt: 'bad $\\nosuchcommand$' }), /Unknown command/);
  bad(w(mcq, { distractors: ['$\\frac{1}$', 'b', 'c'] }), /distractor 1/);
  bad(w(mcq, { id: 'L4-geo-var' }), /starts with L4 but lecture is 3/);
  const dup = PB.validateCards([mcq, w(mcq, {})]);
  assert.ok(dup.some((x) => /duplicate id/.test(x)));
  assert.ok(PB.validateCards('nope').length === 1);
});

test('clean() keeps the good cards and lists the bad ones; the app never crashes on one', () => {
  const r = PB.clean([FX[0], { id: 'nope' }, FX[1], FX[0]]);
  assert.deepStrictEqual(r.cards.map((c) => c.id), [FX[0].id, FX[1].id]);
  assert.strictEqual(r.errors.length, 2);
  assert.deepStrictEqual(PB.clean(null).cards, []);
});

// ---------- filters ----------

test('filters: scope 1–4 excludes L5–L6, complements are hidden unless on, game and lecture filters combine', () => {
  const ids = (list) => list.map((c) => c.id);
  const def = PB.pool(FX, null);
  assert.ok(def.every((c) => c.lecture <= 4 && !c.complement));
  assert.ok(!ids(def).includes('L3-holder') && !ids(def).includes('L5-normal-mgf') && !ids(def).includes('L6-slln-hyp'));
  assert.deepStrictEqual(ids(def), FX.filter((c) => c.lecture <= 4 && !c.complement).map((c) => c.id));   // file order kept
});

test('filters: counts by scope and complements', () => {
  const n = (s) => PB.pool(FX, s).length;
  assert.strictEqual(FX.filter((c) => c.lecture > 4).length, 4);
  assert.strictEqual(FX.filter((c) => c.complement).length, 1);
  assert.strictEqual(n({ scope: 4 }), 20);
  assert.strictEqual(n({ scope: 4, complements: true }), 21);
  assert.strictEqual(n({ scope: 6 }), 24);
  assert.strictEqual(n({ scope: 6, complements: true }), 25);
  const g = PB.pool(FX, { scope: 6, game: 'truefalse' });
  assert.ok(g.length && g.every((c) => c.game === 'truefalse'));
  const l = PB.pool(FX, { scope: 6, lectures: [3] });
  assert.ok(l.length && l.every((c) => c.lecture === 3));
  const both = PB.pool(FX, { scope: 6, game: 'laws', lectures: [4, 5] });
  assert.deepStrictEqual(both.map((c) => c.id).sort(), ['L4-bin-mgf', 'L4-exp-tail', 'L5-normal-mgf', 'L5-order-stat']);
  // a table cell ignores the chip filters but not the scope
  assert.deepStrictEqual(PB.pool(FX, { scope: 4, lectures: [1] }, { lecture: 3, game: 'laws' }).map((c) => c.id), ['L3-geo-var']);
  assert.deepStrictEqual(PB.pool(FX, { scope: 4 }, { lecture: 5, game: 'laws' }), []);
  // settings are clamped
  assert.deepStrictEqual(PB.settings({ scope: 5, game: 'x', lectures: [] }), PB.DEFAULTS);
  assert.deepStrictEqual(PB.scopeLectures({ scope: 6 }), [1, 2, 3, 4, 5, 6]);
});

// ---------- answers ----------

test('number parser: decimals, comma, fractions, scientific; rejects the rest', () => {
  const ok = { '0.375': 0.375, '0,375': 0.375, '3/8': 0.375, '-1 / 4': -0.25, '.5': 0.5, '2e-3': 0.002, '-2': -2, ' 7 ': 7, '1/-4': -0.25, '1,5e2': 150, '−1/4': -0.25 };
  Object.keys(ok).forEach((k) => assert.ok(Math.abs(PB.parseNumber(k) - ok[k]) < 1e-12, k));
  ['abc', '', '   ', '3/0', '3/', '/3', '1/2/3', '1e', '--2', '0.3.4', '3 8', 'NaN', 'Infinity', '1e999'].forEach((k) => assert.strictEqual(PB.parseNumber(k), null, JSON.stringify(k)));
  assert.strictEqual(PB.parseNumber(null), null);
});

test('tolerance: the default and card.tol; check for the three kinds', () => {
  const taxi = BY['L2-taxi'], pmf = BY['L3-bin-pmf'], poi = BY['L4-poi-ex2'];
  assert.strictEqual(PB.tolerance(taxi), 0.002);
  assert.strictEqual(PB.tolerance(pmf), 0.0005);                  // max(0.0005, 0.001 × 0.375)
  assert.ok(Math.abs(PB.tolerance(poi) - 0.006) < 1e-12);       // 0.001 × 6
  assert.ok(PB.check(pmf, 0.375) && PB.check(pmf, 0.3754) && !PB.check(pmf, 0.376));
  assert.ok(PB.check(taxi, 0.414) && PB.check(taxi, 0.4118) && !PB.check(taxi, 0.4));
  assert.ok(PB.check(poi, 6) && PB.check(poi, 6.005) && !PB.check(poi, 6.01));
  assert.ok(PB.check(BY['L1-cantor'], false) && !PB.check(BY['L1-cantor'], true));
  const geo = BY['L3-geo-var'];
  assert.ok(PB.check(geo, geo.answer) && !PB.check(geo, geo.distractors[0]));
  assert.ok(!PB.check(poi, 'six') && !PB.check(poi, null));
});

test('choices: 4 to 6 shuffled each time; true/false fixed; hints', () => {
  const rng = G.mulberry32(5), geo = BY['L3-geo-var'];
  const orders = new Set();
  for (let i = 0; i < 30; i++) {
    const c = PB.choices(geo, rng);
    assert.strictEqual(c.length, 5);
    assert.deepStrictEqual(c.slice().sort(), [geo.answer].concat(geo.distractors).sort());
    orders.add(c.join('|'));
  }
  assert.ok(orders.size > 5);
  assert.deepStrictEqual(PB.choices(BY['L1-cantor'], rng), [true, false]);
  assert.deepStrictEqual(PB.choices(BY['L3-bin-pmf'], rng), []);
  // H: the card's hint, else half the distractors (rounded down) for 4+ choices, none for true/false
  assert.strictEqual(PB.hintKind(BY['L3-tail-formula-proof'], 4), 'text');
  assert.strictEqual(PB.hintKind(geo, 5), 'cut');
  assert.strictEqual(PB.hintKind(BY['L2-total-prob-tool'], 4), 'cut');
  assert.strictEqual(PB.hintKind(BY['L1-cantor'], 2), null);
  assert.strictEqual(PB.hintKind(Object.assign({}, geo, { distractors: ['a', 'b', 'c'] }), 3), null);
  const cut = PB.cut(PB.choices(geo, rng), geo, rng);
  assert.strictEqual(cut.length, 3);            // 4 distractors: 2 removed
  assert.ok(cut.includes(geo.answer));
  assert.strictEqual(PB.cut(PB.choices(BY['L2-total-prob-tool'], rng), BY['L2-total-prob-tool'], rng).length, 3);   // 3 distractors: 1 removed
});

// ---------- Learn queue ----------

test('Learn: new cards come in file order', () => {
  const pool = PB.pool(FX, null), st = PB.stats(FX, [], dk), L = PB.learnQueue(), rng = () => 0;
  const got = [];
  for (let i = 0; i < 8; i++) got.push(PB.nextLearn(L, pool, st, rng, 0).id);
  assert.deepStrictEqual(got, pool.slice(0, 8).map((c) => c.id));
});

test('Learn: a missed card comes back 3 to 5 questions later; nothing else repeats within 4', () => {
  const pool = PB.pool(FX, { scope: 6, complements: true }), st = PB.stats(FX, [], dk);
  for (let seed = 1; seed <= 40; seed++) {
    const rng = G.mulberry32(seed), L = PB.learnQueue(), shown = [], backs = {};
    for (let i = 0; i < 60; i++) {
      const p = PB.nextLearn(L, pool, st, rng, at('2026-11-12'));
      shown.push(p);
      const idx = shown.length - 1;
      if (p.again) {   // a comeback: how far from the miss?
        const miss = backs[p.id];
        assert.ok(miss !== undefined, 'a comeback has a miss');
        assert.ok(idx - miss >= 3 && idx - miss <= 5, 'comeback ' + (idx - miss) + ' later (seed ' + seed + ')');
        delete backs[p.id];
      } else {
        // no repeat within 4 of a non-comeback
        const recent = shown.slice(Math.max(0, idx - 4), idx).map((x) => x.id);
        assert.ok(!recent.includes(p.id), 'repeat within 4 (seed ' + seed + ', ' + p.id + ')');
        if (i % 3 === 0 && !L.due.some((d) => d.id === p.id)) { PB.relearn(L, p.id, rng); backs[p.id] = idx; }   // wrong or hinted: it comes back once
      }
    }
    assert.ok(Object.keys(backs).length <= 5);
  }
});

test('Learn: a comeback is shown once, and the queue works with a pool of a few cards', () => {
  const pool = PB.pool(FX, { scope: 4, game: 'compute' }), st = PB.stats(FX, [], dk), L = PB.learnQueue(), rng = G.mulberry32(3);
  assert.strictEqual(pool.length, 3);
  for (let i = 0; i < 30; i++) PB.nextLearn(L, pool, st, rng, 0);
  assert.strictEqual(L.hist.length, 30);
  const one = PB.pool(FX, { scope: 4, game: 'laws', lectures: [3] });
  assert.strictEqual(one.length, 1);
  const L2 = PB.learnQueue();
  for (let i = 0; i < 6; i++) assert.strictEqual(PB.nextLearn(L2, one, PB.stats(FX, [], dk), rng, 0).id, 'L3-geo-var');
});

test('Learn: weak cards are favoured, mastered ones get about 10% of the picks', () => {
  const pool = PB.pool(FX, null), weak = pool.slice(0, 10).map((c) => c.id);
  const rounds = [];
  ['2026-11-01', '2026-11-02'].forEach((d) => rounds.push(pround(d, pool.flatMap((c) => [[c.id, true, 1], [c.id, true, 1]]))));
  rounds.push(pround('2026-11-02', weak.map((id) => [id, false, 20])));
  const st = PB.stats(FX, rounds, dk);
  assert.ok(weak.every((id) => st[id].state === 'learning'));
  assert.strictEqual(pool.filter((c) => st[c.id].state === 'mastered').length, pool.length - 10);
  const rng = G.mulberry32(11), L = PB.learnQueue();
  let strong = 0;
  for (let i = 0; i < 1000; i++) if (st[PB.nextLearn(L, pool, st, rng, at('2026-11-12')).id].state === 'mastered') strong++;
  assert.ok(strong > 50 && strong < 200, 'mastered share ' + strong / 10 + '%');   // about 10%
});

test('Sprint: no repeat within 4; weak cards come up more', () => {
  const pool = PB.pool(FX, null), st = PB.stats(FX, [pround('2026-11-02', [['L3-geo-var', false, 9]])], dk), rng = G.mulberry32(8), hist = [];
  let weak = 0;
  for (let i = 0; i < 400; i++) { const id = PB.nextSprint(hist, pool, st, rng); if (id === 'L3-geo-var') weak++; }
  for (let i = 4; i < hist.length; i++) assert.ok(!hist.slice(i - 4, i).includes(hist[i]));
  assert.ok(weak > 400 / pool.length, 'the missed card comes up more than average');
});

// ---------- mastery ----------

test('mastery: ≥ 2 answers in the last 3 practice days, all right, no hint, median under the target', () => {
  const geo = 'L3-geo-var';   // laws: 8 s
  const m = (qs, day) => state([pround(day || '2026-11-10', qs)], geo);
  assert.strictEqual(state([], geo), 'new');
  assert.strictEqual(m([[geo, true, 5]]), 'learning', 'one answer is not enough');
  assert.strictEqual(m([[geo, true, 5], [geo, true, 6]]), 'mastered');
  assert.strictEqual(m([[geo, true, 5], [geo, false, 6]]), 'learning');
  assert.strictEqual(m([[geo, true, 5], [geo, true, 6, { hinted: true }]]), 'learning', 'a hinted answer never counts');
  assert.strictEqual(m([[geo, true, 5], [geo, true, 6, { skipped: true }]]), 'learning');
  assert.strictEqual(m([[geo, true, 8], [geo, true, 8]]), 'mastered', 'median equal to the target counts');
  assert.strictEqual(m([[geo, true, 9], [geo, true, 9]]), 'learning', 'too slow');
  assert.strictEqual(m([[geo, true, 2], [geo, true, 3], [geo, true, 30]]), 'mastered', 'the median, not the mean');
  // the targets: per game, and card.target overrides
  assert.strictEqual(PB.target(BY['L2-taxi']), 40);
  assert.strictEqual(PB.target(BY['L1-cantor']), 8);
  assert.strictEqual(PB.target(Object.assign({}, BY['L1-cantor'], { target: 20 })), 20);
  assert.strictEqual(state([pround('2026-11-10', [['L2-taxi', true, 35], ['L2-taxi', true, 38]])], 'L2-taxi'), 'mastered');
  assert.strictEqual(state([pround('2026-11-10', [['L2-taxi', true, 45], ['L2-taxi', true, 48]])], 'L2-taxi'), 'learning');
  assert.strictEqual(state([pround('2026-11-10', [['L3-tail-formula-proof', true, 14], ['L3-tail-formula-proof', true, 14]])], 'L3-tail-formula-proof'), 'mastered');   // proof: 15 s
  // Learn and Sprint answers are pooled
  const mixed = [pround('2026-11-10', [[geo, true, 5]]), pround('2026-11-10', [[geo, true, 5]], { lesson: 'proba-sprint-60', h: 15 })];
  assert.strictEqual(state(mixed, geo), 'mastered');
});

test('mastery: the window is the last 3 practice days, and a day ends at 05:00', () => {
  const geo = 'L3-geo-var', other = 'L1-cantor';
  const filler = (d, h) => pround(d, [[other, true, 2]], { h: h || 12 });
  // practice days 1, 2, 3, 4 Nov; the miss on day 1 is outside the last 3 days
  const old = [pround('2026-11-01', [[geo, false, 5]]), pround('2026-11-02', [[geo, true, 5]]), filler('2026-11-03'), pround('2026-11-04', [[geo, true, 5]])];
  assert.strictEqual(state(old, geo), 'mastered');
  // the same miss on day 2 is inside the window
  const inside = [filler('2026-11-01'), pround('2026-11-02', [[geo, false, 5]]), filler('2026-11-03'), pround('2026-11-04', [[geo, true, 5], [geo, true, 5]])];
  assert.strictEqual(state(inside, geo), 'learning');
  // 04:59 on 2 Nov still belongs to 1 Nov (outside the window); 05:00 belongs to 2 Nov (inside)
  const before = [pround('2026-11-02', [[geo, false, 5]], { h: 4, m: 59 }), pround('2026-11-02', [[geo, true, 5]], { h: 5, m: 1 }), filler('2026-11-03'), pround('2026-11-04', [[geo, true, 5]])];
  assert.strictEqual(dk(before[0].startedAt), '2026-11-01');
  assert.strictEqual(state(before, geo), 'mastered');
  const after = [pround('2026-11-02', [[geo, false, 5]], { h: 5, m: 0 }), pround('2026-11-02', [[geo, true, 5]], { h: 6 }), filler('2026-11-03'), pround('2026-11-04', [[geo, true, 5]])];
  assert.strictEqual(dk(after[0].startedAt), '2026-11-02');
  assert.strictEqual(state(after, geo), 'learning');
  // a night session (1 am on the 5th) is the 4th; the window is days 2–4 either way
  const night = [pround('2026-11-05', [[geo, true, 5], [geo, true, 5]], { h: 1 })];
  assert.strictEqual(dk(night[0].startedAt), '2026-11-04');
  assert.strictEqual(state(night, geo), 'mastered');
  // accuracy is over all time
  assert.strictEqual(PB.stats(FX, old, dk)[geo].acc, 2 / 3);
});

test('answers to cards no longer in the bank are ignored and stay stored', () => {
  const gone = pround('2026-11-10', [['L3-removed-card', true, 3], ['L3-geo-var', true, 3], ['L3-geo-var', true, 3]]);
  const st = PB.stats(FX, [gone], dk);
  assert.strictEqual(st['L3-geo-var'].state, 'mastered');
  assert.strictEqual(st['L3-removed-card'], undefined);
  assert.strictEqual(PB.answers([gone], BY).length, 2);
  assert.strictEqual(PB.answers([gone]).length, 3);
  const data = Storage.migrate({ schemaVersion: 3, rounds: [gone], presets: [], settings: {} });
  assert.strictEqual(data.rounds[0].questions.length, 3);     // kept in storage
  assert.deepStrictEqual(PB.report(FX, META, null, [pround('2026-11-10', [['L3-removed-card', true, 3]])], dk), []);
});

// ---------- progress, cheat sheet, report ----------

test('progress table: mastered / total per lecture and game, totals', () => {
  const rounds = [pround('2026-11-10', [['L3-geo-var', true, 3], ['L3-geo-var', true, 3], ['L1-cantor', true, 3], ['L1-cantor', true, 3]])];
  const st = PB.stats(FX, rounds, dk), t = PB.progress(FX, null, st);
  assert.deepStrictEqual(t.lectures, [1, 2, 3, 4]);
  assert.deepStrictEqual(t.cells[3].laws, { m: 1, t: 1 });
  assert.deepStrictEqual(t.cells[1].truefalse, { m: 1, t: 2 });
  assert.deepStrictEqual(t.cells[1].laws, { m: 0, t: 0 });
  assert.deepStrictEqual(t.rows[1], { m: 1, t: 3 });
  assert.deepStrictEqual(t.cols.truefalse, { m: 1, t: 5 });     // L1 ×2, L2, L3 (Lp inclusion), L4 (geo trap)
  assert.deepStrictEqual(t.total, { m: 2, t: 20 });
  const six = PB.progress(FX, { scope: 6, complements: true }, st);
  assert.deepStrictEqual(six.lectures, [1, 2, 3, 4, 5, 6]);
  assert.strictEqual(six.total.t, 25);
  assert.deepStrictEqual(six.cells[3].statements, { m: 0, t: 2 });   // exy-indep, holder (complement shown)
});

test('cheat sheet: accuracy under 80% or a hint, lowest first then latest miss, capped at 40, one format', () => {
  const rounds = [
    pround('2026-11-09', [['L3-geo-var', false, 5], ['L3-geo-var', true, 5]]),           // 50%
    pround('2026-11-10', [['L1-cantor', true, 3], ['L1-cantor', true, 3, { hinted: true }]]),   // 100% but hinted
    pround('2026-11-10', [['L4-exp-tail', false, 5], ['L2-taxi', false, 20]]),           // 0%, both; exp-tail is more recent
    pround('2026-11-11', [['L2-taxi', false, 20]]),                                       // taxi: 0/2, latest miss
    pround('2026-11-11', [['L4-bin-mgf', true, 4], ['L4-bin-mgf', true, 4]]),            // fine: left out
    pround('2026-11-11', [['L3-holder', false, 4]]),                                      // a complement: out of scope by default
    pround('2026-11-11', [['L5-normal-mgf', false, 4]])                                   // lecture 5: out of scope 1–4
  ];
  const st = PB.stats(FX, rounds, dk), out = PB.cheatSheet(FX, null, st).split('\n');
  assert.strictEqual(out.length, 4);
  assert.ok(out[0].startsWith('- **[L2 · Quick compute]** ') && out[0].includes('→ **0.4138** — '), out[0]);   // 0/2, latest miss 11 Nov
  assert.ok(out[1].startsWith('- **[L4 · Law cards]** $X \\sim \\mathrm{Exp}(\\lambda)$'), out[1]);           // 0/1, latest miss 10 Nov
  assert.ok(out[2].startsWith('- **[L3 · Law cards]**') && out[2].includes('→ **$\\frac{1-p}{p^2}$** — $\\mathbb{E}[X] = 1/p$'), out[2]);   // 50%
  // a card at 100% is listed when one of its answers used a hint ("or at least one hinted attempt"), after the weaker ones
  assert.ok(out[3].startsWith('- **[L1 · True or false]** ') && out[3].includes('→ **False**'), out[3]);
  // scope 1–6 with complements adds the complement and the lecture-5 card
  const wide = PB.cheatSheet(FX, { scope: 6, complements: true }, st).split('\n');
  assert.strictEqual(wide.length, 6);
  assert.ok(wide.some((l) => l.includes('[L3 · Statements & hypotheses]')) && wide.some((l) => l.includes('[L5 · Law cards]')));
  // cap
  const many = Array.from({ length: 50 }, (_, i) => Object.assign({}, BY['L3-geo-var'], { id: 'L3-x' + i }));
  const st2 = PB.stats(many, [pround('2026-11-11', many.map((c) => [c.id, false, 3]))], dk);
  assert.strictEqual(PB.cheatSheet(many, null, st2).split('\n').length, 40);
  assert.strictEqual(PB.cheatSheet(FX, null, PB.stats(FX, [], dk)), '');
});

test('report section: scope, counts, per lecture, per game over the last 3 days, weakest 10', () => {
  const rounds = [
    pround('2026-11-09', [['L3-geo-var', false, 6], ['L3-geo-var', true, 6]]),
    pround('2026-11-10', [['L1-cantor', true, 3], ['L1-cantor', true, 3], ['L4-exp-tail', true, 4], ['L4-exp-tail', true, 4]])
  ];
  const lines = PB.report(FX, META, null, rounds, dk);
  assert.strictEqual(lines[0], '## Probability (midterm prep)');
  assert.strictEqual(lines[1], 'Scope: Lectures 1–4 · bank 2026-11-12-sample');
  assert.strictEqual(lines[2], 'Cards: mastered 2 / seen 3 / total 20');
  assert.strictEqual(lines[3], 'Per lecture: L1 1/1/3 · L2 0/0/3 · L3 0/1/6 · L4 1/1/8');
  assert.strictEqual(lines[4], 'Per game (last 3 days): Law cards 75%, median 5.0 s (4); True or false 100%, median 3.0 s (2)');
  assert.strictEqual(lines[5], 'Weakest 10:');
  assert.ok(/^- L3-geo-var — X ∼ Geo\(p\)/.test(lines[6]) && lines[6].endsWith('(50%, 2 attempts)'), lines[6]);
  assert.ok(lines[6].length < 130);
  assert.strictEqual(lines.length, 6 + 3);
  assert.deepStrictEqual(PB.report(FX, META, null, [], dk), []);
  assert.strictEqual(PB.report(FX, META, { scope: 6, complements: true }, rounds, dk)[1], 'Scope: Lectures 1–6 with complements · bank 2026-11-12-sample');
  // the section sits in "Copy report for Claude", before the latest session
  const data = { rounds, presets: [], settings: Storage.defaults().settings };
  const text = P.summary(data, at('2026-11-12'), { proba: { cards: FX, meta: META } });
  assert.ok(text.includes('\n## Probability (midterm prep)\nScope: Lectures 1–4'));
  assert.ok(text.indexOf('## Probability') < text.indexOf('## Latest') || !text.includes('## Latest'));
});

// ---------- storage ----------

test('storage: an old export gets default Probability settings; export → import keeps the rounds and the settings', () => {
  const old = Storage.migrate({ schemaVersion: 3, rounds: [], presets: [], settings: { theme: 'dark' } });
  assert.strictEqual(old.settings.proba, null);
  assert.deepStrictEqual(PB.settings(old.settings.proba), { scope: 4, complements: false, game: 'all', lectures: [1, 2, 3, 4, 5, 6] });
  assert.strictEqual(Storage.migrate({ schemaVersion: 1, rounds: [], settings: {} }).settings.proba, null);
  const d = Storage.defaults();
  d.settings.proba = PB.settings({ scope: 6, complements: true, game: 'laws', lectures: [3, 4] });
  d.rounds.push(pround('2026-11-10', [['L3-geo-var', true, 3, { t: 123 }]]));
  const back = Storage.parseBackup(Storage.serialize(d));
  assert.deepStrictEqual(back.settings.proba, d.settings.proba);
  assert.deepStrictEqual(back.rounds, d.rounds);
  assert.strictEqual(Storage.SCHEMA, 3);   // no schema change: Probability rounds are ordinary rounds
  const merged = Storage.merge(Storage.defaults(), back);
  assert.strictEqual(merged.rounds.length, 1);
  assert.ok(G.factKeys(back.rounds[0].questions[0]).length === 0);   // not a fact for the weak-fact engine
});

// ---------- Probability rounds change nothing in Zetamac / Road to 60 ----------

const zq = (op, a, b, ms, extra) => Object.assign({ op, a, b, timeMs: ms, wrongAttempts: 0 }, G.makeQuestion(op, a, b), { timeMs: ms }, extra || {});
let zid = 0;
function zround(mode, day, o) {
  o = o || {};
  const [y, m, d] = day.split('-').map(Number);
  return Object.assign({ id: 'z' + (zid++), startedAt: new Date(y, m - 1, d, o.h || 10, zid % 60).toISOString(), mode, score: o.score || 30, settings: {}, questions: o.qs || [] }, o.more || {});
}
function zday(day, bench, qs) {
  const out = [zround('TABLES', day, { more: { coach: { block: 1, test: false } } }), zround('P3', day, { qs: qs, more: { coach: { block: 5, test: false } } })];
  bench.forEach((s) => out.push(zround('NORMAL120', day, { score: s, qs: qs, more: { coach: { block: 6, test: false } } })));
  return out;
}

test('probability rounds change nothing in the benchmark, trend, milestones, weak facts and overview', () => {
  const qs = [];
  for (let i = 0; i < 12; i++) qs.push(zq('mul', 7, 14, 4000 + 300 * (i % 3)), zq('add', 45, 29, 1800), zq('sub', 63, 28, 2200, i % 5 === 0 ? { wrongAttempts: 1 } : {}));
  const days = ['2026-10-12', '2026-10-14', '2026-10-17', '2026-10-19', '2026-10-21', '2026-10-24', '2026-10-27', '2026-10-29', '2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'];
  const plain = days.flatMap((d, i) => zday(d, [40 + i, 41 + i], qs));
  // Probability days in between (never a Zetamac day), one on a Zetamac day, one on today, a sprint, a night session
  const extra = [
    pround('2026-10-13', [['L3-geo-var', true, 4], ['L3-geo-var', false, 9]]), pround('2026-10-15', [['L1-cantor', true, 3]]),
    pround('2026-10-18', [['L4-exp-tail', true, 5]], { lesson: 'proba-sprint-60' }), pround('2026-10-20', [['L2-taxi', false, 40]]),
    pround('2026-10-22', [['L3-geo-var', true, 4]]), pround('2026-10-23', [['L1-cantor', true, 3]]),
    pround('2026-10-26', [['L4-bin-mgf', true, 4]]), pround('2026-10-28', [['L4-bin-mgf', true, 4]]),
    pround('2026-11-01', [['L3-geo-var', true, 4]]), pround('2026-11-03', [['L3-geo-var', true, 4]]), pround('2026-11-05', [['L3-geo-var', true, 4]]),
    pround('2026-11-09', [['L1-cantor', false, 3]], { h: 20 }), pround('2026-11-10', [['L1-cantor', true, 3]], { h: 2 }), pround('2026-11-11', [['L1-cantor', true, 3]]), pround('2026-11-12', [['L1-cantor', true, 3]])
  ];
  const mixed = plain.concat(extra).sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
  const today = '2026-11-12', now = at(today, 13);

  // Road to 60: benchmark headline (value, arrow, status/trend, milestones), costs, snapshot (estimate, plan, mastery)
  assert.deepStrictEqual(CO.headline(mixed, today), CO.headline(plain, today));
  assert.strictEqual(CO.headline(plain, today).source, 'coach');
  assert.ok(CO.headline(plain, today).status.state !== 'none', 'the trend is computed on this history');
  assert.deepStrictEqual(CO.snapshot(mixed, today), CO.snapshot(plain, today));
  assert.deepStrictEqual(CO.costs(CO.snapshot(mixed, today)), CO.costs(CO.snapshot(plain, today)));
  assert.deepStrictEqual(CO.completeSessions(mixed).map((s) => [s.day, s.avg]), CO.completeSessions(plain).map((s) => [s.day, s.avg]));
  // the trend the way the mode page and the report draw it: per mode, on session numbers, latest = days played
  const trend = (rs) => S.trend(S.sessionsForMode(rs, 'NORMAL120'), 60, S.sessionDays(rs).length);
  assert.deepStrictEqual(trend(mixed), trend(plain));
  assert.strictEqual(trend(plain).ok, true);
  assert.deepStrictEqual(S.sessionsForMode(mixed, 'P3').map((s) => s.number), S.sessionsForMode(plain, 'P3').map((s) => s.number));
  // weak-fact engine and the Stats overview's numbers
  assert.deepStrictEqual(S.factStats(mixed, now), S.factStats(plain, now));
  assert.ok(S.factStats(plain, now).length > 0);
  assert.deepStrictEqual(S.sessionDays(mixed), S.sessionDays(plain));
  assert.strictEqual(S.sessionNumber(mixed, today), S.sessionNumber(plain, today));
  assert.deepStrictEqual(S.activity(mixed, today), S.activity(plain, today));
  assert.strictEqual(S.streak(mixed, today), S.streak(plain, today));
  assert.strictEqual(S.accuracy(mixed.filter(CO.isNormal)), S.accuracy(plain.filter(CO.isNormal)));
  assert.deepStrictEqual(S.weekWindows(today), S.weekWindows(today));
  assert.deepStrictEqual(S.opMedians(mixed, S.sessionDays(mixed).slice(-3)), S.opMedians(plain, S.sessionDays(plain).slice(-3)));
  assert.deepStrictEqual(S.timeByOp(mixed.filter((r) => r.mode === 'P3')), S.timeByOp(plain.filter((r) => r.mode === 'P3')));
  // the report: every section but Probability is byte-identical
  const settings = Storage.defaults().settings;
  const withP = P.summary({ rounds: mixed, presets: [], settings }, now, { proba: { cards: FX, meta: META } }).split('\n');
  const without = P.summary({ rounds: plain, presets: [], settings }, now, { proba: { cards: FX, meta: META } }).split('\n');
  const i = withP.indexOf('## Probability (midterm prep)');
  assert.ok(i > 0);
  let j = i + 1; while (j < withP.length && !/^#/.test(withP[j])) j++;
  assert.deepStrictEqual(withP.slice(0, i).concat(withP.slice(j)), without);
  assert.ok(!without.includes('## Probability (midterm prep)'));
});
