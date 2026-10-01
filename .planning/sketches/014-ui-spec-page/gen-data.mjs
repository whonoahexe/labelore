// Sketch 014 data generator. Reads real UI-SPEC.md files and writes data.js with the parts a
// person reads: cover facts, sign-off dimensions, design system (tool/preset, spacing, type,
// colour), UI considerations grouped by element, copy deck, registry safety, the phase-specific
// chapters, and the agent-facing leftovers (probe blockquotes, status-vocabulary comments) for the
// back matter. Run: node .planning/sketches/014-ui-spec-page/gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const SP = '/home/cinedise/studio-portal/.planning';
const LB = '/home/cinedise/labelore/.planning';
const SOURCES = {
  sp04: { label: 'sp v1.0/04 (hard)', path: `${SP}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-UI-SPEC.md` },
  lb02: { label: 'labelore 02 (long)', path: `${LB}/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-UI-SPEC.md` },
  sp02: { label: 'sp v1.0/02 (hex)', path: `${SP}/milestones/v1.0-phases/02-storage-health-status/02-UI-SPEC.md` },
  lb03: { label: 'labelore 03 (FLAG)', path: `${LB}/milestones/v1.0-phases/03-search-browsing-traceability/03-UI-SPEC.md` },
  sp01: { label: 'sp P1', path: `${SP}/phases/01-portal-owned-identity-sessions/01-UI-SPEC.md` },
  fx01: { label: 'fixture (draft)', path: '/home/cinedise/labelore/fixtures/dense/.planning/phases/01-identity-slice/01-UI-SPEC.md' },
};

function splitBy(body, level) {
  const re = new RegExp(`^${'#'.repeat(level)} (.+)$`, 'gm'), out = [];
  let m, last = null;
  const pre = { title: null, start: 0 };
  while ((m = re.exec(body))) {
    if (last) last.body = body.slice(last.start, m.index); else pre.body = body.slice(0, m.index);
    last = { title: m[1].trim(), start: m.index + m[0].length };
    out.push(last);
  }
  if (last) last.body = body.slice(last.start); else pre.body = body;
  return { pre: pre.body ?? '', parts: out };
}
const cells = l => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
// First table in a body -> { head, rows }; also returns the body with that table removed.
function firstTable(body) {
  const lines = body.split('\n');
  const i = lines.findIndex((l, k) => /^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[k + 1] ?? ''));
  if (i < 0) return { head: [], rows: [], rest: body };
  let j = i + 2;
  while (j < lines.length && /^\s*\|/.test(lines[j])) j++;
  const head = cells(lines[i]);
  const rows = lines.slice(i + 2, j).map(cells);
  return { head, rows, rest: [...lines.slice(0, i), ...lines.slice(j)].join('\n') };
}
const clean = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*---\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
const comments = s => [...s.matchAll(/<!--([\s\S]*?)-->/g)].map(m => m[1].trim());
// Leading "> ..." blockquote (the agent-facing lift-rule note) split off from the prose.
function splitQuote(s) {
  const m = s.match(/^\s*((?:>.*\n?)+)/);
  return m ? { quote: m[1].replace(/^>\s?/gm, '').trim(), rest: s.slice(m[0].length) } : { quote: null, rest: s };
}
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (m) for (const l of m[1].split('\n')) { const k = l.match(/^([\w_]+):\s*(.*)$/); if (k) fm[k[1]] = k[2].replace(/^"|"$/g, ''); }
  return { fm, body: m ? text.slice(m[0].length) : text };
}

