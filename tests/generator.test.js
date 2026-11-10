const test = require('node:test');
const assert = require('node:assert');
const G = require('../js/generator.js');

test('mulberry32 is deterministic for a seed', () => {
  const a = G.mulberry32(42), b = G.mulberry32(42);
  for (let i = 0; i < 100; i++) assert.strictEqual(a(), b());
  const c = G.mulberry32(43);
  assert.notStrictEqual(G.mulberry32(42)(), c());
});

test('Normal questions follow Zetamac rules', () => {
  const rng = G.mulberry32(1);
  const s = G.modeSettings('P3');
  const seen = { add: 0, sub: 0, mul: 0, div: 0 };
  for (let i = 0; i < 20000; i++) {
    const q = G.generate(s, rng);
    seen[q.op]++;
    if (q.op === 'add' || q.op === 'sub') {
      assert.ok(q.a >= 2 && q.a <= 100 && q.b >= 2 && q.b <= 100);
    } else {
      assert.ok(q.a >= 2 && q.a <= 12, 'first factor / divisor in 2–12');
      assert.ok(q.b >= 2 && q.b <= 100);
    }
    if (q.op === 'add') { assert.strictEqual(q.shown, `${q.a} + ${q.b}`); assert.strictEqual(q.answer, q.a + q.b); }
    if (q.op === 'sub') { assert.strictEqual(q.shown, `${q.a + q.b} − ${q.a}`); assert.strictEqual(q.answer, q.b); }
    if (q.op === 'mul') { assert.strictEqual(q.shown, `${q.a} × ${q.b}`); assert.strictEqual(q.answer, q.a * q.b); }
    if (q.op === 'div') {
      assert.strictEqual(q.shown, `${q.a * q.b} ÷ ${q.a}`);
      assert.ok(Number.isInteger(q.answer));
      assert.strictEqual((q.a * q.b) / q.a, q.answer);
    }
  }
  // Uniform op choice: each about 25%.
  for (const op in seen) assert.ok(Math.abs(seen[op] / 20000 - 0.25) < 0.02, op + ' ' + seen[op]);
});

test('ranges are inclusive and fully covered', () => {
  const rng = G.mulberry32(7);
  const s = G.modeSettings('TABLES');
  const as = new Set(), bs = new Set();
  for (let i = 0; i < 5000; i++) { const q = G.generate(s, rng); as.add(q.a); bs.add(q.b); assert.ok(q.op === 'mul' || q.op === 'div'); }
  assert.strictEqual(as.size, 11); assert.strictEqual(bs.size, 11);
  assert.ok(as.has(2) && as.has(12) && bs.has(2) && bs.has(12));
});

test('never the same question twice in a row', () => {
  const s = G.modeSettings('TABLES'); s.ranges.mul = { a: [2, 3], b: [2, 3] }; // tiny space
  const gen = G.makeGenerator(s, G.mulberry32(3));
  let last = null;
  for (let i = 0; i < 2000; i++) { const q = gen.next(); assert.notStrictEqual(q.shown, last); last = q.shown; }
});

test('fact keys', () => {
  assert.deepStrictEqual(G.factKeys(G.makeQuestion('mul', 8, 7)), ['7x8']);
  assert.deepStrictEqual(G.factKeys(G.makeQuestion('div', 7, 8)), ['7x8']); // 56 ÷ 7
  assert.deepStrictEqual(G.factKeys(G.makeQuestion('mul', 8, 36)), ['8x30s', '8x36']);
  assert.deepStrictEqual(G.factKeys(G.makeQuestion('div', 8, 36)), ['8x30s', '8x36']); // 288 ÷ 8
  assert.deepStrictEqual(G.factKeys(G.makeQuestion('add', 47, 38)), ['add-carry', 'add-2d+2d']);
  assert.deepStrictEqual(G.factKeys(G.makeQuestion('add', 41, 7)), ['add-nocarry', 'add-2d+1d']);
  assert.deepStrictEqual(G.factKeys(G.makeQuestion('sub', 47, 85)), ['sub-borrow', 'sub-3d-2d']); // 132 − 47
  assert.deepStrictEqual(G.factKeys(G.makeQuestion('sub', 21, 34)), ['sub-noborrow', 'sub-2d-2d']); // 55 − 21
});

