import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleDot } from 'lucide-react';
import { apiFetch, projectUrl } from '../api.ts';
import { Link, useProjectScope, useProjectSlug } from '../nav.tsx';
import { projectKey } from '../query-keys.ts';
import type { DashboardViewModel } from '../../presentation/dashboard.ts';
import type { DashboardHead } from '../../presentation/dashboard-head.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { LeadText } from '../components/lead-tokens.tsx';
import { BlockingBand, DecisionsSection } from './dashboard-ledger.tsx';
import { OnDeckPanel, RecentWorkPanel } from './dashboard-deck.tsx';
import { PaceSection } from './dashboard-pace.tsx';
import { InvalidProjectScreen } from './invalid-project-screen.tsx';
import { stripEmoji, stripMarkdown } from './strip-emoji.ts';

type DashboardResponse = DashboardViewModel & {
  loadStatus: ProjectPresentation['loadStatus'];
};

export function fetchDashboard(slug: string, scope: string | null): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>(projectUrl(slug, '/dashboard', scope));
}

function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1) || path;
}

/** The Stopped, Resume, Then and Deferred lines: what STATE.md holds that no other page shows. Each line
 * is omitted when its value is missing; every link is an artifact address or a STATE.md source anchor. */
function SessionLines({ session }: { session: DashboardHead['session'] }): React.JSX.Element | null {
  if (!session) return null;
  const { stoppedAt, lastSessionLabel, resumeFile, operatorSteps, deferredCount } = session;
  const [firstStep] = operatorSteps;
  return (
    <>
      {stoppedAt ? (
        <p className="project-next-last">
          <span className="project-next-label">Stopped</span>
          {stripMarkdown(stripEmoji(stoppedAt))}
          {lastSessionLabel ? ` · ${lastSessionLabel}` : null}
        </p>
      ) : null}
      {resumeFile ? (
        <p className="project-next-last">
          <span className="project-next-label">Resume</span>
          {resumeFile.url ? (
            <Link className="text-link" to={resumeFile.url}>
              {fileNameOf(resumeFile.path)}
            </Link>
          ) : (
            fileNameOf(resumeFile.path)
          )}
        </p>
      ) : null}
      {firstStep ? (
        <p className="project-next-last">
          <span className="project-next-label">Then</span>
          <LeadText text={stripEmoji(firstStep)} />
          {operatorSteps.length > 1 && session.stepsUrl ? (
            <>
              {' '}
              <Link className="text-link" to={session.stepsUrl}>
                {`+${operatorSteps.length - 1} more`}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {deferredCount && session.deferredUrl ? (
        <p className="project-next-last">
          <span className="project-next-label">Deferred</span>
          <Link className="text-link" to={session.deferredUrl}>
            {`${deferredCount} ${deferredCount === 1 ? 'item' : 'items'}`}
          </Link>
        </p>
      ) : null}
    </>
  );
}

function ProjectNext({
  next,
  session,
}: {
  next: DashboardHead['next'];
  session: DashboardHead['session'];
}): React.JSX.Element {
  if (!next) {
    return (
      <aside className="immediate-work project-next" aria-labelledby="project-next-heading">
        <p className="eyebrow" id="project-next-heading">Next up</p>
        <p className="empty-note">No STATE.md yet — nothing to report.</p>
      </aside>
    );
  }
  const { plans, step, last } = next;
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
      <SessionLines session={session} />
      {step ? (
        <div className="project-next-step" data-done={step.kind === 'new-milestone'}>
          <strong>
            {step.title}
            {step.plan ? (
              <>
                , from{' '}
                <Link className="project-next-plan" to={step.plan.url}>
                  {step.plan.id}
                </Link>
              </>
            ) : null}
          </strong>
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
          <hgroup>
            <p className="eyebrow">Project overview</p>
            <h1 id="project-name-heading">{stripEmoji(head.name)}</h1>
          </hgroup>
          {head.tagline ? <p className="project-tagline">{stripEmoji(head.tagline)}</p> : null}
          {head.lead ? (
            <p className="project-lead">
              <LeadText text={stripEmoji(head.lead)} />
            </p>
          ) : null}
          {head.projectUrl ? (
            <Link className="text-link" to={head.projectUrl}>
              About this project
              <ArrowRight aria-hidden="true" />
            </Link>
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
      <ProjectNext next={head.next} session={head.session} />
    </section>
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
  // A page under the project route always has a slug; '' only satisfies the type.
  const slug = useProjectSlug() ?? '';
  const scope = useProjectScope();
  const dashboard = useQuery({
    queryKey: projectKey(slug, scope, 'dashboard'),
    queryFn: () => fetchDashboard(slug, scope),
  });

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
  // The project layout already intercepts every failed load before this page renders; this
  // branch is a structural guard against reading fields off an empty presentation if this page is
  // ever reached directly. It renders the same InvalidProjectScreen the layout uses, so there is
  // exactly one visual design for this state reached from either place (D-15).
  if (view.loadStatus.status !== 'ok') {
    return <InvalidProjectScreen loadStatus={view.loadStatus} />;
  }

  return (
    <main className="dashboard-page page-stack">
      <ProjectHead head={view.head} />

      <BlockingBand blockers={view.blockers} />

      <DecisionsSection decisions={view.decisions} />

      <PaceSection pace={view.pace} readAt={view.readAt} />

      <section className="dashboard-lower">
        <OnDeckPanel onDeck={view.onDeck} readAt={view.readAt} />
        <RecentWorkPanel recent={view.recent} readAt={view.readAt} />
      </section>
    </main>
  );
}
