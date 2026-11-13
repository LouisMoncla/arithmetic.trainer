AT.registerDeck({
  id: "trig", title: "Trigonometry", section: "Analysis", idPrefix: "T",
  version: "2026-11-12-sample",
  chapters: { 1: "Values", 2: "Inverse functions", 3: "Graphs", 4: "Identities" },
  scopes: null,
  reference: [
    { title: "arccos", plot: { fns: [ { f: "acos(x)" } ], x: [-1.5, 1.5], y: [-0.5, 3.5], xticks: [[-1,"−1"],[1,"1"]], yticks: [[1.5708,"π/2"],[3.1416,"π"]], points: [ { x: -1, y: 3.1416 }, { x: 1, y: 0 } ], caption: "arccos : [−1, 1] → [0, π]" } },
    { title: "arctan", plot: { fns: [ { f: "atan(x)" } ], x: [-6, 6], y: [-2, 2], hlines: [1.5708, -1.5708], xticks: [[-5,"−5"],[5,"5"]], yticks: [[1.5708,"π/2"],[-1.5708,"−π/2"]], caption: "arctan : ℝ → (−π/2, π/2)" } }
  ],
  cards: [
    { id: "T2-which-arctan", chapter: 2, game: "laws", topic: "graphs",
      prompt: "Which graph is $x \\mapsto \\arctan x$?",
      answer: { plot: { fns: [ { f: "atan(x)" } ], x: [-6, 6], y: [-2, 2], yticks: [[1,"1"],[1.5708,"π/2"]] } },
      distractors: [
        { plot: { fns: [ { f: "tanh(x)" } ], x: [-6, 6], y: [-2, 2], yticks: [[1,"1"],[1.5708,"π/2"]] } },
        { plot: { fns: [ { f: "x/sqrt(1+x^2)" } ], x: [-6, 6], y: [-2, 2], yticks: [[1,"1"],[1.5708,"π/2"]] } },
        { plot: { fns: [ { f: "acos(x/6)" } ], x: [-6, 6], y: [-2, 2], yticks: [[1,"1"],[1.5708,"π/2"]] } }
      ],
      explain: "$\\arctan$ is odd, increasing, with horizontal asymptotes $\\pm\\frac{\\pi}{2} \\approx \\pm 1.57$. $\\tanh$ and $\\frac{x}{\\sqrt{1+x^2}}$ level off at $\\pm 1$.",
      source: "Analysis" },

    { id: "T2-arccos-range", chapter: 2, game: "laws", topic: "inverse functions",
      prompt: "Domain and range of $\\arccos$ (plotted)?",
      plot: { fns: [ { f: "acos(x)" } ], x: [-1.5, 1.5], y: [-0.5, 3.5], xticks: [[-1,"−1"],[1,"1"]], yticks: [[1.5708,"π/2"],[3.1416,"π"]], points: [ { x: -1, y: 3.1416 }, { x: 1, y: 0 } ] },
      answer: "$[-1, 1] \\to [0, \\pi]$",
      distractors: ["$[-1, 1] \\to [-\\frac{\\pi}{2}, \\frac{\\pi}{2}]$", "$\\mathbb{R} \\to [0, \\pi]$", "$[0, \\pi] \\to [-1, 1]$"],
      explain: "Inverse of $\\cos$ restricted to $[0, \\pi]$, where it decreases. $\\arcsin$ goes to $[-\\frac{\\pi}{2}, \\frac{\\pi}{2}]$.",
      source: "Analysis" }
  ]
});
