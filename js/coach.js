/*
 * coach.js — Road to 60: per-category stats, the estimated 120 s score, lost time, today's session plan,
 * milestones and the 60 gate. Pure logic, no DOM; questions are classified by G.classify.
 *
 * Category medians come from Normal-format rounds only (Foundations, Speed, Normal 120 s; coach or not, extra included):
 * the last 3 days with such rounds, widened day by day up to 10 until a category has 15 answers. Fewer than 15 even
 * then: the target stands in and the category is flagged. Complements (not in Normal) come from the complement drill.
 *
 * A coach session is a calendar day with rounds tagged `coach`. It is complete once its benchmark block has all its
 * rounds. "In a row" counts complete sessions only: an incomplete one neither counts nor breaks a streak.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var node = typeof module !== 'undefined';
  var G = node ? require('./generator.js') : AT.Generator;
  var S = node ? require('./stats.js') : AT.Stats;

  // Target median per category, in ms. mul-big-N and div-big-N share one target per family.
  var TARGETS = {
    'add-nocarry': 1400, 'sub-noborrow': 1400, 'add-carry': 1800, 'sub-borrow': 1900, 'sub-cross100': 2000,
    'mul-table': 1000, 'div-table': 1000, 'mul-big': 2400, 'div-big': 2200, 'comp-100': 1200, 'comp-ten': 1200
  };
  var NORMAL_MODES = { P2: 1, P3: 1, NORMAL120: 1 };
  var MIN_N = 15, BASE_DAYS = 3, MAX_DAYS = 10;
  var COMP_SLOW = 1200;
  var MILESTONES = [40, 45, 50, 55, 60], GATE = 60, GATE_RUN = 3, MILESTONE_RUN = 2, TEST_EVERY = 7, MASTER_RUN = 3;

  function family(key) { return key.replace(/-\d+$/, ''); }
  function target(key) { return TARGETS[key] || TARGETS[family(key)] || null; }

  // Readable names: "sub-borrow" → "− with borrow", "mul-big-7" → "× 7, big".
  var NAMES = {
    'add-nocarry': '+ no carry', 'add-carry': '+ with carry', 'sub-noborrow': '− no borrow', 'sub-borrow': '− with borrow',
    'sub-cross100': '− from 100 or more', 'mul-table': '× tables', 'div-table': '÷ tables', 'comp-100': 'Complements to 100', 'comp-ten': 'To the next ten'
  };
  function catName(key) {
    if (NAMES[key]) return NAMES[key];
    var m = /^(mul|div)-big-(\d+)$/.exec(key);
    return m ? (m[1] === 'mul' ? '× ' : '÷ ') + m[2] + ', other factor over 12' : key;
  }

  function isNormal(r) { return NORMAL_MODES[S.effMode(r)] && r.questions && r.questions.length; }
  function isDrill(r, drill) { return r.mode === 'R60' && r.settings && (!drill || r.settings.drill === drill) && r.questions && r.questions.length; }
  function answered(q) { return !q.unanswered && !q.skipped && q.timeMs > 0; }

  /*
   * Per category: { key, n, median, wrong, days, flagged, used } where used = median, or the target when flagged.
   * `opts.before` (a day key) keeps only earlier days; `opts.upTo` keeps days up to and including it.
   * `opts.filter` picks the rounds (default: Normal-format).
   */
  function categoryStats(rounds, opts) {
    opts = opts || {};
    var filter = opts.filter || isNormal, byDay = {}, days = [];
    rounds.forEach(function (r) {
      if (!filter(r)) return;
      var d = S.dayKey(r.startedAt);
      if (opts.before && d >= opts.before) return;
      if (opts.upTo && d > opts.upTo) return;
      if (!byDay[d]) { byDay[d] = {}; days.push(d); }
      r.questions.forEach(function (q) {
        if (!answered(q)) return;
        var k = G.classify(q);
        if (!k) return;
        (byDay[d][k] = byDay[d][k] || []).push(q);
      });
    });
    days.sort();
    var keys = {};
    days.forEach(function (d) { Object.keys(byDay[d]).forEach(function (k) { keys[k] = 1; }); });
    var out = {};
    Object.keys(keys).forEach(function (k) {
      var qs = [], used = 0;
      for (var i = days.length - 1; i >= 0 && used < MAX_DAYS; i--) {
        qs = qs.concat(byDay[days[i]][k] || []);
        used++;
        if (used >= BASE_DAYS && qs.length >= MIN_N) break;
      }
      var med = S.median(qs.map(function (q) { return q.timeMs; }));
      var flagged = qs.length < MIN_N;
      out[k] = {
        key: k, n: qs.length, median: med, days: used, flagged: flagged, target: target(k),
        wrong: qs.length ? qs.filter(function (q) { return q.wrongAttempts > 0; }).length / qs.length : null,
        used: flagged ? target(k) : med
      };
    });
    return out;
  }

  // Share of each category in Normal mode: the real generator, 20,000 questions, fixed seed. Computed once.
  var freqCache = null;
  function frequencies() {
    if (freqCache) return freqCache;
    var gen = G.makeGenerator(G.modeSettings('NORMAL120'), G.mulberry32(12345)), count = {}, N = 20000;
    for (var i = 0; i < N; i++) { var k = G.classify(gen.next()); count[k] = (count[k] || 0) + 1; }
    freqCache = {};
    Object.keys(count).forEach(function (k) { freqCache[k] = count[k] / N; });
    return freqCache;
  }

  /*
   * Estimated 120 s score from category medians (the target where data is thin), and lost time per category:
   * { perQ (ms), score, lost: [{ key, freq, median, used, target, flagged, n, lostMs, points }] } sorted by lost time.
   * points = the score with that one category at target, minus the score now.
   */
  function estimate(stats) {
    var f = frequencies(), perQ = 0, rows = [];
    Object.keys(f).forEach(function (k) {
      var s = stats[k], t = target(k), used = s ? s.used : t;
      perQ += f[k] * used;
      rows.push({ key: k, freq: f[k], median: s ? s.median : null, used: used, target: t, flagged: !s || s.flagged, n: s ? s.n : 0,
        wrong: s ? s.wrong : null, lostMs: f[k] * Math.max(0, used - t) });
    });
    var exact = 120000 / perQ;
    rows.forEach(function (r) { r.points = r.lostMs > 0 ? 120000 / (perQ - r.lostMs) - exact : 0; });
    rows.sort(function (a, b) { return b.lostMs - a.lostMs || a.key.localeCompare(b.key); });
    return { perQ: perQ, score: Math.floor(exact), exact: exact, lost: rows };
  }

  // Category → the drill that trains it, or null.
  function drillFor(key) {
    if (key === 'add-carry') return { drill: 'carry' };
    if (key === 'sub-borrow') return { drill: 'borrow' };
    if (key === 'sub-cross100') return { drill: 'cross' };
    if (key === 'comp-100' || key === 'comp-ten') return { drill: 'comp' };
    var m = /^(?:mul|div)-big-(\d+)$/.exec(key);
    return m ? { drill: 'mult', n: +m[1] } : null;
  }
  function drillId(d) { return d.drill + (d.n ? '-' + d.n : ''); }

  // ---------- coach sessions ----------

  // Coach days, oldest first: [{ day, n (1-based), test, byBlock: {block: [rounds]}, complete, bench: [scores], avg }].
  function sessions(rounds) {
    var by = {}, days = [];
    rounds.forEach(function (r) {
      if (!r.coach) return;
      var d = S.dayKey(r.startedAt);
      if (!by[d]) { by[d] = { day: d, test: !!r.coach.test, byBlock: {} }; days.push(d); }
      (by[d].byBlock[r.coach.block] = by[d].byBlock[r.coach.block] || []).push(r);
    });
    days.sort();
    return days.map(function (d, i) {
      var s = by[d], bench = (s.byBlock[6] || []).slice().sort(function (a, b) { return a.startedAt < b.startedAt ? -1 : 1; });
      s.n = i + 1;
      s.bench = bench.map(function (r) { return r.score; });
      s.complete = bench.length >= (s.test ? 4 : 2);
      s.avg = s.complete ? S.mean(s.bench.slice(0, s.test ? 4 : 2)) : null;
      return s;
    });
  }

  function completeSessions(rounds) { return sessions(rounds).filter(function (s) { return s.complete; }); }

  // Mastered categories: windowed median (not flagged) at or under target at the end of 3 complete sessions in a row.
  // { key: day mastered }. Once mastered, it stays mastered.
  function mastered(rounds) {
    var done = completeSessions(rounds), run = {}, out = {};
    done.forEach(function (s) {
      var st = categoryStats(rounds, { upTo: s.day });
      Object.keys(st).forEach(function (k) {
        var x = st[k], ok = !x.flagged && x.median <= x.target;
        run[k] = ok ? (run[k] || 0) + 1 : 0;
        if (run[k] >= MASTER_RUN && !out[k]) out[k] = s.day;
      });
    });
    return out;
  }

  function warmMode(rounds) { return S.tableCoverage(S.tableCells(rounds)).ready ? 'WTABLES' : 'TABLES'; }

  /*
   * Focus picks for a day, from data before that day (so they hold all day): the top categories by lost time
   * (then by median ÷ target) that map to a drill and are not mastered, one per drill. Complements replace
   * Focus B while their median is over 1.2 s or they were never trained.
   */
  function focusPicks(rounds, day) {
    var st = categoryStats(rounds, { before: day }), est = estimate(st), master = mastered(rounds.filter(function (r) { return S.dayKey(r.startedAt) < day; }));
    var ranked = est.lost.filter(function (r) { return drillFor(r.key) && !master[r.key]; }).slice();
    ranked.sort(function (a, b) { return b.lostMs - a.lostMs || (b.used / b.target) - (a.used / a.target) || a.key.localeCompare(b.key); });
    var picks = [], seen = {};
    ranked.forEach(function (r) {
      var d = drillFor(r.key), id = drillId(d);
      if (picks.length < 2 && !seen[id]) { seen[id] = 1; picks.push({ drill: d.drill, n: d.n, key: r.key }); }
    });
    var comp = categoryStats(rounds, { before: day, filter: function (r) { return isDrill(r, 'comp'); } })['comp-100'];
    var compSlow = !comp || comp.median === null || comp.median > COMP_SLOW;
    if (compSlow) picks = picks.slice(0, 1).concat([{ drill: 'comp', key: 'comp-100', reason: comp ? 'slow' : 'new' }]);
    return picks;
  }

  /*
   * Today's plan: { day, n, test, blocks: [{ block, name, mode | drill, n, rounds, done, key }], next, done, focus }.
   * Progress comes from today's coach rounds, so a reload resumes where you were.
   */
  function plan(rounds, day) {
    var all = sessions(rounds), today = all.filter(function (s) { return s.day === day; })[0];
    var n = today ? today.n : all.filter(function (s) { return s.day < day; }).length + 1;
    var test = today ? today.test : n % TEST_EVERY === 0;
    var picks = focusPicks(rounds, day), wm = warmMode(rounds.filter(function (r) { return S.dayKey(r.startedAt) < day; }));
    var blocks = [
      { block: 1, name: 'Warm-up', mode: wm, rounds: 1 },
      { block: 2, name: 'Warm-up', mode: 'P2', rounds: 2 }
    ];
    if (test) blocks.push({ block: 6, name: 'Test day benchmark', mode: 'NORMAL120', rounds: 4 });
    else {
      [3, 4].forEach(function (b, i) {
        var p = picks[i];
        if (p) blocks.push({ block: b, name: 'Focus ' + (i ? 'B' : 'A'), drill: p.drill, n: p.n, key: p.key, rounds: 3 });
      });
      blocks.push({ block: 5, name: 'Main', mode: 'P3', rounds: 4 });
      blocks.push({ block: 6, name: 'Benchmark', mode: 'NORMAL120', rounds: 2 });
    }
    blocks.forEach(function (b) { b.done = today && today.byBlock[b.block] ? today.byBlock[b.block].length : 0; });
    var next = null;
    for (var i = 0; i < blocks.length; i++) if (blocks[i].done < blocks[i].rounds) { next = blocks[i]; break; }
    return { day: day, n: n, test: test, blocks: blocks, next: next, done: !next, started: !!today };
  }

  function blockLabel(b) {
    return b.name + ': ' + (b.drill ? G.drillLabel(b.drill, b.n) : modeName(b.mode));
  }
  var MODE_NAMES = { TABLES: 'Tables', WTABLES: 'Weighted tables', P2: 'Foundations', P3: 'Speed (Normal 60 s)', NORMAL120: 'Normal 120 s' };
  function modeName(m) { return MODE_NAMES[m] || m; }

  // ---------- milestones and the gate ----------

  // Milestones reached (2 complete sessions in a row at or above) and the gate (3 in a row at 60 or more).
  function progress(rounds) {
    var done = completeSessions(rounds), avgs = done.map(function (s) { return s.avg; });
    var reached = MILESTONES.map(function (m) {
      for (var i = 1; i < avgs.length; i++) if (avgs[i - 1] >= m && avgs[i] >= m) return { m: m, day: done[i].day };
      return { m: m, day: null };
    });
    var run = 0, passed = null;
    avgs.forEach(function (a, i) { run = a >= GATE ? run + 1 : 0; if (run >= GATE_RUN && !passed) passed = done[i].day; });
    var next = reached.filter(function (x) { return !x.day; })[0] || null;
    var towards = 0;
    if (next) for (var j = avgs.length - 1; j >= 0 && avgs[j] >= next.m; j--) towards++;
    return { sessions: done, milestones: reached, next: next, towards: towards, gateRun: Math.min(run, GATE_RUN), gatePassed: passed };
  }

  // Time of day from a timestamp: morning 05–12, afternoon 12–18, evening 18–23, late 23–05.
  function timeOfDay(iso) {
    var h = new Date(iso).getHours();
    return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : h >= 18 && h < 23 ? 'evening' : 'late';
  }
  var TIMES = ['morning', 'afternoon', 'evening', 'late'];

  // Benchmark rounds (block 6 of complete sessions) by time of day: [{ tod, n, avg }].
  function benchByTime(rounds) {
    var by = {};
    completeSessions(rounds).forEach(function (s) {
      (s.byBlock[6] || []).forEach(function (r) { (by[timeOfDay(r.startedAt)] = by[timeOfDay(r.startedAt)] || []).push(r.score); });
    });
    return TIMES.map(function (t) { return { tod: t, n: (by[t] || []).length, avg: S.mean(by[t] || []) }; });
  }

  // Average Speed (P3) score by round index within a day, rounds 1–10.
  function warmupCurve(rounds) { return S.roundIndexAverages(rounds, 'P3').slice(0, 10); }

  // Rounds finished after today's session is complete count as extra. The benchmark is the last block, so its
  // being full means the day's session is done.
  function isExtraNow(rounds, day) { return sessions(rounds).some(function (s) { return s.day === day && s.complete; }); }

  var api = {
    TARGETS: TARGETS, MILESTONES: MILESTONES, GATE: GATE, MIN_N: MIN_N, COMP_SLOW: COMP_SLOW, TIMES: TIMES,
    target: target, catName: catName, categoryStats: categoryStats, frequencies: frequencies, estimate: estimate,
    drillFor: drillFor, sessions: sessions, completeSessions: completeSessions, mastered: mastered, focusPicks: focusPicks,
    plan: plan, blockLabel: blockLabel, modeName: modeName, progress: progress, timeOfDay: timeOfDay, benchByTime: benchByTime,
    warmupCurve: warmupCurve, isExtraNow: isExtraNow, isDrill: isDrill, isNormal: isNormal
  };
  AT.Coach = api;
  if (node) module.exports = api;
})();
