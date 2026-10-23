// quick-261023-61l (T-61l-01..08) and quick-261023-u13 (T-u13-01..08, sketch 029 A): source-text contract for the NOTE page, in the debug-view-contract idiom
// (readFile + regex, no AST tooling). Nothing renders raw HTML; no link target is built from document text
// (every Link takes a model url); the only tones written are the documented ones, from the composed
// model, and never a parse-degradation tone; the extractor, join and composer import no filesystem module
// and build no regular expression from document text; the seam wiring is in place and adds no kind
// branch; and the additive CSS block is one contiguous, guarded region. The checks are small helpers with
// a positive control that runs them on planted in-memory strings (nothing is written under src/).
// Comments are stripped before every negative check, so a header comment can never trip one.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261023-61l:start */';
const END = '/* quick-261023-61l:end */';

function stripSourceComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
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

/** Every `to=` expression a Link in the text takes. */
function linkTargets(text: string): string[] {
  return [...text.matchAll(/<Link\b[^>]*?\bto=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
}

/** Every argument a `renderHtml(...)` call in the text takes (balanced parentheses). */
function renderHtmlArguments(text: string): string[] {
  const found: string[] = [];
  let at = text.indexOf('renderHtml(');
  while (at >= 0) {
    const start = at + 'renderHtml('.length;
    let depth = 1;
    let end = start;
    while (end < text.length && depth > 0) {
      if (text[end] === '(') depth += 1;
      else if (text[end] === ')') depth -= 1;
      end += 1;
    }
    found.push(text.slice(start, end - 1));
    at = text.indexOf('renderHtml(', end);
  }
  return found;
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

/** A regular expression literal used on text: `/.../.test(`, `.match(/`, `.replace(/` ... */
function usesRegexLiteral(text: string): boolean {
  return /\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\/(?![/*])/.test(text) || /\/[^/\n]+\/[gimsuy]*\.(test|exec)\(/.test(text);
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

function noteBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('note view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(renderHtmlArguments('<div>{renderHtml(part.html)}</div>')).toEqual(['part.html']);
    expect(toneExpressions('<span data-tone={tone} data-tone="quiet" />')).toEqual(['{tone}', '"quiet"']);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesAnchorLinkAttribute('<a href={ref}>x</a>')).toBe(true);
    expect(linkTargets('<Link className="a" to="/hard/coded">x</Link>')).toEqual(['"/hard/coded"']);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral('if (/^a/.test(body)) {}')).toBe(true);
    expect(usesRegexLiteral("body.replace(/x/g, '')")).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(cssViolations('@keyframes x { from { opacity: 0 } }')).toContain('keyframes');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
    expect(stripSourceComments('a // note data-tone="warning"\n// whole line href=\nb')).not.toContain('whole line');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(toneExpressions('<span data-level={c} />')).toEqual([]);
    expect(renderHtmlArguments('<div>{renderHtml(dropLeadingH1(documentHtml))}</div>')).toEqual(['dropLeadingH1(documentHtml)']);
    expect(writesForbiddenTone("const severity = 'warning';")).toBe(false);
    expect(writesAnchorLinkAttribute('<button onClick={() => jump(id)}>x</button>')).toBe(false);
    expect(linkTargets('<Link to={card.url}>x</Link>')).toEqual(['{card.url}']);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(usesRegexLiteral("const a = text.startsWith('x') / 2;")).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('note view contract - the real sources', () => {
  it('the components render no raw HTML, build no href and take every Link target from the model', async () => {
    const code = stripSourceComments(await source('src/web/views/note-page-components.tsx'));
    expect(usesRawHtmlProp(code)).toBe(false);
    expect(writesAnchorLinkAttribute(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    const targets = linkTargets(code);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(target, target).toMatch(/^\{(card|row)\.url\}$/);
  });

  it('passes only sectionHtml(...) or dropLeadingH1(...) output to renderHtml', async () => {
    const code = stripSourceComments(await source('src/web/views/note-page-components.tsx'));
    const args = renderHtmlArguments(code);
    expect(args.length).toBeGreaterThanOrEqual(2);
    for (const arg of args) expect(arg, arg).toMatch(/^(sectionHtml\(documentHtml, id\)|dropLeadingH1\(documentHtml\))$/);
  });

  it('writes data-tone only from the composed model or the quiet area chip', async () => {
    const code = stripSourceComments(await source('src/web/views/note-page-components.tsx'));
    expect(toneExpressions(code).sort()).toEqual([
      '"quiet"',
      '{card.status.tone}',
      '{flag.tone}',
      '{row.mark ?? undefined}',
      '{row.tone ?? undefined}',
      '{stat.tone ?? undefined}',
    ]);
    // The stage, the card status, the weight, the shape and the gist size ride their own attributes.
    expect(code).toContain('data-stage=');
    expect(code).toContain('data-status=');
    expect(code).toContain('data-level=');
    expect(code).toContain('data-shape=');
    expect(code).toContain('data-long=');
  });

  it('no file writes the destructive or warning tone', async () => {
    for (const path of [
      'src/web/views/note-page.ts',
      'src/web/views/note-page-components.tsx',
      'src/planning-repo/handlers/note-lift.ts',
      'src/planning-repo/handlers/note.ts',
      'src/presentation/note-context.ts',
    ]) {
      expect(writesForbiddenTone(stripSourceComments(await source(path))), path).toBe(false);
    }
  });

  it('the composer and the join build no regular expression from text', async () => {
    for (const path of ['src/web/views/note-page.ts', 'src/presentation/note-context.ts']) {
      const code = stripSourceComments(await source(path));
      expect(buildsRegExp(code), path).toBe(false);
      expect(usesRegexLiteral(code), path).toBe(false);
    }
    // The extractor builds its three fixed patterns (references, the whole-file test and figures) once,
    // from constants, never from a body.
    const lift = stripSourceComments(await source('src/planning-repo/handlers/note-lift.ts'));
    const constructions = lift.split('\n').filter((line) => line.includes('new RegExp('));
    expect(constructions).toHaveLength(3);
    for (const line of constructions) expect(line, line).toMatch(/_SOURCE/);
  });

  it('the extractor, join and composer import no filesystem module', async () => {
    for (const path of [
      'src/planning-repo/handlers/note-lift.ts',
      'src/presentation/note-context.ts',
      'src/web/views/note-page.ts',
    ]) {
      expect(stripSourceComments(await source(path)), path).not.toMatch(/from 'node:(fs|path)|from 'fs'/);
    }
  });

  it('index.ts registers the handler after DebugHandler and before FrontmatterOnlyHandler', async () => {
    const text = await source('src/planning-repo/handlers/index.ts');
    const debug = text.indexOf('  DebugHandler,');
    const note = text.indexOf('  NoteHandler,');
    const frontmatter = text.indexOf('  FrontmatterOnlyHandler,');
    expect(debug).toBeGreaterThan(-1);
    expect(note).toBeGreaterThan(debug);
    expect(frontmatter).toBeGreaterThan(note);
  });

  it('note.ts calls the extractor inside a try block and matches on the kind', async () => {
    const text = await source('src/planning-repo/handlers/note.ts');
    const call = text.indexOf('extractNote(fm.body');
    const tryAt = text.lastIndexOf('try {', call);
    const catchAt = text.indexOf('catch', call);
    expect(call).toBeGreaterThan(-1);
    expect(tryAt).toBeGreaterThan(-1);
    expect(tryAt).toBeLessThan(call);
    expect(catchAt).toBeGreaterThan(call);
    expect(text).toContain("ref.kind === 'note'");
  });

  it('server/index.ts builds the context inside a try block', async () => {
    const text = await source('src/server/index.ts');
    const call = text.indexOf('buildNoteContext(activeDerived.presentation');
    expect(call).toBeGreaterThan(-1);
    expect(text.lastIndexOf('try {', call)).toBeGreaterThan(text.lastIndexOf('const noteContext', call));
    expect(text.indexOf('catch', call)).toBeGreaterThan(call);
    expect(text).toContain("lookup.artifact.kind === 'note'");
  });

  it("discovery.ts's note predicate checks the first path segment", async () => {
    const text = stripSourceComments(await source('src/planning-repo/discovery.ts'));
    const predicate = text.slice(text.indexOf('export function isNotePath'));
    expect(predicate.slice(0, 400)).toContain("segments[0] !== 'notes'");
    expect(text).toContain("if (isNotePath(relPathUnderPlanning)) return 'note'");
  });

  it("'note' is a view kind and manifests.ts declares the hook, lead and promote fallback", async () => {
    expect(await source('src/web/views/kinds.ts')).toContain("  'note',\n  'debug',\n] as const;");
    const text = await source('src/web/views/manifests.ts');
    expect(text).toContain('notePage: composeNotePage');
    const entry = text.slice(text.indexOf('  note: {'));
    const head = entry.slice(0, 900);
    expect(head).toContain('What the note says, and the todo it became.');
    expect(head).toContain("heading: /\\S/");
    expect(head.indexOf('promote:')).toBeLessThan(head.indexOf('notePage: composeNotePage'));
  });

  it('artifact-page.tsx opts in through the manifest hook with one early return and no kind branch', async () => {
    const text = await source('src/web/pages/artifact-page.tsx');
    expect(text).toContain('manifest.notePage?.(viewInput)');
    expect(text).toContain('notePage !== null ||');
    expect(text).toContain("noteContext: query.data.noteContext ?? null");
    expect(text).toContain("if (notePage && mode === 'view')");
    const early = text.slice(text.indexOf('<NotePageView'), text.indexOf('<NotePageView') + 700);
    expect(early).toContain('<WarningChip tone={warningTone} />');
    expect(text.split('<NotePageView').length - 1).toBe(1);
    expect(text).not.toContain("artifact.kind === 'note'");
  });

  it('the CSS block exists once, holds every .view-note- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = noteBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-note-/);
    expect(block).toContain('.view-note-page');
    expect(block).toContain(".view-note-todo[data-status='done']");
    expect(block).toContain(".view-note-weight[data-level='high']");
    expect(block).toContain(".view-note-label[data-tone='complete']");
    expect(block).toContain('.view-note-doc');
    for (const selector of [
      '.view-note-console {',
      '.view-note-rail {',
      ".view-note-stage[data-stage='done']",
      ".view-note-big[data-stage='untraced']",
      '.view-note-row {',
      ".view-note-row[data-tone='missing'] .view-note-index",
      ".view-note-label[data-tone='missing']",
      '.view-note-part {',
      '.view-note-flags {',
      '.view-note-figure {',
      '.view-note-read {',
      '.view-note-full {',
    ]) {
      expect(block, selector).toContain(selector);
    }
  });

  it('the CSS block holds none of the removed 028 A pieces', async () => {
    const block = stripCssComments(noteBlock(await source('src/web/styles/globals.css')));
    expect(block).not.toMatch(/\.view-note-(head|meta|meta-left|date|lede|grid|margin|clauses|clause|contents)\b/);
  });

  it('the CSS block stacks both shapes at the two breakpoints, each override beside its base rule', async () => {
    const block = stripCssComments(noteBlock(await source('src/web/styles/globals.css')));
    expect(block).toContain('@media (max-width: 62rem)');
    expect(block).toContain('@media (max-width: 42rem)');
    // The console and rail overrides follow their rules; the row and part overrides follow theirs.
    const consoleAt = block.indexOf('.view-note-console {');
    expect(block.indexOf('@media (max-width: 62rem)', consoleAt)).toBeGreaterThan(consoleAt);
    expect(block.indexOf('@media (max-width: 62rem)', consoleAt)).toBeLessThan(block.indexOf('.view-note-rail {'));
    const railAt = block.indexOf('.view-note-rail {');
    expect(block.indexOf('@media (max-width: 62rem)', railAt)).toBeGreaterThan(railAt);
    const rowAt = block.indexOf('.view-note-row {');
    expect(block.indexOf('@media (max-width: 42rem)', rowAt)).toBeGreaterThan(rowAt);
    const partAt = block.indexOf('.view-note-part {');
    expect(block.indexOf('@media (max-width: 42rem)', partAt)).toBeGreaterThan(partAt);
  });
});
