// Layered left-to-right layout for a build-order DAG (quick-261024-k8u, sketch 032 A). A pure port
// of the sketch's `boModel` and `boLayout` (layers mode): a step's column is its longest chain of
// prerequisites, wires are drawn on the transitive reduction (A to D is not drawn when A to B to D
// already says it), and steps inside a column are ordered by the mean row of the steps they wait for
// (fewer crossings). Nodes share the width the canvas offers, within limits, and a long name gets a
// taller node.
//
// Cycle-safe by construction: depth is computed by bounded relaxation (at most one pass per step),
// never by recursion over the input, so a cycle or a self-loop still places every step; an edge that
// would run backwards (a cycle's back edge) is simply not drawn. The step list is capped. View-agnostic:
// no DOM and no Node API, every coordinate is a number the component turns into svg path data.

export const MAX_LAYOUT_STEPS = 80;
export const NODE_MIN_WIDTH = 168;
export const NODE_MAX_WIDTH = 250;
export const NODE_HEIGHT = 58;
export const NODE_TALL_HEIGHT = 74;
export const LONG_NAME = 26;
const COLUMN_GAP = 64;
const ROW_GAP = 14;
const PAD_X = 20;
const TOP = 20;
const BOTTOM = 6;
const ELBOW = 6;

export interface BuildOrderNode {
  id: string;
  name: string;
  depends: readonly string[];
}

export interface BuildOrderWire {
  from: string;
  to: string;
  path: string;
  /** The arrowhead's triangle, as svg path data. */
  arrow: string;
}

export interface BuildOrderLayout {
  /** Step ids per column, in drawn order. */
  columns: string[][];
  positions: Record<string, { x: number; y: number; column: number; row: number }>;
  wires: BuildOrderWire[];
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
}

function arrowPath(x: number, y: number): string {
  const head = 7;
  const half = 4;
  return `M${x - head},${y - half}L${x - head},${y + half}L${x},${y}Z`;
}

export function layoutBuildOrder(input: readonly BuildOrderNode[], budgetWidth: number): BuildOrderLayout {
  // The first occurrence of an id wins; ids a step names that are not steps are ignored.
  const seen = new Set<string>();
  const steps = input.filter((step) => !seen.has(step.id) && seen.add(step.id)).slice(0, MAX_LAYOUT_STEPS);
  const index = new Map(steps.map((step, position) => [step.id, position]));
  const deps = steps.map((step) =>
    [...new Set(step.depends)].filter((dep) => dep !== step.id && index.has(dep)).map((dep) => index.get(dep) as number),
  );

  // Depth: bounded relaxation, one pass per step at most. A cycle stops growing at the cap.
  const depth = steps.map(() => 0);
  const cap = Math.max(0, steps.length - 1);
  for (let pass = 0; pass < steps.length; pass += 1) {
    let changed = false;
    for (let step = 0; step < steps.length; step += 1) {
      for (const dep of deps[step]) {
        const next = Math.min(cap, depth[dep] + 1);
        if (next > depth[step]) {
          depth[step] = next;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Only edges that run left to right are drawn candidates.
  const forward = deps.map((list, step) => list.filter((dep) => depth[dep] < depth[step]));
  const reaches = (from: number, target: number): boolean => {
    const visited = new Set<number>();
    const stack = [from];
    while (stack.length > 0) {
      const current = stack.pop() as number;
      if (current === target) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of forward[current]) stack.push(next);
    }
    return false;
  };
  // Transitive reduction: p to s is redundant when another prerequisite of s already depends on p.
  const edges: Array<[number, number]> = [];
  forward.forEach((list, step) => {
    for (const dep of list) {
      if (!list.some((other) => other !== dep && reaches(other, dep))) edges.push([dep, step]);
    }
  });

  const columnCount = steps.length === 0 ? 0 : Math.max(...depth) + 1;
  const nodeWidth = Math.round(
    Math.max(
      NODE_MIN_WIDTH,
      Math.min(NODE_MAX_WIDTH, columnCount === 0 ? NODE_MAX_WIDTH : (budgetWidth - 2 * PAD_X - (columnCount - 1) * COLUMN_GAP) / columnCount),
    ),
  );
  const nodeHeight = steps.some((step) => step.name.length > LONG_NAME) ? NODE_TALL_HEIGHT : NODE_HEIGHT;

  const row: number[] = steps.map(() => 0);
  const columns: string[][] = [];
  const positions: BuildOrderLayout['positions'] = {};
  let tallest = 0;
  for (let column = 0; column < columnCount; column += 1) {
    const members = steps.map((_, step) => step).filter((step) => depth[step] === column);
    if (column > 0) {
      const mean = (step: number): number => {
        const rows = edges.filter(([, to]) => to === step).map(([from]) => row[from]);
        return rows.length > 0 ? rows.reduce((sum, value) => sum + value, 0) / rows.length : step;
      };
      members.sort((a, b) => mean(a) - mean(b) || a - b);
    }
    members.forEach((step, place) => {
      row[step] = place;
      positions[steps[step].id] = {
        x: PAD_X + column * (nodeWidth + COLUMN_GAP),
        y: TOP + place * (nodeHeight + ROW_GAP),
        column,
        row: place,
      };
    });
    columns.push(members.map((step) => steps[step].id));
    tallest = Math.max(tallest, members.length);
  }

  const wires: BuildOrderWire[] = edges.map(([from, to]) => {
    const p = positions[steps[from].id];
    const q = positions[steps[to].id];
    const x1 = p.x + nodeWidth;
    const y1 = p.y + nodeHeight / 2;
    const x2 = q.x - 2;
    const y2 = q.y + nodeHeight / 2;
    const xm = q.x - COLUMN_GAP / 2;
    const r = Math.min(ELBOW, Math.abs(y2 - y1) / 2);
    const sign = Math.sign(y2 - y1);
    const path =
      Math.abs(y2 - y1) < 1
        ? `M${x1},${y1}H${x2}`
        : `M${x1},${y1}H${xm - r}Q${xm},${y1} ${xm},${y1 + sign * r}V${y2 - sign * r}Q${xm},${y2} ${xm + r},${y2}H${x2}`;
    return { from: steps[from].id, to: steps[to].id, path, arrow: arrowPath(x2 + 2, y2) };
  });

  return {
    columns,
    positions,
    wires,
    width: columnCount === 0 ? 0 : PAD_X + columnCount * nodeWidth + (columnCount - 1) * COLUMN_GAP + PAD_X,
    height: tallest === 0 ? 0 : TOP + tallest * (nodeHeight + ROW_GAP) + BOTTOM,
    nodeWidth,
    nodeHeight,
  };
}
