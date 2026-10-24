// Home, Review, Session and keyboard navigation.
const { test, expect } = require('@playwright/test');
const { NOW, openApp, tick, startSelected, answerCurrent, dayKey } = require('./helpers');

test('home: the hero follows the selected mode, and Enter starts it', async ({ page }) => {
  await openApp(page);
  // First visit of the day: Tables is suggested as the warm-up.
  await expect(page.getByRole('region', { name: 'Tables' }).getByText('Warm up first')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tables');

  await page.keyboard.press('3');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('P3');
  await expect(page.getByTestId('home-start-button')).toHaveText(/Start P3/);
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Normal 120 s');
  await expect(page.getByRole('button', { name: /Normal 120 s/, pressed: true })).toBeVisible();

  await startSelected(page);
  await expect(page.getByTestId('game-timer')).toHaveText('2:00');   // a 120-second round
  await tick(page, 10000);
  await expect(page.getByTestId('game-timer')).toHaveText('1:50');
  await page.keyboard.press('Escape');
});

test('home: the step block shows the step, its rule and the streak', async ({ page }) => {
  await openApp(page);
  const step = page.getByTestId('home-step');
  await expect(step.getByRole('heading', { name: 'Step P2' })).toBeVisible();
  await expect(step).toContainText('Average 18 or more in P2, 3 sessions in a row.');
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

test('session: deep link, arrow keys, and A from the end screen', async ({ page }) => {
  const yesterday = new Date(NOW); yesterday.setDate(NOW.getDate() - 1);
  await openApp(page, 'session/' + dayKey(yesterday), { history: true });
  await expect(page.getByTestId('session-title')).toHaveText('Session 1');
  await expect(page.getByTestId('session-scores')).toContainText('Normal 120 s');

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
  await expect(page).toHaveURL(new RegExp('#session/' + dayKey(NOW) + '$'));
  await expect(page.getByTestId('session-title')).toHaveText('Session 2');

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('session-title')).toHaveText('Session 1');
  await expect(page).toHaveURL(new RegExp('#session/' + dayKey(yesterday) + '$'));
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
