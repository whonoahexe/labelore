// Sketch 021: builds data.js from real VERIFICATION.md files plus one labelled synthetic report that
// follows the verifier template exactly (Critical / Non-critical gaps, Recommended Fix Plans,
// Verification Metadata). Run: node .planning/sketches/021-verification-page/gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/noah/Work/Personal/labelore/package.json');
const matter = require('gray-matter');

const W = '/home/noah/Work';
const HERE = `${W}/Personal/labelore/.planning/sketches/021-verification-page`;
const SOURCES = {
  syn: { label: 'synthetic · gaps + fix plans', path: `${HERE}/synthetic-VERIFICATION.md`, synthetic: true },
  sp04: { label: 'sp 04 · gaps found (19/39)', path: `${W}/Cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-VERIFICATION.md` },
  sb04: { label: 'sideby 04 · human needed', path: `${W}/Sideby/plan.sideby.me/.planning/milestones/v1.5-phases/04-camera-strip-ui-controls-netflix-coexistence/04-VERIFICATION.md` },
  dd01: { label: 'deid 01 · re-verified 14/14', path: `${W}/Ibis/deid/deid-ui/.planning/milestones/v1.0-phases/01-volume-acquisition-fast-volume-render/01-VERIFICATION.md` },
  lb05: { label: 'labelore 05 · passed', path: `${W}/Personal/labelore/.planning/milestones/v1.1-phases/05-per-type-document-views/05-VERIFICATION.md` },
};

const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Body → ## / ### sections with their 1-based start line in the raw file.
function sections(raw, bodyStart) {
  const lines = raw.split('\n'); const out = []; let cur = null; let inFence = false;
  for (let i = bodyStart; i < lines.length; i++) {
    const l = lines[i];
    if (/^```/.test(l)) inFence = !inFence;
    const m = !inFence && l.match(/^(#{2,3})\s+(.*)$/);
    if (m) { cur = { level: m[1].length, title: m[2].trim(), line: i + 1, body: '' }; out.push(cur); continue; }
    if (cur) cur.body += l + '\n';
  }
  return out;
}
function tables(text) {
  const lines = text.split('\n'); const out = [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\|/.test(lines[i]) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const head = cells(lines[i]).map((h) => h.toLowerCase()); const rows = []; i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push({ head, rows: rows.map((r) => Object.fromEntries(head.map((h, k) => [h, r[k] ?? '']))) });
    }
  }
  return out;
}
const col = (row, ...names) => { for (const n of names) for (const k of Object.keys(row)) if (k === n || k.startsWith(n)) return row[k]; return ''; };

function truthStatus(s) {
  const t = s.toUpperCase(); const ok = /✓|(?<!_UN)VERIFIED|PASS/.test(t.replace(/PRESENT_BEHAVIOR_UNVERIFIED/g, '⚠')); const warn = /⚠|BEHAVIOR_UNVERIFIED/.test(t); const q = /\?|UNCERTAIN|NEEDS HUMAN/.test(t);
  if (/OVERRIDE/.test(t)) return 'override';
  if (/✗|FAILED/.test(t)) return 'failed';
  if (ok && (warn || q)) return 'mixed';
  if (warn) return 'unverified';
  if (q) return 'uncertain';
  if (ok) return /COINCIDENTAL/.test(t) ? 'coincidental' : 'verified';
  return 'uncertain';
}
function reqStatus(s) {
  const t = s.toUpperCase();
  if (/^✓/.test(t)) return /\?|HUMAN|WARNING|\(|\//.test(t) ? 'partial' : 'satisfied';
  if (/✗|BLOCKED|FAIL/.test(t)) return 'blocked';
  if ((/✓|SATISFIED|MET/.test(t)) && /\?|HUMAN|WARNING|\(/.test(t)) return 'partial';
  if (/\?|HUMAN/.test(t)) return 'human';
  if (/✓|SATISFIED|MET/.test(t)) return 'satisfied';
  return 'human';
}
function severity(s) { if (/✓|^none/i.test(s)) return 'clear'; return /🛑|BLOCKER/i.test(s) ? 'blocker' : /⚠|WARN/i.test(s) ? 'warning' : 'info'; }

// Field "**Label:** value" lines inside a block.
function field(text, ...labels) {
  for (const l of labels) { const m = text.match(new RegExp(`\\*\\*${l}:?\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*[A-Z][^*]*:?\\*\\*|\\n\\s*\\n|$)`, 'i')); if (m) return clean(m[1]); }
  return null;
}
function numberedBlocks(text) {
  // "1. **Name**\n   - Missing: …" lists (template gap blocks)
  const out = []; let cur = null;
  for (const l of text.split('\n')) {
    const m = l.match(/^\s*\d+\.\s+\*\*(.+?)\*\*\s*(.*)$/);
    if (m) { cur = { name: m[1].trim(), rest: m[2], fields: {} }; out.push(cur); continue; }
    const f = cur && l.match(/^\s+[-*]\s+([A-Za-z ]+):\s*(.*)$/);
    if (f) cur.fields[f[1].trim().toLowerCase()] = f[2].trim();
  }
  return out;
}

function tokens(s) { return new Set((String(s ?? '').toLowerCase().match(/`[^`]+`|[a-z][a-z0-9_:.-]{3,}/g) ?? []).map((t) => t.replace(/[`.:]+$/g, '').replace(/^`/, '')).filter((t) => !STOP.has(t)).map((t) => (/[()_:]/.test(t) ? t : t.slice(0, 5)))); }
const STOP = new Set(['with', 'from', 'that', 'this', 'into', 'when', 'than', 'then', 'only', 'each', 'every', 'which', 'their', 'there', 'have', 'does', 'test', 'tests', 'verify', 'phase', 'plan', 'call', 'calls', 'real', 'make', 'show', 'shows', 'still', 'after', 'before', 'never', 'file', 'files']);
function overlap(a, b) { let n = 0; for (const t of a) if (b.has(t)) n++; return n; }

