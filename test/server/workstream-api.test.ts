// 11-29 (VIEW-20, D-09): each workstream of Brinkwater is served as its own scope at
// /api/projects/:slug/ws/:name (and /api/ws/:name in the single-project wrapper) by the unchanged pipeline,
// an unlisted or malformed name is a 404, scoped artifacts carry their real paths, and a flat project's API
// answers exactly what it did before the mount existed.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { createApp } from '../../src/server/index.ts';
import { ProjectRegistry, createSnapshotSource } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import type { WorkstreamInventory } from '../../src/server/workstreams.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { guardedRequest, testPolicy } from '../helpers/guarded-request.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const BRINKWATER = realpathSync(fileURLToPath(new URL('../fixtures/brinkwater', import.meta.url)));
const LENDSHED = realpathSync(FX_ROOT);
const SHAPES = realpathSync(SHAPES_ROOT);

async function registryApp(roots: string[]) {
  const registry = new ProjectRegistry({ createSource: (target: string) => createSnapshotSource(target) });
  for (const root of roots) {
    const outcome = await registry.register(root);
    expect(outcome.ok).toBe(true);
  }
  return { registry, app: createRegistryApp(registry, { policy: testPolicy(), production: false }) };
}

async function soloApp(root: string) {
  const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
  await repository.load();
  return createApp(repository, false);
}

const get = async (app: { request: (p: string, i?: RequestInit) => Response | Promise<Response> }, path: string) => {
  const response = await guardedRequest(app, path);
  return { status: response.status, body: (await response.json()) as unknown };
};

