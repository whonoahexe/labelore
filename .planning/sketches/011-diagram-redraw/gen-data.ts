// Generates sketch 011 data.js: each RESEARCH diagram lifted by the SHIPPED model. Run from the repo root: node .planning/sketches/011-diagram-redraw/gen-data.ts
import fs from 'node:fs';
import { liftDiagram } from '/home/cinedise/labelore/src/rendering/ascii-lift.ts';
const SP = '/home/cinedise/studio-portal/.planning';
const docs: [string, string, string][] = [
  ['sp-v1-02', 'studio-portal v1.0 · 02 storage health', `${SP}/milestones/v1.0-phases/02-storage-health-status/02-RESEARCH.md`],
  ['lab-v1-02', 'labelore v1.0 · 02 situational awareness', '/home/cinedise/labelore/.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md'],
  ['sp-v1-01', 'studio-portal v1.0 · 01 identity', `${SP}/milestones/v1.0-phases/01-identity-persistence-foundation/01-RESEARCH.md`],
  ['sp-v1-03', 'studio-portal v1.0 · 03 file browsing', `${SP}/milestones/v1.0-phases/03-file-browsing/03-RESEARCH.md`],
  ['sp-v1-04', 'studio-portal v1.0 · 04 transfers', `${SP}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-RESEARCH.md`],
  ['sp-01', 'studio-portal v2.0 · 01 portal identity', `${SP}/phases/01-portal-owned-identity-sessions/01-RESEARCH.md`],
  ['sp-02', 'studio-portal v2.0 · 02 roles', `${SP}/phases/02-roles-permission-enforcement/02-RESEARCH.md`],
  ['sp-04', 'studio-portal v2.0 · 04 bulk archive', `${SP}/phases/04-bulk-archive-downloads/04-RESEARCH.md`],
];
const out: unknown[] = [];
for (const [id, label, path] of docs) {
  const md = fs.readFileSync(path, 'utf8');
  const at = md.indexOf('### System Architecture Diagram');
  const fence = /```[a-z]*\n([\s\S]*?)\n```/.exec(md.slice(at))!;
  const text = fence[1];
  const after = md.slice(at + fence.index + fence[0].length).trim().split('\n\n')[0].replace(/\[VERIFIED[^\]]*\]/g, '').trim();
  const fig = liftDiagram(text);
  out.push({ id, label, source: path.replace('/home/cinedise/', '~/'), text, caption: after.startsWith('#') || after.startsWith('```') ? '' : after,
    model: fig && { width: fig.width, height: fig.height, spacers: fig.spacers,
      rows: fig.rows.map((segs) => segs.map((s) => [s.text, s.kind])),
      cards: fig.cards.map((c) => ({ kind: c.kind, r1: c.r1, c1: c.c1, r2: c.r2, c2: c.c2, frame: c.frame })) } });
  console.log(id, fig ? `${fig.height}x${fig.width} cards=${fig.cards.length} (${fig.cards.filter(c=>c.kind==='box').length} box)` : 'NULL');
}
fs.writeFileSync('/home/cinedise/labelore/.planning/sketches/011-diagram-redraw/data.js', 'window.DIAGRAMS = ' + JSON.stringify(out) + ';\n');
