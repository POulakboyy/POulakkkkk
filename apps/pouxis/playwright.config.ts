import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end suite for the web client (`npm run e2e -w @pouxis/app`).
 *
 * Runs against the Vite dev server on a dedicated port. Locally, `PW_CHROMIUM_PATH` may point to
 * a preinstalled Chromium when the bundled revision is not downloaded; CI installs its own.
 */
const PORT = 4190;
const BASE_URL = `http://localhost:${PORT}`;
const CI = !!process.env.CI;
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Pixel 7 runs on Chromium: an iPhone-sized touch viewport without needing WebKit.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
