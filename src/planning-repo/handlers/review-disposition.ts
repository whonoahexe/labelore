// The REVIEW-DISPOSITION.md body projection (phase 9, research Pitfall 6): a tolerant read of the
// three shapes real disposition files take, into one row model the review ledger can count.
//   1. the tool shape: frontmatter `findings` (id, severity, disposition, title), `open` and `total`,
//      then an H1 and a `Finding | Severity | Disposition | Source` table repeating them;
//   2. the hand-written shape: no `findings`, an `ID | Severity | Finding | Disposition | Note` table
//      with capitalised values;
//   3. the two-column shape: no frontmatter, a `Finding | Disposition` table ("CR-01: ..." | "fixed ...").
// A disposition is kept exactly as written: this reader never consults the fix file, so a stale `open`
// stays `open` (D-08 shows the disagreement later, never merged). Pure (no fs access) and never throws
// on a string; the handler still wraps it in try/catch.
// SEC-01: the body is capped before any scan; the table is found in one pass over its lines; every
// line is clipped to MAX_LINE up front, so one 200k-character cell costs the time of a clipped line;
// every string is capped at MAX_TEXT characters and there are at most MAX_ROWS rows.
import { leadingFindingId, severityOfId } from './review-report.ts';
import type { ReviewSeverity } from './review-report.ts';

export type DispositionClass = 'open' | 'fixed' | 'skipped' | 'deferred' | 'other';

export interface DispositionRow {
  id: string;
  severity: ReviewSeverity | null;
  disposition: DispositionClass;
  /** The disposition cell or field as written (capped), so an 'other' class keeps its own words. */
  dispositionRaw: string;
  title: string | null;
  note: string | null;
}

export interface ReviewDispositionBody {
  source: 'frontmatter' | 'table' | 'none';
  rows: DispositionRow[];
  /** The `open` and `total` numbers the frontmatter states, else null. Never recomputed. */
  stated: { open: number | null; total: number | null };
}

const MAX_BODY = 1_000_000;
const MAX_LINE = 8000;
const MAX_ROWS = 500;
const MAX_TEXT = 400;
const MAX_CELLS = 24;

function cap(text: string, max: number = MAX_TEXT): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** `**bold**` markers and backticks dropped, whitespace trimmed. Linear. */
function plain(text: string): string {
  return text.split('**').join('').split('`').join('').trim();
}

// ---------------------------------------------------------------------------
// Classes and severities
// ---------------------------------------------------------------------------

/** The first word of a disposition, lower-cased: letters, digits and hyphens, so "Wont-fix" stays
 * one word and "fixed (see x)" reads "fixed". */
function firstWordOf(text: string): string {
  const source = text.trim().slice(0, 80).toLowerCase();
  let end = 0;
  while (end < source.length) {
    const ch = source[end];
    const word = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '-' || ch === '_';
    if (!word) break;
    end += 1;
  }
  return source.slice(0, end);
}

function classOf(text: string): DispositionClass {
  const word = firstWordOf(text);
  if (word === 'open' || word === 'fixed' || word === 'skipped' || word === 'deferred') return word;
  return 'other';
}

function severityOf(raw: unknown, id: string): ReviewSeverity | null {
  if (typeof raw === 'string') {
    const word = firstWordOf(raw);
    if (word === 'critical' || word === 'blocker') return 'critical';
    if (word === 'warning' || word === 'info') return word;
  }
  return severityOfId(id);
}

function numberOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function noteOf(cell: string | undefined): string | null {
  if (cell === undefined) return null;
  const text = plain(cell);
  if (text === '' || text === '—' || text === '–' || text === '-') return null;
  return cap(text);
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

interface TableShape {
  idCol: number;
  findingCol: number;
  severityCol: number;
  dispositionCol: number;
  noteCol: number;
  rows: string[][];
}

/** The cells of one pipe-table line: the text between unescaped pipes, outer pipes dropped, at most
 * MAX_CELLS of them. One pass over the (clipped) line. */
function cellsOf(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let started = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') {
      current += '|';
      i += 1;
      continue;
    }
    if (ch === '|') {
      if (started) {
        if (cells.length >= MAX_CELLS) return cells;
        cells.push(current.trim());
      }
      started = true;
      current = '';
      continue;
    }
    if (started) current += ch;
  }
  // A trailing cell with no closing pipe is kept; a bare outer pipe leaves an empty one to drop.
  if (started && current.trim() !== '' && cells.length < MAX_CELLS) cells.push(current.trim());
  return cells;
}

function isSeparator(cells: string[]): boolean {
  if (cells.length === 0) return false;
  for (const cell of cells) {
    if (cell === '') return false;
    for (let i = 0; i < cell.length; i++) {
      const ch = cell[i];
      if (ch !== '-' && ch !== ':' && ch !== ' ') return false;
    }
  }
  return true;
}

function headerName(cell: string): string {
  return plain(cell).toLowerCase();
}

