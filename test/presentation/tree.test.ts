import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildTreeViewModel, type TreeNode, type TreeNodeType } from '../../src/presentation/tree.ts';
import { sentenceCase } from '../../src/presentation/tree-labels.ts';
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
  it('Test 1: file leaves cover every markdown artifact outside the other location — no extra, no missing', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const filePaths = new Set(collectByType(tree, 'file').map((node) => node.path));
    const shownPaths = new Set(
      presentation.artifacts
        .filter((artifact) => artifact.location !== 'other' && artifact.path.endsWith('.md'))
        .map((artifact) => artifact.path),
    );
    expect(filePaths.size).toBeGreaterThan(40);
    expect(filePaths).toEqual(shownPaths);
  });

  it('hides non-markdown machine state and the whole other location', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    for (const path of [
      '.planning/config.json',
      '.planning/estimation-calibration.json',
      '.planning/HANDOFF.json',
      '.planning/ui-reviews',
      '.planning/ui-reviews/.gitignore',
    ]) {
      expect(findNode(tree, path), `${path} should not be in the tree`).toBeUndefined();
    }
    expect(tree.some((node) => node.location === 'other')).toBe(false);
    for (const node of collectByType(tree, 'file')) {
      expect(node.path.endsWith('.md'), `${node.path} should be markdown`).toBe(true);
    }
  });

  it('Test 2: top-level groups appear in LOCATION_ORDER sequence, without the other location', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    expect(tree.map((node) => node.location)).toEqual([
      'root',
      'phase',
      'archived-phase',
      'quick',
      'milestone-root',
      'research',
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

  it('Test 5 (inverted, D-04): the research/.cache exclusion is not shown; the research group holds exactly its three .md files', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    for (const node of collectByType(tree, 'file').concat(collectByType(tree, 'directory'))) {
      expect(node.path).not.toContain('.cache');
    }

    const researchGroup = tree.find((node) => node.location === 'research');
    expect(researchGroup?.children.map((child) => child.path).sort()).toEqual(
      [
        '.planning/research/PITFALLS.md',
        '.planning/research/STACK.md',
        '.planning/research/SUMMARY.md',
      ].sort(),
    );
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
    const presentation = await presentationOf({ '.planning/phases/01-a/notes.md': '# notes' });
    const tree = buildTreeViewModel(presentation);
    const node = findNode(tree, '.planning/phases/01-a/notes.md');
    expect(node).toBeDefined();
    expect(node?.nodeType).toBe('file');
    expect(node?.unknownKind).toBe(true);
    expect(node?.url).toBeTruthy();
  });

  it('Test 7: a sparse project with no quick/milestones/research renders without error', async () => {
    const presentation = await fixturePresentation('sparse-started');
    const tree = buildTreeViewModel(presentation);
    expect(tree).toHaveLength(6);
    for (const location of ['quick', 'milestone-root', 'research', 'archived-phase'] as const) {
      const group = tree.find((node) => node.location === location);
      expect(group === undefined || group.children.length === 0).toBe(true);
    }
    const phaseGroup = tree.find((node) => node.location === 'phase');
    expect(phaseGroup?.children.length).toBeGreaterThan(0);
  });

  it('orders phase directory siblings by dotted-numeric phase number, not lexicographically (D-03)', async () => {
    const presentation = await presentationOf({
      '.planning/phases/10-tenth/10-CONTEXT.md': 'a',
      '.planning/phases/2-second/2-CONTEXT.md': 'b',
      '.planning/phases/2.1-urgent/2.1-CONTEXT.md': 'c',
    });
    const tree = buildTreeViewModel(presentation);
    const phaseGroup = tree.find((node) => node.location === 'phase');
    expect(phaseGroup?.children.map((node) => node.path)).toEqual([
      '.planning/phases/2-second',
      '.planning/phases/2.1-urgent',
      '.planning/phases/10-tenth',
    ]);
    expect(phaseGroup?.children.map((node) => node.badge)).toEqual(['2', '2.1', '10']);
  });
});

