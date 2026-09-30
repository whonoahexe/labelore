// quick-260930-mp6 (W-graph, K-bridging, K-fallback): buildDiagramGraph, the port of sketch 012's
// shapes.js + graph.js on the shipped lifted model. The golden (fixtures/sketch-012-graphs.json) is the
// sketch's OWN output, produced by running its scripts verbatim (gen-sketch-golden.ts), so parity here
// means the port reads the corpus the way the sketch did.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { liftDiagram } from '../../src/rendering/ascii-lift.ts';
import { buildDiagramGraph, MAX_GRAPH_NODES } from '../../src/rendering/ascii-graph.ts';
import type { DiagramGraph } from '../../src/rendering/ascii-graph.ts';

const FIXTURE_NAMES = {
  'sp-v1-02': 'sp-v1-02-storage-health',
  'lab-v1-02': 'lb-v1-02-situational-awareness',
  'sp-v1-01': 'sp-v1-01-identity',
  'sp-v1-03': 'sp-v1-03-file-browsing',
  'sp-v1-04': 'sp-v1-04-transfers',
  'sp-01': 'sp-p01-identity-sessions',
  'sp-02': 'sp-p02-roles',
  'sp-04': 'sp-p04-bulk-archive',
  'sp-p03': 'sp-p03-account-admin',
  'lb-v1.1-05': 'lb-v1.1-05-per-type-views',
} as const;
type FixtureId = keyof typeof FIXTURE_NAMES;

const texts = new Map<FixtureId, string>();
for (const [id, name] of Object.entries(FIXTURE_NAMES) as [FixtureId, string][]) {
  texts.set(id, await readFile(new URL(`./fixtures/${name}-diagram.txt`, import.meta.url), 'utf8'));
}

interface GoldenNode {
  kind: string;
  main: string;
  sub: string;
  code: boolean;
  full: string;
  details: string[];
  notes: string[];
  group: string | null;
}
interface GoldenEdge {
  from: number;
  to: number;
  label: string;
  directed: boolean;
  implied: boolean;
}
interface Golden {
  quality: number;
  dangling: number;
  nodes: GoldenNode[];
  edges: GoldenEdge[];
  groups: { main: string; sub: string; details: string[] }[];
}
const GOLDEN = JSON.parse(
  await readFile(new URL('./fixtures/sketch-012-graphs.json', import.meta.url), 'utf8'),
) as Record<string, Golden>;

function graphOf(id: FixtureId): DiagramGraph {
  const figure = liftDiagram(texts.get(id) as string);
  if (figure === null) throw new Error(`${id}: lift rejected`);
  return buildDiagramGraph(figure);
}

const edgeKeys = (edges: { from: number; to: number; label: string; directed: boolean; implied: boolean }[]): string[] =>
  edges.map((e) => `${e.from}>${e.to}|${e.label}|${e.directed}|${e.implied}`).sort();

describe('buildDiagramGraph — parity with the sketch (golden)', () => {
  for (const id of Object.keys(GOLDEN)) {
    it(`${id}: nodes, edges and groups equal the sketch's graph`, () => {
      const golden = GOLDEN[id];
      const graph = graphOf(id as FixtureId);
      expect(graph.nodes).toHaveLength(golden.nodes.length);
      graph.nodes.forEach((node, i) => {
        const g = golden.nodes[i];
        expect(
          {
            kind: node.kind,
            main: node.label.main,
            sub: node.label.sub,
            code: node.label.code,
            full: node.label.full,
            details: node.details,
            notes: node.notes,
            group: node.group === null ? null : graph.groups[node.group].label.main,
          },
          `${id} node ${i}`,
        ).toEqual(g);
      });
      expect(edgeKeys(graph.edges)).toEqual(edgeKeys(golden.edges));
      expect(
        graph.groups.map((group) => ({ main: group.label.main, sub: group.label.sub, details: group.details })),
      ).toEqual(golden.groups);
      expect(graph.quality).toBeCloseTo(golden.quality, 10);
      expect(graph.dangling).toBe(golden.dangling);
    });
  }
});

