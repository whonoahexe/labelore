// quick-260930-wfs: extractPatternMap (the PATTERNS.md pattern-map projection) against the two
// anchor documents read from disk, degenerate input, and the T-wfs-01 timing guard; plus the
// PatternsHandler's match and structured.map. Anchor counts were independently confirmed with awk
// against the source tables (never copied from the extractor's own output).
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from './helpers/studio-portal.ts';
import { extractPatternMap, splitRow } from '../src/planning-repo/handlers/pattern-map.ts';
import { PatternsHandler } from '../src/planning-repo/handlers/patterns.ts';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const REPO_ROOT = new URL('../', import.meta.url);
const LB05 = '.planning/milestones/v1.1-phases/05-per-type-document-views/05-PATTERNS.md';
const SP02 = `${SP_PLANNING}/milestones/v1.0-phases/02-storage-health-status/02-PATTERNS.md`;
const DENSE = 'fixtures/dense/.planning/phases/01-identity-slice/01-PATTERNS.md';

async function repoBody(path: string): Promise<string> {
  return await readFile(new URL(path, REPO_ROOT), 'utf8');
}

function refOf(path: string): ArtifactRef {
  return {
    path,
    kind: 'patterns',
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

describe('splitRow', () => {
  it('keeps the last cell of a row with no trailing pipe', () => {
    expect(splitRow('| a | b | c')).toEqual(['a', 'b', 'c']);
    expect(splitRow('| a | b | c |')).toEqual(['a', 'b', 'c']);
  });

  it('does not split on an escaped pipe or a pipe inside a code span', () => {
    expect(splitRow('| a \\| b | `x | y` | z |')).toEqual(['a | b', '`x | y`', 'z']);
  });
});

describe('extractPatternMap — LB v1.1/05 (repo file)', () => {
  it('meta, classification, assignments, shared, no-analog and scope', async () => {
    const map = extractPatternMap(await repoBody(LB05));
    expect(map.meta.phase).toBe('5');
    expect(map.meta.title).toBe('Per-Type Document Views');
    expect(map.meta.mapped).toBe('2026-09-20');
    expect(map.meta.filesAnalyzed).toBe('17 (new + modified)');
    expect(map.meta.analogsFound).toBe('17 / 17');
    expect(map.meta.notes.length).toBeGreaterThanOrEqual(1);

    expect(map.classification).toHaveLength(17);
    expect(map.classification.every((row) => row.group === null)).toBe(true);
    // The rows have no trailing pipe: their last cell (Match Quality) must survive.
    expect(map.classification.at(-1)?.quality).toBe('role-match');
    expect(map.classification[1].quality.startsWith('exact')).toBe(true);

    expect(map.assignments).toHaveLength(11);
    expect(map.shared).toHaveLength(7);
    expect(map.noAnalog).toHaveLength(3);
    expect(map.excerpts).toBe(26);
    expect(map.scope?.startsWith('`src/planning-repo/handlers/`')).toBe(true);
    expect(map.other).toEqual([]);
  });

  it('keeps guidance as paragraphs and lists, never code', async () => {
    const map = extractPatternMap(await repoBody(LB05));
    for (const assignment of map.assignments) {
      for (const block of assignment.guidance) expect(['paragraph', 'list']).toContain(block.kind);
    }
    expect(map.assignments[0].analog?.startsWith('`src/planning-repo/handlers/markdown-sections.ts`')).toBe(true);
  });
});

describe('extractPatternMap — SP v1.0/02 (real file, when present)', () => {
  it.runIf(existsSync(SP02))('reads the five doc groups, nine no-analog entries and the planner notes', async () => {
    const map = extractPatternMap(await readFile(SP02, 'utf8'));
    expect(map.meta.phase).toBe('2');
    expect(map.meta.title).toBe('Storage Health & Status');
    expect(map.classification).toHaveLength(26);
    const groups: string[] = [];
    for (const row of map.classification) if (!groups.includes(row.group ?? '')) groups.push(row.group ?? '');
    expect(groups).toEqual([
      'Backend — new modules (greenfield)',
      'Backend — modified',
      'Backend — tests & fixtures',
      'Frontend',
      'Ops artifacts',
    ]);
    expect(map.shared).toHaveLength(6);
    expect(map.noAnalog).toHaveLength(9);
    expect(map.noAnalogNote.length).toBeGreaterThan(0);
    expect(map.other.map((o) => o.heading)).toEqual(['Cross-Cutting Notes for the Planner']);
    expect(map.excerpts).toBe(39);
    const collector = map.assignments.find((a) => a.heading.includes('collector.rs'));
    expect(collector?.guidance.length).toBeGreaterThan(0);
    for (const assignment of map.assignments) {
      for (const block of assignment.guidance) expect(block.kind).not.toBe('code');
    }
    // `**Analog: NONE.**` is an Analog field, not guidance.
    expect(map.assignments.find((a) => a.heading.includes('ws/bus.rs'))?.analog?.startsWith('NONE')).toBe(true);
  });
});

describe('extractPatternMap — degrade', () => {
  it('the dense fixture has no File Classification', async () => {
    const map = extractPatternMap(await repoBody(DENSE));
    expect(map.classification).toHaveLength(0);
  });

  it('never throws on empty or degenerate input', () => {
    for (const body of ['', '\n\n', '# ', '##', '###\n', '## \n', '```', '|', '| |\n|-|\n| |\n', '## File Classification\n| a |\n']) {
      expect(() => extractPatternMap(body)).not.toThrow();
    }
  });

  it('survives an unclosed fence and keeps what precedes it', () => {
    const body = '# Phase 2: X - Pattern Map\n\n**Mapped:** 2026-01-01\n\n## File Classification\n\n| File | Match Quality |\n|---|---|\n| `a.ts` | exact |\n\n## Pattern Assignments\n\n### `a.ts`\n\n```ts\nnever closed\n## Shared Patterns\n';
    const map = extractPatternMap(body);
    expect(map.meta.mapped).toBe('2026-01-01');
    expect(map.classification).toHaveLength(1);
  });

  it('a classification table with no Match Quality column falls back to the last column', () => {
    const body = '## File Classification\n\n| File | Role |\n|---|---|\n| `a.ts` | service |\n| `b.ts` | model |\n';
    const map = extractPatternMap(body);
    expect(map.classification.map((r) => r.quality)).toEqual(['service', 'model']);
  });

  it('a numbered list whose items are blank-line separated, with indented sub-bullets, stays one list', () => {
    const body = '## Notes\n\n1. **One.** first\n\n2. **Two.** second\n\n3. **Three:**\n   - a sub point\n   - another\n\n4. **Four.** last\n';
    const map = extractPatternMap(body);
    const blocks = map.other[0].blocks;
    expect(blocks).toHaveLength(1);
    const list = blocks[0];
    expect(list.kind === 'list' && list.ordered && list.items.length).toBe(4);
    expect(list.kind === 'list' && list.items[2]).toContain('a sub point');
  });

  it('a title that is not "Phase N: X - Pattern Map" keeps the H1 text and no phase', () => {
    const map = extractPatternMap('# Something else\n\n## File Classification\n');
    expect(map.meta.phase).toBeNull();
    expect(map.meta.title).toBe('Something else');
  });

  it('a 1 MB body with one 200,000-character line extracts in under 250 ms', () => {
    const row = '| `src/a.ts` | service | transform | `src/b.ts` | exact |\n';
    const head = '## File Classification\n\n| File | Role | Data Flow | Closest Analog | Match Quality |\n|---|---|---|---|---|\n';
    const longLine = '| ' + '`x` | '.repeat(40_000) + '\n';
    const body = head + row.repeat(5_000) + longLine + 'filler line of prose\n'.repeat(30_000);
    expect(body.length).toBeGreaterThan(1_000_000);
    const started = performance.now();
    const map = extractPatternMap(body);
    expect(performance.now() - started).toBeLessThan(250);
    expect(map.classification.length).toBeGreaterThan(1000);
  });
});

describe('PatternsHandler', () => {
  it('matches the PATTERNS token and adds structured.map', () => {
    const ref = refOf('.planning/phases/01-x/01-PATTERNS.md');
    expect(PatternsHandler.match(ref)).toBe(true);
    expect(PatternsHandler.match(refOf('.planning/phases/01-x/01-CONTEXT.md'))).toBe(false);
    const content =
      '# Phase 1: X - Pattern Map\n\n**Mapped:** 2026-01-01\n\n## File Classification\n\n| File | Match Quality |\n|---|---|\n| `a.ts` | exact |\n';
    const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
    const result = PatternsHandler.parse(raw, ref);
    const map = (result.structured as { map?: { meta: { title: string }; classification: unknown[] } }).map;
    expect(map?.meta.title).toBe('X');
    expect(map?.classification).toHaveLength(1);
  });

  it('parse on garbage returns without throwing', () => {
    const ref = refOf('.planning/phases/01-x/01-PATTERNS.md');
    const content = 'A NUL \u0000 here\n\n###\n\n## File Classification\n| |\n|---|\n| |\n\n```\nunclosed fence\n## Shared Patterns\n';
    const result = PatternsHandler.parse({ path: ref.path, content, mtimeMs: 0, size: content.length }, ref);
    expect(result.title).toBeTruthy();
    expect(result.structured).toBeDefined();
  });
});
