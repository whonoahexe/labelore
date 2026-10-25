// quick-261023-61k (sketch 027 C): the TODO composer and its view, pinned against the eleven sketch
// todos. ViewInput literals are built from the handler's real parse of each file (read through the
// repository, the way the server does) plus the server's todo context; every pinned value comes from the
// sketch's own rendering and data.js, never from the composer's output. The clock is fixed at the
// sketch's NOW (23 Oct 2026 12:00, Asia/Kolkata).
process.env.TZ = 'Asia/Kolkata';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { buildTodoContext } from '../../src/presentation/todo-context.ts';
import { createApp } from '../../src/server/index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { daysOpen, composeTodoLifecycle, formatDay, formatShort, readStamp } from '../../src/web/views/todo-lifecycle.ts';
import type { ComposedTodoLifecycle } from '../../src/web/views/todo-lifecycle.ts';
import { TodoLifecycleView } from '../../src/web/views/todo-lifecycle-components.tsx';
import { LB_ROOT, TODO_KEYS, NOTE_KEYS, loadProject, readKeyed } from '../helpers/todo-corpus.ts';
import type { LoadedProject } from '../helpers/todo-corpus.ts';

const NOW = new Date('2026-10-23T12:00:00+05:30');
const KOLKATA = { now: NOW, timeZone: 'Asia/Kolkata' };

const projects = new Map<string, LoadedProject>();

beforeAll(async () => {
  for (const file of Object.values(TODO_KEYS)) {
    if (!projects.has(file.root)) projects.set(file.root, await loadProject(file.root));
  }
});

function wire<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The ViewInput the page builds from the served document of a sketch todo. */
function inputFor(key: string): ViewInput {
  const file = TODO_KEYS[key];
  const project = projects.get(file.root)!;
  const artifact = project.presentation.artifacts.find((candidate) => candidate.path === file.path);
  if (!artifact) throw new Error(`no artifact for ${key}`);
  return {
    kind: artifact.kind,
    frontmatter: wire(artifact.frontmatter),
    structured: wire(artifact.structured),
    groups: [],
    planSegments: [],
    headings: [],
    todoContext: wire(buildTodoContext(project.presentation, project.registry, project.bodyOf, file.path)),
  };
}

function compose(key: string, options = KOLKATA): ComposedTodoLifecycle {
  const model = composeTodoLifecycle(inputFor(key), options);
  if (!model) throw new Error(`no model for ${key}`);
  return model;
}

function render(model: ComposedTodoLifecycle, extra: Partial<Parameters<typeof TodoLifecycleView>[0]> = {}): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(TodoLifecycleView, {
        model,
        fallbackTitle: 'Todo',
        path: '.planning/todos/pending/x.md',
        mode: 'view',
        onModeChange: () => undefined,
        onShowSource: () => undefined,
        chip: null,
        ...extra,
      }),
    ),
  );
}

describe('head and chips', () => {
  const head: Record<string, [string, string, string, string, string | null]> = {
    // key: created, title, status label, weight text, area
    dcrop: ['24 Mar 2026', 'Add crop and round member avatars', 'Done', 'Minor · priority low', 'media'],
    dsfx: ['23 Mar 2026', 'Add synthesised checkout sound cues', 'Done', 'Cosmetic', 'ui'],
    dcall: ['23 Mar 2026', 'Add scanner debug logging (camera + serial, no personal data)', 'Done', 'Major', 'kiosk'],
    sretry: ['12 Oct 2026', 'Move filings that fail five retries into a dead-letter view brokers can see', 'Pending', 'Major', 'gateway'],
    srec: ['15 Oct 2026', "Export the reconciliation report as a PDF for the importer's records", 'Pending', 'Minor', 'reporting'],
    star: ['16 Oct 2026', "show the tariff schedule's own notes as tooltips on HS codes", 'Pending', 'P2', 'general'],
    sport: ['2 Oct 2026', 'Fill in the port timezone table for the eleven inland ports', 'Done', 'Minor', 'data'],
    pcheck: ['26 Mar 2026', 'Pre-milestone: swap shed Ethernet, re-seat sensors, tidy the shelves', 'Pending', 'High', null],
    pdev: ['26 Mar 2026', "Kiosk should detect when a shed's door sensor has vanished from its dock", 'Done', 'Medium', null],
    lfig: [
      '29 Sep 2026',
      'Use the lifted-diagram and clean-list-tree renderers for every ASCII diagram and directory tree in Labelore',
      'Pending',
      'Medium',
      null,
    ],
    ldrift: ['20 Sep 2026', 'Fix document-page chrome drift and the loading→loaded container reflow', 'Done', 'Medium', null],
  };
  const levels: Record<string, string> = {
    dcrop: 'low', dsfx: 'low', dcall: 'high', sretry: 'high', srec: 'low', star: 'medium', sport: 'low', pcheck: 'high', pdev: 'medium', lfig: 'medium', ldrift: 'medium',
  };
  for (const [key, [created, title, status, weight, area]] of Object.entries(head)) {
    it(`${key}: eyebrow, created, title, status, severity and area`, () => {
      const model = compose(key);
      expect(model.head).toEqual({ eyebrow: 'Todo', created, title });
      expect(model.chips.status.label).toBe(status);
      expect(model.chips.status.tone).toBe(status === 'Done' ? 'complete' : 'in-flight');
      expect(model.chips.weight.text).toBe(weight);
      expect(model.chips.weight.level).toBe(levels[key]);
      expect(model.chips.area).toBe(area);
    });
  }

  it('titles the severity square after what was written', () => {
    expect(compose('dcrop').chips.weight).toMatchObject({ lead: 'Minor', tail: 'priority low', title: 'severity: minor' });
    expect(compose('star').chips.weight).toMatchObject({ lead: 'P2', tail: null, title: 'priority: P2' });
    expect(compose('sretry').chips.weight.title).toBe('severity: major');
  });
});

