// The WINDOWS.md ledger composer (Phase 9, 09-10): a pure `ViewInput` -> `ComposedWindowsLedger` merge of
// `structured.windows` (the rows the handler normalised, the source they came from and the counts the
// frontmatter states). It decides the intro (eyebrow, h1 and the one source-note line) and the lead band
// that always comes first: the open count, its tone and the one muted line under it. The lead counts the
// rows the file lists; only a file with no rows at all (source `frontmatter`) leads with its stated counts,
// since there is nothing to count. Under the lead sit the lists (09-11): Open (with any row whose status is
// neither open, waived nor fixed, under its raw status), Waived (each with its reason) and the Fixed history,
// each grouped by the verbatim phase string in first-appearance order ('No phase' when a row has none).
// No DOM, no filesystem access, no rendering - `windows-ledger-components.tsx` is the only consumer. The
// module imports types and `formatStamp` only. Returns `null` when the projection is missing or holds
// nothing to lead with, so a WINDOWS.md the handler could not shape keeps the generic document view and
// its existing warning chip and notice.
// T-09-20 / T-09-21: every string is author text rendered as React text by the components, and the two
// numbers a disagreement carries are never merged.
import type { WindowRow, WindowsSource, WindowsStated } from '../../planning-repo/handlers/windows.ts';
import type { ViewInput } from './manifest.ts';
import { formatStamp } from './uat-session.ts';

export type WindowsLeadTone = 'complete' | 'in-flight';

export interface ComposedWindowsIntro {
  eyebrow: 'Broken windows';
  title: 'Broken windows ledger';
  /** The one source-note line under the h1. */
  note: string;
}

export interface ComposedWindowsLead {
  open: number;
  fixed: number;
  waived: number;
  total: number;
  /** The day of the latest fix ("24 Oct 2026"), or null when no fixed row carries a resolved date. */
  lastFixed: string | null;
  /** `complete` at zero open, `in-flight` otherwise. */
  tone: WindowsLeadTone;
  /** The muted line under the number. */
  sentence: string;
}

export type WindowsRowTone = 'in-flight' | 'quiet' | 'complete';

export interface ComposedWindowsRow {
  /** The id as written; empty when the row has none. */
  id: string;
  /** The kind chip text: the kind verbatim, or the raw status for a row that is neither open, waived nor fixed. */
  chip: string;
  description: string;
  /** True when the description is long enough to need the 3-line clamp and its "Read more". */
  long: boolean;
  /** "file:line" (line omitted when empty), or null when the row names no file. */
  place: string | null;
  /** "Recorded" day, or null. */
  recorded: string | null;
  /** "Fixed" day for a fixed row, or null. */
  resolved: string | null;
  /** True for a waived row (its reason, or the line saying there is none, is shown). */
  waived: boolean;
  /** A waived row's reason; null when it states none. Always null for other rows. */
  reason: string | null;
  tone: WindowsRowTone;
}

export interface ComposedWindowsGroup {
  /** The phase string verbatim, or 'No phase'. */
  phase: string;
  rows: ComposedWindowsRow[];
}

export interface ComposedWindowsList {
  groups: ComposedWindowsGroup[];
  /** Rows listed across the groups. */
  count: number;
  /** The one empty-note line when no row is listed ("Nothing open."), else null. */
  empty: string | null;
}

export interface ComposedWindowsFixed {
  groups: ComposedWindowsGroup[];
  count: number;
}

export interface ComposedWindowsLedger {
  intro: ComposedWindowsIntro;
  lead: ComposedWindowsLead;
  /** The counts-disagree line shown above the lead, or null. */
  notice: string | null;
  /** Open rows, plus any row whose status is neither open, waived nor fixed. */
  open: ComposedWindowsList;
  waived: ComposedWindowsList;
  /** The Fixed history, folded by phase; null when the ledger lists no fixed row. */
  fixed: ComposedWindowsFixed | null;
}

export const NO_PHASE = 'No phase';
export const NO_KIND = 'No kind';
export const NO_STATUS = 'No status';
/** A description longer than this (or holding a line break) gets the 3-line clamp and its "Read more". */
export const LONG_DESCRIPTION = 160;

export const WINDOWS_NOTE = 'Defects that were deferred, waived or not yet checked, across every phase.';

interface WindowsReading {
  rows: WindowRow[];
  source: WindowsSource;
  stated: WindowsStated;
  disagreement: { stated: number; listed: number } | null;
}

