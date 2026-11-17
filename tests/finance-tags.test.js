// Error tags: one crafted case per tag, plus the pure helpers.
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/finance-templates.js');
require('../js/finance-sd1.js');
require('../js/finance-sd2.js');
const T = require('../js/finance-tags.js');

const q = (tpl, p) => ({ tpl, p, answer: F.get(tpl).answer(p), target: F.get(tpl).target });

test('UNIT: bp read as %', () => { assert.equal(T.detect(q('units.bp.pnl', { N: 2.5e9, x: 40 }), 2.5e9 * 40 * 0.01, 5000), 'UNIT'); });
test('UNIT: a power of ten with no template pitfall', () => { assert.equal(T.detect(q('rates.simple', { N: 10000, r: 5, T: 3 }), 15, 5000), 'UNIT'); });
test('RATIO_INVERTED: capital under the assets', () => { assert.equal(T.detect(q('bank.cet1', { C: 60, R: 450 }), 750, 5000), 'RATIO_INVERTED'); });
test('FX_DIRECTION: multiplied where it should divide', () => { assert.equal(T.detect(q('fx.usd.eur', { s: 1.1, U: 110000 }), 121000, 5000), 'FX_DIRECTION'); });
test('WRONG_FORMULA: the call without its premium', () => { assert.equal(T.detect(q('opt.call.pnl', { K: 100, c: 4, S: 110 }), 10, 5000), 'WRONG_FORMULA'); });
test('SIGN: a short position read as long', () => { assert.equal(T.detect(q('eq.short.pnl', { q: 100, P0: 80, P1: 86 }), 600, 5000), 'SIGN'); });
test('SIGN: generic, the answer with the other sign', () => { assert.equal(T.detect(q('rates.simple', { N: 10000, r: 5, T: 3 }), -1500, 5000), 'SIGN'); });
test('ARITHMETIC: within 10% of the answer', () => { assert.equal(T.detect(q('rates.perpetuity', { C: 100, r: 5 }), 1900, 5000), 'ARITHMETIC'); });
test('TIMEOUT: no answer', () => { assert.equal(T.detect(q('rates.perpetuity', { C: 100, r: 5 }), null, 60000), 'TIMEOUT'); });
test('TIMEOUT: a wrong answer over three times the target, with no other pattern', () => {
  const x = q('rates.perpetuity', { C: 100, r: 5 });   // target 15 s
  assert.equal(T.detect(x, 777, 50000), 'TIMEOUT');
  assert.equal(T.detect(x, 777, 20000), 'UNTAGGED');
});
test('a pitfall only fires within the tolerance of its value', () => {
  const x = q('bank.cet1', { C: 60, R: 450 });
  assert.equal(T.detect(x, 750 * 1.004, 5000), 'RATIO_INVERTED');
  assert.equal(T.pitfallText(x, 750), 'You divided RWA by CET1: capital goes on top.');
  assert.equal(T.pitfallText(x, 12.9), '');
});
test('no template pitfall matches the right answer (200 seeds per template)', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => (Math.imul(i + 1, 2654435761) >>> 0));
  for (const t of F.list()) {
    const id = typeof t === 'string' ? t : t.id;
    if (!(F.get(id).pitfalls || []).length) continue;
    for (const s of seeds) {
      const m = F.make(id, s);
      if (m.kind === 'choice') continue;
      assert.equal(T.pitfallText({ tpl: id, p: m.p }, m.answer), '', id + ' seed ' + s);
    }
  }
});
test('top: counts, ignores UNTAGGED, ties by tag order, at most n', () => {
  assert.deepEqual(T.top(['UNIT', 'SIGN', 'UNIT', null, 'UNTAGGED', 'SIGN', 'TIMEOUT', 'ARITHMETIC'], 3),
    [{ tag: 'UNIT', n: 2 }, { tag: 'SIGN', n: 2 }, { tag: 'ARITHMETIC', n: 1 }]);
  assert.deepEqual(T.top([], 3), []);
});
