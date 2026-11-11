// The Source reader's line model (SRC-01, SRC-02). Counts and line numbers below were confirmed by reading
// the Lendshed fixture files, not copied from the code's output.
import { describe, expect, it } from 'vitest';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';
import { fxRead } from '../helpers/fixture-project.ts';
import {
  SOURCE_STRUCTURE_LINE_LIMIT,
  buildSourceModel,
  chainAt,
  defaultFolds,
  foldIdsOf,
  foldPresetsOf,
  gutterOf,
  hiddenLinesOf,
  languageOf,
  unfoldFor,
} from '../../src/web/source/source-model.ts';
import type { SourceBlock, SourceModel } from '../../src/web/source/source-model.ts';

const PLAN = 'phases/01-member-sign-in-sessions/01-06-PLAN.md';
const VALIDATION = 'phases/01-member-sign-in-sessions/01-VALIDATION.md';
const RESEARCH = 'phases/01-member-sign-in-sessions/01-RESEARCH.md';

function find(model: SourceModel, pick: (b: SourceBlock) => boolean): SourceBlock {
  const block = model.blocks.find(pick);
  if (!block) throw new Error('expected block is missing');
  return block;
}

describe('languageOf', () => {
  it('reads markdown, json and everything else as text', () => {
    expect(languageOf('phases/01/01-PLAN.md')).toBe('markdown');
    expect(languageOf('NOTES.MARKDOWN')).toBe('markdown');
    expect(languageOf('config.json')).toBe('json');
    expect(languageOf('run.log')).toBe('text');
    expect(languageOf('LICENSE')).toBe('text');
  });
});

describe('buildSourceModel lines', () => {
  it('has zero lines for an empty text', () => {
    const model = buildSourceModel('', 'markdown');
    expect(model.lines).toEqual([]);
    expect(model.frontmatter).toBeNull();
    expect(model.blocks).toEqual([]);
    expect(model.maxDepth).toBe(0);
  });

  it('adds no line for a final newline, and keeps a trailing carriage return out of the line text', () => {
    expect(buildSourceModel('a\nb\n', 'text').lines).toEqual(['a', 'b']);
    expect(buildSourceModel('a\nb', 'text').lines).toEqual(['a', 'b']);
    expect(buildSourceModel('a\r\nb\r\n', 'text').lines).toEqual(['a', 'b']);
    expect(buildSourceModel('\n', 'text').lines).toEqual(['']);
  });

  it('finds frontmatter in a CRLF file the same way', () => {
    const model = buildSourceModel('---\r\nphase: 1\r\nplan: 2\r\n---\r\n# Body\r\n', 'markdown');
    expect(model.frontmatter).toEqual({ from: 1, to: 4, keyCount: 2 });
    expect(model.lines[0]).toBe('---');
  });

  it('treats a file of only frontmatter as one block over every line, folded by default to a single row', () => {
    const model = buildSourceModel('---\nphase: 1\nstatus: done\n---\n', 'markdown');
    expect(model.blocks).toHaveLength(1);
    expect(model.blocks[0]).toMatchObject({ kind: 'frontmatter', from: 1, to: 4, depth: 0, label: 'frontmatter · 2 keys' });
    expect([...defaultFolds(model)]).toEqual([model.blocks[0].id]);
    const hidden = hiddenLinesOf(model, defaultFolds(model));
    expect(hidden[1]).toBe(0);
    expect([hidden[2], hidden[3], hidden[4]]).toEqual([1, 1, 1]);
  });

  it('reads no frontmatter when the opening line is not exactly three hyphens or never closes', () => {
    expect(buildSourceModel('----\na: 1\n---\n', 'markdown').frontmatter).toBeNull();
    expect(buildSourceModel('---\na: 1\n', 'markdown').frontmatter).toBeNull();
    expect(buildSourceModel('---\na: 1\n---\n', 'text').frontmatter).toBeNull();
  });
});

