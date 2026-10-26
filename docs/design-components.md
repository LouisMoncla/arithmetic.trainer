# Arithmetic Trainer Components

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

Height 36px, 1px ink border, square, mono face (all inputs hold numbers or codes). Always a `<label>` (visible, or `.sr-only`) plus `name` and `autocomplete="off"`. Placeholders show an example and end with `…` ("28, 24, 25…").

| Property | Value |
|---|---|
| Number width | 5.5em |
| Error | Inline `.err` line below, `aria-live="polite"`, focus moves to the field to fix |

---

### Answer box (game)

7ch wide, 44px mono, centred, 1px ink border. Focus indicator is the box itself (2px border). Digits only in Zetamac rounds (`inputmode="numeric"`), digits `. - /` in Interview. Always focused during a round; clicks anywhere refocus it. A wrong Interview answer shows a 3px outline for 150 ms.

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

Three-zone grid `1fr auto 1fr`: brand left (`translate="no"`), tabs centred, tools right. Bottom rule 1px `--line`.

| Property | Value |
|---|---|
| Tab | 17px/15px vertical padding, secondary ink; hover ink |
| Active tab | `aria-current="page"`, ink, 600, 2px ink underline sitting on the bar's rule |
| Compact | Brand row, then tabs on their own row |
| Tabs | Play · Review · Stats · Settings (Learn joins later). Stats sections are not tabs. |

---

### Skip link

First in tab order, off-screen until focused, then shown top-left in inverted colours. Focuses `main` without changing the hash route.

---

### Mode list

Two groups ("Zetamac" 1–4, "Training" 5–7) under an `h3` in 13px secondary ink. Each row is a full-width `button`:

| Column | Content |
|---|---|
| Key | 24px square, 1px muted border, mono number |
| Name | Body 500 (700 when recommended) |
| Description | 14px secondary ink, plain phrase ("× and ÷, 2–12 by 2–100, 60 seconds") |
| Tag | 13px, "Recommended" or "Warm up first" |

Selected row: inverted, `aria-pressed="true"`. Clicking a row selects it; clicking the selected row starts it. Custom's form opens under its row.

---

### Segmented toggle

Joined outline buttons (30px, 13px); the active one filled, `aria-pressed`. Used for heatmap views (Combined | Multiplication | Division). The choice is mirrored in the URL (`#review/div`).

---

## Containment

### Page head

`h1` 32px bold, optional subtitle in secondary ink (≤ 70ch), actions right-aligned and wrapping.

---

### Section

`section.sec`: 48px top margin; `h2` 18px semibold with a 1px ink rule below; optional right-aligned aside in 13px secondary ink, only when it carries information (a count, the view toggle). Optional `.sec-intro` sentence.

---

### Hero (Home)

"Why" line (secondary ink: "Warm up first, then Foundations", "Today's training, step 1 of 3", "Your choice"), the mode name at 56px bold as the page `h1`, a description at 18px, an optional note, then the hero start button.

---

### Step block

A `<details>`: ink rule above, `--line` below. The summary is one line: "Step 1: Foundations" (24px bold, `h2`), the 3-box streak (24px mono, `aria-label="2 of 3 days done"`) and "2 of 3 days done", with the disclosure marker right. Open, it shows the rule sentence and today's status.

---

### Disclosure section (Stats)

`details.pane`, one per Stats section. Summary: the title as `h2` (32px bold, 24px compact) and, while closed, one line in secondary ink with the single thing worth knowing (`.pane-line`). Marker: `+` closed, `−` open, mono 24px at the right, secondary ink, ink on hover; no animation. Ink rule above each section. Content is rendered on first open; its own headings sit one level down (`h3` sections). Use native `<details>`/`<summary>` so keyboard and screen readers work without script.

---

### Help dialog

Full-screen opaque overlay, `role="dialog" aria-modal`, `h2` title, Close button with `Esc`, `overscroll-behavior: contain`. Opening focuses Close.

---

## Data Display

### Stat block

Row of 2–4 blocks separated by 1px rules: 13px label, 24px mono value, optional 13px note. 2-up under 640px. `data-testid="stat-<key>"`.

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

`role="alert"` bar under the top bar, 4px ink rule, semibold. Shown only when saving to the browser fails.

---

### Game screen

Full-screen, only four things: timer (top left, mono 22px, secondary ink), score (top right), the question (display size, centred), the answer box. Interview adds "12 / 80" between timer and score. `data-testid`: `game-timer`, `game-score`, `game-question`, `game-count`.

---

### End screen

Hidden `h1`, the score at 112px mono beside the mode and "Round 4 today", a button row (Play again · Drill these slow questions · See today's analysis · Home, each with its key), stat blocks, then Freezes and Slowest questions sections. `data-testid="end-score"`.
