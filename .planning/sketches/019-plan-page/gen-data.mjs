// Sketch 019: builds data.js from real PLAN.md files. Run: node gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire('/home/cinedise/labelore/package.json');
const matter = require('gray-matter');

const H = '/home/cinedise';
const SOURCES = {
  '0501': { label: '05-01 tracer · long', path: `${H}/labelore/.planning/milestones/v1.1-phases/05-per-type-document-views/05-01-PLAN.md`, project: 'labelore', done: true },
  '0x4': { label: '0x4 · 7 tasks', path: `${H}/labelore/.planning/milestones/v1.0-quick/260910-0x4-close-every-tech-debt-item-in-planning-v/260910-0x4-PLAN.md`, project: 'labelore', done: true },
  '0106': { label: '01-06 human-action', path: `${H}/studio-portal/.planning/phases/01-portal-owned-identity-sessions/01-06-PLAN.md`, project: 'studio-portal', done: true },
  '0402': { label: '04-02 decision', path: `${H}/studio-portal/.planning/phases/04-bulk-archive-downloads/04-02-PLAN.md`, project: 'studio-portal', done: false },
  'sya': { label: 'sya human-verify', path: `${H}/studio-portal/.planning/quick/260802-sya-improve-navbar-visual-design-to-match-br/260802-sya-PLAN.md`, project: 'studio-portal', done: true },
};

// Requirement text per ID (from the projects' REQUIREMENTS files), shortened only where they wrap.
const REQS = {
  'VIEW-01': 'Each artifact type renders through a view selected for that type, rather than one generic reader',
  'VIEW-02': 'A discussion log shows, for each question, the options that were offered and which one was chosen',
  'UI-06': 'Every document view uses that language — moving between a document and the dashboard reads as one application',
  'AUTH-01': 'A member can log in to the portal with a username and password, without Cloudflare Access',
  'AUTH-02': 'A member with a temporary password must change it before reaching any other page or API endpoint',
  'AUTH-03': 'A member can log out, and the session stops working immediately',
  'DL-03': 'A selection totalling more than 400 GB is refused before any work starts, and the member is shown the total',
  'HARDEN-01': 'A malformed `on_collision` value is rejected by the API rather than silently skipping the collision pre-flight (WR-01)',
};

