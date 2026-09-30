// Lifts an ASCII box-drawing diagram into a model the UI can draw as cards behind the author's own
// text (quick-260929-3x3, sketch 009 Diagram B "Lifted"; quick-260930-jzt reworked detection and
// clustering). It started as a port of the sketch's `liftModel()` (grid, box detection, border
// blanking, text runs, overrun widening, box-less node clustering) and `liftHTML()` (per-character
// kind classes to per-row segments); the DOM placement half of the sketch lives in
// `src/web/components/lifted-diagram.tsx`, which now only multiplies each card's `frame` by the
// measured character width and row height. No DOM, no Node APIs and no research-specific import —
// the lifted-figures-everywhere todo reuses this unchanged for every document.
//
// Box detection follows hand-drawn drift instead of trusting a fixed rectangle:
//  - the left edge and the right edge are each walked row by row (a progressive walk: every row's
//    border is looked for around the previous row's border, offsets 0, +1, -1, +2, -2), so a right
//    edge that staircases a column or two per row is followed to its corner;
//  - an arrow drawn into a side (`►│`, `│◄`) stays an arrow — the side glyph next to it is the border;
//  - tree guides (`├─ name`, `└─ name`) are content, never a border and never a corner;
//  - an open-left outer box (a top edge and a right edge and a bottom-right corner, no left edge) is
//    accepted when its shape rules out a connector: a `┘` with a run of `─` to its left that does not
//    start at an arrow, nothing but a plain cell under the `┌`, and at least 3 rows. Its left edge is
//    taken from the boxes nested inside it;
//  - box cards are ordered outer before inner, so the DOM paints nested cards over their container.
//
// Box-less diagrams cluster text runs into step cards: every run gets a role (note, step start, edge
// label, pointer note, trunk-side detail, ...). A detail line beside or under a step (indented under
// it, or hanging off the `│` trunk that leaves it) joins that step as sub text; asides beyond the card
// and edge labels stay notes. Steps stacked in one column get a spacer display row between them and
// a padded, clamped frame the component draws as-is: `rows`, `height` and every card's r1/r2 are
// display rows (a boxed figure has no spacers, so its display rows are its source rows).
//
// T-3x3-02 / T-jzt-01: input over LIFT_MAX_ROWS lines or LIFT_MAX_COLS columns, an absurd box or node
// count, or a walk-probe budget spent returns null so the caller renders plain text; every scan is a
// bounded pass over the grid and no pass nests a full-grid scan inside a per-card loop.

const BOX = '─│┌┐└┘├┤┬┴┼';
const ARROWS = '▼▲►◄→←↑↓';
const TOP_EDGE = '─┬┴┼';
const SIDE_EDGE = '│├┤┼';
/** An arrow drawn into a box's side sits where the border would. */
const SIDE_ARROW = '►◄';
/** Glyphs that continue a vertical line downward / upward (for spacer rows between steps). */
const DOWN_GLYPHS = '│├┤┼┬┌┐';
const UP_GLYPHS = '│├┤┼┴└┘▼';

/** The columns a hand-drawn border may drift per row, in the order they are tried. */
const DRIFT = [0, 1, -1, 2, -2];
/** How far the bottom-right `┘` may sit from the top-right `┐` when the walk ended elsewhere. */
const RAGGED_TOLERANCE = 3;

export const LIFT_MAX_ROWS = 250;
export const LIFT_MAX_COLS = 300;
/** More boxes than this in one figure is not a diagram — render it as plain text. */
const MAX_BOXES = 500;
/** More step nodes than this is not a flow diagram either. */
const MAX_NODES = 500;
/** Every edge-walk step across the whole figure draws on this budget (T-jzt-01). */
const PROBE_BUDGET = 500_000;

export type LiftKind = 'line' | 'arrow' | 'node' | 'sub' | 'note' | null;

export interface LiftSegment {
  text: string;
  kind: LiftKind;
}

/** The rectangle a card is drawn as, in grid units (columns and display rows), padding and clamping
 * already applied. */
export interface LiftFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LiftCard {
  kind: 'box' | 'node';
  /** Grid coordinates, inclusive: display rows r1..r2, columns c1..c2. */
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  /** True when the box grew past its top-right corner (a drifting or text-pushed right edge). */
  widened: boolean;
  frame: LiftFrame;
}

