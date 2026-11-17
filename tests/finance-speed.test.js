// Superday upgrade: answer parsing (k / m / bn, fractions), thin-space display, the weighting, speed against target,
// error tags in the stats and the report.
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/finance-templates.js');
require('../js/finance-sd1.js'); require('../js/finance-sd2.js'); require('../js/finance-meta.js');
const S = require('../js/stats.js');
const P = require('../js/progression.js');
const T = require('../js/finance-tags.js');

test('parse: magnitude suffixes read in the unit of the answer', () => {
  assert.equal(F.parse('2.5bn', '€'), 2.5e9);
  assert.equal(F.parse('10m', '€'), 1e7);
  assert.equal(F.parse('40k', '€'), 40000);
  assert.equal(F.parse('32.9k', 'k€'), 32.9);
  assert.equal(F.parse('2m', 'M€'), 2);
  assert.equal(F.parse('40bp', 'bp'), 40);
  assert.equal(F.parse('1,5%', '%'), 1.5);
  assert.equal(F.parse('-16 234', ''), -16234);
  assert.equal(F.parse('−16 234', ''), -16234);
  assert.equal(F.parse('abc', ''), null);
  assert.equal(F.parse('k', ''), null);
});
test('parse: a/b only where the template allows fractions', () => {
  assert.equal(F.parse('3/8', '', true), 0.375);
  assert.equal(F.parse('3/8', ''), null);
  const q = F.make('prob.dice.sum', 3);
  const ways = Math.round(q.answer * 36);
  assert.ok(F.check(q, ways + '/36').ok, 'a fraction is accepted');
  assert.ok(F.check(q, String(F.round(q.answer, 4))).ok, 'and its 4-decimal form');
  assert.ok(!F.check(q, String(q.answer + 0.01)).ok);
});

test('display: thin spaces from 10 000 up, never inside decimals or years', () => {
  const th = F.THIN;
  assert.equal(F.group('answer 11716.5938 and 10000000 and 2026 and 9999'), 'answer 11' + th + '716.5938 and 10' + th + '000' + th + '000 and 2026 and 9999');
  assert.equal(F.group('12345'), '12' + th + '345');
  assert.equal(F.group('9999'), '9999');
  assert.equal(F.group('1234567.891'), '1' + th + '234' + th + '567.891');   // the integer part only
  const rich = F.groupRich('PV $= 10000000 \\times 1.05$ and 123456');
  assert.ok(rich.includes('10\\,000\\,000'), 'inside maths: \\, so MathML keeps separate digits');
  assert.ok(rich.includes('123' + th + '456'));
  assert.ok(!F.make('units.bp.pnl', 5).answerText.includes(th), 'stored text is never grouped');
});

test('weight: 1 + 2 × wrong rate + slowness + over-target share + 0.5 for a tagged latest miss', () => {
  assert.equal(F.weight(null, 1000), 3);
  assert.equal(F.weight({ n: 5, acc: 1, med: 1000 }, 2000), 1);
  assert.equal(F.weight({ n: 5, acc: 0.5, med: 2000 }, 2000), 2);
  assert.equal(F.weight({ n: 5, acc: 0.5, med: 2000, over: 0.4 }, 2000), 2.4);
  assert.equal(F.weight({ n: 5, acc: 0.5, med: 2000, over: 0.4, lastMissTag: 'UNIT' }, 2000), 2.9);
  assert.ok(F.weight({ n: 5, acc: 1, med: 1000, over: 0, lastMissTag: '' }, 2000) >= 1);
});