function topBlocks(body) {
  const out = []; const re = /^<([a-z_][\w-]*)([^>\n]*)>([\s\S]*?)<\/\1>/gm; let m;
  while ((m = re.exec(body))) out.push({ tag: m[1], attrs: m[2].trim(), body: m[3] });
  return out;
}
function children(body) {
  const out = []; const re = /<([a-z_][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*>([\s\S]*?)<\/\1>/g; let m;
  while ((m = re.exec(body))) out.push({ tag: m[1], attrs: attrsOf(m[2]), body: dedent(m[3]) });
  return out;
}
function attrsOf(s) { const o = {}; for (const m of s.matchAll(/([\w-]+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; }
function dedent(s) {
  const lines = s.replace(/^\n+|\s+$/g, '').split('\n');
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(Number.isFinite(ind) ? ind : 0)).join('\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function bullets(s) { return s.split('\n').map((l) => l.replace(/^\s*-\s+/, '').trim()).filter(Boolean); }

const DOCS = {};
for (const [key, src] of Object.entries(SOURCES)) {
  const raw = readFileSync(src.path, 'utf8');
  let fm = {}; let body = raw;
  try { const g = matter(raw); fm = g.data; body = g.content; } catch {}
  const blocks = topBlocks(body);
  const get = (t) => blocks.find((b) => b.tag === t)?.body ?? null;
  const tasksBody = get('tasks') ?? '';
  const tasks = [...tasksBody.matchAll(/<task([^>]*)>([\s\S]*?)<\/task>/g)].map((m, i) => {
    const a = attrsOf(m[1]); const kids = children(m[2]); const f = (t) => kids.find((k) => k.tag === t);
    const verify = f('verify');
    const verifyItems = verify ? children(verify.body).map((k) => ({ kind: k.tag, text: k.body })) : [];
    const known = ['name', 'files', 'read_first', 'action', 'verify', 'acceptance_criteria', 'done', 'decision', 'context', 'options', 'resume-signal', 'what-built', 'how-to-verify', 'instructions', 'verification', 'pre-condition', 'precondition', 'behavior', 'reversibility', 'after-resume'];
    return {
      n: i + 1,
      type: a.type ?? 'auto', gate: a.gate ?? null, tdd: a.tdd === 'true',
      name: (f('name')?.body ?? (f('what-built')?.body.replace(/\s+/g, ' ').match(/^(.{8,90}?)(?::|\s—)/)?.[1] ?? `Task ${i + 1}`)).replace(/^Task\s+\d+:\s*/, ''),
      files: f('files') ? f('files').body.split(/,\s*|\n/).map((s) => s.trim()).filter(Boolean) : [],
      readFirst: f('read_first') ? bullets(f('read_first').body) : [],
      action: f('action')?.body ?? null,
      behavior: f('behavior') ? bullets(f('behavior').body) : [],
      precondition: (f('precondition') ?? f('pre-condition'))?.body ?? null,
      reversibility: f('reversibility') ? { rating: f('reversibility').attrs.rating, text: f('reversibility').body } : null,
      verify: verifyItems.length ? verifyItems : verify ? [{ kind: 'text', text: verify.body }] : [],
      acceptance: f('acceptance_criteria') ? bullets(f('acceptance_criteria').body) : [],
      done: f('done')?.body ?? null,
      decision: f('decision')?.body ?? null, context: f('context')?.body ?? null,
      options: f('options') ? (children(f('options').body).length ? children(f('options').body).map((o) => { const k = children(o.body); return { id: o.attrs.id, name: k.find((x) => x.tag === 'name')?.body, pros: k.find((x) => x.tag === 'pros')?.body, cons: k.find((x) => x.tag === 'cons')?.body }; }) : f('options').body.split(/;\s*/).map((s) => { const [n, ...r] = s.split(/\s+—\s+/); return { name: n.trim(), desc: r.join(' — ').replace(/\.$/, '') }; })) : [],
      resumeSignal: f('resume-signal')?.body ?? null,
      whatBuilt: f('what-built')?.body ?? null, howToVerify: f('how-to-verify')?.body ?? null,
      instructions: f('instructions')?.body ?? null, verification: f('verification')?.body ?? null,
      extra: kids.filter((k) => !known.includes(k.tag)).map((k) => ({ tag: k.tag, body: k.body })),
    };
  });
  const obj = (get('objective') ?? '').trim().replace(/\s+(Purpose|Output):/g, '\n\n$1:');
  const purpose = obj.match(/^Purpose:\s*([\s\S]*?)(?=\n\s*\n|\nOutput:|(?![\s\S]))/m)?.[1]?.trim() ?? null;
  const output = obj.match(/^Output:\s*([\s\S]*?)(?=\n\s*\n|(?![\s\S]))/m)?.[1]?.trim() ?? null;
  const lead = obj.replace(/^Purpose:[\s\S]*?(?=\n\s*\n|\nOutput:|(?![\s\S]))/m, '').replace(/^Output:[\s\S]*?(?=\n\s*\n|(?![\s\S]))/m, '').trim();
  const est = fm.estimate ?? {};
  const mh = fm.must_haves ?? {};
  const forHumans = ['objective', 'tasks', 'verification', 'success_criteria'];
  DOCS[key] = {
    label: src.label, project: src.project, executed: src.done, raw,
    // Plans carry no date; the sketch uses the commit that added the file (the build needs a real source — see README).
    created: (() => { try { return execFileSync('git', ['log', '--diff-filter=A', '--follow', '--format=%aI', '--', src.path], { cwd: `${H}/${src.project}` }).toString().trim().split('\n').pop() || null; } catch { return null; } })(),
    path: src.path.replace(`${H}/${src.project}/`, ''),
    phase: String(fm.phase ?? ''), plan: String(fm.plan ?? '').padStart(2, '0'), type: fm.type ?? null, wave: fm.wave ?? null,
    dependsOn: (fm.depends_on ?? []).map(String), autonomous: fm.autonomous !== false,
    files: fm.files_modified ?? [], creates: fm.creates ?? [],
    requirements: (fm.requirements ?? []).map((r) => ({ id: r, text: REQS[r] ?? null })),
    estimate: { tokens: est.tokens ?? null, confidence: est.confidence ?? null },
    gapClosure: fm.gap_closure ?? false, userSetup: fm.user_setup ?? null,
    mustHaves: {
      truths: (mh.truths ?? []).map((t) => (typeof t === 'string' ? t : t.statement)),
      artifacts: (mh.artifacts ?? []).map((a) => (typeof a === 'string' ? a : a.path)),
      keyLinks: (mh.key_links ?? []).map((k) => (typeof k === 'string' ? k : `${k.from} → ${k.to}${k.via ? ' · ' + k.via : ''}`)),
      prohibitions: (mh.prohibitions ?? []).map((p) => (typeof p === 'string' ? p : p.statement)),
    },
    objective: { lead, purpose, output },
    tasks,
    verification: bullets(get('verification') ?? ''),
    success: bullets(get('success_criteria') ?? ''),
    executionContext: get('execution_context')?.trim().split('\n').map((s) => s.trim()).filter(Boolean) ?? [],
    contextFiles: get('context')?.trim().split('\n').map((s) => s.trim()).filter(Boolean) ?? [],
    threatModel: get('threat_model'),
    output: get('output'),
    otherBlocks: blocks.filter((b) => !forHumans.includes(b.tag) && !['execution_context', 'context', 'threat_model', 'output'].includes(b.tag)).map((b) => ({ tag: b.tag, body: dedent(b.body) })),
    trailing: body.slice(body.lastIndexOf('</output>') + 9).replace(/<\/?content>|<\/invoke>/g, '').trim() || null,
  };
}
writeFileSync(new URL('./data.js', import.meta.url), `// Generated by gen-data.mjs from real PLAN.md files — do not edit.\nwindow.DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const [k, d] of Object.entries(DOCS)) console.log(k, d.phase, d.plan, 'tasks', d.tasks.map((t) => t.type + (t.tdd ? '+tdd' : '')).join(','), 'files', d.files.length, 'reqs', d.requirements.length, 'other', d.otherBlocks.map((b) => b.tag).join(','), 'P', !!d.objective.purpose, 'O', !!d.objective.output);
