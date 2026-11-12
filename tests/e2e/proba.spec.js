// Learn › Probability, on the 25 sample cards (tests/proba-fixture.js, passed as window.AT_PROBA_FIXTURE, so these tests
// do not depend on the real bank): the hub and its filters, Learn (feedback, the comeback, true/false, typed numbers),
// hints, Sprint, complements, the progress table, the cheat-sheet copy, reload, and every card drawn in both themes.
const { test, expect } = require('@playwright/test');
const { openApp, rounds, jump, endRound } = require('./helpers');
const FX = require('../proba-fixture.js');
const BY = Object.fromEntries(FX.map((c) => [c.id, c]));

// Open the app on a route with the fixture bank in place.
async function open(page, hash, opts, bank) {
  await page.addInitScript((fx) => { window.AT_PROBA_FIXTURE = fx; }, bank || FX);
  await openApp(page, hash, opts);
}
const hub = (page, opts) => open(page, 'learn/proba', opts);
const cur = (page) => page.evaluate(() => {
  const q = document.querySelector('[data-testid="proba-question"]'), c = window.AT.Proba.bank().byId[q.dataset.id];
  return { id: c.id, game: c.game, answer: c.answer };
});
// The position of the right choice on screen (same renderer, so the HTML matches exactly).
const rightIndex = (page) => page.evaluate(() => {
  const q = document.querySelector('[data-testid="proba-question"]'), c = window.AT.Proba.bank().byId[q.dataset.id], html = window.AT.TeX.rich(c.answer);
  return Array.from(q.querySelectorAll('.opt .ot')).findIndex((e) => e.innerHTML === html);
});
// Answer the current card right or wrong, by keyboard. Returns the card.
async function play(page, ok) {
  const c = await cur(page);
  if (c.game === 'truefalse') await page.keyboard.press((ok ? c.answer : !c.answer) ? 't' : 'f');
  else if (c.game === 'compute') { await page.getByTestId('proba-input').fill(ok ? String(c.answer) : '987654'); await page.keyboard.press('Enter'); }
  else { const r = await rightIndex(page); await page.keyboard.press(String((ok ? r : r === 0 ? 1 : 0) + 1)); }
  return c;
}
const game = (page, id) => page.locator('[data-pb-game="' + id + '"]').click();
const cell = (page, l, g) => page.getByTestId('proba-cell-' + l + '-' + g);
const subNum = async (page) => +/Card (\d+)/.exec(await page.locator('.page-head .sub').textContent())[1];

