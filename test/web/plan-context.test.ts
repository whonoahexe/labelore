// quick-261006-iz6 (QKIZ6-06, QKIZ6-08): findPlanContext over a literal presentation — dependencies
// resolved to titles / state / in-app URLs, requirement texts looked up in the plan's own milestone
// first, the live root next and the other archives newest first, the dates passed through, and the
// null / empty cases.
import { describe, expect, it } from 'vitest';
import { buildArtifactUrl, buildPlanUrl } from '../../src/presentation/routes.ts';
import type { ArtifactDto, PhaseDto, PlanDto, ProjectPresentation } from '../../src/server/project-presentation.ts';
import { findPlanContext } from '../../src/web/views/plan-context.ts';

const IDENTITY = { milestoneVersion: null, number: '01', projectCode: null, slug: 'identity' } as const;

function plan(id: string, over: Partial<PlanDto> = {}): PlanDto {
  return {
    key: buildPlanUrl(IDENTITY, id),
    id,
    phaseKey: 'phase',
    planNumber: id.slice(3),
    path: `.planning/phases/01-identity/${id}-PLAN.md`,
    description: null,
    frontmatter: {},
    complete: false,
    summary: null,
    dependsOn: [],
    checkpoints: [],
    ...over,
  };
}

function requirements(path: string, items: { id: string; text: string }[]): ArtifactDto {
  return {
    key: path,
    path,
    kind: 'requirements',
    title: 'Requirements',
    location: 'milestone-root',
    frontmatter: {},
    structured: { items },
    milestoneKey: null,
    phaseKey: null,
    warnings: [],
    bodyLength: 1,
  };
}

const PLAN_03 = plan('01-03', { complete: true, description: 'The `backstage` account CLI' });
const PLAN_04 = plan('01-04', { complete: false });
const PLAN_06 = plan('01-06', {
  dependsOn: [
    { raw: '01-03', targetPlanKey: PLAN_03.key },
    { raw: '01-04', targetPlanKey: PLAN_04.key },
    { raw: '01-99', targetPlanKey: null },
  ],
});

const PHASE: PhaseDto = {
  key: 'phase',
  milestoneKey: 'm',
  identity: { ...IDENTITY },
  name: 'Identity',
  dirPath: '.planning/phases/01-identity',
  archived: false,
  goal: null,
  dependsOnRaw: null,
  requirementIds: [],
  requirementRefs: [],
  successCriteria: [],
  roadmapComplete: null,
  formalPlanProgress: null,
  diskStatus: 'in_progress',
  plans: [PLAN_03, PLAN_04, PLAN_06],
};

function presentation(overrides: Partial<ProjectPresentation> = {}): ProjectPresentation {
  return {
    readAt: '2026-10-07T00:00:00.000Z',
    loadStatus: { status: 'ok' },
    rootPath: '/project',
    projectName: 'p',
    config: {},
    state: null,
    milestones: [{ key: 'm', version: null, name: 'Current', archived: false, phases: [PHASE] }],
    requirements: [{ id: 'AUTH-01', category: 'Auth', text: 'Live text', tier: 'v1', checked: null, coveringPhases: [] }],
    artifacts: [
      requirements('.planning/milestones/v1.1-REQUIREMENTS.md', [
        { id: 'VIEW-01', text: 'v1.1 view text' },
        { id: 'AUTH-01', text: 'v1.1 auth text' },
      ]),
      requirements('.planning/milestones/v1.0-REQUIREMENTS.md', [
        { id: 'AUTH-01', text: 'v1.0 auth text' },
        { id: 'DASH-01', text: 'v1.0 dash text' },
      ]),
    ],
    blockers: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
    exclusions: [],
    ...overrides,
  };
}

const ARTIFACT = { path: PLAN_06.path, addedAt: '2026-08-03T22:12:52+05:30', mtimeMs: 42 };

describe('findPlanContext', () => {
  it('resolves dependencies to titles, completion and in-app URLs', () => {
    const context = findPlanContext(presentation(), ARTIFACT, IDENTITY);
    expect(context?.dependencies).toEqual([
      { raw: '01-03', id: '01-03', title: 'The `backstage` account CLI', complete: true, url: buildArtifactUrl(IDENTITY, PLAN_03.path) },
      { raw: '01-04', id: '01-04', title: null, complete: false, url: buildArtifactUrl(IDENTITY, PLAN_04.path) },
      { raw: '01-99', id: '01-99', title: null, complete: false, url: null },
    ]);
  });

  it('falls back to the dependency document\'s own objective title', () => {
    const withTitle = presentation({
      artifacts: [
        {
          ...requirements(PLAN_04.path, []),
          kind: 'plan',
          structured: { plan: { objective: { title: 'Throttle repeated failed logins' } } },
        },
      ],
    });
    const context = findPlanContext(withTitle, ARTIFACT, IDENTITY);
    expect(context?.dependencies[1].title).toBe('Throttle repeated failed logins');
  });

  it('passes the dates through and reads the plan\'s ROADMAP description', () => {
    const context = findPlanContext(presentation(), ARTIFACT, IDENTITY);
    expect(context).toMatchObject({ addedAt: '2026-08-03T22:12:52+05:30', mtimeMs: 42 });
    expect(findPlanContext(presentation(), { path: PLAN_03.path }, IDENTITY)?.description).toBe('The `backstage` account CLI');
  });

  it('looks requirement text up in the plan\'s own milestone first for an archived plan', () => {
    const archived = { path: '.planning/milestones/v1.1-phases/05-x/05-01-PLAN.md' };
    const identity = { milestoneVersion: 'v1.1', number: '05', projectCode: null, slug: 'x' };
    const context = findPlanContext(presentation(), archived, identity);
    expect(context?.requirementTexts['AUTH-01']).toBe('v1.1 auth text');
    expect(context?.requirementTexts['VIEW-01']).toBe('v1.1 view text');
    // Not in v1.1 or the root: found in another archive.
    expect(context?.requirementTexts['DASH-01']).toBe('v1.0 dash text');
  });

  it('reads the live root before the archives for a live plan, and archives newest first', () => {
    const context = findPlanContext(presentation(), ARTIFACT, IDENTITY);
    expect(context?.requirementTexts['AUTH-01']).toBe('Live text');
    expect(context?.requirementTexts['VIEW-01']).toBe('v1.1 view text');
    const noRoot = findPlanContext(presentation({ requirements: [] }), ARTIFACT, IDENTITY);
    expect(noRoot?.requirementTexts['AUTH-01']).toBe('v1.1 auth text');
  });

  it('takes the milestone of an archived quick plan from its path', () => {
    const quick = { path: '.planning/milestones/v1.0-quick/260910-0x4-x/260910-0x4-PLAN.md' };
    const context = findPlanContext(presentation(), quick, null);
    expect(context?.requirementTexts['AUTH-01']).toBe('v1.0 auth text');
  });

  it('returns null for a document that is not a PLAN, and the dates alone without a presentation', () => {
    expect(findPlanContext(presentation(), { path: '.planning/phases/01-identity/01-CONTEXT.md' }, IDENTITY)).toBeNull();
    expect(findPlanContext(presentation(), undefined, IDENTITY)).toBeNull();
    expect(findPlanContext(undefined, ARTIFACT, IDENTITY)).toEqual({
      addedAt: '2026-08-03T22:12:52+05:30',
      mtimeMs: 42,
      description: null,
      dependencies: [],
      requirementTexts: {},
    });
  });
});
