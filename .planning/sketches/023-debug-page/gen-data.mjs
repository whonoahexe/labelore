// Sketch 023: builds data.js from real .planning/debug/*.md sessions (plus one synthetic session
// that is still investigating). Sections are loose YAML-ish key: value blocks, bold-key bullets,
// or `- timestamp:` lists, so this reads them line by line rather than as strict YAML.
// Run: node .planning/sketches/023-debug-page/gen-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/noah/Work/Personal/labelore/package.json');
const matter = require('gray-matter');

const W = '/home/noah/Work';
const HERE = `${W}/Personal/labelore/.planning/sketches/023-debug-page`;
const SOURCES = {
  lb: { label: 'labelore · resolved, 3 causes', path: `${W}/Personal/labelore/.planning/debug/resolved/loading-state-regression.md` },
  dd: { label: 'deid · awaiting human verify', path: `${W}/Ibis/deid/deid-ui/.planning/debug/mr-series-selection-picks-dwi.md` },
  sa: { label: 'sideby · diagnosed (small)', path: `${W}/Sideby/plan.sideby.me/.planning/debug/sfu-no-audio.md` },
  rs: { label: 'resoundant · resolved, 22 evidence', path: `${W}/Ibis/resoundant/.planning/debug/resolved/heartbeat-stops-after-net-drop.md` },
  sr: { label: 'sideby · resolved, 2 rounds', path: `${W}/Sideby/plan.sideby.me/.planning/debug/sfu-reconnect-presence.md` },
  syn: { label: 'synthetic · investigating', path: `${HERE}/search-index-goes-stale.md`, synthetic: true },
};

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const unq = (s) => String(s ?? '').trim().replace(/^\|\s*\n?/, '').replace(/^"([\s\S]*)"$/, '$1').trim();
function sections(raw, start) {
  const lines = raw.split('\n'); const out = []; let cur = null; let fence = false;
  for (let i = start; i < lines.length; i++) { const l = lines[i]; if (/^```/.test(l)) fence = !fence; const m = !fence && l.match(/^(#{1,3})\s+(.*)$/); if (m) { cur = { level: m[1].length, title: m[2].trim(), line: i + 1, body: '' }; out.push(cur); continue; } if (cur) cur.body += l + '\n'; }
  return out;
}
const KEY = /^(?:-\s+)?(?:\*\*)?([A-Za-z][A-Za-z0-9_ ()/'-]{0,44}?)(?:\*\*)?\s*:(?:\*\*)?(?:\s+|$)(.*)$/;
const looksKey = (k) => k.split(/\s+/).length <= 5 && !/^(https?|file)$/i.test(k);
// Top-level key: value pairs; continuation lines (indented, list items, blank) belong to the open key.
function kv(body) {
  const out = []; let cur = null;
  const lines = body.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !/^```/.test(l.trim()));
  for (const l of lines) {
    const m = !/^\s/.test(l) && l.match(KEY);
    if (m && looksKey(m[1])) { cur = { key: m[1].trim(), value: m[2] }; out.push(cur); continue; }
    if (cur) cur.value += '\n' + l; else if (l.trim()) { cur = { key: '', value: l }; out.push(cur); }
  }
  return out.map((e) => ({ key: e.key, value: dedent(unq(e.value.replace(/\s+$/, ''))) })).filter((e) => e.key || e.value);
}
function dedent(s) { const ls = s.split('\n'); const ind = Math.min(...ls.slice(1).filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length), 99); return [ls[0], ...ls.slice(1).map((l) => l.slice(ind === 99 ? 0 : ind))].join('\n').trim(); }
const norm = (k) => k.toLowerCase().replace(/\s+behaviou?r$/, '').replace(/[^a-z_]+/g, '_').replace(/^_|_$/g, '');
function map(entries) { const o = {}; for (const e of entries) if (e.key) o[norm(e.key)] = e.value; return o; }
// "- timestamp: …" items → { ts, text, checked, found, implication, tag }
function items(body, lead) {
  const out = []; let cur = null;
  for (const l of body.split('\n')) {
    const m = l.match(new RegExp(`^-\\s+${lead}:\\s*(.*)$`, 'i'));
    if (m) { cur = { head: m[1], rest: '' }; out.push(cur); continue; }
    if (cur) cur.rest += l + '\n';
  }
  return out.map((it) => {
    const sub = map(kv(it.rest.split('\n').map((x) => x.replace(/^\s{2}/, '')).join('\n')));
    let ts = it.head, text = '';
    const split = it.head.match(/^(\S+(?:\s+\([^)]*\))?)\s*(?:[—–-]|\.)\s+(.*)$/);
    if (split && !sub.checked && !sub.found && !sub.evidence) { ts = split[1]; text = split[2] + (it.rest.trim() ? ' ' + clean(it.rest) : ''); }
    return { head: ts, text, ...sub };
  });
}
const TAG = (e) => { const s = `${e.implication ?? ''} ${e.found ?? ''} ${e.text ?? ''}`; return /\bELIMINATE|\bREFUTE|\bRULES? OUT|\bNOT the cause|\bNOT in\b/i.test(s) ? 'eliminates' : /\bCONFIRM|\bROOT CAUSE|\bproves?\b|\bdirect cause/i.test(s) ? 'confirms' : /\bApplied fix|\bfix (applied|committed)|\bcommitted \(|\bVerified\b/i.test(s) ? 'fix' : 'finding'; };

function build(key, src) {
  const raw = readFileSync(src.path, 'utf8'); let fm = {}; try { fm = matter(raw).data; } catch {}
  const end = raw.startsWith('---') ? raw.indexOf('\n---', 3) : -1; const start = end > 0 ? raw.slice(0, end + 4).split('\n').length : 0;
  const secs = sections(raw, start);
  const find = (re) => secs.filter((s) => s.level === 2 && re.test(s.title));
  const focusSec = find(/^current focus/i).pop(); // later Current Focus wins (sessions append rounds)
  const focus = focusSec ? kv(focusSec.body) : [];
  const symSec = find(/^symptoms/i)[0]; const symptoms = symSec ? kv(symSec.body) : [];
  const elimSecs = find(/eliminated/i); const eliminated = elimSecs.flatMap((s) => items(s.body, 'hypothesis').map((e) => ({ ...e, hypothesis: unq(e.head), line: s.line })));
  const evSecs = secs.filter((s) => /evidence/i.test(s.title) && /^-\s+timestamp:/im.test(s.body));
  const evidence = evSecs.flatMap((s) => items(s.body, 'timestamp').map((e) => ({ ...e, ts: unq(e.head), round: s.title, line: s.line }))).map((e) => ({ ...e, tag: TAG(e) }));
  const resSec = find(/^resolution/i).pop(); const resolution = resSec ? map(kv(resSec.body)) : {};
  // reasoning checkpoint (nested under Current Focus, sometimes in a ```yaml fence)
  const rc = focus.find((e) => /reasoning_checkpoint/i.test(e.key));
  const rcMap = rc ? map(kv(rc.value)) : {};
  const candidates = (rcMap.candidate_causes ?? '').split('\n').map((l) => unq(l.replace(/^\s*-\s*/, ''))).filter(Boolean).map((t) => { const m = t.match(/^(\w[\w/ ]*?):\s*(.*)$/); const body = m ? m[2] : t; return { kind: m ? m[1] : null, text: body.replace(/\s*\((CONFIRMED|ELIMINATED)[^)]*\)\s*$/i, ''), verdict: /\(ELIMINATED/i.test(body) ? 'eliminated' : /\(CONFIRMED/i.test(body) ? 'confirmed' : null }; });
  const handled = /^(current focus|symptoms|eliminated|evidence|resolution)$/i;
  const other = secs.filter((s) => s.level === 2 && !handled.test(s.title) && !evSecs.includes(s) && !elimSecs.includes(s)).map((s) => ({ title: s.title, line: s.line }));
  const h1 = secs.find((s) => s.level === 1)?.title ?? null;
  const slug = src.path.split('/').pop().replace(/\.md$/, '');
  return {
    key, label: src.label, synthetic: !!src.synthetic, path: src.path.replace(W + '/', '~/Work/'), slug, h1,
    status: String(fm.status ?? 'unknown'), trigger: fm.trigger ?? null, created: fm.created instanceof Date ? fm.created.toISOString() : String(fm.created ?? ''), updated: fm.updated instanceof Date ? fm.updated.toISOString() : String(fm.updated ?? ''),
    archived: /\/resolved\//.test(src.path), focus: focus.filter((e) => !/reasoning_checkpoint/i.test(e.key)), focusLine: focusSec?.line ?? null, reasoning: rcMap, candidates,
    symptoms, symptomsLine: symSec?.line ?? null, eliminated, evidence, resolution, resolutionLine: resSec?.line ?? null, other, raw,
  };
}
const DOCS = {}; for (const [k, s] of Object.entries(SOURCES)) DOCS[k] = build(k, s);
writeFileSync(`${HERE}/data.js`, `// Generated by gen-data.mjs — do not edit.\nwindow.DOCS = ${JSON.stringify(DOCS, null, 1)};\n`);
for (const d of Object.values(DOCS)) console.log(d.key, d.status, `focus=[${d.focus.map((e) => e.key).join(',')}]`, `sym=[${d.symptoms.map((e) => e.key).join(',')}]`, `ev=${d.evidence.length}(${['confirms', 'eliminates', 'fix', 'finding'].map((t) => d.evidence.filter((e) => e.tag === t).length).join('/')})`, `elim=${d.eliminated.length}`, `cand=${d.candidates.length}`, `res=[${Object.keys(d.resolution).join(',')}]`, `other=${d.other.map((o) => o.title.slice(0, 24)).join('|')}`);
