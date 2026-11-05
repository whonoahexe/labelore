// AI-SPEC.md (Phase 10, 10-18, VIEW-11). The handler claims `{NN}-AI-SPEC.md` by its artifact token and carries
// `structured.aiSpec`, the tolerant reading `extractAiSpec` makes of what GSD's `templates/AI-SPEC.md` writes:
//   - the field lines `**System Type:**`, `**Selected Framework:**`, `**Version:**`, `**Stakes Level:**` and
//     `**Vendor Lock-In Accepted:**`: null while the value is still the template's HTML comment;
//   - the Dimensions table of Section 5 (Dimension, Rubric, Measurement Approach, Priority), rows with nothing in
//     them dropped;
//   - the Checklist's `- [ ]` and `- [x]` items as a done count and a total;
//   - every numbered section (`## 1.` to `## 7.`, `## 1b.`, `## 4b.`) with whether it is still an unfilled template
//     slot (the rule is in `scanSection` below).
// Line scans over `scanFencedLines`' fence handling only: no regular expression, none built from document text. The
// body is capped at FENCED_BODY_CAP characters (250,000), dimensions at 100, checklist items at 200, numbered
// sections at 60 and every field at 2,000 characters; an HTML comment that is never closed runs to the end of its
// own section, never of the file (T-10-31). The extraction is guarded by its own try/catch so a throw only omits the
// key: the page then falls back to the promoted-section view and the title, body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { fenceMarker, scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import type { FenceMarker } from './fenced-sections.ts';

/** The most dimensions kept. */
export const AI_SPEC_DIMENSION_CAP = 100;
/** The most checklist items counted. */
export const AI_SPEC_CHECKLIST_CAP = 200;
/** The most numbered sections listed. */
export const AI_SPEC_SECTION_CAP = 60;
/** The most characters kept of one field or table cell. */
export const AI_SPEC_FIELD_CAP = 2000;

export interface AiSpecDimension {
  name: string;
  rubric: string;
  measurement: string;
  priority: string;
}

export interface AiSpecSection {
  /** "1", "1b", "4b": the digits and an optional letter before the heading's dot. */
  number: string;
  /** The heading as written, "1. System Classification". */
  heading: string;
  /** True when nothing under the heading is the author's: only the template's own scaffolding is left. */
  slot: boolean;
  /** The lines under the heading that are the author's (not scaffolding). */
  written: number;
}

export interface AiSpecBody {
  systemType: string | null;
  framework: string | null;
  version: string | null;
  stakes: string | null;
  vendorLockIn: string | null;
  dimensions: AiSpecDimension[];
  /** `items` is each item's own state in file order (the squares of a meter follow it, not the count). */
  checklist: { done: number; total: number; items: boolean[] };
  sections: AiSpecSection[];
}

// ---------------------------------------------------------------------------------------------------------------
// The scanner: one pass over a section's lines, fences and HTML comments tracked
// ---------------------------------------------------------------------------------------------------------------

/** A running "inside an HTML comment" flag, carried across the lines of one section. */
interface CommentState {
  inComment: boolean;
}

/** The line with every HTML comment removed, a comment that opened on an earlier line closed by the first `-->`. A
 * comment that never closes swallows the rest of the section. Linear: each index is searched once. */
function stripComments(line: string, state: CommentState): string {
  const parts: string[] = [];
  let pos = 0;
  while (pos <= line.length) {
    if (state.inComment) {
      const end = line.indexOf('-->', pos);
      if (end === -1) break;
      pos = end + 3;
      state.inComment = false;
      continue;
    }
    const start = line.indexOf('<!--', pos);
    if (start === -1) {
      parts.push(line.slice(pos));
      break;
    }
    parts.push(line.slice(pos, start));
    state.inComment = true;
    pos = start + 4;
  }
  return parts.join('');
}

/** Visits each line of [from, to) once. A line outside a fence arrives with its HTML comments removed; a line inside a
 * fence arrives as written; fence marker lines are not visited. State starts clean at `from`, so an unterminated
 * comment or fence ends with the section. */
function scanLines(
  lines: readonly string[],
  from: number,
  to: number,
  visit: (text: string, index: number, inFence: boolean) => void,
): void {
  const comment: CommentState = { inComment: false };
  let fence: FenceMarker | null = null;
  for (let i = from; i < to; i += 1) {
    const raw = lines[i];
    if (!comment.inComment) {
      const marker = fenceMarker(raw);
      if (fence !== null) {
        if (marker !== null && marker.bare && marker.char === fence.char && marker.length >= fence.length) {
          fence = null;
        } else {
          visit(raw, i, true);
        }
        continue;
      }
      if (marker !== null) {
        fence = marker;
        continue;
      }
    }
    visit(stripComments(raw, comment), i, false);
  }
}

/** The four lines of GSD's `templates/AI-SPEC.md` that the structural rules cannot tell from authored text: two table
 * rows whose cells hold the template's own options, and two lines inside the template's fenced blocks. Compared with
 * spaces removed, so the same row spaced differently still matches. Everything else the template leaves in place is a
 * comment, a blockquote, a heading, a bare label, a number stub or an empty table row, which `scanSection` knows by
 * shape. */
