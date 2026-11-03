// WINDOWS.md — the broken-windows ledger. Triple-encoded (YAML frontmatter counts, a
// human-readable markdown table, and a fenced ```json block repeating the same rows); the fenced
// JSON block is preferred over the markdown table when both are present, since it's the
// authoritative-shaped source and the two encode identical rows.
//
// The fence is found by a line scan, not a regular expression: GSD writes the block inside a run of
// four backticks, and an opening run of N backticks closes only at a run of at least N, so a
// description that holds three backticks inside a four-backtick fence stays whole (09-10).
//
// `structured.rows` and `structured.rowSource` keep their original meaning (the raw rows and where they
// came from). `structured.windows` is the normalised reading the ledger page draws from: typed rows, the
// source the rows came from, and the counts the frontmatter states. It is built in its own try/catch,
// so a ledger the normaliser cannot shape leaves `rows` and `rowSource` as they were.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter, tryParseJson } from '../frontmatter.ts';
import type { JsonParseResult } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parseMarkdownTable } from './markdown-sections.ts';

/** The most rows the normalised reading keeps. */
export const MAX_WINDOW_ROWS = 2000;
/** The longest description or reason the normalised reading keeps. */
export const MAX_WINDOW_TEXT = 4000;

export type WindowStatus = 'open' | 'waived' | 'fixed' | 'other';
export type WindowsSource = 'json' | 'table' | 'frontmatter' | 'none';

export interface WindowRow {
  id: string;
  /** The phase as written ("01", "quick/260402-t8m"), or null when blank or "-". */
  phase: string | null;
  kind: string;
  file: string | null;
  line: number | null;
  description: string;
  status: WindowStatus;
  /** The status as written, so an unknown value can be shown verbatim. */
  statusRaw: string;
  reason: string | null;
  recordedAt: string | null;
  resolvedAt: string | null;
}

/** The counts the frontmatter states; null for a count it does not state as a number. */
export interface WindowsStated {
  open: number | null;
  waived: number | null;
  fixed: number | null;
  total: number | null;
}

export interface WindowsStructure {
  rows: WindowRow[];
  source: WindowsSource;
  stated: WindowsStated;
  /** Set when the frontmatter states an open count that differs from the open rows the ledger lists: both
   * numbers, never merged. Null when they agree, when no open count is stated or when there are no rows. */
  disagreement: { stated: number; listed: number } | null;
}

/** The length of the leading backtick run of a trimmed line, or 0 when the line is not a fence line
 * of that shape. With `onlyTicks`, the whole line must be backticks (a closing fence). */
function backtickRun(trimmed: string, onlyTicks: boolean): number {
  let run = 0;
  while (run < trimmed.length && trimmed.charCodeAt(run) === 96) run += 1;
  if (run === 0) return 0;
  return onlyTicks && run !== trimmed.length ? 0 : run;
}

/** Returns null when no fenced json block is present at all — distinct from a present-but-malformed block, whose JsonParseResult (including its warning) is returned instead.
 * One linear pass over the lines: an opening line is a run of three or more backticks followed by
 * `json`; the block closes at the next line made only of a run at least as long. An opening with no
 * closing line is no block. */
function extractFencedJson(body: string): JsonParseResult | null {
  const lines = body.split('\n');
  let openRun = 0;
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (start < 0) {
      const run = backtickRun(trimmed, false);
      if (run >= 3 && trimmed.slice(run).trim().toLowerCase() === 'json') {
        openRun = run;
        start = i + 1;
      }
      continue;
    }
    if (backtickRun(trimmed, true) >= openRun) return tryParseJson(lines.slice(start, i).join('\n'));
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A cell as trimmed text: blank and "-" are null, a finite number is its digits, anything else is null. */
function cellText(value: unknown, cap: number): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text === '' || text === '-') return null;
  return text.length > cap ? text.slice(0, cap) : text;
}

function lineNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : null;
  const text = cellText(value, 12);
  if (text === null) return null;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 48 || code > 57) return null;
  }
  return Number(text);
}

