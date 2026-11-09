// Home, Review, Stats (its sections and old links) and keyboard navigation.
const { test, expect } = require('@playwright/test');
const { NOW, openApp, tick, startSelected, answerCurrent, dayKey } = require('./helpers');

test('the site opens on Road to 60; a new user gets the explanation, not empty numbers', async ({ page }) => {
  await openApp(page, null);
  await expect(page).not.toHaveURL(/#/);
  await expect(page.getByTestId('road-title')).toHaveText('Today’s session');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Road to 60' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('road-intro')).toContainText('60 or more is a strong score');
  await expect(page.getByTestId('stat-road-estimate')).toHaveCount(0);
  await expect(page.getByTestId('road-milestones')).toHaveCount(0);
  await expect(page.locator('nav a')).toHaveText(['Road to 60', 'Play', 'Learn', 'Review', 'Finance', 'Stats', 'Settings']);
});

test('play: only the modes, no recommendation; number keys and arrows choose, Enter starts', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Play');
  await expect(page.locator('.mode .tag:not(:empty)')).toHaveCount(0);
  await expect(page.getByText(/Warm up first|Recommended|Step 1/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Tables/, pressed: true })).toBeVisible();   // row 1 selected

  await page.keyboard.press('3');
  await expect(page.getByRole('button', { name: /Speed/, pressed: true })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: /Interview-ready/, pressed: true })).toBeVisible();

  await startSelected(page);
  await expect(page.getByTestId('game-timer')).toHaveText('2:00');   // a 120-second round
  await tick(page, 10000);
  await expect(page.getByTestId('game-timer')).toHaveText('1:50');
  await page.keyboard.press('Escape');
});

test('play: a click starts the mode; Matrices is the last row', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('play-matrices')).toContainText('Matrices');
  await expect(page.locator('[data-testid="play-modes"] .mode').last()).toHaveAttribute('data-testid', 'play-matrices');
  await page.locator('.mode[data-mode="P3"]').click();
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).not.toHaveText(/^[123]$/);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-modes')).toBeVisible();
  await page.getByTestId('play-matrices').click();
  await expect(page).toHaveURL(/#matrices$/);
});

// Yesterday's Tables round answering `count` grid facts twice each (× pairs first, then ÷).
function tablesHistory(count) {
  const facts = [];
  for (let a = 2; a <= 12; a++) for (let b = a; b <= 12; b++) facts.push(['mul', a, b]);
  for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) facts.push(['div', a, b]);
  const questions = [];
  facts.slice(0, count).forEach(([op, a, b]) => questions.push({ op, a, b, timeMs: 1500, wrongAttempts: 0 }, { op, a, b, timeMs: 1500, wrongAttempts: 0 }));
  return [{ id: 'seed-tables', startedAt: new Date(NOW.getTime() - 86400000).toISOString(), mode: 'TABLES', score: 30, settings: { duration: 60 }, questions }];
}
const savedModes = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('arithmeticTrainer.v1')).rounds.map((r) => r.mode));

test('play: Tables is row 1 until 150 of 187 table facts are measured', async ({ page }) => {
  await openApp(page, 'play', { rounds: tablesHistory(149) });
  await expect(page.locator('.mode[data-mode="TABLES"] .k')).toHaveText('1');
  await expect(page.locator('.mode[data-mode="WTABLES"]')).toHaveCount(0);
  await expect(page.getByTestId('play-plain-tables')).toHaveCount(0);
});

test('play: then Weighted tables takes row 1, plain Tables moves to T', async ({ page }) => {
  await openApp(page, 'play', { rounds: tablesHistory(150) });
  await expect(page.locator('.mode[data-mode="WTABLES"] .k')).toHaveText('1');
  await expect(page.getByTestId('play-plain-tables').locator('.k')).toHaveText('T');
  await expect(page.locator('.mode[data-mode="TABLES"]')).toHaveCount(1);
  await expect(page.locator('button.mode .k').last()).toHaveText('0');

  // Enter plays Weighted tables
  await startSelected(page);
  await expect(page.getByTestId('game-question')).toHaveText(/^\d+ [×÷] \d+$/);
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  expect((await savedModes(page)).pop()).toBe('WTABLES');
});

test('play: T plays plain Tables once Weighted tables holds row 1', async ({ page }) => {
  await openApp(page, 'play', { rounds: tablesHistory(150) });
  await page.keyboard.press('t');
  await tick(page, 3100);
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  expect((await savedModes(page)).pop()).toBe('TABLES');
});

test('play: the plain Tables row starts a plain round', async ({ page }) => {
  await openApp(page, 'play', { rounds: tablesHistory(187) });
  await page.getByTestId('play-plain-tables').click();
  await tick(page, 3100);
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  expect((await savedModes(page)).pop()).toBe('TABLES');
});

