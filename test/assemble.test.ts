import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { assembleDomainModel } from '../src/planning-repo/assemble.ts';
import { discover } from '../src/planning-repo/discovery.ts';
import { parseWithRegistry } from '../src/planning-repo/registry.ts';
import { WarningCollector } from '../src/planning-repo/warnings.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { buildSearchDocuments, createSearchIndexState, searchIndex } from '../src/server/search-index.ts';
import type { ParsedArtifact, ArtifactRef } from '../src/planning-repo/types.ts';

const ROOT = '/project';

function waitForBuild(): Promise<void> {
  return new Promise((done) => setImmediate(done));
}

async function assembleTree(files: Record<string, string>) {
  const fs = new InMemoryPlanningFilesystem(files);
  const warnings = new WarningCollector();
  const { refs } = await discover(fs);
  const parsed = await Promise.all(refs.map((r) => parseWithRegistry(fs, r, warnings)));
  const project = assembleDomainModel(parsed, warnings, ROOT);
  return { project, warnings, parsed };
}

function makeRef(path: string, overrides: Partial<ArtifactRef> = {}): ArtifactRef {
  return {
    path,
    kind: 'unknown',
    location: 'root',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
    ...overrides,
  };
}

describe('assembleDomainModel — milestone grouping', () => {
  it('yields three Milestone entries for a live milestone and two archived ones, each carrying its own phases', async () => {
    const { project } = await assembleTree({
      '.planning/STATE.md': '---\nmilestone: v3.0\n---\n\n# Project State\n',
      '.planning/phases/01-current/01-CONTEXT.md': '<domain>x</domain>',
      '.planning/milestones/v1.0-phases/01-first/01-CONTEXT.md': '<domain>x</domain>',
      '.planning/milestones/v2.0-phases/01-second/01-CONTEXT.md': '<domain>x</domain>',
    });
    expect(project.milestones).toHaveLength(3);
    const versions = project.milestones.map((m) => m.version).sort();
    expect(versions).toEqual(['v1.0', 'v2.0', 'v3.0']);
    for (const m of project.milestones) {
      expect(m.phases.length).toBeGreaterThan(0);
    }
  });

  it('gives a live phase 01 and an archived phase 01 under a different milestone two entries whose identity.milestoneVersion differ', async () => {
    const { project } = await assembleTree({
      '.planning/STATE.md': '---\nmilestone: v2.0\n---\n\n# Project State\n',
      '.planning/phases/01-current/01-CONTEXT.md': '<domain>x</domain>',
      '.planning/milestones/v1.0-phases/01-first/01-CONTEXT.md': '<domain>x</domain>',
    });
    const live = project.phases.find((p) => !p.archived);
    const archived = project.phases.find((p) => p.archived);
    expect(live?.identity.milestoneVersion).toBe('v2.0');
    expect(archived?.identity.milestoneVersion).toBe('v1.0');
    expect(live?.identity.number).toBe('01');
    expect(archived?.identity.number).toBe('01');
  });
});

describe('assembleDomainModel — roadmapComplete vs diskStatus', () => {
  it('carries both fields separately and lets them disagree', async () => {
    const roadmap = `# Roadmap: Demo\n\n### Phase 1: Foundation\n**Goal**: Ship it\n\nPlans:\n- [ ] 01-01: Only plan\n`;
    const { project } = await assembleTree({
      '.planning/ROADMAP.md': roadmap,
      '.planning/phases/01-foundation/01-01-PLAN.md': '---\nphase: 01\nplan: 01\n---\n\nbody\n',
      '.planning/phases/01-foundation/01-01-SUMMARY.md': '---\nphase: 01\nplan: 01\n---\n\nbody\n',
    });
    const phase = project.phases[0];
    // The roadmap checkbox is unticked (roadmapComplete: false) even though the plan's SUMMARY.md
    // exists on disk (diskStatus: 'complete') — the two signals disagree and neither is reconciled.
    expect(phase.roadmapComplete).toBe(false);
    expect(phase.diskStatus).toBe('complete');
  });
});

