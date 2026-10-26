import { describe, expect, it } from 'vitest';
import type {
  ArtifactDto,
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
} from '../../src/server/project-presentation.ts';
import { buildPhaseUrl, buildPlanUrl } from '../../src/presentation/routes.ts';
import { buildRoadmapViewModel } from '../../src/presentation/roadmap.ts';
import { emptyLedger } from '../../src/server/dashboard-ledger.ts';

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
    description: `Authored description for ${id}`,
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

function milestonesArtifact(entries: unknown[]): ArtifactDto {
  return {
    key: '/artifacts/a~.planning%2FMILESTONES.md',
    path: '.planning/MILESTONES.md',
    kind: 'milestones',
    fileClass: 'text',
    sizeBytes: 0,
    title: 'Milestones',
    location: 'root',
    frontmatter: {},
    structured: { entries },
    milestoneKey: null,
    phaseKey: null,
    warnings: [],
    bodyLength: 1,
  };
}

function entry(version: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version,
    name: `Name ${version}`,
    shipped: '2026-09-10',
    status: null,
    delivered: `Delivered ${version}`,
    phases: '1-2 (2 plans total)',
    accomplishments: ['First'],
    stats: null,
    gitRange: null,
    whatsNext: null,
    extra: [],
    ...overrides,
  };
}

