// Sketch 032: data.js = what the Architecture panel reads from each project's
// .planning/research/ARCHITECTURE.md: the recommended project structure (parsed by the shipped
// src/rendering/ascii-tree.ts, rationale dropped), the anti-patterns, and the suggested build order
// as a dependency graph. The system overview graph and its lane layout come from 031's data.js.
// Run: node .planning/sketches/032-research-architecture/gen-data.mjs <cinedise-research-dir>
import { readFileSync, writeFileSync } from 'node:fs';
import { parseTree, collapseFolderChains, treeCounts } from '../../../src/rendering/ascii-tree.ts';
const HERE = new URL('.', import.meta.url).pathname;
const SOURCES = { labelore: `${HERE}../../research`, cinedise: process.argv[2] };
if (!SOURCES.cinedise) { console.error('usage: gen-data.mjs <cinedise-research-dir>'); process.exit(1); }

function sections(src) {
  const out = []; let fence = false;
  src.split('\n').forEach((line) => {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    const m = !fence && /^(#{1,4}) (.+)$/.exec(line);
    if (m) out.push({ depth: m[1].length, title: m[2].trim(), body: [] });
    else if (out.length) out[out.length - 1].body.push(line);
  });
  return out;
}
const fenceIn = (lines) => { const t = lines.join('\n'); const m = /```[a-z]*\n([\s\S]*?)```/.exec(t); return m ? m[1] : null; };
const strip = (s) => s.replace(/^#+\s*\d+\.\s*/, '');

// Recommended project structure: the tree only — the Structure Rationale that follows is dropped.
function structure(secs) {
  const s = secs.find((x) => /Recommended Project Structure/i.test(strip(x.title)));
  if (!s) return null;
  const text = fenceIn(s.body);
  if (!text) return null;
  const lead = s.body.join('\n').split('```')[0].trim().split(/\n\s*\n/)[0] || null;
  const rows = collapseFolderChains(parseTree(text));
  return { lead, rows, counts: treeCounts(parseTree(text)) };
}

// Anti-patterns: both spellings — What people do / Why it's wrong / Do this instead, and Why wrong / Instead.
function antiPatterns(secs) {
  return secs.filter((x) => /^Anti-Pattern \d+:/i.test(x.title)).map((x) => {
    const body = x.body.join('\n');
    const f = (re) => { const m = re.exec(body); return m ? m[1].replace(/\s*\n\s*/g, ' ').replace(/\s*-{3,}\s*$/, '').trim() : null; };
    return {
      title: x.title.replace(/^Anti-Pattern \d+:\s*/i, '').trim(),
      does: f(/\*\*What people do:\*\*\s*([\s\S]*?)(?=\n\*\*|\n*$)/),
      why: f(/\*\*Why (?:it's )?wrong:\*\*\s*([\s\S]*?)(?=\n\*\*|\n*$)/),
      instead: f(/\*\*(?:Do this instead|Instead):\*\*\s*([\s\S]*?)(?=\n\*\*|\n*$)/),
    };
  });
}

// Suggested build order as a graph. Cinedise: a Step | Deliverable | Depends on | Notes table, with
// short names from its ASCII graph. Labelore: "### Phase A — name" prose, dependencies read from the
// sentences that say "depends" or "needs".
function buildOrder(secs) {
  const i = secs.findIndex((x) => /(Suggested|Recommended) Build Order/i.test(strip(x.title)));
  if (i < 0) return null;
  const top = secs[i];
  const kids = []; for (let j = i + 1; j < secs.length && secs[j].depth > top.depth; j++) kids.push(secs[j]);
  const rows = top.body.filter((l) => /^\|/.test(l.trim()) && !/^\|\s*:?-{3,}/.test(l.trim())).map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const after = top.body.join('\n').split(/```[\s\S]*?```/).pop();
  const grouping = (/\*\*Roadmap grouping suggestion:\*\*\s*(.+)/.exec(after) || [])[1] || null;
  const note = top.body.join('\n').split('```')[0].trim() || null;
  if (rows.length > 1) {
    const ascii = fenceIn(top.body) || '';
    const short = {};
    for (const m of ascii.matchAll(/\b([A-Z]\d+)\s+([a-z][^─►┬┴├└│\n(]*)/g)) short[m[1]] = m[2].trim();
    const steps = rows.slice(1).map(([id, deliverable, depends, notes]) => {
      const ids = [...new Set((depends.match(/\b[A-Z]\d+\b/g) || []))];
      return { id, name: short[id] || deliverable.split(/[:,(]/)[0], deliverable, depends: ids, dependsText: /^none$/i.test(depends) ? null : depends, notes: notes || null };
    });
    const known = new Set(steps.map((s) => s.id));
    steps.forEach((s) => { s.depends = s.depends.filter((d) => known.has(d) && d !== s.id); });
    return { note, grouping, steps };
  }
  const steps = kids.filter((k) => /^Phase\s+[A-Z]/i.test(k.title)).map((k) => {
    const m = /^Phase\s+([A-Z])\s*[—–-]\s*(.+)$/i.exec(k.title);
    const body = k.body.join(' ').replace(/\s+/g, ' ').trim();
    const deps = new Set();
    for (const sentence of body.split(/(?<=\.)\s+/)) {
      if (!/depend|needs/i.test(sentence) || /depends on nothing/i.test(sentence)) continue;
      for (const r of sentence.matchAll(/Phases?\s+([A-Z])(?:\s*[–-]\s*([A-Z]))?/g)) {
        const a = r[1].charCodeAt(0), b = (r[2] || r[1]).charCodeAt(0);
        for (let c = a; c <= b; c++) deps.add(String.fromCharCode(c));
      }
    }
    deps.delete(m[1]);
    const plans = (/\*\*(~[^*]+?plans?)[:.]?\*\*/.exec(body) || [])[1] || null;
    return { id: m[1], name: m[2].trim(), deliverable: body.split(/(?<=\.)\s+/)[0].replace(/\s*\*\*Why this order.*$/, ''), depends: [...deps], dependsText: null, notes: plans };
  });
  const all = [top, ...kids].map((k) => k.body.join('\n')).join('\n');
  const why = (/\*\*Why this order, restated:\*\*\s*(.+)/.exec(all) || [])[1] || null;
  return { note: why, grouping: null, steps };
}

const out = {};
for (const [key, dir] of Object.entries(SOURCES)) {
  const secs = sections(readFileSync(`${dir}/ARCHITECTURE.md`, 'utf8'));
  out[key] = { structure: structure(secs), antiPatterns: antiPatterns(secs), buildOrder: buildOrder(secs) };
}
writeFileSync(`${HERE}data.js`, `// Generated by gen-data.mjs from two projects' .planning/research/ARCHITECTURE.md\nwindow.ARCH = ${JSON.stringify(out, null, 1)};\n`);
console.log('wrote data.js');
