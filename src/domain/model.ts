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
}

/**
 * Compound phase identity. Phase number alone is never an identity — the same number can appear
 * both as an active phase and as an archived phase inside a different milestone's archive tree
 * (`milestones/vX.Y-phases/`).
 */
export interface PhaseIdentity {
  milestoneVersion: string | null;
  number: string;
  projectCode: string | null;
  slug: string;
}

export interface Plan {
  id: string;
  identity: PhaseIdentity;
  planNumber: string;
  status: string;
}

export interface PlanSummary {
  id: string;
  identity: PhaseIdentity;
  planNumber: string;
  status: string;
}

export interface Phase {
  identity: PhaseIdentity;
  name: string;
  /** Completion state as reported by ROADMAP.md's own checkbox syntax. */
  roadmapComplete: boolean;
  /** Completion state as inferred from disk (PLAN.md / SUMMARY.md presence). Never merged with roadmapComplete. */
  diskStatus: string;
  plans: Plan[];
  planSummaries: PlanSummary[];
}

export interface Milestone {
  version: string | null;
  name: string;
  phases: Phase[];
}

export interface Requirement {
  id: string;
  description: string;
  status: string;
}

export interface QuickTask {
  id: string;
  path: string;
}

export interface Project {
  rootPath: string;
  name: string;
  /** Parsed root-level artifacts (PROJECT.md, STATE.md, REQUIREMENTS.md, ROADMAP.md, ...), keyed by path. */
  artifacts: Record<string, Artifact>;
  /** Open map — parsed config.json contents, or an empty map when config.json is absent. */
  config: Record<string, unknown>;
  milestones: Milestone[];
  phases: Phase[];
  quickTasks: QuickTask[];
  requirements: Requirement[];
}
