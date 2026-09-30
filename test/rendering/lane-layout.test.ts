// quick-260930-mp6 (W-lanes, W-wires, K-width): layoutLanes on the corpus fixtures at the RESEARCH
// figure's 940px content width (1440px viewport) and at a wider budget. Numbers come from the stated
// arithmetic: node width = floor((budget - sum of lane padding and column gaps) / columns).
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { liftDiagram } from '../../src/rendering/ascii-lift.ts';
import { buildDiagramGraph } from '../../src/rendering/ascii-graph.ts';
import type { DiagramGraph } from '../../src/rendering/ascii-graph.ts';
import { DEFAULT_BUDGET, LANE_ORDER, NODE_H, layoutLanes } from '../../src/rendering/lane-layout.ts';
import type { LayoutResult } from '../../src/rendering/lane-layout.ts';

const NAMES = {
  'sp-v1-02': 'sp-v1-02-storage-health',
  'lab-v1-02': 'lb-v1-02-situational-awareness',
  'sp-v1-01': 'sp-v1-01-identity',
  'sp-v1-04': 'sp-v1-04-transfers',
  'sp-01': 'sp-p01-identity-sessions',
  'sp-02': 'sp-p02-roles',
  'sp-04': 'sp-p04-bulk-archive',
} as const;
type Id = keyof typeof NAMES;

const graphs = new Map<Id, DiagramGraph>();
for (const [id, name] of Object.entries(NAMES) as [Id, string][]) {
  const text = await readFile(new URL(`./fixtures/${name}-diagram.txt`, import.meta.url), 'utf8');
  const figure = liftDiagram(text);
  if (figure === null) throw new Error(`${id}: lift rejected`);
  graphs.set(id, buildDiagramGraph(figure));
}
const graphOf = (id: Id): DiagramGraph => graphs.get(id) as DiagramGraph;
const layoutOf = (id: Id, budget = DEFAULT_BUDGET): LayoutResult => layoutLanes(graphOf(id), budget);
const kindsOf = (layout: LayoutResult): string[] => layout.lanes.map((lane) => lane.kind);

describe('layoutLanes — lanes and width at 940px', () => {
  it('storage health: six lanes in LANE_ORDER, compact, and no wider than the budget', () => {
    const layout = layoutOf('sp-v1-02');
    expect(kindsOf(layout)).toEqual(['client', 'service', 'worker', 'channel', 'data', 'external']);
    // floor((940 - 6 * 16) / 6): 140. (The planning note's 141 was round(), which overflows the budget.)
    expect(layout.nodeWidth).toBe(140);
    expect(layout.compact).toBe(true);
    expect(layout.width).toBeLessThanOrEqual(DEFAULT_BUDGET);
  });

  it('storage health: the four prober threads share one x in the Worker lane, at four distinct y', () => {
    const graph = graphOf('sp-v1-02');
    const layout = layoutOf('sp-v1-02');
    const probers = graph.nodes.filter((n) => n.kind === 'worker').map((n) => layout.nodes[n.id]);
    expect(probers).toHaveLength(4);
    expect(new Set(probers.map((p) => p.x)).size).toBe(1);
    expect(new Set(probers.map((p) => p.y)).size).toBe(4);
    expect(layout.lanes[probers[0].lane].kind).toBe('worker');
  });

  it('labelore v1.0/02: four lanes at the 196px cap', () => {
    const layout = layoutOf('lab-v1-02');
    expect(layout.lanes).toHaveLength(4);
    expect(layout.nodeWidth).toBe(196);
    expect(layout.compact).toBe(false);
  });

  it('studio-portal v1.0/01 and phases/01: five lanes, 172px nodes', () => {
    for (const id of ['sp-v1-01', 'sp-01'] as const) {
      const layout = layoutOf(id);
      expect(layout.lanes, id).toHaveLength(5);
      expect(layout.nodeWidth, id).toBe(172);
    }
  });

  it('roles and bulk archive: four lanes at the 196px cap', () => {
    for (const id of ['sp-02', 'sp-04'] as const) {
      const layout = layoutOf(id);
      expect(layout.lanes, id).toHaveLength(4);
      expect(layout.nodeWidth, id).toBe(196);
    }
  });

  it('transfers: six lanes, the same narrow nodes as storage health', () => {
    const layout = layoutOf('sp-v1-04');
    expect(layout.lanes).toHaveLength(6);
    expect(layout.nodeWidth).toBe(140);
  });

  it('lane kinds follow LANE_ORDER, and lanes alternate shade starting with the first', () => {
    for (const id of Object.keys(NAMES) as Id[]) {
      const layout = layoutOf(id);
      const indices = kindsOf(layout).map((k) => LANE_ORDER.indexOf(k as (typeof LANE_ORDER)[number]));
      expect(indices, id).toEqual([...indices].sort((a, b) => a - b));
      expect(layout.lanes.map((l) => l.shaded), id).toEqual(layout.lanes.map((_, i) => i % 2 === 0));
    }
  });

  it('all seven drawn fixtures fit 940px', () => {
    for (const id of Object.keys(NAMES) as Id[]) expect(layoutOf(id).width, id).toBeLessThanOrEqual(DEFAULT_BUDGET);
  });

  it('is deterministic', () => {
    for (const id of Object.keys(NAMES) as Id[]) expect(layoutOf(id)).toEqual(layoutOf(id));
  });
});

