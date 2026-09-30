// The PATTERNS.md pattern-map projection (quick-260930-wfs, sketch 013 B): a tolerant,
// fence-aware, line-scanned read of a pattern-mapper document's body into `PatternMap` — the cover
// facts, the mapper's note, the File Classification rows (with their `###` groups), the Pattern
// Assignments and Shared Patterns, the No Analog Found entries, every other `##` section, the
// Metadata search scope, and a section ledger so the composer can prove nothing was dropped
// silently. Code excerpts are counted, never kept: they stay in Source mode.
// T-wfs-01 discipline: every regex here is applied to one bounded line (or one bounded cell) at a
// time — never a whole-document regex, never a nested unbounded quantifier — and every line is
// clipped to MAX_LINE characters up front (by `splitWithPreamble`) so one pathological line cannot
// make any linear scan expensive. The table row splitter is a single linear character scan.
// `extractPatternMap` is pure (no fs access) and never throws on well-typed input;
// `PatternsHandler.parse` still wraps it in try/catch (T-wfs-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';
import { splitFenceAware, splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface PatternMapClassificationRow {
  /** The row's `###` group when the File Classification section has subsections, else `null`. */
  group: string | null;
  file: string;
  role: string;
  flow: string;
  analog: string;
  /** The raw Match Quality cell (or the last column when the table has no such header). */
  quality: string;
}

export interface PatternMapAssignment {
  heading: string;
  analog: string | null;
  applyTo: string | null;
  useInstead: string | null;
  /** Paragraphs and lists only — fenced excerpts, line-citation captions and the labelled fields
   * above are left out. */
  guidance: Block[];
  excerpts: number;
}

export interface PatternMapShared {
  heading: string;
  source: string | null;
  applyTo: string | null;
  /** The first prose paragraph that is not a field or a caption. */
  rule: string | null;
  excerpts: number;
}

export interface PatternMapNoAnalog {
  file: string;
  reason: string;
}

export interface PatternMapOther {
  heading: string;
  blocks: Block[];
}

export interface PatternMapSection {
  heading: string;
  /** True for the five sections the map consumes itself (classification, assignments, shared
   * patterns, no analog, metadata). */
  claimed: boolean;
}

export interface PatternMap {
  meta: {
    phase: string | null;
    title: string | null;
    mapped: string | null;
    filesAnalyzed: string | null;
    analogsFound: string | null;
    /** The mapper's note: the preamble minus the H1 and the three fact lines. */
    notes: Block[];
  };
  classification: PatternMapClassificationRow[];
  assignments: PatternMapAssignment[];
  shared: PatternMapShared[];
  noAnalog: PatternMapNoAnalog[];
  noAnalogNote: Block[];
  other: PatternMapOther[];
  scope: string | null;
  scanned: string | null;
  /** Every fenced block in the body. */
  excerpts: number;
  sections: PatternMapSection[];
}

// ---------------------------------------------------------------------------
// Line helpers
// ---------------------------------------------------------------------------

const MAX_ROWS = 2000;
const MAX_CELL = 2000;

/** Fence state machine over clipped lines — the same rule `splitWithPreamble` uses. */
function fenceOpener(trimmed: string): { ch: string; len: number } | null {
  const ch = trimmed[0];
  if (ch !== '`' && ch !== '~') return null;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === ch) len += 1;
  return len >= 3 ? { ch, len } : null;
}

function fenceCloses(trimmed: string, fence: { ch: string; len: number }): boolean {
  if (trimmed[0] !== fence.ch) return false;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === fence.ch) len += 1;
  return len >= fence.len && trimmed.slice(len).trim() === '';
}

/** `text` with every fenced block replaced by one blank line, plus the number of blocks removed. */
function stripFences(text: string): { text: string; count: number } {
  const out: string[] = [];
  let fence: { ch: string; len: number } | null = null;
  let count = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      count += 1;
      out.push('');
      continue;
    }
    out.push(line);
  }
  return { text: out.join('\n'), count };
}

function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').trim();
}

function clip(text: string): string {
  return text.length > MAX_CELL ? text.slice(0, MAX_CELL) : text;
}