describe('the step strip', () => {
  type Step = [string, string, string, string];
  const steps: Record<string, [Step, Step, Step]> = {
    dcrop: [['noted', 'done', '24 Mar 09:20', '2 notes · last 24 Mar 09:20'], ['captured', 'done', '24 Mar 15:17', 'minor · media'], ['closed', 'done', 'quick 260326-m3d', '26 Mar 2026']],
    dsfx: [['noted', 'done', '23 Mar 08:05', '1 note'], ['captured', 'done', '23 Mar 11:44', 'cosmetic · ui'], ['closed', 'done', 'quick 260325-q9v', '25 Mar 2026']],
    dcall: [['noted', 'done', '23 Mar 07:12', '1 note'], ['captured', 'done', '23 Mar 13:18', 'major · kiosk'], ['closed', 'done', 'Done', 'No resolution written']],
    sretry: [['noted', 'none', 'No note', 'Captured straight as a todo'], ['captured', 'done', '12 Oct 15:11', 'major · gateway'], ['now', 'now', 'Open 11 days', 'Waiting in todos/pending/']],
    srec: [['noted', 'none', 'No note', 'Captured straight as a todo'], ['captured', 'done', '15 Oct 21:32', 'minor · reporting'], ['now', 'now', 'Open 8 days', 'Waiting in todos/pending/']],
    star: [['noted', 'done', '16 Oct 14:47', '1 note'], ['captured', 'done', '16 Oct', 'P2 · general'], ['now', 'now', 'Open 7 days', 'Waiting in todos/pending/']],
    sport: [['noted', 'none', 'No note', 'Captured straight as a todo'], ['captured', 'done', '2 Oct 15:30', 'minor · data'], ['closed', 'done', 'Done', 'No resolution written']],
    pcheck: [['noted', 'done', '26 Mar', '1 note'], ['captured', 'done', '26 Mar', 'high'], ['now', 'now', 'Open 211 days', '0 of 4 done']],
    pdev: [['noted', 'done', '26 Mar', '1 note'], ['captured', 'done', '26 Mar', 'medium'], ['closed', 'done', 'Done', 'No resolution written']],
    lfig: [['noted', 'none', 'No note', 'Captured straight as a todo'], ['captured', 'done', '29 Sep', 'medium'], ['now', 'now', 'Open 24 days', 'Waiting in todos/pending/']],
    ldrift: [['noted', 'done', '20 Sep', '1 note'], ['captured', 'done', '20 Sep', 'medium'], ['closed', 'done', 'quick 260920-mzr', '20 Sep 2026']],
  };
  for (const [key, want] of Object.entries(steps)) {
    it(`${key}: key, state, value and sub of each step`, () => {
      const got = compose(key).steps.map((step) => [step.key, step.state, step.value, step.sub]);
      expect(got).toEqual(want);
    });
  }

  it('makes a step a jump to its stage, and a missing Noted stage a dead end', () => {
    expect(compose('dcrop').steps.map((step) => step.target)).toEqual(['todo-noted', 'todo-captured', 'todo-closed']);
    expect(compose('sretry').steps.map((step) => step.target)).toEqual([null, 'todo-captured', 'todo-closed']);
  });

  it('reads the Captured step in the viewer zone for an instant, and the Noted step as written', () => {
    const utc = compose('dcrop', { now: NOW, timeZone: 'UTC' });
    expect(utc.steps[1].value).toBe('24 Mar 09:47');
    expect(utc.steps[0].value).toBe('24 Mar 09:20');
    expect(utc.head.created).toBe('24 Mar 2026');
  });
});

