// The debug session body projection (quick-261018-j5h, sketch 023 A): a tolerant, fence-aware,
// line-scanned read of one GSD debug session (`.planning/debug/<slug>.md`, or the same file archived
// under `debug/resolved/`) into `DebugSessionBody`: the last Current Focus (its reasoning checkpoint and
// candidate causes split out), Symptoms, every Eliminated section, every section with "evidence" in its
// title that holds `- timestamp:` items (each item its own entry, tagged Confirms / Rules out / Fix /
// Finding from its wording), the Resolution (causes, fix, verification chips, files changed) and a
// ledger of the other H2 sections so the composer can offer them as "Also in this session" chips.
// GSD writes these sections as loose YAML (`key: value` blocks, bold-key bullets, `- timestamp:` lists,
// a fenced yaml reasoning checkpoint), so they are read line by line, never as strict YAML.
// It ports the sketch's `gen-data.mjs` parse and `index.html` model functions (the regexes there are
// reference only) with two corrections: a verification `- signal:` whose text wraps onto further lines
// keeps collecting them until its `result:` line (the sketch dropped that chip), and a files-changed list
// item naming several comma-separated paths before its colon yields one file per path, all sharing the
// note (the sketch kept only the first).
// T-j5h-02: every line is clipped to MAX_LINE up front; fences are tracked so nothing inside one is read
// as a heading; every per-line pattern runs on a clipped line (or on a 200-character head of one) and
// none nests an unbounded quantifier; HTML comments, first-sentence, signal, file and cause-label
// splits are character scans, never a global pattern over a whole body; every list and text is capped.
// `extractDebugSession` is pure (no fs access) and never throws on a string; `DebugHandler.parse` still
// wraps it in try/catch (T-j5h-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/** What a long text carries for the modal: a definition list when it is a `key: value` map, else blocks. */
export type DebugValue =
  | { shape: 'fields'; fields: { label: string; blocks: Block[] }[] }
  | { shape: 'blocks'; blocks: Block[] };

export interface DebugField {
  /** The key as written for focus and symptom fields; the normalised key for resolution and reasoning fields. */
  key: string;
  text: string;
  value: DebugValue;
}

export interface DebugCandidate {
  kind: string | null;
  text: string;
  verdict: 'confirmed' | 'eliminated' | null;
}

export interface DebugReasoning {
  fields: DebugField[];
  candidates: DebugCandidate[];
}

export interface DebugEliminated {
  hypothesis: string;
  evidence: string;
  timestamp: string;
}

export type DebugEvidenceTag = 'confirms' | 'eliminates' | 'fix' | 'finding';

export interface DebugEvidence {
  ts: string;
  /** The title of the section the entry sits in. */
  round: string;
  checked: string;
  found: string;
  implication: string;
  /** The text after the timestamp on a bare `- timestamp: X - text` line, else empty. */
  text: string;
  tag: DebugEvidenceTag;
}

export interface DebugCause {
  /** "ENVIRONMENT", "STRUCTURAL / PRE-EXISTING", "PRIMARY", "Cause 2"; null for a single unmarked cause. */
  label: string | null;
  /** The first sentence of the cause, at most 200 characters. */
  text: string;
  /** True when the line is shorter than the cause it stands for. */
  cut: boolean;
  value: DebugValue;
}

export interface DebugFix {
  notApplied: boolean;
  text: string;
  cut: boolean;
  value: DebugValue;
}

export interface DebugChip {
  name: string;
  result: 'pass' | 'fail' | 'open';
}

export interface DebugVerification {
  verdict: string | null;
  chips: DebugChip[] | null;
  /** The first sentence, used when there are no chips. */
  text: string;
  value: DebugValue;
}

export interface DebugFile {
  path: string;
  note: string | null;
}

export interface DebugResolution {
  heading: string;
  fields: DebugField[];
  causes: DebugCause[];
  fix: DebugFix | null;
  verification: DebugVerification | null;
  files: DebugFile[];
}

export type DebugSectionRole = 'focus' | 'symptoms' | 'eliminated' | 'evidence' | 'resolution' | 'other';

export interface DebugSectionRef {
  heading: string;
  role: DebugSectionRole;
}

export interface DebugSessionBody {
  /** The first `#` line as written, or null. */
  h1: string | null;
  focusHeading: string | null;
  /** The last Current Focus, without the reasoning checkpoint, keys as written, duplicates kept. */
  focus: DebugField[];
  reasoning: DebugReasoning | null;
  symptomsHeading: string | null;
  symptoms: DebugField[];
  eliminated: DebugEliminated[];
  evidence: DebugEvidence[];
  resolution: DebugResolution | null;
  /** Every H2 in document order. */
  sections: DebugSectionRef[];
}

// ---------------------------------------------------------------------------
// Caps
// ---------------------------------------------------------------------------

