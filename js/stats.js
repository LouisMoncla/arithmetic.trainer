/*
 * stats.js — sessions, averages, trends, per-fact stats and weak-fact scoring.
 * Pure logic, no DOM.
 *
 * A session = all rounds played on the same day, which runs from 05:00 to 05:00 local (dayKey).
 * Session numbers are global (Session 1 = first day with any round).
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var G = typeof module !== 'undefined' ? require('./generator.js') : AT.Generator;

  var DAY = 86400000;
  // Zetamac operations. Interview ("iv") and trick ("tr") questions are left out of speed comparisons.
  var ZETAMAC_OP = { add: 1, sub: 1, mul: 1, div: 1 };

  // ---------- basic numbers ----------

  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function mean(a) { return a.length ? sum(a) / a.length : null; }
  function median(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function stdev(a) {
    if (a.length < 2) return 0;
    var m = mean(a);
    return Math.sqrt(sum(a.map(function (x) { return (x - m) * (x - m); })) / (a.length - 1));
  }
  // Median where each value has a weight (used for time decay).
  function weightedMedian(vals, ws) {
    if (!vals.length) return null;
    var idx = vals.map(function (_, i) { return i; }).sort(function (i, j) { return vals[i] - vals[j]; });
    var half = sum(ws) / 2, acc = 0;
    for (var k = 0; k < idx.length; k++) {
      acc += ws[idx[k]];
      if (acc > half + 1e-9) return vals[idx[k]];
      if (Math.abs(acc - half) <= 1e-9) return (vals[idx[k]] + vals[idx[k + 1]]) / 2;
    }
    return vals[idx[idx.length - 1]];
  }
  // Least-squares slope of ys against xs (default 0..n-1), or null.
  function slope(ys, xs) { var f = fit(ys, xs); return f ? f.slope : null; }

  // Least-squares line: { slope, intercept, se (standard error of the slope; null under 3 points), at(x) }, or null.
  function fit(ys, xs) {
    var n = ys.length, i;
    xs = xs || ys.map(function (_, k) { return k; });
    if (n < 2) return null;
    var mx = mean(xs), my = mean(ys), num = 0, den = 0;
    for (i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
    if (!den) return null;
    var b = num / den, a = my - b * mx, ss = 0;
    for (i = 0; i < n; i++) ss += Math.pow(ys[i] - (a + b * xs[i]), 2);
    return { slope: b, intercept: a, se: n > 2 ? Math.sqrt(ss / (n - 2) / den) : null, at: function (x) { return a + b * x; } };
  }

  // ---------- sessions ----------

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // A day (session) runs from 05:00 to 05:00 local: a round at 00:30 belongs to the evening before.
  var DAY_START_HOUR = 5;
  function dayKey(iso) {
    var d = new Date(iso);
    if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);   // by the clock, so a DST night stays right
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // External (zetamac.com) rounds count as the mode they were linked to.
  // The mode a round counts as. A Learn round counts per lesson ("LEARN-x11", "LEARN-fractions"), so ranks and "usual" compare like with like.
  function effMode(r) {
    if (r.mode === 'EXTERNAL') return r.linkedMode;
    if (r.mode === 'LEARN') return 'LEARN-' + (r.settings.lesson || (r.settings.types || [])[0]);   // lesson: 'fractions' (fd + df)
    if (r.mode === 'MATRIX') return matrixMode(r.settings);
    if (r.mode === 'FINANCE') return financeMode(r.settings);
    if (r.mode === 'R60') {   // Road to 60 drills: R60-borrow, R60-mult-7, R60-mult-12-8-6, R60-acc
      var n = r.settings && r.settings.n;
      return 'R60-' + ((r.settings && r.settings.drill) || 'drill') + (n ? '-' + [].concat(n).join('-') : '');
    }
    return r.mode;
  }
  // Finance rounds count per kind, and sprints per length: "FINANCE-sprint-120", "FINANCE-practice".
  function financeMode(s) {
    s = s || {};
    var kind = ['practice', 'intuition', 'mixed'].indexOf(s.kind) >= 0 ? s.kind : 'sprint';
    return 'FINANCE-' + kind + (kind === 'sprint' ? '-' + (s.duration || 120) : '');
  }

  /*
   * Finance tab: per template and per category, attempts, first-try accuracy and median time, from every
   * FINANCE round (sprints and practice alike). A question counts as right when answered right on the first
   * try; skipped and paused-to-learn count as wrong; unanswered (time ran out) does not count, unless you paused on it. 
ef = my median time per
   * family, so slowness compares a template with its own kind (reading a concept question takes longer).
   */
  function financeStats(rounds) {
    var tpl = {}, cat = {}, fam = {}, sprints = [], n = 0, right = 0;
    rounds.forEach(function (r) {
      if (r.mode !== 'FINANCE') return;
      if (!r.settings || !r.settings.kind || r.settings.kind === 'sprint') sprints.push({ startedAt: r.startedAt, score: r.score, duration: (r.settings && r.settings.duration) || 120 });
      (r.questions || []).forEach(function (q) {
        if (q.op !== 'fin' || (q.unanswered && !q.learned)) return;   // cut off by the clock: no answer, unless you paused to learn it
        var ok = !!q.correct && !q.wrongAttempts && !q.skipped;
        [[tpl, q.tpl], [cat, q.cat], [fam, q.fam]].forEach(function (p) {
          var e = p[0][p[1]] = p[0][p[1]] || { n: 0, right: 0, times: [], fam: q.fam, cat: q.cat };
          e.n++; if (ok) e.right++;
          if (!q.skipped && q.timeMs > 0) e.times.push(q.timeMs);
        });
        n++; if (ok) right++;
      });
    });
    [tpl, cat, fam].forEach(function (m) {
      Object.keys(m).forEach(function (k) { var e = m[k]; e.acc = e.right / e.n; e.med = median(e.times); delete e.times; });
    });
    var ref = {};
    Object.keys(fam).forEach(function (k) { ref[k] = fam[k].med; });
    return { tpl: tpl, cat: cat, fam: fam, ref: ref, sprints: sprints, n: n, right: right, acc: n ? right / n : null };
  }

  // A matrix round counts per entry range and length, e.g. "MATRIX-m9_9-60" (−9 to 9, 60 s; "m" = minus).
  function matrixMode(s) {
    var r = G.matrixRange(s), n = function (x) { return x < 0 ? 'm' + (-x) : String(x); };
    return 'MATRIX-' + n(r.lo) + '_' + n(r.hi) + '-' + ((s && s.duration) || 60);
  }

  function sessionDays(rounds) {
    var seen = {}, days = [];
    rounds.forEach(function (r) { var k = dayKey(r.startedAt); if (!seen[k]) { seen[k] = 1; days.push(k); } });
    return days.sort();
  }

  // Session number for a day key (1-based), or the next number if the day has no rounds yet.
  function sessionNumber(rounds, key) {
    var days = sessionDays(rounds), i = days.indexOf(key);
    return i >= 0 ? i + 1 : days.filter(function (d) { return d < key; }).length + 1;
  }

  // ---------- one definition per idea ----------

  // Wrong: a wrong attempt, or (where they exist) a wrong final answer or a skip. Every stat that counts mistakes uses this.
  function isWrong(q) { return q.wrongAttempts > 0 || q.correct === false || !!q.skipped; }

  // A day key moved by n days (local noon, so DST never shifts it).
  function shiftDay(key, n) {
    var p = key.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2] + n, 12);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // Calendar days from day key a to day key b (b later: positive).
  function dayDiff(a, b) {
    var p = a.split('-').map(Number), q = b.split('-').map(Number);
    return Math.round((new Date(q[0], q[1] - 1, q[2], 12) - new Date(p[0], p[1] - 1, p[2], 12)) / DAY);
  }
  // The last 7 calendar days (today included) and the 7 before: { now: [keys], before: [keys] }, oldest first.
  function weekWindows(today) {
    var now = [], before = [];
    for (var i = 13; i >= 0; i--) (i <= 6 ? now : before).push(shiftDay(today, -i));
    return { now: now, before: before };
  }
  // Up / down / flat against the window before: beyond ±eps (default 0.5) is a move. dir null when either side is empty.
  function arrow(now, before, eps) {
    eps = eps === undefined ? 0.5 : eps;
    if (now === null || now === undefined || before === null || before === undefined) return { diff: null, dir: null };
    var d = now - before;
    return { diff: d, dir: d > eps ? 'up' : d < -eps ? 'down' : 'flat' };
  }
  // Accuracy: 1 − share of answered questions with a wrong attempt (isWrong). null with no answered question.
  function accuracy(rounds) {
    var n = 0, w = 0;
    rounds.forEach(function (r) {
      (r.questions || []).forEach(function (q) { if (q.unanswered) return; n++; if (isWrong(q)) w++; });
    });
    return n ? 1 - w / n : null;
  }
  // The last n days (default 28), oldest first: [{ day, played }]; played = any round that day.
  function activity(rounds, today, n) {
    n = n || 28;
    var played = {}, out = [];
    rounds.forEach(function (r) { played[dayKey(r.startedAt)] = 1; });
    for (var i = n - 1; i >= 0; i--) { var k = shiftDay(today, -i); out.push({ day: k, played: !!played[k] }); }
    return out;
  }
  // Days in a row with a round, ending today, or yesterday while today has none yet.
  function streak(rounds, today) {
    var played = {};
    rounds.forEach(function (r) { played[dayKey(r.startedAt)] = 1; });
    var k = played[today] ? today : shiftDay(today, -1), n = 0;
    while (played[k]) { n++; k = shiftDay(k, -1); }
    return n;
  }
  // Median answer time per + − × ÷ over every answer on the given days: { add: ms | null, … }.
  function opMedians(rounds, days) {
    var by = { add: [], sub: [], mul: [], div: [] };
    rounds.forEach(function (r) {
      if (days.indexOf(dayKey(r.startedAt)) < 0) return;
      (r.questions || []).forEach(function (q) { if (!q.unanswered && by[q.op]) by[q.op].push(q.timeMs); });
    });
    var out = {};
    for (var op in by) out[op] = median(by[op]);
    return out;
  }

  function summarize(scores) {
    if (!scores.length) return { count: 0, avg: null, best: null, worst: null, sd: 0, first: null };
    return {
      count: scores.length, avg: mean(scores), best: Math.max.apply(null, scores),
      worst: Math.min.apply(null, scores), sd: stdev(scores), first: scores[0]
    };
  }

  // [{number, day, rounds, scores, stats}] for one mode, oldest first.
  function sessionsForMode(rounds, mode) {
    var days = sessionDays(rounds), by = {};
    rounds.forEach(function (r) {
      if (effMode(r) !== mode) return;
      var k = dayKey(r.startedAt);
      (by[k] = by[k] || []).push(r);
    });
    return days.filter(function (d) { return by[d]; }).map(function (d) {
      var rs = by[d].slice().sort(function (a, b) { return a.startedAt < b.startedAt ? -1 : 1; });
      var scores = rs.map(function (r) { return r.score; });
      return { number: days.indexOf(d) + 1, day: d, rounds: rs, scores: scores, stats: summarize(scores) };
    });
  }

  // Mean of the last `n` session averages for a mode, ignoring one round (the one just played).
  function recentAverage(rounds, mode, n, excludeId) {
    var rs = rounds.filter(function (r) { return r.id !== excludeId; });
    var ss = sessionsForMode(rs, mode).slice(-n);
    return mean(ss.map(function (s) { return s.stats.avg; }));
  }

  /*
   * Trend of a mode's day averages, regressed on the session number (the chart's x: days with data), per session.
   * Window: sessions numbered within the last 14 of `latest` (the latest session number overall; default the last
   * one given). It needs 4 sessions spanning at least 7 days (first to last, inclusive), else ok = false and no slope.
   * Projection to `threshold` (only when ok): 'reached' when the fitted line at the last session is there;
   * 'plateau' when the slope is ≤ 0.2 per session, slope − 1 SE ≤ 0, or the slow end needs over 90 sessions;
   * otherwise a range { low, high } in sessions from slope + 1 SE and slope − 1 SE.
   * { ok, n, slope, se, first, last, projection: null | { state: 'reached' | 'plateau' | 'range', low?, high? } }.
   */
  var TREND_DAYS = 14, TREND_MIN = 4, TREND_SPAN = 7, TREND_FLAT = 0.2, TREND_MAX = 90;
  function trend(sessions, threshold, latest) {
    if (!sessions.length) return { ok: false, n: 0, slope: null, se: null, projection: null };
    latest = latest || sessions[sessions.length - 1].number;
    var win = sessions.filter(function (s) { return s.number > latest - TREND_DAYS; });
    var out = { ok: false, n: win.length, slope: null, se: null, projection: null };
    if (win.length < TREND_MIN || win[win.length - 1].number - win[0].number + 1 < TREND_SPAN) return out;
    var xs = win.map(function (s) { return s.number; }), f = fit(win.map(function (s) { return s.stats.avg; }), xs);
    out.ok = true; out.slope = f.slope; out.se = f.se; out.first = xs[0]; out.last = xs[xs.length - 1];
    if (threshold) {
      var left = threshold - f.at(out.last), lo = f.slope - f.se, hi = f.slope + f.se;
      if (left <= 0) out.projection = { state: 'reached' };
      else if (f.slope <= TREND_FLAT || lo <= 0 || Math.ceil(left / lo) > TREND_MAX) out.projection = { state: 'plateau' };
      else out.projection = { state: 'range', low: Math.ceil(left / hi), high: Math.ceil(left / lo) };
    }
    return out;
  }

  // Average score by round index within a session (round 1, 2, 3…).
  /*
   * Average score by round number within a day: [{ idx 1–12, label ('12+' for round 12 and later), avg, n (rounds),
   * days }]. A round number only counts with data from 2 or more days.
   */
  var ROUND_CAP = 12;
  function roundIndexAverages(rounds, mode) {
    var buckets = [];
    sessionsForMode(rounds, mode).forEach(function (s) {
      s.scores.forEach(function (sc, i) {
        var k = Math.min(i, ROUND_CAP - 1), b = buckets[k] = buckets[k] || { scores: [], days: {} };
        b.scores.push(sc); b.days[s.day] = 1;
      });
    });
    var out = [];
    buckets.forEach(function (b, k) {
      var days = Object.keys(b.days).length;
      if (days < 2) return;
      out.push({ idx: k + 1, label: k + 1 === ROUND_CAP ? ROUND_CAP + '+' : String(k + 1), avg: mean(b.scores), n: b.scores.length, days: days });
    });
    return out;
  }

  // Fatigue: last 3 rounds all ≥ 15% below the average of the first 3 rounds.
  function fatigue(scores) {
    if (scores.length < 6) return null;
    var base = mean(scores.slice(0, 3)), last = scores.slice(-3);
    var tired = base > 0 && last.every(function (s) { return s <= base * 0.85; });
    return tired ? { base: base, last: last } : null;
  }

  // Median answer time per op per session: { add: [{number, ms}], ... }
  function timeByOp(rounds) {
    var days = sessionDays(rounds), acc = {};
    rounds.forEach(function (r) {
      (r.questions || []).forEach(function (q) {
        if (q.unanswered || !ZETAMAC_OP[q.op]) return;
        var k = q.op + '|' + dayKey(r.startedAt);
        (acc[k] = acc[k] || { op: q.op, day: dayKey(r.startedAt), t: [] }).t.push(q.timeMs);
      });
    });
    var out = { add: [], sub: [], mul: [], div: [] };
    Object.keys(acc).forEach(function (k) { var a = acc[k]; out[a.op].push({ number: days.indexOf(a.day) + 1, ms: median(a.t) }); });
    for (var op in out) out[op].sort(function (x, y) { return x.number - y.number; });
    return out;
  }

  // ---------- one round ----------

  function slowest(round, n) {
    return (round.questions || []).slice().sort(function (a, b) { return b.timeMs - a.timeMs; }).slice(0, n || 5);
  }

  // Questions that took more than 3× the round's median answer time (with the usual advice), and, for + − × ÷ and
  // complements, any answer over 8 s (Road to 60's freeze rule) with its one-line method where there is one.
  var FREEZE_MS = 8000;
  function freezes(round) {
    var qs = round.questions || [];
    var med = median(qs.filter(function (q) { return !q.unanswered; }).map(function (q) { return q.timeMs; }));
    var out = [];
    qs.forEach(function (q) {
      if (q.skipped) return;
      if (med && q.timeMs > 3 * med && q.timeMs > 1500) out.push({ q: q, advice: G.advice(q) });
      else if (!q.unanswered && (ZETAMAC_OP[q.op] || q.op === 'cp') && q.timeMs > FREEZE_MS) {
        var h = G.hint(q);
        out.push({ q: q, advice: h ? 'Method: ' + h + '.' : G.advice(q), over8: true });
      }
    });
    return out;
  }

  /*
   * Rounds with per-question data split into thirds of the clock, by when each answer landed.
   * { rounds, duration, perRound: [median ms], thirds: [{ answers (per round), median }], change }
   * change = median in the last third ÷ median in the first − 1.
   */
  function paceThirds(rs) {
    var thirds = [[], [], []], counts = [0, 0, 0], perRound = [];
    rs.forEach(function (r) {
      var third = ((r.settings && r.settings.duration) || 60) * 1000 / 3, t = 0, mine = [];
      r.questions.forEach(function (q) {
        t += q.timeMs;
        if (q.unanswered) return;
        var i = Math.min(2, Math.floor(t / third));
        counts[i]++; thirds[i].push(q.timeMs); mine.push(q.timeMs);
      });
      perRound.push(median(mine));
    });
    var out = {
      rounds: rs.length, duration: (rs[0].settings && rs[0].settings.duration) || 60, perRound: perRound,
      thirds: thirds.map(function (ts, i) { return { answers: counts[i] / rs.length, median: median(ts) }; })
    };
    var m1 = out.thirds[0].median, m3 = out.thirds[2].median;
    out.change = m1 && m3 ? m3 / m1 - 1 : null;
    return out;
  }

  // Linear-interpolated quantile of an unsorted list.
  function quantile(a, p) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), i = (s.length - 1) * p, lo = Math.floor(i);
    return lo + 1 < s.length ? s[lo] + (s[lo + 1] - s[lo]) * (i - lo) : s[lo];
  }

  var BUCKETS = [1000, 2000, 3000, 4000];
  var OP_WORD = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' };
  function s1(ms) { return (ms / 1000).toFixed(1) + ' s'; }

  /*
   * Everything the end screen shows for one Zetamac-style round, against the player's other rounds.
   * "Usual" = the other rounds of the same mode (ops, median); facts compare with every other round.
   * takeaways: up to 3 plain sentences, most important first.
   */
  // asOf (optional, an ISO time): only rounds started at or before it count, so a past round reads as it did then.
  function roundReport(rounds, round, asOf) {
    var mode = effMode(round), qs = round.questions || [];
    if (asOf) rounds = rounds.filter(function (r) { return r.startedAt <= asOf; });
    var others = rounds.filter(function (r) { return r.id !== round.id; });
    var sameMode = others.filter(function (r) { return effMode(r) === mode; });
    var answered = qs.filter(function (q) { return !q.unanswered; });
    var times = answered.map(function (q) { return q.timeMs; });
    var usualQs = answeredQs(sameMode.filter(function (r) { return r.mode !== 'INTERVIEW'; }));
    var med = median(times), threshold = STEP_THRESHOLDS[mode] || null;
    var duration = (round.settings && round.settings.duration) || sum(times) / 1000 || 60;
    var wrongAttempts = answered.reduce(function (a, q) { return a + (q.wrongAttempts || 0); }, 0);

    var rep = {
      mode: mode, score: round.score, avg7: recentAverage(rounds, mode, 7, round.id),
      threshold: threshold, vsThreshold: threshold ? round.score - threshold : null,
      answered: answered.length, wrongAttempts: wrongAttempts,
      skipped: qs.filter(function (q) { return q.skipped; }).length,
      firstTry: answered.length ? answered.filter(function (q) { return !q.wrongAttempts; }).length / answered.length : null,
      perMinute: answered.length / (duration / 60),
      median: med, mean: mean(times), usualMedian: median(usualQs.map(function (q) { return q.timeMs; })),
      q1: quantile(times, 0.25), q3: quantile(times, 0.75),
      pace: answered.length ? paceThirds([round]) : null,
      freezes: freezes(round).filter(function (f) { return !f.q.unanswered; }), slowest: slowest(round, 8),
      buckets: [0, 0, 0, 0, 0], ops: [], slower: [], faster: [], takeaways: []
    };
    rep.consistency = rep.q1 !== null ? rep.q3 - rep.q1 : null;

    // Rank among every round of this mode, zetamac.com entries included.
    var higher = sameMode.filter(function (r) { return r.score > round.score; }).length;
    rep.rank = {
      place: higher + 1, of: sameMode.length + 1, best: higher === 0 && sameMode.length > 0,
      tied: sameMode.some(function (r) { return r.score === round.score; })
    };
    var today = sameMode.filter(function (r) { return dayKey(r.startedAt) === dayKey(round.startedAt); });
    rep.rank.bestToday = today.length > 0 && today.every(function (r) { return r.score < round.score; });

    var frozen = rep.freezes.map(function (f) { return f.q; });
    rep.series = answered.map(function (q) { return { q: q, s: q.timeMs / 1000, frozen: frozen.indexOf(q) >= 0 }; });
    times.forEach(function (t) {
      var i = 0; while (i < BUCKETS.length && t >= BUCKETS[i]) i++;
      rep.buckets[i]++;
    });

    // Per operation, against this mode's usual.
    var total = sum(times);
    ['add', 'sub', 'mul', 'div'].forEach(function (op) {
      var t = answered.filter(function (q) { return q.op === op; });
      if (!t.length) return;
      var ts = t.map(function (q) { return q.timeMs; });
      var u = median(usualQs.filter(function (q) { return q.op === op; }).map(function (q) { return q.timeMs; }));
      rep.ops.push({
        op: op, n: t.length, median: median(ts), usualMedian: u, share: total ? sum(ts) / total : 0,
        wrong: t.reduce(function (a, q) { return a + (q.wrongAttempts || 0); }, 0),
        cost: u ? sum(ts) - u * t.length : null
      });
    });

    // Facts met this round against every other round: ≥ 3 earlier attempts, beyond ±15%.
    var fk = {};
    function addTo(list, slot) {
      list.forEach(function (q) {
        if (q.op === 'iv') return;
        G.factKeys(q).forEach(function (k) { (fk[k] = fk[k] || { t: [], b: [] })[slot].push(q.timeMs); });
      });
    }
    addTo(answered, 't'); addTo(answeredQs(others), 'b');
    var moved = Object.keys(fk).filter(function (k) { return fk[k].t.length && fk[k].b.length >= 3; }).map(function (k) {
      var mt = median(fk[k].t), mb = median(fk[k].b);
      return { key: k, label: G.keyLabel(k), today: mt, before: mb, ratio: mt / mb, n: fk[k].t.length };
    });
    rep.slower = moved.filter(function (x) { return x.ratio > 1.15; }).sort(function (a, b) { return b.ratio - a.ratio; }).slice(0, 5);
    rep.faster = moved.filter(function (x) { return x.ratio < 0.85; }).sort(function (a, b) { return a.ratio - b.ratio; }).slice(0, 5);

    // Takeaways, most important first.
    var tk = rep.takeaways;
    if (!sameMode.length) tk.push('Your first round in this mode. It sets the baseline the next ones are compared with.');
    else if (rep.rank.best) {
      var prevBest = Math.max.apply(null, sameMode.map(function (r) { return r.score; }));
      tk.push(rep.rank.tied ? 'This ties your best score in this mode.' : 'A new personal best in this mode, ' + (round.score - prevBest) + ' above your previous best.');
    } else if (rep.rank.bestToday) tk.push('Your best round today.');
    if (threshold) {
      var gap = round.score - threshold;
      tk.push(gap > 0 ? gap + ' above the step threshold of ' + threshold + '.' : gap === 0 ? 'Exactly on the step threshold of ' + threshold + '.' : -gap + ' short of the step threshold of ' + threshold + '.');
    }
    var worst = rep.ops.filter(function (o) { return o.cost !== null && o.cost >= 2000 && o.median > o.usualMedian * 1.15; })
      .sort(function (a, b) { return b.cost - a.cost; })[0];
    if (worst) tk.push(OP_WORD[worst.op] + ' cost you about ' + Math.round(worst.cost / 1000) + ' s more than usual: ' + s1(worst.median) + ' median against ' + s1(worst.usualMedian) + '.');
    if (rep.freezes.length >= 2) {
      var lost = sum(rep.freezes.map(function (f) { return f.q.timeMs - med; }));
      tk.push(rep.freezes.length + ' freezes cost you about ' + Math.round(lost / 1000) + ' s. Each one is listed below with how to think it.');
    }
    if (rep.pace && rep.pace.change !== null && rep.pace.change >= 0.2) tk.push('You were ' + Math.round(rep.pace.change * 100) + '% slower in the last third than in the first.');
    if (answered.length >= 5 && wrongAttempts / answered.length >= 0.1) tk.push(wrongAttempts + ' wrong attempts, about 1 for every ' + Math.max(1, Math.round(answered.length / wrongAttempts)) + ' answers. Each one costs a retype, so check before you type.');
    if (!tk.length) tk.push('A steady round: nothing stands out against your usual.');
    rep.takeaways = tk.slice(0, 3);
    return rep;
  }

  // ---------- weak-fact engine ----------

  function category(op) { return op === 'mul' || op === 'div' ? 'muldiv' : op; }

  /*
   * Per fact key: attempts, median time, last 5 times, wrong rate, last seen, slowness, status, trend.
   *
   * slowness = weighted median of (time / my median for that op) × (1 + wrong rate)
   * Attempts older than 21 days have weight 0.5.
   *
   * Status is a small state machine walked session by session:
   *   ok → weak        when, after a session, (≥3 attempts and slowness ≥ 1.5) or that session had a stall
   *                    (an attempt > 3× my op median and > 1.5 s, like a round freeze but against my usual pace)
   *   weak → improving after a "good" session (every attempt ≤ my op median)
   *   improving → mastered after 3 good sessions since it was last bad; a bad session sends it back to weak
   *   mastered → weak  if it trips the weak rule again
   * Finally, a fact that is not mastered but trips the current weak rule (spec §6.2) is weak.
   */
  function factStats(rounds, nowMs) {
    nowMs = nowMs || Date.now();
    var days = sessionDays(rounds), last2 = days.slice(-2);
    var attempts = [];
    rounds.forEach(function (r) {
      if (!r.questions || !r.questions.length) return;
      var t0 = Date.parse(r.startedAt), day = dayKey(r.startedAt);
      var w = nowMs - t0 > 21 * DAY ? 0.5 : 1;
      r.questions.forEach(function (q) {
        if (q.unanswered && !q.skipped) return;   // a skipped trick counts as a miss; time running out does not
        attempts.push({ q: q, day: day, w: w, at: r.startedAt, time: q.timeMs, wrong: isWrong(q) });
      });
    });
    attempts.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });

    // My overall median per operation.
    var byOp = {};
    attempts.forEach(function (a) { var o = byOp[a.q.op] = byOp[a.q.op] || { v: [], w: [] }; o.v.push(a.time); o.w.push(a.w); });
    var opMed = {};
    for (var op in byOp) opMed[op] = weightedMedian(byOp[op].v, byOp[op].w);
    attempts.forEach(function (a) { a.ratio = a.time / opMed[a.q.op]; });
    function stalled(a) { return a.ratio > 3 && a.time > 1500; }

    var map = {};
    attempts.forEach(function (a) {
      G.factKeys(a.q).forEach(function (k) {
        (map[k] = map[k] || { key: k, cat: category(a.q.op), list: [] }).list.push(a);
      });
    });

    function slownessOf(list) {
      var ws = list.map(function (a) { return a.w; });
      var wrong = sum(list.map(function (a) { return a.wrong ? a.w : 0; })) / sum(ws);
      return { slowness: weightedMedian(list.map(function (a) { return a.ratio; }), ws) * (1 + wrong), wrongRate: wrong };
    }

    return Object.keys(map).map(function (k) {
      var e = map[k], list = e.list;
      var sw = slownessOf(list);
      var untimed = e.cat === 'iv' || e.cat === 'tr' || e.cat === 'mx';   // interview, tricks, matrices: no stall rule, they are slower by nature

      // Walk sessions in order.
      var sessDays = [], bySess = {};
      list.forEach(function (a) { if (!bySess[a.day]) { bySess[a.day] = []; sessDays.push(a.day); } bySess[a.day].push(a); });
      var state = 'ok', good = 0, prefix = [];
      sessDays.forEach(function (d) {
        var s = bySess[d];
        prefix = prefix.concat(s);
        var isGood = s.every(function (a) { return a.ratio <= 1; });
        var tripped = (prefix.length >= 3 && slownessOf(prefix).slowness >= 1.5) ||
          (!untimed && s.some(stalled));
        if (state === 'weak' || state === 'improving') {
          if (isGood) { good++; state = good >= 3 ? 'mastered' : 'improving'; } else { good = 0; state = 'weak'; }
        } else if (tripped && !isGood) { state = 'weak'; good = 0; }
      });
      var recentSlow = !untimed && list.some(function (a) { return last2.indexOf(a.day) >= 0 && stalled(a); });
      var slowNow = list.length >= 3 && sw.slowness >= 1.5;
      var weakNow = slowNow || recentSlow;
      if (state === 'ok' && weakNow) state = 'weak';

      var times = list.map(function (a) { return a.time; });
      var trendDir = null;
      if (times.length >= 6) {
        var recent = median(times.slice(-5)), before = median(times.slice(0, -5));
        trendDir = recent < before * 0.9 ? 'faster' : recent > before * 1.1 ? 'slower' : 'flat';
      }
      return {
        key: k, cat: e.cat, attempts: list.length,
        medianTime: weightedMedian(times, list.map(function (a) { return a.w; })),
        last5: times.slice(-5), wrongRate: sw.wrongRate, slowness: sw.slowness,
        lastSeen: list[list.length - 1].at, status: state, trend: trendDir,
        froze: state === 'weak' && !slowNow && recentSlow,   // weak only because of a recent stall: say so
        sample: list[list.length - 1].q
      };
    });
  }

  // Facts to drill: weak first, then improving; by slowness. Interview, trick and matrix keys excluded (not Zetamac-style).
  function drillTargets(stats) {
    var rank = { weak: 0, improving: 1 };
    return stats.filter(function (f) { return rank[f.status] !== undefined && f.cat !== 'iv' && f.cat !== 'tr' && f.cat !== 'mx'; })
      .sort(function (a, b) { return rank[a.status] - rank[b.status] || b.slowness - a.slowness; });
  }

  /*
   * Group drill targets for reading: tables pairs with the same product become one family line
   * ("72 = 6×12 = 8×9"). Returns [{label, ms, keys, status}].
   */
  function weakLines(targets, n) {
    var lines = [], byProduct = {};
    // A band key ("8x30s") adds nothing when all its attempts are one exact pair already listed ("8x36").
    var pairAttempts = {};
    targets.forEach(function (f) {
      var m = /^(\d+)x(\d+)$/.exec(f.key);
      if (m && +m[2] > 12) pairAttempts[m[1] + 'x' + Math.floor(m[2] / 10) * 10 + 's'] = f.attempts;
    });
    targets.forEach(function (f) {
      if (pairAttempts[f.key] === f.attempts) return;
      var m = /^(\d+)x(\d+)$/.exec(f.key);
      if (m && +m[2] <= 12) {
        var p = m[1] * m[2];
        if (byProduct[p]) { byProduct[p].keys.push(f.key); byProduct[p].ms = Math.max(byProduct[p].ms, f.medianTime); return; }
        byProduct[p] = { label: G.familyText(p), ms: f.medianTime, keys: [f.key], status: f.status };
        lines.push(byProduct[p]);
      } else {
        lines.push({ label: G.keyLabel(f.key), ms: f.medianTime, keys: [f.key], status: f.status });
      }
    });
    return lines.slice(0, n || 10);
  }

  // Drill pool: weak facts weighted by slowness, plus the other members of their families at half weight.
  function drillPool(targets) {
    var pool = [], have = {};
    targets.slice(0, 25).forEach(function (f) { pool.push({ key: f.key, weight: f.slowness }); have[f.key] = 1; });
    targets.slice(0, 25).forEach(function (f) {
      var m = /^(\d+)x(\d+)$/.exec(f.key);
      if (!m || +m[2] > 12) return;
      G.family(m[1] * m[2]).forEach(function (pair) {
        var k = pair[0] + 'x' + pair[1];
        if (!have[k]) { have[k] = 1; pool.push({ key: k, weight: f.slowness / 2 }); }
      });
    });
    return pool;
  }

  /*
   * Tables-grid stats, × and ÷ kept apart (the fact keys merge them):
   *   mul['7x8'] — 7×8 and 8×7 (unordered, symmetric grid)
   *   div['7/8'] — 56 ÷ 7 = 8: divisor 7, answer 8 (ordered; 56 ÷ 8 is div['8/7'])
   * Only 2–12 tables facts; larger P2 divisions (637 ÷ 7) don't fit the grid.
   * Same rules as factStats: unanswered skipped, attempts older than 21 days count half.
   * Each cell: { attempts, medianTime, wrongRate }.
   */
  function tableCells(rounds, nowMs) {
    nowMs = nowMs || Date.now();
    var acc = { mul: {}, div: {} };
    rounds.forEach(function (r) {
      if (!r.questions || !r.questions.length) return;
      var w = nowMs - Date.parse(r.startedAt) > 21 * DAY ? 0.5 : 1;
      r.questions.forEach(function (q) {
        if (q.unanswered || q.a > 12 || q.b > 12) return;
        var k;
        if (q.op === 'mul') k = Math.min(q.a, q.b) + 'x' + Math.max(q.a, q.b);
        else if (q.op === 'div') k = q.a + '/' + q.b;
        else return;
        var c = acc[q.op][k] = acc[q.op][k] || { t: [], w: [], wrong: 0 };
        c.t.push(q.timeMs); c.w.push(w); if (q.wrongAttempts > 0) c.wrong += w;
      });
    });
    var out = { mul: {}, div: {} };
    ['mul', 'div'].forEach(function (op) {
      Object.keys(acc[op]).forEach(function (k) {
        var c = acc[op][k];
        out[op][k] = { attempts: c.t.length, medianTime: weightedMedian(c.t, c.w), wrongRate: c.wrong / sum(c.w) };
      });
    });
    return out;
  }

  /*
   * Weighted tables pool: 121 multiplications a×b plus 121 divisions (divisor, answer), all 2–12.
   *   seen:   w = clamp((median / ref)² × (1 + wrong rate), 0.25, 6)
   *           ref = median of all seen cell medians, shared by × and ÷ (slower divisions come up more)
   *   unseen: the current maximum weight, so the heatmaps fill in quickly
   * 7×8 and 8×7 both use mul['7x8']. Empty history → uniform, exactly 50% × and 50% ÷.
   * Returns [{ q: {op, a, b}, weight, share, cell }], share = % chance per question, cell = 'mul:7x8' | 'div:7/8'.
   */
  var W_MIN = 0.25, W_MAX = 6;

  /*
   * Fractions by heart: one cell per pair of G.HEART, from its "fr-n/d" fact (both directions share it).
   * Weighted like the tables: clamp((median / ref)² × (1 + wrong), 0.25, 6), ref = median over the pairs seen;
   * unseen pairs take the highest weight so they come up until seen. `slow` marks a pair to work on.
   */
  function fractionCells(rounds) {
    var byKey = {};
    factStats(rounds).forEach(function (f) { if (/^fr-/.test(f.key)) byKey[f.key] = f; });
    var cells = G.HEART.map(function (p) {
      var k = 'fr-' + p[0] + '/' + p[1];
      return { n: p[0], d: p[1], key: k, f: byKey[k] || null };
    });
    var seen = cells.filter(function (c) { return c.f; });
    var ref = median(seen.map(function (c) { return c.f.medianTime; }));
    seen.forEach(function (c) {
      var r = c.f.medianTime / ref;
      c.weight = Math.min(W_MAX, Math.max(W_MIN, r * r * (1 + c.f.wrongRate)));
      c.slow = c.weight >= 2 || c.f.status === 'weak';
    });
    var seenMax = Math.max.apply(null, seen.map(function (c) { return c.weight; }).concat([0]));
    cells.forEach(function (c) { if (!c.f) { c.weight = seenMax > 0 ? seenMax : W_MAX; c.slow = false; } });
    return cells;
  }

  // Both directions of every pair, at the pair's weight, for G.makeMixedGenerator.
  function fractionPool(cells) {
    var pool = [];
    cells.forEach(function (c) {
      pool.push({ q: { op: 'tr', type: 'fd', a: c.n, b: c.d }, weight: c.weight });
      pool.push({ q: { op: 'tr', type: 'df', a: c.n, b: c.d }, weight: c.weight });
    });
    return pool;
  }

  function tableWeights(cells) {
    var items = [], a, b;
    for (a = 2; a <= 12; a++) for (b = 2; b <= 12; b++) {
      var mk = Math.min(a, b) + 'x' + Math.max(a, b);
      items.push({ q: { op: 'mul', a: a, b: b }, cell: 'mul:' + mk, c: cells.mul[mk] });
    }
    for (a = 2; a <= 12; a++) for (b = 2; b <= 12; b++) {
      items.push({ q: { op: 'div', a: a, b: b }, cell: 'div:' + a + '/' + b, c: cells.div[a + '/' + b] });
    }
    var seenMeds = [];
    Object.keys(cells.mul).forEach(function (k) { seenMeds.push(cells.mul[k].medianTime); });
    Object.keys(cells.div).forEach(function (k) { seenMeds.push(cells.div[k].medianTime); });
    var ref = median(seenMeds);
    items.forEach(function (it) {
      if (!it.c || !ref) return;
      var r = it.c.medianTime / ref;
      it.weight = Math.min(W_MAX, Math.max(W_MIN, r * r * (1 + it.c.wrongRate)));
    });
    var seenMax = Math.max.apply(null, items.map(function (it) { return it.weight || 0; }));
    var unseen = seenMax > 0 ? seenMax : W_MAX, total = 0;
    items.forEach(function (it) { if (it.weight === undefined) it.weight = unseen; total += it.weight; });
    return items.map(function (it) { return { q: it.q, cell: it.cell, weight: it.weight, share: it.weight / total * 100 }; });
  }

  /*
   * How much of the tables grid is measured: 66 × pairs (7×8 = 8×7) plus 121 ÷ facts (56 ÷ 7 and 56 ÷ 8 apart),
   * all 2–12. A fact is measured with 2 answers or more. `ready` (150 of 187, 80%) makes Weighted tables the warm-up:
   * its weights mean something by then, and it gives the unseen rest the top weight anyway.
   */
  var COVER_MIN = 2, COVER_READY = 150;
  function tableCoverage(cells) {
    var measured = 0, total = 0, a, b;
    for (a = 2; a <= 12; a++) for (b = 2; b <= 12; b++) {
      if (a <= b) { total++; if (cells.mul[a + 'x' + b] && cells.mul[a + 'x' + b].attempts >= COVER_MIN) measured++; }
      total++; if (cells.div[a + '/' + b] && cells.div[a + '/' + b].attempts >= COVER_MIN) measured++;
    }
    return { measured: measured, total: total, need: COVER_READY, ready: measured >= COVER_READY };
  }

  // Exact questions answered wrong or stalled on in the last 3 sessions. A stall is the same as in
  // factStats: > 3× my median for that op (over every round) and > 1.5 s.
  function mistakes(rounds) {
    var days = sessionDays(rounds.filter(function (r) { return r.questions && r.questions.length; })).slice(-3);
    var out = [], seen = {}, byOp = {}, opMed = {};
    answeredQs(rounds).forEach(function (q) { if (ZETAMAC_OP[q.op]) (byOp[q.op] = byOp[q.op] || []).push(q.timeMs); });
    for (var op in byOp) opMed[op] = median(byOp[op]);
    rounds.forEach(function (r) {
      if (days.indexOf(dayKey(r.startedAt)) < 0) return;
      (r.questions || []).forEach(function (q) {
        if (!ZETAMAC_OP[q.op]) return;
        var stalled = q.timeMs > 3 * opMed[q.op] && q.timeMs > 1500;
        if ((q.wrongAttempts > 0 || stalled) && !seen[q.shown]) { seen[q.shown] = 1; out.push(q); }
      });
    });
    return out;
  }

  // Share of answered questions with ≥1 wrong attempt, per op, over the given rounds.
  function wrongRateByOp(rounds) {
    var acc = {};
    rounds.forEach(function (r) {
      (r.questions || []).forEach(function (q) {
        if (q.unanswered) return;
        var a = acc[q.op] = acc[q.op] || { n: 0, w: 0 };
        a.n++; if (q.wrongAttempts > 0) a.w++;
      });
    });
    var out = {};
    for (var op in acc) out[op] = { rate: acc[op].w / acc[op].n, n: acc[op].n };
    return out;
  }

  // ---------- one session (day) analysed ----------

  var STEP_THRESHOLDS = { P2: 18, P3: 25, NORMAL120: 60 };

  function byStartAsc(a, b) { return a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0; }
  function answeredQs(rs) {
    var out = [];
    rs.forEach(function (r) { (r.questions || []).forEach(function (q) { if (!q.unanswered) out.push(q); }); });
    return out;
  }
  var hadWrong = isWrong;
  function wrongShare(qs) { return qs.length ? qs.filter(hadWrong).length / qs.length : null; }

  /*
   * Everything the Session page shows for one day. "Before" = rounds on earlier days.
   *   scores:   per mode played, in order, with previous averages and fatigue
   *   pace:     each round split into thirds of its duration (by when answers landed)
   *   mistakes: questions answered wrong or frozen on, grouped by exact question
   *   ops:      + − × ÷ today vs before
   *   moved:    facts clearly faster / slower today than before
   */
  function sessionReport(rounds, day) {
    var days = sessionDays(rounds);
    var today = rounds.filter(function (r) { return dayKey(r.startedAt) === day; }).sort(byStartAsc);
    var before = rounds.filter(function (r) { return dayKey(r.startedAt) < day; });
    var earlier = days.filter(function (d) { return d < day; }), later = days.filter(function (d) { return d > day; });
    var qT = answeredQs(today), qB = answeredQs(before);
    function zq(qs) { return qs.filter(function (q) { return ZETAMAC_OP[q.op]; }); }
    var times = function (qs) { return qs.map(function (q) { return q.timeMs; }); };
    // Median times over + − × ÷; rounds with none (tricks, matrices, interview, finance) use their own questions.
    var arith = zq(qT).length > 0, tq = function (qs) { return arith ? zq(qs) : qs.filter(function (q) { return !q.skipped; }); };

    var rep = {
      day: day, number: sessionNumber(rounds, day),
      prevDay: earlier.length ? earlier[earlier.length - 1] : null, nextDay: later.length ? later[0] : null,
      rounds: today.length, questions: qT.length,
      median: median(times(tq(qT))), usualMedian: median(times(tq(qB))),
      wrong: wrongShare(qT), usualWrong: wrongShare(qB),
      scores: [], pace: [], mistakes: [], ops: [], faster: [], slower: []
    };

    // Scores per mode, in the order first played.
    var modes = [];
    today.forEach(function (r) { var m = effMode(r); if (modes.indexOf(m) < 0) modes.push(m); });
    modes.forEach(function (m) {
      var rs = today.filter(function (r) { return effMode(r) === m; });
      var scores = rs.map(function (r) { return r.score; });
      var prev = sessionsForMode(before, m).map(function (s) { return s.stats.avg; });
      rep.scores.push({
        mode: m, scores: scores, stats: summarize(scores), fatigue: fatigue(scores),
        prevAvg: mean(prev.slice(-7)), lastAvg: prev.length ? prev[prev.length - 1] : null,
        threshold: STEP_THRESHOLDS[m] || null,
        external: rs.filter(function (r) { return r.mode === 'EXTERNAL'; }).length
      });

      // Pace inside rounds (Zetamac-style rounds with per-question data).
      var withQs = rs.filter(function (r) { return r.questions && r.questions.length && r.mode !== 'INTERVIEW'; });
      if (!withQs.length) return;
      var pace = paceThirds(withQs);
      pace.mode = m;
      rep.pace.push(pace);
    });

    // Mistakes and freezes, grouped by exact question.
    var mm = {};
    today.forEach(function (r) {
      var frozen = freezes(r).map(function (f) { return f.q; });
      (r.questions || []).forEach(function (q) {
        var e = mm[q.shown] = mm[q.shown] || { q: q, seen: 0, wrong: 0, freezes: 0, slowest: 0 };
        e.seen++;
        e.wrong += (q.wrongAttempts || 0) + (!q.wrongAttempts && isWrong(q) ? 1 : 0);   // each wrong attempt, else 1 for a wrong or skipped answer
        if (frozen.indexOf(q) >= 0) e.freezes++;
        e.slowest = Math.max(e.slowest, q.timeMs);
      });
    });
    rep.mistakes = Object.keys(mm).map(function (k) { return mm[k]; })
      .filter(function (e) { return e.wrong > 0 || e.freezes > 0; })
      .sort(function (a, b) { return (b.wrong + b.freezes) - (a.wrong + a.freezes) || b.slowest - a.slowest; })
      .slice(0, 15)
      .map(function (e) { e.advice = G.advice(e.q); return e; });

    // Per operation, today vs before.
    ['add', 'sub', 'mul', 'div'].forEach(function (op) {
      var t = qT.filter(function (q) { return q.op === op; }), b = qB.filter(function (q) { return q.op === op; });
      if (!t.length) return;
      rep.ops.push({ op: op, n: t.length, median: median(times(t)), wrong: wrongShare(t), usualN: b.length, usualMedian: median(times(b)), usualWrong: wrongShare(b) });
    });

    // Facts that moved: ≥ 2 attempts today, ≥ 3 before, median ratio beyond ±15%.
    var fk = {};
    function addTo(qs, slot) {
      zq(qs).forEach(function (q) {
        G.factKeys(q).forEach(function (k) { (fk[k] = fk[k] || { t: [], b: [] })[slot].push(q.timeMs); });
      });
    }
    addTo(qT, 't'); addTo(qB, 'b');
    var moved = Object.keys(fk).filter(function (k) { return fk[k].t.length >= 2 && fk[k].b.length >= 3; }).map(function (k) {
      var mt = median(fk[k].t), mb = median(fk[k].b);
      return { key: k, label: G.keyLabel(k), today: mt, before: mb, ratio: mt / mb, n: fk[k].t.length };
    });
    rep.faster = moved.filter(function (x) { return x.ratio < 0.85; }).sort(function (a, b) { return a.ratio - b.ratio; }).slice(0, 5);
    rep.slower = moved.filter(function (x) { return x.ratio > 1.15; }).sort(function (a, b) { return b.ratio - a.ratio; }).slice(0, 5);
    return rep;
  }

  var api = {
    mean: mean, median: median, stdev: stdev, weightedMedian: weightedMedian, slope: slope, fit: fit,
    DAY_START_HOUR: DAY_START_HOUR, dayKey: dayKey, effMode: effMode, financeMode: financeMode, financeStats: financeStats, sessionDays: sessionDays, sessionNumber: sessionNumber,
    summarize: summarize, sessionsForMode: sessionsForMode, recentAverage: recentAverage, trend: trend,
    ROUND_CAP: ROUND_CAP, roundIndexAverages: roundIndexAverages, fatigue: fatigue, timeByOp: timeByOp,
    isWrong: isWrong, shiftDay: shiftDay, dayDiff: dayDiff, weekWindows: weekWindows, arrow: arrow, accuracy: accuracy, activity: activity, streak: streak, opMedians: opMedians,
    fractionCells: fractionCells, fractionPool: fractionPool,
    slowest: slowest, freezes: freezes, paceThirds: paceThirds, roundReport: roundReport, factStats: factStats, drillTargets: drillTargets,
    weakLines: weakLines, drillPool: drillPool, tableCells: tableCells, tableWeights: tableWeights, tableCoverage: tableCoverage, mistakes: mistakes, wrongRateByOp: wrongRateByOp, sessionReport: sessionReport
  };
  AT.Stats = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
