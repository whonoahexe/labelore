// The Cross-AI reviews composer (Phase 10, 10-22, VIEW-12, sketch 052 winner A "Overlap"): a pure `ViewInput` ->
// `ComposedReviews` merge of `structured.reviews`, the tolerant reading the handler made of a REVIEWS.md. The first screen
// answers "what did the reviewers agree is wrong, and where do they part ways?":
//   - each reviewer is the unit (not the file's headings): its name, its model as the frontmatter wrote it ("unknown"
//     included), its overall risk when stated, its run status when the file states one (Review failed, Review skipped,
//     reduced weight) and the plans it did and did not reach;
//   - the substantive reviewers (a failed or skipped lane is never one) are drawn as up to three overlapping circles, each
//     concern a square in the region of the reviewers who raised it; with four or more the page draws no circles and shows
//     the reviewer cards with the Agreed list, each row naming its reviewers, and says so in one quiet line;
//   - the Agreed group and the Disagreements are derived by this page from the reviewers' own text, best-effort and built
//     to under-claim: a concern the page cannot match stays under its reviewer, and disagreeing reviewers are shown side by
//     side, never merged into one verdict (PROJECT.md: keep disagreeing signals separate). The file's own consensus is
//     shown separately, labelled as the file's own.
// No DOM, no filesystem access, no rendering, no regular expression and no module-level mutable state: two reviews pages open
// at once each compose only from their own input. Returns `null` when the projection is missing or holds no reviewer, so the
// page keeps the promoted-section view with no notice (RESEARCH C1). T-10-43: every string is author text rendered as React
// text by the components.
import type { ViewInput } from './manifest.ts';

/** The tones this page writes. HIGH is `missing`, MEDIUM `in-flight`, LOW `quiet`. Never `destructive`, `warning` or `complete`. */
export type ReviewsTone = 'missing' | 'in-flight' | 'quiet';

export type ReviewSeverityWord = 'HIGH' | 'MEDIUM' | 'LOW';

/** Each severity word: its tone, in order highest first. HIGH and MEDIUM are close in hue in the dark theme, so the page
 * also keeps them apart by shape (an outline square against a filled one) and always by the word. */
export const SEVERITY_TABLE: ReadonlyMap<ReviewSeverityWord, { tone: ReviewsTone; rank: number }> = new Map([
  ['HIGH', { tone: 'missing', rank: 3 }],
  ['MEDIUM', { tone: 'in-flight', rank: 2 }],
  ['LOW', { tone: 'quiet', rank: 1 }],
] as const);

export const NO_SEVERITY_LABEL = 'No severity';
export const REVIEWERS_DISAGREE_LABEL = 'Reviewers disagree';
export const CONSENSUS_LABEL = 'Consensus summary, as the file wrote it';
export const FAILED_LABEL = 'Review failed';
export const SKIPPED_LABEL = 'Review skipped';
/** The one quiet line the page shows instead of the circles when four or more reviewers took part. */
export const TOO_MANY_LABEL = 'More than three reviewers took part, so the overlap is not drawn. Each row names its reviewers.';

const REDUCED_LABELS: ReadonlyMap<string, string> = new Map([
  ['no-repo-access', 'No repository access'],
  ['no-source-citations', 'No source citations'],
]);

/** The most circles the overlap drawing holds. */
export const OVERLAP_CIRCLES_MAX = 3;
/** The most blocks one review's text is split into. */
const BLOCK_CAP = 2000;

export interface ComposedCoverage {
  id: string;
  /** True when the reviewer has a section for the plan. */
  done: boolean;
}

/** A block of a review's text as written: a plan heading, a label, a paragraph, a list or a code fence. */
export type ReviewTextBlock =
  | { kind: 'plan'; text: string }
  | { kind: 'label'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; text: string };

