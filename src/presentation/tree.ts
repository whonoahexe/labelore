// Pure projection over an already-assembled ProjectPresentation — no filesystem I/O, no second
// walk of the planning tree, no low-level filesystem-path module import (see 03-03-PLAN.md's
// prohibitions). The tree shows the project's markdown documents, each as a leaf with a readable
// label (quick-260911-vqe D-02/D-03). Some things are deliberately not shown in this surface:
// recorded exclusions (D-04), non-markdown machine state such as config.json, HANDOFF.json and
// milestone.lock, and the catch-all 'other' location. They all stay on ProjectPresentation
// verbatim for any other surface that wants them; nothing is deleted, only not rendered here.
import { LOCATION_ORDER } from '../planning-repo/discovery.ts';
import { comparePhaseNumbers } from '../planning-repo/naming.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { artifactWarningTone, type ArtifactWarningTone } from './artifact-warning-tone.ts';
import { buildPhaseUrl, presentationRoutePatterns } from './routes.ts';
import { GROUP_LABELS, labelOf, rankOf } from './tree-labels.ts';

// D-16: clicking the root REQUIREMENTS.md node in the sidebar lands on the traceability view
// rather than the raw document. Scoped to the root document only — an archived milestone's own
// REQUIREMENTS.md keeps its ordinary artifact route, since the traceability view only ever
// projects the live/root requirements set.
const ROOT_REQUIREMENTS_PATH = '.planning/REQUIREMENTS.md';

// PhaseIdentity itself isn't re-exported by project-presentation.ts — recovered structurally from
// the DTO shape it already carries, rather than adding a fifth import for one type.
type PhaseIdentity = ProjectPresentation['milestones'][number]['phases'][number]['identity'];

// The location union, recovered from LOCATION_ORDER's own key set rather than a second import of
// domain/model.ts's ArtifactLocation — this file's import list is deliberately limited to
// routes.ts, project-presentation.ts, naming.ts, discovery.ts, tree-labels.ts, and the
// zero-import-cost artifact-warning-tone.ts (Phase 4, D-12's single shared tone derivation).
export type TreeLocation = keyof typeof LOCATION_ORDER;

export type TreeNodeType = 'group' | 'directory' | 'file';

export interface TreeNode {
  key: string;
  label: string;
  path: string;
  nodeType: TreeNodeType;
  location: TreeLocation;
  /** Null for a group/directory node with no route of its own. */
  url: string | null;
  /** D-02: a small readable badge — a phase number, milestone version, or quick-task short date.
   * Null on group nodes and on any node with no natural badge. */
  badge: string | null;
  /** True when a file leaf's artifact kind is the generic 'unknown' fallback. */
  unknownKind: boolean;
  /** D-12: a file leaf's damaged-artifact tone, derived once via `artifactWarningTone()`. Always
   * null on group/directory nodes — the tone is metadata on a real leaf, never a new node. */
  warningTone: ArtifactWarningTone;
  children: TreeNode[];
}

// The path-segment prefix each location's artifacts share on disk, used only to reconstruct the
// remaining (real) path segments beneath a group — never to reclassify a path's location, which
// always comes from the artifact's own authoritative `location` field.
const GROUP_PATH_PREFIX: Record<TreeLocation, readonly string[]> = {
  root: ['.planning'],
  phase: ['.planning', 'phases'],
  'archived-phase': ['.planning', 'milestones'],
  quick: ['.planning', 'quick'],
  'milestone-root': ['.planning', 'milestones'],
  research: ['.planning', 'research'],
  other: ['.planning'],
};

// The catch-all location for anything outside GSD's known layout (spikes/, ui-reviews/, ...) —
// never a planning document worth browsing, so the tree drops the whole group.
const HIDDEN_LOCATIONS: ReadonlySet<TreeLocation> = new Set(['other']);

const ORDERED_LOCATIONS: TreeLocation[] = (Object.keys(LOCATION_ORDER) as TreeLocation[])
  .filter((location) => !HIDDEN_LOCATIONS.has(location))
  .sort((a, b) => LOCATION_ORDER[a] - LOCATION_ORDER[b]);

/** Only markdown documents in a browsable location reach the tree. */
function isShownInTree(artifact: { path: string; location: TreeLocation }): boolean {
  return !HIDDEN_LOCATIONS.has(artifact.location) && artifact.path.toLowerCase().endsWith('.md');
}

