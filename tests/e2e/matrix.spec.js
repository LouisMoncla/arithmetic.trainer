// Matrices tab: 2 × 2 products with four answer boxes. Space moves to the next box, arrows move
// anywhere, a matrix is accepted as soon as all four entries are right, Enter outlines wrong entries.
const { test, expect } = require('@playwright/test');
const { openApp, tick, rounds } = require('./helpers');

// Read A and B from the screen ("−3" uses a typographic minus) and return the product, row-major.
async function product(page) {
  const read = async (id) => (await page.getByTestId(id).locator('span').allTextContents()).map((t) => Number(t.replace('−', '-')));
  const a = await read('game-matrix-a'), b = await read('game-matrix-b');
  return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
}
const cell = (page, i) => page.getByTestId('game-cell-' + i);

async function start(page) {
  await page.keyboard.press('Enter');
  await tick(page, 3100);   // 3-2-1 countdown
  await expect(page.getByTestId('game-matrix-a')).toBeVisible();
}

test('X opens Matrices; options are toggles that persist', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('x');
  await expect(page).toHaveURL(/#matrices$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Matrices');
  await expect(page.getByRole('navigation', { name: 'Main' }).locator('[aria-current]')).toHaveCount(0);   // no tab of its own; it is the last row of Play
  // default: integers, −9 to 9
  await expect(page.getByTestId('matrix-set-Z')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('matrix-max-9')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('matrix-max-9')).toHaveText('−9 to 9');
  await page.getByTestId('matrix-set-N').click();
  await expect(page.getByTestId('matrix-max-9')).toHaveText('0 to 9');
  await page.getByTestId('matrix-set-Z').click();
  await page.getByTestId('matrix-max-12').click();
  await page.getByTestId('matrix-duration-120').click();
  await page.reload();
  await expect(page.getByTestId('matrix-set-Z')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('matrix-max-12')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('matrix-duration-120')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('matrix-rounds')).toContainText('Matrices, −12 to 12, 120 s');
});

test('Space moves to the next entry and all four right entries are accepted', async ({ page }) => {
  await openApp(page, 'matrices');
  await start(page);
  const c = await product(page);
  await expect(cell(page, 0)).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.type(String(c[i]));
    if (i < 3) { await page.keyboard.press(' '); await expect(cell(page, i + 1)).toBeFocused(); }
  }
  await expect(page.getByTestId('game-score')).toHaveText('Score: 1');
  await expect(cell(page, 0)).toBeFocused();   // the next matrix starts at the top left
  await expect(cell(page, 3)).toHaveValue('');
});

test('arrows move anywhere in the grid; entries can be typed in any order', async ({ page }) => {
  await openApp(page, 'matrices');
  await start(page);
  await page.keyboard.press('ArrowRight'); await expect(cell(page, 1)).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(cell(page, 3)).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(cell(page, 2)).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(cell(page, 0)).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(cell(page, 1)).toBeFocused();   // wraps in the row
  await page.keyboard.press(' '); await page.keyboard.press(' '); await page.keyboard.press(' ');
  await expect(cell(page, 0)).toBeFocused();   // Space wraps from the last entry to the first
  const c = await product(page);
  // bottom row first, then the top row
  await page.keyboard.press('ArrowDown'); await page.keyboard.type(String(c[2]));
  await page.keyboard.press('ArrowRight'); await page.keyboard.type(String(c[3]));
  await page.keyboard.press('ArrowUp'); await page.keyboard.type(String(c[1]));
  await page.keyboard.press('ArrowLeft'); await page.keyboard.type(String(c[0]));
  await expect(page.getByTestId('game-score')).toHaveText('Score: 1');
});

