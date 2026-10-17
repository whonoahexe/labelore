// Sketch 026: builds data.js — everything the dashboard shows below the project head, read from a
// project's .planning/ without rewriting anything: STATE.md's Decisions, Blockers/Concerns, Pending
// Todos and Quick Tasks Completed; todos/ and notes/ files; and the queue of unfinished plans and phases.
// The head itself comes from sketch 025's data.js, keyed the same way.
// Run: node .planning/sketches/026-dashboard-below-the-head/gen-data.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/noah/Work/Personal/labelore/package.json');
const matter = require('gray-matter');

const W = '/home/noah/Work';
const HERE = `${W}/Personal/labelore/.planning/sketches/026-dashboard-below-the-head`;
const SOURCES = {
  lab: { label: 'labelore · milestone done', dir: `${W}/Personal/labelore/.planning` },
  sp: { label: 'studio-portal · executing', dir: `${W}/Cinedise/studio-portal/.planning` },
  sb: { label: 'sideby.me · long', dir: `${W}/Sideby/plan.sideby.me/.planning` },
  syn: { label: 'synthetic · todos + notes', dir: `${HERE}/synthetic-planning` },
  fx: { label: 'fixture · dense', dir: `${W}/Personal/labelore/fixtures/dense/.planning` },
  sparse: { label: 'synthetic · nothing yet', dir: null },
};

const tryRead = (f) => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
const tryDir = (d) => { try { return readdirSync(d); } catch { return []; } };
const front = (raw) => { try { const m = matter(raw); return { fm: m.data, body: m.content }; } catch { return { fm: {}, body: raw }; } };
const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 16).replace('T', ' ') : v ? String(v) : null);
const clean = (s) => s.replace(/^[\s☀-➿️\u{1F300}-\u{1FAFF}]+/u, '').replace(/\s+/g, ' ').trim();

// The lines of a STATE.md section (### or ##), with their 1-based line numbers in the file.
function section(raw, re) {
  const lines = raw.split('\n'); const out = []; let inside = false; let level = 0;
  lines.forEach((line, i) => {
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) { if (inside && h[1].length <= level) inside = false; if (re.test(h[2])) { inside = true; level = h[1].length; return; } }
    if (inside) out.push({ line, n: i + 1 });
  });
  return out.length || lines.some((l) => { const h = l.match(/^#{2,3}\s+(.*)$/); return h && re.test(h[1]); }) ? out : null;
}

// Bullets (with indented continuation lines joined), plus the **Group** line each sits under.
function bullets(lines) {
  const items = []; let group = null; let cur = null;
  for (const { line, n } of lines) {
    const g = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (g && !line.startsWith('- ')) { group = { name: g[1].replace(/[:.]$/, ''), note: g[2] || null }; cur = null; continue; }
    const b = line.match(/^[-*]\s+(.*)$/);
    if (b) { cur = { text: b[1], line: n, group: group?.name ?? null, groupNote: group?.note ?? null }; items.push(cur); continue; }
    if (cur && /^\s+\S/.test(line)) cur.text += ' ' + line.trim();
    else if (!line.trim()) cur = null;
  }
  return items.map((it) => ({ ...it, text: it.text.replace(/\s+/g, ' ').trim() })).filter((it) => !/^none(\s+yet)?\.?$/i.test(it.text));
}

// "**Lead.** rest", else "title — why", else the whole thing as the title.
function split(text) {
  const bold = text.match(/^\*\*(.+?)\*\*[\s:—-]*(.*)$/);
  if (bold) return { title: bold[1].replace(/[.:]$/, ''), why: bold[2] || null };
  const dash = text.indexOf(' — ');
  if (dash > 0) return { title: text.slice(0, dash), why: text.slice(dash + 3) };
  return { title: text, why: null };
}

function decisions(raw, dir) {
  const sec = section(raw, /^decisions/i); if (!sec) return null;
  return bullets(sec).map((b) => {
    const tag = b.text.match(/^\[Phase\s+([^\]]*)\]:\s*(.*)$/i);
    // "[Phase ?]: [Quick 260718-c9v]: …" / "[Quick 260718-x5s follow-up]: …" — logged during a quick task.
    const quickTag = (tag ? tag[2] : b.text).match(/^\[Quick\s+(\d{6}-[a-z0-9]{3})[^\]]*\]:\s*(.*)$/i);
    if (quickTag) return { phase: null, plan: quickTag[1], line: b.line, source: decisionSource(quickTag[1], null, dir), ...split(quickTag[2]) };
    // Some projects tag with a plan id ("[Phase 01-01]", "[Phase quick-260709-rk9]") — split it.
    const tagPlan = tag ? tag[1].trim().match(/^(?:quick-)?(\d{6}-[a-z0-9]{3}|\d+(?:\.\d+)?-\d+)$/i) : null;
    if (tagPlan) tag[1] = /^\d{6}-/.test(tagPlan[1]) ? '?' : tagPlan[1].split('-')[0];
    const rest = tag ? tag[2] : b.text;
    const plan = rest.match(/^(\d+(?:\.\d+)?-(?:\d+|CONTEXT|RESEARCH)|\d{6}-[a-z0-9]{3})\s*:\s*(.*)$/i);
    const body = plan ? plan[2] : rest;
    // An untagged or "[Phase ?]" entry takes its phase from the plan id it names, when it names one.
    const raw = tag && tag[1].trim() !== '?' ? tag[1] : plan && !/^\d{6}-/.test(plan[1]) ? plan[1].split('-')[0] : null;
    const phase = raw ? String(+raw || raw).padStart(2, '0') : null;
    const id = plan ? plan[1] : tagPlan ? tagPlan[1] : null;
    return { phase, plan: id, line: b.line, source: decisionSource(id, phase, dir), ...split(body) };
  }).reverse(); // newest first: STATE.md appends at the bottom
}