describe('the workstream scope mount (11-29)', () => {
  it("serves intake's own roadmap, state and phases at /ws/intake/presentation", async () => {
    const { registry, app } = await registryApp([BRINKWATER]);
    try {
      const { status, body } = await get(app, '/api/projects/brinkwater/ws/intake/presentation');
      expect(status).toBe(200);
      const presentation = body as ProjectPresentation;
      const phases = presentation.milestones.flatMap((milestone) => milestone.phases);
      expect(phases.map((phase) => phase.name)).toEqual(['Sensor Feed', 'Feed Alerts']);
      expect(presentation.state).not.toBeNull();
      const paths = presentation.artifacts.map((artifact) => artifact.path);
      expect(paths).toContain('.planning/ROADMAP.md');
      expect(paths).toContain('.planning/STATE.md');
      expect(paths).toContain('.planning/PROJECT.md');
      expect(paths.some((path) => path.includes('workstreams/'))).toBe(false);
    } finally {
      registry.dispose();
    }
  });

  it("gives each workstream its own phases: ledger's phase 4 is not intake's", async () => {
    const { registry, app } = await registryApp([BRINKWATER]);
    try {
      const ledger = (await get(app, '/api/projects/brinkwater/ws/ledger/presentation')).body as ProjectPresentation;
      const names = ledger.milestones.flatMap((milestone) => milestone.phases).map((phase) => phase.name);
      expect(names).toContain('Tide Tables');
      expect(names).not.toContain('Sensor Feed');
    } finally {
      registry.dispose();
    }
  });

  it('answers 404 for a name that is not listed and for malformed names', async () => {
    const { registry, app } = await registryApp([BRINKWATER]);
    try {
      for (const name of ['missing', '..%2Fx', 'none', 'a%2Fb', 'archive', 'x.md', 'INTAKE']) {
        const { status } = await get(app, `/api/projects/brinkwater/ws/${name}/presentation`);
        expect(status, name).toBe(404);
      }
      expect((await get(app, '/api/projects/nope/ws/intake/presentation')).status).toBe(404);
    } finally {
      registry.dispose();
    }
  });

  it('serves the same scope in the single-project wrapper at /api/ws/:name', async () => {
    const app = await soloApp(BRINKWATER);
    const scoped = await get(app, '/api/ws/intake/presentation');
    expect(scoped.status).toBe(200);
    expect((scoped.body as ProjectPresentation).milestones.flatMap((m) => m.phases)).toHaveLength(2);
    expect((await get(app, '/api/ws/missing/presentation')).status).toBe(404);
    expect((await get(app, '/api/ws/..%2Fx/presentation')).status).toBe(404);
  });

  it("carries real paths on a scoped presentation's artifacts and its documents", async () => {
    const { registry, app } = await registryApp([BRINKWATER]);
    try {
      const presentation = (await get(app, '/api/projects/brinkwater/ws/intake/presentation')).body as ProjectPresentation;
      const real = new Map(presentation.artifacts.map((artifact) => [artifact.path, artifact.realPath]));
      expect(presentation.artifacts.every((artifact) => typeof artifact.realPath === 'string')).toBe(true);
      expect(real.get('.planning/ROADMAP.md')).toBe('.planning/workstreams/intake/ROADMAP.md');
      expect(real.get('.planning/PROJECT.md')).toBe('.planning/PROJECT.md');
      const roadmap = presentation.artifacts.find((artifact) => artifact.path === '.planning/ROADMAP.md');
      expect(roadmap).toBeDefined();
      const document = await get(app, `/api/projects/brinkwater/ws/intake/documents?route=${encodeURIComponent(roadmap!.key)}`);
      expect(document.status).toBe(200);
      const found = document.body as { artifact: { path: string; realPath?: string } };
      expect(found.artifact.path).toBe('.planning/ROADMAP.md');
      expect(found.artifact.realPath).toBe('.planning/workstreams/intake/ROADMAP.md');
    } finally {
      registry.dispose();
    }
  });

  it("leaves the project's own presentation unscoped and without real paths", async () => {
    const { registry, app } = await registryApp([BRINKWATER]);
    try {
      const own = (await get(app, '/api/projects/brinkwater/presentation')).body as ProjectPresentation;
      expect(own.artifacts.some((artifact) => 'realPath' in artifact)).toBe(false);
      expect(own.artifacts.map((artifact) => artifact.path)).toContain('.planning/workstreams/intake/ROADMAP.md');
    } finally {
      registry.dispose();
    }
  });

  it('serves Shapes and Lendshed byte-for-byte as the single-project wrapper does, with no realPath key', async () => {
    const { registry, app } = await registryApp([LENDSHED, SHAPES]);
    try {
      for (const [slug, root] of [
        ['lendshed', LENDSHED],
        ['shapes', SHAPES],
      ] as const) {
        const solo = await soloApp(root);
        for (const route of ['presentation', 'dashboard', 'roadmap', 'tree', 'traceability']) {
          const served = await guardedRequest(app, `/api/projects/${slug}/${route}`);
          const wrapper = await solo.request(`/api/${route}`);
          const servedBody = (await served.json()) as { readAt?: string };
          const wrapperBody = (await wrapper.json()) as { readAt?: string };
          // Each side was read at its own moment; everything else must be identical.
          delete servedBody.readAt;
          delete wrapperBody.readAt;
          expect(servedBody, `${slug}/${route}`).toEqual(wrapperBody);
        }
        const text = await (await guardedRequest(app, `/api/projects/${slug}/presentation`)).text();
        expect(text).not.toContain('realPath');
        // A flat project has no workstream to scope into.
        expect((await get(app, `/api/projects/${slug}/ws/intake/presentation`)).status).toBe(404);
      }
    } finally {
      registry.dispose();
    }
  });

  it('answers the inventory at /workstreams: workstreams mode for Brinkwater, flat for Shapes and inside a scope', async () => {
    const { registry, app } = await registryApp([BRINKWATER, SHAPES]);
    try {
      const inventory = (await get(app, '/api/projects/brinkwater/workstreams')).body as WorkstreamInventory;
      expect(inventory.mode).toBe('workstreams');
      expect(inventory.entries.map((entry) => entry.name)).toEqual(['intake', 'ledger', 'notices']);
      expect(inventory.active).toEqual({ name: 'intake', state: 'present' });
      const flat = (await get(app, '/api/projects/shapes/workstreams')).body as WorkstreamInventory;
      expect(flat).toEqual({ mode: 'flat', entries: [], active: { name: null, state: 'absent' }, completed: [], midMigration: null });
      const inside = (await get(app, '/api/projects/brinkwater/ws/intake/workstreams')).body as WorkstreamInventory;
      expect(inside.mode).toBe('flat');
    } finally {
      registry.dispose();
    }
  });

  it('disposes a scoped runtime with its parent and rebuilds it after a parent refresh', async () => {
    const { registry } = await registryApp([BRINKWATER]);
    try {
      const parent = await registry.runtime('brinkwater');
      expect(parent).not.toBeNull();
      const first = await parent!.workstreamRuntime('intake');
      expect(first).not.toBeNull();
      expect(await parent!.workstreamRuntime('intake')).toBe(first);
      expect(first!.scope?.name).toBe('intake');
      expect((await parent!.refresh()).kind).toBe('refreshed');
      expect(first!.disposed).toBe(true);
      const second = await parent!.workstreamRuntime('intake');
      expect(second).not.toBeNull();
      expect(second).not.toBe(first);
      expect(second!.disposed).toBe(false);
      parent!.dispose();
      expect(second!.disposed).toBe(true);
      expect(await parent!.workstreamRuntime('intake')).toBeNull();
    } finally {
      registry.dispose();
    }
  });

  it('keeps a parent unevictable while one of its workstream runtimes answers a request', async () => {
    const { registry } = await registryApp([BRINKWATER]);
    try {
      const parent = await registry.runtime('brinkwater');
      const child = await parent!.workstreamRuntime('intake');
      expect(parent!.isBusy()).toBe(false);
      child!.inFlightRequests = 1;
      expect(parent!.isBusy()).toBe(true);
      child!.inFlightRequests = 0;
      expect(parent!.isBusy()).toBe(false);
    } finally {
      registry.dispose();
    }
  });
});
