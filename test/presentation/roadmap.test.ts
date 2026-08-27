import { describe, expect, it } from 'vitest';
import type {
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
} from '../../src/server/project-presentation.ts';
import { buildPhaseUrl, buildPlanUrl } from '../../src/presentation/routes.ts';
import { buildRoadmapViewModel } from '../../src/presentation/roadmap.ts';

function plan(
  id: string,
  options: {
    complete?: boolean;
    wave?: unknown;
    dependsOn?: PlanDto['dependsOn'];
    phaseKey?: string;
  } = {},
): PlanDto {
  const phaseKey = options.phaseKey ?? '/milestones/m~v2.0/phases/current';
  return {
    key: `${phaseKey}/plans/${id}`,
    id,
    phaseKey,
    planNumber: id.split('-').at(-1) ?? id,
    path: `.planning/phases/${id}-PLAN.md`,
    frontmatter: options.wave === undefined ? {} : { wave: options.wave },
    complete: options.complete ?? false,
    summary: options.complete
      ? { key: `${id}-summary`, path: `${id}-SUMMARY.md`, frontmatter: {} }
      : null,
    dependsOn: options.dependsOn ?? [],
    checkpoints: [],
  };
}

function phase(
  number: string,
  options: Partial<PhaseDto> & { milestoneVersion?: string | null } = {},
): PhaseDto {
  const milestoneVersion = options.milestoneVersion ?? 'v2.0';
  const identity = options.identity ?? {
    milestoneVersion,
    number,
    projectCode: null,
    slug: `phase-${number}`,
  };
  const key = options.key ?? buildPhaseUrl(identity);
  return {
    milestoneKey: `milestone:${milestoneVersion ?? 'current'}`,
    name: `Phase ${number}`,
    dirPath: `.planning/phases/${number}-phase`,
    archived: false,
    goal: `Goal ${number}`,
    dependsOnRaw: number === '01' ? 'Nothing' : 'Phase 01',
    requirementIds: [`REQ-${number}`],
    requirementRefs: [{ raw: `REQ-${number}`, targetRequirementId: `REQ-${number}` }],
    successCriteria: [`Criterion ${number}`],
    roadmapComplete: false,
    formalPlanProgress: {
      completed: 0,
      total: options.plans?.length ?? 0,
      sourcePath: '.planning/ROADMAP.md',
    },
    diskStatus: 'in_progress',
    plans: options.plans ?? [],
    ...options,
    identity,
    key,
  };
}

function milestone(
  version: string,
  archived: boolean,
  phases: PhaseDto[],
  name = archived ? `Archive ${version}` : `Milestone ${version}`,
): MilestoneDto {
  return { key: `milestone:${version}`, version, name, archived, phases };
}

function presentation(milestones: MilestoneDto[]): ProjectPresentation {
  return {
    readAt: '2026-08-27T04:00:00.000Z',
    loadStatus: { status: 'ok' },
    rootPath: '/project',
    projectName: 'GSD Lore',
    config: {},
    state: null,
    milestones,
    requirements: [],
    artifacts: [],
    blockers: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
  };
}

