// Playwright end-to-end tests. The app is opened straight from disk (file://), like you do by double-clicking.
// Uses the installed Google Chrome, so no browser download is needed.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // 4 workers, not the default half of the cores (6 here): each test runs a whole Chrome, and at 6 the machine was
  // oversubscribed. Tests that take 2 s alone took 20–35 s in bursts, and sync and Taylor tests timed out (11-12:
  // 4 failures in 425 runs). Measured on 2 repeats: 4 workers ran 56.6 s, slowest 3.6 s; 6 workers 69.5 s, slowest 5.8 s.
  workers: process.env.CI ? undefined : 4,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  // Only sync.spec.js uses it; the other specs open index.html from disk.
  webServer: { command: 'node tests/e2e/server.js', url: 'http://localhost:4173/index.html', reuseExistingServer: !process.env.CI },
  use: {
    channel: 'chrome',
    trace: 'on-first-retry',
    viewport: { width: 1100, height: 900 },
    testIdAttribute: 'data-testid'
  }
});
