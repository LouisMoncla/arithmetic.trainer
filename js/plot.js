/*
 * plot.js — function graphs for cards (Learn decks). DOM-free: returns an SVG string, runs in the browser
 * (window.AT.Plot) and in Node. Curves are expressions in x (expr.js), sampled and clipped to the window here, so the
 * drawing needs no clip-path and a discontinuity (tan) gives separate branches, never a vertical stroke.
 *
 *   plot = { fns: [{ f: "acos(x)", dash?: true }],          1–6 curves; dash = a dashed grey line
 *            x: [x0, x1], y: [y0, y1],                         the window
 *            xticks: [[value, "label"]], yticks: [[value, "label"]],   plain Unicode labels ("π/2", "−1")
 *            points: [{ x, y, open?: true }],                  dots (open = hollow)
 *            vlines: [x…], hlines: [y…],                       dashed guides (asymptotes)
 *            caption: "y = arccos x" }                          plain text under the graph
 * Colours come from CSS classes on currentColor (.pl-axis .pl-curve .pl-dash .pl-guide .pl-pt .pl-txt), so the
 * graph is black on light, white on dark, and inverts with its row.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var Expr = AT.Expr || (typeof module !== 'undefined' ? require('./expr.js') : null);

  var SAMPLES = 600, MAX_FNS = 6;
  var FIELDS = { fns: 1, x: 1, y: 1, xticks: 1, yticks: 1, points: 1, vlines: 1, hlines: 1, caption: 1 };
  var EPS = 1e-9;

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isWindow(w) { return Array.isArray(w) && w.length === 2 && isNum(w[0]) && isNum(w[1]) && w[0] < w[1]; }
  function plainLabel(s) { return typeof s === 'string' && !/[$\\<>&]/.test(s) && s.length <= 24; }

  // ---------- validation: the errors of a plot object, [] = fine ----------

  function validatePlot(p) {
    var e = [];
    if (!p || typeof p !== 'object' || Array.isArray(p)) return ['plot must be an object'];
    Object.keys(p).forEach(function (k) { if (!FIELDS[k]) e.push('unknown plot field ' + k); });
    if (!Array.isArray(p.fns) || !p.fns.length || p.fns.length > MAX_FNS) e.push('plot.fns must list 1 to ' + MAX_FNS + ' curves');
    else p.fns.forEach(function (f, i) {
      if (!f || typeof f.f !== 'string') { e.push('plot.fns[' + i + '].f must be an expression string'); return; }
      var bad = Expr.check(f.f);
      if (bad) e.push('plot.fns[' + i + '] "' + f.f + '": ' + bad);
      Object.keys(f).forEach(function (k) { if (k !== 'f' && k !== 'dash') e.push('unknown field ' + k + ' in plot.fns[' + i + ']'); });
    });
    if (!isWindow(p.x)) e.push('plot.x must be [x0, x1] with x0 < x1');
    if (!isWindow(p.y)) e.push('plot.y must be [y0, y1] with y0 < y1');
    var okX = isWindow(p.x), okY = isWindow(p.y);
    function ticks(name, list, w) {
      if (list === undefined) return;
      if (!Array.isArray(list)) { e.push('plot.' + name + ' must be a list'); return; }
      list.forEach(function (t, i) {
        if (!Array.isArray(t) || t.length !== 2 || !isNum(t[0]) || !plainLabel(t[1])) e.push('plot.' + name + '[' + i + '] must be [value, "plain label"]');
        else if (w && (t[0] < w[0] - EPS || t[0] > w[1] + EPS)) e.push('plot.' + name + '[' + i + '] is outside the window');
      });
    }
    ticks('xticks', p.xticks, okX ? p.x : null);
    ticks('yticks', p.yticks, okY ? p.y : null);
    if (p.points !== undefined) {
      if (!Array.isArray(p.points)) e.push('plot.points must be a list');
      else p.points.forEach(function (q, i) {
        if (!q || !isNum(q.x) || !isNum(q.y)) e.push('plot.points[' + i + '] needs numeric x and y');
        else if ((okX && (q.x < p.x[0] - EPS || q.x > p.x[1] + EPS)) || (okY && (q.y < p.y[0] - EPS || q.y > p.y[1] + EPS))) e.push('plot.points[' + i + '] is outside the window');
      });
    }
    function guides(name, list, w) {
      if (list === undefined) return;
      if (!Array.isArray(list) || list.some(function (v) { return !isNum(v); })) e.push('plot.' + name + ' must be a list of numbers');
      else if (w) list.forEach(function (v, i) { if (v < w[0] - EPS || v > w[1] + EPS) e.push('plot.' + name + '[' + i + '] is outside the window'); });
    }
    guides('vlines', p.vlines, okX ? p.x : null);
    guides('hlines', p.hlines, okY ? p.y : null);
    if (p.caption !== undefined && (typeof p.caption !== 'string' || /[$\\]/.test(p.caption) || p.caption.length > 80)) e.push('plot.caption must be plain text (no TeX), at most 80 characters');
    return e;
  }

  // ---------- sampling ----------

  // Liang–Barsky on y for the segment a → b (x is inside by construction): { a, b, t0, t1 } or null.
  function clipY(ax, ay, bx, by, y0, y1) {
    var dy = by - ay, t0, t1;
    if (Math.abs(dy) < 1e-15) { return ay < y0 - EPS || ay > y1 + EPS ? null : { a: [ax, ay], b: [bx, by], t0: 0, t1: 1 }; }
    t0 = (y0 - ay) / dy; t1 = (y1 - ay) / dy;
    if (t0 > t1) { var t = t0; t0 = t1; t1 = t; }
    t0 = Math.max(0, t0); t1 = Math.min(1, t1);
    if (t0 > t1) return null;
    var dx = bx - ax;
    return { a: [ax + t0 * dx, Math.min(y1, Math.max(y0, ay + t0 * dy))], b: [ax + t1 * dx, Math.min(y1, Math.max(y0, ay + t1 * dy))], t0: t0, t1: t1 };
  }

  // One curve → polylines [[x, y], …] inside the window. Breaks where the value is NaN or infinite, or where
  // neighbouring samples differ by more than half the y-range (an asymptote).
  function segments(f, x0, x1, y0, y1, n) {
    n = n || SAMPLES;
    var jump = (y1 - y0) / 2, out = [], cur = [], prev = null, i, x, y;
    function flush() { if (cur.length > 1) out.push(cur); cur = []; }
    for (i = 0; i <= n; i++) {
      x = i === n ? x1 : x0 + (x1 - x0) * i / n;
      y = f(x);
      if (typeof y !== 'number' || !isFinite(y)) { flush(); prev = null; continue; }
      if (prev && Math.abs(y - prev[1]) > jump) { flush(); prev = [x, y]; continue; }
      if (prev) {
        var c = clipY(prev[0], prev[1], x, y, y0, y1);
        if (!c) flush();
        else {
          if (c.t0 > 0) flush();                 // the curve enters the window here: a new run
          if (!cur.length) cur.push(c.a);
          cur.push(c.b);
          if (c.t1 < 1) flush();                 // and leaves it here
        }
      }
      prev = [x, y];
    }
    flush();
    return out;
  }

  function sample(plot, n) {
    return plot.fns.map(function (fn) {
      var f = Expr.fnOf(fn.f);
      return { f: fn.f, dash: !!fn.dash, segs: f ? segments(f, plot.x[0], plot.x[1], plot.y[0], plot.y[1], n) : [] };
    });
  }

  // ---------- drawing ----------

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function r1(v) { return (Math.round(v * 10) / 10).toString(); }

  // Plain words for a plot: its caption, else the curves ("graph of y = acos(x)"); used for titles and saved answers.
  function describe(plot) {
    if (plot && plot.caption) return plot.caption;
    var fs = ((plot && plot.fns) || []).map(function (f) { return 'y = ' + f.f + (f.dash ? ' (dashed)' : ''); });
    return 'graph of ' + (fs.join(', ') || 'a function');
  }

  /*
   * The SVG. opts.size 'prompt' (320 × 220, the default) or 'choice' (200 × 150). The plot must be valid.
   * Width is the CSS's job (.plot-prompt, .plot-choice): the viewBox scales.
   */
  function svg(plot, opts) {
    var choice = opts && opts.size === 'choice', W = choice ? 200 : 320, H = choice ? 150 : 220;
    var padL = choice ? 26 : 36, padR = choice ? 12 : 16, padT = 10, padB = choice ? 18 : 22;
    var x0 = plot.x[0], x1 = plot.x[1], y0 = plot.y[0], y1 = plot.y[1];
    var px0 = padL, px1 = W - padR, py0 = padT, py1 = H - padB, cap = plot.caption ? 18 : 0;
    function X(x) { return px0 + (x - x0) / (x1 - x0) * (px1 - px0); }
    function Y(y) { return py1 - (y - y0) / (y1 - y0) * (py1 - py0); }
    var axisY = y0 <= 0 && y1 >= 0 ? Y(0) : (y0 > 0 ? py1 : py0);   // the x-axis through 0, else on the nearest edge
    var axisX = x0 <= 0 && x1 >= 0 ? X(0) : (x0 > 0 ? px0 : px1);
    var s = [];
    s.push('<svg class="plot plot-' + (choice ? 'choice' : 'prompt') + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + (H + cap) + '" role="img" aria-label="' + esc(describe(plot)) + '">');
    s.push('<title>' + esc(describe(plot)) + '</title>');
    (plot.vlines || []).forEach(function (v) { s.push('<line class="pl-guide" x1="' + r1(X(v)) + '" y1="' + py0 + '" x2="' + r1(X(v)) + '" y2="' + py1 + '"/>'); });
    (plot.hlines || []).forEach(function (v) { s.push('<line class="pl-guide" x1="' + px0 + '" y1="' + r1(Y(v)) + '" x2="' + px1 + '" y2="' + r1(Y(v)) + '"/>'); });
    // axes with arrowheads at the positive ends
    s.push('<line class="pl-axis" x1="' + px0 + '" y1="' + r1(axisY) + '" x2="' + px1 + '" y2="' + r1(axisY) + '"/>');
    s.push('<line class="pl-axis" x1="' + r1(axisX) + '" y1="' + py1 + '" x2="' + r1(axisX) + '" y2="' + py0 + '"/>');
    s.push('<path class="pl-arrow" d="M' + px1 + ' ' + r1(axisY) + ' l-6 -3 l0 6 z"/>');
    s.push('<path class="pl-arrow" d="M' + r1(axisX) + ' ' + py0 + ' l-3 6 l6 0 z"/>');
    (plot.xticks || []).forEach(function (t) {
      s.push('<line class="pl-axis" x1="' + r1(X(t[0])) + '" y1="' + r1(axisY - 3) + '" x2="' + r1(X(t[0])) + '" y2="' + r1(axisY + 3) + '"/>');
      s.push('<text class="pl-txt" x="' + r1(X(t[0])) + '" y="' + r1(axisY + 14) + '" text-anchor="middle">' + esc(t[1]) + '</text>');
    });
    (plot.yticks || []).forEach(function (t) {
      s.push('<line class="pl-axis" x1="' + r1(axisX - 3) + '" y1="' + r1(Y(t[0])) + '" x2="' + r1(axisX + 3) + '" y2="' + r1(Y(t[0])) + '"/>');
      s.push('<text class="pl-txt" x="' + r1(axisX - 6) + '" y="' + r1(Y(t[0]) + 4) + '" text-anchor="end">' + esc(t[1]) + '</text>');
    });
    sample(plot).forEach(function (c) {
      if (!c.segs.length) return;
      var d = c.segs.map(function (seg) { return 'M' + seg.map(function (p) { return r1(X(p[0])) + ' ' + r1(Y(p[1])); }).join('L'); }).join('');
      s.push('<path class="' + (c.dash ? 'pl-dash' : 'pl-curve') + '" d="' + d + '"/>');
    });
    (plot.points || []).forEach(function (p) { s.push('<circle class="pl-pt' + (p.open ? ' pl-open' : '') + '" cx="' + r1(X(p.x)) + '" cy="' + r1(Y(p.y)) + '" r="3.5"/>'); });
    if (plot.caption) s.push('<text class="pl-txt pl-cap" x="' + W / 2 + '" y="' + (H + 12) + '" text-anchor="middle">' + esc(plot.caption) + '</text>');
    s.push('</svg>');
    return s.join('');
  }

  var api = { validatePlot: validatePlot, sample: sample, segments: segments, svg: svg, describe: describe, SAMPLES: SAMPLES };
  AT.Plot = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
