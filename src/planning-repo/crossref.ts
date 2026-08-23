// Eager cross-reference resolution (plan 01-04, D-10, ARCHITECTURE.md "Domain Model" §Resolution
// strategy). Builds each lookup map exactly once over the just-assembled graph, then rewrites the
// graph's resolved-reference fields in place — this is called once, at the end of assembly, never
// per-render. A reference whose target is absent resolves to `{ raw, resolved: null }` and adds
// nothing to the warning channel: GSD prose mentions undefined identifiers routinely (this
// project's own STATE.md carries literal "[Phase ?]:" placeholders), so routing every unresolved
// mention into a warning would bury the handful of real parse failures under hundreds of routine
// ones. A rollup count of dangling references was considered and deliberately deferred to a later
// phase's project-health surface — do not add one here.
//
// Accepted trade-off, recorded once at this entry point: a mistyped id and a deliberately-unlinked
// mention are indistinguishable under this rule.
import type { Phase, Project, Reference, Requirement } from '../domain/model.ts';
import { comparePhaseNumbers } from './naming.ts';

// Re-exported so callers of this module never need to import from '../domain/model.ts' just to
// name the Reference type — the generic type itself lives in domain/model.ts (see that file's own
// comment) so the zero-I/O domain module never imports from planning-repo/.
export type { Reference } from '../domain/model.ts';

const REQUIREMENTS_MD_PATH = '.planning/REQUIREMENTS.md';

/** Duck-typed against RequirementsHandler's structured.traceability shape (handlers/requirements.ts) — not imported, to avoid a planning-repo/handlers dependency from this module. */
interface TraceabilityRowLike {
  requirementId: string;
  phase: string;
  status: string;
}

/** Extracts the phase-number token from a Traceability row's free-text "Phase N" cell. */
function phaseNumberFromTraceabilityText(raw: string): string | null {
  const m = raw.match(/Phase\s+([\w.]+)/i);
  return m ? m[1] : null;
}

/**
 * Resolves `raw` traceability phase text against the milestone-qualified phase identity, scoped to
 * the live (non-archived) milestone — `REQUIREMENTS.md` is a project-wide, unscoped document, so a
 * bare "Phase 1" cell is read as referring to the CURRENT milestone's phase 1, never an archived
 * one that happens to share the same number. A project with no live milestone (nothing built yet)
 * resolves every traceability reference to null, which is correct: there is nothing current to
 * point at yet.
 */
function resolvePhaseByLiveMilestoneNumber(project: Project, liveMilestoneVersion: string | null, phaseNumber: string): Phase | null {
  return (
    project.phases.find(
      (p) => p.identity.milestoneVersion === liveMilestoneVersion && comparePhaseNumbers(p.identity.number, phaseNumber) === 0,
    ) ?? null
  );
}

/**
 * Resolves every cross-reference relationship in scope for plan 01-04, mutating the just-built
 * graph's reference fields. Idempotent: re-running over an already-resolved graph reassigns (never
 * appends to) every reference array, so calling it twice yields structurally identical output
 * rather than duplicated entries.
 *
 * Resolves exactly: each phase's requirement ids to Requirement entities; REQUIREMENTS.md's
 * Traceability rows to their covering Phase; each plan's summary (by filename-convention pairing,
 * already computed by assemble.ts — wrapped here as a Reference for shape consistency); each
 * plan's `depends_on` entries to sibling plans within its OWN phase.
 *
 * Deliberately NOT resolved here: a phase's `**Depends on**:` value (`dependsOnRaw`) stays the raw
 * string assemble.ts already extracted — GSD-DOMAIN.md confirms GSD's own tooling (`gsd-tools
 * query roadmap analyze`) leaves this unparsed too, and inventing a phase-dependency graph from
 * free text would be a fabricated relationship, not a resolved one.
 */
export function resolveCrossReferences(project: Project): void {
  const requirementsById = new Map(project.requirements.map((r): [string, Requirement] => [r.id, r]));
  const liveMilestone = project.milestones.find((m) => !m.archived) ?? null;
  const liveMilestoneVersion = liveMilestone?.version ?? null;

  // 1) Phase.requirementIds -> Phase.requirementRefs
  for (const phase of project.phases) {
    phase.requirementRefs = phase.requirementIds.map((raw) => ({
      raw,
      resolved: requirementsById.get(raw) ?? null,
    }));
  }

  // 2) REQUIREMENTS.md's Traceability table -> Requirement.coveringPhaseRefs (many-to-many: a
  //    requirement named by more than one row resolves to every matching phase).
  const requirementsArtifact = project.artifacts[REQUIREMENTS_MD_PATH];
  const traceability = (requirementsArtifact?.structured.traceability as TraceabilityRowLike[] | undefined) ?? [];
  const coveringByReqId = new Map<string, Reference<Phase>[]>();
  for (const row of traceability) {
    const phaseNumber = phaseNumberFromTraceabilityText(row.phase);
    const resolved = phaseNumber === null ? null : resolvePhaseByLiveMilestoneNumber(project, liveMilestoneVersion, phaseNumber);
    const ref: Reference<Phase> = { raw: row.phase, resolved };
    const existing = coveringByReqId.get(row.requirementId);
    if (existing) existing.push(ref);
    else coveringByReqId.set(row.requirementId, [ref]);
  }
  for (const req of project.requirements) {
    req.coveringPhaseRefs = coveringByReqId.get(req.id) ?? [];
  }

  // 3) Plan.summaryRef and Plan.dependsOnRefs — both scoped to the plan's OWN phase.
  for (const phase of project.phases) {
    for (const plan of phase.plans) {
      plan.summaryRef = { raw: plan.id, resolved: plan.summary };
      const dependsOnRaw = ((plan.frontmatter.depends_on as unknown[] | undefined) ?? []).map((v) => String(v));
      plan.dependsOnRefs = dependsOnRaw.map((raw) => ({
        raw,
        resolved: phase.plans.find((sibling) => sibling.id === raw) ?? null,
      }));
    }
  }
}
