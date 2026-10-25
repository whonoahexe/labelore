// quick-261023-61l (sketch 028 A): the NOTE page's server join. buildNoteContext lists the todos a note
// became or is related to - status from the folder, weight, area, title, resolution excerpt, in-app URL
// and the notes batched into the same todo - from the cached presentation alone, through the relation the
// TODO page shares. Pinned values come from the sketch's gen-data parse of its own data (independent of
// this module); the fixtures are the committed fixture project, the synthetic fixture and labelore's own
// notes and todos loaded as one in-memory project.
import { beforeAll, describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildNoteContext, resolutionOf } from '../../src/presentation/note-context.ts';
import type { NoteContext } from '../../src/presentation/note-context.ts';
import { buildReferenceRegistry } from '../../src/presentation/references.ts';
import { createApp } from '../../src/server/index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { NOTE_FILES, combinedFiles, loadCombined } from '../helpers/note-corpus.ts';
import type { LoadedProject } from '../helpers/todo-corpus.ts';

let project: LoadedProject;
beforeAll(async () => {
  project = await loadCombined();
});

const contextOf = (key: keyof typeof NOTE_FILES): NoteContext =>
  buildNoteContext(project.presentation, project.registry, project.bodyOf, NOTE_FILES[key]);

const TODO = '.planning/todos/';

describe('the notes that became a todo', () => {
  it('dcrop: named in notes: - Became, done, minor / low, media, with dround batched in', () => {
    const { todos } = contextOf('dcrop');
    expect(todos).toHaveLength(1);
    const todo = todos[0];
    expect(todo.path).toBe(`${TODO}completed/2026-10-21-add-crop-and-round-profile-photos.md`);
    expect(todo).toMatchObject({
      relation: 'became',
      via: 'frontmatter',
      status: 'done',
      weight: 'minor',
      weightKind: 'severity',
      level: 'low',
      area: 'media',
      title: 'Add crop and round profile photos',
    });
    expect(todo.resolution?.startsWith('Done in quick task 261022-m25 (2026-10-22). What shipped: · A hand-written cropper')).toBe(true);
    expect(todo.url).toEqual(expect.any(String));
    expect(todo.batchedWith).toHaveLength(1);
    expect(todo.batchedWith[0]).toMatchObject({ path: NOTE_FILES.dround, date: '2026-10-21 15:58' });
    expect(todo.batchedWith[0].text.startsWith('Round profile photos everywhere, including the notification icon.')).toBe(true);
    expect(todo.batchedWith[0].text.length).toBeLessThanOrEqual(111);
    expect(todo.batchedWith[0].url).toEqual(expect.any(String));
  });

  it('dround: the same todo with dcrop batched in', () => {
    const { todos } = contextOf('dround');
    expect(todos.map((todo) => todo.path)).toEqual([`${TODO}completed/2026-10-21-add-crop-and-round-profile-photos.md`]);
    expect(todos[0].batchedWith.map((row) => row.path)).toEqual([NOTE_FILES.dcrop]);
    expect(todos[0].batchedWith[0].text.startsWith('Crop for images before sending and for profile photos (she asked for it).')).toBe(true);
  });

  it('dsfx: cosmetic / low, ui, nothing batched', () => {
    const { todos } = contextOf('dsfx');
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      path: `${TODO}completed/2026-10-20-sound-effects.md`,
      relation: 'became',
      via: 'frontmatter',
      status: 'done',
      weight: 'cosmetic',
      level: 'low',
      area: 'ui',
      title: 'Add synthesised sound effects',
      batchedWith: [],
    });
    expect(todos[0].resolution?.startsWith('Done in quick task 261022-4gf. Per the user, there is no Sounds on/off switch')).toBe(true);
  });

  it('dcall: major / high, calls, no resolution', () => {
    const { todos } = contextOf('dcall');
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      path: `${TODO}completed/2026-10-20-call-debug-logging.md`,
      weight: 'major',
      level: 'high',
      area: 'calls',
      title: 'Add call debug logging (WebRTC + TURN, no personal data)',
      resolution: null,
    });
  });

  it('star and lsk: promoted word for word - Became, P2 / medium, general; star pending, lsk done', () => {
    const star = contextOf('star').todos;
    expect(star).toHaveLength(1);
    expect(star[0]).toMatchObject({
      path: `${TODO}pending/004-tariff-note-tooltips.md`,
      relation: 'became',
      via: 'promoted',
      status: 'pending',
      weight: 'P2',
      weightKind: 'priority',
      level: 'medium',
      area: 'general',
      title: "show the tariff schedule's own notes as tooltips on HS codes",
      resolution: null,
      batchedWith: [],
    });
    const lsk = contextOf('lsk').todos;
    expect(lsk).toHaveLength(1);
    // The todo also mentions the note; promoted wins.
    expect(lsk[0]).toMatchObject({
      path: `${TODO}completed/001-sketches-page-in-labelore.md`,
      relation: 'became',
      via: 'promoted',
      status: 'done',
      weight: 'P2',
      level: 'medium',
      area: 'general',
      title: 'Show sketches inside Labelore instead of a separate file server',
    });
  });
});

