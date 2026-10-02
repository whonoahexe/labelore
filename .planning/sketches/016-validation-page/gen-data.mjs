// Sketch 016 data generator. Reads real VALIDATION.md files and writes data.js: frontmatter,
// test infrastructure (property/value), sampling cadence, the per-task map normalised to one row
// shape (whatever columns the doc used), Wave 0 items, manual-only verifications, sign-off.
// Run: node .planning/sketches/016-validation-page/gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const SP = '/home/cinedise/studio-portal/.planning';
const SOURCES = {
  sp2: { label: 'sp P2 (33 tasks, pending)', path: `${SP}/phases/02-roles-permission-enforcement/02-VALIDATION.md` },
  sp1: { label: 'sp P1 (green, observed)', path: `${SP}/phases/01-portal-owned-identity-sessions/01-VALIDATION.md` },
  sp3: { label: 'sp P3', path: `${SP}/phases/03-account-administration-session-control/03-VALIDATION.md` },
  sp4: { label: 'sp P4 (off-template)', path: `${SP}/phases/04-bulk-archive-downloads/04-VALIDATION.md` },
  v101: { label: 'sp v1.0/01', path: `${SP}/milestones/v1.0-phases/01-identity-persistence-foundation/01-VALIDATION.md` },
  v102: { label: 'sp v1.0/02 (TBD ids, mixed)', path: `${SP}/milestones/v1.0-phases/02-storage-health-status/02-VALIDATION.md` },
  v103: { label: 'sp v1.0/03', path: `${SP}/milestones/v1.0-phases/03-file-browsing/03-VALIDATION.md` },
  v104: { label: 'sp v1.0/04', path: `${SP}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-VALIDATION.md` },
  fx: { label: 'labelore fixture (tiny)', path: '/home/cinedise/labelore/fixtures/dense/.planning/phases/01-identity-slice/01-VALIDATION.md' },
};

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (m) for (const l of m[1].split('\n')) { const k = l.match(/^([\w_]+):\s*(.*)$/); if (k) fm[k[1]] = k[2].replace(/^"|"$/g, ''); }
  return { fm, body: m ? text.slice(m[0].length) : text };
}
function sections(body) {
  const re = /^## (.+)$/gm, out = []; let m, last = null;
  while ((m = re.exec(body))) { if (last) last.body = body.slice(last.start, m.index); last = { title: m[1].trim(), start: m.index + m[0].length }; out.push(last); }
  if (last) last.body = body.slice(last.start);
  return out.map(s => ({ title: s.title, body: s.body.replace(/\n---\s*$/, '').trim() }));
}
// split on | outside backtick spans (commands like --test-name-pattern='a|b')
const cells = l => { const out = []; let cur = '', tick = false; const t = l.trim().replace(/^\||\|$/g, '');
  for (let i = 0; i < t.length; i++) { const ch = t[i]; if (ch === '`') tick = !tick; if (ch === '|' && !tick && t[i - 1] !== '\\') { out.push(cur.trim()); cur = ''; } else cur += ch; }
  out.push(cur.trim()); return out; };
