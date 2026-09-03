// Pure projection over an already-assembled ProjectPresentation — no filesystem I/O, no second
// walk of the planning tree, no low-level filesystem-path module import (see 03-03-PLAN.md's
// prohibitions). The tree is a literal mirror of `.planning/` as it sits on disk: every reachable
// artifact appears as a leaf (including files whose parsed kind is 'unknown'), and every recorded
// exclusion appears as a visible, reason-carrying stub — nothing this tool found or deliberately
// skipped is ever silently absent (D-10).
import { LOCATION_ORDER } from '../planning-repo/discovery.ts';
import { comparePhaseNumbers } from '../planning-repo/naming.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { artifactWarningTone, type ArtifactWarningTone } from './artifact-warning-tone.ts';
import { buildPhaseUrl, presentationRoutePatterns } from './routes.ts';

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
// routes.ts, project-presentation.ts, naming.ts, discovery.ts, and the zero-import-cost
// artifact-warning-tone.ts (Phase 4, D-12's single shared tone derivation).
type TreeLocation = keyof typeof LOCATION_ORDER;

export type TreeNodeType = 'group' | 'directory' | 'file' | 'exclusion';

export interface TreeNode {
  key: string;
  label: string;
  path: string;
  nodeType: TreeNodeType;
  location: TreeLocation;
  /** Null for a group/directory node with no route of its own, and for exclusion stubs. */
  url: string | null;
  /** Null except on exclusion stubs, where it carries discovery's own reason string verbatim. */
  excludedReason: string | null;
  /** True when a file leaf's artifact kind is the generic 'unknown' fallback. */
  unknownKind: boolean;
  /** D-12: a file leaf's damaged-artifact tone, derived once via `artifactWarningTone()`. Always
   * null on group/directory/exclusion nodes — the tone is metadata on a real leaf, never a new
   * node. */
  warningTone: ArtifactWarningTone;
  children: TreeNode[];
}

const GROUP_LABELS: Record<TreeLocation, string> = {
  root: 'Root Documents',
  phase: 'Phases',
  'archived-phase': 'Archived Phases',
  quick: 'Quick Tasks',
  'milestone-root': 'Milestones',
  research: 'Research',
  other: 'Other',
};

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

const ORDERED_LOCATIONS: TreeLocation[] = (Object.keys(LOCATION_ORDER) as TreeLocation[]).sort(
  (a, b) => LOCATION_ORDER[a] - LOCATION_ORDER[b],
);

/** Classifies an exclusion's directory path into the same location taxonomy discovery uses,
 * purely from its path segments — exclusions are recorded before discovery ever gets far enough
 * to classify them, so there is no ArtifactRef.location to read here. */
function locationOfExcludedPath(path: string): TreeLocation {
  const segments = path.split('/');
  const top = segments[1];
  if (top === undefined) return 'root';
  if (top === 'phases') return 'phase';
  if (top === 'quick') return 'quick';
  if (top === 'research') return 'research';
  if (top === 'milestones') {
    return segments[2] !== undefined && segments[2].endsWith('-phases')
      ? 'archived-phase'
      : 'milestone-root';
  }
  return 'other';
}

function relativeSegments(path: string, location: TreeLocation): string[] {
  const prefix = GROUP_PATH_PREFIX[location];
  return path.split('/').slice(prefix.length);
}

export function buildTreeViewModel(presentation: ProjectPresentation): TreeNode[] {
  const phaseDirPathToIdentity = new Map<string, PhaseIdentity>();
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      if (phase.dirPath !== null) phaseDirPathToIdentity.set(phase.dirPath, phase.identity);
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
      excludedReason: null,
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
    leaf: (path: string, label: string) => TreeNode,
  ): void {
    const groupPath = GROUP_PATH_PREFIX[location].join('/');
    // A zero-segment path is the location group's own directory — reachable when the excluded
    // path IS the planning root. D-10 says nothing skipped is ever silently absent, so this
    // becomes a leaf directly under the group rather than disappearing.
    if (relSegments.length === 0) {
      groupNode(location).children.push(leaf(groupPath, groupPath));
      return;
    }
    let cumulativePath = groupPath;
    let siblings = groupNode(location).children;
    for (let index = 0; index < relSegments.length - 1; index += 1) {
      const segment = relSegments[index];
      cumulativePath = `${cumulativePath}/${segment}`;
      let directory = directories.get(cumulativePath);
      if (!directory) {
        const identity = phaseDirPathToIdentity.get(cumulativePath);
        directory = {
          key: cumulativePath,
          label: segment,
          path: cumulativePath,
          nodeType: 'directory',
          location,
          url: identity ? buildPhaseUrl(identity) : null,
          excludedReason: null,
          unknownKind: false,
          warningTone: null,
          children: [],
        };
        directories.set(cumulativePath, directory);
        siblings.push(directory);
      }
      siblings = directory.children;
    }
    const label = relSegments[relSegments.length - 1];
    cumulativePath = `${cumulativePath}/${label}`;
    siblings.push(leaf(cumulativePath, label));
  }

  for (const artifact of presentation.artifacts) {
    insert(artifact.location, relativeSegments(artifact.path, artifact.location), (path, label) => ({
      key: path,
      label,
      path,
      nodeType: 'file',
      location: artifact.location,
      url: artifact.path === ROOT_REQUIREMENTS_PATH ? presentationRoutePatterns.traceability : artifact.key,
      excludedReason: null,
      unknownKind: artifact.kind === 'unknown',
      warningTone: artifactWarningTone(artifact),
      children: [],
    }));
  }

  for (const exclusion of presentation.exclusions) {
    const location = locationOfExcludedPath(exclusion.path);
    insert(location, relativeSegments(exclusion.path, location), (path, label) => ({
      key: `exclusion:${path}`,
      label,
      path,
      nodeType: 'exclusion',
      location,
      url: null,
      excludedReason: exclusion.reason,
      unknownKind: false,
      warningTone: null,
      children: [],
    }));
  }

  function sortChildren(nodes: TreeNode[]): void {
    const dirs = nodes.filter((node) => node.nodeType === 'directory');
    const leaves = nodes.filter((node) => node.nodeType !== 'directory');
    dirs.sort((left, right) => {
      const leftIdentity = phaseDirPathToIdentity.get(left.path);
      const rightIdentity = phaseDirPathToIdentity.get(right.path);
      if (leftIdentity && rightIdentity) return comparePhaseNumbers(leftIdentity.number, rightIdentity.number);
      return left.label.localeCompare(right.label);
    });
    leaves.sort((left, right) => left.label.localeCompare(right.label));
    nodes.splice(0, nodes.length, ...dirs, ...leaves);
    for (const dir of dirs) sortChildren(dir.children);
  }

  const result = ORDERED_LOCATIONS.map((location) => groupNode(location));
  for (const group of result) sortChildren(group.children);
  return result;
}
