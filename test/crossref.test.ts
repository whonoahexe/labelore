import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assembleDomainModel } from '../src/planning-repo/assemble.ts';
import { resolveCrossReferences } from '../src/planning-repo/crossref.ts';
import { discover } from '../src/planning-repo/discovery.ts';
import { parseWithRegistry } from '../src/planning-repo/registry.ts';
import { WarningCollector } from '../src/planning-repo/warnings.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';

const ROOT = '/project';
const __dirname = dirname(fileURLToPath(import.meta.url));

async function assembleTree(files: Record<string, string>) {
  const fs = new InMemoryPlanningFilesystem(files);
  const warnings = new WarningCollector();
  const { refs } = await discover(fs);
  const parsed = await Promise.all(refs.map((r) => parseWithRegistry(fs, r, warnings)));
  const project = assembleDomainModel(parsed, warnings, ROOT);
  return { project, warnings };
}

const REQUIREMENTS_MD = (items: string) => `# Requirements: Demo\n\n## v1 Requirements\n### Category\n${items}\n`;

describe('resolveCrossReferences — Phase.requirementRefs', () => {
  it('resolves a phase requirement id to its Requirement entity, retaining the literal token as written', async () => {
    const { project } = await assembleTree({
      '.planning/REQUIREMENTS.md': REQUIREMENTS_MD('- [ ] **AUTH-01**: Login works\n'),
      '.planning/ROADMAP.md': '# Roadmap: Demo\n\n### Phase 1: Foundation\n**Goal**: Ship it\n**Requirements**: [AUTH-01]\n',
      '.planning/phases/01-foundation/01-CONTEXT.md': '<domain>x</domain>',
    });
    const phase = project.phases[0];
    expect(phase.requirementRefs).toHaveLength(1);
    expect(phase.requirementRefs[0].raw).toBe('AUTH-01');
    expect(phase.requirementRefs[0].resolved?.id).toBe('AUTH-01');
  });

  it('resolves a requirement id absent from REQUIREMENTS.md to a null target and adds no warning', async () => {
    const { project, warnings } = await assembleTree({
      '.planning/ROADMAP.md': '# Roadmap: Demo\n\n### Phase 1: Foundation\n**Goal**: Ship it\n**Requirements**: [MISSING-99]\n',
      '.planning/phases/01-foundation/01-CONTEXT.md': '<domain>x</domain>',
    });
    const beforeCount = warnings.all().length;
    const phase = project.phases[0];
    expect(phase.requirementRefs[0]).toEqual({ raw: 'MISSING-99', resolved: null });
    // resolveCrossReferences already ran once inside assembleDomainModel — assert the warning
    // count it left behind is unchanged from before resolution ran (0 dangling-caused warnings).
    expect(warnings.all().length).toBe(beforeCount);
    expect(warnings.all()).toEqual([]);
  });

  it('resolves the same requirement id to the identical Requirement entity from two different phases (many-to-many)', async () => {
    const { project } = await assembleTree({
      '.planning/REQUIREMENTS.md': REQUIREMENTS_MD('- [ ] **SHARED-01**: Shared thing\n'),
      '.planning/ROADMAP.md':
        '# Roadmap: Demo\n\n### Phase 1: A\n**Goal**: g1\n**Requirements**: [SHARED-01]\n\n### Phase 2: B\n**Goal**: g2\n**Requirements**: [SHARED-01]\n',
      '.planning/phases/01-a/01-CONTEXT.md': '<domain>x</domain>',
      '.planning/phases/02-b/02-CONTEXT.md': '<domain>x</domain>',
    });
    const [phase1, phase2] = project.phases;
    expect(phase1.requirementRefs[0].resolved).not.toBeNull();
    expect(phase1.requirementRefs[0].resolved).toBe(phase2.requirementRefs[0].resolved);
  });
});

