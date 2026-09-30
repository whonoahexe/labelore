// Lanes-by-kind layout for a DiagramGraph (quick-260930-mp6, sketch 012 B): a pure port of the lanes
// branch of the sketch's layout() and route(), plus the width cap the build needs (K-width). One column
// (lane) per node kind present, in LANE_ORDER; layers follow the author's rows; nodes of one kind in one
// layer sit side by side inside their lane, and wrap into further rows when the width budget cannot
// afford that many columns. Wires are orthogonal with rounded elbows; every coordinate is a number the
// component turns into svg path data, so no author text ever reaches geometry (T-mp6-02). Pure and
// deterministic: no DOM, no Node API, nothing research-specific.
import type { DiagramGraph, DiagramKind } from './ascii-graph.ts';

/** The lane order: a step node sits in the service lane. */
export const LANE_ORDER = ['client', 'edge', 'service', 'worker', 'channel', 'data', 'external'] as const;
export type LaneKind = (typeof LANE_ORDER)[number];

/** The frame body's content width at 1440px (982px body, 20px padding each side). */
export const DEFAULT_BUDGET = 940;

export const NODE_MAX_W = 196;
export const NODE_COMFORT_W = 160;
export const NODE_MIN_W = 128;
export const NODE_H = 58;
export const LANE_PAD = 8;
export const COL_GAP = 12;
export const ROW_GAP = 12;
export const LAYER_GAP = 40;
export const LABEL_GAP = 22;
export const TOP = 44;
export const BOTTOM = 12;
export const ELBOW_R = 7;
export const LABEL_MAX_W = 240;

export interface LayoutLane {
  kind: LaneKind;
  x: number;
  width: number;
  shaded: boolean;
  /** True when the lane holds a step node (its head reads "Service & steps"). */
  steps: boolean;
}

export interface LayoutNode {
  /** The node's index in graph.nodes. */
  id: number;
  x: number;
  y: number;
  /** Index into LayoutResult.lanes. */
  lane: number;
  layer: number;
  /** The row within its layer (0 unless the lane wrapped). */
  row: number;
}

export interface LayoutTip {
  x: number;
  y: number;
  dir: 'u' | 'd' | 'l' | 'r';
}

export interface LayoutWire {
  from: number;
  to: number;
  d: string;
  tip: LayoutTip;
  label: string;
  labelAt: { x: number; y: number; maxWidth: number };
  directed: boolean;
}

export interface LayoutGroup {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  /** True when the width budget forced narrow nodes (short subtitles). */
  compact: boolean;
  lanes: LayoutLane[];
  nodes: LayoutNode[];
  wires: LayoutWire[];
  groups: LayoutGroup[];
}

const round = (n: number): number => Math.round(n * 10) / 10;

function laneOf(kind: DiagramKind): LaneKind {
  return kind === 'step' ? 'service' : kind;
}

interface Layer {
  row: number;
  ids: number[];
  y: number;
  height: number;
  rows: number;
}

/** Node width for a per-lane column cap: the budget less lane padding and column gaps, over the columns. */
function widthFor(counts: number[], cap: number, budget: number): number {
  let overhead = 0;
  let cols = 0;
  for (const count of counts) {
    const c = Math.min(count, cap);
    overhead += 2 * LANE_PAD + (c - 1) * COL_GAP;
    cols += c;
  }
  return Math.floor((budget - overhead) / Math.max(1, cols));
}

