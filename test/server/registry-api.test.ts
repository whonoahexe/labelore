// The tracer proof for several projects (PLAT-02, PLAT-08): one registry app answers the project list
// and each project's own API at /api/projects/<slug>, every answer comes from that slug's own runtime
// and equals what the single-project wrapper answers for that project alone, an unknown slug loads
// nothing, and no handler can exist only in the legacy wrapper. Every request goes through
// guardedRequest, so it carries the Host the request guard (SEC-05) allows; the guard's own refusals
// are proven at the bottom of this file.
import { realpathSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ProjectListResponse } from '../../src/presentation/project-list.ts';
import { createApp } from '../../src/server/index.ts';
import { createProjectApi } from '../../src/server/project-api.ts';
import { ProjectRegistry, createSnapshotSource } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import { FX_ROOT } from '../helpers/fixture-project.ts';
import { TEST_PORT, guardedRequest, testPolicy } from '../helpers/guarded-request.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const LENDSHED = realpathSync(FX_ROOT);
const SHAPES = realpathSync(SHAPES_ROOT);

/** Every parameterless GET route of the project API (the truths of 08-01). */
const GET_ROUTES = [
  'presentation',
  'dashboard',
  'roadmap',
  'history',
  'tree',
  'drawer',
  'traceability',
  'research',
  'sketches',
] as const;

/** Routes where the two made-up fixtures legitimately answer the same body: neither project has a
 * sketch manifest, so /sketches reads `available: false` for both. They are still checked against the
 * single-project wrapper for each slug; only the "answers differ" check is skipped. */
const SAME_BY_NATURE: ReadonlySet<string> = new Set(['sketches']);

function makeRegistry() {
  const createSource = vi.fn((target: string) => createSnapshotSource(target));
  const registry = new ProjectRegistry({ createSource });
  return { registry, createSource };
}

async function registerBoth(registry: ProjectRegistry): Promise<void> {
  expect(await registry.register(FX_ROOT)).toEqual({ ok: true, slug: 'lendshed', duplicate: false });
  expect(await registry.register(SHAPES_ROOT)).toEqual({ ok: true, slug: 'shapes', duplicate: false });
}

/** The single-project wrapper over one project alone: what the old URLs answered. */
async function soloApp(root: string) {
  const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
  await repository.load();
  return createApp(repository, false);
}

/** A body with every `readAt` removed: each load stamps its own read time. */
function withoutReadAt(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutReadAt);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'readAt')
        .map(([key, entry]) => [key, withoutReadAt(entry)]),
    );
  }
  return value;
}

async function json(app: { request: (path: string, init?: RequestInit) => Response | Promise<Response> }, path: string) {
  const response = await guardedRequest(app, path);
  return { status: response.status, body: withoutReadAt(await response.json()) };
}

describe('GET /api/projects', () => {
  it('lists both projects unloaded, without creating a source', async () => {
    const { registry, createSource } = makeRegistry();
    await registerBoth(registry);
    const app = createRegistryApp(registry, { policy: testPolicy() });

    const response = await guardedRequest(app, '/api/projects');
    expect(response.status).toBe(200);
    const body = (await response.json()) as ProjectListResponse;
    expect(body.notices).toEqual([]);
    expect(body.projects.map((project) => project.slug).sort()).toEqual(['lendshed', 'shapes']);
    for (const project of body.projects) {
      expect(project.state).toBe('unloaded');
      expect(project.kind).toBe('local');
      expect(project.reason).toBeNull();
      expect(project.sessionOnly).toBe(false);
    }
    expect(createSource).not.toHaveBeenCalled();
    registry.dispose();
  });
});