describe('resolveCrossReferences — Requirement.coveringPhaseRefs (milestone-qualified)', () => {
  it('resolves a Traceability row to the LIVE milestone phase, not an archived phase sharing the same number', async () => {
    const { project } = await assembleTree({
      '.planning/STATE.md': '---\nmilestone: v3.0\n---\n\n# Project State\n',
      '.planning/REQUIREMENTS.md': `${REQUIREMENTS_MD('- [ ] **TARGET-01**: Target thing\n')}\n## Traceability\n\n| Requirement | Phase | Status |\n|---|---|---|\n| TARGET-01 | Phase 1 | Complete |\n`,
      '.planning/phases/01-live/01-CONTEXT.md': '<domain>x</domain>',
      '.planning/milestones/v1.0-phases/01-old/01-CONTEXT.md': '<domain>x</domain>',
      '.planning/milestones/v2.0-phases/01-mid/01-CONTEXT.md': '<domain>x</domain>',
    });
    const requirement = project.requirements.find((r) => r.id === 'TARGET-01');
    const livePhase = project.phases.find((p) => !p.archived);
    expect(requirement?.coveringPhaseRefs).toHaveLength(1);
    expect(requirement?.coveringPhaseRefs[0].raw).toBe('Phase 1');
    expect(requirement?.coveringPhaseRefs[0].resolved).toBe(livePhase);
    expect(requirement?.coveringPhaseRefs[0].resolved?.identity.milestoneVersion).toBe('v3.0');
  });

  it('resolves a Traceability row naming a phase with no matching directory or roadmap entry to a null target', async () => {
    const { project } = await assembleTree({
      '.planning/REQUIREMENTS.md': `${REQUIREMENTS_MD('- [ ] **ORPHAN-01**: Orphan thing\n')}\n## Traceability\n\n| Requirement | Phase | Status |\n|---|---|---|\n| ORPHAN-01 | Phase 9 | Pending |\n`,
    });
    const requirement = project.requirements.find((r) => r.id === 'ORPHAN-01');
    expect(requirement?.coveringPhaseRefs).toEqual([{ raw: 'Phase 9', resolved: null }]);
  });
});

describe('resolveCrossReferences — Phase.dependsOnRaw stays a raw string', () => {
  it('leaves dependsOnRaw as the literal string, deriving no edge or adjacency structure from it', async () => {
    const { project } = await assembleTree({
      '.planning/ROADMAP.md': '# Roadmap: Demo\n\n### Phase 2: Second\n**Goal**: g\n**Depends on**: Phase 1\n',
      '.planning/phases/02-second/02-CONTEXT.md': '<domain>x</domain>',
    });
    const phase = project.phases[0];
    expect(typeof phase.dependsOnRaw).toBe('string');
    expect(phase.dependsOnRaw).toBe('Phase 1');
  });
});

