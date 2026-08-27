import { createBrowserRouter, isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { presentationRoutePatterns } from '../presentation/routes.ts';
import { AppShell } from './components/app-shell.tsx';
import { DashboardPage } from './pages/dashboard-page.tsx';
import { RoadmapPage } from './pages/roadmap-page.tsx';

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
        <p>The address is outside the current GSD Lore route tree.</p>
        <Link to={presentationRoutePatterns.dashboard}>Return to the dashboard</Link>
      </section>
    </main>
  );
}

function PlannedRoute(): React.JSX.Element {
  return (
    <main className="page-stack">
      <p className="eyebrow">Artifact reading</p>
      <h1>This canonical destination is ready for its document view.</h1>
    </main>
  );
}

export const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: presentationRoutePatterns.dashboard, element: <DashboardPage /> },
      { path: presentationRoutePatterns.roadmap, element: <RoadmapPage /> },
      { path: presentationRoutePatterns.milestone, element: <RoadmapPage /> },
      ...[
        presentationRoutePatterns.phase,
        presentationRoutePatterns.plan,
        presentationRoutePatterns.phaseArtifact,
        presentationRoutePatterns.artifact,
      ].map((path) => ({ path, element: <PlannedRoute /> })),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
