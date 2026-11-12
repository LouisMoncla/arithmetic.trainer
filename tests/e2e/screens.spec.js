// Home, Review, Stats (its sections and old links) and keyboard navigation.
const { test, expect } = require('@playwright/test');
const { NOW, openApp, tick, startSelected, answerCurrent, dayKey, endRound, jump, statsLevel } = require('./helpers');

test('the site is 103 and opens on Play, Interview-ready first; Road to 60 is second and explains itself to a new user', async ({ page }) => {
  await openApp(page, null);
  await expect(page).not.toHaveURL(/#/);
  await expect(page).toHaveTitle('103 Mental Math');
  await expect(page.locator('.brand')).toHaveText('103');
  await expect(page.locator('.brand')).toHaveAttribute('href', '#play');
  await expect(page.locator('.brand .brand-mark')).toBeVisible();   // ∃! before 103, like the favicon
  await expect(page.locator('.brand')).toHaveAttribute('aria-label', 'There is a unique 103, home');
  expect(await page.locator('.brand-num').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(30);   // the name, bigger than the tabs
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Play');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Play' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('button.mode').first()).toHaveAttribute('data-mode', 'NORMAL120');
  await expect(page.locator('button.mode').first().locator('.k')).toHaveText('1');
  await expect(page.getByRole('button', { name: /Interview-ready/, pressed: true })).toBeVisible();
  await expect(page.locator('nav a')).toHaveText(['Play', 'Road to 60', 'Learn', 'Review', 'Finance', 'Stats']);
  // a new user on Road to 60 gets the explanation, not empty numbers
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Road to 60' }).click();
  await expect(page.getByTestId('road-title')).toHaveText('Today’s session');
  await expect(page.getByTestId('road-intro')).toContainText('60 or more is a strong score');
  await expect(page.getByTestId('stat-road-estimate')).toHaveCount(0);
  await expect(page.getByTestId('road-milestones')).toHaveCount(0);
  // Settings is a gear beside the theme toggle, marked current on its page
  const gear = page.getByRole('link', { name: 'Settings' });
  await expect(gear).toHaveAttribute('href', '#settings');
  await gear.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(gear).toHaveAttribute('aria-current', 'page');
});

test('play: only the modes, no recommendation; number keys and arrows choose, Enter starts', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Play');
  await expect(page.locator('.mode .tag:not(:empty)')).toHaveCount(0);
  await expect(page.getByText(/Warm up first|Recommended|Step 1/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Interview-ready/, pressed: true })).toBeVisible();   // row 1 selected

  await page.keyboard.press('3');
  await expect(page.getByRole('button', { name: /Foundations/, pressed: true })).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('button', { name: /Interview-ready/, pressed: true })).toBeVisible();

  await startSelected(page);
  await expect(page.getByTestId('game-timer')).toHaveText('2:00');   // a 120-second round
  await jump(page, 10000);
  await expect(page.getByTestId('game-timer')).toHaveText('1:50');
  await page.keyboard.press('Escape');
});

test('play: a click starts the mode; Matrices, then Combinatorics (K), close the list', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('play-matrices')).toContainText('Matrices');
  const rows = page.locator('[data-testid="play-modes"] .mode');
  await expect(rows.nth(-2)).toHaveAttribute('data-testid', 'play-matrices');
  await expect(rows.last()).toHaveAttribute('data-testid', 'play-combi');
  await expect(rows.last().locator('.k')).toHaveText('K');
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

test('play: Tables is row 2 until 150 of 187 table facts are measured', async ({ page }) => {
  await openApp(page, 'play', { rounds: tablesHistory(149) });
  await expect(page.locator('.mode[data-mode="TABLES"] .k')).toHaveText('2');
  await expect(page.locator('.mode[data-mode="WTABLES"]')).toHaveCount(0);
  await expect(page.getByTestId('play-plain-tables')).toHaveCount(0);
});

