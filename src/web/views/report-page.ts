// The report page's composer (Phase 11, 11-24, VIEW-18, D-03, sketch 059 winner A "Time ruler"): a pure `ViewInput` ->
// `ComposedReport` merge of the report lift (11-20's `structured.report`) and the document's own rendered sections. One frame
// serves both report kinds (the 11-17 checkpoint: "one frame"): a card of headline numerals over a ruler, then two columns.
// The page answers "what did it deliver, and what is still open?".
//
// Session report (`SESSION_REPORT.md`, `{date}-session-report.md`):
//   - the head: the eyebrow "Session report", the file's own title as the h1, "Generated {stamp}" and the project and
//     milestone as meta;
//   - the headline numbers "Duration", "Commits" and "Plans" as three Heading numerals, each shown exactly as the report
//     wrote it (free text such as "Single session" is kept; the parenthetical a value ends with, the commit stamps or the plan
//     ids, sits beside it as meta and the two together are the file's text again, RESEARCH C10). A line the report lacks draws
//     no numeral: the page never turns free text into a number it cannot read and never writes a 0;
//   - the ruler: a 24 hour axis with a bar from the first to the last commit when the Duration stamps read, a dashed empty
//     axis carrying the Duration text when they do not; under it a phase strip (one cell per phase of the milestone, the first
//     N done where the progress sentence says N of the total, the touched ones ringed) and the progress sentence itself;
//   - two columns: Key outcomes, Phases touched and Decisions against Blockers and open items (`in-flight`) over the Files
//     Changed and Estimated Resource Usage folds. A report with no blockers draws no blockers block and no "none" line.
// Milestone summary (`MILESTONE_SUMMARY-v{V}.md`):
//   - the five Stats as the numerals (each as written) and a calendar ruler (start to end, a numbered mark where each phase was
//     delivered) when the Timeline stat and the delivered dates read;
//   - two columns: Phases delivered rows and Tech debt and deferred against Requirements coverage (marks) and Key decisions;
//     every other numbered section is a closed bar, and a section index of chips keeps all of them reachable in order.
// Sections the page does not compose stay reachable through the document's own sanitised HTML as plain sections or closed bars.
// The composer holds no DOM, no filesystem access, no rendering, no regular expression and no module-level mutable state; it
// reads no clock. It returns `null` when the report lift is missing, so the page keeps the promoted-section view with no
// notice (Phase 10 C1, X2). T-11-38: every string is author text rendered as React text by the components, and a section the
// page does not compose goes through the document's already-sanitised HTML.
import type { DocumentSectionGroup } from './document-sections.ts';
import type { ViewInput } from './manifest.ts';

export const REPORT_EYEBROW_SESSION = 'Session report';
export const REPORT_EYEBROW_MILESTONE = 'Milestone summary';
export const DURATION_LABEL = 'Duration';
export const COMMITS_LABEL = 'Commits';
export const PLANS_LABEL = 'Plans';
export const KEY_OUTCOMES_LABEL = 'Key outcomes';
export const PHASES_TOUCHED_LABEL = 'Phases touched';
export const DECISIONS_LABEL = 'Decisions';
export const BLOCKERS_LABEL = 'Blockers and open items';
export const FILES_CHANGED_LABEL = 'Files changed';
export const RESOURCE_USAGE_LABEL = 'Estimated resource usage';
export const PHASE_PROGRESS_LABEL = 'Phase progress';
export const PHASES_DELIVERED_LABEL = 'Phases delivered';
export const REQUIREMENTS_LABEL = 'Requirements coverage';
export const KEY_DECISIONS_LABEL = 'Key decisions';
export const TECH_DEBT_LABEL = 'Tech debt and deferred';
export const STATS_LABEL = 'Stats';
export const COVERED_WORD = 'Covered';
export const NOT_COVERED_WORD = 'Not covered';

/** A numeral longer than this is drawn at body size: a long free-text value must wrap, not shout. */
export const NUMERAL_LONG = 16;
/** The most plan ids drawn as chips. */
const CHIP_CAP = 24;
/** The most phase cells the strip draws; a longer milestone draws the shared status-meter instead. */
export const PHASE_STRIP_MAX = 12;
/** The most ids one requirement bullet expands to, and the most squares a page draws. */
const ID_RANGE_CAP = 100;
const ID_LIST_CAP = 200;
const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_TICK_CAP = 12;

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface ReportNumeral {
  key: string;
  /** The label above the numeral; '' when the file's stat has no label. */
  label: string;
  /** The value as the report wrote it, up to a closing parenthetical. */
  main: string;
  /** The text of that closing parenthetical, else null. `${main} (${note})` is the report's own text again. */
  note: string | null;
  /** The plan ids when the note is a short comma list of them; the note is then drawn as chips, not as text. */
  chips: string[];
  /** The value is long free text, drawn at body size. */
  long: boolean;
}

