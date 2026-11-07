/*
 * game.js — the play screen: countdown, timer, input, per-question logging.
 * Two loops:
 *   startZetamac:  answers auto-accept the moment the typed value is correct. A fraction answer
 *                  (q.frac) shows two boxes: the numerator first, then the denominator, each auto-accepted.
 *                  Trick modes: Tab skips a question (stored unanswered + skipped, no point).
 *   startPractice: the Learn tab. The same input, but no clock and a fixed number of questions.
 *                  A wrong full-length answer, or Tab, shows the method under the box; typing the
 *                  right answer then moves on. Nothing is saved (ui.js decides), so timing stats stay clean.
 *   startInterview: Enter submits, Tab skips, negative marking.
 *   startFinance:  the Finance tab's sprint. Questions from AT.Finance (template + seed), the unit beside the box and
 *                  the answer instruction under it. Accepted the moment the typed value equals the displayed answer;
 *                  estimates (no single spelling) need Enter, checked against their tolerance. Tab skips.
 *                  H pauses to learn: the clock stops and the formula and worked solution show; after it, the same
 *                  question comes back and typing the answer moves on, with no point (saved as learned).
 *   startMatrix:   2 × 2 products. Four answer boxes in a grid: Space goes to the next box, arrows move
 *                  anywhere, the matrix is accepted the moment all four entries are right. Enter outlines
 *                  the wrong entries (until you edit them), Tab skips.
 * During a game only the question, input, timer and score are shown.
 */
