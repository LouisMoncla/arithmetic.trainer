/*
 * finance-core.js — the engine of the Finance tab. Pure logic, no DOM.
 * Runs in the browser (window.AT.Finance) and in Node (module.exports).
 *
 * A question comes from a template and a seed: F.make(templateId, seed) always gives the same
 * question, so any question can be reproduced from (templateId, seed). Templates are registered by
 * finance-templates.js (procedural) and finance-bank.js (curated multiple choice).
 *
 * Template fields (see README, "Adding a finance template"):
 *   id, family ('arith' | 'quant' | 'fin' | 'intuition'), category, difficulty (1–3)
 *   kind      'numeric' (default) | 'fraction' (answer a/b in lowest terms) | 'choice' (params give options,
 *             correct, explanation and optional steps)
 *   unit      '' | '%' | 'bp' | '€' | 'k€' | 'M€' | 'years'      (the answer is expressed in this unit)
 *   dp        decimals of the displayed answer (number or function of p)
 *   tol(p)    tolerance: {type:'exact'} | {type:'round'} | {type:'abs', v} | {type:'rel', v}; default round
 *   positive  true when a value ≤ 0 makes no sense (prices, volatilities): no such distractor
 *   params(rng), valid?(p), prompt(p), answer(p), distractors?(p), steps(p), formula, why
 *   tex       the formula in a LaTeX subset (js/tex.js), drawn as real maths on screen; ormula stays the plain-text version
 * The answer, the steps and the distractors are all computed from the same parameters.
 * Prompts, steps, why sentences, options and explanations are rich text: prose with maths between $…$ (js/tex.js).
 * F.make keeps them rich (screens draw them with TeX.rich) and adds plain twins (promptText, stepsText, whyText,
 * optionsText, and answerText for choices) for what is stored, printed or compared.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var G = AT.Generator || (typeof require !== 'undefined' ? require('./generator.js') : null);
  var TeX = AT.TeX || (typeof require !== 'undefined' ? require('./tex.js') : null);

  // ---------- constants (shown in explanations when used) ----------

  var C = {
    z: { 90: 1.2816, 95: 1.6449, 97.5: 1.9600, 99: 2.3263, 99.5: 2.5758 },
    // standard normal density at z_α, keyed like z
    phi: { 95: 0.1031, 97.5: 0.0584, 99: 0.0267, 99.5: 0.0145 },
    sqrt252: 15.87, sqrt12: 3.464, sqrt52: 7.211,
    ln2: 0.693
  };

  // ---------- numbers ----------

  // Round half away from zero without binary surprises (1.005 → 1.01).
  function round(x, dp) {
    var s = x < 0 ? -1 : 1, a = Math.abs(x);
    return s * Number(Math.round(Number(a + 'e' + dp)) + 'e-' + dp);
  }
  // Display: rounded to dp, trailing zeros dropped, typographic minus, no "−0".
  function fmt(x, dp) {
    var s = round(x, dp).toFixed(dp);
    if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
    if (/^-0$/.test(s)) s = '0';
    return s.replace('-', '−');
  }
  function withUnit(text, unit) {
    if (!unit) return text;
    if (unit === '%') return text + '%';
    return text + ' ' + unit;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }

  // ---------- random helpers (all draws go through the seeded rng) ----------

  function int(rng, lo, hi) { return G.randInt(rng, lo, hi); }
  function pick(rng, arr) { return arr[int(rng, 0, arr.length - 1)]; }
  // lo, lo+step, …, hi without float drift.
  function grid(rng, lo, hi, step) {
    var n = Math.round((hi - lo) / step), dp = decimals(step);
    return round(lo + int(rng, 0, n) * step, dp);
  }
  function decimals(x) { var s = String(x); return s.indexOf('.') < 0 ? 0 : s.length - s.indexOf('.') - 1; }
  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = int(rng, 0, i), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ---------- answers: parsing and checking ----------

  // Parse a typed number. Accepts "90.7", "90,7", "−5.1", "1 000", "1,234.5", "7%", "25bp", "0.07".
  // A % or bp suffix converts into the expected unit ('%', 'bp' or '' = a plain decimal);
  // a bare number is read in the expected unit. Returns null when it is not a number.
  function parse(input, unit) {
    if (input === null || input === undefined) return null;
    var s = String(input).toLowerCase().replace(/[\s   ]/g, '').replace(/[−–]/g, '-');
    if (!s) return null;
    var sfx = null;
    if (/bps?$/.test(s)) { sfx = 'bp'; s = s.replace(/bps?$/, ''); }
    else if (/%$/.test(s)) { sfx = '%'; s = s.slice(0, -1); }
    else if (unit && unit !== '%' && unit !== 'bp') {
      var u = unit.toLowerCase();
      if (s.slice(-u.length) === u) s = s.slice(0, -u.length);
      else if (u === 'years' && /(y|yrs?|years?)$/.test(s)) s = s.replace(/(y|yrs?|years?)$/, '');
      if (s.charAt(0) === '€') s = s.slice(1);
    }
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/,/g, '');           // 1,234.5
    else if ((s.match(/,/g) || []).length > 1) s = s.replace(/,/g, '');                // 1,234,567
    else s = s.replace(',', '.');                                                       // 90,7
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    var v = parseFloat(s);
    if (!isFinite(v)) return null;
    if (sfx) {
      var to = unit === '%' ? '%' : unit === 'bp' ? 'bp' : unit ? null : '';
      if (to === null) return null;                     // "7%" makes no sense for an answer in €
      var inPct = sfx === '%' ? v : v / 100;            // value in %
      v = to === '%' ? inPct : to === 'bp' ? inPct * 100 : inPct / 100;
    }
    return v;
  }
  // "3/8" → [3, 8]; null if not a fraction of integers.
  function parseFraction(input) {
    var m = /^\s*([+-−]?\d+)\s*\/\s*(\d+)\s*$/.exec(String(input || ''));
    if (!m || +m[2] === 0) return null;
    return [parseInt(m[1].replace('−', '-'), 10), parseInt(m[2], 10)];
  }

  function within(tol, x, answer, dp) {
    var eps = 1e-9 * Math.max(1, Math.abs(answer));
    switch (tol.type) {
      case 'exact': return Math.abs(x - answer) <= eps;
      case 'abs': return Math.abs(x - answer) <= tol.v + eps;
      case 'rel': return Math.abs(x - answer) <= tol.v * Math.abs(answer) + eps;
      default: return Math.abs(x - answer) <= 0.5 * Math.pow(10, -dp) + eps;   // round: rounded or unrounded
    }
  }

  // Full check (Enter, Practice): {ok, value} where value is what was understood (null = not a number).
  function check(q, input) {
    if (q.kind === 'choice') return { ok: Number(input) === q.correct, value: Number(input) };
    if (q.kind === 'fraction') {
      var f = parseFraction(input);
      if (!f) return { ok: false, value: null };
      return { ok: f[0] === q.frac[0] && f[1] === q.frac[1], value: f[0] + '/' + f[1] };
    }
    var v = parse(input, q.unit);
    if (v === null) return { ok: false, value: null };
    return { ok: within(q.tol, v, q.answer, q.dp), value: v };
  }
  // Sprint auto-accept: only where the answer has one right spelling (exact or rounded), and only
  // when the typed value equals the displayed answer, so a half-typed number never fires.
  function autoOk(q, input) {
    if (!q.auto) return false;
    if (q.kind === 'fraction') return check(q, input).ok;
    var v = parse(input, q.unit);
    return v !== null && Math.abs(v - q.shownAnswer) <= 1e-9 * Math.max(1, Math.abs(q.shownAnswer));
  }

  // ---------- registry ----------

  var REG = {}, ORDER = [];
  function register(t) {
    if (REG[t.id]) throw new Error('Duplicate template ' + t.id);
    t.kind = t.kind || 'numeric';
    REG[t.id] = t; ORDER.push(t.id);
    return t;
  }
  function get(id) { return REG[id] || null; }
  function list(filter) {
    return ORDER.map(get).filter(function (t) {
      if (!filter) return true;
      if (filter.families && filter.families.indexOf(t.family) < 0) return false;
      if (filter.categories && filter.categories.length && filter.categories.indexOf(t.category) < 0) return false;
      if (filter.difficulty && filter.difficulty.length && filter.difficulty.indexOf(t.difficulty) < 0) return false;
      if (filter.kinds && filter.kinds.indexOf(t.kind) < 0) return false;
      return true;
    });
  }

  // ---------- questions ----------

  var DP_WORD = ['rounded to a whole number', 'one decimal', '2 decimals', '3 decimals', '4 decimals'];
  var UNIT_WORD = { '%': 'in %', bp: 'in bp', '€': 'in €', 'k€': 'in k€', 'M€': 'in M€', years: 'in years' };
  // The line under the prompt that says how to answer.
  function askLine(q) {
    if (q.kind === 'choice') return '';
    if (q.kind === 'fraction') return 'As a fraction in lowest terms, like 3/8.';
    var u = UNIT_WORD[q.unit] || '', how = '';
    if (q.tol.type === 'rel') how = 'approximately, within ' + fmt(q.tol.v * 100, 1) + '%';
    else if (q.tol.type === 'abs') how = 'within ±' + fmt(q.tol.v, 4);
    else if (q.tol.type === 'round') how = DP_WORD[q.dp] || q.dp + ' decimals';
    var parts = [u, how].filter(Boolean);
    if (!parts.length) return '';
    var s = 'Answer ' + parts.join(', ') + '.';
    return s;
  }

  function valueText(q, x) {
    if (q.kind === 'fraction') return String(x);
    return fmt(x, q.dp);
  }

  // Up to 3 wrong options: the template's plausible mistakes first, then scaled slips
  // (decimal point, sign, factor 2). None within tolerance, none showing the same text.
  function pickDistractors(t, p, q) {
    var cands = t.distractors ? t.distractors(p) : [];
    if (q.kind === 'numeric') {
      var a = q.answer, step = Math.pow(10, -q.dp);
      cands = cands.concat([a * 10, a / 10, -a, a * 2, a / 2, a + Math.max(1, 10 * step), a - Math.max(1, 10 * step), a + 1, a - 1]);
    }
    var out = [], seen = {};
    seen[q.answerText] = 1;
    for (var i = 0; i < cands.length && out.length < 3; i++) {
      var c = cands[i];
      if (q.kind === 'numeric') {
        if (typeof c !== 'number' || !isFinite(c)) continue;
        if (within(q.tol, c, q.answer, q.dp) || Math.abs(c - q.answer) < 0.5 * Math.pow(10, -q.dp)) continue;
        if (t.positive && c <= 0) continue;   // no negative prices or volatilities
      } else if (q.kind === 'fraction') {
        var f = parseFraction(c);
        if (!f || f[1] <= 0 || gcd(f[0], f[1]) !== 1 || f[0] * q.frac[1] === q.frac[0] * f[1]) continue;
      }
      var txt = withUnit(valueText(q, c), q.unit);
      if (seen[txt]) continue;
      seen[txt] = 1;
      out.push(c);
    }
    return out;
  }

  // The question for (id, seed). opts.choice: also build 4 options (numeric and fraction templates).
  function make(id, seed, opts) {
    var t = REG[id];
    if (!t) throw new Error('Unknown template ' + id);
    seed = seed >>> 0;
    var rng = G.mulberry32(seed), p, tries = 0;
    do { p = t.params(rng); tries++; } while (t.valid && !t.valid(p) && tries < 200);
    if (t.valid && !t.valid(p)) throw new Error('No valid parameters for ' + id + ' seed ' + seed);
    var q = { tpl: id, seed: seed, family: t.family, category: t.category, difficulty: t.difficulty, kind: t.kind, p: p,
      prompt: t.prompt(p), unit: t.unit || '', formula: t.formula || '', tex: t.tex || '' };
    q.promptText = TeX.richPlain(q.prompt);
    if (t.kind === 'choice') {
      // Curated: shuffle the 4 options with the seed; q.correct is the index after shuffling.
      var order = shuffle(rng, [0, 1, 2, 3]);
      q.options = order.map(function (k) { return p.options[k]; });
      q.correct = order.indexOf(p.correct);
      q.answer = q.options[q.correct];
      q.answerText = TeX.richPlain(q.answer);
      q.optionsText = q.options.map(TeX.richPlain);
      q.steps = p.steps || [];
      q.stepsText = q.steps.map(TeX.richPlain);
      q.why = p.explanation;
      q.whyText = TeX.richPlain(q.why);
      q.related = p.related || null;
      q.ask = '';
      q.auto = false;
      return q;
    }
    q.dp = typeof t.dp === 'function' ? t.dp(p) : (t.dp || 0);
    if (t.kind === 'fraction') {
      q.frac = t.answer(p);
      q.answer = q.frac[0] + '/' + q.frac[1];
      q.tol = { type: 'exact' };
      q.answerText = q.answer;
      q.auto = true;
    } else {
      q.answer = t.answer(p);
      q.tol = t.tol ? t.tol(p) : { type: 'round' };
      q.shownAnswer = round(q.answer, q.dp);
      q.answerText = withUnit(fmt(q.answer, q.dp), q.unit);
      q.auto = q.tol.type === 'exact' || q.tol.type === 'round';
    }
    q.ask = askLine(q);
    // The last step: the answer, a fraction drawn as one.
    var shownAnswer = q.kind === 'fraction' ? '$\\frac{' + q.frac[0] + '}{' + q.frac[1] + '}$' : q.answerText;
    q.steps = t.steps(p).concat(['Answer: ' + shownAnswer + (q.tol.type === 'rel' || q.tol.type === 'abs' ? ' (approximately)' : '') + '.']);
    q.why = typeof t.why === 'function' ? t.why(p) : (t.why || '');
    q.stepsText = q.steps.map(TeX.richPlain);
    q.whyText = TeX.richPlain(q.why);
    q.distractors = pickDistractors(t, p, q);
    if (opts && opts.choice) {
      var all = shuffle(rng, [q.answer].concat(q.distractors));
      q.choiceFrom = q.kind;
      q.options = all.map(function (x) { return withUnit(valueText(q, x), q.unit); });
      q.optionsText = q.options.slice();
      q.correct = all.indexOf(q.answer);
      q.kind = 'choice';
      q.auto = false;
    }
    return q;
  }

  // A fresh 32-bit seed from any rng (Math.random in the UI, a seeded rng in tests).
  function newSeed(rng) { return Math.floor((rng || Math.random)() * 4294967296) >>> 0; }

  // ---------- selection ----------

  // Weight of a template from its stats {n, acc, med} and my overall median time `ref`.
  // Unseen = 3 (try it); otherwise 1 + 2 × wrong rate + slowness (0–2). Never below 1: the floor
  // keeps every selected template in rotation.
  function weight(st, ref) {
    if (!st || !st.n) return 3;
    var slow = ref && st.med ? Math.min(2, Math.max(0, st.med / ref - 1)) : 0;
    return 1 + 2 * (1 - st.acc) + slow;
  }
  function weightedPick(rng, ids, w) {
    var ws = ids.map(function (id) { return Math.max(0.01, w ? w(id) : 1); }), tot = 0;
    ws.forEach(function (x) { tot += x; });
    var r = rng() * tot;
    for (var i = 0; i < ids.length; i++) { r -= ws[i]; if (r < 0) return ids[i]; }
    return ids[ids.length - 1];
  }
  // A source of (id, seed) pairs that avoids the same template twice in a row when it can.
  function makeSource(ids, rng, w) {
    var last = null;
    return function () {
      var id, tries = 0;
      do { id = weightedPick(rng, ids, w); tries++; } while (ids.length > 1 && id === last && tries < 20);
      last = id;
      return { tpl: id, seed: newSeed(rng) };
    };
  }
  // Mixed / interview: n questions, families in turn, difficulty rising from 1 to 3.
  function mixedPlan(n, rng, families, w) {
    families = families || ['arith', 'quant', 'fin', 'intuition'];
    var out = [], fams = shuffle(rng, families);
    for (var i = 0; i < n; i++) {
      var d = Math.min(3, 1 + Math.floor(3 * i / n)), fam = fams[i % fams.length];
      var ids = list({ families: [fam], difficulty: [d] }).map(function (t) { return t.id; });
      if (!ids.length) ids = list({ families: [fam], difficulty: d > 1 ? [d - 1, d] : [1, 2] }).map(function (t) { return t.id; });
      if (!ids.length) ids = list({ families: [fam] }).map(function (t) { return t.id; });
      var id = weightedPick(rng, ids, w);
      out.push({ tpl: id, seed: newSeed(rng) });
    }
    return out;
  }

  function families() { return { arith: 'Arithmetic', quant: 'Quant mental math', fin: 'Finance calculations', intuition: 'Finance intuition' }; }
  // Categories in registry order, optionally for some families.
  function categories(fams) {
    var seen = {}, out = [];
    list(fams ? { families: fams } : null).forEach(function (t) { if (!seen[t.category]) { seen[t.category] = 1; out.push(t.category); } });
    return out;
  }

  var api = {
    C: C, round: round, fmt: fmt, withUnit: withUnit, gcd: gcd, decimals: decimals,
    int: int, pick: pick, grid: grid, shuffle: shuffle,
    parse: parse, parseFraction: parseFraction, within: within, check: check, autoOk: autoOk,
    register: register, get: get, list: list, make: make, newSeed: newSeed, askLine: askLine,
    weight: weight, weightedPick: weightedPick, makeSource: makeSource, mixedPlan: mixedPlan,
    families: families, categories: categories
  };
  AT.Finance = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
