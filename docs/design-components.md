# 103 Components

> Full specifications for all 22 components. Grouped by workflow.
> For tokens see [design.md](design.md). For rules & accessibility see [design-guidelines.md](design-guidelines.md).

---

## Actions

### Button

**Types:** Primary (ink fill) > Secondary (ink outline) > Link (no border, secondary ink). Height 36px, padding 0 12px, body size. Sentence case. At most one primary per screen.

| Property | Value |
|---|---|
| Class | `button`, `button.primary`, `button.link` |
| Hover | Inverts (primary returns to outline) |
| Focus | 2px ink outline, 2px offset |
| Disabled | Muted text, `--line` border |
| Shortcut | Optional `kbd` inside, 8px left margin, border in `currentColor` |

**Do:** name the result ("Export JSON", "Replace my data"). **Don't:** "Submit", "OK", trailing arrows.

---

### Hero start button

The one bold control on Home. 52px tall, 22px padding, 18px semibold, primary style, with `Enter` key cap. `data-testid="home-start-button"`. Its label follows the selected mode ("Start Tables", "Open the drill", "Start the interview").

---

### Icon button

32 × 32px, `--line` border, secondary ink; hover shows an ink border. Text glyph (◐, ?). Always `aria-label`.

---

### Key cap

`kbd`: 12px mono, 1px muted border, min width 1.8em, line height 18px. Used inside buttons, key-hint rows, the help table and the footer.

---

## Input

### Text field / number field

Height 40px, 1px muted border, 10px radius, tabular figures. Always a `<label>` (visible, or `.sr-only`) plus `name` and `autocomplete="off"`. Placeholders show an example and end with `…` ("28, 24, 25…").

| Property | Value |
|---|---|
| Number width | 5.5em |
| Error | Inline `.err` line below, `aria-live="polite"`, focus moves to the field to fix |

---

### Answer box (game)

7ch wide, 44px mono, centred, 1px ink border. Focus indicator is the box itself (2px border). Digits only in Zetamac rounds (`inputmode="numeric"`), digits `. - /` in Interview. Always focused during a round; clicks anywhere refocus it. A wrong Interview answer shows a 3px outline for 150 ms.

### Matrix answer grid (game)

Matrix rounds only. The question is A × B as two 2 × 2 grids in square brackets (2px ink strokes with 8px top and bottom
serifs, so they never read as determinant bars), mono, `clamp(32px, 6vw, 56px)`. Below, "=" and the same brackets around
four answer boxes (`.g-in.g-cell`, 4ch, 36px, 12px gaps), labelled "Row 1, column 1"… Space moves to the next box, arrows
to the neighbour; focus selects the box's text so typing replaces it. A wrong filled box shown by Enter gets a 3px ink
outline (`.bad`) until it is edited. `data-testid`: `game-matrix-a`, `game-matrix-b`, `game-cell-0`…`game-cell-3`.

### Finance sprint (game)

The overlay with `#game.fin`: the question is a sentence, so it is set in the text face (`clamp(20px, 3.2vw, 30px)`, line height
1.4, centred, max 34em) instead of the big mono figures. The answer box is 8ch; the unit (`€`, `%`, `bp`…) sits beside it in
32px `--mid` (`.g-unit`, `game-unit`); the answer instruction ("Answer in %, one decimal.") is the `g-hint` line under it.
A wrong Enter shows the 150 ms 3px outline, as in Interview, and the `g-method` line says "Not right. Press H to pause and learn."
A quiet outline button under it (`.g-learn-btn`, 32px, 13px `--mid`, `--line` border) reads "Pause and learn H". Paused
(`#game.paused`): the timer reads "Paused" in ink and bold, the box goes read-only with a `--line` border, and the panel
(`.g-learn`, text face 18px, max 40em, 1px ink rule above) shows "The answer is X" (24px), the formula in mono, numbered
steps, the why paragraph and a primary "Back to the round Enter" button. On resume the line says "Type the answer to go on.
No point for this one." When the solution is taller than the window the round screen scrolls: `.g-center` starts at the top
with auto margins (centred while it fits), so the question is never pushed out of reach. `data-testid`: `game-learn`, `game-learn-panel`, `game-resume`.

### Formula line (maths)

"Formula" in `--mid`, then the formula drawn by the browser as MathML (`.tex`): a maths font stack (Cambria Math, STIX Two
Math, Latin Modern Math, `math`), 1.2em, ink colour, display-size fractions (`math-style: normal`), `alttext` = the plain
formula for screen readers. It scrolls sideways inside its box on a narrow screen instead of overflowing. Used in Practice
results, end-screen worked answers and the sprint pause panel. The same maths appears inside sentences (questions, steps,
explanations, options): on the text baseline at 1.1em, a formula and the punctuation after it never split across lines, and
a step list too wide for a phone scrolls sideways as a whole. Without TeX (arithmetic templates) it is the plain formula in mono.

