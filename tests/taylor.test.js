// The Taylor lesson: every stored expansion checked numerically against functions written here, independently of
// the library; then the wrong choices, estimation, rendering, picking and mastery.
const test = require('node:test');
const assert = require('node:assert');
const T = require('../js/taylor.js');
const TeX = require('../js/tex.js');

// ---------- reference functions (not the library's) ----------

const REF = {
  exp: Math.exp, ln1p: (x) => Math.log1p(x), ln1m: (x) => Math.log1p(-x), inv1m: (x) => 1 / (1 - x), inv1p: (x) => 1 / (1 + x),
  sqrt1p: (x) => Math.sqrt(1 + x), isqrt1p: (x) => 1 / Math.sqrt(1 + x), inv1p2: (x) => (1 + x) ** -2,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, sh: Math.sinh, ch: Math.cosh, th: Math.tanh,
  arctan: Math.atan, arcsin: Math.asin, arccos: Math.acos,
  argth: (x) => 0.5 * (Math.log1p(x) - Math.log1p(-x)), argsh: (x) => Math.log(x + Math.sqrt(1 + x * x)),
  inv1px2: (x) => 1 / (1 + x * x), isqrt1mx2: (x) => 1 / Math.sqrt(1 - x * x), lnratio: (x) => Math.log1p(x) - Math.log1p(-x),
  esin: (x) => Math.exp(Math.sin(x)), ecos: (x) => Math.exp(Math.cos(x)), lncos: (x) => Math.log(Math.cos(x)), sec: (x) => 1 / Math.cos(x),
  expsin: (x) => Math.exp(x) * Math.sin(x), expcos: (x) => Math.exp(x) * Math.cos(x), bernoulli: (x) => x / Math.expm1(x),
  ln1psin: (x) => Math.log1p(Math.sin(x)), sinc: (x) => Math.sin(x) / x, sin2: (x) => Math.sin(x) ** 2,
  sqrtdiff: (x) => Math.sqrt(1 + x) - Math.sqrt(1 - x), powinvx: (x) => Math.exp(Math.log1p(x) / x), fib: (x) => 1 / (1 - x - x * x),
  expx2: (x) => Math.exp(x * x),
  // tier 3: f(a + h)
  ln_at1: (h) => Math.log1p(h), ln1p_at1: (h) => Math.log(2 + h), sqrt_at4: (h) => Math.sqrt(4 + h), exp_at1: (h) => Math.exp(1 + h),
  inv_at2: (h) => 1 / (2 + h), sin_atpi6: (h) => Math.sin(Math.PI / 6 + h), cos_atpi3: (h) => Math.cos(Math.PI / 3 + h),
  tan_atpi4: (h) => Math.tan(Math.PI / 4 + h), arctan_at1: (h) => Math.atan(1 + h),
  // tier 4 in r, x or σ
  logret: (r) => Math.log1p(r), lognormal: (s) => Math.exp(s * s / 2)
};

// |f − Pₙ| at x and x/2 (and at −x, −x/2): the ratio must be at least 0.75 × 2ⁿ⁺¹, i.e. the error is o(xⁿ).
// A wrong coefficient at a power k ≤ n gives a ratio near 2ᵏ and fails.
function checkOrder(e, n, f, p, label) {
  const terms = T.truncate(e, n), x1 = Math.min(0.3, 10 ** (-5 / (n + 1)));
  for (const s of [1, -1]) {
    const x = s * x1, err = (y) => Math.abs(f(y) - T.evalTerms(e, terms, y, p));
    const a = err(x), b = err(x / 2);
    assert.ok(a < 0.05, `${label}: error ${a} at ${x}, order ${n}`);
    if (b < 1e-14) continue;   // exact to rounding at x/2: nothing left to compare
    const ratio = a / b;
    assert.ok(ratio >= 0.75 * 2 ** (n + 1), `${label} at order ${n}: error ratio ${ratio.toFixed(2)} for x = ${x} (wanted ≥ ${0.75 * 2 ** (n + 1)})`);
  }
}

test('every expansion of tiers 1 to 3 is numerically right at every order it can be asked', () => {
  for (const e of T.LIB.filter((x) => x.tier <= 3)) {
    if (e.key === 'powa' || e.key === 'apow') continue;
    const f = REF[e.key];
    assert.ok(f, 'no reference for ' + e.key);
    const lowest = Math.min(...e.terms.map((t) => t.k));
    for (let n = Math.max(1, lowest); n <= e.max; n++) checkOrder(e, n, f, null, e.key);
  }
});