describe('the Noted and Captured stages', () => {
  it('numbers the stages and words the Noted kicker', () => {
    const dcrop = compose('dcrop');
    expect(dcrop.noted).toMatchObject({ number: 1, kicker: '2 notes · the todo was made from these' });
    expect(dcrop.captured).toMatchObject({ number: 2, kicker: '24 Mar 15:17' });
    expect(dcrop.end.number).toBe(3);
    expect(compose('dsfx').noted?.kicker).toBe('1 note · the todo was made from this');
    const sretry = compose('sretry');
    expect(sretry.noted).toBeNull();
    expect(sretry.captured).toMatchObject({ number: 1, kicker: '12 Oct 15:11' });
    expect(sretry.end.number).toBe(2);
  });

  it('dcrop: two listed cards, both clamped', () => {
    const cards = compose('dcrop').noted!.notes;
    expect(cards.map((card) => [card.kicker, card.way, card.title, card.clamp, card.missing])).toEqual([
      ['Note · 24 Mar 09:20', 'Listed in notes:', null, true, false],
      ['Note · 24 Mar 09:20', 'Listed in notes:', null, true, false],
    ]);
    expect(cards[0].text).toMatch(/^Crop tool photos before they are posted/);
    expect(cards[1].text).toMatch(/^Round member avatars everywhere, push icon included\./);
    const key = projects.get(TODO_KEYS.dcrop.root)!.presentation.artifacts.find((artifact) => artifact.path === NOTE_KEYS.dcrop.path)?.key;
    expect(cards[0].url).toBe(key);
  });

  it('the other notes: ways, titles and clamps', () => {
    expect(compose('dsfx').noted!.notes[0]).toMatchObject({ way: 'Listed in notes:', clamp: true });
    expect(compose('dsfx').noted!.notes[0].text).toMatch(/^Checkout sound cues\. Decided: all of these/);
    expect(compose('dcall').noted!.notes[0].text).toMatch(/^Scanner debug logging \(camera \+ serial, no personal data\)\. Observed:/);
    const star = compose('star').noted!.notes[0];
    expect(star).toMatchObject({ way: 'Promoted word for word', clamp: false, title: null, kicker: 'Note · 16 Oct 14:47' });
    expect(star.text).toBe("show the tariff schedule's own notes as tooltips on HS codes");
    const pcheck = compose('pcheck').noted!.notes[0];
    expect(pcheck).toMatchObject({ way: 'Mentioned in the text', clamp: false, title: 'Steward Desk — next milestone brief', kicker: 'Note · 26 Mar' });
    expect(compose('pdev').noted!.notes[0].way).toBe('Mentioned in the text');
    expect(compose('ldrift').noted!.notes[0]).toMatchObject({
      way: 'Linked in the text',
      title: 'Per-kind artifact rendering — parsing, design language, and categorization',
      clamp: false,
    });
  });

  const captured: Record<string, [number, string, string | null, string | null]> = {
    // key: number, kicker, lead label, plan label
    dcrop: [2, '24 Mar 15:17', 'Problem', 'Solution'],
    dsfx: [2, '23 Mar 11:44', 'Problem', 'Solution'],
    dcall: [2, '23 Mar 13:18', 'Problem', 'Solution'],
    sretry: [1, '12 Oct 15:11', 'Problem', 'Solution'],
    srec: [1, '15 Oct 21:32', 'Problem', null],
    star: [2, '16 Oct · promoted from /gsd-note', 'Goal', null],
    sport: [1, '2 Oct 15:30', null, null],
    pcheck: [2, '26 Mar', 'What it’s about', 'To do · 0 of 4'],
    pdev: [2, '26 Mar', 'What it’s about', null],
    lfig: [1, '29 Sep', 'What it’s about', null],
    ldrift: [2, '20 Sep', 'What it’s about', null],
  };
  for (const [key, [number, kicker, lead, plan]] of Object.entries(captured)) {
    it(`${key}: Captured number, kicker, lead and plan labels`, () => {
      const stage = compose(key).captured;
      expect(stage.number).toBe(number);
      expect(stage.kicker).toBe(kicker);
      expect(stage.lead?.label ?? null).toBe(lead);
      expect(stage.plan?.label ?? null).toBe(plan);
    });
  }

  it('files, folds and the empty state', () => {
    expect(compose('dcrop').captured.files?.count).toBe(5);
    expect(compose('dcrop').captured.files?.rows[0]).toMatchObject({ dir: 'api/src/photos/', name: 'resize.ts', range: null });
    expect(compose('sretry').captured.files?.rows[0]).toMatchObject({ dir: 'src/gateway/', name: 'retry-queue.ts', range: 'L88–140' });
    expect(compose('dcrop').captured.extras).toEqual([]);
    expect(compose('ldrift').captured.extras.map((extra) => extra.heading)).toEqual([
      '1. The container changes mid-load (visible reflow)',
      '2. The two frames have drifted on three axes',
      'Scope',
      'Why it is its own task',
    ]);
    expect(compose('ldrift').captured.extras.every((extra) => !extra.open)).toBe(true);
    expect(compose('lfig').captured.extras.map((extra) => extra.heading)).toEqual(['Details']);
    expect(compose('pdev').captured.extras.map((extra) => extra.heading)).toEqual(['Details']);
    expect(compose('sport').captured.empty).toBe(true);
    expect(compose('dcrop').captured.empty).toBe(false);
  });
});

