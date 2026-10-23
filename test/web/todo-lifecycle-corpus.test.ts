// quick-261023-61k (QCORP): real-corpus guards over every todo on this machine - labelore's own
// `.planning/todos/`, the dashboard's synthetic fixture, the three committed fixture projects and each
// sibling project that has a todos folder (resoundant today) - built through the real repository load so
// each file reaches the handler with the ref discovery gives it, with the server's todo context built by
// buildTodoContext. These are live projects, so the test asserts invariants for every file and pins values
// only for the files named in the sketch (plus labelore's 001 and resoundant's two, when present), using
// the numbers from the sketch's rendering and data - never the composer's output.
process.env.TZ = 'Asia/Kolkata';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildTodoContext } from '../../src/presentation/todo-context.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composeTodoLifecycle } from '../../src/web/views/todo-lifecycle.ts';
import type { ComposedTodoLifecycle } from '../../src/web/views/todo-lifecycle.ts';
import { TodoLifecycleView } from '../../src/web/views/todo-lifecycle-components.tsx';
import {
  FIXTURE_ROOTS,
  LB_ROOT,
  NOTE_KEYS,
  RESOUNDANT_ROOT,
  TODO_KEYS,
  TODO_SIBLING_ROOTS,
  loadProject,
  readKeyed,
  sketchNoteRaw,
} from '../helpers/todo-corpus.ts';
import type { LoadedProject } from '../helpers/todo-corpus.ts';

const KOLKATA = { now: new Date('2026-10-23T12:00:00+05:30'), timeZone: 'Asia/Kolkata' };
const ROOTS = [LB_ROOT, ...FIXTURE_ROOTS, ...TODO_SIBLING_ROOTS];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out.sort();
}

function wire<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface Entry {
  label: string;
  root: string;
  path: string;
  kind: string;
  hasStructured: boolean;
  frontmatterKeys: number;
  model: ComposedTodoLifecycle | null;
  markup: string;
  noteUrlsMatch: boolean;
  project: LoadedProject;
}

const entries: Entry[] = [];
const noteKinds: { label: string; kind: string }[] = [];
let expectedCount = 0;

function renderModel(model: ComposedTodoLifecycle): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(TodoLifecycleView, {
        model,
        fallbackTitle: 'Todo',
        path: '.planning/todos/x.md',
        mode: 'view',
        onModeChange: () => undefined,
        onShowSource: () => undefined,
        chip: null,
      }),
    ),
  );
}

beforeAll(async () => {
  for (const root of ROOTS) {
    const project = await loadProject(root);
    for (const abs of walk(join(root, '.planning', 'todos'))) {
      if (!abs.endsWith('.md')) continue;
      expectedCount += 1;
      const rel = abs.slice(root.length + 1);
      const artifact = project.presentation.artifacts.find((candidate) => candidate.path === rel);
      const label = `${root}:${rel}`;
      if (!artifact) {
        entries.push({ label, root, path: rel, kind: 'missing', hasStructured: false, frontmatterKeys: 0, model: null, markup: '', noteUrlsMatch: false, project });
        continue;
      }
      const todoContext = wire(buildTodoContext(project.presentation, project.registry, project.bodyOf, rel));
      const input: ViewInput = {
        kind: artifact.kind,
        frontmatter: wire(artifact.frontmatter),
        structured: wire(artifact.structured),
        groups: [],
        planSegments: [],
        headings: [],
        todoContext,
      };
      const model = composeTodoLifecycle(input, KOLKATA);
      const noteUrlsMatch = todoContext.notes.every((note) => {
        if (!note.exists) return note.url === null;
        const dto = project.presentation.artifacts.find((candidate) => candidate.path === note.path);
        return dto !== undefined && note.url === dto.key;
      });
      entries.push({
        label,
        root,
        path: rel,
        kind: artifact.kind,
        hasStructured: typeof (artifact.structured as Record<string, unknown>).todo === 'object',
        frontmatterKeys: Object.keys(artifact.frontmatter ?? {}).length,
        model,
        markup: model ? renderModel(model) : '',
        noteUrlsMatch,
        project,
      });
    }
    for (const abs of walk(join(root, '.planning', 'notes'))) {
      if (!abs.endsWith('.md')) continue;
      const rel = abs.slice(root.length + 1);
      noteKinds.push({ label: `${root}:${rel}`, kind: project.presentation.artifacts.find((candidate) => candidate.path === rel)?.kind ?? 'missing' });
    }
  }
});