test('Enter outlines a wrong entry until it is edited; wrong attempts are saved', async ({ page }) => {
  await openApp(page, 'matrices');
  await start(page);
  const c = await product(page);
  await page.keyboard.type(String(c[0] + 1));   // wrong
  await page.keyboard.press(' ');
  await page.keyboard.type(String(c[1]));      // right
  await page.keyboard.press('Enter');
  await expect(cell(page, 0)).toHaveClass(/bad/);
  await expect(cell(page, 1)).not.toHaveClass(/bad/);
  await page.keyboard.press('ArrowLeft');
  await expect(cell(page, 0)).toBeFocused();
  await page.keyboard.type(String(c[0]));       // focus selected the old value, so typing replaces it
  await expect(cell(page, 0)).not.toHaveClass(/bad/);
  await page.keyboard.press('ArrowDown'); await page.keyboard.type(String(c[2]));
  await page.keyboard.press(' '); await page.keyboard.type(String(c[3]));
  await expect(page.getByTestId('game-score')).toHaveText('Score: 1');
  await page.keyboard.press('Tab');   // skip the next one
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await expect(page.locator('.end-head')).toContainText('Matrices, −9 to 9, 60 s');
  const last = (await rounds(page)).at(-1);
  expect(last.mode).toBe('MATRIX');
  expect(last.settings).toMatchObject({ lo: -9, hi: 9, duration: 60 });
  expect(last.questions[0].op).toBe('mx');
  expect(last.questions[0].wrongAttempts).toBe(1);
  expect(last.questions[1].skipped).toBe(true);
});

test('negative entries take a minus sign; the round shows in Stats, Log', async ({ page }) => {
  await openApp(page, 'matrices');   // default range −9 to 9
  await start(page);
  let solved = 0;
  // Play until a product has a negative entry, so the minus sign is really typed.
  for (let k = 0; k < 20 && solved < 3; k++) {
    const c = await product(page);
    for (let i = 0; i < 4; i++) { await page.keyboard.type(String(c[i])); if (i < 3) await page.keyboard.press(' '); }
    solved++;
    await expect(page.getByTestId('game-score')).toHaveText('Score: ' + solved);
  }
  await cell(page, 0).pressSequentially('a-5-');
  await expect(cell(page, 0)).toHaveValue('-5');   // letters dropped, one leading minus kept
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText(String(solved));
  await page.keyboard.press('l');
  await expect(page.locator('#pane-log').getByRole('heading', { name: 'Matrices, −9 to 9, 60 s' })).toBeVisible();
});

test('Custom range: From and To, checked, remembered, and used for every entry', async ({ page }) => {
  await openApp(page, 'matrices');
  await page.getByTestId('matrix-max-custom').click();
  await expect(page.getByTestId('matrix-set-Z')).toHaveCount(0);   // the range says it all
  await page.getByTestId('matrix-mx-lo').fill('5');
  await page.getByTestId('matrix-mx-hi').fill('2');
  await page.getByTestId('matrix-mx-hi').press('Enter');
  await expect(page.locator('#mx-err')).toHaveText('Choose From below To, both between −99 and 99.');
  await expect(page.getByTestId('matrix-start-button')).toBeDisabled();
  await page.getByTestId('matrix-mx-lo').fill('-3');
  await page.getByTestId('matrix-mx-lo').press('Enter');
  await page.getByTestId('matrix-mx-hi').fill('4');
  await page.getByTestId('matrix-mx-hi').press('Enter');
  await expect(page.locator('#mx-err')).toBeHidden();
  await expect(page.getByTestId('matrix-rounds')).toContainText('Matrices, −3 to 4, 60 s');
  await page.reload();
  await expect(page.getByTestId('matrix-max-custom')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('matrix-mx-lo')).toHaveValue('-3');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await start(page);
  for (let k = 0; k < 5; k++) {
    const read = async (id) => (await page.getByTestId(id).locator('span').allTextContents()).map((t) => Number(t.replace('−', '-')));
    for (const v of (await read('game-matrix-a')).concat(await read('game-matrix-b'))) expect(v >= -3 && v <= 4).toBe(true);
    const c = await product(page);
    for (let i = 0; i < 4; i++) { await page.keyboard.type(String(c[i])); if (i < 3) await page.keyboard.press(' '); }
    await expect(page.getByTestId('game-score')).toHaveText('Score: ' + (k + 1));
  }
  await tick(page, 61000);
  const last = (await rounds(page)).at(-1);
  expect(last.settings).toMatchObject({ lo: -3, hi: 4, duration: 60, custom: true });
  await expect(page.locator('.end-head')).toContainText('Matrices, −3 to 4, 60 s');
});