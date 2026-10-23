// quick-261023-61l (sketch 028 A): the NOTE composer and its view, pinned against the fixture project, the
// synthetic notes and labelore's own notes loaded as one project, and inline notes for the branches those
// do not cover. ViewInput literals are built from the handler's real parse (through the presentation) and
// the real join; pinned values come from the sketch's own data and the source files, never from the
// composer's output. The dates hold under any time zone: the composer reads them literally.
process.env.TZ = 'Asia/Kolkata';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildNoteContext } from '../../src/presentation/note-context.ts';
import type { NoteContext } from '../../src/presentation/note-context.ts';
import { createApp } from '../../src/server/index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composeNotePage, dropLeadingH1 } from '../../src/web/views/note-page.ts';
import type { ComposedNotePage } from '../../src/web/views/note-page.ts';
import { NotePageView } from '../../src/web/views/note-page-components.tsx';
import { NOTE_FILES, NOTES_FIXTURE_ROOT, combinedFiles, loadCombined, notesAndTodos } from '../helpers/note-corpus.ts';
import type { LoadedProject } from '../helpers/todo-corpus.ts';

let project: LoadedProject;
beforeAll(async () => {
  project = await loadCombined();
});

type Key = keyof typeof NOTE_FILES;

function inputOf(key: Key, headings: ViewInput['headings'] = []): ViewInput {
  const path = NOTE_FILES[key];
  const dto = project.presentation.artifacts.find((artifact) => artifact.path === path);
  if (!dto) throw new Error(`no artifact ${path}`);
  const context = buildNoteContext(project.presentation, project.registry, project.bodyOf, path);
  return {
    kind: dto.kind,
    frontmatter: JSON.parse(JSON.stringify(dto.frontmatter)) as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(dto.structured)) as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings,
    noteContext: JSON.parse(JSON.stringify(context)) as NoteContext,
  };
}

function page(key: Key, headings: ViewInput['headings'] = []): ComposedNotePage {
  const model = composeNotePage(inputOf(key, headings));
  if (model === null) throw new Error(`composed null: ${key}`);
  return model;
}

function render(model: ComposedNotePage, extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(NotePageView, {
        model,
        fallbackTitle: 'Fallback',
        path: '.planning/notes/x.md',
        mode: 'view',
        onModeChange: () => {},
        onShowSource: () => {},
        documentHtml: '',
        renderHtml: (html: string) => createElement('div', { 'data-length': html.length }),
        chip: null,
        ...extra,
      }),
    ),
  );
}

const plain = (runs: { text: string }[]): string => runs.map((run) => run.text).join('');
const count = (html: string, needle: string): number => html.split(needle).length - 1;

describe('the head', () => {
  it('dcrop: Note, the noted stamp with its time, Now a todo', () => {
    const model = page('dcrop');
    expect(model.head).toEqual({
      eyebrow: 'Note',
      noted: { date: '21 Oct 2026', time: '15:58' },
      promoted: { label: 'Now a todo', tone: 'complete' },
    });
  });
  it('the stamps and chips of the other notes', () => {
    expect(page('dsfx').head).toMatchObject({ noted: { date: '20 Oct 2026', time: '04:02' }, promoted: { label: 'Now a todo' } });
    expect(page('dcall').head).toMatchObject({ noted: { date: '20 Oct 2026', time: '02:47' }, promoted: { label: 'Now a todo' } });
    expect(page('dback').head).toMatchObject({ noted: { date: '20 Oct 2026', time: '03:32' }, promoted: { label: 'Promoted', tone: 'complete' } });
    expect(page('pcap').head).toMatchObject({ noted: { date: '21 Oct 2026', time: '03:38' }, promoted: { label: 'Promoted' } });
    expect(page('star').head).toMatchObject({ noted: { date: '16 Oct 2026', time: '14:47' }, promoted: { label: 'Now a todo' } });
    expect(page('sundo').head).toMatchObject({ noted: { date: '8 Oct 2026', time: '18:20' }, promoted: { label: 'Not promoted', tone: 'quiet' } });
    expect(page('lsk').head).toMatchObject({ noted: { date: '23 Oct 2026', time: '03:11' }, promoted: { label: 'Now a todo' } });
  });
  it('an explore note has a day, no time and no promoted chip', () => {
    expect(page('pbrief').head).toMatchObject({ noted: { date: '23 Oct 2026', time: null }, promoted: null });
    expect(page('lperkind').head).toMatchObject({ noted: { date: '20 Sep 2026', time: null }, promoted: null });
  });
});

