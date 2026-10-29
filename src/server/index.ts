import { createServer as createHttpServer, type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createAdaptorServer, getRequestListener } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import { isServerOwnedUrl } from '../presentation/reserved.ts';
import { slugOf } from '../presentation/project-slug.ts';
import { parseRemoteTarget } from '../cli/remote-target.ts';
import type { CommitLog } from './commit-times.ts';
import { createProjectApi } from './project-api.ts';
import { createSnapshotSource } from './project-registry.ts';
import { ProjectRuntime } from './project-runtime.ts';
import type { SnapshotSource } from './project-runtime.ts';
import { createSketchFileMiddleware } from './sketch-files.ts';

const DEFAULT_PORT = 4173;
const HOSTNAME = '127.0.0.1';
/** How many consecutive ports an auto-port start tries before giving up (4173 → 4182). */
const PORT_ATTEMPTS = 10;

/** True for the URLs the Hono app owns (the API and the sketch files). In dev mode everything else
 * goes to Vite; the bare /sketches stays the client page. */
export function routesToApp(url: string | undefined): boolean {
  return isServerOwnedUrl(url);
}

interface ServerOptions {
  port?: number;
  /** When the port is taken, try the next one up instead of failing — for a default port, so a
   * second instance on another project just starts. An explicit `--port` never moves. */
  autoPort?: boolean;
  production?: boolean;
}

/**
 * A guard-free, single-runtime, TEST-ONLY wrapper: one fixed runtime answers the whole project API at
 * /api (the old single-project URLs), so the existing server tests keep running against the very same
 * handlers the registry app serves at /api/projects/:slug. It has no request guard and no project list.
 * startServer still serves it in this plan; 08-06 switches startServer to createRegistryApp and adds the
 * source scan that keeps startServer from ever constructing it again.
 */
export function createApp(
  source: SnapshotSource,
  production = process.env.NODE_ENV === 'production',
  staticRoot = './dist',
  commitLog?: CommitLog,
): Hono {
  const app = new Hono();
  const runtime = new ProjectRuntime(source, slugOf(source.getSnapshot().rootPath), commitLog);

  app.route(
    '/api',
    createProjectApi(
      async () => runtime,
      () => '/api',
    ),
  );
  app.all('/api/*', (c) => c.json({ error: 'API route not found' }, 404));
  // Called as a method on the runtime (never an extracted reference), so `this` survives.
  app.use('/sketches/*', createSketchFileMiddleware(() => runtime.planningFilesystem()));

  if (production) {
    app.use('/assets/*', serveStatic({ root: staticRoot }));
    app.get('/assets/*', (c) => c.text('Static asset not found', 404));
    app.use('*', serveStatic({ root: staticRoot }));
    app.get('*', serveStatic({ root: staticRoot, path: 'index.html' }));
  }

  return app;
}

/** Releases the source's resources at most once, on close, exit, SIGINT and SIGTERM. */
function registerDisposal(source: SnapshotSource, server: Server): void {
  if (!source.dispose) return;
  const dispose = source.dispose.bind(source);
  let disposed = false;
  const disposeOnce = (): void => {
    if (disposed) return;
    disposed = true;
    dispose();
  };
  server.on('close', disposeOnce);
  process.once('exit', disposeOnce);
  process.once('SIGINT', () => {
    disposeOnce();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    disposeOnce();
    process.exit(143);
  });
}

async function listen(server: Server, port: number, autoPort: boolean): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port + attempt, HOSTNAME, () => {
          server.off('error', reject);
          resolve();
        });
      });
      return;
    } catch (error) {
      const inUse = (error as NodeJS.ErrnoException).code === 'EADDRINUSE';
      if (!autoPort || !inUse || port === 0 || attempt + 1 >= PORT_ATTEMPTS) throw error;
    }
  }
}

