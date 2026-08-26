import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { projectPlanCheckpoints, segmentPlanBody } from '../../src/rendering/plan-segments.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';

const ROOT = '/project';

async function presentationOf(files: Record<string, string>, readAt = '2026-08-27T01:02:03.000Z') {
  const repository = new PlanningRepository(new InMemoryPlanningFilesystem(files), ROOT);
  const snapshot = await repository.load();
  return toProjectPresentation({ ...snapshot, readAt });
}

const state = (blockerSection: string) => `---
milestone: v2.0
current_phase: "01"
current_phase_name: 現在地 🧭
status: custom-future-status
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 7
  completed_plans: 2
  percent: 28.5714285714
---

# Project State

## Accumulated Context

### Decisions

- Keep this out of blockers.

${blockerSection}
`;

const plan = (tasks: string, dependsOn = '[]') => `---
phase: "01"
plan: "01"
depends_on: ${dependsOn}
---

<objective>Projection test</objective>

<tasks>
${tasks}
</tasks>
`;

describe('structured STATE and PLAN projection', () => {
  it('projects only the authored Blockers or Blockers/Concerns subsection', async () => {
    const presentation = await presentationOf({
      '.planning/STATE.md': state(`### Blockers/Concerns

- Waiting for exact approval
- Dependency is unavailable`),
      '.planning/phases/01-live/01-01-PLAN.md': plan(''),
    });

    expect(presentation.state?.blockersConcerns).toEqual({
      heading: 'Blockers/Concerns',
      body: '- Waiting for exact approval\n- Dependency is unavailable',
    });
    expect(presentation.blockers.map((blocker) => blocker.text)).toEqual([
      'Waiting for exact approval',
      'Dependency is unavailable',
    ]);
    expect(presentation.blockers.some((blocker) => blocker.text.includes('Decisions'))).toBe(false);
  });

  it('returns normalized checkpoint syntax and degrades malformed wrappers locally', () => {
    const body = `<tasks>
<task type="checkpoint:human-verify" gate="blocking-human">
  <name>承認 / Approval</name>
  <what-built>One slice</what-built>
</task>

<task type="auto"><name>ordinary</name></task>

<task type="checkpoint:decision" gate="blocking">
  <name>Unclosed decision

<task type="checkpoint:human-action" gate="blocking-human">
  <name>Still parsed after damage</name>
</task>
</tasks>`;

    const segments = segmentPlanBody(body);
    const checkpoints = projectPlanCheckpoints(body);

    expect(segments.some((segment) => segment.malformed && segment.warning)).toBe(true);
    expect(checkpoints).toEqual([
      expect.objectContaining({
        name: '承認 / Approval',
        type: 'checkpoint:human-verify',
        gate: 'blocking-human',
      }),
      expect.objectContaining({
        name: 'Still parsed after damage',
        type: 'checkpoint:human-action',
        gate: 'blocking-human',
      }),
    ]);
  });

  it('marks only an explicitly linked passing checkpoint record as passed', async () => {
    const presentation = await presentationOf({
      '.planning/STATE.md': state('### Blockers\n\nNone'),
      '.planning/phases/01-live/01-01-PLAN.md': plan(`<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Matching approval</name>
</task>
<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Unrelated approval</name>
</task>`),
      '.planning/phases/01-live/01-VERIFICATION.md': `---
checkpoint_results:
  - plan: 01-01
    checkpoint: Matching approval
    status: pass
    evidence_key: verification:matching
  - plan: 01-01
    checkpoint: Different checkpoint
    status: pass
    evidence_key: verification:unrelated
---
# Verification
`,
      '.planning/phases/01-live/01-UAT.md': `---
checkpoint_results:
  - plan: 99-99
    checkpoint: Unrelated approval
    status: passed
---
# UAT
`,
    });

    expect(presentation.checkpoints).toEqual([
      expect.objectContaining({
        planId: '01-01',
        name: 'Matching approval',
        status: 'passed',
        evidenceKey: 'verification:matching',
      }),
      expect.objectContaining({
        planId: '01-01',
        name: 'Unrelated approval',
        status: 'pending',
        evidenceKey: null,
      }),
    ]);
  });

  it('retains exact coverage-wait identity and ignores unrelated passing evidence', async () => {
    const presentation = await presentationOf({
      '.planning/STATE.md': state('### Blockers/Concerns\n\n- None'),
      '.planning/phases/01-live/01-01-PLAN.md': plan(''),
      '.planning/phases/01-live/01-01-SUMMARY.md': `---
phase: "01"
plan: "01"
coverage:
  - id: D1
    description: Needs visual judgment
    verification: []
    human_judgment: true
  - id: D2
    description: Automated
    verification:
      - kind: unit
        ref: test
        status: pass
    human_judgment: false
---
# Summary
`,
      '.planning/phases/01-live/01-UAT.md': `---
coverage_results:
  - plan: 01-01
    coverage: OTHER
    status: pass
---
# UAT
`,
    });

    expect(presentation.coverageWaits).toEqual([
      expect.objectContaining({
        planId: '01-01',
        coverageId: 'D1',
        description: 'Needs visual judgment',
        status: 'pending',
        evidenceKey: null,
      }),
    ]);
  });

  it('projects resolved graph references to distinct canonical keys or null', async () => {
    const presentation = await presentationOf({
      '.planning/STATE.md': state('### Blockers\n\nNone'),
      '.planning/REQUIREMENTS.md': `# Requirements\n\n## v1 Requirements\n### Core\n- [ ] **KEY-01**: Keyed\n`,
      '.planning/phases/01-live/01-01-PLAN.md': plan('', '["01-99"]'),
      '.planning/milestones/v1.0-phases/01-live/01-01-PLAN.md': plan(''),
    });

    const active = presentation.milestones.find((milestone) => !milestone.archived)?.phases[0];
    const archived = presentation.milestones.find((milestone) => milestone.archived)?.phases[0];
    expect(active?.identity.number).toBe(archived?.identity.number);
    expect(active?.key).not.toBe(archived?.key);
    expect(active?.plans[0].key).not.toBe(archived?.plans[0].key);
    expect(active?.plans[0].dependsOn).toEqual([{ raw: '01-99', targetPlanKey: null }]);
  });

  it('is cycle-free, retains readAt, and serializes the dense graph without cycle markers', async () => {
    const root = resolve('fixtures/dense');
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const snapshot = await repository.load();
    const presentation = toProjectPresentation(snapshot);

    const json = JSON.stringify(presentation);
    expect(presentation.readAt).toBe(snapshot.readAt);
    expect(json).not.toContain('$circularRef');
    expect(JSON.parse(json)).toEqual(presentation);
  });
});