const TEMPLATE_LINES: ReadonlySet<string> = new Set([
  '|||Code/LLMJudge/Human|Critical/High/Medium|',
  '|||Block/Escalate/Flag|',
  'project/',
  '\u251C\u2500\u2500#Framework-specificfolderlayout',
]);

function squash(text: string): string {
  return text.split(' ').join('').split('\t').join('');
}

function cap(text: string): string {
  return text.length > AI_SPEC_FIELD_CAP ? text.slice(0, AI_SPEC_FIELD_CAP) : text;
}

/** The cells of a table row, the outer pipes dropped, each trimmed. */
function splitCells(text: string): string[] {
  let t = text.trim();
  if (t.charCodeAt(0) === 124) t = t.slice(1);
  if (t.length > 0 && t.charCodeAt(t.length - 1) === 124) t = t.slice(0, -1);
  return t.split('|').map((cell) => cell.trim());
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

// ---------------------------------------------------------------------------------------------------------------
// The unfilled-slot rule. A numbered section is a template slot when nothing in it is the author's. The scan is one
// pass over the section's lines with HTML comments already removed (an unterminated one ends with the section), and
// a line is scaffolding - not the author's - when it is:
//   - blank, or a horizontal rule;
//   - a blockquote line (the template's "Researched by ..." notes);
//   - a heading of level three or deeper (a sub-heading alone says nothing);
//   - a bold label with nothing after it (`**Description:**`);
//   - only a list number and a dot, or a bare list marker (the template's `1.` stubs);
//   - a table header row (the row a separator row follows), a separator row, a row whose cells are all empty, or one
//     of the template's own option rows (TEMPLATE_LINES);
//   - inside a fenced block: blank, a hash or double-slash comment, or one of the template's own placeholder lines.
// Every other line is written. The Checklist is progress, never a slot, because it is not a numbered section.
// ---------------------------------------------------------------------------------------------------------------

function isRule(t: string): boolean {
  if (t.length < 3) return false;
  const first = t.charCodeAt(0);
  if (first !== 45 && first !== 42 && first !== 95) return false;
  for (let i = 1; i < t.length; i += 1) if (t.charCodeAt(i) !== first) return false;
  return true;
}

function isDeepHeading(t: string): boolean {
  let hashes = 0;
  while (hashes < t.length && t.charCodeAt(hashes) === 35) hashes += 1;
  return hashes >= 3 && hashes <= 6 && (hashes === t.length || t.charCodeAt(hashes) === 32);
}

/** `**Label:**` with nothing after it, the colon inside or outside the bold. */
function isBareLabel(t: string): boolean {
  if (!t.startsWith('**')) return false;
  const close = t.indexOf('**', 2);
  if (close === -1) return false;
  const inner = t.slice(2, close).trim();
  const rest = t.slice(close + 2).trim();
  return inner !== '' && ((rest === '' && inner.endsWith(':')) || rest === ':');
}

/** `1.`, `2)`, `-`, `*` or `+` and nothing else. */
function isListStub(t: string): boolean {
  if (t.length === 1) return t === '-' || t === '*' || t === '+';
  let i = 0;
  while (i < t.length && t.charCodeAt(i) >= 48 && t.charCodeAt(i) <= 57) i += 1;
  return i > 0 && i === t.length - 1 && (t.charAt(i) === '.' || t.charAt(i) === ')');
}

function isScaffoldLine(text: string, lines: readonly string[], index: number): boolean {
  const t = text.trim();
  if (t === '' || isRule(t) || t.charCodeAt(0) === 62 || isDeepHeading(t)) return true;
  if (isBareLabel(t) || isListStub(t)) return true;
  if (t.charCodeAt(0) === 124) {
    if (isSeparatorRow(t) || TEMPLATE_LINES.has(squash(t))) return true;
    if (splitCells(t).every((cell) => cell === '')) return true;
    return index + 1 < lines.length && isSeparatorRow(lines[index + 1]);
  }
  return TEMPLATE_LINES.has(squash(t));
}

function isScaffoldFenceLine(text: string): boolean {
  const t = text.trim();
  return t === '' || t.charCodeAt(0) === 35 || t.startsWith('//') || TEMPLATE_LINES.has(squash(t));
}

/** How many lines of [from, to) are the author's. Zero means the section is a template slot. */
function writtenIn(lines: readonly string[], from: number, to: number): number {
  let written = 0;
  scanLines(lines, from, to, (text, index, inFence) => {
    if (inFence ? !isScaffoldFenceLine(text) : !isScaffoldLine(text, lines, index)) written += 1;
  });
  return written;
}

function sectionNumberOf(heading: string): string | null {
  let i = 0;
  while (i < heading.length && heading.charCodeAt(i) >= 48 && heading.charCodeAt(i) <= 57) i += 1;
  if (i === 0) return null;
  const letter = heading.charCodeAt(i);
  if (letter >= 97 && letter <= 122) i += 1;
  if (heading.charCodeAt(i) !== 46) return null;
  return heading.slice(0, i);
}

/** The value after `**Label:**` on a line, or null when the line is another label or has nothing after it. */
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

interface SectionRange {
  heading: string;
  number: string | null;
  from: number;
  to: number;
}

function fieldIn(lines: readonly string[], range: SectionRange | undefined, label: string): string | null {
  if (range === undefined) return null;
  let found: string | null = null;
  scanLines(lines, range.from, range.to, (text, _index, inFence) => {
    if (inFence || found !== null) return;
    found = labelValue(text, label);
  });
  return found;
}

function dimensionsIn(lines: readonly string[], range: SectionRange | undefined): AiSpecDimension[] {
  if (range === undefined) return [];
  const rows: string[] = [];
  let started = false;
  let ended = false;
  scanLines(lines, range.from, range.to, (text, _index, inFence) => {
    if (inFence || ended) return;
    const t = text.trim();
    if (t.charCodeAt(0) === 124) {
      started = true;
      if (rows.length < AI_SPEC_DIMENSION_CAP + 2) rows.push(t);
    } else if (started && t !== '') {
      ended = true;
    }
  });
  const dimensions: AiSpecDimension[] = [];
  // The first row is the header when a separator row follows it.
  let first = rows.length > 1 && isSeparatorRow(rows[1]) ? 2 : 0;
  if (first === 0 && rows.length > 0 && isSeparatorRow(rows[0])) first = 1;
  for (let i = first; i < rows.length && dimensions.length < AI_SPEC_DIMENSION_CAP; i += 1) {
    const cells = splitCells(rows[i]);
    if (cells.every((cell) => cell === '') || TEMPLATE_LINES.has(squash(rows[i]))) continue;
    dimensions.push({
      name: cap(cells[0] ?? ''),
      rubric: cap(cells[1] ?? ''),
      measurement: cap(cells[2] ?? ''),
      priority: cap(cells[3] ?? ''),
    });
  }
  return dimensions;
}

function checklistIn(
  lines: readonly string[],
  range: SectionRange | undefined,
): { done: number; total: number; items: boolean[] } {
  const out: { done: number; total: number; items: boolean[] } = { done: 0, total: 0, items: [] };
  if (range === undefined) return out;
  scanLines(lines, range.from, range.to, (text, _index, inFence) => {
    if (inFence || out.total >= AI_SPEC_CHECKLIST_CAP) return;
    const t = text.trim();
    const bullet = t.charCodeAt(0);
    if ((bullet !== 45 && bullet !== 42) || t.charCodeAt(1) !== 32 || t.charCodeAt(2) !== 91) return;
    const mark = t.charCodeAt(3);
    if (t.charCodeAt(4) !== 93 || (mark !== 32 && mark !== 120 && mark !== 88)) return;
    out.total += 1;
    out.items.push(mark !== 32);
    if (mark !== 32) out.done += 1;
  });
  return out;
}

/** Reads an AI-SPEC.md body. Never throws on text; bounded and linear. */
export function extractAiSpec(body: string): AiSpecBody {
  const lines = splitBodyLines(body);
  const ranges: SectionRange[] = [];
  for (const section of scanFencedLines(lines)) {
    if (section.level !== 2) continue;
    ranges.push({
      heading: section.heading,
      number: sectionNumberOf(section.heading),
      from: section.startLine + 1,
      to: section.endLine,
    });
  }
  const byNumber = (number: string): SectionRange | undefined => ranges.find((r) => r.number === number);
  const checklist = ranges.find((r) => r.heading.toLowerCase() === 'checklist');
  const sections: AiSpecSection[] = [];
  for (const range of ranges) {
    if (range.number === null || sections.length >= AI_SPEC_SECTION_CAP) continue;
    const written = writtenIn(lines, range.from, range.to);
    sections.push({ number: range.number, heading: range.heading, slot: written === 0, written });
  }
  return {
    systemType: fieldIn(lines, byNumber('1'), 'System Type'),
    framework: fieldIn(lines, byNumber('2'), 'Selected Framework'),
    version: fieldIn(lines, byNumber('2'), 'Version'),
    stakes: fieldIn(lines, byNumber('1b'), 'Stakes Level'),
    vendorLockIn: fieldIn(lines, byNumber('2'), 'Vendor Lock-In Accepted'),
    dimensions: dimensionsIn(lines, byNumber('5')),
    checklist: checklistIn(lines, checklist),
    sections,
  };
}

export const AiSpecHandler: ArtifactHandler = {
  kind: 'ai-spec',
  match: (ref) => artifactTokenOf(ref) === 'AI-SPEC',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let aiSpec: AiSpecBody | undefined;
    try {
      aiSpec = extractAiSpec(fm.body);
    } catch {
      aiSpec = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: aiSpec === undefined ? {} : { aiSpec },
    };
  },
};
