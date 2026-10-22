// Sketches 027 + 028: builds data.js for the TODO page (027) and the NOTE page (028) from real
// .planning/todos and .planning/notes files, read only. Each document carries its relatives:
// a todo's source notes (frontmatter `notes:`, `[[slug]]` wiki links, `notes/…md` mentions, or a
// note promoted word-for-word), and a note's todos (the reverse lookup).
// Run: node .planning/sketches/027-todo-page/gen-data.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/cinedise/codebases/labelore/package.json');
const matter = require('gray-matter');

const W = '/home/cinedise/codebases';
const SK = `${W}/labelore/.planning/sketches`;
const PROJECTS = {
  duet: `${W}/duet`,
  portal: `${W}/cinedise-portal`,
  labelore: `${W}/labelore`,
  synthetic: `${W}/labelore/test/fixtures/dashboard/synthetic`,
};

const TODOS = {
  dcrop: { label: 'duet · done · problem/solution/resolution, 2 notes', project: 'duet', path: 'todos/completed/2026-10-21-add-crop-and-round-profile-photos.md' },
  dsfx: { label: 'duet · done · shipped ≠ planned', project: 'duet', path: 'todos/completed/2026-10-20-sound-effects.md' },
  dcall: { label: 'duet · done · no resolution, long solution', project: 'duet', path: 'todos/completed/2026-10-20-call-debug-logging.md' },
  sretry: { label: 'synthetic · pending · major, line-range files', project: 'synthetic', path: 'todos/pending/2026-10-12-retry-queue-dead-letter.md' },
  srec: { label: 'synthetic · pending · problem only', project: 'synthetic', path: 'todos/pending/2026-10-15-reconcile-report-pdf.md' },
  star: { label: 'synthetic · pending · promoted from a note', project: 'synthetic', path: 'todos/pending/004-tariff-note-tooltips.md' },
  sport: { label: 'synthetic · done · frontmatter only', project: 'synthetic', path: 'todos/completed/2026-10-02-port-timezone-table.md' },
  pcheck: { label: 'portal · pending · checklist, high', project: 'portal', path: 'todos/pending/pre-milestone-hardware-and-tier-cleanup.md' },
  pdev: { label: 'portal · done · prose, no resolution', project: 'portal', path: 'todos/completed/portal-detect-vanished-tier-device.md' },
  lfig: { label: 'labelore · pending · long prose', project: 'labelore', path: 'todos/pending/lifted-figures-everywhere.md' },
  ldrift: { label: 'labelore · done · closing callout, tables', project: 'labelore', path: 'todos/done/artifact-chrome-drift.md' },
};

const NOTES = {
  dcrop: { label: 'duet · quick · Today / Decided / How, batched', project: 'duet', path: 'notes/2026-10-21-crop-images-and-profile-photos.md' },
  dround: { label: 'duet · quick · Decided + Batch with', project: 'duet', path: 'notes/2026-10-21-round-profile-photos.md' },
  dsfx: { label: 'duet · quick · Decided / Suggested / Limits', project: 'duet', path: 'notes/2026-10-20-sound-effects.md' },
  dcall: { label: 'duet · quick · Observed / Want / Off limits', project: 'duet', path: 'notes/2026-10-20-call-debug-logging-webrtc-turn.md' },
  dback: { label: 'duet · quick · Bug / Cause / Fix, no todo names it', project: 'duet', path: 'notes/2026-10-20-back-button-closes-app.md' },
  pcap: { label: 'portal · quick · unlabelled prose, file:line refs', project: 'portal', path: 'notes/2026-10-21-raise-single-file-download-cap.md' },
  star: { label: 'synthetic · quick · one line, promoted', project: 'synthetic', path: 'notes/2026-10-16-tariff-note-tooltips.md' },
  sundo: { label: 'synthetic · quick · not promoted, a question', project: 'synthetic', path: 'notes/2026-10-08-brokers-want-undo.md' },
  pbrief: { label: 'portal · explore note · titled, 42 lines', project: 'portal', path: 'notes/2026-10-23-studio-media-workflow-milestone-brief.md' },
  lperkind: { label: 'labelore · explore note · 112 lines, tables', project: 'labelore', path: 'notes/per-kind-artifact-rendering.md' },
};

