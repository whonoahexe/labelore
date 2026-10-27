import { lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  useLocation,
  useParams,
  useRouteError,
  type RouteObject,
} from 'react-router';
import { LEGACY_FIRST_SEGMENTS, PROJECT_PAGES } from '../presentation/reserved.ts';
import { presentationRoutePatterns } from '../presentation/routes.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { AppShell, fetchPresentation } from './components/app-shell.tsx';
import { trackRouteChunk } from './components/route-chunk-store.ts';
import { Link, ProjectSlugProvider } from './nav.tsx';
import { InvalidProjectScreen } from './pages/invalid-project-screen.tsx';
import { NotFoundPage } from './pages/not-found-page.tsx';
import { decodeAddress, projectGateOutcome, splitProjectPath, withProjectSlug } from './project-path.ts';
import { resolveProjectRoute, resolveUnprefixedRoute } from './route-dispatch.ts';

// Every routed page is lazy()-loaded, and every factory goes through `trackRouteChunk` so the
// shell's top bar can show during navigations as well as on the initial load — a bare Suspense
// fallback cannot, because react-router navigates inside a transition (see route-progress.tsx).
const DashboardPage = lazy(
  trackRouteChunk(() =>
    import('./pages/dashboard-page.tsx').then((m) => ({ default: m.DashboardPage })),
  ),
);
const RoadmapPage = lazy(
  trackRouteChunk(() =>
    import('./pages/roadmap-page.tsx').then((m) => ({ default: m.RoadmapPage })),
  ),
);
const SearchPage = lazy(
  trackRouteChunk(() => import('./pages/search-page.tsx').then((m) => ({ default: m.SearchPage }))),
);
const TraceabilityPage = lazy(
  trackRouteChunk(() =>
    import('./pages/traceability-page.tsx').then((m) => ({ default: m.TraceabilityPage })),
  ),
);
const SketchesPage = lazy(
  trackRouteChunk(() =>
    import('./pages/sketches-page.tsx').then((m) => ({ default: m.SketchesPage })),
  ),
);
const ResearchPage = lazy(
  trackRouteChunk(() =>
    import('./pages/research-page.tsx').then((m) => ({ default: m.ResearchPage })),
  ),
);
const DocumentRoute = lazy(
  trackRouteChunk(() =>
    import('./pages/document-route.tsx').then((m) => ({ default: m.DocumentRoute })),
  ),
);
const PlanPairPage = lazy(
  trackRouteChunk(() =>
    import('./pages/plan-pair-page.tsx').then((m) => ({ default: m.PlanPairPage })),
  ),
);

// The pages that have a fixed address of their own; the dispatcher names one of these.
const PAGES = {
  dashboard: DashboardPage,
  roadmap: RoadmapPage,
  search: SearchPage,
  traceability: TraceabilityPage,
  sketches: SketchesPage,
  research: ResearchPage,
} as const;

/** A redirect's address under the project slug. The old link's #heading rides along unless the target
 * carries a heading of its own; a target's own query (an un-prefixed `/search?q=kiln`) is kept. */
function redirectLocation(slug: string, target: string, hash: string): string {
  const prefixed = withProjectSlug(slug, target);
  return prefixed.includes('#') ? prefixed : `${prefixed}${hash}`;
}

function RouteError():React.JSX.Element {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected route error occurred.';
  return (
    <main className="page-stack">
      <p className="eyebrow">Route error</p>
      <h1>This view could not be opened.</h1>
      <section className="notice destructive" role="alert">
        <h2>Local route failed</h2>
        <p>{message}</p>
        <Link to={presentationRoutePatterns.dashboard}>Return to the dashboard</Link>
      </section>
    </main>
  );
}

/**
 * Everything under `/:project/`. Reads the raw pathname (never the router's splat parameter, which
 * is already decoded), takes the slug off it, and renders whatever `resolveProjectRoute` decides:
 * a page, a redirect (replacing the history entry, so Back skips it) or the one not-found page.
 * It renders only once the presentation payload has resolved, so a link and its page appear
 * together and there is no link-level loading state.
 */
function ProjectRouteSwitch({
  presentation,
}: {
  presentation: ProjectPresentation;
}): React.JSX.Element {
  const location = useLocation();
  const { rest } = splitProjectPath(location.pathname);
  const outcome = resolveProjectRoute(rest, location.search, presentation);
  switch (outcome.kind) {
    case 'page': {
      const Page = PAGES[outcome.page];
      return <Page />;
    }
    case 'overview':
    case 'phase':
      return <RoadmapPage />;
    case 'plan-pair':
      return <PlanPairPage planUrl={outcome.planUrl} active={outcome.active} />;
    case 'document':
      return <DocumentRoute url={outcome.url} />;
    case 'redirect':
      return (
        <Navigate replace to={redirectLocation(presentation.projectSlug, outcome.to, location.hash)} />
      );
    case 'not-found':
      break;
  }
  return (
    <NotFoundPage
      address={decodeAddress(location.pathname)}
      openSlug={presentation.projectSlug}
    />
  );
}

