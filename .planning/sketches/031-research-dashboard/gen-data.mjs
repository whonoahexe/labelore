// Sketch 031: data.js = what the research dashboard reads from the five project research files
// (.planning/research/{SUMMARY,STACK,FEATURES,ARCHITECTURE,PITFALLS}.md), for two projects:
// Labelore's own (close to the GSD template) and Cinedise Portal's (dense, drifts from it).
// Run: node .planning/sketches/031-research-dashboard/gen-data.mjs <cinedise-research-dir>
// (Cinedise's files live on another host; copy them down first, e.g.
//  scp 'studio-ext:/home/cinedise/codebases/cinedise-portal/.planning/research/*.md' <dir>/)
import { readFileSync, writeFileSync } from 'node:fs';
import { layoutLanes } from '../../../src/rendering/lane-layout.ts';
import { GRAPHS } from './graphs.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const SOURCES = { labelore: `${HERE}../../research`, cinedise: process.argv[2] };
if (!SOURCES.cinedise) { console.error('usage: gen-data.mjs <cinedise-research-dir>'); process.exit(1); }

const DOCS = ['SUMMARY', 'STACK', 'FEATURES', 'ARCHITECTURE', 'PITFALLS'];

// ## / ### sections with their 1-based source line, body lines kept raw.
function sections(src) {
  const lines = src.split('\n');
  const out = [];
  let fence = false;
  lines.forEach((line, i) => {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    const m = !fence && /^(#{1,4}) (.+)$/.exec(line);
    if (m) out.push({ depth: m[1].length, title: m[2].trim(), line: i + 1, body: [] });
    else if (out.length) out[out.length - 1].body.push(line);
  });
  return out;
}
// A ## section with everything under it (its ### children included).
function block(secs, re) {
  const i = secs.findIndex((s) => s.depth === 2 && re.test(s.title));
  if (i < 0) return null;
  const kids = [];
  for (let j = i + 1; j < secs.length && secs[j].depth > 2; j++) kids.push(secs[j]);
  return { ...secs[i], kids };
}
function field(src, name) {
  const m = new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, 'mi').exec(src);
  return m ? m[1].trim() : null;
}
function level(text) {
  const m = /\b(HIGH|MEDIUM-HIGH|MEDIUM|LOW-MEDIUM|MEDIUM-LOW|LOW)\b/.exec(text || '');
  return m ? m[1] : null;
}
function paragraphs(lines) {
  const out = [];
  let cur = [];
  for (const l of lines) {
    if (/^\s*$/.test(l) || /^---\s*$/.test(l)) { if (cur.length) out.push(cur.join(' ')); cur = []; }
    else cur.push(l.trim());
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}
// List items (- or 1.), continuation lines folded in; "**Lead:** body" / "**Lead** body" split.
function items(lines) {
  const out = [];
  for (const l of lines) {
    if (/^\s*([-*]|\d+\.)\s+/.test(l) && !/^\s{2,}/.test(l)) out.push(l.replace(/^\s*([-*]|\d+\.)\s+/, '').replace(/^\[[ x]\]\s*/, ''));
    else if (/^\s+\S/.test(l) && out.length) out[out.length - 1] += ' ' + l.trim();
  }
  return out.map((t) => {
    const m = /^\*\*(.+?)\*\*:?\s*(.*)$/.exec(t);
    return m ? { lead: m[1].replace(/[:.]$/, ''), body: m[2] } : { lead: null, body: t };
  });
}
function tableRows(lines) {
  return lines.filter((l) => /^\|/.test(l.trim()) && !/^\|\s*:?-{3,}/.test(l.trim()))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .slice(1);
}

function head(src) {
  const confidence = field(src, '(?:Overall )?[Cc]onfidence');
  return {
    title: (/^# (.+)$/m.exec(src) || [])[1] || null,
    project: field(src, 'Project'),
    domain: field(src, 'Domain'),
    scope: field(src, 'Scope'),
    researched: field(src, 'Researched'),
    confidence: { level: level(confidence), note: confidence },
  };
}

function summary(src) {
  const secs = sections(src);
  const exec = block(secs, /^Executive Summary/i);
  const imp = block(secs, /^Implications for Roadmap/i);
  const conf = block(secs, /^Confidence Assessment/i);
  const findings = block(secs, /^Key Findings/i);

  // Suggested build order: every "### Phase N: Name" under Implications.
  const phases = [];
  let rationale = [], flags = { needs: [], standard: [] }, preamble = [];
  if (imp) {
    preamble = paragraphs(imp.body).filter((p) => !/^\s*$/.test(p));
    for (const k of imp.kids) {
      const pm = /^Phase\s+(\w+):\s*(.+)$/i.exec(k.title);
      if (pm) {
        const text = k.body.join('\n');
        const f = {};
        let cur = null;
        for (const l of k.body) {
          const m = /^\*\*([^*]+?):\*\*\s*(.*)$/.exec(l.trim());
          if (m) { cur = m[1].trim().toLowerCase(); f[cur] = m[2] ? [m[2]] : []; }
          else if (cur && /^\s*[-*]\s+/.test(l)) f[cur].push(l.replace(/^\s*[-*]\s+/, ''));
          else if (cur && l.trim() && f[cur].length) f[cur][f[cur].length - 1] += ' ' + l.trim();
        }
        const name = pm[2].replace(/\s*\((parallel[^)]*)\)\s*$/i, '').trim();
        const para = /\((parallel with Phase (\d+))\)/i.exec(pm[2]) || /parallel with Phase (\d+)/i.exec(text) || /overlap Phase (\d+)/i.exec(text);
        const pitfalls = [...new Set(((f.avoids || []).join(' ').match(/\d+/g) || []).map(Number))];
        phases.push({
          n: pm[1], name, line: k.line,
          rationale: (f.rationale || []).join(' '),
          delivers: f.delivers || [],
          uses: (f.uses || []).join(' ') || null,
          implements: (f.implements || []).join(' ') || null,
          addresses: (f.addresses || []).join(' ') || null,
          keeps: (f.keeps || []).join(' ') || null,
          gate: (f.gate || f.gates || []).join(' ') || null,
          flag: (f['research flags'] || []).join(' ') || null,
          avoids: pitfalls,
          avoidsText: (f.avoids || []).join(' ') || null,
          parallel: para ? Number(para[para.length - 1]) : null,
        });
      } else if (/Ordering Rationale/i.test(k.title)) {
        rationale = items(k.body).map((x) => (x.lead ? `**${x.lead}** ${x.body}` : x.body));
      } else if (/Research Flags/i.test(k.title)) {
        let mode = 'needs';
        for (const l of k.body) {
          if (/^\S.*(standard|skip)/i.test(l)) mode = 'standard';
          else if (/^\S.*(need|deeper)/i.test(l)) mode = 'needs';
          const it = items([l])[0];
          if (it && /^\s*[-*]/.test(l)) {
            const ph = /Phase\s+(\w+)/i.exec(it.lead || it.body);
            flags[mode].push({ phase: ph ? ph[1] : null, lead: it.lead, body: it.body });
          }
        }
      }
    }
  }
  const gapsSec = secs.find((s) => /^Gaps to Address/i.test(s.title));
  const gaps = gapsSec ? items(gapsSec.body) : [];
  const areas = conf ? tableRows(conf.body).map((r) => ({ area: r[0].replace(/\*/g, ''), level: level(r[1]), raw: r[1], note: r[2] })) : [];
  const om = conf ? /\*\*Overall confidence:?\s*([^*]*)\*\*:?\s*(.*)/i.exec(conf.body.join('\n')) : null;
  const overall = om ? [null, `${om[1]} ${om[2]}`.trim()] : [];
  const keyFindings = {};
  if (findings) for (const k of findings.kids) {
    const doc = /stack/i.test(k.title) ? 'stack' : /feature/i.test(k.title) ? 'features' : /architect/i.test(k.title) ? 'architecture' : /pitfall/i.test(k.title) ? 'pitfalls' : null;
    if (doc) keyFindings[doc] = { title: k.title, line: k.line, lede: paragraphs(k.body).find((p) => !/^\*\*[^*]+:\*\*$/.test(p) && !/^[-*\d]/.test(p)) || null };
  }
  // Everything else in the file: one chip each ("Also in this file").
  const used = /^(Executive Summary|Key Findings|Implications for Roadmap|Confidence Assessment)/i;
  const also = secs.filter((s) => s.depth === 2 && !used.test(s.title)).map((s) => ({ title: s.title.replace(/\s*\(.*\)\s*$/, ''), line: s.line }));
  return {
    exec: exec ? paragraphs(exec.body) : [],
    phases, rationale, flags, preamble, gaps, areas, keyFindings, also,
    gapsLine: gapsSec ? gapsSec.line : null,
    overall: overall[1] || overall[2] || null,
  };
}

// Per-document head plus the numbers a frame might show for it.
function stats(name, src) {
  const secs = sections(src);
  const rowsUnder = (re) => { const b = block(secs, re); if (!b) return 0; return tableRows([...b.body, ...b.kids.flatMap((k) => ['', '| h |', ...k.body])]).filter((r) => r.length > 1 && r[0] && r[0] !== 'h').length; };
  // A section's table rows, its deeper subsections included (Cinedise groups table stakes under ####).
  const subRows = (re) => Math.max(0, ...secs.map((x, i) => {
    if (x.depth < 2 || !re.test(x.title)) return 0;
    let n = tableRows(x.body).length;
    for (let j = i + 1; j < secs.length && secs[j].depth > x.depth; j++) n += tableRows(secs[j].body).length;
    return n;
  }));
  const count = (re) => secs.filter((s) => re.test(s.title)).length;
  switch (name) {
    case 'STACK': return {
      groups: (() => { const b = block(secs, /^Recommended Stack/i); return b ? b.kids.map((k) => ({ title: k.title.replace(/\s*\(.*\)\s*$/, ''), names: tableRows(k.body).map((r) => r[0].replace(/\*\*|`/g, '')) })).filter((g) => g.names.length) : []; })(),
      headline: (() => { const b = block(secs, /^(The Decision|Headline)/i); return b ? paragraphs(b.body)[0] : null; })(),
      numbers: [['stack entries', rowsUnder(/^Recommended Stack/i)], ['alternatives weighed', rowsUnder(/^Alternatives Considered/i)], ['to avoid', rowsUnder(/^What NOT to/i)]],
    };
    case 'FEATURES': return {
      kinds: [['expected', /Table Stakes/i], ['differentiators', /Differentiators/i], ['anti', /Anti-Features/i]].map(([k, re]) => {
        let best = [];
        secs.forEach((x, i) => {
          if (x.depth < 2 || !re.test(x.title)) return;
          let rows = tableRows(x.body);
          for (let j = i + 1; j < secs.length && secs[j].depth > x.depth; j++) rows = rows.concat(tableRows(secs[j].body));
          if (rows.length > best.length) best = rows;
        });
        return { kind: k, names: best.map((r) => r[0].replace(/\*\*|`/g, '')) };
      }),
      headline: null,
      numbers: [['table stakes', subRows(/Table Stakes/i)], ['differentiators', subRows(/Differentiators/i)], ['anti-features', subRows(/Anti-Features/i)]],
    };
    case 'ARCHITECTURE': return {
      headline: null,
      numbers: [['components', subRows(/Component Responsibilities/i)], ['anti-patterns', count(/^Anti-Pattern \d+/i)], ['patterns', count(/^Pattern \d+/i)]],
    };
    case 'PITFALLS': return {
      titles: secs.filter((x) => /^Pitfall \d+:/i.test(x.title)).map((x) => x.title.replace(/^Pitfall \d+:\s*/i, '')),
      headline: null,
      numbers: [['critical pitfalls', count(/^Pitfall \d+/i)], ['checks before done', (() => { const s = secs.find((x) => /Looks Done/i.test(x.title)); return s ? items(s.body).length : 0; })()]],
    };
  }
  return {};
}

const out = {};
for (const [key, dir] of Object.entries(SOURCES)) {
  const project = { docs: {} };
  for (const d of DOCS) {
    const src = readFileSync(`${dir}/${d}.md`, 'utf8');
    project.docs[d.toLowerCase()] = { file: `.planning/research/${d}.md`, lines: src.split('\n').length, ...head(src), ...(d === 'SUMMARY' ? summary(src) : stats(d, src)) };
  }
  const g = GRAPHS[key];
  project.docs.architecture.diagram = { graph: g, layout: layoutLanes(g, 940) };
  out[key] = project;
}
writeFileSync(`${HERE}data.js`, `// Generated by gen-data.mjs from two projects' .planning/research/*.md\nwindow.RESEARCH = ${JSON.stringify(out, null, 1)};\n`);
console.log('wrote data.js');
