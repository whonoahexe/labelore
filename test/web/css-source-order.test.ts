// quick-260918-qkd Task 3 (D1, QKD-08): a general guard against the dead-media-query bug class —
// a `@media (max-width: ...)` override that declares `selector { property: value }`, followed
// later in the file by a top-level (non-media) rule matching the identical selector and declaring
// the identical property. Equal specificity plus later source order means the later declaration
// always wins, so the override inside the media block silently never applies at any viewport
// width. Two live instances were found by a planning-time scan (.trace-row, .warning-fields) and
// fixed by moving each override to live immediately after the rule it must beat; this guard
// exists so the bug class cannot silently return.
//
// Modeled directly on test/token-guard.test.ts's idiom: a comment-stripping helper, a brace-depth
// walker (no postcss/lightningcss), and a planted-fixture positive control written to a mkdtemp
// directory, never the real source tree — so the guard can never pass vacuously.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const CSS_PATH = join(REPO_ROOT, 'src/web/styles/globals.css');

/** Blanks out `/* ... *\/` block comments while preserving line counts (mirrors
 * token-guard.test.ts's stripCssComments). */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

interface RuleDeclaration {
  /** A single selector from a (possibly comma-separated, possibly multi-line) selector list. */
  selector: string;
  property: string;
  line: number;
  /** True when this rule sits inside one or more `@media (max-width: ...)` blocks at any nesting
   * depth. A rule nested inside any OTHER at-rule (`@media (min-width: ...)`, `@supports`, ...)
   * with no enclosing max-width media is not flagged as "inside" for this guard's purpose — the
   * bug class this guards against is specifically a max-width override losing to a later
   * unconditional top-level rule. */
  insideMaxWidthMedia: boolean;
}

/** Splits a selector list on top-level commas (respecting parens for :is()/:not() etc.) and
 * collapses each individual selector's internal whitespace/newlines to single spaces, so a
 * selector written across multiple lines still matches its single-line counterpart. */
