// quick-261017-18a (T-18a-01..06, Q18A-07): source-text contract for the VERIFICATION page, in the
// summary-view-contract idiom (readFile + regex, no AST tooling). Only design-language tones and theme
// tokens colour document content; nothing renders raw HTML; no link target is built from document
// text; the composer and extractor never build a regular expression from author text; the seam wiring
// is in place; and the additive CSS block is one contiguous, guarded region. The checks are small
// helpers with a positive control that runs them on planted in-memory strings (nothing is written
// under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261017-18a:start */';
const END = '/* quick-261017-18a:end */';

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

/** A literal `data-tone` value - every tone must flow from the composer's maps. */
function writesLiteralTone(text: string): boolean {
  return /data-tone="[^"]*"/.test(text) || /data-tone=\{\s*['"`]/.test(text);
}

/** The parse-degradation tones written as a tone value (a severity named `warning` is not one). */
function writesForbiddenTone(text: string): boolean {
  return /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) || /['"](destructive|warning)['"]\s*as\s+VerificationTone/.test(text);
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
  if (/transition[^;{}]*transform/.test(block)) found.push('transform transition');
  if (/:root/.test(block)) found.push(':root');
  return found;
}

function verificationBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('verification view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
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
    expect(cssViolations('a { transition: transform 0.2s ease; }')).toContain('transform transition');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesLiteralTone('<span data-tone={rail.big.tone} />')).toBe(false);
    expect(writesForbiddenTone("const severity = 'warning';")).toBe(false);
    expect(writesAnchorLinkAttribute('<button onClick={() => jump(id)}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(buildsRegExp('const m = /abc/.exec(text);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); transition: color 0.15s ease; }')).toEqual([]);
  });
});

describe('verification view contract - the real sources', () => {
  it('the components render no raw HTML, write no literal tone and build no link', async () => {
    const text = await source('src/web/views/verification-board-components.tsx');
    expect(usesRawHtmlProp(text)).toBe(false);
    expect(writesLiteralTone(text)).toBe(false);
    expect(writesForbiddenTone(text)).toBe(false);
    expect(writesAnchorLinkAttribute(text)).toBe(false);
  });

  it('no file writes the destructive or warning tone', async () => {
    for (const path of [
      'src/web/views/verification-board.ts',
      'src/web/views/verification-board-components.tsx',
      'src/planning-repo/handlers/verification-report.ts',
      'src/planning-repo/handlers/verification.ts',
    ]) {
      expect(writesForbiddenTone(await source(path)), path).toBe(false);
    }
  });

  it('the composer and the extractor never construct a regular expression object', async () => {
    expect(buildsRegExp(await source('src/web/views/verification-board.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/verification-report.ts'))).toBe(false);
  });

  it('the extractor and composer import no filesystem module', async () => {
    for (const path of ['src/planning-repo/handlers/verification-report.ts', 'src/web/views/verification-board.ts']) {
      expect(await source(path), path).not.toMatch(/from 'node:(fs|path)|from 'fs'/);
    }
  });

  it('index.ts registers the handler after UatHandler and before FrontmatterOnlyHandler', async () => {
    const text = await source('src/planning-repo/handlers/index.ts');
    const uat = text.indexOf('  UatHandler,');
    const verification = text.indexOf('  VerificationHandler,');
    const frontmatter = text.indexOf('  FrontmatterOnlyHandler,');
    expect(uat).toBeGreaterThan(-1);
    expect(verification).toBeGreaterThan(uat);
    expect(frontmatter).toBeGreaterThan(verification);
  });

  it('verification.ts calls the extractor inside a try block', async () => {
    const text = await source('src/planning-repo/handlers/verification.ts');
    const call = text.indexOf('extractVerificationReport(fm.body)');
    const tryAt = text.lastIndexOf('try {', call);
    const catchAt = text.indexOf('catch', call);
    expect(call).toBeGreaterThan(-1);
    expect(tryAt).toBeGreaterThan(-1);
    expect(tryAt).toBeLessThan(call);
    expect(catchAt).toBeGreaterThan(call);
  });

  it('manifests.ts declares the hook and keeps the layout and lead', async () => {
    const text = await source('src/web/views/manifests.ts');
    expect(text).toContain('verificationBoard: composeVerificationBoard');
    const entry = text.slice(text.indexOf('  verification: {'));
    expect(entry.slice(0, 1200)).toContain('layout: verificationLayout');
    expect(entry.slice(0, 1200)).toContain('What still needs a human to check, first');
  });

  it('artifact-page.tsx opts in through the manifest hook with one early return and no kind branch', async () => {
    const text = await source('src/web/pages/artifact-page.tsx');
    expect(text).toContain('manifest.verificationBoard?.(viewInput)');
    expect(text).toContain('planNavigator !== null || verificationBoard !== null');
    expect(text).toContain('verificationBoard !== null ||');
    expect(text).toContain("if (verificationBoard && mode === 'view')");
    const early = text.slice(text.indexOf('<VerificationBoardView'), text.indexOf('<VerificationBoardView') + 700);
    expect(early).toContain('<WarningChip tone={warningTone} />');
    expect(text.split('<VerificationBoardView').length - 1).toBe(1);
    expect(text).not.toContain("artifact.kind === 'verification'");
  });

  it('the CSS block exists once, holds every .view-verification- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = verificationBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const outside = css.replace(block, '');
    expect(outside).not.toMatch(/\.view-verification-(rail|ledger|row|gap|square|step|ticket|board|big|stat)/);
    expect(block).toContain('.view-verification-board-page');
  });
});
