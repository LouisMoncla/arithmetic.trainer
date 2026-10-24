/*
 * game.js — the play screen: countdown, timer, input, per-question logging.
 * Two loops:
 *   startZetamac:  answers auto-accept the moment the typed value is correct.
 *   startInterview: Enter submits, Tab skips, negative marking.
 * During a game only the question, input, timer and score are shown.
 */
(function () {
  'use strict';
  var AT = window.AT = window.AT || {};
  var Game = { active: false };

  var root, qEl, inEl, timerEl, scoreEl, st;

  function now() { return performance.now(); }

  function mount(extraTop) {
    root = document.getElementById('game');
    root.innerHTML =
      '<div class="g-top num"><span id="g-timer" data-testid="game-timer"></span>' + (extraTop || '') + '<span id="g-score" data-testid="game-score"></span></div>' +
      '<div class="g-center"><div id="g-q" class="g-q num" aria-live="off" data-testid="game-question"></div>' +
      '<input id="g-in" class="g-in num" name="answer" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" ' +
      'autocapitalize="off" spellcheck="false" aria-label="Answer"></div>';
    qEl = document.getElementById('g-q'); inEl = document.getElementById('g-in');
    timerEl = document.getElementById('g-timer'); scoreEl = document.getElementById('g-score');
    document.body.classList.add('playing');
    root.hidden = false;
    // Keep focus in the input no matter where you click.
    root.onmousedown = function (e) { if (e.target !== inEl) { e.preventDefault(); inEl.focus(); } };
    inEl.onblur = function () { if (Game.active) setTimeout(function () { if (Game.active) inEl.focus(); }, 0); };
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
    inEl.value = '';
    if (st.kind === 'interview') {
      var c = document.getElementById('g-count');
      if (c) c.textContent = (st.questions.length + 1) + ' / ' + st.opts.count;
    }
  }

  // ---------- Zetamac ----------

  function onZetamacInput() {
    if (!st.running) { inEl.value = ''; return; }
    var v = inEl.value, clean = v.replace(/[^0-9]/g, '');
    if (clean !== v) inEl.value = clean;
    if (!clean) return;
    var ans = String(st.q.answer);
    if (clean === ans) {
      var q = st.q;
      st.questions.push({ op: q.op, a: q.a, b: q.b, shown: q.shown, answer: q.answer, timeMs: Math.round(now() - st.qStart), wrongAttempts: st.wrong });
      st.score++;
      scoreEl.textContent = 'Score: ' + st.score;
      nextQuestion();
    } else if (clean.length >= ans.length && !st.wrongSeen[clean]) {
      // One wrong attempt per distinct full-length wrong value.
      st.wrongSeen[clean] = 1;
      st.wrong++;
    }
  }

  Game.startZetamac = function (opts) {
    // opts: { mode, settings, generator, duration, countdown, onEnd(round), onAbort() }
    start('zetamac', opts);
    inEl.setAttribute('inputmode', 'numeric');
    inEl.oninput = onZetamacInput;
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
      var q = st.q, rec = { op: q.op, shown: q.shown, answer: q.answer, timeMs: Math.round(now() - st.qStart), wrongAttempts: st.wrong || 0, unanswered: true };
      if (q.op === 'iv') { rec.type = q.type; rec.keys = q.keys; rec.answerText = q.answerText; }
      else { rec.a = q.a; rec.b = q.b; }
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