describe('buildRoadmapViewModel', () => {
  it('keeps the active milestone first and history in a separate subordinate collection', () => {
    const source = presentation([
      milestone('v1.0', true, [phase('01', { milestoneVersion: 'v1.0', archived: true })]),
      milestone('v2.0', false, [phase('01')]),
      milestone('v0.9', true, [phase('01', { milestoneVersion: 'v0.9', archived: true })]),
    ]);

    const view = buildRoadmapViewModel(source);

    expect(view.active?.version).toBe('v2.0');
    expect(view.active?.archived).toBe(false);
    expect(view.history.map((entry) => entry.version)).toEqual(['v1.0', 'v0.9']);
    expect(view.history.every((entry) => entry.archived)).toBe(true);
  });

  it('orders adjacent and dotted phase numbers without collapsing them', () => {
    const source = presentation([
      milestone('v2.0', false, [phase('2'), phase('01.10'), phase('01'), phase('01.2')]),
    ]);

    expect(buildRoadmapViewModel(source).active?.phases.map((row) => row.number)).toEqual([
      '01',
      '01.2',
      '01.10',
      '2',
    ]);
  });

  it('preserves duplicate phase numbers as milestone-qualified rows and destinations', () => {
    const activePhase = phase('01');
    const archivedPhase = phase('01', { milestoneVersion: 'v1.0', archived: true });
    const view = buildRoadmapViewModel(
      presentation([
        milestone('v1.0', true, [archivedPhase]),
        milestone('v2.0', false, [activePhase]),
      ]),
    );

    expect(view.active?.phases[0]).toMatchObject({ key: activePhase.key, url: activePhase.key });
    expect(view.history[0].phases[0]).toMatchObject({
      key: archivedPhase.key,
      url: archivedPhase.key,
    });
    expect(view.active?.phases[0].url).not.toBe(view.history[0].phases[0].url);
  });

  it('exposes identity, status, goal, authored dependency text, progress, and expandable detail', () => {
    const row = buildRoadmapViewModel(
      presentation([
        milestone('v2.0', false, [
          phase('02', {
            roadmapComplete: true,
            diskStatus: 'complete',
            formalPlanProgress: {
              completed: 2,
              total: 2,
              sourcePath: '.planning/ROADMAP.md',
            },
          }),
        ]),
      ]),
    ).active?.phases[0];

    expect(row).toMatchObject({
      number: '02',
      name: 'Phase 02',
      goal: 'Goal 02',
      authoredDependencies: 'Phase 01',
      formalStatus: 'complete',
      observedStatus: 'complete',
      progress: { completed: 2, total: 2, sourcePath: '.planning/ROADMAP.md' },
      successCriteria: ['Criterion 02'],
      requirementIds: ['REQ-02'],
    });
  });

  it('uses explicit empty detail collections without manufacturing criteria or requirements', () => {
    const row = buildRoadmapViewModel(
      presentation([
        milestone('v2.0', false, [
          phase('01', {
            goal: null,
            dependsOnRaw: null,
            successCriteria: [],
            requirementIds: [],
            requirementRefs: [],
            plans: [],
            formalPlanProgress: null,
            roadmapComplete: null,
          }),
        ]),
      ]),
    ).active?.phases[0];

    expect(row).toMatchObject({
      goal: null,
      authoredDependencies: null,
      formalStatus: 'unknown',
      progress: null,
      successCriteria: [],
      requirementIds: [],
      waveBands: [],
    });
  });

  it('represents an active milestone with no phases as a labeled empty flow', () => {
    const view = buildRoadmapViewModel(presentation([milestone('v2.0', false, [])]));
    expect(view.active).toMatchObject({ name: 'Milestone v2.0', phases: [], empty: true });
  });

  it('groups open wave values into deterministic bands and reserves Unspecified for absence', () => {
    const identity = phase('02').identity;
    const phaseKey = buildPhaseUrl(identity);
    const plans = [
      plan('02-04', { wave: '10', phaseKey }),
      plan('02-03', { phaseKey }),
      plan('02-02', { wave: '2.1', phaseKey }),
      plan('02-01', { wave: 2, phaseKey }),
      plan('02-05', { wave: 'Alpha', phaseKey }),
    ];
    const row = buildRoadmapViewModel(
      presentation([milestone('v2.0', false, [phase('02', { plans })])]),
    ).active?.phases[0];

    expect(row?.waveBands.map((band) => band.label)).toEqual([
      'Wave 2',
      'Wave 2.1',
      'Wave 10',
      'Wave Alpha',
      'Unspecified',
    ]);
    expect(row?.waveBands.flatMap((band) => band.plans.map((entry) => entry.id))).toEqual([
      '02-01',
      '02-02',
      '02-04',
      '02-05',
      '02-03',
    ]);
  });

  it('shows every incomplete or dangling sibling dependency verbatim as blocked by', () => {
    const identity = phase('02').identity;
    const phaseKey = buildPhaseUrl(identity);
    const completed = plan('02-01', { complete: true, wave: 1, phaseKey });
    const incomplete = plan('02-02', { wave: 1, phaseKey });
    const blocked = plan('02-03', {
      wave: 2,
      phaseKey,
      dependsOn: [
        { raw: '02-01', targetPlanKey: completed.key },
        { raw: '02-02', targetPlanKey: incomplete.key },
        { raw: '02-99 authored', targetPlanKey: null },
      ],
    });
    const row = buildRoadmapViewModel(
      presentation([
        milestone('v2.0', false, [phase('02', { plans: [blocked, completed, incomplete] })]),
      ]),
    ).active?.phases[0];

    const projected = row?.waveBands
      .flatMap((band) => band.plans)
      .find((entry) => entry.id === '02-03');
    expect(projected?.blockedBy).toEqual(['02-02', '02-99 authored']);
    expect(projected?.url).toBe(buildPlanUrl(identity, '02-03'));
  });

  it('never converts authored phase dependency prose into inferred plan edges', () => {
    const row = buildRoadmapViewModel(
      presentation([
        milestone('v2.0', false, [
          phase('02', {
            dependsOnRaw: 'Phase 01, plus prose that mentions 02-99',
            plans: [plan('02-01')],
          }),
        ]),
      ]),
    ).active?.phases[0];

    expect(row?.authoredDependencies).toBe('Phase 01, plus prose that mentions 02-99');
    expect(row?.waveBands[0].plans[0].blockedBy).toEqual([]);
  });

  it('does not mutate one snapshot while projecting another', () => {
    const source = presentation([milestone('v2.0', false, [phase('02'), phase('01')])]);
    const before = structuredClone(source);
    const first = buildRoadmapViewModel(source);
    const second = buildRoadmapViewModel(source);

    expect(source).toEqual(before);
    expect(second).toEqual(first);
  });
});
