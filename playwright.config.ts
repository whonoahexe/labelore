import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// quick-260921-l4e: dedicated Playwright harness for the Phase 5 document-page foundation
// sweep. Port 4199 is deliberate — 4173 is owned by the running systemd Labelore instance and
// must never be reused, restarted, or rebuilt (T-l4e-01). `reuseExistingServer: false` is the
// enforcement mechanism: Playwright always starts its own fresh server on 4199 rather than
// attaching to whatever happens to be listening there.
//
// quick-260923-lju: a second, read-only webServer entry targets ~/studio-portal on port 4198,
// added only when that project's `.planning/` exists locally — the CONTEXT brief e2e spec's
// studio-portal fixtures (SP 01/04, SP quick 2pr, …) resolve against it and `test.skip` when it's
// absent. 4198 is deliberate, not 4173/4174 (the running labelore.service and the sketch server,
// which C-5 forbids touching or restarting) and not 4199 (this file's own primary harness server).
const studioPortalPlanningDir = join(homedir(), 'studio-portal', '.planning');
const studioPortalAvailable = existsSync(studioPortalPlanningDir);

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
  webServer: [
    {
      command: 'node src/server/index.ts . --port 4199',
      url: 'http://127.0.0.1:4199/api/dashboard',
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    ...(studioPortalAvailable
      ? [
          {
            command: `node src/server/index.ts ${homedir()}/studio-portal --port 4198`,
            url: 'http://127.0.0.1:4198/api/dashboard',
            reuseExistingServer: false,
            timeout: 90_000,
            stdout: 'ignore' as const,
            stderr: 'pipe' as const,
          },
        ]
      : []),
  ],
});
