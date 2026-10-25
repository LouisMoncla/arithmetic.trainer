const test = require('node:test');
const assert = require('node:assert');
const G = require('../js/generator.js');
const S = require('../js/stats.js');
const P = require('../js/progression.js');
const L = require('../js/lessons.js');

test('every trick has exactly one lesson, in exactly one group', () => {
  const tricks = Object.keys(G.trickNames()).filter((t) => !L.HEART.types.includes(t)).sort();   // fd, df: the fractions page
  const grouped = L.GROUPS.flatMap((g) => g.types);
  assert.deepStrictEqual(grouped.slice().sort(), tricks);
  assert.strictEqual(new Set(grouped).size, grouped.length);
  tricks.forEach((t) => {
    const l = L.LESSONS[t];
    assert.ok(l && l.short && l.rule && l.why, t);
  });
});

test('a Learn round counts as its own mode per trick, with a readable name', () => {
  const r = { mode: 'LEARN', settings: { types: ['x11'], duration: 60 } };
  assert.strictEqual(S.effMode(r), 'LEARN-x11');
  assert.strictEqual(P.modeLabel('LEARN-x11'), 'Learn: × 11');
  assert.strictEqual(P.modeLabel('P2'), 'Foundations');
  assert.strictEqual(S.effMode({ mode: 'EXTERNAL', linkedMode: 'P3' }), 'P3');
});

test('a Learn round is compared only with rounds of the same trick', () => {
  const at = (h) => new Date(2026, 9, 1, h).toISOString();
  const round = (id, type, score, h) => ({ id, mode: 'LEARN', startedAt: at(h), score, settings: { types: [type], duration: 60 }, questions: [] });
  const rs = [round('a', 'x11', 30, 9), round('b', 'x25', 50, 10), round('c', 'x11', 20, 11)];
  const rep = S.roundReport(rs, rs[2]);
  assert.deepStrictEqual({ place: rep.rank.place, of: rep.rank.of }, { place: 2, of: 2 });   // the × 25 round is not in the ranking
});
