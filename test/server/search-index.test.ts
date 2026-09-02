import { describe, expect, it } from 'vitest';
import type { Artifact, Phase, PhaseIdentity, Project } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { createApp } from '../../src/server/index.ts';
import {
  buildSearchDocuments,
  createSearchIndexState,
  isReady,
  processSearchTerm,
  searchIndex,
  tokenizeSearchText,
  MAX_QUERY_LENGTH,
} from '../../src/server/search-index.ts';

function waitForBuild(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

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

const PHASE_IDENTITY: PhaseIdentity = {
  milestoneVersion: null,
  number: '01',
  projectCode: null,
  slug: 'identity-slice',
};

function makePhase(artifacts: Artifact[]): Phase {
  return {
    identity: PHASE_IDENTITY,
    name: 'Identity Slice',
    dirPath: '.planning/phases/01-identity-slice',
    archived: false,
    goal: null,
    dependsOnRaw: null,
    requirementIds: [],
    requirementRefs: [],
    successCriteria: [],
    roadmapComplete: null,
    diskStatus: 'complete',
    plans: [],
    artifacts: Object.fromEntries(artifacts.map((artifact) => [artifact.path, artifact])),
  };
}

function makeProject(rootArtifacts: Artifact[], phases: Phase[]): Project {
  return {
    rootPath: '/project',
    name: 'Demo',
    artifacts: Object.fromEntries(rootArtifacts.map((artifact) => [artifact.path, artifact])),
    config: {},
    milestones: [],
    phases,
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

describe('tokenizeSearchText', () => {
  it('keeps ID and path tokens intact — no split on "-", "/" or "."', () => {
    expect(tokenizeSearchText('ROLE-07 backend/src/authz/mod.rs', 'body')).toEqual([
      'ROLE-07',
      'backend/src/authz/mod.rs',
    ]);
  });

  it('splits on Unicode whitespace and excluded punctuation, dropping empties', () => {
    expect(tokenizeSearchText('hello,\tworld!  日本語', 'body')).toEqual(['hello', 'world', '日本語']);
  });
});

describe('processSearchTerm', () => {
  it('dual-indexes an ID-shaped token as its intact literal and every split part', () => {
    const result = processSearchTerm('ROLE-07', 'body');
    expect(Array.isArray(result)).toBe(true);
    const parts = result as string[];
    expect(parts[0]).toBe('role-07');
    expect(parts).toContain('role');
    expect(parts).toContain('07');
  });

  it('dual-indexes a path-shaped token as its intact literal and every split part', () => {
    const result = processSearchTerm('backend/src/authz/mod.rs', 'body');
    expect(Array.isArray(result)).toBe(true);
    const parts = result as string[];
    expect(parts[0]).toBe('backend/src/authz/mod.rs');
    expect(parts).toContain('backend');
    expect(parts).toContain('authz');
    expect(parts).toContain('mod');
  });

  it('indexes an ordinary word as just its lowercased self', () => {
    expect(processSearchTerm('ordinary', 'body')).toBe('ordinary');
  });

  it('returns null for a token that trims to nothing', () => {
    expect(processSearchTerm('---', 'body')).toBeNull();
  });
});

describe('buildSearchDocuments', () => {
  it('returns one document per reachable artifact, empty array for a null project', () => {
    expect(buildSearchDocuments(makeSnapshot(null))).toEqual([]);

    const root = makeArtifact({ path: '.planning/PROJECT.md', kind: 'project', title: 'Project' });
    const phaseArtifact = makeArtifact({
      path: '.planning/phases/01-identity-slice/01-02-PLAN.md',
      kind: 'plan',
      title: '01-02: Identity slice',
      frontmatter: { requirements: ['IDENT-02', 'IDENT-03'] },
    });
    const project = makeProject([root], [makePhase([phaseArtifact])]);
    const docs = buildSearchDocuments(makeSnapshot(project));
    expect(docs.map((doc) => doc.path).sort()).toEqual([phaseArtifact.path, root.path].sort());
  });

  it('flattens frontmatter keys and scalar values into frontmatterText', () => {
    const plan = makeArtifact({
      path: '.planning/phases/01-identity-slice/01-02-PLAN.md',
      kind: 'plan',
      frontmatter: { requirements: ['IDENT-02', 'IDENT-03'] },
    });
    const [doc] = buildSearchDocuments(makeSnapshot(makeProject([], [makePhase([plan])])));
    expect(doc.frontmatterText).toContain('IDENT-02');
  });

  it('strips pseudo-XML wrapper tags from a plan body before indexing, preserving inner text', () => {
    const plan = makeArtifact({
      path: '.planning/phases/01-x/01-01-PLAN.md',
      kind: 'plan',
      body: '<objective>\nFind the widget factory.\n</objective>\n',
    });
    const [doc] = buildSearchDocuments(makeSnapshot(makeProject([], [makePhase([plan])])));
    expect(doc.body).not.toContain('<objective>');
    expect(doc.body).not.toContain('</objective>');
    expect(doc.body).toContain('Find the widget factory.');
  });
});

describe('createSearchIndexState / searchIndex — end to end', () => {
  it('starts building, resolves to ready, and finds an exact requirement id', async () => {
    const plan = makeArtifact({
      path: '.planning/phases/01-identity-slice/01-02-PLAN.md',
      kind: 'plan',
      title: '01-02: Identity slice',
      frontmatter: { requirements: ['IDENT-02', 'IDENT-03'] },
    });
    const project = makeProject([], [makePhase([plan])]);
    const search = createSearchIndexState();
    expect(search.state().status).toBe('building');

    search.buildFrom(makeSnapshot(project));
    expect(search.state().status).toBe('building');
    await waitForBuild();

    const state = search.state();
    expect(state.status).toBe('ready');
    const hits = searchIndex(state, 'IDENT-02');
    expect(hits.map((hit) => hit.path)).toContain(plan.path);
  });

  it('returns an empty array for a not-ready state instead of throwing', () => {
    expect(searchIndex({ status: 'building' }, 'anything')).toEqual([]);
    expect(searchIndex({ status: 'error', message: 'boom' }, 'anything')).toEqual([]);
  });

  it('truncates a query longer than MAX_QUERY_LENGTH before searching', async () => {
    const search = createSearchIndexState();
    search.buildFrom(makeSnapshot(makeProject([], [])));
    await waitForBuild();
    const state = search.state();
    const oversized = 'a'.repeat(MAX_QUERY_LENGTH + 500);
    expect(() => searchIndex(state, oversized)).not.toThrow();
    expect(searchIndex(state, oversized)).toEqual([]);
  });

  it('yields ready with zero results for a snapshot whose project is null, not an error', async () => {
    const search = createSearchIndexState();
    search.buildFrom(makeSnapshot(null));
    await waitForBuild();
    const state = search.state();
    expect(state.status).toBe('ready');
    expect(searchIndex(state, 'anything')).toEqual([]);
  });

  it('isReady narrows to the ready member and only the ready member', async () => {
    const search = createSearchIndexState();
    expect(isReady(search.state())).toBe(false);
    search.buildFrom(makeSnapshot(makeProject([], [])));
    await waitForBuild();
    expect(isReady(search.state())).toBe(true);
    expect(isReady({ status: 'error', message: 'boom' })).toBe(false);
  });

  it('keeps two byte-identical-body artifacts as separate results keyed by their distinct paths', async () => {
    const bodyA = makeArtifact({ path: '.planning/phases/01-x/01-A.md', title: 'A', body: 'shared unique-marker-token content' });
    const bodyB = makeArtifact({ path: '.planning/phases/01-x/01-B.md', title: 'B', body: 'shared unique-marker-token content' });
    const project = makeProject([], [makePhase([bodyA, bodyB])]);
    const search = createSearchIndexState();
    search.buildFrom(makeSnapshot(project));
    await waitForBuild();
    const hits = searchIndex(search.state(), 'unique-marker-token');
    expect(hits.map((hit) => hit.path).sort()).toEqual([bodyA.path, bodyB.path].sort());
  });

  it('returns identical order across two calls with the same query, and breaks score ties by path ascending', async () => {
    const first = makeArtifact({ path: '.planning/phases/01-x/01-B.md', title: 'B', body: 'tie-break-term' });
    const second = makeArtifact({ path: '.planning/phases/01-x/01-A.md', title: 'A', body: 'tie-break-term' });
    const project = makeProject([], [makePhase([first, second])]);
    const search = createSearchIndexState();
    search.buildFrom(makeSnapshot(project));
    await waitForBuild();
    const state = search.state();
    const runOne = searchIndex(state, 'tie-break-term');
    const runTwo = searchIndex(state, 'tie-break-term');
    expect(runOne.map((hit) => hit.path)).toEqual(runTwo.map((hit) => hit.path));
    // Both artifacts tie on score (identical body/title shape) — the explicit tiebreak orders them
    // by path ascending, so 01-A.md (alphabetically first) comes before 01-B.md regardless of
    // insertion order above.
    expect(runOne.map((hit) => hit.path)).toEqual([second.path, first.path]);
  });

  it('indexes and retrieves a non-ASCII path token intact, matching a query that differs only in case', async () => {
    const artifact = makeArtifact({
      path: '.planning/phases/01-x/01-CONTEXT.md',
      title: 'Context',
      body: 'References backend/src/日本語/mod.rs as the adapter entry point.',
    });
    const project = makeProject([], [makePhase([artifact])]);
    const search = createSearchIndexState();
    search.buildFrom(makeSnapshot(project));
    await waitForBuild();
    const state = search.state();
    const lower = searchIndex(state, 'backend/src/日本語/mod.rs');
    const upper = searchIndex(state, 'BACKEND/SRC/日本語/MOD.RS');
    expect(lower.map((hit) => hit.path)).toContain(artifact.path);
    expect(upper.map((hit) => hit.path)).toContain(artifact.path);
  });
});

describe('createApp — /api/search readiness integration (Task 3)', () => {
  function appOver(project: Project | null) {
    const snapshot = makeSnapshot(project);
    return createApp({ getSnapshot: () => snapshot });
  }

  it('answers HTTP 200 with status "building" and empty results for a request issued before the scheduled build runs', async () => {
    const app = appOver(makeProject([], []));
    // No await between createApp() and this request — the setImmediate-scheduled build has not
    // run yet, so this exercises the same-tick "building" path (D-04/FIND-05).
    const response = await app.request('/api/search?q=anything');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; results: unknown[] };
    expect(body.status).toBe('building');
    expect(body.results).toEqual([]);
  });

  it('answers HTTP 200 with status "ready" and results once the scheduled build resolves', async () => {
    const plan = makeArtifact({
      path: '.planning/phases/01-identity-slice/01-02-PLAN.md',
      title: '01-02: Identity slice',
      frontmatter: { requirements: ['IDENT-02'] },
    });
    const app = appOver(makeProject([], [makePhase([plan])]));
    await waitForBuild();
    const response = await app.request('/api/search?q=IDENT-02');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; results: { path: string }[] };
    expect(body.status).toBe('ready');
    expect(body.results.map((hit) => hit.path)).toContain(plan.path);
  });

  it('answers HTTP 200 with zero results for an empty, whitespace-only, or punctuation-only q — never a thrown error', async () => {
    const app = appOver(makeProject([], []));
    await waitForBuild();
    for (const q of ['', '   ', '!!!---...']) {
      const response = await app.request(`/api/search?q=${encodeURIComponent(q)}`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as { total: number };
      expect(body.total).toBe(0);
    }
  });

  it('answers HTTP 200 (never a 4xx/5xx) for a q longer than MAX_QUERY_LENGTH, truncating before search', async () => {
    const app = appOver(makeProject([], []));
    await waitForBuild();
    const oversized = 'a'.repeat(5000);
    const response = await app.request(`/api/search?q=${encodeURIComponent(oversized)}`);
    expect(response.status).toBe(200);
  });

  it('keeps answering /api/dashboard while the search index state is still building', async () => {
    const app = appOver(makeProject([], []));
    // Same-tick request, before the scheduled build resolves — /api/dashboard must not be blocked
    // by search index construction (T-03-01-05, FIND-05).
    const [search, dashboard] = await Promise.all([app.request('/api/search?q=x'), app.request('/api/dashboard')]);
    expect(dashboard.status).toBe(200);
    const searchBody = (await search.json()) as { status: string };
    expect(searchBody.status).toBe('building');
  });
});