describe('assembleDomainModel — Plan/Summary pairing', () => {
  it('pairs a Plan with its SUMMARY.md by filename convention, and leaves summary null when absent', async () => {
    const { project } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\n---\n\nbody\n',
      '.planning/phases/01-x/01-01-SUMMARY.md': '---\nphase: 01\nplan: 01\n---\n\nbody\n',
      '.planning/phases/01-x/01-02-PLAN.md': '---\nphase: 01\nplan: 02\n---\n\nbody\n',
    });
    const phase = project.phases[0];
    const plan01 = phase.plans.find((p) => p.planNumber === '01');
    const plan02 = phase.plans.find((p) => p.planNumber === '02');
    expect(plan01?.summary?.path).toBe('.planning/phases/01-x/01-01-SUMMARY.md');
    expect(plan02?.summary).toBeNull();
  });
});

describe('assembleDomainModel — directory/roadmap mismatches', () => {
  it('yields a Phase built from the directory alone when no ROADMAP.md entry exists, with roadmap fields absent', async () => {
    const { project } = await assembleTree({
      '.planning/phases/01-lonely/01-CONTEXT.md': '<domain>x</domain>',
    });
    const phase = project.phases[0];
    expect(phase.identity.number).toBe('01');
    expect(phase.goal).toBeNull();
    expect(phase.roadmapComplete).toBeNull();
  });

  it('yields a Phase with no artifacts for a ROADMAP.md entry with no matching directory', async () => {
    const roadmap = `# Roadmap: Demo\n\n### Phase 9: Not Yet Built\n**Goal**: Future work\n**Plans**: TBD\n`;
    const { project } = await assembleTree({ '.planning/ROADMAP.md': roadmap });
    const phase = project.phases.find((p) => p.identity.number === '9');
    expect(phase).toBeDefined();
    expect(phase?.dirPath).toBeNull();
    expect(phase?.diskStatus).toBe('no_directory');
    expect(Object.keys(phase?.artifacts ?? {})).toHaveLength(0);
  });
});

