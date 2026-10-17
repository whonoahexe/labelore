// Sketch 025: builds data.js from PROJECT.md files — the H1 (split into name + tagline on " — "),
// What This Is and Core Value, each cut to a short lead with the rest kept for a "full" toggle.
// Run: node .planning/sketches/025-dashboard-project-head/gen-data.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/noah/Work/Personal/labelore/package.json');
const matter = require('gray-matter');

const W = '/home/noah/Work';
const HERE = `${W}/Personal/labelore/.planning/sketches/025-dashboard-project-head`;
// `state` is the project's .planning/ directory (STATE.md, ROADMAP.md, phases/) or a lone STATE.md.
const SOURCES = {
  lab: { label: 'labelore · milestone done', path: `${W}/Personal/labelore/.planning/PROJECT.md`, state: `${W}/Personal/labelore/.planning` },
  sp: { label: 'studio-portal · executing', path: `${W}/Cinedise/studio-portal/.planning/PROJECT.md`, state: `${W}/Cinedise/studio-portal/.planning` },
  sb: { label: 'sideby.me · long', path: `${W}/Sideby/plan.sideby.me/.planning/PROJECT.md`, state: `${W}/Sideby/plan.sideby.me/.planning` },
  syn: { label: 'synthetic · planning', path: `${HERE}/synthetic-PROJECT.md`, synthetic: true, state: `${HERE}/synthetic-STATE.md` },
  fx: { label: 'fixture · dense', path: `${W}/Personal/labelore/fixtures/dense/.planning/PROJECT.md`, state: `${W}/Personal/labelore/fixtures/dense/.planning` },
  sparse: { label: 'synthetic · nothing yet', path: `${HERE}/sparse-PROJECT.md`, synthetic: true, state: null },
};

// The section body as paragraphs, minus italic-only review notes ("*Reviewed at …*") and anything
// after the first sub-heading.
function paragraphs(body) {
  const cut = body.split(/^#{3,}\s/m)[0];
  return cut.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p && !/^\*[^*]/.test(p) && !/^---$/.test(p));
}

// Sentence split that ignores full stops inside code spans and in names like "sideby.me".
function sentences(p) {
  const codes = []; const masked = p.replace(/`[^`]*`/g, (m) => { codes.push(m); return `\u0000${codes.length - 1}\u0000`; });
  const parts = masked.split(/(?<=[.!?](?:\*\*)?)\s+(?=[A-Z*(\u0000])/);
  return parts.map((s) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]));
}

// Lead = a leading bold sentence if the paragraph opens with one, otherwise sentences until the
// lead is at least 70 characters (never more than two). A lead still over 160 characters is cut at
// its first " — " or ": " clause break.
function lead(ps) {
  if (!ps.length) return null;
  const first = ps[0];
  const bold = first.match(/^\*\*(.+?)\*\*/);
  if (bold) return { lead: bold[1].trim(), cut: true, full: ps.join('\n\n') };
  const ss = sentences(first); let out = ss[0];
  if (out.replace(/[`*]/g, '').length < 70 && ss[1]) out += ' ' + ss[1];
  let cut = false;
  if (out.length > 160) { const m = out.match(/^(.{20,}?)(?:\s+—\s+|:\s+)/); if (m) { out = m[1].replace(/[,;]$/, '') + '.'; cut = true; } }
  return { lead: out, cut: cut || ss.length > 1 || ps.length > 1, full: ps.join('\n\n') };
}

const tryRead = (f) => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
const titleCase = (slug) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
// A short clause: cut at the first " — ", "(" or ";" and cap at ~72 characters.
function clause(s) {
  if (!s) return null;
  const q = String(s).match(/quick task\s+[0-9a-z-]+\s*(?:\(([^)]+)\)|[—:-]\s*(.+))/i);
  if (q) s = 'Quick task: ' + (q[1] ?? q[2]).split(/,\s+/)[0];
  let out = String(s).split(/\s+—\s+|\s+\((?!.*\)$)|;\s+/)[0].trim();
  if (out.length > 72) out = out.slice(0, 70).replace(/\s+\S*$/, '') + '…';
  return out;
}

