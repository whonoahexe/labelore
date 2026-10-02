// quick-261003-528 (T-528-04): when the extractor throws, UiReviewHandler.parse keeps the title, body
// and frontmatter and simply omits `uiReview`; with the real extractor it carries pathPhase from the
// ref's phase identity (null for a quick-task ref).
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const content = '---\nstatus: passed\nphase: "01"\n---\n\n# Phase 01 — UI Review\n\n## Pillar Scores\n\n| 1. Color | 4/4 | k |\n';

function refOf(path: string, phase: boolean): ArtifactRef {
  return {
    path,
    kind: 'ui-review',
    location: phase ? 'phase' : 'quick',
    phaseIdentity: phase ? { milestoneVersion: null, number: '01', projectCode: null, slug: 'color-pass' } : null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function rawOf(path: string): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

describe('UiReviewHandler', () => {
  it('carries pathPhase from the ref and null for a quick task', async () => {
    const { UiReviewHandler } = await import('../src/planning-repo/handlers/ui-review.ts');
    const phase = UiReviewHandler.parse(rawOf('.planning/phases/01-color-pass/01-UI-REVIEW.md'), refOf('.planning/phases/01-color-pass/01-UI-REVIEW.md', true));
    const audit = (phase.structured as { uiReview: { pillars: unknown[]; pathPhase: unknown } }).uiReview;
    expect(audit.pillars).toHaveLength(1);
    expect(audit.pathPhase).toEqual({ number: '01', slug: 'color-pass' });
    const quick = UiReviewHandler.parse(rawOf('.planning/quick/260101-abc-x/260101-abc-UI-REVIEW.md'), refOf('.planning/quick/260101-abc-x/260101-abc-UI-REVIEW.md', false));
    expect((quick.structured as { uiReview: { pathPhase: unknown } }).uiReview.pathPhase).toBeNull();
  });

  it('matches only the UI-REVIEW token', async () => {
    const { UiReviewHandler } = await import('../src/planning-repo/handlers/ui-review.ts');
    expect(UiReviewHandler.match(refOf('.planning/phases/01-x/01-UI-REVIEW.md', true))).toBe(true);
    expect(UiReviewHandler.match(refOf('.planning/phases/01-x/01-UI-SPEC.md', true))).toBe(false);
  });
});

describe('UiReviewHandler extractor guard', () => {
  it('omits uiReview when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/ui-review-audit.ts', () => ({
      extractUiReview: () => {
        throw new Error('boom');
      },
    }));
    const { UiReviewHandler } = await import('../src/planning-repo/handlers/ui-review.ts');
    const path = '.planning/phases/01-x/01-UI-REVIEW.md';
    const result = UiReviewHandler.parse(rawOf(path), refOf(path, true));
    expect(result.title).toBeTruthy();
    expect(result.body).toContain('## Pillar Scores');
    expect(result.frontmatter.status).toBe('passed');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/ui-review-audit.ts');
  });
});
