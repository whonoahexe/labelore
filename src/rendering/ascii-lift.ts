// Lifts an ASCII box-drawing diagram into a model the UI can draw as cards behind the author's own
// text (quick-260929-3x3, sketch 009 Diagram B "Lifted"). A faithful, pure port of the sketch's
// `liftModel()` (grid, box detection, border blanking, text runs, overrun widening, box-less node
// clustering) and `liftHTML()` (per-character kind classes → per-row segments); the DOM placement
// half of the sketch (`placeCards`) lives in `src/web/components/lifted-diagram.tsx`. No DOM, no
// Node APIs and no research-specific import — the lifted-figures-everywhere todo reuses this
// unchanged for every document.
//
// T-3x3-02: input over MAX_ROWS lines or MAX_COLS columns (or an absurd box count) returns null so
// the caller renders plain text; every scan is a bounded pass over the grid.

const BOX = '─│┌┐└┘├┤┬┴┼';
const ARROWS = '▼▲►◄→←↑↓';
const TOP_EDGE = '─┬┴┼';
const SIDE_EDGE = '│├┤┼';

export const LIFT_MAX_ROWS = 250;
export const LIFT_MAX_COLS = 300;
/** More boxes than this in one figure is not a diagram — render it as plain text. */
const MAX_BOXES = 500;

export type LiftKind = 'line' | 'arrow' | 'node' | 'sub' | 'note' | null;

export interface LiftSegment {
  text: string;
  kind: LiftKind;
}

export interface LiftCard {
  kind: 'box' | 'node';
  /** Grid coordinates, inclusive: rows r1..r2, columns c1..c2. */
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  /** True when a source line overran the box's right edge by 1-2 columns and the box grew to fit. */
  widened: boolean;
}

export interface LiftedFigure {
  rows: LiftSegment[][];
  cards: LiftCard[];
  width: number;
  height: number;
}

interface Run {
  r: number;
  c1: number;
  c2: number;
  inBox: boolean;
  node: NodeAcc | null;
}

interface NodeAcc {
  id: number;
  r1: number;
  r2: number;
  c1: number;
  c2: number;
}

function isBoxGlyph(ch: string): boolean {
  return BOX.includes(ch);
}

function isArrowGlyph(ch: string): boolean {
  return ARROWS.includes(ch);
}

/** Lifts `text` into rows of typed segments plus the cards to draw behind them; `null` when the
 * figure exceeds the size caps. */