test('fromKey builds questions matching the key', () => {
  const rng = G.mulberry32(9);
  for (const key of ['7x8', '6x12', '8x36', '8x30s', '7x90s', 'add-carry', 'sub-borrow', 'sub-3d-2d', 'add-2d+1d']) {
    for (let i = 0; i < 50; i++) {
      const q = G.fromKey(key, rng);
      assert.ok(q, key);
      assert.ok(G.factKeys(q).includes(key), key + ' → ' + q.shown);
    }
  }
  assert.strictEqual(G.fromKey('iv-frac', rng), null);
});

test('families', () => {
  assert.deepStrictEqual(G.family(72), [[6, 12], [8, 9]]);
  assert.deepStrictEqual(G.family(36), [[3, 12], [4, 9], [6, 6]]);
  assert.strictEqual(G.familyText(72), '72 = 6×12 = 8×9');
});

test('advice chunks divisions', () => {
  assert.strictEqual(G.advice(G.makeQuestion('div', 7, 91)), 'Chunk it: 630 ÷ 7 = 90, 7 ÷ 7 = 1 → 91.');
  assert.match(G.advice(G.makeQuestion('mul', 8, 39)), /Round up: 8×40 = 320/);
});

test('mixed generator draws ~70% from the pool', () => {
  const rng = G.mulberry32(5);
  const gen = G.makeMixedGenerator({ pool: [{ key: '8x9', weight: 1 }, { key: '7x13', weight: 1 }], share: 0.7, base: G.modeSettings('P2'), rng });
  let hits = 0;
  for (let i = 0; i < 5000; i++) { const k = G.factKeys(gen.next()); if (k.includes('8x9') || k.includes('7x13')) hits++; }
  assert.ok(hits / 5000 > 0.6 && hits / 5000 < 0.8, String(hits));
});

test('interview answers accept equivalent forms', () => {
  assert.strictEqual(G.parseAnswer('.5'), 0.5);
  assert.strictEqual(G.parseAnswer('1/2'), 0.5);
  assert.strictEqual(G.parseAnswer('-3'), -3);
  assert.strictEqual(G.parseAnswer('1/0'), null);
  assert.strictEqual(G.parseAnswer('abc'), null);
  const half = { answer: 0.5 };
  for (const s of ['0.5', '.5', '1/2', '2/4']) assert.ok(G.checkInterview(half, s), s);
  assert.ok(!G.checkInterview(half, '0.4'));
  const fiveTwelfths = { answer: 5 / 12, tol: 0.0005 };
  assert.ok(G.checkInterview(fiveTwelfths, '5/12'));
  assert.ok(G.checkInterview(fiveTwelfths, '0.417'));
  assert.ok(!G.checkInterview(fiveTwelfths, '0.42'));
  const mag = { answer: 1000, rel: 0.05 };
  assert.ok(G.checkInterview(mag, '1040') && !G.checkInterview(mag, '1100'));
});

test('interview questions are self-consistent', () => {
  const rng = G.mulberry32(11);
  for (let i = 0; i < 3000; i++) {
    const q = G.interviewQuestion(rng);
    assert.ok(['int', 'dec', 'frac', 'pct', 'mag'].includes(q.type));
    assert.ok(isFinite(q.answer));
    if (q.type !== 'mag') assert.ok(G.checkInterview(q, q.answerText), q.shown + ' = ' + q.answerText);
  }
});

test('weighted pool draws in proportion to weights', () => {
  const rng = G.mulberry32(21);
  const gen = G.makeMixedGenerator({ pool: [{ key: '7x8', weight: 6 }, { key: '2x3', weight: 0.25 }], share: 1, base: G.modeSettings('TABLES'), rng });
  const n = { '7x8': 0, '2x3': 0 };
  for (let i = 0; i < 20000; i++) n[G.factKeys(gen.next())[0]]++;
  // noRepeat lets 2x3 through a little more often than 1/24 (consecutive 7x8 duplicates are re-drawn), so allow a wide band.
  const ratio = n['7x8'] / n['2x3'];
  assert.ok(ratio > 8 && ratio < 30, String(ratio));
});

