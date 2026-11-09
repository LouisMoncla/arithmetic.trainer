// Finance tab (key Q): options, sprint in the round overlay, practice / intuition / interview mix on the page,
// saving, end screens with worked answers, progress, Log. Answers come from the same engine in Node:
// a question is reproducible from (template, seed), which #finance/q/<id>/<seed> opens.
const { test, expect } = require('@playwright/test');
const { openApp, tick, solve, rounds } = require('./helpers');
const F = require('../../js/finance-bank.js');
const TeX = require('../../js/tex.js');

// Text as a screen reader gets it: each drawn formula replaced by its plain twin (its alttext), spaces normalised.
const plainOf = (loc) => loc.evaluate((el) => {
  const c = el.cloneNode(true);
  c.querySelectorAll('math').forEach((m) => m.replaceWith(m.getAttribute('alttext')));
  return c.textContent.replace(/\s+/g, ' ').trim();
});
const questionText = (page) => plainOf(page.getByTestId('game-question'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const box = (page) => page.getByTestId('finance-answer');

// Turn the sprint's families on or off until exactly `want` are chosen.
async function families(page, want) {
  for (const f of ['arith', 'quant', 'fin']) {
    const b = page.getByTestId('finance-fam-' + f), on = (await b.getAttribute('aria-pressed')) === 'true';
    if (want.includes(f) !== on && want.includes(f)) await b.click();
  }
  for (const f of ['arith', 'quant', 'fin']) {
    const b = page.getByTestId('finance-fam-' + f), on = (await b.getAttribute('aria-pressed')) === 'true';
    if (want.includes(f) !== on) await b.click();
  }
}

async function startSprint(page) {
  await page.getByTestId('finance-start-button').click();
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).not.toHaveText(/^[123]$/);
}

test('Q opens Finance; options are toggles that persist', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('q');
  await expect(page).toHaveURL(/#finance$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finance');
  await expect(page.getByRole('link', { name: 'Finance' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('finance-mode-sprint')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('finance-fam-quant')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('finance-fam-intuition')).toHaveCount(0);   // sprints are typed answers only
  await page.getByTestId('finance-duration-60').click();
  await page.getByTestId('finance-mode-practice').click();
  await page.getByTestId('finance-fam-intuition').click();
  await page.getByTestId('finance-answer-choice').click();
  await page.getByTestId('finance-topic').selectOption('Bonds');
  await page.reload();
  await expect(page.getByTestId('finance-mode-practice')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('finance-fam-intuition')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('finance-answer-choice')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('finance-topic')).toHaveValue('Bonds');
  await page.getByTestId('finance-mode-sprint').click();
  await expect(page.getByTestId('finance-duration-60')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('finance-progress')).toContainText('Nothing yet');
});

test('Sprint: exact answers are taken as typed, Tab skips, the end screen explains every question', async ({ page }) => {
  await openApp(page, 'finance');
  await families(page, ['arith']);
  await startSprint(page);
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId('game-question').locator('math')).toHaveCount(1);   // drawn as maths
    await page.getByRole('textbox', { name: 'Answer' }).pressSequentially(String(solve(await questionText(page))));
    await expect(page.getByTestId('game-score')).toHaveText('Score: ' + (i + 1));
  }
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('game-score')).toHaveText('Score: 3');
  await tick(page, 121000);
  await expect(page.getByTestId('end-score')).toHaveText('3');
  await expect(page.locator('.end-head')).toContainText('Finance sprint, 120 s');
  const all = page.getByTestId('end-all-questions');
  await expect(all.locator('details')).toHaveCount(4);   // 3 right and 1 skipped; the one cut off by the clock is left out
  await all.locator('summary').first().click();
  await expect(all.locator('details').first()).toContainText('Answer: ');
  await expect(all.locator('details').nth(3)).toContainText('Skipped');
  const last = (await rounds(page)).at(-1);
  expect(last.mode).toBe('FINANCE');
  expect(last.settings).toMatchObject({ kind: 'sprint', duration: 120, fams: ['arith'] });
  expect(last.score).toBe(3);
  expect(last.questions[0]).toMatchObject({ op: 'fin', fam: 'arith', correct: true, wrongAttempts: 0 });
  expect(last.questions[0].tpl).toMatch(/^arith\./);
  expect(last.questions[3]).toMatchObject({ skipped: true, correct: false });
  expect(last.questions[4].unanswered).toBe(true);
});

