// The UI-REVIEW.md audit projection (quick-261003-528, sketch 018 B): a tolerant, fence-aware,
// line-scanned read of a retroactive six-pillar visual audit into `UiReviewAudit` — the header
// facts, the Pillar Scores table and its overall, every pillar's findings (groups of items classed
// pass / flag / fail / note, a verdict line, Contract / Audit Method notes), the Top 3 Priority
// Fixes with the pillars they touch, the review history, every other `##` section (the back matter,
// with the Files Audited list as a directory-ready tree) and a section ledger so the composer can
// prove nothing was dropped silently. It is a port of the sketch's `gen-data.mjs` parse with the
// uat-session.ts discipline.
// T-528-01: the `##` and `###` splits go through `splitWithPreamble` (fence-aware, every line
// clipped to MAX_LINE up front); every pattern here runs on one clipped line at a time and none
// nests an unbounded quantifier; file refs are found by testing whitespace-split tokens of at most
// 300 characters with an anchored check — never by a global pattern over a whole line — and
// "Priority Fix" is found with indexOf. `extractUiReview` is pure (no fs access) and never throws
// on a string; `UiReviewHandler.parse` still wraps it in try/catch (T-528-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';
import { splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type UiReviewItemKind = 'pass' | 'flag' | 'fail' | 'note';

export interface UiReviewItem {
  /** The line with its leading ✅ / ⚠️ / ❌ and trailing ✓ / ✗ removed. */
  text: string;
  kind: UiReviewItemKind;
  /** Indented bullets and numbered lines under the item. */
  sub: string[];
  /** A fenced block under the item (its lines, fences removed), or null. */
  code: string | null;
}

export interface UiReviewGroup {
  /** The `**Label:**` that opened the group, or null for lines ahead of the first label. */
  title: string | null;
  items: UiReviewItem[];
}

export interface UiReviewFact {
  key: string;
  value: string;
  /** Bullet lines under a fact whose own value is empty (Prior reviews superseded). */
  items: string[];
}

export interface UiReviewVerdict {
  label: string;
  text: string;
}

export interface UiReviewNote {
  key: string;
  value: string;
}

export interface UiReviewPillar {
  n: number;
  name: string;
  /** 0-4 (clamped). */
  score: number;
  /** The Key Finding cell. */
  key: string;
  verdict: UiReviewVerdict | null;
  /** The `**Contract:**` / `**Audit Method:**` lines (kept out of the findings). */
  notes: UiReviewNote[];
  groups: UiReviewGroup[];
  /** The numbers of the (real) fixes linked to this pillar. */
  fixes: number[];
}

export interface UiReviewFix {
  n: number;
  title: string;
  context: string | null;
  impact: string | null;
  fix: string | null;
  refs: string[];
  /** Pillar names. */
  pillars: string[];
  /** "No third fix." and the like — dropped by the composer. */
  none: boolean;
}

export interface UiReviewHistoryEntry {
  when: string;
  score: number;
  max: number;
  why: string;
}

export interface UiReviewFileEntry {
  path: string;
  note: string;
}

export interface UiReviewFileGroup {
  caption: string | null;
  entries: UiReviewFileEntry[];
  /** List lines (and plain lines) that name no file. */
  other: string[];
}

export interface UiReviewBackPart {
  heading: string | null;
  blocks: Block[];
}

export interface UiReviewBack {
  heading: string;
  parts: UiReviewBackPart[];
  /** Only for a "Files Audited" section. */
  files: { groups: UiReviewFileGroup[] } | null;
}

export interface UiReviewSection {
  heading: string;
  /** True for the sections the audit consumes itself (scores, fixes, findings). */
  claimed: boolean;
}

export interface UiReviewAudit {
  /** The `#` line as written, or null. */
  heading: string | null;
  /** The number after "Phase" in the `#` line (`06`), or null. */
  h1Phase: string | null;
  facts: UiReviewFact[];
  pillars: UiReviewPillar[];
  overall: { score: number; max: number };
  fixes: UiReviewFix[];
  /** The Top 3 section's text when it has no numbered items (italics and brackets removed). */
  fixesNote: string | null;
  fixesHeading: string | null;
  history: UiReviewHistoryEntry[];
  back: UiReviewBack[];
  sections: UiReviewSection[];
}

// ---------------------------------------------------------------------------
// Bounds and line helpers
// ---------------------------------------------------------------------------

const MAX_PILLARS = 12;
const MAX_ITEMS = 500;
const MAX_SUB = 100;
const MAX_CODE = 20000;
const MAX_FIXES = 30;
const MAX_FACTS = 40;
const MAX_HISTORY = 40;
const MAX_BACK = 40;
const MAX_FILES = 2000;
const MAX_TOKEN = 300;
const MAX_REFS = 20;
const MAX_HEADING = 300;
const MAX_JOINED = 20000;

interface Fence {
  ch: string;
  len: number;
}

function fenceOpener(trimmed: string): Fence | null {
  const ch = trimmed[0];
  if (ch !== '`' && ch !== '~') return null;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === ch) len += 1;
  return len >= 3 ? { ch, len } : null;
}

