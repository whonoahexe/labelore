// Sketch 020: builds data.js from real SUMMARY.md files. Run: node gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/cinedise/labelore/package.json');
const matter = require('gray-matter');

const H = '/home/cinedise';
const SOURCES = {
  '0501': { label: '05-01 canonical', path: `${H}/labelore/.planning/milestones/v1.1-phases/05-per-type-document-views/05-01-SUMMARY.md`, project: 'labelore' },
  '0406': { label: '04-06 awaiting · auto-fixes', path: `${H}/studio-portal/.planning/phases/04-bulk-archive-downloads/04-06-SUMMARY.md`, project: 'studio-portal' },
  '0101': { label: '01-01 deps added', path: `${H}/studio-portal/.planning/phases/01-portal-owned-identity-sessions/01-01-SUMMARY.md`, project: 'studio-portal' },
  '0x4': { label: '0x4 · 16 commits', path: `${H}/labelore/.planning/milestones/v1.0-quick/260910-0x4-close-every-tech-debt-item-in-planning-v/260910-0x4-SUMMARY.md`, project: 'labelore' },
  '3us': { label: '3us quick format', path: `${H}/labelore/.planning/quick/260922-3us-build-sketch-004-b3-folded-chapters-docu/260922-3us-SUMMARY.md`, project: 'labelore' },
};

const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const str = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? (v.statement ?? v.description ?? v.decision ?? JSON.stringify(v)) : String(v));

