// quick-261003-526 (T-526-05): when the extractor throws, ValidationHandler.parse keeps the title,
// body and frontmatter and simply omits `validation`.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

vi.mock('../src/planning-repo/handlers/validation-strategy.ts', () => ({
  extractValidationStrategy: () => {
    throw new Error('boom');
  },
}));

describe('ValidationHandler extractor guard', () => {
  it('omits validation when the extractor throws and keeps the rest', async () => {
    const { ValidationHandler } = await import('../src/planning-repo/handlers/validation.ts');
    const ref: ArtifactRef = {
      path: '.planning/phases/01-x/01-VALIDATION.md',
      kind: 'validation',
      location: 'phase',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    };
    const content = '---\nstatus: draft\nphase: 01-x\n---\n\n## Validation Sign-Off\n\n- [x] one\n';
    const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
    const result = ValidationHandler.parse(raw, ref);
    expect(result.title).toBeTruthy();
    expect(result.body).toContain('## Validation Sign-Off');
    expect(result.frontmatter.status).toBe('draft');
    expect(result.structured).toEqual({});
  });
});
