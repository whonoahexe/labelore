// The PLAN page's "Planned" fact for a plan with no quick-id date (quick-261006-iz6, sketch 019 B):
// the git author date of the commit that ADDED a file under the target's `.planning/`. A read-only,
// cached, never-throwing call (T-iz6-04): `git` runs through `execFile` with an argument array and no
// shell, the path comes from the artifact index (discovered files, never request input) and is
// re-validated here, `--` precedes it, `core.fsmonitor` is switched off (a repository's config must not
// be able to start a hook while the index is refreshed), git is told never to take an optional lock (so
// it never writes the target's index — the tool stays read-only), never to prompt and never to page,
// and the output is validated as a date before it is trusted. Any failure — not a repository, git
// missing, a timeout, an unexpected line — gives null and the page falls back to the file's mtime.
import { execFile } from 'node:child_process';

export type GitRunner = (args: string[], options: { cwd: string }) => Promise<string>;

const TIMEOUT_MS = 3000;
const MAX_BUFFER = 1024 * 1024;
const MAX_CACHE_ENTRIES = 4096;

const defaultRunner: GitRunner = (args, { cwd }) =>
  new Promise<string>((resolve, reject) => {
    execFile(
      'git',
      args,
      {
        cwd,
        timeout: TIMEOUT_MS,
        maxBuffer: MAX_BUFFER,
        windowsHide: true,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat' },
      },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      },
    );
  });

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

/** `2026-08-03T22:12:52+05:30` (also `Z` or no zone): checked character by character. */
function isIsoDateTime(text: string): boolean {
  if (text.length < 19) return false;
  const shape = [0, 1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18];
  for (const index of shape) if (!isDigit(text[index])) return false;
  if (text[4] !== '-' || text[7] !== '-' || text[10] !== 'T' || text[13] !== ':' || text[16] !== ':') return false;
  const zone = text.slice(19);
  if (zone === '' || zone === 'Z') return true;
  if (zone.length !== 6 || (zone[0] !== '+' && zone[0] !== '-') || zone[3] !== ':') return false;
  return isDigit(zone[1]) && isDigit(zone[2]) && isDigit(zone[4]) && isDigit(zone[5]);
}

/** The root must be an absolute path; the file must sit under `.planning/` with no `..` segment,
 * NUL or backslash and must not start with `-`. */
function isSafe(rootPath: string, relativePath: string): boolean {
  if (rootPath === '' || !rootPath.startsWith('/')) return false;
  if (rootPath.includes('\0') || relativePath.includes('\0') || relativePath.includes('\\')) return false;
  if (relativePath.startsWith('-') || !relativePath.startsWith('.planning/')) return false;
  return !relativePath.split('/').includes('..');
}

export interface FileDates {
  /** The author date (ISO, as git printed it) of the commit that added `relativePath`, or null. */
  addedAt(relativePath: string): Promise<string | null>;
}

export function createFileDates(rootPath: string, run: GitRunner = defaultRunner): FileDates {
  const cache = new Map<string, Promise<string | null>>();

  async function lookup(relativePath: string): Promise<string | null> {
    try {
      const output = await run(
        ['-c', 'core.fsmonitor=false', '--no-pager', 'log', '--diff-filter=A', '--follow', '--format=%aI', '--', relativePath],
        { cwd: rootPath },
      );
      const lines = String(output)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
      const oldest = lines[lines.length - 1];
      return oldest !== undefined && isIsoDateTime(oldest) ? oldest : null;
    } catch {
      return null;
    }
  }

  return {
    addedAt(relativePath: string): Promise<string | null> {
      if (typeof relativePath !== 'string' || !isSafe(rootPath, relativePath)) return Promise.resolve(null);
      const cached = cache.get(relativePath);
      if (cached) return cached;
      if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
      const pending = lookup(relativePath);
      cache.set(relativePath, pending);
      return pending;
    },
  };
}