const MAX_LINE = 8000;
const MAX_TEXT = 8000;
const MAX_EVIDENCE = 400;
const MAX_ELIMINATED = 100;
const MAX_CANDIDATES = 50;
const MAX_SECTIONS = 80;
const MAX_ALL_SECTIONS = 600;
const MAX_FIELDS = 60;
const MAX_FILES = 200;
const MAX_CHIPS = 40;
const MAX_CAUSES = 12;
const MAX_HEADING = 600;
const MAX_FRONTMATTER_LINES = 400;
const MAX_CAUSE_TEXT = 200;
const MAX_SIGNAL_LINES = 8;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function cap(text: string, max: number = MAX_TEXT): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Whitespace runs collapsed to one space, trimmed, capped. */
function clean(text: string, max: number = MAX_TEXT): string {
  return cap(text.slice(0, max * 2).replace(/\s+/g, ' ').trim(), max);
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isUpper(ch: string | undefined): boolean {
  return ch !== undefined && ch >= 'A' && ch <= 'Z';
}

function isLower(ch: string | undefined): boolean {
  return ch !== undefined && ch >= 'a' && ch <= 'z';
}

function isWord(ch: string | undefined): boolean {
  return ch !== undefined && (isDigit(ch) || isUpper(ch) || isLower(ch) || ch === '_');
}

function isSpace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}

function leadingSpace(line: string): number {
  let n = 0;
  while (n < line.length && isSpace(line[n])) n += 1;
  return n;
}

/** "target_test" -> "Target test". */
function humanize(text: string): string {
  const t = text.slice(0, 200).replace(/[_-]/g, ' ');
  return t === '' ? t : t.charAt(0).toUpperCase() + t.slice(1);
}

/** Skips a leading `---` ... `---` frontmatter block (a malformed one comes through the handler with
 * the block still in the body). */
function stripFrontmatter(body: string): string {
  let i = 0;
  while (i < body.length && isSpace(body[i])) i += 1;
  if (!body.startsWith('---', i)) return body;
  const eol = body.indexOf('\n', i);
  if (eol === -1 || body.slice(i, eol).trim() !== '---') return body;
  let pos = eol + 1;
  for (let n = 0; n < MAX_FRONTMATTER_LINES; n++) {
    const nl = body.indexOf('\n', pos);
    const line = nl === -1 ? body.slice(pos) : body.slice(pos, nl);
    if (line.trim() === '---') return nl === -1 ? '' : body.slice(nl + 1);
    if (nl === -1) return body;
    pos = nl + 1;
  }
  return body;
}

/** Removes `<!-- ... -->` comments; an unclosed one is left as it is. Linear. */
function stripComments(text: string): string {
  if (!text.includes('<!--')) return text;
  let out = '';
  let pos = 0;
  for (;;) {
    const open = text.indexOf('<!--', pos);
    if (open === -1) break;
    const close = text.indexOf('-->', open + 4);
    if (close === -1) break;
    out += text.slice(pos, open);
    pos = close + 3;
  }
  return out + text.slice(pos);
}

// ---------------------------------------------------------------------------
// Sections (H1-H3, fence-aware; a body runs to the next heading of any of those levels)
// ---------------------------------------------------------------------------

interface Fence {
  ch: string;
  len: number;
}

function fenceOpen(trimmed: string): Fence | null {
  const ch = trimmed[0];
  if (ch !== '`' && ch !== '~') return null;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === ch) len += 1;
  return len >= 3 ? { ch, len } : null;
}

function fenceCloses(trimmed: string, fence: Fence): boolean {
  let len = 0;
  while (len < trimmed.length && trimmed[len] === fence.ch) len += 1;
  return len >= fence.len && trimmed.slice(len).trim() === '';
}

interface Sec {
  level: number;
  title: string;
  body: string[];
}

function headingOf(line: string): { level: number; title: string } | null {
  if (line[0] !== '#') return null;
  let n = 0;
  while (n < line.length && line[n] === '#') n += 1;
  if (n > 3 || line[n] !== ' ') return null;
  return { level: n, title: cap(line.slice(n + 1).trim(), MAX_HEADING) };
}

