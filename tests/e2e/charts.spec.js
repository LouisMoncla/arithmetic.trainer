// Charts: the round-of-the-day chart (line with dots, ticks 1 3 6 9 12+, only round numbers with 2+ days) on every
// mode panel and the Road to 60 warm-up curve, and no chart label overlapping another at 1366 and 390 wide.
const { test, expect } = require('@playwright/test');
const { NOW, openApp } = require('./helpers');

// 20 days back: Speed every day with 3 to 15 rounds, Normal 120 s every other day, Foundations on 3 days.
function history() {
  const out = [];
  let n = 0;
  for (let d = 20; d >= 1; d--) {
    const add = (mode, k, score) => {
      const t = new Date(NOW); t.setDate(t.getDate() - d); t.setHours(9, 0, 0, 0); t.setMinutes(n % 600);
      out.push({ id: 'h' + (n++), startedAt: t.toISOString(), mode, score, settings: { duration: mode === 'NORMAL120' ? 120 : 60 }, questions: [] });
    };
    const speed = 3 + (d % 13);
    for (let k = 0; k < speed; k++) add('P3', k, 20 + (k % 5) + (20 - d) / 4);
    if (d % 2) for (let k = 0; k < 4; k++) add('NORMAL120', k, 35 + k + (20 - d) / 2);
    if (d % 7 === 0) add('P2', 0, 15);
  }
  return out;
}

// Every pair of label boxes in one chart must not intersect. { bad: [...], labels: how many were checked }.
async function overlaps(page) {
  return page.evaluate(() => {
    const bad = [];
    let labels = 0;
    document.querySelectorAll('svg.chart').forEach((svg, c) => {
      const boxes = [...svg.querySelectorAll('text')].map((t) => ({ s: t.textContent, r: t.getBoundingClientRect() })).filter((b) => b.r.width > 0);
      labels += boxes.length;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r, b = boxes[j].r;
          if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) {
            bad.push('chart ' + c + ' (' + (svg.getAttribute('aria-label') || '') + '): "' + boxes[i].s + '" × "' + boxes[j].s + '"');
          }
        }
      }
    });
    return { bad, labels };
  });
}

for (const [w, h] of [[1366, 900], [390, 844]]) {
  test(`round-of-the-day charts and no overlapping chart labels at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, 'stats/P3', { rounds: history() });
    const progress = page.locator('main');

    // Speed: a line with a dot per round number, ticks 1 3 6 9 12+ only, no value printed on the chart
    const speed = progress.locator('svg[aria-label="Speed average score by round of the day"]');
    await expect(speed).toHaveCount(1);
    await expect(speed.locator('text.xt')).toHaveText(['1', '3', '6', '9', '12+']);
    await expect(speed.locator('path.ln')).toHaveCount(1);
    await expect(speed.locator('circle.dot')).toHaveCount(12);   // rounds 1–11 and 12+ all have 2+ days
    // no value printed on the chart: besides the 5 x ticks, only y-axis ticks (whole numbers), no end label
    await expect(speed.locator('text.end')).toHaveCount(0);
    for (const t of await speed.locator('text:not(.xt)').allTextContents()) expect(t).toMatch(/^\d+$/);
    await expect(speed.locator('path.bar')).toHaveCount(0);
    // Foundations was played on 3 days, one round each: only round 1 qualifies, so there is no chart (needs 2 points)
    await expect(progress.locator('svg[aria-label="Foundations average score by round of the day"]')).toHaveCount(0);   // not shown: Speed is the mode
    // the table twin has days and rounds
    const table = speed.locator('xpath=following-sibling::details[1]');
    await table.locator('summary').click();
    await expect(table.locator('tr').nth(12)).toContainText('12+');
    await expect(table.locator('tr').first()).toHaveText(/Round of the dayAverageDaysRounds/);
    // two bests, never confused: the tile is the all-time best round; the chart's dots and table column are each day's best
    await expect(page.getByTestId('stat-stats-best')).toContainText('Best (all time)');
    const progressChart = page.getByTestId('stats-chart');
    await expect(progressChart).toContainText('Best of the day');
    await expect(progressChart.locator('tr').first()).toHaveText(/DayAverageBest of the dayRounds/);

    let o = await overlaps(page);
    expect(o.bad).toEqual([]);
    expect(o.labels).toBeGreaterThan(15);   // the check really saw the labels

    // Foundations, played on 3 days with one round each: no round-of-the-day chart
    await page.getByTestId('stats-modes').getByRole('button', { name: 'Foundations' }).click();
    await expect(page.getByTestId('stats-rounds')).toHaveCount(0);
    o = await overlaps(page);
    expect(o.bad).toEqual([]);

    await page.goto(page.url().replace(/#.*$/, '#road'));
    const warm = page.getByTestId('road-warmup').locator('svg.chart');
    await expect(warm.locator('text.xt')).toHaveText(['1', '3', '6', '9', '12+']);
    await expect(warm.locator('circle.dot')).toHaveCount(12);
    o = await overlaps(page);
    expect(o.bad).toEqual([]);
    expect(o.labels).toBeGreaterThan(5);
  });
}
