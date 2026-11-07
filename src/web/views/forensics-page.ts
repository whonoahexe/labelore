// The forensics page's composer (Phase 11, 11-25, VIEW-18, D-03, sketch 060 winner B "Evidence rail"): a pure `ViewInput` ->
// `ComposedForensics` merge of the forensics lift (11-20's `structured.forensics`). A forensics report is what `/gsd-forensics`
// concluded about a stalled or confusing project; the page answers "what went wrong, and what should I do about it?":
//   - the head: the eyebrow "Forensics", the report's own title as the h1 and "Generated {stamp}" as meta; the Problem sentence
//     the report opens with stands under it as a quiet note;
//   - the left column, in the report's own order: "Root cause hypothesis" (the writer's paragraph, verbatim), "Recommended
//     actions" (numbered, verbatim, in the writer's order) and "Anomalies" (one card each, HIGH first, with an untoned
//     confidence chip, the Evidence and the Interpretation);
//   - the right rail: "Artifact completeness" as a heat map (artifacts down, phases across, a square and the cell's own note
//     or the word "Absent" in each) and the "Evidence summary" (a small axis of the git span, then the Git Activity and
//     Planning State lists as the report wrote them).
// Nothing is re-worded, merged or reordered except the anomalies, which the lift already orders HIGH, MEDIUM, LOW and then any
// other word. A report with no anomalies says "No anomalies were detected." in that place. The composer computes only what the
// file's own fields give: the anomaly numbers, the absent count and the positions on the git axis. It holds no DOM, no
// filesystem access, no rendering, no regular expression and no module-level mutable state, and it reads no clock. It returns
// `null` when the forensics lift is missing or carries nothing the page can show, so the page keeps the promoted-section view
// with no notice (Phase 10 C1, X2). T-11-40: every string is author text rendered as React text by the components.
import { isoDaysIn } from './report-page.ts';
import type { ViewInput } from './manifest.ts';

export const FORENSICS_EYEBROW = 'Forensics';
export const PROBLEM_LABEL = 'Problem';
export const HYPOTHESIS_LABEL = 'Root cause hypothesis';
export const ACTIONS_LABEL = 'Recommended actions';
export const ANOMALIES_LABEL = 'Anomalies';
export const EVIDENCE_LABEL = 'Evidence';
export const INTERPRETATION_LABEL = 'Interpretation';
export const EVIDENCE_SUMMARY_LABEL = 'Evidence summary';
export const GRID_LABEL = 'Artifact completeness';
/** The page's own words for a report that lists no anomaly (the writer's `No anomalies detected.` is not shown beside it). */
export const NO_ANOMALIES = 'No anomalies were detected.';
export const RULE_NOTE = 'Rule weight carries the confidence too: heavy for High, medium for Medium, dashed for Low.';
export const ABSENT_WORD = 'Absent';
export const PRESENT_WORD = 'Present';
export const NOT_STATED_WORD = 'Not stated';
export const LAST_COMMIT_LABEL = 'Last commit';
export const GENERATED_LABEL = 'Generated';
export const TIME_SPAN_LABEL = 'Time span';

/** Two labels on the git axis closer than this fraction of its length would overlap, so the earlier one is dropped. */
const AXIS_LABEL_GAP = 0.18;
const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface ComposedForensicsHead {
  eyebrow: string;
  /** The report's own title; null leaves the file's title. */
  title: string | null;
  generated: string | null;
  /** The report's own Problem sentence, else null. */
  problem: string | null;
}

export type ConfidenceKind = 'high' | 'medium' | 'low' | 'other';

export interface ForensicsAnomalyCard {
  key: string;
  /** 1-based position after the sort (HIGH first). */
  number: number;
  type: string;
  kind: ConfidenceKind;
  /** The chip's words: "High confidence", "Medium confidence", "Low confidence", or any other word as written; null when the
   * heading named no confidence. The chip is never toned. */
  chip: string | null;
  /** The Evidence and Interpretation as the writer's paragraphs. */
  evidence: string[];
  interpretation: string[];
  /** The first card opens, the others stay closed. */
  open: boolean;
}

export interface ForensicsEvidenceRow {
  key: string;
  /** The bold label the bullet starts with (`Last commit`), else null. */
  label: string | null;
  value: string;
}

