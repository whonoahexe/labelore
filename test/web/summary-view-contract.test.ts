// quick-261006-iz7 (T-iz7-01..03, QIZ7-07): source-text contract for the SUMMARY page, in the
// ui-review-view-contract idiom (readFile + regex, no AST tooling). Only design-language tones and
// theme tokens colour document content; nothing renders raw HTML; no link target is built from
// document text; the composer and extractor never build a regular expression from author text; the
// seam wiring is in place; and the additive CSS block is one contiguous, guarded region. The checks
// are small helpers with a positive control that runs them on planted in-memory strings (nothing is
// written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261006-iz7:start */';
const END = '/* quick-261006-iz7:end */';

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

/** A literal `data-tone` value — every tone must flow from the composer's maps. */
function writesLiteralTone(text: string): boolean {
  return /data-tone="[^"]*"/.test(text) || /data-tone=\{\s*['"`]/.test(text);
}

function writesForbiddenTone(text: string): boolean {
  return /['"](destructive|warning)['"]/.test(text);
}

/** The anchor-link attribute — a link target could carry document text. */
function writesAnchorLinkAttribute(text: string): boolean {
  return /\bhref\s*=/.test(text) || /\bhref\s*:/.test(text);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** What the CSS block must never contain — the other view blocks' own list. */
function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  return found;
}

function summaryBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('summary view contract — helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone("const t = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('const t = "warning";')).toBe(true);
    expect(writesAnchorLinkAttribute('<a href={ref}>x</a>')).toBe(true);
    expect(writesAnchorLinkAttribute('const l = { href: ref };')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(buildsRegExp('const re = RegExp(ref);')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesLiteralTone('<span data-tone={head.status.tone} />')).toBe(false);
    expect(writesForbiddenTone('const t = REQ_STATE[state].tone;')).toBe(false);
    expect(writesAnchorLinkAttribute('<Link to={preview.url}>x</Link>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(buildsRegExp('const m = /abc/.exec(text);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual([]);
  });
});

describe('summary view contract — the real sources', () => {
  it('summary-run-components.tsx renders no raw HTML, writes no literal tone and no anchor-link attribute', async () => {
    const text = await source('src/web/views/summary-run-components.tsx');
    expect(usesRawHtmlProp(text)).toBe(false);
    expect(writesLiteralTone(text)).toBe(false);
    expect(writesForbiddenTone(text)).toBe(false);
    expect(writesAnchorLinkAttribute(text)).toBe(false);
  });

  it('its only Link targets come from the preview url and the lineage url', async () => {
    const text = await source('src/web/views/summary-run-components.tsx');
    const targets = [...text.matchAll(/<Link\b[^>]*\bto=\{([^}]*)\}/g)].map((m) => m[1].trim());
    expect(targets.sort()).toEqual(['preview.url', 'url']);
  });

  it('the composer and the extractor never construct a regular expression object', async () => {
    expect(buildsRegExp(await source('src/web/views/summary-run.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/summary-run.ts'))).toBe(false);
  });

  it('the composer never names a parse-degradation tone', async () => {
    expect(writesForbiddenTone(await source('src/web/views/summary-run.ts'))).toBe(false);
  });

  it('manifests.ts declares summaryRun and keeps the summary promote list', async () => {
    const text = await source('src/web/views/manifests.ts');
    expect(text).toContain('summaryRun: composeSummaryRun');
    const entry = text.slice(text.indexOf("kind: 'summary'"));
    expect(entry.slice(0, 900)).toContain('What shipped, against what the plan committed to.');
    expect(entry.slice(0, 900)).toContain('/^accomplishments/i');
    expect(entry.slice(0, 900)).toContain('/^next phase readiness/i');
  });

  it('summary.ts calls extractSummaryRun inside a try block', async () => {
    const text = await source('src/planning-repo/handlers/summary.ts');
    const call = text.indexOf('extractSummaryRun(fm.body)');
    const tryAt = text.lastIndexOf('try {', call);
    const catchAt = text.indexOf('catch', call);
    expect(call).toBeGreaterThan(-1);
    expect(tryAt).toBeGreaterThan(-1);
    expect(tryAt).toBeLessThan(call);
    expect(catchAt).toBeGreaterThan(call);
  });

  it('artifact-page.tsx opts into the view through the manifest hook with the warning chip', async () => {
    const text = await source('src/web/pages/artifact-page.tsx');
    expect(text).toContain('manifest.summaryRun?.(viewInput)');
    const early = text.slice(text.indexOf('<SummaryRunView'), text.indexOf('<SummaryRunView') + 700);
    expect(early).toContain('<WarningChip tone={warningTone} />');
    expect(text).toContain('summaryRun !== null ||');
    expect(text.split('<SummaryRunView').length - 1).toBe(1);
  });

  it('the CSS block exists once, holds every .view-summary- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = summaryBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const outside = css.replace(block, '');
    expect(outside).not.toContain('.view-summary-');
    expect(block).toContain('.view-summary-head-grid');
  });
});