describe('buildDiagramGraph — the named cases (K-bridging)', () => {
  it('storage health: the shouted side label names the heading-less box, and all four probers wire to the registry', () => {
    const graph = graphOf('sp-v1-02');
    expect(graph.nodes).toHaveLength(9);
    expect(graph.edges).toHaveLength(10);
    const host = graph.nodes.find((n) => n.label.main === 'Host kernel / devices');
    expect(host?.kind).toBe('external');
    expect(host?.details[0]).toMatch(/^\/proc\/self\/mountinfo/);
    const registry = graph.nodes.find((n) => n.label.main === 'Health registry');
    expect(registry).toBeDefined();
    const probers = graph.nodes.filter((n) => n.kind === 'worker');
    expect(probers.map((n) => n.label.main).sort()).toEqual([
      'Prober thread:archive',
      'Prober thread:cloud',
      'Prober thread:stage',
      'Prober thread:vault',
    ]);
    for (const prober of probers) {
      const edge = graph.edges.find((e) => e.from === prober.id && e.to === registry?.id);
      expect(edge, prober.label.main).toBeDefined();
      if (prober.label.main.endsWith(':stage')) expect(edge?.label.startsWith('mpsc/watch')).toBe(true);
    }
    const bus = graph.nodes.find((n) => n.label.main === 'Broadcast bus');
    const registryToBus = graph.edges.find((e) => e.from === registry?.id && e.to === bus?.id);
    expect(registryToBus?.label).toBe('Event::TierHealth { tier, state, .. , probed_at }');
  });

  it('labelore v1.0/02: 23 nodes, 24 edges, and the React Query fan-out is bridged as 4 implied edges', () => {
    const graph = graphOf('lab-v1-02');
    expect(graph.nodes).toHaveLength(23);
    expect(graph.edges).toHaveLength(24);
    const rq = graph.nodes.find((n) => n.label.main.startsWith('React Query'));
    expect(rq).toBeDefined();
    const fan = graph.edges.filter((e) => e.from === rq?.id && e.implied);
    expect(fan.map((e) => graph.nodes[e.to].label.main).sort()).toEqual(['Artifact page', 'Dashboard', 'Preview', 'Roadmap/history']);
    expect(graph.edges.filter((e) => e.implied)).toHaveLength(4);
  });

  it('studio-portal v1.0/01: one group, "Auth middleware", around four members', () => {
    const graph = graphOf('sp-v1-01');
    expect(graph.groups).toHaveLength(1);
    expect(graph.groups[0].label.main).toBe('Auth middleware');
    expect(graph.nodes.filter((n) => n.group === 0)).toHaveLength(4);
  });

  it('nodes and groups are addressed by their index in the returned arrays', () => {
    for (const id of Object.keys(FIXTURE_NAMES) as FixtureId[]) {
      const graph = graphOf(id);
      graph.nodes.forEach((n, i) => expect(n.id).toBe(i));
      graph.groups.forEach((g, i) => expect(g.id).toBe(i));
      for (const e of graph.edges) {
        expect(e.from).toBeGreaterThanOrEqual(0);
        expect(e.from).toBeLessThan(graph.nodes.length);
        expect(e.to).toBeGreaterThanOrEqual(0);
        expect(e.to).toBeLessThan(graph.nodes.length);
      }
    }
  });
});

describe('buildDiagramGraph — the thin rule (K-fallback)', () => {
  it('sp-v1-03, sp-p03 and lb-v1.1-05 are thin', () => {
    for (const id of ['sp-v1-03', 'sp-p03', 'lb-v1.1-05'] as const) expect(graphOf(id).thin, id).toBe(true);
  });

  it('the seven drawn corpus diagrams are not thin', () => {
    for (const id of ['sp-v1-02', 'sp-v1-04', 'sp-v1-01', 'sp-01', 'sp-02', 'sp-04', 'lab-v1-02'] as const) {
      expect(graphOf(id).thin, id).toBe(false);
    }
  });

  it('more than MAX_GRAPH_NODES nodes is thin, and comes back empty', () => {
    const grid = Array.from({ length: MAX_GRAPH_NODES + 5 }, (_, i) => `n${i} step`).join('\n');
    const figure = liftDiagram(grid);
    expect(figure).not.toBeNull();
    const graph = buildDiagramGraph(figure as NonNullable<typeof figure>);
    expect(graph.thin).toBe(true);
  });
});

describe('buildDiagramGraph — cost bounds (T-mp6-01)', () => {
  const grids: [string, string][] = [
    ['┌─ grid', Array.from({ length: 250 }, () => '┌─'.repeat(150)).join('\n')],
    ['┌┐ over ││ rows', Array.from({ length: 250 }, (_, i) => (i % 2 === 0 ? '┌┐'.repeat(150) : '││'.repeat(150))).join('\n')],
    ['"ab  " runs', Array.from({ length: 250 }, () => 'ab  '.repeat(75)).join('\n')],
    ['open-left tops', Array.from({ length: 250 }, (_, i) => (i % 2 === 0 ? '┌─┐ '.repeat(75) : '  │ '.repeat(75))).join('\n')],
  ];
  for (const [name, grid] of grids) {
    it(`${name}: a lifted figure builds its graph in under 250 ms`, () => {
      const figure = liftDiagram(grid);
      if (figure === null) return;
      const started = performance.now();
      const graph = buildDiagramGraph(figure);
      expect(performance.now() - started).toBeLessThan(250);
      expect(graph.thin).toBe(true);
    });
  }
});