### Finance question card (page)

Practice, Intuition and Interview mix, on the page (max 46em): topic and difficulty in 13px `--mid`, the prompt at 18px,
the instruction line, then either the answer field (44px, 20px text, unit beside it, Check button; an unreadable entry shows
an `.err` line and is not counted) or 4 option buttons (full width, ≥ 44px tall, key cap 1–4). After answering, options are
disabled: the right one inverted (ink fill) and tagged "Right answer", a wrong pick keeps a 3px border and "Your answer".
The result block under a 1px ink rule: verdict (bold "Right." / "Not quite."), formula in mono, numbered steps, one "why"
paragraph, then Next (primary, focused), Same type with new numbers, Practise the calculation, and the question code
(`template #seed`) in small `--mid`. End screens list every question as a `<details>` row (result on its own small line,
then the prompt) that opens on the worked answer.

---

### Select

Same box as a text field; explicit `background-color` and `color` for Windows dark mode.

---

### Checkbox / radio

Native control with `accent-color: var(--fg)`, wrapped in its `<label>` so label and control are one hit target.

---

### File picker

Native input; `::file-selector-button` styled as a secondary button.

---

### Form row

`.form`: two-column grid, 200px label | control, 12px vertical padding, 1px rule between rows; one column under 640px. Hints below the control in 13px muted text.

---

## Navigation

### Top bar

Three-zone grid `1fr auto 1fr`: brand left (`translate="no"`), tabs centred in a pill track (`--surface`), tools right (round icon buttons). No bottom rule.

| Property | Value |
|---|---|
| Tab | 17px/15px vertical padding, secondary ink; hover ink |
| Active tab | `aria-current="page"`, ink, 600, a `--chip` pill in the track |
| Compact | Brand row, then tabs on their own row |
| Tabs | Play · Learn · Matrices · Finance · Review · Stats · Settings. Stats sections are not tabs. |

---

### Skip link

First in tab order, off-screen until focused, then shown top-left in inverted colours. Focuses `main` without changing the hash route.

---

### Mode list

Two groups ("Zetamac" 1–4, "Training" 5–7) under an `h3` in 13px secondary ink. Each row is a full-width `button`:

| Column | Content |
|---|---|
| Key | 26px badge, 6px radius, `--chip` fill, 13px semibold number |
| Name | Body 500 (700 when recommended) |
| Description | 14px secondary ink, plain phrase ("× and ÷, 2–12 by 2–100, 60 seconds") |
| Tag | 13px, "Recommended" or "Warm up first" |

Selected row: inverted, `aria-pressed="true"`. Clicking a row selects it; clicking the selected row starts it. Custom's form opens under its row.

---

### Segmented toggle

Joined outline buttons (30px, 13px); the active one filled, `aria-pressed`. Used for heatmap views (Combined | Multiplication | Division), the Matrices and Finance options. The choice is mirrored in the URL (`#review/div`) or remembered in settings. Groups wrap on narrow screens. A multi-select group (Finance families) uses the same look; two adjacent chosen buttons keep a `--bg` hairline between them.

---

## Containment

### Page head

`h1` 32px bold, optional subtitle in secondary ink (≤ 70ch), actions right-aligned and wrapping.

---

### Section

`section.sec`: 48px top margin; `h2` 18px semibold, no rule; optional right-aligned aside in 13px secondary ink, only when it carries information (a count, the view toggle). Optional `.sec-intro` sentence.

---

### Hero (Home)

"Why" line (secondary ink: "Warm up first, then Foundations", "Today's training, step 1 of 3", "Your choice"), the mode name at 56px bold as the page `h1`, a description at 18px, an optional note, then the hero start button.

---

### Step block

A `<details>`: ink rule above, `--line` below. The summary is one line: "Step 1: Foundations" (24px bold, `h2`), the 3-box streak (24px mono, `aria-label="2 of 3 days done"`) and "2 of 3 days done", with the disclosure marker right. Open, it shows the rule sentence and today's status.

---

### Stats overview

One screen at 1366 × 768, six blocks in a grid (two columns from 900px, stacked in reading order below): the headline panel
(`overview-headline`: small grey label, the benchmark at 48px/600 with its arrow, a grey source line; then
`overview-milestones`), the three tiles (`overview-tiles`, the usual `.stats`), what costs most (`overview-costs`: a
numbered list, each row a link to `#road` with ~points right-aligned), activity (`overview-activity`) and the
"Detailed analysis → D" button (`overview-more`).
- Arrow: ↑ ↓ → plus the signed difference against the 7 days before, — when a week is empty; the words are in an
  `sr-only` span. Shape and sign carry the meaning, no colour.
