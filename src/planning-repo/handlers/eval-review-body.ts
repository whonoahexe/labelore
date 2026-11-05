// EVAL-REVIEW.md body reader (Phase 10, 10-20, VIEW-12, T-10-36). `extractEvalReview` reads what GSD's
// `gsd-eval-auditor` writes (its `write_eval_review` template) and what the Eval review page (sketch 050 winner B,
// "Gap -> fix ledger") draws:
//   - the head lines `**Audit Date:**`, `**AI-SPEC Present:**`, `**Overall Score:**` and `**Verdict:**`;
//   - the Dimension Coverage table (Dimension, Status, Measurement, Finding, found by header text) and the
//     `**Coverage Score:**` line under it;
//   - the Infrastructure Audit table (Component, Status, Finding) and the `**Infrastructure Score:**` line;
//   - the Remediation Plan: its `###` groups in file order, each with its numbered steps;
//   - the Critical Gaps lines.
// The numbers and words are kept exactly as the file writes them: nothing here computes a score, a verdict or a
// tally (the auditor's own rule: the scoring verb's values are used verbatim). Line scans over the fence-aware
// scanner only: no regular expression, none built from document text. The body is capped at FENCED_BODY_CAP
// characters (250,000), every table at 100 rows, the plan at 100 steps and every cell, step and line at 2,000
// characters (T-10-36). A table cell never grows the scan: each line is split once.
import { eachLineOutsideFences, scanFencedLines, splitBodyLines } from './fenced-sections.ts';

/** The most rows kept for one table. */
export const EVAL_REVIEW_ROW_CAP = 100;
/** The most remediation steps kept, across every group. */
export const EVAL_REVIEW_STEP_CAP = 100;
/** The most characters kept of one cell, step or line. */
export const EVAL_REVIEW_CELL_CAP = 2000;
/** The most Critical Gaps lines kept. */
export const EVAL_REVIEW_GAP_CAP = 100;

export interface EvalReviewDimension {
  name: string;
  /** The file's own word (COVERED, PARTIAL, MISSING), verbatim. */
  status: string;
  /** Code, LLM Judge or Human as the file writes it. */
  measurement: string;
  finding: string;
}

export interface EvalReviewComponent {
  component: string;
  /** The file's own word (Installed, Not found, ...), verbatim. */
  status: string;
  finding: string;
}

export type EvalReviewGroupKey = 'must' | 'should' | 'nice' | 'other';

export interface EvalReviewGroup {
  group: EvalReviewGroupKey;
  /** The `###` heading as written, without its trailing colon. */
  heading: string;
  steps: string[];
}

export interface EvalReviewBody {
  auditDate: string | null;
  /** `**AI-SPEC Present:**` as written ("Yes", "No"). */
  aiSpecPresent: string | null;
  /** The Overall Score as the file writes it; `max` is null when the file wrote no "/ N" after the number. */
  score: { value: number; max: number | null } | null;
  /** GSD's verdict word, verbatim. */
  verdict: string | null;
  dimensions: EvalReviewDimension[];
  coverageScoreLine: string | null;
  infrastructure: EvalReviewComponent[];
  infrastructureScoreLine: string | null;
  remediation: EvalReviewGroup[];
  criticalGaps: string[];
}

function cap(text: string): string {
  return text.length > EVAL_REVIEW_CELL_CAP ? text.slice(0, EVAL_REVIEW_CELL_CAP) : text;
}

/** The cells of a table row, the outer pipes dropped, each trimmed, `\|` read as a pipe inside a cell. */
function splitCells(text: string): string[] {
  let t = text.trim();
  if (t.charCodeAt(0) === 124) t = t.slice(1);
  if (t.length > 0 && t.charCodeAt(t.length - 1) === 124 && t.charCodeAt(t.length - 2) !== 92) t = t.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < t.length; i += 1) {
    const c = t.charCodeAt(i);
    if (c === 92 && t.charCodeAt(i + 1) === 124) {
      current += '|';
      i += 1;
    } else if (c === 124) {
      cells.push(current.trim());
      current = '';
    } else {
      current += t.charAt(i);
    }
  }
  cells.push(current.trim());
  return cells;
}

