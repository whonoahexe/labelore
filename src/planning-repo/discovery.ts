// Discovers artifacts by filename and directory position ONLY (DATA-02) — never by frontmatter
// presence. Directory position is a legitimate second axis of the dispatch signal alongside
// filename: GSD's own naming grammar is position-dependent (an identically-named PLAN.md under
// `phases/` is a live plan; the same filename under `milestones/vX.Y-phases/` is archived).
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { ArtifactRef, ArtifactLocation, DiscoveryExclusion } from './types.ts';
import type { PhaseIdentity } from '../domain/model.ts';
import {
  parsePhaseDirName,
  parseQuickDirName,
  parseMilestoneFileName,
  parseMilestonePhasesDirName,
  comparePhaseNumbers,
} from './naming.ts';
import { kindOfPath } from './folders.ts';
import { classifyFile, isInternalPath, needsHeadSniff, INTERNAL_EXCLUSION_REASON, SNIFF_BYTES } from './file-class.ts';

const PLANNING_DIR = '.planning';
const SKIPPED_DIRS = new Set(['research/.cache']);
// Guards against a pathological/looping tree. The PlanningFilesystem port has no symlink-following
// semantics to genuinely reproduce a symlink cycle in-memory (InMemoryPlanningFilesystem is a flat
// path→content map), so a runaway walk depth is this discovery pass's cycle terminator — the same
// mechanism a real inside-tree symlink loop would eventually trip via node:fs's own ELOOP, one
// layer below this port.
const MAX_WALK_DEPTH = 64;

// Deterministic order independent of readdir/Map-iteration order: location group, then
// milestone version, then phase number (dotted-numeric), then path. Location groups are ordered
// by this fixed precedence list so the same six-way partition always sorts identically. Hoisted to
// module level (rather than local to discover()) so downstream consumers — e.g. tree.ts's location
// grouping — order location groups by the one ordering the codebase already committed to instead
// of inventing a second.
export const LOCATION_ORDER: Record<ArtifactLocation, number> = {
  root: 0,
  phase: 1,
  'archived-phase': 2,
  quick: 3,
  'milestone-root': 4,
  research: 5,
  other: 6,
};

export interface DiscoveryResult {
  refs: ArtifactRef[];
  exclusions: DiscoveryExclusion[];
}

function resolvePhaseDirIdentity(dirName: string, milestoneVersion: string | null): PhaseIdentity | null {
  // Sequential is the default and only mode GSD-DOMAIN.md's research observed in real projects;
  // config.json (itself an undiscovered artifact at this point in the pipeline) is not consulted
  // here — a custom-mode dirname simply fails to match and the phase falls back to unrecognized,
  // which assemble.ts (Task 3) is free to special-case once config.json has actually been parsed.
  const parsed = parsePhaseDirName(dirName, 'sequential');
  if (!parsed.matched) return null;
  return { milestoneVersion, number: parsed.number, projectCode: parsed.projectCode, slug: parsed.slug };
}

// The directory-position half of the dispatch signal named in this module's header: GSD's `/gsd-debug`
// writes each session as `.planning/debug/<slug>.md` (archived to `debug/resolved/`) with a free-form
// slug, so no filename grammar can recognise it. A markdown file under `debug/` is therefore a debug
// session by position - except `knowledge-base.md`, GSD's cross-session notes file, which is not a
// session (a false positive STATE.md once logged). The location stays 'other'; nothing else in the
// domain model, tree or search grouping moves (quick-261018-j5h).
export function isDebugSessionPath(relPathUnderPlanning: string): boolean {
  const segments = relPathUnderPlanning.split('/');
  if (segments.length < 2 || segments[0] !== 'debug') return false;
  const name = segments[segments.length - 1];
  if (!name.toLowerCase().endsWith('.md')) return false;
  return name.toLowerCase() !== 'knowledge-base.md';
}