/** `/`: lands on the open project's dashboard once its slug is known, replacing the history entry
 * so Back does not return to a bare `/`. While the payload loads (or fails) the shell shows its
 * own Reading snapshot and notice states. */
function RootRedirect(): React.JSX.Element {
  const presentation = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  if (presentation.data && presentation.data.loadStatus.status !== 'ok') {
    return <InvalidProjectScreen loadStatus={presentation.data.loadStatus} />;
  }
  if (presentation.data) return <Navigate replace to={`/${presentation.data.projectSlug}`} />;
  return <AppShell />;
}

const UNPREFIXED_WORDS: ReadonlySet<string> = new Set([...PROJECT_PAGES, ...LEGACY_FIRST_SEGMENTS]);

/** True for a first segment that names an old top-level page or an old encoded shape, not a project. */
function isUnprefixedLegacyWord(first: string): boolean {
  return UNPREFIXED_WORDS.has(first);
}

/**
 * NAV-11: an old address typed without the project slug. The dispatcher either redirects it, silently and
 * replacing the history entry, to the same address under the open project (the old #heading kept), or it
 * is a miss and the normal not-found page names the old pathname (D-13). Renders nothing of its own.
 */
function UnprefixedLegacy({
  presentation,
}: {
  presentation: ProjectPresentation;
}): React.JSX.Element {
  const location = useLocation();
  const outcome = resolveUnprefixedRoute(location.pathname, location.search, presentation);
  return (
    <ProjectSlugProvider value={presentation.projectSlug}>
      <AppShell>
        {outcome.kind === 'redirect' ? (
          <Navigate replace to={redirectLocation(presentation.projectSlug, outcome.to, location.hash)} />
        ) : (
          <NotFoundPage
            address={decodeAddress(location.pathname)}
            openSlug={presentation.projectSlug}
          />
        )}
      </AppShell>
    </ProjectSlugProvider>
  );
}

/**
 * D-14: gates the entire routed tree on a valid project. Runs the same `['presentation']` query
 * and imported `fetchPresentation` fetcher `AppShell` uses (no second request, no second
 * fetcher) and, on a non-ok `loadStatus`, returns `InvalidProjectScreen` instead of `AppShell` —
 * rendering no `<Outlet />` means no child route ever mounts, so hiding navigation, search, and
 * the tree is structural rather than conditional styling. While the query is pending or on a
 * query error, this falls through to `AppShell` unchanged, preserving its existing
 * "Reading snapshot…" and shell-notice states — no new loading screen is added here.
 */
function ProjectGate(): React.JSX.Element {
  const { project = '' } = useParams();
  const location = useLocation();
  const presentation = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  const outcome = projectGateOutcome(project, presentation.data);
  if (presentation.data && presentation.data.loadStatus.status !== 'ok') {
    return <InvalidProjectScreen loadStatus={presentation.data.loadStatus} />;
  }
  if (presentation.data && outcome === 'wrong-project' && isUnprefixedLegacyWord(project)) {
    // NAV-11: an address from before the slug existed (`/roadmap`, `/search?q=...`, `/artifacts/a~...`).
    return <UnprefixedLegacy presentation={presentation.data} />;
  }
  if (presentation.data && outcome === 'wrong-project') {
    // NAV-09: the first segment is not this project's name. The shell's own links lead into the
    // project that is open, not the name that was typed.
    return (
      <ProjectSlugProvider value={presentation.data.projectSlug}>
        <AppShell>
          <NotFoundPage
            address={decodeAddress(location.pathname)}
            openSlug={presentation.data.projectSlug}
            wrongProject
          />
        </AppShell>
      </ProjectSlugProvider>
    );
  }
  if (presentation.data && outcome === 'open') {
    return (
      <AppShell>
        <ProjectRouteSwitch presentation={presentation.data} />
      </AppShell>
    );
  }
  return <AppShell />;
}

// NAV-10: two entries. `/` finds the open project's slug; `/:project/*` is every address under it, and
// ProjectRouteSwitch decides the page from the raw pathname.
export const appRoutes: RouteObject[] = [
  { path: '/', element: <RootRedirect />, errorElement: <RouteError /> },
  { path: '/:project/*', element: <ProjectGate />, errorElement: <RouteError /> },
];

export const appRouter = createBrowserRouter(appRoutes);
