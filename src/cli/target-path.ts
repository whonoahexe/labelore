// Resolves the user-supplied CLI path argument into a canonicalized project root. Canonicalization
// happens exactly once, here — every downstream caller receives only the canonicalized path and
// never re-derives it (PITFALLS #9). Delegates the actual disk touches to src/planning-fs/local-fs.ts
// so this file never imports node:fs directly — local-fs.ts stays the sole node:fs importer under
// src/ (DATA-01's boundary).
import { homedir } from 'node:os';
import { join, resolve, basename, dirname } from 'node:path';
import type { FailedLoadStatus } from '../planning-repo/types.ts';
import { canonicalizePath, pathExistsSync, statPathSync } from '../planning-fs/local-fs.ts';

export interface ResolvedTarget {
  rootPath: string;
  planningDir: string;
}

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
        message: `Cannot read ${absolute}: permission denied`,
      };
    }
    return {
      status: 'path-not-found',
      pathChecked: absolute,
      rawPath,
      message: `No such path: ${rawPath} (resolved: ${absolute})`,
    };
  }
  const resolvedPath = canonicalized.resolved;

  const stat = statPathSync(resolvedPath);
  if (!stat) {
    return {
      status: 'path-not-found',
      pathChecked: resolvedPath,
      rawPath,
      message: `No such path: ${rawPath} (resolved: ${resolvedPath})`,
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

  if (pathExistsSync(join(resolvedPath, '.planning'))) {
    return { rootPath: resolvedPath, planningDir: '.planning' };
  }
  if (looksLikePlanningDir(resolvedPath) && hasProjectMarker(resolvedPath)) {
    return { rootPath: dirname(resolvedPath), planningDir: '.planning' };
  }

  return {
    status: 'not-a-gsd-project',
    pathChecked: resolvedPath,
    message: `${resolvedPath} exists but contains no .planning/ directory`,
  };
}
