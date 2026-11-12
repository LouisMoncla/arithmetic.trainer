// Road to 60: today's plan from my data (families, accuracy), the session runner block by block, drill hints, the cap
// and extra rounds (also after midnight), milestones, the 60 gate, test days and the accuracy round.
const { test, expect } = require('@playwright/test');
const { NOW, openApp, tick, answerCurrent, rounds, solve, endRound } = require('./helpers');

const at = (daysAgo, hour, min) => { const d = new Date(NOW); d.setDate(d.getDate() - daysAgo); d.setHours(hour, min || 0, 0, 0); return d.toISOString(); };
let n = 0;
const round = (mode, startedAt, more) => Object.assign({ id: 'seed-' + (n++), startedAt, mode, score: 30, settings: { duration: 60 }, questions: [] }, more || {});
const Q = (op, a, b, timeMs) => ({ op, a, b, shown: '', answer: 0, timeMs, wrongAttempts: 0 });

// 3 days of Speed rounds: − with borrow is slow (3.5 s against 1.9), + without carry is fast, and × 8, × 7, × 9 with a
// big factor are very slow (6, 5.5, 5 s against 2.4): together × big loses the most. Nothing else has data.
function history() {
  const out = [];
  for (let d = 3; d >= 1; d--) {
    const qs = [];
    for (let i = 0; i < 20; i++) qs.push(Q('sub', 27, 45, 3500), Q('add', 34, 25, 1300), Q('mul', 8, 40 + i, 6000), Q('mul', 7, 40 + i, 5500), Q('mul', 9, 40 + i, 5000));
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
  await expect(plan).toContainText('Focus A: × ÷ by 8, 7 and 9');   // × big costs the most in total: its 3 worst multipliers
  await expect(plan).toContainText('Focus B: Borrow subtraction');
  await expect(plan.locator('li')).toHaveText([/Warm-up: Tables/, /Warm-up: Foundations/, /Focus A/, /Focus B/, /Main: Speed/, /Benchmark: Normal 120 s/]);
  await expect(page.getByTestId('road-families').locator('li')).toHaveText([/^× big\d+ ms a question, costs ~\d+ points? \(Focus A\)$/, /^\+ and −.*\(Focus B\)$/, /^÷ big0 ms a question$/]);
  await expect(page.getByTestId('road-accuracy')).toContainText('0% of answers have a wrong attempt');
  await expect(page.getByTestId('road-gap')).toContainText('− with borrow3.5 s vs 1.9 s target');
  await expect(page.getByTestId('stat-road-estimate')).toBeVisible();

  await page.keyboard.press('Enter');
  await tick(page, 3100);
  await answerCurrent(page);
  await endRound(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await expect(page.getByTestId('coach-next')).toHaveText('Block done. Next: Warm-up: Foundations, round 1 of 2.');
  const r = await lastRound(page);
  expect(r.mode).toBe('TABLES');
  expect(r.coach).toEqual({ block: 1, test: false });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('arithmeticTrainer.v1')).schemaVersion)).toBe(3);   // migrated from v1

  await page.reload();
  await page.goto(page.url().replace(/#.*$/, '#road'));
  await expect(page.getByTestId('road-start')).toContainText('Continue today’s session');
  await expect(page.locator('.road-plan li[data-block="1"]')).toHaveClass('done');
  await expect(page.locator('.road-plan li[data-block="2"]')).toHaveClass('cur');
});

test('Focus A is a × ÷ mix of the worst multipliers with the method after 5 s; the end screen names Focus B', async ({ page }) => {
  await openApp(page, 'road', { rounds: history().concat(today({ 1: 1, 2: 2, 3: 2 })) });
  await expect(page.locator('.road-plan li[data-block="3"]')).toHaveClass('cur');
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  const q = page.getByTestId('game-question'), method = page.getByTestId('game-method');
  // a question with a big factor (a table fact has no method line): answer the small ones until one comes
  let shown;
  for (let i = 0; i < 30; i++) {
    shown = (await q.textContent()).trim();
    const m = /^(\d+) × (\d+)$/.exec(shown) || /^(\d+) ÷ (\d+)$/.exec(shown);
    const [n, other] = shown.includes('×') ? [+m[1], +m[2]] : [+m[2], +m[1] / +m[2]];
    expect([8, 7, 9]).toContain(n);
    if (other > 12) break;
    await answerCurrent(page);
  }
  await tick(page, 4000);
  await expect(method).toBeHidden();
  await tick(page, 1200);
  await expect(method).toBeVisible();
  await expect(method).toHaveText(new RegExp('^' + shown.replace(/[×÷]/, '[×÷]') + ' → '));
  await answerCurrent(page);
  await endRound(page, 61000);
  await expect(page.getByTestId('coach-next')).toHaveText('Block done. Next: Focus B: Borrow subtraction, round 1 of 3.');
  const r = await lastRound(page);
  expect([r.mode, r.settings.drill, r.settings.n, r.coach.block]).toEqual(['R60', 'mult', [8, 7, 9], 3]);
  expect(r.questions.some((x) => x.hinted)).toBe(true);

  // Enter goes straight on to Focus B
  await tick(page, 500);
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  const [, m2, s2] = /^(\d+) − (\d+)$/.exec((await q.textContent()).trim()).map(Number);
  expect(m2 < 100 && m2 % 10 < s2 % 10).toBe(true);           // a two-digit borrow
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
  await endRound(page, 121000);
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
  // The hash changes at once but Play draws on hashchange; a key before that would start Road drill 3.
  await expect(page.getByTestId('play-modes')).toBeVisible();
  await page.keyboard.press('4');   // Speed
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  await tick(page, 6000);
  await expect(page.getByTestId('game-method')).toBeHidden();
  await answerCurrent(page);
  await endRound(page, 61000);
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
  await expect(page.getByTestId('road-milestones')).toHaveText('■ 40 ■ 45 ■ 50 ■ 55 ■ 60');
  await expect(page.getByTestId('road-gate-message')).toHaveText('60 reached. Next: squares to 25, fractions, percentages, Optiver-style.');
  await expect(page.getByTestId('stat-road-benchmark')).toContainText('61.5');
  await expect(page.locator('.hero-why')).toContainText('session 7. Test day');
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
  await endRound(page, 61000);
  const r = await lastRound(page);
  expect([r.mode, r.settings.drill, r.settings.n, r.coach, r.extra]).toEqual(['R60', 'mult', 8, undefined, undefined]);
  await tick(page, 500);
  await page.keyboard.press('Enter');   // play again: same drill
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).toHaveText(/^(8 × \d+|\d+ ÷ 8)$/);
  await page.keyboard.press('Escape');
});