// A FINANCE round: [tpl, seed, given, timeMs]; wrong answers are typed values.
function round(day, rows) {
  return {
    id: 'r' + day, startedAt: '2026-11-' + day + 'T10:00:00.000Z', mode: 'FINANCE', score: 0, settings: { kind: 'practice' },
    questions: rows.map(([tpl, seed, given, timeMs]) => {
      const q = F.make(tpl, seed), ok = F.check(q, given).ok;
      return { op: 'fin', tpl, seed, fam: q.family, cat: q.category, shown: q.promptText, answer: q.answerText, given, correct: ok, timeMs, wrongAttempts: ok ? 0 : 1 };
    })
  };
}
test('financeStats: speed against target, tags, last miss tag', () => {
  const a = F.make('bank.cet1', 1), b = F.make('bank.roe', 2), c = F.make('opt.call.pnl', 3);
  const rounds = [round('10', [
    ['bank.cet1', 1, String(a.p.R / a.p.C * 100), 9000],   // RATIO_INVERTED, within the 15 s target
    ['bank.roe', 2, String(b.answer), 12000],               // right, over the 10 s target
    ['opt.call.pnl', 3, String(c.answer), 4000]             // right, within
  ])];
  const fs = S.financeStats(rounds);
  assert.equal(fs.n, 3);
  assert.equal(fs.cat['Bank ratios'].n, 2);
  assert.equal(fs.cat['Bank ratios'].over, 0.5, 'one of two bank answers over target');
  assert.equal(fs.cat['Bank ratios'].target, 12500, 'median of the targets (15 s and 10 s)');
  assert.equal(fs.cat['Options'].over, 0);
  assert.deepEqual(fs.cat['Bank ratios'].tags, ['RATIO_INVERTED']);
  assert.equal(fs.tpl['bank.cet1'].lastMissTag, 'RATIO_INVERTED');
  assert.equal(fs.tpl['bank.roe'].lastMissTag, '');
  assert.equal(fs.timed, 3); assert.equal(fs.over, 1);
  assert.deepEqual(T.top(fs.tags, 3), [{ tag: 'RATIO_INVERTED', n: 1 }]);
});
test('a tag the person chose overrides the detected one; sprint records use the first wrong value', () => {
  const q = F.make('bank.cet1', 1);
  const rec = (extra) => Object.assign({ op: 'fin', tpl: 'bank.cet1', seed: 1, given: String(q.answer), correct: false, wrongAttempts: 1, timeMs: 5000 }, extra);
  assert.equal(T.tagOfRecord(rec({ given: String(q.p.R / q.p.C * 100) })), 'RATIO_INVERTED');
  assert.equal(T.tagOfRecord(rec({ given: String(q.p.R / q.p.C * 100), tag: 'SIGN', tagBy: 'user' })), 'SIGN');
  assert.equal(T.tagOfRecord(rec({ correct: true, wrongGiven: String(q.p.R / q.p.C * 100) })), 'RATIO_INVERTED');
  assert.equal(T.tagOfRecord(rec({ correct: false, skipped: true, given: null })), 'TIMEOUT');
  assert.equal(T.tagOfRecord({ op: 'fin', tpl: 'bank.cet1', seed: 1, given: String(q.answer), correct: true, wrongAttempts: 0, timeMs: 1000 }), null);
});
test('the weakest-first weighting prefers slow and tagged templates', () => {
  const rounds = [round('10', [['bank.cet1', 1, '999', 9000], ['bank.roe', 2, String(F.make('bank.roe', 2).answer), 3000]])];
  const fs = S.financeStats(rounds), w = (id) => F.weight(fs.tpl[id], fs.ref[F.get(id).family]);
  assert.ok(w('bank.cet1') > w('bank.roe'));
});

test('report: Finance section has per-topic accuracy, median vs target, within target and tags', () => {
  const a = F.make('bank.cet1', 1);
  const rounds = [round('10', [['bank.cet1', 1, String(a.p.R / a.p.C * 100), 9000], ['bank.roe', 2, String(F.make('bank.roe', 2).answer), 12000]])];
  const text = P.summary({ rounds, settings: {}, presets: [] }, new Date('2026-11-11T10:00:00Z'));
  const i = text.indexOf('## Finance tab');
  assert.ok(i >= 0, 'section present');
  const sec = text.slice(i, text.indexOf('\n## ', i + 5) < 0 ? undefined : text.indexOf('\n## ', i + 5));
  assert.match(sec, /Per topic \(weakest first\)/);
  assert.match(sec, /- Bank ratios: 50% of 2, median 10\.5 s vs target 12\.5 s, 50% within target, tags: RATIO_INVERTED 1/);
  assert.match(sec, /Top mistakes: RATIO_INVERTED 1\./);
});
