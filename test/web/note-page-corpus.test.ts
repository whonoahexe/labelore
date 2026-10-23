// quick-261023-61l (QCORP) and quick-261023-u13 (sketch 029 A): real-corpus guards over every note on this machine - labelore's own
// `.planning/notes/`, the dashboard's synthetic fixture, the committed fixture project and each sibling
// project that has a notes folder (resoundant and resoundant/pyedge today) - built through the real
// repository load so each file reaches the handler with the ref discovery gives it, served through
// createApp (so an explore note carries its real headings) and joined with the server's note context.
// These are live projects, so the test asserts invariants for every file and pins values only for the
// files named in the sketch, using the numbers from the sketch's rendering and data - never the
// composer's output. It also proves the NOTE page and the TODO page agree on every todo-note link.
process.env.TZ = 'Asia/Kolkata';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildNoteContext } from '../../src/presentation/note-context.ts';
import type { NoteContext } from '../../src/presentation/note-context.ts';
import { buildTodoContext } from '../../src/presentation/todo-context.ts';
import { createApp } from '../../src/server/index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { composeNotePage } from '../../src/web/views/note-page.ts';
import type { ComposedNotePage } from '../../src/web/views/note-page.ts';
import { NotePageView } from '../../src/web/views/note-page-components.tsx';
import { NOTE_FILES, NOTE_ROOTS, NOTE_HOME, loadCombined } from '../helpers/note-corpus.ts';
import { loadProject } from '../helpers/todo-corpus.ts';
import type { LoadedProject } from '../helpers/todo-corpus.ts';

interface Entry {
  root: string;
  path: string;
  kind: string;
  shape: string | null;
  frontmatterKeys: number;
  model: ComposedNotePage | null;
  markup: string;
  context: NoteContext | null;
  headingIds: string[];
  quickRowsAreBounded: boolean;
  headingTexts: string[];
}

const entries: Entry[] = [];

/** The sketch's NOW: 23 Oct 2026, 12:00 local. */
const NOW = new Date(2026, 9, 23, 12, 0);

function markupOf(model: ComposedNotePage | null, html: string): string {
  if (model === null) return '';
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
        documentHtml: html,
        renderHtml: () => null,
        chip: null,
      }),
    ),
  );
}