/** The line above the lead when the file's stated open count differs from the open rows it lists. */
export function disagreementNotice(disagreement: { stated: number; listed: number }): string {
  return `This file's counts disagree with its rows: it says ${disagreement.stated} open, the ledger lists ${disagreement.listed}. The rows are shown.`;
}

function countOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

/** `structured.windows` as the composer needs it, or null for a payload from a server that predates it. */
function readingOf(structured: Record<string, unknown>): WindowsReading | null {
  const windows = structured.windows;
  if (typeof windows !== 'object' || windows === null) return null;
  const { rows, source, stated, disagreement } = windows as Record<string, unknown>;
  if (!Array.isArray(rows)) return null;
  const known = source === 'json' || source === 'table' || source === 'frontmatter' || source === 'none';
  if (!known) return null;
  const s = (typeof stated === 'object' && stated !== null ? stated : {}) as Record<string, unknown>;
  const d = (typeof disagreement === 'object' && disagreement !== null ? disagreement : {}) as Record<string, unknown>;
  const said = countOf(d.stated);
  const listed = countOf(d.listed);
  return {
    rows: rows.filter((row): row is WindowRow => typeof row === 'object' && row !== null),
    source,
    stated: { open: countOf(s.open), waived: countOf(s.waived), fixed: countOf(s.fixed), total: countOf(s.total) },
    disagreement: said !== null && listed !== null ? { stated: said, listed } : null,
  };
}

function isDay(text: string): boolean {
  if (text.length < 10) return false;
  for (let i = 0; i < 10; i += 1) {
    const code = text.charCodeAt(i);
    const digit = code >= 48 && code <= 57;
    if (i === 4 || i === 7 ? code !== 45 : !digit) return false;
  }
  return true;
}

/** The day of the latest resolved stamp among the fixed rows, formatted; null when none parses. */
function lastFixedOf(rows: readonly WindowRow[]): string | null {
  let latest: { time: number; text: string } | null = null;
  for (const row of rows) {
    if (row.status !== 'fixed' || typeof row.resolvedAt !== 'string') continue;
    const time = Date.parse(row.resolvedAt);
    if (Number.isNaN(time)) continue;
    if (latest === null || time > latest.time) latest = { time, text: row.resolvedAt };
  }
  if (latest === null) return null;
  return formatStamp(isDay(latest.text) ? latest.text.slice(0, 10) : latest.text);
}

/** The lead's muted line: "{f} fixed, last on {date}", "{w} waived" and "{t} in total" (each only when it
 * has something to say); at zero open, "Nothing open." then the fixed and waived clauses. */
function sentenceOf(lead: Omit<ComposedWindowsLead, 'sentence'>): string {
  const fixed =
    lead.fixed > 0 ? (lead.lastFixed !== null ? `${lead.fixed} fixed, last on ${lead.lastFixed}` : `${lead.fixed} fixed`) : null;
  const waived = lead.waived > 0 ? `${lead.waived} waived` : null;
  if (lead.open === 0) {
    return ['Nothing open.', fixed === null ? null : `${fixed}.`, waived === null ? null : `${waived}.`]
      .filter((part): part is string => part !== null)
      .join(' ');
  }
  return [fixed, waived, `${lead.total} in total`].filter((part): part is string => part !== null).join(' · ');
}

/** The day of a stamp ("2026-06-02T09:14:03Z" -> "2 Jun 2026"); the text as written when it is no date. */
function dayText(text: string | null): string | null {
  if (text === null || text.trim() === '') return null;
  return formatStamp(isDay(text) ? text.slice(0, 10) : text);
}

function rowOf(row: WindowRow, tone: WindowsRowTone): ComposedWindowsRow {
  const file = row.file !== null && row.file.trim() !== '' ? row.file : null;
  const kind = row.status === 'other' ? row.statusRaw.trim() || NO_STATUS : row.kind.trim() || NO_KIND;
  const reason = row.status === 'waived' && row.reason !== null && row.reason.trim() !== '' ? row.reason : null;
  return {
    id: row.id,
    chip: kind,
    description: row.description,
    long: row.description.length > LONG_DESCRIPTION || row.description.includes('\n'),
    place: file === null ? null : row.line === null ? file : `${file}:${row.line}`,
    recorded: dayText(row.recordedAt),
    resolved: row.status === 'fixed' ? dayText(row.resolvedAt) : null,
    waived: row.status === 'waived',
    reason,
    tone,
  };
}

