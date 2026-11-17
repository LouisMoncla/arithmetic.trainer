// Finance, Superday upgrade: the teaching card (Practice, sprint pause, end screen), speed against target, mistake tags
// and their override, the Method sheet (and print), progress by topic, thin-space numbers, light and dark layouts.
const { test, expect } = require('@playwright/test');
const { openApp, tick, rounds, endRound } = require('./helpers');
const F = require('../../js/finance-bank.js');
require('../../js/finance-sd1.js'); require('../../js/finance-sd2.js'); require('../../js/finance-meta.js');
const T = require('../../js/finance-tags.js');

const box = (page) => page.getByTestId('finance-answer');
const THIN = ' ';

async function wrongPractice(page, tpl, seed, typed) {
  await openApp(page, 'finance/q/' + tpl + '/' + seed);
  await box(page).fill(String(typed));
  await box(page).press('Enter');
  await expect(page.getByTestId('finance-card')).toBeVisible();
}

test('a wrong answer shows the card: formula, legend table, substitution, answer, shortcut, your mistake, time against target', async ({ page }) => {
  const q = F.make('bank.cet1', 12345);
  await wrongPractice(page, 'bank.cet1', 12345, q.p.R / q.p.C * 100);   // the ratio upside down
  const card = page.getByTestId('finance-card');
  await expect(card.getByTestId('card-recap')).toContainText('CET1 capital');
  await expect(card.getByTestId('card-formula').locator('math')).toBeVisible();
  const legend = card.getByTestId('card-legend');
  await expect(legend.locator('th')).toHaveText(['Symbol', 'What it is', 'Here']);
  expect(await legend.locator('tr').count()).toBeGreaterThanOrEqual(3);
  await expect(legend).toContainText(q.p.C + 'bn');
  await expect(legend).toContainText(q.p.R + 'bn');
  await expect(card.getByTestId('card-steps').locator('li').first()).toBeVisible();
  const ans = card.getByTestId('card-answer');
  await expect(ans).toContainText('The answer is');
  const bg = await ans.locator('.fc-hl').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');   // highlighted
  await expect(card.getByTestId('card-shortcut')).toContainText('Capital on top');
  await expect(card.getByTestId('card-tag')).toHaveText('Ratio upside down');
  await expect(card.getByTestId('card-mistake')).toContainText('You divided RWA by CET1');
  await expect(page.getByTestId('finance-time').first()).toContainText(/\d+\.\d s \/ target 15 s/);
  for (const name of [/Try a new one/, /Next/, /Report a mistake/]) await expect(page.getByTestId('finance-result').getByText(name).first()).toBeVisible();
});

