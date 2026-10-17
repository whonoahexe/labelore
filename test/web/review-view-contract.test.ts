// quick-261017-k44 (T-k44-01..07): source-text contract for the REVIEW page, in the
// verification-view-contract idiom (readFile + regex, no AST tooling). Only design-language tones and
// theme tokens colour document content; nothing renders raw HTML; the only link target is the
// composed fix-report url; the extractors, the join and the composer never build a regular expression
// from author text or touch the filesystem; the seam wiring is in place; and the additive CSS block is
// one contiguous, guarded region. The checks are small helpers with a positive control that runs them
// on planted in-memory strings (nothing is written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261017-k44:start */';
const END = '/* quick-261017-k44:end */';

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

/** A literal `data-tone` value - every tone must flow from the composer's maps. */
function writesLiteralTone(text: string): boolean {
  return /data-tone="[^"]*"/.test(text) || /data-tone=\{\s*['"`]/.test(text);
}

/** The parse-degradation tones written as a tone value (a severity named `warning` is not one). */
function writesForbiddenTone(text: string): boolean {
  return /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) || /['"](destructive|warning)['"]\s*as\s+Review\w*Tone/.test(text);
}

/** Every `to=` target written on a `<Link`. */
function linkTargets(text: string): string[] {
  const targets: string[] = [];
  let at = text.indexOf('<Link');
  while (at !== -1) {
    const end = text.indexOf('>', at);
    const tag = text.slice(at, end === -1 ? undefined : end);
    const to = tag.indexOf('to=');
    targets.push(to === -1 ? '' : tag.slice(to).split(' ')[0].trim());
    at = text.indexOf('<Link', at + 5);
  }
  return targets;
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
  if (/(^|[^-\w])transform\s*:/.test(block)) found.push('transform');
  if (/:root/.test(block)) found.push(':root');
  return found;
}

function reviewBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('review view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('{ tone: "warning" }')).toBe(true);
    expect(linkTargets('<Link to={doc.url}>x</Link>')).toEqual(['to={doc.url}']);
    expect(writesAnchorLinkAttribute('<a href={ref}>x</a>')).toBe(true);
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
    expect(cssViolations('a { transform: scale(1); }')).toContain('transform');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesLiteralTone('<span data-tone={stamp.tone} />')).toBe(false);
    expect(writesForbiddenTone("const severity = 'warning';")).toBe(false);
    expect(writesAnchorLinkAttribute('<button onClick={() => jump(id)}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(buildsRegExp('const m = /abc/.exec(text);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('review view contract - the real sources', () => {
  it('the components render no raw HTML, write no literal tone and link only to the composed fix url', async () => {
    const text = await source('src/web/views/review-threads-components.tsx');
    expect(usesRawHtmlProp(text)).toBe(false);
    expect(writesLiteralTone(text)).toBe(false);
    expect(writesForbiddenTone(text)).toBe(false);
    expect(writesAnchorLinkAttribute(text)).toBe(false);
    expect(linkTargets(text)).toEqual(['to={item.url}']);
  });

  it('no file of this item writes the destructive or warning tone', async () => {
    for (const path of [
      'src/web/views/review-threads.ts',
      'src/web/views/review-threads-components.tsx',
      'src/planning-repo/handlers/review-report.ts',
      'src/planning-repo/handlers/review.ts',
      'src/presentation/review-context.ts',
    ]) {
      expect(writesForbiddenTone(await source(path)), path).toBe(false);
    }
  });

  it('the extractors, the join and the composer never construct a regular expression object or import a filesystem module', async () => {
    for (const path of [
      'src/planning-repo/handlers/review-report.ts',
      'src/presentation/review-context.ts',
      'src/web/views/review-threads.ts',
    ]) {
      const text = await source(path);
      expect(buildsRegExp(text), path).toBe(false);
      expect(text, path).not.toMatch(/from 'node:(fs|path)|from 'fs'/);
    }
  });

  it('index.ts registers both handlers after UiReviewHandler and before FrontmatterOnlyHandler', async () => {
    const text = await source('src/planning-repo/handlers/index.ts');
    const uiReview = text.indexOf('  UiReviewHandler,');
    const review = text.indexOf('  ReviewHandler,');
    const fix = text.indexOf('  ReviewFixHandler,');
    const frontmatter = text.indexOf('  FrontmatterOnlyHandler,');
    expect(uiReview).toBeGreaterThan(-1);
    expect(review).toBeGreaterThan(uiReview);
    expect(fix).toBeGreaterThan(review);
    expect(frontmatter).toBeGreaterThan(fix);
  });

  it('review.ts calls both extractors inside try blocks and keeps the warnings projection', async () => {
    const text = await source('src/planning-repo/handlers/review.ts');
    for (const call of ['extractReviewReport(fm.body)', 'extractReviewFixReport(fm.body)']) {
      const at = text.indexOf(call);
      expect(at, call).toBeGreaterThan(-1);
      const tryAt = text.lastIndexOf('try {', at);
      expect(tryAt, call).toBeGreaterThan(-1);
      expect(text.indexOf('catch', at), call).toBeGreaterThan(at);
    }
    expect(text).toContain('...extractReviewWarnings(fm.body)');
  });

  it('server/index.ts builds the context inside a try block and returns it', async () => {
    const text = await source('src/server/index.ts');
    const call = text.indexOf('buildReviewContext(activeDerived.presentation');
    expect(call).toBeGreaterThan(-1);
    expect(text.lastIndexOf('try {', call)).toBeGreaterThan(text.lastIndexOf('manualChecks = ', call));
    expect(text).toMatch(/manualChecks,\s+reviewContext,\s+\};/);
  });

  it('manifests.ts declares the hook and keeps the review lead', async () => {
    const text = await source('src/web/views/manifests.ts');
    expect(text).toContain('reviewThreads: composeReviewThreads');
    expect(text).toContain('Findings from cross-AI review, by severity.');
  });

  it('artifact-page.tsx opts in through the manifest hook with one early return and no kind branch', async () => {
    const text = await source('src/web/pages/artifact-page.tsx');
    expect(text).toContain('manifest.reviewThreads?.(viewInput)');
    expect(text).toContain('reviewThreads !== null ||');
    expect(text).toContain("if (reviewThreads && mode === 'view')");
    expect(text).toContain('reviewContext: query.data.reviewContext ?? null');
    const early = text.slice(text.indexOf('<ReviewThreadsView'), text.indexOf('<ReviewThreadsView') + 700);
    expect(early).toContain('<WarningChip tone={warningTone} />');
    expect(text.split('<ReviewThreadsView').length - 1).toBe(1);
    expect(text).not.toContain("artifact.kind === 'review'");
  });

  it('the CSS block exists once, holds every .view-review- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = reviewBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const outside = css.replace(block, '');
    expect(outside).not.toContain('.view-review-');
    expect(block).toContain('.view-review-page');
  });
});
