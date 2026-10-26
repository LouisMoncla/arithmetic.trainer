// Shared helpers for the E2E specs. Each test gets a fresh browser context, so localStorage starts empty,
// exactly like a first double-click. Pass { history: true } to start with one zetamac.com session yesterday.
const path = require('path');
const { pathToFileURL } = require('url');
const { expect } = require('@playwright/test');
const { zetamacSession } = require('../fixtures');

const APP_URL = pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).href;

// A fixed "now" so day-based logic (sessions, the fixture dated yesterday) is deterministic.
const NOW = new Date('2026-10-21T10:00:00');

// Install the fake clock before the page loads, open the app at an optional hash route, then pause
// time so it only moves when a test says so (tick). Natural flow raced with fastForward and made a test flaky.
async function openApp(page, hash, opts) {
  await page.clock.install({ time: NOW });
  if (opts && opts.history) {
    // Written before the app loads, and only into an empty store, so reloads keep what the test did.
    await page.addInitScript(({ key, rounds }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, rounds, presets: [], settings: {} }));
    }, { key: 'arithmeticTrainer.v1', rounds: zetamacSession(NOW.getTime()) });
  }
  await page.goto(APP_URL + (hash ? '#' + hash : ''));
  await expect(page.locator('main')).not.toBeEmpty();
  await page.clock.pauseAt(new Date(NOW.getTime() + 60000));
}

// Solve a question as shown on screen ("56 ÷ 7", "132 − 47", "65²", "8% of 25"…).
function solve(shown) {
  let m;
  if ((m = /^(\d+) \+ (\d+)$/.exec(shown))) return +m[1] + +m[2];
  if ((m = /^(\d+) − (\d+)$/.exec(shown))) return m[1] - m[2];
  if ((m = /^(\d+) × (\d+)$/.exec(shown))) return m[1] * m[2];
  if ((m = /^(\d+) ÷ (\d+)$/.exec(shown))) return m[1] / m[2];   // tricks: 3 ÷ 8 → 0.375
  if ((m = /^(\d+)²$/.exec(shown))) return m[1] * m[1];
  if ((m = /^(\d+)% of (\d+)$/.exec(shown))) return m[1] * m[2] / 100;
  throw new Error('Cannot solve ' + shown);
}

// Advance time, firing every timer due on the way (the game ticks every 50 ms).
const tick = (page, ms) => page.clock.runFor(ms);

// Start whatever the home screen has selected, and skip the 3-2-1 countdown.
async function startSelected(page) {
  await page.keyboard.press('Enter');
  await tick(page, 3100);
  await expect(page.getByTestId('game-question')).not.toHaveText(/^[123]$/);
}

const answerBox = page => page.getByRole('textbox', { name: 'Answer' });

// A question answered as a fraction in lowest terms ("0.375", "1/4 + 1/8"): [numerator, denominator], else null.
function solveFraction(shown) {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let m, n, d;
  if ((m = /^0\.(\d+)$/.exec(shown))) { n = +m[1]; d = 10 ** m[1].length; }
  else if ((m = /^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)$/.exec(shown))) {
    d = m[2] * m[5]; n = m[1] * m[5] + (m[3] === '+' ? 1 : -1) * m[4] * m[2];
  } else return null;
  const g = gcd(n, d);
  return [n / g, d / g];
}

// Type the correct answer to the current question; returns the question text.
// A fraction goes in two boxes: the numerator, then (focus moves by itself) the denominator.
async function answerCurrent(page) {
  const shown = (await page.getByTestId('game-question').textContent()).trim();
  const fr = solveFraction(shown);
  if (fr) {
    await page.getByRole('textbox', { name: 'Numerator' }).pressSequentially(String(fr[0]));
    await expect(page.getByRole('textbox', { name: 'Denominator' })).toBeFocused();
    await page.keyboard.type(String(fr[1]));
  } else await answerBox(page).pressSequentially(String(solve(shown)));
  return shown;
}

const rounds = page => page.evaluate(() => window.AT.data.rounds);
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

module.exports = { APP_URL, NOW, openApp, tick, solve, solveFraction, startSelected, answerBox, answerCurrent, rounds, dayKey };