function build(key, src) {
  const raw = readFileSync(src.path, 'utf8');
  let fm = {}; try { fm = matter(raw).data; } catch { fm = {}; }
  const fmEnd = raw.startsWith('---') ? raw.indexOf('\n---', 3) : -1;
  const bodyStart = fmEnd > 0 ? raw.slice(0, fmEnd + 4).split('\n').length : 0;
  const secs = sections(raw, bodyStart);
  const lineOf = (re) => { const i = raw.split('\n').findIndex((l) => re.test(l)); return i >= 0 ? i + 1 : null; };
  const body = raw.split('\n').slice(bodyStart).join('\n');
  const h1 = (body.match(/^#\s+(.+)$/m) ?? [])[1] ?? null;
  const goal = field(body, 'Phase Goal', 'Goal');
  const rever = field(body, 'Re-verification');

  // ---- truths: every table with a Truth column inside Goal Achievement / Observable Truths sections
  const truths = []; const used = new Set();
  for (const s of secs) {
    for (const t of tables(s.body)) {
      if (!t.head.some((h) => h.startsWith('truth'))) continue;
      used.add(s.title);
      for (const r of t.rows) {
        const plan = col(r, 'plan');
        const group = plan ? `Plan ${plan}` : /roadmap|success/i.test(s.title) ? 'Roadmap success criteria' : /plan/i.test(s.title) ? 'Plan must-haves' : 'Observable truths';
        const st = col(r, 'status');
        truths.push({ id: `${plan ? plan + '·' : ''}${col(r, '#') || truths.length + 1}`, n: col(r, '#') || String(truths.length + 1), group, text: col(r, 'truth'), status: truthStatus(st), statusRaw: st, evidence: col(r, 'evidence', 'details'), line: s.line });
      }
    }
  }
  const scoreLine = (body.match(/^\*\*Score:?\*\*:?\s*(.+)$/m) ?? [])[1] ?? null;

  // ---- requirements
  let reqs = []; let coverage = null; let reqLine = null;
  const reqSec = secs.find((s) => /requirements coverage/i.test(s.title));
  if (reqSec) {
    reqLine = reqSec.line;
    const t = tables(reqSec.body).find((x) => x.head.some((h) => h.startsWith('requirement')));
    if (t) reqs = t.rows.map((r) => {
      let id = col(r, 'requirement'); let desc = col(r, 'description');
      const m = id.match(/^([A-Z][A-Z0-9]*-\d+[a-z]?)[:\s]+(.*)$/); if (m) { id = m[1]; desc = desc || m[2]; }
      const plans = (col(r, 'source plan') || col(r, 'source plans')).split(/[,/]\s*/).map((p) => p.trim()).filter(Boolean).flatMap((p) => { const mm = p.match(/^(\d+)-(\d+)$/); return mm ? [p] : p.match(/\d+-\d+/g) ?? []; });
      const st = col(r, 'status');
      return { id, desc, plans, status: reqStatus(st), statusRaw: st, note: col(r, 'evidence', 'blocking issue').replace(/^-$/, '') };
    });
    coverage = clean((reqSec.body.match(/^\*\*(?:Coverage:?)\*\*:?\s*(.+)$/m) ?? reqSec.body.match(/^\*\*(\d+ met.+)\*\*\s*$/m) ?? [])[1] ?? '') || null;
  }

  // ---- anti-patterns
  let anti = []; let antiNote = null; let antiLine = null;
  const apSec = secs.find((s) => /anti-pattern/i.test(s.title));
  if (apSec) {
    antiLine = apSec.line;
    const t = tables(apSec.body)[0];
    if (t) anti = t.rows.map((r) => ({ file: col(r, 'file').replace(/`/g, ''), line: col(r, 'line'), pattern: col(r, 'pattern'), severity: severity(col(r, 'severity')), sevRaw: col(r, 'severity'), impact: col(r, 'impact') }));
    antiNote = clean(apSec.body.replace(/^\s*\|.*$/gm, '').replace(/^\*\*Anti-patterns:?\*\*.*$/gm, '')) || null;
  }

  // ---- human checks: body "### N. Name" blocks → frontmatter human_verification (titles from a bold list)
  const hvSec = secs.find((s) => /human verification/i.test(s.title));
  let human = []; let humanNote = null;
  const hvIdx = secs.indexOf(hvSec);
  const hvSubs = hvSec ? secs.slice(hvIdx + 1).filter((s, i, a) => s.level === 3 && hvSec.level === 2 && a.slice(0, i).every((x) => x.level === 3)) : [];
  if (hvSubs.length) {
    human = hvSubs.map((s) => ({ title: s.title.replace(/^\d+\.\s*/, ''), test: field(s.body, 'Test'), expected: field(s.body, 'Expected'), why: field(s.body, 'Why human'), line: s.line }));
  } else {
    const fmh = arr(fm.human_verification).filter((x) => x && typeof x === 'object');
    const bold = hvSec ? [...hvSec.body.matchAll(/^\s*\d+\.\s+\*\*(.+?)\*\*/gm)].map((m) => m[1]) : [];
    human = fmh.map((h, i) => ({ title: bold.length === fmh.length ? bold[i] : clean(h.test).split(/[.;(]| — /)[0].slice(0, 90), test: clean(h.test), expected: clean(h.expected), why: clean(h.why_human), line: hvSec?.line ?? null }));
  }
  if (hvSec) humanNote = clean(hvSec.body.split(/\n\s*\d+\.\s|\n###/)[0].replace(/^None[^\n]*$/m, (m) => m)) || null;
  if (human.length === 0 && hvSec && /^none/i.test(clean(hvSec.body))) humanNote = clean(hvSec.body);

  // ---- gaps
  const gapSec = secs.find((s) => /^gaps summary/i.test(s.title));
  const gIdx = secs.indexOf(gapSec);
  const after = gapSec ? secs.slice(gIdx + 1) : [];
  const sub = (re) => after.find((s) => s.level === 3 && re.test(s.title));
  const critSec = sub(/critical gaps(?! *\(can)|block progress/i) ?? after.find((s) => s.level === 3 && /^critical/i.test(s.title));
  const nonSec = sub(/non-critical|can defer/i);
  const tpl = (blk, kind) => ({ kind, name: blk.name, missing: blk.fields.missing ?? blk.fields.issue ?? null, impact: blk.fields.impact ?? null, fix: blk.fields.fix ?? blk.fields.recommendation ?? null, fixLabel: blk.fields.recommendation ? 'Recommendation' : 'Fix', missingList: [], artifacts: [], truth: null });
  let critical = critSec ? numberedBlocks(critSec.body).map((b) => tpl(b, 'critical')) : [];
  const noncritical = nonSec ? numberedBlocks(nonSec.body).map((b) => tpl(b, 'noncritical')) : [];
  let gapShape = 'template';
  if (!critical.length && arr(fm.gaps).length) {
    gapShape = 'frontmatter';
    critical = arr(fm.gaps).map((g) => ({ kind: g.status === 'partial' ? 'critical' : 'critical', name: clean(g.truth), missing: clean(g.reason), impact: null, fix: null, fixLabel: 'Fix', missingList: arr(g.missing).map(clean), artifacts: arr(g.artifacts).map((a) => ({ path: a.path, issue: clean(a.issue) })), truth: clean(g.truth), gapStatus: g.status }));
  }
  const gapProse = gapSec ? clean(gapSec.body) || null : null;

  // ---- fix plans: "## Recommended Fix Plans" (### NN-PLAN.md: Name blocks) or "### Recommended Gap-Closure Shape" (numbered bold items)
  let fixPlans = []; let fixLine = null;
  const fpSec = secs.find((s) => /recommended fix plans/i.test(s.title));
  if (fpSec) {
    fixLine = fpSec.line;
    const fIdx = secs.indexOf(fpSec);
    for (const s of secs.slice(fIdx + 1)) {
      if (s.level === 2) break;
      const m = s.title.match(/^(\S+\.md):\s*(.*)$/) ?? [null, null, s.title];
      const tasks = [...s.body.matchAll(/^\s*\d+\.\s+(.+)$/gm)].map((x) => clean(x[1]));
      fixPlans.push({ file: m[1], name: m[2], objective: field(s.body, 'Objective'), tasks: tasks.map((t) => ({ text: t, verify: /^verify\b/i.test(t) })), scope: field(s.body, 'Estimated scope'), line: s.line });
    }
  } else {
    const shape = after.find((s) => /gap-closure|closure shape|fix plan/i.test(s.title));
    if (shape) {
      fixLine = shape.line;
      fixPlans = [...shape.body.matchAll(/^\s*\d+\.\s+\*\*(.+?):?\*\*:?\s*(.+)$/gm)].map((x) => ({ file: null, name: x[1].replace(/:$/, ''), objective: null, tasks: x[2].split(/;\s*|,\s*(?:and\s+)?(?=[a-z]+ )/).map((t) => ({ text: clean(t.replace(/\.$/, '')).replace(/^./, (c) => c.toUpperCase()), verify: /regression tests|^verify/i.test(t.trim()) })), scope: null, line: shape.line }));
    }
  }

  // ---- map fix-plan tasks → gaps. Each fix task belongs to the one gap it scores best against; a
  // plan's verify task rides along with every gap of that plan it mentions. Then gaps → truths.
  const allGaps = [...critical, ...noncritical];
  const gTok = allGaps.map((g) => tokens([g.name, g.missing, g.fix, ...g.missingList, ...g.artifacts.map((x) => x.issue + ' ' + x.path)].join(' ')));
  allGaps.forEach((g) => { g.fixes = []; });
  fixPlans.forEach((p, pi) => p.tasks.forEach((t, ti) => {
    const sc = gTok.map((gt) => overlap(gt, tokens(t.text)));
    if (t.verify) { sc.forEach((v, gi) => { if (v >= 2) allGaps[gi].fixes.push({ plan: pi, task: ti, verify: true }); }); return; }
    const best = Math.max(...sc, 0); if (best < 2) return;
    const gi = sc.indexOf(best); allGaps[gi].fixes.push({ plan: pi, task: ti });
    if (process.env.DEBUG) console.log('  ', t.text.slice(0, 40), '→', allGaps[gi].name.slice(0, 40), sc.join(','));
  }));
  // a verify task only stays when its plan also contributes a fix task to that gap
  allGaps.forEach((g) => { g.fixes = g.fixes.filter((f) => !f.verify || g.fixes.some((x) => !x.verify && x.plan === f.plan)).sort((x, y) => x.plan - y.plan || x.task - y.task); });
  allGaps.forEach((g, gi) => {
    let best = null; let bs = 0;
    truths.forEach((t, i) => { if (t.status === 'verified') return; const s = overlap(gTok[gi], tokens(t.text)); if (s > bs) { bs = s; best = i; } });
    g.truthIdx = bs >= (gapShape === 'template' ? 2 : 4) ? best : null;
  });

  // ---- metadata (template) with fallbacks
  const metaSec = secs.find((s) => /verification metadata/i.test(s.title));
  const mf = (l) => (metaSec ? field(metaSec.body, l) : null);
  const autoRaw = mf('Automated checks');
  let automated = null;
  if (autoRaw) { const p = autoRaw.match(/(\d+)\s*passed/i); const f = autoRaw.match(/(\d+)\s*failed/i); automated = { passed: +(p?.[1] ?? 0), failed: +(f?.[1] ?? 0), skipped: 0, source: 'metadata' }; }
  const spotSec = secs.find((s) => /behavioral spot-checks/i.test(s.title));
  const spot = spotSec ? (tables(spotSec.body)[0]?.rows ?? []).map((r) => ({ behavior: col(r, 'behavior'), command: col(r, 'command'), result: col(r, 'result'), status: /✗|FAIL/i.test(col(r, 'status')) ? 'fail' : /SKIP|\?/i.test(col(r, 'status')) ? 'skip' : 'pass', statusRaw: col(r, 'status') })) : [];
  if (!automated && spot.length) automated = { passed: spot.filter((s) => s.status === 'pass').length, failed: spot.filter((s) => s.status === 'fail').length, skipped: spot.filter((s) => s.status === 'skip').length, source: 'spot-checks' };
  const meta = {
    approach: mf('Verification approach') ?? (rever ? (/^no\b/i.test(rever) ? 'Initial verification' : 'Re-verification') : fm.re_verification ? 'Re-verification' : null),
    approachFromMeta: !!mf('Verification approach'),
    source: mf('Must-haves source'),
    automated,
    humanCount: human.length,
    duration: mf('Total verification time'),
  };

  // ---- everything else → "Also in this report"
  const handled = /goal achievement|observable truths|roadmap success|plan must-have|requirements coverage|anti-pattern|human verification|gaps summary|recommended (fix plans|gap-closure)|verification metadata|critical gaps|non-critical/i;
  const other = secs.filter((s) => !used.has(s.title) && !handled.test(s.title) && !(gapSec && s.level === 3 && secs.indexOf(s) > gIdx && secs.slice(gIdx + 1, secs.indexOf(s)).every((x) => x.level === 3) && /gap|fix|closure/i.test(s.title)) && !(hvSubs.includes(s)) && !(fpSec && s.level === 3 && secs.indexOf(s) > secs.indexOf(fpSec) && secs.slice(secs.indexOf(fpSec) + 1, secs.indexOf(s)).every((x) => x.level === 3)))
    .map((s) => ({ title: s.title, line: s.line, body: s.body.trim(), none: /^(none|n\/a)\b/i.test(clean(s.body)) }))
    .filter((s) => s.body);
  // Goal Achievement prose (sb04 puts its structural summary there)
  const ga = secs.find((s) => /^goal achievement/i.test(s.title));
  const gaProse = ga ? clean(ga.body) : null;

  return {
    key, label: src.label, synthetic: !!src.synthetic, path: src.path.replace(W + '/', '~/Work/'),
    phase: String(fm.phase ?? ''), verified: fm.verified instanceof Date ? fm.verified.toISOString() : String(fm.verified ?? ''), status: String(fm.status ?? 'unknown'), score: String(fm.score ?? ''),
    h1, goal, rever, scoreLine, truths, reqs, coverage, reqLine, anti, antiNote, antiLine, human, humanNote, hvLine: hvSec?.line ?? null,
    critical, noncritical, gapShape, gapProse, gapLine: gapSec?.line ?? null, fixPlans, fixLine,
    meta, spot, spotLine: spotSec?.line ?? null, other, gaProse: gaProse && gaProse.length > 40 ? gaProse : null,
    behaviorUnverified: arr(fm.behavior_unverified_items).map((x) => ({ truth: clean(x.truth), test: clean(x.test), expected: clean(x.expected), why: clean(x.why_human) })),
    coincidental: arr(fm.coincidental_reliance_items).map((x) => ({ truth: clean(x.truth), reason: x.reason, harden: clean(x.harden) })),
    gapsClosed: arr(fm.previous_verification?.gaps_closed).map((x) => ({ gap: clean(x.gap), by: clean(x.closed_by) })),
    previous: fm.previous_verification ? { status: fm.previous_verification.previous_status, score: fm.previous_verification.previous_score } : null,
    dataBlocked: arr(fm.data_blocked).map((x) => ({ truth: clean(x.truth), requirement: x.requirement, reason: clean(x.reason), toClose: clean(x.to_close) })),
    raw,
  };
}

const DOCS = {};
for (const [k, s] of Object.entries(SOURCES)) DOCS[k] = build(k, s);
writeFileSync(`${HERE}/data.js`, `// Generated by gen-data.mjs — do not edit.\nwindow.DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const d of Object.values(DOCS)) console.log(d.key, d.status, `truths=${d.truths.length}`, `reqs=${d.reqs.length}`, `anti=${d.anti.length}`, `human=${d.human.length}`, `crit=${d.critical.length}`, `non=${d.noncritical.length}`, `plans=${d.fixPlans.length}`, `auto=${JSON.stringify(d.meta.automated)}`, `appr=${d.meta.approach}`, `other=${d.other.map((o) => o.title).join(' | ')}`);