describe("Lendshed's plan-06", () => {
  const model = buildSourceModel(fxRead(PLAN), 'markdown');

  it('has one frontmatter block over lines 1 to 51 with its ten top-level keys', () => {
    expect(model.frontmatter).toEqual({ from: 1, to: 51, keyCount: 10 });
    const fm = find(model, (b) => b.kind === 'frontmatter');
    expect(fm).toMatchObject({ from: 1, to: 51, depth: 0, label: 'frontmatter · 10 keys' });
  });

  it('holds one block per task element, a level deeper than tasks, each named by its name element', () => {
    const tasks = find(model, (b) => b.kind === 'xml' && b.tag === 'tasks');
    expect(tasks).toMatchObject({ from: 86, to: 217, depth: 0, label: '<tasks>' });
    const each = model.blocks.filter((b) => b.kind === 'xml' && b.tag === 'task');
    expect(each.map((b) => [b.from, b.to, b.depth, b.name])).toEqual([
      [88, 134, 1, 'Task 1: The forced password screen'],
      [136, 169, 1, 'Task 2: Name and sign-out in the signed-in top bar'],
      [171, 215, 1, 'Task 3: Router change — drop the shared passcode prompt'],
    ]);
  });

  it('lists the top-level elements and nests the elements inside a task a level deeper', () => {
    const top = model.blocks.filter((b) => b.kind === 'xml' && b.depth === 0).map((b) => [b.tag, b.from, b.to]);
    expect(top).toEqual([
      ['objective', 53, 64],
      ['execution_context', 66, 69],
      ['context', 71, 75],
      ['artifacts_this_phase_produces', 77, 84],
      ['tasks', 86, 217],
      ['threat_model', 219, 236],
      ['verification', 238, 243],
      ['success_criteria', 245, 249],
      ['flagged_assumptions', 251, 256],
      ['output', 258, 260],
    ]);
    const readFirst = find(model, (b) => b.tag === 'read_first' && b.from === 92);
    expect(readFirst.depth).toBe(2);
  });

  it('clamps heading sections to the enclosing element and trims trailing blank lines', () => {
    const sections = model.blocks.filter((b) => b.kind === 'section');
    expect(sections.map((b) => [b.label, b.from, b.to, b.depth])).toEqual([
      ['## Trust Boundaries', 220, 225, 1],
      ['## STRIDE Threat Register', 227, 235, 1],
    ]);
  });

  it('finds the two tables inside those sections', () => {
    const tables = model.blocks.filter((b) => b.kind === 'table');
    expect(tables.map((b) => [b.from, b.to, b.depth, b.label])).toEqual([
      [222, 225, 2, 'table · 2 rows'],
      [229, 235, 2, 'table · 5 rows'],
    ]);
    expect(model.maxDepth).toBe(3);
    expect(model.structured).toBe(true);
  });

  it('reports the headings outside fences and frontmatter', () => {
    expect(model.headings.map((h) => [h.depth, h.text, h.line])).toEqual([
      [2, 'Trust Boundaries', 220],
      [2, 'STRIDE Threat Register', 227],
    ]);
  });
});

describe("Lendshed's validation file and research file", () => {
  it('finds the three wide tables in the validation file', () => {
    const model = buildSourceModel(fxRead(VALIDATION), 'markdown');
    expect(model.frontmatter).toMatchObject({ to: 11, keyCount: 7 });
    const tables = model.blocks.filter((b) => b.kind === 'table');
    expect(tables.map((b) => [b.from, b.to, b.label])).toEqual([
      [23, 29, 'table · 5 rows'],
      [49, 59, 'table · 9 rows'],
      [92, 97, 'table · 4 rows'],
    ]);
  });

  it('finds the long fence in the research file and skips table-looking lines and headings inside it', () => {
    const model = buildSourceModel(fxRead(RESEARCH), 'markdown');
    const fence = find(model, (b) => b.kind === 'fence' && b.from === 133);
    expect(fence).toMatchObject({ to: 170, label: '```code' });
    expect(model.headings.every((h) => h.line < 133 || h.line > 170)).toBe(true);
    expect(model.blocks.some((b) => b.kind !== 'fence' && b.from > 133 && b.from < 170 && b.kind !== 'section')).toBe(false);
  });
});

describe('JSON files', () => {
  it('nests objects and arrays by their brackets', () => {
    const model = buildSourceModel(fxRead('config.json'), 'json');
    expect(model.frontmatter).toBeNull();
    expect(model.blocks.map((b) => [b.kind, b.from, b.to, b.depth, b.label])).toEqual([
      ['json', 1, 17, 0, 'whole file'],
      ['json', 10, 16, 1, '"workflow" {…}'],
    ]);
  });

  it('labels unkeyed inner brackets by their shape', () => {
    const model = buildSourceModel('{\n  "list": [\n    {\n      "a": 1\n    },\n    [\n      2\n    ]\n  ]\n}\n', 'json');
    expect(model.blocks.map((b) => [b.from, b.to, b.label])).toEqual([
      [1, 10, 'whole file'],
      [2, 9, '"list" […]'],
      [3, 5, '{…}'],
      [6, 8, '[…]'],
    ]);
  });
});