describe('the corpus', () => {
  it('reads every todo file, and at least eleven of them', () => {
    expect(entries.length).toBe(expectedCount);
    expect(entries.length).toBeGreaterThanOrEqual(11);
    process.stdout.write(`todo corpus: ${entries.length} todos across ${ROOTS.length} projects\n`);
  });

  it('gives every todo the todo kind and a projection, and composes it', () => {
    for (const entry of entries) {
      expect(entry.kind, entry.label).toBe('todo');
      expect(entry.hasStructured, entry.label).toBe(true);
      expect(entry.model, entry.label).not.toBeNull();
      expect(entry.markup.length, entry.label).toBeGreaterThan(0);
    }
  });

  it('agrees the status with the folder', () => {
    for (const entry of entries) {
      const folder = entry.path.split('/')[2];
      const want = folder === 'pending' ? 'Pending' : folder === 'completed' || folder === 'done' ? 'Done' : 'Unfiled';
      expect(entry.model!.chips.status.label, entry.label).toBe(want);
    }
  });

  it('keeps the strip and the stage numbers in order', () => {
    for (const entry of entries) {
      const model = entry.model!;
      const keys = model.steps.map((step) => step.key);
      expect(keys.slice(0, 2), entry.label).toEqual(['noted', 'captured']);
      expect(['closed', 'now'], entry.label).toContain(keys[2]);
      const numbers = [model.noted?.number, model.captured.number, model.end.number].filter((n): n is number => n !== undefined);
      expect(numbers, entry.label).toEqual(numbers.map((_, index) => index + 1));
      expect(model.end.kind === 'closed' ? 'closed' : 'now', entry.label).toBe(keys[2]);
    }
  });

  it('links notes only under .planning/notes/, to the note pages that exist', () => {
    for (const entry of entries) {
      for (const note of entry.model!.noted?.notes ?? []) {
        expect(note.path.startsWith('.planning/notes/'), entry.label).toBe(true);
        if (note.url !== null) expect(note.url.startsWith('/artifacts/'), entry.label).toBe(true);
      }
      expect(entry.noteUrlsMatch, entry.label).toBe(true);
    }
  });

  it('keeps counts and rows honest', () => {
    for (const entry of entries) {
      const model = entry.model!;
      if (model.captured.plan?.checks) expect(model.captured.plan.checks.done, entry.label).toBeLessThanOrEqual(model.captured.plan.checks.total);
      for (const file of model.captured.files?.rows ?? []) expect(file.name, entry.label).not.toBe('');
      expect(model.also.length > 0, entry.label).toBe(entry.frontmatterKeys > 0);
      expect(model.also.every((item) => item.label === 'Frontmatter' && item.targetId === null), entry.label).toBe(true);
      expect(entry.markup.match(/<h1/g), entry.label).toHaveLength(1);
    }
  });

  it('never gives a notes file the todo kind', () => {
    expect(noteKinds.length).toBeGreaterThan(0);
    for (const note of noteKinds) expect(note.kind, note.label).not.toBe('todo');
  });

  it('keeps every note fixture byte-equal to the sketch', () => {
    for (const key of Object.keys(NOTE_KEYS)) {
      const file = NOTE_KEYS[key];
      expect(readFileSync(join(file.root, file.path), 'utf8'), key).toBe(sketchNoteRaw(key));
    }
  });
});

function entryOf(file: { root: string; path: string }): Entry {
  const found = entries.find((entry) => entry.root === file.root && entry.path === file.path);
  if (!found) throw new Error(`no entry for ${file.path}`);
  return found;
}

describe('the sketch todos on the real pipeline', () => {
  it('reads each of the eleven from its fixture file', () => {
    for (const key of Object.keys(TODO_KEYS)) {
      expect(readKeyed(TODO_KEYS[key]).length, key).toBeGreaterThan(0);
      expect(entryOf(TODO_KEYS[key]).model, key).not.toBeNull();
    }
  });

  it('pins the headline of each', () => {
    const want: Record<string, [string, string, string]> = {
      dcrop: ['Done', 'Minor · priority low', 'Closed'],
      dsfx: ['Done', 'Cosmetic', 'Closed'],
      dcall: ['Done', 'Major', 'Closed'],
      sretry: ['Pending', 'Major', 'Open 11 days.'],
      srec: ['Pending', 'Minor', 'Open 8 days.'],
      star: ['Pending', 'P2', 'Open 7 days.'],
      sport: ['Done', 'Minor', 'Closed'],
      pcheck: ['Pending', 'High', 'Open less than a day.'],
      pdev: ['Done', 'Medium', 'Closed'],
      lfig: ['Pending', 'Medium', 'Open 24 days.'],
      ldrift: ['Done', 'Medium', 'Closed'],
    };
    for (const [key, [status, weight, end]] of Object.entries(want)) {
      const model = entryOf(TODO_KEYS[key]).model!;
      expect(model.chips.status.label, key).toBe(status);
      expect(model.chips.weight.text, key).toBe(weight);
      expect(model.end.kind === 'closed' ? model.end.title : model.end.kind === 'open' ? model.end.lead : '', key).toBe(end);
    }
  });
});

