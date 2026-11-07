/*
 * finance-ui.js — the Finance tab (key Q, #finance). Loaded after ui.js, which lends its layout kit.
 *
 * Four ways to play, chosen on the page and remembered in settings.finance:
 *   Sprint         timed, in the #game overlay (Game.startFinance); typed answers, auto-accepted when exact.
 *   Practice       untimed, here on the page: one question at a time, then the worked answer.
 *   Intuition      the same, with the multiple-choice concept questions only.
 *   Interview mix  20 questions from all four families, difficulty rising, then a score per topic.
 * Every answered question is saved in a round (mode FINANCE) with its template id and seed, so the end
 * screens rebuild the explanation from (template, seed) and Stats/Log/report see it like any other round.
 * Routes: #finance, #finance/practice, #finance/intuition, #finance/mixed, #finance/q/<templateId>/<seed>.
 */
(function () {
  'use strict';
  var AT = window.AT, F = AT.Finance, S = AT.Stats, G = AT.Generator, C = AT.Charts, Game = AT.Game;
  var K = AT.UI.kit, esc = K.esc, $ = K.$, $$ = K.$$;
  var rich = AT.TeX.rich;   // prose with $…$ maths → HTML with MathML

  var MODES = [['sprint', 'Sprint'], ['practice', 'Practice'], ['intuition', 'Intuition'], ['mixed', 'Interview mix']];
  var MODE_DESC = {
    sprint: 'Timed, like Zetamac: type the answer, it is taken as soon as it is exact. Estimates take Enter. Stuck or wrong? Press H to stop the clock and see the formula and the solution.',
    practice: 'Untimed. After each answer you see the right one, the formula and the steps.',
    intuition: 'Untimed multiple choice on concepts: direction of effects, definitions, which is bigger.',
    mixed: '20 questions from every family, getting harder, then your score per topic. Untimed.'
  };
  var FAMS = [['arith', 'Arithmetic'], ['quant', 'Quant'], ['fin', 'Finance'], ['intuition', 'Intuition']];
  var DIFF = { 1: 'easy', 2: 'medium', 3: 'hard' };
  var MIX_COUNT = 20;
  var sess = null;   // the Practice / Intuition / Interview mix session in progress

  // ---------- options ----------

  function opts() {
    var o = K.data().settings.finance || {}, ids = FAMS.map(function (f) { return f[0]; });
    var fams = Array.isArray(o.fams) ? o.fams.filter(function (f) { return ids.indexOf(f) >= 0; }) : [];
    return {
      mode: MODES.some(function (m) { return m[0] === o.mode; }) ? o.mode : 'sprint',
      fams: fams.length ? fams : ['quant', 'fin'],
      cat: typeof o.cat === 'string' ? o.cat : 'all',
      diff: [1, 2, 3].indexOf(o.diff) >= 0 ? o.diff : 'all',
      duration: [60, 120, 180].indexOf(o.duration) >= 0 ? o.duration : 120,
      answer: o.answer === 'choice' ? 'choice' : 'type',
      weak: o.weak === true
    };
  }
  function store(o) { K.data().settings.finance = o; K.save(); }
  function copy(o, extra) { var c = {}, k; for (k in o) c[k] = o[k]; for (k in extra || {}) c[k] = extra[k]; return c; }

  // Families a mode can draw from. Sprints are typed answers only, so no multiple choice there.
  function famsFor(o) {
    if (o.mode === 'intuition') return ['intuition'];
    if (o.mode === 'sprint') return o.fams.filter(function (f) { return f !== 'intuition'; });
    return o.fams;
  }
  function baseList(o) {
    var ts = F.list({ families: famsFor(o) });
    return o.mode === 'sprint' ? ts.filter(function (t) { return t.kind !== 'choice'; }) : ts;
  }
  function catsFor(o) {
    var seen = {}, out = [];
    baseList(o).forEach(function (t) { if (!seen[t.category]) { seen[t.category] = 1; out.push(t.category); } });
    return out;
  }
  // Template ids for these options; Weak spots keeps only your 5 weakest of them.
  function pool(o, fs) {
    var ids = baseList(o).filter(function (t) {
      return (o.cat === 'all' || t.category === o.cat) && (o.diff === 'all' || t.difficulty === o.diff);
    }).map(function (t) { return t.id; });
    if (o.weak && o.mode !== 'sprint') ids = weakest(ids, fs, 5).map(function (w) { return w.id; });
    return ids;
  }
  function wfn(fs) { return function (id) { return F.weight(fs.tpl[id], fs.ref[F.get(id).family]); }; }
  // Played templates, weakest first (lower first-try accuracy, then slower than your usual for that family).
  function weakest(ids, fs, n) {
    var w = wfn(fs);
    return ids.filter(function (id) { return fs.tpl[id] && fs.tpl[id].n; })
      .map(function (id) { return { id: id, st: fs.tpl[id], w: w(id) }; })
      .filter(function (x) { return x.st.acc < 1 || x.w > 1.25; })
      .sort(function (a, b) { return b.w - a.w || b.st.n - a.st.n; }).slice(0, n);
  }
  // A short name for a template: the formula for calculations, the prompt for concept questions.
  function tplName(id) {
    var t = F.get(id);
    if (!t) return id;
    if (t.kind === 'choice' && t.family === 'intuition') return F.make(id, 1).prompt;   // rich text
    return t.formula || t.category;
  }

  // ---------- the Finance page ----------

  function render() {
    var p = K.parts();
    if (p[1] === 'q' && F.get(p[2])) { startSession('practice', { first: { tpl: p[2], seed: Number(p[3]) >>> 0 }, only: [p[2]] }); return; }
    if (p[1] === 'practice' || p[1] === 'intuition' || p[1] === 'mixed') { startSession(p[1]); return; }
    renderHome();
  }

  function seg(o, key, name, list) {
    return '<div class="seg" role="group" aria-label="' + name + '">' + list.map(function (x) {
      var on = o[key] === x[0];
      return '<button type="button" data-fin="' + key + '" data-v="' + x[0] + '" aria-pressed="' + on + '"' + (on ? ' class="on"' : '') +
        ' data-testid="finance-' + key + '-' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }

  function renderHome() {
    var o = opts(), fs = S.financeStats(K.data().rounds), cats = catsFor(o);
    if (o.cat !== 'all' && cats.indexOf(o.cat) < 0) o.cat = 'all';
    var ids = o.mode === 'mixed' ? ['mix'] : pool(o, fs), canFams = o.mode === 'sprint' || o.mode === 'practice';
    var famList = o.mode === 'sprint' ? FAMS.slice(0, 3) : FAMS;
    var h = [K.pageHead('Finance', 'Mental math and finance intuition for quant interviews: fast calculations, finance formulas and concept questions, each with a worked answer.')];
    var form = [K.frow('Mode', seg(o, 'mode', 'Mode', MODES), esc(MODE_DESC[o.mode]))];
    if (canFams) {
      form.push(K.frow('Questions', '<div class="seg" role="group" aria-label="Question families">' + famList.map(function (f) {
        var on = famsFor(o).indexOf(f[0]) >= 0;
        return '<button type="button" data-fam="' + f[0] + '" aria-pressed="' + on + '"' + (on ? ' class="on"' : '') + ' data-testid="finance-fam-' + f[0] + '">' + f[1] + '</button>';
      }).join('') + '</div>', 'Choose one or more.'));
    }
    if (o.mode !== 'mixed') {
      form.push(K.frow('Topic', '<select id="fin-cat" name="topic" data-testid="finance-topic"><option value="all">All topics</option>' + cats.map(function (c) {
        return '<option value="' + esc(c) + '"' + (o.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>';
      }).join('') + '</select>', null, 'fin-cat'));
      form.push(K.frow('Difficulty', seg(o, 'diff', 'Difficulty', [['all', 'All'], [1, 'Easy'], [2, 'Medium'], [3, 'Hard']])));
    }
    if (o.mode === 'sprint') form.push(K.frow('Length', seg(o, 'duration', 'Length', [[60, '60 seconds'], [120, '120 seconds'], [180, '180 seconds']])));
    if (o.mode === 'practice') form.push(K.frow('Answer', seg(o, 'answer', 'Answer', [['type', 'Type it'], ['choice', 'Pick from 4']])));
    if (o.mode === 'practice' || o.mode === 'intuition') {
      form.push(K.frow('Questions to draw', seg(o, 'weak', 'Questions to draw', [[false, 'All that match'], [true, 'My 5 weakest']]),
        'Weaker and slower ones come up more often either way.'));
    }
    h.push('<div class="form">' + form.join('') + '</div>');
    var err = ids.length ? '' : o.weak && o.mode !== 'sprint' ? 'No weak spots here yet: answer a few of these questions first, or choose All that match.'
      : 'No questions match. Choose another topic, difficulty or family.';
    var startLabel = { sprint: 'Start sprint', practice: 'Start practice', intuition: 'Start intuition', mixed: 'Start interview mix' }[o.mode];
    h.push('<div class="row mx-start"><button type="button" class="primary hero-start" id="fin-start" data-testid="finance-start-button"' + (ids.length ? '' : ' disabled') + '>' +
      startLabel + ' <kbd>Enter</kbd></button></div><p class="err" id="fin-err" aria-live="polite">' + esc(err) + '</p>');
    h.push(K.keys(o.mode === 'sprint' ? [['H', 'pause and learn'], ['Enter', 'check an estimate'], ['Tab', 'skip'], ['Esc', 'stop']]
      : [['Enter', 'check, then next'], ['1–4', 'choose an option'], ['S', 'same type, new numbers'], ['Esc', 'finish']]));
    h.push(progressHtml(o, fs));
    var main = K.main();
    main.innerHTML = h.join('');
    C.bind(main);
    bindHome(o);
  }

  function bindHome(o) {
    function refresh(next, focusSel) { store(next); renderHome(); var el = focusSel && $(focusSel); if (el) el.focus(); }
    $$('[data-fin]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-fin'), v = b.getAttribute('data-v'), next = opts();
        next[k] = k === 'duration' || (k === 'diff' && v !== 'all') ? Number(v) : k === 'weak' ? v === 'true' : v;
        refresh(next, '[data-fin="' + k + '"][data-v="' + v + '"]');
      });
    });
    $$('[data-fam]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-fam'), next = opts(), cur = famsFor(next), i = cur.indexOf(f);
        if (i >= 0) { if (cur.length === 1) { K.announce('Keep at least one family.'); return; } cur.splice(i, 1); } else cur.push(f);
        // Sprint hides Intuition, but keep it chosen for Practice.
        if (next.mode === 'sprint' && next.fams.indexOf('intuition') >= 0) cur.push('intuition');
        next.fams = cur;
        refresh(next, '[data-fam="' + f + '"]');
      });
    });
    var cat = $('#fin-cat');
    if (cat) cat.addEventListener('change', function () { var next = opts(); next.cat = cat.value; refresh(next, '#fin-cat'); });
    $$('[data-weak]').forEach(function (b) {
      b.addEventListener('click', function () { K.setHash('finance', 'practice'); startSession('practice', { only: [b.getAttribute('data-weak')] }); });
    });
    $('#fin-start').addEventListener('click', start);
    K.setKeys(function (e) {
      if (e.key === 'Enter') { start(); return true; }
      return false;
    });
    function start() {
      var cur = opts(), fs = S.financeStats(K.data().rounds);
      if (cur.mode !== 'mixed' && !pool(cur, fs).length) return;
      if (cur.mode === 'sprint') playSprint(cur);
      else { K.setHash('finance', cur.mode); startSession(cur.mode); }
    }
  }

  // ---------- Sprint (in the round overlay) ----------

  function playSprint(o) {
    var fs = S.financeStats(K.data().rounds), ids = pool(o, fs);
    if (!ids.length) return;
    var s = { kind: 'sprint', duration: o.duration, fams: famsFor(o), cat: o.cat, diff: o.diff };
    var g = K.baseOpts('FINANCE', s, function (round) { showEnd(round, function () { playSprint(o); }); });
    g.source = F.makeSource(ids, G.mulberry32(K.seed()));
    Game.startFinance(g);
  }

  // ---------- Practice, Intuition, Interview mix (on the page) ----------

  function startSession(kind, extra) {
    extra = extra || {};
    var o = copy(opts(), { mode: kind }), fs = S.financeStats(K.data().rounds), rng = G.mulberry32(K.seed()), ids = null, plan = null;
    if (kind === 'mixed') plan = F.mixedPlan(MIX_COUNT, rng, null, wfn(fs));
    else {
      ids = extra.only || pool(o, fs);
      if (!ids.length) { K.setHash('finance'); renderHome(); return; }
    }
    sess = {
      kind: kind, o: o, startedAt: new Date().toISOString(), questions: [], plan: plan, i: 0, saved: false,
      src: plan ? null : F.makeSource(ids, rng, wfn(fs)), only: extra.only || null,
      choice: kind === 'practice' && o.answer === 'choice', first: extra.first || null
    };
    K.onLeave(saveSession);
    nextQ(false);
  }

  function nextQ(same) {
    var p;
    if (same) p = { tpl: sess.q.tpl, seed: F.newSeed() };
    else if (sess.first) { p = sess.first; sess.first = null; }
    else if (sess.plan) { if (sess.i >= sess.plan.length) { finishSession(); return; } p = sess.plan[sess.i++]; }
    else p = sess.src();
    var t = F.get(p.tpl);
    sess.q = F.make(p.tpl, p.seed, sess.choice && t.kind !== 'choice' ? { choice: true } : null);
    sess.result = null;
    sess.t0 = performance.now();
    draw();
  }

  // The right answer: rich for the screen, plain for what is saved.
  function rightText(q) { return q.kind === 'choice' ? q.options[q.correct] : q.answerText; }
  function rightPlain(q) { return q.kind === 'choice' ? q.optionsText[q.correct] : q.answerText; }
  function nRight(qs) { return qs.filter(function (q) { return q.correct && !q.wrongAttempts && !q.skipped; }).length; }

  function draw() {
    var q = sess.q, r = sess.result, n = sess.questions.length;
    var title = { practice: 'Practice', intuition: 'Intuition', mixed: 'Interview mix' }[sess.kind];
    var sub = sess.plan ? 'Question ' + sess.i + ' of ' + sess.plan.length + (n ? ', ' + nRight(sess.questions) + ' right so far' : '')
      : n ? nRight(sess.questions) + ' of ' + n + ' right so far' : 'Untimed. Each answer comes with the worked solution.';
    var h = [K.pageHead(title, esc(sub), '<button type="button" id="fq-done" data-testid="finance-done">' + (sess.plan ? 'Stop' : 'Done') + ' <kbd>Esc</kbd></button>')];
    h.push('<div class="fq" data-testid="finance-question">');
    h.push('<p class="fq-meta">' + esc(q.category) + ', ' + DIFF[q.difficulty] + '</p>');
    h.push('<p class="fq-prompt" id="fq-prompt">' + rich(q.prompt) + '</p>');
    if (q.ask) h.push('<p class="fq-ask">' + esc(q.ask) + '</p>');
    if (q.kind === 'choice') {
      h.push('<ol class="fq-opts" aria-labelledby="fq-prompt">' + q.options.map(function (o, i) {
        var cls = r ? (i === q.correct ? ' right' : i === r.value ? ' chosen' : '') : '';
        var tag = r ? (i === q.correct ? '<span class="tag">Right answer</span>' : i === r.value ? '<span class="tag">Your answer</span>' : '') : '';
        return '<li><button type="button" class="opt' + cls + '" data-opt="' + i + '" data-testid="finance-option-' + (i + 1) + '"' + (r ? ' disabled' : '') + '>' +
          '<kbd>' + (i + 1) + '</kbd><span class="ot">' + rich(o) + '</span>' + tag + '</button></li>';
      }).join('') + '</ol>');
    } else {
      h.push('<div class="fq-in"><label class="sr-only" for="fq-in">Answer</label><input id="fq-in" class="num" name="answer" type="text" inputmode="' +
        (q.kind === 'fraction' ? 'text' : 'decimal') + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-testid="finance-answer"' +
        (r ? ' readonly value="' + esc(r.given) + '"' : '') + '>' + (q.unit ? '<span class="unit num" data-testid="finance-unit">' + esc(q.unit) + '</span>' : '') +
        (r ? '' : '<button type="button" id="fq-check" class="primary">Check <kbd>Enter</kbd></button>') + '</div>' +
        '<p class="err" id="fq-err" aria-live="polite"></p>');
    }
    h.push('</div>');
    if (r) h.push(resultHtml(q, r));
    else h.push(K.keys(q.kind === 'choice' ? [['1–4', 'choose'], ['Esc', sess.plan ? 'stop' : 'finish']] : [['Enter', 'check'], ['Esc', sess.plan ? 'stop' : 'finish']]));
    K.main().innerHTML = h.join('');
    bindSession();
  }

  function stepsHtml(q) {
    return (q.formula ? '<p class="fq-formula"><span class="mid">Formula</span> ' + AT.TeX.render(q.tex, q.formula) + '</p>' : '') +
      (q.steps.length ? '<ol class="fq-steps">' + q.steps.map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol>' : '') +
      (q.why ? '<p class="fq-why">' + rich(q.why) + '</p>' : '');
  }

  function resultHtml(q, r) {
    var verdict = r.ok ? '<b>Right.</b> ' + (q.kind === 'choice' ? '' : 'The answer is ' + rich(rightText(q)) + '.')
      : '<b>Not quite.</b> ' + (q.kind === 'choice' ? 'The answer is: ' + rich(rightText(q)) + '.' : 'You answered ' + esc(r.given) + '; the answer is ' + rich(rightText(q)) + '.');
    var last = sess.plan && sess.i >= sess.plan.length;
    var acts = '<button type="button" class="primary" id="fq-next" data-testid="finance-next">' + (last ? 'See your score' : 'Next') + ' <kbd>Enter</kbd></button>';
    if (!sess.plan) acts += '<button type="button" id="fq-same" data-testid="finance-same">Same type, new numbers <kbd>S</kbd></button>';
    if (q.related && !sess.plan) acts += '<button type="button" id="fq-rel" data-testid="finance-related">Practise the calculation <kbd>C</kbd></button>';
    return '<div class="fq-result" data-testid="finance-result"><p class="verdict" role="status">' + verdict + '</p>' + stepsHtml(q) +
      '<div class="row">' + acts + '</div><p class="small mid">Question code <span class="num">' + esc(q.tpl) + ' #' + q.seed + '</span></p></div>';
  }

  function bindSession() {
    var q = sess.q, inp = $('#fq-in');
    $('#fq-done').addEventListener('click', finishSession);
    if (!sess.result) {
      if (inp) {
        inp.focus();
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); answer(inp.value); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishSession(); }
        });
        $('#fq-check').addEventListener('click', function () { answer(inp.value); });
      }
      $$('[data-opt]').forEach(function (b) { b.addEventListener('click', function () { answer(Number(b.getAttribute('data-opt'))); }); });
    } else {
      $('#fq-next').addEventListener('click', function () { nextQ(false); });
      var same = $('#fq-same'); if (same) same.addEventListener('click', function () { nextQ(true); });
      var rel = $('#fq-rel'); if (rel) rel.addEventListener('click', related);
      $('#fq-next').focus();
    }
    K.setKeys(function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'Escape') { finishSession(); return true; }
      if (!sess.result) {
        if (q.kind === 'choice' && /^[1-4]$/.test(k)) { answer(Number(k) - 1); return true; }
        return false;
      }
      if (k === 'Enter') { nextQ(false); return true; }
      if (k === 's' && !sess.plan) { nextQ(true); return true; }
      if (k === 'c' && q.related && !sess.plan) { related(); return true; }
      return false;
    });
  }

  // The calculation behind a concept question: a fresh question of that template, in this session.
  function related() { sess.first = { tpl: sess.q.related, seed: F.newSeed() }; sess.choice = false; nextQ(false); }

  function answer(input) {
    if (sess.result) return;
    var q = sess.q, res = F.check(q, input);
    if (q.kind !== 'choice' && res.value === null) {
      var e = $('#fq-err');
      if (String(input).trim()) e.textContent = q.kind === 'fraction' ? 'Type a fraction, like 3/8.' : 'Type a number, like 4.5' + (q.unit === '%' ? ' or 4.5%' : q.unit === 'bp' ? ' or 25bp' : '') + '.';
      return;
    }
    sess.result = { ok: res.ok, value: res.value, given: q.kind === 'choice' ? q.optionsText[input] : String(input).trim() };
    var rec = { op: 'fin', tpl: q.tpl, seed: q.seed, fam: q.family, cat: q.category, shown: q.promptText, answer: rightPlain(q),
      given: sess.result.given, correct: res.ok, timeMs: Math.round(performance.now() - sess.t0), wrongAttempts: res.ok ? 0 : 1 };
    if (q.choiceFrom) rec.mc = true;   // a calculation answered by picking from 4
    sess.questions.push(rec);
    draw();
  }

  // Saved once, when the session ends or you leave the page: one round with every answered question.
  function saveSession() {
    if (!sess || sess.saved || !sess.questions.length) return null;
    sess.saved = true;
    var s = { kind: sess.kind };
    if (sess.kind === 'mixed') s.count = sess.plan.length;
    else if (sess.only && sess.only.length < 6) s.only = sess.only.slice();
    else { s.fams = famsFor(sess.o); s.cat = sess.o.cat; s.diff = sess.o.diff; if (sess.choice) s.answer = 'choice'; if (sess.o.weak) s.weak = true; }
    var round = { id: AT.Storage.uuid(), startedAt: sess.startedAt, mode: 'FINANCE', settings: s, score: nRight(sess.questions), questions: sess.questions };
    K.data().rounds.push(round);
    K.save();
    return round;
  }

  function finishSession() {
    var kind = sess.kind, only = sess.only, round = saveSession();
    K.onLeave(null);
    sess = null;
    K.setHash('finance');
    if (!round) { renderHome(); return; }
    showEnd(round, function () { K.setHash('finance', kind); startSession(kind, only ? { only: only } : null); });
  }

  window.addEventListener('pagehide', function () { if (sess) saveSession(); });

  // ---------- end screen (sprints and sessions) ----------

  function showEnd(round, again) {
    var data = K.data(), today = K.todayKey(), kind = round.settings.kind || 'sprint';
    // A question the clock cut off is left out, unless you paused on it to learn: that one is part of the round's story.
    var qs = round.questions.filter(function (q) { return !q.unanswered || q.learned; }), right = nRight(qs);
    var times = qs.filter(function (q) { return !q.skipped; }).map(function (q) { return q.timeMs; });
    var nToday = data.rounds.filter(function (r) { return S.dayKey(r.startedAt) === today && r.mode === 'FINANCE'; }).length;
    var missed = [];
    qs.forEach(function (q) { if (!(q.correct && !q.wrongAttempts) && missed.indexOf(q.tpl) < 0 && F.get(q.tpl)) missed.push(q.tpl); });
    var h = ['<div class="end">', '<h1 class="sr-only">Finance round finished</h1>'];
    h.push(K.endHead(round.score, K.label(S.effMode(round)), kind === 'sprint' ? 'Finance round ' + nToday + ' today' : right + ' of ' + qs.length + ' right on the first try'));
    h.push(K.endButtons([['again', kind === 'sprint' ? 'Play again' : 'Start again', 'Enter']]
      .concat(missed.length ? [['d', 'Practise the ones you missed', 'D']] : []).concat([['b', 'Back to Finance', 'B'], ['h', 'Home', 'H']])));
    h.push(K.stats([
      { label: 'Right first try', value: K.pct(qs.length ? right / qs.length : null), note: right + ' of ' + K.plural(qs.length, 'question'), key: 'fin-right' },
      { label: 'Median time', value: times.length ? K.sec(S.median(times)) : '–', note: 'Per question', key: 'fin-median' },
      { label: 'Skipped', value: String(qs.filter(function (q) { return q.skipped; }).length), note: kind === 'sprint' ? 'With Tab' : '', key: 'fin-skipped' }
    ].concat(kind === 'sprint' ? [{ label: 'Paused to learn', value: String(qs.filter(function (q) { return q.learned; }).length), note: 'Clock stopped, no point', key: 'fin-learned' }] : [])));
    // Score per topic (the interview-mix result), then every question with its worked answer.
    var cats = {};
    qs.forEach(function (q) { var c = cats[q.cat] = cats[q.cat] || { n: 0, right: 0, t: [] }; c.n++; if (q.correct && !q.wrongAttempts) c.right++; if (!q.skipped) c.t.push(q.timeMs); });
    h.push(K.section('By topic', '<div class="tbl-scroll"><table data-testid="finance-by-topic"><tr><th scope="col">Topic</th><th scope="col" class="n">Questions</th><th scope="col" class="n">Right</th><th scope="col" class="n">Median time</th></tr>' +
      Object.keys(cats).sort().map(function (c) {
        return '<tr><td>' + esc(c) + '</td><td class="n">' + cats[c].n + '</td><td class="n">' + cats[c].right + '</td><td class="n">' + (cats[c].t.length ? K.sec(S.median(cats[c].t)) : '–') + '</td></tr>';
      }).join('') + '</table></div>'));
    if (qs.length) h.push(K.section('Every question', '<p class="sec-intro">Open one to see the worked answer.</p>' + reviewList(qs), null, 'end-all-questions'));
    h.push('</div>');
    var main = K.main();
    main.innerHTML = h.join('');
    var actions = {
      again: again,
      d: function () { if (missed.length) { K.setHash('finance', 'practice'); startSession('practice', { only: missed }); } },
      b: function () { K.go('finance'); }
    };
    K.bindEndButtons(actions);
    K.endKeys(actions);
  }

  function reviewList(qs) {
    return '<ol class="fq-review">' + qs.map(function (rec) {
      var q = null;
      try { q = F.get(rec.tpl) ? F.make(rec.tpl, rec.seed) : null; } catch (e) { q = null; }
      var res = rec.learned ? 'Paused to learn' : rec.skipped ? 'Skipped' : rec.correct && !rec.wrongAttempts ? 'Right' : rec.correct ? 'Right after ' + K.plural(rec.wrongAttempts, 'wrong try', 'wrong tries') : 'Wrong';
      return '<li><details><summary><span class="fq-r">' + res + '</span> ' + (q ? rich(q.prompt) : esc(rec.shown)) + '</summary><div class="fq-rd">' +
        '<p>' + (rec.given !== null && rec.given !== undefined && !rec.skipped ? 'You answered <b class="num">' + esc(rec.given) + '</b>. ' : '') +
        'Answer: <b class="num">' + esc(rec.answer) + '</b>. Time ' + K.sec(rec.timeMs) + '.</p>' + (q ? stepsHtml(q) : '') + '</div></details></li>';
    }).join('') + '</ol>';
  }

  // ---------- progress (on the Finance page) ----------

  function progressHtml(o, fs) {
    if (!fs.n) return K.section('Your progress', '<p class="mid">Nothing yet. Answer a few questions and your accuracy per topic, sprint scores and weak spots appear here.</p>', null, 'finance-progress');
    var d = o.duration, sp = fs.sprints.filter(function (x) { return x.duration === d; });
    var h = [K.stats([
      { label: 'Best sprint', value: sp.length ? String(Math.max.apply(null, sp.map(function (x) { return x.score; }))) : '–', note: d + ' s, ' + K.plural(sp.length, 'round'), key: 'fin-best' },
      { label: 'Right first try', value: K.pct(fs.acc), note: K.plural(fs.n, 'question') + ' answered', key: 'fin-acc' },
      { label: 'Sprints played', value: String(fs.sprints.length), note: 'All lengths', key: 'fin-sprints' },
      { label: 'Topics practised', value: String(Object.keys(fs.cat).length), key: 'fin-topics' }
    ])];
    if (sp.length >= 2) {
      var xs = sp.map(function (_, i) { return i + 1; });
      h.push('<p class="chart-cap">Sprint scores, ' + d + ' seconds, in order</p>' + C.line({
        xs: xs, h: 160, xName: 'Sprint ', label: 'Finance sprint scores, ' + d + ' seconds',
        series: [{ ys: sp.map(function (x) { return x.score; }), kind: 'line', name: 'score' }], zero: true
      }) + C.table(['Sprint', 'Score'], sp.map(function (x, i) { return [String(i + 1) + ', ' + K.fmtDate(x.startedAt), String(x.score)]; })));
    }
    var cats = Object.keys(fs.cat).sort(function (a, b) { return fs.cat[a].acc - fs.cat[b].acc; });
    h.push('<h3 class="sub-h">Accuracy by topic <span class="mid">weakest first</span></h3><div class="tbl-scroll"><table data-testid="finance-topic-accuracy"><tr><th scope="col">Topic</th><th scope="col" class="n">Answered</th><th scope="col" class="n">Right first try</th><th scope="col" class="n">Median time</th></tr>' +
      cats.map(function (c) { var e = fs.cat[c]; return '<tr><td>' + esc(c) + '</td><td class="n">' + e.n + '</td><td class="n">' + K.pct(e.acc) + '</td><td class="n">' + (e.med ? K.sec(e.med) : '–') + '</td></tr>'; }).join('') + '</table></div>');
    var weak = weakest(Object.keys(fs.tpl).filter(function (id) { return F.get(id); }), fs, 5);
    h.push('<h3 class="sub-h">Your 5 weakest <span class="mid">least often right, then slowest against your usual</span></h3>' + (weak.length ? '<div class="tbl-scroll"><table class="fin-weak" data-testid="finance-weakest">' +
      '<tr><th scope="col">Question type</th><th scope="col" class="n">Right first try</th><th scope="col" class="n">Median time</th><th scope="col"><span class="sr-only">Practise</span></th></tr>' + weak.map(function (w) {
        return '<tr><td>' + rich(tplName(w.id)) + '<br><span class="small mid">' + esc(F.get(w.id).category) + '</span></td><td class="n">' + K.pct(w.st.acc) + ' of ' + w.st.n + '</td><td class="n">' +
          (w.st.med ? K.sec(w.st.med) : '–') + '</td><td class="n"><button type="button" data-weak="' + esc(w.id) + '">Practise</button></td></tr>';
      }).join('') + '</table></div>' : '<p class="mid">No weak spots yet: everything you answered was right and quick.</p>'));
    return K.section('Your progress', h.join(''), null, 'finance-progress');
  }

  AT.UI.addScreen('finance', render);
  AT.FinanceUI = { showEnd: showEnd };
})();
