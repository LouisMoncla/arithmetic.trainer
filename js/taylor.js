/*
 * taylor.js — the Taylor expansions lesson (Learn › Taylor expansions): the library of expansions with exact rational
 * coefficients, their rendering (TeX for the screen, plain text for what is saved), 6-choice questions with wrong
 * choices built from the coefficients, estimation questions, adaptive picking and mastery. Pure logic, no DOM.
 *
 * An expansion: { key, tier, name: { fr, en } (TeX) + text: { fr, en }, v (variable), point? (a ≠ 0), prefix?, head?,
 * terms: [{ k, c: [num, den], s? }], max (highest stored power), method, generic?, fn? (estimation) }.
 * A term is c × SYM[s] × v^k. tests/taylor.test.js checks every expansion numerically against independent functions.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};

  // ---------- exact rationals ----------

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function Q(n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return [n / g, d / g]; }
  function qval(c) { return c[0] / c[1]; }
  function qneg(c) { return [-c[0], c[1]]; }
  function qmul(a, b) { return Q(a[0] * b[0], a[1] * b[1]); }
  function qeq(a, b) { return a[0] * b[1] === b[0] * a[1]; }
  var FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];

  var SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function sup(k) { return String(k).split('').map(function (d) { return SUP.charAt(+d); }).join(''); }

  // Symbolic factors: num/den TeX, plain text, value given the parameters p (α, a, n, D, C).
  var SYM = {
    pi: { num: '\\pi', tn: 'π', val: function () { return Math.PI; } },
    sqrt3: { num: '\\sqrt{3}', tn: '√3', val: function () { return Math.sqrt(3); } },
    ln2: { num: '\\ln\\, 2', tn: 'ln 2', val: function () { return Math.LN2; } },
    lna: { num: '\\ln\\, a', tn: ' ln a', varFirst: true, val: function (p) { return Math.log(p.a); } },
    lna2: { num: '(\\ln\\, a)^{2}', tn: '(ln a)²', varFirst: true, val: function (p) { return Math.pow(Math.log(p.a), 2); } },
    lna3: { num: '(\\ln\\, a)^{3}', tn: '(ln a)³', varFirst: true, val: function (p) { return Math.pow(Math.log(p.a), 3); } },
    a1: { num: '\\alpha', tn: 'α', val: function (p) { return p.alpha; } },
    a2: { num: '\\alpha(\\alpha-1)', tn: 'α(α − 1)', val: function (p) { return p.alpha * (p.alpha - 1); } },
    a3: { num: '\\alpha(\\alpha-1)(\\alpha-2)', tn: 'α(α − 1)(α − 2)', val: function (p) { return p.alpha * (p.alpha - 1) * (p.alpha - 2); } },
    n1: { num: 'n', tn: 'n', val: function (p) { return p.n; } },
    nn1: { num: 'n(n-1)', tn: 'n(n − 1)', val: function (p) { return p.n * (p.n - 1); } },
    nnp1: { num: 'n(n+1)', tn: 'n(n + 1)', val: function (p) { return p.n * (p.n + 1); } },
    invn: { num: '', den: 'n', tn: '', td: 'n', val: function (p) { return 1 / p.n; } },
    root2: { num: '(1-n)', den: 'n^{2}', tn: '(1 − n)', td: 'n²', val: function (p) { return (1 - p.n) / (p.n * p.n); } },
    D: { num: 'D', tn: 'D', val: function (p) { return p.D; } },
    C: { num: 'C', tn: 'C', val: function (p) { return p.C; } },
    isq2pi: { num: '', den: '\\sqrt{2\\pi}', tn: '', td: '√(2π)', val: function () { return 1 / Math.sqrt(2 * Math.PI); } }
  };
  function symVal(s, p) { return s ? SYM[s].val(p || {}) : 1; }

  // Variables. inv: the expansion is in powers of 1/v (as n → +∞).
  var VARS = {
    x: { tex: 'x', text: 'x' },
    r: { tex: 'r', text: 'r' },
    sigma: { tex: '\\sigma', text: 'σ' },
    dy: { tex: '\\Delta y', text: 'Δy', paren: true },
    svt: { tex: 'S\\sigma\\sqrt{T}', text: 'Sσ√T', paren: true },
    n: { tex: 'n', text: 'n', inv: true }
  };
  // h = x − a, shown as (x − a).
  function hVar(point) {
    return { tex: '\\left(x-' + point.tex + '\\right)', text: '(x − ' + point.text + ')', group: true };
  }

  function T(k, n, d, s) { return { k: k, c: Q(n, d), s: s || null }; }
  function op(fr, en) {
    en = en || fr;
    return { name: { fr: '\\operatorname{' + fr + '}\\, x', en: '\\operatorname{' + en + '}\\, x' }, text: { fr: fr + ' x', en: en + ' x' } };
  }
  function nm(tex, text) { return { name: { fr: tex, en: tex }, text: { fr: text, en: text } }; }
  function it(key, tier, names, o) {
    var e = { key: key, tier: tier, name: names.name, text: names.text, v: o.v || 'x', point: o.point || null, prefix: o.prefix || null,
      head: o.head || null, approx: !!o.approx, remInside: !!o.remInside, terms: o.terms, method: o.method, generic: o.generic || null,
      fn: o.fn || null, where: o.where || null, what: o.what || null, params: o.params || null, noReverse: !!o.noReverse };
    e.max = o.max !== undefined ? o.max : Math.max.apply(null, o.terms.map(function (t) { return t.k; }));
    return e;
  }
  var P1 = { a: 1, tex: '1', text: '1' }, P2 = { a: 2, tex: '2', text: '2' }, P4 = { a: 4, tex: '4', text: '4' };
  var PI6 = { a: Math.PI / 6, tex: '\\frac{\\pi}{6}', text: 'π/6' }, PI3 = { a: Math.PI / 3, tex: '\\frac{\\pi}{3}', text: 'π/3' }, PI4 = { a: Math.PI / 4, tex: '\\frac{\\pi}{4}', text: 'π/4' };
  var PREFIX = {
    e: { tex: 'e', text: 'e', val: function () { return Math.E; } },
    stir: { tex: '\\sqrt{2\\pi n}\\left(\\frac{n}{e}\\right)^{n}', text: '√(2πn)(n/e)ⁿ', val: function (p) { return Math.sqrt(2 * Math.PI * p.n) * Math.pow(p.n / Math.E, p.n); } }
  };

  // ---------- the library ----------

  var LIB = [
    // Tier 1: the usual expansions at 0.
    it('exp', 1, nm('e^{x}', 'eˣ'), { terms: [T(0, 1), T(1, 1), T(2, 1, 2), T(3, 1, 6), T(4, 1, 24), T(5, 1, 120)], fn: Math.exp,
      generic: { tex: '\\sum_{k=0}^{n} \\frac{x^{k}}{k!}', text: 'Σ xᵏ/k!' }, method: 'Every coefficient is 1/k!, all positive.' }),
    it('ln1p', 1, nm('\\ln(1+x)', 'ln(1 + x)'), { terms: [T(1, 1), T(2, -1, 2), T(3, 1, 3), T(4, -1, 4), T(5, 1, 5)], fn: function (x) { return Math.log(1 + x); },
      generic: { tex: '\\sum_{k=1}^{n} \\frac{(-1)^{k+1}x^{k}}{k}', text: 'Σ (−1)ᵏ⁺¹ xᵏ/k' }, method: 'Integrate 1/(1 + t) = 1 − t + t² − … from 0 to x: 1/k, alternating.' }),
    it('ln1m', 1, nm('\\ln(1-x)', 'ln(1 − x)'), { terms: [T(1, -1), T(2, -1, 2), T(3, -1, 3), T(4, -1, 4), T(5, -1, 5)], fn: function (x) { return Math.log(1 - x); },
      generic: { tex: '-\\sum_{k=1}^{n} \\frac{x^{k}}{k}', text: '−Σ xᵏ/k' }, method: 'Replace x by −x in ln(1 + x): every sign becomes minus.' }),
    it('inv1m', 1, nm('\\frac{1}{1-x}', '1/(1 − x)'), { terms: [T(0, 1), T(1, 1), T(2, 1), T(3, 1), T(4, 1), T(5, 1)], fn: function (x) { return 1 / (1 - x); },
      generic: { tex: '\\sum_{k=0}^{n} x^{k}', text: 'Σ xᵏ' }, method: 'The geometric series.' }),
    it('inv1p', 1, nm('\\frac{1}{1+x}', '1/(1 + x)'), { terms: [T(0, 1), T(1, -1), T(2, 1), T(3, -1), T(4, 1), T(5, -1)], fn: function (x) { return 1 / (1 + x); },
      generic: { tex: '\\sum_{k=0}^{n} (-1)^{k}x^{k}', text: 'Σ (−1)ᵏ xᵏ' }, method: 'The geometric series in −x: signs alternate.' }),
    it('powa', 1, nm('(1+x)^{\\alpha}', '(1 + x)^α'), { terms: [T(0, 1), T(1, 1, 1, 'a1'), T(2, 1, 2, 'a2'), T(3, 1, 6, 'a3')], params: { alpha: 0.5 },
      method: 'Generalised binomial: the coefficient of xᵏ is α(α − 1)…(α − k + 1)/k!.' }),
    it('sqrt1p', 1, nm('\\sqrt{1+x}', '√(1 + x)'), { terms: [T(0, 1), T(1, 1, 2), T(2, -1, 8), T(3, 1, 16), T(4, -5, 128)], fn: function (x) { return Math.sqrt(1 + x); },
      method: '(1 + x)^α with α = 1/2: 1/2, then (1/2)(−1/2)/2 = −1/8, then 1/16.' }),
    it('isqrt1p', 1, nm('\\frac{1}{\\sqrt{1+x}}', '1/√(1 + x)'), { terms: [T(0, 1), T(1, -1, 2), T(2, 3, 8), T(3, -5, 16)], fn: function (x) { return 1 / Math.sqrt(1 + x); },
      method: '(1 + x)^α with α = −1/2: −1/2, then (−1/2)(−3/2)/2 = 3/8.' }),
    it('inv1p2', 1, nm('\\frac{1}{(1+x)^{2}}', '1/(1 + x)²'), { terms: [T(0, 1), T(1, -2), T(2, 3), T(3, -4)], fn: function (x) { return 1 / ((1 + x) * (1 + x)); },
      method: 'Minus the derivative of 1/(1 + x): coefficients ±(k + 1).' }),
    it('sin', 1, op('sin'), { terms: [T(1, 1), T(3, -1, 6), T(5, 1, 120), T(7, -1, 5040)], fn: Math.sin,
      generic: { tex: '\\sum_{k} \\frac{(-1)^{k}x^{2k+1}}{(2k+1)!}', text: 'Σ (−1)ᵏ x²ᵏ⁺¹/(2k + 1)!' }, method: 'Odd: odd powers, alternating signs, 1/k!.' }),
    it('cos', 1, op('cos'), { terms: [T(0, 1), T(2, -1, 2), T(4, 1, 24), T(6, -1, 720)], fn: Math.cos,
      generic: { tex: '\\sum_{k} \\frac{(-1)^{k}x^{2k}}{(2k)!}', text: 'Σ (−1)ᵏ x²ᵏ/(2k)!' }, method: 'Even: even powers, alternating signs, 1/k!.' }),
    it('tan', 1, op('tan'), { terms: [T(1, 1), T(3, 1, 3), T(5, 2, 15), T(7, 17, 315)], fn: Math.tan,
      method: 'tan = sin/cos, or integrate 1 + tan²: x + x³/3 + 2x⁵/15 + 17x⁷/315.' }),
    it('sh', 1, op('sh', 'sinh'), { terms: [T(1, 1), T(3, 1, 6), T(5, 1, 120), T(7, 1, 5040)], fn: Math.sinh,
      generic: { tex: '\\sum_{k} \\frac{x^{2k+1}}{(2k+1)!}', text: 'Σ x²ᵏ⁺¹/(2k + 1)!' }, method: 'The odd part of eˣ: odd powers, all positive, 1/k!.' }),
    it('ch', 1, op('ch', 'cosh'), { terms: [T(0, 1), T(2, 1, 2), T(4, 1, 24), T(6, 1, 720)], fn: Math.cosh,
      generic: { tex: '\\sum_{k} \\frac{x^{2k}}{(2k)!}', text: 'Σ x²ᵏ/(2k)!' }, method: 'The even part of eˣ: even powers, all positive, 1/k!.' }),
    it('th', 1, op('th', 'tanh'), { terms: [T(1, 1), T(3, -1, 3), T(5, 2, 15), T(7, -17, 315)], fn: Math.tanh,
      method: 'Like tan with alternating signs: th x = −i tan(ix).' }),
    it('arctan', 1, op('arctan'), { terms: [T(1, 1), T(3, -1, 3), T(5, 1, 5), T(7, -1, 7)], fn: Math.atan,
      generic: { tex: '\\sum_{k} \\frac{(-1)^{k}x^{2k+1}}{2k+1}', text: 'Σ (−1)ᵏ x²ᵏ⁺¹/(2k + 1)' }, method: 'Integrate 1/(1 + t²) = 1 − t² + t⁴ − …: odd powers, 1/k (not 1/k!), alternating.' }),
    it('arcsin', 1, op('arcsin'), { terms: [T(1, 1), T(3, 1, 6), T(5, 3, 40)], fn: Math.asin,
      method: 'Integrate 1/√(1 − t²) = 1 + t²/2 + 3t⁴/8: x + x³/6 + 3x⁵/40.' }),
    it('arccos', 1, op('arccos'), { terms: [T(0, 1, 2, 'pi'), T(1, -1), T(3, -1, 6), T(5, -3, 40)], fn: Math.acos,
      method: 'arccos x = π/2 − arcsin x.' }),
    it('argth', 1, op('argth', 'artanh'), { terms: [T(1, 1), T(3, 1, 3), T(5, 1, 5), T(7, 1, 7)], fn: function (x) { return 0.5 * Math.log((1 + x) / (1 - x)); },
      generic: { tex: '\\sum_{k} \\frac{x^{2k+1}}{2k+1}', text: 'Σ x²ᵏ⁺¹/(2k + 1)' }, method: 'Integrate 1/(1 − t²): odd powers, all positive, 1/k.' }),
    it('argsh', 1, op('argsh', 'arsinh'), { terms: [T(1, 1), T(3, -1, 6), T(5, 3, 40)], fn: function (x) { return Math.log(x + Math.sqrt(x * x + 1)); },
      method: 'Integrate 1/√(1 + t²) = 1 − t²/2 + 3t⁴/8: x − x³/6 + 3x⁵/40.' }),
    it('inv1px2', 1, nm('\\frac{1}{1+x^{2}}', '1/(1 + x²)'), { terms: [T(0, 1), T(2, -1), T(4, 1), T(6, -1)], fn: function (x) { return 1 / (1 + x * x); },
      generic: { tex: '\\sum_{k} (-1)^{k}x^{2k}', text: 'Σ (−1)ᵏ x²ᵏ' }, method: 'The geometric series in −x².' }),
    it('isqrt1mx2', 1, nm('\\frac{1}{\\sqrt{1-x^{2}}}', '1/√(1 − x²)'), { terms: [T(0, 1), T(2, 1, 2), T(4, 3, 8)], fn: function (x) { return 1 / Math.sqrt(1 - x * x); },
      method: '(1 + u)^(−1/2) with u = −x²: 1 + x²/2 + 3x⁴/8.' }),
    it('apow', 1, nm('a^{x}', 'aˣ'), { terms: [T(0, 1), T(1, 1, 1, 'lna'), T(2, 1, 2, 'lna2'), T(3, 1, 6, 'lna3')], params: { a: 3 },
      method: 'aˣ = e^(x ln a): the expansion of e^u with u = x ln a.' }),
    it('lnratio', 1, nm('\\ln\\frac{1+x}{1-x}', 'ln((1 + x)/(1 − x))'), { terms: [T(1, 2), T(3, 2, 3), T(5, 2, 5)], fn: function (x) { return Math.log((1 + x) / (1 - x)); },
      method: 'ln(1 + x) − ln(1 − x): even powers cancel, odd ones double. It is 2 argth x.' }),

    // Tier 2: composed functions and products, at 0.
    it('esin', 2, nm('e^{\\operatorname{sin}\, x}', 'e^(sin x)'), { terms: [T(0, 1), T(1, 1), T(2, 1, 2), T(4, -1, 8)], max: 4, method: 'e^u with u = sin x → 0, keeping powers up to 4: the x³ terms cancel.' }),
    it('ecos', 2, nm('e^{\\operatorname{cos}\, x}', 'e^(cos x)'), { prefix: 'e', terms: [T(0, 1), T(2, -1, 2), T(4, 1, 6)], max: 4, method: 'e^(cos x) = e · e^u with u = cos x − 1 = −x²/2 + x⁴/24.' }),
    it('lncos', 2, nm('\\ln(\\operatorname{cos}\, x)', 'ln(cos x)'), { terms: [T(2, -1, 2), T(4, -1, 12)], max: 4, method: 'ln(1 + u) with u = cos x − 1: −x²/2 + x⁴/24 − x⁴/8.' }),
    it('sec', 2, nm('\\frac{1}{\\operatorname{cos}\, x}', '1/cos x'), { terms: [T(0, 1), T(2, 1, 2), T(4, 5, 24)], max: 4, method: '1/(1 + u) = 1 − u + u² with u = cos x − 1.' }),
    it('expsin', 2, nm('e^{x}\\operatorname{sin}\, x', 'eˣ sin x'), { terms: [T(1, 1), T(2, 1), T(3, 1, 3)], max: 4, method: 'Multiply the two expansions and keep powers up to 4: the x⁴ terms cancel.' }),
    it('expcos', 2, nm('e^{x}\\operatorname{cos}\, x', 'eˣ cos x'), { terms: [T(0, 1), T(1, 1), T(3, -1, 3), T(4, -1, 6)], max: 4, method: 'Multiply the two expansions and keep powers up to 4: the x² terms cancel.' }),
    it('bernoulli', 2, nm('\\frac{x}{e^{x}-1}', 'x/(eˣ − 1)'), { terms: [T(0, 1), T(1, -1, 2), T(2, 1, 12), T(4, -1, 720)], max: 4, method: '1/(1 + u) with u = (eˣ − 1)/x − 1 = x/2 + x²/6 + …: the Bernoulli numbers.' }),
    it('ln1psin', 2, nm('\\ln(1+\\operatorname{sin}\, x)', 'ln(1 + sin x)'), { terms: [T(1, 1), T(2, -1, 2), T(3, 1, 6), T(4, -1, 12)], max: 4, method: 'ln(1 + u) = u − u²/2 + u³/3 − u⁴/4 with u = sin x = x − x³/6.' }),
    it('sinc', 2, nm('\\frac{\\operatorname{sin}\, x}{x}', 'sin x / x'), { terms: [T(0, 1), T(2, -1, 6), T(4, 1, 120)], max: 4, method: 'Divide the expansion of sin x by x: the order drops by one.' }),
    it('sin2', 2, nm('\\operatorname{sin}^{2} x', 'sin² x'), { terms: [T(2, 1), T(4, -1, 3)], max: 4, method: 'sin² x = (1 − cos 2x)/2.' }),
    it('sqrtdiff', 2, nm('\\sqrt{1+x}-\\sqrt{1-x}', '√(1 + x) − √(1 − x)'), { terms: [T(1, 1), T(3, 1, 8)], max: 3, method: 'Subtract the two expansions: even powers cancel, odd ones double.' }),
    it('powinvx', 2, nm('(1+x)^{\\frac{1}{x}}', '(1 + x)^(1/x)'), { prefix: 'e', terms: [T(0, 1), T(1, -1, 2), T(2, 11, 24)], max: 2, method: 'exp(ln(1 + x)/x) = e · e^u with u = −x/2 + x²/3.' }),
    it('fib', 2, nm('\\frac{1}{1-x-x^{2}}', '1/(1 − x − x²)'), { terms: [T(0, 1), T(1, 1), T(2, 2), T(3, 3), T(4, 5)], max: 4, method: 'The coefficients are Fibonacci numbers: each is the sum of the two before.' }),
    it('expx2', 2, nm('e^{x^{2}}', 'e^(x²)'), { terms: [T(0, 1), T(2, 1), T(4, 1, 2)], max: 4, method: 'Put x² in the expansion of e^u.' }),

    // Tier 3: at a point a ≠ 0, in powers of h = x − a.
    it('ln_at1', 3, nm('\\ln x', 'ln x'), { point: P1, terms: [T(1, 1), T(2, -1, 2), T(3, 1, 3)], method: 'ln x = ln(1 + h) with h = x − 1.' }),
    it('ln1p_at1', 3, nm('\\ln(1+x)', 'ln(1 + x)'), { point: P1, terms: [T(0, 1, 1, 'ln2'), T(1, 1, 2), T(2, -1, 8)], method: 'ln(2 + h) = ln 2 + ln(1 + h/2).' }),
    it('sqrt_at4', 3, nm('\\sqrt{x}', '√x'), { point: P4, terms: [T(0, 2), T(1, 1, 4), T(2, -1, 64), T(3, 1, 512)], method: '√(4 + h) = 2√(1 + h/4).' }),
    it('exp_at1', 3, nm('e^{x}', 'eˣ'), { point: P1, prefix: 'e', terms: [T(0, 1), T(1, 1), T(2, 1, 2)], method: 'eˣ = e · e^h.' }),
    it('inv_at2', 3, nm('\\frac{1}{x}', '1/x'), { point: P2, terms: [T(0, 1, 2), T(1, -1, 4), T(2, 1, 8)], method: '1/(2 + h) = (1/2) · 1/(1 + h/2).' }),
    it('sin_atpi6', 3, op('sin'), { point: PI6, terms: [T(0, 1, 2), T(1, 1, 2, 'sqrt3'), T(2, -1, 4), T(3, -1, 12, 'sqrt3')], method: 'sin(a + h) = sin a cos h + cos a sin h, with sin a = 1/2, cos a = √3/2.' }),
    it('cos_atpi3', 3, op('cos'), { point: PI3, terms: [T(0, 1, 2), T(1, -1, 2, 'sqrt3'), T(2, -1, 4), T(3, 1, 12, 'sqrt3')], method: 'cos(a + h) = cos a cos h − sin a sin h, with cos a = 1/2, sin a = √3/2.' }),
    it('tan_atpi4', 3, op('tan'), { point: PI4, terms: [T(0, 1), T(1, 2), T(2, 2), T(3, 8, 3)], method: "Taylor's formula: tan' = 1 + tan² = 2, tan'' = 2 tan(1 + tan²) = 4, tan''' = 16." }),
    it('arctan_at1', 3, op('arctan'), { point: P1, terms: [T(0, 1, 4, 'pi'), T(1, 1, 2), T(2, -1, 4), T(3, 1, 12)], method: "Taylor's formula with arctan' = 1/(1 + x²) = 1/2 at 1, then its derivatives." }),

    // Tier 4: asymptotics and quant.
    it('eulerlim', 4, nm('\\left(1+\\frac{1}{n}\\right)^{n}', '(1 + 1/n)ⁿ'), { v: 'n', prefix: 'e', terms: [T(0, 1), T(1, -1, 2), T(2, 11, 24)], where: 'as $n \\to \\infty$',
      method: 'exp(n ln(1 + 1/n)) = e · e^u with u = −1/(2n) + 1/(3n²).' }),
    it('stirling', 4, nm('n!', 'n!'), { v: 'n', prefix: 'stir', remInside: true, terms: [T(0, 1), T(1, 1, 12)], where: 'as $n \\to \\infty$',
      method: "Stirling: n! = √(2πn)(n/e)ⁿ(1 + 1/(12n) + …)." }),
    it('harmonic', 4, nm('H_{n}', 'Hₙ'), { v: 'n', head: { tex: '\\ln\\, n + \\gamma', text: 'ln n + γ', val: function (p) { return Math.log(p.n) + 0.5772156649015329; } }, terms: [T(1, 1, 2), T(2, -1, 12)], where: 'as $n \\to \\infty$',
      method: 'Euler–Maclaurin: Hₙ = ln n + γ + 1/(2n) − 1/(12n²) + …' }),
    it('logret', 4, nm('\\ln(1+r)', 'ln(1 + r)'), { v: 'r', terms: [T(1, 1), T(2, -1, 2), T(3, 1, 3)], where: 'as $r \\to 0$ (log return against simple return)',
      method: 'The log return is ln(1 + r): slightly below r.' }),
    it('compound', 4, nm('(1+r)^{n}', '(1 + r)ⁿ'), { v: 'r', terms: [T(0, 1), T(1, 1, 1, 'n1'), T(2, 1, 2, 'nn1')], params: { n: 5 }, where: 'as $r \\to 0$',
      method: 'The binomial expansion of (1 + r)ⁿ.' }),
    it('discount', 4, nm('\\frac{1}{(1+r)^{n}}', '1/(1 + r)ⁿ'), { v: 'r', terms: [T(0, 1), T(1, -1, 1, 'n1'), T(2, 1, 2, 'nnp1')], params: { n: 5 }, where: 'as $r \\to 0$',
      method: '(1 + r)^α with α = −n: −n, then (−n)(−n − 1)/2 = n(n + 1)/2.' }),
    it('doubling', 4, nm('\\frac{\\ln\\, 2}{\\ln(1+r)}', 'ln 2 / ln(1 + r)'), { v: 'r', terms: [T(-1, 1, 1, 'ln2'), T(0, 1, 2, 'ln2')], max: 0, where: 'as $r \\to 0$ (the rule of 69 and 72)',
      method: '1/ln(1 + r) = 1/(r(1 − r/2 + …)) = (1/r)(1 + r/2 + …): 0.693/r + 0.347.' }),
    it('nthroot', 4, nm('(1+x)^{\\frac{1}{n}}', '(1 + x)^(1/n)'), { terms: [T(0, 1), T(1, 1, 1, 'invn'), T(2, 1, 2, 'root2')], params: { n: 3 }, where: 'around 0',
      method: '(1 + x)^α with α = 1/n: α(α − 1)/2 = (1 − n)/(2n²).' }),
    it('lognormal', 4, nm('E\\left[e^{\\sigma Z}\\right]', 'E[e^(σZ)]'), { v: 'sigma', terms: [T(0, 1), T(2, 1, 2), T(4, 1, 8)], where: 'for $Z$ standard normal, as $\\sigma \\to 0$',
      method: 'E[e^(σZ)] = e^(σ²/2), then e^u with u = σ²/2.' }),
    it('geomarith', 4, nm('G', 'G'), { v: 'sigma', approx: true, noReverse: true, head: { tex: 'A', text: 'A', val: function (p) { return p.A; } }, terms: [T(2, -1, 2)],
      what: 'the geometric mean $G$ of returns with arithmetic mean $A$ and volatility $\\sigma$, all small',
      method: 'Volatility drag: E[ln(1 + R)] ≈ μ − σ²/2, so G ≈ A − σ²/2.' }),
    it('atmcall', 4, nm('C', 'C'), { v: 'svt', approx: true, noReverse: true, terms: [T(1, 1, 1, 'isq2pi')],
      what: 'an at-the-money call $C$ (zero rate, spot $S$, small $\\sigma\\sqrt{T}$)',
      method: 'Black–Scholes at the money: C = S(2Φ(σ√T/2) − 1) ≈ Sσ√T/√(2π) ≈ 0.4 Sσ√T.' }),
    it('bond', 4, nm('\\frac{P(y+\\Delta y)}{P(y)}', 'P(y + Δy)/P(y)'), { v: 'dy', noReverse: true, terms: [T(0, 1), T(1, -1, 1, 'D'), T(2, 1, 2, 'C')], params: { D: 4.5, C: 25 },
      where: 'for a yield move $\\Delta y$ (modified duration $D$, convexity $C$)', method: 'Taylor in the yield: −D at first order, +C/2 at second.' })
  ];
  var BY = {};
  LIB.forEach(function (e) { BY[e.key] = e; });
  var TIERS = [
    { n: 1, name: 'Basics at 0' }, { n: 2, name: 'Composed and products' }, { n: 3, name: 'At a ≠ 0' }, { n: 4, name: 'Asymptotics and quant' }
  ];

  // Families whose expansions are easy to mix up (wrong choices and the reverse question).
  var SIBLINGS = [
    ['sin', 'sh', 'arctan', 'th', 'argth', 'arcsin', 'argsh', 'tan', 'sinc'],
    ['cos', 'ch', 'inv1px2', 'isqrt1mx2', 'sec', 'expx2'],
    ['ln1p', 'ln1m', 'lnratio', 'logret', 'exp', 'ln1psin'],
    ['inv1p', 'inv1m', 'inv1px2', 'inv1p2', 'fib', 'bernoulli'],
    ['sqrt1p', 'isqrt1p', 'inv1p', 'sqrtdiff'],
    ['exp', 'inv1m', 'ch', 'sh', 'esin', 'expx2', 'apow'],
    ['esin', 'ecos', 'expsin', 'expcos', 'ln1psin'],
    ['lncos', 'sin2', 'sec', 'cos'],
    ['powa', 'compound', 'discount', 'nthroot'],
    ['eulerlim', 'stirling', 'harmonic'],
    ['ln_at1', 'ln1p_at1', 'exp_at1', 'arctan_at1'],
    ['sin_atpi6', 'cos_atpi3', 'tan_atpi4'],
    ['sqrt_at4', 'inv_at2']
  ];
  function siblingsOf(key) {
    var out = [];
    SIBLINGS.forEach(function (g) { if (g.indexOf(key) >= 0) g.forEach(function (k) { if (k !== key && out.indexOf(k) < 0) out.push(k); }); });
    return out;
  }

  // ---------- rendering ----------

  function powTex(v, k) { return k === 1 ? v.tex : (v.paren ? '(' + v.tex + ')' : v.tex) + '^{' + k + '}'; }
  function powText(v, k) { return k === 1 ? v.text : (v.paren ? '(' + v.text + ')' : v.text) + sup(k); }

  // |c| × sym × v^k as { tex, text } (the sign is the caller's).
  function monomial(c, s, v, k) {
    var p = Math.abs(c[0]), q = c[1], S = s ? SYM[s] : null;
    var nT = [], nX = [], dT = [], dX = [], aT = '', aX = '';
    if (q !== 1) { dT.push(String(q)); dX.push(String(q)); }
    var symT = S && S.num ? (S.varFirst ? '\\,' : '') + S.num : '', symX = S && S.num ? S.tn : '';
    if (symT && !S.varFirst) { nT.push(symT); nX.push(symX); }
    if (S && S.den) { dT.push(S.den); dX.push(S.td); }
    if (k !== 0) {
      var e = v.inv ? -k : k;
      if (e < 0) { dT.push(powTex(v, -e)); dX.push(powText(v, -e)); }
      else if (v.group && (dT.length)) { aT = powTex(v, e); aX = powText(v, e); }   // (√3/2)(x − π/6): the bracket after the fraction
      else { nT.push(powTex(v, e)); nX.push(powText(v, e)); }
    }
    if (symT && S.varFirst) { nT.push(symT); nX.push(k === 0 ? symX.trim() : symX); }   // x ln a, not ln ax
    if (p !== 1 || !nT.length) { nT.unshift(String(p)); nX.unshift(String(p)); }
    var numT = nT.join(' '), numX = nX.join('');   // the space keeps \alpha x from reading as one command
    if (!dT.length) return { tex: numT + aT, text: numX + aX };
    var den = dX.join(''), tex = '\\frac{' + numT + '}{' + dT.join('') + '}' + aT;
    // 1/(2n) needs its bracket; 1/n, 1/n², x³/6 and 1/√(2π) do not
    var plainDen = /^(\d+|[A-Za-zα-ωΔ]+[⁰¹²³⁴⁵⁶⁷⁸⁹]*|√\(.*\))$/.test(den) ? den : '(' + den + ')';
    var text = aX ? '(' + numX + '/' + plainDen + ')' + aX : numX + '/' + plainDen;
    return { tex: tex, text: text };
  }

  function varOf(e, inX) { return e.point && !inX ? hVar(e.point) : VARS[e.v]; }
  function remainder(v, n) {
    if (n === 0) return { tex: 'o(1)', text: 'o(1)' };
    if (v.inv) return { tex: 'o\\left(\\frac{1}{' + powTex(v, n) + '}\\right)', text: 'o(1/' + powText(v, n) + ')' };
    return { tex: 'o\\left(' + powTex(v, n) + '\\right)', text: 'o(' + powText(v, n) + ')' };
  }

  /*
   * The right-hand side for an instance { e (the expansion), terms, rem (order of o(·)), inX (tier 3 shown in x by
   * mistake) } as { tex, text }. Terms are sorted by power; zero coefficients are left out.
   */
  function rhs(inst) {
    var e = inst.e, v = varOf(e, inst.inX), terms = inst.terms.filter(function (t) { return t.c[0] !== 0; })
      .slice().sort(function (a, b) { return a.k - b.k; });
    var T = [], X = [];
    terms.forEach(function (t, i) {
      var m = monomial(t.c, t.s, v, t.k), neg = t.c[0] < 0;
      if (i === 0 && !e.head) { T.push((neg ? '-' : '') + m.tex); X.push((neg ? '−' : '') + m.text); }
      else { T.push((neg ? ' - ' : ' + ') + m.tex); X.push((neg ? ' − ' : ' + ') + m.text); }
    });
    var sT = T.join(''), sX = X.join('');
    if (!terms.length) { sT = '0'; sX = '0'; }
    if (e.head) { sT = e.head.tex + sT; sX = e.head.text + sX; }
    if (e.approx) return { tex: sT, text: sX };
    var r = remainder(v, inst.rem);
    if (e.prefix) {
      var pf = PREFIX[e.prefix];
      if (e.remInside) return { tex: pf.tex + '\\left(' + sT + ' + ' + r.tex + '\\right)', text: pf.text + '(' + sX + ' + ' + r.text + ')' };
      return { tex: pf.tex + '\\left(' + sT + '\\right) + ' + r.tex, text: pf.text + '(' + sX + ') + ' + r.text };
    }
    return { tex: sT + ' + ' + r.tex, text: sX + ' + ' + r.text };
  }

  function nameOf(e, notation) { var n = notation === 'en' ? 'en' : 'fr'; return { tex: e.name[n], text: e.text[n] }; }
  // The expansion at order n: its terms up to n (powers of 1/n count the same way), remainder o(vⁿ).
  function truncate(e, n) { return e.terms.filter(function (t) { return t.k <= n; }); }
  function instance(e, n) { return { e: e, terms: truncate(e, n), rem: n }; }
  function toTex(e, n) { return rhs(instance(e, n)).tex; }
  function toText(e, n) { return rhs(instance(e, n)).text; }
  // "f(x) = … + o(xⁿ)" in full.
  function full(e, n, notation) {
    var nm = nameOf(e, notation), r = rhs(instance(e, n)), rel = e.approx ? ' \\approx ' : ' = ', relX = e.approx ? ' ≈ ' : ' = ';
    return { tex: nm.tex + rel + r.tex, text: nm.text + relX + r.text };
  }

  // Numeric value of a list of terms at x (or h), parameters p; the prefix and head included.
  function evalTerms(e, terms, x, p) {
    p = p || e.params || {};
    var v = VARS[e.v] || VARS.x, s = 0;
    terms.forEach(function (t) {
      var pw = v.inv ? Math.pow(x, -t.k) : Math.pow(x, t.k);
      s += qval(t.c) * symVal(t.s, p) * pw;
    });
    if (e.prefix) s *= PREFIX[e.prefix].val(Object.assign({ n: x }, p));
    if (e.head && e.head.val) s += e.head.val(Object.assign({ n: x }, p));
    return s;
  }

  // ---------- wrong choices ----------

  function clone(inst) { return { e: inst.e, terms: inst.terms.map(function (t) { return { k: t.k, c: t.c, s: t.s }; }), rem: inst.rem, inX: !!inst.inX }; }
  function withC(inst, i, c) { var x = clone(inst); x.terms[i].c = c; return x; }
  // Common wrong values for a coefficient (by |value|), besides doubling and halving.
  var WRONG = { '2/15': ['1/15', '1/5'], '1/8': ['1/4', '1/16'], '5/128': ['1/16', '5/64'], '17/315': ['1/63', '17/63'], '3/40': ['1/40', '3/20'],
    '11/24': ['1/24', '11/12'], '5/24': ['1/24', '5/12'], '1/12': ['1/6', '1/24'], '3/8': ['1/8', '3/4'], '5/16': ['1/16', '3/16'] };

  function candidates(inst, rng) {
    var e = inst.e, out = [], terms = inst.terms.filter(function (t) { return t.c[0] !== 0; });
    var idx = function (t) { return inst.terms.indexOf(t); };
    terms.forEach(function (t, i) {
      if (i === 0 && !e.head) return;   // the leading term stays
      var j = idx(t), a = Math.abs(t.c[0]), b = t.c[1];
      out.push({ rule: 'sign', inst: withC(inst, j, qneg(t.c)) });
      // factorial ↔ integer
      if (t.k >= 3 && a === 1 && b === FACT[t.k]) out.push({ rule: 'fact', inst: withC(inst, j, Q(Math.sign(t.c[0]) * 1, t.k)) });
      else if (t.k >= 3 && a === 1 && b === t.k && FACT[t.k]) out.push({ rule: 'fact', inst: withC(inst, j, Q(Math.sign(t.c[0]) * 1, FACT[t.k])) });
      (WRONG[a + '/' + b] || []).forEach(function (w) { var f = w.split('/'); out.push({ rule: 'coef', inst: withC(inst, j, Q(Math.sign(t.c[0]) * +f[0], +f[1])) }); });
      if (b % 2 === 0) out.push({ rule: 'coef', inst: withC(inst, j, Q(t.c[0], b / 2)) });
      out.push({ rule: 'coef', inst: withC(inst, j, Q(t.c[0], b * 2)) });
      if (terms.length > 1) { var d = clone(inst); d.terms.splice(j, 1); out.push({ rule: 'drop', inst: d }); }
    });
    // siblings, in this expansion's variable and point
    siblingsOf(e.key).forEach(function (k) {
      var s = BY[k];
      if (!s || s.approx) return;
      var x = { e: e, terms: truncate(s, inst.rem).map(function (t) { return { k: t.k, c: t.c, s: t.s }; }), rem: inst.rem, inX: inst.inX };
      if (s.prefix !== e.prefix || s.head !== e.head) return;
      out.push({ rule: 'sibling', inst: x });
    });
    // the remainder at the wrong order: one lower, or one higher when that makes a false claim
    if (!e.approx) {
      if (inst.rem - 1 >= 0) { var lo = clone(inst); lo.rem = inst.rem - 1; out.push({ rule: 'rem', inst: lo }); }
      var next = e.terms.filter(function (t) { return t.k === inst.rem + 1 && t.c[0] !== 0; })[0];
      if (next) { var hi = clone(inst); hi.rem = inst.rem + 1; out.push({ rule: 'rem', inst: hi }); }
    }
    // at a ≠ 0: expanded in x instead of x − a, or the constant f(a) forgotten
    if (e.point) {
      var ix = clone(inst); ix.inX = true; out.push({ rule: 'point', inst: ix });
      var k0 = inst.terms.filter(function (t) { return t.k === 0; })[0];
      if (k0) { var nc = clone(inst); nc.terms = nc.terms.filter(function (t) { return t.k !== 0; }); out.push({ rule: 'point', inst: nc }); }
    }
    return shuffle(out, rng);
  }

  // Last resort: scale one coefficient by 2, 3 or 1/3, or flip it.
  function perturb(inst, rng) {
    var x = clone(inst), nz = x.terms.filter(function (t) { return t.c[0] !== 0; });
    if (!nz.length) { x.terms.push({ k: 1, c: Q(1), s: null }); return x; }
    var t = nz[Math.floor(rng() * nz.length)], f = [Q(2), Q(3), Q(1, 3), Q(-1), Q(3, 2)][Math.floor(rng() * 5)];
    t.c = qmul(t.c, f);
    return x;
  }

  function shuffle(a, rng) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // Five wrong instances, all different from the right one and from each other (compared on their plain text).
  function wrongs(inst, rng) {
    var right = rhs(inst).text, seen = {}, out = [], rem = 0;
    seen[right] = 1;
    function take(c) {
      if (out.length >= 5) return;
      if (c.rule === 'rem' && rem) return;
      var t = rhs(c.inst).text;
      if (seen[t]) return;
      seen[t] = 1; out.push(c.inst);
      if (c.rule === 'rem') rem++;
    }
    candidates(inst, rng).forEach(take);
    for (var i = 0; out.length < 5 && i < 200; i++) take({ rule: 'perturb', inst: perturb(out.length && rng() < 0.5 ? out[Math.floor(rng() * out.length)] : inst, rng) });
    return out;
  }

  // ---------- questions ----------

  var TYPES = [['f2dl', 'Function → expansion'], ['dl2f', 'Expansion → function'], ['est', 'Estimation']];

  function where(e) {
    if (e.where) return e.where;
    if (e.point) return 'around $' + e.point.tex + '$';
    return 'around 0';
  }
  function orderWords(e, n) {
    if (e.approx) return '';
    if (VARS[e.v] && VARS[e.v].inv) return ' to order $\\frac{1}{' + powTex(VARS.n, Math.max(1, n)) + '}$';
    return ' at order ' + n;
  }
  function plainOf(rich) {
    var TeX = AT.TeX || (typeof module !== 'undefined' ? require('./tex.js') : null);
    return TeX.richPlain(rich);
  }

  /*
   * One question: { key, tier, type, order, prompt (rich: words with $TeX$), promptText, display? ({ tex, text }, shown big),
   * choices: [{ tex, text }] (6), correct (index), full ({ tex, text }), generic?, method, est? }.
   */
  function question(key, type, order, rng, opts) {
    opts = opts || {};
    var e = BY[key], n = order === undefined || order === null ? e.max : order, nmF = nameOf(e, opts.notation);
    var right = instance(e, n), q = { key: key, tier: e.tier, type: type, order: n, method: e.method, generic: e.generic, full: full(e, n, opts.notation) };
    var choices;
    if (type === 'est') return estimation(e, n, rng, opts, q);
    if (type === 'dl2f') {
      q.prompt = 'Which function has this expansion ' + where(e) + '?';
      q.display = rhs(right);
      var shown = q.display.text, names = [nmF], seenN = {};
      seenN[nmF.text] = 1;
      var pool = siblingsOf(key).map(function (k) { return BY[k]; })
        .concat(shuffle(LIB.filter(function (x) { return x.tier === e.tier; }), rng)).concat(shuffle(LIB.slice(), rng));
      pool.forEach(function (s) {
        if (names.length >= 6 || !s || s.key === key || s.approx || s.noReverse) return;
        // its expansion, in this question's form, must differ from the one shown (compared where both are known)
        var m = Math.min(n, s.max);
        if (rhs({ e: e, terms: truncate(s, m), rem: m }).text === rhs({ e: e, terms: truncate(e, m), rem: m }).text) return;
        var nm = nameOf(s, opts.notation);
        if (seenN[nm.text]) return;
        seenN[nm.text] = 1; names.push(nm);
      });
      choices = names.map(function (x, i) { return { tex: x.tex, text: x.text, right: i === 0 }; });
    } else {
      q.prompt = e.what ? 'Which approximation is right for ' + e.what + '?' : 'Expansion of $' + nmF.tex + '$' + orderWords(e, n) + ' ' + where(e);
      choices = [rhs(right)].concat(wrongs(right, rng).map(rhs)).map(function (x, i) {
        return { tex: (e.approx ? nmF.tex + ' \\approx ' : '') + x.tex, text: (e.approx ? nmF.text + ' ≈ ' : '') + x.text, right: i === 0 };
      });
    }
    shuffle(choices, rng);
    q.choices = choices.map(function (c) { return { tex: c.tex, text: c.text }; });
    q.correct = choices.map(function (c) { return c.right; }).indexOf(true);
    q.promptText = plainOf(q.prompt) + (q.display ? ' ' + q.display.text : '');
    return q;
  }

  // Estimation: f(x) for a small x, to 4 decimals. Wrong choices: the wrong expansions' values, and first order only.
  var EST_X = [0.1, 0.2, -0.1, -0.2, 0.05, 0.15];
  function fmt4(v) { var s = v.toFixed(4); return s.charAt(0) === '-' ? '−' + s.slice(1) : s; }
  function estimation(e, n, rng, opts, q) {
    var nmF = nameOf(e, opts.notation);
    for (var tries = 0; tries < 40; tries++) {
      var x = EST_X[Math.floor(rng() * EST_X.length)];
      if (e.key === 'tan' && Math.abs(x) > 0.15) continue;
      var truth = e.fn(x), right = instance(e, n), dl = evalTerms(e, right.terms, x);
      var vals = [fmt4(truth)], seen = {};
      seen[vals[0]] = 1;
      var cands = wrongs(right, rng).map(function (w) { return evalTerms(e, w.terms, x); });
      cands.push(evalTerms(e, e.terms.filter(function (t) { return t.k <= 1; }), x));
      cands.forEach(function (v) { var s = fmt4(v); if (vals.length < 6 && !seen[s] && isFinite(v)) { seen[s] = 1; vals.push(s); } });
      if (vals.length < 6) continue;
      var xs = x < 0 ? '(' + String(x).replace('-', '-') + ')' : String(x);
      var arg = nmF.tex.replace(/x/g, xs);
      q.prompt = 'Estimate $' + arg + '$ to 4 decimals';
      q.est = { x: x, truth: truth, dl: dl, err: truth - dl, order: n };
      var ch = vals.map(function (v, i) { return { tex: v.replace('−', '-'), text: v, right: i === 0 }; });
      shuffle(ch, rng);
      q.choices = ch.map(function (c) { return { tex: c.tex, text: c.text }; });
      q.correct = ch.map(function (c) { return c.right; }).indexOf(true);
      q.promptText = plainOf(q.prompt);
      return q;
    }
    return question(e.key, 'f2dl', n, rng, opts);   // no 6 distinct values: ask the expansion instead
  }

  // ---------- settings, pool, picking, mastery ----------

  var DEFAULTS = { tiers: [1], types: ['f2dl', 'dl2f'], from: 2, to: 5, notation: 'fr', penalty: 1 };
  function settings(s) {
    s = s || {};
    var tiers = Array.isArray(s.tiers) ? s.tiers.filter(function (t) { return t >= 1 && t <= 4; }) : DEFAULTS.tiers.slice();
    if (!tiers.length) tiers = [1];
    var types = Array.isArray(s.types) ? s.types.filter(function (t) { return t === 'f2dl' || t === 'dl2f' || t === 'est'; }) : DEFAULTS.types.slice();
    if (!types.length) types = ['f2dl'];
    var from = +s.from >= 2 && +s.from <= 7 ? +s.from : DEFAULTS.from, to = +s.to >= 2 && +s.to <= 7 ? +s.to : DEFAULTS.to;
    if (from > to) { var t = from; from = to; to = t; }
    return { tiers: tiers, types: types, from: from, to: to, notation: s.notation === 'en' ? 'en' : 'fr',
      penalty: [0, 0.5, 1].indexOf(+s.penalty) >= 0 ? +s.penalty : DEFAULTS.penalty };
  }

  // The orders that can be asked for an expansion: tier 1 from `from` to `to` within what is stored; else its own order.
  function ordersFor(e, st) {
    if (e.tier !== 1) return [e.max];
    var out = [];
    for (var n = Math.max(2, st.from); n <= Math.min(e.max, st.to); n++) out.push(n);
    return out.length ? out : [Math.min(e.max, Math.max(2, st.to))];
  }

  // Every (key, type) the settings allow.
  function pool(st) {
    st = settings(st);
    var out = [];
    LIB.forEach(function (e) {
      if (st.tiers.indexOf(e.tier) < 0) return;
      st.types.forEach(function (t) {
        if (t === 'dl2f' && e.noReverse) return;
        if (t === 'est' && (!e.fn || e.tier !== 1)) return;
        out.push({ key: e.key, type: t });
      });
    });
    if (!out.length) LIB.filter(function (e) { return e.tier === 1; }).forEach(function (e) { out.push({ key: e.key, type: 'f2dl' }); });
    return out;
  }

  function isTaylor(r) { return r.mode === 'LEARN' && r.settings && /^taylor-/.test(r.settings.lesson || ''); }
  function answers(rounds, learnOnly) {
    var out = [];
    rounds.forEach(function (r) {
      if (!isTaylor(r) || (learnOnly && r.settings.lesson !== 'taylor-learn')) return;
      (r.questions || []).forEach(function (q) { if (q.op === 'ty') out.push({ q: q, at: r.startedAt }); });
    });
    return out;
  }

  var MASTER_DAYS = 3, MASTER_MS = 6000;
  function median(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  /*
   * Mastered: the last 3 days you answered it (Learn and Sprint together: sprints are timed and never hinted, stronger
   * evidence), every answer right (a skip is not) with no hint, and the median time of those
   * answers under 6 s. { key: true }. dayKey: S.dayKey (05:00 to 05:00).
   */
  function mastery(rounds, dayKey) {
    var by = {};
    answers(rounds, false).forEach(function (a) {
      var d = dayKey(a.at), k = a.q.key;
      ((by[k] = by[k] || {})[d] = by[k][d] || []).push(a.q);
    });
    var out = {};
    Object.keys(by).forEach(function (k) {
      var days = Object.keys(by[k]).sort().slice(-MASTER_DAYS);
      if (days.length < MASTER_DAYS) return;
      var qs = [];
      days.forEach(function (d) { qs = qs.concat(by[k][d]); });
      if (qs.every(function (q) { return q.correct && !q.hinted && !q.skipped; }) && median(qs.map(function (q) { return q.timeMs; })) < MASTER_MS) out[k] = true;
    });
    return out;
  }

  /*
   * State of every expansion: 'unseen' | 'seen' | 'weak' | 'mastered'. facts = S.factStats(rounds) (key 'ty-<key>').
   */
  function states(rounds, facts, dayKey) {
    var m = mastery(rounds, dayKey), byKey = {}, seen = {}, out = {};
    facts.forEach(function (f) { if (/^ty-/.test(f.key)) byKey[f.key.slice(3)] = f; });
    answers(rounds, false).forEach(function (a) { seen[a.q.key] = 1; });
    LIB.forEach(function (e) {
      out[e.key] = m[e.key] ? 'mastered' : byKey[e.key] && byKey[e.key].status === 'weak' ? 'weak' : seen[e.key] ? 'seen' : 'unseen';
    });
    return out;
  }

  /*
   * A Learn set: n (key, type) items by weighted draw without replacement (again from the top when the pool is smaller):
   * never answered in that type 6, weak 4, improving 2, fine 1, mastered 0.3.
   */
  var W = { unseen: 6, weak: 4, improving: 2, ok: 1, mastered: 0.3 };
  function pickSet(items, rounds, facts, dayKey, rng, n) {
    n = n || 20;
    var st = states(rounds, facts, dayKey), byKey = {}, seenType = {};
    facts.forEach(function (f) { if (/^ty-/.test(f.key)) byKey[f.key.slice(3)] = f; });
    answers(rounds, false).forEach(function (a) { seenType[a.q.key + '|' + a.q.type] = 1; });
    function weight(it) {
      if (!seenType[it.key + '|' + it.type]) return W.unseen;
      if (st[it.key] === 'mastered') return W.mastered;
      var f = byKey[it.key];
      return f ? W[f.status] || W.ok : W.ok;
    }
    var out = [], left = [];
    while (out.length < n) {
      if (!left.length) left = items.slice();
      var ws = left.map(weight), total = ws.reduce(function (a, b) { return a + b; }, 0), r = rng() * total, i = 0;
      while (i < left.length - 1 && r >= ws[i]) { r -= ws[i]; i++; }
      out.push(left.splice(i, 1)[0]);
    }
    return out;
  }

  /*
   * The relearning loop: a wrong or hinted Learn answer to items[at − 1] comes back once, 3 to 5 questions later, in place
   * of the item there (the set keeps its length), or in the last slot when that is nearer, as long as it is still to come.
   * It comes back as another question type the settings allow for that expansion, else at another order, else the same.
   * A comeback (again: true) never comes back itself. Returns the slot used, or −1.
   */
  function relearn(items, at, item, st, rng) {
    if (!item || item.again || at >= items.length) return -1;
    var slot = Math.min(at - 1 + 3 + Math.floor(rng() * 3), items.length - 1);
    if (slot < at) return -1;
    st = settings(st);
    var e = BY[item.key], types = pool(st).filter(function (p) { return p.key === item.key && p.type !== item.type; }).map(function (p) { return p.type; });
    var back = { key: item.key, type: item.type, again: true };
    if (types.length) back.type = types[Math.floor(rng() * types.length)];
    else {
      var orders = ordersFor(e, st).filter(function (n) { return n !== item.order; });
      if (orders.length) back.order = orders[Math.floor(rng() * orders.length)];
    }
    items[slot] = back;
    return slot;
  }

  // Plain label and advice for the fact engine ('ty-sin' → "Taylor: sin x").
  function label(key) { var e = BY[key]; return e ? 'Taylor: ' + e.text.fr : key; }
  function advice(q) { var e = BY[q.key]; return e ? e.method : ''; }

  var api = {
    Q: Q, qval: qval, SYM: SYM, LIB: LIB, BY: BY, TIERS: TIERS, TYPES: TYPES, SIBLINGS: SIBLINGS, DEFAULTS: DEFAULTS,
    monomial: monomial, rhs: rhs, instance: instance, truncate: truncate, toTex: toTex, toText: toText, full: full, nameOf: nameOf,
    evalTerms: evalTerms, candidates: candidates, wrongs: wrongs, question: question, fmt4: fmt4, settings: settings,
    ordersFor: ordersFor, pool: pool, answers: answers, isTaylor: isTaylor, mastery: mastery, states: states, pickSet: pickSet,
    relearn: relearn, label: label, advice: advice, MASTER_MS: MASTER_MS
  };
  AT.Taylor = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
