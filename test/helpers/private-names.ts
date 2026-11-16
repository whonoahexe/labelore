// The single reader of the private deny list (quick-261116-r41, shared since quick-261117-0ne).
// The list is `.leak-names.local.json` at the repo root, gitignored and never tracked, shaped
// {"words": [...], "hosts": [...]}. test/fixture-leak.test.ts and test/no-skips.test.ts read it here.
// When the file is absent (a fresh clone, CI) callers get empty lists by design and scan with nothing
// to match, never skipping.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Where the private deny list lives: gitignored, local only, never tracked. */
export const NAMES_FILE = '.leak-names.local.json';

export interface PrivateNames {
  /** Private project and product names. A hyphen inside a word also matches a run of whitespace, so
   * the two-word capitalised form of a hyphenated name is caught too. */
  words: string[];
  /** Private host names. */
  hosts: string[];
}

function isNameList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

export function readPrivateNames(path: string): PrivateNames {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const record = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>;
  if (!isNameList(record.words) || !isNameList(record.hosts)) {
    throw new Error(`${NAMES_FILE} must be {"words": string[], "hosts": string[]} with non-empty strings`);
  }
  return { words: record.words, hosts: record.hosts };
}

/** The real deny list under `root`, or empty lists when the local file is absent (never an early return or a skip). */
export function localPrivateNames(root: string): PrivateNames {
  return existsSync(join(root, NAMES_FILE)) ? readPrivateNames(join(root, NAMES_FILE)) : { words: [], hosts: [] };
}
