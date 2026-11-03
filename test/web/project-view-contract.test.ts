// Phase 9 (09-07, 09-08; T-09-14, T-09-15, T-09-17): source-text contract for the PROJECT.md page, in the
// note-view-contract idiom (readFile + regex, no AST tooling). Nothing renders raw HTML; no link target is
// built from document text (every Link takes a model url field, and the margin's only target is the
// context's fixed dashboardUrl); the only tones written are the four documented ones; the composer and
// the server join build no regular expression and import no filesystem module; and the page's CSS is one
// contiguous, guarded region. The checks are small helpers with a positive control that runs them on planted
// in-memory strings (nothing is written under src/). Comments are stripped before every negative check, so
// a header comment can never trip one.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-09-project-page:start */';
const END = '/* phase-09-project-page:end */';
const TONES = ['complete', 'in-flight', 'missing', 'quiet'];

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

function writesAnchorLinkAttribute(text: string): boolean {
  return /\bhref\s*=/.test(text) || /\bhref\s*:/.test(text);
}

/** Every `to=` expression a Link in the text takes. */
function linkTargets(text: string): string[] {
  return [...text.matchAll(/<Link\b[^>]*?\bto=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** A regular expression literal used on text: `/.../.test(`, `.match(/`, `.replace(/` ... */
function usesRegexLiteral(text: string): boolean {
  return /\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\/(?![/*])/.test(text) || /\/[^/\n]+\/[gimsuy]*\.(test|exec)\(/.test(text);
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

/** The CSS between the page's start and end markers; the markers must each appear exactly once. */
function projectBlock(css: string): { block: string; outside: string } {
  expect(css.split(START)).toHaveLength(2);
  expect(css.split(END)).toHaveLength(2);
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(end).toBeGreaterThan(start);
  return { block: css.slice(start, end), outside: css.slice(0, start) + css.slice(end + END.length) };
}

describe('project view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(toneExpressions('<span data-tone={tone} data-tone="quiet" />')).toEqual(['{tone}', '"quiet"']);
    expect(writesAnchorLinkAttribute('<a href={ref}>x</a>')).toBe(true);
    expect(linkTargets('<Link className="a" to="/hard/coded">x</Link>')).toEqual(['"/hard/coded"']);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral('if (/^a/.test(body)) {}')).toBe(true);
    expect(usesRegexLiteral("body.replace(/x/g, '')")).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
    expect(stripSourceComments('a // note data-tone="warning"\n// whole line href=\nb')).not.toContain('whole line');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(toneExpressions('<span data-level={c} />')).toEqual([]);
    expect(writesAnchorLinkAttribute('<button onClick={() => jump(id)}>x</button>')).toBe(false);
    expect(linkTargets('<Link to={margin.dashboardUrl}>x</Link>')).toEqual(['{margin.dashboardUrl}']);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(usesRegexLiteral("const a = text.startsWith('x') / 2;")).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });

  it('projectBlock reads one marked region and reports what lies outside it', () => {
    const { block, outside } = projectBlock(`.a {}\n${START}\n.view-project-x {}\n${END}\n.b {}`);
    expect(block).toContain('.view-project-x');
    expect(outside).not.toContain('.view-project-x');
  });
});

describe('project view contract - the real sources', () => {
  it('the components render no raw HTML and build no href', async () => {
    const code = stripSourceComments(await source('src/web/views/project-page-components.tsx'));
    expect(usesRawHtmlProp(code)).toBe(false);
    expect(writesAnchorLinkAttribute(code)).toBe(false);
  });

  it('every Link target is a model url field: a tile url or the margin dashboardUrl', async () => {
    const code = stripSourceComments(await source('src/web/views/project-page-components.tsx'));
    const targets = linkTargets(code);
    expect(targets.length).toBeGreaterThanOrEqual(2);
    for (const target of targets) expect(target, target).toMatch(/^\{(tile\.url|margin\.dashboardUrl)\}$/);
    expect(targets).toContain('{margin.dashboardUrl}');
  });

  it('writes data-tone only from the composed model or a documented tone', async () => {
    const code = stripSourceComments(await source('src/web/views/project-page-components.tsx'));
    for (const expression of toneExpressions(code)) {
      if (expression.startsWith('"')) expect(TONES, expression).toContain(expression.slice(1, -1));
      else expect(['{tile.tone}', '{row.tone}', '{entry.tone}'], expression).toContain(expression);
    }
  });

  it('the tile tones the server join assigns are complete or quiet only', async () => {
    const code = stripSourceComments(await source('src/presentation/project-context.ts'));
    const tones = [...code.matchAll(/tone:\s*(?:toneOf\([^,]+,\s*)?'([a-z-]+)'/g)].map((m) => m[1]);
    expect(tones.length).toBeGreaterThanOrEqual(4);
    for (const tone of tones) expect(['complete', 'quiet'], tone).toContain(tone);
  });

  it('no file writes the destructive or warning tone', async () => {
    for (const path of [
      'src/web/views/project-page.ts',
      'src/web/views/project-page-components.tsx',
      'src/planning-repo/handlers/project.ts',
      'src/presentation/project-context.ts',
    ]) {
      const code = stripSourceComments(await source(path));
      expect(/tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(code), path).toBe(false);
      expect(/data-tone="(destructive|warning)"/.test(code), path).toBe(false);
    }
  });

  it('the composer and the join build no regular expression and use no regular-expression literal', async () => {
    for (const path of ['src/web/views/project-page.ts', 'src/presentation/project-context.ts']) {
      const code = stripSourceComments(await source(path));
      expect(buildsRegExp(code), path).toBe(false);
      expect(usesRegexLiteral(code), path).toBe(false);
    }
  });

  it('the handler builds no regular expression from document text', async () => {
    const code = stripSourceComments(await source('src/planning-repo/handlers/project.ts'));
    expect(buildsRegExp(code)).toBe(false);
  });

  it('the composer, the join and the components import no filesystem module', async () => {
    for (const path of [
      'src/web/views/project-page.ts',
      'src/web/views/project-page-components.tsx',
      'src/presentation/project-context.ts',
    ]) {
      expect(stripSourceComments(await source(path)), path).not.toMatch(/from 'node:(fs|path)|from 'fs'/);
    }
  });

  it('project.ts runs the extraction inside a try block of its own', async () => {
    const text = await source('src/planning-repo/handlers/project.ts');
    const call = text.indexOf('extractProject(fm.body, sections, keyDecisions)');
    expect(call).toBeGreaterThan(-1);
    const tryAt = text.lastIndexOf('try {', call);
    expect(tryAt).toBeGreaterThan(-1);
    expect(text.indexOf('catch', call)).toBeGreaterThan(call);
    // sections and keyDecisions are computed before, outside the try.
    expect(text.indexOf('const keyDecisions =')).toBeLessThan(tryAt);
  });
});

describe('project view contract - the CSS', () => {
  it('the page CSS is one contiguous, guarded region', async () => {
    const css = await source('src/web/styles/globals.css');
    const { block, outside } = projectBlock(css);
    const stripped = stripCssComments(block);
    expect(cssViolations(stripped)).toEqual([]);
    // Every page selector lives inside the region, nothing outside it styles the page.
    expect(stripped).toContain('.view-project-page');
    expect(stripped).toContain('.view-project-margin');
    expect(stripped).toContain('.status-square');
    expect(stripCssComments(outside)).not.toMatch(/\.view-project-|\.status-square/);
  });

  it('the status-square rules write only the four documented tones', async () => {
    const css = stripCssComments(projectBlock(await source('src/web/styles/globals.css')).block);
    const tones = [...css.matchAll(/\.status-square\[data-tone='([a-z-]+)'\]/g)].map((m) => m[1]);
    expect([...new Set(tones)].sort()).toEqual([...TONES].sort());
  });

  it('adds no motion: no transition, no animation, no keyframes', async () => {
    const css = stripCssComments(projectBlock(await source('src/web/styles/globals.css')).block);
    expect(css).not.toMatch(/\btransition\b|\banimation\b|@keyframes/);
  });
});
