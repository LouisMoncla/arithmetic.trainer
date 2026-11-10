# 103

**103 Mental Math**: a Zetamac-style mental-math trainer for quant interviews. Black and white, keyboard first.

**▶ Practise now: [arithmetictrainer.vercel.app](https://arithmetictrainer.vercel.app/)**

## Open it

- **Online:** open the link above. Nothing to install.
- **Offline:** download the repo and double-click `index.html`. No server, no internet.

## How your progress is saved

- **By default, in your browser.** Every round is saved automatically on your device (`localStorage`,
  key `arithmeticTrainer.v1`). Nothing is sent anywhere. Another browser or device starts empty.
- **Signed in (optional, published site only).** Settings → Account → enter your email, open the
  link you receive. Your rounds then sync to your account and appear on every device you sign in on.
  Sync is local first: you can keep playing offline and it catches up when you're back online.
- **Export JSON** is still there for a file you keep yourself. See [privacy.html](privacy.html).

## Back up your data

Settings (`S`) → **Export JSON** downloads `103-YYYY-MM-DD.json` (older backups named `arithmetic-trainer-…json` import the same way).
**Copy report for Claude** (same section) copies a text report of your rules, days and weak facts to paste into a chat.
**Import JSON** shows a preview ("142 rounds, 12 days") and lets you *Replace* everything
or *Merge* (rounds are matched by id, so merging the same file twice adds nothing).
If your last export is older than 7 days, the home screen shows a one-line reminder.

Clearing browser data deletes your history, so export regularly.

### Where your data lives

Every round is saved automatically on this computer, inside the browser's own storage
(`localStorage`), not inside this folder. Nothing is sent anywhere.

- Moving or renaming this folder is fine in Chrome and Edge: all local files share one storage there.
- Another browser, another browser profile or a private window starts empty. Export, then Import there.
- Firefox may tie storage to the exact file path, so export before moving the folder if you use it.

## Modes (Play screen, keys 1–9 and 0)

| # | Mode | What it's for |
|---|------|---------------|
| 1 | **Interview-ready** | Zetamac Normal, 120 s: the real benchmark (step 3). |
| 2 | **Tables** | ×÷ (2–12)×(2–12), 60 s. Warm-up. Once 150 of the 187 table facts have 2+ answers, row 2 becomes **Weighted tables** (the warm-up from then on) and plain Tables moves to a row on `T` under it. |
| 3 | **Foundations** | ×÷ (2–12)×(2–100), 60 s. One-digit × two-digit and big divisions (637 ÷ 7). |
| 4 | **Speed** | Zetamac Normal, 60 s. |
| – | **Weighted tables** | From Review (`W`), and row 2 of Play after the switch above. Tables, but every × fact and every ÷ (each direction on its own) comes up in proportion to (your median time on it)², so slow facts appear far more often. Facts with no data count as slowest until seen. Counts as the daily warm-up. |
| 5 | **Weak-fact drill** | Shows your top 10 weak facts, then 60 s: ~70% from them (weighted by slowness, with their fact families), ~30% normal Foundations. |
| 6 | **Interview sim** | Optiver-style: 80 questions in 8 min. Integers, decimals, fractions, percentages, estimates. Type and press Enter (`0.5`, `.5`, `1/2` all accepted); Tab skips; +1 / −1 (penalty set in Settings) / 0. |
| 7 | **Custom** | Every Zetamac setting: operations, 4 ranges, 30/60/120/300 s. Save named presets. |
| 8 | **Squares** | 60 s of squares: 11² to 30² by heart, ending in 5 (65²), near 50 (47²), near 100 (97², 104²). Tab skips a question (no point; it counts as a miss in Review). |
| 9 | **% and fractions** | 60 s: percent of a number (15% of 80), swapped percentages (8% of 25 = 25% of 8), fractions as decimals (3 ÷ 8 = 0.375; `.375` works too), decimals as fractions (0.375 → 3/8) and adding or subtracting fractions (1/4 + 1/8 → 3/8). A fraction answer gets two boxes: type the numerator, and once it is right the cursor moves to the denominator; no Enter. Answers are in lowest terms (the screen says so under the boxes). Tab skips. |
| 0 | **Mixed tricks** | 60 s mixing the shortcuts: squares, × 11, × 25, products near 100 (97 × 96), difference of squares (47 × 53 = 50² − 3²). Tab skips. |

Modes 8, 9 and 0 are training only: they don't count toward the steps. Each question records which trick it
trains (fact key `tr-sq5`, `tr-x11`…), so slow tricks show in Review, and a freeze shows the shortcut
worked on that exact question ("Ends in 5: 6 × 7 = 42, then 25 → 4225").

In Zetamac modes the answer is accepted the moment it's right; no Enter. A full-length wrong
value counts as one wrong attempt (Backspace and keep going). `Esc` aborts (not saved).

## Steps

| Step | Mode | Advance when |
|---|---|---|
| 1 | Foundations | day average ≥ 18 for 3 days in a row |
| 2 | Speed | day average ≥ 25 for 3 days in a row |
| 3 | Interview-ready | day average ≥ 60 for 3 days in a row |

A day only counts if it has at least 3 rounds in that step's mode. A day runs until 5 a.m.: a round at 00:30 belongs to the evening before. (In the code and saved data a day of practice is called a session, and the steps keep their old ids P2, P3, P4.)
Rounds you enter from zetamac.com (Log screen) count too. Override the step in Settings.

## Road to 60 (key C)

A coach for one goal: 60 or more on Normal 120 s. Open **Road to 60** in the top bar and press **Enter** for today's session. The app runs it round by round and, after each round, says what comes next:

| Block | Rounds | What |
|---|---|---|
| 1 Warm-up | 1 | Tables (Weighted tables once you have passed the switch) |
| 2 Warm-up | 2 | Foundations |
| 3 Focus A | 3 | The drill for the family that loses the most time (or the accuracy round, below) |
| 4 Focus B | 3 | The drill for the next family |
| 5 Main | 4 | Speed (Normal 60 s) |
| 6 Benchmark | 2 | Normal 120 s: your official score |

Every 7th session is a test day: the warm-up, then 4 benchmark rounds, no drills. After block 6 the page says **Done for today** with a summary; anything you play after that is saved as *extra* and never counts. Close the tab whenever you like: the session resumes where you were.

- **Categories.** Every + − × ÷ question gets one: + with or without carry, − with or without borrow, − from 100 or more, × and ÷ tables, and × and ÷ by each number 2–12 with the other factor over 12. Each has a target median (1.0 s for tables up to 2.4 s for big ×).
- **Gap to 60.** Your median per category (from Foundations, Speed and Normal 120 s, last 3 days, more if a category has under 15 answers), how often Normal asks each one, the estimated score this gives, the lost time per family, accuracy, and the top 5 categories by lost time ("− with borrow: 3.1 s vs 1.9 s target → costs ~4 points").
- **Families.** Lost time adds up in 3 families: + and − (with complements), × big (every × N) and ÷ big (every ÷ N). One × N is only about 2% of Normal's questions, so the families are compared, not single categories. For + and − the drill is its costliest category (cross-100, borrow or carry); for × big or ÷ big it is a × ÷ drill on that family's 3 worst multipliers (for example × ÷ by 12, 8 and 6).
- **Accuracy.** Time lost to wrong attempts, per category so hard questions don't count twice: how often you get it wrong × how much longer those answers take than clean ones (only categories with 5 wrong and 5 clean answers). When it costs more than the top family, Focus A is the **accuracy round**: Normal 60 s where a wrong digit loses the point; the question stays until you fix it and type the answer, so you learn to correct yourself and fast typing never spills into the next question. Accuracy leaves the pool after 3 sessions in a row under 8% wrong attempts and comes back above 12%.
- **Drills** (keys 1–6): Complements (37 → 100, and 237 → 240), Carry addition, Borrow subtraction, Cross-100 subtraction, × ÷ by one number, and the accuracy round. Complements are never picked for you any more: play them here. After 5 seconds on a question a grey line shows the method (never the answer); turn it off in Settings.
- **Milestones** 40 · 45 · 50 · 55 · 60: reached when your benchmark average is there 2 sessions in a row. 60 counts at 3 in a row.
- **Mastered.** A category at its target 3 sessions in a row stops being picked as a focus.
- Also on the page: benchmark by time of day, and your warm-up curve (Speed score by round of the day). The report has a Coach section.
- Every end screen of a + − × ÷ round lists answers that took over 8 seconds, with the method.

## Screens

The top bar has six tabs: **Play**, **Road to 60**, **Learn**, **Review**, **Finance** and **Stats**. **Settings** is the gear at the top right, next to the light/dark toggle (`S`).
The site opens on **Play**, with Interview-ready (Zetamac Normal, 120 s) as mode 1: a first visit is one real round, no plan
needed. **Road to 60** is the second tab; with no rounds yet it explains how a day works instead of showing empty numbers.

- **Play**: every mode, nothing recommended. A click starts a mode (Custom opens its form); or choose with `1–9`, `0` or `↑ ↓` and press `Enter`. **Matrices** is the last row (also key `X`).
- **End of round**: a summary first: score, vs your average over your last 7 days played (and the step threshold),
  median time vs usual, first-try accuracy, rank among all your rounds in that mode, and up to 3
  takeaways (personal best, the operation that cost you most, freezes, a slowdown, wrong attempts).
  Scroll for the details: seconds per question through the round, answers and median time per third
  of the clock, each operation vs your usual, time spread, freezes (over 3× your median, with a
  chunking hint), slowest questions, facts slower or faster than usual, and every question. Buttons
  and keys: `Enter` play again, `D` drill those slow questions, `A` today’s analysis, `H` home.
- **Learn** (`N`): one lesson per trick (the 14 behind Squares, % and fractions and Mixed tricks), in four groups, each with
  your status on it. A lesson (`#learn/x11`) gives the rule, why it works, 3 fresh worked examples and your numbers.
  `Enter` **practises**: 10 questions, no clock, nothing saved; a wrong answer or `Tab` shows the method under the box,
  then you type the answer to go on, and the end shows where you needed it. On **Squares 11–30** you can set your own practice
  range (From and To, 2 to 50, remembered); the timed round and Squares on Play stay 11² to 30², so your stats keep one meaning. `F` plays a **timed round**: 60 s of that
  trick, saved as mode `LEARN` and compared only with rounds of the same trick (shown as "Learn: × 11").
  **Fractions by heart** (`#learn/fractions`): all 49 fractions with a denominator up to 12, plus 1/16, 3/16, 1/20 and 1/25,
  both ways: 3/7 → type the decimal; 0.429… → type 3/7 in the two boxes. Repeating decimals take 3 places, rounded
  or cut off (2/3: 0.667 or 0.666); a decimal with … repeats. A grid shows every pair: grey = not seen yet,
  inverted = slow or often wrong. Practice and timed rounds pick slow and unseen pairs more often (the weighted-tables
  formula), and the method uses the patterns (ninths, elevenths, sevenths, multiples of 1/d).
- **Matrices** (`X`): 2 × 2 matrix products. Choose the entries (ℤ, integers, or ℕ, natural numbers), the range
  (−9 to 9 by default, −12 to 12, or **Custom**: your own From and To, between −99 and 99) and the length (60 or 120 s);
  the choice is remembered. A round shows A × B and four answer boxes:
  `Space` goes to the next box (row by row, wrapping), the arrows move anywhere in the grid, and the next matrix comes
  as soon as all four entries are right. `Enter` outlines the wrong entries (until you edit them), `Tab` skips, `Esc` stops.
  Each combination of options counts as its own mode ("Matrices, −9 to 9, 60 s") in Log, Progress and the report,
  so scores are only compared with rounds of the same kind. Saved as mode `MATRIX`, questions as op `mx`.
- **Finance** (`Q`): mental math and finance intuition for quant-finance interviews. 57 calculation templates
  (arithmetic, quant mental math such as percentages, squares, roots, logs, compounding and expected value, and
  finance: rates, bonds, macro, volatility, banks and ALM, VaR and ES, liquidity, statistics) and 78 concept questions.
  Choose a mode, the families, a topic and a difficulty; the choice is remembered.
  - **Sprint**: timed (60, 120 or 180 s), typed answers. An exact or rounded answer is taken as soon as you type it;
    an estimate ("approximately, within 1%") takes `Enter`. The unit is beside the box and how to answer is under it.
    `%` and `bp` suffixes, commas as decimal points and spaces are all understood. `Tab` skips, `Esc` stops.
    **Pause and learn** (`H`, or the button under the box): the clock stops and you see the answer, the formula, the steps
    and why. `Enter` brings the question back; type the answer to go on (no point for that one). After a wrong `Enter`
    the line under the box reminds you. The end screen counts the questions you paused on.
  - **Practice**: untimed, on the page. After each answer: right or not, the answer, the formula (drawn as real maths:
    fractions, roots, exponents, Greek), the steps and why.
    `Enter` next, `S` same type with new numbers, `C` the related calculation (after a concept question), `Esc` done.
    Answer by typing or by picking from 4 (the wrong options are typical mistakes: forgetting √t, 1.96 for 99%, a sign…).
    "My 5 weakest" draws only your weakest question types.
  - **Intuition**: the concept questions only, keys `1–4`.
  - **Interview mix**: 20 questions from every family, getting harder, then your score per topic.
  Weaker and slower question types come up more often in Practice and the mix. The page shows your best sprint,
  accuracy per topic, sprint scores over time and your 5 weakest. Every question can be reopened from its code:
  `#finance/q/<template>/<seed>`. Saved as mode `FINANCE` (`settings.kind` = sprint, practice, intuition or mixed),
  questions as op `fin` with their template and seed; Log and the report show them.
- **Drill** (mode 5, or `D`): weak-fact list and drill; `M` replays mistakes (wrong, or over 3× your median for that operation and over 1.5 s; last 3 days).
- **Review** (`R`): tables heatmap (white = fast, black = slow) with three views, switched by the buttons next to the title or `V`: *Combined* (× and ÷ together), *Multiplication*, and *Division* (row = divide by, column = answer, so 56 ÷ 7 and 56 ÷ 8 are separate cells). Plus a sortable table of every fact key.
- **Stats** (`A`): one mode at a time. Pick the mode at the top (the modes you have played; your choice is remembered
  in this browser). Under it: your last day's average, best round of all time (with its day) and trend (points per day played, needs 4 days over a
  week); the progress chart (day average, best of the day, the 60 goal on Interview-ready); a **calendar** of the days you
  played that mode, with the chosen day beside it: its scores (× deletes a round), median time against your usual, wrong
  answers, your pace from the first to the last third of the clock, and the 5 slowest or wrong questions with how to think
  them. Then speed per operation (last day against the days before) and the round-of-the-day chart (warm-up and fatigue,
  when 3 or more round numbers have 2+ days). `←` `→` move between days, `E` opens today, `A` on any end screen opens that
  day. **Add scores from zetamac.com** is at the bottom. Old links (`#session/…`, `#log`, `#stats/progress`) still work.