describe('resolveCrossReferences — Plan.summaryRef and Plan.dependsOnRefs', () => {
  it('resolves a plan with a matching SUMMARY.md to a non-null summaryRef, and one without to a null-resolved summaryRef', async () => {
    const { project } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: []\n---\n\nbody\n',
      '.planning/phases/01-x/01-01-SUMMARY.md': '---\nphase: 01\nplan: 01\n---\n\nbody\n',
      '.planning/phases/01-x/01-02-PLAN.md': '---\nphase: 01\nplan: 02\ndepends_on: []\n---\n\nbody\n',
    });
    const phase = project.phases[0];
    const plan01 = phase.plans.find((p) => p.planNumber === '01');
    const plan02 = phase.plans.find((p) => p.planNumber === '02');
    expect(plan01?.summaryRef.raw).toBe('01-01');
    expect(plan01?.summaryRef.resolved).toBe(plan01?.summary);
    expect(plan01?.summaryRef.resolved).not.toBeNull();
    expect(plan02?.summaryRef.resolved).toBeNull();
  });

  it("resolves a plan's depends_on entry to a sibling plan within the same phase", async () => {
    const { project } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: []\n---\n\nbody\n',
      '.planning/phases/01-x/01-02-PLAN.md': '---\nphase: 01\nplan: 02\ndepends_on: ["01-01"]\n---\n\nbody\n',
    });
    const phase = project.phases[0];
    const plan02 = phase.plans.find((p) => p.planNumber === '02');
    const plan01 = phase.plans.find((p) => p.planNumber === '01');
    expect(plan02?.dependsOnRefs).toHaveLength(1);
    expect(plan02?.dependsOnRefs[0]).toEqual({ raw: '01-01', resolved: plan01 });
  });

  it('resolves a depends_on entry naming a plan id not present in the same phase to a null target', async () => {
    const { project } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: ["01-99"]\n---\n\nbody\n',
    });
    const plan01 = project.phases[0].plans[0];
    expect(plan01.dependsOnRefs).toEqual([{ raw: '01-99', resolved: null }]);
  });

  // D-10 explicit pin: a well-formed depends_on array whose entry names a sibling that doesn't
  // exist is a routine, unlinked-mention case — distinguishable from a wrong-shaped field (below) —
  // and must add NO warning. This states the invariant explicitly rather than leaving it implied by
  // a fixture's golden warning count.
  it('adds no warning for a well-formed depends_on entry that does not resolve (D-10 silence)', async () => {
    const { project, warnings } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: ["01-99"]\n---\n\nbody\n',
    });
    expect(project.phases[0].plans[0].dependsOnRefs).toEqual([{ raw: '01-99', resolved: null }]);
    expect(warnings.all()).toHaveLength(0);
  });

  // CR-01 regression: a non-array `depends_on` (a plausible authoring typo — a bare string instead
  // of a YAML list) must degrade to "no dependencies", never throw. Previously
  // `((plan.frontmatter.depends_on as unknown[] | undefined) ?? []).map(...)` threw
  // "... .map is not a function" because `?? []` only substitutes for null/undefined, not for a
  // present-but-wrong-shaped value — crashing the whole PlanningRepository.load()/refresh() call,
  // in violation of D-12's "load()/refresh() never throw" contract.
  it('degrades a non-array depends_on (bare string) to an empty dependsOnRefs instead of throwing', async () => {
    const { project } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: "01-99"\n---\n\nbody\n',
    });
    const plan01 = project.phases[0].plans[0];
    expect(plan01.dependsOnRefs).toEqual([]);
  });

  // quick-260910-0x4 item 6: unlike a dangling reference, a wrong-shaped depends_on field is
  // structurally invalid regardless of what it points at — it records exactly one warning naming
  // the plan and the field, while still never throwing (D-12, pinned separately above).
  it('records exactly one warning naming the plan and the field for a non-array depends_on', async () => {
    const { project, warnings } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: "01-99"\n---\n\nbody\n',
    });
    const plan01 = project.phases[0].plans[0];
    expect(plan01.dependsOnRefs).toEqual([]);
    const planWarnings = warnings.all();
    expect(planWarnings).toHaveLength(1);
    expect(planWarnings[0].path).toBe(plan01.path);
    expect(planWarnings[0].stage).toBe('assembly');
    expect(planWarnings[0].message).toContain('01-01');
    expect(planWarnings[0].message).toContain('depends_on');
  });

  // A number (another plausible non-array shape) hits the same branch and must also warn exactly
  // once, never throw.
  it('records exactly one warning for a non-array depends_on that is a number', async () => {
    const { project, warnings } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: 42\n---\n\nbody\n',
    });
    const plan01 = project.phases[0].plans[0];
    expect(plan01.dependsOnRefs).toEqual([]);
    expect(warnings.all()).toHaveLength(1);
  });

  // The key being absent entirely is the routine case (most plans declare no dependencies) and must
  // stay warning-free.
  it('adds no warning when depends_on is absent entirely', async () => {
    const { warnings } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\n---\n\nbody\n',
    });
    expect(warnings.all()).toHaveLength(0);
  });

  // Explicit decision pin: a YAML null (`depends_on:` with no value) reads the same as "absent" —
  // routine authoring shorthand for "none", not a malformed field — and stays warning-free too.
  it('adds no warning and yields an empty dependsOnRefs when depends_on is explicit YAML null', async () => {
    const { project, warnings } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on:\n---\n\nbody\n',
    });
    const plan01 = project.phases[0].plans[0];
    expect(plan01.dependsOnRefs).toEqual([]);
    expect(warnings.all()).toHaveLength(0);
  });

  it('PlanningRepository.load() returns an ok snapshot rather than throwing when a PLAN.md has a non-array depends_on', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: "01-99"\n---\n\nbody\n',
    });
    const repo = new PlanningRepository(fs, '/project');
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    expect(snapshot.project).not.toBeNull();
    expect(snapshot.project?.phases[0].plans[0].dependsOnRefs).toEqual([]);
    // The new warning reaches the flat snapshot.warnings list — the live collector threaded through
    // assembleDomainModel into resolveCrossReferences, re-read here after assembly returns.
    expect(snapshot.warnings).toHaveLength(1);
    expect(snapshot.warnings[0].stage).toBe('assembly');
  });

  // Documents the flat-only answer this task's plan explicitly required a decision on: the owning
  // artifact's own .warnings array was already materialized (copied by reference from its
  // ParsedArtifact) before resolveCrossReferences runs, so a warning added during cross-referencing
  // does NOT reliably reach it — only the flat snapshot list. Asserted here rather than left implied.
  it('does not add the depends_on warning to the owning artifact’s own warnings array (flat-only)', async () => {
    const { project, warnings } = await assembleTree({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: "01-99"\n---\n\nbody\n',
    });
    const plan01 = project.phases[0].plans[0];
    expect(warnings.all()).toHaveLength(1);
    const artifact = project.phases[0].artifacts[plan01.path];
    expect(artifact?.warnings ?? []).toHaveLength(0);
  });
});