describe('related todos and the notes with none', () => {
  it('pbrief: two Related todos in path order, both mentioned', () => {
    const { todos } = contextOf('pbrief');
    expect(todos.map((todo) => todo.path)).toEqual([
      `${TODO}completed/portal-detect-vanished-tier-device.md`,
      `${TODO}pending/pre-milestone-hardware-and-tier-cleanup.md`,
    ]);
    expect(todos.map((todo) => [todo.relation, todo.via, todo.status, todo.weight, todo.level, todo.area])).toEqual([
      ['related', 'mentioned', 'done', 'medium', 'medium', null],
      ['related', 'mentioned', 'pending', 'high', 'high', null],
    ]);
    expect(todos.map((todo) => todo.title)).toEqual([
      "Portal should detect when a tier's device has vanished under its mount",
      'Pre-milestone: fix server Ethernet, fsck vault, clean up tiers',
    ]);
    expect(todos.every((todo) => todo.resolution === null || typeof todo.resolution === 'string')).toBe(true);
  });

  it('lperkind: one Related todo through a wiki link', () => {
    const { todos } = contextOf('lperkind');
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      path: `${TODO}done/artifact-chrome-drift.md`,
      relation: 'related',
      via: 'wiki link',
      status: 'done',
      weight: 'medium',
      level: 'medium',
      area: null,
      title: 'Fix document-page chrome drift and the loading→loaded container reflow',
      resolution: null,
    });
  });

  it('dback, pcap, sundo and lsurvey have no todo', () => {
    for (const key of ['dback', 'pcap', 'sundo', 'lsurvey'] as const) expect(contextOf(key).todos).toEqual([]);
  });

  it('a path that is not a note, or is missing, gives nothing and never throws', () => {
    const empty = { todos: [] };
    const call = (path: string) => buildNoteContext(project.presentation, project.registry, project.bodyOf, path);
    expect(call('.planning/todos/pending/004-tariff-note-tooltips.md')).toEqual(empty);
    expect(call('.planning/notes/missing.md')).toEqual(empty);
    expect(call('')).toEqual(empty);
    expect(buildNoteContext(null as unknown as ProjectPresentation, project.registry, project.bodyOf, NOTE_FILES.dcrop)).toEqual(empty);
    expect(buildNoteContext(project.presentation, project.registry, () => { throw new Error('x'); }, NOTE_FILES.dcrop)).toBeDefined();
  });
});

