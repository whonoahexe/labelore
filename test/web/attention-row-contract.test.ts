// Deterministic reproduction matrix for G2-07 ("needs attention row, sometimes it goes to
// the right artifact, sometimes it doesn't"). Names every AttentionItem producer branch and
// asserts the primary destination (AttentionItem.url) independently from the row's
// provenance/source-evidence destination (SourceLink), so the two link roles can never be
// mistaken for one another. See 02-16-PLAN.md Task 1 and 02-13-SUMMARY.md G2-07.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type {
  CoverageWaitDto,
  PhaseDto,
  PlanCheckpointDto,
  PlanDto,
  ProjectPresentation,
} from '../../src/server/project-presentation.ts';
import {
  buildDashboardViewModel,
  provenanceLabel,
  sourceDestination,
  type AttentionItem,
} from '../../src/presentation/dashboard.ts';
import {
  buildPhaseUrl,
  buildPlanUrl,
  parsePresentationUrl,
  phaseKeyOf,
  milestoneKeyOf,
} from '../../src/presentation/routes.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const IDENTITY = { milestoneVersion: 'v1.0', number: '01', projectCode: null, slug: 'live' };
const PHASE_KEY = phaseKeyOf(IDENTITY);
const MILESTONE_KEY = milestoneKeyOf('v1.0');

function plan(id: string, complete: boolean, dependsOn: PlanDto['dependsOn'] = []): PlanDto {
  return {
    key: buildPlanUrl(IDENTITY, id),
    id,
    phaseKey: PHASE_KEY,
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
    key: PHASE_KEY,
    milestoneKey: MILESTONE_KEY,
    identity: IDENTITY,
    name: 'Live phase',
    dirPath: '.planning/phases/01-live',
    archived: false,
    goal: 'Ship the live phase',
    dependsOnRaw: null,
    requirementIds: [],
    requirementRefs: [],
    successCriteria: [],
    roadmapComplete: false,
    formalPlanProgress: { completed: 1, total: 2, sourcePath: '.planning/ROADMAP.md' },
    diskStatus: 'in_progress',
    plans: [plan('01-01', true), plan('01-02', false)],
    ...overrides,
  } as PhaseDto;
}