function fenceCloses(trimmed: string, fence: Fence): boolean {
  if (trimmed[0] !== fence.ch) return false;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === fence.ch) len += 1;
  return len >= fence.len && trimmed.slice(len).trim() === '';
}

function isRule(trimmed: string): boolean {
  if (trimmed.length < 3) return false;
  const ch = trimmed[0];
  if (ch !== '-' && ch !== '*' && ch !== '_') return false;
  for (const c of trimmed) if (c !== ch && c !== ' ') return false;
  return true;
}

function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').trim();
}

/** Single spaces only — linear, so a line of thousands of spaces stays cheap. */
function squeeze(text: string): string {
  return text.split(/\s+/).join(' ').trim();
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/** The digits at the start of `text`, or null. */
function leadingNumber(text: string): number | null {
  let i = 0;
  while (i < text.length && text[i] >= '0' && text[i] <= '9') i += 1;
  if (i === 0 || i > 9) return null;
  return Number(text.slice(0, i));
}

// ---------------------------------------------------------------------------
// File refs — token by token
// ---------------------------------------------------------------------------

const REF_EXTENSIONS = ['.tsx', '.ts', '.css', '.md', '.html', '.json', '.mjs'];
const REF_SEPARATORS = new Set([' ', '\t', '`', ',', '(', ')', ';', '"', "'", '“', '”']);

function isRefChar(ch: string): boolean {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '_' ||
    ch === '@' ||
    ch === '.' ||
    ch === '/' ||
    ch === '[' ||
    ch === ']' ||
    ch === '-'
  );
}

function refOf(raw: string): string | null {
  let token = raw;
  while (token.length > 0 && (token[0] === '*' || token[0] === '_')) token = token.slice(1);
  while (token.length > 0 && '.:;!?*_'.includes(token[token.length - 1])) token = token.slice(0, -1);
  if (token.length < 3 || token.length > MAX_TOKEN) return null;
  let base = token;
  let suffix = '';
  const colon = token.lastIndexOf(':');
  if (colon > 0) {
    const tail = token.slice(colon + 1);
    let ok = tail.length > 0 && tail[0] >= '0' && tail[0] <= '9';
    for (const ch of tail) if (!((ch >= '0' && ch <= '9') || ch === '-' || ch === '–' || ch === ',')) ok = false;
    if (ok) {
      base = token.slice(0, colon);
      suffix = tail;
    }
  }
  if (!REF_EXTENSIONS.some((ext) => base.length > ext.length && base.endsWith(ext))) return null;
  for (const ch of base) if (!isRefChar(ch)) return null;
  return suffix === '' ? base : `${base}:${suffix}`;
}

/** The file references in `text`, in first-seen order. */
export function fileRefs(text: string): string[] {
  const refs: string[] = [];
  let token = '';
  const flush = (): void => {
    if (token === '') return;
    const ref = refOf(token);
    if (ref !== null && !refs.includes(ref) && refs.length < MAX_REFS) refs.push(ref);
    token = '';
  };
  const limit = Math.min(text.length, MAX_JOINED);
  for (let i = 0; i < limit; i += 1) {
    const ch = text[i];
    if (REF_SEPARATORS.has(ch) || ch === '\n' || ch === '\r') flush();
    else if (token.length <= MAX_TOKEN) token += ch;
  }
  flush();
  return refs;
}

// ---------------------------------------------------------------------------
// Pillar names and the keyword fallback
// ---------------------------------------------------------------------------

const PILLAR_NAMES = ['Copywriting', 'Visuals', 'Color', 'Typography', 'Spacing', 'Experience Design'];

const KEYWORDS: [RegExp, string][] = [
  [/copy|label|string|wording|empty.state copy/i, 'Copywriting'],
  [/visual|hierarch|focal|icon|depth|tree-marker|scannab/i, 'Visuals'],
  [/colou?r|contrast|opacity|veil|destructive|hue|oklch|tone/i, 'Color'],
  [/typograph|font|weight|emphasis/i, 'Typography'],
  [/spacing|gap|padding|margin|px\b|scale/i, 'Spacing'],
  [/experience|state|keyboard|focus|scroll|interact|clipp|overflow|mouse|responsive|readab/i, 'Experience Design'],
];

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '_');
}