- **Settings**: theme, countdown, step override, interview penalty, export/import, reset.

## Keys

`P` play · `C` Road to 60 · `N` learn · `X` matrices · `Q` finance · `R` review · `A` stats · `S` settings · `D` drill · `E` `G` `L` open the Today, Progress or Log section · `T` light/dark · `?` help.
Play: `1–9`, `0` or `↑ ↓` select, `Enter`/`Space` start. Lesson: `Enter` practise, `F` timed round; in practice `Tab` shows the method.
Road to 60: `Enter` start or continue today's session (once done: an extra round), `1–6` drills (6: accuracy round).
Matrices: `Enter` start; in a round `Space` next entry, arrows move, `Enter` outline wrong entries, `Tab` skip.
Finance: `Enter` start; sprint `H` pause and learn (`Enter` back), `Enter` checks an estimate, `Tab` skips; practice `Enter` check then next, `1–4` choose, `S` new numbers, `C` related calculation, `Esc` done.

## Adding a finance template

Templates live in `js/finance-templates.js` and register with `F.register({...})` (fields documented at the top of
`js/finance-core.js`):

1. Give it a stable `id` (`fin.bond.price.3y`), a `family` (`arith`, `quant`, `fin`), a `category` (the topic shown
   on the page), a `difficulty` (1 one formula, round numbers; 2 a constant or two steps; 3 multi-step or a trap).
