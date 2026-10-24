/*
 * progression.js — training steps P2 → P3 → P4, recommendation, and the text report for Claude.
 * Pure logic, no DOM.
 *
 * A session counts toward a step only if it has ≥ 3 rounds in that step's mode
 * (zetamac.com rounds entered manually count). A step is completed when 3 qualifying
 * sessions in a row have an average ≥ the threshold.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var node = typeof module !== 'undefined';
  var S = node ? require('./stats.js') : AT.Stats;
  var G = node ? require('./generator.js') : AT.Generator;

  var STEPS = [
    { id: 'P2', mode: 'P2', threshold: 18, desc: '×÷ (2–12)×(2–100), 60 s' },
    { id: 'P3', mode: 'P3', threshold: 25, desc: 'Normal + − × ÷, 60 s' },
    { id: 'P4', mode: 'NORMAL120', threshold: 60, desc: 'Normal + − × ÷, 120 s' }
  ];
  var MIN_ROUNDS = 3, IN_A_ROW = 3;

  var MODE_LABELS = {
    TABLES: 'Tables', WTABLES: 'Weighted tables', P2: 'P2', P3: 'P3', NORMAL120: 'Normal 120 s', DRILL: 'Drill',
    INTERVIEW: 'Interview', CUSTOM: 'Custom'
  };

  function qualifying(rounds, mode) {
    return S.sessionsForMode(rounds, mode).filter(function (s) { return s.scores.length >= MIN_ROUNDS; });
  }

  function stepProgress(rounds, step) {
    var q = qualifying(rounds, step.mode), run = 0, completed = false, completedAt = null;
    q.forEach(function (s) {
      if (s.stats.avg >= step.threshold) {
        run++;
        if (run >= IN_A_ROW && !completed) { completed = true; completedAt = s.number; }
      } else run = 0;
    });
    return { step: step, run: run, streak: Math.min(run, IN_A_ROW), completed: completed, completedAt: completedAt, qualifying: q };
  }

  // Current step = first not completed, unless overridden in Settings.
  function current(rounds, override) {
    var all = STEPS.map(function (st) { return stepProgress(rounds, st); });
    var idx = -1, allDone = false;
    if (override) idx = STEPS.map(function (s) { return s.id; }).indexOf(override);
    if (idx < 0) {
      for (var i = 0; i < all.length; i++) if (!all[i].completed) { idx = i; break; }
      if (idx < 0) { idx = all.length - 1; allDone = true; }
    }
    return { current: all[idx], all: all, allDone: allDone, overridden: idx >= 0 && !!override };
  }

  // Recommended mode for today: the current step's mode, with "warm-up first" if no Tables round today.
  function recommend(rounds, info, todayKey) {
    var warm = rounds.some(function (r) { var m = S.effMode(r); return (m === 'TABLES' || m === 'WTABLES') && S.dayKey(r.startedAt) === todayKey; });
    return { mode: info.current.step.mode, warmup: !warm };
  }

  function boxes(n) {
    var out = [];
    for (var i = 0; i < IN_A_ROW; i++) out.push(i < n ? '■' : '□');
    return out.join(' ');
  }

  function f1(x) { return x === null || x === undefined ? '–' : (Math.round(x * 10) / 10).toFixed(1); }

  function sec(ms) { return ms === null || ms === undefined ? '–' : (ms / 1000).toFixed(1); }
  function pct(x) { return x === null || x === undefined ? '–' : Math.round(x * 100) + '%'; }

  var REPORT_MODES = ['TABLES', 'WTABLES', 'P2', 'P3', 'NORMAL120', 'DRILL', 'INTERVIEW', 'CUSTOM'];
  var OP_SYM = { add: '+', sub: '−', mul: '×', div: '÷', iv: 'interview' };

  /*
   * Plain-text coaching report to paste into a chat. Self-explanatory: it states the rules
   * before the numbers. Each list is capped so the whole stays at a few hundred lines.
   */
  function summary(data, nowMs) {
    nowMs = nowMs || Date.now();
    var rounds = data.rounds, L = [];
    var today = S.dayKey(new Date(nowMs).toISOString());
    var ctx = { rounds: rounds, nowMs: nowMs, today: today, info: current(rounds, data.settings.stepOverride) };
    L.push('# Arithmetic Trainer report (' + today + ')');
    [rAbout, rOverview, rSteps, rSessions, rRoundIndex, rOps, rFacts, rGrid, rLatest, rFatigue].forEach(function (fn) {
      L.push('');
      fn(ctx, L);
    });
    return L.join('\n');
  }

  function rAbout(ctx, L) {
    L.push('## About this data');
    L.push('Mental-math trainer for Zetamac-style quant interview tests. Score = correct answers in the time limit.');
    L.push('Modes: Tables (× ÷ 2–12, 60 s), Weighted tables (same, slow facts come up more), ' +
      STEPS.map(function (s) { return s.id + ' (' + s.desc + ')'; }).join(', ') +
      ', Drill (weak facts), Interview (harder mixed questions, wrong answers penalised), Custom.');
    L.push('A session is one calendar day. Session numbers count days with any round.');
    L.push('Steps: a session qualifies with >= ' + MIN_ROUNDS + ' rounds of the step mode; the step is done after ' +
      IN_A_ROW + ' qualifying sessions in a row with average >= threshold.');
    L.push('Facts: weak = slow vs my own median for that operation (or often wrong, or > 4 s recently); ' +
      'improving = a good session since; mastered = 3 good sessions in a row.');
    L.push('Freeze = an answer taking > 3x the round median. Times are in seconds. * = round entered from zetamac.com (no per-question data).');
  }

  function rOverview(ctx, L) {
    var rs = ctx.rounds, days = S.sessionDays(rs), qs = 0, ext = 0;
    rs.forEach(function (r) {
      qs += (r.questions || []).filter(function (q) { return !q.unanswered; }).length;
      if (r.mode === 'EXTERNAL') ext++;
    });
    L.push('## Overview');
    if (!rs.length) { L.push('none yet'); return; }
    L.push('Rounds: ' + rs.length + ' (' + ext + ' from zetamac.com). Sessions: ' + days.length +
      ' (' + days[0] + ' to ' + days[days.length - 1] + '). Questions answered: ' + qs + '.');
    var rec = recommend(rs, ctx.info, ctx.today);
    L.push('Today is session ' + S.sessionNumber(rs, ctx.today) + '. Recommended: ' +
      (rec.warmup ? 'warm up with Tables, then ' : '') + MODE_LABELS[rec.mode] + '.');
  }

  function rSteps(ctx, L) {
    L.push('## Steps');
    ctx.info.all.forEach(function (p) {
      var st = p.step, ss = S.sessionsForMode(ctx.rounds, st.mode), tr = S.trend(ss, st.threshold);
      var line = st.id + (p === ctx.info.current ? ' (current' + (ctx.info.overridden ? ', set manually' : '') + ')' : '') +
        ': ' + st.desc + ', threshold ' + st.threshold + '. ';
      line += p.completed ? 'Done at session ' + p.completedAt + '. ' : 'Streak ' + boxes(p.streak) + ' ' + p.streak + ' of ' + IN_A_ROW + '. ';
      line += 'Qualifying sessions ' + p.qualifying.length + ', all sessions ' + ss.length + '.';
      if (tr.slope !== null) {
        line += ' Trend ' + (tr.slope >= 0 ? '+' : '') + tr.slope.toFixed(2) + ' per session' +
          (tr.sessionsToThreshold !== null ? ', about ' + tr.sessionsToThreshold + ' sessions to threshold' : '') + '.';
      }
      L.push(line);
    });
    var est = S.estimate120(ctx.rounds);
    if (est) L.push('Estimated 120 s score from P3: ' + f1(est.estimate) + (est.calibrated ? ' (calibrated x' + est.factor.toFixed(2) + ')' : ' (2x rule)') + '.');
    if (ctx.info.allDone) L.push('All steps complete.');
  }

  function rSessions(ctx, L) {
    L.push('## Every session per mode (last 30 each)');
    var any = false;
    REPORT_MODES.forEach(function (m) {
      var ss = S.sessionsForMode(ctx.rounds, m);
      if (!ss.length) return;
      any = true;
      L.push(MODE_LABELS[m] + ' (' + ss.length + (ss.length === 1 ? ' session' : ' sessions') + '):');
      ss.slice(-30).forEach(function (s) {
        var st = s.stats;
        L.push('  S' + s.number + ' ' + s.day + '  avg ' + f1(st.avg) + '  best ' + st.best + '  worst ' + st.worst + '  sd ' + f1(st.sd) +
          '  [' + s.rounds.map(function (r) { return r.score + (r.mode === 'EXTERNAL' ? '*' : ''); }).join(',') + ']');
      });
    });
    if (!any) L.push('none yet');
  }

  function rRoundIndex(ctx, L) {
    L.push('## Average score by round number within a session');
    var any = false;
    REPORT_MODES.forEach(function (m) {
      var b = S.roundIndexAverages(ctx.rounds, m).slice(0, 12);
      if (b.length < 2) return;
      any = true;
      L.push('  ' + MODE_LABELS[m] + ': ' + b.map(function (x, i) { return 'R' + (i + 1) + ' ' + f1(x.avg) + ' (n' + x.n + ')'; }).join(', '));
    });
    if (!any) L.push('none yet');
  }

  function rOps(ctx, L) {
    L.push('## Speed and accuracy per operation');
    var t = S.timeByOp(ctx.rounds), nums = {};
    ['add', 'sub', 'mul', 'div'].forEach(function (op) { t[op].forEach(function (x) { nums[x.number] = 1; }); });
    var sess = Object.keys(nums).map(Number).sort(function (a, b) { return a - b; }).slice(-10);
    if (!sess.length) L.push('Mean answer time: none yet');
    else {
      L.push('Mean answer time (s) per session, last 10 sessions with question data:');
      ['add', 'sub', 'mul', 'div'].forEach(function (op) {
        if (!t[op].length) return;
        L.push('  ' + OP_SYM[op] + ': ' + sess.map(function (n) {
          var x = t[op].filter(function (y) { return y.number === n; })[0];
          return 'S' + n + ' ' + (x ? sec(x.ms) : '–');
        }).join(', '));
      });
    }
    var days = S.sessionDays(ctx.rounds).slice(-5);
    var recent = ctx.rounds.filter(function (r) { return days.indexOf(S.dayKey(r.startedAt)) >= 0; });
    function rate(rs) {
      var wr = S.wrongRateByOp(rs), ks = Object.keys(wr);
      return ks.length ? ks.map(function (op) { return OP_SYM[op] + ' ' + pct(wr[op].rate) + ' of ' + wr[op].n; }).join(', ') : 'no per-question data';
    }
    L.push('Questions with a wrong attempt, last 5 sessions: ' + rate(recent));
    L.push('Questions with a wrong attempt, all time: ' + rate(ctx.rounds));
  }

  function rFacts(ctx, L) {
    var stats = S.factStats(ctx.rounds, ctx.nowMs), count = { weak: 0, improving: 0, mastered: 0, ok: 0 };
    stats.forEach(function (f) { count[f.status]++; });
    L.push('## Facts');
    L.push('Tracked: ' + stats.length + '. Weak ' + count.weak + ', improving ' + count.improving + ', mastered ' + count.mastered + ', fine ' + count.ok + '.');
    var targets = S.drillTargets(stats).slice(0, 25);
    L.push('Top drill targets (attempts | median s | last 5 times s | wrong | trend | status):');
    if (!targets.length) L.push('  none yet');
    targets.forEach(function (f) {
      L.push('  ' + G.keyLabel(f.key) + ' | ' + f.attempts + ' | ' + sec(f.medianTime) + ' | ' + f.last5.map(sec).join(' ') +
        ' | ' + pct(f.wrongRate) + ' | ' + (f.trend || 'too few') + ' | ' + f.status);
    });
    var mastered = stats.filter(function (f) { return f.status === 'mastered'; })
      .sort(function (a, b) { return a.lastSeen < b.lastSeen ? 1 : -1; }).slice(0, 15);
    L.push('Recently mastered: ' + (mastered.length ? mastered.map(function (f) { return G.keyLabel(f.key); }).join('; ') : 'none yet'));
  }

  function rGrid(ctx, L) {
    var cells = S.tableCells(ctx.rounds, ctx.nowMs);
    function slowest(op, name) {
      return Object.keys(cells[op]).sort(function (a, b) { return cells[op][b].medianTime - cells[op][a].medianTime; }).slice(0, 12).map(function (k) {
        var c = cells[op][k];
        return name(k) + ' ' + sec(c.medianTime) + ' s' + (c.wrongRate ? ' ' + pct(c.wrongRate) + ' wrong' : '') + ' (n' + c.attempts + ')';
      });
    }
    var mul = slowest('mul', function (k) { return k.replace('x', '×'); });
    var div = slowest('div', function (k) { var p = k.split('/'); return p[0] * p[1] + '÷' + p[0]; });
    L.push('## Tables grid 2–12');
    L.push('Seen: ' + Object.keys(cells.mul).length + ' of 66 multiplication cells, ' + Object.keys(cells.div).length + ' of 121 division cells.');
    L.push('Slowest ×: ' + (mul.length ? mul.join(', ') : 'none yet'));
    L.push('Slowest ÷: ' + (div.length ? div.join(', ') : 'none yet'));
  }

  function rLatest(ctx, L) {
    var days = S.sessionDays(ctx.rounds);
    L.push('## Latest session in detail');
    if (!days.length) { L.push('none yet'); return; }
    var rep = S.sessionReport(ctx.rounds, days[days.length - 1]);
    L.push('Session ' + rep.number + ' (' + rep.day + '): ' + rep.rounds + ' rounds, ' + rep.questions + ' questions. Median answer ' +
      sec(rep.median) + ' s (usual ' + sec(rep.usualMedian) + '). Wrong ' + pct(rep.wrong) + ' (usual ' + pct(rep.usualWrong) + ').');
    rep.scores.forEach(function (s) {
      L.push('  ' + MODE_LABELS[s.mode] + ': [' + s.scores.join(',') + '] avg ' + f1(s.stats.avg) + ', previous 7-session avg ' + f1(s.prevAvg) +
        (s.threshold ? ', threshold ' + s.threshold : '') + (s.fatigue ? ', fatigue detected' : '') + '.');
    });
    rep.pace.forEach(function (p) {
      L.push('  Pace ' + MODE_LABELS[p.mode] + ' by thirds of the clock: ' + p.thirds.map(function (t, i) {
        return (i + 1) + ': ' + f1(t.answers) + ' answers, median ' + sec(t.median) + ' s';
      }).join('; ') + (p.change !== null ? ' (last vs first third ' + (p.change >= 0 ? '+' : '') + Math.round(p.change * 100) + '%)' : '') + '.');
    });
    rep.ops.forEach(function (o) {
      L.push('  ' + OP_SYM[o.op] + ' today: ' + o.n + ' q, median ' + sec(o.median) + ' s, wrong ' + pct(o.wrong) +
        '; before: ' + o.usualN + ' q, median ' + sec(o.usualMedian) + ' s, wrong ' + pct(o.usualWrong) + '.');
    });
    if (rep.mistakes.length) L.push('  Mistakes and freezes:');
    rep.mistakes.slice(0, 10).forEach(function (e) {
      L.push('    ' + e.q.shown + ' = ' + (e.q.answerText || e.q.answer) + ': seen ' + e.seen + ', wrong ' + e.wrong +
        ', freezes ' + e.freezes + ', slowest ' + sec(e.slowest) + ' s. ' + e.advice);
    });
    function moved(xs) { return xs.map(function (x) { return x.label + ' ' + sec(x.before) + ' → ' + sec(x.today) + ' s'; }).join('; '); }
    if (rep.faster.length) L.push('  Faster than before: ' + moved(rep.faster));
    if (rep.slower.length) L.push('  Slower than before: ' + moved(rep.slower));
  }

  function rFatigue(ctx, L) {
    var notes = fatigueNotes(ctx.rounds, 1000);
    L.push('## Fatigue (last 3 rounds all >= 15% below the first 3)');
    if (!notes.length) L.push('none yet');
    notes.slice(-15).forEach(function (n) { L.push('  ' + n); });
  }

  // "Session 12, P2: last 3 rounds 14, 15, 14 vs first-3 avg 18.0" for the last `n` sessions.
  function fatigueNotes(rounds, n) {
    var days = S.sessionDays(rounds).slice(-n), notes = [];
    Object.keys(MODE_LABELS).forEach(function (m) {
      S.sessionsForMode(rounds, m).forEach(function (s) {
        if (days.indexOf(s.day) < 0) return;
        var f = S.fatigue(s.scores);
        if (f) notes.push('Session ' + s.number + ', ' + MODE_LABELS[m] + ': last 3 rounds ' + f.last.join(', ') + ' vs first-3 avg ' + f1(f.base));
      });
    });
    return notes;
  }

  var api = {
    STEPS: STEPS, MODE_LABELS: MODE_LABELS, qualifying: qualifying, stepProgress: stepProgress,
    current: current, recommend: recommend, boxes: boxes, summary: summary, fatigueNotes: fatigueNotes, f1: f1
  };
  AT.Progression = api;
  if (node) module.exports = api;
})();
