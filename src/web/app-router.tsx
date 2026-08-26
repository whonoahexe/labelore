import { useQuery } from '@tanstack/react-query';
import { createBrowserRouter, isRouteErrorResponse, Link, useRouteError } from 'react-router';

interface DashboardProgress {
  totalPhases: number | null;
  completedPhases: number | null;
  totalPlans: number | null;
  completedPlans: number | null;
  percent: number | null;
}

interface DashboardData {
  readAt: string;
  loadStatus:
    | { status: 'ok' }
    | { status: 'not-a-gsd-project' | 'permission-denied'; pathChecked: string; message: string }
    | { status: 'path-not-found'; pathChecked: string; rawPath: string; message: string };
  projectName: string | null;
  current: {
    milestone: string | null;
    phaseNumber: string | null;
    phaseName: string | null;
    status: string | null;
    progress: DashboardProgress;
  } | null;
}

async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch('/api/dashboard', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Dashboard request failed (${response.status})`);
  return (await response.json()) as DashboardData;
}

function formatReadTime(readAt: string): string {
  const parsed = new Date(readAt);
  return Number.isNaN(parsed.valueOf()) ? readAt : parsed.toLocaleString();
}

function CurrentPosition(): React.JSX.Element {
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });

  if (dashboard.isPending) {
    return (
      <main className="screen" aria-busy="true">
        <p className="eyebrow">GSD Lore</p>
        <h1>Reading the project snapshot…</h1>
        <div className="position-card skeleton" aria-hidden="true" />
      </main>
    );
  }

  if (dashboard.isError) {
    return (
      <main className="screen">
        <p className="eyebrow">Local connection error</p>
        <h1>The dashboard endpoint did not respond.</h1>
        <section className="error-card" role="alert">
          <h2>Request failed</h2>
          <p>{dashboard.error.message}</p>
          <p className="muted">Confirm the local GSD Lore server is still running, then reload.</p>
        </section>
      </main>
    );
  }

  const data = dashboard.data;
  if (data.loadStatus.status !== 'ok' || !data.current) {
    const message =
      'message' in data.loadStatus
        ? data.loadStatus.message
        : 'The selected project could not be loaded.';
    return (
      <main className="screen">
        <p className="eyebrow">{data.loadStatus.status.replaceAll('-', ' ')}</p>
        <h1>GSD Lore could not read this project.</h1>
        <section className="error-card" role="alert">
          <h2>Local project load failed</h2>
          <p>{message}</p>
          <p className="muted">Snapshot attempted {formatReadTime(data.readAt)}.</p>
        </section>
      </main>
    );
  }

  const { current } = data;
  const percent = Math.max(0, Math.min(100, current.progress.percent ?? 0));
  return (
    <main className="screen">
      <p className="eyebrow">Current position · {current.milestone ?? 'Active milestone'}</p>
      <h1>{data.projectName ?? 'Untitled GSD project'}</h1>
      <p className="lede">
        One immutable read of the selected project, distilled into the work that is active now.
      </p>

      <section className="position-card" aria-labelledby="current-phase-heading">
        <header className="card-heading">
          <div>
            <p className="eyebrow">Phase {current.phaseNumber ?? '—'}</p>
            <h2 id="current-phase-heading">{current.phaseName ?? 'Current phase not named'}</h2>
          </div>
          <span className="status">{current.status ?? 'Status unavailable'}</span>
        </header>

        <div className="progress-block">
          <div className="progress-row">
            <strong>Formal progress</strong>
            <span>
              {current.progress.percent == null ? 'Not reported' : `${current.progress.percent}%`}
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <dl className="metadata">
          <div>
            <dt>Milestone</dt>
            <dd>{current.milestone ?? 'Not reported'}</dd>
          </div>
          <div>
            <dt>Phases</dt>
            <dd>
              {current.progress.completedPhases ?? '—'} / {current.progress.totalPhases ?? '—'}{' '}
              complete
            </dd>
          </div>
          <div>
            <dt>Plans</dt>
            <dd>
              {current.progress.completedPlans ?? '—'} / {current.progress.totalPlans ?? '—'}{' '}
              complete
            </dd>
          </div>
          <div>
            <dt>Snapshot read</dt>
            <dd>{formatReadTime(data.readAt)}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

function RouteError(): React.JSX.Element {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected route error occurred.';

  return (
    <main className="screen">
      <p className="eyebrow">Route error</p>
      <h1>This view could not be opened.</h1>
      <section className="error-card" role="alert">
        <h2>Local route failed</h2>
        <p>{message}</p>
        <p className="muted">Return to the dashboard and try again.</p>
      </section>
    </main>
  );
}

function NotFound(): React.JSX.Element {
  return (
    <main className="screen">
      <p className="eyebrow">Not found</p>
      <h1>This local route does not exist.</h1>
      <section className="error-card">
        <h2>Nothing is mapped here</h2>
        <p>The address is outside the current GSD Lore route tree.</p>
        <p>
          <Link to="/">Return to the dashboard</Link>
        </p>
      </section>
    </main>
  );
}

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <CurrentPosition />,
    errorElement: <RouteError />,
  },
  {
    path: '*',
    element: <NotFound />,
    errorElement: <RouteError />,
  },
]);
