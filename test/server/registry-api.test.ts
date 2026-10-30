// The tracer proof for several projects (PLAT-02, PLAT-08): one registry app answers the project list
// and each project's own API at /api/projects/<slug>, every answer comes from that slug's own runtime
// and equals what the single-project wrapper answers for that project alone, an unknown slug loads
// nothing, and no handler can exist only in the legacy wrapper. Every request goes through
// guardedRequest, so it carries the Host the request guard (SEC-05) allows; the guard's own refusals
// are proven at the bottom of this file.
import { existsSync, realpathSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import type { ProjectListResponse } from '../../src/presentation/project-list.ts';
import { createApp } from '../../src/server/index.ts';
import { createProjectApi } from '../../src/server/project-api.ts';
import { ProjectRegistry, createSnapshotSource, identityOfTarget } from '../../src/server/project-registry.ts';
import { createRegistryApp } from '../../src/server/registry-api.ts';
import { FileSettingsStore } from '../../src/server/settings-store.ts';
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

/** Every /api route the registry app registers, one entry per method a request could reach it with.
 * Middleware and the 404 fallback register as ALL on a wildcard path and are skipped; an ALL route on a
 * concrete path (the images-only /files route) is a real route that any method reaches, so it is
 * tested as a GET and as a POST. */
function enumerateApiRoutes(app: ReturnType<typeof createRegistryApp>): { key: string; method: string; url: string }[] {
  const seen = new Map<string, { key: string; method: string; url: string }>();
  for (const route of app.routes) {
    if (!route.path.startsWith('/api/')) continue;
    if (route.method === 'ALL' && route.path.endsWith('*')) continue;
    const methods = route.method === 'ALL' ? ['GET', 'POST'] : [route.method];
    const url = route.path
      .replace(':slug', 'lendshed')
      .replace(/:\w+(\{[^}]*\})?/g, 'x')
      .replace(/\*/g, 'x');
    for (const method of methods) {
      const key = `${method} ${route.path}`;
      seen.set(key, { key, method, url });
    }
  }
  return [...seen.values()];
}

