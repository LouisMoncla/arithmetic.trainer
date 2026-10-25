/*
 * game.js — the play screen: countdown, timer, input, per-question logging.
 * Two loops:
 *   startZetamac:  answers auto-accept the moment the typed value is correct. A fraction answer
 *                  (q.frac) shows two boxes: the numerator first, then the denominator, each auto-accepted.
 *   startInterview: Enter submits, Tab skips, negative marking.
 * During a game only the question, input, timer and score are shown.
 */
(function () {
  'use strict';
  var AT = window.AT = window.AT || {};
  var Game = { active: false };

  var root, qEl, ansEl, inEl, barEl, denEl, curEl, timerEl, scoreEl, st;

  function now() { return performance.now(); }

  function mount(extraTop) {
    root = document.getElementById('game');
    root.innerHTML =
      '<div class="g-top num"><span id="g-timer" data-testid="game-timer"></span>' + (extraTop || '') + '<span id="g-score" data-testid="game-score"></span></div>' +
      '<div class="g-center"><div id="g-q" class="g-q num" aria-live="off" data-testid="game-question"></div>' +
      '<div id="g-ans" class="g-ans">' +
      '<input id="g-in" class="g-in num" name="answer" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" ' +
      'autocapitalize="off" spellcheck="false" aria-label="Answer">' +
      '<span id="g-bar" class="g-bar num" aria-hidden="true" hidden>/</span>' +
      '<input id="g-den" class="g-in num" name="denominator" type="text" inputmode="numeric" autocomplete="off" autocorrect="off" ' +
      'autocapitalize="off" spellcheck="false" aria-label="Denominator" hidden></div></div>';
    qEl = document.getElementById('g-q'); ansEl = document.getElementById('g-ans'); inEl = document.getElementById('g-in');
    barEl = document.getElementById('g-bar'); denEl = document.getElementById('g-den'); curEl = inEl;
    timerEl = document.getElementById('g-timer'); scoreEl = document.getElementById('g-score');
    document.body.classList.add('playing');
    root.hidden = false;
    // Keep focus in the current box no matter where you click.
    root.onmousedown = function (e) { if (e.target !== curEl) { e.preventDefault(); curEl.focus(); } };
    inEl.onblur = denEl.onblur = function () { if (Game.active) setTimeout(function () { if (Game.active) curEl.focus(); }, 0); };
    Game.active = true;
  }

  function unmount() {
    Game.active = false;
    clearInterval(st && st.interval);
    (st && st.timeouts || []).forEach(clearTimeout);
    document.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('playing');
    root.hidden = true;
    root.innerHTML = '';
  }

  // Thick outline on the input after a wrong interview answer. No colour change, no screen flash.
  function markWrong() {
    root.classList.add('wrong');
    setTimeout(function () { root.classList.remove('wrong'); }, 150);
  }

  function countdown(then) {
    if (!st.opts.countdown) { then(); return; }
    inEl.style.opacity = '0'; // stays focusable; typing is ignored until the round starts
    var n = 3;
    qEl.textContent = '3';
    function stepFn() {
      n--;
      if (n > 0) { qEl.textContent = String(n); st.timeouts.push(setTimeout(stepFn, 1000)); }
      else { inEl.style.opacity = ''; then(); }
    }
    st.timeouts.push(setTimeout(stepFn, 1000));
  }

  function fmtClock(sec) {
    if (sec < 100) return String(sec);
    return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2);
  }

  function tick() {
    var left = st.duration - (now() - st.t0) / 1000;
    timerEl.textContent = fmtClock(Math.max(0, Math.ceil(left)));
    if (left <= 0) finish(true);
  }

  function onKey(e) {
    if (!Game.active) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); var cb = st.opts.onAbort; unmount(); cb(); return; }
    if (st.kind === 'interview' && st.running) {
      // stopPropagation: the Enter that ends the round must not reach the end screen.
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submitInterview(); }
      else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); answerInterview(null); }
    }
  }

  function start(kind, opts, extraTop) {
    mount(extraTop);
    st = { kind: kind, opts: opts, score: 0, questions: [], timeouts: [], running: false, duration: opts.duration };
    document.addEventListener('keydown', onKey, true);
    inEl.focus();
    timerEl.textContent = fmtClock(opts.duration);
    scoreEl.textContent = '';
    countdown(begin);
  }

  function begin() {
    st.running = true;
    st.t0 = now();
    st.startedAt = new Date().toISOString();
    scoreEl.textContent = 'Score: 0';
    nextQuestion();
    st.interval = setInterval(tick, 50);
    inEl.focus();
  }

  function nextQuestion() {
    st.q = st.opts.generator.next();
    st.qStart = now();
    st.wrongSeen = {};
    st.wrong = 0;
    qEl.textContent = st.q.shown;
    inEl.value = ''; denEl.value = '';
    var fr = !!st.q.frac;
    ansEl.classList.toggle('frac', fr);
    barEl.hidden = denEl.hidden = !fr;
    inEl.readOnly = false;
    inEl.setAttribute('aria-label', fr ? 'Numerator' : 'Answer');
    st.part = fr ? 'num' : null;
    curEl = inEl; inEl.focus();
    if (st.kind === 'interview') {
      var c = document.getElementById('g-count');
      if (c) c.textContent = (st.questions.length + 1) + ' / ' + st.opts.count;
    }
  }

  // ---------- Zetamac ----------

  // What a finished question stores. Tricks also keep their type (and decimal answer text).
  function record(q, extra) {
    var rec = { op: q.op, a: q.a, b: q.b, shown: q.shown, answer: q.answer };
    if (q.op === 'tr') { rec.type = q.type; if (q.answerText) rec.answerText = q.answerText; }
    for (var k in extra) rec[k] = extra[k];
    return rec;
  }

  // Keep a box to digits, plus a point when `dot` (decimal answers). ".375" reads as "0.375".
  function cleanInput(el, dot) {
    var v = el.value, clean = v.replace(dot ? /[^0-9.]/g : /[^0-9]/g, '');
    if (clean !== v) el.value = clean;
    return clean.charAt(0) === '.' ? '0' + clean : clean;
  }

  // One wrong attempt per distinct full-length wrong value (per box, for fractions).
  function countWrong(typed, target) {
    var k = (st.part || '') + typed;
    if (typed.length >= target.length && !st.wrongSeen[k]) { st.wrongSeen[k] = 1; st.wrong++; }
  }

  function accept() {
    st.questions.push(record(st.q, { timeMs: Math.round(now() - st.qStart), wrongAttempts: st.wrong }));
    st.score++;
    scoreEl.textContent = 'Score: ' + st.score;
    nextQuestion();
  }

  function onZetamacInput() {
    if (!st.running) { inEl.value = ''; return; }
    var fr = st.q.frac, ans = fr ? String(fr[0]) : st.q.answerText || String(st.q.answer);
    var typed = cleanInput(inEl, !fr && ans.indexOf('.') >= 0);
    if (!typed) return;
    if (typed !== ans) { countWrong(typed, ans); return; }
    if (!fr) { accept(); return; }
    // Right numerator: it stays, and the denominator box takes over.
    inEl.readOnly = true; st.part = 'den';
    curEl = denEl; denEl.focus();
  }

  function onDenInput() {
    if (!st.running || st.part !== 'den') { denEl.value = ''; return; }
    var typed = cleanInput(denEl, false), ans = String(st.q.frac[1]);
    if (!typed) return;
    if (typed === ans) accept(); else countWrong(typed, ans);
  }

  Game.startZetamac = function (opts) {
    // opts: { mode, settings, generator, duration, countdown, onEnd(round), onAbort() }
    start('zetamac', opts);
    var types = opts.settings.types || [];
    inEl.setAttribute('inputmode', types.indexOf('frac') >= 0 ? 'decimal' : 'numeric');
    inEl.oninput = onZetamacInput;
    denEl.oninput = onDenInput;
  };

  // ---------- Interview ----------

  function answerInterview(given) {
    var q = st.q, G = AT.Generator;
    var skipped = given === null, correct = !skipped && G.checkInterview(q, given);
    st.questions.push({
      op: 'iv', type: q.type, keys: q.keys, shown: q.shown, answer: q.answer, answerText: q.answerText,
      given: skipped ? null : given, correct: correct, skipped: skipped,
      timeMs: Math.round(now() - st.qStart), wrongAttempts: correct || skipped ? 0 : 1
    });
    if (correct) st.score += 1;
    else if (!skipped) { st.score -= st.opts.negMark; markWrong(); }
    scoreEl.textContent = 'Score: ' + (Math.round(st.score * 100) / 100);
    if (st.questions.length >= st.opts.count) finish(false);
    else nextQuestion();
  }

  function submitInterview() {
    var v = inEl.value.trim();
    if (!v) return;
    answerInterview(v);
  }

  Game.startInterview = function (opts) {
    // opts: { generator, count, duration, negMark, countdown, onEnd(round), onAbort() }
    start('interview', opts, '<span id="g-count" data-testid="game-count"></span>');
    inEl.oninput = function () {
      var v = inEl.value, clean = v.replace(/[^0-9.\-\/]/g, '');
      if (clean !== v) inEl.value = clean;
    };
  };

  // ---------- end ----------

  function finish(timeUp) {
    if (!st.running) return;
    st.running = false;
    clearInterval(st.interval);
    if (timeUp && st.q) {
      var q = st.q, extra = { timeMs: Math.round(now() - st.qStart), wrongAttempts: st.wrong || 0, unanswered: true }, rec;
      if (q.op === 'iv') { rec = { op: q.op, shown: q.shown, answer: q.answer, type: q.type, keys: q.keys, answerText: q.answerText }; for (var k in extra) rec[k] = extra[k]; }
      else rec = record(q, extra);
      st.questions.push(rec);
    }
    var o = st.opts;
    var round = {
      id: AT.Storage.uuid(), startedAt: st.startedAt, mode: o.mode, settings: o.settings,
      score: Math.round(st.score * 100) / 100, questions: st.questions
    };
    var cb = o.onEnd;
    unmount();
    cb(round);
  }

  AT.Game = Game;
})();
