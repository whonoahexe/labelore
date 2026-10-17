// quick-261017-k45 (T-k45-01..06, QK45-06): source-text contract for the LEARNINGS page, in the
// verification-view-contract idiom (readFile + regex, no AST tooling). Nothing renders raw HTML; no
// link target is built from document text; the page writes no tone and never the parse-degradation
// tones; the composer and extractor build no regular expression from author text and import no
// filesystem module; the seam wiring is in place; and the additive CSS block is one contiguous,
// guarded region. The checks are small helpers with a positive control that runs them on planted
// in-memory strings (nothing is written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261017-k45:start */';
const END = '/* quick-261017-k45:end */';

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

/** Any `data-tone` attribute at all: this page rides data-kind and writes no tone. */
function writesToneAttribute(text: string): boolean {
  return /data-tone/.test(text);
}

/** The parse-degradation tones written as a tone value. */
function writesForbiddenTone(text: string): boolean {
  return /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) || /['"](destructive|warning)['"]\s*as\s+[A-Za-z]*Tone/.test(text);
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

function learningsBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('learnings view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesToneAttribute('<span data-tone="complete" />')).toBe(true);
    expect(writesToneAttribute('<span data-tone={tone} />')).toBe(true);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('{ tone: "warning" }')).toBe(true);
    expect(writesAnchorLinkAttribute('<a href={ref}>x</a>')).toBe(true);
    expect(writesAnchorLinkAttribute('const l = { href: ref };')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(buildsRegExp('const re = RegExp(ref);')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(cssViolations('@keyframes x { from { opacity: 0 } }')).toContain('keyframes');
    expect(cssViolations('a { animation: x 1s; }')).toContain('animation');
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesToneAttribute('<span data-kind={kind} />')).toBe(false);
    expect(writesForbiddenTone("const severity = 'warning';")).toBe(false);
    expect(writesAnchorLinkAttribute('<button onClick={() => jump(id)}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(buildsRegExp('const m = /abc/.exec(text);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('learnings view contract - the real sources', () => {
  it('the components render no raw HTML, build no link and write no tone', async () => {
    const text = await source('src/web/views/learnings-retro-components.tsx');
    expect(usesRawHtmlProp(text)).toBe(false);
    expect(writesAnchorLinkAttribute(text)).toBe(false);
    // The header comment names the attribute; strip comments before checking for a real one.
    const code = text.replace(/\/\/[^\n]*/g, '');
    expect(writesToneAttribute(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
  });

  it('no file writes the destructive or warning tone', async () => {
    for (const path of [
      'src/web/views/learnings-retro.ts',
      'src/web/views/learnings-retro-components.tsx',
      'src/planning-repo/handlers/learnings-retro.ts',
      'src/planning-repo/handlers/learnings.ts',
    ]) {
      expect(writesForbiddenTone(await source(path)), path).toBe(false);
    }
  });

  it('the composer and the extractor never construct a regular expression from text', async () => {
    expect(buildsRegExp(await source('src/web/views/learnings-retro.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/learnings-retro.ts'))).toBe(false);
  });

  it('the extractor and composer import no filesystem module', async () => {
    for (const path of ['src/planning-repo/handlers/learnings-retro.ts', 'src/web/views/learnings-retro.ts']) {
      expect(await source(path), path).not.toMatch(/from 'node:(fs|path)|from 'fs'/);
    }
  });

  it('index.ts registers the handler after UiSpecHandler and before FrontmatterOnlyHandler', async () => {
    const text = await source('src/planning-repo/handlers/index.ts');
    const uiSpec = text.indexOf('  UiSpecHandler,');
    const learnings = text.indexOf('  LearningsHandler,');
    const frontmatter = text.indexOf('  FrontmatterOnlyHandler,');
    expect(uiSpec).toBeGreaterThan(-1);
    expect(learnings).toBeGreaterThan(uiSpec);
    expect(frontmatter).toBeGreaterThan(learnings);
  });

  it('learnings.ts calls the extractor inside a try block', async () => {
    const text = await source('src/planning-repo/handlers/learnings.ts');
    const call = text.indexOf('extractLearningsRetro(fm.body)');
    const tryAt = text.lastIndexOf('try {', call);
    const catchAt = text.indexOf('catch', call);
    expect(call).toBeGreaterThan(-1);
    expect(tryAt).toBeGreaterThan(-1);
    expect(tryAt).toBeLessThan(call);
    expect(catchAt).toBeGreaterThan(call);
  });

  it('manifests.ts declares the hook and keeps the lead and promote list', async () => {
    const text = await source('src/web/views/manifests.ts');
    expect(text).toContain('learningsRetro: composeLearningsRetro');
    const entry = text.slice(text.indexOf('  learnings: {'));
    const head = entry.slice(0, 1500);
    expect(head).toContain("What this phase taught that the next one shouldn't have to re-learn.");
    expect(head).toContain('heading: /^decisions$/i');
    expect(head).toContain('heading: /^surprises$/i');
    expect(head).toContain("factsBlock('counts', 'Counts', ['counts'])");
  });

  it('artifact-page.tsx opts in through the manifest hook with one early return and no kind branch', async () => {
    const text = await source('src/web/pages/artifact-page.tsx');
    expect(text).toContain('manifest.learningsRetro?.(viewInput)');
    expect(text).toContain('learningsRetro !== null ||');
    expect(text).toContain("if (learningsRetro && mode === 'view')");
    const early = text.slice(text.indexOf('<LearningsRetroView'), text.indexOf('<LearningsRetroView') + 700);
    expect(early).toContain('<WarningChip tone={warningTone} />');
    expect(text.split('<LearningsRetroView').length - 1).toBe(1);
    expect(text).not.toContain("artifact.kind === 'learnings'");
  });

  it('the CSS block exists once, holds every .view-learnings- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = learningsBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const outside = css.replace(block, '');
    expect(outside).not.toMatch(/\.view-learnings-/);
    expect(block).toContain('.view-learnings-page');
    expect(block).toContain(".view-learnings-tab[data-kind='surprise']");
  });
});