describe('the refusal table over every registered /api route', () => {
  const host = `127.0.0.1:${TEST_PORT}`;
  const foreign = `evil.example:${TEST_PORT}`;
  const accessControl = (response: Response) =>
    [...response.headers.keys()].filter((name) => name.startsWith('access-control-'));

  function guardedRegistry() {
    const refreshSpy = vi.fn();
    const createSource = vi.fn(async (target: string) => {
      const inner = await createSnapshotSource(target);
      return {
        getSnapshot: () => inner.getSnapshot(),
        refresh: async () => {
          refreshSpy();
          return inner.refresh ? inner.refresh() : inner.getSnapshot();
        },
        planningFilesystem: () => inner.planningFilesystem?.() ?? null,
        dispose: () => inner.dispose?.(),
      };
    });
    const registry = new ProjectRegistry({ createSource });
    const app = createRegistryApp(registry, { policy: testPolicy() });
    return { registry, app, createSource, refreshSpy };
  }

  it('enumerates the routes it is meant to cover, so an empty table cannot pass', () => {
    const { registry, app } = guardedRegistry();
    const keys = enumerateApiRoutes(app).map((route) => route.key);
    expect(keys).toContain('GET /api/projects');
    expect(keys).toContain('POST /api/projects/:slug/refresh');
    expect(keys).toContain('GET /api/projects/:slug/presentation');
    expect(keys.length).toBeGreaterThanOrEqual(GET_ROUTES.length + 2);
    registry.dispose();
  });

  it('refuses a foreign Host on every route, and every mutation without same-origin proof or JSON, with no side effect', async () => {
    const { registry, app, createSource, refreshSpy } = guardedRegistry();
    await registerBoth(registry);
    const before = await (await guardedRequest(app, '/api/projects')).json();
    const routes = enumerateApiRoutes(app);
    const covered = new Set<string>();
    const exercised = new Map<string, string[]>();
    const note = (key: string, check: string) => exercised.set(key, [...(exercised.get(key) ?? []), check]);

    for (const { key, method, url } of routes) {
      const body = method === 'GET' || method === 'HEAD' ? {} : { body: '{}' };
      const write = { Host: host, 'Content-Type': 'application/json' };

      // 1) a foreign Host is refused before the route, GETs included.
      const foreignHost = await app.request(url, {
        method,
        ...body,
        headers: { Host: foreign, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' },
      });
      expect(foreignHost.status, `${key} with a foreign Host`).toBe(403);
      expect(await foreignHost.json()).toEqual({ error: 'refused', reason: 'host' });
      expect(accessControl(foreignHost), `${key} foreign Host headers`).toEqual([]);
      note(key, 'host');

      // 2) a mutation without proof of same origin, or without JSON, is refused.
      if (method !== 'GET' && method !== 'HEAD') {
        const variants: [string, Record<string, string>, number[]][] = [
          ['cross-site', { ...write, 'Sec-Fetch-Site': 'cross-site' }, [403]],
          ['origin-null', { ...write, Origin: 'null' }, [403]],
          ['no-proof', { ...write }, [403]],
          ['text-plain', { ...write, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'text/plain' }, [403, 415]],
        ];
        for (const [label, headers, allowedStatuses] of variants) {
          const response = await app.request(url, { method, ...body, headers });
          expect(allowedStatuses, `${key} ${label} answered ${response.status}`).toContain(response.status);
          expect(accessControl(response), `${key} ${label} headers`).toEqual([]);
          note(key, label);
        }
      }
      covered.add(key);
    }

    // A refused request changed nothing: no source was created, refresh never ran, the list is the same.
    expect(createSource).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(registry.loadedCount()).toBe(0);
    expect(await (await guardedRequest(app, '/api/projects')).json()).toEqual(before);

    // Coverage cannot drift: the table was built from the registered routes, and each one ran every check.
    expect([...covered].sort()).toEqual(enumerateApiRoutes(app).map((route) => route.key).sort());
    for (const { key, method } of routes) {
      const expected = method === 'GET' || method === 'HEAD' ? ['host'] : ['host', 'cross-site', 'origin-null', 'no-proof', 'text-plain'];
      expect(exercised.get(key), `${key} ran every refusal check`).toEqual(expected);
    }
    registry.dispose();
  });

  it('lets a request with the right Host, same-origin proof and JSON reach every route', async () => {
    const { registry, app } = guardedRegistry();
    await registerBoth(registry);
    for (const { key, method, url } of enumerateApiRoutes(app)) {
      const response = await guardedRequest(app, url, { method });
      expect([403, 415], `${key} passes the guard`).not.toContain(response.status);
      expect(accessControl(response), `${key} headers`).toEqual([]);
    }
    registry.dispose();
  });

  it('sets no Access-Control-Allow-Origin header on any /api/projects answer, refused or not', async () => {
    const { registry, app } = guardedRegistry();
    await registerBoth(registry);
    const answers = [
      await guardedRequest(app, '/api/projects'),
      await guardedRequest(app, '/api/projects', { headers: { Host: foreign, Origin: 'http://evil.example' } }),
      await guardedRequest(app, '/api/projects/lendshed/refresh', { method: 'POST' }),
    ];
    for (const response of answers) expect(response.headers.get('access-control-allow-origin')).toBeNull();
    registry.dispose();
  });

  it('answers a body above the limit 413 with the too-large copy, and a foreign Host 403 first', async () => {
    const { registry, app } = guardedRegistry();
    await registerBoth(registry);
    const big = JSON.stringify({ text: 'x'.repeat(5000) });
    const tooLarge = await guardedRequest(app, '/api/projects/lendshed/refresh', { method: 'POST', body: big });
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({ error: 'That request was too large for Labelore to read.' });
    const foreignBig = await guardedRequest(app, '/api/projects/lendshed/refresh', {
      method: 'POST',
      body: big,
      headers: { Host: foreign },
    });
    expect(foreignBig.status).toBe(403);
    registry.dispose();
  });
});

// ---- The write routes of the remembered list (PLAT-06, PLAT-07, SEC-05) ------------------------------

const settingsDirs: string[] = [];

afterAll(async () => {
  await Promise.all(settingsDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A registry over a settings file in its own temp directory, with a real source builder. */
async function rememberingRegistry() {
  const dir = await mkdtemp(join(tmpdir(), 'labelore-registry-api-'));
  settingsDirs.push(dir);
  const registry = new ProjectRegistry({ store: new FileSettingsStore(dir, identityOfTarget) });
  const app = createRegistryApp(registry, { policy: testPolicy() });
  const settingsText = async (): Promise<string | null> =>
    existsSync(join(dir, 'settings.json')) ? readFile(join(dir, 'settings.json'), 'utf8') : null;
  return { registry, app, dir, settingsText };
}

function post(app: ReturnType<typeof createRegistryApp>, path: string, body: unknown): Promise<Response> {
  return guardedRequest(app, path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
}

describe('POST /api/projects', () => {
  it('answers 201 with the slug for a new project and 200 duplicate for the same project again', async () => {
    const { registry, app, settingsText } = await rememberingRegistry();

    const created = await post(app, '/api/projects', { target: SHAPES_ROOT });
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ slug: 'shapes', name: 'Kilnrow', duplicate: false });
    const written = await settingsText();
    expect(written).toContain('"slug": "shapes"');

    const again = await post(app, '/api/projects', { target: `${SHAPES_ROOT}/.planning` });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ slug: 'shapes', name: 'Kilnrow', duplicate: true });
    expect(await settingsText()).toBe(written);
    registry.dispose();
  });

  it('answers 422 with the server own message and the exact path checked for a missing folder', async () => {
    const { registry, app, settingsText } = await rememberingRegistry();
    const missing = join(tmpdir(), 'labelore-no-such-project-folder');

    const response = await post(app, '/api/projects', { target: missing });
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string; status: { status: string; pathChecked: string } };
    expect(body.status.status).toBe('path-not-found');
    expect(body.status.pathChecked).toBe(missing);
    expect(body.error).toContain('No such path');
    expect(body.error).toContain(missing);
    expect(await settingsText()).toBeNull();
    registry.dispose();
  });

  it('answers 422 for an ssh address carrying a password and leaves settings.json unchanged', async () => {
    const { registry, app, settingsText } = await rememberingRegistry();
    await post(app, '/api/projects', { target: SHAPES_ROOT });
    const before = await settingsText();

    const response = await post(app, '/api/projects', { target: 'ssh://user:secret@host/path' });
    expect(response.status).toBe(422);
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain('secret');
    expect(await settingsText()).toBe(before);
    expect(before).not.toContain('secret');
    registry.dispose();
  });

  it('checks an ssh target for syntax only and remembers it without connecting', async () => {
    const { registry, app } = await rememberingRegistry();
    const response = await post(app, '/api/projects', { target: 'sftp://dev@fixture-host/srv/never-reached' });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ slug: 'never-reached', duplicate: false });
    expect(registry.loadedCount()).toBe(0);
    registry.dispose();
  });

  it('answers 400 for a body that is not an object with a string target, or not JSON', async () => {
    const { registry, app, settingsText } = await rememberingRegistry();
    const message = { error: 'Enter a folder path or an ssh:// target.' };

    for (const body of [{ target: 5 }, {}, [], 'null', 'not json at all', { target: '' }]) {
      const response = await post(app, '/api/projects', body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect(await response.json()).toEqual(message);
    }
    expect(await settingsText()).toBeNull();
    registry.dispose();
  });

  it('leaves one entry when two simultaneous posts name one new target', async () => {
    const { registry, app, settingsText } = await rememberingRegistry();
    const answers = await Promise.all([
      post(app, '/api/projects', { target: SHAPES_ROOT }),
      post(app, '/api/projects', { target: SHAPES_ROOT }),
    ]);
    expect(answers.map((response) => response.status).sort()).toEqual([200, 201]);
    expect((await (await guardedRequest(app, '/api/projects')).json() as ProjectListResponse).projects).toHaveLength(1);
    expect(JSON.parse((await settingsText()) ?? '{}').projects).toHaveLength(1);
    registry.dispose();
  });

  it('is covered by the route-enumeration refusal table without edits', () => {
    const { registry } = makeRegistry();
    const app = createRegistryApp(registry, { policy: testPolicy() });
    expect(enumerateApiRoutes(app).map((route) => route.key)).toContain('POST /api/projects');
    registry.dispose();
  });
});

