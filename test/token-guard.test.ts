// JZ8-04: centralized-token regression guard. Modeled directly on test/portability.test.ts's
// "Node filesystem module import boundary" gate (fs-gate idiom): a comment-stripping helper, a
// single-pass declaration walker (no postcss/lightningcss — both are transitive-only deps, see
// 260910-jz8-RESEARCH.md's Package Legitimacy Audit), an explicit stale-checked allowlist, and a
// planted-fixture positive control that never mutates the real source tree.
//
// Scope grows across the quick-260910-jz8 plan's three tasks: this file starts with the spacing
// family (JZ8-01) and gains the type family (JZ8-02) and colour family (JZ8-03) in later commits
// of the same plan. Scroll-margin/scroll-padding are deliberately excluded from every family per
// P-03 — the user named padding/margin/gap/inset, and a separate visual-contract test pins
// `scroll-margin-top: 6rem`.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const CSS_PATH = join(REPO_ROOT, 'src/web/styles/globals.css');

// ---------------------------------------------------------------------------
// Parsing primitives
// ---------------------------------------------------------------------------

/** Blanks out `/* ... *\/` block comments while preserving line counts, so reported line numbers
 * stay true (mirrors portability.test.ts's stripCommentsForFsGate, CSS variant — no `//`). */
export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Splits a declaration value on top-level whitespace only (paren depth 0, outside quotes) — a
 * multi-value shorthand like `padding: 1rem 0.8rem 2rem` tokenizes into three components, while
 * `clamp(1rem, 3vw, 2.5rem)` stays one component because its internal commas/spaces sit at depth
 * 1+ (Pitfall 6, RESEARCH.md). */
export function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let buf = '';
  let depth = 0;
  let quote: string | null = null;
  for (const ch of value) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '(') {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === ')') {
      depth--;
      buf += ch;
      continue;
    }
    if (/\s/.test(ch) && depth === 0) {
      if (buf) {
        parts.push(buf);
        buf = '';
      }
      continue;
    }
    buf += ch;
  }
  if (buf) parts.push(buf);
  return parts;
}

/** Removes balanced `var(...)` segments (fallbacks included) from `text`, so what remains is only
 * ever a raw literal or the non-var scaffolding around it (`calc(-1 * )`, `clamp(, 3vw, )`, ...). */
export function withoutVarCalls(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('var(', i)) {
      let depth = 1;
      let j = i + 4;
      while (j < text.length && depth > 0) {
        if (text[j] === '(') depth++;
        else if (text[j] === ')') depth--;
        j++;
      }
      i = j;
    } else {
      result += text[i];
      i++;
    }
  }
  return result;
}

const TOKEN_BLOCK_PRELUDES = new Set([':root', '.dark', '@theme inline', '@font-face']);

export interface Declaration {
  selector: string;
  property: string;
  value: string;
  line: number;
  inTokenBlock: boolean;
}

/** Single-pass character walker. Tracks quote state, paren depth, and a stack of
 * whitespace-collapsed block preludes so it is never fooled by comments (pre-stripped), by
 * `@apply`/`@custom-variant` statements (no top-level colon — skipped), by multi-line comma
 * selectors, or by strings. A declaration ends at a depth-0 semicolon or the enclosing `}`; a
 * block starts at a depth-0 `{`. `inTokenBlock` is true when ANY enclosing prelude, at any
 * nesting depth, exactly equals `:root`, `.dark`, `@theme inline` or `@font-face` — so
 * `@media { :root { ... } }` is exempt but a compound selector like `.dark .x` (not an exact
 * match) is still flagged. */
