// The AI spec composer (Phase 10, 10-18, VIEW-11, sketch 048 winner C "Datasheet + eval matrix"): a pure `ViewInput` ->
// `ComposedAiSpec` merge of `structured.aiSpec` (the tolerant reading the handler made of an AI-SPEC.md) and the
// page's own section groups. The first screen answers "what is this AI system, how will it be judged, and how much of
// the contract is written?":
//   - the datasheet: four field cells (System type, Framework with its version, Stakes level, Vendor lock-in), a cell
//     whose value is still the template's comment is a hatched "Template slot";
//   - the lead "{n} of {m} sections are still template slots" (omitted when none is) over a strip of one square per
//     numbered section (neutral when written, dashed when a slot), beside the checklist meter and its sentence
//     "{d} of {t} checklist items done";
//   - the evaluation dimensions placed by Priority (Critical, High, Medium) and Measurement (Code, LLM Judge,
//     Human); a dimension the grid has no place for is listed after it, never dropped;
//   - below, every section of the file in file order: a written one as a closed bar holding the section as the
//     document renders it, an unfilled template slot as a dashed row with its heading, the quiet chip and a Source
//     link. A slot's own text is never carried to the page.
// No DOM, no filesystem access, no rendering, no regular expression and no module-level state: two AI spec pages open
// at once each compose only from their own input. Returns `null` when the projection is missing or holds nothing the
// page can shape, so the page keeps the promoted-section view with no notice (RESEARCH C1).
// T-10-32: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';

export const TEMPLATE_SLOT_LABEL = 'Template slot';
/** The measurement columns of the evaluation grid, in the order the sketch draws them. */
export const MEASUREMENT_COLUMNS: readonly string[] = ['Code', 'LLM Judge', 'Human'];
/** The priority rows of the evaluation grid, in the order the sketch draws them. */
export const PRIORITY_ROWS: readonly string[] = ['Critical', 'High', 'Medium'];

/** The two section tones this page writes: written is neutral (no tone), a slot is `quiet`. */
export type AiSpecTone = 'complete' | 'quiet';

export interface ComposedAiSpecCell {
  key: 'system-type' | 'framework' | 'stakes' | 'vendor-lock-in';
  label: string;
  /** The value, or null when the file still holds the template's comment (a "Template slot" cell). */
  value: string | null;
  /** The framework's version or the lock-in reason, shown under the value; null when none. */
  note: string | null;
  noteKind: 'version' | 'reason' | null;
}

export interface ComposedAiSpecDimension {
  /** The row's index in the file's table, for opening it in the dock. */
  index: number;
  name: string;
  rubric: string;
  measurement: string;
  priority: string;
}

export interface ComposedAiSpecGridCell {
  priority: string;
  measurement: string;
  /** Indexes into `dimensions`. */
  dimensions: number[];
}

export interface ComposedAiSpecMatrix {
  cells: ComposedAiSpecGridCell[];
  /** Dimensions whose measurement or priority the grid has no column or row for. */
  unplaced: number[];
}

export interface ComposedAiSpecProgress {
  label: string;
  done: number;
  total: number;
  /** Each checklist item's own state in file order, or null when the file's list is not the count. */
  items: boolean[] | null;
}

export interface ComposedAiSpecStripItem {
  number: string;
  heading: string;
  slot: boolean;
  /** The element id of the section's row below. */
  targetId: string;
}

export interface ComposedAiSpecSlotRow {
  kind: 'slot';
  number: string;
  heading: string;
  id: string;
  /** The section's heading id in Source mode, or null. */
  sourceId: string | null;
}

export interface ComposedAiSpecBar {
  kind: 'bar';
  number: string | null;
  heading: string;
  id: string;
  /** The section as the document renders it, heading included. */
  html: string;
  /** "26 lines" or "6 of 16", or null. */
  count: string | null;
}

export type ComposedAiSpecRow = ComposedAiSpecSlotRow | ComposedAiSpecBar;