const str = (v) => (v == null ? null : v instanceof Date ? (v.toISOString().slice(11, 16) === '00:00' ? v.toISOString().slice(0, 10) : v.toISOString()) : String(v).trim() || null);
const list = (v) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);

function read(project, rel) {
  const abs = `${PROJECTS[project]}/.planning/${rel}`;
  const raw = readFileSync(abs, 'utf8');
  let fm = {}, body = raw;
  try { const m = matter(raw); fm = m.data; body = m.content; } catch {}
  return { raw, fm, body: body.replace(/^\n+/, '') };
}

// Every todo and note in a project, for relative lookups.
function scan(project, dir) {
  const base = `${PROJECTS[project]}/.planning/${dir}`;
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? scan(project, `${dir}/${e.name}`) : e.name.endsWith('.md') ? [`${dir}/${e.name}`] : []);
}

// "## Heading" sections; text before the first heading is the preamble.
function sections(body) {
  const out = []; let cur = { heading: null, lines: [] };
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.*)$/);
    if (m) { out.push(cur); cur = { heading: m[1].trim(), lines: [] }; } else cur.lines.push(line);
  }
  out.push(cur);
  return out.map((s) => ({ heading: s.heading, md: s.lines.join('\n').trim() })).filter((s) => s.heading || s.md);
}