export interface ComposedReportHead {
  eyebrow: string;
  /** The report's own title; null leaves the file's title. */
  title: string | null;
  generated: string | null;
  /** The context line: the project and the milestone (session), or the purpose (milestone), else null. */
  context: string | null;
}

/** A section the page does not compose, shown through the document's own sanitised HTML. */
export interface ReportRawSection {
  key: string;
  /** The element id the section index jumps to. */
  id: string;
  title: string;
  /** The rendered section, its own heading still on it (the component strips it). */
  html: string;
}

export interface ReportTimeMark {
  key: string;
  /** The label in the mark: the phase cell as written (three characters at most), else a dot. */
  number: string;
  /** The `MM-DD` text under the mark. */
  date: string;
  /** 0 to 1 along the axis. */
  at: number;
  edge: 'start' | 'end' | null;
}

export type ComposedRuler =
  | { kind: 'clock'; label: string; from: string; to: string; fromAt: number; toAt: number }
  | { kind: 'none'; label: string; text: string }
  | {
      kind: 'calendar';
      label: string;
      from: string;
      to: string;
      months: { key: string; name: string; at: number }[];
      marks: ReportTimeMark[];
    };

export interface ReportPhaseCell {
  key: string;
  /** "Phase 2" when the strip can number its phases, else the ordinal "2". */
  label: string;
  done: boolean;
  touched: boolean;
}

export interface ComposedProgress {
  /** The report's own progress sentence. */
  sentence: string;
  /** How many phases are done and how many there are, read from the sentence; null when it does not read. */
  done: number | null;
  total: number | null;
  /** One cell per phase (up to PHASE_STRIP_MAX); null when the counts did not read or there are too many. */
  cells: ReportPhaseCell[] | null;
}

export interface ReportBlocker {
  key: string;
  /** The `[Phase N]` tag the bullet starts with, as written inside the brackets, else null. */
  tag: string | null;
  text: string;
}

export interface ReportFileDir {
  key: string;
  /** The backticked path the bullet starts with, else null. */
  path: string | null;
  text: string;
}

export interface ComposedFiles {
  /** The counts sentence as written. */
  summary: string | null;
  /** "43 files", read from the sentence. */
  count: string | null;
  insertions: number | null;
  deletions: number | null;
  dirs: ReportFileDir[];
}

export interface ComposedUsage {
  rows: { key: string; metric: string; estimate: string }[];
}

export interface ComposedSessionReport {
  variant: 'session';
  head: ComposedReportHead;
  numerals: ReportNumeral[];
  ruler: ComposedRuler | null;
  progress: ComposedProgress | null;
  outcomes: { key: string; text: string }[];
  touched: { key: string; text: string }[];
  decisions: { items: { key: string; text: string }[]; note: string | null };
  blockers: ReportBlocker[];
  files: ComposedFiles | null;
  usage: ComposedUsage | null;
  /** Sections of the document the page does not compose, as closed bars after the page. */
  more: ReportRawSection[];
}

export interface ReportPhaseRow {
  key: string;
  number: string;
  name: string;
  /** The status as the file wrote it up to its parenthetical (`Complete`), and the date text inside it. */
  status: string;
  date: string | null;
  tone: 'complete' | 'quiet';
  oneLiner: string;
}

export interface ReportRequirementRow {
  key: string;
  name: string;
  /** Every id the bullet names, ranges expanded; the bullet's own text as one entry when it does not read. */
  ids: string[];
  /** `Phase 1` as written, else null. */
  phase: string | null;
  /** `complete` for a check mark, `quiet` for a cross mark or no mark. */
  tone: 'complete' | 'quiet';
  /** "Covered" for a check mark, "Not covered" for a cross mark; null when the bullet has no mark. */
  word: string | null;
}

export interface ReportDecisionBar {
  key: string;
  label: string;
  count: number;
  /** count over the largest count, 0 to 1. */
  fill: number;
}

