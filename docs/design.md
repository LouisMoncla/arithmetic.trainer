# Arithmetic Trainer Design System — Token Reference

> Always read this file first. For component specs see [design-components.md](design-components.md). For accessibility and do's/don'ts see [design-guidelines.md](design-guidelines.md).

A black-and-white, keyboard-first interface for timed mental-math training. One ink on one surface, 1px rules, no shadows, no motion; hierarchy comes from size and weight, never from colour or capitals. System UI type for words, a monospace with tabular figures for every number. Base spacing unit 8px. Platforms: desktop browsers first (laptop keyboard), responsive down to 360px. Source of truth: `css/style.css`.

---

## Colors

Six values, no accent. Dark mode is the same tokens inverted, not a separate palette.

### Ink & surface

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| surface | `--bg` | `#ffffff` | `#000000` | Page, game screen, tooltips, inputs |
| ink | `--fg` | `#000000` | `#ffffff` | Text, primary buttons, data marks, selected rows, rules under section headings |
| ink-secondary | `--mid` | `#666666` | `#999999` | Subtitles, labels, descriptions, inactive nav |
| ink-muted | `--soft` | `#999999` | `#666666` | Notes, captions, kbd borders, axes, empty-cell dots |
| rule | `--line` | `#e5e5e5` | `#666666` | Table rows, stat dividers, mode rows, borders of secondary icon buttons |
| grid | `--grid` | `#e5e5e5` | `#111111` | Chart gridlines only: one step off the surface |

### Semantic use (no status colours)

| Meaning | How it is shown |
|---|---|
| Selected / primary | Inversion: ink fill, surface text |
| Correct answer | Nothing: the next question appears |
| Wrong answer (Interview) | 3px outline on the answer box for 150 ms |
| Warning (fatigue, step complete) | `.notice.strong`: 4px ink bar + semibold |
| Quiet reminder (backup) | `.notice.quiet`: 2px muted bar + secondary ink |
| Weak fact | **bold** "weak" in tables |
| Magnitude (heatmap) | Ink at opacity 0–1 over the surface: white = fast, black = slow |

`theme-color` meta: `#ffffff` light, `#000000` dark; forced themes rewrite it from JS.

---

## Typography

Words: `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
Numbers: `ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace` with `font-variant-numeric: tabular-nums`. A value gets the monospace face only when it is a number; words in value slots ("First time") stay in the text face.

| Style | Token | Size | Weight | Line height | Use |
|-------|-------|------|--------|-------------|-----|
| Question | — | clamp(48px, 11vw, 120px) mono | 400 | 1.1 | The question during a round |
| Score | — | 112px mono (88px < 640px) | 600 | 0.9 | End-screen score |
| Hero | — | 56px (40px < 640px) | 700 | 1.05, −0.02em | Home: the mode to play next |
| Page title | `--t-xl` | 32px | 700 | 1.15 | `h1` on every page |
| Stat value | `--t-l` | 24px mono | 600 | 1.3 | Stat blocks, step id, streak |
| Section | `--t-m` | 18px | 600 | 1.5 | `h2` section headings, hero description |
| Body | `--t-s` | 15px | 400 | 1.5 | Default text, sub-headings (600) |
| Small | `--t-xs` | 13px | 400 | 1.5 | Labels, notes, captions, legends, table headers |
| Key cap | — | 12px mono | 400 | 18px | `kbd` |
| Chart label | — | 11px mono | 400 / 600 end label | — | Axis ticks, end-of-line value |

Rules: sentence case everywhere (no `text-transform`); prose capped at `70ch`; headings `text-wrap: balance`, paragraphs `text-wrap: pretty`; `…` and curly quotes in copy.

---

## Shape

| Token | Radius | Components |
|-------|--------|------------|
| None | 0 | Everything: buttons, inputs, cells, cards, tooltips |
| Data end | 4px (top corners only) | Chart bars, square at the baseline |
| Marker | 50% | Chart dots (r = 4px) |

Lines: 1px everywhere; 2px for the active nav underline, chart data lines and focus rings; 4px for strong notice bars.

---

## Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| 0 | none | Every surface |

Layering is done with z-index only: tooltip (10), skip link (20), full-screen overlays (`#game`, `#help`) are fixed and opaque.

---

## Interaction States

Inversion, not opacity layers.

| State | Treatment | Notes |
|-------|-----------|-------|
| Enabled | Ink border on surface | Secondary button |
| Primary | Ink fill, surface text | One per screen |
| Hover | Inverted (primary: back to outline) | Buttons, mode rows |
| Focus | 2px ink outline, 2px offset, `:focus-visible` only | Game answer box uses a 2px border instead |
| Selected | Inverted row, `aria-pressed="true"` | Mode list, heatmap view toggle |
| Pressed (end screen) | — | Keys are disarmed for 400 ms after time runs out |
| Disabled | Muted text, rule-coloured border | e.g. Replay mistakes with nothing to replay |

---

## Layout

| Class | Width | Columns | Navigation |
|-------|-------|---------|------------|
| Compact | < 640px | 1; stat blocks 2-up | Brand row, then a horizontally scrolling tab row |
| Expanded | ≥ 640px | Content column max 880px, 24px gutters | Three-zone bar: brand · centred tabs · tools |

Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 px. Sections are 48px apart; page head 40px from the bar.

---

## Motion

None. No transitions, no entrance animations. The only time-based visual is the 150 ms outline after a wrong Interview answer and the 3-2-1 countdown (can be turned off). `prefers-reduced-motion` needs no override because nothing animates.

---

## Icons

Two glyph buttons only, both text characters: ◐ (switch light and dark) and ? (keyboard shortcuts), 32×32px, each with an `aria-label`. Legend keys are inline SVG mirroring the chart marks.

---

## Design Tokens

CSS custom properties on `:root`: colours `--bg --fg --mid --soft --line --grid`; type `--t-xs --t-s --t-m --t-l --t-xl --sans --mono`; layout `--w`. Dark mode redefines the colour tokens under `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` and `:root[data-theme="dark"]`.