/** A table separator row: every cell only dashes, colons and spaces, and at least one dash. */
function isSeparatorRow(text: string): boolean {
  const t = text.trim();
  if (t.charCodeAt(0) !== 124) return false;
  for (const cell of splitCells(t)) {
    if (cell.length === 0) return false;
    let dashes = 0;
    for (let i = 0; i < cell.length; i += 1) {
      const c = cell.charCodeAt(i);
      if (c === 45) dashes += 1;
      else if (c !== 58 && c !== 32) return false;
    }
    if (dashes === 0) return false;
  }
  return true;
}

/** The value after `**Label:**` on a line, or null when the line is another label or has nothing after it. The
 * colon may sit inside or outside the bold. */
function labelValue(text: string, label: string): string | null {
  const t = text.trim();
  if (!t.startsWith('**')) return null;
  const close = t.indexOf('**', 2);
  if (close === -1) return null;
  let name = t.slice(2, close).trim();
  let rest = t.slice(close + 2);
  if (name.endsWith(':')) name = name.slice(0, -1).trim();
  else if (rest.startsWith(':')) rest = rest.slice(1);
  if (name.toLowerCase() !== label.toLowerCase()) return null;
  const value = rest.trim();
  return value === '' ? null : cap(value);
}

/** A value with surrounding bold marks and backticks dropped (`**NEEDS WORK**` reads as `NEEDS WORK`). */
function bare(text: string): string {
  let t = text.trim();
  for (;;) {
    if (t.length >= 4 && t.startsWith('**') && t.endsWith('**')) t = t.slice(2, -2).trim();
    else if (t.length >= 2 && t.startsWith('`') && t.endsWith('`')) t = t.slice(1, -1).trim();
    else return t;
  }
}

/** The leading number of a text (digits and at most one dot), its end index, or null. */
function leadingNumber(text: string): { value: number; end: number } | null {
  let i = 0;
  while (i < text.length && text.charCodeAt(i) === 32) i += 1;
  const start = i;
  let dot = false;
  let digits = 0;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      digits += 1;
    } else if (c === 46 && !dot && digits > 0 && i + 1 < text.length && text.charCodeAt(i + 1) >= 48 && text.charCodeAt(i + 1) <= 57) {
      dot = true;
    } else {
      break;
    }
    i += 1;
  }
  if (digits === 0) return null;
  const value = Number(text.slice(start, i));
  return Number.isFinite(value) ? { value, end: i } : null;
}

/** "64/100" or "64 / 100 (rounded)" as a score; "64" alone has no maximum. Anything else is no score. */
function scoreOf(text: string): { value: number; max: number | null } | null {
  const left = leadingNumber(bare(text));
  if (left === null) return null;
  const rest = bare(text).slice(left.end).trim();
  if (rest.charCodeAt(0) !== 47) return { value: left.value, max: null };
  const right = leadingNumber(rest.slice(1));
  return { value: left.value, max: right === null ? null : right.value };
}

interface Range {
  heading: string;
  from: number;
  to: number;
}

function findRange(ranges: readonly Range[], heading: string): Range | undefined {
  return ranges.find((r) => r.heading.trim().toLowerCase() === heading);
}

/** The first line outside fences of [from, to) carrying `**label:**`, its value. */
function lineValue(lines: readonly string[], from: number, to: number, label: string): string | null {
  let found: string | null = null;
  eachLineOutsideFences(lines, from, to, (line) => {
    if (found !== null) return;
    found = labelValue(line, label);
  });
  return found;
}