function presentation(milestones: MilestoneDto[]): ProjectPresentation {
  return {
    readAt: '2026-08-27T04:00:00.000Z',
    loadStatus: { status: 'ok' },
    rootPath: '/project',
    projectName: 'Labelore',
    config: {},
    state: null,
    milestones,
    requirements: [],
    artifacts: [],
    blockers: [],
    decisions: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
    exclusions: [],
    ledger: emptyLedger(),
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
    const identity = phase('02').identity;
    const phaseKey = buildPhaseUrl(identity);
    const plans = [
      plan('02-01', { complete: true, phaseKey }),
      plan('02-02', { complete: true, phaseKey }),
    ];
    const row = buildRoadmapViewModel(
      presentation([
        milestone('v2.0', false, [
          phase('02', {
            plans,
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
      observedProgress: { completed: 2, total: 2 },
      progressDisagreement: false,
      successCriteria: ['Criterion 02'],
      requirements: [{ id: 'REQ-02', text: null, checked: null, url: null }],
    });
  });

  it('flags a phase where ROADMAP.md checkbox counts disagree with observed SUMMARY completions', () => {
    const identity = phase('01').identity;
    const phaseKey = buildPhaseUrl(identity);
    const plans = [
      plan('01-01', { complete: true, phaseKey }),
      plan('01-02', { complete: true, phaseKey }),
    ];
    const row = buildRoadmapViewModel(
      presentation([
        milestone('v2.0', false, [
          phase('01', {
            plans,
            // ROADMAP.md only has the first plan's checkbox ticked, even though both
            // plans' SUMMARY.md files exist on disk (the exact 01-06 case).
            formalPlanProgress: { completed: 1, total: 2, sourcePath: '.planning/ROADMAP.md' },
          }),
        ]),
      ]),
    ).active?.phases[0];

    expect(row).toMatchObject({
      progress: { completed: 1, total: 2 },
      observedProgress: { completed: 2, total: 2 },
      progressDisagreement: true,
    });
  });

  it('does not flag a disagreement when there is no formal ROADMAP.md progress to compare', () => {
    const row = buildRoadmapViewModel(
      presentation([
        milestone('v2.0', false, [
          phase('01', {
            plans: [plan('01-01', { complete: true })],
            formalPlanProgress: null,
          }),
        ]),
      ]),
    ).active?.phases[0];

    expect(row).toMatchObject({
      progress: null,
      observedProgress: { completed: 1, total: 1 },
      progressDisagreement: false,
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
      formalStatus: null,
      progress: null,
      successCriteria: [],
      requirements: [],
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
    expect(projected?.description).toBe('Authored description for 02-03');
  });

  it('projects readable requirement definitions with stable REQUIREMENTS artifact anchors', () => {
    const source = presentation([milestone('v2.0', false, [phase('02')])]);
    source.requirements = [
      {
        id: 'REQ-02',
        category: 'Reader',
        text: 'Open the actual authored requirement.',
        tier: 'v1',
        checked: false,
        coveringPhases: [],
      },
    ];
    source.artifacts = [
      {
        key: '/artifacts/requirements',
        path: '.planning/REQUIREMENTS.md',
        kind: 'requirements',
        fileClass: 'text',
        sizeBytes: 0,
        title: 'Requirements',
        location: 'root',
        frontmatter: {},
        structured: {},
        milestoneKey: null,
        phaseKey: null,
        warnings: [],
        bodyLength: 0,
      },
    ];

    expect(buildRoadmapViewModel(source).active?.phases[0].requirements).toEqual([
      {
        id: 'REQ-02',
        text: 'Open the actual authored requirement.',
        checked: false,
        url: '/artifacts/requirements#requirement-req-02',
      },
    ]);
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

  it('attaches each History milestone its MILESTONES.md entry by version, case-insensitively', () => {
    const source = {
      ...presentation([
        milestone('v1.0', true, [phase('01', { milestoneVersion: 'v1.0', archived: true })]),
        milestone('V1.1', true, [phase('02', { milestoneVersion: 'V1.1', archived: true })]),
        milestone('v0.9', true, [phase('01', { milestoneVersion: 'v0.9', archived: true })]),
        milestone('v2.0', false, [phase('03')]),
      ]),
      artifacts: [
        milestonesArtifact([
          entry('v1.1'),
          entry('v1.0'),
          entry('v1.0', { name: 'Older duplicate' }),
          { version: 'v3.0' },
        ]),
      ],
    };

    const view = buildRoadmapViewModel(source);
    const [v10, v11, v09] = view.history;

    expect(v10.record).toMatchObject({
      name: 'Name v1.0',
      shipped: '10 Sep 2026',
      delivered: 'Delivered v1.0',
      accomplishments: ['First'],
    });
    expect(v11.record?.name).toBe('Name v1.1');
    expect(v09.record).toBeNull();
    expect(view.active?.record).toBeNull();
    expect(buildRoadmapViewModel(presentation([milestone('v1.0', true, [])])).history[0].record).toBeNull();
  });

  it('attaches each History milestone its RETROSPECTIVE.md section by version', () => {
    const points = (text: string) => [{ lead: null, text }];
    const retrospectiveArtifact: ArtifactDto = {
      ...milestonesArtifact([]),
      key: '/artifacts/a~.planning%2FRETROSPECTIVE.md',
      path: '.planning/RETROSPECTIVE.md',
      kind: 'retrospective',
      title: 'Project Retrospective',
      structured: {
        entries: [
          {
            version: 'v1.0',
            name: 'MVP',
            heading: 'Milestone: v1.0 — MVP',
            sections: { worked: points('A'), inefficient: [], patterns: points('B'), lessons: points('C') },
          },
          {
            version: 'V1.1',
            name: 'Docs',
            heading: 'Milestone: V1.1 — Docs',
            sections: { worked: [], inefficient: [], patterns: [], lessons: [] },
          },
          { version: 'v1.0', heading: 'Milestone: v1.0 — Duplicate', sections: { worked: points('Z') } },
          { version: 'v3.0' },
        ],
      },
    };
    const view = buildRoadmapViewModel({
      ...presentation([
        milestone('V1.0', true, [phase('01', { milestoneVersion: 'V1.0', archived: true })]),
        milestone('v1.1', true, [phase('02', { milestoneVersion: 'v1.1', archived: true })]),
        milestone('v2.0', false, [phase('03')]),
      ]),
      artifacts: [retrospectiveArtifact],
    });
    const [v10, v11] = view.history;

    expect(v10.retrospective).toEqual({
      sections: [
        { key: 'worked', label: 'What worked', points: points('A') },
        { key: 'inefficient', label: 'What was inefficient', points: [] },
        { key: 'patterns', label: 'Patterns established', points: points('B') },
        { key: 'lessons', label: 'Key lessons', points: points('C') },
      ],
    });
    // A section with no points at all is no retrospective.
    expect(v11.retrospective).toBeNull();
    expect(view.active?.retrospective).toBeNull();
    expect(buildRoadmapViewModel(presentation([milestone('v1.0', true, [])])).history[0].retrospective).toBeNull();
  });

  it('counts days from a stated figure, then a date range in the stats, then the previous ship date', () => {
    const archived = ['v1.3', 'v1.2', 'v1.1', 'v1.0'].map((version) =>
      milestone(version, true, [phase('01', { milestoneVersion: version, archived: true })]),
    );
    const view = buildRoadmapViewModel({
      ...presentation(archived),
      artifacts: [
        milestonesArtifact([
          entry('v1.3', { shipped: '2026-10-01', stats: { label: 'Stats', text: '', items: ['8 days from v1.2 to v1.3'] } }),
          entry('v1.2', { shipped: '2026-09-21', stats: { label: 'Stats', text: '127 commits, 2026-09-10 → 2026-09-21', items: [] } }),
          entry('v1.1', { shipped: '2026-09-05' }),
          entry('v1.0', { shipped: '2026-08-30' }),
        ]),
      ],
    });

    expect(view.history.map((flow) => flow.record?.days)).toEqual([8, 11, 6, null]);
  });
});