test('Sprint: an estimate is not taken as typed, Enter checks it within the tolerance', async ({ page }) => {
  await openApp(page, 'finance');
  await families(page, ['quant']);
  await page.getByTestId('finance-topic').selectOption('Squares and powers');
  await page.getByTestId('finance-diff-2').click();   // only √x ≈ ? is medium here
  await startSprint(page);
  const q = await questionText(page);
  const x = Number(/^√(\d+) ≈ \?$/.exec(q)[1]);
  await expect(page.getByTestId('game-fraction-hint')).toHaveText('Answer approximately, within 1%.');
  const input = page.getByRole('textbox', { name: 'Answer' });
  await input.pressSequentially(String((Math.sqrt(x) * 1.5).toFixed(2)));   // wrong
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-score')).toHaveText('Score: 0');
  await input.fill('');
  await input.pressSequentially(String((Math.sqrt(x) * 1.006).toFixed(2)));   // within 1%, not the displayed answer
  await expect(page.getByTestId('game-score')).toHaveText('Score: 0');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-score')).toHaveText('Score: 1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finance');
});

test('Practice: a seed link reproduces a question; a wrong answer shows the worked steps; S gives new numbers', async ({ page }) => {
  const q = F.make('fin.bond.price.1y', 12345);
  await openApp(page, 'finance/q/fin.bond.price.1y/12345');
  expect(await plainOf(page.locator('#fq-prompt'))).toBe(q.promptText);
  await expect(page.getByTestId('finance-unit')).toHaveText('€');
  await box(page).fill('abc');
  await box(page).press('Enter');
  await expect(page.locator('#fq-err')).toHaveText('Type a number, like 4.5.');
  await box(page).fill(String(q.answer + 3));
  await box(page).press('Enter');
  const res = page.getByTestId('finance-result');
  await expect(res).toContainText('Not quite.');
  await expect(res).toContainText('the answer is ' + q.answerText);
  // the formula is drawn as maths (MathML): a real fraction, with the plain formula as its alternative text
  const math = res.locator('.fq-formula math');
  await expect(math).toHaveAttribute('alttext', TeX.plain(q.tex));
  await expect(math.locator('mfrac')).toHaveCount(1);
  expect((await math.boundingBox()).height).toBeGreaterThan(30);   // stacked, not one line of text
  const resText = await plainOf(res);
  for (const s of q.stepsText) expect(resText).toContain(norm(s));
  expect(await res.locator('.fq-steps math').count()).toBeGreaterThanOrEqual(2);   // the worked steps are drawn as maths too
  await expect(page.getByTestId('finance-next')).toBeFocused();
  await page.keyboard.press('s');
  await expect(page.getByTestId('finance-result')).toHaveCount(0);
  await expect(page.getByTestId('finance-question')).toContainText('1-year bond');
  const q2 = await plainOf(page.getByTestId('finance-question'));
  // answer the new one right, from the engine, via its code shown after answering
  await box(page).fill('1');
  await box(page).press('Enter');
  const code = (await res.locator('.small .num').textContent()).trim();   // "fin.bond.price.1y #123"
  const [, tpl, seed] = /^(\S+) #(\d+)$/.exec(code);
  expect(tpl).toBe('fin.bond.price.1y');
  expect(q2).toContain(F.make(tpl, Number(seed)).promptText);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('end-score')).toHaveText('0');
  const last = (await rounds(page)).at(-1);
  expect(last.settings).toMatchObject({ kind: 'practice', only: ['fin.bond.price.1y'] });
  expect(last.questions).toHaveLength(2);
  expect(last.questions[0]).toMatchObject({ tpl: 'fin.bond.price.1y', seed: 12345, correct: false, cat: 'Bonds' });
});

test('Intuition: keys 1–4 choose, the explanation says why, C opens the related calculation', async ({ page }) => {
  const q = F.make('int.rk.backtest.many', 7);
  await openApp(page, 'finance/q/int.rk.backtest.many/7');
  await expect(page.getByTestId('finance-option-' + (q.correct + 1))).toContainText('underestimates');
  await page.keyboard.press(String(q.correct + 1));
  const res = page.getByTestId('finance-result');
  await expect(res).toContainText('Right.');
  expect(await plainOf(res)).toContain(norm(q.whyText));
  await expect(page.getByTestId('finance-option-' + (q.correct + 1))).toContainText('Right answer');
  await page.keyboard.press('c');
  await expect(page.getByTestId('finance-question')).toContainText('Expected number of exceptions');
  await expect(box(page)).toBeFocused();
  await page.getByTestId('finance-done').click();
  await expect(page.getByTestId('end-score')).toHaveText('1');
});

