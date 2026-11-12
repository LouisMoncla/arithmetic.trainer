/*
 * taylor-ui.js — Learn › Taylor expansions (#learn/taylor). Loaded after ui.js, which lends its layout kit; the logic
 * is in taylor.js. Everything runs on the page (like Finance practice), drawn with tex.js (MathML, offline).
 *
 *   Lesson page  settings (tiers, question types, orders, FR/EN names, sprint penalty), the mastery grid, the buttons.
 *   Learn        20 questions picked for you (new, then weak); 1–6 answer, H shows the method first (counts as
 *                helped), then the right answer, the full expansion and its method; Enter for the next.
 *   Sprint       60 or 120 s: 1–6 answer, Tab skips, no feedback; +1 right, the penalty for a wrong answer.
 * Each session is saved as one LEARN round (settings.lesson 'taylor-learn' or 'taylor-sprint-60'/'-120'), questions
 * { op: 'ty', key, type, order, correct, chosenIndex, timeMs, hinted, shown, answer, given }.
 */
(function () {
  'use strict';
  var AT = window.AT, T = AT.Taylor, S = AT.Stats, G = AT.Generator, TeX = AT.TeX;
  var K = AT.UI.kit, esc = K.esc, $ = K.$, $$ = K.$$;
  var LEARN_COUNT = 20;
  var TYPE_NAME = { f2dl: 'Function → expansion', dl2f: 'Expansion → function', est: 'Estimation' };
  var sess = null;

  function st() { return T.settings(K.data().settings.taylor); }
  function store(s) { K.data().settings.taylor = s; K.save(); }
  function math(tex, text) { return TeX.render(tex, text); }
  function now() { return Date.now(); }

  // ---------- the lesson page ----------

  function render() {
    stopTimer();
    sess = null;
    var s = st(), rounds = K.data().rounds, states = T.states(rounds, S.factStats(rounds), S.dayKey);
    var nMastered = T.LIB.filter(function (e) { return states[e.key] === 'mastered'; }).length;
    var h = [K.pageHead('Taylor expansions', '<a href="#learn">Learn</a>, calculus. ' + nMastered + ' of ' + T.LIB.length + ' mastered.',
      '<button type="button" id="ty-learn" class="primary" data-testid="taylor-learn">Learn <kbd>Enter</kbd></button>' +
      '<button type="button" id="ty-s60" data-testid="taylor-sprint-60">Sprint 60 s <kbd>F</kbd></button>' +
      '<button type="button" id="ty-s120" data-testid="taylor-sprint-120">Sprint 120 s <kbd>G</kbd></button>', 'learn-title')];
    h.push(K.section('The idea', '<p class="lesson-rule">Know each expansion at a glance: the signs, k! against k, and where the remainder starts. ' +
      'Learn picks the ones you have not seen, then the ones you get wrong. A sprint is 60 or 120 seconds of quick picks.</p>'));

    function seg(name, key, list, isOn) {
      return '<div class="seg" role="group" aria-label="' + name + '">' + list.map(function (o) {
        var on = isOn(o[0]);
        return '<button type="button" data-ty-' + key + '="' + o[0] + '" aria-pressed="' + on + '"' + (on ? ' class="on"' : '') + '>' + esc(o[1]) + '</button>';
      }).join('') + '</div>';
    }
    var orders = [2, 3, 4, 5, 6, 7];
    var sel = function (id, v, what) {
      return '<select id="' + id + '" aria-label="' + what + '">' + orders.map(function (n) { return '<option value="' + n + '"' + (n === v ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>';
    };
    h.push('<form class="panel" id="ty-form" data-testid="taylor-settings" onsubmit="return false"><div class="form">' +
      K.frow('Expansions', seg('Tiers', 'tier', T.TIERS.map(function (t) { return [t.n, t.name]; }), function (n) { return s.tiers.indexOf(n) >= 0; }),
        'Basics at 0 stay on while the others are off.') +
      K.frow('Questions', seg('Question types', 'type', T.TYPES, function (t) { return s.types.indexOf(t) >= 0; })) +
      K.frow('Orders', 'From ' + sel('ty-from', s.from, 'Lowest order') + ' to ' + sel('ty-to', s.to, 'Highest order'), 'Basics at 0 only; the other tiers use their own order.') +
      K.frow('Names', seg('Function names', 'nota', [['fr', 'ch, sh, th, argth'], ['en', 'cosh, sinh, tanh, artanh']], function (n) { return s.notation === n; })) +
      K.frow('Sprint penalty', seg('Points lost per wrong answer', 'pen', [[0, '0'], [0.5, '−0.5'], [1, '−1']], function (p) { return s.penalty === p; }),
        'Points lost for a wrong answer in a sprint. A skip (Tab) costs nothing.') +
      '</div></form>');

    // the mastery grid, per tier
    var LEG = { unseen: 'not seen', seen: 'seen', weak: 'weak', mastered: 'mastered' };
    h.push(K.section('Your expansions', '<p class="sec-intro">Dashed: not seen yet. Outlined: seen. Inverted: weak. Filled grey: mastered (your last 3 days on it, Learn or Sprint, all right, no hint, under 6 s).</p>' +
      T.TIERS.map(function (t) {
        return '<h3 class="sub-h">' + esc(t.name) + '</h3><ul class="ty-grid" data-testid="taylor-grid-' + t.n + '">' + T.LIB.filter(function (e) { return e.tier === t.n; }).map(function (e) {
          var nm = T.nameOf(e, s.notation), stt = states[e.key];
          return '<li class="ty-cell ' + stt + '" data-key="' + e.key + '" aria-label="' + esc(nm.text + (e.point ? ' around ' + e.point.text : '') + ': ' + LEG[stt]) + '">' +
            '<span aria-hidden="true">' + math(nm.tex, nm.text) + (e.point ? '<span class="ty-at"> at ' + esc(e.point.text) + '</span>' : '') + '</span></li>';
        }).join('') + '</ul>';
      }).join('')));
    h.push(K.keys([['Enter', 'learn'], ['F', 'sprint 60 s'], ['G', 'sprint 120 s'], ['N', 'all lessons']]));
    K.main().innerHTML = h.join('');
    bindHome();
  }

  function bindHome() {
    function upd(fn, focusSel) { var s = st(); fn(s); store(T.settings(s)); render(); var el = focusSel && $(focusSel); if (el) el.focus(); }
    $$('[data-ty-tier]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = +b.getAttribute('data-ty-tier');
        upd(function (s) {
          var i = s.tiers.indexOf(n);
          if (i >= 0) { if (s.tiers.length > 1) s.tiers.splice(i, 1); } else s.tiers.push(n);
          s.tiers.sort();
        }, '[data-ty-tier="' + n + '"]');
      });
    });
    $$('[data-ty-type]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-ty-type');
        upd(function (s) { var i = s.types.indexOf(t); if (i >= 0) { if (s.types.length > 1) s.types.splice(i, 1); } else s.types.push(t); }, '[data-ty-type="' + t + '"]');
      });
    });
    $$('[data-ty-nota]').forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-ty-nota'); upd(function (s) { s.notation = v; }, '[data-ty-nota="' + v + '"]'); }); });
    $$('[data-ty-pen]').forEach(function (b) { b.addEventListener('click', function () { var v = +b.getAttribute('data-ty-pen'); upd(function (s) { s.penalty = v; }, '[data-ty-pen="' + v + '"]'); }); });
    ['ty-from', 'ty-to'].forEach(function (id) {
      $('#' + id).addEventListener('change', function () { var v = +this.value; upd(function (s) { s[id === 'ty-from' ? 'from' : 'to'] = v; }, '#' + id); });
    });
    $('#ty-learn').addEventListener('click', function () { start('learn'); });
    $('#ty-s60').addEventListener('click', function () { start('sprint', 60); });
    $('#ty-s120').addEventListener('click', function () { start('sprint', 120); });
    K.setKeys(function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'Enter' || k === ' ') { start('learn'); return true; }
      if (k === 'f') { start('sprint', 60); return true; }
      if (k === 'g') { start('sprint', 120); return true; }
      return false;
    });
  }

  // ---------- sessions ----------

  function start(kind, duration) {
    var s = st(), rounds = K.data().rounds, rng = G.mulberry32(K.seed());
    var items = T.pickSet(T.pool(s), rounds, S.factStats(rounds), S.dayKey, rng, kind === 'learn' ? LEARN_COUNT : 400);
    sess = { kind: kind, duration: duration || null, s: s, rng: rng, items: items, i: 0, questions: [], score: 0,
      startedAt: new Date(now()).toISOString(), saved: false, q: null, result: null, hinted: false };
    K.onLeave(leave);
    if (kind === 'sprint') { sess.deadline = now() + duration * 1000; startTimer(); }
    next();
  }

  function next() {
    if (sess.kind === 'learn' && sess.i >= sess.items.length) { finish(); return; }
    var it = sess.items[sess.i++ % sess.items.length], e = T.BY[it.key], orders = T.ordersFor(e, sess.s);
    var order = it.order || orders[Math.floor(sess.rng() * orders.length)];
    sess.item = { key: it.key, type: it.type, order: order, again: !!it.again };   // what was asked, for the comeback
    sess.q = T.question(it.key, it.type, order, sess.rng, { notation: sess.s.notation });
    sess.q.again = !!it.again;
    sess.result = null; sess.hinted = false; sess.t0 = now();
    draw();
  }

  function rightCount() { return sess.questions.filter(function (q) { return q.correct; }).length; }

  function draw() {
    var q = sess.q, r = sess.result, learn = sess.kind === 'learn', h = [];
    var head = learn ? 'Question ' + Math.min(sess.i, sess.items.length) + ' of ' + sess.items.length + (sess.questions.length ? ', ' + rightCount() + ' right so far' : '')
      : 'Score <b class="num" data-testid="taylor-score">' + fmtScore(sess.score) + '</b>, <span class="num" data-testid="taylor-timer">' + secondsLeft() + '</span> s left';
    h.push(K.pageHead(learn ? 'Taylor expansions: learn' : 'Taylor sprint, ' + sess.duration + ' s', head,
      '<button type="button" id="ty-done" data-testid="taylor-done">' + (learn ? 'Done' : 'Stop') + ' <kbd>Esc</kbd></button>'));
    h.push('<div class="fq ty-q" data-testid="taylor-question" data-key="' + q.key + '" data-type="' + q.type + '">');
    h.push('<p class="fq-meta">' + (q.again ? '<b data-testid="taylor-again">Again</b>, ' : '') + esc(T.TIERS[q.tier - 1].name) + ', ' + esc(TYPE_NAME[q.type].toLowerCase()) + '</p>');
    h.push('<p class="fq-prompt" id="ty-prompt">' + TeX.rich(q.prompt) + '</p>');
    if (q.display) h.push('<div class="ty-display" data-testid="taylor-display">' + math(q.display.tex, q.display.text) + '</div>');
    h.push('<ol class="fq-opts ty-opts" aria-labelledby="ty-prompt">' + q.choices.map(function (c, i) {
      var cls = r ? (i === q.correct ? ' right' : i === r.chosen ? ' chosen' : '') : '';
      var tag = r ? (i === q.correct ? '<span class="sr-only"> (right answer)</span>' : i === r.chosen ? '<span class="sr-only"> (your answer)</span>' : '') : '';
      return '<li><button type="button" class="opt' + cls + '" data-opt="' + i + '" data-testid="taylor-option-' + (i + 1) + '"' + (r ? ' disabled' : '') + '>' +
        '<kbd>' + (i + 1) + '</kbd><span class="ot">' + math(c.tex, c.text) + '</span>' + tag + '</button></li>';
    }).join('') + '</ol>');
    if (learn && sess.hinted && !r) h.push('<p class="ty-hint" data-testid="taylor-hint"><b>Method.</b> ' + esc(q.method) + '</p>');
    h.push('</div>');
    if (r) h.push(resultHtml(q, r));
    else h.push(K.keys(learn ? [['1–6', 'choose'], ['H', 'show the method first'], ['Esc', 'finish']] : [['1–6', 'choose'], ['Tab', 'skip'], ['Esc', 'stop']]));
    K.main().innerHTML = h.join('');
    bindSession();
  }

  function resultHtml(q, r) {
    var h = ['<div class="fq-result" data-testid="taylor-result"><p class="verdict" role="status">' + (r.ok ? '<b>Right.</b>' : '<b>Not quite.</b> The right answer is number ' + (q.correct + 1) + '.') + '</p>'];
    if (q.est) {
      var ex = q.est;
      h.push('<dl class="facts ty-est"><div><dt>True value</dt><dd class="num">' + esc(T.fmt4(ex.truth)) + '</dd></div><div><dt>Expansion at order ' + ex.order + '</dt><dd class="num">' + esc(ex.dl.toFixed(6)) +
        '</dd></div><div><dt>Error</dt><dd class="num">' + esc(ex.err.toExponential(1)) + '</dd></div></dl>');
    }
    h.push('<div class="ty-full">' + math(q.full.tex, q.full.text) + '</div>');
    if (q.generic) h.push('<p class="mid">In general: ' + math(q.generic.tex, q.generic.text) + '</p>');
    h.push('<p class="fq-why"><b>Method.</b> ' + esc(q.method) + '</p>');
    h.push('<div class="row"><button type="button" class="primary" id="ty-next" data-testid="taylor-next">' + (sess.i >= sess.items.length ? 'See your score' : 'Next') + ' <kbd>Enter</kbd></button></div></div>');
    return h.join('');
  }

  function bindSession() {
    $('#ty-done').addEventListener('click', finish);
    if (!sess.result) $$('[data-opt]').forEach(function (b) { b.addEventListener('click', function () { answer(+b.getAttribute('data-opt')); }); });
    else { $('#ty-next').addEventListener('click', next); $('#ty-next').focus(); }
    K.setKeys(function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'Escape') { finish(); return true; }
      if (!sess.result) {
        if (/^[1-6]$/.test(k)) { answer(+k - 1); return true; }
        if (k === 'h' && sess.kind === 'learn' && !sess.hinted) { sess.hinted = true; draw(); return true; }
        if (k === 'Tab' && sess.kind === 'sprint') { skip(); return true; }
        return false;
      }
      if (k === 'Enter') { next(); return true; }
      return false;
    });
  }

  function record(chosen) {
    var q = sess.q, ok = chosen === q.correct;
    var rec = { op: 'ty', key: q.key, type: q.type, order: q.order, correct: ok, chosenIndex: chosen, timeMs: Math.max(1, now() - sess.t0),
      hinted: sess.hinted, wrongAttempts: ok ? 0 : 1, shown: q.promptText, answer: q.choices[q.correct].text,
      given: chosen === null ? '' : q.choices[chosen].text };
    if (chosen === null) { rec.skipped = true; rec.unanswered = true; rec.wrongAttempts = 0; }
    if (q.again) rec.again = true;   // a relearning comeback
    sess.questions.push(rec);
    return ok;
  }

  function answer(i) {
    if (sess.result || !sess.q) return;
    var ok = record(i);
    if (sess.kind === 'sprint') {   // no feedback: the score moves, the next question comes
      sess.score += ok ? 1 : -sess.s.penalty;
      next();
      return;
    }
    // wrong, or helped by the method: it comes back once, 3 to 5 questions later, in another form
    if (!ok || sess.hinted) T.relearn(sess.items, sess.i, sess.item, sess.s, sess.rng);
    sess.result = { ok: ok, chosen: i };
    draw();
  }
  function skip() { record(null); next(); }

  // ---------- the clock ----------

  var timer = null;
  function secondsLeft() { return Math.max(0, Math.ceil((sess.deadline - now()) / 1000)); }
  function startTimer() {
    stopTimer();
    timer = setInterval(function () {
      if (!sess || sess.kind !== 'sprint') { stopTimer(); return; }
      if (now() >= sess.deadline) { finish(); return; }
      var t = document.querySelector('[data-testid="taylor-timer"]');
      if (t) t.textContent = secondsLeft();
    }, 100);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function fmtScore(x) { return x % 1 ? x.toFixed(1).replace('-', '−') : String(x).replace('-', '−'); }

  // ---------- saving and the end ----------

  function save() {
    if (!sess || sess.saved || !sess.questions.length) return null;
    sess.saved = true;
    var lesson = sess.kind === 'learn' ? 'taylor-learn' : 'taylor-sprint-' + sess.duration;
    var round = { id: AT.Storage.uuid(), startedAt: sess.startedAt, mode: 'LEARN',
      settings: { lesson: lesson, duration: sess.duration || undefined, tiers: sess.s.tiers, types: sess.s.types, notation: sess.s.notation, penalty: sess.kind === 'sprint' ? sess.s.penalty : undefined },
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
    var round = save(), kind = sess.kind, duration = sess.duration, qs = sess.questions;
    K.onLeave(null);
    sess = null;
    if (!round) { render(); return; }
    var title = kind === 'learn' ? 'Taylor expansions: learn' : 'Taylor sprint, ' + duration + ' s';
    var right = qs.filter(function (q) { return q.correct; }).length, wrong = qs.filter(function (q) { return !q.correct && !q.skipped; }).length;
    var skipped = qs.filter(function (q) { return q.skipped; }).length;
    var h = ['<div class="end">', '<h1 class="sr-only">' + esc(title) + ' finished</h1>'];
    h.push(K.endHead(fmtScore(round.score), title, right + ' right, ' + wrong + ' wrong' + (skipped ? ', ' + skipped + ' skipped' : '')));
    h.push(K.endButtons([['again', kind === 'learn' ? 'Learn again' : 'Sprint again', 'Enter'], ['l', 'Back to the lesson', 'L'], ['a', 'See today’s analysis', 'A']]));
    h.push(K.section('Every question', '<div class="tbl-scroll"><table class="compact" data-testid="taylor-review"><tr><th scope="col" class="n">#</th><th scope="col">Question</th>' +
      '<th scope="col">Your answer</th><th scope="col">Right answer</th><th scope="col" class="n">Time</th><th scope="col">Result</th></tr>' +
      qs.map(function (q, i) {
        return '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(q.shown) + '</td><td class="mid">' + esc(q.given || '') + '</td><td>' + esc(q.answer) + '</td><td class="n">' +
          K.sec(q.timeMs) + '</td><td' + (q.correct ? '' : ' class="mid"') + '>' + (q.skipped ? 'Skipped' : q.correct ? (q.hinted ? 'Right, with the method' : 'Right') : 'Wrong') + '</td></tr>';
      }).join('') + '</table></div>'));
    h.push('</div>');
    K.main().innerHTML = h.join('');
    var actions = {
      again: function () { start(kind, duration); },
      l: function () { K.go('learn', 'taylor'); },
      a: function () { K.go('stats', 'day/' + K.todayKey()); }
    };
    K.bindEndButtons(actions);
    K.endKeys(actions);
  }

  AT.TaylorUI = { render: render };
})();
