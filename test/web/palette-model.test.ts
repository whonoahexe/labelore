// Phase 13, 13-05: the palette's rules as a pure model. What shows, in which order, in which state - on the
// made-up Lendshed project and on synthetic /jump answers, so no browser and no server is involved.
import { beforeAll, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import type { JumpGroup, JumpGroupKey, JumpRow } from '../../src/presentation/jump.ts';
import type { ProjectListEntry } from '../../src/presentation/project-list.ts';
import { projectMapState } from '../../src/presentation/project-map-state.ts';
import { buildPhaseUrl } from '../../src/presentation/routes.ts';
import { headPhaseOf } from '../../src/presentation/dashboard-head.ts';
import type { JumpApiResponse } from '../../src/server/search-index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import {
  PALETTE_PROJECT_CAP,
  buildPaletteModel,
  filterProjects,
  hrefOfRow,
  keyPagesOf,
  rowIconOf,
  titleForPath,
} from '../../src/web/palette/palette-model.ts';
import type { PaletteInput, PaletteRow } from '../../src/web/palette/palette-model.ts';
import { loadFixtureProject, loadProject } from '../helpers/fixture-project.ts';

let lendshed: ProjectPresentation;
let tidemark: ProjectPresentation;

beforeAll(async () => {
  lendshed = (await loadFixtureProject()).presentation;
  tidemark = (await loadProject(fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)))).presentation;
}, 60000);

function jumpRow(kind: JumpRow['kind'], key: string, overrides: Partial<JumpRow> = {}): JumpRow {
  return {
    key,
    kind,
    id: null,
    title: key,
    subtitle: '',
    url: `/${key}`,
    anchor: null,
    chips: [],
    artifactKind: null,
    phaseKey: null,
    titleHighlights: [],
    subtitleHighlights: [],
    snippet: null,
    ...overrides,
  };
}

function group(key: JumpGroupKey, kind: JumpRow['kind'], count: number): JumpGroup {
  return { key, rows: Array.from({ length: count }, (_, index) => jumpRow(kind, `${key}-${index}`)) };
}

function response(overrides: Partial<JumpApiResponse> = {}): JumpApiResponse {
  return {
    status: 'ready',
    refreshing: false,
    builtAt: '2026-11-13T10:00:00.000Z',
    query: 'x',
    groups: [],
    contentTotal: 0,
    notFoundId: null,
    ...overrides,
  };
}

function project(slug: string, name: string, overrides: Partial<ProjectListEntry> = {}): ProjectListEntry {
  return {
    slug,
    name,
    kind: 'local',
    target: `/srv/${slug}`,
    displayPath: `/srv/${slug}`,
    state: 'ready',
    reason: null,
    pathChecked: null,
    lastOpened: null,
    sessionOnly: false,
    ...overrides,
  };
}

const PROJECTS = [project('lendshed', 'Lendshed'), project('kilnrow', 'Kilnrow'), project('lend-two', 'Second Lender')];

function input(overrides: Partial<PaletteInput> = {}): PaletteInput {
  return {
    query: '',
    jump: { state: 'idle', data: undefined },
    projects: { state: 'ready', entries: PROJECTS },
    currentSlug: 'lendshed',
    recent: [],
    keyPages: [{ key: 'dashboard', title: 'Dashboard', path: '/' }],
    ...overrides,
  };
}

function labels(model: ReturnType<typeof buildPaletteModel>): (string | null)[] {
  return model.groups.map((entry) => entry.label);
}

