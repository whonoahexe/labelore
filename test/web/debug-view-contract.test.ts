// quick-261018-j5h (T-j5h-01..06, QJ5H-06): source-text contract for the DEBUG page, in the
// learnings-view-contract idiom (readFile + regex, no AST tooling). Nothing renders raw HTML; no link
// target is built from document text; the only tones written are the documented ones, from the
// composed model, and never a parse-degradation tone; the composer and extractor build no regular
// expression from author text and import no filesystem module; the seam wiring is in place and adds no
// kind branch; and the additive CSS block is one contiguous, guarded region. The checks are small
// helpers with a positive control that runs them on planted in-memory strings (nothing is written
// under src/). Comments are stripped before every negative check, so a header comment can never trip one.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261018-j5h:start */';
const END = '/* quick-261018-j5h:end */';

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
  return /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) || /['"](destructive|warning)['"]\s*as\s+[A-Za-z]*Tone/.test(text) || /data-tone="(destructive|warning)"/.test(text);
}

function writesAnchorLinkAttribute(text: string): boolean {
  return /\bhref\s*=/.test(text) || /\bhref\s*:/.test(text);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
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

function debugBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('debug view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(toneExpressions('<span data-tone={tone} data-tone="quiet" />')).toEqual(['{tone}', '"quiet"']);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesAnchorLinkAttribute('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(cssViolations('@keyframes x { from { opacity: 0 } }')).toContain('keyframes');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
    expect(stripSourceComments('a // note data-tone="warning"\n// whole line href=\nb')).not.toContain('whole line');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(toneExpressions('<span data-column={c} />')).toEqual([]);
    expect(writesForbiddenTone("const severity = 'warning';")).toBe(false);
    expect(writesAnchorLinkAttribute('<button onClick={() => jump(id)}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('debug view contract - the real sources', () => {
  it('the components render no raw HTML, build no link and write only model tones', async () => {
    const code = stripSourceComments(await source('src/web/views/debug-case-components.tsx'));
    expect(usesRawHtmlProp(code)).toBe(false);
    expect(writesAnchorLinkAttribute(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(toneExpressions(code).sort()).toEqual(['"quiet"', '{lead.tone}', '{status.tone}']);
    // Evidence tags, suspect columns and verification results ride their own attributes.
    expect(code).toContain('data-tag=');
    expect(code).toContain('data-column=');
    expect(code).toContain('data-result=');
  });

  it('no file writes the destructive or warning tone', async () => {
    for (const path of [
      'src/web/views/debug-case.ts',
      'src/web/views/debug-case-components.tsx',
      'src/planning-repo/handlers/debug-session.ts',
      'src/planning-repo/handlers/debug.ts',
    ]) {
      expect(writesForbiddenTone(stripSourceComments(await source(path))), path).toBe(false);
    }
  });

  it('the composer and the extractor never construct a regular expression from text', async () => {
    expect(buildsRegExp(stripSourceComments(await source('src/web/views/debug-case.ts')))).toBe(false);
    expect(buildsRegExp(stripSourceComments(await source('src/planning-repo/handlers/debug-session.ts')))).toBe(false);
  });

  it('the extractor and composer import no filesystem module', async () => {
    for (const path of ['src/planning-repo/handlers/debug-session.ts', 'src/web/views/debug-case.ts']) {
      expect(stripSourceComments(await source(path)), path).not.toMatch(/from 'node:(fs|path)|from 'fs'/);
    }
  });

  it('index.ts registers the handler after LearningsHandler and before FrontmatterOnlyHandler', async () => {
    const text = await source('src/planning-repo/handlers/index.ts');
    const learnings = text.indexOf('  LearningsHandler,');
    const debug = text.indexOf('  DebugHandler,');
    const frontmatter = text.indexOf('  FrontmatterOnlyHandler,');
    expect(learnings).toBeGreaterThan(-1);
    expect(debug).toBeGreaterThan(learnings);
    expect(frontmatter).toBeGreaterThan(debug);
  });

  it('debug.ts calls the extractor inside a try block and matches on the kind', async () => {
    const text = await source('src/planning-repo/handlers/debug.ts');
    const call = text.indexOf('extractDebugSession(fm.body)');
    const tryAt = text.lastIndexOf('try {', call);
    const catchAt = text.indexOf('catch', call);
    expect(call).toBeGreaterThan(-1);
    expect(tryAt).toBeGreaterThan(-1);
    expect(tryAt).toBeLessThan(call);
    expect(catchAt).toBeGreaterThan(call);
    expect(text).toContain("ref.kind === 'debug'");
  });

  it('discovery.ts excludes knowledge-base.md from the debug kind', async () => {
    const text = stripSourceComments(await source('src/planning-repo/discovery.ts'));
    const predicate = text.slice(text.indexOf('export function isDebugSessionPath'));
    expect(predicate.slice(0, 600)).toContain("'knowledge-base.md'");
    expect(text).toContain("isDebugSessionPath(childRelUnderPlanning) ? 'debug'");
  });

  it("'debug' is a view kind and manifests.ts declares the hook, lead and promote fallback", async () => {
    expect(await source('src/web/views/kinds.ts')).toContain("  'debug',\n] as const;");
    const text = await source('src/web/views/manifests.ts');
    expect(text).toContain('debugCase: composeDebugCase');
    const entry = text.slice(text.indexOf('  debug: {'));
    const head = entry.slice(0, 1200);
    expect(head).toContain('Where the investigation stands, what it ruled out, and what fixed it.');
    expect(head).toContain('heading: /^current focus/i');
    expect(head).toContain('heading: /^resolution/i');
    expect(head.indexOf('promote:')).toBeLessThan(head.indexOf('debugCase: composeDebugCase'));
  });

  it('artifact-page.tsx opts in through the manifest hook with one early return and no kind branch', async () => {
    const text = await source('src/web/pages/artifact-page.tsx');
    expect(text).toContain('manifest.debugCase?.(viewInput)');
    expect(text).toContain('debugCase !== null ||');
    expect(text).toContain("if (debugCase && mode === 'view')");
    const early = text.slice(text.indexOf('<DebugCaseView'), text.indexOf('<DebugCaseView') + 700);
    expect(early).toContain('<WarningChip tone={warningTone} />');
    expect(text.split('<DebugCaseView').length - 1).toBe(1);
    expect(text).not.toContain("artifact.kind === 'debug'");
  });

  it('the CSS block exists once, holds every .view-debug- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = debugBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-debug-/);
    expect(block).toContain('.view-debug-page');
    expect(block).toContain(".view-debug-tag[data-tag='finding']");
    expect(block).toContain(".view-debug-column[data-column='ruled']");
  });
});