/** The header cells (lower case) and the data rows of the first table in [from, to) whose header holds `must`. */
function tableIn(
  lines: readonly string[],
  from: number,
  to: number,
  must: string,
): { headers: string[]; rows: string[][] } | null {
  const table: string[] = [];
  let headerAt = -1;
  let ended = false;
  const all: string[] = [];
  eachLineOutsideFences(lines, from, to, (line) => {
    all.push(line);
  });
  for (let i = 0; i + 1 < all.length && headerAt < 0; i += 1) {
    const t = all[i].trim();
    if (t.charCodeAt(0) !== 124 || !isSeparatorRow(all[i + 1])) continue;
    if (splitCells(t).some((cell) => cell.toLowerCase() === must)) headerAt = i;
  }
  if (headerAt < 0) return null;
  for (let i = headerAt + 2; i < all.length && !ended; i += 1) {
    const t = all[i].trim();
    if (t.charCodeAt(0) !== 124) ended = true;
    else if (table.length < EVAL_REVIEW_ROW_CAP) table.push(t);
    else ended = true;
  }
  return {
    headers: splitCells(all[headerAt]).map((cell) => cell.toLowerCase()),
    rows: table.map((row) => splitCells(row)),
  };
}

function cellAt(row: readonly string[], index: number): string {
  return index >= 0 && index < row.length ? cap(row[index]) : '';
}

function dimensionsIn(lines: readonly string[], range: Range | undefined): EvalReviewDimension[] {
  if (range === undefined) return [];
  const table = tableIn(lines, range.from, range.to, 'dimension');
  if (table === null) return [];
  const iName = table.headers.indexOf('dimension');
  const iStatus = table.headers.indexOf('status');
  const iMeasure = table.headers.indexOf('measurement');
  const iFinding = table.headers.indexOf('finding');
  const out: EvalReviewDimension[] = [];
  for (const row of table.rows) {
    const name = cellAt(row, iName);
    if (name === '') continue;
    out.push({
      name,
      status: cellAt(row, iStatus),
      measurement: cellAt(row, iMeasure),
      finding: cellAt(row, iFinding),
    });
  }
  return out;
}

function componentsIn(lines: readonly string[], range: Range | undefined): EvalReviewComponent[] {
  if (range === undefined) return [];
  const table = tableIn(lines, range.from, range.to, 'component');
  if (table === null) return [];
  const iName = table.headers.indexOf('component');
  const iStatus = table.headers.indexOf('status');
  const iFinding = table.headers.indexOf('finding');
  const out: EvalReviewComponent[] = [];
  for (const row of table.rows) {
    const component = cellAt(row, iName);
    if (component === '') continue;
    out.push({ component, status: cellAt(row, iStatus), finding: cellAt(row, iFinding) });
  }
  return out;
}

function groupKeyOf(heading: string): EvalReviewGroupKey {
  const lower = heading.toLowerCase();
  if (lower.includes('must')) return 'must';
  if (lower.includes('should')) return 'should';
  if (lower.includes('nice')) return 'nice';
  return 'other';
}

/** The text of a `### heading` line without its hashes and trailing colon, or null when the line is not one. */
function groupHeadingOf(line: string): string | null {
  const t = line.trim();
  if (t.charCodeAt(0) !== 35 || t.charCodeAt(1) !== 35 || t.charCodeAt(2) !== 35) return null;
  if (t.charCodeAt(3) !== 32 && t.charCodeAt(3) !== 9) return null;
  let text = t.slice(3).trim();
  while (text.endsWith('#')) text = text.slice(0, -1).trim();
  if (text.endsWith(':')) text = text.slice(0, -1).trim();
  return text === '' ? null : cap(text);
}

/** A step line: `1. text`, `2) text` or `- text`. Returns the text, or null. */
function stepTextOf(line: string): string | null {
  const t = line.trimStart();
  if (t.charCodeAt(0) === 45 || t.charCodeAt(0) === 42) {
    return t.charCodeAt(1) === 32 ? t.slice(2).trim() : null;
  }
  let i = 0;
  while (i < t.length && t.charCodeAt(i) >= 48 && t.charCodeAt(i) <= 57) i += 1;
  if (i === 0 || i > 4) return null;
  if ((t.charCodeAt(i) !== 46 && t.charCodeAt(i) !== 41) || t.charCodeAt(i + 1) !== 32) return null;
  return t.slice(i + 2).trim();
}

