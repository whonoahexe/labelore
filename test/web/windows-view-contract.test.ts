// Phase 9 (09-11, T-09-22): source-text contract for the WINDOWS ledger page, in the todo-view-contract idiom
// (readFile + regex, no AST tooling). Nothing renders raw HTML; no link is built from document text (a file
// path is text, never a link); the only tones written are the documented ones, from the composed model, and
// never a parse-degradation tone (an open window is document content, so it is in-flight, never destructive);
// the composer builds no regular expression and imports no filesystem module; the page's CSS is one
// contiguous, guarded region. The checks are small helpers with a positive control that runs them on planted
// in-memory strings (nothing is written under src/). Comments are stripped before every negative check, so a
// header comment can never trip one.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-09-windows-ledger:start */';
const END = '/* phase-09-windows-ledger:end */';
const COMPOSER = 'src/web/views/windows-ledger.ts';
const COMPONENTS = 'src/web/views/windows-ledger-components.tsx';

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

/** The parse-degradation tones written as a tone value. */
function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) ||
    /['"](destructive|warning)['"]\s*as\s+[A-Za-z]*Tone/.test(text) ||
    /data-tone="(destructive|warning)"/.test(text) ||
    /'(destructive|warning)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning)'/.test(text)
  );
}

/** An anchor, a router link or any href: the windows page links nowhere. */
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

function windowsBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('windows view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(toneExpressions('<span data-tone={tone} data-tone="quiet" />')).toEqual(['{tone}', '"quiet"']);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesForbiddenTone("type RowTone = 'quiet' | 'warning';")).toBe(true);
    expect(writesLink('<a href={ref}>x</a>')).toBe(true);
    expect(writesLink('<Link to={row.place}>x</Link>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
    expect(stripSourceComments('a // note data-tone="warning"\n// whole line href=\nb')).not.toContain('whole line');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(toneExpressions('<span data-state={s} />')).toEqual([]);
    expect(writesForbiddenTone("const severity = 'warning';")).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(usesRegexLiteral("text.split('/')")).toBe(false);
    expect(importsFilesystem("import { join } from './x.ts';")).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('windows view contract - the real sources', () => {
  it('the components render no raw HTML and no link, and write only model tones and the quiet chip', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(usesRawHtmlProp(code)).toBe(false);
    expect(writesLink(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(
      [...new Set(toneExpressions(code))].sort(),
    ).toEqual(['"quiet"', '{lead.tone}', '{row.tone}']);
    // The clamp and the disclosure ride their own attributes.
    expect(code).toContain('data-clamped=');
    expect(code).toContain('aria-expanded=');
    expect(code).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline, never straight into markup', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('<ResearchInline text={row.description} />');
    expect(code).toContain('<ResearchInline text={row.reason} />');
  });

  it('a mono id, path or phase ends in an ellipsis with its full value in title', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('title={row.place}');
    expect(code).toContain('title={group.phase}');
    expect(code).toContain('title={`#${row.id}`}');
  });

  it('the composer and the components never write the destructive or warning tone', async () => {
    for (const path of [COMPOSER, COMPONENTS]) {
      expect(writesForbiddenTone(stripSourceComments(await source(path))), path).toBe(false);
    }
  });

  it('the composer writes only complete, in-flight and quiet as row tones', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).toContain("export type WindowsRowTone = 'in-flight' | 'quiet' | 'complete';");
    expect(code).toContain("export type WindowsLeadTone = 'complete' | 'in-flight';");
  });

  it('the composer builds no regular expression and uses no regex literal', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(buildsRegExp(code)).toBe(false);
    expect(usesRegexLiteral(code)).toBe(false);
  });

  it('the composer imports no filesystem module', async () => {
    expect(importsFilesystem(stripSourceComments(await source(COMPOSER)))).toBe(false);
  });

  it('the CSS block exists once, holds every .view-windows- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = windowsBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-windows-/);
    expect(block).toContain('.view-windows-page');
    expect(block).toContain('.view-windows-reason');
    expect(block).toContain(".view-windows-description[data-clamped='true']");
    expect(block).toContain('.view-windows-history');
  });

  it('adds no history-prefixed rule: the Fixed history styles itself under its own names', async () => {
    const block = stripCssComments(windowsBlock(await source('src/web/styles/globals.css')));
    expect(block).not.toMatch(/\.history-[\w-]+/);
  });

  it('a mono token never wraps mid-token: the place and the phase label are one line with an ellipsis', async () => {
    const block = stripCssComments(windowsBlock(await source('src/web/styles/globals.css')));
    for (const selector of ['.view-windows-place {', '.view-windows-group-label {']) {
      const rule = block.slice(block.indexOf(selector), block.indexOf('}', block.indexOf(selector)));
      expect(rule, selector).toContain('text-overflow: ellipsis;');
      expect(rule, selector).toContain('white-space: nowrap;');
    }
  });
});
