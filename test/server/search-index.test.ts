import { describe, expect, it } from 'vitest';
import type { Artifact, Phase, PhaseIdentity, Project } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import {
  buildSearchDocuments,
  createSearchIndexState,
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
});