test('Learn › Probability opens from the Learn tab; the default scope is lectures 1–4; the table follows the scope; nothing is fetched', async ({ page }) => {
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:')) external.push(r.url()); });
  await open(page, 'learn');
  await page.getByTestId('learn-lesson-proba').click();
  await expect(page).toHaveURL(/#learn\/proba$/);
  await expect(page.getByTestId('proba-title')).toHaveText('Probability');
  const version = await page.evaluate(() => window.AT.PROBA_META.version);   // the fixture replaces the cards, not the meta
  await expect(page.locator('.page-head .sub')).toContainText('25 cards, bank ' + version);
  await expect(page.locator('[data-pb-scope="4"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-pb-scope="6"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('proba-complements')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('tr[data-lecture]')).toHaveCount(4);
  await expect(page.locator('tr[data-lecture="5"]')).toHaveCount(0);
  await expect(page.getByTestId('proba-total')).toHaveText('0 / 20');
  await expect(page.locator('[data-pb-lec]')).toHaveCount(4);
  await page.locator('[data-pb-scope="6"]').click();
  await expect(page.locator('tr[data-lecture]')).toHaveCount(6);
  await expect(page.locator('tr[data-lecture="6"]')).toBeVisible();
  await expect(page.getByTestId('proba-total')).toHaveText('0 / 24');
  await expect(page.locator('[data-pb-lec]')).toHaveCount(6);
  await expect(page.locator('tr[data-lecture="5"] th')).toContainText('Coupon collector');   // titles come from the bank's meta
  expect(external).toEqual([]);
});

test('Learn: a wrong answer shows the explanation, and the card comes back 3 to 5 cards later, marked Again; T/F and 1/2 work', async ({ page }) => {
  await hub(page);
  await game(page, 'truefalse');
  await page.keyboard.press('l');
  await expect(page.getByTestId('proba-question')).toBeVisible();
  expect(await subNum(page)).toBe(1);
  const first = await play(page, false);
  expect(first.id).toBe('L1-double-series-swap');   // new cards come in file order
  await expect(page.getByTestId('proba-result')).toBeVisible();
  await expect(page.getByTestId('proba-result')).toContainText('Not quite');
  await expect(page.getByTestId('proba-explain')).toContainText('Slide counterexample');
  await expect(page.getByTestId('proba-source')).toContainText('L1 slides');
  await expect(page.locator('.opt.right')).toHaveCount(1);
  await expect(page.locator('.opt.chosen')).toHaveCount(1);   // the wrong pick is struck through
  await page.keyboard.press('Enter');
  let back = null;
  for (let i = 0; i < 8 && back === null; i++) {
    const n = await subNum(page);
    if (await page.getByTestId('proba-again').count()) { back = n; expect((await cur(page)).id).toBe(first.id); break; }
    // 1 and 2 are True and False too
    const c = await cur(page);
    await page.keyboard.press(c.answer ? '1' : '2');
    await expect(page.getByTestId('proba-result')).toContainText('Right');
    await page.keyboard.press('Enter');
  }
  expect(back).toBeGreaterThanOrEqual(4);   // the first card was number 1: 3 to 5 cards later is number 4 to 6
  expect(back).toBeLessThanOrEqual(6);
  await page.keyboard.press('Escape');
  const saved = (await rounds(page)).filter((r) => r.mode === 'LEARN');
  expect(saved).toHaveLength(1);
  expect(saved[0].settings.lesson).toBe('proba-learn');
  expect(saved[0].questions[0]).toMatchObject({ op: 'pb', id: first.id, correct: false, hinted: false });
  expect(saved[0].questions.filter((q) => q.again)).toHaveLength(0);   // the comeback was not answered (Esc on it)
});

test('Learn: a right answer shows the explanation small and Enter moves on; Space too', async ({ page }) => {
  await hub(page);
  await game(page, 'truefalse');
  await page.keyboard.press('l');
  await play(page, true);
  await expect(page.getByTestId('proba-result')).toContainText('Right.');
  await expect(page.getByTestId('proba-explain')).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.getByTestId('proba-result')).toHaveCount(0);
  expect(await subNum(page)).toBe(2);
});

test('Quick compute: 3/8 and 0,375 are accepted; text that is not a number shows a message and is not an attempt', async ({ page }) => {
  await hub(page);
  await game(page, 'compute');
  await page.keyboard.press('l');
  await expect(page.getByTestId('proba-input')).toBeFocused();
  expect((await cur(page)).id).toBe('L2-taxi');
  await page.getByTestId('proba-input').fill('abc');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-err')).toContainText('read that number');
  await expect(page.getByTestId('proba-result')).toHaveCount(0);   // still the same card, still waiting
  await page.getByTestId('proba-input').fill('3/0');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-err')).toContainText('read that number');
  await page.getByTestId('proba-input').fill('5/12');   // 0.4167: within the card's tolerance 0.002 of 0.4138? no: 0.0029 off
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-result')).toContainText('Not quite');
  await expect(page.getByTestId('proba-result')).toContainText('0.4138');
  await page.keyboard.press('Enter');   // next card: the next new one in file order (poi, then bin-pmf)
  expect((await cur(page)).id).toBe('L4-poi-ex2');
  await page.getByTestId('proba-input').fill('6e0');   // scientific notation
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-result')).toContainText('Right');
  await page.keyboard.press('Enter');
  expect((await cur(page)).id).toBe('L3-bin-pmf');
  await page.getByTestId('proba-input').fill('3 / 8');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-result')).toContainText('Right');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-again')).toBeVisible();   // the taxi miss, 3 cards later
  expect((await cur(page)).id).toBe('L2-taxi');
  await page.keyboard.press('Escape');
  const qs = (await rounds(page)).filter((r) => r.mode === 'LEARN')[0].questions;
  expect(qs).toHaveLength(3);   // the unreadable entries are not in there
  expect(qs.map((q) => q.correct)).toEqual([false, true, true]);
  expect(qs[2]).toMatchObject({ id: 'L3-bin-pmf', given: '3 / 8' });
});