// Split the body into ## sections, each with its ### subsections.
function sections(body) {
  const out = []; let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.*)$/);
    if (m && !line.startsWith('###')) { cur = { title: m[1].trim(), body: '' }; out.push(cur); continue; }
    if (cur) cur.body += line + '\n';
  }
  return out.map((s) => ({ ...s, body: s.body.trim() }));
}
const isNone = (t) => /^(none|n\/a)\b/i.test(t.trim().replace(/^[-*]\s*/, '')) && t.trim().split('\n').length <= 3;
function bullets(t) {
  const items = []; for (const l of t.split('\n')) {
    if (/^\s*[-*]\s+/.test(l) && !/^\s{4,}/.test(l)) items.push(l.replace(/^\s*[-*]\s+/, ''));
    else if (items.length && /^\s+\S/.test(l)) items[items.length - 1] += ' ' + l.trim();
    else if (items.length && l.trim() && !/^\s*$/.test(l)) items[items.length - 1] += ' ' + l.trim();
  }
  return items;
}
// Accomplishment → headline (up to the first em dash / colon / sentence end) + detail.
function headline(t) {
  // Split points outside backtick code: strong (— : . ;) within 20–140 chars, else a comma within 40–120.
  const pts = []; let code = false; let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '`') { code = !code; continue; }
    if (code) continue;
    if (t[i] === '(') depth++; else if (t[i] === ')') depth = Math.max(0, depth - 1);
    if (depth) continue;
    const two = t.slice(i, i + 3);
    if (/^ [—–] /.test(two)) pts.push([i, 3, 'strong']);
    else if (/^[:;.] /.test(t.slice(i, i + 2)) && !/\d$/.test(t[i - 1] ?? '')) pts.push([i, 2, 'strong']);
    else if (t.slice(i, i + 2) === ', ') pts.push([i, 2, 'weak']);
  }
  const pick = pts.find(([i, , k]) => k === 'strong' && i >= 20 && i <= 140) ?? pts.find(([i, , k]) => k === 'weak' && i >= 40 && i <= 170);
  if (!pick) return { head: t, rest: '' };
  const rest = t.slice(pick[0] + pick[1]).trim();
  return { head: t.slice(0, pick[0]).trim(), rest: rest.charAt(0).toUpperCase() + rest.slice(1) };
}
function taskCommits(secs, fm) {
  const s = secs.find((x) => /^Task Commits|^Commits$/i.test(x.title)) ?? secs.find((x) => /^Tasks( Completed)?$/i.test(x.title));
  const out = [];
  if (s) {
    for (const m of s.body.matchAll(/\*\*Task\s+(\d+)[:.]?\s*(.+?)\*\*\s*[-—–]+\s*`([0-9a-f]{7,40})`(?:\s*\(([^)]*)\))?/g)) out.push({ n: +m[1], name: m[2].trim(), hash: m[3].slice(0, 7), kind: m[4] ?? null });
    if (!out.length) for (const m of s.body.matchAll(/^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*`?([0-9a-f]{7,40})`?\s*\|/gm)) out.push({ n: +m[1], name: m[2], hash: m[3].slice(0, 7), kind: null });
    if (!out.length) for (const m of s.body.matchAll(/^\s*\d+\.\s+\*\*(.+?)\*\*.*?`([0-9a-f]{7,40})`/gm)) out.push({ n: out.length + 1, name: m[1], hash: m[2].slice(0, 7), kind: null });
  }
  if (!out.length) arr(fm.metrics?.commits ?? fm.commits).filter((c) => typeof c === 'string').forEach((h, i) => out.push({ n: i + 1, name: null, hash: h.slice(0, 7), kind: null }));
  return out;
}
// Deviations: rule-tagged items in either "**N. [Rule X — Type] Title**" + "- **Field:** v" or "- **[Rule X – type] Title.** body" form.
function deviations(sec) {
  if (!sec) return { none: true, items: [], note: null, extra: [] };
  const body = sec.body; const items = [];
  const re = /(?:^|\n)\s*(?:[-*]\s+)?\*\*(?:\d+\.\s*)?\[Rule\s*(\d)\s*[-—–:]?\s*([^\]]*)\]\s*([^*]*?)\*\*([\s\S]*?)(?=\n\s*(?:[-*]\s+)?\*\*(?:\d+\.\s*)?\[Rule|\n#{2,3}\s|\n\*\*\d+\.\s|$)/g;
  let m; while ((m = re.exec(body))) {
    const rest = m[4]; const field = (k) => rest.match(new RegExp(`\\*\\*${k}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*-\\s*\\*\\*|$)`))?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
    const structured = /\*\*(Issue|Fix):\*\*/.test(rest);
    items.push({ rule: +m[1], type: m[2].trim().replace(/^[-—–]\s*/, ''), title: m[3].trim().replace(/[.:]$/, ''),
      found: field('Found during'), issue: field('Issue'), fix: field('Fix'), files: field('Files'), commit: field('Commit')?.replace(/`/g, ''),
      text: structured ? null : rest.replace(/^\s*[-.]?\s*/, '').replace(/\s+/g, ' ').trim() });
  }
  const lead = body.split(/\n\s*\n/)[0];
  const none = !items.length && isNone(body) || /^none\b/i.test(lead.trim());
  // ### subsections that are not the rule list (e.g. "Files touched outside the plan's declared list").
  const extra = [...body.matchAll(/^###\s+(.+)\n([\s\S]*?)(?=^###\s|(?![\s\S]))/gm)].map((x) => ({ title: x[1].trim(), body: x[2].trim() })).filter((x) => !/auto-?fixed/i.test(x.title));
  return { none, items, note: none ? lead.replace(/^none\s*[-—–]+\s*/i, '').trim() : null, extra };
}

const KNOWN = /^(Performance|Accomplishments|Task Commits|Tasks( Completed)?|Commits|Files Created\/Modified|Decisions Made|Deviations( from Plan)?|User Setup Required|Next Phase Readiness|Self-Check.*)$/i;
// Requirement lookup for the hover preview: text + checkbox from the bullet list, phase/status from the traceability table.
const REQ_FILES = { labelore: ['milestones/v1.1-REQUIREMENTS.md', 'milestones/v1.0-REQUIREMENTS.md'], 'studio-portal': ['REQUIREMENTS.md', 'milestones/v1.0-REQUIREMENTS.md'] };
function reqIndex(project) {
  const idx = {};
  for (const rel of REQ_FILES[project]) {
    let t; try { t = readFileSync(`${H}/${project}/.planning/${rel}`, 'utf8'); } catch { continue; }
    for (const m of t.matchAll(/^- \[( |x)\] \*\*([A-Z0-9]+-\d+)\*\*:?\s*([\s\S]*?)(?=\n- \[|\n\n|\n#)/gm)) idx[m[2]] ??= { text: m[3].replace(/\s+/g, ' ').trim(), done: m[1] === 'x', file: `.planning/${rel}` };
    for (const m of t.matchAll(/^\|\s*([A-Z0-9]+-\d+)\s*\|\s*([^|]+?)\s*\|(?:[^|\n]*\|)*?\s*(Complete|Pending|Partial|In progress)[^|]*\|/gm)) if (idx[m[1]]) { idx[m[1]].phase ??= m[2].replace(/\s+[—–-].*$/, ''); idx[m[1]].status ??= m[3]; }
  }
  return idx;
}
const DOCS = {};
for (const [key, src] of Object.entries(SOURCES)) {
  const raw = readFileSync(src.path, 'utf8');
  let fm = {}; let body = raw;
  try { const g = matter(raw); fm = g.data; body = g.content; } catch {}
  const h1 = body.match(/^#\s+(.+)$/m)?.[1] ?? null;
  // The paragraph right after the H1: bold-wrapped in the template; otherwise plain if it is short enough to be a lead.
  const firstPara = body.match(/^#\s+.+\n+((?:[^\n#|`-][^\n]*\n?)+)/m)?.[1]?.trim().replace(/\s+/g, ' ') ?? null;
  const oneLiner = !firstPara ? null : /^\*\*[^*]+\*\*$/.test(firstPara) ? firstPara.slice(2, -2) : firstPara.length < 700 ? firstPara : null;
  const secs = sections(body);
  const sec = (re) => secs.find((s) => re.test(s.title));
  const perf = sec(/^Performance$/)?.body ?? '';
  const pf = (k) => perf.match(new RegExp(`\\*\\*${k}:\\*\\*\\s*(.+)`))?.[1]?.trim() ?? null;
  const filesSec = sec(/^Files Created\/Modified$/)?.body ?? '';
  const fileNotes = {}; for (const b of bullets(filesSec)) { const m = b.match(/^`([^`]+)`(?:,\s*`[^`]+`)*\s*[-—–]\s*(.+)$/); if (m) fileNotes[m[1]] = m[2]; }
  const kf = fm['key-files'] ?? {};
  const dg = fm['dependency-graph'] ?? {};
  const ts = fm['tech-stack'] ?? {};
  const decSec = sec(/^Decisions Made$/)?.body ?? '';
  const userSetup = sec(/^User Setup Required$/)?.body ?? null;
  const selfCheck = secs.find((s) => /^Self-Check/i.test(s.title));
  DOCS[key] = {
    label: src.label, project: src.project, raw,
    path: src.path.replace(`${H}/${src.project}/`, ''),
    phase: String(fm.phase ?? ''), plan: String(fm.plan ?? '').padStart(2, '0'), h1, oneLiner,
    subsystem: fm.subsystem ?? null, status: fm.status ?? null,
    completed: (v => v instanceof Date ? v.toISOString().slice(0, 10) : v ?? null)(fm.completed ?? fm.metrics?.completed), duration: fm.duration ?? fm.metrics?.duration ?? null,
    started: pf('Started'), filesCount: pf('Files modified'),
    tasks: taskCommits(secs, fm), commitCount: fm.actuals?.commits ?? fm.commits?.length ?? fm.commits ?? null,
    requires: arr(fm.requires ?? dg.requires).map((r) => (typeof r === 'string' ? { phase: r, provides: null } : { phase: r.phase ?? r.plan ?? str(r), provides: r.provides ?? null })),
    affects: arr(fm.affects ?? dg.affects).map(str),
    provides: arr(fm.provides ?? dg.provides).map(str),
    added: arr(ts.added).map(str),
    patterns: [...arr(ts.patterns).map((p) => ({ text: str(p), established: false })), ...arr(fm['patterns-established']).map((p) => ({ text: str(p), established: true }))],
    files: { created: arr(kf.created).map(str), modified: arr(kf.modified).map(str), notes: fileNotes },
    decisions: arr(fm['key-decisions'] ?? fm.decisions).map(str),
    decisionsBody: decSec && !/^see `?key-decisions/i.test(decSec) && !isNone(decSec) ? decSec : null,
    reqDone: arr(fm['requirements-completed'] ?? fm.requirements).map(String), reqPending: arr(fm['requirements-pending']).map(String), reqPartial: arr(fm['requirements-partial']).map(String),
    coverage: arr(fm.coverage).map((c) => ({ id: c.id, description: c.description, requirement: c.requirement ?? null, human: c.human_judgment === true, rationale: c.rationale ?? null,
      checks: arr(c.verification).map((v) => ({ kind: v.kind, ref: v.ref, status: v.status })) })),
    accomplishments: bullets(sec(/^Accomplishments$/)?.body ?? '').map(headline),
    deviations: deviations(sec(/^Deviations( from Plan)?$/)),
    userSetup: userSetup && !isNone(userSetup) ? userSetup : null,
    nextReady: sec(/^Next Phase Readiness$/)?.body ?? null,
    selfCheck: selfCheck ? (/PASS/i.test(selfCheck.title) ? 'passed' : /FAIL/i.test(selfCheck.title) ? 'failed' : selfCheck.title) : null,
    other: secs.filter((s) => !KNOWN.test(s.title) && s.body).map((s) => ({ title: s.title, body: s.body, none: isNone(s.body) })),
    tags: arr(fm.tags).map(String),
    reqInfo: (() => { const idx = reqIndex(src.project); const o = {}; [...arr(fm['requirements-completed'] ?? fm.requirements), ...arr(fm['requirements-pending']), ...arr(fm['requirements-partial'])].map(String).forEach((r) => { if (idx[r]) o[r] = idx[r]; }); return o; })(),
  };
}
writeFileSync(new URL('./data.js', import.meta.url), `// Generated by gen-data.mjs from real SUMMARY.md files — do not edit.\nwindow.DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const [k, d] of Object.entries(DOCS)) console.log(k, '|', d.status, d.completed, d.duration, '| tasks', d.tasks.length, d.tasks.map((t) => t.hash).join(','), '| acc', d.accomplishments.length, '| cov', d.coverage.length, '| dec', d.decisions.length, '| dev', d.deviations.none ? 'none' : d.deviations.items.length + '+' + d.deviations.extra.length, '| pat', d.patterns.length, '| added', d.added.length, '| req', d.requires.length, 'aff', d.affects.length, '| other', d.other.map((o) => o.title + (o.none ? '(none)' : '')).join(' / '));
