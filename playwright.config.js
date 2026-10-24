// Playwright end-to-end tests. The app is opened straight from disk (file://), like you do by double-clicking.
// Uses the installed Google Chrome, so no browser download is needed.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
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