test('Quick compute takes a comma and a fraction, in a sprint too; Esc in the box ends the session', async ({ page }) => {
  await hub(page);
  await game(page, 'compute');
  await page.keyboard.press('l');
  await page.getByTestId('proba-input').fill('0,414');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-result')).toContainText('Right');
  await page.keyboard.press('Enter');
  await page.getByTestId('proba-input').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('end-score')).toHaveText('1');
});

test('H: half of the wrong choices go on a card without a hint, the card\'s own hint is shown on one that has it; either is saved as hinted', async ({ page }) => {
  await hub(page);
  await cell(page, 3, 'laws').click();   // L3-geo-var: 5 choices, no hint
  await expect(page.getByTestId('proba-question')).toHaveAttribute('data-id', 'L3-geo-var');
  await expect(page.locator('.fq-opts .opt')).toHaveCount(5);
  await page.keyboard.press('h');
  await expect(page.locator('.fq-opts .opt')).toHaveCount(3);   // 4 wrong choices: 2 removed
  await expect(page.getByTestId('proba-hint')).toContainText('Half of the wrong choices are gone');
  expect(await rightIndex(page)).toBeGreaterThanOrEqual(0);   // the right one stays
  await page.keyboard.press('h');   // once per card
  await expect(page.locator('.fq-opts .opt')).toHaveCount(3);
  await play(page, true);
  await expect(page.getByTestId('proba-result')).toContainText('Right');
  await page.keyboard.press('Escape');
  expect((await rounds(page)).filter((r) => r.mode === 'LEARN')[0].questions[0]).toMatchObject({ id: 'L3-geo-var', correct: true, hinted: true });
  await jump(page, 500);
  await page.keyboard.press('Enter');   // back to the hub
  await cell(page, 3, 'proof').click();   // L3-tail-formula-proof has its own hint
  await expect(page.getByTestId('proba-question')).toHaveAttribute('data-id', 'L3-tail-formula-proof');
  await expect(page.locator('.fq-opts .opt')).toHaveCount(4);
  await expect(page.getByTestId('proba-hint')).toHaveCount(0);
  await page.keyboard.press('h');
  await expect(page.getByTestId('proba-hint')).toContainText('Hint.');
  await expect(page.getByTestId('proba-hint').locator('math').first()).toBeVisible();
  await expect(page.locator('.fq-opts .opt')).toHaveCount(4);   // nothing removed: the hint text is the help
  // true/false cards have no hint
  await page.keyboard.press('Escape');   // nothing answered on this card: straight back to the hub, nothing saved
  await cell(page, 1, 'truefalse').click();
  await page.keyboard.press('h');
  await expect(page.getByTestId('proba-hint')).toHaveCount(0);
});

test('a hinted answer comes back in Learn like a miss, and a typed answer survives pressing H', async ({ page }) => {
  await hub(page);
  await cell(page, 3, 'proof').click();
  await page.keyboard.press('h');
  await play(page, true);
  await page.keyboard.press('Enter');
  // a pool of one card: it is shown again at once, but a hinted answer still scheduled a comeback (Again) only for others
  expect((await cur(page)).id).toBe('L3-tail-formula-proof');
  await page.keyboard.press('Escape');
  await jump(page, 500);
  await page.keyboard.press('Enter');
  await game(page, 'compute');
  await page.keyboard.press('l');
  await page.getByTestId('proba-input').fill('0.4');
  await page.keyboard.press('h');
  await expect(page.getByTestId('proba-hint')).toContainText('Bayes');
  await expect(page.getByTestId('proba-input')).toHaveValue('0.4');
});