test('(1 + x)^α at α = 1/2, −1, 3 and aˣ at a = 2, 3: the symbolic coefficients', () => {
  for (const alpha of [0.5, -1, 3]) for (let n = 1; n <= 3; n++) checkOrder(T.BY.powa, n, (x) => (1 + x) ** alpha, { alpha }, 'powa α=' + alpha);
  for (const a of [2, 3]) for (let n = 1; n <= 3; n++) checkOrder(T.BY.apow, n, (x) => a ** x, { a }, 'apow a=' + a);
});

// log n! as a sum, and Hₙ as a sum.
const logFact = (n) => { let s = 0; for (let k = 2; k <= n; k++) s += Math.log(k); return s; };
const H = (n) => { let s = 0; for (let k = 1; k <= n; k++) s += 1 / k; return s; };
// erf by its series (exact for the small arguments used): 2Φ(z) − 1 = erf(z/√2).
const erf = (t) => { let s = 0, term = t, n = 0; while (Math.abs(term) > 1e-18 && n < 60) { s += term / (2 * n + 1); n++; term *= -t * t / n; } return 2 / Math.sqrt(Math.PI) * s; };

test('tier 4: asymptotics in n, compounding and discounting, the rule of 72, the quant approximations', () => {
  const E = T.BY;
  // in 1/n: the error at n and 2n falls by at least 0.75 × 2^(order + 1)
  const inN = (e, f, label) => {
    const terms = T.truncate(e, e.max), err = (n) => Math.abs(f(n) - T.evalTerms(e, terms, n));
    const r = err(100) / err(200);
    assert.ok(r >= 0.75 * 2 ** (e.max + 1), `${label}: ratio ${r}`);
  };
  inN(E.eulerlim, (n) => Math.exp(n * Math.log1p(1 / n)), 'eulerlim');
  inN(E.harmonic, H, 'harmonic');
  // Stirling, relative: n! / (√(2πn)(n/e)ⁿ) − (1 + 1/(12n)) = O(1/n²)
  const stirRel = (n) => Math.abs(Math.exp(logFact(n) - (0.5 * Math.log(2 * Math.PI * n) + n * (Math.log(n) - 1))) - (1 + 1 / (12 * n)));
  assert.ok(stirRel(50) / stirRel(100) >= 0.75 * 4, 'stirling');

  const inSmall = (e, f, p, label, x1) => {
    const terms = T.truncate(e, e.max), err = (y) => Math.abs(f(y) - T.evalTerms(e, terms, y, p));
    const r = err(x1) / err(x1 / 2);
    assert.ok(r >= 0.75 * 2 ** (e.max + 1), `${label}: ratio ${r}`);
  };
  inSmall(E.logret, REF.logret, null, 'logret', 0.02);
  inSmall(E.lognormal, REF.lognormal, null, 'lognormal', 0.2);
  for (const n of [5, 12]) {
    inSmall(E.compound, (r) => (1 + r) ** n, { n }, 'compound n=' + n, 0.01);
    inSmall(E.discount, (r) => (1 + r) ** -n, { n }, 'discount n=' + n, 0.01);
  }
  for (const n of [2, 3, 7]) inSmall(E.nthroot, (x) => (1 + x) ** (1 / n), { n }, 'nthroot n=' + n, 0.02);
  inSmall(E.doubling, (r) => Math.LN2 / Math.log1p(r), null, 'doubling', 0.02);

  // a 10-year 5% annual bond at 5%: D and C from its cash flows; P(y + Δy)/P(y) to second order
  const cf = [...Array(10)].map((_, i) => (i === 9 ? 105 : 5)), y = 0.05;
  const P = (yy) => cf.reduce((s, c, i) => s + c / (1 + yy) ** (i + 1), 0);
  const D = cf.reduce((s, c, i) => s + (i + 1) * c / (1 + y) ** (i + 2), 0) / P(y);
  const Cv = cf.reduce((s, c, i) => s + (i + 1) * (i + 2) * c / (1 + y) ** (i + 3), 0) / P(y);
  inSmall(E.bond, (d) => P(y + d) / P(y), { D, C: Cv }, 'bond', 0.002);

  // an at-the-money call with zero rate: C/S = 2Φ(σ√T/2) − 1 against v/√(2π), v = σ√T (first order)
  const atm = (v) => erf(v / 2 / Math.SQRT2);
  const terms = T.truncate(E.atmcall, 1), errA = (v) => Math.abs(atm(v) - T.evalTerms(E.atmcall, terms, v));
  assert.ok(errA(0.2) / errA(0.1) >= 0.75 * 4, 'atmcall');

  // geometric against arithmetic mean: log(1 + R) normal (0, s²); G − (A − σ²/2) is O(s⁴) while σ²/2 is O(s²)
  const gap = (s) => {
    const A = Math.exp(s * s / 2) - 1, G = 0, varR = Math.exp(s * s) * (Math.exp(s * s) - 1);
    return Math.abs(G - T.evalTerms(E.geomarith, E.geomarith.terms, Math.sqrt(varR), { A }));
  };
  assert.ok(gap(0.1) / gap(0.05) >= 6, 'geomarith');
});