function blockers(raw, dir, files) {
  const sec = section(raw, /^blockers/i); if (!sec) return null;
  return bullets(sec).map((b) => ({ ...blocker(b), ...trail(b, dir, files) }));
}

function blocker(b) {
  const urgent = /^\s*⚠/.test(b.text) || /\bexpires?\b|\bbefore 20\d\d-\d\d-\d\d/.test(b.text);
  let t = clean(b.text); let resolved = false; let tag = null;
  // "~~old~~ **RESOLVED 2026-06-30:** how" — struck through and marked resolved in place.
  const struck = t.match(/^~~(.+?)~~\s*\*\*([A-Z][A-Z +]+?)(?:\s+[\d-]+)?:?\*\*:?\s*(.*)$/);
  if (struck) return { group: b.group, line: b.line, urgent: false, resolved: true, tag: struck[2].split(/\s*\+\s*/)[0], title: struck[1].replace(/^[A-Z][A-Z ]+ — /, ''), why: struck[3] || null };
  // "**ACTIVE PAUSE — title:** rest" / "**TOOL ISSUE found during x:** rest" — the caps lead is a tag.
  const lead = t.match(/^\*\*([A-Z][A-Z ]{2,}?)(?: — |\s+(?=[a-z]))/);
  if (lead) { tag = lead[1].trim(); t = '**' + t.slice(lead[0].length); }
  if (/\b(COMPLETE|RESOLVED|CLOSED)\b/.test(t.slice(0, 120))) resolved = true;
  const s = split(t.replace(/^\*\*(.)/, (m, c) => '**' + c.toUpperCase()));
  // A long plain blocker: its first sentence is the title, the rest is the detail.
  if (!s.why && t.length > 140) { const m = t.match(/^(.{30,}?[.!?])\s+(.+)$/); if (m) return { group: b.group, line: b.line, urgent, resolved, tag, title: m[1], why: m[2] }; }
  return { group: b.group, line: b.line, urgent, resolved, tag, ...s };
}

