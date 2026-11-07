// Finance engine and templates. Every procedural template has an independent reference below
// (written separately from js/finance-templates.js, not calling it) and is run on 1,000 seeds.
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/finance-templates.js');

const SEEDS = Array.from({ length: 1000 }, (_, i) => (Math.imul(i + 1, 2654435761) >>> 0));
const inR = (x, lo, hi) => x >= lo - 1e-9 && x <= hi + 1e-9;
const onGrid = (x, lo, hi, step) => inR(x, lo, hi) && Math.abs((x - lo) / step - Math.round((x - lo) / step)) < 1e-6;
const isInt = (x) => Number.isInteger(x);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const oneOf = (x, arr) => arr.includes(x);
const pvCheck = (p) => oneOf(p.c, [100, 1000]) && inR(p.t, 1, 3) && onGrid(p.r, 2, 8, 0.5);
const bankCheck = (p) => oneOf(p.A, [100, 200, 500]) && oneOf(p.E / p.A, [0.05, 0.08, 0.1]) && p.L === p.A - p.E && p.rL < p.rA && onGrid(p.rA, 2, 6, 0.25) && onGrid(p.rL, 0.5, 4, 0.25);
const Z = { 95: 1.6449, 97.5: 1.96, 99: 2.3263 };
const pdf = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

