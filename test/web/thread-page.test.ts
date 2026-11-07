// Phase 11 (11-23, VIEW-16): the thread page's composer and the static markup of its page (sketch 058 winner A, the Status
// dial), over the made-up Lendshed and Shapes threads loaded through the repository, plus planted copies for the shapes the
// fixtures lack (a parked thread, a current-shape thread with no next steps, a thread with none of the known headings). A
// thread leads with its status and its next steps in the author's order; nothing is re-worded, reordered or merged.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildSeedThreadLinks } from '../../src/presentation/seed-thread-links.ts';
import {
  composeThread,
  createdNoteDay,
  sinceUpdateWords,
  threadBlocksOf,
  threadStatusOf,
} from '../../src/web/views/thread-page.ts';
import type { ComposedThread } from '../../src/web/views/thread-page.ts';
import { ThreadView, threadHeaderProps } from '../../src/web/views/thread-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

const THREADS = '.planning/threads/';
const IN_PROGRESS = `${THREADS}loan-limit-policy.md`;
const RESOLVED = `${THREADS}kiosk-printer-swap.md`;
const OLDER = `${THREADS}offline-mode.md`;
const SHAPES_THREAD = `${THREADS}kiln-vendor-call.md`;

function inputOf(presentation: ProjectPresentation, path: string, withLinks = true): ViewInput {
  const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
  return {
    kind: 'thread',
    frontmatter: {},
    structured: artifact?.structured ?? {},
    groups: [],
    planSegments: [],
    seedThreadLinks: withLinks ? buildSeedThreadLinks(presentation, path) : null,
  };
}

function planted(presentation: ProjectPresentation, change: (copy: ProjectPresentation) => void): ProjectPresentation {
  const copy = structuredClone(presentation);
  change(copy);
  return copy;
}

/** A copy whose thread at `path` has these lift fields replaced. */
function withThread(presentation: ProjectPresentation, path: string, fields: Record<string, unknown>): ProjectPresentation {
  return planted(presentation, (copy) => {
    const artifact = copy.artifacts.find((candidate) => candidate.path === path)!;
    Object.assign(artifact.structured.thread as Record<string, unknown>, fields);
  });
}

function threadOf(presentation: ProjectPresentation, path: string, withLinks = true): ComposedThread {
  const model = composeThread(inputOf(presentation, path, withLinks));
  expect(model, path).not.toBeNull();
  return model as ComposedThread;
}

function markup(model: ComposedThread): string {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ThreadView, { model })));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

/** The text of the thread's `<li class="view-thread-step">` rows, numerals dropped, in page order. */
function stepTexts(html: string): string[] {
  return html
    .split('<li class="view-thread-step"')
    .slice(1)
    .map((row) => row.split('<span class="view-thread-tx">')[1]!.split('</span></li>')[0]!);
}

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

async function shapes(): Promise<ProjectPresentation> {
  return (await loadShapesProject()).presentation;
}

const FIXTURE_STEPS = [
  'Count open loans per member from the last quarter and see how many exceed four.',
  'Draft the limit as a per-shed setting and show it to two stewards.',
  'Decide whether lifting the limit for one member needs a reason on record.',
];

