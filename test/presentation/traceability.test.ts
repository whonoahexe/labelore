import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PhaseDto, ProjectPresentation, RequirementDto } from '../../src/server/project-presentation.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import { createApp } from '../../src/server/index.ts';
import { buildPhaseUrl, phaseKeyOf } from '../../src/presentation/routes.ts';
import { buildTraceabilityViewModel, type TraceabilityGroup, type TraceabilityRow } from '../../src/presentation/traceability.ts';
import {
  DEFAULT_TRACEABILITY_FILTER,
  matchesDeferredTraceabilityFilter,
  matchesTraceabilityFilter,
  type TraceabilityFilterState,
} from '../../src/web/pages/traceability-filter.ts';

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

describe('TraceabilityCoverage (NS4 Task 1, quick-260918-qkd Task 1)', () => {
  function sumBuckets(coverage: {
    completePhase: number;
    inFlightPhase: number;
    missingPhase: number;
    unresolvedPhase: number;
    uncovered: number;
  }): number {
    return (
      coverage.completePhase +
      coverage.inFlightPhase +
      coverage.missingPhase +
      coverage.unresolvedPhase +
      coverage.uncovered
    );
  }

  it('Test 1: a scope of rows partitions into five disjoint buckets that sum to the total', () => {
    const coveredPhase = phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'complete' });
    const view = buildTraceabilityViewModel(
      presentationWith(
        [
          requirement({ id: 'A-01', checked: true, coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }] }),
          requirement({ id: 'A-02', checked: false, coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }] }),
          requirement({ id: 'A-03', checked: true, coveringPhases: [] }),
        ],
        [coveredPhase],
      ),
    );

    expect(view.coverage.total).toBe(3);
    expect(sumBuckets(view.coverage)).toBe(3);
  });

  it('Test 2: a row whose only covering phase is complete lands in the complete bucket and nowhere else', () => {
    const coveredPhase = phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'complete' });
    const req = requirement({
      checked: true,
      coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }],
    });
    const view = buildTraceabilityViewModel(presentationWith([req], [coveredPhase]));

    expect(view.coverage.completePhase).toBe(1);
    expect(view.coverage.inFlightPhase).toBe(0);
    expect(view.coverage.missingPhase).toBe(0);
    expect(view.coverage.unresolvedPhase).toBe(0);
    expect(view.coverage.uncovered).toBe(0);
  });

  it('Test 3: a row whose only covering phase is in_progress (or an unrecognised on-disk status) lands in the in-flight bucket', () => {
    const inProgressPhase = phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'in_progress' });
    const unrecognisedPhase = phase({ key: PHASE_2_KEY, identity: PHASE_2_IDENTITY, diskStatus: 'some_future_status' });
    const view = buildTraceabilityViewModel(
      presentationWith(
        [
          requirement({ id: 'A-01', checked: true, coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }] }),
          requirement({ id: 'A-02', checked: true, coveringPhases: [{ raw: 'Phase 2', targetPhaseKey: PHASE_2_KEY }] }),
        ],
        [inProgressPhase, unrecognisedPhase],
      ),
    );

    expect(view.coverage.inFlightPhase).toBe(2);
    expect(view.coverage.completePhase).toBe(0);
  });

  it('Test 4: a row whose only covering phase has no directory on disk lands in the missing bucket', () => {
    const missingPhase = phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'no_directory' });
    const req = requirement({
      checked: true,
      coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }],
    });
    const view = buildTraceabilityViewModel(presentationWith([req], [missingPhase]));

    expect(view.coverage.missingPhase).toBe(1);
    expect(view.coverage.inFlightPhase).toBe(0);
  });

  it('Test 5: a row whose every covering reference is unresolved lands in the unresolved bucket', () => {
    const req = requirement({
      checked: true,
      coveringPhases: [{ raw: 'Phase 99', targetPhaseKey: null }],
    });
    const view = buildTraceabilityViewModel(presentationWith([req]));

    expect(view.coverage.unresolvedPhase).toBe(1);
    expect(view.coverage.uncovered).toBe(0);
  });

  it('Test 6: a row with no covering reference at all lands in the uncovered bucket', () => {
    const req = requirement({ checked: true, coveringPhases: [] });
    const view = buildTraceabilityViewModel(presentationWith([req]));
    const row = allRows(view.groups)[0];

    expect(row.uncovered).toBe(true);
    expect(view.coverage.uncovered).toBe(1);
    expect(view.coverage.completePhase).toBe(0);
  });

  it('Test 7: a row covered by both a complete phase and an in-flight phase lands in the in-flight bucket — the weakest covering phase decides', () => {
    const completePhase = phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'complete' });
    const inProgressPhase = phase({ key: PHASE_2_KEY, identity: PHASE_2_IDENTITY, diskStatus: 'in_progress' });
    const req = requirement({
      checked: true,
      coveringPhases: [
        { raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY },
        { raw: 'Phase 2', targetPhaseKey: PHASE_2_KEY },
      ],
    });
    const view = buildTraceabilityViewModel(presentationWith([req], [completePhase, inProgressPhase]));

    expect(view.coverage.inFlightPhase).toBe(1);
    expect(view.coverage.completePhase).toBe(0);
  });

  it('Test 8: the requirement-side tally counts rows whose own requirementStatus is exactly true, computed without reading any covering phase', () => {
    const inProgressPhase = phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'in_progress' });
    const view = buildTraceabilityViewModel(
      presentationWith(
        [
          requirement({ id: 'A-01', checked: true, coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }] }),
          requirement({ id: 'A-02', checked: false, coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }] }),
          requirement({ id: 'A-03', checked: true, coveringPhases: [] }),
        ],
        [inProgressPhase],
      ),
    );

    // A-01 and A-03 are checked=true; A-02 is checked=false. Both A-01's and A-03's covering
    // state differ (in-flight vs. uncovered), proving claimedComplete never reads the phase side.
    expect(view.coverage.claimedComplete).toBe(2);
  });

  it('Test 9: an empty requirements array yields an all-zero coverage and 0 percent for both percentages, with no thrown error', () => {
    expect(() => buildTraceabilityViewModel(presentationWith([]))).not.toThrow();
    const view = buildTraceabilityViewModel(presentationWith([]));

    expect(view.coverage).toEqual({
      total: 0,
      completePhase: 0,
      inFlightPhase: 0,
      missingPhase: 0,
      unresolvedPhase: 0,
      uncovered: 0,
      tracedPercent: 0,
      completePhasePercent: 0,
      claimedComplete: 0,
      mismatched: 0,
    });
  });

  it('Test 10: counts stays exactly the three pre-existing keys — the new projection never widens it', () => {
    const view = buildTraceabilityViewModel(presentationWith([requirement()]));

    expect(Object.keys(view.counts).sort()).toEqual(['disagreement', 'total', 'uncovered']);
  });

  it('Test 11: tracedPercent and completePhasePercent are whole numbers computed against total', () => {
    const completeReq = requirement({
      id: 'A-01',
      checked: true,
      coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }],
    });
    const uncoveredReq = requirement({ id: 'A-02', checked: true, coveringPhases: [] });
    const view = buildTraceabilityViewModel(
      presentationWith([completeReq, uncoveredReq], [phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'complete' })]),
    );

    expect(view.coverage.tracedPercent).toBe(50);
    expect(view.coverage.completePhasePercent).toBe(50);
  });

  it('Test 12: against fixtures/dense, every group\'s five buckets sum to that group\'s row count, and the groups\' buckets sum to the whole-view buckets', async () => {
    const root = resolve('fixtures/dense');
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const snapshot = await repository.load();
    const presentation = toProjectPresentation(snapshot);
    const view = buildTraceabilityViewModel(presentation);
    const totalRows = view.groups.reduce((sum, group) => sum + group.rows.length, 0);

    expect(view.coverage.total).toBe(totalRows);
    expect(sumBuckets(view.coverage)).toBe(totalRows);

    const summed = view.groups.reduce(
      (acc, group) => ({
        completePhase: acc.completePhase + group.coverage.completePhase,
        inFlightPhase: acc.inFlightPhase + group.coverage.inFlightPhase,
        missingPhase: acc.missingPhase + group.coverage.missingPhase,
        unresolvedPhase: acc.unresolvedPhase + group.coverage.unresolvedPhase,
        uncovered: acc.uncovered + group.coverage.uncovered,
      }),
      { completePhase: 0, inFlightPhase: 0, missingPhase: 0, unresolvedPhase: 0, uncovered: 0 },
    );

    expect(summed).toEqual({
      completePhase: view.coverage.completePhase,
      inFlightPhase: view.coverage.inFlightPhase,
      missingPhase: view.coverage.missingPhase,
      unresolvedPhase: view.coverage.unresolvedPhase,
      uncovered: view.coverage.uncovered,
    });

    for (const group of view.groups) {
      expect(sumBuckets(group.coverage)).toBe(group.rows.length);
    }
  });
});

