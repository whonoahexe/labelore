// quick-261023-61k: the one todo<->note relation and the TODO page's server join. The relation facts come
// from the fixture files (what each todo's notes are, and which todos each note became), checked in
// both directions over the committed fixture projects; precedence, existence and junk cases run on small
// in-memory projects; the 500 x 500 case checks the build grows linearly.
import { describe, expect, it } from 'vitest';
import { buildTodoContext } from '../../src/presentation/todo-context.ts';
import { buildTodoNoteIndex, collapseSpace, isNoteArtifactPath, isTodoArtifactPath } from '../../src/presentation/todo-notes.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { LABELORE_FIXTURE_ROOT, NOTE_KEYS, SYNTHETIC_ROOT, TODO_KEYS, loadFiles, loadProject, planningFiles } from '../helpers/todo-corpus.ts';

const T = (key: string): string => TODO_KEYS[key].path;
const N = (key: string): string => NOTE_KEYS[key].path;

function todoFile(extra: string, body = ''): string {
  return `---\ntitle: A todo\n${extra}---\n\n${body}`;
}

function noteFile(body: string, extra = ''): string {
  return `---\ndate: "2026-10-01 10:00"\n${extra}---\n\n${body}\n`;
}

describe('path predicates', () => {
  it('recognise todos and notes by position', () => {
    expect(isTodoArtifactPath('.planning/todos/pending/a.md')).toBe(true);
    expect(isTodoArtifactPath('.planning/todos/pending/a.txt')).toBe(false);
    expect(isTodoArtifactPath('.planning/notes/a.md')).toBe(false);
    expect(isNoteArtifactPath('.planning/notes/sub/a.md')).toBe(true);
    expect(isNoteArtifactPath('.planning/todos/a.md')).toBe(false);
    expect(collapseSpace('  a \n\t b  c  ')).toBe('a b c');
  });
});

describe('the relation over the fixture projects', () => {
  it('lendshed: each todo comes from the notes it lists; the back-button note became nothing', async () => {
    const { presentation, bodyOf } = await loadProject(FX_ROOT);
    const index = buildTodoNoteIndex(presentation, bodyOf);
    expect(index.notesOf(T('dcrop'))).toEqual([
      { notePath: N('dcrop'), via: 'listed', exists: true },
      { notePath: N('dround'), via: 'listed', exists: true },
    ]);
    expect(index.notesOf(T('dsfx'))).toEqual([{ notePath: N('dsfx'), via: 'listed', exists: true }]);
    expect(index.notesOf(T('dcall'))).toEqual([{ notePath: N('dcall'), via: 'listed', exists: true }]);
    expect(index.todosOf(N('dcrop'))).toEqual([{ todoPath: T('dcrop'), via: 'listed' }]);
    expect(index.todosOf(N('dround'))).toEqual([{ todoPath: T('dcrop'), via: 'listed' }]);
    expect(index.todosOf(N('dback'))).toEqual([]);
  });

  it('lendshed: two todos mention the brief, completed before pending; the export-cap note became nothing', async () => {
    const { presentation, bodyOf } = await loadProject(FX_ROOT);
    const index = buildTodoNoteIndex(presentation, bodyOf);
    expect(index.notesOf(T('pcheck'))).toEqual([{ notePath: N('pbrief'), via: 'mentioned', exists: true }]);
    expect(index.notesOf(T('pdev'))).toEqual([{ notePath: N('pbrief'), via: 'mentioned', exists: true }]);
    expect(index.todosOf(N('pbrief'))).toEqual([
      { todoPath: T('pdev'), via: 'mentioned' },
      { todoPath: T('pcheck'), via: 'mentioned' },
    ]);
    expect(index.todosOf(N('pcap'))).toEqual([]);
  });

  it('synthetic: the tariff todo was promoted from its note; the undo note became nothing', async () => {
    const { presentation, bodyOf } = await loadProject(SYNTHETIC_ROOT);
    const index = buildTodoNoteIndex(presentation, bodyOf);
    expect(index.notesOf(T('star'))).toEqual([{ notePath: N('star'), via: 'promoted', exists: true }]);
    expect(index.todosOf(N('star'))).toEqual([{ todoPath: T('star'), via: 'promoted' }]);
    expect(index.todosOf(N('sundo'))).toEqual([]);
    for (const key of ['sretry', 'srec', 'sport']) expect(index.notesOf(T(key))).toEqual([]);
  });

  it('labelore: the chrome-drift todo links its note with a wiki link', async () => {
    const { presentation, bodyOf } = await loadProject(LABELORE_FIXTURE_ROOT);
    const index = buildTodoNoteIndex(presentation, bodyOf);
    expect(index.notesOf(T('ldrift'))).toEqual([{ notePath: N('lperkind'), via: 'wiki', exists: true }]);
    expect(index.todosOf(N('lperkind'))).toEqual([{ todoPath: T('ldrift'), via: 'wiki' }]);
    expect(index.notesOf(T('lfig'))).toEqual([]);
  });

  it('answers nothing for a path that is neither a todo nor a note', async () => {
    const { presentation, bodyOf } = await loadProject(FX_ROOT);
    const index = buildTodoNoteIndex(presentation, bodyOf);
    expect(index.notesOf('.planning/STATE.md')).toEqual([]);
    expect(index.todosOf('.planning/todos/completed/2026-03-23-checkout-sound-cues.md')).toEqual([]);
  });
});

