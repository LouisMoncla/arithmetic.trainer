/*
 * ui.js — routing between screens and rendering.
 * Screens: play (home), review, drill, stats, settings; plus end screens after a round.
 * Stats holds three collapsible sections (day = "Today", progress, log), each built when first opened.
 * Users see "day" where the code says session: one session is one calendar day with any round.
 * Each screen may set `screenKeys(e)`, which gets keys first and returns true when it handled one;
 * on Stats, each open section's `paneKeys[name]` gets them in turn.
 *
 * Routes are hashes, with an optional section and argument that deep-link state:
 *   #stats/day/2026-10-20   one day        #review/div   heatmap view (both | mul | div)
 * Old hashes (#session/…, #progress, #log, #stats/session/…, #stats/review/…) redirect (MOVED).
 * Layout helpers (pageHead, section, stats, facts, keys, frow) give every screen the same structure.
 * Copy is sentence case, second person, plain words; no "a · b · c" strings (see docs/design-guidelines.md).
 * data-testid only where roles and labels are not enough (playwright-frontend conventions).
 */
(function () {
  'use strict';
  var AT = window.AT;
  var G = AT.Generator, S = AT.Stats, P = AT.Progression, Store = AT.Storage, C = AT.Charts, Game = AT.Game;

  var data, main, screenKeys = null, endShownAt = 0;
  var ui = { sel: null, sort: { col: 'slowness', dir: -1 }, filter: 'all', importPending: null, customError: null };

  var MODES = [
    { id: 'TABLES', label: 'Tables', desc: '× and ÷, 2–12 by 2–12, 60 seconds' },
    { id: 'P2', label: 'Foundations', desc: '× and ÷, 2–12 by 2–100, 60 seconds' },
    { id: 'P3', label: 'Speed', desc: 'All four operations, 60 seconds' },
    { id: 'NORMAL120', label: 'Interview-ready', desc: 'All four operations, 120 seconds, the interview benchmark' },
    { id: 'DRILL', label: 'Weak-fact drill', desc: 'Your slowest facts mixed with Foundations, 60 seconds' },
    { id: 'INTERVIEW', label: 'Interview sim', desc: '80 questions in 8 minutes, answer with Enter' },
    { id: 'CUSTOM', label: 'Custom', desc: 'Your own operations, ranges and length' },
    { id: 'SQUARES', label: 'Squares', desc: '11² to 30² by heart, and squares near 50, near 100 or ending in 5, 60 seconds, Tab skips' },
    { id: 'PERCENT', label: '% and fractions', desc: 'Percentages, fractions to decimals and back, adding and subtracting fractions in lowest terms, 60 seconds, Tab skips' },
    { id: 'TRICKS', label: 'Mixed tricks', desc: 'Squares, × 11, × 25, products near 100, difference of squares, 60 seconds, Tab skips' }
  ];
  // Keys 1–9 then 0 choose a mode, in this order.
  var MODE_GROUPS = [['Zetamac', 0, 4], ['Training', 4, 7], ['Tricks', 7, 10]];
  var LOG_MODES = ['TABLES', 'WTABLES', 'P2', 'P3', 'NORMAL120', 'DRILL', 'INTERVIEW', 'CUSTOM', 'SQUARES', 'PERCENT', 'TRICKS'];
  var THRESHOLDS = { P2: 18, P3: 25, NORMAL120: 60 };
  var OP_SYM = { add: '+', sub: '−', mul: '×', div: '÷' };
  var OP_NAME = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' };

  // ---------- helpers ----------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function $(sel) { return main.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(main.querySelectorAll(sel)); }
  function save() {
    var box = document.getElementById('app-alert');
    if (AT.Sync) AT.Sync.changed();
    if (Store.save(data)) { box.hidden = true; return; }
    box.textContent = 'Your last change could not be saved in this browser. Export your data in Settings to keep a copy.';
    box.hidden = false;
  }
  // Screen-reader announcement (visually hidden polite region).
  function announce(msg) { var l = document.getElementById('live'); l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); }
  function todayKey() { return S.dayKey(new Date().toISOString()); }
  function sec(ms) { return (ms / 1000).toFixed(1) + ' s'; }
  var f1 = P.f1;
  function signed(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1); }
  function label(mode) { return P.MODE_LABELS[mode] || mode; }
  function seed() { return Date.now(); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  // Dates through Intl, never hand-formatted.
  var dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  function fmtDay(day) { var p = day.split('-').map(Number); return dayFmt.format(new Date(p[0], p[1] - 1, p[2])); }
  function fmtDate(iso) { return dayFmt.format(new Date(iso)); }

  // Layout pieces. `sub`, `body`, `aside`, `value`, `note` are HTML; titles and labels are escaped.
  function pageHead(title, sub, actions, testid) {
    return '<div class="page-head"><div><h1' + (testid ? ' data-testid="' + testid + '"' : '') + '>' + esc(title) + '</h1>' +
      (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="actions">' + actions + '</div>' : '') + '</div>';
  }
  function section(lbl, body, aside, testid) {
    return '<section class="sec"' + (testid ? ' data-testid="' + testid + '"' : '') + '><h2 class="sec-h"><span>' + esc(lbl) + '</span>' +
      (aside ? '<span class="sec-aside">' + aside + '</span>' : '') + '</h2>' + body + '</section>';
  }
  function stats(items) {
    return '<div class="stats" style="--n:' + items.length + '">' + items.map(function (i) {
      return '<div class="stat"' + (i.key ? ' data-testid="stat-' + i.key + '"' : '') + '><div class="lab">' + esc(i.label) + '</div><div class="val">' + i.value + '</div>' +
        (i.note ? '<div class="note">' + i.note + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  // A compact label/value grid: [[label, value], …].
  function facts(pairs) {
    // Numbers wear the monospace face (the brief); words like "First time" stay in the text face.
    return '<dl class="facts">' + pairs.filter(Boolean).map(function (p) {
      var isNum = /^[−+-]?[\d.,]+( ?(s|%|days?))?$/.test(String(p[1]).trim());
      return '<div><dt>' + esc(p[0]) + '</dt><dd' + (isNum ? ' class="num"' : '') + '>' + p[1] + '</dd></div>';
    }).join('') + '</dl>';
  }
  function keys(pairs) {
    return '<p class="keys">' + pairs.map(function (p) { return '<span><kbd>' + p[0] + '</kbd>' + p[1] + '</span>'; }).join('') + '</p>';
  }
  // Label | control row. `forId` makes the label clickable for its control.
  function frow(lbl, control, hint, forId) {
    return '<div class="fl">' + (forId ? '<label for="' + forId + '">' + esc(lbl) + '</label>' : esc(lbl)) + '</div><div class="fc">' + control +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }

  // ---------- routing ----------

  var SCREENS = { play: renderPlay, review: renderReview, drill: renderDrill, stats: renderStats, settings: renderSettings };
  // Stats sections, in page order.
  var PANES = { day: renderDay, progress: renderProgress, log: renderLog };
  var PANE_ORDER = ['day', 'progress', 'log'];
  // Old links keep working: these hash prefixes moved (Session became Day, inside Stats).
  var MOVED = { session: 'stats/day', progress: 'stats/progress', log: 'stats/log', 'stats/session': 'stats/day', 'stats/review': 'review' };

  function canonical(hash) {
    var parts = hash.split('/'), two = parts.slice(0, 2).join('/');
    if (MOVED[two]) return [MOVED[two]].concat(parts.slice(2)).join('/');
    if (MOVED[parts[0]]) return [MOVED[parts[0]]].concat(parts.slice(1)).join('/');
    return hash;
  }

  function go(name, arg) {
    var h = '#' + name + (arg ? '/' + arg : '');
    if (location.hash === h) route(); else location.hash = h;
  }
  // Update the hash for in-page state without re-rendering or scrolling.
  function setHash(name, arg) { history.replaceState(null, '', '#' + name + (arg ? '/' + arg : '')); }

  function route() {
    if (Game.active) return;
    screenKeys = null;
    var tip = document.querySelector('.chart-tip'); if (tip) tip.hidden = true;
    var hash = location.hash.slice(1), moved = canonical(hash);
    if (moved !== hash) history.replaceState(null, '', '#' + moved);
    var parts = moved.split('/'), name = parts[0] || 'play';
    if (!SCREENS[name]) name = 'play';
    Array.prototype.forEach.call(document.querySelectorAll('nav a'), function (a) {
      if (a.getAttribute('href') === '#' + name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (name === 'play') ui.sel = null; // fresh default selection each visit
    if (name === 'review') ui.heatView = ['mul', 'div'].indexOf(parts[1]) >= 0 ? parts[1] : 'both';
    var pane = name === 'stats' && PANES[parts[1]] ? parts[1] : null;
    if (name === 'stats') {
      ui.pane = pane;
      ui.sessionDay = pane === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(parts[2] || '') ? parts[2] : null; // today / latest unless the hash names a day
    }
    SCREENS[name]();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    var target = name === 'stats' && pane && document.getElementById('pane-' + pane);
    if (target && pane !== PANE_ORDER[0]) target.scrollIntoView(); else window.scrollTo(0, 0);
  }

  function setHelp(open) {
    document.getElementById('help').hidden = !open;
    if (open) document.getElementById('help-close').focus();
  }

  function onKey(e) {
    // defaultPrevented: a control already used the key (arrows on a focused chart must not also switch days).
    if (Game.active || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t.tagName, type = (t.type || '').toLowerCase();
    if (!document.getElementById('help').hidden) {
      if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); setHelp(false); }
      return;
    }
    var typing = (tag === 'INPUT' && ['checkbox', 'radio', 'button', 'submit', 'file'].indexOf(type) < 0) || tag === 'TEXTAREA' || tag === 'SELECT';
    if (typing) { if (e.key === 'Escape') t.blur(); return; }
    // Let Enter/Space activate a focused button, link or checkbox.
    if ((e.key === 'Enter' || e.key === ' ') && (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SUMMARY')) return;
    if (screenKeys && screenKeys(e) === true) { e.preventDefault(); return; }
    // E G L were pages of their own; they now open their Stats section.
    var map = { p: 'play', r: 'review', d: 'drill', a: 'stats', s: 'settings' }, panes = { e: 'day', g: 'progress', l: 'log' };
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (map[k]) { e.preventDefault(); go(map[k]); }
    else if (panes[k]) { e.preventDefault(); go('stats', panes[k]); }
    else if (e.key === '?') { e.preventDefault(); setHelp(true); }
    else if (k === 't') { e.preventDefault(); toggleTheme(); }
  }

  // ---------- theme ----------

  function applyTheme() {
    var t = data.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    // Keep the browser chrome colour in step with a forced theme.
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    Array.prototype.forEach.call(metas, function (m) {
      if (t === 'light' || t === 'dark') { m.setAttribute('content', t === 'dark' ? '#000000' : '#ffffff'); m.removeAttribute('media'); }
    });
  }
  function isDark() {
    var t = data.settings.theme;
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function toggleTheme() {
    data.settings.theme = isDark() ? 'light' : 'dark';
    applyTheme(); save();
    announce(isDark() ? 'Dark theme' : 'Light theme');
    if ((location.hash.slice(1).split('/')[0] || 'play') === 'settings' && !main.querySelector('.end')) renderSettings();
  }

  // ---------- launching rounds ----------

  function baseOpts(mode, settings, onEnd) {
    return {
      mode: mode, settings: settings, duration: settings.duration, countdown: data.settings.countdown,
      onEnd: function (round) { data.rounds.push(round); save(); onEnd(round); },
      onAbort: function () { route(); }
    };
  }

  // `again` is what "Play again" runs (same settings, fresh questions).
  function launchZetamac(mode, settings, makeGen, again) {
    var o = baseOpts(mode, settings, function (round) { showEnd(round, again); });
    o.generator = makeGen();
    Game.startZetamac(o);
  }

  function playStandard(mode) {
    var s = G.modeSettings(mode);
    launchZetamac(mode, s, function () { return G.makeGenerator(s, G.mulberry32(seed())); }, function () { playStandard(mode); });
  }

  function playCustom(settings) {
    data.settings.custom = settings; save();
    launchZetamac('CUSTOM', settings, function () { return G.makeGenerator(settings, G.mulberry32(seed())); }, function () { playCustom(settings); });
  }

  // Weak-fact drill: recomputed each time so a replay targets the latest weak facts.
  function playWeakDrill() {
    var pool = S.drillPool(S.drillTargets(S.factStats(data.rounds)));
    var s = G.modeSettings('P2'); s.source = 'weak';
    launchZetamac('DRILL', s, function () {
      return G.makeMixedGenerator({ pool: pool, share: 0.7, base: G.modeSettings('P2'), rng: G.mulberry32(seed()) });
    }, playWeakDrill);
  }

  // Weighted tables: every × and ÷ table fact (each division direction apart), picked in proportion to (your time on it)².
  function playWeightedTables() {
    var pool = S.tableWeights(S.tableCells(data.rounds));
    var s = G.modeSettings('TABLES'); s.source = 'weighted';
    launchZetamac('WTABLES', s, function () {
      return G.makeMixedGenerator({ pool: pool, share: 1, base: G.modeSettings('TABLES'), rng: G.mulberry32(seed()) });
    }, playWeightedTables);
  }

  // Replay exact questions: `share` of them from the list, the rest from `base` settings.
  function playPool(questions, share, base, source) {
    var pool = questions.map(function (q) { return { q: { op: q.op, a: q.a, b: q.b, type: q.type }, weight: 1 }; });
    var s = JSON.parse(JSON.stringify(base.types ? { types: base.types, duration: 60 } : { ops: base.ops, ranges: base.ranges, duration: 60 })); s.source = source;
    launchZetamac('DRILL', s, function () {
      return G.makeMixedGenerator({ pool: pool, share: share, base: s, rng: G.mulberry32(seed()) });
    }, function () { playPool(questions, share, base, source); });
  }

  function playMistakes() {
    var qs = S.mistakes(data.rounds);
    if (!qs.length) { announce('Nothing to replay: no wrong or slow answers in your last 3 days.'); return; }
    playPool(qs, 1, G.modeSettings('P2'), 'mistakes');
  }

  function playInterview() {
    var neg = Number(data.settings.negMark) || 0;
    var s = { duration: 480, count: 80, negMark: neg };
    var o = baseOpts('INTERVIEW', s, function (round) { showInterviewEnd(round); });
    o.generator = G.makeInterviewGenerator(G.mulberry32(seed()));
    o.count = 80; o.negMark = neg;
    Game.startInterview(o);
  }

  function startMode(id) {
    if (id === 'DRILL') go('drill');
    else if (id === 'INTERVIEW') playInterview();
    else if (id === 'CUSTOM') submitCustom();
    else playStandard(id);
  }

  // ---------- Play (home) ----------

  // The hero names whatever is selected, so the big button and Enter always do the same thing.
  function heroFor(m, rec, step) {
    var why = m.id === 'TABLES' && rec.warmup ? 'Warm up first, then ' + label(rec.mode)
      : m.id === rec.mode ? 'Today’s training, step ' + step.n + ' of ' + P.STEPS.length
      : 'Your choice';
    var start = { DRILL: 'Open the drill', INTERVIEW: 'Start Interview sim', CUSTOM: 'Start custom round' }[m.id] || 'Start ' + m.label;
    var note = {
      DRILL: 'You see your slowest facts first, then play 60 seconds where about 70% of questions come from them.',
      INTERVIEW: 'Integers, decimals, fractions, percentages and estimates. Type the answer and press Enter: 0.5, .5 and 1/2 all count. Tab skips. ' +
        'You get +1 for a right answer, −' + (Number(data.settings.negMark) || 0) + ' for a wrong one, 0 for a skip.',
      CUSTOM: 'Set the operations, ranges and length below, then start.',
      NORMAL120: 'This is the score that matters for interviews. Target: 60 or more.',
      PERCENT: '3 ÷ 8 wants a decimal: 0.375. A fraction answer gets two boxes: type the numerator, then the denominator, in lowest terms.',
      TRICKS: 'Each question has a shortcut. Freeze on one and the end screen shows how to think it.'
    }[m.id];
    return '<section class="hero" aria-labelledby="hero-mode">' +
      '<p class="hero-why">' + esc(why) + '</p>' +
      '<h1 class="hero-mode" id="hero-mode">' + esc(m.label) + '</h1>' +
      '<p class="hero-desc">' + esc(m.desc) + '</p>' + (note ? '<p class="hero-note">' + esc(note) + '</p>' : '') +
      '<button type="button" class="primary hero-start" id="hero-start" data-testid="home-start-button">' + esc(start) + ' <kbd>Enter</kbd></button>' +
      '</section>';
  }

  function renderPlay() {
    var rounds = data.rounds, st = data.settings;
    var info = P.current(rounds, st.stepOverride), cur = info.current, step = cur.step;
    var today = todayKey(), rec = P.recommend(rounds, info, today);
    if (!ui.sel) ui.sel = rec.warmup ? 'TABLES' : rec.mode;
    var sel = MODES.filter(function (m) { return m.id === ui.sel; })[0];
    var todayRounds = rounds.filter(function (r) { return S.dayKey(r.startedAt) === today; });
    var stepToday = todayRounds.filter(function (r) { return S.effMode(r) === step.mode; }).map(function (r) { return r.score; });
    var h = [heroFor(sel, rec, step)];

    // Step progress.
    var now = stepToday.length
      ? 'Today: ' + label(step.mode) + ' average ' + f1(S.mean(stepToday)) + ' after ' + plural(stepToday.length, 'round') +
        (stepToday.length >= 3 ? '. Today counts.' : '. ' + (3 - stepToday.length) + ' more to make today count.')
      : 'Today: no ' + label(step.mode) + ' rounds yet. Play 3 or more for today to count.';
    // One line (step, streak, count); the rule and today's count open under it.
    h.push('<details class="step" aria-label="Step progress" data-testid="home-step"><summary>' +
      '<h2 class="step-id">Step ' + step.n + ': ' + esc(step.name) + '</h2>' +
      '<span class="streak" data-testid="home-streak" aria-label="' + cur.streak + ' of 3 days done">' + P.boxes(cur.streak) + '</span>' +
      '<span class="step-count">' + (info.allDone ? 'All steps complete' : cur.streak + ' of 3 days done') + '</span></summary>' +
      '<p class="step-rule">Average ' + step.threshold + ' or more in ' + label(step.mode) + ', 3 days in a row.' +
      (info.overridden ? ' <span class="mid">Set manually in Settings.</span>' : '') + '</p>' +
      '<p class="step-now">' + (info.allDone ? 'Keep your 120-second average above 60. ' : '') + esc(now) + '</p>' +
      '</details>');

    // Notices: step completion (once), fatigue, backup reminder.
    var notes = [];
    info.all.forEach(function (p, i) {
      if (p.completed && st.announced.indexOf(p.step.id) < 0) {
        var next = P.STEPS[i + 1];
        notes.push('<p class="notice strong">Step ' + p.step.n + ', ' + esc(p.step.name) + ', complete on day ' + p.completedAt + '. ' +
          (next ? 'Next: step ' + next.n + ', ' + esc(next.name) + ', ' + esc(next.desc) + ', average ' + next.threshold + ' or more.' : 'That was the last step.') + '</p>');
        st.announced.push(p.step.id);
        save();
      }
    });
    LOG_MODES.forEach(function (m) {
      var ss = S.sessionsForMode(rounds, m).filter(function (s) { return s.day === today; });
      if (ss.length && S.fatigue(ss[0].scores)) notes.push('<p class="notice strong">Your ' + label(m) + ' scores are dropping. Stop here or take a 10-minute break.</p>');
    });
    // Old saves hold 8 seeded zetamac rounds. Ask for a backup once there is something worth keeping.
    var own = rounds.filter(function (r) { return r.id.indexOf('seed-') !== 0; }).length;
    if (st.lastExport && !signedIn()) {
      var days = Math.floor((Date.now() - Date.parse(st.lastExport)) / 86400000);
      if (days >= 7) notes.push('<p class="notice quiet">Your last backup is ' + days + ' days old. Export a new one in Settings.</p>');
    } else if (own >= 10 && !signedIn()) notes.push('<p class="notice quiet">You have ' + own + ' rounds and no backup yet. Export one in Settings.</p>');
    if (notes.length) h.push('<div class="notices">' + notes.join('') + '</div>');

    // All modes, in two groups; Custom's form opens under its row.
    var body = [];
    MODE_GROUPS.forEach(function (g) {
      body.push('<h3 class="group">' + g[0] + '</h3><ol class="modes">');
      MODES.slice(g[1], g[2]).forEach(function (m, j) {
        // One tag only: the warm-up while it is due, then the step's mode.
        var i = g[1] + j, tag = '';
        if (rec.warmup ? m.id === 'TABLES' : m.id === rec.mode) tag = rec.warmup ? 'Warm up first' : 'Recommended';
        body.push('<li><button type="button" class="mode' + (ui.sel === m.id ? ' sel' : '') + (tag ? ' rec' : '') + '" data-mode="' + m.id + '"' +
          ' aria-pressed="' + (ui.sel === m.id) + '">' +
          '<span class="k">' + modeKey(i) + '</span><span class="nm">' + esc(m.label) + '</span><span class="ds">' + esc(m.desc) + '</span>' +
          '<span class="tag">' + tag + '</span></button>' + (ui.sel === m.id && m.id === 'CUSTOM' ? customPanel() : '') + '</li>');
      });
      body.push('</ol>');
    });
    h.push(section('All modes', body.join('')));
    h.push(keys([['1–9 0', 'choose a mode'], ['↑ ↓', 'move'], ['Enter', 'start']]));
    main.innerHTML = h.join('');

    $('#hero-start').addEventListener('click', function () { startMode(ui.sel); });
    // A row selects its mode; selecting the already-selected row starts it.
    $$('.mode').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-mode');
        if (id === ui.sel && id !== 'CUSTOM') startMode(id);
        else { ui.sel = id; renderPlay(); var again = $('.mode[data-mode="' + id + '"]'); if (again) again.focus(); }
      });
    });
    if (ui.sel === 'CUSTOM') bindCustom();

    screenKeys = function (e) {
      var ids = MODES.map(function (m) { return m.id; }), i = ids.indexOf(ui.sel);
      if (/^[0-9]$/.test(e.key) && ids[(+e.key + 9) % 10]) { ui.sel = ids[(+e.key + 9) % 10]; renderPlay(); return true; }
      if (e.key === 'ArrowDown') { ui.sel = ids[(i + 1) % ids.length]; renderPlay(); return true; }
      if (e.key === 'ArrowUp') { ui.sel = ids[(i + ids.length - 1) % ids.length]; renderPlay(); return true; }
      if (e.key === 'Enter' || e.key === ' ') { startMode(ui.sel); return true; }
      return false;
    };
  }

  function modeKey(i) { return String((i + 1) % 10); }   // 1–9, then 0

  // ---------- Custom ----------

  function customPanel() {
    var c = data.settings.custom || G.modeSettings('P3'), r = c.ranges;
    function n(id, v, what) {
      return '<input type="number" min="0" max="9999" id="' + id + '" name="' + id + '" autocomplete="off" value="' + v + '" aria-label="' + what + '">';
    }
    var h = ['<form class="panel" id="custom" novalidate><div class="form">'];
    h.push(frow('Operations', ['add', 'sub', 'mul', 'div'].map(function (op) {
      return '<label><input type="checkbox" name="op" value="' + op + '"' + (c.ops.indexOf(op) >= 0 ? ' checked' : '') + '>' + OP_NAME[op] + '</label>';
    }).join('')));
    h.push(frow('Addition', '(' + n('a1', r.add.a[0], 'First number, from') + ' to ' + n('a2', r.add.a[1], 'First number, to') + ') + (' +
      n('a3', r.add.b[0], 'Second number, from') + ' to ' + n('a4', r.add.b[1], 'Second number, to') + ')', 'Subtraction uses the same numbers in reverse.'));
    h.push(frow('Multiplication', '(' + n('m1', r.mul.a[0], 'First factor, from') + ' to ' + n('m2', r.mul.a[1], 'First factor, to') + ') × (' +
      n('m3', r.mul.b[0], 'Second factor, from') + ' to ' + n('m4', r.mul.b[1], 'Second factor, to') + ')', 'Division uses the same numbers in reverse.'));
    h.push(frow('Length', '<select id="dur" name="duration">' + [30, 60, 120, 300].map(function (d) {
      return '<option value="' + d + '"' + (c.duration === d ? ' selected' : '') + '>' + d + ' seconds</option>';
    }).join('') + '</select>', null, 'dur'));
    h.push(frow('Presets', '<input id="pname" name="preset-name" autocomplete="off" placeholder="Mixed hard…" style="width:11em" aria-label="Preset name">' +
      '<button type="button" id="psave">Save as preset</button>' +
      data.presets.map(function (p, i) {
        return '<span><button type="button" class="pload" data-i="' + i + '">' + esc(p.name) + '</button> <button type="button" class="link pdel" data-i="' + i +
          '" aria-label="Delete preset ' + esc(p.name) + '">×</button></span>';
      }).join(''), 'Load a preset with its button; × deletes it.'));
    h.push('</div><p class="err" id="custom-err" aria-live="polite">' + (ui.customError ? esc(ui.customError.message) : '') + '</p>');
    h.push('<div class="row"><button type="submit" class="primary">Start custom round</button></div></form>');
    return h.join('');
  }

  function fieldError(message, field) { var e = new Error(message); e.field = field; return e; }

  function readCustom() {
    function v(id) { return parseInt($('#' + id).value, 10); }
    var ops = $$('input[name="op"]:checked').map(function (x) { return x.value; });
    var ids = ['a1', 'a2', 'a3', 'a4', 'm1', 'm2', 'm3', 'm4'], vals = ids.map(v);
    if (!ops.length) throw fieldError('Choose at least one operation.', null);
    for (var i = 0; i < vals.length; i++) if (isNaN(vals[i]) || vals[i] < 0) throw fieldError('Use whole numbers of 0 or more in every range.', ids[i]);
    for (i = 0; i < 8; i += 2) if (vals[i] > vals[i + 1]) throw fieldError('Each range needs its first number to be the smaller one.', ids[i]);
    if (ops.indexOf('div') >= 0 && vals[4] === 0) throw fieldError('For division, start the first factor at 1 or more.', 'm1');
    return {
      ops: ops, duration: parseInt($('#dur').value, 10),
      ranges: { add: { a: [vals[0], vals[1]], b: [vals[2], vals[3]] }, mul: { a: [vals[4], vals[5]], b: [vals[6], vals[7]] } }
    };
  }

  // Show a custom-form error inline and put focus on the field to fix.
  function showCustomError(err) {
    ui.customError = err; renderPlay();
    var f = err.field ? $('#' + err.field) : $('input[name="op"]');
    if (f) f.focus();
  }

  function submitCustom() {
    try { ui.customError = null; playCustom(readCustom()); }
    catch (err) { showCustomError(err); }
  }

  function bindCustom() {
    $('#custom').addEventListener('submit', function (e) { e.preventDefault(); submitCustom(); });
    $('#psave').addEventListener('click', function () {
      var name = $('#pname').value.trim();
      if (!name) { showCustomError(fieldError('Name the preset first.', 'pname')); return; }
      try {
        var s = readCustom();
        data.presets = data.presets.filter(function (p) { return p.name !== name; });
        data.presets.push({ name: name, settings: s });
        data.settings.custom = s; ui.customError = null; save(); renderPlay();
        announce('Preset ' + name + ' saved.');
      } catch (err) { showCustomError(err); }
    });
    $$('.pload').forEach(function (b) {
      b.addEventListener('click', function () { data.settings.custom = data.presets[+b.getAttribute('data-i')].settings; save(); renderPlay(); });
    });
    $$('.pdel').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = data.presets[+b.getAttribute('data-i')];
        if (confirm('Delete the preset “' + p.name + '”?')) { data.presets.splice(+b.getAttribute('data-i'), 1); save(); renderPlay(); }
      });
    });
  }

  // ---------- End screens ----------

  function endKeys(actions) {
    // Swallow keys typed as time ran out: the keys arm 400 ms after the end screen appears.
    // A timer (not a Date.now() comparison) keeps this on the same clock as the round itself.
    var armed = false, token = ++endShownAt;
    setTimeout(function () { if (token === endShownAt) armed = true; }, 400);
    screenKeys = function (e) {
      if (!armed) return true;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'Enter') { actions.again(); return true; }
      if (k === 'h') { go('play'); return true; }
      if (actions[k]) { actions[k](); return true; }
      return false;
    };
  }

  // Visible buttons for every end-screen key, so the mouse works as well as the keyboard.
  function endButtons(list) {
    return '<div class="row end-actions">' + list.map(function (b, i) {
      return '<button type="button" class="' + (i === 0 ? 'primary' : '') + '" data-act="' + b[0] + '">' + esc(b[1]) + ' <kbd>' + b[2] + '</kbd></button>';
    }).join('') + '</div>';
  }
  function bindEndButtons(actions) {
    $$('[data-act]').forEach(function (b) { b.addEventListener('click', function () { actions[b.getAttribute('data-act')](); }); });
  }

  function endHead(score, title, sub) {
    return '<div class="end-head"><div class="score" data-testid="end-score">' + score + '</div><p class="sub"><b>' + esc(title) + '</b>' + esc(sub) + '</p></div>';
  }

  function ordinal(n) {
    var t = n % 100, s = t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th';
    return n + s;
  }

  // Seconds per question across the round, with the round median as a reference line.
  function timeLine(series, med, name) {
    var xs = series.map(function (_, i) { return i + 1; });
    return C.legend([{ kind: 'line', label: 'Seconds per question' }, { kind: 'dot', label: 'Round median ' + sec(med) }]) + C.line({
      xs: xs, h: 160, xName: 'Question ', label: name + ' seconds per question',
      series: [{ ys: series.map(function (x) { return x.s; }), kind: 'line', name: 'time' }],
      hlines: [{ y: med / 1000, kind: 'dot', name: 'round median' }], fmt: function (v) { return v.toFixed(1) + 's'; }, zero: true
    }) + C.table(['Question', 'Seconds'], series.map(function (x, i) { return [i + 1 + '. ' + x.q.shown, x.s.toFixed(1)]; }));
  }

  function showEnd(round, again) {
    var rounds = data.rounds, today = todayKey(), mode = round.mode;
    var nToday = rounds.filter(function (r) { return S.dayKey(r.startedAt) === today; }).length;
    var rep = S.roundReport(rounds, round), rk = rep.rank, med = rep.median;
    var slowQs = rep.slowest.slice(0, 5).filter(function (q) { return q.op !== 'iv'; });
    var h = ['<div class="end">'];
    h.push('<h1 class="sr-only">Round finished</h1>');
    h.push(endHead(round.score, label(mode), 'Round ' + nToday + ' today'));
    h.push(endButtons([['again', 'Play again', 'Enter']].concat(slowQs.length ? [['d', 'Drill these slow questions', 'D']] : [])
      .concat([['a', 'See today’s analysis', 'A'], ['h', 'Home', 'H']])));

    // Summary: what you read at a glance.
    var avgNote = rep.avg7 === null ? 'First day in this mode' : 'Average ' + f1(rep.avg7);
    if (rep.threshold) avgNote += ', threshold ' + rep.threshold;
    var rankNote = rk.of === 1 ? 'First round in this mode' : rk.best ? (rk.tied ? 'Ties your best' : 'Personal best') :
      rk.bestToday ? 'Best today' : rk.place / rk.of <= 0.5 ? 'Top ' + Math.max(1, Math.round(rk.place / rk.of * 100)) + '%' : '';
    h.push(stats([
      { label: 'Compared with your last 7 days played', value: rep.avg7 === null ? '–' : signed(round.score - rep.avg7), note: avgNote, key: 'vs-average' },
      { label: 'Median time', value: med ? sec(med) : '–', note: rep.usualMedian ? 'Usually ' + sec(rep.usualMedian) : 'Per question', key: 'median' },
      { label: 'First-try accuracy', value: pct(rep.firstTry), note: plural(rep.wrongAttempts, 'wrong attempt') + (rep.skipped ? ', ' + rep.skipped + ' skipped' : ''), key: 'accuracy' },
      { label: 'Rank in this mode', value: rk.of === 1 ? '–' : rk.best ? 'Best' : ordinal(rk.place), note: rk.of > 1 && !rk.best ? 'Of ' + rk.of + (rankNote ? ', ' + rankNote.toLowerCase() : '') : rankNote, key: 'rank' }
    ]));
    h.push('<ul class="takeaways" data-testid="end-takeaways" aria-label="Takeaways">' + rep.takeaways.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>');
    var ss = S.sessionsForMode(rounds, mode).filter(function (s) { return s.day === today; });
    if (ss.length && S.fatigue(ss[0].scores)) h.push('<div class="notices"><p class="notice strong">Your scores are dropping. Stop here or take a 10-minute break.</p></div>');
    if (rep.answered) h.push('<p class="small mid end-more">Details below: pace, operations, freezes and every question.</p>');

    // Details, for when you scroll.
    if (rep.answered >= 2) {
      var p = rep.pace, t = p.duration / 3, labels = [0, 1, 2].map(function (i) { return Math.round(t * i) + '–' + Math.round(t * (i + 1)) + ' s'; });
      var pc = ['<p class="sec-intro">How long each answer took, in the order you saw them.</p>', timeLine(rep.series, med, label(mode))];
      pc.push('<p class="chart-cap">Answers per third of the clock</p>' + C.bars({
        values: p.thirds.map(function (x) { return x.answers; }), labels: labels, h: 110, w: 420, label: 'Answers per third of the clock',
        tips: p.thirds.map(function (x, i) { return { t: labels[i] + ' of the clock', rows: [{ v: String(x.answers), l: 'answers' }, { v: x.median ? sec(x.median) : '–', l: 'median time' }] }; })
      }));
      pc.push(facts(p.thirds.map(function (x, i) { return ['Median time, ' + labels[i], x.median ? sec(x.median) : '–']; })));
      if (p.change !== null) pc.push('<p>' + (Math.abs(p.change) < 0.05 ? 'Your pace stays steady from start to finish.' :
        'You are <b>' + Math.round(Math.abs(p.change) * 100) + '% ' + (p.change > 0 ? 'slower' : 'faster') + '</b> in the last third than in the first.') + '</p>');
      h.push(section('Through the round', pc.join(''), null, 'end-pace'));
    }
    if (rep.ops.length > 1 || rep.ops.some(function (o) { return o.usualMedian; })) {
      h.push(section('Per operation', '<p class="sec-intro">This round against your other ' + esc(label(rep.mode)) + ' rounds.</p>' +
        '<div class="tbl-scroll"><table><tr><th scope="col">Operation</th><th scope="col" class="n">Questions</th><th scope="col" class="n">Median</th><th scope="col" class="n">Usually</th>' +
        '<th scope="col" class="n">Change</th><th scope="col" class="n">Wrong</th><th scope="col" class="n">Time share</th></tr>' +
        rep.ops.map(function (o) {
          return '<tr><td>' + OP_SYM[o.op] + ' ' + OP_NAME[o.op].toLowerCase() + '</td><td class="n">' + o.n + '</td><td class="n">' + sec(o.median) + '</td><td class="n">' +
            (o.usualMedian ? sec(o.usualMedian) : '–') + '</td><td class="n">' + (o.usualMedian ? '<b>' + dsec(o.median - o.usualMedian) + '</b>' : '–') +
            '</td><td class="n">' + o.wrong + '</td><td class="n">' + pct(o.share) + '</td></tr>';
        }).join('') + '</table></div>'));
    }
    if (rep.answered >= 2) {
      var bl = ['Under 1 s', '1–2 s', '2–3 s', '3–4 s', '4 s or more'];
      h.push(section('Time spread', '<p class="chart-cap">Answers by time taken</p>' + C.bars({
        values: rep.buckets, labels: bl, h: 110, w: 420, label: 'Answers by time taken',
        tips: rep.buckets.map(function (v, i) { return { t: bl[i], rows: [{ v: String(v), l: 'answers' }, { v: pct(v / rep.answered), l: 'of the round' }] }; })
      }) + facts([
        ['Mean', sec(rep.mean)], ['Median', sec(med)], ['Middle half', sec(rep.q1) + ' to ' + sec(rep.q3)],
        ['Answers per minute', f1(rep.perMinute)]
      ])));
    }
    if (rep.freezes.length) {
      h.push(section('Freezes', '<p class="sec-intro">Questions that took more than 3 times your median.</p>' + rep.freezes.map(function (f) {
        return '<p class="freeze"><b>' + esc(f.q.shown) + '</b> took <b class="num">' + sec(f.q.timeMs) + '</b>. ' + esc(f.advice) + '</p>';
      }).join('')));
    }
    if (rep.slowest.length) {
      h.push(section('Slowest questions', '<table class="compact"><tr><th scope="col">Question</th><th scope="col" class="n">Time</th><th scope="col">Note</th></tr>' + rep.slowest.map(function (q) {
        return '<tr><td class="num">' + esc(q.shown) + ' = ' + q.answer + '</td><td class="n">' + sec(q.timeMs) + '</td><td class="mid">' +
          (q.skipped ? 'Skipped' : q.unanswered ? 'Not answered' : q.wrongAttempts ? plural(q.wrongAttempts, 'wrong attempt') : '') + '</td></tr>';
      }).join('') + '</table>'));
    }
    if (rep.slower.length || rep.faster.length) {
      var list = function (xs) {
        if (!xs.length) return '<p class="small">None this round.</p>';
        return '<ol class="weak">' + xs.map(function (x) {
          return '<li><span class="f">' + esc(x.label) + '</span><span class="m">' + sec(x.before) + ' → ' + sec(x.today) + '</span></li>';
        }).join('') + '</ol>';
      };
      h.push(section('Facts this round', '<p class="sec-intro">Your usual median time, then this round. A fact needs 3 earlier attempts to show here.</p>' +
        '<h3 class="sub-h">Slower than usual</h3>' + list(rep.slower) + '<h3 class="sub-h">Faster than usual</h3>' + list(rep.faster)));
    }
    if (round.questions.length) {
      var frozen = rep.freezes.map(function (f) { return f.q; });
      h.push(section('Every question', '<div class="tbl-scroll"><table class="compact" data-testid="end-all-questions"><tr><th scope="col" class="n">#</th><th scope="col">Question</th><th scope="col" class="n">Time</th>' +
        '<th scope="col" class="n">Wrong</th><th scope="col">Note</th></tr>' + round.questions.map(function (q, i) {
          return '<tr><td class="n">' + (i + 1) + '</td><td class="num">' + esc(q.shown) + ' = ' + q.answer + '</td><td class="n">' + sec(q.timeMs) + '</td><td class="n">' +
            (q.wrongAttempts || '') + '</td><td class="mid">' + (q.skipped ? 'Skipped' : q.unanswered ? 'Not answered' : frozen.indexOf(q) >= 0 ? 'Freeze' : '') + '</td></tr>';
        }).join('') + '</table></div>'));
    }
    h.push('</div>');
    main.innerHTML = h.join('');
    var actions = {
      again: again,
      d: function () { if (slowQs.length) playPool(slowQs, 0.7, round.settings.ops || round.settings.types ? round.settings : G.modeSettings('P2'), 'slow'); },
      a: function () { go('stats', 'day/' + todayKey()); },
      h: function () { go('play'); }
    };
    bindEndButtons(actions);
    endKeys(actions);
  }

  var IV_TYPES = { int: 'Integers', dec: 'Decimals', frac: 'Fractions', pct: 'Percentages', mag: 'Estimates' };

  function showInterviewEnd(round) {
    var qs = round.questions.filter(function (q) { return !q.unanswered; });
    var answered = qs.filter(function (q) { return !q.skipped; }), right = answered.filter(function (q) { return q.correct; });
    var h = ['<div class="end">', '<h1 class="sr-only">Interview sim finished</h1>'];
    h.push(endHead(round.score, 'Interview sim', qs.length + ' of 80 questions reached'));
    h.push(endButtons([['again', 'Play again', 'Enter'], ['a', 'See today’s analysis', 'A'], ['h', 'Home', 'H']]));
    h.push(stats([
      { label: 'Accuracy', value: (answered.length ? Math.round(right.length / answered.length * 100) : 0) + '%', note: right.length + ' of ' + answered.length + ' answered', key: 'accuracy' },
      { label: 'Average time', value: qs.length ? sec(S.mean(qs.map(function (q) { return q.timeMs; }))) : '–', note: 'Per question', key: 'average-time' },
      { label: 'Skipped', value: String(qs.filter(function (q) { return q.skipped; }).length), note: 'With Tab', key: 'skipped' }
    ]));
    var rows = ['<table><tr><th scope="col">Type</th><th scope="col" class="n">Seen</th><th scope="col" class="n">Right</th><th scope="col" class="n">Wrong</th><th scope="col" class="n">Skipped</th><th scope="col" class="n">Average time</th></tr>'];
    Object.keys(IV_TYPES).forEach(function (t) {
      var x = qs.filter(function (q) { return q.type === t; });
      if (!x.length) return;
      rows.push('<tr><td>' + IV_TYPES[t] + '</td><td class="n">' + x.length + '</td><td class="n">' + x.filter(function (q) { return q.correct; }).length +
        '</td><td class="n">' + x.filter(function (q) { return !q.correct && !q.skipped; }).length + '</td><td class="n">' + x.filter(function (q) { return q.skipped; }).length +
        '</td><td class="n">' + sec(S.mean(x.map(function (q) { return q.timeMs; }))) + '</td></tr>');
    });
    rows.push('</table>');
    h.push(section('By question type', rows.join('')));
    var wrongs = answered.filter(function (q) { return !q.correct; }).slice(0, 10);
    if (wrongs.length) {
      h.push(section('Wrong answers', '<table><tr><th scope="col">Question</th><th scope="col">Your answer</th><th scope="col">Right answer</th></tr>' + wrongs.map(function (q) {
        return '<tr><td class="num">' + esc(q.shown) + '</td><td class="num mid">' + esc(q.given) + '</td><td class="num">' + esc(q.answerText) + '</td></tr>';
      }).join('') + '</table>'));
    }
    if (qs.length >= 2) {
      var med = S.median(qs.map(function (q) { return q.timeMs; }));
      h.push(section('Through the round', '<p class="sec-intro">How long each question took, in the order you saw them.</p>' +
        timeLine(qs.map(function (q) { return { q: q, s: q.timeMs / 1000 }; }), med, 'Interview sim'), null, 'end-pace'));
    }
    if (qs.length) {
      h.push(section('Every question', '<div class="tbl-scroll"><table class="compact" data-testid="end-all-questions"><tr><th scope="col" class="n">#</th><th scope="col">Question</th><th scope="col">Your answer</th>' +
        '<th scope="col">Right answer</th><th scope="col" class="n">Time</th><th scope="col">Result</th></tr>' + qs.map(function (q, i) {
          return '<tr><td class="n">' + (i + 1) + '</td><td class="num">' + esc(q.shown) + '</td><td class="num mid">' + (q.skipped ? '' : esc(q.given)) + '</td><td class="num">' +
            esc(q.answerText) + '</td><td class="n">' + sec(q.timeMs) + '</td><td' + (q.correct ? '' : ' class="mid"') + '>' + (q.skipped ? 'Skipped' : q.correct ? 'Right' : 'Wrong') + '</td></tr>';
        }).join('') + '</table></div>'));
    }
    h.push('</div>');
    main.innerHTML = h.join('');
    var actions = { again: playInterview, a: function () { go('stats', 'day/' + todayKey()); }, h: function () { go('play'); } };
    bindEndButtons(actions);
    endKeys(actions);
  }

  // ---------- Drill ----------

  function renderDrill() {
    var targets = S.drillTargets(S.factStats(data.rounds)), lines = S.weakLines(targets, 10);
    var nMistakes = S.mistakes(data.rounds).length;
    var h = [pageHead('Weak-fact drill', 'Read the list once, then play 60 seconds. About 70% of the questions come from these facts, the rest are normal Foundations questions.',
      '<button type="button" id="go" class="primary">Start the drill <kbd>Enter</kbd></button>' +
      '<button type="button" id="mis"' + (nMistakes ? '' : ' disabled') + '>Replay mistakes <kbd>M</kbd></button>')];
    var body;
    if (lines.length) {
      body = '<p class="sec-intro">Slowest first, with your median time.</p><ol class="weak">' + lines.map(function (l) {
        return '<li><span class="f">' + esc(l.label) + '</span><span class="m">' + sec(l.ms) + ', ' + l.status + '</span></li>';
      }).join('') + '</ol>';
    } else {
      body = '<p class="mid">No weak facts yet. Play a few Foundations or Speed rounds and they will show up here. Until then the drill plays normal Foundations.</p>';
    }
    h.push(section('Your weak facts', body));
    h.push(section('Mistakes', '<p class="mid">' + (nMistakes
      ? 'You have ' + plural(nMistakes, 'question') + ' answered wrong or froze on (over 3 times your usual time) in your last 3 days. Replay mistakes plays a round with only those.'
      : 'No wrong or slow answers in your last 3 days, so there is nothing to replay.') + '</p>'));
    main.innerHTML = h.join('');
    $('#go').addEventListener('click', playWeakDrill);
    $('#mis').addEventListener('click', playMistakes);
    screenKeys = function (e) {
      if (e.key === 'Enter' || e.key === ' ') { playWeakDrill(); return true; }
      if (e.key === 'm' || e.key === 'M') { playMistakes(); return true; }
      return false;
    };
  }

  // ---------- Stats: Today, Progress and Log as sections you open ----------

  var PANE_TITLES = { day: 'Today', progress: 'Progress', log: 'Log' };
  var paneKeys = {};   // keys of each section, active while it is open

  // Which sections are open is a per-browser convenience, so it lives outside the saved data.
  var OPEN_KEY = 'arithmeticTrainer.statsOpen';
  function openPanes() {
    try {
      var v = JSON.parse(localStorage.getItem(OPEN_KEY));
      if (Array.isArray(v)) return v.filter(function (p) { return PANES[p]; });
    } catch (e) { /* blocked or corrupt: use the default */ }
    return ['day'];
  }
  function rememberOpen() {
    var open = PANE_ORDER.filter(function (p) { var d = document.getElementById('pane-' + p); return d && d.open; });
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(open)); } catch (e) { /* not remembered; nothing else depends on it */ }
  }

  // One line under each title, so the page reads without opening anything.
  function paneLine(p) {
    var rounds = data.rounds, days = S.sessionDays(rounds);
    if (!days.length) return 'No rounds yet';
    if (p === 'day') {
      var today = todayKey(), day = days[days.length - 1], rep = S.sessionReport(rounds, day);
      var one = rep.scores.length === 1 ? rep.scores[0] : null;
      return (day === today ? 'Today: ' : 'Nothing yet today. Last played ' + fmtDay(day) + ': ') + plural(rep.rounds, 'round') +
        (one ? ' of ' + label(one.mode) + ', average ' + f1(one.stats.avg) : ' in ' + plural(rep.scores.length, 'mode'));
    }
    if (p === 'progress') {
      var info = P.current(rounds, data.settings.stepOverride), step = info.current.step, ss = S.sessionsForMode(rounds, step.mode);
      if (info.allDone) return 'All steps complete';
      return step.name + ': ' + (ss.length ? 'last day average ' + f1(ss[ss.length - 1].stats.avg) : 'no rounds yet') + ', target ' + step.threshold;
    }
    return plural(rounds.length, 'round') + ' over ' + plural(days.length, 'day');
  }

  function renderStats() {
    var open = openPanes();
    if (ui.pane && open.indexOf(ui.pane) < 0) open.push(ui.pane);   // a link to a section opens it
    paneKeys = {};
    var h = [pageHead('Stats', 'Open a section for its details. The ones you leave open stay open next time.')];
    PANE_ORDER.forEach(function (p) {
      h.push('<details class="pane" id="pane-' + p + '" data-testid="stats-' + p + '"' + (open.indexOf(p) >= 0 ? ' open' : '') + '>' +
        '<summary><h2 class="pane-h">' + PANE_TITLES[p] + '</h2><span class="pane-line">' + esc(paneLine(p)) + '</span></summary>' +
        '<div class="pane-body" id="pane-' + p + '-body"></div></details>');
    });
    h.push(keys([['E', 'today'], ['G', 'progress'], ['L', 'log']]));
    main.innerHTML = h.join('');
    // A section is built the first time it opens.
    PANE_ORDER.forEach(function (p) {
      var d = document.getElementById('pane-' + p);
      if (d.open) PANES[p]();
      d.addEventListener('toggle', function () {
        if (d.open && !paneBox(p).hasChildNodes()) PANES[p]();
        rememberOpen();
      });
    });
    screenKeys = function (e) {
      return PANE_ORDER.some(function (p) { return document.getElementById('pane-' + p).open && paneKeys[p] && paneKeys[p](e) === true; });
    };
  }

  function paneBox(p) { return document.getElementById('pane-' + p + '-body'); }
  // Fill a section. It sits under the page's h2 titles, so its own headings move down one level.
  function fill(p, html) {
    var box = paneBox(p);
    box.innerHTML = html.replace(/<(\/?)h([2-5])\b/g, function (m, slash, n) { return '<' + slash + 'h' + (+n + 1); });
    return box;
  }
  // A section's intro line and its buttons. `title` is HTML (Today names the day it shows).
  function paneHead(sub, actions, title) {
    return '<div class="page-head pane-head"><div>' + (title || '') + '<p class="sub">' + sub + '</p></div>' +
      (actions ? '<div class="actions">' + actions + '</div>' : '') + '</div>';
  }

  // ---------- Review ----------

  var TREND = { faster: '↓ faster', slower: '↑ slower', flat: '→ steady' };
  var HEAT_VIEWS = [['both', 'Combined'], ['mul', 'Multiplication'], ['div', 'Division']];

  function renderReview() {
    var fs = S.factStats(data.rounds), byKey = {}, cells = S.tableCells(data.rounds);
    fs.forEach(function (f) { byKey[f.key] = f; });
    // Chance of each fact in weighted tables, summed per view.
    var chMul = {}, chDiv = {};
    S.tableWeights(cells).forEach(function (w) {
      var k = w.cell.slice(4);
      if (w.q.op === 'mul') chMul[k] = (chMul[k] || 0) + w.share; else chDiv[k] = w.share;
    });
    var view = ui.heatView || 'both';
    var nMistakes = S.mistakes(data.rounds).length;
    var h = [pageHead('Review', 'Every fact you have practised and how fast you are on it.',
      '<button type="button" id="mis"' + (nMistakes ? '' : ' disabled title="No wrong or slow answers in your last 3 days"') + '>Replay mistakes <kbd>M</kbd></button>')];

    // One grid cell for the current view: { e: stats or undefined, label, chance, status }.
    function cellAt(r, c) {
      var pk = Math.min(r, c) + 'x' + Math.max(r, c);
      if (view === 'div') return { e: cells.div[r + '/' + c], label: r * c + ' ÷ ' + r + ' = ' + c, chance: chDiv[r + '/' + c] };
      if (view === 'mul') return { e: cells.mul[pk], label: r + ' × ' + c + ' = ' + r * c, chance: chMul[pk] };
      var s = Math.min(r, c), l = Math.max(r, c);
      var both = chMul[pk] + chDiv[s + '/' + l] + (s === l ? 0 : chDiv[l + '/' + s]);
      var f = byKey[pk];
      return { e: f, label: r + ' × ' + c + ' = ' + r * c + ', × and ÷ together', chance: both, status: f && f.status };
    }

    // Heatmap of the tables grid, shaded by median time (white = fast, black = slow).
    var meds = [], a, b, x;
    for (a = 2; a <= 12; a++) for (b = 2; b <= 12; b++) { x = cellAt(a, b); if (x.e) meds.push(x.e.medianTime); }
    var lo = meds.length ? Math.min.apply(null, meds) : 0, hi = meds.length ? Math.max.apply(null, meds) : 1;
    if (hi - lo < 500) hi = lo + 500;
    var g = [meds.length ? '' : '<p class="sec-intro heat-cap">Play a Tables round: each fact you answer fills its cell.</p>',
      view === 'div' ? '<p class="small heat-cap">Rows: the number you divide by. Columns: the answer.</p>' : '',
      '<div class="heat" id="heat" role="group" aria-label="Tables heatmap" data-testid="review-heatmap"><div class="hd" aria-hidden="true">' + (view === 'div' ? '÷' : '×') + '</div>'];
    for (b = 2; b <= 12; b++) g.push('<div class="hd" aria-hidden="true">' + b + '</div>');
    var first = true;
    for (a = 2; a <= 12; a++) {
      g.push('<div class="hd" aria-hidden="true">' + a + '</div>');
      for (b = 2; b <= 12; b++) {
        x = cellAt(a, b);
        var e = x.e;
        var parts = [x.label].concat(e ? ['median ' + sec(e.medianTime), plural(e.attempts, 'attempt'), Math.round(e.wrongRate * 100) + '% wrong']
          .concat(x.status ? [x.status] : []) : ['no data yet'])
          .concat(['weighted tables picks it ' + x.chance.toFixed(1) + '% of the time']);
        g.push('<button type="button" class="cell' + (e ? '' : ' empty') + '" tabindex="' + (first ? 0 : -1) + '" data-r="' + a + '" data-c="' + b +
          '" data-testid="heatmap-cell-' + view + '-' + a + '-' + b + '" aria-label="' + esc(parts.join(', ')) + '" data-txt="' + esc(parts.join('\n')) + '">' +
          (e ? '<span style="opacity:' + ((e.medianTime - lo) / (hi - lo)).toFixed(3) + '"></span>' : '') + '</button>');
        first = false;
      }
    }
    g.push('</div>');
    var scale = '<div class="scale" aria-hidden="true">' + [0, 0.25, 0.5, 0.75, 1].map(function (t) { return '<span><i style="opacity:' + t + '"></i></span>'; }).join('') + '</div>' +
      '<p class="small">' + (meds.length ? 'White is fast (' + sec(lo) + '), black is slow (' + sec(hi) + ').' : 'White is fast, black is slow.') + ' A dot means no data yet.</p>';
    var side = '<div class="heat-side"><p class="heat-read" id="heat-read" aria-hidden="true">Hover or focus a cell to see its numbers.\nArrow keys move between cells.</p>' + scale +
      '<div class="row"><button type="button" id="wtables" class="primary">Play weighted tables <kbd>W</kbd></button></div>' +
      '<p class="small">60 seconds of tables where your slow × and ÷ facts come up more often, each direction of a division on its own. ' +
      'Facts with no data count as slow until you have seen them.</p></div>';
    var seg = '<span class="seg" role="group" aria-label="Heatmap view">' + HEAT_VIEWS.map(function (v) {
      return '<button type="button" class="hv' + (v[0] === view ? ' on' : '') + '" data-view="' + v[0] + '" aria-pressed="' + (v[0] === view) + '">' + v[1] + '</button>';
    }).join('') + '</span>';
    h.push(section('Tables heatmap', '<div class="heat-wrap"><div>' + g.join('') + '</div>' + side + '</div>', seg));

    // Fact table.
    var rows = fs.filter(function (f) { return ui.filter === 'all' || f.cat === ui.filter; });
    var col = ui.sort.col, dir = ui.sort.dir;
    var statusRank = { weak: 0, improving: 1, ok: 2, mastered: 3 };
    rows.sort(function (x, y) {
      var vx = col === 'key' ? G.keyLabel(x.key) : col === 'status' ? statusRank[x.status] : col === 'trend' ? (x.trend || '') : x[col];
      var vy = col === 'key' ? G.keyLabel(y.key) : col === 'status' ? statusRank[y.status] : col === 'trend' ? (y.trend || '') : y[col];
      return (vx < vy ? -1 : vx > vy ? 1 : 0) * dir;
    });
    var tools = '<div class="row"><label for="filter">Operation</label><select id="filter" name="filter">' +
      [['all', 'All'], ['muldiv', '× and ÷'], ['add', '+'], ['sub', '−'], ['iv', 'Interview sim'], ['tr', 'Tricks']].map(function (o) {
        return '<option value="' + o[0] + '"' + (ui.filter === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select><span class="small">' + plural(rows.length, 'fact') + '. Select a column heading to sort.</span></div>';
    var cols = [['key', 'Fact', ''], ['attempts', 'Attempts', 'n'], ['medianTime', 'Median', 'n'], ['wrongRate', 'Wrong', 'n'],
      ['slowness', 'Slowness', 'n'], ['status', 'Status', ''], ['trend', 'Trend', '']];
    var t = ['<table data-testid="review-facts"><tr>' + cols.map(function (c) {
      var sorted = col === c[0];
      return '<th scope="col" class="' + c[2] + '"' + (sorted ? ' aria-sort="' + (dir > 0 ? 'ascending' : 'descending') + '"' : '') +
        '><button type="button" class="link sort" data-col="' + c[0] + '">' + c[1] + (sorted ? (dir > 0 ? ' ▲' : ' ▼') : '') + '</button></th>';
    }).join('') + '</tr>'];
    if (!rows.length) t.push('<tr><td colspan="7" class="mid">No per-question data yet. Play a round and your facts appear here.</td></tr>');
    rows.forEach(function (f) {
      t.push('<tr class="cv"><td class="num">' + esc(G.keyLabel(f.key)) + '</td><td class="n">' + f.attempts + '</td><td class="n">' + sec(f.medianTime) +
        '</td><td class="n">' + Math.round(f.wrongRate * 100) + '%</td><td class="n">' + f.slowness.toFixed(2) + '</td><td>' +
        (f.status === 'weak' ? '<b>weak</b>' + (f.froze ? ' <span class="mid">after a freeze</span>' : '') : f.status) + '</td><td>' + (TREND[f.trend] || '') + '</td></tr>');
    });
    t.push('</table>');
    h.push(section('All facts', tools + t.join('')));
    main.innerHTML = h.join('');

    var read = $('#heat-read');
    $$('.cell').forEach(function (c) {
      function show() { read.textContent = c.getAttribute('data-txt'); }
      c.addEventListener('mouseenter', show); c.addEventListener('focus', show);
      c.addEventListener('keydown', function (e) {
        var d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
        if (!d) return;
        e.preventDefault();
        var r = Math.min(12, Math.max(2, +c.getAttribute('data-r') + d[0])), cc = Math.min(12, Math.max(2, +c.getAttribute('data-c') + d[1]));
        var next = $('.cell[data-r="' + r + '"][data-c="' + cc + '"]');
        c.tabIndex = -1; next.tabIndex = 0; next.focus();
      });
    });
    $('#filter').addEventListener('change', function () { ui.filter = this.value; renderReview(); $('#filter').focus(); });
    $$('.sort').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-col');
        if (ui.sort.col === c) ui.sort.dir *= -1; else ui.sort = { col: c, dir: c === 'key' || c === 'status' ? 1 : -1 };
        renderReview();
        var again = $('.sort[data-col="' + c + '"]'); if (again) again.focus();
      });
    });
    $('#mis').addEventListener('click', playMistakes);
    $('#wtables').addEventListener('click', playWeightedTables);
    // The view lives in the URL (#review/div) so it can be linked and survives a reload.
    function viewHash(v) { setHash('review', v === 'both' ? null : v); }
    function setView(v) {
      ui.heatView = v; viewHash(v); renderReview();
      var bt = $('.hv[data-view="' + v + '"]'); if (bt) bt.focus();
    }
    $$('.hv').forEach(function (bt) { bt.addEventListener('click', function () { setView(bt.getAttribute('data-view')); }); });
    screenKeys = function (e) {
      if (e.key === 'm' || e.key === 'M') { playMistakes(); return true; }
      if (e.key === 'w' || e.key === 'W') { playWeightedTables(); return true; }
      if (e.key === 'v' || e.key === 'V') {
        var ids = HEAT_VIEWS.map(function (v) { return v[0]; });
        var v = ids[(ids.indexOf(ui.heatView || 'both') + 1) % ids.length];
        ui.heatView = v; viewHash(v); renderReview();
        announce(HEAT_VIEWS[ids.indexOf(v)][1] + ' view');
        return true;
      }
      return false;
    };
  }

  // ---------- Today (one day analysed; the code calls a day of practice a session) ----------

  function pct(x) { return x === null || x === undefined ? '–' : Math.round(x * 100) + '%'; }
  function dsec(ms) { return ms === null || ms === undefined ? '–' : (ms >= 0 ? '+' : '−') + (Math.abs(ms) / 1000).toFixed(1) + ' s'; }

  function renderDay() {
    var rounds = data.rounds, days = S.sessionDays(rounds), today = todayKey();
    if (!days.length) { fill('day', '<p class="mid">Press P and play a round. Its analysis appears here.</p>'); return; }
    if (!ui.sessionDay || days.indexOf(ui.sessionDay) < 0) ui.sessionDay = days.indexOf(today) >= 0 ? today : days[days.length - 1];
    var day = ui.sessionDay, rep = S.sessionReport(rounds, day), h = [];

    var pick = '<label class="sr-only" for="s-pick">Choose a day</label><select id="s-pick" name="day">' + days.slice().reverse().map(function (d) {
      return '<option value="' + d + '"' + (d === day ? ' selected' : '') + '>Day ' + (days.indexOf(d) + 1) + ', ' + esc(fmtDay(d)) + '</option>';
    }).join('') + '</select>';
    var actions = '<button type="button" id="s-prev" aria-label="Previous day" title="Previous day (←)"' + (rep.prevDay ? '' : ' disabled') + '>←</button>' + pick +
      '<button type="button" id="s-next" aria-label="Next day" title="Next day (→)"' + (rep.nextDay ? '' : ' disabled') + '>→</button>';
    h.push(paneHead(esc(fmtDay(day)) + (day === today ? ', today' : '') + '. You played ' +
      esc(rep.scores.map(function (s) { return label(s.mode); }).join(', ')) + '.', actions,
      '<p class="pane-title" data-testid="day-title">Day ' + rep.number + ' of practice</p>'));

    h.push(stats([
      { label: 'Rounds', value: String(rep.rounds), note: plural(rep.scores.length, 'mode'), key: 'rounds' },
      { label: 'Questions answered', value: String(rep.questions), note: 'With per-question data', key: 'questions' },
      { label: 'Median time', value: rep.median ? sec(rep.median) : '–', note: rep.usualMedian ? 'Usually ' + sec(rep.usualMedian) : 'No earlier data', key: 'median' },
      { label: 'Wrong answers', value: pct(rep.wrong), note: rep.usualWrong !== null ? 'Usually ' + pct(rep.usualWrong) : 'No earlier data', key: 'wrong' }
    ]));

    // Scores round by round.
    var sc = [];
    rep.scores.forEach(function (s) {
      var n = s.scores.length, xs = s.scores.map(function (_, i) { return i + 1; });
      sc.push('<h3 class="sub-h">' + esc(label(s.mode)) + ' <span class="mid">' + plural(n, 'round') + '</span></h3>');
      if (n >= 2) {
        var lg = [{ kind: 'line', label: 'Score' }];
        if (s.threshold) lg.push({ kind: 'dash', label: 'Threshold ' + s.threshold });
        if (s.prevAvg !== null) lg.push({ kind: 'dot', label: 'Last 7 days played ' + f1(s.prevAvg) });
        sc.push(C.legend(lg) + C.line({
          xs: xs, h: 150, label: label(s.mode) + ' scores by round', xName: 'Round ', endLabel: true,
          series: [{ ys: s.scores, kind: 'line', name: 'score' }],
          hlines: [{ y: s.threshold, kind: 'dash', name: 'threshold' }, { y: s.prevAvg, kind: 'dot', name: 'last 7 days played' }]
        }) + C.table(['Round', 'Score'], s.scores.map(function (v, i) { return [i + 1, v]; })));
      }
      sc.push(facts([
        ['Average', f1(s.stats.avg)], ['Best', s.stats.best], ['Worst', s.stats.worst], ['Spread (sd)', f1(s.stats.sd)],
        ['First round', s.stats.first],
        ['Since your last day', s.lastAvg !== null ? signed(s.stats.avg - s.lastAvg) : 'First time'],
        s.prevAvg !== null ? ['Last 7 days played', f1(s.prevAvg)] : null
      ]));
      if (s.fatigue) sc.push('<div class="notices"><p class="notice strong">Fatigue: your last 3 rounds were ' + s.fatigue.last.join(', ') + ', against ' + f1(s.fatigue.base) + ' for your first 3.</p></div>');
      if (s.external) sc.push('<p class="small">' + plural(s.external, 'round') + ' from zetamac.com: score only, no per-question data.</p>');
    });
    h.push(section('Scores', sc.join(''), null, 'day-scores'));

    // Pace inside rounds.
    if (rep.pace.length) {
      var pc = ['<p class="sec-intro">Each round split into thirds of the clock. Do you slow down as time runs out?</p>'];
      rep.pace.forEach(function (p) {
        var t = p.duration / 3, labels = [0, 1, 2].map(function (i) { return Math.round(t * i) + '–' + Math.round(t * (i + 1)) + ' s'; });
        pc.push('<h3 class="sub-h">' + esc(label(p.mode)) + ' <span class="mid">' + plural(p.rounds, 'round') + '</span></h3>');
        pc.push('<p class="chart-cap">Answers per third, averaged over rounds</p>' + C.bars({
          values: p.thirds.map(function (x) { return x.answers; }), labels: labels, h: 110, w: 420, label: label(p.mode) + ' answers per third',
          tips: p.thirds.map(function (x, i) {
            return { t: labels[i] + ' of the clock', rows: [{ v: f1(x.answers), l: 'answers per round' }, { v: x.median ? sec(x.median) : '–', l: 'median time' }] };
          })
        }));
        pc.push(facts(p.thirds.map(function (x, i) { return ['Median time, ' + labels[i], x.median ? sec(x.median) : '–']; })));
        if (p.change !== null) pc.push('<p>' + (Math.abs(p.change) < 0.05 ? 'Your pace stays steady from start to finish.' :
          'You are <b>' + Math.round(Math.abs(p.change) * 100) + '% ' + (p.change > 0 ? 'slower' : 'faster') + '</b> in the last third than in the first.') + '</p>');
        if (p.perRound.length >= 2) {
          pc.push('<p class="chart-cap">Median answer time per round</p>' + C.line({
            xs: p.perRound.map(function (_, i) { return i + 1; }), h: 110, xName: 'Round ', endLabel: true,
            label: label(p.mode) + ' median answer time per round',
            series: [{ ys: p.perRound.map(function (ms) { return ms / 1000; }), kind: 'line', name: 'median time' }], fmt: function (v) { return v.toFixed(1) + 's'; }
          }));
        }
      });
      h.push(section('Pace inside rounds', pc.join('')));
    }

    // Mistakes and freezes.
    var mk;
    if (!rep.mistakes.length) mk = '<p class="mid">' + (rep.questions ? 'No wrong answers and no freezes. A clean day.' : 'This day has no per-question data.') + '</p>';
    else {
      mk = '<p class="sec-intro">Questions you got wrong, or froze on (more than 3 times the round’s median).</p>' +
        '<table><tr><th scope="col">Question</th><th scope="col" class="n">Seen</th><th scope="col" class="n">Wrong</th><th scope="col" class="n">Freezes</th><th scope="col" class="n">Slowest</th><th scope="col">How to think it</th></tr>' +
        rep.mistakes.map(function (e) {
          var ans = e.q.answerText !== undefined ? e.q.answerText : e.q.answer;
          return '<tr><td class="num">' + esc(e.q.shown) + ' = ' + esc(ans) + '</td><td class="n">' + e.seen + '</td><td class="n">' + (e.wrong || '') +
            '</td><td class="n">' + (e.freezes || '') + '</td><td class="n">' + sec(e.slowest) + '</td><td class="small">' + esc(e.advice) + '</td></tr>';
        }).join('') + '</table>';
    }
    h.push(section('Mistakes and freezes', mk));

    // Per operation.
    if (rep.ops.length) {
      h.push(section('Per operation', '<p class="sec-intro">Today against all your earlier days.</p>' +
        '<table><tr><th scope="col">Operation</th><th scope="col" class="n">Questions</th><th scope="col" class="n">Median</th><th scope="col" class="n">Usually</th>' +
        '<th scope="col" class="n">Change</th><th scope="col" class="n">Wrong</th><th scope="col" class="n">Usually</th></tr>' +
        rep.ops.map(function (o) {
          return '<tr><td>' + OP_SYM[o.op] + ' ' + OP_NAME[o.op].toLowerCase() + '</td><td class="n">' + o.n + '</td><td class="n">' + sec(o.median) + '</td><td class="n">' +
            (o.usualMedian ? sec(o.usualMedian) : '–') + '</td><td class="n">' + (o.usualMedian ? '<b>' + dsec(o.median - o.usualMedian) + '</b>' : '–') +
            '</td><td class="n">' + pct(o.wrong) + '</td><td class="n">' + pct(o.usualWrong) + '</td></tr>';
        }).join('') + '</table>'));
    }

    // Facts that moved.
    if (rep.questions) {
      var list = function (xs) {
        if (!xs.length) return '<p class="small">Nothing clear yet.</p>';
        return '<ol class="weak">' + xs.map(function (x) {
          return '<li><span class="f">' + esc(x.label) + '</span><span class="m">' + sec(x.before) + ' → ' + sec(x.today) + '</span></li>';
        }).join('') + '</ol>';
      };
      h.push(section('Facts that moved', '<p class="sec-intro">Median time before, then today. A fact needs 2 attempts today and 3 before to show here.</p>' +
        '<div class="twocol"><div><h3 class="sub-h">Faster today</h3>' + list(rep.faster) + '</div><div><h3 class="sub-h">Slower today</h3>' + list(rep.slower) + '</div></div>'));
    }
    h.push(keys([['←', 'previous day'], ['→', 'next day'], ['P', 'play']]));
    C.bind(fill('day', h.join('')));

    // The day lives in the URL (#stats/day/2026-10-20).
    function goDay(d) { if (d) { ui.sessionDay = d; setHash('stats', 'day/' + d); renderDay(); } }
    $('#s-prev').addEventListener('click', function () { goDay(rep.prevDay); });
    $('#s-next').addEventListener('click', function () { goDay(rep.nextDay); });
    $('#s-pick').addEventListener('change', function () { goDay(this.value); $('#s-pick').focus(); });
    paneKeys.day = function (e) {
      if (e.key === 'ArrowLeft') { goDay(rep.prevDay); return true; }
      if (e.key === 'ArrowRight') { goDay(rep.nextDay); return true; }
      return false;
    };
  }

  // ---------- Progress ----------

  function renderProgress() {
    var rounds = data.rounds;
    var h = [paneHead('One point per day you played. Hover or focus a chart to read its values; arrow keys move along it.')];
    var info = P.current(rounds, data.settings.stepOverride), step = info.current.step;
    var stepSessions = S.sessionsForMode(rounds, step.mode), st = S.trend(stepSessions, step.threshold);
    var est = S.estimate120(rounds), lastStep = stepSessions[stepSessions.length - 1];
    h.push(stats([
      { label: label(step.mode) + ', last day', value: lastStep ? f1(lastStep.stats.avg) : '–', note: 'Target ' + step.threshold + ' or more', key: 'step-last' },
      { label: 'Trend', value: st.slope === null ? '–' : (st.slope >= 0 ? '+' : '−') + Math.abs(st.slope).toFixed(1), note: st.slope === null ? 'Needs 2 days' : 'Per day, over the last ' + Math.min(5, stepSessions.length), key: 'trend' },
      { label: 'Estimated 120-second score', value: est ? f1(est.estimate) : '–', note: est ? (est.calibrated ? 'Calibrated on your data, ×' + est.factor.toFixed(2) : 'About 2 × your Speed average') : 'Play Speed to get an estimate', key: 'estimate' }
    ]));

    var any = false;
    LOG_MODES.forEach(function (m) {
      var ss = S.sessionsForMode(rounds, m);
      if (!ss.length) return;
      any = true;
      var thr = THRESHOLDS[m] || null, t = S.trend(ss, thr), last = ss[ss.length - 1];
      var body = facts([
        ['Trend', t.slope === null ? 'Needs 2 days' : (t.slope >= 0 ? '+' : '−') + Math.abs(t.slope).toFixed(1) + ' per day'],
        thr ? ['To reach ' + thr, t.sessionsToThreshold === null ? '–' : t.sessionsToThreshold === 0 ? 'Reached' : 'About ' + plural(t.sessionsToThreshold, 'day')] : null,
        ['Last day', f1(last.stats.avg)], ['Best round', last.stats.best]
      ]);
      var lg = [{ kind: 'line', label: 'Day average' }, { kind: 'dots', label: 'Best round' }];
      if (thr) lg.push({ kind: 'dash', label: 'Threshold ' + thr });
      body += C.legend(lg) + C.line({
        xs: ss.map(function (s) { return s.number; }), xName: 'Day ', endLabel: true,
        series: [{ ys: ss.map(function (s) { return s.stats.avg; }), kind: 'line', name: 'average' }, { ys: ss.map(function (s) { return s.stats.best; }), kind: 'dots', name: 'best' }],
        hline: thr, label: label(m) + ' day averages', h: 160
      }) + C.table(['Day', 'Average', 'Best', 'Rounds'], ss.map(function (s) { return [s.number, f1(s.stats.avg), s.stats.best, s.scores.length]; }));
      var ri = S.roundIndexAverages(rounds, m);
      if (ri.length >= 2) {
        body += '<p class="chart-cap">Average score by round within a day, to see where fatigue starts</p>' + C.bars({
          values: ri.map(function (x) { return x.avg; }), h: 100, label: label(m) + ' average score by round index',
          tips: ri.map(function (x, i) { return { t: 'Round ' + (i + 1) + ' of a day', rows: [{ v: f1(x.avg), l: 'average score' }, { v: String(x.n), l: x.n === 1 ? 'day' : 'days' }] }; })
        });
      }
      h.push(section(label(m), body, plural(ss.length, 'day')));
    });
    if (!any) h.push('<p class="mid">No rounds yet. Play one and your progress appears here.</p>');

    var tbo = S.timeByOp(rounds);
    if (['add', 'sub', 'mul', 'div'].some(function (op) { return tbo[op].length; })) {
      var sm = ['<p class="sec-intro">Average time per question, by operation.</p><div class="small-multiples">'];
      ['add', 'sub', 'mul', 'div'].forEach(function (op) {
        var pts = tbo[op];
        sm.push('<div><h3 class="sub-h">' + OP_SYM[op] + ' ' + OP_NAME[op] + ' <span class="mid">' + (pts.length ? 'last ' + sec(pts[pts.length - 1].ms) : 'no data yet') + '</span></h3>' +
          (pts.length ? C.line({
            xs: pts.map(function (p) { return p.number; }), xName: 'Day ', endLabel: true, label: OP_NAME[op] + ', average time per question',
            series: [{ ys: pts.map(function (p) { return p.ms / 1000; }), kind: 'line', name: 'average time' }],
            w: 400, h: 120, fmt: function (v) { return v.toFixed(1) + 's'; }
          }) : '') + '</div>');
      });
      sm.push('</div>');
      h.push(section('Time per question', sm.join('')));
    }
    var notes = P.fatigueNotes(rounds, 1000);
    if (notes.length) h.push(section('Fatigue', notes.slice(-8).map(function (n) { return '<p class="mid">' + esc(n) + '</p>'; }).join('')));
    C.bind(fill('progress', h.join('')));
  }

  // ---------- Log ----------

  function renderLog() {
    var rounds = data.rounds;
    var h = [paneHead('One row per day. Select a score to delete that round.',
      '<button type="button" id="copy">Copy report for Claude</button>')];
    h.push('<p id="copy-st" class="small" aria-live="polite">The report explains your rules, days, weak facts and latest day. For the raw data, use Export JSON in Settings.</p><label class="sr-only" for="summary">Report for Claude</label><textarea id="summary" readonly hidden></textarea>');

    h.push(section('Add rounds played on zetamac.com', '<form id="ext" class="inline-form">' +
      '<label class="field" for="ext-mode">Mode<select id="ext-mode" name="mode">' + ['TABLES', 'P2', 'P3', 'NORMAL120'].map(function (m) { return '<option value="' + m + '">' + label(m) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field" for="ext-date">Date<input type="date" id="ext-date" name="date" autocomplete="off" value="' + todayKey() + '"></label>' +
      '<label class="field grow" for="ext-scores">Scores, separated by commas<input id="ext-scores" name="scores" autocomplete="off" inputmode="numeric" spellcheck="false" placeholder="28, 24, 25…"></label>' +
      '<button type="submit">Save rounds</button></form>' +
      '<p id="ext-msg" class="small" aria-live="polite">They count toward your steps, without per-question data.</p>'));

    var any = false;
    LOG_MODES.forEach(function (m) {
      var ss = S.sessionsForMode(rounds, m);
      if (!ss.length) return;
      any = true;
      var t = ['<table><tr><th scope="col">Day</th><th scope="col">Scores</th><th scope="col" class="n">Average</th><th scope="col" class="n">Best</th><th scope="col" class="n">Spread</th></tr>'];
      ss.slice().reverse().forEach(function (s) {
        t.push('<tr><td>Day ' + s.number + ' <small>' + esc(fmtDay(s.day)) + '</small></td><td class="scores">' + s.rounds.map(function (r) {
          return '<button type="button" class="del" data-id="' + esc(r.id) + '" aria-label="Delete round with score ' + r.score + '" title="Delete this round">' +
            r.score + (r.mode === 'EXTERNAL' ? '*' : '') + '</button>';
        }).join(', ') + '</td><td class="n"><b>' + f1(s.stats.avg) + '</b></td><td class="n">' + s.stats.best + '</td><td class="n">' + f1(s.stats.sd) + '</td></tr>');
      });
      t.push('</table>');
      h.push(section(label(m), t.join(''), plural(ss.length, 'day')));
    });
    if (any) h.push('<p class="small">* Played on zetamac.com.</p>');
    fill('log', h.join(''));

    $('#copy').addEventListener('click', function () {
      var text = P.summary(data), ta = $('#summary'), stEl = $('#copy-st');
      ta.value = text; ta.hidden = false;
      function fallback() {
        ta.focus(); ta.select();
        var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        stEl.textContent = ok ? 'Copied.' : 'Copying is blocked here. Select the text below and copy it with Ctrl+C.';
        ta.blur();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { stEl.textContent = 'Copied ' + plural(text.split('\n').length, 'line') + '. Paste it into your chat.'; }, fallback);
      } else fallback();
    });

    $('#ext').addEventListener('submit', function (e) {
      e.preventDefault();
      var mode = $('#ext-mode').value, day = $('#ext-date').value || todayKey();
      var scores = $('#ext-scores').value.split(/[\s,;]+/).filter(Boolean).map(Number);
      if (!scores.length || scores.some(function (x) { return !isFinite(x) || x < 0 || Math.floor(x) !== x; })) {
        $('#ext-msg').textContent = 'Type whole-number scores separated by commas, for example 28, 24, 25.';
        $('#ext-scores').focus();
        return;
      }
      var p = day.split('-').map(Number), base;
      if (day === todayKey()) base = Date.now() - scores.length * 1000;
      else base = new Date(p[0], p[1] - 1, p[2], 12, 0, 0).getTime();
      scores.forEach(function (sc, i) {
        data.rounds.push({
          id: Store.uuid(), startedAt: new Date(base + i * 1000).toISOString(), mode: 'EXTERNAL', linkedMode: mode,
          settings: G.modeSettings(mode), score: sc, questions: []
        });
      });
      data.rounds.sort(function (a, b) { return a.startedAt < b.startedAt ? -1 : 1; });
      save(); renderLog();
      $('#ext-msg').textContent = 'Saved ' + plural(scores.length, 'round') + ' to ' + label(mode) + '.';
    });

    $$('.del').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id'), r = data.rounds.filter(function (x) { return x.id === id; })[0];
        if (!r) return;
        if (confirm('Delete this ' + label(S.effMode(r)) + ' round (score ' + r.score + ', session ' + S.sessionNumber(data.rounds, S.dayKey(r.startedAt)) + ')? This cannot be undone.')) {
          data.rounds = data.rounds.filter(function (x) { return x.id !== id; });
          save(); renderLog();
          announce('Round deleted.');
        }
      });
    });
  }

  // ---------- Settings ----------

  function renderSettings() {
    var st = data.settings, h = [pageHead('Settings', 'Changes save automatically.')];
    if (AT.Sync && AT.Sync.configured()) h.push(section('Account', '<div id="account">' + accountHtml() + '</div>', null, 'settings-account'));
    h.push(section('Appearance', '<div class="form">' + frow('Theme', ['system', 'light', 'dark'].map(function (t) {
      return '<label><input type="radio" name="theme" value="' + t + '"' + (st.theme === t ? ' checked' : '') + '>' + { system: 'Same as system', light: 'Light', dark: 'Dark' }[t] + '</label>';
    }).join(''), 'Press T anywhere to switch light and dark.') + '</div>'));

    h.push(section('Rounds', '<div class="form">' +
      frow('Countdown', '<label><input type="checkbox" id="cd" name="countdown"' + (st.countdown ? ' checked' : '') + '>Count 3, 2, 1 before each round</label>') +
      frow('Current step', '<select id="step" name="step"><option value="">Automatic</option>' + P.STEPS.map(function (s) {
        return '<option value="' + s.id + '"' + (st.stepOverride === s.id ? ' selected' : '') + '>Step ' + s.n + ': ' + esc(s.name) + ', ' + esc(s.desc) + '</option>';
      }).join('') + '</select>', 'Automatic moves you on after 3 qualifying days in a row.', 'step') +
      frow('Interview sim penalty', '<input type="number" id="neg" name="penalty" autocomplete="off" min="0" max="5" step="0.25" value="' + st.negMark + '">',
        'Points you lose for a wrong answer. Skips cost 0.', 'neg') +
      '</div>'));

    h.push(section('Backup', '<div class="form">' +
      frow('Export', '<button type="button" id="export" class="primary">Export JSON</button>',
        'You have ' + plural(data.rounds.length, 'round') + ' in ' + plural(S.sessionDays(data.rounds).length, 'day') + '. Last export: ' +
        (st.lastExport ? esc(fmtDate(st.lastExport)) : 'never') + '.') +
      frow('Import', '<input type="file" id="import" name="import" accept=".json,application/json">', 'You see what the file contains, then choose to replace or merge.', 'import') +
      '</div><div id="import-preview" aria-live="polite"></div>'));

    h.push(section('Reset all data', '<div class="form">' +
      frow('Type RESET to confirm', '<input id="reset-txt" name="reset-confirm" autocomplete="off" spellcheck="false" placeholder="RESET" style="width:10em">' +
        '<button type="button" id="reset" disabled>Reset all data</button>',
        signedIn() ? 'Deletes every round and setting in this browser and in your account, on every device. Export first.'
          : 'Deletes every round and setting in this browser. Export first.', 'reset-txt') + '</div>'));
    main.innerHTML = h.join('');
    bindAccount();

    $$('input[name="theme"]').forEach(function (r) {
      r.addEventListener('change', function () { st.theme = r.value; applyTheme(); save(); });
    });
    $('#cd').addEventListener('change', function () { st.countdown = this.checked; save(); });
    $('#step').addEventListener('change', function () { st.stepOverride = this.value || null; save(); });
    $('#neg').addEventListener('change', function () { var v = parseFloat(this.value); st.negMark = isFinite(v) && v >= 0 ? v : 1; save(); });

    $('#export').addEventListener('click', function () {
      st.lastExport = new Date().toISOString();
      save();
      var blob = new Blob([Store.serialize(data)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'arithmetic-trainer-' + todayKey() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      renderSettings();
      announce('Exported. The file is in your downloads.');
    });

    $('#import').addEventListener('change', function () {
      var file = this.files[0], box = $('#import-preview');
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var inc = Store.parseBackup(String(reader.result));
          ui.importPending = inc;
          box.innerHTML = '<div class="notices"><p class="notice">This file has ' + plural(inc.rounds.length, 'round') + ' in ' + plural(S.sessionDays(inc.rounds).length, 'day') +
            '. Replace your data with it, or merge it into your data?</p></div>' +
            '<div class="row"><button type="button" id="imp-replace" class="primary">Replace my data</button><button type="button" id="imp-merge">Merge</button><button type="button" id="imp-cancel">Cancel</button></div>';
          $('#imp-replace').addEventListener('click', function () { setData(ui.importPending, 'Replaced'); });
          $('#imp-merge').addEventListener('click', function () { setData(Store.merge(data, ui.importPending), 'Merged'); });
          $('#imp-cancel').addEventListener('click', function () { ui.importPending = null; renderSettings(); });
          $('#imp-replace').focus();
        } catch (err) {
          box.innerHTML = '<p class="err">' + esc(err.message) + ' Choose a file exported from this app.</p>';
        }
      };
      reader.readAsText(file);
    });

    $('#reset-txt').addEventListener('input', function () { $('#reset').disabled = this.value !== 'RESET'; });
    $('#reset').addEventListener('click', function () {
      setData(Store.defaults(), 'Reset');
    });
  }

  function setData(d, verb) {
    ui.importPending = null;
    data = AT.data = d;
    save(); applyTheme();
    renderSettings();
    var msg = verb + '. You now have ' + plural(data.rounds.length, 'round') + '.';
    var box = $('#import-preview'); if (box) box.innerHTML = '<div class="notices"><p class="notice">' + esc(msg) + '</p></div>';
  }

  // ---------- account sync ----------

  var SYNC_LABEL = { syncing: 'Syncing…', synced: 'Synced', offline: 'Offline, will sync', error: 'Sync failed, retrying', choose: 'Sync paused' };
  var SIGNED_IN = { syncing: 1, synced: 1, offline: 1, error: 1 };
  var timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

  function syncInfo() { return AT.Sync ? AT.Sync.info() : { status: 'off' }; }
  function signedIn() { return !!SIGNED_IN[syncInfo().status]; }

  function accountHtml() {
    var info = syncInfo(), s = info.status;
    if (!AT.Sync.supported()) {
      return '<p class="sec-intro">Open the published site to sign in. Here, your progress is saved in this browser only.</p>';
    }
    if (s === 'off') return '<p class="sec-intro">Connecting…</p>';
    if (s === 'unavailable') return '<p class="sec-intro">Sign-in could not load. Check your connection and reload the page. Your progress is still saved in this browser.</p>';
    if (s === 'choose') {
      var a = info.adoption;
      return '<div class="notices"><p class="notice strong">This browser has ' + plural(a.local, 'round') + ' and your account has ' + plural(a.remote, 'round') +
        '. Add this browser’s rounds to your account?</p></div>' +
        '<div class="row"><button type="button" id="acct-merge" class="primary">Add them to my account</button>' +
        '<button type="button" id="acct-account">Use only my account’s rounds</button></div>' +
        '<p class="small mid">The second choice removes the ' + plural(a.local, 'round') + ' from this browser. Export them first if they are someone else’s.</p>';
    }
    if (s === 'signedOut') {
      return '<form id="acct-form" class="inline-form">' +
        '<label class="field grow" for="acct-email">Email<input type="email" id="acct-email" name="email" autocomplete="email" spellcheck="false" required placeholder="you@example.com…"></label>' +
        '<button type="submit" class="primary">Send sign-in link</button></form>' +
        '<p id="acct-msg" class="small" aria-live="polite">Optional. Sign in and your progress follows you to any device. No password: you get a link by email. ' +
        'See <a href="privacy.html">what is stored</a>.</p>';
    }
    return '<dl class="facts"><div><dt>Signed in as</dt><dd>' + esc(info.email || '') + '</dd></div>' +
      '<div><dt>Status</dt><dd>' + esc(SYNC_LABEL[s]) + '</dd></div>' +
      '<div><dt>Last synced</dt><dd>' + (info.lastSynced ? esc(timeFmt.format(info.lastSynced)) : 'Not yet') + '</dd></div></dl>' +
      (info.error && s === 'error' ? '<p class="err" aria-live="polite">' + esc(info.error) + '</p>' : '') +
      '<div class="row"><button type="button" id="acct-sync">Sync now</button><button type="button" id="acct-out">Sign out</button>' +
      '<button type="button" id="acct-delete" class="link">Delete my account</button></div>' +
      '<p id="acct-msg" class="small mid" aria-live="polite">Signing out keeps a copy in this browser.</p>';
  }

  function bindAccount() {
    var box = $('#account');
    if (!box) return;
    function msg(t) { var m = $('#acct-msg'); if (m) m.textContent = t; }
    var form = $('#acct-form');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#acct-email').value.trim(), btn = form.querySelector('button');
      btn.disabled = true;
      AT.Sync.signIn(email).then(function () {
        msg('Check your email for a sign-in link and open it in this browser.');
      }, function (err) {
        btn.disabled = false;
        msg('The link could not be sent: ' + (err && err.message ? err.message : 'unknown error') + '. Check the address and try again.');
      });
    });
    var on = function (id, fn) { var b = $(id); if (b) b.addEventListener('click', fn); };
    on('#acct-merge', function () { AT.Sync.adopt('merge'); });
    on('#acct-account', function () { AT.Sync.adopt('account'); });
    on('#acct-sync', function () { AT.Sync.syncNow(); });
    on('#acct-out', function () { AT.Sync.signOut(); });
    on('#acct-delete', function () {
      if (!confirm('Delete your account and every round stored in it? This browser keeps its copy.')) return;
      AT.Sync.deleteAccount().then(function () { announce('Account deleted.'); }, function (err) { msg('Could not delete the account: ' + (err && err.message) + '.'); });
    });
  }

  function onSyncChange() {
    var info = syncInfo(), el = document.getElementById('sync-status');
    el.hidden = !SYNC_LABEL[info.status];
    el.textContent = SYNC_LABEL[info.status] || '';
    var box = $('#account');
    // Don't redraw while someone is typing their email.
    if (box && !(document.activeElement && document.activeElement.id === 'acct-email')) { box.innerHTML = accountHtml(); bindAccount(); }
  }

  // Data that arrived from another device: store it and redraw, unless a round is being played.
  function replaceData(d) {
    data = AT.data = d;
    var box = document.getElementById('app-alert');
    box.hidden = Store.save(data);
    if (!box.hidden) box.textContent = 'Your last change could not be saved in this browser. Export your data in Settings to keep a copy.';
    applyTheme();
    if (!Game.active) route();
  }

  // ---------- init ----------

  function init(d) {
    data = d;
    main = document.getElementById('main');
    applyTheme();
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('help-btn').addEventListener('click', function () { setHelp(true); });
    document.getElementById('help-close').addEventListener('click', function () { setHelp(false); });
    // Skip link: focus the content without touching the hash router.
    document.getElementById('skip-link').addEventListener('click', function (e) { e.preventDefault(); main.focus(); });
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', onKey);
    route();
    if (AT.Sync) {
      AT.Sync.onChange(onSyncChange);
      AT.Sync.init({ getData: function () { return data; }, replaceData: replaceData });
    }
  }

  AT.UI = { init: init };
})();
