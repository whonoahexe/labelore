import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router';
import type {
  AttentionItem,
  DashboardViewModel,
  NextWorkItem,
  SourceProvenance,
} from '../../presentation/dashboard.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';

type DashboardResponse = DashboardViewModel & {
  loadStatus: ProjectPresentation['loadStatus'];
};

async function fetchDashboard(): Promise<DashboardResponse> {
  const response = await fetch('/api/dashboard', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Dashboard request failed (${response.status})`);
  return (await response.json()) as DashboardResponse;
}

function provenanceLabel(provenance: SourceProvenance): string {
  switch (provenance.kind) {
    case 'state':
      return 'STATE';
    case 'roadmap':
      return 'ROADMAP';
    case 'summary':
      return 'SUMMARY files';
    case 'derived':
      return 'Snapshot projection';
  }
}

function destination(item: NextWorkItem): string {
  return item.key.startsWith('/') ? item.key : '/roadmap';
}

function NextWork({ item, primary = false }: { item: NextWorkItem; primary?: boolean }) {
  return (
    <Link className={primary ? 'next-primary' : 'next-preview'} to={destination(item)}>
      <div>
        <span className="item-kind">{item.kind}</span>
        <strong>{item.title}</strong>
        <p>{item.reason}</p>
      </div>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function AttentionIcon({ type }: { type: AttentionItem['type'] }): React.JSX.Element {
  return type === 'blocker' || type === 'dependency' ? (
    <ShieldAlert aria-hidden="true" />
  ) : (
    <AlertTriangle aria-hidden="true" />
  );
}

function DashboardLoading(): React.JSX.Element {
  return (
    <main className="page-stack" aria-busy="true">
      <p className="eyebrow">Situational awareness</p>
      <h1>Reading the current position…</h1>
      <div className="dashboard-loading" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}

export function DashboardPage(): React.JSX.Element {
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });

  if (dashboard.isPending) return <DashboardLoading />;
  if (dashboard.isError) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Connection error</p>
        <h1>The project snapshot did not respond.</h1>
        <section className="notice destructive" role="alert">
          <h2>Dashboard request failed</h2>
          <p>{dashboard.error.message}</p>
        </section>
      </main>
    );
  }

  const view = dashboard.data;
  if (view.loadStatus.status !== 'ok') {
    return (
      <main className="page-stack">
        <p className="eyebrow">{view.loadStatus.status.replaceAll('-', ' ')}</p>
        <h1>GSD Lore could not read this project.</h1>
        <section className="notice destructive" role="alert">
          <h2>Local project load failed</h2>
          <p>{view.loadStatus.message}</p>
        </section>
      </main>
    );
  }

  const discrepancy = view.attention.find((item) => item.type === 'discrepancy') ?? null;
  return (
    <main className="dashboard-page page-stack">
      <section className="position-hero" aria-labelledby="current-position-heading">
        <div className="position-copy">
          <p className="eyebrow">
            <MapPin aria-hidden="true" /> Current position
          </p>
          <p className="milestone-label">{view.current.milestone.display}</p>
          <h1 id="current-position-heading">
            <span>Phase {view.current.phaseNumber.display}</span>
            {view.current.phaseName.display}
          </h1>
          <div className="position-meta">
            <span className="status-chip" data-tone="active">
              <CircleDot aria-hidden="true" />
              {view.current.status.display}
            </span>
            <span className="source-note">
              Source · {provenanceLabel(view.current.status.provenance)}
            </span>
          </div>
        </div>

        <aside className="immediate-work" aria-labelledby="immediate-work-heading">
          <p className="eyebrow">Immediate work</p>
          <h2 id="immediate-work-heading">What moves next</h2>
          {view.next.immediate ? (
            <NextWork item={view.next.immediate} primary />
          ) : (
            <div className="quiet-state">
              <CheckCircle2 aria-hidden="true" />
              <p>No dependency-ready work is reported in the active milestone.</p>
            </div>
          )}
        </aside>
      </section>

      <section className="progress-panel" aria-labelledby="formal-progress-heading">
        <header>
          <div>
            <p className="eyebrow">Primary signal · ROADMAP</p>
            <h2 id="formal-progress-heading">Formal phase progress</h2>
          </div>
          <span className="formal-status">{view.completion.formal.status}</span>
        </header>
        <div className="formal-progress-value">
          <strong>{view.completion.formal.completed ?? '—'}</strong>
          <span>/ {view.completion.formal.total ?? '—'} plans</span>
        </div>
        <p className="source-note">Source · {view.completion.formal.provenance.ref}</p>

        <div className="observed-progress">
          <span>
            Observed SUMMARY progress · {view.completion.observed.completed ?? '—'} /{' '}
            {view.completion.observed.total ?? '—'}
          </span>
          <span>{view.completion.observed.status}</span>
        </div>
        {discrepancy ? (
          <div className="discrepancy-callout" role="status">
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>{discrepancy.title}</strong>
              <p>{discrepancy.detail}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="dashboard-grid">
        <section className="attention-panel" aria-labelledby="attention-heading">
          <header className="section-heading compact">
            <div>
              <p className="eyebrow">Prioritized</p>
              <h2 id="attention-heading">Needs attention</h2>
            </div>
            <span>{view.attention.length}</span>
          </header>
          {view.attention.length > 0 ? (
            <ol className="attention-list">
              {view.attention.map((item) => (
                <li key={item.key} data-type={item.type}>
                  <AttentionIcon type={item.type} />
                  <div>
                    <span className="item-kind">{item.type}</span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <small>Source · {provenanceLabel(item.provenance)}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="quiet-state">
              <CheckCircle2 aria-hidden="true" />
              <p>No discrepancy, blocker, dependency wait, or human gate needs attention.</p>
            </div>
          )}
        </section>

        <section className="preview-panel" aria-labelledby="preview-heading">
          <header className="section-heading compact">
            <div>
              <p className="eyebrow">After the immediate item</p>
              <h2 id="preview-heading">On deck</h2>
            </div>
          </header>
          <div className="preview-list">
            {view.next.previews.length > 0 ? (
              view.next.previews.map((item) => <NextWork key={item.key} item={item} />)
            ) : (
              <p className="empty-note">No quieter previews are available.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