// id → { check(p): params on their grids and realistic, answer(p): reference value, range: [lo, hi] }
const REF = {
  'arith.add': { check: (p) => inR(p.a, 2, 100) && inR(p.b, 2, 100), answer: (p) => p.b + p.a, range: [4, 200] },
  'arith.sub': { check: (p) => inR(p.a, 2, 100) && inR(p.b, 2, 100), answer: (p) => p.b, range: [2, 100] },
  'arith.mul': { check: (p) => inR(p.a, 2, 12) && inR(p.b, 2, 100), answer: (p) => p.b * p.a, range: [4, 1200] },
  'arith.div': { check: (p) => inR(p.a, 2, 12) && inR(p.b, 2, 100), answer: (p) => p.b, range: [2, 100] },

  'quant.pct.of': {
    check: (p) => oneOf(p.x, [5, 10, 12.5, 15, 20, 25, 30, 40, 60, 75]) && p.y <= 2000 && (p.x === 12.5 ? p.y % 8 === 0 : p.y % 20 === 0),
    answer: (p) => (p.x === 12.5 ? p.y / 8 : (p.y / 100) * p.x), range: [1, 1500], integer: true
  },
  'quant.pct.change': { check: (p) => p.c % 5 === 0 && p.c !== 0 && inR(p.c, -50, 50) && p.b > 0, answer: (p) => p.c, range: [-50, 50] },
  'quant.frac.dec': { check: (p) => oneOf(p.d, [2, 3, 4, 5, 6, 8, 9, 12, 16]) && p.n > 0 && p.n < p.d && gcd(p.n, p.d) === 1, answer: (p) => p.n / p.d, range: [0, 1] },
  'quant.dec.frac': { check: (p) => oneOf(p.d, [2, 3, 4, 5, 6, 8, 9, 12, 16]) && p.n > 0 && p.n < p.d && gcd(p.n, p.d) === 1, frac: (p) => [p.n, p.d] },
  'quant.square': { check: (p) => inR(p.x, 11, 99) && p.x % 10 !== 0, answer: (p) => p.x ** 2, range: [121, 9801], integer: true },
  'quant.square.big': { check: (p) => inR(p.x, 101, 130), answer: (p) => p.x ** 2, range: [10201, 16900], integer: true },
  'quant.sqrt.approx': { check: (p) => inR(p.x, 10, 1000) && !isInt(Math.sqrt(p.x)), answer: (p) => p.x ** 0.5, range: [3, 32] },
  'quant.pow2': { check: (p) => inR(p.k, 1, 20), answer: (p) => 2 ** p.k, range: [2, 1048576], integer: true },
  'quant.mul.trick': { check: (p) => oneOf(p.m, [25, 99, 11, 125]) && inR(p.x, 10, 400), answer: (p) => p.m * p.x, range: [110, 50000], integer: true },
  'quant.est.prod': { check: (p) => inR(p.a, 0.11, 0.99) && p.b % 10 === 0 && inR(p.b, 1010, 9990), answer: (p) => p.b * p.a, range: [100, 9900] },
  'quant.rule72': { check: (p) => oneOf(p.r, [2, 3, 4, 6, 8, 9, 12]), answer: (p) => 72 / p.r, range: [6, 36] },
  'quant.compound': { check: (p) => inR(p.r, 2, 10) && oneOf(p.k, [2, 3, 5, 10]), answer: (p) => Math.exp(p.k * Math.log1p(p.r / 100)), range: [1, 2.6] },
  'quant.ln.approx': { check: (p) => onGrid(p.x, 1.01, 1.2, 0.01), answer: (p) => Math.log1p(p.x - 1), range: [0, 0.19] },
  'quant.exp.approx': { check: (p) => onGrid(p.x, 0.01, 0.2, 0.01), answer: (p) => 1 / Math.exp(p.x), range: [0.8, 1] },
  'quant.ev': {
    check: (p) => (p.g === 'die' ? inR(p.k, 1, 3) && inR(p.m, 3, 5) && oneOf(p.c, [1, 2, 3, 5]) : oneOf(p.a, [1, 2, 3, 4, 5]) && oneOf(p.c, [2, 4, 6, 8, 10])),
    answer: (p) => {
      let ev = 0;
      if (p.g === 'die') for (let f = 1; f <= 6; f++) ev += (f >= p.m ? p.k * f : -p.c) / 6;
      else for (const [h1, h2] of [[0, 0], [0, 1], [1, 0], [1, 1]]) ev += ((h1 + h2) * p.a - (h1 + h2 === 0 ? p.c : 0)) / 4;
      return ev;
    },
    range: [-5, 20]
  },

  // ---- C. finance (own constants and formulas, written independently of the templates) ----
  'fin.bp.convert': { check: (p) => onGrid(p.a, 0.5, 6, 0.05) && Math.abs(p.b - p.a) <= 1 + 1e-9 && p.b > 0 && p.b !== p.a, answer: (p) => Math.round((p.b - p.a) * 100), range: [-100, 100], integer: true },
  'fin.pv.annual': { check: pvCheck, answer: (p) => p.c * (1 + p.r / 100) ** -p.t, range: [75, 1000] },
  'fin.pv.cont': { check: pvCheck, answer: (p) => p.c / Math.exp((p.r * p.t) / 100), range: [75, 1000] },
  'fin.fv': { check: pvCheck, answer: (p) => p.c * (1 + p.r / 100) ** p.t, range: [100, 1300] },
  'fin.real.rate': { check: (p) => inR(p.i, 0, 8) && inR(p.pi, 0, 8) && p.i + p.pi > 0, answer: (p) => p.i - p.pi, range: [-8, 8], integer: true },
  'fin.real.rate.exact': { check: (p) => inR(p.i, 0, 8) && inR(p.pi, 1, 8) && p.i !== p.pi, answer: (p) => (100 * (p.i - p.pi)) / (100 + p.pi), range: [-8, 8] },
  'fin.bond.price.1y': { check: (p) => inR(p.c, 1, 8) && inR(p.y, 1, 8), answer: (p) => ((100 + p.c) * 100) / (100 + p.y), range: [90, 110] },
  'fin.bond.price.2y': { check: (p) => inR(p.c, 2, 7) && inR(p.y, 2, 7), answer: (p) => [p.c, 100 + p.c].reduce((s, cf, i) => s + cf / (1 + p.y / 100) ** (i + 1), 0), range: [90, 110] },
  'fin.bond.premium': { check: (p) => inR(p.c, 1, 8) && inR(p.y, 1, 8), correctText: (p) => (p.c > p.y ? 'Above par (above 100)' : p.c < p.y ? 'Below par (below 100)' : 'At par (100)') },
  'fin.zc.price': { check: (p) => oneOf(p.m, [1, 2, 5, 10, 20]) && inR(p.y, 1, 6), answer: (p) => 100 / Math.exp((p.y * p.m) / 100), range: [30, 100] },
  'fin.duration.approx': { check: (p) => oneOf(p.P, [80, 90, 100, 110, 120]) && inR(p.D, 2, 15) && oneOf(Math.abs(p.d), [10, 25, 50, 100]), answer: (p) => p.P - (p.P * p.D * p.d) / 10000, range: [60, 140] },
  'fin.convexity': {
    check: (p) => oneOf(p.P, [80, 90, 100, 110, 120]) && oneOf(p.m, [5, 10, 20, 30]) && oneOf(Math.abs(p.d), [50, 100, 200]),
    answer: (p) => { const dy = p.d / 1e4; return p.P + p.P * (-p.m * dy) + (p.P * (p.m * dy) ** 2) / 2; }, range: [30, 250]
  },
  'fin.duration.zc': { check: (p) => oneOf(p.m, [1, 2, 3, 5, 7, 10, 15, 20, 30]), answer: (p) => p.m, range: [1, 30], integer: true },
  'fin.credit.spread': { check: (p) => onGrid(p.g, 0.5, 5, 0.05) && inR(p.c - p.g, 0.2, 5), answer: (p) => Math.round((p.c - p.g) * 100), range: [20, 500], integer: true },
  'fin.taylor': { check: (p) => inR(p.pi, 0, 8) && inR(p.gap, -3, 3), answer: (p) => 1.5 * p.pi + 1 + p.gap / 2, range: [-0.5, 14.5] },
  'fin.return.multi': { check: (p) => [p.a, p.b].every((x) => oneOf(x, [-50, -25, -20, -10, -5, 5, 10, 20, 25, 50])), answer: (p) => p.a + p.b + (p.a * p.b) / 100, range: [-75, 125] },
  'fin.return.log': { check: (p) => inR(p.s, 80, 125) && p.s !== 100, answer: (p) => 100 * (Math.log(p.s) - Math.log(100)), range: [-23, 23] },
  'fin.vol.annualize': { check: (p) => onGrid(p.s, 0.5, 3, 0.25), answer: (p) => p.s * 252 ** 0.5, range: [7, 48] },
  'fin.vol.deannualize': { check: (p) => onGrid(p.s, 10, 60, 5), answer: (p) => p.s / 252 ** 0.5, range: [0.5, 4] },
  'fin.vol.horizon': { check: (p) => onGrid(p.s, 0.5, 3, 0.25) && oneOf(p.h, [4, 9, 16, 25]), answer: (p) => p.s * p.h ** 0.5, range: [1, 15] },
  'fin.sharpe': { check: (p) => inR(p.mu, 4, 15) && inR(p.rf, 0, 4) && p.mu > p.rf && oneOf(p.s, [5, 8, 10, 12, 15, 20, 25]), answer: (p) => (p.mu - p.rf) / p.s, range: [0, 3] },
  'fin.nii': { check: bankCheck, answer: (p) => (p.A * p.rA) / 100 - (p.L * p.rL) / 100, range: [0, 30] },
  'fin.nii.shock': { check: (p) => bankCheck(p) && oneOf(p.d, [25, 50, 100]), answer: (p) => (-p.L * p.d) / 10, range: [-5000, 0] },
  'fin.eve.gap': {
    check: (p) => bankCheck({ ...p, rL: 1, rA: 3 }) && inR(p.DA, 3, 10) && oneOf(p.DL, [0.5, 1, 2]) && oneOf(Math.abs(p.d), [50, 100, 200]),
    answer: (p) => ((p.DL * p.L - p.DA * p.A) * p.d) / 10000, range: [-100, 100]
  },
  'fin.eve.outlier': { check: (p) => oneOf(p.t1, [20, 30, 40, 50, 60]) && inR(Math.abs(p.e), 2, 12), correctText: (p) => (Math.abs(p.e) > 0.15 * p.t1 ? 'Yes: |ΔEVE| is above 15% of Tier 1' : 'No: |ΔEVE| is below 15% of Tier 1') },
  'fin.var.gauss': { check: (p) => oneOf(p.V, [1, 2, 5, 10]) && oneOf(p.s, [0.5, 1, 1.5, 2]) && oneOf(p.a, [95, 99]), answer: (p) => Z[p.a] * (p.s / 100) * p.V * 1e3, range: [5, 500] },
  'fin.var.horizon': { check: (p) => oneOf(p.v, [10, 20, 25, 40, 50, 100, 200]) && oneOf(p.h, [4, 9, 10, 16, 25]), answer: (p) => p.v * p.h ** 0.5, range: [20, 1000] },
  'fin.es.gauss': { check: (p) => oneOf(p.a, [97.5, 99]), answer: (p) => ((p.s / 100) * p.V * 1e3 * pdf(Z[p.a])) / (1 - p.a / 100), range: [5, 600] },
  'fin.var.port2': {
    check: (p) => oneOf(p.rho, [-0.5, 0, 0.5, 0.8, 1]) && oneOf(p.a, [95, 99]),
    answer: (p) => { const s = [p.v1 * p.s1 * 10, p.v2 * p.s2 * 10], M = [[1, p.rho], [p.rho, 1]]; let v = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) v += s[i] * M[i][j] * s[j]; return Z[p.a] * Math.sqrt(v); },
    range: [0, 500]
  },
  'fin.backtest.expected': { check: (p) => oneOf(p.a, [95, 97.5, 99]) && oneOf(p.N, [250, 500, 1000]), answer: (p) => p.N * (1 - p.a / 100), range: [2.5, 50] },
  'fin.spread.cost': { check: (p) => oneOf(p.m, [50, 100]) && oneOf(p.V, [1, 5, 10]), answer: (p) => (p.s * p.V * 500) / p.m, range: [0, 50] },
  'fin.sqrt.impact': { check: (p) => oneOf(p.s, [1, 1.5, 2, 3]) && oneOf(p.q, [1, 4, 9, 16, 25, 36]), answer: (p) => (p.s * Math.sqrt(p.q)) / 10, range: [0.1, 1.8] },
  'fin.lvar': { check: (p) => oneOf(p.v, [50, 100, 150, 200]) && oneOf(p.s, [0.1, 0.2, 0.5, 1]) && oneOf(p.V, [1, 5, 10]), answer: (p) => p.v + 5 * p.s * p.V, range: [50, 250] },
  'fin.gauss.cond.mean': { check: (p) => oneOf(p.rho, [0.2, 0.5, 0.6, 0.8]) && inR(p.y, -2, 2) && p.y !== 0, answer: (p) => p.y * p.rho, range: [-1.6, 1.6] },
  'fin.gauss.cond.var': { check: (p) => oneOf(p.rho, [0.2, 0.5, 0.6, 0.8]), answer: (p) => (1 - p.rho) * (1 + p.rho), range: [0.36, 0.96] },
  'fin.kalman.step': {
    check: (p) => inR(p.P, 1, 4) && oneOf(p.R, [1, 2, 4]) && inR(p.y, -4, 4) && p.y !== 0,
    answer: (p) => ({ gain: p.P / (p.P + p.R), mean: (p.P * p.y) / (p.P + p.R), var: (p.P * p.R) / (p.P + p.R) })[p.ask], range: [-4, 4]
  },
  'fin.mahalanobis.indep': { check: (p) => p.s.length >= 2 && p.s.length <= 3 && p.s.every((x) => oneOf(x, [1, 2, 4])), answer: (p) => p.x.reduce((t, x, i) => t + (x / p.s[i]) ** 2, 0), range: [0.25, 27] },
  'fin.rst.linear': { check: (p) => oneOf(p.rho, [0, 0.5, 0.8]) && oneOf(p.w, [1, -1]) && inR(p.l, 1, 4), answer: (p) => p.l / Math.sqrt(2 + 2 * p.rho * p.w), range: [0.5, 6.4] }
};

