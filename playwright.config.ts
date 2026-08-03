import { defineConfig } from '@playwright/test';

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
    colorScheme: 'dark',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'python3 -m http.server 8080 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8080/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  projects: [
    {
      name: 'desktop-1440x1000',
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'tablet-1024x768',
      use: { viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'mobile-390x844',
      use: { viewport: { width: 390, height: 844 }, isMobile: true },
    },
    {
      name: 'mobile-430x932',
      use: { viewport: { width: 430, height: 932 }, isMobile: true },
    },
  ],
});
