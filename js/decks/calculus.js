// js/decks/calculus.js — Derivatives & integrals deck for 103. Written by Louis's coach; replace the whole file.
// Sources: Pacard, Analysis (ch. 10–12); Bettinelli, Integration (ch. 1).

AT.registerDeck({
 "id": "calculus",
 "title": "Derivatives & integrals",
 "section": "Analysis",
 "idPrefix": "D",
 "version": "2026-11-13-v1",
 "chapters": {
  "1": "Derivatives",
  "2": "Primitives",
  "3": "Integration techniques",
  "4": "Definite integrals"
 },
 "scopes": null,
 "reference": [
  {
   "title": "Area: ∫₀^π sin = 2",
   "plot": {
    "fns": [
     {
      "f": "sin(x)"
     }
    ],
    "x": [
     -0.5,
     3.6
    ],
    "y": [
     -0.3,
     1.3
    ],
    "xticks": [
     [
      1.5707963267948966,
      "π/2"
     ],
     [
      3.141592653589793,
      "π"
     ]
    ],
    "yticks": [
     [
      1,
      "1"
     ]
    ],
    "caption": "y = sin x on [0, π]"
   }
  },
  {
   "title": "ln x vs x ln x − x",
   "plot": {
    "fns": [
     {
      "f": "ln(x)"
     },
     {
      "f": "x*ln(x)-x",
      "dash": true
     }
    ],
    "x": [
     0,
     4
    ],
    "y": [
     -2,
     2
    ],
    "xticks": [
     [
      1,
      "1"
     ],
     [
      2.71828,
      "e"
     ]
    ],
    "yticks": [
     [
      1,
      "1"
     ],
     [
      -1,
      "−1"
     ]
    ],
    "caption": "dashed: a primitive of ln, minimum −1 at x = 1"
   }
  },
  {
   "title": "1/(1+x²) and arctan",
   "plot": {
    "fns": [
     {
      "f": "1/(1+x^2)"
     },
     {
      "f": "atan(x)",
      "dash": true
     }
    ],
    "x": [
     -5,
     5
    ],
    "y": [
     -2,
     2
    ],
    "yticks": [
     [
      1,
      "1"
     ],
     [
      1.5707963267948966,
      "π/2"
     ]
    ],
    "caption": "dashed: arctan, its primitive"
   }
  },
  {
   "title": "|x|: continuous, not differentiable at 0",
   "plot": {
    "fns": [
     {
      "f": "abs(x)"
     }
    ],
    "x": [
     -2,
     2
    ],
    "y": [
     -0.5,
     2
    ],
    "xticks": [
     [
      -1,
      "−1"
     ],
     [
      1,
      "1"
     ]
    ],
    "yticks": [
     [
      1,
      "1"
     ]
    ],
    "caption": "y = |x|"
   }
  }
 ],
 "cards": [
  {
   "id": "D1-tan",
   "chapter": 1,
   "game": "formulas",
   "topic": "usual derivatives",
   "prompt": "$\\tan'(x) =$ ?",
   "answer": "$1 + \\tan^2 x = \\frac{1}{\\cos^2 x}$",
   "distractors": [
    "$\\frac{1}{\\sin^2 x}$",
    "$-\\frac{1}{\\cos^2 x}$",
    "$\\frac{\\sin x}{\\cos^2 x}$"
   ],
   "explain": "Quotient rule on $\\frac{\\sin}{\\cos}$: $\\frac{\\cos^2 + \\sin^2}{\\cos^2}$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "D1-arcsin",
   "chapter": 1,
   "game": "formulas",
   "topic": "usual derivatives",
   "prompt": "$\\arcsin'(x) =$ ? ($\\left| x \\right| < 1$)",
   "answer": "$\\frac{1}{\\sqrt{1 - x^2}}$",
   "distractors": [
    "$-\\frac{1}{\\sqrt{1 - x^2}}$",
    "$\\frac{1}{1 + x^2}$",
    "$\\sqrt{1 - x^2}$"
   ],
   "explain": "Inverse function: $\\frac{1}{\\cos(\\arcsin x)} = \\frac{1}{\\sqrt{1 - x^2}}$. $\\arccos' = -\\frac{1}{\\sqrt{1 - x^2}}$ (their sum is constant).",
   "source": "Pacard 10.2, 11.3.1"
  },
  {
   "id": "D1-arccos",
   "chapter": 1,
   "game": "formulas",
   "topic": "usual derivatives",
   "prompt": "$\\arccos'(x) =$ ? ($\\left| x \\right| < 1$)",
   "answer": "$-\\frac{1}{\\sqrt{1 - x^2}}$",
   "distractors": [
    "$\\frac{1}{\\sqrt{1 - x^2}}$",
    "$-\\frac{1}{1 + x^2}$",
    "$-\\sqrt{1 - x^2}$"
   ],
   "explain": "$\\arcsin + \\arccos = \\frac{\\pi}{2}$, so the derivatives are opposite. $\\arccos$ decreases.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "D1-arctan",
   "chapter": 1,
   "game": "formulas",
   "topic": "usual derivatives",
   "prompt": "$\\arctan'(x) =$ ?",
   "answer": "$\\frac{1}{1 + x^2}$",
   "distractors": [
    "$\\frac{1}{\\sqrt{1 + x^2}}$",
    "$1 + \\tan^2 x$",
    "$\\frac{1}{1 - x^2}$"
   ],
   "explain": "$\\frac{1}{\\tan'(\\arctan x)} = \\frac{1}{1 + x^2}$. Gives $\\int \\frac{dx}{1 + x^2} = \\arctan x$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "D1-a-power-x",
   "chapter": 1,
   "game": "formulas",
   "topic": "usual derivatives",
   "prompt": "For $a > 0$, $\\frac{d}{dx} a^x =$ ?",
   "answer": "$a^x \\ln a$",
   "distractors": [
    "$x a^{x-1}$",
    "$a^x$",
    "$\\frac{a^x}{\\ln a}$"
   ],
   "explain": "$a^x = e^{x\\ln a}$. $x a^{x-1}$ is the derivative with respect to $a$.",
   "source": "Pacard 11.3.3"
  },
  {
   "id": "D1-x-power-x",
   "chapter": 1,
   "game": "compute",
   "topic": "usual derivatives",
   "prompt": "$f(x) = x^x$ on $(0, \\infty)$. $f'(1) =$ ?",
   "answer": 1,
   "explain": "$x^x = e^{x \\ln x}$, so $f'(x) = x^x(\\ln x + 1)$ and $f'(1) = 1$.",
   "source": "Pacard 11.3.3"
  },
  {
   "id": "D1-x-power-x-tool",
   "chapter": 1,
   "game": "tool",
   "topic": "rules",
   "prompt": "Derivative of $u(x)^{v(x)}$ (with $u > 0$). First move?",
   "answer": "Write $u^v = e^{v \\ln u}$, then the chain rule",
   "distractors": [
    "Power rule: $v\\,u^{v-1}u'$",
    "Exponential rule: $u^v \\ln u \\cdot v'$",
    "Differentiate $u$ and $v$ separately"
   ],
   "explain": "$(u^v)' = u^v\\left(v'\\ln u + v\\frac{u'}{u}\\right)$: both the power and the exponential rule contribute.",
   "source": "Pacard 11.3.3"
  },
  {
   "id": "D1-chain",
   "chapter": 1,
   "game": "formulas",
   "topic": "rules",
   "prompt": "Chain rule: $(f \\circ g)'(x) =$ ?",
   "answer": "$f'(g(x))\\,g'(x)$",
   "distractors": [
    "$f'(x)\\,g'(x)$",
    "$f'(g'(x))$",
    "$f(g'(x))\\,g'(x)$"
   ],
   "explain": "Differentiate the outside at the inside, times the derivative of the inside.",
   "source": "Pacard 10.1"
  },
  {
   "id": "D1-quotient",
   "chapter": 1,
   "game": "formulas",
   "topic": "rules",
   "prompt": "$\\left(\\frac{u}{v}\\right)' =$ ?",
   "answer": "$\\frac{u'v - uv'}{v^2}$",
   "distractors": [
    "$\\frac{uv' - u'v}{v^2}$",
    "$\\frac{u'}{v'}$",
    "$\\frac{u'v + uv'}{v^2}$"
   ],
   "explain": "Numerator: \\\"derivative of the top first\\\". Check with $\\frac1x$: $\\frac{0 - 1}{x^2}$.",
   "source": "Pacard 10.1"
  },
  {
   "id": "D1-inverse",
   "chapter": 1,
   "game": "formulas",
   "topic": "rules",
   "prompt": "$f$ bijective, differentiable, $f'(f^{-1}(y)) \\ne 0$. $(f^{-1})'(y) =$ ?",
   "answer": "$\\frac{1}{f'(f^{-1}(y))}$",
   "distractors": [
    "$\\frac{1}{f'(y)}$",
    "$-\\frac{f'(y)}{f(y)^2}$",
    "$f'(f^{-1}(y))$"
   ],
   "explain": "Differentiate $f(f^{-1}(y)) = y$. This is how $\\arcsin'$, $\\arctan'$, $\\ln'$ are found.",
   "source": "Pacard Thm 10.2 (inverse function)"
  },
  {
   "id": "D1-inverse-value",
   "chapter": 1,
   "game": "compute",
   "topic": "rules",
   "prompt": "$f(x) = x^3 + x$. $(f^{-1})'(2) =$ ? (fraction or decimal)",
   "answer": 0.25,
   "explain": "$f(1) = 2$, so $(f^{-1})'(2) = \\frac{1}{f'(1)} = \\frac{1}{3 + 1}$.",
   "source": "Pacard 10.2",
   "answerExpr": "1/4"
  },
  {
   "id": "D1-arctan-x2",
   "chapter": 1,
   "game": "formulas",
   "topic": "rules",
   "prompt": "$\\frac{d}{dx}\\arctan(x^2) =$ ?",
   "answer": "$\\frac{2x}{1 + x^4}$",
   "distractors": [
    "$\\frac{1}{1 + x^4}$",
    "$\\frac{2x}{1 + x^2}$",
    "$\\frac{2x}{(1 + x^2)^2}$"
   ],
   "explain": "$\\arctan'(x^2) \\cdot 2x$.",
   "source": "Pacard 10.1"
  },
  {
   "id": "D1-ln-cos",
   "chapter": 1,
   "game": "formulas",
   "topic": "rules",
   "prompt": "$\\frac{d}{dx}\\ln(\\cos x) =$ ? (where $\\cos x > 0$)",
   "answer": "$-\\tan x$",
   "distractors": [
    "$\\tan x$",
    "$\\frac{1}{\\cos x}$",
    "$-\\frac{1}{\\sin x}$"
   ],
   "explain": "$\\frac{(\\cos)'}{\\cos} = \\frac{-\\sin}{\\cos}$. Hence $\\int \\tan = -\\ln|\\cos|$.",
   "source": "Pacard 10.1"
  },
  {
   "id": "D1-ln-abs",
   "chapter": 1,
   "game": "formulas",
   "topic": "usual derivatives",
   "prompt": "On $\\mathbb{R}^*$, $\\frac{d}{dx}\\ln|x| =$ ?",
   "answer": "$\\frac1x$",
   "distractors": [
    "$\\frac{1}{\\left| x \\right|}$",
    "$\\frac{\\operatorname{sgn} x}{x}$",
    "$-\\frac1x$ for $x < 0$"
   ],
   "explain": "For $x < 0$: $\\ln(-x)' = \\frac{-1}{-x} = \\frac1x$. That is why $\\int \\frac{dx}{x} = \\ln|x|$.",
   "source": "Pacard 11.3.2"
  },
  {
   "id": "D1-leibniz",
   "chapter": 1,
   "game": "formulas",
   "topic": "higher derivatives",
   "prompt": "Leibniz: $(fg)^{(n)} =$ ?",
   "answer": "$\\sum_{k=0}^n \\binom{n}{k} f^{(k)} g^{(n-k)}$",
   "distractors": [
    "$f^{(n)}g^{(n)}$",
    "$\\sum_{k=0}^n f^{(k)}g^{(n-k)}$",
    "$f^{(n)}g + fg^{(n)}$"
   ],
   "explain": "Same coefficients as Newton's binomial formula. $n = 1$ gives $f'g + fg'$.",
   "source": "Pacard 10.3"
  },
  {
   "id": "D1-diff-cont",
   "chapter": 1,
   "game": "truefalse",
   "topic": "regularity",
   "prompt": "A continuous function is differentiable.",
   "answer": false,
   "plot": {
    "fns": [
     {
      "f": "abs(x)"
     }
    ],
    "x": [
     -2,
     2
    ],
    "y": [
     -0.5,
     2
    ],
    "xticks": [
     [
      -1,
      "−1"
     ],
     [
      1,
      "1"
     ]
    ],
    "yticks": [
     [
      1,
      "1"
     ]
    ]
   },
   "explain": "$\\left| x \\right|$ is continuous but not differentiable at $0$ (left slope $-1$, right slope $1$). The converse holds.",
   "source": "Pacard 10.1"
  },
  {
   "id": "D1-critical",
   "chapter": 1,
   "game": "statements",
   "topic": "variations",
   "prompt": "$f$ is $C^2$, $f'(x_0) = 0$ and $f''(x_0) > 0$. Then $x_0$ is",
   "answer": "a strict local minimum",
   "distractors": [
    "a strict local maximum",
    "an inflection point",
    "no conclusion possible"
   ],
   "explain": "Taylor: $f(x) - f(x_0) \\approx \\frac{f''(x_0)}{2}(x - x_0)^2 > 0$. If $f'' = 0$ too, look at the first nonzero derivative (Pacard Prop 12.7).",
   "source": "Pacard 12.3.1"
  },
  {
   "id": "D1-convex",
   "chapter": 1,
   "game": "statements",
   "topic": "variations",
   "prompt": "A $C^2$ function is convex on an interval iff",
   "answer": "$f'' \\ge 0$ on the interval",
   "distractors": [
    "$f' \\ge 0$",
    "$f \\ge 0$",
    "$f'' > 0$ at one point"
   ],
   "explain": "Equivalently $f'$ nondecreasing, or the graph above its tangents. Used in Jensen.",
   "source": "Pacard 11.2"
  },
  {
   "id": "D2-inv-1px2",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int \\frac{dx}{1 + x^2} =$ ?",
   "answer": "$\\arctan x + C$",
   "distractors": [
    "$\\ln(1 + x^2) + C$",
    "$\\arcsin x + C$",
    "$\\frac{1}{2}\\ln(1 + x^2) + C$"
   ],
   "explain": "$\\frac12\\ln(1 + x^2)$ is $\\int \\frac{x}{1 + x^2}$: the $x$ on top changes everything.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D2-inv-sqrt",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int \\frac{dx}{\\sqrt{1 - x^2}} =$ ? on $(-1, 1)$",
   "answer": "$\\arcsin x + C$",
   "distractors": [
    "$\\arctan x + C$",
    "$\\sqrt{1 - x^2} + C$",
    "$\\ln(1 - x^2) + C$"
   ],
   "explain": "Derivative of $\\arcsin$. ($-\\arccos x$ works too: they differ by a constant.)",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D2-x2-a2",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "For $a > 0$, $\\int \\frac{dx}{x^2 + a^2} =$ ?",
   "answer": "$\\frac1a\\arctan\\frac{x}{a} + C$",
   "distractors": [
    "$\\arctan\\frac{x}{a} + C$",
    "$\\frac{1}{a^2}\\arctan\\frac{x}{a} + C$",
    "$a\\arctan(ax) + C$"
   ],
   "explain": "Substitute $x = au$: $\\int \\frac{a\\,du}{a^2(1 + u^2)}$.",
   "source": "Bettinelli 1.3.2"
  },
  {
   "id": "D2-1-x2-minus",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "On $(-1, 1)$, $\\int \\frac{dx}{1 - x^2} =$ ?",
   "answer": "$\\frac12\\ln\\frac{1 + x}{1 - x} + C$",
   "distractors": [
    "$\\arctan x + C$",
    "$\\ln(1 - x^2) + C$",
    "$\\frac12\\ln\\frac{1 - x}{1 + x} + C$"
   ],
   "explain": "Partial fractions: $\\frac{1}{1 - x^2} = \\frac12\\left(\\frac{1}{1 - x} + \\frac{1}{1 + x}\\right)$. (It is $\\operatorname{artanh} x$.)",
   "source": "Bettinelli 1.3"
  },
  {
   "id": "D2-ln",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int \\ln x\\,dx =$ ?",
   "answer": "$x\\ln x - x + C$",
   "distractors": [
    "$\\frac1x + C$",
    "$x\\ln x + C$",
    "$\\frac{(\\ln x)^2}{2} + C$"
   ],
   "explain": "IBP with $u = \\ln x$, $v' = 1$. $\\frac{(\\ln x)^2}{2}$ is $\\int \\frac{\\ln x}{x}$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D2-tan",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int \\tan x\\,dx =$ ? on $\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$",
   "answer": "$-\\ln(\\cos x) + C$",
   "distractors": [
    "$\\ln(\\cos x) + C$",
    "$\\frac{1}{\\cos^2 x} + C$",
    "$\\ln(\\sin x) + C$"
   ],
   "explain": "$\\tan = -\\frac{\\cos'}{\\cos}$, a $\\frac{u'}{u}$ form.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D2-u-prime-u",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int \\frac{u'(x)}{u(x)}\\,dx =$ ? ($u$ nonvanishing)",
   "answer": "$\\ln|u(x)| + C$",
   "distractors": [
    "$\\ln u(x) + C$ always",
    "$\\frac{u(x)^2}{2} + C$",
    "$\\frac{1}{u(x)} + C$"
   ],
   "explain": "Absolute value: $u$ may be negative. The most useful pattern in the table.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D2-u-prime-u-n",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "For $n \\ne -1$, $\\int u'(x)\\,u(x)^n\\,dx =$ ?",
   "answer": "$\\frac{u(x)^{n+1}}{n+1} + C$",
   "distractors": [
    "$n\\,u(x)^{n-1} + C$",
    "$\\frac{u(x)^{n+1}}{n+1}u'(x) + C$",
    "$u(x)^{n+1} + C$"
   ],
   "explain": "Reverse chain rule. $n = -1$ gives $\\ln|u|$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D2-x-ex",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int x e^x\\,dx =$ ?",
   "answer": "$(x - 1)e^x + C$",
   "distractors": [
    "$x e^x + C$",
    "$\\frac{x^2}{2}e^x + C$",
    "$(x + 1)e^x + C$"
   ],
   "explain": "IBP with $u = x$: $xe^x - \\int e^x$. Check by differentiating: $e^x + (x-1)e^x = xe^x$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D2-cos2",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int \\cos^2 x\\,dx =$ ?",
   "answer": "$\\frac{x}{2} + \\frac{\\sin 2x}{4} + C$",
   "distractors": [
    "$\\frac{\\cos^3 x}{3} + C$",
    "$\\frac{x}{2} - \\frac{\\sin 2x}{4} + C$",
    "$\\sin^2 x + C$"
   ],
   "explain": "Linearise: $\\cos^2 x = \\frac{1 + \\cos 2x}{2}$. The minus sign version is $\\int \\sin^2$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D2-x-ln-x",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "On $(1, \\infty)$, $\\int \\frac{dx}{x\\ln x} =$ ?",
   "answer": "$\\ln(\\ln x) + C$",
   "distractors": [
    "$\\frac{(\\ln x)^2}{2} + C$",
    "$\\ln x \\cdot \\ln x + C$",
    "$\\frac{1}{\\ln x} + C$"
   ],
   "explain": "$\\frac{u'}{u}$ with $u = \\ln x$. Diverges at $\\infty$: Bertrand with $\\beta = 1$.",
   "source": "Bettinelli 1.5"
  },
  {
   "id": "D2-sinh-inv",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int \\frac{dx}{\\sqrt{x^2 + 1}} =$ ?",
   "answer": "$\\ln\\left(x + \\sqrt{x^2 + 1}\\right) + C$",
   "distractors": [
    "$\\arcsin x + C$",
    "$\\arctan x + C$",
    "$\\sqrt{x^2 + 1} + C$"
   ],
   "explain": "It is $\\operatorname{arsinh} x$. Check: derivative $\\frac{1 + x/\\sqrt{x^2+1}}{x + \\sqrt{x^2+1}} = \\frac{1}{\\sqrt{x^2 + 1}}$.",
   "source": "Bettinelli 1.2.6",
   "complement": true
  },
  {
   "id": "D2-power",
   "chapter": 2,
   "game": "formulas",
   "topic": "usual primitives",
   "prompt": "$\\int x^\\alpha\\,dx$ for $\\alpha \\ne -1$:",
   "answer": "$\\frac{x^{\\alpha+1}}{\\alpha+1} + C$",
   "distractors": [
    "$\\alpha x^{\\alpha - 1} + C$",
    "$\\frac{x^{\\alpha+1}}{\\alpha} + C$",
    "$x^{\\alpha+1} + C$"
   ],
   "explain": "Includes $\\int \\sqrt x = \\frac23 x^{3/2}$ and $\\int \\frac{1}{\\sqrt x} = 2\\sqrt x$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D3-ibp",
   "chapter": 3,
   "game": "formulas",
   "topic": "integration by parts",
   "prompt": "Integration by parts on $[a, b]$ ($u, v$ of class $C^1$):",
   "answer": "$\\int_a^b u v' = [uv]_a^b - \\int_a^b u'v$",
   "distractors": [
    "$\\int_a^b u v' = [uv]_a^b + \\int_a^b u'v$",
    "$\\int_a^b u v' = u(b)v(a) - \\int_a^b u'v$",
    "$\\int_a^b u v' = \\int_a^b u\\int_a^b v'$"
   ],
   "explain": "From $(uv)' = u'v + uv'$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D3-ibp-choice",
   "chapter": 3,
   "game": "tool",
   "topic": "integration by parts",
   "prompt": "$\\int x^2 e^{x}\\,dx$ by parts: which choice?",
   "answer": "$u = x^2$ (differentiate), $v' = e^x$, then IBP again",
   "distractors": [
    "$u = e^x$, $v' = x^2$",
    "Substitute $t = x^2$",
    "Partial fractions"
   ],
   "explain": "Differentiate the polynomial until it disappears. Result $(x^2 - 2x + 2)e^x$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D3-subst",
   "chapter": 3,
   "game": "formulas",
   "topic": "substitution",
   "prompt": "Change of variables $x = \\varphi(t)$, $\\varphi$ of class $C^1$:",
   "answer": "$\\int_{\\varphi(\\alpha)}^{\\varphi(\\beta)} f(x)\\,dx = \\int_\\alpha^\\beta f(\\varphi(t))\\,\\varphi'(t)\\,dt$",
   "distractors": [
    "$\\int_{\\varphi(\\alpha)}^{\\varphi(\\beta)} f(x)\\,dx = \\int_\\alpha^\\beta f(\\varphi(t))\\,dt$",
    "$\\int_\\alpha^\\beta f(x)\\,dx = \\int_\\alpha^\\beta f(\\varphi(t))\\,\\varphi'(t)\\,dt$",
    "$\\int f(\\varphi(t))\\,dt = \\frac{F(\\varphi(t))}{\\varphi'(t)}$"
   ],
   "explain": "Do not forget $dx = \\varphi'(t)\\,dt$ AND the new bounds.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D3-technique-tool",
   "chapter": 3,
   "game": "tool",
   "topic": "choosing a technique",
   "prompt": "Which technique for $\\int x\\,e^{-x^2}\\,dx$?",
   "answer": "Substitution $u = x^2$ (or recognise $u'e^{u}$)",
   "distractors": [
    "Integration by parts with $u = x$",
    "Partial fractions",
    "Linearisation"
   ],
   "explain": "$\\int x e^{-x^2} = -\\frac12 e^{-x^2}$. The factor $x$ is (half) the derivative of $x^2$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D3-rational-tool",
   "chapter": 3,
   "game": "tool",
   "topic": "rational functions",
   "prompt": "First move for $\\int \\frac{dx}{x^2 + 3x + 2}$?",
   "answer": "Factor $(x + 1)(x + 2)$ and decompose into partial fractions",
   "distractors": [
    "Complete the square to get an $\\arctan$",
    "Integration by parts",
    "Substitute $u = x^2$"
   ],
   "explain": "Real roots ⇒ partial fractions ⇒ logarithms. Negative discriminant ⇒ complete the square ⇒ $\\arctan$.",
   "source": "Bettinelli 1.3"
  },
  {
   "id": "D3-partial",
   "chapter": 3,
   "game": "formulas",
   "topic": "rational functions",
   "prompt": "$\\frac{1}{x(x+1)} =$ ?",
   "answer": "$\\frac1x - \\frac{1}{x+1}$",
   "distractors": [
    "$\\frac1x + \\frac{1}{x+1}$",
    "$\\frac{1}{x+1} - \\frac1x$",
    "$\\frac{1}{2x} - \\frac{1}{2(x+1)}$"
   ],
   "explain": "Cover-up: at $x = 0$ the coefficient is $\\frac{1}{0+1} = 1$, at $x = -1$ it is $\\frac{1}{-1} = -1$.",
   "source": "Bettinelli 1.3.1"
  },
  {
   "id": "D3-partial-value",
   "chapter": 3,
   "game": "compute",
   "topic": "rational functions",
   "prompt": "$\\int_0^1 \\frac{dx}{x^2 + 3x + 2} =$ ? (exact allowed, e.g. ln(2))",
   "answer": 0.287682,
   "explain": "$\\frac{1}{x+1} - \\frac{1}{x+2}$, so $[\\ln(x+1) - \\ln(x+2)]_0^1 = \\ln 2 - \\ln 3 + \\ln 2 = \\ln\\frac43$.",
   "source": "Bettinelli 1.3",
   "answerExpr": "ln(4/3)",
   "answerTex": "$\\ln\\frac43$"
  },
  {
   "id": "D3-complete-square",
   "chapter": 3,
   "game": "formulas",
   "topic": "rational functions",
   "prompt": "$\\int \\frac{dx}{x^2 + 2x + 5} =$ ?",
   "answer": "$\\frac12\\arctan\\frac{x+1}{2} + C$",
   "distractors": [
    "$\\ln(x^2 + 2x + 5) + C$",
    "$\\arctan(x + 1) + C$",
    "$\\frac14\\arctan\\frac{x+1}{2} + C$"
   ],
   "explain": "$x^2 + 2x + 5 = (x+1)^2 + 4$, then $\\int \\frac{dx}{u^2 + a^2} = \\frac1a\\arctan\\frac{u}{a}$ with $a = 2$.",
   "source": "Bettinelli 1.3.2"
  },
  {
   "id": "D3-weierstrass",
   "chapter": 3,
   "game": "formulas",
   "topic": "rational functions",
   "prompt": "Rational function of $\\cos x$ and $\\sin x$: the systematic substitution is",
   "answer": "$t = \\tan\\frac{x}{2}$",
   "distractors": [
    "$t = \\cos x$",
    "$t = e^x$",
    "$t = \\sin^2 x$"
   ],
   "explain": "$\\cos x = \\frac{1 - t^2}{1 + t^2}$, $\\sin x = \\frac{2t}{1 + t^2}$, $dx = \\frac{2\\,dt}{1 + t^2}$: a rational function of $t$.",
   "source": "Bettinelli 1.3.3"
  },
  {
   "id": "D3-x-sinx",
   "chapter": 3,
   "game": "compute",
   "topic": "integration by parts",
   "prompt": "$\\int_0^\\pi x\\sin x\\,dx =$ ? (exact allowed)",
   "answer": 3.141593,
   "explain": "IBP: $[-x\\cos x]_0^\\pi + \\int_0^\\pi \\cos x = \\pi + 0$.",
   "source": "Bettinelli 1.2.6",
   "answerExpr": "pi",
   "answerTex": "$\\pi$"
  },
  {
   "id": "D4-ftc",
   "chapter": 4,
   "game": "formulas",
   "topic": "fundamental theorem",
   "prompt": "$f$ continuous. $\\frac{d}{dx}\\int_a^x f(t)\\,dt =$ ?",
   "answer": "$f(x)$",
   "distractors": [
    "$f(x) - f(a)$",
    "$F(x) - F(a)$",
    "$f'(x)$"
   ],
   "explain": "Fundamental theorem of calculus. Needs continuity of $f$ at $x$.",
   "source": "Bettinelli 1.2.4"
  },
  {
   "id": "D4-ftc-chain",
   "chapter": 4,
   "game": "formulas",
   "topic": "fundamental theorem",
   "prompt": "$\\frac{d}{dx}\\int_0^{x^2} e^{-t^2}\\,dt =$ ?",
   "answer": "$2x\\,e^{-x^4}$",
   "distractors": [
    "$e^{-x^4}$",
    "$e^{-x^2}$",
    "$2x\\,e^{-x^2}$"
   ],
   "explain": "$G(x) = F(x^2)$ with $F' = e^{-t^2}$: chain rule gives $2x F'(x^2)$.",
   "source": "Bettinelli 1.2.4"
  },
  {
   "id": "D4-sin-0-pi",
   "chapter": 4,
   "game": "compute",
   "topic": "definite integrals",
   "prompt": "$\\int_0^\\pi \\sin x\\,dx =$ ?",
   "answer": 2,
   "explain": "$[-\\cos x]_0^\\pi = 1 + 1$.",
   "source": "Bettinelli 1.2"
  },
  {
   "id": "D4-x-ex",
   "chapter": 4,
   "game": "compute",
   "topic": "definite integrals",
   "prompt": "$\\int_0^1 x e^x\\,dx =$ ?",
   "answer": 1,
   "explain": "$[(x - 1)e^x]_0^1 = 0 - (-1)$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D4-cos2",
   "chapter": 4,
   "game": "compute",
   "topic": "definite integrals",
   "prompt": "$\\int_0^{\\pi/2} \\cos^2 x\\,dx =$ ? (exact allowed)",
   "answer": 0.785398,
   "explain": "Average of $\\cos^2$ over a quarter period is $\\frac12$: $\\frac12 \\cdot \\frac{\\pi}{2}$.",
   "source": "Bettinelli 1.2.6",
   "answerExpr": "pi/4",
   "answerTex": "$\\frac{\\pi}{4}$"
  },
  {
   "id": "D4-ln-1-e",
   "chapter": 4,
   "game": "compute",
   "topic": "definite integrals",
   "prompt": "$\\int_1^e \\ln x\\,dx =$ ?",
   "answer": 1,
   "explain": "$[x\\ln x - x]_1^e = (e - e) - (0 - 1)$.",
   "source": "Bettinelli 1.2.6"
  },
  {
   "id": "D4-arctan-1",
   "chapter": 4,
   "game": "compute",
   "topic": "definite integrals",
   "prompt": "$\\int_0^1 \\frac{dx}{1 + x^2} =$ ? (exact allowed)",
   "answer": 0.785398,
   "explain": "$\\arctan 1 - \\arctan 0$.",
   "source": "Bettinelli 1.2.6",
   "answerExpr": "pi/4",
   "answerTex": "$\\frac{\\pi}{4}$"
  },
  {
   "id": "D4-x-over-1px2",
   "chapter": 4,
   "game": "compute",
   "topic": "definite integrals",
   "prompt": "$\\int_0^1 \\frac{x}{1 + x^2}\\,dx =$ ? (exact allowed)",
   "answer": 0.346574,
   "explain": "$\\left[\\frac12\\ln(1 + x^2)\\right]_0^1$.",
   "source": "Bettinelli 1.2.6",
   "answerExpr": "ln(2)/2",
   "answerTex": "$\\frac{\\ln 2}{2}$"
  },
  {
   "id": "D4-tan-0-pi4",
   "chapter": 4,
   "game": "compute",
   "topic": "definite integrals",
   "prompt": "$\\int_0^{\\pi/4} \\tan x\\,dx =$ ? (exact allowed)",
   "answer": 0.346574,
   "explain": "$[-\\ln\\cos x]_0^{\\pi/4} = -\\ln\\frac{\\sqrt2}{2} = \\frac{\\ln 2}{2}$.",
   "source": "Bettinelli 1.2.6",
   "answerExpr": "ln(2)/2",
   "answerTex": "$\\frac{\\ln 2}{2}$"
  },
  {
   "id": "D4-odd-symmetric",
   "chapter": 4,
   "game": "truefalse",
   "topic": "symmetry",
   "prompt": "If $f$ is odd and integrable on $[-a, a]$, then $\\int_{-a}^a f = 0$.",
   "answer": true,
   "plot": {
    "fns": [
     {
      "f": "x^3-x"
     }
    ],
    "x": [
     -1.5,
     1.5
    ],
    "y": [
     -1.5,
     1.5
    ],
    "xticks": [
     [
      -1,
      "−1"
     ],
     [
      1,
      "1"
     ]
    ]
   },
   "explain": "Substitute $x = -t$. Saves time: $\\int_{-1}^1 x^3 e^{x^2}\\,dx = 0$ without computing.",
   "source": "Bettinelli 1.2"
  },
  {
   "id": "D4-riemann-sum",
   "chapter": 4,
   "game": "formulas",
   "topic": "Riemann sums",
   "prompt": "$f$ continuous on $[0, 1]$. $\\lim_{n\\to\\infty}\\frac1n\\sum_{k=1}^n f\\left(\\frac kn\\right) =$ ?",
   "answer": "$\\int_0^1 f(x)\\,dx$",
   "distractors": [
    "$f(1)$",
    "$\\sum_{k \\ge 1} f(k)$",
    "$\\frac{f(0) + f(1)}{2}$"
   ],
   "explain": "Right Riemann sums with step $\\frac1n$. Turns some limits of sums into integrals.",
   "source": "Bettinelli 1.2.5",
   "explainPlot": {
    "fns": [
     {
      "f": "x^2"
     }
    ],
    "x": [
     0,
     1.1
    ],
    "y": [
     0,
     1.2
    ],
    "xticks": [
     [
      1,
      "1"
     ]
    ],
    "yticks": [
     [
      1,
      "1"
     ]
    ],
    "caption": "area under f on [0, 1]"
   }
  },
  {
   "id": "D4-riemann-pi4",
   "chapter": 4,
   "game": "compute",
   "topic": "Riemann sums",
   "prompt": "$\\lim_{n\\to\\infty}\\sum_{k=1}^n \\frac{n}{n^2 + k^2} =$ ? (exact allowed)",
   "answer": 0.785398,
   "explain": "$= \\frac1n\\sum \\frac{1}{1 + (k/n)^2} \\to \\int_0^1 \\frac{dx}{1 + x^2} = \\frac{\\pi}{4}$.",
   "source": "Bettinelli 1.2.5",
   "answerExpr": "pi/4",
   "answerTex": "$\\frac{\\pi}{4}$",
   "hint": "Factor out $\\frac1n$ and spot $f\\left(\\frac kn\\right)$."
  },
  {
   "id": "D4-riemann-tool",
   "chapter": 4,
   "game": "tool",
   "topic": "Riemann sums",
   "prompt": "Limit of $\\sum_{k=1}^n \\frac{1}{n + k}$. First move?",
   "answer": "Write it as $\\frac1n\\sum f\\left(\\frac kn\\right)$ with $f(x) = \\frac{1}{1 + x}$",
   "distractors": [
    "Compare with $\\sum \\frac1k$",
    "Ratio test",
    "Each term $\\to 0$, so the sum $\\to 0$"
   ],
   "explain": "Limit $\\int_0^1 \\frac{dx}{1+x} = \\ln 2$. \\\"Each term → 0\\\" is wrong: there are $n$ of them.",
   "source": "Bettinelli 1.2.5"
  },
  {
   "id": "D4-mean-value",
   "chapter": 4,
   "game": "formulas",
   "topic": "inequalities",
   "prompt": "$f$ continuous on $[a, b]$, $a < b$. Then there is $c \\in [a, b]$ with",
   "answer": "$\\int_a^b f = (b - a) f(c)$",
   "distractors": [
    "$\\int_a^b f = f(b) - f(a)$",
    "$\\int_a^b f = f(c)$",
    "$\\int_a^b f = (b - a) f'(c)$"
   ],
   "explain": "Mean value theorem for integrals (intermediate value theorem between $\\min f$ and $\\max f$).",
   "source": "Bettinelli 1.2.3"
  }
 ]
});