describe('a quick note', () => {
  it('dcrop: title, six rows with tones and the Decided date label, mentions', () => {
    const model = page('dcrop');
    expect(model.shape).toBe('quick');
    expect(plain(model.title.runs)).toBe('Crop for images before sending and for profile photos (she asked for it).');
    expect(model.title.short).toBe(false);
    expect(model.rows.map((row) => row.label)).toEqual(['Today', 'Decided · 21 Oct 2026', 'How', 'Preset constraint', 'Estimated', 'Batch']);
    expect(model.rows.map((row) => row.tone)).toEqual([null, 'complete', null, null, null, null]);
    expect(model.rows.every((row) => !row.then)).toBe(true);
    expect(model.whole).toBeNull();
    expect(model.mentions).toEqual([{ path: 'server/src/media/image.ts', count: 1 }]);
    expect(model.verbatim?.capped).toBe(false);
    expect(model.also).toEqual([{ label: 'Frontmatter', targetId: null }]);
  });
  it('star and sundo are whole notes: the one-line message, no rows', () => {
    for (const key of ['star', 'sundo'] as const) {
      const model = page(key);
      expect(model.rows).toEqual([]);
      expect(model.whole).toBe('That’s the whole note — one line.');
      expect(model.mentions).toEqual([]);
    }
    expect(page('star').title.short).toBe(true);
    expect(page('sundo').title.short).toBe(false);
  });
  it('lsk: the first row is the Then row (correction 1)', () => {
    const model = page('lsk');
    expect(plain(model.title.runs)).toBe('Show sketches inside Labelore instead of a separate file server.');
    expect(model.rows.map((row) => row.label)).toEqual([null, 'Want', 'Open question', 'Open question', 'Today', 'Suggested interim']);
    expect(model.rows[0].then).toBe(true);
    expect(model.mentions.map((m) => m.path)).toEqual(['sketches/MANIFEST.md', 'README.md', 'data.js']);
  });
  it('dsfx and dcall tones', () => {
    expect(page('dsfx').rows.map((row) => [row.label, row.tone])).toEqual([
      ['Decided', 'complete'],
      ['Decided', 'complete'],
      ['Suggested', 'in-flight'],
      ['Limits', null],
    ]);
    expect(page('dcall').rows.map((row) => [row.label, row.tone])).toEqual([
      ['Observed', 'in-flight'],
      ['Want', null],
      ['Off limits', null],
      ['Output', null],
    ]);
  });
});

describe('the todo cards and the empty states', () => {
  it('dcrop: Became a todo, Done, Minor / low, media, via, resolution, one batched row, the todo link', () => {
    const [card] = page('dcrop').todos;
    expect(card.kicker).toBe('Became a todo');
    expect(card.status).toEqual({ label: 'Done', tone: 'complete' });
    expect(card.statusKey).toBe('done');
    expect(card.weight).toEqual({ text: 'Minor', level: 'low', title: 'severity: minor' });
    expect(card.area).toBe('media');
    expect(card.title).toBe('Add crop and round profile photos');
    expect(card.via).toBe('Names this note in notes:');
    expect(card.resolution?.startsWith('Done in quick task 261022-m25 (2026-10-22). What shipped:')).toBe(true);
    expect(card.batched).toHaveLength(1);
    expect(card.batched[0].text.startsWith('21 Oct 2026 · 15:58 · Round profile photos everywhere')).toBe(true);
    expect(card.batched[0].url).toEqual(expect.any(String));
    expect(card.url).toEqual(expect.any(String));
  });
  it('star: Pending in-flight, P2 priority / medium, promoted word for word', () => {
    const [card] = page('star').todos;
    expect(card.status).toEqual({ label: 'Pending', tone: 'in-flight' });
    expect(card.weight).toEqual({ text: 'P2', level: 'medium', title: 'priority: P2' });
    expect(card.via).toBe('Promoted from this note word for word');
    expect(card.area).toBe('general');
  });
  it('lperkind and pbrief: Related todo cards', () => {
    const lperkind = page('lperkind');
    expect(lperkind.todos.map((card) => [card.kicker, card.via])).toEqual([['Related todo', 'Links this note in its text']]);
    const pbrief = page('pbrief');
    expect(pbrief.todos.map((card) => [card.kicker, card.statusKey, card.via])).toEqual([
      ['Related todo', 'done', 'Mentions this note in its text'],
      ['Related todo', 'pending', 'Mentions this note in its text'],
    ]);
    expect(pbrief.todos[1].weight).toEqual({ text: 'High', level: 'high', title: 'priority: high' });
  });
  it('dback and pcap: promoted but untraced; sundo: still a note; lsurvey: no todo names it', () => {
    expect(page('dback').empty).toEqual({
      kicker: 'Promoted, but untraced',
      text: 'Marked `promoted: true`, but no todo names this note or carries its text.',
    });
    expect(page('pcap').empty?.kicker).toBe('Promoted, but untraced');
    expect(page('sundo').empty).toEqual({ kicker: 'Still a note', text: 'Not promoted to a todo.' });
    expect(page('lsurvey').empty).toEqual({ kicker: 'Still a note', text: 'No todo names this note.' });
    expect(page('dcrop').empty).toBeNull();
  });
});

