/*
 * generator.js — question generation for every mode.
 * Pure logic, no DOM. Runs in the browser (window.AT.Generator) and in Node (module.exports).
 *
 * Zetamac rules:
 *   add: a ∈ [A1], b ∈ [A2]           shown "a + b"         answer a+b
 *   sub: addition in reverse          shown "(a+b) − a"     answer b
 *   mul: a ∈ [M1], b ∈ [M2]           shown "a × b"         answer a*b
 *   div: multiplication in reverse    shown "(a*b) ÷ a"     answer b   (always an exact integer)
 * The operation is chosen uniformly among the enabled ones.
 *
 * Trick modes (Squares, Percentages, Mixed tricks) use op "tr" instead: see Tricks below.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};

  // ---------- PRNG ----------

  // mulberry32: tiny seedable PRNG returning floats in [0, 1).
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, lo, hi) {
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  // ---------- Modes ----------

  var MODES = {
    TABLES:    { label: 'Tables',       ops: ['mul', 'div'],               ranges: { add: { a: [2, 100], b: [2, 100] }, mul: { a: [2, 12], b: [2, 12] } },  duration: 60 },
    P2:        { label: 'Foundations',         ops: ['mul', 'div'],               ranges: { add: { a: [2, 100], b: [2, 100] }, mul: { a: [2, 12], b: [2, 100] } }, duration: 60 },
    P3:        { label: 'Speed',         ops: ['add', 'sub', 'mul', 'div'], ranges: { add: { a: [2, 100], b: [2, 100] }, mul: { a: [2, 12], b: [2, 100] } }, duration: 60 },
    NORMAL120: { label: 'Interview-ready', ops: ['add', 'sub', 'mul', 'div'], ranges: { add: { a: [2, 100], b: [2, 100] }, mul: { a: [2, 12], b: [2, 100] } }, duration: 120 },
    // Trick modes: training only, outside the steps.
    SQUARES:   { label: 'Squares',      types: ['sqmem', 'sq5', 'sq50', 'sq100'], duration: 60 },
    PERCENT:   { label: '% and fractions', types: ['pct', 'pctswap', 'frac', 'dec2frac', 'fracadd', 'fracsub'], duration: 60 },
    TRICKS:    { label: 'Mixed tricks', types: ['sq5', 'sq50', 'sq100', 'diff', 'x11', 'x25', 'near100', 'pctswap'], duration: 60 }
  };

  // Fresh copy of a mode's settings (callers may mutate it).
  function modeSettings(mode) {
    var m = MODES[mode] || MODES.P3;
    var s = m.types ? { types: m.types, duration: m.duration } : { ops: m.ops, ranges: m.ranges, duration: m.duration };
    return JSON.parse(JSON.stringify(s));
  }

  // ---------- Zetamac questions ----------

  function makeQuestion(op, a, b) {
    switch (op) {
      case 'add': return { op: op, a: a, b: b, shown: a + ' + ' + b, answer: a + b };
      case 'sub': return { op: op, a: a, b: b, shown: (a + b) + ' − ' + a, answer: b };
      case 'mul': return { op: op, a: a, b: b, shown: a + ' × ' + b, answer: a * b };
      case 'div': return { op: op, a: a, b: b, shown: (a * b) + ' ÷ ' + a, answer: b };
    }
    throw new Error('Unknown op ' + op);
  }

  function generate(settings, rng) {
    if (settings.types) return trickQuestion(settings.types[randInt(rng, 0, settings.types.length - 1)], rng);
    var op = settings.ops[randInt(rng, 0, settings.ops.length - 1)];
    var r = (op === 'add' || op === 'sub') ? settings.ranges.add : settings.ranges.mul;
    return makeQuestion(op, randInt(rng, r.a[0], r.a[1]), randInt(rng, r.b[0], r.b[1]));
  }

  // Wrap a question source so the same question never appears twice in a row.
  // Gives up after a few tries (e.g. a pool with a single question).
  function noRepeat(nextFn) {
    var last = null;
    return function () {
      var q, tries = 0;
      do { q = nextFn(); tries++; } while (last !== null && q.shown === last && tries < 30);
      last = q.shown;
      return q;
    };
  }

  function makeGenerator(settings, rng) {
    return { next: noRepeat(function () { return generate(settings, rng); }) };
  }

  // ---------- Fact keys ----------

  function digits(n) { return String(Math.abs(n)).length; }

  // True if adding x + y carries in any column.
  function hasCarry(x, y) {
    while (x > 0 || y > 0) {
      if ((x % 10) + (y % 10) >= 10) return true;
      x = Math.floor(x / 10); y = Math.floor(y / 10);
    }
    return false;
  }

  // True if m − s needs a borrow in any column (m ≥ s).
  function hasBorrow(m, s) {
    while (s > 0) {
      if ((m % 10) < (s % 10)) return true;
      m = Math.floor(m / 10); s = Math.floor(s / 10);
    }
    return false;
  }

  /*
   * Every question maps to one or more fact keys:
   *   tables (both factors ≤ 12): "7x8"            (unordered; × and ÷ share it)
   *   larger ×÷:                  "8x30s" + "8x36" (multiplier × tens-band, plus exact pair)
   *   + / −:                      "add-carry" / "add-nocarry" / "sub-borrow" / "sub-noborrow"
   *                               plus a size key, e.g. "add-2d+2d", "sub-3d-2d"
   *   interview:                  q.keys (e.g. "iv-frac")
   *   tricks:                     "tr-<type>" (e.g. "tr-sq5")
   */
  function factKeys(q) {
    if (q.keys) return q.keys;
    if (q.op === 'tr') return q.type === 'fd' || q.type === 'df' ? ['tr-' + q.type, 'fr-' + q.a + '/' + q.b] : ['tr-' + q.type];
    if (q.op === 'mul' || q.op === 'div') {
      var s = Math.min(q.a, q.b), l = Math.max(q.a, q.b), pair = s + 'x' + l;
      if (l <= 12) return [pair];
      return [s + 'x' + Math.floor(l / 10) * 10 + 's', pair];
    }
    if (q.op === 'add') {
      var big = Math.max(digits(q.a), digits(q.b)), small = Math.min(digits(q.a), digits(q.b));
      return [hasCarry(q.a, q.b) ? 'add-carry' : 'add-nocarry', 'add-' + big + 'd+' + small + 'd'];
    }
    if (q.op === 'sub') {
      var m = q.a + q.b;
      return [hasBorrow(m, q.a) ? 'sub-borrow' : 'sub-noborrow', 'sub-' + digits(m) + 'd-' + digits(q.a) + 'd'];
    }
    return [];
  }

  function pairQuestion(s, l, rng) {
    var op = rng() < 0.5 ? 'mul' : 'div';
    // Zetamac puts the small factor first (and uses it as the divisor);
    // for table facts either factor can come first.
    if (l <= 12 && rng() < 0.5) return makeQuestion(op, l, s);
    return makeQuestion(op, s, l);
  }

  // Build a fresh question matching a fact key. Returns null for keys we can't build (interview).
  function fromKey(key, rng) {
    var m;
    if ((m = /^tr-(\w+)$/.exec(key)) && TRICKS[m[1]]) return trickQuestion(m[1], rng);
    if ((m = /^(\d+)x(\d+)$/.exec(key))) return pairQuestion(+m[1], +m[2], rng);
    if ((m = /^(\d+)x(\d+)s$/.exec(key))) {
      var lo = +m[2], l = lo >= 100 ? lo : lo + randInt(rng, 0, 9);
      if (l <= 12) l = randInt(rng, 13, 19);
      return pairQuestion(+m[1], l, rng);
    }
    if (/^(add|sub)-/.test(key)) {
      // Rejection sampling over Normal ranges until the structure matches.
      var op = key.slice(0, 3);
      for (var i = 0; i < 400; i++) {
        var q = makeQuestion(op, randInt(rng, 2, 100), randInt(rng, 2, 100));
        if (factKeys(q).indexOf(key) >= 0) return q;
      }
    }
    return null;
  }

  // All factorizations a×b = n with 2 ≤ a ≤ b ≤ 12.
  function family(n) {
    var out = [];
    for (var a = 2; a <= 12; a++) {
      if (n % a === 0) { var b = n / a; if (b >= a && b <= 12) out.push([a, b]); }
    }
    return out;
  }

  function familyText(n) {
    return n + ' = ' + family(n).map(function (f) { return f[0] + '×' + f[1]; }).join(' = ');
  }

  // Human-readable label for a fact key.
  function keyLabel(key) {
    var m;
    // The pair itself: 2x12, 3x8 and 4x6 are separate facts, so they need separate labels.
    if ((m = /^(\d+)x(\d+)$/.exec(key))) return m[1] + '×' + m[2] + ' = ' + m[1] * m[2];
    if ((m = /^(\d+)x(\d+)s$/.exec(key))) return m[1] + ' × ' + m[2] + 's';
    if ((m = /^fr-(\d+)\/(\d+)$/.exec(key))) { var hk = heartDecimal(+m[1], +m[2]); return m[1] + '/' + m[2] + ' = ' + hk.text + (hk.repeating ? '…' : ''); }
    var names = {
      'add-carry': '+ with carry', 'add-nocarry': '+ no carry',
      'sub-borrow': '− with borrow', 'sub-noborrow': '− no borrow',
      'iv-int': 'interview sim: integer', 'iv-dec': 'interview sim: decimal', 'iv-frac': 'interview sim: fraction',
      'iv-pct': 'interview sim: percent', 'iv-mag': 'interview sim: estimate'
    };
    if ((m = /^tr-(\w+)$/.exec(key)) && TRICKS[m[1]]) return TRICKS[m[1]].name;
    if (names[key]) return names[key];
    if ((m = /^add-(\d)d\+(\d)d$/.exec(key))) return m[1] + '-digit + ' + m[2] + '-digit';
    if ((m = /^sub-(\d)d-(\d)d$/.exec(key))) return m[1] + '-digit − ' + m[2] + '-digit';
    return key;
  }

  // Weighted random pick from [{weight}].
  function weightedPick(items, rng) {
    var total = 0, i;
    for (i = 0; i < items.length; i++) total += items[i].weight;
    var r = rng() * total;
    for (i = 0; i < items.length; i++) { r -= items[i].weight; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  /*
   * Mixed generator for drills: with probability `share`, take an item from `pool`
   * (weighted), otherwise a normal question from `base` settings.
   * Pool items: { key, weight } (fresh question for that fact) or { q: {op,a,b,type}, weight } (exact replay).
   */
  function makeMixedGenerator(opts) {
    var pool = opts.pool || [], rng = opts.rng, share = opts.share;
    return {
      next: noRepeat(function () {
        if (pool.length && rng() < share) {
          var item = weightedPick(pool, rng);
          var q = item.q ? (item.q.op === 'tr' ? makeTrick(item.q.type, item.q.a, item.q.b) : makeQuestion(item.q.op, item.q.a, item.q.b)) : fromKey(item.key, rng);
          if (q) return q;
        }
        return generate(opts.base, rng);
      })
    };
  }

  // ---------- Advice for freezes ----------

  function advice(q) {
    var s, l, tens, ones;
    if (q.op === 'mul' || q.op === 'div') {
      if (Math.max(q.a, q.b) <= 12) {
        var n = q.a * q.b;
        return family(n).length > 1 ? 'Learn the family: ' + familyText(n) + '.' : 'Overlearn it: ' + familyText(n) + '.';
      }
      if (q.op === 'mul') {
        s = Math.min(q.a, q.b); l = Math.max(q.a, q.b); tens = Math.floor(l / 10) * 10; ones = l % 10;
        if (ones === 0) return 'Drop the zero: ' + s + '×' + tens / 10 + ' = ' + s * tens / 10 + ' → ' + s * l + '.';
        if (ones >= 7) return 'Round up: ' + s + '×' + (tens + 10) + ' = ' + s * (tens + 10) + ', − ' + s + '×' + (10 - ones) + ' = ' + s * (10 - ones) + ' → ' + s * l + '.';
        return 'Split: ' + s + '×' + tens + ' = ' + s * tens + ', ' + s + '×' + ones + ' = ' + s * ones + ' → ' + s * l + '.';
      }
      // div: (a*b) ÷ a = b. Chunk the dividend by the tens of the answer.
      s = q.a; l = q.b; tens = Math.floor(l / 10) * 10; ones = l % 10;
      if (ones === 0) return 'Think ' + s + ' × ? = ' + s * l + ': ' + s + '×' + tens / 10 + ' = ' + s * tens / 10 + ' → ' + l + '.';
      if (tens === 0) return 'Think ' + s + ' × ? = ' + s * l + ' → ' + l + '.';
      return 'Chunk it: ' + s * tens + ' ÷ ' + s + ' = ' + tens + ', ' + s * ones + ' ÷ ' + s + ' = ' + ones + ' → ' + l + '.';
    }
    if (q.op === 'add') {
      tens = Math.floor(q.b / 10) * 10; ones = q.b % 10;
      if (!tens || !ones) return 'Add left to right, say only the running total.';
      return 'Tens then ones: ' + q.a + ' + ' + tens + ' = ' + (q.a + tens) + ', + ' + ones + ' → ' + (q.a + q.b) + '.';
    }
    if (q.op === 'sub') {
      var m = q.a + q.b; tens = Math.floor(q.a / 10) * 10; ones = q.a % 10;
      if (!tens || !ones) return 'Count up from ' + q.a + ' to ' + m + '.';
      return 'Tens then ones: ' + m + ' − ' + tens + ' = ' + (m - tens) + ', − ' + ones + ' → ' + q.b + '.';
    }
    if (q.op === 'tr') return trickAdvice(q);
    var iv = {
      int: 'Split one factor: 47×36 = 47×30 + 47×6.',
      dec: 'Drop the decimals, compute with integers, then place the point.',
      frac: 'Divide first, then multiply: 3/8 of 64 = 3 × 8.',
      pct: '10% first, then scale: 15% = 10% + 5%.',
      mag: 'Round both to 2 significant figures and multiply.'
    };
    return iv[q.type] || 'Skip earlier: move on after 5 seconds.';
  }

  // ---------- Interview (Optiver-style) ----------

  function lcm(a, b) { return a / gcd(a, b) * b; }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }

  // Denominator has only factors 2 and 5 → finite decimal.
  function terminating(den) {
    while (den % 2 === 0) den /= 2;
    while (den % 5 === 0) den /= 5;
    return den === 1;
  }

  // Format an integer number of tenths: 36 → "3.6", 9 → "0.9", 40 → "4".
  function tenths(n) { return n % 10 === 0 ? String(n / 10) : Math.floor(n / 10) + '.' + (n % 10); }

  var DEC_MULTS = [
    ['0.25', 1, 4], ['0.75', 3, 4], ['0.125', 1, 8], ['0.375', 3, 8], ['0.2', 1, 5], ['0.4', 2, 5],
    ['0.6', 3, 5], ['0.8', 4, 5], ['1.5', 3, 2], ['2.5', 5, 2], ['1.25', 5, 4], ['0.05', 1, 20]
  ];
  var PCTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 60, 75];

  function iv(type, shown, answer, extra) {
    var q = { op: 'iv', type: type, shown: shown, answer: answer, answerText: String(answer), keys: ['iv-' + type] };
    for (var k in extra) q[k] = extra[k];
    return q;
  }

  function interviewQuestion(rng) {
    var r = rng(), a, b, d, k, num, den;
    if (r < 0.3) { // integers larger than Zetamac
      if (rng() < 0.6) { a = randInt(rng, 11, 99); b = randInt(rng, 11, 99); return iv('int', a + ' × ' + b, a * b); }
      d = randInt(rng, 3, 19); b = randInt(rng, 12, 99);
      return iv('int', (d * b) + ' ÷ ' + d, b);
    }
    if (r < 0.5) { // decimals
      if (rng() < 0.5) {
        var dm = DEC_MULTS[randInt(rng, 0, DEC_MULTS.length - 1)];
        k = randInt(rng, 2, 20);
        return iv('dec', dm[0] + ' × ' + dm[2] * k, dm[1] * k);
      }
      b = randInt(rng, 2, 12); d = randInt(rng, 2, 9); // d is in tenths
      return iv('dec', tenths(b * d) + ' ÷ ' + tenths(d), b);
    }
    if (r < 0.7) { // fractions
      if (rng() < 0.5) {
        var dens = [3, 4, 5, 6, 8, 9, 12];
        den = dens[randInt(rng, 0, dens.length - 1)];
        do { num = randInt(rng, 1, den - 1); } while (gcd(num, den) !== 1);
        k = randInt(rng, 2, 12);
        return iv('frac', num + '/' + den + ' of ' + den * k, num * k);
      }
      var ds = [2, 3, 4, 5, 6, 8, 10, 12];
      var d1 = ds[randInt(rng, 0, ds.length - 1)], d2 = ds[randInt(rng, 0, ds.length - 1)];
      var n1 = randInt(rng, 1, Math.min(3, d1 - 1)), n2 = randInt(rng, 1, Math.min(3, d2 - 1));
      var plus = rng() < 0.6;
      if (!plus && n1 * d2 < n2 * d1) { var t = n1; n1 = n2; n2 = t; t = d1; d1 = d2; d2 = t; }
      var pn = plus ? n1 * d2 + n2 * d1 : n1 * d2 - n2 * d1, pd = d1 * d2;
      if (pn === 0) return interviewQuestion(rng);
      var g = gcd(pn, pd); pn /= g; pd /= g;
      return iv('frac', n1 + '/' + d1 + (plus ? ' + ' : ' − ') + n2 + '/' + d2, pn / pd, {
        answerText: pd === 1 ? String(pn) : pn + '/' + pd,
        tol: terminating(pd) ? 1e-9 : 0.0005 // non-terminating: accept 3 correct decimals
      });
    }
    if (r < 0.9) { // percentages; base is a multiple of 20 so answers are integers
      var p = PCTS[randInt(rng, 0, PCTS.length - 1)], base = 20 * randInt(rng, 1, 25);
      return iv('pct', p + '% of ' + base, p * base / 100);
    }
    a = randInt(rng, 120, 980); b = randInt(rng, 12, 98); // order of magnitude, ±5%
    return iv('mag', '≈ ' + a + ' × ' + b + ' (±5%)', a * b, { rel: 0.05, answerText: '≈ ' + a * b });
  }

  function makeInterviewGenerator(rng) {
    return { next: noRepeat(function () { return interviewQuestion(rng); }) };
  }

  // ---------- Tricks (Squares, Percentages, Mixed tricks) ----------

  /*
   * op "tr", with a `type` naming the trick it trains (fact key "tr-<type>"):
   *   sqmem    n², n 11–30, to know by heart      sq5      n5², 15–95
   *   sq50     (50 ± d)², d 1–9                    sq100    (100 ± d)², d 1–12
   *   diff     (m − d)(m + d), m a multiple of 10  x11      11 × n, n 12–99
   *   x25      25 × n, n 12–99                     near100  a × b, both 88–99
   *   pct      p% of n, whole answer               pctswap  a% of b where b% of a is easy (8% of 25)
   *   frac     a ÷ b with a finite decimal answer (3 ÷ 8 = 0.375)
   *   dec2frac a decimal, answered as a fraction in lowest terms (0.375 = 3/8)
   *   fracadd  n1/d1 + n2/d2, answered as a fraction in lowest terms; a and b are [n, d] pairs
   *   fracsub  n1/d1 − n2/d2, the same, never below zero
   *   fd       a fraction from the by-heart set (HEART), answered as a decimal: 3/7 → 0.429
   *   df       the same decimal, answered as the fraction: 0.429… → 3/7
   * By-heart decimals (heartDecimal): exact when the fraction terminates (3/16 = 0.1875), otherwise
   * 3 places, rounded or cut off both accepted (q.answerAlt), and shown with "…" when it is a question.
   * Fraction answers carry q.frac = [numerator, denominator]: the game asks for one, then the other.
   * makeTrick(type, a, b) rebuilds a question from its numbers, so rounds can be replayed exactly.
   */
  var TRICKS = {
    sqmem:   { name: 'Squares 11–30' },
    sq5:     { name: 'Squares ending in 5' },
    sq50:    { name: 'Squares near 50' },
    sq100:   { name: 'Squares near 100' },
    diff:    { name: 'Difference of squares' },
    x11:     { name: '× 11' },
    x25:     { name: '× 25' },
    near100: { name: 'Products near 100' },
    pct:     { name: 'Percent of a number' },
    pctswap: { name: 'Swapped percentages' },
    frac:    { name: 'Fractions as decimals' },
    dec2frac: { name: 'Decimals as fractions' },
    fracadd: { name: 'Adding fractions' },
    fracsub: { name: 'Subtracting fractions' },
    fd:      { name: 'Fraction to decimal' },
    df:      { name: 'Decimal to fraction' }
  };

  // Fractions to know by heart: every n/d in lowest terms with d 2–12, plus a few common larger ones.
  var HEART = (function () {
    var out = [], d, n;
    for (d = 2; d <= 12; d++) for (n = 1; n < d; n++) if (gcd(n, d) === 1) out.push([n, d]);
    return out.concat([[1, 16], [3, 16], [1, 20], [1, 25]]);
  })();

  function terminates(d) { while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }

  // { text, alt, repeating }: 3/8 → "0.375"; 2/3 → "0.667", alt "0.666" (cut off), repeating.
  function heartDecimal(n, d) {
    if (terminates(d)) return { text: decimalText(n, d), alt: null, repeating: false };
    var text = (n / d).toFixed(3), cut = (Math.floor(n * 1000 / d) / 1000).toFixed(3);
    return { text: text, alt: cut !== text ? cut : null, repeating: true };
  }
  var SUM_DENS = [2, 3, 4, 5, 6, 8, 10, 12];
  var FRAC_DENS = [4, 5, 8, 16, 20, 25, 40];
  var SWAP_BASES = [[25, 4], [50, 2], [20, 5]];   // [b, a must be a multiple of this] so a% of b is whole

  // Shortest decimal for a finite fraction: 3/8 → "0.375", 1/16 → "0.0625".
  function decimalText(a, b) { return String(Number((a / b).toFixed(6))); }

  function makeTrick(type, a, b) {
    var q = { op: 'tr', type: type, a: a, b: b };
    if (/^sq/.test(type)) { q.shown = a + '²'; q.answer = a * a; }
    else if (type === 'pct' || type === 'pctswap') { q.shown = a + '% of ' + b; q.answer = a * b / 100; }
    else if (type === 'frac') { q.shown = a + ' ÷ ' + b; q.answer = a / b; q.answerText = decimalText(a, b); }
    else if (type === 'dec2frac') { q.shown = decimalText(a, b); setFrac(q, a, b); }
    else if (type === 'fd') {
      var hd = heartDecimal(a, b);
      q.shown = a + '/' + b; q.answer = a / b; q.answerText = hd.text;
      if (hd.alt) q.answerAlt = hd.alt;
    }
    else if (type === 'df') { var hx = heartDecimal(a, b); q.shown = hx.text + (hx.repeating ? '…' : ''); setFrac(q, a, b); }
    else if (type === 'fracadd' || type === 'fracsub') {
      var plus = type === 'fracadd';
      q.shown = a[0] + '/' + a[1] + (plus ? ' + ' : ' − ') + b[0] + '/' + b[1];
      setFrac(q, a[0] * b[1] + (plus ? 1 : -1) * b[0] * a[1], a[1] * b[1]);
    }
    else { q.shown = a + ' × ' + b; q.answer = a * b; }
    if (q.b === undefined) delete q.b;
    return q;
  }

  // A fraction answer, reduced: q.frac = [n, d], q.answerText "n/d".
  function setFrac(q, n, d) {
    var g = gcd(n, d);
    q.frac = [n / g, d / g]; q.answer = n / d; q.answerText = n / g + '/' + d / g;
  }

  function either(rng, x, y) { return rng() < 0.5 ? [x, y] : [y, x]; }

  function properFrac(rng) {
    var d = SUM_DENS[randInt(rng, 0, SUM_DENS.length - 1)], n;
    do { n = randInt(rng, 1, d - 1); } while (gcd(n, d) !== 1);
    return [n, d];
  }

  function trickQuestion(type, rng) {
    var d = randInt(rng, 1, 9), n, ab;
    switch (type) {
      case 'sqmem': return makeTrick(type, randInt(rng, 11, 30));
      case 'sq5': return makeTrick(type, 10 * randInt(rng, 1, 9) + 5);
      case 'sq50': return makeTrick(type, rng() < 0.5 ? 50 - d : 50 + d);
      case 'sq100': d = randInt(rng, 1, 12); return makeTrick(type, rng() < 0.5 ? 100 - d : 100 + d);
      case 'diff': n = 10 * randInt(rng, 2, 9); return makeTrick(type, n - d, n + d);
      case 'x11': ab = either(rng, 11, randInt(rng, 12, 99)); return makeTrick(type, ab[0], ab[1]);
      case 'x25': ab = either(rng, 25, randInt(rng, 12, 99)); return makeTrick(type, ab[0], ab[1]);
      case 'near100': return makeTrick(type, randInt(rng, 88, 99), randInt(rng, 88, 99));
      case 'pct': return makeTrick(type, PCTS[randInt(rng, 0, PCTS.length - 1)], 20 * randInt(rng, 1, 25));
      case 'pctswap':
        var sb = SWAP_BASES[randInt(rng, 0, SWAP_BASES.length - 1)];
        return makeTrick(type, sb[1] * randInt(rng, 1, Math.floor(99 / sb[1])), sb[0]);
      case 'frac':
        var den = FRAC_DENS[randInt(rng, 0, FRAC_DENS.length - 1)], num;
        do { num = randInt(rng, 1, den - 1); } while (gcd(num, den) !== 1);
        return makeTrick(type, num, den);
      case 'dec2frac':
        den = FRAC_DENS[randInt(rng, 0, FRAC_DENS.length - 1)];
        do { num = randInt(rng, 1, den - 1); } while (gcd(num, den) !== 1);
        return makeTrick(type, num, den);
      case 'fd':
      case 'df':
        var hp = HEART[randInt(rng, 0, HEART.length - 1)];
        return makeTrick(type, hp[0], hp[1]);
      case 'fracadd':
      case 'fracsub':
        // Two different proper fractions whose result is a fraction (not 0, not a whole number), denominator ≤ 60.
        for (;;) {
          var x = properFrac(rng), y = properFrac(rng);
          if (type === 'fracsub' && x[0] * y[1] < y[0] * x[1]) { var t = x; x = y; y = t; }
          var q = makeTrick(type, x, y);
          if (q.answer > 0 && q.frac[1] > 1 && q.frac[1] <= 60 && x[1] !== y[1]) return q;
        }
    }
    throw new Error('Unknown trick ' + type);
  }

  // How to think it, worked on this exact question (also shown for freezes).
  function trickAdvice(q) {
    var a = q.a, b = q.b, d, hi, lo, n;
    switch (q.type) {
      case 'sqmem': return 'Know it by heart: ' + a + '² = ' + a * a + '.';
      case 'sq5':
        hi = Math.floor(a / 10);
        return 'Ends in 5: ' + hi + ' × ' + (hi + 1) + ' = ' + hi * (hi + 1) + ', then 25 → ' + a * a + '.';
      case 'sq50':
        d = a - 50;
        return 'Near 50: 25 ' + (d > 0 ? '+ ' : '− ') + Math.abs(d) + ' = ' + (25 + d) + ' hundreds, plus ' + Math.abs(d) + '² = ' + d * d + ' → ' + a * a + '.';
      case 'sq100':
        d = a - 100;
        return 'Near 100: ' + a + ' ' + (d > 0 ? '+ ' : '− ') + Math.abs(d) + ' = ' + (a + d) + ' hundreds, plus ' + Math.abs(d) + '² = ' + d * d + ' → ' + a * a + '.';
      case 'diff':
        var m = (a + b) / 2; d = Math.abs(b - a) / 2;
        return 'Difference of squares: ' + m + '² − ' + d + '² = ' + m * m + ' − ' + d * d + ' → ' + a * b + '.';
      case 'x11':
        n = a === 11 ? b : a;
        var t = Math.floor(n / 10), o = n % 10;
        return 'Times 11: put ' + t + ' + ' + o + ' = ' + (t + o) + ' between ' + t + ' and ' + o + (t + o >= 10 ? ', carry the 1' : '') + ' → ' + 11 * n + '.';
      case 'x25':
        n = a === 25 ? b : a;
        return 'Times 25: ' + n + ' ÷ 4 = ' + Number((n / 4).toFixed(2)) + ', × 100 → ' + 25 * n + '.';
      case 'near100':
        hi = 100 - a; lo = 100 - b;
        return 'Near 100: ' + a + ' − ' + lo + ' = ' + (a - lo) + ' hundreds, plus ' + hi + ' × ' + lo + ' = ' + hi * lo + ' → ' + a * b + '.';
      case 'pct': return 'Find 10% first: ' + b / 10 + ', then scale to ' + a + '% → ' + a * b / 100 + '.';
      case 'pctswap': return 'Swap them: ' + a + '% of ' + b + ' = ' + b + '% of ' + a + ' → ' + a * b / 100 + '.';
      case 'frac': return 'From 1 ÷ ' + b + ' = ' + decimalText(1, b) + ': ' + a + ' × ' + decimalText(1, b) + ' → ' + decimalText(a, b) + '.';
      case 'dec2frac': return '1/' + b + ' = ' + decimalText(1, b) + ', and ' + q.shown + ' is ' + a + ' of those → ' + q.answerText + '.';
      case 'fd':
      case 'df':
        return heartAdvice(a, b, q.type === 'fd');
      case 'fracadd':
      case 'fracsub':
        var l = lcm(a[1], b[1]), x = a[0] * l / a[1], y = b[0] * l / b[1], sign = q.type === 'fracadd' ? ' + ' : ' − ';
        return 'Over ' + l + ': ' + x + '/' + l + sign + y + '/' + l + ' = ' + (q.type === 'fracadd' ? x + y : x - y) + '/' + l +
          (q.frac[1] !== l ? ', reduce' : '') + ' → ' + q.answerText + '.';
    }
    return 'Skip earlier: move on after 5 seconds.';
  }

  // By heart, with the pattern that makes it memorable: ninths repeat the numerator, elevenths repeat 9 × it,
  // sevenths cycle 142857; anything else is n × (1/d).
  function heartAdvice(n, d, toDecimal) {
    var hd = heartDecimal(n, d), f = n + '/' + d, how;
    // Cut off (not rounded) so the repeating pattern stays visible: 6/7 = 0.857142…, 1/12 = 0.0833…
    function cut(x, places) { return (Math.floor(x * Math.pow(10, places)) / Math.pow(10, places)).toFixed(places) + '…'; }
    if (n === 1 && !hd.repeating) return toDecimal ? 'Know it by heart: ' + f + ' = ' + hd.text + '.' : 'Know it by heart: ' + hd.text + ' = ' + f + '.';
    if (d === 9) how = 'Ninths repeat the numerator: ' + f + ' = 0.' + n + n + n + '…';
    else if (d === 11) { var nn = ('0' + 9 * n).slice(-2); how = 'Elevenths repeat 9 × the numerator, ' + nn + ': ' + f + ' = 0.' + nn + nn + '…'; }
    else if (d === 7) how = 'Sevenths cycle the digits 142857 from a different start: ' + f + ' = ' + cut(n / 7, 6);
    else if (n === 1) how = 'Know it by heart: ' + f + ' = ' + cut(1 / d, 4);
    else { var one = heartDecimal(1, d); how = f + ' = ' + n + ' × 1/' + d + ' = ' + n + ' × ' + (one.repeating ? cut(1 / d, 4) : one.text); }
    return how + (toDecimal ? ' → ' + hd.text + (hd.alt ? ' (or ' + hd.alt + ')' : '') + '.' : ' → ' + f + '.');
  }

  function trickNames() {
    var out = {};
    for (var k in TRICKS) out[k] = TRICKS[k].name;
    return out;
  }

  // Parse "12", "-3", "0.5", ".5", "1/2", "3.6/0.9". Returns a number or null.
  function parseAnswer(str) {
    var s = String(str).replace(/\s+/g, '');
    var numRe = '-?(?:\\d+\\.?\\d*|\\.\\d+)';
    if (!new RegExp('^' + numRe + '(?:/' + numRe + ')?$').test(s)) return null;
    var parts = s.split('/');
    var v = parseFloat(parts[0]);
    if (parts.length === 2) {
      var dv = parseFloat(parts[1]);
      if (dv === 0) return null;
      v = v / dv;
    }
    return isFinite(v) ? v : null;
  }

  function checkInterview(q, input) {
    var v = parseAnswer(input);
    if (v === null) return false;
    if (q.rel) return Math.abs(v - q.answer) <= q.rel * Math.abs(q.answer);
    return Math.abs(v - q.answer) <= (q.tol || 1e-9);
  }

  var api = {
    mulberry32: mulberry32, randInt: randInt, MODES: MODES, modeSettings: modeSettings,
    makeQuestion: makeQuestion, generate: generate, makeGenerator: makeGenerator,
    HEART: HEART, heartDecimal: heartDecimal, factKeys: factKeys, fromKey: fromKey, family: family, familyText: familyText, keyLabel: keyLabel,
    makeMixedGenerator: makeMixedGenerator, advice: advice,
    interviewQuestion: interviewQuestion, makeInterviewGenerator: makeInterviewGenerator,
    parseAnswer: parseAnswer, checkInterview: checkInterview, hasCarry: hasCarry, hasBorrow: hasBorrow,
    makeTrick: makeTrick, trickQuestion: trickQuestion, trickAdvice: trickAdvice, trickNames: trickNames
  };
  AT.Generator = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
