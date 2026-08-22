// Discovers artifacts by filename and directory position ONLY (DATA-02) — never by frontmatter
// presence. Directory position is a legitimate second axis of the dispatch signal alongside
// filename: GSD's own naming grammar is position-dependent (an identically-named PLAN.md under
// `phases/` is a live plan; the same filename under `milestones/vX.Y-phases/` is archived).
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { ArtifactRef, ArtifactLocation, DiscoveryExclusion } from './types.ts';
import type { PhaseIdentity } from '../domain/model.ts';
import {
  parsePhaseDirName,
  parsePlanFileName,
  parsePhaseArtifactName,
  parseQuickDirName,
  parseMilestoneFileName,
  parseMilestonePhasesDirName,
  isCanonicalRootFile,
  comparePhaseNumbers,
} from './naming.ts';

const PLANNING_DIR = '.planning';
const SKIPPED_DIRS = new Set(['research/.cache']);
// Guards against a pathological/looping tree. The PlanningFilesystem port has no symlink-following
// semantics to genuinely reproduce a symlink cycle in-memory (InMemoryPlanningFilesystem is a flat
// path→content map), so a runaway walk depth is this discovery pass's cycle terminator — the same
// mechanism a real inside-tree symlink loop would eventually trip via node:fs's own ELOOP, one
// layer below this port.
const MAX_WALK_DEPTH = 64;

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

/** Derives an open-string artifact kind from a filename alone — never from content (DATA-02). */
function deriveKind(fileName: string): string {
  const milestoneFile = parseMilestoneFileName(fileName);
  if (milestoneFile.matched) return milestoneFile.document.toLowerCase();

  if (isCanonicalRootFile(fileName)) {
    return fileName.replace(/\.(md|json|lock)$/i, '').toLowerCase();
  }

  const plan = parsePlanFileName(fileName);
  if (plan.matched) return plan.kind;

  const artifact = parsePhaseArtifactName(fileName);
  if (artifact.matched) return artifact.artifact.toLowerCase();

  return 'unknown';
}

interface Classification {
  location: ArtifactLocation;
  phaseIdentity: PhaseIdentity | null;
  milestoneVersion: string | null;
  quickTaskId: string | null;
}

/** Classifies a path (relative to `.planning/`, forward-slash separated) by position alone. */
function classify(relPathUnderPlanning: string): Classification {
  const segments = relPathUnderPlanning.split('/');
  if (segments.length === 1) {
    return { location: 'root', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  }

  const [top, ...rest] = segments;

  if (top === 'phases') {
    const phaseDirName = rest[0];
    const phaseIdentity = phaseDirName ? resolvePhaseDirIdentity(phaseDirName, null) : null;
    return { location: 'phase', phaseIdentity, milestoneVersion: null, quickTaskId: null };
  }

  if (top === 'quick') {
    const quickDirName = rest[0];
    const parsedQuick = quickDirName ? parseQuickDirName(quickDirName) : { matched: false as const };
    const quickTaskId = parsedQuick.matched ? `${parsedQuick.date}-${parsedQuick.timeToken}` : (quickDirName ?? null);
    return { location: 'quick', phaseIdentity: null, milestoneVersion: null, quickTaskId };
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
      const phaseDirName = rest[1];
      const phaseIdentity = phaseDirName ? resolvePhaseDirIdentity(phaseDirName, phasesMatch.version) : null;
      return { location: 'archived-phase', phaseIdentity, milestoneVersion: phasesMatch.version, quickTaskId: null };
    }
    return { location: 'milestone-root', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  }

  if (top === 'research') {
    return { location: 'research', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
  }

  return { location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
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
      if (entry.isDirectory) {
        await walk(childRel, depth + 1);
      } else {
        const classification = classify(childRelUnderPlanning);
        refs.push({
          path: childRel,
          kind: deriveKind(entry.name),
          location: classification.location,
          phaseIdentity: classification.phaseIdentity,
          milestoneVersion: classification.milestoneVersion,
          quickTaskId: classification.quickTaskId,
        });
      }
    }
  }

  const planningExists = await fs.exists(PLANNING_DIR);
  if (planningExists) {
    await walk(PLANNING_DIR, 0);
  }

  // Deterministic order independent of readdir/Map-iteration order: location group, then
  // milestone version, then phase number (dotted-numeric), then path. Location groups are ordered
  // by a fixed precedence list so the same six-way partition always sorts identically.
  const LOCATION_ORDER: Record<ArtifactLocation, number> = {
    root: 0,
    phase: 1,
    'archived-phase': 2,
    quick: 3,
    'milestone-root': 4,
    research: 5,
    other: 6,
  };
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