// ---------- tricks ----------

// What each trick must be: the right numbers, and an answer you can type without long decimals.
const TRICK_RULES = {
  sqmem: (q) => q.a >= 11 && q.a <= 30,
  sq5: (q) => q.a % 10 === 5 && q.a >= 15 && q.a <= 95,
  sq50: (q) => Math.abs(q.a - 50) >= 1 && Math.abs(q.a - 50) <= 9,
  sq100: (q) => Math.abs(q.a - 100) >= 1 && Math.abs(q.a - 100) <= 12,
  diff: (q) => (q.a + q.b) % 20 === 0 && q.b - q.a >= 2 && q.b - q.a <= 18,
  x11: (q) => (q.a === 11 || q.b === 11) && Math.max(q.a, q.b) >= 12 && Math.max(q.a, q.b) <= 99,
  x25: (q) => (q.a === 25 || q.b === 25) && q.a * q.b / 25 >= 12 && q.a * q.b / 25 <= 99,
  near100: (q) => q.a >= 88 && q.a <= 99 && q.b >= 88 && q.b <= 99,
  pct: (q) => Number.isInteger(q.answer),
  pctswap: (q) => Number.isInteger(q.answer) && [20, 25, 50].includes(q.b),
  frac: (q) => q.a < q.b && /^0\.\d{1,4}$/.test(q.answerText),
  dec2frac: (q) => /^0\.\d{1,4}$/.test(q.shown) && q.frac[0] === q.a && q.frac[1] === q.b,
  fracadd: (q) => q.frac[1] > 1 && q.frac[1] <= 60,
  fracsub: (q) => q.answer > 0 && q.frac[1] > 1 && q.frac[1] <= 60,
  fd: (q) => q.a < q.b && gcd(q.a, q.b) === 1 && (q.b <= 12 || [16, 20, 25].includes(q.b)),
  df: (q) => q.a < q.b && gcd(q.a, q.b) === 1 && q.frac[0] === q.a && q.frac[1] === q.b,
  fact: (q) => q.a >= 3 && q.a <= 10 && q.shown === q.a + '!' && q.answer === [...Array(q.a)].reduce((f, _, i) => f * (i + 1), 1),
  binom: (q) => q.a >= 4 && q.a <= 10 && q.b >= 2 && q.b <= q.a - 2 && q.shown === q.a + ' choose ' + q.b &&
    q.answer === fac(q.a) / (fac(q.b) * fac(q.a - q.b))
};
const fac = (n) => (n <= 1 ? 1 : n * fac(n - 1));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

