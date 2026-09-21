import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { buildCoverageMatrix, type CoverageStatement } from '../../presentation/coverage.ts';
import {
  buildMilestoneUrl,
  buildPhaseUrl,
  parsePresentationUrl,
  presentationRoutePatterns,
} from '../../presentation/routes.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { ArtifactHeader, type ArtifactCrumb } from '../components/artifact-header.tsx';
import { DocumentView } from './artifact-page.tsx';
import { dropLeadingTitle } from './document-title.ts';

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
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item),
      )
    : [];
}

function requirementIds(text: string, explicit?: unknown): string[] {
  const ids = [
    ...(typeof explicit === 'string' ? [explicit] : []),
    ...(text.match(/\b[A-Z][A-Z0-9]+-\d+\b/g) ?? []),
  ];
  return [...new Set(ids.map((id) => id.toUpperCase()))];
}

function truthRows(plan: DocumentResponse): CoverageStatement[] {
  const mustHaves = plan.artifact.frontmatter.must_haves;
  if (!mustHaves || typeof mustHaves !== 'object' || Array.isArray(mustHaves)) return [];
  const truths = (mustHaves as Record<string, unknown>).truths;
  return Array.isArray(truths)
    ? truths.flatMap((value, index) => {
        const text = typeof value === 'string' ? value : '';
        return text
          ? [{ key: `truth-${index + 1}`, text, requirementIds: requirementIds(text) }]
          : [];
      })
    : [];
}

function coverageRows(summary: DocumentResponse): CoverageStatement[] {
  return records(summary.artifact.frontmatter.coverage).flatMap((value, index) => {
    const text = typeof value.description === 'string' ? value.description : '';
    if (!text) return [];
    const key = typeof value.id === 'string' ? value.id : `coverage-${index + 1}`;
    return [{ key, text, requirementIds: requirementIds(text, value.requirement) }];
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Plan pair request failed (${response.status})`);
  return (await response.json()) as T;
}

async function loadPair(route: string): Promise<PlanPairResponse> {
  const presentation = await fetchJson<ProjectPresentation>('/api/presentation');
  const plan = presentation.milestones
    .flatMap((milestone) => milestone.phases)
    .flatMap((phase) => phase.plans)
    .find((candidate) => candidate.key === route);
  if (!plan) throw new Error('This plan is not present in the current snapshot.');
  const planDocument = await fetchJson<DocumentResponse>(
    `/api/documents?route=${encodeURIComponent(route)}`,
  );
  const meta = { id: plan.id, description: plan.description };
  if (!plan.summary) return { plan: planDocument, summary: null, meta };
  const summaryRoute = presentation.artifacts.find(
    (artifact) => artifact.path === plan.summary?.path,
  )?.key;
  if (!summaryRoute) return { plan: planDocument, summary: null, meta };
  const summaryDocument = await fetchJson<DocumentResponse>(
    `/api/documents?route=${encodeURIComponent(summaryRoute)}`,
  );
  return { plan: planDocument, summary: summaryDocument, meta };
}

export function PlanPairPage(): React.JSX.Element {
  const location = useLocation();
  const query = useQuery({
    queryKey: ['plan-pair', location.pathname],
    queryFn: () => loadPair(location.pathname),
    staleTime: Number.POSITIVE_INFINITY,
  });
  // F-02 (quick-260921-l4e): every GSD SUMMARY.md opens with its own `# Phase X Plan Y: … Summary`
  // title (the summary template's own convention) — rendered unmodified, that produces a second
  // <h1> directly under this page's own "Full summary" <h2>, duplicating the same words twice in
  // the accessibility tree. `dropLeadingTitle` is the same fix `ArtifactPage` already applies to
  // every single-document view; applied here to both halves of the pair for symmetry, even though
  // PLAN.md bodies don't normally carry a leading H1 of their own.
  const planDocument = useMemo(
    () =>
      query.data ? dropLeadingTitle(query.data.plan.document, query.data.plan.artifact.title) : null,
    [query.data],
  );
  const summaryDocument = useMemo(
    () =>
      query.data?.summary
        ? dropLeadingTitle(query.data.summary.document, query.data.summary.artifact.title)
        : null,
    [query.data],
  );

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
  const matrix = pair.summary
    ? buildCoverageMatrix(truthRows(pair.plan), coverageRows(pair.summary))
    : null;
  const parsed = parsePresentationUrl(location.pathname);
  const planRoute = parsed.ok && parsed.route.kind === 'plan' ? parsed.route : null;
  const crumbs: ArtifactCrumb[] = [
    { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
    { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
    ...(planRoute
      ? [
          {
            label: planRoute.milestoneVersion ?? 'Current milestone',
            to: buildMilestoneUrl(planRoute.milestoneVersion),
          },
          {
            label: `Phase ${planRoute.phaseIdentity.number}`,
            to: buildPhaseUrl(planRoute.phaseIdentity),
          },
        ]
      : []),
    { label: `Plan ${pair.meta.id}` },
  ];
  return (
    <main className="artifact-page plan-pair-page page-stack">
      <ArtifactHeader
        crumbs={crumbs}
        eyebrow="Plan and outcome"
        title={`Plan ${pair.meta.id}`}
        lead={pair.meta.description}
        path={pair.plan.artifact.path}
      >
        <nav className="plan-pair-jumps" aria-label="Plan review sections">
          {matrix ? <a href="#coverage-matrix">Coverage matrix</a> : null}
          <a href="#plan-document">Plan</a>
          {pair.summary ? <a href="#summary-document">Summary</a> : null}
        </nav>
      </ArtifactHeader>
      {!pair.summary ? (
        <aside className="notice plan-open-notice" role="status">
          <strong>Outcome not recorded yet</strong>
          <p>
            This plan is still open, so there is no paired summary. The complete authored plan
            remains available below.
          </p>
        </aside>
      ) : null}
      {matrix ? (
        <section id="coverage-matrix" className="coverage-matrix document-overflow-boundary">
          <h2>Truth to coverage</h2>
          <p>
            Exact authored matches precede conservative inferred matches. Unmatched rows remain
            visible.
          </p>
          <div className="coverage-table-boundary">
            <table>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Plan truth</th>
                  <th>Summary coverage</th>
                </tr>
              </thead>
              <tbody>
                {matrix.matches.map((match) => (
                  <tr key={`${match.truth.key}:${match.coverage.key}`}>
                    <td>
                      <span
                        className="status-chip"
                        data-tone={match.kind === 'exact' ? 'complete' : 'quiet'}
                      >
                        {match.kind}
                      </span>
                    </td>
                    <td>{match.truth.text}</td>
                    <td>{match.coverage.text}</td>
                  </tr>
                ))}
                {matrix.unmatchedTruths.map((truth) => (
                  <tr key={truth.key}>
                    <td>unmatched truth</td>
                    <td>{truth.text}</td>
                    <td>—</td>
                  </tr>
                ))}
                {matrix.unmatchedCoverage.map((coverage) => (
                  <tr key={coverage.key}>
                    <td>unmatched coverage</td>
                    <td>—</td>
                    <td>{coverage.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <section id="plan-document" className="plan-pair-document document-overflow-boundary">
        <p className="eyebrow">Authored intent</p>
        <h2>Full plan</h2>
        <DocumentView document={planDocument ?? pair.plan.document} />
      </section>
      {pair.summary ? (
        <section id="summary-document" className="plan-pair-document document-overflow-boundary">
          <p className="eyebrow">Recorded outcome</p>
          <h2>Full summary</h2>
          <DocumentView document={summaryDocument ?? pair.summary.document} />
        </section>
      ) : null}
    </main>
  );
}
