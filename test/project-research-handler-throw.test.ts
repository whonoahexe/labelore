// quick-261024-k8u: a lift that throws only omits `structured.projectResearch`; the title and body
// survive, so the file still reads as a plain document.
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/planning-repo/handlers/project-research-lift.ts', () => ({
  extractProjectResearch: () => {
    throw new Error('boom');
  },
}));

const { ProjectResearchHandler } = await import('../src/planning-repo/handlers/project-research.ts');

describe('ProjectResearchHandler when the lift throws', () => {
  it('keeps the title, body and frontmatter and omits projectResearch', () => {
    const result = ProjectResearchHandler.parse(
      { path: '.planning/research/STACK.md', content: '# Stack Research\n\nbody text', mtimeMs: 0, size: 26 },
      { path: '.planning/research/STACK.md', kind: 'unknown', location: 'research', phaseIdentity: null, milestoneVersion: null, quickTaskId: null },
    );
    expect(result.title).toBe('Stack Research');
    expect(result.body).toContain('body text');
    expect(result.structured).not.toHaveProperty('projectResearch');
  });
});