const procedural = F.list().filter((t) => t.family !== 'intuition');
const asText = (x) => (Math.abs(x) < 1e-4 && x !== 0 ? x.toFixed(12) : String(x));

test('every procedural template has an independent reference', () => {
  const missing = procedural.map((t) => t.id).filter((id) => !REF[id]);
  assert.deepEqual(missing, []);
});

for (const t of procedural) {
  test(`${t.id}: 1,000 seeds`, () => {
    const ref = REF[t.id];
    if (!ref) return;
    for (const seed of SEEDS) {
      const q = F.make(t.id, seed);
      const where = `${t.id} seed ${seed}: ${q.prompt}`;
      assert.ok(ref.check(q.p), `params off grid: ${where} ${JSON.stringify(q.p)}`);
      if (q.kind === 'choice') {   // procedural multiple choice
        assert.equal(q.answerText, ref.correctText(q.p), where);
        assert.equal(q.options.length, 4, where);
        assert.equal(new Set(q.options).size, 4, where);
        assert.ok(q.steps.length > 0 && q.why.length > 40, where);
        continue;
      }
      if (q.kind === 'fraction') {
        assert.deepEqual(q.frac, ref.frac(q.p), where);
        assert.ok(F.check(q, q.answer).ok, where);
        assert.ok(!F.check(q, String(q.p.n / q.p.d)).ok, 'a decimal is not a fraction: ' + where);
        for (const d of q.distractors) assert.ok(!F.check(q, d).ok, `distractor ${d} accepted: ${where}`);
      } else {
        const want = ref.answer(q.p);
        assert.ok(Number.isFinite(q.answer), where);
        assert.ok(Math.abs(q.answer - want) <= 1e-9 * Math.max(1, Math.abs(want)), `${where}: got ${q.answer}, want ${want}`);
        assert.ok(inR(q.answer, ref.range[0], ref.range[1]), `out of range: ${where} = ${q.answer}`);
        if (ref.integer) assert.ok(isInt(q.answer), where);
        // displayed with the declared precision
        const shown = F.fmt(q.answer, q.dp);
        assert.ok(!shown.includes('.') || shown.split('.')[1].length <= q.dp, where);
        // tolerance: the exact value and the displayed (rounded) value pass, every distractor fails
        assert.ok(F.check(q, asText(q.answer)).ok, `exact rejected: ${where}`);
        assert.ok(F.check(q, shown).ok, `rounded rejected: ${where}`);
        for (const d of q.distractors) {
          assert.ok(Number.isFinite(d), where);
          assert.ok(!F.check(q, asText(d)).ok, `distractor ${d} accepted: ${where}`);
        }
        if (q.auto) assert.ok(F.autoOk(q, shown), `auto-accept missed: ${where}`);
      }
      assert.equal(q.distractors.length, 3, `distractors: ${where} ${JSON.stringify(q.distractors)}`);
      assert.equal(new Set(q.distractors.map(String)).size, 3, where);
      const shownAnswer = q.kind === 'fraction' ? q.frac[0] + ' / ' + q.frac[1] : q.answerText;   // a fraction is drawn as one
      assert.ok(q.stepsText.join(' ').includes(shownAnswer), `explanation lacks ${shownAnswer}: ${where}`);
      if (q.unit || (q.tol && q.tol.type !== 'exact')) assert.ok(q.ask.length > 0, `no answer instruction: ${where}`);
      // as multiple choice: 4 distinct options, one correct
      const mc = F.make(t.id, seed, { choice: true });
      assert.equal(mc.options.length, 4, where);
      assert.equal(new Set(mc.options).size, 4, where);
      assert.equal(mc.options[mc.correct], mc.kind === 'choice' && q.kind === 'fraction' ? q.answer : q.answerText, where);
    }
  });
}