describe('degrade', () => {
  const base = (structured: unknown, frontmatter: unknown = {}, extra: Partial<ViewInput> = {}): ViewInput =>
    ({ kind: 'note', frontmatter, structured, groups: [], planSegments: [], ...extra }) as unknown as ViewInput;

  it('is null without structured.note and for an empty quick note', () => {
    expect(composeNotePage(base({}))).toBeNull();
    expect(composeNotePage(base({ note: 'quick' }))).toBeNull();
    expect(composeNotePage(base({ note: { shape: 'quick', title: [], rows: [] } }))).toBeNull();
    expect(composeNotePage(base({ note: { shape: 'weird' } }))).toBeNull();
  });
  it('never throws on junk', () => {
    const junk = [null, 1, 'x', [], [1, null], { a: 1 }];
    for (const value of junk) {
      expect(() =>
        composeNotePage(
          base(
            { note: { shape: 'quick', title: [{ kind: 'text', text: 'T' }, value, { kind: 5, text: 5 }], rows: value, mentions: value, verbatim: value } },
            { date: value, promoted: value, context: value, title: value },
            { noteContext: { todos: value } as unknown as NoteContext, headings: value as never },
          ),
        ),
      ).not.toThrow();
      expect(() =>
        composeNotePage(
          base(
            { note: { shape: 'document' } },
            { date: value, promoted: value, context: value, title: value },
            { noteContext: value as never, headings: value as never },
          ),
        ),
      ).not.toThrow();
    }
    expect(composeNotePage(base({ note: { shape: 'quick', title: [{ kind: 'text', text: 'T' }] } }, null as never))).not.toBeNull();
    expect(
      composeNotePage(base({ note: { shape: 'quick', title: [{ kind: 'text', text: 'T' }], rows: [null, 5, { label: 5, runs: 'x' }] } }))?.rows,
    ).toHaveLength(3);
  });
  it('promoted as a string shows no chip; a todo of junk is dropped', () => {
    const model = composeNotePage(
      base({ note: { shape: 'quick', title: [{ kind: 'text', text: 'T' }] } }, { promoted: 'true' }, {
        noteContext: { todos: [{ title: 5 }, { title: 'Ok', status: 'weird', level: 'weird', weightKind: 'x' }] } as unknown as NoteContext,
      }),
    );
    expect(model?.head.promoted).toBeNull();
    expect(model?.todos).toHaveLength(1);
    expect(model?.todos[0].statusKey).toBe('unfiled');
    expect(model?.todos[0].weight).toEqual({ text: 'Unrated', level: 'unrated', title: 'No severity recorded' });
    expect(model?.empty).toBeNull();
  });
  it('dates are read literally under any zone', () => {
    const quick = { note: { shape: 'quick', title: [{ kind: 'text', text: 'T' }] } };
    expect(composeNotePage(base(quick, { date: '2026-10-21 15:58' }))?.head.noted).toEqual({ date: '21 Oct 2026', time: '15:58' });
    expect(composeNotePage(base(quick, { date: new Date('2026-09-20T00:00:00.000Z') }))?.head.noted).toEqual({ date: '20 Sep 2026', time: null });
    expect(composeNotePage(base(quick, { date: '2026-10-21' }))?.head.noted).toEqual({ date: '21 Oct 2026', time: null });
    expect(composeNotePage(base(quick, { date: 'yesterday' }))?.head.noted).toEqual({ date: 'yesterday', time: null });
    expect(composeNotePage(base(quick, {}))?.head.noted).toBeNull();
  });
});

