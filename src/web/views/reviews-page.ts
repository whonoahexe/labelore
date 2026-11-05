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

// ---------------------------------------------------------------------------------------------------------------------
// Agreement (UI-SPEC open item 4, RESEARCH Pitfall 13 and A5): best-effort, built to under-claim. A concern is agreed only
// when two or more substantive reviewers raised it, by one of two rules; whatever neither rule matches stays under its
// reviewer.
//   1. The same opening words: the normalised first clause (see `normaliseConcern` and `clauseKeyOf`) is equal on the same
//      plan, and is at least MIN_CLAUSE_WORDS words long. Only a reviewer's first concern in a bucket joins.
//   2. The file's own consensus: an Agreed Concerns line that names two or more substantive reviewers in parentheses (and,
//      when it says so, a plan) is matched to each named reviewer's concern on that plan that shares at least
//      MIN_SHARED_WORDS key words with the line; the concerns are joined when two or more reviewers have one.
// The agreed severity is the highest among the joined concerns, and the page says which rule matched.
// ---------------------------------------------------------------------------------------------------------------------

/** A first clause shorter than this is too thin to carry meaning: "no tests" is not agreement. */
export const MIN_CLAUSE_WORDS = 3;
/** Key words a consensus line and a concern must share before the line is allowed to pull the concern in. */
export const MIN_SHARED_WORDS = 2;
/** The most consensus lines read. */
const CONSENSUS_LINE_CAP = 50;

const SEVERITY_WORDS: ReadonlySet<string> = new Set(['high', 'medium', 'low']);

/** Words too common to count as a shared key word. */
const KEY_WORD_STOP: ReadonlySet<string> = new Set([
  'that', 'this', 'with', 'from', 'have', 'does', 'been', 'into', 'than', 'then', 'them', 'they', 'what', 'when', 'which',
  'while', 'will', 'would', 'plan', 'plans', 'also', 'there', 'their', 'only',
]);

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function isWordChar(code: number): boolean {
  return (code >= 97 && code <= 122) || (code >= 65 && code <= 90) || isDigit(code) || code === 95;
}

/** Markdown out of a text: emphasis marks, backticks and link syntax dropped (link text kept), an underscore kept only inside a
 * word so `MAX_EXPORT_LOANS` stays whole. One pass. */
function stripMarkdown(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c === 42 || c === 96 || c === 126 || c === 91) {
      i += 1;
      continue;
    }
    if (c === 93) {
      i += 1;
      if (text.charCodeAt(i) === 40) {
        const close = text.indexOf(')', i);
        i = close < 0 ? text.length : close + 1;
      }
      continue;
    }
    if (c === 95) {
      const before = i > 0 ? text.charCodeAt(i - 1) : 32;
      const after = i + 1 < text.length ? text.charCodeAt(i + 1) : 32;
      const inside = isWordChar(before) && before !== 95 && isWordChar(after) && after !== 95;
      const run = before === 95 || after === 95;
      if (!inside && !run) {
        i += 1;
        continue;
      }
    }
    out += text.charAt(i);
    i += 1;
  }
  return out;
}

/** True for a path:line citation token (`src/x.ts:12`, `a.ts:3-9`), trailing punctuation allowed. */
function isCitation(token: string): boolean {
  let end = token.length;
  while (end > 0 && (token.charCodeAt(end - 1) === 44 || token.charCodeAt(end - 1) === 59 || token.charCodeAt(end - 1) === 46 || token.charCodeAt(end - 1) === 41)) end -= 1;
  let start = 0;
  while (start < end && token.charCodeAt(start) === 40) start += 1;
  const core = token.slice(start, end);
  const colon = core.lastIndexOf(':');
  if (colon <= 0 || colon === core.length - 1) return false;
  const left = core.slice(0, colon);
  if (left.indexOf('/') < 0 && left.indexOf('.') < 0) return false;
  for (let i = colon + 1; i < core.length; i += 1) {
    const c = core.charCodeAt(i);
    if (!isDigit(c) && c !== 45) return false;
  }
  return true;
}

