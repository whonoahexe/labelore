// The Eval review composer (Phase 10, 10-20, VIEW-12, sketch 050 winner B "Gap -> fix ledger"): a pure `ViewInput` ->
// `ComposedEvalReview` merge of `structured.evalReview`, the tolerant reading the handler made of an EVAL-REVIEW.md,
// and the page's own section groups. The first screen answers "what did it score, what is the verdict, what did the
// audit find and what fixes it?":
//   - the ruled head: the score ("64 of 100") and GSD's verdict word as a chip (PRODUCTION READY `complete`, NEEDS WORK
//     `in-flight`, SIGNIFICANT GAPS and NOT IMPLEMENTED `missing`, anything else or none the quiet "Verdict not
//     stated"), the tally "{c} covered, {p} partial, {m} missing" beside the shared status-meter, and the file's own
//     Coverage Score, Infrastructure Score and AI-SPEC Present as written;
//   - the ledger: what the audit found (dimension rows, then the smaller infrastructure rows showing the file's own
//     word beside the tone it maps to) beside the remediation plan in the author's order, a step tied to a dimension
//     or component only when it OPENS with that name and a colon (never an invented link);
//   - below, Critical Gaps, Files Found and every other section as closed bars.
// The score and the verdict are shown as the file writes them and never recomputed or overridden (the auditor's own
// rule; T-10-38): this module holds no arithmetic on the score. The tally counts rows by their status word, which is a
// count of what the file says, not a score. No DOM, no filesystem access, no rendering, no regular expression and no
// module-level mutable state: two eval review pages open at once each compose only from their own input. Returns `null`
// when the projection is missing or holds nothing the page can shape, so the page keeps the promoted-section view with
// no notice (RESEARCH C1). T-10-37: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';

/** The four tones this page writes: a finished, partial, missing or unclassified item. */
export type EvalReviewTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

export const VERDICT_NOT_STATED_LABEL = 'Verdict not stated';

/** What a dimension's status word reads as: its tone and the label drawn beside the square. */
export interface DimensionWord {
  tone: EvalReviewTone;
  label: string;
}

/**
 * The one word table (RESEARCH Pattern 7, C4). The file's words are mapped to a tone and never recomputed:
 *   - `verdict`: GSD's four verdict words (keys upper case);
 *   - `dimension`: COVERED, PARTIAL and MISSING (keys upper case), with the label drawn beside the square;
 *   - `infrastructure`: the per-component words the auditor writes (keys lower case), shown verbatim beside the tone.
 * A word that is in none of these is `quiet` and is shown as the file wrote it.
 */
export const EVAL_WORD_TABLE: {
  readonly verdict: ReadonlyMap<string, EvalReviewTone>;
  readonly dimension: ReadonlyMap<string, DimensionWord>;
  readonly infrastructure: ReadonlyMap<string, EvalReviewTone>;
} = {
  verdict: new Map<string, EvalReviewTone>([
    ['PRODUCTION READY', 'complete'],
    ['NEEDS WORK', 'in-flight'],
    ['SIGNIFICANT GAPS', 'missing'],
    ['NOT IMPLEMENTED', 'missing'],
  ]),
  dimension: new Map<string, DimensionWord>([
    ['COVERED', { tone: 'complete', label: 'Covered' }],
    ['PARTIAL', { tone: 'in-flight', label: 'Partial' }],
    ['MISSING', { tone: 'missing', label: 'Missing' }],
  ]),
  infrastructure: new Map<string, EvalReviewTone>([
    ['installed', 'complete'],
    ['configured', 'complete'],
    ['present', 'complete'],
    ['implemented', 'complete'],
    ['partial', 'in-flight'],
    ['missing', 'missing'],
    ['not found', 'missing'],
    ['not configured', 'missing'],
  ]),
};

export function verdictToneOf(word: string | null): EvalReviewTone {
  if (word === null) return 'quiet';
  return EVAL_WORD_TABLE.verdict.get(word.trim().toUpperCase()) ?? 'quiet';
}

export function dimensionWordOf(status: string): DimensionWord {
  const known = EVAL_WORD_TABLE.dimension.get(status.trim().toUpperCase());
  if (known !== undefined) return known;
  return { tone: 'quiet', label: status.trim() === '' ? 'Not stated' : status.trim() };
}

export function infrastructureToneOf(status: string): EvalReviewTone {
  return EVAL_WORD_TABLE.infrastructure.get(status.trim().toLowerCase()) ?? 'quiet';
}

export interface ComposedEvalVerdict {
  /** The file's verdict, verbatim, or null when the file states none or one the page does not know. */
  word: string | null;
  tone: EvalReviewTone;
}

