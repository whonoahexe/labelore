// quick-261003-526 (T-526-02, T-526-03, V526-09): source-text contract for the VALIDATION strategy
// page, in the uat-view-contract idiom (readFile + regex, no AST tooling). Only design-language
// tones and theme tokens colour document content; nothing renders raw HTML; no href is built from
// document text; the composer and extractor never build a regular expression from author text; and
// the additive CSS block is one contiguous, guarded region. The checks are small helpers with a
// positive control that runs them on planted in-memory strings (nothing is written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261003-526:start */';
const END = '/* quick-261003-526:end */';

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

/** An href whose value is not a fixed string — i.e. one that could carry document text. */
function buildsHref(text: string): boolean {
  return /\bhref\s*=/.test(text) || /\bhref\s*:/.test(text);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** What the CSS block must never contain — the PATTERNS / UAT block's own list. */
function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  return found;
}

function validationBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('validation view contract — helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone("const t = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('const t = "warning";')).toBe(true);
    expect(buildsHref('<a href={task.command}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesLiteralTone('<span data-tone={task.tone} />')).toBe(false);
    expect(writesForbiddenTone('const t = STATUS_TONE[status];')).toBe(false);
    expect(buildsHref('<span className="view-validation-ref">{id}</span>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual([]);
  });
});

describe('validation view contract', () => {
  it('the components never use the raw-HTML injection prop, a literal tone, an href, or a read-only tag', async () => {
    const components = await source('src/web/views/validation-strategy-components.tsx');
    expect(usesRawHtmlProp(components)).toBe(false);
    expect(writesLiteralTone(components)).toBe(false);
    expect(writesForbiddenTone(components)).toBe(false);
    expect(buildsHref(components)).toBe(false);
    expect(components).toContain('data-tone={task.tone}');
    expect(components.toLowerCase()).not.toContain('read-only');
  });

  it('the composer and the extractor never build a regular expression from document text', async () => {
    expect(buildsRegExp(await source('src/web/views/validation-strategy.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/validation-strategy.ts'))).toBe(false);
  });

  it('the composer chooses tones in exactly one map each and never a parse-degradation tone', async () => {
    const composer = await source('src/web/views/validation-strategy.ts');
    expect(composer).toMatch(
      /STATUS_TONE: Record<ValidationRowStatus, ValidationTone> = \{\s*green: 'complete',\s*red: 'missing',\s*flaky: 'in-flight',\s*pending: 'quiet',\s*none: 'quiet',\s*\}/,
    );
    expect(composer).toMatch(
      /DOC_STATUS: Record<'draft' \| 'ready' \| 'validated', \{ label: string; tone: ValidationTone \}> = \{\s*draft: \{ label: 'Draft', tone: 'in-flight' \},\s*ready: \{ label: 'Ready', tone: 'active' \},\s*validated: \{ label: 'Validated', tone: 'complete' \},\s*\}/,
    );
    expect(composer).toMatch(
      /OUTCOME_TONE: Record<ValidationOutcomeKind, ValidationTone> = \{\s*pass: 'complete',\s*'not-observed': 'in-flight',\s*awaiting: 'quiet',\s*\}/,
    );
    expect(writesForbiddenTone(composer)).toBe(false);
  });

  it('the manifest declares the validationStrategy hook and keeps the promote list as the fallback', async () => {
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests).toContain('validationStrategy: composeValidationStrategy');
    expect(manifests).toMatch(
      /kind: 'validation'[\s\S]*promote: \[[\s\S]*validation-facts[\s\S]*validationStrategy: composeValidationStrategy/,
    );
  });

  it('the handler is registered after the pattern handler and before the frontmatter-only one', async () => {
    const index = await source('src/planning-repo/handlers/index.ts');
    const at = (name: string): number => index.indexOf(`  ${name},`);
    expect(at('PatternsHandler')).toBeLessThan(at('ValidationHandler'));
    expect(at('ValidationHandler')).toBeLessThan(at('FrontmatterOnlyHandler'));
    expect(at('ValidationHandler')).toBeLessThan(at('UatHandler'));
    expect(at('GenericMarkdownHandler')).toBe(index.lastIndexOf('  GenericMarkdownHandler,'));
  });

  it('the artifact page wires the header override and the view', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('validationHeaderProps(');
    expect(page).toContain('ValidationStrategyView');
  });

  it('the 526 CSS block exists once, holds every .view-validation- rule, and is free of forbidden things', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split('quick-261003-526:start').length - 1).toBe(1);
    expect(css.split('quick-261003-526:end').length - 1).toBe(1);
    const block = validationBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    const rules = [...css.matchAll(/^\.view-validation-[\w-]*/gm)].map((m) => m.index ?? -1);
    expect(rules.length).toBeGreaterThan(40);
    for (const index of rules) {
      expect(index).toBeGreaterThan(start);
      expect(index).toBeLessThan(end);
    }
  });

  it('squares, rails and stamps read the status tokens', async () => {
    const block = validationBlock(await source('src/web/styles/globals.css'));
    const rule = (selector: string): string => {
      const at = block.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      return block.slice(at, block.indexOf('}', at));
    };
    expect(rule(".view-validation-square[data-tone='complete']")).toContain('var(--primary)');
    expect(rule(".view-validation-square[data-tone='missing']")).toContain('var(--missing-fill)');
    expect(rule(".view-validation-square[data-tone='in-flight']")).toContain('var(--in-flight-fill)');
    expect(rule('.view-validation-square')).toContain('dashed var(--muted-foreground)');
    expect(rule(".view-validation-tile[data-tone='complete']::before")).toContain('var(--primary)');
    expect(rule(".view-validation-tile[data-tone='missing']::before")).toContain('var(--missing-fill)');
    expect(rule(".view-validation-tile[data-tone='in-flight']::before")).toContain('var(--in-flight-fill)');
    expect(rule(".view-validation-glyph[data-tone='in-flight']")).toContain('var(--in-flight-border)');
    expect(rule(".view-validation-stamp[data-tone='complete']")).toContain('var(--primary-tint)');
    expect(rule(".view-validation-stamp[data-tone='in-flight']")).toContain('var(--in-flight-border)');
    expect(rule(".view-validation-outcome[data-tone='complete']")).toContain('var(--primary)');
    expect(rule(".view-validation-outcome[data-tone='in-flight']")).toContain('var(--in-flight-fill)');
  });
});
