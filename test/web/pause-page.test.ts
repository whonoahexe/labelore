// Phase 11 (11-10, VIEW-17): the pause page's composer and the static markup of its page (sketch 054 winner C, the
// gate path), over the made-up Lendshed and Shapes pauses loaded through the repository, plus planted copies for the
// shapes the fixtures lack. One page serves HANDOFF.json and every .continue-here.md; where the two files differ both
// values show, each named, and nothing is merged. "Mark as read" is view state only.
import { readFile, readdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildPauseContext } from '../../src/presentation/pause-context.ts';
import { composePause, daysAgoWords, gateWords, movedOnLineOf } from '../../src/web/views/pause-page.ts';
import type { ComposedPause } from '../../src/web/views/pause-page.ts';
import { GateBar, PauseView, pauseHeaderProps } from '../../src/web/views/pause-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

// The one real hook the toggle test replaces: with `on` set, useState is a cell the test can read and flip, so the
// click handler can be exercised without a DOM. Everything else, and every other test, uses React as it is.
const cell = vi.hoisted(() => ({ on: false, value: false }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: ((initial: unknown) =>
      cell.on
        ? [
            cell.value,
            (next: unknown) => {
              cell.value = typeof next === 'function' ? (next as (value: boolean) => boolean)(cell.value) : (next as boolean);
            },
          ]
        : actual.useState(initial)) as typeof actual.useState,
  };
});

const HANDOFF = '.planning/HANDOFF.json';
const READ_AT = '2026-04-21T09:00:00.000Z';

function inputOf(presentation: ProjectPresentation, path: string, readAt = READ_AT): ViewInput {
  const context = buildPauseContext(presentation, path);
  const kind = path.endsWith('HANDOFF.json') ? 'handoff' : 'continue-here';
  return {
    kind,
    frontmatter: {},
    structured: {},
    groups: [],
    planSegments: [],
    pauseContext: context === null ? null : { ...context, readAt },
  };
}

function planted(presentation: ProjectPresentation, change: (copy: ProjectPresentation) => void): ProjectPresentation {
  const copy = structuredClone(presentation);
  change(copy);
  return copy;
}

function pauseOf(presentation: ProjectPresentation, path = HANDOFF, readAt = READ_AT): ComposedPause {
  const model = composePause(inputOf(presentation, path, readAt));
  expect(model, path).not.toBeNull();
  return model as ComposedPause;
}

