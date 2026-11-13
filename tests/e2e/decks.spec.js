// Learn decks beyond Probability, on the two sample decks (tests/decks-fixture.js, passed as window.AT_DECK_FIXTURES, so
// these tests do not depend on the decks the coach ships): the menu, Learn by keyboard, an exact typed answer, graph
// choices, the graph after an answer, the Graph sheet, hidden empty decks, and every card and reference graph drawn in
// both themes at phone and desktop width.
const { test, expect } = require('@playwright/test');
const { openApp, rounds, jump } = require('./helpers');
const DEFS = require('../decks-fixture.js');
const PFX = require('../proba-fixture.js');

async function open(page, hash, opts, defs) {
  await page.addInitScript((d) => { window.AT_DECK_FIXTURES = d; }, defs || DEFS);
  await page.addInitScript((fx) => { window.AT_PROBA_FIXTURE = fx; }, PFX);
  await openApp(page, hash, opts);
}
const cur = (page) => page.evaluate(() => {
  const q = document.querySelector('[data-testid="proba-question"]'), id = q.dataset.id;
  const deck = window.AT.Decks.list().find((d) => window.AT.Decks.api(d).bank().byId[id]), c = window.AT.Decks.api(deck).bank().byId[id];
  return { id: c.id, game: c.game, answer: c.answer };
});
// the position of the right choice on screen: text choices by their HTML, graph choices by their svg
const rightIndex = (page) => page.evaluate(() => {
  const q = document.querySelector('[data-testid="proba-question"]'), id = q.dataset.id;
  const deck = window.AT.Decks.list().find((d) => window.AT.Decks.api(d).bank().byId[id]), c = window.AT.Decks.api(deck).bank().byId[id];
  if (typeof c.answer === 'string') { const html = window.AT.TeX.rich(c.answer); return Array.from(q.querySelectorAll('.opt .ot')).findIndex((e) => e.innerHTML.includes(html)); }
  // a graph choice: the browser rewrites the svg markup, so compare the geometry of its first curve
  const t = document.createElement('template'); t.innerHTML = window.AT.Plot.svg(c.answer.plot, { size: 'choice' });
  const want = t.content.querySelector('.pl-curve').getAttribute('d');
  return Array.from(q.querySelectorAll('.opt .ot')).findIndex((e) => { const p = e.querySelector('.pl-curve'); return !!p && p.getAttribute('d') === want; });
});
const cell = (page, l, g) => page.getByTestId('proba-cell-' + l + '-' + g);