/** `word` (lower case) appears in the (lower case) `text` with a non-word character either side. */
function hasWord(text: string, word: string): boolean {
  let from = 0;
  for (;;) {
    const at = text.indexOf(word, from);
    if (at === -1) return false;
    if (!isWordChar(text[at - 1]) && !isWordChar(text[at + word.length])) return true;
    from = at + 1;
  }
}

function namedIn(text: string, names: readonly string[]): string[] {
  const lower = text.toLowerCase();
  return names.filter((name) => hasWord(lower, name.toLowerCase()));
}

function keywordIn(text: string): string[] {
  for (const [pattern, name] of KEYWORDS) if (pattern.test(text)) return [name];
  return [];
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function isFailMark(line: string): boolean {
  if (line.includes('❌')) return true;
  let from = 0;
  for (;;) {
    const at = line.indexOf('✗', from);
    if (at === -1) return false;
    const next = line[at + 1];
    if (next === undefined || next === ' ' || next === '\t') return true;
    from = at + 1;
  }
}

export function classify(line: string): UiReviewItemKind {
  if (isFailMark(line)) return 'fail';
  if (line.includes('⚠')) return 'flag';
  if (line.includes('✅') || line.includes('✓')) return 'pass';
  return 'note';
}

function stripMarks(text: string): string {
  let out = text.trim();
  for (const lead of ['✅', '⚠', '❌']) {
    if (out.startsWith(lead)) {
      out = out.slice(lead.length);
      if (out.startsWith('️')) out = out.slice(1);
      out = out.trim();
      break;
    }
  }
  out = out.trimEnd();
  if (out.endsWith('✓') || out.endsWith('✗')) out = out.slice(0, -1).trimEnd();
  return out;
}

function startsWithMark(trimmed: string): boolean {
  return trimmed.startsWith('✅') || trimmed.startsWith('⚠') || trimmed.startsWith('❌');
}

// ---------------------------------------------------------------------------
// Pillar findings
// ---------------------------------------------------------------------------

const VERDICT_LABELS = ['Score Justification', 'Assessment', 'Finding', 'Issue Finding'];
const NOTE_LABELS = ['contract', 'audit method'];

/** `**Label:** rest` -> { label, rest }; the label may hold backticks and a colon-free run. */
function boldLabelLine(line: string): { label: string; rest: string } | null {
  if (!line.startsWith('**')) return null;
  const close = line.indexOf(':**', 2);
  if (close === -1) return null;
  const label = line.slice(2, close);
  if (label.length === 0 || label.includes('*')) return null;
  return { label: label.trim(), rest: line.slice(close + 3).trim() };
}

function bulletOf(line: string): { indent: number; text: string } | null {
  let i = 0;
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i += 1;
  const ch = line[i];
  if ((ch === '-' || ch === '*') && (line[i + 1] === ' ' || line[i + 1] === '\t')) {
    return { indent: i, text: line.slice(i + 2).trim() };
  }
  return null;
}

function numberedOf(line: string): string | null {
  let i = 0;
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i += 1;
  const start = i;
  while (i < line.length && line[i] >= '0' && line[i] <= '9') i += 1;
  if (i === start || i - start > 4 || line[i] !== '.' || (line[i + 1] !== ' ' && line[i + 1] !== '\t')) return null;
  return line.slice(i + 2).trim();
}

interface Findings {
  groups: UiReviewGroup[];
  verdict: UiReviewVerdict | null;
  notes: UiReviewNote[];
}

function findingsOf(body: string): Findings {
  const groups: UiReviewGroup[] = [];
  const notes: UiReviewNote[] = [];
  let verdict: UiReviewVerdict | null = null;
  let group: UiReviewGroup | null = null;
  let item: UiReviewItem | null = null;
  let fence: Fence | null = null;
  let count = 0;

  const ensureGroup = (): UiReviewGroup => {
    if (group === null) {
      group = { title: null, items: [] };
      groups.push(group);
    }
    return group;
  };
  const addItem = (text: string, kind: UiReviewItemKind): UiReviewItem | null => {
    if (count >= MAX_ITEMS) return null;
    count += 1;
    const created: UiReviewItem = { text, kind, sub: [], code: null };
    ensureGroup().items.push(created);
    return created;
  };

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) {
        fence = null;
        continue;
      }
      if (item === null) item = addItem('', 'note');
      if (item !== null && (item.code ?? '').length < MAX_CODE) item.code = item.code === null ? line : `${item.code}\n${line}`;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      if (item === null) item = addItem('', 'note');
      if (item !== null && item.code === null) item.code = '';
      continue;
    }
    if (trimmed === '') {
      item = null;
      continue;
    }
    if (isRule(trimmed)) {
      item = null;
      continue;
    }
    const labelled = boldLabelLine(trimmed);
    if (labelled !== null && bulletOf(line) === null) {
      const lower = labelled.label.toLowerCase();
      const verdictLabel = VERDICT_LABELS.find((label) => label.toLowerCase() === lower);
      if (verdictLabel !== undefined) {
        verdict = { label: verdictLabel, text: labelled.rest };
        item = null;
        continue;
      }
      if (NOTE_LABELS.includes(lower)) {
        notes.push({ key: labelled.label, value: labelled.rest });
        item = null;
        continue;
      }
      group = { title: labelled.label, items: [] };
      groups.push(group);
      // The sentence after the label is the group's first item; the next line starts afresh.
      if (labelled.rest !== '') addItem(stripMarks(labelled.rest), classify(labelled.rest));
      item = null;
      continue;
    }
    const bullet = bulletOf(line);
    if (bullet !== null) {
      if (bullet.indent >= 2 && item !== null) {
        if (item.sub.length < MAX_SUB) item.sub.push(bullet.text);
        continue;
      }
      item = addItem(stripMarks(bullet.text), classify(bullet.text));
      continue;
    }
    const numbered = numberedOf(line);
    if (numbered !== null && item !== null) {
      if (item.sub.length < MAX_SUB) item.sub.push(numbered);
      continue;
    }
    if (startsWithMark(trimmed)) {
      item = addItem(stripMarks(trimmed), classify(trimmed));
      continue;
    }
    if (item !== null) {
      const joined = `${item.text} ${trimmed}`.trim();
      if (joined.length <= MAX_JOINED) {
        item.text = joined;
        if (item.kind === 'note') item.kind = classify(item.text);
      }
      continue;
    }
    // A plain line outside any item opens one (a stray line ahead of the first label lands in an
    // untitled group); the lines that follow it, up to a blank, extend it.
    item = addItem(stripMarks(trimmed), classify(trimmed));
  }
  return { groups: groups.filter((g) => g.items.length > 0), verdict, notes };
}