export interface ComposedReviewer {
  /** Position in file order; the key a selection names. */
  index: number;
  /** "Claude", or "Claude (opus)" when the heading names an instance. */
  name: string;
  /** The model verbatim, or null when the frontmatter names none. */
  model: string | null;
  status: 'ok' | 'failed' | 'skipped';
  /** "Review failed", "Review skipped" or null. */
  statusLabel: string | null;
  /** "No repository access" and the like. */
  reduced: string[];
  /** The stated overall risk, or null. */
  risk: ReviewSeverityWord | null;
  riskTone: ReviewsTone | null;
  /** The plans the frontmatter lists, each with whether this reviewer has a section for it; empty when the reviewer states no plan. */
  coverage: ComposedCoverage[];
  concernCount: number;
  /** The review's text as written, as blocks. */
  blocks: ReviewTextBlock[];
  /** How many plan sections the review holds, for the bar's count. */
  planCount: number;
}

export interface ComposedConcern {
  /** The position among every substantive reviewer's concerns; the key a selection names. */
  id: number;
  reviewer: number;
  severity: ReviewSeverityWord | null;
  tone: ReviewsTone;
  /** The severity word, or "No severity". */
  word: string;
  text: string;
  planId: string | null;
}

export interface ComposedAgreed {
  index: number;
  /** "A1". */
  no: string;
  severity: ReviewSeverityWord | null;
  tone: ReviewsTone;
  word: string;
  /** The text to show: the file's consensus line when it joined the concerns, else the first concern's words. */
  text: string;
  planId: string | null;
  /** The reviewers who raised it, in file order. */
  reviewers: number[];
  /** The concern ids joined, in reviewer order. */
  concerns: number[];
  /** Which rule matched: the same opening words, the file's consensus naming the reviewers together, or both. */
  how: 'words' | 'file' | 'both';
}

export interface ComposedStance {
  reviewer: number;
  /** The word as the file wrote it (a verdict), or the risk word. */
  value: string;
  tone: ReviewsTone | null;
}

export interface ComposedOut {
  reviewer: number;
  /** Why the reviewer has no stance: "Review failed", "Not reviewed", "No verdict stated". */
  why: string;
}

export interface ComposedDisagreement {
  kind: 'risk' | 'verdict';
  /** "Overall risk" or "Verdict on 04-03". */
  title: string;
  stances: ComposedStance[];
  out: ComposedOut[];
}

export interface ComposedOtherSection {
  heading: string;
  blocks: ReviewTextBlock[];
}

/** What fills the first screen: the overlap drawing with its side list, or the roster cards and the list alone. */
export type ReviewsLayout = 'overlap' | 'roster';

export interface ComposedReviews {
  /** "4", or null when neither the frontmatter nor the title names one. */
  phase: string | null;
  /** The phase name from the roadmap, or null when the page could not resolve one. */
  phaseName: string | null;
  /** A UTC calendar day the file states, or null. */
  reviewedAt: string | null;
  plansReviewed: string[];
  reviewers: ComposedReviewer[];
  /** Concerns of the substantive reviewers, in reviewer then file order. */
  concerns: ComposedConcern[];
  /** True when two or more substantive reviewers took part: only then do Agreed and Disagreements exist. */
  grouped: boolean;
  agreed: ComposedAgreed[];
  /** The concern ids no agreed concern holds: raised by one reviewer. */
  singles: number[];
  disagreements: ComposedDisagreement[];
  layout: ReviewsLayout;
  /** The reviewers drawn as circles, at most three, in file order; empty for the roster layout. */
  drawn: number[];
  /** The one quiet line the roster layout shows when four or more reviewers took part, else null. */
  note: string | null;
  others: ComposedOtherSection[];
  consensus: { blocks: ReviewTextBlock[] } | null;
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
}

function textOrNull(candidate: unknown): string | null {
  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate.trim() : null;
}

function listOf(candidate: unknown): unknown[] {
  return Array.isArray(candidate) ? candidate : [];
}

function severityOf(candidate: unknown): ReviewSeverityWord | null {
  return candidate === 'HIGH' || candidate === 'MEDIUM' || candidate === 'LOW' ? candidate : null;
}

