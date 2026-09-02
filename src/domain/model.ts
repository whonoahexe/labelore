// Domain entity types. Zero imports from planning-fs/ or planning-repo/ — this is the shared
// vocabulary a future writer or search-only tool could reuse without pulling in parsing machinery.
//
// Every status-like field is an open `string`, not a closed union, so an unrecognized value from a
// future GSD version passes through instead of failing.

/**
 * Which top-level GSD tree an artifact lives under, position-derived, never content-derived
 * (DATA-02). The single definition of this union in the codebase — planning-repo/types.ts
 * re-exports it rather than redeclaring it, mirroring how mentions.ts re-exports IdScheme/Mention
 * from here.
 */
export type ArtifactLocation = 'root' | 'phase' | 'archived-phase' | 'quick' | 'milestone-root' | 'research' | 'other';

/** The universal base shape every parsed artifact carries, regardless of type. */
export interface Artifact {
  id: string;
  path: string;
  kind: string;
  /** D-11: every reachable artifact carries the location discovery classified it under, so no
   * consumer re-derives it by string-matching a path prefix. */
  location: ArtifactLocation;
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
 * A resolved cross-reference (plan 01-04, D-10): the literal token as written, alongside its
 * resolved target or `null` when dangling. A dangling reference is expected, normal-path data —
 * a mistyped or deliberately-unlinked id — and is never itself a warning; it is present so a
 * consumer can render "this reference could not be resolved" without treating it as a parse
 * failure. Defined here (not in planning-repo/) so this zero-I/O module never imports from it.
 */
export interface Reference<T> {
  raw: string;
  resolved: T | null;
}

/** The four ID schemes the mention scanner recognizes (plan 01-04, D-13) — exactly the set NAV-02, NAV-03, and NAV-07 consume. Every other scheme in GSD's inventory (threat ids, wave numbers, ledger integers) is read only from structured frontmatter, never scanned out of prose. */
export type IdScheme = 'requirement' | 'decision' | 'plan' | 'phase';

/**
 * One occurrence of an id-shaped token in prose (D-16): which artifact it was found in (path and the
 * artifact's own resolved kind, so a later consumer can scope resolution by artifact type per D-14 —
 * a `D`-prefixed token means something different inside a `CONTEXT.md`-kind artifact than inside a
 * `SUMMARY.md`-kind one), where in the ORIGINAL unmodified document (one-based line, zero-based
 * offset — never an offset into the code-stripped scanning copy), and a bounded excerpt of the
 * surrounding line. Defined here, not in planning-repo/mentions.ts, for the same reason `Reference<T>`
 * is defined here rather than in crossref.ts: `Project.mentions` needs this type and the zero-I/O
 * domain module never imports from planning-repo/.
 */
export interface Mention {
  scheme: IdScheme;
  id: string;
  artifactPath: string;
  artifactKind: string;
  position: { line: number; offset: number };
  excerpt: string;
}

/**
 * The decision-mention index (NAV-07). Keyed on scheme-plus-id together, never on a bare id (D-14) —
 * `byId`'s keys are the literal string `` `${scheme}:${id}` ``, so a hyphenated single-letter `D`
 * token and an unrelated requirement id can never share a bucket even if their bare id text ever
 * coincided. `all` is the same mentions, flattened and sorted deterministically by artifact path then
 * offset, for consumers that want one ordered list rather than the grouped map.
 *
 * This index is not, and must never become, a registry of authored facts about an id. It reports that
 * an id was mentioned, where, and with what surrounding text — nothing else. GSD has no file-backed
 * source of truth for a decision beyond the prose that mentions it (see this project's own
 * ARCHITECTURE.md, "Domain Model" § Decision), so any field added here that carried text beyond what a
 * mentioning artifact literally wrote would be a record this tool invented, not one it read. Do not
 * add one.
 */
export interface MentionIndex {
  byId: Record<string, Mention[]>;
  all: Mention[];
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
  /** Plan 01-04: the same value as `summary`, wrapped as a Reference so plan-to-summary resolution shares one shape with every other cross-reference. `raw` is this plan's own id, since a summary is paired by filename convention rather than a written token. */
  summaryRef: Reference<PlanSummary>;
  /**
   * Plan 01-04: each entry of `frontmatter.depends_on` resolved against this plan's OWN phase's
   * plan list only — GSD's depends_on convention names sibling plans within the same phase, and a
   * token that doesn't match one is a dangling reference (`resolved: null`), never a thrown error.
   */
  dependsOnRefs: Reference<Plan>[];
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
  /** Plan 01-04: `requirementIds` resolved against `Project.requirements`. Absent ids resolve to `resolved: null` and are never a warning (D-10). */
  requirementRefs: Reference<Requirement>[];
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
  /**
   * Plan 01-04: `REQUIREMENTS.md`'s Traceability table rows naming this requirement, resolved to
   * the covering Phase using the milestone-qualified identity — traceability rows name a phase by
   * number alone with no milestone qualifier, so resolution is scoped to the live (non-archived)
   * milestone, the one a project-wide, unscoped `REQUIREMENTS.md` document describes. Many-to-many
   * in principle: a requirement claimed by two rows resolves to both.
   */
  coveringPhaseRefs: Reference<Phase>[];
}

export interface QuickTask {
  id: string;
  path: string;
  /** The matching row from STATE.md's "Quick Tasks Completed" table — the authoritative status index for quick/ — when one exists. */
  stateRow: Record<string, unknown> | null;
  /** Quick-task-scoped artifacts (PLAN.md, SUMMARY.md, ...) keyed by path — mirrors Phase.artifacts exactly, so both artifact-bearing model types share one shape. */
  artifacts: Record<string, Artifact>;
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
  /** Plan 01-04 (NAV-07): the whole-corpus decision-mention index, rebuilt from scratch by scanMentions() on every refresh — never merged into a previous one. */
  mentions: MentionIndex;
}