describe('layoutLanes — geometry invariants', () => {
  for (const id of Object.keys(NAMES) as Id[]) {
    it(`${id}: nodes never overlap and sit inside their lane`, () => {
      const layout = layoutOf(id);
      const rects = layout.nodes.map((n) => ({ ...n, x2: n.x + layout.nodeWidth, y2: n.y + NODE_H }));
      rects.forEach((a, i) => {
        const lane = layout.lanes[a.lane];
        expect(a.x, `${id} #${a.id}`).toBeGreaterThanOrEqual(lane.x);
        expect(a.x2, `${id} #${a.id}`).toBeLessThanOrEqual(lane.x + lane.width);
        rects.slice(i + 1).forEach((b) => {
          const overlap = a.x < b.x2 && b.x < a.x2 && a.y < b.y2 && b.y < a.y2;
          expect(overlap, `${id} #${a.id} / #${b.id}`).toBe(false);
        });
      });
      expect(Math.max(...rects.map((r) => r.y2))).toBeLessThanOrEqual(layout.height);
    });

    it(`${id}: every wire starts on its source's edge and its tip lands on its target's edge`, () => {
      const layout = layoutOf(id);
      const onEdge = (p: { x: number; y: number }, nodeId: number): boolean => {
        const n = layout.nodes[nodeId];
        const inX = p.x >= n.x - 0.05 && p.x <= n.x + layout.nodeWidth + 0.05;
        const inY = p.y >= n.y - 0.05 && p.y <= n.y + NODE_H + 0.05;
        const onVertical = Math.abs(p.x - n.x) < 0.06 || Math.abs(p.x - (n.x + layout.nodeWidth)) < 0.06;
        const onHorizontal = Math.abs(p.y - n.y) < 0.06 || Math.abs(p.y - (n.y + NODE_H)) < 0.06;
        return inX && inY && (onVertical || onHorizontal);
      };
      expect(layout.wires).toHaveLength(graphOf(id).edges.length);
      for (const wire of layout.wires) {
        const start = /^M(-?[\d.]+),(-?[\d.]+)/.exec(wire.d);
        expect(start, wire.d).not.toBeNull();
        expect(onEdge({ x: Number(start?.[1]), y: Number(start?.[2]) }, wire.from), `${id} ${wire.from}>${wire.to} start`).toBe(true);
        expect(onEdge(wire.tip, wire.to), `${id} ${wire.from}>${wire.to} tip`).toBe(true);
        expect(wire.labelAt.x + wire.labelAt.maxWidth).toBeLessThanOrEqual(layout.width + 0.5);
      }
    });
  }
});

describe('layoutLanes — a wider budget (Expand)', () => {
  it('storage health places its probers two per row at 1440', () => {
    const graph = graphOf('sp-v1-02');
    const layout = layoutOf('sp-v1-02', 1440);
    const probers = graph.nodes.filter((n) => n.kind === 'worker').map((n) => layout.nodes[n.id]);
    expect(new Set(probers.map((p) => p.x)).size).toBe(2);
    expect(new Set(probers.map((p) => p.y)).size).toBe(2);
    expect(layout.compact).toBe(false);
    expect(layout.width).toBeLessThanOrEqual(1440);
  });
});
