// quick-260930-wfs: extractPatternMap (the PATTERNS.md pattern-map projection) against the two
// anchor documents read from disk (Labelore's own v1.1/05 map and the made-up Lendshed v1.0/02 map),
// degenerate input, and the T-wfs-01 timing guard; plus the PatternsHandler's match and
// structured.map. Anchor counts were independently confirmed with awk against the source tables
// (never copied from the extractor's own output). A missing Lendshed file throws through fxPath.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { fxPath } from './helpers/fixture-project.ts';
import { extractPatternMap, splitRow } from '../src/planning-repo/handlers/pattern-map.ts';
import { PatternsHandler } from '../src/planning-repo/handlers/patterns.ts';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';

const REPO_ROOT = new URL('../', import.meta.url);
const LB05 = '.planning/milestones/v1.1-phases/05-per-type-document-views/05-PATTERNS.md';
const FX02 = 'milestones/v1.0-phases/02-shed-inventory-health/02-PATTERNS.md';
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

describe('extractPatternMap — Lendshed v1.0/02 (made-up file)', () => {
  it('reads the five doc groups, seven no-analog entries and the planner notes', async () => {
    const map = extractPatternMap(await readFile(fxPath(FX02), 'utf8'));
    expect(map.meta.phase).toBe('2');
    expect(map.meta.title).toBe('Shed Inventory Health');
    expect(map.classification).toHaveLength(22);
    const groups: string[] = [];
    for (const row of map.classification) if (!groups.includes(row.group ?? '')) groups.push(row.group ?? '');
    expect(groups).toEqual([
      'Server — fresh modules',
      'Server — edits',
      'Server — specs & sample feeds',
      'Web',
      'Ops notes',
    ]);
    expect(map.shared).toHaveLength(5);
    expect(map.noAnalog).toHaveLength(7);
    expect(map.noAnalogNote.length).toBeGreaterThan(0);
    expect(map.other.map((o) => o.heading)).toEqual(['Notes Spanning Several Files']);
    expect(map.excerpts).toBe(16);
    const reader = map.assignments.find((a) => a.heading.includes('stock/reader.ts'));
    expect(reader?.guidance.length).toBeGreaterThan(0);
    for (const assignment of map.assignments) {
      for (const block of assignment.guidance) expect(block.kind).not.toBe('code');
    }
    // `**Analog: NONE.**` is an Analog field, not guidance.
    expect(map.assignments.find((a) => a.heading.includes('feed/bus.ts'))?.analog?.startsWith('NONE')).toBe(true);
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

  it('a blockquoted warning in an assignment keeps its headline, prose and labelled lists', () => {
    const body = [
      '## Pattern Assignments',
      '',
      '### `a/b.rs` (service)',
      '',
      '**Analog:** `c/d.rs`',
      '',
      '> ### ⚠ WARNING — do not copy',
      '>',
      '> It uses `spawn`.',
      '>',
      '> **Copy from this analog:**',
      '> - the shape',
      '> - the idiom',
      '',
      '**Imports pattern** (source: `x.rs:1-5`):',
      '```rust',
      'use x;',
      '```',
      '',
    ].join('\n');
    const guidance = extractPatternMap(body).assignments[0].guidance;
    expect(guidance.map((b) => b.kind)).toEqual(['paragraph', 'paragraph', 'paragraph', 'list']);
    expect(guidance[0].kind === 'paragraph' && guidance[0].text).toBe('**⚠ WARNING — do not copy**');
    expect(guidance[2].kind === 'paragraph' && guidance[2].text).toBe('**Copy from this analog:**');
    // The caption of the removed excerpt is gone; the excerpt is counted.
    expect(extractPatternMap(body).assignments[0].excerpts).toBe(1);
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

describe('extractPatternMap — fenced figures in prose (quick-261024-o3h)', () => {
  const TREE_FENCE = '```\nsrc/\n├── a.ts\n├── b.ts\n└── c.ts\n```';

  it('keeps an untagged directory tree as a code block and still drops other fenced code', () => {
    const map = extractPatternMap(
      `## Notes\n\nWords.\n\n${TREE_FENCE}\n\n\`\`\`ts\nconst a = 1;\n\`\`\`\n\n\`\`\`\nplain snippet\n\`\`\`\n`,
    );
    expect(map.other[0].blocks).toEqual([
      { kind: 'paragraph', text: 'Words.' },
      { kind: 'code', text: 'src/\n├── a.ts\n├── b.ts\n└── c.ts' },
    ]);
  });
});
