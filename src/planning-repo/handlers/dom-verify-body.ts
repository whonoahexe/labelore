// DOM-VERIFY.md reader (Phase 10, 10-21, VIEW-12, T-10-41). `extractDomVerify` reads what GSD's `gsd-dom-verifier` writes
// (its output contract: a scalars-only frontmatter and "one line per criterion with its verdict and the observation
// behind it") and what the Browser check page (sketch 051 winner A, "Browser window") draws:
//   - the frontmatter's `outcome`, `reason`, `wave` and the four counts, as the file writes them (numbers only, nothing
//     recomputed; every other key, the made-up marker keys included, is ignored);
//   - the criteria: each list item, and each other line that opens with its verdict, in file order, the leading verdict
//     word (passed, failed, needs_review) read through bold, backticks or brackets; a line whose verdict cannot be read
//     is kept with `verdict: null` and listed as plain text;
//   - the rest of the body as paragraphs ("What the check wrote");
//   - the target: a body line labelled Target, or else a backticked path or URL in a paragraph; the time: a body line
//     labelled Checked or the like. The files record neither in their frontmatter, so nothing is read from a file date
//     (RESEARCH C5).
// Line scans over the fence-aware scanner only: no regular expression, none built from document text. The body is capped
// at FENCED_BODY_CAP characters (250,000), the criteria at 500, the paragraphs at 200, the targets at 8 and every line at
// 2,000 characters (T-10-41). Each line is read once, so cost grows linearly with the body.
import { eachLineOutsideFences, splitBodyLines } from './fenced-sections.ts';

/** The most criteria kept. */
export const DOM_VERIFY_CRITERIA_CAP = 500;
/** The most body paragraphs kept. */
export const DOM_VERIFY_PARAGRAPH_CAP = 200;
/** The most characters kept of one criterion, paragraph, target or value. */
export const DOM_VERIFY_LINE_CAP = 2000;
/** The most targets kept. */
export const DOM_VERIFY_TARGET_CAP = 8;

export type DomVerifyVerdict = 'passed' | 'failed' | 'needs_review';

export interface DomVerifyCriterion {
  /** The leading verdict word the line carries, or null when none could be read (the line is plain text). */
  verdict: DomVerifyVerdict | null;
  /** The line without its list marker and verdict word. */
  text: string;
}

export interface DomVerifyCounts {
  checked: number | null;
  passed: number | null;
  failed: number | null;
  needsReview: number | null;
}

export interface DomVerifyBody {
  /** The frontmatter `outcome` verbatim (verified, nothing_to_report, could_not_look, or any other word), or null. */
  outcome: string | null;
  /** The frontmatter `reason` verbatim, or null. */
  reason: string | null;
  /** The frontmatter `wave`, else the number in the body title "Phase N, wave W", else null. */
  wave: number | null;
  /** "Phase 3" read from the body title, or null. */
  phase: string | null;
  /** The four counts as the frontmatter states them; each a number or null. */
  counts: DomVerifyCounts;
  criteria: DomVerifyCriterion[];
  /** The body's non-criterion lines as paragraphs, in file order. */
  paragraphs: string[];
  /** The first target the body states, or null. */
  target: string | null;
  /** Every target the body states: a labelled one first, then backticked paths and URLs. */
  targets: string[];
  /** A time the body states on a line labelled Checked or the like, or null. Never a file date. */
  checkedAt: string | null;
}

function cap(text: string): string {
  return text.length > DOM_VERIFY_LINE_CAP ? text.slice(0, DOM_VERIFY_LINE_CAP) : text;
}

function textOrNull(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const t = candidate.trim();
  return t === '' ? null : cap(t);
}

/** A non-negative whole number the frontmatter states, as a number or as digits in a string; anything else is null. */
function countOf(candidate: unknown): number | null {
  if (typeof candidate === 'number') return Number.isInteger(candidate) && candidate >= 0 ? candidate : null;
  if (typeof candidate !== 'string') return null;
  const t = candidate.trim();
  if (t === '' || t.length > 9) return null;
  for (let i = 0; i < t.length; i += 1) {
    const c = t.charCodeAt(i);
    if (c < 48 || c > 57) return null;
  }
  return Number(t);
}

function isLetter(code: number): boolean {
  return (code >= 97 && code <= 122) || (code >= 65 && code <= 90);
}

const VERDICT_WORDS: readonly (readonly [string, DomVerifyVerdict])[] = [
  ['needs_review', 'needs_review'],
  ['needs review', 'needs_review'],
  ['needs-review', 'needs_review'],
  ['passed', 'passed'],
  ['failed', 'failed'],
];

