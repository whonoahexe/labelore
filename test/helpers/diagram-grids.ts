// Adversarial character grids for the diagram cost tests (T-3x3-02, T-jzt-01, T-mp6-01). Each grid is
// sized by its cell count, so a growth test can step the area by 8x without crossing the lifter's row
// and column caps: a ratio taken across a cap would time a rejection, not the scan (growth.ts, rule 2).
import { LIFT_MAX_COLS, LIFT_MAX_ROWS } from '../../src/rendering/ascii-lift.ts';

/** Largest cell count that stays inside both caps for every shape below, and few enough cards that none reaches the graph builder node cap. */
export const GRID_MAX_CELLS = 40_000;

export interface GridShape {
  name: string;
  /** Builds the text of one row; `cols` is always a multiple of four. */
  row: (index: number, cols: number) => string;
}

export const GRID_SHAPES: GridShape[] = [
  { name: '┌─ runs', row: (_, cols) => '┌─'.repeat(cols / 2) },
  { name: '┌┐ rows over ││ rows', row: (i, cols) => (i % 2 === 0 ? '┌┐' : '││').repeat(cols / 2) },
  { name: '"ab  " runs', row: (_, cols) => 'ab  '.repeat(cols / 4) },
  { name: 'open-left tops', row: (i, cols) => (i % 2 === 0 ? '┌─┐ ' : '  │ ').repeat(cols / 4) },
];

/** A near-square grid of about `cells` cells, strictly inside LIFT_MAX_ROWS by LIFT_MAX_COLS. */
export function gridOfCells(shape: GridShape, cells: number): string {
  const cols = Math.min(LIFT_MAX_COLS - (LIFT_MAX_COLS % 4), 4 * Math.max(1, Math.round(Math.sqrt(cells) / 4)));
  const rows = Math.min(LIFT_MAX_ROWS, 2 * Math.max(1, Math.ceil(cells / cols / 2)));
  return Array.from({ length: rows }, (_, i) => shape.row(i, cols)).join('\n');
}