describe('thread page: loan-limit-policy, in progress', () => {
  it('leads with the status in flight, the dates and the age, and the title and slug in the head', async () => {
    const presentation = await lendshed();
    const model = threadOf(presentation, IN_PROGRESS);
    expect(model.head).toEqual({
      eyebrow: 'Thread',
      title: 'How many tools one member may hold at a time',
      slug: 'loan-limit-policy',
    });
    expect(model.status).toEqual({ word: 'in progress', tone: 'in-flight', dial: 'in_progress' });
    expect(model.created).toBe('2026-03-27');
    expect(model.updated).toBe('2026-04-12');
    const read = presentation.readAt.slice(0, 10);
    const days = Math.round((Date.parse(read) - Date.parse('2026-04-12')) / 86_400_000);
    expect(model.age).toBe(`${days} days since the last update`);
    const html = markup(model);
    expect(html).toContain('<span class="status-chip" data-tone="in-flight">in progress</span>');
    expect(html).toContain('Created 2026-03-27');
    expect(html).toContain('Updated 2026-04-12');
    expect(html).toContain(`${days} days since the last update`);
    // The status and the steps come before the goal, the context and the references.
    expect(html.indexOf('Next steps')).toBeGreaterThan(-1);
    expect(html.indexOf('in progress')).toBeLessThan(html.indexOf('Next steps'));
    expect(html.indexOf('Next steps')).toBeLessThan(html.indexOf('>Goal<'));
    expect(html.indexOf('>Goal<')).toBeLessThan(html.indexOf('>Context<'));
    expect(html.indexOf('>Context<')).toBeLessThan(html.indexOf('>References<'));
  });

  it("shows the next steps numbered in the fixture's order and words, the first boxed", async () => {
    const model = threadOf(await lendshed(), IN_PROGRESS);
    expect(model.steps.map((step) => step.number)).toEqual([1, 2, 3]);
    const html = markup(model);
    expect(stepTexts(html)).toEqual(FIXTURE_STEPS);
    expect(count(html, 'data-first="true"')).toBe(1);
    expect(html.indexOf('data-first="true"')).toBeLessThan(html.indexOf('data-first="false"'));
    expect(count(html, '<ol ')).toBe(1);
  });

  it('draws the dial: the needle on in progress, only that arc toned, the three words', async () => {
    const html = markup(threadOf(await lendshed(), IN_PROGRESS));
    expect(count(html, 'class="view-thread-arc"')).toBe(3);
    expect(count(html, 'view-thread-arc" data-tone="in-flight"')).toBe(1);
    expect(count(html, 'data-tone="complete"')).toBeGreaterThanOrEqual(1);
    expect(count(html, 'class="view-thread-needle"')).toBe(1);
    expect(html).toContain('aria-label="Status dial: in progress"');
    for (const word of ['Open', 'In progress', 'Resolved']) expect(html).toContain(`>${word}</span>`);
    expect(html).toContain('<span data-on="true">In progress</span>');
    expect(count(html, 'data-on="true"')).toBe(1);
  });

  it('lists every reference: the one that resolves is a link, the free text is plain', async () => {
    const model = threadOf(await lendshed(), IN_PROGRESS);
    expect(model.references.map((reference) => reference.state)).toEqual(['resolved', 'text']);
    expect(model.references[0]).toMatchObject({ path: '.planning/PROJECT.md' });
    expect(model.references[0]!.url).not.toBeNull();
    const html = markup(model);
    expect(count(html, '<a ')).toBe(1);
    expect(html).toContain(`href="${model.references[0]!.url}"`);
    expect(count(html, 'class="view-thread-ref"')).toBe(2);
    expect(html).toContain('Steward desk request from the March sync, no ticket number');
    expect(html).not.toContain('Not found');
    expect(count(html, 'status-square view-thread-sq" data-tone="complete"')).toBe(1);
  });

  it('draws the goal and the context as written, without the Created note', async () => {
    const html = markup(threadOf(await lendshed(), IN_PROGRESS));
    expect(html).toContain('Settle a per-member limit on open loans that stewards can live with');
    expect(html).toContain('Stewards report a few members holding six or more tools for weeks');
    expect(html).not.toContain('*Created');
    expect(count(html, 'Created 2026-03-27')).toBe(1);
  });
});

describe('thread page: kiosk-printer-swap, resolved', () => {
  it('reads resolved as complete, with the needle at the right', async () => {
    const model = threadOf(await lendshed(), RESOLVED);
    expect(model.status).toEqual({ word: 'resolved', tone: 'complete', dial: 'resolved' });
    expect(model.created).toBe('2026-02-02');
    expect(model.updated).toBe('2026-02-20');
    const html = markup(model);
    expect(html).toContain('<span class="status-chip" data-tone="complete">resolved</span>');
    expect(count(html, 'view-thread-arc" data-tone="complete"')).toBe(1);
    expect(count(html, 'view-thread-arc" data-tone="in-flight"')).toBe(0);
    expect(stepTexts(html)).toEqual([
      'Order the thermal printer and fit it at the east shed',
      'Print twenty test receipts and note any jam',
      'Close this thread once a month passes with no jam report',
    ]);
  });
});