test('Sprint 60: a clock, +1 for right, −1 for wrong, Tab skips, no feedback, then every miss with its explanation; saved as its own mode', async ({ page }) => {
  await hub(page);
  await game(page, 'truefalse');
  await page.keyboard.press('s');
  await expect(page.getByTestId('proba-timer')).toHaveText('60');
  await expect(page.getByTestId('proba-score')).toHaveText('0');
  const missed = await play(page, false);
  await expect(page.getByTestId('proba-result')).toHaveCount(0);   // no feedback in a sprint
  await expect(page.getByTestId('proba-score')).toHaveText('−1');
  await play(page, true);
  await play(page, true);
  await expect(page.getByTestId('proba-score')).toHaveText('1');
  await page.keyboard.press('Tab');   // a skip costs nothing
  await expect(page.getByTestId('proba-score')).toHaveText('1');
  await jump(page, 20000);
  await expect(page.getByTestId('proba-timer')).toHaveText(/^4\d$/);
  await endRound(page, 41000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await expect(page.locator('.end-head .sub')).toContainText('2 of 4 right, 50%');
  const review = page.getByTestId('proba-review');
  await expect(review.locator('li')).toHaveCount(2);   // the wrong one and the skipped one
  await expect(review.locator('li[data-id="' + missed.id + '"]')).toContainText('Wrong');
  await expect(review.locator('li[data-id="' + missed.id + '"]')).toContainText(BY[missed.id].explain.split('$')[0].slice(0, 20));
  await expect(review).toContainText('Skipped');
  const r = (await rounds(page)).filter((x) => x.mode === 'LEARN')[0];
  expect(r.settings).toMatchObject({ lesson: 'proba-sprint-60', duration: 60, penalty: 1 });
  expect(r.score).toBe(1);
  expect(r.questions[3]).toMatchObject({ skipped: true, correct: false });
});

test('Sprint 120 on Shift S; the penalty is Taylor\'s setting', async ({ page }) => {
  await hub(page, { rounds: [] });
  await page.evaluate(() => { window.AT.data.settings.taylor = { penalty: 0.5 }; window.AT.UI.kit.save(); });
  await page.reload();
  await game(page, 'truefalse');
  await page.keyboard.press('Shift+S');
  await expect(page.getByTestId('proba-timer')).toHaveText('120');
  await play(page, false);
  await expect(page.getByTestId('proba-score')).toHaveText('−0.5');
  await endRound(page, 121000);
  await expect(page.getByTestId('end-score')).toHaveText('−0.5');
  expect((await rounds(page)).filter((x) => x.mode === 'LEARN')[0].settings).toMatchObject({ lesson: 'proba-sprint-120', duration: 120, penalty: 0.5 });
});

test('complements: off by default; on, the Hölder card is in the table and in the pool', async ({ page }) => {
  await hub(page);
  await expect(cell(page, 3, 'statements')).toContainText('0 / 1');
  await page.getByTestId('proba-complements').click();
  await expect(page.getByTestId('proba-complements')).toHaveAttribute('aria-pressed', 'true');
  await expect(cell(page, 3, 'statements')).toContainText('0 / 2');
  await expect(page.getByTestId('proba-total')).toHaveText('0 / 21');
  await cell(page, 3, 'statements').click();
  const seen = new Set();
  for (let i = 0; i < 4; i++) { seen.add((await cur(page)).id); await play(page, true); await page.keyboard.press('Enter'); }
  expect(seen).toEqual(new Set(['L3-exy-indep', 'L3-holder']));
  await page.keyboard.press('Escape');
  await jump(page, 500);
  await page.keyboard.press('Enter');
  await page.getByTestId('proba-complements').click();   // off again: back to one card, which the 4 right answers above mastered
  await expect(cell(page, 3, 'statements')).toContainText('1 / 1');
  await cell(page, 3, 'statements').click();
  for (let i = 0; i < 3; i++) { expect((await cur(page)).id).toBe('L3-exy-indep'); await play(page, true); await page.keyboard.press('Enter'); }
});

test('the game and lecture filters narrow the pool; a table cell starts Learn on that lecture and game', async ({ page }) => {
  await hub(page);
  await page.locator('[data-pb-scope="6"]').click();
  await page.locator('[data-pb-lec="1"]').click();
  await page.locator('[data-pb-lec="2"]').click();
  await page.locator('[data-pb-lec="3"]').click();
  await game(page, 'laws');
  await page.keyboard.press('l');
  const ids = new Set();
  for (let i = 0; i < 12; i++) { ids.add((await cur(page)).id); await play(page, true); await page.keyboard.press('Enter'); }
  expect(ids).toEqual(new Set(['L4-exp-tail', 'L4-bin-mgf', 'L5-normal-mgf', 'L5-order-stat']));   // laws in lectures 4–6, minus 6 (none)
  await page.keyboard.press('Escape');
  await jump(page, 500);
  await page.keyboard.press('Enter');
  // a cell ignores the chips but not the scope
  await cell(page, 4, 'laws').click();
  await expect(page.locator('.page-head h1')).toHaveText('Probability: learn, L4, Law cards');
  const cellIds = new Set();
  for (let i = 0; i < 8; i++) { cellIds.add((await cur(page)).id); await play(page, true); await page.keyboard.press('Enter'); }
  expect(cellIds).toEqual(new Set(['L4-exp-tail', 'L4-bin-mgf']));
});

test('an empty pool disables Learn and Sprint and says why', async ({ page }) => {
  await hub(page);
  await game(page, 'compute');
  await page.locator('[data-pb-lec="2"]').click();
  await page.locator('[data-pb-lec="3"]').click();
  await page.locator('[data-pb-lec="4"]').click();   // L1 only has no compute card
  await expect(page.getByTestId('proba-empty')).toBeVisible();
  await expect(page.getByTestId('proba-learn')).toBeDisabled();
  await expect(page.getByTestId('proba-sprint-60')).toBeDisabled();
  await page.keyboard.press('l');
  await expect(page.getByTestId('proba-question')).toHaveCount(0);
  await page.locator('[data-pb-scope="6"]').click();   // widening does not help: still no L1 compute card
  await expect(page.getByTestId('proba-empty')).toBeVisible();
  await game(page, 'all');
  await expect(page.getByTestId('proba-learn')).toBeEnabled();
});

test('after 25 cards Learn asks to continue: Enter goes on, Esc ends', async ({ page }) => {
  await hub(page);
  await game(page, 'truefalse');
  await page.keyboard.press('l');
  for (let i = 0; i < 25; i++) { await play(page, true); await page.keyboard.press('Enter'); }
  await expect(page.getByTestId('proba-checkpoint')).toContainText('25 cards done, continue?');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-question')).toBeVisible();
  expect(await subNum(page)).toBe(26);
  for (let i = 0; i < 25; i++) { await play(page, true); await page.keyboard.press('Enter'); }
  await expect(page.getByTestId('proba-checkpoint')).toContainText('50 cards done');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('end-score')).toHaveText('50');
  expect((await rounds(page)).filter((r) => r.mode === 'LEARN')[0].questions).toHaveLength(50);
});

