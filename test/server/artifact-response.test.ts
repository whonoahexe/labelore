// Pins the D-12/TGT-06 gap-closure fix: the single-artifact response served by GET /api/documents
// and GET /api/artifacts/* now forwards `artifact.bodyLength`, the input artifactWarningTone()
// needs to compute the same tone the tree and search rows already show for that same file. Reuses
// the createApp() + app.request(...) idiom from test/server/refresh.test.ts.
import { describe, expect, it } from 'vitest';
import type { Artifact, Project } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { createApp } from '../../src/server/index.ts';
import { artifactWarningTone } from '../../src/presentation/artifact-warning-tone.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';

function makeArtifact(overrides: Partial<Artifact> & { path: string }): Artifact {
  return {
    id: overrides.path,
    kind: 'context',
    location: 'root',
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

function makeProject(artifacts: Artifact[]): Project {
  return {
    rootPath: '/fixture',
    name: 'Artifact Response Fixture',
    artifacts: Object.fromEntries(artifacts.map((artifact) => [artifact.path, artifact])),
    config: {},
    milestones: [],
    phases: [],
    quickTasks: [],
    requirements: [],
    mentions: { byId: {}, all: [] },
  };
}

function makeSnapshot(artifacts: Artifact[]): ProjectSnapshot {
  return {
    loadStatus: { status: 'ok' },
    readAt: '2026-09-05T00:00:00.000Z',
    rootPath: '/fixture',
    project: makeProject(artifacts),
    warnings: [],
    exclusions: [],
  };
}

/** Route resolution mirrors the plan's own instruction: ask the server for the artifact's own
 * `key` via GET /api/presentation rather than hand-constructing the artifact URL token. */
async function keyFor(app: ReturnType<typeof createApp>, artifactPath: string): Promise<string> {
  const presentation = (await (
    await app.request('/api/presentation')
  ).json()) as ProjectPresentation;
  const dto = presentation.artifacts.find((candidate) => candidate.path === artifactPath);
  if (!dto) throw new Error(`No artifact dto found for ${artifactPath}`);
  return dto.key;
}

interface ArtifactDocumentPayload {
  found: true;
  artifact: {
    warnings: unknown[];
    bodyLength: number;
  };
}

describe('single-artifact response carries bodyLength (D-12, TGT-06)', () => {
  it('a warned artifact with bodyLength: 0 returns bodyLength: 0, and the returned payload yields "unreadable"', async () => {
    const artifact = makeArtifact({
      path: '.planning/PROJECT.md',
      bodyLength: 0,
      warnings: [{ path: '.planning/PROJECT.md', stage: 'frontmatter', message: 'bad yaml', salvage: 'nothing readable' }],
    });
    const app = createApp({ getSnapshot: () => makeSnapshot([artifact]) }, true, '.');
    const route = await keyFor(app, artifact.path);

    const response = await app.request(`/api/documents?route=${encodeURIComponent(route)}`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as ArtifactDocumentPayload;
    expect(payload.artifact.bodyLength).toBe(0);
    expect(payload.artifact.warnings).toHaveLength(1);
    expect(artifactWarningTone(payload.artifact)).toBe('unreadable');
  });

  it('a warned artifact with bodyLength: 1 returns bodyLength: 1, and yields "warning" — the split is exactly at zero (TGT-08 adjacency)', async () => {
    const artifact = makeArtifact({
      path: '.planning/PROJECT.md',
      bodyLength: 1,
      warnings: [{ path: '.planning/PROJECT.md', stage: 'frontmatter', message: 'bad yaml', salvage: 'body intact' }],
    });
    const app = createApp({ getSnapshot: () => makeSnapshot([artifact]) }, true, '.');
    const route = await keyFor(app, artifact.path);

    const response = await app.request(`/api/documents?route=${encodeURIComponent(route)}`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as ArtifactDocumentPayload;
    expect(payload.artifact.bodyLength).toBe(1);
    expect(artifactWarningTone(payload.artifact)).toBe('warning');
  });

  it('an artifact with an empty warnings array and bodyLength: 0 yields null — clean-but-empty is not damage (TGT-08 empty)', async () => {
    const artifact = makeArtifact({
      path: '.planning/PROJECT.md',
      bodyLength: 0,
      warnings: [],
    });
    const app = createApp({ getSnapshot: () => makeSnapshot([artifact]) }, true, '.');
    const route = await keyFor(app, artifact.path);

    const response = await app.request(`/api/documents?route=${encodeURIComponent(route)}`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as ArtifactDocumentPayload;
    expect(payload.artifact.bodyLength).toBe(0);
    expect(payload.artifact.warnings).toHaveLength(0);
    expect(artifactWarningTone(payload.artifact)).toBeNull();
  });

  it('GET /api/artifacts/* returns the same bodyLength as GET /api/documents for the same artifact', async () => {
    const artifact = makeArtifact({
      path: '.planning/PROJECT.md',
      bodyLength: 42,
      warnings: [{ path: '.planning/PROJECT.md', stage: 'assembly', message: 'partial', salvage: 'body intact' }],
    });
    const app = createApp({ getSnapshot: () => makeSnapshot([artifact]) }, true, '.');
    const route = await keyFor(app, artifact.path);

    const documentResponse = await app.request(`/api/documents?route=${encodeURIComponent(route)}`);
    const documentPayload = (await documentResponse.json()) as ArtifactDocumentPayload;

    const artifactsResponse = await app.request(`/api${route}`);
    const artifactsPayload = (await artifactsResponse.json()) as ArtifactDocumentPayload;

    expect(artifactsResponse.status).toBe(200);
    expect(artifactsPayload.artifact.bodyLength).toBe(documentPayload.artifact.bodyLength);
    expect(artifactsPayload.artifact.bodyLength).toBe(42);
  });
});