test('play: then Weighted tables takes row 2, plain Tables moves to T', async ({ page }) => {
  await openApp(page, 'play', { rounds: tablesHistory(150) });
  await expect(page.locator('.mode[data-mode="WTABLES"] .k')).toHaveText('2');
  await expect(page.getByTestId('play-plain-tables').locator('.k')).toHaveText('T');
  await expect(page.locator('.mode[data-mode="TABLES"]')).toHaveCount(1);
  await expect(page.locator('.mode[data-mode="TRICKS"] .k')).toHaveText('0');   // the tenth numbered mode

  // 2 then Enter plays Weighted tables
  await page.keyboard.press('2');
  await startSelected(page);
  await expect(page.getByTestId('game-question')).toHaveText(/^\d+ [×÷] \d+$/);
  await answerCurrent(page);
  await endRound(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  expect((await savedModes(page)).pop()).toBe('WTABLES');
});

test('play: T plays plain Tables once Weighted tables holds row 2', async ({ page }) => {
  await openApp(page, 'play', { rounds: tablesHistory(150) });
  await page.keyboard.press('t');
  await tick(page, 3100);
  await answerCurrent(page);
  await endRound(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  expect((await savedModes(page)).pop()).toBe('TABLES');
});

test('play: the plain Tables row starts a plain round', async ({ page }) => {
  await openApp(page, 'play', { rounds: tablesHistory(187) });
  await page.getByTestId('play-plain-tables').click();
  await tick(page, 3100);
  await answerCurrent(page);
  await endRound(page, 61000);
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

test('stats: a day link (old session link too), A from the end screen, and arrow keys between days', async ({ page }) => {
  const yesterday = new Date(NOW); yesterday.setDate(NOW.getDate() - 1);
  await openApp(page, 'session/' + dayKey(yesterday), { history: true });
  await expect(page).toHaveURL(new RegExp('#stats/day/' + dayKey(yesterday) + '$'));
  // the day's last round decides the mode: the zetamac session ends on Interview-ready
  await expect(page.getByTestId('stats-day')).toContainText('Interview-ready, day 1 of practice');

  // Play one Interview-ready round today, then A on the end screen opens today in that mode.
  await page.keyboard.press('p');
  await expect(page.getByTestId('play-modes')).toBeVisible();
  await page.keyboard.press('1');
  await startSelected(page);
  await answerCurrent(page);
  await page.clock.fastForward(121000);   // one jump to the end of the clock instead of every 50 ms tick
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await tick(page, 500);
  await page.keyboard.press('a');
  await expect(page).toHaveURL(new RegExp('#stats/day/' + dayKey(NOW) + '$'));
  await expect(page.getByTestId('stats-day')).toContainText('day 2 of practice, today');

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('stats-day')).toContainText('day 1 of practice');
  await expect(page).toHaveURL(new RegExp('#stats/day/' + dayKey(yesterday) + '$'));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('stats-day')).toContainText('day 2 of practice');
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

test('stats: one mode at a time, remembered; a calendar day opens that day, Esc goes back up', async ({ page }) => {
  // Two days: Speed and Interview-ready rounds yesterday, Speed today.
  const at = (daysAgo, min) => { const d = new Date(NOW); d.setDate(d.getDate() - daysAgo); d.setHours(9, min, 0, 0); return d.toISOString(); };
  let n = 0;
  const r = (mode, daysAgo, score) => ({ id: 's' + (n++), startedAt: at(daysAgo, n), mode, score, settings: { duration: mode === 'NORMAL120' ? 120 : 60 }, questions: [] });
  await openApp(page, 'stats/mode', { rounds: [r('P3', 1, 30), r('P3', 1, 32), r('NORMAL120', 1, 55), r('P3', 0, 34)] });
  const modes = page.getByTestId('stats-modes');
  await expect(modes.getByRole('button', { name: 'Interview-ready', pressed: true })).toBeVisible();   // the benchmark first
  await expect(page.getByTestId('stats-chart').locator('svg.chart')).toHaveCount(1);
  await expect(page.getByTestId('stat-stats-best')).toBeVisible();

  await modes.getByRole('button', { name: 'Speed' }).click();
  await expect(modes.getByRole('button', { name: 'Speed', pressed: true })).toBeVisible();
  await expect(page).toHaveURL(/#stats\/mode\/P3$/);
  await expect(page.locator('svg[aria-label="Speed day averages"]')).toHaveCount(1);
  await page.goto(page.url().replace(/#.*$/, '#stats'));
  await expect(page.getByTestId('overview-more')).toBeVisible();   // D means the detail only once the overview is drawn (before, it is the drill)
  await page.keyboard.press('d');
  await expect(modes.getByRole('button', { name: 'Speed', pressed: true })).toBeVisible();   // remembered in this browser

  // the calendar: the days played are buttons; one opens its day
  const cal = page.getByTestId('stats-calendar');
  await expect(cal.locator('.cal-d.on')).toHaveCount(2);   // Speed on 2 days, both in October
  await expect(cal.locator('.cal-d.on').first()).toHaveAttribute('aria-label', /2 rounds, average 31/);
  await cal.locator('.cal-d.on').first().click();
  await expect(page.getByTestId('day-scores').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('stats-day-modes').getByRole('button', { name: 'Speed', pressed: true })).toBeVisible();   // both modes of that day
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('day-scores').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('day-scores')).toContainText('34');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#stats\/mode\/P3$/);
  await statsLevel(page, 'mode');   // drawn, so the next Esc reaches the mode level
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#stats$/);
  await expect(page.getByTestId('overview-headline')).toBeVisible();
});

test('stats: old links and keys land on the right level', async ({ page }) => {
  await openApp(page, 'stats/progress', { history: true });
  await expect(page).toHaveURL(/#stats$/);
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Stats' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('overview-headline')).toBeVisible();

  await page.goto(page.url().replace(/#.*$/, '#stats/log'));
  await expect(page).toHaveURL(/#stats\/add$/);
  await expect(page.getByLabel('Scores, separated by commas')).toBeVisible();   // the zetamac form, open on the mode page

  await page.goto(page.url().replace(/#.*$/, '#stats/NORMAL120'));   // the old one-mode link
  await expect(page).toHaveURL(/#stats\/mode\/NORMAL120$/);

  await page.keyboard.press('p');
  await expect(page.getByTestId('play-modes')).toBeVisible();
  await page.keyboard.press('e');
  await expect(page).toHaveURL(/#stats\/day\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByTestId('stats-day')).toBeVisible();

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

test('settings: Copy report for Claude is in Backup', async ({ page }) => {
  await openApp(page, 'settings', { history: true });
  await page.getByRole('button', { name: 'Copy report for Claude' }).click();
  await expect(page.getByLabel('Report for Claude')).toBeVisible();
  await expect(page.getByLabel('Report for Claude')).toHaveValue(/## /);
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
  await expect(page.getByRole('link', { name: 'Settings' })).toBeInViewport({ ratio: 1 });
  for (const name of ['Road to 60', 'Play', 'Learn', 'Review', 'Finance', 'Stats']) {
    await expect(nav.getByRole('link', { name })).toBeInViewport({ ratio: 1 });
  }
});
