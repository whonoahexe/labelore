// quick-261017-18a (T-18a-04): when the VERIFICATION extractor throws, VerificationHandler.parse keeps
// the title, body and frontmatter and simply omits `verification`; the page then falls back to the
// sketch-004 B3 layout. With the real extractor it carries pathPhase and quickId.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const content =
  '---\nstatus: passed\nphase: "01-x"\nscore: "1/1"\n---\n\n# Phase 1: Thing Verification Report\n\n**Phase Goal:** Do a thing.\n\n## Gaps Summary\n\nNo gaps.\n';

function refOf(path: string, location: ArtifactRef['location'], extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'verification', location, phaseIdentity: null, milestoneVersion: null, quickTaskId: null, ...extra };
}

function rawOf(path: string): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

type Parsed = { verification: { goal: string; pathPhase: unknown; quickId: unknown } };

describe('VerificationHandler', () => {
  it('claims VERIFICATION files in every location and not the other tokens', async () => {
    const { VerificationHandler } = await import('../src/planning-repo/handlers/verification.ts');
    expect(VerificationHandler.match(refOf('.planning/phases/01-x/01-VERIFICATION.md', 'phase'))).toBe(true);
    expect(VerificationHandler.match(refOf('.planning/milestones/v1.0-phases/01-x/01-VERIFICATION.md', 'archived-phase'))).toBe(true);
    expect(VerificationHandler.match(refOf('.planning/quick/260101-abc-x/260101-abc-VERIFICATION.md', 'quick'))).toBe(true);
    expect(
      VerificationHandler.match(refOf('.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-VERIFICATION.md', 'milestone-root')),
    ).toBe(true);
    expect(VerificationHandler.match(refOf('.planning/phases/01-x/01-UAT.md', 'phase'))).toBe(false);
  });

  it('carries structured.verification with the path facts from the ref', async () => {
    const { VerificationHandler } = await import('../src/planning-repo/handlers/verification.ts');
    const path = '.planning/phases/01-x/01-VERIFICATION.md';
    const phase = VerificationHandler.parse(
      rawOf(path),
      refOf(path, 'phase', { phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' } }),
    );
    const parsed = phase.structured as Parsed;
    expect(parsed.verification.goal).toBe('Do a thing.');
    expect(parsed.verification.pathPhase).toEqual({ number: '01', slug: 'x' });
    expect(parsed.verification.quickId).toBeNull();
    const quickPath = '.planning/quick/260101-abc-x/260101-abc-VERIFICATION.md';
    const quick = VerificationHandler.parse(rawOf(quickPath), refOf(quickPath, 'quick', { quickTaskId: '260101-abc' }));
    expect((quick.structured as Parsed).verification.quickId).toBe('260101-abc');
    expect((quick.structured as Parsed).verification.pathPhase).toBeNull();
    const archivedPath = '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-VERIFICATION.md';
    const archived = VerificationHandler.parse(rawOf(archivedPath), refOf(archivedPath, 'milestone-root'));
    expect((archived.structured as Parsed).verification.quickId).toBe('260101-abc');
  });

  it('omits verification when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/verification-report.ts', () => ({
      extractVerificationReport: () => {
        throw new Error('boom');
      },
    }));
    const { VerificationHandler } = await import('../src/planning-repo/handlers/verification.ts');
    const path = '.planning/phases/01-x/01-VERIFICATION.md';
    const result = VerificationHandler.parse(rawOf(path), refOf(path, 'phase'));
    expect(result.title).toBe('Phase 1: Thing Verification Report');
    expect(result.body).toContain('## Gaps Summary');
    expect(result.frontmatter.status).toBe('passed');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/verification-report.ts');
  });
});
