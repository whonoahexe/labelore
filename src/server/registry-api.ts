// The served app (PLAT-02, PLAT-08): the project list at GET /api/projects, every project's read API
// at /api/projects/:slug/*, and the production static block. A request reaches a project only
// through the slug in its own URL - the registry holds no "active project" a tab could change for
// another (D-08).
//
// No Access-Control-* header is set anywhere: the API is same-origin only, and request-guard.ts refuses
// a foreign Host or a cross-site write before any route runs.
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { SCAN_MESSAGES, SCAN_RESULT_CAP } from './folder-scan.ts';
import { createProjectApi } from './project-api.ts';
import { INVALID_INPUT_MESSAGE } from './project-registry.ts';
import type { ProjectRegistry } from './project-registry.ts';
import { GUARD_BODY_LIMIT, createRequestGuard } from './request-guard.ts';
import type { HostPolicy } from './request-guard.ts';

export interface RegistryAppOptions {
  /** The Host allowlist every /api request is checked against (SEC-05); the server sets its port once listening. */
  policy: HostPolicy;
  production?: boolean;
  staticRoot?: string;
}

export function createRegistryApp(registry: ProjectRegistry, options: RegistryAppOptions): Hono {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const staticRoot = options.staticRoot ?? './dist';
  const app = new Hono();

  // The request guard and the body limit are the first registrations of this app, so they run before
  // every route below and before the /api 404, and therefore before any write endpoint (08-16) exists.
  app.use('/api/*', createRequestGuard(options.policy));
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: GUARD_BODY_LIMIT,
      onError: (c) => c.json({ error: 'That request was too large for Labelore to read.' }, 413),
    }),
  );

  app.get('/api/projects', async (c) => c.json(await registry.list()));

  // The three write routes of the remembered list. They sit before the :slug mount so the project API's
  // resolver never runs for them, and behind the guard and body limit above (SEC-05).
  app.post('/api/projects', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: INVALID_INPUT_MESSAGE }, 400);
    }
    const target = typeof body === 'object' && body !== null ? (body as { target?: unknown }).target : undefined;
    if (typeof target !== 'string') return c.json({ error: INVALID_INPUT_MESSAGE }, 400);
    const outcome = await registry.add(target);
    if (outcome.ok) {
      const answer = { slug: outcome.slug, name: outcome.name, duplicate: outcome.duplicate };
      return c.json(answer, outcome.duplicate ? 200 : 201);
    }
    if (outcome.code === 'invalid-input') return c.json({ error: outcome.error }, 400);
    if (outcome.code === 'settings-inside') {
      return c.json({ error: outcome.error, status: { pathChecked: outcome.pathChecked } }, 422);
    }
    return c.json({ error: outcome.status.message, status: outcome.status }, 422);
  });
  // The folder scan and the bulk add. Both are POST behind the guard (a cross-site page cannot use the
  // scan as a directory-listing oracle, SEC-05) and both sit before the :slug mount.
  app.post('/api/projects/scan', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: SCAN_MESSAGES.empty }, 400);
    }
    const folder = typeof body === 'object' && body !== null ? (body as { folder?: unknown }).folder : undefined;
    if (typeof folder !== 'string') return c.json({ error: SCAN_MESSAGES.empty }, 400);
    const outcome = await registry.scan(folder);
    if (!outcome.ok) return c.json({ error: outcome.error }, 422);
    return c.json(outcome);
  });
  app.post('/api/projects/add-many', async (c) => {
    const tooMany = { error: `Choose up to ${SCAN_RESULT_CAP} projects to add.` };
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(tooMany, 400);
    }
    const targets = typeof body === 'object' && body !== null ? (body as { targets?: unknown }).targets : undefined;
    if (
      !Array.isArray(targets) ||
      targets.length > SCAN_RESULT_CAP ||
      !targets.every((target): target is string => typeof target === 'string')
    ) {
      return c.json(tooMany, 400);
    }
    return c.json(await registry.addMany(targets));
  });
  app.delete('/api/projects/:slug', async (c) => {
    const slug = c.req.param('slug');
    const outcome = await registry.forget(slug);
    if (outcome.ok) return c.json({ forgotten: slug });
    if (outcome.code === 'unknown') return c.json({ error: 'Unknown project' }, 404);
    return c.json({ error: outcome.error }, 500);
  });
  app.post('/api/projects/:slug/open', async (c) => {
    const opened = await registry.open(c.req.param('slug'));
    if (!opened) return c.json({ error: 'Unknown project' }, 404);
    return c.json(opened);
  });
  // The raw prefix handed to mountPrefix is this request's URL up to the slug segment
  // (`/api/projects/<raw slug segment>`), never the decoded parameter, so a link built from it names
  // exactly the segment the client sent.
  const projectApi = createProjectApi(
    (c) => registry.runtime(c.req.param('slug') ?? ''),
    (c) => c.req.path.split('/').slice(0, 4).join('/'),
  );
  app.route('/api/projects/:slug', projectApi);
  app.all('/api/*', (c) => c.json({ error: 'API route not found' }, 404));

  if (production) {
    app.use('/assets/*', serveStatic({ root: staticRoot }));
    app.get('/assets/*', (c) => c.text('Static asset not found', 404));
    app.use('*', serveStatic({ root: staticRoot }));
    app.get('*', serveStatic({ root: staticRoot, path: 'index.html' }));
  }

  return app;
}