describe('DELETE /api/projects/:slug', () => {
  it('forgets a project by editing settings.json only and answers 200 with the slug', async () => {
    const { registry, app, settingsText } = await rememberingRegistry();
    await post(app, '/api/projects', { target: SHAPES_ROOT });
    await post(app, '/api/projects', { target: FX_ROOT });
    const treeBefore = await readdir(SHAPES, { recursive: true });

    const response = await guardedRequest(app, '/api/projects/shapes', { method: 'DELETE' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ forgotten: 'shapes' });

    const saved = JSON.parse((await settingsText()) ?? '{}') as { projects: { slug: string }[] };
    expect(saved.projects.map((project) => project.slug)).toEqual(['lendshed']);
    const listed = (await (await guardedRequest(app, '/api/projects')).json()) as ProjectListResponse;
    expect(listed.projects.map((project) => project.slug)).toEqual(['lendshed']);
    expect(await readdir(SHAPES, { recursive: true })).toEqual(treeBefore);
    registry.dispose();
  });

  it('answers 404 Unknown project for an unknown slug, and a slug is forgotten only once', async () => {
    const { registry, app } = await rememberingRegistry();
    await post(app, '/api/projects', { target: SHAPES_ROOT });

    const unknown = await guardedRequest(app, '/api/projects/nope', { method: 'DELETE' });
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: 'Unknown project' });

    expect((await guardedRequest(app, '/api/projects/shapes', { method: 'DELETE' })).status).toBe(200);
    expect((await guardedRequest(app, '/api/projects/shapes', { method: 'DELETE' })).status).toBe(404);
    registry.dispose();
  });

  it('answers 500 with the save-failed copy and keeps the entry when the write fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'labelore-registry-api-'));
    settingsDirs.push(dir);
    const inner = new FileSettingsStore(dir, identityOfTarget);
    let failing = false;
    const registry = new ProjectRegistry({
      store: {
        location: () => inner.location(),
        read: () => inner.read(),
        mutate: (update) =>
          failing ? { ok: false, state: update(inner.read().state), reason: 'EROFS' } : inner.mutate(update),
      },
    });
    const app = createRegistryApp(registry, { policy: testPolicy() });
    await post(app, '/api/projects', { target: SHAPES_ROOT });

    failing = true;
    const response = await guardedRequest(app, '/api/projects/shapes', { method: 'DELETE' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Could not save the project list: EROFS. The change lasts only until Labelore restarts.',
    });
    const listed = (await (await guardedRequest(app, '/api/projects')).json()) as ProjectListResponse;
    expect(listed.projects.map((project) => project.slug)).toEqual(['shapes']);
    registry.dispose();
  });
});