describe('the structure pass limit', () => {
  it('has no blocks and structured false above 10,000 lines, but keeps the lines and headings', () => {
    expect(SOURCE_STRUCTURE_LINE_LIMIT).toBe(10000);
    const text = '# Top\n' + '<a>\nx\n</a>\n'.repeat(3334);
    const over = buildSourceModel(text, 'markdown');
    expect(over.lines.length).toBeGreaterThan(SOURCE_STRUCTURE_LINE_LIMIT);
    expect(over.structured).toBe(false);
    expect(over.blocks).toEqual([]);
    expect(over.maxDepth).toBe(0);
    expect(over.headings).toHaveLength(1);
    expect(gutterOf(over)).toHaveLength(over.lines.length);
  });

  it('keeps the structure at exactly the limit', () => {
    const text = 'x\n'.repeat(SOURCE_STRUCTURE_LINE_LIMIT - 4) + '<a>\nx\nx\n</a>\n';
    const model = buildSourceModel(text, 'markdown');
    expect(model.lines).toHaveLength(SOURCE_STRUCTURE_LINE_LIMIT);
    expect(model.structured).toBe(true);
    expect(model.blocks).toHaveLength(1);
  });
});

describe('structure edge cases', () => {
  it('stops a section that sits inside an element at the element, and cuts one before a crossing element', () => {
    const inner = buildSourceModel(['<box>', '## In', 'a', '</box>', 'tail'].join('\n'), 'markdown');
    expect(find(inner, (b) => b.kind === 'section')).toMatchObject({ from: 2, to: 3 });
    // A's next same-depth heading sits inside the box, so the box crosses A's end and A stops before it.
    const cross = buildSourceModel(['## A', 'x', '<box>', 'y', '## B', 'z', '</box>'].join('\n'), 'markdown');
    const sections = cross.blocks.filter((b) => b.kind === 'section').map((b) => [b.label, b.from, b.to]);
    expect(sections).toEqual([
      ['## A', 1, 2],
      ['## B', 5, 6],
    ]);
  });

  it('ignores self-closing and single-line elements, and an unclosed fence', () => {
    const text = ['<br />', '<one>text</one>', '```', 'never closed', '<x>', 'y', '</x>'].join('\n');
    const model = buildSourceModel(text, 'markdown');
    expect(model.blocks).toEqual([]);
  });

  it('labels a fence by its info string', () => {
    const model = buildSourceModel('```ts\nconst a = 1;\n```\n', 'markdown');
    expect(model.blocks[0]).toMatchObject({ kind: 'fence', label: '```ts', from: 1, to: 3 });
  });
});

describe('gutterOf', () => {
  const model = buildSourceModel(fxRead(PLAN), 'markdown');
  const gutter = gutterOf(model);

  it('has one row per line and one slot per depth column', () => {
    expect(gutter).toHaveLength(model.lines.length);
    expect(gutter.every((row) => row.length === model.maxDepth)).toBe(true);
  });

  it('marks start, mid and end on the frontmatter column', () => {
    const fm = find(model, (b) => b.kind === 'frontmatter');
    expect(gutter[0][0]).toEqual({ blockId: fm.id, state: 'start' });
    expect(gutter[10][0]).toEqual({ blockId: fm.id, state: 'mid' });
    expect(gutter[50][0]).toEqual({ blockId: fm.id, state: 'end' });
    expect(gutter[51][0]).toBeNull();
  });

  it('puts a task on the column one deeper than tasks, and nothing on a blank line between tasks', () => {
    const tasks = find(model, (b) => b.tag === 'tasks');
    const task1 = find(model, (b) => b.tag === 'task' && b.from === 88);
    expect(gutter[87][0]).toEqual({ blockId: tasks.id, state: 'mid' });
    expect(gutter[87][1]).toEqual({ blockId: task1.id, state: 'start' });
    expect(gutter[133][1]).toEqual({ blockId: task1.id, state: 'end' });
    expect(gutter[134][1]).toBeNull();
    expect(gutter[134][0]).toEqual({ blockId: tasks.id, state: 'mid' });
  });

  it('marks a one-line block as one', () => {
    const one = buildSourceModel('{\n}\n', 'json');
    expect(gutterOf(one)[0][0]?.state).toBe('start');
    const tiny: SourceModel = { ...one, blocks: [{ ...one.blocks[0], from: 1, to: 1 }] };
    expect(gutterOf(tiny)[0][0]?.state).toBe('one');
  });
});

