// Pure server-side projection joining each requirement to the state of the phase(s) covering it
// (D-13/D-14/D-15/D-16, NAV-05). Both status signals — the requirement's own claimed status and
// the covering phase's own state — travel end to end as separate fields; this module never
// computes a merged/derived verdict from them (see 03-04-PLAN.md's prohibitions and
// T-03-04-04). No filesystem I/O, no second walk of the planning tree — same shape as
// roadmap.ts and coverage.ts.
import { phaseNumberFromTraceabilityText } from '../planning-repo/crossref.ts';
import type { RequirementItem } from '../planning-repo/handlers/requirements.ts';
import { comparePhaseNumbers, parseMilestoneFileName } from '../planning-repo/naming.ts';
import type {
  ArtifactDto,
  PhaseDto,
  ProjectPresentation,
  RequirementDto,
} from '../server/project-presentation.ts';
import { projectSectionLead } from './dashboard-head.ts';
import { milestoneRecords } from './roadmap.ts';
import { buildPhaseUrl } from './routes.ts';

export interface TraceabilityCoveringPhase {
  raw: string;
  phaseKey: string | null;
  url: string | null;
  resolved: boolean;
  phaseName: string | null;
  phaseDiskStatus: string | null;
  phaseRoadmapComplete: boolean | null;
}

export interface TraceabilityRow {
  id: string;
  category: string;
  text: string;
  tier: string;
  /** The requirement's own claimed value, sourced from its checkbox — never combined with the
   * covering phase's own state below. */
  requirementStatus: boolean | null;
  coveringPhases: TraceabilityCoveringPhase[];
  uncovered: boolean;
  hasUnresolvedReference: boolean;
  /** Derived solely to make a row findable by the filter — sits alongside both source values and
   * never replaces either. */
  statusDisagreement: boolean;
}

export interface TraceabilityCounts {
  total: number;
  uncovered: number;
  disagreement: number;
}

/** A disjoint five-way partition of a row scope (the whole view, or a single category), derived
 * solely from each row's covering phase(s) — never from the requirement's own checkbox. Every row
 * lands in exactly one of completePhase/inFlightPhase/missingPhase/unresolvedPhase/uncovered, and
 * the five always sum to total. A row covered by more than one phase lands in the weakest bucket
 * among them (complete beats in-flight beats missing beats unresolved), so a requirement split
 * across a finished phase and an unfinished one is never reported as finished.
 *
 * `claimedComplete` is the requirement side's own tally — rows whose own `requirementStatus` is
 * `true` — computed without reading any covering phase at all. `mismatched` is deliberately not a
 * partition bucket: it is `disagreesWithAnyCovering()`'s own count, reported as a sibling figure so
 * the partition itself can never silently become a merged, two-signal verdict.
 *
 * `tracedPercent` is `(total - uncovered) / total`: the share of requirements that name a covering
 * phase at all, regardless of that phase's state — the figure the page's headline used to report.
 * `completePhasePercent` is `completePhase / total`: the share whose covering phase is finished on
 * disk, which is what the headline reports now. Both round to a whole number and are both 0 for an
 * empty scope rather than dividing by zero. */
export interface TraceabilityCoverage {
  total: number;
  completePhase: number;
  inFlightPhase: number;
  missingPhase: number;
  unresolvedPhase: number;
  uncovered: number;
  tracedPercent: number;
  completePhasePercent: number;
  claimedComplete: number;
  mismatched: number;
}

export interface TraceabilityGroup {
  category: string;
  rows: TraceabilityRow[];
  /** This category's own coverage, computed over its own rows only — independent of any sibling
   * category's figures and never recomputed from a filtered subset (see Task 2's
   * filteredGroups note in traceability-page.tsx). */
  coverage: TraceabilityCoverage;
}

/** Deferred (checkbox-less) rows grouped by their raw tier heading string — the discretion
 * resolution in 260917-ns4-PLAN.md fixes History grouping to the tier string alone. The archived
 * per-milestone REQUIREMENTS.md corpora reach this projection only as `archivedMilestones`, never
 * as deferred tiers. */
export interface TraceabilityDeferredTier {
  tier: string;
  rows: TraceabilityRow[];
}

/** One category of an archived milestone's checkbox requirements, in first-appearance order. */
export interface TraceabilityArchivedCategory {
  category: string;
  rows: TraceabilityRow[];
}

