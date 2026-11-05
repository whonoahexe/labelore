// The SPEC.md extractor (Phase 10, 10-16, VIEW-11), kept apart from the handler so a throwing extractor is
// provable. `extractSpec` reads what GSD's `templates/spec.md` writes and what `/gsd-spec-phase` fills in:
//   - the head lines: `**Created:**`, `**Ambiguity score:** 0.14 (gate: ≤ 0.20)` and `**Requirements:** 5 locked`;
//   - `## Goal`, `## Requirements` (numbered items with Current, Target and Acceptance sub-bullets), `## Boundaries`
//     (`**In scope:**` and `**Out of scope:**` bullets), `## Ambiguity Report` (the dimension table), and the
//     `## Edge Coverage` and `## Prohibitions (must-NOT)` tables whose rows name `R{n}`;
//   - every other `##` heading, in file order, so a page can show what it did not draw.
// The score is the number written first after the label: a placeholder such as `[score]` is no score, even though a
// gate number follows it (RESEARCH Pitfall 14). The gate is the number after `gate`, whatever comparator the writer
// used (`≤`, `<=`, `<` or the entity `&le;`); a score with no gate uses GSD's 0.20. A requirements line that
// disagrees with the numbered items is kept as written (`lockedCount`), the items are kept as found.
// Line scans over `splitFencedSections`' fence handling only: no regular expression, none built from document text.
// The body is capped at FENCED_BODY_CAP characters (250,000), requirements at 200, rows at 200, and every field at
// 2,000 characters (T-10-28).
import { eachLineOutsideFences, scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import type { FencedSection } from './fenced-sections.ts';

/** The most requirements kept. */
export const SPEC_REQUIREMENT_CAP = 200;
/** The most characters kept of one field, statement or list item. */
export const SPEC_FIELD_CAP = 2000;
/** The most list items (scope) and table rows (coverage) kept per list. */
export const SPEC_ROW_CAP = 200;
/** The most dimension rows kept. */
export const SPEC_DIMENSION_CAP = 12;
/** The most `##` headings listed. */
export const SPEC_SECTION_CAP = 60;
/** The most extra bullets kept per requirement. */
export const SPEC_EXTRA_CAP = 20;
/** GSD's gate: score at or below this is locked enough to plan. */
export const SPEC_DEFAULT_GATE = 0.2;

export interface SpecAmbiguity {
  /** The score as a number, or null when the line is missing or holds a placeholder. */
  score: number | null;
  /** The score as written ("0.14"), or null. */
  scoreText: string | null;
  /** The gate: the stated one, else GSD's 0.20. */
  gate: number;
  /** The gate as written, or "0.20" when it was not stated. */
  gateText: string;
  gateStated: boolean;
}

export interface SpecRequirement {
  /** The file's own number. */
  n: number;
  label: string;
  statement: string;
  current: string | null;
  target: string | null;
  acceptance: string | null;
  /** Any other sub-bullet under the requirement, as written. */
  extras: string[];
}

export interface SpecDimension {
  name: string;
  score: number | null;
  scoreText: string | null;
  min: number | null;
  minText: string | null;
  /** The status column's word: ⚠ is below, ✓ is met; with neither, compared when both numbers read. */
  status: 'met' | 'below' | 'unknown';
  notes: string | null;
}

export type SpecCoverageKind =
  'covered' | 'backstop' | 'resolved' | 'unresolved' | 'dismissed' | 'other';

export interface SpecCoverageRow {
  /** The first column: the edge category or the prohibition statement. */
  label: string;
  /** Every `R{n}` the requirement cell names. */
  requirements: number[];
  kind: SpecCoverageKind;
  /** The status as written with symbols and emoji removed. */
  statusText: string;
  /** The resolution or reason cell, or null. */
  reason: string | null;
}

export interface SpecOutOfScope {
  item: string;
  /** The text after the first spaced em dash, or null. */
  reason: string | null;
}

export interface SpecSection {
  heading: string;
  /** True when the page draws this section itself (Goal, Requirements, Boundaries). */
  claimed: boolean;
}

export interface SpecBody {
  created: string | null;
  goal: string | null;
  ambiguity: SpecAmbiguity;
  /** The N of `**Requirements:** N locked`, or null (a placeholder or no line). */
  lockedCount: number | null;
  requirements: SpecRequirement[];
  /** Requirements past the cap, counted and not kept. */
  requirementsOmitted: number;
  inScope: string[];
  outOfScope: SpecOutOfScope[];
  /** The Ambiguity Report's dimension rows, the total row left out. */
  dimensions: SpecDimension[];
  /** The Edge Coverage table's rows, or null when the file has no such table. */
  edges: SpecCoverageRow[] | null;
  /** The Prohibitions table's rows, or null when the file has no such table. */
  prohibitions: SpecCoverageRow[] | null;
  /** Every `##` heading, in file order. */
  sections: SpecSection[];
}

function capText(text: string): string {
  return text.length > SPEC_FIELD_CAP ? text.slice(0, SPEC_FIELD_CAP) : text;
}

function stripBold(text: string): string {
  return text.includes('**') ? text.split('**').join('') : text;
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

/** A number written as digits with one optional fractional part, read from `from`. */
function readNumber(
  text: string,
  from: number,
): { text: string; value: number; end: number } | null {
  let i = from;
  while (i < text.length && isDigit(text.charCodeAt(i))) i += 1;
  const whole = i;
  if (text.charCodeAt(i) === 46 && isDigit(text.charCodeAt(i + 1))) {
    i += 1;
    while (i < text.length && isDigit(text.charCodeAt(i))) i += 1;
  } else if (whole === from) {
    return null;
  }
  const raw = text.slice(from, i);
  const value = Number(raw);
  return Number.isFinite(value) ? { text: raw, value, end: i } : null;
}

/** The text after `label:` on a head line, bold markers dropped, or null when the line is another line. */
function valueAfter(line: string, label: string): string | null {
  const plain = stripBold(line.trim());
  if (!plain.toLowerCase().startsWith(`${label}:`)) return null;
  return plain.slice(label.length + 1).trim();
}

function isCommentLine(trimmed: string): boolean {
  return trimmed.startsWith('<!--') && trimmed.endsWith('-->');
}

function readAmbiguity(value: string | null): SpecAmbiguity {
  const out: SpecAmbiguity = {
    score: null,
    scoreText: null,
    gate: SPEC_DEFAULT_GATE,
    gateText: '0.20',
    gateStated: false,
  };
  if (value === null) return out;
  let start = 0;
  while (
    start < value.length &&
    (value[start] === ' ' || value[start] === '~' || value[start] === '`')
  )
    start += 1;
  const score = readNumber(value, start);
  if (score !== null) {
    out.score = score.value;
    out.scoreText = score.text;
  }
  const lower = value.toLowerCase();
  const gateAt = lower.indexOf('gate');
  if (gateAt >= 0) {
    let p = gateAt + 4;
    for (;;) {
      const ch = value[p];
      if (ch === undefined) break;
      if (ch === ' ' || ch === ':' || ch === '=' || ch === '<' || ch === '≤' || ch === '\t') {
        p += 1;
      } else if (lower.startsWith('&le;', p) || lower.startsWith('&lt;', p)) {
        p += 4;
      } else if (lower.startsWith('&#8804;', p)) {
        p += 7;
      } else {
        break;
      }
    }
    const gate = readNumber(value, p);
    if (gate !== null) {
      out.gate = gate.value;
      out.gateText = gate.text;
      out.gateStated = true;
    }
  }
  return out;
}

function sectionKey(heading: string): string {
  return stripBold(heading).trim().toLowerCase();
}

/** The non-blank, non-comment, non-rule lines of a section's body joined into one paragraph. */
function paragraphOf(lines: readonly string[], from: number, to: number): string | null {
  const parts: string[] = [];
  let size = 0;
  for (let i = from; i < to && size < SPEC_FIELD_CAP * 2; i += 1) {
    const t = lines[i].trim();
    if (t === '' || isCommentLine(t) || t === '---') continue;
    parts.push(t);
    size += t.length + 1;
  }
  return parts.length === 0 ? null : capText(parts.join(' '));
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

interface RequirementHead {
  n: number;
  label: string;
  statement: string;
}

function readRequirementHead(line: string): RequirementHead | null {
  const t = line.trimStart();
  if (line.length - t.length > 3) return null;
  let i = 0;
  while (i < t.length && isDigit(t.charCodeAt(i))) i += 1;
  if (i === 0 || i > 6) return null;
  const mark = t[i];
  if (mark !== '.' && mark !== ')') return null;
  const space = t[i + 1];
  if (space !== ' ' && space !== '\t') return null;
  const n = Number(t.slice(0, i));
  const rest = t.slice(i + 2).trim();
  if (rest === '') return null;
  if (rest.startsWith('**')) {
    const close = rest.indexOf('**', 2);
    if (close > 2) {
      let label = rest.slice(2, close).trim();
      if (label.endsWith(':')) label = label.slice(0, -1).trim();
      let after = rest.slice(close + 2).trim();
      if (after.startsWith(':')) after = after.slice(1).trim();
      return { n, label: capText(label), statement: capText(after) };
    }
  }
  const colon = rest.indexOf(':');
  if (colon > 0 && colon <= 80)
    return {
      n,
      label: capText(rest.slice(0, colon).trim()),
      statement: capText(rest.slice(colon + 1).trim()),
    };
  return { n, label: capText(rest), statement: '' };
}

type FieldName = 'current' | 'target' | 'acceptance' | 'statement' | 'extra';

interface RequirementDraft {
  head: RequirementHead;
  current: string | null;
  target: string | null;
  acceptance: string | null;
  extras: string[];
}

function bulletBody(trimmed: string): string | null {
  const first = trimmed[0];
  if (
    (first === '-' || first === '*' || first === '+') &&
    (trimmed[1] === ' ' || trimmed[1] === '\t')
  )
    return trimmed.slice(2).trim();
  return null;
}

function readRequirements(
  lines: readonly string[],
  from: number,
  to: number,
): { items: SpecRequirement[]; omitted: number } {
  const items: SpecRequirement[] = [];
  let omitted = 0;
  let draft: RequirementDraft | null = null;
  let pointer: FieldName | null = null;
  let previousBlank = true;

  const flush = (): void => {
    if (draft === null) return;
    items.push({
      n: draft.head.n,
      label: draft.head.label,
      statement: draft.head.statement,
      current: draft.current,
      target: draft.target,
      acceptance: draft.acceptance,
      extras: draft.extras,
    });
    draft = null;
  };
  const append = (field: FieldName, text: string): void => {
    if (draft === null) return;
    if (field === 'statement')
      draft.head.statement = capText(
        draft.head.statement === '' ? text : `${draft.head.statement} ${text}`,
      );
    else if (field === 'extra') {
      const last = draft.extras.length - 1;
      if (last >= 0) draft.extras[last] = capText(`${draft.extras[last]} ${text}`);
    } else draft[field] = capText(draft[field] === null ? text : `${draft[field]} ${text}`);
  };

  eachLineOutsideFences(lines, from, to, (line) => {
    const trimmed = line.trim();
    if (trimmed === '' || isCommentLine(trimmed)) {
      previousBlank = true;
      pointer = null;
      return;
    }
    const head = readRequirementHead(line);
    if (head !== null) {
      flush();
      if (items.length >= SPEC_REQUIREMENT_CAP) {
        omitted += 1;
        draft = null;
      } else {
        draft = { head, current: null, target: null, acceptance: null, extras: [] };
      }
      pointer = 'statement';
      previousBlank = false;
      return;
    }
    if (draft === null) {
      previousBlank = false;
      return;
    }
    const indent = line.length - line.trimStart().length;
    const body = bulletBody(trimmed);
    if (body !== null && indent >= 1) {
      const plain = stripBold(body);
      const lower = plain.toLowerCase();
      let matched: FieldName | null = null;
      for (const name of ['current', 'target', 'acceptance'] as const) {
        if (lower.startsWith(`${name}:`)) {
          matched = name;
          const value = capText(plain.slice(name.length + 1).trim());
          draft[name] = draft[name] === null ? value : capText(`${draft[name]} ${value}`);
          break;
        }
      }
      if (matched === null) {
        if (draft.extras.length < SPEC_EXTRA_CAP) draft.extras.push(capText(plain));
        pointer = 'extra';
      } else {
        pointer = matched;
      }
    } else if (indent >= 2 && !previousBlank && pointer !== null) {
      append(pointer, trimmed);
    } else {
      pointer = null;
    }
    previousBlank = false;
  });
  flush();
  return { items, omitted };
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** A table line split at unescaped pipes into trimmed cells; the outer pipes are dropped. */
function splitCells(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  const t = line.trim();
  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i];
    if (ch === '\\' && t[i + 1] === '|') {
      current += '|';
      i += 1;
    } else if (ch === '|') {
      cells.push(current.trim());
      current = '';
    } else if (current.length <= SPEC_FIELD_CAP) {
      current += ch;
    }
  }
  cells.push(current.trim());
  if (t.startsWith('|')) cells.shift();
  if (t.endsWith('|') && !t.endsWith('\\|')) cells.pop();
  return cells;
}

function isSeparatorRow(cells: readonly string[]): boolean {
  if (cells.length === 0) return false;
  for (const cell of cells) {
    if (cell === '') return false;
    for (let i = 0; i < cell.length; i += 1) {
      const ch = cell[i];
      if (ch !== '-' && ch !== ':' && ch !== ' ') return false;
    }
  }
  return true;
}

/** The first table in the range: its header cells and its data rows (the separator row dropped). */
function readTable(
  lines: readonly string[],
  from: number,
  to: number,
): { header: string[]; rows: string[][] } | null {
  let header: string[] | null = null;
  const rows: string[][] = [];
  eachLineOutsideFences(lines, from, to, (line) => {
    const t = line.trim();
    if (!t.startsWith('|')) {
      return;
    }
    const cells = splitCells(t);
    if (header === null) {
      header = cells;
      return;
    }
    if (rows.length === 0 && isSeparatorRow(cells)) return;
    if (rows.length < SPEC_ROW_CAP) rows.push(cells);
  });
  return header === null ? null : { header, rows };
}

function columnOf(
  header: readonly string[],
  test: (name: string) => boolean,
  fallback: number,
): number {
  for (let i = 0; i < header.length; i += 1) if (test(header[i].toLowerCase())) return i;
  return fallback;
}

function readComparedNumber(text: string): { text: string; value: number } | null {
  let p = 0;
  while (p < text.length) {
    const ch = text[p];
    if (
      ch === ' ' ||
      ch === '≤' ||
      ch === '≥' ||
      ch === '<' ||
      ch === '>' ||
      ch === '=' ||
      ch === '~'
    )
      p += 1;
    else break;
  }
  const number = readNumber(text, p);
  return number === null ? null : { text: number.text, value: number.value };
}

function readDimensions(lines: readonly string[], from: number, to: number): SpecDimension[] {
  const table = readTable(lines, from, to);
  if (table === null) return [];
  const scoreCol = columnOf(table.header, (n) => n.includes('score'), 1);
  const minCol = columnOf(table.header, (n) => n.startsWith('min'), 2);
  const statusCol = columnOf(table.header, (n) => n.includes('status'), 3);
  const notesCol = columnOf(table.header, (n) => n.includes('note'), 4);
  const out: SpecDimension[] = [];
  for (const cells of table.rows) {
    const name = stripBold(cells[0] ?? '').trim();
    if (name === '' || name.toLowerCase().startsWith('ambiguity')) continue;
    if (out.length >= SPEC_DIMENSION_CAP) break;
    const score = readComparedNumber(stripBold(cells[scoreCol] ?? '').trim());
    const min = readComparedNumber((cells[minCol] ?? '').trim());
    const statusCell = cells[statusCol] ?? '';
    let status: SpecDimension['status'] = 'unknown';
    if (statusCell.includes('⚠')) status = 'below';
    else if (statusCell.includes('✓') || statusCell.includes('✔')) status = 'met';
    else if (score !== null && min !== null) status = score.value >= min.value ? 'met' : 'below';
    const notes = (cells[notesCol] ?? '').trim();
    out.push({
      name: capText(name),
      score: score === null ? null : score.value,
      scoreText: score === null ? null : score.text,
      min: min === null ? null : min.value,
      minText: min === null ? null : min.text,
      status,
      notes: notes === '' ? null : capText(notes),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

function findSection(
  sections: readonly FencedSection[],
  test: (key: string) => boolean,
): FencedSection | null {
  for (const section of sections) {
    if (section.level === 2 && test(sectionKey(section.heading))) return section;
  }
  return null;
}

/** Reads a SPEC.md body. Never throws on text; the handler still guards the call. */
export function extractSpec(body: string): SpecBody {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines);
  const firstSection = sections.find((s) => s.level === 2);
  const headEnd = firstSection === undefined ? lines.length : firstSection.startLine;

  let created: string | null = null;
  let ambiguityValue: string | null = null;
  let lockedValue: string | null = null;
  eachLineOutsideFences(lines, 0, headEnd, (line) => {
    const t = line.trim();
    if (t === '' || isCommentLine(t)) return;
    if (created === null) {
      const value = valueAfter(t, 'created');
      if (value !== null && value !== '' && !value.startsWith('[')) created = capText(value);
    }
    if (ambiguityValue === null) ambiguityValue = valueAfter(t, 'ambiguity score');
    if (lockedValue === null) lockedValue = valueAfter(t, 'requirements');
  });
  const lockedNumber = lockedValue === null ? null : readNumber(lockedValue, 0);

  const goalSection = findSection(sections, (k) => k === 'goal');
  const goal =
    goalSection === null
      ? null
      : paragraphOf(lines, goalSection.startLine + 1, goalSection.endLine);

  const requirementsSection = findSection(sections, (k) => k === 'requirements');
  const read =
    requirementsSection === null
      ? { items: [] as SpecRequirement[], omitted: 0 }
      : readRequirements(lines, requirementsSection.startLine + 1, requirementsSection.endLine);

  const reportSection = findSection(sections, (k) => k === 'ambiguity report');
  const dimensions =
    reportSection === null
      ? []
      : readDimensions(lines, reportSection.startLine + 1, reportSection.endLine);

  const drawsGoal = goal !== null;
  const drawsRequirements = read.items.length > 0;
  const listed: SpecSection[] = [];
  for (const section of sections) {
    if (section.level !== 2 || listed.length >= SPEC_SECTION_CAP) continue;
    const key = sectionKey(section.heading);
    listed.push({
      heading: section.heading,
      claimed:
        (key === 'goal' && drawsGoal && section === goalSection) ||
        (key === 'requirements' && drawsRequirements && section === requirementsSection),
    });
  }

  return {
    created,
    goal,
    ambiguity: readAmbiguity(ambiguityValue),
    lockedCount: lockedNumber === null ? null : lockedNumber.value,
    requirements: read.items,
    requirementsOmitted: read.omitted,
    inScope: [],
    outOfScope: [],
    dimensions,
    edges: null,
    prohibitions: null,
    sections: listed,
  };
}