function quick(raw, dir) {
  const lines = raw.split('\n'); const hi = lines.findIndex((l) => /^\|\s*#\s*\|.*Description/i.test(l)); if (hi < 0) return null;
  const cells = (l) => l.replace(/\\\|/g, '\u0000').split('|').slice(1, -1).map((c) => c.replace(/\u0000/g, '|'));
  const head = cells(lines[hi]).map((c) => c.trim().toLowerCase());
  const col = (row, name) => { const i = head.indexOf(name); return i >= 0 ? (row[i] ?? '').trim() : ''; };
  const rows = [];
  for (let i = hi + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    const r = cells(lines[i]);
    const id = col(r, '#'); const desc = col(r, 'description');
    const link = (col(r, 'directory').match(/\]\(([^)]+)\)/) ?? [])[1] ?? null;
    const path = link ? `${dir}/${link.replace(/^\.\//, '').replace(/^quick\//, 'quick/').replace(/\/$/, '')}` : null;
    const files = path ? tryDir(path) : [];
    const status = col(r, 'status').replace(/^[—-]$/, '') || null;
    rows.push({ id, kind: /^\d{6}-[a-z0-9]{3}$/.test(id) ? 'quick' : 'fast', date: col(r, 'date') || null, commit: (col(r, 'commit').match(/[0-9a-f]{7}/) ?? [])[0] ?? null,
      status: status ? status.replace(/\*\*/g, '').split(/[(;—:.,]/)[0].trim().slice(0, 28) || null : null, line: i + 1, ...split(desc.replace(/\*\*/g, '')),
      dir: link ? `quick/${link.replace(/^\.?\/?(quick\/)?/, '').replace(/\/$/, '')}` : null,
      plan: files.some((f) => /-PLAN\.md$/.test(f)), summary: files.some((f) => /-SUMMARY\.md$/.test(f)), order: i });
  }
  return rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.order - a.order);
}

function todos(raw, dir, corp) {
  const files = tryDir(`${dir}/todos/pending`).filter((f) => f.endsWith('.md')).map((f) => {
    const { fm, body } = front(readFileSync(`${dir}/todos/pending/${f}`, 'utf8'));
    const para = body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith('#') && !p.startsWith('>')) ?? null;
    return { source: `todos/pending/${f}`, title: String(fm.title ?? f.replace(/\.md$/, '')), area: fm.area ?? fm.theme ?? null,
      weight: fm.severity ?? fm.priority ?? null, created: iso(fm.created ?? fm.date)?.slice(0, 10) ?? null,
      files: Array.isArray(fm.files) ? fm.files.map(String) : [], detail: para && para !== fm.title ? para.replace(/\s+/g, ' ') : null };
  });
  const sec = raw ? section(raw, /^pending todos/i) : null;
  // STATE.md's own Pending Todos have no file; like blockers, they link to whatever they name.
  const listed = sec ? bullets(sec).map((b) => { const t = trail(b, dir, corp); return { source: null, sources: t.sources, title: b.text, area: null, weight: null, created: null, files: [], detail: null }; }) : [];
  const done = ['done', 'completed'].reduce((n, d) => n + tryDir(`${dir}/todos/${d}`).filter((f) => f.endsWith('.md')).length, 0);
  return { items: [...files.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? '')), ...listed], done };
}

