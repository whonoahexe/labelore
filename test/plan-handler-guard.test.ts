// quick-261006-iz6 (QKIZ6-01, T-iz6-05): PlanHandler owns every PLAN file wherever it lives — a phase, an
// archived phase, a live quick task and an archived quick task — by its file token, carries the ref facts
// the client cannot see in `structured.plan`, and when the extractor throws it omits only `plan` and
// keeps the title, body and frontmatter.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactLocation, ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const content = `---
phase: 05-per-type-document-views
plan: 01
wave: 1
---

<objective>
Prove the architecture. Purpose: Be sure.
</objective>

<tasks>
<task type="auto">
<name>Task 1: Do it</name>
</task>
</tasks>
`;

function refOf(path: string, location: ArtifactLocation, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return {
    path,
    kind: 'plan',
    location,
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
    ...extra,
  };
}

function rawOf(path: string): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

const PHASE = refOf('.planning/phases/01-x/01-01-PLAN.md', 'phase', {
  phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' },
});
const ARCHIVED = refOf('.planning/milestones/v1.1-phases/05-per-type-document-views/05-01-PLAN.md', 'archived-phase', {
  phaseIdentity: { milestoneVersion: 'v1.1', number: '05', projectCode: null, slug: 'per-type-document-views' },
});
const QUICK = refOf('.planning/quick/260910-0x4-x/260910-0x4-PLAN.md', 'quick', { quickTaskId: '260910-0x4' });
const ARCHIVED_QUICK = refOf('.planning/milestones/v1.0-quick/260910-0x4-x/260910-0x4-PLAN.md', 'milestone-root');

describe('PlanHandler', () => {
  it('matches phase, archived-phase, quick and archived-quick PLAN files only', async () => {
    const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
    for (const ref of [PHASE, ARCHIVED, QUICK, ARCHIVED_QUICK]) expect(PlanHandler.match(ref), ref.path).toBe(true);
    expect(PlanHandler.match(refOf('.planning/phases/01-x/01-01-SUMMARY.md', 'phase'))).toBe(false);
    expect(PlanHandler.match(refOf('.planning/milestones/v3.0-CAPACITY-PLAN.md', 'milestone-root'))).toBe(false);
    expect(PlanHandler.match(refOf('.planning/phases/01-x/01-CONTEXT.md', 'phase'))).toBe(false);
    expect(PlanHandler.match(refOf('.planning/quick/260910-0x4-x/260910-0x4-SUMMARY.md', 'quick'))).toBe(false);
  });

  it('carries the ref facts for a phase plan', async () => {
    const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
    const parsed = PlanHandler.parse(rawOf(ARCHIVED.path), ARCHIVED);
    const plan = (parsed.structured as { plan: { ref: unknown; tasks: unknown[] } }).plan;
    expect(plan.ref).toEqual({ planId: '05-01', phaseNumber: '05', phaseSlug: 'per-type-document-views', quickId: null });
    expect(plan.tasks).toHaveLength(1);
    expect(parsed.body).toContain('<tasks>');
    expect(parsed.frontmatter.wave).toBe(1);
  });

  it('carries the quick id as the plan id for both quick locations', async () => {
    const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
    for (const ref of [QUICK, ARCHIVED_QUICK]) {
      const parsed = PlanHandler.parse(rawOf(ref.path), ref);
      const plan = (parsed.structured as { plan: { ref: unknown } }).plan;
      expect(plan.ref).toEqual({ planId: '260910-0x4', phaseNumber: null, phaseSlug: null, quickId: '260910-0x4' });
    }
  });
});

describe('PlanHandler — a digits-only quick id', () => {
  it('reads 261003-528-PLAN.md as a quick plan, not as phase 261003 plan 528', async () => {
    const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
    const ref = refOf('.planning/quick/261003-528-x/261003-528-PLAN.md', 'quick', { quickTaskId: '261003-528' });
    expect(PlanHandler.match(ref)).toBe(true);
    const parsed = PlanHandler.parse(rawOf(ref.path), ref);
    const plan = (parsed.structured as { plan: { ref: unknown } }).plan;
    expect(plan.ref).toEqual({ planId: '261003-528', phaseNumber: null, phaseSlug: null, quickId: '261003-528' });
  });
});

describe('PlanHandler extractor guard', () => {
  it('omits plan when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/plan-structure.ts', () => ({
      extractPlanStructure: () => {
        throw new Error('boom');
      },
    }));
    const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
    const result = PlanHandler.parse(rawOf(PHASE.path), PHASE);
    expect(result.title).toBeTruthy();
    expect(result.body).toContain('<objective>');
    expect(result.frontmatter.wave).toBe(1);
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/plan-structure.ts');
  });
});