function isHeadingLine(trimmed: string): boolean {
  if (trimmed[0] !== '#') return false;
  let i = 0;
  while (i < trimmed.length && trimmed[i] === '#') i += 1;
  return i <= 6 && (trimmed[i] === ' ' || trimmed[i] === '\t');
}

// ---------------------------------------------------------------------------
// Bold-label fields (`**Analog:** …`, `**Apply to:** …`)
// ---------------------------------------------------------------------------

interface BoldLabel {
  /** Lower-case label text before any colon (`apply to`, `analog`). */
  key: string;
  /** What follows the label on its own line. */
  rest: string;
}

/** `**Label:** rest`, `**Label**: rest`, `**Label: rest**` → its parts; null when the line does
 * not open with a short bold run. Linear: two `indexOf` calls on one bounded line. */
function boldLabel(trimmed: string): BoldLabel | null {
  if (!trimmed.startsWith('**')) return null;
  const close = trimmed.indexOf('**', 2);
  if (close === -1 || close > 62) return null;
  const inner = trimmed.slice(2, close);
  const colon = inner.indexOf(':');
  const key = (colon === -1 ? inner : inner.slice(0, colon)).trim().toLowerCase();
  if (key === '') return null;
  const innerTail = colon === -1 ? '' : inner.slice(colon + 1).trim();
  let after = trimmed.slice(close + 2);
  if (after.startsWith(':')) after = after.slice(1);
  return { key, rest: `${innerTail} ${after}`.trim() };
}

interface Field {
  key: string;
  value: string;
  /** Inclusive start / exclusive end line indexes of the field in the scanned lines. */
  start: number;
  end: number;
}

/** Every `**Label:** value` field outside fences. A value runs from the label line to the next
 * blank line, fence, heading, or bold label. */
function boldFields(lines: string[]): Field[] {
  const fields: Field[] = [];
  let fence: { ch: string; len: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      continue;
    }
    const label = boldLabel(trimmed);
    if (!label) continue;
    const parts: string[] = label.rest === '' ? [] : [label.rest];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j].trim();
      if (next === '' || fenceOpener(next) || isHeadingLine(next) || boldLabel(next) !== null) break;
      parts.push(next);
      j += 1;
    }
    fields.push({ key: label.key, value: clip(parts.join(' ').trim()), start: i, end: j });
    i = j - 1;
  }
  return fields;
}

function fieldValue(fields: Field[], ...keys: string[]): string | null {
  const found = fields.find((f) => keys.includes(f.key));
  return found && found.value !== '' ? found.value : null;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** Splits one pipe row into cells: drops one leading and one trailing pipe (the trailing one is
 * optional — labelore's own rows omit it), splits on pipes that are neither backslash-escaped nor
 * inside a backtick code span. A single linear scan. */
export function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  let inCode = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && text[i + 1] === '|') {
      current += '|';
      i += 1;
      continue;
    }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(line: string): boolean {
  const cells = splitRow(line);
  if (cells.length === 0) return false;
  for (const cell of cells) {
    if (cell.length === 0) return false;
    for (const ch of cell) if (ch !== '-' && ch !== ':' && ch !== ' ') return false;
    if (!cell.includes('-')) return false;
  }
  return true;
}

interface RawTable {
  headers: string[];
  rows: string[][];
}

/** Every GFM table in `text` (outside fences): a run of pipe lines whose second line is a
 * separator row. */
function readTables(text: string): RawTable[] {
  const tables: RawTable[] = [];
  const lines = text.split('\n');
  let fence: { ch: string; len: number } | null = null;
  let run: string[] = [];
  const flush = (): void => {
    if (run.length >= 2 && isSeparatorRow(run[1])) {
      const headers = splitRow(run[0]).map((h) => plain(h).toLowerCase());
      const rows: string[][] = [];
      for (const line of run.slice(2)) {
        if (rows.length >= MAX_ROWS) break;
        rows.push(splitRow(line).map(clip));
      }
      tables.push({ headers, rows });
    }
    run = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      flush();
      fence = opened;
      continue;
    }
    if (trimmed.startsWith('|')) run.push(line);
    else flush();
  }
  flush();
  return tables;
}

