# Arithmetic Trainer Guidelines — Accessibility & Do's/Don'ts

> See [design.md](design.md) for token values. See [design-components.md](design-components.md) for component specs.

The product exists to make one person faster at mental arithmetic. Every rule below serves that: nothing may slow down typing, distract during a round, or hide what to do next.

---

## Accessibility

### Contrast Requirements

| Requirement | Ratio |
|---|---|
| Body text (`--fg` on `--bg`) | 21:1 |
| Secondary text (`--mid` on `--bg`) | 5.7:1 light, 7.4:1 dark (≥ 4.5:1) |
| Muted text (`--soft`) | 2.8:1 light — notes and captions only, never the only carrier of information |

| Component | 3:1 against |
|---|---|
| Buttons, inputs, answer box (ink border) | Surface |
| Focus ring (2px ink) | Surface and the element |
| Chart data lines and bars (ink) | Surface |
| Gridlines (`--grid`) | Deliberately below 3:1: recessive; values are also on tick labels, tooltips and tables |

### Touch Targets

| Rule | Value |
|---|---|
| Buttons and inputs | 36px tall (hero start 52px) |
| Icon buttons | 32 × 32px |
| Heatmap cells | 34 × 34px |
| Chart hit area | The whole plot: the pointer only has to be nearest an x |
| `touch-action` | `manipulation` on interactive elements (no double-tap zoom delay) |

### Keyboard Navigation

Everything works without a mouse.

| Key | Action |
|---|---|
| Tab | Skip link first, then bar, then content |
| P R A S | Play, Review, Stats, Settings |
| E G L | Open Stats at Today, Progress, Log |
| D | Weak-fact drill |
| ? / Esc | Open / close the shortcut list |
| T | Switch light and dark |
| 1–7, ↑ ↓ | Home: choose a mode |
| Enter / Space | Home: start the chosen mode |
| Esc | In a round: stop without saving |
| Enter, Tab | Interview: answer, skip |
| Enter D A H | After a round: play again, drill slow questions, today's analysis, home |
| M, W, V | Review: replay mistakes, weighted tables, switch heatmap view |
| ← → | Today: previous / next day. On a focused chart or heatmap: move along it |

### Assistive Technology

- Semantic HTML first: `nav`, `main`, `section` with headings, real `button`s and `a`s, `table` with `th scope`.
- One `h1` per screen (hidden "Round finished" on end screens); `h2` per section; `h3` for sub-groups.
- Icon buttons and grid cells carry `aria-label`s; the heatmap cell label reads the full fact ("56 ÷ 7 = 8, median 2.3 s, 12 attempts…").
- Polite live region `#live` for confirmations (copied, saved, view changed); `role="alert"` for a failed save; `aria-live="polite"` on form messages.
- The game question is deliberately `aria-live="off"`: announcing 60 questions a minute would slow the user down.
- `aria-pressed` on toggles (mode rows, heatmap views); `aria-sort` on the sorted column.
- Charts: `role="img"` with an `aria-label`, keyboard focus with ← → and a "Show as table" twin.
- `translate="no"` on the app name and the game screen.

---

## Gestures

| Gesture | Use |
|---|---|
| Tap / click | Every action; each keyboard shortcut has a visible button or link too |
| Hover | Tooltips and heatmap readout — always duplicated by focus and by a table |
| Scroll | Page only; the tab row scrolls sideways on narrow screens |
| Drag, swipe, pinch | Not used |

---

## Content Design

- **Voice:** second person, active, plain. "Export one in Settings", not "A backup can be created".
- **Case:** sentence case for everything, including buttons and headings. (Vercel's guidelines prefer Title Case for buttons; frontend-design prefers sentence case; this app picks sentence case consistently.)
- **One name per action:** "Start Tables" on Home, "Play again" after; "Export JSON" everywhere.
- **Errors say how to fix them:** "Type whole-number scores separated by commas, for example 28, 24, 25."
- **Empty states invite an action:** "No rounds yet. Press P and play one."
- **Numbers:** numerals always ("3 days"), units spelled out in prose ("60 seconds"), `s` in data ("1.9 s").
- **No meta strings joined with middle dots**, no all-caps eyebrow labels, no "→" decoration on buttons.
- Lines under 70 characters; `…` and curly quotes.

---

## Do's and Don'ts

### Color
- **Do** use only the six tokens; express emphasis by inversion or weight.
- **Don't** add an accent, a status colour, or green/red feedback.

### Shape
- **Do** keep corners square; round only chart bar ends (4px) and dots.
- **Don't** wrap content in rounded cards.

### Elevation
- **Do** separate with 1px rules and space.
- **Don't** use shadows, blur or gradients.

### Interaction
- **Do** make the selected mode, the hero button and Enter do the same thing.
- **Do** keep every shortcut reachable by a visible control.
- **Don't** flash the screen on a correct answer; it costs reaction time.
- **Don't** accept keys for 400 ms after a round ends (protects against accidental restarts).

### Layout
- **Do** give each screen one bold element (hero, score, question) and keep the rest quiet.
- **Don't** add labels that restate the heading or say nothing ("pick one and start").

### Typography
- **Do** set numbers in the monospace with tabular figures so columns align.
- **Don't** use `text-transform: uppercase` or letter-spaced labels.

### Motion
- **Do** keep the screen still during a round.
- **Don't** add transitions or entrance animations.

### Components
- **Do** pair every chart with a legend (≥ 2 series), a tooltip and a table.
- **Do** add `data-testid` only where role and label can't locate an element (`feature-component-element`, kebab-case, stable domain keys).
- **Don't** use `alert()`; use inline notices. `confirm()` stays only in front of deletions.
