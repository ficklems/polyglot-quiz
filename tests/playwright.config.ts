import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';
const apiURL = process.env.API_URL ?? 'http://127.0.0.1:3000';
// Locally you can run against an installed browser: PW_CHANNEL=chrome npm run test:e2e
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: 'api/**/*.api.spec.ts',
      use: { baseURL: apiURL },
    },
    {
      name: 'chromium',
      testMatch: 'e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], channel },
    },
    {
      name: 'firefox',
      testMatch: 'e2e/**/*.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: 'e2e/**/*.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: 'e2e/**/*.spec.ts',
      use: { ...devices['Pixel 7'], channel },
    },
    {
      name: 'mobile-safari',
      testMatch: 'e2e/**/*.spec.ts',
      use: { ...devices['iPhone 15'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start -w @pq/api',
      cwd: '..',
      url: `${apiURL}/api/health`,
      env: { DB_PATH: ':memory:', LOG_LEVEL: 'warn', PORT: '3000' },
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: 'npm run build -w @pq/web && npm run preview -w @pq/web',
      cwd: '..',
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
