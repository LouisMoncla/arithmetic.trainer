/*
 * charts.js — hand-drawn inline SVG charts. Returns markup strings; `bind(root)` adds the hover layer.
 * Everything is drawn with the CSS colour tokens, so it follows the theme. One ink: identity comes
 * from mark shape (solid line, hollow dot, dashed / dotted reference line) and a legend, never colour.
 *
 * Marks: 2px lines with round joins, ≥ 8px markers with a 2px surface ring, bars ≤ 24px with a 4px
 * rounded data-end, hairline gridlines at clean tick values. Selective labels: the end of the main line.
 * Hover / focus: a crosshair snaps to the nearest x and one tooltip lists every series there; on bars
 * the bar under the pointer is outlined. Arrow keys move along the x when a chart has focus.
 */
(function () {
  'use strict';
  var AT = window.AT = window.AT || {};

  function r1(x) { return Math.round(x * 10) / 10; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function defFmt(v) { return String(Math.round(v * 10) / 10); }

  // Clean tick values covering [lo, hi]: steps of 1, 2, 2.5 or 5 × 10^k, about `n` of them.
  function niceTicks(lo, hi, n) {
    var span = hi - lo || 1, raw = span / (n || 4), mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return s >= raw; })[0];
    var out = [], t = Math.floor(lo / step) * step;
    for (; t <= hi + step * 1e-9; t += step) out.push(Math.round(t * 1e6) / 1e6);
    if (out[0] > lo) out.unshift(out[0] - step);
    if (out[out.length - 1] < hi) out.push(out[out.length - 1] + step);
    return out;
  }

  // Hover data travels with the SVG as JSON attributes, read back by bind().
  function hoverAttrs(type, xs, tips) {
    return ' tabindex="0" data-hover="' + type + '" data-xs="' + esc(JSON.stringify(xs.map(r1))) + '" data-tips="' + esc(JSON.stringify(tips)) + '"';
  }

  /*
   * line({ xs, series, hline, hlines, w, h, fmt, label, xName, endLabel, zero })
   *   series: [{ ys, kind: 'line' | 'dots', name, tip: true }]   (tip:false hides a series from the tooltip)
   *   hlines: [{ y, kind: 'dash' | 'dot', name }] reference lines (dash = threshold, dot = average)
   *   xName:  tooltip header prefix, e.g. 'Session ' → "Session 12"
   *   endLabel: label the last value of the first series at the right end
   */
  function line(o) {
    var w = o.w || 640, h = o.h || 180, padT = 12, padB = 24;
    var fmt = o.fmt || defFmt;
    var refs = (o.hlines || []).slice();
    if (o.hline !== null && o.hline !== undefined) refs.unshift({ y: o.hline, kind: 'dash', name: 'threshold' });
    refs = refs.filter(function (l) { return l.y !== null && l.y !== undefined; });
    var all = [];
    o.series.forEach(function (s) { s.ys.forEach(function (y) { if (y !== null && y !== undefined) all.push(y); }); });
    refs.forEach(function (l) { all.push(l.y); });
    if (!all.length) return '';
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (o.zero) lo = Math.min(lo, 0);
    if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
    var ticks = niceTicks(lo, hi, 4);
    lo = ticks[0]; hi = ticks[ticks.length - 1];
    var padL = 12 + 7 * Math.max.apply(null, ticks.map(function (t) { return fmt(t).length; }));
    var padR = o.endLabel ? 12 + 7 * fmt(hi).length + 6 : 14;
    var xs = o.xs, x0 = xs[0], x1 = xs[xs.length - 1];
    function X(x) { return x1 === x0 ? padL + (w - padL - padR) / 2 : padL + (x - x0) / (x1 - x0) * (w - padL - padR); }
    function Y(y) { return padT + (hi - y) / (hi - lo) * (h - padT - padB); }

    // Tooltip rows per x: every named series and reference line, value first.
    var tips = xs.map(function (x, i) {
      var rows = [];
      o.series.forEach(function (s) {
        if (s.tip === false || !s.name) return;
        var v = s.ys[i];
        rows.push({ v: v === null || v === undefined ? '–' : fmt(v), l: s.name, k: s.kind === 'dots' ? 'dots' : 'line' });
      });
      refs.forEach(function (l) { if (l.name) rows.push({ v: fmt(l.y), l: l.name, k: l.kind }); });
      return { t: (o.xName || '') + x, rows: rows };
    });

    var out = ['<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img"' +
      (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + hoverAttrs('line', xs.map(X), tips) + '>'];
    // Hairline gridlines + clean tick labels; solid baseline.
    ticks.forEach(function (t, i) {
      out.push('<line class="' + (i === 0 ? 'axis' : 'grid') + '" x1="' + padL + '" y1="' + r1(Y(t)) + '" x2="' + (w - padR) + '" y2="' + r1(Y(t)) + '"/>');
      out.push('<text class="lbl" x="' + (padL - 6) + '" y="' + r1(Y(t) + 4) + '" text-anchor="end">' + esc(fmt(t)) + '</text>');
    });
    var step = Math.max(1, Math.ceil(xs.length / 8));
    xs.forEach(function (x, i) {
      if (i % step && i !== xs.length - 1) return;
      out.push('<text class="lbl" x="' + r1(X(x)) + '" y="' + (h - 6) + '" text-anchor="middle">' + esc(x) + '</text>');
    });
    refs.forEach(function (l) {
      out.push('<line class="' + (l.kind === 'dot' ? 'avg' : 'thr') + '" x1="' + padL + '" y1="' + r1(Y(l.y)) + '" x2="' + (w - padR) + '" y2="' + r1(Y(l.y)) + '"/>');
    });
    out.push('<line class="xhair" x1="0" y1="' + padT + '" x2="0" y2="' + (h - padB) + '" visibility="hidden"/>');
    // Lines first, markers on top so their surface ring cuts the line cleanly.
    var marks = [];
    o.series.forEach(function (s) {
      var pts = [];
      s.ys.forEach(function (y, i) { if (y !== null && y !== undefined) pts.push([X(xs[i]), Y(y)]); });
      if (s.kind !== 'dots' && pts.length > 1) {
        out.push('<path class="ln" d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1]); }).join(' ') + '"/>');
      }
      if (s.kind === 'dots' || pts.length === 1) {
        pts.forEach(function (p) { marks.push('<circle class="dot' + (s.kind === 'dots' ? ' hollow' : '') + '" cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="4"/>'); });
      }
    });
    out.push(marks.join(''));
    if (o.endLabel) {
      var s0 = o.series[0], li = s0.ys.length - 1;
      while (li >= 0 && (s0.ys[li] === null || s0.ys[li] === undefined)) li--;
      if (li >= 0) out.push('<text class="lbl end" x="' + r1(X(xs[li]) + 8) + '" y="' + r1(Y(s0.ys[li]) + 4) + '">' + esc(fmt(s0.ys[li])) + '</text>');
    }
    out.push('</svg>');
    return out.join('');
  }

  // Bar with a 4px rounded data-end, square at the baseline.
  function barPath(x, y, bw, base) {
    var r = Math.min(4, bw / 2, base - y);
    if (r <= 0) return 'M' + r1(x) + ' ' + r1(base) + 'H' + r1(x + bw);
    return 'M' + r1(x) + ' ' + r1(base) + 'V' + r1(y + r) + 'Q' + r1(x) + ' ' + r1(y) + ' ' + r1(x + r) + ' ' + r1(y) +
      'H' + r1(x + bw - r) + 'Q' + r1(x + bw) + ' ' + r1(y) + ' ' + r1(x + bw) + ' ' + r1(y + r) + 'V' + r1(base) + 'Z';
  }

  /*
   * bars({ values, labels, w, h, fmt, tips })
   *   tips: optional [{ t, rows: [{ v, l }] }] per bar; default = label + value.
   * Value on each cap (few bars, so every one is labelled); never wider than its own size.
   */
  function bars(o) {
    var w = o.w || 640, h = o.h || 120, padB = 20, padT = 16;
    var vals = o.values, fmt = o.fmt || defFmt, max = Math.max.apply(null, vals.concat([1]));
    var slot = (w - 20) / vals.length, bw = Math.min(24, slot - 8), base = h - padB;
    var labels = vals.map(function (_, i) { return o.labels ? o.labels[i] : String(i + 1); });
    var centers = vals.map(function (_, i) { return 10 + slot * i + slot / 2; });
    var tips = o.tips || vals.map(function (v, i) { return { t: labels[i], rows: [{ v: fmt(v), l: '' }] }; });
    var out = ['<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" width="100%" style="max-width:' + w + 'px" role="img"' +
      (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + hoverAttrs('bar', centers, tips) + '>'];
    out.push('<line class="axis" x1="10" y1="' + base + '" x2="' + (w - 10) + '" y2="' + base + '"/>');
    vals.forEach(function (v, i) {
      var cx = centers[i], y = base - v / max * (base - padT);
      out.push('<path class="bar" data-i="' + i + '" d="' + barPath(cx - bw / 2, y, bw, base) + '"/>');
      out.push('<text class="lbl" x="' + r1(cx) + '" y="' + r1(y - 5) + '" text-anchor="middle">' + esc(fmt(v)) + '</text>');
      out.push('<text class="lbl" x="' + r1(cx) + '" y="' + (h - 5) + '" text-anchor="middle">' + esc(labels[i]) + '</text>');
    });
    out.push('</svg>');
    return out.join('');
  }

  // Legend keys mirror the marks: solid line, hollow dot, dashed / dotted reference line.
  function key(k) {
    var s = '<svg class="key" width="20" height="10" aria-hidden="true">';
    if (k === 'dots') s += '<circle class="dot hollow" cx="10" cy="5" r="3.5"/>';
    else if (k === 'dash') s += '<line class="thr" x1="1" y1="5" x2="19" y2="5"/>';
    else if (k === 'dot') s += '<line class="avg" x1="1" y1="5" x2="19" y2="5"/>';
    else s += '<line class="ln" x1="1" y1="5" x2="19" y2="5"/>';
    return s + '</svg>';
  }
  function legend(items) {
    return '<div class="legend">' + items.map(function (it) { return '<span>' + key(it.kind) + esc(it.label) + '</span>'; }).join('') + '</div>';
  }

  // The table twin of a chart: every value readable without hovering.
  function table(head, rows) {
    return '<details class="tv"><summary>Show as table</summary><table><tr>' + head.map(function (c, i) {
      return '<th' + (i ? ' class="n"' : '') + '>' + esc(c) + '</th>';
    }).join('') + '</tr>' + rows.map(function (r) {
      return '<tr>' + r.map(function (c, i) { return '<td' + (i ? ' class="n"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</table></details>';
  }

  // ---------- hover layer ----------

  var tipEl = null;
  function tipBox() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'chart-tip';
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
    return tipEl;
  }

  // Build the tooltip with textContent only: labels never go through innerHTML.
  function fillTip(tip) {
    var box = tipBox();
    box.textContent = '';
    var head = document.createElement('div');
    head.className = 'tt-h'; head.textContent = tip.t;
    box.appendChild(head);
    tip.rows.forEach(function (r) {
      var row = document.createElement('div'); row.className = 'tt-r';
      if (r.k) { var k = document.createElement('span'); k.innerHTML = key(r.k); row.appendChild(k.firstChild); }
      var v = document.createElement('b'); v.textContent = r.v; row.appendChild(v);
      if (r.l) { var l = document.createElement('span'); l.className = 'tt-l'; l.textContent = r.l; row.appendChild(l); }
      box.appendChild(row);
    });
  }

  function placeTip(clientX, clientY) {
    var box = tipBox(), bw = box.offsetWidth, bh = box.offsetHeight;
    var x = clientX + 14, y = clientY - bh - 10;
    if (x + bw > window.innerWidth - 8) x = clientX - bw - 14;
    if (y < 8) y = clientY + 16;
    box.style.left = Math.max(8, x) + 'px'; box.style.top = y + 'px';
  }

  function bindOne(svg) {
    var xs = JSON.parse(svg.getAttribute('data-xs')), tips = JSON.parse(svg.getAttribute('data-tips'));
    var xhair = svg.querySelector('.xhair'), cur = -1;

    function toClient(px) {
      var p = svg.createSVGPoint();
      p.x = px; p.y = 0;
      return p.matrixTransform(svg.getScreenCTM()).x;
    }
    function show(i, clientX, clientY) {
      cur = i;
      if (xhair) { xhair.setAttribute('x1', xs[i]); xhair.setAttribute('x2', xs[i]); xhair.setAttribute('visibility', 'visible'); }
      Array.prototype.forEach.call(svg.querySelectorAll('.bar'), function (b) { b.classList.toggle('on', +b.getAttribute('data-i') === i); });
      fillTip(tips[i]);
      tipBox().hidden = false;
      placeTip(clientX, clientY);
    }
    function hide() {
      cur = -1;
      if (xhair) xhair.setAttribute('visibility', 'hidden');
      Array.prototype.forEach.call(svg.querySelectorAll('.bar.on'), function (b) { b.classList.remove('on'); });
      tipBox().hidden = true;
    }
    function nearest(clientX) {
      var p = svg.createSVGPoint();
      p.x = clientX; p.y = 0;
      var x = p.matrixTransform(svg.getScreenCTM().inverse()).x, best = 0;
      xs.forEach(function (v, i) { if (Math.abs(v - x) < Math.abs(xs[best] - x)) best = i; });
      return best;
    }
    // The whole plot is the hit area: the pointer only has to be nearest an x, never on the mark.
    svg.addEventListener('pointermove', function (e) { show(nearest(e.clientX), e.clientX, e.clientY); });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('blur', hide);
    function showKey(i) {
      var r = svg.getBoundingClientRect();
      show(i, toClient(xs[i]), r.top + r.height * 0.3);
    }
    svg.addEventListener('focus', function () { showKey(cur >= 0 ? cur : xs.length - 1); });
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation(); // don't also switch sessions
      var i = cur < 0 ? xs.length - 1 : cur + (e.key === 'ArrowRight' ? 1 : -1);
      showKey(Math.max(0, Math.min(xs.length - 1, i)));
    });
  }

  // Attach hover/focus behaviour to every chart rendered inside `root`.
  function bind(root) {
    if (tipEl) tipEl.hidden = true;
    Array.prototype.forEach.call(root.querySelectorAll('svg.chart[data-hover]'), bindOne);
  }

  AT.Charts = { line: line, bars: bars, legend: legend, table: table, bind: bind, niceTicks: niceTicks };
})();
