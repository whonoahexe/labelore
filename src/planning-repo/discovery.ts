// Discovers artifacts by filename and directory position ONLY (DATA-02) — never by frontmatter
// presence. The full GSD naming grammar lands in plan 01-03; this task assigns every discovered
// file kind: 'unknown' and the signature does not change later.
import type { PlanningFilesystem } from '../planning-fs/types.ts';
import type { ArtifactRef } from './types.ts';

const PLANNING_DIR = '.planning';
const SKIPPED_DIRS = new Set(['research/.cache']);
const MAX_WALK_DEPTH = 64; // guards against pathological/looping trees (T-01-06)

export interface DiscoveryResult {
  refs: ArtifactRef[];
  exclusions: string[];
}

function locationOf(relPathUnderPlanning: string): string {
  const [first] = relPathUnderPlanning.split('/');
  if (relPathUnderPlanning.indexOf('/') === -1) return 'root';
  switch (first) {
    case 'phases':
      return 'phases';
    case 'quick':
      return 'quick';
    case 'milestones':
      return 'milestones';
    case 'research':
      return 'research';
    default:
      return 'other';
  }
}

export async function discover(fs: PlanningFilesystem): Promise<DiscoveryResult> {
  const refs: ArtifactRef[] = [];
  const exclusions: string[] = [];

  async function walk(relDir: string, depth: number): Promise<void> {
    if (depth > MAX_WALK_DEPTH) {
      exclusions.push(relDir);
      return;
    }
    const relDirUnderPlanning = relDir === PLANNING_DIR ? '' : relDir.slice(PLANNING_DIR.length + 1);
    if (SKIPPED_DIRS.has(relDirUnderPlanning)) {
      exclusions.push(relDir);
      return;
    }

    let entries;
    try {
      entries = await fs.list(relDir);
    } catch {
      exclusions.push(relDir);
      return;
    }

    for (const entry of entries.slice().sort((a, b) => a.name.localeCompare(b.name))) {
      const childRel = `${relDir}/${entry.name}`;
      const childRelUnderPlanning = childRel.slice(PLANNING_DIR.length + 1);
      if (SKIPPED_DIRS.has(childRelUnderPlanning)) {
        exclusions.push(childRel);
        continue;
      }
      if (entry.isDirectory) {
        await walk(childRel, depth + 1);
      } else {
        refs.push({
          path: childRel,
          kind: 'unknown',
          location: locationOf(childRelUnderPlanning),
        });
      }
    }
  }

  const planningExists = await fs.exists(PLANNING_DIR);
  if (planningExists) {
    await walk(PLANNING_DIR, 0);
  }

  refs.sort((a, b) => a.path.localeCompare(b.path));
  exclusions.sort((a, b) => a.localeCompare(b));

  return { refs, exclusions };
}
