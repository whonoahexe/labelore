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
import type {
  MilestoneFlow,
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

const REQUIREMENT_PAGE_SIZE = 4;

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
  const displayStatus = phase.formalStatus ?? phase.observedStatus;
  const statusLabel = displayStatus.replaceAll('_', ' ');
  const hasFacts = Boolean(progress || phase.authoredDependencies);
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
              data-tone={displayStatus === 'complete' ? 'complete' : 'quiet'}
            >
              {statusLabel}
            </span>
          </div>
        </header>

        {hasFacts ? (
          <dl className="phase-facts">
            {progress ? (
              <div>
                <dt>Plan completion</dt>
                <dd>
                  {progress.completed} of {progress.total} plans
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
          <strong>{milestone.name}</strong>
          <small>{milestone.version ?? 'Unversioned archive'} · Archived</small>
        </span>
      </summary>
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
