// quick-261003-527 (T-527-02, T-527-03, Q527-08): source-text contract for the SECURITY console, in
// the uat-view-contract idiom (readFile + small helpers, no AST tooling). Only design-language tones
// and theme tokens colour document content; nothing renders raw HTML; no href is built from document
// text; the composer and extractor never build a regular expression from author text; and the
// additive CSS block is one contiguous, guarded region. The checks are small helpers with a positive
// control that runs them on planted in-memory strings (nothing is written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261003-527:start */';
const END = '/* quick-261003-527:end */';

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

/** What the CSS block must never contain. */
function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  return found;
}

function securityBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

/** The body of a `const NAME ... = { ... }` map, for exact-content checks. */
function mapBody(text: string, name: string): string {
  const at = text.indexOf(`export const ${name}`);
  expect(at, name).toBeGreaterThan(-1);
  const open = text.indexOf('= {', at);
  return text.slice(open, text.indexOf('};', open));
}

function tonesIn(body: string): string[] {
  return [...body.matchAll(/tone: '([\w-]+)'|: '(complete|missing|in-flight|quiet)'/g)]
    .map((m) => m[1] ?? m[2])
    .sort();
}

describe('security view contract — helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone("const t = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('const t = "warning";')).toBe(true);
    expect(buildsHref('<a href={risk.by}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesLiteralTone('<span data-tone={threat.tone} />')).toBe(false);
    expect(writesForbiddenTone('const t = STATUS_TONE[status];')).toBe(false);
    expect(buildsHref('<span className="view-security-ref">{ref}</span>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual([]);
  });
});

describe('security view contract', () => {
  it('the components never use the raw-HTML injection prop, a literal tone, or an href', async () => {
    const components = await source('src/web/views/security-console-components.tsx');
    expect(usesRawHtmlProp(components)).toBe(false);
    expect(writesLiteralTone(components)).toBe(false);
    expect(writesForbiddenTone(components)).toBe(false);
    expect(buildsHref(components)).toBe(false);
    expect(components).toContain('data-tone={threat.tone}');
  });

  it('the composer and the extractor never build a regular expression from document text', async () => {
    expect(buildsRegExp(await source('src/web/views/security-console.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/security-register.ts'))).toBe(false);
  });

  it('the composer chooses tones in exactly one map each and never a parse-degradation tone', async () => {
    const composer = await source('src/web/views/security-console.ts');
    expect(tonesIn(mapBody(composer, 'STATUS_TONE'))).toEqual(['complete', 'in-flight', 'missing', 'quiet']);
    expect(composer).toMatch(
      /STATUS_TONE: Record<SecurityRowStatus, SecurityTone> = \{\s*open: 'missing',\s*'open-low': 'in-flight',\s*closed: 'complete',\s*unknown: 'quiet',\s*\}/,
    );
    expect(tonesIn(mapBody(composer, 'DOC_STATUS'))).toEqual(['complete', 'in-flight', 'in-flight']);
    expect(writesForbiddenTone(composer)).toBe(false);
  });

  it('severity has no tone map: the pips are neutral', async () => {
    const composer = await source('src/web/views/security-console.ts');
    expect(composer).not.toMatch(/SEVERITY_TONE|SEV_TONE/);
    expect(composer).toMatch(/SEV_PIPS: Record<SecuritySeverityLevel, number> = \{\s*critical: 4,\s*high: 3,\s*medium: 2,\s*low: 1,\s*unknown: 0,\s*\}/);
  });

  it('the manifest declares the securityConsole hook and keeps the promote list as the fallback', async () => {
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests).toContain('securityConsole: composeSecurityConsole');
    expect(manifests).toMatch(/kind: 'security'[\s\S]*promote: \[[\s\S]*security-facts[\s\S]*securityConsole: composeSecurityConsole/);
  });

  it('the handler is registered before the frontmatter-only one, with the generic handler last', async () => {
    const index = await source('src/planning-repo/handlers/index.ts');
    const at = (name: string): number => index.indexOf(`  ${name},`);
    expect(at('ResearchHandler')).toBeLessThan(at('SecurityHandler'));
    expect(at('SecurityHandler')).toBeLessThan(at('PatternsHandler'));
    expect(at('SecurityHandler')).toBeLessThan(at('FrontmatterOnlyHandler'));
    expect(at('GenericMarkdownHandler')).toBe(index.lastIndexOf('  GenericMarkdownHandler,'));
  });

  it('the page renders the console only in View mode and falls through otherwise', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('securityConsole && mode === \'view\'');
    expect(page).toContain('<SecurityConsoleView');
  });

  it('the CSS block exists once, holds every .view-security- rule, and is free of forbidden things', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split('quick-261003-527:start').length - 1).toBe(1);
    expect(css.split('quick-261003-527:end').length - 1).toBe(1);
    const block = securityBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    const rules = [...css.matchAll(/^\.view-security-[\w-]*/gm)].map((m) => m.index ?? -1);
    expect(rules.length).toBeGreaterThan(40);
    for (const index of rules) {
      expect(index).toBeGreaterThan(start);
      expect(index).toBeLessThan(end);
    }
  });

  it('squares, gauge and bar read the status tokens, and severity pips read the foreground', async () => {
    const block = securityBlock(await source('src/web/styles/globals.css'));
    const rule = (selector: string): string => {
      const at = block.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      return block.slice(at, block.indexOf('}', at));
    };
    expect(rule(".view-security-square[data-tone='missing'],\n.view-security-key-sq[data-tone='missing']")).toContain(
      'var(--missing-fill)',
    );
    expect(rule(".view-security-square[data-tone='in-flight'],\n.view-security-key-sq[data-tone='in-flight']")).toContain(
      'var(--in-flight-fill)',
    );
    expect(rule(".view-security-square[data-accepted='true'],\n.view-security-key-sq[data-accepted='true']")).toContain(
      'dashed',
    );
    expect(rule(".view-security-gauge[data-alarm='true']")).toContain('var(--missing-border)');
    expect(rule(".view-security-pips i[data-on='true']")).toContain('var(--foreground)');
    expect(rule(".view-security-pips i[data-on='true']")).not.toMatch(/missing|in-flight|primary/);
    expect(rule(".view-security-waiver[data-flash='true']")).toContain('var(--primary-tint)');
  });
});
