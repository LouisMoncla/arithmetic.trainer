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

// Solve a Zetamac question as shown on screen ("56 ÷ 7", "132 − 47"…).
function solve(shown) {
  let m;
  if ((m = /^(\d+) \+ (\d+)$/.exec(shown))) return +m[1] + +m[2];
  if ((m = /^(\d+) − (\d+)$/.exec(shown))) return m[1] - m[2];
  if ((m = /^(\d+) × (\d+)$/.exec(shown))) return m[1] * m[2];
  if ((m = /^(\d+) ÷ (\d+)$/.exec(shown))) return m[1] / m[2];
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

// Type the correct answer to the current question; returns the question text.
async function answerCurrent(page) {
  const shown = (await page.getByTestId('game-question').textContent()).trim();
  await answerBox(page).pressSequentially(String(solve(shown)));
  return shown;
}

const rounds = page => page.evaluate(() => window.AT.data.rounds);
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

module.exports = { APP_URL, NOW, openApp, tick, solve, startSelected, answerBox, answerCurrent, rounds, dayKey };
