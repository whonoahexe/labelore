// quick-261017-k45 (T-k45-04): when the LEARNINGS extractor throws, LearningsHandler.parse keeps the
// title, body and frontmatter and simply omits `learnings`; the page then falls back to the
// promoted-section view. With the real extractor it carries pathPhase, quickId and scope.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const content =
  '---\nphase: "01"\ngenerated: "2026-06-10"\ncounts:\n  decisions: 1\n---\n\n# Phase 1 Learnings: Thing\n\n## Decisions\n\n- Do the thing (D-01).\n';

function refOf(path: string, location: ArtifactRef['location'], extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'learnings', location, phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0, ...extra };
}

function rawOf(path: string): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

type Parsed = { learnings: { entries: { title: string }[]; pathPhase: unknown; quickId: unknown; scope: string } };

describe('LearningsHandler', () => {
  it('claims LEARNINGS files in every location and the root file, and not the other tokens', async () => {
    const { LearningsHandler } = await import('../src/planning-repo/handlers/learnings.ts');
    expect(LearningsHandler.match(refOf('.planning/phases/01-x/01-LEARNINGS.md', 'phase'))).toBe(true);
    expect(LearningsHandler.match(refOf('.planning/milestones/v1.0-phases/01-x/01-LEARNINGS.md', 'archived-phase'))).toBe(true);
    expect(LearningsHandler.match(refOf('.planning/quick/260101-abc-x/260101-abc-LEARNINGS.md', 'quick'))).toBe(true);
    expect(
      LearningsHandler.match(refOf('.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-LEARNINGS.md', 'milestone-root')),
    ).toBe(true);
    expect(LearningsHandler.match(refOf('.planning/LEARNINGS.md', 'root'))).toBe(true);
    expect(LearningsHandler.match(refOf('.planning/v1.1-LEARNINGS.md', 'milestone-root'))).toBe(false);
    expect(LearningsHandler.match(refOf('.planning/phases/01-x/01-UAT.md', 'phase'))).toBe(false);
  });

  it('carries structured.learnings with the path facts from the ref', async () => {
    const { LearningsHandler } = await import('../src/planning-repo/handlers/learnings.ts');
    const path = '.planning/phases/01-x/01-LEARNINGS.md';
    const phase = LearningsHandler.parse(
      rawOf(path),
      refOf(path, 'phase', { phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' } }),
    );
    const parsed = phase.structured as Parsed;
    expect(parsed.learnings.entries.map((e) => e.title)).toEqual(['Do the thing']);
    expect(parsed.learnings.pathPhase).toEqual({ number: '01', slug: 'x' });
    expect(parsed.learnings.quickId).toBeNull();
    expect(parsed.learnings.scope).toBe('phase');
    const quickPath = '.planning/quick/260101-abc-x/260101-abc-LEARNINGS.md';
    const quick = LearningsHandler.parse(rawOf(quickPath), refOf(quickPath, 'quick', { quickTaskId: '260101-abc' }));
    expect((quick.structured as Parsed).learnings.quickId).toBe('260101-abc');
    expect((quick.structured as Parsed).learnings.scope).toBe('quick');
    const archivedPath = '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-LEARNINGS.md';
    const archived = LearningsHandler.parse(rawOf(archivedPath), refOf(archivedPath, 'milestone-root'));
    expect((archived.structured as Parsed).learnings.quickId).toBe('260101-abc');
    expect((archived.structured as Parsed).learnings.scope).toBe('quick');
    const root = LearningsHandler.parse(rawOf('.planning/LEARNINGS.md'), refOf('.planning/LEARNINGS.md', 'root'));
    expect((root.structured as Parsed).learnings.scope).toBe('project');
    expect((root.structured as Parsed).learnings.pathPhase).toBeNull();
  });

  it('omits learnings when the extractor throws and keeps the rest', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/learnings-retro.ts', () => ({
      extractLearningsRetro: () => {
        throw new Error('boom');
      },
    }));
    const { LearningsHandler } = await import('../src/planning-repo/handlers/learnings.ts');
    const path = '.planning/phases/01-x/01-LEARNINGS.md';
    const result = LearningsHandler.parse(rawOf(path), refOf(path, 'phase'));
    expect(result.title).toBe('Phase 1 Learnings: Thing');
    expect(result.body).toContain('## Decisions');
    expect(result.frontmatter.generated).toBe('2026-06-10');
    expect(result.structured).toEqual({});
    vi.doUnmock('../src/planning-repo/handlers/learnings-retro.ts');
  });
});
