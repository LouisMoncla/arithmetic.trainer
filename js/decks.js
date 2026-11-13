/*
 * decks.js — Learn decks: one engine for every deck of cards (Probability, Series & limits, Trigonometry…).
 * Pure, no DOM: runs in the browser (window.AT.Decks, AT.registerDeck) and in Node.
 *
 * A deck is data. A deck file calls AT.registerDeck({ id, title, section, idPrefix, version, chapters, scopes,
 * reference, cards }) (format in js/decks/*.js). Decks.api(deck) gives the engine bound to one deck: validation,
 * filters, answer checking (6 choices, true/false, typed numbers and exact expressions), the Learn queue, Sprint
 * picking, mastery, progress, the cheat sheet and the report section. Probability registers through js/proba.js
 * with its own field names (lecture, lessons 'proba-…', settings.proba) and uses exactly this engine.
 *
 * Answers are saved like Taylor's: a session is one LEARN round whose settings.lesson starts with the deck's
 * lessonPrefix ('proba-' for Probability, 'deck-<id>-' for the others) and whose questions are
 * { op: 'pb', id, game, <chapter field>, correct, timeMs, hinted, t, shown, answer, given, skipped?, again? }.
 * Answers whose id left the deck are ignored (and stay stored). Stats treats every such round as outside the
 * mental-math practice (S.isProba).
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var node = typeof module !== 'undefined';
  var TeX = AT.TeX || (node ? require('./tex.js') : null);
  var Expr = AT.Expr || (node ? require('./expr.js') : null);
  var Plot = AT.Plot || (node ? require('./plot.js') : null);

  // Mastery time target = median seconds per answer.
  var GAMES = [
    { id: 'laws', label: 'Law cards', kind: 'mcq', target: 8 },
    { id: 'statements', label: 'Statements & hypotheses', kind: 'mcq', target: 12 },
    { id: 'tool', label: 'Which tool?', kind: 'mcq', target: 15 },
    { id: 'truefalse', label: 'True or false', kind: 'tf', target: 8 },
    { id: 'formulas', label: 'Formulas to know', kind: 'mcq', target: 10 },
    { id: 'proof', label: 'Proof key step', kind: 'mcq', target: 15 },
    { id: 'compute', label: 'Quick compute', kind: 'num', target: 40 }
  ];
  var GAME = {};
  GAMES.forEach(function (g) { GAME[g.id] = g; });
  var MASTER_DAYS = 3;       // mastery looks at the last 3 practice days
  var LEARN_BLOCK = 25;      // Learn asks to continue every 25 cards
  var NO_REPEAT = 4;         // the same card never twice within 4 questions (a comeback excepted)

  function kind(card) { return GAME[card.game] ? GAME[card.game].kind : null; }
  function target(card) { return +card.target > 0 ? +card.target : GAME[card.game].target; }
  function isGraph(ch) { return !!ch && typeof ch === 'object' && !Array.isArray(ch); }   // a graph choice { plot, label? }
  function byIdOf(cards) { var m = {}; cards.forEach(function (c) { m[c.id] = c; }); return m; }
  function pct(x) { return Math.round(x * 100) + '%'; }
  function plainText(str) { try { return TeX.richPlain(str); } catch (e) { return String(str); } }
  function shorten(str, n) { str = plainText(str).replace(/\s+/g, ' ').trim(); return str.length > n ? str.slice(0, n - 1) + '…' : str; }
  function median(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function iso(t) { return new Date(t).toISOString(); }
  function texErrors(str) { try { TeX.richStrict(str); return null; } catch (e) { return e.message; } }
  function tolerance(card) { return +card.tol > 0 ? +card.tol : Math.max(0.0005, 0.001 * Math.abs(card.answer)); }
  function shuffle(a, rng) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function weighted(list, w, rng) {
    var ws = list.map(w), total = ws.reduce(function (a, b) { return a + b; }, 0), r = rng() * total, i = 0;
    while (i < list.length - 1 && r >= ws[i]) { r -= ws[i]; i++; }
    return list[i];
  }
  // Weight of a seen, non-mastered card: low accuracy and a long time since it was last seen come first.
  function needWeight(st, now) {
    var days = st.last ? Math.min(7, Math.max(0, (now - st.last) / 864e5)) : 7;
    return (1.2 - (st.acc === null ? 0 : st.acc)) * (1 + days);
  }

  // ---------- the registry ----------

  var decks = [], byDeckId = {};

  function metaOf(def) {
    if (typeof def.meta === 'function') { var m = def.meta() || {}; return { version: m.version, chapters: m.chapters }; }
    return { version: def.version, chapters: def.chapters };
  }
  // The errors of a deck definition itself (not its cards). [] = fine.
  function defErrors(def) {
    var e = [];
    if (!def || typeof def !== 'object') return ['the deck must be an object'];
    if (typeof def.id !== 'string' || !/^[a-z][a-z0-9]{0,23}$/.test(def.id)) e.push('id must be lowercase letters and digits, starting with a letter');
    ['title', 'section'].forEach(function (f) { if (typeof def[f] !== 'string' || !def[f].trim()) e.push(f + ' must be a non-empty string'); });
    if (typeof def.idPrefix !== 'string' || !/^[A-Z]{1,3}$/.test(def.idPrefix)) e.push('idPrefix must be 1 to 3 capital letters');
    var m = metaOf(def);
    if (typeof m.version !== 'string' || !m.version.trim()) e.push('version must be a non-empty string');
    var chapters = m.chapters, keys = chapters && typeof chapters === 'object' ? Object.keys(chapters) : [];
    if (!keys.length) e.push('chapters must list the chapter titles, like { 1: "Usual limits" }');
    keys.forEach(function (k) { if (!/^[1-9]\d*$/.test(k) || typeof chapters[k] !== 'string' || !chapters[k].trim()) e.push('chapters: "' + k + '" must be a positive number with a title'); });
    if (def.scopes !== null && def.scopes !== undefined) {
      if (!Array.isArray(def.scopes) || !def.scopes.length) e.push('scopes must be null or a list of { label, maxChapter }');
      else def.scopes.forEach(function (s, i) {
        if (!s || typeof s.label !== 'string' || !s.label.trim() || keys.indexOf(String(s.maxChapter)) < 0) e.push('scopes[' + i + '] needs a label and a maxChapter that is one of the chapters');
      });
    }
    if (def.reference !== undefined) {
      if (!Array.isArray(def.reference)) e.push('reference must be a list of { title, plot }');
      else def.reference.forEach(function (r, i) {
        if (!r || typeof r.title !== 'string' || !r.title.trim()) { e.push('reference[' + i + '] needs a title'); return; }
        Plot.validatePlot(r.plot).forEach(function (x) { e.push('reference[' + i + '] "' + r.title + '": ' + x); });
      });
    }
    if (!Array.isArray(def.cards) && typeof def.cards !== 'function') e.push('cards must be a list');
    return e;
  }
  function normalise(def) {
    var errors = defErrors(def);
    if (errors.length) return { deck: null, errors: errors };
    var cards = def.cards;
    return { errors: [], deck: {
      id: def.id, title: def.title, section: def.section, idPrefix: def.idPrefix, noun: def.noun || 'Chapter', chapterField: def.chapterField || 'chapter',
      scopes: def.scopes || null, scopeNote: def.scopeNote || '', reference: def.reference || [], blurb: def.blurb || '', lessonPrefix: def.lessonPrefix || 'deck-' + def.id + '-',
      settingsKey: def.settingsKey || null, reportTitle: def.reportTitle || def.title + ' (Learn deck)',
      meta: function () { return metaOf(def); }, getCards: typeof cards === 'function' ? cards : function () { return cards; }
    } };
  }
  // AT.registerDeck: add a deck. A bad definition, a repeated id or prefix is skipped with a console warning.
  function register(def) {
    var fx = typeof window !== 'undefined' && def && def.id !== 'proba' && window.AT_DECK_FIXTURES && window.AT_DECK_FIXTURES[def.id];
    if (fx) def = fx;   // tests: a fixture replaces the shipped deck of that id
    var n = normalise(def);
    function warn(msg) { if (typeof console !== 'undefined') console.warn('Deck ' + (def && def.id || '?') + ' not registered: ' + msg); }
    if (!n.deck) { warn(n.errors.join('; ')); return null; }
    if (byDeckId[n.deck.id]) { warn('a deck with this id exists'); return null; }
    if (decks.some(function (d) { return d.idPrefix === n.deck.idPrefix; })) { warn('idPrefix ' + n.deck.idPrefix + ' is used by another deck'); return null; }
    decks.push(n.deck); byDeckId[n.deck.id] = n.deck;
    return n.deck;
  }

  // ---------- the engine, bound to one deck ----------

  function make(deck) {
    var memo = null, cache = null;
    // the chapters: sorted numbers, their range, and whether they are 1..n without gaps
    function C() {
      if (memo) return memo;
      var ch = deck.meta().chapters || {}, nums = Object.keys(ch).map(Number).sort(function (a, b) { return a - b; });
      var min = nums[0], max = nums[nums.length - 1];
      memo = { chapters: ch, nums: nums, min: min, max: max, contiguous: nums.length === max - min + 1 };
      return memo;
    }
    function rangeText() { var c = C(); return c.contiguous ? c.min + '-' + c.max : c.nums.join(','); }
    function idRe() {
      var c = C();
      return new RegExp('^' + deck.idPrefix + (c.contiguous && c.max <= 9 ? '[' + c.min + '-' + c.max + ']' : '(?:' + c.nums.join('|') + ')') + '-[a-z0-9-]+$');
    }
    function chapterOf(card) { return card[deck.chapterField]; }
    var noun = deck.noun.toLowerCase();

    // ---------- validation ----------

    function plotErrors(plot, where) { return Plot.validatePlot(plot).map(function (x) { return where + ': ' + x; }); }
    function choiceTexErrors(s, where, errs) { if (typeof s === 'string') { var e = texErrors(s); if (e) errs.push(where + ': ' + e); } }

    // The errors of one card, without the id-uniqueness rule. [] = valid.
    function cardErrors(c) {
      var errs = [], cc = C(), re = idRe(), ch = c && c[deck.chapterField];
      if (!c || typeof c !== 'object') return ['not an object'];
      var idOk = typeof c.id === 'string' && re.test(c.id);
      if (!idOk) errs.push('id must match ' + deck.idPrefix + '<' + rangeText() + '>-<a-z0-9->');
      var chOk = cc.nums.indexOf(ch) >= 0;
      if (!chOk) errs.push(noun + ' must be ' + (cc.contiguous ? cc.min + ' to ' + cc.max : 'one of ' + cc.nums.join(', ')));
      if (idOk && chOk) {
        var m = new RegExp('^' + deck.idPrefix + '(\\d+)-').exec(c.id);
        if (m && +m[1] !== ch) errs.push('the id starts with ' + deck.idPrefix + m[1] + ' but ' + noun + ' is ' + ch);
      }
      var k = GAME[c.game] ? GAME[c.game].kind : null;
      if (!k) errs.push('game must be one of ' + GAMES.map(function (g) { return g.id; }).join(', '));
      if (typeof c.prompt !== 'string' || !c.prompt.trim()) errs.push('prompt is empty');
      if (typeof c.explain !== 'string' || !c.explain.trim()) errs.push('explain is empty');
      if (k === 'mcq') {
        if (isGraph(c.answer)) graphChoiceErrors(c, errs);
        else {
          if (typeof c.answer !== 'string' || !c.answer.trim()) errs.push('answer must be a non-empty string');
          if (!Array.isArray(c.distractors) || c.distractors.length < 3 || c.distractors.length > 5) errs.push('distractors must be 3 to 5 strings');
          else {
            var seen = {};
            if (typeof c.answer === 'string') seen[c.answer.trim()] = 'answer';
            c.distractors.forEach(function (d, i) {
              if (isGraph(d)) { errs.push('choices must be all text or all graphs'); return; }
              if (typeof d !== 'string' || !d.trim()) { errs.push('distractor ' + (i + 1) + ' is not a non-empty string'); return; }
              if (seen[d.trim()]) errs.push('distractor ' + (i + 1) + ' repeats ' + (seen[d.trim()] === 'answer' ? 'the answer' : 'another distractor'));
              seen[d.trim()] = 'distractor';
            });
          }
        }
      }
      if (k === 'tf') {
        if (typeof c.answer !== 'boolean') errs.push('true/false answer must be true or false');
        if (c.distractors !== undefined) errs.push('true/false cards have no distractors');
      }
      if (k === 'num') {
        if (typeof c.answer !== 'number' || !isFinite(c.answer)) errs.push('compute answer must be a finite number');
        if (c.tol !== undefined && !(typeof c.tol === 'number' && c.tol > 0)) errs.push('tol must be a number > 0');
        if (c.distractors !== undefined) errs.push('compute cards have no distractors');
        if (c.answerExpr !== undefined) {
          if (typeof c.answerExpr !== 'string') errs.push('answerExpr must be a string');
          else {
            var v = Expr.evalNumber(c.answerExpr);
            if (v === null) errs.push('answerExpr "' + c.answerExpr + '" is not an expression with a value');
            else if (typeof c.answer === 'number' && isFinite(c.answer) && Math.abs(v - c.answer) > tolerance(c)) errs.push('answerExpr evaluates to ' + v + ', not the answer ' + c.answer + ' (tolerance ' + tolerance(c) + ')');
          }
        }
        if (c.answerTex !== undefined && (typeof c.answerTex !== 'string' || !c.answerTex.trim())) errs.push('answerTex must be a non-empty string');
      } else if (c.answerExpr !== undefined || c.answerTex !== undefined) errs.push('answerExpr and answerTex are for compute cards');
      if (c.plot !== undefined) errs = errs.concat(plotErrors(c.plot, 'plot'));
      if (c.explainPlot !== undefined) errs = errs.concat(plotErrors(c.explainPlot, 'explainPlot'));
      if (c.target !== undefined && !(typeof c.target === 'number' && c.target > 0)) errs.push('target must be seconds > 0');
      if (c.complement !== undefined && typeof c.complement !== 'boolean') errs.push('complement must be true or false');
      // every string: balanced $ and maths that tex.js draws
      ['prompt', 'answer', 'hint', 'explain', 'topic', 'source', 'answerTex'].forEach(function (f) { choiceTexErrors(c[f], f, errs); });
      if (Array.isArray(c.distractors)) c.distractors.forEach(function (d, i) { choiceTexErrors(d, 'distractor ' + (i + 1), errs); });
      return errs;
    }
    // A graph MCQ: every choice is { plot, label? }.
    function graphChoiceErrors(c, errs) {
      var list = [c.answer].concat(Array.isArray(c.distractors) ? c.distractors : []);
      if (!Array.isArray(c.distractors) || c.distractors.length < 3 || c.distractors.length > 5) errs.push('distractors must be 3 to 5 graphs');
      var seen = {};
      list.forEach(function (x, i) {
        var where = i === 0 ? 'answer' : 'distractor ' + i;
        if (!isGraph(x) || x.plot === undefined) { errs.push(i === 0 ? 'answer must be { plot }' : 'choices must be all text or all graphs'); return; }
        Object.keys(x).forEach(function (kk) { if (kk !== 'plot' && kk !== 'label') errs.push('unknown field ' + kk + ' in ' + where); });
        plotErrors(x.plot, where + ' plot').forEach(function (e) { errs.push(e); });
        if (x.label !== undefined) {
          if (typeof x.label !== 'string' || !x.label.trim()) errs.push(where + ' label must be a non-empty string');
          else choiceTexErrors(x.label, where + ' label', errs);
        }
        var key = JSON.stringify(x.plot);
        if (seen[key] !== undefined) errs.push(where + ' repeats ' + (seen[key] === 0 ? 'the answer' : 'another choice'));
        else seen[key] = i;
      });
    }
    // Every error of a bank, as "id: message" strings. [] = the bank is valid.
    function validateCards(cards) {
      if (!Array.isArray(cards)) return ['the cards are not an array'];
      var out = [], ids = {};
      cards.forEach(function (c, i) {
        var name = c && typeof c.id === 'string' ? c.id : 'card #' + (i + 1);
        cardErrors(c).forEach(function (e) { out.push(name + ': ' + e); });
        if (c && typeof c.id === 'string') { if (ids[c.id]) out.push(name + ': duplicate id'); ids[c.id] = 1; }
      });
      return out;
    }
    // The usable cards: invalid ones (and later duplicates of an id) are dropped. { cards, errors }.
    function clean(cards) {
      var ok = [], errors = [], ids = {};
      (Array.isArray(cards) ? cards : []).forEach(function (c, i) {
        var errs = cardErrors(c);
        if (!errs.length && ids[c.id]) errs = ['duplicate id'];
        if (errs.length) { errors.push((c && c.id || 'card #' + (i + 1)) + ': ' + errs.join('; ')); return; }
        ids[c.id] = 1;
        ok.push(c);
      });
      return { cards: ok, errors: errors };
    }
    // The deck the app uses, cleaned once: { cards, errors, meta: { version, lectures }, byId, reference }.
    function bank() {
      if (cache) return cache;
      var meta = deck.meta(), c = clean(deck.getCards() || []), ref = [], refErrors = [];
      (deck.reference || []).forEach(function (r) {
        var e = Plot.validatePlot(r.plot);
        if (e.length) refErrors.push('reference "' + r.title + '": ' + e.join('; ')); else ref.push(r);
      });
      var errors = c.errors.concat(refErrors);
      if (errors.length && typeof console !== 'undefined') console.warn(deck.title + ': ' + errors.length + ' invalid card(s) skipped:\n' + errors.join('\n'));
      cache = { cards: c.cards, errors: errors, meta: { version: meta.version, lectures: meta.chapters, chapters: meta.chapters }, byId: byIdOf(c.cards), reference: ref };
      return cache;
    }

    // ---------- settings and filters ----------

    function scopeOf(v) {
      if (deck.scopes) {
        for (var i = 0; i < deck.scopes.length; i++) if (deck.scopes[i].maxChapter === +v) return +v;
        return deck.scopes[0].maxChapter;
      }
      return C().max;
    }
    var DEFAULTS = { scope: scopeOf(undefined), complements: false, game: 'all', lectures: C().nums.slice() };
    // stored { scope, complements, game, lectures (the chapters on) } → a complete, valid object
    function settings(s) {
      s = s || {};
      var nums = C().nums, lectures = Array.isArray(s.lectures) ? s.lectures.filter(function (n) { return nums.indexOf(n) >= 0; }) : nums.slice();
      return { scope: scopeOf(s.scope), complements: s.complements === true, game: GAME[s.game] ? s.game : 'all', lectures: lectures.length ? lectures : nums.slice() };
    }
    // The chapters shown (rows, chips): up to the scope.
    function scopeLectures(s) { var sc = settings(s).scope; return C().nums.filter(function (n) { return n <= sc; }); }
    function scopeLabel(s) {
      s = settings(s);
      if (deck.scopes) { for (var i = 0; i < deck.scopes.length; i++) if (deck.scopes[i].maxChapter === s.scope) return deck.scopes[i].label; }
      return 'all chapters';
    }
    // Cards in scope (complements only when shown): what the progress table counts.
    function inScope(cards, s) {
      s = settings(s);
      return cards.filter(function (c) { return chapterOf(c) <= s.scope && (s.complements || !c.complement); });
    }
    // The cards a session draws from: in scope, then the game and chapter filters, or one table cell { lecture, game }.
    function pool(cards, s, cell) {
      s = settings(s);
      return inScope(cards, s).filter(function (c) {
        if (cell) return chapterOf(c) === cell.lecture && (!cell.game || c.game === cell.game);
        return (s.game === 'all' || c.game === s.game) && s.lectures.indexOf(chapterOf(c)) >= 0;
      });
    }

    // ---------- answers ----------

    // Typed answers: a number or an exact expression (0.375, 3/8, pi/3, sqrt(3)/2, e^6). A finite number, or null.
    function parseNumber(str) { return Expr.evalNumber(str); }
    // given: the chosen choice (MCQ: the same string or graph object), true/false, or the parsed number.
    function check(card, given) {
      var k = kind(card);
      if (k === 'num') return typeof given === 'number' && Math.abs(given - card.answer) <= tolerance(card) + 1e-12;
      return given === card.answer;
    }
    // MCQ: the answer and its distractors, shuffled on every display. True/false: [true, false]. Compute: [].
    function choices(card, rng) {
      var k = kind(card);
      if (k === 'tf') return [true, false];
      if (k === 'num') return [];
      return shuffle([card.answer].concat(card.distractors), rng);
    }
    // What H does: 'text' (the card's hint), 'cut' (half the distractors go), or null (true/false: no hint).
    function hintKind(card, nChoices) {
      if (card.hint) return 'text';
      return kind(card) === 'mcq' && nChoices >= 4 ? 'cut' : null;
    }
    // The choices left after a cut: floor(distractors / 2) of them removed at random, order kept.
    function cut(list, card, rng) {
      var wrong = list.filter(function (c) { return c !== card.answer; }), drop = shuffle(wrong, rng).slice(0, Math.floor(wrong.length / 2));
      return list.filter(function (c) { return drop.indexOf(c) < 0; });
    }
    // Plain words for one choice (saved as the answer given): the text, or a graph's label or description.
    function choiceText(ch) { return isGraph(ch) ? (ch.label ? plainText(ch.label) : Plot.describe(ch.plot)) : plainText(ch); }
    function answerText(card) {
      var k = kind(card);
      if (k === 'tf') return card.answer ? 'True' : 'False';
      if (k === 'num') return card.answerExpr ? card.answerExpr + ' ≈ ' + card.answer : String(card.answer);
      return isGraph(card.answer) ? (card.answer.label || Plot.describe(card.answer.plot)) : card.answer;
    }

    // ---------- history ----------

    // Does this round belong to this deck?
    function mine(r) { return !!r && r.mode === 'LEARN' && !!r.settings && typeof r.settings.lesson === 'string' && r.settings.lesson.indexOf(deck.lessonPrefix) === 0; }
    function lessonOf(kindName, duration) { return deck.lessonPrefix + (kindName === 'learn' ? 'learn' : 'sprint-' + duration); }
    // Every saved answer: { q, t (ms), mode: 'learn'|'sprint' }. With byId, answers to cards no longer in the deck are left out.
    function answers(rounds, byId) {
      var out = [];
      (rounds || []).forEach(function (r) {
        if (!mine(r)) return;
        var start = Date.parse(r.startedAt), mode = r.settings.lesson === lessonOf('learn') ? 'learn' : 'sprint';
        (r.questions || []).forEach(function (q) {
          if (q.op !== 'pb' || (byId && !byId[q.id])) return;
          out.push({ q: q, t: typeof q.t === 'number' ? q.t : start, mode: mode });
        });
      });
      return out.sort(function (a, b) { return a.t - b.t; });
    }
    // The last 3 days (05:00 to 05:00, dayKey = S.dayKey) with any answer in this deck.
    function practiceDays(list, dayKey) {
      var d = {};
      list.forEach(function (a) { d[dayKey(iso(a.t))] = 1; });
      return Object.keys(d).sort().slice(-MASTER_DAYS);
    }
    /*
     * Mastered: over the last 3 practice days, the card has ≥ 2 answers, all right, none hinted or skipped, and their
     * median time is at most its target. Learn and Sprint answers count together. { id: true }.
     */
    function mastery(cards, rounds, dayKey) {
      var byId = byIdOf(cards), list = answers(rounds, byId), days = practiceDays(list, dayKey), by = {}, out = {};
      list.forEach(function (a) { if (days.indexOf(dayKey(iso(a.t))) >= 0) (by[a.q.id] = by[a.q.id] || []).push(a.q); });
      Object.keys(by).forEach(function (id) {
        var qs = by[id];
        if (qs.length >= 2 && qs.every(function (q) { return q.correct && !q.hinted && !q.skipped; }) &&
          median(qs.map(function (q) { return q.timeMs; })) <= target(byId[id]) * 1000) out[id] = true;
      });
      return out;
    }
    /*
     * Per card: { n, right, hinted, acc (right / n, all time), last (ms), lastMiss (ms), state: 'new'|'learning'|'mastered' }.
     * A skip counts as an attempt and a miss.
     */
    function stats(cards, rounds, dayKey) {
      var byId = byIdOf(cards), m = mastery(cards, rounds, dayKey), out = {};
      cards.forEach(function (c) { out[c.id] = { n: 0, right: 0, hinted: 0, acc: null, last: null, lastMiss: null, state: 'new' }; });
      answers(rounds, byId).forEach(function (a) {
        var s = out[a.q.id];
        s.n++; if (a.q.correct) s.right++; if (a.q.hinted) s.hinted++;
        s.last = a.t;
        if (!a.q.correct || a.q.hinted) s.lastMiss = a.t;
      });
      Object.keys(out).forEach(function (id) {
        var s = out[id];
        if (s.n) { s.acc = s.right / s.n; s.state = m[id] ? 'mastered' : 'learning'; }
      });
      return out;
    }

    // ---------- Learn: the next card ----------

    /*
     * A Learn session's queue: { hist: [ids shown], due: [{ id, at }] }. After each answer the UI calls relearn (wrong or
     * hinted, not a comeback): the card comes back once, 3 to 5 questions later.
     */
    function learnQueue() { return { hist: [], due: [] }; }
    function relearn(L, id, rng) {
      var at = L.hist.length - 1 + 3 + Math.floor(rng() * 3);
      L.due.push({ id: id, at: at });
      return at;
    }
    /*
     * The next Learn card: { id, again }. pool = the session's cards in file order; st = stats() including this session.
     *   1. a due comeback (its turn has come);
     *   2. otherwise, half the time, the next card never answered, in file order (the deck follows the course);
     *   3. otherwise a seen card not mastered, weighted towards low accuracy and a long time since last seen;
     *   4. otherwise a mastered card (about 10% of picks while other cards are left).
     * Never the same card twice within 4 questions, except a comeback.
     */
    function nextLearn(L, pool, st, rng, now) {
      var n = L.hist.length;
      var dueI = -1;
      L.due.forEach(function (d, i) { if (d.at <= n && (dueI < 0 || d.at < L.due[dueI].at)) dueI = i; });
      if (dueI >= 0) { var d = L.due.splice(dueI, 1)[0]; L.hist.push(d.id); return { id: d.id, again: true }; }
      var recent = L.hist.slice(-NO_REPEAT), waiting = L.due.map(function (x) { return x.id; });
      var free = pool.filter(function (c) { return recent.indexOf(c.id) < 0 && waiting.indexOf(c.id) < 0; });
      if (!free.length) free = pool.filter(function (c) { return recent.indexOf(c.id) < 0; });
      if (!free.length) {   // a pool of 4 cards or fewer: the one seen longest ago
        var order = pool.slice().sort(function (a, b) { return L.hist.lastIndexOf(a.id) - L.hist.lastIndexOf(b.id); });
        free = order.slice(0, 1);
      }
      var unseen = free.filter(function (c) { return st[c.id].n === 0 && L.hist.indexOf(c.id) < 0; });
      var weak = free.filter(function (c) { return (st[c.id].n > 0 || L.hist.indexOf(c.id) >= 0) && st[c.id].state !== 'mastered'; });
      var strong = free.filter(function (c) { return st[c.id].state === 'mastered'; });
      var pick = null;
      if (unseen.length && rng() < 0.5) pick = unseen[0];
      else if (strong.length && (weak.length || unseen.length) && rng() < 0.1) pick = strong[Math.floor(rng() * strong.length)];
      else if (weak.length) pick = weighted(weak, function (c) { return needWeight(st[c.id], now); }, rng);
      else if (unseen.length) pick = unseen[0];
      else if (strong.length) pick = strong[Math.floor(rng() * strong.length)];
      else pick = free[0];
      L.hist.push(pick.id);
      return { id: pick.id, again: false };
    }
    // Sprint: at random, cards not mastered 3 times as likely (unseen and missed ones a bit more); not one of the last 4.
    function nextSprint(hist, pool, st, rng) {
      var recent = hist.slice(-Math.min(NO_REPEAT, pool.length - 1));
      var free = pool.filter(function (c) { return recent.indexOf(c.id) < 0; });
      if (!free.length) free = pool;
      var c = weighted(free, function (x) {
        var s = st[x.id];
        return s.state === 'mastered' ? 1 : 3 + (s.acc === null ? 1 : 2 * (1 - s.acc));
      }, rng);
      hist.push(c.id);
      return c.id;
    }

    // ---------- progress, cheat sheet, report ----------

    /*
     * The progress table: rows = chapters in scope, columns = games. cells[chapter][game] = { m, t }, plus row and
     * column totals and the grand total.
     */
    function progress(cards, s, st) {
      var lecs = scopeLectures(s), list = inScope(cards, s), cells = {}, rowT = {}, colT = {}, all = { m: 0, t: 0 };
      lecs.forEach(function (l) { cells[l] = {}; rowT[l] = { m: 0, t: 0 }; GAMES.forEach(function (g) { cells[l][g.id] = { m: 0, t: 0 }; }); });
      GAMES.forEach(function (g) { colT[g.id] = { m: 0, t: 0 }; });
      list.forEach(function (c) {
        var m = st[c.id] && st[c.id].state === 'mastered' ? 1 : 0, l = chapterOf(c);
        [cells[l][c.game], rowT[l], colT[c.game], all].forEach(function (x) { x.t++; x.m += m; });
      });
      return { lectures: lecs, cells: cells, rows: rowT, cols: colT, total: all };
    }
    function tag(card) { return deck.idPrefix + chapterOf(card) + ' · ' + GAME[card.game].label; }
    /*
     * The cheat-sheet list (Markdown): cards in scope with ≥ 1 answer and accuracy under 80% or a hinted answer; lowest
     * accuracy first, then the most recent miss; at most 40. TeX stays as its $…$ source.
     */
    function cheatSheet(cards, s, st) {
      var list = inScope(cards, s).filter(function (c) { var x = st[c.id]; return x && x.n >= 1 && (x.acc < 0.8 || x.hinted > 0); });
      list.sort(function (a, b) {
        var x = st[a.id], y = st[b.id];
        return x.acc - y.acc || (y.lastMiss || 0) - (x.lastMiss || 0);
      });
      return list.slice(0, 40).map(function (c) {
        return '- **[' + tag(c) + ']** ' + c.prompt + ' → **' + answerText(c) + '** — ' + c.explain;
      }).join('\n');
    }
    /*
     * The report section ("Copy report for Claude"). meta = { version }. Empty (no lines) when nothing was ever answered.
     */
    function report(cards, meta, s, rounds, dayKey) {
      s = settings(s);
      var byId = byIdOf(cards), all = answers(rounds, byId);
      if (!all.length) return [];
      var st = stats(cards, rounds, dayKey), list = inScope(cards, s), L = [];
      var count = function (cs) {
        var m = 0, seen = 0;
        cs.forEach(function (c) { if (st[c.id].state === 'mastered') m++; if (st[c.id].n) seen++; });
        return { m: m, s: seen, t: cs.length };
      };
      var tot = count(list);
      L.push('## ' + deck.reportTitle);
      L.push('Scope: ' + scopeLabel(s) + (s.complements ? ' with complements' : '') + ' · bank ' + (meta && meta.version || '?'));
      L.push('Cards: mastered ' + tot.m + ' / seen ' + tot.s + ' / total ' + tot.t);
      L.push('Per ' + noun + ': ' + scopeLectures(s).map(function (l) {
        var x = count(list.filter(function (c) { return chapterOf(c) === l; }));
        return deck.idPrefix + l + ' ' + x.m + '/' + x.s + '/' + x.t;
      }).join(' · '));
      var days = practiceDays(all, dayKey), recent = all.filter(function (a) { return days.indexOf(dayKey(iso(a.t))) >= 0 && chapterOf(byId[a.q.id]) <= s.scope; });
      var games = GAMES.map(function (g) {
        var qs = recent.filter(function (a) { return byId[a.q.id].game === g.id; }).map(function (a) { return a.q; });
        if (!qs.length) return null;
        var ok = qs.filter(function (q) { return q.correct && !q.hinted; }).length;
        return g.label + ' ' + pct(ok / qs.length) + ', median ' + (median(qs.map(function (q) { return q.timeMs; })) / 1000).toFixed(1) + ' s (' + qs.length + ')';
      }).filter(Boolean);
      L.push('Per game (last 3 days): ' + (games.length ? games.join('; ') : 'no answers'));
      var weak = list.filter(function (c) { return st[c.id].n > 0; }).sort(function (a, b) {
        return st[a.id].acc - st[b.id].acc || st[b.id].n - st[a.id].n || (a.id < b.id ? -1 : 1);
      }).slice(0, 10);
      L.push('Weakest 10:');
      weak.forEach(function (c) { var x = st[c.id]; L.push('- ' + c.id + ' — ' + shorten(c.prompt, 80) + ' (' + pct(x.acc) + ', ' + x.n + ' attempt' + (x.n === 1 ? '' : 's') + ')'); });
      return L;
    }
    // Labels for any screen that asks (the fact engine ignores these answers: G.factKeys gives [] for op 'pb').
    function label(id) { var c = bank().byId[id]; return c ? deck.title + ': ' + shorten(c.prompt, 60) : id; }
    // Does any compute card of the deck take an exact expression? (the typed-answer hint then mentions them)
    function hasExpr() { return bank().cards.some(function (c) { return !!c.answerExpr; }); }

    return {
      deck: deck, GAMES: GAMES, GAME: GAME, ID_RE: idRe(), MIDTERM: DEFAULTS.scope, MASTER_DAYS: MASTER_DAYS, LEARN_BLOCK: LEARN_BLOCK, NO_REPEAT: NO_REPEAT,
      DEFAULTS: DEFAULTS, kind: kind, target: target, lectureOf: chapterOf, chapterOf: chapterOf, isGraph: isGraph,
      cardErrors: cardErrors, validateCards: validateCards, clean: clean, bank: bank, resetBank: function () { cache = null; memo = null; },
      settings: settings, scopeLectures: scopeLectures, scopeLabel: scopeLabel, inScope: inScope, pool: pool,
      parseNumber: parseNumber, tolerance: tolerance, check: check, shuffle: shuffle, choices: choices, hintKind: hintKind, cut: cut,
      answerText: answerText, choiceText: choiceText, hasExpr: hasExpr,
      isProba: mine, mine: mine, lessonOf: lessonOf, answers: answers, practiceDays: practiceDays, mastery: mastery, stats: stats, median: median,
      learnQueue: learnQueue, relearn: relearn, nextLearn: nextLearn, nextSprint: nextSprint,
      progress: progress, tag: tag, cheatSheet: cheatSheet, report: report, plainText: plainText, label: label
    };
  }

  // The engine bound to a deck (one per deck, made once).
  function api(deck) { return deck._api || (deck._api = make(deck)); }
  function get(id) { return byDeckId[id] || null; }
  function list() { return decks.slice(); }
  // Decks that have at least one valid card (an empty deck is hidden from the Learn menu).
  function visible() { return decks.filter(function (d) { return api(d).bank().cards.length > 0; }); }
  // The visible decks grouped by Learn-menu section, in registration order: [{ name, decks }].
  function sections() {
    var out = [], idx = {};
    visible().forEach(function (d) {
      if (!Object.prototype.hasOwnProperty.call(idx, d.section)) { idx[d.section] = out.length; out.push({ name: d.section, decks: [] }); }
      out[idx[d.section]].decks.push(d);
    });
    return out;
  }
  // Everything wrong with a deck definition and its cards, for the unit test over every shipped deck file.
  function validateDeck(def) {
    var n = normalise(def);
    if (!n.deck) return n.errors;
    return make(n.deck).validateCards(n.deck.getCards());   // the reference plots are checked by defErrors
  }
  // A deck's saved settings: Probability keeps settings.proba, every other deck lives in settings.decks[id].
  function getSettings(data, deck) {
    var st = data && data.settings || {};
    return deck.settingsKey ? st[deck.settingsKey] : (st.decks || {})[deck.id];
  }
  function setSettings(data, deck, value) {
    var st = data.settings;
    if (deck.settingsKey) st[deck.settingsKey] = value;
    else { if (!st.decks || typeof st.decks !== 'object') st.decks = {}; st.decks[deck.id] = value; }
  }

  var Decks = { GAMES: GAMES, GAME: GAME, register: register, normalise: normalise, defErrors: defErrors, validateDeck: validateDeck, api: api, get: get, list: list, visible: visible, sections: sections,
    getSettings: getSettings, setSettings: setSettings, isGraph: isGraph, reset: function () { decks.length = 0; byDeckId = {}; } };
  AT.Decks = Decks;
  AT.registerDeck = register;
  if (node) module.exports = Decks;
})();
