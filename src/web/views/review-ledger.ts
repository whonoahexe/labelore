// The review ledger's composers (Phase 9, 09-12): pure `LedgerContext` -> models. `composeLedgerHead` is the
// head the strip carries once a folder holds a second review-family file: the findings total, one row per
// severity present (critical, warning, info) with "{fixed} of {total} fixed" and a bar of status-squares,
// and the one muted line "{n} fixed in the fix report". Without a disposition no open count exists, so the
// head shows the total and the fixed counts only (D-08; the disposition-first numbers land in 09-13).
// `composeReviewLedger` is the Fix tab: one section per fix file, each with its own counts and fixed-at
// date, the entries grouped Fixed, Skipped, Deferred, and a final quiet group for entries naming a finding
// the review does not hold (D-09). `composeReviewLedger` returns the Disposition tab instead when the opened
// member is the REVIEW-DISPOSITION (09-13): rows grouped Open, Deferred, Skipped, Fixed and Other by what became
// of each finding, with the reason of a deferral or skip, the commit (or the file's own source text) of a fix
// (D-10). The head takes open and total from the disposition when one exists (D-08). No DOM, no filesystem, no rendering - `review-ledger-components.tsx` is
// the only consumer. Every string is author text the components render as React text; no url is built from
// it (the only links are the member urls the server resolved), and file paths stay chips.
// Dates are formatted by hand in UTC (via `formatStamp`) so Node and the browser agree.
import type {
  ReviewFixDeferred,
  ReviewFixEntry,
} from '../../planning-repo/handlers/review-report.ts';
import type { DispositionRow } from '../../planning-repo/handlers/review-disposition.ts';
import type { LedgerContext, LedgerFix } from '../../presentation/review-ledger.ts';
import type { ViewInput } from './manifest.ts';
import { SEVERITY_LABEL, SEVERITY_ORDER, SEVERITY_TONE, staleMarkOf } from './review-threads.ts';
import type { ComposedStaleMark, ReviewSeverityKey, ReviewTone } from './review-threads.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// The shared head
// ---------------------------------------------------------------------------

export interface ComposedLedgerHeadSeverity {
  severity: ReviewSeverityKey;
  label: string;
  /** Null until a disposition supplies it (09-13). */
  open: number | null;
  total: number;
  fixed: number;
  /** One square per finding: complete for the fixed ones, then the severity's own tone. */
  squares: ReviewTone[];
}

export interface ComposedLedgerHead {
  /** Null until a disposition supplies it (09-13). */
  open: number | null;
  total: number;
  severities: ComposedLedgerHeadSeverity[];
  /** "{n} fixed in the fix report", or "{n} open here are marked fixed in the fix report" (D-08). */
  note: string | null;
}

/** The one muted line: the disagreement count when a disposition and a fix file part ways, else (without a
 * disposition) the fixed count, else nothing (D-08). */
function headNote(context: LedgerContext): string | null {
  if (context.head.markedFixed > 0)
    return `${context.head.markedFixed} open here are marked fixed in the fix report`;
  if (context.head.open === null) return `${context.head.fixedInReport} fixed in the fix report`;
  return null;
}

/** The head over a ledger of two or more files; null for a lone file (D-11) or a missing context. */
export function composeLedgerHead(context: LedgerContext | null): ComposedLedgerHead | null {
  if (context === null || context.members.length < 2) return null;
  const severities: ComposedLedgerHeadSeverity[] = [];
  for (const severity of SEVERITY_ORDER) {
    const row = context.head.bySeverity.find((candidate) => candidate.severity === severity);
    if (!row || row.total <= 0) continue;
    const fixed = Math.min(row.fixed, row.total);
    const squares: ReviewTone[] = [];
    for (let index = 0; index < row.total; index += 1) {
      squares.push(index < fixed ? 'complete' : SEVERITY_TONE[severity]);
    }
    severities.push({
      severity,
      label: SEVERITY_LABEL[severity],
      open: row.open,
      total: row.total,
      fixed,
      squares,
    });
  }
  return {
    open: context.head.open,
    total: context.head.total,
    severities,
    note: headNote(context),
  };
}

// ---------------------------------------------------------------------------
// The Fix tab
// ---------------------------------------------------------------------------

export type FixGroupKey = 'fixed' | 'skipped' | 'deferred' | 'not-in-review';

export interface ComposedFixId {
  id: string;
  severity: ReviewSeverityKey;
}

export interface ComposedFixCommit {
  /** The first 7 characters. */
  short: string;
  full: string;
}

