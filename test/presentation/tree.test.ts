import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildTreeViewModel, type TreeNode, type TreeNodeType } from '../../src/presentation/tree.ts';
import { buildPhaseUrl, presentationRoutePatterns } from '../../src/presentation/routes.ts';
import { toProjectPresentation, type ProjectPresentation } from '../../src/server/project-presentation.ts';

const ROOT = '/project';

async function presentationOf(files: Record<string, string>): Promise<ProjectPresentation> {
  const repository = new PlanningRepository(new InMemoryPlanningFilesystem(files), ROOT);
  const snapshot = await repository.load();
  return toProjectPresentation(snapshot);
}

async function fixturePresentation(name: string): Promise<ProjectPresentation> {
  const root = resolve(`fixtures/${name}`);
  const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
  const snapshot = await repository.load();
  return toProjectPresentation(snapshot);
}

function collectByType(nodes: TreeNode[], type: TreeNodeType): TreeNode[] {
  return nodes.flatMap((node) => [
    ...(node.nodeType === type ? [node] : []),
    ...collectByType(node.children, type),
  ]);
}

function findNode(nodes: TreeNode[], path: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    const found = findNode(node.children, path);
    if (found) return found;
  }
  return undefined;
}

describe('buildTreeViewModel — fixtures/dense', () => {
  it('Test 1: file leaves cover every reachable artifact path — no extra, no missing', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const filePaths = new Set(collectByType(tree, 'file').map((node) => node.path));
    const artifactPaths = new Set(presentation.artifacts.map((artifact) => artifact.path));
    expect(filePaths.size).toBe(52);
    expect(filePaths).toEqual(artifactPaths);
  });

  it('Test 2: top-level groups appear in LOCATION_ORDER sequence', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    expect(tree.map((node) => node.location)).toEqual([
      'root',
      'phase',
      'archived-phase',
      'quick',
      'milestone-root',
      'research',
      'other',
    ]);
    expect(tree.every((node) => node.nodeType === 'group')).toBe(true);
  });

  it('Test 3: directory nodes reconstruct real path segments for phases and quick tasks', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);

    const phaseDir = findNode(tree, '.planning/phases/01-identity-slice');
    expect(phaseDir?.nodeType).toBe('directory');
    expect(
      phaseDir?.children.some((child) => child.path === '.planning/phases/01-identity-slice/01-01-PLAN.md'),
    ).toBe(true);

    const archivedWrapper = findNode(tree, '.planning/milestones/v1.0-phases');
    expect(archivedWrapper?.nodeType).toBe('directory');
    const archivedPhaseDir = findNode(tree, '.planning/milestones/v1.0-phases/01-bootstrap');
    expect(archivedPhaseDir?.nodeType).toBe('directory');
    expect(
      archivedPhaseDir?.children.some(
        (child) => child.path === '.planning/milestones/v1.0-phases/01-bootstrap/01-01-PLAN.md',
      ),
    ).toBe(true);

    const quickDir = findNode(tree, '.planning/quick/260615-1a2-add-transport-adapter');
    expect(quickDir?.nodeType).toBe('directory');
    expect(
      quickDir?.children.some(
        (child) => child.path === '.planning/quick/260615-1a2-add-transport-adapter/260615-1a2-PLAN.md',
      ),
    ).toBe(true);
    // A quick-task directory has no route of its own.
    expect(quickDir?.url).toBeNull();
  });

  it('Test 5: the research/.cache exclusion is a single flagged node under the research group', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const exclusions = collectByType(tree, 'exclusion');
    expect(exclusions).toHaveLength(1);
    expect(exclusions[0].path).toBe('.planning/research/.cache');
    expect(exclusions[0].excludedReason).toBe(presentation.exclusions[0]?.reason);
    expect(exclusions[0].excludedReason?.length ?? 0).toBeGreaterThan(0);
    expect(exclusions[0].url).toBeNull();

    const researchGroup = tree.find((node) => node.location === 'research');
    expect(researchGroup?.children.some((child) => child.nodeType === 'exclusion')).toBe(true);
  });

  it('Test 6: every leaf url is exactly the artifact DTO key, never hand-built — except the root REQUIREMENTS.md override (D-16)', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const keyByPath = new Map(presentation.artifacts.map((artifact) => [artifact.path, artifact.key]));
    for (const file of collectByType(tree, 'file')) {
      if (file.path === '.planning/REQUIREMENTS.md') {
        expect(file.url).toBe(presentationRoutePatterns.traceability);
        continue;
      }
      expect(file.url).toBe(keyByPath.get(file.path));
      expect(file.url).toBeTruthy();
      expect(file.url?.startsWith('/artifacts/') || file.url?.startsWith('/milestones/')).toBe(true);
    }
  });

  it('Task 2 Test 1: the root REQUIREMENTS.md node resolves to the traceability route; every other root document keeps its artifact route', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);

    const rootRequirements = findNode(tree, '.planning/REQUIREMENTS.md');
    expect(rootRequirements?.url).toBe(presentationRoutePatterns.traceability);

    const archivedRequirements = findNode(tree, '.planning/milestones/v1.0-REQUIREMENTS.md');
    expect(archivedRequirements?.url).toBeTruthy();
    expect(archivedRequirements?.url).not.toBe(presentationRoutePatterns.traceability);

    const keyByPath = new Map(presentation.artifacts.map((artifact) => [artifact.path, artifact.key]));
    const otherRootDocs = collectByType(tree, 'file').filter(
      (node) => node.location === 'root' && node.path !== '.planning/REQUIREMENTS.md',
    );
    expect(otherRootDocs.length).toBeGreaterThan(0);
    for (const node of otherRootDocs) {
      expect(node.url).toBe(keyByPath.get(node.path));
    }
  });

  it('Task 2 Test 2: a project with no root REQUIREMENTS.md produces a tree with no such override and no thrown error', async () => {
    const presentation = await presentationOf({ '.planning/spikes/idea.md': '# idea' });
    expect(() => buildTreeViewModel(presentation)).not.toThrow();
    const tree = buildTreeViewModel(presentation);
    expect(findNode(tree, '.planning/REQUIREMENTS.md')).toBeUndefined();
  });

  it('phase directory nodes resolve their url via buildPhaseUrl on the owning identity', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const phase = presentation.milestones
      .flatMap((milestone) => milestone.phases)
      .find((candidate) => candidate.dirPath === '.planning/phases/01-identity-slice');
    expect(phase).toBeDefined();
    const phaseDir = findNode(tree, '.planning/phases/01-identity-slice');
    expect(phaseDir?.url).toBe(buildPhaseUrl(phase!.identity));
  });
});