test('every trick type gives the right answer, in range, and clean', () => {
  const rng = G.mulberry32(5);
  assert.deepStrictEqual(Object.keys(G.trickNames()).sort(), Object.keys(TRICK_RULES).sort());
  for (const type of Object.keys(TRICK_RULES)) {
    for (let i = 0; i < 2000; i++) {
      const q = G.trickQuestion(type, rng);
      assert.strictEqual(q.op, 'tr');
      assert.strictEqual(q.type, type);
      assert.ok(TRICK_RULES[type](q), type + ': ' + q.shown);
      if (/^sq/.test(type)) { assert.strictEqual(q.shown, q.a + '²'); assert.strictEqual(q.answer, q.a * q.a); }
      else if (/^pct/.test(type)) { assert.strictEqual(q.shown, `${q.a}% of ${q.b}`); assert.strictEqual(q.answer, q.a * q.b / 100); }
      else if (type === 'fd') {
        // Exact when it terminates, else 3 places: rounded, with the cut-off form as answerAlt.
        assert.strictEqual(q.shown, `${q.a}/${q.b}`);
        assert.ok(Math.abs(Number(q.answerText) - q.a / q.b) <= 0.0005, q.shown + ' → ' + q.answerText);
        if (q.answerAlt) assert.strictEqual(q.answerAlt, (Math.floor(q.a * 1000 / q.b) / 1000).toFixed(3));
      }
      else if (type === 'frac') { assert.strictEqual(q.shown, `${q.a} ÷ ${q.b}`); assert.strictEqual(Number(q.answerText), q.a / q.b); }
      else if (q.frac) {
        // Fraction answers: lowest terms, and equal to the question's value.
        const [n, d] = q.frac;
        assert.strictEqual(gcd(n, d), 1, type + ': ' + q.answerText);
        assert.strictEqual(q.answerText, n + '/' + d);
        const value = type === 'dec2frac' ? Number(q.shown) : type === 'df' ? q.a / q.b : q.a[0] / q.a[1] + (type === 'fracadd' ? 1 : -1) * q.b[0] / q.b[1];
        assert.ok(Math.abs(n / d - value) < 1e-9, type + ': ' + q.shown + ' = ' + q.answerText);
        if (type === 'df') assert.ok(Math.abs(parseFloat(q.shown) - value) <= 0.0005, q.shown);
      }
      else if (type === 'fact' || type === 'binom') { /* checked by its rule above */ }
      else { assert.strictEqual(q.shown, `${q.a} × ${q.b}`); assert.strictEqual(q.answer, q.a * q.b); }
      // The worked advice ends on the answer, so it can't drift from the question.
      // By heart (fd, df) may name the answer without an arrow ("Know it by heart: 1/25 = 0.04.").
      if (type === 'fd' || type === 'df') assert.ok(G.advice(q).includes(q.answerText), type + ': ' + G.advice(q));
      else assert.ok(G.advice(q).endsWith('→ ' + (q.answerText || q.answer) + '.') || type === 'sqmem', type + ': ' + G.advice(q));
    }
  }
});

test('a trick rebuilt from its numbers is the same question, and replays exactly', () => {
  const rng = G.mulberry32(9);
  for (const type of Object.keys(G.trickNames())) {
    const q = G.trickQuestion(type, rng);
    const again = G.makeTrick(type, q.a, q.b);
    assert.strictEqual(again.shown, q.shown);
    assert.strictEqual(again.answer, q.answer);
    const gen = G.makeMixedGenerator({ pool: [{ q: { op: 'tr', type, a: q.a, b: q.b }, weight: 1 }], share: 1, base: G.modeSettings('SQUARES'), rng });
    assert.strictEqual(gen.next().shown, q.shown);
    // Stored rounds go through JSON; fraction operands are [n, d] pairs and must survive it.
    const stored = JSON.parse(JSON.stringify(q));
    assert.deepStrictEqual(G.makeTrick(type, stored.a, stored.b).frac, q.frac);
  }
});

test('trick modes draw only their own tricks and stay off the Zetamac ops', () => {
  const rng = G.mulberry32(11);
  for (const mode of ['SQUARES', 'PERCENT', 'TRICKS']) {
    const s = G.modeSettings(mode), seen = new Set();
    assert.strictEqual(s.duration, 60);
    assert.strictEqual(s.ops, undefined);
    const gen = G.makeGenerator(s, rng);
    for (let i = 0; i < 3000; i++) { const q = gen.next(); assert.strictEqual(q.op, 'tr'); seen.add(q.type); }
    assert.deepStrictEqual([...seen].sort(), [...s.types].sort(), mode);
  }
  assert.deepStrictEqual(G.modeSettings('P2').ops, ['mul', 'div']);   // Zetamac modes unchanged
});

test('trick fact keys and labels', () => {
  const q = G.makeTrick('sq5', 65);
  assert.deepStrictEqual(G.factKeys(q), ['tr-sq5']);
  assert.strictEqual(G.keyLabel('tr-sq5'), 'Squares ending in 5');
  // Table pairs are separate facts, so each gets its own label (not the whole family of the product).
  assert.deepStrictEqual(['2x12', '3x8', '4x6'].map(G.keyLabel), ['2×12 = 24', '3×8 = 24', '4×6 = 24']);
  assert.strictEqual(G.keyLabel('7x91'), '7×91 = 637');
  assert.strictEqual(G.fromKey('tr-near100', G.mulberry32(1)).type, 'near100');
  assert.strictEqual(G.advice(G.makeTrick('sq5', 65)), 'Ends in 5: 6 × 7 = 42, then 25 → 4225.');
  assert.strictEqual(G.advice(G.makeTrick('near100', 97, 96)), 'Near 100: 97 − 4 = 93 hundreds, plus 3 × 4 = 12 → 9312.');
  assert.strictEqual(G.advice(G.makeTrick('diff', 47, 53)), 'Difference of squares: 50² − 3² = 2500 − 9 → 2491.');
});