export interface LiftedFigure {
  rows: LiftSegment[][];
  cards: LiftCard[];
  width: number;
  /** Display rows: the source rows plus any spacer rows. */
  height: number;
  /** The sorted display-row indices of inserted spacer rows (aria-hidden by the component). */
  spacers: number[];
}

interface Run {
  r: number;
  c1: number;
  c2: number;
  inBox: boolean;
  node: NodeAcc | null;
  /** Box-less only: text beside a trunk or an edge label, set as a muted note, never a node. */
  note?: boolean;
  /** Box-less only: the run hangs off a `│` trunk within 8 columns to its left. */
  trunk?: boolean;
  /** Box-less only: a note that ended up inside a step's rectangle and became its sub text. */
  swallowed?: boolean;
}

interface NodeAcc {
  id: number;
  r1: number;
  r2: number;
  c1: number;
  c2: number;
}

interface BoxGeometry {
  top: { start: number; end: number };
  bottom: { start: number; end: number };
  /** Per interior row (r1 + 1 .. r2 - 1): the border column found, or -1. */
  left: number[];
  right: number[];
  /** The open-left outer box has no left edge and the `┘` row may carry text inside it. */
  open: boolean;
  bottomText: boolean;
}

function isBoxGlyph(ch: string): boolean {
  return BOX.includes(ch);
}

function isArrowGlyph(ch: string): boolean {
  return ARROWS.includes(ch);
}

const isBlank = (ch: string | undefined): boolean => ch === undefined || ch === ' ';

/** Rewrites a plain-ASCII diagram's connectors (only when it has no box glyphs at all) into the
 * glyphs the lift understands, in place and width-preserving: a lone `|` → `│`, a lone `v`/`^`
 * under/over a vertical → `▼`/`▲`, a leading `->` / `-->` → `─►`, a `--label-->` edge → `──label─►`,
 * a free-standing `---->` → `───►`, and a `<-` pointer → `◄─`. A single `->` inside prose stays
 * text, so "session -> user_id" is still read as words. */
function normalizeAsciiConnectors(g: string[][]): void {
  for (const row of g) {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '|' && isBlank(row[c - 1]) && isBlank(row[c + 1])) row[c] = '│';
    }
  }
  for (let r = 0; r < g.length; r++) {
    const row = g[r];
    for (let c = 0; c < row.length; c++) {
      if (!isBlank(row[c - 1]) || !isBlank(row[c + 1])) continue;
      if (row[c] === 'v' && g[r - 1]?.[c] === '│') row[c] = '▼';
      else if (row[c] === '^' && g[r + 1]?.[c] === '│') row[c] = '▲';
    }
  }
  const paint = (row: string[], start: number, end: number): void => {
    for (let c = start; c < end; c++) if (row[c] === '-') row[c] = '─';
    if (row[end] === '>') row[end] = '►';
  };
  for (const row of g) {
    const line = row.join('');
    const lead = /^(\s*)(-+)>(?=\s)/.exec(line);
    if (lead) paint(row, lead[1].length, lead[1].length + lead[2].length);
    for (const m of line.matchAll(/(-{2,})([A-Za-z]{1,8})(-{2,})>/g)) {
      const start = m.index ?? 0;
      paint(row, start, start + m[1].length);
      paint(row, start + m[1].length + m[2].length, start + m[0].length - 1);
    }
    for (const m of line.matchAll(/(?<=\s)(-{2,})>(?=\s|$)/g)) {
      const start = m.index ?? 0;
      paint(row, start, start + m[1].length);
    }
    for (const m of line.matchAll(/(?<=^|\s)<(-+)(?=\s|$)/g)) {
      const start = m.index ?? 0;
      row[start] = '◄';
      for (let c = start + 1; c <= start + m[1].length; c++) row[c] = '─';
    }
  }
}

/** Splits one grid row into typed segments from its per-character kinds; trailing blanks are cut. */
function rowSegments(row: string[], kindRow: LiftKind[]): LiftSegment[] {
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
    const kind: LiftKind = isBoxGlyph(ch) ? 'line' : isArrowGlyph(ch) ? 'arrow' : kindRow[c];
    if (buffer !== '' && kind !== current) flush();
    current = kind;
    buffer += ch;
  }
  flush();
  return segments;
}

