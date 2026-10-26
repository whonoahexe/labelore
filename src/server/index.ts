import { createServer as createHttpServer, type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createAdaptorServer, getRequestListener } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { FailedLoadStatus, ProjectSnapshot } from '../planning-repo/types.ts';
import { LocalFsPlanningFilesystem } from '../planning-fs/local-fs.ts';
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import { PlanningRepository } from '../planning-repo/snapshot.ts';
import { buildDashboardViewModel } from '../presentation/dashboard.ts';
import { buildPlanManualChecks } from '../presentation/manual-checks.ts';
import type { PlanManualChecks } from '../presentation/manual-checks.ts';
import { buildReviewContext } from '../presentation/review-context.ts';
import type { ReviewContext } from '../presentation/review-context.ts';
import { buildTodoContext } from '../presentation/todo-context.ts';
import type { TodoContext } from '../presentation/todo-context.ts';
import { buildNoteContext } from '../presentation/note-context.ts';
import type { NoteContext } from '../presentation/note-context.ts';
import { buildRoadmapViewModel } from '../presentation/roadmap.ts';
import { buildReferenceRegistry } from '../presentation/references.ts';
import { parsePresentationUrl } from '../presentation/routes.ts';
import { isServerOwnedUrl } from '../presentation/reserved.ts';
import { buildTraceabilityViewModel } from '../presentation/traceability.ts';
import { buildSearchGroups, extractSnippets } from '../presentation/search.ts';
import { buildResearchViewModel } from '../presentation/project-research.ts';
import { buildSketchesViewModel, SKETCH_MANIFEST_PATH } from '../presentation/sketches.ts';
import { buildDrawerViewModel } from '../presentation/drawer.ts';
import { buildTreeViewModel } from '../presentation/tree.ts';
import { createArtifactRenderer } from '../rendering/markdown.ts';
import { resolveTargetPath } from '../cli/target-path.ts';
import { parseRemoteTarget } from '../cli/remote-target.ts';
import { RemoteSnapshotSource } from './remote-source.ts';
import { buildArtifactIndex } from './artifact-index.ts';
import { applyCommitTimes, createCommitLog, type CommitLog } from './commit-times.ts';
import { createFileDates } from './file-dates.ts';
import { jsonRecord, toProjectPresentation } from './project-presentation.ts';
import { createSearchIndexState, searchIndex } from './search-index.ts';
import { createSketchFileMiddleware } from './sketch-files.ts';

const DEFAULT_PORT = 4173;
const HOSTNAME = '127.0.0.1';
/** How many consecutive ports an auto-port start tries before giving up (4173 → 4182). */
const PORT_ATTEMPTS = 10;