test('templates follow the contract', () => {
  for (const t of F.list()) {
    assert.match(t.id, /^[a-z0-9]+(\.[a-z0-9]+)+$/, t.id);
    assert.ok(['arith', 'quant', 'fin', 'intuition'].includes(t.family), t.id);
    assert.ok([1, 2, 3].includes(t.difficulty), t.id);
    assert.ok(t.category, t.id);
    if (t.kind !== 'choice') assert.ok(t.formula, 'formula missing: ' + t.id);
  }
});

test('the same (template, seed) gives the same question', () => {
  for (const t of F.list()) {
    const a = F.make(t.id, 12345), b = F.make(t.id, 12345, {});
    assert.equal(a.prompt, b.prompt);
    assert.deepEqual(a.steps, b.steps);
    assert.deepEqual(F.make(t.id, 777, { choice: true }).options, F.make(t.id, 777, { choice: true }).options);
  }
  const prompts = new Set(SEEDS.slice(0, 50).map((s) => F.make('quant.square', s).prompt));
  assert.ok(prompts.size > 20, 'different seeds give different questions');
});

test('parse: units, commas, signs, spaces', () => {
  assert.equal(F.parse('90.7', ''), 90.7);
  assert.equal(F.parse('90,7', ''), 90.7);
  assert.equal(F.parse(' -5.1 ', ''), -5.1);
  assert.equal(F.parse('−5.1', ''), -5.1);
  assert.equal(F.parse('1 000', ''), 1000);
  assert.equal(F.parse('1,234.5', ''), 1234.5);
  assert.equal(F.parse('1,234,567', ''), 1234567);
  assert.equal(F.parse('.5', ''), 0.5);
  assert.equal(F.parse('7%', '%'), 7);
  assert.equal(F.parse('7', '%'), 7);
  assert.equal(F.parse('7%', ''), 0.07);
  assert.equal(F.parse('0.07', ''), 0.07);
  assert.equal(F.parse('25bp', 'bp'), 25);
  assert.equal(F.parse('25 bps', '%'), 0.25);
  assert.equal(F.parse('1.3%', 'bp'), 130);
  assert.ok(Math.abs(F.parse('25bp', '') - 0.0025) < 1e-12);
  assert.equal(F.parse('97.09 €', '€'), 97.09);
  assert.equal(F.parse('€97.09', '€'), 97.09);
  assert.equal(F.parse('12 years', 'years'), 12);
  assert.equal(F.parse('12y', 'years'), 12);
  assert.equal(F.parse('7%', '€'), null);
  for (const bad of ['', 'abc', '1.2.3', '--4', '5-', '.']) assert.equal(F.parse(bad, ''), null, bad);
  assert.deepEqual(F.parseFraction('3/8'), [3, 8]);
  assert.deepEqual(F.parseFraction(' 3 / 8 '), [3, 8]);
  assert.equal(F.parseFraction('3/0'), null);
  assert.equal(F.parseFraction('0.375'), null);
});

