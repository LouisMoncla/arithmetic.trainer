// js/decks/series.js — Series & limits deck for 103.
// Written by Louis's coach. Do not edit by hand: replace the whole file.
// Sources: Pacard, Analysis (ch. 7, 8, 12.3); Bettinelli, Integration (1.4–1.5); MAA203 probability.
// Order = course order (Learn introduces unseen cards in file order).

AT.registerDeck({
  id: "series", title: "Series & limits", section: "Analysis", idPrefix: "S",
  version: "2026-11-12-v1",
  chapters: { 1: "Usual limits", 2: "Usual series and convergence tests", 3: "Asymptotics", 4: "Improper integrals" },
  scopes: null,
  reference: [
    { title: "(1 + 1/x)^x → e", plot: { fns: [ { f: "(1+1/x)^x" }, { f: "e", dash: true } ], x: [0, 20], y: [0, 3.2], xticks: [[5,"5"],[10,"10"],[15,"15"],[20,"20"]], yticks: [[1,"1"],[2,"2"],[2.71828,"e"]], caption: "y = (1 + 1/x)^x" } },
    { title: "ln x ≪ √x ≪ x at +∞", plot: { fns: [ { f: "ln(x)" }, { f: "sqrt(x)" }, { f: "x", dash: true } ], x: [0, 12], y: [-1, 6], xticks: [[1,"1"],[4,"4"],[9,"9"]], yticks: [[1,"1"],[2,"2"],[3,"3"]], caption: "dashed: x; then √x; lowest: ln x" } },
    { title: "x^3 e^(−x): exponential wins", plot: { fns: [ { f: "x^3*exp(-x)" } ], x: [0, 15], y: [0, 1.6], xticks: [[3,"3"],[10,"10"]], yticks: [[1,"1"]], points: [ { x: 3, y: 1.3443 } ], caption: "y = x³ e^(−x), max at x = 3" } },
    { title: "sin x / x → 1 at 0", plot: { fns: [ { f: "sin(x)/x" } ], x: [-15, 15], y: [-0.4, 1.2], xticks: [[-3.1416,"−π"],[3.1416,"π"]], yticks: [[1,"1"]], points: [ { x: 0, y: 1, open: true } ], caption: "y = sin x / x" } },
    { title: "Σ 1/k vs ∫ dx/x", plot: { fns: [ { f: "1/x" }, { f: "1/floor(x)", dash: true } ], x: [0.8, 8], y: [0, 1.2], xticks: [[1,"1"],[2,"2"],[4,"4"],[8,"8"]], yticks: [[0.5,"1/2"],[1,"1"]], caption: "dashed steps: 1/⌊x⌋ ≥ 1/x, so H_n ≥ ln(n+1)" } },
    { title: "x ln x → 0 at 0⁺", plot: { fns: [ { f: "x*ln(x)" } ], x: [0, 1.5], y: [-0.5, 0.7], xticks: [[0.3679,"1/e"],[1,"1"]], yticks: [[-0.3679,"−1/e"]], points: [ { x: 0, y: 0, open: true } ], caption: "y = x ln x" } }
  ],
  cards: [

    // ================================================================
    // 1 — Usual limits
    // ================================================================

    { id: "S1-one-plus-x-over-n", chapter: 1, game: "formulas", topic: "usual limits",
      prompt: "For $x \\in \\mathbb{R}$, $\\lim_{n \\to \\infty} \\left(1 + \\frac{x}{n}\\right)^n =$ ?",
      answer: "$e^{x}$", distractors: ["$1$", "$+\\infty$", "$e^{-x}$", "$x$"],
      explain: "$n \\ln(1 + x/n) = n\\left(\\frac{x}{n} + o\\left(\\frac1n\\right)\\right) \\to x$. Not $1$: the classic $1^\\infty$ trap.",
      source: "Analysis; TD5 Ex4" },

    { id: "S1-one-plus-2-over-n-3n", chapter: 1, game: "compute", topic: "usual limits",
      prompt: "$\\lim_{n \\to \\infty} \\left(1 + \\frac{2}{n}\\right)^{3n} =$ ? (exact expression allowed, e.g. e^2)",
      answer: 403.4288, answerExpr: "e^6", answerTex: "$e^6$",
      explain: "$3n \\ln(1 + 2/n) \\to 6$.",
      source: "Analysis" },

    { id: "S1-one-minus-1-over-n", chapter: 1, game: "compute", topic: "usual limits",
      prompt: "$\\lim_{n \\to \\infty} \\left(1 - \\frac{1}{n}\\right)^n =$ ? (exact expression allowed)",
      answer: 0.3679, answerExpr: "1/e", answerTex: "$e^{-1}$",
      explain: "Case $x = -1$ of $(1 + x/n)^n \\to e^x$. Same limit for $\\left(\\frac{n}{n+1}\\right)^n$.",
      source: "Analysis" },

    { id: "S1-one-plus-1-over-n2", chapter: 1, game: "compute", topic: "usual limits",
      prompt: "$\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n^2}\\right)^n =$ ?",
      answer: 1,
      explain: "$n \\ln(1 + 1/n^2) \\sim \\frac{1}{n} \\to 0$. The exponent must match the inverse of the small term to get a non-trivial limit.",
      source: "Analysis" },

    { id: "S1-1-infinity-tool", chapter: 1, game: "tool", topic: "usual limits",
      prompt: "Limit of $u_n^{v_n}$ with $u_n \\to 1$ and $v_n \\to \\infty$ (form $1^\\infty$). First move?",
      answer: "Write $u_n^{v_n} = e^{v_n \\ln u_n}$ and use $\\ln(1 + h) \\sim h$",
      distractors: ["$1^\\infty = 1$", "$1^\\infty = +\\infty$", "Take the limit of $u_n$ first, then raise it to $v_n$"],
      explain: "$v_n \\ln u_n \\sim v_n (u_n - 1)$; the limit of that product decides everything.",
      source: "Pacard 12.3" },

    // sample card (kept id)
    { id: "S1-asymptote-e", chapter: 1, game: "formulas", topic: "usual limits",
      prompt: "Horizontal asymptote of the plotted function as $x \\to +\\infty$?",
      plot: { fns: [ { f: "(1+1/x)^x" } ], x: [0, 20], y: [0, 3.2], xticks: [[10,"10"],[20,"20"]], yticks: [[1,"1"],[2,"2"],[3,"3"]], caption: "y = (1 + 1/x)^x" },
      answer: "$y = e$", distractors: ["$y = 1$", "$y = 2$", "$y = 3$"],
      explainPlot: { fns: [ { f: "(1+1/x)^x" }, { f: "e", dash: true } ], x: [0, 20], y: [0, 3.2], yticks: [[2.71828,"e"]], caption: "dashed: y = e" },
      explain: "$(1 + 1/x)^x = e^{x\\ln(1 + 1/x)} \\to e^1$. It increases towards $e \\approx 2.718$ without reaching it.",
      source: "Analysis" },

    { id: "S1-sinx-over-x", chapter: 1, game: "formulas", topic: "usual limits",
      prompt: "$\\lim_{x \\to 0} \\frac{\\sin x}{x} =$ ?",
      plot: { fns: [ { f: "sin(x)/x" } ], x: [-15, 15], y: [-0.4, 1.2], xticks: [[-3.1416,"−π"],[3.1416,"π"]], yticks: [[1,"1"]], points: [ { x: 0, y: 1, open: true } ] },
      answer: "$1$", distractors: ["$0$", "$+\\infty$", "does not exist"],
      explain: "Derivative of $\\sin$ at $0$. At $\\pm\\infty$ it tends to $0$ (bounded over $x$).",
      source: "Pacard ch. 9" },

    { id: "S1-usual-at-0", chapter: 1, game: "formulas", topic: "usual limits",
      prompt: "Which limit at $0$ is WRONG?",
      answer: "$\\frac{1 - \\cos x}{x} \\to 1$",
      distractors: ["$\\frac{\\ln(1+x)}{x} \\to 1$", "$\\frac{e^x - 1}{x} \\to 1$", "$\\frac{1 - \\cos x}{x^2} \\to \\frac12$"],
      explain: "$1 - \\cos x \\sim \\frac{x^2}{2}$, so $\\frac{1 - \\cos x}{x} \\to 0$. The other three are derivatives at $0$ or the order-2 Taylor term.",
      source: "Pacard 12.3" },

    { id: "S1-n-root-n", chapter: 1, game: "formulas", topic: "usual limits",
      prompt: "$\\lim_{n \\to \\infty} n^{1/n} =$ ?",
      answer: "$1$", distractors: ["$e$", "$+\\infty$", "$0$"],
      explain: "$n^{1/n} = e^{\\ln n / n}$ and $\\frac{\\ln n}{n} \\to 0$.",
      source: "Pacard ch. 7" },

    { id: "S1-growth-order", chapter: 1, game: "formulas", topic: "comparative growth",
      prompt: "As $n \\to \\infty$, order from slowest to fastest ($a > 0$, $q > 1$):",
      answer: "$\\ln n$ ≪ $n^a$ ≪ $q^n$ ≪ $n!$ ≪ $n^n$",
      distractors: ["$n^a$ ≪ $\\ln n$ ≪ $q^n$ ≪ $n!$ ≪ $n^n$", "$\\ln n$ ≪ $n^a$ ≪ $n!$ ≪ $q^n$ ≪ $n^n$", "$\\ln n$ ≪ $q^n$ ≪ $n^a$ ≪ $n!$ ≪ $n^n$"],
      explain: "Each ratio tends to $0$: $\\frac{\\ln n}{n^a}$, $\\frac{n^a}{q^n}$, $\\frac{q^n}{n!}$, $\\frac{n!}{n^n}$. Memorise this chain.",
      source: "Pacard ch. 7" },

    { id: "S1-growth-graph", chapter: 1, game: "laws", topic: "comparative growth",
      prompt: "Which curve is $y = \\ln x$?",
      answer: { plot: { fns: [ { f: "ln(x)" } ], x: [0, 12], y: [-2, 6], xticks: [[1,"1"],[10,"10"]], yticks: [[2,"2"],[4,"4"]] } },
      distractors: [
        { plot: { fns: [ { f: "sqrt(x)" } ], x: [0, 12], y: [-2, 6], xticks: [[1,"1"],[10,"10"]], yticks: [[2,"2"],[4,"4"]] } },
        { plot: { fns: [ { f: "exp(x/4)-1" } ], x: [0, 12], y: [-2, 6], xticks: [[1,"1"],[10,"10"]], yticks: [[2,"2"],[4,"4"]] } },
        { plot: { fns: [ { f: "x/2-1" } ], x: [0, 12], y: [-2, 6], xticks: [[1,"1"],[10,"10"]], yticks: [[2,"2"],[4,"4"]] } }
      ],
      explain: "$\\ln$ vanishes at $x = 1$, goes to $-\\infty$ at $0^+$, and grows slower than any power. $\\sqrt x$ starts at $0$ and stays nonnegative.",
      source: "Pacard 11.3" },

    { id: "S1-x-ln-x", chapter: 1, game: "formulas", topic: "comparative growth",
      prompt: "$\\lim_{x \\to 0^+} x \\ln x =$ ?",
      plot: { fns: [ { f: "x*ln(x)" } ], x: [0, 1.5], y: [-0.5, 0.7], xticks: [[1,"1"]], yticks: [[-0.3679,"−1/e"]] },
      answer: "$0$", distractors: ["$-\\infty$", "$-1$", "$-\\frac{1}{e}$"],
      explain: "Powers beat logarithms at $0^+$ too: $x^a |\\ln x|^b \\to 0$ for $a > 0$. $-\\frac1e$ is the minimum (at $x = 1/e$), not the limit.",
      source: "Pacard 11.3" },

    { id: "S1-poly-exp", chapter: 1, game: "truefalse", topic: "comparative growth",
      prompt: "For every $a > 0$, $\\lim_{x \\to +\\infty} x^a e^{-x} = 0$.",
      answer: true,
      plot: { fns: [ { f: "x^3*exp(-x)" } ], x: [0, 15], y: [0, 1.6], xticks: [[3,"3"],[10,"10"]], yticks: [[1,"1"]] },
      explain: "The exponential beats any power. The plot ($a = 3$) rises to a maximum at $x = a$, then collapses.",
      source: "Bettinelli Ex 1.102" },

    { id: "S1-n-fact-over-nn", chapter: 1, game: "formulas", topic: "comparative growth",
      prompt: "$\\lim_{n \\to \\infty} \\frac{n!}{n^n} =$ ?",
      answer: "$0$", distractors: ["$1$", "$\\frac1e$", "$+\\infty$"],
      explain: "$\\frac{n!}{n^n} = \\frac1n \\cdot \\frac2n \\cdots \\frac nn \\le \\frac1n$. ($\\frac1e$ is the limit of the RATIO of consecutive terms.)",
      source: "Pacard ch. 7" },

    { id: "S1-sqrt-diff", chapter: 1, game: "compute", topic: "usual limits",
      prompt: "$\\lim_{n \\to \\infty} \\left(\\sqrt{n^2 - 4n + 5} - \\sqrt{n^2 + n + 2}\\right) =$ ?",
      answer: -2.5,
      hint: "Multiply by the conjugate.",
      explain: "$\\frac{(n^2 - 4n + 5) - (n^2 + n + 2)}{\\sqrt{\\cdots} + \\sqrt{\\cdots}} = \\frac{-5n + 3}{\\sim 2n} \\to -\\frac52$.",
      source: "Pacard Ex 12.9" },

    { id: "S1-conjugate-tool", chapter: 1, game: "tool", topic: "usual limits",
      prompt: "Form $\\infty - \\infty$ with square roots, e.g. $\\sqrt{n^2 + an} - n$. First move?",
      answer: "Multiply and divide by the conjugate $\\sqrt{n^2 + an} + n$",
      distractors: ["Use $\\sqrt{u} - \\sqrt{v} \\sim \\sqrt{u - v}$", "Take logarithms", "Apply the ratio test"],
      explain: "$\\frac{an}{\\sqrt{n^2 + an} + n} \\to \\frac a2$. Or expand $n\\sqrt{1 + a/n} = n + \\frac a2 + o(1)$.",
      source: "Pacard Ex 12.9" },

    { id: "S1-monotone-bounded", chapter: 1, game: "statements", topic: "sequences",
      prompt: "A real sequence that is nondecreasing and bounded above",
      answer: "converges (to its supremum)",
      distractors: ["may diverge", "converges only if it is eventually constant", "converges to its upper bound $M$, whatever bound is chosen"],
      explain: "Monotone convergence theorem, from the least upper bound property. The limit is the sup, not any upper bound.",
      source: "Pacard ch. 7" },

    // ================================================================
    // 2 — Usual series and convergence tests
    // ================================================================

    // sample card (kept id)
    { id: "S2-geometric", chapter: 2, game: "formulas", topic: "usual series",
      prompt: "For $|q| < 1$, $\\sum_{n \\ge 0} q^n =$ ?",
      answer: "$\\frac{1}{1-q}$", distractors: ["$\\frac{q}{1-q}$", "$\\frac{1}{1+q}$", "$\\frac{1}{(1-q)^2}$"],
      explain: "Partial sums $\\frac{1 - q^{N+1}}{1-q}$ and $q^{N+1} \\to 0$. Starting at $n = 1$ gives $\\frac{q}{1-q}$.",
      source: "Analysis" },

    { id: "S2-geometric-diverges", chapter: 2, game: "statements", topic: "usual series",
      prompt: "$\\sum_{n \\ge 0} q^n$ ($q \\in \\mathbb{C}$) converges iff",
      answer: "$|q| < 1$",
      distractors: ["$|q| \\le 1$", "$q < 1$", "$q \\ne 1$"],
      explain: "If $|q| \\ge 1$ the terms do not tend to $0$ (zero test). $q = -1$ oscillates; $q = -2$ blows up.",
      source: "Pacard Ex 8.5" },

    { id: "S2-sum-half", chapter: 2, game: "compute", topic: "usual series",
      prompt: "$\\sum_{n \\ge 0} \\frac{1}{2^n} =$ ?",
      answer: 2,
      explain: "$\\frac{1}{1 - 1/2}$.",
      source: "Analysis" },

    { id: "S2-sum-n-q-n", chapter: 2, game: "formulas", topic: "usual series",
      prompt: "For $|q| < 1$, $\\sum_{n \\ge 1} n q^n =$ ?",
      answer: "$\\frac{q}{(1-q)^2}$",
      distractors: ["$\\frac{1}{(1-q)^2}$", "$\\frac{q}{1-q}$", "$\\frac{q^2}{(1-q)^2}$"],
      explain: "$q \\cdot \\frac{d}{dq}\\frac{1}{1-q}$. For $q = 1/2$: $\\sum \\frac{n}{2^n} = 2$.",
      source: "MAA203 TD3" },

    { id: "S2-sum-n-over-2n", chapter: 2, game: "compute", topic: "usual series",
      prompt: "$\\sum_{n \\ge 1} \\frac{n}{2^n} =$ ?",
      answer: 2,
      explain: "$\\frac{q}{(1-q)^2}$ with $q = \\frac12$: $\\frac{1/2}{1/4} = 2$.",
      source: "Analysis" },

    { id: "S2-exp-series", chapter: 2, game: "formulas", topic: "usual series",
      prompt: "For $x \\in \\mathbb{R}$, $\\sum_{n \\ge 0} \\frac{x^n}{n!} =$ ?",
      answer: "$e^x$", distractors: ["$\\frac{1}{1-x}$", "$e^x - 1$", "$\\operatorname{cosh} x$"],
      explain: "Converges for every $x$ (ratio $\\frac{|x|}{n+1} \\to 0$). Poisson normalisation in probability.",
      source: "Pacard 12.2" },

    { id: "S2-telescoping", chapter: 2, game: "compute", topic: "usual series",
      prompt: "$\\sum_{n \\ge 1} \\frac{1}{n(n+1)} =$ ?",
      answer: 1,
      hint: "$\\frac{1}{n(n+1)} = \\frac1n - \\frac{1}{n+1}$",
      explain: "Telescoping: partial sum $1 - \\frac{1}{N+1} \\to 1$.",
      source: "Pacard Prop 8.7" },

    { id: "S2-telescoping-thm", chapter: 2, game: "statements", topic: "usual series",
      prompt: "If $u_k \\to 0$, then $\\sum_{k \\ge 0} (u_k - u_{k+1})$",
      answer: "converges to $u_0$",
      distractors: ["converges to $0$", "converges only if $\\sum u_k$ converges", "may diverge"],
      explain: "Partial sums $u_0 - u_{N+1} \\to u_0$.",
      source: "Pacard Prop 8.7" },

    // sample card (kept id)
    { id: "S2-harmonic-diverges", chapter: 2, game: "truefalse", topic: "usual series",
      prompt: "$\\sum_{n \\ge 1} \\frac{1}{n}$ converges.",
      answer: false,
      explain: "$\\sum_{k \\le N} \\frac1k \\sim \\ln N \\to \\infty$. Riemann: $\\sum n^{-s}$ converges iff $s > 1$.",
      source: "Analysis; L5" },

    { id: "S2-zero-test", chapter: 2, game: "truefalse", topic: "convergence tests",
      prompt: "If $u_n \\to 0$, then $\\sum u_n$ converges.",
      answer: false,
      explain: "Only the converse holds (zero test: convergent ⇒ $u_n \\to 0$). Harmonic series: $\\frac1n \\to 0$ but diverges.",
      source: "Pacard Cor 8.11" },

    { id: "S2-riemann", chapter: 2, game: "statements", topic: "usual series",
      prompt: "$\\sum_{n \\ge 1} \\frac{1}{n^s}$ converges iff",
      answer: "$s > 1$",
      distractors: ["$s \\ge 1$", "$s > 0$", "$s > 2$"],
      explain: "Integral test against $\\int_1^\\infty x^{-s}dx$. Riemann series are THE comparison scale.",
      source: "Bettinelli Ex 1.122" },

    { id: "S2-basel", chapter: 2, game: "compute", topic: "usual series",
      prompt: "$\\sum_{n \\ge 1} \\frac{1}{n^2} =$ ? (exact expression allowed, e.g. pi^2/3)",
      answer: 1.6449, answerExpr: "pi^2/6", answerTex: "$\\frac{\\pi^2}{6}$",
      explain: "Euler's Basel problem.",
      source: "Analysis; MAA203 L5" },

    { id: "S2-alt-harmonic", chapter: 2, game: "compute", topic: "usual series",
      prompt: "$\\sum_{n \\ge 1} \\frac{(-1)^{n+1}}{n} =$ ? (exact expression allowed)",
      answer: 0.6931, answerExpr: "ln(2)", answerTex: "$\\ln 2$",
      explain: "Converges by the alternating series test (not absolutely). Value: $\\ln(1 + x)$ series at $x = 1$.",
      source: "Analysis" },

    { id: "S2-comparison", chapter: 2, game: "statements", topic: "convergence tests",
      prompt: "Comparison test: $0 \\le a_n \\le b_n$ for $n$ large. Then",
      answer: "$\\sum b_n$ converges ⇒ $\\sum a_n$ converges",
      distractors: ["$\\sum a_n$ converges ⇒ $\\sum b_n$ converges", "$\\sum a_n$ and $\\sum b_n$ have the same sum", "it holds even if $a_n$ takes negative values"],
      explain: "Bounded nondecreasing partial sums. Contrapositive: $\\sum a_n$ diverges ⇒ $\\sum b_n$ diverges. Needs $a_n \\ge 0$.",
      source: "Pacard Prop 8.14" },

    { id: "S2-equivalents-test", chapter: 2, game: "statements", topic: "convergence tests",
      prompt: "$u_n \\sim v_n$ with $v_n > 0$ for $n$ large. Then",
      answer: "$\\sum u_n$ and $\\sum v_n$ are both convergent or both divergent",
      distractors: ["$\\sum u_n = \\sum v_n$ when they converge", "this also holds when $v_n$ changes sign", "$\\sum u_n$ converges iff $u_n \\to 0$"],
      explain: "Positive terms only! For signed terms it fails: $\\frac{(-1)^n}{\\sqrt n}$ and $\\frac{(-1)^n}{\\sqrt n} + \\frac1n$ are equivalent, one converges, the other diverges.",
      source: "Pacard ch. 8; Bettinelli Thm 1.103" },

    { id: "S2-one-minus-cos", chapter: 2, game: "truefalse", topic: "convergence tests",
      prompt: "$\\sum_{n \\ge 1} \\left(1 - \\cos\\frac1n\\right)$ converges.",
      answer: true,
      explain: "$1 - \\cos\\frac1n \\sim \\frac{1}{2n^2} > 0$: Riemann with $s = 2$.",
      source: "Pacard Ex 12.8" },

    { id: "S2-sin-1-over-n", chapter: 2, game: "truefalse", topic: "convergence tests",
      prompt: "$\\sum_{n \\ge 1} \\sin\\frac1n$ converges.",
      answer: false,
      explain: "$\\sin\\frac1n \\sim \\frac1n > 0$: same behaviour as the harmonic series.",
      source: "Analysis" },

    { id: "S2-ln-1-plus", chapter: 2, game: "truefalse", topic: "convergence tests",
      prompt: "$\\sum_{n \\ge 1} \\ln\\left(1 + \\frac1n\\right)$ converges.",
      answer: false,
      explain: "Telescoping: partial sum $\\ln(N + 1) \\to \\infty$. Also $\\sim \\frac1n$.",
      source: "Analysis" },

    { id: "S2-ratio", chapter: 2, game: "statements", topic: "convergence tests",
      prompt: "d'Alembert (ratio) test, $u_n > 0$, $\\frac{u_{n+1}}{u_n} \\to L$. Then",
      answer: "$L < 1$ ⇒ converges; $L > 1$ ⇒ diverges; $L = 1$: no conclusion",
      distractors: ["$L \\le 1$ ⇒ converges; $L > 1$ ⇒ diverges", "$L < 1$ ⇒ converges; $L \\ge 1$ ⇒ diverges", "$L = 1$ ⇒ converges"],
      explain: "$L = 1$ for every Riemann series, convergent ($\\frac{1}{n^2}$) or not ($\\frac1n$).",
      source: "Pacard Prop 8.18" },

    { id: "S2-root", chapter: 2, game: "statements", topic: "convergence tests",
      prompt: "Cauchy (root) test, $u_n \\ge 0$, $u_n^{1/n} \\to L$. Then",
      answer: "$L < 1$ ⇒ converges; $L > 1$ ⇒ diverges; $L = 1$: no conclusion",
      distractors: ["$L \\le 1$ ⇒ converges", "$L < 1$ ⇒ diverges", "$L = 0$ is the only case that converges"],
      explain: "Compare with a geometric series of ratio between $L$ and $1$. Pacard calls it the \"Cauchy criterion\".",
      source: "Pacard Prop 8.17" },

    { id: "S2-ratio-tool", chapter: 2, game: "tool", topic: "convergence tests",
      prompt: "Series with factorials or $n$-th powers, e.g. $\\sum \\frac{n!}{n^n}$ or $\\sum \\frac{n^5}{3^n}$. First test to try?",
      answer: "d'Alembert (ratio) test",
      distractors: ["Comparison with $\\frac1n$", "Alternating series test", "Integral test"],
      explain: "$\\frac{(n+1)!/(n+1)^{n+1}}{n!/n^n} = \\left(\\frac{n}{n+1}\\right)^n \\to \\frac1e < 1$: converges.",
      source: "Pacard Prop 8.18" },

    { id: "S2-ratio-nfact", chapter: 2, game: "compute", topic: "convergence tests",
      prompt: "$u_n = \\frac{n!}{n^n}$. $\\lim \\frac{u_{n+1}}{u_n} =$ ? (exact expression allowed)",
      answer: 0.3679, answerExpr: "1/e", answerTex: "$\\frac1e$",
      explain: "$\\frac{(n+1) \\, n^n}{(n+1)^{n+1}} = \\left(\\frac{n}{n+1}\\right)^n \\to e^{-1} < 1$: the series converges.",
      source: "Analysis" },

    { id: "S2-ratio-inconclusive", chapter: 2, game: "truefalse", topic: "convergence tests",
      prompt: "If $\\frac{u_{n+1}}{u_n} \\to 1$ (with $u_n > 0$), then $\\sum u_n$ diverges.",
      answer: false,
      explain: "No conclusion: $\\frac{1}{n^2}$ (converges) and $\\frac1n$ (diverges) both have ratio $\\to 1$. Switch to comparison/equivalents.",
      source: "Pacard ch. 8" },

    { id: "S2-alternating", chapter: 2, game: "statements", topic: "convergence tests",
      prompt: "Alternating series test: $\\sum (-1)^n a_n$ converges if",
      answer: "$a_n \\ge 0$, $(a_n)$ nonincreasing, and $a_n \\to 0$",
      distractors: ["$a_n \\to 0$ only", "$a_n \\ge 0$ and $\\sum a_n$ diverges", "$|a_{n+1}/a_n| \\to 1$"],
      explain: "Monotonicity matters. Bonus: the error after $N$ terms is at most $a_{N+1}$.",
      source: "Analysis" },

    { id: "S2-abs-implies", chapter: 2, game: "truefalse", topic: "convergence tests",
      prompt: "If $\\sum |u_n|$ converges, then $\\sum u_n$ converges.",
      answer: true,
      explain: "Absolute convergence implies convergence (Cauchy criterion, or split $u_n^+$ and $u_n^-$). The converse is false.",
      source: "Pacard 8.5" },

    { id: "S2-semi-convergent", chapter: 2, game: "laws", topic: "convergence tests",
      prompt: "$\\sum_{n \\ge 1} \\frac{(-1)^n}{\\sqrt n}$ is",
      answer: "convergent but not absolutely convergent",
      distractors: ["absolutely convergent", "divergent", "convergent with sum $0$"],
      explain: "Alternating test gives convergence; $\\sum \\frac{1}{\\sqrt n}$ diverges (Riemann, $s = \\frac12$).",
      source: "Analysis" },

    { id: "S2-tests-classify", chapter: 2, game: "laws", topic: "convergence tests",
      prompt: "Which series DIVERGES?",
      answer: "$\\sum \\frac{1}{n \\ln n}$",
      distractors: ["$\\sum \\frac{1}{n (\\ln n)^2}$", "$\\sum \\frac{n^5}{3^n}$", "$\\sum \\frac{1}{n^{1.01}}$"],
      explain: "Bertrand: $\\sum \\frac{1}{n(\\ln n)^\\beta}$ converges iff $\\beta > 1$ (integral test: $\\int \\frac{dx}{x \\ln x} = \\ln\\ln x$).",
      source: "Bettinelli Prop 1.107" },

    { id: "S2-integral-test", chapter: 2, game: "statements", topic: "convergence tests",
      prompt: "Integral test: $f : [m, \\infty) \\to [0, \\infty)$ continuous. $\\sum f(n)$ and $\\int_m^\\infty f$ have the same nature when $f$ is",
      answer: "nonincreasing",
      distractors: ["bounded", "integrable on every segment", "positive and convex"],
      explain: "$\\int_n^{n+1} f \\le f(n) \\le \\int_{n-1}^n f$ needs $f$ decreasing. Gives Riemann and Bertrand series.",
      source: "Pacard Prop 8.15" },

    // ================================================================
    // 3 — Asymptotics
    // ================================================================

    { id: "S3-landau-defs", chapter: 3, game: "statements", topic: "Landau",
      prompt: "$u_n \\sim v_n$ (with $v_n \\ne 0$ for $n$ large) means",
      answer: "$\\frac{u_n}{v_n} \\to 1$, i.e. $u_n = v_n + o(v_n)$",
      distractors: ["$u_n - v_n \\to 0$", "$u_n = O(v_n)$", "$\\frac{u_n}{v_n}$ is bounded"],
      explain: "$u_n - v_n \\to 0$ is different: $n^2 + n$ and $n^2$ are equivalent but their difference $\\to \\infty$.",
      source: "Bettinelli 1.4" },

    { id: "S3-diff-not-equiv", chapter: 3, game: "truefalse", topic: "Landau",
      prompt: "If $u_n \\sim v_n$, then $u_n - v_n \\to 0$.",
      answer: false,
      explain: "$n^2 + n \\sim n^2$ but the difference is $n$. Equivalence is about the RATIO.",
      source: "Bettinelli 1.4" },

    { id: "S3-sum-equivalents", chapter: 3, game: "truefalse", topic: "Landau",
      prompt: "If $a_n \\sim b_n$ and $c_n \\sim d_n$, then $a_n - c_n \\sim b_n - d_n$.",
      answer: false,
      explain: "$a_n = n + 1$, $b_n = n$, $c_n = d_n = n$: left side $1$, right side $0$. Equivalents multiply and divide, never add or subtract.",
      source: "Bettinelli 1.4" },

    { id: "S3-product-equivalents", chapter: 3, game: "truefalse", topic: "Landau",
      prompt: "If $a_n \\sim b_n$ and $c_n \\sim d_n$, then $a_n c_n \\sim b_n d_n$ and $\\frac{a_n}{c_n} \\sim \\frac{b_n}{d_n}$.",
      answer: true,
      explain: "Ratios multiply. This is why equivalents work in products and quotients only.",
      source: "Bettinelli 1.4" },

    { id: "S3-usual-equivalents", chapter: 3, game: "formulas", topic: "Landau",
      prompt: "As $x \\to 0$, which equivalent is WRONG?",
      answer: "$\\tan x - \\sin x \\sim 0$",
      distractors: ["$\\ln(1+x) \\sim x$", "$(1+x)^a - 1 \\sim a x$", "$1 - \\cos x \\sim \\frac{x^2}{2}$"],
      explain: "Nothing is equivalent to $0$. In fact $\\tan x - \\sin x \\sim \\frac{x^3}{2}$: go to the first non-cancelling Taylor term.",
      source: "Pacard 12.3" },

    { id: "S3-taylor-limit-tool", chapter: 3, game: "tool", topic: "Taylor limits",
      prompt: "Limit at $0$ where first-order equivalents cancel, e.g. $\\frac{\\sin x - x}{x^3}$. First move?",
      answer: "Taylor-expand numerator and denominator to the first order that does not cancel",
      distractors: ["Replace $\\sin x$ by its equivalent $x$", "L'Hôpital once", "Squeeze between $-1$ and $1$"],
      explain: "$\\sin x - x = -\\frac{x^3}{6} + o(x^3)$, so the limit is $-\\frac16$. Replacing $\\sin x$ by $x$ gives $\\frac{0}{x^3}$: wrong.",
      source: "Pacard 12.3.2" },

    { id: "S3-sin-minus-x", chapter: 3, game: "compute", topic: "Taylor limits",
      prompt: "$\\lim_{x \\to 0} \\frac{\\sin x - x}{x^3} =$ ? (fraction or decimal)",
      answer: -0.16667, answerExpr: "-1/6", tol: 0.001,
      explain: "$\\sin x = x - \\frac{x^3}{6} + o(x^3)$.",
      source: "Pacard 12.3" },

    { id: "S3-ln-minus-x", chapter: 3, game: "compute", topic: "Taylor limits",
      prompt: "$\\lim_{x \\to 0} \\frac{\\ln(1+x) - x}{x^2} =$ ? (fraction or decimal)",
      answer: -0.5,
      explain: "$\\ln(1+x) = x - \\frac{x^2}{2} + o(x^2)$.",
      source: "Pacard 12.3" },

    { id: "S3-exp-cos", chapter: 3, game: "compute", topic: "Taylor limits",
      prompt: "$\\lim_{x \\to 0} \\frac{(e^x - 1)^2}{1 - \\cos x} =$ ?",
      answer: 2,
      explain: "$(e^x - 1)^2 \\sim x^2$ and $1 - \\cos x \\sim \\frac{x^2}{2}$: products and quotients of equivalents are fine.",
      source: "Pacard 12.3.2" },

    { id: "S3-n-e-1-over-n", chapter: 3, game: "compute", topic: "Taylor limits",
      prompt: "$\\lim_{n \\to \\infty} n\\left(e^{1/n} - 1\\right) =$ ?",
      answer: 1,
      explain: "$e^{h} - 1 \\sim h$ with $h = \\frac1n$.",
      source: "Analysis" },

    { id: "S3-asymptote", chapter: 3, game: "formulas", topic: "asymptotic expansions",
      prompt: "Oblique asymptote of $f(x) = \\sqrt{x^2 + x + 1}$ at $+\\infty$?",
      plot: { fns: [ { f: "sqrt(x^2+x+1)" } ], x: [0, 8], y: [0, 9], xticks: [[2,"2"],[4,"4"],[6,"6"]], yticks: [[2,"2"],[4,"4"],[6,"6"]] },
      answer: "$y = x + \\frac12$",
      distractors: ["$y = x$", "$y = x + 1$", "$y = x + \\frac{1}{2x}$"],
      explainPlot: { fns: [ { f: "sqrt(x^2+x+1)" }, { f: "x+1/2", dash: true } ], x: [0, 8], y: [0, 9], xticks: [[2,"2"],[4,"4"],[6,"6"]], yticks: [[2,"2"],[4,"4"],[6,"6"]], caption: "dashed: y = x + 1/2" },
      explain: "$x\\sqrt{1 + h + h^2}$ with $h = \\frac1x$: $= x + \\frac12 + \\frac{3}{8x} + o\\left(\\frac1x\\right)$. The curve lies above the asymptote.",
      source: "Pacard 12.3.3" },

    { id: "S3-harmonic", chapter: 3, game: "formulas", topic: "asymptotic expansions",
      prompt: "$H_n = \\sum_{k=1}^n \\frac1k =$ ?",
      answer: "$\\ln n + \\gamma + o(1)$, $\\gamma \\approx 0.577$",
      distractors: ["$\\ln n + o(1)$", "$\\frac{\\pi^2}{6} + o(1)$", "$\\sqrt n + O(1)$"],
      explain: "$H_n - \\ln n$ decreases and is bounded below, so it converges to Euler's constant $\\gamma$.",
      source: "MAA203 L5; Bettinelli 1.5.4" },

    { id: "S3-stirling", chapter: 3, game: "formulas", topic: "asymptotic expansions",
      prompt: "Stirling's formula: $n! \\sim$ ?",
      answer: "$\\sqrt{2\\pi n}\\left(\\frac{n}{e}\\right)^n$",
      distractors: ["$\\left(\\frac{n}{e}\\right)^n$", "$\\sqrt{n}\\left(\\frac{n}{e}\\right)^n$", "$\\sqrt{2\\pi n}\\, n^n$"],
      explain: "Equivalent, so the $\\sqrt{2\\pi n}$ cannot be dropped. Already at $n = 50$ the ratio is $1.0017$.",
      source: "Analysis" },

    { id: "S3-ln-factorial", chapter: 3, game: "formulas", topic: "asymptotic expansions",
      prompt: "$\\ln(n!) \\sim$ ?",
      answer: "$n \\ln n$",
      distractors: ["$\\ln n$", "$n$", "$n^2$"],
      explain: "From Stirling, $\\ln n! = n \\ln n - n + O(\\ln n)$; or compare $\\sum \\ln k$ with $\\int_1^n \\ln x\\,dx$.",
      source: "Analysis" },

    { id: "S3-binomial-approx", chapter: 3, game: "formulas", topic: "asymptotic expansions",
      prompt: "For fixed $k$, as $n \\to \\infty$, $\\binom{n}{k} \\sim$ ?",
      answer: "$\\frac{n^k}{k!}$",
      distractors: ["$n^k$", "$\\frac{n^k}{k}$", "$k^n$"],
      explain: "$\\frac{n(n-1)\\cdots(n-k+1)}{k!}$ and each factor $\\sim n$. This is the step in the law of small numbers.",
      source: "MAA203 L3" },

    // ================================================================
    // 4 — Improper integrals and series–integral comparison
    // ================================================================

    { id: "S4-riemann-infinity", chapter: 4, game: "statements", topic: "improper integrals",
      prompt: "$\\int_1^{+\\infty} \\frac{dx}{x^\\alpha}$ converges iff",
      answer: "$\\alpha > 1$",
      distractors: ["$\\alpha < 1$", "$\\alpha \\ge 1$", "$\\alpha > 0$"],
      explain: "Antiderivative $\\frac{x^{1-\\alpha}}{1-\\alpha}$ (or $\\ln x$ for $\\alpha = 1$). Same threshold as Riemann series.",
      source: "Bettinelli Prop 1.106" },

    { id: "S4-riemann-zero", chapter: 4, game: "statements", topic: "improper integrals",
      prompt: "$\\int_0^1 \\frac{dx}{x^\\alpha}$ converges iff",
      answer: "$\\alpha < 1$",
      distractors: ["$\\alpha > 1$", "$\\alpha \\le 1$", "$\\alpha > 0$"],
      explain: "Opposite of the case at $+\\infty$. $\\alpha = 1$ diverges at both ends: $\\int_0^\\infty \\frac{dx}{x^\\alpha}$ never converges.",
      source: "Bettinelli Prop 1.106" },

    { id: "S4-inv-sqrt", chapter: 4, game: "compute", topic: "improper integrals",
      prompt: "$\\int_0^1 \\frac{dx}{\\sqrt x} =$ ?",
      answer: 2,
      explain: "$[2\\sqrt x]_0^1 = 2$: an unbounded integrand can have a finite integral.",
      source: "Bettinelli 1.5" },

    { id: "S4-ln-integral", chapter: 4, game: "compute", topic: "improper integrals",
      prompt: "$\\int_0^1 \\ln x\\,dx =$ ?",
      answer: -1,
      explain: "Antiderivative $x \\ln x - x$, and $x \\ln x \\to 0$ at $0^+$.",
      source: "Bettinelli 1.5" },

    { id: "S4-gamma-integral", chapter: 4, game: "formulas", topic: "improper integrals",
      prompt: "For $n \\in \\mathbb{N}$, $\\int_0^{+\\infty} t^n e^{-t}\\,dt =$ ?",
      answer: "$n!$",
      distractors: ["$(n-1)!$", "$\\frac{1}{n+1}$", "$+\\infty$"],
      explain: "Integrate by parts: $I_n = n I_{n-1}$, $I_0 = 1$. Also gives $\\mathbb{E}[X^n] = \\frac{n!}{\\lambda^n}$ for $\\mathrm{Exp}(\\lambda)$.",
      source: "Bettinelli Ex 1.102" },

    { id: "S4-comparison", chapter: 4, game: "tool", topic: "improper integrals",
      prompt: "$f \\ge 0$. To decide whether $\\int_1^\\infty f$ converges, the standard move is",
      answer: "Find an equivalent of $f$ at $+\\infty$ and compare with $\\frac{1}{x^\\alpha}$",
      distractors: ["Check that $f(x) \\to 0$", "Compute an antiderivative in every case", "Check that $f$ is bounded"],
      explain: "Refined comparison for nonnegative functions: equivalent ⇒ same nature. $f \\to 0$ is not enough ($\\frac1x$).",
      source: "Bettinelli Thm 1.103" },

    { id: "S4-bertrand", chapter: 4, game: "statements", topic: "improper integrals",
      prompt: "$\\int_e^{+\\infty} \\frac{dx}{x^\\alpha (\\ln x)^\\beta}$ converges iff",
      answer: "$\\alpha > 1$, or $\\alpha = 1$ and $\\beta > 1$",
      distractors: ["$\\alpha > 1$ only", "$\\alpha + \\beta > 1$", "$\\alpha \\ge 1$ and $\\beta \\ge 1$"],
      explain: "Bertrand: the log only matters at the borderline $\\alpha = 1$, where $\\int \\frac{dx}{x (\\ln x)^\\beta} = \\int \\frac{du}{u^\\beta}$ with $u = \\ln x$.",
      source: "Bettinelli Prop 1.107" },

    { id: "S4-abs-integrable", chapter: 4, game: "truefalse", topic: "improper integrals",
      prompt: "If $\\int |f|$ converges then $\\int f$ converges, and the converse is also true.",
      answer: false,
      explain: "Absolute ⇒ convergence, not the converse: $\\int_1^\\infty \\frac{\\sin t}{t}\\,dt$ converges (Abel) but $\\int_1^\\infty \\frac{|\\sin t|}{t}\\,dt = \\infty$.",
      source: "Bettinelli Thm 1.111, Ex 1.114" },

    { id: "S4-abel", chapter: 4, game: "tool", topic: "improper integrals",
      prompt: "Oscillating integrand, e.g. $\\int_1^\\infty \\frac{\\sin t}{t}\\,dt$. Tool to prove convergence?",
      answer: "Integration by parts (Abel): $\\frac{1}{t}$ decreases to $0$ and $\\int \\sin$ is bounded",
      distractors: ["Comparison with $\\frac1t$", "Bound $|\\sin t| \\le 1$ and compare", "Equivalent at $+\\infty$"],
      explain: "Comparisons need nonnegative integrands; here the sign changes. IBP turns $\\frac{\\sin t}{t}$ into $\\frac{\\cos t}{t^2}$, absolutely integrable.",
      source: "Bettinelli Thm 1.115" },

    { id: "S4-series-integral", chapter: 4, game: "formulas", topic: "series vs integrals",
      prompt: "$f$ nonincreasing on $[1, \\infty)$. Which framing holds for $n \\ge 2$?",
      plot: { fns: [ { f: "1/x" }, { f: "1/floor(x)", dash: true } ], x: [0.8, 8], y: [0, 1.2], xticks: [[1,"1"],[2,"2"],[4,"4"],[8,"8"]], yticks: [[0.5,"1/2"],[1,"1"]], caption: "1/x and the steps 1/⌊x⌋" },
      answer: "$\\int_1^{n+1} f \\le \\sum_{k=1}^n f(k) \\le f(1) + \\int_1^n f$",
      distractors: ["$\\sum_{k=1}^n f(k) \\le \\int_1^{n+1} f$", "$\\sum_{k=1}^n f(k) = \\int_1^n f$", "$\\int_1^n f \\le \\sum_{k=2}^n f(k)$"],
      explain: "On $[k, k+1]$, $f(k+1) \\le f \\le f(k)$. With $f = \\frac1x$: $\\ln(n+1) \\le H_n \\le 1 + \\ln n$.",
      source: "Bettinelli Prop 1.120" },

    { id: "S4-harmonic-bounds", chapter: 4, game: "proof", topic: "series vs integrals",
      prompt: "Key step to show $H_n \\sim \\ln n$?",
      answer: "Frame each $\\frac1k$ between $\\int_k^{k+1}\\frac{dx}{x}$ and $\\int_{k-1}^k \\frac{dx}{x}$, then sum",
      distractors: ["Ratio test on $\\frac1k$", "Stirling's formula", "Taylor-expand $\\ln(1 + 1/k)$ to order 1 only"],
      explain: "Gives $\\ln(n+1) \\le H_n \\le 1 + \\ln n$; divide by $\\ln n$.",
      source: "Bettinelli 1.5.4" }
  ]
});
