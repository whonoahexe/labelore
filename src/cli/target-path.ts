// Resolves the user-supplied CLI path argument into a canonicalized project root. Canonicalization
// happens exactly once, here — every downstream caller receives only the canonicalized path and
// never re-derives it (PITFALLS #9). Delegates the actual disk touches to src/planning-fs/local-fs.ts
// so this file never imports node:fs directly — local-fs.ts stays the sole node:fs importer under
// src/ (DATA-01's boundary). `canonicalizePath` below wraps node:fs's `realpathSync` internally;
// it is named here in the module doc so a search for "realpathSync" finds this file's role without
// this file itself needing to import node:fs.
import { homedir } from 'node:os';
import { join, resolve, basename, dirname } from 'node:path';
import type { FailedLoadStatus, LoadStatus } from '../planning-repo/types.ts';
import { canonicalizePath, pathExistsSync, statPathSync, checkReadAccessSync } from '../planning-fs/local-fs.ts';

export interface ResolvedTarget {
  rootPath: string;
  planningDir: string;
}

interface MessageContext {
  pathChecked: string;
  rawPath?: string;
}

/**
 * D-12's four LoadStatus message strings, in one place, so the wording never drifts between
 * call sites and Phase 4's error screens can reuse it verbatim. Each message names the exact
 * path that was inspected; the missing-path message additionally names the raw argument as
 * typed, since a user who passed a relative path needs to see what it resolved to.
 */
export const LOAD_STATUS_MESSAGES: Readonly<Record<LoadStatus['status'], (ctx: MessageContext) => string>> = {
  ok: () => '',
  'path-not-found': ({ rawPath, pathChecked }) => `No such path: ${rawPath} (resolved: ${pathChecked})`,
  'not-a-gsd-project': ({ pathChecked }) => `${pathChecked} exists but contains no .planning/ directory`,
  'permission-denied': ({ pathChecked }) => `Cannot read ${pathChecked}: permission denied`,
};

function expandTilde(raw: string): string {
  // Node does not expand `~` itself, and the argument arrives through `npm run --` and through
  // Vitest without a guaranteed shell pass.
  if (raw === '~') return homedir();
  if (raw.startsWith('~/')) return join(homedir(), raw.slice(2));
  return raw;
}

function looksLikePlanningDir(candidate: string): boolean {
  return basename(candidate) === '.planning';
}

function hasProjectMarker(planningDirAbs: string): boolean {
  return pathExistsSync(join(planningDirAbs, 'PROJECT.md')) || pathExistsSync(join(planningDirAbs, 'STATE.md'));
}

/**
 * Resolves the raw CLI argument to a canonicalized project root plus its `.planning` subdirectory
 * name (always `.planning`, whether the argument named the project root or `.planning` directly).
 * Returns a non-`ok` LoadStatus on any failure — never throws.
 */
export function resolveTargetPath(rawPath: string): ResolvedTarget | FailedLoadStatus {
  const tildeExpanded = expandTilde(rawPath);
  const absolute = resolve(tildeExpanded);

  const canonicalized = canonicalizePath(absolute);
  if (!canonicalized.ok) {
    if (canonicalized.code === 'EACCES' || canonicalized.code === 'EPERM') {
      return {
        status: 'permission-denied',
        pathChecked: absolute,
        message: LOAD_STATUS_MESSAGES['permission-denied']({ pathChecked: absolute }),
      };
    }
    return {
      status: 'path-not-found',
      pathChecked: absolute,
      rawPath,
      message: LOAD_STATUS_MESSAGES['path-not-found']({ pathChecked: absolute, rawPath }),
    };
  }
  const resolvedPath = canonicalized.resolved;

  const stat = statPathSync(resolvedPath);
  if (!stat) {
    return {
      status: 'path-not-found',
      pathChecked: resolvedPath,
      rawPath,
      message: LOAD_STATUS_MESSAGES['path-not-found']({ pathChecked: resolvedPath, rawPath }),
    };
  }

  if (!stat.isDirectory) {
    return {
      status: 'path-not-found',
      pathChecked: resolvedPath,
      rawPath,
      message: `${resolvedPath} is a file, not a directory (resolved from ${rawPath})`,
    };
  }

  // `stat`/`realpathSync` alone can't see a mode-000 directory: stat only needs execute on the
  // *parent*, so the directory itself stats fine, and the existsSync checks below would silently
  // swallow the resulting EACCES and read as "no .planning child" — misclassifying
  // permission-denied as not-a-gsd-project. Check access explicitly before trusting those results.
  const access = checkReadAccessSync(resolvedPath);
  if (!access.ok && (access.code === 'EACCES' || access.code === 'EPERM')) {
    return {
      status: 'permission-denied',
      pathChecked: resolvedPath,
      message: LOAD_STATUS_MESSAGES['permission-denied']({ pathChecked: resolvedPath }),
    };
  }

  if (pathExistsSync(join(resolvedPath, '.planning'))) {
    return { rootPath: resolvedPath, planningDir: '.planning' };
  }
  if (looksLikePlanningDir(resolvedPath) && hasProjectMarker(resolvedPath)) {
    return { rootPath: dirname(resolvedPath), planningDir: '.planning' };
  }

  return {
    status: 'not-a-gsd-project',
    pathChecked: resolvedPath,
    message: LOAD_STATUS_MESSAGES['not-a-gsd-project']({ pathChecked: resolvedPath }),
  };
}
