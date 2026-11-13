// js/decks/trig.js — Trigonometry deck for 103. Written by Louis's coach; replace the whole file.
// Sources: Pacard, Analysis (ch. 5, 6, 9.6, 10.2, 11.3).

AT.registerDeck({
 "id": "trig",
 "title": "Trigonometry",
 "section": "Analysis",
 "idPrefix": "T",
 "version": "2026-11-13-v1",
 "chapters": {
  "1": "Values",
  "2": "Inverse functions",
  "3": "Graphs",
  "4": "Identities",
  "5": "Hyperbolic functions"
 },
 "scopes": null,
 "reference": [
  {
   "title": "cos and sin",
   "plot": {
    "fns": [
     {
      "f": "cos(x)"
     },
     {
      "f": "sin(x)",
      "dash": true
     }
    ],
    "x": [
     -7,
     7
    ],
    "y": [
     -1.5,
     1.5
    ],
    "xticks": [
     [
      -3.141592653589793,
      "−π"
     ],
     [
      -1.5707963267948966,
      "−π/2"
     ],
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
     ],
     [
      -1,
      "−1"
     ]
    ],
    "caption": "solid: cos, dashed: sin"
   }
  },
  {
   "title": "tan",
   "plot": {
    "fns": [
     {
      "f": "tan(x)"
     }
    ],
    "x": [
     -5,
     5
    ],
    "y": [
     -4,
     4
    ],
    "xticks": [
     [
      -3.141592653589793,
      "−π"
     ],
     [
      -1.5707963267948966,
      "−π/2"
     ],
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
    "vlines": [
     -1.5707963267948966,
     1.5707963267948966,
     -4.71238898038469,
     4.71238898038469
    ],
    "caption": "tan: period π, asymptotes π/2 + kπ"
   }
  },
  {
   "title": "arcsin",
   "plot": {
    "fns": [
     {
      "f": "asin(x)"
     }
    ],
    "x": [
     -1.5,
     1.5
    ],
    "y": [
     -2,
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
      -1.5707963267948966,
      "−π/2"
     ],
     [
      1.5707963267948966,
      "π/2"
     ]
    ],
    "points": [
     {
      "x": -1,
      "y": -1.5707963267948966
     },
     {
      "x": 1,
      "y": 1.5707963267948966
     }
    ],
    "caption": "arcsin : [−1, 1] → [−π/2, π/2]"
   }
  },
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
      1.5707963267948966,
      "π/2"
     ],
     [
      3.141592653589793,
      "π"
     ]
    ],
    "points": [
     {
      "x": -1,
      "y": 3.141592653589793
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
      -1.5707963267948966,
      "−π/2"
     ],
     [
      1.5707963267948966,
      "π/2"
     ]
    ],
    "hlines": [
     1.5707963267948966,
     -1.5707963267948966
    ],
    "caption": "arctan : ℝ → (−π/2, π/2)"
   }
  },
  {
   "title": "cosh, sinh, tanh",
   "plot": {
    "fns": [
     {
      "f": "cosh(x)"
     },
     {
      "f": "sinh(x)",
      "dash": true
     },
     {
      "f": "tanh(x)"
     }
    ],
    "x": [
     -3,
     3
    ],
    "y": [
     -4,
     4
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
    "caption": "cosh (min 1), sinh (dashed), tanh (between ±1)"
   }
  }
 ],
 "cards": [
  {
   "id": "T1-unit-circle",
   "chapter": 1,
   "game": "formulas",
   "topic": "unit circle",
   "prompt": "$(\\cos\\theta, \\sin\\theta)$ for $\\theta = \\frac{\\pi}{6}$:",
   "answer": "$\\left(\\frac{\\sqrt3}{2}, \\frac12\\right)$",
   "distractors": [
    "$\\left(\\frac12, \\frac{\\sqrt3}{2}\\right)$",
    "$\\left(\\frac{\\sqrt2}{2}, \\frac{\\sqrt2}{2}\\right)$",
    "$\\left(\\frac{\\sqrt3}{2}, \\frac{\\sqrt3}{3}\\right)$"
   ],
   "explain": "Small angle ⇒ cos is the big one. $\\frac{\\pi}{3}$ swaps them: $\\left(\\frac12, \\frac{\\sqrt3}{2}\\right)$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-cos-pi6",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\cos\\frac{\\pi}{6} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 0.866025,
   "answerExpr": "sqrt(3)/2",
   "answerTex": "$\\frac{\\sqrt3}{2}$",
   "explain": "Half-equilateral triangle: adjacent side $\\frac{\\sqrt3}{2}$, hypotenuse $1$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-sin-pi4",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\sin\\frac{\\pi}{4} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 0.707107,
   "answerExpr": "sqrt(2)/2",
   "answerTex": "$\\frac{\\sqrt2}{2}$",
   "explain": "Isosceles right triangle: $\\sin = \\cos = \\frac{1}{\\sqrt2}$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-tan-pi3",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\tan\\frac{\\pi}{3} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 1.732051,
   "answerExpr": "sqrt(3)",
   "answerTex": "$\\sqrt3$",
   "explain": "$\\frac{\\sqrt3/2}{1/2}$. And $\\tan\\frac{\\pi}{6} = \\frac{1}{\\sqrt3} = \\frac{\\sqrt3}{3}$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-cos-2pi3",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\cos\\frac{2\\pi}{3} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": -0.5,
   "answerExpr": "-1/2",
   "answerTex": "$-\\frac12$",
   "explain": "$\\cos(\\pi - \\frac{\\pi}{3}) = -\\cos\\frac{\\pi}{3}$: second quadrant, cos negative.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-sin-5pi6",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\sin\\frac{5\\pi}{6} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 0.5,
   "answerExpr": "1/2",
   "answerTex": "$\\frac12$",
   "explain": "$\\sin(\\pi - x) = \\sin x$: same as $\\sin\\frac{\\pi}{6}$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-cos-3pi4",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\cos\\frac{3\\pi}{4} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": -0.707107,
   "answerExpr": "-sqrt(2)/2",
   "answerTex": "$-\\frac{\\sqrt2}{2}$",
   "explain": "Second quadrant: cos negative, reference angle $\\frac{\\pi}{4}$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-sin-7pi6",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\sin\\frac{7\\pi}{6} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": -0.5,
   "answerExpr": "-1/2",
   "answerTex": "$-\\frac12$",
   "explain": "$\\sin(\\pi + x) = -\\sin x$: third quadrant, sin negative.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-tan-5pi6",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\tan\\frac{5\\pi}{6} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": -0.57735,
   "answerExpr": "-sqrt(3)/3",
   "answerTex": "$-\\frac{\\sqrt3}{3}$",
   "explain": "$\\tan$ has period $\\pi$: $\\tan\\frac{5\\pi}{6} = \\tan\\left(-\\frac{\\pi}{6}\\right) = -\\frac{1}{\\sqrt3}$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-sin-minus-pi3",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\sin\\left(-\\frac{\\pi}{3}\\right) =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": -0.866025,
   "answerExpr": "-sqrt(3)/2",
   "answerTex": "$-\\frac{\\sqrt3}{2}$",
   "explain": "$\\sin$ is odd.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-cos-pi12",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\cos\\frac{\\pi}{12} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 0.965926,
   "answerExpr": "(sqrt(6)+sqrt(2))/4",
   "answerTex": "$\\frac{\\sqrt6 + \\sqrt2}{4}$",
   "explain": "$\\cos\\left(\\frac{\\pi}{3} - \\frac{\\pi}{4}\\right) = \\frac12\\frac{\\sqrt2}{2} + \\frac{\\sqrt3}{2}\\frac{\\sqrt2}{2}$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-tan-pi12",
   "chapter": 1,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\tan\\frac{\\pi}{12} =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 0.267949,
   "answerExpr": "2-sqrt(3)",
   "answerTex": "$2 - \\sqrt3$",
   "explain": "$\\tan\\left(\\frac{\\pi}{3} - \\frac{\\pi}{4}\\right) = \\frac{\\sqrt3 - 1}{1 + \\sqrt3} = 2 - \\sqrt3$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-symmetries",
   "chapter": 1,
   "game": "formulas",
   "topic": "symmetries",
   "prompt": "Which identity is WRONG?",
   "answer": "$\\cos(\\pi - x) = \\cos x$",
   "distractors": [
    "$\\sin(\\pi - x) = \\sin x$",
    "$\\cos\\left(\\frac{\\pi}{2} - x\\right) = \\sin x$",
    "$\\cos(x + \\pi) = -\\cos x$"
   ],
   "explain": "$\\cos(\\pi - x) = -\\cos x$ (symmetry about the vertical axis of the circle). Draw the unit circle rather than memorise.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-tan-domain",
   "chapter": 1,
   "game": "statements",
   "topic": "domains",
   "prompt": "$\\tan$ is defined exactly on",
   "answer": "$\\mathbb{R} \\setminus \\left\\{\\frac{\\pi}{2} + k\\pi : k \\in \\mathbb{Z}\\right\\}$",
   "distractors": [
    "$\\mathbb{R} \\setminus \\{k\\pi : k \\in \\mathbb{Z}\\}$",
    "$\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$",
    "$\\mathbb{R} \\setminus \\left\\{\\frac{\\pi}{2} + 2k\\pi\\right\\}$"
   ],
   "explain": "Where $\\cos x \\ne 0$. $\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$ is only the branch used to define $\\arctan$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T1-cos-equation",
   "chapter": 1,
   "game": "statements",
   "topic": "equations",
   "prompt": "$\\cos x = \\cos a$ iff",
   "answer": "$x = a + 2k\\pi$ or $x = -a + 2k\\pi$, $k \\in \\mathbb{Z}$",
   "distractors": [
    "$x = a + 2k\\pi$ or $x = \\pi - a + 2k\\pi$",
    "$x = a + k\\pi$",
    "$x = \\pm a$"
   ],
   "explain": "$\\cos$ is even. For $\\sin x = \\sin a$: $x = a + 2k\\pi$ or $\\pi - a + 2k\\pi$. For $\\tan$: $x = a + k\\pi$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-sin-equation",
   "chapter": 1,
   "game": "statements",
   "topic": "equations",
   "prompt": "$\\sin x = \\sin a$ iff",
   "answer": "$x = a + 2k\\pi$ or $x = \\pi - a + 2k\\pi$, $k \\in \\mathbb{Z}$",
   "distractors": [
    "$x = a + 2k\\pi$ or $x = -a + 2k\\pi$",
    "$x = a + k\\pi$",
    "$x = a$ or $x = \\pi + a$"
   ],
   "explain": "$\\sin(\\pi - a) = \\sin a$: the two points of the unit circle at the same height.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T1-count-solutions",
   "chapter": 1,
   "game": "compute",
   "topic": "equations",
   "prompt": "Number of solutions of $\\sin x = \\frac12$ in $[0, 2\\pi)$?",
   "answer": 2,
   "explain": "$x = \\frac{\\pi}{6}$ and $x = \\frac{5\\pi}{6}$.",
   "source": "Pacard ch. 5"
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
      1.5707963267948966,
      "π/2"
     ],
     [
      3.141592653589793,
      "π"
     ]
    ],
    "points": [
     {
      "x": -1,
      "y": 3.141592653589793
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
  },
  {
   "id": "T2-arcsin-range",
   "chapter": 2,
   "game": "laws",
   "topic": "inverse functions",
   "prompt": "Domain and range of $\\arcsin$?",
   "answer": "$[-1, 1] \\to \\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$",
   "distractors": [
    "$[-1, 1] \\to [0, \\pi]$",
    "$\\mathbb{R} \\to \\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$",
    "$\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right] \\to [-1, 1]$"
   ],
   "explainPlot": {
    "fns": [
     {
      "f": "asin(x)"
     }
    ],
    "x": [
     -1.5,
     1.5
    ],
    "y": [
     -2,
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
      -1.5707963267948966,
      "−π/2"
     ],
     [
      1.5707963267948966,
      "π/2"
     ]
    ],
    "points": [
     {
      "x": -1,
      "y": -1.5707963267948966
     },
     {
      "x": 1,
      "y": 1.5707963267948966
     }
    ],
    "caption": "y = arcsin x"
   },
   "explain": "Inverse of $\\sin$ on $\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$, where it increases. Odd function.",
   "source": "Pacard 10.2, 11.3.1"
  },
  {
   "id": "T2-arctan-range",
   "chapter": 2,
   "game": "laws",
   "topic": "inverse functions",
   "prompt": "Domain and range of $\\arctan$?",
   "answer": "$\\mathbb{R} \\to \\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$",
   "distractors": [
    "$\\mathbb{R} \\to \\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$",
    "$[-1, 1] \\to \\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$",
    "$\\mathbb{R} \\to (0, \\pi)$"
   ],
   "explainPlot": {
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
      -1.5707963267948966,
      "−π/2"
     ],
     [
      1.5707963267948966,
      "π/2"
     ]
    ],
    "hlines": [
     1.5707963267948966,
     -1.5707963267948966
    ],
    "caption": "dashed: asymptotes ±π/2"
   },
   "explain": "Open interval: $\\pm\\frac{\\pi}{2}$ are horizontal asymptotes, never reached.",
   "source": "Pacard 11.3.1"
  },
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
       1.5707963267948966,
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
        1.5707963267948966,
        "π/2"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "x/2"
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
        1.5707963267948966,
        "π/2"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "acos(x/6)-pi/2"
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
        1.5707963267948966,
        "π/2"
       ]
      ]
     }
    }
   ],
   "explain": "$\\arctan$ is odd, increasing, slope $1$ at $0$, asymptotes $\\pm\\frac{\\pi}{2} \\approx \\pm 1.57$. $\\tanh$ levels off at $\\pm 1$; the straight line has no asymptote; the last curve stops at $x = \\pm 6$.",
   "source": "Analysis"
  },
  {
   "id": "T2-which-arccos",
   "chapter": 2,
   "game": "laws",
   "topic": "graphs",
   "prompt": "Which graph is $x \\mapsto \\arccos x$?",
   "answer": {
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
      -2,
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
       1.5707963267948966,
       "π/2"
      ],
      [
       3.141592653589793,
       "π"
      ]
     ]
    }
   },
   "distractors": [
    {
     "plot": {
      "fns": [
       {
        "f": "asin(x)"
       }
      ],
      "x": [
       -1.5,
       1.5
      ],
      "y": [
       -2,
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
        1.5707963267948966,
        "π/2"
       ],
       [
        3.141592653589793,
        "π"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "pi-acos(x)"
       }
      ],
      "x": [
       -1.5,
       1.5
      ],
      "y": [
       -2,
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
        1.5707963267948966,
        "π/2"
       ],
       [
        3.141592653589793,
        "π"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "2*atan(x)+pi/2"
       }
      ],
      "x": [
       -1.5,
       1.5
      ],
      "y": [
       -2,
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
        1.5707963267948966,
        "π/2"
       ],
       [
        3.141592653589793,
        "π"
       ]
      ]
     }
    }
   ],
   "explain": "$\\arccos$ DEcreases from $\\pi$ (at $-1$) to $0$ (at $1$), passing $\\frac{\\pi}{2}$ at $0$. $\\arcsin$ increases from $-\\frac{\\pi}{2}$ to $\\frac{\\pi}{2}$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arccos-half",
   "chapter": 2,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\arccos\\frac12 =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 1.047198,
   "answerExpr": "pi/3",
   "answerTex": "$\\frac{\\pi}{3}$",
   "explain": "The angle in $[0, \\pi]$ whose cosine is $\\frac12$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arcsin-minus-half",
   "chapter": 2,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\arcsin\\left(-\\frac12\\right) =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": -0.523599,
   "answerExpr": "-pi/6",
   "answerTex": "$-\\frac{\\pi}{6}$",
   "explain": "Odd function, value in $\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$. Not $\\frac{7\\pi}{6}$: out of range.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arctan-sqrt3",
   "chapter": 2,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\arctan\\sqrt3 =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 1.047198,
   "answerExpr": "pi/3",
   "answerTex": "$\\frac{\\pi}{3}$",
   "explain": "$\\tan\\frac{\\pi}{3} = \\sqrt3$ and $\\frac{\\pi}{3} \\in \\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arccos-minus1",
   "chapter": 2,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\arccos(-1) =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 3.141593,
   "answerExpr": "pi",
   "answerTex": "$\\pi$",
   "explain": "End point of the range $[0, \\pi]$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arcsin-sin-trap",
   "chapter": 2,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\arcsin\\left(\\sin\\frac{3\\pi}{4}\\right) =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 0.785398,
   "answerExpr": "pi/4",
   "answerTex": "$\\frac{\\pi}{4}$",
   "explain": "NOT $\\frac{3\\pi}{4}$: $\\arcsin$ returns the angle in $\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$ with the same sine, here $\\pi - \\frac{3\\pi}{4}$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arccos-cos-trap",
   "chapter": 2,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\arccos\\left(\\cos\\frac{3\\pi}{2}\\right) =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": 1.570796,
   "answerExpr": "pi/2",
   "answerTex": "$\\frac{\\pi}{2}$",
   "explain": "$\\cos\\frac{3\\pi}{2} = 0$ and $\\arccos 0 = \\frac{\\pi}{2}$. $\\arccos(\\cos x) = x$ only for $x \\in [0, \\pi]$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arctan-tan-trap",
   "chapter": 2,
   "game": "compute",
   "topic": "exact values",
   "prompt": "$\\arctan\\left(\\tan\\frac{3\\pi}{4}\\right) =$ ? (exact, e.g. sqrt(3)/2)",
   "answer": -0.785398,
   "answerExpr": "-pi/4",
   "answerTex": "$-\\frac{\\pi}{4}$",
   "explain": "$\\tan\\frac{3\\pi}{4} = -1$ and $\\arctan(-1) = -\\frac{\\pi}{4}$: the representative in $\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$ modulo $\\pi$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-compose-trap",
   "chapter": 2,
   "game": "truefalse",
   "topic": "inverse functions",
   "prompt": "$\\arcsin(\\sin x) = x$ for every $x \\in \\mathbb{R}$.",
   "answer": false,
   "explain": "Only for $x \\in \\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$. The other way, $\\sin(\\arcsin y) = y$ holds for every $y \\in [-1, 1]$.",
   "source": "Pacard 10.2"
  },
  {
   "id": "T2-arcsin-plus-arccos",
   "chapter": 2,
   "game": "formulas",
   "topic": "identities",
   "prompt": "For $x \\in [-1, 1]$, $\\arcsin x + \\arccos x =$ ?",
   "answer": "$\\frac{\\pi}{2}$",
   "distractors": [
    "$\\pi$",
    "$0$",
    "$\\frac{\\pi}{2}$ only for $x \\ge 0$"
   ],
   "explain": "$\\cos\\left(\\frac{\\pi}{2} - \\arcsin x\\right) = x$ and $\\frac{\\pi}{2} - \\arcsin x \\in [0, \\pi]$. Or: the derivative of the sum is $0$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arctan-inverse",
   "chapter": 2,
   "game": "formulas",
   "topic": "identities",
   "prompt": "For $x > 0$, $\\arctan x + \\arctan\\frac1x =$ ?",
   "answer": "$\\frac{\\pi}{2}$",
   "distractors": [
    "$0$",
    "$\\pi$",
    "$\\frac{\\pi}{4}$"
   ],
   "explain": "Complementary angles of a right triangle with legs $1$ and $x$. For $x < 0$ the sum is $-\\frac{\\pi}{2}$ (odd function).",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arctan-inverse-neg",
   "chapter": 2,
   "game": "truefalse",
   "topic": "identities",
   "prompt": "$\\arctan x + \\arctan\\frac1x = \\frac{\\pi}{2}$ for every $x \\ne 0$.",
   "answer": false,
   "explain": "For $x < 0$ it is $-\\frac{\\pi}{2}$: the function is odd. The derivative of the sum is $0$ on each half-line separately.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-cos-arcsin",
   "chapter": 2,
   "game": "formulas",
   "topic": "identities",
   "prompt": "For $x \\in [-1, 1]$, $\\cos(\\arcsin x) =$ ?",
   "answer": "$\\sqrt{1 - x^2}$",
   "distractors": [
    "$1 - x^2$",
    "$\\pm\\sqrt{1 - x^2}$",
    "$\\frac{1}{\\sqrt{1 - x^2}}$"
   ],
   "explain": "$\\cos^2 = 1 - \\sin^2 = 1 - x^2$, and the sign is $+$ because $\\arcsin x \\in \\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$ where $\\cos \\ge 0$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-sin-arctan",
   "chapter": 2,
   "game": "formulas",
   "topic": "identities",
   "prompt": "$\\sin(\\arctan x) =$ ?",
   "answer": "$\\frac{x}{\\sqrt{1 + x^2}}$",
   "distractors": [
    "$\\frac{1}{\\sqrt{1 + x^2}}$",
    "$\\frac{x}{1 + x^2}$",
    "$\\sqrt{1 + x^2}$"
   ],
   "explain": "Right triangle with legs $1$ and $x$, hypotenuse $\\sqrt{1 + x^2}$. $\\cos(\\arctan x) = \\frac{1}{\\sqrt{1 + x^2}}$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T2-arctan-sum-2",
   "chapter": 2,
   "game": "compute",
   "topic": "identities",
   "prompt": "$\\arctan 2 + \\arctan\\frac12 =$ ? (exact)",
   "answer": 1.570796,
   "answerExpr": "pi/2",
   "answerTex": "$\\frac{\\pi}{2}$",
   "explain": "$\\arctan x + \\arctan\\frac1x = \\frac{\\pi}{2}$ for $x > 0$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T3-which-tan",
   "chapter": 3,
   "game": "laws",
   "topic": "graphs",
   "prompt": "Which graph is $x \\mapsto \\tan x$?",
   "answer": {
    "plot": {
     "fns": [
      {
       "f": "tan(x)"
      }
     ],
     "x": [
      -4.5,
      4.5
     ],
     "y": [
      -4,
      4
     ],
     "xticks": [
      [
       -1.5707963267948966,
       "−π/2"
      ],
      [
       1.5707963267948966,
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
        "f": "1/tan(x)"
       }
      ],
      "x": [
       -4.5,
       4.5
      ],
      "y": [
       -4,
       4
      ],
      "xticks": [
       [
        -1.5707963267948966,
        "−π/2"
       ],
       [
        1.5707963267948966,
        "π/2"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "x^3/4"
       }
      ],
      "x": [
       -4.5,
       4.5
      ],
      "y": [
       -4,
       4
      ],
      "xticks": [
       [
        -1.5707963267948966,
        "−π/2"
       ],
       [
        1.5707963267948966,
        "π/2"
       ]
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "1/cos(x)"
       }
      ],
      "x": [
       -4.5,
       4.5
      ],
      "y": [
       -4,
       4
      ],
      "xticks": [
       [
        -1.5707963267948966,
        "−π/2"
       ],
       [
        1.5707963267948966,
        "π/2"
       ]
      ]
     }
    }
   ],
   "explain": "$\\tan$: period $\\pi$, increasing on each branch, vertical asymptotes at $\\pm\\frac{\\pi}{2}$, zero at $0$. $\\frac{1}{\\tan}$ decreases with asymptotes at $k\\pi$; $\\frac{1}{\\cos}$ never crosses $(-1, 1)$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T3-which-cos",
   "chapter": 3,
   "game": "laws",
   "topic": "graphs",
   "prompt": "Which graph is $x \\mapsto \\cos x$?",
   "answer": {
    "plot": {
     "fns": [
      {
       "f": "cos(x)"
      }
     ],
     "x": [
      -7,
      7
     ],
     "y": [
      -1.5,
      1.5
     ],
     "xticks": [
      [
       -3.141592653589793,
       "−π"
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
     ]
    }
   },
   "distractors": [
    {
     "plot": {
      "fns": [
       {
        "f": "sin(x)"
       }
      ],
      "x": [
       -7,
       7
      ],
      "y": [
       -1.5,
       1.5
      ],
      "xticks": [
       [
        -3.141592653589793,
        "−π"
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
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "-cos(x)"
       }
      ],
      "x": [
       -7,
       7
      ],
      "y": [
       -1.5,
       1.5
      ],
      "xticks": [
       [
        -3.141592653589793,
        "−π"
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
      ]
     }
    },
    {
     "plot": {
      "fns": [
       {
        "f": "cos(2*x)"
       }
      ],
      "x": [
       -7,
       7
      ],
      "y": [
       -1.5,
       1.5
      ],
      "xticks": [
       [
        -3.141592653589793,
        "−π"
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
      ]
     }
    }
   ],
   "explain": "Even, value $1$ at $0$, period $2\\pi$, zeros at $\\pm\\frac{\\pi}{2}$. $\\cos 2x$ has period $\\pi$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T3-period",
   "chapter": 3,
   "game": "formulas",
   "topic": "periods",
   "prompt": "Period of the plotted function $x \\mapsto \\left| \\sin x \\right|$?",
   "plot": {
    "fns": [
     {
      "f": "abs(sin(x))"
     }
    ],
    "x": [
     -7,
     7
    ],
    "y": [
     -0.5,
     1.5
    ],
    "xticks": [
     [
      -3.141592653589793,
      "−π"
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
    ]
   },
   "answer": "$\\pi$",
   "distractors": [
    "$2\\pi$",
    "$\\frac{\\pi}{2}$",
    "$4\\pi$"
   ],
   "explain": "$\\left| \\sin(x + \\pi) \\right| = \\left| -\\sin x \\right|$. In general $\\sin(\\omega x)$ has period $\\frac{2\\pi}{\\omega}$.",
   "source": "Pacard 9.6"
  },
  {
   "id": "T3-period-omega",
   "chapter": 3,
   "game": "formulas",
   "topic": "periods",
   "prompt": "Period of $x \\mapsto \\cos(3x)$?",
   "answer": "$\\frac{2\\pi}{3}$",
   "distractors": [
    "$6\\pi$",
    "$\\frac{\\pi}{3}$",
    "$2\\pi$"
   ],
   "explain": "$\\cos(3(x + T)) = \\cos(3x + 3T)$: need $3T = 2\\pi$.",
   "source": "Pacard 9.6"
  },
  {
   "id": "T3-parity",
   "chapter": 3,
   "game": "truefalse",
   "topic": "parity",
   "prompt": "$\\sin$, $\\tan$, $\\arcsin$ and $\\arctan$ are odd; $\\cos$ is even; $\\arccos$ is neither.",
   "answer": true,
   "explain": "$\\arccos(-x) = \\pi - \\arccos x$: symmetric about the point $\\left(0, \\frac{\\pi}{2}\\right)$, not about $0$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T3-arccos-symmetry",
   "chapter": 3,
   "game": "formulas",
   "topic": "parity",
   "prompt": "$\\arccos(-x) =$ ?",
   "answer": "$\\pi - \\arccos x$",
   "distractors": [
    "$-\\arccos x$",
    "$\\arccos x$",
    "$\\frac{\\pi}{2} - \\arccos x$"
   ],
   "explain": "$\\cos(\\pi - \\theta) = -\\cos\\theta$, and $\\pi - \\arccos x \\in [0, \\pi]$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T3-tan-asymptote",
   "chapter": 3,
   "game": "truefalse",
   "topic": "graphs",
   "prompt": "$\\lim_{x \\to (\\pi/2)^-} \\tan x = +\\infty$ and $\\lim_{x \\to (\\pi/2)^+} \\tan x = -\\infty$.",
   "answer": true,
   "plot": {
    "fns": [
     {
      "f": "tan(x)"
     }
    ],
    "x": [
     -1,
     4.5
    ],
    "y": [
     -5,
     5
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
    "vlines": [
     1.5707963267948966
    ]
   },
   "explain": "$\\sin \\to 1$ while $\\cos \\to 0^+$ from the left and $0^-$ from the right.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T4-cos-sum",
   "chapter": 4,
   "game": "formulas",
   "topic": "addition formulas",
   "prompt": "$\\cos(a + b) =$ ?",
   "answer": "$\\cos a \\cos b - \\sin a \\sin b$",
   "distractors": [
    "$\\cos a \\cos b + \\sin a \\sin b$",
    "$\\sin a \\cos b + \\cos a \\sin b$",
    "$\\cos a + \\cos b$"
   ],
   "explain": "Minus sign for $\\cos(a + b)$, plus for $\\cos(a - b)$. Fastest check: $a = b = \\frac{\\pi}{2}$ gives $-1$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T4-sin-sum",
   "chapter": 4,
   "game": "formulas",
   "topic": "addition formulas",
   "prompt": "$\\sin(a + b) =$ ?",
   "answer": "$\\sin a \\cos b + \\cos a \\sin b$",
   "distractors": [
    "$\\sin a \\sin b + \\cos a \\cos b$",
    "$\\sin a \\cos b - \\cos a \\sin b$",
    "$\\sin a + \\sin b$"
   ],
   "explain": "Real part / imaginary part of $e^{ia}e^{ib} = e^{i(a+b)}$ give both formulas at once.",
   "source": "Pacard ch. 5, 6"
  },
  {
   "id": "T4-tan-sum",
   "chapter": 4,
   "game": "formulas",
   "topic": "addition formulas",
   "prompt": "$\\tan(a + b) =$ ? (when defined)",
   "answer": "$\\frac{\\tan a + \\tan b}{1 - \\tan a \\tan b}$",
   "distractors": [
    "$\\frac{\\tan a + \\tan b}{1 + \\tan a \\tan b}$",
    "$\\tan a + \\tan b$",
    "$\\frac{\\tan a - \\tan b}{1 - \\tan a \\tan b}$"
   ],
   "explain": "Divide $\\sin(a+b)$ and $\\cos(a+b)$ by $\\cos a \\cos b$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T4-cos-double",
   "chapter": 4,
   "game": "formulas",
   "topic": "double angle",
   "prompt": "Which is NOT equal to $\\cos 2x$?",
   "answer": "$2\\sin^2 x - 1$",
   "distractors": [
    "$\\cos^2 x - \\sin^2 x$",
    "$2\\cos^2 x - 1$",
    "$1 - 2\\sin^2 x$"
   ],
   "explain": "$\\cos 2x = 2\\cos^2 x - 1 = 1 - 2\\sin^2 x$: the signs are opposite in the two versions.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T4-sin-double",
   "chapter": 4,
   "game": "formulas",
   "topic": "double angle",
   "prompt": "$\\sin 2x =$ ?",
   "answer": "$2\\sin x \\cos x$",
   "distractors": [
    "$2\\sin x$",
    "$\\sin^2 x - \\cos^2 x$",
    "$\\sin x \\cos x$"
   ],
   "explain": "$\\sin(x + x)$ with the addition formula.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T4-linearise",
   "chapter": 4,
   "game": "formulas",
   "topic": "linearisation",
   "prompt": "$\\cos^2 x =$ ?",
   "answer": "$\\frac{1 + \\cos 2x}{2}$",
   "distractors": [
    "$\\frac{1 - \\cos 2x}{2}$",
    "$1 - \\sin^2 2x$",
    "$\\frac{\\cos 2x}{2}$"
   ],
   "explain": "From $\\cos 2x = 2\\cos^2 x - 1$. And $\\sin^2 x = \\frac{1 - \\cos 2x}{2}$. Key for $\\int \\cos^2$.",
   "source": "Pacard ch. 5; Bettinelli 1.2.6"
  },
  {
   "id": "T4-tan-squared",
   "chapter": 4,
   "game": "formulas",
   "topic": "identities",
   "prompt": "$1 + \\tan^2 x =$ ?",
   "answer": "$\\frac{1}{\\cos^2 x}$",
   "distractors": [
    "$\\frac{1}{\\sin^2 x}$",
    "$\\cos^2 x$",
    "$\\tan 2x$"
   ],
   "explain": "Divide $\\cos^2 + \\sin^2 = 1$ by $\\cos^2$. It is also $\\tan'(x)$.",
   "source": "Pacard 11.3.1"
  },
  {
   "id": "T4-amplitude",
   "chapter": 4,
   "game": "compute",
   "topic": "phase-amplitude",
   "prompt": "Maximum of $x \\mapsto 3\\cos x + 4\\sin x$?",
   "answer": 5,
   "explain": "$a\\cos x + b\\sin x = R\\cos(x - \\varphi)$ with $R = \\sqrt{a^2 + b^2} = 5$.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T4-phase-tool",
   "chapter": 4,
   "game": "tool",
   "topic": "phase-amplitude",
   "prompt": "Solve or bound $a\\cos x + b\\sin x$. First move?",
   "answer": "Write it as $R\\cos(x - \\varphi)$ with $R = \\sqrt{a^2 + b^2}$, $\\cos\\varphi = \\frac aR$, $\\sin\\varphi = \\frac bR$",
   "distractors": [
    "Square both sides",
    "Replace $\\sin x$ by $\\sqrt{1 - \\cos^2 x}$",
    "Use $\\sin x \\approx x$"
   ],
   "explain": "Expand $R\\cos(x - \\varphi)$ and identify. Squaring or replacing $\\sin$ loses the sign information.",
   "source": "Pacard ch. 5"
  },
  {
   "id": "T4-euler",
   "chapter": 4,
   "game": "formulas",
   "topic": "complex form",
   "prompt": "Euler: $\\cos x =$ ?",
   "answer": "$\\frac{e^{ix} + e^{-ix}}{2}$",
   "distractors": [
    "$\\frac{e^{ix} - e^{-ix}}{2}$",
    "$\\frac{e^{ix} - e^{-ix}}{2i}$",
    "$\\frac{e^{x} + e^{-x}}{2}$"
   ],
   "explain": "$\\sin x = \\frac{e^{ix} - e^{-ix}}{2i}$. Without the $i$ you get $\\cosh x$.",
   "source": "Pacard ch. 6"
  },
  {
   "id": "T4-de-moivre",
   "chapter": 4,
   "game": "statements",
   "topic": "complex form",
   "prompt": "De Moivre: $(\\cos x + i\\sin x)^n =$ ?",
   "answer": "$\\cos nx + i\\sin nx$",
   "distractors": [
    "$\\cos^n x + i\\sin^n x$",
    "$n\\cos x + in\\sin x$",
    "$\\cos nx - i\\sin nx$"
   ],
   "explain": "$(e^{ix})^n = e^{inx}$. Expanding the left side with the binomial formula gives $\\cos nx$, $\\sin nx$ as polynomials in $\\cos x, \\sin x$.",
   "source": "Pacard ch. 6"
  },
  {
   "id": "T5-cosh-def",
   "chapter": 5,
   "game": "formulas",
   "topic": "hyperbolic",
   "prompt": "$\\operatorname{cosh} x$ and $\\operatorname{sinh} x$ are",
   "answer": "$\\frac{e^x + e^{-x}}{2}$ and $\\frac{e^x - e^{-x}}{2}$",
   "distractors": [
    "$\\frac{e^x - e^{-x}}{2}$ and $\\frac{e^x + e^{-x}}{2}$",
    "$\\frac{e^{ix} + e^{-ix}}{2}$ and $\\frac{e^{ix} - e^{-ix}}{2i}$",
    "$e^x + e^{-x}$ and $e^x - e^{-x}$"
   ],
   "explain": "Even and odd parts of $e^x$: $\\operatorname{cosh} + \\operatorname{sinh} = e^x$.",
   "source": "Pacard 11.3.5"
  },
  {
   "id": "T5-identity",
   "chapter": 5,
   "game": "formulas",
   "topic": "hyperbolic",
   "prompt": "$\\operatorname{cosh}^2 x - \\operatorname{sinh}^2 x =$ ?",
   "answer": "$1$",
   "distractors": [
    "$-1$",
    "$\\operatorname{cosh} 2x$",
    "$e^{2x}$"
   ],
   "explain": "$(\\operatorname{cosh} - \\operatorname{sinh})(\\operatorname{cosh} + \\operatorname{sinh}) = e^{-x}e^{x}$. Hyperbola $X^2 - Y^2 = 1$, hence the name.",
   "source": "Pacard 11.3.5"
  },
  {
   "id": "T5-derivatives",
   "chapter": 5,
   "game": "formulas",
   "topic": "hyperbolic",
   "prompt": "$\\operatorname{cosh}'$ and $\\operatorname{sinh}'$ are",
   "answer": "$\\operatorname{sinh}$ and $\\operatorname{cosh}$",
   "distractors": [
    "$-\\operatorname{sinh}$ and $\\operatorname{cosh}$",
    "$\\operatorname{sinh}$ and $-\\operatorname{cosh}$",
    "$\\operatorname{cosh}$ and $\\operatorname{sinh}$"
   ],
   "explain": "No minus sign, unlike $\\cos' = -\\sin$.",
   "source": "Pacard 11.3.5"
  },
  {
   "id": "T5-which-cosh",
   "chapter": 5,
   "game": "laws",
   "topic": "hyperbolic",
   "prompt": "Which graph is $\\operatorname{cosh}$?",
   "answer": {
    "plot": {
     "fns": [
      {
       "f": "cosh(x)"
      }
     ],
     "x": [
      -3,
      3
     ],
     "y": [
      -3,
      5
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
        "f": "sinh(x)"
       }
      ],
      "x": [
       -3,
       3
      ],
      "y": [
       -3,
       5
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
        "f": "1+x^2/2"
       }
      ],
      "x": [
       -3,
       3
      ],
      "y": [
       -3,
       5
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
        "f": "exp(x)"
       }
      ],
      "x": [
       -3,
       3
      ],
      "y": [
       -3,
       5
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
   "explain": "Even, minimum $1$ at $0$, grows like $\\frac{e^{\\left| x \\right|}}{2}$. The parabola $1 + \\frac{x^2}{2}$ is its order-2 Taylor polynomial: same shape near $0$, far below at $\\left| x \\right| = 3$.",
   "source": "Pacard 11.3.5"
  },
  {
   "id": "T5-tanh-range",
   "chapter": 5,
   "game": "laws",
   "topic": "hyperbolic",
   "prompt": "Range of $\\operatorname{tanh} = \\frac{\\operatorname{sinh}}{\\operatorname{cosh}}$?",
   "answer": "$(-1, 1)$",
   "distractors": [
    "$[-1, 1]$",
    "$\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$",
    "$\\mathbb{R}$"
   ],
   "explainPlot": {
    "fns": [
     {
      "f": "tanh(x)"
     }
    ],
    "x": [
     -5,
     5
    ],
    "y": [
     -1.5,
     1.5
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
    "hlines": [
     1,
     -1
    ],
    "caption": "y = tanh x"
   },
   "explain": "$\\operatorname{tanh} x = \\frac{e^{2x} - 1}{e^{2x} + 1}$: asymptotes $\\pm 1$. Do not confuse with $\\arctan$ ($\\pm\\frac{\\pi}{2}$).",
   "source": "Pacard 11.3.5"
  }
 ]
});