describe('keyPagesOf', () => {
  it('on Lendshed is Dashboard, Roadmap and the current phase', () => {
    const pages = keyPagesOf(lendshed);
    expect(pages.map((page) => [page.title, page.path])).toEqual([
      ['Dashboard', '/'],
      ['Roadmap', '/roadmap'],
      ['Phase 4 · Bulk Loan Export', expect.any(String)],
    ]);
    const head = headPhaseOf(lendshed);
    expect(head).not.toBeNull();
    expect(pages[2]?.path).toBe(buildPhaseUrl(head!.identity));
  });

  it('drops Roadmap on a map-only project and the phase row when STATE names no resolvable phase', () => {
    expect(projectMapState(tidemark.artifacts).mapOnly).toBe(true);
    const pages = keyPagesOf(tidemark);
    expect(pages.map((page) => page.title)).toEqual(['Dashboard']);
    const noState: ProjectPresentation = { ...lendshed, state: null };
    expect(keyPagesOf(noState).map((page) => page.title)).toEqual(['Dashboard', 'Roadmap']);
  });
});

describe('titleForPath', () => {
  it('names the page pages, the artifacts and the phases, and gives null for an unknown address', () => {
    expect(titleForPath('/', lendshed)).toBe('Dashboard');
    expect(titleForPath('/roadmap', lendshed)).toBe('Roadmap');
    expect(titleForPath('/traceability', lendshed)).toBe('Traceability');
    expect(titleForPath('/search', lendshed)).toBe('Search');
    expect(titleForPath('/settings', lendshed)).toBe('Settings');
    const artifact = lendshed.artifacts.find((candidate) => candidate.kind === 'context' && candidate.phaseKey !== null);
    expect(artifact).toBeDefined();
    expect(titleForPath(artifact!.key, lendshed)).toBe(artifact!.title);
    const head = headPhaseOf(lendshed)!;
    expect(titleForPath(buildPhaseUrl(head.identity), lendshed)).toBe('Phase 4 · Bulk Loan Export');
    expect(titleForPath('/nowhere/at/all', lendshed)).toBeNull();
  });

  it('names Research and Sketches only when the project has them', () => {
    expect(titleForPath('/research', lendshed)).toBeNull();
    expect(titleForPath('/sketches', lendshed)).toBeNull();
  });
});

describe('filterProjects', () => {
  it('keeps names containing the text, case-insensitively, in the given order', () => {
    expect(filterProjects(PROJECTS, 'LEND').map((entry) => entry.slug)).toEqual(['lendshed', 'lend-two']);
    expect(filterProjects(PROJECTS, 'zzz')).toEqual([]);
  });

  it('caps the result at PALETTE_PROJECT_CAP, and takes a smaller cap', () => {
    const many = Array.from({ length: 30 }, (_, index) => project(`p-${index}`, `Project ${index}`));
    expect(PALETTE_PROJECT_CAP).toBe(8);
    expect(filterProjects(many, 'project')).toHaveLength(8);
    expect(filterProjects(many, 'project', 3)).toHaveLength(3);
    expect(filterProjects(many, '')).toHaveLength(8);
  });
});

describe('the empty palette', () => {
  it('shows Recent (only when there are entries), Key pages and Projects, in that order', () => {
    const none = buildPaletteModel(input());
    expect(labels(none)).toEqual(['Key pages', 'Projects']);
    const recent = [{ path: '/roadmap', title: 'Roadmap', at: 1 }];
    const model = buildPaletteModel(input({ recent }));
    expect(labels(model)).toEqual(['Recent', 'Key pages', 'Projects']);
    expect(model.groups[0]?.rows).toEqual([{ type: 'recent', key: 'recent:/roadmap', title: 'Roadmap', path: '/roadmap' }]);
    expect(model.groups[1]?.rows.map((row) => row.type)).toEqual(['key-page']);
    expect(model.empty).toBeNull();
    expect(model.refreshing).toBe(false);
    expect(model.announcement).toBe('');
  });

  it('lists the projects in the given order and marks the current one', () => {
    const model = buildPaletteModel(input());
    const rows = model.groups.find((entry) => entry.label === 'Projects')?.rows ?? [];
    expect(rows.map((row) => (row.type === 'project' ? [row.entry.slug, row.current] : null))).toEqual([
      ['lendshed', true],
      ['kilnrow', false],
      ['lend-two', false],
    ]);
  });

  it('is unchanged by an index error, because no index request is made for it', () => {
    const base = buildPaletteModel(input());
    const failed = buildPaletteModel(input({ jump: { state: 'error', data: undefined } }));
    expect(failed).toEqual(base);
    const errored = buildPaletteModel(input({ jump: { state: 'ready', data: response({ status: 'error' }) } }));
    expect(errored).toEqual(base);
  });

  it('keeps the Projects group at the cap for a long list', () => {
    const many = Array.from({ length: 30 }, (_, index) => project(`p-${index}`, `Project ${index}`));
    const model = buildPaletteModel(input({ projects: { state: 'ready', entries: many }, currentSlug: 'p-0' }));
    expect(model.groups.find((entry) => entry.label === 'Projects')?.rows).toHaveLength(PALETTE_PROJECT_CAP);
  });
});