/** The marker a line opens with, and the one that closes it. */
function opener(text: string): { open: number; close: string } {
  if (text.startsWith('**')) return { open: 2, close: '**' };
  if (text.startsWith('__')) return { open: 2, close: '__' };
  const c = text.charCodeAt(0);
  if (c === 96) return { open: 1, close: '`' };
  if (c === 91) return { open: 1, close: ']' };
  if (c === 40) return { open: 1, close: ')' };
  if (c === 42 || c === 95) return { open: 1, close: text.charAt(0) };
  return { open: 0, close: '' };
}

/**
 * The verdict a line opens with, and what follows it. The word is read through bold, backticks or brackets
 * (`**failed**:`, `` `needs_review`: ``, `[passed]`) in any case; an unmarked word counts only when a colon or a dash
 * follows it directly, so "Failed login shows a banner" is plain text. Null when no verdict word opens the line.
 */
export function readVerdict(line: string): { verdict: DomVerifyVerdict; rest: string } | null {
  const t = line.trim();
  const { open, close } = opener(t);
  const head = t.slice(open, open + 14).toLowerCase();
  for (const [word, verdict] of VERDICT_WORDS) {
    if (!head.startsWith(word)) continue;
    let k = open + word.length;
    const after = t.charCodeAt(k);
    if (isLetter(after) || after === 95) continue;
    let colon = false;
    if (after === 58) {
      k += 1;
      colon = true;
    }
    if (open > 0) {
      if (!t.startsWith(close, k)) continue;
      k += close.length;
      if (t.charCodeAt(k) === 58) k += 1;
    } else if (!colon) {
      if (t.charCodeAt(k) === 32 && isDash(t, k + 1) && t.charCodeAt(k + 2) === 32) k += 2;
      else continue;
    }
    let rest = t.slice(k).trimStart();
    if (isDash(rest, 0) && rest.charCodeAt(1) === 32) rest = rest.slice(1).trimStart();
    return { verdict, rest: cap(rest) };
  }
  return null;
}

function isDash(text: string, at: number): boolean {
  const c = text.charCodeAt(at);
  return c === 45 || c === 8211 || c === 8212;
}

/** The text of a list item (`- `, `* `, `+ `, `1. `, `2) `), or null when the line is not one. */
function listItemOf(line: string): string | null {
  const t = line.trimStart();
  const first = t.charCodeAt(0);
  if (first === 45 || first === 42 || first === 43) return t.charCodeAt(1) === 32 ? t.slice(2).trim() : null;
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

/** A heading line's depth (1 to 6) and text, or null. */
function headingOf(line: string): { depth: number; text: string } | null {
  const t = line.trim();
  let depth = 0;
  while (depth < t.length && t.charCodeAt(depth) === 35) depth += 1;
  if (depth === 0 || depth > 6 || (t.charCodeAt(depth) !== 32 && t.charCodeAt(depth) !== 9)) return null;
  let text = t.slice(depth).trim();
  while (text.endsWith('#')) text = text.slice(0, -1).trim();
  return { depth, text: cap(text) };
}

function stripMarks(text: string): string {
  let start = 0;
  let end = text.length;
  const isMark = (c: number): boolean => c === 42 || c === 95 || c === 96 || c === 32;
  while (start < end && isMark(text.charCodeAt(start))) start += 1;
  while (end > start && isMark(text.charCodeAt(end - 1))) end -= 1;
  return text.slice(start, end);
}

const TARGET_LABELS = new Set(['target', 'target url', 'url', 'address', 'checked url']);
const TIME_LABELS = new Set(['checked', 'checked at', 'checked on', 'observed at', 'run at', 'time', 'date', 'timestamp']);

/** `Target: value` or `**Checked:** value`: the lower-case label and the value with marks dropped, or null. */
function labelledLine(text: string): { label: string; value: string } | null {
  const t = text.trim();
  const colon = t.indexOf(':');
  if (colon <= 0 || colon > 24) return null;
  const label = stripMarks(t.slice(0, colon)).toLowerCase();
  if (!TARGET_LABELS.has(label) && !TIME_LABELS.has(label)) return null;
  const value = stripMarks(t.slice(colon + 1).trim());
  return value === '' ? null : { label, value: cap(value) };
}

function hasDigit(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c >= 48 && c <= 57) return true;
  }
  return false;
}

function isAllDigits(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return text.length > 0;
}

function looksLikeTarget(value: string): boolean {
  if (value.length === 0 || value.length > 300) return false;
  const lower = value.slice(0, 8).toLowerCase();
  if (!(value.charCodeAt(0) === 47 || lower.startsWith('http://') || lower.startsWith('https://'))) return false;
  for (let i = 0; i < value.length; i += 1) {
    const c = value.charCodeAt(i);
    if (c === 32 || c === 9) return false;
  }
  return true;
}

