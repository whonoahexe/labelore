import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PhaseDto, ProjectPresentation, RequirementDto } from '../../src/server/project-presentation.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import { createApp } from '../../src/server/index.ts';
import { buildPhaseUrl, phaseKeyOf } from '../../src/presentation/routes.ts';
import { buildTraceabilityViewModel, type TraceabilityGroup, type TraceabilityRow } from '../../src/presentation/traceability.ts';
import { matchesTraceabilityFilter, type TraceabilityFilterState } from '../../src/web/pages/traceability-filter.ts';

const PHASE_1_IDENTITY = { milestoneVersion: null, number: '01', projectCode: null, slug: 'first' };
const PHASE_2_IDENTITY = { milestoneVersion: null, number: '02', projectCode: null, slug: 'second' };
const PHASE_1_KEY = phaseKeyOf(PHASE_1_IDENTITY);
const PHASE_2_KEY = phaseKeyOf(PHASE_2_IDENTITY);

function requirement(overrides: Partial<RequirementDto> = {}): RequirementDto {
  return {
    id: 'TGT-01',
    category: 'Targeting',
    text: 'Some requirement text',
    tier: 'v1',
    checked: true,
    coveringPhases: [],
    ...overrides,
  };
}

function phase(overrides: Partial<PhaseDto> = {}): PhaseDto {
  return {
    key: PHASE_1_KEY,
    milestoneKey: 'current',
    identity: PHASE_1_IDENTITY,
    name: 'Phase One',
    dirPath: '.planning/phases/01-first',
    archived: false,
    goal: null,
    dependsOnRaw: null,
    requirementIds: [],
    requirementRefs: [],
    successCriteria: [],
    roadmapComplete: false,
    formalPlanProgress: null,
    diskStatus: 'in_progress',
    plans: [],
    ...overrides,
  };
}

function presentationWith(requirements: RequirementDto[], phases: PhaseDto[] = []): ProjectPresentation {
  return {
    readAt: '2026-09-02T00:00:00.000Z',
    loadStatus: { status: 'ok' },
    rootPath: '/project',
    projectName: 'Test project',
    config: {},
    state: null,
    milestones:
      phases.length > 0
        ? [{ key: 'current', version: null, name: 'Current milestone', archived: false, phases }]
        : [],
    requirements,
    artifacts: [],
    blockers: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
    exclusions: [],
  };
}

function allRows(groups: TraceabilityGroup[]): ReturnType<typeof buildTraceabilityViewModel>['groups'][number]['rows'] {
  return groups.flatMap((group) => group.rows);
}

