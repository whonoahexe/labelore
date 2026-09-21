// The sweep's results accumulator: every check the spec runs calls `softCheck`, which records a
// machine-readable entry (pass/fail/waived) and — unless the entry is waived by
// `known-per-type.json` — asserts through `expect.soft` so one page's failure never hides the
// rest of the matrix. `workers: 1` in playwright.config.ts is what makes this module-scope array
// safe: the whole run is one process.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { expect } from '@playwright/test';
import { SCREENSHOT_ROOT } from './pages.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_PER_TYPE_PATH = join(__dirname, 'known-per-type.json');

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

let entries: ResultEntry[] = [];
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

export function record(entry: {
  check: string;
  page: string;
  theme: 'light' | 'dark';
  width: number;
  pass: boolean;
  detail: string;
}): void {
  entries.push({ ...entry, waived: isWaived(entry.page, entry.check) });
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

/** Resets the in-memory accumulator — used only by test.beforeAll in case a future runner
 * invokes the suite more than once per process. */
export function resetResults(): void {
  entries = [];
}

export function writeResults(): void {
  mkdirSync(SCREENSHOT_ROOT, { recursive: true });
  writeFileSync(join(SCREENSHOT_ROOT, 'results.json'), JSON.stringify(entries, null, 2));
}
