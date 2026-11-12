// Learn › Taylor expansions: the lesson page, a Learn session (1–6, H, Enter, Esc), a sprint (timer, penalty, Tab),
// the settings changing the pool, the maths drawn offline, and the layout at 1366 and 390.
const { test, expect } = require('@playwright/test');
const { openApp, tick, rounds } = require('./helpers');

const keyOf = (page) => page.getByTestId('taylor-question').getAttribute('data-key');

test('Learn opens from the Learn tab; maths drawn offline; 1–6 answer, H shows the method first, Enter moves on, Esc saves', async ({ page }) => {
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:')) external.push(r.url()); });
  await openApp(page, 'learn');
  await page.getByTestId('learn-lesson-taylor').click();
  await expect(page).toHaveURL(/#learn\/taylor$/);
  await expect(page.getByTestId('learn-title')).toHaveText('Taylor expansions');
  await expect(page.getByTestId('taylor-grid-1').locator('li')).toHaveCount(24);
  await expect(page.getByTestId('taylor-grid-1').locator('li.unseen')).toHaveCount(24);
  await expect(page.getByTestId('taylor-grid-1').locator('math').first()).toBeVisible();   // MathML, no library

  await page.keyboard.press('Enter');
  const q = page.getByTestId('taylor-question');
  await expect(q).toBeVisible();
  await expect(q.locator('.opt')).toHaveCount(6);
  await expect(q.locator('math').first()).toBeVisible();
  await expect(page.getByTestId('taylor-hint')).toHaveCount(0);
  await page.keyboard.press('h');
  await expect(page.getByTestId('taylor-hint')).toContainText('Method.');
  const first = await keyOf(page);
  await page.keyboard.press('3');
  await expect(page.getByTestId('taylor-result')).toBeVisible();
  await expect(q.locator('.opt.right')).toHaveCount(1);   // the right one is marked, whatever was picked
  await expect(page.getByTestId('taylor-result').locator('math').first()).toBeVisible();   // the full expansion
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('taylor-result')).toHaveCount(0);
  await expect(page.locator('.page-head .sub')).toContainText('Question 2 of 20');
  await page.keyboard.press('1');
  await page.keyboard.press('Escape');   // finish: saved, then the score

  await expect(page.getByTestId('end-score')).toBeVisible();
  await expect(page.getByTestId('taylor-review').locator('tr')).toHaveCount(3);
  const saved = (await rounds(page)).filter((r) => r.mode === 'LEARN');
  expect(saved).toHaveLength(1);
  expect(saved[0].settings.lesson).toBe('taylor-learn');
  expect(saved[0].questions).toHaveLength(2);
  expect(saved[0].questions[0]).toMatchObject({ op: 'ty', key: first, chosenIndex: 2, hinted: true });
  expect(saved[0].questions[1].hinted).toBe(false);
  expect(saved[0].score).toBe(saved[0].questions.filter((x) => x.correct).length);
  expect(external).toEqual([]);   // nothing loaded from the network
});