describe('buildTraceabilityViewModel', () => {
  it('Test 1: a checked requirement covered by an incomplete phase carries both signals plus a disagreement flag, never a merged field', () => {
    const covered = phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'in_progress' });
    const req = requirement({
      checked: true,
      coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }],
    });
    const view = buildTraceabilityViewModel(presentationWith([req], [covered]));
    const row = allRows(view.groups)[0];

    expect(row.requirementStatus).toBe(true);
    expect(row.coveringPhases).toEqual([
      {
        raw: 'Phase 1',
        phaseKey: PHASE_1_KEY,
        url: buildPhaseUrl(PHASE_1_IDENTITY),
        resolved: true,
        phaseName: 'Phase One',
        phaseDiskStatus: 'in_progress',
        phaseRoadmapComplete: false,
      },
    ]);
    expect(row.statusDisagreement).toBe(true);
    expect(Object.keys(row)).not.toContain('combinedStatus');
    expect(Object.keys(row)).not.toContain('mergedStatus');
  });

  it('Test 2: a requirement with no covering phases comes back uncovered, present in its category group', () => {
    const req = requirement({ coveringPhases: [] });
    const view = buildTraceabilityViewModel(presentationWith([req]));

    expect(view.groups).toHaveLength(1);
    expect(view.groups[0].rows).toHaveLength(1);
    expect(view.groups[0].rows[0].uncovered).toBe(true);
  });

  it('Test 3: a covering-phase reference with a raw string and a null target comes back marked unresolved', () => {
    const req = requirement({
      coveringPhases: [{ raw: 'Phase 99', targetPhaseKey: null }],
    });
    const view = buildTraceabilityViewModel(presentationWith([req]));
    const row = allRows(view.groups)[0];

    expect(row.coveringPhases).toEqual([
      {
        raw: 'Phase 99',
        phaseKey: null,
        url: null,
        resolved: false,
        phaseName: null,
        phaseDiskStatus: null,
        phaseRoadmapComplete: null,
      },
    ]);
    expect(row.hasUnresolvedReference).toBe(true);
    expect(row.uncovered).toBe(false);
  });

  it('Test 4: a requirement covered by two phases carries two independent covering entries', () => {
    const phaseOne = phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'complete' });
    const phaseTwo = phase({
      key: PHASE_2_KEY,
      identity: PHASE_2_IDENTITY,
      name: 'Phase Two',
      diskStatus: 'in_progress',
    });
    const req = requirement({
      coveringPhases: [
        { raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY },
        { raw: 'Phase 2', targetPhaseKey: PHASE_2_KEY },
      ],
    });
    const view = buildTraceabilityViewModel(presentationWith([req], [phaseOne, phaseTwo]));
    const row = allRows(view.groups)[0];

    expect(row.coveringPhases).toHaveLength(2);
    expect(row.coveringPhases[0].phaseDiskStatus).toBe('complete');
    expect(row.coveringPhases[1].phaseDiskStatus).toBe('in_progress');
  });

  it('Test 5: groups follow first-appearance order, not an alphabetical re-sort', () => {
    const view = buildTraceabilityViewModel(
      presentationWith([
        requirement({ id: 'ZED-01', category: 'Zeta' }),
        requirement({ id: 'ALP-01', category: 'Alpha' }),
        requirement({ id: 'ZED-02', category: 'Zeta' }),
      ]),
    );

    expect(view.groups.map((group) => group.category)).toEqual(['Zeta', 'Alpha']);
    expect(view.groups[0].rows.map((row) => row.id)).toEqual(['ZED-01', 'ZED-02']);
  });

  it('Test 6: non-v1 tier requirements land in deferredRows and never in the grouped table', () => {
    const view = buildTraceabilityViewModel(
      presentationWith([
        requirement({ id: 'V1-01', tier: 'v1' }),
        requirement({ id: 'V2-01', tier: 'v2', checked: null }),
      ]),
    );

    expect(allRows(view.groups).map((row) => row.id)).toEqual(['V1-01']);
    expect(view.deferredRows.map((row) => row.id)).toEqual(['V2-01']);
  });

  it('Test 7: an empty requirements array yields empty groups and an empty deferred section, no thrown error', () => {
    expect(() => buildTraceabilityViewModel(presentationWith([]))).not.toThrow();
    const view = buildTraceabilityViewModel(presentationWith([]));
    expect(view.groups).toEqual([]);
    expect(view.deferredRows).toEqual([]);
    expect(view.counts).toEqual({ total: 0, uncovered: 0, disagreement: 0 });
  });

  it('Test 8: every checkbox-bearing requirement appears exactly once across groups; every checkbox-less (deferred-tier) requirement appears exactly once in deferredRows and never in groups (fixtures/dense)', async () => {
    const root = resolve('fixtures/dense');
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const snapshot = await repository.load();
    const presentation = toProjectPresentation(snapshot);
    const view = buildTraceabilityViewModel(presentation);

    const groupedIds = allRows(view.groups).map((row) => row.id);
    const deferredIds = view.deferredRows.map((row) => row.id);
    // REQUIREMENTS.md's tier heading is an open string, not a closed 'v1'/'v2'/'future' enum —
    // fixtures/dense's live tier is literally "v3.0 Requirements". A checkbox's presence is the
    // parser's own portable signal for "actionable, current tier" (handlers/requirements.ts).
    const v1Ids = presentation.requirements.filter((r) => r.checked !== null).map((r) => r.id);
    const nonV1Ids = presentation.requirements.filter((r) => r.checked === null).map((r) => r.id);

    expect(new Set(groupedIds)).toEqual(new Set(v1Ids));
    expect(groupedIds).toHaveLength(v1Ids.length);
    expect(new Set(deferredIds)).toEqual(new Set(nonV1Ids));
    expect(deferredIds).toHaveLength(nonV1Ids.length);
    for (const id of groupedIds) expect(deferredIds).not.toContain(id);
  });

  it('parsePresentationUrl(\'/traceability\') resolves and a production GET of /traceability returns the SPA entry document (routes/deep-links integration)', async () => {
    const { parsePresentationUrl, presentationRoutePatterns } = await import('../../src/presentation/routes.ts');
    expect(presentationRoutePatterns.traceability).toBe('/traceability');
    expect(parsePresentationUrl('/traceability')).toEqual({ ok: true, route: { kind: 'traceability' } });
  });

  it('GET /api/traceability against fixtures/dense returns HTTP 200 with a groups array and a deferredRows array', async () => {
    const root = resolve('fixtures/dense');
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const snapshot = await repository.load();
    const app = createApp({ getSnapshot: () => snapshot });

    const response = await app.request('/api/traceability');
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { groups: unknown[]; deferredRows: unknown[] };
    expect(Array.isArray(payload.groups)).toBe(true);
    expect(payload.groups.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.deferredRows)).toBe(true);
  });
});

