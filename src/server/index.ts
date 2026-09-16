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
import { buildTraceabilityViewModel } from '../presentation/traceability.ts';
import { buildSearchGroups, extractSnippets } from '../presentation/search.ts';
import { buildTreeViewModel } from '../presentation/tree.ts';
import { createArtifactRenderer } from '../rendering/markdown.ts';
import { resolveTargetPath } from '../cli/target-path.ts';
import { buildArtifactIndex } from './artifact-index.ts';
import { jsonRecord, toProjectPresentation } from './project-presentation.ts';
import { createSearchIndexState, searchIndex } from './search-index.ts';

const DEFAULT_PORT = 4173;
const HOSTNAME = '127.0.0.1';

interface SnapshotSource {
  getSnapshot(): ProjectSnapshot;
  /** Optional: a source with nothing to refresh into (the failed-initial-load literal below)
   * simply omits this member. TGT-08 empty edge: POST /api/refresh against such a source is not
   * an error - it answers 200 with `refreshed: false`. */
  refresh?(): Promise<ProjectSnapshot>;
}

interface ServerOptions {
  port?: number;
  production?: boolean;
}

/** D-05: every read handler serves from one of these bundles, built together from a single
 * snapshot, and replaced together in one assignment - never mutated field by field. */
interface DerivedViews {
  presentation: ReturnType<typeof toProjectPresentation>;
  artifactIndex: ReturnType<typeof buildArtifactIndex>;
  referenceRegistry: ReturnType<typeof buildReferenceRegistry>;
  searchIndexState: ReturnType<typeof createSearchIndexState>;
}