test('fractions by heart: 49 pairs, every decimal names one fraction, both answer forms', () => {
  assert.strictEqual(G.HEART.length, 49);
  const shown = G.HEART.map(([n, d]) => G.makeTrick('df', n, d).shown);
  assert.strictEqual(new Set(shown).size, 49);                         // "0.429…" can only be 3/7
  const t = G.makeTrick('fd', 2, 3);
  assert.deepStrictEqual([t.answerText, t.answerAlt], ['0.667', '0.666']);
  assert.strictEqual(G.makeTrick('fd', 3, 16).answerText, '0.1875');   // terminating: exact, no alternative
  assert.strictEqual(G.makeTrick('fd', 3, 16).answerAlt, undefined);
  assert.strictEqual(G.makeTrick('df', 1, 3).shown, '0.333…');
  assert.strictEqual(G.makeTrick('df', 3, 8).shown, '0.375');
  assert.deepStrictEqual(G.factKeys(G.makeTrick('df', 3, 7)), ['tr-df', 'fr-3/7']);
  assert.strictEqual(G.keyLabel('fr-3/7'), '3/7 = 0.429…');
  assert.match(G.trickAdvice(G.makeTrick('fd', 6, 7)), /0\.857142…/);  // cut off, so the 142857 cycle shows
  assert.match(G.trickAdvice(G.makeTrick('fd', 3, 11)), /0\.2727…/);
});

// ---------- 2 × 2 matrices ----------

test('Matrix product, text and fact key', () => {
  const q = G.makeMatrix([1, 2, 3, 4], [5, 6, 7, 8]);
  assert.deepStrictEqual(q.cells, [19, 22, 43, 50]);
  assert.strictEqual(q.op, 'mx');
  assert.strictEqual(q.shown, '(1 2; 3 4) × (5 6; 7 8)');
  assert.strictEqual(q.answer, '(19 22; 43 50)');
  assert.deepStrictEqual(G.factKeys(q), ['mx']);
  assert.strictEqual(G.keyLabel('mx'), '2 × 2 matrix product');
  const neg = G.makeMatrix([-1, 0, 2, -3], [4, -5, 6, 7]);
  assert.deepStrictEqual(neg.cells, [-4, 5, -10, -31]);
  assert.strictEqual(neg.shown, '(−1 0; 2 −3) × (4 −5; 6 7)');   // typographic minus
  assert.match(G.advice(neg), /^Row times column: −1·4 \+ 0·6 = −4; /);
});

test('Matrix entries follow the set and range', () => {
  for (const [opts, lo, max] of [[{ set: 'N', max: 9 }, 0, 9], [{ set: 'Z', max: 9 }, -9, 9], [{ set: 'N', max: 12 }, 0, 12],
    [{ lo: -9, hi: 9 }, -9, 9], [{ lo: -3, hi: 5 }, -3, 5], [{ lo: 2, hi: 4 }, 2, 4]]) {
    const set = JSON.stringify(opts), rng = G.mulberry32(7), seen = new Set();
    for (let i = 0; i < 3000; i++) {
      const q = G.matrixQuestion(opts, rng);
      q.a.concat(q.b).forEach((v) => { assert.ok(v >= lo && v <= max, `${set}${max}: ${v}`); seen.add(v); });
      assert.deepStrictEqual(q.cells, G.matProduct(q.a, q.b));
    }
    assert.strictEqual(seen.size, max - lo + 1, `${set}${max} reaches every value`);
  }
});