2. `params(rng)` draws the inputs from grids with `F.pick`, `F.int`, `F.grid` (realistic, mentally computable values);
   `valid(p)` rejects silly draws. Choose the answer first when it should be a clean number.
3. `prompt(p)`, `answer(p)` (the exact value), `unit` and `dp` (decimals shown), `tol(p)` if not "rounded to dp"
   (`exact`, `abs`, `rel`: relative tolerances need Enter in a sprint and say "approximately").
4. `distractors(p)`: plausible mistakes computed from the same inputs (the engine drops any within tolerance).
   `steps(p)`: the formula with the numbers substituted and the intermediate results. Put every formula, letter or symbol
   between `$…$` in the same LaTeX subset (`'Discount: $\\text{PV} = \\frac{C}{(1 + r)^t}$.'`), in prompts, steps and `why`
   too; plain prose and plain numbers stay outside. `formula` (plain text, used in the
   report); `why`. Add the same formula in LaTeX style to the `TEX` map at the end of the file (`\frac{C}{(1 + r)^t}`,
   `\sigma_{\text{day}}\sqrt{252}`…): `js/tex.js` draws it as real maths with the browser's MathML. The supported subset is
   listed at the top of `js/tex.js`; anything else fails the tests (`tests/tex.test.js`) and would show the plain formula.