export function createApp(
  source: SnapshotSource,
  production = process.env.NODE_ENV === 'production',
  staticRoot = './dist',
): Hono {
  const app = new Hono();
  const renderer = createArtifactRenderer();

  // D-05/WR-03: builds all four derived views from one snapshot. `snapshot` defaults to the
  // source's current snapshot for the startup call; the post-refresh call site (CR-01) passes the
  // already-resolved snapshot explicitly, since it already has it in hand and re-reading
  // `source.getSnapshot()` a second time would be a redundant read of the same value. This
  // function remains the file's only presentation-building call site, whichever way `snapshot`
  // was obtained.
  function buildDerivedViews(snapshot: ProjectSnapshot = source.getSnapshot()): DerivedViews {
    const presentation = toProjectPresentation(snapshot);
    const artifactIndex = buildArtifactIndex(snapshot);
    const referenceRegistry = buildReferenceRegistry(presentation);
    // D-04/FIND-05: constructing the state object is synchronous and cheap (just a status flag);
    // the actual MiniSearch build is scheduled off this path inside buildFrom - callers never wait
    // on index readiness.
    const searchIndexState = createSearchIndexState();
    searchIndexState.buildFrom(snapshot);
    return { presentation, artifactIndex, referenceRegistry, searchIndexState };
  }

  // Replacing `derived` with a freshly built bundle in one assignment is the atomic swap D-05
  // requires - never mutate the existing bundle field by field.
  let derived = buildDerivedViews();
  let inFlight: Promise<ProjectSnapshot> | null = null;

  const artifactResponse = async (
    lookup: ReturnType<DerivedViews['artifactIndex']['lookup']>,
    activeDerived: DerivedViews,
  ) => {
    if (!lookup.found) return lookup;
    const document = await (
      await renderer
    ).render(lookup.artifact, { referenceRegistry: activeDerived.referenceRegistry });
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
        // D-12/TGT-06: forwarded unchanged so the client can compute the same
        // artifactWarningTone() the tree and search rows already show for this artifact.
        bodyLength: lookup.artifact.bodyLength,
      },
      phaseIdentity: lookup.phaseIdentity,
      document,
    };
  };

  app.get('/api/presentation', (c) => c.json(derived.presentation));
  app.get('/api/dashboard', (c) => {
    return c.json({
      ...buildDashboardViewModel(derived.presentation),
      loadStatus: derived.presentation.loadStatus,
    });
  });
  app.get('/api/roadmap', (c) => {
    return c.json(buildRoadmapViewModel(derived.presentation));
  });
  app.get('/api/history', (c) => {
    return c.json({
      readAt: derived.presentation.readAt,
      history: buildRoadmapViewModel(derived.presentation).history,
    });
  });
  app.get('/api/tree', (c) => {
    return c.json(buildTreeViewModel(derived.presentation));
  });
  app.get('/api/traceability', (c) => {
    return c.json(buildTraceabilityViewModel(derived.presentation));
  });
  app.get('/api/search', (c) => {
    const query = c.req.query('q') ?? '';
    const state = derived.searchIndexState.state();
    // Answers HTTP 200 in every readiness state — never a 5xx, never a hang, and this handler
    // never blocks /api/dashboard or any other route while the index is still building (FIND-05).
    if (state.status !== 'ready') {
      return c.json({ status: state.status, query, total: 0, fileCount: 0, results: [], groups: [] });
    }
    const results = searchIndex(state, query);
    const groups = buildSearchGroups(results, derived.presentation);
    // D-08: snippets are extracted from the artifact's raw indexed body — never rendered HTML,
    // never a second call through the artifact renderer — using each hit's own matched terms.
    for (const group of groups) {
      for (const row of group.rows) {
        const document = state.documents.get(row.path);
        const extracted = document ? extractSnippets(document.body, row.matchedTerms) : null;
        row.snippets = extracted?.snippets ?? [];
        row.matchCount = extracted?.matchCount ?? 0;
      }
    }
    const fileCount = new Set(results.map((hit) => hit.path)).size;
    return c.json({
      status: 'ready' as const,
      query,
      total: results.length,
      fileCount,
      results,
      groups,
    });
  });
  app.get('/api/artifacts/*', async (c) => {
    // D-05: capture the bundle as the first statement, before URL parsing and before the lookup,
    // so this request's whole response is built from exactly one bundle — never the module-level
    // `derived` binding re-read after an await, which a concurrently completing refresh could swap.
    const activeDerived = derived;
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

    const lookup = activeDerived.artifactIndex.lookup(route.route.artifactPath);
    if (!lookup.found) return c.json(lookup, 404);
    return c.json(await artifactResponse(lookup, activeDerived));
  });
  app.get('/api/documents', async (c) => {
    // D-05: same single-bundle capture as /api/artifacts/* above.
    const activeDerived = derived;
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
    const lookup = activeDerived.artifactIndex.lookupRoute(route.route);
    return lookup.found ? c.json(await artifactResponse(lookup, activeDerived)) : c.json(lookup, 404);
  });
  app.post('/api/refresh', async (c) => {
    // T-04-01-01/02: same-origin gate before touching the filesystem. An absent header (curl, the
    // smoke probe, and every test in this suite) passes - only a present, non-same-origin value is
    // rejected.
    const fetchSite = c.req.header('sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin') {
      return c.json({ refreshed: false, reason: 'cross-site' as const }, 403);
    }

    if (!source.refresh) {
      // TGT-08 empty edge: a source with nothing to refresh into is not an error.
      return c.json({
        refreshed: false,
        readAt: derived.presentation.readAt,
        loadStatus: derived.presentation.loadStatus,
      });
    }
    // Bound once, outside the coalescing branch - `source.refresh` is a method on `source` (e.g.
    // `PlanningRepository.prototype.refresh`, which reads `this.fs`/`this.rootPath`), so calling
    // an unbound reference to it would silently drop `this` and throw.
    const refresh = source.refresh.bind(source);

    try {
      // T-04-01-01: coalesce concurrent refreshes into one in-flight filesystem walk - N
      // simultaneous callers await the same promise rather than each starting their own rebuild.
      if (!inFlight) {
        inFlight = refresh().finally(() => {
          inFlight = null;
        });
      }
      const snapshot = await inFlight;
      // CR-01/D-04: a resolved refresh whose loadStatus is not ok is a reachable failure -
      // PlanningRepository.refresh() never throws (D-12), it resolves normally with
      // project: null. Answer a failure status and leave `derived` untouched so no served
      // response is ever built from the failed snapshot; the previously retained bundle keeps
      // serving every subsequent GET.
      if (snapshot.loadStatus.status !== 'ok') {
        return c.json(
          { refreshed: false as const, error: snapshot.loadStatus.message },
          500,
        );
      }
      // D-05: the atomic swap - every field the derived bundle carries replaces together in one
      // assignment, never mutated piecemeal. Only reached on an ok load status. `snapshot` is
      // passed explicitly (WR-03) - it is already the resolved post-refresh value, so re-reading
      // `source.getSnapshot()` here would be a redundant second read of the same snapshot.
      derived = buildDerivedViews(snapshot);
      return c.json({
        refreshed: true as const,
        readAt: snapshot.readAt,
        loadStatus: snapshot.loadStatus,
      });
    } catch {
      // PlanningRepository.refresh() documents that it never throws; this catch is purely a
      // defensive boundary. `derived` is left untouched - D-04 retains the previous snapshot.
      return c.json({ refreshed: false as const, error: 'Refresh failed' }, 500);
    }
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
  const production = process.env.NODE_ENV === 'production';
  const server = await startServer(options.rawPath, {
    port: options.port,
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
      console.log(`Labelore smoke passed for ${options.rawPath}`);
    } finally {
      server.close();
    }
    return;
  }

  console.log(`Labelore is reading ${options.rawPath}`);
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
  console.log(`Open ${baseUrl}`);
}

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