// The directory-position half of the dispatch signal for kinds whose file names are free-form:
// `/gsd-add-todo` and note promotion write `.planning/todos/{pending,completed,done}/<anything>.md`
// (`2026-10-12-retry-queue-dead-letter.md`, `004-tariff-note-tooltips.md`, `lifted-figures-everywhere.md`),
// so no filename grammar can recognise them. A markdown file anywhere under `todos/` is therefore a
// todo by position. The location stays 'other': the tree, search grouping and goldens do not move
// (quick-261023-61k, sketch 027 C).
export function isTodoPath(relPathUnderPlanning: string): boolean {
  const segments = relPathUnderPlanning.split('/');
  if (segments.length < 2 || segments[0] !== 'todos') return false;
  return segments[segments.length - 1].toLowerCase().endsWith('.md');
}

// The directory-position half of the dispatch signal for GSD notes: `/gsd-note` and `/gsd-explore` write
// `.planning/notes/<anything>.md` with free-form names (`2026-10-21-round-profile-photos.md`,
// `per-kind-artifact-rendering.md`), so no filename grammar can recognise them. A markdown file whose
// first path segment under `.planning/` is `notes` is a note by position, at any depth. A file that is
// merely named `notes.md` elsewhere (`phases/01-a/notes.md`) is not one, because the first segment is the
// test, not the file name. The location stays 'other': the tree, search grouping and goldens do not move
// (quick-261023-61l, sketch 028 A).
export function isNotePath(relPathUnderPlanning: string): boolean {
  const segments = relPathUnderPlanning.split('/');
  if (segments.length < 2 || segments[0] !== 'notes') return false;
  return segments[segments.length - 1].toLowerCase().endsWith('.md');
}

/** The directory-position kind of a path under `.planning/`, or null when position says nothing. The
 * debug predicate above keeps its own pinned line in the walk; this is where a later position kind
 * goes. */
export function positionKind(relPathUnderPlanning: string): string | null {
  if (isTodoPath(relPathUnderPlanning)) return 'todo';
  if (isNotePath(relPathUnderPlanning)) return 'note';
  return null;
}

interface Classification {
  location: ArtifactLocation;
  phaseIdentity: PhaseIdentity | null;
  milestoneVersion: string | null;
  quickTaskId: string | null;
}

const OTHER_LOCATION: Classification = { location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };

/** Classifies a path (relative to `.planning/`, forward-slash separated) by position alone. */
function classify(relPathUnderPlanning: string): Classification {
  const segments = relPathUnderPlanning.split('/');
  if (segments.length === 1) {
    return { location: 'root', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  }

  const [top, ...rest] = segments;

  // Position keeps a stray where it falls instead of dropping it: a file directly under phases/, or in a
  // folder that is not a phase directory, is location 'other' with no identity, so it stays in the model.
  if (top === 'phases') {
    const phaseDirName = rest.length >= 2 ? rest[0] : null;
    const phaseIdentity = phaseDirName ? resolvePhaseDirIdentity(phaseDirName, null) : null;
    return phaseIdentity
      ? { location: 'phase', phaseIdentity, milestoneVersion: null, quickTaskId: null }
      : OTHER_LOCATION;
  }

  if (top === 'quick') {
    // Only a directory whose name is `{date}-{time}-{slug}` is a quick task; quick/README.md is not one.
    const parsedQuick = rest.length >= 2 ? parseQuickDirName(rest[0]) : { matched: false as const };
    if (!parsedQuick.matched) return OTHER_LOCATION;
    return {
      location: 'quick',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: `${parsedQuick.date}-${parsedQuick.timeToken}`,
    };
  }

  if (top === 'milestones') {
    if (rest.length === 1) {
      // A file directly under milestones/: vX.Y-ROADMAP.md, vX.Y-REQUIREMENTS.md, ...
      const parsedFile = parseMilestoneFileName(rest[0]);
      return {
        location: 'milestone-root',
        phaseIdentity: null,
        milestoneVersion: parsedFile.matched ? parsedFile.version : null,
        quickTaskId: null,
      };
    }
    const phasesMatch = parseMilestonePhasesDirName(rest[0]);
    if (phasesMatch.matched) {
      const phaseDirName = rest.length >= 3 ? rest[1] : null;
      const phaseIdentity = phaseDirName ? resolvePhaseDirIdentity(phaseDirName, phasesMatch.version) : null;
      return phaseIdentity
        ? { location: 'archived-phase', phaseIdentity, milestoneVersion: phasesMatch.version, quickTaskId: null }
        : OTHER_LOCATION;
    }
    return { location: 'milestone-root', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  }

  if (top === 'research') {
    return { location: 'research', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  }

  return OTHER_LOCATION;
}

export async function discover(fs: PlanningFilesystem): Promise<DiscoveryResult> {
  const refs: ArtifactRef[] = [];
  const exclusions: DiscoveryExclusion[] = [];

  async function walk(relDir: string, depth: number): Promise<void> {
    if (depth > MAX_WALK_DEPTH) {
      exclusions.push({ path: relDir, reason: `Walk depth exceeded ${MAX_WALK_DEPTH} — terminated to guard against a pathological or cyclic tree` });
      return;
    }
    const relDirUnderPlanning = relDir === PLANNING_DIR ? '' : relDir.slice(PLANNING_DIR.length + 1);
    if (SKIPPED_DIRS.has(relDirUnderPlanning)) {
      exclusions.push({ path: relDir, reason: 'Matches the research/.cache/ exclusion rule' });
      return;
    }

    let entries;
    try {
      entries = await fs.list(relDir);
    } catch (err) {
      exclusions.push({ path: relDir, reason: `Directory could not be listed: ${err instanceof Error ? err.message : String(err)}` });
      return;
    }

    for (const entry of entries.slice().sort((a, b) => a.name.localeCompare(b.name))) {
      const childRel = `${relDir}/${entry.name}`;
      const childRelUnderPlanning = childRel.slice(PLANNING_DIR.length + 1);
      if (SKIPPED_DIRS.has(childRelUnderPlanning)) {
        exclusions.push({ path: childRel, reason: 'Matches the research/.cache/ exclusion rule' });
        continue;
      }
      // D-11: GSD's own bookkeeping never becomes a ref (nor is an internal folder walked); each one
      // is recorded once, so nothing is silently invisible. Decided before any read.
      if (isInternalPath(childRelUnderPlanning, entry.isDirectory)) {
        exclusions.push({ path: childRel, reason: INTERNAL_EXCLUSION_REASON });
        continue;
      }
      if (entry.isDirectory) {
        await walk(childRel, depth + 1);
      } else {
        const classification = classify(childRelUnderPlanning);
        const sizeBytes = entry.size ?? 0;
        // D-09: only a name whose extension decides nothing is head-sniffed, and only SNIFF_BYTES bytes.
        // A head the port cannot read leaves the file text, so today's read-time warning path applies.
        let head: Uint8Array | undefined;
        if (fs.readHead && needsHeadSniff(entry.name)) {
          try {
            head = await fs.readHead(childRel, SNIFF_BYTES);
          } catch {
            head = undefined;
          }
        }
        const fileClass = classifyFile({ name: entry.name, size: entry.size, head });
        refs.push({
          path: childRel,
          kind: isDebugSessionPath(childRelUnderPlanning) ? 'debug' : (positionKind(childRelUnderPlanning) ?? kindOfPath(childRelUnderPlanning, classification.location)),
          location: classification.location,
          phaseIdentity: classification.phaseIdentity,
          milestoneVersion: classification.milestoneVersion,
          quickTaskId: classification.quickTaskId,
          fileClass,
          sizeBytes,
        });
      }
    }
  }

  const planningExists = await fs.exists(PLANNING_DIR);
  if (planningExists) {
    await walk(PLANNING_DIR, 0);
  }

  // Deterministic order independent of readdir/Map-iteration order: location group (per the
  // module-level LOCATION_ORDER above), then milestone version, then phase number (dotted-numeric),
  // then path — the same six-way partition always sorts identically.
  refs.sort((a, b) => {
    const locDiff = LOCATION_ORDER[a.location] - LOCATION_ORDER[b.location];
    if (locDiff !== 0) return locDiff;
    const aVer = a.milestoneVersion ?? '';
    const bVer = b.milestoneVersion ?? '';
    if (aVer !== bVer) return aVer.localeCompare(bVer);
    if (a.phaseIdentity && b.phaseIdentity) {
      const numDiff = comparePhaseNumbers(a.phaseIdentity.number, b.phaseIdentity.number);
      if (numDiff !== 0) return numDiff;
    }
    return a.path.localeCompare(b.path);
  });
  exclusions.sort((a, b) => a.path.localeCompare(b.path));

  return { refs, exclusions };
}
