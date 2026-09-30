// quick-260929-3x3 (3X3-03, S-10): liftDiagram / isLiftableDiagram — the pure port of sketch 009's
// liftModel + liftHTML. The corpus numbers (9 boxes / 1 widened / 46 rows on studio-portal v1.0/02,
// 0 boxes / 23 nodes on labelore v1.0/02, 3 boxes on LB v1.0/01, 1 box on SP phases/03) were taken
// by running the sketch's own reference algorithm over the source files, not this port.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SP02_SHAPE } from '../helpers/research-fixtures.ts';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { extractResearchBriefing } from '../../src/planning-repo/handlers/research-briefing.ts';
import { isLiftableDiagram, liftDiagram } from '../../src/rendering/ascii-lift.ts';
import type { LiftCard, LiftFrame, LiftKind, LiftedFigure } from '../../src/rendering/ascii-lift.ts';

const REPO = new URL('../../', import.meta.url);

async function diagramOf(url: URL | string): Promise<string> {
  const body = await readFile(url, 'utf8');
  const diagram = extractResearchBriefing(body).architecture?.diagram?.text;
  if (!diagram) throw new Error(`no diagram in ${String(url)}`);
  return diagram;
}

function must(figure: LiftedFigure | null): LiftedFigure {
  if (figure === null) throw new Error('expected a lifted figure');
  return figure;
}

const kindsOf = (figure: LiftedFigure, row: number) => figure.rows[row].map((s) => [s.text, s.kind]);