export interface ComposedAiSpec {
  cells: ComposedAiSpecCell[];
  dimensions: ComposedAiSpecDimension[];
  /** Null when the file states no dimension (the grid is one hatched box). */
  matrix: ComposedAiSpecMatrix | null;
  /** Null when the file has no checklist items. */
  progress: ComposedAiSpecProgress | null;
  slotCount: number;
  sectionCount: number;
  /** "3 of 9 sections are still template slots", or null when none is a slot. */
  slotLead: string | null;
  strip: ComposedAiSpecStripItem[];
  rows: ComposedAiSpecRow[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** "1", "1b" from "1. System Classification" or "4b. AI Systems Best Practices"; null for anything else. */
function sectionNumberOf(heading: string): string | null {
  let i = 0;
  while (i < heading.length && heading.charCodeAt(i) >= 48 && heading.charCodeAt(i) <= 57) i += 1;
  if (i === 0) return null;
  const letter = heading.charCodeAt(i);
  if (letter >= 97 && letter <= 122) i += 1;
  if (heading.charCodeAt(i) !== 46) return null;
  return heading.slice(0, i);
}

/** The element id a section's row carries; the number is digits and a letter, so the id is safe. */
export function sectionDomId(number: string): string {
  return `view-ai-spec-sec-${number}`;
}

/** The checklist's own row id. */
export const CHECKLIST_DOM_ID = 'view-ai-spec-sec-checklist';

/** The earliest index of any of `needles` in `text`, or -1. */
function earliest(text: string, needles: readonly string[]): number {
  let best = -1;
  for (const needle of needles) {
    const at = text.indexOf(needle);
    if (at >= 0 && (best < 0 || at < best)) best = at;
  }
  return best;
}

/** Which of `names` the text names first (case-insensitive), by the keywords each name goes by; null when none. */
function placeIn(
  text: string,
  names: readonly string[],
  keywords: readonly (readonly string[])[],
): string | null {
  const lower = text.toLowerCase();
  let best: string | null = null;
  let bestAt = -1;
  for (let i = 0; i < names.length; i += 1) {
    const at = earliest(lower, keywords[i]);
    if (at >= 0 && (bestAt < 0 || at < bestAt)) {
      best = names[i];
      bestAt = at;
    }
  }
  return best;
}

const MEASUREMENT_KEYWORDS: readonly (readonly string[])[] = [['code'], ['llm', 'judge'], ['human']];
const PRIORITY_KEYWORDS: readonly (readonly string[])[] = [['critical'], ['high'], ['medium']];

function composeDimensions(raw: readonly unknown[]): ComposedAiSpecDimension[] {
  const out: ComposedAiSpecDimension[] = [];
  raw.forEach((item, index) => {
    if (!isRecord(item)) return;
    const name = textOrNull(item.name);
    if (name === null) return;
    out.push({
      index,
      name,
      rubric: textOrNull(item.rubric) ?? '',
      measurement: textOrNull(item.measurement) ?? '',
      priority: textOrNull(item.priority) ?? '',
    });
  });
  return out;
}

function composeMatrix(dimensions: readonly ComposedAiSpecDimension[]): ComposedAiSpecMatrix | null {
  if (dimensions.length === 0) return null;
  const cells: ComposedAiSpecGridCell[] = [];
  for (const priority of PRIORITY_ROWS) {
    for (const measurement of MEASUREMENT_COLUMNS) cells.push({ priority, measurement, dimensions: [] });
  }
  const unplaced: number[] = [];
  dimensions.forEach((dimension, position) => {
    const priority = placeIn(dimension.priority, PRIORITY_ROWS, PRIORITY_KEYWORDS);
    const measurement = placeIn(dimension.measurement, MEASUREMENT_COLUMNS, MEASUREMENT_KEYWORDS);
    const cell =
      priority === null || measurement === null
        ? undefined
        : cells.find((c) => c.priority === priority && c.measurement === measurement);
    if (cell === undefined) unplaced.push(position);
    else cell.dimensions.push(position);
  });
  return { cells, unplaced };
}

/** Splits "Partial - the model host is configurable" at its first spaced dash: the answer, then the reason. */
function splitLockIn(text: string): { value: string; reason: string | null } {
  const at = earliest(text, [' — ', ' – ', ' - ']);
  if (at <= 0) return { value: text, reason: null };
  const reason = text.slice(at + 3).trim();
  return { value: text.slice(0, at).trim(), reason: reason === '' ? null : reason };
}

function composeCells(raw: Record<string, unknown>): ComposedAiSpecCell[] {
  const version = textOrNull(raw.version);
  const lockIn = textOrNull(raw.vendorLockIn);
  const lock = lockIn === null ? null : splitLockIn(lockIn);
  return [
    { key: 'system-type', label: 'System type', value: textOrNull(raw.systemType), note: null, noteKind: null },
    {
      key: 'framework',
      label: 'Framework',
      value: textOrNull(raw.framework),
      note: version,
      noteKind: version === null ? null : 'version',
    },
    { key: 'stakes', label: 'Stakes level', value: textOrNull(raw.stakes), note: null, noteKind: null },
    {
      key: 'vendor-lock-in',
      label: 'Vendor lock-in',
      value: lock === null ? null : lock.value,
      note: lock === null ? null : lock.reason,
      noteKind: lock !== null && lock.reason !== null ? 'reason' : null,
    },
  ];
}

interface SectionFact {
  number: string;
  heading: string;
  slot: boolean;
  written: number;
}

function readSections(raw: readonly unknown[]): SectionFact[] {
  const out: SectionFact[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const number = textOrNull(item.number);
    const heading = textOrNull(item.heading);
    if (number === null || heading === null) continue;
    out.push({ number, heading, slot: item.slot === true, written: numberOr(item.written, 0) });
  }
  return out;
}

function composeRows(
  sections: readonly SectionFact[],
  progress: ComposedAiSpecProgress | null,
  input: ViewInput,
): ComposedAiSpecRow[] {
  const used = new Set<number>();
  const rows: ComposedAiSpecRow[] = [];
  for (const group of input.groups ?? []) {
    if (group.heading === null) continue;
    const number = sectionNumberOf(group.heading);
    let found = -1;
    if (number !== null) {
      for (let i = 0; i < sections.length; i += 1) {
        if (!used.has(i) && sections[i].number === number) {
          found = i;
          break;
        }
      }
    }
    if (found >= 0) {
      used.add(found);
      const section = sections[found];
      if (section.slot) {
        rows.push({
          kind: 'slot',
          number: section.number,
          heading: group.heading,
          id: sectionDomId(section.number),
          sourceId: group.id,
        });
        continue;
      }
      rows.push({
        kind: 'bar',
        number: section.number,
        heading: group.heading,
        id: sectionDomId(section.number),
        html: group.html,
        count: section.written > 0 ? `${section.written} ${section.written === 1 ? 'line' : 'lines'}` : null,
      });
      continue;
    }
    const isChecklist = group.heading.trim().toLowerCase() === 'checklist';
    rows.push({
      kind: 'bar',
      number: null,
      heading: group.heading,
      id: isChecklist ? CHECKLIST_DOM_ID : `view-ai-spec-group-${rows.length}`,
      html: group.html,
      count: isChecklist && progress !== null ? `${progress.done} of ${progress.total}` : null,
    });
  }
  return rows;
}

/** Composes the AI spec page, or `null` when the file gives the page nothing to shape. */
export function composeAiSpec(input: ViewInput): ComposedAiSpec | null {
  const raw = input.structured?.aiSpec;
  if (!isRecord(raw)) return null;
  const cells = composeCells(raw);
  const dimensions = composeDimensions(listOf(raw.dimensions));
  const sections = readSections(listOf(raw.sections));
  const checklist = isRecord(raw.checklist) ? raw.checklist : {};
  const total = Math.max(0, Math.floor(numberOr(checklist.total, 0)));
  const done = Math.min(total, Math.max(0, Math.floor(numberOr(checklist.done, 0))));
  const rawItems = listOf(checklist.items);
  const items = rawItems.length === total ? rawItems.map((item) => item === true) : null;
  const progress: ComposedAiSpecProgress | null =
    total === 0 ? null : { label: `${done} of ${total} checklist items done`, done, total, items };

  if (
    sections.length === 0 &&
    dimensions.length === 0 &&
    progress === null &&
    cells.every((cell) => cell.value === null)
  ) {
    return null;
  }

  const slotCount = sections.filter((section) => section.slot).length;
  return {
    cells,
    dimensions,
    matrix: composeMatrix(dimensions),
    progress,
    slotCount,
    sectionCount: sections.length,
    slotLead:
      slotCount > 0 ? `${slotCount} of ${sections.length} sections are still template slots` : null,
    strip: sections.map((section) => ({
      number: section.number,
      heading: section.heading,
      slot: section.slot,
      targetId: sectionDomId(section.number),
    })),
    rows: composeRows(sections, progress, input),
  };
}