5. Add an independent reference in `tests/finance.test.js` (`REF`): a `check` of the grids and the `answer`
   written separately. `npm test` runs it on 1,000 seeds; `npm run samples -- <id>` prints examples to read.

Concept questions go in `js/finance-bank.js`: the right option first (the engine shuffles), a 2–4 sentence explanation,
and optionally the id of the calculation to practise next.

## How weak facts are found

Each question maps to fact keys: `7x8` for tables (× and ÷ share it), `8x30s` and `8x36` for larger
×÷, and `add-carry`, `sub-borrow`, `add-2d+2d`… for + and −.
Slowness = median of (time ÷ your median for that operation) × (1 + wrong rate). Attempts older
than 21 days count half. A fact is **weak** with slowness ≥ 1.5 over ≥ 3 attempts, or a stall in the last 2 days:
an attempt over 3× your median for that operation (and over 1.5 s), so the bar follows your own pace.
Review says "after a freeze" when that stall is the only reason. After a good day (every attempt at or under your median) it is
**improving**. After 3 good days it is **mastered**. A bad day sends it back to weak.

## Develop

Clone the repo and open `index.html`: there is no build step and the app has no dependencies.

- Progress lives in each person's browser (or their account), never in the repo. Each clone starts
  empty. Sign-in only works over http(s), not from `file://`.
