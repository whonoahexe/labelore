// The one table of where GSD writes what. Pure: no I/O, no node:* import, no content. A file's kind is
// decided by its POSITION first, then its NAME, never its content (DATA-02): the same file name means
// different things in different folders (`ROADMAP.md` at the root is the roadmap; one under a sketch's
// `synthetic-planning/` is sample data), so every filename grammar below is gated by where the file sits.
//
// Every row and name cites the GSD 1.18 file that justifies it, the way naming.ts cites its regexes.
// discovery.ts is the caller; this module imports only the grammar parsers in naming.ts.
import type { ArtifactLocation } from './types.ts';
import {
  isCanonicalRootFile,
  parseMilestoneFileName,
  parseMilestoneQuickDirName,
  parsePhaseArtifactName,
  parsePlanFileName,
  parseQuickArtifactName,
} from './naming.ts';

/** Where an exact-name row applies: only at the `.planning/` root, only inside a phase or quick-task
 * folder (live or archived), or at any depth. */
export type ExactNameWhere = 'root' | 'phase-or-quick' | 'any';

export interface ExactNameKind {
  name: string;
  where: ExactNameWhere;
  kind: string;
}

// Labelore-side exact names: files GSD writes that no filename grammar recognises. Matching is
// byte-equal and case-sensitive on the basename (`handoff.json` and `Coverage.md` match nothing here).
export const EXACT_NAME_KINDS: readonly ExactNameKind[] = [
  // gsd-core/workflows/pause-work.md writes `.planning/HANDOFF.json` beside `.continue-here.md`.
  { name: 'HANDOFF.json', where: 'root', kind: 'handoff' },
  // gsd-core/references/artifact-types.md: the root PATTERNS.md is the graduated cross-phase list. Its
  // kind is NOT `patterns`, which engages the per-phase pattern-map view on a differently shaped file.
  { name: 'PATTERNS.md', where: 'root', kind: 'graduated-patterns' },
  // gsd-core/references/artifact-types.md:57 and workflows/resume-project.md:90: `.continue-here.md` lives
  // at `.planning/`, in a phase folder, a spike folder and `deliberations/`. The dot-prefixed name cannot
  // be mistaken for anything else, so it matches at any depth.
  { name: '.continue-here.md', where: 'any', kind: 'continue-here' },
  // gsd-core/references/artifact-types.md: unprefixed documents a phase or quick task folder collects.
  { name: 'COVERAGE.md', where: 'phase-or-quick', kind: 'coverage' },
  { name: 'deferred-items.md', where: 'phase-or-quick', kind: 'deferred-items' },
  { name: 'SKELETON.md', where: 'phase-or-quick', kind: 'skeleton' },
];

function lastOf(segments: readonly string[]): string {
  return segments[segments.length - 1] ?? '';
}

/** True for a path inside a shipped milestone's archived quick tasks: `milestones/vX.Y-quick/...`. */
function isArchivedQuickPath(segments: readonly string[]): boolean {
  return segments.length >= 3 && segments[0] === 'milestones' && parseMilestoneQuickDirName(segments[1]).matched;
}

function isPhaseOrQuickFolder(segments: readonly string[], location: ArtifactLocation): boolean {
  return (
    location === 'phase' || location === 'archived-phase' || location === 'quick' || isArchivedQuickPath(segments)
  );
}

function exactNameKindOf(segments: readonly string[], location: ArtifactLocation): string | null {
  const name = lastOf(segments);
  for (const row of EXACT_NAME_KINDS) {
    if (row.name !== name) continue;
    if (row.where === 'any') return row.kind;
    if (row.where === 'root') {
      if (segments.length === 1) return row.kind;
      continue;
    }
    if (isPhaseOrQuickFolder(segments, location)) return row.kind;
  }
  return null;
}

/** How a folder's file names turn into the readable token a URL carries (read by the URL grammar later):
 * `gsd-lower` lower-cases GSD's own document names and drops `.md`; `keep-case` keeps the name and drops a
 * trailing `.md`; `keep-all` keeps the full name with its extension. */
export type NameRule = 'gsd-lower' | 'keep-case' | 'keep-all';

export interface FolderRule {
  /** The first path segment under `.planning/`. */
  folder: string;
  /** The URL segment this folder's files live under. */
  urlSegment: string;
  nameRule: NameRule;
  /** The kind of a file, from its path segments after the folder segment. Names and positions only. */
  kindOf(segmentsAfterFolder: readonly string[]): string;
  /** The GSD 1.18 file the row is grounded in. */
  source: string;
}

const UNKNOWN = 'unknown';
const hasSuffix = (segments: readonly string[], suffix: string): boolean => lastOf(segments).toLowerCase().endsWith(suffix);
const markdownKind =
  (kind: string) =>
  (segments: readonly string[]): string =>
    hasSuffix(segments, '.md') ? kind : UNKNOWN;