function relativeSegments(path: string, location: TreeLocation): string[] {
  const prefix = GROUP_PATH_PREFIX[location];
  return path.split('/').slice(prefix.length);
}

function lastSegment(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? path;
}

export function buildTreeViewModel(presentation: ProjectPresentation): TreeNode[] {
  const phaseDirPathToIdentity = new Map<string, { identity: PhaseIdentity; name: string }>();
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      if (phase.dirPath !== null) {
        phaseDirPathToIdentity.set(phase.dirPath, { identity: phase.identity, name: phase.name });
      }
    }
  }

  const groups = new Map<TreeLocation, TreeNode>();
  const directories = new Map<string, TreeNode>();

  function groupNode(location: TreeLocation): TreeNode {
    const existing = groups.get(location);
    if (existing) return existing;
    const created: TreeNode = {
      key: `group:${location}`,
      label: GROUP_LABELS[location],
      path: location,
      nodeType: 'group',
      location,
      url: null,
      badge: null,
      unknownKind: false,
      warningTone: null,
      children: [],
    };
    groups.set(location, created);
    return created;
  }

  function insert(
    location: TreeLocation,
    relSegments: string[],
    leaf: (path: string) => TreeNode,
  ): void {
    const groupPath = GROUP_PATH_PREFIX[location].join('/');
    let cumulativePath = groupPath;
    let siblings = groupNode(location).children;
    for (let index = 0; index < relSegments.length - 1; index += 1) {
      const segment = relSegments[index];
      cumulativePath = `${cumulativePath}/${segment}`;
      let directory = directories.get(cumulativePath);
      if (!directory) {
        const owning = phaseDirPathToIdentity.get(cumulativePath);
        const { label, badge } = labelOf(
          { location, nodeType: 'directory', path: cumulativePath },
          owning ? { name: owning.name, number: owning.identity.number } : null,
        );
        directory = {
          key: cumulativePath,
          label,
          path: cumulativePath,
          nodeType: 'directory',
          location,
          url: owning ? buildPhaseUrl(owning.identity) : null,
          badge,
          unknownKind: false,
          warningTone: null,
          children: [],
        };
        directories.set(cumulativePath, directory);
        siblings.push(directory);
      }
      siblings = directory.children;
    }
    cumulativePath = `${cumulativePath}/${relSegments[relSegments.length - 1]}`;
    siblings.push(leaf(cumulativePath));
  }

  for (const artifact of presentation.artifacts) {
    if (!isShownInTree(artifact)) continue;
    insert(artifact.location, relativeSegments(artifact.path, artifact.location), (path) => {
      const { label, badge } = labelOf({ location: artifact.location, nodeType: 'file', path }, null);
      return {
        key: path,
        label,
        path,
        nodeType: 'file',
        location: artifact.location,
        url: artifact.path === ROOT_REQUIREMENTS_PATH ? presentationRoutePatterns.traceability : artifact.key,
        badge,
        unknownKind: artifact.kind === 'unknown',
        warningTone: artifactWarningTone(artifact),
        children: [],
      };
    });
  }

  function rankCompare(left: TreeNode, right: TreeNode): number {
    const rankDiff = rankOf(left) - rankOf(right);
    if (rankDiff !== 0) return rankDiff;
    return lastSegment(left.path).localeCompare(lastSegment(right.path));
  }

  function sortChildren(nodes: TreeNode[]): void {
    const dirs = nodes.filter((node) => node.nodeType === 'directory');
    const leaves = nodes.filter((node) => node.nodeType !== 'directory');
    dirs.sort((left, right) => {
      const leftIdentity = phaseDirPathToIdentity.get(left.path);
      const rightIdentity = phaseDirPathToIdentity.get(right.path);
      if (leftIdentity && rightIdentity) {
        return comparePhaseNumbers(leftIdentity.identity.number, rightIdentity.identity.number);
      }
      return rankCompare(left, right);
    });
    leaves.sort(rankCompare);
    nodes.splice(0, nodes.length, ...dirs, ...leaves);
    for (const dir of dirs) sortChildren(dir.children);
  }

  const result = ORDERED_LOCATIONS.map((location) => groupNode(location));
  for (const group of result) sortChildren(group.children);
  return result;
}