- Never commit an export: it is your personal history. `.gitignore` skips `103-*.json` and the older `arithmetic-trainer-*.json`.
- Tests need Node 18+ and Google Chrome. `npm ci` installs the exact Playwright and Supabase client
  versions from `package-lock.json` (the app itself loads the client from jsDelivr with an integrity
  hash; tests serve the same file). `node_modules/` and `test-results/` are not committed.
- Upgrading the Supabase client: change the version and `CLIENT_SRI` in `js/sync.js` and in `package.json` together.
- Keep classic `<script>` tags (no ES modules, no bundler) so double-clicking `index.html` keeps working.

## Deploy (GitHub → Vercel, accounts with Supabase)

The site is static: Vercel serves the repo as is. `vercel.json` sets security headers and
`.vercelignore` keeps tests, docs and `package.json` out of the deploy (so nothing is installed).

1. **Vercel:** Add New → Project → import the GitHub repo. Framework preset *Other*, no build
   command, output directory `.` (already set by `vercel.json`). Every push to `main` deploys;
   every pull request gets its own preview URL.
2. **Put the link where people find it:** the URL at the top of this README; set it in
   the GitHub repo's *About → Website* box.

Accounts are optional. Without step 3–5 the site works exactly the same, without the Account section.

3. **Supabase:** create a project (free tier). SQL Editor → paste [`supabase/schema.sql`](supabase/schema.sql) → Run.
   It creates the `rounds` and `profiles` tables, row-level security (each account sees only its
   own rows), and the `delete_my_account` function.
