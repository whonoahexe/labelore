// The Browser check composer (Phase 10, 10-21, VIEW-12, sketch 051 winner A "Browser window"): a pure `ViewInput` ->
// `ComposedDomVerify` merge of `structured.domVerify`, the tolerant reading the handler made of a DOM-VERIFY.md. The
// first screen answers "did the browser look, and what did it find?":
//   - the outcome comes first, and its three values differ in shape and words, never in colour alone: Verified is
//     `complete` with a check-circle; Nothing to report is `quiet` with a minus-circle and a dashed chip; Could not look
//     is `in-flight` with an eye-off icon and a 2px solid chip. Neither of the last two is ever `complete`: neither is a
//     pass. No outcome is the quiet "Outcome not stated"; any other value is shown raw, in mono, on a quiet chip;
//   - the reason is a short human sentence plus the raw value in mono (target_unreachable and no_criteria have a
//     sentence; any other reason shows its raw value only; `ok` shows nothing);
//   - the counts (passed, failed, needs review) are the frontmatter's numbers, never recomputed from the rows; on a
//     non-pass outcome with no criteria in the body they give way to "No criteria were checked.";
//   - the criteria are grouped failed first, then needs review, then passed, then lines whose verdict could not be read,
//     each with what was seen (its backticked values) and the contract it quotes (its first double-quoted value).
// The target and the time are shown only when the body states them: the contract records neither, and a file date is a
// clone's checkout time (RESEARCH C5). No DOM, no filesystem access, no rendering, no regular expression and no
// module-level mutable state: two Browser check pages open at once each compose only from their own input. Returns `null`
// when the projection is missing or holds nothing the page can shape (no outcome, no counts, no criteria), so the page
// keeps the promoted-section view with no notice (RESEARCH C1). T-10-39: every string is author text rendered as React
// text by the components.
import type { ViewInput } from './manifest.ts';

/** The four tones this page writes. `missing` is a failed criterion; `in-flight` is needs review and could not look. */
export type DomVerifyTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

/** The icon an outcome draws; the components map each key to a lucide icon. */
export type DomVerifyIcon = 'check' | 'minus' | 'eye-off' | 'help';

export const OUTCOME_NOT_STATED_LABEL = 'Outcome not stated';
export const NO_CRITERIA_LABEL = 'No criteria were checked.';
export const NO_CRITERIA_IN_FILE_LABEL = 'No criteria in the file.';

/** The outcome words GSD writes, as one Map (RESEARCH, UI-SPEC Tone mapping for the Browser check). */
export const DOM_OUTCOME_TABLE: ReadonlyMap<string, { tone: DomVerifyTone; icon: DomVerifyIcon; word: string }> = new Map([
  ['verified', { tone: 'complete', icon: 'check', word: 'Verified' }],
  ['nothing_to_report', { tone: 'quiet', icon: 'minus', word: 'Nothing to report' }],
  ['could_not_look', { tone: 'in-flight', icon: 'eye-off', word: 'Could not look' }],
] as const);

/** The reason sentences the copy table gives; any other reason shows its raw value only. */
export const DOM_REASON_COPY: ReadonlyMap<string, string> = new Map([
  ['target_unreachable', 'Could not look: nothing was serving the target. Start it, then rerun the browser check.'],
  ['no_criteria', 'Nothing to report: this wave had no UI acceptance criteria.'],
]);

export type DomVerifyResult = 'failed' | 'needs_review' | 'passed' | 'unread';

/** Each result a criterion line can carry: its group's label and tone, in group order. */
export const DOM_RESULT_TABLE: ReadonlyMap<DomVerifyResult, { label: string; tone: DomVerifyTone }> = new Map([
  ['failed', { label: 'Failed', tone: 'missing' }],
  ['needs_review', { label: 'Needs review', tone: 'in-flight' }],
  ['passed', { label: 'Passed', tone: 'complete' }],
  ['unread', { label: 'Result not stated', tone: 'quiet' }],
] as const);

const GROUP_ORDER: readonly DomVerifyResult[] = ['failed', 'needs_review', 'passed', 'unread'];
const COUNT_ORDER: readonly ('passed' | 'failed' | 'needs_review')[] = ['passed', 'failed', 'needs_review'];

/** The most backticked values one tile shows. */
const SEEN_CAP = 12;

export interface ComposedDomOutcome {
  /** The frontmatter value verbatim, or null when none was stated. */
  raw: string | null;
  tone: DomVerifyTone;
  icon: DomVerifyIcon;
  /** The word on the chip: Verified, Nothing to report, Could not look, Outcome not stated, or the raw value. */
  word: string;
  /** True for a value the page does not know: its raw word is drawn in mono. */
  mono: boolean;
  /** The chip's accessible name; it includes the reason ("Outcome: Could not look: target unreachable"). */
  ariaLabel: string;
}