describe('thread page: offline-mode, the older shape', () => {
  it('reads OPEN from the body as in flight, the title from the heading, and the created day from the Context note', async () => {
    const model = threadOf(await lendshed(), OLDER);
    expect(model.status).toEqual({ word: 'open', tone: 'in-flight', dial: 'open' });
    expect(model.head.title).toBe("Let a kiosk keep taking loans when the shed's network drops");
    expect(model.created).toBe('2026-01-22');
    expect(model.updated).toBeNull();
    expect(model.age).toBeNull();
    const html = markup(model);
    expect(html).toContain('Created 2026-01-22');
    expect(html).not.toContain('Updated');
    expect(html).not.toContain('since the last update');
  });

  it('draws nothing for the placeholder next steps and references', async () => {
    const model = threadOf(await lendshed(), OLDER);
    expect(model.steps).toEqual([]);
    expect(model.references).toEqual([]);
    const html = markup(model);
    expect(html).not.toContain('Next steps');
    expect(html).not.toContain('References');
    expect(html).not.toContain('<ol');
    expect(html).not.toContain('what the next session should do first');
    expect(html).not.toContain('add links');
    expect(html).toContain('Let a kiosk record a loan while the network is down');
    expect(html).toContain('The west shed loses its connection for an hour most weeks.');
  });
});

describe("thread page: Shapes' kiln-vendor-call renders through the same composer", () => {
  it('shows the status of a thread that carries nothing else', async () => {
    const model = threadOf(await shapes(), SHAPES_THREAD);
    expect(model.status).toEqual({ word: 'open', tone: 'in-flight', dial: 'open' });
    expect(model.head.title).toBe('Kiln vendor call');
    expect(model.created).toBeNull();
    expect(model.steps).toEqual([]);
    const html = markup(model);
    expect(html).toContain('data-tone="in-flight">open</span>');
    expect(html).not.toContain('Created');
    expect(html).not.toContain('Next steps');
  });
});

describe('thread page: the status word and its tone', () => {
  it("shows an unrecognised status verbatim and quiet, 'parked' included, with every arc grey and the needle at rest", async () => {
    const model = threadOf(withThread(await lendshed(), IN_PROGRESS, { status: 'parked' }), IN_PROGRESS);
    expect(model.status).toEqual({ word: 'parked', tone: 'quiet', dial: null });
    const html = markup(model);
    expect(html).toContain('<span class="status-chip" data-tone="quiet">parked</span>');
    expect(count(html, 'view-thread-arc" data-tone')).toBe(0);
    expect(count(html, 'class="view-thread-arc"')).toBe(3);
    expect(html).not.toContain('class="view-thread-needle"');
    expect(html).toContain('class="view-thread-hub"');
    expect(count(html, 'data-on="true"')).toBe(0);
  });

  it('reads open, in_progress and resolved in any case, and the older IN PROGRESS, as the same three statuses', () => {
    expect(threadStatusOf('open')).toEqual({ word: 'open', tone: 'in-flight', dial: 'open' });
    expect(threadStatusOf('in_progress')).toEqual({ word: 'in progress', tone: 'in-flight', dial: 'in_progress' });
    expect(threadStatusOf('IN PROGRESS')).toEqual({ word: 'in progress', tone: 'in-flight', dial: 'in_progress' });
    expect(threadStatusOf(' Resolved ')).toEqual({ word: 'resolved', tone: 'complete', dial: 'resolved' });
    expect(threadStatusOf('Wont Fix')).toEqual({ word: 'Wont Fix', tone: 'quiet', dial: null });
    expect(threadStatusOf('')).toEqual({ word: '', tone: 'quiet', dial: null });
  });

  it('leaves the status out when the file states none', async () => {
    const model = threadOf(withThread(await lendshed(), IN_PROGRESS, { status: null }), IN_PROGRESS);
    expect(model.status).toBeNull();
    const html = markup(model);
    expect(html).not.toContain('status-chip');
    expect(html).not.toContain('view-thread-dial"');
    expect(html).toContain('Created 2026-03-27');
  });
});

describe('thread page: empty next steps show nothing invented', () => {
  it('a current-shape thread whose Next Steps were never filled draws no steps and no placeholder line', async () => {
    const presentation = withThread(await lendshed(), IN_PROGRESS, { nextSteps: [] });
    const model = threadOf(presentation, IN_PROGRESS);
    expect(model.steps).toEqual([]);
    const html = markup(model);
    expect(html).not.toContain('Next steps');
    expect(html).not.toContain('No steps');
    expect(html).not.toContain('view-thread-steps');
    // Everything else the file holds still draws.
    expect(html).toContain('in progress');
    expect(html).toContain('Goal');
    expect(html).toContain('Context');
    expect(html).toContain('References');
  });
});

