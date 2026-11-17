/*
 * finance-meta.js — teaching data for the Finance templates written before the Superday work (finance-templates.js):
 * legend (symbol, what it is, its value in this question), shortcut, target seconds, pitfalls (a wrong value per typical
 * mistake with its error tag) and a worked example. Nine of them are templates the coach's spec also describes
 * (pct.of, pct.change, rule72, pv.annual, real.rate, bond.price.2y, var.gauss, var.horizon, nii): their legend, shortcut,
 * pitfalls and target here come from the spec; everything else was written for this file and is for the coach to review.
 * A pitfall carries `applies`: it is skipped on draws where its value would fall within twice the tolerance of the answer.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var F = AT.Finance || require('./finance-core.js');
  function n(x, dp) { return F.fmt(x, dp === undefined ? 4 : dp); }
  function L(sym, meaning, here) { return [sym, meaning, here === undefined ? '' : here]; }
  var Z = { 95: 1.6449, 97.5: 1.96, 99: 2.3263 }, Z2 = { 95: 1.96, 99: 2.576, 97.5: 2.2414 };

  // pit(id, tag, text, value): a pitfall that is skipped when its value is not clear of the answer.
  function pit(id, tag, text, value) {
    return {
      tag: tag, text: text, value: value,
      applies: function (p) {
        var t = F.get(id), a = t.answer(p), v = value(p);
        if (!isFinite(v) || !isFinite(a)) return false;
        var tol = t.tol ? t.tol(p) : { type: 'round' };
        return Math.abs(v - a) > 2 * F.tolWidth(tol, a, t.dp || 0);
      }
    };
  }
  function soft(tag, text) { return { tag: tag, text: text }; }   // text only: for the Method sheet, no value to match

  function meta(id, target, shortcut, legend, pitfalls, example) {
    var o = { target: target, shortcut: shortcut, legend: legend.map(function (r) { return { sym: r[0], meaning: r[1], here: r[2] }; }), pitfalls: pitfalls };
    if (example) o.example = example;
    F.addMeta(id, o);
  }
  function P(id) { var args = Array.prototype.slice.call(arguments, 1); return pit.apply(null, [id].concat(args)); }

  // ---------- arithmetic ----------
  meta('arith.add', 8, 'Round one number to a ten, then correct: 98 + 32 = 100 + 32 − 2.',
    [L('a', 'the first number', function (p) { return String(p.a); }), L('b', 'the second number', function (p) { return String(p.b); })], [soft('ARITHMETIC', 'A carry slip: check the tens digit.')]);
  meta('arith.sub', 8, 'Count up from the smaller number: 130 − 98 is 2 to reach 100, then 30 more.',
    [L('a', 'the number taken away', function (p) { return String(p.a); }), L('b', 'the difference you are looking for', function (p) { return String(p.b); })], [soft('ARITHMETIC', 'A borrow slip: check the tens digit.')]);
  meta('arith.mul', 12, 'Split one factor: 12 × 32 = 10 × 32 + 2 × 32.',
    [L('a', 'the first factor', function (p) { return String(p.a); }), L('b', 'the second factor', function (p) { return String(p.b); })], [soft('ARITHMETIC', 'A partial product is off: add the parts again.')]);
  meta('arith.div', 12, 'Multiply back to check: the answer times the divisor must give the first number.',
    [L('a', 'the divisor', function (p) { return String(p.a); }), L('b', 'the quotient you are looking for', function (p) { return String(p.b); })], [soft('ARITHMETIC', 'Check the answer by multiplying it by the divisor.')]);

  // ---------- quant ----------
  meta('quant.pct.of', 10, 'Split x: 1% = move the decimal point 2 places, 10% = 1 place; e.g. 15% = 10% + half of 10%.',
    [L('x', 'the percentage', function (p) { return p.x + '%'; }), L('y', 'the whole amount', function (p) { return String(p.y); }), L('100', 'converts a percentage to a fraction', '100')],
    [P('quant.pct.of', 'UNIT', 'You forgot ÷100: x is a percentage.', function (p) { return p.y * p.x; }), P('quant.pct.of', 'UNIT', 'You divided by 1000 instead of 100.', function (p) { return p.y * p.x / 1000; })],
    { p: { x: 15, y: 840 }, answer: 126 });
  meta('quant.pct.change', 20, 'Always divide by the STARTING value. 400 → 480: change 80, $\\frac{80}{400} = 0.2$ → +20%.',
    [L('a', 'the starting value (the base)', function (p) { return String(p.a); }), L('b', 'the new value', function (p) { return String(p.b); }), L('\\%', 'the percentage change', '')],
    [P('quant.pct.change', 'RATIO_INVERTED', 'You divided by the new value: the base is the starting value.', function (p) { return (p.b - p.a) / p.b * 100; }),
      P('quant.pct.change', 'UNIT', 'You forgot ×100 (answered the decimal).', function (p) { return (p.b - p.a) / p.a; })],
    { p: { a: 400, c: 20, b: 480 }, answer: 20 });
  meta('quant.frac.dec', 20, 'Learn the eighths and sixteenths: $\\frac{1}{8} = 0.125$, $\\frac{1}{16} = 0.0625$.',
    [L('n', 'the numerator', function (p) { return String(p.n); }), L('d', 'the denominator', function (p) { return String(p.d); })],
    [P('quant.frac.dec', 'RATIO_INVERTED', 'You divided the denominator by the numerator.', function (p) { return p.d / p.n; })]);
  meta('quant.dec.frac', 25, 'Read the decimal as digits over a power of ten, then simplify.',
    [L('n', 'the numerator of the lowest-terms fraction', ''), L('d', 'the denominator of the lowest-terms fraction', '')], [soft('WRONG_FORMULA', 'Left the fraction unsimplified, or put the digits over the wrong power of ten.')]);
  meta('quant.square', 15, '$(a + b)^2 = a^2 + 2ab + b^2$: $98^2 = 100^2 - 2 \\times 100 \\times 2 + 2^2$.',
    [L('x', 'the number squared', function (p) { return String(p.x); })], [P('quant.square', 'WRONG_FORMULA', 'You doubled instead of squaring.', function (p) { return 2 * p.x; })]);
  meta('quant.square.big', 20, '$(100 + k)^2 = 10\\,000 + 200k + k^2$: keep the middle term.',
    [L('k', 'the amount above 100', function (p) { return String(p.x - 100); }), L('x', 'the number squared', function (p) { return String(p.x); })],
    [P('quant.square.big', 'WRONG_FORMULA', 'You left out the middle term 200k.', function (p) { return 10000 + Math.pow(p.x - 100, 2); })]);
  meta('quant.sqrt.approx', 25, 'Take the nearest square $k^2$, then add $\\frac{d}{2k}$: the correction is small.',
    [L('k', 'the integer whose square is nearest', function (p) { return String(Math.round(Math.sqrt(p.x))); }), L('d', 'the gap from that square', function (p) { var k = Math.round(Math.sqrt(p.x)); return String(p.x - k * k); })],
    [P('quant.sqrt.approx', 'WRONG_FORMULA', 'You stopped at k: add the correction d / (2k).', function (p) { return Math.round(Math.sqrt(p.x)); })]);
  meta('quant.pow2', 10, '$2^{10} = 1024$, so $2^{20} \\approx 10^6$ and every extra 10 multiplies by about 1000.',
    [L('k', 'the exponent', function (p) { return String(p.k); })], [P('quant.pow2', 'WRONG_FORMULA', 'You multiplied 2 by the exponent instead of raising 2 to it.', function (p) { return 2 * p.k; })]);
  meta('quant.mul.trick', 15, '$25 = \\frac{100}{4}$, $125 = \\frac{1000}{8}$, $99 = 100 - 1$, $11 = 10 + 1$: turn the hard factor into an easy one.',
    [L('x', 'the number being multiplied', function (p) { return String(p.x); }), L('m', 'the special factor', function (p) { return String(p.m); })],
    [P('quant.mul.trick', 'UNIT', 'Off by a factor of 10: check the zeros.', function (p) { return p.x * p.m * 10; }), P('quant.mul.trick', 'UNIT', 'Off by a factor of 10: check the zeros.', function (p) { return p.x * p.m / 10; })]);
  meta('quant.est.prod', 20, 'Round one factor, then correct: 0.98 × 3760 = 3760 − 2% of 3760.',
    [L('a', 'the first factor', function (p) { return String(p.a); }), L('b', 'the second factor', function (p) { return String(p.b); })],
    [P('quant.est.prod', 'UNIT', 'Off by a factor of 10: check the decimal point.', function (p) { return p.a * p.b * 10; }), P('quant.est.prod', 'UNIT', 'Off by a factor of 10: check the decimal point.', function (p) { return p.a * p.b / 10; })]);
  meta('quant.rule72', 8, 'Exact: ln 2 / ln(1 + r); the rule of 72 is good for 4–12%.',
    [L('T', 'the doubling time in years', ''), L('r', 'the rate in PERCENT (not decimal)', function (p) { return String(p.r); }), L('72', '≈ 100 ln 2, rounded to have many divisors', '72')],
    [P('quant.rule72', 'UNIT', 'You used r as a decimal (0.08 instead of 8).', function (p) { return 72 / (p.r / 100); })], { p: { r: 8 }, answer: 9 });
  meta('quant.compound', 25, '$(1 + x)^k \\approx 1 + kx + \\frac{k(k-1)}{2}x^2$: two terms are enough for small $x$.',
    [L('r', 'the rate as a decimal', function (p) { return n(p.r / 100, 2); }), L('k', 'the exponent', function (p) { return String(p.k); })],
    [P('quant.compound', 'WRONG_FORMULA', 'You stopped at 1 + kr: that misses the compounding term.', function (p) { return 1 + p.k * p.r / 100; })]);
  meta('quant.ln.approx', 25, '$\\ln(1 + u) \\approx u - \\frac{u^2}{2}$ for small $u$: $\\ln 1.2 \\approx 0.2 - 0.02$.',
    [L('u', 'the amount above 1', function (p) { return n(p.x - 1, 3); }), L('x', 'the number whose log is taken', function (p) { return n(p.x, 3); })],
    [P('quant.ln.approx', 'WRONG_FORMULA', 'You stopped at u: the second term −u²/2 matters.', function (p) { return p.x - 1; })]);
  meta('quant.exp.approx', 25, '$e^{-x} \\approx 1 - x + \\frac{x^2}{2}$ for small $x$.',
    [L('x', 'the exponent (the size)', function (p) { return n(p.x, 3); })],
    [P('quant.exp.approx', 'WRONG_FORMULA', 'You stopped at 1 − x: the x²/2 term matters.', function (p) { return 1 - p.x; }), P('quant.exp.approx', 'SIGN', 'The exponent is negative: the result is below 1.', function (p) { return Math.exp(p.x); })]);
  meta('quant.ev', 30, 'Sum of payoff × probability over the outcomes.',
    [L('E[X]', 'the expected gain', ''), L('\\text{payoff}', 'what you win or pay in each outcome', ''), L('\\text{probability}', 'the chance of each outcome', '')],
    [soft('WRONG_FORMULA', 'You averaged the payoffs without weighting them by their probabilities.')]);

  // ---------- fin ----------
  meta('fin.bp.convert', 15, '1 bp = 0.01%: a move of 0.4% is 40 bp.',
    [L('a', 'the first rate', function (p) { return p.a + '%'; }), L('b', 'the second rate', function (p) { return p.b + '%'; }), L('100', 'bp per 1%', '100')],
    [P('fin.bp.convert', 'SIGN', 'You subtracted the wrong way round.', function (p) { return (p.a - p.b) * 100; }), P('fin.bp.convert', 'UNIT', 'You gave the move in %, not bp.', function (p) { return p.b - p.a; })]);
  meta('fin.pv.annual', 20, 'Money later is worth less: $\\text{PV} < C$. $\\frac{1}{1.05^2} \\approx 0.907$.',
    [L('PV', 'the value today', ''), L('C', 'the future cash flow', function (p) { return String(p.c); }), L('r', 'the discount rate as a decimal', function (p) { return n(p.r / 100, 3); }), L('t', 'the years until payment', function (p) { return String(p.t); })],
    [P('fin.pv.annual', 'WRONG_FORMULA', 'You compounded instead of discounting: C (1 + r)^t.', function (p) { return p.c * Math.pow(1 + p.r / 100, p.t); }),
      P('fin.pv.annual', 'WRONG_FORMULA', 'You used C (1 − rt): a straight-line discount, not compounding.', function (p) { return p.c * (1 - p.r / 100 * p.t); })],
    { p: { c: 1000, t: 2, r: 5 }, answer: 907.0295 });
  meta('fin.pv.cont', 25, '$e^{-rt} \\approx 1 - rt$ for small $rt$.',
    [L('PV', 'the value today', ''), L('C', 'the future cash flow', function (p) { return String(p.c); }), L('r', 'the continuous rate as a decimal', function (p) { return n(p.r / 100, 3); }), L('t', 'the years until payment', function (p) { return String(p.t); })],
    [P('fin.pv.cont', 'SIGN', 'The exponent is −rt: PV is below C, so you must not grow it.', function (p) { return p.c * Math.exp(p.r / 100 * p.t); }), P('fin.pv.cont', 'WRONG_FORMULA', 'You discounted annually, C / (1 + r)^t: here compounding is continuous.', function (p) { return p.c / Math.pow(1 + p.r / 100, p.t); })]);
  meta('fin.fv', 20, 'Rule of 72 for doubling; otherwise $(1 + r)^t \\approx 1 + rt + \\frac{t(t-1)}{2}r^2$.',
    [L('FV', 'the value at the end', ''), L('C', 'the amount invested', function (p) { return String(p.c); }), L('r', 'the annual rate as a decimal', function (p) { return n(p.r / 100, 3); }), L('t', 'the years', function (p) { return String(p.t); })],
    [P('fin.fv', 'WRONG_FORMULA', 'You used simple interest, C (1 + rt): interest earns interest.', function (p) { return p.c * (1 + p.r / 100 * p.t); }), P('fin.fv', 'WRONG_FORMULA', 'You discounted instead of compounding.', function (p) { return p.c / Math.pow(1 + p.r / 100, p.t); })]);
  meta('fin.real.rate', 8, 'Exact: $\\frac{1 + i}{1 + \\pi} - 1$, close to $i - \\pi$ when both are small.',
    [L('i', 'the nominal rate', function (p) { return p.i + '%'; }), L('\\pi', 'inflation', function (p) { return p.pi + '%'; })],
    [P('fin.real.rate', 'SIGN', 'You subtracted the wrong way round (π − i).', function (p) { return p.pi - p.i; })], { p: { i: 5, pi: 3 }, answer: 2 });
  meta('fin.real.rate.exact', 25, 'Divide the growth factors: $\\frac{1.08}{1.03} - 1$.',
    [L('i', 'the nominal rate', function (p) { return p.i + '%'; }), L('\\pi', 'inflation', function (p) { return p.pi + '%'; }), L('r', 'the real rate', '')],
    [P('fin.real.rate.exact', 'WRONG_FORMULA', 'You used the approximation i − π: that is close but not exact.', function (p) { return p.i - p.pi; })]);
  meta('fin.bond.price.1y', 20, 'One payment of 100 + coupon, discounted once.',
    [L('c', 'the annual coupon per 100 face', function (p) { return String(p.c); }), L('y', 'the yield as a decimal', function (p) { return n(p.y / 100, 3); }), L('100', 'the face value repaid', '100')],
    [P('fin.bond.price.1y', 'WRONG_FORMULA', 'You forgot the coupon: the last payment is 100 + c.', function (p) { return 100 / (1 + p.y / 100); })]);
  meta('fin.bond.price.2y', 45, 'If $c = y$ the price is 100 (par). If $c > y$ it is above 100 (premium).',
    [L('c', 'the annual coupon in € per 100 face', function (p) { return String(p.c); }), L('y', 'the yield as a decimal', function (p) { return n(p.y / 100, 3); }), L('100', 'repaid at maturity with the last coupon', '100')],
    [P('fin.bond.price.2y', 'WRONG_FORMULA', 'You forgot the final 100.', function (p) { return p.c / (1 + p.y / 100) + p.c / Math.pow(1 + p.y / 100, 2); })], { p: { c: 5, y: 4 }, answer: 101.8861 });
  meta('fin.zc.price', 25, 'Continuous: $P = 100\\,e^{-y\\tau}$; $e^{-0.4} \\approx 0.67$.',
    [L('P', 'the price per 100 face', ''), L('y', 'the continuous yield as a decimal', function (p) { return n(p.y / 100, 3); }), L('\\tau', 'the years to maturity', function (p) { return String(p.m); })],
    [P('fin.zc.price', 'WRONG_FORMULA', 'You discounted annually: here the yield is continuously compounded.', function (p) { return 100 / Math.pow(1 + p.y / 100, p.m); }), P('fin.zc.price', 'SIGN', 'The exponent is −yτ: the price is below 100.', function (p) { return 100 * Math.exp(p.y / 100 * p.m); })]);
  meta('fin.duration.approx', 25, '$\\frac{\\Delta P}{P} \\approx -D\\,\\Delta y$: duration 6 and +25 bp is −1.5%.',
    [L('P', 'the price now', function (p) { return String(p.P); }), L('D', 'the modified duration', function (p) { return String(p.D); }), L('\\Delta y', 'the yield change as a decimal', function (p) { return p.d + ' bp = ' + n(p.d / 10000, 4); })],
    [P('fin.duration.approx', 'SIGN', 'Yields rise, so the price falls: P (1 − D Δy).', function (p) { return p.P * (1 + p.D * p.d / 10000); }), P('fin.duration.approx', 'UNIT', 'You used bp as a percent: 25 bp is 0.25%, not 25%.', function (p) { return p.P * (1 - p.D * p.d / 100); })]);
  meta('fin.convexity', 45, 'Convexity adds a small positive term: the price falls by less than duration alone says.',
    [L('P', 'the price now', function (p) { return String(p.P); }), L('D', 'the duration', function (p) { return String(p.m); }), L('C', 'the convexity', '100'), L('\\Delta y', 'the yield change as a decimal', function (p) { return p.d + ' bp = ' + n(p.d / 10000, 4); })],
    [P('fin.convexity', 'WRONG_FORMULA', 'You left out the convexity term.', function (p) { return p.P * (1 - p.m * p.d / 10000); }), P('fin.convexity', 'SIGN', 'The convexity term adds to the price: it is +½ C Δy².', function (p) { return p.P * (1 - p.m * p.d / 10000 - 0.5 * 100 * Math.pow(p.d / 10000, 2)); })]);
  meta('fin.duration.zc', 10, 'A zero-coupon bond has one payment, at maturity: its Macaulay duration is its maturity.',
    [L('D', 'the Macaulay duration', ''), L('m', 'the maturity in years', function (p) { return String(p.m); })],
    [P('fin.duration.zc', 'WRONG_FORMULA', 'You divided by (1 + y): that gives the modified duration.', function (p) { return p.m / (1 + p.y / 100); })]);
  meta('fin.credit.spread', 15, 'Spread = difference of the yields, in bp: 1.65% = 165 bp.',
    [L('y_{\\text{corp}}', 'the corporate bond yield', function (p) { return p.c + '%'; }), L('y_{\\text{gov}}', 'the government bond yield', function (p) { return p.g + '%'; })],
    [P('fin.credit.spread', 'UNIT', 'You gave the difference in %, not bp.', function (p) { return p.c - p.g; }), P('fin.credit.spread', 'SIGN', 'The corporate bond yields more: corporate minus government.', function (p) { return (p.g - p.c) * 100; })]);
  meta('fin.taylor', 30, 'Start from $r^* + \\pi$, then add half the inflation gap and half the output gap.',
    [L('i', 'the policy rate', ''), L('r^*', 'the neutral real rate', '2%'), L('\\pi', 'inflation', function (p) { return p.pi + '%'; }), L('\\pi^*', 'the inflation target', '2%'), L('y - y^*', 'the output gap', function (p) { return p.gap + '%'; })],
    [P('fin.taylor', 'WRONG_FORMULA', 'You left out the output gap.', function (p) { return 2 + p.pi + 0.5 * (p.pi - 2); }), P('fin.taylor', 'SIGN', 'A negative output gap lowers the rate: the sign of the gap matters.', function (p) { return 2 + p.pi + 0.5 * (p.pi - 2) - 0.5 * p.gap; })]);
  meta('fin.return.multi', 15, '(1 + a)(1 + b) − 1 = a + b + ab: +50% then −10% is not +40%.',
    [L('a', 'the first return', function (p) { return p.a + '%'; }), L('b', 'the second return', function (p) { return p.b + '%'; })],
    [P('fin.return.multi', 'WRONG_FORMULA', 'You added the returns: they compound.', function (p) { return p.a + p.b; })]);
  meta('fin.return.log', 25, '$\\ln(1 + u) \\approx u - \\frac{u^2}{2}$: a log return is a little below the simple return.',
    [L('S_1/S_0', 'the price ratio', function (p) { return n(p.s / 100, 3); }), L('r_{\\log}', 'the log return', '')],
    [P('fin.return.log', 'WRONG_FORMULA', 'You gave the simple return: the log return is a bit smaller.', function (p) { return p.s - 100; })]);
  meta('fin.vol.annualize', 20, '$\\sqrt{252} \\approx 15.9$: daily volatility × 16.',
    [L('\\sigma_{\\text{daily}}', 'the daily volatility', function (p) { return p.s + '%'; }), L('252', 'trading days in a year', '252')],
    [P('fin.vol.annualize', 'WRONG_FORMULA', 'You multiplied by 252: volatility grows with the square root of time.', function (p) { return p.s * 252; })]);
  meta('fin.vol.deannualize', 20, 'Divide by about 16.',
    [L('\\sigma_{\\text{annual}}', 'the annual volatility', function (p) { return p.s + '%'; }), L('252', 'trading days in a year', '252')],
    [P('fin.vol.deannualize', 'WRONG_FORMULA', 'You divided by 252: volatility scales with the square root of time.', function (p) { return p.s / 252; })]);
  meta('fin.vol.horizon', 15, 'Volatility grows with $\\sqrt{t}$: 9 days is three times 1 day.',
    [L('\\sigma_h', 'the volatility over the horizon', ''), L('\\sigma_{\\text{daily}}', 'the daily volatility', function (p) { return p.s + '%'; }), L('h', 'the days', function (p) { return String(p.h); })],
    [P('fin.vol.horizon', 'WRONG_FORMULA', 'You multiplied by h: it is √h.', function (p) { return p.s * p.h; })]);
  meta('fin.sharpe', 20, 'Excess return per unit of risk. Above 1 is good.',
    [L('\\mu', 'the return', function (p) { return p.mu + '%'; }), L('r_f', 'the risk-free rate', function (p) { return p.rf + '%'; }), L('\\sigma', 'the volatility', function (p) { return p.s + '%'; })],
    [P('fin.sharpe', 'WRONG_FORMULA', 'You forgot to subtract the risk-free rate.', function (p) { return p.mu / p.s; }), P('fin.sharpe', 'RATIO_INVERTED', 'Volatility goes under the excess return.', function (p) { return p.s / (p.mu - p.rf); })]);
  meta('fin.nii', 20, 'Interest received minus interest paid.',
    [L('A', 'the loans (assets)', function (p) { return p.A + ' M€'; }), L('r_A', 'the rate earned', function (p) { return p.rA + '%'; }), L('L', 'the deposits (liabilities)', function (p) { return p.L + ' M€'; }), L('r_L', 'the rate paid', function (p) { return p.rL + '%'; })],
    [P('fin.nii', 'WRONG_FORMULA', '(rA − rL) × A only: the funding is smaller than the assets.', function (p) { return (p.rA - p.rL) / 100 * p.A; })], { p: { A: 100, E: 10, L: 90, rA: 5, rL: 2 }, answer: 3.2 });
  meta('fin.nii.shock', 25, 'Only the deposits reprice: $\\Delta\\text{NII} = -L \\times \\Delta r$.',
    [L('L', 'the deposits that reprice', function (p) { return p.L + ' M€'; }), L('\\Delta r_L', 'the rise in the deposit rate', function (p) { return p.d + ' bp'; })],
    [P('fin.nii.shock', 'SIGN', 'Higher deposit rates cost the bank: NII falls.', function (p) { return p.L * p.d / 10; }), P('fin.nii.shock', 'UNIT', 'The answer is in k€, not M€.', function (p) { return -p.L * p.d / 10000; })]);
  meta('fin.eve.gap', 30, 'The duration gap: assets lose more than liabilities when rates rise.',
    [L('D_A', 'the duration of assets', function (p) { return String(p.DA); }), L('A', 'the assets', function (p) { return p.A + ' M€'; }), L('D_L', 'the duration of liabilities', function (p) { return String(p.DL); }), L('L', 'the liabilities', function (p) { return p.L + ' M€'; }), L('\\Delta y', 'the rate rise', function (p) { return p.d + ' bp'; })],
    [P('fin.eve.gap', 'SIGN', 'Rates rise, so EVE falls when assets have longer duration.', function (p) { return (p.DA * p.A - p.DL * p.L) * p.d / 10000; }), P('fin.eve.gap', 'WRONG_FORMULA', 'You left out the liabilities.', function (p) { return -p.DA * p.A * p.d / 10000; })]);
  meta('fin.var.gauss', 30, '95% → $1.65\\sigma$, 99% → $2.33\\sigma$.',
    [L('z', 'the one-sided normal quantile', function (p) { return String(Z[p.a] || ''); }), L('\\sigma', 'the daily volatility as a decimal', function (p) { return n(p.s / 100, 3); }), L('V', 'the position value', function (p) { return p.V + ' M€'; })],
    [Object.assign(P('fin.var.gauss', 'WRONG_FORMULA', 'You used the two-sided z (1.96 / 2.576).', function (p) { return (Z2[p.a] || 0) * p.s / 100 * p.V * 1000; }))],
    { p: { V: 1, s: 2, a: 95 }, answer: 32.898 });
  meta('fin.var.horizon', 15, '$\\sqrt{10} \\approx 3.16$. Assumes i.i.d. returns and no change of position.',
    [L('\\text{VaR}_1', 'the 1-day VaR', function (p) { return p.v + ' k€'; }), L('h', 'the horizon in days', function (p) { return String(p.h); }), L('\\sqrt{h}', 'volatility grows with the square root of time', '')],
    [P('fin.var.horizon', 'WRONG_FORMULA', 'You multiplied by h (linear): it is √h.', function (p) { return p.v * p.h; })], { p: { v: 1000, h: 10 }, answer: 3162.2777 });
  meta('fin.es.gauss', 45, 'ES is always above VaR at the same level: the average of the tail, not its edge.',
    [L('\\sigma', 'the daily volatility as a decimal', function (p) { return n(p.s / 100, 3); }), L('V', 'the position value', function (p) { return p.V + ' M€'; }), L('\\varphi(z)', 'the normal density at the quantile', ''), L('1 - \\alpha', 'the tail probability', function (p) { return n(1 - p.a / 100, 3); })],
    [P('fin.es.gauss', 'WRONG_FORMULA', 'You gave the VaR: expected shortfall averages the tail beyond it.', function (p) { return (Z[p.a] || 0) * p.s / 100 * p.V * 1000; })]);
  meta('fin.var.port2', 45, 'Diversification: the portfolio VaR is below the sum of the two VaRs.',
    [L('v_1, v_2', 'the position values', function (p) { return p.v1 + ' and ' + p.v2 + ' M€'; }), L('\\sigma_1, \\sigma_2', 'the daily volatilities', function (p) { return p.s1 + '% and ' + p.s2 + '%'; }), L('\\rho', 'the correlation', function (p) { return String(p.rho); }), L('z', 'the quantile', function (p) { return String(Z[p.a] || ''); })],
    [P('fin.var.port2', 'WRONG_FORMULA', 'You added the two VaRs: that assumes correlation 1.', function (p) { return (Z[p.a] || 0) * (p.v1 * p.s1 + p.v2 * p.s2) * 10; }),
      P('fin.var.port2', 'WRONG_FORMULA', 'You left out the correlation term.', function (p) { var a = p.v1 * p.s1 / 100, b = p.v2 * p.s2 / 100; return (Z[p.a] || 0) * Math.sqrt(a * a + b * b) * 1000; })]);
  meta('fin.backtest.expected', 15, '99% over 250 days: about 2.5 exceptions.',
    [L('\\alpha', 'the VaR confidence level', function (p) { return p.a + '%'; }), L('N', 'the days tested', function (p) { return String(p.N); })],
    [P('fin.backtest.expected', 'WRONG_FORMULA', 'You used α, not 1 − α: exceptions are the days beyond the VaR.', function (p) { return p.a / 100 * p.N; }), P('fin.backtest.expected', 'UNIT', 'You forgot ÷100 on 1 − α.', function (p) { return (100 - p.a) * p.N; })]);
  meta('fin.spread.cost', 30, 'Selling at the bid costs half the spread against the mid.',
    [L('\\text{ask} - \\text{bid}', 'the spread', function (p) { return n(p.s, 2); }), L('\\text{mid}', 'the average of bid and ask', function (p) { return String(p.m); }), L('V', 'the amount traded', function (p) { return p.V + ' M€'; })],
    [P('fin.spread.cost', 'WRONG_FORMULA', 'You used the full spread: against the mid you pay only half.', function (p) { return p.s / p.m * p.V * 1000; }), P('fin.spread.cost', 'UNIT', 'The answer is in k€, not M€.', function (p) { return 0.5 * p.s / p.m * p.V; })]);
  meta('fin.sqrt.impact', 30, 'Impact grows with the square root of the size: 4% of volume costs $\\sigma \\times 0.2$.',
    [L('\\sigma', 'the daily volatility', function (p) { return p.s + '%'; }), L('Q/V', 'the share of the daily volume traded', function (p) { return p.q + '% = ' + n(p.q / 100, 2); }), L('Y', 'a constant of order 1', '1')],
    [P('fin.sqrt.impact', 'WRONG_FORMULA', 'You used a linear impact: it is the square root.', function (p) { return p.s * p.q / 100; }), P('fin.sqrt.impact', 'UNIT', 'You took the root of 4, not of 0.04.', function (p) { return p.s * Math.sqrt(p.q); })]);
  meta('fin.lvar', 30, 'Add the cost of getting out: half the spread times the position.',
    [L('\\text{VaR}', 'the VaR', function (p) { return p.v + ' k€'; }), L('s', 'the relative bid-ask spread', function (p) { return p.s + '%'; }), L('V', 'the position', function (p) { return p.V + ' M€'; })],
    [P('fin.lvar', 'WRONG_FORMULA', 'You added the full spread, not half.', function (p) { return p.v + p.s / 100 * p.V * 1000; }), P('fin.lvar', 'WRONG_FORMULA', 'You forgot the liquidity cost.', function (p) { return p.v; })]);
  meta('fin.gauss.cond.mean', 25, 'With unit variances $E[X \\mid Y = y] = \\rho\\,y$.',
    [L('\\rho', 'the correlation', function (p) { return String(p.rho); }), L('y', 'the value observed', function (p) { return String(p.y); })],
    [P('fin.gauss.cond.mean', 'RATIO_INVERTED', 'You divided by ρ instead of multiplying.', function (p) { return p.y / p.rho; }), P('fin.gauss.cond.mean', 'WRONG_FORMULA', 'You used ρ² y.', function (p) { return p.rho * p.rho * p.y; })]);
  meta('fin.gauss.cond.var', 20, 'Observing $Y$ reduces the variance of $X$ by $\\rho^2$: $1 - \\rho^2$.',
    [L('\\rho', 'the correlation', function (p) { return String(p.rho); })],
    [P('fin.gauss.cond.var', 'WRONG_FORMULA', 'You used 1 − ρ: it is the square of ρ.', function (p) { return 1 - p.rho; }), P('fin.gauss.cond.var', 'WRONG_FORMULA', 'You gave ρ².', function (p) { return p.rho * p.rho; })]);
  meta('fin.kalman.step', 45, 'The gain $K = \\frac{P}{P + R}$ says how far to move towards the observation.',
    [L('P', 'the prior variance', function (p) { return String(p.P); }), L('R', 'the observation noise variance', function (p) { return String(p.R); }), L('y', 'the observation', function (p) { return String(p.y); }), L('K', 'the Kalman gain', '')],
    [soft('RATIO_INVERTED', 'You used R/(P + R) as the gain: the prior variance goes on top.')]);
  meta('fin.mahalanobis.indep', 30, 'Scale each move by its volatility, square it, add them up.',
    [L('x_i', 'the move of factor i', function (p) { return p.x.join(', '); }), L('\\sigma_i', 'the volatility of factor i', function (p) { return p.s.join(', '); })],
    [P('fin.mahalanobis.indep', 'WRONG_FORMULA', 'You did not square the scaled moves.', function (p) { return p.x.reduce(function (a, x, i) { return a + Math.abs(x / p.s[i]); }, 0); }), P('fin.mahalanobis.indep', 'WRONG_FORMULA', 'You left out the volatilities.', function (p) { return p.x.reduce(function (a, x) { return a + x * x; }, 0); })]);
  meta('fin.rst.linear', 60, 'The most likely loss scenario lies along $\\Sigma w$; its distance is $\\frac{\\ell}{\\sqrt{w^\\top \\Sigma w}}$.',
    [L('\\rho', 'the correlation', function (p) { return String(p.rho); }), L('\\ell', 'the loss to reach', function (p) { return String(p.l); }), L('w^\\top \\Sigma w', 'the variance of the P&L', function (p) { return n(p.w * p.w * (2 + 2 * p.rho), 3); })],
    [P('fin.rst.linear', 'WRONG_FORMULA', 'You forgot the square root of the P&L variance.', function (p) { return p.l / (p.w * p.w * (2 + 2 * p.rho)); }), P('fin.rst.linear', 'WRONG_FORMULA', 'You ignored the correlation.', function (p) { return p.l / (Math.abs(p.w) * Math.SQRT2); })]);

  // Rows for the symbols a formula uses on its right-hand side or as a name (found by the legend-completeness test).
  function more(id, rows) {
    var t = F.get(id);
    rows.forEach(function (r) { t.legend.push({ sym: r[0], meaning: r[1], here: r[2] === undefined ? '' : r[2] }); });
  }
  more('quant.square', [L('a', 'the round part of the number (a multiple of 10 or 100)', ''), L('b', 'the small part, added or subtracted', '')]);
  more('quant.compound', [L('j', 'the index of the term in the sum', ''), L('C(k, j)', 'the binomial coefficient: k choose j', '')]);
  more('quant.exp.approx', [L('e', "Euler's number, about 2.718", '2.718')]);
  more('quant.ev', [L('x_i', 'the payoff of outcome i', ''), L('p_i', 'the probability of outcome i', ''), L('X', 'the random gain', '')]);
  more('fin.pv.cont', [L('e', "Euler's number, about 2.718", '2.718')]);
  more('fin.zc.price', [L('e', "Euler's number, about 2.718", '2.718')]);
  more('fin.real.rate', [L('r', 'the real rate', '')]);
  more('fin.bond.price.1y', [L('P', 'the price per 100 face', '')]);
  more('fin.bond.price.2y', [L('P', 'the price per 100 face', '')]);
  more('fin.duration.zc', [L('T', 'the maturity in years', function (p) { return String(p.m); })]);
  more('fin.credit.spread', [L('s', 'the credit spread', '')]);
  more('fin.return.log', [L('u', 'the simple return as a decimal', function (p) { return n(p.s / 100 - 1, 3); })]);
  more('fin.var.gauss', [L('\\alpha', 'the confidence level', function (p) { return p.a + '%'; })]);
  more('fin.gauss.cond.mean', [L('X', 'the variable you want', ''), L('Y', 'the variable you observe', '')]);
  more('fin.gauss.cond.var', [L('X', 'the variable you want', ''), L('Y', 'the variable you observe', '')]);
  more('fin.kalman.step', [L('m', 'the posterior mean', ''), L('V', 'the posterior variance', '')]);
  more('fin.mahalanobis.indep', [L('D^2', 'the squared Mahalanobis distance', '')]);
  more('fin.rst.linear', [L('x^*', 'the most likely scenario', ''), L('d^*', 'its Mahalanobis distance', '')]);
  more('eq.pe', [L('P/E', 'the price-earnings ratio', '')]);
  more('eq.total.return', [L('R', 'the total return in %', '')]);
  more('der.forward.price', [L('F', 'the forward price', '')]);
  more('risk.expected.loss', [L('EL', 'the expected loss', '')]);
  more('ops.cost.per.trade', [L('c', 'the cost per trade', '')]);
  more('prob.dice.sum', [L('P', 'the probability', '')]);
  more('prob.at.least.one', [L('P', 'the probability', '')]);
  more('prob.ev.game', [L('EV', 'the expected value', '')]);
  more('prob.bayes', [L('P(F \\mid +)', 'the probability of a fault given a positive test', '')]);
  more('prob.clock.angle', [L('\\theta', 'the angle between the hands, in degrees', '')]);
})();