describe('the end stage', () => {
  it('closed with a resolution, a callout and commits', () => {
    const dcrop = compose('dcrop').end;
    expect(dcrop).toMatchObject({ kind: 'closed', title: 'Closed', kicker: 'quick 260326-m3d · 26 Mar 2026', note: null, commits: [] });
    const ldrift = compose('ldrift').end;
    expect(ldrift).toMatchObject({ kind: 'closed', kicker: 'quick 260920-mzr · 20 Sep 2026', commits: ['cc92a07', '4934254', '84c402d'], note: null });
    expect(ldrift.kind === 'closed' && ldrift.closing?.[0]).toMatchObject({ kind: 'paragraph' });
  });

  it('closed with no resolution says where it was moved to', () => {
    for (const key of ['dcall', 'sport', 'pdev']) {
      expect(compose(key).end).toMatchObject({
        kind: 'closed',
        kicker: 'moved to completed/',
        closing: null,
        note: 'Moved to todos/completed/ with no resolution written.',
      });
    }
  });

  it('still open says how long, and how many items are checked', () => {
    expect(compose('sretry').end).toMatchObject({ kind: 'open', title: 'Still open', lead: 'Open 11 days.', rest: 'Nothing has closed it yet.' });
    expect(compose('srec').end).toMatchObject({ lead: 'Open 8 days.' });
    expect(compose('star').end).toMatchObject({ lead: 'Open 7 days.' });
    expect(compose('lfig').end).toMatchObject({ lead: 'Open 24 days.' });
    expect(compose('pcheck').end).toMatchObject({
      lead: 'Open 211 days.',
      rest: 'Nothing has closed it yet — 0 of 4 items checked.',
    });
  });

  it('a todo with no created date reads "Still open."', () => {
    const input = inputFor('sretry');
    const structured = wire(input.structured) as { todo: Record<string, unknown> };
    structured.todo.created = null;
    const model = composeTodoLifecycle({ ...input, structured }, KOLKATA)!;
    expect(model.end).toMatchObject({ lead: 'Still open.', rest: 'Nothing has closed it yet.' });
    expect(model.steps[2].value).toBe('Open');
    expect(model.steps[1]).toMatchObject({ state: 'none', value: 'Date not recorded' });
    expect(model.captured.kicker).toBe('date not recorded');
    expect(model.head.created).toBeNull();
  });

  it('links the quick task only when the server resolved a url', () => {
    const input = inputFor('ldrift');
    const plain = composeTodoLifecycle(input, KOLKATA)!;
    expect(plain.end.kind === 'closed' && plain.end.closedBy).toEqual({ label: 'quick 260920-mzr', url: null });
    const linked = composeTodoLifecycle({ ...input, todoContext: { notes: input.todoContext!.notes, closedBy: { id: '260920-mzr', label: 'quick 260920-mzr', url: '/artifacts/x' } } }, KOLKATA)!;
    expect(linked.end.kind === 'closed' && linked.end.closedBy).toEqual({ label: 'quick 260920-mzr', url: '/artifacts/x' });
    const markup = render(linked);
    expect(markup).toContain('href="/artifacts/x"');
    expect(markup).toMatch(/>quick 260920-mzr<\/a>/);
    expect(render(plain)).not.toMatch(/>quick 260920-mzr<\/a>/);
  });
});

describe('dates', () => {
  it('turns a midnight-UTC stamp into a day in both zones', () => {
    for (const timeZone of ['Asia/Kolkata', 'UTC', 'America/Los_Angeles']) {
      expect(formatShort('2026-09-29T00:00:00.000Z', timeZone)).toBe('29 Sep');
      expect(formatDay('2026-09-29T00:00:00.000Z', timeZone)).toBe('29 Sep 2026');
    }
  });

  it('reads zone-less text as written and instants in the viewer zone', () => {
    expect(readStamp('2026-10-21 15:58', 'UTC')).toEqual({ year: 2026, month: 10, day: 21, time: '15:58' });
    expect(readStamp('2026-10-21T15:58:00', 'Asia/Kolkata')).toEqual({ year: 2026, month: 10, day: 21, time: '15:58' });
    expect(readStamp('2026-10-21T10:31:14.064Z', 'Asia/Kolkata')).toEqual({ year: 2026, month: 10, day: 21, time: '16:01' });
    expect(readStamp('2026-10-21T23:30:00+00:00', 'Asia/Kolkata')).toEqual({ year: 2026, month: 10, day: 22, time: '05:00' });
    expect(readStamp('2026-10-21T10:00:00-0500', 'UTC')).toEqual({ year: 2026, month: 10, day: 21, time: '15:00' });
    expect(readStamp('2026-10-21', 'UTC')).toEqual({ year: 2026, month: 10, day: 21, time: null });
  });

  it('shows text that is not a date as written, and gives null for it', () => {
    for (const text of ['soon', '2026-13-01', '2026-10-32', '21/10/2026', '']) {
      expect(readStamp(text, 'UTC')).toBeNull();
      expect(formatDay(text, 'UTC')).toBe(text);
    }
    expect(readStamp(5 as unknown as string, 'UTC')).toBeNull();
    expect(formatShort('soon')).toBe('soon');
  });

  it('counts calendar days in the viewer zone', () => {
    expect(daysOpen('2026-10-23', NOW, 'Asia/Kolkata')).toBe(0);
    expect(daysOpen('2026-10-12T09:41:00.000Z', NOW, 'Asia/Kolkata')).toBe(11);
    expect(daysOpen('2026-09-29', NOW, 'Asia/Kolkata')).toBe(24);
    expect(daysOpen('2026-11-30', NOW, 'Asia/Kolkata')).toBe(0);
    expect(daysOpen('soon', NOW, 'UTC')).toBeNull();
    expect(daysOpen('2026-10-23T20:00:00.000Z', new Date('2026-10-23T22:00:00Z'), 'Asia/Kolkata')).toBe(0);
  });

  it('falls back to UTC for a zone name it does not know', () => {
    expect(formatShort('2026-10-21T10:31:14.064Z', 'Not/AZone')).toBe('21 Oct 10:31');
  });
});