function indentOf(line: string): number {
  let i = 0;
  while (i < line.length && (line.charCodeAt(i) === 32 || line.charCodeAt(i) === 9)) i += 1;
  return i;
}

function remediationIn(lines: readonly string[], range: Range | undefined): EvalReviewGroup[] {
  if (range === undefined) return [];
  const groups: EvalReviewGroup[] = [];
  let current: EvalReviewGroup | null = null;
  let steps = 0;
  let last = -1;
  let lastIndent = 0;
  eachLineOutsideFences(lines, range.from, range.to, (line) => {
    const heading = groupHeadingOf(line);
    if (heading !== null) {
      current = { group: groupKeyOf(heading), heading, steps: [] };
      groups.push(current);
      last = -1;
      return;
    }
    if (line.trim() === '') return;
    const indent = indentOf(line);
    // A line indented deeper than the step it follows continues that step, sub-bullets included.
    if (current !== null && last >= 0 && indent > lastIndent) {
      current.steps[last] = cap(`${current.steps[last]} ${line.trim()}`);
      return;
    }
    const step = stepTextOf(line);
    if (step === null) return;
    if (steps >= EVAL_REVIEW_STEP_CAP) return;
    if (current === null) {
      current = { group: 'other', heading: 'Steps', steps: [] };
      groups.push(current);
    }
    current.steps.push(cap(step));
    steps += 1;
    last = current.steps.length - 1;
    lastIndent = indent;
  });
  return groups;
}

function gapsIn(lines: readonly string[], range: Range | undefined): string[] {
  if (range === undefined) return [];
  const out: string[] = [];
  eachLineOutsideFences(lines, range.from, range.to, (line) => {
    const t = line.trim();
    if (t === '' || out.length >= EVAL_REVIEW_GAP_CAP) return;
    out.push(cap(stepTextOf(line) ?? t));
  });
  return out;
}

/** Reads an EVAL-REVIEW.md body. Never throws on text; bounded and linear. */
export function extractEvalReview(body: string): EvalReviewBody {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines).filter((section) => section.level === 2);
  const ranges: Range[] = sections.map((section) => ({
    heading: section.heading,
    from: section.startLine + 1,
    to: section.endLine,
  }));
  const headEnd = sections.length > 0 ? sections[0].startLine : lines.length;
  const coverage = findRange(ranges, 'dimension coverage');
  const infra = findRange(ranges, 'infrastructure audit');
  const rawScore = lineValue(lines, 0, headEnd, 'Overall Score');
  const rawVerdict = lineValue(lines, 0, headEnd, 'Verdict');
  const aiSpec = lineValue(lines, 0, headEnd, 'AI-SPEC Present');
  const date = lineValue(lines, 0, headEnd, 'Audit Date');
  return {
    auditDate: date === null ? null : bare(date),
    aiSpecPresent: aiSpec === null ? null : bare(aiSpec),
    score: rawScore === null ? null : scoreOf(rawScore),
    verdict: rawVerdict === null ? null : bare(rawVerdict),
    dimensions: dimensionsIn(lines, coverage),
    coverageScoreLine:
      coverage === undefined ? null : lineValue(lines, coverage.from, coverage.to, 'Coverage Score'),
    infrastructure: componentsIn(lines, infra),
    infrastructureScoreLine:
      infra === undefined ? null : lineValue(lines, infra.from, infra.to, 'Infrastructure Score'),
    remediation: remediationIn(lines, findRange(ranges, 'remediation plan')),
    criticalGaps: gapsIn(lines, findRange(ranges, 'critical gaps')),
  };
}