describe('precedence, order and existence', () => {
  const NOTES = {
    '.planning/notes/a.md': noteFile('Alpha text.'),
    '.planning/notes/b.md': noteFile('Beta text.'),
    '.planning/notes/c.md': noteFile('Gamma text.'),
    '.planning/notes/d.md': noteFile('Delta   text\nover lines.'),
  };

  it('keeps the first position and takes the strongest way', async () => {
    const project = await loadFiles({
      ...NOTES,
      '.planning/todos/pending/one.md': todoFile(
        'notes:\n  - .planning/notes/b.md\n  - .planning/notes/a.md\n',
        'Mentioned notes/a.md and [[c]] and notes/c.md and notes/b.md.\n',
      ),
    });
    const index = buildTodoNoteIndex(project.presentation, project.bodyOf);
    expect(index.notesOf('.planning/todos/pending/one.md')).toEqual([
      { notePath: '.planning/notes/b.md', via: 'listed', exists: true },
      { notePath: '.planning/notes/a.md', via: 'listed', exists: true },
      { notePath: '.planning/notes/c.md', via: 'wiki', exists: true },
    ]);
  });

  it('keeps the position of a promoted-and-mentioned note and calls it promoted, matching text across whitespace', async () => {
    const project = await loadFiles({
      ...NOTES,
      '.planning/todos/pending/two.md': todoFile(
        'source: "promoted from /gsd-note"\n',
        '## Goal\n\nDelta text over lines.\n\n## Context\n\nSee notes/d.md and notes/a.md.\n',
      ),
    });
    const index = buildTodoNoteIndex(project.presentation, project.bodyOf);
    expect(index.notesOf('.planning/todos/pending/two.md')).toEqual([
      { notePath: '.planning/notes/d.md', via: 'promoted', exists: true },
      { notePath: '.planning/notes/a.md', via: 'mentioned', exists: true },
    ]);
  });

  it('keeps a listed missing note without a reverse entry, and drops a missing wiki link or mention', async () => {
    const project = await loadFiles({
      ...NOTES,
      '.planning/todos/pending/three.md': todoFile(
        'notes:\n  - .planning/notes/gone.md\n  - .planning/notes/a.md\n',
        'Links [[nowhere]] and notes/also-gone.md.\n',
      ),
    });
    const index = buildTodoNoteIndex(project.presentation, project.bodyOf);
    expect(index.notesOf('.planning/todos/pending/three.md')).toEqual([
      { notePath: '.planning/notes/gone.md', via: 'listed', exists: false },
      { notePath: '.planning/notes/a.md', via: 'listed', exists: true },
    ]);
    expect(index.todosOf('.planning/notes/gone.md')).toEqual([]);
    expect(index.todosOf('.planning/notes/a.md')).toEqual([{ todoPath: '.planning/todos/pending/three.md', via: 'listed' }]);
  });

  it('does not read a wiki link that names a todo as a note', async () => {
    const project = await loadFiles({
      ...NOTES,
      '.planning/todos/pending/four.md': todoFile('', 'Depends on [[five]].\n'),
      '.planning/todos/pending/five.md': todoFile('', 'Other.\n'),
    });
    const index = buildTodoNoteIndex(project.presentation, project.bodyOf);
    expect(index.notesOf('.planning/todos/pending/four.md')).toEqual([]);
  });

  it('orders the reverse direction by todo path', async () => {
    const project = await loadFiles({
      ...NOTES,
      '.planning/todos/pending/z.md': todoFile('notes:\n  - .planning/notes/a.md\n'),
      '.planning/todos/completed/y.md': todoFile('notes:\n  - .planning/notes/a.md\n'),
      '.planning/todos/pending/b.md': todoFile('', '[[a]]\n'),
    });
    const index = buildTodoNoteIndex(project.presentation, project.bodyOf);
    expect(index.todosOf('.planning/notes/a.md').map((link) => link.todoPath)).toEqual([
      '.planning/todos/completed/y.md',
      '.planning/todos/pending/b.md',
      '.planning/todos/pending/z.md',
    ]);
  });
});