(function () {
  'use strict';
  var AT = window.AT = window.AT || {};
  var Game = { active: false };

  var root, qEl, ansEl, inEl, barEl, denEl, curEl, timerEl, scoreEl, st;
  var gridEl, cells = [];   // matrix rounds: the 2 × 2 answer grid, row-major

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
      'autocapitalize="off" spellcheck="false" aria-label="Denominator" hidden>' +
      '<span id="g-unit" class="g-unit num" data-testid="game-unit" hidden></span></div>' +
      '<p id="g-hint" class="g-hint" data-testid="game-fraction-hint" hidden>In lowest terms</p>' +
      '<p id="g-method" class="g-method" data-testid="game-method" aria-live="polite" hidden></p></div>';
    qEl = document.getElementById('g-q'); ansEl = document.getElementById('g-ans'); inEl = document.getElementById('g-in');
    barEl = document.getElementById('g-bar'); denEl = document.getElementById('g-den'); curEl = inEl;
    timerEl = document.getElementById('g-timer'); scoreEl = document.getElementById('g-score');
    document.body.classList.add('playing');
    root.hidden = false;
    // Keep focus in the current box no matter where you click.
    // Paused to learn (Finance), clicks work normally: scroll the solution, select text, press Back.
    root.onmousedown = function (e) { if (st && st.paused) return; if (e.target !== curEl) { e.preventDefault(); curEl.focus(); } };
    inEl.onblur = denEl.onblur = function () { if (Game.active) setTimeout(function () { if (Game.active) curEl.focus(); }, 0); };
    Game.active = true;
  }

  // Matrix rounds: the question is two bracketed grids, the answer a 2 × 2 grid of boxes.
  function mountMatrix(settings) {
    root = document.getElementById('game');
    // A minus sign is only possible when entries can be negative; boxes fit the longest possible product.
    var r = AT.Generator.matrixRange(settings), neg = r.lo < 0, big = Math.max(Math.abs(r.lo), Math.abs(r.hi));
    var width = String(2 * big * big).length + (neg ? 1 : 0) + 1;
    var box = function (i) {
      return '<input class="g-in g-cell num" data-testid="game-cell-' + i + '" name="cell-' + i + '" type="text" inputmode="' +
        (neg ? 'text' : 'numeric') + '" style="width:' + Math.max(4, width) + 'ch" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ' +
        'aria-label="Row ' + (i < 2 ? 1 : 2) + ', column ' + (i % 2 + 1) + '">';
    };
    root.innerHTML =
      '<div class="g-top num"><span id="g-timer" data-testid="game-timer"></span><span id="g-score" data-testid="game-score"></span></div>' +
      '<div class="g-center"><div id="g-q" class="g-q mx-q num" aria-live="off" data-testid="game-question"></div>' +
      '<div class="g-mx-ans"><span class="mx-eq num" aria-hidden="true">=</span><div id="g-grid" class="g-grid">' + [0, 1, 2, 3].map(box).join('') + '</div></div>' +
      '<p id="g-method" class="g-method" hidden></p></div>';
    qEl = document.getElementById('g-q'); gridEl = document.getElementById('g-grid');
    cells = Array.prototype.slice.call(gridEl.querySelectorAll('input'));
    inEl = curEl = cells[0];
    timerEl = document.getElementById('g-timer'); scoreEl = document.getElementById('g-score');
    document.body.classList.add('playing');
    root.hidden = false;
    // Clicking a box focuses it; clicking anywhere else keeps the current box.
    root.onmousedown = function (e) { if (cells.indexOf(e.target) < 0) { e.preventDefault(); curEl.focus(); } };
    cells.forEach(function (c, i) {
      c.onfocus = function () { curEl = c; };
      c.onblur = function () { if (Game.active) setTimeout(function () { if (Game.active && cells.indexOf(document.activeElement) < 0) curEl.focus(); }, 0); };
      c.oninput = function () { onCellInput(i); };
    });
    Game.active = true;
  }

  function unmount() {
    Game.active = false;
    clearInterval(st && st.interval);
    (st && st.timeouts || []).forEach(clearTimeout);
    document.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('playing');
    root.classList.remove('fin');
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
    var hide = st.kind === 'matrix' ? gridEl : inEl;
    hide.style.opacity = '0'; // stays focusable; typing is ignored until the round starts
    var n = 3;
    qEl.textContent = '3';
    function stepFn() {
      n--;
      if (n > 0) { qEl.textContent = String(n); st.timeouts.push(setTimeout(stepFn, 1000)); }
      else { hide.style.opacity = ''; then(); }
    }
    st.timeouts.push(setTimeout(stepFn, 1000));
  }

  function fmtClock(sec) {
    if (sec < 100) return String(sec);
    return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2);
  }

  var HINT_MS = 5000;
  function tick() {
    if (st.paused) return;   // Finance: pausing to learn stops the clock
    var left = st.duration - (now() - st.t0) / 1000;
    timerEl.textContent = fmtClock(Math.max(0, Math.ceil(left)));
    // Road to 60 drills: the method (never the answer) in the grey line once a question has waited 5 s.
    if (st.opts.hint && st.q && !st.method && now() - st.qStart >= HINT_MS) {
      var h = st.opts.hint(st.q);
      if (h) { st.method = true; var m = document.getElementById('g-method'); m.textContent = h; m.classList.add('hint'); m.hidden = false; }
    }
    if (left <= 0) finish(true);
  }

  function onKey(e) {
    if (!Game.active) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); var cb = st.opts.onAbort; unmount(); cb(); return; }
    if (st.kind === 'interview' && st.running) {
      // stopPropagation: the Enter that ends the round must not reach the end screen.
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submitInterview(); }
      else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); answerInterview(null); }
    } else if (st.kind === 'zetamac' && st.running && st.skip && e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation(); skipZetamac();
    } else if (st.kind === 'practice' && st.running && e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation(); showMethod();
    } else if (st.kind === 'matrix' && st.running) {
      matrixKey(e);
    } else if (st.kind === 'finance' && st.running) {
      if (st.paused) {
        // Only Enter or H (back to the round) and Esc (stop) work while paused.
        if (e.key === 'Enter' || e.key === 'h' || e.key === 'H') { e.preventDefault(); e.stopPropagation(); resumeLearn(); }
        else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); }
        return;
      }
      if (e.key === 'h' || e.key === 'H') { e.preventDefault(); e.stopPropagation(); pauseLearn(); }   // H: help, never part of an answer
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submitFinance(); }
      else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); skipFinance(); }
    }
  }

  function start(kind, opts, extraTop) {
    if (kind === 'matrix') mountMatrix(opts.settings); else mount(extraTop);
    root.classList.toggle('fin', kind === 'finance');
    st = { kind: kind, opts: opts, score: 0, questions: [], timeouts: [], running: false, duration: opts.duration };
    document.addEventListener('keydown', onKey, true);
    inEl.focus();
    timerEl.textContent = kind === 'practice' ? '' : fmtClock(opts.duration);
    scoreEl.textContent = '';
    countdown(begin);
  }

  function begin() {
    st.running = true;
    st.t0 = now();
    st.startedAt = new Date().toISOString();
    if (st.kind === 'practice') { nextQuestion(); inEl.focus(); return; }   // no clock, no score
    scoreEl.textContent = 'Score: 0';
    nextQuestion();
    st.interval = setInterval(tick, 50);
    inEl.focus();
  }

  function nextQuestion() {
    if (st.kind === 'matrix') { nextMatrix(); return; }
    if (st.kind === 'finance') { nextFinance(); return; }
    st.q = st.opts.generator.next();
    st.qStart = now();
    st.wrongSeen = {};
    st.wrong = 0;
    qEl.textContent = st.q.shown;
    inEl.value = ''; denEl.value = '';
    var fr = !!st.q.frac;
    ansEl.classList.toggle('frac', fr);
    barEl.hidden = denEl.hidden = document.getElementById('g-hint').hidden = !fr;
    inEl.readOnly = false;
    inEl.setAttribute('aria-label', fr ? 'Numerator' : 'Answer');
    st.part = fr ? 'num' : null;
    curEl = inEl; inEl.focus();
    var m = document.getElementById('g-method');
    m.hidden = true; m.textContent = ''; st.method = false;
    if (st.kind === 'practice') timerEl.textContent = (st.questions.length + 1) + ' / ' + st.opts.count;
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
    if (q.op === 'cp') rec.type = q.type;   // Road to 60 complements: c100 | cten
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
    if (typed.length >= target.length && !st.wrongSeen[k]) {
      st.wrongSeen[k] = 1; st.wrong++;
      if (st.kind === 'practice') showMethod();
    }
  }

  // Practice: the worked shortcut for this exact question, under the box.
  function showMethod() {
    if (st.method) return;
    st.method = true;
    var m = document.getElementById('g-method');
    m.textContent = st.opts.advice(st.q) + ' Type the answer to go on.';
    m.hidden = false;
    curEl.focus();
  }

  function accept() {
    var extra = { timeMs: Math.round(now() - st.qStart), wrongAttempts: st.wrong };
    if (st.kind === 'practice') extra.method = st.method;
    if (st.opts.hint && st.method) extra.hinted = true;   // a Road to 60 drill showed the method
    st.questions.push(record(st.q, extra));
    st.score++;
    if (st.kind === 'practice') { if (st.questions.length >= st.opts.count) finish(false); else nextQuestion(); return; }
    scoreEl.textContent = 'Score: ' + st.score;
    nextQuestion();
  }

  // No point, and it counts as a miss for that trick in Review.
  function skipZetamac() {
    st.questions.push(record(st.q, { timeMs: Math.round(now() - st.qStart), wrongAttempts: st.wrong, unanswered: true, skipped: true }));
    nextQuestion();
  }

  function onZetamacInput() {
    if (!st.running) { inEl.value = ''; return; }
    var fr = st.q.frac, ans = fr ? String(fr[0]) : st.q.answerText || String(st.q.answer);
    var typed = cleanInput(inEl, !fr && ans.indexOf('.') >= 0);
    if (!typed) return;
    if (typed !== ans && typed !== st.q.answerAlt) { countWrong(typed, ans); return; }   // answerAlt: 2/3 as 0.666
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

  function zetamacInput(opts) {
    var types = opts.settings.types || [];
    inEl.setAttribute('inputmode', types.indexOf('frac') >= 0 || types.indexOf('fd') >= 0 ? 'decimal' : 'numeric');
    inEl.oninput = onZetamacInput;
    denEl.oninput = onDenInput;
  }

  Game.startZetamac = function (opts) {
    // opts: { mode, settings, generator, duration, countdown, onEnd(round), onAbort() }
    start('zetamac', opts);
    st.skip = (opts.settings.types || []).length > 0;   // trick modes only; plain Zetamac has no skip, like zetamac.com
    zetamacInput(opts);
  };

  Game.startPractice = function (opts) {
    // opts: { mode, settings, generator, count, advice(q) → text, onEnd(round), onAbort() }; no countdown.
    opts.countdown = false;
    start('practice', opts);
    zetamacInput(opts);
  };

  // ---------- Matrices ----------

  function matHtml(m, testid) {
    return '<span class="mx" data-testid="' + testid + '">' + m.map(function (v) {
      return '<span>' + (v < 0 ? '−' + (-v) : v) + '</span>';
    }).join('') + '</span>';
  }

  function nextMatrix() {
    st.q = st.opts.generator.next();
    st.qStart = now();
    st.wrongSeen = {};
    st.wrong = 0;
    qEl.innerHTML = matHtml(st.q.a, 'game-matrix-a') + '<span class="mx-op">×</span>' + matHtml(st.q.b, 'game-matrix-b');
    cells.forEach(function (c) { c.value = ''; c.classList.remove('bad'); });
    focusCell(0);
  }

  function focusCell(i) {
    curEl = cells[i];
    curEl.focus();
    curEl.select();   // typing replaces what is there
  }

  // Space: next box (row-major, wraps). Arrows: the neighbour in the grid (wraps in its row or column).
  // Enter: outline the filled boxes that are wrong. Tab: skip.
  function matrixKey(e) {
    var i = cells.indexOf(curEl), r = i >> 1, c = i & 1, to = -1;
    if (e.key === ' ') to = (i + 1) % 4;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') to = r * 2 + (1 - c);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') to = (1 - r) * 2 + c;
    if (to >= 0) { e.preventDefault(); e.stopPropagation(); focusCell(to); return; }
    if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      cells.forEach(function (cell, j) {
        if (cell.value === '' || cell.value === '-') return;
        if (Number(cell.value) !== st.q.cells[j]) { cell.classList.add('bad'); cellWrong(j, cell.value, true); }
      });
    } else if (e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation(); skipZetamac();
    }
  }

  // One wrong attempt per distinct wrong value in a box: when it reaches the answer's length, or when Enter shows it.
  function cellWrong(j, value, shown) {
    var target = String(st.q.cells[j]);
    if (!shown && value.length < target.length) return;
    var k = 'c' + j + ':' + value;
    if (!st.wrongSeen[k]) { st.wrongSeen[k] = 1; st.wrong++; }
  }

  function onCellInput(i) {
    var cell = cells[i];
    if (!st.running) { cell.value = ''; return; }
    // Digits only, plus one leading minus for entries in Z ("−" from a phone keyboard counts too).
    var neg = AT.Generator.matrixRange(st.opts.settings).lo < 0;
    var v = cell.value.replace(/−/g, '-'), clean = v.replace(/[^0-9-]/g, '');
    clean = (neg && clean.charAt(0) === '-' ? '-' : '') + clean.replace(/-/g, '');
    if (clean !== cell.value) cell.value = clean;
    cell.classList.remove('bad');
    if (clean && clean !== '-' && Number(clean) !== st.q.cells[i]) cellWrong(i, clean, false);
    var done = cells.every(function (c, j) { return c.value !== '' && c.value !== '-' && Number(c.value) === st.q.cells[j]; });
    if (done) accept();
  }

  Game.startMatrix = function (opts) {
    // opts: { mode: 'MATRIX', settings: { lo, hi, duration, set, max }, generator, duration, countdown, onEnd(round), onAbort() }
    start('matrix', opts);
  };

  // ---------- Finance sprint ----------

  // What a Finance question stores: enough to rebuild it (tpl + seed) and to group it (family, category).
  function finRecord(q, extra) {
    var rec = { op: 'fin', tpl: q.tpl, seed: q.seed, fam: q.family, cat: q.category, shown: q.promptText, answer: q.answerText };
    for (var k in extra) rec[k] = extra[k];
    return rec;
  }

  function nextFinance() {
    var p = st.opts.source(), hint = document.getElementById('g-hint'), unit = document.getElementById('g-unit');
    st.q = AT.Finance.make(p.tpl, p.seed);
    st.qStart = now();
    st.wrongSeen = {};
    st.wrong = 0;
    st.learned = false; st.pausedMs = 0;
    var m = document.getElementById('g-method'); m.hidden = true; m.textContent = '';
    qEl.innerHTML = AT.TeX.rich(st.q.prompt);   // maths drawn as maths; the plain text is each formula's alttext
    hint.textContent = st.q.ask; hint.hidden = !st.q.ask;
    unit.textContent = st.q.unit; unit.hidden = !st.q.unit;
    inEl.value = '';
    inEl.setAttribute('inputmode', st.q.kind === 'fraction' ? 'text' : 'decimal');
    curEl = inEl; inEl.focus();
  }

  function onFinanceInput() {
    if (!st.running) { inEl.value = ''; return; }
    if (AT.Finance.autoOk(st.q, inEl.value)) acceptFinance(inEl.value);
  }

  // Enter: right within tolerance moves on; wrong counts once per distinct value and outlines the box.
  function submitFinance() {
    var v = inEl.value.trim();
    if (!v) return;
    if (AT.Finance.check(st.q, v).ok) { acceptFinance(v); return; }
    if (!st.wrongSeen[v]) { st.wrongSeen[v] = 1; st.wrong++; }
    markWrong();
    var m = document.getElementById('g-method');
    m.textContent = 'Not right. Press H to pause and learn.'; m.hidden = false;
    inEl.select();
  }

  // ---- Pause and learn: the clock stops, the worked solution shows; Enter brings the question back. ----

  function escHtml(x) {
    return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  // The button and the (hidden) solution panel, under the answer box.
  function learnMount() {
    var c = root.querySelector('.g-center');
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'g-learn-btn'; b.className = 'g-learn-btn'; b.setAttribute('data-testid', 'game-learn');
    b.innerHTML = 'Pause and learn <kbd>H</kbd>';
    b.onclick = function () { pauseLearn(); };
    var p = document.createElement('div');
    p.id = 'g-learn'; p.className = 'g-learn'; p.hidden = true; p.setAttribute('data-testid', 'game-learn-panel');
    c.appendChild(b); c.appendChild(p);
  }

  function pauseLearn() {
    if (!st.running || st.paused || !st.q) return;
    var q = st.q, p = document.getElementById('g-learn');
    st.paused = true; st.pauseAt = now(); st.learned = true;
    p.innerHTML = '<p class="g-learn-ans" role="status">The answer is <b class="num">' + escHtml(q.answerText) + '</b></p>' +
      (q.formula ? '<p class="fq-formula"><span class="mid">Formula</span> ' + AT.TeX.render(q.tex, q.formula) + '</p>' : '') +
      '<ol>' + q.steps.map(function (s) { return '<li>' + AT.TeX.rich(s) + '</li>'; }).join('') + '</ol>' +
      (q.why ? '<p>' + AT.TeX.rich(q.why) + '</p>' : '') +
      '<p><button type="button" class="primary" id="g-resume" data-testid="game-resume">Back to the round <kbd>Enter</kbd></button></p>';
    document.getElementById('g-resume').onclick = resumeLearn;
    p.hidden = false;
    document.getElementById('g-learn-btn').hidden = true;
    document.getElementById('g-method').hidden = true;
    document.getElementById('g-hint').hidden = true;
    timerEl.textContent = 'Paused';
    inEl.readOnly = true;
    root.classList.add('paused');
    root.querySelector('.g-center').scrollTop = 0;   // the question first, then the solution under it
  }

  function resumeLearn() {
    if (!st.paused) return;
    var d = now() - st.pauseAt;
    st.t0 += d; st.qStart += d; st.pausedMs += d;   // the pause counts neither for the round nor for the question
    st.paused = false;
    root.classList.remove('paused');
    document.getElementById('g-learn').hidden = true;
    document.getElementById('g-learn-btn').hidden = false;
    var hint = document.getElementById('g-hint'); hint.hidden = !st.q.ask;
    var m = document.getElementById('g-method');
    m.textContent = 'Type the answer to go on. No point for this one.'; m.hidden = false;
    inEl.readOnly = false; inEl.value = '';
    tick();
    curEl = inEl; inEl.focus();
  }

  // A question you paused on is saved as learned: no point, a miss for its template.
  function learnedExtra(extra) {
    if (st.learned) { extra.learned = true; extra.pausedMs = Math.round(st.pausedMs); extra.correct = false; }
    return extra;
  }

  function acceptFinance(given) {
    st.questions.push(finRecord(st.q, learnedExtra({ given: given.trim(), correct: true, timeMs: Math.round(now() - st.qStart), wrongAttempts: st.wrong })));
    if (!st.learned) { st.score++; scoreEl.textContent = 'Score: ' + st.score; }
    nextQuestion();
  }

  // Skipped: no point, and a miss for that template (unlike a question the clock cut off).
  function skipFinance() {
    st.questions.push(finRecord(st.q, learnedExtra({ given: null, correct: false, skipped: true, timeMs: Math.round(now() - st.qStart), wrongAttempts: st.wrong })));
    nextQuestion();
  }

  Game.startFinance = function (opts) {
    // opts: { mode: 'FINANCE', settings: { kind: 'sprint', duration, … }, source() → { tpl, seed }, duration, countdown, onEnd(round), onAbort() }
    start('finance', opts);
    learnMount();
    inEl.oninput = onFinanceInput;
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
      if (st.kind === 'finance') { extra.correct = false; rec = finRecord(q, learnedExtra(extra)); }
      else if (q.op === 'iv') { rec = { op: q.op, shown: q.shown, answer: q.answer, type: q.type, keys: q.keys, answerText: q.answerText }; for (var k in extra) rec[k] = extra[k]; }
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