function table(body) {
  const lines = body.split('\n'); const i = lines.findIndex((l, k) => /^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[k + 1] ?? ''));
  if (i < 0) return null;
  const head = cells(lines[i]); const rows = [];
  let k = i + 2; while (k < lines.length && /^\s*\|/.test(lines[k])) rows.push(cells(lines[k++]));
  const before = lines.slice(0, i).join('\n').trim(); const after = lines.slice(k).join('\n').trim();
  return { head, rows, before, after };
}
const col = (head, re) => head.findIndex(h => re.test(h.replace(/\*/g, '')));
const split = s => String(s ?? '').split(/,\s*/).map(x => x.trim()).filter(x => x && !/^(—|-|n\/a)$/i.test(x));
function status(s) {
  if (!s) return 'none';
  if (/⬜|pending/i.test(s)) return 'pending';
  if (/✅|green/i.test(s)) return 'green';
  if (/❌|red/i.test(s)) return 'red';
  if (/⚠|flaky/i.test(s)) return 'flaky';
  return 'none';
}
function exists(s) {
  const t = String(s ?? '').trim();
  if (!t) return { k: 'unknown', note: '' };
  const note = t.replace(/^(✅|❌|⚠️?)\s*/, '').trim();
  if (/^(n\/a|N\/A)$/i.test(t)) return { k: 'na', note: '' };
  if (/^✅/.test(t)) return { k: 'yes', note: note === '' ? '' : note };
  if (/^❌/.test(t)) return { k: 'create', note };
  if (/^⚠/.test(t)) return { k: 'extend', note };
  return { k: 'unknown', note: t };
}
function testType(raw, cmd) {
  const s = String(raw ?? '').toLowerCase();
  if (s) return s;
  if (/checkpoint|manual|browser protocol|evidence/i.test(cmd)) return 'manual';
  if (/build|lint/i.test(cmd) && !/test/.test(cmd)) return 'build';
  return 'auto';
}
function mapRows(t) {
  const H = t.head;
  const iId = col(H, /^task/i), iPlan = col(H, /^plan$/i), iWave = col(H, /^wave/i), iReq = col(H, /^requirement/i), iThr = col(H, /threat/i),
    iBeh = col(H, /behaviou?r/i), iType = col(H, /test type/i), iCmd = col(H, /command|^verification$/i), iEx = col(H, /file exists/i), iSt = col(H, /^status/i), iPre = col(H, /prerequisite/i);
  return t.rows.map(r => {
    const id = r[iId] ?? '';
    const cmdRaw = iCmd >= 0 ? r[iCmd] : '';
    const plan = iPlan >= 0 ? r[iPlan] : (id.match(/^\d+-(\d+)-/)?.[1] ?? '');
    return {
      id, plan: plan.replace(/^\d+-(?=\d)/, ''), wave: iWave >= 0 ? r[iWave] : '',
      req: split(iReq >= 0 ? r[iReq] : ''), threat: split(iThr >= 0 ? r[iThr] : ''),
      behavior: iBeh >= 0 ? r[iBeh] : '', type: testType(iType >= 0 ? r[iType] : '', cmdRaw),
      command: cmdRaw, exists: iEx >= 0 ? exists(r[iEx]) : { k: 'unknown', note: '' },
      status: iSt >= 0 ? status(r[iSt]) : 'none', statusRaw: iSt >= 0 ? r[iSt] : '',
      prereq: iPre >= 0 ? r[iPre] : '',
    };
  });
}
function bullets(body) {
  const items = []; let lead = [], tail = [];
  for (const raw of body.split('\n')) {
    const m = raw.match(/^\s*[-*]\s+(\[( |x)\]\s+)?(.*)$/);
    if (m && !/^\s{4,}/.test(raw)) { items.push({ checked: m[2] === 'x', box: !!m[1], text: m[3] }); continue; }
    if (/^\s{2,}\S/.test(raw) && items.length) { items[items.length - 1].text += ' ' + raw.trim(); continue; }
    (items.length ? tail : lead).push(raw);
  }
  return { items, lead: lead.join('\n').trim(), tail: tail.join('\n').trim() };
}
function sampling(body) {
  const b = bullets(body);
  return { lead: b.lead, tail: b.tail, items: b.items.map(i => { const m = i.text.match(/^\*\*(.+?):?\*\*:?\s*(.*)$/); return m ? { when: m[1].replace(/:$/, ''), what: m[2] } : { when: null, what: i.text }; }) };
}

const DOCS = {};
for (const [key, src] of Object.entries(SOURCES)) {
  const text = readFileSync(src.path, 'utf8');
  const { fm, body } = frontmatter(text);
  const secs = sections(body);
  const doc = { label: src.label, file: src.path.replace('/home/cinedise/', '~/'), fm, title: (body.match(/^# (.+)$/m) ?? [])[1] ?? '', infra: [], sampling: null, map: [], mapTitle: '', mapNote: '', legend: '', wave0: null, manual: null, signoff: null, extras: [] };
  for (const s of secs) {
    if (/^test infrastructure/i.test(s.title)) { const t = table(s.body); doc.infra = t ? t.rows.map(r => ({ k: r[0].replace(/\*\*/g, ''), v: r[1] })) : []; }
    else if (/^sampling/i.test(s.title)) doc.sampling = sampling(s.body);
    else if (/verification map/i.test(s.title)) { const t = table(s.body); doc.mapTitle = s.title; if (t) { doc.map = mapRows(t); doc.mapNote = t.before.replace(/^>\s?/gm, ''); doc.legend = t.after; } }
    else if (/^wave 0/i.test(s.title)) { const b = bullets(s.body); doc.wave0 = { title: s.title, ...b }; }
    else if (/^manual/i.test(s.title)) {
      const t = table(s.body);
      if (t) { const H = t.head; const g = re => col(H, re); const iB = Math.max(g(/behaviou?r|^gate/i), 0), iR = g(/requirement/i), iW = g(/why/i), iI = g(/instruction/i), iO = g(/observed/i), iU = g(/outcome/i);
        doc.manual = { rows: t.rows.map(r => ({ behavior: r[iB] ?? '', req: split(r[iR]?.replace(/\s*\/\s*/g, ', ')), why: r[iW] ?? '', how: r[iI] ?? '', observed: iO >= 0 ? r[iO] : null, outcome: iU >= 0 ? r[iU] : null })), lead: t.before, tail: t.after, prose: null };
      } else { const b = bullets(s.body); doc.manual = { rows: [], prose: s.body, items: b.items, lead: b.lead, tail: b.tail }; }
    }
    else if (/sign-?off/i.test(s.title)) { const b = bullets(s.body); const appr = s.body.match(/\*\*Approval:\*\*\s*(.*)/); doc.signoff = { items: b.items, approval: appr ? appr[1].trim() : null, extra: b.tail.replace(/\*\*Approval:\*\*.*$/m, '').trim() }; }
    else doc.extras.push(s);
  }
  DOCS[key] = doc;
}
writeFileSync(new URL('./data.js', import.meta.url), `// generated by gen-data.mjs — do not edit\nwindow.VAL_DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const [k, d] of Object.entries(DOCS)) console.log(k, d.fm.status, 'map', d.map.length, 'w0', d.wave0?.items.length, 'manual', d.manual?.rows.length, 'signoff', d.signoff?.items.length, 'extras', d.extras.map(e => e.title).join('|'));
