import { defineConfig, devices } from '@playwright/test';
import { FIXTURE_ROOT, resolveFixtureRoot } from './test/e2e/fixture-root.ts';

// Two servers, both started fresh on every run (`reuseExistingServer: false` is the enforcement:
// Playwright never attaches to whatever happens to be listening).
//   4199 is the repo itself (quick-260921-l4e), the harness for the document-page sweep.
//   4198 is the made-up Lendshed project committed at test/fixtures/lendshed (D-01, D-05). It is always
//        started; resolveFixtureRoot throws at config load when that folder has no `.planning`, so a
//        missing fixture fails the run instead of skipping specs.
// 4173 and 4174 belong to the user's running instances and are never touched.
const fixtureRoot = resolveFixtureRoot(FIXTURE_ROOT);

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  // A page loads in ~2s, so a minute is plenty; a broken wait fails in a minute, not five.
  timeout: 60_000,
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
  webServer: [
    {
      command: 'node src/server/index.ts . --port 4199',
      url: 'http://127.0.0.1:4199/api/dashboard',
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `node src/server/index.ts ${fixtureRoot} --port 4198`,
      url: 'http://127.0.0.1:4198/api/dashboard',
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