describe('thread page: a thread with none of the known headings falls through silently', () => {
  it('composes null for a thread that holds only a slug and a title, and for a missing lift', async () => {
    const presentation = await lendshed();
    const bare = withThread(presentation, IN_PROGRESS, {
      status: null,
      created: null,
      updated: null,
      goal: null,
      context: null,
      references: [],
      nextSteps: [],
    });
    expect(composeThread(inputOf(bare, IN_PROGRESS))).toBeNull();
    expect(composeThread({ ...inputOf(presentation, IN_PROGRESS), structured: {} })).toBeNull();
    expect(composeThread({ ...inputOf(presentation, IN_PROGRESS), structured: { thread: 'text' } })).toBeNull();
    expect(composeThread({ ...inputOf(presentation, IN_PROGRESS), structured: { thread: [] } })).toBeNull();
  });

  it('is decided per file: a bare thread beside a full one leaves the full one composed', async () => {
    const presentation = await lendshed();
    const bare = withThread(presentation, OLDER, {
      status: null,
      created: null,
      goal: null,
      context: null,
    });
    expect(composeThread(inputOf(bare, OLDER))).toBeNull();
    expect(composeThread(inputOf(bare, IN_PROGRESS))).not.toBeNull();
  });

  it('draws the references as text, never as links, when the links context is missing', async () => {
    const model = threadOf(await lendshed(), IN_PROGRESS, false);
    expect(model.references.map((reference) => reference.state)).toEqual(['text', 'text']);
    expect(model.references[0]).toMatchObject({ path: '.planning/PROJECT.md', url: null });
    const html = markup(model);
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('Not found');
  });
});

describe('thread page: references past the project', () => {
  it('draws a path that names no payload artifact as plain text with a quiet Not found', async () => {
    const presentation = withThread(await lendshed(), IN_PROGRESS, {
      references: ['`frontend/app/limits.ts` — where the limit would be read', '`../outside.md` — outside the project'],
    });
    const model = threadOf(presentation, IN_PROGRESS);
    expect(model.references.map((reference) => reference.state)).toEqual(['not-found', 'not-found']);
    const html = markup(model);
    expect(count(html, '<a ')).toBe(0);
    expect(count(html, 'Not found')).toBe(2);
    expect(html).toContain('where the limit would be read');
  });

  it('draws every reference the lift kept (200 at most) without an unbounded count claim', async () => {
    const references = Array.from({ length: 200 }, (_, at) => `\`frontend/file-${at}.ts\` — note ${at}`);
    const model = threadOf(withThread(await lendshed(), IN_PROGRESS, { references }), IN_PROGRESS);
    expect(model.references).toHaveLength(200);
    const html = markup(model);
    expect(count(html, '<li class="view-thread-ref"')).toBe(200);
    expect(html).not.toMatch(/of \d+ references/);
  });
});

describe('thread page: the words and the helpers', () => {
  it('counts the age to the day the project was read and says only "since the last update"', () => {
    expect(sinceUpdateWords('2026-04-12', '2026-04-21T09:00:00Z')).toBe('9 days since the last update');
    expect(sinceUpdateWords('2026-04-20', '2026-04-21')).toBe('1 day since the last update');
    expect(sinceUpdateWords('2026-04-21', '2026-04-21')).toBe('updated today');
    expect(sinceUpdateWords('2026-04-22', '2026-04-21')).toBeNull();
    expect(sinceUpdateWords(null, '2026-04-21')).toBeNull();
    expect(sinceUpdateWords('2026-04-12', null)).toBeNull();
    expect(sinceUpdateWords('last week', '2026-04-21')).toBeNull();
  });

  it('reads the day of an italic Created note, and nothing else', () => {
    expect(createdNoteDay('*Created 2026-03-27.*')).toBe('2026-03-27');
    expect(createdNoteDay('_Created 2026-03-27_')).toBe('2026-03-27');
    expect(createdNoteDay('Created 2026-03-27.')).toBeNull();
    expect(createdNoteDay('*Created last spring.*')).toBeNull();
    expect(createdNoteDay('*Updated 2026-03-27.*')).toBeNull();
    expect(createdNoteDay('')).toBeNull();
  });

  it('keeps blank-line blocks and bullet lists', () => {
    const blocks = threadBlocksOf('one\ntwo\n\n- a\n- b\n\n   \nthree');
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'list', 'paragraph']);
    expect(threadBlocksOf(null)).toEqual([]);
    expect(threadBlocksOf('')).toEqual([]);
  });

  it('keeps a Created note whose date cannot be read inside the Context', async () => {
    const presentation = withThread(await lendshed(), OLDER, { context: '*Created whenever.*\n\nThe west shed drops.' });
    const html = markup(threadOf(presentation, OLDER));
    expect(html).toContain('whenever');
    expect(html).toContain('The west shed drops.');
  });
});

