// Layer B types. The LoadStatus union and ParseWarning shape are the load-bearing contracts
// D-11/D-12 fix — every consumer of PlanningRepository handles exactly these shapes.

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

/** Discovery-derived reference to a not-yet-parsed file, plus its dispatch-relevant location fields. */
export interface ArtifactRef {
  path: string;
  kind: string;
  /** Which top-level GSD tree this artifact lives under: root, phases, quick, milestones, research, other. */
  location: string;
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
}

export interface ArtifactHandler {
  kind: string;
  match(ref: ArtifactRef): boolean;
  parse(raw: RawArtifact, ref: ArtifactRef): { title: string; frontmatter: Record<string, unknown>; body: string; warning?: Omit<ParseWarning, 'path'> };
}

export interface ProjectSnapshot {
  loadStatus: LoadStatus;
  readAt: string;
  rootPath: string;
  project: import('../domain/model.ts').Project | null;
  warnings: ParseWarning[];
  exclusions: string[];
}
