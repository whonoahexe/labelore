import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { EmptyState } from '../components/empty-state.tsx';
import type {
  TraceabilityCoveringPhase,
  TraceabilityRow,
  TraceabilityViewModel,
} from '../../presentation/traceability.ts';
import {
  DEFAULT_TRACEABILITY_FILTER,
  matchesTraceabilityFilter,
  type TraceabilityFilterState,
} from './traceability-filter.ts';

// Re-exported so the filter predicate stays reachable directly from the page module (its natural
// call site) while its DOM-free definition lives in traceability-filter.ts — the same seam
// roadmap-deep-link.ts establishes, which keeps this .tsx file (and the "jsx" compiler option it
// requires) out of the dependency graph of plain-.ts presentation tests (03-04-PLAN.md Task 3).
export { DEFAULT_TRACEABILITY_FILTER, matchesTraceabilityFilter };
export type { TraceabilityFilterState, TraceabilityStatusFilter } from './traceability-filter.ts';

async function fetchTraceability(): Promise<TraceabilityViewModel> {
  const response = await fetch('/api/traceability', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Traceability request failed (${response.status})`);
  return (await response.json()) as TraceabilityViewModel;
}

function RequirementStatusChip({ status }: { status: boolean | null }): React.JSX.Element {
  if (status === null) {
    return (
      <span className="status-chip" data-tone="quiet">
        —
      </span>
    );
  }
  return (
    <span className="status-chip" data-tone={status ? 'complete' : 'quiet'}>
      {status ? 'Complete' : 'Incomplete'}
    </span>
  );
}

function CoveringPhaseEntry({
  rowId,
  covering,
  index,
}: {
  rowId: string;
  covering: TraceabilityCoveringPhase;
  index: number;
}): React.JSX.Element {
  if (covering.resolved && covering.url && covering.phaseName) {
    return (
      <li key={`${rowId}-covering-${index}`} className="trace-covering-entry">
        <Link to={covering.url}>{covering.phaseName}</Link>
        <span
          className="status-chip"
          data-tone={covering.phaseDiskStatus === 'complete' ? 'complete' : 'quiet'}
        >
          {(covering.phaseDiskStatus ?? 'unknown').replaceAll('_', ' ')}
        </span>
      </li>
    );
  }
  return (
    <li key={`${rowId}-covering-${index}`} className="trace-covering-entry">
      <span className="trace-dangling-text">{covering.raw}</span>
      <span className="status-chip" data-tone="destructive">
        Unresolved
      </span>
    </li>
  );
}

function TraceabilityRowCells({ row }: { row: TraceabilityRow }): React.JSX.Element {
  return (
    <>
      <td>
        <strong>{row.id}</strong>
      </td>
      <td>{row.text}</td>
      <td>
        <div className="trace-marker-stack">
          <RequirementStatusChip status={row.requirementStatus} />
          {row.statusDisagreement ? (
            <span className="status-chip trace-marker" data-tone="destructive">
              Status mismatch
            </span>
          ) : null}
        </div>
      </td>
      <td>
        {row.uncovered ? (
          <span className="status-chip trace-marker" data-tone="destructive">
            Uncovered
          </span>
        ) : (
          <ul className="trace-covering-list">
            {row.coveringPhases.map((covering, index) => (
              <CoveringPhaseEntry
                key={`${row.id}-covering-${index}`}
                rowId={row.id}
                covering={covering}
                index={index}
              />
            ))}
          </ul>
        )}
      </td>
    </>
  );
}

function TraceabilityTable({
  rows,
  captionId,
}: {
  rows: TraceabilityRow[];
  captionId: string;
}): React.JSX.Element {
  return (
    <div className="coverage-table-boundary">
      <table aria-labelledby={captionId}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Requirement</th>
            <th>Requirement status</th>
            <th>Covering phase</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <TraceabilityRowCells row={row} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TraceabilityPage(): React.JSX.Element {
  const traceability = useQuery({ queryKey: ['traceability'], queryFn: fetchTraceability });
  const [filter, setFilter] = useState<TraceabilityFilterState>(DEFAULT_TRACEABILITY_FILTER);

  const filteredGroups = useMemo(() => {
    const data = traceability.data;
    if (!data) return [];
    return data.groups
      .map((group) => ({
        category: group.category,
        rows: group.rows.filter((row) => matchesTraceabilityFilter(row, filter)),
      }))
      .filter((group) => group.rows.length > 0);
  }, [traceability.data, filter]);

  if (traceability.isPending) {
    return (
      <main className="page-stack" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
        <div className="roadmap-loading" aria-hidden="true" />
      </main>
    );
  }
  if (traceability.isError) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Connection error</p>
        <h1>The traceability view could not be loaded.</h1>
        <section className="notice destructive" role="alert">
          <h2>Request failed</h2>
          <p>{traceability.error.message}</p>
        </section>
      </main>
    );
  }

  const view = traceability.data;
  return (
    <main className="traceability-page page-stack">
      <header className="page-intro">
        <div>
          <p className="eyebrow">Requirement coverage</p>
          <h1>Traceability</h1>
          <p className="lede">
            Every requirement beside the state of the phase covering it — the requirement&rsquo;s
            own claimed status and the covering phase&rsquo;s own state travel as two separate
            signals, never merged into one verdict.
          </p>
        </div>
      </header>

      <section className="trace-filters" aria-label="Filter requirements">
        <input
          type="search"
          className="trace-filter-input"
          placeholder="Filter by ID or text"
          aria-label="Filter by requirement ID or text"
          value={filter.query}
          onChange={(event) =>
            setFilter((current) => ({ ...current, query: event.target.value }))
          }
        />
        <div className="trace-status-filters" role="group" aria-label="Filter by status">
          <button
            type="button"
            className="trace-filter-button"
            data-active={filter.status === 'all' ? 'true' : undefined}
            onClick={() => setFilter((current) => ({ ...current, status: 'all' }))}
          >
            All ({view.counts.total})
          </button>
          <button
            type="button"
            className="trace-filter-button"
            data-active={filter.status === 'uncovered' ? 'true' : undefined}
            onClick={() => setFilter((current) => ({ ...current, status: 'uncovered' }))}
          >
            Uncovered ({view.counts.uncovered})
          </button>
          <button
            type="button"
            className="trace-filter-button"
            data-active={filter.status === 'disagreement' ? 'true' : undefined}
            onClick={() => setFilter((current) => ({ ...current, status: 'disagreement' }))}
          >
            Status mismatch ({view.counts.disagreement})
          </button>
        </div>
      </section>

      {filteredGroups.length > 0 ? (
        filteredGroups.map((group) => {
          const headingId = `trace-category-${group.category.replaceAll(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
          return (
            <section key={group.category} className="trace-category" aria-labelledby={headingId}>
              <h2 id={headingId} className="search-group-label">
                {group.category}
              </h2>
              <TraceabilityTable rows={group.rows} captionId={headingId} />
            </section>
          );
        })
      ) : view.groups.length === 0 ? (
        <EmptyState />
      ) : (
        <p className="empty-note">No requirements match the current filter.</p>
      )}

      {view.deferredRows.length > 0 ? (
        <section className="trace-deferred" aria-labelledby="trace-deferred-heading">
          <h2 id="trace-deferred-heading" className="search-group-label">
            Deferred requirements
          </h2>
          <TraceabilityTable rows={view.deferredRows} captionId="trace-deferred-heading" />
        </section>
      ) : null}
    </main>
  );
}