describe('resolveCrossReferences — idempotence', () => {
  it('yields structurally identical results when run a second time over an already-resolved graph', async () => {
    const { project } = await assembleTree({
      '.planning/REQUIREMENTS.md': REQUIREMENTS_MD('- [ ] **AUTH-01**: Login works\n'),
      '.planning/ROADMAP.md': '# Roadmap: Demo\n\n### Phase 1: Foundation\n**Goal**: Ship it\n**Requirements**: [AUTH-01]\n',
      '.planning/phases/01-foundation/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: []\n---\n\nbody\n',
    });
    const before = JSON.stringify(project);
    resolveCrossReferences(project, new WarningCollector());
    const after = JSON.stringify(project);
    expect(after).toBe(before);
    expect(project.phases[0].requirementRefs).toHaveLength(1);
  });
});

// quick-260910-0x4 item 6: test/__golden__/sparse-started.json already pins D-10's silence as a
// byte-for-byte property of the committed golden (its `SLICE-99` requirement reference is dangling
// and the golden records 0 warnings) — but that leaves the invariant implied, never stated. This
// test states it directly, against the real fixture on disk (not a synthetic tree), so the
// invariant survives even if the golden fixture is ever regenerated.
describe('resolveCrossReferences — sparse-started fixture (D-10 silence, stated not implied)', () => {
  it('loads the real sparse-started fixture with its dangling SLICE-99 reference and adds zero warnings', async () => {
    const fixtureRoot = join(__dirname, '..', 'fixtures', 'sparse-started');
    const fs = new LocalFsPlanningFilesystem(fixtureRoot);
    const repo = new PlanningRepository(fs, fixtureRoot);
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    expect(snapshot.warnings).toHaveLength(0);
    // Confirm the fixture actually exercises the dangling case this test is named for — a
    // zero-warning assertion against a fixture with no SLICE-99 reference at all would prove nothing.
    const requirementIds = snapshot.project?.requirements.map((r) => r.id) ?? [];
    expect(requirementIds).not.toContain('SLICE-99');
    const hasDanglingSlice99 = (snapshot.project?.phases ?? []).some((phase) =>
      phase.requirementRefs.some((ref) => ref.raw === 'SLICE-99' && ref.resolved === null),
    );
    expect(hasDanglingSlice99).toBe(true);
  });
});
