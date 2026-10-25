// Shared text-scan helpers for the standing source-scan tests (class vocabulary, raw-HTML sinks).
// Plain text and regex only — no AST tooling — matching the idiom of test/web/css-source-order.test.ts.
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Blanks `//` line comments and `/* … *\/` block comments with equal-length whitespace so
 * offsets/line counts are preserved and quoted strings inside comments are never scanned. */
export function blankComments(source: string): string {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    if (source[i] === '/' && source[i + 1] === '/') {
      let j = i;
      while (j < n && source[j] !== '\n') j++;
      out += ' '.repeat(j - i);
      i = j;
      continue;
    }
    if (source[i] === '/' && source[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(source[j] === '*' && source[j + 1] === '/')) j++;
      j = Math.min(j + 2, n);
      out += source.slice(i, j).replace(/[^\n]/g, ' ');
      i = j;
      continue;
    }
    out += source[i];
    i++;
  }
  return out;
}

export interface WalkSourceOptions {
  /** Path segments (or `a/b` segment runs) to leave out, e.g. `components/ui`. */
  skip?: string[];
}

/** Walks `roots` (repo-relative directories) from the repo root and returns every file whose name
 * ends with one of `extensions`, as sorted repo-relative forward-slash paths. `node_modules` and
 * any `options.skip` segments are never entered. */
export function walkSource(
  roots: string[],
  extensions: string[],
  options: WalkSourceOptions = {},
): string[] {
  const skip = (options.skip ?? []).map((s) =>
    s
      .split('\\')
      .join('/')
      .replace(/^\/|\/$/g, ''),
  );
  const skipped = (rel: string): boolean => {
    const padded = `/${rel}/`;
    return skip.some((segment) => padded.includes(`/${segment}/`));
  };
  const results: string[] = [];
  for (const root of roots) {
    const stack = [join(REPO_ROOT, root)];
    while (stack.length) {
      const dir = stack.pop()!;
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry === 'node_modules') continue;
        const abs = join(dir, entry);
        const rel = relative(REPO_ROOT, abs).split('\\').join('/');
        if (skipped(rel)) continue;
        if (statSync(abs).isDirectory()) {
          stack.push(abs);
          continue;
        }
        if (extensions.some((ext) => entry.endsWith(ext))) results.push(rel);
      }
    }
  }
  return [...new Set(results)].sort();
}
