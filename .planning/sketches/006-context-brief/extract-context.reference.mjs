// Extracts a CONTEXT.md into the JSON shape sketch 005 renders. Throwaway, sketch-only.
import { readFileSync } from 'node:fs';

const [, , file, id] = process.argv;
const src = readFileSync(file, 'utf8');
const lines = src.split('\n');

const md = (s) => s.replace(/\s+/g, ' ').trim();
// split a markdown blob into top-level bullets (continuation lines indented)
function bullets(text) {
  const out = [];
  let cur = null;
  for (const l of text.split('\n')) {
    if (/^- /.test(l)) { if (cur) out.push(cur); cur = l.slice(2); }
    else if (cur !== null && /^\s+\S/.test(l)) cur += '\n' + l.trim();
    else if (cur !== null && l.trim() === '') { out.push(cur); cur = null; }
    else if (cur !== null) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out.map(md);
}
function section(re, endRe = /^## /) {
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) return '';
  let j = i + 1;
  while (j < lines.length && !endRe.test(lines[j]) && !/^<\//.test(lines[j])) j++;
  return lines.slice(i + 1, j).join('\n');
}
function subsections(text) {
  const out = [];
  let cur = null;
  for (const l of text.split('\n')) {
    const m = /^### (.+)/.exec(l);
    if (m) { if (cur) out.push(cur); cur = { title: m[1].trim(), body: '' }; }
    else if (cur) cur.body += l + '\n';
    else { out.push({ title: null, body: l + '\n' }); }
  }
  if (cur) out.push(cur);
  // merge leading null-title chunks
  const merged = [];
  for (const s of out) {
    if (s.title === null && merged.length && merged[merged.length - 1].title === null) merged[merged.length - 1].body += s.body;
    else merged.push(s);
  }
  return merged;
}
function firstSentence(s) {
  // protect sentence punctuation inside `code`, then never end inside **bold**
  const prot = s.replace(/`[^`]*`/g, (c) => c.replace(/[.?!]/g, '\u2024'));
  const re = /[.!?](?=\s|$)/g;
  let m, cut = s.length;
  while ((m = re.exec(prot))) {
    let end = m.index + 1;
    if (/\b(e\.g|i\.e|etc|vs|cf)\.$/i.test(prot.slice(Math.max(0, end - 5), end))) continue;
    const before = prot.slice(0, end);
    if ((before.match(/\*\*/g) || []).length % 2 === 1) {
      if (prot.slice(end, end + 2) === '**') end += 2; else continue;
    }
    cut = end; break;
  }
  return [s.slice(0, cut), s.slice(cut).trim()];
}
const unmd = (s) => s;

const title = /^# (.+?)( - Context)?$/.exec(lines[0])?.[1] ?? '';
const gathered = /\*\*Gathered:\*\*\s*(.+)/.exec(src)?.[1].trim() ?? null;
const status = /\*\*Status:\*\*\s*(.+)/.exec(src)?.[1].trim() ?? null;

// boundary
const bRaw = section(/^## Phase Boundary/);
const inScope = /\*\*In scope:\*\*([\s\S]*?)(\n\n|$)/.exec(bRaw)?.[1];
const notIdx = bRaw.search(/\*\*Not (in scope|this phase)[^*]*\*\*/);
let summary = bRaw.split(/\n\n/).map(md).filter((p) => p && !p.startsWith('**') && !p.startsWith('-') && !p.startsWith('|'));
let inList = inScope ? md(inScope).split(/,\s+(?:and\s+)?|;\s+/).map((s) => s.replace(/\.$/, '')) : [];
let outList = [];
let drift = false;
if (notIdx >= 0) {
  const tail = bRaw.slice(notIdx);
  drift = /drift/i.test(tail.split('\n')[0]);
  const bl = bullets(tail.split('\n').slice(1).join('\n'));
  if (bl.length) outList = bl;
  else outList = [md(tail.replace(/\*\*[^*]+\*\*/, ''))];
}
let outFromProse = false;
if (!outList.length) {
  // prose: "This phase does not add X, does not Y, and does not Z."
  const p = summary.find((s) => /does not|not this phase/i.test(s));
  if (p) {
    outFromProse = true;
    summary = summary.filter((s) => s !== p);
    const items = [];
    p.replace(/^This phase /, '').replace(/\s+—[^—]+—/g, '').split(/,\s+(?:and\s+)?(?=does not|not )/).forEach((raw) => {
      const t = raw.trim().replace(/\.$/, '').replace(/^and\s+/, '').replace(/^does not\s+/, '');
      const m = /^(\w+)\s+(.*\([A-Z]+-\d+\).*)$/.exec(t);
      if (m) m[2].split(/,\s+|\s+or\s+/).forEach((x) => items.push(m[1] + ' ' + x));
      else items.push(t);
    });
    outList = items;
  }
}

// decisions
const dRaw = section(/^## Implementation Decisions/);
const areas = [];
let openQs = [];
let discretion = [];
for (const s of subsections(dRaw)) {
  if (!s.title) continue;
  if (/open questions/i.test(s.title)) {
    openQs = bullets(s.body).map((b) => {
      const m = /^\*\*(OPEN-\d+)(?:\s*\((blocks [^)]+)\))?:\*\*\s*(.*)$/.exec(b);
      if (!m) return { tag: null, blocks: null, summary: b, detail: '' };
      const [sum, rest] = firstSentence(m[3]);
      return { tag: m[1], blocks: m[2]?.replace(/^blocks\s+/, '') ?? null, summary: unmd(sum), detail: unmd(rest) };
    });
    continue;
  }
  if (/discretion/i.test(s.title)) {
    const bl = bullets(s.body);
    discretion = bl.length ? bl : s.body.split(/\n\n/).map(md).filter(Boolean);
    continue;
  }
  const decisions = bullets(s.body).map((b) => {
    const m = /^\*\*(D-\d+):\*\*\s*(.*)$/.exec(b);
    if (!m) return { tag: null, summary: b, detail: '', reversibility: null };
    let body = m[2];
    let reversibility = null;
    const r = /\s*—\s*\*\*Reversibility:\*\*\s*(.*)$/.exec(body);
    if (r) { reversibility = r[1]; body = body.slice(0, r.index); }
    const [sum, rest] = firstSentence(body);
    return { tag: m[1], summary: unmd(sum), detail: unmd(rest), reversibility };
  });
  areas.push({ title: s.title, decisions });
}

const listSection = (re) => bullets(section(re)).map((b) => {
  const m = /^\*\*(.+?)\*\*\s*[—–-]?\s*(.*)$/.exec(b);
  return m ? { title: m[1].replace(/[.:]$/, ''), body: m[2] } : { title: null, body: b };
});
const specifics = listSection(/^## Specific Ideas/);
const deferred = listSection(/^## Deferred Ideas/);
const groups = (re) => subsections(section(re)).filter((s) => s.title).map((s) => ({ title: s.title, items: bullets(s.body) }));
const refs = groups(/^## Canonical References/);
const code = groups(/^## Existing Code Insights/);

console.log(JSON.stringify({ id, file: file.replace(/^.*?\.planning/, '.planning'), title, gathered, status,
  boundary: { summary, inList, outList, drift, outFromProse },
  areas, openQs, discretion, specifics, deferred, refs, code }, null, 1));
