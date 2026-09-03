import { describe, expect, it } from 'vitest';
import type { Artifact, Phase, PhaseIdentity, Project } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import type {
  ArtifactDto,
  MilestoneDto,
  PhaseDto,
  ProjectPresentation,
} from '../../src/server/project-presentation.ts';
import { createApp } from '../../src/server/index.ts';
import type { SearchApiResponse } from '../../src/server/search-index.ts';
import {
  buildSearchGroups,
  extractSnippets,
  type SearchHitLike,
} from '../../src/presentation/search.ts';

function phase(overrides: Partial<PhaseDto> & Pick<PhaseDto, 'key' | 'milestoneKey' | 'name'>): PhaseDto {
  return {
    identity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'phase' },
    dirPath: null,
    archived: false,
    goal: null,
    dependsOnRaw: null,
    requirementIds: [],
    requirementRefs: [],
    successCriteria: [],
    roadmapComplete: null,
    formalPlanProgress: null,
    diskStatus: 'in_progress',
    plans: [],
    ...overrides,
  };
}

function milestone(overrides: Partial<MilestoneDto> & Pick<MilestoneDto, 'key' | 'archived'>): MilestoneDto {
  return { version: null, name: overrides.key, phases: [], ...overrides };
}

function artifact(overrides: Partial<ArtifactDto> & Pick<ArtifactDto, 'path' | 'location'>): ArtifactDto {
  return {
    key: `a~${overrides.path}`,
    kind: 'markdown',
    title: overrides.path,
    frontmatter: {},
    structured: {},
    milestoneKey: null,
    phaseKey: null,
    warnings: [],
    bodyLength: 1,
    ...overrides,
  };
}

function hit(overrides: Partial<SearchHitLike> & Pick<SearchHitLike, 'path'>): SearchHitLike {
  return {
    title: overrides.path,
    kind: 'markdown',
    url: `/artifacts/${overrides.path}`,
    phaseKey: null,
    milestoneKey: null,
    score: 1,
    matchedTerms: [],
    ...overrides,
  };
}

function presentation(overrides: Partial<ProjectPresentation> = {}): ProjectPresentation {
  return {
    readAt: '2026-01-01T00:00:00Z',
    loadStatus: { status: 'ok' },
    rootPath: '/project',
    projectName: 'Test Project',
    config: {},
    state: null,
    milestones: [],
    requirements: [],
    artifacts: [],
    blockers: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
    exclusions: [],
    ...overrides,
  };
}