function columnIndex(headers: string[], ...needles: string[]): number {
  for (const needle of needles) {
    const at = headers.findIndex((h) => h.includes(needle));
    if (at !== -1) return at;
  }
  return -1;
}

function classificationRowsOf(table: RawTable, group: string | null): PatternMapClassificationRow[] {
  const file = Math.max(0, columnIndex(table.headers, 'new/modified file', 'file'));
  const role = columnIndex(table.headers, 'role');
  const flow = columnIndex(table.headers, 'data flow');
  const analog = columnIndex(table.headers, 'closest analog', 'analog');
  const qualityAt = columnIndex(table.headers, 'match quality', 'quality');
  const quality = qualityAt === -1 ? table.headers.length - 1 : qualityAt;
  const cell = (row: string[], at: number): string => (at >= 0 ? (row[at] ?? '') : '');
  const out: PatternMapClassificationRow[] = [];
  for (const row of table.rows) {
    const fileCell = cell(row, file);
    if (fileCell.trim() === '') continue;
    out.push({
      group,
      file: fileCell,
      role: cell(row, role),
      flow: cell(row, flow),
      analog: cell(row, analog),
      quality: cell(row, quality),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Prose blocks
// ---------------------------------------------------------------------------

/** Marks a `####` sub-head paragraph so the caption filter does not mistake it for a caption. */
const SUBHEAD_MARK = '\u0001';

const FIELD_KEYS = ['analog', 'apply to', 'use instead', 'source', 'sources'];

/** A paragraph that only captions a code excerpt: `**Imports pattern** (source: …):` or a lone
 * `**Label:**`. */
function isCaption(text: string): boolean {
  if (!text.startsWith('**')) return false;
  const close = text.indexOf('**', 2);
  if (close === -1 || close > 162) return false;
  const after = text.slice(close + 2).trim();
  if (after === '') return true;
  return after.startsWith('(');
}

function isRule(text: string): boolean {
  if (text.length < 3) return false;
  for (const ch of text) if (ch !== '-' && ch !== '*' && ch !== '_' && ch !== ' ') return false;
  return true;
}

/** Guidance for one assignment / shared-pattern body: the labelled fields and fenced blocks
 * removed, `####` heads turned into bold sub-head paragraphs, captions dropped, paragraphs and
 * lists kept. */
function guidanceOf(lines: string[], fields: Field[]): { blocks: Block[]; excerpts: number } {
  const dropped = new Set<number>();
  for (const field of fields) {
    if (!FIELD_KEYS.includes(field.key)) continue;
    for (let i = field.start; i < field.end; i++) dropped.add(i);
  }
  const kept: string[] = [];
  lines.forEach((line, index) => {
    if (dropped.has(index)) return;
    kept.push(line);
  });
  const stripped = stripFences(kept.join('\n'));
  const prepared: string[] = [];
  for (const line of stripped.text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('####') && isHeadingLine(trimmed)) {
      let text = trimmed;
      while (text.startsWith('#')) text = text.slice(1);
      prepared.push('', `${SUBHEAD_MARK}**${text.trim()}**`, '');
      continue;
    }
    prepared.push(line);
  }
  const blocks: Block[] = [];
  for (const block of parseBlocks(foldSubBullets(prepared.join('\n')))) {
    if (block.kind === 'paragraph') {
      if (block.text.startsWith(SUBHEAD_MARK)) {
        blocks.push({ kind: 'paragraph', text: clip(block.text.slice(SUBHEAD_MARK.length)) });
        continue;
      }
      if (isRule(block.text) || isCaption(block.text)) continue;
      blocks.push({ kind: 'paragraph', text: clip(block.text) });
    } else if (block.kind === 'list') {
      blocks.push({ kind: 'list', ordered: block.ordered, items: block.items.map(clip) });
    }
  }
  return { blocks: mergeOrderedLists(blocks), excerpts: stripped.count };
}

/** Indented sub-bullets under a list item become part of that item's text (`• …`) instead of
 * items of their own, so a numbered list keeps its numbering. */
function foldSubBullets(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      const indent = line.length - trimmed.length;
      if (indent >= 2 && (trimmed.startsWith('- ') || trimmed.startsWith('* '))) {
        return `${line.slice(0, indent)}• ${trimmed.slice(2)}`;
      }
      return line;
    })
    .join('\n');
}

/** Blank-line-separated items of one numbered list arrive as adjacent ordered lists; join them. */
function mergeOrderedLists(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    const last = out.at(-1);
    if (block.kind === 'list' && block.ordered && last && last.kind === 'list' && last.ordered) {
      out[out.length - 1] = { kind: 'list', ordered: true, items: [...last.items, ...block.items] };
    } else {
      out.push(block);
    }
  }
  return out;
}

