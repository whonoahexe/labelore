// The Spec composer (Phase 10, 10-16, VIEW-11, sketch 047 winner B "Lock matrix"): a pure `ViewInput` ->
// `ComposedSpec` merge of `structured.spec` (the tolerant reading the handler made of a SPEC.md) and the page's own
// section groups. The first screen answers "is this spec locked enough to plan?":
//   - the verdict: the ambiguity score against the gate (GSD's gate is score <= 0.20). At or below the gate is
//     `complete` and locked; above it is `in-flight` "Not locked yet" (waiting, never a failure); a
//     score the page cannot read is `quiet` "Ambiguity not stated" and carries no numbers;
//   - five column gauges: the ambiguity column (lower is better, a line at the gate) and one per dimension of the
//     file's Ambiguity Report (a line at its minimum);
//   - each requirement as a numbered row with Current, Target and Acceptance as labelled fields (never toned: a
//     stated field is a neutral square, a missing one a dashed quiet square; a missing Acceptance says "No
//     acceptance stated") and, when the file has an Edge Coverage or Prohibitions table, one mark per row naming
//     the requirement;
//   - the scope as a fence: In scope inside, Out of scope outside with each reason kept.
// Every section the page does not draw becomes a closed bar holding the section as the document renders it, in
// file order, and the Interview Log (and any section the page cannot place) goes to the "In the source only"
// strip. Nothing is dropped.
// No DOM, no filesystem access, no rendering, no regular expression and no module-level state: two spec pages open
// at once each compose only from their own input. Returns `null` when the projection is missing or the file holds
// nothing the page can shape, so the page keeps the promoted-section view with no notice (RESEARCH C1).
// T-10-29: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';

export const LOCKED_LABEL = 'Locked enough to plan';
export const NOT_LOCKED_LABEL = 'Not locked yet';
export const NOT_STATED_LABEL = 'Ambiguity not stated';
export const NO_ACCEPTANCE_LABEL = 'No acceptance stated';
export const GATE_DEFAULT_NOTE = "Gate not stated in the file; GSD's 0.20";
export const NO_SCORE_NOTE = 'The file gives no ambiguity score, so there is no verdict.';
export const NOT_SCORED_LABEL = 'Not scored';
export const MET_LABEL = 'Met minimum';
export const BELOW_LABEL = 'Below minimum';
/** A statement or field longer than this many characters folds behind an in-place "Read more". */
export const READ_MORE_AT = 240;
/** The dimension columns drawn, named, when the file has no Ambiguity Report to read them from. */
export const UNSCORED_COLUMNS: readonly string[] = ['Goal', 'Boundary', 'Constraint', 'Acceptance'];

/** The three tones this page writes: never destructive, warning or missing (above the gate is waiting). */
export type SpecTone = 'complete' | 'in-flight' | 'quiet';

export interface ComposedSpecVerdict {
  tone: SpecTone;
  label: string;
  /** "0.14 against a gate of 0.20", or null when no score can be read. */
  numbers: string | null;
  scoreText: string | null;
  gateText: string | null;
  /** The quiet note beside the numbers: the gate was not in the file, or the file has no score. */
  note: string | null;
}

export interface ComposedSpecColumn {
  key: string;
  label: string;
  /** The file's Notes cell, the cell's `title`. */
  title: string | null;
  /** True for the ambiguity column (lower is better), false for a dimension. */
  lowerIsBetter: boolean;
  /** No value to draw: the column is dashed and reads "Not scored". */
  empty: boolean;
  valueText: string | null;
  /** "gate 0.20" or "min 0.65". */
  markerText: string | null;
  /** The fill height, 0 to 100. */
  fill: number | null;
  /** The gate or minimum line, 0 to 100 from the column's foot. */
  mark: number | null;
  fillTone: SpecTone | 'neutral';
  statusTone: SpecTone | null;
  statusLabel: string | null;
  ariaLabel: string;
}

export interface ComposedSpecField {
  key: 'current' | 'target' | 'acceptance';
  label: 'Current' | 'Target' | 'Acceptance';
  value: string | null;
  /** True when the value is long enough to fold behind "Read more". */
  long: boolean;
}

export interface ComposedSpecMark {
  tone: SpecTone;
  word: string;
  /** The edge category or the prohibition statement the mark stands for. */
  label: string;
  reason: string | null;
}