const LB001 = { root: LB_ROOT, path: '.planning/todos/pending/001-sketches-page-in-labelore.md' };
describe("labelore's own promoted todo (001)", () => {
  it.runIf(existsSync(join(LB001.root, LB001.path)))('reads as promoted from its note, with the acceptance list and the open sections', () => {
    const model = entryOf(LB001).model!;
    expect(model.chips.status).toEqual({ label: 'Pending', tone: 'in-flight' });
    expect(model.chips.weight).toMatchObject({ text: 'P2', level: 'medium' });
    expect(model.chips.area).toBe('general');
    expect(model.steps[0]).toMatchObject({ value: '23 Oct 03:11', sub: '1 note' });
    const card = model.noted!.notes[0];
    expect(card).toMatchObject({
      path: '.planning/notes/2026-10-23-sketches-page-in-labelore.md',
      kicker: 'Note · 23 Oct 03:11',
      way: 'Promoted word for word',
    });
    expect(model.captured.kicker).toBe('23 Oct · promoted from /gsd-note');
    expect(model.captured.lead?.label).toBe('Goal');
    expect(model.captured.plan?.label).toMatch(/^Done when · \d+ of \d+$/);
    expect(model.captured.extras.map((extra) => extra.heading)).toEqual(['Context', 'Progress']);
    expect(model.end).toMatchObject({ kind: 'open', lead: 'Open less than a day.' });
    expect(model.end.kind === 'open' && model.end.rest).toMatch(/^Nothing has closed it yet — \d+ of \d+ items checked\.$/);
  });
});

const RS1 = { root: RESOUNDANT_ROOT, path: '.planning/todos/pending/download-failures-not-reported-to-hub.md' };
const RS2 = { root: RESOUNDANT_ROOT, path: '.planning/todos/pending/hub-cstore-retention-and-authorization.md' };
describe("resoundant's two pending todos", () => {
  it.runIf(existsSync(join(RS1.root, RS1.path)))('rs1: pending, high, from the tarball design note, four folds', () => {
    const model = entryOf(RS1).model!;
    expect(model.chips.status.label).toBe('Pending');
    expect(model.chips.weight).toMatchObject({ text: 'High', level: 'high' });
    expect(model.head.created).toBe('3 Sep 2026');
    expect(model.noted!.notes.map((note) => [note.path, note.way])).toEqual([['.planning/notes/tarball-hash-verification-design.md', 'Linked in the text']]);
    expect(model.captured.extras.map((extra) => extra.heading)).toEqual([
      'What happens today',
      'The dead reporting channel',
      'Why it matters more now',
      'Options considered',
    ]);
  });

  it.runIf(existsSync(join(RS2.root, RS2.path)))('rs2: a link to a todo stays plain text and adds no note', () => {
    const entry = entryOf(RS2);
    const model = entry.model!;
    expect(model.chips.weight).toMatchObject({ text: 'High', level: 'high' });
    expect(model.head.created).toBe('3 Sep 2026');
    expect(model.noted!.notes.map((note) => note.path)).toEqual(['.planning/notes/tarball-hash-verification-design.md']);
    expect(model.captured.extras.map((extra) => extra.heading)).toEqual([
      'Details',
      '1. Uploaded tarballs are never deleted',
      '2. The endpoint authenticates but does not authorize',
    ]);
    expect(model.refs.map((ref) => ref.slug)).toEqual(['tarball-hash-verification-design']);
    expect(entry.markup).toContain('download-failures-not-reported-to-hub');
    expect(entry.markup).not.toMatch(/<a [^>]*>download-failures-not-reported-to-hub<\/a>/);
  });
});
