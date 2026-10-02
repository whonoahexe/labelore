// Sketch 017 data generator. Reads real SECURITY.md files (plus one labelled synthetic doc with
// open threats, derived from sp P3) and writes data.js: frontmatter, lead summary, trust
// boundaries, the threat register normalised to one row shape (incl. grouped registers),
// accepted risks, audit trail, extra sections and sign-off.
// Run: node .planning/sketches/017-security-page/gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const SP = '/home/cinedise/studio-portal/.planning/phases';
const LB = '/home/cinedise/labelore/.planning/milestones';
const SOURCES = {
  syn: { label: 'synthetic (open threats)', path: `${SP}/03-account-administration-session-control/03-SECURITY.md`, synthetic: true },
  sp1: { label: 'sp P1 (44, residuals)', path: `${SP}/01-portal-owned-identity-sessions/01-SECURITY.md` },
  sp3: { label: 'sp P3 (42, 11 accepted)', path: `${SP}/03-account-administration-session-control/03-SECURITY.md` },
  lb05: { label: 'labelore 05 (1 open, non-blocking)', path: `${LB}/v1.1-phases/05-per-type-document-views/05-SECURITY.md` },
  lb02: { label: 'labelore 02 (grouped register)', path: `${LB}/v1.0-phases/02-situational-awareness-artifact-reading/02-SECURITY.md` },
  lb04: { label: 'labelore 04 (prose risks)', path: `${LB}/v1.0-phases/04-portability-degradation-hardening/04-SECURITY.md` },
  lb01: { label: 'labelore 01', path: `${LB}/v1.0-phases/01-read-layer-domain-model/01-SECURITY.md` },
  fx: { label: 'labelore fixture (draft)', path: '/home/cinedise/labelore/fixtures/dense/.planning/phases/01-identity-slice/01-SECURITY.md' },
};

// Synthetic: sp P3 mid-audit — two high threats open (blocking), one low open below threshold,
// a second audit row, sign-off unticked.
function synthesize(text) {
  let n = 0;
  return text
    .replace(/^status: .*$/m, 'status: open').replace(/^threats_open: .*$/m, 'threats_open: 2')
    .replace(/^(\| T-\d+-\d+ \|.*\| high \| mitigate \|.*\| )closed( \|)$/gm, (m, a, b) => (n++ === 2 || n === 6) ? `${a}open${b}` : m)
    .replace(/^(\| T-\d+-\d+ \|.*\| low \| mitigate \|.*\| )closed( \|)$/m, '$1open — below high threshold (non-blocking)$2')
    .replace(/(\| Audit Date[^\n]*\n\|[-| ]+\|\n)/, '$1| 2026-08-19 | 42 | 39 | 3 (2 blocking) | /gsd-secure-phase (first pass) |\n')
    .replace(/- \[x\]/g, '- [ ]').replace(/\*\*Approval:\*\*.*/, '**Approval:** pending — two high threats open');
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (m) for (const l of m[1].split('\n')) { const k = l.match(/^([\w_]+):\s*(.*)$/); if (k) fm[k[1]] = k[2].replace(/^"|"$/g, ''); }
  return { fm, body: m ? text.slice(m[0].length) : text };
}
function sections(body) {
  const re = /^## (.+)$/gm, out = []; let m, last = null; let pre = body;
  while ((m = re.exec(body))) { if (last) last.body = body.slice(last.start, m.index); else pre = body.slice(0, m.index); last = { title: m[1].trim(), start: m.index + m[0].length }; out.push(last); }
  if (last) last.body = body.slice(last.start);
  return { pre, secs: out.map(s => ({ title: s.title, body: s.body.replace(/\n---\s*$/, '').trim() })) };
}
// split on | outside backtick spans
const cells = l => { const out = []; let cur = '', tick = false; const t = l.trim().replace(/^\||\|$/g, '');
  for (let i = 0; i < t.length; i++) { const ch = t[i]; if (ch === '`') tick = !tick; if (ch === '|' && !tick && t[i - 1] !== '\\') { out.push(cur.trim()); cur = ''; } else cur += ch; }
  out.push(cur.trim()); return out; };
