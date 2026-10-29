// The read API of ONE project, written once (PLAT-02, PLAT-08). The registry app mounts it at
// /api/projects/:slug, resolving the runtime from the path parameter; the guard-free test wrapper
// createApp mounts the very same factory at /api with a fixed runtime. Either way a handler reaches
// its project only through the runtime its first middleware resolved for THIS request - there is no
// server-wide "active project" for another request to change (D-08).
//
// The handler bodies are the ones createApp used to hold, moved unchanged except that each one now
// captures its runtime's bundle as its first statement (D-05).
import type { Context } from 'hono';
import { Hono } from 'hono';
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
import { parseRoutePath } from '../presentation/routes.ts';
import { buildTraceabilityViewModel } from '../presentation/traceability.ts';
import { buildSearchGroups, extractSnippets } from '../presentation/search.ts';
import { buildResearchViewModel } from '../presentation/project-research.ts';
import { buildSketchesViewModel, SKETCH_MANIFEST_PATH } from '../presentation/sketches.ts';
import { buildDrawerViewModel } from '../presentation/drawer.ts';
import { buildTreeViewModel } from '../presentation/tree.ts';
import { createArtifactRenderer } from '../rendering/markdown.ts';
import { applyCommitTimes } from './commit-times.ts';
import { createFileBytesHandler } from './file-bytes.ts';
import { jsonRecord } from './project-presentation.ts';
import type { DerivedViews, ProjectRuntime } from './project-runtime.ts';
import { searchIndex } from './search-index.ts';

export type ProjectApiEnv = {
  Variables: {
    /** The runtime this request resolved to; set by the first middleware, read by every handler. */
    runtime: ProjectRuntime;
    /** The raw URL prefix this API is mounted under for this request (`/api/projects/<raw slug>`, or
     * `/api` in the test wrapper). Never the decoded path parameter. */
    mountPrefix: string;
  };
};

/**
 * `resolve` answers the runtime for a request, or null for a project that does not exist (404). The
 * runtime's in-flight count is held for the whole request so the registry never evicts a runtime
 * that is being read (Pitfall 9).
 */
