// The play loop: the highest-risk behaviour, since every saved statistic comes from it.
const { test, expect } = require('@playwright/test');
const { openApp, tick, solve, startSelected, answerBox, answerCurrent, rounds } = require('./helpers');

test.describe('Zetamac round', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('1'); // Tables
    await startSelected(page);
  });

  test('accepts a correct answer as soon as it is typed, without Enter', async ({ page }) => {
    const first = await answerCurrent(page);
    await expect(page.getByTestId('game-score')).toHaveText('Score: 1');
    await expect(answerBox(page)).toHaveValue('');
    await expect(page.getByTestId('game-question')).not.toHaveText(first);
  });

  test('counts one wrong attempt per distinct full-length wrong value', async ({ page }) => {
    const shown = (await page.getByTestId('game-question').textContent()).trim();
    const right = String(solve(shown));
    const wrongA = right.length === 1 ? (right === '9' ? '8' : '9') : '9'.repeat(right.length);
    const wrongB = right.length === 1 ? (right === '7' ? '6' : '7') : '8'.repeat(right.length);
    const box = answerBox(page);
    await box.fill(wrongA);
    await box.fill('');
    await box.fill(wrongA);   // same wrong value again: not counted twice
    await box.fill('');
    await box.fill(wrongB);   // a different wrong value: counted
    await box.fill('');
    await box.pressSequentially(right);
    await expect(page.getByTestId('game-score')).toHaveText('Score: 1');
    await tick(page, 61000);
    await expect(page.getByTestId('end-score')).toBeVisible();
    const last = (await rounds(page)).at(-1);
    expect(last.questions[0].shown).toBe(shown);
    expect(last.questions[0].wrongAttempts).toBe(2);
  });

  test('when time runs out the round is saved with the unanswered question', async ({ page }) => {
    await answerCurrent(page);
    await expect(page.getByTestId('game-score')).toHaveText('Score: 1');
    await answerCurrent(page);
    await expect(page.getByTestId('game-score')).toHaveText('Score: 2');
    await tick(page, 61000);

    await expect(page.getByTestId('end-score')).toHaveText('2');
    await expect(page.getByRole('button', { name: /Play again/ })).toBeVisible();
    const last = (await rounds(page)).at(-1);
    expect(last.mode).toBe('TABLES');
    expect(last.score).toBe(2);
    expect(last.questions).toHaveLength(3);
    expect(last.questions[2].unanswered).toBe(true);

    // It survives a reload (localStorage).
    await page.reload();
    expect((await rounds(page)).at(-1).id).toBe(last.id);
  });

  test('Esc stops the round and saves nothing', async ({ page }) => {
    const before = (await rounds(page)).length;
    await answerCurrent(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('home-start-button')).toBeVisible();
    expect((await rounds(page)).length).toBe(before);
  });

  test('Enter on the end screen plays again with the same mode', async ({ page }) => {
    await tick(page, 61000);
    await expect(page.getByTestId('end-score')).toBeVisible();
    await tick(page, 500); // keys are ignored for 400 ms after time runs out
    await page.keyboard.press('Enter');
    await tick(page, 3100);
    await expect(page.getByTestId('game-question')).toBeVisible();
    await page.keyboard.press('Escape');
  });
});

test.describe('Interview round', () => {
  test('Enter submits, Tab skips, and a wrong answer costs the penalty', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('6');
    await expect(page.getByRole('heading', { level: 1, name: 'Interview' })).toBeVisible();
    await startSelected(page);

    await expect(page.getByTestId('game-count')).toHaveText('1 / 80');
    await answerBox(page).fill('0');          // never a correct interview answer
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('game-score')).toHaveText('Score: -1');
    await expect(page.getByTestId('game-count')).toHaveText('2 / 80');

    await page.keyboard.press('Tab');          // skip: no points either way
    await expect(page.getByTestId('game-count')).toHaveText('3 / 80');
    await expect(page.getByTestId('game-score')).toHaveText('Score: -1');
    await page.keyboard.press('Escape');
  });
});
