/*
 * proba.js — Learn › Probability: the engine. Pure, no DOM: runs in the browser (window.AT.Proba) and in Node.
 * The cards are data (js/proba-cards.js, AT.PROBA_CARDS and AT.PROBA_META, written by the coach); this file validates
 * them, filters them, picks the next one (Learn and Sprint), checks answers (6-choice, true/false, typed numbers),
 * works out mastery and progress, and writes the cheat sheet and the report section.
 *
 * Answers are saved like Taylor's: a session is one LEARN round (settings.lesson 'proba-learn', 'proba-sprint-60' or
 * 'proba-sprint-120') whose questions are { op: 'pb', id, game, correct, timeMs, hinted, t, shown, answer, given,
 * skipped?, again? }. Answers whose id left the bank are ignored (and stay stored).
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var node = typeof module !== 'undefined';
  var TeX = AT.TeX || (node ? require('./tex.js') : null);

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
  var ID_RE = /^L[1-6]-[a-z0-9-]+$/;
  var MIDTERM = 4;           // the default scope: lectures 1–4
  var MASTER_DAYS = 3;       // mastery looks at the last 3 practice days
  var LEARN_BLOCK = 25;      // Learn asks to continue every 25 cards
  var NO_REPEAT = 4;         // the same card never twice within 4 questions (a comeback excepted)

  function kind(card) { return GAME[card.game] ? GAME[card.game].kind : null; }
  function target(card) { return +card.target > 0 ? +card.target : GAME[card.game].target; }
  function lectureOf(card) { return card.lecture; }

  // ---------- validation ----------

  function texErrors(str) {
    try { TeX.richStrict(str); return null; } catch (e) { return e.message; }
  }
  // The errors of one card, without the id-uniqueness rule. [] = valid.
  function cardErrors(c) {
    var errs = [];
    if (!c || typeof c !== 'object') return ['not an object'];
    if (typeof c.id !== 'string' || !ID_RE.test(c.id)) errs.push('id must match L<1-6>-<a-z0-9->');
    if (!(c.lecture >= 1 && c.lecture <= 6 && c.lecture % 1 === 0)) errs.push('lecture must be 1 to 6');
    if (typeof c.id === 'string' && ID_RE.test(c.id) && +c.id.charAt(1) !== c.lecture) errs.push('the id starts with L' + c.id.charAt(1) + ' but lecture is ' + c.lecture);
    var k = GAME[c.game] ? GAME[c.game].kind : null;
    if (!k) errs.push('game must be one of ' + GAMES.map(function (g) { return g.id; }).join(', '));
    if (typeof c.prompt !== 'string' || !c.prompt.trim()) errs.push('prompt is empty');
    if (typeof c.explain !== 'string' || !c.explain.trim()) errs.push('explain is empty');
    if (k === 'mcq') {
      if (typeof c.answer !== 'string' || !c.answer.trim()) errs.push('answer must be a non-empty string');
      if (!Array.isArray(c.distractors) || c.distractors.length < 3 || c.distractors.length > 5) errs.push('distractors must be 3 to 5 strings');
      else {
        var seen = {};
        if (typeof c.answer === 'string') seen[c.answer.trim()] = 'answer';
        c.distractors.forEach(function (d, i) {
          if (typeof d !== 'string' || !d.trim()) { errs.push('distractor ' + (i + 1) + ' is not a non-empty string'); return; }
          if (seen[d.trim()]) errs.push('distractor ' + (i + 1) + ' repeats ' + (seen[d.trim()] === 'answer' ? 'the answer' : 'another distractor'));
          seen[d.trim()] = 'distractor';
        });
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
    }
    if (c.target !== undefined && !(typeof c.target === 'number' && c.target > 0)) errs.push('target must be seconds > 0');
    if (c.complement !== undefined && typeof c.complement !== 'boolean') errs.push('complement must be true or false');
    // every string: balanced $ and maths that tex.js draws
    ['prompt', 'answer', 'hint', 'explain', 'topic', 'source'].forEach(function (f) {
      if (typeof c[f] === 'string') { var e = texErrors(c[f]); if (e) errs.push(f + ': ' + e); }
    });
    if (Array.isArray(c.distractors)) c.distractors.forEach(function (d, i) {
      if (typeof d === 'string') { var e = texErrors(d); if (e) errs.push('distractor ' + (i + 1) + ': ' + e); }
    });
    return errs;
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
  // The bank the app uses: window.AT_PROBA_FIXTURE (tests) or AT.PROBA_CARDS, cleaned once.
  var cache = null;
  function bank() {
    if (cache) return cache;
    var fx = typeof window !== 'undefined' && Array.isArray(window.AT_PROBA_FIXTURE) ? window.AT_PROBA_FIXTURE : null;
    var src = fx || AT.PROBA_CARDS || (node ? require('./proba-cards.js').PROBA_CARDS : []);
    var meta = AT.PROBA_META || (node ? require('./proba-cards.js').PROBA_META : null) || { version: '?', lectures: {} };
    var c = clean(src);
    if (c.errors.length && typeof console !== 'undefined') console.warn('Probability: ' + c.errors.length + ' invalid card(s) skipped:\n' + c.errors.join('\n'));
    cache = { cards: c.cards, errors: c.errors, meta: meta, byId: byIdOf(c.cards) };
    return cache;
  }
  function byIdOf(cards) { var m = {}; cards.forEach(function (c) { m[c.id] = c; }); return m; }

  // ---------- settings and filters ----------

  var DEFAULTS = { scope: MIDTERM, complements: false, game: 'all', lectures: [1, 2, 3, 4, 5, 6] };
  function settings(s) {
    s = s || {};
    var lectures = Array.isArray(s.lectures) ? s.lectures.filter(function (n) { return n >= 1 && n <= 6; }) : DEFAULTS.lectures.slice();
    return {
      scope: +s.scope === 6 ? 6 : MIDTERM,
      complements: s.complements === true,
      game: GAME[s.game] ? s.game : 'all',
      lectures: lectures.length ? lectures : DEFAULTS.lectures.slice()
    };
  }
  // The lectures shown (rows, chips): 1 to the scope.
  function scopeLectures(s) { var out = []; for (var i = 1; i <= settings(s).scope; i++) out.push(i); return out; }
  // Cards in scope (lectures 1–4 or 1–6, complements only when shown): what the progress table counts.
  function inScope(cards, s) {
    s = settings(s);
    return cards.filter(function (c) { return c.lecture <= s.scope && (s.complements || !c.complement); });
  }
  // The cards a session draws from: in scope, then the game and lecture filters, or one table cell { lecture, game }.
  function pool(cards, s, cell) {
    s = settings(s);
    return inScope(cards, s).filter(function (c) {
      if (cell) return c.lecture === cell.lecture && (!cell.game || c.game === cell.game);
      return (s.game === 'all' || c.game === s.game) && s.lectures.indexOf(c.lecture) >= 0;
    });
  }

  // ---------- answers ----------

  // Typed numbers: 0.375, 0,375, -2, .5, 3/8, -1 / 4, 2e-3. Returns a finite number, or null ("Can't read that number").
  function parseNumber(str) {
    var s = String(str === null || str === undefined ? '' : str).replace(/[−‒–]/g, '-').trim().replace(/\s*\/\s*/g, '/');
    if (!s || /\s/.test(s)) return null;   // spaces only around the fraction bar: "3 8" is not 38
    var NUM = '(?:\\d+(?:[.,]\\d*)?|[.,]\\d+)';
    var m = new RegExp('^([+-]?)(' + NUM + ')/([+-]?)(' + NUM + ')$').exec(s);
    if (m) {
      var a = +m[2].replace(',', '.'), b = +m[4].replace(',', '.');
      if (!b) return null;
      var v = (m[1] === '-' ? -1 : 1) * (m[3] === '-' ? -1 : 1) * a / b;
      return isFinite(v) ? v : null;
    }
    m = new RegExp('^[+-]?' + NUM + '(?:[eE][+-]?\\d+)?$').exec(s);
    if (!m) return null;
    var x = +s.replace(',', '.');
    return isFinite(x) ? x : null;
  }
  function tolerance(card) { return +card.tol > 0 ? +card.tol : Math.max(0.0005, 0.001 * Math.abs(card.answer)); }
  // given: the chosen text (MCQ), true/false, or the parsed number.
  function check(card, given) {
    var k = kind(card);
    if (k === 'num') return typeof given === 'number' && Math.abs(given - card.answer) <= tolerance(card) + 1e-12;
    if (k === 'tf') return given === card.answer;
    return given === card.answer;
  }
  function shuffle(a, rng) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
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
  function answerText(card) {
    var k = kind(card);
    if (k === 'tf') return card.answer ? 'True' : 'False';
    if (k === 'num') return String(card.answer);
    return card.answer;
  }

  // ---------- history ----------

  function isProba(r) { return r && r.mode === 'LEARN' && r.settings && /^proba-/.test(r.settings.lesson || ''); }
  // Every saved answer: { q, t (ms), mode: 'learn'|'sprint' }. With byId, answers to cards no longer in the bank are left out.
  function answers(rounds, byId) {
    var out = [];
    (rounds || []).forEach(function (r) {
      if (!isProba(r)) return;
      var start = Date.parse(r.startedAt), mode = r.settings.lesson === 'proba-learn' ? 'learn' : 'sprint';
      (r.questions || []).forEach(function (q) {
        if (q.op !== 'pb' || (byId && !byId[q.id])) return;
        out.push({ q: q, t: typeof q.t === 'number' ? q.t : start, mode: mode });
      });
    });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  function median(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function iso(t) { return new Date(t).toISOString(); }
  // The last 3 days (05:00 to 05:00, dayKey = S.dayKey) with any probability answer.
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
  /*
   * The next Learn card: { id, again }. pool = the session's cards in file order; st = stats() including this session.
   *   1. a due comeback (its turn has come);
   *   2. otherwise, half the time, the next card never answered, in file order (the bank follows the course);
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
   * The progress table: rows = lectures in scope, columns = games. cells[lecture][game] = { m, t }, plus row and
   * column totals and the grand total.
   */
  function progress(cards, s, st) {
    var lecs = scopeLectures(s), list = inScope(cards, s), cells = {}, rowT = {}, colT = {}, all = { m: 0, t: 0 };
    lecs.forEach(function (l) { cells[l] = {}; rowT[l] = { m: 0, t: 0 }; GAMES.forEach(function (g) { cells[l][g.id] = { m: 0, t: 0 }; }); });
    GAMES.forEach(function (g) { colT[g.id] = { m: 0, t: 0 }; });
    list.forEach(function (c) {
      var m = st[c.id] && st[c.id].state === 'mastered' ? 1 : 0;
      [cells[c.lecture][c.game], rowT[c.lecture], colT[c.game], all].forEach(function (x) { x.t++; x.m += m; });
    });
    return { lectures: lecs, cells: cells, rows: rowT, cols: colT, total: all };
  }

  function tag(card) { return 'L' + card.lecture + ' · ' + GAME[card.game].label; }
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

  function pct(x) { return Math.round(x * 100) + '%'; }
  function plainText(str) { try { return TeX.richPlain(str); } catch (e) { return String(str); } }
  function shorten(str, n) { str = plainText(str).replace(/\s+/g, ' ').trim(); return str.length > n ? str.slice(0, n - 1) + '…' : str; }
  /*
   * The report section ("Copy report for Claude"). meta = AT.PROBA_META. nowMs for "last 3 days" (05:00 days).
   * Empty (no lines) when nothing was ever answered.
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
    L.push('## Probability (midterm prep)');
    L.push('Scope: Lectures 1–' + s.scope + (s.complements ? ' with complements' : '') + ' · bank ' + (meta && meta.version || '?'));
    L.push('Cards: mastered ' + tot.m + ' / seen ' + tot.s + ' / total ' + tot.t);
    L.push('Per lecture: ' + scopeLectures(s).map(function (l) {
      var x = count(list.filter(function (c) { return c.lecture === l; }));
      return 'L' + l + ' ' + x.m + '/' + x.s + '/' + x.t;
    }).join(' · '));
    var days = practiceDays(all, dayKey), recent = all.filter(function (a) { return days.indexOf(dayKey(iso(a.t))) >= 0 && byId[a.q.id].lecture <= s.scope; });
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

  // The fact engine ignores probability answers (G.factKeys gives [] for op 'pb'); labels for any screen that asks.
  function label(id) { var c = bank().byId[id]; return c ? 'Probability: ' + shorten(c.prompt, 60) : id; }

  var api = {
    GAMES: GAMES, GAME: GAME, ID_RE: ID_RE, MIDTERM: MIDTERM, MASTER_DAYS: MASTER_DAYS, LEARN_BLOCK: LEARN_BLOCK, NO_REPEAT: NO_REPEAT,
    DEFAULTS: DEFAULTS, kind: kind, target: target, lectureOf: lectureOf,
    cardErrors: cardErrors, validateCards: validateCards, clean: clean, bank: bank, resetBank: function () { cache = null; },
    settings: settings, scopeLectures: scopeLectures, inScope: inScope, pool: pool,
    parseNumber: parseNumber, tolerance: tolerance, check: check, shuffle: shuffle, choices: choices, hintKind: hintKind, cut: cut, answerText: answerText,
    isProba: isProba, answers: answers, practiceDays: practiceDays, mastery: mastery, stats: stats, median: median,
    learnQueue: learnQueue, relearn: relearn, nextLearn: nextLearn, nextSprint: nextSprint,
    progress: progress, tag: tag, cheatSheet: cheatSheet, report: report, plainText: plainText, label: label
  };
  AT.Proba = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
