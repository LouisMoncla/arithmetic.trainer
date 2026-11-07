// js/tex.js: the LaTeX subset → MathML converter behind the Finance formula line.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/tex.js');
const F = require('../js/finance-templates.js');

// The MathML inside <math><mrow>…</mrow></math> (and the row of a multi-part formula).
const m = (tex) => {
  const inner = T.toMathML(tex).replace(/^<math[^>]*><mrow>/, '').replace(/<\/mrow><\/math>$/, '');
  return T.parse(tex).c.length > 1 ? inner.replace(/^<mrow>/, '').replace(/<\/mrow>$/, '') : inner;
};

test('numbers, letters, operators and a typographic minus', () => {
  assert.equal(m('2ab + 15.87'), '<mn>2</mn><mi>a</mi><mi>b</mi><mo>+</mo><mn>15.87</mn>');
  assert.equal(m('1 - x'), '<mn>1</mn><mo>−</mo><mi>x</mi>');
  assert.equal(m('a \\times b \\approx c'), '<mi>a</mi><mo>×</mo><mi>b</mi><mo>≈</mo><mi>c</mi>');
});

test('fractions, roots, scripts and groups', () => {
  assert.equal(m('\\frac{C}{1 + r}'), '<mfrac><mi>C</mi><mrow><mn>1</mn><mo>+</mo><mi>r</mi></mrow></mfrac>');
  assert.equal(m('\\tfrac{1}{2}'), '<mfrac><mn>1</mn><mn>2</mn></mfrac>');
  assert.equal(m('\\sqrt{252}'), '<msqrt><mn>252</mn></msqrt>');
  assert.equal(m('x^2'), '<msup><mi>x</mi><mn>2</mn></msup>');
  assert.equal(m('r_A'), '<msub><mi>r</mi><mi>A</mi></msub>');
  assert.equal(m('\\sigma_1^2'), '<msubsup><mi>σ</mi><mn>1</mn><mn>2</mn></msubsup>');
  assert.equal(m('e^{-rt}'), '<msup><mi>e</mi><mrow><mo form="prefix">−</mo><mi>r</mi><mi>t</mi></mrow></msup>');
  // a power after a bracket applies to the whole bracket; plain brackets do not stretch
  assert.equal(m('(1 + r)^t'), '<msup><mrow><mo stretchy="false">(</mo><mn>1</mn><mo>+</mo><mi>r</mi><mo stretchy="false">)</mo></mrow><mi>t</mi></msup>');
  assert.equal(m('x = -y'), '<mi>x</mi><mo>=</mo><mo form="prefix">−</mo><mi>y</mi>');
  assert.equal(m('a - b'), '<mi>a</mi><mo>−</mo><mi>b</mi>');
  assert.equal(m('\\sum_{j=0}^{k}'), '<msubsup><mo>∑</mo><mrow><mi>j</mi><mo>=</mo><mn>0</mn></mrow><mi>k</mi></msubsup>');
});

test('words, Greek, functions, spaces, delimiters', () => {
  assert.equal(m('\\text{VaR}_\\alpha'), '<msub><mtext>VaR</mtext><mi>α</mi></msub>');
  assert.equal(m('\\text{ of }'), '<mtext> of </mtext>');
  assert.equal(m('\\Delta y'), '<mi mathvariant="normal">Δ</mi><mi>y</mi>');
  assert.equal(m('\\ln(x)'), '<mi>ln</mi><mrow><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo></mrow>');
  assert.equal(m('(a'), '<mo stretchy="false">(</mo><mi>a</mi>');   // unmatched bracket: kept as is
  assert.equal(m('a\\,b\\;c\\ d'), '<mi>a</mi><mspace width="0.17em"></mspace><mi>b</mi><mspace width="0.28em"></mspace><mi>c</mi><mspace width="0.25em"></mspace><mi>d</mi>');
  assert.equal(m('\\left(x\\right)^2'), '<msup><mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow><mn>2</mn></msup>');
  assert.equal(m('15\\%'), '<mn>15</mn><mo>%</mo>');
  assert.equal(m('w^\\top'), '<msup><mi>w</mi><mo>⊤</mo></msup>');
});