describe('static markup', () => {
  it('dcrop renders the head, the toggle, six rows, the reference, the card, the mentions and the Also row', () => {
    const html = render(page('dcrop'));
    expect(count(html, '<h1')).toBe(1);
    expect(html).toContain('Crop for images before sending and for profile photos (she asked for it).');
    expect(html).toContain('>Note</p>');
    expect(html).toContain('Noted <b>21 Oct 2026</b> · 15:58');
    expect(html).toContain('Now a todo');
    expect(html).toContain('<div class="view-note-toggle" role="group" aria-label="Note view"><button type="button" aria-pressed="true">Lifted</button>');
    expect(count(html, 'class="view-note-clause"')).toBe(6);
    expect(html).toContain('<span class="view-note-label" data-tone="complete">Decided · 21 Oct 2026</span>');
    // The text holds one reference button; Mentions holds its own row button.
    expect(count(html, 'class="view-note-ref"')).toBe(1);
    expect(html).toContain('title="Copy server/src/media/image.ts"');
    // The card.
    expect(html).toContain('<article class="view-note-todo" data-status="done">');
    expect(html).toContain('Became a todo');
    expect(html).toContain('<span class="status-chip" data-tone="complete">Done</span>');
    expect(html).toContain('<span class="view-note-weight" data-level="low" title="severity: minor"><i aria-hidden="true"></i>Minor</span>');
    expect(html).toContain('<span class="status-chip" data-tone="quiet">media</span>');
    expect(html).toContain('Add crop and round profile photos');
    expect(html).toContain('Names this note in notes:');
    expect(html).toContain('Done in quick task 261022-m25');
    expect(count(html, 'class="view-note-sibling"')).toBe(1);
    expect(html).toContain('Open todo ↗');
    expect(count(html, '<a class="view-note-open"')).toBe(1);
    // Mentions and the Also row.
    expect(html).toContain('Mentions · 1');
    expect(count(html, 'class="view-note-mention"')).toBe(1);
    expect(html).toContain('aria-label="Also in this file"');
    expect(html).toContain('>Frontmatter</button>');
  });

  it('the first row of a multi-sentence lead is headed Then', () => {
    const html = render(page('lsk'));
    expect(html).toContain('<span class="view-note-then">Then</span>');
    expect(html).toContain('Mentions · 3');
    expect(html).toContain('<code>.planning/sketches/</code>');
  });

  it('star: short display title, the whole-note line, no toggle, no Mentions', () => {
    const html = render(page('star'));
    expect(html).toContain('<h1 class="view-note-title" data-short="true">');
    expect(html).toContain('That’s the whole note — one line.');
    expect(html).not.toContain('view-note-toggle');
    expect(html).not.toContain('Mentions');
    expect(html).toContain('Promoted from this note word for word');
  });

  it('dback: the dashed untraced card and no todo link', () => {
    const html = render(page('dback'));
    expect(html).toContain('<article class="view-note-todo" data-status="none">');
    expect(html).toContain('Promoted, but untraced');
    expect(html).toContain('<code>promoted: true</code>');
    expect(html).not.toContain('Open todo');
    expect(html).toContain('Promoted</span>');
  });

  it('sundo: Not promoted chip on the quiet tone and Still a note', () => {
    const html = render(page('sundo'));
    expect(html).toContain('<span class="status-chip" data-tone="quiet">Not promoted</span>');
    expect(html).toContain('Still a note');
    expect(html).toContain('Not promoted to a todo.');
  });

  it('pcap: identifiers are mono text, not buttons', () => {
    const html = render(page('pcap'));
    expect(count(html, 'class="view-note-ident"')).toBe(5);
    expect(html).toContain('Mentions · 2');
  });

  it('a card without a url, and a batched row without one, render as plain text', () => {
    const model = page('dcrop');
    model.todos[0].url = null;
    model.todos[0].batched[0].url = null;
    const html = render(model);
    expect(html).not.toContain('<a class="view-note-open"');
    expect(html).toContain('<span class="view-note-open">Open todo ↗</span>');
    expect(html).toContain('<span class="view-note-sibling">');
  });

  it('shows the warning chip slot in the head and none of the removed parts', () => {
    const html = render(page('dcrop'), { chip: createElement('span', { className: 'chip-slot' }, 'warn') });
    expect(html).toContain('<span class="chip-slot">warn</span>');
    expect(html).not.toContain('view-note-doc');
    expect(html).not.toContain('view-note-contents');
  });
});

