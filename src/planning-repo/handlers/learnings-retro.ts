// The LEARNINGS.md body projection (quick-261017-k45, sketch 024 winner E): a tolerant, fence-aware,
// line-scanned read of one learnings file into `LearningsRetroBody` - the H1, every entry of both shapes
// GSD writes (headed entries: `### title`, body, the kind's labelled field, `**Source:**`, an optional
// `**Graduated:**`; and plain list items with continuation lines and a trailing `(D-NN)` reference) and
// a section ledger so the composer can offer the parts it does not show as "Also in this file" chips.
// It ports the sketch's `gen-data.mjs` parse (the regexes there are reference only) with one fix: an
// entry that goes straight from its title to a labelled field has an EMPTY body - the sketch repeated
// the field there.
// T-k45-02: every line is clipped to MAX_LINE up front; fences are tracked so nothing inside one is read
// as a heading, a field or a list item; every pattern here runs on one clipped line or value at a time
// and none nests an unbounded quantifier; labelled fields, the Source split and the graduated date are
// character scans, never a global pattern over a whole body. Entries, sources, fields, sections and
// every text are capped. `extractLearningsRetro` is pure (no fs access) and never throws on a string;
// `LearningsHandler.parse` still wraps it in try/catch (T-k45-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type LearningKind = 'decision' | 'lesson' | 'pattern' | 'surprise';

export interface LearningField {
  /** The label as written ("Rationale", "When to use"), without the colon. */
  label: string;
  text: string;
  blocks: Block[];
}

export interface LearningSource {
  /** "01-04-SUMMARY.md" or "D-02": the first word of the part, backticks stripped. */
  artifact: string;
  /** The text inside the outer parentheses after the artifact, or null. */
  note: string | null;
}

export interface LearningGraduated {
  target: string;
  /** "2026-09-22" from a trailing ":YYYY-MM-DD", else null. */
  date: string | null;
}

export interface LearningEntry {
  kind: LearningKind;
  title: string;
  /** The text between the title and the first labelled field; empty when a field comes first. */
  body: Block[];
  /** Every labelled field except Source / Sources and Graduated, in document order. */
  fields: LearningField[];
  sources: LearningSource[];
  graduated: LearningGraduated | null;
  /** True for a plain list item, false for a `###` entry. */
  listItem: boolean;
}

export interface LearningsSection {
  heading: string;
  kind: LearningKind | null;
  /** True for a kind section holding text that belongs to no entry (other than "None."). */
  leftover: boolean;
  /** True when the section holds nothing worth a chip: empty, "None" or "N/A". */
  blank: boolean;
}

export interface LearningsRetroBody {
  /** The first `#` line as written, or null. */
  h1: string | null;
  entries: LearningEntry[];
  sections: LearningsSection[];
}

// ---------------------------------------------------------------------------
// Caps
// ---------------------------------------------------------------------------

