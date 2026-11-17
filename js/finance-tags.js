/*
 * finance-tags.js — which kind of mistake a wrong Finance answer was. Pure and DOM-free (node-testable).
 * detect(q, given, timeMs): the template's own pitfalls first (a wrong value for a typical mistake, within the tolerance
 * of what you typed), then generic patterns on the right answer (a power of ten, the sign, the inverse, a near miss), then
 * TIMEOUT (nothing typed, or a wrong answer slower than 3 × the target). Anything else is UNTAGGED.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var F = AT.Finance;
  if (!F) { F = require('./finance-templates.js'); require('./finance-sd1.js'); require('./finance-sd2.js'); require('./finance-meta.js'); }   // node: every template

  var TAGS = ['UNIT', 'RATIO_INVERTED', 'FX_DIRECTION', 'WRONG_FORMULA', 'SIGN', 'ARITHMETIC', 'TIMEOUT'];
  var LABEL = {
    UNIT: 'Unit or scale', RATIO_INVERTED: 'Ratio upside down', FX_DIRECTION: 'Currency direction', WRONG_FORMULA: 'Wrong formula',
    SIGN: 'Sign', ARITHMETIC: 'Arithmetic slip', TIMEOUT: 'Too slow', UNTAGGED: 'Not classified'
  };
  var WORDS = {
    UNIT: 'The size is off by a power of ten, or the unit is mixed up (%, bp, k, m, bn).',
    RATIO_INVERTED: 'The ratio is the wrong way up.',
    FX_DIRECTION: 'The currency conversion went the wrong way.',
    WRONG_FORMULA: 'A different formula from the one that applies here.',
    SIGN: 'The size is right but the sign is not.',
    ARITHMETIC: 'The method looks right and the arithmetic is a little off.',
    TIMEOUT: 'No answer, or far over the target time.',
    UNTAGGED: 'No known pattern matches this answer.'
  };

  function near(a, b, rel) { return Math.abs(a - b) <= rel * Math.max(Math.abs(b), 1e-12) + 1e-12; }

  // The template's own pitfall whose value you typed (first match), or null.
  function byPitfall(t, p, given) {
    var list = (t && t.pitfalls) || [];
    for (var i = 0; i < list.length; i++) {
      var x = list[i];
      if (!x.value || !x.tag || (x.applies && !x.applies(p))) continue;
      var v = x.value(p);
      if (!isFinite(v)) continue;
      var w = Math.max(F.tolWidth(t.tol ? t.tol(p) : { type: 'round' }, v, t.dp || 0), 1e-9 * Math.max(1, Math.abs(v)));
      if (Math.abs(given - v) <= w) return x;
    }
    return null;
  }

  // The generic pattern on the right answer, or null.
  function generic(ans, given) {
    if (!isFinite(ans) || !isFinite(given) || ans === 0) return null;
    var k;
    for (k = 1; k <= 4; k++) {
      if (near(given, ans * Math.pow(10, k), 0.01) || near(given, ans / Math.pow(10, k), 0.01)) return 'UNIT';
    }
    if (near(given, -ans, 0.01)) return 'SIGN';
    if (near(given, 1 / ans, 0.02) || near(given, 100 / ans, 0.02) || near(given, 10000 / ans, 0.02)) return 'RATIO_INVERTED';
    if (Math.abs(given - ans) <= 0.1 * Math.abs(ans)) return 'ARITHMETIC';
    return null;
  }

  // q: { tpl, p, answer, target? }; given: the parsed number, or null for no answer. → a tag, never for a right answer.
  function detect(q, given, timeMs) {
    var t = F.get(q.tpl);
    var target = (q.target || (t && t.target) || 0) * 1000;
    if (given === null || given === undefined || !isFinite(given)) return 'TIMEOUT';
    var hit = t && q.p ? byPitfall(t, q.p, given) : null;
    if (hit) return hit.tag;
    var g = generic(q.answer, given);
    if (g) return g;
    if (target && timeMs > 3 * target) return 'TIMEOUT';
    return 'UNTAGGED';
  }

  // The pitfall text that matches the typed answer (for "Your mistake"), or '' when only a generic tag applies.
  function pitfallText(q, given) {
    var t = F.get(q.tpl);
    var hit = t && q.p && given !== null && isFinite(given) ? byPitfall(t, q.p, given) : null;
    return hit ? hit.text : '';
  }

  // The tag of a saved question: the one you chose (tagBy 'user'), else detected from what you typed. null for a question
  // answered right first try, for concept questions, and for a pause with nothing typed. wrongGiven = the first wrong value
  // typed in a sprint question that was then answered right.
  function tagOfRecord(rec) {
    if (!rec || rec.op !== 'fin') return null;
    if (rec.tag) return rec.tag;
    var ok = !!rec.correct && !rec.wrongAttempts && !rec.skipped && !rec.learned;
    if (ok) return null;
    if (rec.skipped) return 'TIMEOUT';
    var t = F.get(rec.tpl);
    if (!t || t.kind === 'choice') return null;
    var typed = rec.wrongGiven !== undefined && rec.wrongGiven !== null ? rec.wrongGiven : (rec.correct && rec.wrongAttempts ? null : rec.given);
    if (typed === null || typed === undefined || typed === '') return rec.learned ? null : (rec.correct ? 'UNTAGGED' : 'TIMEOUT');
    var q;
    try { q = F.make(rec.tpl, rec.seed); } catch (e) { return null; }
    var v = F.parse(typed, q.unit, q.fracInput);
    return detect({ tpl: rec.tpl, p: q.p, answer: q.answer, target: t.target }, v, rec.timeMs);
  }

  // Counts per tag over a list of tags (empty and UNTAGGED are ignored), most frequent first, at most n.
  function top(tags, n) {
    var c = {};
    (tags || []).forEach(function (g) { if (g && g !== 'UNTAGGED') c[g] = (c[g] || 0) + 1; });
    return Object.keys(c).map(function (g) { return { tag: g, n: c[g] }; })
      .sort(function (a, b) { return b.n - a.n || TAGS.indexOf(a.tag) - TAGS.indexOf(b.tag); }).slice(0, n || 3);
  }

  var api = { TAGS: TAGS, LABEL: LABEL, WORDS: WORDS, detect: detect, tagOfRecord: tagOfRecord, pitfallText: pitfallText, top: top, generic: generic };
  AT.FinanceTags = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