export interface ComposedSpecRequirement {
  n: number;
  label: string;
  statement: string;
  statementLong: boolean;
  fields: ComposedSpecField[];
  noAcceptance: boolean;
  edges: ComposedSpecMark[];
  prohibitions: ComposedSpecMark[];
  extras: string[];
}

export interface ComposedSpecScopeOut {
  item: string;
  reason: string | null;
}

export interface ComposedSpecBoundaries {
  inScope: string[];
  outOfScope: ComposedSpecScopeOut[];
}

export interface ComposedSpecBar {
  id: string | null;
  heading: string;
  /** The section as the document renders it, heading included. */
  html: string;
}

export interface ComposedSpecSourceOnly {
  label: string;
  /** The section's heading id in Source mode, or null. */
  targetId: string | null;
}

export interface ComposedSpec {
  verdict: ComposedSpecVerdict;
  /** "5 requirements locked", or null when the file states none and holds no requirement. */
  countLine: string | null;
  created: string | null;
  goal: string | null;
  ambiguity: ComposedSpecColumn;
  dimensions: ComposedSpecColumn[];
  requirements: ComposedSpecRequirement[];
  /** True when the file has an Edge Coverage or a Prohibitions table: the two coverage columns are drawn. */
  hasCoverage: boolean;
  /** "{n} more requirements are in the Source view", or null. */
  omittedNote: string | null;
  boundaries: ComposedSpecBoundaries | null;
  bars: ComposedSpecBar[];
  sourceOnly: ComposedSpecSourceOnly[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function key(heading: string): string {
  return heading.trim().toLowerCase();
}

function percent(value: number, scale: number): number {
  if (!(scale > 0)) return 0;
  const raw = (value / scale) * 100;
  return Math.min(100, Math.max(0, Math.round(raw * 10) / 10));
}

function twoPlaces(value: number): string {
  return value.toFixed(2);
}

function composeVerdict(
  score: number | null,
  scoreText: string | null,
  gate: number,
  gateText: string,
  gateStated: boolean,
): ComposedSpecVerdict {
  if (score === null) {
    return {
      tone: 'quiet',
      label: NOT_STATED_LABEL,
      numbers: null,
      scoreText: null,
      gateText: null,
      note: NO_SCORE_NOTE,
    };
  }
  const shown = scoreText ?? twoPlaces(score);
  return {
    tone: score <= gate ? 'complete' : 'in-flight',
    label: score <= gate ? LOCKED_LABEL : NOT_LOCKED_LABEL,
    numbers: `${shown} against a gate of ${gateText}`,
    scoreText: shown,
    gateText,
    note: gateStated ? null : GATE_DEFAULT_NOTE,
  };
}

function composeAmbiguity(
  score: number | null,
  scoreText: string | null,
  gate: number,
  gateText: string,
  verdict: ComposedSpecVerdict,
): ComposedSpecColumn {
  if (score === null) {
    return {
      key: 'ambiguity',
      label: 'Ambiguity',
      title: null,
      lowerIsBetter: true,
      empty: true,
      valueText: null,
      markerText: null,
      fill: null,
      mark: percent(gate, 0.5),
      fillTone: 'quiet',
      statusTone: null,
      statusLabel: null,
      ariaLabel: 'No score',
    };
  }
  // The scale runs to 0.5 unless the score or the gate is beyond it.
  const scale = Math.max(score, gate) > 0.5 ? 1 : 0.5;
  const shown = scoreText ?? twoPlaces(score);
  return {
    key: 'ambiguity',
    label: 'Ambiguity',
    title: null,
    lowerIsBetter: true,
    empty: false,
    valueText: shown,
    markerText: `gate ${gateText}`,
    fill: percent(score, scale),
    mark: percent(gate, scale),
    fillTone: verdict.tone,
    statusTone: null,
    statusLabel: null,
    ariaLabel: `Ambiguity ${shown}, gate ${gateText}`,
  };
}

function shortLabel(name: string): string {
  const suffix = ' Clarity';
  return name.endsWith(suffix) ? name.slice(0, name.length - suffix.length) : name;
}

function composeDimension(raw: unknown, index: number): ComposedSpecColumn | null {
  if (!isRecord(raw)) return null;
  const name = textOrNull(raw.name);
  if (name === null) return null;
  const score = numberOrNull(raw.score);
  const min = numberOrNull(raw.min);
  const scoreText = textOrNull(raw.scoreText) ?? (score === null ? null : twoPlaces(score));
  const minText = textOrNull(raw.minText) ?? (min === null ? null : twoPlaces(min));
  const status = raw.status === 'met' || raw.status === 'below' ? raw.status : 'unknown';
  const tone: SpecTone | null =
    status === 'below' ? 'in-flight' : status === 'met' ? 'complete' : null;
  return {
    key: `dimension-${index}`,
    label: shortLabel(name),
    title: textOrNull(raw.notes),
    lowerIsBetter: false,
    empty: score === null,
    valueText: scoreText,
    markerText: minText === null ? null : `min ${minText}`,
    fill: score === null ? null : percent(score, 1),
    mark: min === null ? null : percent(min, 1),
    fillTone: tone === 'in-flight' ? 'in-flight' : 'neutral',
    statusTone: score === null ? null : tone,
    statusLabel:
      score === null
        ? null
        : status === 'below'
          ? BELOW_LABEL
          : status === 'met'
            ? MET_LABEL
            : null,
    ariaLabel: `${name} ${scoreText ?? 'not scored'}${minText === null ? '' : `, minimum ${minText}`}`,
  };
}

function composeMark(raw: unknown): { requirements: number[]; mark: ComposedSpecMark } | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  const statusText = textOrNull(raw.statusText);
  let tone: SpecTone = 'quiet';
  let word = statusText ?? 'Other';
  if (kind === 'covered') {
    tone = 'complete';
    word = 'Covered';
  } else if (kind === 'backstop') {
    tone = 'complete';
    word = 'Backstop';
  } else if (kind === 'resolved') {
    tone = 'complete';
    word = 'Resolved';
  } else if (kind === 'unresolved') {
    tone = 'in-flight';
    word = 'Unresolved';
  } else if (kind === 'dismissed') {
    tone = 'quiet';
    word = 'Dismissed';
  }
  const requirements = listOf(raw.requirements).filter((n): n is number => typeof n === 'number');
  return {
    requirements,
    mark: { tone, word, label: textOrNull(raw.label) ?? word, reason: textOrNull(raw.reason) },
  };
}

function marksFor(rows: readonly unknown[] | null, n: number): ComposedSpecMark[] {
  if (rows === null) return [];
  const out: ComposedSpecMark[] = [];
  for (const row of rows) {
    const composed = composeMark(row);
    if (composed !== null && composed.requirements.includes(n)) out.push(composed.mark);
  }
  return out;
}

function composeRequirements(
  raw: readonly unknown[],
  edges: readonly unknown[] | null,
  prohibitions: readonly unknown[] | null,
): ComposedSpecRequirement[] {
  const out: ComposedSpecRequirement[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const n = numberOrNull(item.n);
    if (n === null) continue;
    const label = textOrNull(item.label) ?? `Requirement ${n}`;
    const statement = textOrNull(item.statement) ?? '';
    const current = textOrNull(item.current);
    const target = textOrNull(item.target);
    const acceptance = textOrNull(item.acceptance);
    const field = (
      fieldKey: ComposedSpecField['key'],
      fieldLabel: ComposedSpecField['label'],
      value: string | null,
    ): ComposedSpecField => ({
      key: fieldKey,
      label: fieldLabel,
      value,
      long: value !== null && value.length > READ_MORE_AT,
    });
    out.push({
      n,
      label,
      statement,
      statementLong: statement.length > READ_MORE_AT,
      fields: [
        field('current', 'Current', current),
        field('target', 'Target', target),
        field('acceptance', 'Acceptance', acceptance),
      ],
      noAcceptance: acceptance === null,
      edges: marksFor(edges, n),
      prohibitions: marksFor(prohibitions, n),
      extras: listOf(item.extras).filter(
        (e): e is string => typeof e === 'string' && e.trim() !== '',
      ),
    });
  }
  return out;
}

function composeBoundaries(
  inScope: readonly unknown[],
  outOfScope: readonly unknown[],
): ComposedSpecBoundaries | null {
  const inside = inScope.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  const outside: ComposedSpecScopeOut[] = [];
  for (const item of outOfScope) {
    if (!isRecord(item)) continue;
    const text = textOrNull(item.item);
    if (text !== null) outside.push({ item: text, reason: textOrNull(item.reason) });
  }
  if (inside.length === 0 && outside.length === 0) return null;
  return { inScope: inside, outOfScope: outside };
}

function countLine(lockedCount: number | null, listed: number): string | null {
  const n = lockedCount ?? (listed > 0 ? listed : null);
  if (n === null) return null;
  return n === 1 ? '1 requirement locked' : `${n} requirements locked`;
}

/** Every `##` heading the document's own groups and headings know: heading text (trimmed, lower case) to id. */
function headingIds(input: ViewInput): Map<string, string> {
  const ids = new Map<string, string>();
  for (const heading of input.headings ?? []) {
    if (heading.depth !== 2) continue;
    const k = key(heading.text);
    if (!ids.has(k)) ids.set(k, heading.id);
  }
  for (const group of input.groups ?? []) {
    if (group.heading === null || group.id === null) continue;
    const k = key(group.heading);
    if (!ids.has(k)) ids.set(k, group.id);
  }
  return ids;
}

function composeUnclaimed(
  sections: readonly unknown[],
  input: ViewInput,
): { bars: ComposedSpecBar[]; sourceOnly: ComposedSpecSourceOnly[] } {
  const ids = headingIds(input);
  const used = new Set<number>();
  const bars: ComposedSpecBar[] = [];
  const sourceOnly: ComposedSpecSourceOnly[] = [];
  for (const raw of sections) {
    if (!isRecord(raw) || raw.claimed === true) continue;
    const heading = textOrNull(raw.heading);
    if (heading === null) continue;
    const k = key(heading);
    const targetId = ids.get(k) ?? null;
    if (k === 'interview log') {
      sourceOnly.push({ label: heading, targetId });
      continue;
    }
    let found = -1;
    const groups = input.groups ?? [];
    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i];
      if (!used.has(i) && group.heading !== null && key(group.heading) === k) {
        found = i;
        break;
      }
    }
    if (found < 0 || groups[found].html.trim() === '') {
      sourceOnly.push({ label: heading, targetId });
      continue;
    }
    used.add(found);
    bars.push({ id: groups[found].id, heading, html: groups[found].html });
  }
  return { bars, sourceOnly };
}

