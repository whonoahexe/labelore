// Pins the POST /api/refresh contract (D-05's atomic swap, the TGT-06 concurrency edge, the
// TGT-08 empty/ordering edges, and the T-04-01-01/02 same-origin gate) against createApp() +
// app.request(...) — the same idiom test/server/search-index.test.ts and
// test/server/deep-links.test.ts already use.
import { describe, expect, it, vi } from 'vitest';
import type { Artifact, Project } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { createApp } from '../../src/server/index.ts';

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

function makeProject(artifactPaths: string[]): Project {
  return {
    rootPath: '/fixture',
    name: 'Refresh Contract Fixture',
    artifacts: Object.fromEntries(artifactPaths.map((path) => [path, makeArtifact({ path })])),
    config: {},
    milestones: [],
    phases: [],
    quickTasks: [],
    requirements: [],
    mentions: { byId: {}, all: [] },
  };
}

function makeSnapshot(readAt: string, artifactPaths: string[]): ProjectSnapshot {
  return {
    loadStatus: { status: 'ok' },
    readAt,
    rootPath: '/fixture',
    project: makeProject(artifactPaths),
    warnings: [],
    exclusions: [],
  };
}

const FAILED_SNAPSHOT: ProjectSnapshot = {
  loadStatus: { status: 'not-a-gsd-project', pathChecked: '/fixture', message: 'no .planning/' },
  readAt: '2026-09-03T00:00:00.000Z',
  rootPath: '/fixture',
  project: null,
  warnings: [],
  exclusions: [],
};

/** A source whose `getSnapshot()` always reflects the most recently *resolved* refresh — mirroring
 * `PlanningRepository`, which assigns `this.snapshot` before returning it from `refresh()`. This is
 * what `createApp`'s `buildDerivedViews()` relies on: it re-reads `source.getSnapshot()` rather than
 * threading the resolved value through by hand. `queueNext` is the only way a test changes what the
 * *next* `refresh()` call resolves to and mutates `current` to match, in one step. */
function makeSpySource(initial: ProjectSnapshot) {
  let current = initial;
  const refresh = vi.fn(async (): Promise<ProjectSnapshot> => current);
  function queueNext(next: ProjectSnapshot): void {
    refresh.mockImplementationOnce(async () => {
      current = next;
      return current;
    });
  }
  return {
    source: { getSnapshot: () => current, refresh },
    refresh,
    queueNext,
  };
}

