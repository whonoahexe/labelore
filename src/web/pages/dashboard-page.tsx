import { useState } from 'react';
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
import {
  provenanceLabel,
  sourceDestination,
  type AttentionItem,
  type DashboardViewModel,
  type NextWorkItem,
  type SourceProvenance,
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

const ATTENTION_PAGE_SIZE = 8;

function kindLabel(kind: NextWorkItem['kind']): string {
  return kind.replaceAll('-', ' ');
}

function SourceLink({ provenance, children }: { provenance: SourceProvenance; children?: string }) {
  const to = sourceDestination(provenance);
  const label = children ?? `View ${provenanceLabel(provenance).toLowerCase()} source`;
  return to ? (
    <Link className="source-note source-link" to={to}>
      {label}
    </Link>
  ) : (
    <span className="source-note">{label}</span>
  );
}

function NextWork({ item, primary = false }: { item: NextWorkItem; primary?: boolean }) {
  return (
    <Link className={primary ? 'next-primary' : 'next-preview'} to={item.url}>
      <div>
        <span className="item-kind">{kindLabel(item.kind)}</span>
        <strong>{item.title}</strong>
        <p>{item.description}</p>
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
  const [attentionLimit, setAttentionLimit] = useState(ATTENTION_PAGE_SIZE);

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
            <SourceLink provenance={view.current.status.provenance}>View project state</SourceLink>
          </div>
        </div>

        <aside className="immediate-work" aria-labelledby="immediate-work-heading">
          <p className="eyebrow">Recommended action</p>
          <h2 id="immediate-work-heading">Next up</h2>
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

      <section className="progress-panel" aria-labelledby="phase-progress-heading">
        <header>
          <div>
            <p className="eyebrow">Current phase</p>
            <h2 id="phase-progress-heading">Plan completion</h2>
          </div>
          {view.completion.formal.status ? (
            <span className="formal-status">{view.completion.formal.status}</span>
          ) : null}
        </header>
        {view.completion.formal.completed !== null && view.completion.formal.total !== null ? (
          <div className="formal-progress-value">
            <strong>{view.completion.formal.completed}</strong>
            <span>of {view.completion.formal.total} plans</span>
          </div>
        ) : (
          <p className="progress-empty">
            The roadmap does not specify a plan checklist for this phase.
          </p>
        )}
        <SourceLink provenance={view.completion.formal.provenance}>Open roadmap</SourceLink>

        <div className="observed-progress">
          <span>
            Files on disk · {view.completion.observed.completed ?? 0} of{' '}
            {view.completion.observed.total ?? 0} summaries present
          </span>
          {view.completion.observed.status ? <span>{view.completion.observed.status}</span> : null}
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
            <span aria-label={`${view.attention.length} items`}>{view.attention.length}</span>
          </header>
          {view.attention.length > 0 ? (
            <>
              <ol className="attention-list">
                {view.attention.slice(0, attentionLimit).map((item) => (
                  <li key={item.key} data-type={item.type}>
                    <AttentionIcon type={item.type} />
                    {item.url ? (
                      <Link
                        className="attention-action"
                        to={item.url}
                        aria-label={`Open ${item.type}: ${item.title}`}
                      >
                        <span className="item-kind">{item.type}</span>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </Link>
                    ) : (
                      <div>
                        <span className="item-kind">{item.type}</span>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                    )}
                    <SourceLink provenance={item.provenance} />
                  </li>
                ))}
              </ol>
              {attentionLimit < view.attention.length ? (
                <div className="attention-more">
                  <span>
                    Showing {attentionLimit} of {view.attention.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttentionLimit((value) => value + ATTENTION_PAGE_SIZE)}
                  >
                    Show more
                  </button>
                </div>
              ) : null}
            </>
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
              <p className="empty-note preview-empty">
                No additional work is queued after this item.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