export function liftDiagram(text: string): LiftedFigure | null {
  const lines = text.split('\n');
  if (lines.length > LIFT_MAX_ROWS) return null;
  const chars = lines.map((line) => Array.from(line.endsWith('\r') ? line.slice(0, -1) : line));
  let width = 0;
  for (const row of chars) if (row.length > width) width = row.length;
  if (width > LIFT_MAX_COLS) return null;
  const height = chars.length;

  const g: string[][] = chars.map((row) => {
    const padded = row.slice();
    while (padded.length < width) padded.push(' ');
    return padded;
  });
  const at = (r: number, c: number): string => (g[r] && g[r][c]) || ' ';

  // Boxes: every `┌` that closes into a `┐` / `└` / `┘` rectangle.
  const boxes: LiftCard[] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (at(r, c) !== '┌') continue;
      let c2 = c + 1;
      while (c2 < width && TOP_EDGE.includes(at(r, c2))) c2++;
      if (at(r, c2) !== '┐') continue;
      let r2 = r + 1;
      while (r2 < height && SIDE_EDGE.includes(at(r2, c))) r2++;
      if (at(r2, c) !== '└' || at(r2, c2) !== '┘') continue;
      boxes.push({ kind: 'box', r1: r, c1: c, r2, c2, widened: false });
      if (boxes.length > MAX_BOXES) return null;
    }
  }

  const insideBox: boolean[][] = Array.from({ length: height }, () => new Array<boolean>(width).fill(false));
  for (const b of boxes) {
    for (let r = b.r1 + 1; r < b.r2; r++) for (let c = b.c1 + 1; c < b.c2; c++) insideBox[r][c] = true;
  }

  // Blank each box's border (the card draws it) — top/bottom rows outright, side columns where a
  // box glyph sits.
  for (const b of boxes) {
    for (let c = b.c1; c <= b.c2; c++) {
      g[b.r1][c] = ' ';
      g[b.r2][c] = ' ';
    }
    for (let r = b.r1; r <= b.r2; r++) {
      for (const c of [b.c1, b.c2]) if (isBoxGlyph(g[r][c])) g[r][c] = ' ';
    }
  }

  // Text runs: split on 2+ spaces, on a box glyph, or on an arrow outside brackets.
  const runs: Run[] = [];
  for (let r = 0; r < height; r++) {
    let c = 0;
    while (c < width) {
      const ch = g[r][c];
      if (ch === ' ' || isBoxGlyph(ch) || isArrowGlyph(ch) || ch === '•') {
        c++;
        continue;
      }
      let e = c;
      let depth = 0;
      let gap = 0;
      while (e < width) {
        const x = g[r][e];
        if (x === '(' || x === '{' || x === '[') depth++;
        if (x === ')' || x === '}' || x === ']') depth = Math.max(0, depth - 1);
        if (isBoxGlyph(x) || (isArrowGlyph(x) && depth === 0)) break;
        if (x === ' ') {
          gap++;
          if (gap >= 2 && depth === 0) break;
        } else gap = 0;
        e++;
      }
      let end = e;
      while (end > c && g[r][end - 1] === ' ') end--;
      runs.push({ r, c1: c, c2: end - 1, inBox: insideBox[r][c], node: null });
      c = e;
    }
  }

  // A source line that overruns its box by a char or two (e.g. BROADCAST BUS) widens that box only.
  for (const b of boxes) {
    const c0 = b.c2;
    for (const run of runs) {
      if (
        run.r > b.r1 &&
        run.r < b.r2 &&
        run.c1 > b.c1 &&
        run.c1 < c0 &&
        run.c2 >= c0 &&
        run.c2 <= c0 + 2
      ) {
        b.c2 = Math.max(b.c2, run.c2 + 2);
      }
    }
    if (b.c2 !== c0) b.widened = true;
    for (let r = b.r1 + 1; r < b.r2; r++) {
      for (let c = c0 + 1; c <= b.c2; c++) if (c < width && isBoxGlyph(g[r][c])) g[r][c] = ' ';
    }
  }

  // Box-less diagrams: vertically adjacent runs that overlap in columns merge into one node card.
  const nodes: NodeAcc[] = [];
  if (boxes.length === 0) {
    let previousRow: NodeAcc[] = [];
    let currentRow: NodeAcc[] = [];
    let rowIndex = -1;
    for (const run of runs) {
      if (run.r !== rowIndex) {
        previousRow = rowIndex === run.r - 1 ? currentRow : [];
        previousRow.sort((a, b) => a.id - b.id);
        currentRow = [];
        rowIndex = run.r;
      }
      const match = previousRow.find((n) => run.c1 <= n.c2 + 1 && run.c2 >= n.c1 - 1);
      if (match) {
        match.r2 = run.r;
        match.c1 = Math.min(match.c1, run.c1);
        match.c2 = Math.max(match.c2, run.c2);
        run.node = match;
        currentRow.push(match);
      } else {
        const node: NodeAcc = { id: nodes.length, r1: run.r, r2: run.r, c1: run.c1, c2: run.c2 };
        nodes.push(node);
        run.node = node;
        currentRow.push(node);
      }
    }
  }

  // Per-character kinds → per-row segments.
  const boxesByFirstTextRow = new Map<number, LiftCard[]>();
  for (const b of boxes) {
    const list = boxesByFirstTextRow.get(b.r1 + 1);
    if (list) list.push(b);
    else boxesByFirstTextRow.set(b.r1 + 1, [b]);
  }
  const kinds: LiftKind[][] = Array.from({ length: height }, () => new Array<LiftKind>(width).fill(null));
  for (const run of runs) {
    let kind: LiftKind;
    if (run.inBox) {
      const firstRow = (boxesByFirstTextRow.get(run.r) ?? []).some((b) => run.c1 > b.c1 && run.c1 < b.c2);
      kind = firstRow ? 'node' : null;
    } else if (run.node) {
      kind = run.node.r1 === run.r ? 'node' : 'sub';
    } else {
      kind = boxes.length > 0 ? 'note' : 'node';
    }
    for (let c = run.c1; c <= run.c2; c++) kinds[run.r][c] = kind;
  }

  const rows: LiftSegment[][] = g.map((row, r) => {
    let last = row.length;
    while (last > 0 && row[last - 1] === ' ') last--;
    const segments: LiftSegment[] = [];
    let current: LiftKind = null;
    let buffer = '';
    const flush = (): void => {
      if (buffer !== '') segments.push({ text: buffer, kind: current });
      buffer = '';
    };
    for (let c = 0; c < last; c++) {
      const ch = row[c];
      const kind: LiftKind = isBoxGlyph(ch) ? 'line' : isArrowGlyph(ch) ? 'arrow' : kinds[r][c];
      if (buffer !== '' && kind !== current) flush();
      current = kind;
      buffer += ch;
    }
    flush();
    return segments;
  });

  const cards: LiftCard[] = [
    ...boxes,
    ...nodes.map(
      (n): LiftCard => ({ kind: 'node', r1: n.r1, c1: n.c1, r2: n.r2, c2: n.c2, widened: false }),
    ),
  ];
  return { rows, cards, width, height };
}

/** A misdetection guard: only text that holds at least one real `┌…┐└…┘` rectangle, or at least one
 * line made purely of box/arrow glyphs (a connector flow), is a diagram worth lifting. Plain prose
 * and code snippets are not. */
export function isLiftableDiagram(text: string): boolean {
  const figure = liftDiagram(text);
  if (figure === null) return false;
  if (figure.cards.some((card) => card.kind === 'box')) return true;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    let onlyGlyphs = true;
    for (const ch of trimmed) {
      if (ch !== ' ' && !isBoxGlyph(ch) && !isArrowGlyph(ch)) {
        onlyGlyphs = false;
        break;
      }
    }
    if (onlyGlyphs) return true;
  }
  return false;
}