test('round and fmt', () => {
  assert.equal(F.round(1.005, 2), 1.01);
  assert.equal(F.round(-2.5, 0), -3);
  assert.equal(F.fmt(-0.0001, 2), '0');
  assert.equal(F.fmt(-5.1, 1), '−5.1');
  assert.equal(F.fmt(2.50, 2), '2.5');
  assert.equal(F.fmt(1 / 3, 3), '0.333');
});

test('tolerances', () => {
  assert.ok(F.within({ type: 'exact' }, 5, 5));
  assert.ok(!F.within({ type: 'exact' }, 5.0001, 5));
  assert.ok(F.within({ type: 'round' }, 0.33, 1 / 3, 2));
  assert.ok(F.within({ type: 'round' }, 1 / 3, 1 / 3, 2));
  assert.ok(!F.within({ type: 'round' }, 0.34, 1 / 3, 2));
  assert.ok(F.within({ type: 'abs', v: 0.005 }, 0.08, 0.077));
  assert.ok(!F.within({ type: 'abs', v: 0.005 }, 0.083, 0.077));
  assert.ok(F.within({ type: 'rel', v: 0.01 }, 99.1, 100));
  assert.ok(!F.within({ type: 'rel', v: 0.01 }, 98.9, 100));
});

test('sprint auto-accept fires only on the full displayed answer', () => {
  const q = F.make('quant.frac.dec', SEEDS.find((s) => { const x = F.make('quant.frac.dec', s); return x.p.n === 1 && x.p.d === 3; }));
  assert.equal(q.answerText, '0.333');
  assert.ok(!F.autoOk(q, '0.3'));
  assert.ok(!F.autoOk(q, '0.33'));
  assert.ok(F.autoOk(q, '0.333'));
  assert.ok(F.autoOk(q, '0,333'));
  const est = F.make('quant.sqrt.approx', 5);
  assert.equal(est.auto, false, 'estimates need Enter');
  assert.ok(!F.autoOk(est, F.fmt(est.answer, 2)));
  assert.ok(F.check(est, F.fmt(est.answer * 1.009, 2)).ok);
});