function notes(dir) {
  return tryDir(`${dir}/notes`).filter((f) => f.endsWith('.md')).map((f) => {
    const { fm, body } = front(readFileSync(`${dir}/notes/${f}`, 'utf8'));
    const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !p.startsWith('#'));
    const title = fm.title ? String(fm.title) : paras.shift() ?? f;
    return { source: `notes/${f}`, title: title.replace(/\s+/g, ' '), date: (iso(fm.date)?.slice(0, 16) ?? f.slice(0, 10)).replace(' 00:00', ''),
      promoted: fm.promoted === true, detail: (fm.context ? String(fm.context) : paras[0] ?? null)?.replace(/\s+/g, ' ') ?? null };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// The queue after the head's next step: unfinished plans from the current phase on, then unchecked
// roadmap phases that have no plans yet. The first unfinished plan is the head's, so it is skipped.
function queue(fm, dir) {
  const n = fm.current_phase != null ? parseFloat(fm.current_phase) : null; if (n == null) return [];
  const out = [];
  for (const pd of tryDir(`${dir}/phases`).filter((d) => /^\d/.test(d) && parseFloat(d) >= n).sort((a, b) => parseFloat(a) - parseFloat(b))) {
    const files = tryDir(`${dir}/phases/${pd}`);
    for (const p of files.filter((f) => /-PLAN\.md$/.test(f)).sort()) {
      if (files.includes(p.replace('-PLAN.md', '-SUMMARY.md'))) continue;
      const obj = ((tryRead(`${dir}/phases/${pd}/${p}`) ?? '').match(/<objective>\s*([\s\S]*?)<\/objective>/) ?? [])[1] ?? '';
      out.push({ kind: 'plan', id: p.replace('-PLAN.md', ''), title: (obj.replace(/\s+/g, ' ').trim().match(/^.+?[.!?](?=\s|$)/) ?? [obj.trim() || p])[0] });
    }
  }
  const road = tryRead(`${dir}/ROADMAP.md`) ?? '';
  for (const m of road.matchAll(/^- \[ \] \*\*Phase (\d+(?:\.\d+)?):\s*(.+?)\*\*\s*[-—]?\s*(.*)$/gm)) {
    if (parseFloat(m[1]) <= n && out.length) continue;
    if (parseFloat(m[1]) === n && out.some((x) => x.id?.startsWith(String(n).padStart(2, '0')))) continue;
    const goal = (road.match(new RegExp(`### Phase 0*${m[1]}:[\\s\\S]*?\\*\\*Goal\\*\\*:?\\s*(.+)`)) ?? [])[1] ?? m[3];
    out.push({ kind: 'phase', id: `Phase ${m[1]}`, title: m[2].trim(), detail: goal?.trim() || null });
  }
  return out.slice(1, 7);
}

function build(key, src) {
  const empty = { key, label: src.label, pace: { current: null, plans: [] }, decisions: null, blockers: null, todos: { items: [], done: 0 }, notes: [], queue: [], quick: null };
  if (!src.dir) return empty;
  const raw = tryRead(`${src.dir}/STATE.md`); const { fm } = raw ? front(raw) : { fm: {} }; const corp = corpus(src.dir);
  return { ...empty, decisions: raw ? decisions(raw, src.dir) : null, blockers: raw ? blockers(raw, src.dir, corp) : null, todos: todos(raw, src.dir, corp),
    notes: notes(src.dir), queue: queue(fm, src.dir), pace: pace(fm, src.dir), quick: raw ? quick(raw, src.dir) : null };
}

// The document a decision was logged from: its plan, quick task, or the phase's CONTEXT/RESEARCH —
// live phases first, then the newest archived milestone. Null when nothing on disk matches.
function decisionSource(id, phase, dir) {
  if (!id) return null;
  const objective = (rel) => (tryRead(`${dir}/${rel}`) ?? '').match(/<objective>\s*([\s\S]*?)<\/objective>/)?.[1]?.replace(/\s+/g, ' ').match(/^.+?[.!?](?=\s|$)/)?.[0] ?? null;
  if (/^\d{6}-/.test(id)) {
    const d = tryDir(`${dir}/quick`).find((x) => x.startsWith(id + '-')); if (!d) return null;
    const fl = tryDir(`${dir}/quick/${d}`); const f = fl.find((x) => x.endsWith('-SUMMARY.md')) ?? fl.find((x) => x.endsWith('-PLAN.md'));
    return f ? { kind: 'Quick task', label: id, detail: objective(`quick/${d}/${fl.find((x) => x.endsWith('-PLAN.md')) ?? f}`), path: `quick/${d}/${f}` } : null;
  }
  const [num, part] = id.split('-');
  for (const pd of phaseDirs(dir, num)) {
    const files = tryDir(`${dir}/${pd}`);
    const f = files.find((x) => x === `${id}-PLAN.md`) ?? files.find((x) => new RegExp(`^0*${num}-${part}\\.md$`, 'i').test(x));
    if (!f) continue;
    const arch = pd.startsWith('milestones/') ? pd.split('/')[1].replace('-phases', '') : null;
    return /PLAN/.test(f) ? { kind: 'Plan', label: id, meta: arch, detail: objective(`${pd}/${f}`), path: `${pd}/${f}` }
      : { kind: part.toUpperCase() === 'CONTEXT' ? 'Context' : 'Research', label: `Phase ${num}`, meta: arch, detail: null, path: `${pd}/${f}` };
  }
  return null;
}

// ---------- where a blocker came from ----------
// Every .md file under .planning/ except STATE.md, read once per project.
function corpus(dir) {
  const out = [];
  const walk = (d) => { for (const f of tryDir(`${dir}/${d}`)) { const rel = d ? `${d}/${f}` : f; if (f.endsWith('.md')) { if (rel !== 'STATE.md') out.push({ rel, text: tryRead(`${dir}/${rel}`) ?? '' }); } else if (statSync(`${dir}/${rel}`, { throwIfNoEntry: false })?.isDirectory()) walk(rel); } };
  walk(''); return out;
}
// Phase directories for a phase number: live phases first, then archived milestones newest first.
function phaseDirs(dir, num) {
  const roots = ['phases', ...tryDir(`${dir}/milestones`).filter((d) => d.endsWith('-phases')).sort().reverse().map((d) => `milestones/${d}`)];
  return roots.flatMap((r) => tryDir(`${dir}/${r}`).filter((d) => parseFloat(d) === parseFloat(num) && /^\d/.test(d)).map((d) => `${r}/${d}`));
}
const base = (rel) => rel.split('/').pop().replace(/\.md$/, '');
const phaseOfDir = (rel) => String(parseFloat(rel.split('/').at(-2) ?? ''));

// Explicit references only — a plan id, a quick-task id, a review finding, a requirement id or a
// .md path that resolves to a real file. Anything that doesn't resolve (dates like 10-14, a Linear
// ticket, "Jul 21-22") drops out, so text search never invents a source.
function trail(b, dir, files) {
  const text = `${b.text} ${b.groupNote ?? ''}`;
  const sources = []; const seen = new Set(); const tokens = [];
  const add = (src, token) => { if (!src || seen.has(src.path)) return; seen.add(src.path); sources.push(src); if (token) tokens.push({ token, own: src.path }); };
  const find = (rel) => files.find((f) => f.rel === rel);
  // Review findings: "01-REVIEW WR-05", or a bare "WR-01" under a group that names its phase.
  const review = (num, id) => {
    for (const pd of phaseDirs(dir, num)) {
      const f = files.find((x) => x.rel.startsWith(pd + '/') && /-REVIEW\.md$/.test(x.rel)); if (!f) continue;
      const h = f.text.match(new RegExp(`^#+\\s*${id}\\b[:.\\s—-]*(.+)$`, 'm')); if (!h) continue;
      return { kind: 'Review finding', label: id, meta: `Phase ${num} review`, detail: h[1].replace(/`/g, '').trim(), path: f.rel };
    }
    return null;
  };
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)-REVIEW\s+((?:WR|CR|IN)-\d+)/g)) add(review(m[1], m[2]), `${m[1]}-REVIEW ${m[2]}`);
  const groupPhase = (`${b.group ?? ''} ${b.text}`.match(/\bPhase\s+(\d+)/) ?? [])[1];
  if (groupPhase) for (const m of b.text.matchAll(/(?<![-\w])((?:WR|CR)-\d+)\b/g)) add(review(groupPhase, m[1]), null);
  // Phase documents named outright: "(05-SECURITY notes 1–2)", "(05-UI-REVIEW)", "05-UAT".
  for (const m of text.matchAll(/(?<![\w.-])(\d{2}(?:\.\d)?)-(UAT|SECURITY|UI-REVIEW|UI-SPEC|VERIFICATION|VALIDATION|REVIEW|CONTEXT|RESEARCH|PATTERNS)(?![\w-]|\s+(?:WR|CR|IN)-)/g)) {
    for (const pd of phaseDirs(dir, m[1])) {
      const f = files.find((x) => x.rel.startsWith(pd + '/') && x.rel.endsWith(`-${m[2]}.md`)); if (!f) continue;
      add({ kind: m[2].replace('-', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()).replace(/^Ui /, 'UI ').replace(/^Uat$/, 'UAT'), label: `${m[1]}-${m[2]}`, meta: `Phase ${m[1]}${pd.startsWith('milestones/') ? ' · ' + pd.split('/')[1].replace('-phases', '') : ''}`, detail: null, path: f.rel }, null);
      break;
    }
  }
  // Plan ids: 03-07 — never part of a date.
  for (const m of text.matchAll(/(?<![\d.-])(\d{2}(?:\.\d)?-\d{2})(?![\d-])/g)) {
    for (const pd of phaseDirs(dir, m[1].split('-')[0])) {
      const plan = find(`${pd}/${m[1]}-PLAN.md`); if (!plan) continue;
      const done = find(`${pd}/${m[1]}-SUMMARY.md`);
      add({ kind: 'Plan', label: m[1], meta: `${done ? 'Has a summary' : 'No summary yet'}${pd.startsWith('milestones/') ? ' · ' + pd.split('/')[1].replace('-phases', '') : ''}`, detail: ((plan.text.match(/<objective>\s*([\s\S]*?)<\/objective>/) ?? [])[1] ?? '').replace(/\s+/g, ' ').match(/^.+?[.!?](?=\s|$)/)?.[0] ?? null, path: plan.rel }, null); // plan ids repeat across milestones and sibling plans cite them — no mentions
      break;
    }
  }
  // Quick tasks: 260714-3tp → its folder; the summary when there is one.
  for (const m of text.matchAll(/\b(\d{6}-[a-z0-9]{3})\b/g)) {
    const d = tryDir(`${dir}/quick`).find((x) => x.startsWith(m[1] + '-')); if (!d) continue;
    const fl = tryDir(`${dir}/quick/${d}`); const sum = fl.find((f) => f.endsWith('-SUMMARY.md')); const plan = fl.find((f) => f.endsWith('-PLAN.md'));
    const desc = (tryRead(`${dir}/quick/${d}/${plan ?? sum}`) ?? '').match(/<objective>\s*([\s\S]*?)<\/objective>/)?.[1]?.replace(/\s+/g, ' ').match(/^.+?[.!?](?=\s|$)/)?.[0] ?? null;
    add({ kind: 'Quick task', label: m[1], meta: sum ? 'Has a summary' : 'No summary yet', detail: desc, path: `quick/${d}/${sum ?? plan}` }, m[1]);
  }
  // Requirement ids, only when a requirements file defines them.
  for (const m of text.matchAll(/\b([A-Z][A-Z0-9]+-\d{2,})\b/g)) {
    if (/^(WR|CR|IN|D|T)-/.test(m[1])) continue;
    const f = files.find((x) => /REQUIREMENTS\.md$/.test(x.rel) && new RegExp(`\\*\\*${m[1]}\\*\\*|\\|\\s*${m[1]}\\s*\\|`).test(x.text)); if (!f) continue;
    const line = f.text.match(new RegExp(`\\*\\*${m[1]}\\*\\*:?\\s*(.+)`))?.[1] ?? null;
    add({ kind: 'Requirement', label: m[1], meta: base(f.rel), detail: line, path: f.rel }, m[1]);
  }
  // Paths named outright: "full detail in `milestones/v1.0-MILESTONE-AUDIT.md`" (often on the group line).
  for (const m of text.matchAll(/((?:milestones|phases|quick|research|todos|notes)\/[\w.\/-]+\.md)/g)) {
    const f = find(m[1]); if (f) add({ kind: 'Document', label: base(f.rel), meta: b.groupNote?.includes(m[1]) ? `Named for the whole “${(b.group ?? '').split(/\s+[—(]/)[0]}” group` : null, detail: null, path: f.rel }, null);
  }
  // Also mentioned in: other files that cite the same id, outside the source's own folder — sibling
  // plans in a phase cite each other as dependencies, which says nothing about the blocker.
  const mentions = []; const mseen = new Set(sources.map((x) => x.path));
  for (const { token, own } of tokens) {
    const ownDir = own.split('/').slice(0, -1).join('/');
    const re = new RegExp(`(?<![\\w.-])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(' ', '\\s+')}(?![\\w-])`);
    for (const f of files) {
      if (mseen.has(f.rel) || f.rel.startsWith(ownDir + '/') || !re.test(f.text)) continue;
      mseen.add(f.rel); mentions.push({ label: base(f.rel), path: f.rel, via: token });
    }
  }
  return { sources, mentions: mentions.slice(0, 8), moreMentions: Math.max(0, mentions.length - 8) };
}

// ---------- pace: every phase plan's recorded duration, from its own SUMMARY.md ----------
// STATE.md's Performance Metrics table is hand-appended and drifts (duplicate rows, "12 | 2 tasks"),
// so the numbers are rebuilt from each SUMMARY's `duration` + `completed` (top level or under
// `metrics:`). "~35min (this continuation…)" → 35, approximate; "1h" → 60; "7h 7m elapsed" is
// wall-clock time, not work, and "recovered"/"0min" say nothing — those plans count as untimed.
function minutes(raw) {
  if (raw == null) return { min: null, why: 'no duration' };
  const t = String(raw).toLowerCase();
  if (/elapsed/.test(t)) return { min: null, why: 'wall-clock time' };
  const h = t.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\b/); const m = t.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?\b/);
  const min = (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
  return !h && !m || !min ? { min: null, why: 'unreadable duration' } : { min, approx: /~|about|estimat/.test(t) };
}
function pace(fm, dir) {
  const roots = [['phases', fm.milestone ? String(fm.milestone) : null], ...tryDir(`${dir}/milestones`).filter((d) => d.endsWith('-phases')).map((d) => [`milestones/${d}`, d.replace('-phases', '')])];
  const plans = [];
  for (const [root, ms] of roots) for (const pd of tryDir(`${dir}/${root}`).filter((d) => /^\d/.test(d))) {
    const files = tryDir(`${dir}/${root}/${pd}`);
    for (const f of files.filter((x) => /^\d.*-SUMMARY\.md$/.test(x))) {
      const id = f.replace('-SUMMARY.md', '');
      const { fm: s } = front(tryRead(`${dir}/${root}/${pd}/${f}`) ?? '');
      const d = minutes(s.duration ?? s.metrics?.duration);
      const done = iso(s.completed ?? s.metrics?.completed)?.slice(0, 10) ?? null;
      const plan = tryRead(`${dir}/${root}/${pd}/${id}-PLAN.md`) ?? '';
      const tasks = (plan.match(/<task\b/g) ?? []).length || +(s.metrics?.tasks_completed ?? s.tasks_completed ?? 0) || null;
      plans.push({ id, phase: pd.split('-')[0], phaseName: pd.replace(/^[\d.]+-/, '').replace(/-/g, ' '), milestone: ms, date: /^\d{4}-\d\d-\d\d$/.test(done ?? '') ? done : null, min: d.min, approx: !!d.approx, why: d.why ?? null, tasks });
    }
  }
  return { current: fm.milestone ? String(fm.milestone) : null, plans: plans.sort((a, b) => (a.date ?? '9').localeCompare(b.date ?? '9') || a.milestone?.localeCompare(b.milestone ?? '') || a.id.localeCompare(b.id, undefined, { numeric: true })) };
}

const DASH = {}; for (const [k, s] of Object.entries(SOURCES)) DASH[k] = build(k, s);
writeFileSync(`${HERE}/data.js`, `// Generated by gen-data.mjs — do not edit.\nwindow.DASH = ${JSON.stringify(DASH, null, 1)};\n`);
for (const d of Object.values(DASH)) console.log(`${d.key}: decisions ${d.decisions?.length ?? '-'} · blockers ${d.blockers?.length ?? '-'} · todos ${d.todos.items.length} (+${d.todos.done} done) · notes ${d.notes.length} · queue ${d.queue.length} · quick ${d.quick?.length ?? '-'}`);
