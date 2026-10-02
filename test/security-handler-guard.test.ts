// quick-261003-527 (T-527-04): when the extractor throws, SecurityHandler.parse keeps the title, body
// and frontmatter and simply omits `security`.
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

vi.mock('../src/planning-repo/handlers/security-register.ts', () => ({
  extractSecurityRegister: () => {
    throw new Error('boom');
  },
}));

describe('SecurityHandler extractor guard', () => {
  it('omits security when the extractor throws and keeps the rest', async () => {
    const { SecurityHandler } = await import('../src/planning-repo/handlers/security.ts');
    const ref: ArtifactRef = {
      path: '.planning/phases/01-x/01-SECURITY.md',
      kind: 'security',
      location: 'phase',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    };
    const content = '---\nstatus: verified\nphase: 01\n---\n\n## Threat Register\n\n| Threat ID |\n|---|\n| T-1-1 |\n';
    const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
    const result = SecurityHandler.parse(raw, ref);
    expect(result.title).toBeTruthy();
    expect(result.body).toContain('## Threat Register');
    expect(result.frontmatter.status).toBe('verified');
    expect(result.structured).toEqual({});
  });
});
