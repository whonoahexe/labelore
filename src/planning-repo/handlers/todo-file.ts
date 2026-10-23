// The todo file projection (quick-261023-61k, sketch 027 C: the lifecycle): a tolerant, fence-aware,
// line-scanned read of one GSD todo (`.planning/todos/{pending,completed,done}/<anything>.md`) into
// `TodoFileBody`: the status taken from the folder, the dates, the written weight, the files split into
// path and line range, the lead (Problem, Goal, or a prose todo's first paragraph), the plan (Solution,
// Acceptance Criteria, or a checklist) with its done count, every other section in order, the closing
// (the Resolution section, or a leading Closed / Done / Resolved callout) with its quick task, commits
// and closed-on day, and the note references the shared todo-note relation resolves.
// GSD writes todos in three shapes - add-todo (Problem / Solution / Resolution), note promotion (Goal /
// Context / Acceptance Criteria) and hand-written prose with checklists and a closing callout - so the
// body is read line by line, never as a strict schema.
// It ports the sketch's `gen-data.mjs` parse (`sections`, `buildTodo`, `notesOfTodo`) and the `model()`
// function of its `index.html` (the regexes there are reference only) with one correction: when a
// Problem or Goal section exists and the preamble still holds prose, that prose becomes a "Details"
// extra instead of being dropped, so nothing in the file is lost.
// T-61k-02: every line is clipped to MAX_LINE up front; fences are tracked so nothing inside one is read
// as a heading, a reference or a checklist; every per-line pattern runs on a clipped line and none nests
// an unbounded quantifier; file ranges, quick ids, commit words, dates and note references are character
// scans, never a global pattern over a whole body; every list, section and text is capped.
// `extractTodoFile` is pure (no fs access) and never throws on a string; `TodoHandler.parse` still wraps
// it in try/catch (T-61k-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type TodoBlock =
  | Block
  | { kind: 'heading'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'checklist'; items: { done: boolean; text: string }[] };

export type TodoStatus = 'pending' | 'done' | 'unfiled';
export type TodoLevel = 'high' | 'medium' | 'low' | 'unrated';

export interface TodoFileRef {
  /** The entry as written. */
  raw: string;
  /** The directory part with its trailing slash, or ''. */
  dir: string;
  name: string;
  from: number | null;
  to: number | null;
}

export interface TodoSection {
  /** The H2 heading as written, or "Details" for leftover prose. */
  heading: string;
  blocks: TodoBlock[];
  /** The heading as written in the file, or null for the synthesised Details part. */
  sourceHeading: string | null;
}

export interface TodoLead {
  /** "Problem" / "Goal" as written, or null for a prose todo's first paragraph. */
  heading: string | null;
  blocks: TodoBlock[];
}

export interface TodoPlan {
  kind: 'solution' | 'acceptance' | 'checklist';
  /** The heading as written, or null for a checklist taken from prose. */
  heading: string | null;
  blocks: TodoBlock[];
  /** The `- [ ]` / `- [x]` lines of the plan, or null when it has none. */
  checks: { done: number; total: number } | null;
}

export interface TodoClosing {
  from: 'resolution' | 'callout';
  blocks: TodoBlock[];
  /** The closing text as written, at most MAX_TEXT characters. */
  text: string;
}

export interface TodoNoteRefs {
  /** `.planning/notes/…md` paths from the frontmatter `notes:`. */
  listed: string[];
  /** `[[slug]]` slugs, in document order. */
  wiki: string[];
  /** `.planning/notes/<name>.md` paths mentioned in the text, in document order. */
  mentioned: string[];
  /** The Goal text when `source` says the todo was promoted from /gsd-note, else null. */
  promotedText: string | null;
}