export interface ReportDecisionRow {
  key: string;
  id: string;
  phase: string;
  decision: string;
  rationale: string;
}

export interface ReportIndexChip {
  key: string;
  /** The element id to jump to. */
  target: string;
  number: string;
  label: string;
}

export interface ComposedMilestoneReport {
  variant: 'milestone';
  head: ComposedReportHead;
  numerals: ReportNumeral[];
  ruler: ComposedRuler | null;
  /** Every section the page draws, in the file's order. */
  index: ReportIndexChip[];
  phases: ReportPhaseRow[];
  requirements: { rows: ReportRequirementRow[]; verdict: string | null };
  decisions: { bars: ReportDecisionBar[]; rows: ReportDecisionRow[] };
  /** The Tech debt section as a plain section, through the document's own HTML. */
  debt: ReportRawSection | null;
  /** The numbered sections the page does not compose, as closed bars, in the file's order. */
  bars: (ReportRawSection & { number: string })[];
  /** Phases delivered, Requirements coverage or Key decisions when the lift held no rows for them: a plain document section. */
  plain: ReportRawSection[];
  /** The id the stats card carries, for the "Stats" chip. */
  statsId: string;
  /** The ids of the composed sections (the section index jumps to them); null when the section is not composed. */
  anchors: { phases: string | null; requirements: string | null; decisions: string | null };
}

export type ComposedReport = ComposedSessionReport | ComposedMilestoneReport;

// ---------------------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------------------

/** A value split at a closing parenthetical that follows a space: `~5 hours (first commit ...)` gives the text before it
 * and the text inside. A value with no such parenthetical (a bare number, `deletions(-)`) is returned whole. */
export function splitHeadline(text: string): { main: string; note: string | null } {
  const value = text.trim();
  if (!value.endsWith(')')) return { main: value, note: null };
  let depth = 0;
  for (let at = value.length - 1; at >= 0; at -= 1) {
    const ch = value[at];
    if (ch === ')') depth += 1;
    else if (ch === '(') {
      depth -= 1;
      if (depth === 0) {
        const main = value.slice(0, at).trim();
        const note = value.slice(at + 1, -1).trim();
        if (at === 0 || value[at - 1] !== ' ' || main === '' || note === '') return { main: value, note: null };
        return { main, note };
      }
    }
  }
  return { main: value, note: null };
}

function planChips(note: string | null): string[] {
  if (note === null) return [];
  const parts = note
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  if (parts.length === 0 || parts.length > CHIP_CAP) return [];
  return parts.every((part) => part.length <= 24 && !part.includes(' ')) ? parts : [];
}

