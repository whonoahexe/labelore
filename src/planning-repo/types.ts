// Layer B types. The LoadStatus union and ParseWarning shape are the load-bearing contracts
// D-11/D-12 fix — every consumer of PlanningRepository handles exactly these shapes.
import type { PhaseIdentity } from '../domain/model.ts';

/** D-12: load()/refresh() never throw. Every failure is one of these four named states. */
export type LoadStatus =
  | { status: 'ok' }
  | FailedLoadStatus;

/** The three non-`ok` LoadStatus variants — every one carries `pathChecked`. */
export type FailedLoadStatus =
  | { status: 'not-a-gsd-project'; pathChecked: string; message: string }
  | { status: 'path-not-found'; pathChecked: string; rawPath: string; message: string }
  | { status: 'permission-denied'; pathChecked: string; message: string };

/** D-11: which pipeline step failed. */
export type WarningStage = 'read' | 'frontmatter' | 'structured-extraction' | 'assembly';

/** D-11: exactly four fields. Never captures the caught error object or its stack. */
export interface ParseWarning {
  path: string;
  stage: WarningStage;
  message: string;
  /** What survived, e.g. "body intact, frontmatter unavailable" vs. "nothing readable". */
  salvage: string;
}

export interface RawArtifact {
  path: string;
  content: string;
  mtimeMs: number;
  size: number;
}

/** Which top-level GSD tree an artifact lives under, position-derived, never content-derived. */
export type ArtifactLocation = 'root' | 'phase' | 'archived-phase' | 'quick' | 'milestone-root' | 'research' | 'other';

/** Discovery-derived reference to a not-yet-parsed file, plus its dispatch-relevant location fields. */
export interface ArtifactRef {
  path: string;
  /** Open string derived from the filename token alone (DATA-02) — never from content. */
  kind: string;
  location: ArtifactLocation;
  /** Set when `location` is 'phase' or 'archived-phase'. milestoneVersion is null for a live phase — discovery cannot know the active milestone (that lives in STATE.md, parsed later); assemble.ts fills it in. */
  phaseIdentity: PhaseIdentity | null;
  /** Set when `location` is 'archived-phase' (from the vX.Y-phases/ dirname) or 'milestone-root' (from the filename), when parseable. */
  milestoneVersion: string | null;
  /** Set when `location` is 'quick' and the owning directory name parses as a quick-task id. */
  quickTaskId: string | null;
}

/** D-11 records a path + reason for every deliberate skip (research/.cache/, a runaway walk depth simulating a symlink cycle) so no exclusion is ever silently invisible. */
export interface DiscoveryExclusion {
  path: string;
  reason: string;
}

export interface ParsedArtifact {
  ref: ArtifactRef;
  title: string;
  frontmatter: Record<string, unknown>;
  body: string;
  bodyLength: number;
  bodyHash: string;
  mtimeMs: number;
  warnings: ParseWarning[];
  /** Handler-specific structured fields beyond frontmatter/body (roadmap phase blocks, requirements items, context sections, ...). Empty object when a handler adds nothing beyond the base shape. */
  structured: Record<string, unknown>;
}

export interface HandlerParseResult {
  title: string;
  frontmatter: Record<string, unknown>;
  body: string;
  warning?: Omit<ParseWarning, 'path'>;
  structured?: Record<string, unknown>;
}

export interface ArtifactHandler {
  kind: string;
  match(ref: ArtifactRef): boolean;
  parse(raw: RawArtifact, ref: ArtifactRef): HandlerParseResult;
}

export interface ProjectSnapshot {
  loadStatus: LoadStatus;
  readAt: string;
  rootPath: string;
  project: import('../domain/model.ts').Project | null;
  warnings: ParseWarning[];
  exclusions: DiscoveryExclusion[];
}