export interface TodoFileBody {
  status: TodoStatus;
  /** The folder under `todos/` the file sits in (pending, completed, done, …), or null. */
  folder: string | null;
  created: string | null;
  completed: string | null;
  severity: string | null;
  priority: string | null;
  area: string | null;
  theme: string | null;
  order: string | null;
  source: string | null;
  completedBy: string | null;
  /** The three-level reading of the severity, else the priority (the dashboard's own table). */
  level: TodoLevel;
  files: TodoFileRef[];
  lead: TodoLead | null;
  plan: TodoPlan | null;
  extras: TodoSection[];
  closing: TodoClosing | null;
  /** "261022-m25", from "quick task 261022-m25" in the resolution, completed_by or callout. */
  quickTask: string | null;
  commits: string[];
  /** "2026-10-22", from `completed`, else the quick task id, else the first date in the closing text. */
  closedOn: string | null;
  noteRefs: TodoNoteRefs;
}

// ---------------------------------------------------------------------------
// Caps
// ---------------------------------------------------------------------------

const MAX_LINE = 8000;
const MAX_TEXT = 8000;
const MAX_PROMOTED = 20000;
const MAX_FILES = 400;
const MAX_REFS = 100;
const MAX_SECTIONS = 80;
const MAX_BLOCKS = 400;
const MAX_COMMITS = 100;

// ---------------------------------------------------------------------------
// Small readers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

/**
 * A frontmatter value as the text it was written as: a Date becomes its ISO string, or `YYYY-MM-DD` when
 * it is exactly 00:00:00.000 UTC (an unquoted YAML date has no time); a non-empty string is trimmed and
 * kept as written; a finite number becomes its string; anything else is null. Never throws.
 */
