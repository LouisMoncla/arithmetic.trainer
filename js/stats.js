/*
 * stats.js — sessions, averages, trends, per-fact stats and weak-fact scoring.
 * Pure logic, no DOM.
 *
 * A session = all rounds played on the same local calendar day.
 * Session numbers are global (Session 1 = first day with any round).
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var G = typeof module !== 'undefined' ? require('./generator.js') : AT.Generator;

  var DAY = 86400000;
  var SLOW_MS = 4000;
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
  // Least-squares slope of ys against 0..n-1.
  function slope(ys) {
    var n = ys.length;
    if (n < 2) return null;
    var mx = (n - 1) / 2, my = mean(ys), num = 0, den = 0;
    for (var i = 0; i < n; i++) { num += (i - mx) * (ys[i] - my); den += (i - mx) * (i - mx); }
    return num / den;
  }

  // ---------- sessions ----------

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // External (zetamac.com) rounds count as the mode they were linked to.
  function effMode(r) { return r.mode === 'EXTERNAL' ? r.linkedMode : r.mode; }

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

  // Trend of last 5 session averages and projected sessions to reach a threshold.
  function trend(sessions, threshold) {
    var ys = sessions.slice(-5).map(function (s) { return s.stats.avg; });
    var sl = slope(ys);
    var out = { slope: sl, sessionsToThreshold: null };
    if (sl !== null && sl > 0 && threshold) {
      var fittedLast = mean(ys) + sl * (ys.length - 1) / 2;
      out.sessionsToThreshold = fittedLast >= threshold ? 0 : Math.ceil((threshold - fittedLast) / sl);
    }
    return out;
  }

  // Average score by round index within a session (round 1, 2, 3…).
  function roundIndexAverages(rounds, mode) {
    var buckets = [];
    sessionsForMode(rounds, mode).forEach(function (s) {
      s.scores.forEach(function (sc, i) { (buckets[i] = buckets[i] || []).push(sc); });
    });
    return buckets.map(function (b) { return { avg: mean(b), n: b.length }; });
  }

  // Fatigue: last 3 rounds all ≥ 15% below the average of the first 3 rounds.
  function fatigue(scores) {
    if (scores.length < 6) return null;
    var base = mean(scores.slice(0, 3)), last = scores.slice(-3);
    var tired = base > 0 && last.every(function (s) { return s <= base * 0.85; });
    return tired ? { base: base, last: last } : null;
  }

  // 120 s estimate from 60 s Normal (P3) sessions; ≈ 2×, calibrated once 3+ sessions of both exist.
  function estimate120(rounds) {
    var p3 = sessionsForMode(rounds, 'P3').map(function (s) { return s.stats.avg; });
    var n120 = sessionsForMode(rounds, 'NORMAL120').map(function (s) { return s.stats.avg; });
    if (!p3.length) return null;
    var factor = 2, calibrated = false;
    if (p3.length >= 3 && n120.length >= 3) { factor = mean(n120.slice(-5)) / mean(p3.slice(-5)); calibrated = true; }
    return { estimate: factor * mean(p3.slice(-3)), factor: factor, calibrated: calibrated };
  }

  // Mean answer time per op per session: { add: [{number, ms}], ... }
  function timeByOp(rounds) {
    var days = sessionDays(rounds), acc = {};
    rounds.forEach(function (r) {
      (r.questions || []).forEach(function (q) {
        if (q.unanswered || !ZETAMAC_OP[q.op]) return;
        var k = q.op + '|' + dayKey(r.startedAt);
        var a = acc[k] = acc[k] || { op: q.op, day: dayKey(r.startedAt), t: 0, n: 0 };
        a.t += q.timeMs; a.n++;
      });
    });
    var out = { add: [], sub: [], mul: [], div: [] };
    Object.keys(acc).forEach(function (k) { var a = acc[k]; out[a.op].push({ number: days.indexOf(a.day) + 1, ms: a.t / a.n }); });
    for (var op in out) out[op].sort(function (x, y) { return x.number - y.number; });
    return out;
  }

  // ---------- one round ----------

  function slowest(round, n) {
    return (round.questions || []).slice().sort(function (a, b) { return b.timeMs - a.timeMs; }).slice(0, n || 5);
  }

  // Questions that took more than 3× the round's median answer time.
  function freezes(round) {
    var qs = round.questions || [];
    var med = median(qs.filter(function (q) { return !q.unanswered; }).map(function (q) { return q.timeMs; }));
    if (!med) return [];
    return qs.filter(function (q) { return q.timeMs > 3 * med && q.timeMs > 1500; })
      .map(function (q) { return { q: q, advice: G.advice(q) }; });
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
  function roundReport(rounds, round) {
    var mode = effMode(round), qs = round.questions || [];
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
   *   ok → weak        when, after a session, (≥3 attempts and slowness ≥ 1.5) or that session had an attempt > 4 s
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
        if (q.unanswered) return;
        attempts.push({ q: q, day: day, w: w, at: r.startedAt, time: q.timeMs, wrong: q.wrongAttempts > 0 || q.correct === false });
      });
    });
    attempts.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });

    // My overall median per operation.
    var byOp = {};
    attempts.forEach(function (a) { var o = byOp[a.q.op] = byOp[a.q.op] || { v: [], w: [] }; o.v.push(a.time); o.w.push(a.w); });
    var opMed = {};
    for (var op in byOp) opMed[op] = weightedMedian(byOp[op].v, byOp[op].w);
    attempts.forEach(function (a) { a.ratio = a.time / opMed[a.q.op]; });

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
      var untimed = e.cat === 'iv' || e.cat === 'tr';   // interview and tricks: no 4 s rule, they are slower by nature

      // Walk sessions in order.
      var sessDays = [], bySess = {};
      list.forEach(function (a) { if (!bySess[a.day]) { bySess[a.day] = []; sessDays.push(a.day); } bySess[a.day].push(a); });
      var state = 'ok', good = 0, prefix = [];
      sessDays.forEach(function (d) {
        var s = bySess[d];
        prefix = prefix.concat(s);
        var isGood = s.every(function (a) { return a.ratio <= 1; });
        var tripped = (prefix.length >= 3 && slownessOf(prefix).slowness >= 1.5) ||
          (!untimed && s.some(function (a) { return a.time > SLOW_MS; }));
        if (state === 'weak' || state === 'improving') {
          if (isGood) { good++; state = good >= 3 ? 'mastered' : 'improving'; } else { good = 0; state = 'weak'; }
        } else if (tripped && !isGood) { state = 'weak'; good = 0; }
      });
      var recentSlow = !untimed && list.some(function (a) { return last2.indexOf(a.day) >= 0 && a.time > SLOW_MS; });
      var weakNow = (list.length >= 3 && sw.slowness >= 1.5) || recentSlow;
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
        sample: list[list.length - 1].q
      };
    });
  }

  // Facts to drill: weak first, then improving; by slowness. Interview and trick keys excluded (not Zetamac-style).
  function drillTargets(stats) {
    var rank = { weak: 0, improving: 1 };
    return stats.filter(function (f) { return rank[f.status] !== undefined && f.cat !== 'iv' && f.cat !== 'tr'; })
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

  // Exact questions answered wrong or slowly (> 4 s) in the last 3 sessions.
  function mistakes(rounds) {
    var days = sessionDays(rounds.filter(function (r) { return r.questions && r.questions.length; })).slice(-3);
    var out = [], seen = {};
    rounds.forEach(function (r) {
      if (days.indexOf(dayKey(r.startedAt)) < 0) return;
      (r.questions || []).forEach(function (q) {
        if (!ZETAMAC_OP[q.op]) return;
        if ((q.wrongAttempts > 0 || q.timeMs > SLOW_MS) && !seen[q.shown]) { seen[q.shown] = 1; out.push(q); }
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
  function hadWrong(q) { return q.op === 'iv' ? (!q.correct && !q.skipped) : q.wrongAttempts > 0; }
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

    var rep = {
      day: day, number: sessionNumber(rounds, day),
      prevDay: earlier.length ? earlier[earlier.length - 1] : null, nextDay: later.length ? later[0] : null,
      rounds: today.length, questions: qT.length,
      median: median(times(zq(qT))), usualMedian: median(times(zq(qB))),
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
        e.wrong += q.op === 'iv' ? (hadWrong(q) ? 1 : 0) : (q.wrongAttempts || 0);
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
    mean: mean, median: median, stdev: stdev, weightedMedian: weightedMedian, slope: slope,
    dayKey: dayKey, effMode: effMode, sessionDays: sessionDays, sessionNumber: sessionNumber,
    summarize: summarize, sessionsForMode: sessionsForMode, recentAverage: recentAverage, trend: trend,
    roundIndexAverages: roundIndexAverages, fatigue: fatigue, estimate120: estimate120, timeByOp: timeByOp,
    slowest: slowest, freezes: freezes, paceThirds: paceThirds, roundReport: roundReport, factStats: factStats, drillTargets: drillTargets,
    weakLines: weakLines, drillPool: drillPool, tableCells: tableCells, tableWeights: tableWeights, mistakes: mistakes, wrongRateByOp: wrongRateByOp, sessionReport: sessionReport
  };
  AT.Stats = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
