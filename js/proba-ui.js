/*
 * proba-ui.js — Learn › Probability (#learn/proba). Loaded after ui.js, which lends its layout kit; the logic is in
 * proba.js and the cards in proba-cards.js. Everything runs on the page, drawn with tex.js (MathML, offline).
 *
 *   Hub       scope (lectures 1–4 or 1–6), complements, game and lecture filters, the buttons, the progress table
 *             (a click on a cell starts Learn on that lecture and game), the cheat-sheet list for the clipboard.
 *   Learn     untimed: 1–6 choose (T/F or 1/2 for true/false, a typed number for Quick compute), H hint, Enter next.
 *             A miss or a hinted answer comes back once, 3 to 5 cards later. A checkpoint every 25 cards.
 *   Sprint    60 or 120 s: no feedback, +1 right, the Taylor penalty for a wrong answer (settings.taylor.penalty), Tab skips.
 * A session is saved as one LEARN round (settings.lesson 'proba-learn', 'proba-sprint-60' or 'proba-sprint-120'),
 * questions { op: 'pb', id, game, lecture, correct, wrongAttempts, timeMs, hinted, t, shown, answer, given, skipped?, again? }.
 * Stats treats these rounds as outside the mental-math practice (S.isProba).
 */
(function () {
  'use strict';
  var AT = window.AT, PB = AT.Proba, S = AT.Stats, G = AT.Generator, TeX = AT.TeX;
  var K = AT.UI.kit, esc = K.esc, $ = K.$, $$ = K.$$;
  var sess = null;

  function st() { return PB.settings(K.data().settings.proba); }
  function store(s) { K.data().settings.proba = PB.settings(s); K.save(); }
  function now() { return Date.now(); }
  function rich(str) { return TeX.rich(str); }
  function penalty() { return AT.Taylor ? AT.Taylor.settings(K.data().settings.taylor).penalty : 1; }   // "as in Taylor"
  function fmtScore(x) { return x % 1 ? x.toFixed(1).replace('-', '−') : String(x).replace('-', '−'); }
  function lessonOf(kind, duration) { return kind === 'learn' ? 'proba-learn' : 'proba-sprint-' + duration; }

  // ---------- the hub ----------

  function render() {
    stopTimer();
    sess = null;
    var b = PB.bank(), cards = b.cards, s = st(), rounds = K.data().rounds;
    var stt = PB.stats(cards, rounds, S.dayKey), prog = PB.progress(cards, s, stt), pool = PB.pool(cards, s), empty = !pool.length;
    var h = [K.pageHead('Probability', '<a href="#learn">Learn</a>, ' + cards.length + ' cards, bank ' + esc(b.meta.version) +
      (b.errors.length ? ', ' + b.errors.length + ' invalid skipped (see the console)' : '') + '.',
      '<button type="button" id="pb-learn" class="primary" data-testid="proba-learn"' + (empty ? ' disabled' : '') + '>Learn <kbd>L</kbd></button>' +
      '<button type="button" id="pb-s60" data-testid="proba-sprint-60"' + (empty ? ' disabled' : '') + '>Sprint 60 s <kbd>S</kbd></button>' +
      '<button type="button" id="pb-s120" data-testid="proba-sprint-120"' + (empty ? ' disabled' : '') + '>Sprint 120 s <kbd>Shift S</kbd></button>', 'proba-title')];
    if (empty) h.push('<div class="notices"><p class="notice" data-testid="proba-empty" role="status">No card matches these filters. Widen the scope, show the complements, or pick another game or lecture.</p></div>');

    function seg(name, key, list, isOn) {
      return '<div class="seg" role="group" aria-label="' + name + '">' + list.map(function (o) {
        var on = isOn(o[0]);
        return '<button type="button" data-pb-' + key + '="' + o[0] + '" aria-pressed="' + on + '"' + (on ? ' class="on"' : '') + (o[2] ? ' title="' + esc(o[2]) + '"' : '') + '>' + esc(o[1]) + '</button>';
      }).join('') + '</div>';
    }
    var lecs = PB.scopeLectures(s);
    h.push('<form class="panel" id="pb-form" data-testid="proba-settings" onsubmit="return false"><div class="form">' +
      K.frow('Scope', seg('Scope', 'scope', [[4, 'Lectures 1–4'], [6, 'Lectures 1–6']], function (v) { return s.scope === +v; }) + ' ' +
        '<div class="seg" role="group" aria-label="Complements"><button type="button" id="pb-comp" data-testid="proba-complements" aria-pressed="' + s.complements + '"' + (s.complements ? ' class="on"' : '') + '>Show complements</button></div>',
        'Lectures 1–4 are the midterm. Complements are extra cards from the textbook.') +
      K.frow('Game', seg('Game', 'game', [['all', 'All']].concat(PB.GAMES.map(function (g) { return [g.id, g.label]; })), function (v) { return s.game === v; })) +
      K.frow('Lectures', seg('Lectures', 'lec', lecs.map(function (l) { return [l, 'L' + l, b.meta.lectures[l]]; }), function (v) { return s.lectures.indexOf(+v) >= 0; }),
        'The lectures a Learn or Sprint draws from.') +
      '</div></form>');

    // the progress table: mastered / total per lecture and game; a cell starts Learn on those cards
    var rows = prog.lectures.map(function (l) {
      return '<tr data-lecture="' + l + '"><th scope="row"><b>L' + l + '</b> <span class="pb-lt">' + esc(b.meta.lectures[l] || '') + '</span></th>' +
        PB.GAMES.map(function (g) { return '<td class="pb-td">' + cell(l, g, prog.cells[l][g.id]) + '</td>'; }).join('') +
        '<td class="pb-c" data-testid="proba-total-L' + l + '">' + frac(prog.rows[l]) + '</td></tr>';
    }).join('');
    function frac(x) { return x.t ? x.m + ' / ' + x.t : '—'; }
    function cell(l, g, x) {
      if (!x.t) return '<span class="pb-none" aria-label="Lecture ' + l + ', ' + esc(g.label) + ': no cards">—</span>';
      return '<button type="button" class="pb-cell" data-lec="' + l + '" data-game="' + g.id + '" data-testid="proba-cell-' + l + '-' + g.id + '" aria-label="Lecture ' + l + ', ' + esc(g.label) + ': ' +
        x.m + ' of ' + x.t + ' mastered. Learn these cards."><span class="pb-fill" style="width:' + Math.round(100 * x.m / x.t) + '%"></span><span class="pb-n">' + x.m + ' / ' + x.t + '</span></button>';
    }
    h.push(K.section('Your cards', '<p class="sec-intro">Mastered over total, per lecture and game. A card is mastered when at least 2 of your answers in your last 3 days of practice are all right, without a hint, ' +
      'with a median time under the target below each game. Click a cell to learn those cards.</p>' +
      '<div class="tbl-scroll"><table class="compact pb-prog" data-testid="proba-progress"><thead><tr><th scope="col">Lecture</th>' +
      PB.GAMES.map(function (g) { return '<th scope="col" class="pb-gh">' + esc(g.label) + '<span class="pb-tgt">' + g.target + ' s</span></th>'; }).join('') + '<th scope="col" class="pb-gh">Total</th></tr></thead><tbody>' + rows +
      '<tr class="pb-tot"><th scope="row">Total</th>' + PB.GAMES.map(function (g) { return '<td class="pb-c" data-testid="proba-total-' + g.id + '">' + frac(prog.cols[g.id]) + '</td>'; }).join('') +
      '<td class="pb-c" data-testid="proba-total">' + frac(prog.total) + '</td></tr></tbody></table></div>'));
    h.push(K.section('Cheat sheet', '<p class="sec-intro">The cards in scope you missed or used a hint on (under 80% right, at most 40), as a Markdown list to paste into your notes.</p>' +
      '<div class="row"><button type="button" id="pb-copy" data-testid="proba-copy">Copy cheat-sheet list</button><span class="hint" id="pb-copy-st" role="status" data-testid="proba-copy-status"></span></div>'));
    h.push(K.keys([['L', 'learn'], ['S', 'sprint 60 s'], ['Shift S', 'sprint 120 s'], ['N', 'all lessons']]));
    K.main().innerHTML = h.join('');
    bindHub(cards, stt);
  }

  function bindHub(cards, stt) {
    function upd(fn, focusSel) { var s = st(); fn(s); store(s); render(); var el = focusSel && $(focusSel); if (el) el.focus(); }
    $$('[data-pb-scope]').forEach(function (b) { b.addEventListener('click', function () { var v = +b.getAttribute('data-pb-scope'); upd(function (s) { s.scope = v; }, '[data-pb-scope="' + v + '"]'); }); });
    $('#pb-comp').addEventListener('click', function () { upd(function (s) { s.complements = !s.complements; }, '#pb-comp'); });
    $$('[data-pb-game]').forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-pb-game'); upd(function (s) { s.game = v; }, '[data-pb-game="' + v + '"]'); }); });
    $$('[data-pb-lec]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = +b.getAttribute('data-pb-lec');
        upd(function (s) {
          var i = s.lectures.indexOf(n);
          if (i >= 0) { if (s.lectures.filter(function (l) { return l <= s.scope; }).length > 1) s.lectures.splice(i, 1); } else s.lectures.push(n);
          s.lectures.sort();
        }, '[data-pb-lec="' + n + '"]');
      });
    });
    $$('.pb-cell').forEach(function (b) { b.addEventListener('click', function () { start('learn', null, { lecture: +b.getAttribute('data-lec'), game: b.getAttribute('data-game') }); }); });
    $('#pb-learn').addEventListener('click', function () { start('learn'); });
    $('#pb-s60').addEventListener('click', function () { start('sprint', 60); });
    $('#pb-s120').addEventListener('click', function () { start('sprint', 120); });
    $('#pb-copy').addEventListener('click', function () {
      var text = PB.cheatSheet(cards, st(), stt), el = $('#pb-copy-st');
      if (!text) { el.textContent = 'Nothing to list yet: no card in scope has under 80% right or a hinted answer.'; return; }
      var lines = text.split('\n').length;
      function fallback() {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('aria-label', 'Cheat-sheet list'); ta.rows = 8; ta.className = 'pb-copy-box';
        el.parentNode.parentNode.appendChild(ta); ta.focus(); ta.select();
        var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        el.textContent = ok ? 'Copied ' + K.plural(lines, 'line') + '. Paste it into your notes.' : 'Copying is blocked here. Select the text below and copy it with Ctrl+C.';
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { el.textContent = 'Copied ' + K.plural(lines, 'line') + '. Paste it into your notes.'; }, fallback);
      } else fallback();
    });
    K.setKeys(function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (!PB.pool(PB.bank().cards, st()).length) return false;
      if (k === 'l') { start('learn'); return true; }
      if (k === 's') { start('sprint', e.shiftKey ? 120 : 60); return true; }
      if (k === 'Enter') { start('learn'); return true; }
      return false;
    });
  }

  // ---------- sessions ----------

  function start(kind, duration, cell) {
    var b = PB.bank(), s = st(), pool = PB.pool(b.cards, s, cell);
    if (!pool.length) return;
    sess = { kind: kind, duration: duration || null, cell: cell || null, s: s, cards: b.cards, byId: b.byId, pool: pool, rng: G.mulberry32(K.seed()),
      L: PB.learnQueue(), hist: [], questions: [], n: 0, score: 0, startedAt: new Date(now()).toISOString(), saved: false, card: null, result: null };
    sess.st = PB.stats(b.cards, K.data().rounds, S.dayKey);
    K.onLeave(leave);
    if (kind === 'sprint') { sess.deadline = now() + duration * 1000; startTimer(); }
    next();
  }

  // The stats the picker reads: history plus this session so far (a card answered right now is no longer new).
  function refresh() {
    var virtual = { id: 'session', mode: 'LEARN', startedAt: sess.startedAt, settings: { lesson: lessonOf(sess.kind, sess.duration) }, questions: sess.questions };
    sess.st = PB.stats(sess.cards, K.data().rounds.concat([virtual]), S.dayKey);
  }
  function rightCount() { return sess.questions.filter(function (q) { return q.correct; }).length; }

  function next() {
    if (sess.kind === 'learn' && sess.n && sess.n % PB.LEARN_BLOCK === 0 && sess.checked !== sess.n) { sess.checked = sess.n; checkpoint(); return; }
    var id;
    if (sess.kind === 'learn') { var p = PB.nextLearn(sess.L, sess.pool, sess.st, sess.rng, now()); id = p.id; sess.again = p.again; }
    else { id = PB.nextSprint(sess.hist, sess.pool, sess.st, sess.rng); sess.again = false; }
    sess.card = sess.byId[id];
    sess.choices = PB.choices(sess.card, sess.rng);
    sess.result = null; sess.hinted = false; sess.err = ''; sess.t0 = now();
    draw();
  }

  function sessionTitle() {
    var t = sess.kind === 'learn' ? 'Probability: learn' : 'Probability sprint, ' + sess.duration + ' s';
    return sess.cell ? t + ', L' + sess.cell.lecture + ', ' + PB.GAME[sess.cell.game].label : t;
  }

  function draw() {
    var c = sess.card, k = PB.kind(c), r = sess.result, learn = sess.kind === 'learn', h = [];
    var head = learn ? 'Card ' + (r ? sess.n : sess.n + 1) + (sess.n ? ', ' + rightCount() + ' right so far' : '')
      : 'Score <b class="num" data-testid="proba-score">' + fmtScore(sess.score) + '</b>, <span class="num" data-testid="proba-timer">' + secondsLeft() + '</span> s left';
    h.push(K.pageHead(sessionTitle(), head, '<button type="button" id="pb-done" data-testid="proba-done">' + (learn ? 'Done' : 'Stop') + ' <kbd>Esc</kbd></button>'));
    h.push('<div class="fq pb-q" data-testid="proba-question" data-id="' + esc(c.id) + '" data-game="' + c.game + '">');
    h.push('<p class="fq-meta" data-testid="proba-meta">' + (sess.again ? '<b data-testid="proba-again">Again</b>, ' : '') + 'L' + c.lecture + ', ' + esc(PB.GAME[c.game].label) + ', ' + esc(c.topic || '') + '</p>');
    h.push('<p class="fq-prompt" id="pb-prompt" data-testid="proba-prompt">' + rich(c.prompt) + '</p>');
    if (k === 'mcq') {
      h.push('<ol class="fq-opts pb-opts" aria-labelledby="pb-prompt">' + sess.choices.map(function (ch, i) {
        var right = r && ch === c.answer, chosen = r && !r.ok && ch === r.given;
        var tag = right ? '<span class="sr-only"> (right answer)</span>' : chosen ? '<span class="sr-only"> (your answer, wrong)</span>' : '';
        return '<li><button type="button" class="opt' + (right ? ' right' : chosen ? ' chosen' : '') + '" data-opt="' + i + '" data-testid="proba-option-' + (i + 1) + '"' + (r ? ' disabled' : '') + '>' +
          '<kbd>' + (i + 1) + '</kbd><span class="ot">' + rich(ch) + '</span>' + tag + '</button></li>';
      }).join('') + '</ol>');
    } else if (k === 'tf') {
      h.push('<ol class="fq-opts pb-opts pb-tf" aria-labelledby="pb-prompt">' + [[true, 'True', 'T'], [false, 'False', 'F']].map(function (o, i) {
        var right = r && o[0] === c.answer, chosen = r && !r.ok && o[0] === r.given;
        var tag = right ? '<span class="sr-only"> (right answer)</span>' : chosen ? '<span class="sr-only"> (your answer, wrong)</span>' : '';
        return '<li><button type="button" class="opt' + (right ? ' right' : chosen ? ' chosen' : '') + '" data-opt="' + i + '" data-testid="proba-' + o[1].toLowerCase() + '"' + (r ? ' disabled' : '') + '>' +
          '<kbd>' + o[2] + '</kbd><span class="ot">' + o[1] + '</span>' + tag + '</button></li>';
      }).join('') + '</ol>');
    } else if (!r) {
      h.push('<form class="fq-in" id="pb-form-num" data-testid="proba-form"><input id="pb-input" data-testid="proba-input" inputmode="text" autocomplete="off" spellcheck="false" aria-label="Your answer, a number or a fraction" aria-describedby="pb-err">' +
        '<button type="submit" class="primary">Check <kbd>Enter</kbd></button></form><p class="err" id="pb-err" role="alert" data-testid="proba-err">' + esc(sess.err || '') + '</p>');
    }
    if (sess.hinted && !r) {
      h.push('<p class="ty-hint" data-testid="proba-hint"><b>Hint.</b> ' + (c.hint ? rich(c.hint) : 'Half of the wrong choices are gone.') + '</p>');
    }
    h.push('</div>');
    if (r && learn) h.push(resultHtml(c, r));
    else if (!r) {
      var hk = PB.hintKind(c, sess.choices.length) && !sess.hinted ? ['H', 'hint'] : null;
      h.push(K.keys((k === 'mcq' ? [['1–' + sess.choices.length, 'choose']] : k === 'tf' ? [['T F', 'true or false']] : [['Enter', 'check']])
        .concat(hk ? [hk] : []).concat(learn ? [['Esc', 'finish']] : [['Tab', 'skip'], ['Esc', 'stop']])));
    }
    K.main().innerHTML = h.join('');
    bindSession();
    if (!r && k === 'num') { var inp = $('#pb-input'); if (inp) inp.focus(); }
  }

  function resultHtml(c, r) {
    var k = PB.kind(c), h = ['<div class="fq-result" data-testid="proba-result"><p class="verdict" role="status">' +
      (r.ok ? '<b>Right.</b>' : '<b>Not quite.</b> ' + (k === 'num' ? 'The answer is <b class="num">' + esc(PB.answerText(c)) + '</b>' + (r.raw ? ' (you typed ' + esc(r.raw) + ')' : '') + '.' : 'The right answer is highlighted.')) + '</p>'];
    h.push('<p class="' + (r.ok ? 'fq-ask' : 'fq-why') + '" data-testid="proba-explain">' + (r.ok ? '' : '<b>Why.</b> ') + rich(c.explain) + '</p>');
    if (c.source) h.push('<p class="fq-ask" data-testid="proba-source">Source: ' + esc(c.source) + '</p>');
    h.push('<div class="row"><button type="button" class="primary" id="pb-next" data-testid="proba-next">Next <kbd>Enter</kbd></button></div></div>');
    return h.join('');
  }

  function checkpoint() {
    var h = [K.pageHead(sessionTitle(), sess.n + ' cards, ' + rightCount() + ' right', '<button type="button" id="pb-done" data-testid="proba-done">Done <kbd>Esc</kbd></button>')];
    h.push('<div class="fq-result pb-check" data-testid="proba-checkpoint"><p class="verdict" role="status"><b>' + sess.n + ' cards done, continue?</b></p>' +
      '<div class="row"><button type="button" class="primary" id="pb-next" data-testid="proba-continue">Continue <kbd>Enter</kbd></button><button type="button" id="pb-end">End the session <kbd>Esc</kbd></button></div></div>');
    K.main().innerHTML = h.join('');
    $('#pb-done').addEventListener('click', finish);
    $('#pb-end').addEventListener('click', finish);
    $('#pb-next').addEventListener('click', next);
    $('#pb-next').focus();
    K.setKeys(function (e) {
      if (e.key === 'Escape') { finish(); return true; }
      if (e.key === 'Enter') { next(); return true; }
      return false;
    });
  }

  function bindSession() {
    var c = sess.card, k = PB.kind(c);
    $('#pb-done').addEventListener('click', finish);
    if (!sess.result) {
      $$('[data-opt]').forEach(function (b) {
        b.addEventListener('click', function () { var i = +b.getAttribute('data-opt'); answer(k === 'tf' ? i === 0 : sess.choices[i]); });
      });
      var form = $('#pb-form-num');
      if (form) {
        form.addEventListener('submit', function (e) { e.preventDefault(); submitNumber(); });
        // Typing: the page's key handler leaves inputs alone, so H, Esc and (in a sprint) Tab are handled here.
        $('#pb-input').addEventListener('keydown', function (e) {
          var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
          if (key === 'h' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); hint(); }
          else if (key === 'Escape') { e.preventDefault(); finish(); }
          else if (key === 'Tab' && sess.kind === 'sprint') { e.preventDefault(); skip(); }
        });
      }
    } else { $('#pb-next').addEventListener('click', next); $('#pb-next').focus(); }
    K.setKeys(function (e) {
      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (key === 'Escape') { finish(); return true; }
      if (!sess.result) {
        if (k === 'mcq' && /^[1-6]$/.test(key)) { if (+key <= sess.choices.length) answer(sess.choices[+key - 1]); return true; }
        if (k === 'tf' && (key === 't' || key === '1')) { answer(true); return true; }
        if (k === 'tf' && (key === 'f' || key === '2')) { answer(false); return true; }
        if (key === 'h') { hint(); return true; }
        if (key === 'Tab' && sess.kind === 'sprint') { skip(); return true; }
        return false;
      }
      if (key === 'Enter' || key === ' ') { next(); return true; }
      return false;
    });
  }

  // H: the card's hint, else half of the wrong choices go. Once per card; the answer is then recorded as hinted.
  function hint() {
    var c = sess.card, kind = PB.hintKind(c, sess.choices.length);
    if (!kind || sess.hinted || sess.result) return;
    sess.hinted = true;
    if (kind === 'cut') sess.choices = PB.cut(sess.choices, c, sess.rng);
    var typed = $('#pb-input') ? $('#pb-input').value : '';   // the redraw must not lose what was typed
    draw();
    var inp = $('#pb-input'); if (inp) { inp.value = typed; inp.focus(); }
  }

  function submitNumber() {
    var inp = $('#pb-input'), v = PB.parseNumber(inp.value);
    if (v === null) {   // not an attempt: nothing is recorded, the clock keeps running, retype
      sess.err = 'Can’t read that number. Use digits, a decimal point or comma, a fraction like 3/8, or 2e-3.';
      $('#pb-err').textContent = sess.err; inp.focus(); inp.select();
      return;
    }
    answer(v, inp.value.trim());
  }

  function record(given, ok, raw) {
    var c = sess.card, k = PB.kind(c), t = now();
    var text = given === null ? '' : k === 'num' ? raw : k === 'tf' ? (given ? 'True' : 'False') : PB.plainText(given);
    var rec = { op: 'pb', id: c.id, game: c.game, lecture: c.lecture, correct: ok, wrongAttempts: ok ? 0 : 1, timeMs: Math.max(1, t - sess.t0), hinted: sess.hinted,
      t: t, shown: PB.plainText(c.prompt), answer: PB.plainText(PB.answerText(c)), given: text };
    if (given === null) { rec.skipped = true; rec.wrongAttempts = 0; }
    if (sess.again) rec.again = true;   // a relearning comeback
    sess.questions.push(rec);
    sess.n++;
  }

  function answer(given, raw) {
    if (!sess || sess.result || !sess.card) return;
    var c = sess.card, ok = PB.check(c, given);
    record(given, ok, raw);
    if (sess.kind === 'sprint') {   // no feedback: the score moves, the next card comes
      sess.score += ok ? 1 : -penalty();
      refresh();
      next();
      return;
    }
    if ((!ok || sess.hinted) && !sess.again) PB.relearn(sess.L, c.id, sess.rng);   // it comes back once, 3 to 5 cards later
    sess.result = { ok: ok, given: given, raw: raw };
    refresh();
    draw();
  }
  function skip() { if (!sess || sess.result) return; record(null, false); refresh(); next(); }

  // ---------- the clock ----------

  var timer = null;
  function secondsLeft() { return Math.max(0, Math.ceil((sess.deadline - now()) / 1000)); }
  function startTimer() {
    stopTimer();
    timer = setInterval(function () {
      if (!sess || sess.kind !== 'sprint') { stopTimer(); return; }
      if (now() >= sess.deadline) { finish(); return; }
      var t = document.querySelector('[data-testid="proba-timer"]');
      if (t) t.textContent = secondsLeft();
    }, 100);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  // ---------- saving and the end ----------

  function save() {
    if (!sess || sess.saved || !sess.questions.length) return null;
    sess.saved = true;
    var round = { id: AT.Storage.uuid(), startedAt: sess.startedAt, mode: 'LEARN',
      settings: { lesson: lessonOf(sess.kind, sess.duration), duration: sess.duration || undefined, scope: sess.s.scope, complements: sess.s.complements,
        cell: sess.cell || undefined, penalty: sess.kind === 'sprint' ? penalty() : undefined },
      score: sess.kind === 'learn' ? rightCount() : sess.score, questions: sess.questions };
    K.data().rounds.push(round);
    K.save();
    return round;
  }
  // Leaving the page mid-session (another tab, a key): keep what was answered.
  function leave() { stopTimer(); save(); sess = null; }

  function finish() {
    stopTimer();
    if (!sess) return;
    var round = save(), kind = sess.kind, duration = sess.duration, cell = sess.cell, byId = sess.byId, title = sessionTitle(), qs = sess.questions;
    K.onLeave(null);
    sess = null;
    if (!round) { render(); return; }
    var right = qs.filter(function (q) { return q.correct; }).length, hinted = qs.filter(function (q) { return q.hinted; }).length;
    var skipped = qs.filter(function (q) { return q.skipped; }).length, acc = Math.round(100 * right / qs.length);
    var h = ['<div class="end">', '<h1 class="sr-only">' + esc(title) + ' finished</h1>'];
    h.push(K.endHead(fmtScore(round.score), title, right + ' of ' + qs.length + ' right, ' + acc + '%' + (hinted ? ', ' + hinted + ' with a hint' : '') + (skipped ? ', ' + skipped + ' skipped' : '')));
    h.push(K.endButtons([['again', 'Back to Probability', 'Enter'], [kind === 'learn' ? 'l' : 's', kind === 'learn' ? 'Learn again' : 'Sprint again', kind === 'learn' ? 'L' : 'S']]));
    // every card missed, skipped or hinted, once, worst result first
    var seen = {}, list = [];
    qs.forEach(function (q) {
      if (q.correct && !q.hinted) return;
      var rank = q.skipped ? 2 : !q.correct ? 3 : 1;
      if (!seen[q.id]) { seen[q.id] = { q: q, rank: rank, n: 0 }; list.push(seen[q.id]); }
      seen[q.id].n++;
      if (rank > seen[q.id].rank) { seen[q.id].rank = rank; seen[q.id].q = q; }
    });
    var NAME = { 1: 'Right, with a hint', 2: 'Skipped', 3: 'Wrong' };
    h.push(K.section(kind === 'learn' ? 'Missed or hinted cards' : 'Missed cards',
      list.length ? '<ol class="pb-review" data-testid="proba-review">' + list.map(function (x) {
        var c = byId[x.q.id];
        return '<li data-id="' + esc(c.id) + '"><p class="fq-r">' + esc(NAME[x.rank]) + ', L' + c.lecture + ', ' + esc(PB.GAME[c.game].label) + '</p>' +
          '<p class="fq-prompt">' + rich(c.prompt) + '</p>' +
          '<p><b>Answer.</b> ' + (PB.kind(c) === 'mcq' ? rich(c.answer) : esc(PB.answerText(c))) + '</p>' +
          '<p class="fq-why"><b>Why.</b> ' + rich(c.explain) + '</p>' + (c.source ? '<p class="fq-ask">Source: ' + esc(c.source) + '</p>' : '') + '</li>';
      }).join('') + '</ol>' : '<p class="sec-intro" data-testid="proba-no-misses">Nothing missed or hinted.</p>'));
    h.push('</div>');
    K.main().innerHTML = h.join('');
    var actions = {
      again: function () { render(); },
      l: function () { start('learn', null, cell); },
      s: function () { start('sprint', duration, cell); }
    };
    K.bindEndButtons(actions);
    K.endKeys(actions);
  }

  AT.ProbaUI = { render: render };
})();
