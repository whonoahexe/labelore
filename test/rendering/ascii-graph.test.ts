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
  'sp-research': 'sp-research-system-overview',
  'lb-v1-01': 'lb-v1-01-read-layer',
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

  it('studio-portal research system overview: a box cut into layers is one node per layer, stacked, under the browser', () => {
    const graph = graphOf('sp-research');
    expect(graph.thin).toBe(false);
    expect(graph.nodes.map((n) => n.label.main)).toEqual([
      'api::*',
      'Domain services',
      'Job engine',
      'Host sensing',
      'SQLite',
      'Shell (ported) Dashboard │ Projects │ Ingest │ Browse │ Jobs │ Admin',
    ]);
    const [api, , , , sqlite, browser] = graph.nodes;
    expect(sqlite.kind).toBe('data');
    expect(graph.nodes[2].details[0]).toBe('jobs table ── claim gate ── TierLocks(Vec) ── lanes');
    // The two wires cross the ═══ tunnel and enter the backend's top edge (▼): one edge, all three labels.
    const inbound = graph.edges.find((e) => e.from === browser.id && e.to === api.id);
    expect(inbound?.directed).toBe(true);
    expect(inbound?.label.split(' · ').sort()).toEqual(['/ws (ticket)', 'REST (cookie)', 'tunnel']);
    const stack = graph.edges.filter((e) => e.implied);
    expect(stack.map((e) => `${e.from}-${e.to}|${e.directed}`)).toEqual(['0-1|false', '1-2|false', '2-3|false', '3-4|false']);
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
  it("sp-p03 draws: its ◄── pointer notes are attached to their boxes, so they count as placed text", () => {
    expect(graphOf('sp-p03').thin).toBe(false);
  });

  it('a screen mockup (storage tiles, mostly loose text) is thin', async () => {
    const text = await readFile(new URL('./fixtures/sp-v1-02-storage-tiles-mockup-diagram.txt', import.meta.url), 'utf8');
    const figure = liftDiagram(text);
    expect(buildDiagramGraph(figure as NonNullable<typeof figure>).thin).toBe(true);
  });

  it('a small figure draws when every card is joined: sp-v1-03 and lb-v1.1-05 (two cards, one link)', () => {
    for (const id of ['sp-v1-03', 'lb-v1.1-05'] as const) expect(graphOf(id).thin, id).toBe(false);
  });

  it('a lone card, or a small figure with a card left unjoined, stays thin', () => {
    const lone = liftDiagram('┌─────┐\n│ api │\n└─────┘');
    expect(buildDiagramGraph(lone as NonNullable<typeof lone>).thin).toBe(true);
    const loose = liftDiagram('┌─────┐   ┌─────┐\n│ api │   │ cli │\n└──┬──┘   └─────┘\n   ▼\n┌─────┐\n│ db  │\n└─────┘');
    const graph = buildDiagramGraph(loose as NonNullable<typeof loose>);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.thin).toBe(true);
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

// Unboxed start and end labels: a label an arrowhead lands on, from a wire a card starts, is the
// wire's target; a label at the top or bottom tail of a wire that has no card source and points into a
// card is its source. lb-v1-01 is labelore's v1.0 Phase 1 RESEARCH system diagram, verbatim.
describe('buildDiagramGraph — unboxed start and end labels', () => {
  const graphOfText = (text: string): DiagramGraph => {
    const figure = liftDiagram(text);
    if (figure === null) throw new Error('lift rejected');
    return buildDiagramGraph(figure);
  };
  const named = (graph: DiagramGraph, main: string) => graph.nodes.find((n) => n.label.main.startsWith(main));

  it('lb-v1-01: the disk source and both outputs are nodes, so the chain draws (six nodes, not thin)', () => {
    const graph = graphOf('lb-v1-01');
    expect(graph.nodes).toHaveLength(6);
    expect(graph.thin).toBe(false);
    expect(graph.dangling).toBe(0);
    const disk = graph.nodes.find((n) => n.label.full === '<project>/.planning/ (disk)');
    expect(disk?.kind).toBe('external');
    const [a, b, cli, stdout, vitest] = ['Layer A', 'Layer B', 'CLI', 'stdout JSON', 'Vitest golden-file suite'].map(
      (main) => named(graph, main),
    );
    for (const node of [a, b, cli, stdout, vitest]) expect(node).toBeDefined();
    const id = (node: (typeof graph.nodes)[number] | undefined): number => node?.id ?? -1;
    expect(edgeKeys(graph.edges)).toEqual(
      edgeKeys([
        { from: id(disk), to: id(a), label: 'fs.readdirSync(recursive) / fs.readFileSync / fs.statSync', directed: true, implied: false },
        { from: id(a), to: id(b), label: 'RawArtifact { path, content, mtimeMs }', directed: true, implied: false },
        { from: id(b), to: id(cli), label: '', directed: true, implied: false },
        { from: id(cli), to: id(stdout), label: '', directed: true, implied: false },
        { from: id(cli), to: id(vitest), label: '', directed: true, implied: false },
      ]),
    );
    expect(a?.notes.join(' ')).not.toMatch(/planning|readdirSync/);
    expect(stdout?.details).toEqual(['(manual/smoke use)']);
    expect(vitest?.details).toEqual([
      '(imports the SAME repository call — D-05 — diffs against committed golden per fixture)',
    ]);
  });

  it('a ◄── pointer note beside a box stays a note on that box', () => {
    const graph = graphOfText('┌─────┐\n│ api │◄── called by cron\n└─────┘');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].notes).toContain('called by cron');
  });

  it('prose beside a diagram that no wire end reaches stays a note', () => {
    const graph = graphOfText('┌─────┐      some prose here\n│ api │\n└──┬──┘\n   ▼\n┌─────┐\n│ db  │\n└─────┘');
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.flatMap((n) => n.notes)).toContain('some prose here');
  });

  it("a label right against a box on the arrow's far side is that box's caption: the arrow meets the box", () => {
    const graph = graphOfText('┌────┐\n│ T3 │\n└────┘\n(compose)\n   ▲\n   │\n┌────┐\n│ T4 │\n└────┘');
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.some((n) => n.label.full.includes('compose'))).toBe(false);
    const id = (main: string) => graph.nodes.find((n) => n.label.main === main)?.id;
    expect(graph.edges.map((e) => [e.from, e.to])).toEqual([[id('T4'), id('T3')]]);
  });

  it('labels over and under the wires between two boxes name those wires, even past a drifting edge', () => {
    const text = [
      '┌──────────┐         ┌──────────┐',
      '│ page     │  GET    │ server   │',
      '│          │ ───────▶│          │',
      '│          │         │          │',
      '│          │◀─────── │          │',
      '│          │  JSON   │          │',
      '│           │        └──────────┘',
      '└───────────┘',
    ].join('\n');
    const graph = graphOfText(text);
    const id = (main: string) => graph.nodes.find((n) => n.label.main === main)?.id;
    expect(graph.nodes.map((n) => n.label.main).sort()).toEqual(['page', 'server']);
    expect(edgeKeys(graph.edges)).toEqual(
      edgeKeys([
        { from: id('page') ?? -1, to: id('server') ?? -1, label: 'GET', directed: true, implied: false },
        { from: id('server') ?? -1, to: id('page') ?? -1, label: 'JSON', directed: true, implied: false },
      ]),
    );
  });

  it('an arrow landing on the heading over a box meets the box', () => {
    const graph = graphOfText('┌──────┐\n│ send │\n└──┬───┘\n   ▼\nSERVICE WORKER\n┌──────┐\n│ recv │\n└──────┘');
    const id = (main: string) => graph.nodes.find((n) => n.label.main === main)?.id;
    expect(graph.edges.map((e) => [e.from, e.to])).toEqual([[id('send'), id('recv')]]);
  });

  it('a wire joining two notes, with no card on it, promotes nothing', () => {
    const graph = graphOfText('┌─────┐   alpha\n│ api │     │\n└─────┘     ▼\n            beta');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].notes.join(' ')).toMatch(/alpha/);
    expect(graph.nodes[0].notes.join(' ')).toMatch(/beta/);
  });
});
