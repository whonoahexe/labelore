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
  buildSearchSections,
  extractSnippets,
  type SearchHitLike,
} from '../../src/presentation/search.ts';
import { emptyLedger } from '../../src/server/dashboard-ledger.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { FX_ROOT, loadFixtureProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

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
  return {
    version: null,
    name: overrides.key,
    overviewUrl: '/overview',
    roadmapUrl: '/roadmap',
    phases: [],
    ...overrides,
  };
}

function artifact(overrides: Partial<ArtifactDto> & Pick<ArtifactDto, 'path' | 'location'>): ArtifactDto {
  return {
    key: `a~${overrides.path}`,
    kind: 'markdown',
    fileClass: 'text',
    sizeBytes: 0,
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
    url: `/${overrides.path}`,
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
    projectSlug: 'project',
    projectName: 'Test Project',
    config: {},
    state: null,
    milestones: [],
    requirements: [],
    artifacts: [],
    blockers: [],
    decisions: [],
    checkpoints: [],
    coverageWaits: [],
    mentions: { byId: {}, all: [] },
    exclusions: [],
    ledger: emptyLedger(),
    routeAliases: {},
    urlConflicts: [],
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

  describe('root documents designed elsewhere (09 D-01)', () => {
    const view = presentation({
      artifacts: [
        artifact({ path: '.planning/STATE.md', location: 'root', kind: 'state', key: '/state' }),
        artifact({ path: '.planning/ROADMAP.md', location: 'root', kind: 'roadmap', key: '/roadmap' }),
        artifact({ path: '.planning/research/STATE.md', location: 'research', kind: 'state', key: '/research/state' }),
        artifact({ path: 'phases/a/01-CONTEXT.md', location: 'phase', kind: 'context', key: '/v1.0/phase-1/context' }),
      ],
    });
    const rowFor = (path: string, url: string) =>
      buildSearchGroups([hit({ path, url })], view)
        .flatMap((group) => group.rows)
        .find((row) => row.path === path)!;

    it('leads a STATE.md hit to the dashboard and carries the Source address', () => {
      const row = rowFor('.planning/STATE.md', '/state');
      expect(row.url).toBe('/');
      expect(row.sourceUrl).toBe('/state?source=1');
    });

    it('keeps the roadmap row on its own address and still offers its Source', () => {
      const row = rowFor('.planning/ROADMAP.md', '/roadmap');
      expect(row.url).toBe('/roadmap');
      expect(row.sourceUrl).toBe('/roadmap?source=1');
    });

    it('leaves every other file alone: own url, no Source address', () => {
      const context = rowFor('phases/a/01-CONTEXT.md', '/v1.0/phase-1/context');
      expect(context.url).toBe('/v1.0/phase-1/context');
      expect(context.sourceUrl).toBeNull();
      const nested = rowFor('.planning/research/STATE.md', '/research/state');
      expect(nested.url).toBe('/research/state');
      expect(nested.sourceUrl).toBeNull();
    });
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

  // --- WR-01 regression: length-changing case mappings must not desynchronize highlight offsets --

  it('highlights exactly the matched original slice when a length-changing case mapping precedes it (WR-01)', () => {
    const body = 'İMATCH end';
    const { snippets } = extractSnippets(body, ['match']);

    expect(snippets).toHaveLength(1);
    const [snippet] = snippets;
    expect(snippet.highlights).toHaveLength(1);
    const [highlight] = snippet.highlights;
    expect(snippet.text.slice(highlight.start, highlight.end)).toBe('MATCH');
  });

  it('keeps highlight offsets absolute against the ORIGINAL body after a length-changing case mapping (WR-01)', () => {
    const body = 'İMATCH end';
    const { snippets } = extractSnippets(body, ['match']);
    const [snippet] = snippets;
    const [highlight] = snippet.highlights;

    const absoluteStart = snippet.bodyOffset + highlight.start;
    const absoluteEnd = snippet.bodyOffset + highlight.end;
    expect(body.slice(absoluteStart, absoluteEnd)).toBe('MATCH');
    expect(absoluteStart).toBe(body.indexOf('MATCH'));
  });

  // --- WR-02 regression: independently seeded overlapping windows must merge, not duplicate ------

  it('merges two independently seeded windows spaced in the (windowChars/2, windowChars) interval into one snippet (WR-02)', () => {
    // half = 80 for windowChars: 160. A 115-char gap between matches is in (80, 160) — each
    // match's own +/-80 window does not reach the other match at seed time (so neither consumes
    // the other's occurrence during seeding), but the two seeded windows themselves overlap by
    // 45 characters once both exist — exactly the near-duplicate-window defect WR-02 fixes.
    const prefix = 'x'.repeat(200);
    const gap = 'y'.repeat(115);
    const suffix = 'z'.repeat(300);
    const body = `${prefix}AAAA${gap}BBBB${suffix}`;
    const { snippets, matchCount } = extractSnippets(body, ['aaaa', 'bbbb'], { windowChars: 160 });

    expect(matchCount).toBe(2);
    expect(snippets).toHaveLength(1);
    const [snippet] = snippets;

    // No duplicated body region: the merged window's text is a single contiguous slice, so a
    // count of how many times the (otherwise-unique) gap filler appears in it is exactly one.
    expect(snippet.text.split('y'.repeat(115)).length - 1).toBe(1);

    // Highlights are two ascending, non-overlapping ranges, each covering a real, unbroken match.
    expect(snippet.highlights).toHaveLength(2);
    const [first, second] = snippet.highlights;
    expect(first.end).toBeLessThanOrEqual(second.start);
    expect(snippet.text.slice(first.start, first.end)).toBe('AAAA');
    expect(snippet.text.slice(second.start, second.end)).toBe('BBBB');
  });

  it('merges overlapping windows without cutting either match into a partial, unhighlighted fragment (WR-02)', () => {
    // A 78-char gap - tighter than the 115-char case above - reproduces the review's second
    // finding: pre-fix, the first window's text ended mid-match ("...MA"). Post-fix, the windows
    // still merge into one, so neither match can be truncated.
    const prefix = 'x'.repeat(200);
    const gap = 'y'.repeat(78);
    const suffix = 'z'.repeat(300);
    const body = `${prefix}AAAA${gap}BBBB${suffix}`;
    const { snippets } = extractSnippets(body, ['aaaa', 'bbbb'], { windowChars: 160 });

    expect(snippets).toHaveLength(1);
    const [snippet] = snippets;
    expect(snippet.highlights).toHaveLength(2);
    for (const highlight of snippet.highlights) {
      const slice = snippet.text.slice(highlight.start, highlight.end);
      expect(slice === 'AAAA' || slice === 'BBBB').toBe(true);
    }
  });

  it('still yields two separate, ascending snippets when matches are far enough apart to stay disjoint (WR-02 non-regression)', () => {
    // Mirrors Test 7 above but pins the assurance explicitly for WR-02: the merge pass must not
    // over-collapse genuinely disjoint windows into one.
    const body = `${'a'.repeat(50)}FIRST-ID${'b'.repeat(400)}SECOND-ID${'c'.repeat(50)}`;
    const { snippets } = extractSnippets(body, ['first-id', 'second-id'], { windowChars: 160 });

    expect(snippets).toHaveLength(2);
    expect(snippets[0].bodyOffset).toBeLessThan(snippets[1].bodyOffset);
    expect(snippets[0].text.toLowerCase()).toContain('first-id');
    expect(snippets[1].text.toLowerCase()).toContain('second-id');
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
    fileClass: 'text',
    sizeBytes: 0,
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

// --- buildSearchSections (Phase 13, 13-03) -----------------------------------------------------------------------

function pathHit(path: string, overrides: Partial<SearchHitLike> = {}): SearchHitLike {
  return hit({ path, ...overrides });
}

describe('buildSearchSections', () => {
  const livePhase1 = phase({
    key: 'p~live1',
    milestoneKey: 'm~live',
    name: 'Alpha',
    identity: { milestoneVersion: 'v2.0', number: '01', projectCode: null, slug: 'alpha' },
  });
  const livePhase2 = phase({
    key: 'p~live2',
    milestoneKey: 'm~live',
    name: 'Beta',
    identity: { milestoneVersion: 'v2.0', number: '02', projectCode: null, slug: 'beta' },
  });
  const oldPhase = phase({
    key: 'p~old1',
    milestoneKey: 'm~v1.0',
    name: 'Gamma',
    archived: true,
    identity: { milestoneVersion: 'v1.0', number: '01', projectCode: null, slug: 'gamma' },
  });
  const oldestPhase = phase({
    key: 'p~oldest1',
    milestoneKey: 'm~v0.9',
    name: 'Delta',
    archived: true,
    identity: { milestoneVersion: 'v0.9', number: '01', projectCode: null, slug: 'delta' },
  });
  const milestones = [
    milestone({ key: 'm~v0.9', version: 'v0.9', name: 'Oldest', archived: true, phases: [oldestPhase] }),
    milestone({ key: 'm~v1.0', version: 'v1.0', name: 'First', archived: true, phases: [oldPhase] }),
    milestone({ key: 'm~live', version: 'v2.0', name: 'Live', archived: false, phases: [livePhase1, livePhase2] }),
  ];
  const world = presentation({
    milestones,
    artifacts: [
      artifact({ path: 'p/live1-b.md', location: 'phase', kind: 'summary', phaseKey: 'p~live1' }),
      artifact({ path: 'p/live1-a.md', location: 'phase', kind: 'plan', phaseKey: 'p~live1' }),
      artifact({ path: 'p/live2.md', location: 'phase', kind: 'plan', phaseKey: 'p~live2' }),
      artifact({ path: 'p/old1.md', location: 'archived-phase', kind: 'plan', phaseKey: 'p~old1' }),
      artifact({ path: 'p/oldest1.md', location: 'archived-phase', kind: 'plan', phaseKey: 'p~oldest1' }),
      artifact({ path: '.planning/milestones/v1.0-ROADMAP.md', location: 'milestone-root', kind: 'roadmap' }),
      artifact({ path: '.planning/milestones/v1.0-quick/260101-a/PLAN.md', location: 'milestone-root', kind: 'plan' }),
      artifact({ path: '.planning/milestones/v0.9-audit/AUDIT.md', location: 'milestone-root', kind: 'milestone-audit' }),
      artifact({ path: '.planning/milestones/v7.0-ROADMAP.md', location: 'milestone-root', kind: 'roadmap' }),
      artifact({ path: '.planning/milestones/stray/NOTE.md', location: 'milestone-root', kind: 'note' }),
      artifact({ path: '.planning/PROJECT.md', location: 'root', kind: 'project' }),
      artifact({ path: '.planning/quick/x/PLAN.md', location: 'quick', kind: 'plan' }),
      artifact({ path: '.planning/research/r.md', location: 'research', kind: 'research' }),
      artifact({ path: '.planning/codebase/STACK.md', location: 'other', kind: 'codebase-stack' }),
      artifact({ path: '.planning/debug/d.md', location: 'other', kind: 'debug' }),
      artifact({ path: 'p/ghost.md', location: 'phase', kind: 'plan', phaseKey: 'p~ghost' }),
    ],
  });
  const allHits = world.artifacts.map((entry) => pathHit(entry.path, { kind: entry.kind, phaseKey: entry.phaseKey }));

  function groupPaths(groups: { rows: { path: string }[] }[]): string[][] {
    return groups.map((group) => group.rows.map((row) => row.path));
  }

  it('puts the live milestone first and open, archived ones newest first and closed, with counts', () => {
    const sections = buildSearchSections(allHits, world);
    expect(sections.milestones.map((entry) => [entry.version, entry.open, entry.archived])).toEqual([
      ['v2.0', true, false],
      ['v1.0', false, true],
      ['v0.9', false, true],
    ]);
    const live = sections.milestones[0];
    expect(live.label).toBe('Live');
    expect(live.count).toBe(3);
    expect(live.groups.map((group) => group.count)).toEqual([2, 1]);
    expect(sections.milestones[1].count).toBe(3);
  });

  it("follows the milestone's phase order and clusters plan before summary inside a phase group", () => {
    const [live] = buildSearchSections(allHits, world).milestones;
    expect(live.groups.map((group) => [group.kind, group.label, group.phaseNumber])).toEqual([
      ['phase', 'Alpha', '01'],
      ['phase', 'Beta', '02'],
    ]);
    expect(groupPaths(live.groups)).toEqual([['p/live1-a.md', 'p/live1-b.md'], ['p/live2.md']]);
    const reversed = buildSearchSections([...allHits].reverse(), world).milestones[0];
    expect(reversed.groups.map((group) => group.label)).toEqual(['Alpha', 'Beta']);
  });

  it("lands an archived-phase hit in its own milestone's phase group", () => {
    const sections = buildSearchSections(allHits, world);
    const archived = sections.milestones.find((entry) => entry.version === 'v1.0');
    expect(archived?.groups[0]).toMatchObject({ kind: 'phase', label: 'Gamma' });
    expect(groupPaths([archived!.groups[0]])).toEqual([['p/old1.md']]);
  });

  it('places milestone-root files by their path: milestone files, quick tasks, any other versioned folder', () => {
    const sections = buildSearchSections(allHits, world);
    const first = sections.milestones.find((entry) => entry.version === 'v1.0')!;
    expect(first.groups.map((group) => [group.kind, group.label])).toEqual([
      ['phase', 'Gamma'],
      ['milestone-files', 'Milestone files'],
      ['quick', 'Quick tasks'],
    ]);
    expect(groupPaths(first.groups).slice(1)).toEqual([
      ['.planning/milestones/v1.0-ROADMAP.md'],
      ['.planning/milestones/v1.0-quick/260101-a/PLAN.md'],
    ]);
    const oldest = sections.milestones.find((entry) => entry.version === 'v0.9')!;
    expect(oldest.groups.map((group) => group.kind)).toEqual(['phase', 'milestone-files']);
    expect(groupPaths(oldest.groups)[1]).toEqual(['.planning/milestones/v0.9-audit/AUDIT.md']);
  });

  it('puts root, live quick, research, codebase and unplaceable hits in the five outside groups, in order', () => {
    const { outside } = buildSearchSections(allHits, world);
    expect(outside.map((group) => [group.key, group.label, group.count])).toEqual([
      ['project', 'Project', 1],
      ['quick', 'Quick tasks', 1],
      ['research', 'Research', 1],
      ['codebase', 'Codebase', 1],
      ['other', 'Other', 4],
    ]);
    expect(outside[4].rows.map((row) => row.path).sort()).toEqual([
      '.planning/debug/d.md',
      '.planning/milestones/stray/NOTE.md',
      '.planning/milestones/v7.0-ROADMAP.md',
      'p/ghost.md',
    ]);
  });

  it('decides Codebase by kind, whatever the location', () => {
    const odd = presentation({
      milestones,
      artifacts: [artifact({ path: 'p/c.md', location: 'phase', kind: 'codebase-arch', phaseKey: 'p~live1' })],
    });
    const { milestones: sections, outside } = buildSearchSections([pathHit('p/c.md', { kind: 'codebase-arch', phaseKey: 'p~live1' })], odd);
    expect(sections).toEqual([]);
    expect(outside.map((group) => group.key)).toEqual(['codebase']);
  });

  it('leaves out empty groups and milestones, and sends a hit with no artifact to Other', () => {
    expect(buildSearchSections([], world)).toEqual({ milestones: [], outside: [] });
    const { outside } = buildSearchSections([pathHit('missing.md')], world);
    expect(outside.map((group) => group.key)).toEqual(['other']);
  });

  it('puts every hit in exactly one group', () => {
    const sections = buildSearchSections(allHits, world);
    const placed = [
      ...sections.milestones.flatMap((entry) => entry.groups.flatMap((group) => group.rows)),
      ...sections.outside.flatMap((group) => group.rows),
    ].map((row) => row.path);
    expect(placed.sort()).toEqual(allHits.map((entry) => entry.path).sort());
    const counted =
      sections.milestones.reduce((total, entry) => total + entry.count, 0) +
      sections.outside.reduce((total, group) => total + group.count, 0);
    expect(counted).toBe(allHits.length);
  });

  it.each([
    ['Lendshed', loadFixtureProject],
    ['Kilnrow', loadShapesProject],
  ])('drops no hit on %s', async (_name, load) => {
    const { presentation: real } = await load();
    const hits = real.artifacts.map((entry) => pathHit(entry.path, { kind: entry.kind, phaseKey: entry.phaseKey }));
    expect(hits.length).toBeGreaterThan(0);
    const sections = buildSearchSections(hits, real);
    const placed = [
      ...sections.milestones.flatMap((entry) => entry.groups.flatMap((group) => group.rows)),
      ...sections.outside.flatMap((group) => group.rows),
    ].map((row) => row.path);
    expect(placed).toHaveLength(hits.length);
    expect(new Set(placed).size).toBe(hits.length);
    for (const entry of sections.milestones) {
      expect(entry.count).toBe(entry.groups.reduce((total, group) => total + group.count, 0));
      for (const group of entry.groups) expect(group.count).toBe(group.rows.length);
    }
  });

  it('puts an archived quick task under the milestone it was done in, on Kilnrow', async () => {
    const { presentation: real } = await loadShapesProject();
    const quick = real.artifacts.filter((entry) => /^\.planning\/milestones\/v[\d.]+-quick\//.test(entry.path));
    expect(quick.length).toBeGreaterThan(0);
    const sections = buildSearchSections(quick.map((entry) => pathHit(entry.path, { kind: entry.kind })), real);
    expect(sections.outside).toEqual([]);
    for (const entry of sections.milestones) {
      expect(entry.groups.map((group) => group.kind)).toEqual(['quick']);
      for (const row of entry.groups[0].rows) expect(row.path).toContain(`milestones/${entry.version}-quick/`);
    }
  });
});

describe('GET /api/search - filters, facets and sections (13-03)', () => {
  async function lendshedApp() {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(FX_ROOT), FX_ROOT);
    await repository.load();
    const app = createApp(repository, false);
    await waitForBuild();
    await waitForBuild();
    return app;
  }

  async function search(app: Awaited<ReturnType<typeof lendshedApp>>, query: string): Promise<SearchApiResponse> {
    const response = await app.request(`/api/search?${query}`);
    expect(response.status).toBe(200);
    return (await response.json()) as SearchApiResponse;
  }

  it('filters by type, keeps unfilteredTotal and leaves the type counts alone', async () => {
    const app = await lendshedApp();
    const unfiltered = await search(app, 'q=session');
    const filtered = await search(app, 'q=session&type=plan');
    expect(unfiltered.total).toBeGreaterThan(filtered.total);
    expect(filtered.total).toBeGreaterThan(0);
    expect(filtered.results.every((entry) => entry.kind === 'plan')).toBe(true);
    expect(filtered.unfilteredTotal).toBe(unfiltered.total);
    expect(unfiltered.unfilteredTotal).toBe(unfiltered.total);
    expect(filtered.selection).toEqual({ phase: [], type: ['plan'], req: [] });
    expect(filtered.facets?.type.values).toEqual(unfiltered.facets?.type.values.map((value) => ({ ...value, selected: value.value === 'plan' })));
    const sectionRows =
      filtered.sections.milestones.reduce((total, entry) => total + entry.count, 0) +
      filtered.sections.outside.reduce((total, group) => total + group.count, 0);
    expect(sectionRows).toBe(filtered.total);
    expect(filtered.groups.flatMap((group) => group.rows)).toHaveLength(filtered.total);
  });

  it('ORs repeated values inside a parameter and ANDs across parameters', async () => {
    const app = await lendshedApp();
    const both = await search(app, 'q=session&type=plan&type=summary');
    const plans = await search(app, 'q=session&type=plan');
    const summaries = await search(app, 'q=session&type=summary');
    expect(both.total).toBe(plans.total + summaries.total);
    const phased = await search(app, 'q=session&phase=v1.1/phase-1');
    expect(phased.total).toBeGreaterThan(0);
    expect(phased.facets?.phase.values.find((value) => value.value === 'v1.1/phase-1')?.selected).toBe(true);
    const crossed = await search(app, 'q=session&phase=v1.1/phase-1&type=plan');
    expect(crossed.total).toBeLessThanOrEqual(phased.total);
    expect(crossed.results.every((entry) => entry.kind === 'plan')).toBe(true);
    // each facet counts with the others applied: the phase counts ignore the phase selection itself
    expect(crossed.facets?.phase.values.map((value) => value.value)).toEqual(phased.facets?.phase.values.map((value) => value.value));
  });

  it('keeps only traced files for a requirement filter', async () => {
    const app = await lendshedApp();
    const traced = await search(app, 'q=session&req=sign-05');
    expect(traced.selection.req).toEqual(['SIGN-05']);
    expect(traced.total).toBeGreaterThan(0);
    for (const entry of traced.results) {
      expect(['plan', 'summary', 'requirements', 'verification']).toContain(entry.kind);
    }
  });

  it('ignores a phase token, kind and requirement the project does not have', async () => {
    const app = await lendshedApp();
    const plain = await search(app, 'q=session');
    const ignored = await search(app, 'q=session&phase=v9.9/phase-9&type=%3Cscript%3E&req=NOPE-01&req=%00');
    expect(ignored.selection).toEqual({ phase: [], type: [], req: [] });
    expect(ignored.results).toEqual(plain.results);
    expect(ignored.total).toBe(plain.total);
    expect(JSON.stringify(ignored)).not.toContain('NOPE-01');
    expect(JSON.stringify(ignored)).not.toContain('<script>');
  });

  it('keeps the groups field as it was for a request with no filters', async () => {
    const app = await lendshedApp();
    const plain = await search(app, 'q=session');
    expect(plain.groups.flatMap((group) => group.rows).map((row) => row.path).sort()).toEqual(
      plain.results.map((entry) => entry.path).sort(),
    );
    const rows = [
      ...plain.sections.milestones.flatMap((entry) => entry.groups.flatMap((group) => group.rows)),
      ...plain.sections.outside.flatMap((group) => group.rows),
    ];
    expect(rows).toHaveLength(plain.total);
    expect(rows.some((row) => row.snippets.length > 0 && row.matchCount > 0)).toBe(true);
  });

  it('answers the pending shape with empty sections, no facets and an empty selection', async () => {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(FX_ROOT), FX_ROOT);
    await repository.load();
    const app = createApp(repository, false);
    const body = (await (await app.request('/api/search?q=session&type=plan')).json()) as SearchApiResponse;
    expect(body.status).toBe('building');
    expect(body.sections).toEqual({ milestones: [], outside: [] });
    expect(body.facets).toBeNull();
    expect(body.selection).toEqual({ phase: [], type: [], req: [] });
    expect(body.unfilteredTotal).toBe(0);
  });
});