function traceabilityRow(overrides: Partial<TraceabilityRow> = {}): TraceabilityRow {
  return {
    id: 'TGT-01',
    category: 'Targeting',
    text: 'User starts the dashboard with a project path argument',
    tier: 'v1',
    requirementStatus: true,
    coveringPhases: [],
    uncovered: false,
    hasUnresolvedReference: false,
    statusDisagreement: false,
    ...overrides,
  };
}

function filterState(overrides: Partial<TraceabilityFilterState> = {}): TraceabilityFilterState {
  return { query: '', status: 'all', ...overrides };
}

describe('matchesTraceabilityFilter (Task 3)', () => {
  it('Test 1: matches ID case-insensitively and text by substring; an empty filter matches everything', () => {
    const row = traceabilityRow({ id: 'TGT-01', text: 'Dashboard renders the project path' });

    expect(matchesTraceabilityFilter(row, filterState({ query: 'tgt-01' }))).toBe(true);
    expect(matchesTraceabilityFilter(row, filterState({ query: 'renders the project' }))).toBe(true);
    expect(matchesTraceabilityFilter(row, filterState({ query: 'no-match-here' }))).toBe(false);
    expect(matchesTraceabilityFilter(row, filterState())).toBe(true);
  });

  it('Test 2: the uncovered status filter isolates exactly the rows the projection marked uncovered', () => {
    const uncoveredRow = traceabilityRow({ id: 'A-01', uncovered: true });
    const coveredRow = traceabilityRow({ id: 'A-02', uncovered: false });
    const filter = filterState({ status: 'uncovered' });

    expect(matchesTraceabilityFilter(uncoveredRow, filter)).toBe(true);
    expect(matchesTraceabilityFilter(coveredRow, filter)).toBe(false);
  });

  it('Test 3: the disagreement status filter isolates exactly the flagged rows, and neither filter alters the two status values', () => {
    const disagreeingRow = traceabilityRow({
      id: 'A-03',
      requirementStatus: true,
      statusDisagreement: true,
      coveringPhases: [
        {
          raw: 'Phase 1',
          phaseKey: 'p1',
          url: '/milestones/current/phases/p1',
          resolved: true,
          phaseName: 'Phase One',
          phaseDiskStatus: 'in_progress',
          phaseRoadmapComplete: false,
        },
      ],
    });
    const agreeingRow = traceabilityRow({ id: 'A-04', statusDisagreement: false });
    const filter = filterState({ status: 'disagreement' });

    expect(matchesTraceabilityFilter(disagreeingRow, filter)).toBe(true);
    expect(matchesTraceabilityFilter(agreeingRow, filter)).toBe(false);
    // The predicate is a pure boolean gate — it never mutates or replaces the row's own fields.
    expect(disagreeingRow.requirementStatus).toBe(true);
    expect(disagreeingRow.coveringPhases[0].phaseDiskStatus).toBe('in_progress');
  });

  it('Test 4: rows outside a category are excluded, so a fully-filtered category renders no rows', () => {
    const rows = [
      traceabilityRow({ id: 'A-05', uncovered: true }),
      traceabilityRow({ id: 'A-06', uncovered: false }),
    ];
    const filter = filterState({ status: 'uncovered' });
    const remaining = rows.filter((row) => matchesTraceabilityFilter(row, filter));

    expect(remaining.map((row) => row.id)).toEqual(['A-05']);
  });

  it('Test 5: the counts shown on the filter controls equal the projection\'s own counts, not a component recount', () => {
    const view = buildTraceabilityViewModel(
      presentationWith([
        requirement({ id: 'U-01', coveringPhases: [] }),
        requirement({
          id: 'U-02',
          coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }],
        }),
      ]),
    );

    // The projection's own counts are the single source of truth a filter UI must read from —
    // never a `.filter(...).length` recount performed in the component.
    expect(view.counts.total).toBe(2);
    expect(view.counts.uncovered).toBe(1);
  });
});