test('the estimation functions agree with the reference functions', () => {
  for (const e of T.LIB.filter((x) => x.fn)) for (const x of [-0.2, -0.05, 0.1, 0.2]) {
    assert.ok(Math.abs(e.fn(x) - REF[e.key](x)) < 1e-12, e.key + ' at ' + x);
  }
});

// ---------- rendering ----------

test('toTex and toText: signs, fractions, the remainder, (x − a)ᵏ, a prefix, 1/n, FR and EN names', () => {
  assert.strictEqual(T.toText(T.BY.sin, 4), 'x − x³/6 + o(x⁴)');
  assert.strictEqual(T.toTex(T.BY.sin, 4), 'x - \\frac{x^{3}}{6} + o\\left(x^{4}\\right)');
  assert.strictEqual(T.toText(T.BY.sqrt1p, 4), '1 + x/2 − x²/8 + x³/16 − 5x⁴/128 + o(x⁴)');
  assert.strictEqual(T.toText(T.BY.sin_atpi6, 2), '1/2 + (√3/2)(x − π/6) − (1/4)(x − π/6)² + o((x − π/6)²)');
  assert.strictEqual(T.toText(T.BY.ecos, 4), 'e(1 − x²/2 + x⁴/6) + o(x⁴)');
  assert.strictEqual(T.toText(T.BY.harmonic, 2), 'ln n + γ + 1/(2n) − 1/(12n²) + o(1/n²)');
  assert.strictEqual(T.toText(T.BY.powa, 2), '1 + αx + α(α − 1)x²/2 + o(x²)');
  assert.strictEqual(T.full(T.BY.th, 3, 'fr').text, 'th x = x − x³/3 + o(x³)');
  assert.strictEqual(T.full(T.BY.th, 3, 'en').text, 'tanh x = x − x³/3 + o(x³)');
  // every expansion at every order renders as TeX that tex.js can draw
  for (const e of T.LIB) for (let n = 0; n <= e.max; n++) TeX.plain(T.full(e, n, 'fr').tex);
});

// ---------- questions ----------

function allQuestions(fn) {
  const st = { from: 2, to: 7 };
  for (const e of T.LIB) for (const type of ['f2dl', 'dl2f', 'est']) {
    if (type === 'dl2f' && e.noReverse) continue;
    if (type === 'est' && !e.fn) continue;
    for (const n of T.ordersFor(e, T.settings(st))) for (let seed = 1; seed <= 3; seed++) fn(e, type, n, seed);
  }
}

test('every question has 6 different choices, one right, and the right one is the expansion asked', () => {
  let count = 0;
  allQuestions((e, type, n, seed) => {
    const rng = require('../js/generator.js').mulberry32(seed * 97 + n);
    const q = T.question(e.key, type, n, rng, { notation: 'fr' });
    const label = `${e.key} ${type} order ${n} seed ${seed}`;
    assert.strictEqual(q.choices.length, 6, label);
    assert.strictEqual(new Set(q.choices.map((c) => c.text)).size, 6, label + ': ' + q.choices.map((c) => c.text).join(' | '));
    assert.ok(q.correct >= 0 && q.correct < 6, label);
    if (q.type === 'f2dl') {
      const want = (e.approx ? T.nameOf(e).text + ' ≈ ' : '') + T.toText(e, n);
      assert.strictEqual(q.choices[q.correct].text, want, label);
    }
    if (q.type === 'dl2f') assert.strictEqual(q.choices[q.correct].text, T.nameOf(e).text, label);
    if (q.type === 'est') assert.strictEqual(q.choices[q.correct].text, T.fmt4(e.fn(q.est.x)), label);
    for (const c of q.choices) TeX.plain(c.tex);   // drawable
    TeX.richPlain(q.prompt);
    count++;
  });
  assert.ok(count > 500, count + ' questions checked');
});