4. **Auth settings:** Authentication → Sign In / Providers → Email enabled. Authentication → URL
   Configuration → *Site URL* = your Vercel URL; *Redirect URLs* = `https://arithmetictrainer.vercel.app/**`
   and `https://*-YOUR-TEAM.vercel.app/**` (previews).
5. **Connect the app:** Project Settings → API → copy the project URL and the anon (publishable)
   key into [`js/config.js`](js/config.js), commit, push. Both values are public by design.

Before sharing widely: Supabase's built-in email sender only allows a few sign-in emails per hour.
Set up custom SMTP (Authentication → Emails → SMTP, for example with Resend's free tier).

## Tests

Logic (generator, stats, progression, storage) is plain JS with no DOM:

```
node --test
```

End-to-end tests drive the real page in your installed Google Chrome with Playwright. Time is
mocked (`page.clock`), so a 60-second round runs in milliseconds. They are a development tool only:
the app itself has no dependencies and `node_modules` is not part of it.

```
npm ci
npm run test:e2e
```

They cover: auto-accept, wrong-attempt counting, time-up saving, Esc, Enter to replay, Interview
scoring, the home hero, Review views and their URLs, Session deep links and `A`, Stats sections and old links, the skip link,
help, Learn (lessons, practice with the method on a miss, timed rounds saved as LEARN), Matrices, Finance (sprint auto-accept and
estimates, practice with worked answers, seed links, intuition keys, the interview mix, saving on leave, progress), zetamac.com entry, export → reset → import, and account sync against a fake Supabase
(served over http by `tests/e2e/server.js`): first sign-in merge, push, tombstones, pull.

## Design docs

`docs/design.md` (tokens), `docs/design-guidelines.md` (accessibility, copy, do’s and don’ts) and
`docs/design-components.md` (every component) describe the black-and-white system. Copy is sentence
case, second person and plain; numbers are monospace with tabular figures.

## Files

`js/generator.js` questions · `js/finance-core.js` `js/finance-templates.js` `js/finance-bank.js` Finance engine, templates, concept questions · `js/finance-ui.js` Finance tab · `js/tex.js` LaTeX-subset formulas to MathML · `tools/finance-samples.js` sample printer (`npm run samples`, not deployed) · `js/lessons.js` Learn texts · `js/stats.js` sessions and weak facts · `js/progression.js` steps and summary ·
`js/storage.js` save/load/export/import · `js/sync.js` account sync · `js/config.js` Supabase keys · `js/game.js` play loop · `js/charts.js` SVG · `js/ui.js` screens ·
`js/app.js` bootstrap; `tests/` logic tests, `tests/e2e/` browser tests. Classic `<script>` tags on one global `window.AT` (ES modules fail on `file://`).

## License

MIT, see [LICENSE](LICENSE).