function numeralOf(key: string, label: string, text: string | null, withChips: boolean): ReportNumeral | null {
  if (text === null || text.trim() === '') return null;
  const { main, note } = splitHeadline(text);
  const chips = withChips ? planChips(note) : [];
  return { key, label, main, note: chips.length > 0 ? null : note, chips, long: main.length > NUMERAL_LONG };
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function isDigits(text: string): boolean {
  if (text === '') return false;
  for (let at = 0; at < text.length; at += 1) if (!isDigit(text.charCodeAt(at))) return false;
  return true;
}

function trimPunctuation(word: string): string {
  let start = 0;
  let end = word.length;
  const edge = (ch: string): boolean => ch === ',' || ch === '.' || ch === ';' || ch === ':' || ch === '(' || ch === ')' || ch === '*';
  while (start < end && edge(word[start])) start += 1;
  while (end > start && edge(word[end - 1])) end -= 1;
  return word.slice(start, end);
}

function wordsOf(text: string): string[] {
  const words: string[] = [];
  for (const line of text.split('\n')) {
    for (const piece of line.split(' ')) {
      const word = trimPunctuation(piece);
      if (word !== '') words.push(word);
    }
  }
  return words;
}

/** "N of the M ... phases" or "N of M phases" in a progress sentence: how many phases are done and how many there are. The
 * pair must have a word starting "phase" within three words after the total, so "6 of 6 plans" is not read as phases. */
export function phaseCounts(sentence: string): { done: number; total: number } | null {
  const words = wordsOf(sentence);
  for (let at = 0; at + 2 < words.length; at += 1) {
    if (!isDigits(words[at]) || words[at].length > 4 || words[at + 1] !== 'of') continue;
    let next = at + 2;
    if (words[next] === 'the') next += 1;
    const total = words[next];
    if (total === undefined || !isDigits(total) || total.length > 4) continue;
    const near = words.slice(next + 1, next + 4);
    if (!near.some((word) => word.toLowerCase().startsWith('phase'))) continue;
    const done = Number(words[at]);
    const count = Number(total);
    if (count >= 1 && done <= count) return { done, total: count };
  }
  return null;
}

/** The integer in the digit run (commas allowed) that ends just before the first `word` in `text`, else null. */
export function numberBefore(text: string, word: string): number | null {
  const at = text.toLowerCase().indexOf(word);
  if (at < 0) return null;
  let end = at;
  while (end > 0 && text[end - 1] === ' ') end -= 1;
  let start = end;
  while (start > 0 && (isDigit(text.charCodeAt(start - 1)) || text[start - 1] === ',')) start -= 1;
  const digits = text.slice(start, end).split(',').join('');
  return isDigits(digits) && digits.length <= 9 ? Number(digits) : null;
}

/** The number after `Phase ` at the start of a bullet (`**Phase 2 - Roles**` and `Phase 2` both read), else null. */
function phaseNumberOf(item: string): number | null {
  let text = item.trim();
  while (text.startsWith('*') || text.startsWith('_')) text = text.slice(1);
  if (!text.toLowerCase().startsWith('phase ')) return null;
  let end = 6;
  while (end < text.length && isDigit(text.charCodeAt(end))) end += 1;
  const digits = text.slice(6, end);
  return isDigits(digits) && digits.length <= 4 ? Number(digits) : null;
}

/** The `HH:MM` that follows the first `marker` in `text` (case-insensitive), else null. */
function timeAfter(text: string, marker: string): { text: string; fraction: number } | null {
  const at = text.toLowerCase().indexOf(marker);
  if (at < 0) return null;
  for (let i = at + marker.length; i + 4 < text.length; i += 1) {
    if (
      isDigit(text.charCodeAt(i)) &&
      isDigit(text.charCodeAt(i + 1)) &&
      text[i + 2] === ':' &&
      isDigit(text.charCodeAt(i + 3)) &&
      isDigit(text.charCodeAt(i + 4))
    ) {
      const hour = Number(text.slice(i, i + 2));
      const minute = Number(text.slice(i + 3, i + 5));
      if (hour > 23 || minute > 59) return null;
      return { text: text.slice(i, i + 5), fraction: (hour + minute / 60) / 24 };
    }
  }
  return null;
}

/** The `YYYY-MM-DD` days found in `text`, in order. */
export function isoDaysIn(text: string): string[] {
  const days: string[] = [];
  for (let at = 0; at + 10 <= text.length && days.length < 8; at += 1) {
    if (at > 0 && isDigit(text.charCodeAt(at - 1))) continue;
    const chunk = text.slice(at, at + 10);
    if (chunk.charCodeAt(4) !== 45 || chunk.charCodeAt(7) !== 45) continue;
    let ok = true;
    for (const index of [0, 1, 2, 3, 5, 6, 8, 9]) if (!isDigit(chunk.charCodeAt(index))) ok = false;
    if (ok && !Number.isNaN(Date.parse(chunk))) {
      days.push(chunk);
      at += 9;
    }
  }
  return days;
}

function dayNumber(iso: string): number {
  return Math.round(Date.parse(iso) / MS_PER_DAY);
}

/** `MEMB-01 ... MEMB-05` as MEMB-01 to MEMB-05, a comma list as its entries; text that does not read comes back as one entry. */
export function expandIds(text: string): string[] {
  const whole = text.trim();
  if (whole === '') return [];
  const out: string[] = [];
  for (const part of whole.split(',')) {
    const piece = part.trim();
    if (piece === '') continue;
    let separator = '';
    for (const candidate of ['...', '…', '..']) {
      if (piece.includes(candidate)) {
        separator = candidate;
        break;
      }
    }
    if (separator === '') {
      out.push(piece);
      continue;
    }
    const sides = piece.split(separator);
    const left = (sides[0] ?? '').trim();
    const right = (sides[1] ?? '').trim();
    const leftDash = left.lastIndexOf('-');
    const rightDash = right.lastIndexOf('-');
    const prefix = leftDash >= 0 ? left.slice(0, leftDash) : '';
    const from = leftDash >= 0 ? left.slice(leftDash + 1) : '';
    const to = rightDash >= 0 ? right.slice(rightDash + 1) : '';
    const rightPrefix = rightDash >= 0 ? right.slice(0, rightDash) : '';
    if (sides.length !== 2 || leftDash < 0 || rightDash < 0 || prefix !== rightPrefix || !isDigits(from) || !isDigits(to)) {
      out.push(piece);
      continue;
    }
    const first = Number(from);
    const last = Number(to);
    if (last < first || last - first >= ID_RANGE_CAP) {
      out.push(piece);
      continue;
    }
    for (let n = first; n <= last; n += 1) out.push(`${prefix}-${String(n).padStart(from.length, '0')}`);
  }
  return out.length > ID_LIST_CAP ? [whole] : out;
}

function sameHeading(heading: string | null, wanted: string): boolean {
  return heading !== null && heading.trim().toLowerCase() === wanted.trim().toLowerCase();
}

// ---------------------------------------------------------------------------------------------------------
// Reading the input
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
}

function recordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function reportOf(input: ViewInput): Record<string, unknown> | null {
  const report = isRecord(input.structured) ? input.structured.report : undefined;
  return isRecord(report) ? report : null;
}

function groupsOf(input: ViewInput): DocumentSectionGroup[] {
  return Array.isArray(input.groups) ? input.groups : [];
}

/** The rendered section whose heading is `heading` or (when `numbered`) starts with `{number}.`, not yet used. */
function claimGroup(
  groups: readonly DocumentSectionGroup[],
  used: Set<number>,
  match: (heading: string) => boolean,
): DocumentSectionGroup | null {
  const at = groups.findIndex(
    (group, index) => !used.has(index) && group.heading !== null && match(group.heading.trim()) && group.html.trim() !== '',
  );
  if (at < 0) return null;
  used.add(at);
  return groups[at]!;
}

// ---------------------------------------------------------------------------------------------------------
// Session report
// ---------------------------------------------------------------------------------------------------------

const SESSION_HEADINGS: readonly string[] = [
  'session summary',
  'work performed',
  'phases touched',
  'key outcomes',
  'decisions made',
  'files changed',
  'estimated resource usage',
];

function isSessionHeading(heading: string): boolean {
  const lower = heading.trim().toLowerCase();
  return SESSION_HEADINGS.includes(lower) || lower.startsWith('blockers');
}

function contextLine(report: Record<string, unknown>): string | null {
  const parts = [textOrNull(report.project), textOrNull(report.milestone)].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : parts.join(' · ');
}

function rulerOf(duration: string | null): ComposedRuler | null {
  if (duration === null) return null;
  const { main, note } = splitHeadline(duration);
  const first = note === null ? null : timeAfter(note, 'first commit');
  const last = note === null ? null : timeAfter(note, 'last commit');
  const days = note === null ? [] : isoDaysIn(note);
  const sameDay = days.length < 2 || days[0] === days[days.length - 1];
  if (first !== null && last !== null && sameDay && last.fraction >= first.fraction) {
    return {
      kind: 'clock',
      label: 'First to last commit · a 24 hour day',
      from: first.text,
      to: last.text,
      fromAt: first.fraction,
      toAt: last.fraction,
    };
  }
  return { kind: 'none', label: 'No commit stamps in the file', text: main };
}

function progressOf(sentence: string | null, touchedItems: readonly string[]): ComposedProgress | null {
  if (sentence === null) return null;
  const counts = phaseCounts(sentence);
  if (counts === null) return { sentence, done: null, total: null, cells: null };
  if (counts.total > PHASE_STRIP_MAX) return { sentence, done: counts.done, total: counts.total, cells: null };
  const touched = touchedItems.map(phaseNumberOf).filter((n): n is number => n !== null);
  const numbered = touched.length > 0 && touched.every((n) => n >= 1 && n <= counts.total);
  const cells: ReportPhaseCell[] = [];
  for (let n = 1; n <= counts.total; n += 1) {
    cells.push({
      key: `phase-${n}`,
      label: numbered ? `Phase ${n}` : String(n),
      done: n <= counts.done,
      touched: numbered && touched.includes(n),
    });
  }
  return { sentence, done: counts.done, total: counts.total, cells };
}

function blockerOf(item: string, at: number): ReportBlocker {
  const key = `blocker-${at}`;
  const text = item.trim();
  if (text.startsWith('[')) {
    const close = text.indexOf(']');
    if (close > 1 && close <= 24) {
      const rest = text.slice(close + 1).trim();
      if (rest !== '') return { key, tag: text.slice(1, close).trim(), text: rest };
    }
  }
  return { key, tag: null, text };
}

