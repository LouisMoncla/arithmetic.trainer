# Learn tab: lessons for the 14 tricks + fractions by heart

Decided with the user (2026-10-25): new top tab; untimed practice first, then a timed round;
fractions by heart = every n/d in lowest terms with d ≤ 12, plus 1/16, 3/16, 1/20, 1/25 (49 pairs);
tricks taught = the 14 that exist now.

## What the user sees

- **Top bar:** Play · Learn · Review · Stats · Settings. Key **N** opens Learn (L is Log; N is free).
- **`#learn`:** one page with the lessons in 4 groups (Squares, Products, Percentages, Fractions)
  plus a "Fractions by heart" section. Each lesson row shows its name, the one-line rule and your
  status on it (from the existing `tr-<type>` fact: not started / weak / ok / mastered, median time).
- **`#learn/<type>`, a lesson:**
  1. The rule in one or two sentences, and why it works (one line of algebra, e.g. (10a+5)² = 100·a(a+1) + 25).
  2. Three worked examples, generated fresh and explained with the existing `G.trickAdvice`.
  3. Two buttons: **Practise** (Enter) and **Timed round** (F).
  4. Your numbers on this trick: attempts, median, status.
- **Practise (untimed):** 10 questions of that trick, no clock, no score on screen.
  A correct answer moves on as usual (auto-accept). After a wrong full-length answer, or on Tab,
  the worked shortcut appears under the box; you then type the right answer to move on.
  Ends with a short summary: "8 of 10 right first time. The method was shown for 41 × 11 and 67 × 11."
  Not saved as a round, so it doesn't skew timing stats.
- **Timed round:** 60 s of that one trick, the normal game screen, saved as a round, end-screen analysis
  as today. Tab skips (already built).
- **Fractions by heart (`#learn/fractions`):**
  - A reference table: denominators 2–12 down the side, numerators across, each cell "n/d = 0.xxx".
    It doubles as a heatmap of your speed on each pair (same look as the tables heatmap).
  - Two new question types: **fraction → decimal** ("3/7" → 0.429) and **decimal → fraction**
    ("0.429…" → 3/7 in the two boxes). Practise and timed round as for the tricks, plus a mixed round.
  - Pairs you're slow on, or haven't seen, come up more often (the weighting used by weighted tables).

## Build steps

Part 1 (lessons, practice, timed rounds): done, committed. Part 2 (fractions by heart): in progress.

- [ ] `js/generator.js`: trick types `fd` and `df` over the 49-pair set; `makeTrick`/`trickQuestion`/`trickAdvice`
      for them; repeating decimals answered to 3 places (rounded **or** truncated both accepted: 2/3 → 0.667 or 0.666).
      Fact keys: `tr-fd` / `tr-df` plus one key per pair (`fd-3/7`) so the grid and the weighting have data.
- [x] `js/lessons.js` (new, after generator.js in the script order): the lesson texts (rule, why, group)
      as plain data, exported for tests.
- [x] `js/game.js`: a `practice` kind (no timer, fixed count, shows the method after a miss or Tab,
      `onEnd` with per-question results, nothing saved). The game screen rule (question, box, timer, score)
      stays as it is for rounds; practice is a learning screen and shows the method line.
- [ ] `js/game.js`: accept an alternative answer text (`q.answerAlt`) for repeating decimals.
- [ ] `js/stats.js`: per-pair fraction stats for the grid and weights (reuse the weighted-tables code path).
- [x] `js/ui.js`: `renderLearn` (index + lesson + fractions pages), routes `#learn`, `#learn/<type>`,
      `#learn/fractions`; key N; single-trick timed rounds saved as mode `LEARN` with `settings.types = [type]`;
      `effMode` treats `LEARN` + type as its own mode so ranks and "usual" compare like with like.
- [x] `index.html`: nav link, script tag, help lines (N, the lesson keys, Tab in practice).
- [x] `css/style.css`: method line on the practice screen, fractions grid (reuse heatmap styles).
- [ ] Tests: generator (49 pairs, 3-place uniqueness so "0.xxx…" names one fraction, both answer forms),
      lessons data (every trick has a lesson), stats (per-pair keys), E2E (open a lesson with N, practise with a miss
      → method shown, timed round saved as LEARN, fractions grid renders).
- [ ] README (modes, keys), CLAUDE.md (layout, data model: mode LEARN, new types, keys).

## Risks / things to know

- `mode: 'LEARN'` is a new value in saved data. No schema bump needed (mode is free text and old
  exports still import), but older app versions would show these rounds with an unknown mode name.
- Two sessions of work, roughly: the 14 lessons + practice first, then fractions by heart. I'd commit them separately.
- No new dependencies; works from file://.

## Open points (my defaults; say if you want otherwise)

1. Key for Learn: **N**.
2. On a lesson page: **Enter** = Practise, **F** = Timed round ("fast"; free, unlike G, R and T).
3. Repeating decimals to **3 places**, rounded or truncated.
4. Practice length: **10 questions**.
5. Practice is **not saved**.