function table(body) {
  const lines = body.split('\n'); const i = lines.findIndex((l, k) => /^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[k + 1] ?? ''));
  if (i < 0) return null;
  const head = cells(lines[i]).map(h => h.replace(/\*/g, '')); const rows = [];
  let k = i + 2; while (k < lines.length && /^\s*\|/.test(lines[k])) rows.push(cells(lines[k++]));
  return { head, rows, before: lines.slice(0, i).join('\n').trim(), after: lines.slice(k).join('\n').trim() };
}
const col = (head, re) => head.findIndex(h => re.test(h));
const SEVS = ['critical', 'high', 'medium', 'low'];
function severity(s) { const t = String(s).toLowerCase().replace(/\bmed\b/g, 'medium'); const hit = SEVS.find(v => t.includes(v)); return { top: hit ?? 'unknown', raw: s }; }
function status(s) {
  const t = String(s).toLowerCase().replace(/\*/g, '');
  if (/below|non-blocking/.test(t)) return 'open-low';
  if (/^open/.test(t)) return 'open';
  if (/accepted/.test(t)) return 'closed';
  if (/closed|verified|mitigated|resolved/.test(t)) return 'closed';
  return 'unknown';
}
function register(t) {
  const H = t.head; const g = re => col(H, re);
  const iId = g(/^(threat id|ids?)$/i), iGrp = g(/group/i), iCat = g(/category/i), iComp = g(/component/i), iSev = g(/^sev/i), iDisp = g(/disposition/i), iMit = g(/mitigation|evidence/i), iSt = g(/^status/i);
  const grouped = iGrp >= 0;
  return { grouped, rows: t.rows.map(r => ({
    id: r[iId] ?? '', group: grouped ? r[iGrp] : null, category: iCat >= 0 ? r[iCat] : '', component: iComp >= 0 ? r[iComp] : '',
    sev: severity(iSev >= 0 ? r[iSev] : ''), disposition: iDisp >= 0 ? r[iDisp] : '', mitigation: iMit >= 0 ? r[iMit] : '',
    status: status(iSt >= 0 ? r[iSt] : ''), statusRaw: iSt >= 0 ? r[iSt] : '',
  })) };
}
function bullets(body) {
  const items = []; const rest = [];
  for (const raw of body.split('\n')) {
    const m = raw.match(/^\s*[-*]\s+(\[( |x)\]\s+)?(.*)$/);
    if (m && !/^\s{4,}/.test(raw)) { items.push({ checked: m[2] === 'x', box: !!m[1], text: m[3] }); continue; }
    if (/^\s{2,}\S/.test(raw) && items.length) { items[items.length - 1].text += ' ' + raw.trim(); continue; }
    rest.push(raw);
  }
  return { items, rest: rest.join('\n').trim() };
}

const DOCS = {};
for (const [key, src] of Object.entries(SOURCES)) {
  let text = readFileSync(src.path, 'utf8');
  if (src.synthetic) text = synthesize(text);
  const { fm, body } = frontmatter(text);
  const { pre, secs } = sections(body);
  const lead = pre.replace(/^# .+$/m, '').replace(/^>.*$/gm, '').replace(/^---\s*$/gm, '').trim();
  const doc = { label: src.label, synthetic: !!src.synthetic, file: src.path.replace('/home/cinedise/', '~/'), fm, title: (body.match(/^# (.+)$/m) ?? [])[1] ?? '', lead,
    boundaries: null, register: null, registerNote: '', legend: '', risks: null, audit: null, signoff: null, extras: [] };
  for (const s of secs) {
    if (/trust boundar/i.test(s.title)) { const t = table(s.body); doc.boundaries = t ? { rows: t.rows.map(r => ({ name: r[0], desc: r[1] ?? '', data: r[2] ?? '' })), note: [t.before, t.after].filter(Boolean).join('\n\n') } : { rows: [], note: s.body }; }
    else if (/threat register/i.test(s.title)) { const t = table(s.body); if (t) { doc.register = register(t); doc.registerNote = t.before; doc.legend = t.after; } else doc.register = { grouped: false, rows: [], prose: s.body }; }
    else if (/accepted risk/i.test(s.title)) { const t = table(s.body); doc.risks = t ? { rows: t.rows.map(r => ({ id: r[0], ref: r[1], why: r[2], by: r[3], date: r[4] })), note: [t.before, t.after].filter(Boolean).join('\n\n') } : { rows: [], note: s.body }; }
    else if (/audit trail/i.test(s.title)) { const t = table(s.body); doc.audit = { rows: t ? t.rows.map(r => ({ date: r[0], total: r[1], closed: r[2], open: r[3], by: r[4] })) : [], note: t ? t.after : s.body }; }
    else if (/sign-?off/i.test(s.title)) { const b = bullets(s.body); const appr = s.body.match(/\*\*Approval:\*\*\s*(.*)/); doc.signoff = { items: b.items, approval: appr ? appr[1].trim() : null }; }
    else doc.extras.push(s);
  }
  DOCS[key] = doc;
}
writeFileSync(new URL('./data.js', import.meta.url), `// generated by gen-data.mjs — do not edit\nwindow.SEC_DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const [k, d] of Object.entries(DOCS)) {
  const r = d.register?.rows ?? [];
  console.log(k, d.fm.status, 'open', d.fm.threats_open, 'reg', r.length, d.register?.grouped ? 'grouped' : '', 'st', [...new Set(r.map(x => x.status))].join('/'), 'sev', [...new Set(r.map(x => x.sev.top))].join('/'), 'bnd', d.boundaries?.rows.length, 'risks', d.risks?.rows.length, 'audit', d.audit?.rows.length, 'extras', d.extras.map(e => e.title).join('|'));
}