/** The git span as a small axis: the first day to the later of the last commit and the report's own day. */
export interface ForensicsAxis {
  /** `MM-DD` labels. */
  fromLabel: string;
  lastLabel: string;
  generatedLabel: string;
  /** 0 to 1 along the axis. */
  lastAt: number;
  generatedAt: number;
  showLastLabel: boolean;
  /** The words a screen reader gets for the picture. */
  words: string;
}

export interface ForensicsEvidenceBlock {
  key: string;
  heading: string;
  rows: ForensicsEvidenceRow[];
  /** Only on the Git Activity block, and only when its three dates read and span more than a day. */
  axis: ForensicsAxis | null;
}

export type ForensicsCellState = 'present' | 'absent' | 'unstated';

export interface ForensicsGridCell {
  key: string;
  state: ForensicsCellState;
  /** The cell as written without its mark (`(6)`, `passed 4/4`), else ''. */
  note: string;
}

export interface ForensicsGridRow {
  key: string;
  artifact: string;
  cells: ForensicsGridCell[];
}

export interface ForensicsPhaseHead {
  key: string;
  /** The phase number as the grid wrote it (`01`), else the ordinal. */
  number: string;
  name: string;
}

export interface ComposedForensicsGrid {
  phases: ForensicsPhaseHead[];
  rows: ForensicsGridRow[];
  absent: number;
  total: number;
  /** "{absent} of {total} artifacts absent": counted here, never written by the report. */
  summary: string;
}

export interface ComposedForensics {
  head: ComposedForensicsHead;
  /** The hypothesis as the writer's paragraphs, in order; empty when the report has none. */
  hypothesis: string[];
  /** The recommended actions in the writer's order and words; empty when the report has none. */
  actions: string[];
  /** The anomaly cards, HIGH first, then MEDIUM, LOW and any other word; ties keep the file's order. */
  anomalies: ForensicsAnomalyCard[];
  /** True when the report has an Anomalies section that lists none: the page says so in the place the cards would be. */
  noAnomalies: boolean;
  /** The writer's own sentence in an empty Anomalies section when it says more than "no anomalies detected", else null. */
  anomaliesNote: string | null;
  evidence: ForensicsEvidenceBlock[];
  grid: ComposedForensicsGrid | null;
}

// ---------------------------------------------------------------------------------------------------------
// Reading the input
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
}

function recordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function forensicsOf(input: ViewInput): Record<string, unknown> | null {
  const forensics = isRecord(input.structured) ? input.structured.forensics : undefined;
  return isRecord(forensics) ? forensics : null;
}

/** A text as its paragraphs: a blank line ends one, and a line that starts a bullet starts one. Lines of a paragraph are joined
 * with a space, so the words are the writer's and only the line breaks go. */
export function paragraphsOf(text: string | null): string[] {
  if (text === null) return [];
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (current.length > 0) paragraphs.push(current.join(' '));
    current = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '') {
      flush();
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) flush();
    current.push(line);
  }
  flush();
  return paragraphs;
}

// ---------------------------------------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------------------------------------

const KIND_RANK: Record<ConfidenceKind, number> = { high: 0, medium: 1, low: 2, other: 3 };

function kindOf(confidence: string | null): ConfidenceKind {
  const word = (confidence ?? '').trim().toUpperCase();
  if (word === 'HIGH') return 'high';
  if (word === 'MEDIUM') return 'medium';
  if (word === 'LOW') return 'low';
  return 'other';
}

function chipOf(kind: ConfidenceKind, confidence: string | null): string | null {
  if (kind === 'high') return 'High confidence';
  if (kind === 'medium') return 'Medium confidence';
  if (kind === 'low') return 'Low confidence';
  return confidence === null || confidence.trim() === '' ? null : confidence.trim();
}

function anomaliesOf(value: unknown): ForensicsAnomalyCard[] {
  const found = recordList(value).map((row, index) => {
    const confidence = textOrNull(row.confidence);
    const kind = kindOf(confidence);
    return {
      index,
      kind,
      type: textOrNull(row.type) ?? '',
      chip: chipOf(kind, confidence),
      evidence: paragraphsOf(textOrNull(row.evidence)),
      interpretation: paragraphsOf(textOrNull(row.interpretation)),
    };
  });
  // HIGH first, then MEDIUM, LOW and any other word; ties keep the file's order (the lift orders them the same way).
  found.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.index - b.index);
  return found.map((entry, at) => ({
    key: `anomaly-${at}`,
    number: at + 1,
    type: entry.type,
    kind: entry.kind,
    chip: entry.chip,
    evidence: entry.evidence,
    interpretation: entry.interpretation,
    open: at === 0,
  }));
}

