// Learn tab: lessons for each trick, untimed practice (method on a miss or Tab, nothing saved), timed rounds.
const { test, expect } = require('@playwright/test');
const { openApp, tick, solve, answerBox, answerCurrent, rounds } = require('./helpers');

test('N opens Learn: every trick has a lesson, grouped, and a lesson has its rule and examples', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('n');
  await expect(page).toHaveURL(/#learn$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learn');
  for (const g of ['Squares', 'Products', 'Percentages', 'Fractions']) await expect(page.getByRole('heading', { name: g, exact: true })).toBeVisible();
  await expect(page.locator('a.lesson')).toHaveCount(15);                  // 14 tricks + fractions by heart
  await expect(page.getByTestId('learn-lesson-x11')).toContainText('Not started');

  // ↓ moves between lessons, Enter opens the focused one.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#learn\/sqmem$/);
  await page.goto(page.url().replace(/#.*/, '#learn/x11'));
  await expect(page.getByTestId('learn-title')).toHaveText('× 11');
  await expect(page.getByRole('heading', { name: 'The rule' })).toBeVisible();
  await expect(page.getByTestId('learn-examples').locator('tr')).toHaveCount(4);   // header + 3 examples
  await page.keyboard.press('n');
  await expect(page).toHaveURL(/#learn$/);
});

test('practice: no clock, the method shows after a miss or Tab, and nothing is saved', async ({ page }) => {
  await openApp(page, 'learn/x11');
  await page.keyboard.press('Enter');
  const q = page.getByTestId('game-question'), method = page.getByTestId('game-method'), timer = page.getByTestId('game-timer');
  await expect(timer).toHaveText('1 / 10');
  await expect(page.getByTestId('game-score')).toHaveText('');
  await expect(method).toBeHidden();

  // 1: right first time.
  await answerCurrent(page);
  await expect(timer).toHaveText('2 / 10');
  // 2: a wrong full-length answer shows the method; the question stays until it is answered.
  let shown = (await q.textContent()).trim();
  const right = String(solve(shown)), wrong = String(solve(shown) + 1);
  await answerBox(page).pressSequentially(wrong);
  await expect(method).toBeVisible();
  await expect(method).toContainText('Times 11');
  await expect(q).toHaveText(shown);
  await answerBox(page).fill('');
  await answerBox(page).pressSequentially(right);
  await expect(timer).toHaveText('3 / 10');
  await expect(method).toBeHidden();
  // 3: Tab shows the method without a wrong answer.
  await page.keyboard.press('Tab');
  await expect(method).toBeVisible();
  await expect(answerBox(page)).toBeFocused();
  for (let i = 3; i <= 10; i++) await answerCurrent(page);

  // The practice end screen: score = right first time without the method.
  await expect(page.getByTestId('end-score')).toHaveText('8');
  await expect(page.getByTestId('practice-helped').locator('tr')).toHaveCount(3);   // header + 2
  expect(await rounds(page)).toHaveLength(0);
  await tick(page, 500);
  await page.keyboard.press('Enter');                                          // practise again
  await expect(timer).toHaveText('1 / 10');
  await page.keyboard.press('Escape');
});

test('timed round: F plays 60 s of one trick, saved as LEARN and named after the trick', async ({ page }) => {
  await openApp(page, 'learn/x25');
  await page.keyboard.press('f');
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).toHaveText(/25/);
  await answerCurrent(page);
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('2');
  await expect(page.locator('.end-head')).toContainText('Learn: × 25');

  const saved = (await rounds(page))[0];
  expect(saved).toMatchObject({ mode: 'LEARN', settings: { types: ['x25'], duration: 60 } });
  await tick(page, 500);
  await page.keyboard.press('n');
  await expect(page.getByTestId('learn-lesson-x25')).toContainText(/Weak|Practised|Improving|Mastered/);
  await page.getByTestId('learn-lesson-x25').click();
  await expect(page.getByRole('heading', { name: 'Your numbers' })).toBeVisible();
  await expect(page.locator('.facts')).toContainText('Timed rounds');
  await page.goto(page.url().replace(/#.*/, '#stats/log'));
  await expect(page.locator('#pane-log').getByRole('heading', { name: 'Learn: × 25' })).toBeVisible();   // listed in the Log
});

// Fractions by heart, solved independently of the app: "3/7" → a decimal (cut off to 3 places when it
// repeats, the form the app accepts besides the rounded one), "0.429…" → [3, 7].
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const terminates = (d) => { while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; };
function heartAnswer(shown) {
  let m;
  if ((m = /^(\d+)\/(\d+)$/.exec(shown))) {
    const n = +m[1], d = +m[2];
    return { decimal: terminates(d) ? String(Number((n / d).toFixed(6))) : (Math.floor(n * 1000 / d) / 1000).toFixed(3) };
  }
  for (let d = 2; d <= 25; d++) for (let n = 1; n < d; n++) {
    if (gcd(n, d) !== 1) continue;
    const text = terminates(d) ? String(Number((n / d).toFixed(6))) : (n / d).toFixed(3) + '…';
    if (text === shown) return { frac: [n, d] };
  }
  throw new Error('Cannot solve ' + shown);
}
async function answerHeart(page) {
  const shown = (await page.getByTestId('game-question').textContent()).trim();
  const a = heartAnswer(shown);
  if (a.decimal) await answerBox(page).pressSequentially(a.decimal);
  else {
    await page.getByRole('textbox', { name: 'Numerator' }).pressSequentially(String(a.frac[0]));
    await expect(page.getByRole('textbox', { name: 'Denominator' })).toBeFocused();
    await page.keyboard.type(String(a.frac[1]));
  }
  return shown;
}

test('fractions by heart: the grid shows all 49 pairs, practice works both ways and accepts the cut-off decimal', async ({ page }) => {
  await openApp(page, 'learn');
  await expect(page.getByTestId('learn-lesson-fractions')).toContainText('Not started');
  await page.getByTestId('learn-lesson-fractions').click();
  await expect(page.getByTestId('learn-title')).toHaveText('Fractions by heart');
  const grid = page.getByTestId('fraction-grid');
  await expect(grid.locator('td:not(:empty)')).toHaveCount(49);
  await expect(grid.locator('td.un')).toHaveCount(49);                     // nothing seen yet
  await expect(grid).toContainText('0.429…');

  await page.keyboard.press('Enter');
  const kinds = new Set();
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByTestId('game-timer')).toHaveText(i + ' / 10');
    const shown = await answerHeart(page);
    kinds.add(/\//.test(shown) ? 'fd' : 'df');
  }
  expect(kinds.size).toBe(2);                                              // both directions came up
  await expect(page.getByTestId('end-score')).toHaveText('10');
  expect(await rounds(page)).toHaveLength(0);
});

test('fractions by heart: a timed round is saved as LEARN fractions and fills the grid', async ({ page }) => {
  await openApp(page, 'learn/fractions');
  await page.keyboard.press('f');
  await tick(page, 3100);
  await answerHeart(page);
  await answerHeart(page);
  await answerHeart(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('3');
  await expect(page.locator('.end-head')).toContainText('Learn: fractions by heart');
  const saved = (await rounds(page))[0];
  expect(saved).toMatchObject({ mode: 'LEARN', settings: { types: ['fd', 'df'], lesson: 'fractions', duration: 60 } });
  expect(saved.questions.slice(0, 3).every((q) => q.type === 'fd' || q.type === 'df')).toBe(true);

  await tick(page, 500);
  await page.keyboard.press('n');
  await page.getByTestId('learn-lesson-fractions').click();
  await expect(page.getByTestId('fraction-grid').locator('td.un')).not.toHaveCount(49);
  await expect(page.locator('.facts')).toContainText('Timed rounds');
});