function checkpoint(overrides: Partial<PlanCheckpointDto> = {}): PlanCheckpointDto {
  return {
    key: 'checkpoint:approval',
    planKey: buildPlanUrl(IDENTITY, '01-02'),
    planId: '01-02',
    phaseKey: PHASE_KEY,
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
    planKey: buildPlanUrl(IDENTITY, '01-01'),
    planId: '01-01',
    phaseKey: PHASE_KEY,
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
    projectName: 'GSD Lore',
    config: {},
    state: {
      sourcePath: '.planning/STATE.md',
      milestone: 'v1.0',
      phaseNumber: '01',
      phaseName: 'Current position',
      status: 'executing',
      progress: { totalPhases: 4, completedPhases: 1, totalPlans: 7, completedPlans: 2, percent: 28.5 },
      blockersConcerns: null,
    },
    milestones: [
      { key: 'milestone:v1', version: 'v1.0', name: 'Milestone', archived: false, phases: [currentPhase] },
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

function attentionOf(view: ReturnType<typeof buildDashboardViewModel>, type: AttentionItem['type']): AttentionItem {
  const item = view.attention.find((candidate) => candidate.type === type);
  if (!item) throw new Error(`Fixture did not produce an attention item of type "${type}"`);
  return item;
}

/**
 * Asserts a fixture's primary destination against the documented matrix. On mismatch the
 * failure message names the item kind and both observed destinations (primary + provenance),
 * per Task 1's Test 4 requirement — a fixture that disagrees with the matrix must fail loudly,
 * not silently.
 */
function assertPrimaryDestination(label: string, item: AttentionItem, expectedUrl: string | null): void {
  const provenanceUrl = sourceDestination(item.provenance);
  const message =
    `[${label}] attention item type="${item.type}" primary destination mismatch — ` +
    `expected url=${JSON.stringify(expectedUrl)}, observed url=${JSON.stringify(item.url)}, ` +
    `observed provenance destination=${JSON.stringify(provenanceUrl)}`;
  expect(item.url, message).toBe(expectedUrl);
}

describe('G2-07 attention-row destination matrix', () => {
  it('discrepancy: primary destination is the current phase route', () => {
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
    const item = attentionOf(view, 'discrepancy');
    assertPrimaryDestination('discrepancy', item, buildPhaseUrl(IDENTITY));
  });

  it('resolvable blocker: primary destination is the current phase route when a current phase resolves', () => {
    const view = buildDashboardViewModel(
      presentation({
        blockers: [{ key: 'state:blocker', sourcePath: '.planning/STATE.md', heading: 'Blockers', text: 'Authored blocker' }],
      }),
    );
    const item = attentionOf(view, 'blocker');
    assertPrimaryDestination('resolvable blocker', item, buildPhaseUrl(IDENTITY));
  });

  it('fallback blocker: primary destination falls back to /roadmap when no current phase resolves', () => {
    const source = presentation({
      blockers: [{ key: 'state:blocker', sourcePath: '.planning/STATE.md', heading: 'Blockers', text: 'Authored blocker' }],
    });
    if (!source.state) throw new Error('fixture requires state');
    source.state = { ...source.state, milestone: null, phaseNumber: null };
    const view = buildDashboardViewModel(source);
    const item = attentionOf(view, 'blocker');
    assertPrimaryDestination('fallback blocker', item, '/roadmap');
  });

  it('dependency: primary destination is the blocked plan own route', () => {
    const blocked = plan('01-02', false, [{ raw: '01-99', targetPlanKey: null }]);
    const view = buildDashboardViewModel(presentation({}, { plans: [plan('01-01', true), blocked] }));
    const item = attentionOf(view, 'dependency');
    assertPrimaryDestination('dependency', item, blocked.key);
  });

  it('checkpoint: primary destination is the owning plan route', () => {
    const wait = checkpoint();
    const view = buildDashboardViewModel(presentation({ checkpoints: [wait] }));
    const item = attentionOf(view, 'checkpoint');
    assertPrimaryDestination('checkpoint', item, wait.planKey);
  });

  it('coverage: primary destination is the owning plan route', () => {
    const wait = coverageWait();
    const view = buildDashboardViewModel(presentation({ coverageWaits: [wait] }));
    const item = attentionOf(view, 'coverage');
    assertPrimaryDestination('coverage', item, wait.planKey);
  });

  it('assertPrimaryDestination fails with the item kind and both observed destinations when the matrix disagrees', () => {
    const view = buildDashboardViewModel(
      presentation({
        blockers: [{ key: 'state:blocker', sourcePath: '.planning/STATE.md', heading: 'Blockers', text: 'Authored blocker' }],
      }),
    );
    const item = attentionOf(view, 'blocker');
    let caught: unknown;
    try {
      assertPrimaryDestination('deliberately wrong', item, '/some/other/route');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    const messageText = String((caught as { message?: string } | undefined)?.message ?? caught);
    expect(messageText).toContain('type="blocker"');
    expect(messageText).toContain(JSON.stringify(item.url));
    expect(messageText).toContain(JSON.stringify('/some/other/route'));
  });
});

describe('G2-07 primary vs. provenance destination independence', () => {
  it('every row with a resolvable provenance destination exposes it separately from the primary destination', () => {
    const view = buildDashboardViewModel(
      presentation({
        blockers: [{ key: 'state:blocker', sourcePath: '.planning/STATE.md', heading: 'Blockers', text: 'Authored blocker' }],
      }),
    );
    const blocker = attentionOf(view, 'blocker');
    const provenanceUrl = sourceDestination(blocker.provenance);
    expect(provenanceUrl).not.toBeNull();
    expect(provenanceUrl).not.toBe(blocker.url);
    expect(provenanceLabel(blocker.provenance).toLowerCase()).not.toContain(blocker.title.toLowerCase());
  });

  it('derived-provenance rows (dependency, checkpoint, coverage, discrepancy) render no second navigable destination', () => {
    const blocked = plan('01-02', false, [{ raw: '01-99', targetPlanKey: null }]);
    const wait = checkpoint();
    const coverage = coverageWait();
    const view = buildDashboardViewModel(
      presentation(
        { checkpoints: [wait], coverageWaits: [coverage] },
        {
          roadmapComplete: true,
          formalPlanProgress: { completed: 2, total: 2, sourcePath: '.planning/ROADMAP.md' },
          plans: [plan('01-01', true), blocked],
        },
      ),
    );
    for (const type of ['discrepancy', 'dependency', 'checkpoint', 'coverage'] as const) {
      const item = attentionOf(view, type);
      expect(item.provenance.kind, `type="${type}" is expected to carry derived provenance`).toBe('derived');
      expect(sourceDestination(item.provenance)).toBeNull();
    }
  });

  it('round-trips both destinations through JSON serialization for every attention item kind', () => {
    const blocked = plan('01-02', false, [{ raw: '01-99', targetPlanKey: null }]);
    const wait = checkpoint();
    const coverage = coverageWait();
    const view = buildDashboardViewModel(
      presentation(
        {
          blockers: [{ key: 'state:blocker', sourcePath: '.planning/STATE.md', heading: 'Blockers', text: 'Authored blocker' }],
          checkpoints: [wait],
          coverageWaits: [coverage],
        },
        {
          roadmapComplete: true,
          formalPlanProgress: { completed: 2, total: 2, sourcePath: '.planning/ROADMAP.md' },
          plans: [plan('01-01', true), blocked],
        },
      ),
    );
    expect(view.attention.length).toBeGreaterThanOrEqual(5);
    for (const item of view.attention) {
      const roundTripped = JSON.parse(JSON.stringify(item)) as AttentionItem;
      expect(roundTripped.url).toBe(item.url);
      expect(roundTripped.provenance).toEqual(item.provenance);
      expect(sourceDestination(roundTripped.provenance)).toBe(sourceDestination(item.provenance));
    }
  });

  it('every non-null primary destination round-trips through parsePresentationUrl', () => {
    const blocked = plan('01-02', false, [{ raw: '01-99', targetPlanKey: null }]);
    const view = buildDashboardViewModel(
      presentation(
        {
          blockers: [{ key: 'state:blocker', sourcePath: '.planning/STATE.md', heading: 'Blockers', text: 'Authored blocker' }],
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
    for (const item of view.attention) {
      if (item.url === null) continue;
      const parsed = parsePresentationUrl(item.url);
      expect(parsed.ok, `type="${item.type}" url="${item.url}" must parse`).toBe(true);
    }
  });
});

describe('G2-07 accessible link-role labelling', () => {
  it('the row primary-action link carries an aria-label distinct from the provenance source-link label', async () => {
    const page = await source('src/web/pages/dashboard-page.tsx');
    expect(page).toMatch(/className="attention-action"[\s\S]{0,200}aria-label=/);
  });

  it('the provenance SourceLink label always reads as source evidence, never as the row title', () => {
    const stateLabel = provenanceLabel({ kind: 'state', ref: '.planning/STATE.md' });
    const roadmapLabel = provenanceLabel({ kind: 'roadmap', ref: '.planning/ROADMAP.md' });
    const summaryLabel = provenanceLabel({ kind: 'summary', ref: 'phase:01' });
    const derivedLabel = provenanceLabel({ kind: 'derived', ref: 'anything' });
    for (const label of [stateLabel, roadmapLabel, summaryLabel, derivedLabel]) {
      expect(label.toLowerCase()).not.toContain('open');
    }
  });
});
