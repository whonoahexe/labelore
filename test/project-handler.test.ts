// Phase 9 (09-08, T-09-16): ProjectHandler's `structured.project` - the current milestone and its goal for
// the project page's strip, then (second task) the constraints, the exclusions and the last-updated line
// for its margin. Expected values come from the made-up Lendshed fixture's own PROJECT.md and from this
// repository's PROJECT.md, never from the extractor's output; the hostile inputs go through measureGrowth
// and a throwing extractor must keep `sections` and `keyDecisions`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { ProjectHandler } from '../src/planning-repo/handlers/project.ts';
import type { ProjectDecision, ProjectStructure } from '../src/planning-repo/handlers/project.ts';
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

/** The top-level bullet lines of one `##`/`###` section, counted by a plain line walk independent of the extractor. */
function bulletLinesIn(markdown: string, heading: string): string[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.startsWith('#') && line.replace(/^#+\s+/, '').trim().toLowerCase() === heading);
  expect(start, `heading ${heading}`).toBeGreaterThan(-1);
  const level = lines[start].indexOf(' ');
  const found: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('#') && lines[i].indexOf(' ') <= level) break;
    if (lines[i].startsWith('- ')) found.push(lines[i]);
  }
  return found;
}

describe('ProjectHandler structured.project margin fields', () => {
  it('Lendshed: three constraints, two exclusions and the last-updated line', () => {
    const project = projectOf(lendshed);
    expect(project.constraints.map((c) => c.name)).toEqual(['Tech stack', 'Security', 'Hardware']);
    expect(project.constraints[0].text).toBe('a small Node server with a SQLite file; one process, one machine.');
    expect(project.outOfScope.map((c) => c.name)).toEqual(['Payments and deposits', 'Mobile app']);
    expect(project.outOfScope[1].text).toBe('the web app is installable and that is enough for now.');
    expect(project.lastUpdated).toBe('2026-04-09 after Phase 3 — Account Admin & Sessions');
  });

  it("this repository's PROJECT.md: every Constraints and Out of Scope bullet, with its name", () => {
    const project = projectOf(labelore);
    const constraintLines = bulletLinesIn(labelore, 'constraints');
    const exclusionLines = bulletLinesIn(labelore, 'out of scope');
    expect(constraintLines.length).toBeGreaterThan(0);
    expect(project.constraints).toHaveLength(constraintLines.length);
    expect(project.outOfScope).toHaveLength(exclusionLines.length);
    expect(project.constraints[0].name).toBe('Deployment');
    expect(project.constraints[0].text.startsWith('Clone-and-run from its own repo')).toBe(true);
    expect(project.outOfScope[0].name).toBe('Writing to `.planning/`');
    // A wrapped bullet is one bullet: its continuation lines are joined into the text.
    expect(project.outOfScope[0].text).toContain('can never do harm');
    expect(project.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2} after /);
  });

  it('a bullet with no bold name keeps name "" and all its text', () => {
    const project = projectOf('# P\n\n## Constraints\n\n- Plain rule with no bold name\n- **Named**: kept\n');
    expect(project.constraints).toEqual([
      { name: '', text: 'Plain rule with no bold name' },
      { name: 'Named', text: 'kept' },
    ]);
  });

  it('reads both separators after an out-of-scope name and a top-level Out of Scope section', () => {
    const project = projectOf('# P\n\n## Out of Scope\n\n- **A** — dash\n- **B**: colon\n- **C:** inner colon\n');
    expect(project.outOfScope).toEqual([
      { name: 'A', text: 'dash' },
      { name: 'B', text: 'colon' },
      { name: 'C', text: 'inner colon' },
    ]);
  });

  it('missing sections give empty lists and a null lastUpdated', () => {
    const project = projectOf('# P\n\n## What This Is\n\nA thing.\n');
    expect(project.constraints).toEqual([]);
    expect(project.outOfScope).toEqual([]);
    expect(project.lastUpdated).toBeNull();
  });

  it('keeps at most 40 bullets and caps a 200k-character bullet', () => {
    const many = Array.from({ length: 90 }, (_, i) => `- **N${i}**: text`).join('\n');
    expect(projectOf(`# P\n\n## Constraints\n\n${many}\n`).constraints).toHaveLength(40);
    const long = projectOf(`# P\n\n## Constraints\n\n- **Big**: ${'x'.repeat(200_000)}\n`).constraints[0];
    expect(long.name).toBe('Big');
    expect(long.text.length).toBeLessThanOrEqual(600);
  });

  it('a 100,000-line Constraints section never throws and grows linearly', () => {
    const make = (n: number): string => `# P\n\n## Constraints\n\n${'- **Rule**: filler\n'.repeat(n)}\n*Last updated: today*\n`;
    expect(() => parse(make(100_000))).not.toThrow();
    const growth = measureGrowth({ make, run: (text) => void parse(text), floorMs: 0 });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('a throwing extractor omits only project and keeps sections and keyDecisions', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/markdown-sections.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/planning-repo/handlers/markdown-sections.ts')>();
      return {
        ...actual,
        splitSubsections: () => {
          throw new Error('boom');
        },
      };
    });
    try {
      const { ProjectHandler: Guarded } = await import('../src/planning-repo/handlers/project.ts');
      // Lendshed's Out of Scope is a `###` subsection, so the extraction goes through splitSubsections.
      const result = Guarded.parse(rawOf(lendshed), refOf());
      const structured = result.structured as Record<string, unknown>;
      expect('project' in structured).toBe(false);
      expect((structured.sections as unknown[]).length).toBeGreaterThan(0);
      expect((structured.keyDecisions as unknown[]).length).toBeGreaterThan(0);
      expect(result.title.length).toBeGreaterThan(0);
    } finally {
      vi.doUnmock('../src/planning-repo/handlers/markdown-sections.ts');
      vi.resetModules();
    }
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

/** The Key Decisions table's data rows by an independent line walk (the header and the separator are skipped). */
function tableRowCount(markdown: string): number {
  const lines = markdown.split('\n');
  const at = lines.findIndex((line) => line.startsWith('## Key Decisions'));
  let rows = 0;
  let seen = 0;
  for (let i = at + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) break;
    if (!lines[i].trim().startsWith('|')) continue;
    seen += 1;
    if (seen > 2) rows += 1;
  }
  return rows;
}

function decisionsOf(content: string): ProjectDecision[] {
  return projectOf(content).decisions;
}

function tableOf(...rows: string[]): string {
  return `# P\n\n## Key Decisions\n\n| Decision | Rationale | Outcome |\n|---|---|---|\n${rows.join('\n')}\n`;
}

describe('ProjectHandler structured.project decisions', () => {
  it("this repository's PROJECT.md: every table row, numbered in order", () => {
    const decisions = decisionsOf(labelore);
    expect(decisions).toHaveLength(tableRowCount(labelore));
    expect(decisions.length).toBeGreaterThanOrEqual(27);
    decisions.forEach((decision, index) => expect(decision.n).toBe(index + 1));
    expect(decisions[0].decision).toBe('Read-only in v1; no writes to `.planning/`');
    expect(decisions[0].rationale.startsWith("GSD owns these files' invariants")).toBe(true);
  });

  it("'✓ Good — revisit only if corpus size grows substantially' is Good, not Revisit", () => {
    const row = decisionsOf(labelore).find((d) => d.decision.startsWith('In-memory MiniSearch'));
    expect(row?.outcome).toBe('good');
    expect(row?.outcomeLabel).toBe('Good');
    expect(row?.note).toBe('revisit only if corpus size grows substantially');
  });

  it('the TypeScript pin row is Revisit, with the warning symbol and variation selector skipped', () => {
    const row = decisionsOf(labelore).find((d) => d.decision.startsWith('Pin TypeScript'));
    expect(row?.outcome).toBe('revisit');
    expect(row?.outcomeLabel).toBe('Revisit');
    expect(row?.note).toBe('when `typescript-eslint` supports TS7');
  });

  it('a trailing (Phase 7) is a tag and an era; (D-01) is a tag with no era', () => {
    const decisions = decisionsOf(labelore);
    const phase = decisions.find((d) => d.decision.startsWith('Recognise files by folder'));
    expect(phase?.tag).toBe('Phase 7');
    expect(phase?.era).toBe('Phase 7');
    expect(phase?.decision).toBe('Recognise files by folder as well as name, in one folder table');
    const dee = decisions.find((d) => d.decision.startsWith('The per-type view is the page'));
    expect(dee?.tag).toBe('D-01');
    expect(dee?.era).toBeNull();
    const version = decisions.find((d) => d.decision.startsWith('A milestone made of quick tasks'));
    expect(version?.tag).toBe('v2.0');
    expect(version?.era).toBe('v2.0');
  });

  it('a parenthetical that is not a tag stays in the text', () => {
    const row = decisionsOf(labelore).find((d) => d.decision.startsWith('Keep disagreeing signals'));
    expect(row?.tag).toBeNull();
    expect(row?.era).toBeNull();
    expect(row?.decision).toContain('(roadmap vs disk, checkbox vs phase status)');
  });

  it('Lendshed: Pending, and Good with a note after the word', () => {
    const decisions = decisionsOf(lendshed);
    expect(decisions.map((d) => d.outcome)).toEqual(['good', 'good', 'pending', 'good']);
    expect(decisions[1].note).toBe('for v1.0 — superseded in v1.1');
    expect(decisions[2].outcomeLabel).toBe('Pending');
    expect(decisions[2].note).toBe('');
    expect(decisions[2].decision).toBe('v1.1: Lendshed owns sign-in');
    expect(decisions[2].tag).toBeNull();
  });

  it('classifies by the first word after leading symbols, any dash or colon after it, case-insensitive', () => {
    const found = decisionsOf(
      tableOf('| a | r | ✗ Reversed - in v2 |', '| b | r | — Pending – later |', '| c | r | ⚠️ revisit: soon |', '| d | r | GOOD |', '| e | r | Mixed results |', '| f | r | 12 |'),
    );
    expect(found.map((d) => d.outcome)).toEqual(['reversed', 'pending', 'revisit', 'good', 'other', 'other']);
    expect(found.map((d) => d.note)).toEqual(['in v2', 'later', 'soon', '', 'Mixed results', '12']);
    expect(found[4].outcomeLabel).toBeNull();
  });

  it('a short row keeps its row with blank cells, and a missing Outcome cell is other with no note', () => {
    const found = decisionsOf(tableOf('| Only the decision |', '| Two cells | because |'));
    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({ decision: 'Only the decision', rationale: '', outcome: 'other', outcomeLabel: null, note: '' });
    expect(found[1]).toMatchObject({ rationale: 'because', outcome: 'other', note: '' });
  });

  it('is an empty list without a Key Decisions table', () => {
    expect(decisionsOf('# P\n\n## What This Is\n\nA thing.\n')).toEqual([]);
  });

  it('keeps at most 500 rows and caps every string at 600 characters', () => {
    const rows = Array.from({ length: 700 }, (_, i) => `| d${i} | r | ✓ Good |`);
    const found = decisionsOf(tableOf(...rows));
    expect(found).toHaveLength(500);
    expect(found[499].n).toBe(500);
    const big = decisionsOf(tableOf(`| ${'x'.repeat(5000)} (v1.0) | ${'y'.repeat(5000)} | Good — ${'z'.repeat(5000)} |`))[0];
    expect(big.decision.length).toBeLessThanOrEqual(600);
    expect(big.rationale.length).toBeLessThanOrEqual(600);
    expect(big.note.length).toBeLessThanOrEqual(600);
  });

  it('a 100,000-row table never throws and grows linearly', () => {
    const make = (n: number): string => tableOf(...Array.from({ length: n }, () => '| d (v1.0) | r | ✓ Good — n |'));
    expect(() => parse(make(100_000))).not.toThrow();
    const growth = measureGrowth({ make, run: (text) => void parse(text), floorMs: 0 });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});