describe('a typed query with a ready index', () => {
  const data = response({
    query: 'lend',
    groups: [group('exact', 'decision', 2), group('pages', 'page', 1), group('files', 'file', 2), group('content', 'content', 3)],
    contentTotal: 9,
  });

  it('orders exact, pages, files, projects, content, then an unlabelled see-all group', () => {
    const model = buildPaletteModel(input({ query: 'lend', jump: { state: 'ready', data } }));
    expect(labels(model)).toEqual(['Exact match', 'Pages', 'Files', 'Projects', 'Content matches', null]);
    const projects = model.groups[3];
    expect(projects?.rows.map((row) => (row.type === 'project' ? row.entry.slug : null))).toEqual(['lendshed', 'lend-two']);
    const last = model.groups[5];
    expect(last?.rows).toEqual([
      { type: 'see-all', key: 'see-all', query: 'lend', href: '/search?q=lend' },
    ]);
    expect(model.empty).toBeNull();
    expect(model.announcement).toBe('11 results');
  });

  it('encodes the query in the see-all address', () => {
    const model = buildPaletteModel(input({ query: 'a b&c', jump: { state: 'ready', data } }));
    const last = model.groups[model.groups.length - 1]?.rows[0];
    expect(last).toMatchObject({ type: 'see-all', href: '/search?q=a%20b%26c' });
  });

  it('has no see-all row when there are no content matches', () => {
    const model = buildPaletteModel(
      input({ query: 'lend', jump: { state: 'ready', data: response({ groups: [group('pages', 'page', 1)] }) } }),
    );
    expect(model.groups.some((entry) => entry.rows.some((row) => row.type === 'see-all'))).toBe(false);
  });

  it('puts an ids group where the exact group would be, and leaves out a group with no rows', () => {
    const model = buildPaletteModel(
      input({ query: 'find', jump: { state: 'ready', data: response({ groups: [group('ids', 'requirement', 3)] }) } }),
    );
    expect(labels(model)).toEqual(['IDs']);
  });

  it('uses the singular for one result', () => {
    const model = buildPaletteModel(
      input({
        query: 'kiln',
        jump: { state: 'ready', data: response({ groups: [] }) },
        projects: { state: 'ready', entries: [project('kilnrow', 'Kilnrow')] },
      }),
    );
    expect(model.announcement).toBe('1 result');
  });
});

