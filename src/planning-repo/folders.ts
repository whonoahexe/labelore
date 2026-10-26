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
 * Order: the exact-name map at its position, the filename grammars gated by position, then `unknown`.
 * Never reads content.
 */
export function kindOfPath(relUnderPlanning: string, location: ArtifactLocation): string {
  const segments = relUnderPlanning.split('/');
  return exactNameKindOf(segments, location) ?? grammarKindOf(segments, location) ?? 'unknown';
}
