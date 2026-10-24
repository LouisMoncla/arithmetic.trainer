# Plan: simpler layout, new operations, Learn section

Status: **proposal, not started.** Needs sign-off from Gabriel and Louis before any code,
because it changes navigation, keys and deep links (CLAUDE.md: "features, modes, keys and the
saved-data format don't change casually").

Goal: make the site clearly different from zetamac.com. Zetamac tests speed; this site should
also **teach** (tricks) and **diagnose** (which facts and which tricks you need), while showing
less at once.

Order: Phase 1 decides where things live, Phase 2 builds the question types, and Phase 3 uses
them. Each phase ships on its own and keeps all tests green.

---

## Phase 1: Simpler layout

Problem: 7 tabs (Play, Drill, Review, Session, Progress, Log, Settings) and long pages that show
every stat at once.

- [ ] **Agree on the new nav with Louis**: Play · Learn · Stats · Settings
  - Drill becomes a mode inside Play (it already is one: `DRILL` in `MODES`).
  - Review, Session, Progress and Log become sections of Stats.
- [ ] **Stats page = collapsible sections** using native `<details>`/`<summary>` (keyboard
      accessible, no JS, no animation, so it fits the hard constraints)
  - Each `<summary>` is a big title plus **one headline number or takeaway**, e.g.
    "Session · today 24 avg, +3 on usual", "Weak facts · 7 × 8 and 12 × 7 slowest".
  - The first section (today's session) starts open, the rest start closed.
  - Remember which sections are open per viewer (localStorage, wrapped in try/catch).
- [ ] **Play page slimmed down**: hero (one Start button) + mode list. Move the step progress
      into a one-line summary under the hero; show the backup notice only after there are
      rounds to lose (e.g. ≥ 10 rounds and no export).
- [ ] **One recommendation, not two**: the hero says "Warm up first: Tables" while the list
      tags P2 "Recommended". Pick one source (the `Progression` recommendation).
- [ ] **Keys and deep links**
  - Keep the old hashes working as redirects: `#review/div` → `#stats/review/div`,
    `#session/YYYY-MM-DD` → `#stats/session/YYYY-MM-DD`, etc. (shared links must not break).
  - New keys: P play, L learn, S stats, Shift+S settings (or a comma). Decide with Louis.
    Update the help dialog in `index.html` (rule: every key has a visible control + help line).
- [ ] **Phone**: the nav no longer overflows with 4 tabs; hide `Enter` / number-key badges on
      touch-only devices (`@media (hover: none)`).
- [ ] **Empty states**: one plain sentence + a Start button instead of empty grids
      ("Play a Tables round to fill this heatmap").
- [ ] Tests: update E2E navigation specs; add redirect tests for the old hashes.

## Phase 2: New operations

Rule: **new modes, never changes to the Zetamac modes.** P2, P3 and Normal 120 must stay
comparable with zetamac.com and the step thresholds.

Reuse the existing pattern: Interview already generates typed questions
(`iv(type, shown, answer)` in `js/generator.js`, with percentages and decimals). New operations
follow it, with their own `op` and fact keys.

- [ ] **Question types** (clean answers only, no long decimals under time pressure):
  - Squares: 1–30 for memory, 31–99 for tricks (ends in 5, near 50, near 100)
  - Percentages: "15% of 80", plus swapped pairs ("8% of 25" = "25% of 8")
  - ×11, ×25, near-100 products (97 × 96)
  - Fractions ↔ decimals: 1/8, 3/8, 1/7… (answer as decimal to 3 places, or the fraction)
- [ ] **Fact keys and families** for each type so the weak-fact engine (`Stats.factStats`) and
      the Drill work with them. Examples: `sq-4x` (squares in the 40s), `pct-swap`, `x11`.
- [ ] **Modes**: "Squares", "Percentages", "Mixed tricks". Add to `MODES` and `LOG_MODES`, with
      keyboard numbers that don't shift the existing 1–7 (append, don't insert).
- [ ] **Data format**: new `op` values are additive, so old exports still import. Decide whether
      that needs a `SCHEMA` bump (it does if older app versions would mis-handle unknown ops).
      Add a migration test either way.
- [ ] **Answer input**: percentages and fractions may need a decimal point; `inputmode` is
      already `decimal` for Interview. Check auto-accept with decimals ("0.1" vs "0.125").
- [ ] Tests: generator tests per type (answer correct, always clean, range respected), fact-key
      tests, an E2E round for one new mode.

## Phase 3: Learn section

The differentiator. A list of tricks is a blog post; **trick → drill → tracking** is a trainer.

- [ ] **Lesson format** (one short screen each, no wall of text):
  1. The rule in one line, e.g. "Ends in 5: n5² = n × (n+1) then 25"
  2. Two worked examples (35² = 3 × 4 = 12 → 1225)
  3. Why it works, collapsed in `<details>` (algebra for the curious)
  4. **Practise button** → 60-second drill of only that trick's questions (uses Phase 2 types)
- [ ] **First set of tricks**
  - Squares ending in 5
  - Squares near 50: (50 + d)² = 2500 + 100d + d²
  - Squares near 100: (100 − d)² = (100 − 2d) × 100 + d²
  - a² − b² = (a − b)(a + b), and its reverse: 47 × 53 = 50² − 3²
  - ×11 (add the digits), ×25 (÷ 4 × 100), ×5 (÷ 2 × 10)
  - Swap percentages: x% of y = y% of x
  - Fractions to know by heart (1/7 … 1/12)
  - Near-base multiplication (97 × 96 = 93 | 12)
- [ ] **Progress per trick**: not started → practising → learned (reuse the weak-fact state
      machine: ok → weak → improving → mastered, on that trick's fact keys).
- [ ] **Recommendations from data**: when Stats finds slow facts that a trick covers, suggest
      it ("You're slow on 40s squares → learn Squares near 50"). Show this on Play and Stats.
- [ ] Tests: each lesson's examples are computed, not hard-coded, and checked in node tests;
      E2E: open a lesson, start its drill, finish, see progress update.

---

## Open questions (for Gabriel + Louis)

1. Is 4 tabs (Play · Learn · Stats · Settings) agreed? What key opens Settings?
2. Should new modes count towards any step, or stay outside the P2 → P3 → P4 path?
3. Fractions: answer as a decimal, or allow typing "3/8"?
4. Who builds what? The phases touch `js/ui.js` heavily, so splitting work by phase avoids
   merge conflicts.

## Review

(fill in after each phase ships)
