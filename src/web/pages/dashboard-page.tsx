import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
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
import { PositionLine } from './dashboard-position.tsx';
import { stripEmoji } from './strip-emoji.ts';

type DashboardResponse = DashboardViewModel & {
  loadStatus: ProjectPresentation['loadStatus'];
};

export function fetchDashboard(slug: string, scope: string | null): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>(projectUrl(slug, '/dashboard', scope));
}

function ProjectHead({ head }: { head: DashboardHead }): React.JSX.Element {
  return (
    <section className="project-head" aria-labelledby="project-name-heading">
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
      {head.position ? (
        <PositionLine position={head.position} />
      ) : (
        <section className="position-line" aria-label="Where the work stands">
          <p className="empty-note">No roadmap or phase on disk yet — nothing to place.</p>
        </section>
      )}
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