/** Blocks of a prose region with code dropped and horizontal rules removed. */
function proseBlocks(text: string, keepTables: boolean): Block[] {
  const out: Block[] = [];
  for (const block of parseBlocks(foldSubBullets(text))) {
    if (block.kind === 'code') continue;
    if (block.kind === 'table' && !keepTables) continue;
    if (block.kind === 'paragraph' && isRule(block.text)) continue;
    out.push(block);
  }
  return mergeOrderedLists(out);
}

// ---------------------------------------------------------------------------
// Preamble (H1 + cover facts + mapper's note)
// ---------------------------------------------------------------------------

function unquote(line: string): string {
  let text = line.trimStart();
  while (text.startsWith('>')) text = text.slice(1).trimStart();
  return text;
}

function parseTitle(h1: string): { phase: string | null; title: string } {
  let title = h1.trim();
  let phase: string | null = null;
  if (title.toLowerCase().startsWith('phase ')) {
    const colon = title.indexOf(':');
    if (colon > 6 && colon < 24) {
      const token = title.slice(6, colon).trim();
      if (token !== '' && !token.includes(' ')) {
        phase = token;
        title = title.slice(colon + 1).trim();
      }
    }
  }
  const lower = title.toLowerCase();
  if (lower.endsWith('pattern map')) {
    let head = title.slice(0, title.length - 'pattern map'.length).trimEnd();
    if (head.endsWith('-') || head.endsWith('—') || head.endsWith('–')) head = head.slice(0, -1).trimEnd();
    if (head !== '') title = head;
  }
  return { phase, title };
}

function parsePreamble(preamble: string): PatternMap['meta'] {
  const lines = preamble.split('\n');
  let h1: string | null = null;
  const facts: Record<string, string> = {};
  const rest: string[] = [];
  let fence: { ch: string; len: number } | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (fence) {
      rest.push(line);
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      rest.push(line);
      continue;
    }
    if (h1 === null && trimmed.startsWith('# ')) {
      h1 = trimmed.slice(2).trim();
      continue;
    }
    const label = boldLabel(unquote(line));
    if (label && (label.key === 'mapped' || label.key === 'files analyzed' || label.key === 'analogs found')) {
      if (!(label.key in facts)) facts[label.key] = clip(label.rest);
      continue;
    }
    rest.push(unquote(line));
  }
  const parsed = h1 === null ? { phase: null, title: null } : parseTitle(h1);
  return {
    phase: parsed.phase,
    title: parsed.title,
    mapped: facts.mapped ?? null,
    filesAnalyzed: facts['files analyzed'] ?? null,
    analogsFound: facts['analogs found'] ?? null,
    notes: proseBlocks(rest.join('\n'), false),
  };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

type SectionRole = 'classification' | 'assignments' | 'shared' | 'noAnalog' | 'metadata' | 'other';

function roleOf(heading: string): SectionRole {
  const key = plain(heading).toLowerCase();
  if (key.startsWith('file classification')) return 'classification';
  if (key.startsWith('pattern assignments')) return 'assignments';
  if (key.startsWith('shared patterns')) return 'shared';
  if (key.startsWith('no analog')) return 'noAnalog';
  if (key.startsWith('metadata')) return 'metadata';
  return 'other';
}

function classificationOf(body: string): PatternMapClassificationRow[] {
  const split = splitWithPreamble(body, 3);
  const rows: PatternMapClassificationRow[] = [];
  for (const table of readTables(split.preamble)) rows.push(...classificationRowsOf(table, null));
  for (const sub of split.sections) {
    const group = plain(sub.heading);
    for (const table of readTables(sub.body)) rows.push(...classificationRowsOf(table, group));
  }
  return rows.slice(0, MAX_ROWS);
}