export interface ComposedDomReason {
  /** The copy table's sentence, or null for a reason that has none. */
  sentence: string | null;
  /** The frontmatter value verbatim, drawn in mono. */
  raw: string;
}

export interface ComposedDomCount {
  key: 'passed' | 'failed' | 'needs_review';
  label: string;
  tone: DomVerifyTone;
  /** The frontmatter's number. A zero is drawn on a dashed square. */
  value: number;
}

export interface ComposedDomCriterion {
  /** The line's position in file order; the key a selection names. */
  index: number;
  /** One-based, "Criterion {no} of {total}". */
  no: number;
  result: DomVerifyResult;
  tone: DomVerifyTone;
  label: string;
  /** The line without its verdict word. */
  text: string;
  /** The backticked values the line quotes: what was seen. */
  seen: string[];
  /** The line's first double-quoted value: what the contract asks for. */
  contract: string | null;
}

export interface ComposedDomGroup {
  result: DomVerifyResult;
  label: string;
  tone: DomVerifyTone;
  /** Criterion indexes (into `criteria`) in file order. */
  items: number[];
}

/** What fills the window: tiles for a file with criteria, a shut view for Could not look, a blank one otherwise. */
export type DomVerifyView = 'tiles' | 'shut' | 'blank';

export interface ComposedDomVerify {
  outcome: ComposedDomOutcome;
  reason: ComposedDomReason | null;
  view: DomVerifyView;
  /** "Phase 3", or null when the file's title names none. */
  phase: string | null;
  /** The phase name from the roadmap, or null when the page could not resolve one. */
  phaseName: string | null;
  wave: number | null;
  /** The targets the body states (a labelled one first), shown as text only; empty when it states none. */
  targets: string[];
  /** A time the body states, or null. Never a file date. */
  checkedAt: string | null;
  /** The frontmatter's counts that are present, in Passed, Failed, Needs review order. Empty when `noCriteria`. */
  counts: ComposedDomCount[];
  /** The frontmatter's `checked`, or null. */
  checked: number | null;
  /** True on a non-pass outcome with no criteria in the body: "No criteria were checked." stands in for the counts. */
  noCriteria: boolean;
  /** The row counts when the criterion lines disagree with the frontmatter counts, else null. */
  rowCounts: { passed: number; failed: number; needsReview: number } | null;
  criteria: ComposedDomCriterion[];
  groups: ComposedDomGroup[];
  /** The body's non-criterion paragraphs: "What the check wrote". */
  paragraphs: string[];
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
}

function textOrNull(candidate: unknown): string | null {
  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate.trim() : null;
}

function numberOrNull(candidate: unknown): number | null {
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function listOf(candidate: unknown): unknown[] {
  return Array.isArray(candidate) ? candidate : [];
}

/** "target_unreachable" read aloud as "target unreachable". */
function humanReason(reason: string): string {
  return reason.split('_').join(' ');
}

function outcomeOf(raw: string | null, reason: string | null): ComposedDomOutcome {
  const known = raw === null ? undefined : DOM_OUTCOME_TABLE.get(raw);
  const why = reason !== null && reason !== 'ok' ? `: ${humanReason(reason)}` : '';
  if (known !== undefined) {
    return { raw, tone: known.tone, icon: known.icon, word: known.word, mono: false, ariaLabel: `Outcome: ${known.word}${why}` };
  }
  if (raw === null) {
    return {
      raw: null,
      tone: 'quiet',
      icon: 'help',
      word: OUTCOME_NOT_STATED_LABEL,
      mono: false,
      ariaLabel: `Outcome: ${OUTCOME_NOT_STATED_LABEL}${why}`,
    };
  }
  return { raw, tone: 'quiet', icon: 'help', word: raw, mono: true, ariaLabel: `Outcome: ${raw}${why}` };
}

function reasonOf(reason: string | null): ComposedDomReason | null {
  if (reason === null || reason === 'ok') return null;
  return { sentence: DOM_REASON_COPY.get(reason) ?? null, raw: reason };
}

/** The backticked values of a text, in order, capped. One pass. */
function seenIn(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length && out.length < SEEN_CAP) {
    const open = text.indexOf('`', i);
    if (open < 0) break;
    const close = text.indexOf('`', open + 1);
    if (close < 0) break;
    const value = text.slice(open + 1, close).trim();
    if (value !== '') out.push(value);
    i = close + 1;
  }
  return out;
}

