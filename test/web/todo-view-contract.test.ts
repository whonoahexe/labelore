// quick-261023-61k (T-61k-01..08, Q61K-06): source-text contract for the TODO page, in the debug-view-contract
// idiom (readFile + regex, no AST tooling). Nothing renders raw HTML; a link target is only ever a url field
// the server resolved, never document text; the only tones written are the documented ones, from the composed
// model, and never a parse-degradation tone; the extractor, the relation, the join and the composer build no
// regular expression from author text and import no filesystem module; the seam wiring is in place and adds
// no kind branch; and the additive CSS block is one contiguous, guarded region. The checks are small helpers
// with a positive control that runs them on planted in-memory strings (nothing is written under src/).
// Comments are stripped before every negative check, so a header comment can never trip one.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* quick-261023-61k:start */';
const END = '/* quick-261023-61k:end */';

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

/** True when a link target is an expression that reads a url field and builds nothing from text. */
function targetReadsUrlField(target: string): boolean {
  return target.startsWith('{') && /\.url\b/.test(target) && !/[`+]/.test(target) && !/\$\{/.test(target);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
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

function todoBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('todo view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(usesRawHtmlProp(`<div ${RAW_HTML_PROP}={{ __html: x }} />`)).toBe(true);
    expect(toneExpressions('<span data-tone={tone} data-tone="quiet" />')).toEqual(['{tone}', '"quiet"']);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesAnchorLinkAttribute('<a href={ref}>x</a>')).toBe(true);
    expect(linkTargets('<Link to="/x" /><Link to={`/a/${id}`} /><Link to={note.url} />')).toEqual(['"/x"', '{`/a/${id}`}', '{note.url}']);
    expect(targetReadsUrlField('"/x"')).toBe(false);
    expect(targetReadsUrlField('{`/a/${id}`}')).toBe(false);
    expect(targetReadsUrlField('{base + note.url}')).toBe(false);
    expect(targetReadsUrlField('{note.url}')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(cssViolations('@keyframes x { from { opacity: 0 } }')).toContain('keyframes');
    expect(cssViolations(':root { --x: 1; }')).toContain(':root');
    expect(stripSourceComments('a // note data-tone="warning"\n// whole line href=\nb')).not.toContain('whole line');
  });

  it('passes clean strings', () => {
    expect(usesRawHtmlProp('<p>{text}</p>')).toBe(false);
    expect(toneExpressions('<span data-state={s} />')).toEqual([]);
    expect(writesForbiddenTone("const severity = 'warning';")).toBe(false);
    expect(writesAnchorLinkAttribute('<button onClick={() => jump(id)}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(importsFilesystem("import { join } from './x.ts';")).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('todo view contract - the real sources', () => {
  it('the components render no raw HTML, build no link from text and write only model tones', async () => {
    const code = stripSourceComments(await source('src/web/views/todo-lifecycle-components.tsx'));
    expect(usesRawHtmlProp(code)).toBe(false);
    expect(writesAnchorLinkAttribute(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(toneExpressions(code).sort()).toEqual(['"quiet"', '{chips.status.tone}']);
    const targets = linkTargets(code);
    expect(targets.length).toBeGreaterThanOrEqual(3);
    for (const target of targets) expect(targetReadsUrlField(target), target).toBe(true);
    // Severity, step and stage states, checks and clamps ride their own attributes.
    expect(code).toContain('data-severity=');
    expect(code).toContain('data-state=');
    expect(code).toContain('data-done=');
    expect(code).toContain('data-clamped=');
  });

  it('no file writes the destructive or warning tone', async () => {
    for (const path of [
      'src/web/views/todo-lifecycle.ts',
      'src/web/views/todo-lifecycle-components.tsx',
      'src/planning-repo/handlers/todo-file.ts',
      'src/planning-repo/handlers/todo.ts',
      'src/presentation/todo-notes.ts',
      'src/presentation/todo-context.ts',
    ]) {
      expect(writesForbiddenTone(stripSourceComments(await source(path))), path).toBe(false);
    }
  });

  it('the extractor, the relation, the join and the composer never construct a regular expression from text', async () => {
    for (const path of [
      'src/planning-repo/handlers/todo-file.ts',
      'src/presentation/todo-notes.ts',
      'src/presentation/todo-context.ts',
      'src/web/views/todo-lifecycle.ts',
    ]) {
      expect(buildsRegExp(stripSourceComments(await source(path))), path).toBe(false);
    }
  });

  it('the extractor, the relation, the join and the composer import no filesystem module', async () => {
    for (const path of [
      'src/planning-repo/handlers/todo-file.ts',
      'src/presentation/todo-notes.ts',
      'src/presentation/todo-context.ts',
      'src/web/views/todo-lifecycle.ts',
    ]) {
      expect(importsFilesystem(stripSourceComments(await source(path))), path).toBe(false);
    }
  });

  it('the relation uses no regular expression at all', async () => {
    expect(stripSourceComments(await source('src/presentation/todo-notes.ts'))).not.toMatch(/\.(test|exec|match|replace|split)\(\s*\//);
  });

  it('index.ts registers the handler right after DebugHandler and before FrontmatterOnlyHandler', async () => {
    const text = await source('src/planning-repo/handlers/index.ts');
    const learnings = text.indexOf('  LearningsHandler,');
    const debug = text.indexOf('  DebugHandler,');
    const todo = text.indexOf('  TodoHandler,');
    const frontmatter = text.indexOf('  FrontmatterOnlyHandler,');
    expect(learnings).toBeGreaterThan(-1);
    expect(debug).toBeGreaterThan(learnings);
    expect(todo).toBeGreaterThan(debug);
    expect(frontmatter).toBeGreaterThan(todo);
    expect(text).toContain("import { TodoHandler } from './todo.ts';");
  });

  it('todo.ts calls the extractor inside a try block and matches on the kind', async () => {
    const text = await source('src/planning-repo/handlers/todo.ts');
    const call = text.indexOf('extractTodoFile({');
    const tryAt = text.lastIndexOf('try {', call);
    const catchAt = text.indexOf('catch', call);
    expect(call).toBeGreaterThan(-1);
    expect(tryAt).toBeGreaterThan(-1);
    expect(tryAt).toBeLessThan(call);
    expect(catchAt).toBeGreaterThan(call);
    expect(text).toContain("ref.kind === 'todo'");
  });

  it('discovery.ts keeps the debug walk literal and calls positionKind for the position kinds', async () => {
    const text = stripSourceComments(await source('src/planning-repo/discovery.ts'));
    expect(text).toContain("isDebugSessionPath(childRelUnderPlanning) ? 'debug'");
    expect(text).toContain('positionKind(childRelUnderPlanning)');
    expect(text).toContain("segments[0] !== 'todos'");
  });

  it("'todo' is a view kind and manifests.ts declares the hook, lead and promote fallback", async () => {
    const kinds = await source('src/web/views/kinds.ts');
    expect(kinds).toContain("  'todo',\n");
    const text = await source('src/web/views/manifests.ts');
    expect(text).toContain('todoLifecycle: composeTodoLifecycle');
    const entry = text.slice(text.indexOf('  todo: {'));
    const head = entry.slice(0, 1200);
    expect(head).toContain('What the todo is, where it came from, and how it closed.');
    expect(head).toContain('heading: /^problem$/i');
    expect(head).toContain('heading: /^resolution$/i');
    expect(head.indexOf('promote:')).toBeLessThan(head.indexOf('todoLifecycle: composeTodoLifecycle'));
  });

  it('server/index.ts builds the context inside a try block for kind todo and returns it', async () => {
    const text = await source('src/server/index.ts');
    const call = text.indexOf('buildTodoContext(activeDerived.presentation');
    expect(call).toBeGreaterThan(-1);
    expect(text.lastIndexOf('try {', call)).toBeGreaterThan(text.lastIndexOf('const todoContext', call));
    expect(text.slice(text.lastIndexOf('lookup.artifact.kind ===', call), call)).toContain("'todo'");
    expect(text).toMatch(/document,\s+todoContext,/);
  });

  it('artifact-page.tsx passes the context through, opts in with one early return and has no kind branch', async () => {
    const text = await source('src/web/pages/artifact-page.tsx');
    expect(text).toContain('todoContext?: TodoContext | null;');
    expect(text).toContain('todoContext: query.data.todoContext ?? null,');
    expect(text).toContain('manifest.todoLifecycle?.(viewInput)');
    expect(text).toContain('todoLifecycle !== null ||');
    expect(text).toContain("if (todoLifecycle && mode === 'view')");
    const early = text.slice(text.indexOf('<TodoLifecycleView'), text.indexOf('<TodoLifecycleView') + 700);
    expect(early).toContain('<WarningChip tone={warningTone} />');
    expect(text.split('<TodoLifecycleView').length - 1).toBe(1);
    expect(text).not.toContain("artifact.kind === 'todo'");
  });

  it('the CSS block exists once, holds every .view-todo- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = todoBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-todo-/);
    expect(block).toContain('.view-todo-page');
    expect(block).toContain(".view-todo-pip[data-severity='high']");
    expect(block).toContain(".view-todo-step[data-state='none']::before");
    expect(block).toContain(".view-todo-check[data-done='true']::before");
  });

  it("the dashboard's On deck squares use the page's two severity colours", async () => {
    const css = stripCssComments(await source('src/web/styles/globals.css'));
    const high = css.slice(css.indexOf(".todo-row[data-severity='high'] .todo-severity {"));
    expect(high.slice(0, 120)).toContain('color: var(--missing-fill);');
    const medium = css.slice(css.indexOf(".todo-row[data-severity='medium'] .todo-severity {"));
    expect(medium.slice(0, 120)).toContain('color: var(--in-flight-fill);');
  });

  it('the page pip colours match the dashboard squares', async () => {
    const block = stripCssComments(todoBlock(await source('src/web/styles/globals.css')));
    expect(block).toMatch(/\.view-todo-pip\[data-severity='high'\] \{\s*color: var\(--missing-fill\);/);
    expect(block).toMatch(/\.view-todo-pip\[data-severity='medium'\] \{\s*color: var\(--in-flight-fill\);/);
  });
});
