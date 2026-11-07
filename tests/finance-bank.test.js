// The curated intuition bank (js/finance-bank.js): shape, coverage, links and option shuffling.
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/finance-bank.js');

const bank = F.list({ families: ['intuition'] });
const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z"(])/).filter(Boolean).length;

test('at least 60 questions over all 7 categories', () => {
  assert.ok(bank.length >= 60, `only ${bank.length}`);
  const cats = new Set(bank.map((t) => t.category));
  assert.deepEqual([...cats].sort(), Object.values(F.BANK_CATEGORIES).sort());
  for (const c of cats) assert.ok(bank.filter((t) => t.category === c).length >= 6, c);
});

test('every question is well formed', () => {
  const prompts = new Set();
  for (const t of bank) {
    const q = F.make(t.id, 1);
    assert.equal(q.kind, 'choice', t.id);
    assert.ok([1, 2, 3].includes(t.difficulty), t.id);
    assert.ok(q.prompt.length > 15 && /[?:.]$/.test(q.prompt), t.id);
    assert.ok(!prompts.has(q.prompt), 'duplicate prompt ' + t.id);
    prompts.add(q.prompt);
    assert.equal(q.options.length, 4, t.id);
    assert.equal(new Set(q.options.map((o) => o.toLowerCase())).size, 4, t.id);
    assert.ok(q.options.every((o) => o.trim().length > 0), t.id);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, t.id);
    const n = sentences(q.whyText);
    assert.ok(n >= 2 && n <= 4, `${t.id}: ${n} sentences`);
    if (q.related) {
      const r = F.get(q.related);
      assert.ok(r, `${t.id}: related ${q.related} does not exist`);
      assert.notEqual(r.family, 'intuition', t.id);
    }
  }
});

test('options are shuffled by the seed, the right answer follows', () => {
  for (const t of bank) {
    const right = F.make(t.id, 1).answer, positions = new Set();
    for (let seed = 1; seed <= 40; seed++) {
      const q = F.make(t.id, seed);
      assert.equal(q.options[q.correct], right, t.id);
      assert.ok(F.check(q, q.correct).ok && !F.check(q, (q.correct + 1) % 4).ok, t.id);
      positions.add(q.correct);
    }
    assert.ok(positions.size >= 3, `${t.id}: the right answer sits in too few places`);
    assert.deepEqual(F.make(t.id, 99).options, F.make(t.id, 99).options);
  }
});

test('mixed plans can draw intuition questions', () => {
  const G = require('../js/generator.js');
  const plan = F.mixedPlan(20, G.mulberry32(9));
  assert.ok(plan.some((x) => F.get(x.tpl).family === 'intuition'));
  assert.equal(new Set(plan.map((x) => F.get(x.tpl).family)).size, 4);
});