/** True when the writer's sentence only says there were none. */
function saysNone(note: string): boolean {
  let text = note.trim().toLowerCase();
  while (text.endsWith('.')) text = text.slice(0, -1);
  return text === 'no anomalies detected' || text === 'no anomalies were detected' || text === 'none';
}

// ---------------------------------------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------------------------------------

/** `**Last commit:** value`, with the colon inside or outside the bold run: the label and the value; no label otherwise. */
function evidenceRowOf(item: string, at: number): ForensicsEvidenceRow {
  const text = item.trim();
  if (text.startsWith('**')) {
    const close = text.indexOf('**', 2);
    if (close > 2) {
      let label = text.slice(2, close).trim();
      let rest = text.slice(close + 2).trim();
      if (label.endsWith(':')) label = label.slice(0, -1).trim();
      else if (rest.startsWith(':')) rest = rest.slice(1).trim();
      if (label !== '' && rest !== '') return { key: `row-${at}`, label, value: rest };
    }
  }
  return { key: `row-${at}`, label: null, value: text };
}

function dayNumber(iso: string): number {
  return Math.round(Date.parse(iso) / MS_PER_DAY);
}

function valueOf(rows: readonly ForensicsEvidenceRow[], label: string): string | null {
  const row = rows.find((candidate) => candidate.label !== null && candidate.label.toLowerCase() === label.toLowerCase());
  return row === undefined ? null : row.value;
}

function clamp(fraction: number): number {
  return Math.min(1, Math.max(0, fraction));
}

/** The git axis from the report's own dates: the first day of the Time span, the day of the Last commit and the day the report
 * was generated. Null when any of the three does not read or they all fall on one day (an axis of no length says nothing). */
function axisOf(rows: readonly ForensicsEvidenceRow[], generated: string | null): ForensicsAxis | null {
  const span = valueOf(rows, TIME_SPAN_LABEL);
  const commit = valueOf(rows, LAST_COMMIT_LABEL);
  const spanDays = span === null ? [] : isoDaysIn(span);
  const commitDays = commit === null ? [] : isoDaysIn(commit);
  const generatedDays = generated === null ? [] : isoDaysIn(generated);
  const from = spanDays[0];
  const last = commitDays[0] ?? spanDays[1];
  const made = generatedDays[0];
  if (from === undefined || last === undefined || made === undefined) return null;
  const start = dayNumber(from);
  const end = Math.max(dayNumber(last), dayNumber(made), start);
  if (end === start) return null;
  const lastAt = clamp((dayNumber(last) - start) / (end - start));
  const generatedAt = clamp((dayNumber(made) - start) / (end - start));
  return {
    fromLabel: from.slice(5),
    lastLabel: last.slice(5),
    generatedLabel: made.slice(5),
    lastAt,
    generatedAt,
    showLastLabel: lastAt >= AXIS_LABEL_GAP && generatedAt - lastAt >= AXIS_LABEL_GAP,
    words: `Time span ${from} to the last commit ${last}, report generated ${made}`,
  };
}

function evidenceOf(value: unknown, generated: string | null): ForensicsEvidenceBlock[] {
  const blocks: ForensicsEvidenceBlock[] = [];
  recordList(value).forEach((block, at) => {
    const heading = textOrNull(block.heading);
    if (heading === null || heading.toLowerCase() === GRID_LABEL.toLowerCase()) return;
    const rows = stringList(block.items).map(evidenceRowOf);
    if (rows.length === 0) return;
    blocks.push({
      key: `evidence-${at}`,
      heading,
      rows,
      axis: heading.toLowerCase() === 'git activity' ? axisOf(rows, generated) : null,
    });
  });
  return blocks;
}

// ---------------------------------------------------------------------------------------------------------
// The artifact grid
// ---------------------------------------------------------------------------------------------------------

function isMarkChar(point: string): boolean {
  return (
    point === '✅' || point === '✓' || point === '✔' || point === '❌' || point === '✗' || point === '✘' || point === '✖' || point === '×'
  );
}

/** A cell as written without its leading check or cross mark (and the variation selector that may follow it). */
function withoutMark(cell: string): string {
  const text = cell.trim();
  const first = Array.from(text)[0];
  if (first === undefined || !isMarkChar(first)) return text;
  let rest = text.slice(first.length);
  if (rest.startsWith('️')) rest = rest.slice(1);
  return rest.trim();
}