beforeAll(async () => {
  for (const root of NOTE_ROOTS) {
    const project = await loadProject(root);
    const app = createApp({ getSnapshot: () => project.snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    for (const artifact of presentation.artifacts) {
      if (!artifact.path.startsWith('.planning/notes/') || !artifact.path.toLowerCase().endsWith('.md')) continue;
      const served = (await (await app.request(`/api/documents?route=${encodeURIComponent(artifact.key)}`)).json()) as {
        artifact: { kind: string; frontmatter: Record<string, unknown>; structured: Record<string, unknown> };
        noteContext: NoteContext | null;
        document: { html: string; headings: { id: string; text: string; depth: number }[] };
      };
      const note = served.artifact.structured.note as { shape?: string; rows?: unknown[] } | undefined;
      const model = composeNotePage({
        kind: served.artifact.kind,
        frontmatter: served.artifact.frontmatter,
        structured: served.artifact.structured,
        groups: [],
        planSegments: [],
        headings: served.document.headings,
        noteContext: served.noteContext,
      }, { now: NOW });
      entries.push({
        root,
        path: artifact.path,
        kind: served.artifact.kind,
        shape: note?.shape ?? null,
        frontmatterKeys: Object.keys(served.artifact.frontmatter).length,
        model,
        markup: markupOf(model, served.document.html),
        context: served.noteContext,
        headingIds: served.document.headings.map((heading) => heading.id),
        headingTexts: served.document.headings.filter((heading) => heading.depth === 2).map((heading) => heading.text),
        quickRowsAreBounded: (note?.rows?.length ?? 0) <= 80,
      });
    }
  }
}, 60_000);

const find = (key: keyof typeof NOTE_FILES): Entry => {
  const entry = entries.find((candidate) => candidate.path === NOTE_FILES[key] && candidate.root === NOTE_HOME[key]);
  if (!entry) throw new Error(`no entry ${key}`);
  return entry;
};

describe('every note on this machine', () => {
  it('reads at least twelve notes, so an empty walk cannot pass', () => {
    console.log(`note corpus: ${entries.length} notes from ${NOTE_ROOTS.length} projects`);
    expect(entries.length).toBeGreaterThanOrEqual(12);
  });

  it('each has kind note and a structured.note, and composes unless it is an empty quick note', () => {
    for (const entry of entries) {
      expect(entry.kind, entry.path).toBe('note');
      expect(entry.shape, entry.path).toMatch(/^(quick|document)$/);
      if (entry.model === null) {
        expect(entry.shape, entry.path).toBe('quick');
      }
    }
  });

  it('a quick note has a gist, a file-name title, bounded rows, label lengths within 22 and counts of at least one', () => {
    for (const entry of entries.filter((candidate) => candidate.model?.shape === 'quick')) {
      const model = entry.model as ComposedNotePage;
      expect(model.gist.runs.map((run) => run.text).join('').trim(), entry.path).not.toBe('');
      expect((model.rail.title ?? '').trim(), entry.path).not.toBe('');
      expect(model.rows.length === 0 ? model.oneLine !== null : model.ledger !== null, entry.path).toBe(true);
      expect(model.rail.big.value, entry.path).toBe(model.rows.length === 0 ? '1' : String(model.rows.length));
      expect(entry.quickRowsAreBounded, entry.path).toBe(true);
      for (const row of model.rows) {
        if (row.label === null) continue;
        const label = row.label.split(' · ')[0];
        expect(label.length, `${entry.path}: ${row.label}`).toBeLessThanOrEqual(22);
      }
      for (const mention of model.mentions) expect(mention.count, entry.path).toBeGreaterThanOrEqual(1);
      expect(model.parts, entry.path).toEqual([]);
    }
  });

  it('every explore section pairs to a heading id of that file, and its heading is that heading', () => {
    for (const entry of entries.filter((candidate) => candidate.model?.shape === 'document')) {
      const model = entry.model as ComposedNotePage;
      expect(model.rows, entry.path).toEqual([]);
      expect(model.mentions, entry.path).toEqual([]);
      expect(model.parts.length, entry.path).toBe(entry.headingTexts.length);
      for (const part of model.parts) {
        expect(part.id, `${entry.path}: ${part.heading}`).not.toBeNull();
        expect(entry.headingIds, `${entry.path}: ${part.heading}`).toContain(part.id);
      }
      expect(model.parts.map((part) => part.index), entry.path).toEqual(model.parts.map((_, i) => String(i + 1).padStart(2, '0')));
    }
  });

  it('every listed todo is under todos/ with a Became or Related relation', () => {
    for (const entry of entries) {
      for (const todo of entry.context?.todos ?? []) {
        expect(todo.path.startsWith('.planning/todos/'), `${entry.path} -> ${todo.path}`).toBe(true);
        expect(['became', 'related']).toContain(todo.relation);
      }
    }
  });

  it('a promoted: true note with no todo shows the untraced state', () => {
    for (const entry of entries) {
      if (entry.model === null || (entry.context?.todos.length ?? 0) > 0) continue;
      const promoted = entry.model.shape === 'quick' && entry.model.rail.stats.some((stat) => stat.label === 'Promoted' && stat.value === 'Yes');
      if (promoted) {
        expect(entry.model.empty?.kicker, entry.path).toBe('Promoted, but untraced');
        expect(entry.model.rail.stage.text, entry.path).toBe('Untraced');
      }
    }
  });

  it('every note has a stage chip, a big number and a stat list; every explore note a section ledger', () => {
    for (const entry of entries.filter((candidate) => candidate.model !== null)) {
      const model = entry.model as ComposedNotePage;
      expect(model.rail.stage.text, entry.path).not.toBe('');
      expect(model.rail.big.value, entry.path).toMatch(/^\d+$/);
      expect(model.rail.stats.length, entry.path).toBeGreaterThanOrEqual(2);
      if (model.shape === 'document') expect(model.ledger?.title, entry.path).toBe('Section by section');
    }
  });

  it('every note renders one h1 and no corner radius or raw html', () => {
    for (const entry of entries.filter((candidate) => candidate.model !== null)) {
      expect(entry.markup.split('<h1').length - 1, entry.path).toBe(1);
      expect(entry.markup, entry.path).not.toContain('border-radius');
    }
  });
});

describe('the sketch notes keep the sketch values', () => {
  const labelsOf = (key: keyof typeof NOTE_FILES): (string | null)[] => (find(key).model?.rows ?? []).map((row) => row.label);
  const titleOf = (key: keyof typeof NOTE_FILES): string | null | undefined => find(key).model?.rail.title;

  it('row labels, in reading order', () => {
    expect(labelsOf('dcrop')).toEqual(['Today', 'Decided · 21 Oct 2026', 'How', 'Preset constraint', 'Estimated', 'Batch']);
    expect(labelsOf('dround')).toEqual(['Today', 'Want', 'Decided · 21 Oct 2026', 'Batch']);
    expect(labelsOf('dsfx')).toEqual(['Decided', 'Decided', 'Suggested', 'Limits']);
    expect(labelsOf('dcall')).toEqual(['Observed', 'Want', 'Off limits', 'Output']);
    expect(labelsOf('dback')).toEqual(['Cause', 'Fix']);
    expect(labelsOf('pcap')).toEqual(['Today', 'Wanted', 'Known gap']);
    expect(labelsOf('star')).toEqual([]);
    expect(labelsOf('sundo')).toEqual([]);
    expect(labelsOf('lsk')).toEqual([null, 'Want', 'Open question', 'Open question', 'Today', 'Suggested interim']);
  });

  it('titles from the file names, the big numbers and the stages', () => {
    expect(titleOf('dcrop')).toBe('Crop images and profile photos');
    expect(titleOf('dround')).toBe('Round profile photos');
    expect(titleOf('dsfx')).toBe('Sound effects');
    expect(titleOf('dcall')).toBe('Call debug logging webrtc turn');
    expect(titleOf('dback')).toBe('Back button closes app');
    expect(titleOf('pcap')).toBe('Raise single file download cap');
    expect(titleOf('star')).toBe('Tariff note tooltips');
    expect(titleOf('sundo')).toBe('Brokers want undo');
    expect(titleOf('lsk')).toBe('Sketches page in labelore');
    const big = (key: keyof typeof NOTE_FILES): string | undefined => find(key).model?.rail.big.value;
    expect(['dcrop', 'dround', 'dsfx', 'dcall', 'dback', 'pcap', 'star', 'sundo', 'lsk'].map((key) => big(key as keyof typeof NOTE_FILES))).toEqual([
      '6', '4', '4', '4', '2', '3', '1', '1', '6',
    ]);
    const stage = (key: keyof typeof NOTE_FILES): string | undefined => find(key).model?.rail.stage.text;
    expect(['dcrop', 'dround', 'dsfx', 'dcall', 'dback', 'pcap', 'star', 'sundo', 'lsk'].map((key) => stage(key as keyof typeof NOTE_FILES))).toEqual([
      'Shipped', 'Shipped', 'Shipped', 'Shipped', 'Untraced', 'Untraced', 'Todo open', 'Still a note', 'Todo open',
    ]);
  });

  it('mentions and the stats rows', () => {
    expect(find('pcap').model?.mentions.map((m) => m.path)).toEqual(['backend/src/config.rs:121', 'download/mod.rs:75']);
    expect(find('dround').model?.mentions.map((m) => m.path)).toEqual(['web/public/sw.js', 'server/src/media/image.ts']);
    expect(find('lsk').model?.mentions.map((m) => m.path)).toEqual(['sketches/MANIFEST.md', 'README.md', 'data.js']);
    const promoted = (key: keyof typeof NOTE_FILES) => find(key).model?.rail.stats.find((stat) => stat.label === 'Promoted');
    expect(promoted('sundo')).toMatchObject({ value: 'No', tone: 'missing' });
    expect(promoted('dback')).toMatchObject({ value: 'Yes', tone: null });
    expect(find('dback').model?.rail.stats.some((stat) => stat.label === 'Todo')).toBe(false);
    expect(find('dsfx').model?.rail.stats.find((stat) => stat.label === 'Todo')).toMatchObject({ value: 'Done', tone: 'complete' });
  });

  it('explore notes: sections, stage chips, big numbers and no rows', () => {
    expect(find('pbrief').model?.parts).toHaveLength(3);
    expect(find('lperkind').model?.parts).toHaveLength(5);
    expect(find('lsurvey').model?.parts).toHaveLength(6);
    expect([find('pbrief'), find('lperkind'), find('lsurvey')].map((entry) => entry.model?.rail.big.value)).toEqual(['7', '3', '8']);
    expect([find('pbrief'), find('lperkind'), find('lsurvey')].map((entry) => entry.model?.rail.stage.text)).toEqual(['3 sections', '5 sections', '6 sections']);
    expect(find('lperkind').model?.gist.text).toContain('Dashboard, Roadmap and Traceability');
    expect(find('lperkind').model?.gist.long).toBe(true);
  });

  it('the cards: Became or Related, counts and the untraced states', () => {
    const kickers = (key: keyof typeof NOTE_FILES): string[] => (find(key).model?.todos ?? []).map((card) => card.kicker);
    expect(kickers('dcrop')).toEqual(['Became a todo']);
    expect(kickers('dround')).toEqual(['Became a todo']);
    expect(kickers('dsfx')).toEqual(['Became a todo']);
    expect(kickers('dcall')).toEqual(['Became a todo']);
    expect(kickers('star')).toEqual(['Became a todo']);
    expect(kickers('lsk')).toEqual(['Became a todo']);
    expect(kickers('pbrief')).toEqual(['Related todo', 'Related todo']);
    expect(kickers('lperkind')).toEqual(['Related todo']);
    for (const key of ['dback', 'pcap'] as const) expect(find(key).model?.empty?.kicker).toBe('Promoted, but untraced');
    expect(find('sundo').model?.empty?.kicker).toBe('Still a note');
    expect(find('lsurvey').model?.empty).toEqual({ kicker: 'No todo points here', text: 'No todo names or mentions this note.' });
  });
});

describe('the TODO page and the NOTE page agree', () => {
  let project: LoadedProject;
  beforeAll(async () => {
    project = await loadCombined();
  });

  it('for every todo, the notes the TODO page lists equal the notes whose context lists that todo', () => {
    const todos = project.presentation.artifacts.filter((artifact) => artifact.path.startsWith('.planning/todos/') && artifact.kind === 'todo');
    const notes = project.presentation.artifacts.filter((artifact) => artifact.path.startsWith('.planning/notes/') && artifact.kind === 'note');
    expect(todos.length).toBeGreaterThanOrEqual(10);
    expect(notes.length).toBeGreaterThanOrEqual(12);
    const noteSide = new Map<string, Set<string>>();
    for (const note of notes) {
      const { todos: listed } = buildNoteContext(project.presentation, project.registry, project.bodyOf, note.path);
      for (const todo of listed) {
        if (!noteSide.has(todo.path)) noteSide.set(todo.path, new Set());
        noteSide.get(todo.path)?.add(note.path);
      }
    }
    let linked = 0;
    for (const todo of todos) {
      const context = buildTodoContext(project.presentation, project.registry, project.bodyOf, todo.path);
      const todoSide = new Set(context.notes.filter((note) => note.exists).map((note) => note.path));
      linked += todoSide.size;
      expect([...(noteSide.get(todo.path) ?? [])].sort(), todo.path).toEqual([...todoSide].sort());
    }
    expect(linked).toBeGreaterThanOrEqual(8);
  });

  it('the way each side reads a link agrees too (Became is promoted or listed)', () => {
    const dcrop = buildNoteContext(project.presentation, project.registry, project.bodyOf, NOTE_FILES.dcrop).todos[0];
    const side = buildTodoContext(project.presentation, project.registry, project.bodyOf, dcrop.path).notes.find((note) => note.path === NOTE_FILES.dcrop);
    expect(side?.via).toBe('listed');
    expect(dcrop.via).toBe('frontmatter');
    const lsk = buildNoteContext(project.presentation, project.registry, project.bodyOf, NOTE_FILES.lsk).todos[0];
    const lskSide = buildTodoContext(project.presentation, project.registry, project.bodyOf, lsk.path).notes.find((note) => note.path === NOTE_FILES.lsk);
    expect(lskSide?.via).toBe('promoted');
    expect(lsk.via).toBe('promoted');
  });
});
