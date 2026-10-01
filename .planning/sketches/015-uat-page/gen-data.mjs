// Sketch 015 data generator. Reads real UAT.md files (plus one labelled synthetic in-progress
// file) and writes data.js: frontmatter, current test, tests with every field they carry,
// summary counts, gaps (YAML items or prose), and any extra sections.
// Run: node .planning/sketches/015-uat-page/gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const SP = '/home/cinedise/studio-portal/.planning';
const LB = '/home/cinedise/labelore/.planning';
const SOURCES = {
  syn: { label: 'synthetic (testing)', path: new URL('./synthetic-testing-UAT.md', import.meta.url).pathname, synthetic: true },
  sp103: { label: 'sp v1.0/03 (gaps)', path: `${SP}/milestones/v1.0-phases/03-file-browsing/03-UAT.md` },
  sp3: { label: 'sp P3 (reverified)', path: `${SP}/phases/03-account-administration-session-control/03-UAT.md` },
  sp1: { label: 'sp P1 (skips, notes)', path: `${SP}/phases/01-portal-owned-identity-sessions/01-UAT.md` },
  sp2: { label: 'sp P2 (off-template)', path: `${SP}/phases/02-roles-permission-enforcement/02-UAT.md` },
  lb01: { label: 'labelore 01 (23 tests)', path: `${LB}/milestones/v1.0-phases/01-read-layer-domain-model/01-UAT.md` },
};

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (m) for (const l of m[1].split('\n')) { const k = l.match(/^([\w_]+):\s*(.*)$/); if (k) fm[k[1]] = k[2].replace(/^"|"$/g, ''); }
  return { fm, body: m ? text.slice(m[0].length) : text };
}
function splitBy(body, level) {
  const re = new RegExp(`^${'#'.repeat(level)} (.+)$`, 'gm'), out = [];
  let m, last = null, pre = body;
  while ((m = re.exec(body))) {
    if (last) last.body = body.slice(last.start, m.index); else pre = body.slice(0, m.index);
    last = { title: m[1].trim(), start: m.index + m[0].length };
    out.push(last);
  }
  if (last) last.body = body.slice(last.start);
  return { pre, parts: out };
}
const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, '');
const KEY = /^([a-z][a-z_]{1,24}):(?:\s(.*)|\s*)$/;
// "key: value" fields; unkeyed lines (including blank-separated prose) continue the previous field.
function fields(body) {
  const out = []; let cur = null; const lead = [];
  for (const raw of stripComments(body).split('\n')) {
    const m = raw.match(KEY);
    if (m && !/^(https?|e\.g)$/.test(m[1])) { cur = { key: m[1], value: (m[2] ?? '').trim() === '|' ? '' : (m[2] ?? '').trim() }; out.push(cur); continue; }
    if (cur) cur.value += '\n' + raw.replace(/^ {2}/, ''); else lead.push(raw);
  }
  for (const f of out) f.value = f.value.replace(/^\n+|\s+$/g, '').replace(/^"([\s\S]*)"$/, '$1');
  return { fields: out, lead: lead.join('\n').trim() };
}
function result(raw) {
  const s = String(raw ?? '').toLowerCase();
  if (/pending/.test(s)) return 'pending';
  if (/^(pass|passed|closed)/.test(s)) return 'pass';
  if (/^issue|fail/.test(s)) return 'issue';
  if (/^skip/.test(s)) return 'skipped';
  if (/^block/.test(s)) return 'blocked';
  return 'other';
}
// Gaps: YAML "- key: value" items (nested lists for artifacts/missing), else prose bullets or ### sections.
function gaps(body) {
  const clean = stripComments(body).trim();
  if (!clean || /^\[none\]$/i.test(clean)) return { items: [], prose: null };
  if (/^- [a-z_]+:/m.test(clean)) {
    const chunks = clean.split(/^- (?=[a-z_]+:)/m).slice(1);
    const items = chunks.map(ch => {
      const g = {}; let list = null, key = null;
      for (const line of ('  ' + ch).split('\n')) {
        let m;
        if ((m = line.match(/^ {2}([a-z_]+):\s*(.*)$/))) { key = m[1]; const v = m[2].trim(); if (v === '' || v === '[]') { g[key] = v === '[]' ? [] : ''; list = key; } else { g[key] = v.replace(/^"|"$/g, ''); list = null; } continue; }
        if ((m = line.match(/^ {4}- (?:path:\s*)?(.*)$/)) && list) { if (!Array.isArray(g[list])) g[list] = []; const v = m[1].replace(/^"|"$/g, ''); if (/^ {4}- path:/.test(line)) g[list].push({ path: v, issue: '' }); else g[list].push(v); continue; }
        if ((m = line.match(/^ {6}issue:\s*(.*)$/)) && list && Array.isArray(g[list])) { const last = g[list][g[list].length - 1]; if (last && typeof last === 'object') last.issue = m[1].replace(/^"|"$/g, ''); continue; }
        if (line.trim() && key && typeof g[key] === 'string') g[key] += ' ' + line.trim().replace(/"$/, '');
      }
      return g;
    });
    return { items, prose: null };
  }
  const sec = splitBy(clean, 3);
  if (sec.parts.length) return { items: sec.parts.map(p => ({ prose: true, title: p.title, body: p.body.trim() })), prose: sec.pre.trim() || null };
  const bullets = clean.split(/\n(?=- )/).filter(b => b.startsWith('- '));
  if (bullets.length) return { items: bullets.map(b => ({ prose: true, title: null, body: b.replace(/^- /, '').replace(/\n {2}/g, '\n') })), prose: clean.split(/\n- /)[0].startsWith('- ') ? null : clean.split(/\n- /)[0].trim() };
  return { items: [], prose: clean };
}

function parse(key) {
  const src = SOURCES[key], text = readFileSync(src.path, 'utf8');
  const { fm, body } = frontmatter(text);
  const { parts } = splitBy(body, 2);
  const d = { key, label: src.label, synthetic: !!src.synthetic, file: src.path.replace('/home/cinedise/', '~/'), project: src.path.includes('studio-portal') ? 'studio-portal' : 'labelore', fm, current: null, currentLine: null, tests: [], summary: null, gaps: { items: [], prose: null }, gapsTitle: 'Gaps', extra: [] };
  for (const p of parts) {
    const t = p.title;
    if (/^Current Test/i.test(t) || (/^Resolution$/i.test(t) && !d.current)) {
      const f = fields(p.body);
      if (f.fields.some(x => x.key === 'name')) d.current = { ...Object.fromEntries(f.fields.map(x => [x.key, x.value])), fromSection: t };
      else if (!d.currentLine) d.currentLine = stripComments(p.body).trim().replace(/^\[|\]$/g, '');
    } else if (/^Tests$/i.test(t)) {
      for (const tp of splitBy(p.body, 3).parts) {
        const m = tp.title.match(/^(\d+)\.\s*(.+)$/);
        const f = fields(tp.body);
        const F = Object.fromEntries(f.fields.map(x => [x.key, x.value]));
        d.tests.push({ n: m ? +m[1] : d.tests.length + 1, name: m ? m[2] : tp.title, result: result(F.result), resultRaw: F.result ?? '', fields: f.fields, lead: f.lead });
      }
    } else if (/^Summary$/i.test(t)) {
      d.summary = Object.fromEntries(fields(p.body).fields.map(x => [x.key, x.value]));
    } else if (/^Gaps/i.test(t)) {
      d.gaps = gaps(p.body); d.gapsTitle = t;
    } else if (/^Result$/i.test(t)) {
      d.currentLine = d.currentLine ?? stripComments(p.body).trim().split('\n')[0];
      d.extra.push({ title: t, body: stripComments(p.body).trim() });
    } else d.extra.push({ title: t, body: stripComments(p.body).trim() });
  }
  return d;
}

const out = Object.fromEntries(Object.keys(SOURCES).map(k => [k, parse(k)]));
for (const [k, d] of Object.entries(out)) {
  const rc = d.tests.reduce((a, t) => (a[t.result] = (a[t.result] || 0) + 1, a), {});
  const keys = [...new Set(d.tests.flatMap(t => t.fields.map(f => f.key)))];
  console.log(k, d.fm.status, '| current', d.current ? `#${d.current.number} ${d.current.name?.slice(0, 30)}` : JSON.stringify(d.currentLine?.slice(0, 50)), '| tests', JSON.stringify(rc), '| keys', keys.join(','), '| gaps', d.gaps.items.length, d.gaps.items[0]?.prose ? '(prose)' : '', '| extra', d.extra.map(e => e.title).join(' / '));
}
writeFileSync(new URL('./data.js', import.meta.url), `// Generated by gen-data.mjs from real UAT.md files (+ one labelled synthetic) — do not edit.\nwindow.UAT_DOCS = ${JSON.stringify(out, null, 1)};\n`);
