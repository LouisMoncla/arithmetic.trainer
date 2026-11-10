# CLAUDE.md — project context for Claude Code

Read this first. `README.md` is the user-facing guide (modes, keys, steps, deploy); this file is
the engineering context: what exists, why it is built this way, and the rules to keep.

## What it is

**103** ("103 Mental Math" in the tab, a name, so capitalised despite the sentence-case rule): a Zetamac-style mental-math trainer for quant-interview prep. It was called
Arithmetic Trainer until 11-10; storage keys, the repo and the URL keep the old name on purpose. Live at
**https://arithmetictrainer.vercel.app/** (Vercel, auto-deploys `main`). Repo:
`github.com/LouisMoncla/arithmetic.trainer`. Two people work on it (owner + a friend), both with
Claude Code. MIT licensed.

It began as a local, offline, single-user tool (double-click `index.html`) and is now also a public
website with optional accounts. Both ways of running it must keep working.

## Hard constraints (don't break these)

- **Plain HTML/CSS/vanilla JS, no build step, no framework, no bundler, no ES modules.** Classic
  `<script>` tags in a fixed order sharing one global `window.AT`, because ES modules fail on
  `file://`. Logic modules also `module.exports` so `node --test` can load them.
- **Must work from `file://`** (offline, no server). Sync is simply off there.
- **Black and white only.** Grey tokens only (`--bg --fg --mid --soft --line --grid --surface --surface-2 --chip --ink-2`;
  values in `docs/design.md`), no accent or status colours, no green/red feedback. Emphasis = inversion or weight.
