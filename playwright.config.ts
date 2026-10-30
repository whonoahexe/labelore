import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { FIXTURE_ROOT, SHAPES_FIXTURE_ROOT, resolveFixtureRoot } from './test/e2e/fixture-root.ts';

// Four servers, all started fresh on every run (`reuseExistingServer: false` is the enforcement:
// Playwright never attaches to whatever happens to be listening).
//   4199 is the repo itself (quick-260921-l4e), the harness for the document-page sweep.
//   4198 is the made-up Lendshed project committed at test/fixtures/lendshed (D-01, D-05). It is always
//        started; resolveFixtureRoot throws at config load when that folder has no `.planning`, so a
//        missing fixture fails the run instead of skipping specs.
//   4197 is the made-up Shapes project (test/fixtures/shapes) through the development server, for the
//        deep-reload spec (NAV-10). Always started, same fail-loud rule as 4198.
//   4196 is the same Shapes project served by the built app: its command runs `npm run build` and then
//        `npm start` (NODE_ENV=production serving the fresh ./dist), so the built leg of the deep-reload
//        spec can never drive a stale bundle, and a failing build fails the run.
// 4173 and 4174 belong to the user's running instances and are never touched.
// Every server is ready when GET /api/projects answers (the registry app has no root-level project routes)
// and runs with its own temporary LABELORE_CONFIG_DIR, so no browser run reads or writes the user's real
// settings file (D-09). The main process removes the directories on exit; a worker that merely loads this
// config leaves them alone.
const fixtureRoot = resolveFixtureRoot(FIXTURE_ROOT);
const shapesRoot = resolveFixtureRoot(SHAPES_FIXTURE_ROOT);

const settingsDirs: string[] = [];
if (process.env.TEST_WORKER_INDEX === undefined) {
  process.on('exit', () => {
    for (const dir of settingsDirs) rmSync(dir, { recursive: true, force: true });
  });
}

/** The environment of the server on `port`: this process's own plus a settings directory of its own. */
function serverEnv(port: number): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), `labelore-pw-${port}-`));
  settingsDirs.push(dir);
  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) if (value !== undefined) env[name] = value;
  env.LABELORE_CONFIG_DIR = dir;
  return env;
}

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
      url: 'http://127.0.0.1:4199/api/projects',
      env: serverEnv(4199),
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `node src/server/index.ts ${fixtureRoot} --port 4198`,
      url: 'http://127.0.0.1:4198/api/projects',
      env: serverEnv(4198),
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `node src/server/index.ts ${shapesRoot} --port 4197`,
      url: 'http://127.0.0.1:4197/api/projects',
      env: serverEnv(4197),
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npm run build && npm start -- ${shapesRoot} --port 4196`,
      url: 'http://127.0.0.1:4196/api/projects',
      env: serverEnv(4196),
      reuseExistingServer: false,
      // The build runs first inside the same command.
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
