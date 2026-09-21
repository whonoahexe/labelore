import { defineConfig, devices } from '@playwright/test';

// quick-260921-l4e: dedicated Playwright harness for the Phase 5 document-page foundation
// sweep. Port 4199 is deliberate — 4173 is owned by the running systemd Labelore instance and
// must never be reused, restarted, or rebuilt (T-l4e-01). `reuseExistingServer: false` is the
// enforcement mechanism: Playwright always starts its own fresh server on 4199 rather than
// attaching to whatever happens to be listening there.
export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './test/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 300_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4199',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node src/server/index.ts . --port 4199',
    url: 'http://127.0.0.1:4199/api/dashboard',
    reuseExistingServer: false,
    timeout: 90_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