describe('the honest states', () => {
  it('while the index builds: one unlabelled indexing notice with no rows, then Projects, and no no-match', () => {
    const model = buildPaletteModel(
      input({ query: 'lend', jump: { state: 'ready', data: response({ status: 'building', builtAt: null }) } }),
    );
    expect(labels(model)).toEqual([null, 'Projects']);
    const first = model.groups[0];
    expect(first?.rows).toEqual([]);
    expect(first?.notice).toEqual({
      kind: 'indexing',
      heading: 'Indexing…',
      body: 'Pages and files will appear once the index finishes. Projects are available now.',
      role: 'status',
    });
    expect(model.empty).toBeNull();
    expect(model.announcement).toBe('');
  });

  it('while a refresh runs the rows come from the data as usual and the model says refreshing', () => {
    const data = response({ refreshing: true, groups: [group('pages', 'page', 2)] });
    const model = buildPaletteModel(input({ query: 'road', jump: { state: 'ready', data } }));
    expect(model.refreshing).toBe(true);
    expect(labels(model)).toEqual(['Pages']);
    expect(model.announcement).toBe('2 results');
  });

  it('never invents a no-match while a refresh runs or a request is in flight', () => {
    const refreshing = buildPaletteModel(
      input({
        query: 'zzz',
        jump: { state: 'ready', data: response({ refreshing: true }) },
        projects: { state: 'ready', entries: [] },
      }),
    );
    expect(refreshing.empty).toBeNull();
    expect(refreshing.announcement).toBe('');
    const pending = buildPaletteModel(
      input({ query: 'zzz', jump: { state: 'pending', data: undefined }, projects: { state: 'ready', entries: [] } }),
    );
    expect(pending.empty).toBeNull();
    expect(pending.announcement).toBe('');
  });

  it('keeps the previous rows on screen while the next answer is on its way', () => {
    const previous = response({ groups: [group('pages', 'page', 2)] });
    const model = buildPaletteModel(input({ query: 'roadm', jump: { state: 'pending', data: previous } }));
    expect(labels(model)).toEqual(['Pages']);
    expect(model.empty).toBeNull();
    expect(model.announcement).toBe('');
  });

  it('on an index error: the index alert, then Projects', () => {
    const model = buildPaletteModel(input({ query: 'lend', jump: { state: 'ready', data: response({ status: 'error' }) } }));
    expect(labels(model)).toEqual([null, 'Projects']);
    expect(model.groups[0]?.notice).toEqual({
      kind: 'index-error',
      heading: 'Search is unavailable.',
      body: "The index could not be built. Pages and projects below still work; check that the project's .planning folder can be read, then refresh.",
      role: 'alert',
    });
    expect(model.empty).toBeNull();
  });

  it('on a failed request (WR-02): its own notice, never the index-error words, then Projects', () => {
    const previous = response({ groups: [group('pages', 'page', 2)] });
    for (const data of [undefined, previous]) {
      const model = buildPaletteModel(input({ query: 'lend', jump: { state: 'error', data } }));
      expect(labels(model)).toEqual([null, 'Projects']);
      expect(model.groups[0]?.notice).toEqual({
        kind: 'request-error',
        heading: 'Search could not be loaded.',
        body: 'The request failed. Projects below still work; keep typing or reopen the palette to try again.',
        role: 'alert',
      });
      expect(JSON.stringify(model)).not.toContain('The index could not be built');
      expect(model.empty).toBeNull();
    }
  });

  it('ready, every group empty and no project matching: the no-match notice naming the query', () => {
    const model = buildPaletteModel(input({ query: 'zzzzqq', jump: { state: 'ready', data: response() } }));
    expect(model.groups).toEqual([]);
    expect(model.empty).toEqual({
      kind: 'no-match',
      heading: 'Nothing matches "zzzzqq".',
      body: 'Try a page name, an ID such as D-12 or WR-03, or a project name.',
      role: 'status',
    });
    expect(model.announcement).toBe('No results');
  });

  it('an ID-shaped query that resolves to nothing says so by ID', () => {
    const model = buildPaletteModel(
      input({ query: 'd-99', jump: { state: 'ready', data: response({ notFoundId: 'D-99' }) } }),
    );
    expect(model.empty).toEqual({
      kind: 'id-not-found',
      heading: 'No D-99 in this project.',
      body: 'It may be in another project. Check the spelling, or search the text instead.',
      role: 'status',
    });
  });

  it('Projects pending: a loading notice and no rows; failed: a could-not-list notice; every other group renders', () => {
    const data = response({ groups: [group('pages', 'page', 1)] });
    const pending = buildPaletteModel(
      input({ query: 'road', jump: { state: 'ready', data }, projects: { state: 'pending', entries: [] } }),
    );
    expect(labels(pending)).toEqual(['Pages', 'Projects']);
    expect(pending.groups[1]?.rows).toEqual([]);
    expect(pending.groups[1]?.notice).toMatchObject({ kind: 'projects-loading', heading: 'Loading projects…', role: 'status' });
    expect(pending.empty).toBeNull();
    const failed = buildPaletteModel(
      input({ query: 'road', jump: { state: 'ready', data }, projects: { state: 'error', entries: [] } }),
    );
    expect(failed.groups[1]?.notice).toMatchObject({ kind: 'projects-error', heading: 'Projects could not be listed.' });
    const emptyPalette = buildPaletteModel(input({ projects: { state: 'pending', entries: [] } }));
    expect(emptyPalette.groups.map((entry) => entry.key)).toEqual(['key-pages', 'projects']);
    expect(emptyPalette.groups[1]?.notice?.kind).toBe('projects-loading');
  });

  it('does not say no-match while the project list is still loading', () => {
    const model = buildPaletteModel(
      input({ query: 'zzz', jump: { state: 'ready', data: response() }, projects: { state: 'pending', entries: [] } }),
    );
    expect(model.empty).toBeNull();
  });
});