describe('buildTreeViewModel — exclusions hidden (D-04, WR-01 inverted)', () => {
  // D-04 reverses Phase-3 D-10's "visible stub" rule for the tree only: a recorded exclusion is
  // never rendered, even in the one worst case where the exclusion IS the planning root itself and
  // there is nothing else to show — that must still yield an empty, non-throwing tree of six
  // empty groups rather than a stub node or a thrown error.
  it('a presentation carrying only the .planning exclusion yields six empty groups, without throwing', () => {
    const presentation = {
      milestones: [],
      artifacts: [],
      exclusions: [{ path: '.planning', reason: 'Directory could not be listed (EACCES)' }],
    } as unknown as ProjectPresentation;

    expect(() => buildTreeViewModel(presentation)).not.toThrow();
    const tree = buildTreeViewModel(presentation);

    expect(tree).toHaveLength(6);
    for (const group of tree) {
      expect(group.nodeType).toBe('group');
      expect(group.children).toHaveLength(0);
    }
    expect(collectByType(tree, 'file')).toHaveLength(0);
    expect(collectByType(tree, 'directory')).toHaveLength(0);
  });

  it('no node anywhere carries an excludedReason key, and no label ever contains "Excluded"', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    function walk(nodes: TreeNode[]): void {
      for (const node of nodes) {
        expect(node).not.toHaveProperty('excludedReason');
        expect(node.label).not.toContain('Excluded');
        walk(node.children);
      }
    }
    walk(tree);
  });
});

describe('buildTreeViewModel — readable labels and badges (quick-260911-vqe D-02)', () => {
  it('sentenceCase splits, cases and upper-cases the known acronym set', () => {
    expect(sentenceCase('UI-SPEC')).toBe('UI spec');
    expect(sentenceCase('AI-SPEC')).toBe('AI spec');
    expect(sentenceCase('DISCUSSION-LOG')).toBe('Discussion log');
    expect(sentenceCase('COST-MODEL')).toBe('Cost model');
    expect(sentenceCase('estimation-calibration')).toBe('Estimation calibration');
    expect(sentenceCase('api_keys')).toBe('API keys');
    expect(sentenceCase('UAT')).toBe('UAT');
    expect(sentenceCase('add-transport-adapter')).toBe('Add transport adapter');
  });

  it('the dense tree groups appear in sentence-cased order: Project, Phases, Archived phases, Quick tasks, Milestones, Research', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    expect(tree.map((node) => node.label)).toEqual([
      'Project',
      'Phases',
      'Archived phases',
      'Quick tasks',
      'Milestones',
      'Research',
    ]);
  });

  it('renders readable label/badge pairs for a spread of dense fixture paths', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const cases: Array<[string, string, string | null]> = [
      ['.planning/STATE.md', 'State', null],
      ['.planning/v3.0-CAPACITY-PLAN.md', 'Capacity plan', 'v3.0'],
      ['.planning/phases/01-identity-slice', 'Identity Slice', '01'],
      ['.planning/phases/01-identity-slice/01-01-PLAN.md', 'Plan 01', null],
      ['.planning/phases/01-identity-slice/01-02-SUMMARY.md', 'Summary 02', null],
      ['.planning/phases/01-identity-slice/01-UI-SPEC.md', 'UI spec', null],
      ['.planning/phases/01-identity-slice/01-AI-SPEC.md', 'AI spec', null],
      ['.planning/phases/01-identity-slice/01-UAT.md', 'UAT', null],
      ['.planning/milestones/v1.0-phases', 'v1.0', null],
      ['.planning/milestones/v2.0-phases/02-batch-export', 'Batch Export', '02'],
      ['.planning/quick/260615-1a2-add-transport-adapter', 'Add transport adapter', 'Jun 15'],
      ['.planning/quick/260701-3xz-fix-quick-typo', 'Fix quick typo', 'Jul 1'],
      ['.planning/quick/260615-1a2-add-transport-adapter/260615-1a2-PLAN.md', 'Plan', null],
      ['.planning/milestones/v1.0-ROADMAP.md', 'Roadmap', 'v1.0'],
      ['.planning/milestones/v2.0-MILESTONE-AUDIT.md', 'Milestone audit', 'v2.0'],
      ['.planning/research/STACK.md', 'Stack', null],
    ];
    for (const [path, label, badge] of cases) {
      const node = findNode(tree, path);
      expect(node, `expected a node at ${path}`).toBeDefined();
      expect(node?.label, `label for ${path}`).toBe(label);
      expect(node?.badge, `badge for ${path}`).toBe(badge);
    }
  });

  it('no file-leaf label anywhere in the dense tree contains ".md" or ".json"', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    for (const node of collectByType(tree, 'file')) {
      expect(node.label).not.toContain('.md');
      expect(node.label).not.toContain('.json');
    }
  });

  it('keeps a root markdown file and drops its same-named JSON sibling and other root JSON', () => {
    const presentation = {
      milestones: [],
      artifacts: [
        {
          key: 'a~state-md',
          path: '.planning/STATE.md',
          kind: 'markdown',
          title: 'state',
          location: 'root',
          frontmatter: {},
          structured: {},
          milestoneKey: null,
          phaseKey: null,
          warnings: [],
          bodyLength: 5,
        },
        {
          key: 'a~state-json',
          path: '.planning/STATE.json',
          kind: 'unknown',
          title: 'state',
          location: 'root',
          frontmatter: {},
          structured: {},
          milestoneKey: null,
          phaseKey: null,
          warnings: [],
          bodyLength: 5,
        },
        {
          key: 'a~config',
          path: '.planning/config.json',
          kind: 'unknown',
          title: 'config',
          location: 'root',
          frontmatter: {},
          structured: {},
          milestoneKey: null,
          phaseKey: null,
          warnings: [],
          bodyLength: 5,
        },
      ],
      exclusions: [],
    } as unknown as ProjectPresentation;

    const tree = buildTreeViewModel(presentation);
    expect(findNode(tree, '.planning/STATE.md')?.label).toBe('State');
    expect(findNode(tree, '.planning/STATE.json')).toBeUndefined();
    expect(findNode(tree, '.planning/config.json')).toBeUndefined();
  });
});