test('the end screen lists missed and hinted cards; Enter goes back to the hub, L learns again', async ({ page }) => {
  await hub(page);
  await game(page, 'truefalse');
  await page.keyboard.press('l');
  const a = await play(page, false);   // missed
  await page.keyboard.press('Enter');
  await page.keyboard.press('h');   // no hint on true/false: nothing happens
  const b = await play(page, true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await expect(page.locator('.end-head .sub')).toContainText('1 of 2 right, 50%');
  const items = page.getByTestId('proba-review').locator('li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toHaveAttribute('data-id', a.id);
  await expect(items.first()).toContainText('Why.');
  await expect(items.first()).toContainText('L1 slides');
  expect(b.id).not.toBe(a.id);
  await jump(page, 500);
  await page.keyboard.press('l');
  await expect(page.getByTestId('proba-question')).toBeVisible();
  await page.keyboard.press('Escape');   // nothing answered: back to the hub, nothing saved
  await expect(page.getByTestId('proba-title')).toBeVisible();
  expect((await rounds(page)).filter((r) => r.mode === 'LEARN')).toHaveLength(1);
});

test('the cheat-sheet button copies the list in the specified format', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } }, configurable: true }); });
  const q = (id, ok) => ({ op: 'pb', id, game: BY[id].game, correct: ok, wrongAttempts: ok ? 0 : 1, timeMs: 3000, hinted: false, t: new Date(2026, 9, 20, 12).getTime(), shown: 'q', answer: 'a', given: 'g' });
  const seeded = [{ id: 'seed1', startedAt: new Date(2026, 9, 20, 12).toISOString(), mode: 'LEARN', score: 1, settings: { lesson: 'proba-learn' },
    questions: [q('L3-geo-var', false), q('L1-cantor', true), q('L2-taxi', true), q('L5-normal-mgf', false)] }];
  await hub(page, { rounds: seeded });
  await page.getByTestId('proba-copy').click();
  await expect(page.getByTestId('proba-copy-status')).toContainText('Copied 1 line');
  const copied = await page.evaluate(() => window.__copied);
  const g = BY['L3-geo-var'];
  expect(copied).toBe('- **[L3 · Law cards]** ' + g.prompt + ' → **' + g.answer + '** — ' + g.explain);   // the raw $…$ source, lecture 5 left out
  await page.locator('[data-pb-scope="6"]').click();
  await page.getByTestId('proba-copy').click();
  await expect(page.getByTestId('proba-copy-status')).toContainText('Copied 2 lines');
  const both = (await page.evaluate(() => window.__copied)).split('\n');
  expect(both).toHaveLength(2);
  expect(both[0].startsWith('- **[L3 · Law cards]**') || both[0].startsWith('- **[L5 · Law cards]**')).toBe(true);
  // nothing to list: no copy
  await page.evaluate(() => { window.AT.data.rounds = []; window.AT.UI.kit.save(); });
  await page.reload();   // a fresh page: nothing copied yet
  await page.getByTestId('proba-copy').click();
  await expect(page.getByTestId('proba-copy-status')).toContainText('Nothing to list yet');
  expect(await page.evaluate(() => window.__copied)).toBeUndefined();
});

