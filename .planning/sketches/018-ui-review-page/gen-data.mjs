// Sketch 018 data generator. Reads real UI-REVIEW.md files (plus one labelled synthetic doc with
// low scores) and writes data.js: frontmatter, header facts, pillar scores, top fixes (split into
// issue / impact / fix, with file refs and the pillars they touch), per-pillar findings (grouped,
// each item classed pass / flag / fail), and the back matter.
// Run: node .planning/sketches/018-ui-review-page/gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const LB = '/home/cinedise/labelore/.planning/milestones';
const HERE = '/home/cinedise/labelore/.planning/sketches/018-ui-review-page';
const SOURCES = {
  syn: { label: 'synthetic (17/24)', path: `${HERE}/synthetic-UI-REVIEW.md`, synthetic: true },
  lb05: { label: 'labelore 05 (22/24)', path: `${LB}/v1.1-phases/05-per-type-document-views/05-UI-REVIEW.md` },
  sp03: { label: 'sp 03 (22/24, corrected)', path: '/home/cinedise/studio-portal/.planning/phases/03-account-administration-session-control/03-UI-REVIEW.md' },
  lb03: { label: 'labelore 03 (24/24, superseded ×2)', path: `${LB}/v1.0-phases/03-search-browsing-traceability/03-UI-REVIEW.md` },
  lb04: { label: 'labelore 04 (24/24, no fixes)', path: `${LB}/v1.0-phases/04-portability-degradation-hardening/04-UI-REVIEW.md` },
};

