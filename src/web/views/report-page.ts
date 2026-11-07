// The report page's composer (Phase 11, 11-24, VIEW-18, D-03, sketch 059 winner A "Time ruler"): a pure `ViewInput` ->
// `ComposedReport` merge of the report lift (11-20's `structured.report`). A report is the record of a session or a
// milestone, and the page answers "what did it deliver, and what is still open?":
//   - the head: the eyebrow "Session report", the file's own title as the h1, "Generated {stamp}" and the project and
//     milestone as meta;
//   - the headline numbers "Duration", "Commits" and "Plans" as three Heading numerals, each shown exactly as the report
//     wrote it (free text such as "Single session" is kept; the parenthetical a value ends with, the commit stamps or
//     the plan ids, sits beside it as meta and the two together are the file's text again). A line the report lacks
//     draws no numeral: the page never turns free text into a number it cannot read and never writes a 0.
// The composer holds no DOM, no filesystem access, no rendering, no regular expression and no module-level mutable
// state; it reads no clock. It returns `null` when the report lift is missing, so the page keeps the promoted-section
// view with no notice (Phase 10 C1, X2). T-11-38: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';

export const REPORT_EYEBROW_SESSION = 'Session report';
export const DURATION_LABEL = 'Duration';
export const COMMITS_LABEL = 'Commits';
export const PLANS_LABEL = 'Plans';

/** A numeral longer than this is drawn at body size: a long free-text value must wrap, not shout. */
export const NUMERAL_LONG = 24;
/** The most plan ids drawn as chips. */
const CHIP_CAP = 24;

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface ReportNumeral {
  key: string;
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
  /** The context line: the project and the milestone, else null. */
  context: string | null;
}

export interface ComposedSessionReport {
  variant: 'session';
  head: ComposedReportHead;
  numerals: ReportNumeral[];
}

export type ComposedReport = ComposedSessionReport;

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

// ---------------------------------------------------------------------------------------------------------
// Reading the input
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function reportOf(input: ViewInput): Record<string, unknown> | null {
  const report = isRecord(input.structured) ? input.structured.report : undefined;
  return isRecord(report) ? report : null;
}

function contextLine(report: Record<string, unknown>): string | null {
  const parts = [textOrNull(report.project), textOrNull(report.milestone)].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : parts.join(' · ');
}

function composeSession(report: Record<string, unknown>): ComposedSessionReport {
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
  };
}

/** The report page's model, or `null` when the input carries no report lift (the promoted-section view then renders with
 * no notice). */
export function composeReport(input: ViewInput): ComposedReport | null {
  try {
    const report = reportOf(input);
    if (report === null) return null;
    return report.variant === 'session' ? composeSession(report) : null;
  } catch {
    return null;
  }
}
