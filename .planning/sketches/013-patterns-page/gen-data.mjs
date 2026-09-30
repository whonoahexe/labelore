// Sketch 013 data generator. Reads real PATTERNS.md files and writes data.js with only the
// human-facing parts: cover facts, the merged file map (classification + assignment + no-analog
// reason), shared patterns, planner notes and the search scope. Code excerpts are counted, not kept.
// Run: node .planning/sketches/013-patterns-page/gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const SP = '/home/cinedise/studio-portal/.planning';
const LB = '/home/cinedise/labelore/.planning';
const SOURCES = {
  sp02: { project: 'studio-portal', label: 'sp v1.0/02 (hard)', path: `${SP}/milestones/v1.0-phases/02-storage-health-status/02-PATTERNS.md` },
  sp04: { project: 'studio-portal', label: 'sp P4 (grouped)', path: `${SP}/phases/04-bulk-archive-downloads/04-PATTERNS.md` },
  sp01: { project: 'studio-portal', label: 'sp P1', path: `${SP}/phases/01-portal-owned-identity-sessions/01-PATTERNS.md` },
  lb05: { project: 'labelore', label: 'labelore 05 (clean)', path: `${LB}/milestones/v1.1-phases/05-per-type-document-views/05-PATTERNS.md` },
};

const stripCode = s => s.replace(/```[\s\S]*?```/g, '');
const bold = (body, key) => {
  const m = body.match(new RegExp(`\\*\\*${key}:?\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\s*\\n|\\n\\*\\*[A-Z][^*]{0,40}:?\\*\\*|$)`));
  return m ? m[1].replace(/\s*\n\s*/g, ' ').trim() : null;
};
function splitBy(body, level) {
  const re = new RegExp(`^${'#'.repeat(level)} (.+)$`, 'gm'), out = [];
  let m, last = null;
  while ((m = re.exec(body))) {
    if (last) last.body = body.slice(last.start, m.index);
    last = { title: m[1].trim(), start: m.index + m[0].length };
    out.push(last);
  }
  if (last) last.body = body.slice(last.start);
  return out;
}
function table(body) {
  const lines = body.split('\n').filter(l => /^\s*\|/.test(l));
  if (lines.length < 3) return [];
  const cells = l => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());
  const head = cells(lines[0]).map(h => h.toLowerCase());
  return lines.slice(2).map(l => Object.fromEntries(cells(l).map((c, i) => [head[i] ?? i, c])));
}
const paths = s => [...String(s).matchAll(/`([^`]+)`/g)].map(m => m[1]);
function quality(raw) {
  const s = raw.replace(/\*/g, '').toLowerCase();
  if (/^no analog|^none|n\/a/.test(s)) return 'none';
  if (/^partial/.test(s)) return 'partial';
  if (/^role/.test(s)) return 'role';
  if (/^exact/.test(s)) return 'exact';
  return 'role';
}
const qualifier = raw => {
  const s = raw.replace(/\*/g, '');
  const m = s.match(/\((.+)\)|—\s*(.+)$/);
  return m ? (m[1] || m[2]).trim() : null;
};
function paragraphs(body) {
  return stripCode(body).replace(/^>\s?/gm, '').replace(/^#{3,}\s+(.+)$/gm, '**$1**').split(/\n\s*\n/).map(p => p.split('\n').map(l => l.trim()).join('\n').trim())
    .filter(p => p && !/^\*\*(Analog|Apply to|Source|Sources|Use instead)s?:?\*\*/.test(p) && !/^\|/.test(p) && !/^---$/.test(p) && !/^#/.test(p));
}

function parse(key) {
  const src = SOURCES[key], text = readFileSync(src.path, 'utf8');
  const h1 = text.match(/^# (.+)$/m)[1];
  const tm = h1.match(/^Phase (\S+):\s*(.+?)\s*-\s*Pattern Map$/);
  const secs = splitBy(text, 2);
  const pre = text.slice(text.indexOf(h1) + h1.length, secs[0]?.start ?? text.length);
  const fact = k => { const m = pre.match(new RegExp(`\\*\\*${k}:\\*\\*\\s*(.+)`)); return m ? m[1].trim() : null; };
  const preNotes = paragraphs(pre).filter(p => !/^\*\*(Mapped|Files analyzed|Analogs found)/.test(p));
  const sec = name => secs.find(s => s.title.toLowerCase().startsWith(name));

  // File classification (optionally grouped by ###)
  const files = [];
  const cls = sec('file classification');
  if (cls) {
    const groups = splitBy(cls.body, 3);
    const blocks = groups.length ? groups.map(g => ({ group: g.title, body: g.body })) : [{ group: null, body: cls.body }];
    for (const b of blocks) for (const r of table(b.body)) {
      const fileCell = r['new/modified file'] ?? r['file'] ?? Object.values(r)[0];
      const q = r['match quality'] ?? '';
      files.push({
        file: fileCell, group: b.group, role: r['role'] ?? '', flow: r['data flow'] ?? '',
        analog: r['closest analog'] ?? '', q: quality(q), qNote: qualifier(q),
      });
    }
  }
  // No analog found
  const noA = sec('no analog');
  const noAnalog = noA ? table(noA.body).map(r => ({ file: r.file, reason: r.reason })) : [];
  const noAIntro = noA ? paragraphs(noA.body)[0] ?? null : null;

  // Pattern assignments
  const pa = sec('pattern assignments');
  const assignments = pa ? splitBy(pa.body, 3).map(a => {
    const heading = a.title;
    const tail = heading.replace(/`[^`]+`/g, '').replace(/^[\s,]*(and|or)?\s*/, '').trim();
    return {
      heading, targets: paths(heading.split('(')[0]).length ? paths(heading.split('(')[0]) : [],
      tail, analog: bold(a.body, 'Analog'), applyTo: bold(a.body, 'Apply to'), useInstead: bold(a.body, 'Use instead'),
      guidance: paragraphs(a.body).filter(p => !/^\*\*[^*]+\*\*\s*\(/.test(p) && !/^\*\*[^*]+:\*\*$/.test(p)).slice(0, 2),
      excerpts: (a.body.match(/```/g) || []).length / 2,
    };
  }) : [];

  // Shared patterns
  const sh = sec('shared patterns');
  const shared = sh ? splitBy(sh.body, 3).map(s => ({
    name: s.title, source: bold(s.body, 'Sources?') , applyTo: bold(s.body, 'Apply to'),
    rule: paragraphs(s.body)[0] ?? null, excerpts: (s.body.match(/```/g) || []).length / 2,
  })) : [];

  // Other human-facing sections (cross-cutting notes, scope basis)
  const known = /^(file classification|pattern assignments|shared patterns|no analog|metadata)/i;
  const other = secs.filter(s => !known.test(s.title)).map(s => ({
    title: s.title,
    items: stripCode(s.body).split(/\n(?=\d+\.\s|- )/).map(x => x.replace(/^\d+\.\s|^- /, '').replace(/\s*\n\s*/g, ' ').trim()).filter(x => x && !/^---$/.test(x)),
  }));

  const meta = sec('metadata');
  return {
    project: src.project, label: src.label, file: src.path.split('/').pop(),
    phase: tm ? tm[1] : '?', title: tm ? tm[2] : h1,
    mapped: fact('Mapped'), filesAnalyzed: fact('Files analyzed'), analogsFound: fact('Analogs found'),
    preNotes, files, noAnalog, noAIntro, assignments, shared, other,
    scope: meta ? bold(meta.body, 'Analog search scope') : null,
    scanned: meta ? bold(meta.body, 'Files scanned') : null,
    lines: text.split('\n').length,
  };
}

const DOCS = Object.fromEntries(Object.keys(SOURCES).map(k => [k, parse(k)]));
writeFileSync(new URL('./data.js', import.meta.url),
  `// Generated by gen-data.mjs from real PATTERNS.md files — do not edit by hand.\nconst DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const [k, d] of Object.entries(DOCS)) {
  const q = d.files.reduce((a, f) => (a[f.q] = (a[f.q] || 0) + 1, a), {});
  console.log(k, d.title, '| files', d.files.length, JSON.stringify(q), '| assign', d.assignments.length, '| shared', d.shared.length, '| noA', d.noAnalog.length, '| other', d.other.map(o => o.title).join('; '), '| scope', !!d.scope);
}