describe('an explore note', () => {
  type Served = {
    artifact: { kind: string; frontmatter: Record<string, unknown>; structured: Record<string, unknown> };
    noteContext: NoteContext | null;
    document: { html: string; headings: { id: string; text: string; depth: number }[] };
  };
  let documentOf: (key: Key) => Promise<Served>;
  beforeAll(async () => {
    const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(combinedFiles()), '/project').load();
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    documentOf = async (key) => {
      const dto = presentation.artifacts.find((artifact) => artifact.path === NOTE_FILES[key]);
      if (!dto) throw new Error(`no artifact ${key}`);
      return (await (await app.request(`/api/documents?route=${encodeURIComponent(dto.key)}`)).json()) as Served;
    };
  });

  async function composed(key: Key): Promise<{ model: ComposedNotePage; served: Served }> {
    const served = await documentOf(key);
    const model = composeNotePage({
      kind: served.artifact.kind,
      frontmatter: served.artifact.frontmatter,
      structured: served.artifact.structured,
      groups: [],
      planSegments: [],
      headings: served.document.headings,
      noteContext: served.noteContext,
    });
    if (model === null) throw new Error(`composed null: ${key}`);
    return { model, served };
  }

  it('lperkind: the title, the lede, six contents entries in order and one Related card', async () => {
    const { model } = await composed('lperkind');
    expect(model.shape).toBe('document');
    expect(model.title.text).toBe('Per-kind artifact rendering — parsing, design language, and categorization');
    expect(model.lede).toBe(
      '/gsd-explore session on how planning artifacts render and why document pages read worse than dashboard/roadmap/traceability',
    );
    expect(model.contents.map((entry) => entry.text)).toEqual([
      'Axis 1 — Parsing: 11 of 16 types have no structured representation',
      'Structure that IS extracted is discarded at the client boundary',
      'Axis 2 — Design language: it exists, it is real, it is undocumented',
      'Axis 3 — Categorization: RESOLVED 2026-09-20',
      'Delivery shape',
      'Related',
    ]);
    expect(model.contents.every((entry) => entry.id !== '')).toBe(true);
    expect(model.rows).toEqual([]);
    expect(model.whole).toBeNull();
    expect(model.mentions).toEqual([]);
    expect(model.todos.map((card) => card.kicker)).toEqual(['Related todo']);
  });

  it('pbrief: three contents entries and two Related cards in path order', async () => {
    const { model } = await composed('pbrief');
    expect(model.contents.map((entry) => entry.text)).toEqual([
      'Features',
      'Footage facts (measured 2026-10-23)',
      'Network facts (measured 2026-10-23)',
    ]);
    expect(model.todos.map((card) => card.kicker)).toEqual(['Related todo', 'Related todo']);
    expect(model.todos.map((card) => card.statusKey)).toEqual(['done', 'pending']);
  });

  it('lsurvey: no todo names it', async () => {
    const { model } = await composed('lsurvey');
    expect(model.todos).toEqual([]);
    expect(model.empty).toEqual({ kicker: 'Still a note', text: 'No todo names this note.' });
    expect(model.contents.length).toBeGreaterThanOrEqual(1);
  });

  it('lperkind renders one h1, the lede, the document body, the contents and no toggle or mentions', async () => {
    const { model, served } = await composed('lperkind');
    const html = render(model, { documentHtml: served.document.html });
    expect(count(html, '<h1')).toBe(1);
    expect(html).toContain('Per-kind artifact rendering — parsing, design language, and categorization');
    expect(html).toContain('<p class="view-note-lede">');
    expect(html).toContain('/gsd-explore session on how planning artifacts render');
    // The stub renderHtml sees the html without its leading h1 (the body H1 differs from the title, so the server keeps it).
    const withoutH1 = dropLeadingH1(served.document.html);
    expect(served.document.html.trimStart().startsWith('<h1')).toBe(true);
    expect(html).toContain(`<div class="view-note-doc"><div data-length="${withoutH1.length}"></div></div>`);
    expect(html).toContain('<nav class="view-note-contents" aria-label="In this note">');
    expect(html).toContain('In this note · 6');
    const contents = html.slice(html.indexOf('<nav class="view-note-contents"'));
    expect(count(contents.slice(0, contents.indexOf('</nav>')), '<button')).toBe(6);
    expect(html).not.toContain('view-note-toggle');
    expect(html).not.toContain('view-note-mentions');
    expect(html).toContain('Related todo');
  });

  it('an explore note with a frontmatter title but no headings has no contents', () => {
    const model = composeNotePage({
      kind: 'note',
      frontmatter: { title: 'Only a title' },
      structured: { note: { shape: 'document' } },
      groups: [],
      planSegments: [],
      headings: [{ id: 'only-a-title', text: 'Only a title', depth: 1 }],
      noteContext: { todos: [] },
    });
    expect(model?.contents).toEqual([]);
    const html = render(model as ComposedNotePage);
    expect(html).not.toContain('view-note-contents');
    expect(html).toContain('No todo names this note.');
  });

  it('falls back to the first H1, then to the artifact title, when the frontmatter has no title', () => {
    const base = { kind: 'note', frontmatter: {}, structured: { note: { shape: 'document' } }, groups: [], planSegments: [] };
    expect(composeNotePage({ ...base, headings: [{ id: 'h', text: 'Heading one', depth: 1 }] })?.title.text).toBe('Heading one');
    const none = composeNotePage({ ...base, headings: [] });
    expect(none?.title.text).toBeNull();
    expect(render(none as ComposedNotePage)).toContain('Fallback');
  });
});