/** Each backticked value of a text that is a path or a URL, in order. One pass. */
function backtickedTargets(text: string, out: string[]): void {
  let i = 0;
  while (i < text.length && out.length < DOM_VERIFY_TARGET_CAP * 4) {
    const open = text.indexOf('`', i);
    if (open < 0) return;
    const close = text.indexOf('`', open + 1);
    if (close < 0) return;
    const value = text.slice(open + 1, close);
    if (looksLikeTarget(value)) out.push(value);
    i = close + 1;
  }
}

/** The number after `word` in a title ("phase 3", "wave 2"), as the text of digits and dots, or null. */
function numberAfter(lower: string, word: string): string | null {
  const at = lower.indexOf(word);
  if (at < 0) return null;
  let i = at + word.length;
  while (i < lower.length && lower.charCodeAt(i) === 32) i += 1;
  const start = i;
  while (i < lower.length && ((lower.charCodeAt(i) >= 48 && lower.charCodeAt(i) <= 57) || lower.charCodeAt(i) === 46)) i += 1;
  let end = i;
  while (end > start && lower.charCodeAt(end - 1) === 46) end -= 1;
  return end > start ? lower.slice(start, end) : null;
}

/** Reads a DOM-VERIFY.md. Never throws on text; bounded and linear. `frontmatter` is the parsed frontmatter, `body`
 * the text after it. */
export function extractDomVerify(frontmatter: Record<string, unknown>, body: string): DomVerifyBody {
  const lines = splitBodyLines(body);
  const criteria: DomVerifyCriterion[] = [];
  const paragraphs: string[] = [];
  const targets: string[] = [];
  const found: string[] = [];
  let labelledTarget: string | null = null;
  let checkedAt: string | null = null;
  const title: { text: string | null } = { text: null };
  let current: string[] = [];
  let last = -1;
  let lastIndent = 0;
  const flush = (): void => {
    if (current.length === 0) return;
    if (paragraphs.length < DOM_VERIFY_PARAGRAPH_CAP) paragraphs.push(cap(current.join(' ')));
    current = [];
  };
  const addCriterion = (verdict: DomVerifyVerdict | null, text: string, indent: number): void => {
    if (criteria.length >= DOM_VERIFY_CRITERIA_CAP) {
      last = -1;
      return;
    }
    criteria.push({ verdict, text: cap(text) });
    last = criteria.length - 1;
    lastIndent = indent;
  };
  eachLineOutsideFences(lines, 0, lines.length, (line) => {
    const t = line.trim();
    if (t === '') {
      flush();
      last = -1;
      return;
    }
    const heading = headingOf(line);
    if (heading !== null) {
      flush();
      last = -1;
      if (title.text === null && heading.depth === 1) title.text = heading.text;
      else if (heading.text !== '' && paragraphs.length < DOM_VERIFY_PARAGRAPH_CAP) paragraphs.push(heading.text);
      return;
    }
    const indent = indentOf(line);
    const item = listItemOf(line);
    if (item !== null) {
      flush();
      const read = readVerdict(item);
      addCriterion(read === null ? null : read.verdict, read === null ? item : read.rest, indent);
      return;
    }
    // A line indented deeper than the criterion it follows continues it.
    if (last >= 0 && indent > lastIndent) {
      criteria[last].text = cap(`${criteria[last].text} ${t}`);
      return;
    }
    const read = readVerdict(t);
    if (read !== null) {
      flush();
      addCriterion(read.verdict, read.rest, indent);
      return;
    }
    last = -1;
    const label = labelledLine(t);
    if (label !== null) {
      if (TARGET_LABELS.has(label.label)) {
        if (labelledTarget === null) labelledTarget = label.value;
      } else if (checkedAt === null && hasDigit(label.value) && !isAllDigits(label.value)) {
        checkedAt = label.value;
      }
    }
    backtickedTargets(t, found);
    current.push(t);
  });
  flush();
  if (labelledTarget !== null) targets.push(labelledTarget);
  for (const value of found) {
    if (targets.length >= DOM_VERIFY_TARGET_CAP) break;
    if (!targets.includes(value)) targets.push(value);
  }
  const lowerTitle = title.text === null ? '' : title.text.toLowerCase();
  const phaseNo = numberAfter(lowerTitle, 'phase');
  const titleWave = numberAfter(lowerTitle, 'wave');
  const waveFromFile = countOf(frontmatter.wave);
  return {
    outcome: textOrNull(frontmatter.outcome),
    reason: textOrNull(frontmatter.reason),
    wave: waveFromFile ?? (titleWave === null ? null : countOf(titleWave)),
    phase: phaseNo === null ? null : `Phase ${phaseNo}`,
    counts: {
      checked: countOf(frontmatter.checked),
      passed: countOf(frontmatter.passed),
      failed: countOf(frontmatter.failed),
      needsReview: countOf(frontmatter.needs_review),
    },
    criteria,
    paragraphs,
    target: targets.length > 0 ? targets[0] : null,
    targets,
    checkedAt,
  };
}
