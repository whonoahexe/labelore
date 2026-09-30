// quick-260930-wfs (T-wfs-04): when the extractor throws, PatternsHandler.parse keeps the title,
// body and every other structured field and simply omits `map`.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

vi.mock('../src/planning-repo/handlers/pattern-map.ts', () => ({
  extractPatternMap: () => {
    throw new Error('boom');
  },
}));

describe('PatternsHandler extractor guard', () => {
  it('omits map when the extractor throws and keeps the rest', async () => {
    const { PatternsHandler } = await import('../src/planning-repo/handlers/patterns.ts');
    const ref: ArtifactRef = {
      path: '.planning/phases/01-x/01-PATTERNS.md',
      kind: 'patterns',
      location: 'phase',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    };
    const content = '# Phase 1: X - Pattern Map\n\n## File Classification\n\n| File |\n|---|\n| a |\n';
    const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
    const result = PatternsHandler.parse(raw, ref);
    expect(result.title).toBeTruthy();
    expect(result.body).toContain('File Classification');
    expect(result.structured).toBeDefined();
    expect('map' in (result.structured as object)).toBe(false);
  });
});