/** One archived `milestones/vX.Y-REQUIREMENTS.md`, projected for reference. Each row's covering
 * phases are resolved against THAT archived milestone's own phases. */
export interface TraceabilityArchivedMilestone {
  version: string;
  title: string;
  sourcePath: string;
  total: number;
  groups: TraceabilityArchivedCategory[];
}

export interface TraceabilityViewModel {
  /** The lead of PROJECT.md's Core Value section — the page's lede — or null without one. */
  coreValue: string | null;
  groups: TraceabilityGroup[];
  deferredRows: TraceabilityRow[];
  deferredTiers: TraceabilityDeferredTier[];
  counts: TraceabilityCounts;
  coverage: TraceabilityCoverage;
  /** Previous milestones' requirements, newest version first — read-only reference. Never counted
   * in groups, deferredRows, deferredTiers, counts or coverage. */
  archivedMilestones: TraceabilityArchivedMilestone[];
}

function phasesByKey(presentation: ProjectPresentation): Map<string, PhaseDto> {
  const byKey = new Map<string, PhaseDto>();
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) byKey.set(phase.key, phase);
  }
  return byKey;
}

function coveringPhaseOf(
  reference: RequirementDto['coveringPhases'][number],
  phaseByKey: Map<string, PhaseDto>,
): TraceabilityCoveringPhase {
  // A reference whose targetPhaseKey is null while its raw string is non-empty is, by
  // construction, the dangling case (D-15) — no new resolution logic is required here, this is a
  // rendering rule over data the presentation already resolved correctly.
  const phase = reference.targetPhaseKey
    ? (phaseByKey.get(reference.targetPhaseKey) ?? null)
    : null;
  if (!phase) {
    return {
      raw: reference.raw,
      phaseKey: reference.targetPhaseKey,
      url: null,
      resolved: false,
      phaseName: null,
      phaseDiskStatus: null,
      phaseRoadmapComplete: null,
    };
  }
  return {
    raw: reference.raw,
    phaseKey: phase.key,
    url: buildPhaseUrl(phase.identity),
    resolved: true,
    phaseName: phase.name,
    phaseDiskStatus: phase.diskStatus,
    phaseRoadmapComplete: phase.roadmapComplete,
  };
}

/** A requirement's own checkbox and a covering phase's own observed disk status are two
 * independent claims about the same work. This flags a disagreement between them without ever
 * combining the two into a third value. */
function disagreesWithAnyCovering(
  requirementStatus: boolean | null,
  coveringPhases: TraceabilityCoveringPhase[],
): boolean {
  if (requirementStatus === null) return false;
  return coveringPhases.some((covering) => {
    if (!covering.resolved) return false;
    const phaseComplete = covering.phaseDiskStatus === 'complete';
    return phaseComplete !== requirementStatus;
  });
}

type CoveringRank = 0 | 1 | 2 | 3;

/** Ordinal rank of a single covering phase's state — unresolved lowest, then no-directory, then
 * on-disk-but-not-complete, then complete highest. `diskStatus === 'complete'` is the complete
 * rank; `diskStatus === 'no_directory'` is the missing rank; every other non-null status
 * (`'in_progress'`, `'researched'`, or any future value `assemble.ts` might add) degrades to the
 * in-flight rank rather than being dropped, so an unrecognised status still reads as "something
 * exists, it is not finished" instead of silently vanishing from the partition. */
function coveringRank(covering: TraceabilityCoveringPhase): CoveringRank {
  if (!covering.resolved) return 0;
  if (covering.phaseDiskStatus === 'complete') return 3;
  if (covering.phaseDiskStatus === 'no_directory') return 1;
  return 2;
}

/** Derives the disjoint five-bucket phase-sourced partition (see TraceabilityCoverage) from a row
 * scope. Module-local: both the whole-view coverage and each group's own coverage call this same
 * function over their own rows so the two can never drift apart via a second, divergent counting
 * rule. A row with no covering phase at all short-circuits to uncovered before any rank is taken;
 * a row with one or more covering phases lands in the bucket of the weakest (lowest-ranked) one. */