/** The first double-quoted value of a text, straight or curly quotes, or null. One pass. */
function contractIn(text: string): string | null {
  let open = -1;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (open < 0) {
      if (c === 34 || c === 8220) open = i;
    } else if (c === 34 || c === 8221) {
      const value = text.slice(open + 1, i).trim();
      if (value !== '') return value;
      open = -1;
    }
  }
  return null;
}

function resultOf(verdict: unknown): DomVerifyResult {
  return verdict === 'failed' || verdict === 'needs_review' || verdict === 'passed' ? verdict : 'unread';
}

function composeCriteria(raw: Record<string, unknown>): ComposedDomCriterion[] {
  const items = listOf(raw.criteria).filter(isRecord);
  const out: ComposedDomCriterion[] = [];
  for (const item of items) {
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    const result = resultOf(item.verdict);
    const word = DOM_RESULT_TABLE.get(result) ?? { label: 'Result not stated', tone: 'quiet' as const };
    out.push({
      index: out.length,
      no: out.length + 1,
      result,
      tone: word.tone,
      label: word.label,
      text,
      seen: seenIn(text),
      contract: contractIn(text),
    });
  }
  return out;
}

function composeGroups(criteria: readonly ComposedDomCriterion[]): ComposedDomGroup[] {
  const byResult = new Map<DomVerifyResult, number[]>();
  for (const c of criteria) {
    const list = byResult.get(c.result);
    if (list === undefined) byResult.set(c.result, [c.index]);
    else list.push(c.index);
  }
  const groups: ComposedDomGroup[] = [];
  for (const result of GROUP_ORDER) {
    const items = byResult.get(result);
    if (items === undefined) continue;
    const word = DOM_RESULT_TABLE.get(result) ?? { label: 'Result not stated', tone: 'quiet' as const };
    groups.push({ result, label: word.label, tone: word.tone, items });
  }
  return groups;
}

/** Composes the Browser check page, or `null` when the file gives the page nothing to shape. */
export function composeDomVerify(input: ViewInput): ComposedDomVerify | null {
  const raw = input.structured?.domVerify;
  if (!isRecord(raw)) return null;
  const outcomeRaw = textOrNull(raw.outcome);
  const reasonRaw = textOrNull(raw.reason);
  const rawCounts = isRecord(raw.counts) ? raw.counts : {};
  const given = {
    checked: numberOrNull(rawCounts.checked),
    passed: numberOrNull(rawCounts.passed),
    failed: numberOrNull(rawCounts.failed),
    needs_review: numberOrNull(rawCounts.needsReview),
  };
  const criteria = composeCriteria(raw);
  const anyCount = given.passed !== null || given.failed !== null || given.needs_review !== null;
  if (outcomeRaw === null && criteria.length === 0 && !anyCount) return null;

  const outcome = outcomeOf(outcomeRaw, reasonRaw);
  const nonPass = outcomeRaw === 'could_not_look' || outcomeRaw === 'nothing_to_report';
  const noCriteria = nonPass && criteria.length === 0;
  const counts: ComposedDomCount[] = [];
  if (!noCriteria) {
    for (const key of COUNT_ORDER) {
      const value = given[key];
      if (value === null) continue;
      const word = DOM_RESULT_TABLE.get(key) ?? { label: key, tone: 'quiet' as const };
      counts.push({ key, label: word.label, tone: value === 0 ? 'quiet' : word.tone, value });
    }
  }
  const groups = composeGroups(criteria);
  const rowOf = (result: DomVerifyResult): number => groups.find((g) => g.result === result)?.items.length ?? 0;
  const rows = { passed: rowOf('passed'), failed: rowOf('failed'), needsReview: rowOf('needs_review') };
  const disagree =
    criteria.length > 0 &&
    ((given.passed !== null && given.passed !== rows.passed) ||
      (given.failed !== null && given.failed !== rows.failed) ||
      (given.needs_review !== null && given.needs_review !== rows.needsReview));

  const targets = listOf(raw.targets).filter((t): t is string => typeof t === 'string' && t.trim() !== '');
  const single = textOrNull(raw.target);
  if (targets.length === 0 && single !== null) targets.push(single);

  return {
    outcome,
    reason: reasonOf(reasonRaw),
    view: criteria.length > 0 ? 'tiles' : outcomeRaw === 'could_not_look' ? 'shut' : 'blank',
    phase: textOrNull(raw.phase),
    phaseName: textOrNull(input.phaseName),
    wave: numberOrNull(raw.wave),
    targets,
    checkedAt: textOrNull(raw.checkedAt),
    counts,
    checked: noCriteria ? null : given.checked,
    noCriteria,
    rowCounts: disagree ? rows : null,
    criteria,
    groups,
    paragraphs: listOf(raw.paragraphs).filter((p): p is string => typeof p === 'string' && p.trim() !== ''),
  };
}