export function createProjectApi(
  resolve: (c: Context) => Promise<ProjectRuntime | null>,
  mountPrefix: (c: Context) => string,
): Hono<ProjectApiEnv> {
  const api = new Hono<ProjectApiEnv>();
  const renderer = createArtifactRenderer();

  api.use('*', async (c, next) => {
    const runtime = await resolve(c);
    if (!runtime) return c.json({ error: 'Unknown project' }, 404);
    c.set('runtime', runtime);
    c.set('mountPrefix', mountPrefix(c));
    runtime.inFlightRequests += 1;
    try {
      await next();
    } finally {
      runtime.inFlightRequests -= 1;
    }
  });

  const artifactResponse = async (
    lookup: ReturnType<DerivedViews['artifactIndex']['lookup']>,
    activeDerived: DerivedViews,
    runtime: ProjectRuntime,
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
        addedAt: await runtime.fileDates.addedAt(lookup.artifact.path),
      },
      phaseIdentity: lookup.phaseIdentity,
      document,
      todoContext,
      noteContext,
      manualChecks,
      reviewContext,
    };
  };

  api.get('/presentation', (c) => {
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    return c.json(activeDerived.presentation);
  });
  api.get('/dashboard', async (c) => {
    const runtime = c.get('runtime');
    // Bound before the await, so a refresh that completes meanwhile cannot mix two bundles.
    const activeDerived = runtime.derived;
    const { presentation } = activeDerived;
    const log = await runtime.commits.load();
    const { pace } = presentation.ledger;
    const timed = { ...pace, plans: applyCommitTimes(pace.plans, log) };
    return c.json({
      ...buildDashboardViewModel({ ...presentation, ledger: { ...presentation.ledger, pace: timed } }),
      loadStatus: presentation.loadStatus,
    });
  });
  api.get('/roadmap', (c) => {
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    return c.json(buildRoadmapViewModel(activeDerived.presentation));
  });
  api.get('/history', (c) => {
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    return c.json({
      readAt: activeDerived.presentation.readAt,
      history: buildRoadmapViewModel(activeDerived.presentation).history,
    });
  });
  api.get('/tree', (c) => {
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    return c.json(buildTreeViewModel(activeDerived.presentation));
  });
  api.get('/drawer', (c) => {
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    return c.json(buildDrawerViewModel(activeDerived.presentation));
  });
  api.get('/traceability', (c) => {
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    return c.json(buildTraceabilityViewModel(activeDerived.presentation));
  });
  api.get('/search', (c) => {
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    const query = c.req.query('q') ?? '';
    const state = activeDerived.searchIndexState.state();
    // Answers HTTP 200 in every readiness state — never a 5xx, never a hang, and this handler
    // never blocks /dashboard or any other route while the index is still building (FIND-05).
    if (state.status !== 'ready') {
      return c.json({ status: state.status, query, total: 0, fileCount: 0, results: [], groups: [] });
    }
    const results = searchIndex(state, query);
    const groups = buildSearchGroups(results, activeDerived.presentation);
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
  api.get('/documents', async (c) => {
    // D-05: capture the bundle as the first statement after the runtime, before URL parsing and before
    // the lookup, so this request's whole response is built from exactly one bundle (its table, its
    // index, its registry) - never the runtime's `derived` re-read after an await, which a
    // concurrently completing refresh could swap.
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    const routeInput = c.req.query('route') ?? '';
    const route = parseRoutePath(routeInput);
    if (
      !route.ok ||
      (route.route.kind !== 'document' && route.route.kind !== 'plan' && route.route.kind !== 'page')
    ) {
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
    return lookup.found ? c.json(await artifactResponse(lookup, activeDerived, runtime)) : c.json(lookup, 404);
  });
  api.post('/refresh', async (c) => {
    const runtime = c.get('runtime');
    // T-04-01-01/02: same-origin gate before touching the filesystem. An absent header (curl, the
    // smoke probe, and every test in this suite) passes - only a present, non-same-origin value is
    // rejected. 08-03 adds the shared guard in front of the registry app and 08-06 deletes this
    // in-handler check once startServer serves only the guarded app.
    const fetchSite = c.req.header('sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin') {
      return c.json({ refreshed: false, reason: 'cross-site' as const }, 403);
    }

    const outcome = await runtime.refresh();
    switch (outcome.kind) {
      case 'unsupported':
        return c.json({ refreshed: false, readAt: outcome.readAt, loadStatus: outcome.loadStatus });
      case 'refreshed':
        return c.json({ refreshed: true as const, readAt: outcome.readAt, loadStatus: outcome.loadStatus });
      case 'failed':
        return c.json({ refreshed: false as const, error: outcome.error }, 500);
    }
  });
  api.get('/research', (c) => {
    const runtime = c.get('runtime');
    const activeDerived = runtime.derived;
    return c.json(buildResearchViewModel(activeDerived.presentation));
  });
  api.get('/sketches', (c) => {
    const runtime = c.get('runtime');
    // D-05: one bundle for the whole response (the manifest body and the artifact list must agree).
    const activeDerived = runtime.derived;
    const lookup = activeDerived.artifactIndex.lookup(SKETCH_MANIFEST_PATH);
    return c.json(
      buildSketchesViewModel({
        manifestBody: lookup.found ? lookup.artifact.body : null,
        artifacts: activeDerived.presentation.artifacts,
      }),
    );
  });
  // D-08: the images-only bytes route; the bundle is captured inside the handler, and the filesystem is
  // called as a method on the runtime (never an extracted reference), so `this` survives.
  api.all('/files', (c, next) => {
    const runtime = c.get('runtime');
    return createFileBytesHandler(
      () => runtime.derived,
      () => runtime.planningFilesystem(),
    )(c, next);
  });

  return api;
}