describe('assembleDomainModel — per-milestone ROADMAP.md promotion (0YP)', () => {
  it('sources goal, depends-on, requirement ids and success criteria from the per-milestone file when the root <details> block is a bare checklist', async () => {
    const rootRoadmap = `# Roadmap: Demo\n\n<details>\n<summary>✅ v1.0 MVP (Phases 1) - SHIPPED</summary>\n\n### Phase 1: Bootstrap\n**Goal**: Root goal\n\nPlans:\n- [x] 01-01: Schema\n\n</details>\n`;
    const perMilestoneRoadmap = `# Roadmap Snapshot: v1.0\n\n### Phase 1: Bootstrap\n**Goal**: Per-milestone goal\n**Depends on**: Nothing (first phase)\n**Requirements**: [BOOT-01]\n**Success Criteria** (what must be TRUE):\n  1. Boots correctly\n`;
    const { project } = await assembleTree({
      '.planning/ROADMAP.md': rootRoadmap,
      '.planning/milestones/v1.0-ROADMAP.md': perMilestoneRoadmap,
      '.planning/milestones/v1.0-phases/01-bootstrap/01-CONTEXT.md': '<domain>x</domain>',
    });
    const phase = project.phases.find((p) => p.archived && p.identity.milestoneVersion === 'v1.0');
    expect(phase).toBeDefined();
    expect(phase?.goal).toBe('Per-milestone goal');
    expect(phase?.dependsOnRaw).toBe('Nothing (first phase)');
    expect(phase?.requirementIds).toEqual(['BOOT-01']);
    expect(phase?.successCriteria).toEqual(['Boots correctly']);
  });

  it('falls back to the root <details> block per field when the per-milestone block leaves it empty', async () => {
    const rootRoadmap = `# Roadmap: Demo\n\n<details>\n<summary>✅ v1.0 MVP (Phases 1) - SHIPPED</summary>\n\n### Phase 1: Bootstrap\n**Goal**: Root goal\n**Depends on**: Nothing (first phase)\n\nPlans:\n- [x] 01-01: Schema\n\n</details>\n`;
    // Omits Depends on and the plan checklist — both fields should fall back to the root block.
    const perMilestoneRoadmap = `### Phase 1: Bootstrap\n**Goal**: Per-milestone goal\n`;
    const { project } = await assembleTree({
      '.planning/ROADMAP.md': rootRoadmap,
      '.planning/milestones/v1.0-ROADMAP.md': perMilestoneRoadmap,
      '.planning/milestones/v1.0-phases/01-bootstrap/01-CONTEXT.md': '<domain>x</domain>',
    });
    const phase = project.phases.find((p) => p.archived && p.identity.milestoneVersion === 'v1.0');
    expect(phase?.goal).toBe('Per-milestone goal'); // primary still wins where it supplies a value
    expect(phase?.dependsOnRaw).toBe('Nothing (first phase)'); // fallback fills what primary omitted
    // roadmapComplete is taken as a pair with whichever block supplied the plans array — here, root's.
    expect(phase?.roadmapComplete).toBe(true);
  });

  it('produces a Phase for a phase number present only in the per-milestone file, with no matching directory or root entry', async () => {
    const rootRoadmap = `# Roadmap: Demo\n\n<details>\n<summary>✅ v1.0 MVP (Phases 1) - SHIPPED</summary>\n\n### Phase 1: Bootstrap\n**Goal**: Root goal\n\nPlans:\n- [x] 01-01: Schema\n\n</details>\n`;
    const perMilestoneRoadmap = `### Phase 1: Bootstrap\n**Goal**: Per-milestone goal\n\n### Phase 2: Extras\n**Goal**: Only in the snapshot\n`;
    const { project } = await assembleTree({
      '.planning/ROADMAP.md': rootRoadmap,
      '.planning/milestones/v1.0-ROADMAP.md': perMilestoneRoadmap,
      '.planning/milestones/v1.0-phases/01-bootstrap/01-CONTEXT.md': '<domain>x</domain>',
    });
    const phase2 = project.phases.find(
      (p) => p.archived && p.identity.milestoneVersion === 'v1.0' && p.identity.number === '2',
    );
    expect(phase2).toBeDefined();
    expect(phase2?.goal).toBe('Only in the snapshot');
    expect(phase2?.diskStatus).toBe('no_directory');
  });

  it('keeps a directory-backed archived phase\'s plans and artifacts from disk while sourcing roadmap fields from the per-milestone file', async () => {
    const perMilestoneRoadmap = `### Phase 1: Bootstrap\n**Goal**: Per-milestone goal\n**Requirements**: [BOOT-01]\n`;
    const { project } = await assembleTree({
      '.planning/milestones/v1.0-ROADMAP.md': perMilestoneRoadmap,
      '.planning/milestones/v1.0-phases/01-bootstrap/01-01-PLAN.md': '---\nphase: 01\nplan: 01\n---\n\nbody\n',
    });
    const phase = project.phases.find((p) => p.archived && p.identity.milestoneVersion === 'v1.0');
    expect(phase?.goal).toBe('Per-milestone goal');
    expect(phase?.requirementIds).toEqual(['BOOT-01']);
    expect(phase?.plans).toHaveLength(1);
    expect(phase?.plans[0].id).toBe('01-01');
    expect(phase?.dirPath).toContain('01-bootstrap');
  });

  it('assembles an archived milestone with only a root <details> group exactly as before when no per-milestone file exists', async () => {
    const rootRoadmap = `# Roadmap: Demo\n\n<details>\n<summary>✅ v2.0 Legacy (Phases 1) - SHIPPED</summary>\n\n### Phase 1: Legacy\n**Goal**: Root-only goal\n\nPlans:\n- [x] 01-01: Schema\n\n</details>\n`;
    const { project } = await assembleTree({
      '.planning/ROADMAP.md': rootRoadmap,
      '.planning/milestones/v2.0-phases/01-legacy/01-CONTEXT.md': '<domain>x</domain>',
    });
    const phase = project.phases.find((p) => p.archived && p.identity.milestoneVersion === 'v2.0');
    expect(phase?.goal).toBe('Root-only goal');
    expect(phase?.dependsOnRaw).toBeNull();
    expect(phase?.requirementIds).toEqual([]);
    expect(phase?.successCriteria).toEqual([]);
  });

  const rootWithV1Details = `# Roadmap: Demo\n\n<details>\n<summary>✅ v1.0 MVP (Phases 1) - SHIPPED</summary>\n\n### Phase 1: Bootstrap\n**Goal**: Root goal for degrade check\n\nPlans:\n- [x] 01-01: Schema\n\n</details>\n`;

  it.each([
    ['empty file', ''],
    ['frontmatter-only', '---\nfoo: bar\n---\n'],
    ['malformed YAML frontmatter', '---\nfoo: "unterminated\n---\n\nbody\n'],
    ['no Phase N heading', '# Snapshot\n\nJust prose, no phase headings.\n'],
  ])(
    'degrades to the root-derived phase without throwing when the per-milestone file is %s',
    async (_label, content) => {
      const { project } = await assembleTree({
        '.planning/ROADMAP.md': rootWithV1Details,
        '.planning/milestones/v1.0-ROADMAP.md': content,
        '.planning/milestones/v1.0-phases/01-bootstrap/01-CONTEXT.md': '<domain>x</domain>',
      });
      const phase = project.phases.find((p) => p.archived && p.identity.milestoneVersion === 'v1.0');
      expect(phase?.goal).toBe('Root goal for degrade check');
    },
  );
});