export function layoutLanes(graph: DiagramGraph, budget: number = DEFAULT_BUDGET): LayoutResult {
  const nodes = graph.nodes;
  // Layers come from the author's rows: a node whose title row is at most one row below the layer's
  // first title row joins that layer.
  const order = nodes.map((n) => n.id).sort((a, b) => nodes[a].row - nodes[b].row || nodes[a].col - nodes[b].col);
  const layers: Layer[] = [];
  const layerOf = new Array<number>(nodes.length).fill(0);
  for (const id of order) {
    const last = layers[layers.length - 1];
    if (last && nodes[id].row <= last.row + 1) last.ids.push(id);
    else layers.push({ row: nodes[id].row, ids: [id], y: 0, height: 0, rows: 1 });
    layerOf[id] = layers.length - 1;
  }

  const present = LANE_ORDER.filter((kind) => nodes.some((n) => laneOf(n.kind) === kind));
  const laneIndex = (id: number): number => present.indexOf(laneOf(nodes[id].kind));

  // The widest per-layer count of each lane.
  const counts = present.map(() => 1);
  for (const layer of layers) {
    const tally = new Map<number, number>();
    for (const id of layer.ids) {
      const l = laneIndex(id);
      const n = (tally.get(l) ?? 0) + 1;
      tally.set(l, n);
      counts[l] = Math.max(counts[l], n);
    }
  }

  // The per-lane column cap: uncapped, then 2, then 1 — the first whose nodes are comfortable wins.
  const uncapped = Math.max(1, ...counts);
  const caps = [uncapped, 2, 1].filter((k, i, all) => k <= uncapped && all.indexOf(k) === i);
  let cap = 1;
  let nodeWidth = 0;
  let compact = false;
  let chosen = false;
  for (const k of caps) {
    const w = widthFor(counts, k, budget);
    if (w >= NODE_COMFORT_W) {
      cap = k;
      nodeWidth = Math.min(NODE_MAX_W, w);
      chosen = true;
      break;
    }
  }
  if (!chosen) {
    cap = 1;
    nodeWidth = Math.max(NODE_MIN_W, widthFor(counts, 1, budget));
    compact = true;
  }

  // Lanes, left to right.
  const cols = counts.map((c) => Math.min(c, cap));
  const lanes: LayoutLane[] = [];
  let acc = 0;
  present.forEach((kind, i) => {
    const width = 2 * LANE_PAD + cols[i] * nodeWidth + (cols[i] - 1) * COL_GAP;
    lanes.push({
      kind,
      x: acc,
      width,
      shaded: i % 2 === 0,
      steps: nodes.some((n) => n.kind === 'step' && laneOf(n.kind) === kind),
    });
    acc += width;
  });
  const width = acc;

  // Rows within each layer: the nodes of one lane and layer fill its columns left to right, then wrap.
  const placed: LayoutNode[] = nodes.map((n) => ({ id: n.id, x: 0, y: 0, lane: laneIndex(n.id), layer: layerOf[n.id], row: 0 }));
  for (const layer of layers) {
    const perLane = new Map<number, number[]>();
    for (const id of [...layer.ids].sort((a, b) => nodes[a].col - nodes[b].col)) {
      const l = laneIndex(id);
      perLane.set(l, [...(perLane.get(l) ?? []), id]);
    }
    let rows = 1;
    perLane.forEach((ids, l) => {
      ids.forEach((id, k) => {
        placed[id].row = Math.floor(k / cols[l]);
        placed[id].x = lanes[l].x + LANE_PAD + (k % cols[l]) * (nodeWidth + COL_GAP);
      });
      rows = Math.max(rows, Math.ceil(ids.length / cols[l]));
    });
    layer.rows = rows;
    layer.height = rows * NODE_H + (rows - 1) * ROW_GAP;
  }

  // y: each layer is as tall as its tallest lane, plus room for the labels leaving it.
  let y = TOP;
  layers.forEach((layer, i) => {
    layer.y = y;
    for (const id of layer.ids) placed[id].y = y + placed[id].row * (NODE_H + ROW_GAP);
    const labelled = graph.edges.some((e) => e.label !== '' && layer.ids.includes(e.from));
    y += layer.height + (i < layers.length - 1 ? LAYER_GAP + (labelled ? LABEL_GAP : 0) : 0);
  });
  const height = layers.length === 0 ? TOP + BOTTOM : y + BOTTOM;

  const wires = graph.edges.flatMap((e) => routeWire(e, placed, layers, nodeWidth, width, graph));
  const groups: LayoutGroup[] = [];
  graph.groups.forEach((group) => {
    const members = placed.filter((p) => nodes[p.id].group === group.id);
    if (members.length === 0) return;
    const x1 = Math.max(0, Math.min(...members.map((m) => m.x)) - 12);
    const x2 = Math.min(width, Math.max(...members.map((m) => m.x + nodeWidth)) + 12);
    const y1 = Math.max(TOP - 16, Math.min(...members.map((m) => m.y)) - 30);
    const y2 = Math.min(height, Math.max(...members.map((m) => m.y + NODE_H)) + 12);
    groups.push({
      id: group.id,
      label: group.label.sub ? `${group.label.main} · ${group.label.sub}` : group.label.main,
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
    });
  });

  return { width, height, nodeWidth, nodeHeight: NODE_H, compact, lanes, nodes: placed, wires, groups };
}

