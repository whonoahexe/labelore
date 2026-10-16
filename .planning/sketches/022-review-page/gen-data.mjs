// Sketch 022: builds data.js from real REVIEW.md files (plus one synthetic clean review), folding in
// each finding's outcome from a sibling REVIEW-FIX.md, the review's own `resolved:`/`open:`
// frontmatter, or an inline "> **RESOLVED** — commit" note.
// Run: node .planning/sketches/022-review-page/gen-data.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/home/noah/Work/Personal/labelore/package.json');
const matter = require('gray-matter');

const W = '/home/noah/Work';
const HERE = `${W}/Personal/labelore/.planning/sketches/022-review-page`;
const SOURCES = {
  sp01: { label: 'sp 01 · partly resolved (9)', path: `${W}/Cinedise/studio-portal/.planning/milestones/v1.0-phases/01-identity-persistence-foundation/01-REVIEW.md` },
  sb02: { label: 'sideby 02 · fix: 4 fixed, 3 skipped', path: `${W}/Sideby/plan.sideby.me/.planning/milestones/v1.0-phases/02-container-docs/02-REVIEW.md` },
  lb01: { label: 'labelore 01 · all fixed', path: `${W}/Personal/labelore/.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-REVIEW.md` },
  dd01: { label: 'deid 01 · 26 open, 4 critical', path: `${W}/Ibis/deid/deid-ui/.planning/milestones/v1.0-phases/01-volume-acquisition-fast-volume-render/01-REVIEW.md` },
  lb05: { label: 'labelore 05 · small (3)', path: `${W}/Personal/labelore/.planning/milestones/v1.1-phases/05-per-type-document-views/05-REVIEW.md` },
  clean: { label: 'synthetic · clean', path: `${HERE}/synthetic-clean-REVIEW.md`, synthetic: true },
};

const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const SEV = (id, section) => /^(CR|BL)-/i.test(id) || /critical|blocker/i.test(section) ? 'critical' : /^WR-/i.test(id) || /warning/i.test(section) ? 'warning' : 'info';