describe('relation edge cases (in-memory project)', () => {
  async function loadFilesOf(files: Record<string, string>) {
    const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/p').load();
    const presentation = toProjectPresentation(snapshot);
    const registry = buildReferenceRegistry(presentation);
    return (notePath: string) => buildNoteContext(presentation, registry, () => null, notePath);
  }

  const note = (body = 'A note.') => `---\ndate: "2026-10-01 10:00"\n---\n\n${body}\n`;

  it('a todo naming a note in notes: and linking it as [[slug]] reads Became', async () => {
    const of = await loadFilesOf({
      '.planning/notes/a.md': note(),
      '.planning/todos/pending/t.md': '---\ntitle: T\nnotes:\n  - .planning/notes/a.md\n---\n\n## Problem\n\nSee [[a]].\n',
    });
    expect(of('.planning/notes/a.md').todos.map((todo) => [todo.relation, todo.via])).toEqual([['became', 'frontmatter']]);
  });

  it('a [[slug]] with no such note links nothing; a notes: entry for a missing note adds no batched row', async () => {
    const of = await loadFilesOf({
      '.planning/notes/a.md': note(),
      '.planning/todos/pending/t.md':
        '---\ntitle: T\nnotes:\n  - .planning/notes/a.md\n  - .planning/notes/ghost.md\n---\n\n[[nothing-here]]\n',
    });
    const { todos } = of('.planning/notes/a.md');
    expect(todos).toHaveLength(1);
    expect(todos[0].batchedWith).toEqual([]);
    expect(of('.planning/notes/ghost.md').todos).toEqual([]);
  });

  it('junk frontmatter never throws', async () => {
    const of = await loadFilesOf({
      '.planning/notes/a.md': note(),
      '.planning/todos/pending/n.md': '---\ntitle: 12\nseverity: [1, 2]\narea: null\nnotes: 7\n---\n\nbody\n',
      '.planning/todos/pending/m.md': '---\nnotes: {a: 1}\npriority: 3\ntheme: [x]\n---\n\n[[a]]\n',
      '.planning/todos/odd/z.md': '---\nnotes:\n  - null\n  - 5\n---\n\nnotes/a.md\n',
    });
    const { todos } = of('.planning/notes/a.md');
    expect(todos.length).toBeGreaterThan(0);
    for (const todo of todos) expect(typeof todo.title).toBe('string');
    const odd = todos.find((todo) => todo.path.includes('/odd/'));
    expect(odd?.status).toBe('unfiled');
  });
});

describe('resolutionOf', () => {
  it('joins list items with a middle dot and folds newlines', () => {
    expect(resolutionOf('## Resolution\n\nDone.\nWhat shipped:\n\n- one\n- two\n\n## Next\n\nx')).toBe('Done. What shipped: · one · two');
  });
  it('is null without a Resolution section or when it is empty', () => {
    expect(resolutionOf('## Problem\n\nx')).toBeNull();
    expect(resolutionOf('## Resolution\n\n\n## Other\n')).toBeNull();
  });
  it('cuts at 600 characters on a word boundary with an ellipsis', () => {
    const cut = resolutionOf(`## Resolution\n\n${'word '.repeat(300)}`);
    expect(cut?.endsWith('…')).toBe(true);
    expect((cut ?? '').length).toBeLessThanOrEqual(601);
  });
});

describe('served end to end', () => {
  type DocumentPayload = { artifact: { path: string }; noteContext?: NoteContext | null };
  it('/api/documents carries noteContext for a note and null for a todo', async () => {
    const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(combinedFiles()), '/project').load();
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    const documentOf = async (path: string): Promise<DocumentPayload> => {
      const dto = presentation.artifacts.find((artifact) => artifact.path === path);
      if (!dto) throw new Error(`no artifact ${path}`);
      return (await (await app.request(`/api/documents?route=${encodeURIComponent(dto.key)}`)).json()) as DocumentPayload;
    };
    const served = await documentOf(NOTE_FILES.dcrop);
    expect(served.noteContext?.todos.map((todo) => todo.path)).toEqual([`${TODO}completed/2026-10-21-add-crop-and-round-profile-photos.md`]);
    expect(served.noteContext).toEqual(JSON.parse(JSON.stringify(contextOf('dcrop'))));
    expect((await documentOf(`${TODO}completed/2026-10-21-add-crop-and-round-profile-photos.md`)).noteContext).toBeNull();
    expect((await documentOf(NOTE_FILES.sundo)).noteContext).toEqual({ todos: [] });
  });
});