// ---------------------------------------------------------------------------
// Pillar Scores table
// ---------------------------------------------------------------------------

function cellsOf(line: string): string[] {
  let body = line.trim();
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '\\' && body[i + 1] === '|') {
      cell += '|';
      i += 1;
    } else if (ch === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

interface TableRow {
  n: number;
  name: string;
  score: number;
  key: string;
}

function tableRowsOf(body: string): TableRow[] {
  const rows: TableRow[] = [];
  let fence: Fence | null = null;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      continue;
    }
    if (!trimmed.startsWith('|') || rows.length >= MAX_PILLARS) continue;
    const cells = cellsOf(trimmed);
    const first = cells[0] ?? '';
    const n = leadingNumber(first);
    if (n === null) continue;
    // The dot follows the whole digit run (leading zeros included).
    let i = 0;
    while (i < first.length && first[i] >= '0' && first[i] <= '9') i += 1;
    const after = first.slice(i);
    if (!after.startsWith('.')) continue;
    const score = leadingNumber((cells[1] ?? '').trim());
    rows.push({
      n,
      name: after.slice(1).trim().slice(0, MAX_HEADING),
      score: clamp(score ?? 0, 0, 4),
      key: cells.slice(2).join(' | '),
    });
  }
  return rows;
}

/** `**Overall: X/Y**` -> [X, Y] (or null). */
function overallOf(body: string): { score: number; max: number } | null {
  for (const line of body.split('\n')) {
    const lower = line.toLowerCase();
    const at = lower.indexOf('overall');
    if (at === -1) continue;
    let i = at + 'overall'.length;
    while (i < line.length && (line[i] === ':' || line[i] === '*' || line[i] === ' ')) i += 1;
    const score = leadingNumber(line.slice(i));
    if (score === null) continue;
    i += String(score).length;
    while (i < line.length && line[i] === ' ') i += 1;
    if (line[i] !== '/') continue;
    i += 1;
    while (i < line.length && line[i] === ' ') i += 1;
    const max = leadingNumber(line.slice(i));
    if (max !== null && max > 0) return { score, max };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pillar detail headings: `Pillar N: Name (S/4)`
// ---------------------------------------------------------------------------

interface PillarHeading {
  n: number;
  name: string;
  score: number | null;
}

function pillarHeadingOf(heading: string): PillarHeading | null {
  const text = heading.slice(0, MAX_HEADING).trim();
  if (!text.toLowerCase().startsWith('pillar')) return null;
  let i = 'pillar'.length;
  while (i < text.length && text[i] === ' ') i += 1;
  const n = leadingNumber(text.slice(i));
  if (n === null) return null;
  i += text.slice(i).match(/^\d+/)?.[0].length ?? 0;
  if (text[i] === ':' || text[i] === '.') i += 1;
  let name = text.slice(i).trim();
  let score: number | null = null;
  const open = name.lastIndexOf('(');
  if (open !== -1 && name.endsWith(')')) {
    score = leadingNumber(name.slice(open + 1));
    name = name.slice(0, open).trim();
  }
  return { n, name: plain(name), score: score === null ? null : clamp(score, 0, 4) };
}

// ---------------------------------------------------------------------------
// Header facts
// ---------------------------------------------------------------------------

function factsOf(preamble: string): { heading: string | null; facts: UiReviewFact[] } {
  let heading: string | null = null;
  const facts: UiReviewFact[] = [];
  let current: UiReviewFact | null = null;
  let fence: Fence | null = null;
  for (const line of preamble.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      continue;
    }
    if (heading === null && trimmed.startsWith('# ')) {
      heading = trimmed.slice(2).trim().slice(0, MAX_HEADING);
      continue;
    }
    const labelled = boldLabelLine(trimmed);
    if (labelled !== null && bulletOf(line) === null) {
      if (facts.length >= MAX_FACTS) break;
      current = { key: labelled.label, value: labelled.rest, items: [] };
      facts.push(current);
      continue;
    }
    const bullet = bulletOf(line);
    if (bullet !== null && current !== null && (current.value === '' || current.items.length > 0)) {
      if (current.items.length < MAX_HISTORY) current.items.push(bullet.text);
      continue;
    }
    if (trimmed === '') continue;
  }
  return { heading, facts };
}

function h1PhaseOf(heading: string | null): string | null {
  if (heading === null) return null;
  const lower = heading.toLowerCase();
  const at = lower.indexOf('phase');
  if (at === -1) return null;
  let i = at + 'phase'.length;
  while (i < heading.length && heading[i] === ' ') i += 1;
  let j = i;
  while (j < heading.length && ((heading[j] >= '0' && heading[j] <= '9') || heading[j] === '.')) j += 1;
  if (j === i) return null;
  let out = heading.slice(i, j);
  while (out.endsWith('.')) out = out.slice(0, -1);
  return out === '' ? null : out;
}

// ---------------------------------------------------------------------------
// Fixes
// ---------------------------------------------------------------------------

interface RawFix {
  n: number;
  raw: string;
}

function numberedItems(body: string): RawFix[] {
  const items: RawFix[] = [];
  let current: RawFix | null = null;
  let fence: Fence | null = null;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    if (fenceOpener(trimmed)) {
      fence = fenceOpener(trimmed);
      continue;
    }
    if (trimmed === '' || isRule(trimmed)) continue;
    const at = trimmed.indexOf('.');
    const n = at > 0 && at <= 4 ? leadingNumber(trimmed.slice(0, at)) : null;
    if (n !== null && String(n).length === at && (trimmed[at + 1] === ' ' || trimmed[at + 1] === '\t')) {
      if (items.length >= MAX_FIXES) break;
      current = { n, raw: trimmed.slice(at + 2).trim() };
      items.push(current);
      continue;
    }
    if (current !== null && current.raw.length < MAX_JOINED) current.raw = `${current.raw} ${trimmed}`;
  }
  return items;
}

