// The folder scan (PLAT-05, D-15): finds the GSD projects under a folder the user names, so they can be
// picked and remembered. It walks only through the listing function it is given and imports no
// filesystem module, so tests run it over synthetic trees and the real listing (listChildEntries in
// local-fs.ts) is the only thing that touches a disk.
//
// The rules that keep the scan from becoming a directory-listing oracle (SEC-05, T-08-23 to T-08-25):
// the folder must sit inside $HOME, checked by its text before any disk call and by its real path
// after; the walk never follows a symbolic link, skips folders whose name starts with '.' and every
// node_modules folder, goes two levels below the folder, and stops at 100 results or 5,000 visited
// folders. Nothing here runs unless a request asks for it (D-16).
import { resolve, sep } from 'node:path';
import { expandTilde } from '../cli/target-path.ts';
import type { CanonicalizeOutcome, ChildEntry, StatOutcome } from '../planning-fs/local-fs.ts';
import { homeShortened } from '../presentation/project-list.ts';

/** How many folder levels below the scanned folder are searched (the folder itself is depth 0). */
export const SCAN_MAX_DEPTH = 2;
/** The most projects one scan reports. */
export const SCAN_RESULT_CAP = 100;
/** The most folders one scan lists before it stops, whatever it has found. */
export const SCAN_DIRECTORY_VALVE = 5000;

/** The longest folder text a scan accepts (the same bound as an added target). */
const MAX_FOLDER_LENGTH = 1024;

export const SCAN_MESSAGES = {
  outsideHome: (folder: string): string => `${folder} is outside your home folder. Labelore only scans folders inside it.`,
  missing: (folder: string): string => `There is no folder at ${folder}.`,
  notAFolder: (folder: string): string => `${folder} is a file, not a folder.`,
  unreadable: (folder: string): string => `Labelore cannot read ${folder}: permission denied.`,
  empty: 'Enter a folder to scan.',
} as const;

/** The directory listing the walk goes through: null for a folder that cannot be read. */
export type ScanListing = (absDir: string) => Promise<ChildEntry[] | null>;

export interface ResolveScanFolderDeps {
  /** The home folder the scan is confined to. */
  home: string;
  canonicalize: (absPath: string) => CanonicalizeOutcome;
  stat: (absPath: string) => StatOutcome | null;
}

export type ScanFolderResolution =
  | {
      ok: true;
      /** The canonical (real) path the walk starts from. */
      folder: string;
      /** The path as the user will read it: the typed folder, home-shortened. */
      display: string;
      /** The canonical home, for shortening the canonical paths the walk reports. */
      canonicalHome: string;
    }
  | { ok: false; error: string };

function insideOrEqual(path: string, root: string): boolean {
  if (path === root) return true;
  return path.startsWith(root.endsWith(sep) ? root : root + sep);
}

/**
 * Turns the typed folder into the one real folder the walk may start from. Never throws. The text check
 * runs before any disk call, so a folder outside home is refused without a single read; a folder inside
 * home that resolves through a symlink to somewhere outside is refused after its real path is checked.
 */
export function resolveScanFolder(raw: unknown, deps: ResolveScanFolderDeps): ScanFolderResolution {
  if (typeof raw !== 'string') return { ok: false, error: SCAN_MESSAGES.empty };
  const typed = raw.trim();
  if (typed.length < 1 || typed.length > MAX_FOLDER_LENGTH || typed.includes('\0')) {
    return { ok: false, error: SCAN_MESSAGES.empty };
  }

  const home = resolve(deps.home);
  const lexical = resolve(expandTilde(typed, home));
  const display = homeShortened(lexical, home);
  if (!insideOrEqual(lexical, home)) return { ok: false, error: SCAN_MESSAGES.outsideHome(display) };

  const real = deps.canonicalize(lexical);
  if (!real.ok) {
    const denied = real.code === 'EACCES' || real.code === 'EPERM';
    return { ok: false, error: denied ? SCAN_MESSAGES.unreadable(display) : SCAN_MESSAGES.missing(display) };
  }
  const realHome = deps.canonicalize(home);
  const canonicalHome = realHome.ok ? realHome.resolved : home;
  if (!insideOrEqual(real.resolved, canonicalHome)) {
    return { ok: false, error: SCAN_MESSAGES.outsideHome(display) };
  }

  const stat = deps.stat(real.resolved);
  if (stat === null) return { ok: false, error: SCAN_MESSAGES.unreadable(display) };
  if (!stat.isDirectory) return { ok: false, error: SCAN_MESSAGES.notAFolder(display) };
  return { ok: true, folder: real.resolved, display, canonicalHome };
}

export interface ScanOptions {
  root: string;
  list: ScanListing;
  maxDepth: number;
  cap: number;
  valve: number;
}

export interface ScanOutcome {
  /** The folders holding a .planning directory, in path order (code-unit order). */
  found: string[];
  /** True when the walk stopped early at the result cap or the visited-folder valve. */
  capped: boolean;
}

function codeUnitOrder(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * Walks breadth first from `root` (depth 0) through `list`. A folder holding a .planning directory (not
 * a symlink) is a hit; the walk descends into child directories that are not symlinks, do not start with
 * '.' and are not node_modules, while the depth is below `maxDepth`. A hit does not stop the descent, so
 * a project nested inside a project is found too. Never throws.
 */
export async function scanForProjects(options: ScanOptions): Promise<ScanOutcome> {
  const { root, list, maxDepth, cap, valve } = options;
  const found: string[] = [];
  let capped = false;
  let visited = 0;
  let queue: string[] = [root];

  for (let depth = 0; queue.length > 0 && !capped; depth += 1) {
    const next: string[] = [];
    for (const dir of queue) {
      if (visited >= valve) {
        capped = true;
        break;
      }
      visited += 1;
      const entries = await list(dir);
      if (entries === null) continue;
      const hit = entries.some((entry) => entry.name === '.planning' && entry.isDirectory && !entry.isSymlink);
      if (hit) {
        if (found.length >= cap) {
          capped = true;
          break;
        }
        found.push(dir);
      }
      if (depth >= maxDepth) continue;
      for (const entry of entries) {
        if (!entry.isDirectory || entry.isSymlink) continue;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        next.push(dir.endsWith(sep) ? dir + entry.name : dir + sep + entry.name);
      }
    }
    queue = next;
  }

  return { found: found.sort(codeUnitOrder), capped };
}
