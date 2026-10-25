// Trick modes: Squares, % and fractions (decimal and fraction answers) and Mixed tricks, outside the steps.
const { test, expect } = require('@playwright/test');
const { openApp, tick, startSelected, answerBox, answerCurrent, solveFraction, rounds } = require('./helpers');

test('the Tricks group is modes 8, 9 and 0', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { name: 'Tricks' })).toBeVisible();
  await page.keyboard.press('8');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Squares');
  await page.keyboard.press('9');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('% and fractions');
  await page.keyboard.press('0');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mixed tricks');
  await expect(page.getByTestId('home-start-button')).toHaveText(/Start Mixed tricks/);
});

test('a Squares round saves trick questions, and D drills its slow ones', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('8');
  await startSelected(page);
  await expect(page.getByTestId('game-question')).toHaveText(/^\d+²$/);
  await answerCurrent(page);
  await tick(page, 6000);            // slow on the second one
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('2');

  const saved = (await rounds(page))[0];
  expect(saved.mode).toBe('SQUARES');
  expect(saved.questions[0]).toMatchObject({ op: 'tr', timeMs: expect.any(Number) });
  expect(saved.questions[0].type).toMatch(/^sq/);

  await tick(page, 500);
  await page.keyboard.press('d');
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).toHaveText(/^\d+²$/);   // the drill stays on squares
  await page.keyboard.press('Escape');
});

test('% and fractions accepts a decimal answer, with or without the leading 0', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('9');
  await startSelected(page);
  const q = page.getByTestId('game-question'), score = page.getByTestId('game-score');
  let decimals = 0;
  for (let i = 1; i <= 40 && decimals < 2; i++) {
    const shown = (await q.textContent()).trim();
    if (/÷/.test(shown)) {
      const [a, b] = shown.split(' ÷ ').map(Number);
      const text = String(a / b);
      // First decimal typed as ".375", the second as "0.375".
      await answerBox(page).pressSequentially(decimals === 0 ? text.slice(1) : text);
      decimals++;
    } else {
      await answerCurrent(page);
    }
    await expect(score).toHaveText('Score: ' + i);
  }
  expect(decimals).toBe(2);
  await page.keyboard.press('Escape');
});

test('trick rounds stay out of the steps', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('0');
  await startSelected(page);
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await tick(page, 500);
  await page.keyboard.press('h');
  await expect(page.getByTestId('home-streak')).toHaveText('□ □ □');
  await expect(page.getByTestId('home-step')).toContainText('no Foundations rounds yet');
});

test('a fraction answer: numerator first, then the denominator, no Enter', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('9');
  await startSelected(page);
  const q = page.getByTestId('game-question'), score = page.getByTestId('game-score');
  const num = page.getByRole('textbox', { name: 'Numerator' }), den = page.getByRole('textbox', { name: 'Denominator' });
  // Answer until a fraction-answer question comes up.
  let shown, fr;
  for (let i = 0; i < 40; i++) {
    shown = (await q.textContent()).trim();
    if ((fr = solveFraction(shown))) break;
    await answerCurrent(page);
  }
  expect(fr).toBeTruthy();
  const before = await score.textContent();
  await expect(den).toBeVisible();
  await expect(num).toBeFocused();

  // A wrong numerator of full length counts once and keeps you on the numerator.
  const wrong = String(fr[0] === 1 ? 2 : fr[0] - 1).padStart(String(fr[0]).length, '1');
  await num.pressSequentially(wrong);
  await expect(num).toBeFocused();
  await num.fill('');
  await num.pressSequentially(String(fr[0]));
  await expect(den).toBeFocused();
  await expect(num).toHaveValue(String(fr[0]));          // the right numerator stays on screen
  await page.keyboard.type(String(fr[1]));
  await expect(score).not.toHaveText(before);
  await expect(q).not.toHaveText(shown);
  // The boxes reset for the next question: two again only if it is a fraction too.
  const next = (await q.textContent()).trim();
  if (solveFraction(next)) { await expect(num).toHaveValue(''); await expect(num).toBeFocused(); }
  else { await expect(answerBox(page)).toHaveValue(''); await expect(answerBox(page)).toBeFocused(); await expect(den).toBeHidden(); }
  await page.keyboard.press('Escape');
});
