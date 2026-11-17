// Superday templates (js/finance-sd*.js): each worked example from the spec is a unit test, 1,000 seeds stay finite and
// in range, every pitfall that applies differs from the right answer, and every symbol has a legend row.
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/finance-templates.js');
const before = new Set(F.list().map((t) => (typeof t === 'string' ? t : t.id)));
require('../js/finance-sd1.js');
require('../js/finance-sd2.js');
const NEW = F.list().map((t) => (typeof t === 'string' ? t : t.id)).filter((id) => !before.has(id));
const SEEDS = Array.from({ length: 1000 }, (_, i) => (Math.imul(i + 1, 2654435761) >>> 0));

test('parts 1 and 2 register the 55 new templates', () => { assert.equal(NEW.length, 55); });

for (const id of NEW) {
  const t = F.get(id);
  test(id + ': worked example', () => {
    assert.ok(t.example, 'has an example');
    const a = t.answer(t.example.p);
    assert.ok(Math.abs(a - t.example.answer) <= 1e-4 * Math.max(1, Math.abs(a)), 'answer ' + a + ' vs ' + t.example.answer);
  });
  test(id + ': 1,000 seeds finite, pitfalls clear of the answer, legend complete', () => {
    for (const s of SEEDS) {
      const q = F.make(id, s);
      assert.ok(Number.isFinite(q.answer), 'finite');
      assert.ok(q.prompt && q.steps.length, 'text');
      assert.ok(t.target >= 5 && t.target <= 60, 'target in range');
      const w = 2 * F.tolWidth(t.tol(q.p), q.answer, t.dp);
      for (const x of t.pitfalls) {
        if (!x.value || (x.applies && !x.applies(q.p))) continue;
        assert.ok(Math.abs(x.value(q.p) - q.answer) > w, id + ' seed ' + s + ' pitfall equals answer');
      }
      for (const r of t.legend) assert.equal(typeof (typeof r.here === 'function' ? r.here(q.p) : r.here), 'string');
    }
    assert.ok(t.legend.length > 0 && t.shortcut && t.pitfalls.length > 0 && t.formula && t.tex);
  });
}

// ---------- the older templates (teaching data in finance-meta.js) ----------
require('../js/finance-meta.js');
const OLD = [...before].filter((id) => F.get(id).kind !== 'choice');

test('every numeric template has its teaching data', () => {
  assert.equal(OLD.length, 55);
  for (const id of OLD.concat(NEW)) {
    const t = F.get(id);
    assert.ok(t.legend && t.legend.length, id + ' legend');
    assert.ok(t.shortcut, id + ' shortcut');
    assert.ok(t.target >= 5 && t.target <= 60, id + ' target ' + t.target);
    assert.ok(t.pitfalls && t.pitfalls.length, id + ' pitfalls');
    for (const x of t.pitfalls) assert.ok(['UNIT', 'RATIO_INVERTED', 'FX_DIRECTION', 'WRONG_FORMULA', 'SIGN', 'ARITHMETIC'].includes(x.tag), id + ' tag ' + x.tag);
  }
});
for (const id of OLD) {
  const t = F.get(id);
  test(id + ' (older): pitfalls clear of the answer, legend rows render, example', () => {
    if (t.example) assert.ok(Math.abs(t.answer(t.example.p) - t.example.answer) <= 1e-4 * Math.max(1, Math.abs(t.example.answer)), 'example ' + t.answer(t.example.p));
    for (const s of SEEDS.slice(0, 300)) {
      const q = F.make(id, s);
      const w = 2 * F.tolWidth(q.tol, q.answer, q.dp || 0);
      for (const x of t.pitfalls) {
        if (!x.value || (x.applies && !x.applies(q.p))) continue;
        assert.ok(Number.isFinite(x.value(q.p)) && Math.abs(x.value(q.p) - q.answer) > w, id + ' seed ' + s);
      }
      for (const r of t.legend) assert.equal(typeof (typeof r.here === 'function' ? r.here(q.p) : r.here), 'string');
    }
  });
}

// ---------- legend completeness: every symbol of the formula has a row ----------
// Symbols read from the template's TeX: Latin letters outside \text{…} and commands, and Greek or other symbol commands.
const SKIP = new Set(['frac', 'tfrac', 'times', 'left', 'right', 'sqrt', 'cdot', 'approx', 'max', 'min', 'ln', 'exp', 'text', 'quad', 'qquad', 'sum',
  'Rightarrow', 'mid', 'bar', 'operatorname', 'log', 'pm', 'le', 'ge', 'infty', 'to', 'cdots', 'ldots', 'dots', 'top', 'varphi', 'Phi']);
function symbols(tex) {
  let s = tex.replace(/\\(text|operatorname)\{[^}]*\}/g, ' ');
  const out = new Set();
  s = s.replace(/\\([a-zA-Z]+)/g, (m, c) => { if (!SKIP.has(c)) out.add('\\' + c); return ' '; });
  for (const tok of s.match(/[A-Za-z]+/g) || []) { if (/^[A-Z]{2,}$/.test(tok)) out.add(tok); else for (const ch of tok) out.add(ch); }   // EL, PD, LGD stay whole; ab, rT are products
  return out;
}
const legendText = (t) => t.legend.map((r) => r.sym).join(' ¦ ');
// Known false positives are listed here by id with the reason; the rule itself is not weakened.
const FALSE_POSITIVE = {};   // none left: 	frac is skipped as a command, acronyms stay whole, products are split into letters
test('every symbol in a formula has a legend row (false positives are named, not hidden)', () => {
  const missing = [];
  for (const id of OLD.concat(NEW)) {
    const t = F.get(id);
    if (!t.tex) continue;
    const lt = legendText(t);
    for (const sy of symbols(t.tex)) {
      if (sy.length === 1 ? !new RegExp('(^|[^A-Za-z\\\\])' + sy + '([^A-Za-z]|$)').test(lt.replace(/\\[a-zA-Z]+/g, ' ')) : !lt.includes(sy)) missing.push(id + ': ' + sy);
    }
  }
  assert.deepEqual(missing.filter((m) => !(m.split(':')[0] in FALSE_POSITIVE)), []);
});