test('Sprint: a 60 s clock, +1 / −1, Tab skips with no cost, no feedback, the review at the end, saved under its own mode', async ({ page }) => {
  await openApp(page, 'learn/taylor');
  await page.keyboard.press('f');
  await expect(page.getByTestId('taylor-timer')).toHaveText('60');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press(String(1 + (i % 6)));
    await expect(page.getByTestId('taylor-result')).toHaveCount(0);   // no feedback in a sprint
  }
  await page.keyboard.press('Tab');
  await tick(page, 20000);
  await expect(page.getByTestId('taylor-timer')).toHaveText(/^4\d$/);
  await tick(page, 41000);
  await expect(page.getByTestId('end-score')).toBeVisible();
  const r = (await rounds(page)).filter((x) => x.mode === 'LEARN')[0];
  expect(r.settings).toMatchObject({ lesson: 'taylor-sprint-60', duration: 60, penalty: 1 });
  expect(r.questions).toHaveLength(7);
  expect(r.questions[6]).toMatchObject({ skipped: true, unanswered: true, correct: false });
  const right = r.questions.filter((x) => x.correct).length, wrong = r.questions.filter((x) => !x.correct && !x.skipped).length;
  expect(r.score).toBe(right - wrong);
  await expect(page.getByTestId('end-score')).toHaveText(String(r.score).replace('-', '−'));
  await expect(page.getByTestId('taylor-review').locator('tr')).toHaveCount(8);
  await expect(page.getByTestId('taylor-review')).toContainText('Skipped');

  // in Stats, under the other modes, as its own mode
  await page.goto(page.url().replace(/#.*$/, '#stats/mode/LEARN-taylor-sprint-60'));
  await expect(page.getByTestId('stats-group-other')).toHaveJSProperty('open', true);
  await expect(page.getByTestId('stats-modes').getByRole('button', { name: 'Learn: Taylor sprint, 60 s', pressed: true })).toBeVisible();
});

test('settings are remembered and change the pool: basics only never asks a composed or asymptotic expansion', async ({ page }) => {
  await openApp(page, 'learn/taylor');
  const tier = (n) => page.locator('[data-ty-tier="' + n + '"]');
  await expect(tier(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(tier(2)).toHaveAttribute('aria-pressed', 'false');
  await tier(1).click();   // the only one on: stays on
  await expect(tier(1)).toHaveAttribute('aria-pressed', 'true');
  await tier(2).click();
  await expect(tier(2)).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(tier(2)).toHaveAttribute('aria-pressed', 'true');   // remembered
  await tier(2).click();
  await page.locator('[data-ty-nota="en"]').click();
  await expect(page.getByTestId('taylor-grid-1')).toContainText('cosh');

  const tier1 = await page.evaluate(() => window.AT.Taylor.LIB.filter((e) => e.tier === 1).map((e) => e.key));
  await page.keyboard.press('f');
  for (let i = 0; i < 50; i++) {
    expect(tier1).toContain(await keyOf(page));
    await page.keyboard.press('Tab');
  }
});

for (const [w, h] of [[1366, 768], [390, 844]]) {
  test(`layout at ${w}: no sideways scroll, six choice boxes that do not overlap`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, 'learn/taylor');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Enter');
    for (let i = 0; i < 4; i++) {
      const boxes = await page.locator('.ty-opts .opt').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }));
      expect(boxes).toHaveLength(6);
      for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
        const [l1, t1, r1, b1] = boxes[a], [l2, t2, r2, b2] = boxes[b];
        expect(l1 < r2 - 0.5 && l2 < r1 - 0.5 && t1 < b2 - 0.5 && t2 < b1 - 0.5, `boxes ${a + 1} and ${b + 1} overlap`).toBe(false);
      }
      if (w === 390) expect(new Set(boxes.map((x) => Math.round(x[0]))).size).toBe(1);   // one column
      else expect(new Set(boxes.map((x) => Math.round(x[0]))).size).toBe(2);             // 2 × 3
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press('1');
      await page.keyboard.press('Enter');
    }
  });
}

test('relearning: a hinted answer comes back once, 3 to 5 questions later, marked Again', async ({ page }) => {
  await openApp(page, 'learn/taylor');
  await page.keyboard.press('Enter');
  const first = await keyOf(page);
  await page.keyboard.press('h');   // helped: it will come back, right or wrong
  await page.keyboard.press('1');
  let seenAt = 0;
  for (let n = 2; n <= 7 && !seenAt; n++) {
    await page.keyboard.press('Enter');
    await expect(page.locator('.page-head .sub')).toContainText('Question ' + n + ' of 20');
    if (await page.getByTestId('taylor-again').count()) seenAt = n;
    else { await page.keyboard.press('1'); }
  }
  expect(seenAt).toBeGreaterThanOrEqual(4);
  expect(seenAt).toBeLessThanOrEqual(6);
  expect(await keyOf(page)).toBe(first);
  await page.keyboard.press('1');
  await page.keyboard.press('Escape');
  const r = (await rounds(page)).filter((x) => x.mode === 'LEARN')[0];
  expect(r.questions[seenAt - 1]).toMatchObject({ key: first, again: true });
  expect(r.questions.filter((q) => q.again)).toHaveLength(1);
});