test('wrong choices come from the rules: a sign, k! against k, a sibling, the remainder, the point', () => {
  const G = require('../js/generator.js');
  const rules = new Set();
  for (let s = 1; s <= 30; s++) T.candidates(T.instance(T.BY.sin, 5), G.mulberry32(s)).forEach((c) => rules.add(c.rule));
  for (const r of ['sign', 'fact', 'sibling', 'rem', 'drop', 'coef']) assert.ok(rules.has(r), r);
  const at = T.candidates(T.instance(T.BY.sin_atpi6, 3), G.mulberry32(1)).map((c) => c.rule);
  assert.ok(at.includes('point'));
  // never the true statement: o(x⁴) after x − x³/6 would be true for sin, so the higher remainder is not offered there
  const texts = T.wrongs(T.instance(T.BY.sin, 3), G.mulberry32(5)).map((i) => T.rhs(i).text);
  assert.ok(!texts.includes('x − x³/6 + o(x⁴)'));
});

// ---------- picking and mastery ----------

const S = require('../js/stats.js');
let id = 0;
function round(day, qs, lesson) {
  const [y, m, d] = day.split('-').map(Number);
  return { id: 't' + (id++), startedAt: new Date(y, m - 1, d, 10).toISOString(), mode: 'LEARN', settings: { lesson: lesson || 'taylor-learn' }, score: 0, questions: qs };
}
const ans = (key, ok, ms, extra) => Object.assign({ op: 'ty', key, type: 'f2dl', order: 3, correct: ok, chosenIndex: 0, timeMs: ms, hinted: false, wrongAttempts: ok ? 0 : 1, shown: key, answer: key }, extra || {});

test('mastery: the last 3 days on it, Learn and Sprint together, all right, no hint, median under 6 s', () => {
  const days = ['2026-10-01', '2026-10-02', '2026-10-04'];
  const rs = days.map((d) => round(d, [ans('sin', true, 3000), ans('cos', true, 7000), ans('tan', true, 2000)]));
  rs.push(round('2026-10-04', [ans('tan', true, 2000, { hinted: true })]));
  const m = T.mastery(rs, S.dayKey);
  assert.strictEqual(m.sin, true);
  assert.strictEqual(m.cos, undefined);   // too slow
  assert.strictEqual(m.tan, undefined);   // a hint on the last day
  assert.strictEqual(T.mastery(rs.slice(0, 2), S.dayKey).sin, undefined);   // only 2 days
  // sprint answers count too (timed, never hinted): sprints alone, or Learn and Sprint days mixed
  assert.strictEqual(T.mastery(days.map((d) => round(d, [ans('sin', true, 3000)], 'taylor-sprint-60')), S.dayKey).sin, true);
  const mixed = [round(days[0], [ans('cos', true, 2000)]), round(days[1], [ans('cos', true, 2500)], 'taylor-sprint-120'), round(days[2], [ans('cos', true, 3000)])];
  assert.strictEqual(T.mastery(mixed, S.dayKey).cos, true);
  // a skipped sprint answer on one of those days breaks it
  mixed.push(round(days[1], [ans('cos', false, 900, { skipped: true, unanswered: true, wrongAttempts: 0 })], 'taylor-sprint-60'));
  assert.strictEqual(T.mastery(mixed, S.dayKey).cos, undefined);
});

test('a hinted answer is never good for the fact engine; Taylor facts stay out of the drills', () => {
  const rs = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((d) => round(d, [ans('sin', true, 2000, { hinted: true }), ans('cos', true, 2000)]));
  const f = S.factStats(rs, new Date(2026, 9, 5).getTime());
  const sin = f.filter((x) => x.key === 'ty-sin')[0], cos = f.filter((x) => x.key === 'ty-cos')[0];
  assert.ok(sin && cos);
  assert.strictEqual(sin.wrongRate, 1);
  assert.strictEqual(cos.wrongRate, 0);
  assert.strictEqual(S.drillTargets(f).filter((x) => /^ty-/.test(x.key)).length, 0);
});

