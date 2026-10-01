// quick-261001-qk7 (T-qk7-04): when the extractor throws, UatHandler.parse keeps the title, body and
// frontmatter and simply omits `uat`.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

vi.mock('../src/planning-repo/handlers/uat-session.ts', () => ({
  extractUatSession: () => {
    throw new Error('boom');
  },
}));

describe('UatHandler extractor guard', () => {
  it('omits uat when the extractor throws and keeps the rest', async () => {
    const { UatHandler } = await import('../src/planning-repo/handlers/uat.ts');
    const ref: ArtifactRef = {
      path: '.planning/phases/01-x/01-UAT.md',
      kind: 'uat',
      location: 'phase',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    };
    const content = '---\nstatus: complete\nphase: 01-x\n---\n\n## Tests\n\n### 1. A\nresult: pass\n';
    const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
    const result = UatHandler.parse(raw, ref);
    expect(result.title).toBeTruthy();
    expect(result.body).toContain('## Tests');
    expect(result.frontmatter.status).toBe('complete');
    expect(result.structured).toEqual({});
  });
});