function assignmentsOf(body: string): PatternMapAssignment[] {
  return splitFenceAware(body, 3).map((sub) => {
    const lines = sub.body.split('\n');
    const fields = boldFields(lines);
    const { blocks, excerpts } = guidanceOf(lines, fields);
    return {
      heading: clip(sub.heading),
      analog: fieldValue(fields, 'analog'),
      applyTo: fieldValue(fields, 'apply to'),
      useInstead: fieldValue(fields, 'use instead'),
      guidance: blocks,
      excerpts,
    };
  });
}

function sharedOf(body: string): PatternMapShared[] {
  return splitFenceAware(body, 3).map((sub) => {
    const lines = sub.body.split('\n');
    const fields = boldFields(lines);
    const { blocks, excerpts } = guidanceOf(lines, fields);
    const firstParagraph = blocks.find((b) => b.kind === 'paragraph');
    return {
      heading: clip(sub.heading),
      source: fieldValue(fields, 'source', 'sources'),
      applyTo: fieldValue(fields, 'apply to'),
      rule: firstParagraph && firstParagraph.kind === 'paragraph' ? firstParagraph.text : null,
      excerpts,
    };
  });
}

function noAnalogOf(body: string): { entries: PatternMapNoAnalog[]; note: Block[] } {
  const entries: PatternMapNoAnalog[] = [];
  for (const table of readTables(body)) {
    const file = Math.max(0, columnIndex(table.headers, 'file'));
    const reasonAt = columnIndex(table.headers, 'reason');
    const reason = reasonAt === -1 ? table.headers.length - 1 : reasonAt;
    for (const row of table.rows) {
      const fileCell = row[file] ?? '';
      if (fileCell.trim() === '') continue;
      entries.push({ file: fileCell, reason: reason === file ? '' : (row[reason] ?? '') });
    }
  }
  const note = proseBlocks(body, false).filter((b) => b.kind === 'paragraph' || b.kind === 'list');
  return { entries: entries.slice(0, MAX_ROWS), note };
}

const EMPTY_META: PatternMap['meta'] = {
  phase: null,
  title: null,
  mapped: null,
  filesAnalyzed: null,
  analogsFound: null,
  notes: [],
};

/** The tolerant PATTERNS projection. Pure; never throws on any string. */
export function extractPatternMap(rawBody: string): PatternMap {
  const body = typeof rawBody === 'string' ? rawBody : '';
  const { preamble, sections } = splitWithPreamble(body, 2);
  const map: PatternMap = {
    meta: EMPTY_META,
    classification: [],
    assignments: [],
    shared: [],
    noAnalog: [],
    noAnalogNote: [],
    other: [],
    scope: null,
    scanned: null,
    excerpts: stripFences(body).count,
    sections: [],
  };
  map.meta = parsePreamble(preamble);
  for (const section of sections) {
    const role = roleOf(section.heading);
    map.sections.push({ heading: plain(section.heading), claimed: role !== 'other' });
    if (role === 'classification') map.classification.push(...classificationOf(section.body));
    else if (role === 'assignments') map.assignments.push(...assignmentsOf(section.body));
    else if (role === 'shared') map.shared.push(...sharedOf(section.body));
    else if (role === 'noAnalog') {
      const { entries, note } = noAnalogOf(section.body);
      map.noAnalog.push(...entries);
      map.noAnalogNote.push(...note);
    } else if (role === 'metadata') {
      const fields = boldFields(section.body.split('\n'));
      map.scope ??= fieldValue(fields, 'analog search scope');
      if (map.scanned === null) {
        const scanned = fields.find(
          (f) => f.key.includes('scanned') || (f.key.includes('files') && f.key.includes('read')),
        );
        map.scanned = scanned && scanned.value !== '' ? scanned.value : null;
      }
    } else {
      map.other.push({ heading: plain(section.heading), blocks: proseBlocks(section.body, true) });
    }
  }
  return map;
}