const MAX_LINE = 8000;
const MAX_TEXT = 6000;
const MAX_ENTRIES = 500;
const MAX_SOURCES = 50;
const MAX_FIELDS = 30;
const MAX_SECTIONS = 200;
const MAX_ENTRY_LINES = 400;
const MAX_FRONTMATTER_LINES = 400;
const MAX_HEADING = 600;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function cap(text: string, max: number = MAX_TEXT): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Whitespace runs collapsed to one space, trimmed, capped. */
function squash(text: string, max: number = MAX_TEXT): string {
  return cap(text.slice(0, max * 2).replace(/\s+/g, ' ').trim(), max);
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isUpper(ch: string | undefined): boolean {
  return ch !== undefined && ch >= 'A' && ch <= 'Z';
}

/** Skips a leading `---` ... `---` frontmatter block (a malformed one comes through the handler with
 * the block still in the body). */
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

function kindOf(heading: string): LearningKind | null {
  const h = heading.slice(0, 40).replace(/[*`_]/g, '').trim().toLowerCase();
  if (h.startsWith('decision')) return 'decision';
  if (h.startsWith('lesson')) return 'lesson';
  if (h.startsWith('pattern')) return 'pattern';
  if (h.startsWith('surprise')) return 'surprise';
  return null;
}

/** The `#` x `level` heading text of a line, or null. Exactly `level` hashes and a space. */
function headingOf(line: string, level: number): string | null {
  let n = 0;
  while (n < line.length && line[n] === '#') n += 1;
  if (n !== level || line[n] !== ' ') return null;
  return cap(line.slice(n + 1).trim(), MAX_HEADING);
}

/** True for "None", "None.", "N/A" and the like - a placeholder, not content. */
function isPlaceholder(trimmed: string): boolean {
  const t = trimmed.replace(/[*_`.\s]/g, '').toLowerCase();
  return t === 'none' || t === 'n/a' || t === 'na' || t === '-' || t === '';
}

interface ListMarker {
  rest: string;
}

/** `- x`, `* x`, `N. x`, `N) x` at column 0 or 1 -> the item text; null otherwise. */
function listMarkerOf(line: string): ListMarker | null {
  let i = 0;
  if (line[0] === ' ') i = 1;
  const ch = line[i];
  if ((ch === '-' || ch === '*') && line[i + 1] === ' ') {
    const rest = line.slice(i + 2).trim();
    return rest === '' ? null : { rest };
  }
  let j = i;
  while (j < line.length && j - i < 4 && isDigit(line[j])) j += 1;
  if (j > i && (line[j] === '.' || line[j] === ')') && line[j + 1] === ' ') {
    const rest = line.slice(j + 2).trim();
    return rest === '' ? null : { rest };
  }
  return null;
}

/** `**Label:** value` -> its parts. The label starts with a capital, holds no asterisk and is at most
 * 60 characters; null for any other line. */
function labelOf(line: string): { label: string; rest: string } | null {
  const t = line.trimStart();
  if (t.length < 5 || t[0] !== '*' || t[1] !== '*' || !isUpper(t[2])) return null;
  const close = t.indexOf(':**', 3);
  if (close === -1 || close > 62) return null;
  const label = t.slice(2, close);
  if (label.includes('*')) return null;
  return { label: label.trim(), rest: t.slice(close + 3) };
}

/** Splits `text` on commas outside parentheses. */
function splitOutsideParens(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += ch;
  }
  parts.push(current);
  return parts;
}

function sourcesOf(value: string): LearningSource[] {
  const out: LearningSource[] = [];
  for (const raw of splitOutsideParens(squash(value))) {
    const part = raw.trim();
    if (part === '') continue;
    let end = 0;
    while (end < part.length && part[end] !== ' ' && part[end] !== '(') end += 1;
    const artifact = part.slice(0, end).replace(/`/g, '').replace(/[.;]+$/, '');
    if (artifact === '') continue;
    let note: string | null = null;
    const open = part.indexOf('(', end);
    if (open !== -1) {
      const close = part.lastIndexOf(')');
      note = squash(part.slice(open + 1, close > open ? close : part.length)) || null;
    }
    out.push({ artifact, note });
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

function graduatedOf(value: string): LearningGraduated | null {
  const text = squash(value).replace(/`/g, '');
  if (text === '') return null;
  // A trailing ":YYYY-MM-DD".
  const n = text.length;
  if (n > 11 && text[n - 11] === ':') {
    const date = text.slice(n - 10);
    const shaped =
      isDigit(date[0]) && isDigit(date[1]) && isDigit(date[2]) && isDigit(date[3]) && date[4] === '-' &&
      isDigit(date[5]) && isDigit(date[6]) && date[7] === '-' && isDigit(date[8]) && isDigit(date[9]);
    if (shaped) {
      const target = text.slice(0, n - 11).trim();
      if (target !== '') return { target, date };
    }
  }
  return { target: text, date: null };
}

/** A trailing "(D-NN)" reference (several comma-separated allowed) with the period after it; returns
 * the title without it and the references, or the title untouched. */
function splitReference(title: string): { title: string; refs: string[] } {
  let t = title.trimEnd();
  if (t.endsWith('.')) t = t.slice(0, -1).trimEnd();
  if (!t.endsWith(')')) return { title, refs: [] };
  const open = t.lastIndexOf('(');
  if (open === -1) return { title, refs: [] };
  const inner = t.slice(open + 1, -1);
  if (inner.length > 80) return { title, refs: [] };
  const refs = inner.split(',').map((r) => r.trim());
  const ok = refs.length > 0 && refs.every((r) => r.length >= 3 && r.length <= 8 && r.startsWith('D-') && isDigit(r[2]) && r.slice(2).split('').every(isDigit));
  if (!ok) return { title, refs: [] };
  let rest = t.slice(0, open).trimEnd();
  if (rest.endsWith('.')) rest = rest.slice(0, -1).trimEnd();
  if (rest === '') return { title, refs: [] };
  return { title: rest, refs };
}

// ---------------------------------------------------------------------------
// Headed entries
// ---------------------------------------------------------------------------

interface RawLine {
  text: string;
  fenced: boolean;
}

interface HeadedDraft {
  kind: LearningKind;
  title: string;
  lines: RawLine[];
}

function isRule(text: string): boolean {
  return text.trim() === '---';
}

function buildHeaded(draft: HeadedDraft): LearningEntry {
  const body: string[] = [];
  const fields: LearningField[] = [];
  let sources: LearningSource[] = [];
  let graduated: LearningGraduated | null = null;
  // The label and lines of the field being read; null while reading the body or after a rule.
  let current: { label: string; lines: string[] } | null = null;
  let inBody = true;

  const closeField = (): void => {
    if (current === null) return;
    const value = current.lines.join('\n').trim();
    const key = current.label.toLowerCase();
    if (key === 'source' || key === 'sources') {
      sources = sources.concat(sourcesOf(value)).slice(0, MAX_SOURCES);
    } else if (key === 'graduated') {
      graduated = graduatedOf(value) ?? graduated;
    } else if (fields.length < MAX_FIELDS) {
      const text = cap(value);
      fields.push({ label: current.label, text, blocks: parseBlocks(text) });
    }
    current = null;
  };

  for (const line of draft.lines) {
    if (!line.fenced) {
      const label = labelOf(line.text);
      if (label !== null) {
        closeField();
        inBody = false;
        current = { label: label.label, lines: [label.rest] };
        continue;
      }
      if (isRule(line.text)) {
        // A thematic break never reaches a body or a value; in a field it ends the value.
        if (!inBody) {
          closeField();
        }
        continue;
      }
    }
    if (inBody) body.push(line.text);
    else if (current !== null) current.lines.push(line.text);
  }
  closeField();

  return {
    kind: draft.kind,
    title: draft.title,
    body: parseBlocks(cap(body.join('\n').trim())),
    fields,
    sources,
    graduated,
    listItem: false,
  };
}

// ---------------------------------------------------------------------------
// Entry point
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

/** Reads a LEARNINGS body. Pure; never throws on a string. */
export function extractLearningsRetro(rawBody: string): LearningsRetroBody {
  const result: LearningsRetroBody = { h1: null, entries: [], sections: [] };
  if (typeof rawBody !== 'string' || rawBody === '') return result;
  const lines = stripFrontmatter(rawBody)
    .split('\n')
    .map((l) => (l.length > MAX_LINE ? l.slice(0, MAX_LINE) : l.replace(/\r$/, '')));

  let section: LearningsSection | null = null;
  let headed: HeadedDraft | null = null;
  let listEntry: LearningEntry | null = null;
  let fence: Fence | null = null;

  const flushHeaded = (): void => {
    if (headed !== null && result.entries.length < MAX_ENTRIES) result.entries.push(buildHeaded(headed));
    headed = null;
  };
  const flushList = (): void => {
    if (listEntry !== null && result.entries.length < MAX_ENTRIES) {
      const { title, refs } = splitReference(listEntry.title);
      listEntry.title = squash(title);
      if (refs.length > 0) listEntry.sources = refs.map((artifact) => ({ artifact, note: null }));
      result.entries.push(listEntry);
    }
    listEntry = null;
  };
  const noteContent = (): void => {
    if (section !== null) section.blank = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (fence !== null) {
      if (fenceCloses(trimmed, fence)) fence = null;
      if (headed !== null) {
        if (headed.lines.length < MAX_ENTRY_LINES) headed.lines.push({ text: line, fenced: true });
      }
      continue;
    }
    const opened = fenceOpen(trimmed);
    if (opened !== null) {
      fence = opened;
      noteContent();
      if (headed !== null) {
        if (headed.lines.length < MAX_ENTRY_LINES) headed.lines.push({ text: line, fenced: true });
      } else if (section !== null && section.kind !== null) {
        flushList();
        section.leftover = true;
      }
      continue;
    }

    const h1 = headingOf(line, 1);
    if (h1 !== null) {
      if (result.h1 === null) result.h1 = h1;
      continue;
    }
    const h2 = headingOf(line, 2);
    if (h2 !== null) {
      flushHeaded();
      flushList();
      if (result.sections.length >= MAX_SECTIONS) {
        section = null;
        continue;
      }
      section = { heading: h2, kind: kindOf(h2), leftover: false, blank: true };
      result.sections.push(section);
      continue;
    }
    if (section === null) continue;

    const kind = section.kind;
    if (kind === null) {
      if (trimmed !== '' && !isPlaceholder(trimmed) && trimmed !== '---') section.blank = false;
      continue;
    }

    const h3 = headingOf(line, 3);
    if (h3 !== null) {
      flushHeaded();
      flushList();
      section.blank = false;
      headed = { kind, title: squash(h3), lines: [] };
      continue;
    }

    if (headed !== null) {
      if (headed.lines.length < MAX_ENTRY_LINES) headed.lines.push({ text: line, fenced: false });
      continue;
    }

    if (trimmed === '') continue;
    const marker = listMarkerOf(line);
    if (marker !== null) {
      flushList();
      section.blank = false;
      listEntry = { kind, title: marker.rest, body: [], fields: [], sources: [], graduated: null, listItem: true };
      continue;
    }
    if (listEntry !== null && (line.startsWith('  ') || line.startsWith('\t'))) {
      const entry: LearningEntry = listEntry;
      if (entry.title.length < MAX_TEXT) entry.title = `${entry.title} ${trimmed}`;
      continue;
    }
    flushList();
    if (trimmed === '---' || isPlaceholder(trimmed)) continue;
    section.blank = false;
    section.leftover = true;
  }
  flushHeaded();
  flushList();
  return result;
}
