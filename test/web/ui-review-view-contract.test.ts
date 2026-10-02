// quick-261003-528 (T-528-02, T-528-03, QK528-07): source-text contract for the UI-REVIEW scorecard,
// in the uat-view-contract idiom (readFile + regex, no AST tooling). Only design-language tones and
// theme tokens colour document content; nothing renders raw HTML; no href is built from document
// text; the composer and extractor never build a regular expression from author text; and the
// additive CSS block is one contiguous, guarded region. The checks are small helpers with a positive
// control that runs them on planted in-memory strings (nothing is written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261003-528:start */';
const END = '/* quick-261003-528:end */';

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

/** An href whose value could carry document text. */
function buildsHref(text: string): boolean {
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

function uiReviewBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('ui-review view contract — helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone("const t = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('const t = "warning";')).toBe(true);
    expect(buildsHref('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesLiteralTone('<span data-tone={pillar.tone} />')).toBe(false);
    expect(writesForbiddenTone('const t = ITEM_TONE[kind];')).toBe(false);
    expect(buildsHref('<span className="view-ui-review-ref">{ref}</span>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual([]);
  });
});

describe('ui-review view contract', () => {
  it('the components never use the raw-HTML injection prop, a literal tone or an href', async () => {
    const components = await source('src/web/views/ui-review-components.tsx');
    expect(usesRawHtmlProp(components)).toBe(false);
    expect(writesLiteralTone(components)).toBe(false);
    expect(writesForbiddenTone(components)).toBe(false);
    expect(buildsHref(components)).toBe(false);
    expect(components).toContain('data-tone={pillar.tone}');
  });

  it('the only Link target is the baseline url from the composed model', async () => {
    const components = await source('src/web/views/ui-review-components.tsx');
    const links = [...components.matchAll(/<Link\b[\s\S]*?>/g)].map((m) => m[0]);
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('to={method.baseline.url}');
  });

  it('the composer and the extractor never build a regular expression from document text', async () => {
    expect(buildsRegExp(await source('src/web/views/ui-review.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/ui-review-audit.ts'))).toBe(false);
  });

  it('the composer chooses tones in exactly one map each and never a parse-degradation tone', async () => {
    const composer = await source('src/web/views/ui-review.ts');
    expect(composer).toMatch(
      /ITEM_TONE: Record<UiReviewItemKind, UiReviewTone> = \{\s*pass: 'complete',\s*flag: 'in-flight',\s*fail: 'missing',\s*note: 'quiet',\s*\}/,
    );
    expect(composer).toMatch(/if \(score >= 4\) return 'complete';\s*if \(score === 3\) return 'in-flight';\s*return 'missing';/);
    expect(composer).toContain("FIX_TONE: UiReviewTone = 'in-flight'");
    expect(composer).toContain("SELECTED_TONE: UiReviewTone = 'active'");
    expect(writesForbiddenTone(composer)).toBe(false);
  });

  it('the manifest declares the uiReview hook and keeps the promote list as the fallback', async () => {
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests).toContain('uiReview: composeUiReview');
    expect(manifests).toMatch(
      /kind: 'ui-review'[\s\S]*promote: \[[\s\S]*ui-review-facts[\s\S]*top 3 priority fixes[\s\S]*uiReview: composeUiReview/,
    );
  });

  it('the handler is registered before the generic one, which stays last', async () => {
    const index = await source('src/planning-repo/handlers/index.ts');
    const at = (name: string): number => index.indexOf(`  ${name},`);
    expect(at('UiReviewHandler')).toBeGreaterThan(-1);
    expect(at('UiReviewHandler')).toBeLessThan(at('GenericMarkdownHandler'));
    expect(at('GenericMarkdownHandler')).toBe(index.lastIndexOf('  GenericMarkdownHandler,'));
  });

  it('the page dispatches through the manifest hook and never renders the warning chip for it', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('manifest.uiReview?.(viewInput)');
    expect(page).toContain('<UiReviewView');
    expect(page).toMatch(/if \(uiReview && mode === 'view' && warningTone === null\)/);
  });

  it('the 528 CSS block exists once, holds every .view-ui-review- rule, and is free of forbidden things', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split('quick-261003-528:start').length - 1).toBe(1);
    expect(css.split('quick-261003-528:end').length - 1).toBe(1);
    const block = uiReviewBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    const rules = [...css.matchAll(/^\.view-ui-review-[\w-]*/gm)].map((m) => m.index ?? -1);
    expect(rules.length).toBeGreaterThan(40);
    for (const index of rules) {
      expect(index).toBeGreaterThan(start);
      expect(index).toBeLessThan(end);
    }
  });

  it('the radar, tabs, found cards and fix cards read their tone tokens', async () => {
    const block = uiReviewBlock(await source('src/web/styles/globals.css'));
    const rule = (selector: string): string => {
      const at = block.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      return block.slice(at, block.indexOf('}', at));
    };
    expect(rule('.view-ui-review-shape')).toContain('var(--primary-tint)');
    expect(rule('.view-ui-review-shape')).toContain('var(--primary)');
    expect(rule(".view-ui-review-dot[data-tone='complete']")).toContain('var(--primary)');
    expect(rule(".view-ui-review-dot[data-tone='in-flight']")).toContain('var(--in-flight-fill)');
    expect(rule(".view-ui-review-dot[data-tone='missing']")).toContain('var(--missing-fill)');
    expect(rule(".view-ui-review-found-card[data-kind='fail']")).toContain('var(--missing-fill)');
    expect(rule(".view-ui-review-found-card[data-kind='flag']")).toContain('var(--in-flight-fill)');
    expect(rule('.view-ui-review-fixcard')).toContain('dashed var(--in-flight-border)');
    expect(rule(".view-ui-review-fixcard[data-highlight='true']")).toContain('var(--in-flight-fill)');
    expect(rule(".view-ui-review-tab[aria-selected='true']")).toContain('var(--primary)');
    expect(rule(".view-ui-review-bar[data-now='true'] i")).toContain('var(--primary)');
    expect(rule('.view-ui-review-bar i')).toContain('var(--muted)');
  });
});