test('the Learn menu shows Probability as before and an Analysis section with the two sample decks, in order', async ({ page }) => {
  await open(page, 'learn');
  const headings = await page.locator('main h2.sec-h').allTextContents();
  const i = headings.indexOf('Probability');
  expect(i).toBeGreaterThan(0);
  expect(headings[i + 1]).toBe('Analysis');
  await expect(page.getByTestId('learn-lesson-proba')).toContainText('lectures 1–4');
  await expect(page.getByTestId('learn-lesson-proba')).toContainText('Not started');
  const analysis = page.locator('section.sec', { has: page.locator('h2.sec-h', { hasText: 'Analysis' }) });
  // the two fixture decks, in this order, among whatever other decks are shipped (Calculus, ODE…)
  const names = await analysis.locator('a.lesson .nm').allTextContents();
  expect(names.indexOf('Series & limits')).toBeGreaterThanOrEqual(0);
  expect(names.indexOf('Trigonometry')).toBeGreaterThan(names.indexOf('Series & limits'));
  await expect(page.getByTestId('learn-lesson-series')).toContainText('5 cards');
  await expect(page.getByTestId('learn-lesson-trig')).toContainText('2 cards');
  await page.getByTestId('learn-lesson-trig').click();
  await expect(page).toHaveURL(/#learn\/trig$/);
  await expect(page.getByTestId('proba-title')).toHaveText('Trigonometry');
  await expect(page.locator('.page-head .sub')).toContainText('2 cards, bank 2026-11-12-sample');
});

test('a deck hub: its own chapters and prefix, no scope switch, the progress table, and the settings are remembered', async ({ page }) => {
  await open(page, 'learn/series');
  await expect(page.getByTestId('proba-title')).toHaveText('Series & limits');
  await expect(page.locator('[data-pb-scope]')).toHaveCount(0);                    // the deck has no scopes
  await expect(page.getByTestId('proba-complements')).toHaveCount(0);              // and no complement cards
  await expect(page.locator('tr[data-lecture]')).toHaveCount(3);
  await expect(page.locator('tr[data-lecture="1"] th')).toContainText('S1');
  await expect(page.locator('tr[data-lecture="1"] th')).toContainText('Usual limits');
  await expect(page.locator('[data-pb-lec]')).toHaveText(['S1', 'S2', 'S3']);
  await expect(page.getByTestId('proba-total')).toHaveText('0 / 5');
  await expect(page.getByTestId('proba-total-S1')).toHaveText('0 / 3');
  await expect(page.getByTestId('deck-graphs')).toBeVisible();                     // it has a reference graph
  await page.locator('[data-pb-game="formulas"]').click();
  await page.locator('[data-pb-lec="3"]').click();
  await page.reload();
  await expect(page.locator('[data-pb-game="formulas"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-pb-lec="3"]')).toHaveAttribute('aria-pressed', 'false');
  const st = await page.evaluate(() => window.AT.data.settings);
  expect(st.decks.series).toMatchObject({ scope: 3, game: 'formulas', lectures: [1, 2] });
  expect(st.proba).toBeNull();                                                      // Probability's settings are its own
});

test('Learn by keyboard in a sample deck: an exact typed answer (e^6), the exact form in the feedback, saved under the deck', async ({ page }) => {
  await open(page, 'learn/series');
  await cell(page, 1, 'compute').click();
  await expect(page.getByTestId('proba-question')).toHaveAttribute('data-id', 'S1-one-plus-2-over-n-3n');
  await expect(page.getByTestId('proba-input')).toBeFocused();
  await page.getByTestId('proba-input').fill('x');                                 // the variable is not an answer
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-err')).toContainText('read that number');
  await expect(page.getByTestId('proba-err')).toContainText('exact value like pi/3');   // this deck takes exact answers
  await expect(page.getByTestId('proba-result')).toHaveCount(0);
  await page.getByTestId('proba-input').fill('e^5');                               // a clean miss
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-result')).toContainText('Not quite');
  await expect(page.getByTestId('proba-result')).toContainText('about 403.429');
  await expect(page.getByTestId('proba-result').locator('math').first()).toBeVisible();   // e^6 drawn as maths
  await page.keyboard.press('Enter');                                              // a pool of one: the card again
  await page.getByTestId('proba-input').fill('e^6');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-result')).toContainText('Right');
  await page.keyboard.press('Enter');
  await page.getByTestId('proba-input').fill('403,43');                            // the decimal works too
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-result')).toContainText('Right');
  await page.keyboard.press('Escape');
  const saved = (await rounds(page)).filter((r) => r.mode === 'LEARN');
  expect(saved).toHaveLength(1);
  expect(saved[0].settings.lesson).toBe('deck-series-learn');
  expect(saved[0].questions.map((q) => [q.correct, q.given])).toEqual([[false, 'e^5'], [true, 'e^6'], [true, '403,43']]);
  expect(saved[0].questions[0]).toMatchObject({ op: 'pb', id: 'S1-one-plus-2-over-n-3n', chapter: 1, game: 'compute' });
  expect(saved[0].questions[0].answer).toBe('e^6 ≈ 403.4288');
  expect(await page.evaluate(() => 'lecture' in window.AT.data.rounds[0].questions[0])).toBe(false);   // only Probability uses the lecture field
});

test('graph choices: a 2-column grid, keys 1–4 choose, the right graph is inverted and the wrong pick is marked', async ({ page }) => {
  await open(page, 'learn/trig');
  await cell(page, 2, 'laws').click();
  await expect(page.getByTestId('proba-question')).toHaveAttribute('data-id', 'T2-which-arctan');
  await expect(page.locator('.pb-graphs .opt')).toHaveCount(4);
  await expect(page.locator('.pb-graphs .opt svg.plot-choice')).toHaveCount(4);
  const cols = await page.locator('.pb-graphs').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(2);
  await expect(page.locator('.pb-graphs .opt[data-opt="0"] kbd')).toHaveText('1');
  const right = await rightIndex(page);
  expect(right).toBeGreaterThanOrEqual(0);
  const wrong = right === 1 ? 2 : 1;                                               // key 2 when it is a miss, else 3
  await page.keyboard.press(String(wrong + 1));
  await expect(page.getByTestId('proba-result')).toContainText('Not quite');
  await expect(page.locator('.pb-graphs .opt.right')).toHaveCount(1);
  await expect(page.locator('.pb-graphs .opt.chosen')).toHaveCount(1);
  await expect(page.locator('.pb-graphs .opt').nth(right)).toHaveClass(/right/);
  await expect(page.locator('.pb-graphs .opt').nth(wrong)).toHaveClass(/chosen/);
  await expect(page.getByTestId('proba-explain')).toContainText('odd, increasing');
  // the inverted graph is still drawn: its curve takes the row's text colour (the page background)
  const same = await page.evaluate(() => {
    const b = document.querySelector('.pb-graphs .opt.right'), c = b.querySelector('.pl-curve');
    return getComputedStyle(c).stroke === getComputedStyle(b).color;
  });
  expect(same).toBe(true);
  await page.keyboard.press('Escape');
  const q = (await rounds(page)).filter((r) => r.mode === 'LEARN')[0].questions[0];
  expect(q).toMatchObject({ id: 'T2-which-arctan', correct: false, chapter: 2 });
  expect(q.given).toMatch(/^graph of y = /);
  expect(q.answer).toBe('graph of y = atan(x)');
});

test('key 2 picks the second graph; H removes half of the wrong graphs', async ({ page }) => {
  await open(page, 'learn/trig');
  await cell(page, 2, 'laws').click();
  await expect(page.getByTestId('proba-question')).toHaveAttribute('data-id', 'T2-which-arctan');
  await page.keyboard.press('h');
  await expect(page.locator('.pb-graphs .opt')).toHaveCount(3);                    // 3 wrong graphs: 1 removed
  expect(await rightIndex(page)).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('2');
  await expect(page.getByTestId('proba-result')).toBeVisible();
  const picked = await page.evaluate(() => Array.from(document.querySelectorAll('.pb-graphs .opt')).findIndex((b) => /right|chosen/.test(b.className) && b.className.includes('chosen')) );
  const right = await rightIndex(page);
  if (right !== 1) expect(picked).toBe(1);                                         // the second one was the pick
  await page.keyboard.press('Escape');
  expect((await rounds(page))[0].questions[0].hinted).toBe(true);
});

test('a plot under the prompt, and the explanation plot after a miss', async ({ page }) => {
  await open(page, 'learn/series');
  await cell(page, 1, 'formulas').click();
  await expect(page.getByTestId('proba-question')).toHaveAttribute('data-id', 'S1-one-plus-x-over-n');
  await expect(page.getByTestId('deck-plot')).toHaveCount(0);                      // this card has no graph
  await page.keyboard.press(String((await rightIndex(page)) + 1));                  // right, so only the next card is missed
  await expect(page.getByTestId('proba-result')).toContainText('Right');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('proba-question')).toHaveAttribute('data-id', 'S1-asymptote-e');
  await expect(page.getByTestId('deck-plot').locator('svg.plot-prompt')).toBeVisible();
  await expect(page.getByTestId('deck-plot').locator('.pl-curve')).toHaveCount(1);
  await expect(page.getByTestId('deck-plot')).toContainText('y = (1 + 1/x)^x');       // the caption, plain text
  await expect(page.getByTestId('deck-explain-plot')).toHaveCount(0);              // only after answering
  const r = await rightIndex(page);
  await page.keyboard.press(String((r === 0 ? 1 : 0) + 1));                        // a miss
  await expect(page.getByTestId('proba-result')).toContainText('Not quite');
  await expect(page.getByTestId('deck-explain-plot').locator('svg')).toBeVisible();
  await expect(page.getByTestId('deck-explain-plot').locator('.pl-dash')).toHaveCount(1);   // the dashed y = e
  await expect(page.getByTestId('deck-explain-plot')).toContainText('dashed: y = e');
  await page.keyboard.press('Escape');
  // the end screen lists the missed card with its graphs
  await expect(page.getByTestId('proba-review').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('proba-review').locator('svg')).toHaveCount(2);    // plot and explainPlot
});