// STATE.md frontmatter → the head's position line and the state card. The phase name comes from the
// milestone's roadmap first, then STATE.md, then the main roadmap; the next plan is the first PLAN.md
// in the current phase with no SUMMARY.md beside it — gates and blockers are not "next".
function state(dir) {
  if (!dir) return null;
  const isFile = dir.endsWith('.md'); const raw = tryRead(isFile ? dir : `${dir}/STATE.md`); if (!raw) return null;
  let fm = {}; let body = raw; try { const m = matter(raw); fm = m.data; body = m.content; } catch {}
  const n = fm.current_phase != null ? String(+fm.current_phase || fm.current_phase) : null;
  const roadmaps = isFile ? [] : [tryRead(`${dir}/milestones/${fm.milestone}-ROADMAP.md`), tryRead(`${dir}/ROADMAP.md`)];
  const heading = (txt) => { if (!txt || !n) return null; const m = txt.match(new RegExp(`^#{2,4}\\s+Phase 0*${n}:\\s*(.+?)\\s*$`, 'm')); return m ? m[1].replace(/\\*/g, '').trim() : null; };
  const listed = (txt) => { if (!txt || !n) return null; const m = txt.match(new RegExp(`Phase 0*${n}:\\s*\\**(.+?)\\**(?:\\s+[-—(]|\\s*$)`, 'm')); return m ? m[1].trim() : null; };
  const fmName = fm.current_phase_name ? (/^[a-z0-9-]+$/.test(fm.current_phase_name) ? titleCase(fm.current_phase_name) : fm.current_phase_name) : null;
  const phaseName = heading(roadmaps[0]) ?? fmName ?? heading(roadmaps[1]) ?? listed(roadmaps[1]);
  const p = fm.progress ?? {};
  const done = p.total_plans > 0 && p.completed_plans >= p.total_plans && p.completed_phases >= p.total_phases;
  let next = null;
  if (!isFile && n && !done) {
    let dirs = []; try { dirs = readdirSync(`${dir}/phases`).filter((d) => /^\d/.test(d) && parseFloat(d) >= +n).sort((a, b) => parseFloat(a) - parseFloat(b)); } catch {}
    for (const phaseDir of dirs) {
      const files = readdirSync(`${dir}/phases/${phaseDir}`);
      const plan = files.filter((f) => /-PLAN\.md$/.test(f)).sort().find((f) => !files.includes(f.replace('-PLAN.md', '-SUMMARY.md')));
      if (plan) {
        const pr = readFileSync(`${dir}/phases/${phaseDir}/${plan}`, 'utf8');
        const obj = (pr.match(/<objective>\s*([\s\S]*?)<\/objective>/) ?? [])[1] ?? '';
        next = { kind: 'plan', id: plan.replace('-PLAN.md', ''), title: sentences(obj.replace(/\s*\n\s*/g, ' ').trim())[0]?.replace(/\.$/, '') || plan };
        break;
      }
    }
  }
  // The current phase's own plans — done = has a SUMMARY.md — from phases/ or the milestone's archive.
  let phasePlans = null;
  if (!isFile && n) {
    for (const root of [`${dir}/phases`, `${dir}/milestones/${fm.milestone}-phases`]) {
      let pd = null; try { pd = readdirSync(root).find((d) => new RegExp(`^0*${n}-`).test(d)); } catch {}
      if (!pd) continue;
      const files = readdirSync(`${root}/${pd}`); const plans = files.filter((f) => /-PLAN\.md$/.test(f)).sort();
      phasePlans = plans.map((f) => ({ id: f.replace('-PLAN.md', ''), done: files.includes(f.replace('-PLAN.md', '-SUMMARY.md')) }));
      break;
    }
  }
  const focus = (body.match(/\*\*Current focus:\*\*\s*(.+)/) ?? [])[1] ?? null;
  if (!next && done) next = { kind: 'milestone', id: null, title: 'Start the next milestone' };
  // A focus line that only names the phase says nothing the head doesn't — say what the status implies.
  if (!next && focus && !/^Phase\s/i.test(focus)) next = { kind: 'focus', id: null, title: clause(focus.replace(/`/g, '')) };
  if (!next && n) next = { kind: 'phase', id: null, title: `${/plan/i.test(fm.status ?? '') ? 'Plan' : 'Continue'} phase ${n}` };
  const date = fm.last_activity instanceof Date ? fm.last_activity.toISOString().slice(0, 10) : (fm.last_activity ? String(fm.last_activity) : null);
  return { milestone: fm.milestone ?? null, milestoneName: fm.milestone_name ?? null, phase: n, phaseName, status: fm.status ?? null,
    progress: { phases: [p.completed_phases ?? 0, p.total_phases ?? 0], plans: [p.completed_plans ?? 0, p.total_plans ?? 0], percent: p.percent ?? null },
    phasePlans, done, next, last: date || fm.last_activity_desc ? { date, what: clause(fm.last_activity_desc) } : null };
}

function build(key, src) {
  const raw = readFileSync(src.path, 'utf8'); let body = raw; try { body = matter(raw).content; } catch {}
  const h1 = (body.match(/^#\s+(.+)$/m) ?? [])[1]?.trim() ?? null;
  const [name, tagline] = h1 ? h1.split(/\s+[—–]\s+/) : [null, null];
  const sec = (re) => { const m = body.split(/^##\s+/m).find((s) => re.test(s.split('\n')[0])); return m ? m.slice(m.indexOf('\n') + 1) : null; };
  const what = sec(/^what this is/i); const core = sec(/^core value/i);
  return { key, label: src.label, synthetic: !!src.synthetic, path: src.path.replace(W + '/', '~/Work/'), name: name ?? null, tagline: tagline ?? null,
    what: what ? lead(paragraphs(what)) : null, core: core ? lead(paragraphs(core)) : null, state: state(src.state) };
}
const DOCS = {}; for (const [k, s] of Object.entries(SOURCES)) DOCS[k] = build(k, s);
writeFileSync(`${HERE}/data.js`, `// Generated by gen-data.mjs — do not edit.\nwindow.DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const d of Object.values(DOCS)) console.log(`${d.key}: ${d.name} | ${d.tagline ?? '-'}\n  what: ${d.what?.lead ?? '-'}\n  core: ${d.core?.lead ?? '-'}\n  state: ${JSON.stringify(d.state)}`);