export function stampText(value: unknown): string | null {
  if (value instanceof Date) {
    const time = value.getTime();
    if (!Number.isFinite(time)) return null;
    const iso = value.toISOString();
    return iso.slice(11) === '00:00:00.000Z' ? iso.slice(0, 10) : iso;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : clip(trimmed, MAX_TEXT);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

// The same words as the dashboard ledger's exported `severityOf` (src/server/dashboard-ledger.ts); the
// planning-repo layer must not import from src/server, so a unit test checks the two tables agree.
const HIGH_WORDS = new Set(['blocker', 'critical', 'major', 'high', 'p0', 'p1']);
const MEDIUM_WORDS = new Set(['medium', 'moderate', 'normal', 'p2']);
const LOW_WORDS = new Set(['minor', 'low', 'cosmetic', 'trivial', 'p3', 'p4']);

export function levelOf(weight: string | null): TodoLevel {
  const word = (weight ?? '').toLowerCase();
  if (HIGH_WORDS.has(word)) return 'high';
  if (MEDIUM_WORDS.has(word)) return 'medium';
  if (LOW_WORDS.has(word)) return 'low';
  return 'unrated';
}

function digitAt(text: string, index: number): boolean {
  const code = text.charCodeAt(index);
  return code >= 48 && code <= 57;
}

function isWordCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95;
}

function isSpace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/** "src/a.ts:88-140" -> path, from 88, to 140. A character scan from the right, no pattern. */
function splitFile(entry: string): TodoFileRef {
  let end = entry.length;
  let from: number | null = null;
  let to: number | null = null;
  let i = end;
  while (i > 0 && end - i < 9 && digitAt(entry, i - 1)) i -= 1;
  if (i < end && i > 0) {
    const last = Number(entry.slice(i, end));
    if (entry[i - 1] === ':') {
      from = last;
      to = last;
      end = i - 1;
    } else if (entry[i - 1] === '-') {
      let j = i - 1;
      const dashAt = j;
      while (j > 0 && dashAt - j < 9 && digitAt(entry, j - 1)) j -= 1;
      if (j < dashAt && j > 0 && entry[j - 1] === ':') {
        from = Number(entry.slice(j, dashAt));
        to = last;
        end = j - 1;
      }
    }
  }
  const path = entry.slice(0, end);
  const slash = path.lastIndexOf('/');
  const dir = slash >= 0 ? path.slice(0, slash + 1) : '';
  const name = path.slice(slash + 1);
  if (name === '') return { raw: entry, dir: '', name: path === '' ? entry : path, from, to };
  return { raw: entry, dir, name, from, to };
}

function filesOf(value: unknown): TodoFileRef[] {
  const entries: unknown[] = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const files: TodoFileRef[] = [];
  for (const entry of entries) {
    if (files.length >= MAX_FILES) break;
    if (typeof entry !== 'string') continue;
    const trimmed = clip(entry.trim(), MAX_LINE);
    if (trimmed === '') continue;
    files.push(splitFile(trimmed));
  }
  return files;
}

// ---------------------------------------------------------------------------
// Lines, fences, sections
// ---------------------------------------------------------------------------

function isFenceLine(trimmed: string): boolean {
  return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

function isH2(line: string): boolean {
  return line.startsWith('##') && line.length > 2 && (line[2] === ' ' || line[2] === '\t');
}

function isH1(line: string): boolean {
  return line.startsWith('#') && line.length > 1 && (line[1] === ' ' || line[1] === '\t');
}

/** A markdown heading line of any level: 1-6 hashes then whitespace. */
function headingText(trimmed: string): string | null {
  let n = 0;
  while (n < trimmed.length && trimmed[n] === '#') n += 1;
  if (n === 0 || n > 6 || !isSpace(trimmed[n]) || trimmed[n] === '\n') return null;
  let text = trimmed.slice(n).trim();
  while (text.endsWith('#')) text = text.slice(0, -1);
  return text.trim();
}

function isRuleLine(trimmed: string): boolean {
  if (trimmed.length < 3) return false;
  const ch = trimmed[0];
  if (ch !== '-' && ch !== '*' && ch !== '_') return false;
  for (let i = 1; i < trimmed.length; i += 1) if (trimmed[i] !== ch) return false;
  return true;
}

interface RawSection {
  heading: string;
  lines: string[];
}

interface Split {
  preamble: string[];
  sections: RawSection[];
}

function splitSections(lines: string[]): Split {
  const preamble: string[] = [];
  const sections: RawSection[] = [];
  let current: string[] = preamble;
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (isFenceLine(trimmed)) {
      inFence = !inFence;
      current.push(line);
      continue;
    }
    if (!inFence && isH2(line) && sections.length < MAX_SECTIONS) {
      const section: RawSection = { heading: clip(line.slice(2).trim(), MAX_TEXT), lines: [] };
      sections.push(section);
      current = section.lines;
      continue;
    }
    current.push(line);
  }
  return { preamble, sections };
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function checkMark(item: string): { done: boolean; text: string } | null {
  if (item.length < 3 || item[0] !== '[' || item[2] !== ']') return null;
  const mark = item[1];
  if (mark !== ' ' && mark !== 'x' && mark !== 'X') return null;
  if (item.length > 3 && !isSpace(item[3])) return null;
  return { done: mark !== ' ', text: item.slice(3).trim() };
}

function capBlock(block: Block): Block {
  if (block.kind === 'paragraph' || block.kind === 'code') return { ...block, text: clip(block.text, MAX_TEXT) };
  if (block.kind === 'list') return { ...block, items: block.items.map((item) => clip(item, MAX_TEXT)) };
  return {
    kind: 'table',
    rows: block.rows.map((row) => {
      const capped: Record<string, string> = {};
      for (const key of Object.keys(row)) capped[clip(key, 200)] = clip(row[key], MAX_TEXT);
      return capped;
    }),
  };
}

function runBlocks(run: string[], out: TodoBlock[]): void {
  if (run.length === 0) return;
  for (const block of parseBlocks(run.join('\n'))) {
    if (out.length >= MAX_BLOCKS) return;
    if (block.kind === 'list') {
      const marks = block.items.map(checkMark);
      if (block.items.length > 0 && marks.every((mark) => mark !== null)) {
        out.push({ kind: 'checklist', items: marks.map((mark) => ({ done: mark!.done, text: clip(mark!.text, MAX_TEXT) })) });
        continue;
      }
    }
    out.push(capBlock(block));
  }
}

/** Splits lines into runs at fence, heading, quote and rule lines, then reads each plain run. */
function blocksOf(lines: string[]): TodoBlock[] {
  const out: TodoBlock[] = [];
  let run: string[] = [];
  const flush = (): void => {
    runBlocks(run, out);
    run = [];
  };
  let i = 0;
  while (i < lines.length && out.length < MAX_BLOCKS) {
    const line = lines[i];
    const trimmed = line.trim();
    if (isFenceLine(trimmed)) {
      flush();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !isFenceLine(lines[i].trim())) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push({ kind: 'code', text: clip(code.join('\n'), MAX_TEXT) });
      continue;
    }
    const heading = headingText(trimmed);
    if (heading !== null) {
      flush();
      out.push({ kind: 'heading', text: clip(heading, MAX_TEXT) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('>')) {
      flush();
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const inner = lines[i].trim().slice(1);
        const text = (inner.startsWith(' ') ? inner.slice(1) : inner).trim();
        if (text !== '') quoted.push(text);
        i += 1;
      }
      if (quoted.length > 0) out.push({ kind: 'quote', text: clip(quoted.join(' '), MAX_TEXT) });
      continue;
    }
    if (isRuleLine(trimmed)) {
      flush();
      i += 1;
      continue;
    }
    run.push(line);
    i += 1;
  }
  flush();
  return out;
}

/** Blank-line separated chunks of a prose preamble; a fence is kept whole inside its chunk. */
function chunksOf(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (isFenceLine(trimmed)) inFence = !inFence;
    if (!inFence && trimmed === '') {
      if (current.length > 0) chunks.push(current);
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function startsList(trimmed: string): boolean {
  if (trimmed.length > 1 && (trimmed[0] === '-' || trimmed[0] === '*') && isSpace(trimmed[1])) return true;
  let n = 0;
  while (n < trimmed.length && n < 4 && digitAt(trimmed, n)) n += 1;
  return n > 0 && n < 4 && (trimmed[n] === '.' || trimmed[n] === ')') && isSpace(trimmed[n + 1]);
}

function startsChecklist(trimmed: string): boolean {
  if (trimmed.length < 5 || (trimmed[0] !== '-' && trimmed[0] !== '*') || !isSpace(trimmed[1])) return false;
  return checkMark(trimmed.slice(2).trimStart()) !== null;
}

/** A chunk that can be the lead: it opens with plain text, not a list, table, fence, heading or quote. */
function isTextChunk(chunk: string[]): boolean {
  const first = chunk[0].trim();
  return !(startsList(first) || first.startsWith('|') || isFenceLine(first) || first.startsWith('>') || headingText(first) !== null || isRuleLine(first));
}

function countChecks(lines: string[]): { done: number; total: number } | null {
  let done = 0;
  let total = 0;
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (isFenceLine(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !startsChecklist(trimmed)) continue;
    const mark = checkMark(trimmed.slice(2).trimStart());
    total += 1;
    if (mark !== null && mark.done) done += 1;
  }
  return total === 0 ? null : { done, total };
}

function textOfLines(lines: string[]): string {
  return clip(lines.join('\n').trim(), MAX_TEXT);
}

// ---------------------------------------------------------------------------
// Closing facts
// ---------------------------------------------------------------------------

function isAlnumLower(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9'));
}

/** The id after "quick" / "quick task": six digits, a hyphen, three letters or digits. */
function quickIdIn(text: string): string | null {
  const lower = text.toLowerCase();
  let at = lower.indexOf('quick');
  while (at >= 0) {
    let i = at + 5;
    if (lower.startsWith(' task', i)) i += 5;
    const spaceStart = i;
    while (i < lower.length && (lower[i] === ' ' || lower[i] === '\t')) i += 1;
    if (i > spaceStart && i + 10 <= lower.length) {
      let ok = true;
      for (let k = 0; k < 6; k += 1) if (!digitAt(lower, i + k)) ok = false;
      if (ok && lower[i + 6] === '-' && isAlnumLower(lower[i + 7]) && isAlnumLower(lower[i + 8]) && isAlnumLower(lower[i + 9]) && !isAlnumLower(lower[i + 10])) {
        return lower.slice(i, i + 10);
      }
    }
    at = lower.indexOf('quick', at + 5);
  }
  return null;
}

function isLowerHex(word: string): boolean {
  for (let i = 0; i < word.length; i += 1) {
    const ch = word[i];
    if (!((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f'))) return false;
  }
  return true;
}

function commitsIn(text: string): string[] {
  const out: string[] = [];
  let start = -1;
  for (let i = 0; i <= text.length; i += 1) {
    const inWord = i < text.length && isWordCode(text.charCodeAt(i));
    if (inWord && start < 0) start = i;
    if (!inWord && start >= 0) {
      const word = text.slice(start, i);
      start = -1;
      if (word.length >= 7 && word.length <= 40 && isLowerHex(word) && !out.includes(word) && out.length < MAX_COMMITS) out.push(word);
    }
  }
  return out;
}

function datePart(text: string): string | null {
  if (text.length < 10) return null;
  for (let i = 0; i < 10; i += 1) {
    if (i === 4 || i === 7) {
      if (text[i] !== '-') return null;
    } else if (!digitAt(text, i)) return null;
  }
  return text.slice(0, 10);
}

/** The first `20YY-MM-DD` in the text. */
function firstDateIn(text: string): string | null {
  let at = text.indexOf('20');
  while (at >= 0) {
    if (at + 10 <= text.length && (at === 0 || !digitAt(text, at - 1))) {
      const candidate = datePart(text.slice(at, at + 10));
      if (candidate !== null) return candidate;
    }
    at = text.indexOf('20', at + 1);
  }
  return null;
}

function quickDate(id: string | null): string | null {
  if (id === null) return null;
  return `20${id.slice(0, 2)}-${id.slice(2, 4)}-${id.slice(4, 6)}`;
}

// ---------------------------------------------------------------------------
// Note references
// ---------------------------------------------------------------------------

/** `.planning/notes/…md` from a listed entry, or null when it is not a safe note path. */
function listedNote(entry: string): string | null {
  let path = entry.trim();
  if (path.startsWith('./')) path = path.slice(2);
  if (path.startsWith('notes/')) path = `.planning/${path}`;
  if (!path.startsWith('.planning/notes/') || !path.toLowerCase().endsWith('.md')) return null;
  if (path.includes('\\')) return null;
  const segments = path.split('/');
  if (segments.some((segment) => segment === '..' || segment === '' || segment === '.')) return null;
  return path.length > MAX_LINE ? null : path;
}

function listedNotes(value: unknown): string[] {
  const entries: unknown[] = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const out: string[] = [];
  for (const entry of entries) {
    if (out.length >= MAX_REFS) break;
    if (typeof entry !== 'string') continue;
    const path = listedNote(entry);
    if (path !== null && !out.includes(path)) out.push(path);
  }
  return out;
}

function startsToken(text: string, at: number): boolean {
  if (at === 0) return true;
  const ch = text[at - 1];
  return isSpace(ch) || ch === '(' || ch === '[' || ch === '`' || ch === '"' || ch === "'";
}

function isNameCode(code: number): boolean {
  return isWordCode(code) || code === 46 || code === 45;
}

/** The `notes/<name>.md` tokens of one line, normalised to `.planning/notes/<name>.md`. */
function mentionsIn(line: string, out: string[]): void {
  let at = line.indexOf('notes/');
  while (at >= 0 && out.length < MAX_REFS) {
    const prefixed = at >= 10 && line.startsWith('.planning/', at - 10);
    const tokenStart = prefixed ? at - 10 : at;
    if (startsToken(line, tokenStart)) {
      let end = at + 6;
      while (end < line.length && isNameCode(line.charCodeAt(end))) end += 1;
      let name = line.slice(at + 6, end);
      while (name.endsWith('.') && !name.endsWith('.md')) name = name.slice(0, -1);
      if (name.length > 3 && name.endsWith('.md') && name[0] !== '.') {
        const path = `.planning/notes/${name}`;
        if (!out.includes(path)) out.push(path);
      }
    }
    at = line.indexOf('notes/', at + 6);
  }
}

/** The `[[slug]]` links of one line. */
function wikiIn(line: string, out: string[]): void {
  let at = line.indexOf('[[');
  while (at >= 0 && out.length < MAX_REFS) {
    let end = at + 2;
    while (end < line.length && (isWordCode(line.charCodeAt(end)) || line[end] === '-')) end += 1;
    if (end > at + 2 && line.startsWith(']]', end)) {
      const slug = line.slice(at + 2, end);
      if (!out.includes(slug)) out.push(slug);
    }
    at = line.indexOf('[[', at + 2);
  }
}

function noteRefsOf(lines: string[], frontmatter: Record<string, unknown>, goalText: string | null, source: string | null): TodoNoteRefs {
  const wiki: string[] = [];
  const mentioned: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (isFenceLine(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.includes('[[')) wikiIn(line, wiki);
    if (line.includes('notes/')) mentionsIn(line, mentioned);
  }
  const promoted = source !== null && source.toLowerCase().includes('promoted from /gsd-note') && goalText !== null && goalText !== '';
  return {
    listed: listedNotes(frontmatter.notes),
    wiki,
    mentioned,
    promotedText: promoted ? goalText : null,
  };
}

// ---------------------------------------------------------------------------
// The projection
// ---------------------------------------------------------------------------

function statusOf(path: string): { status: TodoStatus; folder: string | null } {
  const segments = path.split('/');
  const at = segments.indexOf('todos');
  if (at < 0 || at + 2 >= segments.length) return { status: 'unfiled', folder: null };
  const folder = segments[at + 1];
  if (folder === 'pending') return { status: 'pending', folder };
  if (folder === 'completed' || folder === 'done') return { status: 'done', folder };
  return { status: 'unfiled', folder };
}

/** Drops a leading `---` ... `---` block (a todo whose frontmatter did not parse still has one). */
function withoutFrontmatter(lines: string[]): string[] {
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') start += 1;
  if (start >= lines.length || lines[start].trim() !== '---') return lines;
  for (let i = start + 1; i < lines.length && i < start + 200; i += 1) {
    if (lines[i].trim() === '---') return lines.slice(i + 1);
  }
  return lines;
}

function mentionsClosing(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('closed') || lower.includes('done') || lower.includes('resolved') || lower.includes('completed');
}

function trimBlank(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start += 1;
  while (end > start && lines[end - 1].trim() === '') end -= 1;
  return lines.slice(start, end);
}

/** A leading run of `>` lines: [the unquoted lines, how many lines it took], or null. */
function leadingQuote(lines: string[]): { text: string[]; taken: number } | null {
  let n = 0;
  const text: string[] = [];
  while (n < lines.length && lines[n].trim().startsWith('>')) {
    const inner = lines[n].trim().slice(1);
    text.push(inner.startsWith(' ') ? inner.slice(1) : inner);
    n += 1;
  }
  return n === 0 ? null : { text, taken: n };
}

export function extractTodoFile(input: { body: string; frontmatter: Record<string, unknown>; path: string }): TodoFileBody {
  const frontmatter = isRecord(input.frontmatter) ? input.frontmatter : {};
  const path = typeof input.path === 'string' ? input.path : '';
  const body = typeof input.body === 'string' ? input.body : '';
  const lines = withoutFrontmatter(body.split('\n').map((line) => clip(line.endsWith('\r') ? line.slice(0, -1) : line, MAX_LINE)));

  const { status, folder } = statusOf(path);
  const created = stampText(frontmatter.created) ?? stampText(frontmatter.date);
  const completed = stampText(frontmatter.completed);
  const severity = stampText(frontmatter.severity);
  const priority = stampText(frontmatter.priority);
  const source = stampText(frontmatter.source);
  const completedBy = stampText(frontmatter.completed_by);

  const { preamble: rawPreamble, sections } = splitSections(lines);
  const find = (name: string): RawSection | null => sections.find((section) => section.heading.toLowerCase() === name) ?? null;
  const problem = find('problem') ?? find('goal');
  const solution = find('solution');
  const planSection = solution ?? find('acceptance criteria');
  const resolution = find('resolution');

  // The preamble: a leading closing callout (kept as the closing only when no Resolution section
  // exists), then a leading H1 that repeats the title.
  let preamble = trimBlank(rawPreamble);
  const found: { callout: string[] | null; scan: string } = { callout: null, scan: '' };
  const takeCallout = (): void => {
    const quote = leadingQuote(preamble);
    if (quote === null || !mentionsClosing(quote.text.join('\n'))) return;
    found.scan = quote.text.join('\n');
    if (resolution !== null) return;
    found.callout = trimBlank(quote.text);
    preamble = trimBlank(preamble.slice(quote.taken));
  };
  takeCallout();
  if (preamble.length > 0 && isH1(preamble[0])) preamble = trimBlank(preamble.slice(1));
  if (found.scan === '') takeCallout();
  const callout = found.callout;
  const calloutScan = found.scan;

  let lead: TodoLead | null = null;
  let plan: TodoPlan | null = null;
  const extras: TodoSection[] = [];

  if (problem !== null) {
    lead = { heading: problem.heading, blocks: blocksOf(trimBlank(problem.lines)) };
  }
  if (planSection !== null) {
    plan = {
      kind: solution !== null ? 'solution' : 'acceptance',
      heading: planSection.heading,
      blocks: blocksOf(trimBlank(planSection.lines)),
      checks: countChecks(planSection.lines),
    };
  }

  if (problem === null) {
    const chunks = chunksOf(preamble);
    const leadAt = chunks.findIndex(isTextChunk);
    if (leadAt >= 0) lead = { heading: null, blocks: blocksOf(chunks.splice(leadAt, 1)[0]) };
    if (plan === null) {
      const checkAt = chunks.findIndex((chunk) => startsChecklist(chunk[0].trim()));
      if (checkAt >= 0) {
        const chunk = chunks.splice(checkAt, 1)[0];
        plan = { kind: 'checklist', heading: null, blocks: blocksOf(chunk), checks: countChecks(chunk) };
      }
    }
    const rest: string[] = [];
    for (const chunk of chunks) {
      if (rest.length > 0) rest.push('');
      rest.push(...chunk);
    }
    const blocks = blocksOf(rest);
    if (blocks.length > 0) extras.push({ heading: 'Details', blocks, sourceHeading: null });
  } else {
    const blocks = blocksOf(preamble);
    if (blocks.length > 0) extras.push({ heading: 'Details', blocks, sourceHeading: null });
  }
  for (const section of sections) {
    if (section === problem || section === planSection || section === resolution) continue;
    extras.push({ heading: section.heading, blocks: blocksOf(trimBlank(section.lines)), sourceHeading: section.heading });
  }

  let closing: TodoClosing | null = null;
  let closingScan = '';
  if (resolution !== null) {
    const closingLines = trimBlank(resolution.lines);
    closing = { from: 'resolution', blocks: blocksOf(closingLines), text: textOfLines(closingLines) };
    closingScan = closingLines.join('\n');
  } else if (callout !== null) {
    closing = { from: 'callout', blocks: blocksOf(callout), text: textOfLines(callout) };
    closingScan = callout.join('\n');
  }

  const quickTask =
    quickIdIn(resolution !== null ? closingScan : '') ??
    quickIdIn(completedBy ?? '') ??
    quickIdIn(calloutScan);
  const commits = commitsIn(completedBy ?? '');
  const completedDay = completed === null ? null : datePart(completed);
  const closedOn = completedDay ?? quickDate(quickTask) ?? (closing === null ? null : firstDateIn(closingScan));

  const goal = sections.find((section) => section.heading.toLowerCase() === 'goal') ?? null;
  const goalText = goal === null ? null : clip(goal.lines.join('\n').trim(), MAX_PROMOTED);
  const noteRefs = noteRefsOf(lines, frontmatter, goalText, source);

  return {
    status,
    folder,
    created,
    completed,
    severity,
    priority,
    area: stampText(frontmatter.area),
    theme: stampText(frontmatter.theme),
    order: stampText(frontmatter.order),
    source,
    completedBy,
    level: levelOf(severity ?? priority),
    files: filesOf(frontmatter.files),
    lead,
    plan,
    extras,
    closing,
    quickTask,
    commits,
    closedOn,
    noteRefs,
  };
}