function splitSelectorList(rawSelector: string): string[] {
  const collapsed = rawSelector.replace(/\s+/g, ' ').trim();
  const parts: string[] = [];
  let buf = '';
  let depth = 0;
  for (const ch of collapsed) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/** Single-pass character walker collecting every (selector, property) pair declared inside a
 * top-level rule block (a selector-prefixed `{ ... }`, not an at-rule preamble like `:root` or
 * `@theme inline` — those carry no CSS selector and are irrelevant to this guard). Tracks a stack
 * of preludes so nesting depth inside `@media` blocks (and whether that nesting is a max-width
 * media query) is known at every declaration. */
function parseRuleDeclarations(cssRaw: string): RuleDeclaration[] {
  const css = stripCssComments(cssRaw);
  const decls: RuleDeclaration[] = [];
  const stack: { prelude: string; isMaxWidthMedia: boolean }[] = [];
  let buf = '';
  let bufStartLine: number | null = null;
  let line = 1;
  let quote: string | null = null;
  let parenDepth = 0;

  const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
  const append = (ch: string) => {
    buf += ch;
    if (bufStartLine === null && !/\s/.test(ch)) bufStartLine = line;
  };

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '\n') line++;

    if (quote) {
      append(ch);
      if (ch === quote && css[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      append(ch);
      continue;
    }
    if (ch === '(') {
      parenDepth++;
      append(ch);
      continue;
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      append(ch);
      continue;
    }
    if (ch === '{' && parenDepth === 0) {
      const prelude = collapse(buf);
      const isMaxWidthMedia = /^@media\s*\(\s*max-width\s*:/.test(prelude);
      stack.push({ prelude, isMaxWidthMedia });
      buf = '';
      bufStartLine = null;
      continue;
    }
    if (ch === '}' && parenDepth === 0) {
      buf = '';
      bufStartLine = null;
      stack.pop();
      continue;
    }
    if (ch === ';' && parenDepth === 0) {
      const text = buf.trim();
      const declLine = bufStartLine;
      buf = '';
      bufStartLine = null;
      if (text && stack.length > 0 && declLine !== null) {
        const top = stack[stack.length - 1];
        // Only real selector rules carry declarations we care about — skip at-rule preludes
        // (`:root`, `.dark`, `@theme inline`, `@font-face`) and any rule directly inside an
        // at-rule prelude that isn't itself a selector (e.g. `@font-face { ... }`).
        if (top.prelude.startsWith('@') || top.prelude === '') continue;
        let colonIdx = -1;
        let d = 0;
        let q: string | null = null;
        for (let k = 0; k < text.length; k++) {
          const c = text[k];
          if (q) {
            if (c === q) q = null;
            continue;
          }
          if (c === '"' || c === "'") {
            q = c;
            continue;
          }
          if (c === '(') d++;
          else if (c === ')') d = Math.max(0, d - 1);
          else if (c === ':' && d === 0) {
            colonIdx = k;
            break;
          }
        }
        if (colonIdx !== -1) {
          const property = text.slice(0, colonIdx).trim();
          const insideMaxWidthMedia = stack.some((s) => s.isMaxWidthMedia);
          for (const selector of splitSelectorList(top.prelude)) {
            decls.push({ selector, property, line: declLine, insideMaxWidthMedia });
          }
        }
      }
      continue;
    }
    append(ch);
  }
  return decls;
}

export interface SourceOrderFinding {
  selector: string;
  property: string;
  mediaLine: number;
  laterLine: number;
}

/** Finds every (selector, property) pair declared inside a `@media (max-width: ...)` block that
 * is later re-declared, identically, by a top-level (non-media) rule matching the same selector —
 * the later declaration always wins at every viewport width, so the media override is dead code. */
export function findSourceOrderDefeats(css: string): SourceOrderFinding[] {
  const decls = parseRuleDeclarations(css);
  const findings: SourceOrderFinding[] = [];
  const mediaDecls = decls.filter((d) => d.insideMaxWidthMedia);
  const topLevelDecls = decls.filter((d) => !d.insideMaxWidthMedia);

  for (const mediaDecl of mediaDecls) {
    const defeater = topLevelDecls.find(
      (d) =>
        d.selector === mediaDecl.selector &&
        d.property === mediaDecl.property &&
        d.line > mediaDecl.line,
    );
    if (defeater) {
      findings.push({
        selector: mediaDecl.selector,
        property: mediaDecl.property,
        mediaLine: mediaDecl.line,
        laterLine: defeater.line,
      });
    }
  }
  return findings;
}

function liveCss(): string {
  return readFileSync(CSS_PATH, 'utf8');
}

describe('CSS source order — narrow-viewport override defeat guard (QKD-08)', () => {
  it('reports zero findings against the live stylesheet', () => {
    const findings = findSourceOrderDefeats(liveCss());
    expect(findings).toEqual([]);
  });

  describe('positive control — planted fixtures written to a mkdtemp directory, never the real source tree', () => {
    let plantedRoot: string;

    afterEach(async () => {
      if (plantedRoot) await rm(plantedRoot, { recursive: true, force: true });
    });

    it('catches a defeated media override and does not flag a clean, correctly-ordered fixture', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-css-source-order-'));

      const violatingFixturePath = join(plantedRoot, 'violating.css');
      const violatingFixture = `
@media (max-width: 42rem) {
  .example-row {
    grid-template-columns: 1fr;
  }
}

.example-row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 20rem);
}
`;
      await writeFile(violatingFixturePath, violatingFixture, 'utf8');
      const violatingCss = readFileSync(violatingFixturePath, 'utf8');
      const violatingFindings = findSourceOrderDefeats(violatingCss);
      expect(violatingFindings).toHaveLength(1);
      expect(violatingFindings[0]).toMatchObject({
        selector: '.example-row',
        property: 'grid-template-columns',
      });
      expect(violatingFindings[0].laterLine).toBeGreaterThan(violatingFindings[0].mediaLine);

      const cleanFixturePath = join(plantedRoot, 'clean.css');
      const cleanFixture = `
.example-row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 20rem);
}

@media (max-width: 42rem) {
  .example-row {
    grid-template-columns: 1fr;
  }
}
`;
      await writeFile(cleanFixturePath, cleanFixture, 'utf8');
      const cleanCss = readFileSync(cleanFixturePath, 'utf8');
      expect(findSourceOrderDefeats(cleanCss)).toEqual([]);
    });
  });
});