/** Lifts `text` into rows of typed segments plus the cards to draw behind them; `null` when the
 * figure exceeds the size, box, node or walk budgets. */
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
  if (!chars.some((row) => row.some(isBoxGlyph))) normalizeAsciiConnectors(g);

  let probes = 0;
  const overBudget = (): boolean => ++probes > PROBE_BUDGET;

  /** `├─ name` / `└─ name`: a tree guide, which is content — never a border or a corner. */
  const isGuide = (r: number, c: number): boolean => {
    const ch = at(r, c);
    return (ch === '├' || ch === '└') && at(r, c + 1) === '─' && at(r, c + 2) === ' ' && at(r, c + 3) !== ' ';
  };
  /** The first column of `anchor + {0, +1, -1, +2, -2}` that satisfies `ok`, or -1. */
  const drift = (anchor: number, ok: (c: number) => boolean): number => {
    for (const d of DRIFT) {
      const c = anchor + d;
      if (c >= 0 && ok(c)) return c;
    }
    return -1;
  };

  // Boxes: every `┌` whose top edge closes into a `┐` and whose edges close into a rectangle.
  const boxes: LiftCard[] = [];
  const geometry = new Map<LiftCard, BoxGeometry>();
  const openTops: { card: LiftCard; topStart: number }[] = [];
  const blankFrame: LiftFrame = { left: 0, top: 0, width: 0, height: 0 };
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (at(r, c) !== '┌') continue;
      let c2 = c + 1;
      while (c2 < width && TOP_EDGE.includes(at(r, c2))) c2++;
      if (at(r, c2) !== '┐') continue;

      // The left edge, walked down: each row's border may sit a column or two off the one above, and
      // an arrow may be drawn into the side.
      const leftBorder: number[] = [];
      let lc = c;
      let r2 = r + 1;
      let closed = false;
      while (r2 < height) {
        if (overBudget()) return null;
        const corner = drift(lc, (cc) => at(r2, cc) === '└' && !isGuide(r2, cc));
        if (corner >= 0) {
          lc = corner;
          closed = true;
          break;
        }
        let side = drift(lc, (cc) => SIDE_EDGE.includes(at(r2, cc)) && !isGuide(r2, cc));
        if (side < 0 && SIDE_ARROW.includes(at(r2, lc))) side = lc;
        if (side < 0) break;
        leftBorder.push(side);
        lc = side;
        r2++;
      }

      if (!closed) {
        const open = walkOpenLeft(r, c, c2);
        if (open === 'over') return null;
        if (open === null) continue;
        const card: LiftCard = {
          kind: 'box',
          r1: r,
          c1: c,
          r2: open.r2,
          c2: Math.max(c2, open.cb, open.maxBorder + (open.maxBorder > c2 ? 1 : 0)),
          widened: false,
          frame: blankFrame,
        };
        card.widened = card.c2 > c2;
        geometry.set(card, {
          top: { start: c, end: c2 },
          bottom: { start: open.runStart, end: open.cb },
          left: [],
          right: open.rows,
          open: true,
          bottomText: false,
        });
        openTops.push({ card, topStart: c });
        boxes.push(card);
        if (boxes.length > MAX_BOXES) return null;
        continue;
      }

      // …and the right edge, walked the same way from the top-right corner: the `┘` and each row's
      // border may sit a column or two off the one above.
      let cb = lc + 1;
      while (cb < width && TOP_EDGE.includes(at(r2, cb))) cb++;
      if (at(r2, cb) !== '┘') continue;
      const rightBorder: number[] = [];
      let anchor = c2;
      let right = Math.max(c2, cb);
      for (let rr = r + 1; rr < r2; rr++) {
        if (overBudget()) return null;
        let found = drift(anchor, (cc) => cc > c && SIDE_EDGE.includes(at(rr, cc)) && !isGuide(rr, cc));
        if (found < 0 && SIDE_ARROW.includes(at(rr, anchor))) found = anchor;
        rightBorder.push(found);
        if (found >= 0) {
          anchor = found;
          // A border pushed right of the corner: the card grows to the border's end + 1.
          if (found > c2) right = Math.max(right, found + 1);
        }
      }
      // The `┘` sits within 2 columns of where the walk ended, or within the old 3-column tolerance
      // of the top-right corner (a right edge that drifted out and the author closed back in).
      if (Math.abs(cb - anchor) > 2 && Math.abs(cb - c2) > RAGGED_TOLERANCE) continue;
      const left = Math.min(c, lc, ...leftBorder);
      const box: LiftCard = { kind: 'box', r1: r, c1: left, r2, c2: right, widened: right !== c2, frame: blankFrame };
      geometry.set(box, {
        top: { start: c, end: c2 },
        bottom: { start: lc, end: cb },
        left: leftBorder,
        right: rightBorder,
        open: false,
        bottomText: false,
      });
      boxes.push(box);
      if (boxes.length > MAX_BOXES) return null;
    }
  }

  /** Open-left outer box: the right edge only, walked down to a `┘` (see the file header). */
  function walkOpenLeft(
    r: number,
    c: number,
    c2: number,
  ): { r2: number; rows: number[]; cb: number; runStart: number; maxBorder: number } | 'over' | null {
    const under = at(r + 1, c);
    if (isBoxGlyph(under) || isArrowGlyph(under)) return null;
    let anchor = c2;
    let maxBorder = c2;
    const rows: number[] = [];
    for (let rr = r + 1; rr < height; rr++) {
      if (overBudget()) return 'over';
      const cb = drift(anchor, (cc) => at(rr, cc) === '┘');
      if (cb >= 0) {
        let k = cb - 1;
        while (k >= 0 && at(rr, k) === '─') k--;
        if (cb - 1 - k < 2 || isArrowGlyph(at(rr, k))) return null;
        if (rr - r + 1 < 3) return null;
        return { r2: rr, rows, cb, runStart: k + 1, maxBorder };
      }
      let side = drift(anchor, (cc) => cc > c && SIDE_EDGE.includes(at(rr, cc)) && !isGuide(rr, cc));
      if (side < 0 && SIDE_ARROW.includes(at(rr, anchor))) side = anchor;
      if (side < 0) return null;
      rows.push(side);
      anchor = side;
      if (side > maxBorder) maxBorder = side;
    }
    return null;
  }

  // Open-left boxes take their left edge from the closed boxes nested inside them, and count text on
  // their `┘` row as inside.
  for (const { card, topStart } of openTops) {
    const geo = geometry.get(card);
    if (!geo) continue;
    let left = topStart;
    for (const inner of boxes) {
      const innerGeo = geometry.get(inner);
      if (inner === card || !innerGeo || innerGeo.open) continue;
      if (inner.r1 > card.r1 && inner.r2 < card.r2 && inner.c2 < card.c2 && inner.c2 >= topStart && inner.c1 <= geo.top.end) {
        left = Math.min(left, inner.c1);
      }
    }
    card.c1 = left - 1;
    for (let x = card.c1 + 1; x < geo.bottom.start; x++) {
      const ch = at(card.r2, x);
      if (ch !== ' ' && !isBoxGlyph(ch) && !isArrowGlyph(ch)) {
        geo.bottomText = true;
        break;
      }
    }
  }

  // Outer before inner: later cards paint over earlier ones, so a container comes first.
  boxes.sort((a, b) => (b.c2 - b.c1) * (b.r2 - b.r1) - (a.c2 - a.c1) * (a.r2 - a.r1));

  const insideBox: boolean[][] = Array.from({ length: height }, () => new Array<boolean>(width).fill(false));
  for (const b of boxes) {
    const bottom = geometry.get(b)?.bottomText ? b.r2 + 1 : b.r2;
    for (let r = b.r1 + 1; r < bottom; r++) {
      for (let c = Math.max(0, b.c1 + 1); c < b.c2; c++) insideBox[r][c] = true;
    }
  }

  // Blank each box's border (the card draws it): the top and bottom edge runs outright, and on each
  // row only the left / right border glyph the walks found. Every other box glyph inside — tree
  // guides, `│` trunks — stays and renders as line. A row whose right border was not found blanks a
  // side glyph within 2 columns of where the previous border was.
  for (const b of boxes) {
    const geo = geometry.get(b);
    if (!geo) continue;
    for (let c = geo.top.start; c <= geo.top.end; c++) g[b.r1][c] = ' ';
    for (let c = geo.bottom.start; c <= geo.bottom.end; c++) g[b.r2][c] = ' ';
    let anchor = geo.top.end;
    for (let r = b.r1 + 1; r < b.r2; r++) {
      const lc = geo.left[r - b.r1 - 1];
      if (lc !== undefined && lc >= 0 && isBoxGlyph(g[r][lc])) g[r][lc] = ' ';
      const rc = geo.right[r - b.r1 - 1];
      if (rc >= 0) {
        if (isBoxGlyph(g[r][rc])) g[r][rc] = ' ';
        anchor = rc;
      } else {
        for (const d of DRIFT) {
          const cc = anchor + d;
          if (cc >= 0 && cc < width && SIDE_EDGE.includes(g[r][cc]) && !isGuide(r, cc)) {
            g[r][cc] = ' ';
            break;
          }
        }
      }
    }
  }

  // Text runs: split on 2+ spaces, on a box glyph, or on an arrow outside brackets.
  const runs: Run[] = [];
  const runsByRow: Run[][] = Array.from({ length: height }, () => []);
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
          // Two spaces end a run; inside brackets it takes three, so a bracket that only closes on
          // the next row (a wrapped box label) can't swallow text further along its own row.
          if ((gap >= 2 && depth === 0) || gap >= 3) break;
        } else gap = 0;
        e++;
      }
      let end = e;
      while (end > c && g[r][end - 1] === ' ') end--;
      const run: Run = { r, c1: c, c2: end - 1, inBox: insideBox[r][c], node: null };
      runs.push(run);
      runsByRow[r].push(run);
      c = e;
    }
  }

  // A source line that overruns its box by a char or two (e.g. BROADCAST BUS) widens that box only.
  for (const b of boxes) {
    const c0 = b.c2;
    for (let r = b.r1 + 1; r < b.r2; r++) {
      for (const run of runsByRow[r]) {
        if (run.c1 > b.c1 && run.c1 < c0 && run.c2 >= c0 && run.c2 <= c0 + 2) {
          b.c2 = Math.max(b.c2, run.c2 + 2);
        }
      }
    }
    if (b.c2 !== c0) b.widened = true;
    for (let r = b.r1 + 1; r < b.r2; r++) {
      for (let c = c0 + 1; c <= b.c2; c++) if (c < width && isBoxGlyph(g[r][c])) g[r][c] = ' ';
    }
  }

  // Box-less diagrams: step cards (see the file header).
  const nodes: NodeAcc[] = [];
  if (boxes.length === 0) {
    /** Only line/arrow glyphs before column `to`, ending in ─…► or → (a step's lead-in). */
    const ledByArrow = (row: string[], to: number): boolean => {
      let x = to - 1;
      while (x >= 0 && row[x] === ' ') x--;
      if (x < 0 || (row[x] !== '►' && row[x] !== '→')) return false;
      for (x--; x >= 0; x--) if (row[x] !== '─' && row[x] !== ' ') return false;
      return true;
    };
    /** The non-blank text before `to` ends in a `◄─` pointer (and is longer than the pointer alone). */
    const afterPointer = (row: string[], to: number): boolean => {
      let x = to - 1;
      let length = 0;
      for (; x >= 0; x--) {
        if (row[x] === ' ') continue;
        if (row[x] !== '─') break;
        length++;
      }
      if (x < 0 || row[x] !== '◄') return false;
      length++;
      for (x--; x >= 0 && length <= 2; x--) if (row[x] !== ' ') length++;
      return length > 2;
    };
    /** Nodes that may still take detail lines: touched on the previous row, or kept open by a row
     * of nothing but their trunk and trunk-side runs. */
    let alive: NodeAcc[] = [];
    const absorb = (run: Run, node: NodeAcc, trunk: number): void => {
      node.r2 = run.r;
      node.c1 = Math.min(node.c1, run.c1, trunk >= 0 ? trunk : run.c1);
      node.c2 = Math.max(node.c2, run.c2, trunk >= 0 ? trunk : run.c2);
      run.node = node;
    };
    for (let r = 0; r < height; r++) {
      const row = g[r];
      const touched = new Set<NodeAcc>();
      const above = alive.filter((n) => n.r2 === r - 1);
      const firstInk = row.findIndex((ch) => ch !== ' ');
      let hostOfRow: NodeAcc | null = null;
      let previous: Run | null = null;
      for (const run of runsByRow[r]) {
        const hasLead = firstInk < run.c1;
        const prior = previous;
        previous = run;
        // 1. after a note on the same row: a note.
        if (prior?.note) {
          run.note = true;
          continue;
        }
        // 2. only line/arrow glyphs before it and led by ─…► or →: a new step.
        if (ledByArrow(row, run.c1)) {
          const node: NodeAcc = { id: nodes.length, r1: r, r2: r, c1: run.c1, c2: run.c2 };
          nodes.push(node);
          if (nodes.length > MAX_NODES) return null;
          run.node = node;
          touched.add(node);
          continue;
        }
        // 3. a short label between two ─ segments: an edge label.
        if (run.c2 - run.c1 < 8 && row[run.c1 - 1] === '─' && row[run.c2 + 1] === '─') {
          run.note = true;
          continue;
        }
        // 4. text a `◄─` pointer hangs off.
        if (afterPointer(row, run.c1)) {
          run.note = true;
          continue;
        }
        // 5. trunk-side: the nearest non-blank to its left is a `│` within 8 columns.
        let x = run.c1 - 1;
        while (x >= 0 && row[x] === ' ') x--;
        const trunk = x >= 0 && row[x] === '│' && run.c1 - x <= 8 ? x : -1;
        if (trunk >= 0) {
          run.trunk = true;
          let host: NodeAcc | undefined;
          for (const n of alive) if (trunk >= n.c1 - 2 && trunk <= n.c2 + 2) host = n;
          if (!host) {
            run.note = true;
          } else {
            absorb(run, host, trunk);
            touched.add(host);
            hostOfRow = host;
          }
          continue;
        }
        // …a later run on a row that already absorbed a detail joins it when it starts inside.
        if (hostOfRow) {
          if (run.c1 >= hostOfRow.c1 && run.c1 <= hostOfRow.c2) {
            absorb(run, hostOfRow, -1);
          } else run.note = true;
          continue;
        }
        // 6. it starts inside the column span of a node that ended on the row above: sub text of it,
        // even when it opens with a bracket.
        // A run that follows a step's own heading on its row is that step's aside, not a detail line
        // of the step above.
        const headsRow = prior?.node != null && prior.node.r1 === r;
        const inside = headsRow ? undefined : above.find((n) => run.c1 >= n.c1 && run.c1 <= n.c2);
        // Joining would stretch the step across another step that ended on the row above: the line
        // is then an aside, not a detail, so two cards never overlap.
        const straddles = (host: NodeAcc): boolean => {
          const lo = Math.min(host.c1, run.c1);
          const hi = Math.max(host.c2, run.c2);
          return above.some((n) => n !== host && n.c1 <= hi && n.c2 >= lo);
        };
        if (inside) {
          if (straddles(inside)) {
            run.note = true;
          } else {
            absorb(run, inside, -1);
            touched.add(inside);
          }
          continue;
        }
        // 7. a bracketed aside further along a row.
        if (hasLead && (row[run.c1] === '(' || row[run.c1] === '[')) {
          run.note = true;
          continue;
        }
        // 8. otherwise the column-overlap merge, or a new node.
        const match = above.find((n) => run.c1 <= n.c2 + 1 && run.c2 >= n.c1 - 1);
        if (match) {
          if (straddles(match)) {
            run.note = true;
          } else {
            absorb(run, match, -1);
            touched.add(match);
          }
        } else {
          const node: NodeAcc = { id: nodes.length, r1: r, r2: r, c1: run.c1, c2: run.c2 };
          nodes.push(node);
          if (nodes.length > MAX_NODES) return null;
          run.node = node;
          touched.add(node);
        }
      }
      // Which nodes may take detail lines on the next row: those touched now, and those whose
      // window on this row held nothing but their trunk and trunk-side runs (an arrow, a blank row
      // or any other text closes them).
      const next: NodeAcc[] = [];
      for (const n of alive) {
        if (touched.has(n)) continue;
        const lo = Math.max(0, n.c1 - 2);
        const hi = Math.min(width - 1, n.c2 + 2);
        let trunkSeen = false;
        let clean = true;
        for (let c = lo; c <= hi && clean; c++) {
          const ch = row[c];
          if (ch === ' ') continue;
          if (ch === '│') trunkSeen = true;
          else if (isBoxGlyph(ch) || isArrowGlyph(ch)) clean = false;
        }
        if (clean) {
          for (const run of runsByRow[r]) {
            if (run.c2 < lo || run.c1 > hi) continue;
            if (run.trunk) trunkSeen = true;
            else clean = false;
          }
        }
        if (clean && trunkSeen) next.push(n);
      }
      for (const n of touched) next.push(n);
      alive = next;
    }

    // A card never draws over a note: any note wholly inside a node's rectangle joins it as sub text.
    const nodesByRow: NodeAcc[][] = Array.from({ length: height }, () => []);
    for (const n of nodes) for (let r = n.r1; r <= n.r2; r++) nodesByRow[r].push(n);
    for (const run of runs) {
      if (!run.note) continue;
      const host = nodesByRow[run.r].find((n) => run.c1 >= n.c1 && run.c2 <= n.c2);
      if (host) {
        run.note = false;
        run.node = host;
        run.swallowed = true;
      }
    }
  }

  // Spacers: one blank display row before a step that starts directly under a different step whose
  // columns overlap it, so stacked cards keep a gap. `disp[r]` maps a source row to its display row.
  const spacerBefore = new Set<number>();
  if (nodes.length > 0) {
    const endsAt = new Map<number, NodeAcc[]>();
    for (const n of nodes) {
      const list = endsAt.get(n.r2);
      if (list) list.push(n);
      else endsAt.set(n.r2, [n]);
    }
    for (const n of nodes) {
      const previous = endsAt.get(n.r1 - 1);
      if (previous?.some((p) => p !== n && n.c1 <= p.c2 + 1 && p.c1 <= n.c2 + 1)) spacerBefore.add(n.r1);
    }
  }
  const disp: number[] = new Array<number>(height);
  const spacers: number[] = [];
  for (let r = 0, offset = 0; r < height; r++) {
    if (spacerBefore.has(r)) {
      offset++;
      spacers.push(r + offset - 1);
    }
    disp[r] = r + offset;
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
    } else if (run.note) {
      kind = 'note';
    } else if (run.node) {
      kind = run.node.r1 === run.r && !run.swallowed ? 'node' : 'sub';
    } else {
      kind = boxes.length > 0 ? 'note' : 'node';
    }
    for (let c = run.c1; c <= run.c2; c++) kinds[run.r][c] = kind;
  }

  const blankKinds: LiftKind[] = new Array<LiftKind>(width).fill(null);
  const rows: LiftSegment[][] = [];
  for (let r = 0; r < height; r++) {
    if (spacerBefore.has(r)) {
      const bridge = g[r].map((_, c) => (DOWN_GLYPHS.includes(at(r - 1, c)) && UP_GLYPHS.includes(at(r, c)) ? '│' : ' '));
      rows.push(rowSegments(bridge, blankKinds));
    }
    rows.push(rowSegments(g[r], kinds[r]));
  }

  // Frames. A box card is drawn through the middle of its border cells; an open-left box grows to
  // hold text on its `┘` row.
  for (const b of boxes) {
    const bottom = geometry.get(b)?.bottomText ? b.r2 + 1.25 : b.r2 + 0.5;
    b.frame = { left: b.c1 + 0.5, top: b.r1 + 0.5, width: b.c2 - b.c1, height: bottom - (b.r1 + 0.5) };
  }

  const cards: LiftCard[] = [...boxes];
  if (nodes.length > 0) {
    interface Box {
      left: number;
      top: number;
      right: number;
      bottom: number;
    }
    const frames: Box[] = nodes.map((n) => {
      // Padded: 1 column each side, a quarter row above and below; then kept a quarter column clear
      // of any other glyph on the node's rows, never letting the padding drop below zero.
      let left = n.c1 - 1;
      let right = n.c2 + 2;
      for (let r = n.r1; r <= n.r2; r++) {
        let x = n.c1 - 1;
        while (x >= 0 && g[r][x] === ' ') x--;
        if (x >= 0) left = Math.max(left, x + 1.25);
        x = n.c2 + 1;
        while (x < width && g[r][x] === ' ') x++;
        if (x < width) right = Math.min(right, x - 0.25);
      }
      return {
        left: Math.min(n.c1, left),
        top: disp[n.r1] - 0.25,
        right: Math.max(n.c2 + 1, right),
        bottom: disp[n.r2] + 1.25,
      };
    });
    const count = nodes.length;

    // Stacked steps in one column whose text starts within 2 columns of each other share the
    // smallest left edge.
    const parent = Array.from({ length: count }, (_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (Math.abs(a.c1 - b.c1) > 2) continue;
        if (a.r2 >= b.r1 && b.r2 >= a.r1) continue;
        if (a.c1 > b.c2 || b.c1 > a.c2) continue;
        parent[find(i)] = find(j);
      }
    }
    const groupLeft = new Map<number, number>();
    for (let i = 0; i < count; i++) {
      const root = find(i);
      groupLeft.set(root, Math.min(groupLeft.get(root) ?? Infinity, frames[i].left));
    }
    for (let i = 0; i < count; i++) frames[i].left = Math.min(nodes[i].c1, groupLeft.get(find(i)) ?? frames[i].left);

    // Keep frames apart: 0.5 column between frames that share rows, 0.5 row between frames that share
    // columns. Padding is given up (never below the text itself), on the axis with the smaller
    // shortfall; when neither axis can make the gap, both give up all their padding — two steps whose
    // text interleaves can only be pulled as close to disjoint as their text allows.
    const split = (availA: number, availB: number, take: number): [number, number] => {
      let fromB = Math.min(availB, take / 2);
      const fromA = Math.min(availA, take - fromB);
      fromB = Math.min(availB, take - fromA);
      return [fromA, fromB];
    };
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = frames[i];
        const b = frames[j];
        const gapX = Math.max(b.left - a.right, a.left - b.right);
        const gapY = Math.max(b.top - a.bottom, a.top - b.bottom);
        if (!(gapX < 0.5 && gapY < 0.5 && (gapX < 0 || gapY < 0))) continue;
        const [first, second] = a.left <= b.left ? [i, j] : [j, i];
        const [upper, lower] = a.top <= b.top ? [i, j] : [j, i];
        const padRight = Math.max(0, frames[first].right - (nodes[first].c2 + 1));
        const padLeft = Math.max(0, nodes[second].c1 - frames[second].left);
        const padBottom = Math.max(0, frames[upper].bottom - (disp[nodes[upper].r2] + 1));
        const padTop = Math.max(0, disp[nodes[lower].r1] - frames[lower].top);
        const needX = 0.5 - gapX;
        const needY = 0.5 - gapY;
        const feasibleX = needX <= padRight + padLeft;
        const feasibleY = needY <= padBottom + padTop;
        const shrinkX = feasibleX && (!feasibleY || needX <= needY);
        const shrinkY = feasibleY && !shrinkX;
        if (shrinkX || (!shrinkY && !feasibleY)) {
          const [fromFirst, fromSecond] = split(padRight, padLeft, needX);
          frames[first].right -= fromFirst;
          frames[second].left += fromSecond;
        }
        if (shrinkY || (!shrinkX && !feasibleX)) {
          const [fromUpper, fromLower] = split(padBottom, padTop, needY);
          frames[upper].bottom -= fromUpper;
          frames[lower].top += fromLower;
        }
      }
    }

    nodes.forEach((n, i) => {
      const f = frames[i];
      cards.push({
        kind: 'node',
        r1: disp[n.r1],
        c1: n.c1,
        r2: disp[n.r2],
        c2: n.c2,
        widened: false,
        frame: { left: f.left, top: f.top, width: f.right - f.left, height: f.bottom - f.top },
      });
    });
  }

  return { rows, cards, width, height: rows.length, spacers };
}

/** A misdetection guard: only text that holds at least one real `┌…┐└…┘` rectangle, or at least one
 * line made purely of box/arrow glyphs (a connector flow), is a diagram worth lifting. Plain prose
 * and code snippets are not. */
export function isLiftableDiagram(text: string): boolean {
  const figure = liftDiagram(text);
  if (figure === null) return false;
  if (figure.cards.some((card) => card.kind === 'box')) return true;
  // A step list whose connectors are leading arrows (`-> step`) has no glyph-only line, but two or
  // more nodes joined by arrow glyphs is still a flow.
  const hasArrow = figure.rows.some((row) => row.some((segment) => segment.kind === 'arrow'));
  if (hasArrow && figure.cards.filter((card) => card.kind === 'node').length >= 2) return true;
  for (const line of figure.rows.map((row) => row.map((segment) => segment.text).join(''))) {
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