const CATS = ['empty', 'loading', 'error', 'populated', 'partial', 'overflow', 'zero-one-many', 'long-text'];
function status(raw) {
  const s = raw.replace(/[*_`]/g, '').toLowerCase();
  if (/dismiss|n\/a/.test(s)) return 'dismissed';
  if (/backstop/.test(s)) return 'backstop';
  if (/unresolved|⚠/.test(s)) return 'unresolved';
  if (/covered|resolved|✅/.test(s)) return 'covered';
  return 'unresolved';
}
function category(raw) {
  const s = raw.replace(/[*_`]/g, '').toLowerCase().trim();
  const hit = CATS.filter(c => s.includes(c));
  return { cats: hit.length ? hit : ['other'], label: raw.replace(/[`*]/g, '').trim() };
}
const tagOf = raw => (raw.match(/\((P-\d+)\)/) || [])[1] ?? null;

function parseUic(body) {
  const { quote, rest } = splitQuote(body);
  const { pre, parts } = splitBy(rest, 3);
  const elements = [], notes = [];
  const pushRows = (el, t) => {
    const h = t.head.map(x => x.toLowerCase());
    const ci = h.findIndex(x => /category|consideration/.test(x)), si = h.findIndex(x => /status/.test(x));
    const ei = h.findIndex(x => /element/.test(x)), ri = h.findIndex(x => /resolution|truth|reason/.test(x));
    for (const r of t.rows) {
      const row = { ...category(r[ci] ?? ''), status: status(r[si] ?? ''), statusRaw: (r[si] ?? '').replace(/[*]/g, ''), tag: tagOf(r[si] ?? ''), note: r[ri] ?? '' };
      if (el) { el.rows.push(row); continue; }
      const raw = (r[ei] ?? '').replace(/`/g, '');
      const code = (raw.match(/\((E\d+)[^)]*\)/) || [])[1];
      const name = raw.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+—\s+.*$/, '').trim();
      const key = code ?? name.toLowerCase();
      let g = elements.find(e => e.key === key);
      if (!g) elements.push(g = { key, code: code ?? null, name, kinds: null, rows: [] });
      row.target = raw; g.rows.push(row);
    }
  };
  // a flat table sits in the pre-### prose
  let intro = pre;
  const t0 = firstTable(pre);
  if (t0.rows.length) { pushRows(null, t0); intro = t0.rest; }
  for (const p of parts) {
    const m = p.title.match(/^(E\d+)\s*[—-]\s*(.+)$/);
    const t = firstTable(p.body);
    if (m && t.rows.length) {
      const kinds = (p.body.match(/Element kinds[^:]*:\*?\s*(.+)/) || [])[1]?.replace(/[`*]/g, '').trim() ?? null;
      const el = { key: m[1], code: m[1], name: m[2].replace(/`/g, '').trim(), kinds, rows: [], extra: clean(t.rest.replace(/^\*Element kinds.*$/m, '')) };
      pushRows(el, t); elements.push(el);
    } else notes.push({ title: p.title, body: clean(p.body) });
  }
  // intro: split the coverage line out
  const introClean = clean(intro);
  const cov = (introClean.match(/\*\*(?:Coverage:\s*)?(\d+ applicable[^*]*)\*\*/i) || introClean.match(/Resolved:\s*\*\*([^*]+)\*\*/) || [])[1] ?? null;
  return { quote, intro: introClean, coverage: cov, elements, notes, comments: comments(body) };
}

function parseSignoff(body, fm) {
  const dims = [];
  // join indented continuation lines onto their "- [ ] Dimension" line
  const lines = body.split('\n').reduce((a, l) => { if (/^\s{2,}\S/.test(l) && a.length && /^- \[/.test(a[a.length - 1])) a[a.length - 1] += ' ' + l.trim(); else a.push(l); return a; }, []);
  const rest = [];
  for (const l of lines) {
    const m = l.match(/^- \[( |x)\] Dimension (\d+) ([^:]+):\s*(.*)$/);
    if (!m) { rest.push(l); continue; }
    const txt = m[4].replace(/\*\*/g, '');
    const v = (txt.match(/^(PASS|FLAG|BLOCK|FAIL)/i) || [])[1]?.toUpperCase() ?? null;
    const note = txt.replace(/^(PASS|FLAG|BLOCK|FAIL)\s*(\([^)]*\))?\s*[—-]?\s*/i, '').trim();
    const qual = (txt.match(/^(?:PASS|FLAG|BLOCK|FAIL)\s*\(([^)]*)\)/i) || [])[1] ?? null;
    dims.push({ n: +m[2], name: m[3].trim(), checked: m[1] === 'x', verdict: v, qual, note });
  }
  body = rest.join('\n');
  if (!dims.length) { // table form: | # | Dimension | Verdict | Notes |
    const t = firstTable(body), h = t.head.map(x => x.toLowerCase());
    const ni = h.findIndex(x => x === '#'), di = h.findIndex(x => /dimension/.test(x)), vi = h.findIndex(x => /verdict/.test(x)), oi = h.findIndex(x => /note/.test(x));
    for (const r of t.rows) dims.push({ n: +(r[ni] ?? dims.length + 1), name: r[di], checked: true, verdict: ((r[vi] ?? '').match(/PASS|FLAG|BLOCK|FAIL/i) || ['PENDING'])[0].toUpperCase(), qual: null, note: r[oi] ?? '' });
    body = t.rest;
  }
  const am = body.match(/\*\*Approval:\*\*\s*([\s\S]+?)(?:\n\s*\n|$)/);
  const approval = am ? am[1].replace(/\s*\n\s*/g, ' ').trim() : null;
  if (am) body = body.replace(am[0], '\n');
  const pending = !approval || /^pending/i.test(approval);
  for (const d of dims) if (!d.checked && d.verdict === 'PASS' && (pending || /draft/.test(fm.status))) d.verdict = 'PENDING';
  return { dims, approval, pending, extra: clean(body) };
}