function coverageOf(rows: TraceabilityRow[]): TraceabilityCoverage {
  const total = rows.length;
  let completePhase = 0;
  let inFlightPhase = 0;
  let missingPhase = 0;
  let unresolvedPhase = 0;
  let uncovered = 0;

  for (const row of rows) {
    if (row.coveringPhases.length === 0) {
      uncovered += 1;
      continue;
    }
    const weakestRank = Math.min(...row.coveringPhases.map(coveringRank)) as CoveringRank;
    if (weakestRank === 3) completePhase += 1;
    else if (weakestRank === 2) inFlightPhase += 1;
    else if (weakestRank === 1) missingPhase += 1;
    else unresolvedPhase += 1;
  }

  const claimedComplete = rows.filter((row) => row.requirementStatus === true).length;
  const mismatched = rows.filter((row) => row.statusDisagreement).length;
  const tracedPercent = total === 0 ? 0 : Math.round(((total - uncovered) / total) * 100);
  const completePhasePercent = total === 0 ? 0 : Math.round((completePhase / total) * 100);

  return {
    total,
    completePhase,
    inFlightPhase,
    missingPhase,
    unresolvedPhase,
    uncovered,
    tracedPercent,
    completePhasePercent,
    claimedComplete,
    mismatched,
  };
}

function traceabilityRow(
  requirement: RequirementDto,
  phaseByKey: Map<string, PhaseDto>,
): TraceabilityRow {
  const coveringPhases = requirement.coveringPhases.map((reference) =>
    coveringPhaseOf(reference, phaseByKey),
  );
  return {
    id: requirement.id,
    category: requirement.category,
    text: requirement.text,
    tier: requirement.tier,
    requirementStatus: requirement.checked,
    coveringPhases,
    uncovered: coveringPhases.length === 0,
    hasUnresolvedReference: coveringPhases.some((covering) => !covering.resolved),
    statusDisagreement: disagreesWithAnyCovering(requirement.checked, coveringPhases),
  };
}

function isRequirementItem(value: unknown): value is RequirementItem {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<RequirementItem>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.category === 'string' &&
    typeof entry.text === 'string' &&
    typeof entry.tier === 'string' &&
    (typeof entry.checked === 'boolean' || entry.checked === null)
  );
}

interface TraceabilityCellLike {
  requirementId: string;
  phase: string;
}

function isTraceabilityCell(value: unknown): value is TraceabilityCellLike {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<TraceabilityCellLike>;
  return typeof entry.requirementId === 'string' && typeof entry.phase === 'string';
}

function archivedMilestoneOf(
  artifact: ArtifactDto,
  presentation: ProjectPresentation,
  phaseByKey: Map<string, PhaseDto>,
  records: ReturnType<typeof milestoneRecords>,
): TraceabilityArchivedMilestone | null {
  const parsed = parseMilestoneFileName(artifact.path.split('/').pop() ?? '');
  if (!parsed.matched || parsed.document.toUpperCase() !== 'REQUIREMENTS') return null;
  const version = parsed.version;

  const rawItems = artifact.structured.items;
  const items = (Array.isArray(rawItems) ? rawItems : [])
    .filter(isRequirementItem)
    .filter((entry) => entry.checked !== null);
  if (items.length === 0) return null;

  // A live milestone is never used: its "Phase 1" is the current work, not this archive's.
  const milestone =
    presentation.milestones.find(
      (candidate) => candidate.archived && candidate.version?.toLowerCase() === version.toLowerCase(),
    ) ?? null;

  const rawCells = artifact.structured.traceability;
  const referencesById = new Map<string, RequirementDto['coveringPhases']>();
  for (const cell of (Array.isArray(rawCells) ? rawCells : []).filter(isTraceabilityCell)) {
    const number = phaseNumberFromTraceabilityText(cell.phase);
    const target =
      milestone && number !== null
        ? (milestone.phases.find((candidate) => comparePhaseNumbers(candidate.identity.number, number) === 0) ??
          null)
        : null;
    const reference = { raw: cell.phase, targetPhaseKey: target?.key ?? null };
    const existing = referencesById.get(cell.requirementId);
    if (existing) existing.push(reference);
    else referencesById.set(cell.requirementId, [reference]);
  }

  const categoryOrder: string[] = [];
  const rowsByCategory = new Map<string, TraceabilityRow[]>();
  for (const entry of items) {
    const row = traceabilityRow(
      {
        id: entry.id,
        category: entry.category,
        text: entry.text,
        tier: entry.tier,
        checked: entry.checked,
        coveringPhases: referencesById.get(entry.id) ?? [],
      },
      phaseByKey,
    );
    let rows = rowsByCategory.get(row.category);
    if (!rows) {
      rows = [];
      rowsByCategory.set(row.category, rows);
      categoryOrder.push(row.category);
    }
    rows.push(row);
  }

  const record = records.get(version.toLowerCase());
  const title = record
    ? `${version} ${record.name}`
    : milestone && milestone.name !== version
      ? milestone.name
      : version;
  return {
    version,
    title,
    sourcePath: artifact.path,
    total: items.length,
    groups: categoryOrder.map((category) => ({ category, rows: rowsByCategory.get(category) ?? [] })),
  };
}

