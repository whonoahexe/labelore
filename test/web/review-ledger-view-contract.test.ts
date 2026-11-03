// Phase 9 (09-13, T-09-26, T-09-27): source-text contract for the review ledger, in the todo-view-contract idiom
// (readFile + regex, no AST tooling), over all three tab bodies - the strip (LedgerSwitch), the shared head
// (LedgerHead), the Fix tab (FixTabView) and the Disposition tab (DispositionTabView) - and their composers.
// Nothing renders raw HTML; a link target is only ever a url field the server resolved, never document text;
// the only tones written are the documented ones, from the composed model, and never a parse-degradation
// tone; the composers and the server join build no regular expression from author text and import no
// filesystem module; and the additive CSS block is one contiguous, guarded region. The checks are small
// helpers with a positive control that runs them on planted in-memory strings (nothing is written under
// src/). Comments are stripped before every negative check, so a header comment can never trip one.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-09-review-ledger:start */';
const END = '/* phase-09-review-ledger:end */';

const COMPONENTS = [
  'src/web/views/review-ledger-components.tsx',
  'src/web/components/ledger-switch.tsx',
];
const COMPOSERS = ['src/web/views/review-ledger.ts', 'src/presentation/review-ledger.ts'];

function stripSourceComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function usesRawHtmlProp(text: string): boolean {
  return text.includes(RAW_HTML_PROP);
}

/** Every `data-tone` expression the text writes. */
function toneExpressions(text: string): string[] {
  return [...text.matchAll(/data-tone=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
}

/** The parse-degradation tones written as a tone value. */
function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) ||
    /['"](destructive|warning)['"]\s*as\s+[A-Za-z]*Tone/.test(text) ||
    /data-tone="(destructive|warning)"/.test(text)
  );
}

function writesAnchorLinkAttribute(text: string): boolean {
  return /\bhref\s*=/.test(text) || /\bhref\s*:/.test(text);
}

