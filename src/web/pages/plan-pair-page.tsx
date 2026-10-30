import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Link, useProjectSlug } from '../nav.tsx';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import { fetchPresentation } from '../api.ts';
import { projectKey } from '../query-keys.ts';
import { PairSwitch } from '../components/pair-switch.tsx';
import { ArtifactPage, DocumentView, fetchDocument } from './artifact-page.tsx';

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

export async function loadPair(
  slug: string,
  planUrl: string,
  queryClient: QueryClient,
): Promise<PlanPairResponse> {
  const presentation = await fetchPresentation(slug);
  const plan = presentation.milestones
    .flatMap((milestone) => milestone.phases)
    .flatMap((phase) => phase.plans)
    .find((candidate) => candidate.key === planUrl);
  if (!plan) throw new Error('This plan is not present in the current snapshot.');
  const planDocument = (await fetchDocument(slug, planUrl)) as DocumentResponse;
  // The same document payload ArtifactPage queries for, under the same project-scoped key, so the
  // tab it mounts opens without a second request.
  queryClient.setQueryData(projectKey(slug, 'document', planUrl), planDocument);
  const meta = { id: plan.id, description: plan.description };
  if (!plan.summary) return { plan: planDocument, summary: null, meta };
  const summaryRoute =
    presentation.artifacts.find((artifact) => artifact.path === plan.summary?.path)?.key ??
    plan.summary.key;
  if (!summaryRoute) return { plan: planDocument, summary: null, meta };
  const summaryDocument = (await fetchDocument(slug, summaryRoute)) as DocumentResponse;
  queryClient.setQueryData(projectKey(slug, 'document', summaryRoute), summaryDocument);
  return { plan: planDocument, summary: summaryDocument, meta, summaryRoute };
}

/** D-05: the pair is two addresses, the plan's and its `/summary`; `planUrl` and `active` come from the
 * dispatcher's plan-pair outcome, and the tabs are links between the two paths. */
export function PlanPairPage({
  planUrl,
  active: requested,
}: {
  planUrl: string;
  active: 'plan' | 'summary';
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const slug = useProjectSlug() ?? '';
  const query = useQuery({
    queryKey: projectKey(slug, 'plan-pair', planUrl),
    queryFn: () => loadPair(slug, planUrl, queryClient),
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
  const active = requested === 'summary' && pair.summaryRoute ? 'summary' : 'plan';
  const switcher = (
    <PairSwitch
      label={`Plan ${pair.meta.id} documents`}
      active={active}
      planTo={planUrl}
      summaryTo={pair.summaryRoute ?? null}
    />
  );

  // The PLAN and SUMMARY tabs are the same per-type pages their artifact URLs open (the task
  // navigator, the run view), keyed by route so View/Source mode resets between them.
  if (active === 'summary' && pair.summaryRoute)
    return <ArtifactPage key="summary" route={pair.summaryRoute} switcher={switcher} />;
  return <ArtifactPage key="plan" route={planUrl} switcher={switcher} />;
}
