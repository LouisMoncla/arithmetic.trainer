// Road to 60: today's plan from my data, the session runner block by block, drill hints, the cap and extra rounds,
// milestones, the 60 gate and test days.
const { test, expect } = require('@playwright/test');
const { NOW, openApp, tick, answerCurrent, rounds } = require('./helpers');

const at = (daysAgo, hour, min) => { const d = new Date(NOW); d.setDate(d.getDate() - daysAgo); d.setHours(hour, min || 0, 0, 0); return d.toISOString(); };
let n = 0;
const round = (mode, startedAt, more) => Object.assign({ id: 'seed-' + (n++), startedAt, mode, score: 30, settings: { duration: 60 }, questions: [] }, more || {});
const Q = (op, a, b, timeMs) => ({ op, a, b, shown: '', answer: 0, timeMs, wrongAttempts: 0 });

// 3 days of Speed rounds: − with borrow is slow (3.5 s against 1.9), + without carry is fast. Nothing else has data.
function history() {
  const out = [];
  for (let d = 3; d >= 1; d--) {
    const qs = [];
    for (let i = 0; i < 20; i++) qs.push(Q('sub', 27, 45, 3500), Q('add', 34, 25, 1300));
    out.push(round('P3', at(d, 18), { questions: qs }));
  }
  return out;
}
// Today's session rounds already played: { block: count }.
function today(blocks, test) {
  const out = [];
  let min = 0;
  for (const [b, k] of Object.entries(blocks)) {
    for (let i = 0; i < k; i++) {
      const mode = { 1: 'TABLES', 2: 'P2', 3: 'R60', 4: 'R60', 5: 'P3', 6: 'NORMAL120' }[b];
      const settings = b === '3' ? { drill: 'borrow', duration: 60 } : b === '4' ? { drill: 'comp', duration: 60 } : { duration: b === '6' ? 120 : 60 };
      out.push(round(mode, at(0, 8, min++), { settings, score: b === '6' ? 44 : 30, coach: { block: +b, test: !!test } }));
    }
  }
  return out;
}
const lastRound = async (page) => (await rounds(page)).slice(-1)[0];

test('the plan comes from my data; block 1 is saved as a session round and a reload resumes', async ({ page }) => {
  await openApp(page, 'road', { rounds: history() });
  await expect(page.getByTestId('road-title')).toHaveText('Today’s session');
  const plan = page.getByTestId('road-plan');
  await expect(plan).toContainText('Focus A: Borrow subtraction');
  await expect(plan).toContainText('Focus B: Complements');   // never trained: complements take Focus B
  await expect(plan.locator('li')).toHaveText([/Warm-up: Tables/, /Warm-up: Foundations/, /Focus A/, /Focus B/, /Main: Speed/, /Benchmark: Normal 120 s/]);
  await expect(page.getByTestId('road-gap')).toContainText('− with borrow3.5 s vs 1.9 s target');
  await expect(page.getByTestId('stat-road-estimate')).toBeVisible();

  await page.keyboard.press('Enter');
  await tick(page, 3100);
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await expect(page.getByTestId('coach-next')).toHaveText('Block done. Next: Warm-up: Foundations, round 1 of 2.');
  const r = await lastRound(page);
  expect(r.mode).toBe('TABLES');
  expect(r.coach).toEqual({ block: 1, test: false });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('arithmeticTrainer.v1')).schemaVersion)).toBe(2);   // migrated from v1

  await page.reload();
  await page.goto(page.url().replace(/#.*$/, '#road'));
  await expect(page.getByTestId('road-start')).toContainText('Continue today’s session');
  await expect(page.locator('.road-plan li[data-block="1"]')).toHaveClass('done');
  await expect(page.locator('.road-plan li[data-block="2"]')).toHaveClass('cur');
});