const jsonKind =
  (kind: string) =>
  (segments: readonly string[]): string =>
    hasSuffix(segments, '.json') ? kind : UNKNOWN;
const unknownKind = (): string => UNKNOWN;

// gsd-core/workflows/map-codebase.md writes exactly these seven UPPERCASE documents into .planning/codebase/.
const CODEBASE_DOCUMENTS = new Set([
  'STACK.md', 'ARCHITECTURE.md', 'STRUCTURE.md', 'CONVENTIONS.md', 'TESTING.md', 'INTEGRATIONS.md', 'CONCERNS.md',
]);

function codebaseKind(segments: readonly string[]): string {
  const name = lastOf(segments);
  return segments.length === 1 && CODEBASE_DOCUMENTS.has(name) ? `codebase-${name.slice(0, -'.md'.length).toLowerCase()}` : UNKNOWN;
}

// gsd-core/references/artifact-types.md:79-97: `MANIFEST.md` and `WRAP-UP-SUMMARY.md` at the folder, one
// `NNN-name/README.md` per experiment; spikes alone also keep a `CONVENTIONS.md`.
function explorationKind(prefix: 'spikes' | 'sketches', single: string) {
  return (segments: readonly string[]): string => {
    const name = lastOf(segments);
    if (segments.length === 1) {
      if (name === 'MANIFEST.md') return `${prefix}-manifest`;
      if (name === 'WRAP-UP-SUMMARY.md') return `${prefix}-wrap-up`;
      if (prefix === 'spikes' && name === 'CONVENTIONS.md') return 'spikes-conventions';
      return UNKNOWN;
    }
    return segments.length === 2 && name === 'README.md' ? single : UNKNOWN;
  };
}

// Files under research/ keep exactly the kinds they had before this table existed: the phase-artifact,
// plan and quick-artifact grammars on the basename. The root-document grammars are NOT applied here, so a
// research/STATE.md cannot take the state kind (T-07-04).
function researchKind(segments: readonly string[]): string {
  const name = lastOf(segments);
  const plan = parsePlanFileName(name);
  if (plan.matched) return plan.kind;
  const artifact = parsePhaseArtifactName(name);
  if (artifact.matched) return artifact.artifact.toLowerCase();
  const quickArtifact = parseQuickArtifactName(name);
  if (quickArtifact.matched) return quickArtifact.artifact.toLowerCase();
  return UNKNOWN;
}

