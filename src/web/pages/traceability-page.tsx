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
      <span className="status-chip" data-signal="requirement" data-tone="quiet">
        —
      </span>
    );
  }
  return (
    <span
      className="status-chip"
      data-tone={status ? 'complete' : 'quiet'}
      data-signal="requirement"
    >
      {status ? 'Checked' : 'Unchecked'}
    </span>
  );
}

/** A3: an actively-worked covering phase and one with no directory on disk are no longer the same
 * grey chip. Module-level so the mapping is a single, testable fact rather than inlined per call
 * site; an unrecognised or missing disk status falls back to 'quiet' rather than being dropped. */
const COVERING_PHASE_TONE_BY_DISK_STATUS: Record<string, 'complete' | 'in-flight' | 'missing'> = {
  complete: 'complete',
  in_progress: 'in-flight',
  researched: 'in-flight',
  no_directory: 'missing',
};

function coveringPhaseTone(diskStatus: string | null): 'complete' | 'in-flight' | 'missing' | 'quiet' {
  if (diskStatus === null) return 'quiet';
  return COVERING_PHASE_TONE_BY_DISK_STATUS[diskStatus] ?? 'quiet';
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
          data-signal="phase"
          data-tone={coveringPhaseTone(covering.phaseDiskStatus)}
        >
          {(covering.phaseDiskStatus ?? 'unknown').replaceAll('_', ' ')}
        </span>
      </li>
    );
  }
  return (
    <li key={`${rowId}-covering-${index}`} className="trace-covering-entry">
      <span className="trace-dangling-text">{covering.raw}</span>
      <span className="status-chip" data-signal="phase" data-tone="destructive">
        Unresolved
      </span>
    </li>
  );
}

/** Renders the five-bucket phase-sourced partition as one proportional bar, in partition order:
 * complete / in-flight / missing / unresolved / uncovered. Reused verbatim for both the
 * page-level aggregate (Task 1) and each category's own bar (Task 2) — both read a
 * TraceabilityCoverage, never recount rows themselves. The proportion is conveyed once to
 * assistive technology via the container's own role/aria-label; the five segments are aria-hidden
 * so they are never announced as five separate, unlabelled boxes. A zero-total scope renders no
 * bar at all rather than five zero-width segments. */
function CoverageBar({
  coverage,
  label,
}: {
  coverage: TraceabilityCoverage;
  label: string;
}): React.JSX.Element | null {
  if (coverage.total === 0) return null;
  const total = coverage.total;
  return (
    <div
      className="trace-bar"
      role="img"
      aria-label={`${label}: ${coverage.completePhase} with a complete covering phase, ${coverage.inFlightPhase} in flight, ${coverage.missingPhase} with no covering phase directory, ${coverage.unresolvedPhase} unresolved, ${coverage.uncovered} uncovered`}
    >
      <span
        className="trace-bar-segment trace-bar-complete"
        aria-hidden="true"
        style={{ width: `${(coverage.completePhase / total) * 100}%` }}
      />
      <span
        className="trace-bar-segment trace-bar-in-flight"
        aria-hidden="true"
        style={{ width: `${(coverage.inFlightPhase / total) * 100}%` }}
      />
      <span
        className="trace-bar-segment trace-bar-missing"
        aria-hidden="true"
        style={{ width: `${(coverage.missingPhase / total) * 100}%` }}
      />
      <span
        className="trace-bar-segment trace-bar-unresolved"
        aria-hidden="true"
        style={{ width: `${(coverage.unresolvedPhase / total) * 100}%` }}
      />
      <span
        className="trace-bar-segment trace-bar-uncovered"
        aria-hidden="true"
        style={{ width: `${(coverage.uncovered / total) * 100}%` }}
      />
    </div>
  );
}

/** The hierarchical replacement for the former ruled table (NS4-05). quick-260918-qkd Task 3
 * (D4): the visible per-row micro-labels — really column headers repeated on every row — are gone;
 * the accessible name they carried survives as an `sr-only` span with the same words, since the
 * chips are self-identifying after Task 2 (Checked/Unchecked plus a source marker on the phase
 * chip). quick-260917-wba Task 3: the optional `variant` prop drives a deferred-tier presentation —
 * every deferred row has a null requirement status by construction, so the Requirement-status
 * block (and its guaranteed-em-dash chip) is noise there; a deferred row with no covering phase
 * reads as "not yet scheduled" in a quiet tone rather than the alarming destructive "Uncovered"
 * chip the default (active-tier) variant still shows. The default variant's markup is
 * structurally identical to before this task. */