describe('thread page: a value-looking string in the prose', () => {
  it('draws the name and the shared Value not shown mark, and never the value', async () => {
    const context = 'Set API_KEY=sk-live-123 before running and keep `DB_URL=postgres://u:p@h/db` private.\n\n- TOKEN=abc123 goes in the vault';
    const model = threadOf(withThread(await lendshed(), IN_PROGRESS, { context }), IN_PROGRESS);
    const html = markup(model);
    expect(html).toContain('<code>API_KEY</code>');
    expect(html).toContain('<code>DB_URL</code>');
    expect(html).toContain('<code>TOKEN</code>');
    expect(count(html, 'Value not shown')).toBe(3);
    for (const value of ['sk-live-123', 'postgres', 'abc123', 'u:p@h']) {
      expect(html, value).not.toContain(value);
      expect(JSON.stringify(model), value).not.toContain(value);
    }
  });
});

describe('thread page: the header', () => {
  it('overrides the eyebrow, the h1 and the meta, drops the lead and keeps the header copy button', async () => {
    const model = threadOf(await lendshed(), IN_PROGRESS);
    const props = threadHeaderProps(model, 'Fallback');
    expect(props.eyebrow).toBe('Thread');
    expect(props.title).toBe('How many tools one member may hold at a time');
    expect(props.lead).toBeNull();
    expect('path' in props).toBe(false);
    expect(props.crumbs!.map((crumb) => crumb.label)).toEqual(['Dashboard', 'Roadmap', 'loan-limit-policy']);
    expect(threadHeaderProps({ ...model, head: { ...model.head, title: null } }, 'Fallback').title).toBe('Fallback');
  });

  it("falls back to the file name's stem as the meta when the file has no slug, so the header keeps its meta row", async () => {
    const model = threadOf(await lendshed(), OLDER);
    expect(model.head.slug).toBeNull();
    const props = threadHeaderProps(model, 'Fallback', OLDER);
    expect(props.meta).not.toBeNull();
    expect(renderToStaticMarkup(props.meta as React.JSX.Element)).toContain('offline-mode');
    expect(props.crumbs!.map((crumb) => crumb.label)).toEqual(['Dashboard', 'Roadmap', 'offline-mode']);
    // No path and no slug: no meta, and the crumb names the title.
    expect(threadHeaderProps(model, 'Fallback').meta).toBeNull();
  });
});

describe('edge probe VIEW-16: two thread files carrying one slug', () => {
  it('composes each file from its own input, so two threads with one slug never share a page', async () => {
    const presentation = await lendshed();
    const twin = planted(presentation, (copy) => {
      const original = copy.artifacts.find((artifact) => artifact.path === IN_PROGRESS)!;
      const clone = structuredClone(original);
      clone.path = `${THREADS}loan-limit-policy-copy.md`;
      (clone.structured.thread as { title: string }).title = 'The other thread that wrote the same slug';
      copy.artifacts.push(clone);
    });
    const first = threadOf(twin, IN_PROGRESS);
    const second = threadOf(twin, `${THREADS}loan-limit-policy-copy.md`);
    expect(first.head.slug).toBe(second.head.slug);
    expect(first.head.title).toBe('How many tools one member may hold at a time');
    expect(second.head.title).toBe('The other thread that wrote the same slug');
    expect(markup(first)).not.toContain('The other thread');
  });

  it('keeps the author order of next steps past the lift bound without re-sorting or merging', async () => {
    const steps = Array.from({ length: 200 }, (_, at) => `Step ${200 - at}`);
    const html = markup(threadOf(withThread(await lendshed(), IN_PROGRESS, { nextSteps: steps }), IN_PROGRESS));
    expect(stepTexts(html)).toEqual(steps);
  });
});

// ---------------------------------------------------------------------------
// The view contract: source-text checks in the seed-page idiom (no AST tooling). Comments are stripped before every
// negative check.
// ---------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-11-thread:start */';
const END = '/* phase-11-thread:end */';
const COMPOSER = 'src/web/views/thread-page.ts';
const COMPONENTS = 'src/web/views/thread-page-components.tsx';
const ALLOWED_SIZES = ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)', 'inherit'];

function stripSourceComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning|missing)['"]/.test(text) ||
    /data-tone="(destructive|warning|missing)"/.test(text) ||
    /'(destructive|warning|missing)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning|missing)'/.test(text)
  );
}

function writesNetworkOrStorage(text: string): boolean {
  return /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(text);
}

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

