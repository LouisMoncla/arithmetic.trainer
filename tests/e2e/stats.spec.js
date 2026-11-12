// Stats in three levels: the overview (readable in 5 seconds), one mode, one day or round. Esc goes back up.
const { test, expect } = require('@playwright/test');
const { NOW, openApp, dayKey } = require('./helpers');
const { richHistory } = require('./stats-history');

const BLOCKS = ['overview-headline', 'overview-milestones', 'overview-tiles', 'overview-costs', 'overview-activity', 'overview-more'];

test('overview: exactly six blocks, no other mode, fits a laptop screen, every number explains itself', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openApp(page, 'stats', { rounds: richHistory(NOW) });
  const main = page.locator('main');
  await expect(main.locator('[data-testid^="overview-"]')).toHaveCount(6);
  for (const id of BLOCKS) await expect(page.getByTestId(id)).toBeVisible();
  // the benchmark comes from Road to 60 and says so; the costs are Road to 60's own
  await expect(page.getByTestId('overview-headline')).toContainText('Based on Road to 60 sessions (block 6)');
  await expect(page.getByTestId('overview-headline')).toContainText(/\d+\.\d/);
  await expect(page.getByTestId('overview-costs').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('overview-costs').locator('a').first()).toHaveAttribute('href', '#road');
  await expect(page.getByTestId('overview-milestones').locator('.ms-dot')).toHaveCount(5);
  await expect(page.getByTestId('overview-activity').locator('.sq')).toHaveCount(28);
  await expect(page.getByTestId('overview-activity')).toContainText(/Streak: \d+ days?/);
  // nothing else: no mode picker, no other modes, no detail tables
  await expect(page.getByTestId('stats-modes')).toHaveCount(0);
  for (const word of ['Squares', 'Matrices', 'Weak facts', 'Time per operation']) await expect(main).not.toContainText(word);
  // one laptop screen, no scrolling
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  // a definition on keyboard focus
  const num = page.getByTestId('overview-headline').locator('.def').first();
  await expect(num.locator('.tip')).toBeHidden();
  await num.focus();
  await expect(num.locator('.tip')).toBeVisible();
  await expect(num.locator('.tip')).toContainText('last 3 complete Road to 60 sessions');
});

test('overview without Road to 60: the Interview-ready days stand in, and say so', async ({ page }) => {
  await openApp(page, 'stats', { history: true });   // a zetamac.com session yesterday, 8 Interview-ready scores
  await expect(page.getByTestId('overview-headline')).toContainText('No Road to 60 benchmark yet');
  await expect(page.getByTestId('overview-headline')).toContainText('22.5');   // the mean of 28 24 25 14 22 21 25 21
  await expect(page.getByTestId('overview-milestones')).toContainText('Not enough data yet');
  await expect(page.getByTestId('overview-costs')).toContainText('Not enough data yet');
});

test('D opens the detail; groups are collapsed; Benchmark only filters Interview-ready to block 6; Esc goes back', async ({ page }) => {
  const rounds = richHistory(NOW);
  // one Interview-ready round outside Road to 60, today, far above the rest
  rounds.push({ id: 'outside', startedAt: new Date(NOW.getTime() - 3600000).toISOString(), mode: 'NORMAL120', score: 99, settings: { duration: 120 }, questions: [] });
  await openApp(page, 'stats', { rounds });
  await page.keyboard.press('d');
  await expect(page).toHaveURL(/#stats\/mode\/NORMAL120$/);
  const modes = page.getByTestId('stats-modes');
  await expect(modes.getByRole('button', { name: 'Interview-ready', pressed: true })).toBeVisible();
  for (const g of ['drills', 'other']) await expect(page.getByTestId('stats-group-' + g)).toHaveJSProperty('open', false);
  await expect(modes.getByRole('button', { name: 'Squares' })).toBeHidden();
  await expect(page.getByTestId('stat-stats-best')).toContainText('all 120 s rounds');
  await expect(page.getByTestId('stat-stats-best')).toContainText('99');

  await page.getByTestId('stats-bench').getByRole('button', { name: 'Benchmark only' }).click();
  await expect(page.getByTestId('stats-bench').getByRole('button', { name: 'Benchmark only', pressed: true })).toBeVisible();
  await expect(page.getByTestId('stat-stats-best')).toContainText('benchmark rounds');
  await expect(page.getByTestId('stat-stats-best')).not.toContainText('99');

  // the other groups open on demand; a grouped mode shows inside its open group
  await page.getByTestId('stats-group-other').locator('summary').click();
  await modes.getByRole('button', { name: 'Squares' }).click();
  await expect(modes.getByRole('button', { name: 'Squares', pressed: true })).toBeVisible();
  await expect(page.getByTestId('stats-group-other')).toHaveJSProperty('open', true);
  // details are closed until asked for
  await expect(page.getByTestId('stats-d-weak')).toHaveCount(0);   // tricks have no drill targets
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#stats$/);
  await expect(page.getByTestId('overview-headline')).toBeVisible();
});

test('a day from the chart or the calendar, a round from its score; Esc climbs back level by level', async ({ page }) => {
  await openApp(page, 'stats/mode/P3', { rounds: richHistory(NOW) });
  const yesterday = new Date(NOW); yesterday.setDate(NOW.getDate() - 1);
  // the chart: Enter on the focused chart opens the last day shown
  await page.getByTestId('stats-chart').locator('svg.chart').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp('#stats/day/' + dayKey(yesterday) + '$'));
  await expect(page.getByTestId('stats-day')).toContainText('Speed, day');
  await expect(page.getByTestId('day-scores').locator('li')).toHaveCount(4);   // the 4 Speed rounds of the coach session
  await expect(page.getByTestId('stats-day')).toContainText('First-try accuracy');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#stats\/mode\/P3$/);

  // the calendar, then a score: the round as its end screen read then
  await page.getByTestId('stats-calendar').locator('.cal-d.on').last().click();
  const chip = page.getByTestId('day-scores').locator('a').first();
  const score = (await chip.textContent()).trim();
  await chip.click();
  await expect(page).toHaveURL(/#stats\/round\//);
  await expect(page.getByTestId('stats-round').getByTestId('end-score')).toHaveText(score);
  await expect(page.getByTestId('end-takeaways')).toBeVisible();
  await expect(page.getByTestId('end-all-questions')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play again' })).toHaveCount(0);   // read-only: no end-screen actions
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(new RegExp('#stats/day/' + dayKey(yesterday) + '$'));
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#stats\/mode\/P3$/);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#stats$/);
});

test('Road to 60 drills have their own modes in Stats, × ÷ mixes grouped under one entry', async ({ page }) => {
  await openApp(page, 'stats/mode/R60-cross', { rounds: richHistory(NOW) });
  const modes = page.getByTestId('stats-modes');
  await expect(page.getByTestId('stats-group-drills')).toHaveJSProperty('open', true);   // the mode shown is inside
  await expect(modes.getByRole('button', { name: 'Cross-100 subtraction', pressed: true })).toBeVisible();
  await expect(page.getByTestId('stats-chart').locator('svg.chart')).toHaveCount(1);
  await expect(page).toHaveURL(/#stats\/mode\/R60-cross$/);
  // the old one-mode link with a date opens that day
  const yesterday = dayKey(new Date(NOW.getTime() - 86400000));
  await page.goto(page.url().replace(/#.*$/, '#stats/P3/' + yesterday));
  await expect(page).toHaveURL(new RegExp('#stats/day/' + yesterday + '$'));
  await expect(page.getByTestId('stats-day')).toContainText('Speed, day');
});
