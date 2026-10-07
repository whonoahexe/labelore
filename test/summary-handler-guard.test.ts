// quick-261006-iz7 (T-iz7-04): when the SUMMARY extractor throws, SummaryHandler.parse keeps the
// title, body and frontmatter and simply omits `summary`; the page then falls back to the
// pre-existing promoted-block view. With the real extractor it carries pathPhase and quickId.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const content = '---\nstatus: complete\nphase: "01-x"\nplan: "01"\n---\n\n# Phase 1 Plan 01: Thing Summary\n\n**It did a thing.**\n\n## Accomplishments\n\n- A first accomplishment that is long enough — with a detail after the dash\n';

function refOf(path: string, location: ArtifactRef['location'], extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return {
    path,
    kind: 'summary',
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

describe('SummaryHandler extractor guard', () => {
  it('carries structured.summary with the path facts from the ref', async () => {
    const { SummaryHandler } = await import('../src/planning-repo/handlers/summary.ts');
    const path = '.planning/phases/01-x/01-01-SUMMARY.md';
    const phase = SummaryHandler.parse(
      rawOf(path),
      refOf(path, 'phase', { phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' } }),
    );
    const summary = (phase.structured as { summary: { accomplishments: unknown[]; pathPhase: unknown; quickId: unknown } }).summary;
    expect(summary.accomplishments).toHaveLength(1);
    expect(summary.pathPhase).toEqual({ number: '01', slug: 'x' });
    expect(summary.quickId).toBeNull();
    const quickPath = '.planning/quick/260101-abc-x/260101-abc-SUMMARY.md';
    const quick = SummaryHandler.parse(rawOf(quickPath), refOf(quickPath, 'quick', { quickTaskId: '260101-abc' }));
    expect((quick.structured as { summary: { quickId: string; pathPhase: unknown } }).summary.quickId).toBe('260101-abc');
    expect((quick.structured as { summary: { pathPhase: unknown } }).summary.pathPhase).toBeNull();
  });

  it('omits summary when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/summary-run.ts', () => ({
      extractSummaryRun: () => {
        throw new Error('boom');
      },
    }));
    const { SummaryHandler } = await import('../src/planning-repo/handlers/summary.ts');
    const path = '.planning/phases/01-x/01-01-SUMMARY.md';
    const result = SummaryHandler.parse(rawOf(path), refOf(path, 'phase'));
    expect(result.title).toBe('Phase 1 Plan 01: Thing Summary');
    expect(result.body).toContain('## Accomplishments');
    expect(result.frontmatter.status).toBe('complete');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/summary-run.ts');
  });
});