describe('composeTodoLifecycle on junk', () => {
  const base = (structured: unknown, frontmatter: unknown = {}, todoContext: unknown = null): ViewInput =>
    ({ kind: 'todo', frontmatter, structured, groups: [], planSegments: [], todoContext }) as unknown as ViewInput;

  it('returns null without a projection', () => {
    for (const structured of [{}, { todo: 'x' }, { todo: [] }, { todo: null }, null, undefined, 3]) {
      expect(composeTodoLifecycle(base(structured), KOLKATA)).toBeNull();
    }
    expect(composeTodoLifecycle(null as unknown as ViewInput, KOLKATA)).toBeNull();
  });

  it('degrades every junk value to an omitted part', () => {
    const junk = [
      { todo: {} },
      { todo: { status: 5, folder: [], created: {}, files: 3, extras: 'x', lead: 'x', plan: [], closing: 4, commits: 'abc', noteRefs: 1 } },
      { todo: { status: 'done', closing: { blocks: 'x' }, files: [null, 3, { name: 4 }], extras: [null, { heading: 5 }, { heading: 'ok', blocks: 7 }], commits: [1, 'ok'] } },
      { todo: { plan: { kind: 'checklist', checks: { done: 'x', total: -1 } }, lead: { heading: 3, blocks: null } } },
    ];
    for (const structured of junk) {
      for (const frontmatter of [{}, null, 'x', { title: 4, created: new Date('2026-10-01T10:00:00Z') }]) {
        for (const todoContext of [null, 'x', { notes: 3 }, { notes: [null, 4, {}, { path: 5 }, { path: 'x', via: 3, date: [], text: {}, cut: 'y' }], closedBy: 'z' }, { closedBy: { label: 4, url: {} } }]) {
          let model: ComposedTodoLifecycle | null = null;
          expect(() => {
            model = composeTodoLifecycle(base(structured, frontmatter, todoContext), KOLKATA);
          }).not.toThrow();
          expect(model).not.toBeUndefined();
          if (model) expect(() => render(model!)).not.toThrow();
        }
      }
    }
  });

  it('reads a Date or an ISO string for dates', () => {
    const asDate = composeTodoLifecycle(base({ todo: { status: 'pending', created: new Date('2026-10-12T09:41:00.000Z') } }), KOLKATA);
    const asString = composeTodoLifecycle(base({ todo: { status: 'pending', created: '2026-10-12T09:41:00.000Z' } }), KOLKATA);
    expect(asDate?.steps[1].value).toBe(asString?.steps[1].value);
  });

  it('shows "Date not recorded" for notes none of which are dated', () => {
    const model = composeTodoLifecycle(
      base({ todo: { status: 'pending', created: '2026-10-12' } }, {}, {
        notes: [
          { path: '.planning/notes/a.md', url: null, via: 'listed', exists: true, date: null, text: 'a' },
          { path: '.planning/notes/b.md', url: null, via: 'listed', exists: false, date: null, text: '' },
        ],
        closedBy: null,
      }),
      KOLKATA,
    )!;
    expect(model.steps[0]).toMatchObject({ state: 'done', value: 'Date not recorded', sub: '2 notes' });
    expect(model.noted!.notes[1]).toMatchObject({ missing: true, url: null, clamp: false });
  });

  it('opens the first fold when there is neither a lead nor a plan', () => {
    const model = composeTodoLifecycle(
      base({ todo: { status: 'pending', extras: [{ heading: 'Notes', blocks: [{ kind: 'paragraph', text: 'x' }] }, { heading: 'More', blocks: [] }] } }),
      KOLKATA,
    )!;
    expect(model.captured.extras.map((extra) => extra.open)).toEqual([true, false]);
    expect(model.captured.empty).toBe(false);
    const withLead = composeTodoLifecycle(
      base({ todo: { status: 'pending', lead: { heading: null, blocks: [] }, extras: [{ heading: 'Notes', blocks: [] }] } }),
      KOLKATA,
    )!;
    expect(withLead.captured.extras[0].open).toBe(false);
  });

  it('words an unfiled todo with its own sub line', () => {
    const model = composeTodoLifecycle(base({ todo: { status: 'unfiled', folder: null, created: '2026-10-12' } }), KOLKATA)!;
    expect(model.chips.status).toEqual({ label: 'Unfiled', tone: 'quiet' });
    expect(model.steps[2]).toMatchObject({ key: 'now', sub: 'Filed outside todos/pending/' });
  });
});