test('a focus drill shows the method after 5 s, and the end screen names the next block', async ({ page }) => {
  await openApp(page, 'road', { rounds: history().concat(today({ 1: 1, 2: 2, 3: 2 })) });
  await expect(page.locator('.road-plan li[data-block="3"]')).toHaveClass('cur');
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  const shown = (await page.getByTestId('game-question').textContent()).trim();
  const [, m, s] = /^(\d+) − (\d+)$/.exec(shown).map(Number);
  expect(m < 100 && m % 10 < s % 10).toBe(true);           // a two-digit borrow
  const method = page.getByTestId('game-method');
  await tick(page, 4000);
  await expect(method).toBeHidden();
  await tick(page, 1200);
  await expect(method).toBeVisible();
  await expect(method).toHaveText(new RegExp('^' + m + ' − ' + s + ' → ' + s + ' → '));
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('coach-next')).toHaveText('Block done. Next: Focus B: Complements, round 1 of 3.');
  const r = await lastRound(page);
  expect([r.mode, r.settings.drill, r.coach.block]).toEqual(['R60', 'borrow', 3]);
  expect(r.questions[0].hinted).toBe(true);

  // Enter goes straight on to Focus B
  await tick(page, 500);
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).toHaveText(/^\d+ → \d+$/);
  await answerCurrent(page);
  await expect(page.getByTestId('game-score')).toHaveText('Score: 1');
  await page.keyboard.press('Escape');
});

test('the last benchmark round ends the session; later rounds are extra and get no hints', async ({ page }) => {
  test.setTimeout(90000);
  await openApp(page, 'road', { rounds: history().concat(today({ 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 1 })) });
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  await expect(page.getByTestId('game-timer')).toHaveText('2:00');
  await answerCurrent(page);
  await tick(page, 121000);
  await expect(page.getByTestId('coach-next')).toContainText('Today’s session is done');
  await expect(page.getByRole('button', { name: /Done for today/ })).toBeVisible();
  await tick(page, 500);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('road-title')).toHaveText('Done for today');
  await expect(page.getByTestId('road-summary')).toContainText('Benchmark today44, 1, average 22.5');
  await expect(page.getByTestId('road-start')).toContainText('Extra Normal 120 s');

  // A Speed round from Play: no method line, saved as extra
  await page.keyboard.press('p');
  await expect(page).toHaveURL(/#play$/);
  await page.keyboard.press('3');
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  await tick(page, 6000);
  await expect(page.getByTestId('game-method')).toBeHidden();
  await answerCurrent(page);
  await tick(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  const r = await lastRound(page);
  expect([r.mode, r.extra, r.coach]).toEqual(['P3', true, undefined]);
});

test('milestones, the 60 gate message (once) and the 7th session as a test day', async ({ page }) => {
  const done = [];
  const scores = [[44, 46], [45, 47], [55, 56], [61, 60], [62, 62], [60, 64]];
  scores.forEach((pair, i) => {
    const day = 6 - i;
    [['TABLES', 1], ['P2', 2], ['P2', 2], ['P3', 5]].forEach(([mode, b], k) => done.push(round(mode, at(day, 9, k), { coach: { block: b, test: false } })));
    pair.forEach((s, k) => done.push(round('NORMAL120', at(day, 10, k), { score: s, settings: { duration: 120 }, coach: { block: 6, test: false } })));
  });
  await openApp(page, 'road', { rounds: history().concat(done) });
  await expect(page.getByTestId('road-milestones')).toHaveText('■ 40 · ■ 45 · ■ 50 · ■ 55 · ■ 60');
  await expect(page.getByTestId('road-gate-message')).toHaveText('60 reached. Next: squares to 25, fractions, percentages, Optiver-style.');
  await expect(page.getByTestId('stat-road-benchmark')).toContainText('61.5');
  await expect(page.locator('.hero-why')).toContainText('session 7 · test day');
  await expect(page.getByTestId('road-plan').locator('li')).toHaveText([/Warm-up/, /Warm-up/, /Test day benchmark: Normal 120 s.*0 \/ 4/]);
  await page.keyboard.press('p');
  await page.keyboard.press('c');
  await expect(page.getByTestId('road-title')).toBeVisible();
  await expect(page.getByTestId('road-gate-message')).toHaveCount(0);   // shown once
});

test('the drills start from keys 1–5, × ÷ N from the picker', async ({ page }) => {
  await openApp(page, 'road');
  await page.locator('#mult-n').selectOption('8');
  await page.locator('main').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('5');
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).toHaveText(/^(8 × \d+|\d+ ÷ 8)$/);
  await answerCurrent(page);
  await tick(page, 61000);
  const r = await lastRound(page);
  expect([r.mode, r.settings.drill, r.settings.n, r.coach, r.extra]).toEqual(['R60', 'mult', 8, undefined, undefined]);
  await tick(page, 500);
  await page.keyboard.press('Enter');   // play again: same drill
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).toHaveText(/^(8 × \d+|\d+ ÷ 8)$/);
  await page.keyboard.press('Escape');
});