function sectionsOf(lines: string[]): Sec[] {
  const out: Sec[] = [];
  let cur: Sec | null = null;
  let fence: Fence | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (fence !== null) {
      if (fenceCloses(trimmed, fence)) fence = null;
      if (cur !== null) cur.body.push(line);
      continue;
    }
    const opened = fenceOpen(trimmed);
    if (opened !== null) {
      fence = opened;
      if (cur !== null) cur.body.push(line);
      continue;
    }
    const h = headingOf(line);
    if (h !== null) {
      if (out.length >= MAX_ALL_SECTIONS) {
        cur = null;
        continue;
      }
      cur = { level: h.level, title: h.title, body: [] };
      out.push(cur);
      continue;
    }
    if (cur !== null) cur.body.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// kv: top-level `key: value` pairs, continuation lines belong to the open key
// ---------------------------------------------------------------------------

interface Entry {
  key: string;
  value: string;
}

const KEY_HEAD = /^(?:-\s+)?(?:\*\*)?([A-Za-z][A-Za-z0-9_ ()/'-]{0,44}?)(?:\*\*)?\s*:(?:\*\*)?(?:\s+|$)/;
const HEAD_LEN = 200;

function looksKey(key: string): boolean {
  const t = key.trim();
  if (t === '') return false;
  let words = 1;
  for (let i = 1; i < t.length; i++) if (isSpace(t[i]) && !isSpace(t[i - 1])) words += 1;
  if (words > 5) return false;
  const lower = t.toLowerCase();
  return lower !== 'http' && lower !== 'https' && lower !== 'file';
}

/** The key and the text after it when `line` is a top-level `key: value` line, else null. */
function keyLine(line: string): { key: string; rest: string } | null {
  if (isSpace(line[0])) return null;
  const head = line.length > HEAD_LEN ? line.slice(0, HEAD_LEN) : line;
  const m = KEY_HEAD.exec(head);
  if (m === null) return null;
  if (head.length < line.length && m[0].length === head.length) return null;
  if (!looksKey(m[1])) return null;
  return { key: m[1].trim(), rest: line.slice(m[0].length) };
}

function dedent(text: string): string {
  const lines = text.split('\n');
  if (lines.length < 2) return text.trim();
  let ind = 99;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const n = leadingSpace(lines[i]);
    if (n < ind) ind = n;
  }
  const cut = ind === 99 ? 0 : ind;
  return [lines[0], ...lines.slice(1).map((l) => l.slice(cut))].join('\n').trim();
}

/** A YAML block-scalar marker and a wrapping pair of double quotes dropped. */
function unq(text: string): string {
  let t = text.trim();
  if (t.startsWith('|')) t = t.slice(1).trimStart();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
  return t.trim();
}

function kv(bodyLines: string[]): Entry[] {
  const out: Entry[] = [];
  let cur: Entry | null = null;
  const text = stripComments(bodyLines.join('\n'));
  for (const l of text.split('\n')) {
    if (l.trim().startsWith('```')) continue;
    const k = keyLine(l);
    if (k !== null) {
      cur = { key: k.key, value: k.rest };
      out.push(cur);
      continue;
    }
    if (cur !== null) cur.value += `\n${l}`;
    else if (l.trim() !== '') {
      cur = { key: '', value: l };
      out.push(cur);
    }
  }
  return out
    .map((e) => ({ key: e.key, value: dedent(unq(cap(e.value.trimEnd(), MAX_TEXT * 2))) }))
    .filter((e) => e.key !== '' || e.value !== '');
}

/** "Expected behavior" -> "expected"; "Root cause" -> "root_cause". */
function norm(key: string): string {
  let k = key.toLowerCase();
  if (k.endsWith(' behavior')) k = k.slice(0, -9);
  else if (k.endsWith(' behaviour')) k = k.slice(0, -10);
  let out = '';
  let pendingUnderscore = false;
  for (const ch of k) {
    const letter = (ch >= 'a' && ch <= 'z') || ch === '_';
    if (letter) {
      if (pendingUnderscore) out += '_';
      pendingUnderscore = false;
      out += ch;
    } else pendingUnderscore = true;
  }
  const lead = k.length > 0 && !((k[0] >= 'a' && k[0] <= 'z') || k[0] === '_') && out !== '' ? '_' : '';
  return (lead + out + (pendingUnderscore && out !== '' ? '_' : '')).replace(/^_+|_+$/g, '');
}

/** `norm`-keyed entries; a later duplicate overwrites the value but keeps the first position. */
function mapOf(entries: Entry[]): Entry[] {
  const out: Entry[] = [];
  for (const e of entries) {
    if (e.key === '') continue;
    const key = norm(e.key);
    const at = out.findIndex((o) => o.key === key);
    if (at === -1) out.push({ key, value: e.value });
    else out[at] = { key, value: e.value };
  }
  return out;
}

function get(map: Entry[], key: string): string {
  const hit = map.find((e) => e.key === key);
  return hit === undefined ? '' : hit.value;
}

// ---------------------------------------------------------------------------
// DebugValue: the sketch's val()
// ---------------------------------------------------------------------------

function isKeyChar(ch: string | undefined): boolean {
  return ch !== undefined && (isWord(ch) || ch === ' ' || ch === '(' || ch === ')' || ch === '-');
}

/** `Name: rest` at column 0: a letter or underscore, up to 41 key characters, a colon. */
function plainKey(line: string): { key: string; rest: string } | null {
  const first = line[0];
  if (!(isUpper(first) || isLower(first) || first === '_')) return null;
  let j = 1;
  while (j < line.length && j <= 41 && isKeyChar(line[j])) j += 1;
  if (line[j] !== ':') return null;
  if (j + 1 < line.length && !isSpace(line[j + 1])) return null;
  return { key: line.slice(0, j), rest: line.slice(j + 1).trimStart() };
}

/** Strips a wrapping `{ }` and turns `, key:` into a line break, as the sketch does. */
function unbrace(text: string): string {
  let t = text;
  const lead = leadingSpace(t);
  if (t[lead] === '{') t = t.slice(lead + 1).trimStart();
  const end = t.trimEnd();
  if (end.endsWith('}')) t = end.slice(0, -1).trimEnd();
  let out = '';
  let i = 0;
  while (i < t.length) {
    if (t[i] === ',') {
      let j = i + 1;
      while (j < t.length && isSpace(t[j])) j += 1;
      let k = j;
      while (k < t.length && isWord(t[k])) k += 1;
      if (k > j && t[k] === ':') {
        out += '\n';
        i = j;
        continue;
      }
    }
    out += t[i];
    i += 1;
  }
  return out;
}

function valueOf(raw: string): DebugValue {
  const text = cap(raw);
  const lines = text.split('\n');
  let keyed = 0;
  let top = 0;
  for (const l of lines) {
    if (l.trim() === '') continue;
    if (!isSpace(l[0])) top += 1;
    if (plainKey(l) !== null) keyed += 1;
  }
  if (keyed >= 2 && keyed >= top * 0.6) {
    const fields: { label: string; value: string }[] = [];
    let cur: { label: string; value: string } | null = null;
    for (const l of lines) {
      const k = plainKey(l);
      if (k !== null) {
        cur = { label: humanize(k.key), value: k.rest };
        fields.push(cur);
      } else if (cur !== null) {
        const strip = Math.min(4, leadingSpace(l));
        cur.value += `\n${strip >= 2 ? l.slice(strip) : l}`;
      }
    }
    return {
      shape: 'fields',
      fields: fields.slice(0, MAX_FIELDS).map((f) => ({ label: f.label, blocks: parseBlocks(cap(unbrace(f.value))) })),
    };
  }
  return { shape: 'blocks', blocks: parseBlocks(text) };
}

function fieldOf(key: string, value: string): DebugField {
  const text = cap(value);
  return { key, text, value: valueOf(text) };
}

// ---------------------------------------------------------------------------
// items: `- <lead>: ...` list items with their indented sub-keys
// ---------------------------------------------------------------------------

/** The text after `- lead:` when the line is such an item, else null. */
function itemHead(line: string, lead: string): string | null {
  if (line[0] !== '-') return null;
  let i = 1;
  if (!isSpace(line[i])) return null;
  while (isSpace(line[i])) i += 1;
  const wanted = `${lead}:`;
  if (line.slice(i, i + wanted.length).toLowerCase() !== wanted) return null;
  return line.slice(i + wanted.length).trimStart();
}

const SPLIT_DASHES = '—–-.';

/** "head - text" split of a bare timestamp line: a first token (with an optional parenthetical) then a
 * dash or period then whitespace. Returns null when the line does not have that shape. */
function splitHead(head: string): { ts: string; text: string } | null {
  let end = 0;
  while (end < head.length && !isSpace(head[end])) end += 1;
  if (end === 0) return null;
  // The token may end right before a trailing dash / period that is followed by whitespace.
  // Greedy order: the whole token first (the dash after some whitespace), then without its last char.
  const i = end;
  let group = head.slice(i);
  // Optional "(...)" group after whitespace.
  const wsEnd = leadingSpace(group);
  if (wsEnd > 0 && group[wsEnd] === '(') {
    const close = group.indexOf(')', wsEnd);
    if (close !== -1) {
      const afterGroup = group.slice(close + 1);
      const r = dashThenText(afterGroup);
      if (r !== null) return { ts: head.slice(0, i + close + 1), text: r };
    }
  }
  const r = dashThenText(group);
  if (r !== null) return { ts: head.slice(0, i), text: r };
  // Without the token's last character.
  const last = head[end - 1];
  if (end > 1 && SPLIT_DASHES.includes(last) && isSpace(head[end])) {
    group = head.slice(end);
    if (leadingSpace(group) > 0) return { ts: head.slice(0, end - 1), text: group.trimStart() };
  }
  return null;
}

/** `\s*[dash.]\s+(.*)`: the text after a dash or period that is followed by whitespace. */
function dashThenText(rest: string): string | null {
  const i = leadingSpace(rest);
  const ch = rest[i];
  if (ch === undefined || !SPLIT_DASHES.includes(ch)) return null;
  if (!isSpace(rest[i + 1])) return null;
  return rest.slice(i + 1).trimStart();
}

interface RawItem {
  head: string;
  rest: string[];
}

function rawItems(bodyLines: string[], lead: string, max: number): RawItem[] {
  const out: RawItem[] = [];
  let cur: RawItem | null = null;
  for (const l of bodyLines) {
    const head = itemHead(l, lead);
    if (head !== null) {
      if (out.length >= max) break;
      cur = { head, rest: [] };
      out.push(cur);
      continue;
    }
    if (cur !== null) cur.rest.push(l);
  }
  return out;
}

interface ParsedItem {
  head: string;
  text: string;
  sub: Entry[];
}

function parseItems(bodyLines: string[], lead: string, max: number): ParsedItem[] {
  return rawItems(bodyLines, lead, max).map((it) => {
    const stripped = it.rest.map((x) => (isSpace(x[0]) && isSpace(x[1]) ? x.slice(2) : x));
    const sub = mapOf(kv(stripped));
    let ts = it.head;
    let text = '';
    const has = (k: string): boolean => get(sub, k) !== '';
    if (!has('checked') && !has('found') && !has('evidence')) {
      const split = splitHead(it.head);
      if (split !== null) {
        ts = split.ts;
        const tail = clean(it.rest.join('\n'));
        text = split.text + (tail !== '' ? ` ${tail}` : '');
      }
    }
    return { head: ts, text, sub };
  });
}

// ---------------------------------------------------------------------------
// Evidence tags
// ---------------------------------------------------------------------------

const RE_ELIMINATES = /\bELIMINATE|\bREFUTE|\bRULES? OUT|\bNOT the cause|\bNOT in\b/i;
const RE_CONFIRMS = /\bCONFIRM|\bROOT CAUSE|\bproves?\b|\bdirect cause/i;
const RE_FIX = /\bApplied fix|\bfix (applied|committed)|\bcommitted \(|\bVerified\b/i;

function tagOf(implication: string, found: string, text: string): DebugEvidenceTag {
  const s = `${implication} ${found} ${text}`;
  if (RE_ELIMINATES.test(s)) return 'eliminates';
  if (RE_CONFIRMS.test(s)) return 'confirms';
  if (RE_FIX.test(s)) return 'fix';
  return 'finding';
}

// ---------------------------------------------------------------------------
// Resolution: causes, fix, verification, files
// ---------------------------------------------------------------------------

/** The sketch's empty(): blank, "[]", or a value that starts "empty", "none" or "not applied". */
export function isEmptyValue(value: string): boolean {
  const t = value.trim();
  if (t === '') return true;
  if (t.replace(/\s+/g, '') === '[]') return true;
  const lower = t.slice(0, 20).toLowerCase();
  const body = lower.startsWith('(') ? lower.slice(1) : lower;
  for (const word of ['empty', 'none', 'not applied']) {
    if (body.startsWith(word) && !isLower(body[word.length])) return true;
  }
  return false;
}

/** First sentence, never ending inside a `code span`; at most 260 characters. */
function firstSentence(text: string): string {
  const t = clean(text);
  let code = false;
  for (let i = 0; i < t.length && i < 260; i++) {
    const ch = t[i];
    if (ch === '`') code = !code;
    else if (!code && i >= 30 && (ch === '.' || ch === '!' || ch === '?') && (i + 1 === t.length || t[i + 1] === ' ')) {
      return t.slice(0, i + 1);
    }
  }
  return t.length > 260 ? `${dropLastWord(t.slice(0, 260))}…` : t;
}

/** `slice.replace(/\s+\S*$/, '')`: the last partial word and the whitespace before it. */
function dropLastWord(text: string): string {
  const at = text.lastIndexOf(' ');
  return at === -1 ? text : text.slice(0, at).trimEnd();
}

interface Mark {
  i: number;
  word: string | null;
  end: number;
}

/** Cause markers in a squashed text: "1." (before a capital or "("), "(1)" / "(1, ...)", or the words
 * PRIMARY / SECONDARY / TERTIARY. Numbered markers are accepted only in sequence (1, 2, 3 ...). */
function marksOf(t: string): Mark[] {
  const marks: Mark[] = [];
  let want = 1;
  let i = 0;
  while (i < t.length && marks.length < MAX_CAUSES + 1) {
    if (i > 0 && t[i - 1] !== ' ') {
      i += 1;
      continue;
    }
    const ch = t[i];
    let num = 0;
    let word: string | null = null;
    let end = -1;
    if (isDigit(ch) && t[i + 1] === '.' && t[i + 2] === ' ') {
      let j = i + 2;
      while (t[j] === ' ') j += 1;
      if (isUpper(t[j]) || t[j] === '(') {
        num = Number(ch);
        end = j;
      }
    } else if (ch === '(' && isDigit(t[i + 1])) {
      let j = i + 2;
      if (t[j] === ',') {
        const close = t.indexOf(')', j);
        j = close === -1 ? -1 : close;
      }
      if (j !== -1 && t[j] === ')') {
        num = Number(t[i + 1]);
        j += 1;
        while (t[j] === ' ') j += 1;
        end = j;
      }
    } else if (isUpper(ch)) {
      for (const w of ['PRIMARY', 'SECONDARY', 'TERTIARY']) {
        if (t.startsWith(w, i) && !isWord(t[i + w.length])) {
          word = w;
          end = i + w.length;
          // The sketch's marker pattern ends right after the word; the label scan skips the space.
          while (t[end] === ' ') end += 1;
          break;
        }
      }
    }
    if (end === -1) {
      i += 1;
      continue;
    }
    if (num !== 0) {
      if (num !== want) {
        i = end;
        continue;
      }
      want += 1;
    }
    marks.push({ i, word, end });
    i = end;
  }
  return marks;
}

/** A leading ALL-CAPS label (with " / " joins) and the rest of the segment. */
function labelOf(seg: string): { label: string; rest: string } | null {
  const run = (from: number): number => {
    if (!isUpper(seg[from])) return -1;
    let j = from + 1;
    while (j < seg.length && (isUpper(seg[j]) || seg[j] === '&' || seg[j] === '-')) j += 1;
    if (isLower(seg[j])) j -= 1;
    return j - from >= 3 ? j : -1;
  };
  let end = run(0);
  if (end === -1) return null;
  for (;;) {
    let j = end;
    if (seg[j] === ' ') j += 1;
    if (seg[j] !== '/') break;
    j += 1;
    if (seg[j] === ' ') j += 1;
    const next = run(j);
    if (next === -1) break;
    end = next;
  }
  const label = seg.slice(0, end);
  if (isLower(seg[end])) return null;
  return { label, rest: seg.slice(end).trimStart() };
}

function stripLeadingParen(seg: string): string {
  let s = seg;
  if (s[0] === '(') {
    const close = s.indexOf(')');
    if (close !== -1) {
      s = s.slice(close + 1).trimStart();
      if (s[0] === '.' || s[0] === ':' || s[0] === '—' || s[0] === '-') s = s.slice(1).trimStart();
    }
  }
  if (s[0] === '—' || s[0] === ':' || s[0] === '.' || s[0] === '-') s = s.slice(1).trimStart();
  return s;
}

function blocksValue(text: string): DebugValue {
  return { shape: 'blocks', blocks: parseBlocks(cap(text)) };
}

function causesOf(rootCause: string): DebugCause[] {
  const t = clean(rootCause);
  if (t === '') return [];
  const marks = marksOf(t);
  if (marks.length === 0) {
    const f = firstSentence(t);
    return [{ label: null, text: f, cut: clean(f) !== t, value: blocksValue(t) }];
  }
  return marks.slice(0, MAX_CAUSES).map((mk, k) => {
    let seg = t.slice(mk.end, marks[k + 1]?.i ?? t.length).trim();
    let label = mk.word;
    const lm = labelOf(seg);
    if (lm !== null) {
      label = label ? `${label} · ${lm.label}` : lm.label;
      seg = lm.rest;
    }
    seg = stripLeadingParen(seg);
    const sent = firstSentence(seg);
    const text = sent.length > MAX_CAUSE_TEXT ? `${dropLastWord(sent.slice(0, MAX_CAUSE_TEXT - 3))}…` : sent;
    return {
      label: label ? label.trimEnd() : `Cause ${k + 1}`,
      text,
      cut: clean(text.endsWith('…') ? text.slice(0, -1) : text) !== clean(seg),
      value: blocksValue(seg),
    };
  });
}

function stripNotApplied(t: string): string {
  let s = t;
  if (s[0] === '(') s = s.slice(1);
  if (!s.toLowerCase().startsWith('not applied')) return t;
  s = s.slice('not applied'.length);
  // `[^)]*\)?`: everything up to and including the next close paren, when there is one.
  const close = s.indexOf(')');
  s = close === -1 ? s.replace(/^[^)]*/, '') : s.slice(close + 1);
  return s.trimStart();
}

function fixOf(fix: string): DebugFix | null {
  const t = clean(fix);
  if (t === '') return null;
  const head = t[0] === '(' ? t.slice(1, 12).toLowerCase() : t.slice(0, 11).toLowerCase();
  const notApplied = head.startsWith('not applied');
  let rest = notApplied ? stripNotApplied(t) : t;
  if (rest.slice(0, 10).toLowerCase() === 'direction:') rest = rest.slice(10).trimStart();
  const basis = rest === '' ? t : rest;
  const text = firstSentence(basis);
  return { notApplied, text, cut: clean(text) !== clean(basis), value: valueOf(fix) };
}

function resultOf(word: string): 'pass' | 'fail' | 'open' {
  const w = word.toLowerCase();
  if (w.includes('pass') || w.includes('accept')) return 'pass';
  if (w.includes('fail')) return 'fail';
  return 'open';
}

function wordAt(text: string, from: number): string {
  let i = from;
  while (i < text.length && isSpace(text[i])) i += 1;
  let j = i;
  while (j < text.length && isWord(text[j])) j += 1;
  return text.slice(i, j);
}

/** A signal name without its trailing parenthetical. */
function signalName(text: string): string {
  const t = clean(text);
  if (!t.endsWith(')')) return t;
  const open = t.indexOf('(');
  return open === -1 ? t : t.slice(0, open).trimEnd();
}

function chipsOf(v: string): DebugChip[] {
  const chips: DebugChip[] = [];
  const lines = v.split('\n');
  for (let i = 0; i < lines.length && chips.length < MAX_CHIPS; i++) {
    const t = lines[i].trimStart();
    if (t[0] !== '-') continue;
    const after = t.slice(1).trimStart();
    if (!after.toLowerCase().startsWith('signal:')) continue;
    const parts = [after.slice(7)];
    let result: string | null = null;
    for (let k = i + 1; k < lines.length && k <= i + MAX_SIGNAL_LINES; k++) {
      const next = lines[k].trimStart();
      if (next.toLowerCase().startsWith('result:')) {
        result = wordAt(next, 7);
        i = k;
        break;
      }
      if (next === '' || next[0] === '-') break;
      parts.push(next);
    }
    if (result === null) continue;
    chips.push({ name: signalName(parts.join(' ')), result: resultOf(result) });
  }
  if (chips.length > 0) return chips;
  for (let i = 0; i < lines.length && chips.length < MAX_CHIPS; i++) {
    const line = lines[i];
    if (isSpace(line[0])) continue;
    let j = 0;
    while (j < line.length && (isLower(line[j]) || line[j] === '_')) j += 1;
    if (j === 0 || line[j] !== ':') continue;
    const rest = line.slice(j + 1).trim();
    let result: string | null = null;
    if (rest.startsWith('{')) {
      const inner = rest.slice(1).trimStart();
      if (inner.toLowerCase().startsWith('result:')) result = wordAt(inner, 7);
    } else if (rest === '') {
      let k = i + 1;
      while (k < lines.length && lines[k].trim() === '') k += 1;
      const next = lines[k];
      if (next !== undefined && isSpace(next[0]) && next.trimStart().toLowerCase().startsWith('result:')) {
        result = wordAt(next.trimStart(), 7);
      }
    }
    if (result !== null && result !== '') chips.push({ name: humanize(line.slice(0, j)), result: resultOf(result) });
  }
  return chips;
}

function verificationOf(v: string): DebugVerification | null {
  if (v.trim() === '') return null;
  const head = v.trim()[0] === '(' ? v.trim().slice(1, 12) : v.trim().slice(0, 11);
  if (head.toLowerCase().startsWith('not applied')) return null;
  const chips = chipsOf(v);
  if (chips.length > 0) {
    let verdict: string | null = null;
    const lower = v.toLowerCase();
    const at = lower.indexOf('guardrail_verdict:');
    if (at !== -1) verdict = wordAt(v, at + 18) || null;
    return { verdict, chips, text: '', value: valueOf(v) };
  }
  return { verdict: null, chips: null, text: firstSentence(v), value: valueOf(v) };
}

function pathTokenEnd(text: string, from: number): number {
  let j = from;
  while (j < text.length && !isSpace(text[j]) && text[j] !== '`') j += 1;
  return j;
}

function tidyNote(rest: string): string | null {
  let note = rest.trim();
  if (note === '') return null;
  if (note[0] === '(') {
    const close = note.indexOf(')');
    if (close !== -1) {
      const inner = note.slice(1, close).trim();
      let after = note.slice(close + 1).trimStart();
      if (after[0] === ':') after = after.slice(1).trimStart();
      note = after === '' ? inner : inner === '' ? after : `${inner}: ${after}`;
    } else note = note.slice(1).trim();
  } else if (note[0] === ':') note = note.slice(1).trim();
  note = clean(note, 600);
  return note === '' ? null : note;
}

function filesOf(v: string): DebugFile[] {
  if (isEmptyValue(v)) return [];
  const files: DebugFile[] = [];
  const lines = v.split('\n');
  let i = 0;
  while (i < lines.length && files.length < MAX_FILES) {
    const t = lines[i].trimStart();
    i += 1;
    if (t[0] !== '-' || !isSpace(t[1])) continue;
    let rest = t.slice(1).trimStart();
    // Continuation lines belong to this item's note.
    const extra: string[] = [];
    while (i < lines.length) {
      const nx = lines[i].trimStart();
      if (nx === '' || (nx[0] === '-' && isSpace(nx[1]))) break;
      extra.push(nx);
      i += 1;
    }
    const paths: string[] = [];
    let pos = 0;
    for (let n = 0; n < 40; n++) {
      if (rest[pos] === '`') pos += 1;
      const end = pathTokenEnd(rest, pos);
      let token = rest.slice(pos, end);
      pos = end;
      if (rest[pos] === '`') pos += 1;
      let trail = '';
      while (token.length > 0 && ':,;'.includes(token[token.length - 1])) {
        trail = token[token.length - 1] + trail;
        token = token.slice(0, -1);
      }
      if (rest[pos] === ':' || rest[pos] === ',' || rest[pos] === ';') {
        trail += rest[pos];
        pos += 1;
      }
      if (token === '') break;
      paths.push(token);
      const pathLike = token.includes('/') || token.includes('.');
      if (trail.includes(',') && !trail.includes(':') && pathLike && isSpace(rest[pos])) {
        while (isSpace(rest[pos])) pos += 1;
        continue;
      }
      break;
    }
    if (paths.length === 0) continue;
    rest = `${rest.slice(pos)} ${extra.join(' ')}`;
    const note = tidyNote(rest);
    for (const path of paths) {
      if (files.length < MAX_FILES) files.push({ path: cap(path, 400), note });
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Candidate causes
// ---------------------------------------------------------------------------

function candidatesOf(text: string): DebugCandidate[] {
  const out: DebugCandidate[] = [];
  for (const raw of text.split('\n')) {
    if (out.length >= MAX_CANDIDATES) break;
    let l = raw.trimStart();
    if (l[0] === '-') l = l.slice(1).trimStart();
    const t = unq(l);
    if (t === '') continue;
    let kind: string | null = null;
    let body = t;
    if (isWord(t[0])) {
      let j = 1;
      while (j < t.length && j < 60 && (isWord(t[j]) || t[j] === '/' || t[j] === ' ')) j += 1;
      if (t[j] === ':') {
        kind = t.slice(0, j);
        body = t.slice(j + 1).trimStart();
      }
    }
    const lower = body.toLowerCase();
    const verdict = lower.includes('(eliminated') ? 'eliminated' : lower.includes('(confirmed') ? 'confirmed' : null;
    let text2 = body.trimEnd();
    if (text2.endsWith(')')) {
      const end = text2.length - 1;
      const prevClose = text2.lastIndexOf(')', end - 1);
      let from = text2.indexOf('(', prevClose + 1);
      while (from !== -1 && from < end) {
        const low = text2.slice(from + 1, from + 12).toLowerCase();
        if (low.startsWith('confirmed') || low.startsWith('eliminated')) {
          text2 = text2.slice(0, from).trimEnd();
          break;
        }
        from = text2.indexOf('(', from + 1);
      }
    }
    out.push({ kind, text: cap(text2), verdict });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const HANDLED = ['current focus', 'symptoms', 'eliminated', 'evidence', 'resolution'];

function startsWithCI(title: string, prefix: string): boolean {
  return title.slice(0, prefix.length).toLowerCase() === prefix;
}

function holdsTimestampItem(sec: Sec): boolean {
  for (const l of sec.body) if (itemHead(l, 'timestamp') !== null) return true;
  return false;
}

/** Reads a debug session body. Pure; never throws on a string. */
export function extractDebugSession(rawBody: string): DebugSessionBody {
  const result: DebugSessionBody = {
    h1: null,
    focusHeading: null,
    focus: [],
    reasoning: null,
    symptomsHeading: null,
    symptoms: [],
    eliminated: [],
    evidence: [],
    resolution: null,
    sections: [],
  };
  if (typeof rawBody !== 'string' || rawBody === '') return result;
  const lines = stripFrontmatter(rawBody)
    .split('\n')
    .map((l) => (l.length > MAX_LINE ? l.slice(0, MAX_LINE) : l.endsWith('\r') ? l.slice(0, -1) : l));
  const secs = sectionsOf(lines);
  const h2 = secs.filter((s) => s.level === 2);

  result.h1 = secs.find((s) => s.level === 1)?.title ?? null;

  const focusSec = [...h2].reverse().find((s) => startsWithCI(s.title, 'current focus'));
  if (focusSec !== undefined) {
    result.focusHeading = focusSec.title;
    const entries = kv(focusSec.body);
    const isRc = (e: Entry): boolean => e.key.toLowerCase().includes('reasoning_checkpoint');
    result.focus = entries
      .filter((e) => !isRc(e))
      .slice(0, MAX_FIELDS)
      .map((e) => fieldOf(e.key, e.value));
    const rc = entries.find(isRc);
    if (rc !== undefined) {
      const map = mapOf(kv(rc.value.split('\n')));
      result.reasoning = {
        fields: map.slice(0, MAX_FIELDS).map((e) => fieldOf(e.key, e.value)),
        candidates: candidatesOf(get(map, 'candidate_causes')),
      };
    }
  }

  const symSec = h2.find((s) => startsWithCI(s.title, 'symptoms'));
  if (symSec !== undefined) {
    result.symptomsHeading = symSec.title;
    result.symptoms = kv(symSec.body)
      .slice(0, MAX_FIELDS)
      .map((e) => fieldOf(e.key, e.value));
  }

  const elimSecs = h2.filter((s) => s.title.toLowerCase().includes('eliminated'));
  for (const sec of elimSecs) {
    for (const it of parseItems(sec.body, 'hypothesis', MAX_ELIMINATED)) {
      if (result.eliminated.length >= MAX_ELIMINATED) break;
      result.eliminated.push({
        hypothesis: clean(unq(it.head)),
        evidence: clean(get(it.sub, 'evidence')),
        timestamp: clean(get(it.sub, 'timestamp'), 300),
      });
    }
  }

  const evSecs = secs.filter((s) => s.title.toLowerCase().includes('evidence') && holdsTimestampItem(s));
  for (const sec of evSecs) {
    for (const it of parseItems(sec.body, 'timestamp', MAX_EVIDENCE)) {
      if (result.evidence.length >= MAX_EVIDENCE) break;
      const checked = clean(get(it.sub, 'checked'));
      const found = clean(get(it.sub, 'found'));
      const implication = clean(get(it.sub, 'implication'));
      const text = clean(it.text);
      result.evidence.push({
        ts: clean(unq(it.head), 300),
        round: sec.title,
        checked,
        found,
        implication,
        text,
        tag: tagOf(implication, found, text),
      });
    }
  }

  const resSec = [...h2].reverse().find((s) => startsWithCI(s.title, 'resolution'));
  if (resSec !== undefined) {
    const map = mapOf(kv(resSec.body));
    const rootCause = get(map, 'root_cause');
    result.resolution = {
      heading: resSec.title,
      fields: map.slice(0, MAX_FIELDS).map((e) => fieldOf(e.key, e.value)),
      causes: isEmptyValue(rootCause) ? [] : causesOf(cap(rootCause)),
      fix: fixOf(get(map, 'fix')),
      verification: verificationOf(get(map, 'verification')),
      files: filesOf(get(map, 'files_changed')),
    };
  }

  for (const sec of h2) {
    if (result.sections.length >= MAX_SECTIONS) break;
    const lower = sec.title.toLowerCase();
    let role: DebugSectionRole = 'other';
    if (evSecs.includes(sec)) role = 'evidence';
    else if (elimSecs.includes(sec)) role = 'eliminated';
    else if (HANDLED.includes(lower)) {
      role =
        lower === 'current focus' ? 'focus' : lower === 'symptoms' ? 'symptoms' : lower === 'eliminated' ? 'eliminated' : lower === 'evidence' ? 'evidence' : 'resolution';
    }
    result.sections.push({ heading: sec.title, role });
  }
  return result;
}
