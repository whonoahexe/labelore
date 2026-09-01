import { createServer as createHttpServer, type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { getRequestListener, serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import { LocalFsPlanningFilesystem } from '../planning-fs/local-fs.ts';
import { PlanningRepository } from '../planning-repo/snapshot.ts';
import { buildDashboardViewModel } from '../presentation/dashboard.ts';
import { buildRoadmapViewModel } from '../presentation/roadmap.ts';
import { buildReferenceRegistry } from '../presentation/references.ts';
import { parsePresentationUrl } from '../presentation/routes.ts';
import { createArtifactRenderer } from '../rendering/markdown.ts';
import { resolveTargetPath } from '../cli/target-path.ts';
import { buildArtifactIndex } from './artifact-index.ts';
import { jsonRecord, toProjectPresentation } from './project-presentation.ts';

const DEFAULT_PORT = 4173;
const HOSTNAME = '127.0.0.1';

interface SnapshotSource {
  getSnapshot(): ProjectSnapshot;
}

interface ServerOptions {
  port?: number;
  production?: boolean;
}

export function createApp(
  source: SnapshotSource,
  production = process.env.NODE_ENV === 'production',
  staticRoot = './dist',
): Hono {
  const app = new Hono();
  const artifactIndex = buildArtifactIndex(source.getSnapshot());
  const renderer = createArtifactRenderer();
  const presentation = toProjectPresentation(source.getSnapshot());
  const referenceRegistry = buildReferenceRegistry(presentation);

  const artifactResponse = async (lookup: ReturnType<typeof artifactIndex.lookup>) => {
    if (!lookup.found) return lookup;
    const document = await (await renderer).render(lookup.artifact, { referenceRegistry });
    return {
      found: true as const,
      status: 'found' as const,
      artifact: {
        id: lookup.artifact.id,
        path: lookup.artifact.path,
        kind: lookup.artifact.kind,
        title: lookup.artifact.title,
        // Same normalization every presentation endpoint applies: a malformed or cyclic YAML
        // anchor must degrade, not 500 this one document.
        frontmatter: jsonRecord(lookup.artifact.frontmatter),
        structured: jsonRecord(lookup.artifact.structured),
        warnings: lookup.artifact.warnings,
      },
      phaseIdentity: lookup.phaseIdentity,
      document,
    };
  };

  app.get('/api/presentation', (c) => c.json(presentation));
  app.get('/api/dashboard', (c) => {
    const presentation = toProjectPresentation(source.getSnapshot());
    return c.json({
      ...buildDashboardViewModel(presentation),
      loadStatus: presentation.loadStatus,
    });
  });
  app.get('/api/roadmap', (c) => {
    const presentation = toProjectPresentation(source.getSnapshot());
    return c.json(buildRoadmapViewModel(presentation));
  });
  app.get('/api/history', (c) => {
    const presentation = toProjectPresentation(source.getSnapshot());
    return c.json({
      readAt: presentation.readAt,
      history: buildRoadmapViewModel(presentation).history,
    });
  });
  app.get('/api/artifacts/*', async (c) => {
    const pathname = new URL(c.req.url).pathname;
    const rawToken = pathname.slice('/api/artifacts/'.length);
    const route = parsePresentationUrl(`/artifacts/${rawToken}`);
    if (!route.ok || route.route.kind !== 'artifact') {
      return c.json(
        {
          found: false,
          status: 'not-found' as const,
          artifactPath: '',
          warning: route.ok ? 'Artifact token is invalid.' : route.error.message,
        },
        404,
      );
    }

    const lookup = artifactIndex.lookup(route.route.artifactPath);
    if (!lookup.found) return c.json(lookup, 404);
    return c.json(await artifactResponse(lookup));
  });
  app.get('/api/documents', async (c) => {
    const routeInput = c.req.query('route') ?? '';
    const route = parsePresentationUrl(routeInput);
    if (!route.ok || (route.route.kind !== 'artifact' && route.route.kind !== 'plan')) {
      return c.json(
        {
          found: false,
          status: 'not-found' as const,
          artifactPath: '',
          warning: route.ok ? 'Route does not identify a document.' : route.error.message,
        },
        404,
      );
    }
    const lookup = artifactIndex.lookupRoute(route.route);
    return lookup.found ? c.json(await artifactResponse(lookup)) : c.json(lookup, 404);
  });
  app.all('/api/*', (c) => c.json({ error: 'API route not found' }, 404));

  if (production) {
    app.use('/assets/*', serveStatic({ root: staticRoot }));
    app.get('/assets/*', (c) => c.text('Static asset not found', 404));
    app.use('*', serveStatic({ root: staticRoot }));
    app.get('*', serveStatic({ root: staticRoot, path: 'index.html' }));
  }

  return app;
}

async function createSnapshotSource(rawPath: string): Promise<SnapshotSource> {
  const resolved = resolveTargetPath(rawPath);
  if (!('rootPath' in resolved)) {
    const snapshot: ProjectSnapshot = {
      loadStatus: resolved,
      readAt: new Date().toISOString(),
      rootPath: resolved.pathChecked,
      project: null,
      warnings: [],
      exclusions: [],
    };
    return { getSnapshot: () => snapshot };
  }

  const planningFilesystem = new LocalFsPlanningFilesystem(resolved.rootPath);
  const repository = new PlanningRepository(planningFilesystem, resolved.rootPath);
  await repository.load();
  return repository;
}

export async function startServer(rawPath: string, options: ServerOptions = {}): Promise<Server> {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const port = options.port ?? DEFAULT_PORT;
  const source = await createSnapshotSource(rawPath);
  const app = createApp(source, production);

  if (production) {
    const server = serve({ fetch: app.fetch, hostname: HOSTNAME, port }) as Server;
    if (server.listening) return server;
    return await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.once('listening', () => {
        server.off('error', reject);
        resolve(server);
      });
    });
  }

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    appType: 'spa',
    server: { middlewareMode: true, hmr: false },
  });
  const apiListener = getRequestListener(app.fetch, { hostname: HOSTNAME });
  const server = createHttpServer((request, response) => {
    if (request.url?.startsWith('/api/')) {
      void apiListener(request, response);
      return;
    }

    vite.middlewares(request, response, (error?: unknown) => {
      response.statusCode = error ? 500 : 404;
      response.end(error instanceof Error ? error.message : 'Not found');
    });
  });
  server.on('close', () => void vite.close());
  return await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, HOSTNAME, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