describe('dropLeadingH1', () => {
  it('drops a leading h1 and the whitespace after it', () => {
    expect(dropLeadingH1('<h1 id="a">Title</h1>\n<p>x</p>')).toBe('<p>x</p>');
    expect(dropLeadingH1('  \n<h1>Title</h1><p>x</p>')).toBe('<p>x</p>');
  });
  it('leaves anything else alone', () => {
    expect(dropLeadingH1('<p>x</p><h1>T</h1>')).toBe('<p>x</p><h1>T</h1>');
    expect(dropLeadingH1('<h1>unclosed')).toBe('<h1>unclosed');
    expect(dropLeadingH1('<h10>no</h10>')).toBe('<h10>no</h10>');
    expect(dropLeadingH1('')).toBe('');
    expect(dropLeadingH1(undefined as unknown as string)).toBe('');
  });
});

describe('end to end from files on disk', () => {
  let dir: string | null = null;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = null;
  });

  async function write(root: string, files: Record<string, string>): Promise<void> {
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), content);
    }
  }

  it('a temp project served through createApp composes dcrop and leaves a phase notes.md alone', async () => {
    dir = await mkdtemp(join(tmpdir(), 'note-e2e-'));
    await write(dir, {
      ...notesAndTodos(NOTES_FIXTURE_ROOT),
      '.planning/phases/01-a/notes.md': 'Decided: nothing special here.\n',
      '.planning/ROADMAP.md': '# Roadmap\n',
    });
    const snapshot = await new PlanningRepository(new LocalFsPlanningFilesystem(dir), dir).load();
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    const documentOf = async (path: string) => {
      const dto = presentation.artifacts.find((artifact) => artifact.path === path);
      if (!dto) throw new Error(`no artifact ${path}`);
      return (await (await app.request(`/api/documents?route=${encodeURIComponent(dto.key)}`)).json()) as {
        artifact: { kind: string; frontmatter: Record<string, unknown>; structured: Record<string, unknown> };
        noteContext: NoteContext | null;
        document: { html: string; headings: { id: string; text: string; depth: number }[] };
      };
    };

    const served = await documentOf(NOTE_FILES.dcrop);
    expect(served.artifact.kind).toBe('note');
    const model = composeNotePage({
      kind: served.artifact.kind,
      frontmatter: served.artifact.frontmatter,
      structured: served.artifact.structured,
      groups: [],
      planSegments: [],
      headings: served.document.headings,
      noteContext: served.noteContext,
    });
    expect(model).not.toBeNull();
    const html = render(model as ComposedNotePage, { documentHtml: served.document.html });
    expect(count(html, '<h1')).toBe(1);
    expect(html).toContain('Became a todo');
    expect(html).toContain('Names this note in notes:');
    expect(count(html, 'class="view-note-clause"')).toBe(6);

    const phaseNotes = await documentOf('.planning/phases/01-a/notes.md');
    expect(phaseNotes.artifact.kind).toBe('unknown');
    expect(phaseNotes.artifact.structured.note).toBeUndefined();
    expect(phaseNotes.noteContext).toBeNull();
  });
});