describe('buildTreeViewModel — small fixtures', () => {
  it('Test 4: a file with an unrecognized kind still appears as an ordinary leaf with a destination', async () => {
    const presentation = await presentationOf({ '.planning/spikes/idea.md': '# idea' });
    const tree = buildTreeViewModel(presentation);
    const node = findNode(tree, '.planning/spikes/idea.md');
    expect(node).toBeDefined();
    expect(node?.nodeType).toBe('file');
    expect(node?.unknownKind).toBe(true);
    expect(node?.url).toBeTruthy();
  });

  it('Test 7: a sparse project with no quick/milestones/research renders without error', async () => {
    const presentation = await fixturePresentation('sparse-started');
    const tree = buildTreeViewModel(presentation);
    expect(tree).toHaveLength(7);
    for (const location of ['quick', 'milestone-root', 'research', 'archived-phase'] as const) {
      const group = tree.find((node) => node.location === location);
      expect(group === undefined || group.children.length === 0).toBe(true);
    }
    const phaseGroup = tree.find((node) => node.location === 'phase');
    expect(phaseGroup?.children.length).toBeGreaterThan(0);
  });

  it('orders phase directory siblings by dotted-numeric phase number, not lexicographically', async () => {
    const presentation = await presentationOf({
      '.planning/phases/10-tenth/10-CONTEXT.md': 'a',
      '.planning/phases/2-second/2-CONTEXT.md': 'b',
      '.planning/phases/2.1-urgent/2.1-CONTEXT.md': 'c',
    });
    const tree = buildTreeViewModel(presentation);
    const phaseGroup = tree.find((node) => node.location === 'phase');
    expect(phaseGroup?.children.map((node) => node.label)).toEqual([
      '2-second',
      '2.1-urgent',
      '10-tenth',
    ]);
  });
});

describe('buildTreeViewModel — zero-segment exclusions (WR-01)', () => {
  // D-10: nothing this tool found or deliberately skipped is ever silently absent. The one
  // exclusion whose path IS the planning root (`.planning` itself unlistable) relativizes to
  // zero segments against GROUP_PATH_PREFIX.root, and insert()'s early return used to drop it —
  // so the single worst case, where nothing under .planning/ could be read, rendered as an
  // empty tree carrying no explanation at all.
  it('renders a .planning-rooted exclusion as a visible, reason-carrying stub', () => {
    const presentation = {
      milestones: [],
      artifacts: [],
      exclusions: [{ path: '.planning', reason: 'Directory could not be listed (EACCES)' }],
    } as unknown as ProjectPresentation;

    const tree = buildTreeViewModel(presentation);
    const exclusions = collectByType(tree, 'exclusion');

    expect(exclusions).toHaveLength(1);
    expect(exclusions[0].path).toBe('.planning');
    expect(exclusions[0].excludedReason).toBe('Directory could not be listed (EACCES)');
    expect(exclusions[0].url).toBeNull();
    expect(exclusions[0].label.length).toBeGreaterThan(0);
  });
});