describe('fold presets, default folds and fold state', () => {
  const plan = buildSourceModel(fxRead(PLAN), 'markdown');

  it('lists None plus only the presets whose block kind exists', () => {
    expect(foldPresetsOf(plan).map((p) => p.label)).toEqual(['None', 'Frontmatter', 'Tasks', 'Tables', 'Sections']);
    expect(foldPresetsOf(buildSourceModel('plain words\n', 'markdown')).map((p) => p.label)).toEqual(['None']);
    expect(foldPresetsOf(buildSourceModel(fxRead('config.json'), 'json')).map((p) => p.label)).toEqual(['None', 'Objects']);
  });

  it('lists Tasks only when a task element exists, and Tables only when a table exists', () => {
    const noTable = buildSourceModel('---\na: 1\n---\n<x>\ny\n</x>\n', 'markdown');
    expect(foldPresetsOf(noTable).map((p) => p.id)).toEqual(['none', 'frontmatter']);
  });

  it('folds the frontmatter by default and nothing else', () => {
    const fm = find(plan, (b) => b.kind === 'frontmatter');
    expect([...defaultFolds(plan)]).toEqual([fm.id]);
    expect(defaultFolds(buildSourceModel('no frontmatter\n', 'markdown')).size).toBe(0);
  });

  it('folds the blocks a preset names', () => {
    const tasks = foldPresetsOf(plan).find((p) => p.id === 'tasks');
    if (!tasks) throw new Error('missing Tasks preset');
    const ids = foldIdsOf(plan, tasks);
    expect([...ids].map((id) => plan.blocks[id].from)).toEqual([88, 136, 171]);
    const none = foldPresetsOf(plan)[0];
    expect(foldIdsOf(plan, none).size).toBe(0);
  });

  it('hides lines after the first of every folded block, nested folds included', () => {
    const hidden = hiddenLinesOf(plan, defaultFolds(plan));
    expect(hidden[1]).toBe(0);
    expect(hidden[2]).toBe(1);
    expect(hidden[51]).toBe(1);
    expect(hidden[52]).toBe(0);

    const tasks = find(plan, (b) => b.tag === 'tasks');
    const task1 = find(plan, (b) => b.tag === 'task' && b.from === 88);
    const both = hiddenLinesOf(plan, new Set([tasks.id, task1.id]));
    expect(both[86]).toBe(0);
    expect(both[87]).toBe(1);
    expect(both[217]).toBe(1);
    expect(both[218]).toBe(0);
    const inner = hiddenLinesOf(plan, new Set([task1.id]));
    expect(inner[88]).toBe(0);
    expect(inner[89]).toBe(1);
    expect(inner[134]).toBe(1);
    expect(inner[135]).toBe(0);
  });

  it('returns the folded blocks a range starts inside, so the reader unfolds before landing', () => {
    const fm = find(plan, (b) => b.kind === 'frontmatter');
    const task1 = find(plan, (b) => b.tag === 'task' && b.from === 88);
    const tasks = find(plan, (b) => b.tag === 'tasks');
    expect(unfoldFor(plan, defaultFolds(plan), { from: 3, to: 5 })).toEqual([fm.id]);
    expect(unfoldFor(plan, defaultFolds(plan), { from: 1, to: 5 })).toEqual([]);
    expect(unfoldFor(plan, defaultFolds(plan), { from: 60, to: 70 })).toEqual([]);
    expect(unfoldFor(plan, new Set([tasks.id, task1.id]), { from: 100, to: 100 })).toEqual([tasks.id, task1.id]);
    expect(unfoldFor(plan, new Set([task1.id]), { from: 88, to: 100 })).toEqual([]);
  });

  it('gives the chain of blocks containing a line, outermost first', () => {
    expect(chainAt(plan, 93).map((b) => b.label)).toEqual(['<tasks>', '<task>', '<read_first>']);
    expect(chainAt(plan, 223).map((b) => b.label)).toEqual([
      '<threat_model>',
      '## Trust Boundaries',
      'table · 2 rows',
    ]);
    expect(chainAt(plan, 52)).toEqual([]);
  });
});

describe('growth (T-12-07)', () => {
  function planText(n: number): string {
    const parts: string[] = ['---', 'a: 1', '---'];
    for (let i = 0; i < n; i += 1) {
      parts.push(`## Heading ${i}`, '<task>', '  <name>Task</name>', '  text', '</task>', '| a | b |', '| - | - |', '| 1 | 2 |', '');
    }
    return parts.join('\n');
  }

  it('builds the model in linear time at an 8x step', () => {
    const growth = measureGrowth<string>({
      make: (n) => planText(Math.max(1, Math.floor(n / 40))),
      run: (text) => {
        buildSourceModel(text, 'markdown');
      },
      maxSize: 1 << 14,
      floorMs: 0,
      startSize: 160,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('builds nested headings with one shared tail in linear time', () => {
    const growth = measureGrowth<string>({
      make: (n) => {
        const parts: string[] = [];
        for (let i = 0; i < n; i += 1) parts.push(`${'#'.repeat(1 + (i % 6))} h${i}`);
        parts.push(...new Array<string>(200).fill(''));
        return parts.join('\n');
      },
      run: (text) => {
        buildSourceModel(text, 'markdown');
      },
      startSize: 100,
      maxSize: 4000,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });

  it('fills the gutter in linear time at an 8x step', () => {
    const growth = measureGrowth<SourceModel>({
      make: (n) => buildSourceModel(planText(Math.max(1, Math.floor(n / 40))), 'markdown'),
      run: (model) => {
        gutterOf(model);
      },
      maxSize: 1 << 14,
      floorMs: 0,
      startSize: 160,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});
