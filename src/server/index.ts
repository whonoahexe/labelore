import { createServer as createHttpServer, type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { getRequestListener, serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import { LocalFsPlanningFilesystem } from '../planning-fs/local-fs.ts';
import { PlanningRepository } from '../planning-repo/snapshot.ts';
import { resolveTargetPath } from '../cli/target-path.ts';

const DEFAULT_PORT = 4173;
const HOSTNAME = '127.0.0.1';

interface SnapshotSource {
  getSnapshot(): ProjectSnapshot;
}

interface ServerOptions {
  port?: number;
  production?: boolean;
}

interface DashboardProgress {
  totalPhases: number | null;
  completedPhases: number | null;
  totalPlans: number | null;
  completedPlans: number | null;
  percent: number | null;
}

interface DashboardResponse {
  readAt: string;
  loadStatus: ProjectSnapshot['loadStatus'];
  projectName: string | null;
  current: {
    milestone: string | null;
    phaseNumber: string | null;
    phaseName: string | null;
    status: string | null;
    progress: DashboardProgress;
  } | null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function dashboardResponse(snapshot: ProjectSnapshot): DashboardResponse {
  if (snapshot.loadStatus.status !== 'ok' || !snapshot.project) {
    return {
      readAt: snapshot.readAt,
      loadStatus: snapshot.loadStatus,
      projectName: null,
      current: null,
    };
  }

  const state = Object.values(snapshot.project.artifacts).find(
    (artifact) => artifact.kind === 'state' && artifact.path.endsWith('/STATE.md'),
  );
  const frontmatter = state?.frontmatter ?? {};
  const progressValue = frontmatter.progress;
  const progress =
    progressValue && typeof progressValue === 'object' && !Array.isArray(progressValue)
      ? (progressValue as Record<string, unknown>)
      : {};

  return {
    readAt: snapshot.readAt,
    loadStatus: snapshot.loadStatus,
    projectName: snapshot.project.name,
    current: {
      milestone: asString(frontmatter.milestone),
      phaseNumber: asString(frontmatter.current_phase),
      phaseName: asString(frontmatter.current_phase_name),
      status: asString(frontmatter.status),
      progress: {
        totalPhases: asNumber(progress.total_phases),
        completedPhases: asNumber(progress.completed_phases),
        totalPlans: asNumber(progress.total_plans),
        completedPlans: asNumber(progress.completed_plans),
        percent: asNumber(progress.percent),
      },
    },
  };
}

export function createApp(
  source: SnapshotSource,
  production = process.env.NODE_ENV === 'production',
  staticRoot = './dist',
): Hono {
  const app = new Hono();

  app.get('/api/dashboard', (c) => c.json(dashboardResponse(source.getSnapshot())));
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
    return serve({ fetch: app.fetch, hostname: HOSTNAME, port }) as Server;
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
      const payload = (await dashboard.json()) as DashboardResponse;
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
