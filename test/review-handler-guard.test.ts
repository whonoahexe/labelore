// quick-261017-k44 (T-k44-04): when a REVIEW / REVIEW-FIX extractor throws, the handlers keep the
// title, body and frontmatter and simply omit their key (`{ warnings }` stays for a review, `{}` for a
// fix report). With the real extractors the review carries pathPhase and quickId, and its
// `structured.warnings` is exactly what the section projection returned before this item.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { projectSections } from '../src/planning-repo/handlers/section-projection.ts';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const content =
  '---\nstatus: issues_found\nphase: "01-x"\n---\n\n# Phase 1: Thing Code Review Report\n\n## Warnings\n\n### WR-01: A thing\n\n**File:** `src/a.ts:3`\n\n**Issue:** bad\n';

function refOf(path: string, location: ArtifactRef['location'], extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'review', location, phaseIdentity: null, milestoneVersion: null, quickTaskId: null, ...extra };
}

function rawOf(path: string, text: string = content): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

type ParsedReview = { review: { findings: { id: string }[]; pathPhase: unknown; quickId: unknown }; warnings: { id: string }[] };

describe('ReviewHandler', () => {
  it('claims REVIEW files in every location and not the other tokens', async () => {
    const { ReviewHandler, ReviewFixHandler } = await import('../src/planning-repo/handlers/review.ts');
    expect(ReviewHandler.match(refOf('.planning/phases/01-x/01-REVIEW.md', 'phase'))).toBe(true);
    expect(ReviewHandler.match(refOf('.planning/milestones/v1.0-phases/01-x/01-REVIEW.md', 'archived-phase'))).toBe(true);
    expect(ReviewHandler.match(refOf('.planning/quick/260101-abc-x/260101-abc-REVIEW.md', 'quick'))).toBe(true);
    expect(
      ReviewHandler.match(refOf('.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-REVIEW.md', 'milestone-root')),
    ).toBe(true);
    expect(ReviewHandler.match(refOf('.planning/phases/01-x/01-REVIEW-FIX.md', 'phase'))).toBe(false);
    expect(ReviewHandler.match(refOf('.planning/phases/01-x/01-UI-REVIEW.md', 'phase'))).toBe(false);
    expect(ReviewFixHandler.match(refOf('.planning/phases/01-x/01-REVIEW-FIX.md', 'phase'))).toBe(true);
    expect(ReviewFixHandler.match(refOf('.planning/phases/01-x/01-REVIEW.md', 'phase'))).toBe(false);
  });

  it('carries structured.review with the path facts from the ref and the unchanged warnings', async () => {
    const { ReviewHandler } = await import('../src/planning-repo/handlers/review.ts');
    const path = '.planning/phases/01-x/01-REVIEW.md';
    const phase = ReviewHandler.parse(
      rawOf(path),
      refOf(path, 'phase', { phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' } }),
    );
    const parsed = phase.structured as ParsedReview;
    expect(parsed.review.findings.map((f) => f.id)).toEqual(['WR-01']);
    expect(parsed.review.pathPhase).toEqual({ number: '01', slug: 'x' });
    expect(parsed.review.quickId).toBeNull();
    expect(parsed.warnings).toEqual([{ id: 'WR-01', title: 'A thing' }]);
    const quickPath = '.planning/quick/260101-abc-x/260101-abc-REVIEW.md';
    const quick = ReviewHandler.parse(rawOf(quickPath), refOf(quickPath, 'quick', { quickTaskId: '260101-abc' }));
    expect((quick.structured as ParsedReview).review.quickId).toBe('260101-abc');
    expect((quick.structured as ParsedReview).review.pathPhase).toBeNull();
    const archivedPath = '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-REVIEW.md';
    const archived = ReviewHandler.parse(rawOf(archivedPath), refOf(archivedPath, 'milestone-root'));
    expect((archived.structured as ParsedReview).review.quickId).toBe('260101-abc');
  });

  it('keeps structured.warnings equal to the section projection on labelore\'s own reviews', async () => {
    const { ReviewHandler } = await import('../src/planning-repo/handlers/review.ts');
    for (const rel of [
      'milestones/v1.0-phases/01-read-layer-domain-model/01-REVIEW.md',
      'milestones/v1.1-phases/05-per-type-document-views/05-REVIEW.md',
    ]) {
      const path = new URL(`../.planning/${rel}`, import.meta.url).pathname;
      const text = readFileSync(path, 'utf8');
      const result = ReviewHandler.parse(rawOf(rel, text), refOf(rel, 'archived-phase'));
      const expected = projectSections('review', result.body).warnings;
      expect((result.structured as ParsedReview).warnings).toEqual(expected);
      expect((result.structured as ParsedReview).warnings.length).toBeGreaterThan(0);
    }
  });

  it('omits review when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/review-report.ts', () => ({
      extractReviewReport: () => {
        throw new Error('boom');
      },
      extractReviewFixReport: () => {
        throw new Error('boom');
      },
    }));
    const { ReviewHandler, ReviewFixHandler } = await import('../src/planning-repo/handlers/review.ts');
    const path = '.planning/phases/01-x/01-REVIEW.md';
    const result = ReviewHandler.parse(rawOf(path), refOf(path, 'phase'));
    expect(result.title).toBe('Phase 1: Thing Code Review Report');
    expect(result.body).toContain('### WR-01');
    expect(result.frontmatter.status).toBe('issues_found');
    expect(result.structured).toEqual({ warnings: [{ id: 'WR-01', title: 'A thing' }] });
    const fixPath = '.planning/phases/01-x/01-REVIEW-FIX.md';
    const fixed = ReviewFixHandler.parse(rawOf(fixPath, '---\nstatus: all_fixed\n---\n\n# Fix\n'), refOf(fixPath, 'phase', { kind: 'review-fix' }));
    expect(fixed.title).toBe('Fix');
    expect(fixed.frontmatter.status).toBe('all_fixed');
    expect(fixed.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/review-report.ts');
  });
});

describe('ReviewFixHandler', () => {
  it('carries structured.reviewFix', async () => {
    vi.resetModules();
    const { ReviewFixHandler } = await import('../src/planning-repo/handlers/review.ts');
    const path = '.planning/phases/01-x/01-REVIEW-FIX.md';
    const text = '---\nstatus: all_fixed\n---\n\n# Fix\n\n## Fixed Issues\n\n### WR-01: A thing\n\n**Commit:** abc1234\n';
    const result = ReviewFixHandler.parse(rawOf(path, text), refOf(path, 'phase', { kind: 'review-fix' }));
    const fixed = result.structured as { reviewFix: { entries: { ids: string[]; commit: string }[] } };
    expect(fixed.reviewFix.entries).toEqual([expect.objectContaining({ ids: ['WR-01'], commit: 'abc1234' })]);
  });
});