/**
 * A concern's text as the agreement rule compares it: markdown stripped, spaces collapsed, lower-cased; a path:line citation
 * token dropped; and a leading list marker, severity word (HIGH, MEDIUM or LOW, with a colon or not) and dash dropped.
 * "**MEDIUM** Foo  Bar src/x.ts:12" gives "foo bar". Character scans only. Pure.
 */
export function normaliseConcern(text: string): string {
  const tokens: string[] = [];
  const plain = stripMarkdown(text).toLowerCase();
  let at = 0;
  while (at < plain.length) {
    while (at < plain.length && (plain.charCodeAt(at) === 32 || plain.charCodeAt(at) === 9 || plain.charCodeAt(at) === 10 || plain.charCodeAt(at) === 13)) at += 1;
    const from = at;
    while (at < plain.length && plain.charCodeAt(at) !== 32 && plain.charCodeAt(at) !== 9 && plain.charCodeAt(at) !== 10 && plain.charCodeAt(at) !== 13) at += 1;
    if (at > from) {
      const token = plain.slice(from, at);
      if (!isCitation(token)) tokens.push(token);
    }
  }
  let k = 0;
  if (k < tokens.length && (tokens[k] === '-' || tokens[k] === '+')) k += 1;
  if (k < tokens.length) {
    const word = tokens[k].endsWith(':') ? tokens[k].slice(0, -1) : tokens[k];
    if (SEVERITY_WORDS.has(word)) {
      k += 1;
      if (k < tokens.length && (tokens[k] === '-' || tokens[k] === '–' || tokens[k] === '—' || tokens[k] === ':')) k += 1;
    }
  }
  return tokens.slice(k).join(' ');
}

/** The comparison key of a normalised text's first clause (up to the first comma, semicolon or colon): letters, digits and
 * underscores and single spaces only, so punctuation never separates two readings of one clause. */
function clauseKeyOf(normalised: string): { key: string; words: number } {
  let end = normalised.length;
  for (let i = 0; i < normalised.length; i += 1) {
    const c = normalised.charCodeAt(i);
    if (c === 44 || c === 59 || c === 58) {
      end = i;
      break;
    }
  }
  let key = '';
  let words = 0;
  let inWord = false;
  for (let i = 0; i < end; i += 1) {
    const c = normalised.charCodeAt(i);
    if (isWordChar(c)) {
      key += normalised.charAt(i);
      if (!inWord) words += 1;
      inWord = true;
    } else if (c === 32 || c === 45) {
      if (inWord) key += ' ';
      inWord = false;
    }
  }
  return { key: key.trimEnd(), words };
}

/** A text's key words: runs of letters, digits and underscores at least four long, "'s" dropped, the stop words left out. */
function keyWordsOf(text: string): Set<string> {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  let at = 0;
  while (at < lower.length) {
    while (at < lower.length && !isWordChar(lower.charCodeAt(at))) at += 1;
    const from = at;
    while (at < lower.length && isWordChar(lower.charCodeAt(at))) at += 1;
    if (at > from) {
      const word = lower.slice(from, at);
      if (word.length >= 4 && !KEY_WORD_STOP.has(word)) out.add(word);
    }
  }
  return out;
}

/** Letters and digits only, lower-cased: how a consensus line's reviewer name meets a reviewer's own name. */
function lettersOf(text: string): string {
  let out = '';
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) {
    const c = lower.charCodeAt(i);
    if ((c >= 97 && c <= 122) || isDigit(c)) out += lower.charAt(i);
  }
  return out;
}

/** The plan id after the word "plan" in a text ("Plan 04-02."), or null. */
function planAfter(text: string): string | null {
  const lower = text.toLowerCase();
  let at = lower.indexOf('plan ');
  while (at >= 0) {
    let k = at + 5;
    const start = k;
    while (k < lower.length && (isDigit(lower.charCodeAt(k)) || lower.charCodeAt(k) === 46 || lower.charCodeAt(k) === 45)) k += 1;
    let end = k;
    while (end > start && (lower.charCodeAt(end - 1) === 46 || lower.charCodeAt(end - 1) === 45)) end -= 1;
    if (end > start && isPlanLike(text.slice(start, end))) return text.slice(start, end);
    at = lower.indexOf('plan ', at + 5);
  }
  return null;
}