describe('liftDiagram — minimal shapes', () => {
  it('a minimal box gives one box card, its first text row is a node, its border is blanked', () => {
    const figure = must(liftDiagram('┌──┐\n│ab│\n└──┘'));
    // quick-260930-jzt: a card now also carries its model-computed frame (grid units).
    expect(figure.cards).toHaveLength(1);
    expect(figure.cards[0]).toMatchObject({ kind: 'box', r1: 0, c1: 0, r2: 2, c2: 3, widened: false });
    expect(figure.cards[0].frame).toEqual({ left: 0.5, top: 0.5, width: 3, height: 2 });
    expect(figure.spacers).toEqual([]);
    expect(figure.height).toBe(3);
    expect(figure.rows[0]).toEqual([]);
    expect(kindsOf(figure, 1)).toEqual([
      [' ', null],
      ['ab', 'node'],
    ]);
    expect(figure.rows[2]).toEqual([]);
  });

  it('later text rows inside a box are plain', () => {
    const figure = must(liftDiagram('┌────┐\n│ ab │\n│ cd │\n└────┘'));
    expect(figure.rows[1].some((s) => s.kind === 'node')).toBe(true);
    expect(figure.rows[2].every((s) => s.kind === null)).toBe(true);
  });

  it('a connector leaving a box stays in the rows as line / arrow glyphs', () => {
    const figure = must(liftDiagram('┌──┐\n│ab│\n└┬─┘\n │\n ▼'));
    expect(kindsOf(figure, 3)).toEqual([[' ', null], ['│', 'line']]);
    expect(kindsOf(figure, 4)).toEqual([[' ', null], ['▼', 'arrow']]);
  });

  it('text beside a box in a boxed diagram is a note', () => {
    const figure = must(liftDiagram('┌──┐\n│ab│ beside it\n└──┘'));
    const note = figure.rows[1].find((s) => s.kind === 'note');
    expect(note?.text).toBe('beside it');
  });

  it('a row that overruns the right edge by 1-2 columns widens the box to the run end + 2', () => {
    const one = must(liftDiagram('┌────┐\n│abcdef│\n└────┘'));
    expect(one.cards[0]).toMatchObject({ kind: 'box', c2: 8, widened: true });
    const two = must(liftDiagram('┌────┐\n│abcdefg│\n└────┘'));
    expect(two.cards[0]).toMatchObject({ c2: 9, widened: true });
    // The stray border glyph the overrun pushed out is blanked.
    expect(two.rows[1].some((s) => s.text.includes('│'))).toBe(false);
  });

  it('an overrun of 3 or more columns does not widen', () => {
    const figure = must(liftDiagram('┌────┐\n│abcdefgh│\n└────┘'));
    expect(figure.cards[0]).toMatchObject({ c2: 5, widened: false });
  });

  it('a ragged box (bottom-right and row borders a column or two off) still lifts as one box', () => {
    const figure = must(liftDiagram('┌──────┐\n│ one   │\n│ two    │\n└───────┘'));
    const boxes = figure.cards.filter((c) => c.kind === 'box');
    expect(boxes).toHaveLength(1);
    // Every border glyph of the box is blanked — the card draws it.
    expect(figure.rows.flat().some((s) => s.kind === 'line')).toBe(false);
  });

  it('plain-ASCII connectors become glyphs: lone | → │, v under it → ▼, leading -> → ─►', () => {
    const figure = must(liftDiagram('Browser\n   |\n   v\nHandler\n  -> step one\n  -> step two'));
    const text = figure.rows.map((row) => row.map((s) => s.text).join('')).join('\n');
    expect(text).toContain('│');
    expect(text).toContain('▼');
    expect(text).toContain('─► step one');
    expect(isLiftableDiagram('Browser\n   |\n   v\nHandler')).toBe(true);
  });

  it('a mid-sentence -> in prose stays text; a --label--> edge becomes line + label + arrow', () => {
    const prose = must(liftDiagram('A\n |\n v\nresolves session -> user_id'));
    expect(prose.rows[3].map((s) => s.text).join('')).toBe('resolves session -> user_id');
    const edge = must(liftDiagram('  -> check? ----no----> refuse'));
    expect(edge.rows[0].map((s) => s.text).join('')).toBe('  ─► check? ────no────► refuse');
    const label = edge.rows[0].find((s) => s.text === 'no');
    expect(label?.kind).toBe('note');
  });

  it('box-less asides: bracketed remarks, ◄─ pointer text and text after a trunk note are notes', () => {
    const figure = must(liftDiagram('Alpha   [1 query]\n  |\n  |  1. step   (fail closed)\n  v\nBeta   <- UNCHANGED here'));
    const kindOf = (r: number, needle: string) => figure.rows[r].find((s) => s.text.includes(needle))?.kind;
    expect(kindOf(0, '[1 query]')).toBe('note');
    expect(kindOf(2, '(fail closed)')).toBe('note');
    expect(kindOf(4, 'UNCHANGED')).toBe('note');
    expect(figure.cards.filter((c) => c.kind === 'node')).toHaveLength(2);
  });

  it('an unclosed bracket in a box does not swallow the note beside the box', () => {
    const figure = must(liftDiagram('┌──────────┐\n│ (wrapped │     side note\n│  label)  │\n└──────────┘'));
    expect(figure.rows[1].find((s) => s.text.includes('side note'))?.kind).toBe('note');
  });

  it('box-less: text beside a trunk is a step detail; each arrow-led line starts its own step node', () => {
    const trunk = must(liftDiagram('Browser\n   |\n   |  1. carries a cookie\n   v\nHandler'));
    // quick-260930-jzt (D1): text beside a trunk that leaves a step is that step's detail (sub text).
    expect(trunk.rows[2].find((s) => s.text.includes('carries'))?.kind).toBe('sub');
    expect(trunk.cards.filter((c) => c.kind === 'node')).toHaveLength(2);
    const steps = must(liftDiagram('  -> first\n  -> second\n       detail of second'));
    const nodes = steps.cards.filter((c) => c.kind === 'node');
    expect(nodes).toHaveLength(2);
    // quick-260930-jzt: a spacer display row separates the stacked steps, so the second step's rows
    // shift down by one.
    expect(nodes[1]).toMatchObject({ r1: 2, r2: 3 });
    expect(steps.spacers).toEqual([1]);
  });

  it('a box-less diagram clusters runs into node cards; a second row joins its node as sub text', () => {
    const figure = must(liftDiagram('Alpha\n  │\n  ▼\nBeta gamma\n(sub line)'));
    const nodes = figure.cards.filter((c) => c.kind === 'node');
    expect(nodes).toHaveLength(2);
    expect(nodes[1]).toMatchObject({ r1: 3, r2: 4 });
    expect(figure.rows[3][0]).toEqual({ text: 'Beta gamma', kind: 'node' });
    expect(figure.rows[4][0]).toEqual({ text: '(sub line)', kind: 'sub' });
    expect(figure.rows[2].find((s) => s.text === '▼')?.kind).toBe('arrow');
  });

  it('runs split on 2+ spaces and on an arrow outside brackets', () => {
    const spaces = must(liftDiagram('Alpha   Beta'));
    expect(spaces.cards.filter((c) => c.kind === 'node')).toHaveLength(2);
    const arrow = must(liftDiagram('load → parse'));
    expect(arrow.cards.filter((c) => c.kind === 'node')).toHaveLength(2);
    const bracket = must(liftDiagram('fn(a → b) done'));
    expect(bracket.cards.filter((c) => c.kind === 'node')).toHaveLength(1);
  });
});