describe('assembleDomainModel — empty project', () => {
  it('yields empty milestone, phase, and plan collections with no warning for a project with no ROADMAP.md and no phases/', async () => {
    const { project, warnings } = await assembleTree({
      '.planning/PROJECT.md': '# Demo\n',
      '.planning/STATE.md': '---\nstatus: planning\n---\n\n# Project State\n',
    });
    expect(project.milestones).toEqual([]);
    expect(project.phases).toEqual([]);
    expect(warnings.all()).toEqual([]);
  });
});

describe('assembleDomainModel — quick tasks', () => {
  it('assembles quick tasks from quick/ directories and attaches their STATE.md table row when present', async () => {
    const state = `---\nstatus: executing\n---\n\n# Project State\n\n## Accumulated Context\n\n### Quick Tasks Completed\n\n| # | Description | Directory |\n|---|---|---|\n| 1 | Add toggle | [link](quick/260726-unp-add-a-toggle) |\n`;
    const { project } = await assembleTree({
      '.planning/STATE.md': state,
      '.planning/quick/260726-unp-add-a-toggle/260726-unp-PLAN.md': '# plan',
    });
    expect(project.quickTasks).toHaveLength(1);
    expect(project.quickTasks[0].id).toBe('260726-unp');
    expect(project.quickTasks[0].stateRow).not.toBeNull();
  });
});

describe('assembleDomainModel — warning identity', () => {
  it('carries the same warning object reference in the flat warnings list and on the artifact it concerns', () => {
    const warnings = new WarningCollector();
    const warning = warnings.add('.planning/STATE.md', 'frontmatter', 'broken', 'body intact');
    const parsedArtifact: ParsedArtifact = {
      ref: makeRef('.planning/STATE.md', { kind: 'state' }),
      title: 'State',
      frontmatter: {},
      body: 'body',
      bodyLength: 4,
      bodyHash: 'x',
      mtimeMs: 0,
      warnings: warnings.forPath('.planning/STATE.md'),
      structured: {},
    };
    const project = assembleDomainModel([parsedArtifact], warnings, ROOT);
    const artifactWarning = project.artifacts['.planning/STATE.md'].warnings[0];
    expect(artifactWarning).toBe(warning);
    expect(warnings.all()[0]).toBe(warning);
  });
});

describe('assembleDomainModel — total parse failure', () => {
  it('still yields a Project rather than null when every file failed to parse, with the warnings recorded', async () => {
    const fs = new InMemoryPlanningFilesystem({ '.planning/STATE.md': 'irrelevant' });
    const warnings = new WarningCollector();
    // Simulate every artifact having failed structured extraction.
    const failedRef = makeRef('.planning/STATE.md', { kind: 'state' });
    warnings.add(failedRef.path, 'structured-extraction', 'boom', 'nothing readable');
    const failedParsed: ParsedArtifact = {
      ref: failedRef,
      title: failedRef.path,
      frontmatter: {},
      body: '',
      bodyLength: 0,
      bodyHash: 'x',
      mtimeMs: 0,
      warnings: warnings.forPath(failedRef.path),
      structured: {},
    };
    const project = assembleDomainModel([failedParsed], warnings, ROOT);
    expect(project).not.toBeNull();
    expect(project.artifacts['.planning/STATE.md']).toBeDefined();
    expect(warnings.all()).toHaveLength(1);
    void fs;
  });
});