function splitFix(raw: string): Omit<UiReviewFix, 'pillars' | 'none'> & { titleRaw: string } {
  const text = squeeze(raw.slice(0, MAX_JOINED));
  let title = text;
  let rest = '';
  if (text.startsWith('**')) {
    const close = text.indexOf('**', 2);
    if (close !== -1) {
      title = text.slice(2, close);
      rest = text.slice(close + 2).trim();
      if (rest.startsWith('—') || rest.startsWith('-') || rest.startsWith(':')) rest = rest.slice(1).trim();
    }
  }
  const titleRaw = title;
  while (title.endsWith('.')) title = title.slice(0, -1);
  let impact: string | null = null;
  let fix: string | null = null;
  const imAt = rest.indexOf('**User impact:**');
  const fxAt = rest.indexOf('**Fix:**');
  let context = rest;
  if (imAt !== -1 || fxAt !== -1) {
    const marks: { at: number; label: 'impact' | 'fix'; len: number }[] = [];
    if (imAt !== -1) marks.push({ at: imAt, label: 'impact', len: '**User impact:**'.length });
    if (fxAt !== -1) marks.push({ at: fxAt, label: 'fix', len: '**Fix:**'.length });
    marks.sort((a, b) => a.at - b.at);
    context = rest.slice(0, marks[0].at).trim();
    marks.forEach((mark, index) => {
      const end = index + 1 < marks.length ? marks[index + 1].at : rest.length;
      const value = rest.slice(mark.at + mark.len, end).trim();
      if (mark.label === 'impact') impact = value === '' ? null : value;
      else fix = value === '' ? null : value;
    });
  } else {
    const parts = rest.split(' — ');
    if (parts.length >= 3) {
      context = parts[0].trim();
      impact = parts[1].trim() || null;
      fix = parts.slice(2).join(' — ').trim() || null;
    }
  }
  return {
    n: 0,
    title,
    titleRaw,
    context: context === '' ? null : context,
    impact,
    fix,
    refs: fileRefs(text),
  };
}

