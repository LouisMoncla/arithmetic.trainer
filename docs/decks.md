# Writing a Learn deck

A deck is one data file. This page is the whole format. `tests/decks.test.js` validates every file in `js/decks/`, so
a mistake fails `npm test`, and the app skips an invalid card with a console warning instead of crashing.

## Adding a deck

1. Create `js/decks/<id>.js` (the file name is the deck id) with one `AT.registerDeck({ … })` call, nothing else.
2. Add `<script src="js/decks/<id>.js"></script>` to `index.html`, after `js/deck-ui.js` and before `js/app.js`. There is no
   build step, so this line cannot be automatic (a test fails if it is missing).
3. Run `npm test`.

The Learn menu groups decks by `section`, in the order of the script tags. A deck with no valid card is hidden.

## The deck

```js
AT.registerDeck({
  id: "series",                 // lowercase letters and digits; also the route #learn/series; not a Learn route already
  title: "Series & limits",     // shown in the menu and on the page
  section: "Analysis",          // the Learn menu section it appears in
  idPrefix: "S",                // 1–3 capital letters, unique; card ids are S1-…, S2-… (prefix + chapter number)
  version: "2026-11-13",        // shown on the hub
  chapters: { 1: "Usual limits", 2: "Usual series" },   // numbers from 1, with titles (rows of the progress table)
  scopes: null,                 // or [{ label: "Chapters 1–2", maxChapter: 2 }, { label: "All", maxChapter: 4 }] (a switch)
  reference: [ { title: "arccos", plot: { … } } ],      // optional: the Graph sheet (key G on the hub)
  cards: [ … ]
});
```

Optional: `noun` ("Chapter" by default; the word for a chapter in the UI) and `blurb` (a few words in the menu).

## A card

```js
{ id: "S1-one-plus-x-over-n",   // ^<idPrefix><chapter>-[a-z0-9-]+$, unique, stable forever
  chapter: 1,                   // a key of chapters, and the number in the id
  game: "formulas",             // laws | statements | tool | truefalse | formulas | proof | compute
  topic: "usual limits",        // a short tag
  complement: false,            // optional: shown only with "Show complements"
  source: "TD5 Ex4",            // optional
  prompt: "… $\\lim_{n \\to \\infty} …$ …",   // text with maths between $…$ (see the TeX list in js/proba-cards.js)
  answer: "$e^{x}$",            // MCQ games: a string · truefalse: true/false · compute: a number
  distractors: ["$1$", "$e^{-x}$", "$x$"],   // MCQ games: 3 to 5, distinct from each other and from the answer
  hint: "…",                    // optional (without one, H removes half of the wrong choices)
  explain: "…",                 // required, 1–2 sentences
  tol: 0.002,                   // compute only, optional
  target: 20,                   // optional: the mastery time target in seconds (default per game)
  plot: { … },                  // optional: a graph under the prompt
  explainPlot: { … },           // optional: a graph shown with the explanation, after answering
  answerExpr: "e^6",            // compute only, optional: the exact answer; must equal `answer` within the tolerance
  answerTex: "$e^6$" }          // compute only, optional: how the feedback draws it
```

The seven games and their time targets: laws 8 s, statements 12, tool 15, truefalse 8, formulas 10, proof 15, compute 40.

### Typed answers (compute cards)

`answer` is a number; the player may type any expression with that value: `0.375`, `0,375`, `3/8`, `2e-3`, `pi/3`,
`sqrt(3)/2`, `e^6`, `2pi`, `arccos(0)`. Tolerance: `max(0.0005, 0.001·|answer|)` unless `tol`. Say in the prompt when an exact
expression is welcome.

| | |
|---|---|
| Numbers | `0.375` `0,375` `.5` `2e-3` |
| Operators | `+ - * / ^`, unary minus, parentheses; `^` binds tighter than unary minus and is right-associative |
| Products | `2pi` `3sqrt(2)` `2(x+1)`; two numbers in a row (`3 8`) are not a product |
| Constants | `pi` (or `π`), `e` |
| Functions | `sqrt exp ln log sin cos tan asin acos atan` (also `arcsin arccos arctan`) `sinh cosh tanh abs floor`, always with parentheses |
| Variable | `x`, for plots only; a typed answer containing `x` is unreadable |

Rejected as unreadable (and not counted as an attempt): `1/2/3` (write `(1/2)/3`), `--2`, `2e` (write `2*e`), `sqrt(-1)`,
`1/0`, anything unknown. No `eval` anywhere.

## A graph

```js
plot: {
  fns: [ { f: "acos(x)" }, { f: "pi/2", dash: true } ],   // 1–6 expressions in x; dash = dashed grey line
  x: [-1.5, 1.5], y: [-0.5, 3.5],                         // the window (x0 < x1, y0 < y1)
  xticks: [[-1, "−1"], [1, "1"]],                         // [value, plain-text label], inside the window
  yticks: [[1.5708, "π/2"], [3.1416, "π"]],
  points: [ { x: -1, y: 3.1416 }, { x: 1, y: 0, open: true } ],   // dots (open = hollow)
  vlines: [ ], hlines: [ 1.5708 ],                        // dashed guides (asymptotes)
  caption: "arccos : [−1, 1] → [0, π]"                    // optional, plain text under the graph
}
```

- Tick labels and the caption are plain Unicode (`π/2`, `−1`): no TeX inside a graph. Unknown fields are errors.
- Curves are black on light and white on dark. Where the function is undefined (`acos(x)` outside [−1, 1]) or jumps (`tan`),
  the curve breaks, so `tan` draws separate branches. Anything outside the window is clipped.
- The window should keep curves readable: for `tan` use a y-range like `[-4, 4]`.

### Graphs as the choices

`answer` and every distractor are `{ plot, label? }` objects, all graphs or all text (not mixed), 3 to 5 distractors, all
different. Shown as a 2-column grid (1 column on a phone); keys 1–6 choose.

```js
answer: { plot: { fns: [{ f: "atan(x)" }], x: [-6, 6], y: [-2, 2] } },
distractors: [ { plot: { … } }, { plot: { … }, label: "tanh" }, { plot: { … } } ]
```

Keep the windows and ticks identical across the choices so the shapes are what differs.

## Testing a new deck by eye

Open `index.html`, go to Learn, open the deck, start Learn on a cell. Both themes and a narrow window are worth a look: a
long formula scrolls sideways inside its box on a phone, so split long equations across several `$…$` pieces.