function toneOf(severity: ReviewSeverityWord | null): ReviewsTone {
  return severity === null ? 'quiet' : (SEVERITY_TABLE.get(severity)?.tone ?? 'quiet');
}

function rankOf(severity: ReviewSeverityWord | null): number {
  return severity === null ? 0 : (SEVERITY_TABLE.get(severity)?.rank ?? 0);
}

function fenceRun(line: string): { char: number; length: number; bare: boolean } | null {
  let i = 0;
  while (i < line.length && (line.charCodeAt(i) === 32 || line.charCodeAt(i) === 9)) i += 1;
  const code = line.charCodeAt(i);
  if (code !== 96 && code !== 126) return null;
  let run = 0;
  while (line.charCodeAt(i + run) === code) run += 1;
  if (run < 3) return null;
  let bare = true;
  for (let j = i + run; j < line.length; j += 1) {
    const c = line.charCodeAt(j);
    if (c === 96 && code === 96) return null;
    if (c !== 32 && c !== 9 && c !== 13) bare = false;
  }
  return { char: code, length: run, bare };
}

const LABEL_WORDS: ReadonlySet<string> = new Set(['summary', 'strengths', 'concerns', 'suggestions', 'risk assessment', 'risk', 'verdict']);

function stripLabelMarks(text: string): string {
  let start = 0;
  let end = text.length;
  const mark = (c: number): boolean => c === 42 || c === 95 || c === 96 || c === 32;
  while (start < end && mark(text.charCodeAt(start))) start += 1;
  while (end > start && (mark(text.charCodeAt(end - 1)) || text.charCodeAt(end - 1) === 58)) end -= 1;
  return text.slice(start, end);
}

function listItemText(line: string): string | null {
  const t = line.trimStart();
  const first = t.charCodeAt(0);
  if (first === 45 || first === 42 || first === 43) return t.charCodeAt(1) === 32 ? t.slice(2).trim() : null;
  let i = 0;
  while (i < t.length && t.charCodeAt(i) >= 48 && t.charCodeAt(i) <= 57) i += 1;
  if (i === 0 || i > 4) return null;
  if ((t.charCodeAt(i) !== 46 && t.charCodeAt(i) !== 41) || t.charCodeAt(i + 1) !== 32) return null;
  return t.slice(i + 2).trim();
}

/** A review's text as blocks, line by line, fences honoured: a plan heading (an H2), a label (a heading or a bare "Concerns:"),
 * a list, a paragraph or a code fence. Every block is plain text the components render through ResearchInline. One pass,
 * capped. */