function statusOf(raw: string): WindowStatus {
  const lower = raw.toLowerCase();
  return lower === 'open' || lower === 'waived' || lower === 'fixed' ? lower : 'other';
}

function normaliseRow(record: Record<string, unknown>): WindowRow {
  const statusRaw = cellText(record.status, 80) ?? '';
  return {
    id: cellText(record.id, 80) ?? '',
    phase: cellText(record.phase, 200),
    kind: cellText(record.kind, 200) ?? '',
    file: cellText(record.file, 1000),
    line: lineNumber(record.line),
    description: cellText(record.description, MAX_WINDOW_TEXT) ?? '',
    status: statusOf(statusRaw),
    statusRaw,
    reason: cellText(record.reason, MAX_WINDOW_TEXT),
    recordedAt: cellText(record.recorded_at, 80),
    resolvedAt: cellText(record.resolved_at, 80),
  };
}

function normaliseRows(rows: readonly unknown[]): WindowRow[] {
  const out: WindowRow[] = [];
  for (const row of rows) {
    if (out.length >= MAX_WINDOW_ROWS) break;
    if (isRecord(row)) out.push(normaliseRow(row));
  }
  return out;
}

function statedCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function buildWindows(
  jsonRows: readonly unknown[] | null,
  tableRows: readonly unknown[],
  data: Record<string, unknown>,
): WindowsStructure {
  const stated: WindowsStated = {
    open: statedCount(data.open_count),
    waived: statedCount(data.waived_count),
    fixed: statedCount(data.fixed_count),
    total: statedCount(data.total_count),
  };
  // The fenced JSON first, then the table, then the frontmatter counts alone (Pitfall 8).
  const fromJson = jsonRows !== null && jsonRows.length > 0 ? normaliseRows(jsonRows) : [];
  if (fromJson.length > 0) return withDisagreement({ rows: fromJson, source: 'json', stated });
  const fromTable = tableRows.length > 0 ? normaliseRows(tableRows) : [];
  if (fromTable.length > 0) return withDisagreement({ rows: fromTable, source: 'table', stated });
  const anyStated = Object.values(stated).some((count) => count !== null);
  return { rows: [], source: anyStated ? 'frontmatter' : 'none', stated, disagreement: null };
}

/** Compares the stated open count with the open rows listed. The page leads with the rows; a difference is
 * carried as both numbers so it can be said, never merged (T-09-21). */
function withDisagreement(reading: Omit<WindowsStructure, 'disagreement'>): WindowsStructure {
  const listed = reading.rows.filter((row) => row.status === 'open').length;
  const stated = reading.stated.open;
  return { ...reading, disagreement: stated !== null && stated !== listed ? { stated, listed } : null };
}

export const WindowsHandler: ArtifactHandler = {
  kind: 'windows',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'WINDOWS.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);

    const jsonResult = extractFencedJson(fm.body);
    const fencedRows = jsonResult && Array.isArray(jsonResult.data) ? (jsonResult.data as unknown[]) : null;
    // The table is read unless the fence already holds rows; an empty fence still lets the table speak
    // for the normalised reading, while `rows` and `rowSource` keep the fence as the source.
    const tableRows = fencedRows !== null && fencedRows.length > 0 ? [] : parseMarkdownTable(fm.body);
    const rows = fencedRows ?? tableRows;

    let windows: WindowsStructure | undefined;
    try {
      windows = buildWindows(fencedRows, tableRows, fm.data);
    } catch {
      windows = undefined;
    }

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      // A malformed fenced JSON block is the authoritative-shaped source failing to parse — that
      // warning must surface even though the table fallback silently produces usable rows.
      // Frontmatter-stage failures take priority when both occur (fm.warning first).
      warning: fm.warning ?? jsonResult?.warning,
      structured: { rows, rowSource: fencedRows ? 'json' : 'table', ...(windows ? { windows } : {}) },
    };
  },
};
