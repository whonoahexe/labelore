// The project-wide source rules every view shares, one test per rule. Each test walks the exact list
// of files the rule covers and names the file that breaks it. Raw HTML is enforced separately by
// raw-html-guard.test.ts, which walks every file under src/web. The scans are small helpers with a
// positive control that runs them on planted in-memory strings (nothing is written under src/).
import { describe, expect, it } from 'vitest';
import {
  buildsHref,
  buildsRegExp,
  cssViolations,
  fontSizes,
  hasModuleLevelLet,
  importsFilesystem,
  motionViolations,
  source,
  stripCssComments,
  stripSourceComments,
  usesRegexLiteral,
  writesForbiddenTone,
  writesLink,
  writesLiteralTone,
} from '../helpers/view-contract-scan.ts';

interface CssBlock {
  name: string;
  start: string;
  end: string;
  prefix: string | null;
  motion: boolean;
  sizes: string[] | null;
}

const NO_REGEXP: string[] = [
  'src/planning-repo/handlers/uat-session.ts',
  'src/web/views/uat-session.ts',
];

const NO_REGEX_LITERAL: string[] = [];

const NO_HREF: string[] = ['src/web/views/uat-session-components.tsx'];

const NO_LINK: string[] = [];

const NO_LITERAL_TONE: string[] = ['src/web/views/uat-session-components.tsx'];

const NO_FORBIDDEN_TONE: string[] = [
  'src/web/views/uat-session-components.tsx',
  'src/web/views/uat-session.ts',
];

const NO_FS_IMPORT: string[] = [];

const NO_MUTABLE_STATE: string[] = [];

const CSS_BLOCKS: CssBlock[] = [
  {
    name: 'uat-view-contract',
    start: '/* quick-261001-qk7:start */',
    end: '/* quick-261001-qk7:end */',
    prefix: 'view-uat-',
    motion: false,
    sizes: null,
  },
];

const GLOBALS = 'src/web/styles/globals.css';

async function code(path: string): Promise<string> {
  return stripSourceComments(await source(path));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('view source rules - the scans catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone('<span data-tone="warning" />')).toBe(true);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone("type Tone = 'warning' | 'quiet';")).toBe(true);
    expect(writesForbiddenTone("type Tone = 'quiet' | 'destructive';")).toBe(true);
    expect(buildsHref('<a href={item.debugSession}>x</a>')).toBe(true);
    expect(buildsHref('const link = { href: path };')).toBe(true);
    expect(writesLink('<Link to={target}>x</Link>')).toBe(true);
    expect(writesLink('<a>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(buildsRegExp('const re = RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral('text.match(/b/g)')).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(importsFilesystem("import { join } from 'node:path';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain(
      'color-mix recipe',
    );
    expect(motionViolations('@keyframes spin { to { opacity: 1; } }')).toContain('keyframes');
    expect(motionViolations('a { animation: spin 1s; }')).toContain('animation');
    expect(motionViolations('a { transition: color 1s; }')).toContain('transition');
    expect(motionViolations(':root { --x: 1; }')).toContain(':root');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });

  it('passes clean strings', () => {
    expect(writesLiteralTone('<span data-tone={test.tone} />')).toBe(false);
    expect(writesForbiddenTone('const t = RESULT_TONE[result];')).toBe(false);
    expect(writesForbiddenTone("type Tone = 'complete' | 'quiet';")).toBe(false);
    expect(buildsHref('<span className="view-uat-path">{path}</span>')).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(usesRegexLiteral('const x = text.includes(key);')).toBe(false);
    expect(importsFilesystem("import { x } from './model.ts';")).toBe(false);
    expect(hasModuleLevelLet('function f() {\n  let local = 1;\n  return local;\n}')).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual(
      [],
    );
    expect(motionViolations('a { color: var(--primary); }')).toEqual([]);
    expect(fontSizes('a { color: red; }')).toEqual([]);
    expect(stripSourceComments('// let x\nconst a = 1; /* new RegExp(x) */')).not.toMatch(
      /RegExp|let x/,
    );
    expect(stripCssComments('/* oklch(1 1 1) */ a { color: red; }')).not.toContain('oklch');
  });
});

describe('view source rules - the real sources', () => {
  it('R1: no composer, extractor or handler builds a regular expression from document text', async () => {
    for (const path of NO_REGEXP) expect(buildsRegExp(await code(path)), path).toBe(false);
    for (const path of NO_REGEX_LITERAL)
      expect(usesRegexLiteral(await code(path)), path).toBe(false);
  });

  it('R2: no href is built from document text', async () => {
    for (const path of NO_HREF) expect(buildsHref(await code(path)), path).toBe(false);
    for (const path of NO_LINK) expect(writesLink(await code(path)), path).toBe(false);
  });

  it('R3: no literal tone and no destructive or warning tone is written', async () => {
    for (const path of NO_LITERAL_TONE)
      expect(writesLiteralTone(await code(path)), path).toBe(false);
    for (const path of NO_FORBIDDEN_TONE)
      expect(writesForbiddenTone(await code(path)), path).toBe(false);
  });

  it('R4: each guarded CSS block appears once, holds its view rules and is free of colour recipes', async () => {
    const css = await source(GLOBALS);
    for (const entry of CSS_BLOCKS) {
      expect(count(css, entry.start), entry.name).toBe(1);
      expect(count(css, entry.end), entry.name).toBe(1);
      const start = css.indexOf(entry.start);
      const end = css.indexOf(entry.end);
      expect(end, entry.name).toBeGreaterThan(start);
      const block = css.slice(start, end);
      expect(cssViolations(stripCssComments(block)), entry.name).toEqual([]);
      if (entry.motion) expect(motionViolations(stripCssComments(block)), entry.name).toEqual([]);
      if (entry.prefix) {
        expect(css.replace(block, ''), entry.name).not.toMatch(
          new RegExp(`^\\.${entry.prefix}`, 'm'),
        );
        expect(block, entry.name).toMatch(new RegExp(`\\.${entry.prefix}`));
      }
    }
  });

  it('R5: each guarded CSS block uses only the contracted font sizes', async () => {
    const css = await source(GLOBALS);
    for (const entry of CSS_BLOCKS) {
      if (!entry.sizes) continue;
      const block = stripCssComments(css.slice(css.indexOf(entry.start), css.indexOf(entry.end)));
      const sizes = fontSizes(block);
      expect(sizes.length, entry.name).toBeGreaterThan(0);
      for (const size of sizes) expect(entry.sizes, `${entry.name}: ${size}`).toContain(size);
    }
  });

  it('R6: composers import no filesystem module, read no clock and hold no module-level mutable state', async () => {
    for (const path of NO_FS_IMPORT) expect(importsFilesystem(await code(path)), path).toBe(false);
    for (const path of NO_MUTABLE_STATE) {
      const text = await code(path);
      expect(hasModuleLevelLet(text), path).toBe(false);
      expect(text, path).not.toMatch(/^(export\s+)?var\s/m);
      expect(text, path).not.toMatch(/Date\.now\(|new Date\(/);
    }
  });
});