function parse(raw) { let fm = {}; try { fm = matter(raw).data; } catch { fm = {}; } const end = raw.startsWith('---') ? raw.indexOf('\n---', 3) : -1; const start = end > 0 ? raw.slice(0, end + 4).split('\n').length : 0; return { fm, start }; }
function sections(raw, start) {
  const lines = raw.split('\n'); const out = []; let cur = null; let fence = false;
  for (let i = start; i < lines.length; i++) { const l = lines[i]; if (!fence && /^[_*](Reviewed|Reviewer|Depth|Fixed|Fixer|Iteration|Verified|Verifier):.*[_*]\s*$/.test(l.trim())) continue; if (!fence && /^[_*]Reviewed:.*_Reviewer:/.test(l.trim())) continue; if (/^```/.test(l)) fence = !fence; const m = !fence && l.match(/^(#{1,3})\s+(.*)$/); if (m) { cur = { level: m[1].length, title: m[2].trim(), line: i + 1, body: '' }; out.push(cur); continue; } if (cur) cur.body += l + '\n'; }
  return out;
}
// "**Label:** value" fields; the last field (usually Fix) runs to the end, keeping code fences.
function fields(body) {
  const out = {}; const order = []; let cur = null; let fence = false;
  for (const l of body.split('\n')) {
    if (/^```/.test(l)) fence = !fence;
    const m = !fence && l.match(/^\*\*([A-Z][A-Za-z /'-]{1,40}?):?\*\*:?\s*(.*)$/);
    if (m) { cur = m[1].trim().toLowerCase(); order.push(cur); out[cur] = m[2]; continue; }
    if (cur) out[cur] += '\n' + l; else (out._lead = (out._lead ?? '') + l + '\n');
  }
  for (const k of Object.keys(out)) out[k] = out[k].replace(/\n---\s*$/,'').trim();
  return { f: out, order };
}
// File refs: `path:42`, `path:42-45`, `path` (several per field), plus "(line 76)".
function refs(s) {
  const out = []; const isPath = (p) => (/\//.test(p) && !/^[a-z]+:\/\//.test(p)) || /^[\w-][\w.-]*\.(tsx?|jsx?|mjs|cjs|rs|py|go|md|json|css|html|toml|ya?ml|sh|sql)$/.test(p) || /^Dockerfile$|\.dockerignore$/.test(p);
  for (const m of String(s ?? '').matchAll(/`([^`\s:]+)(?::([\d,\s–-]+))?`/g)) {
    if (!isPath(m[1])) continue;
    const spans = (m[2] ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const [a, b] = x.split(/[-–]/).map(Number); return { from: a, to: b || a }; }).filter((x) => x.from);
    out.push({ path: m[1], spans });
  }
  return out;
}

function fixReport(reviewPath) {
  const p = join(dirname(reviewPath), basename(reviewPath).replace(/-REVIEW\.md$/, '-REVIEW-FIX.md'));
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, 'utf8'); const { fm, start } = parse(raw); const secs = sections(raw, start); const map = {};
  let mode = null;
  for (const s of secs) {
    if (s.level === 2) { mode = /^fixed/i.test(s.title) ? 'fixed' : /^skipped/i.test(s.title) ? 'skipped' : /deferred|out of scope/i.test(s.title) ? 'deferred' : null;
      if (mode === 'deferred') for (const m of s.body.matchAll(/\*\*([A-Z]{2}-\d+)\*\*\s*[—-]\s*(.+)/g)) map[m[1]] = { outcome: 'deferred', note: clean(m[2]) };
      continue; }
    const id = (s.title.match(/^([A-Z]{2}-\d+)/) ?? [])[1]; if (!id || !mode || mode === 'deferred') continue;
    const { f } = fields(s.body);
    map[id] = mode === 'fixed' ? { outcome: 'fixed', commit: (f.commit ?? '').replace(/`/g, '').trim() || null, files: refs(f['files modified']).map((r) => r.path), note: clean(f['applied fix'] ?? '') } : { outcome: 'skipped', note: clean(f.reason ?? '') };
  }
  const deferredLine = raw.match(/fix_scope:\s*`?([a-z_]+)`?/);
  return { path: p.replace(W + '/', '~/Work/'), status: fm.status ?? null, fixedAt: fm.fixed_at instanceof Date ? fm.fixed_at.toISOString() : fm.fixed_at ?? null, iteration: fm.iteration ?? null, inScope: fm.findings_in_scope ?? null, fixed: fm.fixed ?? null, skipped: fm.skipped ?? null, scope: deferredLine?.[1] ?? null, map };
}

function build(key, src) {
  const raw = readFileSync(src.path, 'utf8'); const { fm, start } = parse(raw); const secs = sections(raw, start);
  const h1 = secs.find((s) => s.level === 1)?.title ?? null;
  const summarySec = secs.find((s) => s.level === 2 && /^summary/i.test(s.title));
  const fx = fixReport(src.path);
  const fmResolved = Object.fromEntries(arr(fm.resolved).filter((r) => r && r.id).map((r) => [r.id, { outcome: 'fixed', commit: r.commit ?? null, note: clean(r.note ?? ''), source: 'frontmatter' }]));
  const fmOpen = new Set(arr(fm.open).map((x) => String(x).split(/\s/)[0]));
  // findings: ### XX-NN under any ## section
  let section = ''; const findings = [];
  for (const s of secs) {
    if (s.level <= 2) { section = s.title; continue; }
    const m = s.title.match(/^([A-Z]{2}-\d+)\s*[:—-]\s*(.*)$/); if (!m) continue;
    const { f, order } = fields(s.body);
    const inline = (f._lead ?? '').match(/>\s*\*\*RESOLVED[^*]*\*\*\s*[—-]?\s*(?:commit\s*`?([0-9a-f]{6,})`?)?\.?\s*([\s\S]*)/i);
    const file = f.file ?? f.files ?? f.location ?? '';
    const extra = order.filter((k) => !['file', 'files', 'location', 'issue', 'fix'].includes(k)).map((k) => ({ label: k, text: f[k] }));
    let outcome = fx?.map[m[1]] ?? fmResolved[m[1]] ?? (inline ? { outcome: 'fixed', commit: inline[1] ?? null, note: clean(inline[2]).replace(/^—\s*/, ''), source: 'inline' } : null);
    if (!outcome && fx) outcome = { outcome: SEV(m[1], section) === 'info' ? 'deferred' : 'open', note: SEV(m[1], section) === 'info' ? 'Not in the fix run’s scope' : '' };
    if (!outcome && fmOpen.has(m[1])) outcome = { outcome: 'open', note: '' };
    findings.push({ id: m[1], title: m[2].trim(), severity: SEV(m[1], section), section, line: s.line, fileRaw: clean(file), refs: refs(file), issue: (f.issue ?? (f._lead ?? '').replace(/^>.*$/gm, '')).trim(), fix: (f.fix ?? '').trim(), extra, outcome: outcome ?? { outcome: 'open', note: '' } });
  }
  // files: reviewed list + any file named by a finding but missing from the list
  const listed = arr(fm.files_reviewed_list).map(String);
  const named = [...new Set(findings.flatMap((x) => x.refs.map((r) => r.path)))];
  const norm = (p) => p.replace(/^\.\//, '');
  const files = listed.map((p) => ({ path: p, listed: true }));
  for (const p of named) { if (!files.some((f) => norm(f.path) === norm(p) || norm(f.path).endsWith('/' + norm(p)) || norm(p).endsWith('/' + norm(f.path)))) files.push({ path: p, listed: false }); }
  for (const f of files) f.findings = findings.filter((x) => x.refs.some((r) => norm(r.path) === norm(f.path) || norm(f.path).endsWith('/' + norm(r.path)) || norm(r.path).endsWith('/' + norm(f.path)))).map((x) => x.id);
  const handled = /^(summary|critical|warnings?|info|structural findings|narrative findings)/i;
  const other = secs.filter((s) => s.level === 2 && !handled.test(s.title)).map((s) => ({ title: s.title, line: s.line }));
  const counts = fm.findings ?? {};
  return {
    key, label: src.label, synthetic: !!src.synthetic, path: src.path.replace(W + '/', '~/Work/'),
    phase: String(fm.phase ?? ''), reviewed: fm.reviewed instanceof Date ? fm.reviewed.toISOString() : String(fm.reviewed ?? ''), depth: fm.depth ?? null, status: String(fm.status ?? 'unknown'),
    filesReviewed: fm.files_reviewed ?? listed.length, counts: { critical: counts.critical ?? counts.blocker ?? null, warning: counts.warning ?? null, info: counts.info ?? null, total: counts.total ?? null },
    h1, summary: summarySec ? summarySec.body.trim().replace(/\n-{3,}\s*$/, '').trim() : null, summaryLine: summarySec?.line ?? null, findings, files, fix: fx ? { ...fx, map: undefined } : null, other, raw,
  };
}
const DOCS = {}; for (const [k, s] of Object.entries(SOURCES)) DOCS[k] = build(k, s);
writeFileSync(`${HERE}/data.js`, `// Generated by gen-data.mjs — do not edit.\nwindow.DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const d of Object.values(DOCS)) console.log(d.key, d.status, `findings=${d.findings.length}`, d.findings.map((f) => f.id + ':' + f.outcome.outcome[0] + (f.refs.length ? '' : '!')).join(' '), `files=${d.files.length} unlisted=${d.files.filter((f) => !f.listed).length}`, `fix=${d.fix?.status ?? '-'}`, `other=${d.other.map((o) => o.title).join('|')}`);