describe('liftDiagram — caps and cost (T-3x3-02)', () => {
  it('returns null over 250 rows or 300 columns', () => {
    expect(liftDiagram(Array.from({ length: 251 }, () => 'x').join('\n'))).toBeNull();
    expect(liftDiagram('x'.repeat(301))).toBeNull();
    expect(liftDiagram(Array.from({ length: 250 }, () => 'x'.repeat(300)).join('\n'))).not.toBeNull();
  });

  it('a 250×300 grid of ┌─ runs lifts in under 250 ms', () => {
    const grid = Array.from({ length: 250 }, () => '┌─'.repeat(150)).join('\n');
    const started = performance.now();
    const figure = liftDiagram(grid);
    expect(performance.now() - started).toBeLessThan(250);
    expect(figure).not.toBeNull();
  });

  it('a grid of tiny boxes past the box cap renders as plain text (null)', () => {
    const row = '┌┐'.repeat(100);
    const bottom = '└┘'.repeat(100);
    const text = Array.from({ length: 30 }, () => `${row}\n${bottom}`).join('\n');
    expect(liftDiagram(text)).toBeNull();
  });
});

describe('liftDiagram — the corpus diagrams', () => {
  it('studio-portal v1.0/02 (fixture): 9 boxes, exactly 1 widened (BROADCAST BUS), 46 rows', () => {
    const text = extractResearchBriefing(SP02_SHAPE).architecture?.diagram?.text ?? '';
    const figure = must(liftDiagram(text));
    const boxes = figure.cards.filter((c) => c.kind === 'box');
    expect(boxes).toHaveLength(9);
    const widened = boxes.filter((c) => c.widened);
    expect(widened).toHaveLength(1);
    const busRow = figure.rows.findIndex((row) => row.some((s) => s.text.includes('BROADCAST BUS')));
    expect(widened[0].r1).toBeLessThan(busRow);
    expect(widened[0].r2).toBeGreaterThan(busRow);
    expect(figure.height).toBe(46);
    expect(figure.cards.filter((c) => c.kind === 'node')).toHaveLength(0);
  });

  it('labelore v1.0/02 (repo file): 0 boxes, 23 node cards', async () => {
    const text = await diagramOf(
      new URL('.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md', REPO),
    );
    const figure = must(liftDiagram(text));
    expect(figure.cards.filter((c) => c.kind === 'box')).toHaveLength(0);
    expect(figure.cards.filter((c) => c.kind === 'node')).toHaveLength(23);
  });

  it('labelore v1.0/01 (repo file): 3 boxes', async () => {
    const text = await diagramOf(
      new URL('.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-RESEARCH.md', REPO),
    );
    expect(must(liftDiagram(text)).cards.filter((c) => c.kind === 'box')).toHaveLength(3);
  });

  const SP03 = `${SP_PLANNING}/milestones/v1.0-phases/03-file-browsing/03-RESEARCH.md`;
  it.runIf(existsSync(SP03))('studio-portal v1.0/03 (real file): both ragged-edged boxes', async () => {
    // The source draws 2 boxes whose right borders wander by a column; both must lift.
    const text = await diagramOf(SP03);
    expect(must(liftDiagram(text)).cards.filter((c) => c.kind === 'box')).toHaveLength(2);
  });

  it('isLiftableDiagram: true for the corpus diagrams, false for prose and code', async () => {
    expect(isLiftableDiagram(extractResearchBriefing(SP02_SHAPE).architecture?.diagram?.text ?? '')).toBe(true);
    expect(
      isLiftableDiagram(
        await diagramOf(
          new URL(
            '.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md',
            REPO,
          ),
        ),
      ),
    ).toBe(true);
    expect(isLiftableDiagram('Hello world\nthis is plain prose\nwith no glyphs')).toBe(false);
    expect(isLiftableDiagram('fn main() {\n    println!("hi");\n}')).toBe(false);
    expect(isLiftableDiagram('')).toBe(false);
  });
});