describe('assembleDomainModel — empty input', () => {
  it('yields a Project with empty collections, not null, and zero warnings for an empty parsed-artifact array', () => {
    const project = assembleDomainModel([], new WarningCollector(), ROOT);
    expect(project).not.toBeNull();
    expect(project.milestones).toEqual([]);
    expect(project.phases).toEqual([]);
    expect(project.quickTasks).toEqual([]);
    expect(project.requirements).toEqual([]);
    expect(Object.keys(project.artifacts)).toHaveLength(0);
  });
});

describe('assembleDomainModel — deterministic ordering', () => {
  it('emits identically-ordered collections across two assemblies of the same tree', async () => {
    const files = {
      '.planning/STATE.md': '---\nmilestone: v1.0\n---\n\n# Project State\n',
      '.planning/phases/02-second/02-CONTEXT.md': '<domain>x</domain>',
      '.planning/phases/01-first/01-CONTEXT.md': '<domain>x</domain>',
    };
    const { project: projectA } = await assembleTree(files);
    const { project: projectB } = await assembleTree(files);
    expect(projectA.phases.map((p) => p.identity.number)).toEqual(projectB.phases.map((p) => p.identity.number));
    expect(projectA.phases.map((p) => p.identity.number)).toEqual(['01', '02']);
  });
});

// D-11: every file discovery finds must be reachable from the assembled model — proven by an
// equality assertion against fixtures/dense, not a spot check.
describe('assembleDomainModel — D-11 reachable-equals-discovered (fixtures/dense)', () => {
  async function loadDense() {
    const root = resolve('fixtures/dense');
    const fs = new LocalFsPlanningFilesystem(root);
    const { refs } = await discover(fs);
    const repository = new PlanningRepository(fs, root);
    const snapshot = await repository.load();
    if (!snapshot.project) throw new Error('fixtures/dense failed to assemble a Project');
    return { refs, project: snapshot.project };
  }

  it('makes the set of reachable artifact paths exactly equal the set of discovered paths — 52 members', async () => {
    const { refs, project } = await loadDense();
    const discoveredPaths = new Set(refs.map((ref) => ref.path));
    const reachablePaths = new Set([
      ...Object.keys(project.artifacts),
      ...project.phases.flatMap((phase) => Object.keys(phase.artifacts)),
      ...project.quickTasks.flatMap((quickTask) => Object.keys(quickTask.artifacts)),
    ]);
    expect(discoveredPaths.size).toBe(52);
    expect(reachablePaths).toEqual(discoveredPaths);
  });

  it('gives project.artifacts 23 entries for fixtures/dense, including research/milestone-root/other paths', async () => {
    const { project } = await loadDense();
    expect(Object.keys(project.artifacts)).toHaveLength(23);
    expect(project.artifacts['.planning/research/STACK.md']).toBeDefined();
    expect(project.artifacts['.planning/milestones/v1.0-ROADMAP.md']).toBeDefined();
    expect(project.artifacts['.planning/ui-reviews/.gitignore']).toBeDefined();
  });

  it('keeps quickTasks at two entries with unchanged id/path/stateRow, and gives 260615-1a2 two keyed artifacts', async () => {
    const { project } = await loadDense();
    expect(project.quickTasks).toHaveLength(2);
    const task = project.quickTasks.find((t) => t.id === '260615-1a2');
    expect(task).toBeDefined();
    expect(task?.path).toBe('.planning/quick/260615-1a2-add-transport-adapter');
    expect(task?.stateRow).not.toBeNull();
    expect(Object.keys(task?.artifacts ?? {}).sort()).toEqual(
      [
        '.planning/quick/260615-1a2-add-transport-adapter/260615-1a2-PLAN.md',
        '.planning/quick/260615-1a2-add-transport-adapter/260615-1a2-SUMMARY.md',
      ].sort(),
    );
  });

  it('resolves normally on a normal tree — assembleDomainModel([], [], root) still yields empty collections and zero artifacts', () => {
    const project = assembleDomainModel([], new WarningCollector(), ROOT);
    expect(project.milestones).toEqual([]);
    expect(project.phases).toEqual([]);
    expect(project.quickTasks).toEqual([]);
    expect(Object.keys(project.artifacts)).toHaveLength(0);
  });

  it('gives every reachable artifact a location matching its discovery classification', async () => {
    const { refs, project } = await loadDense();
    const locationByPath = new Map(refs.map((ref) => [ref.path, ref.location]));
    const allReachable = [
      ...Object.values(project.artifacts),
      ...project.phases.flatMap((phase) => Object.values(phase.artifacts)),
      ...project.quickTasks.flatMap((quickTask) => Object.values(quickTask.artifacts)),
    ];
    for (const artifact of allReachable) {
      expect(artifact.location).toBe(locationByPath.get(artifact.path));
    }
    expect(project.artifacts['.planning/PROJECT.md'].location).toBe('root');
    expect(project.artifacts['.planning/research/STACK.md'].location).toBe('research');
    expect(project.artifacts['.planning/ui-reviews/.gitignore'].location).toBe('other');
  });

  it('searches the literal src/transport/adapter-stub.ts and returns exactly the three quick/ files that contain it', async () => {
    const { project } = await loadDense();
    const snapshot = {
      loadStatus: { status: 'ok' as const },
      readAt: '2026-09-02T00:00:00.000Z',
      rootPath: project.rootPath,
      project,
      warnings: [],
      exclusions: [],
    };
    // buildSearchDocuments must reach the same corpus collectReachableArtifacts (createSearchIndexState)
    // does — proven directly here, not just implied by the count above.
    expect(buildSearchDocuments(snapshot).length).toBe(52);
    const search = createSearchIndexState();
    search.buildFrom(snapshot);
    await waitForBuild();
    const hits = searchIndex(search.state(), 'src/transport/adapter-stub.ts');
    expect(hits).toHaveLength(3);
    for (const hit of hits) {
      expect(hit.path.startsWith('.planning/quick/')).toBe(true);
    }
  });
});