export function parseDeclarations(cssRaw: string): Declaration[] {
  const css = stripCssComments(cssRaw);
  const decls: Declaration[] = [];
  const stack: { prelude: string }[] = [];
  let buf = '';
  // Line of the first non-whitespace character accumulated into `buf` since it was last reset —
  // null until that first real character arrives, so leading indentation/newlines right after a
  // delimiter never get mistaken for the next declaration's own line.
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
      stack.push({ prelude });
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
        // Find the first top-level colon (respecting parens and quotes) — this splits
        // `property` from `value` without being fooled by a `:` inside e.g. `:is(...)`
        // (irrelevant here since selectors don't reach this branch) or a quoted string.
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
          let value = text.slice(colonIdx + 1).trim();
          value = value.replace(/!important\s*$/i, '').trim();
          const inTokenBlock = stack.some((s) => TOKEN_BLOCK_PRELUDES.has(s.prelude));
          const selector = stack[stack.length - 1].prelude;
          decls.push({ selector, property, value, line: declLine, inTokenBlock });
        }
        // else: an at-rule statement with no top-level colon (e.g. `@import`, `@custom-variant`,
        // a bare `@apply x y;`) — not a declaration, skip.
      }
      continue;
    }
    append(ch);
  }
  return decls;
}

// ---------------------------------------------------------------------------
// Spacing family (JZ8-01)
// ---------------------------------------------------------------------------

// Scroll-margin/scroll-padding are deliberately excluded (P-03) — this list is exhaustive over
// every other padding/margin/gap/inset/top/right/bottom/left longhand, logical properties
// included.
const SPACING_PROPERTIES = new Set([
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-inline',
  'margin-inline-start',
  'margin-inline-end',
  'margin-block',
  'margin-block-start',
  'margin-block-end',
  'gap',
  'row-gap',
  'column-gap',
  'inset',
  'inset-block',
  'inset-block-start',
  'inset-block-end',
  'inset-inline',
  'inset-inline-start',
  'inset-inline-end',
  'top',
  'right',
  'bottom',
  'left',
]);

function isZeroOrKeywordComponent(comp: string): boolean {
  return /^-?0(\.0+)?(rem|px|em|vw|vh|%)?$/.test(comp) || comp === 'auto';
}

