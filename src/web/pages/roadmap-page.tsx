import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  History,
  Link2,
} from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { EmptyState } from '../components/empty-state.tsx';
import { LeadText } from '../components/lead-tokens.tsx';
import type {
  MilestoneFlow,
  MilestoneRecord,
  RoadmapPhaseRow,
  RoadmapViewModel,
} from '../../presentation/roadmap.ts';
import { paginate } from './list-pagination.ts';
import {
  milestoneContainsDeepLink,
  resolveRoadmapDeepLink,
  type RoadmapDeepLinkTarget,
} from './roadmap-deep-link.ts';
import { scrollWhenSettled } from './scroll-settle.ts';
import { stripEmoji } from './strip-emoji.ts';

const REQUIREMENT_PAGE_SIZE = 4;
const ACCOMPLISHMENT_PREVIEW = 5;

async function fetchRoadmap(): Promise<RoadmapViewModel> {
  const response = await fetch('/api/roadmap', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Roadmap request failed (${response.status})`);
  return (await response.json()) as RoadmapViewModel;
}

function PhaseFlow({
  phase,
  targeted,
}: {
  phase: RoadmapPhaseRow;
  targeted: boolean;
}): React.JSX.Element {
  const progress = phase.progress;
  const observedProgress = phase.observedProgress;
  const showPlanCompletion = progress !== null || observedProgress.total > 0;
  const displayStatus = phase.formalStatus ?? phase.observedStatus;
  const statusLabel = displayStatus.replaceAll('_', ' ');
  const hasFacts = Boolean(showPlanCompletion || phase.authoredDependencies);
  const articleRef = useRef<HTMLElement | null>(null);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const openedRef = useRef(false);
  const [requirementPage, setRequirementPage] = useState(1);
  const requirementWindow = paginate(phase.requirements, requirementPage, REQUIREMENT_PAGE_SIZE);

  useEffect(() => {
    if (!targeted || openedRef.current) return;
    openedRef.current = true;
    if (detailsRef.current) detailsRef.current.open = true;
    return scrollWhenSettled({
      measure: () => {
        const element = articleRef.current;
        if (!element) return null;
        return (
          window.scrollY +
          element.getBoundingClientRect().top +
          document.documentElement.scrollHeight
        );
      },
      scroll: () => {
        articleRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      },
      schedule: (callback) => requestAnimationFrame(callback),
      cancel: (handle) => cancelAnimationFrame(handle),
    });
  }, [targeted]);

  return (
    <article
      className="roadmap-phase"
      data-status={displayStatus}
      data-archived={phase.archived}
      data-deep-link-target={targeted ? 'true' : undefined}
      ref={articleRef}
    >
      <div className="roadmap-marker" aria-hidden="true">
        {displayStatus === 'complete' ? <Check /> : <Circle />}
      </div>
      <div className="roadmap-phase-body">
        <header className="roadmap-phase-header">
          <div className="min-w-0">
            <p className="eyebrow">Phase {phase.number}</p>
            <h3>
              <Link to={phase.url}>{phase.name}</Link>
            </h3>
            {phase.goal ? <p className="phase-goal">{phase.goal}</p> : null}
          </div>
          <div className="phase-statuses" aria-label="Phase status">
            <span
              className="status-chip"
              data-tone={
                !phase.progressDisagreement && displayStatus === 'complete' ? 'complete' : 'quiet'
              }
              title={
                phase.progressDisagreement && progress
                  ? `ROADMAP.md records ${progress.completed} of ${progress.total} plans; SUMMARY files record ${observedProgress.completed} of ${observedProgress.total}`
                  : undefined
              }
            >
              {phase.progressDisagreement ? 'Status mismatch' : statusLabel}
            </span>
          </div>
        </header>

        {hasFacts ? (
          <dl className="phase-facts">
            {showPlanCompletion ? (
              <div>
                <dt>Plan completion</dt>
                <dd>
                  {observedProgress.completed} of {observedProgress.total} plans
                </dd>
              </div>
            ) : null}
            {phase.authoredDependencies ? (
              <div>
                <dt>Depends on</dt>
                <dd>{phase.authoredDependencies}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <details className="phase-disclosure" ref={detailsRef}>
          <summary>
            <ChevronRight aria-hidden="true" />
            Details and plans
          </summary>
          <div className="phase-detail-grid">
            <section aria-labelledby={`${phase.key}-criteria`}>
              <h4 id={`${phase.key}-criteria`}>Success criteria</h4>
              {phase.successCriteria.length > 0 ? (
                <ul className="criteria-list">
                  {phase.successCriteria.map((criterion) => (
                    <li key={criterion}>
                      <Check aria-hidden="true" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState />
              )}
            </section>
            <section aria-labelledby={`${phase.key}-requirements`}>
              <h4 id={`${phase.key}-requirements`}>Requirements</h4>
              {phase.requirements.length > 0 ? (
                <>
                  <ul className="requirement-list">
                    {requirementWindow.items.map((requirement) => (
                      <li key={requirement.id}>
                        <strong>{requirement.id}</strong>
                        {requirement.text ? <span>{requirement.text}</span> : null}
                        {requirement.url ? (
                          <Link to={requirement.url}>
                            Read requirement <ExternalLink aria-hidden="true" />
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {requirementWindow.totalPages > 1 ? (
                    <nav
                      className="requirement-pagination"
                      aria-label={`Requirements pagination for Phase ${phase.number}`}
                    >
                      <span>
                        Showing {requirementWindow.start}–{requirementWindow.end} of{' '}
                        {requirementWindow.total}
                      </span>
                      <div className="requirement-pagination-actions">
                        <button
                          type="button"
                          aria-label="Previous page"
                          onClick={() => setRequirementPage((page) => Math.max(1, page - 1))}
                          disabled={requirementWindow.page <= 1}
                        >
                          <ChevronLeft aria-hidden="true" />
                        </button>
                        <span className="requirement-page-status" aria-live="polite">
                          {requirementWindow.page} / {requirementWindow.totalPages}
                        </span>
                        <button
                          type="button"
                          aria-label="Next page"
                          onClick={() =>
                            setRequirementPage((page) =>
                              Math.min(requirementWindow.totalPages, page + 1),
                            )
                          }
                          disabled={requirementWindow.page >= requirementWindow.totalPages}
                        >
                          <ChevronRight aria-hidden="true" />
                        </button>
                      </div>
                    </nav>
                  ) : null}
                </>
              ) : (
                <EmptyState />
              )}
            </section>
          </div>

          <div className="wave-stack" aria-label={`Plan waves for Phase ${phase.number}`}>
            {phase.waveBands.length > 0 ? (
              phase.waveBands.map((band) => (
                <section className="wave-band" key={band.key}>
                  <header>
                    <span>{band.label}</span>
                    <span>
                      {band.plans.length} {band.plans.length === 1 ? 'plan' : 'plans'}
                    </span>
                  </header>
                  <ol>
                    {band.plans.map((plan) => (
                      <li key={plan.key} data-complete={plan.complete ? 'true' : 'false'}>
                        <Link to={plan.url}>
                          {plan.complete ? (
                            <Check aria-hidden="true" />
                          ) : (
                            <Circle aria-hidden="true" />
                          )}
                          <span className="wave-plan-copy">
                            <strong>{plan.id}</strong>
                            {plan.description ? <small>{plan.description}</small> : null}
                          </span>
                        </Link>
                        {plan.blockedBy.length > 0 ? (
                          <span className="blocked-by">Blocked by {plan.blockedBy.join(', ')}</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ))
            ) : (
              <EmptyState />
            )}
          </div>
        </details>
      </div>
    </article>
  );
}

function MilestoneTree({
  milestone,
  target,
}: {
  milestone: MilestoneFlow;
  target: RoadmapDeepLinkTarget | null;
}): React.JSX.Element {
  if (milestone.empty) {
    return <EmptyState variant="block" />;
  }
  const targetIndex = target?.phaseUrl
    ? milestone.phases.findIndex((phase) => phase.url === target.phaseUrl)
    : -1;
  return (
    <div className="roadmap-spine">
      {milestone.phases.map((phase, index) => (
        <PhaseFlow key={phase.key} phase={phase} targeted={index === targetIndex} />
      ))}
    </div>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** The line under the milestone's title: when it shipped, how long it took, how many phases. */
function historyCaption(milestone: MilestoneFlow): string {
  const record = milestone.record;
  const parts = [record?.shipped ? `Shipped ${record.shipped}` : (record?.status ?? 'Archived')];
  if (record?.days != null) parts.push(plural(record.days, 'day'));
  parts.push(plural(milestone.phases.length, 'phase'));
  return parts.join(' · ');
}

function RecordText({ text, items }: { text: string; items: string[] }): React.JSX.Element {
  return (
    <>
      {text ? <LeadText text={text} /> : null}
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => (
            <li key={index}>
              <LeadText text={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function MilestoneRecordPanel({ record }: { record: MilestoneRecord }): React.JSX.Element | null {
  const [showAll, setShowAll] = useState(false);
  const facts = [
    record.stats ? { label: 'Stats', text: record.stats.text, items: record.stats.items } : null,
    record.gitRange ? { label: 'Git range', text: record.gitRange, items: [] } : null,
    record.whatsNext ? { label: "What's next", text: record.whatsNext, items: [] } : null,
  ].filter((fact) => fact !== null);
  // Collapsing to hide a single item saves nothing, so a list one past the preview shows whole.
  const collapsible = record.accomplishments.length > ACCOMPLISHMENT_PREVIEW + 1;
  const accomplishments =
    showAll || !collapsible
      ? record.accomplishments
      : record.accomplishments.slice(0, ACCOMPLISHMENT_PREVIEW);
  // An entry with only a Delivered line has nothing for the panel; Delivered sits in the summary.
  if (facts.length === 0 && record.accomplishments.length === 0) return null;

  return (
    <div className="milestone-record">
      {facts.length > 0 ? (
        <dl className="milestone-record-facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>
                <RecordText text={fact.text} items={fact.items} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {record.accomplishments.length > 0 ? (
        <section className="milestone-record-section">
          <h4>Key accomplishments</h4>
          <ul className="criteria-list">
            {accomplishments.map((item, index) => (
              <li key={index}>
                <Check aria-hidden="true" />
                <span>
                  <LeadText text={item} />
                </span>
              </li>
            ))}
          </ul>
          {collapsible ? (
            <button
              type="button"
              className="milestone-record-more"
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Show fewer' : `Show all ${record.accomplishments.length}`}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function HistoryMilestone({
  milestone,
  target,
}: {
  milestone: MilestoneFlow;
  target: RoadmapDeepLinkTarget | null;
}): React.JSX.Element {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const openedRef = useRef(false);
  const contained = milestoneContainsDeepLink(milestone, target);
  const record = milestone.record;
  // The <summary> text ROADMAP.md archived carries the version already; a MILESTONES.md name does not.
  const title = record && milestone.version ? `${milestone.version} ${record.name}` : milestone.name;

  useEffect(() => {
    if (!contained || openedRef.current) return;
    openedRef.current = true;
    if (detailsRef.current) detailsRef.current.open = true;
  }, [contained]);

  return (
    <details className="history-milestone" ref={detailsRef}>
      <summary>
        <ChevronRight aria-hidden="true" />
        <span>
          <strong>{stripEmoji(title)}</strong>
          <small>{historyCaption(milestone)}</small>
          {record?.delivered ? (
            <span className="milestone-delivered">
              <LeadText text={record.delivered} />
            </span>
          ) : null}
        </span>
      </summary>
      {record ? <MilestoneRecordPanel record={record} /> : null}
      <div className="history-tree">
        <MilestoneTree milestone={milestone} target={target} />
      </div>
    </details>
  );
}

export function RoadmapPage(): React.JSX.Element {
  const { pathname } = useLocation();
  const target = useMemo(() => resolveRoadmapDeepLink(pathname), [pathname]);
  const roadmap = useQuery({ queryKey: ['roadmap'], queryFn: fetchRoadmap });

  if (roadmap.isPending) {
    return (
      <main className="page-stack" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
        <div className="roadmap-loading" aria-hidden="true" />
      </main>
    );
  }
  if (roadmap.isError) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Connection error</p>
        <h1>The roadmap could not be loaded.</h1>
        <section className="notice destructive" role="alert">
          <h2>Request failed</h2>
          <p>{roadmap.error.message}</p>
        </section>
      </main>
    );
  }

  const view = roadmap.data;
  return (
    <main className="roadmap-page page-stack">
      <header className="page-intro">
        <div>
          <p className="eyebrow">Execution narrative</p>
          <h1>Roadmap</h1>
          <p className="lede">
            Follow each phase from intent to completion. Waves group plans that can be executed at
            the same stage; their titles come directly from the roadmap.
          </p>
        </div>
        <Link className="text-link" to={view.active?.url ?? '/roadmap'}>
          <Link2 aria-hidden="true" />
          Current milestone
        </Link>
      </header>

      <section className="milestone-flow active-flow" aria-labelledby="active-roadmap-heading">
        <header className="section-heading">
          <div>
            <p className="eyebrow">Active milestone</p>
            <h2 id="active-roadmap-heading">
              {view.active?.name ?? 'No active milestone reported'}
            </h2>
          </div>
          {view.active?.version ? (
            <span className="milestone-version">{view.active.version}</span>
          ) : null}
        </header>
        {view.active ? (
          <MilestoneTree milestone={view.active} target={target} />
        ) : (
          <EmptyState variant="block" />
        )}
      </section>

      <section className="history-section" aria-labelledby="history-heading">
        <header className="section-heading">
          <div>
            <p className="eyebrow">Reference, not current state</p>
            <h2 id="history-heading">History</h2>
          </div>
          <History aria-hidden="true" />
        </header>
        {view.history.length > 0 ? (
          <div className="history-list">
            {view.history.map((milestone) => (
              <HistoryMilestone key={milestone.key} milestone={milestone} target={target} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}
