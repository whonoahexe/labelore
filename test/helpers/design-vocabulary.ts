// D-08/D-09: the docs/design-language.md parser and the view-local namespace matcher, extracted
// verbatim from test/web/class-vocabulary.test.ts (quick-260921-l4e Task 2) so the Playwright
// foundation-consistency sweep can read the same sanctioned-tone table and view-local pattern
// instead of maintaining a second copy. Behaviour is unchanged from the vitest file's original
// inline versions — `test/web/class-vocabulary.test.ts` now imports these from here.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Vocabulary {
  classes: Set<string>;
  tones: Set<string>;
}

/** Splits the doc on `## ` section headings; within each section, every line matching
 * `| \`token\` |` (token = `[a-z][a-z0-9-]*`) registers a name. A section whose heading starts
 * with "Tones" feeds `tones`; every other section feeds `classes`. */
export function parseVocabulary(markdown: string): Vocabulary {
  const classes = new Set<string>();
  const tones = new Set<string>();
  const lines = markdown.split('\n');
  let currentSet: Set<string> | null = classes;
  const rowPattern = /^\|\s*`([a-z][a-z0-9-]*)`\s*\|/;

  for (const line of lines) {
    const headingMatch = /^##\s+(.*)$/.exec(line);
    if (headingMatch) {
      currentSet = headingMatch[1].trim().startsWith('Tones') ? tones : classes;
      continue;
    }
    if (!currentSet) continue;
    const rowMatch = rowPattern.exec(line);
    if (rowMatch) currentSet.add(rowMatch[1]);
  }

  return { classes, tones };
}

/** `^view-(p1|p2|…)-[a-z0-9-]+$` with each prefix regex-escaped (kinds contain hyphens, e.g.
 * `discussion-log`, `milestone-audit`). A bare `view-x` (no kind segment) never matches. */
export function viewLocalPattern(prefixes: readonly string[]): RegExp {
  const escaped = prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^view-(${escaped.join('|')})-[a-z0-9-]+$`);
}

/** A template-literal static segment that immediately precedes a `${…}` interpolation carries
 * this marker so checkTokens treats it as a prefix rather than a whole-name match. Mirrors the
 * marker extractClassTokens (test/web/class-vocabulary.test.ts) produces. */
const PREFIX_MARKER = '\u0000PREFIX';

/** Checks a list of raw tokens (as produced by extractClassTokens, PREFIX_MARKER intact)
 * against the documented `classes` set and the view-local pattern. A plain token passes when
 * it's in `classes` or matches `viewLocal`; a prefix token passes when some documented name
 * starts with that prefix. Returns the offending raw tokens (marker stripped for display). */
export function checkTokens(tokens: string[], classes: Set<string>, viewLocal: RegExp): string[] {
  const offenders: string[] = [];
  for (const token of tokens) {
    const isPrefix = token.endsWith(PREFIX_MARKER);
    const clean = isPrefix ? token.slice(0, -PREFIX_MARKER.length) : token;
    if (isPrefix) {
      const ok = [...classes].some((name) => name.startsWith(clean));
      if (!ok) offenders.push(clean);
      continue;
    }
    if (classes.has(clean) || viewLocal.test(clean)) continue;
    offenders.push(clean);
  }
  return offenders;
}

/** Reads and parses `docs/design-language.md` relative to `repoRoot`. */
export function loadVocabulary(repoRoot: string): Vocabulary {
  return parseVocabulary(readFileSync(join(repoRoot, 'docs/design-language.md'), 'utf8'));
}