/** A dimension or an infrastructure component: one row of "What the audit found". */
export interface ComposedEvalTarget {
  /** The row's position in `targets` (dimensions first, then components): the key a selection and a wire name. */
  id: number;
  kind: 'dimension' | 'component';
  name: string;
  tone: EvalReviewTone;
  /** The word drawn beside the square: a dimension's label (Covered, Partial, Missing, or an unknown word as written),
   * a component's own word verbatim. */
  word: string;
  /** Code, LLM Judge or Human as written, or null for a component. */
  measurement: string | null;
  finding: string;
  /** Step indexes (into `steps`) that open with this row's name. */
  fixes: number[];
}

export interface ComposedEvalStep {
  /** The step's position across every group, the key a selection and a wire name. */
  index: number;
  group: number;
  /** The step's number within its group, from 1. */
  no: number;
  text: string;
  /** The target the step opens with the name of, or null. */
  target: number | null;
  /** "Must 1": the first word of the group's heading and the step's number; what a row's "Fix:" reference reads. */
  ref: string;
}

export interface ComposedEvalGroup {
  /** The `###` heading as written. */
  heading: string;
  /** Step indexes in file order; an empty group draws a dashed "0". */
  steps: number[];
}

export interface ComposedEvalBar {
  id: string;
  heading: string;
  /** The section as the document renders it, heading included. */
  html: string;
  /** "None", "2 gaps" and the like, or null. */
  count: string | null;
}

export interface ComposedEvalFact {
  key: string;
  /** The file's value, verbatim. */
  value: string;
}

export interface ComposedEvalReview {
  auditDate: string | null;
  /** "64 of 100" (or "64" when the file wrote no maximum), or null when the file states no score. */
  score: string | null;
  verdict: ComposedEvalVerdict;
  /** The dimension counts by status word, or null when the file lists no dimension. */
  tally: { covered: number; partial: number; missing: number } | null;
  /** "2 covered, 2 partial, 1 missing". */
  tallyText: string | null;
  /** One tone per dimension in file order, and the meter's one accessible name. */
  meter: { items: EvalReviewTone[]; covered: number; label: string } | null;
  facts: ComposedEvalFact[];
  /** Dimensions then components. */
  targets: ComposedEvalTarget[];
  dimensions: number[];
  components: number[];
  groups: ComposedEvalGroup[];
  steps: ComposedEvalStep[];
  bars: ComposedEvalBar[];
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
}

function textOrNull(candidate: unknown): string | null {
  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate.trim() : null;
}

function textOf(candidate: unknown): string {
  return typeof candidate === 'string' ? candidate.trim() : '';
}

function listOf(candidate: unknown): unknown[] {
  return Array.isArray(candidate) ? candidate : [];
}

/** The numbers exactly as the file wrote them: "64 of 100". Nothing is computed from them. */
function scoreText(candidate: unknown): string | null {
  if (!isRecord(candidate)) return null;
  const value = candidate.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const max = candidate.max;
  return typeof max === 'number' && Number.isFinite(max) ? `${value} of ${max}` : `${value}`;
}

/** A name without its trailing parenthetical, lower case: "Eval tooling (Vitest)" names "eval tooling". */
function baseName(name: string): string {
  const open = name.indexOf('(');
  const head = open > 0 && name.trimEnd().endsWith(')') ? name.slice(0, open) : name;
  return head.trim().toLowerCase();
}

/** What a step opens with before its first colon, bold and backtick marks dropped, lower case; null when the step has no
 * colon within its first 120 characters. A step that names its target elsewhere in the sentence has no lead name. */
function leadName(text: string): string | null {
  const limit = Math.min(text.length, 120);
  const colon = text.indexOf(':');
  if (colon <= 0 || colon > limit) return null;
  let lead = '';
  for (let i = 0; i < colon; i += 1) {
    const c = text.charAt(i);
    if (c !== '*' && c !== '`') lead += c;
  }
  return lead.trim().toLowerCase();
}

/** The first word of a group heading ("Must fix before production" reads "Must"). */
function firstWord(heading: string): string {
  const space = heading.indexOf(' ');
  return space < 0 ? heading : heading.slice(0, space);
}

function composeTargets(raw: Record<string, unknown>): ComposedEvalTarget[] {
  const targets: ComposedEvalTarget[] = [];
  for (const item of listOf(raw.dimensions)) {
    if (!isRecord(item)) continue;
    const name = textOrNull(item.name);
    if (name === null) continue;
    const word = dimensionWordOf(textOf(item.status));
    targets.push({
      id: targets.length,
      kind: 'dimension',
      name,
      tone: word.tone,
      word: word.label,
      measurement: textOrNull(item.measurement),
      finding: textOf(item.finding),
      fixes: [],
    });
  }
  for (const item of listOf(raw.infrastructure)) {
    if (!isRecord(item)) continue;
    const name = textOrNull(item.component);
    if (name === null) continue;
    const status = textOf(item.status);
    targets.push({
      id: targets.length,
      kind: 'component',
      name,
      tone: infrastructureToneOf(status),
      word: status === '' ? 'Not stated' : status,
      measurement: null,
      finding: textOf(item.finding),
      fixes: [],
    });
  }
  return targets;
}