export async function startServer(rawPath: string, options: ServerOptions = {}): Promise<Server> {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const port = options.port ?? DEFAULT_PORT;
  const source = await createSnapshotSource(rawPath);
  const app = createApp(source, production);

  const autoPort = options.autoPort ?? false;

  if (production) {
    const server = createAdaptorServer({ fetch: app.fetch, hostname: HOSTNAME }) as Server;
    registerDisposal(source, server);
    await listen(server, port, autoPort);
    return server;
  }

  const { createServer: createViteServer } = await import('vite');
  const appListener = getRequestListener(app.fetch, { hostname: HOSTNAME });
  const server = createHttpServer((request, response) => {
    if (routesToApp(request.url)) {
      void appListener(request, response);
      return;
    }

    // Requests only arrive once the server listens, which is after `vite` below is assigned.
    vite.middlewares(request, response, (error?: unknown) => {
      response.statusCode = error ? 500 : 404;
      response.end(error instanceof Error ? error.message : 'Not found');
    });
  });
  // Vite 8 ignores `server.hmr: false` and, in middleware mode, opens its own WebSocket on the fixed port
  // 24678. A second dev server on the machine cannot bind it, so its pages connect to the first server's
  // socket, are refused, and raise an uncaught "WebSocket closed without opened." in the browser. Sharing
  // this server's own HTTP server gives each instance a socket on its own port.
  const vite = await createViteServer({
    appType: 'spa',
    server: { middlewareMode: true, ws: { server } },
  });
  server.on('close', () => void vite.close());
  registerDisposal(source, server);
  await listen(server, port, autoPort);
  return server;
}

interface CliOptions {
  rawPath: string;
  port: number;
  /** True unless `--port` was given. */
  autoPort: boolean;
  smoke: boolean;
}

function parseCli(args: string[]): CliOptions {
  let rawPath = process.cwd();
  let port = DEFAULT_PORT;
  let autoPort = true;
  let smoke = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--smoke') {
      smoke = true;
    } else if (arg === '--port') {
      const value = args[index + 1];
      if (!value) throw new Error('--port requires a numeric value');
      port = Number(value);
      autoPort = false;
      index += 1;
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
      autoPort = false;
    } else if (!arg.startsWith('-')) {
      rawPath = arg;
    }
  }

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid port: ${port}`);
  }
  return { rawPath, port: smoke && port === DEFAULT_PORT ? 0 : port, autoPort, smoke };
}

async function runCli(): Promise<void> {
  const options = parseCli(process.argv.slice(2));
  const production = process.env.NODE_ENV === 'production';
  const server = await startServer(options.rawPath, {
    port: options.port,
    autoPort: options.autoPort,
    production,
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
      console.log(`Labelore smoke passed for ${options.rawPath} (load status: ${payload.loadStatus.status})`);
    } finally {
      server.close();
    }
    return;
  }

  console.log(`Labelore is reading ${options.rawPath}`);
  const remoteParse = parseRemoteTarget(options.rawPath);
  if (remoteParse.kind === 'remote') {
    console.log(
      `Remote target ${remoteParse.target.label}: .planning mirrored read-only over ssh; Refresh pulls it again`,
    );
  }
  // debug/loading-state-regression: the tunnel origin had been running this file with NODE_ENV
  // unset since Sep 15, silently serving the Vite dev middleware. Over a ~150 ms-RTT tunnel that
  // is 55 unbundled module round-trips and ~11.8 s of fully blank page, versus ~0.77 s from
  // `dist/`. Nothing in the output said which mode was active, so the misconfiguration was
  // invisible. It is now the loudest line at startup.
  if (production) {
    console.log('Mode: production — serving the prebuilt ./dist bundle');
  } else {
    console.warn(
      'Mode: DEVELOPMENT — serving unbundled modules through Vite. Expect a slow first paint over any network hop; run `npm start` (NODE_ENV=production) after `npm run build` to serve ./dist instead.',
    );
  }
  if (port !== options.port) console.log(`Port ${options.port} is in use — using ${port} instead`);
  console.log(`Open ${baseUrl}`);
}

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
