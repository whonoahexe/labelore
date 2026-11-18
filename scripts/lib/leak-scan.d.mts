// Types for scripts/lib/leak-scan.mjs, so strict TypeScript tests can import the .mjs.

export interface LeakNames {
  words: string[];
  hosts: string[];
}

/** `word` and `host` come from a file's text; `name` is a private word in a path segment. */
export type LeakKind = 'word' | 'host' | 'name';

export interface TextFinding {
  kind: 'word' | 'host';
  /** The term's position in its own list, never the term itself. */
  index: number;
  line: number;
}

export interface Finding {
  path: string;
  kind: LeakKind;
  /** The term's position in its own list, never the term itself. */
  index: number;
  /** 1-based; 0 for a path finding. */
  line: number;
}

export interface TarEntry {
  path: string;
  /** The tar typeflag character: '0' file, '5' directory, '1' hard link, '2' symlink. */
  type: string;
  body: Buffer;
}

export function wordRegex(word: string, flags: string): RegExp;
export function lineOf(text: string, index: number): number;
export function scanText(text: string, names: LeakNames): TextFinding[];
export function scanTree(root: string, names: LeakNames): Finding[];
export function readNamesFile(path: string): LeakNames;
export function tarEntries(buffer: Buffer): Generator<TarEntry, void, undefined>;
export function readTarball(tgzPath: string): { buffer: Buffer; entries: TarEntry[] };
export function scanTarball(entries: readonly TarEntry[], names: LeakNames): Finding[];