describe('buildTreeViewModel — lifecycle order (D-03)', () => {
  it('orders a phase directory Context, Spec, AI spec, UI spec, Research, Patterns, Cost model, Validation, then plans interleaved with summaries, then Verification, Security, UAT, Learnings', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const phaseDir = findNode(tree, '.planning/phases/01-identity-slice');
    expect(phaseDir?.children.map((node) => node.label)).toEqual([
      'Context',
      'Spec',
      'AI spec',
      'UI spec',
      'Research',
      'Patterns',
      'Cost model',
      'Validation',
      'Plan 01',
      'Summary 01',
      'Plan 02',
      'Summary 02',
      'Verification',
      'Security',
      'UAT',
      'Learnings',
    ]);
  });

  it('orders the root group Project, Roadmap, Requirements, State, Milestones, Backlog, Learnings, Retrospective, then other .md', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const rootGroup = tree.find((node) => node.location === 'root');
    expect(rootGroup?.children.map((node) => node.label)).toEqual([
      'Project',
      'Roadmap',
      'Requirements',
      'State',
      'Milestones',
      'Backlog',
      'Learnings',
      'Retrospective',
      'Capacity plan',
      'Windows',
    ]);
  });

  it('orders quick task directories newest first by the raw YYMMDD-ttt name', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const quickGroup = tree.find((node) => node.location === 'quick');
    expect(quickGroup?.children.map((node) => node.path)).toEqual([
      '.planning/quick/260701-3xz-fix-quick-typo',
      '.planning/quick/260615-1a2-add-transport-adapter',
    ]);
  });

  it('orders milestone-root files newest version first, then Roadmap, Requirements, Milestone audit', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const milestoneRootGroup = tree.find((node) => node.location === 'milestone-root');
    expect(
      milestoneRootGroup?.children.map((node) => [node.label, node.badge]),
    ).toEqual([
      ['Roadmap', 'v2.0'],
      ['Requirements', 'v2.0'],
      ['Milestone audit', 'v2.0'],
      ['Roadmap', 'v1.0'],
      ['Requirements', 'v1.0'],
      ['Milestone audit', 'v1.0'],
    ]);
  });

  it('orders research Summary, Stack, Pitfalls', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const researchGroup = tree.find((node) => node.location === 'research');
    expect(researchGroup?.children.map((node) => node.label)).toEqual(['Summary', 'Stack', 'Pitfalls']);
  });

  it('orders archived wrappers v1.0 then v2.0, with the v2.0 phases Legacy Ingest then Batch Export', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    const archivedGroup = tree.find((node) => node.location === 'archived-phase');
    expect(archivedGroup?.children.map((node) => node.label)).toEqual(['v1.0', 'v2.0']);
    const v2Wrapper = findNode(tree, '.planning/milestones/v2.0-phases');
    expect(v2Wrapper?.children.map((node) => node.label)).toEqual(['Legacy Ingest', 'Batch Export']);
  });

  it('every node carries a badge key (string or null)', async () => {
    const presentation = await fixturePresentation('dense');
    const tree = buildTreeViewModel(presentation);
    function walk(nodes: TreeNode[]): void {
      for (const node of nodes) {
        expect(node).toHaveProperty('badge');
        expect(typeof node.badge === 'string' || node.badge === null).toBe(true);
        walk(node.children);
      }
    }
    walk(tree);
  });
});