describe('junk', () => {
  it('gives no links, and does not throw, for junk structured data', () => {
    const artifact = (path: string, structured: unknown) => ({ path, kind: 'todo', key: path, structured });
    const presentation = {
      artifacts: [
        artifact('.planning/todos/a.md', undefined),
        artifact('.planning/todos/b.md', 'text'),
        artifact('.planning/todos/c.md', { todo: 'x' }),
        artifact('.planning/todos/d.md', { todo: { noteRefs: 'x' } }),
        artifact('.planning/todos/e.md', { todo: { noteRefs: { listed: 'x', wiki: [1, null], mentioned: { a: 1 }, promotedText: 5 } } }),
        artifact('.planning/todos/f.md', { todo: { noteRefs: { listed: ['../x.md', 4], wiki: ['..'], mentioned: ['.planning/todos/x.md'] } } }),
        null,
        { path: 4 },
        { path: '.planning/notes/n.md', structured: null },
      ],
    } as unknown as ProjectPresentation;
    const index = buildTodoNoteIndex(presentation, () => {
      throw new Error('no body');
    });
    for (const letter of 'abcdef') expect(index.notesOf(`.planning/todos/${letter}.md`)).toEqual([]);
    for (const junk of [null, undefined, {}, { artifacts: 3 }] as unknown[]) {
      expect(() => buildTodoNoteIndex(junk as ProjectPresentation, () => null)).not.toThrow();
    }
  });

  it('builds todos against notes in time that grows linearly with their count', () => {
    const growth = measureGrowth({
      startSize: 64,
      maxSize: 1 << 14,
      make: (count) => {
        const artifacts: unknown[] = [];
        const bodies = new Map<string, string>();
        const pad = (n: number): string => String((n + count) % count).padStart(6, '0');
        for (let i = 0; i < count; i += 1) {
          const note = `.planning/notes/n${pad(i)}.md`;
          bodies.set(note, `Note number ${i} says something.\n\nIt has a second paragraph.`);
          artifacts.push({ path: note, kind: 'unknown', structured: {} });
        }
        for (let i = 0; i < count; i += 1) {
          artifacts.push({
            path: `.planning/todos/pending/t${pad(i)}.md`,
            kind: 'todo',
            structured: {
              todo: {
                noteRefs: {
                  listed: [`.planning/notes/n${pad(i)}.md`, `.planning/notes/n${pad(i + 1)}.md`, `.planning/notes/n${pad(i + 2)}.md`],
                  wiki: [`n${pad(i + 3)}`],
                  mentioned: [],
                  promotedText: `Note number ${(i + 7) % count} says something.   It has a second paragraph.`,
                },
              },
            },
          });
        }
        return { presentation: { artifacts } as unknown as ProjectPresentation, bodies };
      },
      run: ({ presentation, bodies }) => {
        const index = buildTodoNoteIndex(presentation, (path) => bodies.get(path) ?? null);
        const first = index.notesOf('.planning/todos/pending/t000000.md');
        const reverse = index.todosOf('.planning/notes/n000007.md');
        if (first.map((link) => link.via).join() !== 'listed,listed,listed,wiki,promoted') throw new Error('the first todo lost its note links');
        if (!reverse.map((link) => link.via).includes('promoted')) throw new Error('the reverse lookup lost its promoted link');
      },
    });
    expect(growth.ratio, `buildTodoNoteIndex: ${growth.t1.toFixed(2)}ms at ${growth.n} todos, ${growth.t2.toFixed(2)}ms at 8x`).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('buildTodoContext', () => {
  it('carries each source note in listed order with its page url, date, text and promoted flag', async () => {
    const { presentation, registry, bodyOf } = await loadProject(FX_ROOT);
    const context = buildTodoContext(presentation, registry, bodyOf, T('dcrop'));
    expect(context.notes.map((note) => note.path)).toEqual([N('dcrop'), N('dround')]);
    for (const note of context.notes) {
      const key = presentation.artifacts.find((artifact) => artifact.path === note.path)?.key;
      expect(note.url).toBe(key);
      expect(note).toMatchObject({ via: 'listed', exists: true, date: '2026-03-24 09:20', promoted: true, title: null, cut: false });
      expect(note.text).toBe((bodyOf(note.path) ?? '').trim());
      expect(note.text).not.toBe('');
    }
    expect(context.notes[0].text).toMatch(/^Crop tool photos before they are posted/);
    expect(context.closedBy).toEqual({ id: '260326-m3d', label: 'quick 260326-m3d', url: null });
  });

  it("gives the chrome-drift todo its note's title and way, and its quick task a link only when the project has it", async () => {
    const files = planningFiles(LABELORE_FIXTURE_ROOT);
    const plain = await loadFiles(files);
    const without = buildTodoContext(plain.presentation, plain.registry, plain.bodyOf, T('ldrift'));
    expect(without.notes).toHaveLength(1);
    expect(without.notes[0]).toMatchObject({
      via: 'wiki',
      title: 'Per-kind artifact rendering — parsing, design language, and categorization',
    });
    expect(without.closedBy).toEqual({ id: '260920-mzr', label: 'quick 260920-mzr', url: null });

    const summaryPath = '.planning/milestones/v1.1-quick/260920-mzr-x/260920-mzr-SUMMARY.md';
    const withSummary = await loadFiles({ ...files, [summaryPath]: '---\nstatus: complete\n---\n\n# Summary\n' });
    const context = buildTodoContext(withSummary.presentation, withSummary.registry, withSummary.bodyOf, T('ldrift'));
    const key = withSummary.presentation.artifacts.find((artifact) => artifact.path === summaryPath)?.key;
    expect(key).toBeTruthy();
    expect(context.closedBy).toEqual({ id: '260920-mzr', label: 'quick 260920-mzr', url: key });

    const planOnly = '.planning/quick/260920-mzr-fix/260920-mzr-PLAN.md';
    const withPlan = await loadFiles({ ...files, [planOnly]: '---\nphase: x\n---\n\n# Plan\n' });
    expect(buildTodoContext(withPlan.presentation, withPlan.registry, withPlan.bodyOf, T('ldrift')).closedBy?.url).toBe(
      withPlan.presentation.artifacts.find((artifact) => artifact.path === planOnly)?.key,
    );
  });

  it('shows a missing listed note with no url and no text', async () => {
    const project = await loadFiles({ '.planning/todos/pending/x.md': todoFile('notes:\n  - .planning/notes/gone.md\n') });
    const context = buildTodoContext(project.presentation, project.registry, project.bodyOf, '.planning/todos/pending/x.md');
    expect(context.notes).toEqual([
      { path: '.planning/notes/gone.md', url: null, via: 'listed', exists: false, date: null, promoted: null, title: null, text: '', cut: false },
    ]);
  });

  it('cuts note text over 4000 characters on a word boundary', async () => {
    const long = Array.from({ length: 900 }, (_, i) => `word${i}`).join(' ');
    const project = await loadFiles({
      '.planning/notes/long.md': noteFile(long),
      '.planning/todos/pending/x.md': todoFile('notes:\n  - .planning/notes/long.md\n'),
    });
    const note = buildTodoContext(project.presentation, project.registry, project.bodyOf, '.planning/todos/pending/x.md').notes[0];
    expect(note.cut).toBe(true);
    expect(note.text.length).toBeLessThanOrEqual(4000);
    expect(long.startsWith(note.text)).toBe(true);
    expect(long[note.text.length]).toBe(' ');
  });

  it('gives an empty context for a non-todo path and for junk, without throwing', async () => {
    const { presentation, registry, bodyOf } = await loadProject(FX_ROOT);
    const empty = { notes: [], closedBy: null };
    expect(buildTodoContext(presentation, registry, bodyOf, N('dcrop'))).toEqual(empty);
    expect(buildTodoContext(presentation, registry, bodyOf, '.planning/todos/nope.md')).toEqual(empty);
    for (const junk of [null, undefined, {}, { artifacts: 3 }] as unknown[]) {
      expect(buildTodoContext(junk as ProjectPresentation, registry, bodyOf, T('dcrop'))).toEqual(empty);
    }
    expect(buildTodoContext(presentation, null as never, bodyOf, T('dcrop'))).toEqual(empty);
  });
});