export interface ComposedFixRow {
  ids: ComposedFixId[];
  /** The entry's title, else the review's title for its first id, else null. */
  title: string | null;
  /** The first three files modified. */
  files: string[];
  /** The quiet disagreement chip on a fixed entry whose disposition row still says open (D-08); null elsewhere. */
  mark: ComposedStaleMark | null;
  /** How many files modified follow the first three ("+N"). */
  moreFiles: number;
  commits: ComposedFixCommit[];
  /** A skipped entry's reason or a deferred bullet's note; null elsewhere and when none is written. */
  reason: string | null;
}

export interface ComposedFixGroup {
  key: FixGroupKey;
  label: string;
  tone: ReviewTone;
  rows: ComposedFixRow[];
}

export interface ComposedFixSection {
  /** `fix-<suffix lower-cased>`, or `fix` for the unsuffixed file; the section's anchor. */
  id: string;
  /** The suffix title-cased and clamped to 24 characters; null for a single unsuffixed file. */
  heading: string | null;
  /** The full heading text (the clamped heading's title). */
  headingFull: string | null;
  fileName: string;
  url: string | null;
  /** "2 fixed, 0 skipped". */
  counts: string;
  /** The fixed-at day, or null. */
  fixedAt: string | null;
  groups: ComposedFixGroup[];
  /** True when the file lists no entry and no deferred bullet: the section shows "No fixes listed for this file.". */
  empty: boolean;
}

export interface ComposedFixLedger {
  tab: 'fix';
  /** The review's title, else null (the page then falls back to the artifact title). */
  title: string | null;
  sections: ComposedFixSection[];
  /** The id of the section the opened file's own URL names, else null. */
  scrollTo: string | null;
}

export type DispositionGroupKey = 'open' | 'deferred' | 'skipped' | 'fixed' | 'other';

export interface ComposedDispositionRow {
  id: string;
  /** The row's own severity, else the id's token; null when neither names one (the pip is then neutral). */
  severity: ReviewSeverityKey | null;
  /** The row's own title, else the review finding's title by id, else null. */
  title: string | null;
  /** Deferred and skipped: the reason in full; null elsewhere and when none is written. */
  reason: string | null;
  /** True when the reason is long enough to need the 3-line clamp and its "Read more". */
  long: boolean;
  /** Fixed: the first fix entry naming the id (first 7 characters, full in `full`); else null. */
  commit: ComposedFixCommit | null;
  /** Fixed with no commit: the disposition's own Source or Note text verbatim; else null. */
  sourceText: string | null;
  /** Fixed with neither a commit nor a source text: the row says "Commit not recorded". */
  missingCommit: boolean;
  /** Open while a fix file marks the id fixed: the quiet "Fixed in {commit}, disposition not updated" chip. */
  mark: ComposedStaleMark | null;
  /** Other: the disposition value as written. */
  raw: string | null;
}

export interface ComposedDispositionGroup {
  key: DispositionGroupKey;
  label: string;
  tone: ReviewTone;
  /** True for the quiet groups drawn with the shared dashed square (Skipped, Other); Deferred's is a solid quiet outline. */
  dashed: boolean;
  rows: ComposedDispositionRow[];
}

export interface ComposedDispositionLedger {
  tab: 'disposition';
  title: string | null;
  groups: ComposedDispositionGroup[];
}

export type ComposedReviewLedger = ComposedFixLedger | ComposedDispositionLedger;

const HEADING_CAP = 24;

function titleCase(suffix: string): string {
  return suffix
    .split('-')
    .filter((word) => word !== '')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function clamp(text: string, cap: number): string {
  return text.length <= cap ? text : `${text.slice(0, cap - 1)}…`;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (
    typeof value === 'string' &&
    value.trim() !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  ) {
    return Math.floor(Number(value));
  }
  return null;
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

function blocksText(blocks: ReviewFixEntry['note']): string | null {
  const parts: string[] = [];
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (block.kind === 'paragraph') parts.push(block.text.trim());
    else if (block.kind === 'list') parts.push(block.items.map((item) => item.trim()).join('; '));
  }
  const text = parts.filter((part) => part !== '').join(' ');
  return text === '' ? null : text;
}

function idsOf(ids: unknown, severityById: LedgerContext['severityById']): ComposedFixId[] {
  const out: ComposedFixId[] = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id === 'string' && id !== '') out.push({ id, severity: severityById[id] ?? 'info' });
  }
  return out;
}

function entriesOf(fix: LedgerFix): ReviewFixEntry[] {
  return fix.report !== null && Array.isArray(fix.report.entries) ? fix.report.entries : [];
}

function deferredOf(fix: LedgerFix): ReviewFixDeferred[] {
  return fix.report !== null && Array.isArray(fix.report.deferred) ? fix.report.deferred : [];
}

function countOutcome(entries: ReviewFixEntry[], outcome: 'fixed' | 'skipped'): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.outcome === outcome)
      count += Array.isArray(entry.ids) && entry.ids.length > 0 ? entry.ids.length : 1;
  }
  return count;
}

