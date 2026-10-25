// Your history is the one thing that must never be lost: entry, export, reset, import.
const { test, expect } = require('@playwright/test');
const { openApp, rounds } = require('./helpers');

test('zetamac.com scores are saved and listed in the Log', async ({ page }) => {
  await openApp(page, 'log');
  await page.getByLabel('Mode').selectOption('P2');
  await page.getByLabel('Scores, separated by commas').fill('17, 19, 18');
  await page.getByRole('button', { name: 'Save rounds' }).click();
  await expect(page.getByText('Saved 3 rounds to Foundations.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete round with score 19' })).toBeVisible();
});

test('a bad score list is refused with a way to fix it', async ({ page }) => {
  await openApp(page, 'log');
  const before = (await rounds(page)).length;
  await page.getByLabel('Scores, separated by commas').fill('17, abc');
  await page.getByRole('button', { name: 'Save rounds' }).click();
  await expect(page.getByText(/for example 28, 24, 25/)).toBeVisible();
  await expect(page.getByLabel('Scores, separated by commas')).toBeFocused();
  expect((await rounds(page)).length).toBe(before);
});

test('a first visit starts with no history', async ({ page }) => {
  await openApp(page, 'session');
  expect(await rounds(page)).toHaveLength(0);
  await expect(page.getByTestId('stats-day')).toContainText('No rounds yet');
});

test('export, reset, then import restores everything', async ({ page }, testInfo) => {
  await openApp(page, 'log', { history: true });
  await page.getByLabel('Scores, separated by commas').fill('30, 31');
  await page.getByRole('button', { name: 'Save rounds' }).click();
  const saved = await rounds(page);
  expect(saved).toHaveLength(10); // 8 history rounds + 2

  await page.keyboard.press('s');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  const file = testInfo.outputPath('backup.json');
  await download.saveAs(file);

  await page.getByLabel('Type RESET to confirm').fill('RESET');
  await page.getByRole('button', { name: 'Reset all data' }).click();
  await expect(page.getByText('Reset. You now have 0 rounds.')).toBeVisible();
  expect(await rounds(page)).toHaveLength(0);

  await page.getByLabel('Import').setInputFiles(file);
  await expect(page.getByText('This file has 10 rounds in 2 days.')).toBeVisible();
  await page.getByRole('button', { name: 'Replace my data' }).click();
  await expect(page.getByText('Replaced. You now have 10 rounds.')).toBeVisible();
  expect((await rounds(page)).map(r => r.id)).toEqual(saved.map(r => r.id));
});

test('reset stays disabled until RESET is typed exactly', async ({ page }) => {
  await openApp(page, 'settings');
  const reset = page.getByRole('button', { name: 'Reset all data' });
  await expect(reset).toBeDisabled();
  await page.getByLabel('Type RESET to confirm').fill('reset');
  await expect(reset).toBeDisabled();
  await page.getByLabel('Type RESET to confirm').fill('RESET');
  await expect(reset).toBeEnabled();
});