function composePlan(
  raw: Record<string, unknown>,
  targets: ComposedEvalTarget[],
): { groups: ComposedEvalGroup[]; steps: ComposedEvalStep[] } {
  const groups: ComposedEvalGroup[] = [];
  const steps: ComposedEvalStep[] = [];
  for (const item of listOf(raw.remediation)) {
    if (!isRecord(item)) continue;
    const heading = textOrNull(item.heading) ?? 'Steps';
    const group: ComposedEvalGroup = { heading, steps: [] };
    const groupIndex = groups.length;
    let no = 0;
    for (const stepText of listOf(item.steps)) {
      const text = textOrNull(stepText);
      if (text === null) continue;
      no += 1;
      const lead = leadName(text);
      let target: number | null = null;
      if (lead !== null) {
        for (const candidate of targets) {
          if (baseName(candidate.name) === lead) {
            target = candidate.id;
            break;
          }
        }
      }
      const index = steps.length;
      steps.push({ index, group: groupIndex, no, text, target, ref: `${firstWord(heading)} ${no}` });
      group.steps.push(index);
      if (target !== null) targets[target].fixes.push(index);
    }
    groups.push(group);
  }
  return { groups, steps };
}

function countOf(raw: Record<string, unknown>, heading: string): string | null {
  if (heading.trim().toLowerCase() !== 'critical gaps') return null;
  const gaps = listOf(raw.criticalGaps).filter((line) => typeof line === 'string' && line.trim() !== '');
  if (gaps.length === 0) return null;
  const first = typeof gaps[0] === 'string' ? gaps[0].trim().toLowerCase() : '';
  if (gaps.length === 1 && first.startsWith('none')) return 'None';
  return gaps.length === 1 ? '1 gap' : `${gaps.length} gaps`;
}

function composeBars(
  input: ViewInput,
  raw: Record<string, unknown>,
  claimed: ReadonlySet<string>,
): ComposedEvalBar[] {
  const bars: ComposedEvalBar[] = [];
  for (const group of input.groups ?? []) {
    if (group.heading === null) continue;
    const key = group.heading.trim().toLowerCase();
    if (claimed.has(key)) continue;
    bars.push({
      id: `view-eval-review-bar-${bars.length}`,
      heading: group.heading,
      html: group.html,
      count: countOf(raw, group.heading),
    });
  }
  return bars;
}

/** Composes the Eval review page, or `null` when the file gives the page nothing to shape. */
export function composeEvalReview(input: ViewInput): ComposedEvalReview | null {
  const raw = input.structured?.evalReview;
  if (!isRecord(raw)) return null;
  const targets = composeTargets(raw);
  const { groups, steps } = composePlan(raw, targets);
  const verdictWord = textOrNull(raw.verdict);
  const verdictTone = verdictToneOf(verdictWord);
  const score = scoreText(raw.score);
  if (score === null && verdictTone === 'quiet' && targets.length === 0 && steps.length === 0) return null;

  const dimensions = targets.filter((t) => t.kind === 'dimension').map((t) => t.id);
  const components = targets.filter((t) => t.kind === 'component').map((t) => t.id);
  let covered = 0;
  let partial = 0;
  let missing = 0;
  for (const id of dimensions) {
    const tone = targets[id].tone;
    if (tone === 'complete') covered += 1;
    else if (tone === 'in-flight') partial += 1;
    else if (tone === 'missing') missing += 1;
  }
  const facts: ComposedEvalFact[] = [];
  const coverageLine = textOrNull(raw.coverageScoreLine);
  const infraLine = textOrNull(raw.infrastructureScoreLine);
  const aiSpec = textOrNull(raw.aiSpecPresent);
  if (coverageLine !== null) facts.push({ key: 'Coverage Score', value: coverageLine });
  if (infraLine !== null) facts.push({ key: 'Infrastructure Score', value: infraLine });
  if (aiSpec !== null) facts.push({ key: 'AI-SPEC present', value: aiSpec });

  const claimed = new Set<string>();
  if (dimensions.length > 0) claimed.add('dimension coverage');
  if (components.length > 0) claimed.add('infrastructure audit');
  if (steps.length > 0 || groups.length > 0) claimed.add('remediation plan');

  return {
    auditDate: textOrNull(raw.auditDate),
    score,
    verdict: { word: verdictTone === 'quiet' ? null : verdictWord, tone: verdictTone },
    tally: dimensions.length === 0 ? null : { covered, partial, missing },
    tallyText:
      dimensions.length === 0 ? null : `${covered} covered, ${partial} partial, ${missing} missing`,
    meter:
      dimensions.length === 0
        ? null
        : {
            items: dimensions.map((id) => targets[id].tone),
            covered,
            label: `${covered} of ${dimensions.length} dimensions covered`,
          },
    facts,
    targets,
    dimensions,
    components,
    groups,
    steps,
    bars: composeBars(input, raw, claimed),
  };
}