describe('buildSearchGroups', () => {
  it('groups by location taxonomy then artifact type, archived-last order with active phases first (Test 1)', () => {
    const activePhase = phase({
      key: 'p~active',
      milestoneKey: 'm~current',
      name: 'Active Phase',
      identity: { milestoneVersion: null, number: '02', projectCode: null, slug: 'active' },
    });
    const archivedPhaseV1 = phase({
      key: 'p~v1',
      milestoneKey: 'm~v1.0',
      name: 'Archived Phase v1.0',
      archived: true,
      identity: { milestoneVersion: 'v1.0', number: '01', projectCode: null, slug: 'old' },
    });

    const view = presentation({
      milestones: [
        milestone({ key: 'm~v1.0', archived: true, version: 'v1.0', name: 'v1.0', phases: [archivedPhaseV1] }),
        milestone({ key: 'm~current', archived: false, version: null, name: 'Current', phases: [activePhase] }),
      ],
      artifacts: [
        artifact({ path: 'phases/02-active/02-01-PLAN.md', location: 'phase', kind: 'plan', phaseKey: 'p~active' }),
        artifact({ path: 'ROOT.md', location: 'root', kind: 'roadmap' }),
        artifact({ path: 'research/NOTES.md', location: 'research', kind: 'markdown' }),
        artifact({ path: 'quick/260101-fix/NOTES.md', location: 'quick', kind: 'markdown' }),
        artifact({
          path: 'milestones/v1.0-phases/01-old/01-01-PLAN.md',
          location: 'archived-phase',
          kind: 'plan',
          phaseKey: 'p~v1',
          milestoneKey: 'm~v1.0',
        }),
      ],
    });

    const hits: SearchHitLike[] = [
      hit({ path: 'milestones/v1.0-phases/01-old/01-01-PLAN.md', phaseKey: 'p~v1', milestoneKey: 'm~v1.0' }),
      hit({ path: 'quick/260101-fix/NOTES.md' }),
      hit({ path: 'research/NOTES.md' }),
      hit({ path: 'ROOT.md' }),
      hit({ path: 'phases/02-active/02-01-PLAN.md', phaseKey: 'p~active' }),
    ];

    const groups = buildSearchGroups(hits, view);

    expect(groups.map((g) => g.key)).toEqual([
      'p~active',
      'location:root',
      'location:research',
      'location:quick',
      'm~v1.0',
    ]);
    expect(groups.map((g) => g.kind)).toEqual(['phase', 'root', 'research', 'quick', 'archived-milestone']);
  });

  it('sorts a second archived milestone after the first by version', () => {
    const p1 = phase({ key: 'p~v1', milestoneKey: 'm~v1.0', name: 'v1 phase', archived: true });
    const p2 = phase({ key: 'p~v2', milestoneKey: 'm~v2.0', name: 'v2 phase', archived: true });

    const view = presentation({
      milestones: [
        milestone({ key: 'm~v1.0', archived: true, version: 'v1.0', name: 'v1.0', phases: [p1] }),
        milestone({ key: 'm~v2.0', archived: true, version: 'v2.0', name: 'v2.0', phases: [p2] }),
      ],
      artifacts: [
        artifact({
          path: 'milestones/v2.0-phases/01-x/A.md',
          location: 'archived-phase',
          phaseKey: 'p~v2',
          milestoneKey: 'm~v2.0',
        }),
        artifact({
          path: 'milestones/v1.0-phases/01-x/A.md',
          location: 'archived-phase',
          phaseKey: 'p~v1',
          milestoneKey: 'm~v1.0',
        }),
      ],
    });

    // Hits provided in reverse-version order — group order must still be version-ascending.
    const hits: SearchHitLike[] = [
      hit({ path: 'milestones/v2.0-phases/01-x/A.md', phaseKey: 'p~v2', milestoneKey: 'm~v2.0' }),
      hit({ path: 'milestones/v1.0-phases/01-x/A.md', phaseKey: 'p~v1', milestoneKey: 'm~v1.0' }),
    ];

    const groups = buildSearchGroups(hits, view);
    expect(groups.map((g) => g.key)).toEqual(['m~v1.0', 'm~v2.0']);
  });

  it('groups a milestone-root hit with its archived milestone via the canonical filename grammar', () => {
    const view = presentation({
      milestones: [milestone({ key: 'm~v1.0', archived: true, version: 'v1.0', name: 'v1.0', phases: [] })],
      artifacts: [
        artifact({ path: 'milestones/v1.0-ROADMAP.md', location: 'milestone-root', kind: 'roadmap' }),
      ],
    });
    const hits: SearchHitLike[] = [hit({ path: 'milestones/v1.0-ROADMAP.md' })];

    const groups = buildSearchGroups(hits, view);
    expect(groups.map((g) => g.key)).toEqual(['m~v1.0']);
  });

  it('clusters within a group by kind (plan, summary, context, generic) then path ascending (Test 2)', () => {
    const activePhase = phase({ key: 'p~a', milestoneKey: 'm~current', name: 'Phase A' });
    const view = presentation({
      milestones: [milestone({ key: 'm~current', archived: false, phases: [activePhase] })],
      artifacts: [
        artifact({ path: 'phases/a/02-SUMMARY.md', location: 'phase', kind: 'summary', phaseKey: 'p~a' }),
        artifact({ path: 'phases/a/z-GENERIC.md', location: 'phase', kind: 'markdown', phaseKey: 'p~a' }),
        artifact({ path: 'phases/a/a-GENERIC.md', location: 'phase', kind: 'markdown', phaseKey: 'p~a' }),
        artifact({ path: 'phases/a/01-CONTEXT.md', location: 'phase', kind: 'context', phaseKey: 'p~a' }),
        artifact({ path: 'phases/a/01-PLAN.md', location: 'phase', kind: 'plan', phaseKey: 'p~a' }),
      ],
    });
    const hits: SearchHitLike[] = [
      hit({ path: 'phases/a/z-GENERIC.md', kind: 'markdown', phaseKey: 'p~a' }),
      hit({ path: 'phases/a/02-SUMMARY.md', kind: 'summary', phaseKey: 'p~a' }),
      hit({ path: 'phases/a/a-GENERIC.md', kind: 'markdown', phaseKey: 'p~a' }),
      hit({ path: 'phases/a/01-CONTEXT.md', kind: 'context', phaseKey: 'p~a' }),
      hit({ path: 'phases/a/01-PLAN.md', kind: 'plan', phaseKey: 'p~a' }),
    ];

    const [group] = buildSearchGroups(hits, view);
    expect(group.rows.map((row) => row.path)).toEqual([
      'phases/a/01-PLAN.md',
      'phases/a/02-SUMMARY.md',
      'phases/a/01-CONTEXT.md',
      'phases/a/a-GENERIC.md',
      'phases/a/z-GENERIC.md',
    ]);
  });

  it('marks a row with the nothing-salvageable tone when its warned artifact has an empty body, and still includes the row', () => {
    const activePhase = phase({ key: 'p~a', milestoneKey: 'm~current', name: 'Phase A' });
    const view = presentation({
      milestones: [milestone({ key: 'm~current', archived: false, phases: [activePhase] })],
      artifacts: [
        artifact({
          path: 'phases/a/broken.md',
          location: 'phase',
          phaseKey: 'p~a',
          warnings: [{ path: 'phases/a/broken.md', stage: 'read', message: 'boom', salvage: 'nothing readable' }],
          bodyLength: 0,
        }),
      ],
    });
    const groups = buildSearchGroups([hit({ path: 'phases/a/broken.md', phaseKey: 'p~a' })], view);
    expect(groups[0].rows).toHaveLength(1);
    expect(groups[0].rows[0].warningTone).toBe('unreadable');
  });

  it('marks a row with the body-survived tone when its warned artifact has a non-empty body', () => {
    const activePhase = phase({ key: 'p~a', milestoneKey: 'm~current', name: 'Phase A' });
    const view = presentation({
      milestones: [milestone({ key: 'm~current', archived: false, phases: [activePhase] })],
      artifacts: [
        artifact({
          path: 'phases/a/damaged.md',
          location: 'phase',
          phaseKey: 'p~a',
          warnings: [{ path: 'phases/a/damaged.md', stage: 'frontmatter', message: 'boom', salvage: 'body intact' }],
          bodyLength: 42,
        }),
      ],
    });
    const groups = buildSearchGroups([hit({ path: 'phases/a/damaged.md', phaseKey: 'p~a' })], view);
    expect(groups[0].rows[0].warningTone).toBe('warning');
  });

  it('a warning does not change row order — a warned and an unwarned row sort identically to two clean rows (D-13)', () => {
    const activePhase = phase({ key: 'p~a', milestoneKey: 'm~current', name: 'Phase A' });
    const buildView = (warned: boolean) =>
      presentation({
        milestones: [milestone({ key: 'm~current', archived: false, phases: [activePhase] })],
        artifacts: [
          artifact({ path: 'phases/a/01-PLAN.md', location: 'phase', kind: 'plan', phaseKey: 'p~a' }),
          artifact({
            path: 'phases/a/02-SUMMARY.md',
            location: 'phase',
            kind: 'summary',
            phaseKey: 'p~a',
            warnings: warned
              ? [{ path: 'phases/a/02-SUMMARY.md', stage: 'read', message: 'boom', salvage: 'body intact' }]
              : [],
          }),
        ],
      });
    const hits: SearchHitLike[] = [
      hit({ path: 'phases/a/02-SUMMARY.md', kind: 'summary', phaseKey: 'p~a' }),
      hit({ path: 'phases/a/01-PLAN.md', kind: 'plan', phaseKey: 'p~a' }),
    ];

    const cleanOrder = buildSearchGroups(hits, buildView(false))[0].rows.map((row) => row.path);
    const warnedOrder = buildSearchGroups(hits, buildView(true))[0].rows.map((row) => row.path);
    expect(warnedOrder).toEqual(cleanOrder);
  });

  it('drops an unmatched phase/milestone hit into the trailing "other" group rather than an error', () => {
    const view = presentation({
      milestones: [],
      artifacts: [artifact({ path: 'phases/gone/X.md', location: 'phase', phaseKey: 'p~gone' })],
    });
    const groups = buildSearchGroups([hit({ path: 'phases/gone/X.md', phaseKey: 'p~gone' })], view);
    expect(groups.map((g) => g.kind)).toEqual(['other']);
  });
});