/** The first stale-disposition mark among a fix entry's ids, or null. */
function firstMark(context: LedgerContext, ids: ComposedFixId[]): ComposedStaleMark | null {
  for (const { id } of ids) {
    const mark = staleMarkOf(context, id);
    if (mark !== null) return mark;
  }
  return null;
}

function composeSection(
  fix: LedgerFix,
  context: LedgerContext,
  reviewIds: ReadonlySet<string>,
  titleOf: ReadonlyMap<string, string>,
  usedIds: Set<string>,
): ComposedFixSection {
  const entries = entriesOf(fix);
  const deferred = deferredOf(fix);
  const baseId = fix.suffix === null ? 'fix' : `fix-${fix.suffix.toLowerCase()}`;
  let id = baseId;
  for (let n = 2; usedIds.has(id); n += 1) id = `${baseId}-${n}`;
  usedIds.add(id);

  const fixedCount = asNumber(fix.frontmatter.fixed) ?? countOutcome(entries, 'fixed');
  const skippedCount = asNumber(fix.frontmatter.skipped) ?? countOutcome(entries, 'skipped');
  const stamp = asText(fix.frontmatter.fixed_at);

  const rowOf = (entry: ReviewFixEntry): ComposedFixRow => {
    const ids = idsOf(entry.ids, context.severityById);
    const files = Array.isArray(entry.files) ? entry.files : [];
    const commits = (
      Array.isArray(entry.commits) && entry.commits.length > 0
        ? entry.commits
        : entry.commit !== null && entry.commit !== undefined
          ? [entry.commit]
          : []
    ).map((full) => ({ short: full.slice(0, 7), full }));
    const entryTitle =
      typeof entry.title === 'string' && entry.title.trim() !== '' ? entry.title.trim() : null;
    return {
      ids,
      title: entryTitle ?? (ids.length > 0 ? (titleOf.get(ids[0].id) ?? null) : null),
      files: files.slice(0, 3),
      moreFiles: Math.max(0, files.length - 3),
      commits,
      reason: entry.outcome === 'skipped' ? blocksText(entry.note) : null,
      mark: entry.outcome === 'fixed' ? firstMark(context, ids) : null,
    };
  };

  const known = (entry: ReviewFixEntry): boolean =>
    reviewIds.size === 0 ||
    (Array.isArray(entry.ids) && entry.ids.some((entryId) => reviewIds.has(entryId)));
  const fixedRows = entries.filter((entry) => entry.outcome === 'fixed' && known(entry)).map(rowOf);
  const skippedRows = entries
    .filter((entry) => entry.outcome === 'skipped' && known(entry))
    .map(rowOf);
  const strayRows = entries.filter((entry) => !known(entry)).map(rowOf);
  const deferredRows: ComposedFixRow[] = deferred.map((item) => {
    const ids = idsOf(item.ids, context.severityById);
    return {
      ids,
      title: ids.length > 0 ? (titleOf.get(ids[0].id) ?? null) : null,
      files: [],
      moreFiles: 0,
      commits: [],
      mark: null,
      reason: typeof item.note === 'string' && item.note.trim() !== '' ? item.note.trim() : null,
    };
  });

  const groups: ComposedFixGroup[] = [];
  if (fixedRows.length > 0)
    groups.push({ key: 'fixed', label: 'Fixed', tone: 'complete', rows: fixedRows });
  if (skippedRows.length > 0)
    groups.push({ key: 'skipped', label: 'Skipped', tone: 'quiet', rows: skippedRows });
  if (deferredRows.length > 0)
    groups.push({ key: 'deferred', label: 'Deferred', tone: 'quiet', rows: deferredRows });
  if (strayRows.length > 0)
    groups.push({
      key: 'not-in-review',
      label: 'Not in the review',
      tone: 'quiet',
      rows: strayRows,
    });

  const headingFull = fix.suffix === null ? null : titleCase(fix.suffix);
  return {
    id,
    heading: headingFull === null ? null : clamp(headingFull, HEADING_CAP),
    headingFull,
    fileName: fix.fileName,
    url: fix.url,
    counts: `${fixedCount} fixed, ${skippedCount} skipped`,
    fixedAt: stamp === null ? null : formatStamp(stamp),
    groups,
    empty: entries.length === 0 && deferred.length === 0,
  };
}

// ---------------------------------------------------------------------------
// The Disposition tab
// ---------------------------------------------------------------------------

/** A reason or note longer than this (or holding a line break) gets the 3-line clamp and its "Read more". */
export const LONG_REASON = 160;