function parse(key) {
  const src = SOURCES[key], text = readFileSync(src.path, 'utf8');
  const { fm, body } = frontmatter(text);
  const h1 = body.match(/^# (.+)$/m)[1];
  const { pre, parts } = splitBy(body.slice(body.indexOf(h1) + h1.length), 2);
  const tag = splitQuote(clean(pre));
  const d = { key, label: src.label, project: src.path.includes('studio-portal') ? 'studio-portal' : 'labelore', file: src.path.replace('/home/cinedise/', '~/'), fm, title: h1, tagline: tag.quote, scope: clean(tag.rest), chapters: [], back: [] };
  if (d.tagline) d.back.push({ title: 'Generator note', body: d.tagline });
  parts.forEach((p, idx) => {
    const t = p.title, b = p.body;
    const tb = () => firstTable(b);
    if (/^Design System/i.test(t)) { const x = tb(); d.designSystem = { rows: x.rows.map(r => ({ k: r[0], v: r[1] })), prose: clean(x.rest) }; }
    else if (/^Spacing/i.test(t)) { const x = tb(); d.spacing = { head: x.head, rows: x.rows.map(r => ({ token: r[0], value: r[1], usage: r[2] ?? '' })), prose: clean(x.rest) }; }
    else if (/^Typography/i.test(t)) { const x = tb(); d.typography = { head: x.head, rows: x.rows, prose: clean(x.rest) }; }
    else if (/^Colou?r/i.test(t)) { const x = tb(); d.color = { head: x.head, rows: x.rows, prose: clean(x.rest) }; }
    else if (/^Copywriting/i.test(t)) { const x = tb(); d.copy = { rows: x.rows.map(r => ({ element: r[0], copy: r[1] })), prose: clean(x.rest) }; }
    else if (/^UI Considerations/i.test(t)) { d.uic = parseUic(b); if (d.uic.quote) d.back.push({ title: 'UI Considerations — lift rule', body: d.uic.quote }); d.uic.comments.forEach(c => d.back.push({ title: 'UI Considerations — status vocabulary', body: c, pre: true })); }
    else if (/^Registry Safety/i.test(t)) { const x = tb(); d.registry = { head: x.head, rows: x.rows, prose: clean(x.rest) }; }
    else if (/^Checker Sign-?Off/i.test(t)) d.signoff = parseSignoff(b, fm);
    else d.chapters.push({ title: t, body: clean(b), order: idx });
  });
  return d;
}

const out = Object.fromEntries(Object.keys(SOURCES).map(k => [k, parse(k)]));
for (const [k, d] of Object.entries(out)) {
  const u = d.uic;
  console.log(k, d.fm.created, '| dims', d.signoff?.dims.length, '| sp', d.spacing?.rows.length, 'ty', d.typography?.rows.length, 'co', d.color?.rows.length, '| uic els', u?.elements.length, 'rows', u?.elements.reduce((n, e) => n + e.rows.length, 0), 'notes', u?.notes.length, '| chapters', d.chapters.map(c => c.title.slice(0, 24)).join(' / '));
}
writeFileSync(new URL('./data.js', import.meta.url), `// Generated by gen-data.mjs from real UI-SPEC.md files — do not edit.\nwindow.UISPEC_DOCS = ${JSON.stringify(out, null, 1)};\n`);