function usesRegexLiteral(text: string): boolean {
  return /\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\//.test(text);
}

function importsFilesystem(text: string): boolean {
  return /from 'node:(fs|path)|from 'fs'/.test(text);
}

function hasModuleLevelLet(text: string): boolean {
  return /^(export\s+)?let\s/m.test(text);
}

function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning|--missing/.test(block)) found.push('parse-degradation or missing token');
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

function fontSizes(block: string): string[] {
  return [...block.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1]!.trim());
}

describe('thread view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesNetworkOrStorage("await fetch('/x')")).toBe(true);
    expect(buildsRegExp('const re = new RegExp(text);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });
});

describe('thread view contract - the real sources', () => {
  it('the components render no raw HTML, make no request, touch no storage and write no destructive, warning or missing tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesNetworkOrStorage(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline as React text, withheld values through the shared mark', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../pages/research-atoms.tsx'");
    expect(code).toContain('<ResearchInline key={index} text={segment.text} />');
    expect(code).toContain("from '../components/value-not-shown.tsx'");
    expect(code).toContain('<ValueNotShown />');
    // The only link is a payload address the server resolved.
    expect(code).toContain('<Link className="view-thread-path" to={reference.url}>');
    expect(code).not.toMatch(/href=/);
  });

  it('writes the contract words in the composer', async () => {
    const composer = stripSourceComments(await source(COMPOSER));
    for (const words of ["'Next steps'", "'Goal'", "'Context'", "'References'", "'Created'", "'Updated'"]) {
      expect(composer, words).toContain(words);
    }
  });

  it('the composer builds no regular expression, uses no regex literal, imports no filesystem module and reads no clock', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(buildsRegExp(code)).toBe(false);
    expect(usesRegexLiteral(code)).toBe(false);
    expect(importsFilesystem(code)).toBe(false);
    expect(hasModuleLevelLet(code)).toBe(false);
    expect(code).not.toMatch(/^(export\s+)?var\s/m);
    expect(code).not.toMatch(/Date\.now\(|new Date\(/);
  });

  it('the composer writes only the quiet, in-flight and complete tones, never destructive or warning', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).not.toContain("'destructive'");
    expect(code).not.toContain("'warning'");
    expect(code).not.toContain("'missing'");
  });

  it('artifact-page.tsx draws the page from the composed model in View mode and the manifest keeps its fallback', async () => {
    const code = stripSourceComments(await source('src/web/pages/artifact-page.tsx'));
    expect(code).toContain('<ThreadView key={artifact.path} model={threadCover} />');
    expect(code).toContain('manifest.threadPage?.(viewInput)');
    expect(code).not.toMatch(/artifact\.kind === ['"]thread['"]/);
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests.match(/threadPage: composeThread/g)).toHaveLength(1);
  });

  it('the CSS holds one contiguous phase-11-thread block with no colour recipe and only the four contracted font sizes', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(count(css, START)).toBe(1);
    expect(count(css, END)).toBe(1);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-thread-/);
    const sizes = fontSizes(stripCssComments(block));
    expect(sizes.length).toBeGreaterThan(8);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    for (const selector of ['.view-thread-root', '.view-thread-band', '.view-thread-dial-card', '.view-thread-step', '.view-thread-ref']) {
      expect(block, selector).toContain(selector);
    }
  });

  it("writes only its own view-thread- classes beside the shared status chip and square, and reuses no other view's", async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    const tokens = [...code.matchAll(/className="([^"]*)"/g)].flatMap((match) => match[1]!.split(/\s+/));
    expect(tokens.length).toBeGreaterThan(10);
    for (const token of tokens) {
      expect(token.startsWith('view-thread-') || token === 'status-chip' || token === 'status-square', token).toBe(true);
    }
    expect(code).not.toMatch(/className=["'{][^>]*\b(research-|view-codebase-|view-pause-|view-seed-)/);
    const css = await source('src/web/styles/globals.css');
    const block = stripCssComments(css.slice(css.indexOf(START), css.indexOf(END)));
    expect(block).not.toMatch(/\.view-(codebase|pause|spikes|indexes|seed)-|\.research-/);
  });

  it('records the tone uses and the language bullet in design-language.md', async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('**The thread page.**');
    for (const tone of ['complete', 'in-flight', 'quiet']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).toContain('(Phase 11, 11-23) on the thread page');
    }
    const missing = doc.split('\n').find((line) => line.startsWith('| `missing`'))!;
    expect(missing).not.toContain('(Phase 11, 11-23)');
  });
});