export function blocksOf(text: string): ReviewTextBlock[] {
  const blocks: ReviewTextBlock[] = [];
  const lines = text.split('\n');
  let para: string[] = [];
  let list: string[] | null = null;
  let code: string[] | null = null;
  let fence: { char: number; length: number } | null = null;
  const push = (block: ReviewTextBlock): void => {
    if (blocks.length < BLOCK_CAP) blocks.push(block);
  };
  const flush = (): void => {
    if (para.length > 0) {
      push({ kind: 'para', text: para.join(' ') });
      para = [];
    }
    if (list !== null) {
      push({ kind: 'list', items: list });
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.length > 0 && raw.charCodeAt(raw.length - 1) === 13 ? raw.slice(0, -1) : raw;
    const marker = fenceRun(line);
    if (fence !== null) {
      if (marker !== null && marker.bare && marker.char === fence.char && marker.length >= fence.length) {
        push({ kind: 'code', text: (code ?? []).join('\n') });
        code = null;
        fence = null;
      } else {
        (code ?? (code = [])).push(line);
      }
      continue;
    }
    if (marker !== null) {
      flush();
      fence = { char: marker.char, length: marker.length };
      code = [];
      continue;
    }
    const t = line.trim();
    if (t === '' || t === '---' || t === '***' || t === '___') {
      flush();
      continue;
    }
    if (t.charCodeAt(0) === 35) {
      let depth = 0;
      while (depth < t.length && t.charCodeAt(depth) === 35) depth += 1;
      if (depth <= 6 && (t.charCodeAt(depth) === 32 || t.charCodeAt(depth) === 9)) {
        flush();
        const heading = t.slice(depth).trim();
        if (depth <= 2) {
          const plan = isPlanLike(heading);
          push({ kind: 'plan', text: plan ? `Plan ${heading}` : heading });
        } else {
          push({ kind: 'label', text: heading });
        }
        continue;
      }
    }
    const colon = t.indexOf(':');
    if (colon > 0 && colon <= 24 && LABEL_WORDS.has(stripLabelMarks(t.slice(0, colon)).toLowerCase())) {
      flush();
      push({ kind: 'label', text: stripLabelMarks(t.slice(0, colon)) });
      const value = t.slice(colon + 1).trim();
      if (value !== '') para.push(value);
      continue;
    }
    const item = listItemText(line);
    if (item !== null) {
      if (para.length > 0) {
        push({ kind: 'para', text: para.join(' ') });
        para = [];
      }
      (list ?? (list = [])).push(item);
      continue;
    }
    if (list !== null && (line.charCodeAt(0) === 32 || line.charCodeAt(0) === 9)) {
      list[list.length - 1] = `${list[list.length - 1]} ${t}`;
      continue;
    }
    if (list !== null) {
      push({ kind: 'list', items: list });
      list = null;
    }
    para.push(t);
  }
  if (fence !== null && code !== null) push({ kind: 'code', text: (code as string[]).join('\n') });
  flush();
  return blocks;
}

/** A heading that reads as a plan id (digits, dots, a dash, digits): shown as "Plan 04-02". */
function isPlanLike(text: string): boolean {
  let i = 0;
  const digits = (): boolean => {
    const from = i;
    while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) i += 1;
    return i > from;
  };
  if (!digits()) return false;
  while (text.charCodeAt(i) === 46) {
    i += 1;
    if (!digits()) return false;
  }
  if (text.charCodeAt(i) !== 45) return false;
  i += 1;
  return digits() && i === text.length;
}

function reviewerOf(raw: Record<string, unknown>, index: number, plansReviewed: readonly string[], missingBy: ReadonlyMap<string, string[]>): ComposedReviewer {
  const instance = textOrNull(raw.instance);
  const base = textOrNull(raw.name) ?? `Reviewer ${index + 1}`;
  const status = raw.status === 'failed' || raw.status === 'skipped' ? raw.status : 'ok';
  const risk = severityOf(raw.risk);
  const planIds = listOf(raw.planIds).filter((p): p is string => typeof p === 'string');
  const slug = textOrNull(raw.slug);
  const stated = slug === null ? [] : (missingBy.get(slug) ?? []);
  const text = typeof raw.text === 'string' ? raw.text : '';
  const reduced: string[] = [];
  for (const why of listOf(raw.reducedWhy)) {
    const label = typeof why === 'string' ? REDUCED_LABELS.get(why) : undefined;
    if (label !== undefined) reduced.push(label);
  }
  // Coverage is shown only for a reviewer that states a plan: for the others "not reviewed" would be a claim the file never made.
  const coverage: ComposedCoverage[] =
    status === 'ok' && (planIds.length > 0 || stated.length > 0)
      ? plansReviewed.map((id) => ({ id, done: planIds.includes(id) && !stated.includes(id) }))
      : [];
  return {
    index,
    name: instance === null ? base : `${base} (${instance})`,
    model: textOrNull(raw.model),
    status,
    statusLabel: status === 'failed' ? FAILED_LABEL : status === 'skipped' ? SKIPPED_LABEL : null,
    reduced,
    risk,
    riskTone: risk === null ? null : toneOf(risk),
    coverage,
    concernCount: listOf(raw.concerns).length,
    blocks: blocksOf(text),
    planCount: planIds.length,
  };
}

