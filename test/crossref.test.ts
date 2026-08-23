import { describe, it, expect } from 'vitest';
import { assembleDomainModel } from '../src/planning-repo/assemble.ts';
import { resolveCrossReferences } from '../src/planning-repo/crossref.ts';
import { discover } from '../src/planning-repo/discovery.ts';
import { parseWithRegistry } from '../src/planning-repo/registry.ts';
import { WarningCollector } from '../src/planning-repo/warnings.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';

const ROOT = '/project';

async function assembleTree(files: Record<string, string>) {
  const fs = new InMemoryPlanningFilesystem(files);
  const warnings = new WarningCollector();
  const { refs } = await discover(fs);
  const parsed = await Promise.all(refs.map((r) => parseWithRegistry(fs, r, warnings)));
  const project = assembleDomainModel(parsed, warnings.all(), ROOT);
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

  it('PlanningRepository.load() returns an ok snapshot rather than throwing when a PLAN.md has a non-array depends_on', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/phases/01-x/01-01-PLAN.md': '---\nphase: 01\nplan: 01\ndepends_on: "01-99"\n---\n\nbody\n',
    });
    const repo = new PlanningRepository(fs, '/project');
    const snapshot = await repo.load();
    expect(snapshot.loadStatus.status).toBe('ok');
    expect(snapshot.project).not.toBeNull();
    expect(snapshot.project?.phases[0].plans[0].dependsOnRefs).toEqual([]);
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
    resolveCrossReferences(project);
    const after = JSON.stringify(project);
    expect(after).toBe(before);
    expect(project.phases[0].requirementRefs).toHaveLength(1);
  });
});