interface SnapshotSource {
  getSnapshot(): ProjectSnapshot;
  /** Optional: a source with nothing to refresh into (the failed-initial-load literal below)
   * simply omits this member. TGT-08 empty edge: POST /api/refresh against such a source is not
   * an error - it answers 200 with `refreshed: false`. */
  refresh?(): Promise<ProjectSnapshot>;
  /** Optional: a source that owns resources (the remote ssh mirror's temp directory) releases them
   * here. startServer calls it at most once, on server close, process exit, SIGINT and SIGTERM. */
  dispose?(): void;
  /** Optional: the live filesystem behind the snapshot, for the read-only /sketches/* route. Sources
   * without one (the failed-load literal, test doubles) answer 404 on /sketches/*. */
  planningFilesystem?(): PlanningFilesystem | null;
}

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
  commitLog?: CommitLog,
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
  const fileDates = createFileDates(derived.presentation.rootPath);
  // quick-261018-hbd: Pace times plans from the target's commits; read once, reset on refresh.
  const commits = commitLog ?? createCommitLog(derived.presentation.rootPath);
  let inFlight: Promise<ProjectSnapshot> | null = null;

  const artifactResponse = async (
    lookup: ReturnType<DerivedViews['artifactIndex']['lookup']>,
    activeDerived: DerivedViews,
  ) => {
    if (!lookup.found) return lookup;
    // quick-261016-ujo: a PLAN's What to check model, built from this request's own bundle (null elsewhere).
    const manualChecks = ((): PlanManualChecks | null => {
      try {
        return lookup.artifact.kind === 'plan'
          ? buildPlanManualChecks(activeDerived.presentation, activeDerived.referenceRegistry, lookup.artifact.path)
          : null;
      } catch {
        return null;
      }
    })();
    // quick-261017-k44: a REVIEW's phase name and sibling REVIEW-FIX, from this request's own bundle (null elsewhere).
    const reviewContext = ((): ReviewContext | null => {
      try {
        return lookup.artifact.kind === 'review'
          ? buildReviewContext(activeDerived.presentation, activeDerived.referenceRegistry, lookup.artifact.path)
          : null;
      } catch {
        return null;
      }
    })();
    // quick-261023-61k: a todo's source notes (url, date, title, text) and its closing quick task link, from
    // this request's own bundle (null elsewhere). Note bodies come from the artifact index, not the disk.
    const todoContext = ((): TodoContext | null => {
      try {
        const bodyOf = (path: string): string | null => {
          const found = activeDerived.artifactIndex.lookup(path);
          return found.found ? found.artifact.body : null;
        };
        return lookup.artifact.kind === 'todo'
          ? buildTodoContext(activeDerived.presentation, activeDerived.referenceRegistry, bodyOf, lookup.artifact.path)
          : null;
      } catch {
        return null;
      }
    })();
    // quick-261023-61l: the todos a note became or is related to (status, weight, area, resolution, URL and
    // the notes batched into the same todo), from this request's own bundle (null elsewhere).
    const noteContext = ((): NoteContext | null => {
      try {
        const bodyOf = (path: string): string | null => {
          const found = activeDerived.artifactIndex.lookup(path);
          return found.found ? found.artifact.body : null;
        };
        return lookup.artifact.kind === 'note'
          ? buildNoteContext(activeDerived.presentation, activeDerived.referenceRegistry, bodyOf, lookup.artifact.path)
          : null;
      } catch {
        return null;
      }
    })();
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
        // quick-261006-iz6: the PLAN page's Planned date (git add-date, cached; null on any failure).
        mtimeMs: lookup.artifact.mtimeMs,
        addedAt: await fileDates.addedAt(lookup.artifact.path),
      },
      phaseIdentity: lookup.phaseIdentity,
      document,
      todoContext,
      noteContext,
      manualChecks,
      reviewContext,
    };
  };

  app.get('/api/presentation', (c) => c.json(derived.presentation));
  app.get('/api/dashboard', async (c) => {
    // Bound before the await, so a refresh that completes meanwhile cannot mix two bundles.
    const { presentation } = derived;
    const log = await commits.load();
    const { pace } = presentation.ledger;
    const timed = { ...pace, plans: applyCommitTimes(pace.plans, log) };
    return c.json({
      ...buildDashboardViewModel({ ...presentation, ledger: { ...presentation.ledger, pace: timed } }),
      loadStatus: presentation.loadStatus,
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
  app.get('/api/drawer', (c) => {
    return c.json(buildDrawerViewModel(derived.presentation));
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
      commits.reset();
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
  app.get('/api/research', (c) => {
    return c.json(buildResearchViewModel(derived.presentation));
  });
  app.get('/api/sketches', (c) => {
    // D-05: one bundle for the whole response (the manifest body and the artifact list must agree).
    const activeDerived = derived;
    const lookup = activeDerived.artifactIndex.lookup(SKETCH_MANIFEST_PATH);
    return c.json(
      buildSketchesViewModel({
        manifestBody: lookup.found ? lookup.artifact.body : null,
        artifacts: activeDerived.presentation.artifacts,
      }),
    );
  });
  app.all('/api/*', (c) => c.json({ error: 'API route not found' }, 404));
  // Called as a method on `source` (never an extracted reference), so `this` survives.
  app.use('/sketches/*', createSketchFileMiddleware(() => source.planningFilesystem?.() ?? null));

  if (production) {
    app.use('/assets/*', serveStatic({ root: staticRoot }));
    app.get('/assets/*', (c) => c.text('Static asset not found', 404));
    app.use('*', serveStatic({ root: staticRoot }));
    app.get('*', serveStatic({ root: staticRoot, path: 'index.html' }));
  }

  return app;
}

function failedSource(status: FailedLoadStatus): SnapshotSource {
  const snapshot: ProjectSnapshot = {
    loadStatus: status,
    readAt: new Date().toISOString(),
    rootPath: status.pathChecked,
    project: null,
    warnings: [],
    exclusions: [],
  };
  return { getSnapshot: () => snapshot };
}

async function createSnapshotSource(rawPath: string): Promise<SnapshotSource> {
  const remote = parseRemoteTarget(rawPath);
  if (remote.kind === 'invalid') return failedSource(remote.status);
  if (remote.kind === 'remote') {
    const source = new RemoteSnapshotSource(remote.target);
    await source.load();
    return source;
  }

  const resolved = resolveTargetPath(rawPath);
  if (!('rootPath' in resolved)) return failedSource(resolved);

  const planningFilesystem = new LocalFsPlanningFilesystem(resolved.rootPath);
  const repository = new PlanningRepository(planningFilesystem, resolved.rootPath);
  await repository.load();
  return repository;
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
  const vite = await createViteServer({
    appType: 'spa',
    server: { middlewareMode: true, hmr: false },
  });
  const appListener = getRequestListener(app.fetch, { hostname: HOSTNAME });
  const server = createHttpServer((request, response) => {
    if (routesToApp(request.url)) {
      void appListener(request, response);
      return;
    }

    vite.middlewares(request, response, (error?: unknown) => {
      response.statusCode = error ? 500 : 404;
      response.end(error instanceof Error ? error.message : 'Not found');
    });
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
