// The overlap drawing's geometry (Phase 10, 10-22, sketch 052 winner A): pure arithmetic from the figure's measured width to
// circle, label and square positions. One to three circles, one per substantive reviewer; each concern is a square placed in
// the region of the reviewers who raised it (a bit mask over the circles, bit i set when circle i raised it): the agreed ones
// large in the overlaps, the single-reviewer ones small at each circle's own edge. A failed or skipped lane is a small empty
// dashed circle off to the side. The drawing is laid out in a 600 by 480 box and scaled to the real width after layout, so
// the labels (set in CSS at the page's own sizes) keep their size at 390. No DOM, no state.

export interface OverlapMark {
  /** A key the components pass back on selection ("a0", "c3"). */
  id: string;
  /** Bit i set when circle i's reviewer raised the concern. */
  mask: number;
  /** An agreed concern: drawn large and numbered. */
  large: boolean;
  /** "A1" for an agreed concern, else null. */
  no: string | null;
}

export interface OverlapSquare {
  id: string;
  x: number;
  y: number;
  size: number;
  large: boolean;
  /** The number's x and y, set beside a large square; null for a small one. */
  noX: number | null;
  noY: number | null;
  no: string | null;
}

export interface OverlapCircle {
  cx: number;
  cy: number;
  r: number;
  /** Where the circle's name is drawn. */
  labelX: number;
  labelY: number;
  anchor: 'start' | 'middle' | 'end';
}

export interface OverlapLayout {
  width: number;
  height: number;
  circles: OverlapCircle[];
  /** The empty dashed circles of lanes that did not run, with the name's position. */
  absent: { cx: number; cy: number; r: number; labelX: number; labelY: number }[];
  squares: OverlapSquare[];
}

const BASE_WIDTH = 600;
const BASE_HEIGHT = 480;

interface Venn {
  c: readonly (readonly [number, number])[];
  r: number;
  lab: readonly (readonly [number, number, 'start' | 'middle' | 'end'])[];
  at: ReadonlyMap<number, readonly [number, number]>;
}

const VENN: ReadonlyMap<number, Venn> = new Map([
  [
    1,
    {
      c: [[300, 215]],
      r: 170,
      lab: [[300, 26, 'middle']],
      at: new Map([[1, [300, 215] as const]]),
    },
  ],
  [
    2,
    {
      c: [
        [225, 215],
        [375, 215],
      ],
      r: 150,
      lab: [
        [150, 50, 'middle'],
        [450, 50, 'middle'],
      ],
      at: new Map([
        [1, [140, 215] as const],
        [2, [460, 215] as const],
        [3, [300, 215] as const],
      ]),
    },
  ],
  [
    3,
    {
      c: [
        [230, 180],
        [370, 180],
        [300, 300],
      ],
      r: 140,
      lab: [
        [96, 40, 'start'],
        [504, 40, 'end'],
        [300, 464, 'middle'],
      ],
      at: new Map([
        [1, [160, 140] as const],
        [2, [440, 140] as const],
        [4, [300, 385] as const],
        [3, [300, 125] as const],
        [5, [222, 278] as const],
        [6, [378, 278] as const],
        [7, [300, 222] as const],
      ]),
    },
  ],
]);

/** The bit mask of a set of circle positions. */
export function maskOf(positions: readonly number[]): number {
  let mask = 0;
  for (const p of positions) mask |= 1 << p;
  return mask;
}

/** Lays the drawing out at `width` pixels: `circleCount` (1 to 3) circles, `absentCount` empty dashed circles off to the side,
 * and the marks as squares in their regions. A mark whose region the layout has no place for is left out. */
export function layoutOverlap(width: number, circleCount: number, marks: readonly OverlapMark[], absentCount: number): OverlapLayout {
  const venn = VENN.get(circleCount);
  const w = Number.isFinite(width) && width > 0 ? width : BASE_WIDTH;
  const k = w / BASE_WIDTH;
  const height = Math.round(BASE_HEIGHT * k);
  if (venn === undefined) return { width: w, height, circles: [], absent: [], squares: [] };
  const P = (v: number): number => v * k;
  const circles: OverlapCircle[] = venn.c.map(([cx, cy], i) => ({
    cx: P(cx),
    cy: P(cy),
    r: P(venn.r),
    labelX: P(venn.lab[i][0]),
    labelY: P(venn.lab[i][1]),
    anchor: venn.lab[i][2],
  }));
  const absent: OverlapLayout['absent'] = [];
  for (let i = 0; i < absentCount && i < 3; i += 1) {
    const cx = P(548);
    const cy = P(392 - i * 90);
    absent.push({ cx, cy, r: P(34), labelX: cx, labelY: cy + P(34) + 14 });
  }
  const big = Math.max(18, 28 * k);
  const small = Math.max(12, 18 * k);
  const gap = Math.max(5, 7 * k);
  const squares: OverlapSquare[] = [];
  const regions = new Map<number, OverlapMark[]>();
  for (const mark of marks) {
    const list = regions.get(mark.mask);
    if (list === undefined) regions.set(mark.mask, [mark]);
    else list.push(mark);
  }
  for (const [mask, items] of regions) {
    const at = venn.at.get(mask);
    if (at === undefined) continue;
    const perRow = 3;
    const rows: OverlapMark[][] = [];
    for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));
    rows.forEach((row, ri) => {
      const larges = row.filter((m) => m.large).length;
      const rowW = row.reduce((sum, m) => sum + (m.large ? big : small) + gap, -gap) + 22 * larges;
      let x = P(at[0]) - rowW / 2;
      const y = P(at[1]) - (rows.length * (big + gap)) / 2 + ri * (big + gap);
      for (const m of row) {
        const size = m.large ? big : small;
        const top = y + (big - size) / 2;
        squares.push({
          id: m.id,
          x,
          y: top,
          size,
          large: m.large,
          noX: m.large ? x + size + 4 : null,
          noY: m.large ? y + big / 2 + 4 : null,
          no: m.no,
        });
        x += size + gap + (m.large ? 22 : 0);
      }
    });
  }
  return { width: w, height, circles, absent, squares };
}