describe('/api/projects/<slug>', () => {
  it('answers each slug from its own project', async () => {
    const { registry } = makeRegistry();
    await registerBoth(registry);
    const app = createRegistryApp(registry, { policy: testPolicy() });

    const shapes = (await (await guardedRequest(app, '/api/projects/shapes/presentation')).json()) as {
      projectSlug: string;
      rootPath: string;
    };
    expect(shapes.projectSlug).toBe('shapes');
    expect(shapes.rootPath).toBe(SHAPES);

    const lendshed = await json(app, '/api/projects/lendshed/dashboard');
    const solo = await json(await soloApp(LENDSHED), '/api/dashboard');
    expect(lendshed.status).toBe(200);
    expect(lendshed.body).toEqual(solo.body);
    registry.dispose();
  });

  it('answers every parameterless GET route with the project own data, equal to the single-project wrapper', async () => {
    const { registry } = makeRegistry();
    await registerBoth(registry);
    const app = createRegistryApp(registry, { policy: testPolicy() });
    const solos = { lendshed: await soloApp(LENDSHED), shapes: await soloApp(SHAPES) };

    // Interleaved, so no request can lean on another's state (D-08).
    const requests = GET_ROUTES.flatMap((route) =>
      (['lendshed', 'shapes', 'lendshed', 'shapes'] as const).map((slug) => ({ route, slug })),
    );
    const answers = await Promise.all(
      requests.map(async ({ route, slug }) => ({ route, slug, answer: await json(app, `/api/projects/${slug}/${route}`) })),
    );

    for (const route of GET_ROUTES) {
      const forRoute = answers.filter((entry) => entry.route === route);
      const lendshed = forRoute.filter((entry) => entry.slug === 'lendshed').map((entry) => entry.answer);
      const shapes = forRoute.filter((entry) => entry.slug === 'shapes').map((entry) => entry.answer);
      const soloLendshed = await json(solos.lendshed, `/api/${route}`);
      const soloShapes = await json(solos.shapes, `/api/${route}`);

      for (const answer of lendshed) expect(answer, `${route} lendshed`).toEqual(soloLendshed);
      for (const answer of shapes) expect(answer, `${route} shapes`).toEqual(soloShapes);
      expect(lendshed[0].status, `${route} status`).toBe(200);
      if (!SAME_BY_NATURE.has(route)) {
        expect(lendshed[0].body, `${route} differs between projects`).not.toEqual(shapes[0].body);
      }
    }
    registry.dispose();
  });

  it('never resolves a document URL that exists in both projects to the other project file', async () => {
    const { registry } = makeRegistry();
    await registerBoth(registry);
    const app = createRegistryApp(registry, { policy: testPolicy() });

    type Presentation = { artifacts: { key: string; path: string }[] };
    const lendshedPresentation = (await (await guardedRequest(app, '/api/projects/lendshed/presentation')).json()) as Presentation;
    const shapesPresentation = (await (await guardedRequest(app, '/api/projects/shapes/presentation')).json()) as Presentation;
    const shapesKeys = new Set(shapesPresentation.artifacts.map((artifact) => artifact.key));
    const shared = lendshedPresentation.artifacts.find((artifact) => shapesKeys.has(artifact.key));
    expect(shared, 'the two fixture projects share at least one document URL').toBeDefined();
    const route = encodeURIComponent(shared!.key);

    const lendshed = await json(app, `/api/projects/lendshed/documents?route=${route}`);
    const shapes = await json(app, `/api/projects/shapes/documents?route=${route}`);
    const soloLendshed = await json(await soloApp(LENDSHED), `/api/documents?route=${route}`);
    const soloShapes = await json(await soloApp(SHAPES), `/api/documents?route=${route}`);

    expect(lendshed.status).toBe(200);
    expect(shapes.status).toBe(200);
    expect(lendshed.body).toEqual(soloLendshed.body);
    expect(shapes.body).toEqual(soloShapes.body);
    expect(lendshed.body).not.toEqual(shapes.body);
    registry.dispose();
  });

  it('answers an unknown slug 404 and loads nothing', async () => {
    const { registry, createSource } = makeRegistry();
    await registerBoth(registry);
    const app = createRegistryApp(registry, { policy: testPolicy() });

    const response = await guardedRequest(app, '/api/projects/nope/presentation');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Unknown project' });
    expect(createSource).not.toHaveBeenCalled();
    expect(registry.loadedCount()).toBe(0);
    registry.dispose();
  });

  it('keeps the /api 404 for a path no project route owns', async () => {
    const { registry } = makeRegistry();
    const app = createRegistryApp(registry, { policy: testPolicy() });
    const response = await guardedRequest(app, '/api/nothing-here');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'API route not found' });
    registry.dispose();
  });

  it('sets no Access-Control header on any answer', async () => {
    const { registry } = makeRegistry();
    await registerBoth(registry);
    const app = createRegistryApp(registry, { policy: testPolicy() });
    for (const path of ['/api/projects', '/api/projects/lendshed/roadmap', '/api/projects/nope/roadmap']) {
      const response = await guardedRequest(app, path);
      expect([...response.headers.keys()].filter((name) => name.startsWith('access-control-'))).toEqual([]);
    }
    registry.dispose();
  });
});

describe('route-set equality', () => {
  it('registers every project API route under /api/projects/:slug in the registry app', () => {
    const { registry } = makeRegistry();
    const registryRoutes = new Set(
      createRegistryApp(registry, { policy: testPolicy() }).routes.map((route) => `${route.method} ${route.path}`),
    );
    const projectRoutes = createProjectApi(
      async () => null,
      () => '/api',
    ).routes.filter((route) => route.path !== '*' && route.path !== '/*');

    expect(projectRoutes.length).toBeGreaterThanOrEqual(GET_ROUTES.length + 2);
    for (const route of projectRoutes) {
      const mounted = `${route.method} /api/projects/:slug${route.path}`;
      expect(registryRoutes.has(mounted), `${mounted} is reachable under the registry app`).toBe(true);
    }
    registry.dispose();
  });
});

describe('registering the same project twice', () => {
  it('is a duplicate for the same root and for its .planning folder', async () => {
    const { registry } = makeRegistry();
    await registerBoth(registry);
    expect(await registry.register(SHAPES_ROOT)).toEqual({ ok: true, slug: 'shapes', duplicate: true });
    expect(await registry.register(`${SHAPES_ROOT}/.planning`)).toEqual({ ok: true, slug: 'shapes', duplicate: true });
    expect((await registry.list()).projects).toHaveLength(2);
    registry.dispose();
  });
});

describe('the request guard in front of the registry app', () => {
  it('refuses a foreign Host before any route runs, and answers the same requests with the right Host', async () => {
    const { registry, createSource } = makeRegistry();
    await registerBoth(registry);
    const app = createRegistryApp(registry, { policy: testPolicy() });

    for (const path of ['/api/projects', '/api/projects/lendshed/presentation']) {
      const refused = await guardedRequest(app, path, { headers: { Host: `evil.example:${TEST_PORT}` } });
      expect(refused.status, `${path} with a foreign Host`).toBe(403);
      expect(await refused.json()).toEqual({ error: 'refused', reason: 'host' });
      expect(refused.headers.get('access-control-allow-origin')).toBeNull();
      expect(createSource).not.toHaveBeenCalled();

      const allowed = await guardedRequest(app, path, { headers: { Host: `127.0.0.1:${TEST_PORT}` } });
      expect(allowed.status, `${path} with the listening Host`).toBe(200);
    }
    registry.dispose();
  });
});
