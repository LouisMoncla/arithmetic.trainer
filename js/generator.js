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
    NORMAL120: { label: 'Interview-ready', ops: ['add', 'sub', 'mul', 'div'], ranges: { add: { a: [2, 100], b: [2, 100] }, mul: { a: [2, 12], b: [2, 100] } }, duration: 120 }
  };

  // Fresh copy of a mode's settings (callers may mutate it).
  function modeSettings(mode) {
    var m = MODES[mode] || MODES.P3;
    return JSON.parse(JSON.stringify({ ops: m.ops, ranges: m.ranges, duration: m.duration }));
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
   */
  function factKeys(q) {
    if (q.keys) return q.keys;
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
    if ((m = /^(\d+)x(\d+)$/.exec(key))) {
      var s = +m[1], l = +m[2];
      return l <= 12 ? familyText(s * l) : s + '×' + l + ' = ' + s * l;
    }
    if ((m = /^(\d+)x(\d+)s$/.exec(key))) return m[1] + ' × ' + m[2] + 's';
    var names = {
      'add-carry': '+ with carry', 'add-nocarry': '+ no carry',
      'sub-borrow': '− with borrow', 'sub-noborrow': '− no borrow',
      'iv-int': 'interview sim: integer', 'iv-dec': 'interview sim: decimal', 'iv-frac': 'interview sim: fraction',
      'iv-pct': 'interview sim: percent', 'iv-mag': 'interview sim: estimate'
    };
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
   * Pool items: { key, weight } (fresh question for that fact) or { q: {op,a,b}, weight } (exact replay).
   */
  function makeMixedGenerator(opts) {
    var pool = opts.pool || [], rng = opts.rng, share = opts.share;
    return {
      next: noRepeat(function () {
        if (pool.length && rng() < share) {
          var item = weightedPick(pool, rng);
          var q = item.q ? makeQuestion(item.q.op, item.q.a, item.q.b) : fromKey(item.key, rng);
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
    factKeys: factKeys, fromKey: fromKey, family: family, familyText: familyText, keyLabel: keyLabel,
    makeMixedGenerator: makeMixedGenerator, advice: advice,
    interviewQuestion: interviewQuestion, makeInterviewGenerator: makeInterviewGenerator,
    parseAnswer: parseAnswer, checkInterview: checkInterview, hasCarry: hasCarry, hasBorrow: hasBorrow
  };
  AT.Generator = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
