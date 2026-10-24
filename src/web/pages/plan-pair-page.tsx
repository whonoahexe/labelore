import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { buttonVariants } from '../components/ui/button.tsx';
import { ArtifactPage, DocumentView } from './artifact-page.tsx';

interface DocumentResponse {
  found: true;
  artifact: {
    path: string;
    title: string;
    frontmatter: Record<string, unknown>;
  };
  document: Parameters<typeof DocumentView>[0]['document'];
}

interface PlanPairResponse {
  plan: DocumentResponse;
  summary: DocumentResponse | null;
  /** From the presentation snapshot: the id ("01-01") the page is titled by, and the ROADMAP's own
   * one-line description of the plan when it has one. A plan file carries no title of its own — its
   * derived title is the file path — so the path must not be what the page is named. */
  meta: { id: string; description: string | null };
  /** The SUMMARY's artifact route, which the Summary tab hands to ArtifactPage. */
  summaryRoute?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Plan pair request failed (${response.status})`);
  return (await response.json()) as T;
}

async function loadPair(route: string, queryClient: QueryClient): Promise<PlanPairResponse> {
  const presentation = await fetchJson<ProjectPresentation>('/api/presentation');
  const plan = presentation.milestones
    .flatMap((milestone) => milestone.phases)
    .flatMap((phase) => phase.plans)
    .find((candidate) => candidate.key === route);
  if (!plan) throw new Error('This plan is not present in the current snapshot.');
  const planDocument = await fetchJson<DocumentResponse>(
    `/api/documents?route=${encodeURIComponent(route)}`,
  );
  // The same `/api/documents` payload ArtifactPage queries for, so the tab it mounts opens without
  // a second request.
  queryClient.setQueryData(['artifact-document', route], planDocument);
  const meta = { id: plan.id, description: plan.description };
  if (!plan.summary) return { plan: planDocument, summary: null, meta };
  const summaryRoute = presentation.artifacts.find(
    (artifact) => artifact.path === plan.summary?.path,
  )?.key;
  if (!summaryRoute) return { plan: planDocument, summary: null, meta };
  const summaryDocument = await fetchJson<DocumentResponse>(
    `/api/documents?route=${encodeURIComponent(summaryRoute)}`,
  );
  queryClient.setQueryData(['artifact-document', summaryRoute], summaryDocument);
  return { plan: planDocument, summary: summaryDocument, meta, summaryRoute };
}

type PairDoc = 'plan' | 'summary';

/** The pair's Plan / Summary switch, first in whichever page the tab mounts. The tab
 * lives in `?doc=` so each half of the pair is deep-linkable and the back button walks tabs. */
function PairSwitch({
  id,
  active,
  hasSummary,
}: {
  id: string;
  active: PairDoc;
  hasSummary: boolean;
}): React.JSX.Element {
  const tab = (doc: PairDoc, label: string): React.JSX.Element => {
    // The same button treatment as the View/Source toggle beside it in the header.
    const look = buttonVariants({ size: 'xs', variant: active === doc ? 'secondary' : 'ghost' });
    return (
      <Link
        key={doc}
        to={{ search: doc === 'plan' ? '' : `?doc=${doc}` }}
        className={look}
        aria-current={active === doc ? 'page' : undefined}
      >
        {label}
      </Link>
    );
  };
  return (
    <nav className="plan-pair-switch" aria-label={`Plan ${id} documents`}>
      {tab('plan', 'Plan')}
      {hasSummary ? (
        tab('summary', 'Summary')
      ) : (
        <span
          className="status-chip"
          data-tone="quiet"
          title="Outcome not recorded yet: this plan is still open, so there is no paired summary."
        >
          No summary yet
        </span>
      )}
    </nav>
  );
}

export function PlanPairPage(): React.JSX.Element {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['plan-pair', location.pathname],
    queryFn: () => loadPair(location.pathname, queryClient),
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (query.isPending)
    return (
      <main className="page-stack" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
        <div className="plan-pair-loading" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </main>
    );
  if (query.isError)
    return (
      <main className="page-stack">
        <h1>This plan pair could not be opened.</h1>
        <p className="notice destructive" role="alert">
          {query.error.message}
        </p>
        <Link to={presentationRoutePatterns.roadmap}>Return to the roadmap</Link>
      </main>
    );

  const pair = query.data;
  const active: PairDoc =
    searchParams.get('doc') === 'summary' && pair.summaryRoute ? 'summary' : 'plan';
  const switcher = (
    <PairSwitch id={pair.meta.id} active={active} hasSummary={Boolean(pair.summaryRoute)} />
  );

  // The PLAN and SUMMARY tabs are the same per-type pages their artifact URLs open (the task
  // navigator, the run view), keyed by route so View/Source mode resets between them.
  if (active === 'summary' && pair.summaryRoute)
    return <ArtifactPage key="summary" route={pair.summaryRoute} switcher={switcher} />;
  return <ArtifactPage key="plan" route={location.pathname} switcher={switcher} />;
}
