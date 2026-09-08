import { useQuery } from '@tanstack/react-query';
import { createBrowserRouter, isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { presentationRoutePatterns } from '../presentation/routes.ts';
import { AppShell, fetchPresentation } from './components/app-shell.tsx';
import { DashboardPage } from './pages/dashboard-page.tsx';
import { InvalidProjectScreen } from './pages/invalid-project-screen.tsx';
import { RoadmapPage } from './pages/roadmap-page.tsx';
import { SearchPage } from './pages/search-page.tsx';
import { TraceabilityPage } from './pages/traceability-page.tsx';
import { ArtifactPage } from './pages/artifact-page.tsx';
import { PlanPairPage } from './pages/plan-pair-page.tsx';

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

function NotFound(): React.JSX.Element {
  return (
    <main className="page-stack">
      <p className="eyebrow">Not found</p>
      <h1>This local route does not exist.</h1>
      <section className="notice">
        <h2>Nothing is mapped here</h2>
        <p>The address is outside the current Labelore route tree.</p>
        <Link to={presentationRoutePatterns.dashboard}>Return to the dashboard</Link>
      </section>
    </main>
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
  const presentation = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  if (presentation.data && presentation.data.loadStatus.status !== 'ok') {
    return <InvalidProjectScreen loadStatus={presentation.data.loadStatus} />;
  }
  return <AppShell />;
}

export const appRouter = createBrowserRouter([
  {
    element: <ProjectGate />,
    errorElement: <RouteError />,
    children: [
      { path: presentationRoutePatterns.dashboard, element: <DashboardPage /> },
      { path: presentationRoutePatterns.roadmap, element: <RoadmapPage /> },
      { path: presentationRoutePatterns.search, element: <SearchPage /> },
      { path: presentationRoutePatterns.traceability, element: <TraceabilityPage /> },
      { path: presentationRoutePatterns.milestone, element: <RoadmapPage /> },
      { path: presentationRoutePatterns.phase, element: <RoadmapPage /> },
      { path: presentationRoutePatterns.plan, element: <PlanPairPage /> },
      { path: presentationRoutePatterns.phaseArtifact, element: <ArtifactPage /> },
      { path: presentationRoutePatterns.artifact, element: <ArtifactPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
