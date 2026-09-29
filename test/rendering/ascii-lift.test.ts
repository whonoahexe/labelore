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
import type { LiftedFigure } from '../../src/rendering/ascii-lift.ts';

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
    expect(figure.cards).toEqual([{ kind: 'box', r1: 0, c1: 0, r2: 2, c2: 3, widened: false }]);
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

  it('box-less: text beside a trunk is a note; each arrow-led line starts its own step node', () => {
    const trunk = must(liftDiagram('Browser\n   |\n   |  1. carries a cookie\n   v\nHandler'));
    expect(trunk.rows[2].find((s) => s.text.includes('carries'))?.kind).toBe('note');
    expect(trunk.cards.filter((c) => c.kind === 'node')).toHaveLength(2);
    const steps = must(liftDiagram('  -> first\n  -> second\n       detail of second'));
    const nodes = steps.cards.filter((c) => c.kind === 'node');
    expect(nodes).toHaveLength(2);
    expect(nodes[1]).toMatchObject({ r1: 1, r2: 2 });
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