describe('extractSnippets', () => {
  it('centers the window on a match deep in the body, not at offset 0 (Test 3)', () => {
    const prefix = 'x'.repeat(900);
    const body = `${prefix}TARGET-01 rest of the body continues here.`;
    const { snippets } = extractSnippets(body, ['target-01']);

    expect(snippets).toHaveLength(1);
    expect(snippets[0].bodyOffset).toBeGreaterThan(0);
    expect(Math.abs(snippets[0].bodyOffset - 900)).toBeLessThanOrEqual(80);
    expect(snippets[0].text.toLowerCase()).toContain('target-01');
  });

  it('prefers the longest matched term so the window centers on the intact literal, not a split part (Test 4)', () => {
    const body = `Some prose before. The identifier ROLE-07 appears here. More prose after that continues on.`;
    const { snippets } = extractSnippets(body, ['role-07', '07', 'role']);

    expect(snippets).toHaveLength(1);
    const highlighted = snippets[0].highlights.map((h) => snippets[0].text.slice(h.start, h.end));
    expect(highlighted.some((text) => text.toLowerCase() === 'role-07')).toBe(true);
  });

  it('returns no snippet (but the row still exists upstream) when no matched term occurs in the body (Test 5)', () => {
    const { snippets, matchCount } = extractSnippets('This body contains none of the terms.', [
      'absent-term',
    ]);
    expect(snippets).toEqual([]);
    expect(matchCount).toBe(0);
  });

  it('merges overlapping/abutting highlight ranges inside one window into a single range (Test 6)', () => {
    const body = 'prefix ABCDEF suffix continues for a while to pad the window nicely.';
    // 'abcdef' and 'cde' overlap at the same position — both terms match the same substring window.
    const { snippets } = extractSnippets(body, ['abcdef', 'cde']);
    expect(snippets).toHaveLength(1);
    expect(snippets[0].highlights).toHaveLength(1);
  });

  it('orders multiple snippets for one row by ascending body offset, stably across repeat calls (Test 7)', () => {
    const body = `${'a'.repeat(50)}FIRST-ID${'b'.repeat(400)}SECOND-ID${'c'.repeat(50)}`;
    const first = extractSnippets(body, ['first-id', 'second-id']);
    const second = extractSnippets(body, ['first-id', 'second-id']);

    expect(first.snippets).toHaveLength(2);
    expect(first.snippets[0].bodyOffset).toBeLessThan(first.snippets[1].bodyOffset);
    expect(second.snippets.map((s) => s.bodyOffset)).toEqual(first.snippets.map((s) => s.bodyOffset));
  });

  it('resolves the anchor to the nearest preceding ATX heading, slugged identically to the renderer (Test 8)', () => {
    // Padded well past the 80-char half-window so the clamped window start still lands after the
    // heading line, not back at offset 0 (which would correctly, but unhelpfully for this test,
    // exclude the heading — the window-start-relative scan is exact per 03-02-PLAN.md).
    const body = `${'x'.repeat(200)}\n\n## Some Heading\n\n${'y'.repeat(100)}MATCHTERM appears in this paragraph of prose, padded further.`;
    const { snippets } = extractSnippets(body, ['matchterm']);
    expect(snippets[0].anchor).toBe('some-heading');

    const noHeading = extractSnippets('MATCHTERM with no heading before it at all in this text.', [
      'matchterm',
    ]);
    expect(noHeading.snippets[0].anchor).toBeNull();
  });

  it('moves a window boundary outward rather than splitting a UTF-16 surrogate pair (Test 9)', () => {
    const emoji = '\u{1F600}'; // single codepoint, encoded as a surrogate pair in UTF-16
    const padding = 'p'.repeat(75);
    const body = `${padding}${emoji}MATCHME${'q'.repeat(200)}`;
    const { snippets } = extractSnippets(body, ['matchme']);

    expect(snippets).toHaveLength(1);
    const { bodyOffset, text } = snippets[0];
    // Never split: the char immediately before a low surrogate must not be a lone high surrogate.
    const code = body.charCodeAt(bodyOffset);
    expect(code >= 0xdc00 && code <= 0xdfff).toBe(false);
    expect(text.toLowerCase()).toContain('matchme');
  });
});