test('a day runs until 05:00: after midnight the evening session is still today and rounds are extra', async ({ page }) => {
  // Yesterday evening's full session (NOW is 21 Oct 10:00; the clock starts at 21 Oct 00:20), and a round from
  // 00:05 saved before the change, untagged: the migration tags it.
  const eve = (k) => { const d = new Date(NOW); d.setDate(d.getDate() - 1); d.setHours(18, k, 0, 0); return d.toISOString(); };
  const done = [];
  [['TABLES', 1], ['P2', 2], ['P2', 2], ['R60', 3], ['R60', 3], ['R60', 3], ['R60', 4], ['R60', 4], ['R60', 4], ['P3', 5], ['P3', 5], ['P3', 5], ['P3', 5]]
    .forEach(([mode, b], k) => done.push(round(mode, eve(k), { coach: { block: b, test: false }, settings: mode === 'R60' ? { drill: 'carry', duration: 60 } : { duration: 60 } })));
  done.push(round('NORMAL120', eve(20), { score: 41, settings: { duration: 120 }, coach: { block: 6, test: false } }));
  done.push(round('NORMAL120', eve(23), { score: 43, settings: { duration: 120 }, coach: { block: 6, test: false } }));
  const midnight = new Date(NOW); midnight.setHours(0, 5, 0, 0);
  done.push(round('WTABLES', midnight.toISOString(), { id: 'old-night' }));
  const now = new Date(NOW); now.setHours(0, 20, 0, 0);
  await openApp(page, 'road', { rounds: history().concat(done), now });
  await expect(page.getByTestId('road-title')).toHaveText('Done for today');
  expect((await rounds(page)).find((r) => r.id === 'old-night').extra).toBe(true);

  await page.keyboard.press('p');
  await expect(page.getByTestId('play-modes')).toBeVisible();   // Play draws on hashchange
  await page.keyboard.press('4');   // Speed
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  await answerCurrent(page);
  await endRound(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  const r = await lastRound(page);
  expect([r.mode, r.extra, r.coach]).toEqual(['P3', true, undefined]);
});

test('the accuracy round (key 6): a wrong digit loses the point, the question stays until you fix it', async ({ page }) => {
  await openApp(page, 'road');
  await expect(page.getByTestId('road-drill-acc')).toContainText('Accuracy round');
  await page.locator('main').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('6');
  await tick(page, 3100);
  const q = page.getByTestId('game-question'), box = page.getByRole('textbox', { name: 'Answer' }), score = page.getByTestId('game-score');
  const shown = (await q.textContent()).trim(), ans = String(solve(shown));
  const bad = String((+ans[0] + 1) % 10 || 1);   // a digit the answer cannot start with
  // typing fast after the slip: the digits stay in this question's box, nothing jumps to the next one
  await box.pressSequentially(bad + ans.slice(1));
  await expect(q).toHaveText(shown);
  await expect(box).toHaveValue(bad + ans.slice(1));
  // fix it: the answer goes in, with no point
  await box.fill('');
  await box.pressSequentially(ans);
  await expect(q).not.toHaveText(shown);
  await expect(score).toHaveText('Score: 0');
  await answerCurrent(page);
  await expect(score).toHaveText('Score: 1');
  await endRound(page, 61000);
  await expect(page.getByTestId('end-score')).toHaveText('1');
  await expect(page.getByTestId('stat-accuracy')).toContainText('50%');   // 1 of the 2 answers was right first time
  const r = await lastRound(page);
  expect([r.mode, r.settings.drill, r.score]).toEqual(['R60', 'acc', 1]);
  expect(r.questions[0]).toMatchObject({ noPoint: true, wrongAttempts: 1 });
  expect(r.questions[0].unanswered).toBeUndefined();
  expect(r.questions[1].noPoint).toBeUndefined();
  await expect(page.getByText('No point (wrong digit)').first()).toBeAttached();
});

test('a new user sees no made-up estimate and no empty tables', async ({ page }) => {
  await openApp(page, 'road');
  await expect(page.getByTestId('road-intro')).toBeVisible();
  await expect(page.getByTestId('stat-road-estimate')).toHaveCount(0);   // no rounds: no gap section to show
  await expect(page.getByTestId('road-categories')).toHaveCount(0);
  await expect(page.getByTestId('road-tod')).toHaveCount(0);
  await expect(page.locator('.hero-why')).toHaveText('Road to 60, session 1');
});