test('HTML-special characters are escaped', () => {
  assert.equal(m('c < y'), '<mi>c</mi><mo>&lt;</mo><mi>y</mi>');
  assert.equal(m('\\text{a<b & "c"}'), '<mtext>a&lt;b &amp; &quot;c&quot;</mtext>');
  assert.match(T.toMathML('x', 'a < "b"'), /^<math alttext="a &lt; &quot;b&quot;"><mrow><mi>x<\/mi><\/mrow><\/math>$/);
});

test('bad input throws, and render falls back to the plain formula', () => {
  for (const bad of ['\\frac{a}', '{a', 'a}', '\\unknown', 'x^2^3', '^2', '\\text{oops', '\\sqrt', '\\left( x', '\\right)', '\\left x\\right)']) assert.throws(() => m(bad), Error, bad);
  assert.equal(T.render('\\unknown', 'P = 1 < 2'), '<span class="num">P = 1 &lt; 2</span>');
  assert.equal(T.render('', 'plain'), '<span class="num">plain</span>');
  assert.equal(T.render('', ''), '');
  assert.match(T.render('x^2', 'x^2'), /^<span class="tex"><math alttext="x²">/);   // alttext = the plain twin
});

test('every quant and finance template has a formula that converts', () => {
  for (const t of F.list().filter((x) => x.family === 'quant' || x.family === 'fin')) {
    assert.ok(t.tex, 'no tex for ' + t.id);
    assert.ok(t.formula, 'no plain formula for ' + t.id);
    const out = T.toMathML(t.tex, t.formula);
    assert.match(out, /^<math alttext="[^"]+"><mrow>.+<\/mrow><\/math>$/, t.id);
    assert.ok(!out.includes('\\'), 'raw command left in ' + t.id);
    assert.equal(F.make(t.id, 1).tex, t.tex, 'F.make carries the formula for ' + t.id);
  }
});

// ---------- plain-text twin and rich text ----------

test('plain text: fractions, scripts, roots, Greek, spacing', () => {
  assert.equal(T.plain('\\text{PV} = \\frac{C}{(1 + r)^t}'), 'PV = C / (1 + r)ᵗ');
  assert.equal(T.plain('\\frac{1000}{1.07122} = 933.51'), '1000 / 1.07122 = 933.51');
  assert.equal(T.plain('\\frac{a + b}{2}'), '(a + b) / 2');
  assert.equal(T.plain('\\sigma_{\\text{day}} \\sqrt{252}'), 'σ_day√252');
  assert.equal(T.plain('\\sqrt{x + 1}'), '√(x + 1)');
  assert.equal(T.plain('\\sigma_1^2 + x_i'), 'σ₁² + xᵢ');
  assert.equal(T.plain('2^{10 + k}'), '2¹⁰⁺ᵏ');      // every character has a superscript form
  assert.equal(T.plain('2^{10 + m}'), '2^(10 + m)');   // m has none: caret form
  assert.equal(T.plain('e^{-rt}'), 'e^(−rt)');   // r has no superscript letter, so the caret form
  assert.equal(T.plain('x = -y'), 'x = −y');
  assert.equal(T.plain('a - b'), 'a − b');
  assert.equal(T.plain('\\text{E}[X \\mid Y = y] = \\rho\\, y'), 'E[X ∣ Y = y] = ρ y');
  assert.equal(T.plain('15\\% \\times 40'), '15% × 40');
  assert.equal(T.plain('56 ÷ 7'), '56 ÷ 7');
  assert.equal(T.plain('w^\\top \\Sigma w'), 'wᵀΣw');
});