describe('the view', () => {
  it('dcrop: one h1, the head, the chips, the strip and the first two stages', () => {
    const markup = render(compose('dcrop'), { path: TODO_KEYS.dcrop.path });
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain('>Todo</p>');
    expect(markup).toContain('Created <b>24 Mar 2026</b>');
    expect(markup).toMatch(/<span class="status-chip" data-tone="complete">Done<\/span>/);
    expect(markup).toMatch(/<span class="status-chip view-todo-pip" data-severity="low"/);
    expect(markup).toContain('Minor');
    expect(markup.match(/<button type="button" class="view-todo-step"/g)).toHaveLength(3);
    expect(markup).toMatch(/<section class="view-todo-stage" id="todo-noted" data-state="done"><span class="view-todo-node">1<\/span>/);
    expect(markup.match(/<article class="view-todo-note"/g)).toHaveLength(2);
    expect(markup).toMatch(/<section class="view-todo-stage" id="todo-captured" data-state="done"><span class="view-todo-node">2<\/span>/);
    expect(markup.match(/Unfold ↓/g)).toHaveLength(2);
    expect(markup).toContain('Problem');
    expect(markup).toContain('Solution');
    expect(markup).toContain('Files · 5');
    expect(markup).toContain('Done in quick task');
    const hrefs = [...markup.matchAll(/<a class="view-todo-link" href="([^"]+)"[^>]*>Open note ↗/g)].map((match) => decodeURIComponent(match[1]));
    expect(hrefs).toEqual([
      expect.stringContaining('2026-03-24-crop-tool-photos-and-member-avatars.md'),
      expect.stringContaining('2026-03-24-round-member-avatars.md'),
    ]);
    expect(markup).toContain('aria-label="Also in this file"');
    expect(markup.match(/>Frontmatter</g)).toHaveLength(1);
  });

  it('sretry: the Noted step is plain text and there is no Noted stage', () => {
    const markup = render(compose('sretry'));
    expect(markup.match(/<button type="button" class="view-todo-step"/g)).toHaveLength(2);
    expect(markup).toMatch(/<div class="view-todo-step" data-state="none">/);
    expect(markup).toContain('No note');
    expect(markup).not.toContain('id="todo-noted"');
    expect(markup).toContain('L88–140');
    expect(markup).toContain('Open 11 days.');
    expect(markup).toContain('Nothing has closed it yet.');
    expect(markup).toMatch(/id="todo-closed" data-state="now"/);
  });

  it('pcheck: four empty squares and a note link in the lead', () => {
    const markup = render(compose('pcheck'));
    expect(markup.match(/class="view-todo-check" data-done="false"/g)).toHaveLength(4);
    expect(markup).toContain('To do · 0 of 4');
    expect(markup).toMatch(/<a class="view-todo-ref" href="[^"]*2026-03-26-steward-desk-milestone-brief\.md[^"]*"[^>]*>notes\/2026-03-26-steward-desk-milestone-brief\.md<\/a>/);
    expect(markup).toContain('0 of 4 items checked.');
  });

  it('ldrift: folds, a wiki link inside the last one, and a callout closing with commits', () => {
    const markup = render(compose('ldrift'));
    expect(markup.match(/<details class="view-todo-fold"/g)).toHaveLength(4);
    expect(markup).toMatch(/<a class="view-todo-ref" href="[^"]+"[^>]*>per-kind-artifact-rendering<\/a>/);
    expect(markup).toContain('<code class="view-todo-commit">cc92a07</code>');
    expect(markup).toContain('Closed 2026-09-20.');
  });

  it('sport: the empty line and the no-resolution line', () => {
    const markup = render(compose('sport'));
    expect(markup).toContain('Nothing below the frontmatter — the title is the whole todo.');
    expect(markup).toContain('Moved to todos/completed/ with no resolution written.');
    expect(markup).not.toContain('view-todo-files');
  });

  it('puts the chip passed in the meta row and drops the Also row for an empty frontmatter', () => {
    const model = compose('dcrop');
    const markup = render({ ...model, also: [] }, { chip: createElement('span', { className: 'status-chip', 'data-tone': 'warning' }, 'Warning') });
    expect(markup).toMatch(/data-tone="warning">Warning<\/span>/);
    expect(markup).not.toContain('Also in this file');
  });
});