describe('buildTreeViewModel — D-12 warning tone (Phase 4)', () => {
  function artifactPresentation(artifacts: Array<Record<string, unknown>>): ProjectPresentation {
    return { milestones: [], artifacts, exclusions: [] } as unknown as ProjectPresentation;
  }

  function countNodes(nodes: TreeNode[]): number {
    return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
  }

  it('marks a warned artifact with a non-empty body with the body-survived tone; a clean sibling stays null — both keep their url', () => {
    const presentation = artifactPresentation([
      {
        key: 'a~clean',
        path: '.planning/clean.md',
        kind: 'markdown',
        title: 'clean',
        location: 'root',
        frontmatter: {},
        structured: {},
        milestoneKey: null,
        phaseKey: null,
        warnings: [],
        bodyLength: 10,
      },
      {
        key: 'a~broken',
        path: '.planning/broken.md',
        kind: 'markdown',
        title: 'broken',
        location: 'root',
        frontmatter: {},
        structured: {},
        milestoneKey: null,
        phaseKey: null,
        warnings: [{ path: '.planning/broken.md', stage: 'frontmatter', message: 'boom', salvage: 'body intact' }],
        bodyLength: 10,
      },
    ]);

    const tree = buildTreeViewModel(presentation);
    const fileLeaves = collectByType(tree, 'file');
    expect(fileLeaves.filter((node) => node.warningTone === 'warning')).toHaveLength(1);
    expect(fileLeaves.filter((node) => node.warningTone === null)).toHaveLength(1);

    const clean = findNode(tree, '.planning/clean.md');
    const broken = findNode(tree, '.planning/broken.md');
    expect(clean?.warningTone).toBeNull();
    expect(clean?.url).toBeTruthy();
    expect(broken?.warningTone).toBe('warning');
    expect(broken?.url).toBeTruthy();
  });

  it('marks a warned artifact with an empty body with the nothing-salvageable tone', () => {
    const presentation = artifactPresentation([
      {
        key: 'a~unreadable',
        path: '.planning/unreadable.md',
        kind: 'markdown',
        title: 'unreadable',
        location: 'root',
        frontmatter: {},
        structured: {},
        milestoneKey: null,
        phaseKey: null,
        warnings: [{ path: '.planning/unreadable.md', stage: 'read', message: 'boom', salvage: 'nothing readable' }],
        bodyLength: 0,
      },
    ]);

    const tree = buildTreeViewModel(presentation);
    expect(findNode(tree, '.planning/unreadable.md')?.warningTone).toBe('unreadable');
  });

  it('group and directory nodes always carry a null tone, and the total node count is identical with and without warnings — no node is added or removed by a warning', () => {
    const artifactAt = (warned: boolean) => [
      {
        key: 'a~x',
        path: '.planning/phases/01-a/01-CONTEXT.md',
        kind: 'context',
        title: 'x',
        location: 'phase',
        frontmatter: {},
        structured: {},
        milestoneKey: null,
        phaseKey: null,
        warnings: warned
          ? [{ path: '.planning/phases/01-a/01-CONTEXT.md', stage: 'frontmatter', message: 'boom', salvage: 'body intact' }]
          : [],
        bodyLength: 5,
      },
    ];

    const cleanTree = buildTreeViewModel(artifactPresentation(artifactAt(false)));
    const warnedTree = buildTreeViewModel(artifactPresentation(artifactAt(true)));

    expect(countNodes(warnedTree)).toBe(countNodes(cleanTree));

    for (const node of [...collectByType(warnedTree, 'group'), ...collectByType(warnedTree, 'directory')]) {
      expect(node.warningTone).toBeNull();
    }
  });
});