// quick-260930-jzt: drift-tolerant and open-left boxes (M4, M5), box-less step cards with model-owned
// frames and spacer rows (D1). The fixtures are the studio-portal RESEARCH diagrams, verbatim; every
// row and column below is a 0-based index into that text.
const fixture = (name: string): Promise<string> =>
  readFile(new URL(`./fixtures/${name}.txt`, import.meta.url), 'utf8');

const textOf = (figure: LiftedFigure, row: number): string => (figure.rows[row] ?? []).map((s) => s.text).join('');

interface Located {
  row: number;
  c1: number;
  c2: number;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** The display row and inclusive column span of the first occurrence of `needle`. */
function locate(figure: LiftedFigure, needle: string): Located {
  for (let row = 0; row < figure.rows.length; row++) {
    const at = textOf(figure, row).indexOf(needle);
    if (at >= 0) return { row, c1: at, c2: at + [...needle].length - 1 };
  }
  throw new Error(`"${needle}" not in the figure`);
}

/** The glyph and kind at a cell of the lifted text. */
function cellAt(figure: LiftedFigure, row: number, col: number): { ch: string; kind: LiftKind } {
  let x = 0;
  for (const segment of figure.rows[row] ?? []) {
    const chars = [...segment.text];
    if (col < x + chars.length) return { ch: chars[col - x], kind: segment.kind };
    x += chars.length;
  }
  return { ch: ' ', kind: null };
}

const insideFrame = (frame: LiftFrame, at: Located): boolean =>
  frame.left <= at.c1 &&
  at.c2 + 1 <= frame.left + frame.width &&
  frame.top <= at.row &&
  at.row + 1 <= frame.top + frame.height;

function overlapArea(a: LiftFrame, b: LiftFrame): number {
  const x = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const y = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return x > 0 && y > 0 ? x * y : 0;
}

/** The node card whose text starts at `needle` (its heading). */
function stepCard(figure: LiftedFigure, needle: string): LiftCard {
  const at = locate(figure, needle);
  const card = figure.cards.find((c) => c.kind === 'node' && c.r1 === at.row && c.c1 <= at.c1 && at.c2 <= c.c2);
  if (!card) throw new Error(`no step card heads "${needle}"`);
  return card;
}

const nodeFrames = (figure: LiftedFigure): LiftFrame[] =>
  figure.cards.filter((c) => c.kind === 'node').map((c) => c.frame);
const EPS = 1e-9;

describe('liftDiagram — drifting and open-left boxes (JZT-M4, JZT-M5)', () => {
  it('M4: the outer AUTH MIDDLEWARE box lifts as one card, painted before the boxes nested in it', async () => {
    const figure = must(liftDiagram(await fixture('sp-v1-01-identity-diagram')));
    const boxes = figure.cards.filter((c) => c.kind === 'box');
    expect(boxes).toHaveLength(8);
    const outerIndex = figure.cards.findIndex((c) => c.kind === 'box' && c.r1 === 14);
    const outer = figure.cards[outerIndex];
    expect(outer.c2).toBeGreaterThanOrEqual(89);
    // The outer frame's bottom holds the row-37 "hard-panics…" text.
    expect(outer.frame.top + outer.frame.height).toBeGreaterThanOrEqual(38);
    // The nested boxes come after the outer card in paint order and lie within its rows and right edge.
    // The two side-by-side boxes on row 25 begin left of the outer card's clamped left edge (below), so
    // only their order and vertical extent are pinned here.
    for (const [r1, c1] of [
      [16, 47],
      [25, 25],
      [25, 53],
      [31, 25],
    ] as const) {
      const innerIndex = figure.cards.findIndex(
        (c) => c.kind === 'box' && c.r1 === r1 && c.c1 >= c1 && c.c1 <= c1 + 1,
      );
      expect(innerIndex, `inner box at row ${r1}, column ${c1}`).toBeGreaterThan(outerIndex);
      const inner = figure.cards[innerIndex].frame;
      expect(inner.left + inner.width).toBeLessThanOrEqual(outer.frame.left + outer.frame.width);
      expect(inner.top).toBeGreaterThanOrEqual(outer.frame.top);
      expect(inner.top + inner.height).toBeLessThanOrEqual(outer.frame.top + outer.frame.height);
    }
    // The box the connector enters (row 16, column 47) is enclosed on the left too.
    const entered = figure.cards.find((c) => c.kind === 'box' && c.r1 === 16)!.frame;
    expect(entered.left).toBeGreaterThanOrEqual(outer.frame.left);
  });

  it('M4: the open-left card never covers the outside note or the connector that enters it', async () => {
    const figure = must(liftDiagram(await fixture('sp-v1-01-identity-diagram')));
    const outer = figure.cards.find((c) => c.kind === 'box' && c.r1 === 14)!;
    const note = locate(figure, '(2) POST /api/ws-ticket');
    const note2 = locate(figure, 'JWT verified independently');
    // The └────► connector runs from column 11 to the ► tip at 47; the shaft is what must stay outside.
    const tip = locate(figure, '►');
    const connector = { row: tip.row, c1: locate(figure, '└').c1, c2: tip.c1 - 1 };
    expect(cellAt(figure, tip.row, tip.c1)).toEqual({ ch: '►', kind: 'arrow' });
    for (const at of [note, note2, connector]) {
      expect(insideFrame(outer.frame, at), `row ${at.row}, columns ${at.c1}-${at.c2}`).toBe(false);
      expect(outer.frame.left, `row ${at.row}`).toBeGreaterThanOrEqual(at.c2 + 1 - EPS);
    }
    // The heading text of the box itself stays inside it.
    expect(insideFrame(outer.frame, locate(figure, 'AUTH MIDDLEWARE (axum)'))).toBe(true);
  });

  it("M4: no staircase of loose │ ticks — each row's rightmost │ is blanked, the ► stays an arrow", async () => {
    const source = await fixture('sp-v1-01-identity-diagram');
    const figure = must(liftDiagram(source));
    const lines = source.split('\n').map((line) => [...line]);
    for (let row = 15; row <= 36; row++) {
      const rightmost = lines[row].lastIndexOf('│');
      expect(rightmost, `row ${row} has a │`).toBeGreaterThan(0);
      expect(cellAt(figure, row, rightmost).ch, `row ${row}, column ${rightmost}`).toBe(' ');
    }
    expect(cellAt(figure, 17, 47)).toEqual({ ch: '►', kind: 'arrow' });
    expect(cellAt(figure, 17, 48).ch).toBe(' ');
  });

  it('M5: the RUST/AXUM BACKEND box shows no right-edge │ fragment and keeps its tree guides', async () => {
    const source = await fixture('sp-v1-03-file-browsing-diagram');
    const figure = must(liftDiagram(source));
    const boxes = figure.cards.filter((c) => c.kind === 'box');
    expect(boxes).toHaveLength(2);
    expect(boxes.find((c) => c.r1 === 9)?.c2).toBeGreaterThanOrEqual(73);
    for (let row = 10; row <= 38; row++) {
      for (let col = 60; col < 100; col++) {
        expect('─│┌┐└┘├┤┬┴┼'.includes(cellAt(figure, row, col).ch), `${row}:${col}`).toBe(false);
      }
    }
    const lines = source.split('\n').map((line) => [...line]);
    for (const row of [...range(13, 24), ...range(27, 30), ...range(33, 36)]) {
      expect('├└│'.includes(lines[row][5]), `source guide at row ${row}`).toBe(true);
      expect(cellAt(figure, row, 5), `row ${row}`).toEqual({ ch: lines[row][5], kind: 'line' });
    }
  });

  it('a right edge that drifts out and a bottom corner that closes back in still lifts (walk from the ┐)', () => {
    const figure = must(liftDiagram('┌────┐\n│ a   │\n│ b    │\n│ c   │\n└────┘'));
    expect(figure.cards.filter((c) => c.kind === 'box')).toHaveLength(1);
    expect(figure.rows.flat().some((s) => s.kind === 'line')).toBe(false);
  });

  it('a tree guide inside a box is content: never taken as a border or a bottom corner', () => {
    const figure = must(liftDiagram('┌──────────┐\n│ root     │\n│ ├─ a     │\n│ └─ b     │\n└──────────┘'));
    expect(figure.cards.filter((c) => c.kind === 'box')).toHaveLength(1);
    expect(textOf(figure, 2)).toContain('├─ a');
    expect(figure.rows[3].find((s) => s.text.includes('└─'))?.kind).toBe('line');
  });

  it('an arrow drawn into a side stays an arrow; the border next to it is blanked', () => {
    const figure = must(liftDiagram('┌───┐\n►│ a │\n└───┘'));
    expect(cellAt(figure, 1, 0)).toEqual({ ch: '►', kind: 'arrow' });
    expect(cellAt(figure, 1, 1).ch).toBe(' ');
  });

  it('a fork top over an arrow is not an open-left box', () => {
    const figure = must(liftDiagram('┌───┼───┐\n▼       ▼\n\n└───┬───┘'));
    expect(figure.cards.filter((c) => c.kind === 'box')).toHaveLength(0);
  });
});

describe('liftDiagram — box-less step cards (JZT-D1)', () => {
  it('bulk archive: 11 step cards and 10 spacers, no overlap, a half-row gap, one left edge', async () => {
    const figure = must(liftDiagram(await fixture('sp-p04-bulk-archive-diagram')));
    const nodes = figure.cards.filter((c) => c.kind === 'node');
    expect(nodes).toHaveLength(11);
    expect(figure.spacers).toHaveLength(10);
    for (const spacer of figure.spacers) expect(textOf(figure, spacer).trim()).toBe('');
    const frames = nodeFrames(figure);
    for (let i = 0; i < frames.length; i++) {
      for (let j = i + 1; j < frames.length; j++) {
        const a = frames[i];
        const b = frames[j];
        expect(overlapArea(a, b), `frames ${i} and ${j} overlap`).toBe(0);
        const gapX = Math.max(b.left - (a.left + a.width), a.left - (b.left + b.width));
        const gapY = Math.max(b.top - (a.top + a.height), a.top - (b.top + b.height));
        if (gapX < 0) expect(gapY, `frames ${i} and ${j} share columns`).toBeGreaterThanOrEqual(0.5 - EPS);
        if (gapY < 0) expect(gapX, `frames ${i} and ${j} share rows`).toBeGreaterThanOrEqual(0.5 - EPS);
      }
    }
    // The ten arrow-led step cards share one frame left edge.
    const lefts = nodes.filter((c) => c.c1 === 5).map((c) => c.frame.left);
    expect(lefts).toHaveLength(10);
    expect(new Set(lefts).size).toBe(1);
  });

  it('bulk archive: detail lines sit inside their step frame; edge labels and asides stay outside every frame', async () => {
    const figure = must(liftDiagram(await fixture('sp-p04-bulk-archive-diagram')));
    const details: [string, string[]][] = [
      ['bounded recursive walk', ['local: TierRoot', 'cloud: one rclone']],
      [
        'ArchiveExecutor dedicated thread',
        ['re-open each source', 'missing? ->', 'present? ->', 'progress ->', 'finish + sync + atomic rename'],
      ],
      ['completed WS', ['full 200 or single-range', 'EOF ->', 'never collected']],
    ];
    for (const [heading, lines] of details) {
      const card = stepCard(figure, heading);
      for (const line of lines) expect(insideFrame(card.frame, locate(figure, line)), line).toBe(true);
    }
    const label = locate(figure, '────no');
    const notes: [string, Located][] = [
      ['no', { row: label.row, c1: label.c1 + 4, c2: label.c1 + 5 }],
      ['refusal dialog (selection intact)', locate(figure, 'refusal dialog (selection intact)')],
      ['same refusal dialog', locate(figure, 'same refusal dialog')],
    ];
    for (const [needle, at] of notes) {
      expect(cellAt(figure, at.row, at.c1).kind, needle).toBe('note');
      const cell: LiftFrame = { left: at.c1, top: at.row, width: at.c2 - at.c1 + 1, height: 1 };
      for (const frame of nodeFrames(figure)) expect(overlapArea(frame, cell), needle).toBe(0);
    }
  });

  it('roles: steps stay apart, details and the admin flow sit inside their cards, the pointer note stays out', async () => {
    const figure = must(liftDiagram(await fixture('sp-p02-roles-diagram')));
    const frames = nodeFrames(figure);
    for (let i = 0; i < frames.length; i++) {
      for (let j = i + 1; j < frames.length; j++) expect(overlapArea(frames[i], frames[j]), `${i}/${j}`).toBe(0);
    }
    const admin = stepCard(figure, 'Admin permission-grant path (new):');
    expect(insideFrame(admin.frame, locate(figure, 'Browser -> POST/PATCH'))).toBe(true);
    const sqlite = stepCard(figure, 'SQLite transaction');
    const revocation = stepCard(figure, 'revocation/permission bus.send');
    expect(sqlite).not.toBe(revocation);
    expect(revocation.frame.top - (sqlite.frame.top + sqlite.frame.height)).toBeGreaterThanOrEqual(0.5 - EPS);
    const handler = stepCard(figure, 'axum handler');
    for (const needle of [
      '2. VerifiedIdentity::from_request_parts (auth/mod.rs)',
      '- resolves session',
      '- role == User',
      '- unrecognized role',
    ]) {
      const at = locate(figure, needle);
      expect(insideFrame(handler.frame, at), needle).toBe(true);
      expect(cellAt(figure, at.row, at.c1 + 2).kind, needle).toBe('sub');
    }
    const unchanged = locate(figure, 'UNCHANGED, identity-free');
    expect(cellAt(figure, unchanged.row, unchanged.c1).kind).toBe('note');
    const cell: LiftFrame = { left: unchanged.c1, top: unchanged.row, width: 10, height: 1 };
    for (const frame of frames) expect(overlapArea(frame, cell)).toBe(0);
  });

  it('phases/01: a step takes its detail lines; only the interleaved pair touches, by a single cell', async () => {
    const figure = must(liftDiagram(await fixture('sp-p01-identity-sessions-diagram')));
    const backend = stepCard(figure, 'Rust backend — /api/whoami-shaped');
    for (const needle of [
      'validation endpoint',
      'SELECT ... FROM sessions',
      'WHERE id=? AND revoked_at IS NULL',
      'AND expires_at > now()',
    ]) {
      expect(insideFrame(backend.frame, locate(figure, needle)), needle).toBe(true);
    }
    expect(insideFrame(stepCard(figure, '(cookie valid)').frame, locate(figure, 'renders page'))).toBe(true);
    // 'Next.js page' (rows 12-14) and 'Rust backend' (rows 8-12) share row 12 and column 44 through
    // their text alone, so those two frames may meet in one cell; every other pair is disjoint.
    const frames = nodeFrames(figure);
    for (let i = 0; i < frames.length; i++) {
      for (let j = i + 1; j < frames.length; j++) {
        expect(overlapArea(frames[i], frames[j]), `${i}/${j}`).toBeLessThanOrEqual(1 + EPS);
      }
    }
    const touching = frames.filter((frame, i) => frames.some((other, j) => j !== i && overlapArea(frame, other) > 0));
    expect(touching).toHaveLength(2);
  });

  it('a wrapped line that would stretch a step across its neighbour is an aside, not a detail', () => {
    const figure = must(liftDiagram('one   two\n  wrapped text under both'));
    expect(figure.cards.filter((c) => c.kind === 'node')).toHaveLength(2);
    expect(cellAt(figure, 1, 5).kind).toBe('note');
  });
});

describe('liftDiagram — cost bounds on the new walks (T-jzt-01)', () => {
  it('a grid of ┌┐ rows over ││ rows (heavy on edge walks) returns within 250 ms', () => {
    const grid = Array.from({ length: 250 }, (_, i) => (i % 2 === 0 ? '┌┐'.repeat(150) : '││'.repeat(150))).join('\n');
    const started = performance.now();
    liftDiagram(grid);
    expect(performance.now() - started).toBeLessThan(250);
  });

  it('a 250×300 grid of "ab  " runs returns within 250 ms', () => {
    const grid = Array.from({ length: 250 }, () => 'ab  '.repeat(75)).join('\n');
    const started = performance.now();
    liftDiagram(grid);
    expect(performance.now() - started).toBeLessThan(250);
  });

  it('open-left tops that never close cost a bounded walk', () => {
    const grid = Array.from({ length: 250 }, (_, i) =>
      i % 2 === 0 ? '┌─┐ '.repeat(75) : '  │ '.repeat(75),
    ).join('\n');
    const started = performance.now();
    liftDiagram(grid);
    expect(performance.now() - started).toBeLessThan(250);
  });
});