describe('POST /api/projects/:slug/open', () => {
  it('stamps that project only and answers its slug and state', async () => {
    const { registry, app, settingsText } = await rememberingRegistry();
    await post(app, '/api/projects', { target: SHAPES_ROOT });
    await post(app, '/api/projects', { target: FX_ROOT });

    const response = await post(app, '/api/projects/lendshed/open', {});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ slug: 'lendshed', state: 'loading' });

    const saved = JSON.parse((await settingsText()) ?? '{}') as {
      projects: { slug: string; lastOpened: string | null }[];
      lastActive: string | null;
    };
    const stamps = Object.fromEntries(saved.projects.map((project) => [project.slug, project.lastOpened]));
    expect(stamps.shapes).toBeNull();
    expect(stamps.lendshed).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(saved.lastActive).toBe('lendshed');

    // Opening shapes afterwards changes nothing for lendshed (D-08): no server-side active project.
    await post(app, '/api/projects/shapes/open', {});
    const after = JSON.parse((await settingsText()) ?? '{}') as { projects: { slug: string; lastOpened: string | null }[] };
    expect(after.projects.find((project) => project.slug === 'lendshed')?.lastOpened).toBe(stamps.lendshed);
    expect(after.projects.find((project) => project.slug === 'shapes')?.lastOpened).not.toBeNull();
    registry.dispose();
  });

  it('starts the load, and the project then answers from its own runtime', async () => {
    const { registry, app } = await rememberingRegistry();
    await post(app, '/api/projects', { target: SHAPES_ROOT });
    await post(app, '/api/projects/shapes/open', {});
    await registry.runtime('shapes');
    const listed = (await (await guardedRequest(app, '/api/projects')).json()) as ProjectListResponse;
    expect(listed.projects[0]).toMatchObject({ slug: 'shapes', state: 'ready', name: 'Kilnrow' });
    registry.dispose();
  });

  it('answers 404 Unknown project for an unknown slug', async () => {
    const { registry, app } = await rememberingRegistry();
    const response = await post(app, '/api/projects/nope/open', {});
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Unknown project' });
    registry.dispose();
  });

  it('keeps the route-enumeration table equal to the full route set, the new routes included', () => {
    const { registry } = makeRegistry();
    const keys = enumerateApiRoutes(createRegistryApp(registry, { policy: testPolicy() })).map((route) => route.key);
    expect(keys).toEqual(expect.arrayContaining(['POST /api/projects', 'DELETE /api/projects/:slug', 'POST /api/projects/:slug/open']));
    registry.dispose();
  });
});
