// Phase 9 (09-15, T-09-31): source-text contract for the API coverage page, in the todo and milestone audit
// view-contract idiom (readFile + regex, no AST tooling). Nothing renders raw HTML; no link is built from document
// text; the only tones written are the documented ones, from the composed model, and never a parse-degradation
// tone or `missing` (an opted-out capability is a decision, not a gap); the composer builds no regular
// expression, imports no filesystem module and holds no module-level `let`; the page's CSS is one contiguous,
// guarded region that renders only the four font sizes the UI contract allows. The checks are small helpers with
// a positive control that runs them on planted in-memory strings (nothing is written under src/). Comments are
// stripped before every negative check.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-09-coverage:start */';
const END = '/* phase-09-coverage:end */';
const COMPOSER = 'src/web/views/coverage-matrix.ts';
const COMPONENTS = 'src/web/views/coverage-matrix-components.tsx';
const ALLOWED_SIZES = ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)'];

function stripSourceComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

/** Every `data-tone` expression the text writes. */
function toneExpressions(text: string): string[] {
  return [...text.matchAll(/data-tone=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
}

/** A tone this page must never write: the parse-degradation tones, `missing` and `in-flight`. */
function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning|missing|in-flight)['"]/.test(text) ||
    /data-tone="(destructive|warning|missing|in-flight)"/.test(text) ||
    /'(destructive|warning|missing|in-flight)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning|missing|in-flight)'/.test(text)
  );
}

/** An anchor, a router link or any href: the coverage page links nowhere. */
function writesLink(text: string): boolean {
  return /\bhref\s*[=:]/.test(text) || /\bto=/.test(text) || /<(a|Link|NavLink)[\s>]/.test(text);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** A regular-expression literal used as a method argument. */
function usesRegexLiteral(text: string): boolean {
  return /\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\//.test(text);
}

function importsFilesystem(text: string): boolean {
  return /from 'node:(fs|path)|from 'fs'/.test(text);
}

/** A `let` at column zero: module-level mutable state. */
function hasModuleLevelLet(text: string): boolean {
  return /^(export\s+)?let\s/m.test(text);
}

/** What the CSS block must never contain. */
function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  if (/@keyframes/.test(block)) found.push('keyframes');
  if (/\banimation\b/.test(block)) found.push('animation');
  if (/\btransition\b/.test(block)) found.push('transition');
  if (/:root/.test(block)) found.push(':root');
  return found;
}

/** Every font-size value a block declares. */
function fontSizes(block: string): string[] {
  return [...block.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
}

function coverageBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('coverage view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(toneExpressions('<span data-tone={tone} data-tone="quiet" />')).toEqual(['{tone}', '"quiet"']);
    expect(writesForbiddenTone("const tone = 'missing';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="destructive" />')).toBe(true);
    expect(writesForbiddenTone("type CoverageTone = 'complete' | 'missing';")).toBe(true);
    expect(writesLink('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;\nexport const x = 1;')).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(fontSizes('a { font-size: var(--fs-5); } b { font-size: 12px; }')).toEqual(['var(--fs-5)', '12px']);
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesForbiddenTone("type CoverageTone = 'complete' | 'quiet';")).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(usesRegexLiteral("text.split('/')")).toBe(false);
    expect(importsFilesystem("import { join } from './x.ts';")).toBe(false);
    expect(hasModuleLevelLet('function f() {\n  let x = 1;\n  return x;\n}')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('coverage view contract - the real sources', () => {
  it('the components render no raw HTML and no link, and write only model tones and the documented fixed one', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(usesRawHtmlProp(code)).toBe(false);
    expect(writesLink(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect([...new Set(toneExpressions(code))].sort()).toEqual(
      ['"complete"', '"quiet"', '{group.tone}', '{row.tone}'].sort(),
    );
    expect(code).toContain('aria-hidden="true"');
  });

  it('capability and reason text goes through React text, never straight into markup', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('<ResearchInline text={card.reason} />');
    expect(code).toContain('<ResearchInline text={row.reason} />');
    expect(code).toContain('<ResearchInline text={line} />');
    expect(code).toContain('{row.capability}');
  });

  it('the page words are the documented ones', async () => {
    const composer = stripSourceComments(await source(COMPOSER));
    expect(composer).toContain("export const NO_API_HEADING = 'No external API in this phase';");
    expect(composer).toContain("export const NO_REASON = 'No reason given';");
    expect(composer).toContain('integrated, ');
    expect(composer).toContain("chip: 'Integrate'");
    expect(composer).toContain("chip: 'Opt out'");
    expect(composer).toContain("label: 'Integrated'");
    expect(composer).toContain("label: 'Opted out'");
  });

  it('the composer writes only the two documented tones and never missing', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).toContain("export type CoverageTone = 'complete' | 'quiet';");
    expect(writesForbiddenTone(code)).toBe(false);
  });

  it('the composer builds no regular expression, uses no regex literal and imports no filesystem module', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(buildsRegExp(code)).toBe(false);
    expect(usesRegexLiteral(code)).toBe(false);
    expect(importsFilesystem(code)).toBe(false);
  });

  it('the composer holds no module-level mutable state', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(hasModuleLevelLet(code)).toBe(false);
    expect(code).not.toMatch(/^(export\s+)?var\s/m);
  });

  it('the extractor builds no regular expression and imports no filesystem module', async () => {
    const code = stripSourceComments(await source('src/planning-repo/handlers/coverage-body.ts'));
    expect(buildsRegExp(code)).toBe(false);
    expect(usesRegexLiteral(code)).toBe(false);
    expect(importsFilesystem(code)).toBe(false);
  });

  it('the CSS block exists once, holds every .view-coverage- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = coverageBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-coverage-/);
    for (const selector of [
      '.view-coverage-page',
      '.view-coverage-card',
      '.view-coverage-bar',
      '.view-coverage-row',
      '.view-coverage-capability',
      '.view-coverage-no-reason',
    ]) {
      expect(block, selector).toContain(selector);
    }
  });

  it('the CSS block renders only the four contracted font sizes', async () => {
    const block = stripCssComments(coverageBlock(await source('src/web/styles/globals.css')));
    const sizes = fontSizes(block);
    expect(sizes.length).toBeGreaterThan(5);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
  });

  it('adds no history-prefixed rule and no status-square rule: the page styles itself under its own names', async () => {
    const block = stripCssComments(coverageBlock(await source('src/web/styles/globals.css')));
    expect(block).not.toMatch(/\.history-[\w-]+/);
    expect(block).not.toMatch(/\.status-square/);
  });

  it('a capability wraps rather than overflowing: it breaks anywhere', async () => {
    const block = stripCssComments(coverageBlock(await source('src/web/styles/globals.css')));
    const selector = '.view-coverage-capability {';
    const rule = block.slice(block.indexOf(selector), block.indexOf('}', block.indexOf(selector)));
    expect(rule).toContain('overflow-wrap: anywhere;');
    expect(rule).toContain('font-family: var(--font-mono);');
  });
});