const GROUPS: { key: DispositionGroupKey; label: string; tone: ReviewTone; dashed: boolean }[] = [
  { key: 'open', label: 'Open', tone: 'in-flight', dashed: false },
  { key: 'deferred', label: 'Deferred', tone: 'quiet', dashed: false },
  { key: 'skipped', label: 'Skipped', tone: 'quiet', dashed: true },
  { key: 'fixed', label: 'Fixed', tone: 'complete', dashed: false },
  { key: 'other', label: 'Other', tone: 'quiet', dashed: true },
];

/** What a two-column disposition cell says after its leading word: "fixed (see 04-REVIEW-FIX.md)" gives
 * "(see 04-REVIEW-FIX.md)", "deferred: harmless until..." gives "harmless until...". Null when nothing follows. */
function afterWord(raw: string): string | null {
  const text = raw.trim();
  let end = 0;
  while (end < text.length && text[end] !== ' ' && text[end] !== ':' && text[end] !== '(') end += 1;
  let rest = text.slice(end);
  while (
    rest.length > 0 &&
    (rest[0] === ':' || rest[0] === ' ' || rest[0] === '-' || rest[0] === '\u2014')
  )
    rest = rest.slice(1);
  rest = rest.trim();
  return rest === '' ? null : rest;
}

function dispositionRowOf(
  row: DispositionRow,
  group: DispositionGroupKey,
  context: LedgerContext,
  titleOf: ReadonlyMap<string, string>,
): ComposedDispositionRow {
  const note = typeof row.note === 'string' && row.note.trim() !== '' ? row.note.trim() : null;
  const raw = typeof row.dispositionRaw === 'string' ? row.dispositionRaw : '';
  const severity = row.severity ?? context.severityById[row.id] ?? null;
  let reason: string | null = null;
  if (group === 'deferred' || group === 'skipped') reason = note ?? afterWord(raw);
  let commit: ComposedFixCommit | null = null;
  let sourceText: string | null = null;
  let missingCommit = false;
  if (group === 'fixed') {
    const full = context.fixedCommits[row.id] ?? null;
    if (full !== null) commit = { short: full.slice(0, 7), full };
    else {
      sourceText = note ?? afterWord(raw);
      missingCommit = sourceText === null;
    }
  }
  const rowTitle =
    typeof row.title === 'string' && row.title.trim() !== '' ? row.title.trim() : null;
  return {
    id: row.id,
    severity,
    title: rowTitle ?? titleOf.get(row.id) ?? null,
    reason,
    long: reason !== null && (reason.length > LONG_REASON || reason.includes('\n')),
    commit,
    sourceText,
    missingCommit,
    mark: group === 'open' ? staleMarkOf(context, row.id) : null,
    raw: group === 'other' ? (raw === '' ? null : raw) : null,
  };
}

function composeDispositionTab(context: LedgerContext): ComposedDispositionLedger | null {
  const rows = context.disposition?.rows ?? [];
  if (rows.length === 0) return null;
  const titleOf = new Map<string, string>();
  for (const finding of context.review?.findings ?? [])
    if (finding.title !== '') titleOf.set(finding.id, finding.title);
  const groups: ComposedDispositionGroup[] = [];
  for (const group of GROUPS) {
    const members = rows.filter((row) => row.disposition === group.key);
    if (members.length === 0) continue;
    groups.push({
      ...group,
      rows: members.map((row) => dispositionRowOf(row, group.key, context, titleOf)),
    });
  }
  return { tab: 'disposition', title: context.review?.title ?? null, groups };
}

/** The ledger's tab body: the Disposition tab when the opened member is the disposition, else the Fix tab; null
 * without a ledger context or without the opened tab's file in it. */
export function composeReviewLedger(input: ViewInput): ComposedReviewLedger | null {
  const context = input.ledgerContext ?? null;
  if (context !== null && context.active === 'disposition') return composeDispositionTab(context);
  return composeFixTab(context);
}

function composeFixTab(context: LedgerContext | null): ComposedFixLedger | null {
  if (context === null || !Array.isArray(context.fixes) || context.fixes.length === 0) return null;
  const reviewFindings = context.review?.findings ?? [];
  const reviewIds = new Set(reviewFindings.map((finding) => finding.id));
  const titleOf = new Map<string, string>();
  for (const finding of reviewFindings)
    if (finding.title !== '') titleOf.set(finding.id, finding.title);
  const usedIds = new Set<string>();
  const sections = context.fixes.map((fix) =>
    composeSection(fix, context, reviewIds, titleOf, usedIds),
  );
  let scrollTo: string | null = null;
  if (context.activeSuffix !== null) {
    const index = context.fixes.findIndex(
      (fix) =>
        fix.suffix !== null && fix.suffix.toLowerCase() === context.activeSuffix?.toLowerCase(),
    );
    if (index >= 0) scrollTo = sections[index].id;
  }
  return { tab: 'fix', title: context.review?.title ?? null, sections, scrollTo };
}
