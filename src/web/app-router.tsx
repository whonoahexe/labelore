import { lazy, Suspense } from 'react';
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
import { fetchPresentation, fetchProjects } from './api.ts';
import { PlainPage } from './components/plain-header.tsx';
import { RouteFallback, RouteProgress } from './components/route-progress.tsx';
import { trackRouteChunk } from './components/route-chunk-store.ts';
import { Link } from './nav.tsx';
import { InvalidProjectScreen } from './pages/invalid-project-screen.tsx';
import { NotFoundPage } from './pages/not-found-page.tsx';
import { ProjectLayout } from './pages/project-layout.tsx';
import { decodeAddress, splitProjectPath, withProjectSlug } from './project-path.ts';
import { projectKey, projectsKey } from './query-keys.ts';
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
const ProjectsPage = lazy(
  trackRouteChunk(() =>
    import('./pages/projects-page.tsx').then((m) => ({ default: m.ProjectsPage })),
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

/** `/`: the projects landing page, for any number of projects and never a redirect (D-01). It has no
 * shell around it, so it brings the route progress bar and the Suspense boundary its lazy chunk needs. */
function ProjectsRoute(): React.JSX.Element {
  return (
    <>
      <RouteProgress />
      <Suspense fallback={<RouteFallback />}>
        <ProjectsPage />
      </Suspense>
    </>
  );
}

const UNPREFIXED_WORDS: ReadonlySet<string> = new Set([...PROJECT_PAGES, ...LEGACY_FIRST_SEGMENTS]);

/** True for a first segment that names an old top-level page or an old encoded shape, not a project. */
function isUnprefixedLegacyWord(first: string): boolean {
  return UNPREFIXED_WORDS.has(first);
}

/**
 * NAV-11: an old address typed without the project slug. The dispatcher either redirects it, silently and
 * replacing the history entry, to the same address under the most recently opened project (the old #heading
 * kept), or it is a miss and the normal not-found page names the old pathname (D-13). A miss renders under
 * the plain header with no shell: a shell's links come from the URL's first segment (D-08), and here that
 * segment is the legacy word, so they would lead nowhere. The way back leads to the opened project.
 */
function UnprefixedLegacy({ presentation }: { presentation: ProjectPresentation }): React.JSX.Element {
  const location = useLocation();
  const outcome = resolveUnprefixedRoute(location.pathname, location.search, presentation);
  return outcome.kind === 'redirect' ? (
    <Navigate replace to={redirectLocation(presentation.projectSlug, outcome.to, location.hash)} />
  ) : (
    <PlainPage>
      <NotFoundPage address={decodeAddress(location.pathname)} openSlug={presentation.projectSlug} />
    </PlainPage>
  );
}

/**
 * An old address typed without a slug resolves against the most recently opened project: the first row
 * of the list (the server orders it last opened first). With no projects there is nothing to resolve
 * against, so it goes to the landing page. Reversible: this is the one branch that knows the rule.
 */
function LegacyRoute(): React.JSX.Element {
  const list = useQuery({ queryKey: projectsKey, queryFn: fetchProjects, staleTime: 0 });
  const first = list.data?.projects[0];
  const presentation = useQuery({
    queryKey: projectKey(first?.slug ?? '', 'presentation'),
    queryFn: () => fetchPresentation(first?.slug ?? ''),
    enabled: first !== undefined,
  });
  if (list.isError || (list.data && first === undefined)) return <Navigate replace to="/" />;
  if (first === undefined) return <RouteFallback />;
  const loaded = presentation.data;
  if (loaded && loaded.loadStatus.status !== 'ok') {
    return <InvalidProjectScreen loadStatus={loaded.loadStatus} />;
  }
  if (loaded) return <UnprefixedLegacy presentation={loaded} />;
  // Shell-less while the project's data is on its way, for the same reason as the miss above.
  return (
    <PlainPage>
      <RouteFallback />
    </PlainPage>
  );
}

/** `/:project/*`: an old un-prefixed address, or a project by its slug (D-06, D-07). */
function ProjectRoute(): React.JSX.Element {
  const { project = '' } = useParams();
  // Every such word is a reserved slug, so no listed project can carry it.
  if (isUnprefixedLegacyWord(project)) return <LegacyRoute />;
  return (
    <ProjectLayout>{(presentation) => <ProjectRouteSwitch presentation={presentation} />}</ProjectLayout>
  );
}

// NAV-10: two entries. `/` is the projects landing page; `/:project/*` is every address under a project,
// and ProjectRouteSwitch decides the page from the raw pathname.
export const appRoutes: RouteObject[] = [
  { path: '/', element: <ProjectsRoute />, errorElement: <RouteError /> },
  { path: '/:project/*', element: <ProjectRoute />, errorElement: <RouteError /> },
];

export const appRouter = createBrowserRouter(appRoutes);
