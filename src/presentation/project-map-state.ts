// Whether a project holds a codebase map, and whether that map is ALL it holds (TGT-09). Kept tiny on
// purpose, like project-research-files.ts: the app shell imports it into the entry chunk to decide whether
// the Roadmap and Traceability tabs show, and the router imports it to pick the dashboard address's page.
// "Map-only" is derived from the artifact list each time, never stored: a project that later gains a
// roadmap simply stops being map-only.
import { CODEBASE_MAP_FILES, type CodebaseMapFile } from '../planning-repo/codebase-files.ts';

export interface ProjectMapState {
  /** The recognised map documents the project holds, in the Codebase page's order. */
  present: CodebaseMapFile[];
  /** True when the project holds at least one map document, no ROADMAP.md and nothing inside a phase folder. */
  mapOnly: boolean;
}

const MAP_DIR = '.planning/codebase/';
const ROADMAP_PATH = '.planning/ROADMAP.md';

/**
 * D-04: a stray CHANGELOG-*.md, a ui-reviews/ folder or a lone PROJECT.md does not stop a project being
 * map-only; a roadmap or any live or archived phase artifact does. D-08: a file in codebase/ that is not one
 * of the seven names counts for nothing.
 */
export function projectMapState(
  artifacts: readonly { path: string; location: string }[],
): ProjectMapState {
  const paths = new Set(artifacts.map((artifact) => artifact.path));
  const present = CODEBASE_MAP_FILES.filter((name) => paths.has(`${MAP_DIR}${name}`));
  const hasRoadmap = paths.has(ROADMAP_PATH);
  const hasPhaseArtifact = artifacts.some(
    (artifact) => artifact.location === 'phase' || artifact.location === 'archived-phase',
  );
  return { present: [...present], mapOnly: present.length > 0 && !hasRoadmap && !hasPhaseArtifact };
}
