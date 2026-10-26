# CLAUDE.md — project context for Claude Code

Read this first. `README.md` is the user-facing guide (modes, keys, steps, deploy); this file is
the engineering context: what exists, why it is built this way, and the rules to keep.

## What it is

A Zetamac-style mental-math trainer for quant-interview prep. Live at
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
- **Black and white only.** Six tokens (`--bg --fg --mid --soft --line --grid`; values in
  `docs/design.md`), no accent or status colours, no green/red feedback. Emphasis = inversion or weight.
- **Minimal, keyboard first.** System UI font for words, monospace tabular numbers, 1px rules, square
  corners, no shadows, no transitions or animations, sentence case (no `text-transform: uppercase`),
  no "a · b · c" dot-joined strings.
- **The game screen shows only question, answer box, timer, score.** No flash on a correct answer
  (it costs reaction time; removed on purpose). Zetamac modes auto-accept a correct answer with no Enter.
- **Features, modes, keys and the saved-data format don't change casually.** Old exports must still
  import (`Storage.migrate`). If the schema must change, bump `SCHEMA` and migrate.
- **Never seed or ship personal data.** New users start empty (the owner's old scores used to be
  seeded; removed). Exports (`arithmetic-trainer-*.json`) are git-ignored.
- Don't add dependencies to the app. `package.json` dev dependencies are for tests only.

## Layout

```
index.html        shell: top bar, #main, #game overlay, #help dialog, script order
privacy.html      what is stored when signed in
css/style.css     all styles (tokens on :root, dark mode via prefers-color-scheme + [data-theme])
js/generator.js   questions per mode, fact keys, families, advice text, interview questions; mulberry32 PRNG
js/stats.js       sessions (= calendar days), averages, trends, fatigue, weak-fact engine,
                  tables heatmap cells + weighted-tables weights, sessionReport (one day analysed),
                  roundReport (one round analysed, for the end screen)
js/progression.js steps P2→P3→P4, recommendation, the "Copy report for Claude" text report
js/storage.js     localStorage load/save (key arithmeticTrainer.v1), migrate, export/import, merge
js/config.js      Supabase URL + anon key (empty = no accounts)
js/sync.js        optional account sync (Supabase); pure diff/applyRemote exported for tests
js/charts.js      inline-SVG line/bar charts, legend, tooltip, keyboard, "Show as table"
js/game.js        the round loop (timer, input, auto-accept, interview scoring)
js/ui.js          every screen, routing, keys, settings, account UI (largest file); Stats sections render via fill()
js/app.js         bootstrap: load data, UI.init
supabase/schema.sql  tables, row-level security, delete_my_account()
tests/*.test.js   node --test (logic, sync pure functions); tests/fixtures.js shared data
tests/e2e/        Playwright specs + helpers; server.js = tiny static server for the sync spec
docs/design*.md   design system: tokens, guidelines/accessibility/copy, component specs
vercel.json       headers (CSP etc.), cleanUrls; .vercelignore keeps tests/docs/package.json out of the deploy
```

Script order matters: generator → stats → progression → storage → config → sync → charts → game → ui → app.

## Data model (localStorage `arithmeticTrainer.v1`, also the export format)

```js
{ schemaVersion: 1, seeded, presets: [], settings: { theme, countdown, stepOverride, negMark, lastExport, announced, custom },
  rounds: [{ id, startedAt /*ISO*/, mode, linkedMode /*for EXTERNAL*/, settings: { duration, ops, ranges }, score,
             questions: [{ op /*add sub mul div iv*/, a, b, shown, answer, timeMs, wrongAttempts, unanswered?, correct?, skipped? }] }] }
```

- `mode`: TABLES, WTABLES (weighted tables), P2, P3, NORMAL120, DRILL, INTERVIEW, CUSTOM, or EXTERNAL
  (scores typed in from zetamac.com, no questions; `linkedMode` says which mode they count as).
- A **session = one local calendar day**. Session numbers count days with any round.
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

## Working conventions

- Match the surrounding code: ES5-style `var`/functions in `js/`, short comments where intent isn't obvious.
- New UI: reuse `pageHead`, `section`, `frow`, `facts`-style `<dl>`, `.notice`, `.row`, `.inline-form`
  from `ui.js`/`style.css`; check `docs/design-components.md` before inventing a component.
- Copy: second person, plain, sentence case; errors say how to fix; numbers as numerals.
- Any new keyboard shortcut needs a visible control and a line in the help dialog (`index.html`).
- Ask before deleting files or data, and before force-pushing.
