import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, History } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../components/empty-state.tsx';
import type {
  TraceabilityCoverage,
  TraceabilityCoveringPhase,
  TraceabilityDeferredTier,
  TraceabilityRow,
  TraceabilityViewModel,
} from '../../presentation/traceability.ts';
import {
  DEFAULT_TRACEABILITY_FILTER,
  matchesDeferredTraceabilityFilter,
  matchesTraceabilityFilter,
  type TraceabilityFilterState,
} from './traceability-filter.ts';

// Re-exported so the filter predicate stays reachable directly from the page module (its natural
// call site) while its DOM-free definition lives in traceability-filter.ts — the same seam
// roadmap-deep-link.ts establishes, which keeps this .tsx file (and the "jsx" compiler option it
// requires) out of the dependency graph of plain-.ts presentation tests (03-04-PLAN.md Task 3).
export {
  DEFAULT_TRACEABILITY_FILTER,
  matchesDeferredTraceabilityFilter,
  matchesTraceabilityFilter,
};
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

/** Renders the three-way covered/mismatched/uncovered partition as one proportional bar. Reused
 * verbatim for both the page-level aggregate (Task 1) and each category's own bar (Task 2) — both
 * read a TraceabilityCoverage, never recount rows themselves. The proportion is conveyed once to
 * assistive technology via the container's own role/aria-label; the three segments are aria-hidden
 * so they are never announced as three separate, unlabelled boxes. A zero-total scope renders no
 * bar at all rather than three zero-width segments. */
function CoverageBar({
  coverage,
  label,
}: {
  coverage: TraceabilityCoverage;
  label: string;
}): React.JSX.Element | null {
  if (coverage.total === 0) return null;
  const coveredPercent = (coverage.covered / coverage.total) * 100;
  const mismatchedPercent = (coverage.mismatched / coverage.total) * 100;
  const uncoveredPercent = (coverage.uncovered / coverage.total) * 100;
  return (
    <div
      className="trace-bar"
      role="img"
      aria-label={`${label}: ${coverage.covered} with a covering phase, ${coverage.mismatched} status mismatched, ${coverage.uncovered} uncovered`}
    >
      <span
        className="trace-bar-segment trace-bar-covered"
        aria-hidden="true"
        style={{ width: `${coveredPercent}%` }}
      />
      <span
        className="trace-bar-segment trace-bar-mismatched"
        aria-hidden="true"
        style={{ width: `${mismatchedPercent}%` }}
      />
      <span
        className="trace-bar-segment trace-bar-uncovered"
        aria-hidden="true"
        style={{ width: `${uncoveredPercent}%` }}
      />
    </div>
  );
}

/** The hierarchical replacement for the former ruled table (NS4-05). Since the list carries no
 * column headers, each row's secondary block names what it's showing via a micro-label — the
 * information the removed header row used to carry, kept without adding a heading row back. */