test('selector: positive weights with a floor, weak templates drawn more often', () => {
  assert.equal(F.weight(null, 2000), 3);
  assert.equal(F.weight({ n: 10, acc: 1, med: 1000 }, 2000), 1);
  assert.ok(F.weight({ n: 10, acc: 0.5, med: 4000 }, 2000) > F.weight({ n: 10, acc: 0.9, med: 2000 }, 2000));
  assert.ok(F.weight({ n: 10, acc: 0, med: 1e9 }, 2000) <= 5);
  const G = require('../js/generator.js');
  const rng = G.mulberry32(42), counts = { a: 0, b: 0 };
  const w = (id) => (id === 'a' ? F.weight({ n: 10, acc: 0.4, med: 3000 }, 2000) : F.weight({ n: 10, acc: 1, med: 1500 }, 2000));
  for (let i = 0; i < 4000; i++) counts[F.weightedPick(rng, ['a', 'b'], w)]++;
  assert.ok(counts.a > 2 * counts.b, JSON.stringify(counts));
  assert.ok(counts.b > 400, 'the floor keeps strong templates in rotation');
  const src = F.makeSource(['quant.square', 'quant.pow2'], G.mulberry32(1));
  let prev = null;
  for (let i = 0; i < 50; i++) { const x = src(); assert.notEqual(x.tpl, prev); prev = x.tpl; }
});