/** Every element in a React tree whose type is the given tag, found without rendering (function
 * components are not expanded, so only the view's own host elements are visited). */
function findElements(node: unknown, tag: string, out: { props: Record<string, unknown> }[] = []): { props: Record<string, unknown> }[] {
  if (Array.isArray(node)) {
    for (const child of node) findElements(child, tag, out);
    return out;
  }
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const element = node as { type: unknown; props: Record<string, unknown> };
    if (element.type === tag) out.push(element);
    findElements(element.props.children, tag, out);
  }
  return out;
}

describe('the view, more', () => {
  const base = (structured: unknown, frontmatter: unknown = { title: 'T' }, todoContext: unknown = null): ViewInput =>
    ({ kind: 'todo', frontmatter, structured, groups: [], planSegments: [], todoContext }) as unknown as ViewInput;

  it('the Also chip opens the whole file in Source, with no target', () => {
    const calls: (string | null)[] = [];
    const tree = TodoLifecycleView({
      model: compose('dcrop'),
      fallbackTitle: 'Todo',
      path: 'x',
      mode: 'view',
      onModeChange: () => undefined,
      onShowSource: (id) => calls.push(id),
      chip: null,
    });
    const nav = findElements(tree, 'nav');
    expect(nav).toHaveLength(1);
    const buttons = findElements(nav[0].props.children, 'button');
    expect(buttons).toHaveLength(1);
    (buttons[0].props.onClick as () => void)();
    expect(calls).toEqual([null]);
  });

  it('a missing listed note is a quiet card with its path and no Open note link', () => {
    const model = composeTodoLifecycle(
      base(
        { todo: { status: 'pending', created: '2026-10-12', lead: { heading: 'Problem', blocks: [{ kind: 'paragraph', text: 'x' }] } } },
        { title: 'T' },
        { notes: [{ path: '.planning/notes/gone.md', url: null, via: 'listed', exists: false, date: null, text: '' }], closedBy: null },
      ),
      KOLKATA,
    )!;
    const markup = render(model);
    expect(markup).toContain('Not in .planning/notes/');
    expect(markup).toContain('.planning/notes/gone.md');
    expect(markup).toContain('data-missing="true"');
    expect(markup).not.toContain('Open note');
    expect(markup).not.toContain('Unfold');
  });

  it('a todo whose only content is a Notes section shows that fold open and no empty line', () => {
    const model = composeTodoLifecycle(
      base({ todo: { status: 'pending', created: '2026-10-12', extras: [{ heading: 'Notes', blocks: [{ kind: 'paragraph', text: 'Some words.' }], sourceHeading: 'Notes' }] } }),
      KOLKATA,
    )!;
    const markup = render(model);
    expect(markup).toMatch(/<details class="view-todo-fold" open="">/);
    expect(markup).not.toContain('Nothing below the frontmatter');
    expect(markup).not.toContain('view-todo-pair');
  });

  it('a Problem section with preamble prose shows a Details fold', () => {
    const model = composeTodoLifecycle(
      base({
        todo: {
          status: 'pending',
          created: '2026-10-12',
          lead: { heading: 'Problem', blocks: [{ kind: 'paragraph', text: 'It breaks.' }] },
          extras: [{ heading: 'Details', blocks: [{ kind: 'paragraph', text: 'Before the problem.' }], sourceHeading: null }],
        },
      }),
      KOLKATA,
    )!;
    const markup = render(model);
    expect(markup).toContain('<summary>Details</summary>');
    expect(markup).not.toMatch(/<details class="view-todo-fold" open/);
    expect(markup).toContain('Before the problem.');
  });

  it('turns a resolved note reference into a link and leaves one inside backticks as code', () => {
    const context = {
      notes: [{ path: '.planning/notes/real-note.md', url: '/artifacts/real', via: 'listed', exists: true, date: '2026-10-01', text: 'x' }],
      closedBy: null,
    };
    const model = composeTodoLifecycle(
      base(
        {
          todo: {
            status: 'pending',
            created: '2026-10-12',
            lead: {
              heading: null,
              blocks: [
                {
                  kind: 'paragraph',
                  text: 'See [[real-note]], notes/real-note.md, .planning/notes/real-note.md, `[[real-note]]`, `notes/real-note.md`, [[other]] and xnotes/real-note.md.',
                },
              ],
            },
          },
        },
        { title: 'T' },
        context,
      ),
      KOLKATA,
    )!;
    const markup = render(model);
    const links = [...markup.matchAll(/<a class="view-todo-ref" href="\/artifacts\/real"[^>]*>([^<]*)<\/a>/g)].map((match) => match[1]);
    expect(links).toEqual(['real-note', 'notes/real-note.md', 'notes/real-note.md']);
    expect(markup).toContain('<code>[[real-note]]</code>');
    expect(markup).toContain('<code>notes/real-note.md</code>');
    expect(markup).toContain('[[other]]');
    expect(markup).toContain('xnotes/real-note.md');
  });

  it('keeps a clamped card clamped until it is unfolded', () => {
    const long = 'Word '.repeat(80);
    const model = composeTodoLifecycle(
      base({ todo: { status: 'pending', created: '2026-10-12' } }, { title: 'T' }, {
        notes: [{ path: '.planning/notes/a.md', url: '/artifacts/a', via: 'listed', exists: true, date: '2026-10-01', text: long.trim() }],
        closedBy: null,
      }),
      KOLKATA,
    )!;
    const markup = render(model);
    expect(markup).toContain('data-clamped="true"');
    expect(markup).toContain('Unfold ↓');
  });
});

