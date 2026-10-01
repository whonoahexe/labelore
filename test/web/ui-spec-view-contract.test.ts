// quick-261001-qk6 (T-qk6-02, T-qk6-03, T-qk6-04, QK6-08): source-text contract for the UI-SPEC
// contract page, in the patterns-view-contract idiom (readFile + regex, no AST tooling). Only
// design-language tones and theme tokens colour document content — except the swatches and type
// samples, which paint the document's own validated values through a fixed set of style keys;
// nothing renders raw HTML; the composer never builds a regular expression from author text; and
// the additive CSS block is one contiguous, guarded region. The checks are small helpers with a
// positive control that runs them on planted in-memory strings (nothing is written under src/).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261001-qk6:start */';
const END = '/* quick-261001-qk6:end */';
const STYLE_KEYS = new Set(['flexGrow', 'left', 'width', 'fontSize', 'fontWeight', 'lineHeight', '--swatch-light', '--swatch-dark']);

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

/** A literal parse-degradation (or the legacy active) tone written as a data-tone value. */
function writesForbiddenTone(text: string): boolean {
  return (
    /data-tone="(active|destructive|warning)"/.test(text) || /data-tone=\{?['"](active|destructive|warning)['"]/.test(text)
  );
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** Splits on commas outside parentheses — `swatchVars(a, b)` stays one piece. */
function topLevelPieces(text: string): string[] {
  const pieces: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      pieces.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  pieces.push(buf);
  return pieces;
}

/** Every key of every `style={{ … }}` object literal, with spreads reported as `...`. A single
 * flat scan: the object has no nested braces in this view. */
function styleKeys(text: string): string[] {
  const keys: string[] = [];
  const re = /style=\{\{([^}]*)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    for (const part of topLevelPieces(m[1])) {
      const piece = part.trim();
      if (piece === '') continue;
      if (piece.startsWith('...')) {
        keys.push('...');
        continue;
      }
      const colon = piece.indexOf(':');
      if (colon === -1) {
        keys.push(piece);
        continue;
      }
      keys.push(piece.slice(0, colon).trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  return keys;
}

/** A `style={…}` that is not an object literal must be a swatchVars() call. */
function foreignStyleExpressions(text: string): string[] {
  const found: string[] = [];
  const re = /style=\{(?!\{)([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) if (!m[1].trim().startsWith('swatchVars(')) found.push(m[1].trim());
  return found;
}

function disallowedStyleKeys(text: string): string[] {
  return styleKeys(text).filter((k) => k !== '...' && !STYLE_KEYS.has(k));
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

function uiSpecBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('ui-spec view contract — helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(writesForbiddenTone('<span data-tone="destructive" />')).toBe(true);
    expect(writesForbiddenTone("<span data-tone={'warning'} />")).toBe(true);
    expect(writesForbiddenTone('<span data-tone="active" />')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(token);')).toBe(true);
    expect(disallowedStyleKeys('<i style={{ background: color }} />')).toEqual(['background']);
    expect(disallowedStyleKeys("<i style={{ flexGrow: 1, '--swatch-light': light, color: x }} />")).toEqual(['color']);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesForbiddenTone('<span data-tone={row.tone} />')).toBe(false);
    expect(buildsRegExp('const x = firstSentence(text);')).toBe(false);
    expect(disallowedStyleKeys("<i style={{ flexGrow: 3, ...vars, left: pct(1) }} />")).toEqual([]);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual([]);
  });
});

describe('ui-spec view contract', () => {
  it('the components never use the raw-HTML injection prop or a literal non-content tone', async () => {
    const components = await source('src/web/views/ui-spec-components.tsx');
    expect(usesRawHtmlProp(components)).toBe(false);
    expect(writesForbiddenTone(components)).toBe(false);
    expect(components).toContain('data-tone={signoff.tone}');
  });

  it('every inline style key in the components is on the allowlist', async () => {
    const components = await source('src/web/views/ui-spec-components.tsx');
    expect(styleKeys(components).length).toBeGreaterThan(3);
    expect(disallowedStyleKeys(components)).toEqual([]);
    // The swatch custom properties are only ever built in swatchVars().
    expect(components.match(/'--swatch-(light|dark)'/g)?.length).toBe(2);
    expect(foreignStyleExpressions(components)).toEqual([]);
    expect(foreignStyleExpressions('<i style={somethingElse(x)} />')).toEqual(['somethingElse(x)']);
  });

  it('the composer and the extractor never build a regular expression from document text', async () => {
    expect(buildsRegExp(await source('src/web/views/ui-spec.ts'))).toBe(false);
    expect(buildsRegExp(await source('src/planning-repo/handlers/ui-spec-contract.ts'))).toBe(false);
  });

  it('the composer chooses tones in typed maps and never a parse-degradation tone', async () => {
    const composer = await source('src/web/views/ui-spec.ts');
    expect(composer).toMatch(/VERDICT_TONE: Record<UiSpecVerdict, UiSpecTone> = \{\s*PASS: 'complete',\s*FLAG: 'in-flight',\s*BLOCK: 'missing',\s*FAIL: 'missing',\s*PENDING: 'quiet',\s*\}/);
    expect(composer).toMatch(/STATUS_TONE: Record<UiSpecStatus, UiSpecTone> = \{\s*covered: 'complete',\s*backstop: 'in-flight',\s*unresolved: 'missing',\s*dismissed: 'quiet',\s*\}/);
    expect(composer).not.toMatch(/'(destructive|warning|active)'/);
  });

  it('the manifest declares the uiSpec hook and keeps the promote list as the fallback', async () => {
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests).toContain('uiSpec: composeUiSpec');
    expect(manifests).toMatch(/kind: 'ui-spec'[\s\S]*promote: \[[\s\S]*new component specifications[\s\S]*uiSpec: composeUiSpec/);
  });

  it('the page reads the composed contract, not the artifact kind', async () => {
    const page = await source('src/web/pages/artifact-page.tsx');
    expect(page).toContain('manifest.uiSpec?.(viewInput)');
    expect(page).toContain('<UiSpecView');
    expect(page).not.toMatch(/artifact\.kind === ['"]ui-spec['"]/);
  });

  it('the qk6 CSS block exists once, holds every .view-ui-spec- rule, and is free of forbidden things', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split('quick-261001-qk6:start').length - 1).toBe(1);
    expect(css.split('quick-261001-qk6:end').length - 1).toBe(1);
    const block = uiSpecBlock(css);
    expect(cssViolations(block)).toEqual([]);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    const rules = [...css.matchAll(/^\.view-ui-spec-[\w-]*/gm)].map((m) => m.index ?? -1);
    expect(rules.length).toBeGreaterThan(40);
    for (const index of rules) {
      expect(index).toBeGreaterThan(start);
      expect(index).toBeLessThan(end);
    }
  });

  it('the tones and the document-value hooks read the right tokens', async () => {
    const block = uiSpecBlock(await source('src/web/styles/globals.css'));
    const rule = (selector: string): string => {
      const start = block.indexOf(`${selector} {`);
      expect(start, selector).toBeGreaterThan(-1);
      return block.slice(start, block.indexOf('}', start));
    };
    expect(rule(".view-ui-spec-meter-bar > [data-status='covered'],\n.view-ui-spec-meter-key [data-status='covered'] > i")).toContain('var(--primary)');
    expect(rule(".view-ui-spec-meter-bar > [data-status='backstop'],\n.view-ui-spec-meter-key [data-status='backstop'] > i")).toContain('var(--in-flight-fill)');
    expect(rule(".view-ui-spec-meter-bar > [data-status='unresolved'],\n.view-ui-spec-meter-key [data-status='unresolved'] > i")).toContain('var(--missing-fill)');
    expect(rule(".view-ui-spec-mark[data-status='dismissed']")).toContain('var(--muted-foreground)');
    expect(rule('.view-ui-spec-choice')).toContain('var(--primary-tint)');
    expect(rule('.view-ui-spec-choice')).toContain('var(--primary)');
    expect(rule('.view-ui-spec-split-bar > div')).toContain('var(--swatch-light)');
    expect(rule('.dark .view-ui-spec-split-bar > div')).toContain('var(--swatch-dark)');
    expect(rule(".view-ui-spec-chipbox > [data-half='light']")).toContain('var(--swatch-light)');
    expect(rule(".view-ui-spec-chipbox > [data-half='dark']")).toContain('var(--swatch-dark)');
    expect(rule(".view-ui-spec-verdict[data-required='true']")).toContain('var(--in-flight-fill)');
  });
});