test('mixed plan: families in turn, difficulty rising', () => {
  const G = require('../js/generator.js');
  const plan = F.mixedPlan(20, G.mulberry32(3), ['arith', 'quant']);
  assert.equal(plan.length, 20);
  const diffs = plan.map((x) => F.get(x.tpl).difficulty);
  assert.ok(diffs[0] <= diffs[19]);
  assert.ok(plan.every((x) => ['arith', 'quant'].includes(F.get(x.tpl).family)));
  assert.deepEqual(plan.map((x) => F.make(x.tpl, x.seed).prompt), plan.map((x) => F.make(x.tpl, x.seed).prompt));
});

test('finance stats, mode keys, labels and report section', () => {
  const S = require('../js/stats.js'), P = require('../js/progression.js');
  const q = (tpl, fam, cat, extra) => ({ op: 'fin', tpl, seed: 1, fam, cat, shown: 'x', answer: '1', timeMs: 2000, wrongAttempts: 0, correct: true, ...extra });
  const rounds = [
    { id: 'a', startedAt: '2026-10-20T10:00:00Z', mode: 'FINANCE', settings: { kind: 'sprint', duration: 60 }, score: 2,
      questions: [q('quant.pow2', 'quant', 'Squares and powers'), q('quant.pow2', 'quant', 'Squares and powers', { timeMs: 4000 }), q('fin.nii', 'fin', 'Banks and ALM', { skipped: true, correct: false }), q('fin.nii', 'fin', 'Banks and ALM', { unanswered: true, correct: false })] },
    { id: 'd', startedAt: '2026-10-21T12:00:00Z', mode: 'FINANCE', settings: { kind: 'sprint', duration: 60 }, score: 0,
      questions: [q('quant.pow2', 'quant', 'Squares and powers', { unanswered: true, learned: true, correct: false, pausedMs: 20000 })] },
    { id: 'b', startedAt: '2026-10-21T10:00:00Z', mode: 'FINANCE', settings: { kind: 'practice' }, score: 0,
      questions: [q('fin.nii', 'fin', 'Banks and ALM', { correct: false, wrongAttempts: 1, timeMs: 9000 })] },
    { id: 'c', startedAt: '2026-10-21T11:00:00Z', mode: 'P2', settings: {}, score: 20, questions: [] }
  ];
  const fs = S.financeStats(rounds);
  assert.equal(fs.n, 5);   // cut off by the clock: left out, unless you paused to learn it
  assert.equal(fs.right, 2);
  assert.equal(fs.sprints.length, 2);
  assert.deepEqual(fs.sprints[0], { startedAt: '2026-10-20T10:00:00Z', score: 2, duration: 60 });
  assert.equal(fs.tpl['quant.pow2'].acc, 2 / 3);   // paused to learn = a miss
  assert.equal(fs.tpl['quant.pow2'].med, 2000);
  assert.equal(fs.tpl['fin.nii'].acc, 0);   // skipped and wrong both miss
  assert.equal(fs.tpl['fin.nii'].med, 9000);   // a skip's time is not a solving time
  assert.equal(fs.cat['Banks and ALM'].n, 2);
  assert.equal(fs.ref.quant, 2000);
  assert.ok(F.weight(fs.tpl['fin.nii'], fs.ref.fin) > F.weight(fs.tpl['quant.pow2'], fs.ref.quant));
  assert.equal(S.effMode(rounds[0]), 'FINANCE-sprint-60');
  assert.equal(S.effMode(rounds.find((r) => r.id === 'b')), 'FINANCE-practice');
  assert.equal(S.effMode({ mode: 'FINANCE', settings: { kind: 'mixed', count: 20 } }), 'FINANCE-mixed');
  assert.equal(P.modeLabel('FINANCE-sprint-60'), 'Finance sprint, 60 s');
  assert.equal(P.modeLabel('FINANCE-intuition'), 'Finance intuition');
  assert.equal(P.modeLabel('FINANCE-mixed'), 'Finance interview mix');
  assert.deepEqual(require('../js/generator.js').factKeys(rounds[0].questions[0]), []);   // kept out of the weak-fact engine
  const rep = P.summary({ rounds, settings: {} }, Date.parse('2026-10-21T12:00:00Z'));
  assert.match(rep, /## Finance tab/);
  assert.match(rep, /Banks and ALM 0% of 2/);
  assert.match(rep, /Weakest templates: fin\.nii 0% of 2/);
});