interface CliOptions {
  rawPath: string;
  port: number;
  smoke: boolean;
}

function parseCli(args: string[]): CliOptions {
  let rawPath = process.cwd();
  let port = DEFAULT_PORT;
  let smoke = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--smoke') {
      smoke = true;
    } else if (arg === '--port') {
      const value = args[index + 1];
      if (!value) throw new Error('--port requires a numeric value');
      port = Number(value);
      index += 1;
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
    } else if (!arg.startsWith('-')) {
      rawPath = arg;
    }
  }

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid port: ${port}`);
  }
  return { rawPath, port: smoke && port === DEFAULT_PORT ? 0 : port, smoke };
}

async function runCli(): Promise<void> {
  const options = parseCli(process.argv.slice(2));
  const server = await startServer(options.rawPath, {
    port: options.port,
    production: process.env.NODE_ENV === 'production',
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : options.port;
  const baseUrl = `http://${HOSTNAME}:${port}`;

  if (options.smoke) {
    try {
      const [dashboard, root] = await Promise.all([
        fetch(`${baseUrl}/api/dashboard`),
        fetch(`${baseUrl}/`),
      ]);
      const payload = (await dashboard.json()) as {
        readAt?: string;
        loadStatus?: ProjectSnapshot['loadStatus'];
      };
      if (!dashboard.ok || !root.ok || !payload.readAt || !payload.loadStatus) {
        throw new Error('Smoke response contract failed');
      }
      console.log(`GSD Lore smoke passed for ${options.rawPath}`);
    } finally {
      server.close();
    }
    return;
  }

  console.log(`GSD Lore is reading ${options.rawPath}`);
  console.log(`Open ${baseUrl}`);
}

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