/** A polyline with rounded elbows (radius ELBOW_R, shrunk to fit short segments). */
function elbow(points: [number, number][]): string {
  let d = `M${round(points[0][0])},${round(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const r = Math.min(ELBOW_R, Math.hypot(cx - px, cy - py) / 2, Math.hypot(nx - cx, ny - cy) / 2);
    const ux = Math.sign(cx - px);
    const uy = Math.sign(cy - py);
    const vx = Math.sign(nx - cx);
    const vy = Math.sign(ny - cy);
    d += `L${round(cx - ux * r)},${round(cy - uy * r)}Q${round(cx)},${round(cy)} ${round(cx + vx * r)},${round(cy + vy * r)}`;
  }
  const last = points[points.length - 1];
  return `${d}L${round(last[0])},${round(last[1])}`;
}

function routeWire(
  e: DiagramGraph['edges'][number],
  placed: LayoutNode[],
  layers: Layer[],
  nw: number,
  width: number,
  graph: DiagramGraph,
): LayoutWire[] {
  const a = placed[e.from];
  const b = placed[e.to];
  if (!a || !b) return [];
  const anchor = (x: number, y: number, maxWidth = LABEL_MAX_W): LayoutWire['labelAt'] => {
    const ax = Math.max(0, Math.min(x, width - 40));
    return { x: round(ax), y: round(y), maxWidth: Math.max(0, Math.min(maxWidth, width - ax)) };
  };
  const wire = (d: string, tip: LayoutTip, at: { x: number; y: number }): LayoutWire[] => [
    { from: e.from, to: e.to, d, tip: { x: round(tip.x), y: round(tip.y), dir: tip.dir }, label: e.label, labelAt: anchor(at.x, at.y), directed: e.directed },
  ];

  // Same row: side to side at mid height.
  if (a.y === b.y) {
    const lr = a.x < b.x;
    const sx = lr ? a.x + nw : a.x;
    const tx = lr ? b.x : b.x + nw;
    const yy = a.y + NODE_H / 2;
    return wire(`M${round(sx)},${round(yy)}L${round(tx)},${round(yy)}`, { x: tx, y: yy, dir: lr ? 'r' : 'l' }, { x: Math.min(sx, tx) + 4, y: yy - 16 });
  }

  // Target below: out of the source's bottom centre, across at the middle of the gap under the
  // source's row, and into the target's top. Several incoming wires spread over +-30% of the width.
  if (b.y > a.y) {
    const sx = a.x + nw / 2;
    const sy = a.y + NODE_H;
    const tx = b.x + nw / 2;
    const ty = b.y;
    const ins = graph.edges
      .filter((q) => placed[q.to].id === b.id && placed[q.from].y < b.y)
      .map((q) => placed[q.from])
      .sort((p, q) => {
        if (p.x !== q.x) return p.x - q.x;
        // Same column: the higher source turns down furthest from itself, so no two wires cross.
        return tx > p.x + nw / 2 ? q.y - p.y : p.y - q.y;
      });
    const at = ins.findIndex((p) => p.id === a.id);
    const x2 = ins.length > 1 ? tx - nw * 0.3 + nw * 0.6 * (at / (ins.length - 1)) : tx;
    const layer = layers[a.layer];
    const isLastRow = a.row >= layer.rows - 1;
    const gap = isLastRow && layers[a.layer + 1] ? layers[a.layer + 1].y - (layer.y + layer.height) : ROW_GAP;
    const my = sy + gap / 2;
    if (Math.abs(sx - x2) < 1) {
      return wire(`M${round(sx)},${round(sy)}L${round(x2)},${round(ty)}`, { x: x2, y: ty, dir: 'd' }, { x: sx + 8, y: sy + (ty - sy) / 2 - 8 });
    }
    return wire(
      elbow([
        [sx, sy],
        [sx, my],
        [x2, my],
        [x2, ty],
      ]),
      { x: x2, y: ty, dir: 'd' },
      { x: x2 + 8, y: ty - 26 },
    );
  }

  // Target above: a loop out the right side, past the pair, but never beyond the stage.
  const right = Math.min(Math.max(a.x, b.x) + nw + 26, width - 2);
  const ay = a.y + NODE_H / 2;
  const by = b.y + NODE_H / 2;
  return wire(
    elbow([
      [a.x + nw, ay],
      [right, ay],
      [right, by],
      [b.x + nw, by],
    ]),
    { x: b.x + nw, y: by, dir: 'l' },
    { x: right + 6, y: (a.y + b.y) / 2 + NODE_H / 2 },
  );
}
