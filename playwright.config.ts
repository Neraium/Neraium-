import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROME_BIN || undefined;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    browserName: 'chromium',
    colorScheme: 'light',
    launchOptions: executablePath ? { executablePath } : undefined,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && python3 -m http.server 8080 --bind 127.0.0.1 --directory dist',
    url: 'http://127.0.0.1:8080/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  projects: [
    { name: 'mobile-320x800', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 800 } } },
    { name: 'mobile-375x812', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } } },
    { name: 'tablet-768x1024', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'tablet-1024x768', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } },
    { name: 'desktop-1440x1000', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'desktop-1920x1080', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
});
