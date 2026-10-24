// Sketch 035: data.js = what the Pitfalls panel reads from each project's .planning/research/PITFALLS.md:
// the critical pitfalls (what goes wrong, why, how likely or how sure, how to avoid, warning signs,
// phase), each one's short name, phase and check from the Pitfall-to-Phase Mapping, and the
// "Looks Done But Isn't" checklist.
// Run: node .planning/sketches/035-research-pitfalls/gen-data.mjs <cinedise-research-dir>
import { readFileSync, writeFileSync } from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname;
const SOURCES = { labelore: `${HERE}../../research`, cinedise: process.argv[2] };
if (!SOURCES.cinedise) { console.error('usage: gen-data.mjs <cinedise-research-dir>'); process.exit(1); }
function sections(src) {
  const out = []; let fence = false;
  src.split('\n').forEach((line) => {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    const m = !fence && /^(#{1,4}) (.+)$/.exec(line);
    if (m) out.push({ depth: m[1].length, title: m[2].trim(), body: [] });
    else if (out.length) out[out.length - 1].body.push(line);
  });
  return out;
}
function table(lines) {
  const rows = lines.filter((l) => /^\|/.test(l.trim()) && !/^\|\s*:?-{3,}/.test(l.trim())).map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  return rows.length ? { head: rows[0], rows: rows.slice(1) } : null;
}
// Lines → blocks: a bullet starts at "- ", a paragraph runs to the next blank line.
function blocks(lines) {
  const out = []; let cur = null;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l || /^-{3,}$/.test(l)) { cur = null; continue; }
    const b = /^[-*]\s+(.*)$/.exec(l);
    if (b) { cur = { bullet: true, text: b[1] }; out.push(cur); continue; }
    if (cur) cur.text += ` ${l}`; else { cur = { bullet: false, text: l }; out.push(cur); }
  }
  return out;
}
// Split at top-level ";" only: never inside parentheses, quotes or code.
function splitTop(t) {
  const out = []; let cur = '', depth = 0, tick = false, quote = false;
  for (const ch of t) {
    if (ch === '`') tick = !tick;
    if (ch === '"') quote = !quote;
    if (!tick && ch === '(') depth++;
    if (!tick && ch === ')') depth--;
    if (ch === ';' && !tick && !quote && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/\.$/, '')).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}
const LEVEL = /^(very high|medium-high|medium-low|low-medium|high|medium|low)\b/i;
function pitfall(sec) {
  const m = /^Pitfall (\d+):\s*(.+)$/.exec(sec.title);
  const fields = {}; let key = null;
  for (const line of sec.body) {
    const f = /^\*\*([^*]+?):\*\*\s*(.*)$/.exec(line.trim());
    if (f) { key = f[1].toLowerCase(); fields[key] = f[2] ? [f[2]] : []; continue; }
    if (key) fields[key].push(line);
  }
  const get = (re) => { const k = Object.keys(fields).find((x) => re.test(x)); return k ? blocks(fields[k]) : []; };
  const text = (bs) => bs.map((b) => b.text).join(' ');
  const likely = text(get(/how likely/));
  const lm = LEVEL.exec(likely);
  const conf = text(get(/^confidence/));
  const cm = /^(HIGH|MEDIUM-HIGH|MEDIUM|LOW-MEDIUM|MEDIUM-LOW|LOW)\b/.exec(conf);
  const signsB = get(/warning signs/);
  let signs = signsB.some((b) => b.bullet) ? signsB.filter((b) => b.bullet).map((b) => b.text) : splitTop(text(signsB));
  // One bullet of several short sentences (Cinedise 13) is several signs.
  if (signs.length === 1) { const ss = signs[0].split(/(?<=\.)\s+(?=[A-Z])/); if (ss.length > 1 && ss.every((x) => x.length < 140)) signs = ss; }
  signs = signs.map((s) => s.replace(/\.$/, ''));
  return {
    n: +m[1], title: m[2].trim(),
    wrong: get(/what goes wrong/), why: get(/why it happens/),
    likely: lm ? { level: lm[1].replace(/^./, (c) => c.toUpperCase()), text: likely.slice(lm[0].length).replace(/^[\s.,:—–-]+/, '') } : null,
    avoid: get(/how to avoid/).map((b) => b.text),
    signs,
    phase: text(get(/phase to address/)),
    confidence: cm ? { level: cm[1], text: conf.slice(cm[0].length).replace(/^[\s.,:—–-]+/, '') } : null,
  };
}
function mapping(secs) {
  const s = secs.find((x) => x.depth === 2 && /Pitfall-to-Phase/i.test(x.title));
  const t = s && table(s.body); const out = {};
  if (t) t.rows.forEach((r) => { const m = /^(\d+)\.?\s+(.+)$/.exec(r[0]); if (m) out[+m[1]] = { short: m[2], phase: r[1], verify: r[2] }; });
  return out;
}
function checks(secs) {
  const s = secs.find((x) => x.depth === 2 && /Looks Done/i.test(x.title));
  if (!s) return [];
  return s.body.filter((l) => /^\s*-\s*\[[ x]\]/.test(l)).map((l) => {
    let t = l.replace(/^\s*-\s*\[[ x]\]\s*/, '');
    const lm = /^\*\*(.+?):?\*\*:?\s*(.*)$/.exec(t);
    const label = lm ? lm[1].replace(/:$/, '') : null; t = lm ? lm[2] : t;
    const pits = [...t.matchAll(/\(Pitfall (\d+)\)/g)].map((x) => +x[1]);
    t = t.replace(/\s*\(Pitfall \d+\)/g, '').trim();
    const om = /^often (.+?)\s+-\s+(verify .+)$/i.exec(t);
    return { label, trap: om ? om[1] : null, check: (om ? om[2] : t).replace(/^./, (c) => c.toUpperCase()), pits };
  });
}
function note(secs) {
  const s = secs.find((x) => x.depth === 2 && /^Critical Pitfalls/i.test(x.title));
  return s ? blocks(s.body).map((b) => b.text)[0] || null : null;
}
const out = {};
for (const [key, dir] of Object.entries(SOURCES)) {
  const secs = sections(readFileSync(`${dir}/PITFALLS.md`, 'utf8'));
  const map = mapping(secs);
  const pitfalls = secs.filter((x) => /^Pitfall \d+:/.test(x.title)).map(pitfall).map((p) => ({ ...p, ...(map[p.n] ? { short: map[p.n].short, mapPhase: map[p.n].phase, verify: map[p.n].verify } : {}) }));
  out[key] = { note: note(secs), pitfalls, checks: checks(secs) };
}
writeFileSync(`${HERE}data.js`, `// Generated by gen-data.mjs from two projects' .planning/research/PITFALLS.md\nwindow.PIT = ${JSON.stringify(out, null, 1)};\n`);
console.log('wrote data.js');