/** Fix numbers named after each "Priority Fix" / "Priority Fixes" in `text`, within 40 characters. */
function claimedFixes(text: string): number[] {
  const out: number[] = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf('Priority Fix', from);
    if (at === -1) break;
    let i = at + 'Priority Fix'.length;
    if (text.startsWith('es', i)) i += 2;
    const stop = Math.min(text.length, i + 40);
    let digits = '';
    for (; i < stop; i += 1) {
      const ch = text[i];
      if (ch >= '0' && ch <= '9') {
        digits += ch;
        continue;
      }
      if (digits !== '') {
        if (digits.length <= 2) out.push(Number(digits));
        digits = '';
      }
      if (ch === ' ' || ch === ',' || ch === '&' || ch === 'a' || ch === 'n' || ch === 'd') continue;
      break;
    }
    if (digits !== '' && digits.length <= 2) out.push(Number(digits));
    from = at + 1;
  }
  return out;
}

function pillarText(pillar: { verdict: UiReviewVerdict | null; notes: UiReviewNote[]; groups: UiReviewGroup[] }): string {
  const parts: string[] = [];
  if (pillar.verdict) parts.push(pillar.verdict.text);
  for (const note of pillar.notes) parts.push(note.value);
  for (const group of pillar.groups) {
    for (const item of group.items) {
      parts.push(item.text);
      for (const sub of item.sub) parts.push(sub);
    }
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function historyEntry(line: string): UiReviewHistoryEntry | null {
  let text = line.trim().slice(0, 2000);
  while (text.startsWith('*')) text = text.slice(1);
  const open = text.indexOf('(');
  if (open <= 0) return null;
  let when = text.slice(0, open).trim();
  while (when.endsWith('*')) when = when.slice(0, -1).trim();
  if (when.length < 4 || !(when[0] >= '0' && when[0] <= '9')) return null;
  const score = leadingNumber(text.slice(open + 1));
  if (score === null) return null;
  let i = open + 1 + String(score).length;
  while (text[i] === ' ') i += 1;
  if (text[i] !== '/') return null;
  i += 1;
  const max = leadingNumber(text.slice(i));
  if (max === null || max <= 0) return null;
  i += String(max).length;
  while (i < text.length && text[i] !== ')') i += 1;
  i += 1;
  let why = text.slice(i).trim();
  while (why.startsWith('*')) why = why.slice(1).trim();
  if (why.startsWith('—') || why.startsWith('-') || why.startsWith(':') || why.startsWith('–')) why = why.slice(1).trim();
  const lower = when.toLowerCase();
  if (lower.endsWith('review')) when = when.slice(0, -'review'.length).trim();
  return { when, score, max, why };
}

function historyFromBack(body: string): UiReviewHistoryEntry[] {
  const out: UiReviewHistoryEntry[] = [];
  for (const line of body.split('\n')) {
    const bullet = bulletOf(line);
    if (bullet === null || !bullet.text.startsWith('**')) continue;
    const entry = historyEntry(bullet.text);
    if (entry !== null && out.length < MAX_HISTORY) out.push(entry);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Back matter
// ---------------------------------------------------------------------------

/** Rules and italic footer lines (`*Phase: …*`) removed outside fences. */
function cleanLines(text: string): string {
  const out: string[] = [];
  let fence: Fence | null = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      out.push(line);
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      out.push(line);
      continue;
    }
    if (isRule(trimmed)) continue;
    if (
      trimmed.length > 2 &&
      trimmed[0] === '*' &&
      trimmed[1] !== '*' &&
      trimmed[trimmed.length - 1] === '*' &&
      trimmed[trimmed.length - 2] !== '*' &&
      !trimmed.slice(1, -1).includes('*')
    ) {
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function partsOf(body: string): UiReviewBackPart[] {
  const { preamble, sections } = splitWithPreamble(cleanLines(body), 3);
  const parts: UiReviewBackPart[] = [];
  const lead = parseBlocks(preamble);
  if (lead.length > 0) parts.push({ heading: null, blocks: lead });
  for (const section of sections) {
    parts.push({ heading: section.heading.slice(0, MAX_HEADING), blocks: parseBlocks(section.body) });
  }
  return parts;
}

function fileEntryOf(text: string): UiReviewFileEntry | null {
  if (!text.startsWith('`')) return null;
  const close = text.indexOf('`', 1);
  if (close < 2) return null;
  let path = text.slice(1, close);
  const paren = path.indexOf(' (');
  if (paren !== -1) path = path.slice(0, paren);
  if (path.length > MAX_TOKEN) return null;
  let rest = text.slice(close + 1).trim();
  let note = '';
  if (rest.startsWith('(')) {
    const end = rest.indexOf(')');
    if (end !== -1) {
      note = rest.slice(1, end).trim();
      rest = rest.slice(end + 1).trim();
    }
  }
  if (rest.startsWith('—') || rest.startsWith('–') || rest.startsWith('-')) rest = rest.slice(1).trim();
  if (rest !== '') note = rest;
  return { path, note };
}

function filesOf(body: string): { groups: UiReviewFileGroup[] } {
  const groups: UiReviewFileGroup[] = [];
  const open = (caption: string | null): UiReviewFileGroup => {
    const created: UiReviewFileGroup = { caption, entries: [], other: [] };
    groups.push(created);
    return created;
  };
  let total = 0;
  let current: UiReviewFileGroup | null = null;
  const scan = (text: string): void => {
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '' || total >= MAX_FILES) continue;
      const bullet = bulletOf(line);
      const listText = bullet !== null ? bullet.text : numberedOf(line);
      if (listText === null && trimmed.endsWith(':') && trimmed.length < MAX_HEADING) {
        current = open(plain(trimmed.slice(0, -1)));
        continue;
      }
      const target: UiReviewFileGroup = current ?? open(null);
      current = target;
      const entry = listText === null ? null : fileEntryOf(listText);
      total += 1;
      if (entry !== null) target.entries.push(entry);
      else target.other.push(listText ?? trimmed);
    }
  };
  const { preamble, sections } = splitWithPreamble(cleanLines(body), 3);
  scan(preamble);
  for (const section of sections) {
    current = open(section.heading.slice(0, MAX_HEADING));
    scan(section.body);
  }
  return { groups: groups.filter((g) => g.entries.length > 0 || g.other.length > 0) };
}

function backOf(heading: string, body: string): UiReviewBack {
  const files = heading.toLowerCase().startsWith('files audited') ? filesOf(body) : null;
  return { heading: heading.slice(0, MAX_HEADING), parts: partsOf(body), files };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function startsWithHeading(heading: string, prefix: string): boolean {
  return plain(heading).toLowerCase().startsWith(prefix);
}

function fixesNoteOf(body: string): string | null {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !isRule(line));
  let text = squeeze(lines.join(' '));
  if (text === '') return null;
  while (text.startsWith('*')) text = text.slice(1);
  while (text.endsWith('*')) text = text.slice(0, -1);
  text = text.trim();
  if (text.startsWith('(') && text.endsWith(')')) text = text.slice(1, -1).trim();
  return text === '' ? null : text;
}

export function extractUiReview(rawBody: string): UiReviewAudit {
  const body = typeof rawBody === 'string' ? rawBody : '';
  const top = splitWithPreamble(body, 2);
  const { heading, facts } = factsOf(top.preamble);

  const sections: UiReviewSection[] = [];
  let tableRows: TableRow[] = [];
  let overall: { score: number; max: number } | null = null;
  let fixesBody: string | null = null;
  let fixesHeading: string | null = null;
  const details = new Map<number, Findings>();
  const detailHeadings: PillarHeading[] = [];
  const back: UiReviewBack[] = [];

  for (const section of top.sections) {
    const head = section.heading.slice(0, MAX_HEADING);
    if (startsWithHeading(head, 'pillar scores')) {
      tableRows = tableRowsOf(section.body);
      overall = overallOf(section.body);
      sections.push({ heading: head, claimed: true });
    } else if (startsWithHeading(head, 'top 3 priority fixes') || startsWithHeading(head, 'top priority fixes')) {
      fixesBody = section.body;
      fixesHeading = head;
      sections.push({ heading: head, claimed: true });
    } else if (startsWithHeading(head, 'detailed findings')) {
      sections.push({ heading: head, claimed: true });
      for (const part of splitWithPreamble(section.body, 3).sections) {
        const pillar = pillarHeadingOf(part.heading);
        if (pillar !== null && detailHeadings.length < MAX_PILLARS) {
          detailHeadings.push(pillar);
          details.set(pillar.n, findingsOf(part.body));
        } else if (back.length < MAX_BACK) {
          back.push(backOf(part.heading, part.body));
        }
      }
    } else {
      sections.push({ heading: head, claimed: false });
      if (back.length < MAX_BACK) back.push(backOf(head, section.body));
    }
  }

  // ---- pillars --------------------------------------------------------------------------------
  const rows: TableRow[] =
    tableRows.length > 0
      ? tableRows
      : detailHeadings.map((d) => ({ n: d.n, name: d.name, score: d.score ?? 0, key: '' }));
  const pillars: UiReviewPillar[] = rows.map((row) => {
    const found = details.get(row.n);
    return {
      n: row.n,
      name: row.name,
      score: row.score,
      key: row.key,
      verdict: found?.verdict ?? null,
      notes: found?.notes ?? [],
      groups: found?.groups ?? [],
      fixes: [],
    };
  });
  const sum = pillars.reduce((total, pillar) => total + pillar.score, 0);

  // ---- fixes ----------------------------------------------------------------------------------
  const fixes: UiReviewFix[] = [];
  let fixesNote: string | null = null;
  if (fixesBody !== null) {
    const items = numberedItems(fixesBody);
    if (items.length === 0) fixesNote = fixesNoteOf(fixesBody);
    const names = pillars.map((p) => p.name);
    const claims = new Map<number, Set<string>>();
    for (const pillar of pillars) {
      for (const n of claimedFixes(pillarText(pillar))) {
        const set = claims.get(n) ?? new Set<string>();
        set.add(pillar.name);
        claims.set(n, set);
      }
    }
    for (const item of items) {
      const split = splitFix(item.raw);
      const lowerTitle = split.titleRaw.toLowerCase();
      const none =
        (lowerTitle.startsWith('no third') || lowerTitle.startsWith('no further')) && lowerTitle.includes('fix');
      const claimed = claims.get(item.n);
      const searchNames = names.length > 0 ? names : PILLAR_NAMES;
      let linked: string[];
      if (claimed !== undefined) linked = names.filter((name) => claimed.has(name));
      else {
        linked = namedIn(split.title, searchNames);
        if (linked.length === 0) linked = keywordIn(split.title);
        if (linked.length === 0) linked = namedIn(squeeze(item.raw), searchNames);
        if (linked.length === 0) linked = keywordIn(squeeze(item.raw.slice(0, MAX_JOINED)));
        linked = linked.filter((name) => names.includes(name));
      }
      fixes.push({
        n: item.n,
        title: split.title,
        context: split.context,
        impact: split.impact,
        fix: split.fix,
        refs: split.refs,
        pillars: none ? [] : linked,
        none,
      });
    }
    for (const pillar of pillars) {
      pillar.fixes = fixes.filter((f) => !f.none && f.pillars.includes(pillar.name)).map((f) => f.n);
    }
  }

  // ---- history --------------------------------------------------------------------------------
  let history: UiReviewHistoryEntry[] = [];
  const prior = facts.find((fact) => fact.key.toLowerCase().startsWith('prior reviews'));
  if (prior) {
    for (const line of prior.items) {
      const entry = historyEntry(line);
      if (entry !== null && history.length < MAX_HISTORY) history.push(entry);
    }
  }
  if (history.length === 0) {
    const supersession = back.find((b) => startsWithHeading(b.heading, 'supersession') || startsWithHeading(b.heading, 'supersedes'));
    if (supersession) {
      const text = supersession.parts.flatMap((part) => part.blocks);
      const lines: string[] = [];
      for (const block of text) if (block.kind === 'list') for (const itemText of block.items) lines.push(`- ${itemText}`);
      history = historyFromBack(lines.join('\n'));
    }
  }

  return {
    heading,
    h1Phase: h1PhaseOf(heading),
    facts,
    pillars,
    overall: overall ?? { score: sum, max: 4 * pillars.length },
    fixes,
    fixesNote,
    fixesHeading,
    history,
    back,
    sections,
  };
}
