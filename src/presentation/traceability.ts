// Pure server-side projection joining each requirement to the state of the phase(s) covering it
// (D-13/D-14/D-15/D-16, NAV-05). Both status signals — the requirement's own claimed status and
// the covering phase's own state — travel end to end as separate fields; this module never
// computes a merged/derived verdict from them (see 03-04-PLAN.md's prohibitions and
// T-03-04-04). No filesystem I/O, no second walk of the planning tree — same shape as
// roadmap.ts and coverage.ts.
import type { PhaseDto, ProjectPresentation, RequirementDto } from '../server/project-presentation.ts';
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

export interface TraceabilityGroup {
  category: string;
  rows: TraceabilityRow[];
}

export interface TraceabilityCounts {
  total: number;
  uncovered: number;
  disagreement: number;
}

export interface TraceabilityViewModel {
  groups: TraceabilityGroup[];
  deferredRows: TraceabilityRow[];
  counts: TraceabilityCounts;
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
  const phase = reference.targetPhaseKey ? (phaseByKey.get(reference.targetPhaseKey) ?? null) : null;
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

function traceabilityRow(requirement: RequirementDto, phaseByKey: Map<string, PhaseDto>): TraceabilityRow {
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

export function buildTraceabilityViewModel(presentation: ProjectPresentation): TraceabilityViewModel {
  const phaseByKey = phasesByKey(presentation);
  // Groups are ordered by first appearance in the requirements array — a Map preserves insertion
  // order, so no separate sort step is needed and no alphabetical re-sort is introduced.
  const groupOrder: string[] = [];
  const rowsByCategory = new Map<string, TraceabilityRow[]>();
  const deferredRows: TraceabilityRow[] = [];

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

  const groups: TraceabilityGroup[] = groupOrder.map((category) => ({
    category,
    rows: rowsByCategory.get(category) ?? [],
  }));
  const allRows = groups.flatMap((group) => group.rows);
  return {
    groups,
    deferredRows,
    counts: {
      total: allRows.length,
      uncovered: allRows.filter((row) => row.uncovered).length,
      disagreement: allRows.filter((row) => row.statusDisagreement).length,
    },
  };
}