test('review: V cycles the heatmap views and the URL follows', async ({ page }) => {
  await openApp(page, 'review');
  await expect(page.getByRole('button', { name: 'Combined', pressed: true })).toBeVisible();
  await page.keyboard.press('v');
  await expect(page.getByRole('button', { name: 'Multiplication', pressed: true })).toBeVisible();
  await expect(page).toHaveURL(/#review\/mul$/);
  await page.keyboard.press('v');
  await expect(page).toHaveURL(/#review\/div$/);
  await expect(page.getByTestId('heatmap-cell-div-7-8')).toHaveAttribute('aria-label', /^56 ÷ 7 = 8/);

  // The view is deep-linkable.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Division', pressed: true })).toBeVisible();
});

test('review: W starts weighted tables', async ({ page }) => {
  await openApp(page, 'review');
  await page.keyboard.press('w');
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).toHaveText(/^\d+ [×÷] \d+$/);
  await page.keyboard.press('Escape');
});

test('today: deep link (old session link too), arrow keys, and A from the end screen', async ({ page }) => {
  const yesterday = new Date(NOW); yesterday.setDate(NOW.getDate() - 1);
  await openApp(page, 'session/' + dayKey(yesterday), { history: true });
  await expect(page.getByTestId('day-title')).toHaveText('Day 1 of practice');
  await expect(page).toHaveURL(new RegExp('#stats/day/' + dayKey(yesterday) + '$'));
  await expect(page.getByTestId('day-scores')).toContainText('Interview-ready');

  // Play one round today, then jump to today's analysis with A.
  await page.keyboard.press('p');
  // The play screen renders on hashchange; keys sent before that still go to the session screen.
  await expect(page).toHaveURL(/#play$/);
  await expect(page.getByTestId('play-modes')).toBeVisible();
  await page.keyboard.press('1');
  await startSelected(page);
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await tick(page, 500);
  await page.keyboard.press('a');
  await expect(page).toHaveURL(new RegExp('#stats/day/' + dayKey(NOW) + '$'));
  await expect(page.getByTestId('day-title')).toHaveText('Day 2 of practice');

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('day-title')).toHaveText('Day 1 of practice');
  await expect(page).toHaveURL(new RegExp('#stats/day/' + dayKey(yesterday) + '$'));
});

test('keyboard: the skip link comes first and moves focus to the content', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page).not.toHaveURL(/#main/);
});

test('keyboard: ? opens the shortcut list and Esc closes it', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('stats: sections open on click, show a line while closed, and stay open next time', async ({ page }) => {
  await openApp(page, 'stats', { history: true });
  const session = page.getByTestId('stats-day'), progress = page.getByTestId('stats-progress');
  await expect(session).toHaveAttribute('open', '');                  // open by default
  await expect(progress).not.toHaveAttribute('open', '');
  await expect(progress.locator('summary')).toContainText('Foundations: no rounds yet, target 18');  // the closed line
  await expect(progress.getByText('One point per day you played')).toBeHidden();

  await progress.getByRole('heading', { name: 'Progress' }).click();
  await expect(progress.getByText(/One point per day you played/)).toBeVisible();
  await session.getByRole('heading', { name: 'Today', exact: true }).click();
  await expect(session).not.toHaveAttribute('open', '');
  // The open sections are saved on the toggle event, which fires after the click.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('arithmeticTrainer.statsOpen'))).toBe('["progress"]');

  await page.reload();
  await expect(progress).toHaveAttribute('open', '');
  await expect(session).not.toHaveAttribute('open', '');
});

test('stats: old links and keys open their section', async ({ page }) => {
  await openApp(page, 'log');
  await expect(page).toHaveURL(/#stats\/log$/);
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Stats' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('stats-log')).toHaveAttribute('open', '');
  await expect(page.getByLabel('Scores, separated by commas')).toBeVisible();

  await page.keyboard.press('p');
  await expect(page).toHaveURL(/#play$/);
  await page.keyboard.press('g');
  await expect(page).toHaveURL(/#stats\/progress$/);
  await expect(page.getByTestId('stats-progress')).toHaveAttribute('open', '');

  // Review was a Stats section for a while; those links go to its own tab.
  await page.goto(page.url().replace(/#.*$/, '#stats/review/div'));
  await expect(page).toHaveURL(/#review\/div$/);
  await expect(page.getByRole('button', { name: 'Division', pressed: true })).toBeVisible();
  await page.keyboard.press('p');
  await expect(page).toHaveURL(/#play$/);
  await page.keyboard.press('r');
  await expect(page).toHaveURL(/#review$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();
});

test('play: no backup reminder before there is much to lose', async ({ page }) => {
  await openApp(page, 'play', { history: true });   // 8 zetamac rounds
  await expect(page.getByTestId('play-modes')).toBeVisible();
  await expect(page.getByText(/no backup yet/)).toHaveCount(0);
});

test('phone width: every tab is on screen, the nav does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of ['Road to 60', 'Play', 'Learn', 'Review', 'Finance', 'Stats', 'Settings']) {
    await expect(nav.getByRole('link', { name })).toBeInViewport({ ratio: 1 });
  }
});