/** Composes the Spec page, or `null` when the file gives the page nothing to shape. */
export function composeSpec(input: ViewInput): ComposedSpec | null {
  const raw = input.structured?.spec;
  if (!isRecord(raw)) return null;
  const ambiguity = isRecord(raw.ambiguity) ? raw.ambiguity : {};
  const score = numberOrNull(ambiguity.score);
  const gate = numberOrNull(ambiguity.gate) ?? 0.2;
  const gateText = textOrNull(ambiguity.gateText) ?? twoPlaces(gate);
  const verdict = composeVerdict(
    score,
    textOrNull(ambiguity.scoreText),
    gate,
    gateText,
    ambiguity.gateStated === true,
  );

  const edges = Array.isArray(raw.edges) ? raw.edges : null;
  const prohibitions = Array.isArray(raw.prohibitions) ? raw.prohibitions : null;
  const requirements = composeRequirements(listOf(raw.requirements), edges, prohibitions);
  const dimensions: ComposedSpecColumn[] = [];
  listOf(raw.dimensions).forEach((item, index) => {
    const column = composeDimension(item, index);
    if (column !== null) dimensions.push(column);
  });
  const boundaries = composeBoundaries(listOf(raw.inScope), listOf(raw.outOfScope));
  const goal = textOrNull(raw.goal);

  if (
    score === null &&
    requirements.length === 0 &&
    dimensions.length === 0 &&
    goal === null &&
    boundaries === null
  ) {
    return null;
  }

  const omitted = numberOrNull(raw.requirementsOmitted) ?? 0;
  const { bars, sourceOnly } = composeUnclaimed(listOf(raw.sections), input);
  return {
    verdict,
    countLine: countLine(numberOrNull(raw.lockedCount), requirements.length),
    created: textOrNull(raw.created),
    goal,
    ambiguity: composeAmbiguity(score, textOrNull(ambiguity.scoreText), gate, gateText, verdict),
    dimensions,
    requirements,
    hasCoverage: edges !== null || prohibitions !== null,
    omittedNote:
      omitted > 0
        ? `${omitted} more ${omitted === 1 ? 'requirement is' : 'requirements are'} in the Source view.`
        : null,
    boundaries,
    bars,
    sourceOnly,
  };
}
