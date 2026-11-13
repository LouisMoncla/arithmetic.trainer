// js/decks/ode.js — Differential equations deck for 103. Written by Louis's coach; replace the whole file.
// Source: Bettinelli, Integration / Taylor / ODE (ch. 3).

AT.registerDeck({
 "id": "ode",
 "title": "Differential equations",
 "section": "Analysis",
 "idPrefix": "E",
 "version": "2026-11-13-v1",
 "chapters": {
  "1": "Basics and separable equations",
  "2": "First-order linear",
  "3": "Constant coefficients",
  "4": "Particular solutions and systems"
 },
 "scopes": null,
 "reference": [
  {
   "title": "y' = −y: integral curves",
   "plot": {
    "fns": [
     {
      "f": "exp(-x)"
     },
     {
      "f": "2*exp(-x)"
     },
     {
      "f": "-exp(-x)"
     },
     {
      "f": "0.5*exp(-x)"
     },
     {
      "f": "-2*exp(-x)"
     }
    ],
    "x": [
     -1,
     4
    ],
    "y": [
     -3,
     3
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
    "caption": "y = C e^(−x): never cross, all → 0"
   }
  },
  {
   "title": "D > 0: overdamped",
   "plot": {
    "fns": [
     {
      "f": "2*exp(-x)-exp(-4*x)"
     }
    ],
    "x": [
     0,
     6
    ],
    "y": [
     -0.5,
     1.5
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
    "caption": "y'' + 5y' + 4y = 0: roots −1, −4"
   }
  },
  {
   "title": "D = 0: critical",
   "plot": {
    "fns": [
     {
      "f": "(1+x)*exp(-x)"
     }
    ],
    "x": [
     0,
     6
    ],
    "y": [
     -0.5,
     1.5
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
    "caption": "y'' + 2y' + y = 0: (λ + μt) e^(−t)"
   }
  },
  {
   "title": "D < 0: damped oscillation",
   "plot": {
    "fns": [
     {
      "f": "exp(-x/2)*cos(3*x)"
     },
     {
      "f": "exp(-x/2)",
      "dash": true
     },
     {
      "f": "-exp(-x/2)",
      "dash": true
     }
    ],
    "x": [
     0,
     8
    ],
    "y": [
     -1.2,
     1.2
    ],
    "xticks": [
     [
      3.141592653589793,
      "π"
     ],
     [
      6.283185307179586,
      "2π"
     ]
    ],
    "yticks": [
     [
      1,
      "1"
     ]
    ],
    "caption": "complex roots, negative real part"
   }
  },
  {
   "title": "Resonance",
   "plot": {
    "fns": [
     {
      "f": "-x/2*cos(x)"
     },
     {
      "f": "x/2",
      "dash": true
     },
     {
      "f": "-x/2",
      "dash": true
     }
    ],
    "x": [
     0,
     20
    ],
    "y": [
     -11,
     11
    ],
    "xticks": [
     [
      6.283185307179586,
      "2π"
     ],
     [
      12.566370614359172,
      "4π"
     ],
     [
      18.84955592153876,
      "6π"
     ]
    ],
    "yticks": [
     [
      5,
      "5"
     ]
    ],
    "caption": "y'' + y = sin t: −(t/2) cos t grows linearly"
   }
  }
 ],
 "cards": [
  {
   "id": "E1-order",
   "chapter": 1,
   "game": "compute",
   "topic": "vocabulary",
   "prompt": "Order of $y''' + x y' = \\sin x$?",
   "answer": 3,
   "explain": "The highest derivative that appears.",
   "source": "Bettinelli ch. 3"
  },
  {
   "id": "E1-linear-trap",
   "chapter": 1,
   "game": "truefalse",
   "topic": "vocabulary",
   "prompt": "$y' = y^2$ is a linear differential equation.",
   "answer": false,
   "explain": "Linear means $a_0(x)y + a_1(x)y' + \\cdots + a_n(x)y^{(n)} = b(x)$: no $y^2$, $\\sin y$, $y y'$. It is separable.",
   "source": "Bettinelli Def 3.11"
  },
  {
   "id": "E1-separable-def",
   "chapter": 1,
   "game": "formulas",
   "topic": "separable",
   "prompt": "A separable equation is one that can be written",
   "answer": "$y' f(y) = g(x)$",
   "distractors": [
    "$y' = a(x)y + b(x)$",
    "$y'' + ay' + by = 0$",
    "$y' = f(x + y)$"
   ],
   "explain": "Then integrate both sides: $F(y(x)) = G(x) + C$ with $F' = f$, $G' = g$.",
   "source": "Bettinelli Def 3.9"
  },
  {
   "id": "E1-separable-tool",
   "chapter": 1,
   "game": "tool",
   "topic": "separable",
   "prompt": "Solve $x^2 y' = e^{-y}$ (on $x > 0$). First move?",
   "answer": "Separate: $e^{y}y' = \\frac{1}{x^2}$, then integrate: $e^y = -\\frac1x + C$",
   "distractors": [
    "Variation of the constant",
    "Characteristic polynomial",
    "Guess $y = Ce^{x}$"
   ],
   "explain": "Then $y = \\ln\\left(C - \\frac1x\\right)$, defined where $C - \\frac1x > 0$: the interval depends on $C$.",
   "source": "Bettinelli Ex 3.10"
  },
  {
   "id": "E1-y-squared",
   "chapter": 1,
   "game": "formulas",
   "topic": "separable",
   "prompt": "Solution of $y' = y^2$ with $y(0) = 1$?",
   "answer": "$y(x) = \\frac{1}{1 - x}$ on $(-\\infty, 1)$",
   "distractors": [
    "$y(x) = e^{x^2/2}$ on $\\mathbb{R}$",
    "$y(x) = \\frac{1}{1 - x}$ on $\\mathbb{R} \\setminus \\{1\\}$",
    "$y(x) = 1 + x$ on $\\mathbb{R}$"
   ],
   "explain": "$-\\frac{1}{y} = x + C$. The maximal solution lives on the interval containing $0$: it blows up at $x = 1$ (finite-time explosion, impossible for linear ODEs).",
   "source": "Bettinelli Ex 3.7, Def 3.8",
   "explainPlot": {
    "fns": [
     {
      "f": "1/(1-x)"
     }
    ],
    "x": [
     -3,
     1.5
    ],
    "y": [
     0,
     12
    ],
    "xticks": [
     [
      -2,
      "−2"
     ],
     [
      -1,
      "−1"
     ]
    ],
    "yticks": [
     [
      1,
      "1"
     ]
    ],
    "vlines": [
     1
    ],
    "caption": "blow-up at x = 1"
   }
  },
  {
   "id": "E1-interval-first",
   "chapter": 1,
   "game": "statements",
   "topic": "vocabulary",
   "prompt": "Before solving $\\sqrt{1 - x}\\,y'' + xy = e^x$, the first task is",
   "answer": "Find the interval where the equation makes sense (here $x < 1$)",
   "distractors": [
    "Compute the characteristic polynomial",
    "Divide by $\\sqrt{1 - x}$ on all of $\\mathbb{R}$",
    "Look for a polynomial solution"
   ],
   "explain": "An ODE is solved on an interval; dividing by a coefficient requires it to be nonzero there.",
   "source": "Bettinelli Rem 3.5"
  },
  {
   "id": "E1-vector-space",
   "chapter": 1,
   "game": "formulas",
   "topic": "structure",
   "prompt": "The solutions on an interval of a HOMOGENEOUS linear ODE form",
   "answer": "a real vector space",
   "distractors": [
    "an affine space not containing $0$",
    "a finite set",
    "a group under composition"
   ],
   "explain": "$0$ is a solution, and linear combinations of solutions are solutions. For the non-homogeneous equation: particular + homogeneous (affine space).",
   "source": "Bettinelli Prop 3.13"
  },
  {
   "id": "E1-superposition",
   "chapter": 1,
   "game": "formulas",
   "topic": "structure",
   "prompt": "$y_1$ solves $L(y) = b_1$ and $y_2$ solves $L(y) = b_2$ ($L$ linear). Then $y_1 + y_2$ solves",
   "answer": "$L(y) = b_1 + b_2$",
   "distractors": [
    "$L(y) = b_1 b_2$",
    "$L(y) = 0$",
    "$L(y) = \\max(b_1, b_2)$"
   ],
   "explain": "Superposition: split a right-hand side like $e^x + 1$ into pieces and add the particular solutions.",
   "source": "Bettinelli Prop 3.15"
  },
  {
   "id": "E2-homog",
   "chapter": 2,
   "game": "formulas",
   "topic": "first order",
   "prompt": "$a$ continuous on $I$, $A$ a primitive of $a$. Solutions of $y' = a(x)y$ on $I$:",
   "answer": "$y(x) = C e^{A(x)}$, $C \\in \\mathbb{R}$",
   "distractors": [
    "$y(x) = e^{A(x)} + C$",
    "$y(x) = C e^{a(x)}$",
    "$y(x) = A(x) + C$"
   ],
   "explain": "$\\left(y e^{-A}\\right)' = 0$. A one-dimensional vector space.",
   "source": "Bettinelli Thm 3.17"
  },
  {
   "id": "E2-homog-2xy",
   "chapter": 2,
   "game": "formulas",
   "topic": "first order",
   "prompt": "Solutions of $y' = 2xy$ on $\\mathbb{R}$:",
   "answer": "$C e^{x^2}$",
   "distractors": [
    "$C e^{2x}$",
    "$C e^{2x^2}$",
    "$x^2 + C$"
   ],
   "explain": "$a(x) = 2x$, primitive $x^2$.",
   "source": "Bettinelli ch. 3"
  },
  {
   "id": "E2-ivp-exp",
   "chapter": 2,
   "game": "compute",
   "topic": "first order",
   "prompt": "$y' = 2y$, $y(0) = 3$. $y(1) =$ ? (exact allowed, e.g. 3*e^2)",
   "answer": 22.167168,
   "explain": "$y = 3e^{2x}$.",
   "source": "Bettinelli ch. 3",
   "answerExpr": "3*e^2",
   "answerTex": "$3e^2$"
  },
  {
   "id": "E2-halving",
   "chapter": 2,
   "game": "compute",
   "topic": "first order",
   "prompt": "$y' = -\\frac12 y$, $y(0) > 0$. Time for $y$ to halve? (exact allowed)",
   "answer": 1.386294,
   "explain": "$y = y_0 e^{-t/2} = \\frac{y_0}{2} \\iff t = 2\\ln 2$. Half-life $\\frac{\\ln 2}{k}$ for $y' = -ky$.",
   "source": "Bettinelli ch. 3",
   "answerExpr": "2*ln(2)",
   "answerTex": "$2\\ln 2$"
  },
  {
   "id": "E2-variation",
   "chapter": 2,
   "game": "tool",
   "topic": "first order",
   "prompt": "Particular solution of $y' = a(x)y + b(x)$ when no guess works:",
   "answer": "Variation of the constant: $y = C(x)e^{A(x)}$, which gives $C'(x) = b(x)e^{-A(x)}$",
   "distractors": [
    "Characteristic polynomial",
    "Separate the variables",
    "Try $y = b(x)$"
   ],
   "explain": "Plug in: the $C\\,a\\,e^{A}$ terms cancel, leaving $C'e^{A} = b$.",
   "source": "Bettinelli 3.2.2"
  },
  {
   "id": "E2-y-plus-y-x",
   "chapter": 2,
   "game": "formulas",
   "topic": "first order",
   "prompt": "Solutions of $y' + y = x$:",
   "answer": "$x - 1 + c\\,e^{-x}$",
   "distractors": [
    "$x + c\\,e^{-x}$",
    "$x - 1 + c\\,e^{x}$",
    "$\\frac{x^2}{2} + c\\,e^{-x}$"
   ],
   "explain": "Try a polynomial $ax + b$: $a + ax + b = x$ gives $a = 1$, $b = -1$. Then add the homogeneous solutions $ce^{-x}$.",
   "source": "Bettinelli Ex 3.34"
  },
  {
   "id": "E2-rhs-exp",
   "chapter": 2,
   "game": "formulas",
   "topic": "first order",
   "prompt": "Particular solution of $y' + y = e^x + 1$:",
   "answer": "$\\frac{e^x}{2} + 1$",
   "distractors": [
    "$e^x + 1$",
    "$x e^x + 1$",
    "$\\frac{e^x}{2} + x$"
   ],
   "explain": "Superposition: $\\frac{e^x}{2}$ for $e^x$ (try $ae^x$: $2a = 1$) and $1$ for $1$.",
   "source": "Bettinelli Ex 3.28"
  },
  {
   "id": "E2-rhs-cos",
   "chapter": 2,
   "game": "formulas",
   "topic": "first order",
   "prompt": "Particular solution of $y' + y = \\cos x$:",
   "answer": "$\\frac{\\cos x + \\sin x}{2}$",
   "distractors": [
    "$\\cos x$",
    "$\\sin x$",
    "$\\frac{\\cos x - \\sin x}{2}$"
   ],
   "explain": "Try $A\\cos x + B\\sin x$: $(B + A)\\cos x + (B - A)\\sin x = \\cos x$, so $A = B = \\frac12$.",
   "source": "Bettinelli Ex 3.30"
  },
  {
   "id": "E2-ivp-value",
   "chapter": 2,
   "game": "compute",
   "topic": "first order",
   "prompt": "$y' + y = 1$, $y(0) = 0$. $y(\\ln 2) =$ ? (fraction or decimal)",
   "answer": 0.5,
   "explain": "$y = 1 - e^{-x}$, and $e^{-\\ln 2} = \\frac12$.",
   "source": "Bettinelli ch. 3",
   "answerExpr": "1/2"
  },
  {
   "id": "E2-no-crossing",
   "chapter": 2,
   "game": "truefalse",
   "topic": "Cauchy–Lipschitz",
   "prompt": "Two different solutions of $y' = a(x)y + b(x)$ ($a, b$ continuous) can cross.",
   "answer": false,
   "plot": {
    "fns": [
     {
      "f": "x-1+exp(-x)"
     },
     {
      "f": "x-1+2*exp(-x)"
     },
     {
      "f": "x-1-exp(-x)"
     },
     {
      "f": "x-1",
      "dash": true
     }
    ],
    "x": [
     -1,
     4
    ],
    "y": [
     -3,
     4
    ],
    "xticks": [
     [
      1,
      "1"
     ],
     [
      2,
      "2"
     ]
    ],
    "yticks": [
     [
      1,
      "1"
     ]
    ],
    "caption": "integral curves of y' + y = x"
   },
   "explain": "Cauchy–Lipschitz: through each point $(x_0, y_0)$ passes exactly one integral curve. Plotted: $y' + y = x$, all curves approach $y = x - 1$.",
   "source": "Bettinelli Thm 3.31, Cor 3.33"
  },
  {
   "id": "E2-which-ode",
   "chapter": 2,
   "game": "formulas",
   "topic": "integral curves",
   "prompt": "These curves are solutions of which equation?",
   "answer": "$y' = -y$",
   "distractors": [
    "$y' = y$",
    "$y' = -x$",
    "$y' = y^2$"
   ],
   "explain": "$y = Ce^{-x}$: all decay to $0$ and never cross. $y' = -x$ gives parabolas $-\\frac{x^2}{2} + C$.",
   "source": "Bettinelli ch. 3",
   "plot": {
    "fns": [
     {
      "f": "exp(-x)"
     },
     {
      "f": "2*exp(-x)"
     },
     {
      "f": "-exp(-x)"
     },
     {
      "f": "0.5*exp(-x)"
     },
     {
      "f": "-2*exp(-x)"
     }
    ],
    "x": [
     -1,
     4
    ],
    "y": [
     -3,
     3
    ],
    "xticks": [
     [
      1,
      "1"
     ],
     [
      2,
      "2"
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
    ]
   }
  },
  {
   "id": "E2-xy-2y",
   "chapter": 2,
   "game": "formulas",
   "topic": "singular points",
   "prompt": "On $\\mathbb{R}$, the solutions of $xy' = 2y$ form a vector space of dimension",
   "answer": "$2$",
   "distractors": [
    "$1$",
    "$0$",
    "$\\infty$"
   ],
   "explain": "On each half-line $y = cx^2$; at $0$ the coefficient of $y'$ vanishes, so the constants on both sides are independent ($c_-x^2$ then $c_+x^2$), and the glued function is still $C^1$.",
   "source": "Bettinelli Ex 3.24"
  },
  {
   "id": "E3-char",
   "chapter": 3,
   "game": "formulas",
   "topic": "constant coefficients",
   "prompt": "Characteristic polynomial of $y'' + ay' + by = 0$:",
   "answer": "$X^2 + aX + b$",
   "distractors": [
    "$X^2 + bX + a$",
    "$aX^2 + bX$",
    "$X^2 - aX + b$"
   ],
   "explain": "Try $y = e^{rx}$: $(r^2 + ar + b)e^{rx} = 0$.",
   "source": "Bettinelli Def 3.38"
  },
  {
   "id": "E3-distinct",
   "chapter": 3,
   "game": "formulas",
   "topic": "constant coefficients",
   "prompt": "Solutions of $y'' - y' - 2y = 0$:",
   "answer": "$\\lambda e^{-t} + \\mu e^{2t}$",
   "distractors": [
    "$\\lambda e^{t} + \\mu e^{-2t}$",
    "$(\\lambda + \\mu t)e^{2t}$",
    "$\\lambda\\cos 2t + \\mu\\sin 2t$"
   ],
   "explain": "$X^2 - X - 2 = (X + 1)(X - 2)$: roots $-1$ and $2$.",
   "source": "Bettinelli Ex 3.42"
  },
  {
   "id": "E3-double",
   "chapter": 3,
   "game": "formulas",
   "topic": "constant coefficients",
   "prompt": "Solutions of $y'' - 4y' + 4y = 0$:",
   "answer": "$(\\lambda + \\mu t)e^{2t}$",
   "distractors": [
    "$\\lambda e^{2t} + \\mu e^{-2t}$",
    "$\\lambda e^{2t}$",
    "$\\lambda\\cos 2t + \\mu\\sin 2t$"
   ],
   "explain": "Double root $2$: the second solution is $te^{2t}$. The space must have dimension $2$.",
   "source": "Bettinelli Ex 3.42"
  },
  {
   "id": "E3-complex",
   "chapter": 3,
   "game": "formulas",
   "topic": "constant coefficients",
   "prompt": "Solutions of $y'' + 2y' + 5y = 0$:",
   "answer": "$e^{-t}(\\lambda\\cos 2t + \\mu\\sin 2t)$",
   "distractors": [
    "$e^{t}(\\lambda\\cos 2t + \\mu\\sin 2t)$",
    "$\\lambda e^{-t} + \\mu e^{-5t}$",
    "$e^{-2t}(\\lambda\\cos t + \\mu\\sin t)$"
   ],
   "explain": "Roots $-1 \\pm 2i$: real part $\\to$ exponential, imaginary part $\\to$ frequency.",
   "source": "Bettinelli Cor 3.41"
  },
  {
   "id": "E3-cases",
   "chapter": 3,
   "game": "formulas",
   "topic": "constant coefficients",
   "prompt": "$y'' + 2by' + cy = 0$, $D = b^2 - c$. If $D < 0$, solutions are",
   "answer": "$e^{-bt}\\left(\\lambda\\cos(\\omega t) + \\mu\\sin(\\omega t)\\right)$ with $\\omega = \\sqrt{c - b^2}$",
   "distractors": [
    "$\\lambda e^{r_1 t} + \\mu e^{r_2 t}$ with real $r_1 \\ne r_2$",
    "$(\\lambda + \\mu t)e^{-bt}$",
    "$e^{bt}\\left(\\lambda\\cos(\\omega t) + \\mu\\sin(\\omega t)\\right)$"
   ],
   "explain": "Roots $-b \\pm i\\sqrt{c - b^2}$. $D > 0$: two real exponentials; $D = 0$: $(\\lambda + \\mu t)e^{-bt}$.",
   "source": "Bettinelli Cor 3.41"
  },
  {
   "id": "E3-which-graph",
   "chapter": 3,
   "game": "formulas",
   "topic": "constant coefficients",
   "prompt": "This is a solution of which equation?",
   "answer": "$y'' + 2y' + 5y = 0$",
   "distractors": [
    "$y'' + 4y = 0$",
    "$y'' - 2y' + 5y = 0$",
    "$y'' + 5y' + 4y = 0$"
   ],
   "explain": "Decaying oscillation: complex roots with negative real part. $y'' + 4y = 0$ never decays, $y'' - 2y' + 5y = 0$ grows, $y'' + 5y' + 4y = 0$ (roots $-1, -4$) does not oscillate.",
   "source": "Bettinelli ch. 3",
   "plot": {
    "fns": [
     {
      "f": "exp(-x)*cos(2*x)"
     },
     {
      "f": "exp(-x)",
      "dash": true
     },
     {
      "f": "-exp(-x)",
      "dash": true
     }
    ],
    "x": [
     0,
     6
    ],
    "y": [
     -1.2,
     1.2
    ],
    "xticks": [
     [
      3.141592653589793,
      "π"
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
    "caption": "y = e^(−t) cos 2t, dashed: ±e^(−t)"
   }
  },
  {
   "id": "E3-which-solution-graph",
   "chapter": 3,
   "game": "laws",
   "topic": "constant coefficients",
   "prompt": "Which graph is a solution of $y'' + 4y = 0$?",
   "answer": {
    "plot": {
     "fns": [
      {
       "f": "cos(2*x)"
      }
     ],
     "x": [
      0,
      7
     ],
     "y": [
      -1.5,
      1.5
     ],
     "xticks": [
      [
       3.141592653589793,
       "π"
      ],
      [
       6.283185307179586,
       "2π"
      ]
     ],
     "yticks": [
      [
       1,
       "1"
      ]
     ]
    }
   },
   "distractors": [
    {
     "plot": {
      "fns": [
       {
        "f": "exp(-x/2)*cos(2*x)"
       }
      ],
      "x": [
       0,
       7
      ],
      "y": [
       -1.5,
       1.5
      ],
      "xticks": [
       [
        3.141592653589793,
        "π"
       ],
       [
        6.283185307179586,
        "2π"
       ]
      ],
      "yticks": [
       [
        1,
        "1"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "cos(x/2)"
       }
      ],
      "x": [
       0,
       7
      ],
      "y": [
       -1.5,
       1.5
      ],
      "xticks": [
       [
        3.141592653589793,
        "π"
       ],
       [
        6.283185307179586,
        "2π"
       ]
      ],
      "yticks": [
       [
        1,
        "1"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "exp(-x)"
       }
      ],
      "x": [
       0,
       7
      ],
      "y": [
       -1.5,
       1.5
      ],
      "xticks": [
       [
        3.141592653589793,
        "π"
       ],
       [
        6.283185307179586,
        "2π"
       ]
      ],
      "yticks": [
       [
        1,
        "1"
       ]
      ]
     }
    }
   ],
   "explain": "Roots $\\pm 2i$: $\\lambda\\cos 2t + \\mu\\sin 2t$, period $\\pi$, constant amplitude.",
   "source": "Bettinelli ch. 3"
  },
  {
   "id": "E3-period",
   "chapter": 3,
   "game": "compute",
   "topic": "constant coefficients",
   "prompt": "Period of the nonzero solutions of $y'' + 9y = 0$? (exact allowed)",
   "answer": 2.094395,
   "explain": "$\\omega = 3$, period $\\frac{2\\pi}{\\omega}$.",
   "source": "Bettinelli ch. 3",
   "answerExpr": "2*pi/3",
   "answerTex": "$\\frac{2\\pi}{3}$"
  },
  {
   "id": "E3-ivp",
   "chapter": 3,
   "game": "compute",
   "topic": "constant coefficients",
   "prompt": "$y'' + y = 0$, $y(0) = 0$, $y'(0) = 2$. $y\\left(\\frac{\\pi}{2}\\right) =$ ?",
   "answer": 2,
   "explain": "$y = \\lambda\\cos t + \\mu\\sin t$; $y(0) = \\lambda = 0$, $y'(0) = \\mu = 2$: $y = 2\\sin t$.",
   "source": "Bettinelli ch. 3"
  },
  {
   "id": "E3-dimension",
   "chapter": 3,
   "game": "formulas",
   "topic": "structure",
   "prompt": "Dimension of the solution space of a homogeneous linear ODE of order $n$ with constant coefficients:",
   "answer": "$n$",
   "distractors": [
    "$1$",
    "$2$ always",
    "$n + 1$"
   ],
   "explain": "Hence $n$ initial conditions $y(x_0), \\ldots, y^{(n-1)}(x_0)$ fix the solution.",
   "source": "Bettinelli Thm 3.39"
  },
  {
   "id": "E3-third-order",
   "chapter": 3,
   "game": "formulas",
   "topic": "constant coefficients",
   "prompt": "Solutions of $y''' + y'' - y' - y = 0$:",
   "answer": "$\\lambda e^{t} + (\\mu + \\gamma t)e^{-t}$",
   "distractors": [
    "$\\lambda e^{t} + \\mu e^{-t} + \\gamma e^{-t}$",
    "$\\lambda e^{-t} + (\\mu + \\gamma t)e^{t}$",
    "$\\lambda e^{t} + \\mu e^{-t}$"
   ],
   "explain": "$X^3 + X^2 - X - 1 = (X + 1)^2(X - 1)$: the double root $-1$ brings $te^{-t}$. Three constants for order 3.",
   "source": "Bettinelli Ex 3.40"
  },
  {
   "id": "E4-structure",
   "chapter": 4,
   "game": "formulas",
   "topic": "structure",
   "prompt": "General solution of a nonhomogeneous linear ODE:",
   "answer": "one particular solution + the general solution of the homogeneous equation",
   "distractors": [
    "the general homogeneous solution only",
    "the sum of two particular solutions",
    "one particular solution times a constant"
   ],
   "explain": "The difference of two solutions solves the homogeneous equation.",
   "source": "Bettinelli Prop 3.37"
  },
  {
   "id": "E4-resonance-rule",
   "chapter": 4,
   "game": "formulas",
   "topic": "particular solutions",
   "prompt": "Right-hand side $P(t)e^{\\alpha t}$ ($P$ polynomial). Look for $Q(t)e^{\\alpha t}$ with $\\operatorname{deg} Q =$",
   "answer": "$\\operatorname{deg} P$, $\\operatorname{deg} P + 1$ or $\\operatorname{deg} P + 2$ when $\\alpha$ is not a root, a simple root, or a double root of the characteristic polynomial",
   "distractors": [
    "$\\operatorname{deg} P$ always",
    "$\\operatorname{deg} P + 1$ always",
    "$0$"
   ],
   "explain": "If $e^{\\alpha t}$ already solves the homogeneous equation, go up one degree (two for a double root).",
   "source": "Bettinelli Rem 3.44"
  },
  {
   "id": "E4-resonance-exp",
   "chapter": 4,
   "game": "formulas",
   "topic": "particular solutions",
   "prompt": "Particular solution of $y'' - y = e^t$:",
   "answer": "$\\frac{t}{2}e^t$",
   "distractors": [
    "$\\frac12 e^t$",
    "$t e^t$",
    "$\\frac{t^2}{2}e^t$"
   ],
   "explain": "$1$ is a simple root of $X^2 - 1$: try $ate^t$, get $2a e^t = e^t$. $\\frac12e^t$ fails: it is a homogeneous solution plus nothing.",
   "source": "Bettinelli Rem 3.44"
  },
  {
   "id": "E4-resonance-sin",
   "chapter": 4,
   "game": "formulas",
   "topic": "particular solutions",
   "prompt": "Particular solution of $y'' + y = \\sin t$:",
   "answer": "$-\\frac{t}{2}\\cos t$",
   "distractors": [
    "$-\\frac12\\sin t$",
    "$\\frac{t}{2}\\sin t$",
    "$t\\sin t$"
   ],
   "explain": "$i$ is a root of $X^2 + 1$: resonance, amplitude grows linearly. Work with $e^{it}$ and take the imaginary part.",
   "source": "Bettinelli Ex 3.45"
  },
  {
   "id": "E4-poly-rhs",
   "chapter": 4,
   "game": "formulas",
   "topic": "particular solutions",
   "prompt": "Particular solution of $y'' + y = t^2$:",
   "answer": "$t^2 - 2$",
   "distractors": [
    "$t^2$",
    "$\\frac{t^4}{12}$",
    "$t^2 + 2$"
   ],
   "explain": "$0$ is not a root: try a degree-2 polynomial. $(t^2 - 2)'' + t^2 - 2 = 2 + t^2 - 2$.",
   "source": "Bettinelli ch. 3"
  },
  {
   "id": "E4-system",
   "chapter": 4,
   "game": "formulas",
   "topic": "systems",
   "prompt": "$A = PDP^{-1}$ with $D$ diagonal. Solutions of $Y' = AY$:",
   "answer": "$Y(t) = P\\,e^{tD}P^{-1}Y(0)$, with $e^{tD} = \\mathrm{diag}(e^{\\lambda_i t})$",
   "distractors": [
    "$Y(t) = e^{tA}$ with $e^{tA} = \\left(e^{ta_{ij}}\\right)_{ij}$",
    "$Y(t) = e^{t\\,\\mathrm{tr}A}\\,Y(0)$",
    "$Y(t) = P\\,D\\,P^{-1}Y(0)\\,t$"
   ],
   "explain": "Set $Z = P^{-1}Y$: $Z' = DZ$ decouples into $z_i' = \\lambda_i z_i$. The matrix exponential is NOT entrywise.",
   "source": "Bettinelli 3.4"
  },
  {
   "id": "E4-system-eigen",
   "chapter": 4,
   "game": "formulas",
   "topic": "systems",
   "prompt": "$x' = 2x + y$, $y' = 2x + 3y$. The solutions are combinations of",
   "answer": "$e^{t}$ and $e^{4t}$",
   "distractors": [
    "$e^{2t}$ and $e^{3t}$",
    "$e^{t}$ and $e^{5t}$",
    "$\\cos t$ and $\\sin t$"
   ],
   "explain": "Eigenvalues of the matrix with rows $(2, 1)$ and $(2, 3)$: trace $5$, determinant $4$, so $\\lambda^2 - 5\\lambda + 4 = 0$, $\\lambda \\in \\{1, 4\\}$.",
   "source": "Bettinelli Ex 3.50"
  }
 ]
});