test('picking favours what you have never answered, then what is weak', () => {
  const G = require('../js/generator.js');
  const items = [{ key: 'sin', type: 'f2dl' }, { key: 'cos', type: 'f2dl' }, { key: 'tan', type: 'f2dl' }];
  // sin answered fast and right on many days; cos answered slowly and wrong; tan never answered
  const rs = [];
  for (let d = 1; d <= 6; d++) rs.push(round('2026-10-0' + d, [ans('sin', true, 1500), ans('cos', false, 9000)]));
  const facts = S.factStats(rs, new Date(2026, 9, 7).getTime());
  const count = { sin: 0, cos: 0, tan: 0 };
  for (let s = 0; s < 200; s++) count[T.pickSet(items, rs, facts, S.dayKey, G.mulberry32(s), 1)[0].key]++;
  assert.ok(count.tan > count.cos && count.cos > count.sin, JSON.stringify(count));
  // a set of 20 from 3 items repeats them
  assert.strictEqual(T.pickSet(items, rs, facts, S.dayKey, G.mulberry32(1), 20).length, 20);
});

test('settings: tiers, types and orders; only tier 1 never asks a tier 2 to 4 expansion', () => {
  const st = T.settings({ tiers: [1], types: ['f2dl', 'est'], from: 3, to: 4 });
  const pool = T.pool(st);
  assert.ok(pool.every((p) => T.BY[p.key].tier === 1));
  assert.ok(pool.some((p) => p.type === 'est') && !pool.some((p) => p.type === 'dl2f'));
  assert.deepStrictEqual(T.ordersFor(T.BY.sin, st), [3, 4]);
  assert.deepStrictEqual(T.ordersFor(T.BY.esin, st), [4]);   // tiers 2 to 4: their own order
  assert.deepStrictEqual(T.settings({ tiers: [] }).tiers, [1]);
  assert.ok(T.pool(T.settings({ tiers: [4], types: ['dl2f'] })).every((p) => !T.BY[p.key].noReverse));
});

test('relearning: a wrong or hinted Learn answer comes back once, 3 to 5 questions later, in another form; the set stays at 20', () => {
  const G = require('../js/generator.js');
  const twoTypes = { tiers: [1], types: ['f2dl', 'dl2f'], from: 2, to: 5 };
  for (let seed = 1; seed <= 40; seed++) {
    const rng = G.mulberry32(seed), items = T.pickSet(T.pool(twoTypes), [], [], S.dayKey, rng, 20);
    const asked = { key: items[2].key, type: items[2].type, order: 3 };   // question 3 answered wrong; question 4 is next
    const slot = T.relearn(items, 3, asked, twoTypes, rng);
    assert.ok(slot >= 5 && slot <= 7, 'slot ' + slot);   // 3 to 5 questions after question 3
    assert.strictEqual(items.length, 20);
    assert.strictEqual(items[slot].key, asked.key);
    assert.strictEqual(items[slot].again, true);
    assert.notStrictEqual(items[slot].type, asked.type);   // two types allowed: the other one
    // a comeback answered wrong again does not come back
    assert.strictEqual(T.relearn(items, slot + 1, items[slot], twoTypes, rng), -1);
  }
  // one type only: another order (tier 1 has several)
  const oneType = { tiers: [1], types: ['f2dl'], from: 2, to: 5 };
  for (let seed = 1; seed <= 20; seed++) {
    const rng = G.mulberry32(seed), items = T.pickSet(T.pool(oneType), [], [], S.dayKey, rng, 20);
    const asked = { key: 'sin', type: 'f2dl', order: 3 };
    const slot = T.relearn(items, 1, asked, oneType, rng);
    assert.strictEqual(items[slot].type, 'f2dl');
    assert.ok(items[slot].order >= 2 && items[slot].order <= 5 && items[slot].order !== 3, 'order ' + items[slot].order);
  }
  // near the end: question 19 wrong → question 20; question 20 wrong → nothing left to come
  const rng = G.mulberry32(3), items = T.pickSet(T.pool(twoTypes), [], [], S.dayKey, rng, 20);
  assert.strictEqual(T.relearn(items, 19, { key: 'cos', type: 'f2dl', order: 2 }, twoTypes, rng), 19);
  assert.strictEqual(items[19].key, 'cos');
  assert.strictEqual(T.relearn(items, 20, { key: 'tan', type: 'f2dl', order: 2 }, twoTypes, rng), -1);
});