/** Rows grouped by the verbatim phase string, groups in the order each phase first appears. */
function groupsOf(rows: readonly WindowRow[], toneOf: (row: WindowRow) => WindowsRowTone): ComposedWindowsGroup[] {
  const groups: ComposedWindowsGroup[] = [];
  const byPhase = new Map<string, ComposedWindowsGroup>();
  for (const row of rows) {
    const phase = row.phase !== null && row.phase.trim() !== '' ? row.phase : NO_PHASE;
    let group = byPhase.get(phase);
    if (group === undefined) {
      group = { phase, rows: [] };
      byPhase.set(phase, group);
      groups.push(group);
    }
    group.rows.push(rowOf(row, toneOf(row)));
  }
  return groups;
}

function listOf(rows: readonly WindowRow[], toneOf: (row: WindowRow) => WindowsRowTone, empty: string): ComposedWindowsList {
  return { groups: groupsOf(rows, toneOf), count: rows.length, empty: rows.length === 0 ? empty : null };
}

function listsOf(rows: readonly WindowRow[]): Pick<ComposedWindowsLedger, 'open' | 'waived' | 'fixed'> {
  const openRows = rows.filter((row) => row.status === 'open' || row.status === 'other');
  const waivedRows = rows.filter((row) => row.status === 'waived');
  const fixedRows = rows.filter((row) => row.status === 'fixed');
  return {
    open: listOf(openRows, (row) => (row.status === 'open' ? 'in-flight' : 'quiet'), 'Nothing open.'),
    waived: listOf(waivedRows, () => 'quiet', 'Nothing waived.'),
    fixed: fixedRows.length === 0 ? null : { groups: groupsOf(fixedRows, () => 'complete'), count: fixedRows.length },
  };
}

function leadOf(reading: WindowsReading): ComposedWindowsLead | null {
  if (reading.source === 'frontmatter') {
    const { open, waived, fixed, total } = reading.stated;
    const openCount =
      open ?? (total !== null && waived !== null && fixed !== null ? Math.max(0, total - waived - fixed) : null);
    if (openCount === null) return null;
    const base = {
      open: openCount,
      fixed: fixed ?? 0,
      waived: waived ?? 0,
      total: total ?? openCount + (fixed ?? 0) + (waived ?? 0),
      lastFixed: null,
      tone: openCount === 0 ? ('complete' as const) : ('in-flight' as const),
    };
    return { ...base, sentence: sentenceOf(base) };
  }
  if (reading.source === 'none') return null;
  const count = (status: WindowRow['status']): number => reading.rows.filter((row) => row.status === status).length;
  const open = count('open');
  const base = {
    open,
    fixed: count('fixed'),
    waived: count('waived'),
    total: reading.rows.length,
    lastFixed: lastFixedOf(reading.rows),
    tone: open === 0 ? ('complete' as const) : ('in-flight' as const),
  };
  return { ...base, sentence: sentenceOf(base) };
}

export const NOT_LISTED = 'The file states this count but lists no rows.';

/** A file with counts and no rows leads with its stated numbers; an empty group under a stated count above zero
 * says the rows are not listed, rather than "Nothing open." beside a lead that says otherwise. */
function unlistedCounts(
  lists: Pick<ComposedWindowsLedger, 'open' | 'waived' | 'fixed'>,
  reading: WindowsReading,
  lead: ComposedWindowsLead,
): Pick<ComposedWindowsLedger, 'open' | 'waived' | 'fixed'> {
  if (reading.source !== 'frontmatter') return lists;
  return {
    ...lists,
    open: lead.open > 0 ? { ...lists.open, empty: NOT_LISTED } : lists.open,
    waived: lead.waived > 0 ? { ...lists.waived, empty: NOT_LISTED } : lists.waived,
  };
}

export function composeWindowsLedger(input: ViewInput): ComposedWindowsLedger | null {
  const reading = readingOf(input.structured);
  if (reading === null) return null;
  const lead = leadOf(reading);
  if (lead === null) return null;
  return {
    intro: { eyebrow: 'Broken windows', title: 'Broken windows ledger', note: WINDOWS_NOTE },
    lead,
    notice: reading.disagreement === null ? null : disagreementNotice(reading.disagreement),
    ...unlistedCounts(listsOf(reading.rows), reading, lead),
  };
}