// --- Task 2: GET /api/search response shape (groups + fileCount) -----------------------------

function waitForBuild(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

const IDENTITY: PhaseIdentity = { milestoneVersion: null, number: '01', projectCode: null, slug: 'demo' };

function makeArtifact(overrides: Partial<Artifact> & { path: string }): Artifact {
  return {
    id: overrides.path,
    kind: 'context',
    location: 'phase',
    frontmatter: {},
    title: overrides.path,
    body: '',
    bodyLength: 0,
    bodyHash: 'x',
    mtimeMs: 0,
    warnings: [],
    structured: {},
    ...overrides,
  };
}

function makeProject(phaseArtifacts: Artifact[]): Project {
  const phase: Phase = {
    identity: IDENTITY,
    name: 'Demo Phase',
    dirPath: '.planning/phases/01-demo',
    archived: false,
    goal: null,
    dependsOnRaw: null,
    requirementIds: [],
    requirementRefs: [],
    successCriteria: [],
    roadmapComplete: null,
    diskStatus: 'complete',
    plans: [],
    artifacts: Object.fromEntries(phaseArtifacts.map((artifact) => [artifact.path, artifact])),
  };
  return {
    rootPath: '/project',
    name: 'Demo',
    artifacts: {},
    config: {},
    milestones: [{ version: null, name: 'Current', archived: false, phases: [phase] }],
    // search-index.ts's collectReachableArtifacts walks the flattened Project.phases list (not
    // milestones[].phases) — assemble.ts always keeps both in sync, so the fixture must too.
    phases: [phase],
    quickTasks: [],
    requirements: [],
    mentions: { byId: {}, all: [] },
  };
}

function makeSnapshot(project: Project | null): ProjectSnapshot {
  return {
    loadStatus: { status: 'ok' },
    readAt: '2026-09-02T00:00:00.000Z',
    rootPath: '/project',
    project,
    warnings: [],
    exclusions: [],
  };
}

describe('GET /api/search — grouped response (Task 2)', () => {
  it('returns groups alongside results in the ready state, every group row also present in results (Test 1)', async () => {
    const body = `${'x '.repeat(30)}IDENT-02 appears in this document body for testing purposes.`;
    const artifact = makeArtifact({ path: 'phases/01-demo/01-01-PLAN.md', kind: 'plan', title: 'Plan', body });
    const app = createApp({ getSnapshot: () => makeSnapshot(makeProject([artifact])) });
    await waitForBuild();

    const response = await app.request('/api/search?q=IDENT-02');
    const payload = (await response.json()) as SearchApiResponse;

    expect(response.status).toBe(200);
    expect(payload.status).toBe('ready');
    expect(payload.groups.length).toBeGreaterThan(0);
    const resultPaths = new Set(payload.results.map((hit) => hit.path));
    for (const group of payload.groups) {
      for (const row of group.rows) {
        expect(resultPaths.has(row.path)).toBe(true);
        expect(Array.isArray(row.snippets)).toBe(true);
      }
    }
    expect(payload.groups[0].rows[0].snippets.length).toBeGreaterThan(0);
  });

  it('returns an empty groups array and building status while the index is still constructing (Test 2)', async () => {
    const artifact = makeArtifact({ path: 'phases/01-demo/01-01-PLAN.md' });
    const app = createApp({ getSnapshot: () => makeSnapshot(makeProject([artifact])) });
    // No await between createApp() and this request — the setImmediate-scheduled build has not
    // run yet, so the index is still in the 'building' state.
    const response = await app.request('/api/search?q=anything');
    const payload = (await response.json()) as SearchApiResponse;

    expect(response.status).toBe(200);
    expect(payload.status).toBe('building');
    expect(payload.groups).toEqual([]);
  });

  it('marks a hit with the nothing-salvageable tone when its parse-warned artifact has an empty body (Test 3)', async () => {
    const artifact = makeArtifact({
      path: 'phases/01-demo/01-01-PLAN.md',
      body: 'UNIQUETERM appears once in this body.',
      warnings: [{ path: 'phases/01-demo/01-01-PLAN.md', stage: 'read', message: 'boom', salvage: 'nothing readable' }],
    });
    const app = createApp({ getSnapshot: () => makeSnapshot(makeProject([artifact])) });
    await waitForBuild();

    const response = await app.request('/api/search?q=UNIQUETERM');
    const payload = (await response.json()) as SearchApiResponse;

    const row = payload.groups.flatMap((group) => group.rows).find((candidate) => candidate.path === artifact.path);
    expect(row?.warningTone).toBe('unreadable');
  });

  it('counts result rows in total and distinct files in fileCount (Test 4)', async () => {
    const artifact = makeArtifact({
      path: 'phases/01-demo/01-01-PLAN.md',
      body: 'DISTINCTTERM appears once in this body for counting.',
    });
    const app = createApp({ getSnapshot: () => makeSnapshot(makeProject([artifact])) });
    await waitForBuild();

    const response = await app.request('/api/search?q=DISTINCTTERM');
    const payload = (await response.json()) as SearchApiResponse;

    expect(payload.total).toBe(payload.results.length);
    expect(payload.fileCount).toBe(new Set(payload.results.map((hit) => hit.path)).size);
    expect(payload.total).toBe(1);
    expect(payload.fileCount).toBe(1);
  });
});
