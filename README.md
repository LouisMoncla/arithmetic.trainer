# Arithmetic Trainer

A Zetamac-style mental-math trainer for quant interviews. Black and white, keyboard first.

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

Settings (`S`) → **Export JSON** downloads `arithmetic-trainer-YYYY-MM-DD.json`.
**Import JSON** shows a preview ("142 rounds, 12 sessions") and lets you *Replace* everything
or *Merge* (rounds are matched by id, so merging the same file twice adds nothing).
If your last export is older than 7 days, the home screen shows a one-line reminder.

Clearing browser data deletes your history, so export regularly.

### Where your data lives

Every round is saved automatically on this computer, inside the browser's own storage
(`localStorage`), not inside this folder. Nothing is sent anywhere.

- Moving or renaming this folder is fine in Chrome and Edge: all local files share one storage there.
- Another browser, another browser profile or a private window starts empty. Export, then Import there.
- Firefox may tie storage to the exact file path, so export before moving the folder if you use it.

## Modes (Play screen, keys 1–7)

| # | Mode | What it's for |
|---|------|---------------|
| 1 | **Tables** | ×÷ (2–12)×(2–12), 60 s. Warm-up; the home screen says "warm-up first" until you play one each day. |
| 2 | **P2** | ×÷ (2–12)×(2–100), 60 s. One-digit × two-digit and big divisions (637 ÷ 7). |
| 3 | **P3** | Zetamac Normal, 60 s. |
| 4 | **Normal 120 s** | The real benchmark (step P4). |
| – | **Weighted tables** | From Review (`W`). Tables, but every × fact and every ÷ (each direction on its own) comes up in proportion to (your median time on it)², so slow facts appear far more often. Facts with no data count as slowest until seen. Counts as the daily warm-up. |
| 5 | **Weak-fact drill** | Shows your top 10 weak facts, then 60 s: ~70% from them (weighted by slowness, with their fact families), ~30% normal P2. |
| 6 | **Interview** | Optiver-style: 80 questions in 8 min. Integers, decimals, fractions, percentages, estimates. Type and press Enter (`0.5`, `.5`, `1/2` all accepted); Tab skips; +1 / −1 (penalty set in Settings) / 0. |
| 7 | **Custom** | Every Zetamac setting: operations, 4 ranges, 30/60/120/300 s. Save named presets. |

In Zetamac modes the answer is accepted the moment it's right; no Enter. A full-length wrong
value counts as one wrong attempt (Backspace and keep going). `Esc` aborts (not saved).

## Steps

| Step | Mode | Advance when |
|---|---|---|
| P2 | P2 | session average ≥ 18 for 3 sessions in a row |
| P3 | P3 | session average ≥ 25 for 3 sessions in a row |
| P4 | Normal 120 s | session average ≥ 60 for 3 sessions in a row |

A session is one calendar day. It only counts if it has at least 3 rounds in that step's mode.
Rounds you enter from zetamac.com (Log screen) count too. Override the step in Settings.

## Screens

- **Play** (home): the round to play next, big, with one Start button (it follows whatever mode you select with `1–7` or `↑ ↓`); then your step, its rule and the 3-box streak; then all modes.
- **End of round**: a summary first: score, vs your 7-session average (and the step threshold),
  median time vs usual, first-try accuracy, rank among all your rounds in that mode, and up to 3
  takeaways (personal best, the operation that cost you most, freezes, a slowdown, wrong attempts).
  Scroll for the details: seconds per question through the round, answers and median time per third
  of the clock, each operation vs your usual, time spread, freezes (over 3× your median, with a
  chunking hint), slowest questions, facts slower or faster than usual, and every question. Buttons
  and keys: `Enter` play again, `D` drill those slow questions, `A` today’s analysis, `H` home.
- **Drill**: weak-fact list and drill; `M` replays mistakes (wrong or > 4 s, last 3 sessions).
- **Review**: tables heatmap (white = fast, black = slow) with three views, switched by the buttons next to the title or `V`: *Combined* (× and ÷ together), *Multiplication*, and *Division* (row = divide by, column = answer, so 56 ÷ 7 and 56 ÷ 8 are separate cells). Plus a sortable table of every fact key.
- **Session** (`E`): one day analysed. Scores round by round against your threshold and 7-session average, pace inside rounds (answers and median time per third of the clock), mistakes and freezes with how to think them, each operation today vs usual, and the facts that got faster or slower. `←` `→` move between sessions; `A` on any end screen jumps here.
- **Progress**: per-mode charts (session average, best, threshold), trend per session and
  sessions-to-threshold, estimated 120 s score, time per question by operation, average score
  by round index (fatigue).
- **Log**: one row per session, add zetamac.com scores, delete a round (activate its score),
  **Copy report for Claude**: a self-explanatory text report (rules, every session, steps and trends,
  per-operation speed, weak facts, tables grid, latest session in detail, fatigue). For the raw
  data, Export JSON in Settings.
- **Settings**: theme, countdown, step override, interview penalty, export/import, reset.

## Keys

`P` play · `D` drill · `R` review · `E` session · `G` progress · `L` log · `S` settings · `T` light/dark · `?` help.
Play: `1–7` or `↑ ↓` select, `Enter`/`Space` start.

## How weak facts are found

Each question maps to fact keys: `7x8` for tables (× and ÷ share it), `8x30s` and `8x36` for larger
×÷, and `add-carry`, `sub-borrow`, `add-2d+2d`… for + and −.
Slowness = median of (time ÷ your median for that operation) × (1 + wrong rate). Attempts older
than 21 days count half. A fact is **weak** with slowness ≥ 1.5 over ≥ 3 attempts, or any attempt
over 4 s in the last 2 sessions. After a good session (every attempt at or under your median) it is
**improving**. After 3 good sessions it is **mastered**. A bad session sends it back to weak.

## Develop

Clone the repo and open `index.html`: there is no build step and the app has no dependencies.

- Progress lives in each person's browser (or their account), never in the repo. Each clone starts
  empty. Sign-in only works over http(s), not from `file://`.
- Never commit an export: it is your personal history. `.gitignore` skips `arithmetic-trainer-*.json`.
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
scoring, the home hero, Review views and their URLs, Session deep links and `A`, the skip link,
help, zetamac.com entry, export → reset → import, and account sync against a fake Supabase
(served over http by `tests/e2e/server.js`): first sign-in merge, push, tombstones, pull.

## Design docs

`docs/design.md` (tokens), `docs/design-guidelines.md` (accessibility, copy, do’s and don’ts) and
`docs/design-components.md` (every component) describe the black-and-white system. Copy is sentence
case, second person and plain; numbers are monospace with tabular figures.

## Files

`js/generator.js` questions · `js/stats.js` sessions and weak facts · `js/progression.js` steps and summary ·
`js/storage.js` save/load/export/import · `js/sync.js` account sync · `js/config.js` Supabase keys · `js/game.js` play loop · `js/charts.js` SVG · `js/ui.js` screens ·
`js/app.js` bootstrap; `tests/` logic tests, `tests/e2e/` browser tests. Classic `<script>` tags on one global `window.AT` (ES modules fail on `file://`).

## License

MIT, see [LICENSE](LICENSE).