test('plain text never contains LaTeX left-overs', () => {
  for (const src of ['\\frac{\\varphi(z_\\alpha)}{1 - \\alpha}', '\\left(\\frac{x_i}{\\sigma_i}\\right)^2', '\\sum_{j=0}^{k} C(k, j)\\, r^j', '\\tfrac{1}{2}\\, C\\, \\Delta y^2']) {
    const p = T.plain(src);
    assert.ok(!/[\\{}$]/.test(p), src + ' → ' + p);
  }
});

test('rich text: prose escaped, maths drawn, plain twin', () => {
  const s = 'Price <b> with $\\sigma = 2\\%$ & $x^2$.';
  const html = T.richStrict(s);
  assert.match(html, /^Price &lt;b&gt; with <span class="tex tex-i"><math alttext="σ = 2%"><mrow>.*<\/math><\/span> &amp; <span class="nobr"><span class="tex tex-i"><math alttext="x²">.*<\/math><\/span>\.<\/span>$/);   // the final full stop stays with its formula
  assert.equal(T.richPlain(s), 'Price <b> with σ = 2% & x².');
  assert.equal(T.richPlain('costs \\$5 or $x$'), 'costs $5 or x');
  assert.equal(T.richPlain('no maths'), 'no maths');
  assert.throws(() => T.richStrict('open $x'), /Unclosed/);
  assert.equal(T.rich('open $x'), 'open x');           // the screens never break: source text without $
  assert.equal(T.rich('bad $\\nope$'), 'bad \\nope');
  assert.ok(T.hasMath('a $b$') && !T.hasMath('a b'));
});

// ---------- every piece of Finance maths is drawn as maths ----------

const FB = require('../js/finance-bank.js');
// Maths written as plain text: Greek, scripts, roots, ^ or _, a letter equation, a fraction a/b, E[…] or Var[…].
const LOOSE = /[αβγδεθλμπρστφϕℓΔΣΦ²³⁰-⁹₀-₉ᵀ√^_]|(^|[\s(])[A-Za-z]\s*[=<>≈≤≥]\s|\d\s*\/\s*\d|\b(E|Var)\[/;
function outside(str) { return T.split(str).filter((_, i) => i % 2 === 0).join(' '); }

test('every prompt, step, why, option and explanation: maths inside $…$, and it all parses', () => {
  const problems = [];
  for (const t of FB.list()) {
    for (let seed = 1; seed <= 50; seed++) {
      const q = FB.make(t.id, seed);
      const texts = [['prompt', q.prompt], ['why', q.why]].concat(q.steps.map((s, i) => ['step ' + (i + 1), s]));
      if (t.kind === 'choice') q.options.forEach((o, i) => texts.push(['option ' + (i + 1), o]));
      for (const [where, s] of texts) {
        if (!s) continue;
        try { T.richStrict(s); } catch (e) { problems.push(`${t.id} #${seed} ${where}: ${e.message}`); continue; }
        // arithmetic tips come from the Play tab (numbers only) and are left as they are
        if (t.family === 'arith' && where.startsWith('step')) continue;
        const m = LOOSE.exec(outside(s));
        if (m) problems.push(`${t.id} #${seed} ${where}: "${m[0]}" outside $…$ in: ${s}`);
      }
      if (t.family === 'intuition') break;   // curated: the same text for every seed
    }
  }
  assert.deepEqual([...new Set(problems)].slice(0, 15), []);
});

test('prompts that are maths are drawn as maths', () => {
  for (const id of ['quant.square', 'quant.pow2', 'quant.sqrt.approx', 'quant.compound', 'quant.ln.approx', 'quant.exp.approx', 'quant.mul.trick', 'quant.frac.dec', 'arith.add', 'arith.div']) {
    assert.ok(T.hasMath(FB.make(id, 1).prompt), id);
  }
  const q = FB.make('quant.pow2', 7);
  assert.match(q.promptText, /^2[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/);
});