test('S tries a new one of the same type; 1–7 corrects the mistake type and the round saves the choice', async ({ page }) => {
  const q = F.make('bank.cet1', 12345);
  await wrongPractice(page, 'bank.cet1', 12345, q.p.R / q.p.C * 100);
  await page.keyboard.press('5');   // Sign
  await expect(page.getByTestId('card-tag')).toHaveText('Sign');
  await expect(page.getByTestId('card-tag-SIGN')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('card-tag-UNIT').click();
  await expect(page.getByTestId('card-tag')).toHaveText('Unit or scale');
  await page.keyboard.press('s');
  await expect(page.getByTestId('finance-card')).toHaveCount(0);
  await expect(page.getByTestId('finance-question')).toContainText('CET1 capital');
  await page.keyboard.press('Escape');
  const last = (await rounds(page)).at(-1);
  expect(last.questions[0]).toMatchObject({ tpl: 'bank.cet1', correct: false, tag: 'UNIT', tagBy: 'user' });
  // the end screen: speed per topic and the card inside the missed question
  await expect(page.getByTestId('finance-by-topic')).toContainText('Within target');
  const all = page.getByTestId('end-all-questions');
  await all.locator('summary').first().click();
  await expect(all.getByTestId('finance-card').first()).toBeVisible();
  await expect(all.getByTestId('card-tag').first()).toHaveText('Unit or scale');
});

test('sprint: H shows the same card with the legend, and what you typed is read as a mistake', async ({ page }) => {
  await openApp(page, 'finance');
  await page.getByTestId('finance-fam-arith').click();
  await page.getByTestId('finance-topic').selectOption('Bank ratios');
  await page.getByTestId('finance-start-button').click();
  await tick(page, 3100);
  const input = page.getByRole('textbox', { name: 'Answer' });
  await input.pressSequentially('1');
  await page.keyboard.press('Enter');
  await page.keyboard.press('h');
  const panel = page.getByTestId('game-learn-panel');
  await expect(panel.getByTestId('card-legend')).toBeVisible();
  await expect(panel.getByTestId('card-formula').locator('math')).toBeVisible();
  await expect(panel.getByTestId('card-mistake')).toContainText('You answered');
  await expect(panel).toContainText('The answer is');
  await page.keyboard.press('Enter');
  await expect(panel).toBeHidden();
});

test('Method sheet: M opens it, one printable card per question type, topic filter, Esc goes back', async ({ page }) => {
  await openApp(page, 'finance');
  await page.keyboard.press('m');
  await expect(page).toHaveURL(/#finance\/method$/);
  const cards = page.getByTestId('method-card');
  expect(await cards.count()).toBeGreaterThan(80);
  await page.getByTestId('method-topic').selectOption('Options');
  const n = await cards.count();
  expect(n).toBeGreaterThanOrEqual(7);
  expect(n).toBeLessThan(15);
  const first = cards.first();
  await expect(first.locator('math').first()).toBeVisible();
  await expect(first).toContainText('Shortcut');
  await expect(first).toContainText('Common mistake');
  await expect(first).toContainText('Example');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('header.top')).toBeHidden();
  await expect(page.getByTestId('method-print')).toBeHidden();
  await expect(first).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#finance$/);
  await expect(page.getByTestId('finance-method-button')).toBeVisible();
});

test('Progress: one row per topic, weakest first, with median against target and the top mistakes', async ({ page }) => {
  const q = F.make('bank.cet1', 12345), r = F.make('bank.roe', 7);
  await openApp(page, 'finance/q/bank.cet1/12345');
  await box(page).fill(String(q.p.R / q.p.C * 100)); await box(page).press('Enter');
  await page.keyboard.press('p');        // leave for Play: the session is saved on the way out
  await expect(page.getByTestId('play-modes')).toBeVisible();
  await page.keyboard.press('q');
  await expect(page.getByTestId('finance-start-button')).toBeVisible();
  const prog = page.getByTestId('finance-progress');
  await expect(prog.getByTestId('finance-top-tags')).toContainText('Ratio upside down 1');
  const tbl = page.getByTestId('finance-topic-accuracy');
  await expect(tbl.locator('th').nth(3)).toHaveText('Median time');
  await expect(tbl.locator('tr').nth(1)).toContainText('Bank ratios');
  await expect(tbl.locator('tr').nth(1)).toContainText(/target 15 s/);
  await expect(tbl.locator('tr').nth(1)).toContainText('Ratio upside down 1');
  expect(r.answer).toBeGreaterThan(0);
});

test('numbers of 10 000 or more get thin spaces on screen, never in what is saved', async ({ page }) => {
  let seed = 1;
  while (Math.abs(F.make('units.bp.pnl', seed).answer) < 1e4) seed++;
  const q = F.make('units.bp.pnl', seed);
  await wrongPractice(page, 'units.bp.pnl', seed, q.answer * 100);
  const text = await page.getByTestId('finance-result').innerText();
  expect(text).toContain(THIN);
  await expect(page.getByTestId('card-answer')).toContainText(String(q.answer).replace(/\B(?=(\d{3})+$)/g, THIN));
  await expect(box(page)).not.toHaveValue(new RegExp(THIN));
  await page.keyboard.press('Escape');
  const saved = (await rounds(page)).at(-1).questions[0];
  expect(saved.answer).not.toContain(THIN);
  expect(saved.shown).not.toContain(THIN);
});

for (const scheme of ['light', 'dark']) {
  for (const [w, h] of [[390, 844], [1100, 700]]) {
    test(`card and Method sheet fit at ${w} px in ${scheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.emulateMedia({ colorScheme: scheme });
      const q = F.make('fin.var.port2', 12345);
      await wrongPractice(page, 'fin.var.port2', 12345, q.answer * 3);
      const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      expect(await fits()).toBe(true);
      await expect(page.getByTestId('card-legend')).toBeVisible();
      await page.keyboard.press('Escape');
      await openApp(page, 'finance/method');
      await expect(page.getByTestId('method-card').first()).toBeVisible();
      expect(await fits()).toBe(true);
    });
  }
}

test('the tag detector agrees with the engine (spot check)', () => {
  const q = F.make('fx.usd.eur', 3);
  expect(T.detect({ tpl: 'fx.usd.eur', p: q.p, answer: q.answer, target: 15 }, q.p.U * q.p.s, 4000)).toBe('FX_DIRECTION');
});