function isWhollyWrappedInSingleVarCall(comp: string): boolean {
  if (!/^var\(/.test(comp) || !comp.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < comp.length; i++) {
    if (comp[i] === '(') depth++;
    else if (comp[i] === ')') {
      depth--;
      if (depth === 0) return i === comp.length - 1;
    }
  }
  return false;
}

/** True when `comp` (a single top-level value component) carries a raw rem/px/em/vw/vh length —
 * whether bare (`0.5rem`) or nested inside `calc()`/`clamp()`/`min()`/`max()` (`calc(1rem + 2px)`,
 * `clamp(1rem, 3vw, 2.5rem)`). A component wholly wrapped in one `var(...)` call is never flagged,
 * fallback included (`var(--space-4, 1rem)` passes whole). `calc(-1 * var(--space-6))` passes
 * because stripping the `var()` call leaves no unit-bearing literal behind. */
function spacingComponentIsRawLength(comp: string): boolean {
  if (isZeroOrKeywordComponent(comp)) return false;
  if (/^-?\d+(\.\d+)?%$/.test(comp)) return false;
  if (isWhollyWrappedInSingleVarCall(comp)) return false;
  const stripped = withoutVarCalls(comp);
  return /(?<![\w-])-?\d*\.?\d+(rem|px|em|vw|vh)\b/.test(stripped);
}

interface Family {
  name: string;
  matchesProperty(property: string): boolean;
  isViolatingComponent(component: string, property: string): boolean;
}

const spacingFamily: Family = {
  name: 'spacing',
  matchesProperty: (property) => SPACING_PROPERTIES.has(property),
  isViolatingComponent: (component) => spacingComponentIsRawLength(component),
};

export const FAMILIES: Family[] = [spacingFamily];

// ---------------------------------------------------------------------------
// Allowlist — each entry exempts only its exact selector + property + value; every entry must
// match a live declaration (a stale entry fails the allowlist-by-name test below).
// ---------------------------------------------------------------------------

interface AllowlistEntry {
  selector: string;
  property: string;
  value: string;
  reason: string;
}

export const ALLOWLIST: AllowlistEntry[] = [
  {
    selector: '.sr-only',
    property: 'margin',
    value: '-1px',
    reason: 'the standard visually-hidden idiom (width/height/margin: -1px) — not a spacing-scale value',
  },
  {
    selector: '.phase-detail-grid',
    property: 'gap',
    value: '1px',
    reason: 'grid-gap hairline exposing the container background as a 1px divider, same category as a border',
  },
  {
    selector: '.metadata-panels',
    property: 'gap',
    value: '1px',
    reason: 'grid-gap hairline exposing the container background as a 1px divider, same category as a border',
  },
  {
    selector: '.artifact-document :is(h1, h2, h3, h4, h5, h6)',
    property: 'margin',
    value: '1.8em 0 0.65em',
    reason: 'em-relative heading margin — scales with the heading\'s own resolved font-size, not a fixed step',
  },
  {
    selector: '.artifact-document :is(h1, h2, h3, h4, h5, h6)',
    property: 'margin-top',
    value: '2.3em',
    reason: 'em-relative heading margin — scales with the heading\'s own resolved font-size, not a fixed step',
  },
  {
    selector: '.artifact-document :is(h1, h2, h3, h4, h5, h6)',
    property: 'margin-bottom',
    value: '0.75em',
    reason: 'em-relative heading margin — scales with the heading\'s own resolved font-size, not a fixed step',
  },
];

function isAllowlisted(decl: Declaration, allowlist: AllowlistEntry[]): boolean {
  return allowlist.some(
    (a) => a.selector === decl.selector && a.property === decl.property && a.value === decl.value,
  );
}

/** Returns readable "line selector { property: value } [family]" strings for every declaration
 * outside a token block that a family flags and the allowlist does not exempt. */
export function scanTokenViolations(
  css: string,
  families: Family[],
  allowlist: AllowlistEntry[] = ALLOWLIST,
): string[] {
  const decls = parseDeclarations(css);
  const out: string[] = [];
  for (const decl of decls) {
    if (decl.inTokenBlock) continue;
    for (const family of families) {
      if (!family.matchesProperty(decl.property)) continue;
      const components = splitTopLevel(decl.value);
      const flagged = components.filter((c) => family.isViolatingComponent(c, decl.property));
      if (flagged.length === 0) continue;
      if (isAllowlisted(decl, allowlist)) continue;
      out.push(`${decl.line} ${decl.selector} { ${decl.property}: ${decl.value} } [${family.name}]`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function liveCss(): string {
  return readFileSync(CSS_PATH, 'utf8');
}

describe('token guard — spacing family (JZ8-01, JZ8-04)', () => {
  it('has zero spacing violations outside the token blocks in the real stylesheet', () => {
    const violations = scanTokenViolations(liveCss(), [spacingFamily]);
    expect(violations).toEqual([]);
  });

  it('exempts every allowlist entry by name, and every entry matches a live declaration (no stale entries)', () => {
    const css = liveCss();
    const decls = parseDeclarations(css);
    for (const entry of ALLOWLIST) {
      const live = decls.find(
        (d) => d.selector === entry.selector && d.property === entry.property && d.value === entry.value,
      );
      expect(live, `stale allowlist entry: ${entry.selector} { ${entry.property}: ${entry.value} }`).toBeTruthy();

      // Without the allowlist, this exact declaration must be a real violation — otherwise the
      // entry is vestigial (exempting something the scanner wouldn't have flagged anyway).
      const withoutAllowlist = scanTokenViolations(css, [spacingFamily], []);
      const matchesThisEntry = withoutAllowlist.some((v) =>
        v.startsWith(`${live!.line} ${entry.selector} { ${entry.property}: ${entry.value} }`),
      );
      expect(matchesThisEntry, `vestigial allowlist entry: ${entry.selector} { ${entry.property}: ${entry.value} }`).toBe(true);
    }
  });

  it('keeps every static --space-* step a positive multiple of 0.125rem, consumes every defined step, and never declares a Tailwind-reserved namespace', () => {
    const css = liveCss();
    const decls = parseDeclarations(css);

    const stepDecls = decls.filter((d) => d.inTokenBlock && /^--space-[\w-]+$/.test(d.property) && !d.property.startsWith('--space-fluid-'));
    expect(stepDecls.length).toBeGreaterThan(0);

    for (const d of stepDecls) {
      const m = /^(\d*\.?\d+)rem$/.exec(d.value);
      expect(m, `--${d.property} is not a plain positive rem literal: ${d.value}`).toBeTruthy();
      const rem = parseFloat(m![1]);
      expect(rem).toBeGreaterThan(0);
      const steps = rem / 0.125;
      expect(Math.abs(steps - Math.round(steps)), `${d.property}: ${d.value} is not a multiple of 0.125rem`).toBeLessThan(1e-9);
    }

    // Every defined --space-N step (not just the fluid ones) is consumed at least once outside
    // the token blocks, matched with a closing paren so --space-1 never counts --space-1-5.
    const usageCss = decls
      .filter((d) => !d.inTokenBlock)
      .map((d) => d.value)
      .join(' ');
    for (const d of stepDecls) {
      const name = d.property.replace(/^--/, '');
      const consumed = usageCss.includes(`var(--${name})`);
      expect(consumed, `--${name} is defined but never consumed`).toBe(true);
    }

    // Tailwind's reserved @theme namespaces must never be declared by this task's tokens.
    const reserved = [/^--spacing(-.*)?$/, /^--text-.*/, /^--font-weight-.*/, /^--tracking-.*/, /^--leading-.*/];
    const reservedHits = decls
      .map((d) => d.property)
      .filter((p) => p.startsWith('--') && reserved.some((r) => r.test(p)));
    expect(reservedHits).toEqual([]);
  });

  describe('positive control — plants one violation per spacing shape in a tmpdir, never the real source tree', () => {
    let plantedRoot: string;

    afterEach(async () => {
      if (plantedRoot) await rm(plantedRoot, { recursive: true, force: true });
    });

    it('catches every planted spelling and passes both the token-block twins and a clean fixture', async () => {
      plantedRoot = await mkdtemp(join(tmpdir(), 'labelore-token-guard-'));
      const fixturePath = join(plantedRoot, 'fixture.css');

      const violatingFixture = `
.violating-padding-shorthand {
  padding: var(--space-4) 1rem var(--space-2);
}
.violating-margin-top {
  margin-top: 0.5rem;
}
.violating-gap {
  gap: 2rem;
}
.violating-top {
  top: 1rem;
}
.violating-negative-margin {
  margin-left: -3px;
}
.violating-calc {
  padding: calc(1rem + 2px);
}
.violating-usage-site-clamp {
  gap: clamp(1rem, 2vw, 3rem);
}

:root {
  padding: 999rem;
  margin-top: 999rem;
  gap: 999rem;
  top: 999rem;
  margin-left: -999rem;
  padding-right: calc(1rem + 2px);
  row-gap: clamp(1rem, 2vw, 3rem);
}
.dark {
  padding: 999rem;
}
@theme inline {
  padding: 999rem;
}
@media (min-width: 10px) {
  :root {
    padding: 999rem;
  }
}

.clean {
  padding: var(--space-4);
  margin: 0 auto;
  gap: var(--space-2);
  top: 0;
}
`;
      await writeFile(fixturePath, violatingFixture, 'utf8');
      const css = await import('node:fs/promises').then((fs) => fs.readFile(fixturePath, 'utf8'));

      const violations = scanTokenViolations(css, [spacingFamily], []);
      const joined = violations.join('\n');

      for (const needle of [
        '.violating-padding-shorthand { padding: var(--space-4) 1rem var(--space-2) }',
        '.violating-margin-top { margin-top: 0.5rem }',
        '.violating-gap { gap: 2rem }',
        '.violating-top { top: 1rem }',
        '.violating-negative-margin { margin-left: -3px }',
        '.violating-calc { padding: calc(1rem + 2px) }',
        '.violating-usage-site-clamp { gap: clamp(1rem, 2vw, 3rem) }',
      ]) {
        expect(joined, `expected to catch: ${needle}`).toContain(needle);
      }

      // The identical raw declarations inside :root, .dark, @theme inline and
      // @media { :root { } } must never be caught.
      expect(joined).not.toMatch(/^\d+ :root \{/m);
      expect(joined).not.toMatch(/^\d+ \.dark \{/m);
      expect(joined).not.toMatch(/^\d+ @theme inline \{/m);

      // A clean fixture (all lengths already var()-wrapped, or zero) yields zero violations.
      const cleanOnly = violations.filter((v) => v.includes('.clean'));
      expect(cleanOnly).toEqual([]);
    });
  });
});
