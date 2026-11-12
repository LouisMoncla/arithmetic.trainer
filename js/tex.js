/*
 * tex.js — a small LaTeX subset, drawn as MathML (what you see) or written as plain text (what is stored, read
 * aloud, put in the report). Pure string work, no DOM: runs in the browser (window.AT.TeX) and in Node.
 * Browsers draw MathML themselves, so there is no library and no font to ship, and file:// keeps working.
 *
 * Supported: numbers, letters (italic), \text{…} \mathrm{…} \operatorname{…} (upright words), ^ and _ with a token or
 * {group}, \frac \tfrac \dfrac \binom \sqrt \bar \overline (an unbraced number argument of a fraction or binomial takes
 * one digit: \frac12), ( … ) and [ … ] groups (text-size brackets), \left( … \right) (stretchy, also | \| . and the
 * floor/ceiling brackets), \mathbb \mathcal \mathbf (as Unicode letters), Greek, the operators and symbols in OPS,
 * the functions in FUNCS, spaces (\, \; \  \! \quad \qquad), and any plain character (+ − = < > | , ; % * ' ? !).
 * Anything else throws.
 *
 * Rich text: prose with maths between $…$ (\$ for a literal dollar). rich() gives HTML, richPlain() plain text.
 */
(function () {
  'use strict';
  var AT = typeof window !== 'undefined' ? (window.AT = window.AT || {}) : {};

  var GREEK = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ',
    sigma: 'σ', tau: 'τ', phi: 'ϕ', varphi: 'φ', ell: 'ℓ', Delta: 'Δ', Sigma: 'Σ', Phi: 'Φ',
    varepsilon: 'ε', eta: 'η', zeta: 'ζ', kappa: 'κ', nu: 'ν', xi: 'ξ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Psi: 'Ψ', Omega: 'Ω'
  };
  var OPS = {
    times: '×', cdot: '·', approx: '≈', Rightarrow: '⇒', iff: '⟺', mid: '∣', le: '≤', ge: '≥', neq: '≠',
    pm: '±', to: '→', top: '⊤', sum: '∑', infty: '∞',
    // added for the Probability lesson
    ne: '≠', leq: '≤', geq: '≥', sim: '∼', mapsto: '↦', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃',
    supseteq: '⊇', setminus: '∖', cup: '∪', cap: '∩', bigcup: '⋃', bigcap: '⋂', prod: '∏', int: '∫', cdots: '⋯',
    ldots: '…', dots: '…', Leftarrow: '⇐', Leftrightarrow: '⇔', leftarrow: '←', rightarrow: '→', forall: '∀',
    exists: '∃', neg: '¬', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', partial: '∂', prime: '′', emptyset: '∅',
    equiv: '≡', propto: '∝', ll: '≪', gg: '≫', circ: '∘', ast: '∗', langle: '⟨', rangle: '⟩', lvert: '|', rvert: '|',
    Vert: '‖', vert: '|'
  };
  var FUNCS = { ln: 1, log: 1, exp: 1, lim: 1, limsup: 1, liminf: 1, sup: 1, inf: 1, max: 1, min: 1, sin: 1, cos: 1, tan: 1, det: 1 };
  var SPACES = { ',': '0.17em', ';': '0.28em', ' ': '0.25em', quad: '1em', qquad: '2em', '!': '-0.17em' };
  // \mathbb, \mathcal, \mathbf: Unicode letters (Chrome's MathML ignores every mathvariant but normal).
  function alpha(base, holes) {
    return function (c) {
      if (holes[c]) return holes[c];
      var i = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c);
      return i < 0 ? null : String.fromCodePoint(base + i);
    };
  }
  var FONTS = {
    mathbb: alpha(0x1D538, { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ', 1: '𝟙' }),
    mathcal: alpha(0x1D49C, { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ' }),
    mathbf: function (c) {
      var i = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c), j = 'abcdefghijklmnopqrstuvwxyz'.indexOf(c), d = '0123456789'.indexOf(c);
      return i >= 0 ? String.fromCodePoint(0x1D400 + i) : j >= 0 ? String.fromCodePoint(0x1D41A + j) : d >= 0 ? String.fromCodePoint(0x1D7CE + d) : null;
    }
  };
  // Operators written with a space on each side in plain text.
  var BINARY = { '=': 1, '+': 1, '−': 1, '×': 1, '·': 1, '≈': 1, '<': 1, '>': 1, '⇒': 1, '⟺': 1, '∣': 1, '≤': 1, '≥': 1, '≠': 1, '±': 1, '→': 1, '/': 1, '÷': 1,
    '∼': 1, '↦': 1, '∈': 1, '∉': 1, '⊂': 1, '⊆': 1, '⊃': 1, '⊇': 1, '∖': 1, '∪': 1, '∩': 1, '⇐': 1, '⇔': 1, '←': 1, '≡': 1, '∝': 1, '≪': 1, '≫': 1 };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // ---------- tokens ----------

  function tokenize(src) {
    var out = [], i = 0, m;
    while (i < src.length) {
      var c = src.charAt(i);
      if (/\s/.test(c)) { i++; continue; }
      if (c === '\\') {
        m = /^\\([A-Za-z]+)/.exec(src.slice(i));
        if (m) {
          i += m[0].length;
          if (m[1] === 'text' || m[1] === 'mathrm' || m[1] === 'operatorname') {   // raw words up to the matching brace
            var j = i; while (/\s/.test(src.charAt(j))) j++;
            if (src.charAt(j) !== '{') throw new Error('\\' + m[1] + ' needs {…}');
            var depth = 0, k = j;
            for (; k < src.length; k++) {
              if (src.charAt(k) === '{') depth++;
              else if (src.charAt(k) === '}' && --depth === 0) break;
            }
            if (k >= src.length) throw new Error('Missing } after \\' + m[1]);
            out.push({ t: 'text', v: src.slice(j + 1, k) });
            i = k + 1;
          } else if (FONTS[m[1]]) {   // \mathbb{N}, \mathbb N, \mathbf{1}: each letter becomes its Unicode twin
            var f = FONTS[m[1]], p = i; while (/\s/.test(src.charAt(p))) p++;
            var body, end;
            if (src.charAt(p) === '{') { end = src.indexOf('}', p); if (end < 0) throw new Error('Missing } after \\' + m[1]); body = src.slice(p + 1, end); i = end + 1; }
            else { body = src.charAt(p); i = p + 1; }
            body = body.replace(/\s+/g, '');
            if (!body) throw new Error('\\' + m[1] + ' needs a letter');
            var letters = body.split('').map(function (ch) { var u = f(ch); if (!u) throw new Error('\\' + m[1] + ' cannot draw ' + ch); return { t: 'let', v: u }; });
            out.push(letters.length === 1 ? letters[0] : { t: 'font', c: letters });
          } else out.push({ t: 'cmd', v: m[1] });
        } else { out.push({ t: 'cmd', v: src.charAt(i + 1) }); i += 2; }   // \, \; \  \% \| \{ \}
        continue;
      }
      m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
      if (m) { out.push({ t: 'num', v: m[0] }); i += m[0].length; continue; }
      if (/[A-Za-z]/.test(c)) { out.push({ t: 'let', v: c }); i++; continue; }
      if (c === '{' || c === '}' || c === '^' || c === '_') { out.push({ t: c }); i++; continue; }
      out.push({ t: 'ch', v: c }); i++;
    }
    return out;
  }

  // ---------- parser → tree ----------
  // Nodes: {k:'n'|'i'|'o'|'t', v} number, identifier, operator, text; {k:'sp', w}; {k:'row', c}; {k:'frac', a, b};
  // {k:'sqrt', a}; {k:'scr', b, sub, sup}; {k:'br', open, close, c, stretch}.

  function parse(src) {
    var toks = tokenize(src), pos = 0;

    // A minus at the start of a row or right after another operator is a sign (prefix), not a subtraction.
    function signs(items) {
      items.forEach(function (x, i) {
        if (x.k === 'o' && x.v === '−' && (i === 0 || items[i - 1].k === 'o')) x.prefix = true;
        // +∞ after a comma or bracket ([0,+∞]) is a sign too; other "+" signs keep their old spacing (stored text, Finance)
        if (x.k === 'o' && x.v === '+' && items[i + 1] && items[i + 1].k === 'o' && items[i + 1].v === '∞' && (i === 0 || items[i - 1].k === 'o')) x.prefix = true;
      });
      return items;
    }
    function row(closer) {
      var items = [];
      while (pos < toks.length) {
        if (toks[pos].t === '}') { if (closer) { pos++; return signs(items); } throw new Error('Unexpected }'); }
        items.push(scripted());
      }
      if (closer) throw new Error('Missing }');
      return signs(items);
    }
    function group(items) { return items.length === 1 ? items[0] : { k: 'row', c: items }; }
    function arg() {
      if (pos >= toks.length) throw new Error('Missing argument');
      if (toks[pos].t === '{') { pos++; return group(row(true)); }
      return atom();
    }
    function scripted() {
      var base = atom(), sub = null, sup = null;
      while (pos < toks.length && (toks[pos].t === '^' || toks[pos].t === '_')) {
        var kind = toks[pos++].t;
        if (kind === '^') { if (sup) throw new Error('Double ^'); sup = arg(); } else { if (sub) throw new Error('Double _'); sub = arg(); }
      }
      return sub || sup ? { k: 'scr', b: base, sub: sub, sup: sup } : base;
    }
    // ( … ) and [ … ] become one group, so a power after the closing bracket applies to all of it.
    function bracket(open) {
      var close = open === '(' ? ')' : ']', start = pos, items = [];
      while (pos < toks.length) {
        var tk = toks[pos];
        if (tk.t === 'ch' && tk.v === close) { pos++; return { k: 'br', open: open, close: close, c: signs(items), stretch: false }; }
        if (tk.t === '}') break;
        items.push(scripted());
      }
      pos = start;   // no matching bracket: keep the lone bracket as an operator
      return { k: 'o', v: open, fixed: true };
    }
    function atom() {
      var tk = toks[pos++];
      switch (tk.t) {
        case '{': return group(row(true));
        case 'num': return { k: 'n', v: tk.v };
        case 'let': return { k: 'i', v: tk.v };
        case 'font': return { k: 'row', c: tk.c.map(function (x) { return { k: 'i', v: x.v }; }) };
        case 'text': return { k: 't', v: tk.v };
        case 'ch':
          if (tk.v === '-') return { k: 'o', v: '−' };
          if (tk.v === '(' || tk.v === '[') return bracket(tk.v);
          if (tk.v === ')' || tk.v === ']') return { k: 'o', v: tk.v, fixed: true };
          if (/[A-Za-zα-ωΑ-Ω]/.test(tk.v)) return { k: 'i', v: tk.v };
          return { k: 'o', v: tk.v };
        case 'cmd': return command(tk.v);
      }
      throw new Error('Unexpected ' + (tk.t === '^' || tk.t === '_' ? tk.t + ' with nothing before it' : tk.t));
    }
    // An unbraced number argument of \frac or \binom takes one digit, as in TeX: \frac12 is 1/2, \frac1n is 1/n.
    function digitArg() {
      var tk = toks[pos];
      if (tk && tk.t === 'num' && tk.v.length > 1) toks.splice(pos, 1, { t: 'num', v: tk.v.charAt(0) }, { t: 'num', v: tk.v.slice(1) });
      return arg();
    }
    function command(v) {
      if (v === 'frac' || v === 'tfrac') { var a = digitArg(), b = digitArg(); return { k: 'frac', a: a, b: b }; }
      if (v === 'dfrac') { var da = digitArg(), db = digitArg(); return { k: 'frac', a: da, b: db, display: true }; }
      if (v === 'binom') { var ba = digitArg(), bb = digitArg(); return { k: 'binom', a: ba, b: bb }; }
      if (v === 'bar' || v === 'overline') return { k: 'bar', a: arg(), wide: v === 'overline' };
      if (v === 'sqrt') return { k: 'sqrt', a: arg() };
      if (GREEK[v]) return { k: 'i', v: GREEK[v], upright: /^[A-Z]/.test(v) };
      if (OPS[v]) return { k: 'o', v: OPS[v] };
      if (FUNCS[v]) return { k: 'i', v: v, fn: true };
      if (SPACES[v]) return { k: 'sp', w: SPACES[v] };
      if (v === 'left') {
        var open = delim(), items = [];
        while (pos < toks.length && !(toks[pos].t === 'cmd' && toks[pos].v === 'right')) {
          if (toks[pos].t === '}') throw new Error('\\left without \\right');
          items.push(scripted());
        }
        if (pos >= toks.length) throw new Error('\\left without \\right');
        pos++;
        return { k: 'br', open: open, close: delim(), c: signs(items), stretch: true };
      }
      if (v === 'right') throw new Error('\\right without \\left');
      if (v === '|') return { k: 'o', v: '‖' };
      if (v === '%' || v === '{' || v === '}' || v === '$' || v === '#' || v === '&' || v === '_') return { k: 'o', v: v };
      throw new Error('Unknown command \\' + v);
    }
    function delim() {
      var d = toks[pos++];
      if (!d || !(d.t === 'ch' || (d.t === 'cmd' && (OPS[d.v] || d.v === '|' || d.v === '{' || d.v === '}')))) throw new Error('\\left and \\right need a bracket');
      if (d.t === 'ch') return d.v === '.' ? '' : d.v;
      return OPS[d.v] || (d.v === '|' ? '‖' : d.v);
    }

    return { k: 'row', c: row(false) };
  }

  // ---------- MathML ----------

  function ml(n) {
    switch (n.k) {
      case 'n': return '<mn>' + n.v + '</mn>';
      case 'i': return '<mi' + (n.upright ? ' mathvariant="normal"' : '') + '>' + esc(n.v) + '</mi>';
      case 't': return '<mtext>' + esc(n.v).replace(/^ | $/g, ' ') + '</mtext>';
      case 'o': return '<mo' + (n.prefix ? ' form="prefix"' : '') + (n.fixed ? ' stretchy="false"' : '') + '>' + esc(n.v) + '</mo>';
      case 'sp': return '<mspace width="' + n.w + '"></mspace>';
      case 'row': return n.c.length === 1 ? ml(n.c[0]) : '<mrow>' + n.c.map(ml).join('') + '</mrow>';
      case 'frac': return '<mfrac' + (n.display ? ' displaystyle="true"' : '') + '>' + ml(n.a) + ml(n.b) + '</mfrac>';
      case 'binom': return '<mrow><mo>(</mo><mfrac linethickness="0">' + ml(n.a) + ml(n.b) + '</mfrac><mo>)</mo></mrow>';
      case 'bar': return '<mover accent="true">' + ml(n.a) + '<mo' + (n.wide ? '' : ' stretchy="false"') + '>¯</mo></mover>';
      case 'sqrt': return '<msqrt>' + ml(n.a) + '</msqrt>';
      case 'scr':
        if (n.sub && n.sup) return '<msubsup>' + ml(n.b) + ml(n.sub) + ml(n.sup) + '</msubsup>';
        if (n.sub) return '<msub>' + ml(n.b) + ml(n.sub) + '</msub>';
        return '<msup>' + ml(n.b) + ml(n.sup) + '</msup>';
      case 'br':
        var s = n.stretch ? '' : ' stretchy="false"';
        return '<mrow>' + (n.open ? '<mo' + s + '>' + esc(n.open) + '</mo>' : '') + n.c.map(ml).join('') + (n.close ? '<mo' + s + '>' + esc(n.close) + '</mo>' : '') + '</mrow>';
    }
    throw new Error('Unknown node ' + n.k);
  }

  // ---------- plain text ----------

  var SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '−': '⁻', n: 'ⁿ', i: 'ⁱ', t: 'ᵗ', k: 'ᵏ', j: 'ʲ', '*': '*', '⊤': 'ᵀ', '′': '′' };
  var SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '−': '₋', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ' };
  function mapAll(s, map) {
    var out = '';
    for (var i = 0; i < s.length; i++) { if (!map[s.charAt(i)]) return null; out += map[s.charAt(i)]; }
    return out;
  }
  // Atomic = reads as one unit without brackets.
  function atomic(n) { return n.k === 'n' || n.k === 'i' || n.k === 't' || n.k === 'br' || n.k === 'sqrt' || n.k === 'scr' || n.k === 'binom' || n.k === 'bar' || (n.k === 'o' && '∏∫⋃⋂‖⌊⌋⌈⌉'.indexOf(n.v) >= 0) || (n.k === 'row' && n.c.length === 1 && atomic(n.c[0])); }
  function wrap(n) { var s = pl(n); return atomic(n) ? s : '(' + s + ')'; }

  function pl(n) {
    switch (n.k) {
      case 'n': case 'i': case 't': return n.v;
      case 'o': return n.prefix || !BINARY[n.v] ? n.v : ' ' + n.v + ' ';
      case 'sp': return ' ';
      case 'row': return n.c.map(pl).join('');
      case 'frac': return wrap(n.a) + ' / ' + wrap(n.b);
      case 'binom': return '(' + tidy(pl(n.a)) + ' choose ' + tidy(pl(n.b)) + ')';
      case 'bar': var bs = tidy(pl(n.a)); return Array.from(bs).length === 1 ? bs + '\u0304' : 'mean(' + bs + ')';
      case 'sqrt': return '√' + wrap(n.a);
      case 'br': return n.open + n.c.map(pl).join('') + n.close;
      case 'scr':
        var s = wrap(n.b);
        // Unicode sub/superscripts when every character has one (x², σ₁), else _ or ^ with brackets as needed.
        if (n.sub) { var b = tidy(pl(n.sub)), m = mapAll(b.replace(/\s+/g, ''), SUB); s += m !== null ? m : '_' + (atomic(n.sub) ? b : '(' + b + ')'); }
        if (n.sup) { var p = tidy(pl(n.sup)), q = mapAll(p.replace(/\s+/g, ''), SUP); s += q !== null ? q : '^' + (atomic(n.sup) ? p : '(' + p + ')'); }
        return s;
    }
    throw new Error('Unknown node ' + n.k);
  }
  function tidy(s) {
    return s.replace(/\s+/g, ' ').replace(/ ([,;)\]])/g, '$1').replace(/([(\[]) /g, '$1').replace(/^ | $/g, '');
  }

  // ---------- API ----------

  function plain(tex) { return tidy(pl(parse(tex))); }
  function toMathML(tex, alt) {
    var tree = parse(tex);
    return '<math alttext="' + esc(alt === undefined ? tidy(pl(tree)) : alt) + '"><mrow>' + ml(tree) + '</mrow></math>';
  }
  // The formula line: MathML when there is TeX and it parses, else the plain formula in the mono face.
  function render(tex, fallback) {
    if (tex) {
      try { return '<span class="tex">' + toMathML(tex) + '</span>'; } catch (e) { /* fall back to text */ }
    }
    return fallback ? '<span class="num">' + esc(fallback) + '</span>' : '';
  }

  // Split rich text into [text, math, text, math, …]; \$ is a literal dollar. Unclosed $ throws.
  function split(str) {
    var parts = [''], inMath = false;
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (c === '\\' && str.charAt(i + 1) === '$') { parts[parts.length - 1] += inMath ? '\\$' : '$'; i++; continue; }
      if (c === '$') { parts.push(''); inMath = !inMath; continue; }
      parts[parts.length - 1] += c;
    }
    if (inMath) throw new Error('Unclosed $ in: ' + str);
    return parts;
  }
  // Strict: throws on any bad maths (tests use these).
  // Punctuation right after a formula ("…= 0.58.") is kept on its line: formula and mark share a no-wrap span.
  function richStrict(str) {
    var parts = split(String(str)), out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { out += esc(parts[i]); continue; }
      var next = parts[i + 1] || '', punct = /^[.,;:!?)]+/.exec(next);
      var math = '<span class="tex tex-i">' + toMathML(parts[i]) + '</span>';
      if (punct) { out += '<span class="nobr">' + math + esc(punct[0]) + '</span>'; parts[i + 1] = next.slice(punct[0].length); }
      else out += math;
    }
    return out;
  }
  function richPlain(str) {
    return split(String(str)).map(function (p, i) { return i % 2 ? plain(p) : p; }).join('');
  }
  // Forgiving: what the screens use. A piece that cannot be drawn shows as its source text.
  function rich(str) {
    if (str === null || str === undefined) return '';
    try { return richStrict(str); } catch (e) { return esc(String(str).replace(/\\?\$/g, '')); }
  }
  function hasMath(str) { try { return split(String(str)).length > 1; } catch (e) { return false; } }

  var api = { tokenize: tokenize, parse: parse, plain: plain, toMathML: toMathML, render: render,
    rich: rich, richStrict: richStrict, richPlain: richPlain, split: split, hasMath: hasMath };
  AT.TeX = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
