/*
 * finance-teach.js — the teaching card and the Method sheet, as HTML strings. One implementation for every place that
 * shows them: Practice after a wrong answer, the sprint's "Pause and learn" panel, the end screen's question list and
 * the Method sheet (#finance/method). DOM-free (strings only), so ui and game can both call it.
 *
 * Numbers of 10 000 or more are shown with thin spaces (F.group); nothing stored or typed ever has them.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};
  var F = AT.Finance, T = AT.FinanceTags, TeX = AT.TeX;

  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rich(s) { return TeX.rich(F.groupRich(s)); }
  function plain(s) { return esc(F.group(s)); }
  function secs(ms) { return (Math.round(ms / 100) / 10).toFixed(1) + ' s'; }

  // "12.4 s / target 15 s", bold when over the target.
  function timeLine(ms, targetS) {
    if (!targetS) return secs(ms);
    var over = ms > targetS * 1000, s = secs(ms) + ' / target ' + targetS + ' s';
    return '<span class="fin-time num' + (over ? ' over' : '') + '" data-testid="finance-time">' + (over ? '<b>' + s + '</b>' : s) + '</span>';
  }

  function legendHtml(q) {
    var t = F.get(q.tpl), rows = (t && t.legend) || [];
    if (!rows.length) return '';
    return '<div class="tbl-scroll"><table class="fc-legend" data-testid="card-legend"><tr><th scope="col">Symbol</th><th scope="col">What it is</th><th scope="col">Here</th></tr>' +
      rows.map(function (r) {
        var here = typeof r.here === 'function' ? r.here(q.p, q) : r.here;
        return '<tr><td class="fc-sym">' + TeX.rich('$' + r.sym + '$') + '</td><td>' + esc(r.meaning) + '</td><td class="num">' + (here ? plain(here) : '–') + '</td></tr>';
      }).join('') + '</table></div>';
  }

  // The tag in plain words, for "Your mistake".
  function mistakeHtml(q, o) {
    var tag = o.tag || 'UNTAGGED', given = o.given;
    var said = given !== null && given !== undefined && given !== '' ? 'You answered <b class="num">' + plain(given) + '</b>. ' : 'No answer. ';
    var parsed = given !== null && given !== undefined && given !== '' ? F.parse(given, q.unit, q.fracInput) : null;
    var line = (parsed !== null && T.pitfallText({ tpl: q.tpl, p: q.p }, parsed)) || T.WORDS[tag] || '';
    var h = '<div class="fc-mistake" data-testid="card-mistake"><p><span class="mid">Your mistake</span> <b class="fc-tag" data-testid="card-tag">' + esc(T.LABEL[tag] || tag) + '</b></p><p>' + said + esc(line) + '</p>';
    if (o.picker) {
      h += '<div class="fc-pick" role="group" aria-label="Choose another kind of mistake"><span class="small mid">Not this?</span> ' +
        T.TAGS.map(function (g, i) { return '<button type="button" class="small" data-tag="' + g + '" aria-pressed="' + (g === tag) + '" data-testid="card-tag-' + g + '"><kbd>' + (i + 1) + '</kbd> ' + esc(T.LABEL[g]) + '</button>'; }).join(' ') + '</div>';
    }
    return h + '</div>';
  }

  /*
   * q: a question from F.make. o: { given, timeMs, tag, picker, wrong, buttons }.
   * buttons: HTML for the action row (the caller owns the keys), '' for none.
   */
  function cardHtml(q, o) {
    o = o || {};
    var t = F.get(q.tpl), h = ['<section class="fcard" data-testid="finance-card" aria-label="Worked answer">'];
    h.push('<p class="fc-recap" data-testid="card-recap">' + rich(q.prompt) + '</p>');
    if (q.formula) h.push('<div class="fc-formula fq-formula" data-testid="card-formula"><span class="mid">Formula</span> ' + TeX.render(q.tex, q.formula) + '</div>');
    h.push(legendHtml(q));
    if (q.steps.length) h.push('<ol class="fq-steps fc-steps" data-testid="card-steps">' + q.steps.map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol>');
    h.push('<p class="fc-answer" data-testid="card-answer"><span class="mid">The answer is</span> <b class="fc-hl num">' + rich(q.answerText) + '</b></p>');
    if (o.timeMs !== undefined && o.timeMs !== null && t && t.target) h.push('<p class="fc-speed">Your time ' + timeLine(o.timeMs, t.target) + '</p>');
    var sc = (t && t.shortcut) || q.why;
    if (sc) h.push('<p class="fc-short" data-testid="card-shortcut"><span class="mid">Shortcut</span> ' + rich(sc) + '</p>');
    if (o.wrong) h.push(mistakeHtml(q, o));
    if (o.buttons) h.push('<div class="row fc-actions">' + o.buttons + '</div>');
    h.push('</section>');
    return h.join('');
  }

  // ---------- the Method sheet: one card per template ----------

  function methodCard(id) {
    var t = F.get(id), m = F.make(id, 1), ex = t.example, prompt, ans;
    if (ex) { prompt = t.prompt(ex.p); ans = F.fmt(ex.answer, t.dp || 0) + (t.unit ? ' ' + t.unit : ''); }
    else { prompt = m.prompt; ans = m.answerText; }
    var pit = (t.pitfalls || []).filter(function (x) { return x.text; })[0];
    var h = '<article class="mcard" data-testid="method-card" data-tpl="' + esc(id) + '"><h3>' + esc(t.category) + ' <span class="mid">' + esc(id) + '</span></h3>';
    h += '<div class="fc-formula">' + TeX.render(m.tex, m.formula) + '</div>';
    h += '<ul class="mc-legend">' + (t.legend || []).map(function (r) { return '<li>' + TeX.rich('$' + r.sym + '$') + ' ' + esc(r.meaning) + '</li>'; }).join('') + '</ul>';
    if (t.shortcut) h += '<p><span class="mid">Shortcut</span> ' + rich(t.shortcut) + '</p>';
    if (pit) h += '<p><span class="mid">Common mistake</span> ' + esc(T.LABEL[pit.tag] || pit.tag) + ': ' + esc(pit.text) + '</p>';
    h += '<p><span class="mid">Example</span> ' + rich(prompt) + ' <b class="num">' + plain(ans) + '</b></p>';
    h += '<p class="small mid">Target ' + (t.target || '–') + ' s</p></article>';
    return h;
  }
  function methodHtml(ids) { return ids.map(methodCard).join(''); }

  AT.FinanceTeach = { cardHtml: cardHtml, methodHtml: methodHtml, timeLine: timeLine, secs: secs, esc: esc, rich: rich, plain: plain };
})();