function TraceabilityRowList({
  rows,
  labelledBy,
}: {
  rows: TraceabilityRow[];
  labelledBy: string;
}): React.JSX.Element {
  return (
    <ul className="trace-rows" aria-labelledby={labelledBy}>
      {rows.map((row) => (
        <li key={row.id} className="trace-row">
          <div className="trace-row-primary">
            <strong className="trace-row-id">{row.id}</strong>
            <span className="trace-row-text">{row.text}</span>
          </div>
          <div className="trace-row-secondary">
            <div>
              <span className="trace-row-micro-label">Requirement status</span>
              <div className="trace-marker-stack">
                <RequirementStatusChip status={row.requirementStatus} />
                {row.statusDisagreement ? (
                  <span className="status-chip trace-marker" data-tone="destructive">
                    Status mismatch
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <span className="trace-row-micro-label">Covering phase</span>
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
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One tier's disclosure inside the reused History treatment (NS4-03, NS4-04, D-03). Reuses
 * roadmap-page.tsx's `HistoryMilestone` class names and ref-plus-effect idiom verbatim, but drives
 * the open effect from the toggle state and the tier's own match count rather than a fire-once
 * guard — the disclosure tracks the filter on every render instead of latching after the first.
 * The effect only ever opens a tier; it never forces one closed, so a tier the user opened by hand
 * stays open even after the toggle switches off. Filtering: off means every row in the tier
 * renders untouched; on means only matching rows render, and a tier left with no matches renders
 * nothing rather than an empty disclosure. */
function DeferredTierDisclosure({
  tier,
  filter,
}: {
  tier: TraceabilityDeferredTier;
  filter: TraceabilityFilterState;
}): React.JSX.Element | null {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const visibleRows = tier.rows.filter((row) => matchesDeferredTraceabilityFilter(row, filter));

  useEffect(() => {
    if (!filter.includeHistory) return;
    if (visibleRows.length > 0 && detailsRef.current) detailsRef.current.open = true;
  }, [filter.includeHistory, visibleRows.length]);

  if (visibleRows.length === 0) return null;

  const headingId = `trace-history-tier-${tier.tier.replaceAll(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
  return (
    <details className="history-milestone" ref={detailsRef}>
      <summary>
        <ChevronRight aria-hidden="true" />
        <span>
          <strong>{tier.tier}</strong>
          <small>
            {tier.rows.length} {tier.rows.length === 1 ? 'requirement' : 'requirements'}
          </small>
        </span>
      </summary>
      <div className="history-tree">
        <TraceabilityRowList rows={visibleRows} labelledBy={headingId} />
      </div>
    </details>
  );
}

export function TraceabilityPage(): React.JSX.Element {
  const traceability = useQuery({ queryKey: ['traceability'], queryFn: fetchTraceability });
  const [filter, setFilter] = useState<TraceabilityFilterState>(DEFAULT_TRACEABILITY_FILTER);

  // Carries `coverage` through unchanged from the source group — the category bar always reads
  // this unfiltered figure, never the filtered row subset the section happens to be showing, so
  // it stays a real proportion cue rather than one that shrinks as the user types.
  const filteredGroups = useMemo(() => {
    const data = traceability.data;
    if (!data) return [];
    return data.groups
      .map((group) => ({
        category: group.category,
        coverage: group.coverage,
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

      <section className="trace-summary" aria-label="Requirement coverage summary">
        <div className="trace-summary-headline">
          <div className="trace-coverage-percent">
            <span className="trace-coverage-percent-value">{view.coverage.coveragePercent}%</span>
            <span className="trace-coverage-percent-label">Traced</span>
            <p className="trace-coverage-percent-note">
              Counts requirements with a covering phase &mdash; not a measure of work completed.
            </p>
          </div>
          <CoverageBar coverage={view.coverage} label="Overall coverage" />
          <dl className="trace-stat-tiles">
            <div className="trace-stat-tile">
              <dt>Total</dt>
              <dd>{view.coverage.total}</dd>
            </div>
            <div className="trace-stat-tile">
              <dt>Uncovered</dt>
              <dd>{view.coverage.uncovered}</dd>
            </div>
            <div className="trace-stat-tile">
              <dt>Status mismatch</dt>
              <dd>{view.coverage.mismatched}</dd>
            </div>
          </dl>
        </div>

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
              All
            </button>
            <button
              type="button"
              className="trace-filter-button"
              data-active={filter.status === 'uncovered' ? 'true' : undefined}
              onClick={() => setFilter((current) => ({ ...current, status: 'uncovered' }))}
            >
              Uncovered
            </button>
            <button
              type="button"
              className="trace-filter-button"
              data-active={filter.status === 'disagreement' ? 'true' : undefined}
              onClick={() => setFilter((current) => ({ ...current, status: 'disagreement' }))}
            >
              Status mismatch
            </button>
          </div>
          <button
            type="button"
            className="trace-filter-button"
            data-active={filter.includeHistory ? 'true' : undefined}
            aria-pressed={filter.includeHistory}
            onClick={() =>
              setFilter((current) => ({ ...current, includeHistory: !current.includeHistory }))
            }
          >
            Search deferred tiers
          </button>
        </section>
      </section>

      {filteredGroups.length > 0 ? (
        filteredGroups.map((group) => {
          const headingId = `trace-category-${group.category.replaceAll(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
          return (
            <section key={group.category} className="trace-category" aria-labelledby={headingId}>
              <h2 id={headingId} className="search-group-label">
                {group.category}
              </h2>
              <div className="trace-category-bar">
                <CoverageBar coverage={group.coverage} label={`${group.category} coverage`} />
                <span className="trace-category-readout">
                  {group.coverage.covered}/{group.coverage.total} traced
                </span>
              </div>
              <TraceabilityRowList rows={group.rows} labelledBy={headingId} />
            </section>
          );
        })
      ) : view.groups.length === 0 ? (
        <EmptyState />
      ) : (
        <p className="empty-note">No requirements match the current filter.</p>
      )}

      {view.deferredTiers.length > 0 ? (
        <section className="history-section" aria-labelledby="trace-deferred-heading">
          <header className="section-heading">
            <div>
              <p className="eyebrow">Beyond the active tier</p>
              <h2 id="trace-deferred-heading">Deferred requirements</h2>
            </div>
            <History aria-hidden="true" />
          </header>
          <div className="history-list">
            {view.deferredTiers.map((tier) => (
              <DeferredTierDisclosure key={tier.tier} tier={tier} filter={filter} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
