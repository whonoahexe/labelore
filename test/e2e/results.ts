// The sweep's results accumulator: every check the spec runs calls `softCheck`, which records a
// machine-readable entry (pass/fail/waived) and — unless the entry is waived by
// `known-per-type.json` — asserts through `expect.soft` so one page's failure never hides the
// rest of the matrix.
//
// `record()` reads-modifies-writes `results.json` on every call rather than accumulating in a
// module-scope array flushed once at the end. This is deliberate, not defensive-programming
// paranoia: Playwright restarts the worker *process* after a failing test (a documented
// isolation guarantee — https://playwright.dev/docs/test-retries#failures), which resets every
// module-scope variable in this file. With `workers: 1` and `fullyParallel: false` the whole
// suite is still strictly sequential — never two tests running concurrently — but it is *not*
// one continuous process when any test fails, which every sweep test here can. An in-memory
// accumulator flushed only in a single top-level `test.afterAll` silently loses every entry
// recorded by a worker that got discarded after a failure; only the final surviving worker's
// entries would ever reach disk. Reading and writing per call costs a little I/O but is correct
// regardless of how many times the worker process is recycled mid-run.
//
// `test/e2e/global-setup.ts` resets `results.json` to `[]` exactly once per `npm run test:e2e`
// invocation (Playwright's `globalSetup` hook runs once for the whole run, never per worker),
// so a fresh run always starts from a clean slate no matter how many worker restarts follow.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { expect } from '@playwright/test';
import { SCREENSHOT_ROOT } from './pages.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_PER_TYPE_PATH = join(__dirname, 'known-per-type.json');
const RESULTS_PATH = join(SCREENSHOT_ROOT, 'results.json');

export interface Waiver {
  page: string;
  check: string;
  reason: string;
}

export interface ResultEntry {
  check: string;
  page: string;
  theme: 'light' | 'dark';
  width: number;
  pass: boolean;
  detail: string;
  waived: boolean;
}

let waivers: Waiver[] | null = null;

function loadWaivers(): Waiver[] {
  if (waivers) return waivers;
  try {
    const raw = readFileSync(KNOWN_PER_TYPE_PATH, 'utf8');
    waivers = JSON.parse(raw) as Waiver[];
  } catch {
    waivers = [];
  }
  return waivers;
}

export function isWaived(page: string, check: string): boolean {
  return loadWaivers().some((w) => w.page === page && w.check === check);
}

function readEntries(): ResultEntry[] {
  try {
    return JSON.parse(readFileSync(RESULTS_PATH, 'utf8')) as ResultEntry[];
  } catch {
    return [];
  }
}

export function record(entry: {
  check: string;
  page: string;
  theme: 'light' | 'dark';
  width: number;
  pass: boolean;
  detail: string;
}): void {
  const existing = readEntries();
  existing.push({ ...entry, waived: isWaived(entry.page, entry.check) });
  mkdirSync(SCREENSHOT_ROOT, { recursive: true });
  writeFileSync(RESULTS_PATH, JSON.stringify(existing, null, 2));
}

/** The only assertion path every check should use: records the outcome (so `results.json` is
 * complete even when a check is waived or failing) and, unless waived, asserts through
 * `expect.soft` so the sweep keeps visiting every remaining page. */
export function softCheck(
  check: string,
  pageId: string,
  theme: 'light' | 'dark',
  width: number,
  condition: boolean,
  detail: string,
): void {
  record({ check, page: pageId, theme, width, pass: condition, detail });
  if (isWaived(pageId, check)) return;
  expect.soft(condition, `${check} ${pageId} ${theme}@${width}: ${detail}`).toBe(true);
}

/** Resets `results.json` to an empty array. Called exactly once per run, from
 * `test/e2e/global-setup.ts` — never from within a test or a per-worker hook, both of which can
 * run more than once per `npm run test:e2e` invocation. */
export function resetResults(): void {
  mkdirSync(SCREENSHOT_ROOT, { recursive: true });
  writeFileSync(RESULTS_PATH, JSON.stringify([], null, 2));
}

/** Kept as a no-op-safe alias for spec files that still call it in `test.afterAll` — every entry
 * is already durable on disk by the time `record()` returns, so this only guarantees a valid
 * `results.json` exists even for a run whose every test was skipped before recording anything. */
export function writeResults(): void {
  mkdirSync(SCREENSHOT_ROOT, { recursive: true });
  writeFileSync(RESULTS_PATH, JSON.stringify(readEntries(), null, 2));
}