function markup(model: ComposedPause): string {
  return renderToStaticMarkup(createElement(PauseView, { model }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

async function shapes(): Promise<ProjectPresentation> {
  return (await loadShapesProject()).presentation;
}

afterEach(() => {
  cell.on = false;
  cell.value = false;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('daysAgoWords', () => {
  it('says today at 0, "1 day ago" at 1 and "{n} days ago" after, in whole UTC days', () => {
    expect(daysAgoWords('2026-04-21T00:00:00Z', '2026-04-21T23:59:59Z')).toBe('today');
    expect(daysAgoWords('2026-04-20T23:59:59Z', '2026-04-21T00:00:01Z')).toBe('1 day ago');
    expect(daysAgoWords('2026-03-22', '2026-04-21')).toBe('30 days ago');
    expect(gateWords(1)).toBe('1 gate');
    expect(gateWords(4)).toBe('4 gates');
  });

  it('says today for a pause dated after the read, and nothing for a date it cannot read', () => {
    expect(daysAgoWords('2026-05-01', '2026-04-21')).toBe('today');
    expect(daysAgoWords('last week', '2026-04-21')).toBeNull();
    expect(daysAgoWords('2026-04-21', undefined)).toBeNull();
    expect(daysAgoWords(undefined, '2026-04-21')).toBeNull();
    expect(daysAgoWords('2026-13-45', '2026-04-21')).toBeNull();
  });
});

describe('composePause - Lendshed /handoff, the pair that disagrees', () => {
  it('heads the page with the context, the phase name and the pause date with its age', async () => {
    const model = pauseOf(await lendshed());
    expect(model.head.eyebrow).toBe('Paused work · phase 3');
    expect(model.head.title).toBe('Account Admin & Sessions');
    expect(model.head.dateLine).toBe('Paused in phase 3, 2026-04-06 · 15 days ago');
    expect(model.head.files.map((file) => file.name)).toEqual(['HANDOFF.json', '.continue-here.md']);
    expect(model.head.missingPartner).toBeNull();
    expect(pauseHeaderProps(model, 'HANDOFF.json')).toMatchObject({
      eyebrow: 'Paused work · phase 3',
      title: 'Account Admin & Sessions',
      path: null,
    });
  });

  it('counts the age to the read day: today at 0 and "1 day ago" at 1', async () => {
    const presentation = await lendshed();
    expect(pauseOf(presentation, HANDOFF, '2026-04-06T20:00:00Z').head.dateLine).toBe('Paused in phase 3, 2026-04-06 · today');
    expect(pauseOf(presentation, HANDOFF, '2026-04-07T01:00:00Z').head.dateLine).toBe('Paused in phase 3, 2026-04-06 · 1 day ago');
  });

  it('lists the done tasks behind the stop and the tasks left ahead, a plan-shaped entry as one chip with its count', async () => {
    const model = pauseOf(await lendshed());
    expect(model.behind?.label).toBe('Behind you · 2 tasks done');
    expect(model.behind?.chips.map((chip) => chip.commit)).toEqual(['a41c9e2', 'b7d03f5']);
    expect(model.behind?.chips.every((chip) => chip.tone === 'complete')).toBe(true);
    expect(model.ahead?.label).toBe('Ahead · 3 tasks left');
    expect(model.ahead?.chips.map((chip) => chip.count)).toEqual([null, null, '2 tasks']);
    expect(model.ahead?.chips[2]?.label).toBe('03-04 Run the member lifecycle end to end');
    expect(model.ahead?.chips.every((chip) => chip.tone === 'quiet')).toBe(true);
  });

  it('puts the stop at task 3 of 6 with the status verbatim', async () => {
    const { stop } = pauseOf(await lendshed());
    expect(stop.label).toBe('Stopped here · task 3 of 6 · paused');
    expect(stop.title).toBe("Keep a deleted member's loans attributed in the loan log");
    expect(stop.progress).toContain('migration written and applied to the dev copy');
  });

  it('orders the gates human action, human action, constraint, constraint, anti-pattern and numbers them', async () => {
    const { gates } = pauseOf(await lendshed());
    expect(gates.clearedLabel).toBeNull();
    expect(gates.items.map((gate) => gate.label)).toEqual([
      'Gate 1 of 5 · Human action',
      'Gate 2 of 5 · Human action',
      'Gate 3 of 5 · Constraint',
      'Gate 4 of 5 · Constraint',
      'Gate 5 of 5 · Anti-pattern',
    ]);
    expect(gates.items[0]?.what).toBe('Confirm the retention window for disabled accounts');
    expect(gates.items[0]?.file).toBe('HANDOFF.json');
    expect(gates.items[2]?.file).toBe('.continue-here.md');
    expect(gates.items[4]?.howLabel).toBe('Prevention');
    expect(gates.items[4]?.how).toContain('a test deletes a member');
  });

  it('branches the non-blocking action and the advisory anti-pattern off beside the stop and the first gate', async () => {
    const model = pauseOf(await lendshed());
    expect([...model.stopSideNotes, ...model.gateSideNotes].map((note) => note.label).sort()).toEqual(['Advisory', 'Can wait']);
    expect(model.stopSideNotes).toHaveLength(1);
    expect(model.gateSideNotes).toHaveLength(1);
  });

  it('resumes after the gate count with both next-action wordings, the second never merged into the first', async () => {
    const { resume } = pauseOf(await lendshed());
    expect(resume.label).toBe('Resume here, after 5 gates');
    expect(resume.next).toEqual({
      text: 'Point the loan log at the name snapshot column, then rerun the loan log tests',
      file: 'HANDOFF.json',
    });
    expect(resume.other?.file).toBe('.continue-here.md');
    expect(resume.other?.text).toContain('Start with: move the loan log read onto the name snapshot column');
  });

  it('shows one disagreement per differing field, task and status, each naming both files, never the next action', async () => {
    const { stop } = pauseOf(await lendshed());
    expect(stop.disagreements.map((row) => row.field)).toEqual(['task', 'status']);
    const [task, status] = stop.disagreements;
    expect(task?.left).toEqual({ label: 'HANDOFF.json', value: '3' });
    expect(task?.right).toEqual({ label: '.continue-here.md', value: '4' });
    expect(status?.left).toEqual({ label: 'HANDOFF.json', value: 'paused' });
    expect(status?.right).toEqual({ label: '.continue-here.md', value: 'blocked' });
  });

  it('opens the same page from the .continue-here.md address', async () => {
    const presentation = await lendshed();
    const fromNote = pauseOf(presentation, '.planning/.continue-here.md');
    const fromHandoff = pauseOf(presentation);
    expect(fromNote.stop).toEqual(fromHandoff.stop);
    expect(fromNote.gates).toEqual(fromHandoff.gates);
    expect(fromNote.resume).toEqual(fromHandoff.resume);
  });
});

describe('composePause - gates in the planted shapes', () => {
  async function withoutBlocking(): Promise<ProjectPresentation> {
    return planted(await lendshed(), (draft) => {
      const handoff = draft.artifacts.find((artifact) => artifact.path === HANDOFF)!;
      const pause = handoff.structured.pause as { humanActions: { blocking: boolean }[] };
      for (const action of pause.humanActions) action.blocking = false;
      const note = draft.artifacts.find((artifact) => artifact.path === '.planning/.continue-here.md')!;
      const lift = note.structured.pause as { constraints: unknown[]; antiPatterns: { blocking: boolean }[] };
      lift.constraints = [];
      for (const row of lift.antiPatterns) row.blocking = false;
    });
  }

  it('shows one cleared gate and still shows the next action when nothing blocks resuming', async () => {
    const model = pauseOf(await withoutBlocking());
    expect(model.gates.items).toEqual([]);
    expect(model.gates.clearedLabel).toBe('No gates: nothing blocks resuming');
    expect(model.resume.label).toBe('Resume here');
    expect(model.resume.next?.text).toContain('Point the loan log at the name snapshot column');
    const html = markup(model);
    expect(html).toContain('No gates: nothing blocks resuming');
    expect(html).toContain('Resume here');
    expect(html).not.toContain('Mark as read');
  });

  it('reads "after 1 gate" and "Gate 1 of 1" with a single blocking item', async () => {
    const presentation = planted(await withoutBlocking(), (draft) => {
      const handoff = draft.artifacts.find((artifact) => artifact.path === HANDOFF)!;
      const pause = handoff.structured.pause as { humanActions: { blocking: boolean }[] };
      pause.humanActions[0]!.blocking = true;
    });
    const model = pauseOf(presentation);
    expect(model.resume.label).toBe('Resume here, after 1 gate');
    expect(model.gates.items.map((gate) => gate.label)).toEqual(['Gate 1 of 1 · Human action']);
  });
});

describe('composePause - the older HANDOFF layout (Shapes)', () => {
  it('shows the head, the stop line and the next action with no Behind and no Ahead', async () => {
    const model = pauseOf(await shapes(), HANDOFF, '2026-05-10T00:00:00Z');
    expect(model.behind).toBeNull();
    expect(model.ahead).toBeNull();
    expect(model.stop.label).toBe('Stopped here · task 2 of 5 · paused');
    expect(model.head.dateLine).toBe('Paused in phase 2, 2026-05-09 · 1 day ago');
    expect(model.resume.next?.text).toBe('Wire the cone field into the recipe form, then rerun the form tests');
    const html = markup(model);
    expect(html).not.toContain('Behind you');
    expect(html).not.toContain('Ahead');
    expect(html).toContain('aria-current="step"');
  });

  it('composes nothing without a pause context, so the page keeps the promoted sections silently', () => {
    expect(composePause({ kind: 'handoff', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
    expect(
      composePause({ kind: 'handoff', frontmatter: {}, structured: {}, groups: [], planSegments: [], pauseContext: null }),
    ).toBeNull();
  });
});

describe('PauseView - static markup of the gate path', () => {
  it('draws one ordered list on one rail with the stop as the current step', async () => {
    const html = markup(pauseOf(await lendshed()));
    expect(count(html, '<ol')).toBe(1);
    expect(count(html, 'aria-current="step"')).toBe(1);
    expect(html).toContain('Stopped here · task 3 of 6 · paused');
    expect(html).toContain('Gate 1 of 5 · Human action');
    expect(html).toContain('Gate 5 of 5 · Anti-pattern');
    expect(html).toContain('Resume here, after 5 gates · next action');
    expect(html).toContain('Behind you · 2 tasks done');
    expect(html).toContain('Ahead · 3 tasks left');
    expect(html).toContain('Can wait');
    expect(html).toContain('Advisory');
    // The path reads in order: behind, stop, gates, resume, ahead.
    const order = ['Behind you', 'Stopped here', 'Gate 1 of 5', 'Gate 5 of 5', 'Resume here', 'Ahead'].map((word) => html.indexOf(word));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('gives every gate a real button labelled Mark as read, not pressed, and no gate a pass', async () => {
    const html = markup(pauseOf(await lendshed()));
    expect(count(html, 'Mark as read')).toBe(5);
    expect(count(html, 'aria-pressed="false"')).toBe(5);
    expect(count(html, '<button')).toBe(count(html, 'aria-pressed'));
  });

  it('draws each disagreement as a dashed block naming both files, with "differs from" for a screen reader', async () => {
    const html = markup(pauseOf(await lendshed()));
    expect(count(html, 'class="record-disagreement"')).toBe(2);
    expect(count(html, 'differs from')).toBe(2);
    expect(html).toContain('task · HANDOFF.json');
    expect(html).toContain('task · .continue-here.md');
    expect(html).toContain('status · HANDOFF.json');
    expect(html).toContain('status · .continue-here.md');
    expect(html).toContain('The two files disagree; both values are shown as written.');
  });

  it("shows continue-here's own wording under the boxed next action when it differs", async () => {
    const html = markup(pauseOf(await lendshed()));
    expect(html).toContain('.continue-here.md: “');
    expect(html).toContain('Start with: move the loan log read');
  });

  it('wraps a long next action and never truncates it', () => {
    const long = `Start with ${'a very long next action '.repeat(60)}`;
    const model = composePause({
      kind: 'handoff',
      frontmatter: {},
      structured: {},
      groups: [],
      planSegments: [],
      pauseContext: {
        active: 'handoff',
        contextLabel: 'phase 9',
        headPhase: { number: '9', name: null },
        files: { handoff: { path: HANDOFF, url: '/handoff' }, continueHere: null },
        pausedAt: null,
        movedOn: null,
        stop: { task: 1, totalTasks: 2, status: 'paused', taskName: null, progress: null },
        behind: [],
        ahead: [],
        gates: [],
        sideNotes: [],
        nextAction: { text: long, file: 'HANDOFF.json' },
        nextActionOther: null,
        disagreements: [],
        restSections: [],
        omitted: 0,
        readAt: READ_AT,
      },
    }) as ComposedPause;
    expect(model.head.title).toBe('Phase 9');
    expect(model.head.missingPartner).toBe('No .continue-here.md beside it');
    expect(model.head.dateLine).toBeNull();
    expect(markup(model)).toContain(long.trim());
  });
});

describe('Mark as read - view state only', () => {
  it('flips aria-pressed on every gate with no request and no storage write', async () => {
    const model = pauseOf(await lendshed());
    const fetchSpy = vi.fn();
    const xhrSpy = vi.fn();
    const beaconSpy = vi.fn();
    const storage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('XMLHttpRequest', xhrSpy);
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('sessionStorage', storage);
    vi.stubGlobal('navigator', { sendBeacon: beaconSpy });

    type ButtonElement = { props: { onClick: () => void; 'aria-pressed': boolean } };
    function findButton(node: unknown): ButtonElement | null {
      if (node === null || typeof node !== 'object') return null;
      const element = node as { type?: unknown; props?: { children?: unknown } };
      if (element.type === 'button') return element as unknown as ButtonElement;
      const children = element.props?.children;
      for (const child of Array.isArray(children) ? children : [children]) {
        const found = findButton(child);
        if (found !== null) return found;
      }
      return null;
    }
    function chipWords(node: unknown): string {
      return JSON.stringify(node, (key, value) => (key === '_owner' || key === '_store' ? undefined : value));
    }

    cell.on = true;
    expect(model.gates.items.length).toBe(5);
    for (const gate of model.gates.items) {
      cell.value = false;
      const before = GateBar({ gate });
      const button = findButton(before);
      expect(button, gate.label).not.toBeNull();
      expect(button?.props['aria-pressed']).toBe(false);
      expect(chipWords(before)).not.toContain('"Read"');
      button?.props.onClick();
      expect(cell.value).toBe(true);
      const after = GateBar({ gate });
      expect(findButton(after)?.props['aria-pressed']).toBe(true);
      // The button's label stays "Mark as read"; the word "Read" appears beside the bar.
      expect(chipWords(after)).toContain('Mark as read');
      expect(chipWords(after)).toContain('"Read"');
      findButton(after)?.props.onClick();
      expect(cell.value).toBe(false);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
  });
});

const PHASE3_NESTED = '.planning/phases/03-account-admin-and-sessions/.continue-here.md';
const SPIKE6_NOTE = '.planning/spikes/SPIKE-006/.continue-here.md';
const ROOT_NOTE = '.planning/.continue-here.md';

function headerMarkup(model: ComposedPause): string {
  const props = pauseHeaderProps(model, 'HANDOFF.json');
  return renderToStaticMarkup(createElement('div', null, props.lead, props.meta));
}

function withHandoffPause(
  presentation: ProjectPresentation,
  change: (pause: Record<string, unknown>) => void,
): ProjectPresentation {
  return planted(presentation, (copy) => {
    const artifact = copy.artifacts.find((candidate) => candidate.path === HANDOFF)!;
    change(artifact.structured!.pause as Record<string, unknown>);
  });
}

describe('composePause - nested pauses are headed with their own context (D-07)', () => {
  it('heads the phase 3 folder note "Paused in phase 4" from its phase frontmatter, with no moved-on note and no HANDOFF', async () => {
    const model = pauseOf(await lendshed(), PHASE3_NESTED);
    expect(model.head.eyebrow).toBe('Paused work · phase 4');
    expect(model.head.title).toBe('Bulk Loan Export');
    expect(model.head.dateLine).toBe('Paused in phase 4, 2026-04-10 · 11 days ago');
    expect(model.head.movedOn).toBeNull();
    expect(model.head.movedOnLine).toBeNull();
    expect(model.head.files.map((file) => file.path)).toEqual([PHASE3_NESTED]);
    expect(model.head.missingPartner).toBe('No HANDOFF.json');
    expect(headerMarkup(model)).toContain('No HANDOFF.json');
    expect(headerMarkup(model)).not.toContain('Work has moved on since');
  });

  it('heads the spike folder note "Paused in spike SPIKE-006" from its context frontmatter and location', async () => {
    const model = pauseOf(await lendshed(), SPIKE6_NOTE);
    expect(model.head.eyebrow).toBe('Paused work · spike SPIKE-006');
    expect(model.head.title).toBe('Spike SPIKE-006');
    expect(model.head.dateLine).toBe('Paused in spike SPIKE-006, 2026-04-12 · 9 days ago');
    expect(model.head.movedOn).toBeNull();
    expect(model.head.missingPartner).toBe('No HANDOFF.json');
  });
});

describe('PauseView head - the moved-on note, the copy-path buttons and the missing partner (D-08)', () => {
  it('shows "Work has moved on since" for Lendshed phase 3 beside the date, apart from the stop and gate fields', async () => {
    const model = pauseOf(await lendshed());
    expect(model.head.movedOnLine).toBe(
      'Work has moved on since: Phase 3 Account Admin & Sessions is behind the current phase 4 Bulk Loan Export (STATE, 2026-04-14)',
    );
    const head = headerMarkup(model);
    expect(head).toContain('view-pause-moved');
    expect(head).toContain('Work has moved on since:');
    expect(head).toContain('(STATE, 2026-04-14)');
    expect(head.indexOf('view-pause-lead')).toBeLessThan(head.indexOf('view-pause-moved'));
    // The page body (the stop, the gates, the rest) never carries the note.
    expect(markup(model)).not.toContain('Work has moved on since');
  });

  it('leaves the date out of the note when the source states none, and draws nothing without a note', () => {
    expect(movedOnLineOf({ what: 'spike 003 is marked VALIDATED in the manifest', source: 'MANIFEST', date: null })).toBe(
      'Work has moved on since: spike 003 is marked VALIDATED in the manifest (MANIFEST)',
    );
    expect(movedOnLineOf(null)).toBeNull();
  });

  it('draws a copy-path button per file, labelled with the file name, and titled with its path', async () => {
    const model = pauseOf(await lendshed());
    const head = headerMarkup(model);
    expect(count(head, 'view-pause-copy"')).toBe(2);
    expect(head).toContain('aria-label="Copy path of HANDOFF.json"');
    expect(head).toContain('aria-label="Copy path of .continue-here.md"');
    expect(head).toContain('title=".planning/HANDOFF.json"');
  });

  it('draws one copy-path button and "No .continue-here.md beside it" when the HANDOFF stands alone', async () => {
    const alone = planted(await shapes(), (copy) => {
      copy.artifacts = copy.artifacts.filter((artifact) => artifact.kind !== 'continue-here');
    });
    const model = pauseOf(alone);
    expect(model.head.files.map((file) => file.name)).toEqual(['HANDOFF.json']);
    const head = headerMarkup(model);
    expect(count(head, 'view-pause-copy"')).toBe(1);
    expect(head).toContain('No .continue-here.md beside it');
  });

  it('draws Shapes (older layout) with its root pair, both files copyable', async () => {
    const model = pauseOf(await shapes(), HANDOFF, '2026-05-10T00:00:00Z');
    expect(model.head.files.map((file) => file.name)).toEqual(['HANDOFF.json', '.continue-here.md']);
    expect(model.head.missingPartner).toBeNull();
  });
});

describe('PauseView - the rest of the handoff', () => {
  it('lists closed bars for Lendshed in order, each tagged with its file, lists carrying their count', async () => {
    const model = pauseOf(await lendshed());
    expect(model.rest.map((bar) => [bar.title, bar.file, bar.count])).toEqual([
      ['Blockers', 'HANDOFF.json', '2'],
      ['Decisions', 'HANDOFF.json', '2'],
      ['Uncommitted files', 'HANDOFF.json', '3'],
      ['Context notes', 'HANDOFF.json', null],
      ['Other keys', 'HANDOFF.json', '1'],
      ['Current state', '.continue-here.md', null],
      ['Completed work', '.continue-here.md', null],
      ['Remaining work', '.continue-here.md', null],
      ['Decisions made', '.continue-here.md', null],
      ['Blockers', '.continue-here.md', null],
      ['Context', '.continue-here.md', null],
    ]);
    const html = markup(model);
    expect(html).toContain('The rest of the handoff');
    expect(count(html, '<details')).toBe(model.rest.length);
    expect(html).not.toMatch(/<details[^>]* open/);
  });

  it('keeps unknown keys by name only', async () => {
    const model = pauseOf(await lendshed());
    const other = model.rest.find((bar) => bar.title === 'Other keys')!;
    expect(other.body.kind).toBe('items');
    if (other.body.kind === 'items') {
      for (const item of other.body.items) {
        expect(item.detail).toBeNull();
        expect(item.text).toMatch(/^[\w.-]+$/);
      }
    }
  });

  it('folds a planted 40-file uncommitted list into one closed bar with 40 in its summary and the full value in each title', async () => {
    const files = Array.from(
      { length: 40 },
      (_, index) => ` M src/area-${index}/${'deeply/nested/'.repeat(8)}file-${index}.ts`,
    );
    const model = pauseOf(withHandoffPause(await lendshed(), (pause) => (pause.uncommittedFiles = files)));
    const bars = model.rest.filter((bar) => bar.title === 'Uncommitted files');
    expect(bars).toHaveLength(1);
    expect(bars[0].count).toBe('40');
    const html = markup(model);
    expect(html).toContain('view-pause-bar-count">40<');
    expect(count(html, 'class="view-pause-paths"')).toBe(1);
    expect(count(html, 'title=" M src/area-')).toBe(40);
    // The full value is in the title, so an ellipsised line loses nothing.
    expect(html).toContain(`title="${files[39]}"`);
  });

  it('gives a long context note one closed bar and keeps its paragraphs and list', async () => {
    const note = ['First paragraph.', '', 'Second paragraph over', 'two lines.', '', '- one', '- two', '', 'x'.repeat(3000)].join('\n');
    const model = pauseOf(withHandoffPause(await lendshed(), (pause) => (pause.contextNotes = note)));
    const bar = model.rest.find((candidate) => candidate.title === 'Context notes')!;
    expect(bar.body.kind).toBe('blocks');
    if (bar.body.kind === 'blocks') {
      expect(bar.body.blocks.map((block) => block.kind)).toEqual(['paragraph', 'paragraph', 'list', 'paragraph']);
      expect(bar.body.blocks[1]).toEqual({ kind: 'paragraph', text: 'Second paragraph over\ntwo lines.' });
    }
    const html = markup(model);
    expect(html).toContain('Second paragraph over\ntwo lines.');
    expect(html).not.toMatch(/<details[^>]* open/);
  });

  it('sends a continue-here section the document also renders through that sanitised HTML, a later heading claiming first', async () => {
    const presentation = planted(await lendshed(), (copy) => {
      const note = copy.artifacts.find((candidate) => candidate.path === ROOT_NOTE)!;
      const pause = note.structured!.pause as { sections?: { heading: string; text: string }[] };
      pause.sections = [
        { heading: 'Required Reading', text: 'Read the saved list notes.' },
        { heading: 'Context', text: 'A heading section named like a tag.' },
      ];
    });
    const input: ViewInput = {
      ...inputOf(presentation, ROOT_NOTE),
      groups: [
        {
          id: 'required-reading',
          heading: 'Required Reading',
          html: '<h2>Required Reading</h2><p>Read the <em>saved</em> list notes.</p>',
        },
        { id: 'context', heading: 'Context', html: '<h2>Context</h2><p>A heading section named like a tag.</p>' },
      ],
    };
    const model = composePause(input)!;
    const reading = model.rest.find((bar) => bar.title === 'Required Reading')!;
    expect(reading.file).toBe('.continue-here.md');
    expect(reading.body).toEqual({
      kind: 'html',
      html: '<h2>Required Reading</h2><p>Read the <em>saved</em> list notes.</p>',
    });
    // Two sections are named Context (the tag, then the heading); the later one takes the document's HTML.
    const contexts = model.rest.filter((bar) => bar.title === 'Context');
    expect(contexts.map((bar) => bar.body.kind)).toEqual(['blocks', 'html']);
    const html = renderToStaticMarkup(
      createElement(PauseView, {
        model,
        renderHtml: (value: string) => createElement('div', { 'data-html': 'true' }, value),
      }),
    );
    expect(html).toContain('view-pause-plain-section');
    // The leading heading is stripped by the browser's DOMParser (absent here), so the body is the section's HTML.
    expect(html).toContain('Read the &lt;em&gt;saved&lt;/em&gt; list notes.');
  });

  it('draws no rest section when the files hold nothing below the path', async () => {
    const model = pauseOf(await lendshed());
    const empty: ComposedPause = { ...model, rest: [] };
    expect(markup(empty)).not.toContain('The rest of the handoff');
  });
});

describe('the dashboard shows no Paused mark (D-06)', () => {
  it('no dashboard module reads HANDOFF.json or .continue-here.md', async () => {
    const files: string[] = [];
    for (const dir of ['src/presentation', 'src/web/pages']) {
      for (const name of await readdir(new URL(`../../${dir}`, import.meta.url))) {
        if (name.startsWith('dashboard') && (name.endsWith('.ts') || name.endsWith('.tsx'))) files.push(`${dir}/${name}`);
      }
    }
    expect(files.length).toBeGreaterThan(3);
    for (const path of files) {
      const text = await source(path);
      expect(text, path).not.toMatch(/HANDOFF|continue-here/i);
    }
  });
});

// ---------------------------------------------------------------------------
// The view contract: source-text checks in the dom-verify-page idiom (no AST tooling). Comments are stripped before
// every negative check.
// ---------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-11-pause:start */';
const END = '/* phase-11-pause:end */';
const COMPOSER = 'src/web/views/pause-page.ts';
const COMPONENTS = 'src/web/views/pause-page-components.tsx';
const SHARED = 'src/web/components/record-disagreement.tsx';
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
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) ||
    /data-tone="(destructive|warning)"/.test(text) ||
    /'(destructive|warning)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning)'/.test(text)
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

function fontSizes(block: string): string[] {
  return [...block.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1]!.trim());
}

describe('pause view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesNetworkOrStorage("await fetch('/x')")).toBe(true);
    expect(writesNetworkOrStorage("window.localStorage.setItem('a', 'b')")).toBe(true);
    expect(buildsRegExp('const re = new RegExp(text);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });
});

describe('pause view contract - the real sources', () => {
  it('the components render no raw HTML, make no request, touch no storage and write no destructive or warning tone', async () => {
    for (const path of [COMPONENTS, SHARED]) {
      const code = stripSourceComments(await source(path));
      expect(code.includes(RAW_HTML_PROP), path).toBe(false);
      expect(writesNetworkOrStorage(code), path).toBe(false);
      expect(writesForbiddenTone(code), path).toBe(false);
    }
    expect(stripSourceComments(await source(COMPONENTS))).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline as React text, never straight into markup', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../pages/research-atoms.tsx'");
    expect(code).toContain('<ResearchInline text={resume.next.text} />');
    expect(code).toContain('<ResearchInline text={gate.what} />');
    expect(stripSourceComments(await source(SHARED))).toContain('<ResearchInline text={left.value} />');
  });

  it('the page writes the contract: aria-pressed, aria-current, the shared disagreement block and the copy rows', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('aria-pressed={read}');
    expect(code).toContain("aria-current={current ? 'step' : undefined}");
    expect(code).toContain('<RecordDisagreement');
    expect(code).toContain('Mark as read');
    const composer = stripSourceComments(await source(COMPOSER));
    expect(composer).toContain('No gates: nothing blocks resuming');
    expect(composer).toContain("'Resume here'");
    expect(composer).toContain('No .continue-here.md beside it');
    expect(composer).toContain('No HANDOFF.json');
    expect(stripSourceComments(await source(SHARED))).toContain('differs from');
  });

  it('writes the moved-on words, the rest-of-the-handoff heading and the ellipsised mono paths', async () => {
    const composer = stripSourceComments(await source(COMPOSER));
    expect(composer).toContain('Work has moved on since');
    const components = stripSourceComments(await source(COMPONENTS));
    expect(components).toContain('The rest of the handoff');
    expect(components).toContain('<details');
    expect(components).not.toMatch(/<details[^>]*\bopen\b/);
    const css = await source('src/web/styles/globals.css');
    const block = stripCssComments(css.slice(css.indexOf(START), css.indexOf(END)));
    const paths = block.slice(block.indexOf('.view-pause-paths > li'));
    expect(paths.slice(0, paths.indexOf('}'))).toContain('text-overflow: ellipsis');
    expect(block.slice(block.indexOf('.view-pause-moved {'))).toContain('border: 1px dashed var(--muted-foreground)');
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

  it('the composer writes only the four tones and neither parse-degradation tone', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).not.toContain("'destructive'");
    expect(code).not.toContain("'warning'");
  });

  it('artifact-page.tsx draws the page from the composed model in View mode and the manifest keeps its fallback', async () => {
    const code = stripSourceComments(await source('src/web/pages/artifact-page.tsx'));
    expect(code).toContain('<PauseView key={artifact.path} model={pauseCover} renderHtml={renderHtml} />');
    expect(code).toContain('manifest.pausePage?.(viewInput)');
    expect(code).toContain('pauseContext: query.data.pauseContext ?? null');
    expect(code).not.toMatch(/artifact\.kind === ['"](handoff|continue-here|pause)['"]/);
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests.match(/pausePage: composePause/g)).toHaveLength(1);
  });

  it('the CSS holds one contiguous phase-11-pause block with no colour recipe and only the four contracted font sizes', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(count(css, START)).toBe(1);
    expect(count(css, END)).toBe(1);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-pause-/);
    const sizes = fontSizes(stripCssComments(block));
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    for (const selector of ['.view-pause-root', '.view-pause-path', '.view-pause-gate', '.view-pause-next', '.record-disagreement']) {
      expect(block, selector).toContain(selector);
    }
  });

  it('reuses no research-* or view-codebase-* class, and every class it writes is its own or the shared disagreement block', async () => {
    for (const path of [COMPONENTS, SHARED]) {
      const code = stripSourceComments(await source(path));
      expect(code, path).not.toMatch(/className=["'{][^>]*\b(research-|view-codebase-)/);
    }
    const block = stripCssComments(await source('src/web/styles/globals.css'));
    const inside = block.slice(block.indexOf('.view-pause-root'));
    expect(inside).not.toMatch(/\.view-codebase-|\.research-/);
  });

  it('records the shared block, the tone uses and the language bullets in design-language.md', async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('| `record-disagreement` |');
    expect(doc).toContain('**The pause page.**');
    expect(doc).toContain('**Mark as read.**');
    for (const tone of ['complete', 'in-flight', 'missing', 'quiet']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).toContain('(Phase 11, 11-10) on the pause page');
    }
  });
});
