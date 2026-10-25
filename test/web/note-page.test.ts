// quick-261023-61l (sketch 028 A) and quick-261023-u13 (sketch 029 A: gist console): the NOTE composer and its
// view, pinned against the fixture project, the synthetic notes and labelore's own notes loaded as one
// project, and inline notes for the branches those do not cover. ViewInput literals are built from the
// handler's real parse (through the presentation) and the real join; pinned values come from the sketch's
// own data (its `quickModel`, `exploreModel` and `journey`, run in a browser at its NOW of 23 Oct 2026
// 12:00) and the source files, never from the composer's output. The dates and the age hold under any
// time zone: the composer reads them literally and the tests pass the clock in.
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
import { composeNotePage, dropLeadingH1, sectionHtml } from '../../src/web/views/note-page.ts';
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

/** The sketch's NOW: 23 Oct 2026, 12:00 local. */
const NOW = new Date(2026, 9, 23, 12, 0);

function page(key: Key, headings: ViewInput['headings'] = []): ComposedNotePage {
  const model = composeNotePage(inputOf(key, headings), { now: NOW });
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

const count = (html: string, needle: string): number => html.split(needle).length - 1;


const statsOf = (model: ComposedNotePage): [string, string, string | null][] => model.rail.stats.map((stat) => [stat.label, stat.value, stat.tone]);
const firstText = (runs: { text: string }[]): string => runs.map((run) => run.text).join('');

describe('the rail of a quick note', () => {
  it('dcrop: the file-name title, Shipped, the big 6 with its count line, and the stats in order', () => {
    const model = page('dcrop');
    expect(model.shape).toBe('quick');
    expect(model.rail.eyebrow).toBe('Note');
    expect(model.rail.title).toBe('Crop images and profile photos');
    expect(model.rail.context).toBeNull();
    expect(model.rail.stage).toEqual({ key: 'done', text: 'Shipped' });
    expect(model.rail.big).toEqual({
      value: '6',
      label: 'things it says, after the gist',
      sub: '1 decided · 1 ask · 1 problem · 3 limits',
      stage: 'done',
    });
    expect(statsOf(model)).toEqual([
      ['Noted', '21 Oct 2026 · 15:58', null],
      ['Age', '2 days', null],
      ['Promoted', 'Yes', null],
      ['Todo', 'Done', 'complete'],
      ['Note → shipped', '2 days', null],
      ['Mentions', '1', null],
      ['Words', '228', null],
    ]);
  });
  it('the other shipped notes: counts, ages, mentions and words', () => {
    const dround = page('dround');
    expect([dround.rail.title, dround.rail.stage.text, dround.rail.big.value, dround.rail.big.sub]).toEqual([
      'Round profile photos',
      'Shipped',
      '4',
      '1 decided · 1 ask · 1 problem · 1 limit',
    ]);
    expect(statsOf(dround)).toEqual([
      ['Noted', '21 Oct 2026 · 15:58', null],
      ['Age', '2 days', null],
      ['Promoted', 'Yes', null],
      ['Todo', 'Done', 'complete'],
      ['Note → shipped', '2 days', null],
      ['Mentions', '2', null],
      ['Words', '174', null],
    ]);
    const dsfx = page('dsfx');
    expect([dsfx.rail.title, dsfx.rail.big.value, dsfx.rail.big.sub, dsfx.gist.line]).toEqual([
      'Sound effects',
      '4',
      '2 decided · 1 ask · 1 limit',
      'Became a todo and shipped.',
    ]);
    expect(statsOf(dsfx).map(([label]) => label)).toEqual(['Noted', 'Age', 'Promoted', 'Todo', 'Mentions', 'Words']);
    expect(statsOf(dsfx).filter(([label]) => ['Age', 'Mentions', 'Words'].includes(label))).toEqual([
      ['Age', '3 days', null],
      ['Mentions', '1', null],
      ['Words', '131', null],
    ]);
    const dcall = page('dcall');
    expect([dcall.rail.title, dcall.rail.big.value, dcall.rail.big.sub]).toEqual(['Call debug logging webrtc turn', '4', '2 asks · 1 problem · 1 limit']);
    expect(statsOf(dcall).filter(([label]) => ['Age', 'Mentions', 'Words'].includes(label))).toEqual([
      ['Age', '3 days', null],
      ['Mentions', '0', null],
      ['Words', '161', null],
    ]);
  });
  it('dcrop: the gist said large and where the note went', () => {
    const model = page('dcrop');
    expect(firstText(model.gist.runs)).toBe('Crop for images before sending and for profile photos (she asked for it).');
    expect(model.gist.text).toBeNull();
    expect(model.gist.long).toBe(false);
    expect(model.gist.line).toBe('Became a todo and shipped 22 Oct 2026.');
  });
  it('dback and pcap are untraced: Promoted, no todo, the untraced sentence', () => {
    const dback = page('dback');
    expect(dback.rail.stage).toEqual({ key: 'untraced', text: 'Untraced' });
    expect([dback.rail.big.value, dback.rail.big.sub, dback.gist.line]).toEqual(['2', '1 ask · 1 problem', 'Promoted, but no todo carries it.']);
    expect(firstText(dback.gist.runs).startsWith('Bug: on the Pixel, pressing Android back')).toBe(true);
    expect(statsOf(dback).map(([label]) => label)).toEqual(['Noted', 'Age', 'Promoted', 'Mentions', 'Words']);
    expect(statsOf(dback).find(([label]) => label === 'Words')).toEqual(['Words', '109', null]);
    const pcap = page('pcap');
    expect([pcap.rail.stage.text, pcap.rail.big.value, pcap.rail.big.sub]).toEqual(['Untraced', '3', '1 ask · 1 problem · 1 limit']);
    expect(statsOf(pcap).filter(([label]) => ['Age', 'Mentions', 'Words'].includes(label))).toEqual([
      ['Age', '2 days', null],
      ['Mentions', '2', null],
      ['Words', '108', null],
    ]);
  });
  it('lsk: the completed todo makes it Shipped, the ledger has two missing Open question rows and the age is under a day', () => {
    const model = page('lsk');
    expect(model.rail.title).toBe('Sketches page in labelore');
    expect(model.rail.stage).toEqual({ key: 'done', text: 'Shipped' });
    expect([model.rail.big.value, model.rail.big.sub]).toEqual(['6', '1 ask · 1 problem · 2 open questions · 2 other']);
    expect(model.gist.line).toBe('Became a todo and shipped.');
    expect(statsOf(model)).toEqual([
      ['Noted', '23 Oct 2026 · 03:11', null],
      ['Age', 'less than a day', null],
      ['Promoted', 'Yes', null],
      ['Todo', 'Done', 'complete'],
      ['Mentions', '3', null],
      ['Words', '240', null],
    ]);
  });
});

describe('the ledger of a quick note', () => {
  it('dcrop: six numbered rows, the Decided date label, the index marks and the first sentence split out', () => {
    const model = page('dcrop');
    expect(model.ledger).toEqual({ title: 'What it says', kicker: '1 decided · 1 ask · 1 problem · 3 limits' });
    expect(model.toggle).toBe(true);
    expect(model.oneLine).toBeNull();
    expect(model.rows.map((row) => [row.index, row.label, row.tone, row.mark])).toEqual([
      ['01', 'Today', null, 'in-flight'],
      ['02', 'Decided · 21 Oct 2026', 'complete', 'complete'],
      ['03', 'How', null, null],
      ['04', 'Preset constraint', null, null],
      ['05', 'Estimated', null, null],
      ['06', 'Batch', null, null],
    ]);
    expect(model.rows.every((row) => !row.then)).toBe(true);
    expect(firstText(model.rows[1].first)).toBe('images only (no video trimming), no rotate.');
    expect(firstText(model.rows[1].rest).startsWith('One shared crop screen used in two places')).toBe(true);
    expect(model.mentions).toEqual([{ path: 'server/src/media/image.ts', count: 1 }]);
    expect(model.verbatim?.capped).toBe(false);
    expect(model.also).toEqual([{ label: 'Frontmatter', targetId: null }]);
    expect(model.cardsInRail).toBe(true);
  });
  it('dsfx: Suggested has an in-flight label and so an in-flight mark; the index run is 01 to 04', () => {
    expect(page('dsfx').rows.map((row) => [row.index, row.label, row.tone, row.mark])).toEqual([
      ['01', 'Decided', 'complete', 'complete'],
      ['02', 'Decided', 'complete', 'complete'],
      ['03', 'Suggested', 'in-flight', 'in-flight'],
      ['04', 'Limits', null, null],
    ]);
    expect(page('dcall').rows.map((row) => [row.label, row.tone, row.mark])).toEqual([
      ['Observed', 'in-flight', 'in-flight'],
      ['Want', null, null],
      ['Off limits', null, null],
      ['Output', null, null],
    ]);
  });
  it('lsk: the first row is the Then row, and Open question is missing on the label and the mark', () => {
    const model = page('lsk');
    expect(firstText(model.gist.runs)).toBe('Show sketches inside Labelore instead of a separate file server.');
    expect(model.rows.map((row) => [row.index, row.label, row.tone, row.mark])).toEqual([
      ['01', null, null, null],
      ['02', 'Want', null, null],
      ['03', 'Open question', 'missing', 'missing'],
      ['04', 'Open question', 'missing', 'missing'],
      ['05', 'Today', null, 'in-flight'],
      ['06', 'Suggested interim', null, null],
    ]);
    expect(model.rows[0].then).toBe(true);
    expect(model.mentions.map((m) => m.path)).toEqual(['sketches/MANIFEST.md', 'README.md', 'data.js']);
  });
});

describe('a one-line note', () => {
  it('star: the big 1, nothing else to lift, the whole line and a Where it went state with no toggle', () => {
    const model = page('star');
    expect(model.rail.title).toBe('Tariff note tooltips');
    expect(model.rail.stage).toEqual({ key: 'open', text: 'Todo open' });
    expect(model.rail.big).toEqual({
      value: '1',
      label: 'line, nothing else to lift',
      sub: '11 words · Became a todo, still open.',
      stage: 'open',
    });
    expect(model.rows).toEqual([]);
    expect(model.ledger).toBeNull();
    expect(model.toggle).toBe(false);
    expect(model.oneLine).toEqual({ whole: 'That’s the whole note: one line.', kicker: 'Todo open' });
    expect(model.cardsInRail).toBe(false);
    expect(model.mentions).toEqual([]);
    expect(statsOf(model)).toEqual([
      ['Noted', '16 Oct 2026 · 14:47', null],
      ['Age', '7 days', null],
      ['Promoted', 'Yes', null],
      ['Todo', 'Pending', 'in-flight'],
      ['Mentions', '0', null],
      ['Words', '11', null],
    ]);
  });
  it('sundo: still a note, not promoted, with the unpromoted sentence', () => {
    const model = page('sundo');
    expect(model.rail.title).toBe('Brokers want undo');
    expect(model.rail.stage).toEqual({ key: 'note', text: 'Still a note' });
    expect(model.rail.big.sub).toBe('23 words · Still a note, 15 days on.');
    expect(model.oneLine).toEqual({
      whole: 'That’s the whole note: one line. It hasn’t been promoted to a todo.',
      kicker: 'Still a note',
    });
    expect(statsOf(model)).toEqual([
      ['Noted', '8 Oct 2026 · 18:20', null],
      ['Age', '15 days', null],
      ['Promoted', 'No', 'missing'],
      ['Mentions', '0', null],
      ['Words', '23', null],
    ]);
  });
  it('an untraced one-liner has the whole line without the unpromoted sentence', () => {
    const base = { kind: 'note', frontmatter: { date: '2026-10-21 10:00', promoted: true }, structured: { note: { shape: 'quick', title: [{ kind: 'text', text: 'One thing.' }], rows: [], words: 2 } }, groups: [], planSegments: [] };
    const model = composeNotePage(base as unknown as ViewInput, { now: NOW });
    expect(model?.rail.stage.text).toBe('Untraced');
    expect(model?.oneLine?.whole).toBe('That’s the whole note: one line.');
    expect(model?.rail.big.sub).toBe('2 words · Promoted, but no todo carries it.');
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
  it('dback and pcap: promoted but untraced; sundo: still a note; lsurvey: no todo points here', () => {
    expect(page('dback').empty).toEqual({
      kicker: 'Promoted, but untraced',
      text: 'Marked `promoted: true`, but no todo names this note or carries its text.',
    });
    expect(page('pcap').empty?.kicker).toBe('Promoted, but untraced');
    expect(page('sundo').empty).toEqual({ kicker: 'Still a note', text: 'Not promoted to a todo.' });
    expect(page('lsurvey').empty).toEqual({ kicker: 'No todo points here', text: 'No todo names or mentions this note.' });
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
  it('never throws on junk, quick or explore', () => {
    const junk = [null, 1, 'x', [], [1, null], { a: 1 }, [{ heading: 5 }], [{ heading: 'H', items: 5, flags: [null, 3], figures: 'x', side: [1] }]];
    for (const value of junk) {
      expect(() =>
        composeNotePage(
          base(
            { note: { shape: 'quick', title: [{ kind: 'text', text: 'T' }, value, { kind: 5, text: 5 }], rows: value, mentions: value, verbatim: value, words: value, fileTitle: value, lines: value } },
            { date: value, promoted: value, context: value, title: value },
            { noteContext: { todos: value } as unknown as NoteContext, headings: value as never },
          ),
          { now: value as never },
        ),
      ).not.toThrow();
      expect(() =>
        composeNotePage(
          base(
            { note: { shape: 'document', sections: value, figures: value, flagTotals: value, points: value, tables: value, lede: value, boiler: value, summary: value, lines: value } },
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
  it('promoted as a string shows no Promoted row; a todo of junk is dropped', () => {
    const model = composeNotePage(
      base({ note: { shape: 'quick', title: [{ kind: 'text', text: 'T' }] } }, { promoted: 'true' }, {
        noteContext: { todos: [{ title: 5 }, { title: 'Ok', status: 'weird', level: 'weird', weightKind: 'x' }] } as unknown as NoteContext,
      }),
    );
    expect(statsOf(model as ComposedNotePage).map(([label]) => label)).toEqual(['Mentions']);
    expect(model?.todos).toHaveLength(1);
    expect(model?.todos[0].statusKey).toBe('unfiled');
    expect(model?.todos[0].weight).toEqual({ text: 'Unrated', level: 'unrated', title: 'No severity recorded' });
    expect(model?.empty).toBeNull();
  });
  it('dates, the age and the shipped date are read literally under any zone', () => {
    const quick = { note: { shape: 'quick', title: [{ kind: 'text', text: 'T' }] } };
    const stat = (frontmatter: unknown, label: string, context?: unknown): string | undefined =>
      statsOf(composeNotePage(base(quick, frontmatter, context ? { noteContext: context as NoteContext } : {}), { now: NOW }) as ComposedNotePage).find(
        ([name]) => name === label,
      )?.[1];
    expect(stat({ date: '2026-10-21 15:58' }, 'Noted')).toBe('21 Oct 2026 · 15:58');
    expect(stat({ date: new Date('2026-09-20T00:00:00.000Z') }, 'Noted')).toBe('20 Sep 2026');
    expect(stat({ date: '2026-10-21' }, 'Noted')).toBe('21 Oct 2026');
    expect(stat({ date: 'yesterday' }, 'Noted')).toBe('yesterday');
    expect(stat({ date: 'yesterday' }, 'Age')).toBeUndefined();
    expect(stat({}, 'Noted')).toBeUndefined();
    // 21 Oct 15:58 to 23 Oct 12:00 is 1.8 days: two. A date in the future never reads below zero.
    expect(stat({ date: '2026-10-21 15:58' }, 'Age')).toBe('2 days');
    expect(stat({ date: '2026-10-23 11:00' }, 'Age')).toBe('less than a day');
    expect(stat({ date: '2027-01-01' }, 'Age')).toBe('less than a day');
    expect(stat({ date: '2026-10-22 12:00' }, 'Age')).toBe('1 day');
    const done = (resolution: string) => ({ todos: [{ title: 'T', status: 'done', relation: 'became', resolution }] });
    expect(stat({ date: '2026-10-21' }, 'Note → shipped', done('Done (2026-10-22). More (2026-11-01).'))).toBe('2 days');
    expect(stat({ date: '2026-10-21' }, 'Note → shipped', done('Done (2026-1'))).toBeUndefined();
    expect(stat({ date: '2026-10-21' }, 'Note → shipped', done('Done (soon) and (20x6-10-22).'))).toBeUndefined();
    expect(
      composeNotePage(base(quick, {}, { noteContext: done('Done (2026-10-22).') as unknown as NoteContext }), { now: NOW })?.gist.line,
    ).toBe('Became a todo and shipped 22 Oct 2026.');
  });
});

describe('static markup of a quick note', () => {
  it('dcrop renders the rail, the gist, the toggle, six rows, the reference, the card, the mentions and the Also row', () => {
    const html = render(page('dcrop'));
    expect(count(html, '<h1')).toBe(1);
    expect(html).toContain('<header class="view-note-rail">');
    expect(html).toContain('<h1 class="view-note-title">Crop images and profile photos</h1>');
    expect(html).toContain('>Note</p>');
    expect(html).toContain('<span class="view-note-stage" data-stage="done"><i aria-hidden="true"></i>Shipped</span>');
    expect(html).toContain('<div class="view-note-big" data-stage="done">');
    expect(html).toContain('<b>6</b>');
    expect(html).toContain('things it says, after the gist');
    expect(html).toContain('1 decided · 1 ask · 1 problem · 3 limits');
    expect(html).toContain('<dt>Noted</dt><dd>21 Oct 2026 · 15:58</dd>');
    expect(html).toContain('<dt>Todo</dt><dd data-tone="complete">Done</dd>');
    expect(html).toContain('<dt>Words</dt><dd>228</dd>');
    expect(html).toContain('<p class="view-note-say" data-long="false">Crop for images before sending and for profile photos (she asked for it).</p>');
    expect(html).toContain('<p class="view-note-line">Became a todo and shipped 22 Oct 2026.</p>');
    expect(html).toContain('<div class="view-note-toggle" role="group" aria-label="Note view"><button type="button" aria-pressed="true">Lifted</button>');
    expect(html).toContain('<h2>What it says</h2>');
    expect(count(html, 'class="view-note-row"')).toBe(6);
    expect(html).toContain('<span class="view-note-label" data-tone="complete">Decided · 21 Oct 2026</span>');
    expect(html).toContain('<span class="view-note-index">01</span>');
    expect(html).toContain('<span class="view-note-first">images only (no video trimming), no rotate.</span>');
    // The text holds one reference button; Mentions holds its own row button.
    expect(count(html, 'class="view-note-ref"')).toBe(1);
    expect(html).toContain('title="Copy server/src/media/image.ts"');
    // The card sits in the rail.
    expect(html.indexOf('view-note-todo')).toBeLessThan(html.indexOf('view-note-main'));
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
    // The rail holds the page tools; the removed 028 A pieces are gone.
    expect(html.indexOf('view-note-tools')).toBeLessThan(html.indexOf('view-note-main'));
    expect(html).not.toContain('view-note-head');
    expect(html).not.toContain('view-note-contents');
    expect(html).not.toContain('view-note-doc');
  });

  it('the first row of a multi-sentence lead is headed Then', () => {
    const html = render(page('lsk'));
    expect(html).toContain('<span class="view-note-then">Then</span>');
    expect(html).toContain('Mentions · 3');
    expect(html).toContain('<code>.planning/sketches/</code>');
    expect(count(html, '<span class="view-note-label" data-tone="missing">Open question</span>')).toBe(2);
    expect(count(html, '<div class="view-note-row" data-tone="missing">')).toBe(2);
    expect(html).toContain('<span class="view-note-stage" data-stage="done"><i aria-hidden="true"></i>Shipped</span>');
  });

  it('star: the whole-note line, a Where it went ledger holding the card, no toggle and no card in the rail', () => {
    const html = render(page('star'));
    expect(count(html, '<h1')).toBe(1);
    expect(html).toContain('<b>1</b>');
    expect(html).toContain('line, nothing else to lift');
    expect(html).toContain('11 words · Became a todo, still open.');
    expect(html).toContain('<p class="view-note-whole">That’s the whole note: one line.</p>');
    expect(html).toContain('<h2>Where it went</h2>');
    expect(html).not.toContain('view-note-toggle');
    expect(html).not.toContain('Mentions ·');
    expect(html).not.toContain('What it says');
    const rail = html.slice(html.indexOf('<header class="view-note-rail">'), html.indexOf('</header>'));
    expect(rail).not.toContain('view-note-todo');
    const went = html.slice(html.indexOf('<div class="view-note-went">'));
    expect(went).toContain('<article class="view-note-todo" data-status="pending">');
    expect(went).toContain('Promoted from this note word for word');
    expect(went).toContain('data-level="medium"');
  });

  it('dback: the dashed untraced card and no todo link', () => {
    const html = render(page('dback'));
    expect(html).toContain('<article class="view-note-todo" data-status="none">');
    expect(html).toContain('Promoted, but untraced');
    expect(html).toContain('<code>promoted: true</code>');
    expect(html).not.toContain('Open todo');
    expect(html).toContain('data-stage="untraced"');
  });

  it('sundo: Promoted No on the missing tone, Still a note and the unpromoted line', () => {
    const html = render(page('sundo'));
    expect(html).toContain('<dt>Promoted</dt><dd data-tone="missing">No</dd>');
    expect(html).toContain('Still a note');
    expect(html).toContain('That’s the whole note: one line. It hasn’t been promoted to a todo.');
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

  it('shows the warning chip slot beside the stage chip', () => {
    const html = render(page('dcrop'), { chip: createElement('span', { className: 'chip-slot' }, 'warn') });
    expect(html).toContain('</span><span class="chip-slot">warn</span></div>');
    expect(html).not.toContain('view-note-doc');
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
    const model = composeNotePage(
      {
        kind: served.artifact.kind,
        frontmatter: served.artifact.frontmatter,
        structured: served.artifact.structured,
        groups: [],
        planSegments: [],
        headings: served.document.headings,
        noteContext: served.noteContext,
      },
      { now: NOW },
    );
    if (model === null) throw new Error(`composed null: ${key}`);
    return { model, served };
  }

  it('pbrief: the rail, the big 7 with its bar, the stats and the gist from the summary over the boiler line', async () => {
    const { model } = await composed('pbrief');
    expect(model.shape).toBe('document');
    expect(model.rail.eyebrow).toBe('Explore note');
    expect(model.rail.title).toBe('Studio Media Workflow — next milestone brief');
    expect(model.rail.context).toBe('/gsd-explore session; input for /gsd-new-milestone');
    expect(model.rail.stage).toEqual({ key: 'open', text: '3 sections' });
    expect(model.rail.big).toEqual({
      value: '7',
      label: 'measured figures',
      sub: '15 points across 3 sections · 5 calls flagged',
      stage: 'untraced',
    });
    expect(statsOf(model)).toEqual([
      ['Noted', '23 Oct 2026', null],
      ['Sections', '3', null],
      ['Points', '15', null],
      ['Tables', '1', null],
      ['Decided', '1', 'complete'],
      ['Open / blocked', '2', 'missing'],
      ['Lines', '42', null],
    ]);
    expect(model.gist).toEqual({
      runs: [],
      text: 'Three sections: 7 features, footage facts and 3 network facts.',
      long: false,
      line: 'Captured from an exploration session on 2026-10-23. Inputs from the studio team are included.',
    });
    expect(model.ledger).toEqual({ title: 'Section by section', kicker: '15 points · 7 figures' });
    expect(model.toggle).toBe(true);
    expect(model.todos.map((card) => card.kicker)).toEqual(['Related todo', 'Related todo']);
    expect(model.todos.map((card) => card.statusKey)).toEqual(['done', 'pending']);
  });

  it('pbrief: Features shows four items and +3 more, the Decided flag is dropped as a repeat, and two figure chips', async () => {
    const { model } = await composed('pbrief');
    const [features, footage, network] = model.parts;
    expect(features.index).toBe('01');
    expect(features.heading).toBe('Features');
    expect(features.key).toBeNull();
    expect(features.items.map((item) => item.term)).toEqual(['Projects', 'Ingest', 'Lifecycle', 'Grading locally, by vault check-out']);
    expect(features.more).toBe(3);
    expect(features.flags.map((flag) => [flag.label, flag.tone])).toEqual([
      ['Open question', 'missing'],
      ['Rejected', 'quiet'],
      ['Blocked', 'missing'],
    ]);
    expect(features.figures.map((figure) => `${figure.value} ${figure.unit}`)).toEqual(['370 GB', '10 GbE']);
    expect(features.moreFigures).toBe(0);
    expect(features.side).toEqual(['7 items']);
    expect(footage.key).toBe('Camera: **Canon EOS C50**, Cinema RAW Light (`CRAW` codec in `.CRM`, firmware 02.10.00).');
    expect(footage.flags).toEqual([]);
    expect(footage.side).toEqual(['2 items', 'table · 2 rows']);
    expect(network.key).toBeNull();
    expect(network.flags).toEqual([]);
    expect(network.figures).toHaveLength(4);
  });

  it('lperkind: the long lede is the gist, set long, the summary sits under it, and five parts pair to heading ids', async () => {
    const { model, served } = await composed('lperkind');
    expect(model.rail.title).toBe('Per-kind artifact rendering — parsing, design language, and categorization');
    expect(model.rail.context).toBe(
      '/gsd-explore session on how planning artifacts render and why document pages read worse than dashboard/roadmap/traceability',
    );
    expect(model.rail.stage).toEqual({ key: 'open', text: '5 sections' });
    expect(model.rail.big).toEqual({
      value: '3',
      label: 'measured figures',
      sub: '27 points across 5 sections · 2 calls flagged',
      stage: 'done',
    });
    expect(statsOf(model)).toEqual([
      ['Noted', '20 Sep 2026', null],
      ['Sections', '5', null],
      ['Points', '27', null],
      ['Tables', '1', null],
      ['Decided', '1', 'complete'],
      ['Open / blocked', '0', null],
      ['Lines', '112', null],
    ]);
    expect(model.gist.long).toBe(true);
    expect(model.gist.text?.startsWith('Dashboard, Roadmap and Traceability are considered visually correct')).toBe(true);
    expect(model.gist.line).toBe('Five sections: parsing, design language, categorization, delivery shape and related.');
    expect(model.parts.map((part) => part.heading)).toEqual([
      'Axis 1 — Parsing: 11 of 16 types have no structured representation',
      'Axis 2 — Design language: it exists, it is real, it is undocumented',
      'Axis 3 — Categorization: RESOLVED 2026-09-20',
      'Delivery shape',
      'Related',
    ]);
    const h2 = served.document.headings.filter((heading) => heading.depth === 2).map((heading) => heading.id);
    expect(model.parts.map((part) => part.id)).toEqual(h2);
    expect(model.parts[0].flags.map((flag) => [flag.label, flag.tone])).toEqual([['Corrected', 'in-flight']]);
    expect(model.parts[2].flags.map((flag) => [flag.label, flag.tone])).toEqual([['Resolved', 'complete']]);
    expect(model.parts[0].side).toEqual(['2 items', 'table · 4 rows', '1 aside', '1 sub']);
    expect(model.parts[3].items).toEqual([]);
    expect(model.parts[3].side).toEqual([]);
    expect(model.todos.map((card) => card.kicker)).toEqual(['Related todo']);
  });

  it("sectionHtml slices the server's real render of lperkind at its h2 elements", async () => {
    const { model, served } = await composed('lperkind');
    const ids = model.parts.map((part) => part.id ?? '');
    const first = sectionHtml(served.document.html, ids[0]);
    expect(first.startsWith('<p><code>.planning/</code> in this project holds')).toBe(true);
    expect(first).toContain('<table>');
    expect(first).toContain('<h3');
    expect(first).not.toContain('<h2');
    expect(first).not.toContain('Axis 2');
    expect(sectionHtml(served.document.html, ids[4])).toContain('artifact-chrome-drift');
    // Every slice is non-empty and together with the headings they cover the document after the first h2.
    for (const id of ids) expect(sectionHtml(served.document.html, id).length).toBeGreaterThan(0);
  });

  it('lsurvey: the big 8, six parts, five figure chips and +1 on the first, and the No todo points here card', async () => {
    const { model } = await composed('lsurvey');
    expect(model.rail.stage).toEqual({ key: 'note', text: '6 sections' });
    expect(model.rail.big).toEqual({ value: '8', label: 'measured figures', sub: '24 points across 6 sections', stage: 'done' });
    expect(model.parts).toHaveLength(6);
    expect(model.parts[0].figures).toHaveLength(5);
    expect(model.parts[0].moreFigures).toBe(1);
    expect(model.parts[4].items.map((item) => item.term)).toEqual(['1 new extractor', '2 existing extractors', '16 small manifests']);
    expect(model.todos).toEqual([]);
    expect(model.empty).toEqual({ kicker: 'No todo points here', text: 'No todo names or mentions this note.' });
  });

  it('lperkind renders the console: one h1, the Section by section ledger, five parts and a Read + on each', async () => {
    const { model, served } = await composed('lperkind');
    const html = render(model, { documentHtml: served.document.html });
    expect(count(html, '<h1')).toBe(1);
    expect(html).toContain('<h1 class="view-note-title">Per-kind artifact rendering — parsing, design language, and categorization</h1>');
    expect(html).toContain('<p class="view-note-context">/gsd-explore session on how planning artifacts render');
    expect(html).toContain('<span class="view-note-stage" data-stage="open"><i aria-hidden="true"></i>5 sections</span>');
    expect(html).toContain('<h2>Section by section</h2>');
    expect(html).toContain('27 points · 3 figures');
    expect(count(html, 'class="view-note-part"')).toBe(5);
    expect(html).toContain('<span class="view-note-label" data-tone="in-flight">Corrected</span>');
    expect(html).toContain('<span class="view-note-label" data-tone="complete">Resolved</span>');
    expect(count(html, 'aria-expanded="false">Read +</button>')).toBe(5);
    expect(html).toContain('<p class="view-note-say" data-long="true">');
    expect(html).toContain('<p class="view-note-line">Five sections:');
    expect(html).toContain('aria-pressed="true">Lifted</button>');
    expect(html).not.toContain('view-note-contents');
    expect(html).not.toContain('view-note-mentions');
    expect(html).not.toContain('view-note-doc');
    expect(html).toContain('Related todo');
    // The rail holds the card.
    expect(html.indexOf('view-note-todo')).toBeLessThan(html.indexOf('view-note-main'));
  });

  it('pbrief row 01 renders four items, +3 more, three flags and two figure chips', async () => {
    const { model, served } = await composed('pbrief');
    const html = render(model, { documentHtml: served.document.html });
    const first = html.slice(html.indexOf('<article class="view-note-part"'), html.indexOf('</article>', html.indexOf('<article class="view-note-part"')));
    expect(count(first, '<li><b class="view-note-term">')).toBe(4);
    expect(first).toContain('<li class="view-note-more">+3 more</li>');
    expect(count(first, '<span class="view-note-label"')).toBe(3);
    expect(first).toContain('data-tone="missing">Open question</span>');
    expect(first).toContain('data-tone="quiet">Rejected</span>');
    expect(first).toContain('data-tone="missing">Blocked</span>');
    expect(count(first, 'class="view-note-figure"')).toBe(2);
    expect(first).toContain('<span>7 items</span>');
    expect(html).toContain('<p class="view-note-line">Captured from an exploration session on 2026-10-23.');
  });

  it('lsurvey renders the No todo points here card', async () => {
    const { model, served } = await composed('lsurvey');
    const html = render(model, { documentHtml: served.document.html });
    expect(html).toContain('No todo points here');
    expect(html).toContain('No todo names or mentions this note.');
    expect(html).toContain('<b>8</b>');
  });

  it('an explore note with a frontmatter title but no headings has no parts', () => {
    const model = composeNotePage({
      kind: 'note',
      frontmatter: { title: 'Only a title' },
      structured: { note: { shape: 'document' } },
      groups: [],
      planSegments: [],
      headings: [{ id: 'only-a-title', text: 'Only a title', depth: 1 }],
      noteContext: { todos: [] },
    });
    expect(model?.parts).toEqual([]);
    expect(model?.rail.stage.text).toBe('0 sections');
    expect(model?.gist.text).toBeNull();
    const html = render(model as ComposedNotePage);
    expect(html).not.toContain('class="view-note-part"');
    expect(html).not.toContain('The gist');
    expect(html).toContain('No todo names or mentions this note.');
  });

  it('falls back to the first H1, then to the artifact title, when the frontmatter has no title', () => {
    const base = { kind: 'note', frontmatter: {}, structured: { note: { shape: 'document' } }, groups: [], planSegments: [] };
    expect(composeNotePage({ ...base, headings: [{ id: 'h', text: 'Heading one', depth: 1 }] })?.rail.title).toBe('Heading one');
    const none = composeNotePage({ ...base, headings: [] });
    expect(none?.rail.title).toBeNull();
    expect(render(none as ComposedNotePage)).toContain('Fallback');
  });

  describe('pairing a part to its heading', () => {
    const sections = [{ heading: 'One' }, { heading: '**Two** `x`' }, { heading: 'Three' }];
    const compose = (headings: ViewInput['headings']): (string | null)[] =>
      (composeNotePage({ kind: 'note', frontmatter: {}, structured: { note: { shape: 'document', sections } }, groups: [], planSegments: [], headings })?.parts ?? []).map(
        (part) => part.id,
      );

    it('by order when the counts match', () => {
      expect(
        compose([
          { id: 'a', text: 'Different', depth: 2 },
          { id: 'b', text: 'Words', depth: 2 },
          { id: 'c', text: 'Here', depth: 2 },
          { id: 'd', text: 'Deep', depth: 3 },
        ]),
      ).toEqual(['a', 'b', 'c']);
    });
    it('by heading text, markup removed, when the counts differ; an unpaired section has no id', () => {
      expect(
        compose([
          { id: 'one', text: 'One', depth: 2 },
          { id: 'two', text: 'Two x', depth: 2 },
        ]),
      ).toEqual(['one', 'two', null]);
      expect(compose([])).toEqual([null, null, null]);
    });
    it('uses each heading once', () => {
      const parts = composeNotePage({
        kind: 'note',
        frontmatter: {},
        structured: { note: { shape: 'document', sections: [{ heading: 'Same' }, { heading: 'Same' }, { heading: 'Other' }] } },
        groups: [],
        planSegments: [],
        headings: [{ id: 'same', text: 'Same', depth: 2 }, { id: 'same-1', text: 'Same', depth: 2 }],
      })?.parts;
      expect(parts?.map((part) => part.id)).toEqual(['same', 'same-1', null]);
    });
  });
});

describe('sectionHtml', () => {
  const html = '<p>intro</p><h2 id="a">A<button>#</button></h2><p>one</p><h3 id="x">X</h3><h2 id="b">B</h2><p>two</p>';
  it('returns what follows the matching h2 up to the next h2, or to the end', () => {
    expect(sectionHtml(html, 'a')).toBe('<p>one</p><h3 id="x">X</h3>');
    expect(sectionHtml(html, 'b')).toBe('<p>two</p>');
  });
  it("'' for an unknown id, a nearby id, a non-h2 id and junk", () => {
    expect(sectionHtml(html, 'zzz')).toBe('');
    expect(sectionHtml(html, 'x')).toBe('');
    expect(sectionHtml(html, 'a-')).toBe('');
    expect(sectionHtml(html, '')).toBe('');
    expect(sectionHtml('', 'a')).toBe('');
    expect(sectionHtml('<h2 id="a">unclosed', 'a')).toBe('');
    expect(sectionHtml('<h2 id="a"', 'a')).toBe('');
    expect(sectionHtml(undefined as unknown as string, 'a')).toBe('');
    expect(sectionHtml(html, undefined as unknown as string)).toBe('');
  });
  it('does not match an h20 element or an id that only ends the same', () => {
    expect(sectionHtml('<h20 id="a">A</h20>text', 'a')).toBe('');
    expect(sectionHtml('<h2 data-id="a">A</h2>text', 'a')).toBe('');
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
    expect(count(html, 'class="view-note-row"')).toBe(6);

    const phaseNotes = await documentOf('.planning/phases/01-a/notes.md');
    expect(phaseNotes.artifact.kind).toBe('unknown');
    expect(phaseNotes.artifact.structured.note).toBeUndefined();
    expect(phaseNotes.noteContext).toBeNull();
  });
});
