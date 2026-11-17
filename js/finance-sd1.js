/*
 * finance-sd1.js — Superday templates, part 1: Units & percentages, FX, Rates, Bonds (23 templates).
 * From the coach's finance-templates-spec. Each one has the teaching data the card and the Method sheet show:
 * level (= difficulty), target seconds, legend (symbol, what it is, its value in this question), shortcut, pitfalls
 * (a wrong value per typical mistake, with its error tag) and a worked example (a unit test).
 * Part 2 (equities … probability) is finance-sd2.js; the legends of the older templates are in finance-meta.js.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var F = AT.Finance || require('./finance-core.js');
  var int = F.int, pick = F.pick, grid = F.grid, D = F.define, big = F.big;
  function M(tex) { return '$' + tex + '$'; }
  function S(tex) { return M(tex) + '.'; }
  function fr(a, b) { return '\\frac{' + a + '}{' + b + '}'; }
  var X = ' \\times ';
  function n(x, dp) { return F.fmt(x, dp === undefined ? 4 : dp); }
  var EXACT = function () { return { type: 'exact' }; };
  var REL = function () { return { type: 'rel', v: 0.005 }; };
  function sign(x) { return x < 0 ? '- ' + n(Math.abs(x)) : '+ ' + n(x); }

  // ======================= Units & percentages =======================

  D({
    id: 'units.bp.pct', family: 'quant', category: 'Units & percentages', level: 1, target: 8, unit: '%', dp: 2, tol: EXACT,
    params: function (rng) { return { x: int(rng, 1, 500) }; },
    prompt: function (p) { return 'Convert ' + p.x + ' bp to %.'; },
    answer: function (p) { return p.x / 100; },
    steps: function (p) { return [S('\\% = ' + fr('\\text{bp}', 100) + ' = ' + fr(p.x, 100) + ' = ' + n(p.x / 100, 2))]; },
    formula: '% = bp / 100', tex: '\\% = \\frac{\\text{bp}}{100}',
    shortcut: 'Move the decimal point 2 places left: 25 bp = 0.25%. As a decimal: 4 places, 0.0025.',
    legend: [['\\text{bp}', 'basis points: 1 bp = 0.01% = 0.0001', function (p) { return p.x + ' bp'; }], ['100', 'there are 100 bp in 1%', '100']],
    pitfalls: [
      { tag: 'UNIT', text: 'You divided by 10 000 (gave the decimal instead of %).', value: function (p) { return p.x / 10000; } },
      { tag: 'UNIT', text: 'You divided by 10.', value: function (p) { return p.x / 10; } }],
    example: { p: { x: 25 }, answer: 0.25 }
  });

  var NOTIONALS = [1e6, 2.5e6, 1e7, 5e7, 1e8, 2.5e8, 1e9, 2.5e9];
  D({
    id: 'units.bp.pnl', family: 'quant', category: 'Units & percentages', level: 1, target: 15, unit: '€', dp: 0, tol: EXACT, positive: false,
    params: function (rng) { return { N: pick(rng, NOTIONALS), x: int(rng, 1, 100) }; },
    prompt: function (p) { return 'A position of ' + big(p.N) + ' € gains ' + p.x + ' bp. P&L in €?'; },
    answer: function (p) { return p.N / 10000 * p.x; },
    steps: function (p) { return [S('\\text{P&L} = ' + p.N + X + p.x + X + '0.0001'), S('\\text{1 bp on } ' + big(p.N) + ' = ' + n(p.N / 10000, 0) + ' \\text{ €, so } ' + n(p.N / 10000, 0) + X + p.x + ' = ' + n(p.N / 10000 * p.x, 0))]; },
    formula: 'P&L = N × x × 0.0001', tex: '\\text{P&L} = N \\times x \\times 0.0001',
    shortcut: '1 bp on 1m = 100 €. So 40 bp on 2.5bn = 40 × 100 × 2 500 = 10m.',
    legend: [['N', 'the notional (size of the position)', function (p) { return big(p.N) + ' €'; }], ['x', 'the move in basis points', function (p) { return p.x + ' bp'; }], ['0.0001', 'one basis point as a decimal', '0.0001']],
    pitfalls: [
      { tag: 'UNIT', text: 'You used ×0.01: that treats bp as %.', value: function (p) { return p.N * p.x * 0.01; } },
      { tag: 'UNIT', text: 'Off by ×1000: a k / m / bn slip.', value: function (p) { return p.N / 10000 * p.x * 1000; } },
      { tag: 'UNIT', text: 'Off by ÷1000: a k / m / bn slip.', value: function (p) { return p.N / 10000 * p.x / 1000; } }],
    example: { p: { N: 2.5e9, x: 40 }, answer: 10000000 }
  });

  var MIDS = [50, 60, 80, 100, 120, 150, 200], SPREADS = [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.2, 0.3, 0.4, 0.5];
  D({
    id: 'units.bidask.bp', family: 'quant', category: 'Units & percentages', level: 2, target: 30, unit: 'bp', dp: 1, tol: REL,
    params: function (rng) { return { mid: pick(rng, MIDS), s: pick(rng, SPREADS) }; },
    valid: function (p) { return p.s / p.mid <= 0.005; },
    prompt: function (p) { return 'Bid ' + n(p.mid - p.s / 2, 2) + ', ask ' + n(p.mid + p.s / 2, 2) + '. Spread in bp of the mid?'; },
    answer: function (p) { return p.s / p.mid * 10000; },
    steps: function (p) {
      return [S('\\text{mid} = ' + fr(n(p.mid - p.s / 2, 2) + ' + ' + n(p.mid + p.s / 2, 2), 2) + ' = ' + n(p.mid, 2)),
        S('s = ' + fr(n(p.mid + p.s / 2, 2) + ' - ' + n(p.mid - p.s / 2, 2), n(p.mid, 2)) + X + '10\\,000 = ' + fr(n(p.s, 2), n(p.mid, 2)) + X + '10\\,000 = ' + n(p.s / p.mid * 10000, 1) + '\\text{ bp}')];
    },
    formula: 's = (ask − bid) / mid × 10 000, mid = (bid + ask) / 2',
    tex: 's = \\frac{\\text{ask} - \\text{bid}}{\\text{mid}} \\times 10\\,000,\\quad \\text{mid} = \\frac{\\text{bid} + \\text{ask}}{2}',
    shortcut: 'Spread / mid as a %, then ×100 for bp: $\\frac{0.10}{100} = 0.1\\%$ = 10 bp.',
    legend: [['s', 'the spread in basis points', ''], ['\\text{ask}', 'the price at which you can buy', function (p) { return n(p.mid + p.s / 2, 2); }],
      ['\\text{bid}', 'the price at which you can sell', function (p) { return n(p.mid - p.s / 2, 2); }], ['\\text{mid}', 'the average of bid and ask', function (p) { return n(p.mid, 2); }],
      ['10\\,000', 'converts a decimal to bp', '10 000']],
    pitfalls: [
      { tag: 'UNIT', text: 'You answered in % (forgot ×100).', value: function (p) { return p.s / p.mid * 100; } },
      { tag: 'RATIO_INVERTED', text: 'Dividing by the bid or the ask instead of the mid is only a small error; use the mid.' }],
    example: { p: { mid: 100, s: 0.1 }, answer: 10 }
  });

  D({
    id: 'units.pct.successive', family: 'quant', category: 'Units & percentages', level: 2, target: 25, unit: '%', dp: 2,
    tol: function () { return { type: 'rel', v: 0.005, abs: 0.05 }; },
    params: function (rng) { return { a: int(rng, 1, 50), b: int(rng, 1, 50) }; },
    valid: function (p) { return Math.abs((1 + p.a / 100) * (1 - p.b / 100) - 1) * 100 >= 0.5; },
    prompt: function (p) { return 'A value rises ' + p.a + '% then falls ' + p.b + '%. Net change in %?'; },
    answer: function (p) { return ((1 + p.a / 100) * (1 - p.b / 100) - 1) * 100; },
    steps: function (p) {
      var up = 1 + p.a / 100, dn = 1 - p.b / 100;
      return [S('(1 + ' + n(p.a / 100, 2) + ')(1 - ' + n(p.b / 100, 2) + ') = ' + n(up, 2) + X + n(dn, 2) + ' = ' + n(up * dn, 4)), S('\\Delta\\% = (' + n(up * dn, 4) + ' - 1)' + X + '100 = ' + n((up * dn - 1) * 100, 2) + '\\%')];
    },
    formula: 'Δ% = [(1 + a)(1 − b) − 1] × 100', tex: '\\Delta\\% = \\left[(1 + a)(1 - b) - 1\\right] \\times 100',
    shortcut: 'Net ≈ a − b − a·b. +20% then −20% is not 0: 1.2 × 0.8 = 0.96, so −4%.',
    legend: [['\\Delta\\%', 'the net percentage change', ''], ['a', 'the rise as a decimal', function (p) { return p.a + '% = ' + n(p.a / 100, 2); }],
      ['b', 'the fall as a decimal', function (p) { return p.b + '% = ' + n(p.b / 100, 2); }], ['(1 + a)(1 - b)', 'the overall multiplier', function (p) { return n((1 + p.a / 100) * (1 - p.b / 100), 4); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You subtracted the percentages (a − b): the second move applies to a different base.', value: function (p) { return p.a - p.b; } }],
    example: { p: { a: 20, b: 20 }, answer: -4 }
  });

  var BASES = [40, 60, 80, 100, 120, 140, 160, 200, 240, 300, 400, 500, 800, 1000];
  D({
    id: 'units.pct.reverse', family: 'quant', category: 'Units & percentages', level: 2, target: 25, unit: '', dp: 0, tol: EXACT, positive: true,
    params: function (rng) { var x = pick(rng, [5, 10, 20, 25, 50]), p0 = pick(rng, BASES); return { x: x, P: p0 * (1 + x / 100) }; },
    prompt: function (p) { return 'After a ' + p.x + '% increase, a price is ' + n(p.P, 2) + '. What was it before?'; },
    answer: function (p) { return F.round(p.P / (1 + p.x / 100), 6); },
    steps: function (p) { return [S('P_0 = ' + fr(n(p.P, 2), '1 + ' + n(p.x / 100, 2)) + ' = ' + fr(n(p.P, 2), n(1 + p.x / 100, 2)) + ' = ' + n(p.P / (1 + p.x / 100), 2))]; },
    formula: 'P0 = P / (1 + x)', tex: 'P_0 = \\frac{P}{1 + x}',
    shortcut: 'Divide, never subtract: 120 after +20% → $\\frac{120}{1.2} = 100$, not $120 - 24 = 96$.',
    legend: [['P_0', 'the price before the increase', ''], ['P', 'the price after', function (p) { return n(p.P, 2); }], ['x', 'the increase as a decimal', function (p) { return p.x + '% = ' + n(p.x / 100, 2); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You took x% off the new price (P × (1 − x)): that is not the way back.', value: function (p) { return p.P * (1 - p.x / 100); } }],
    example: { p: { x: 20, P: 120 }, answer: 100 }
  });

  // ======================= FX =======================

  function fxRate(rng) { return grid(rng, 1.02, 1.25, 0.01); }
  var AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 250000, 500000, 1000000];

  D({
    id: 'fx.usd.eur', family: 'fin', category: 'FX', level: 1, target: 15, unit: '€', dp: 0, tol: REL, positive: true,
    params: function (rng) { return { s: fxRate(rng), U: pick(rng, AMOUNTS) }; },
    prompt: function (p) { return 'EUR/USD = ' + n(p.s, 2) + '. Convert ' + p.U + ' USD to EUR.'; },
    answer: function (p) { return p.U / p.s; },
    steps: function (p) { return [S('\\text{EUR} = ' + fr('\\text{USD}', 's') + ' = ' + fr(p.U, n(p.s, 2)) + ' = ' + n(p.U / p.s, 0))]; },
    formula: 'EUR = USD / s', tex: '\\text{EUR} = \\frac{\\text{USD}}{s}',
    shortcut: 'EUR/USD > 1 means 1 EUR buys more than 1 USD, so the EUR amount must be SMALLER: divide.',
    legend: [['s', 'EUR/USD: the number of USD for 1 EUR', function (p) { return n(p.s, 2); }], ['\\text{USD}', 'the amount to convert', function (p) { return p.U + ' USD'; }]],
    pitfalls: [{ tag: 'FX_DIRECTION', text: 'You multiplied by the rate: that converts EUR into USD, the other way.', value: function (p) { return p.U * p.s; } }],
    example: { p: { s: 1.1, U: 110000 }, answer: 100000 }
  });

  D({
    id: 'fx.eur.usd', family: 'fin', category: 'FX', level: 1, target: 10, unit: 'USD', dp: 0, tol: REL, positive: true,
    params: function (rng) { return { s: fxRate(rng), E: pick(rng, AMOUNTS) }; },
    prompt: function (p) { return 'EUR/USD = ' + n(p.s, 2) + '. Convert ' + p.E + ' EUR to USD.'; },
    answer: function (p) { return p.E * p.s; },
    steps: function (p) { return [S('\\text{USD} = \\text{EUR}' + X + 's = ' + p.E + X + n(p.s, 2) + ' = ' + n(p.E * p.s, 0))]; },
    formula: 'USD = EUR × s', tex: '\\text{USD} = \\text{EUR} \\times s',
    shortcut: 'Base currency (EUR) → quote currency (USD): multiply by the quote.',
    legend: [['s', 'EUR/USD: the number of USD for 1 EUR', function (p) { return n(p.s, 2); }], ['\\text{EUR}', 'the amount to convert', function (p) { return p.E + ' EUR'; }]],
    pitfalls: [{ tag: 'FX_DIRECTION', text: 'You divided by the rate: that converts USD into EUR, the other way.', value: function (p) { return p.E / p.s; } }],
    example: { p: { s: 1.08, E: 50000 }, answer: 54000 }
  });

  D({
    id: 'fx.cross.mult', family: 'fin', category: 'FX', level: 2, target: 30, unit: 'JPY', dp: 1, tol: REL, positive: true,
    params: function (rng) { return { a: fxRate(rng), b: int(rng, 130, 160) }; },
    prompt: function (p) { return 'EUR/USD = ' + n(p.a, 2) + ', USD/JPY = ' + p.b + '. EUR/JPY?'; },
    answer: function (p) { return p.a * p.b; },
    steps: function (p) { return [S('\\text{EUR/JPY} = ' + n(p.a, 2) + X + p.b + ' = ' + n(p.a * p.b, 1))]; },
    formula: 'EUR/JPY = EUR/USD × USD/JPY', tex: '\\text{EUR/JPY} = \\text{EUR/USD} \\times \\text{USD/JPY}',
    shortcut: 'Chain the units: (USD/EUR) × (JPY/USD) = JPY/EUR: USD cancels, so multiply.',
    legend: [['\\text{EUR/USD}', 'USD per 1 EUR', function (p) { return n(p.a, 2); }], ['\\text{USD/JPY}', 'JPY per 1 USD', function (p) { return String(p.b); }]],
    pitfalls: [{ tag: 'FX_DIRECTION', text: 'You divided (JPY per USD over USD per EUR): the USD does not cancel that way.', value: function (p) { return p.b / p.a; } }],
    example: { p: { a: 1.1, b: 150 }, answer: 165 }
  });

  D({
    id: 'fx.cross.div', family: 'fin', category: 'FX', level: 2, target: 30, unit: 'GBP', dp: 4, tol: REL, positive: true,
    params: function (rng) { return { a: fxRate(rng), c: grid(rng, 1.2, 1.4, 0.01) }; },
    prompt: function (p) { return 'EUR/USD = ' + n(p.a, 2) + ', GBP/USD = ' + n(p.c, 2) + '. EUR/GBP?'; },
    answer: function (p) { return p.a / p.c; },
    steps: function (p) { return [S('\\text{EUR/GBP} = ' + fr(n(p.a, 2), n(p.c, 2)) + ' = ' + n(p.a / p.c, 4))]; },
    formula: 'EUR/GBP = (EUR/USD) / (GBP/USD)', tex: '\\text{EUR/GBP} = \\frac{\\text{EUR/USD}}{\\text{GBP/USD}}',
    shortcut: 'Both quoted in USD: divide to cancel USD. Sanity: GBP is worth more than EUR, so EUR/GBP < 1.',
    legend: [['\\text{EUR/USD}', 'USD per 1 EUR', function (p) { return n(p.a, 2); }], ['\\text{GBP/USD}', 'USD per 1 GBP', function (p) { return n(p.c, 2); }]],
    pitfalls: [
      { tag: 'FX_DIRECTION', text: 'You inverted it (GBP/USD over EUR/USD): that is GBP per EUR the wrong way round.', value: function (p) { return p.c / p.a; } },
      { tag: 'FX_DIRECTION', text: 'You multiplied the two rates: USD does not cancel.', value: function (p) { return p.a * p.c; } }],
    example: { p: { a: 1.1, c: 1.25 }, answer: 0.88 }
  });

  D({
    id: 'fx.pnl.eur', family: 'fin', category: 'FX', level: 3, target: 45, unit: '€', dp: 0, tol: REL,
    params: function (rng) { var s0 = grid(rng, 1.05, 1.2, 0.01), d = grid(rng, 0.01, 0.05, 0.01); return { U: pick(rng, [100000, 1000000, 10000000]), s0: s0, s1: F.round(s0 + (int(rng, 0, 1) ? d : -d), 2) }; },
    prompt: function (p) { return 'You hold ' + p.U + ' USD. EUR/USD moves from ' + n(p.s0, 2) + ' to ' + n(p.s1, 2) + '. P&L in EUR?'; },
    answer: function (p) { return p.U * (1 / p.s1 - 1 / p.s0); },
    steps: function (p) {
      return [S('\\text{EUR value before} = ' + fr(p.U, n(p.s0, 2)) + ' = ' + n(p.U / p.s0, 0)), S('\\text{EUR value after} = ' + fr(p.U, n(p.s1, 2)) + ' = ' + n(p.U / p.s1, 0)),
        S('\\text{P&L} = ' + n(p.U / p.s1, 0) + ' - ' + n(p.U / p.s0, 0) + ' = ' + n(p.U / p.s1 - p.U / p.s0, 0))];
    },
    formula: 'P&L(EUR) = U × (1/s1 − 1/s0)', tex: '\\text{P&L}_{\\text{EUR}} = U \\times \\left(\\frac{1}{s_1} - \\frac{1}{s_0}\\right)',
    shortcut: 'EUR/USD UP = USD weaker = loss for a USD holder. Size ≈ U/s × (% move).',
    legend: [['U', 'the USD amount held', function (p) { return p.U + ' USD'; }], ['s_0', 'EUR/USD before', function (p) { return n(p.s0, 2); }], ['s_1', 'EUR/USD after', function (p) { return n(p.s1, 2); }],
      ['U/s', 'the EUR value of the USD at rate s', function (p) { return n(p.U / p.s0, 0) + ' → ' + n(p.U / p.s1, 0) + ' €'; }]],
    pitfalls: [
      { tag: 'FX_DIRECTION', text: 'You used U × (s1 − s0): that treats the USD as if it were EUR.', value: function (p) { return p.U * (p.s1 - p.s0); } },
      { tag: 'SIGN', text: 'Right size, wrong sign: EUR/USD up means the USD you hold buys fewer EUR.', value: function (p) { return -p.U * (1 / p.s1 - 1 / p.s0); } }],
    example: { p: { U: 1e6, s0: 1.1, s1: 1.12 }, answer: -16233.7662 }
  });

  D({
    id: 'fx.forward', family: 'fin', category: 'FX', level: 3, target: 45, unit: 'USD', dp: 4, tol: REL, positive: true,
    params: function (rng) { return { S: grid(rng, 1.05, 1.2, 0.01), rd: grid(rng, 0, 6, 0.5), rf: grid(rng, 0, 6, 0.5), T: pick(rng, [0.25, 0.5, 1]) }; },
    valid: function (p) { return Math.abs(p.rd - p.rf) >= 1; },
    prompt: function (p) { return 'EUR/USD spot ' + n(p.S, 2) + ', USD rate ' + n(p.rd, 1) + '%, EUR rate ' + n(p.rf, 1) + '%, $T = ' + n(p.T, 2) + '$ year. Forward EUR/USD (simple interest)?'; },
    answer: function (p) { return p.S * (1 + p.rd / 100 * p.T) / (1 + p.rf / 100 * p.T); },
    steps: function (p) {
      var u = 1 + p.rd / 100 * p.T, e = 1 + p.rf / 100 * p.T;
      return [S('F = ' + n(p.S, 2) + X + fr('1 + ' + n(p.rd / 100, 3) + X + n(p.T, 2), '1 + ' + n(p.rf / 100, 3) + X + n(p.T, 2)) + ' = ' + n(p.S, 2) + X + fr(n(u, 4), n(e, 4)) + ' = ' + n(p.S * u / e, 4))];
    },
    formula: 'F = S × (1 + r_USD T) / (1 + r_EUR T)', tex: 'F = S \\times \\frac{1 + r_{\\text{USD}}\\,T}{1 + r_{\\text{EUR}}\\,T}',
    shortcut: 'Higher-yielding currency trades at a forward DISCOUNT. USD rate > EUR rate → $F > S$ (more USD per EUR later).',
    legend: [['F', 'the forward rate (USD per EUR)', ''], ['S', 'the spot rate EUR/USD', function (p) { return n(p.S, 2); }], ['r_{\\text{USD}}', 'the rate of the quote currency (USD, on top)', function (p) { return n(p.rd, 1) + '%'; }],
      ['r_{\\text{EUR}}', 'the rate of the base currency (EUR, below)', function (p) { return n(p.rf, 1) + '%'; }], ['T', 'time in years', function (p) { return n(p.T, 2); }]],
    pitfalls: [{ tag: 'FX_DIRECTION', text: 'You put the EUR rate on top: the quote currency (USD) goes on top.', value: function (p) { return p.S * (1 + p.rf / 100 * p.T) / (1 + p.rd / 100 * p.T); } }],
    example: { p: { S: 1.1, rd: 4, rf: 2, T: 1 }, answer: 1.1216 }
  });

  // ======================= Rates =======================

  var PRINCIPALS = [1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000];
  D({
    id: 'rates.simple', family: 'fin', category: 'Rates', level: 1, target: 15, unit: '€', dp: 0, tol: EXACT, positive: true,
    params: function (rng) { return { N: pick(rng, PRINCIPALS), r: int(rng, 1, 8), T: int(rng, 1, 10) }; },
    prompt: function (p) { return p.N + ' € at ' + p.r + '% simple interest for ' + p.T + ' years. Interest earned?'; },
    answer: function (p) { return p.N * p.r / 100 * p.T; },
    steps: function (p) { return [S('I = ' + p.N + X + n(p.r / 100, 2) + X + p.T + ' = ' + n(p.N * p.r / 100 * p.T, 0))]; },
    formula: 'I = N × r × T', tex: 'I = N \\times r \\times T',
    shortcut: 'No compounding: the same interest every year.',
    legend: [['I', 'the interest earned', ''], ['N', 'the principal', function (p) { return p.N + ' €'; }], ['r', 'the annual rate as a decimal', function (p) { return p.r + '% = ' + n(p.r / 100, 2); }], ['T', 'the time in years', function (p) { return String(p.T); }]],
    pitfalls: [{ tag: 'UNIT', text: 'You used r in % (a whole number) instead of as a decimal: 100 times too big.', value: function (p) { return p.N * p.r * p.T; } }],
    example: { p: { N: 10000, r: 5, T: 3 }, answer: 1500 }
  });

  var FREQ = { 1: 'annually', 2: 'semi-annually', 4: 'quarterly', 12: 'monthly' };
  D({
    id: 'rates.compound.n', family: 'fin', category: 'Rates', level: 2, target: 30, unit: '€', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { N: pick(rng, [1000, 5000, 10000, 20000, 50000]), r: int(rng, 2, 10), n: pick(rng, [1, 2, 4, 12]), T: int(rng, 1, 5) }; },
    prompt: function (p) { return p.N + ' € at ' + p.r + '% compounded ' + FREQ[p.n] + ' for ' + p.T + ' years. Final value?'; },
    answer: function (p) { return p.N * Math.pow(1 + p.r / 100 / p.n, p.n * p.T); },
    steps: function (p) {
      var g = 1 + p.r / 100 / p.n;
      return [S('V = ' + p.N + X + '\\left(1 + ' + fr(n(p.r / 100, 2), p.n) + '\\right)^{' + p.n + X + p.T + '} = ' + p.N + X + n(g, 5) + '^{' + (p.n * p.T) + '}'), S('V = ' + n(p.N * Math.pow(g, p.n * p.T), 2))];
    },
    formula: 'V = N (1 + r/n)^(nT)', tex: 'V = N\\left(1 + \\frac{r}{n}\\right)^{nT}',
    shortcut: '$(1 + x)^k \\approx 1 + kx + \\frac{k(k-1)}{2}x^2$ for small $x$.',
    legend: [['V', 'the final value', ''], ['N', 'the principal', function (p) { return p.N + ' €'; }], ['r', 'the annual rate as a decimal', function (p) { return n(p.r / 100, 2); }],
      ['n', 'compounding periods per year', function (p) { return p.n + ' (' + FREQ[p.n] + ')'; }], ['T', 'the time in years', function (p) { return String(p.T); }]],
    pitfalls: [
      { tag: 'WRONG_FORMULA', text: 'You used continuous compounding (N e^(rT)): here the rate is paid in periods.', value: function (p) { return p.N * Math.exp(p.r / 100 * p.T); } },
      { tag: 'WRONG_FORMULA', text: 'You used simple interest, N (1 + rT): interest earns interest here.', value: function (p) { return p.N * (1 + p.r / 100 * p.T); } }],
    example: { p: { N: 10000, r: 8, n: 4, T: 2 }, answer: 11716.5938 }
  });

  D({
    id: 'rates.continuous', family: 'fin', category: 'Rates', level: 2, target: 30, unit: '€', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { N: pick(rng, [1000, 5000, 10000, 20000, 50000]), r: int(rng, 1, 10), T: int(rng, 1, 5) }; },
    prompt: function (p) { return p.N + ' € at ' + p.r + '% continuously compounded for ' + p.T + ' years. Final value?'; },
    answer: function (p) { return p.N * Math.exp(p.r / 100 * p.T); },
    steps: function (p) { return [S('rT = ' + n(p.r / 100, 2) + X + p.T + ' = ' + n(p.r / 100 * p.T, 2)), S('V = ' + p.N + X + 'e^{' + n(p.r / 100 * p.T, 2) + '} = ' + p.N + X + n(Math.exp(p.r / 100 * p.T), 5) + ' = ' + n(p.N * Math.exp(p.r / 100 * p.T), 2))]; },
    formula: 'V = N e^(rT)', tex: 'V = N\\,e^{rT}',
    shortcut: '$e^x \\approx 1 + x + \\frac{x^2}{2}$ for small $x$: $e^{0.1} \\approx 1.105$.',
    legend: [['V', 'the final value', ''], ['N', 'the principal', function (p) { return p.N + ' €'; }], ['r', 'the annual rate as a decimal', function (p) { return n(p.r / 100, 2); }],
      ['T', 'the time in years', function (p) { return String(p.T); }], ['e', "Euler's number, about 2.718", '2.718']],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You used annual compounding, N (1 + r)^T: here compounding is continuous.', value: function (p) { return p.N * Math.pow(1 + p.r / 100, p.T); } }],
    example: { p: { N: 10000, r: 5, T: 2 }, answer: 11051.7092 }
  });

  D({
    id: 'rates.perpetuity', family: 'fin', category: 'Rates', level: 2, target: 15, unit: '€', dp: 0, tol: REL, positive: true,
    params: function (rng) { return { C: pick(rng, [10, 20, 40, 50, 100, 200, 250, 500, 1000]), r: pick(rng, [2, 4, 5, 8, 10]) }; },
    prompt: function (p) { return 'A perpetuity pays ' + p.C + ' € a year forever, rate ' + p.r + '%. Value?'; },
    answer: function (p) { return p.C / (p.r / 100); },
    steps: function (p) { return [S('\\text{PV} = ' + fr(p.C, n(p.r / 100, 2)) + ' = ' + n(p.C / (p.r / 100), 0))]; },
    formula: 'PV = C / r', tex: '\\text{PV} = \\frac{C}{r}',
    shortcut: '100 a year at 5% = 2 000. Growing perpetuity: C/(r − g).',
    legend: [['\\text{PV}', 'the value today', ''], ['C', 'the annual payment', function (p) { return p.C + ' €'; }], ['r', 'the discount rate as a decimal', function (p) { return p.r + '% = ' + n(p.r / 100, 2); }]],
    pitfalls: [{ tag: 'UNIT', text: 'You divided by r in % (5 instead of 0.05): 100 times too small.', value: function (p) { return p.C / p.r; } }],
    example: { p: { C: 100, r: 5 }, answer: 2000 }
  });

  D({
    id: 'rates.growing.perp', family: 'fin', category: 'Rates', level: 2, target: 15, unit: '€', dp: 1, tol: REL, positive: true,
    params: function (rng) { return { C: pick(rng, [50, 100, 150, 200, 500]), r: int(rng, 5, 12), g: int(rng, 1, 4) }; },
    valid: function (p) { return p.g < p.r; },
    prompt: function (p) { return 'Pays ' + p.C + ' € next year, growing ' + p.g + '% a year forever; rate ' + p.r + '%. Value?'; },
    answer: function (p) { return p.C / ((p.r - p.g) / 100); },
    steps: function (p) { return [S('\\text{PV} = ' + fr(p.C, n(p.r / 100, 2) + ' - ' + n(p.g / 100, 2)) + ' = ' + fr(p.C, n((p.r - p.g) / 100, 2)) + ' = ' + n(p.C / ((p.r - p.g) / 100), 1))]; },
    formula: 'PV = C / (r − g)', tex: '\\text{PV} = \\frac{C}{r - g}',
    shortcut: 'Only defined for $g < r$: $\\frac{100}{8\\% - 3\\%} = 2\\,000$.',
    legend: [['\\text{PV}', 'the value today', ''], ['C', 'the FIRST payment (next year)', function (p) { return p.C + ' €'; }], ['r', 'the discount rate as a decimal', function (p) { return n(p.r / 100, 2); }],
      ['g', 'the growth rate of the payments', function (p) { return n(p.g / 100, 2); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You added the growth (r + g): growth makes the value bigger, so subtract it from r.', value: function (p) { return p.C / ((p.r + p.g) / 100); } }],
    example: { p: { C: 100, r: 8, g: 3 }, answer: 2000 }
  });

  D({
    id: 'rates.annuity3', family: 'fin', category: 'Rates', level: 3, target: 45, unit: '€', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { C: pick(rng, [100, 200, 250, 300, 500, 1000]), r: int(rng, 2, 10) }; },
    prompt: function (p) { return p.C + ' € paid at the end of each of the next 3 years, rate ' + p.r + '%. Present value?'; },
    answer: function (p) { var d = 1 + p.r / 100; return p.C * (1 / d + 1 / (d * d) + 1 / (d * d * d)); },
    steps: function (p) {
      var d = 1 + p.r / 100;
      return [S('\\text{PV} = ' + fr(p.C, n(d, 2)) + ' + ' + fr(p.C, n(d, 2) + '^2') + ' + ' + fr(p.C, n(d, 2) + '^3')), S('= ' + n(p.C / d, 2) + ' + ' + n(p.C / (d * d), 2) + ' + ' + n(p.C / (d * d * d), 2) + ' = ' + n(p.C * (1 / d + 1 / (d * d) + 1 / (d * d * d)), 2))];
    },
    formula: 'PV = Σ C / (1 + r)^t, t = 1..3', tex: '\\text{PV} = \\sum_{t=1}^{3} \\frac{C}{(1 + r)^t}',
    shortcut: '$C \\cdot \\frac{1 - (1+r)^{-n}}{r}$. Sanity: slightly less than 3C.',
    legend: [['\\text{PV}', 'the value today', ''], ['C', 'the yearly payment', function (p) { return p.C + ' €'; }], ['r', 'the discount rate as a decimal', function (p) { return n(p.r / 100, 2); }], ['t', 'the year of each payment', '1, 2, 3']],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You added the payments without discounting (3C).', value: function (p) { return 3 * p.C; } }],
    example: { p: { C: 100, r: 5 }, answer: 272.3248 }
  });

  D({
    id: 'rates.forward.rate', family: 'fin', category: 'Rates', level: 3, target: 45, unit: '%', dp: 3, tol: REL,
    params: function (rng) { return { r1: grid(rng, 1, 6, 0.5), r2: grid(rng, 1, 6, 0.5) }; },
    valid: function (p) { return Math.abs(p.r2 - p.r1) >= 0.5; },
    prompt: function (p) { return '1-year spot ' + n(p.r1, 1) + '%, 2-year spot ' + n(p.r2, 1) + '%. 1-year rate in 1 year (1y1y)?'; },
    answer: function (p) { return (Math.pow(1 + p.r2 / 100, 2) / (1 + p.r1 / 100) - 1) * 100; },
    steps: function (p) {
      var a = Math.pow(1 + p.r2 / 100, 2), b = 1 + p.r1 / 100;
      return [S('f = ' + fr('(1 + ' + n(p.r2 / 100, 3) + ')^2', '1 + ' + n(p.r1 / 100, 3)) + ' - 1 = ' + fr(n(a, 5), n(b, 3)) + ' - 1 = ' + n(a / b - 1, 5)), S('f = ' + n((a / b - 1) * 100, 3) + '\\%')];
    },
    formula: 'f = (1 + r2)² / (1 + r1) − 1', tex: 'f = \\frac{(1 + r_2)^2}{1 + r_1} - 1',
    shortcut: '$f \\approx 2r_2 - r_1$: 3% and 4% give about 5%.',
    legend: [['f', 'the forward rate for year 2', ''], ['r_1', 'the 1-year spot rate', function (p) { return n(p.r1, 1) + '%'; }], ['r_2', 'the 2-year spot rate', function (p) { return n(p.r2, 1) + '%'; }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You averaged the two spot rates: the 2-year rate already contains year 1.', value: function (p) { return (p.r1 + p.r2) / 2; } }],
    example: { p: { r1: 3, r2: 4 }, answer: 5.0097 }
  });

  D({
    id: 'rates.act360', family: 'fin', category: 'Rates', level: 2, target: 30, unit: '€', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { N: pick(rng, [100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000]), r: grid(rng, 1, 5, 0.5), d: pick(rng, [30, 60, 90, 91, 180, 182]) }; },
    prompt: function (p) { return 'Deposit of ' + p.N + ' € at ' + n(p.r, 1) + '% for ' + p.d + ' days, Act/360. Interest?'; },
    answer: function (p) { return p.N * p.r / 100 * p.d / 360; },
    steps: function (p) { return [S('I = ' + p.N + X + n(p.r / 100, 3) + X + fr(p.d, 360) + ' = ' + n(p.N * p.r / 100 * p.d / 360, 2))]; },
    formula: 'I = N × r × d / 360', tex: 'I = N \\times r \\times \\frac{d}{360}',
    shortcut: '90 days Act/360 = exactly a quarter of the annual rate.',
    legend: [['I', 'the interest', ''], ['N', 'the deposit', function (p) { return p.N + ' €'; }], ['r', 'the annual rate as a decimal', function (p) { return n(p.r / 100, 3); }],
      ['d', 'the actual number of days', function (p) { return String(p.d); }], ['360', 'the money-market year convention (EUR, USD)', '360']],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You used a 365-day year: EUR and USD money markets use 360.', value: function (p) { return p.N * p.r / 100 * p.d / 365; } }],
    example: { p: { N: 1e6, r: 4, d: 90 }, answer: 10000 }
  });

  // ======================= Bonds =======================

  D({
    id: 'bonds.zero.price', family: 'fin', category: 'Bonds', level: 1, target: 20, unit: '', dp: 3, tol: REL, positive: true,
    params: function (rng) { return { T: int(rng, 1, 5), y: grid(rng, 1, 8, 0.5) }; },
    prompt: function (p) { return 'Zero-coupon bond, face 100, ' + p.T + ' years, yield ' + n(p.y, 1) + '%. Price?'; },
    answer: function (p) { return 100 / Math.pow(1 + p.y / 100, p.T); },
    steps: function (p) { return [S('P = ' + fr(100, '(1 + ' + n(p.y / 100, 3) + ')^{' + p.T + '}') + ' = ' + fr(100, n(Math.pow(1 + p.y / 100, p.T), 5)) + ' = ' + n(100 / Math.pow(1 + p.y / 100, p.T), 3))]; },
    formula: 'P = 100 / (1 + y)^T', tex: 'P = \\frac{100}{(1 + y)^T}',
    shortcut: 'Below 100 whenever $y > 0$.',
    legend: [['P', 'the price today (per 100 face)', ''], ['100', 'the face value repaid at maturity', '100'], ['y', 'the yield as a decimal', function (p) { return n(p.y / 100, 3); }], ['T', 'the years to maturity', function (p) { return String(p.T); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You used 100 (1 − yT): a straight-line discount, not compounding.', value: function (p) { return 100 * (1 - p.y / 100 * p.T); } }],
    example: { p: { T: 2, y: 5 }, answer: 90.7029 }
  });

  D({
    id: 'bonds.current.yield', family: 'fin', category: 'Bonds', level: 1, target: 15, unit: '%', dp: 3, tol: REL, positive: true,
    params: function (rng) { return { c: grid(rng, 1, 8, 0.5), P: int(rng, 85, 115) }; },
    valid: function (p) { return p.P !== 100; },
    prompt: function (p) { return 'Coupon ' + n(p.c, 1) + '% (face 100), price ' + p.P + '. Current yield?'; },
    answer: function (p) { return p.c / p.P * 100; },
    steps: function (p) { return [S('\\text{CY} = ' + fr(n(p.c, 1), p.P) + X + '100 = ' + n(p.c / p.P * 100, 3) + '\\%')]; },
    formula: 'CY = c / P × 100', tex: '\\text{CY} = \\frac{c}{P} \\times 100',
    shortcut: 'Price below 100 → current yield above the coupon.',
    legend: [['\\text{CY}', 'the current yield', ''], ['c', 'the annual coupon per 100 face', function (p) { return n(p.c, 1); }], ['P', 'the market price', function (p) { return String(p.P); }]],
    pitfalls: [{ tag: 'RATIO_INVERTED', text: 'You divided the price by the coupon (P / c): coupon goes on top.', value: function (p) { return p.P / p.c; } }],
    example: { p: { c: 5, P: 95 }, answer: 5.2632 }
  });

  D({
    id: 'bonds.duration.change', family: 'fin', category: 'Bonds', level: 2, target: 20, unit: '%', dp: 2, tol: REL,
    params: function (rng) { return { D: int(rng, 1, 20), x: 5 * int(rng, 1, 20) }; },
    prompt: function (p) { return 'Modified duration ' + p.D + '. Yields rise ' + p.x + ' bp. Approximate % price change?'; },
    answer: function (p) { return -p.D * p.x / 100; },
    steps: function (p) { return [S('\\Delta y = ' + p.x + '\\text{ bp} = ' + n(p.x / 10000, 4)), S('\\frac{\\Delta P}{P} \\approx -' + p.D + X + n(p.x / 10000, 4) + ' = ' + n(-p.D * p.x / 10000, 4) + ' = ' + n(-p.D * p.x / 100, 2) + '\\%')]; },
    formula: 'ΔP/P ≈ −D × Δy', tex: '\\frac{\\Delta P}{P} \\approx -D \\times \\Delta y',
    shortcut: 'D × bp / 100 gives %: duration 7, +50 bp → −3.5%.',
    legend: [['\\Delta P/P', 'the relative price change', ''], ['D', 'the modified duration', function (p) { return String(p.D); }], ['\\Delta y', 'the yield change as a decimal', function (p) { return p.x + ' bp = ' + n(p.x / 10000, 4); }]],
    pitfalls: [
      { tag: 'SIGN', text: 'Prices fall when yields rise: the answer is negative.', value: function (p) { return p.D * p.x / 100; } },
      { tag: 'UNIT', text: 'Off by ×100: check bp against %.', value: function (p) { return -p.D * p.x; } }],
    example: { p: { D: 7, x: 50 }, answer: -3.5 }
  });

  D({
    id: 'bonds.dv01', family: 'fin', category: 'Bonds', level: 2, target: 30, unit: '€', dp: 0, tol: REL, positive: true,
    params: function (rng) { return { N: pick(rng, [1e6, 1e7, 1e8]), P: int(rng, 90, 110), D: int(rng, 1, 15) }; },
    prompt: function (p) { return 'Notional ' + big(p.N) + ' €, price ' + p.P + ', modified duration ' + p.D + '. DV01 in € per bp?'; },
    answer: function (p) { return p.D * p.P / 100 * p.N * 0.0001; },
    steps: function (p) { return [S('\\text{DV01} = ' + p.D + X + fr(p.P, 100) + X + p.N + X + '0.0001'), S('= ' + n(p.D * p.P / 100, 2) + X + n(p.N * 0.0001, 0) + ' = ' + n(p.D * p.P / 100 * p.N * 0.0001, 0))]; },
    formula: 'DV01 = D × P/100 × N × 0.0001', tex: '\\text{DV01} = D \\times \\frac{P}{100} \\times N \\times 0.0001',
    shortcut: 'Market value × $D$ / 10 000: 10m at par and $D = 5$ → 5 000 € per bp.',
    legend: [['\\text{DV01}', 'the € change for a 1 bp move in yield', ''], ['D', 'the modified duration', function (p) { return String(p.D); }], ['P/100', 'the price as a fraction of face', function (p) { return p.P + '/100'; }],
      ['N', 'the notional', function (p) { return big(p.N) + ' €'; }], ['0.0001', 'one basis point', '0.0001']],
    pitfalls: [
      { tag: 'UNIT', text: 'You forgot the ×0.0001: that is the change for a 100% move.', value: function (p) { return p.D * p.P / 100 * p.N; } },
      { tag: 'UNIT', text: 'You used ×0.01: that is 1%, not 1 bp.', value: function (p) { return p.D * p.P / 100 * p.N * 0.01; } }],
    example: { p: { N: 1e7, P: 100, D: 5 }, answer: 5000 }
  });
})();