function concernsOf(raws: readonly Record<string, unknown>[], reviewers: readonly ComposedReviewer[]): ComposedConcern[] {
  const out: ComposedConcern[] = [];
  raws.forEach((raw, index) => {
    if (reviewers[index].status !== 'ok') return;
    for (const item of listOf(raw.concerns)) {
      if (!isRecord(item)) continue;
      const text = typeof item.text === 'string' ? item.text.trim() : '';
      if (text === '') continue;
      const severity = severityOf(item.severity);
      out.push({
        id: out.length,
        reviewer: index,
        severity,
        tone: toneOf(severity),
        word: severity ?? NO_SEVERITY_LABEL,
        text,
        planId: textOrNull(item.planId),
      });
    }
  });
  return out;
}

/** The agreed concerns, derived from the substantive reviewers' own text (see `deriveAgreement`). */
function deriveAgreement(): ComposedAgreed[] {
  return [];
}

/** The disagreements, derived from the substantive reviewers' stated risks and verdicts (see `deriveDisagreements`). */
function deriveDisagreements(): ComposedDisagreement[] {
  return [];
}

/** Composes the Cross-AI reviews page, or `null` when the file gives the page nothing to shape. */
export function composeReviews(input: ViewInput): ComposedReviews | null {
  const raw = input.structured?.reviews;
  if (!isRecord(raw)) return null;
  const rawReviewers = listOf(raw.reviewers).filter(isRecord);
  if (rawReviewers.length === 0) return null;
  const plansReviewed = listOf(raw.plansReviewed).filter((p): p is string => typeof p === 'string' && p.trim() !== '');
  const missingBy = new Map<string, string[]>();
  for (const entry of listOf(raw.roster)) {
    if (!isRecord(entry)) continue;
    const slug = textOrNull(entry.slug);
    if (slug === null) continue;
    missingBy.set(
      slug,
      listOf(entry.missing).filter((m): m is string => typeof m === 'string'),
    );
  }
  const reviewers = rawReviewers.map((r, index) => reviewerOf(r, index, plansReviewed, missingBy));
  const concerns = concernsOf(rawReviewers, reviewers);
  const substantive = reviewers.filter((r) => r.status === 'ok').map((r) => r.index);
  const grouped = substantive.length >= 2;
  const agreed = grouped ? deriveAgreement() : [];
  const disagreements = grouped ? deriveDisagreements() : [];
  const inAgreed = new Set<number>();
  for (const a of agreed) for (const id of a.concerns) inAgreed.add(id);
  const singles = concerns.filter((c) => !inAgreed.has(c.id)).map((c) => c.id);
  const overlap = substantive.length >= 1 && substantive.length <= OVERLAP_CIRCLES_MAX && concerns.length > 0;
  const consensus = isRecord(raw.consensus) && typeof raw.consensus.text === 'string' && raw.consensus.text.trim() !== '' ? raw.consensus.text : null;
  return {
    phase: textOrNull(raw.phase),
    phaseName: textOrNull(input.phaseName),
    reviewedAt: textOrNull(raw.reviewedAt),
    plansReviewed,
    reviewers,
    concerns,
    grouped,
    agreed,
    singles,
    disagreements,
    layout: overlap ? 'overlap' : 'roster',
    drawn: overlap ? substantive : [],
    note: substantive.length > OVERLAP_CIRCLES_MAX ? TOO_MANY_LABEL : null,
    others: listOf(raw.others)
      .filter(isRecord)
      .map((o) => ({ heading: textOrNull(o.heading) ?? '', blocks: blocksOf(typeof o.text === 'string' ? o.text : '') }))
      .filter((o) => o.heading !== '' && o.blocks.length > 0),
    consensus: consensus === null ? null : { blocks: blocksOf(consensus) },
  };
}

/** Whether two severities rank apart: used by the dock and by the tests, one place for the order. */
export function higherSeverity(a: ReviewSeverityWord | null, b: ReviewSeverityWord | null): ReviewSeverityWord | null {
  return rankOf(a) >= rankOf(b) ? a : b;
}
