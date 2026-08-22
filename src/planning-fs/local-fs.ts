// Layer A — Node-backed implementation. This is the ONLY file under src/ permitted to import the
// Node filesystem module (DATA-01's boundary — enforced by an acceptance-criteria grep, not just
// convention).
import { readdirSync, readFileSync, statSync, existsSync, realpathSync, accessSync, constants } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { DirEntry, FileRead, FsCapabilities, PlanningFilesystem } from './types.ts';

/** Thrown when a resolved read/list target lies outside the canonicalized project root. */
export class PathEscapeError extends Error {
  readonly relPath: string;
  readonly resolvedTarget: string;

  constructor(relPath: string, resolvedTarget: string) {
    super(`Path escapes project root: ${relPath} resolved to ${resolvedTarget}`);
    this.name = 'PathEscapeError';
    this.relPath = relPath;
    this.resolvedTarget = resolvedTarget;
  }
}

/**
 * Node-backed PlanningFilesystem. Constructed from an already-canonicalized absolute root path
 * (canonicalization happens once, upstream, in src/cli/target-path.ts — this class never
 * re-derives it).
 */
export class LocalFsPlanningFilesystem implements PlanningFilesystem {
  readonly capabilities: FsCapabilities = { watch: false, write: false };
  private readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Joins relPath onto the root, canonicalizes the result, and throws PathEscapeError if the
   * canonicalized result does not lie inside the canonicalized root. Every read and list goes
   * through this — it is the containment guard for symlinks encountered inside the tree.
   */
  private resolveContained(relPath: string): string {
    const joined = join(this.rootPath, relPath);
    // realpathSync requires the target to exist; fall back to the joined (non-canonicalized) path
    // for existence checks on paths that don't exist yet — those are handled by callers via ENOENT.
    let resolved: string;
    try {
      resolved = realpathSync(joined);
    } catch {
      // Path doesn't exist (or a component doesn't) — let the caller's fs call surface the real error.
      resolved = joined;
    }
    const rootWithSep = this.rootPath.endsWith(sep) ? this.rootPath : this.rootPath + sep;
    if (resolved !== this.rootPath && !resolved.startsWith(rootWithSep)) {
      throw new PathEscapeError(relPath, resolved);
    }
    return joined;
  }

  async list(relDir: string): Promise<DirEntry[]> {
    const abs = this.resolveContained(relDir);
    return readdirSync(abs, { withFileTypes: true }).map((d) => ({
      name: d.name,
      isDirectory: d.isDirectory(),
    }));
  }

  async read(relPath: string): Promise<FileRead> {
    const abs = this.resolveContained(relPath);
    const stat = statSync(abs);
    return { content: readFileSync(abs, 'utf8'), mtimeMs: stat.mtimeMs, size: stat.size };
  }

  async exists(relPath: string): Promise<boolean> {
    try {
      const abs = this.resolveContained(relPath);
      return existsSync(abs);
    } catch {
      return false;
    }
  }
}

// Re-exported for src/cli/target-path.ts and callers that need to express a path relative to a
// resolved root without importing node:path directly.
export function toProjectRelative(rootPath: string, absPath: string): string {
  return relative(rootPath, absPath) || '.';
}

// The three raw fs primitives src/cli/target-path.ts needs to canonicalize the user-supplied CLI
// argument BEFORE any PlanningFilesystem can be constructed. Exported from here — not called
// directly from node:fs anywhere else under src/ — so this file stays the sole node:fs importer
// (DATA-01's boundary, enforced by an acceptance-criteria grep over `from 'node:fs'`).

export type CanonicalizeOutcome =
  | { ok: true; resolved: string }
  | { ok: false; code: 'ENOENT' | 'EACCES' | 'EPERM' | 'OTHER' };

/** Wraps realpathSync, translating thrown errors into a discriminated result instead of a throw. */
export function canonicalizePath(absPath: string): CanonicalizeOutcome {
  try {
    return { ok: true, resolved: realpathSync(absPath) };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') return { ok: false, code };
    if (code === 'ENOENT') return { ok: false, code: 'ENOENT' };
    return { ok: false, code: 'OTHER' };
  }
}

export function pathExistsSync(absPath: string): boolean {
  return existsSync(absPath);
}

export interface StatOutcome {
  isDirectory: boolean;
}

/** Wraps statSync, returning null instead of throwing when the path is unreadable/missing. */
export function statPathSync(absPath: string): StatOutcome | null {
  try {
    const stat = statSync(absPath);
    return { isDirectory: stat.isDirectory() };
  } catch {
    return null;
  }
}

export type AccessOutcome = { ok: true } | { ok: false; code: 'EACCES' | 'EPERM' | 'OTHER' };

/**
 * Checks read+traverse access on a directory without throwing. `statPathSync`/`realpathSync`
 * alone are not enough to detect a mode-000 directory: `stat` only needs execute permission on
 * the *parent*, so a directory whose own permissions were stripped still stats fine and
 * `existsSync` on a child path just swallows the resulting EACCES and returns false — which a
 * caller could otherwise misread as "no .planning child" (not-a-gsd-project) instead of
 * permission-denied. This is the single accessSync call target-path.ts needs to tell the two
 * apart.
 */
export function checkReadAccessSync(absPath: string): AccessOutcome {
  try {
    accessSync(absPath, constants.R_OK | constants.X_OK);
    return { ok: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') return { ok: false, code };
    return { ok: false, code: 'OTHER' };
  }
}
