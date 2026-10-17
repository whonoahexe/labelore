import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
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
import type { DashboardHead } from '../../presentation/dashboard-head.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { tokenizeInline, type InlineToken } from '../views/inline-markdown.ts';
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

function NextWork({ item: rawItem }: { item: NextWorkItem }) {
  const item = { ...rawItem, description: stripMarkdown(rawItem.description) };
  return (
    <Link className="next-preview" to={item.url}>
      <div>
        <span className="item-kind">{kindLabel(item.kind)}</span>
        <strong>{stripMarkdown(item.title)}</strong>
        <p>{item.description}</p>
      </div>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

/** The lead's inline markdown: code spans stay code, emphasis is flattened into the sentence. */
function LeadTokens({ tokens }: { tokens: InlineToken[] }): React.JSX.Element {
  return (
    <>
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        if (token.type === 'strong' || token.type === 'em') return <LeadTokens key={key} tokens={token.value} />;
        if (token.type === 'code') return <code key={key}>{token.value}</code>;
        return <span key={key}>{token.value}</span>;
      })}
    </>
  );
}

function ProjectNext({ next }: { next: DashboardHead['next'] }): React.JSX.Element {
  if (!next) {
    return (
      <aside className="immediate-work project-next" aria-labelledby="project-next-heading">
        <p className="eyebrow" id="project-next-heading">Next up</p>
        <p className="empty-note">No STATE.md yet — nothing to report.</p>
      </aside>
    );
  }
  const { plans, step, last } = next;
  const stepTitle = step ? <strong>{stripEmoji(step.title)}</strong> : null;
  return (
    <aside className="immediate-work project-next" aria-labelledby="project-next-heading">
      <p className="eyebrow" id="project-next-heading">Next up</p>
      {plans.length > 0 ? (
        <div className="project-next-progress">
          <div className="project-next-figure">
            <span className="project-next-percent">
              {next.percent}
              <span className="project-next-unit">%</span>
            </span>
            <span className="project-next-counts">
              <b>{next.completed}</b> of {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
            </span>
          </div>
          <div className="project-next-bar" aria-hidden="true">
            {plans.map((plan) => (
              <span key={plan.id} data-state={plan.done ? 'done' : plan.next ? 'next' : 'open'} />
            ))}
          </div>
        </div>
      ) : (
        <p className="empty-note">No plans in this phase yet.</p>
      )}
      {last ? (
        <p className="project-next-last">
          <span className="project-next-label">Last</span>
          {last.dateLabel}
          {last.dateLabel && last.text ? ' — ' : null}
          {last.text ? stripMarkdown(stripEmoji(last.text)) : null}
        </p>
      ) : null}
      {step?.kind === 'plan' && step.url ? (
        <Link className="project-next-step" to={step.url}>
          {step.id ? <span className="project-next-id">{step.id}</span> : null}
          {stepTitle}
        </Link>
      ) : step ? (
        <div className="project-next-step" data-done={step.kind === 'milestone'}>
          {stepTitle}
        </div>
      ) : (
        <p className="empty-note">No dependency-ready work is reported in the active milestone.</p>
      )}
    </aside>
  );
}

function ProjectHead({ head }: { head: DashboardHead }): React.JSX.Element {
  const { now } = head;
  return (
    <section className="project-head" aria-labelledby="project-name-heading">
      <div className="project-head-copy">
        <div className="project-identity">
          <h1 id="project-name-heading">{stripEmoji(head.name)}</h1>
          {head.tagline ? <p className="project-tagline">{stripEmoji(head.tagline)}</p> : null}
          {head.lead ? (
            <p className="project-lead">
              <LeadTokens tokens={tokenizeInline(stripEmoji(head.lead))} />
            </p>
          ) : null}
        </div>
        {now ? (
          <div className="project-now">
            <span className="project-now-label">Now</span>
            {now.milestone || now.phase ? (
              <p className="project-now-line">
                {now.milestone ? <b>{stripEmoji(now.milestone)}</b> : null}
                {now.milestone && now.phase ? ' · ' : null}
                {now.phase ? `Phase ${now.phase}` : null}
              </p>
            ) : null}
            {now.title ? <h2>{stripEmoji(now.title)}</h2> : null}
            {now.status ? (
              <span className="status-chip" data-tone={now.done ? 'complete' : 'active'}>
                <CircleDot aria-hidden="true" />
                {now.status}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <ProjectNext next={head.next} />
    </section>
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
      <span className="sr-only" role="status" aria-live="polite">
        Loading
      </span>
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
  const [attentionPage, setAttentionPage] = useState(1);

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

  const totalAttentionPages = Math.ceil(view.attention.length / ATTENTION_PAGE_SIZE);
  const currentAttentionPage = Math.min(Math.max(1, attentionPage), totalAttentionPages || 1);
  const attentionStart = (currentAttentionPage - 1) * ATTENTION_PAGE_SIZE;
  const attentionEnd = Math.min(attentionStart + ATTENTION_PAGE_SIZE, view.attention.length);
  const visibleAttention = view.attention.slice(attentionStart, attentionEnd);

  return (
    <main className="dashboard-page page-stack">
      <ProjectHead head={view.head} />

      <section className="progress-panel" aria-labelledby="phase-progress-heading">
        <header className="progress-panel-header">
          <div>
            <p className="eyebrow">Current phase</p>
            <h2 id="phase-progress-heading">{view.completion.phaseMode}</h2>
          </div>
          <div className="progress-panel-meta">
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
            <SourceLink provenance={view.completion.formal.provenance}>Open roadmap</SourceLink>
          </div>
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
                {visibleAttention.map((item) => (
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
              {totalAttentionPages > 1 ? (
                <nav className="attention-pagination" aria-label="Needs attention pagination">
                  <span>
                    Showing {attentionStart + 1}–{attentionEnd} of {view.attention.length}
                  </span>
                  <div className="attention-pagination-actions">
                    <button
                      type="button"
                      aria-label="Previous page"
                      onClick={() => setAttentionPage((page) => Math.max(1, page - 1))}
                      disabled={currentAttentionPage <= 1}
                    >
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <span className="attention-page-status" aria-live="polite">
                      {currentAttentionPage} / {totalAttentionPages}
                    </span>
                    <button
                      type="button"
                      aria-label="Next page"
                      onClick={() => setAttentionPage((page) => Math.min(totalAttentionPages, page + 1))}
                      disabled={currentAttentionPage >= totalAttentionPages}
                    >
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </div>
                </nav>
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