function dirOf(item: string, at: number): ReportFileDir {
  const key = `dir-${at}`;
  const text = item.trim();
  if (text.startsWith('`')) {
    const close = text.indexOf('`', 1);
    if (close > 1) {
      let rest = text.slice(close + 1).trim();
      while (rest.startsWith('—') || rest.startsWith('–') || rest.startsWith('-') || rest.startsWith(':')) rest = rest.slice(1).trim();
      return { key, path: text.slice(1, close), text: rest };
    }
  }
  return { key, path: null, text };
}

function filesOf(files: unknown): ComposedFiles | null {
  if (!isRecord(files)) return null;
  const summary = textOrNull(files.summary);
  const dirs = stringList(files.items).map(dirOf);
  if (summary === null && dirs.length === 0) return null;
  const count = summary === null ? null : numberBefore(summary, 'file');
  return {
    summary,
    count: count === null ? null : `${count} ${count === 1 ? 'file' : 'files'}`,
    insertions: summary === null ? null : numberBefore(summary, 'insertion'),
    deletions: summary === null ? null : numberBefore(summary, 'deletion'),
    dirs,
  };
}

function usageOf(resources: unknown): ComposedUsage | null {
  const rows = recordList(resources)
    .map((row, at) => ({ key: `usage-${at}`, metric: textOrNull(row.metric) ?? '', estimate: textOrNull(row.estimate) ?? '' }))
    .filter((row) => row.metric !== '' || row.estimate !== '');
  return rows.length === 0 ? null : { rows };
}

/** The document sections no part of the session page claims (a heading the writer added later), in the file's order. */
function sessionMore(input: ViewInput): ReportRawSection[] {
  const more: ReportRawSection[] = [];
  groupsOf(input).forEach((group, at) => {
    if (group.heading === null || group.html.trim() === '' || isSessionHeading(group.heading)) return;
    more.push({ key: `more-${at}`, id: `view-report-more-${at}`, title: group.heading.trim(), html: group.html });
  });
  return more;
}

