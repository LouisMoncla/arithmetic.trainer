// tex.js commands added for the Probability lesson. The old output must not change (tex.test.js, taylor.test.js and
// the Finance tests cover that); here: every command of the bank's list renders, and \frac12-style arguments.
const test = require('node:test');
const assert = require('node:assert');
const T = require('../js/tex.js');

const ml = (tex) => T.toMathML(tex).replace(/^<math[^>]*><mrow>/, '').replace(/<\/mrow><\/math>$/, '');
const plain = (tex) => T.plain(tex);

// Every command of the Probability bank's list (the coach writes cards from this list).
const COMMANDS = [
  String.raw`\frac{a}{b}`, String.raw`\dfrac{a}{b}`, String.raw`\sqrt{x}`, String.raw`\binom{n}{k}`, String.raw`x^2_k`,
  String.raw`\left( x \right)`, String.raw`\left[ x \right]`, String.raw`\left| x \right|`, String.raw`\|X\|_p`, String.raw`\overline{X}`, String.raw`\bar X_n`, String.raw`\mathbf{1}_{\{X > k\}}`,
  String.raw`\sum_{k=0}^{n}`, String.raw`\prod_i`, String.raw`\int_0^\infty`, String.raw`\lim_{n \to \infty}`, String.raw`\limsup_n`, String.raw`\liminf_n`,
  String.raw`\sup_x`, String.raw`\inf_x`, String.raw`\max(a,b)`, String.raw`\min(a,b)`, String.raw`\log x`, String.raw`\exp(x)`,
  String.raw`\mathbb{N} \mathbb{Z} \mathbb{Q} \mathbb{R} \mathbb{E} \mathbb{P}`, String.raw`\mathcal{A} \mathcal{B} \mathcal{F}`, String.raw`\mathrm{Var}`, String.raw`\text{ and }`, String.raw`\operatorname{Cov}`,
  String.raw`\alpha \beta \gamma \delta \varepsilon \lambda \mu \sigma \pi \varphi \phi \theta \omega \Omega \Phi \Gamma`,
  String.raw`\infty \le \ge \ne \approx \sim \to \mapsto \in \notin \subset \subseteq \supseteq`,
  String.raw`\cup \cap \bigcup_n \bigcap_n \setminus \emptyset \mid \cdot \times \cdots \ldots`,
  String.raw`\Rightarrow \Leftarrow \iff \forall \exists \lfloor x \rfloor \lceil x \rceil \pm \partial`,
  String.raw`X^{\prime}`, "F'", String.raw`a\,b\;c\quad d`
];

test('every command of the bank list renders in MathML and in plain text', () => {
  COMMANDS.forEach((c) => {
    assert.doesNotThrow(() => T.toMathML(c), c);
    assert.doesNotThrow(() => plain(c), c);
    assert.ok(!/\\[A-Za-z]/.test(plain(c)), 'no raw command left in the plain text of ' + c + ': ' + plain(c));
  });
});

test('every command listed in the header of proba-cards.js renders (the list the bank is written from)', () => {
  const header = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'proba-cards.js'), 'utf8').split('*/')[0];
  const names = [...new Set([...header.matchAll(/\\([A-Za-z]+)/g)].map((m) => m[1]))];
  const ARGS = { frac: '{a}{b}', dfrac: '{a}{b}', tfrac: '{a}{b}', binom: '{n}{k}', sqrt: '{x}', bar: ' x', overline: '{x}', mathbb: '{N}', mathcal: '{A}', mathbf: '{1}',
    mathrm: '{V}', text: '{a}', operatorname: '{V}', left: '( x \\right)' };
  assert.ok(names.length > 90, 'the header lists the commands: ' + names.length);
  names.filter((n) => n !== 'right' && n !== 'n').forEach((n) => {
    const src = '\\' + n + (ARGS[n] || '');
    assert.doesNotThrow(() => T.toMathML(src), src);
    assert.ok(!/\\[A-Za-z]/.test(plain(src)), src + ' → ' + plain(src));
  });
});

test('fractions take one digit or token when unbraced, as in TeX', () => {
  assert.strictEqual(ml(String.raw`\frac12`), '<mfrac><mn>1</mn><mn>2</mn></mfrac>');
  assert.strictEqual(ml(String.raw`\frac1n`), '<mfrac><mn>1</mn><mi>n</mi></mfrac>');
  assert.strictEqual(ml(String.raw`\frac{a}{b}`), '<mfrac><mi>a</mi><mi>b</mi></mfrac>');
  assert.strictEqual(ml(String.raw`\frac1{n+1}`), '<mfrac><mn>1</mn><mrow><mi>n</mi><mo>+</mo><mn>1</mn></mrow></mfrac>');
  assert.strictEqual(ml(String.raw`\frac{a+1}2`), '<mfrac><mrow><mi>a</mi><mo>+</mo><mn>1</mn></mrow><mn>2</mn></mfrac>');
  assert.strictEqual(ml(String.raw`\frac{1}{2}`), '<mfrac><mn>1</mn><mn>2</mn></mfrac>');
  assert.strictEqual(ml(String.raw`\frac12 x`), '<mrow><mfrac><mn>1</mn><mn>2</mn></mfrac><mi>x</mi></mrow>');
  assert.strictEqual(ml(String.raw`\frac{12}{5}`), '<mfrac><mn>12</mn><mn>5</mn></mfrac>');    // braced numbers stay whole
  assert.strictEqual(ml(String.raw`\frac{0.15}{0.29}`), '<mfrac><mn>0.15</mn><mn>0.29</mn></mfrac>');
  assert.strictEqual(plain(String.raw`\frac12`), '1 / 2');
  assert.strictEqual(plain(String.raw`\frac1n`), '1 / n');
  assert.strictEqual(plain(String.raw`\frac1p + \frac1q`), '1 / p + 1 / q');
  assert.strictEqual(plain(String.raw`\binom{3}{2} \cdot 2^{-3}`), '(3 choose 2) · 2⁻³');
  assert.strictEqual(ml(String.raw`\binom12`), '<mrow><mo>(</mo><mfrac linethickness="0"><mn>1</mn><mn>2</mn></mfrac><mo>)</mo></mrow>');
  assert.strictEqual(plain(String.raw`x^{12}`), 'x¹²');   // an exponent is not a fraction argument: unchanged
  assert.strictEqual(ml(String.raw`x^{10}`), '<msup><mi>x</mi><mn>10</mn></msup>');
  assert.strictEqual(ml(String.raw`\dfrac{a}{b}`), '<mfrac displaystyle="true"><mi>a</mi><mi>b</mi></mfrac>');
});