test('settings and progress survive a reload; mastery needs 2 right answers in the last 3 days', async ({ page }) => {
  await hub(page);
  await page.locator('[data-pb-scope="6"]').click();
  await page.getByTestId('proba-complements').click();
  await game(page, 'truefalse');
  await page.locator('[data-pb-lec="6"]').click();
  await expect(cell(page, 1, 'truefalse')).toContainText('0 / 2');
  await cell(page, 1, 'truefalse').click();
  for (let i = 0; i < 3; i++) { await play(page, true); await page.keyboard.press('Enter'); }
  await play(page, true);
  await expect(page.getByTestId('proba-result')).toContainText('Right');
  await page.keyboard.press('Escape');
  await jump(page, 500);
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 'truefalse')).toContainText('2 / 2');   // 2 cards, 2 right answers each, no hint, fast
  await page.reload();
  await expect(cell(page, 1, 'truefalse')).toContainText('2 / 2');
  await expect(page.locator('[data-pb-scope="6"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('proba-complements')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-pb-game="truefalse"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-pb-lec="6"]')).toHaveAttribute('aria-pressed', 'false');
  expect((await page.evaluate(() => window.AT.data.settings.proba))).toMatchObject({ scope: 6, complements: true, game: 'truefalse' });
  // the Learn tab counts the same cards
  await page.goto(page.url().replace(/#.*$/, '#learn'));
  await expect(page.getByTestId('learn-lesson-proba')).toContainText('2 of 25 mastered');   // scope 1–6 with complements
});