const PILLARS = ['Copywriting', 'Visuals', 'Color', 'Typography', 'Spacing', 'Experience Design'];
const KEYWORDS = [
  [/copy|label|string|wording|empty.state copy/i, 'Copywriting'],
  [/visual|hierarch|focal|icon|depth|tree-marker|scannab/i, 'Visuals'],
  [/colou?r|contrast|opacity|veil|destructive|hue|oklch|tone/i, 'Color'],
  [/typograph|font|weight|emphasis/i, 'Typography'],
  [/spacing|gap|padding|margin|px\b|scale/i, 'Spacing'],
  [/experience|state|keyboard|focus|scroll|interact|clipp|overflow|mouse|responsive|readab/i, 'Experience Design'],
];

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (m) for (const l of m[1].split('\n')) { const k = l.match(/^([\w_]+):\s*(.*)$/); if (k) fm[k[1]] = k[2].replace(/^"|"$/g, ''); }
  return { fm, body: m ? text.slice(m[0].length) : text };
}
function sections(body, level = 2) {
  const re = new RegExp(`^${'#'.repeat(level)} (.+)$`, 'gm'), out = []; let m, last = null, pre = body;
  while ((m = re.exec(body))) { if (last) last.body = body.slice(last.start, m.index); else pre = body.slice(0, m.index); last = { title: m[1].trim(), start: m.index + m[0].length }; out.push(last); }
  if (last) last.body = body.slice(last.start);
  return { pre, secs: out.map(s => ({ title: s.title, body: s.body.replace(/\n---\s*$/, '').replace(/^\s*---\s*$/gm, '').trim() })) };
}
// header bold facts (**Audited:** …) and a trailing list (Prior reviews superseded)
function headerFacts(pre) {
  const facts = {}; let key = null; const lists = {};
  for (const l of pre.split('\n')) {
    const m = l.match(/^\*\*([^*]+?):\*\*\s*(.*?)\s*$/);
    if (m) { key = m[1].trim(); facts[key] = m[2].trim(); continue; }
    const b = l.match(/^\s*-\s+(.*)$/);
    if (b && key) (lists[key] ??= []).push(b[1].trim());
  }
  return { facts, lists };
}
const cells = l => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());
function pillarTable(body) {
  const rows = body.split('\n').filter(l => /^\|\s*\d\./.test(l)).map(cells);
  const overall = body.match(/\*\*Overall:\s*(\d+)\s*\/\s*(\d+)\*\*/);
  return { rows: rows.map(r => ({ name: r[0].replace(/^\d\.\s*/, ''), score: +r[1].split('/')[0], key: r[2] })), overall: overall ? [+overall[1], +overall[2]] : null };
}
const fileRefs = s => [...new Set((String(s).match(/[\w@./[\]-]+\.(?:tsx|ts|css|md|html|json|mjs)(?::\d+(?:[-–,]\d+)*)?/g) ?? []))];
function pillarsFor(text) {
  const hits = PILLARS.filter(p => new RegExp(`\\b${p.replace(' ', '\\s')}\\b`, 'i').test(text));
  if (hits.length) return hits;
  for (const [re, p] of KEYWORDS) if (re.test(text)) return [p];
  return [];
}
function fixes(body) {
  if (!body) return { items: [], note: null };
  const items = []; let cur = null;
  for (const l of body.split('\n')) {
    const m = l.match(/^(\d+)\.\s+(.*)$/);
    if (m) { cur = { n: +m[1], raw: m[2] }; items.push(cur); continue; }
    if (cur && l.trim()) cur.raw += ' ' + l.trim();
  }
  const note = items.length ? null : body.replace(/^\*|\*$/g, '').replace(/^\(|\)$/g, '').trim();
  return { note, items: items.map(it => {
    const t = it.raw.match(/^\*\*(.+?)\*\*\s*(?:—|-|:)?\s*([\s\S]*)$/);
    const title = t ? t[1].replace(/\.$/, '') : it.raw; let rest = t ? t[2] : '';
    let impact = null, fix = null;
    const im = rest.match(/\*\*User impact:\*\*\s*([\s\S]*?)(?=\*\*Fix:\*\*|$)/); const fx = rest.match(/\*\*Fix:\*\*\s*([\s\S]*)$/);
    if (im || fx) { impact = im?.[1].trim() ?? null; fix = fx?.[1].trim() ?? null; rest = rest.replace(/\*\*User impact:\*\*[\s\S]*$/, '').replace(/\*\*Fix:\*\*[\s\S]*$/, '').trim(); }
    else { const parts = rest.split(/\s+—\s+/); if (parts.length >= 3) { impact = parts[1]; fix = parts.slice(2).join(' — '); rest = parts[0]; } }
    const none = /^no (third|further) fix/i.test(title);
    const byTitle = pillarsFor(title);
    return { n: it.n, title, context: rest || null, impact, fix, refs: fileRefs(it.raw), pillars: byTitle.length ? byTitle : pillarsFor(it.raw), none };
  }) };
}
function classify(line) {
  if (/❌|✗\s*$|✗(?=\s|$)/.test(line)) return 'fail';
  if (/⚠️|⚠/.test(line)) return 'flag';
  if (/✅|✓/.test(line)) return 'pass';
  return 'note';
}
const VERDICT = /^\*\*(Score Justification|Assessment|Finding|Issue Finding):\*\*\s*/;
function pillarFindings(body) {
  const groups = []; let g = null; let verdict = null; const extra = []; let item = null;
  const lines = body.split('\n'); let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^```/.test(l)) { inCode = !inCode; if (item) item.code = (item.code ?? '') + (inCode ? '' : ''); continue; }
    if (inCode) { if (item) item.code = (item.code ? item.code + '\n' : '') + l; continue; }
    if (!l.trim()) { item = null; continue; }
    if (VERDICT.test(l)) { verdict = l.replace(VERDICT, '').trim(); item = null; continue; }
    const head = l.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
    if (head && !/^\s*-/.test(l)) {
      const k = head[1].trim();
      if (/^(Contract|Audit Method)$/i.test(k)) { extra.push({ k, v: head[2] }); continue; }
      g = { title: k, lead: head[2] || null, items: [] }; groups.push(g); item = null;
      if (head[2] && classify(head[2]) !== 'note') { g.items.push({ text: head[2], kind: classify(head[2]) }); g.lead = null; }
      continue;
    }
    const b = l.match(/^(\s*)[-*]\s+(.*)$/);
    if (b) {
      if (!g) { g = { title: null, lead: null, items: [] }; groups.push(g); }
      if (b[1].length >= 2 && item) { (item.sub ??= []).push(b[2]); continue; }
      item = { text: b[2], kind: classify(b[2]) }; g.items.push(item); continue;
    }
    const n = l.match(/^\s*\d+\.\s+(.*)$/);
    if (n && item) { (item.sub ??= []).push(n[1]); continue; }
    // a standalone ✅/⚠️ paragraph is an item too
    if (classify(l) !== 'note' && /^(✅|⚠️|❌)/.test(l.trim())) { if (!g) { g = { title: null, lead: null, items: [] }; groups.push(g); } item = { text: l.trim(), kind: classify(l) }; g.items.push(item); continue; }
    if (item) { item.text += ' ' + l.trim(); if (item.kind === 'note') item.kind = classify(item.text); continue; }
    if (g) { g.items.push({ text: l.trim(), kind: classify(l) }); continue; }
    extra.push({ k: null, v: l.trim() });
  }
  for (const gr of groups) for (const it of gr.items) { it.text = it.text.replace(/^(✅|⚠️|❌)\s*/, '').replace(/\s*(✓|✗)\s*$/, ''); it.refs = fileRefs(it.text); }
  return { groups: groups.filter(x => x.items.length || x.lead), verdict, extra };
}

const out = {};
for (const [k, src] of Object.entries(SOURCES)) {
  const text = readFileSync(src.path, 'utf8');
  const { fm, body } = frontmatter(text);
  const top = sections(body, 2);
  const title = (top.pre.match(/^# (.+)$/m) ?? [])[1] ?? '';
  const hf = headerFacts(top.pre.replace(/^# .+$/m, ''));
  const get = re => top.secs.find(s => re.test(s.title));
  const table = pillarTable(get(/^Pillar Scores/)?.body ?? '');
  const fx = fixes(get(/^Top 3 Priority Fixes/)?.body);
  const detail = sections(get(/^Detailed Findings/)?.body ?? '', 3).secs.map(s => {
    const m = s.title.match(/^Pillar\s+(\d):\s*(.+?)\s*\((\d)\/4\)/);
    return m ? { n: +m[1], name: m[2], score: +m[3], ...pillarFindings(s.body) } : { n: null, name: s.title, score: null, raw: s.body };
  });
  // a pillar that says "See Priority Fix N" is the authoritative link
  const seeRefs = {};
  for (const d of detail) if (d.n) { const t = JSON.stringify(d); for (const m of t.matchAll(/Priority Fix(?:es)?\s+([\d ,and]+)/g)) for (const n of m[1].match(/\d/g)) (seeRefs[n] ??= new Set()).add(d.name); }
  for (const f of fx.items) if (seeRefs[f.n]) f.pillars = [...seeRefs[f.n]];
  const pillars = table.rows.map((r, i) => {
    const d = detail.find(x => x.n === i + 1) ?? {};
    const fixRefs = fx.items.filter(f => !f.none && f.pillars.includes(r.name)).map(f => f.n);
    return { n: i + 1, name: r.name, score: r.score, key: r.key, verdict: d.verdict ?? null, groups: d.groups ?? [], extra: d.extra ?? [], fixes: fixRefs };
  });
  // back matter: every other ## section (and any ### under Detailed Findings that isn't a pillar)
  const known = /^(Pillar Scores|Top 3 Priority Fixes|Detailed Findings)$/;
  const back = top.secs.filter(s => !known.test(s.title)).map(s => ({ title: s.title, body: s.body }));
  for (const d of detail) if (d.n === null) back.push({ title: d.name, body: d.raw });
  // trailing *Phase: …* italic footer lines are noise
  for (const b of back) b.body = b.body.replace(/^\*[^*\n]+\*\s*$/gm, '').trim();
  // history: superseded reviews from header lists or a Supersession / Supersedes section
  const history = [];
  for (const l of [...(hf.lists['Prior reviews superseded'] ?? [])]) { const m = l.match(/^\*?\*?(\d{4}-\d{2}-\d{2}[^(]*?)\s*\((\d+)\/24\)\*?\*?\s*[—:-]?\s*(.*)$/); if (m) history.push({ when: m[1].trim(), score: +m[2], why: m[3] }); }
  const sup = back.find(b => /^Supersession/i.test(b.title));
  if (sup && !history.length) for (const l of sup.body.split('\n')) { const m = l.match(/^\s*-\s+\*\*(.+?)\*\*\s*\((\d+)\/24\)\s*[—-]\s*(.*)$/); if (m) history.push({ when: m[1].replace(/review/i, '').trim(), score: +m[2], why: m[3] }); }
  out[k] = {
    label: src.label, synthetic: !!src.synthetic, path: src.path.replace('/home/cinedise/', '~/'),
    fm, title, facts: hf.facts, history,
    overall: table.overall ?? [pillars.reduce((a, p) => a + p.score, 0), 24],
    pillars, fixes: fx.items, fixesNote: fx.note, back,
  };
}
writeFileSync(`${HERE}/data.js`, `// Generated by gen-data.mjs — do not edit.\nwindow.UIR_DOCS = ${JSON.stringify(out, null, 1)};\n`);
for (const [k, d] of Object.entries(out)) {
  console.log(k, d.overall.join('/'), 'fixes', d.fixes.length, d.fixes.map(f => `${f.n}:${f.pillars.join('+')}`).join(' '), '| history', d.history.length, '| back', d.back.map(b => b.title).join(', '));
  for (const p of d.pillars) console.log('   ', p.n, p.name, p.score, 'groups', p.groups.length, 'items', p.groups.flatMap(g => g.items).reduce((a, i) => (a[i.kind] = (a[i.kind] ?? 0) + 1, a), {}), 'fixes', p.fixes, p.verdict ? 'V' : '-');
}
