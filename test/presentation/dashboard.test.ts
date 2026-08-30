import { describe, expect, it } from 'vitest';
import type {
  CoverageWaitDto,
  PhaseDto,
  PlanCheckpointDto,
  PlanDto,
  ProjectPresentation,
} from '../../src/server/project-presentation.ts';
import { buildDashboardViewModel } from '../../src/presentation/dashboard.ts';
import {
  buildPhaseUrl,
  buildPlanUrl,
  milestoneKeyOf,
  parsePresentationUrl,
  phaseKeyOf,
} from '../../src/presentation/routes.ts';

const LIVE_IDENTITY = { milestoneVersion: 'v2.0', number: '01', projectCode: null, slug: 'live' };
const LATER_IDENTITY = { milestoneVersion: 'v2.0', number: '02', projectCode: null, slug: 'later' };
const LIVE_PHASE_KEY = phaseKeyOf(LIVE_IDENTITY);
const LATER_PHASE_KEY = phaseKeyOf(LATER_IDENTITY);
const LIVE_MILESTONE_KEY = milestoneKeyOf('v2.0');

function plan(id: string, complete: boolean, dependsOn: PlanDto['dependsOn'] = []): PlanDto {
  return {
    key: `plan:${id}`,
    id,
    phaseKey: LIVE_PHASE_KEY,
    planNumber: id.split('-').at(-1) ?? id,
    path: `.planning/phases/01-live/${id}-PLAN.md`,
    description: null,
    frontmatter: {},
    complete,
    summary: complete ? { key: `summary:${id}`, path: `${id}-SUMMARY.md`, frontmatter: {} } : null,
    dependsOn,
    checkpoints: [],
  };
}

function phase(overrides: Partial<PhaseDto> = {}): PhaseDto {
  return {
    key: LIVE_PHASE_KEY,
    milestoneKey: LIVE_MILESTONE_KEY,
    identity: LIVE_IDENTITY,
    name: 'Live phase',
    dirPath: '.planning/phases/01-live',
    archived: false,
    goal: 'Ship the live phase',
    dependsOnRaw: null,
    requirementIds: [],
    requirementRefs: [],
    successCriteria: [],
    roadmapComplete: false,
    formalPlanProgress: {
      completed: 1,
      total: 2,
      sourcePath: '.planning/ROADMAP.md',
    },
    diskStatus: 'in_progress',
    plans: [plan('01-01', true), plan('01-02', false)],
    ...overrides,
  } as PhaseDto;
}

function checkpoint(overrides: Partial<PlanCheckpointDto> = {}): PlanCheckpointDto {
  return {
    key: 'checkpoint:approval',
    planKey: 'plan:01-02',
    planId: '01-02',
    phaseKey: LIVE_PHASE_KEY,
    index: 0,
    name: 'Approval',
    type: 'checkpoint:human-verify',
    gate: 'blocking-human',
    status: 'pending',
    evidenceKey: null,
    ...overrides,
  };
}

function coverageWait(overrides: Partial<CoverageWaitDto> = {}): CoverageWaitDto {
  return {
    key: 'coverage:01-01:D1',
    planKey: 'plan:01-01',
    planId: '01-01',
    phaseKey: LIVE_PHASE_KEY,
    coverageId: 'D1',
    description: 'Needs visual judgment',
    status: 'pending',
    evidenceKey: null,
    ...overrides,
  };
}

function presentation(
  overrides: Partial<ProjectPresentation> = {},
  phaseOverrides: Partial<PhaseDto> = {},
): ProjectPresentation {
  const currentPhase = phase(phaseOverrides);
  return {
    readAt: '2026-08-27T02:00:00.000Z',
    loadStatus: { status: 'ok' },
    rootPath: '/project',
    projectName: 'GSD 雪',
    config: {},
    state: {
      sourcePath: '.planning/STATE.md',
      milestone: 'v2.0',
      phaseNumber: '01',
      phaseName: '現在地 🧭',
      status: 'custom-future-status',
      progress: {
        totalPhases: 4,
        completedPhases: 1,
        totalPlans: 7,
        completedPlans: 2,
        percent: 28.5714285714,
      },
      blockersConcerns: null,
    },
    milestones: [
      {
        key: 'milestone:v2',
        version: 'v2.0',
        name: 'Milestone 雪',
        archived: false,
        phases: [currentPhase],
      },
    ],
    requirements: [],
    artifacts: [],
    blockers: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
    ...overrides,
  };
}

