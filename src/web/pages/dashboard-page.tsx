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
import { InvalidProjectScreen } from './invalid-project-screen.tsx';
import { stripEmoji, stripMarkdown } from './strip-emoji.ts';

type DashboardResponse = DashboardViewModel & {
  loadStatus: ProjectPresentation['loadStatus'];
};

async function fetchDashboard(): Promise<DashboardResponse> {
  const response = await fetch('/api/dashboard', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Dashboard request failed (${response.status})`);
  return (await response.json()) as DashboardResponse;
}

const ATTENTION_PAGE_SIZE = 4;

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

function NextWork({ item: rawItem, primary = false }: { item: NextWorkItem; primary?: boolean }) {
  const item = primary
    ? { ...rawItem, description: stripMarkdown(stripEmoji(rawItem.description)) }
    : { ...rawItem, description: stripMarkdown(rawItem.description) };
  return (
    <Link className={primary ? 'next-primary' : 'next-preview'} to={item.url}>
      <div>
        <span className="item-kind">{kindLabel(item.kind)}</span>
        <strong>{stripMarkdown(item.title)}</strong>
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
  // The router's ProjectGate already intercepts every failed load before this page renders; this
  // branch is a structural guard against reading fields off an empty presentation if this page is
  // ever reached directly. It renders the same InvalidProjectScreen the gate uses, so there is
  // exactly one visual design for this state reached from either place (D-15).
  if (view.loadStatus.status !== 'ok') {
    return <InvalidProjectScreen loadStatus={view.loadStatus} />;
  }

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
          {view.completion.phaseStatus ? (
            <span
              className="status-chip"
              data-tone={
                view.completion.phaseStatus === 'Complete'
                  ? 'complete'
                  : view.completion.phaseStatus === 'Awaiting Checkpoint' ||
                      view.completion.phaseStatus === 'In Progress'
                    ? 'active'
                    : 'quiet'
              }
            >
              <CircleDot aria-hidden="true" />
              {view.completion.phaseStatus}
            </span>
          ) : null}
        </header>
        {view.completion.counts.total > 0 ? (
          <div className="plan-progress-summary">
            <div className="plan-progress-headline">
              <strong>{view.completion.counts.completed}</strong>
              <span>of {view.completion.counts.total} plans completed</span>
            </div>
            <div className="plan-breakdown-pills">
              <span className="plan-pill" data-state="completed">
                <strong>{view.completion.counts.completed}</strong> Completed
              </span>
              {view.completion.counts.awaitingCheckpoint > 0 ? (
                <span className="plan-pill" data-state="awaiting">
                  <strong>{view.completion.counts.awaitingCheckpoint}</strong> Awaiting Review
                </span>
              ) : null}
              <span className="plan-pill" data-state="remaining">
                <strong>{view.completion.counts.remaining}</strong> Remaining
              </span>
            </div>
          </div>
        ) : (
          <p className="progress-empty">
            The roadmap does not specify a plan checklist for this phase.
          </p>
        )}
        <SourceLink provenance={view.completion.formal.provenance}>Open roadmap</SourceLink>

        {view.completion.activeCheckpoint ? (
          <div className="checkpoint-callout" role="status">
            <AlertTriangle aria-hidden="true" />
            <div className="checkpoint-content">
              <div className="checkpoint-header">
                <span className="checkpoint-badge">Awaiting human review</span>
                <strong>{stripMarkdown(view.completion.activeCheckpoint.name)}</strong>
              </div>
              <p>
                Manual verification is required before Plan {view.completion.activeCheckpoint.planId} can complete.
              </p>
              <Link to={view.completion.activeCheckpoint.planKey} className="checkpoint-link">
                Open plan <ArrowRight aria-hidden="true" />
              </Link>
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
                        aria-label={`Open ${item.type}: ${stripMarkdown(item.title)}`}
                      >
                        <span className="item-kind">{item.type}</span>
                        <strong>{stripMarkdown(item.title)}</strong>
                        <p>{stripMarkdown(stripEmoji(item.detail))}</p>
                      </Link>
                    ) : (
                      <div>
                        <span className="item-kind">{item.type}</span>
                        <strong>{stripMarkdown(item.title)}</strong>
                        <p>{stripMarkdown(stripEmoji(item.detail))}</p>
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