test('invalid cards in the bank are skipped with a warning, the rest works', async ({ page }) => {
  const warns = [], errors = [];
  page.on('console', (m) => { if (m.type() === 'warning') warns.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'learn/proba', undefined, FX.concat([{ id: 'nope' }, Object.assign({}, FX[0], { id: 'L1-bad-tex', prompt: 'a $\\nosuch$ b' })]));
  await expect(page.locator('.page-head .sub')).toContainText('25 cards');
  await expect(page.locator('.page-head .sub')).toContainText('2 invalid skipped');
  expect(warns.join('\n')).toContain('2 invalid card');
  await page.keyboard.press('l');
  await expect(page.getByTestId('proba-question')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a Probability session alone leaves Stats empty: no day, no mode, no error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await hub(page);
  await game(page, 'truefalse');
  await page.keyboard.press('l');
  await play(page, false);
  await page.keyboard.press('Enter');
  await play(page, true);
  await page.keyboard.press('Escape');
  expect((await rounds(page)).filter((r) => r.mode === 'LEARN')).toHaveLength(1);
  await jump(page, 500);
  await page.goto(page.url().replace(/#.*$/, '#stats'));
  await expect(page.locator('.page-head .sub')).toContainText('No rounds yet');   // Stats counts mental-math practice only
  expect(await page.evaluate(() => window.AT.Stats.sessionDays(window.AT.data.rounds))).toEqual([]);
  expect(errors).toEqual([]);
});

test('on top of a Zetamac history, a Probability session changes nothing in Stats: overview, mode, day', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'stats', { history: true });
  const texts = async () => {
    const out = {};
    for (const hash of ['stats', 'stats/mode/P2', 'stats/day/2026-10-20']) {
      await page.goto(page.url().replace(/#.*$/, '#' + hash));
      await expect(page.locator('main')).not.toBeEmpty();
      out[hash] = await page.evaluate(() => document.querySelector('main').innerText);
    }
    return out;
  };
  const before = await texts();
  expect(before.stats).toContain('Stats');
  await page.evaluate(() => {
    const mk = (d, lesson, ok) => ({ id: 'pbx' + d.getTime(), startedAt: d.toISOString(), mode: 'LEARN', score: 1, settings: { lesson },
      questions: [{ op: 'pb', id: 'L1-cantor', game: 'truefalse', correct: ok, wrongAttempts: ok ? 0 : 1, timeMs: 2000, hinted: false, t: d.getTime(), shown: 'q', answer: 'False', given: 'False' }] });
    const day = (y, m, d, h) => new Date(y, m, d, h);
    [mk(day(2026, 9, 19, 12), 'proba-learn', true), mk(day(2026, 9, 20, 12), 'proba-sprint-60', false), mk(day(2026, 9, 21, 9), 'proba-learn', true), mk(day(2026, 9, 18, 12), 'proba-learn', true)]
      .forEach((r) => window.AT.data.rounds.push(r));
    window.AT.UI.kit.save();
  });
  await page.reload();
  expect(await page.evaluate(() => window.AT.data.rounds.filter((r) => /^proba-/.test(r.settings.lesson || '')).length)).toBe(4);
  expect(await texts()).toEqual(before);
  expect(errors).toEqual([]);
});

for (const [w, h] of [[1366, 768], [390, 844]]) {
  test('layout at ' + w + ': no horizontal scroll on the hub, a question or its feedback; the table scrolls inside its box', async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await hub(page);
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(await fits()).toBe(true);
    await page.locator('[data-pb-scope="6"]').click();
    expect(await fits()).toBe(true);
    await cell(page, 4, 'laws').click();
    expect(await fits()).toBe(true);
    await play(page, false);
    await expect(page.getByTestId('proba-result')).toBeVisible();
    expect(await fits()).toBe(true);
  });
}

for (const scheme of ['light', 'dark']) {
  test('every card renders, in the ' + scheme + ' theme: prompt, choices and explanation drawn as maths, no stray TeX, no console error', async ({ page }) => {
    test.setTimeout(90000);
    const problems = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    await page.emulateMedia({ colorScheme: scheme });
    await hub(page);
    await page.locator('[data-pb-scope="6"]').click();
    await page.getByTestId('proba-complements').click();
    await expect(page.getByTestId('proba-total')).toHaveText('0 / 25');
    await page.keyboard.press('l');
    const seen = new Set();
    for (let i = 0; i < 400 && seen.size < FX.length; i++) {
      if (await page.getByTestId('proba-checkpoint').count()) { await page.keyboard.press('Enter'); continue; }
      const c = await cur(page), card = BY[c.id];
      seen.add(c.id);
      const stray = () => page.evaluate(() => {
        const q = document.querySelector('[data-testid="proba-question"]'), r = document.querySelector('[data-testid="proba-result"]');
        const text = q.innerText + ' ' + (r ? r.innerText : '');
        return { text: /\\[a-zA-Z]|\$/.test(text), hidden: !!document.querySelector('.fq .tex[hidden]') };
      });
      const hasMath = (s) => /\$/.test(s);
      if (hasMath(card.prompt)) await expect(page.locator('#pb-prompt math').first()).toBeVisible();
      if (card.game === 'laws' || card.game === 'formulas' || card.game === 'tool' || card.game === 'statements' || card.game === 'proof') {
        await expect(page.locator('.fq-opts .opt')).toHaveCount(1 + card.distractors.length);
        if ([card.answer].concat(card.distractors).some(hasMath)) await expect(page.locator('.fq-opts .opt math').first()).toBeVisible();
      }
      expect((await stray()).text).toBe(false);
      await play(page, false);   // the feedback shows the explanation
      await expect(page.getByTestId('proba-result')).toBeVisible();
      if (hasMath(card.explain)) await expect(page.getByTestId('proba-explain').locator('math').first()).toBeVisible();
      expect((await stray()).text).toBe(false);
      await page.keyboard.press('Enter');
    }
    expect([...seen].sort()).toEqual(FX.map((c) => c.id).sort());
    expect(problems).toEqual([]);
    // the end screen draws the review in this theme too
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('proba-review').locator('li').first()).toBeVisible();
    expect(problems).toEqual([]);
  });
}