/** The expression of every `to=` prop (braces balanced, so a template literal inside one stays whole). */
function linkTargets(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\bto=/g)) {
    const at = (match.index ?? 0) + match[0].length;
    const open = text[at];
    if (open === '"' || open === "'") {
      out.push(text.slice(at, text.indexOf(open, at + 1) + 1));
    } else if (open === '{') {
      let depth = 0;
      let end = at;
      for (; end < text.length; end += 1) {
        if (text[end] === '{') depth += 1;
        if (text[end] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      out.push(text.slice(at, end + 1));
    }
  }
  return out;
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** A regular-expression literal used as an argument of a text method. */
function usesRegexLiteral(text: string): boolean {
  return /\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\//.test(text);
}

function importsFilesystem(text: string): boolean {
  return /from 'node:(fs|path)|from 'fs'/.test(text);
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

function ledgerBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('review ledger view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(toneExpressions('<span data-tone={tone} data-tone="quiet" />')).toEqual([
      '{tone}',
      '"quiet"',
    ]);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesAnchorLinkAttribute('<a href={ref}>x</a>')).toBe(true);
    expect(linkTargets('<Link to="/x" /><Link to={`/a/${id}`} /><Link to={tab.to} />')).toEqual([
      '"/x"',
      '{`/a/${id}`}',
      '{tab.to}',
    ]);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral('text.replace(/x/g, "")')).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
    expect(
      stripSourceComments('a // note data-tone="warning"\n// whole line href=\nb'),
    ).not.toContain('whole line');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(writesForbiddenTone("const severity = 'warning';")).toBe(false);
    expect(writesAnchorLinkAttribute('<button onClick={() => jump(id)}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(usesRegexLiteral('text.indexOf(key)')).toBe(false);
    expect(importsFilesystem("import { join } from './x.ts';")).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('review ledger view contract - the real sources', () => {
  it('the components (strip, head, Fix tab, Disposition tab) render no raw HTML and build no link from text', async () => {
    for (const path of COMPONENTS) {
      const code = stripSourceComments(await source(path));
      expect(usesRawHtmlProp(code), path).toBe(false);
      expect(writesAnchorLinkAttribute(code), path).toBe(false);
      expect(writesForbiddenTone(code), path).toBe(false);
    }
  });

  it('the only link target is the strip tab, whose url the server resolved', async () => {
    const strip = stripSourceComments(await source('src/web/components/ledger-switch.tsx'));
    expect(linkTargets(strip)).toEqual(['{tab.to}']);
    expect(
      linkTargets(stripSourceComments(await source('src/web/views/review-ledger-components.tsx'))),
    ).toEqual([]);
    // The strip is fed `to: tab.url` and nothing else.
    const feed = stripSourceComments(await source('src/web/views/review-ledger-components.tsx'));
    expect(feed).toContain('to: tab.url');
  });

  it('every data-tone the components write is the documented quiet tone or comes from the composed model', async () => {
    const code = stripSourceComments(await source('src/web/views/review-ledger-components.tsx'));
    const allowed = new Set(['"quiet"', '{tone}', '{group.tone}', '{mark.tone}']);
    const expressions = toneExpressions(code);
    expect(expressions.length).toBeGreaterThan(0);
    for (const expression of expressions) expect(allowed.has(expression), expression).toBe(true);
    // Severity, clamps and the dashed square ride their own attributes.
    expect(code).toContain('data-severity=');
    expect(code).toContain('data-clamped=');
    expect(code).toContain('data-dashed=');
  });

  it('no ledger file writes the destructive or warning tone', async () => {
    for (const path of [
      ...COMPONENTS,
      ...COMPOSERS,
      'src/planning-repo/handlers/review-disposition.ts',
    ]) {
      expect(writesForbiddenTone(stripSourceComments(await source(path))), path).toBe(false);
    }
  });

  it('the composers and the server join never construct or apply a regular expression', async () => {
    for (const path of COMPOSERS) {
      const code = stripSourceComments(await source(path));
      expect(buildsRegExp(code), path).toBe(false);
      expect(usesRegexLiteral(code), path).toBe(false);
    }
  });

  it('the composers and the server join import no filesystem module', async () => {
    for (const path of COMPOSERS) {
      expect(importsFilesystem(stripSourceComments(await source(path))), path).toBe(false);
    }
  });

  it('the composer imports no runtime handler: the severity of an id arrives on the ledger context', async () => {
    const code = stripSourceComments(await source('src/web/views/review-ledger.ts'));
    const runtimeImports = [...code.matchAll(/^import (?!type)[^;]*from '([^']+)'/gm)].map(
      (m) => m[1],
    );
    expect(runtimeImports.filter((path) => path.includes('planning-repo'))).toEqual([]);
  });

  it('manifests.ts opts both the fix and the disposition kinds into the one composer', async () => {
    const text = await source('src/web/views/manifests.ts');
    expect(text.split('reviewLedger: composeReviewLedger').length - 1).toBe(2);
    const fix = text.slice(
      text.indexOf("  'review-fix': {"),
      text.indexOf("  'review-disposition': {"),
    );
    expect(fix).toContain('reviewLedger: composeReviewLedger');
    const disposition = text.slice(
      text.indexOf("  'review-disposition': {"),
      text.indexOf('  findings: {'),
    );
    expect(disposition).toContain('reviewLedger: composeReviewLedger');
    expect(disposition).toContain('promote:');
  });

  it('artifact-page.tsx renders the tab through one LedgerTabView and has no kind branch for the ledger', async () => {
    const text = await source('src/web/pages/artifact-page.tsx');
    expect(text.split('<LedgerTabView').length - 1).toBe(1);
    expect(text).toContain('ledgerHeaderProps(fixCover, artifact.title)');
    expect(text).not.toContain("artifact.kind === 'review-disposition'");
    expect(text).not.toContain("artifact.kind === 'review-fix'");
  });

  it('the CSS block exists once, holds every .view-review-ledger- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = ledgerBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-review-ledger-/);
    expect(block).toContain('.view-review-ledger-head');
    expect(block).toContain('.view-review-ledger-page');
    expect(block).toContain(".view-review-ledger-reason[data-clamped='true']");
    expect(block).toContain(".view-review-group-square[data-dashed='false']");
  });
});