- Milestone bar: a 6px pill track from 20 to 60 (`--line`), filled in `--fg` up to the value; a 12px ring per milestone,
  filled when reached (2 complete sessions in a row); labels under it, the first and last kept inside the track.
- Activity strip: 28 squares of 10px (3px gap, 14 a row under 420px): filled `--fg` = a day with a round, else a `--line`
  outline; `role="img"` with "You played on N of the last 28 days".
- Definition tooltip (`.def`): a number wrapped with `tabindex="0"` and `aria-describedby` pointing to its `.tip`
  (`role="tooltip"`, inverted, 13px, max 300px), shown on hover and focus, no transition.

### Stats mode picker and details

`stats-modes`: the Zetamac modes as a `.seg`; "Road to 60 drills" and "Other modes" as `<details>` (`stats-group-*`)
with their own `.seg`, closed unless the mode shown is inside. A grouped entry (matrices, Finance, Learn, × ÷ mixes) is one
button; the shown one adds a labelled `<select>` of its variants. Details: `.det` panels (`--surface`, summary 600 weight),
closed by default, beside the calendar in `.stats-cal`.

### Stats calendar and day panel

The calendar (300px) sits beside the details on the mode page, stacked under 640px; a played day opens the day page.
Calendar (`.cal`, `--surface`, 16px radius): month name and ‹ › icon buttons (disabled before the first played month and
after this month), weekday initials (narrow, Monday first, from `Intl`), then square day cells (6px radius, 4px gap).
A day you played this mode is a `--chip` button with a label ("Tuesday, October 20, 2 rounds, average 31.0"); a day with
other modes only has a 3px dot; today is underlined.
Day page: a `.seg` of the modes played that day (when more than one), the date as `h2` (24px bold), "<mode>, day N of
practice", score chips (pill, `--surface`; the score is a link to the round page, × deletes with a confirm), a `facts` row
(average, median time, usually, first-try accuracy), one pace sentence, then "Slowest and wrong": up to 5 rows.

---

### Help dialog

Full-screen opaque overlay, `role="dialog" aria-modal`, `h2` title, Close button with `Esc`, `overscroll-behavior: contain`. Opening focuses Close.

---

## Data Display

### Stat block

Row of 2–4 tiles (`--surface`, 16px radius, 8px gap): 13px label, 24px tabular value, optional 13px note. 2-up under 640px. `data-testid="stat-<key>"`.

---

### Facts grid

`dl.facts`: auto-fill columns of min 130px; 13px label above a 15px value. Replaces any "a · b · c" string. Numeric values in mono.

---

### Table

Full width, 1px `--line` rows, 8px vertical padding, numbers right-aligned in mono. Headers 13px secondary ink with `scope="col"`. Sortable headers are link buttons with ▲/▼ and `aria-sort`. Long tables use `content-visibility: auto` per row.

---

### Heatmap

12 × 12 grid of 34px cells (header row and column of numbers). Each cell is a `button` whose ink layer has opacity = (median − fastest) / (slowest − fastest); empty cells show a muted dot. Arrow keys move a roving tabindex; hover or focus fills the side readout. Division view: rows = divisor, columns = answer. `data-testid="heatmap-cell-<view>-<row>-<col>"`.

---

### Charts

Line chart: 2px ink line, hollow 8px dots for "best", dashed threshold, dotted average, hairline grid at clean ticks, end-of-line value label. Bar chart: ≤ 24px bars with 4px rounded tops, value on each cap. Every chart: legend for ≥ 2 series, crosshair tooltip on hover and focus (values first, line keys), ← → keyboard movement, "Show as table" twin.

---

### Tooltip

Fixed, 1px ink border, surface background, 13px; header in secondary ink, rows of key · **value** · label. Built with `textContent` only.

---

### Weak-fact list

Numbered rows (counter in muted mono), fact in 20px mono, "2.9 s, weak" in 13px secondary ink.

---

## Feedback

### Notice

Left bar 2px ink, 12px padding. `.strong`: 4px bar + semibold (fatigue, step complete). `.quiet`: muted bar, secondary ink, 14px (backup reminder).

---

### App alert

`role="alert"` panel under the top bar (`--surface`, 10px radius), semibold. Shown only when saving to the browser fails.

---

### Game screen

Full-screen, only four things: timer (top left, mono 22px, secondary ink), score (top right), the question (display size, centred), the answer box. Interview adds "12 / 80" between timer and score. `data-testid`: `game-timer`, `game-score`, `game-question`, `game-count`.

---

### End screen

Hidden `h1`, the score at 112px mono beside the mode and "Round 4 today", a button row (Play again · Drill these slow questions · See today's analysis · Home, each with its key), stat blocks, then Freezes and Slowest questions sections. `data-testid="end-score"`.