/** A consensus Agreed Concerns line "text (Claude, OpenCode). Plan 04-02.": its text, the reviewers it names (by letters and
 * digits of their names) and the plan it names. Null when no parenthesised group names two or more of `known`. */
function consensusLine(line: string, known: ReadonlySet<string>): { text: string; names: string[]; planId: string | null } | null {
  let close = line.lastIndexOf(')');
  while (close > 0) {
    const open = line.lastIndexOf('(', close);
    if (open < 0) return null;
    const names: string[] = [];
    for (const part of line.slice(open + 1, close).split(',')) {
      for (const piece of part.split(' and ')) {
        const key = lettersOf(piece);
        if (key !== '' && known.has(key) && !names.includes(key)) names.push(key);
      }
    }
    if (names.length >= 2) {
      const text = line.slice(0, open).trim();
      return text === '' ? null : { text, names, planId: planAfter(line.slice(close + 1)) };
    }
    close = line.lastIndexOf(')', open - 1);
  }
  return null;
}

/** Union-find over concern ids. */
function makeSets(size: number): { find: (x: number) => number; join: (a: number, b: number) => void } {
  const parent: number[] = [];
  for (let i = 0; i < size; i += 1) parent.push(i);
  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    let cur = x;
    while (parent[cur] !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  return {
    find,
    join: (a, b) => {
      parent[find(a)] = find(b);
    },
  };
}

/** The agreed concerns, derived from the substantive reviewers' own text by the two rules above. */
function deriveAgreement(
  reviewers: readonly ComposedReviewer[],
  concerns: readonly ComposedConcern[],
  nameKeys: readonly string[],
  consensusLines: readonly string[],
): ComposedAgreed[] {
  const sets = makeSets(concerns.length);
  const byWords = new Set<number>();
  const byFile = new Set<number>();
  const said = new Map<number, string>();

  // Rule 1: the same opening words on the same plan, from at least two reviewers.
  const buckets = new Map<string, number[]>();
  for (const c of concerns) {
    const clause = clauseKeyOf(normaliseConcern(c.text));
    if (clause.words < MIN_CLAUSE_WORDS) continue;
    const key = `${c.planId ?? ''}\u0000${clause.key}`;
    const list = buckets.get(key);
    if (list === undefined) buckets.set(key, [c.id]);
    else list.push(c.id);
  }
  for (const ids of buckets.values()) {
    const firstOf = new Map<number, number>();
    for (const id of ids) if (!firstOf.has(concerns[id].reviewer)) firstOf.set(concerns[id].reviewer, id);
    if (firstOf.size < 2) continue;
    const picked = [...firstOf.values()];
    for (const id of picked) {
      byWords.add(id);
      sets.join(id, picked[0]);
    }
  }

  // Rule 2: a consensus line that names the reviewers together.
  const known = new Set<string>();
  const readerOfKey = new Map<string, number>();
  reviewers.forEach((r, i) => {
    if (r.status !== 'ok') return;
    known.add(nameKeys[i]);
    readerOfKey.set(nameKeys[i], i);
  });
  const keyWords = new Map<number, Set<string>>();
  const wordsOfConcern = (id: number): Set<string> => {
    let found = keyWords.get(id);
    if (found === undefined) {
      found = keyWordsOf(concerns[id].text);
      keyWords.set(id, found);
    }
    return found;
  };
  for (const line of consensusLines.slice(0, CONSENSUS_LINE_CAP)) {
    const read = consensusLine(line, known);
    if (read === null) continue;
    const lineWords = keyWordsOf(read.text);
    const picked: number[] = [];
    for (const name of read.names) {
      const reviewer = readerOfKey.get(name);
      if (reviewer === undefined) continue;
      let best = -1;
      let bestShared = 0;
      for (const c of concerns) {
        if (c.reviewer !== reviewer) continue;
        if (read.planId !== null && c.planId !== read.planId) continue;
        let shared = 0;
        for (const w of wordsOfConcern(c.id)) if (lineWords.has(w)) shared += 1;
        if (shared > bestShared) {
          best = c.id;
          bestShared = shared;
        }
      }
      if (best >= 0 && bestShared >= MIN_SHARED_WORDS) picked.push(best);
    }
    if (new Set(picked.map((id) => concerns[id].reviewer)).size < 2) continue;
    for (const id of picked) {
      byFile.add(id);
      said.set(id, read.text);
      sets.join(id, picked[0]);
    }
  }

  const groups = new Map<number, number[]>();
  for (const c of concerns) {
    const root = sets.find(c.id);
    const list = groups.get(root);
    if (list === undefined) groups.set(root, [c.id]);
    else list.push(c.id);
  }
  const found: Omit<ComposedAgreed, 'index' | 'no'>[] = [];
  for (const ids of groups.values()) {
    const who = [...new Set(ids.map((id) => concerns[id].reviewer))].sort((a, b) => a - b);
    if (who.length < 2) continue;
    let severity: ReviewSeverityWord | null = null;
    for (const id of ids) severity = higherSeverity(severity, concerns[id].severity);
    const viaWords = ids.some((id) => byWords.has(id));
    const viaFile = ids.some((id) => byFile.has(id));
    const lead = ids.find((id) => said.has(id));
    found.push({
      severity,
      tone: toneOf(severity),
      word: severity ?? NO_SEVERITY_LABEL,
      text: lead === undefined ? concerns[ids[0]].text : (said.get(lead) ?? concerns[ids[0]].text),
      planId: concerns[ids[0]].planId,
      reviewers: who,
      concerns: ids,
      how: viaWords && viaFile ? 'both' : viaFile ? 'file' : 'words',
    });
  }
  found.sort((a, b) => rankOf(b.severity) - rankOf(a.severity) || b.reviewers.length - a.reviewers.length || a.concerns[0] - b.concerns[0]);
  return found.map((a, index) => ({ ...a, index, no: `A${index + 1}` }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Disagreement (UI-SPEC open item 4): a stance one reviewer states and another contradicts, never merged:
//   - the overall risk, when two or more substantive reviewers state different risks;
//   - a plan's verdict, when one reviewer's Verdict line holds an approve word and another's holds a revise word.
// The words live in one table. A verdict the table cannot read, or one that holds both kinds of word, is no stance, so two
// approvals, or an approval and an unreadable remark, are no disagreement.
// ---------------------------------------------------------------------------------------------------------------------

export type Stance = 'approve' | 'revise';

/** Single words a Verdict line may hold, lower-cased. */
export const STANCE_WORDS: ReadonlyMap<string, Stance> = new Map([
  ['approve', 'approve'],
  ['approved', 'approve'],
  ['approves', 'approve'],
  ['lgtm', 'approve'],
  ['revise', 'revise'],
  ['revised', 'revise'],
  ['revision', 'revise'],
  ['rework', 'revise'],
  ['block', 'revise'],
  ['blocked', 'revise'],
  ['reject', 'revise'],
  ['rejected', 'revise'],
] as const);

/** Phrases a Verdict line may hold, lower-cased. */
export const STANCE_PHRASES: readonly (readonly [string, Stance])[] = [
  ['ship it', 'approve'],
  ['looks good', 'approve'],
  ['do not ship', 'revise'],
  ["don't ship", 'revise'],
  ['not ready', 'revise'],
];

/** The stance a verdict states, or null when it states none or states both. One pass over its words. */
export function stanceOf(verdict: string): Stance | null {
  const lower = verdict.toLowerCase();
  let found: Stance | null = null;
  let both = false;
  const note = (stance: Stance): void => {
    if (found !== null && found !== stance) both = true;
    found = stance;
  };
  let at = 0;
  while (at < lower.length) {
    while (at < lower.length && !isWordChar(lower.charCodeAt(at))) at += 1;
    const from = at;
    while (at < lower.length && isWordChar(lower.charCodeAt(at))) at += 1;
    if (at > from) {
      const stance = STANCE_WORDS.get(lower.slice(from, at));
      if (stance !== undefined) note(stance);
    }
  }
  for (const [phrase, stance] of STANCE_PHRASES) if (lower.includes(phrase)) note(stance);
  return both ? null : found;
}

interface PlanStance {
  planId: string | null;
  verdict: string | null;
}

function whyNoStance(reviewer: ComposedReviewer, none: string): string {
  return reviewer.statusLabel ?? none;
}

/** The disagreements, derived from the substantive reviewers' stated risks and verdicts. */
function deriveDisagreements(
  reviewers: readonly ComposedReviewer[],
  stancesBy: readonly (readonly PlanStance[])[],
  planIdsBy: readonly (readonly string[])[],
  plansReviewed: readonly string[],
): ComposedDisagreement[] {
  const out: ComposedDisagreement[] = [];
  const ok = reviewers.filter((r) => r.status === 'ok');
  const withRisk = ok.filter((r) => r.risk !== null);
  if (new Set(withRisk.map((r) => r.risk)).size > 1) {
    out.push({
      kind: 'risk',
      title: 'Overall risk',
      stances: withRisk.map((r) => ({ reviewer: r.index, value: r.risk ?? '', tone: r.riskTone })),
      out: reviewers.filter((r) => r.risk === null || r.status !== 'ok').map((r) => ({ reviewer: r.index, why: whyNoStance(r, 'Risk not stated') })),
    });
  }
  const planIds: string[] = [...plansReviewed];
  for (const list of stancesBy) for (const s of list) if (s.planId !== null && !planIds.includes(s.planId) && planIds.length < 200) planIds.push(s.planId);
  for (const planId of planIds) {
    const stated: { reviewer: number; verdict: string; stance: Stance | null }[] = [];
    for (const r of ok) {
      const found = stancesBy[r.index].find((s) => s.planId === planId && s.verdict !== null);
      if (found !== undefined && found.verdict !== null) stated.push({ reviewer: r.index, verdict: found.verdict, stance: stanceOf(found.verdict) });
    }
    const kinds = new Set(stated.map((s) => s.stance).filter((s): s is Stance => s !== null));
    if (!kinds.has('approve') || !kinds.has('revise')) continue;
    out.push({
      kind: 'verdict',
      title: `Verdict on ${planId}`,
      stances: stated.map((s) => ({ reviewer: s.reviewer, value: s.verdict, tone: null })),
      out: reviewers
        .filter((r) => !stated.some((s) => s.reviewer === r.index))
        .map((r) => ({
          reviewer: r.index,
          why: r.status !== 'ok' ? (r.statusLabel ?? '') : planIdsBy[r.index].includes(planId) ? 'No verdict stated' : 'Not reviewed',
        })),
    });
  }
  return out;
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
  const nameKeys = rawReviewers.map((r) => lettersOf(textOrNull(r.name) ?? ''));
  const planIdsBy = rawReviewers.map((r) => listOf(r.planIds).filter((p): p is string => typeof p === 'string'));
  const stancesBy: PlanStance[][] = rawReviewers.map((r) =>
    listOf(r.plans)
      .filter(isRecord)
      .map((p) => ({ planId: textOrNull(p.planId), verdict: textOrNull(p.verdict) })),
  );
  const consensusLines = isRecord(raw.consensus) ? listOf(raw.consensus.concerns).filter((c): c is string => typeof c === 'string') : [];
  const agreed = grouped ? deriveAgreement(reviewers, concerns, nameKeys, consensusLines) : [];
  const disagreements = grouped ? deriveDisagreements(reviewers, stancesBy, planIdsBy, plansReviewed) : [];
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