describe('POST /api/refresh', () => {
  it('answers 200 with refreshed: true and a later readAt, reflected by the next GET /api/presentation', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', ['.planning/PROJECT.md']);
    const after = makeSnapshot('2026-09-02T00:00:00.000Z', ['.planning/PROJECT.md']);
    const { source, queueNext } = makeSpySource(before);
    queueNext(after);
    const app = createApp(source, true, '.');

    const refreshResponse = await app.request('/api/refresh', { method: 'POST' });
    expect(refreshResponse.status).toBe(200);
    const refreshBody = (await refreshResponse.json()) as { refreshed: boolean; readAt: string };
    expect(refreshBody.refreshed).toBe(true);
    expect(refreshBody.readAt).toBe(after.readAt);

    const presentationResponse = await app.request('/api/presentation');
    const presentationBody = (await presentationResponse.json()) as { readAt: string };
    expect(presentationBody.readAt).toBe(after.readAt);
  });

  it('replaces GET /api/tree with the post-refresh artifact set - the derived bundle, not just the presentation, was rebuilt', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', ['.planning/PROJECT.md']);
    const after = makeSnapshot('2026-09-02T00:00:00.000Z', [
      '.planning/PROJECT.md',
      '.planning/NOTES.md',
    ]);
    const { source, queueNext } = makeSpySource(before);
    queueNext(after);
    const app = createApp(source, true, '.');

    const treeBefore = await (await app.request('/api/tree')).json();
    expect(JSON.stringify(treeBefore)).not.toContain('NOTES.md');

    await app.request('/api/refresh', { method: 'POST' });

    const treeAfter = await (await app.request('/api/tree')).json();
    expect(JSON.stringify(treeAfter)).toContain('NOTES.md');
  });

  it('coalesces two concurrent calls into exactly one call into the source refresh(), with equal readAt responses (TGT-06)', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', []);
    const after = makeSnapshot('2026-09-02T00:00:00.000Z', []);
    let current = before;
    const control: { resolve: (() => void) | null } = { resolve: null };
    const refresh = vi.fn(
      () =>
        new Promise<ProjectSnapshot>((resolve) => {
          control.resolve = () => {
            current = after;
            resolve(current);
          };
        }),
    );
    const source = { getSnapshot: () => current, refresh };
    const app = createApp(source, true, '.');

    const first = app.request('/api/refresh', { method: 'POST' });
    const second = app.request('/api/refresh', { method: 'POST' });
    // Let both handlers reach the coalescing check before the in-flight promise resolves.
    await Promise.resolve();
    await Promise.resolve();
    control.resolve?.();
    const [firstResponse, secondResponse] = await Promise.all([first, second]);

    expect(refresh).toHaveBeenCalledTimes(1);
    const [firstBody, secondBody] = (await Promise.all([
      firstResponse.json(),
      secondResponse.json(),
    ])) as { readAt: string }[];
    expect(firstBody.readAt).toBe(secondBody.readAt);
    expect(firstBody.readAt).toBe(after.readAt);
  });

  it('answers 200 with refreshed: false and the unchanged readAt when the source exposes no refresh (TGT-08 empty)', async () => {
    const snapshot = makeSnapshot('2026-09-01T00:00:00.000Z', []);
    const source = { getSnapshot: () => snapshot };
    const app = createApp(source, true, '.');

    const response = await app.request('/api/refresh', { method: 'POST' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { refreshed: boolean; readAt: string };
    expect(body.refreshed).toBe(false);
    expect(body.readAt).toBe(snapshot.readAt);
  });

  it('answers a failure status with refreshed: false, never true, when refresh() resolves to project: null (CR-01/ATT-01)', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', ['.planning/PROJECT.md']);
    const { source, queueNext } = makeSpySource(before);
    queueNext(FAILED_SNAPSHOT);
    const app = createApp(source, true, '.');

    const response = await app.request('/api/refresh', { method: 'POST' });
    expect(response.status).toBeGreaterThanOrEqual(400);
    const body = (await response.json()) as { refreshed: boolean; error: unknown };
    expect(body.refreshed).toBe(false);
    expect(body.error).toBe(FAILED_SNAPSHOT.loadStatus.status !== 'ok' ? FAILED_SNAPSHOT.loadStatus.message : undefined);
  });

  it('retains the pre-refresh readAt and project after a reachable-failure refresh (D-04)', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', ['.planning/PROJECT.md']);
    const { source, queueNext } = makeSpySource(before);
    queueNext(FAILED_SNAPSHOT);
    const app = createApp(source, true, '.');

    await app.request('/api/refresh', { method: 'POST' });

    const presentationResponse = await app.request('/api/presentation');
    const presentationBody = (await presentationResponse.json()) as {
      readAt: string;
      loadStatus: unknown;
    };
    expect(presentationBody.readAt).toBe(before.readAt);
    expect(presentationBody.loadStatus).toEqual({ status: 'ok' });

    const treeResponse = await (await app.request('/api/tree')).json();
    expect(JSON.stringify(treeResponse)).toContain('PROJECT.md');
  });

  it('recovers on a subsequent successful refresh after a reachable-failure refresh poisoned nothing', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', ['.planning/PROJECT.md']);
    const after = makeSnapshot('2026-09-02T00:00:00.000Z', ['.planning/PROJECT.md']);
    const { source, queueNext } = makeSpySource(before);
    queueNext(FAILED_SNAPSHOT);
    const app = createApp(source, true, '.');

    await app.request('/api/refresh', { method: 'POST' });

    queueNext(after);
    const secondRefresh = await app.request('/api/refresh', { method: 'POST' });
    expect(secondRefresh.status).toBe(200);
    const secondBody = (await secondRefresh.json()) as { refreshed: boolean };
    expect(secondBody.refreshed).toBe(true);

    const presentationResponse = await app.request('/api/presentation');
    const presentationBody = (await presentationResponse.json()) as { readAt: string };
    expect(presentationBody.readAt).toBe(after.readAt);
  });

  it('answers 500 with refreshed: false on a rejecting refresh(), and retains the pre-refresh readAt on the next GET (D-04)', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', []);
    const source = {
      getSnapshot: () => before,
      refresh: vi.fn(async (): Promise<ProjectSnapshot> => {
        throw new Error('disk fell over');
      }),
    };
    const app = createApp(source, true, '.');

    const refreshResponse = await app.request('/api/refresh', { method: 'POST' });
    expect(refreshResponse.status).toBe(500);
    const refreshBody = (await refreshResponse.json()) as { refreshed: boolean };
    expect(refreshBody.refreshed).toBe(false);

    const presentationResponse = await app.request('/api/presentation');
    const presentationBody = (await presentationResponse.json()) as { readAt: string };
    expect(presentationBody.readAt).toBe(before.readAt);
  });

  it('yields deep-equal /api/tree and /api/presentation payloads (ignoring readAt) across two refreshes of an unchanged snapshot (TGT-08 ordering)', async () => {
    const paths = ['.planning/PROJECT.md', '.planning/ROADMAP.md'];
    const first = makeSnapshot('2026-09-01T00:00:00.000Z', paths);
    const second = makeSnapshot('2026-09-02T00:00:00.000Z', paths);
    const third = makeSnapshot('2026-09-03T00:00:00.000Z', paths);
    const { source, queueNext } = makeSpySource(first);
    queueNext(second);
    queueNext(third);
    const app = createApp(source, true, '.');

    await app.request('/api/refresh', { method: 'POST' });
    const treeAfterFirst = await (await app.request('/api/tree')).json();
    const presentationAfterFirst = (await (
      await app.request('/api/presentation')
    ).json()) as Record<string, unknown>;

    await app.request('/api/refresh', { method: 'POST' });
    const treeAfterSecond = await (await app.request('/api/tree')).json();
    const presentationAfterSecond = (await (
      await app.request('/api/presentation')
    ).json()) as Record<string, unknown>;

    expect(treeAfterSecond).toEqual(treeAfterFirst);
    const restFirst = { ...presentationAfterFirst };
    delete restFirst.readAt;
    const restSecond = { ...presentationAfterSecond };
    delete restSecond.readAt;
    expect(restSecond).toEqual(restFirst);
  });

  it('answers 403 and never calls refresh() when sec-fetch-site is present and not same-origin', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', []);
    const { source, refresh } = makeSpySource(before);
    const app = createApp(source, true, '.');

    const response = await app.request('/api/refresh', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
    });

    expect(response.status).toBe(403);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('allows the refresh when sec-fetch-site is absent, matching curl and the smoke probe', async () => {
    const before = makeSnapshot('2026-09-01T00:00:00.000Z', []);
    const after = makeSnapshot('2026-09-02T00:00:00.000Z', []);
    const { source, queueNext } = makeSpySource(before);
    queueNext(after);
    const app = createApp(source, true, '.');

    const response = await app.request('/api/refresh', { method: 'POST' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { refreshed: boolean };
    expect(body.refreshed).toBe(true);
  });
});
