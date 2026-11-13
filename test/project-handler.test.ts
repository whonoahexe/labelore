// ProjectHandler reads PROJECT.md's sections and its Key Decisions table (the page projection was removed in
// quick-261114-3gq). Expected values come from the made-up Lendshed fixture's own PROJECT.md; the hostile
// input goes through measureGrowth.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { ProjectHandler } from '../src/planning-repo/handlers/project.ts';
import { FX_ROOT } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const PATH = '.planning/PROJECT.md';

function refOf(): ArtifactRef {
  return { path: PATH, kind: 'project', location: 'root', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 };
}

function rawOf(content: string): RawArtifact {
  return { path: PATH, content, mtimeMs: 0, size: content.length };
}

function parse(content: string): { structured: Record<string, unknown> } {
  return ProjectHandler.parse(rawOf(content), refOf()) as { structured: Record<string, unknown> };
}

const lendshed = readFileSync(join(FX_ROOT, '.planning', 'PROJECT.md'), 'utf8');

describe('ProjectHandler structured output', () => {
  it('keeps sections and keyDecisions as before', () => {
    const { structured } = parse(lendshed);
    expect(Array.isArray(structured.sections)).toBe(true);
    expect((structured.sections as { heading: string }[]).map((section) => section.heading)).toContain('Key Decisions');
    expect((structured.keyDecisions as unknown[]).length).toBeGreaterThan(0);
  });

  it('structured carries exactly sections and keyDecisions', () => {
    expect(Object.keys(parse(lendshed).structured).sort()).toEqual(['keyDecisions', 'sections']);
  });
});

describe('ProjectHandler hostile inputs', () => {
  it('a 100,000-line PROJECT.md parses without throwing and grows linearly', () => {
    const lines = (n: number): string => `# P\n\n## Current Milestone: v1.0 X\n\n**Goal:** G\n\n${'- filler line\n'.repeat(n)}`;
    expect(() => parse(lines(100_000))).not.toThrow();
    const growth = measureGrowth({ make: lines, run: (text) => void parse(text), floorMs: 0 });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});