test('Interview mix: 20 questions, getting harder, then a score per topic', async ({ page }) => {
  await openApp(page, 'finance');
  await page.getByTestId('finance-mode-mixed').click();
  await page.getByTestId('finance-start-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Interview mix');
  for (let i = 1; i <= 20; i++) {
    await expect(page.locator('.page-head .sub')).toContainText('Question ' + i + ' of 20');
    if (await page.getByTestId('finance-option-1').count()) await page.keyboard.press('1');
    else {
      await box(page).fill('1');
      await box(page).press('Enter');
      if (!(await page.getByTestId('finance-result').count())) { await box(page).fill('1/2'); await box(page).press('Enter'); }
    }
    await expect(page.getByTestId('finance-result')).toBeVisible();
    await page.getByTestId('finance-next').press('Enter');
  }
  await expect(page.getByTestId('finance-by-topic')).toBeVisible();
  await expect(page.locator('.end-head')).toContainText('Finance interview mix');
  const last = (await rounds(page)).at(-1);
  expect(last.settings).toMatchObject({ kind: 'mixed', count: 20 });
  expect(last.questions).toHaveLength(20);
  expect(new Set(last.questions.map((x) => x.fam)).size).toBe(4);
});

test('Leaving mid-session saves it; progress, weak spots and Log show finance rounds', async ({ page }) => {
  const q = F.make('fin.var.gauss', 42);
  await openApp(page, 'finance/q/fin.var.gauss/42');
  await box(page).fill('1');
  await box(page).press('Enter');
  await expect(page.getByTestId('finance-result')).toContainText('Not quite.');
  await page.keyboard.press('p');   // leave for Play: the session is saved on the way out
  await expect(page).toHaveURL(/#play$/);
  // The hash changes at once; the save runs when hashchange routes, so wait for Play to draw.
  await expect(page.getByTestId('play-modes')).toBeVisible();
  const last = (await rounds(page)).at(-1);
  expect(last).toMatchObject({ mode: 'FINANCE', score: 0 });
  expect(last.questions[0]).toMatchObject({ tpl: 'fin.var.gauss', seed: 42, answer: q.answerText });
  await page.keyboard.press('q');
  const prog = page.getByTestId('finance-progress');
  await expect(prog).toContainText('Right first try');
  await expect(page.getByTestId('finance-topic-accuracy')).toContainText('Risk');
  await expect(page.getByTestId('finance-weakest')).toContainText('VaR');
  await page.getByTestId('finance-weakest').getByRole('button', { name: 'Practise' }).click();
  await expect(page.getByTestId('finance-question')).toContainText('1-day VaR');
  await page.keyboard.press('Escape');   // nothing answered: nothing saved, back to the Finance page
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finance');
  expect(await rounds(page)).toHaveLength(1);
  await page.keyboard.press('a');
  await expect(page.getByTestId('stats-modes').getByRole('button', { name: 'Finance practice' })).toBeVisible();
});

// Squares and powers at Easy, as plain text: "47²" or "2¹¹".
const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const squareOrPower = (shown) => {
  const m = /^2([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(shown);
  return m ? 2 ** Number([...m[1]].map((c) => SUPD.indexOf(c)).join('')) : solve(shown);
};

test('Sprint: H pauses to learn (clock stopped, formula and solution), then the question comes back for no point', async ({ page }) => {
  await openApp(page, 'finance');
  await families(page, ['quant']);
  await page.getByTestId('finance-topic').selectOption('Squares and powers');
  await page.getByTestId('finance-diff-1').click();
  await page.getByTestId('finance-duration-60').click();
  await startSprint(page);
  const input = page.getByRole('textbox', { name: 'Answer' });
  await expect(page.getByTestId('game-question').locator('math')).toHaveCount(1);   // 47² or 2¹¹, drawn as maths
  const shown = await questionText(page);
  const right = squareOrPower(shown);
  await input.pressSequentially(String(right + 1));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-method')).toHaveText('Not right. Press H to pause and learn.');
  await tick(page, 2000);
  await page.keyboard.press('h');
  const panel = page.getByTestId('game-learn-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('The answer is ' + right);
  await expect(panel).toContainText('Formula');
  await expect(panel.locator('.fq-formula math')).toBeVisible();
  await expect(panel.locator('li').first()).toBeVisible();
  await expect(page.getByTestId('game-timer')).toHaveText('Paused');
  await tick(page, 20000);   // reading time: the clock does not move
  await expect(page.getByTestId('game-timer')).toHaveText('Paused');
  await page.keyboard.press('Enter');
  await expect(panel).toBeHidden();
  await expect(page.getByTestId('game-timer')).toHaveText('58');   // 2 s were played before the pause
  await expect(page.getByTestId('game-method')).toHaveText('Type the answer to go on. No point for this one.');
  await expect(input).toHaveValue('');
  await input.pressSequentially(String(right));
  await expect.poll(() => questionText(page)).not.toBe(shown);
  await expect(page.getByTestId('game-score')).toHaveText('Score: 0');
  await expect(page.getByTestId('game-method')).toBeHidden();
  // the button pauses too, and Back to the round resumes
  await page.getByTestId('game-learn').click();
  await expect(panel).toBeVisible();
  await page.getByTestId('game-resume').click();
  await expect(panel).toBeHidden();
  await tick(page, 61000);
  await expect(page.getByTestId('stat-fin-learned')).toContainText('2');
  const all = page.getByTestId('end-all-questions');
  await expect(all.locator('summary').first()).toContainText('Paused to learn');
  const q0 = (await rounds(page)).at(-1).questions[0];
  expect(q0).toMatchObject({ learned: true, correct: false, wrongAttempts: 1, given: String(right) });
  expect(q0.pausedMs).toBeGreaterThanOrEqual(20000);
  expect(q0.timeMs).toBeLessThan(5000);   // the pause is not counted as solving time
});

// Long finance prompts plus the worked solution are taller than a phone or a short window: the round screen must
// scroll from the top, with the question in view, instead of centring and pushing the question out of reach.
for (const vp of [{ width: 390, height: 844 }, { width: 1100, height: 600 }, { width: 1366, height: 768 }, { width: 1280, height: 600 }]) {
  test(`Sprint at ${vp.width} × ${vp.height}: pausing keeps the question in view and Back reachable`, async ({ page }) => {
    await page.setViewportSize(vp);
    await openApp(page, 'finance');
    await families(page, ['fin']);
    await page.getByTestId('finance-topic').selectOption('Risk');
    await page.getByTestId('finance-diff-3').click();   // expected shortfall and two-asset VaR: long prompts and steps
    await startSprint(page);
    await expect(page.getByTestId('game-learn')).toBeInViewport();
    const before = await page.getByTestId('game-question').boundingBox();
    await page.getByTestId('game-learn').click();
    await expect(page.getByTestId('game-learn-panel')).toBeVisible();
    await expect(page.getByTestId('game-question')).toBeInViewport({ ratio: 1 });   // all of it, not just a sliver
    // the question keeps its full height: it was squeezed to a sliver when the solution was taller than the window
    expect((await page.getByTestId('game-question').boundingBox()).height).toBeGreaterThanOrEqual(before.height - 1);
    await expect(page.getByTestId('game-timer')).toHaveText('Paused');
    const back = page.getByTestId('game-resume');
    await back.scrollIntoViewIfNeeded();
    await expect(back).toBeInViewport();
    await back.click();
    await expect(page.getByTestId('game-learn-panel')).toBeHidden();
    await expect(page.getByTestId('game-question')).toBeInViewport({ ratio: 1 });   // all of it, not just a sliver
    await expect(page.getByRole('textbox', { name: 'Answer' })).toBeFocused();
    // H again, then H to resume; the clock runs after it
    await page.keyboard.press('h');
    await expect(page.getByTestId('game-learn-panel')).toBeVisible();
    await expect(page.getByTestId('game-question')).toBeInViewport({ ratio: 1 });   // all of it, not just a sliver
    await page.keyboard.press('h');
    await expect(page.getByTestId('game-learn-panel')).toBeHidden();
    await tick(page, 5000);
    await expect(page.getByTestId('game-timer')).toHaveText('1:55');
  });
}