test('fonts, bars, norms, brackets and symbols read as the bank needs', () => {
  assert.strictEqual(plain(String.raw`\mathbb{P}[X > k]`), 'ℙ[X > k]');
  assert.strictEqual(plain(String.raw`\mathbb{E}[X]\,\mathbb{E}[Y]`), '𝔼[X] 𝔼[Y]');
  assert.strictEqual(plain(String.raw`\mathbb{N}, \mathbb{Z}, \mathbb{Q}, \mathbb{R}`), 'ℕ,ℤ,ℚ,ℝ');
  assert.strictEqual(plain(String.raw`\mathcal{N}(\mu, \sigma^2)`), '𝒩(μ,σ²)');
  assert.strictEqual(plain(String.raw`\mathcal{A}, \mathcal{B}, \mathcal{F}`), '𝒜,ℬ,ℱ');
  assert.strictEqual(plain(String.raw`\mathbf{1}_{\{X > k\}}`), '𝟏_({X > k})');
  assert.strictEqual(plain(String.raw`\mathbb N`), 'ℕ');
  assert.strictEqual(plain(String.raw`\mathrm{Var}(X)`), 'Var(X)');
  assert.strictEqual(plain(String.raw`\bar X_n - m`), 'X̄ₙ − m');
  assert.strictEqual(plain(String.raw`\|X\|_p`), '‖X‖ₚ');
  assert.strictEqual(plain(String.raw`\left\| x \right\|`), '‖x‖');
  assert.strictEqual(plain(String.raw`\lfloor x \rfloor + \lceil y \rceil`), '⌊x⌋ + ⌈y⌉');
  assert.strictEqual(plain(String.raw`A \subseteq B \cup C \setminus D`), 'A ⊆ B ∪ C ∖ D');
  assert.strictEqual(plain(String.raw`X \sim F`), 'X ∼ F');
  assert.strictEqual(plain(String.raw`x \notin \emptyset`), 'x ∉ ∅');
  assert.strictEqual(plain(String.raw`\forall \varepsilon > 0, \exists N`), '∀ε > 0,∃N');
  assert.strictEqual(plain(String.raw`\limsup_{n \to \infty} a_n`), 'limsup_(n → ∞)aₙ');
  assert.strictEqual(plain(String.raw`X^{\prime}`), 'X′');
  assert.strictEqual(plain("F'"), "F'");
  assert.ok(ml(String.raw`\bar X`).includes('<mover accent="true"><mi>X</mi>'));
  assert.ok(ml(String.raw`\overline{A \cup B}`).includes('<mover'));
  assert.ok(/<mo>‖<\/mo>/.test(ml(String.raw`\|X\|`)));
  assert.throws(() => T.toMathML(String.raw`\mathbb{x}`), /cannot draw x/);
  assert.throws(() => T.toMathML(String.raw`\mathbb{}`), /needs a letter/);
  assert.throws(() => T.toMathML(String.raw`\nosuch`), /Unknown command/);
});

test('+∞ after a comma or bracket is a sign; every other plus keeps its old spacing', () => {
  assert.strictEqual(plain(String.raw`[0,+\infty]`), '[0,+∞]');
  assert.strictEqual(plain(String.raw`\int_0^{+\infty} f`), '∫₀^(+∞)f');
  assert.strictEqual(plain(String.raw`x \in [0, -\infty)`), 'x ∈ [0,−∞)');
  assert.ok(ml(String.raw`[0,+\infty]`).includes('<mo form="prefix">+</mo>'));
  assert.strictEqual(plain(String.raw`a + \infty`), 'a + ∞');        // a sum: unchanged
  assert.strictEqual(plain(String.raw`+2\sigma`), '+ 2σ');           // old output, kept byte for byte
});

test('rich text: maths between $…$, the bank cards render with no error', () => {
  assert.doesNotThrow(() => T.richStrict(String.raw`For $X \sim \mathrm{Geo}(p)$, $\mathrm{V}(X) = \frac{1-p}{p^2}$ and a price of \$5.`));
  assert.ok(T.richPlain(String.raw`$\mathbb{P}[A \mid B] \ne \mathbb{P}[A]$`).includes('ℙ[A ∣ B] ≠ ℙ[A]'));
  assert.throws(() => T.richStrict('an unclosed $x'), /Unclosed/);
});
