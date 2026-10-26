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
import { presentationRoutePatterns } from '../presentation/routes.ts';
import { AppShell, fetchPresentation } from './components/app-shell.tsx';
import { trackRouteChunk } from './components/route-chunk-store.ts';
import { Link, ProjectSlugProvider } from './nav.tsx';
import { InvalidProjectScreen } from './pages/invalid-project-screen.tsx';
import { NotFoundPage } from './pages/not-found-page.tsx';
import { decodeAddress, projectGateOutcome } from './project-path.ts';

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
const ArtifactPage = lazy(
  trackRouteChunk(() =>
    import('./pages/artifact-page.tsx').then((m) => ({ default: m.ArtifactPage })),
  ),
);
const PlanPairPage = lazy(
  trackRouteChunk(() =>
    import('./pages/plan-pair-page.tsx').then((m) => ({ default: m.PlanPairPage })),
  ),
);

function RouteError(): React.JSX.Element {
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

/** The `*` child of the project route: an address under the open project that no page matches.
 * Renders only once the presentation payload has resolved, so the page never flashes ahead of the
 * shell's own Reading snapshot state; when the request fails the shell's notice shows instead. */
function NotFoundRoute(): React.JSX.Element | null {
  const presentation = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  const location = useLocation();
  if (!presentation.data) return null;
  return (
    <NotFoundPage
      address={decodeAddress(location.pathname)}
      openSlug={presentation.data.projectSlug}
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
  return <AppShell />;
}

// Children are today's page patterns made relative to `/:project`, so every page still opens under
// the slug. 07-06 and 07-07 replace the encoded patterns with the readable grammar.
const relative = (pattern: string): string => pattern.replace(/^\//, '');

export const appRoutes: RouteObject[] = [
  { path: '/', element: <RootRedirect />, errorElement: <RouteError /> },
  {
    path: '/:project',
    element: <ProjectGate />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: relative(presentationRoutePatterns.roadmap), element: <RoadmapPage /> },
      { path: relative(presentationRoutePatterns.search), element: <SearchPage /> },
      { path: relative(presentationRoutePatterns.traceability), element: <TraceabilityPage /> },
      { path: relative(presentationRoutePatterns.sketches), element: <SketchesPage /> },
      { path: relative(presentationRoutePatterns.research), element: <ResearchPage /> },
      { path: relative(presentationRoutePatterns.milestone), element: <RoadmapPage /> },
      { path: relative(presentationRoutePatterns.phase), element: <RoadmapPage /> },
      { path: relative(presentationRoutePatterns.plan), element: <PlanPairPage /> },
      { path: relative(presentationRoutePatterns.phaseArtifact), element: <ArtifactPage /> },
      { path: relative(presentationRoutePatterns.artifact), element: <ArtifactPage /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