describe('buildDashboardViewModel', () => {
  it('healthy: leads with exact STATE position/progress and one explained ready plan', () => {
    const view = buildDashboardViewModel(presentation());

    expect(view.readAt).toBe('2026-08-27T02:00:00.000Z');
    expect(view.current).toMatchObject({
      milestone: { value: 'v2.0', display: 'v2.0' },
      phaseNumber: { value: '01', display: '01' },
      phaseName: { value: '現在地 🧭', display: '現在地 🧭' },
      status: { value: 'custom-future-status', display: 'custom-future-status' },
    });
    expect(view.current.progress.completedPlans).toMatchObject({ value: 2, display: '2' });
    expect(view.current.progress.totalPlans).toMatchObject({ value: 7, display: '7' });
    expect(view.current.progress.computedPercent.value).toBe((2 / 7) * 100);
    expect(view.current.progress.computedPercent.display).toBe('28.6%');
    expect(view.next.immediate).toMatchObject({
      kind: 'plan',
      key: 'plan:01-02',
      description: 'Plan 01-02 is ready to begin.',
      url: 'plan:01-02',
    });
    expect(view.next.previews).toHaveLength(0);
    expect(view.attention).toEqual([]);
  });

  it('discrepant: keeps formal roadmap and observed SUMMARY counts separate with provenance', () => {
    const view = buildDashboardViewModel(
      presentation(
        {},
        {
          roadmapComplete: true,
          formalPlanProgress: { completed: 2, total: 2, sourcePath: '.planning/ROADMAP.md' },
          plans: [plan('01-01', true), plan('01-02', false)],
        },
      ),
    );

    expect(view.completion.formal).toEqual({
      completed: 2,
      total: 2,
      status: 'complete',
      provenance: { kind: 'roadmap', ref: '.planning/ROADMAP.md' },
    });
    expect(view.completion.observed).toEqual({
      completed: 1,
      total: 2,
      status: 'in_progress',
      provenance: { kind: 'summary', ref: LIVE_PHASE_KEY },
    });
    expect(view.attention[0]).toMatchObject({ type: 'discrepancy', sourceKey: LIVE_PHASE_KEY });
    expect(view.attention.filter((item) => item.type === 'discrepancy')).toHaveLength(1);
  });

  it('zero-plan: retains observed disk status and exact 0/0 without manufacturing completion', () => {
    const view = buildDashboardViewModel(
      presentation(
        {},
        {
          roadmapComplete: null,
          formalPlanProgress: null,
          diskStatus: 'researched',
          plans: [],
        },
      ),
    );

    expect(view.completion.formal).toMatchObject({
      completed: null,
      total: null,
      status: null,
    });
    expect(view.completion.observed).toMatchObject({
      completed: 0,
      total: 0,
      status: 'researched',
    });
    expect(view.attention.some((item) => item.type === 'discrepancy')).toBe(false);
  });

  it('null-formal: preserves absence and never defaults it from observed completion', () => {
    const view = buildDashboardViewModel(
      presentation(
        {},
        {
          roadmapComplete: null,
          formalPlanProgress: null,
          diskStatus: 'complete',
          plans: [plan('01-01', true)],
        },
      ),
    );

    expect(view.completion.formal.status).toBeNull();
    expect(view.completion.observed.status).toBe('complete');
    expect(view.attention).toEqual([]);
  });

  it('Unicode: preserves milestone, phase, project, and open status values byte-for-byte', () => {
    const view = buildDashboardViewModel(presentation());
    expect(JSON.parse(JSON.stringify(view))).toMatchObject({
      projectName: 'GSD 雪',
      current: {
        milestone: { value: 'v2.0' },
        phaseName: { value: '現在地 🧭' },
        status: { value: 'custom-future-status' },
      },
    });
  });

  it('missing STATE members stay unavailable and missing progress is Not recorded, never zero', () => {
    const source = presentation();
    if (!source.state) throw new Error('test fixture requires state');
    source.state = {
      ...source.state,
      milestone: null,
      phaseNumber: null,
      phaseName: null,
      progress: {
        totalPhases: null,
        completedPhases: 0,
        totalPlans: null,
        completedPlans: 0,
        percent: null,
      },
    };
    const view = buildDashboardViewModel(source);

    expect(view.current.milestone).toEqual({
      value: null,
      display: 'Unavailable',
      provenance: { kind: 'state', ref: '.planning/STATE.md#milestone' },
    });
    expect(view.current.progress.totalPlans).toMatchObject({
      value: null,
      display: 'Not recorded',
    });
    expect(view.current.progress.completedPlans).toMatchObject({ value: 0, display: '0' });
    expect(view.current.progress.computedPercent).toMatchObject({
      value: null,
      display: 'Not recorded',
    });
    expect(view.completion.currentPhaseKey).toBeNull();
  });

  it('blocked dependency: excludes blocked plans from next work and reports dependency attention', () => {
    const blocked = plan('01-02', false, [{ raw: '01-99', targetPlanKey: null }]);
    const later = phase({
      key: LATER_PHASE_KEY,
      identity: LATER_IDENTITY,
      name: 'Later',
      diskStatus: 'no_directory',
      roadmapComplete: null,
      formalPlanProgress: null,
      plans: [],
    });
    const source = presentation({}, { plans: [plan('01-01', true), blocked] });
    source.milestones[0].phases.push(later);
    const view = buildDashboardViewModel(source);

    expect(view.next.immediate).toMatchObject({ kind: 'phase', key: LATER_PHASE_KEY });
    expect(view.attention).toContainEqual(
      expect.objectContaining({ type: 'dependency', sourceKey: 'plan:01-02' }),
    );
  });

  it('phase-kind next-work url round-trips through the canonical phase-URL builder (CR-01)', () => {
    const later = phase({
      key: LATER_PHASE_KEY,
      identity: LATER_IDENTITY,
      name: 'Later',
      diskStatus: 'no_directory',
      roadmapComplete: null,
      formalPlanProgress: null,
      plans: [],
    });
    const source = presentation({}, { plans: [plan('01-01', true), plan('01-02', true)] });
    source.milestones[0].phases.push(later);
    const view = buildDashboardViewModel(source);

    expect(view.next.immediate).toMatchObject({ kind: 'phase', key: LATER_PHASE_KEY });
    const url = view.next.immediate?.url ?? '';
    expect(url).toBe(buildPhaseUrl(LATER_IDENTITY));
    const parsed = parsePresentationUrl(url);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.route.kind).toBe('phase');
      if (parsed.route.kind === 'phase') {
        expect(phaseKeyOf(parsed.route.phaseIdentity)).toBe(LATER_PHASE_KEY);
      }
    }
  });

  it('blocker-kind next-work url round-trips to the current phase route when resolvable (CR-01)', () => {
    const view = buildDashboardViewModel(
      presentation({
        blockers: [
          {
            key: 'state:blocker',
            sourcePath: '.planning/STATE.md',
            heading: 'Blockers',
            text: 'Authored blocker',
          },
        ],
      }),
    );
    expect(view.next.immediate).toMatchObject({ kind: 'blocker' });
    const url = view.next.immediate?.url ?? '';
    expect(url).toBe(buildPhaseUrl(LIVE_IDENTITY));
    const parsed = parsePresentationUrl(url);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.route.kind).toBe('phase');
  });

  it('blocker-kind next-work url falls back to /roadmap when no current phase is resolvable (CR-01)', () => {
    const source = presentation({
      blockers: [
        {
          key: 'state:blocker',
          sourcePath: '.planning/STATE.md',
          heading: 'Blockers',
          text: 'Authored blocker',
        },
      ],
    });
    if (!source.state) throw new Error('test fixture requires state');
    source.state = { ...source.state, milestone: null, phaseNumber: null };
    const view = buildDashboardViewModel(source);
    expect(view.next.immediate).toMatchObject({ kind: 'blocker' });
    const url = view.next.immediate?.url ?? '';
    expect(url).toBe('/roadmap');
    const parsed = parsePresentationUrl(url);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.route.kind).toBe('roadmap');
  });

  it('checkpoint wait: reports each pending blocking-human checkpoint once', () => {
    const wait = checkpoint();
    const view = buildDashboardViewModel(presentation({ checkpoints: [wait, wait] }));
    expect(view.attention.filter((item) => item.type === 'checkpoint')).toEqual([
      expect.objectContaining({ sourceKey: wait.key }),
    ]);
  });

  it('makes a pending human verification the typed next action ahead of routine plan work', () => {
    const wait = checkpoint({ name: 'Approve the browser review' });
    const view = buildDashboardViewModel(presentation({ checkpoints: [wait] }));

    expect(view.next.immediate).toMatchObject({
      kind: 'human-verification',
      title: 'Approve the browser review',
      url: 'plan:01-02',
    });
    expect(view.next.previews[0]).toMatchObject({ kind: 'plan', key: 'plan:01-02' });
    expect(view.next.immediate?.key).not.toBe(view.next.previews[0]?.key);
  });

  it('uses the authored phase goal as next-phase description', () => {
    const later = phase({
      key: LATER_PHASE_KEY,
      identity: LATER_IDENTITY,
      name: 'Later',
      goal: 'Deliver the authored intent, not a progress diagnosis.',
      plans: [],
      diskStatus: 'no_directory',
      formalPlanProgress: null,
      roadmapComplete: null,
    });
    const source = presentation({}, { plans: [] });
    source.milestones[0].phases.push(later);

    expect(buildDashboardViewModel(source).next.immediate).toMatchObject({
      kind: 'phase',
      description: 'Ship the live phase',
    });
  });

  it('unsatisfied human_judgment: reports the exact pending coverage identity', () => {
    const wait = coverageWait();
    const view = buildDashboardViewModel(presentation({ coverageWaits: [wait] }));
    expect(view.attention).toContainEqual(
      expect.objectContaining({ type: 'coverage', sourceKey: wait.key }),
    );
  });

  it('matching pass suppression: suppresses only the checkpoint and coverage records marked passed', () => {
    const view = buildDashboardViewModel(
      presentation({
        checkpoints: [checkpoint({ status: 'passed', evidenceKey: 'uat:checkpoint' })],
        coverageWaits: [coverageWait({ status: 'passed', evidenceKey: 'uat:coverage' })],
      }),
    );
    expect(view.attention.filter((item) => ['checkpoint', 'coverage'].includes(item.type))).toEqual(
      [],
    );
  });

  it('unrelated pass non-suppression: pending identities remain visible beside other passed records', () => {
    const pendingCheckpoint = checkpoint();
    const pendingCoverage = coverageWait();
    const view = buildDashboardViewModel(
      presentation({
        checkpoints: [
          pendingCheckpoint,
          checkpoint({
            key: 'checkpoint:other',
            name: 'Other',
            status: 'passed',
            evidenceKey: 'uat:x',
          }),
        ],
        coverageWaits: [
          pendingCoverage,
          coverageWait({
            key: 'coverage:other',
            coverageId: 'OTHER',
            status: 'passed',
            evidenceKey: 'uat:y',
          }),
        ],
      }),
    );
    expect(view.attention.map((item) => item.sourceKey)).toEqual([
      pendingCheckpoint.key,
      pendingCoverage.key,
    ]);
  });

  it('stable priority: discrepancy, authored blocker, dependency, then waits', () => {
    const blocked = plan('01-02', false, [{ raw: '01-99', targetPlanKey: null }]);
    const view = buildDashboardViewModel(
      presentation(
        {
          blockers: [
            {
              key: 'state:blocker',
              sourcePath: '.planning/STATE.md',
              heading: 'Blockers',
              text: 'Authored blocker',
            },
          ],
          checkpoints: [checkpoint()],
          coverageWaits: [coverageWait()],
        },
        {
          roadmapComplete: true,
          formalPlanProgress: { completed: 2, total: 2, sourcePath: '.planning/ROADMAP.md' },
          plans: [plan('01-01', true), blocked],
        },
      ),
    );
    expect(view.attention.map((item) => item.type)).toEqual([
      'discrepancy',
      'blocker',
      'dependency',
      'checkpoint',
      'coverage',
    ]);
  });

  it('returns at most two deterministic quieter previews after the immediate item', () => {
    const source = presentation(
      {},
      {
        plans: [
          plan('01-01', false),
          plan('01-02', false),
          plan('01-03', false),
          plan('01-04', false),
        ],
      },
    );
    const view = buildDashboardViewModel(source);
    expect(view.next.immediate?.key).toBe('plan:01-01');
    expect(view.next.previews.map((item) => item.key)).toEqual(['plan:01-02', 'plan:01-03']);
  });

  it('computedPercent.display renders at most one decimal place, never a raw float (WR-03)', () => {
    const evenSource = presentation();
    if (!evenSource.state) throw new Error('test fixture requires state');
    evenSource.state = {
      ...evenSource.state,
      progress: { ...evenSource.state.progress, completedPlans: 1, totalPlans: 2 },
    };
    const evenView = buildDashboardViewModel(evenSource);
    expect(evenView.current.progress.computedPercent.display).toBe('50%');
    expect(evenView.current.progress.computedPercent.value).toBe(50);

    const unroundedSource = presentation();
    if (!unroundedSource.state) throw new Error('test fixture requires state');
    unroundedSource.state = {
      ...unroundedSource.state,
      progress: { ...unroundedSource.state.progress, completedPlans: 2, totalPlans: 7 },
    };
    const unroundedView = buildDashboardViewModel(unroundedSource);
    expect(unroundedView.current.progress.computedPercent.display).toBe('28.6%');
    expect(unroundedView.current.progress.computedPercent.value).toBe((2 / 7) * 100);

    const nullTotalSource = presentation();
    if (!nullTotalSource.state) throw new Error('test fixture requires state');
    nullTotalSource.state = {
      ...nullTotalSource.state,
      progress: { ...nullTotalSource.state.progress, completedPlans: 2, totalPlans: null },
    };
    const nullTotalView = buildDashboardViewModel(nullTotalSource);
    expect(nullTotalView.current.progress.computedPercent).toMatchObject({
      value: null,
      display: 'Not recorded',
    });

    const zeroTotalSource = presentation();
    if (!zeroTotalSource.state) throw new Error('test fixture requires state');
    zeroTotalSource.state = {
      ...zeroTotalSource.state,
      progress: { ...zeroTotalSource.state.progress, completedPlans: 0, totalPlans: 0 },
    };
    const zeroTotalView = buildDashboardViewModel(zeroTotalSource);
    expect(zeroTotalView.current.progress.computedPercent).toMatchObject({
      value: null,
      display: 'Not recorded',
    });
  });

  it('discrepancy attention destination is buildPhaseUrl(currentPhase.identity) and round-trips (DASH-04)', () => {
    const view = buildDashboardViewModel(
      presentation(
        {},
        {
          roadmapComplete: true,
          formalPlanProgress: { completed: 2, total: 2, sourcePath: '.planning/ROADMAP.md' },
          plans: [plan('01-01', true), plan('01-02', false)],
        },
      ),
    );
    const discrepancy = view.attention.find((item) => item.type === 'discrepancy');
    expect(discrepancy?.url).toBe(buildPhaseUrl(LIVE_IDENTITY));
    const parsed = parsePresentationUrl(discrepancy?.url ?? '');
    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.route.kind === 'phase') {
      expect(phaseKeyOf(parsed.route.phaseIdentity)).toBe(LIVE_PHASE_KEY);
    }
  });

  it('authored-blocker attention destination equals buildPhaseUrl(currentPhase.identity) when a current phase resolves (G-02)', () => {
    const view = buildDashboardViewModel(
      presentation({
        blockers: [
          {
            key: 'state:blocker',
            sourcePath: '.planning/STATE.md',
            heading: 'Blockers',
            text: 'Authored blocker',
          },
        ],
      }),
    );
    const blocker = view.attention.find((item) => item.type === 'blocker');
    expect(blocker?.url).toBe(buildPhaseUrl(LIVE_IDENTITY));
  });

  it('authored-blocker attention destination falls back to /roadmap when no current phase resolves (G-02)', () => {
    const source = presentation({
      blockers: [
        {
          key: 'state:blocker',
          sourcePath: '.planning/STATE.md',
          heading: 'Blockers',
          text: 'Authored blocker',
        },
      ],
    });
    if (!source.state) throw new Error('test fixture requires state');
    source.state = { ...source.state, milestone: null, phaseNumber: null };
    const view = buildDashboardViewModel(source);
    const blocker = view.attention.find((item) => item.type === 'blocker');
    expect(blocker?.url).toBe('/roadmap');
  });

  it('dependency attention destination is the blocked plan own route', () => {
    const blocked = plan('01-02', false, [{ raw: '01-99', targetPlanKey: null }]);
    const view = buildDashboardViewModel(presentation({}, { plans: [plan('01-01', true), blocked] }));
    const dependency = view.attention.find((item) => item.type === 'dependency');
    expect(dependency?.url).toBe(blocked.key);
  });

  it('checkpoint and coverage attention destinations equal the owning plan route', () => {
    const wait = checkpoint();
    const coverage = coverageWait();
    const view = buildDashboardViewModel(
      presentation({ checkpoints: [wait], coverageWaits: [coverage] }),
    );
    const checkpointItem = view.attention.find((item) => item.type === 'checkpoint');
    const coverageItem = view.attention.find((item) => item.type === 'coverage');
    expect(checkpointItem?.url).toBe(wait.planKey);
    expect(coverageItem?.url).toBe(coverage.planKey);
  });

  it('no attention destination is ever a bare phase token, and every non-null destination round-trips through parsePresentationUrl', () => {
    // Dependency/checkpoint/coverage destinations are the owning plan's own key, which
    // production code (project-presentation.ts) always assigns from buildPlanUrl — so this
    // fixture builds a realistic plan key the same way, instead of the opaque `plan:01-02`
    // shorthand the other fixtures in this file use for identity-comparison-only tests.
    const realPlanKey = buildPlanUrl(LIVE_IDENTITY, '01-02');
    const blocked: PlanDto = { ...plan('01-02', false, [{ raw: '01-99', targetPlanKey: null }]), key: realPlanKey };
    const view = buildDashboardViewModel(
      presentation(
        {
          blockers: [
            {
              key: 'state:blocker',
              sourcePath: '.planning/STATE.md',
              heading: 'Blockers',
              text: 'Authored blocker',
            },
          ],
          checkpoints: [checkpoint({ planKey: realPlanKey })],
          coverageWaits: [coverageWait({ planKey: realPlanKey })],
        },
        {
          roadmapComplete: true,
          formalPlanProgress: { completed: 2, total: 2, sourcePath: '.planning/ROADMAP.md' },
          plans: [plan('01-01', true), blocked],
        },
      ),
    );
    expect(view.attention.length).toBeGreaterThan(0);
    for (const item of view.attention) {
      if (item.url === null) continue;
      expect(item.url.startsWith('p~')).toBe(false);
      const parsed = parsePresentationUrl(item.url);
      expect(parsed.ok).toBe(true);
    }
  });

  it('old/new snapshot isolation: repeated builds are deterministic and do not mix readAt values', () => {
    const oldPresentation = presentation();
    const oldBefore = buildDashboardViewModel(oldPresentation);
    const nextPresentation = presentation({ readAt: '2026-08-27T03:00:00.000Z' });
    if (!nextPresentation.state) throw new Error('test fixture requires state');
    nextPresentation.state.progress.completedPlans = 7;

    const newer = buildDashboardViewModel(nextPresentation);
    const oldAfter = buildDashboardViewModel(oldPresentation);

    expect(oldAfter).toEqual(oldBefore);
    expect(oldAfter.readAt).toBe('2026-08-27T02:00:00.000Z');
    expect(oldAfter.current.progress.completedPlans.value).toBe(2);
    expect(newer.readAt).toBe('2026-08-27T03:00:00.000Z');
    expect(newer.current.progress.completedPlans.value).toBe(7);
  });
});
