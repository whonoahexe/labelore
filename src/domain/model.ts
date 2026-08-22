// Domain entity types. Zero imports from planning-fs/ or planning-repo/ — this is the shared
// vocabulary a future writer or search-only tool could reuse without pulling in parsing machinery.
//
// Every status-like field is an open `string`, not a closed union, so an unrecognized value from a
// future GSD version passes through instead of failing.

/** The universal base shape every parsed artifact carries, regardless of type. */
export interface Artifact {
  id: string;
  path: string;
  kind: string;
  frontmatter: Record<string, unknown>;
  title: string;
  body: string;
  bodyLength: number;
  bodyHash: string;
  mtimeMs: number;
  warnings: unknown[];
  /**
   * Handler-specific structured fields beyond frontmatter/body — roadmap phase blocks,
   * requirements items/out-of-scope/traceability, context's six tag sections, project's named
   * sections and key-decisions table, state's body sections. Always present; an empty object
   * means the matched handler added nothing beyond the universal base shape (this is the case
   * for every artifact GenericMarkdownHandler catches).
   */
  structured: Record<string, unknown>;
}

/**
 * Compound phase identity. Phase number alone is never an identity — the same number can appear
 * both as an active phase and as an archived phase inside a different milestone's archive tree
 * (`milestones/vX.Y-phases/`), and STATE.md's `phase_numbering: restarts-per-milestone` makes this
 * a real, observed case, not a hypothetical.
 */
export interface PhaseIdentity {
  milestoneVersion: string | null;
  number: string;
  projectCode: string | null;
  slug: string;
}

/** A SUMMARY.md, paired 1:1 with its Plan by filename convention. */
export interface PlanSummary {
  path: string;
  frontmatter: Record<string, unknown>;
}

export interface Plan {
  /** `{phase}-{plan}`, e.g. '01-02'. */
  id: string;
  identity: PhaseIdentity;
  planNumber: string;
  path: string;
  frontmatter: Record<string, unknown>;
  /** Null when this plan has not yet been executed (no matching SUMMARY.md on disk). */
  summary: PlanSummary | null;
}

export interface Phase {
  identity: PhaseIdentity;
  name: string;
  /** Null when this phase exists only as a ROADMAP.md entry with no matching directory on disk. */
  dirPath: string | null;
  /** True when this phase lives under milestones/vX.Y-phases/ rather than the active phases/. */
  archived: boolean;
  goal: string | null;
  /** The `**Depends on**:` line, kept as free text — never parsed into a dependency graph. */
  dependsOnRaw: string | null;
  requirementIds: string[];
  successCriteria: string[];
  /**
   * Completion state as reported by ROADMAP.md's own plan-checklist checkbox syntax. Null when
   * this phase has no ROADMAP.md entry to read from — never coerced to false, which would read as
   * a false claim of "roadmap says incomplete" rather than "no roadmap data available".
   */
  roadmapComplete: boolean | null;
  /** Completion state as inferred from disk (PLAN.md / SUMMARY.md presence). Never merged with roadmapComplete — the two are documented to legitimately disagree. */
  diskStatus: string;
  plans: Plan[];
  /** Phase-scoped artifacts (CONTEXT.md, RESEARCH.md, SECURITY.md, ...) keyed by path. */
  artifacts: Record<string, Artifact>;
}

export interface Milestone {
  /** Null only for the active milestone of a fresh project where STATE.md names none yet. */
  version: string | null;
  name: string;
  /** True for a milestone whose phases live under milestones/vX.Y-phases/. */
  archived: boolean;
  phases: Phase[];
}

export interface Requirement {
  id: string;
  category: string;
  text: string;
  /** 'v1' | 'v2' | 'future' | open string — REQUIREMENTS.md's tier heading is not a closed enum across GSD versions. */
  tier: string;
  /** Null for a v2/future requirement, which carries no checkbox at all. */
  checked: boolean | null;
}

export interface QuickTask {
  id: string;
  path: string;
  /** The matching row from STATE.md's "Quick Tasks Completed" table — the authoritative status index for quick/ — when one exists. */
  stateRow: Record<string, unknown> | null;
}

export interface Project {
  rootPath: string;
  name: string;
  /** Parsed root-level artifacts (PROJECT.md, STATE.md, REQUIREMENTS.md, ROADMAP.md, ...), keyed by path. */
  artifacts: Record<string, Artifact>;
  /** Open map — parsed config.json contents, or an empty map when config.json is absent. */
  config: Record<string, unknown>;
  milestones: Milestone[];
  /** Flattened convenience view across every milestone's phases (live + archived), in the same deterministic order as Milestones. */
  phases: Phase[];
  quickTasks: QuickTask[];
  requirements: Requirement[];
}