test('the Graph sheet: G or the button opens it, every reference graph is on it, Esc comes back', async ({ page }) => {
  await open(page, 'learn/trig');
  await page.keyboard.press('g');
  await expect(page).toHaveURL(/#learn\/trig\/graphs$/);
  await expect(page.getByTestId('proba-title')).toHaveText('Trigonometry: graph sheet');
  await expect(page.getByTestId('deck-sheet-item')).toHaveCount(2);
  await expect(page.getByTestId('deck-sheet-item').nth(0)).toContainText('arccos');
  await expect(page.getByTestId('deck-sheet-item').nth(1)).toContainText('arctan');
  await expect(page.getByTestId('deck-sheet-item').nth(0).locator('svg.plot-prompt')).toBeVisible();
  await expect(page.getByTestId('deck-sheet-item').nth(0).locator('circle')).toHaveCount(2);      // the two end points
  await expect(page.getByTestId('deck-sheet-item').nth(1).locator('.pl-guide')).toHaveCount(2);   // the asymptotes
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#learn\/trig$/);
  await expect(page.getByTestId('proba-progress')).toBeVisible();
  await page.getByTestId('deck-graphs').click();
  await expect(page.getByTestId('deck-sheet')).toBeVisible();
  await page.getByTestId('deck-graphs-back').click();
  await expect(page).toHaveURL(/#learn\/trig$/);
  // a deck without reference graphs has no sheet and no button; Probability neither
  await page.goto(page.url().replace(/#.*$/, '#learn/proba'));
  await expect(page.getByTestId('deck-graphs')).toHaveCount(0);
  await page.goto(page.url().replace(/#.*$/, '#learn/proba/graphs'));
  await expect(page.getByTestId('proba-progress')).toBeVisible();                  // falls back to the hub
});

test('a deck with no valid card is hidden from the menu and its page says so; a section with none disappears', async ({ page }) => {
  const warns = [];
  page.on('console', (m) => { if (m.type() === 'warning') warns.push(m.text()); });
  const broken = JSON.parse(JSON.stringify(DEFS));
  broken.series.cards = [{ id: 'nope' }];
  // the shipped decks of the same section are blanked too, so the section can disappear below
  const blank = (id, title, prefix) => ({ id, title, section: 'Analysis', idPrefix: prefix, version: 'v', chapters: { 1: 'x' }, scopes: null, cards: [] });
  broken.calculus = blank('calculus', 'Calculus', 'D');
  broken.ode = blank('ode', 'ODE', 'E');
  await open(page, 'learn', undefined, broken);
  await expect(page.getByTestId('learn-lesson-series')).toHaveCount(0);
  await expect(page.getByTestId('learn-lesson-trig')).toBeVisible();
  expect(warns.join('\n')).toContain('Series & limits: 1 invalid card');
  await page.goto(page.url().replace(/#.*$/, '#learn/series'));
  await expect(page.getByTestId('proba-empty')).toContainText('no valid cards');
  broken.trig.cards = [];
  const page2 = await page.context().newPage();
  await page2.addInitScript((d) => { window.AT_DECK_FIXTURES = d; }, broken);
  await page2.addInitScript((fx) => { window.AT_PROBA_FIXTURE = fx; }, PFX);
  await page2.clock.install({ time: new Date('2026-10-21T10:00:00') });
  await page2.goto(page.url().replace(/#.*$/, '#learn'));
  await expect(page2.locator('main')).not.toBeEmpty();
  await expect(page2.locator('main h2.sec-h', { hasText: 'Analysis' })).toHaveCount(0);
  await expect(page2.getByTestId('learn-lesson-proba')).toBeVisible();
  await page2.goto(page.url().replace(/#.*$/, '#learn/nonexistent'));
  await expect(page2.locator('main')).not.toBeEmpty();
});

test('a deck session leaves Stats alone, and with a Zetamac history the overview, mode and day screens are unchanged', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'stats', { history: true });
  const texts = async () => {
    const out = {};
    for (const hash of ['stats', 'stats/mode/P2', 'stats/day/2026-10-20']) {
      await page.goto(page.url().replace(/#.*$/, '#' + hash));
      await expect(page.locator('main')).not.toBeEmpty();
      out[hash] = await page.evaluate(() => document.querySelector('main').innerText);
    }
    return out;
  };
  const before = await texts();
  await page.goto(page.url().replace(/#.*$/, '#learn/series'));
  await cell(page, 2, 'truefalse').click();
  await page.keyboard.press('f');
  await page.keyboard.press('Escape');
  await page.goto(page.url().replace(/#.*$/, '#learn/trig'));
  await cell(page, 2, 'laws').click();
  await page.keyboard.press('1');
  await page.keyboard.press('Escape');
  expect((await rounds(page)).filter((r) => /^deck-/.test(r.settings.lesson || ''))).toHaveLength(2);
  expect(await texts()).toEqual(before);
  expect(errors).toEqual([]);
});

// ---------- every card and every reference graph, drawn ----------

for (const [scheme, width] of [['light', 1100], ['dark', 1100], ['light', 390], ['dark', 390]]) {
  test('every sample card and reference graph draws in the ' + scheme + ' theme at ' + width + ' px: no overflow, no NaN, no console error', async ({ page }) => {
    const problems = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 'learn/trig');
    await page.waitForSelector('[data-testid="proba-progress"]');
    const flags = await page.evaluate(() => {
      const T = window.AT.TeX, Plot = window.AT.Plot, Decks = window.AT.Decks, main = document.querySelector('main'), res = [];
      main.innerHTML = '<div id="scan"></div>';
      const host = document.getElementById('scan');
      const rich = (s) => T.rich(s), isG = (x) => x && typeof x === 'object';
      const choice = (ch) => isG(ch) ? '<span class="pl-choice">' + Plot.svg(ch.plot, { size: 'choice' }) + (ch.label ? '<span class="pl-label">' + rich(ch.label) + '</span>' : '') + '</span>' : rich(ch);
      const colour = (el) => getComputedStyle(el).color;
      const check = (id, where, el) => {
        if (el.scrollWidth > el.clientWidth + 1) res.push(id + ': ' + where + ' scrolls sideways (' + el.scrollWidth + ' > ' + el.clientWidth + ')');
        if (/\\[A-Za-z]/.test(el.innerText)) res.push(id + ': ' + where + ' shows raw TeX');
        el.querySelectorAll('svg').forEach((s) => {
          const w = s.getBoundingClientRect().width, p = s.parentElement.getBoundingClientRect().width;
          if (w > p + 1) res.push(id + ': a graph in ' + where + ' is wider than its box');
          if (!s.querySelector('.pl-curve, .pl-dash')) res.push(id + ': a graph in ' + where + ' draws no curve');
          if (/NaN|undefined|Infinity/.test(s.outerHTML)) res.push(id + ': a graph in ' + where + ' has NaN');
        });
      };
      Decks.list().filter((d) => d.id === 'series' || d.id === 'trig').forEach((d) => {   // the fixture decks; the shipped ones are scanned apart
        const D = Decks.api(d), b = D.bank();
        b.cards.forEach((c) => {
          const k = D.kind(c), choices = k === 'mcq' ? [c.answer].concat(c.distractors) : [], wrap = document.createElement('div');
          wrap.className = 'fq pb-q';
          wrap.innerHTML = '<p class="fq-prompt">' + rich(c.prompt) + '</p>' + (c.plot ? '<div class="pl-wrap">' + Plot.svg(c.plot) + '</div>' : '') +
            (k === 'mcq' ? '<ol class="fq-opts pb-opts' + (isG(c.answer) ? ' pb-graphs' : '') + '">' + choices.map((x, i) => '<li><button type="button" class="opt' + (i === 0 ? ' right' : i === 1 ? ' chosen' : '') + '" disabled><kbd>' + (i + 1) + '</kbd><span class="ot">' + choice(x) + '</span></button></li>').join('') + '</ol>' : '') +
            (c.hint ? '<p class="ty-hint"><b>Hint.</b> ' + rich(c.hint) + '</p>' : '') +
            '<div class="fq-result"><p class="fq-why"><b>Why.</b> ' + rich(c.explain) + '</p>' + (c.answerTex ? '<p>' + rich(c.answerTex) + '</p>' : '') + (c.explainPlot ? '<div class="pl-wrap">' + Plot.svg(c.explainPlot) + '</div>' : '') + '</div>';
          host.appendChild(wrap);
          check(c.id, 'the prompt', wrap.querySelector('.fq-prompt'));
          wrap.querySelectorAll('.ot').forEach((el, i) => check(c.id, 'choice ' + (i + 1), el));
          wrap.querySelectorAll('.pl-wrap').forEach((el, i) => check(c.id, 'plot ' + (i + 1), el));
          check(c.id, 'the explanation', wrap.querySelector('.fq-why'));
          // the inverted right answer keeps its text and its curve in the same colour; the others dim together
          wrap.querySelectorAll('.opt').forEach((o, i) => { o.querySelectorAll('.pl-curve').forEach((p) => { if (getComputedStyle(p).stroke !== colour(o)) res.push(c.id + ': a graph in choice ' + (i + 1) + ' has another colour than its row'); }); });
        });
        b.reference.forEach((r) => {
          const fig = document.createElement('figure'); fig.className = 'pl-fig'; fig.innerHTML = '<figcaption>' + r.title + '</figcaption>' + Plot.svg(r.plot);
          const g = document.createElement('div'); g.className = 'pl-sheet'; g.appendChild(fig); host.appendChild(g);
          check(d.id + ' reference ' + r.title, 'the sheet', fig);
        });
      });
      return res;
    });
    expect(flags).toEqual([]);
    // and the real screens: the Graph sheet and a graph question, once each, at this width
    await page.goto(page.url().replace(/#.*$/, '#learn/trig/graphs'));
    await expect(page.getByTestId('deck-sheet')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto(page.url().replace(/#.*$/, '#learn/trig'));
    await cell(page, 2, 'laws').click();
    await expect(page.locator('.pb-graphs')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const cols = await page.locator('.pb-graphs').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(width <= 420 ? 1 : 2);                                       // one column on a phone
    expect(problems).toEqual([]);
  });
}