describe('rowIconOf and hrefOfRow', () => {
  const jump = (kind: JumpRow['kind'], overrides: Partial<JumpRow> = {}): PaletteRow => ({
    type: 'jump',
    key: kind,
    row: jumpRow(kind, kind, overrides),
  });

  it('maps every kind of row to its icon', () => {
    for (const kind of ['decision', 'finding', 'requirement', 'mention', 'plan', 'quick'] as const) {
      expect(rowIconOf(jump(kind))).toBe('hash');
    }
    expect(rowIconOf(jump('page'))).toBe('page');
    expect(rowIconOf(jump('file'))).toBe('file');
    expect(rowIconOf(jump('content'))).toBe('content');
    expect(rowIconOf({ type: 'recent', key: 'r', title: 'T', path: '/p' })).toBe('recent');
    expect(rowIconOf({ type: 'key-page', key: 'k', title: 'T', path: '/p' })).toBe('page');
    expect(rowIconOf({ type: 'see-all', key: 's', query: 'q', href: '/search?q=q' })).toBe('search');
    expect(rowIconOf({ type: 'project', key: 'p', entry: project('a', 'A'), current: false })).toBe('project');
  });

  it('opens a jump row at its address, plus its anchor when it has one', () => {
    expect(hrefOfRow(jump('decision', { url: '/v1/phase-1/context', anchor: 'decision-d-01' }))).toBe(
      '/v1/phase-1/context#decision-d-01',
    );
    expect(hrefOfRow(jump('page', { url: '/roadmap' }))).toBe('/roadmap');
    expect(hrefOfRow({ type: 'recent', key: 'r', title: 'T', path: '/roadmap' })).toBe('/roadmap');
    expect(hrefOfRow({ type: 'see-all', key: 's', query: 'q', href: '/search?q=q' })).toBe('/search?q=q');
  });

  it('opens a project row at that project\'s root', () => {
    expect(hrefOfRow({ type: 'project', key: 'p', entry: project('kilnrow', 'Kilnrow'), current: false })).toBe('/kilnrow');
  });
});

describe('the announcement', () => {
  it('counts the option rows once the answer is ready', () => {
    const eight = response({ groups: [group('pages', 'page', 5), group('files', 'file', 3)] });
    const model = buildPaletteModel(
      input({ query: 'x', jump: { state: 'ready', data: eight }, projects: { state: 'ready', entries: [] } }),
    );
    expect(model.announcement).toBe('8 results');
  });
});
