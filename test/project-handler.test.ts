// Phase 9 (09-08, T-09-16): ProjectHandler's `structured.project` - the current milestone and its goal for
// the project page's strip, then (second task) the constraints, the exclusions and the last-updated line
// for its margin. Expected values come from the made-up Lendshed fixture's own PROJECT.md and from this
// repository's PROJECT.md, never from the extractor's output; the hostile inputs go through measureGrowth
// and a throwing extractor must keep `sections` and `keyDecisions`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { ProjectHandler } from '../src/planning-repo/handlers/project.ts';
import type { ProjectStructure } from '../src/planning-repo/handlers/project.ts';
import { FX_ROOT } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const LB_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LB_PLANNING = join(LB_ROOT, '.planning');

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

function projectOf(content: string): ProjectStructure {
  return parse(content).structured.project as ProjectStructure;
}

const lendshed = readFileSync(join(FX_ROOT, '.planning', 'PROJECT.md'), 'utf8');
const labelore = readFileSync(join(LB_PLANNING, 'PROJECT.md'), 'utf8');

describe('ProjectHandler structured.project milestone', () => {
  it('Lendshed: the Current Milestone label, version and goal', () => {
    const { milestone } = projectOf(lendshed);
    expect(milestone).not.toBeNull();
    expect(milestone!.label).toBe('v1.1 Steward Desk');
    expect(milestone!.version).toBe('v1.1');
    expect(milestone!.goal?.startsWith('Lendshed owns its own sign-in')).toBe(true);
    // The goal's wrapped second line is joined, and the Target features list is not.
    expect(milestone!.goal).toContain('export a month of loans as one file');
    expect(milestone!.goal).not.toContain('Target features');
  });

  it("this repository's PROJECT.md gives milestone v2.1 Wayfinding", () => {
    const { milestone } = projectOf(labelore);
    expect(milestone?.label).toBe('v2.1 Wayfinding');
    expect(milestone?.version).toBe('v2.1');
    expect(milestone?.goal?.startsWith('Every file GSD can write opens into a designed page')).toBe(true);
    expect(milestone?.goal).toContain('easier to read.');
  });

  it('keeps sections and keyDecisions as before', () => {
    const { structured } = parse(lendshed);
    expect(Array.isArray(structured.sections)).toBe(true);
    expect((structured.sections as { heading: string }[]).map((section) => section.heading)).toContain('Key Decisions');
    expect((structured.keyDecisions as unknown[]).length).toBeGreaterThan(0);
  });

  it('is null without a Current Milestone heading', () => {
    expect(projectOf('# P\n\n## What This Is\n\nA thing.\n').milestone).toBeNull();
  });

  it('a milestone with no Goal line keeps its label and a null goal', () => {
    const { milestone } = projectOf('# P\n\n## Current Milestone: v3.0 Quiet\n\n**Target features:**\n- one\n');
    expect(milestone).toEqual({ label: 'v3.0 Quiet', version: 'v3.0', goal: null });
  });

  it('a label with no version token has a null version', () => {
    expect(projectOf('# P\n\n## Current Milestone: Launch week\n\n**Goal:** Ship.\n').milestone).toEqual({
      label: 'Launch week',
      version: null,
      goal: 'Ship.',
    });
  });

  it('caps a 200k-character goal line and a 200k-character label', () => {
    const goal = projectOf(`# P\n\n## Current Milestone: v1.0 X\n\n**Goal:** ${'g'.repeat(200_000)}\n`).milestone;
    expect(goal!.goal!.length).toBeLessThanOrEqual(600);
    const label = projectOf(`# P\n\n## Current Milestone: ${'v'.repeat(200_000)}\n\n**Goal:** Ship.\n`).milestone;
    expect(label!.label.length).toBeLessThanOrEqual(600);
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