describe("labelore's own promoted todo (001), checklist squares", () => {
  it('renders its acceptance list as squares with some done', async () => {
    const project = await loadProject(LB_ROOT);
    const path = '.planning/todos/completed/001-sketches-page-in-labelore.md';
    const artifact = project.presentation.artifacts.find((candidate) => candidate.path === path)!;
    const model = composeTodoLifecycle(
      {
        kind: 'todo',
        frontmatter: wire(artifact.frontmatter),
        structured: wire(artifact.structured),
        groups: [],
        planSegments: [],
        todoContext: wire(buildTodoContext(project.presentation, project.registry, project.bodyOf, path)),
      },
      KOLKATA,
    )!;
    const markup = render(model);
    const squares = markup.match(/class="view-todo-check" data-done="(true|false)"/g) ?? [];
    expect(squares.length).toBe(model.captured.plan!.checks!.total);
    expect(squares.filter((square) => square.includes('"true"')).length).toBe(model.captured.plan!.checks!.done);
    expect(squares).toHaveLength(7);
    expect(squares.filter((square) => square.includes('"true"'))).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Served end to end
// ---------------------------------------------------------------------------

interface DocumentPayload {
  artifact: { kind: string; frontmatter: Record<string, unknown>; structured: Record<string, unknown> };
  todoContext: { notes: { path: string; url: string | null }[]; closedBy: unknown } | null;
}

describe('served end to end', () => {
  it('serves the context on a todo, null on a note, and composes and renders the page from it', async () => {
    const files: Record<string, string> = {
      [TODO_KEYS.dcrop.path]: readKeyed(TODO_KEYS.dcrop),
      [NOTE_KEYS.dcrop.path]: readKeyed(NOTE_KEYS.dcrop),
      [NOTE_KEYS.dround.path]: readKeyed(NOTE_KEYS.dround),
      [TODO_KEYS.lfig.path]: readKeyed(TODO_KEYS.lfig),
      [TODO_KEYS.ldrift.path]: readKeyed(TODO_KEYS.ldrift),
      [NOTE_KEYS.lperkind.path]: readKeyed(NOTE_KEYS.lperkind),
    };
    const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    const key = (path: string): string => {
      const dto = presentation.artifacts.find((artifact) => artifact.path === path);
      if (!dto) throw new Error(`no artifact ${path}`);
      return dto.key;
    };
    const documentOf = async (path: string): Promise<DocumentPayload> =>
      (await (await app.request(`/api/documents?route=${encodeURIComponent(key(path))}`)).json()) as DocumentPayload;

    const served = await documentOf(TODO_KEYS.dcrop.path);
    expect(served.artifact.kind).toBe('todo');
    expect(served.artifact.structured.todo).toBeTruthy();
    expect(served.todoContext?.notes.map((note) => note.url)).toEqual([key(NOTE_KEYS.dcrop.path), key(NOTE_KEYS.dround.path)]);
    expect((await documentOf(NOTE_KEYS.dcrop.path)).todoContext).toBeNull();
    expect((await documentOf(TODO_KEYS.lfig.path)).todoContext).toEqual({ notes: [], closedBy: null });

    const input: ViewInput = {
      kind: served.artifact.kind,
      frontmatter: served.artifact.frontmatter,
      structured: served.artifact.structured,
      groups: [],
      planSegments: [],
      headings: [],
      todoContext: served.todoContext as ViewInput['todoContext'],
    };
    const model = composeTodoLifecycle(input, KOLKATA);
    expect(model).not.toBeNull();
    expect(model!.noted!.notes.map((note) => note.url)).toEqual([key(NOTE_KEYS.dcrop.path), key(NOTE_KEYS.dround.path)]);
    expect(model!.steps.map((step) => step.value)).toEqual(['24 Mar 09:20', '24 Mar 15:17', 'quick 260326-m3d']);
    const markup = render(model!);
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup.match(/Open note ↗/g)).toHaveLength(2);

    const drift = await documentOf(TODO_KEYS.ldrift.path);
    expect(drift.todoContext?.notes.map((note) => note.path)).toEqual([NOTE_KEYS.lperkind.path]);
  });
});
