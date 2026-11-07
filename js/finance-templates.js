/*
 * finance-templates.js — the procedural question templates of the Finance tab.
 * Each template draws its parameters from a grid, then computes the answer, the worked steps and the
 * plausible wrong answers (distractors) from those same parameters. Nothing is hard-coded.
 * Field meanings are in finance-core.js. Every template has an independent check in tests/finance.test.js.
 *
 * Text with maths: prompts, steps and "why" sentences are rich text, prose with maths between $…$ in the
 * LaTeX subset of js/tex.js (drawn as MathML; written as plain text where text is needed). Any formula,
 * letter or symbol goes inside $…$; plain prose and plain numbers stay outside (tests/tex.test.js checks).
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var G = AT.Generator || require('./generator.js');
  var F = AT.Finance || require('./finance-core.js');
  var C = F.C, fmt = F.fmt, int = F.int, pick = F.pick, grid = F.grid;
  var T = F.register;
  var EXACT = function () { return { type: 'exact' }; };
  function n(x, dp) { return fmt(x, dp === undefined ? 4 : dp); }
  function range(lo, hi, step) { var a = []; for (var x = lo; x <= hi + 1e-9; x += (step || 1)) a.push(F.round(x, 6)); return a; }

  // ---- maths helpers (build LaTeX strings) ----
  function M(tex) { return '$' + tex + '$'; }
  // Maths ending a sentence: a full stop, unless the maths already ends with an ellipsis.
  function S(tex) { return M(tex) + (/…$/.test(tex) ? '' : '.'); }
  function fr(a, b) { return '\\frac{' + a + '}{' + b + '}'; }
  function sq(x) { return '\\sqrt{' + x + '}'; }
  var X = ' \\times ';
  function paren(x, dp) { return x < 0 ? '(' + n(x, dp) + ')' : n(x, dp); }
  function sgn(x, dp) { return (x < 0 ? '- ' : '+ ') + n(Math.abs(x), dp); }   // ' - 0.05' inside a sum

  // ======================= A. Arithmetic (wrappers over the Play tab's generator) =======================

  function arith(op, id, name, a, b) {
    T({
      id: id, family: 'arith', category: 'Arithmetic', difficulty: 1, tol: EXACT,
      params: function (rng) { return { a: int(rng, a[0], a[1]), b: int(rng, b[0], b[1]) }; },
      prompt: function (p) { return M(G.makeQuestion(op, p.a, p.b).shown); },
      answer: function (p) { return G.makeQuestion(op, p.a, p.b).answer; },
      distractors: function (p) {
        var x = G.makeQuestion(op, p.a, p.b).answer;
        return op === 'mul' ? [x + p.a, x - p.a, x + 10] : [x + 10, x - 10, x + 1];
      },
      // The Play tab's tip, shared with it, kept as it is (numbers only).
      steps: function (p) { return [G.advice(G.makeQuestion(op, p.a, p.b))]; },
      formula: name
    });
  }
  arith('add', 'arith.add', 'Addition, 2–100 + 2–100', [2, 100], [2, 100]);
  arith('sub', 'arith.sub', 'Subtraction: an addition in reverse', [2, 100], [2, 100]);
  arith('mul', 'arith.mul', 'Multiplication, 2–12 × 2–100', [2, 12], [2, 100]);
  arith('div', 'arith.div', 'Division: a multiplication in reverse', [2, 12], [2, 100]);

  // ======================= B. Quant mental math =======================

  var PCT_X = [5, 10, 12.5, 15, 20, 25, 30, 40, 60, 75];
  var PCT_FRAC = { 5: [1, 20], 10: [1, 10], 12.5: [1, 8], 15: [3, 20], 20: [1, 5], 25: [1, 4], 30: [3, 10], 40: [2, 5], 60: [3, 5], 75: [3, 4] };
  function pctFrac(x) { return fr(PCT_FRAC[x][0], PCT_FRAC[x][1]); }
  T({
    id: 'quant.pct.of', family: 'quant', category: 'Percentages', difficulty: 1, tol: EXACT,
    // 12.5% needs a multiple of 8; every other rate is a multiple of 5%, so multiples of 20 give whole answers.
    params: function (rng) { var x = pick(rng, PCT_X); return { x: x, y: x === 12.5 ? 8 * int(rng, 2, 250) : 20 * int(rng, 1, 100) }; },
    prompt: function (p) { return M(n(p.x) + '\\% \\text{ of } ' + p.y); },
    answer: function (p) { return p.y * p.x / 100; },
    distractors: function (p) { return [p.y * p.x / 10, p.y * (100 - p.x) / 100, p.y * p.x / 100 + p.y / 100]; },
    steps: function (p) { return [S(n(p.x) + '\\% = ' + pctFrac(p.x)), S(p.y + X + pctFrac(p.x) + ' = ' + n(p.y * p.x / 100))]; },
    formula: 'x% of y = y × x / 100',
    why: 'Turn the percentage into a simple fraction first: dividing by 8 or 5 is faster than multiplying by 0.125 or 0.2.'
  });

  T({
    id: 'quant.pct.change', family: 'quant', category: 'Percentages', difficulty: 1, unit: '%', dp: 1,
    params: function (rng) {
      var c = pick(rng, range(-50, 50, 5).filter(function (x) { return x !== 0; }));
      var a = pick(rng, [20, 40, 50, 80, 100, 120, 150, 200, 250, 400, 500, 800]);
      return { a: a, c: c, b: F.round(a * (1 + c / 100), 2) };
    },
    prompt: function (p) { return 'A price goes from ' + n(p.a) + ' to ' + n(p.b) + '. Percentage change?'; },
    answer: function (p) { return (p.b - p.a) / p.a * 100; },
    distractors: function (p) { return [(p.b - p.a) / p.b * 100, -(p.b - p.a) / p.a * 100, p.b - p.a]; },
    steps: function (p) {
      return ['Change: ' + S(n(p.b) + ' - ' + n(p.a) + ' = ' + n(p.b - p.a)),
        'Divide by the starting value: ' + S(fr(n(p.b - p.a), n(p.a)) + ' = ' + n((p.b - p.a) / p.a) + ' = ' + n((p.b - p.a) / p.a * 100, 1) + '\\%')];
    },
    formula: '% change = (new − old) / old × 100',
    why: 'Always divide by the starting value: dividing by the new value is the classic slip, and it makes falls look smaller than rises.'
  });

  var DENS = [2, 3, 4, 5, 6, 8, 9, 12, 16];
  function fracParams(rng) {
    var d = pick(rng, DENS), k;
    do { k = int(rng, 1, d - 1); } while (F.gcd(k, d) !== 1);
    return { n: k, d: d };
  }
  function terminates(d) { while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }
  function decText(p) { var v = p.n / p.d; return terminates(p.d) ? n(v, 6) : v.toFixed(5).replace('-', '−') + '…'; }
  T({
    id: 'quant.frac.dec', family: 'quant', category: 'Fractions', difficulty: 1, dp: 3,
    params: fracParams,
    prompt: function (p) { return M(fr(p.n, p.d)) + ' as a decimal'; },
    answer: function (p) { return p.n / p.d; },
    distractors: function (p) { return [p.d / p.n, p.n / (p.d + 1), (p.n + 1) / p.d, 1 - p.n / p.d]; },
    steps: function (p) {
      return [S(fr(1, p.d) + ' = ' + decText({ n: 1, d: p.d })), S(p.n + X + n(1 / p.d, 5) + ' = ' + decText(p))];
    },
    formula: 'n/d = n × (1/d)',
    why: 'Know $\\frac{1}{d}$ by heart for small $d$ ($\\frac{1}{8} = 0.125$, $\\frac{1}{12} = 0.0833…$), then multiply by the numerator.'
  });
  T({
    id: 'quant.dec.frac', family: 'quant', category: 'Fractions', difficulty: 2, kind: 'fraction',
    params: fracParams,
    prompt: function (p) { return decText(p) + ' as a fraction'; },
    answer: function (p) { return [p.n, p.d]; },
    distractors: function (p) {
      // Neighbouring fractions with familiar denominators, closest value first.
      var c = [];
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16].forEach(function (d) {
        for (var k = 1; k < d; k++) if (F.gcd(k, d) === 1 && k * p.d !== p.n * d) c.push([k, d]);
      });
      c.sort(function (x, y) { return Math.abs(x[0] / x[1] - p.n / p.d) - Math.abs(y[0] / y[1] - p.n / p.d); });
      return c.map(function (f) { return f[0] + '/' + f[1]; });
    },
    steps: function (p) {
      return ['Find $d$ with $\\frac{1}{d}$ a familiar decimal: ' + S(fr(1, p.d) + ' = ' + decText({ n: 1, d: p.d })),
        M(fr(decText(p), n(1 / p.d, 5)) + ' = ' + p.n) + ', so it is ' + S(fr(p.n, p.d))];
    },
    formula: 'decimal = n × (1/d)',
    why: 'Repeating decimals point to 3, 6, 9 or 12 in the denominator; terminating ones to powers of 2 and 5.'
  });

  function squareSteps(p) {
    if (p.x >= 100) {
      var k = p.x - 100;
      return [S('(100 + ' + k + ')^2 = 100^2 + 2' + X + '100' + X + k + ' + ' + k + '^2'), S('= 10000 + ' + (200 * k) + ' + ' + (k * k) + ' = ' + (p.x * p.x))];
    }
    var t = Math.floor(p.x / 10) * 10, u = p.x - t;
    return [S('(' + t + ' + ' + u + ')^2 = ' + t + '^2 + 2' + X + t + X + u + ' + ' + u + '^2'), S('= ' + (t * t) + ' + ' + (2 * t * u) + ' + ' + (u * u) + ' = ' + (p.x * p.x))];
  }
  function squareDistractors(p) {
    var t = Math.floor(p.x / 10) * 10, u = p.x - t;
    return [t * t + u * u, t * t + t * u + u * u, p.x * p.x + 10, 2 * p.x];
  }
  T({
    id: 'quant.square', family: 'quant', category: 'Squares and powers', difficulty: 1, tol: EXACT,
    params: function (rng) { var x; do { x = int(rng, 11, 99); } while (x % 10 === 0); return { x: x }; },
    prompt: function (p) { return M(p.x + '^2'); },
    answer: function (p) { return p.x * p.x; },
    distractors: squareDistractors, steps: squareSteps,
    formula: '(a + b)² = a² + 2ab + b²',
    why: 'Split into tens and units; the middle term $2ab$ is the one people forget.'
  });
  T({
    id: 'quant.square.big', family: 'quant', category: 'Squares and powers', difficulty: 3, tol: EXACT,
    params: function (rng) { return { x: int(rng, 101, 130) }; },
    prompt: function (p) { return M(p.x + '^2'); },
    answer: function (p) { return p.x * p.x; },
    distractors: squareDistractors, steps: squareSteps,
    formula: '(100 + k)² = 10000 + 200k + k²',
    why: 'Near 100, the square is 1, then $2k$, then $k^2$ written on two digits: $107^2 = 1\\,14\\,49$.'
  });

  T({
    id: 'quant.sqrt.approx', family: 'quant', category: 'Squares and powers', difficulty: 2, dp: 2,
    tol: function () { return { type: 'rel', v: 0.01 }; },
    params: function (rng) { var x; do { x = int(rng, 10, 1000); } while (Math.pow(Math.round(Math.sqrt(x)), 2) === x); return { x: x }; },
    prompt: function (p) { return M(sq(p.x) + ' \\approx ?'); },
    answer: function (p) { return Math.sqrt(p.x); },
    distractors: function (p) { var k = Math.floor(Math.sqrt(p.x)); return [p.x / 2, k - 1, k + 2, Math.sqrt(p.x) * 1.1, Math.sqrt(p.x / 10)]; },
    steps: function (p) {
      var k = Math.floor(Math.sqrt(p.x));
      var est = k + (p.x - k * k) / (2 * k);
      return [M(k + '^2 = ' + (k * k)) + ' and ' + M((k + 1) + '^2 = ' + ((k + 1) * (k + 1))) + ', so ' + M(sq(p.x)) + ' is between ' + k + ' and ' + (k + 1) + '.',
        'Linear step: ' + S(k + ' + ' + fr(p.x + ' - ' + (k * k), '2' + X + k) + ' = ' + n(est, 2)),
        'Exactly, ' + S(sq(p.x) + ' = ' + n(Math.sqrt(p.x), 4))];
    },
    formula: '√(k² + d) ≈ k + d / (2k)',
    why: 'The tangent-line step overshoots a little, because the square root is concave; it is good to well under 1% once $k \\ge 4$.'
  });

  T({
    id: 'quant.pow2', family: 'quant', category: 'Squares and powers', difficulty: 1, tol: EXACT,
    params: function (rng) { return { k: int(rng, 1, 20) }; },
    prompt: function (p) { return M('2^{' + p.k + '}'); },
    answer: function (p) { return Math.pow(2, p.k); },
    distractors: function (p) { return [Math.pow(2, p.k - 1), Math.pow(2, p.k + 1), p.k * p.k, 2 * p.k]; },
    steps: function (p) {
      return p.k <= 10 ? ['Double ' + p.k + ' times: ' + range(1, p.k).map(function (i) { return Math.pow(2, i); }).join(', ') + '.']
        : [S('2^{10} = 1024'), S('2^{' + p.k + '} = 1024' + X + '2^{' + (p.k - 10) + '} = 1024' + X + Math.pow(2, p.k - 10) + ' = ' + Math.pow(2, p.k))];
    },
    formula: '2^(10 + k) = 1024 × 2^k',
    why: '$2^{10} \\approx 1000$ is the anchor: $2^{20}$ is about a million, $2^{30}$ about a billion.'
  });

  var TRICKS = {
    25: function (x) { return [S(x + X + '25 = ' + fr(x + X + '100', 4) + ' = ' + fr(x * 100, 4) + ' = ' + (x * 25))]; },
    99: function (x) { return [S(x + X + '99 = ' + x + X + '100 - ' + x + ' = ' + (x * 100) + ' - ' + x + ' = ' + (x * 99))]; },
    11: function (x) { return [S(x + X + '11 = ' + x + X + '10 + ' + x + ' = ' + (x * 10) + ' + ' + x + ' = ' + (x * 11))]; },
    125: function (x) { return [S(x + X + '125 = ' + fr(x + X + '1000', 8) + ' = ' + fr(x * 1000, 8) + ' = ' + (x * 125))]; }
  };
  T({
    id: 'quant.mul.trick', family: 'quant', category: 'Multiplication tricks', difficulty: 1, tol: EXACT,
    params: function (rng) { return { m: pick(rng, [25, 99, 11, 125]), x: int(rng, 10, 400) }; },
    prompt: function (p) { return M(p.x + X + p.m); },
    answer: function (p) { return p.x * p.m; },
    distractors: function (p) { return [p.x * (p.m + 1), p.x * (p.m - 1), p.x * p.m * 10, p.x * p.m + 100]; },
    steps: function (p) { return TRICKS[p.m](p.x); },
    formula: '25 = 100/4, 125 = 1000/8, 99 = 100 − 1, 11 = 10 + 1',
    why: 'Rewrite the awkward factor as a round number and a small correction.'
  });

  T({
    id: 'quant.est.prod', family: 'quant', category: 'Estimation', difficulty: 2, dp: 1,
    tol: function () { return { type: 'rel', v: 0.02 }; },
    params: function (rng) { return { a: int(rng, 11, 99) / 100, b: int(rng, 101, 999) * 10 }; },
    valid: function (p) { return Math.round(p.a * 100) % 10 !== 0 && p.b % 100 !== 0; },
    prompt: function (p) { return M(n(p.a, 2) + X + p.b + ' \\approx ?'); },
    answer: function (p) { return p.a * p.b; },
    distractors: function (p) { return [p.a * p.b * 10, p.a * p.b / 10, (1 - p.a) * p.b, p.a * p.b * 1.15]; },
    steps: function (p) {
      var bb = Math.round(p.b / 100) * 100;
      return ['Round ' + p.b + ' to ' + bb + ': ' + S(n(p.a, 2) + X + bb + ' = ' + n(p.a * bb, 1)),
        'Correct for the rounding: ' + M(n(p.a, 2) + X + paren(p.b - bb) + ' = ' + n(p.a * (p.b - bb), 1)) + ', total ' + n(p.a * p.b, 1) + '.'];
    },
    formula: 'a × b = a × (round b) + a × (b − round b)',
    why: 'Round the easy factor, then fix the error; the correction is small, so it can be rough.'
  });

  T({
    id: 'quant.rule72', family: 'quant', category: 'Growth and logs', difficulty: 1, unit: 'years', dp: 1,
    tol: function () { return { type: 'rel', v: 0.05 }; },
    params: function (rng) { return { r: pick(rng, [2, 3, 4, 6, 8, 9, 12]) }; },
    prompt: function (p) { return 'At ' + p.r + '% a year, how many years until an investment doubles?'; },
    answer: function (p) { return 72 / p.r; },
    distractors: function (p) { return [100 / p.r, 36 / p.r, 144 / p.r]; },
    steps: function (p) {
      return ['Rule of 72: ' + M(fr(72, p.r) + ' = ' + n(72 / p.r, 1)) + ' years.',
        'Exactly: ' + M(fr('\\ln 2', '\\ln(1 + ' + n(p.r / 100) + ')') + ' = ' + n(Math.LN2 / Math.log(1 + p.r / 100), 2)) + ' years.'];
    },
    formula: 'doubling time ≈ 72 / (rate in %)',
    why: '$\\ln 2 \\approx 0.693$ would say 69, but annual compounding grows a little slower than continuous, and 72 has many divisors.'
  });

  T({
    id: 'quant.compound', family: 'quant', category: 'Growth and logs', difficulty: 2, dp: 3,
    tol: function () { return { type: 'rel', v: 0.01 }; },
    params: function (rng) { return { r: int(rng, 2, 10), k: pick(rng, [2, 3, 5, 10]) }; },
    prompt: function (p) { return M(n(1 + p.r / 100, 2) + '^{' + p.k + '} \\approx ?'); },
    answer: function (p) { return Math.pow(1 + p.r / 100, p.k); },
    distractors: function (p) { var g = 1 + p.r / 100; return [1 + p.k * p.r / 100, Math.pow(g, p.k + 1), Math.pow(g, p.k - 1), Math.pow(g, 2 * p.k)]; },
    steps: function (p) {
      var r = p.r / 100, k = p.k, b2 = k * (k - 1) / 2, b3 = k * (k - 1) * (k - 2) / 6;
      var s = 1 + k * r + b2 * r * r + b3 * r * r * r;
      return ['Binomial with ' + M('r = ' + n(r)) + ' and ' + M('k = ' + k) + ': ' + S('(1 + r)^k \\approx 1 + kr + ' + fr('k(k - 1)', 2) + ' r^2 + ' + fr('k(k - 1)(k - 2)', 6) + ' r^3'),
        S('= 1 + ' + n(k * r) + ' + ' + n(b2 * r * r) + (b3 ? ' + ' + n(b3 * r * r * r) : '') + ' = ' + n(s, 4)),
        'Exactly ' + n(Math.pow(1 + r, k), 4) + '.'];
    },
    formula: '(1 + r)^k = Σ C(k, j) r^j',
    why: 'Simple interest $1 + kr$ misses the interest on interest; the $r^2$ term is that compounding.'
  });

  T({
    id: 'quant.ln.approx', family: 'quant', category: 'Growth and logs', difficulty: 2, dp: 3,
    tol: function () { return { type: 'abs', v: 0.005 }; },
    params: function (rng) { return { x: grid(rng, 1.01, 1.20, 0.01) }; },
    prompt: function (p) { return M('\\ln(' + n(p.x, 2) + ') \\approx ?'); },
    answer: function (p) { return Math.log(p.x); },
    distractors: function (p) { var u = p.x - 1; return [Math.log10(p.x), u + u * u / 2, u - u * u, 2 * u, u / 2]; },
    steps: function (p) {
      var u = F.round(p.x - 1, 2);
      return [M('\\ln(1 + u) \\approx u - ' + fr('u^2', 2) + ' + ' + fr('u^3', 3)) + ' with ' + S('u = ' + n(u)),
        S('= ' + n(u) + ' - ' + n(u * u / 2, 5) + ' + ' + n(u * u * u / 3, 5) + ' = ' + n(u - u * u / 2 + u * u * u / 3, 4))];
    },
    formula: 'ln(1 + u) ≈ u − u²/2',
    why: 'For small $u$ the log is just below $u$: a 10% simple return is a 9.5% log return.'
  });

  T({
    id: 'quant.exp.approx', family: 'quant', category: 'Growth and logs', difficulty: 2, dp: 3,
    tol: function () { return { type: 'abs', v: 0.002 }; },
    params: function (rng) { return { x: grid(rng, 0.01, 0.20, 0.01) }; },
    prompt: function (p) { return M('e^{-' + n(p.x, 2) + '} \\approx ?'); },
    answer: function (p) { return Math.exp(-p.x); },
    distractors: function (p) { return [Math.exp(p.x), 1 - p.x - p.x * p.x / 2, 1 - 2 * p.x, 1 + p.x, 1 - p.x]; },
    steps: function (p) { return [M('e^{-x} \\approx 1 - x + ' + fr('x^2', 2)) + ' with ' + S('x = ' + n(p.x)), S('= 1 - ' + n(p.x) + ' + ' + n(p.x * p.x / 2, 5) + ' = ' + n(1 - p.x + p.x * p.x / 2, 4))]; },
    formula: 'e^(−x) ≈ 1 − x + x²/2',
    why: 'This is the continuous discount factor: $e^{-rt}$ sits just above $1 - rt$.'
  });

  // Simple games: a die that pays k × face from m up and costs c below, or two coins.
  T({
    id: 'quant.ev', family: 'quant', category: 'Probability', difficulty: 2, unit: '€', dp: 2,
    params: function (rng) {
      return int(rng, 0, 1) ? { g: 'die', k: int(rng, 1, 3), m: int(rng, 3, 5), c: pick(rng, [1, 2, 3, 5]) }
        : { g: 'coins', a: pick(rng, [1, 2, 3, 4, 5]), c: pick(rng, [2, 4, 6, 8, 10]) };
    },
    prompt: function (p) {
      return p.g === 'die' ? 'Roll a fair die. Showing ' + p.m + ' or more, you win €' + p.k + ' times the number shown; otherwise you pay €' + p.c + '. Expected gain?'
        : 'Toss two fair coins. You win €' + p.a + ' per head, and pay €' + p.c + ' if both are tails. Expected gain?';
    },
    answer: function (p) {
      if (p.g === 'coins') return p.a - p.c / 4;
      var win = 0; for (var f = p.m; f <= 6; f++) win += p.k * f;
      return (win - p.c * (p.m - 1)) / 6;
    },
    distractors: function (p) {
      if (p.g === 'coins') return [p.a, 2 * p.a - p.c / 4, p.a - p.c / 2, p.a / 2 - p.c / 4, p.a + p.c / 4];
      var win = 0; for (var f = p.m; f <= 6; f++) win += p.k * f;
      return [win / 6, (win - p.c) / 6, win / (7 - p.m) - p.c];
    },
    steps: function (p) {
      if (p.g === 'coins') {
        return ['Expected number of heads: ' + M('2' + X + fr(1, 2) + ' = 1') + ', worth €' + p.a + '.',
          M('P(\\text{two tails}) = ' + fr(1, 4)) + ', costing ' + M(p.c + X + fr(1, 4) + ' = ' + n(p.c / 4, 2)) + ' €.',
          S('\\text{EV} = ' + p.a + ' - ' + n(p.c / 4, 2) + ' = ' + n(p.a - p.c / 4, 2))];
      }
      var faces = range(p.m, 6), win = 0; faces.forEach(function (f) { win += p.k * f; });
      return ['Wins: ' + M(p.k + X + '(' + faces.join(' + ') + ') = ' + win) + ', each face with probability ' + S(fr(1, 6)),
        'Losses: ' + (p.m - 1) + ' faces at €' + p.c + ' each, ' + M((p.m - 1) + X + p.c + ' = ' + (p.c * (p.m - 1))) + '.',
        S('\\text{EV} = ' + fr(win + ' - ' + (p.c * (p.m - 1)), 6) + ' = ' + n((win - p.c * (p.m - 1)) / 6, 2))];
    },
    formula: 'E[X] = Σ payoff × probability',
    why: 'Add every outcome weighted by its probability, losses included; by linearity, separate wins add up.'
  });

  // ======================= C. Finance calculations =======================
  // Rates are drawn in % (p.r = 5.5 means 5.5%); amounts in €, k€ or M€ as the unit says.

  function pc(x) { return n(x, 4) + '\\%'; }   // for maths: 5.5\%
  function pt(x) { return n(x, 4) + '%'; }     // for prose: 5.5%
  function dec(x) { return n(x / 100, 6); }   // 5.5 → "0.055"
  var REL = function (v) { return function () { return { type: 'rel', v: v }; }; };
  var BP = [10, 25, 50, 100];
  function signed(rng, arr) { return pick(rng, arr) * (int(rng, 0, 1) ? 1 : -1); }

  // ---- Rates and discounting ----

  T({
    id: 'fin.bp.convert', family: 'fin', category: 'Rates', difficulty: 1, unit: 'bp', tol: EXACT,
    params: function (rng) { var a = grid(rng, 0.5, 6, 0.05), d = grid(rng, -1, 1, 0.05); return { a: a, b: F.round(a + d, 2) }; },
    valid: function (p) { return p.b > 0 && p.b !== p.a; },
    prompt: function (p) { return 'A rate moves from ' + pt(p.a) + ' to ' + pt(p.b) + '. By how many basis points?'; },
    answer: function (p) { return Math.round(p.b * 100) - Math.round(p.a * 100); },
    distractors: function (p) { var x = Math.round(p.b * 100) - Math.round(p.a * 100); return [x / 10, x * 10, -x, x * 2]; },
    steps: function (p) {
      var x = Math.round(p.b * 100) - Math.round(p.a * 100);
      return [M('1\\% = 100') + ' bp.', 'Change: ' + M(pc(p.b) + ' - ' + pc(p.a) + ' = ' + n(x / 100) + '\\%') + ' = ' + n(x) + ' bp.'];
    },
    formula: 'bp = (b − a) in % × 100',
    why: 'A basis point is a hundredth of a percent; the classic slip is a factor of 10 (13 bp instead of 130 bp).'
  });

  var PV_GRID = function (rng) { return { c: pick(rng, [100, 1000]), t: int(rng, 1, 3), r: grid(rng, 2, 8, 0.5) }; };
  function years(t) { return t + ' year' + (t > 1 ? 's' : ''); }
  T({
    id: 'fin.pv.annual', family: 'fin', category: 'Rates', difficulty: 2, unit: '€', dp: 2, positive: true, tol: REL(0.005),
    params: PV_GRID,
    prompt: function (p) { return 'Present value of €' + p.c + ' received in ' + years(p.t) + ' at ' + pt(p.r) + ' (annual compounding)?'; },
    answer: function (p) { return p.c / Math.pow(1 + p.r / 100, p.t); },
    distractors: function (p) { var g = 1 + p.r / 100; return [p.c / g, p.c * Math.pow(g, p.t), p.c * (1 - p.r / 100 * p.t), p.c / Math.pow(g, p.t + 1)]; },
    steps: function (p) {
      var g = Math.pow(1 + p.r / 100, p.t);
      return [M('\\text{PV} = ' + fr('C', '(1 + r)^t')) + ' with ' + M('C = ' + p.c) + ', ' + M('r = ' + dec(p.r)) + ', ' + S('t = ' + p.t),
        S('(1 + ' + dec(p.r) + ')^{' + p.t + '} = ' + n(g, 5)),
        S('\\text{PV} = ' + fr(p.c, n(g, 5)) + ' = ' + n(p.c / g, 2))];
    },
    formula: 'PV = C / (1 + r)^t',
    why: 'Discount once per year of waiting; using $(1 + r)$ only once is the common mistake for $t > 1$.'
  });
  T({
    id: 'fin.pv.cont', family: 'fin', category: 'Rates', difficulty: 2, unit: '€', dp: 2, positive: true, tol: REL(0.005),
    params: PV_GRID,
    prompt: function (p) { return 'Present value of €' + p.c + ' received in ' + years(p.t) + ' at ' + pt(p.r) + ', continuously compounded?'; },
    answer: function (p) { return p.c * Math.exp(-p.r / 100 * p.t); },
    distractors: function (p) { var x = p.r / 100 * p.t; return [p.c * Math.exp(x), p.c * (1 - x), p.c * Math.exp(-p.r / 100), p.c * Math.exp(-x * 2)]; },
    steps: function (p) {
      var x = p.r / 100 * p.t;
      return [M('\\text{PV} = C\\, e^{-rt}') + ' with ' + S('rt = ' + dec(p.r) + X + p.t + ' = ' + n(x)),
        M('e^{-' + n(x) + '} \\approx 1 - x + ' + fr('x^2', 2) + ' = ' + n(1 - x + x * x / 2, 5)) + ' (exactly ' + n(Math.exp(-x), 5) + ').',
        S('\\text{PV} = ' + p.c + X + n(Math.exp(-x), 5) + ' = ' + n(p.c * Math.exp(-x), 2))];
    },
    formula: 'PV = C · e^(−rt)',
    why: 'Continuous compounding discounts a little more than annual compounding at the same quoted rate.'
  });
  T({
    id: 'fin.fv', family: 'fin', category: 'Rates', difficulty: 2, unit: '€', dp: 2, positive: true, tol: REL(0.005),
    params: PV_GRID,
    prompt: function (p) { return 'Future value of €' + p.c + ' invested for ' + years(p.t) + ' at ' + pt(p.r) + ' (annual compounding)?'; },
    answer: function (p) { return p.c * Math.pow(1 + p.r / 100, p.t); },
    distractors: function (p) { var g = 1 + p.r / 100; return [p.c * (1 + p.r / 100 * p.t), p.c / Math.pow(g, p.t), p.c * Math.pow(g, p.t + 1), p.c * Math.pow(g, p.t - 1)]; },
    steps: function (p) {
      var r = p.r / 100, g = Math.pow(1 + r, p.t);
      return [S('\\text{FV} = C\\, (1 + r)^t'),
        M('(1 + ' + dec(p.r) + ')^{' + p.t + '} = ' + n(g, 5)) + (p.t > 1 ? ' (simple interest would give ' + M('1 + rt = ' + n(1 + r * p.t, 4)) + ')' : '') + '.',
        S('\\text{FV} = ' + p.c + X + n(g, 5) + ' = ' + n(p.c * g, 2))];
    },
    formula: 'FV = C (1 + r)^t',
    why: 'Compounding adds interest on interest; simple interest $C(1 + rt)$ is always a little lower for $t > 1$.'
  });
  T({
    id: 'fin.real.rate', family: 'fin', category: 'Rates', difficulty: 1, unit: '%', tol: EXACT,
    params: function (rng) { return { i: int(rng, 0, 8), pi: int(rng, 0, 8) }; },
    valid: function (p) { return p.i + p.pi > 0; },
    prompt: function (p) { return 'Nominal rate ' + p.i + '%, inflation ' + p.pi + '%. Real rate, approximately?'; },
    answer: function (p) { return p.i - p.pi; },
    distractors: function (p) { return [p.i + p.pi, p.pi - p.i, p.i, -p.pi]; },
    steps: function (p) { return ['Fisher, first order: ' + S('r \\approx i - \\pi'), S('r \\approx ' + p.i + ' - ' + p.pi + ' = ' + n(p.i - p.pi) + '\\%')]; },
    formula: 'r ≈ i − π',
    why: 'The real rate is what your money earns in goods; inflation eats the nominal rate.'
  });
  T({
    id: 'fin.real.rate.exact', family: 'fin', category: 'Rates', difficulty: 3, unit: '%', dp: 2,
    params: function (rng) { return { i: int(rng, 0, 8), pi: int(rng, 1, 8) }; },
    valid: function (p) { return p.i !== p.pi; },
    prompt: function (p) { return 'Nominal rate ' + p.i + '%, inflation ' + p.pi + '%. Exact real rate?'; },
    answer: function (p) { return ((1 + p.i / 100) / (1 + p.pi / 100) - 1) * 100; },
    distractors: function (p) { return [p.i - p.pi, ((1 + p.i / 100) * (1 + p.pi / 100) - 1) * 100, (p.i - p.pi) / (1 + p.i / 100), ((1 + p.pi / 100) / (1 + p.i / 100) - 1) * 100]; },
    steps: function (p) {
      var x = (1 + p.i / 100) / (1 + p.pi / 100);
      return [S('1 + r = ' + fr('1 + i', '1 + \\pi') + ' = ' + fr(n(1 + p.i / 100), n(1 + p.pi / 100)) + ' = ' + n(x, 5)),
        M('r = ' + n((x - 1) * 100, 3) + '\\%') + ', a little closer to zero than ' + S('i - \\pi = ' + n(p.i - p.pi) + '\\%')];
    },
    formula: '1 + r = (1 + i) / (1 + π)',
    why: '$i - \\pi$ ignores the cross term; dividing by $1 + \\pi$ shrinks the real rate toward zero.'
  });

  // ---- Bonds ----

  T({
    id: 'fin.bond.price.1y', family: 'fin', category: 'Bonds', difficulty: 1, unit: '€', dp: 1, positive: true,
    params: function (rng) { return { c: int(rng, 1, 8), y: int(rng, 1, 8) }; },
    prompt: function (p) { return 'A 1-year bond pays a ' + p.c + '% annual coupon on 100 face value. Yield ' + p.y + '%. Price?'; },
    answer: function (p) { return (100 + p.c) / (1 + p.y / 100); },
    distractors: function (p) { return [100 / (1 + p.y / 100), (100 + p.c) / (1 + p.c / 100), (100 + p.c) * (1 + p.y / 100), 100 + p.c]; },
    steps: function (p) {
      return ['One cash flow: ' + M('100 + ' + p.c + ' = ' + (100 + p.c)) + ' in one year.',
        S('P = ' + fr('100 + c', '1 + y') + ' = ' + fr(100 + p.c, n(1 + p.y / 100)) + ' = ' + n((100 + p.c) / (1 + p.y / 100), 3))];
    },
    formula: 'P = (100 + c) / (1 + y)',
    why: 'Coupon above yield means a price above 100, and below means below 100.'
  });
  T({
    id: 'fin.bond.price.2y', family: 'fin', category: 'Bonds', difficulty: 2, unit: '€', dp: 1, positive: true,
    params: function (rng) { return { c: int(rng, 2, 7), y: int(rng, 2, 7) }; },
    prompt: function (p) { return 'A 2-year bond pays a ' + p.c + '% annual coupon on 100 face value. Yield ' + p.y + '%. Price?'; },
    answer: function (p) { var g = 1 + p.y / 100; return p.c / g + (100 + p.c) / (g * g); },
    distractors: function (p) {
      var g = 1 + p.y / 100;
      return [(100 + 2 * p.c) / (g * g), p.c / g + (100 + p.c) / g, 100 / (g * g), (100 + 2 * p.c) / g];
    },
    steps: function (p) {
      var g = 1 + p.y / 100, a = p.c / g, b = (100 + p.c) / (g * g);
      return ['Year 1: ' + S(fr(p.c, n(g)) + ' = ' + n(a, 3)), 'Year 2: ' + S(fr(100 + p.c, n(g) + '^2') + ' = ' + n(b, 3)), S('P = ' + n(a, 3) + ' + ' + n(b, 3) + ' = ' + n(a + b, 3))];
    },
    formula: 'P = c / (1 + y) + (100 + c) / (1 + y)²',
    why: 'Each cash flow is discounted for its own date; a rough check is $100 + 2(c - y)$, the duration estimate.'
  });
  T({
    id: 'fin.bond.premium', family: 'fin', category: 'Bonds', difficulty: 1, kind: 'choice',
    params: function (rng) {
      var c = int(rng, 1, 8), y = int(rng, 1, 8), m = pick(rng, [2, 5, 10, 30]);
      var correct = c > y ? 0 : c === y ? 1 : 2;
      return {
        c: c, y: y, m: m,
        options: ['Above par (above 100)', 'At par (100)', 'Below par (below 100)', 'It depends on the maturity'],
        correct: correct,
        steps: ['Coupon ' + M('c = ' + c + '\\%') + ', yield ' + M('y = ' + y + '\\%') + ': ' + S('c ' + (c > y ? '>' : c === y ? '=' : '<') + ' y')],
        explanation: 'A bond paying more than the market yield is worth more than its face value, so it trades at a premium; paying less, it trades at a discount. The maturity only changes how far from 100 the price is, never the side.'
      };
    },
    prompt: function (p) { return 'A ' + p.m + '-year bond pays a ' + p.c + '% coupon and yields ' + p.y + '%. Where is its price?'; },
    formula: 'c > y ⇒ P > 100, c = y ⇒ P = 100, c < y ⇒ P < 100'
  });
  T({
    id: 'fin.zc.price', family: 'fin', category: 'Bonds', difficulty: 2, unit: '€', dp: 2, positive: true, tol: REL(0.005),
    params: function (rng) { return { m: pick(rng, [1, 2, 5, 10, 20]), y: int(rng, 1, 6) }; },
    prompt: function (p) { return 'Zero-coupon bond, face 100, maturity ' + years(p.m) + ', yield ' + p.y + '% continuously compounded. Price?'; },
    answer: function (p) { return 100 * Math.exp(-p.y / 100 * p.m); },
    distractors: function (p) { var x = p.y / 100 * p.m; return [100 / Math.pow(1 + p.y / 100, p.m), 100 * (1 - x), 100 * Math.exp(-p.y / 100), 100 * Math.exp(-x / 2)]; },
    steps: function (p) {
      var x = p.y / 100 * p.m;
      return [S('y\\tau = ' + dec(p.y) + X + p.m + ' = ' + n(x)), S('P = 100\\, e^{-' + n(x) + '} = 100' + X + n(Math.exp(-x), 5) + ' = ' + n(100 * Math.exp(-x), 3))];
    },
    formula: 'P = 100 · e^(−yτ)',
    why: 'Long zeros are very rate-sensitive: their whole value sits at the far end of the curve.'
  });
  T({
    id: 'fin.duration.approx', family: 'fin', category: 'Bonds', difficulty: 2, unit: '€', dp: 2, positive: true,
    params: function (rng) { return { P: pick(rng, [80, 90, 100, 110, 120]), D: int(rng, 2, 15), d: signed(rng, BP) }; },
    prompt: function (p) { return 'A bond priced ' + p.P + ' has modified duration ' + p.D + '. Yields ' + (p.d > 0 ? 'rise' : 'fall') + ' by ' + Math.abs(p.d) + ' bp. New price, by duration?'; },
    answer: function (p) { return p.P * (1 - p.D * p.d / 10000); },
    distractors: function (p) { return [p.P * (1 + p.D * p.d / 10000), p.P * (1 - p.D * p.d / 100), p.P - p.D * p.d / 100, p.P * (1 - p.D * p.d / 1000)]; },
    steps: function (p) {
      var ch = -p.D * p.d / 10000;
      return [S(fr('\\Delta P', 'P') + ' \\approx -D\\, \\Delta y = -' + p.D + X + paren(p.d / 10000) + ' = ' + n(ch * 100) + '\\%'),
        S('P_1 = ' + p.P + X + '(1 ' + sgn(ch) + ') = ' + n(p.P * (1 + ch), 3))];
    },
    formula: 'P₁ ≈ P (1 − D Δy)',
    why: 'Price moves opposite to yield, about $D\\%$ per 100 bp; the sign is the trap.'
  });
  T({
    id: 'fin.convexity', family: 'fin', category: 'Bonds', difficulty: 3, unit: '€', dp: 2, positive: true,
    params: function (rng) { return { P: pick(rng, [80, 90, 100, 110, 120]), m: pick(rng, [5, 10, 20, 30]), d: signed(rng, [50, 100, 200]) }; },
    prompt: function (p) { return 'A zero-coupon bond priced ' + p.P + ', maturity ' + p.m + ' years (continuous yield, so ' + M('D = ' + p.m) + ', ' + M('C = ' + (p.m * p.m)) + '). Yields ' + (p.d > 0 ? 'rise' : 'fall') + ' ' + Math.abs(p.d) + ' bp. New price with convexity?'; },
    answer: function (p) { var dy = p.d / 10000; return p.P * (1 - p.m * dy + 0.5 * p.m * p.m * dy * dy); },
    distractors: function (p) { var dy = p.d / 10000, D = p.m, C = D * D; return [p.P * (1 - D * dy), p.P * (1 - D * dy - 0.5 * C * dy * dy), p.P * (1 - D * dy + C * dy * dy), p.P * (1 + D * dy + 0.5 * C * dy * dy)]; },
    steps: function (p) {
      var dy = p.d / 10000, a = -p.m * dy, b = 0.5 * p.m * p.m * dy * dy;
      return ['Duration term: ' + S('-D\\, \\Delta y = -' + p.m + X + paren(dy) + ' = ' + n(a, 5)),
        'Convexity term: ' + S('\\tfrac{1}{2}\\, C\\, \\Delta y^2 = \\tfrac{1}{2}' + X + (p.m * p.m) + X + paren(dy) + '^2 = ' + n(b, 5)),
        S('P_1 = ' + p.P + X + '(1 ' + sgn(a, 5) + ' + ' + n(b, 5) + ') = ' + n(p.P * (1 + a + b), 3))];
    },
    formula: 'P₁ ≈ P (1 − D Δy + ½ C Δy²)',
    why: 'The convexity term $\\tfrac{1}{2}\\, C\\, \\Delta y^2$ is always positive: it softens losses when yields rise and adds to gains when they fall.'
  });
  T({
    id: 'fin.duration.zc', family: 'fin', category: 'Bonds', difficulty: 1, unit: 'years', tol: EXACT, positive: true,
    params: function (rng) { return { m: pick(rng, [1, 2, 3, 5, 7, 10, 15, 20, 30]), y: int(rng, 1, 6) }; },
    prompt: function (p) { return 'Macaulay duration of a ' + p.m + '-year zero-coupon bond yielding ' + p.y + '%?'; },
    answer: function (p) { return p.m; },
    distractors: function (p) { return [p.m / 2, p.m * p.m, p.m / (1 + p.y / 100) - 1, p.m + 1]; },
    steps: function (p) { return ['Duration is the cash-flow-weighted average time to payment.', 'A zero has one cash flow, at ' + years(p.m) + ', so all the weight is there: ' + M('D = ' + p.m) + '; the yield does not matter.']; },
    formula: 'D(zero) = maturity',
    why: 'Coupons pull duration below maturity; with no coupons there is nothing to pull it.'
  });
  T({
    id: 'fin.credit.spread', family: 'fin', category: 'Bonds', difficulty: 1, unit: 'bp', tol: EXACT,
    params: function (rng) { var g = grid(rng, 0.5, 5, 0.05), s = grid(rng, 0.2, 5, 0.05); return { g: g, c: F.round(g + s, 2) }; },
    prompt: function (p) { return 'A corporate bond yields ' + pt(p.c) + ', the government bond of the same maturity ' + pt(p.g) + '. Credit spread in bp?'; },
    answer: function (p) { return Math.round(p.c * 100) - Math.round(p.g * 100); },
    distractors: function (p) { var x = Math.round(p.c * 100) - Math.round(p.g * 100); return [x / 10, x * 10, x / 100, Math.round(p.c * 100) + Math.round(p.g * 100)]; },
    steps: function (p) { var x = Math.round(p.c * 100) - Math.round(p.g * 100); return [M('s = ' + pc(p.c) + ' - ' + pc(p.g) + ' = ' + n(x / 100) + '\\%') + ' = ' + x + ' bp.']; },
    formula: 'spread = (y_corp − y_gov) × 100 bp',
    why: 'The spread pays for default and liquidity risk over the same-maturity government bond.'
  });

  // ---- Macro ----

  T({
    id: 'fin.taylor', family: 'fin', category: 'Macro', difficulty: 2, unit: '%', dp: 1,
    params: function (rng) { return { pi: int(rng, 0, 8), gap: int(rng, -3, 3) }; },
    prompt: function (p) {
      return 'Taylor rule with ' + M('r^* = 2\\%') + ' and target ' + M('\\pi^* = 2\\%') + '. Inflation ' + M('\\pi = ' + p.pi + '\\%') +
        ', output gap ' + M((p.gap > 0 ? '+' : '') + n(p.gap) + '\\%') + '. Policy rate?';
    },
    answer: function (p) { return 2 + p.pi + 0.5 * (p.pi - 2) + 0.5 * p.gap; },
    distractors: function (p) { return [2 + 0.5 * (p.pi - 2) + 0.5 * p.gap, 2 + p.pi + 0.5 * (p.pi - 2) - 0.5 * p.gap, 2 + p.pi + (p.pi - 2) + p.gap, p.pi + 0.5 * (p.pi - 2) + 0.5 * p.gap]; },
    steps: function (p) {
      return [S('i = r^* + \\pi + 0.5\\, (\\pi - \\pi^*) + 0.5' + X + '\\text{gap}'),
        S('= 2 + ' + p.pi + ' + 0.5' + X + '(' + p.pi + ' - 2) + 0.5' + X + paren(p.gap)),
        S('= 2 + ' + p.pi + ' ' + sgn(0.5 * (p.pi - 2)) + ' ' + sgn(0.5 * p.gap) + ' = ' + n(2 + p.pi + 0.5 * (p.pi - 2) + 0.5 * p.gap) + '\\%')];
    },
    formula: 'i = r* + π + 0.5 (π − π*) + 0.5 (y − y*)',
    why: 'The nominal rate moves 1.5 for 1 with inflation, so the real rate rises when inflation rises (the Taylor principle).'
  });

  // ---- Returns and volatility ----

  var MOVES = [-50, -25, -20, -10, -5, 5, 10, 20, 25, 50];
  T({
    id: 'fin.return.multi', family: 'fin', category: 'Returns and volatility', difficulty: 1, unit: '%', dp: 2,
    params: function (rng) { return { a: pick(rng, MOVES), b: pick(rng, MOVES) }; },
    prompt: function (p) { return 'An asset returns ' + (p.a > 0 ? '+' : '−') + Math.abs(p.a) + '% then ' + (p.b > 0 ? '+' : '−') + Math.abs(p.b) + '%. Total return?'; },
    answer: function (p) { return ((1 + p.a / 100) * (1 + p.b / 100) - 1) * 100; },
    distractors: function (p) { return [p.a + p.b, p.a + p.b - p.a * p.b / 100, p.a * p.b / 100, (p.a + p.b) / 2]; },
    steps: function (p) {
      var g = (1 + p.a / 100) * (1 + p.b / 100);
      return ['Returns multiply: ' + S(n(1 + p.a / 100) + X + n(1 + p.b / 100) + ' = ' + n(g)),
        'Total: ' + M(n(g) + ' - 1 = ' + n((g - 1) * 100) + '\\%') + '; the cross term ' + M('ab = ' + n(p.a * p.b / 100) + '\\%') + ' is what adding misses.'];
    },
    formula: '(1 + a)(1 + b) − 1 = a + b + ab',
    why: 'Simple returns compound, they do not add: +50% then −50% leaves you down 25%.'
  });
  T({
    id: 'fin.return.log', family: 'fin', category: 'Returns and volatility', difficulty: 2, unit: '%', dp: 2,
    tol: function () { return { type: 'abs', v: 0.1 }; },
    params: function (rng) { var s; do { s = int(rng, 80, 125); } while (s === 100); return { s: s }; },
    prompt: function (p) { return 'A price goes from 100 to ' + p.s + '. Log return?'; },
    answer: function (p) { return Math.log(p.s / 100) * 100; },
    distractors: function (p) { var u = p.s / 100 - 1; return [u * 100, Math.log10(p.s / 100) * 100, (u + u * u / 2) * 100, (u - u * u) * 100]; },
    steps: function (p) {
      var u = p.s / 100 - 1;
      return ['Simple return ' + S('u = ' + n(u * 100) + '\\%'),
        S('\\ln(1 + u) \\approx u - ' + fr('u^2', 2) + ' + ' + fr('u^3', 3) + ' = ' + n((u - u * u / 2 + u * u * u / 3) * 100, 3) + '\\%'),
        'Exactly ' + S('\\ln(' + n(p.s / 100) + ') = ' + n(Math.log(p.s / 100) * 100, 3) + '\\%')];
    },
    formula: 'r_log = ln(S₁ / S₀) ≈ u − u²/2',
    why: 'Log returns are below simple returns for gains and further from zero for losses; they add up over time.'
  });
  var SIGD = range(0.5, 3, 0.25);
  T({
    id: 'fin.vol.annualize', family: 'fin', category: 'Returns and volatility', difficulty: 2, unit: '%', dp: 1, positive: true, tol: REL(0.01),
    params: function (rng) { return { s: pick(rng, SIGD) }; },
    prompt: function (p) { return 'Daily volatility ' + pt(p.s) + '. Annual volatility (252 trading days)?'; },
    answer: function (p) { return p.s * Math.sqrt(252); },
    distractors: function (p) { return [p.s * 252, p.s * Math.sqrt(365), p.s * Math.sqrt(12), p.s * 252 / 2]; },
    steps: function (p) {
      return ['Variance grows with time, so volatility grows with ' + S(sq('\\text{time}')),
        S('\\sigma_{\\text{year}} = \\sigma_{\\text{day}} ' + sq(252) + ' \\approx ' + n(p.s) + X + C.sqrt252 + ' = ' + n(p.s * C.sqrt252, 2) + '\\%')];
    },
    formula: 'σ_annual = σ_daily × √252 (√252 ≈ 15.87)',
    why: 'Independent daily moves partly cancel, so 252 days give $\\sqrt{252} \\approx 16$ times the daily volatility, not 252 times.'
  });
  T({
    id: 'fin.vol.deannualize', family: 'fin', category: 'Returns and volatility', difficulty: 2, unit: '%', dp: 2, positive: true, tol: REL(0.01),
    params: function (rng) { return { s: pick(rng, range(10, 60, 5)) }; },
    prompt: function (p) { return 'Annual volatility ' + p.s + '%. Daily volatility (252 trading days)?'; },
    answer: function (p) { return p.s / Math.sqrt(252); },
    distractors: function (p) { return [p.s / 252, p.s / Math.sqrt(365), p.s / Math.sqrt(12), p.s / Math.sqrt(52)]; },
    steps: function (p) {
      return [S('\\sigma_{\\text{day}} = ' + fr('\\sigma_{\\text{year}}', sq(252)) + ' \\approx ' + fr(p.s, C.sqrt252) + ' = ' + n(p.s / C.sqrt252, 3) + '\\%'), 'Quick check: divide by 16.'];
    },
    formula: 'σ_daily = σ_annual / √252',
    why: 'Dividing by 16 is the trader shortcut: a 16% annual vol is about a 1% daily move.'
  });
  T({
    id: 'fin.vol.horizon', family: 'fin', category: 'Returns and volatility', difficulty: 1, unit: '%', dp: 2, positive: true,
    params: function (rng) { return { s: pick(rng, SIGD), h: pick(rng, [4, 9, 16, 25]) }; },
    prompt: function (p) { return 'Daily volatility ' + pt(p.s) + '. Volatility over ' + p.h + ' days?'; },
    answer: function (p) { return p.s * Math.sqrt(p.h); },
    distractors: function (p) { return [p.s * p.h, p.s / Math.sqrt(p.h), p.s * p.h / 2, p.s * (Math.sqrt(p.h) + 1)]; },
    steps: function (p) { return [S('\\sigma_h = \\sigma_{\\text{day}} ' + sq('h') + ' = ' + n(p.s) + X + sq(p.h) + ' = ' + n(p.s) + X + Math.sqrt(p.h) + ' = ' + n(p.s * Math.sqrt(p.h)) + '\\%')]; },
    formula: 'σ_h = σ_daily × √h',
    why: 'Square-root-of-time scaling assumes independent days with the same volatility.'
  });
  T({
    id: 'fin.sharpe', family: 'fin', category: 'Returns and volatility', difficulty: 1, dp: 2,
    params: function (rng) { return { mu: int(rng, 4, 15), rf: int(rng, 0, 4), s: pick(rng, [5, 8, 10, 12, 15, 20, 25]) }; },
    valid: function (p) { return p.mu > p.rf; },
    prompt: function (p) { return 'A fund returns ' + p.mu + '% a year with ' + p.s + '% volatility; the risk-free rate is ' + p.rf + '%. Sharpe ratio?'; },
    answer: function (p) { return (p.mu - p.rf) / p.s; },
    distractors: function (p) { return [p.mu / p.s, (p.mu + p.rf) / p.s, p.s / (p.mu - p.rf), (p.mu - p.rf) / p.s * 10]; },
    steps: function (p) {
      return ['Excess return ' + S('\\mu - r_f = ' + p.mu + ' - ' + p.rf + ' = ' + (p.mu - p.rf) + '\\%'),
        S('\\text{Sharpe} = ' + fr('\\mu - r_f', '\\sigma') + ' = ' + fr(p.mu - p.rf, p.s) + ' = ' + n((p.mu - p.rf) / p.s, 3))];
    },
    formula: 'Sharpe = (μ − r_f) / σ',
    why: 'Only the return above cash pays for the risk taken; forgetting $r_f$ flatters the fund.'
  });

  // ---- Banks and ALM ----

  function bank(rng) {
    var A = pick(rng, [100, 200, 500]), k = pick(rng, [5, 8, 10]);
    return { A: A, E: A * k / 100, L: A - A * k / 100, rA: grid(rng, 2, 6, 0.25), rL: grid(rng, 0.5, 4, 0.25) };
  }
  function bankText(p) { return 'A bank has ' + p.A + ' M€ of assets earning ' + pt(p.rA) + ', funded by ' + n(p.L) + ' M€ of deposits paying ' + pt(p.rL) + ' and ' + n(p.E) + ' M€ of equity.'; }
  T({
    id: 'fin.nii', family: 'fin', category: 'Banks and ALM', difficulty: 1, unit: 'M€', dp: 2,
    params: bank, valid: function (p) { return p.rL < p.rA; },
    prompt: function (p) { return bankText(p) + ' Annual net interest income?'; },
    answer: function (p) { return (p.A * p.rA - p.L * p.rL) / 100; },
    distractors: function (p) { return [p.A * (p.rA - p.rL) / 100, p.A * p.rA / 100, (p.L * p.rL - p.A * p.rA) / 100, (p.A * p.rA - p.A * p.rL) / 100 + p.E / 10]; },
    steps: function (p) {
      var i = p.A * p.rA / 100, c = p.L * p.rL / 100;
      return ['Interest earned: ' + M('A\\, r_A = ' + p.A + X + dec(p.rA) + ' = ' + n(i)) + ' M€.',
        'Interest paid: ' + M('L\\, r_L = ' + n(p.L) + X + dec(p.rL) + ' = ' + n(c)) + ' M€ (equity pays no interest).',
        M('\\text{NII} = ' + n(i) + ' - ' + n(c) + ' = ' + n(i - c)) + ' M€.'];
    },
    formula: 'NII = A · r_A − L · r_L',
    why: 'Equity is interest-free funding, so NII is a bit more than assets times the rate margin.'
  });
  T({
    id: 'fin.nii.shock', family: 'fin', category: 'Banks and ALM', difficulty: 2, unit: 'k€', dp: 1,
    params: function (rng) { var b = bank(rng); b.d = pick(rng, [25, 50, 100]); return b; },
    valid: function (p) { return p.rL < p.rA; },
    prompt: function (p) { return bankText(p) + ' Deposit rates rise by ' + p.d + ' bp while asset rates stay fixed. Change in annual NII, in k€?'; },
    answer: function (p) { return -p.L * p.d / 10; },
    distractors: function (p) { return [p.L * p.d / 10, -p.A * p.d / 10, -p.L * p.d / 100, -p.L * p.d]; },
    steps: function (p) {
      return ['Only the deposit cost changes: ' + S('\\Delta\\text{NII} = -L\\, \\Delta r_L'),
        M('= -' + n(p.L) + X + n(p.d / 10000) + ' = -' + n(p.L * p.d / 10000)) + ' M€, that is ' + M('-' + n(p.L * p.d / 10)) + ' k€.'];
    },
    formula: 'ΔNII = −L · Δr_L',
    why: 'A bank with fixed-rate assets and repricing deposits loses margin when rates rise.'
  });
  T({
    id: 'fin.eve.gap', family: 'fin', category: 'Banks and ALM', difficulty: 2, unit: 'M€', dp: 2,
    params: function (rng) { var b = bank(rng); b.DA = int(rng, 3, 10); b.DL = pick(rng, [0.5, 1, 2]); b.d = signed(rng, [50, 100, 200]); return b; },
    prompt: function (p) { return 'Assets ' + p.A + ' M€ with duration ' + p.DA + ', liabilities ' + n(p.L) + ' M€ with duration ' + n(p.DL) + '. Rates ' + (p.d > 0 ? 'rise' : 'fall') + ' ' + Math.abs(p.d) + ' bp. Change in EVE?'; },
    answer: function (p) { return -(p.DA * p.A - p.DL * p.L) * p.d / 10000; },
    distractors: function (p) { var dy = p.d / 10000; return [(p.DA * p.A - p.DL * p.L) * dy, -(p.DA - p.DL) * p.A * dy, -p.DA * p.A * dy, -(p.DA * p.A + p.DL * p.L) * dy]; },
    steps: function (p) {
      var g = p.DA * p.A - p.DL * p.L;
      return ['Dollar-duration gap: ' + S('D_A A - D_L L = ' + p.DA + X + p.A + ' - ' + n(p.DL) + X + n(p.L) + ' = ' + n(g)),
        M('\\Delta\\text{EVE} = -\\text{gap}' + X + '\\Delta y = -' + n(g) + X + paren(p.d / 10000) + ' = ' + n(-g * p.d / 10000)) + ' M€.'];
    },
    formula: 'ΔEVE ≈ −(D_A·A − D_L·L) · Δy',
    why: 'Long assets funded short: rising rates cut the value of assets more than liabilities, so equity value falls.'
  });
  T({
    id: 'fin.eve.outlier', family: 'fin', category: 'Banks and ALM', difficulty: 2, kind: 'choice',
    params: function (rng) {
      var t1 = pick(rng, [20, 30, 40, 50, 60]), e, lim = 0.15 * t1;
      do { e = signed(rng, range(2, 12)); } while (Math.abs(e) === lim);
      var out = Math.abs(e) > lim;
      return {
        t1: t1, e: e,
        options: ['Yes: $|\\Delta\\text{EVE}|$ is above 15% of Tier 1', 'No: $|\\Delta\\text{EVE}|$ is below 15% of Tier 1', 'Yes: any fall in EVE makes the bank an outlier', 'No: only the change in NII counts for the test'],
        correct: out ? 0 : 1,
        steps: ['Limit: ' + M('15\\%' + X + t1 + ' = ' + n(lim)) + ' M€.', M('|\\Delta\\text{EVE}| = ' + Math.abs(e)) + ' M€, which is ' + (out ? 'above' : 'below') + ' the limit.'],
        explanation: 'The supervisory outlier test compares the worst $\\Delta\\text{EVE}$ under the six standard shocks with 15% of Tier 1 capital. Above it, the bank is an outlier and the supervisor can require action; NII has its own, separate test.'
      };
    },
    prompt: function (p) { return 'Under the worst supervisory shock, a bank\'s ' + M('\\Delta\\text{EVE}') + ' is ' + (p.e < 0 ? '−' : '+') + Math.abs(p.e) + ' M€. Its Tier 1 capital is ' + p.t1 + ' M€. Is it an outlier?'; },
    formula: 'outlier if |ΔEVE| > 15% × Tier 1'
  });

  // ---- Risk measures ----
  // Amounts: V in M€ and σ in %, so σ × V in k€ is σ × V × 10.

  function zTex(a) { return 'z_{' + a + '} = ' + C.z[a].toFixed(4); }
  function normPdf(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); }
  T({
    id: 'fin.var.gauss', family: 'fin', category: 'Risk', difficulty: 2, unit: 'k€', dp: 1, positive: true, tol: REL(0.01),
    params: function (rng) { return { V: pick(rng, [1, 2, 5, 10]), s: pick(rng, [0.5, 1, 1.5, 2]), a: pick(rng, [95, 99]) }; },
    prompt: function (p) { return 'Position ' + p.V + ' M€, daily volatility ' + pt(p.s) + ', Gaussian returns with mean 0. 1-day VaR at ' + p.a + '%, in k€?'; },
    answer: function (p) { return C.z[p.a] * p.s * p.V * 10; },
    distractors: function (p) { var b = p.s * p.V * 10; return [C.z[p.a === 99 ? 97.5 : 99] * b, C.z[90] * b, C.z[p.a] * p.s * p.s / 100 * p.V * 1000, C.z[p.a] * b * Math.sqrt(10)]; },
    steps: function (p) {
      var b = p.s * p.V * 10;
      return ['1-day ' + M('\\sigma') + ' in money: ' + M(n(p.s) + '\\%' + X + p.V) + ' M€ = ' + n(b) + ' k€.', M(zTex(p.a)) + ' (one-sided).',
        M('\\text{VaR} = z\\, \\sigma\\, V = ' + C.z[p.a].toFixed(4) + X + n(b) + ' = ' + n(C.z[p.a] * b, 2)) + ' k€.'];
    },
    formula: 'VaR_α = z_α · σ · V',
    why: 'VaR is a quantile: $1.645\\sigma$ at 95%, $2.326\\sigma$ at 99%. Using 1.96 for 99% mixes it up with a two-sided 95% interval.'
  });
  T({
    id: 'fin.var.horizon', family: 'fin', category: 'Risk', difficulty: 1, unit: 'k€', dp: 1, positive: true,
    tol: function (p) { return Number.isInteger(Math.sqrt(p.h)) ? { type: 'round' } : { type: 'rel', v: 0.01 }; },
    params: function (rng) { return { v: pick(rng, [10, 20, 25, 40, 50, 100, 200]), h: pick(rng, [4, 9, 10, 16, 25]) }; },
    prompt: function (p) { return '1-day VaR is ' + p.v + ' k€. VaR over ' + p.h + ' days (square-root-of-time rule)?'; },
    answer: function (p) { return p.v * Math.sqrt(p.h); },
    distractors: function (p) { return [p.v * p.h, p.v * p.h / 2, p.v / Math.sqrt(p.h), p.v * (Math.sqrt(p.h) + 1)]; },
    steps: function (p) { return [M('\\text{VaR}_{' + p.h + '} = \\text{VaR}_1 ' + sq(p.h) + ' = ' + p.v + X + n(Math.sqrt(p.h), 4) + ' = ' + n(p.v * Math.sqrt(p.h), 2)) + ' k€.']; },
    formula: 'VaR_h = VaR_1 · √h',
    why: 'Basel 10-day VaR from 1-day VaR uses $\\sqrt{10} \\approx 3.16$; it assumes independent, identically distributed days.'
  });
  T({
    id: 'fin.es.gauss', family: 'fin', category: 'Risk', difficulty: 3, unit: 'k€', dp: 1, positive: true, tol: REL(0.01),
    params: function (rng) { return { V: pick(rng, [1, 2, 5, 10]), s: pick(rng, [0.5, 1, 1.5, 2]), a: pick(rng, [97.5, 99]) }; },
    prompt: function (p) { return 'Position ' + p.V + ' M€, daily volatility ' + pt(p.s) + ', Gaussian with mean 0. 1-day expected shortfall at ' + p.a + '%, in k€?'; },
    answer: function (p) { return p.s * p.V * 10 * normPdf(C.z[p.a]) / (1 - p.a / 100); },
    distractors: function (p) { var b = p.s * p.V * 10, other = p.a === 99 ? 97.5 : 99; return [C.z[p.a] * b, b * normPdf(C.z[other]) / (1 - p.a / 100), b * normPdf(C.z[p.a]) / (1 - other / 100), C.z[other] * b]; },
    steps: function (p) {
      var b = p.s * p.V * 10, ph = C.phi[p.a], k = ph / (1 - p.a / 100);
      return [M('\\sigma') + ' in money: ' + n(b) + ' k€; ' + M(zTex(p.a)) + ', ' + S('\\varphi(' + C.z[p.a].toFixed(4) + ') = ' + ph),
        M('\\text{ES} = \\sigma\\, ' + fr('\\varphi(z)', '1 - \\alpha') + ' = ' + n(b) + X + fr(ph, n(1 - p.a / 100)) + ' = ' + n(b) + X + n(k, 3) + ' = ' + n(b * k, 2)) + ' k€.'];
    },
    formula: 'ES_α = σ · V · φ(z_α) / (1 − α)',
    why: 'ES averages the losses beyond VaR, so it is always larger. ES at 97.5% $\\approx$ VaR at 99% ($2.34\\sigma$ against $2.33\\sigma$), which is why Basel swapped one for the other.'
  });
  T({
    id: 'fin.var.port2', family: 'fin', category: 'Risk', difficulty: 3, unit: 'k€', dp: 1, positive: true, tol: REL(0.01),
    params: function (rng) { return { v1: pick(rng, [1, 2, 4, 5]), v2: pick(rng, [1, 2, 4, 5]), s1: pick(rng, [1, 2]), s2: pick(rng, [1, 2]), rho: pick(rng, [-0.5, 0, 0.5, 0.8, 1]), a: pick(rng, [95, 99]) }; },
    prompt: function (p) { return 'Two positions: ' + p.v1 + ' M€ with daily vol ' + p.s1 + '%, and ' + p.v2 + ' M€ with daily vol ' + p.s2 + '%. Correlation ' + M('\\rho = ' + n(p.rho)) + '. Gaussian 1-day VaR at ' + p.a + '%, in k€?'; },
    answer: function (p) { var a = p.v1 * p.s1 * 10, b = p.v2 * p.s2 * 10; return C.z[p.a] * Math.sqrt(a * a + b * b + 2 * p.rho * a * b); },
    distractors: function (p) {
      var a = p.v1 * p.s1 * 10, b = p.v2 * p.s2 * 10, z = C.z[p.a];
      return [z * (a + b), z * Math.sqrt(a * a + b * b), z * Math.sqrt(a * a + b * b + p.rho * a * b), z * Math.sqrt(a * a + b * b - 2 * p.rho * a * b)];
    },
    steps: function (p) {
      var a = p.v1 * p.s1 * 10, b = p.v2 * p.s2 * 10, v = a * a + b * b + 2 * p.rho * a * b;
      return ['Stand-alone, in money: ' + M('\\sigma_1 = ' + n(a)) + ' k€ and ' + M('\\sigma_2 = ' + n(b)) + ' k€.',
        M('\\sigma_P^2 = ' + n(a) + '^2 + ' + n(b) + '^2 + 2' + X + paren(p.rho) + X + n(a) + X + n(b) + ' = ' + n(v)) + ', so ' + M('\\sigma_P = ' + n(Math.sqrt(v), 2)) + ' k€.',
        M('\\text{VaR} = z\\, \\sigma_P = ' + C.z[p.a].toFixed(4) + X + n(Math.sqrt(v), 2) + ' = ' + n(C.z[p.a] * Math.sqrt(v), 2)) + ' k€.'];
    },
    formula: 'VaR = z · √(σ₁² + σ₂² + 2ρσ₁σ₂) (σ in money)',
    why: 'Below perfect correlation the portfolio VaR is less than the sum of the two VaRs: that gap is the diversification benefit.'
  });
  T({
    id: 'fin.backtest.expected', family: 'fin', category: 'Risk', difficulty: 1, dp: 2,
    params: function (rng) { return { a: pick(rng, [95, 97.5, 99]), N: pick(rng, [250, 500, 1000]) }; },
    prompt: function (p) { return 'A ' + p.a + '% 1-day VaR is backtested over ' + p.N + ' days. Expected number of exceptions?'; },
    answer: function (p) { return (100 - p.a) * p.N / 100; },
    distractors: function (p) { return [p.a * p.N / 100, 2 * (100 - p.a) * p.N / 100, (100 - p.a) * p.N / 1000, (100 - p.a) * 250 / 100 + (p.N === 250 ? 5 : 0)]; },
    steps: function (p) {
      return ['Each day breaches with probability ' + S('1 - \\alpha = ' + n(1 - p.a / 100)),
        'Expected: ' + S('(1 - \\alpha)\\, N = ' + n(1 - p.a / 100) + X + p.N + ' = ' + n((100 - p.a) * p.N / 100))];
    },
    formula: 'E[exceptions] = (1 − α) · N',
    why: 'Basel\'s traffic light uses 250 days at 99%: 2.5 expected, up to 4 is green, 10 or more is red.'
  });

  // ---- Liquidity ----

  T({
    id: 'fin.spread.cost', family: 'fin', category: 'Liquidity', difficulty: 2, unit: 'k€', dp: 2, positive: true,
    params: function (rng) { return { m: pick(rng, [50, 100]), s: pick(rng, [0.02, 0.04, 0.05, 0.1, 0.2, 0.5]), V: pick(rng, [1, 5, 10]) }; },
    prompt: function (p) { return 'Bid ' + n(p.m - p.s / 2) + ', ask ' + n(p.m + p.s / 2) + '. Cost, against the mid, of selling ' + p.V + ' M€ at the bid, in k€?'; },
    answer: function (p) { return p.s / p.m / 2 * p.V * 1000; },
    distractors: function (p) { return [p.s / p.m * p.V * 1000, p.s / 2 * p.V * 10, p.s / p.m / 2 * p.V * 100, p.s / p.m / 4 * p.V * 1000]; },
    steps: function (p) {
      var rel = p.s / p.m;
      return [M('\\text{ask} - \\text{bid} = ' + n(p.s)) + ', mid ' + p.m + ', relative spread ' + S(fr(n(p.s), p.m) + ' = ' + n(rel * 100) + '\\%'),
        'Selling at the bid costs half the spread: ' + M('\\tfrac{1}{2}' + X + n(rel * 100) + '\\%' + X + p.V) + ' M€ = ' + n(rel / 2 * p.V * 1000) + ' k€.'];
    },
    formula: 'cost = ½ · (ask − bid) / mid · V',
    why: 'The mid is the fair price; one trade crosses half the spread, a round trip the full spread.'
  });
  T({
    id: 'fin.sqrt.impact', family: 'fin', category: 'Liquidity', difficulty: 2, unit: '%', dp: 2, positive: true,
    params: function (rng) { return { s: pick(rng, [1, 1.5, 2, 3]), q: pick(rng, [1, 4, 9, 16, 25, 36]) }; },
    prompt: function (p) { return 'Daily volatility ' + pt(p.s) + '. You trade ' + p.q + '% of the daily volume. Price impact by the square-root law (' + M('Y = 1') + ')?'; },
    answer: function (p) { return p.s * Math.sqrt(p.q / 100); },
    distractors: function (p) { return [p.s * p.q / 100, p.s / Math.sqrt(p.q / 100), p.s * Math.sqrt(p.q), p.s * Math.sqrt(p.q / 100) / 2]; },
    steps: function (p) {
      return [S('\\text{impact} = Y\\, \\sigma ' + sq(fr('Q', 'V')) + ' = 1' + X + n(p.s) + '\\%' + X + sq(n(p.q / 100))),
        M(sq(n(p.q / 100)) + ' = ' + n(Math.sqrt(p.q / 100))) + ', so the impact is ' + S(n(p.s * Math.sqrt(p.q / 100)) + '\\%')];
    },
    formula: 'impact = Y · σ · √(Q / V)',
    why: 'Impact grows with the square root of size: 4 times the order costs only twice as much per share.'
  });
  T({
    id: 'fin.lvar', family: 'fin', category: 'Liquidity', difficulty: 2, unit: 'k€', dp: 1, positive: true,
    params: function (rng) { return { v: pick(rng, [50, 100, 150, 200]), s: pick(rng, [0.1, 0.2, 0.5, 1]), V: pick(rng, [1, 5, 10]) }; },
    prompt: function (p) { return 'VaR is ' + p.v + ' k€ on a ' + p.V + ' M€ position whose relative bid-ask spread is ' + pt(p.s) + '. Liquidity-adjusted VaR, in k€?'; },
    answer: function (p) { return p.v + 0.5 * p.s / 100 * p.V * 1000; },
    distractors: function (p) { return [p.v + p.s / 100 * p.V * 1000, p.v, p.v + 0.5 * p.s * p.V, p.v * (1 + p.s / 100)]; },
    steps: function (p) {
      var c = 0.5 * p.s / 100 * p.V * 1000;
      return ['Exit cost: ' + M('\\tfrac{1}{2}\\, s\\, V = \\tfrac{1}{2}' + X + n(p.s) + '\\%' + X + p.V) + ' M€ = ' + n(c) + ' k€.',
        M('\\text{LVaR} = ' + p.v + ' + ' + n(c) + ' = ' + n(p.v + c)) + ' k€.'];
    },
    formula: 'LVaR = VaR + ½ · s · V',
    why: 'VaR prices the position at mid; actually getting out costs half the spread on top.'
  });

  // ---- Statistics for finance ----

  var RHOS = [0.2, 0.5, 0.6, 0.8];
  function condPrompt(p, ask) {
    return M('X') + ' and ' + M('Y') + ' are standard normal with correlation ' + M('\\rho = ' + n(p.rho)) + '. You observe ' + M('Y = ' + n(p.y)) + '. ' + M(ask) + '?';
  }
  T({
    id: 'fin.gauss.cond.mean', family: 'fin', category: 'Statistics', difficulty: 2, dp: 2,
    params: function (rng) { var y; do { y = int(rng, -2, 2); } while (!y); return { rho: pick(rng, RHOS), y: y }; },
    prompt: function (p) { return condPrompt(p, '\\text{E}[X \\mid Y]'); },
    answer: function (p) { return p.rho * p.y; },
    distractors: function (p) { return [p.y / p.rho, p.rho * p.rho * p.y, p.y, -p.rho * p.y]; },
    steps: function (p) { return ['For standardised Gaussians, ' + S('\\text{E}[X \\mid Y = y] = \\rho\\, y'), S('= ' + n(p.rho) + X + paren(p.y) + ' = ' + n(p.rho * p.y))]; },
    formula: 'E[X | Y = y] = ρ y (standardised)',
    why: 'Regression to the mean: $X$ is expected to move only $\\rho$ of the way with $Y$.'
  });
  T({
    id: 'fin.gauss.cond.var', family: 'fin', category: 'Statistics', difficulty: 2, dp: 2, positive: true,
    params: function (rng) { var y; do { y = int(rng, -2, 2); } while (!y); return { rho: pick(rng, RHOS), y: y }; },
    prompt: function (p) { return condPrompt(p, '\\text{Var}[X \\mid Y]'); },
    answer: function (p) { return 1 - p.rho * p.rho; },
    distractors: function (p) { return [1 - p.rho, p.rho * p.rho, Math.sqrt(1 - p.rho * p.rho), 1 + p.rho * p.rho]; },
    steps: function (p) { return [M('\\text{Var}[X \\mid Y] = 1 - \\rho^2') + ', whatever the observed ' + S('y'), S('= 1 - ' + n(p.rho) + '^2 = 1 - ' + n(p.rho * p.rho) + ' = ' + n(1 - p.rho * p.rho))]; },
    formula: 'Var[X | Y] = 1 − ρ²',
    why: 'Observing $Y$ removes the share $\\rho^2$ of the variance of $X$ that it explains; the value of $y$ does not matter for a Gaussian.'
  });
  T({
    id: 'fin.kalman.step', family: 'fin', category: 'Statistics', difficulty: 3, dp: 3,
    params: function (rng) { var y; do { y = int(rng, -4, 4); } while (!y); return { P: int(rng, 1, 4), R: pick(rng, [1, 2, 4]), y: y, ask: pick(rng, ['gain', 'mean', 'var']) }; },
    prompt: function (p) {
      return 'Scalar Kalman update. Prior mean 0, prior variance ' + M('P = ' + p.P) + ', observation noise variance ' + M('R = ' + p.R) + ', observation ' + M('y = ' + n(p.y)) + '. ' +
        { gain: 'Kalman gain $K$?', mean: 'Posterior mean $m$?', var: 'Posterior variance $V$?' }[p.ask];
    },
    answer: function (p) { var K = p.P / (p.P + p.R); return p.ask === 'gain' ? K : p.ask === 'mean' ? K * p.y : (1 - K) * p.P; },
    distractors: function (p) {
      var K = p.P / (p.P + p.R), J = p.R / (p.P + p.R);
      if (p.ask === 'gain') return [J, p.P / p.R, p.R / p.P, 1 - J / 2];
      if (p.ask === 'mean') return [J * p.y, p.y, p.y / 2, K];
      return [p.P, K * p.P, p.P + p.R, p.R];
    },
    steps: function (p) {
      var K = p.P / (p.P + p.R);
      var s = [S('K = ' + fr('P', 'P + R') + ' = ' + fr(p.P, p.P + p.R) + ' = ' + n(K, 4))];
      if (p.ask === 'mean') s.push(S('m = K\\, y = ' + n(K, 4) + X + paren(p.y) + ' = ' + n(K * p.y, 4)));
      if (p.ask === 'var') s.push(S('V = (1 - K)\\, P = ' + n(1 - K, 4) + X + p.P + ' = ' + n((1 - K) * p.P, 4)));
      return s;
    },
    formula: 'K = P/(P+R); m = K y; V = (1 − K) P',
    why: 'Noisy data (large $R$) means a small gain: you trust the prior. The posterior variance is always below both $P$ and $R$.'
  });
  T({
    id: 'fin.mahalanobis.indep', family: 'fin', category: 'Statistics', difficulty: 2, dp: 2, positive: true,
    params: function (rng) {
      var k = int(rng, 2, 3), s = [], h = [];
      for (var i = 0; i < k; i++) { s.push(pick(rng, [1, 2, 4])); var x; do { x = int(rng, -6, 6); } while (!x); h.push(x); }
      return { s: s, x: s.map(function (si, i) { return si * h[i] / 2; }) };
    },
    prompt: function (p) {
      return 'Independent factors with volatilities ' + p.s.join(', ') + ' move by ' + p.x.map(function (x) { return n(x); }).join(', ') + '. Squared Mahalanobis distance of the move?';
    },
    answer: function (p) { var d = 0; p.x.forEach(function (x, i) { d += (x / p.s[i]) * (x / p.s[i]); }); return d; },
    distractors: function (p) {
      var d = 0, raw = 0, half = 0;
      p.x.forEach(function (x, i) { d += Math.pow(x / p.s[i], 2); raw += x * x; half += x * x / p.s[i]; });
      return [Math.sqrt(d), raw, half, d / p.x.length];
    },
    steps: function (p) {
      var parts = p.x.map(function (x, i) { return '\\left(' + fr(n(x), p.s[i]) + '\\right)^2'; });
      var vals = p.x.map(function (x, i) { return n(Math.pow(x / p.s[i], 2)); });
      var d = 0; p.x.forEach(function (x, i) { d += Math.pow(x / p.s[i], 2); });
      return ['With independent factors, ' + M('\\Sigma') + ' is diagonal: ' + S('D^2 = \\sum_i \\left(' + fr('x_i', '\\sigma_i') + '\\right)^2'),
        S('= ' + parts.join(' + ') + ' = ' + vals.join(' + ') + ' = ' + n(d))];
    },
    formula: 'D² = Σ (x_i / σ_i)² (independent factors)',
    why: 'Each move is measured in its own standard deviations; with correlation the off-diagonal terms of $\\Sigma^{-1}$ come in.'
  });
  T({
    id: 'fin.rst.linear', family: 'fin', category: 'Statistics', difficulty: 3, dp: 2, positive: true,
    params: function (rng) { return { rho: pick(rng, [0, 0.5, 0.8]), w: pick(rng, [1, -1]), l: int(rng, 1, 4) }; },
    prompt: function (p) {
      return 'Two standard normal factors with correlation ' + M('\\rho = ' + n(p.rho)) + '. The P&L is ' + M(p.w > 0 ? 'x_1 + x_2' : 'x_1 - x_2') +
        '. Reverse stress test: Mahalanobis distance ' + M('d^*') + ' of the most likely scenario losing ' + p.l + '?';
    },
    answer: function (p) { return p.l / Math.sqrt(2 * (1 + p.rho * p.w)); },
    distractors: function (p) { var q = 2 * (1 + p.rho * p.w); return [p.l / q, p.l / Math.sqrt(2), p.l * Math.sqrt(q), p.l / Math.sqrt(2 * (1 - p.rho * p.w))]; },
    steps: function (p) {
      var q = 2 * (1 + p.rho * p.w), op = p.w > 0 ? '+' : '-';
      return [S('w^\\top \\Sigma w = 1 + 1 ' + op + ' 2\\rho = 2' + X + '(1 ' + op + ' ' + n(p.rho) + ') = ' + n(q)),
        S('d^* = ' + fr('\\ell', sq('w^\\top \\Sigma w')) + ' = ' + fr(p.l, sq(n(q))) + ' = ' + fr(p.l, n(Math.sqrt(q), 4)) + ' = ' + n(p.l / Math.sqrt(q), 4))];
    },
    formula: 'x* = −ℓ Σw / (wᵀΣw), d* = ℓ / √(wᵀΣw)',
    why: 'The most likely loss scenario moves along $\\Sigma w$; a hedged book ($x_1 - x_2$) with high correlation has a small $w^\\top \\Sigma w$, so a given loss needs a big, unlikely move — until the correlation breaks.'
  });

  // ======================= Formulas as maths =======================
  // The formula line in the same LaTeX subset. `formula` above stays the plain-text twin, used in the report,
  // the sample printer and the "5 weakest" list.
  var TEX = {
    'quant.pct.of': 'x\\% \\text{ of } y = y \\times \\frac{x}{100}',
    'quant.pct.change': '\\%\\,\\text{change} = \\frac{\\text{new} - \\text{old}}{\\text{old}} \\times 100',
    'quant.frac.dec': '\\frac{n}{d} = n \\times \\frac{1}{d}',
    'quant.dec.frac': '\\text{decimal} = n \\times \\frac{1}{d}',
    'quant.square': '(a + b)^2 = a^2 + 2ab + b^2',
    'quant.square.big': '(100 + k)^2 = 10000 + 200k + k^2',
    'quant.sqrt.approx': '\\sqrt{k^2 + d} \\approx k + \\frac{d}{2k}',
    'quant.pow2': '2^{10 + k} = 1024 \\times 2^k',
    'quant.mul.trick': '25 = \\frac{100}{4},\\; 125 = \\frac{1000}{8},\\; 99 = 100 - 1,\\; 11 = 10 + 1',
    'quant.est.prod': 'a \\times b = a \\times \\text{round}(b) + a \\times (b - \\text{round}(b))',
    'quant.rule72': 'T_{\\text{double}} \\approx \\frac{72}{r \\text{ in } \\%}',
    'quant.compound': '(1 + r)^k = \\sum_{j=0}^{k} C(k, j)\\, r^j',
    'quant.ln.approx': '\\ln(1 + u) \\approx u - \\frac{u^2}{2}',
    'quant.exp.approx': 'e^{-x} \\approx 1 - x + \\frac{x^2}{2}',
    'quant.ev': '\\text{E}[X] = \\sum_i p_i\\, x_i',
    'fin.bp.convert': '\\text{bp} = (b - a)_{\\%} \\times 100',
    'fin.pv.annual': '\\text{PV} = \\frac{C}{(1 + r)^t}',
    'fin.pv.cont': '\\text{PV} = C\\, e^{-rt}',
    'fin.fv': '\\text{FV} = C\\, (1 + r)^t',
    'fin.real.rate': 'r \\approx i - \\pi',
    'fin.real.rate.exact': '1 + r = \\frac{1 + i}{1 + \\pi}',
    'fin.bond.price.1y': 'P = \\frac{100 + c}{1 + y}',
    'fin.bond.price.2y': 'P = \\frac{c}{1 + y} + \\frac{100 + c}{(1 + y)^2}',
    'fin.bond.premium': 'c > y \\Rightarrow P > 100,\\; c = y \\Rightarrow P = 100,\\; c < y \\Rightarrow P < 100',
    'fin.zc.price': 'P = 100\\, e^{-y\\tau}',
    'fin.duration.approx': 'P_1 \\approx P\\, (1 - D\\, \\Delta y)',
    'fin.convexity': 'P_1 \\approx P \\left(1 - D\\, \\Delta y + \\tfrac{1}{2}\\, C\\, \\Delta y^2\\right)',
    'fin.duration.zc': 'D_{\\text{zero}} = T',
    'fin.credit.spread': 's = (y_{\\text{corp}} - y_{\\text{gov}}) \\times 100\\ \\text{bp}',
    'fin.taylor': 'i = r^* + \\pi + 0.5\\, (\\pi - \\pi^*) + 0.5\\, (y - y^*)',
    'fin.return.multi': '(1 + a)(1 + b) - 1 = a + b + ab',
    'fin.return.log': 'r_{\\log} = \\ln \\frac{S_1}{S_0} \\approx u - \\frac{u^2}{2}',
    'fin.vol.annualize': '\\sigma_{\\text{year}} = \\sigma_{\\text{day}} \\sqrt{252} \\approx 15.87\\, \\sigma_{\\text{day}}',
    'fin.vol.deannualize': '\\sigma_{\\text{day}} = \\frac{\\sigma_{\\text{year}}}{\\sqrt{252}}',
    'fin.vol.horizon': '\\sigma_h = \\sigma_{\\text{day}} \\sqrt{h}',
    'fin.sharpe': '\\text{Sharpe} = \\frac{\\mu - r_f}{\\sigma}',
    'fin.nii': '\\text{NII} = A\\, r_A - L\\, r_L',
    'fin.nii.shock': '\\Delta\\text{NII} = -L\\, \\Delta r_L',
    'fin.eve.gap': '\\Delta\\text{EVE} \\approx -(D_A A - D_L L)\\, \\Delta y',
    'fin.eve.outlier': '\\text{outlier} \\iff |\\Delta\\text{EVE}| > 15\\% \\times \\text{Tier 1}',
    'fin.var.gauss': '\\text{VaR}_\\alpha = z_\\alpha\\, \\sigma\\, V',
    'fin.var.horizon': '\\text{VaR}_h = \\text{VaR}_1 \\sqrt{h}',
    'fin.es.gauss': '\\text{ES}_\\alpha = \\sigma\\, V\\, \\frac{\\varphi(z_\\alpha)}{1 - \\alpha}',
    'fin.var.port2': '\\text{VaR} = z \\sqrt{\\sigma_1^2 + \\sigma_2^2 + 2\\rho\\, \\sigma_1 \\sigma_2}',
    'fin.backtest.expected': '\\text{E}[\\text{exceptions}] = (1 - \\alpha)\\, N',
    'fin.spread.cost': '\\text{cost} = \\frac{1}{2}\\, \\frac{\\text{ask} - \\text{bid}}{\\text{mid}}\\, V',
    'fin.sqrt.impact': '\\text{impact} = Y\\, \\sigma \\sqrt{\\frac{Q}{V}}',
    'fin.lvar': '\\text{LVaR} = \\text{VaR} + \\tfrac{1}{2}\\, s\\, V',
    'fin.gauss.cond.mean': '\\text{E}[X \\mid Y = y] = \\rho\\, y',
    'fin.gauss.cond.var': '\\text{Var}[X \\mid Y] = 1 - \\rho^2',
    'fin.kalman.step': 'K = \\frac{P}{P + R},\\; m = K y,\\; V = (1 - K)\\, P',
    'fin.mahalanobis.indep': 'D^2 = \\sum_i \\left(\\frac{x_i}{\\sigma_i}\\right)^2',
    'fin.rst.linear': 'x^* = -\\ell\\, \\frac{\\Sigma w}{w^\\top \\Sigma w},\\; d^* = \\frac{\\ell}{\\sqrt{w^\\top \\Sigma w}}'
  };
  Object.keys(TEX).forEach(function (id) { F.get(id).tex = TEX[id]; });

  if (typeof module !== 'undefined') module.exports = F;
})();