/** The table shape when the header names a finding or id column and a disposition column. */
function shapeOf(header: string[]): Omit<TableShape, 'rows'> | null {
  let idCol = -1;
  let findingCol = -1;
  let severityCol = -1;
  let dispositionCol = -1;
  let noteCol = -1;
  let sourceCol = -1;
  header.forEach((cell, i) => {
    const name = headerName(cell);
    if (name === 'id' && idCol === -1) idCol = i;
    else if (name.startsWith('finding') && findingCol === -1) findingCol = i;
    else if (name.startsWith('severity') && severityCol === -1) severityCol = i;
    else if (name.startsWith('disposition') && dispositionCol === -1) dispositionCol = i;
    else if (name === 'note' || name === 'notes') {
      if (noteCol === -1) noteCol = i;
    } else if (name === 'source' && sourceCol === -1) sourceCol = i;
  });
  if ((idCol === -1 && findingCol === -1) || dispositionCol === -1) return null;
  return { idCol, findingCol, severityCol, dispositionCol, noteCol: noteCol !== -1 ? noteCol : sourceCol };
}

/** The first table of the body that matches, with its data rows (at most MAX_ROWS). One pass over
 * the lines; fenced code is skipped. */
function findTable(body: string): TableShape | null {
  let fence: string | null = null;
  let shape: Omit<TableShape, 'rows'> | null = null;
  let rows: string[][] = [];
  let header: string[] | null = null;
  let afterHeader = false;
  const lines = body.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.length > MAX_LINE ? rawLine.slice(0, MAX_LINE) : rawLine;
    const trimmed = line.trim();
    if (fence !== null) {
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      fence = trimmed.slice(0, 3);
      if (shape !== null) break;
      header = null;
      afterHeader = false;
      continue;
    }
    if (!trimmed.startsWith('|')) {
      // The matched table ended.
      if (shape !== null) break;
      header = null;
      afterHeader = false;
      continue;
    }
    const cells = cellsOf(trimmed);
    if (shape !== null) {
      if (rows.length >= MAX_ROWS) break;
      rows.push(cells);
      continue;
    }
    if (header === null) {
      header = cells;
      afterHeader = true;
      continue;
    }
    if (afterHeader) {
      afterHeader = false;
      if (isSeparator(cells)) {
        shape = shapeOf(header);
        rows = [];
        if (shape === null) header = null;
        continue;
      }
    }
    // Not a separator: the previous header line was not a header; this line may start a new one.
    header = cells;
    afterHeader = true;
  }
  return shape === null ? null : { ...shape, rows };
}

function cellAt(row: string[], col: number): string | undefined {
  return col >= 0 ? row[col] : undefined;
}

function rowsFromTable(table: TableShape): DispositionRow[] {
  const out: DispositionRow[] = [];
  for (const row of table.rows) {
    if (out.length >= MAX_ROWS) break;
    const idCell = plain(cellAt(row, table.idCol >= 0 ? table.idCol : table.findingCol) ?? '');
    const lead = leadingFindingId(cap(idCell, 200));
    if (lead === null) continue;
    let title: string | null;
    if (table.idCol >= 0) {
      const text = plain(cellAt(row, table.findingCol) ?? '');
      title = text === '' ? null : cap(text);
    } else {
      title = lead.title === null || lead.title === '' ? null : cap(lead.title);
    }
    const raw = cap(plain(cellAt(row, table.dispositionCol) ?? ''));
    out.push({
      id: lead.id,
      severity: severityOf(cellAt(row, table.severityCol), lead.id),
      disposition: classOf(raw),
      dispositionRaw: raw,
      title,
      note: noteOf(cellAt(row, table.noteCol)),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

function rowsFromFrontmatter(findings: unknown, table: TableShape | null): DispositionRow[] {
  if (!Array.isArray(findings)) return [];
  // Notes by id from the table (first row of an id wins).
  const notes = new Map<string, string | null>();
  if (table !== null) {
    for (const row of table.rows) {
      const lead = leadingFindingId(cap(plain(cellAt(row, table.idCol >= 0 ? table.idCol : table.findingCol) ?? ''), 200));
      if (lead !== null && !notes.has(lead.id)) notes.set(lead.id, noteOf(cellAt(row, table.noteCol)));
    }
  }
  const out: DispositionRow[] = [];
  for (const item of findings) {
    if (out.length >= MAX_ROWS) break;
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== 'string') continue;
    const id = cap(plain(entry.id), 80);
    if (id === '') continue;
    const rawDisposition = typeof entry.disposition === 'string' ? cap(plain(entry.disposition)) : '';
    const title = typeof entry.title === 'string' && entry.title.trim() !== '' ? cap(entry.title.trim()) : null;
    out.push({
      id,
      severity: severityOf(entry.severity, id),
      disposition: classOf(rawDisposition),
      dispositionRaw: rawDisposition,
      title,
      note: notes.get(id) ?? null,
    });
  }
  return out;
}

/** Never throws on a string. */
export function extractReviewDisposition(frontmatter: Record<string, unknown>, body: string): ReviewDispositionBody {
  const data = frontmatter !== null && typeof frontmatter === 'object' ? frontmatter : {};
  const text = typeof body === 'string' ? cap(body, MAX_BODY) : '';
  const stated = { open: numberOf(data.open), total: numberOf(data.total) };
  const table = findTable(text);
  const fromFrontmatter = rowsFromFrontmatter(data.findings, table);
  if (fromFrontmatter.length > 0) return { source: 'frontmatter', rows: fromFrontmatter, stated };
  if (table !== null) {
    const rows = rowsFromTable(table);
    if (rows.length > 0) return { source: 'table', rows, stated };
  }
  return { source: 'none', rows: [], stated };
}
