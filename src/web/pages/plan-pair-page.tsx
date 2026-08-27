import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { buildCoverageMatrix, type CoverageStatement } from '../../presentation/coverage.ts';
import { presentationRoutePatterns } from '../../presentation/routes.ts';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import { DocumentView } from './artifact-page.tsx';

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
  summary: DocumentResponse;
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
  if (!plan?.summary) throw new Error('This plan does not have a paired summary yet.');
  const summaryRoute = presentation.artifacts.find(
    (artifact) => artifact.path === plan.summary?.path,
  )?.key;
  if (!summaryRoute) throw new Error('The paired summary is not present in this snapshot.');
  const [planDocument, summaryDocument] = await Promise.all([
    fetchJson<DocumentResponse>(`/api/documents?route=${encodeURIComponent(route)}`),
    fetchJson<DocumentResponse>(`/api/documents?route=${encodeURIComponent(summaryRoute)}`),
  ]);
  return { plan: planDocument, summary: summaryDocument };
}

export function PlanPairPage(): React.JSX.Element {
  const location = useLocation();
  const query = useQuery({
    queryKey: ['plan-pair', location.pathname],
    queryFn: () => loadPair(location.pathname),
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (query.isPending)
    return (
      <main className="page-stack" aria-busy="true">
        <h1>Loading plan review…</h1>
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
  const matrix = buildCoverageMatrix(truthRows(pair.plan), coverageRows(pair.summary));
  return (
    <main className="artifact-page plan-pair-page">
      <nav className="artifact-breadcrumbs" aria-label="Breadcrumb">
        <Link to={presentationRoutePatterns.dashboard}>Dashboard</Link>
        <span>/</span>
        <Link to={presentationRoutePatterns.roadmap}>Roadmap</Link>
        <span>/</span>
        <span aria-current="page">{pair.plan.artifact.title}</span>
      </nav>
      <header className="artifact-heading">
        <p className="eyebrow">Plan and outcome</p>
        <h1>{pair.plan.artifact.title}</h1>
        <nav className="plan-pair-jumps" aria-label="Plan review sections">
          <a href="#coverage-matrix">Coverage matrix</a>
          <a href="#plan-document">Plan</a>
          <a href="#summary-document">Summary</a>
        </nav>
      </header>
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
                      data-tone={match.kind === 'exact' ? 'complete' : 'active'}
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
      <section id="plan-document" className="plan-pair-document document-overflow-boundary">
        <p className="eyebrow">Authored intent</p>
        <h2>Full plan</h2>
        <DocumentView document={pair.plan.document} />
      </section>
      <section id="summary-document" className="plan-pair-document document-overflow-boundary">
        <p className="eyebrow">Recorded outcome</p>
        <h2>Full summary</h2>
        <DocumentView document={pair.summary.document} />
      </section>
    </main>
  );
}
