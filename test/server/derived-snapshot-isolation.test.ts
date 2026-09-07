// Pins the D-05/TGT-06 gap-closure fix: a GET spanning a completing refresh renders against the
// bundle captured at request start, never the module-level `derived` binding a concurrent refresh
// reassigns mid-request. Reuses the createApp() + app.request(...) idiom and the makeSpySource-
// style source fixtures from test/server/refresh.test.ts. This test must stay first in this file —
// no other document-rendering test precedes it.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Artifact, Project } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { createApp } from '../../src/server/index.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';

const PROJECT_BODY = "See `.planning/NOTES.md` for detail.";

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
    name: 'Isolation Fixture',
    artifacts: Object.fromEntries(artifacts.map((artifact) => [artifact.path, artifact])),
    config: {},
    milestones: [],
    phases: [],
    quickTasks: [],
    requirements: [],
    mentions: { byId: {}, all: [] },
  };
}

function makeSnapshot(readAt: string, artifacts: Artifact[]): ProjectSnapshot {
  return {
    loadStatus: { status: 'ok' },
    readAt,
    rootPath: '/fixture',
    project: makeProject(artifacts),
    warnings: [],
    exclusions: [],
  };
}

/** Route resolution mirrors test/server/artifact-response.test.ts: ask the server for the
 * artifact's own `key` via GET /api/presentation rather than hand-constructing the URL token. */
async function keyFor(app: ReturnType<typeof createApp>, artifactPath: string): Promise<string> {
  const presentation = (await (
    await app.request('/api/presentation')
  ).json()) as ProjectPresentation;
  const dto = presentation.artifacts.find((candidate) => candidate.path === artifactPath);
  if (!dto) throw new Error(`No artifact dto found for ${artifactPath}`);
  return dto.key;
}

interface DocumentResponsePayload {
  document: { html: string };
}

describe('a GET racing a completing refresh renders against the bundle captured at request start (D-05, TGT-06)', () => {
  it('a GET /api/documents request started before a POST /api/refresh that removes .planning/NOTES.md still returns html containing a reference-key attribute', async () => {
    const projectArtifact = makeArtifact({ path: '.planning/PROJECT.md', body: PROJECT_BODY });
    const preRefresh = makeSnapshot('2026-09-01T00:00:00.000Z', [
      projectArtifact,
      makeArtifact({ path: '.planning/NOTES.md' }),
    ]);
    const postRefresh = makeSnapshot('2026-09-02T00:00:00.000Z', [projectArtifact]);

    let current = preRefresh;
    const source = {
      getSnapshot: () => current,
      refresh: async (): Promise<ProjectSnapshot> => {
        current = postRefresh;
        return current;
      },
    };
    const app = createApp(source, true, '.');
    const route = await keyFor(app, '.planning/PROJECT.md');

    // Start the GET without awaiting it, then fully await a refresh that swaps in a bundle whose
    // reference registry no longer knows about .planning/NOTES.md, then await the GET.
    const getPromise = app.request(`/api/documents?route=${encodeURIComponent(route)}`);
    await app.request('/api/refresh', { method: 'POST' });
    const getResponse = await getPromise;

    expect(getResponse.status).toBe(200);
    const payload = (await getResponse.json()) as DocumentResponsePayload;
    expect(payload.document.html).toContain('data-reference-key=');
  });

  it('control: the same document served from a snapshot that never held .planning/NOTES.md renders with no reference-key attribute at all', async () => {
    const projectArtifact = makeArtifact({ path: '.planning/PROJECT.md', body: PROJECT_BODY });
    const snapshot = makeSnapshot('2026-09-01T00:00:00.000Z', [projectArtifact]);
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const route = await keyFor(app, '.planning/PROJECT.md');

    const response = await app.request(`/api/documents?route=${encodeURIComponent(route)}`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as DocumentResponsePayload;
    expect(payload.document.html).not.toContain('data-reference-key=');
  });

  it('reads the registry from the captured-bundle parameter, never the module-level binding, and both handlers capture that bundle before their lookup (source, region-scoped)', async () => {
    const source = await readFile(new URL('../../src/server/index.ts', import.meta.url), 'utf8');

    const artifactResponseStart = source.indexOf('const artifactResponse');
    expect(artifactResponseStart).toBeGreaterThan(-1);
    const afterArtifactResponse = source.slice(artifactResponseStart);
    const nextRouteRegistration = afterArtifactResponse.match(/\n\s*app\.(get|post|use|all)\(/);
    expect(nextRouteRegistration?.index).toBeGreaterThan(-1);
    const region = afterArtifactResponse.slice(0, nextRouteRegistration!.index);

    expect(region).toContain('activeDerived.referenceRegistry');
    // The bare module-level `derived` binding (lowercase — distinct from the `activeDerived`
    // parameter, whose capital D never matches this pattern) must not be property-accessed here.
    expect(region).not.toMatch(/\bderived\./);

    const artifactsHandlerStart = source.indexOf("app.get('/api/artifacts/*'");
    const documentsHandlerStart = source.indexOf("app.get('/api/documents'");
    expect(artifactsHandlerStart).toBeGreaterThan(-1);
    expect(documentsHandlerStart).toBeGreaterThan(artifactsHandlerStart);

    const artifactsHandler = source.slice(artifactsHandlerStart, documentsHandlerStart);
    const documentsHandlerEnd = source.indexOf("app.post('/api/refresh'");
    const documentsHandler = source.slice(documentsHandlerStart, documentsHandlerEnd);

    for (const handler of [artifactsHandler, documentsHandler]) {
      const captureIndex = handler.indexOf('const activeDerived = derived;');
      const lookupIndex = handler.search(/const lookup = activeDerived\.artifactIndex\./);
      const forwardIndex = handler.indexOf('artifactResponse(lookup, activeDerived)');
      expect(captureIndex).toBeGreaterThan(-1);
      expect(lookupIndex).toBeGreaterThan(captureIndex);
      expect(forwardIndex).toBeGreaterThan(lookupIndex);
    }
  });
});
