// quick-260930-wfs (T-wfs-02, T-wfs-03, WFS-08): source-text contract for the PATTERNS pattern map,
// in the research-view-contract idiom (readFile + regex, no AST tooling). Only design-language
// tones and theme tokens colour document content; nothing renders raw HTML; the composer never
// builds a regular expression from author text; and the additive CSS block is one contiguous,
// guarded region. The checks are small helpers with a positive control that runs them on planted
// in-memory strings (nothing is written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-260930-wfs:start */';
const END = '/* quick-260930-wfs:end */';

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

function writesForbiddenTone(text: string): boolean {
  return (
    /data-tone="(active|destructive|warning)"/.test(text) || /data-tone=\{?['"](active|destructive|warning)['"]/.test(text)
  );
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** What the CSS block must never contain — the RESEARCH block's own list. */
function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  return found;
}

function patternsBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('patterns view contract — helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesForbiddenTone('<span data-tone="destructive" />')).toBe(true);
    expect(writesForbiddenTone("<span data-tone={'warning'} />")).toBe(true);
    expect(writesForbiddenTone('<span data-tone="active" />')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesForbiddenTone('<span data-tone={row.tone} />')).toBe(false);
    expect(buildsRegExp('const x = globMatch(ref, path);')).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual([]);
  });
});

describe('patterns view contract', () => {
  it('the components never use the raw-HTML injection prop or a literal non-content tone', async () => {
    const components = await source('src/web/views/pattern-map-components.tsx');
    expect(usesRawHtmlProp(components)).toBe(false);
    expect(writesForbiddenTone(components)).toBe(false);
    expect(components).toContain('data-tone={row.tone}');
  });

  it('the composer and the extractor never build a regular expression from document text', async () => {
    expect(buildsRegExp(await source('src/web/views/pattern-map.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/pattern-map.ts'))).toBe(false);
  });

  it('the composer chooses tones in exactly one map and never a parse-degradation tone', async () => {
    const composer = await source('src/web/views/pattern-map.ts');
    expect(composer).toMatch(/QUALITY_TONE: Record<PatternQuality, PatternTone> = \{\s*exact: 'complete',\s*role: 'quiet',\s*partial: 'in-flight',\s*none: 'missing',\s*\}/);
    expect(composer).not.toMatch(/'(destructive|warning|active)'/);
  });

  it('the manifest declares the patternMap hook and keeps the promote list as the fallback', async () => {
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests).toContain('patternMap: composePatternMap');
    expect(manifests).toMatch(/kind: 'patterns'[\s\S]*promote: \[[\s\S]*file classification[\s\S]*patternMap: composePatternMap/);
  });

  it('the wfs CSS block exists once, holds every .view-patterns- rule, and is free of forbidden things', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split('quick-260930-wfs:start').length - 1).toBe(1);
    expect(css.split('quick-260930-wfs:end').length - 1).toBe(1);
    const block = patternsBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    const rules = [...css.matchAll(/^\.view-patterns-[\w-]*/gm)].map((m) => m.index ?? -1);
    expect(rules.length).toBeGreaterThan(20);
    for (const index of rules) {
      expect(index).toBeGreaterThan(start);
      expect(index).toBeLessThan(end);
    }
  });

  it('meter segments read the four tones and the reason box reads the missing tokens', async () => {
    const block = patternsBlock(await source('src/web/styles/globals.css'));
    const rule = (selector: string): string => {
      const start = block.indexOf(`${selector} {`);
      expect(start, selector).toBeGreaterThan(-1);
      return block.slice(start, block.indexOf('}', start));
    };
    expect(rule(".view-patterns-meter-bar > [data-quality='exact'],\n.view-patterns-meter-key [data-quality='exact'] > i")).toContain('var(--primary)');
    expect(rule(".view-patterns-meter-bar > [data-quality='role'],\n.view-patterns-meter-key [data-quality='role'] > i")).toContain('var(--muted-foreground)');
    expect(rule(".view-patterns-meter-bar > [data-quality='partial'],\n.view-patterns-meter-key [data-quality='partial'] > i")).toContain('var(--in-flight-fill)');
    expect(rule(".view-patterns-meter-bar > [data-quality='none'],\n.view-patterns-meter-key [data-quality='none'] > i")).toContain('var(--missing-fill)');
    const reason = rule('.view-patterns-reason');
    expect(reason).toContain('var(--missing-border)');
    expect(reason).toContain('var(--missing-fill)');
    expect(reason).toContain('var(--card-veil)');
    expect(rule('.view-patterns-note')).toContain('var(--in-flight-fill)');
  });
});
