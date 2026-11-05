// USER-SETUP.md body reader (Phase 10, 10-19, VIEW-11, T-10-33, T-10-35). `extractUserSetup` reads what GSD's
// `templates/user-setup.md` writes and what the User setup page (sketch 049 winner B) draws:
//   - the head lines `**Generated:**`, `**Phase:**` and `**Status:**` (the file's own word, kept apart from the boxes);
//   - the Environment Variables table: every row's Variable, Source and Add to cells, and its Status box when the
//     table has a Status column (`[x]` done, `[ ]` pending, anything else not stated);
//   - the checklist items (`- [x]` and `- [ ]`) of every `##` section with their indented `- Key: value` lines;
//   - every `##` section of the file as masked lines, so the page can draw a plain layout when no step is
//     recognised.
// A step is a table row that has a Status box or a checklist item. A person may paste a real secret beside a
// variable's name, so the Variable cell goes through `withholdValue` (only the name is kept and the fact that a value
// was written) and every other string that is stored goes through `keep` below, which is `maskValues` over a capped
// string. Line scans over `eachLineOutsideFences` and `scanFencedLines` only: no regular expression, none built from
// document text. The body is capped at FENCED_BODY_CAP characters (250,000), steps and variables at 200, sections at
// 200, lines per section at 2,000 and every cell, field and line at 400 characters (T-10-35).
import { eachLineOutsideFences, scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import { withholdValue } from './withhold-values.ts';

/** The most steps and the most variables kept. */
export const USER_SETUP_STEP_CAP = 200;
/** The most `##` sections stored. */
export const USER_SETUP_SECTION_CAP = 200;
/** The most lines stored for one section. */
export const USER_SETUP_LINE_CAP = 2000;
/** The most characters stored for one cell, field, heading or line. */
export const USER_SETUP_CELL_CAP = 400;

export interface UserSetupField {
  /** The key as written ("URL", "Location", "Set to", "Notes", "Skip if"). */
  key: string;
  value: string;
}

export interface UserSetupVariable {
  name: string;
  /** True when the file wrote a value beside the name; the value itself is never kept. */
  hadValue: boolean;
  source: string | null;
  destination: string | null;
  /** The Status box, or null when the table has no Status column or the box is neither `[x]` nor `[ ]`. */
  done: boolean | null;
  /** True when the row is also one of the steps (its table has a Status column). */
  step: boolean;
  /** The heading of the `##` section the row is in. */
  group: string;
}

export type UserSetupStepKind = 'variable' | 'account' | 'dashboard';

export interface UserSetupStep {
  kind: UserSetupStepKind;
  /** A variable's name, or the item's bold text. */
  title: string;
  /** True ticked, false open, null when the box is neither `[x]` nor `[ ]`. */
  done: boolean | null;
  /** The heading of the `##` section the step is in. */
  group: string;
  /** A variable step: true when the file wrote a value beside the name. */
  hadValue: boolean;
  source: string | null;
  destination: string | null;
  /** A checklist item's indented `- Key: value` lines, in file order. */
  fields: UserSetupField[];
  /** The values of the item's `Notes` lines. */
  notes: string[];
}

export interface UserSetupSection {
  heading: string;
  lines: string[];
}

export interface UserSetupBody {
  generated: string | null;
  phase: string | null;
  /** The file's own **Status:** word. */
  status: string | null;
  variables: UserSetupVariable[];
  steps: UserSetupStep[];
  doneCount: number;
  total: number;
  /** True when the file has text of its own before its first `##` section besides the title and head lines. */
  hasIntro: boolean;
  sections: UserSetupSection[];
}

/** Every stored string passes here: capped, then (10-19 Task 2) masked. */
function keep(text: string): string {
  return text.length > USER_SETUP_CELL_CAP ? text.slice(0, USER_SETUP_CELL_CAP) : text;
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

/** `[x]` or `[X]` true, `[ ]` false, anything else null. */
function boxOf(text: string): boolean | null {
  const t = text.trim();
  if (t.length !== 3 || t.charCodeAt(0) !== 91 || t.charCodeAt(2) !== 93) return null;
  const mark = t.charCodeAt(1);
  if (mark === 120 || mark === 88) return true;
  if (mark === 32) return false;
  return null;
}

function stripTicks(text: string): string {
  return text.split('`').join('').trim();
}

function indexOfHeader(headers: readonly string[], names: readonly string[]): number {
  for (let i = 0; i < headers.length; i += 1) if (names.includes(headers[i])) return i;
  return -1;
}

interface Collector {
  variables: UserSetupVariable[];
  steps: UserSetupStep[];
}

/** The Variable table of one section's lines outside fences, rows read into `into`. */
function readVariableTable(lines: readonly string[], group: string, into: Collector): void {
  let headerAt = -1;
  for (let i = 0; i + 1 < lines.length; i += 1) {
    const t = lines[i].trim();
    if (t.charCodeAt(0) !== 124 || !isSeparatorRow(lines[i + 1])) continue;
    const headers = splitCells(t).map((cell) => cell.toLowerCase());
    if (headers.includes('variable')) {
      headerAt = i;
      break;
    }
  }
  if (headerAt < 0) return;
  const headers = splitCells(lines[headerAt]).map((cell) => cell.toLowerCase());
  const iVariable = headers.indexOf('variable');
  const iStatus = headers.indexOf('status');
  const iSource = indexOfHeader(headers, ['source']);
  const iTo = indexOfHeader(headers, ['add to', 'goes in', 'file']);
  for (let i = headerAt + 2; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (t.charCodeAt(0) !== 124) break;
    if (into.variables.length >= USER_SETUP_STEP_CAP) break;
    const cells = splitCells(t);
    const cell = cells[iVariable] ?? '';
    const withheld = withholdValue(cell);
    const name = withheld !== null ? withheld.name : keep(stripTicks(cell));
    const hadValue = withheld !== null && withheld.hadValue;
    const source = iSource >= 0 && (cells[iSource] ?? '') !== '' ? keep(cells[iSource]) : null;
    const destination = iTo >= 0 && (cells[iTo] ?? '') !== '' ? keep(stripTicks(cells[iTo])) : null;
    const hasStatus = iStatus >= 0;
    const done = hasStatus ? boxOf(cells[iStatus] ?? '') : null;
    const asStep = hasStatus && into.steps.length < USER_SETUP_STEP_CAP;
    into.variables.push({ name, hadValue, source, destination, done, step: asStep, group });
    if (asStep) {
      into.steps.push({
        kind: 'variable',
        title: name,
        done,
        group,
        hadValue,
        source,
        destination,
        fields: [],
        notes: [],
      });
    }
  }
}

/** The title of a checklist item: the text after `- [ ]`, the bold marks dropped. */
function itemTitle(text: string): string {
  return text.split('**').join('').trim();
}

/** A checklist line: `- [x] text` at the start of the line. Returns the box and the text, or null. */
function readItemLine(line: string): { done: boolean | null; text: string } | null {
  if (line.charCodeAt(0) !== 45 || line.charCodeAt(1) !== 32 || line.charCodeAt(2) !== 91) return null;
  if (line.charCodeAt(4) !== 93) return null;
  const mark = line.charCodeAt(3);
  const done = mark === 120 || mark === 88 ? true : mark === 32 ? false : null;
  let at = 5;
  if (line.charCodeAt(at) !== 32 && line.charCodeAt(at) !== 9) return null;
  while (line.charCodeAt(at) === 32 || line.charCodeAt(at) === 9) at += 1;
  return { done, text: line.slice(at) };
}

/** An indented `- Key: value` line, or null. */
function readFieldLine(line: string): UserSetupField | null {
  const first = line.charCodeAt(0);
  if (first !== 32 && first !== 9) return null;
  let at = 0;
  while (line.charCodeAt(at) === 32 || line.charCodeAt(at) === 9) at += 1;
  if (line.charCodeAt(at) !== 45 || line.charCodeAt(at + 1) !== 32) return null;
  const rest = line.slice(at + 2);
  const colon = rest.indexOf(':');
  if (colon <= 0) return null;
  return { key: keep(rest.slice(0, colon).trim()), value: keep(rest.slice(colon + 1).trim()) };
}

function stepKindOf(group: string): UserSetupStepKind {
  return group.toLowerCase().includes('account') ? 'account' : 'dashboard';
}

/** The checklist items of one section's lines outside fences, read into `into`. */
function readChecklist(lines: readonly string[], group: string, into: Collector): void {
  let current: UserSetupStep | null = null;
  for (const line of lines) {
    if (into.steps.length >= USER_SETUP_STEP_CAP) return;
    const item = readItemLine(line);
    if (item !== null) {
      current = {
        kind: stepKindOf(group),
        title: keep(itemTitle(item.text)),
        done: item.done,
        group,
        hadValue: false,
        source: null,
        destination: null,
        fields: [],
        notes: [],
      };
      into.steps.push(current);
      continue;
    }
    if (current === null) continue;
    const field = readFieldLine(line);
    if (field !== null) {
      current.fields.push(field);
      if (field.key.toLowerCase() === 'notes') current.notes.push(field.value);
      continue;
    }
    if (line.trim() !== '' && line.charCodeAt(0) !== 32 && line.charCodeAt(0) !== 9) current = null;
  }
}

/** The value after `**Label:**` on a head line, or null. */
function labelValue(line: string, label: string): string | null {
  const t = line.trim();
  if (!t.startsWith('**')) return null;
  const close = t.indexOf('**', 2);
  if (close === -1) return null;
  let name = t.slice(2, close).trim();
  let rest = t.slice(close + 2);
  if (name.endsWith(':')) name = name.slice(0, -1).trim();
  else if (rest.startsWith(':')) rest = rest.slice(1);
  if (name.toLowerCase() !== label.toLowerCase()) return null;
  const value = rest.trim();
  return value === '' ? null : keep(value);
}

/** True for a line that is only a label line (`**Generated:** ...`), a title, a rule, an HTML comment or blank. */
function isHeadScaffold(line: string): boolean {
  const t = line.trim();
  if (t === '' || t.charCodeAt(0) === 35) return true;
  if (t.startsWith('<!--') && t.endsWith('-->')) return true;
  if (t.startsWith('**')) {
    const close = t.indexOf('**', 2);
    if (close > 0) {
      const inner = t.slice(2, close).trim();
      if (inner.endsWith(':') || t.charCodeAt(close + 2) === 58) return true;
    }
  }
  return false;
}

/** Reads a USER-SETUP.md body. Never throws on text; bounded and linear. */
export function extractUserSetup(body: string): UserSetupBody {
  const lines = splitBodyLines(body);
  const ranges = scanFencedLines(lines).filter((section) => section.level === 2);
  const headEnd = ranges.length > 0 ? ranges[0].startLine : lines.length;

  let generated: string | null = null;
  let phase: string | null = null;
  let status: string | null = null;
  let hasIntro = false;
  eachLineOutsideFences(lines, 0, headEnd, (line) => {
    if (generated === null) generated = labelValue(line, 'Generated');
    if (phase === null) phase = labelValue(line, 'Phase');
    if (status === null) status = labelValue(line, 'Status');
    if (!hasIntro && !isHeadScaffold(line)) hasIntro = true;
  });

  const collected: Collector = { variables: [], steps: [] };
  for (const range of ranges) {
    const group = keep(range.heading);
    const outside: string[] = [];
    eachLineOutsideFences(lines, range.startLine + 1, range.endLine, (line) => {
      outside.push(line);
    });
    readVariableTable(outside, group, collected);
    readChecklist(outside, group, collected);
  }

  const sections: UserSetupSection[] = [];
  for (const range of ranges) {
    if (sections.length >= USER_SETUP_SECTION_CAP) break;
    const stored: string[] = [];
    const to = Math.min(range.endLine, range.startLine + 1 + USER_SETUP_LINE_CAP);
    for (let i = range.startLine + 1; i < to; i += 1) stored.push(keep(lines[i]));
    sections.push({ heading: keep(range.heading), lines: stored });
  }

  const doneCount = collected.steps.filter((step) => step.done === true).length;
  return {
    generated,
    phase,
    status,
    variables: collected.variables,
    steps: collected.steps,
    doneCount,
    total: collected.steps.length,
    hasIntro,
    sections,
  };
}