/** Archived `milestones/vX.Y-REQUIREMENTS.md` snapshots, newest version first. Reads only the
 * presentation DTO (no filesystem), and skips anything malformed rather than throwing. */
function archivedMilestonesOf(
  presentation: ProjectPresentation,
  phaseByKey: Map<string, PhaseDto>,
): TraceabilityArchivedMilestone[] {
  const records = milestoneRecords(presentation);
  const archives: TraceabilityArchivedMilestone[] = [];
  for (const artifact of presentation.artifacts) {
    if (artifact.kind !== 'requirements' || artifact.location !== 'milestone-root') continue;
    const archive = archivedMilestoneOf(artifact, presentation, phaseByKey, records);
    if (archive) archives.push(archive);
  }
  return archives.sort((left, right) =>
    right.version.localeCompare(left.version, undefined, { numeric: true }),
  );
}

export function buildTraceabilityViewModel(
  presentation: ProjectPresentation,
): TraceabilityViewModel {
  const phaseByKey = phasesByKey(presentation);
  // Groups are ordered by first appearance in the requirements array — a Map preserves insertion
  // order, so no separate sort step is needed and no alphabetical re-sort is introduced.
  const groupOrder: string[] = [];
  const rowsByCategory = new Map<string, TraceabilityRow[]>();
  const deferredRows: TraceabilityRow[] = [];
  // Same insertion-ordered-Map idiom as the category grouping above — first-appearance order,
  // no alphabetical re-sort.
  const tierOrder: string[] = [];
  const rowsByTier = new Map<string, TraceabilityRow[]>();

  for (const requirement of presentation.requirements) {
    const row = traceabilityRow(requirement, phaseByKey);
    // REQUIREMENTS.md's tier heading is an open string, not a closed 'v1'/'v2'/'future' enum
    // (domain/model.ts's own comment on Requirement.tier) — a project on its third milestone (see
    // fixtures/dense: "v3.0 Requirements" / "v4.0 Requirements") never carries a literal "v1"
    // heading at all. The portable signal for "actionable, current tier" is the one the parser
    // itself already uses to distinguish them: a v1-shaped item carries a checkbox
    // (`requirement.checked !== null`); a v2/future item carries none (handlers/requirements.ts).
    // Matching the literal string 'v1' would silently empty the main table on every project past
    // its first milestone — a TGT-03 regression this fixture-backed test exists to catch.
    if (requirement.checked === null) {
      deferredRows.push(row);
      let tierRows = rowsByTier.get(row.tier);
      if (!tierRows) {
        tierRows = [];
        rowsByTier.set(row.tier, tierRows);
        tierOrder.push(row.tier);
      }
      tierRows.push(row);
      continue;
    }
    let rows = rowsByCategory.get(row.category);
    if (!rows) {
      rows = [];
      rowsByCategory.set(row.category, rows);
      groupOrder.push(row.category);
    }
    rows.push(row);
  }

  const groups: TraceabilityGroup[] = groupOrder.map((category) => {
    const rows = rowsByCategory.get(category) ?? [];
    return { category, rows, coverage: coverageOf(rows) };
  });
  const deferredTiers: TraceabilityDeferredTier[] = tierOrder.map((tier) => ({
    tier,
    rows: rowsByTier.get(tier) ?? [],
  }));
  const allRows = groups.flatMap((group) => group.rows);
  return {
    coreValue: projectSectionLead(presentation, /^core value\b/i),
    groups,
    deferredRows,
    deferredTiers,
    counts: {
      total: allRows.length,
      uncovered: allRows.filter((row) => row.uncovered).length,
      disagreement: allRows.filter((row) => row.statusDisagreement).length,
    },
    coverage: coverageOf(allRows),
    archivedMilestones: archivedMilestonesOf(presentation, phaseByKey),
  };
}
