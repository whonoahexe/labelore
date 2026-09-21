// Runs exactly once per `npm run test:e2e` invocation, before any worker starts — unlike
// `test.beforeAll`, which Playwright re-runs on every fresh worker it spawns after a failing
// test (see the design note atop `results.ts`). This is the one place `results.json` is safe to
// reset: doing it here guarantees a clean slate for the run without ever risking a mid-run wipe
// of entries a since-discarded worker already wrote.
import { resetResults } from './results.ts';

export default function globalSetup(): void {
  resetResults();
}
