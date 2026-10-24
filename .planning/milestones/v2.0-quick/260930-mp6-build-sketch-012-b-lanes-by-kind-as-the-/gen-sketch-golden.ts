// Generates test/rendering/fixtures/sketch-012-graphs.json: the sketch 012 graph (shapes.js + graph.js,
// run verbatim in a node:vm context) for the 8 sketch fixtures, lifted by the SHIPPED model.
// Run from the repo root: node .planning/quick/260930-mp6-*/gen-sketch-golden.ts
import fs from 'node:fs';
import vm from 'node:vm';
import { liftDiagram } from '/home/cinedise/labelore/src/rendering/ascii-lift.ts';

const SKETCH = '/home/cinedise/labelore/.planning/sketches/012-diagram-product';
const FIX = '/home/cinedise/labelore/test/rendering/fixtures';
const ids: Record<string, string> = {
  'sp-v1-02': 'sp-v1-02-storage-health',
  'lab-v1-02': 'lb-v1-02-situational-awareness',
  'sp-v1-01': 'sp-v1-01-identity',
  'sp-v1-03': 'sp-v1-03-file-browsing',
  'sp-v1-04': 'sp-v1-04-transfers',
  'sp-01': 'sp-p01-identity-sessions',
  'sp-02': 'sp-p02-roles',
  'sp-04': 'sp-p04-bulk-archive',
};

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(`${SKETCH}/shapes.js`, 'utf8'), context);
vm.runInContext(fs.readFileSync(`${SKETCH}/graph.js`, 'utf8'), context);
// shapes / buildGraph are top-level declarations of the sketch scripts.
const sketch = vm.runInContext('({ shapes, buildGraph })', context) as {
  shapes: (d: unknown) => any;
  buildGraph: (s: unknown) => any;
};

const out: Record<string, unknown> = {};
for (const [id, name] of Object.entries(ids)) {
  const text = fs.readFileSync(`${FIX}/${name}-diagram.txt`, 'utf8');
  const fig = liftDiagram(text);
  if (!fig) throw new Error(`${id}: lift rejected`);
  const model = {
    width: fig.width,
    height: fig.height,
    spacers: fig.spacers,
    rows: fig.rows.map((segs) => segs.map((s) => [s.text, s.kind])),
    cards: fig.cards.map((c) => ({ kind: c.kind, r1: c.r1, c1: c.c1, r2: c.r2, c2: c.c2, frame: c.frame })),
  };
  const S = sketch.shapes({ model });
  const g = sketch.buildGraph(S);
  const groupLabel = (gid: number | null): string | null => {
    if (gid == null) return null;
    const grp = g.groups.find((x: any) => x.id === gid);
    return grp ? grp.label.main : null;
  };
  const index = new Map<number, number>(g.nodes.map((n: any, i: number) => [n.id, i]));
  out[id] = {
    quality: S.quality,
    dangling: S.dangling,
    nodes: g.nodes.map((n: any) => ({
      kind: n.kind,
      main: n.label.main,
      sub: n.label.sub,
      code: n.label.code,
      full: n.label.full,
      details: n.details,
      notes: n.notes,
      group: groupLabel(n.group),
    })),
    edges: g.edges.map((e: any) => ({
      from: index.get(e.from),
      to: index.get(e.to),
      label: e.label,
      directed: e.directed,
      implied: e.implied === true,
    })),
    groups: g.groups.map((gr: any) => ({ main: gr.label.main, sub: gr.label.sub, details: gr.details })),
  };
  console.log(id, `${g.nodes.length} nodes`, `${g.edges.length} edges`, `${g.groups.length} groups`, `q=${S.quality.toFixed(2)} dangling=${S.dangling}`);
}
fs.writeFileSync(`${FIX}/sketch-012-graphs.json`, JSON.stringify(out, null, 1) + '\n');