describe('TraceabilityGroup.coverage (NS4 Task 2, quick-260918-qkd Task 1)', () => {
  it('Test 1: each group carries its own coverage, derived from that group\'s rows only', () => {
    const view = buildTraceabilityViewModel(
      presentationWith([
        requirement({ id: 'A-01', category: 'Alpha', checked: true, coveringPhases: [] }),
        requirement({ id: 'A-02', category: 'Alpha', checked: true, coveringPhases: [] }),
        requirement({
          id: 'B-01',
          category: 'Beta',
          checked: true,
          coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }],
        }),
      ], [phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'complete' })]),
    );
    const alpha = view.groups.find((group) => group.category === 'Alpha')!;
    const beta = view.groups.find((group) => group.category === 'Beta')!;

    expect(alpha.coverage.completePhasePercent).toBe(0);
    expect(beta.coverage.completePhasePercent).toBe(100);
  });

  it('Test 2: summing each bucket across every group equals the whole-view coverage', () => {
    const view = buildTraceabilityViewModel(
      presentationWith([
        requirement({ id: 'A-01', category: 'Alpha', checked: true, coveringPhases: [] }),
        requirement({
          id: 'B-01',
          category: 'Beta',
          checked: true,
          coveringPhases: [{ raw: 'Phase 1', targetPhaseKey: PHASE_1_KEY }],
        }),
      ], [phase({ key: PHASE_1_KEY, identity: PHASE_1_IDENTITY, diskStatus: 'complete' })]),
    );
    const summed = view.groups.reduce(
      (acc, group) => ({
        completePhase: acc.completePhase + group.coverage.completePhase,
        uncovered: acc.uncovered + group.coverage.uncovered,
      }),
      { completePhase: 0, uncovered: 0 },
    );

    expect(summed).toEqual({
      completePhase: view.coverage.completePhase,
      uncovered: view.coverage.uncovered,
    });
  });

  it('Test 3: against fixtures/dense, every group\'s five bucket counts sum to that group\'s own row count', async () => {
    const root = resolve('fixtures/dense');
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const snapshot = await repository.load();
    const presentation = toProjectPresentation(snapshot);
    const view = buildTraceabilityViewModel(presentation);

    for (const group of view.groups) {
      expect(
        group.coverage.completePhase +
          group.coverage.inFlightPhase +
          group.coverage.missingPhase +
          group.coverage.unresolvedPhase +
          group.coverage.uncovered,
      ).toBe(group.rows.length);
    }
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
  return { query: '', status: 'all', includeHistory: false, ...overrides };
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

describe('deferredTiers (NS4 Task 3)', () => {
  it('Test 1: groups deferredRows by tier in first-appearance order; every deferred row appears in exactly one tier; deferredRows itself is unchanged', () => {
    const view = buildTraceabilityViewModel(
      presentationWith([
        requirement({ id: 'V2-01', tier: 'v2', checked: null }),
        requirement({ id: 'V3-01', tier: 'v3', checked: null }),
        requirement({ id: 'V2-02', tier: 'v2', checked: null }),
      ]),
    );

    expect(view.deferredTiers.map((tier) => tier.tier)).toEqual(['v2', 'v3']);
    expect(view.deferredTiers[0].rows.map((row) => row.id)).toEqual(['V2-01', 'V2-02']);
    expect(view.deferredTiers[1].rows.map((row) => row.id)).toEqual(['V3-01']);
    expect(view.deferredRows.map((row) => row.id)).toEqual(['V2-01', 'V3-01', 'V2-02']);

    const tieredIds = view.deferredTiers.flatMap((tier) => tier.rows.map((row) => row.id));
    expect(new Set(tieredIds).size).toBe(tieredIds.length);
    expect(new Set(tieredIds)).toEqual(new Set(view.deferredRows.map((row) => row.id)));
  });

  it('Test 2: a corpus with no deferred requirements yields an empty deferredTiers array, not a single empty tier', () => {
    const view = buildTraceabilityViewModel(presentationWith([requirement({ checked: true })]));

    expect(view.deferredTiers).toEqual([]);
  });
});

describe('includeHistory filter axis (NS4 Task 3)', () => {
  it('Test 3: DEFAULT_TRACEABILITY_FILTER carries includeHistory set to false', () => {
    expect(DEFAULT_TRACEABILITY_FILTER.includeHistory).toBe(false);
  });

  it('Test 4: matchesTraceabilityFilter is unchanged for active-tier rows with the new field present', () => {
    const row = traceabilityRow({ id: 'TGT-01', text: 'Dashboard renders the project path' });

    expect(matchesTraceabilityFilter(row, filterState({ query: 'tgt-01', includeHistory: true }))).toBe(true);
    expect(matchesTraceabilityFilter(row, filterState({ query: 'no-match', includeHistory: false }))).toBe(false);
  });

  it('Test 5: includeHistory governs whether deferred tiers are filtered at all', () => {
    const row = traceabilityRow({ id: 'V2-01', text: 'Some deferred requirement', uncovered: true });

    // Off: matches regardless of query/status.
    expect(matchesDeferredTraceabilityFilter(row, filterState({ query: 'no-match-at-all', includeHistory: false }))).toBe(
      true,
    );
    // On: subject to the same query/status rules as an active row.
    expect(matchesDeferredTraceabilityFilter(row, filterState({ query: 'no-match-at-all', includeHistory: true }))).toBe(
      false,
    );
    expect(matchesDeferredTraceabilityFilter(row, filterState({ query: 'deferred', includeHistory: true }))).toBe(true);
  });
});
