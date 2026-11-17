/*
 * finance-sd2.js — Superday templates, part 2: Equities, Options, Derivatives, Risk, Bank ratios, Operations, Probability
 * (32 templates). Same format as finance-sd1.js. The spec's var-scale, var-normal, nii (and the other six duplicates) are
 * the existing templates, whose teaching data is in finance-meta.js.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var F = AT.Finance || require('./finance-core.js');
  var int = F.int, pick = F.pick, grid = F.grid, D = F.define, big = F.big;
  function S(tex) { return '$' + tex + '$.'; }
  function fr(a, b) { return '\\frac{' + a + '}{' + b + '}'; }
  var X = ' \\times ';
  function n(x, dp) { return F.fmt(x, dp === undefined ? 4 : dp); }
  var EXACT = function () { return { type: 'exact' }; };
  var REL = function () { return { type: 'rel', v: 0.005 }; };
  var REL1 = function () { return { type: 'rel', v: 0.01 }; };
  var ABS4 = function () { return { type: 'abs', v: 0.0001 }; };
  function pl(s) { return n(s, 2); }

  // ======================= Equities =======================

  var QTY = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  function moveParams(rng) { var P0 = int(rng, 10, 500), d = int(rng, 1, 20) * (int(rng, 0, 1) ? 1 : -1); return { q: pick(rng, QTY), P0: P0, P1: P0 + d }; }
  var posValid = function (p) { return p.P1 >= 10; };

  D({
    id: 'eq.long.pnl', family: 'fin', category: 'Equities', level: 1, target: 15, unit: '€', dp: 0, tol: EXACT, positive: false,
    params: moveParams, valid: posValid,
    prompt: function (p) { return 'Long ' + p.q + ' shares bought at ' + p.P0 + ', now ' + p.P1 + '. P&L?'; },
    answer: function (p) { return p.q * (p.P1 - p.P0); },
    steps: function (p) { return [S('\\text{P&L} = ' + p.q + X + '(' + p.P1 + ' - ' + p.P0 + ') = ' + p.q + X + (p.P1 - p.P0) + ' = ' + n(p.q * (p.P1 - p.P0), 0))]; },
    formula: 'P&L = q (P1 − P0)', tex: '\\text{P&L} = q\\,(P_1 - P_0)',
    shortcut: 'Long gains when the price rises.',
    legend: [['q', 'number of shares', function (p) { return String(p.q); }], ['P_0', 'entry price', function (p) { return String(p.P0); }], ['P_1', 'current price', function (p) { return String(p.P1); }]],
    pitfalls: [{ tag: 'SIGN', text: 'You used q(P0 − P1): a long position gains when the price goes up.', value: function (p) { return p.q * (p.P0 - p.P1); } }],
    example: { p: { q: 200, P0: 50, P1: 53 }, answer: 600 }
  });

  D({
    id: 'eq.short.pnl', family: 'fin', category: 'Equities', level: 1, target: 15, unit: '€', dp: 0, tol: EXACT, positive: false,
    params: moveParams, valid: posValid,
    prompt: function (p) { return 'Short ' + p.q + ' shares at ' + p.P0 + ', now ' + p.P1 + '. P&L?'; },
    answer: function (p) { return p.q * (p.P0 - p.P1); },
    steps: function (p) { return [S('\\text{P&L} = ' + p.q + X + '(' + p.P0 + ' - ' + p.P1 + ') = ' + p.q + X + (p.P0 - p.P1) + ' = ' + n(p.q * (p.P0 - p.P1), 0))]; },
    formula: 'P&L = q (P0 − P1)', tex: '\\text{P&L} = q\\,(P_0 - P_1)',
    shortcut: 'Short gains when the price falls; the loss is unlimited in theory.',
    legend: [['q', 'shares sold short', function (p) { return String(p.q); }], ['P_0', 'price sold at', function (p) { return String(p.P0); }], ['P_1', 'price to buy back', function (p) { return String(p.P1); }]],
    pitfalls: [{ tag: 'SIGN', text: 'You used q(P1 − P0): a short position gains when the price goes down.', value: function (p) { return p.q * (p.P1 - p.P0); } }],
    example: { p: { q: 100, P0: 80, P1: 86 }, answer: -600 }
  });

  var LOTS = [10, 20, 50, 100, 200, 300, 500, 1000];
  D({
    id: 'eq.avg.cost', family: 'fin', category: 'Equities', level: 2, target: 30, unit: '€', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { q1: pick(rng, LOTS), q2: pick(rng, LOTS), p1: int(rng, 10, 200), p2: int(rng, 10, 200) }; },
    prompt: function (p) { return 'Buy ' + p.q1 + ' at ' + p.p1 + ', then ' + p.q2 + ' at ' + p.p2 + '. Average cost per share?'; },
    answer: function (p) { return (p.q1 * p.p1 + p.q2 * p.p2) / (p.q1 + p.q2); },
    steps: function (p) { return [S('\\bar p = ' + fr(p.q1 + X + p.p1 + ' + ' + p.q2 + X + p.p2, p.q1 + ' + ' + p.q2) + ' = ' + fr(p.q1 * p.p1 + p.q2 * p.p2, p.q1 + p.q2) + ' = ' + pl((p.q1 * p.p1 + p.q2 * p.p2) / (p.q1 + p.q2)))]; },
    formula: 'p̄ = (q1 p1 + q2 p2) / (q1 + q2)', tex: '\\bar p = \\frac{q_1 p_1 + q_2 p_2}{q_1 + q_2}',
    shortcut: 'Weighted, not simple, average: closer to the price of the bigger lot.',
    legend: [['\\bar p', 'the weighted average cost per share', ''], ['q_1, q_2', 'quantities bought', function (p) { return p.q1 + ' and ' + p.q2; }], ['p_1, p_2', 'prices paid', function (p) { return p.p1 + ' and ' + p.p2; }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You took the simple average (p1 + p2) / 2: the lots have different sizes.', value: function (p) { return (p.p1 + p.p2) / 2; } }],
    example: { p: { q1: 100, p1: 40, q2: 300, p2: 50 }, answer: 47.5 }
  });

  D({
    id: 'eq.pe', family: 'fin', category: 'Equities', level: 1, target: 20, unit: '', dp: 2, tol: REL, positive: true,
    params: function (rng) { var E = pick(rng, [1, 2, 3, 4, 5, 6, 8, 10, 12]), pe = int(rng, 5, 40); return { E: E, P: E * pe }; },
    valid: function (p) { return p.P >= 10 && p.P <= 500; },
    prompt: function (p) { return 'Share price ' + p.P + ', earnings per share ' + p.E + '. P/E ratio?'; },
    answer: function (p) { return p.P / p.E; },
    steps: function (p) { return [S('P/E = ' + fr(p.P, p.E) + ' = ' + n(p.P / p.E, 2))]; },
    formula: 'P/E = Price / EPS', tex: 'P/E = \\frac{\\text{Price}}{\\text{EPS}}',
    shortcut: 'P/E 20 = you pay 20 years of current earnings. EPS = Price / (P/E).',
    legend: [['\\text{Price}', 'the share price', function (p) { return String(p.P); }], ['\\text{EPS}', 'earnings per share = net income / shares', function (p) { return String(p.E); }]],
    pitfalls: [{ tag: 'RATIO_INVERTED', text: 'You computed EPS / Price: that is the earnings yield.', value: function (p) { return p.E / p.P; } }],
    example: { p: { P: 120, E: 6 }, answer: 20 }
  });

  D({
    id: 'eq.total.return', family: 'fin', category: 'Equities', level: 2, target: 20, unit: '%', dp: 2,
    tol: function () { return { type: 'rel', v: 0.005, abs: 0.05 }; },
    params: function (rng) { return { P0: int(rng, 10, 200), d: int(rng, -10, 15), D: pick(rng, [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) }; },
    valid: function (p) { var r = (p.d + p.D) / p.P0 * 100; return p.P0 + p.d >= 5 && Math.abs(r) >= 1; },
    prompt: function (p) { return 'Bought at ' + p.P0 + ', now ' + (p.P0 + p.d) + ', dividend ' + n(p.D, 1) + ' received. Total return in %?'; },
    answer: function (p) { return (p.d + p.D) / p.P0 * 100; },
    steps: function (p) { return [S('R = ' + fr((p.P0 + p.d) + ' - ' + p.P0 + ' + ' + n(p.D, 1), p.P0) + X + '100 = ' + fr(n(p.d + p.D, 1), p.P0) + X + '100 = ' + n((p.d + p.D) / p.P0 * 100, 2) + '\\%')]; },
    formula: 'R = (P1 − P0 + D) / P0 × 100', tex: 'R = \\frac{P_1 - P_0 + D}{P_0} \\times 100',
    shortcut: 'Price return + dividend yield, both on $P_0$.',
    legend: [['P_0', 'the purchase price', function (p) { return String(p.P0); }], ['P_1', 'the price now', function (p) { return String(p.P0 + p.d); }], ['D', 'dividends received per share', function (p) { return n(p.D, 1); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You forgot the dividend: the total return counts it.', value: function (p) { return p.d / p.P0 * 100; } }],
    example: { p: { P0: 50, d: 4, D: 1 }, answer: 10 }
  });

  D({
    id: 'eq.leverage.return', family: 'fin', category: 'Equities', level: 2, target: 30, unit: '%', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { m: pick(rng, [20, 25, 50]), x: int(rng, 1, 20) }; },
    prompt: function (p) { return 'You put up ' + p.m + '% margin (equity) and the stock rises ' + p.x + '%. Return on your equity (ignore financing cost)?'; },
    answer: function (p) { return p.x / (p.m / 100); },
    steps: function (p) { return [S('R_E = ' + fr(p.x + '\\%', n(p.m / 100, 2)) + ' = ' + n(p.x / (p.m / 100), 2) + '\\%')]; },
    formula: 'R_E = x / m', tex: 'R_E = \\frac{x}{m}',
    shortcut: 'Leverage = 1/m: 25% margin → 4× leverage, a 5% move becomes 20% (both ways).',
    legend: [['R_E', 'the return on the equity you invested', ''], ['x', 'the stock return', function (p) { return p.x + '%'; }], ['m', 'equity as a fraction of the position', function (p) { return p.m + '% = ' + n(p.m / 100, 2); }]],
    pitfalls: [{ tag: 'RATIO_INVERTED', text: 'You multiplied by m instead of dividing: leverage makes the move bigger.', value: function (p) { return p.x * p.m / 100; } }],
    example: { p: { m: 25, x: 5 }, answer: 20 }
  });

  // ======================= Options =======================

  function optParams(rng) { var K = 5 * int(rng, 10, 30), S0 = K + int(rng, -30, 30); return { K: K, S: S0, c: grid(rng, 1, 10, 0.5) }; }
  D({
    id: 'opt.call.pnl', family: 'fin', category: 'Options', level: 1, target: 15, unit: '€', dp: 1, tol: EXACT, positive: false,
    params: optParams,
    prompt: function (p) { return 'Long call, strike ' + p.K + ', premium ' + n(p.c, 1) + '. At expiry the stock is ' + p.S + '. P&L per share?'; },
    answer: function (p) { return Math.max(p.S - p.K, 0) - p.c; },
    steps: function (p) { return [S('\\max(S - K, 0) = \\max(' + p.S + ' - ' + p.K + ', 0) = ' + Math.max(p.S - p.K, 0)), S('\\text{P&L} = ' + Math.max(p.S - p.K, 0) + ' - ' + n(p.c, 1) + ' = ' + n(Math.max(p.S - p.K, 0) - p.c, 1))]; },
    formula: 'P&L = max(S − K, 0) − c', tex: '\\text{P&L} = \\max(S - K, 0) - c',
    shortcut: 'Max loss = premium. Breakeven K + c.',
    legend: [['S', 'the stock price at expiry', function (p) { return String(p.S); }], ['K', 'the strike: the price you may buy at', function (p) { return String(p.K); }], ['c', 'the premium paid', function (p) { return n(p.c, 1); }],
      ['\\max(S - K, 0)', 'the payoff: exercise only if S > K', function (p) { return String(Math.max(p.S - p.K, 0)); }]],
    pitfalls: [
      { tag: 'WRONG_FORMULA', text: 'You forgot the premium: the P&L is payoff minus what you paid.', value: function (p) { return Math.max(p.S - p.K, 0); } },
      { tag: 'WRONG_FORMULA', text: 'You used the put payoff max(K − S, 0).', value: function (p) { return Math.max(p.K - p.S, 0) - p.c; } }],
    example: { p: { K: 100, c: 4, S: 110 }, answer: 6 }
  });

  D({
    id: 'opt.put.pnl', family: 'fin', category: 'Options', level: 1, target: 15, unit: '€', dp: 1, tol: EXACT, positive: false,
    params: optParams,
    prompt: function (p) { return 'Long put, strike ' + p.K + ', premium ' + n(p.c, 1) + '. At expiry the stock is ' + p.S + '. P&L per share?'; },
    answer: function (p) { return Math.max(p.K - p.S, 0) - p.c; },
    steps: function (p) { return [S('\\max(K - S, 0) = \\max(' + p.K + ' - ' + p.S + ', 0) = ' + Math.max(p.K - p.S, 0)), S('\\text{P&L} = ' + Math.max(p.K - p.S, 0) + ' - ' + n(p.c, 1) + ' = ' + n(Math.max(p.K - p.S, 0) - p.c, 1))]; },
    formula: 'P&L = max(K − S, 0) − c', tex: '\\text{P&L} = \\max(K - S, 0) - c',
    shortcut: 'A put gains when the stock falls. Breakeven K − c.',
    legend: [['S', 'the stock price at expiry', function (p) { return String(p.S); }], ['K', 'the strike: the price you may sell at', function (p) { return String(p.K); }], ['c', 'the premium paid', function (p) { return n(p.c, 1); }],
      ['\\max(K - S, 0)', 'the payoff: exercise only if S < K', function (p) { return String(Math.max(p.K - p.S, 0)); }]],
    pitfalls: [
      { tag: 'WRONG_FORMULA', text: 'You used the call payoff max(S − K, 0).', value: function (p) { return Math.max(p.S - p.K, 0) - p.c; } },
      { tag: 'WRONG_FORMULA', text: 'You forgot the premium.', value: function (p) { return Math.max(p.K - p.S, 0); } }],
    example: { p: { K: 100, c: 3, S: 92 }, answer: 5 }
  });

  D({
    id: 'opt.breakeven', family: 'fin', category: 'Options', level: 1, target: 10, unit: '€', dp: 1, tol: EXACT, positive: true,
    params: function (rng) { return { side: pick(rng, ['call', 'put']), K: 5 * int(rng, 10, 30), c: grid(rng, 1, 10, 0.5) }; },
    prompt: function (p) { return 'Long ' + p.side + ', strike ' + p.K + ', premium ' + n(p.c, 1) + '. Breakeven stock price at expiry?'; },
    answer: function (p) { return p.side === 'call' ? p.K + p.c : p.K - p.c; },
    steps: function (p) { return [S(p.side === 'call' ? 'K + c = ' + p.K + ' + ' + n(p.c, 1) + ' = ' + n(p.K + p.c, 1) : 'K - c = ' + p.K + ' - ' + n(p.c, 1) + ' = ' + n(p.K - p.c, 1))]; },
    formula: 'call: K + c, put: K − c', tex: '\\text{call: } K + c,\\qquad \\text{put: } K - c',
    shortcut: 'The payoff must repay the premium.',
    legend: [['K', 'the strike', function (p) { return String(p.K); }], ['c', 'the premium', function (p) { return n(p.c, 1); }]],
    pitfalls: [{ tag: 'SIGN', text: 'Wrong side: a call breaks even above the strike (K + c), a put below it (K − c).', value: function (p) { return p.side === 'call' ? p.K - p.c : p.K + p.c; } }],
    example: { p: { side: 'call', K: 100, c: 4 }, answer: 104 }
  });

  D({
    id: 'opt.time.value', family: 'fin', category: 'Options', level: 1, target: 15, unit: '€', dp: 1, tol: EXACT, positive: true,
    params: function (rng) { var K = 5 * int(rng, 10, 30), S0 = K + int(rng, -10, 10); return { K: K, S: S0, tv: grid(rng, 0.5, 6, 0.5) }; },
    prompt: function (p) { return 'Call strike ' + p.K + ', stock ' + p.S + ', premium ' + n(p.tv + Math.max(p.S - p.K, 0), 1) + '. Time value?'; },
    answer: function (p) { return p.tv; },
    steps: function (p) { var iv = Math.max(p.S - p.K, 0); return [S('\\text{intrinsic} = \\max(' + p.S + ' - ' + p.K + ', 0) = ' + iv), S('\\text{TV} = c - \\text{intrinsic} = ' + n(p.tv + iv, 1) + ' - ' + iv + ' = ' + n(p.tv, 1))]; },
    formula: 'TV = c − max(S − K, 0)', tex: '\\text{TV} = c - \\max(S - K, 0)',
    shortcut: 'Premium = intrinsic + time value. An out-of-the-money option is all time value.',
    legend: [['c', 'the option premium', function (p) { return n(p.tv + Math.max(p.S - p.K, 0), 1); }], ['\\max(S - K, 0)', 'the intrinsic value', function (p) { return String(Math.max(p.S - p.K, 0)); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You answered the intrinsic value instead of the time value.', value: function (p) { return Math.max(p.S - p.K, 0); } }],
    example: { p: { K: 100, S: 105, tv: 3 }, answer: 3 }
  });

  D({
    id: 'opt.straddle', family: 'fin', category: 'Options', level: 2, target: 30, unit: '€', dp: 1, tol: EXACT, positive: false,
    params: function (rng) { var K = 5 * int(rng, 10, 30); return { K: K, S: K + int(rng, -30, 30), c: grid(rng, 1, 8, 0.5), pp: grid(rng, 1, 8, 0.5) }; },
    prompt: function (p) { return 'Long straddle at ' + p.K + ' (call ' + n(p.c, 1) + ' + put ' + n(p.pp, 1) + '). Stock at expiry ' + p.S + '. P&L?'; },
    answer: function (p) { return Math.abs(p.S - p.K) - (p.c + p.pp); },
    steps: function (p) { return [S('|S - K| = |' + p.S + ' - ' + p.K + '| = ' + Math.abs(p.S - p.K)), S('\\text{P&L} = ' + Math.abs(p.S - p.K) + ' - (' + n(p.c, 1) + ' + ' + n(p.pp, 1) + ') = ' + n(Math.abs(p.S - p.K) - p.c - p.pp, 1))]; },
    formula: 'P&L = |S − K| − (c + p)', tex: '\\text{P&L} = |S - K| - (c + p)',
    shortcut: 'You bet on a big move in either direction. Breakevens K ± (c + p).',
    legend: [['|S - K|', 'the payoff: one of the two options is in the money', function (p) { return String(Math.abs(p.S - p.K)); }], ['c + p', 'the total premium paid', function (p) { return n(p.c, 1) + ' + ' + n(p.pp, 1); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You forgot one of the two premiums: a straddle costs call + put.', value: function (p) { return Math.abs(p.S - p.K) - p.c; } }],
    example: { p: { K: 100, c: 5, pp: 4, S: 115 }, answer: 6 }
  });

  D({
    id: 'opt.parity', family: 'fin', category: 'Options', level: 2, target: 30, unit: '€', dp: 1, tol: EXACT, positive: true,
    params: function (rng) { var K = 5 * int(rng, 10, 30), S0 = K + int(rng, -10, 10), P = grid(rng, 1, 10, 0.5); return { K: K, S: S0, P: P, C: P + S0 - K }; },
    valid: function (p) { return p.C > 0; },
    prompt: function (p) { return 'Call ' + n(p.C, 1) + ', stock ' + p.S + ', strike ' + p.K + ', rates ≈ 0. Put price (same strike, expiry)?'; },
    answer: function (p) { return p.C - p.S + p.K; },
    steps: function (p) { return [S('C - P = S - K \\;\\Rightarrow\\; P = C - S + K'), S('P = ' + n(p.C, 1) + ' - ' + p.S + ' + ' + p.K + ' = ' + n(p.C - p.S + p.K, 1))]; },
    formula: 'C − P = S − K, so P = C − S + K', tex: 'C - P = S - K \\;\\Rightarrow\\; P = C - S + K',
    shortcut: 'With rates: $K$ becomes $K\\,e^{-rT}$. Long call − long put = long forward.',
    legend: [['C', 'the call price', function (p) { return n(p.C, 1); }], ['P', 'the put price', ''], ['S', 'the stock price', function (p) { return String(p.S); }], ['K', 'the strike', function (p) { return String(p.K); }]],
    pitfalls: [{ tag: 'SIGN', text: 'You used C + S − K: the call minus the put is the forward, S − K.', value: function (p) { return p.C + p.S - p.K; } }],
    example: { p: { C: 7, S: 102, K: 100, P: 5 }, answer: 5 }
  });

  D({
    id: 'opt.delta.pnl', family: 'fin', category: 'Options', level: 2, target: 20, unit: '€', dp: 0, tol: REL, positive: true,
    params: function (rng) { return { q: pick(rng, [1, 2, 5, 10, 20, 25, 50]), d: grid(rng, 0.1, 0.9, 0.05), dS: grid(rng, 0.5, 5, 0.5) }; },
    prompt: function (p) { return p.q + ' calls, delta ' + n(p.d, 2) + ', multiplier 100. Stock moves +' + n(p.dS, 1) + '. Approximate P&L?'; },
    answer: function (p) { return p.d * p.dS * p.q * 100; },
    steps: function (p) { return [S('\\text{P&L} \\approx ' + n(p.d, 2) + X + n(p.dS, 1) + X + p.q + X + '100 = ' + n(p.d * p.dS * p.q * 100, 0))]; },
    formula: 'P&L ≈ Δ × ΔS × q × m', tex: '\\text{P&L} \\approx \\Delta \\times \\Delta S \\times q \\times m',
    shortcut: 'An at-the-money call has delta of about 0.5.',
    legend: [['\\Delta', 'delta: the option price change per 1 € stock move', function (p) { return n(p.d, 2); }], ['\\Delta S', 'the stock move', function (p) { return n(p.dS, 1); }], ['q', 'the number of contracts', function (p) { return String(p.q); }], ['m', 'shares per contract', '100']],
    pitfalls: [{ tag: 'UNIT', text: 'You forgot the multiplier: one contract covers 100 shares.', value: function (p) { return p.d * p.dS * p.q; } }],
    example: { p: { q: 10, d: 0.5, dS: 2 }, answer: 1000 }
  });

  // ======================= Derivatives =======================

  D({
    id: 'der.forward.price', family: 'fin', category: 'Derivatives', level: 2, target: 20, unit: '€', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { S: int(rng, 50, 200), r: int(rng, 1, 6), T: pick(rng, [0.5, 1, 2]) }; },
    prompt: function (p) { return 'Stock ' + p.S + ', no dividend, rate ' + p.r + '%, $T = ' + n(p.T, 1) + '$ year. Forward price (annual compounding)?'; },
    answer: function (p) { return p.S * Math.pow(1 + p.r / 100, p.T); },
    steps: function (p) { return [S('F = ' + p.S + X + '(1 + ' + n(p.r / 100, 2) + ')^{' + n(p.T, 1) + '} = ' + p.S + X + n(Math.pow(1 + p.r / 100, p.T), 5) + ' = ' + n(p.S * Math.pow(1 + p.r / 100, p.T), 2))]; },
    formula: 'F = S (1 + r)^T', tex: 'F = S\\,(1 + r)^T',
    shortcut: 'Cost of carry: buy now with borrowed money and hold.',
    legend: [['S', 'the spot price', function (p) { return String(p.S); }], ['r', 'the funding rate', function (p) { return n(p.r / 100, 2); }], ['T', 'the years to delivery', function (p) { return n(p.T, 1); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You discounted, S / (1 + r)^T: the forward is above spot, you pay to carry the stock.', value: function (p) { return p.S / Math.pow(1 + p.r / 100, p.T); } }],
    example: { p: { S: 100, r: 5, T: 1 }, answer: 105 }
  });

  D({
    id: 'der.futures.pnl', family: 'fin', category: 'Derivatives', level: 2, target: 20, unit: '€', dp: 0, tol: EXACT, positive: false,
    params: function (rng) { var F0 = 10 * int(rng, 400, 500); return { n: int(rng, 1, 50), m: pick(rng, [10, 25, 50, 100]), F0: F0, F1: F0 + 10 * int(rng, -8, 8) }; },
    valid: function (p) { return p.F1 !== p.F0; },
    prompt: function (p) { return 'Long ' + p.n + ' futures, multiplier ' + p.m + ', price moves from ' + p.F0 + ' to ' + p.F1 + '. P&L (= variation margin)?'; },
    answer: function (p) { return p.n * p.m * (p.F1 - p.F0); },
    steps: function (p) { return [S('\\text{P&L} = ' + p.n + X + p.m + X + '(' + p.F1 + ' - ' + p.F0 + ') = ' + n(p.n * p.m * (p.F1 - p.F0), 0))]; },
    formula: 'P&L = n × m × (F1 − F0)', tex: '\\text{P&L} = n \\times m \\times (F_1 - F_0)',
    shortcut: 'Settled daily through the CCP: this is the variation margin paid or received.',
    legend: [['n', 'the number of contracts', function (p) { return String(p.n); }], ['m', 'the multiplier (€ per index point)', function (p) { return String(p.m); }], ['F_0, F_1', 'the futures prices', function (p) { return p.F0 + ' → ' + p.F1; }]],
    pitfalls: [{ tag: 'UNIT', text: 'You forgot the multiplier: each point is worth m €.', value: function (p) { return p.n * (p.F1 - p.F0); } }],
    example: { p: { n: 5, m: 10, F0: 4800, F1: 4830 }, answer: 1500 }
  });

  D({
    id: 'der.irs.net', family: 'fin', category: 'Derivatives', level: 2, target: 30, unit: '€', dp: 0, tol: REL, positive: false,
    params: function (rng) { return { N: pick(rng, [5e6, 1e7, 2.5e7, 5e7, 1e8]), k: grid(rng, 1, 5, 0.25), f: grid(rng, 1, 5, 0.25), tau: pick(rng, [0.25, 0.5, 1]) }; },
    valid: function (p) { return p.k !== p.f; },
    prompt: function (p) { return 'Pay-fixed swap, notional ' + big(p.N) + ' €, fixed ' + n(p.k, 2) + '%, floating fixed at ' + n(p.f, 2) + '%, period ' + n(p.tau, 2) + ' year. Net payment received (+) or paid (−)?'; },
    answer: function (p) { return p.N * (p.f - p.k) / 100 * p.tau; },
    steps: function (p) { return [S('\\text{Net} = ' + p.N + X + '(' + n(p.f / 100, 4) + ' - ' + n(p.k / 100, 4) + ')' + X + n(p.tau, 2) + ' = ' + n(p.N * (p.f - p.k) / 100 * p.tau, 0))]; },
    formula: 'Net = N × (f − k) × τ', tex: '\\text{Net} = N \\times (f - k) \\times \\tau',
    shortcut: 'The payer of fixed gains when floating is above fixed (rates went up).',
    legend: [['N', 'the notional (never exchanged)', function (p) { return big(p.N) + ' €'; }], ['f', 'the floating rate for the period', function (p) { return n(p.f, 2) + '%'; }], ['k', 'the fixed rate you pay', function (p) { return n(p.k, 2) + '%'; }], ['\\tau', 'the period length in years', function (p) { return n(p.tau, 2); }]],
    pitfalls: [
      { tag: 'SIGN', text: 'You used N(k − f)τ: the fixed-rate payer receives floating, so floating minus fixed.', value: function (p) { return p.N * (p.k - p.f) / 100 * p.tau; } },
      { tag: 'WRONG_FORMULA', text: 'You forgot τ: the payment is for the period only.', value: function (p) { return p.N * (p.f - p.k) / 100; }, applies: function (p) { return p.tau !== 1; } }],
    example: { p: { N: 1e7, k: 3, f: 3.5, tau: 0.5 }, answer: 25000 }
  });

  // ======================= Risk =======================

  D({
    id: 'risk.expected.loss', family: 'fin', category: 'Risk', level: 2, target: 20, unit: '€', dp: 0, tol: REL, positive: true,
    params: function (rng) { return { pd: pick(rng, [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]), lgd: pick(rng, [20, 25, 40, 45, 60, 75]), E: pick(rng, [1e6, 2e6, 5e6, 1e7, 5e7]) }; },
    prompt: function (p) { return 'PD ' + n(p.pd, 1) + '%, LGD ' + p.lgd + '%, EAD ' + big(p.E) + ' €. Expected loss?'; },
    answer: function (p) { return p.pd / 100 * p.lgd / 100 * p.E; },
    steps: function (p) { return [S('EL = ' + n(p.pd / 100, 3) + X + n(p.lgd / 100, 2) + X + p.E + ' = ' + n(p.pd / 100 * p.lgd / 100 * p.E, 0))]; },
    formula: 'EL = PD × LGD × EAD', tex: 'EL = PD \\times LGD \\times EAD',
    shortcut: 'Recovery 40% ↔ LGD 60%.',
    legend: [['PD', 'the probability of default', function (p) { return n(p.pd, 1) + '%'; }], ['LGD', 'the loss given default (the share NOT recovered)', function (p) { return p.lgd + '%'; }], ['EAD', 'the exposure at default', function (p) { return big(p.E) + ' €'; }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You used the recovery rate instead of LGD (1 − LGD).', value: function (p) { return p.pd / 100 * (1 - p.lgd / 100) * p.E; } }],
    example: { p: { pd: 2, lgd: 45, E: 1e6 }, answer: 9000 }
  });

  // ======================= Bank ratios =======================

  function ratioTpl(id, level, target, spec) { return D(Object.assign({ id: id, family: 'fin', category: 'Bank ratios', level: level, target: target, unit: '%', dp: 2, tol: REL, positive: true }, spec)); }

  ratioTpl('bank.cet1', 1, 15, {
    params: function (rng) { var R = 50 * int(rng, 4, 18), r = int(rng, 8, 18); return { R: R, C: Math.round(R * r / 100) }; },
    prompt: function (p) { return 'CET1 capital ' + p.C + 'bn, risk-weighted assets ' + p.R + 'bn. CET1 ratio?'; },
    answer: function (p) { return p.C / p.R * 100; },
    steps: function (p) { return [S('\\text{CET1 ratio} = ' + fr(p.C, p.R) + X + '100 = ' + n(p.C / p.R * 100, 2) + '\\%')]; },
    formula: 'CET1 ratio = CET1 / RWA × 100', tex: '\\text{CET1 ratio} = \\frac{\\text{CET1}}{\\text{RWA}} \\times 100',
    shortcut: 'Capital on top. A typical big bank has 12–15%.',
    legend: [['\\text{CET1}', 'the highest-quality capital (shares + retained earnings)', function (p) { return p.C + 'bn'; }], ['\\text{RWA}', 'the assets weighted by riskiness', function (p) { return p.R + 'bn'; }]],
    pitfalls: [{ tag: 'RATIO_INVERTED', text: 'You divided RWA by CET1: capital goes on top.', value: function (p) { return p.R / p.C * 100; } }],
    example: { p: { C: 60, R: 450 }, answer: 13.3333 }
  });

  ratioTpl('bank.leverage.ratio', 2, 15, {
    params: function (rng) { var X0 = 250 * int(rng, 4, 16), r = int(rng, 3, 7); return { X: X0, C: Math.round(X0 * r / 100) }; },
    prompt: function (p) { return 'Tier 1 capital ' + p.C + 'bn, total exposure ' + p.X + 'bn. Leverage ratio?'; },
    answer: function (p) { return p.C / p.X * 100; },
    steps: function (p) { return [S('\\text{LR} = ' + fr(p.C, p.X) + X + '100 = ' + n(p.C / p.X * 100, 2) + '\\%')]; },
    formula: 'LR = Tier 1 / Exposure × 100', tex: '\\text{LR} = \\frac{\\text{Tier 1}}{\\text{Exposure}} \\times 100',
    shortcut: 'Minimum 3% (Basel III). No risk weights: a backstop.',
    legend: [['\\text{Tier 1}', 'the core capital', function (p) { return p.C + 'bn'; }], ['\\text{Exposure}', 'the total exposure, NOT risk-weighted', function (p) { return p.X + 'bn'; }]],
    pitfalls: [{ tag: 'RATIO_INVERTED', text: 'You divided the exposure by Tier 1: capital goes on top.', value: function (p) { return p.X / p.C * 100; } }],
    example: { p: { C: 80, X: 2000 }, answer: 4 }
  });

  ratioTpl('bank.cost.income', 1, 10, {
    params: function (rng) { var Rv = 100 * int(rng, 5, 20), r = 5 * int(rng, 8, 16); return { Rv: Rv, K: Rv * r / 100 }; },
    prompt: function (p) { return 'Operating costs ' + p.K + 'm, revenues ' + p.Rv + 'm. Cost/income ratio?'; },
    answer: function (p) { return p.K / p.Rv * 100; },
    steps: function (p) { return [S('\\text{C/I} = ' + fr(p.K, p.Rv) + X + '100 = ' + n(p.K / p.Rv * 100, 2) + '\\%')]; },
    formula: 'C/I = Costs / Revenues × 100', tex: '\\text{C/I} = \\frac{\\text{Costs}}{\\text{Revenues}} \\times 100',
    shortcut: 'Lower is better. 60% = 60 cents of cost per € earned.',
    legend: [['\\text{Costs}', 'the operating expenses', function (p) { return p.K + 'm'; }], ['\\text{Revenues}', 'the net revenues', function (p) { return p.Rv + 'm'; }]],
    pitfalls: [{ tag: 'RATIO_INVERTED', text: 'You divided revenues by costs: costs go on top.', value: function (p) { return p.Rv / p.K * 100; } }],
    example: { p: { K: 600, Rv: 1000 }, answer: 60 }
  });

  ratioTpl('bank.roe', 1, 10, {
    params: function (rng) { var Eq = 100 * int(rng, 5, 20), r = int(rng, 5, 20); return { Eq: Eq, NI: Eq * r / 100 }; },
    prompt: function (p) { return 'Net income ' + p.NI + 'm, equity ' + p.Eq + 'm. ROE?'; },
    answer: function (p) { return p.NI / p.Eq * 100; },
    steps: function (p) { return [S('\\text{ROE} = ' + fr(p.NI, p.Eq) + X + '100 = ' + n(p.NI / p.Eq * 100, 2) + '\\%')]; },
    formula: 'ROE = Net income / Equity × 100', tex: '\\text{ROE} = \\frac{\\text{Net income}}{\\text{Equity}} \\times 100',
    shortcut: 'Banks often target 10–15%.',
    legend: [['\\text{Net income}', 'the profit after tax', function (p) { return p.NI + 'm'; }], ['\\text{Equity}', "the shareholders' equity", function (p) { return p.Eq + 'm'; }]],
    pitfalls: [{ tag: 'RATIO_INVERTED', text: 'You divided equity by net income: income goes on top.', value: function (p) { return p.Eq / p.NI * 100; } }],
    example: { p: { NI: 120, Eq: 1000 }, answer: 12 }
  });

  D({
    id: 'bank.balance.sheet', family: 'fin', category: 'Bank ratios', level: 1, target: 15, unit: '€bn', dp: 0, tol: EXACT, positive: true,
    params: function (rng) { var A = 50 * int(rng, 4, 40), e = int(rng, 3, 10); return { A: A, L: A - Math.round(A * e / 100) }; },
    valid: function (p) { return p.A > p.L; },
    prompt: function (p) { return 'Assets ' + p.A + 'bn, liabilities ' + p.L + 'bn. Equity?'; },
    answer: function (p) { return p.A - p.L; },
    steps: function (p) { return [S('E = A - L = ' + p.A + ' - ' + p.L + ' = ' + (p.A - p.L))]; },
    formula: 'E = A − L', tex: 'E = A - L',
    shortcut: 'Assets = Liabilities + Equity, always.',
    legend: [['A', 'the assets: what the bank owns or is owed', function (p) { return p.A + 'bn'; }], ['L', 'the liabilities: what it owes', function (p) { return p.L + 'bn'; }], ['E', 'the equity: what is left for shareholders', '']],
    pitfalls: [{ tag: 'SIGN', text: 'You subtracted the wrong way round (L − A): equity is what is left after the debts.', value: function (p) { return p.L - p.A; } }],
    example: { p: { A: 1000, L: 940 }, answer: 60 }
  });

  // ======================= Operations =======================

  D({
    id: 'ops.breaks', family: 'fin', category: 'Operations', level: 1, target: 15, unit: 'breaks', dp: 0, tol: EXACT, positive: true,
    params: function (rng) { return { V: pick(rng, [1000, 2000, 5000, 10000, 20000, 50000, 100000]), b: pick(rng, [0.1, 0.2, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) }; },
    valid: function (p) { return Number.isInteger(F.round(p.V * p.b / 100, 6)); },
    prompt: function (p) { return p.V + ' trades a day, break rate ' + n(p.b, 1) + '%. Breaks per day?'; },
    answer: function (p) { return F.round(p.V * p.b / 100, 6); },
    steps: function (p) { return [S('\\text{Breaks} = ' + p.V + X + n(p.b / 100, 3) + ' = ' + n(p.V * p.b / 100, 0))]; },
    formula: 'Breaks = V × b', tex: '\\text{Breaks} = V \\times b',
    shortcut: '1% of 20 000 = 200.',
    legend: [['V', 'the daily trade volume', function (p) { return String(p.V); }], ['b', 'the share of trades that fail to match or reconcile', function (p) { return n(p.b, 1) + '% = ' + n(p.b / 100, 3); }]],
    pitfalls: [{ tag: 'UNIT', text: 'You forgot ÷100: b is a percentage.', value: function (p) { return p.V * p.b; } }],
    example: { p: { V: 20000, b: 1.5 }, answer: 300 }
  });

  D({
    id: 'ops.fte', family: 'fin', category: 'Operations', level: 2, target: 30, unit: 'FTE', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { B: 50 * int(rng, 2, 20), m: 5 * int(rng, 1, 6), h: pick(rng, [7, 7.5, 8]) }; },
    prompt: function (p) { return p.B + ' breaks a day, ' + p.m + ' minutes each, ' + n(p.h, 1) + '-hour working day. How many FTEs?'; },
    answer: function (p) { return p.B * p.m / (60 * p.h); },
    steps: function (p) { return [S('\\text{FTE} = ' + fr(p.B + X + p.m, '60' + X + n(p.h, 1)) + ' = ' + fr(p.B * p.m, 60 * p.h) + ' = ' + n(p.B * p.m / (60 * p.h), 2))]; },
    formula: 'FTE = B × m / (60 × h)', tex: '\\text{FTE} = \\frac{B \\times m}{60 \\times h}',
    shortcut: 'Total minutes → hours (÷60) → people (÷h). Round UP in a staffing answer.',
    legend: [['B', 'the breaks per day', function (p) { return String(p.B); }], ['m', 'the minutes to fix one break', function (p) { return String(p.m); }], ['60', 'the minutes per hour', '60'], ['h', 'the productive hours per person per day', function (p) { return n(p.h, 1); }], ['\\text{FTE}', 'full-time equivalents (people)', '']],
    pitfalls: [{ tag: 'UNIT', text: 'You forgot ÷60: the minutes must become hours first.', value: function (p) { return p.B * p.m / p.h; } }],
    example: { p: { B: 300, m: 12, h: 7.5 }, answer: 8 }
  });

  D({
    id: 'ops.stp', family: 'fin', category: 'Operations', level: 1, target: 15, unit: '%', dp: 2, tol: REL, positive: true,
    params: function (rng) { var V = 1000 * int(rng, 1, 20), r = int(rng, 70, 99); return { V: V, A: V * r / 100 }; },
    prompt: function (p) { return p.A + ' of ' + p.V + ' trades processed with no manual touch. STP rate?'; },
    answer: function (p) { return p.A / p.V * 100; },
    steps: function (p) { return [S('\\text{STP} = ' + fr(p.A, p.V) + X + '100 = ' + n(p.A / p.V * 100, 2) + '\\%')]; },
    formula: 'STP = automated / total × 100', tex: '\\text{STP} = \\frac{\\text{automated trades}}{\\text{total trades}} \\times 100',
    shortcut: 'Higher is better: fewer manual touches, fewer errors, lower cost.',
    legend: [['\\text{automated}', 'the trades processed end to end without intervention', function (p) { return String(p.A); }], ['\\text{total}', 'all trades', function (p) { return String(p.V); }]],
    pitfalls: [{ tag: 'RATIO_INVERTED', text: 'You divided total by automated: the automated trades go on top.', value: function (p) { return p.V / p.A * 100; } }],
    example: { p: { A: 9200, V: 10000 }, answer: 92 }
  });

  D({
    id: 'ops.cost.per.trade', family: 'fin', category: 'Operations', level: 1, target: 15, unit: '€', dp: 2, tol: REL, positive: true,
    params: function (rng) { return { K: 10 * int(rng, 1, 20), V: 5 * int(rng, 1, 20) }; },
    valid: function (p) { return p.K / p.V >= 0.1; },
    prompt: function (p) { return 'Ops cost ' + p.K + 'm a year, ' + p.V + 'm trades a year. Cost per trade in €?'; },
    answer: function (p) { return p.K / p.V; },
    steps: function (p) { return [S('c = ' + fr(p.K + '\\text{ m €}', p.V + '\\text{ m trades}') + ' = ' + n(p.K / p.V, 2) + '\\text{ €}')]; },
    formula: 'c = Total cost / Volume', tex: 'c = \\frac{\\text{Total cost}}{\\text{Volume}}',
    shortcut: 'Units: m / m cancel, so the answer is plain €.',
    legend: [['\\text{Total cost}', 'the annual operations cost', function (p) { return p.K + 'm €'; }], ['\\text{Volume}', 'the annual trades', function (p) { return p.V + 'm'; }]],
    pitfalls: [
      { tag: 'UNIT', text: 'Off by ×1000: the millions cancel, there is no k or bn left.', value: function (p) { return p.K / p.V * 1000; } },
      { tag: 'UNIT', text: 'Off by ÷1000: the millions cancel, there is no k or bn left.', value: function (p) { return p.K / p.V / 1000; } }],
    example: { p: { K: 50, V: 20 }, answer: 2.5 }
  });

  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  function calDays(d, k) { var c = 0, w = d; while (k > 0) { c++; w = (w + 1) % 7; if (w < 5) k--; } return c; }
  D({
    id: 'ops.settlement.days', family: 'fin', category: 'Operations', level: 2, target: 15, unit: 'days', dp: 0, tol: EXACT, positive: true,
    params: function (rng) { return { d: int(rng, 0, 4), k: int(rng, 1, 2) }; },
    prompt: function (p) { return 'Trade on a ' + DAYS[p.d] + ', settlement T+' + p.k + ' business days (no holidays). How many CALENDAR days after the trade date?'; },
    answer: function (p) { return calDays(p.d, p.k); },
    steps: function (p) { return [S('\\text{count } ' + p.k + ' \\text{ business days from ' + DAYS[p.d] + ', skipping Saturday and Sunday: ' + calDays(p.d, p.k) + ' calendar days}')]; },
    formula: 'count n business days, skipping Saturday and Sunday', tex: '\\text{count } n \\text{ business days, skipping Saturday and Sunday}',
    shortcut: 'Thursday T+2 → Monday (4 calendar days). US equities are T+1 since May 2024.',
    legend: [['T', 'the trade date', function (p) { return DAYS[p.d]; }], ['n', 'the business days to settlement', function (p) { return String(p.k); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You counted weekend days as business days.', value: function (p) { return p.k; }, applies: function (p) { return calDays(p.d, p.k) !== p.k; } }],
    example: { p: { d: 3, k: 2 }, answer: 4 }
  });

  // ======================= Probability =======================

  D({
    id: 'prob.dice.sum', family: 'quant', category: 'Probability', level: 2, target: 20, unit: '', dp: 4, tol: ABS4, fracInput: true,
    params: function (rng) { return { k: int(rng, 2, 12) }; },
    prompt: function (p) { return 'Two fair dice. Probability the sum is ' + p.k + '?'; },
    answer: function (p) { return (6 - Math.abs(p.k - 7)) / 36; },
    steps: function (p) { var w = 6 - Math.abs(p.k - 7); return [S('P = ' + fr('6 - |' + p.k + ' - 7|', 36) + ' = ' + fr(w, 36) + ' = ' + n(w / 36, 4))]; },
    formula: 'P = (6 − |k − 7|) / 36', tex: 'P = \\frac{6 - |k - 7|}{36}',
    shortcut: '7 is the most likely sum (6 ways).',
    legend: [['k', 'the target sum', function (p) { return String(p.k); }], ['36', 'the equally likely outcomes', '36'], ['6 - |k - 7|', 'the number of ways to make k', function (p) { return String(6 - Math.abs(p.k - 7)); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You answered 1/11: the 11 sums are not equally likely.', value: function () { return 1 / 11; } }],
    example: { p: { k: 9 }, answer: 0.1111 }
  });

  D({
    id: 'prob.at.least.one', family: 'quant', category: 'Probability', level: 2, target: 20, unit: '', dp: 4, tol: REL,
    params: function (rng) { return { n: int(rng, 2, 6) }; },
    prompt: function (p) { return 'Probability of at least one 6 in ' + p.n + ' rolls of a die?'; },
    answer: function (p) { return 1 - Math.pow(5 / 6, p.n); },
    steps: function (p) { return [S('P = 1 - \\left(\\frac56\\right)^{' + p.n + '} = 1 - ' + n(Math.pow(5 / 6, p.n), 4) + ' = ' + n(1 - Math.pow(5 / 6, p.n), 4))]; },
    formula: 'P = 1 − (5/6)^n', tex: 'P = 1 - \\left(\\frac56\\right)^n',
    shortcut: '"At least one" means 1 − P(none).',
    legend: [['n', 'the number of rolls', function (p) { return String(p.n); }], ['(5/6)^n', 'the probability of NO 6 at all', function (p) { return n(Math.pow(5 / 6, p.n), 4); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You added the chances (n/6): the events can overlap.', value: function (p) { return p.n / 6; } }],
    example: { p: { n: 4 }, answer: 0.5177 }
  });

  D({
    id: 'prob.ev.game', family: 'quant', category: 'Probability', level: 1, target: 20, unit: '€', dp: 2, tol: function () { return { type: 'abs', v: 0.01 }; }, positive: false,
    params: function (rng) { return { w: int(rng, 5, 30), l: int(rng, 1, 5) }; },
    prompt: function (p) { return 'You win ' + p.w + ' € on a 6 and lose ' + p.l + ' € otherwise (one roll). Expected value?'; },
    answer: function (p) { return (p.w - 5 * p.l) / 6; },
    steps: function (p) { return [S('EV = ' + fr(1, 6) + X + p.w + ' - ' + fr(5, 6) + X + p.l + ' = ' + n((p.w - 5 * p.l) / 6, 2))]; },
    formula: 'EV = w/6 − 5l/6', tex: 'EV = \\frac16 w - \\frac56 l',
    shortcut: 'Sum of value × probability over the outcomes.',
    legend: [['w', 'the gain on a 6', function (p) { return String(p.w); }], ['l', 'the loss otherwise', function (p) { return String(p.l); }], ['1/6, 5/6', 'the probabilities', '1/6, 5/6']],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You took w − l: the 6 only comes up one time in six.', value: function (p) { return p.w - p.l; } }],
    example: { p: { w: 10, l: 2 }, answer: 0 }
  });

  D({
    id: 'prob.bayes', family: 'quant', category: 'Probability', level: 3, target: 45, unit: '', dp: 4, tol: REL1, fracInput: true,
    params: function (rng) { return { s: int(rng, 80, 99), f: int(rng, 1, 10), p: int(rng, 1, 10) }; },
    prompt: function (p) { return 'A test detects a fault with probability ' + p.s + '%, false positive rate ' + p.f + '%, prevalence ' + p.p + '%. P(fault | positive)?'; },
    answer: function (p) { return p.s * p.p / (p.s * p.p + p.f * (100 - p.p)); },
    steps: function (p) { var a = p.s * p.p, b = p.f * (100 - p.p); return [S('P(F \\mid +) = ' + fr(p.s + X + p.p, p.s + X + p.p + ' + ' + p.f + X + (100 - p.p)) + ' = ' + fr(a, a + b) + ' = ' + n(a / (a + b), 4))]; },
    formula: 'P(F | +) = s p / (s p + f (1 − p))', tex: 'P(F \\mid +) = \\frac{s\\,p}{s\\,p + f\\,(1 - p)}',
    shortcut: 'Think in counts: out of 1 000 cases, how many true and false positives?',
    legend: [['s', 'the sensitivity P(+ | fault)', function (p) { return p.s + '%'; }], ['f', 'the false positive rate P(+ | no fault)', function (p) { return p.f + '%'; }], ['p', 'the prior probability of a fault', function (p) { return p.p + '%'; }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You answered s: that is P(+ | fault), not P(fault | +).', value: function (p) { return p.s / 100; } }],
    example: { p: { s: 90, f: 5, p: 2 }, answer: 0.2687 }
  });

  function angle(p) { var t = Math.abs(30 * (p.H % 12) - 5.5 * p.M); return Math.min(t, 360 - t); }
  D({
    id: 'prob.clock.angle', family: 'quant', category: 'Probability', level: 2, target: 30, unit: '°', dp: 1, tol: EXACT, positive: true,
    params: function (rng) { return { H: int(rng, 1, 12), M: 5 * int(rng, 0, 11) }; },
    valid: function (p) { return angle(p) > 0; },
    prompt: function (p) { return 'Angle between the clock hands at ' + p.H + ':' + (p.M < 10 ? '0' : '') + p.M + '?'; },
    answer: function (p) { return angle(p); },
    steps: function (p) { var t = Math.abs(30 * (p.H % 12) - 5.5 * p.M); return [S('\\theta = |30 \\times ' + (p.H % 12) + ' - 5.5 \\times ' + p.M + '| = ' + n(t, 1)), S('\\min(' + n(t, 1) + ', 360 - ' + n(t, 1) + ') = ' + n(angle(p), 1))]; },
    formula: 'θ = |30H − 5.5M|, then min(θ, 360 − θ)', tex: '\\theta = |30H - 5.5M|,\\ \\text{then } \\min(\\theta, 360 - \\theta)',
    shortcut: '3:15 is not 0°: the hour hand has moved 7.5°.',
    legend: [['H', 'the hour (12 counts as 0)', function (p) { return String(p.H); }], ['M', 'the minutes', function (p) { return String(p.M); }], ['30H', 'the hour hand: 30° per hour', function (p) { return String(30 * (p.H % 12)); }], ['5.5M', 'the minute hand at 6°/min minus the hour hand at 0.5°/min', function (p) { return n(5.5 * p.M, 1); }]],
    pitfalls: [{ tag: 'WRONG_FORMULA', text: 'You ignored the hour hand\'s movement (30H − 6M).', value: function (p) { var t = Math.abs(30 * (p.H % 12) - 6 * p.M); return Math.min(t, 360 - t); } }],
    example: { p: { H: 3, M: 15 }, answer: 7.5 }
  });
})();
