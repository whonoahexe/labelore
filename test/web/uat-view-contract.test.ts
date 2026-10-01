// quick-261001-qk7 (T-qk7-02, T-qk7-03, QK7-08): source-text contract for the UAT session page, in
// the patterns-view-contract idiom (readFile + regex, no AST tooling). Only design-language tones
// and theme tokens colour document content; nothing renders raw HTML; no href is built from
// document text; the composer and extractor never build a regular expression from author text; and
// the additive CSS block is one contiguous, guarded region. The checks are small helpers with a
// positive control that runs them on planted in-memory strings (nothing is written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261001-qk7:start */';
const END = '/* quick-261001-qk7:end */';

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

/** An href (or src) whose value is not a fixed string — i.e. one that could carry document text. */
function buildsHref(text: string): boolean {
  return /\bhref\s*=/.test(text) || /\bhref\s*:/.test(text);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** What the CSS block must never contain — the PATTERNS block's own list. */
function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  return found;
}

function uatBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('uat view contract — helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone("const t = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('const t = "warning";')).toBe(true);
    expect(buildsHref('<a href={item.debugSession}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesLiteralTone('<span data-tone={test.tone} />')).toBe(false);
    expect(writesForbiddenTone('const t = RESULT_TONE[result];')).toBe(false);
    expect(buildsHref('<span className="view-uat-path">{path}</span>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual([]);
  });
});

describe('uat view contract', () => {
  it('the components never use the raw-HTML injection prop, a literal tone, or an href', async () => {
    const components = await source('src/web/views/uat-session-components.tsx');
    expect(usesRawHtmlProp(components)).toBe(false);
    expect(writesLiteralTone(components)).toBe(false);
    expect(writesForbiddenTone(components)).toBe(false);
    expect(buildsHref(components)).toBe(false);
    expect(components).toContain('data-tone={test.tone}');
  });

  it('the composer and the extractor never build a regular expression from document text', async () => {
    expect(buildsRegExp(await source('src/web/views/uat-session.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/uat-session.ts'))).toBe(false);
  });

  it('the composer chooses tones in exactly one map each and never a parse-degradation tone', async () => {
    const composer = await source('src/web/views/uat-session.ts');
    expect(composer).toMatch(
      /RESULT_TONE: Record<UatResult, UatTone> = \{\s*pass: 'complete',\s*issue: 'missing',\s*blocked: 'in-flight',\s*skipped: 'quiet',\s*pending: 'quiet',\s*other: 'quiet',\s*\}/,
    );
    expect(composer).toMatch(
      /SEVERITY_TONE: Record<string, UatTone> = \{\s*blocker: 'missing',\s*major: 'in-flight',\s*minor: 'quiet',\s*cosmetic: 'quiet',\s*\}/,
    );
    expect(writesForbiddenTone(composer)).toBe(false);
  });

  it('the manifest declares the uatSession hook and keeps the promote list as the fallback', async () => {
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests).toContain('uatSession: composeUatSession');
    expect(manifests).toMatch(/kind: 'uat'[\s\S]*promote: \[[\s\S]*uat-facts[\s\S]*uatSession: composeUatSession/);
  });

  it('the handler is registered after the pattern handler and before the frontmatter-only one', async () => {
    const index = await source('src/planning-repo/handlers/index.ts');
    const at = (name: string): number => index.indexOf(`  ${name},`);
    expect(at('PatternsHandler')).toBeLessThan(at('UatHandler'));
    expect(at('UatHandler')).toBeLessThan(at('FrontmatterOnlyHandler'));
    expect(at('GenericMarkdownHandler')).toBe(index.lastIndexOf('  GenericMarkdownHandler,'));
  });

  it('the qk7 CSS block exists once, holds every .view-uat- rule, and is free of forbidden things', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split('quick-261001-qk7:start').length - 1).toBe(1);
    expect(css.split('quick-261001-qk7:end').length - 1).toBe(1);
    const block = uatBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    const rules = [...css.matchAll(/^\.view-uat-[\w-]*/gm)].map((m) => m.index ?? -1);
    expect(rules.length).toBeGreaterThan(40);
    for (const index of rules) {
      expect(index).toBeGreaterThan(start);
      expect(index).toBeLessThan(end);
    }
  });

  it('squares and bar segments read the result tokens; the quote, reason and strip read theirs', async () => {
    const block = uatBlock(await source('src/web/styles/globals.css'));
    const rule = (selector: string): string => {
      const at = block.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      return block.slice(at, block.indexOf('}', at));
    };
    const tone = (result: string): string =>
      rule(
        `.view-uat-square[data-result='${result}'],\n.view-uat-bar > [data-result='${result}'],\n.view-uat-bar-key [data-result='${result}'] > i`,
      );
    expect(tone('pass')).toContain('var(--primary)');
    expect(tone('issue')).toContain('var(--missing-fill)');
    expect(tone('blocked')).toContain('var(--in-flight-fill)');
    expect(tone('skipped')).toContain('var(--muted)');
    expect(tone('pending')).toContain('dashed var(--muted-foreground)');
    expect(rule('.view-uat-reported')).toContain('var(--missing-fill)');
    expect(rule('.view-uat-reported')).toContain('var(--card-veil)');
    expect(rule('.view-uat-reason')).toContain('var(--in-flight-fill)');
    expect(rule('.view-uat-resolved')).toContain('var(--primary-tint)');
    expect(rule('.view-uat-mismatch')).toContain('var(--in-flight-fill)');
    expect(rule('.view-uat-now')).toContain('var(--primary-tint)');
  });
});