describe('assembleDomainModel — malformed frontmatter degrades rather than breaking', () => {
  // CR-01: `milestone: ''` is a legal YAML value distinct from omitting the key. It must reach
  // Milestone.version as null, exactly like an absent key, because milestoneKeyOf() refuses to
  // encode an empty path segment and its throw would otherwise abort createApp() at startup.
  it('normalizes an empty-string milestone version to null so route-key derivation never throws', async () => {
    const { project } = await assembleTree({
      '.planning/STATE.md': "---\nmilestone: ''\nmilestone_name: ''\n---\n\n# Project State\n",
      '.planning/phases/01-current/01-CONTEXT.md': '<domain>x</domain>',
    });
    const live = project.milestones.find((m) => m.phases.length > 0);
    expect(live).toBeDefined();
    expect(live!.version).toBeNull();
    for (const phase of live!.phases) {
      expect(phase.identity.milestoneVersion).toBeNull();
    }
  });

  it('treats a whitespace-only milestone version the same as an empty one', async () => {
    const { project } = await assembleTree({
      '.planning/STATE.md': "---\nmilestone: '   '\n---\n\n# Project State\n",
      '.planning/phases/01-current/01-CONTEXT.md': '<domain>x</domain>',
    });
    const live = project.milestones.find((m) => m.phases.length > 0);
    expect(live!.version).toBeNull();
  });

  // WR-04: a short table row still assembles. parseMarkdownTable pads missing cells with '',
  // so a non-string cell is not reachable through the current parser — the typeof guard added
  // alongside this test is defense-in-depth against the unchecked cast, not a live crash fix.
  it('assembles a quick task whose STATE.md table row has fewer cells than headers', async () => {
    const state =
      '---\nstatus: executing\n---\n\n# Project State\n\n## Accumulated Context\n\n### Quick Tasks Completed\n\n| # | Description | Directory |\n|---|---|---|\n| 260726-unp |\n';
    const { project } = await assembleTree({
      '.planning/STATE.md': state,
      '.planning/quick/260726-unp-add-a-toggle/260726-unp-PLAN.md': '# plan',
    });
    expect(project.quickTasks).toHaveLength(1);
    expect(project.quickTasks[0].stateRow).not.toBeNull();
  });
});
