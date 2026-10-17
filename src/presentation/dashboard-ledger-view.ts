// Pure filter, lead, paging and date helpers for the dashboard ledger sections (quick-261018-4tb,
// sketch 026 B + P1). Shared by the view model and the page, with no node:* or React imports, so a
// section's rules (which blocker leads, what a page holds) are testable without rendering.
import type { LedgerBlockerDto, LedgerDecisionDto } from '../server/dashboard-ledger.ts';
import { activityDateLabel } from './dashboard-head.ts';

/** Trimmed, case-insensitive substring match across the parts; an empty query matches anything. */
export function matchesQuery(query: string, ...parts: (string | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

/** The group key an ungrouped blocker is filed under. */
export const UNGROUPED_BLOCKER = 'Other';

export interface BlockerFilter {
  /** A group key, or null for every group. */
  group: string | null;
  untagged: boolean;
  /** Include blockers marked resolved. */
  resolved: boolean;
  query: string;
}

/** A blocker that names no document: its text is the whole record. */
export function isUntagged(blocker: LedgerBlockerDto): boolean {
  return blocker.sources.length === 0;
}

export function filterBlockers(blockers: LedgerBlockerDto[], filter: BlockerFilter): LedgerBlockerDto[] {
  return blockers.filter(
    (blocker) =>
      (filter.resolved || !blocker.resolved) &&
      (filter.group === null || (blocker.group ?? UNGROUPED_BLOCKER) === filter.group) &&
      (!filter.untagged || isUntagged(blocker)) &&
      matchesQuery(
        filter.query,
        blocker.title,
        blocker.why,
        blocker.group,
        blocker.tag,
        ...blocker.sources.map((source) => `${source.kind} ${source.label} ${source.detail ?? ''}`),
      ),
  );
}

/** The big sentence of the band: the first urgent open blocker in view, else the first open one,
 * else the first of anything in view. */
export function blockingLead(shown: LedgerBlockerDto[]): LedgerBlockerDto | null {
  return (
    shown.find((blocker) => blocker.urgent && !blocker.resolved) ??
    shown.find((blocker) => !blocker.resolved) ??
    shown[0] ??
    null
  );
}

export interface BlockerGroup {
  key: string;
  label: string;
  count: number;
}

/** Legend entries for the open blockers, in first-seen order. A label is the group name cut at its
 * first " —" or " (". */
export function blockerGroups(open: LedgerBlockerDto[]): BlockerGroup[] {
  const groups = new Map<string, number>();
  for (const blocker of open) {
    const key = blocker.group ?? UNGROUPED_BLOCKER;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups].map(([key, count]) => ({ key, label: key.split(/\s+[—(]/)[0], count }));
}

export interface Pager {
  /** The page, zero-based, clamped into range. */
  page: number;
  pages: number;
  /** Index of the first item on the page. */
  start: number;
  /** Index one past the last item on the page. */
  end: number;
  /** "Showing 1–5 of 14", or "Showing 6 of 6" for a page holding one item. */
  label: string;
}

export function pageOf(total: number, size: number, page: number): Pager {
  const pages = Math.ceil(total / size);
  const current = Math.min(Math.max(0, page), Math.max(0, pages - 1));
  const start = current * size;
  const end = Math.min(total, start + size);
  const range = end - start === 1 ? String(end) : `${start + 1}–${end}`;
  return { page: current, pages, start, end, label: total > 0 ? `Showing ${range} of ${total}` : '' };
}

/** Today, Yesterday, "3 days ago" under a week, else "11 Oct" ("25 Oct 2025" in another year).
 * Empty for a value that is not date-shaped. */
export function relativeDay(iso: string | null, readAt: string): string {
  const day = iso?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!day) return '';
  const days = Math.round((Date.parse(readAt.slice(0, 10)) - Date.parse(day)) / 86_400_000);
  if (Number.isNaN(days)) return '';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return activityDateLabel(day, readAt) ?? '';
}

// ---------- decisions ----------

/** The phase key of a decision with no phase. */
export const NO_PHASE = '—';

const phaseKeyOf = (decision: LedgerDecisionDto): string => decision.phase ?? NO_PHASE;

export interface DecisionFilter {
  /** A phase key (`01`, or NO_PHASE), or null for every phase. */
  phase: string | null;
  query: string;
}

export function filterDecisions(decisions: LedgerDecisionDto[], filter: DecisionFilter): LedgerDecisionDto[] {
  return decisions.filter(
    (decision) =>
      (filter.phase === null || phaseKeyOf(decision) === filter.phase) &&
      matchesQuery(filter.query, decision.title, decision.why, decision.plan, decision.phase),
  );
}

export interface PhaseCount {
  key: string;
  count: number;
}

/** Decisions per phase. `rail` is the order of the phase rail (newest phase first, no phase last);
 * `histogram` is its reverse, left to right. */
export function decisionPhaseCounts(decisions: LedgerDecisionDto[]): {
  rail: PhaseCount[];
  histogram: PhaseCount[];
} {
  const counts = new Map<string, number>();
  for (const decision of decisions) counts.set(phaseKeyOf(decision), (counts.get(phaseKeyOf(decision)) ?? 0) + 1);
  const rail = [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => {
      const noneFirst = Number(left.key === NO_PHASE) - Number(right.key === NO_PHASE);
      return noneFirst || parseFloat(right.key) - parseFloat(left.key);
    });
  return { rail, histogram: [...rail].reverse() };
}

/** A page of decisions grouped by phase, in rail order, keeping each group's newest-first order. */
export function groupByPhase(items: LedgerDecisionDto[]): { key: string; items: LedgerDecisionDto[] }[] {
  return decisionPhaseCounts(items).rail.map(({ key }) => ({
    key,
    items: items.filter((decision) => phaseKeyOf(decision) === key),
  }));
}