function TraceabilityRowList({
  rows,
  labelledBy,
  variant = 'default',
}: {
  rows: TraceabilityRow[];
  labelledBy: string;
  variant?: 'default' | 'deferred';
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
            {variant !== 'deferred' ? (
              <div>
                <span className="sr-only">Requirement status</span>
                <div className="trace-marker-stack">
                  <RequirementStatusChip status={row.requirementStatus} />
                  {row.statusDisagreement ? (
                    <span className="status-chip trace-marker" data-tone="destructive">
                      Status mismatch
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
            {variant === 'deferred' && row.uncovered ? (
              <div>
                <span className="status-chip trace-marker" data-tone="quiet">
                  Not yet scheduled
                </span>
              </div>
            ) : (
              <div>
                <span className="sr-only">Covering phase</span>
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
            )}
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
        <TraceabilityRowList rows={visibleRows} labelledBy={headingId} variant="deferred" />
      </div>
    </details>
  );
}

/** E2: the deferred-tier switch governs whether the query/status filter *reaches* the deferred
 * tiers, not whether they're shown — "engaged" means the filter would actually narrow anything if
 * it did reach them, so the unfiltered-tiers note (E1/E2) only appears when there's something to
 * warn about. */
function isFilterEngaged(filter: TraceabilityFilterState): boolean {
  return filter.status !== 'all' || filter.query.trim().length > 0;
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
            <span className="trace-coverage-percent-value">
              {view.coverage.completePhasePercent}%
            </span>
            <span className="trace-coverage-percent-label">Covered by complete phases</span>
            <p className="trace-coverage-percent-note">
              {view.coverage.tracedPercent}% of requirements name a covering phase at all &mdash;
              this headline counts only those whose covering phase is finished on disk. A
              requirement&rsquo;s own checkbox is reported separately as the Checked tile below.
            </p>
          </div>
          <CoverageBar coverage={view.coverage} label="Overall coverage" />
          <dl className="trace-stat-tiles">
            <div className="trace-stat-tile" data-bucket="total">
              <dt>Total</dt>
              <dd>{view.coverage.total}</dd>
            </div>
            <div className="trace-stat-tile" data-bucket="complete">
              <dt>Complete phase</dt>
              <dd>{view.coverage.completePhase}</dd>
            </div>
            <div className="trace-stat-tile" data-bucket="in-flight">
              <dt>In flight</dt>
              <dd>{view.coverage.inFlightPhase}</dd>
            </div>
            <div className="trace-stat-tile" data-bucket="missing">
              <dt>No directory</dt>
              <dd>{view.coverage.missingPhase}</dd>
            </div>
            <div className="trace-stat-tile" data-bucket="uncovered">
              <dt>Uncovered</dt>
              <dd>{view.coverage.uncovered}</dd>
            </div>
            {view.coverage.unresolvedPhase > 0 ? (
              <div className="trace-stat-tile" data-bucket="unresolved">
                <dt>Unresolved</dt>
                <dd>{view.coverage.unresolvedPhase}</dd>
              </div>
            ) : null}
            <div className="trace-requirement-stat-tiles">
              <div className="trace-stat-tile">
                <dt>Checked</dt>
                <dd>{view.coverage.claimedComplete}</dd>
              </div>
              {view.coverage.mismatched > 0 ? (
                <div className="trace-stat-tile">
                  <dt>Status mismatch</dt>
                  <dd>{view.coverage.mismatched}</dd>
                </div>
              ) : null}
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
              disabled={view.coverage.mismatched === 0}
              onClick={() => setFilter((current) => ({ ...current, status: 'disagreement' }))}
            >
              Status mismatch
            </button>
          </div>
          <button
            type="button"
            className="trace-toggle"
            role="switch"
            data-active={filter.includeHistory ? 'true' : undefined}
            aria-checked={filter.includeHistory}
            onClick={() =>
              setFilter((current) => ({ ...current, includeHistory: !current.includeHistory }))
            }
          >
            <span className="trace-toggle-track" aria-hidden="true">
              <span className="trace-toggle-thumb" />
            </span>
            Filter deferred tiers too
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
                  {group.coverage.completePhase}/{group.coverage.total} complete
                </span>
              </div>
              <TraceabilityRowList rows={group.rows} labelledBy={headingId} />
            </section>
          );
        })
      ) : view.groups.length === 0 ? (
        <EmptyState />
      ) : (
        <p className="empty-note">No active-tier requirements match the current filter.</p>
      )}

      {view.deferredTiers.length > 0 ? (
        <section className="history-section" aria-labelledby="trace-deferred-heading">
          <header className="section-heading">
            <div>
              <p className="eyebrow">Beyond the active tier</p>
              <h2 id="trace-deferred-heading">Deferred requirements</h2>
              {!filter.includeHistory && isFilterEngaged(filter) ? (
                <p className="trace-deferred-filter-note">
                  The deferred tiers below are shown unfiltered.
                </p>
              ) : null}
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
