// UI-05 / D-08 / D-09 / D-10: a class-vocabulary allowlist test. The sanctioned name set is
// parsed directly out of docs/design-language.md (D-08 — no test-side allowlist array exists);
// a class matching the D-09 reserved view-local namespace (`view-<kind>-<suffix>`, `<kind>` a
// member of VIEW_LOCAL_PREFIXES) is auto-allowed without a doc entry. The scan is a plain text
// walk mirroring test/web/css-source-order.test.ts's idiom — comment-stripping, brace-depth
// walking, a planted positive-control fixture written to a mkdtemp directory — no AST tooling.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { VIEW_LOCAL_PREFIXES } from '../../src/web/views/kinds.ts';
import { checkTokens, loadVocabulary, viewLocalPattern } from '../helpers/design-vocabulary.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const SCAN_ROOTS = ['src/web/views', 'src/web/pages', 'src/web/components'];
const EXCLUDE_SEGMENT = `${join('components', 'ui')}${'/'}`;

/** A template-literal static segment that immediately precedes a `${…}` interpolation carries
 * this marker so checkTokens treats it as a prefix rather than a whole-name match. */
const PREFIX_MARKER = '\u0000PREFIX';

// ---------------------------------------------------------------------------
// Source scanner — no AST, text/regex only (per plan prohibition)
// ---------------------------------------------------------------------------

/** Blanks `//` line comments and `/* … *\/` block comments with equal-length whitespace so
 * offsets/line counts are preserved and quoted strings inside comments are never scanned. */
function blankComments(source: string): string {
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

/** Walks from an opening `{` at `openIndex` to its matching `}`, returning that index (or -1). */
function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Collects every single/double-quoted string literal in `expr`, plus every template-literal
 * static segment (split on `${…}`); a segment immediately preceding `${` is suffixed with
 * PREFIX_MARKER so the caller treats it as a prefix rather than a whole name. */
function collectStringsAndTemplates(expr: string): string[] {
  const strings: string[] = [];
  let i = 0;
  const n = expr.length;
  while (i < n) {
    const ch = expr[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && expr[j] !== ch) {
        if (expr[j] === '\\') j++;
        j++;
      }
      strings.push(expr.slice(i + 1, j));
      i = j + 1;
      continue;
    }
    if (ch === '`') {
      let j = i + 1;
      let segStart = j;
      while (j < n && expr[j] !== '`') {
        if (expr[j] === '\\') {
          j += 2;
          continue;
        }
        if (expr[j] === '$' && expr[j + 1] === '{') {
          strings.push(expr.slice(segStart, j) + PREFIX_MARKER);
          let depth = 1;
          let k = j + 2;
          while (k < n && depth > 0) {
            if (expr[k] === '{') depth++;
            else if (expr[k] === '}') depth--;
            k++;
          }
          j = k;
          segStart = j;
          continue;
        }
        j++;
      }
      if (segStart < j) strings.push(expr.slice(segStart, j));
      i = j + 1;
      continue;
    }
    i++;
  }
  return strings;
}

/** From a `.tsx` source string, extracts every raw token found in: (a) `className="…"`
 * attribute values; (b) `className={…}` expressions — every quoted string literal and every
 * template-literal static segment inside the brace-walked expression; (c) `className: '…'` /
 * `className: "…"` object properties. Each collected string is whitespace-split; a template
 * prefix segment's PREFIX_MARKER survives onto its last whitespace-split part. */
export function extractClassTokens(sourceRaw: string): string[] {
  const source = blankComments(sourceRaw);
  const collected: string[] = [];

  const attrRe = /className="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(source))) collected.push(m[1]);

  const exprStart = /className=\{/g;
  while ((m = exprStart.exec(source))) {
    const openBraceIdx = m.index + m[0].length - 1;
    const closeIdx = findMatchingBrace(source, openBraceIdx);
    if (closeIdx === -1) continue;
    const inner = source.slice(openBraceIdx + 1, closeIdx);
    for (const s of collectStringsAndTemplates(inner)) collected.push(s);
  }

  const objRe = /className:\s*['"]([^'"]*)['"]/g;
  while ((m = objRe.exec(source))) collected.push(m[1]);

  const tokens: string[] = [];
  for (const s of collected) {
    const isPrefix = s.endsWith(PREFIX_MARKER);
    const clean = isPrefix ? s.slice(0, -PREFIX_MARKER.length) : s;
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    if (isPrefix) {
      for (let idx = 0; idx < parts.length - 1; idx++) tokens.push(parts[idx]);
      tokens.push(parts[parts.length - 1] + PREFIX_MARKER);
    } else {
      for (const p of parts) tokens.push(p);
    }
  }
  return tokens;
}

/** From a `.tsx` source string, extracts every `data-tone="…"` literal plus quoted literals
 * inside `data-tone={…}` expressions — skipping a quoted literal immediately preceded by `===`
 * or `!==` (a comparison operand, e.g. `status === 'Complete' ? 'complete' : 'quiet'`), since
 * that is never the value the attribute actually resolves to. */
export function extractToneTokens(sourceRaw: string): string[] {
  const source = blankComments(sourceRaw);
  const tokens: string[] = [];

  const attrRe = /data-tone="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(source))) tokens.push(m[1]);

  const exprStart = /data-tone=\{/g;
  while ((m = exprStart.exec(source))) {
    const openBraceIdx = m.index + m[0].length - 1;
    const closeIdx = findMatchingBrace(source, openBraceIdx);
    if (closeIdx === -1) continue;
    const inner = source.slice(openBraceIdx + 1, closeIdx);
    tokens.push(...collectComparisonAwareStrings(inner));
  }

  return tokens;
}

/** Like collectStringsAndTemplates, but drops a quoted literal that is immediately preceded
 * (ignoring whitespace) by `===` or `!==` — a comparison operand, not a resolved value. */
function collectComparisonAwareStrings(expr: string): string[] {
  const results: string[] = [];
  let i = 0;
  const n = expr.length;
  while (i < n) {
    const ch = expr[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && expr[j] !== ch) {
        if (expr[j] === '\\') j++;
        j++;
      }
      let precede = i - 1;
      while (precede >= 0 && /\s/.test(expr[precede])) precede--;
      const isComparison =
        precede >= 1 && expr[precede] === '=' && expr[precede - 1] === '=';
      if (!isComparison) results.push(expr.slice(i + 1, j));
      i = j + 1;
      continue;
    }
    i++;
  }
  return results;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function walkTsxFiles(root: string): string[] {
  const results: string[] = [];
  const absRoot = join(REPO_ROOT, root);
  const stack = [absRoot];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const abs = join(dir, entry);
      const st = statSync(abs);
      if (st.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!entry.endsWith('.tsx')) continue;
      const rel = relative(REPO_ROOT, abs).split('\\').join('/');
      if (rel.includes(EXCLUDE_SEGMENT.split('\\').join('/'))) continue;
      results.push(rel);
    }
  }
  return results.sort();
}


// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('class-vocabulary allowlist (UI-05, D-08, D-09, D-10)', () => {
  const vocabulary = loadVocabulary(REPO_ROOT);
  const viewLocal = viewLocalPattern(VIEW_LOCAL_PREFIXES);
  const scannedFiles = SCAN_ROOTS.flatMap((root) => walkTsxFiles(root));

  it('every className literal in views, pages and components is documented or view-local', () => {
    expect(scannedFiles.length).toBeGreaterThan(20);
    console.log(`class-vocabulary: scanned ${scannedFiles.length} .tsx files`);

    const offenders: string[] = [];
    for (const file of scannedFiles) {
      const source = readFileSync(join(REPO_ROOT, file), 'utf8');
      const tokens = extractClassTokens(source);
      for (const offender of checkTokens(tokens, vocabulary.classes, viewLocal)) {
        offenders.push(`${file}: ${offender}`);
      }
    }
    offenders.sort();
    expect(offenders).toEqual([]);
  });

  it('every data-tone literal is a documented tone', () => {
    const offenders: string[] = [];
    for (const file of scannedFiles) {
      const source = readFileSync(join(REPO_ROOT, file), 'utf8');
      const tones = extractToneTokens(source);
      for (const tone of tones) {
        if (!vocabulary.tones.has(tone)) offenders.push(`${file}: ${tone}`);
      }
    }
    offenders.sort();
    expect(offenders).toEqual([]);
  });

  it('the view-local namespace accepts registered kinds and rejects near-misses', () => {
    const passing = checkTokens(
      ['view-discussion-log-options', 'view-unrecognized-notice'],
      vocabulary.classes,
      viewLocal,
    );
    expect(passing).toEqual([]);

    const failing = checkTokens(
      ['view-discussion-logs-options', 'view-x', 'status-chip-large'],
      vocabulary.classes,
      viewLocal,
    );
    expect(failing.sort()).toEqual(
      ['status-chip-large', 'view-discussion-logs-options', 'view-x'].sort(),
    );
  });

  it('template-literal prefixes resolve against documented names', () => {
    const passingTokens = extractClassTokens('const x = <div className={`metadata-panel-${x}`} />;');
    expect(checkTokens(passingTokens, vocabulary.classes, viewLocal)).toEqual([]);

    const failingTokens = extractClassTokens('const x = <div className={`zzz-${x}`} />;');
    expect(checkTokens(failingTokens, vocabulary.classes, viewLocal)).toEqual(['zzz-']);
  });

  describe('positive control — planted fixture written to a mkdtemp directory, never src/', () => {
    let plantedRoot: string;

    afterEach(async () => {
      if (plantedRoot) await rm(plantedRoot, { recursive: true, force: true });
    });

    it('reports exactly the invented class and tone in a planted fixture', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-class-vocabulary-'));
      const fixturePath = join(plantedRoot, 'fixture.tsx');
      const fixture = `
export function Fixture() {
  return (
    <span className="status-chip totally-invented" data-tone="loud">
      Example
    </span>
  );
}
`;
      await writeFile(fixturePath, fixture, 'utf8');
      const source = readFileSync(fixturePath, 'utf8');

      const classOffenders = checkTokens(extractClassTokens(source), vocabulary.classes, viewLocal);
      expect(classOffenders).toEqual(['totally-invented']);

      const toneOffenders = extractToneTokens(source).filter((t) => !vocabulary.tones.has(t));
      expect(toneOffenders).toEqual(['loud']);
    });
  });
});