// The pinned originals of the three position predicates live in discovery.ts (isNotePath, isTodoPath,
// isDebugSessionPath), which the walk consults first; these rows give the same answer for kindOfPath.
export const FOLDER_RULES: readonly FolderRule[] = [
  {
    folder: 'codebase', urlSegment: 'codebase', nameRule: 'gsd-lower', kindOf: codebaseKind,
    source: 'gsd-core/workflows/map-codebase.md (writes the seven UPPERCASE documents to .planning/codebase/)',
  },
  {
    folder: 'research', urlSegment: 'research', nameRule: 'gsd-lower', kindOf: researchKind,
    source: 'gsd-core/workflows/new-project.md (.planning/research/ files); kinds unchanged from before this table',
  },
  {
    folder: 'notes', urlSegment: 'notes', nameRule: 'keep-case', kindOf: markdownKind('note'),
    source: 'gsd-core/workflows/note.md (/gsd-note writes .planning/notes/<free-form>.md)',
  },
  {
    folder: 'todos', urlSegment: 'todos', nameRule: 'keep-case', kindOf: markdownKind('todo'),
    source: 'gsd-core/workflows/add-todo.md (.planning/todos/{pending,completed,done}/<free-form>.md)',
  },
  {
    folder: 'debug', urlSegment: 'debug', nameRule: 'keep-case',
    kindOf: (segments) => (hasSuffix(segments, '.md') && lastOf(segments).toLowerCase() !== 'knowledge-base.md' ? 'debug' : UNKNOWN),
    source: 'gsd-core/workflows/debug.md (.planning/debug/<slug>.md, archived to debug/resolved/; knowledge-base.md is not a session)',
  },
  {
    folder: 'spikes', urlSegment: 'spikes', nameRule: 'gsd-lower', kindOf: explorationKind('spikes', 'spike'),
    source: 'gsd-core/references/artifact-types.md:79-97 (spikes/MANIFEST.md, CONVENTIONS.md, WRAP-UP-SUMMARY.md, NNN-name/README.md)',
  },
  {
    folder: 'sketches', urlSegment: 'sketches', nameRule: 'gsd-lower', kindOf: explorationKind('sketches', 'sketch'),
    source: 'gsd-core/references/artifact-types.md:91-97 (sketches/MANIFEST.md, WRAP-UP-SUMMARY.md, NNN-name/README.md)',
  },
  {
    folder: 'seeds', urlSegment: 'seeds', nameRule: 'keep-case', kindOf: markdownKind('seed'),
    source: 'gsd-core/workflows/plant-seed.md (.planning/seeds/SEED-*.md)',
  },
  {
    folder: 'threads', urlSegment: 'threads', nameRule: 'keep-case', kindOf: markdownKind('thread'),
    source: 'gsd-core/workflows/thread.md (.planning/threads/{SLUG}.md)',
  },
  {
    folder: 'reports', urlSegment: 'reports', nameRule: 'keep-case', kindOf: markdownKind('report'),
    source: 'gsd-core/workflows/session-report.md and milestone-summary.md (SESSION_REPORT.md, MILESTONE_SUMMARY-v{version}.md)',
  },
  {
    folder: 'forensics', urlSegment: 'forensics', nameRule: 'keep-case', kindOf: markdownKind('forensics'),
    source: 'gsd-core/workflows/forensics.md (.planning/forensics/report-{timestamp}.md)',
  },
  {
    folder: 'onboarding', urlSegment: 'onboarding', nameRule: 'keep-case', kindOf: markdownKind('onboarding'),
    source: 'gsd-core/workflows/onboard.md (.planning/onboarding/SUMMARY.md)',
  },
  {
    folder: 'intel', urlSegment: 'intel', nameRule: 'keep-all', kindOf: jsonKind('intel'),
    source: 'gsd-core/references/agent-contracts.md (gsd-intel-updater writes .planning/intel/*.json)',
  },
  {
    folder: 'graphs', urlSegment: 'graphs', nameRule: 'keep-all', kindOf: jsonKind('graph'),
    source: 'gsd-core/references/planner-graphify-auto-update.md (.planning/graphs/graph.json)',
  },
  {
    folder: 'ui-reviews', urlSegment: 'ui-reviews', nameRule: 'keep-all', kindOf: unknownKind,
    source: 'gsd-core/workflows/ui-review.md (screenshots and review output; text is unknown, images and binaries are classed by file class)',
  },
  {
    folder: 'quick-batches', urlSegment: 'quick-batches', nameRule: 'keep-all', kindOf: unknownKind,
    source: 'gsd-core/workflows/quick-batch/steps/batch-init.md (.planning/quick-batches/{BATCH_ID}/BATCH.json); a view is a later idea',
  },
  {
    folder: 'workstreams', urlSegment: 'workstreams', nameRule: 'keep-all', kindOf: unknownKind,
    source: 'gsd-core/workflows/new-milestone.md (.planning/workstreams/<name>/); reserved, Phase 11 owns the view',
  },
];

/** The folder row for a path under `.planning/`, by its first segment only, or null for a root file or an
 * unlisted folder. */
export function folderRuleOf(relUnderPlanning: string): FolderRule | null {
  const segments = relUnderPlanning.split('/');
  if (segments.length < 2) return null;
  return FOLDER_RULES.find((rule) => rule.folder === segments[0]) ?? null;
}

/** The kind of a filename grammar that applies at this position, or null when none does. Each grammar is
 * gated to the place GSD writes it: nothing below the root can take a root document's kind. */
function grammarKindOf(segments: readonly string[], location: ArtifactLocation): string | null {
  const name = lastOf(segments);
  const atRoot = segments.length === 1;
  const directUnderMilestones = segments.length === 2 && segments[0] === 'milestones';

  if (atRoot || directUnderMilestones) {
    const milestoneFile = parseMilestoneFileName(name);
    if (milestoneFile.matched) return milestoneFile.document.toLowerCase();
  }
  if (atRoot && isCanonicalRootFile(name)) return name.replace(/\.(md|json|lock)$/i, '').toLowerCase();

  if (location === 'phase' || location === 'archived-phase') {
    const plan = parsePlanFileName(name);
    if (plan.matched) return plan.kind;
    const artifact = parsePhaseArtifactName(name);
    if (artifact.matched) return artifact.artifact.toLowerCase();
  }
  if (location === 'quick' || isArchivedQuickPath(segments)) {
    const quickArtifact = parseQuickArtifactName(name);
    if (quickArtifact.matched) return quickArtifact.artifact.toLowerCase();
  }
  return null;
}

/**
 * The kind of a file from its position under `.planning/` (forward-slash separated) and its location.
 * Order: the exact-name map at its position, the filename grammars gated by position, the folder table,
 * then `unknown`. Never reads content.
 */
export function kindOfPath(relUnderPlanning: string, location: ArtifactLocation): string {
  const segments = relUnderPlanning.split('/');
  return (
    exactNameKindOf(segments, location) ??
    grammarKindOf(segments, location) ??
    folderRuleOf(relUnderPlanning)?.kindOf(segments.slice(1)) ??
    UNKNOWN
  );
}
