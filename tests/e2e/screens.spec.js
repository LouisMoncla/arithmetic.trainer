// Home, Review, Stats (its sections and old links) and keyboard navigation.
const { test, expect } = require('@playwright/test');
const { NOW, openApp, tick, startSelected, answerCurrent, dayKey } = require('./helpers');

test('home: the hero follows the selected mode, and Enter starts it', async ({ page }) => {
  await openApp(page);
  // First visit of the day: Tables is suggested as the warm-up.
  await expect(page.getByRole('region', { name: 'Tables' }).getByText('Warm up first')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tables');

  await page.keyboard.press('3');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Speed');
  await expect(page.getByTestId('home-start-button')).toHaveText(/Start Speed/);
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Interview-ready');
  await expect(page.getByRole('button', { name: /Interview-ready/, pressed: true })).toBeVisible();

  await startSelected(page);
  await expect(page.getByTestId('game-timer')).toHaveText('2:00');   // a 120-second round
  await tick(page, 10000);
  await expect(page.getByTestId('game-timer')).toHaveText('1:50');
  await page.keyboard.press('Escape');
});

test('home: the step block shows the step, its rule and the streak', async ({ page }) => {
  await openApp(page);
  const step = page.getByTestId('home-step');
  await expect(step.getByRole('heading', { name: 'Step 1: Foundations' })).toBeVisible();
  await expect(step).toContainText('Average 18 or more in Foundations, 3 days in a row.');
  await expect(page.getByTestId('home-streak')).toHaveText('□ □ □');
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
  await expect(page.getByTestId('home-start-button')).toBeVisible();
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

test('home: one recommendation, and no backup reminder before there is much to lose', async ({ page }) => {
  await openApp(page, null, { history: true });   // 8 zetamac rounds
  await expect(page.getByText('Warm up first, then Foundations')).toBeVisible();
  await expect(page.locator('.mode .tag:not(:empty)')).toHaveCount(1);
  await expect(page.getByText(/no backup yet/)).toHaveCount(0);
});