function composeSession(report: Record<string, unknown>, input: ViewInput): ComposedSessionReport {
  const touched = stringList(report.phases);
  const decisions = stringList(report.decisions);
  return {
    variant: 'session',
    head: {
      eyebrow: REPORT_EYEBROW_SESSION,
      title: textOrNull(report.title),
      generated: textOrNull(report.generated),
      context: contextLine(report),
    },
    numerals: [
      numeralOf('duration', DURATION_LABEL, textOrNull(report.duration), false),
      numeralOf('commits', COMMITS_LABEL, textOrNull(report.commitsMade), false),
      numeralOf('plans', PLANS_LABEL, textOrNull(report.plansExecuted), true),
    ].filter((numeral): numeral is ReportNumeral => numeral !== null),
    ruler: rulerOf(textOrNull(report.duration)),
    progress: progressOf(textOrNull(report.phaseProgress), touched),
    outcomes: stringList(report.outcomes).map((text, at) => ({ key: `outcome-${at}`, text })),
    touched: touched.map((text, at) => ({ key: `touched-${at}`, text })),
    decisions: {
      items: decisions.map((text, at) => ({ key: `decision-${at}`, text })),
      note: decisions.length === 0 ? textOrNull(report.decisionsNote) : null,
    },
    blockers: stringList(report.blockers).map(blockerOf),
    files: filesOf(report.filesChanged),
    usage: usageOf(report.resources),
    more: sessionMore(input),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Milestone summary
// ---------------------------------------------------------------------------------------------------------

interface StatEntry {
  label: string | null;
  value: string;
}

function statsOf(value: unknown): StatEntry[] {
  return recordList(value)
    .map((stat) => ({ label: textOrNull(stat.label), value: textOrNull(stat.value) ?? '' }))
    .filter((stat) => stat.value !== '');
}

/** The first and last days of the Timeline stat (else of any stat that names two days), else null. */
function timelineOf(stats: readonly StatEntry[]): { from: string; to: string } | null {
  const candidates = [
    ...stats.filter((stat) => stat.label !== null && stat.label.trim().toLowerCase() === 'timeline'),
    ...stats,
  ];
  for (const stat of candidates) {
    const days = isoDaysIn(stat.value);
    if (days.length >= 2) {
      const from = days[0]!;
      const to = days[days.length - 1]!;
      if (dayNumber(to) > dayNumber(from)) return { from, to };
    }
  }
  return null;
}

function monthTicks(from: string, to: string): { key: string; name: string; at: number }[] {
  const start = dayNumber(from);
  const total = dayNumber(to) - start;
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const ticks: { key: string; name: string; at: number }[] = [];
  for (let guard = 0; guard < 240; guard += 1) {
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const day = Math.round(Date.UTC(year, month, 1) / MS_PER_DAY);
    if (day >= start + total) break;
    if (day > start) ticks.push({ key: `month-${year}-${month}`, name: MONTHS[month]!, at: (day - start) / total });
    month += 1;
  }
  if (ticks.length <= MONTH_TICK_CAP) return ticks;
  const step = Math.ceil(ticks.length / MONTH_TICK_CAP);
  return ticks.filter((_, at) => at % step === 0);
}

function phaseRowsOf(value: unknown): ReportPhaseRow[] {
  return recordList(value).map((row, at) => {
    const { main, note } = splitHeadline(textOrNull(row.status) ?? '');
    return {
      key: `phase-${at}`,
      number: textOrNull(row.phase) ?? '',
      name: textOrNull(row.name) ?? '',
      status: main,
      date: note,
      tone: main.toLowerCase().startsWith('complete') ? 'complete' : 'quiet',
      oneLiner: textOrNull(row.oneLiner) ?? '',
    };
  });
}

function calendarOf(stats: readonly StatEntry[], phases: readonly ReportPhaseRow[]): ComposedRuler | null {
  const span = timelineOf(stats);
  if (span === null) return null;
  const start = dayNumber(span.from);
  const total = dayNumber(span.to) - start;
  const marks: ReportTimeMark[] = [];
  phases.forEach((phase, at) => {
    const day = phase.date === null ? undefined : isoDaysIn(phase.date)[0];
    if (day === undefined) return;
    const n = dayNumber(day) - start;
    if (n < 0 || n > total) return;
    const position = n / total;
    marks.push({
      key: `mark-${at}`,
      number: phase.number.length > 0 && phase.number.length <= 3 ? phase.number : '·',
      date: day.slice(5),
      at: position,
      edge: position >= 0.999 ? 'end' : position <= 0.001 ? 'start' : null,
    });
  });
  return {
    kind: 'calendar',
    label: marks.length > 0 ? 'Calendar · a mark where each phase was delivered' : 'Calendar',
    from: span.from,
    to: span.to,
    months: monthTicks(span.from, span.to),
    marks,
  };
}

function requirementRowsOf(value: unknown): ReportRequirementRow[] {
  return recordList(value).map((row, at) => {
    const covered = row.covered === true ? true : row.covered === false ? false : null;
    const ids = textOrNull(row.ids) ?? '';
    return {
      key: `req-${at}`,
      name: textOrNull(row.category) ?? '',
      ids: expandIds(ids),
      phase: textOrNull(row.phase),
      tone: covered === true ? 'complete' : 'quiet',
      word: covered === true ? COVERED_WORD : covered === false ? NOT_COVERED_WORD : null,
    };
  });
}

function decisionsOf(value: unknown): { bars: ReportDecisionBar[]; rows: ReportDecisionRow[] } {
  const rows = recordList(value).map((row, at) => ({
    key: `decision-${at}`,
    id: textOrNull(row.id) ?? '',
    phase: textOrNull(row.phase) ?? '',
    decision: textOrNull(row.decision) ?? '',
    rationale: textOrNull(row.rationale) ?? '',
  }));
  // The ids repeat across phases, so the Phase column is the disambiguator: one bar per phase, counted from the rows.
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.phase, (counts.get(row.phase) ?? 0) + 1);
  const largest = Math.max(1, ...counts.values());
  const bars = [...counts.entries()].map(([phase, count], at) => ({
    key: `bar-${at}`,
    label: phase === '' ? 'Phase not stated' : isDigits(phase) ? `Phase ${phase}` : phase,
    count,
    fill: count / largest,
  }));
  return { bars, rows };
}

function sectionKind(heading: string): 'phases' | 'requirements' | 'decisions' | 'debt' | 'other' {
  const lower = heading.trim().toLowerCase();
  if (lower.includes('phases delivered')) return 'phases';
  if (lower.includes('requirements')) return 'requirements';
  if (lower.includes('key decisions')) return 'decisions';
  if (lower.includes('tech debt')) return 'debt';
  return 'other';
}

function composeMilestone(report: Record<string, unknown>, input: ViewInput): ComposedMilestoneReport {
  const stats = statsOf(report.stats);
  const phases = phaseRowsOf(report.phases);
  const requirementsRecord = isRecord(report.requirements) ? report.requirements : {};
  const requirements = { rows: requirementRowsOf(requirementsRecord.rows), verdict: textOrNull(requirementsRecord.auditVerdict) };
  const decisions = decisionsOf(report.decisions);
  const groups = groupsOf(input);
  const used = new Set<number>();

  const plain: ReportRawSection[] = [];
  const bars: (ReportRawSection & { number: string })[] = [];
  let debt: ReportRawSection | null = null;
  const index: ReportIndexChip[] = [];
  const anchors: ComposedMilestoneReport['anchors'] = { phases: null, requirements: null, decisions: null };

  const sections = recordList(report.sections);
  for (const section of sections) {
    const number = typeof section.number === 'number' ? String(section.number) : '';
    const heading = textOrNull(section.heading) ?? '';
    const kind = sectionKind(heading);
    const id = `view-report-sec-${number}`;
    const composed =
      (kind === 'phases' && phases.length > 0) ||
      (kind === 'requirements' && requirements.rows.length > 0) ||
      (kind === 'decisions' && decisions.rows.length > 0);
    const label =
      kind === 'phases' && composed
        ? PHASES_DELIVERED_LABEL
        : kind === 'requirements' && composed
          ? REQUIREMENTS_LABEL
          : kind === 'decisions' && composed
            ? KEY_DECISIONS_LABEL
            : kind === 'debt'
              ? TECH_DEBT_LABEL
              : heading;
    if (composed) {
      // The section's own rendering is claimed so it is never also listed as one the page does not compose.
      claimGroup(groups, used, (found) => found.startsWith(`${number}.`));
      if (kind === 'phases' || kind === 'requirements' || kind === 'decisions') anchors[kind] = id;
      index.push({ key: `idx-${number}`, target: id, number, label });
      continue;
    }
    const group = claimGroup(groups, used, (found) => found.startsWith(`${number}.`));
    if (group === null) continue;
    const raw: ReportRawSection = { key: `sec-${number}`, id, title: heading, html: group.html };
    index.push({ key: `idx-${number}`, target: id, number, label });
    if (kind === 'debt') debt = { ...raw, title: TECH_DEBT_LABEL };
    else if (kind === 'phases' || kind === 'requirements' || kind === 'decisions') plain.push(raw);
    else bars.push({ ...raw, number });
  }
  // Any other section the document holds (a heading the writer added) is a closed bar, never lost.
  const statsGroup = claimGroup(groups, used, (found) => sameHeading(found, 'stats'));
  groups.forEach((group, at) => {
    if (used.has(at) || group.heading === null || group.html.trim() === '') return;
    used.add(at);
    const id = `view-report-more-${at}`;
    bars.push({ key: `more-${at}`, id, title: group.heading.trim(), html: group.html, number: '' });
    index.push({ key: `idx-more-${at}`, target: id, number: '·', label: group.heading.trim() });
  });
  const statsId = 'view-report-sec-stats';
  if (stats.length > 0 || statsGroup !== null) index.push({ key: 'idx-stats', target: statsId, number: '·', label: STATS_LABEL });

  return {
    variant: 'milestone',
    head: {
      eyebrow: REPORT_EYEBROW_MILESTONE,
      title: textOrNull(report.title),
      generated: textOrNull(report.generated),
      context: textOrNull(report.purpose),
    },
    numerals: stats
      .map((stat, at) => numeralOf(`stat-${at}`, stat.label ?? '', stat.value, false))
      .filter((numeral): numeral is ReportNumeral => numeral !== null),
    ruler: calendarOf(stats, phases),
    index,
    phases,
    requirements,
    decisions,
    debt,
    bars,
    plain,
    statsId,
    anchors,
  };
}

/** The report page's model, or `null` when the input carries no report lift (the promoted-section view then renders with no
 * notice). */
export function composeReport(input: ViewInput): ComposedReport | null {
  try {
    const report = reportOf(input);
    if (report === null) return null;
    if (report.variant === 'milestone') return composeMilestone(report, input);
    if (report.variant === 'session') return composeSession(report, input);
    return null;
  } catch {
    return null;
  }
}
