// The 25 sample Probability cards of the spec (a copy of js/proba-cards.js as shipped on 2026-11-12), so tests do not
// depend on the real bank, which will grow. E2E passes them as window.AT_PROBA_FIXTURE.
module.exports = [
 {
  "id": "L1-fubini-positive-hyp",
  "lecture": 1,
  "game": "statements",
  "topic": "Fubini",
  "prompt": "Fubini for nonnegative functions: which extra hypothesis is needed to swap the two integrals of $f \\ge 0$?",
  "answer": "None: both orders give the same value in $[0,+\\infty]$",
  "distractors": [
   "$\\int\\int |f| < \\infty$",
   "$f$ bounded",
   "$f$ continuous with compact support"
  ],
  "explain": "Positive case: no integrability needed; the common value may be $+\\infty$. Integrability is the hypothesis of Fubini–Tonelli for signed $f$.",
  "source": "L1 slides"
 },
 {
  "id": "L1-double-series-swap",
  "lecture": 1,
  "game": "truefalse",
  "topic": "series",
  "prompt": "For a double series $\\sum_m \\sum_n a_{m,n}$ with terms of any sign, swapping the order of summation never changes the value.",
  "answer": false,
  "explain": "Slide counterexample: $a_{n,n}=1$, $a_{n,n+1}=-1$ gives $0$ in one order and $1$ in the other. Swapping is free only for nonnegative terms (or absolutely summable ones).",
  "source": "L1 slides"
 },
 {
  "id": "L1-cantor",
  "lecture": 1,
  "game": "truefalse",
  "topic": "countability",
  "prompt": "$\\{0,1\\}^{\\mathbb{N}}$ is countable.",
  "answer": false,
  "explain": "Cantor's diagonal argument: from any list $(u_n)$ build $v(k)=1-u_k(k)$, which is in none of the $u_n$.",
  "source": "L1 slides; TD1 Ex2"
 },
 {
  "id": "L2-pairwise-mutual",
  "lecture": 2,
  "game": "truefalse",
  "topic": "independence",
  "prompt": "If $A$, $B$, $C$ are pairwise independent, then they are mutually independent.",
  "answer": false,
  "explain": "$X_1, X_2$ independent fair $\\pm 1$, $Y_3 = X_1 X_2$: each pair is independent but $\\mathbb{P}[Y_1=1, Y_2=1, Y_3=-1] = 0 \\ne 1/8$.",
  "source": "TD2 Ex6"
 },
 {
  "id": "L2-taxi",
  "lecture": 2,
  "game": "compute",
  "topic": "Bayes",
  "prompt": "85% of taxis are white, 15% yellow. A witness identifies colours correctly with probability $0.8$ and says the taxi was yellow. $\\mathbb{P}[\\text{yellow} \\mid \\text{says yellow}]$? (3 decimals)",
  "answer": 0.4138,
  "tol": 0.002,
  "hint": "Bayes: $\\dfrac{0.15 \\cdot 0.8}{0.15 \\cdot 0.8 + 0.85 \\cdot 0.2}$",
  "explain": "$\\frac{0.12}{0.12 + 0.17} = \\frac{12}{29} \\approx 0.414$. The base rate dominates: it is still more likely white.",
  "source": "TD2 Ex5"
 },
 {
  "id": "L2-total-prob-tool",
  "lecture": 2,
  "game": "tool",
  "topic": "conditioning",
  "prompt": "A die is chosen at random (6 faces or 12 faces), then rolled $n$ times. Goal: $\\mathbb{P}[\\text{all rolls give } 3]$. First move?",
  "answer": "Law of total probability over the partition {6-face die, 12-face die}",
  "distractors": [
   "Bayes' formula",
   "Independence of the rolls, so $(1/6)^n$",
   "Inclusion–exclusion over the rolls"
  ],
  "explain": "Condition on the die: $\\frac12 \\cdot 6^{-n} + \\frac12 \\cdot 12^{-n}$. The rolls are independent only given the die.",
  "source": "TD2 Ex4"
 },
 {
  "id": "L3-geo-var",
  "lecture": 3,
  "game": "laws",
  "topic": "discrete laws",
  "prompt": "$X \\sim \\mathrm{Geo}(p)$ (course convention: values in $\\{1,2,\\ldots\\}$). $\\mathrm{V}(X) =$ ?",
  "answer": "$\\frac{1-p}{p^2}$",
  "distractors": [
   "$\\frac{1-p}{p}$",
   "$\\frac{1}{p^2}$",
   "$\\frac{p}{(1-p)^2}$",
   "$\\frac{1}{p}$"
  ],
  "explain": "$\\mathbb{E}[X] = 1/p$ and $\\mathbb{E}[X^2] = (2-p)/p^2$, so $\\mathrm{V}(X) = (1-p)/p^2$.",
  "source": "L3; TD3 Ex6"
 },
 {
  "id": "L3-sum-nx",
  "lecture": 3,
  "game": "formulas",
  "topic": "series",
  "prompt": "For $|x| < 1$, $\\sum_{n \\ge 1} n x^{n-1} =$ ?",
  "answer": "$\\frac{1}{(1-x)^2}$",
  "distractors": [
   "$\\frac{x}{(1-x)^2}$",
   "$\\frac{1}{1-x}$",
   "$\\frac{1}{(1-x)^3}$",
   "$\\frac{x}{1-x}$"
  ],
  "explain": "Differentiate $\\sum x^n = \\frac{1}{1-x}$ term by term. This gives $\\mathbb{E}[\\mathrm{Geo}(p)] = p \\cdot \\frac{1}{p^2} = \\frac{1}{p}$.",
  "source": "TD3 Ex6"
 },
 {
  "id": "L3-exy-indep",
  "lecture": 3,
  "game": "statements",
  "topic": "expectation",
  "prompt": "When does the course guarantee $\\mathbb{E}[XY] = \\mathbb{E}[X]\\,\\mathbb{E}[Y]$?",
  "answer": "$X, Y$ independent with $\\mathbb{E}|X|, \\mathbb{E}|Y| < \\infty$",
  "distractors": [
   "$X, Y \\in L^1$, whatever their dependence",
   "$\\mathrm{Cov}(X,Y) \\ge 0$",
   "$X$ and $Y$ have the same law"
  ],
  "explain": "Independence plus integrability (and then $XY \\in L^1$ too). Without independence it fails, e.g. $Y = X$ non-constant.",
  "source": "L3 slides"
 },
 {
  "id": "L3-tail-formula-proof",
  "lecture": 3,
  "game": "proof",
  "topic": "expectation",
  "prompt": "Key step to prove $\\mathbb{E}[X] = \\sum_{k \\ge 0} \\mathbb{P}[X > k]$ for $X$ with values in $\\mathbb{N}$?",
  "answer": "Write $n = \\sum_{k=0}^{n-1} 1$, so $\\mathbb{E}[X] = \\sum_n \\sum_{k<n} p_X(n)$, then swap the sums (nonnegative terms)",
  "distractors": [
   "Apply Markov's inequality to each $\\mathbb{P}[X>k]$",
   "Differentiate the MGF at $0$",
   "Integrate the CDF by parts"
  ],
  "hint": "$X = \\sum_{k \\ge 0} \\mathbf{1}_{\\{X > k\\}}$",
  "explain": "After the swap, $\\sum_{n > k} p_X(n) = \\mathbb{P}[X > k]$. Swapping is legal because every term is $\\ge 0$ (L1).",
  "source": "TD3 Ex1"
 },
 {
  "id": "L3-lp-inclusion",
  "lecture": 3,
  "game": "truefalse",
  "topic": "Lp spaces",
  "prompt": "On a probability space, if $0 < p \\le q$ then $L^q \\subseteq L^p$.",
  "answer": true,
  "explain": "$|X|^p \\le 1 + |X|^q$, and the constant $1$ is integrable because $\\mathbb{P}$ has total mass $1$. False on $\\mathbb{R}$ with Lebesgue measure.",
  "source": "L3 slides"
 },
 {
  "id": "L3-holder",
  "lecture": 3,
  "game": "statements",
  "topic": "Lp spaces",
  "complement": true,
  "prompt": "Hölder's inequality $\\mathbb{E}|XY| \\le \\|X\\|_p \\|Y\\|_q$ holds for $X \\in L^p$, $Y \\in L^q$ when",
  "answer": "$p, q > 1$ and $\\frac1p + \\frac1q = 1$",
  "distractors": [
   "$p, q \\ge 1$ and $p + q = 2$",
   "$p = q$",
   "$\\frac1p + \\frac1q \\le 1$ with $p, q > 0$"
  ],
  "explain": "Conjugate exponents. $p = q = 2$ is Cauchy–Schwarz.",
  "source": "Textbook Prop 3.33 (complement)"
 },
 {
  "id": "L4-markov-hyp",
  "lecture": 4,
  "game": "statements",
  "topic": "inequalities",
  "prompt": "Markov's inequality $\\mathbb{P}[X \\ge \\varepsilon] \\le \\mathbb{E}[X]/\\varepsilon$ requires",
  "answer": "$X \\ge 0$, $X \\in L^1$, $\\varepsilon > 0$",
  "distractors": [
   "$X \\in L^2$, $\\varepsilon > 0$",
   "$X$ discrete, $\\varepsilon > 0$",
   "$X$ symmetric, $\\varepsilon > 0$"
  ],
  "explain": "Proof: $\\varepsilon \\mathbf{1}_{\\{X \\ge \\varepsilon\\}} \\le X$ because $X \\ge 0$, then take expectations. $L^2$ is Chebyshev's hypothesis.",
  "source": "L4 slides"
 },
 {
  "id": "L4-geo-markov-trap",
  "lecture": 4,
  "game": "truefalse",
  "topic": "inequalities",
  "prompt": "For $X \\sim \\mathrm{Geo}(p)$, Markov gives $\\mathbb{P}[X \\ge n] \\le \\frac{1}{np}$ for every $n \\ge 0$.",
  "answer": false,
  "explain": "Only for $n \\ge 1$ (Markov needs $\\varepsilon > 0$). Slide typo, see textbook A.2.",
  "source": "L4 slides; textbook A.2"
 },
 {
  "id": "L4-chernoff-tool",
  "lecture": 4,
  "game": "tool",
  "topic": "inequalities",
  "prompt": "Goal: a bound on $\\mathbb{P}[X \\ge i]$, $X \\sim \\mathrm{Poi}(\\lambda)$, that decays faster than any power of $i$. Tool?",
  "answer": "Markov applied to $e^{tX}$, then optimise over $t > 0$ (Chernoff)",
  "distractors": [
   "Chebyshev",
   "Jensen with $\\varphi = \\exp$",
   "Cauchy–Schwarz with $Y = 1$"
  ],
  "explain": "$\\mathbb{P}[X \\ge i] \\le e^{-ti} M_X(t) = e^{\\lambda(e^t - 1) - ti}$; take $t = \\log(i/\\lambda)$. Chebyshev only gives $i^{-2}$.",
  "source": "TD4 Ex5"
 },
 {
  "id": "L4-min-tool",
  "lecture": 4,
  "game": "tool",
  "topic": "CDF",
  "prompt": "Goal: the law of $Y = \\min(X_1, \\ldots, X_n)$ with $X_i$ independent. First move?",
  "answer": "Compute $\\mathbb{P}[Y > t] = \\prod_i \\mathbb{P}[X_i > t]$",
  "distractors": [
   "Convolve the densities",
   "Multiply the MGFs",
   "Compute $\\mathbb{E}[Y]$ and identify the law"
  ],
  "explain": "$\\{\\min > t\\} = \\bigcap_i \\{X_i > t\\}$. For a max, use $\\{\\max \\le t\\} = \\bigcap_i \\{X_i \\le t\\}$.",
  "source": "TD4 Ex4; TD5 Ex3"
 },
 {
  "id": "L4-exp-tail",
  "lecture": 4,
  "game": "laws",
  "topic": "continuous laws",
  "prompt": "$X \\sim \\mathrm{Exp}(\\lambda)$, density $\\lambda e^{-\\lambda x} \\mathbf{1}_{x \\ge 0}$. For $t \\ge 0$, $\\mathbb{P}[X > t] =$ ?",
  "answer": "$e^{-\\lambda t}$",
  "distractors": [
   "$1 - e^{-\\lambda t}$",
   "$\\lambda e^{-\\lambda t}$",
   "$e^{-t/\\lambda}$",
   "$1 - \\lambda e^{-\\lambda t}$"
  ],
  "explain": "$\\int_t^\\infty \\lambda e^{-\\lambda s}\\,ds = e^{-\\lambda t}$. The CDF is $1 - e^{-\\lambda t}$.",
  "source": "TD5 Ex3"
 },
 {
  "id": "L4-bin-mgf",
  "lecture": 4,
  "game": "laws",
  "topic": "MGF",
  "prompt": "$M_X(t) = (1 - p + p e^t)^N$ for all $t$. Law of $X$?",
  "answer": "$\\mathrm{Bin}(N, p)$",
  "distractors": [
   "$\\mathrm{Poi}(Np)$",
   "$\\mathrm{Geo}(p)$",
   "$\\mathrm{Be}(p)$",
   "Sum of $N$ independent $\\mathrm{Geo}(p)$"
  ],
  "explain": "MGF of a sum of $N$ independent $\\mathrm{Be}(p)$ is $M_{\\mathrm{Be}}(t)^N$, and the MGF characterises the law.",
  "source": "TD4 Ex3"
 },
 {
  "id": "L4-poi-ex2",
  "lecture": 4,
  "game": "compute",
  "topic": "MGF",
  "prompt": "$X \\sim \\mathrm{Poi}(2)$. $\\mathbb{E}[X^2] =$ ?",
  "answer": 6,
  "explain": "$\\mathbb{E}[X^2] = \\mathrm{V}(X) + \\mathbb{E}[X]^2 = \\lambda + \\lambda^2 = 6$, or $M''(0)$ with $M(t) = e^{\\lambda(e^t - 1)}$.",
  "source": "TD4 Ex5"
 },
 {
  "id": "L3-bin-pmf",
  "lecture": 3,
  "game": "compute",
  "topic": "discrete laws",
  "prompt": "$X \\sim \\mathrm{Bin}(3, 1/2)$. $\\mathbb{P}[X = 2] =$ ? (fraction or decimal)",
  "answer": 0.375,
  "explain": "$\\binom{3}{2} \\cdot 2^{-3} = 3/8$.",
  "source": "L3"
 },
 {
  "id": "L4-lim-1-t-n",
  "lecture": 4,
  "game": "formulas",
  "topic": "limits",
  "prompt": "$\\lim_{n \\to \\infty} \\left(1 - \\frac{t}{n}\\right)^n =$ ?",
  "answer": "$e^{-t}$",
  "distractors": [
   "$e^{t}$",
   "$1$",
   "$0$",
   "$1 - t$"
  ],
  "explain": "$n \\log(1 - t/n) \\to -t$. Used for $n \\cdot \\min(U_i) \\to \\mathrm{Exp}(1)$ and $\\mathrm{Geo}(p/n)/n \\to \\mathrm{Exp}(p)$.",
  "source": "TD5 Ex4; TD6 Ex1"
 },
 {
  "id": "L5-normal-mgf",
  "lecture": 5,
  "game": "laws",
  "topic": "Gaussian",
  "prompt": "$X \\sim \\mathcal{N}(\\mu, \\sigma^2)$. $M_X(t) =$ ?",
  "answer": "$e^{\\mu t + \\sigma^2 t^2 / 2}$",
  "distractors": [
   "$e^{\\mu t + \\sigma t^2 / 2}$",
   "$e^{\\mu t + \\sigma^2 t^2}$",
   "$e^{\\sigma^2 t^2 / 2}$",
   "$\\frac{1}{1 - \\sigma^2 t}$"
  ],
  "explain": "Complete the square in the Gaussian integral. Finite for every $t$.",
  "source": "TD6 Ex2"
 },
 {
  "id": "L5-order-stat",
  "lecture": 5,
  "game": "laws",
  "topic": "order statistics",
  "prompt": "$U_1, \\ldots, U_n$ i.i.d. $\\mathcal{U}([0,1])$, $Y_k$ = the $k$-th smallest. Law of $Y_k$?",
  "answer": "$\\mathrm{Beta}(k, n-k+1)$",
  "distractors": [
   "$\\mathrm{Beta}(k, n-k)$",
   "$\\mathrm{Beta}(n-k+1, k)$",
   "$\\mathrm{Bin}(n, k/n)$",
   "$\\mathcal{U}([0, k/n])$"
  ],
  "explain": "$\\{Y_k \\le x\\} = \\{Z_x \\ge k\\}$ with $Z_x \\sim \\mathrm{Bin}(n, x)$; differentiating gives density $k\\binom{n}{k} x^{k-1}(1-x)^{n-k}$.",
  "source": "L5 slides"
 },
 {
  "id": "L6-slln-hyp",
  "lecture": 6,
  "game": "statements",
  "topic": "LLN",
  "prompt": "The strong law of large numbers, as proved in the course, assumes",
  "answer": "$(X_n)$ i.i.d. with $\\mathbb{E}[X_1^4] < \\infty$",
  "distractors": [
   "$(X_n)$ i.i.d. with $\\mathrm{V}(X_1) < \\infty$",
   "$(X_n)$ uncorrelated with bounded variances",
   "$(X_n)$ independent, no moment condition"
  ],
  "explain": "The fourth moment makes $\\sum_n \\mathbb{P}[|\\bar X_n - m| \\ge \\varepsilon]$ summable. Finite variance is the weak law's hypothesis.",
  "source": "L6 slides"
 },
 {
  "id": "L6-prob-to-mean",
  "lecture": 6,
  "game": "truefalse",
  "topic": "convergence",
  "prompt": "Convergence in probability implies convergence in mean.",
  "answer": false,
  "explain": "Slide example: $X_n = \\alpha_n X$ with $\\alpha_n \\to 1$ and $\\mathbb{E}|X| = \\infty$ converges in probability, not in mean. The implications go $L^2 \\Rightarrow L^1 \\Rightarrow$ probability, and a.s. $\\Rightarrow$ probability.",
  "source": "L6 slides"
 }
];