function folderStatus(rel) { return /\/pending\//.test(rel) ? 'pending' : /\/(completed|done)\//.test(rel) ? 'done' : 'unknown'; }

function noteSummary(project, rel) {
  const abs = `${PROJECTS[project]}/.planning/${rel}`;
  if (!existsSync(abs)) return { path: `.planning/${rel}`, missing: true };
  const { fm, body } = read(project, rel);
  return { path: `.planning/${rel}`, date: str(fm.date), promoted: fm.promoted === true, title: str(fm.title), text: body.trim() };
}

function todoSummary(project, rel) {
  const { fm, body } = read(project, rel);
  const secs = sections(body);
  const res = secs.find((s) => /^resolution$/i.test(s.heading ?? ''));
  return {
    path: `.planning/${rel}`, title: str(fm.title), status: folderStatus(rel),
    weight: str(fm.severity) ?? str(fm.priority), area: str(fm.area) ?? str(fm.theme),
    resolution: res ? res.md : null, notes: list(fm.notes),
  };
}

// Which notes a todo came from: frontmatter, [[slug]] links, notes/… mentions, or promoted text.
function notesOfTodo(project, fm, body) {
  const found = new Map();
  for (const n of list(fm.notes)) found.set(n.replace(/^\.planning\//, ''), 'frontmatter');
  for (const m of body.matchAll(/\[\[([\w-]+)\]\]/g)) if (existsSync(`${PROJECTS[project]}/.planning/notes/${m[1]}.md`)) found.set(`notes/${m[1]}.md`, 'wiki link');
  for (const m of body.matchAll(/(?:\.planning\/)?(notes\/[\w.-]+\.md)/g)) found.set(m[1], found.get(m[1]) ?? 'mentioned');
  if (/promoted from \/gsd-note/i.test(str(fm.source) ?? '')) {
    const goal = (sections(body).find((s) => /^goal$/i.test(s.heading ?? ''))?.md ?? '').trim();
    for (const rel of scan(project, 'notes')) if (read(project, rel).body.trim() === goal) found.set(rel, 'promoted');
  }
  return [...found].map(([rel, via]) => ({ ...noteSummary(project, rel), via }));
}

function buildTodo(key, src) {
  const { raw, fm, body } = read(src.project, src.path);
  const secs = sections(body);
  const pre = secs.find((s) => !s.heading);
  // A closing callout: a leading blockquote that says Closed/Done/Resolved.
  let callout = null; let preMd = pre?.md ?? '';
  const cm = preMd.match(/^((?:>.*\n?)+)/);
  if (cm && /closed|done|resolved|completed/i.test(cm[1])) { callout = cm[1].replace(/^> ?/gm, '').trim(); preMd = preMd.slice(cm[1].length).trim(); }
  preMd = preMd.replace(/^#\s+.*\n?/, '').trim(); // the H1 repeats the title
  const named = secs.filter((s) => s.heading);
  const resolution = named.find((s) => /^resolution$/i.test(s.heading));
  const completedBy = str(fm.completed_by);
  const closeText = [resolution?.md, completedBy, callout].filter(Boolean).join(' ');
  return {
    key, label: src.label, project: src.project, path: `.planning/${src.path}`,
    status: folderStatus(src.path), statusField: str(fm.status),
    title: str(fm.title), created: str(fm.created) ?? str(fm.date),
    severity: str(fm.severity), priority: str(fm.priority),
    area: str(fm.area), theme: str(fm.theme), order: str(fm.order), source: str(fm.source),
    completed: str(fm.completed), completedBy,
    quickTask: closeText.match(/quick(?: task)?\s+([0-9]{6}-[a-z0-9]{3})/i)?.[1] ?? null,
    commits: [...(completedBy ?? '').matchAll(/\b[0-9a-f]{7}\b/g)].map((m) => m[0]),
    files: list(fm.files),
    callout, preamble: preMd || null,
    sections: named.map((s) => ({ heading: s.heading, md: s.md })),
    notes: notesOfTodo(src.project, fm, body),
    raw,
  };
}

function buildNote(key, src) {
  const { raw, fm, body } = read(src.project, src.path);
  const rel = src.path;
  // Todos that name this note, or were promoted from its text.
  const todos = [];
  for (const t of scan(src.project, 'todos')) {
    const { fm: tfm, body: tbody } = read(src.project, t);
    const links = notesOfTodo(src.project, tfm, tbody);
    const hit = links.find((n) => n.path === `.planning/${rel}`);
    if (hit) todos.push({ ...todoSummary(src.project, t), via: hit.via, batchedWith: links.filter((n) => n.path !== `.planning/${rel}`).map((n) => ({ path: n.path, text: n.text, title: n.title, date: n.date })) });
  }
  const headings = body.split('\n').filter((l) => /^#{1,3}\s/.test(l));
  return {
    key, label: src.label, project: src.project, path: `.planning/${rel}`,
    date: str(fm.date), promoted: fm.promoted === true ? true : fm.promoted === false ? false : null,
    title: str(fm.title), context: str(fm.context),
    kind: fm.title || headings.length ? 'document' : 'quick',
    body: body.trim(), todos, raw,
  };
}

const todos = Object.fromEntries(Object.entries(TODOS).map(([k, s]) => [k, buildTodo(k, s)]));
const notes = Object.fromEntries(Object.entries(NOTES).map(([k, s]) => [k, buildNote(k, s)]));
writeFileSync(`${SK}/027-todo-page/data.js`, `// generated by gen-data.mjs — real todo files, read only\nwindow.DATA = ${JSON.stringify(todos, null, 1)};\n`);
writeFileSync(`${SK}/028-note-page/data.js`, `// generated by ../027-todo-page/gen-data.mjs — real note files, read only\nwindow.DATA = ${JSON.stringify(notes, null, 1)};\n`);
for (const [k, t] of Object.entries(todos)) console.log('todo', k, t.status, t.sections.map((s) => s.heading).join('|'), 'notes:', t.notes.map((n) => n.via + ':' + n.path.split('/').pop()).join(', '), t.quickTask ?? '');
for (const [k, n] of Object.entries(notes)) console.log('note', k, n.kind, n.promoted, 'todos:', n.todos.map((t) => t.via + ':' + t.path.split('/').pop() + ' +' + t.batchedWith.length).join(', '));