- **Minimal, keyboard first.** System UI font for words and tabular numbers (mono only in `kbd`), soft grey panels to
  group, rounded corners by hierarchy (`--r-s/m/l/pill`, see `docs/design.md`; changed 11-09 on the owner's request), no shadows, no transitions or animations, sentence case (no `text-transform: uppercase`),
  no "a · b · c" dot-joined strings.
- **The game screen shows only question, answer box, timer, score.** No flash on a correct answer
  (it costs reaction time; removed on purpose). Zetamac modes auto-accept a correct answer with no Enter.
- **Features, modes, keys and the saved-data format don't change casually.** Old exports must still
  import (`Storage.migrate`). If the schema must change, bump `SCHEMA` and migrate.
- **Never seed or ship personal data.** New users start empty (the owner's old scores used to be
  seeded; removed). Exports (`103-*.json`, older `arithmetic-trainer-*.json`) are git-ignored.
- Don't add dependencies to the app. `package.json` dev dependencies are for tests only.

## Layout

```
index.html        shell: top bar, #main, #game overlay, #help dialog, script order
privacy.html      what is stored when signed in
css/style.css     all styles (tokens on :root, dark mode via prefers-color-scheme + [data-theme])
js/generator.js   questions per mode, fact keys, families, advice text, interview questions; mulberry32 PRNG
js/finance-core.js      Finance engine: constants, answer parser, tolerances, registry, F.make(id, seed), selector
js/finance-templates.js the procedural Finance templates (arith, quant, fin), each with an independent test reference
js/finance-bank.js      the curated multiple-choice concept questions (right option first; shuffled by seed)
js/tex.js               LaTeX subset → MathML (screens) or plain text (storage, alttext); rich() for prose with $…$ maths
js/lessons.js     Learn tab texts: GROUPS (page order) and LESSONS (short, rule, why) per trick type; plain data
js/coach.js       Road to 60: category stats (windowed medians), Normal frequencies, estimated score + lost time,
                  today's session plan, focus picks, mastery, milestones/gate, time of day; pure, node-testable
js/stats.js       sessions (= days, 05:00 to 05:00), averages, trends, fatigue, weak-fact engine,
                  tables heatmap cells + weighted-tables weights, sessionReport (one day analysed),
                  roundReport (one round analysed, for the end screen)
js/progression.js steps P2→P3→P4, recommendation, the "Copy report for Claude" text report
js/storage.js     localStorage load/save (key arithmeticTrainer.v1), migrate, export/import, merge
js/config.js      Supabase URL + anon key (empty = no accounts)
js/sync.js        optional account sync (Supabase); pure diff/applyRemote exported for tests
js/charts.js      inline-SVG line/bar charts, legend, tooltip, keyboard, "Show as table"
js/game.js        the round loop (timer, input, auto-accept, interview scoring, the 2 × 2 matrix answer grid)
js/ui.js          every screen, routing, keys, settings, account UI (largest file); Stats sections render via fill()
js/finance-ui.js  the Finance tab, built on AT.UI.kit (ui.js's layout helpers) and AT.UI.addScreen
tools/finance-samples.js  dev only (npm run samples): sample questions per template, not deployed
js/app.js         bootstrap: load data, UI.init
supabase/schema.sql  tables, row-level security, delete_my_account()
tests/*.test.js   node --test (logic, sync pure functions); tests/fixtures.js shared data
tests/e2e/        Playwright specs + helpers; server.js = tiny static server for the sync spec
docs/design*.md   design system: tokens, guidelines/accessibility/copy, component specs
vercel.json       headers (CSP etc.), cleanUrls; .vercelignore keeps tests/docs/package.json out of the deploy
```

Script order matters: generator → tex → finance-core → finance-templates → finance-bank → lessons → stats → coach → progression → storage → config → sync → charts → game → ui → finance-ui → app.

## Data model (localStorage `arithmeticTrainer.v1`, also the export format)

```js
{ schemaVersion: 3, seeded, presets: [], settings: { theme, countdown, stepOverride, negMark, lastExport, announced, custom, learnSquares, matrix, finance,
                                                       coach: { hints, announced /*'mastered:<key>', 'mastered:accuracy:<day>', 'gate60'*/, multN } },
  rounds: [{ id, startedAt /*ISO*/, mode, linkedMode /*for EXTERNAL*/, settings: { duration, ops, ranges }, score,
             coach? /*{ block 1–6, test }: a Road to 60 session round*/, extra? /*true: finished after today's session was done*/,
             questions: [{ op /*add sub mul div iv tr mx fin cp*/, a, b /*mx: 4-arrays*/, cells? /*mx*/, type? /*iv, tr*/, answerText?, shown, answer, timeMs, wrongAttempts, unanswered?, correct?, skipped?, missed? /*old accuracy rounds*/, noPoint? /*accuracy round*/ }] }] }
```

- `mode`: TABLES, WTABLES (weighted tables), P2, P3, NORMAL120, DRILL, INTERVIEW, CUSTOM, SQUARES, PERCENT, TRICKS, LEARN
  (one trick from the Learn tab, `settings.types = [type]`; `S.effMode` gives `LEARN-<type>`, `P.modeLabel` names it), MATRIX
  (Matrices tab, `settings: { lo, hi, duration: 60|120, custom? }`; `S.effMode` gives `MATRIX-m9_9-60` etc., m = minus), FINANCE
  (Finance tab, `settings: { kind: sprint|practice|intuition|mixed, duration?, fams?, cat?, diff?, only?, count? }`; `S.effMode` gives
  `FINANCE-sprint-120`, `FINANCE-practice`…; questions `{ op: 'fin', tpl, seed, fam, cat, shown, answer, given, correct, timeMs, wrongAttempts, skipped?, mc? }`), or EXTERNAL
  (scores typed in from zetamac.com, no questions; `linkedMode` says which mode they count as), R60 (a Road to 60 drill,
  `settings: { drill: comp|carry|borrow|cross|mult|acc, n? /*7 or [12, 8, 6]*/ }`; `S.effMode` gives `R60-borrow`, `R60-mult-7`,
  `R60-mult-12-8-6`, `R60-acc`; complements are `{ op: 'cp', type: c100|cten, a, b }`, answer b − a). Schema 2 (Road to 60) only
  added optional fields; `migrate` adds `settings.coach`. Schema 3 (day ends at 05:00): `migrate` runs `CO.tagExtras` once.
- A **session = one day, from 05:00 to 05:00 local** (`S.dayKey`, `DAY_START_HOUR`; by the clock, so DST nights are right).
  Session numbers count days with any round. Time of day (coach `timeOfDay`) stays on the clock.
- Rounds are immutable once saved and identified by `id`. Merge/sync rely on this.
- `ui.js` `save()` is the single write funnel (it also notifies sync). Use it for any data change.

## Domain logic worth knowing

- **Steps:** P2 = Foundations (avg ≥ 18), P3 = Speed (≥ 25), P4 = Interview-ready, the 120 s mode (≥ 60). Shown as Step 1–3 with these names (`STEPS[i].n`, `.name`); the P ids are stored, never shown. A session qualifies with ≥ 3 rounds of
  the step's mode; a step is done after 3 qualifying sessions in a row at or above the threshold.
- **Weak facts** (`Stats.factStats`): slowness = weighted median of time ÷ my median for that op ×
  (1 + wrong rate), attempts > 21 days old weigh 0.5. State machine ok → weak → improving → mastered.
  Facts are keyed by family for tables (7×8 and 8×7, and their divisions) and by band for P2 (`8x30s`).
- **Weighted tables:** 121 × cells + 121 ÷ cells, weight = clamp((median/ref)² × (1+wrong), 0.25, 6);
  unseen cells get the max weight. Review has a 12×12 heatmap with Combined / × / ÷ views.
- **Weak via a stall:** an attempt > 3× my op median (all rounds) and > 1.5 s in the last 2 days makes a fact weak
  (was a fixed 4 s; `froze` on the fact says it is the only reason). Replay mistakes (`Stats.mistakes`) uses the same stall rule. Fact labels name the pair (`3×8 = 24`); `familyText` is for advice.
- **Freeze:** answer > 3× the round median and > 1.5 s. Fatigue: last 3 rounds all ≥ 15% below first 3.
- **Report for Claude** (Log → "Copy report for Claude", `Progression.summary`): self-explanatory
  sectioned text (rules, every session, steps/trends, per-op speed, facts, grid, latest session, fatigue).

## Accounts and sync (js/sync.js)

- Optional. Email magic link (PKCE flow; the link must be opened in the same browser). Only on http(s)
  and only when `js/config.js` has values. Otherwise the Account section/status are hidden or explain why.
- **Local first:** localStorage stays what the app reads. Push after `save()` (debounced ~1 s): upsert
  rounds added since the last sync, mark removed ones `deleted = true` (tombstones), upsert one
  `profiles` row (settings + presets). Pull on load, sign-in, tab focus, Sync now: rows with
  `updated_at > cursor` (minus 60 s overlap; applyRemote is idempotent).
- Sync state is in localStorage `arithmeticTrainer.sync` (`ids` = round ids known synced, `cursor`, profile stamp).
- A round synced before but missing locally = deleted here, not pushed yet: a pull must not bring it
  back (tested). Remote tombstones win on merge.
- First sign-in with local rounds asks: add them to the account, or use only the account's rounds.
- The client is `@supabase/supabase-js@2.117.3` UMD from jsDelivr with an SRI hash (`CLIENT_URL`,
  `CLIENT_SRI` in sync.js). The same version is a dev dependency so tests serve identical bytes.
  Upgrade both together and recompute the hash.
- **Status:** code and mocked tests are done; **the real Supabase project is not set up yet** (README
  Deploy steps 3–5: run schema.sql, set Site URL/redirects, fill config.js, custom SMTP before launch).

## Tests

```
npm ci                 # Playwright + Supabase client, dev only
npm test               # node --test: logic + sync pure functions
npm run test:e2e       # Playwright, uses the installed Google Chrome (channel: 'chrome')
```

- E2E opens `index.html` from `file://` with a fake clock: `openApp` in `tests/e2e/helpers.js` installs
  `page.clock`, then `pauseAt`; advance with `tick` (`runFor`). Never `waitForTimeout` (that raced and was flaky).
- Pass `{ history: true }` to `openApp` to start with one zetamac session (from `tests/fixtures.js`).
- `sync.spec.js` serves the app on http://localhost:4173 (webServer in `playwright.config.js`) and
  mocks config.js, the CDN script and Supabase REST/auth with `page.route`.
- Locators: roles and labels first, `data-testid` only where needed (`feature-component-element`,
  e.g. `game-question`, `home-start-button`, `heatmap-cell-<view>-<r>-<c>`).
- Keep everything green before pushing; `main` deploys straight to production.

## History (what was done, in order)

1. Built the trainer to a long spec: modes, steps, weak-fact engine, interview mode, log, settings,
   inline SVG charts, JSON export/import, keyboard only.
2. Removed the correct-answer flash; reorganised the top bar and home.
3. Weighted tables mode (Review, key W) and the tables heatmap with Combined / × / ÷ views
   (division laid out divisor × answer, × and ÷ weighted separately).
4. Session page (key E): one day analysed: scores vs threshold, pace by thirds, mistakes and freezes
   with advice, ops today vs usual, facts that moved. Deep links `#session/YYYY-MM-DD`, `#review/div` (now `#stats/day/…`, `#review/div`).
5. Charts reworked to data-viz rules (thin marks, legends, crosshair tooltips, table twins).
6. Redesign with the frontend-design / web-design-guidelines / design-system / Playwright skills:
   home leads with the next round (hero + one Start button), sentence case, no meta strings,
   accessibility fixes (skip link, labels, live regions, focus), Intl dates, test ids, Playwright E2E,
   design docs in `docs/`.
7. "Copy summary" became a full report for Claude.
8. Git prep: .gitignore/.gitattributes, removed personal seed data, fixtures for tests, MIT license.
9. Published on Vercel; added optional Supabase accounts with sync, privacy page, CSP headers.
10. Post-round analysis on the end screen (`Stats.roundReport`): a summary (4 tiles + up to 3 takeaways),
    then details below (time per question, thirds, per op vs usual, time spread, freezes, facts, every question).
11. Simpler layout: tabs are Play · Review · Stats · Settings. Session (shown as "Today"), Progress and Log
    became collapsible `<details>` sections of Stats (`renderStats`, `PANES`: day, progress, log), each built
    on first open, with a one-line summary while closed; open state per browser in localStorage
    `arithmeticTrainer.statsOpen`. Routes: `#review/<view>`, `#stats/<section>/<arg>`; old hashes redirect
    (`MOVED`). Keys kept: R review, E G L open a section, A opens Stats.
    Play: one recommendation tag, the step block is one line, backup reminder from 10 rounds.
12. Plain names. Steps and their modes are shown as Step 1 Foundations (P2), Step 2 Speed (P3), Step 3
    Interview-ready (NORMAL120); ids in data stay P2/P3/P4. Users see "day" where the code says session.
13. Trick modes (keys 8, 9, 0): Squares, % and fractions (id PERCENT), Mixed tricks. Questions are op `tr` with a `type`
    (sqmem sq5 sq50 sq100 diff x11 x25 near100 pct pctswap frac dec2frac fracadd fracsub), fact key `tr-<type>`,
    settings `{ types, duration }`. Fraction answers (`q.frac = [n, d]`, lowest terms) get two boxes in game.js:
    numerator, then denominator, each auto-accepted; fracadd/fracsub store a and b as [n, d] pairs.
    `G.makeTrick(type, a, b)` rebuilds one (replays, drills); `G.trickAdvice` works the shortcut on the question.
    Outside the steps; kept out of the weak-fact drill, mistakes replay and per-op times (`ZETAMAC_OP` in stats.js),
    like interview questions. Fractions take decimal answers (the input allows a point only for those).
    Trick modes only: Tab skips; stored as `unanswered: true, skipped: true` (out of every timing stat, a miss in factStats).
    Fraction answers show "In lowest terms" under the boxes (the one extra line on the game screen, on purpose).
14. Learn tab (key N, `#learn`, `#learn/<type>`): a lesson per trick from `js/lessons.js`, worked examples from
    `G.trickQuestion` + `G.trickAdvice`. Practice = `Game.startPractice` (kind `practice`: no clock, `count` questions,
    a wrong full-length answer or Tab shows `#g-method`; questions get `method: true`); ui.js never saves it.
    Timed round = mode LEARN. `logModes()` in ui.js adds played LEARN-<type> modes to Log, Progress and fatigue notes.
    Fractions by heart (`#learn/fractions`, `AT.Lessons.HEART`): trick types `fd` (3/7 → decimal) and `df` (0.429… → 3/7)
    over `G.HEART` (49 pairs). `G.heartDecimal`: exact if it terminates, else 3 places rounded, with the cut-off form
    accepted as `q.answerAlt` (not saved). Fact keys add `fr-n/d` per pair (both directions share it);
    `S.fractionCells` weights pairs like weighted tables, `S.fractionPool` feeds `makeMixedGenerator`.
    Its rounds store `settings: { types: ['fd', 'df'], lesson: 'fractions' }`, so `S.effMode` gives LEARN-fractions.

15. Matrices tab (key X, `#matrices`): 2 × 2 matrix products. Options as segmented toggles, remembered in
    `settings.matrix` (added to `defaultSettings`, so `migrate` keeps it): `set` ℤ/ℕ, `max` 9 | 12 | 'custom' with `customLo`/`customHi`
    (−99 to 99, From < To, else Start is disabled), `duration` 60 | 120. Default ℤ −9 to 9. Rounds store the resolved `{ lo, hi, duration }`;
    `G.matrixRange` also reads the first form `{ set, max }`.
    Questions are op `mx`: `a`, `b`, `cells` row-major 4-arrays, `shown`/`answer` as text ("(1 2; 3 4) × (5 6; 7 8)",
    "(19 22; 43 50)", typographic minus) so every existing table renders them. `G.makeMatrix`, `G.matrixQuestion`,
    `G.makeMatrixGenerator`, `G.matrixAdvice` (row times column, used for freezes). Fact key `mx`; like `tr`/`iv` it is out
    of the stall rule, the weak-fact drill and per-op timing. `Game.startMatrix`: four boxes in a bracketed grid; Space =
    next box (wraps), arrows = neighbour, auto-accept when all four are right, Enter outlines wrong filled boxes (`.bad`,
    cleared on edit), Tab skips. Each option combination is its own mode in Log/Progress/report (`logModes()`,
    `reportModes()`); "Drill these slow questions" on a matrix end screen replays matrices (`playMatrix(settings, replay)`).

16. Finance tab (key Q, `#finance`, `js/finance-*.js`), built to a long spec in 3 reviewed steps (engine + quant, finance
    templates, concept bank) then the screens. Questions come from templates: `F.make(templateId, seed)` always gives the same
    question, its answer, tolerance, worked steps and wrong options (plausible mistakes), all from the same drawn parameters.
    57 procedural templates (4 arith wrapping `G.makeQuestion`, 15 quant, 38 fin) + 78 concept questions; `tests/finance.test.js`
    checks each template on 1,000 seeds against an independent reference (add one for every new template, or the test fails).
    Answers: `F.parse` reads `%`/`bp` suffixes into the expected unit, commas as decimals; tolerances exact | round (dp) | abs | rel.
    Sprint = `Game.startFinance` in the overlay: auto-accept only when the typed value equals the displayed answer (`F.autoOk`,
    exact/round templates); rel/abs estimates need Enter; Tab skips (`skipped`, counts as a miss), time-up leaves `unanswered`.
    The question is a sentence, so the overlay shows it in the text face with the unit beside the box and the answer instruction
    under it (`g-hint`, as for fractions). Practice / Intuition / Interview mix run on the page (explanations need room); a session
    is saved as one round when it ends or you leave (`kit.onLeave` hook in `route()`, and `pagehide`). End screens rebuild every
    explanation from (tpl, seed). `S.financeStats`: per template/category/family attempts, first-try accuracy, median time;
    `F.weight` (1 + 2 × wrong rate + slowness vs the family median, ≥ 1; unseen 3) drives adaptive picks and the 5 weakest.
    Op `fin` has no fact keys (`G.factKeys` → []), so it stays out of the weak-fact engine, stall rule and per-op timing.
    Pause and learn (`H` or a button, sprint only; `H` never appears in an answer): `st.paused` freezes `tick()`; on resume `st.t0` and `st.qStart` move by the pause,
    so neither the round nor the question counts it. The panel shows answer, formula, steps, why (from `st.q`); then the same
    question comes back and typing the answer moves on with no point: saved `learned: true, pausedMs, correct: false` (a miss in
    `S.financeStats`, kept even when the clock then cuts it off). A wrong Enter writes "Press H to pause and learn" in `g-method`. Finance rounds' `.g-center`
    starts at the top with auto margins (not `justify-content: center`) so a tall solution scrolls instead of hiding the question.
    `P.summary` has a "Finance tab" section.
    Formula line as maths: each quant/fin template has `tex` (a LaTeX subset, the `TEX` map at the end of finance-templates.js)
    next to its plain `formula`. `AT.TeX.render(tex, formula)` gives MathML (`alttext` = the plain formula) or, if it cannot
    parse, the plain text. Chosen over KaTeX/MathJax: no dependency, works offline, ~200 lines. Brackets group so `(1 + r)^t`
    raises the whole bracket; plain brackets don't stretch, `\left \right` do; `math-style: normal` gives display-size fractions.
    All Finance maths is drawn: prompts, steps, why sentences, options and explanations are rich text, prose with maths
    between `$…$` (`TeX.rich` on screen; `F.make` adds plain twins `promptText`/`stepsText`/`whyText`/`optionsText`, which
    are what rounds store as `shown`/`answer`). `tests/tex.test.js` fails on maths left outside `$…$` or that does not parse.
    Round screen: `#game.fin .g-center > * { flex-shrink: 0 }`, else a question with `overflow` set collapses when the
    pause-and-learn solution is taller than the window (it did at 100% zoom). `#finance/q/<id>/<seed>` reopens any question (the code is shown after answering).

## Working conventions

- Match the surrounding code: ES5-style `var`/functions in `js/`, short comments where intent isn't obvious.
- New UI: reuse `pageHead`, `section`, `frow`, `facts`-style `<dl>`, `.notice`, `.row`, `.inline-form`
  from `ui.js`/`style.css`; check `docs/design-components.md` before inventing a component.
- Copy: second person, plain, sentence case; errors say how to fix; numbers as numerals.
- Any new keyboard shortcut needs a visible control and a line in the help dialog (`index.html`).
- Ask before deleting files or data, and before force-pushing.
17. Warm-up switches to Weighted tables (`P.recommend` → `warmMode`): plain Tables until 150 of the 187 table facts (66 × pairs,
    121 ÷ directions, 2–12) have 2+ answers (`S.tableCoverage` over `S.tableCells`, so Foundations answers within 2–12 count too),
    then Weighted tables. History only grows, so it never switches back. On Play, row 1 (key 1) becomes Weighted tables and plain
    Tables moves to `T` / a "Plain tables instead" link in the hero; before the switch the Tables hero shows "n of 187 measured".
18. Road to 60 (key C, `#road`, `renderRoad` in ui.js, logic in `js/coach.js`), from the coach spec with the user's changes:
    its own page (Play, Learn, Matrices, Finance unchanged, nothing locked); benchmark = coach block 6 only. `G.classify(q)` gives
    one category per question (units-only carry/borrow, sub-cross100 when a+b ≥ 100, mul/div-table, mul/div-big-N, comp-100/ten).
    Category medians: Foundations/Speed/Normal 120 rounds only (coach or not, extra included), last 3 days with such rounds,
    widened day by day up to 10 until 15 answers, else flagged and the target used. Estimate = 120 / Σ freq × median, freq from
    20,000 questions of the real Normal generator (seed 12345); all at target → 62. Lost time = freq × max(0, median − target).
    `CO.plan(rounds, day)`: blocks 1 warm-up (follows the Weighted tables switch) · 2 P2 ×2 · 3/4 focus drills ×3 · 5 P3 ×4 ·
    6 Normal 120 ×2; every 7th coach day a test day (1, 2, then 4 × Normal 120). Focus picks use data before today (stable all
    day), by family since item 19 (complements no longer picked); mastered (≤ target at the end
    of 3 complete sessions in a row) leaves the pool. Progress is read from today's `coach`-tagged rounds, so reloads resume.
    Milestones 40…60: 2 complete sessions in a row; gate: 3 at 60 (one-time "Next: …" message). Drills show `G.hint(q)` after
    5 s (`opts.hint` in `Game.startZetamac`, Settings can turn it off; answered questions keep `hinted`). End screens of every
    + − × ÷ round also list answers over 8 s with the method (`S.freezes`, `over8`). Report: `## Coach (Road to 60)`.
19. Road to 60 fixes (user report, export of 11-09):
    - Day boundary: rounds after midnight were not tagged extra because the session (calendar day) had changed. A day now ends at
      05:00 across the whole app (`S.dayKey`); schema 3 retro-tags with `CO.tagExtras` (non-coach, non-EXTERNAL rounds started after
      the day's completing benchmark round).
    - Focus picks by family (`CO.families`): + and − (add, sub, comp), × big, ÷ big, summed lost time. Focus A/B = drills of the two
      costliest; + / − picks its costliest drillable key; × / ÷ big gets a mixed drill on its 3 worst N (`settings.n` an array).
      The complements override is gone (complements have no Normal frequency, so never picked; key 1 only).
    - Accuracy (`CO.accuracy`): Σ freq × wrong rate × max(0, median wrong − median clean) per category with ≥ 5 wrong and ≥ 5 clean
      (window widened like medians); overall rate and medians only as text. Takes Focus A when larger than the top family and in the
      pool (`CO.accuracyState`: out after 3 complete sessions in a row under 8%, that day's own Normal-format answers; back above 12%).
      Accuracy round = R60 drill `acc`, P3 generator, `opts.strict` in `Game.startZetamac`. Key 6 on Road to 60. (Changed in item 22.)
    - Trends (`S.trend(sessions, threshold, latest)`): regressed on the session number (the chart's x), not the point index;
      only sessions within the last 14 of the latest overall, needing 4 spanning 7 days (else "Not enough data yet"); per session.
      Projection only then: a range from slope ± 1 SE (`S.fit`), 'plateau' when slope ≤ 0.2, slope − SE ≤ 0 or > 90 sessions.
      `P.trendText` / `P.projectionText` are shared by Progress and the report. Road to 60 has no regression (its category
      trend compares two windows).
    - Round-of-the-day chart (`roundChart` in ui.js, every mode panel and the Road to 60 warm-up curve): `S.roundIndexAverages`
      buckets rounds 12+ together (`ROUND_CAP`) and keeps only round numbers with 2+ days ({ idx, label, avg, n, days }); drawn
      with `C.line` (`xDomain`, `xTicks` 1 3 6 9 12, `xFmt`, `tips`, series `marks`), no value labels, table twin. Mode panels show
      "Best (all time)". `tests/e2e/charts.spec.js` checks at 1366 and 390 that no two labels in any chart intersect.

20. Road to 60 is the first page (reversed in item 23); Play is only the modes (owner's call, 11-09). Nav order: Road to 60, Play, Learn, Review,
    Finance, Stats, Settings; Matrices left the top bar (key X, and the last row of Play, `play-matrices`). The bare URL and unknown
    hashes route to `road`. With no rounds, Road to 60 shows "How it works" (`road-intro`) instead of Gap to 60 and Milestones.
    Play: `pageHead` + the mode groups (`play-modes`), no hero, no recommendation tag, no step block (steps are still computed and
    in the report, just not shown on Play); a click starts a mode (Custom opens its form), 1–9 0 / arrows select, Enter starts.
    Once Weighted tables holds row 1, plain Tables is a row on key T under it (`play-plain-tables`). End-screen H is labelled Play.
    `CO.estimate` returns `coverage` (share of Normal's questions in measured categories) and `shown` (≥ `CO.MIN_COVERAGE`, 0.5):
    below that the estimate is "–", since it would mostly be the targets. E2E `openApp(page)` with no hash opens Play; pass
    `null` for the bare site.

21. Restyle (11-09): soft grey panels and rounded corners by hierarchy (tokens in docs/design.md), numbers in the text face.
    Stats reworked (it was 3 collapsible sections repeating every mode, ~11,000 px with 2 weeks of data): one mode at a
    time (`renderStats`, `.seg` of `playedModes`, remembered in localStorage `arithmeticTrainer.statsMode`), 3 tiles (Best (all time) with its day; the chart's dots are Best of the day), the
    progress chart (goal line only on NORMAL120), a month calendar (`calendar`) beside the day panel (`dayPanel`:
    `S.sessionReport` on that mode's rounds only, score chips with × delete, pace sentence, top 5 mistakes), speed per
    operation (`S.timeByOp` of the mode: last day vs before), round of the day (`roundChart`, 3+ points), and the zetamac
    form in a `<details>` at the bottom (`#log`/`#stats/log` → `#stats/add` opens it). Hash `#stats/day/<date>` (end
    screen A, E, ← →): a day link keeps the current or remembered mode if it was played that day, else the day's last
    round's mode (`pickMode`). `#stats/<MODE>[/<date>]` also works. G and L keys are gone. "Copy report for Claude" moved
    to Settings › Backup. Today/Progress/Log panes, `PANES`, `paneLine` and statsOpen are gone.

22. Accuracy round and the Squares practice range (owner's report, 11-10):
    - Accuracy round: the first wrong digit used to end the question (`{ unanswered, missed }`), so fast typing spilled the
      next digits into the next question (a second miss) and the end screen's first-try accuracy, which only counts answered
      questions, read 100%. Now a digit that is not a prefix of the answer loses the point (`st.noPoint`) and the question stays
      until the answer is typed: saved answered with `noPoint: true`, no score; each slip from a right prefix to a wrong one is
      one wrong attempt (`strictCheck` in game.js). Old `missed` questions still show "Missed (wrong digit)".
    - Squares practice range (Learn, `#learn/sqmem` only): From and To (2 to 50, From < To, `G.validSquares`) above the rule,
      remembered in `settings.learnSquares` { from, to } (saved on each valid change and when practice starts; read with
      defaults by `practiceRange`, no migration). Practice passes `sq: [from, to]` in its settings and `trickQuestion(type, rng,
      settings)` reads it; the worked examples use it too. Enter in a box practises (form submit). The timed Learn round, Squares
      on Play and every saved round stay 11–30, so Stats, Review (`tr-sqmem`) and the report keep one meaning. A range form on
      Play's Squares (each choice its own mode) was built first and dropped on the owner's call: too much for the stats.

23. Play first, and the name 103 (owner's call, 11-10): a new user's first and only game should not need the coach.
    - The bare URL, unknown hashes and the brand go to `#play`; nav order Play, Road to 60, Learn, Review, Finance, Stats;
      help dialog "P C N R Q A S". Road to 60 keeps its "How it works" intro for a user with no rounds.
    - Play's `MODES` start with NORMAL120 (key 1, selected on first open), then Tables 2, Foundations 3, Speed 4; the rest
      unchanged. `modesFor` swaps the TABLES entry for Weighted tables by id (row 2), plain Tables stays on `T`.
    - The top-bar brand `103` is 32px bold (`--t-xl`, weight 700), much bigger than the tabs.
    - Name: brand `103`, `<title>` and og:title "103 Mental Math", privacy page, report heading `# 103 report`, import error,
      docs headings. Export downloads `103-YYYY-MM-DD.json` (`.gitignore` has both patterns). Kept on purpose: localStorage
      keys `arithmeticTrainer.*` (renaming loses everyone's data), `arithmetictrainer.vercel.app` (Vercel project and
      Supabase redirects; to move later), package.json and the repo name.