test('Matrix generator never repeats a matrix twice in a row, and replays rebuild matrices', () => {
  const gen = G.makeMatrixGenerator({ set: 'N', max: 9 }, G.mulberry32(3));
  let last = null;
  for (let i = 0; i < 500; i++) { const q = gen.next(); assert.notStrictEqual(q.shown, last); last = q.shown; }
  const mixed = G.makeMixedGenerator({ pool: [{ q: { op: 'mx', a: [1, 2, 3, 4], b: [5, 6, 7, 8] }, weight: 1 }], share: 1, base: G.modeSettings('P2'), rng: G.mulberry32(1) });
  assert.strictEqual(mixed.next().answer, '(19 22; 43 50)');
});

test('Matrix rounds count per variant and stay out of the weak-fact drill', () => {
  const S = require('../js/stats.js');
  const P = require('../js/progression.js');
  const r = (settings) => ({ mode: 'MATRIX', settings });
  assert.strictEqual(S.effMode(r({ lo: -9, hi: 9, duration: 60 })), 'MATRIX-m9_9-60');
  assert.strictEqual(S.effMode(r({ set: 'Z', max: 9, duration: 60 })), 'MATRIX-m9_9-60');    // older form, same mode
  assert.strictEqual(S.effMode(r({ set: 'N', max: 12, duration: 120 })), 'MATRIX-0_12-120');
  assert.strictEqual(S.effMode(r({ lo: -3, hi: 5, duration: 60, custom: true })), 'MATRIX-m3_5-60');
  assert.strictEqual(P.modeLabel('MATRIX-m9_9-60'), 'Matrices, −9 to 9, 60 s');
  assert.strictEqual(P.modeLabel('MATRIX-0_12-120'), 'Matrices, 0 to 12, 120 s');
  assert.strictEqual(P.modeLabel('MATRIX-m12_m2-60'), 'Matrices, −12 to −2, 60 s');
  assert.deepStrictEqual(S.drillTargets([{ key: 'mx', cat: 'mx', status: 'weak', slowness: 3 }]), []);
});

test('Squares 11–30: Learn practice takes your own range (2 to 50); without one it is 11–30', () => {
  const rng = G.mulberry32(7), seen = new Set();
  for (let i = 0; i < 400; i++) {
    const q = G.trickQuestion('sqmem', rng, { sq: [31, 40] });
    assert.ok(q.type === 'sqmem' && q.a >= 31 && q.a <= 40 && q.answer === q.a * q.a, q.shown);
    seen.add(q.a);
  }
  assert.strictEqual(seen.size, 10);   // every n in the range comes up
  // the practice settings go through the normal generator
  const gen = G.makeGenerator({ types: ['sqmem'], sq: [2, 5] }, G.mulberry32(1));
  for (let i = 0; i < 50; i++) { const q = gen.next(); assert.ok(q.a >= 2 && q.a <= 5); }
  // no range (Squares on Play, the timed Learn round, older rounds): 11–30 as before
  for (let i = 0; i < 200; i++) { const q = G.trickQuestion('sqmem', G.mulberry32(i)); assert.ok(q.a >= 11 && q.a <= 30); }
  const play = G.makeGenerator(G.modeSettings('SQUARES'), G.mulberry32(3));
  for (let i = 0; i < 300; i++) { const q = play.next(); if (q.type === 'sqmem') assert.ok(q.a >= 11 && q.a <= 30); }

  assert.ok(G.validSquares({ from: 2, to: 50 }) && G.validSquares({ from: 11, to: 12 }));
  for (const bad of [{ from: 1, to: 20 }, { from: 11, to: 51 }, { from: 20, to: 20 }, { from: 30, to: 11 }, { from: NaN, to: 30 }, { from: 11.5, to: 30 }]) {
    assert.ok(!G.validSquares(bad), JSON.stringify(bad));
  }
});

test('Combinatorics: about 1/3 factorials and 2/3 n choose k', () => {
  const s = G.modeSettings('COMBI'), rng = G.mulberry32(11), n = 6000;
  assert.deepStrictEqual(s.types, ['fact', 'binom']);
  let fact = 0;
  for (let i = 0; i < n; i++) if (G.generate(s, rng).type === 'fact') fact++;
  assert.ok(Math.abs(fact / n - 1 / 3) < 0.03, String(fact / n));
});
