// The two sample decks of the spec (a copy of js/decks/series.js and trig.js as shipped on 2026-11-12), so the tests do
// not depend on the decks the coach ships next. E2E passes them as window.AT_DECK_FIXTURES.
module.exports = {
 "series": {
  "id": "series",
  "title": "Series & limits",
  "section": "Analysis",
  "idPrefix": "S",
  "version": "2026-11-12-sample",
  "chapters": {
   "1": "Usual limits",
   "2": "Usual series",
   "3": "Asymptotics"
  },
  "scopes": null,
  "reference": [
   {
    "title": "(1 + 1/x)^x → e",
    "plot": {
     "fns": [
      {
       "f": "(1+1/x)^x"
      },
      {
       "f": "e",
       "dash": true
      }
     ],
     "x": [
      0,
      20
     ],
     "y": [
      0,
      3.2
     ],
     "xticks": [
      [
       5,
       "5"
      ],
      [
       10,
       "10"
      ],
      [
       15,
       "15"
      ],
      [
       20,
       "20"
      ]
     ],
     "yticks": [
      [
       1,
       "1"
      ],
      [
       2,
       "2"
      ],
      [
       2.71828,
       "e"
      ]
     ],
     "caption": "y = (1 + 1/x)^x"
    }
   }
  ],
  "cards": [
   {
    "id": "S1-one-plus-x-over-n",
    "chapter": 1,
    "game": "formulas",
    "topic": "usual limits",
    "prompt": "For $x \\in \\mathbb{R}$, $\\lim_{n \\to \\infty} \\left(1 + \\frac{x}{n}\\right)^n =$ ?",
    "answer": "$e^{x}$",
    "distractors": [
     "$1$",
     "$+\\infty$",
     "$e^{-x}$",
     "$x$"
    ],
    "explain": "$n \\log(1 + x/n) = n\\left(\\frac{x}{n} + o\\left(\\frac1n\\right)\\right) \\to x$. Not $1$: the classic $1^\\infty$ trap.",
    "source": "Analysis; TD5 Ex4"
   },
   {
    "id": "S1-one-plus-2-over-n-3n",
    "chapter": 1,
    "game": "compute",
    "topic": "usual limits",
    "prompt": "$\\lim_{n \\to \\infty} \\left(1 + \\frac{2}{n}\\right)^{3n} =$ ? (exact expression allowed, e.g. e^2)",
    "answer": 403.4288,
    "answerExpr": "e^6",
    "answerTex": "$e^6$",
    "explain": "$3n \\log(1 + 2/n) \\to 6$.",
    "source": "Analysis"
   },
   {
    "id": "S1-asymptote-e",
    "chapter": 1,
    "game": "formulas",
    "topic": "usual limits",
    "prompt": "Horizontal asymptote of the plotted function as $x \\to +\\infty$?",
    "plot": {
     "fns": [
      {
       "f": "(1+1/x)^x"
      }
     ],
     "x": [
      0,
      20
     ],
     "y": [
      0,
      3.2
     ],
     "xticks": [
      [
       10,
       "10"
      ],
      [
       20,
       "20"
      ]
     ],
     "yticks": [
      [
       1,
       "1"
      ],
      [
       2,
       "2"
      ],
      [
       3,
       "3"
      ]
     ],
     "caption": "y = (1 + 1/x)^x"
    },
    "answer": "$y = e$",
    "distractors": [
     "$y = 1$",
     "$y = 2$",
     "$y = 3$"
    ],
    "explainPlot": {
     "fns": [
      {
       "f": "(1+1/x)^x"
      },
      {
       "f": "e",
       "dash": true
      }
     ],
     "x": [
      0,
      20
     ],
     "y": [
      0,
      3.2
     ],
     "yticks": [
      [
       2.71828,
       "e"
      ]
     ],
     "caption": "dashed: y = e"
    },
    "explain": "$(1 + 1/x)^x = e^{x\\log(1 + 1/x)} \\to e^1$. It increases towards $e \\approx 2.718$ without reaching it.",
    "source": "Analysis"
   },
   {
    "id": "S2-geometric",
    "chapter": 2,
    "game": "formulas",
    "topic": "usual series",
    "prompt": "For $|q| < 1$, $\\sum_{n \\ge 0} q^n =$ ?",
    "answer": "$\\frac{1}{1-q}$",
    "distractors": [
     "$\\frac{q}{1-q}$",
     "$\\frac{1}{1+q}$",
     "$\\frac{1}{(1-q)^2}$"
    ],
    "explain": "Partial sums $\\frac{1 - q^{N+1}}{1-q}$ and $q^{N+1} \\to 0$. Starting at $n = 1$ gives $\\frac{q}{1-q}$.",
    "source": "Analysis"
   },
   {
    "id": "S2-harmonic-diverges",
    "chapter": 2,
    "game": "truefalse",
    "topic": "usual series",
    "prompt": "$\\sum_{n \\ge 1} \\frac{1}{n}$ converges.",
    "answer": false,
    "explain": "$\\sum_{k \\le N} \\frac1k \\sim \\log N \\to \\infty$. Riemann: $\\sum n^{-s}$ converges iff $s > 1$.",
    "source": "Analysis; L5"
   }
  ]
 },
 "trig": {
  "id": "trig",
  "title": "Trigonometry",
  "section": "Analysis",
  "idPrefix": "T",
  "version": "2026-11-12-sample",
  "chapters": {
   "1": "Values",
   "2": "Inverse functions",
   "3": "Graphs",
   "4": "Identities"
  },
  "scopes": null,
  "reference": [
   {
    "title": "arccos",
    "plot": {
     "fns": [
      {
       "f": "acos(x)"
      }
     ],
     "x": [
      -1.5,
      1.5
     ],
     "y": [
      -0.5,
      3.5
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
       1.5708,
       "π/2"
      ],
      [
       3.1416,
       "π"
      ]
     ],
     "points": [
      {
       "x": -1,
       "y": 3.1416
      },
      {
       "x": 1,
       "y": 0
      }
     ],
     "caption": "arccos : [−1, 1] → [0, π]"
    }
   },
   {
    "title": "arctan",
    "plot": {
     "fns": [
      {
       "f": "atan(x)"
      }
     ],
     "x": [
      -6,
      6
     ],
     "y": [
      -2,
      2
     ],
     "hlines": [
      1.5708,
      -1.5708
     ],
     "xticks": [
      [
       -5,
       "−5"
      ],
      [
       5,
       "5"
      ]
     ],
     "yticks": [
      [
       1.5708,
       "π/2"
      ],
      [
       -1.5708,
       "−π/2"
      ]
     ],
     "caption": "arctan : ℝ → (−π/2, π/2)"
    }
   }
  ],
  "cards": [
   {
    "id": "T2-which-arctan",
    "chapter": 2,
    "game": "laws",
    "topic": "graphs",
    "prompt": "Which graph is $x \\mapsto \\arctan x$?",
    "answer": {
     "plot": {
      "fns": [
       {
        "f": "atan(x)"
       }
      ],
      "x": [
       -6,
       6
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
        1.5708,
        "π/2"
       ]
      ]
     }
    },
    "distractors": [
     {
      "plot": {
       "fns": [
        {
         "f": "tanh(x)"
        }
       ],
       "x": [
        -6,
        6
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
         1.5708,
         "π/2"
        ]
       ]
      }
     },
     {
      "plot": {
       "fns": [
        {
         "f": "x/sqrt(1+x^2)"
        }
       ],
       "x": [
        -6,
        6
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
         1.5708,
         "π/2"
        ]
       ]
      }
     },
     {
      "plot": {
       "fns": [
        {
         "f": "acos(x/6)"
        }
       ],
       "x": [
        -6,
        6
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
         1.5708,
         "π/2"
        ]
       ]
      }
     }
    ],
    "explain": "$\\arctan$ is odd, increasing, with horizontal asymptotes $\\pm\\frac{\\pi}{2} \\approx \\pm 1.57$. $\\tanh$ and $\\frac{x}{\\sqrt{1+x^2}}$ level off at $\\pm 1$.",
    "source": "Analysis"
   },
   {
    "id": "T2-arccos-range",
    "chapter": 2,
    "game": "laws",
    "topic": "inverse functions",
    "prompt": "Domain and range of $\\arccos$ (plotted)?",
    "plot": {
     "fns": [
      {
       "f": "acos(x)"
      }
     ],
     "x": [
      -1.5,
      1.5
     ],
     "y": [
      -0.5,
      3.5
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
       1.5708,
       "π/2"
      ],
      [
       3.1416,
       "π"
      ]
     ],
     "points": [
      {
       "x": -1,
       "y": 3.1416
      },
      {
       "x": 1,
       "y": 0
      }
     ]
    },
    "answer": "$[-1, 1] \\to [0, \\pi]$",
    "distractors": [
     "$[-1, 1] \\to [-\\frac{\\pi}{2}, \\frac{\\pi}{2}]$",
     "$\\mathbb{R} \\to [0, \\pi]$",
     "$[0, \\pi] \\to [-1, 1]$"
    ],
    "explain": "Inverse of $\\cos$ restricted to $[0, \\pi]$, where it decreases. $\\arcsin$ goes to $[-\\frac{\\pi}{2}, \\frac{\\pi}{2}]$.",
    "source": "Analysis"
   }
  ]
 }
};