function isNumberWord(word: string): boolean {
  if (word === '') return false;
  let digit = false;
  for (const char of word) {
    const code = char.charCodeAt(0);
    if (code >= 48 && code <= 57) digit = true;
    else if (code !== 46) return false;
  }
  return digit;
}

function phaseHeadOf(phase: string, ordinal: number): ForensicsPhaseHead {
  const text = phase.trim();
  const space = text.indexOf(' ');
  const word = space < 0 ? text : text.slice(0, space);
  if (isNumberWord(word)) return { key: `phase-${ordinal}`, number: word, name: space < 0 ? '' : text.slice(space + 1).trim() };
  return { key: `phase-${ordinal}`, number: String(ordinal + 1), name: text };
}

/** The lift's flat phase-by-artifact list as a grid: a row of the report is a run of cells, as many as the first row has
 * artifacts (the first artifact name repeating marks the next row). */
function gridOf(value: unknown): ComposedForensicsGrid | null {
  const cells = recordList(value);
  if (cells.length === 0) return null;
  const firstArtifact = textOrNull(cells[0]!.artifact);
  let width = cells.length;
  for (let at = 1; at < cells.length; at += 1) {
    if (textOrNull(cells[at]!.artifact) === firstArtifact) {
      width = at;
      break;
    }
  }
  const chunks: Record<string, unknown>[][] = [];
  for (let at = 0; at < cells.length; at += width) chunks.push(cells.slice(at, at + width));
  const phases = chunks.map((chunk, at) => phaseHeadOf(textOrNull(chunk[0]!.phase) ?? '', at));
  let absent = 0;
  let total = 0;
  const rows: ForensicsGridRow[] = [];
  for (let artifactAt = 0; artifactAt < width; artifactAt += 1) {
    const row: ForensicsGridRow = {
      key: `artifact-${artifactAt}`,
      artifact: textOrNull(cells[artifactAt]!.artifact) ?? '',
      cells: [],
    };
    chunks.forEach((chunk, phaseAt) => {
      const cell = chunk[artifactAt];
      const present = cell === undefined ? null : cell.present;
      const state: ForensicsCellState = present === true ? 'present' : present === false ? 'absent' : 'unstated';
      const written = cell === undefined || typeof cell.cell !== 'string' ? '' : cell.cell;
      if (state === 'absent') absent += 1;
      total += 1;
      row.cells.push({
        key: `cell-${artifactAt}-${phaseAt}`,
        state,
        note: state === 'unstated' ? written.trim() : withoutMark(written),
      });
    });
    rows.push(row);
  }
  return { phases, rows, absent, total, summary: `${absent} of ${total} artifacts absent` };
}

// ---------------------------------------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------------------------------------

/** True when the rendered document has an Anomalies Detected section (a non-browser render passes no groups). */
function hasAnomaliesSection(input: ViewInput): boolean {
  const groups = Array.isArray(input.groups) ? input.groups : [];
  return groups.some((group) => group.heading !== null && group.heading.trim().toLowerCase() === 'anomalies detected');
}

/** The forensics page's model, or `null` when the input carries no forensics lift or nothing the page can show (the
 * promoted-section view then renders with no notice). */
export function composeForensics(input: ViewInput): ComposedForensics | null {
  try {
    const forensics = forensicsOf(input);
    if (forensics === null) return null;
    const generated = textOrNull(forensics.generated);
    const hypothesis = paragraphsOf(textOrNull(forensics.hypothesis));
    const actions = stringList(forensics.actions);
    const anomalies = anomaliesOf(forensics.anomalies);
    const note = textOrNull(forensics.anomaliesNote);
    const evidence = evidenceOf(forensics.evidence, generated);
    const grid = gridOf(forensics.grid);
    // The "no anomalies" sentence is a claim, so it is made only where the report has an Anomalies section that lists none.
    const noAnomalies = anomalies.length === 0 && (note !== null || hasAnomaliesSection(input));
    if (hypothesis.length === 0 && actions.length === 0 && anomalies.length === 0 && !noAnomalies && evidence.length === 0 && grid === null) {
      return null;
    }
    return {
      head: {
        eyebrow: FORENSICS_EYEBROW,
        title: textOrNull(forensics.title),
        generated,
        problem: textOrNull(forensics.problem),
      },
      hypothesis,
      actions,
      anomalies,
      noAnomalies,
      anomaliesNote: noAnomalies && note !== null && !saysNone(note) ? note : null,
      evidence,
      grid,
    };
  } catch {
    return null;
  }
}
