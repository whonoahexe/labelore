// The SUMMARY.md body projection (quick-261006-iz7, sketch 020 D): a tolerant, fence-aware,
// line-scanned read of one plan's (or one quick task's) SUMMARY into `SummaryRunBody` — the H1 and
// one-liner, the preamble facts, the Performance block, the Accomplishments split into a headline
// and its detail, the tasks with their commit hashes (from a numbered list, a table or a preamble
// Commits line), the one-line file notes, the Decisions Made body, the deviations with their
// labelled fields and extra subsections, the User Setup callout, the Next Phase Readiness line, the
// Self-Check verdict and every other `##` section, with a section ledger so the composer can prove
// nothing was dropped silently. It is a port of the sketch's `gen-data.mjs` parse with the
// ui-review-audit.ts discipline.
// T-iz7-01: the `##` and `###` splits go through `splitWithPreamble` (fence-aware, every line
// clipped to MAX_LINE up front); every pattern here runs on one clipped line at a time and none
// nests an unbounded quantifier; hashes and "[Rule" are found by scanning (indexOf / character
// loops), never by a global pattern over a whole line, and the headline split is a character loop.
// List sizes and joined item text are capped so a hostile file cannot grow the model. `extractSummaryRun`
// is pure (no fs access) and never throws on a string; `SummaryHandler.parse` still wraps it in
// try/catch (T-iz7-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';
import { splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface SummaryFact {
  key: string;
  value: string;
}

export interface SummaryAccomplishment {
  /** The first clause (a strong break outside code and parentheses, else a comma). */
  head: string;
  /** The remainder, first letter upper-cased; '' when the item did not split. */
  rest: string;
}

export interface SummaryTask {
  n: number;
  name: string | null;
  /** Full hashes as written (7-40 characters; 4 or more in a table cell). */
  hashes: string[];
  /** The parenthetical words after each hash (feat, tracer, tdd, RED ...), as written. */
  kinds: string[];
}

export type SummaryTaskSource = 'list' | 'table' | 'preamble';

export interface SummaryFileNote {
  path: string;
  note: string;
}

export interface SummaryField {
  label: string;
  value: string;
}

export interface SummaryDeviation {
  /** The digit after "Rule", or null. */
  rule: number | null;
  /** The text after the digit up to "]", a leading dash removed. */
  type: string;
  title: string;
  found: string | null;
  issue: string | null;
  fix: string | null;
  files: string | null;
  commit: string | null;
  /** Every other `**Label:** value` field in order. */
  others: SummaryField[];
  /** The item's prose when it has no Issue / Fix field. */
  text: string | null;
}

export interface SummarySubsection {
  title: string;
  blocks: Block[];
}

export interface SummaryDeviations {
  none: boolean;
  /** The "None —" paragraph with its leading "None" removed. */
  note: string | null;
  items: SummaryDeviation[];
  /** Prose of a section that is neither none nor rule-tagged. */
  prose: Block[];
  /** `###` subsections other than the auto-fixed list. */
  extras: SummarySubsection[];
}

export interface SummaryOtherSection {
  title: string;
  blocks: Block[];
  none: boolean;
}

export interface SummarySection {
  heading: string;
  /** True for the sections the run consumes itself. */
  claimed: boolean;
}

export interface SummaryPerformance {
  started: string | null;
  completed: string | null;
  duration: string | null;
}

export interface SummaryRunBody {
  /** The `#` line as written, or null. */
  h1: string | null;
  oneLiner: string | null;
  /** `**Key:** value` lines between the H1 and the first `##`. */
  preamble: SummaryFact[];
  performance: SummaryPerformance;
  accomplishments: SummaryAccomplishment[];
  tasks: SummaryTask[];
  taskSource: SummaryTaskSource | null;
  fileNotes: SummaryFileNote[];
  /** Decisions Made as blocks, unless it is none or points at the frontmatter. */
  decisionsBody: Block[] | null;
  /** null when the document has no Deviations section. */
  deviations: SummaryDeviations | null;
  userSetup: Block[] | null;
  next: string | null;
  /** 'passed' / 'failed' / the heading text after "Self-Check:" / null. */
  selfCheck: string | null;
  others: SummaryOtherSection[];
  sections: SummarySection[];
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const MAX_ITEMS = 500;
const MAX_ITEM_TEXT = 6000;
const MAX_ONE_LINER = 700;
const MAX_FRONTMATTER_LINES = 3000;
const MAX_LABEL = 100;

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------

function emptyPerformance(): SummaryPerformance {
  return { started: null, completed: null, duration: null };
}

function emptyBody(): SummaryRunBody {
  return {
    h1: null,
    oneLiner: null,
    preamble: [],
    performance: emptyPerformance(),
    accomplishments: [],
    tasks: [],
    taskSource: null,
    fileNotes: [],
    decisionsBody: null,
    deviations: null,
    userSetup: null,
    next: null,
    selfCheck: null,
    others: [],
    sections: [],
  };
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isHex(text: string, min: number, max: number): boolean {
  if (text.length < min || text.length > max) return false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f'))) return false;
  }
  return true;
}

/** The heading with markup removed, lower-cased — what the known-section checks match. */
function normalizeTitle(heading: string): string {
  return heading.replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Drops a leading `- ` / `* ` / `N. ` list marker. */
function stripMarker(line: string): string {
  const t = line.trimStart();
  if (t.length >= 2 && (t[0] === '-' || t[0] === '*') && (t[1] === ' ' || t[1] === '\t')) return t.slice(2).trimStart();
  let i = 0;
  while (i < t.length && i < 4 && isDigit(t[i])) i += 1;
  if (i > 0 && i < t.length - 1 && (t[i] === '.' || t[i] === ')') && (t[i + 1] === ' ' || t[i + 1] === '\t')) {
    return t.slice(i + 2).trimStart();
  }
  return t;
}

function isListLine(line: string): boolean {
  return stripMarker(line).length !== line.trimStart().length;
}

function indentOf(line: string): number {
  let i = 0;
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i += 1;
  return i;
}

/** `None` / `N/A` / "no external service" — an empty-by-statement section body. */
export function isNoneText(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return true;
  if (lines.length > 3) return false;
  let t = stripMarker(lines[0]).replace(/^[*_\s]+/, '').toLowerCase();
  if (t.startsWith('n/a')) return true;
  if (t.startsWith('nothing')) return true;
  if (t.startsWith('no external service') || t.startsWith('no user setup')) return true;
  if (!t.startsWith('none')) return false;
  t = t.slice(4);
  const next = t[0];
  return next === undefined || !((next >= 'a' && next <= 'z') || isDigit(next));
}

/** `**Label:** value` / `**Label**: value`, an optional list marker first. */
function labelValue(line: string): SummaryField | null {
  const t = stripMarker(line);
  if (!t.startsWith('**')) return null;
  const close = t.indexOf('**', 2);
  if (close === -1 || close > MAX_LABEL + 2) return null;
  let label = t.slice(2, close).trim();
  let value = t.slice(close + 2);
  if (label.endsWith(':')) {
    label = label.slice(0, -1).trim();
  } else if (value.startsWith(':')) {
    value = value.slice(1);
  } else {
    return null;
  }
  if (label === '') return null;
  return { label, value: value.trim() };
}

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function capFirst(text: string): string {
  return text === '' ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** Skips a leading `---` ... `---` frontmatter block (a malformed one comes through the handler
 * with the block still in the body). */
function stripFrontmatter(body: string): string {
  let i = 0;
  while (i < body.length && (body[i] === '\n' || body[i] === '\r' || body[i] === ' ' || body[i] === '\t')) i += 1;
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

/** A trailing `---` followed only by italic footer lines (`*Phase: ...*`) is dropped. */
function stripFooter(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0) {
    const t = lines[end - 1].trim();
    if (t === '' || (t.length < 240 && t.length > 2 && t[0] === '*' && t[t.length - 1] === '*' && t[1] !== '*')) {
      end -= 1;
      continue;
    }
    break;
  }
  if (end > 0 && lines[end - 1].trim() === '---') return lines.slice(0, end - 1);
  return lines;
}

/** `###` sub-headings inside a section become bold lines so the block parser keeps them. */
function liftSubheadings(body: string): string {
  const lines = body.split('\n');
  let touched = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 4 && line[0] === '#' && line[1] === '#' && line[2] === '#') {
      let level = 0;
      while (level < line.length && line[level] === '#') level += 1;
      if (level <= 6 && (line[level] === ' ' || line[level] === '\t')) {
        lines[i] = `\n**${line.slice(level).trim()}**\n`;
        touched = true;
      }
    }
  }
  return touched ? lines.join('\n') : body;
}

function blocksOf(body: string): Block[] {
  return parseBlocks(liftSubheadings(body));
}

/** The first paragraph of `body` (consecutive non-blank lines joined by a space). */
function firstParagraph(body: string): string {
  const out: string[] = [];
  for (const line of body.split('\n')) {
    if (line.trim() === '') {
      if (out.length > 0) break;
      continue;
    }
    out.push(line.trim());
  }
  return out.join(' ');
}

// ---------------------------------------------------------------------------
// List items — top-level lines start an item, deeper and plain lines continue it
// ---------------------------------------------------------------------------

function listItems(body: string): string[] {
  const items: string[] = [];
  let baseIndent = -1;
  let inFence = false;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (inFence || trimmed === '') continue;
    if (trimmed.startsWith('|')) continue;
    if (isListLine(line)) {
      const indent = indentOf(line);
      if (baseIndent === -1) baseIndent = indent;
      if (indent <= baseIndent) {
        if (items.length >= MAX_ITEMS) break;
        items.push(stripMarker(line));
        continue;
      }
    }
    if (items.length > 0) {
      const last = items.length - 1;
      if (items[last].length < MAX_ITEM_TEXT) items[last] = `${items[last]} ${trimmed}`;
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Accomplishments — the headline split
// ---------------------------------------------------------------------------

/** The sketch's headline rule: a strong break (` — `, ` – `, `: `, `; `, `. ` not after a digit) at
 * 20-140 characters, else a comma at 40-170, outside backticks and parentheses. */
export function splitHeadline(text: string): SummaryAccomplishment {
  let strong = -1;
  let strongLen = 0;
  let weak = -1;
  let inCode = false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '`') {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth > 0) continue;
    if (ch === ' ' && (text[i + 1] === '—' || text[i + 1] === '–') && text[i + 2] === ' ') {
      if (strong === -1 && i >= 20 && i <= 140) {
        strong = i;
        strongLen = 3;
      }
    } else if ((ch === ':' || ch === ';' || ch === '.') && text[i + 1] === ' ' && !isDigit(text[i - 1])) {
      if (strong === -1 && i >= 20 && i <= 140) {
        strong = i;
        strongLen = 2;
      }
    } else if (ch === ',' && text[i + 1] === ' ') {
      if (weak === -1 && i >= 40 && i <= 170) weak = i;
    }
    if (strong !== -1) break;
  }
  const at = strong !== -1 ? strong : weak;
  const len = strong !== -1 ? strongLen : 2;
  if (at === -1) return { head: text.trim(), rest: '' };
  return { head: text.slice(0, at).trim(), rest: capFirst(text.slice(at + len).trim()) };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/** The words of the parenthetical right after `from` ("(feat, tracer, tdd)"). */
function parenWords(text: string, from: number): string[] {
  let p = from;
  while (p < text.length && p < from + 3 && text[p] === ' ') p += 1;
  if (text[p] !== '(') return [];
  const close = text.indexOf(')', p + 1);
  if (close === -1 || close - p > 120) return [];
  return text
    .slice(p + 1, close)
    .split(',')
    .map((w) => w.trim())
    .filter((w) => w !== '')
    .slice(0, 8);
}

interface HashHit {
  hash: string;
  /** The text of the parenthetical after the hash. */
  words: string[];
}

/** Backticked hex tokens of 7-40 characters, with the parenthetical that follows each. */
function hashHits(text: string): HashHit[] {
  const hits: HashHit[] = [];
  let i = 0;
  while (hits.length < 40) {
    const open = text.indexOf('`', i);
    if (open === -1) break;
    const close = text.indexOf('`', open + 1);
    if (close === -1) break;
    const span = text.slice(open + 1, close).trim();
    if (isHex(span, 7, 40)) hits.push({ hash: span, words: parenWords(text, close + 1) });
    i = close + 1;
  }
  return hits;
}

/** The leading bold run of `text` ("**Task 1: Name**"), or null. */
function boldRun(text: string): { inner: string; after: number } | null {
  if (!text.startsWith('**')) return null;
  const close = text.indexOf('**', 2);
  if (close === -1 || close > 400) return null;
  return { inner: text.slice(2, close).trim(), after: close + 2 };
}

function trimSeparators(text: string): string {
  let start = 0;
  let end = text.length;
  const isSep = (ch: string): boolean => ch === ' ' || ch === ':' || ch === '.' || ch === '-' || ch === '—' || ch === '–' || ch === '\t';
  while (start < end && isSep(text[start])) start += 1;
  while (end > start && isSep(text[end - 1])) end -= 1;
  return text.slice(start, end);
}

/** "Task 3: Name" -> { n: 3, name: 'Name' }; anything else -> { n: null, name: text }. */
function taskLabel(text: string): { n: number | null; name: string | null } {
  const lower = text.toLowerCase();
  if (lower.startsWith('task') && (text[4] === ' ' || text[4] === '\t')) {
    let i = 5;
    while (i < text.length && text[i] === ' ') i += 1;
    const digitsStart = i;
    while (i < text.length && i < digitsStart + 4 && isDigit(text[i])) i += 1;
    if (i > digitsStart) {
      const name = trimSeparators(text.slice(i));
      return { n: Number(text.slice(digitsStart, i)), name: name === '' ? null : name };
    }
  }
  const name = trimSeparators(text);
  return { n: null, name: name === '' ? null : name };
}

function tasksFromList(items: string[]): SummaryTask[] {
  const tasks: SummaryTask[] = [];
  for (const item of items) {
    const hits = hashHits(item);
    if (hits.length === 0) continue;
    const bold = boldRun(item);
    if (bold !== null && bold.inner.toLowerCase().startsWith('plan metadata')) continue;
    const firstTick = item.indexOf('`');
    const label = bold !== null ? taskLabel(bold.inner) : taskLabel(firstTick === -1 ? item : item.slice(0, firstTick));
    const n = label.n;
    const name = label.name;
    const kinds: string[] = [];
    for (const hit of hits) for (const word of hit.words) if (!kinds.includes(word)) kinds.push(word);
    tasks.push({ n: n ?? tasks.length + 1, name, hashes: hits.map((h) => h.hash), kinds });
    if (tasks.length >= MAX_ITEMS) break;
  }
  return tasks;
}

function cellsOf(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  const cells = cellsOf(line);
  if (cells.length === 0) return false;
  for (const cell of cells) {
    if (cell.length < 2) return false;
    for (let i = 0; i < cell.length; i++) {
      const ch = cell[i];
      if (ch !== '-' && ch !== ':' && ch !== ' ') return false;
    }
    if (cell.indexOf('-') === -1) return false;
  }
  return true;
}

function hashesInCell(cell: string): string[] {
  const out: string[] = [];
  let token = '';
  const flush = (): void => {
    if (isHex(token, 4, 40)) out.push(token);
    token = '';
  };
  for (let i = 0; i < cell.length && out.length < 12; i++) {
    const ch = cell[i];
    if (ch === ' ' || ch === ',' || ch === '`' || ch === ';' || ch === '/' || ch === '(' || ch === ')') flush();
    else token += ch;
  }
  flush();
  return out;
}

function isNumberCell(cell: string): boolean {
  const t = cell.toLowerCase().replace('task', '').trim();
  if (t === '' || t.length > 4) return false;
  for (let i = 0; i < t.length; i++) if (!isDigit(t[i])) return false;
  return true;
}

function tasksFromTable(body: string): SummaryTask[] {
  const lines = body.split('\n');
  const tasks: SummaryTask[] = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].trim().startsWith('|') || !isSeparatorRow(lines[i + 1])) continue;
    const headers = cellsOf(lines[i]).map((h) => h.replace(/[*`]/g, '').trim().toLowerCase());
    const commitCol = headers.findIndex((h) => h.startsWith('commit') || h === 'hash' || h === 'sha');
    if (commitCol === -1) continue;
    const nameCols = headers
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => h === 'name' || h === 'task' || h === 'what' || h === 'description' || h === 'title');
    for (let r = i + 2; r < lines.length && lines[r].trim().startsWith('|'); r++) {
      const cells = cellsOf(lines[r]);
      const hashes = hashesInCell(cells[commitCol] ?? '');
      if (hashes.length === 0) continue;
      let n: number | null = null;
      let name: string | null = null;
      for (const { idx } of nameCols) {
        const cell = cells[idx] ?? '';
        if (isNumberCell(cell)) {
          if (n === null) n = Number(cell.toLowerCase().replace('task', '').trim());
        } else if (name === null && cell !== '') {
          name = taskLabel(cell.replace(/\*\*/g, '')).name;
        }
      }
      if (n === null && (headers[0] === '#' || headers[0] === 'n') && isNumberCell(cells[0] ?? '')) n = Number(cells[0]);
      tasks.push({ n: n ?? tasks.length + 1, name, hashes, kinds: [] });
      if (tasks.length >= MAX_ITEMS) break;
    }
    if (tasks.length > 0) break;
  }
  return tasks;
}

/** A preamble `**Commits:** `abc1234` (Task 1), `def5678` (Task 2)` line. */
function tasksFromFact(value: string): SummaryTask[] {
  const tasks: SummaryTask[] = [];
  let i = 0;
  while (tasks.length < 40) {
    const open = value.indexOf('`', i);
    if (open === -1) break;
    const close = value.indexOf('`', open + 1);
    if (close === -1) break;
    const span = value.slice(open + 1, close).trim();
    if (isHex(span, 7, 40)) {
      const words = parenWords(value, close + 1);
      let n: number | null = null;
      if (words.length > 0) n = taskLabel(words[0]).n;
      tasks.push({ n: n ?? tasks.length + 1, name: null, hashes: [span], kinds: [] });
    }
    i = close + 1;
  }
  return tasks;
}

// ---------------------------------------------------------------------------
// Files, performance
// ---------------------------------------------------------------------------

function fileNotesOf(body: string): SummaryFileNote[] {
  const notes: SummaryFileNote[] = [];
  for (const item of listItems(body)) {
    if (!item.startsWith('`')) continue;
    const paths: string[] = [];
    let p = 0;
    for (let guard = 0; guard < 12; guard++) {
      if (item[p] !== '`') break;
      const close = item.indexOf('`', p + 1);
      if (close === -1) break;
      paths.push(item.slice(p + 1, close));
      p = close + 1;
      while (p < item.length && (item[p] === ',' || item[p] === ' ')) p += 1;
    }
    if (paths.length === 0) continue;
    const tail = item.slice(p).trimStart();
    if (!(tail.startsWith('\u2014') || tail.startsWith('\u2013') || tail.startsWith('-'))) continue;
    const note = tail.slice(1).trim();
    if (note === '') continue;
    for (const path of paths) notes.push({ path, note });
    if (notes.length >= MAX_ITEMS) break;
  }
  return notes;
}

function performanceOf(body: string): SummaryPerformance {
  const out = emptyPerformance();
  for (const line of body.split('\n')) {
    const fact = labelValue(line);
    if (fact === null) continue;
    const key = fact.label.toLowerCase();
    if (key === 'started' && out.started === null) out.started = fact.value;
    else if (key === 'completed' && out.completed === null) out.completed = fact.value;
    else if (key === 'duration' && out.duration === null) out.duration = fact.value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Deviations
// ---------------------------------------------------------------------------

interface DeviationStart {
  rule: number | null;
  type: string;
  title: string;
  /** Prose after the bold title on the same line. */
  rest: string;
}

/** An item opens on a line whose start, after an optional `- `, `N. `, `**` and `N. `, is `[Rule`. */
function deviationStart(line: string): DeviationStart | null {
  let t = stripMarker(line);
  let bold = false;
  if (t.startsWith('**')) {
    bold = true;
    t = t.slice(2).trimStart();
  }
  let i = 0;
  while (i < t.length && i < 4 && isDigit(t[i])) i += 1;
  if (i > 0 && t[i] === '.' && t[i + 1] === ' ') t = t.slice(i + 2).trimStart();
  if (t.length < 6 || t.slice(0, 5).toLowerCase() !== '[rule') return null;
  const close = t.indexOf(']', 5);
  if (close === -1 || close > 140) return null;
  const inner = t.slice(5, close);
  let p = 0;
  while (p < inner.length && inner[p] === ' ') p += 1;
  const digitsStart = p;
  while (p < inner.length && isDigit(inner[p])) p += 1;
  const rule = p > digitsStart && p - digitsStart <= 2 ? Number(inner.slice(digitsStart, p)) : null;
  const type = trimSeparators(inner.slice(p));
  const after = t.slice(close + 1);
  let title: string;
  let rest = '';
  if (bold) {
    const end = after.indexOf('**');
    title = end === -1 ? after : after.slice(0, end);
    rest = end === -1 ? '' : after.slice(end + 2);
  } else {
    title = after;
  }
  title = title.trim();
  while (title.endsWith('.') || title.endsWith(':')) title = title.slice(0, -1).trimEnd();
  return { rule, type, title, rest: rest.trim() };
}

function deviationItems(body: string): SummaryDeviation[] {
  const lines = body.split('\n');
  const items: SummaryDeviation[] = [];
  let i = 0;
  let inFence = false;
  while (i < lines.length && items.length < MAX_ITEMS) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      i += 1;
      continue;
    }
    const start = inFence ? null : deviationStart(line);
    if (start === null) {
      i += 1;
      continue;
    }
    // Collect this item's lines.
    const chunk: string[] = [];
    let j = i + 1;
    let blank = false;
    while (j < lines.length) {
      const next = lines[j];
      const trimmed = next.trim();
      if (trimmed === '') {
        blank = true;
        j += 1;
        continue;
      }
      if (trimmed.startsWith('###') || deviationStart(next) !== null) break;
      if (blank && !isListLine(next) && indentOf(next) === 0) break;
      blank = false;
      chunk.push(next);
      j += 1;
    }
    items.push(buildDeviation(start, chunk));
    i = j;
  }
  return items;
}

function buildDeviation(start: DeviationStart, chunk: string[]): SummaryDeviation {
  const dev: SummaryDeviation = {
    rule: start.rule,
    type: start.type,
    title: start.title,
    found: null,
    issue: null,
    fix: null,
    files: null,
    commit: null,
    others: [],
    text: null,
  };
  const prose: string[] = start.rest === '' ? [] : [start.rest];
  let current: SummaryField | null = null;
  const flush = (): void => {
    if (current === null) return;
    const value = squash(current.value);
    const key = current.label.toLowerCase();
    if (key === 'found during' || key === 'found') dev.found = value;
    else if (key === 'issue' || key === 'problem') dev.issue = value;
    else if (key === 'fix') dev.fix = value;
    else if (key === 'files modified' || key === 'files') dev.files = value.replace(/`/g, '');
    else if (key === 'commit' || key === 'committed in' || key === 'commits') dev.commit = value.replace(/`/g, '');
    else dev.others.push({ label: current.label, value });
    current = null;
  };
  for (const line of chunk) {
    const field = labelValue(line);
    if (field !== null) {
      flush();
      current = field;
      continue;
    }
    const t = line.trim();
    if (current !== null) {
      if (current.value.length < MAX_ITEM_TEXT) current = { label: current.label, value: `${current.value} ${stripMarker(t)}` };
    } else if (prose.join(' ').length < MAX_ITEM_TEXT) {
      prose.push(stripMarker(t));
    }
  }
  flush();
  const text = squash(prose.join(' '));
  dev.text = dev.issue === null && dev.fix === null && text !== '' ? text : null;
  return dev;
}

function isAutoFixedTitle(title: string): boolean {
  const t = normalizeTitle(title);
  return t.startsWith('auto-fix') || t.startsWith('auto fix');
}

function deviationsOf(body: string): SummaryDeviations {
  const items = deviationItems(body);
  const split = splitWithPreamble(body, 3);
  const extras: SummarySubsection[] = [];
  for (const section of split.sections) {
    if (isAutoFixedTitle(section.heading)) continue;
    if (extras.length >= 40) break;
    extras.push({ title: section.heading.replace(/[*`]/g, '').trim(), blocks: blocksOf(section.body) });
  }
  const lead = split.preamble;
  const none = items.length === 0 && isNoneText(firstParagraph(lead));
  let note: string | null = null;
  if (none) {
    const para = squash(firstParagraph(lead));
    let t = para.replace(/^[*_\s]+/, '');
    t = t.replace(/^(none|n\/a)[*_\s]*/i, '');
    t = t.replace(/^[—–.:-]+\s*/, '');
    note = t === '' ? null : t;
  }
  const prose = !none && items.length === 0 ? blocksOf(lead) : [];
  return { none, note, items, prose, extras };
}

// ---------------------------------------------------------------------------
// Preamble — H1, one-liner, `**Key:** value` facts
// ---------------------------------------------------------------------------

function preambleOf(preamble: string): { h1: string | null; oneLiner: string | null; facts: SummaryFact[] } {
  const lines = preamble.split('\n');
  let h1: string | null = null;
  let start = 0;
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('```') || t.startsWith('~~~')) fence = !fence;
    if (fence) continue;
    if (t.startsWith('# ')) {
      h1 = t.slice(2).trim();
      start = i + 1;
      break;
    }
  }
  const facts: SummaryFact[] = [];
  let oneLiner: string | null = null;
  let para: string[] = [];
  const closeParagraph = (): void => {
    if (para.length === 0) return;
    const group = para;
    para = [];
    const parsed = group.map((l) => labelValue(l));
    if (parsed.every((p) => p !== null)) {
      for (const p of parsed) if (p !== null && facts.length < 40) facts.push({ key: p.label, value: p.value });
      return;
    }
    if (oneLiner !== null) return;
    const first = group[0].trim();
    if (first.startsWith('>') || first.startsWith('|') || first.startsWith('```') || first.startsWith('---') || first.startsWith('#') || isListLine(first)) return;
    let text = squash(group.join(' '));
    if (text.length >= MAX_ONE_LINER) return;
    if (text.length > 4 && text.startsWith('**') && text.endsWith('**') && text.indexOf('**', 2) === text.length - 2) {
      text = text.slice(2, -2).trim();
    }
    oneLiner = text === '' ? null : text;
  };
  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim() === '') closeParagraph();
    else para.push(lines[i]);
  }
  closeParagraph();
  return { h1, oneLiner, facts };
}

// ---------------------------------------------------------------------------
// Known sections
// ---------------------------------------------------------------------------

const TASK_TITLES = new Set(['task commits', 'commits', 'tasks', 'tasks completed', 'tasks and commits']);

type SectionRole =
  | 'performance'
  | 'accomplishments'
  | 'tasks'
  | 'files'
  | 'decisions'
  | 'deviations'
  | 'setup'
  | 'next'
  | 'selfcheck'
  | null;

function roleOf(heading: string): SectionRole {
  const t = normalizeTitle(heading);
  if (t === 'performance') return 'performance';
  if (t.startsWith('accomplishments')) return 'accomplishments';
  if (TASK_TITLES.has(t)) return 'tasks';
  if (t === 'files created/modified' || t === 'files created / modified') return 'files';
  if (t === 'decisions made') return 'decisions';
  if (t === 'deviations from plan' || t === 'deviations') return 'deviations';
  if (t === 'user setup required') return 'setup';
  if (t === 'next phase readiness') return 'next';
  if (t.startsWith('self-check') || t.startsWith('self check')) return 'selfcheck';
  return null;
}

function selfCheckOf(heading: string): string | null {
  const text = heading.replace(/[*`]/g, '').trim();
  const colon = text.indexOf(':');
  const tail = (colon === -1 ? text.slice(10) : text.slice(colon + 1)).trim();
  const lower = tail.toLowerCase();
  if (lower.startsWith('pass')) return 'passed';
  if (lower.startsWith('fail')) return 'failed';
  return tail === '' ? null : tail;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Projects a SUMMARY body. Pure and non-throwing on any string. */
export function extractSummaryRun(rawBody: string): SummaryRunBody {
  const out = emptyBody();
  if (typeof rawBody !== 'string' || rawBody === '') return out;
  const { preamble, sections } = splitWithPreamble(stripFrontmatter(rawBody), 2);
  // The footer rule and italic stamp ride the last section; drop them from it.
  if (sections.length > 0) {
    const last = sections[sections.length - 1];
    last.body = stripFooter(last.body.split('\n')).join('\n');
  }
  const head = preambleOf(preamble);
  out.h1 = head.h1;
  out.oneLiner = head.oneLiner;
  out.preamble = head.facts;

  let taskSection: string | null = null;
  for (const section of sections) {
    const role = roleOf(section.heading);
    out.sections.push({ heading: section.heading.replace(/[*`]/g, '').trim(), claimed: role !== null });
    if (role === 'tasks' && taskSection !== null) {
      // A second task-shaped section is kept as an ordinary section.
      out.sections[out.sections.length - 1].claimed = false;
    }
    if (role === null || (role === 'tasks' && taskSection !== null)) {
      const none = isNoneText(section.body);
      out.others.push({
        title: section.heading.replace(/[*`]/g, '').trim(),
        blocks: none ? [] : blocksOf(section.body),
        none,
      });
      continue;
    }
    switch (role) {
      case 'performance':
        out.performance = performanceOf(section.body);
        break;
      case 'accomplishments':
        for (const item of listItems(section.body)) out.accomplishments.push(splitHeadline(item));
        break;
      case 'tasks':
        if (taskSection === null) taskSection = section.body;
        break;
      case 'files':
        out.fileNotes = fileNotesOf(section.body);
        break;
      case 'decisions': {
        const text = section.body.trim();
        const lower = text.toLowerCase().replace(/[*`_]/g, '');
        if (!isNoneText(text) && !lower.startsWith('see key-decisions')) out.decisionsBody = blocksOf(text);
        break;
      }
      case 'deviations':
        out.deviations = deviationsOf(section.body);
        break;
      case 'setup':
        out.userSetup = isNoneText(section.body) ? null : blocksOf(section.body);
        break;
      case 'next': {
        const para = squash(firstParagraph(section.body));
        out.next = para === '' || isNoneText(para) ? null : para;
        break;
      }
      case 'selfcheck':
        if (out.selfCheck === null) out.selfCheck = selfCheckOf(section.heading);
        break;
      default:
        break;
    }
  }

  if (taskSection !== null) {
    const listed = tasksFromList(listItems(taskSection));
    if (listed.length > 0) {
      out.tasks = listed;
      out.taskSource = 'list';
    } else {
      const table = tasksFromTable(taskSection);
      if (table.length > 0) {
        out.tasks = table;
        out.taskSource = 'table';
      }
    }
  }
  if (out.tasks.length === 0) {
    for (const fact of out.preamble) {
      const key = fact.key.toLowerCase();
      if (key === 'commits' || key === 'commit' || key === 'task commits') {
        const tasks = tasksFromFact(fact.value);
        if (tasks.length > 0) {
          out.tasks = tasks;
          out.taskSource = 'preamble';
          break;
        }
      }
    }
  }
  return out;
}
