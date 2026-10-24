// The REVIEW page composer (quick-261017-k44, sketch 022 winner C): a pure `ViewInput` ->
// `ComposedReviewThreads` merge of the frontmatter, `structured.review` (built by
// `src/planning-repo/handlers/review-report.ts`, with `pathPhase` and `quickId` added by the
// handler) and `reviewContext` (built server-side: the ROADMAP phase name and the sibling
// REVIEW-FIX). It decides the head (eyebrow, title, Reviewed stamp), the verdict (what is still in
// the code and how bad), the facts, the tally, the reviewer's pull quote, and the review threads:
// the findings grouped by the first file they name, worst first, each with its severity, gutter,
// problem, suggested change and a reply saying what the fix run did with it. No DOM, no rendering -
// `review-threads-components.tsx` is the only consumer. Returns `null` only when the projection is
// missing; every other junk value degrades to an omitted part (T-k44-04). Dates are formatted by
// hand in UTC (via `formatStamp`) so Node and the browser agree.
// T-k44-03: findings are capped by the extractor (500, with 20 references each); the grouping is a
// Map keyed by path. No RegExp is ever built from document text, and no url is built from it either
// (T-k44-07): the only navigation targets are heading ids taken from `input.headings`, or null,
// and the fix report's in-app url, which the server resolved against the presentation.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tones - the only place a severity, an outcome or a verdict becomes a tone
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the page draws from - never the parse-degradation tones
 * (`destructive` / `warning`), which stay reserved for the artifact-parse badge alone. */
export type ReviewTone = 'complete' | 'in-flight' | 'missing' | 'quiet';
export type ReviewSeverityKey = 'critical' | 'warning' | 'info';
/** `deferred` is the finding the fix run left alone ("Not attempted"). */
export type ReviewOutcomeKind = 'open' | 'fixed' | 'skipped' | 'deferred';

export const SEVERITY_ORDER: ReviewSeverityKey[] = ['critical', 'warning', 'info'];

export const SEVERITY_LABEL: Record<ReviewSeverityKey, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

export const SEVERITY_TONE: Record<ReviewSeverityKey, ReviewTone> = {
  critical: 'missing',
  warning: 'in-flight',
  info: 'quiet',
};

/** The "Outside scope" chip: quiet, never a warning. */
export const OUTSIDE_SCOPE_TONE: ReviewTone = 'quiet';

export const OUTCOME_LABEL: Record<ReviewOutcomeKind, string> = {
  fixed: 'Fixed',
  skipped: 'Skipped',
  deferred: 'Not attempted',
  open: 'Open',
};

/** The order a thread sorts by within one severity: still open first, fixed last. */
const OUTCOME_ORDER: ReviewOutcomeKind[] = ['open', 'deferred', 'skipped', 'fixed'];

/** Fixed -> complete; skipped and not attempted -> quiet (drawn dashed / dotted by the stylesheet);
 * an open finding takes its severity's tone. */
export function outcomeTone(outcome: ReviewOutcomeKind, severity: ReviewSeverityKey): ReviewTone {
  if (outcome === 'fixed') return 'complete';
  if (outcome === 'open') return SEVERITY_TONE[severity];
  return 'quiet';
}

/** The verdict's tone: a critical still in the code -> missing, anything else still in the code ->
 * in-flight, nothing left -> complete. */
export const VERDICT_TONE = {
  critical: 'missing',
  remaining: 'in-flight',
  clear: 'complete',
  unread: 'quiet',
} as const satisfies Record<string, ReviewTone>;

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface ComposedReviewStamp {
  label: string;
  tone: ReviewTone;
  outcome: ReviewOutcomeKind;
  commit: string | null;
}

export interface ComposedReviewReply {
  outcome: ReviewOutcomeKind;
  mark: '✓' | '…' | '–';
  kicker: string;
  commit: string | null;
  note: Block[];
  /** The fix's files modified, as paths. */
  files: string[];
  /** A muted line for a finding with no note of its own (open, not attempted). */
  quiet: string | null;
}

export interface ComposedReviewFinding {
  id: string;
  anchorId: string;
  severity: ReviewSeverityKey;
  severityLabel: string;
  severityTone: ReviewTone;
  title: string;
  stamp: ComposedReviewStamp;
  /** The first file's spans as gutter labels ("L116–134", "L56"); empty when none are named. */
  gutter: string[];
  /** How many files the finding names beyond the first. */
  moreFiles: number;
  issue: Block[];
  fix: Block[];
  extra: { label: string; blocks: Block[] }[];
  reply: ComposedReviewReply;
  /** A fixed finding starts as a one-line resolved row. */
  defaultFolded: boolean;
  /** "L116" for the resolved row, or ''. */
  firstLine: string;
  /** Every file after the first the finding names: "name:spans" and its directory. */
  locations: { name: string; spans: string; dir: string }[];
}

/** One finding's span in a file, positioned along the file header's line ruler. */
export interface ComposedReviewRulerMark {
  left: number;
  width: number;
  severity: ReviewSeverityKey;
  outcome: ReviewOutcomeKind;
  label: string;
}

export interface ComposedReviewFileBlock {
  path: string;
  /** The path as shown ("No file named" when a finding names none). */
  label: string;
  count: number;
  /** True for a file the declared review list does not name (never when no list was declared). */
  outsideScope: boolean;
  ruler: ComposedReviewRulerMark[];
  findings: ComposedReviewFinding[];
}

export interface ComposedReviewAlso {
  label: string;
  kind: 'fix' | 'files' | 'section' | 'frontmatter';
  /** A heading id for Source mode (section, frontmatter), or null for the top. */
  targetId: string | null;
  /** The fix report's in-app route (fix), or null. */
  url: string | null;
}

export interface ComposedReviewVerdictPart {
  text: string;
  tone: ReviewTone | null;
}

export interface ComposedReviewThreads {
  head: {
    eyebrow: string;
    /** The h1; the component falls back to the artifact title when null. */
    title: string | null;
    reviewed: string | null;
  };
  verdict: {
    parts: ComposedReviewVerdictPart[];
    tone: ReviewTone;
    sub: string;
  };
  facts: { label: string; value: string; opensFiles: boolean }[];
  tally: { key: string; label: string; count: number; tone: ReviewTone | null }[];
  quote: { text: string; by: string; more: boolean; summaryId: string | null } | null;
  threads: {
    heading: string;
    aside: string;
    note: string;
    fixedCount: number;
    files: ComposedReviewFileBlock[];
    /** The Summary's last paragraph (or a plain line) when the review found nothing. */
    empty: string | null;
  };
  /** The reviewed files no finding names. */
  quiet: { label: string; files: { name: string; path: string }[] } | null;
  filesDialog: {
    title: string;
    note: string | null;
    rows: { path: string; outsideScope: boolean; ids: string[] }[];
  } | null;
  also: ComposedReviewAlso[];
  footer: { reviewer: string | null; depth: string | null } | null;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

type Rec = Record<string, unknown>;

function rec(value: unknown): Rec | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : null;
}

function asStr(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return '';
}

function asNum(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strOrNull(value: unknown): string | null {
  const text = asStr(value).trim();
  return text === '' ? null : text;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function humanize(text: string): string {
  const spaced = text.split('_').join(' ').split('-').join(' ').trim();
  return spaced === '' ? '' : spaced[0].toUpperCase() + spaced.slice(1);
}

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function blocksOf(value: unknown): Block[] {
  const out: Block[] = [];
  for (const raw of list(value)) {
    const block = rec(raw);
    if (block === null) continue;
    if (block.kind === 'paragraph' && typeof block.text === 'string') out.push({ kind: 'paragraph', text: block.text });
    else if (block.kind === 'code' && typeof block.text === 'string') {
      out.push(typeof block.lang === 'string' ? { kind: 'code', text: block.text, lang: block.lang } : { kind: 'code', text: block.text });
    }
    else if (block.kind === 'list' && Array.isArray(block.items)) {
      out.push({ kind: 'list', ordered: block.ordered === true, items: block.items.map((item) => asStr(item)) });
    } else if (block.kind === 'table' && Array.isArray(block.rows)) {
      const rows: Record<string, string>[] = [];
      for (const rawRow of block.rows) {
        const row = rec(rawRow);
        if (row === null) continue;
        rows.push(Object.fromEntries(Object.entries(row).map(([key, cell]) => [key, asStr(cell)])));
      }
      out.push({ kind: 'table', rows });
    }
  }
  return out;
}

function textBlock(text: string | null): Block[] {
  return text === null || text.trim() === '' ? [] : [{ kind: 'paragraph', text: text.trim() }];
}

function blockTextOf(block: Block): string {
  if (block.kind === 'paragraph' || block.kind === 'code') return block.text;
  if (block.kind === 'list') return block.items.join(' ');
  return block.rows.map((row) => Object.values(row).join(' ')).join(' ');
}

// ---------------------------------------------------------------------------
// The projection read through guards
// ---------------------------------------------------------------------------

interface ReadFinding {
  id: string;
  title: string;
  severity: ReviewSeverityKey;
  section: string;
  fileRaw: string;
  refs: { path: string; spans: { from: number; to: number }[] }[];
  issue: Block[];
  fix: Block[];
  extra: { label: string; blocks: Block[] }[];
  inlineResolved: { commit: string | null; note: string } | null;
}

function severityOf(value: unknown): ReviewSeverityKey {
  return value === 'critical' || value === 'warning' ? value : 'info';
}

function readFinding(raw: unknown): ReadFinding | null {
  const f = rec(raw);
  if (f === null) return null;
  const id = asStr(f.id).trim();
  if (id === '') return null;
  const refs: ReadFinding['refs'] = [];
  for (const rawRef of list(f.refs)) {
    const ref = rec(rawRef);
    const path = ref === null ? '' : asStr(ref.path).trim();
    if (ref === null || path === '') continue;
    const spans: { from: number; to: number }[] = [];
    for (const rawSpan of list(ref.spans)) {
      const span = rec(rawSpan);
      const from = span === null ? null : asNum(span.from);
      if (span === null || from === null || from <= 0) continue;
      const to = asNum(span.to);
      spans.push({ from, to: to !== null && to >= from ? to : from });
    }
    refs.push({ path, spans });
  }
  const extra: ReadFinding['extra'] = [];
  for (const rawExtra of list(f.extra)) {
    const item = rec(rawExtra);
    const label = item === null ? '' : asStr(item.label).trim();
    if (item === null || label === '') continue;
    extra.push({ label, blocks: blocksOf(item.blocks) });
  }
  const resolved = rec(f.inlineResolved);
  return {
    id,
    title: asStr(f.title).trim(),
    severity: severityOf(f.severity),
    section: asStr(f.section),
    fileRaw: asStr(f.fileRaw),
    refs,
    issue: blocksOf(f.issue),
    fix: blocksOf(f.fix),
    extra,
    inlineResolved: resolved === null ? null : { commit: strOrNull(resolved.commit), note: asStr(resolved.note).trim() },
  };
}

interface FixOutcomeEntry {
  ids: string[];
  outcome: 'fixed' | 'skipped';
  commit: string | null;
  commitNote: string | null;
  files: string[];
  note: Block[];
}

interface FixReport {
  entries: FixOutcomeEntry[];
  deferred: { ids: string[]; note: string }[];
}

function readFixReport(value: unknown): FixReport | null {
  const report = rec(value);
  if (report === null) return null;
  const entries: FixOutcomeEntry[] = [];
  for (const raw of list(report.entries)) {
    const entry = rec(raw);
    if (entry === null || (entry.outcome !== 'fixed' && entry.outcome !== 'skipped')) continue;
    entries.push({
      ids: list(entry.ids).map((id) => asStr(id)).filter((id) => id !== ''),
      outcome: entry.outcome,
      commit: strOrNull(entry.commit),
      commitNote: strOrNull(entry.commitNote),
      files: list(entry.files).map((file) => asStr(file)).filter((file) => file !== ''),
      note: blocksOf(entry.note),
    });
  }
  const deferred: FixReport['deferred'] = [];
  for (const raw of list(report.deferred)) {
    const item = rec(raw);
    if (item === null) continue;
    deferred.push({ ids: list(item.ids).map((id) => asStr(id)).filter((id) => id !== ''), note: asStr(item.note).trim() });
  }
  return { entries, deferred };
}

// ---------------------------------------------------------------------------
// Outcomes - the ladder
// ---------------------------------------------------------------------------

interface Outcome {
  kind: ReviewOutcomeKind;
  commit: string | null;
  note: Block[];
  files: string[];
  /** Where the outcome was read from: the fix report, or the review's own frontmatter / inline note. */
  source: 'fix' | 'review' | 'none';
  quiet: string | null;
}

function isHexToken(token: string): boolean {
  if (token.length < 6 || token.length > 40) return false;
  let digit = false;
  for (const ch of token) {
    const isDigit = ch >= '0' && ch <= '9';
    if (!isDigit && !(ch >= 'a' && ch <= 'f')) return false;
    if (isDigit) digit = true;
  }
  return digit;
}

/** The last 6-40 character hex token in `text`. */
function lastHexToken(text: string): string | null {
  let found: string | null = null;
  let token = '';
  for (let i = 0; i <= text.length; i++) {
    const ch = i < text.length ? text[i] : ' ';
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) {
      token += ch;
    } else {
      if (isHexToken(token)) found = token;
      token = '';
    }
  }
  return found;
}

function isUpper(ch: string | undefined): boolean {
  return ch !== undefined && ch >= 'A' && ch <= 'Z';
}

function isDigitCh(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

/** The end of a finding ID (two to four capitals, a hyphen, one to four digits) starting at `pos`. */
function idEndAt(text: string, pos: number): number {
  let i = pos;
  while (i < text.length && i - pos < 5 && isUpper(text[i])) i += 1;
  const letters = i - pos;
  if (letters < 2 || letters > 4 || text[i] !== '-') return -1;
  i += 1;
  const from = i;
  while (i < text.length && isDigitCh(text[i])) i += 1;
  if (i - from < 1 || i - from > 4) return -1;
  return i;
}

/** `blockers_resolved`: "CR-01 (sfu f6ad4d8), CR-02 (sync 812d8ba) - fixed 2026-06-11". Each ID
 * followed by a parenthetical takes the parenthetical's last hex token as its commit; the text
 * after the last " - " (an em dash) is the note. */
function blockersResolved(value: unknown): Map<string, { commit: string; note: string }> {
  const out = new Map<string, { commit: string; note: string }>();
  const texts: string[] = [];
  if (typeof value === 'string') texts.push(value);
  else for (const item of list(value)) if (typeof item === 'string') texts.push(item);
  for (const raw of texts) {
    const text = raw.slice(0, 4000);
    const dash = text.lastIndexOf(' — ');
    const note = dash === -1 ? '' : text.slice(dash + 3).trim();
    let i = 0;
    while (i < text.length) {
      const end = isUpper(text[i]) ? idEndAt(text, i) : -1;
      if (end === -1) {
        i += 1;
        continue;
      }
      const id = text.slice(i, end);
      let next = end;
      while (text[next] === ' ') next += 1;
      if (text[next] === '(') {
        const close = text.indexOf(')', next);
        if (close !== -1) {
          const commit = lastHexToken(text.slice(next + 1, close));
          if (commit !== null && !out.has(id)) out.set(id, { commit, note });
          next = close + 1;
        }
      }
      i = Math.max(end, next);
    }
  }
  return out;
}

function frontmatterResolved(value: unknown): Map<string, { commit: string | null; note: string }> {
  const out = new Map<string, { commit: string | null; note: string }>();
  for (const raw of list(value)) {
    const item = rec(raw);
    const id = item === null ? '' : asStr(item.id).trim();
    if (item === null || id === '' || out.has(id)) continue;
    out.set(id, { commit: strOrNull(item.commit), note: squash(asStr(item.note)) });
  }
  return out;
}

const NOT_IN_SCOPE = "Not in the fix run's scope";

function outcomeOf(
  finding: ReadFinding,
  fix: FixReport | null,
  resolved: Map<string, { commit: string | null; note: string }>,
  blockers: Map<string, { commit: string; note: string }>,
): Outcome {
  if (fix !== null) {
    const entry = fix.entries.find((e) => e.ids.includes(finding.id));
    if (entry !== undefined) {
      if (entry.outcome === 'fixed') {
        const note = entry.commitNote === null ? entry.note : [...textBlock(entry.commitNote), ...entry.note];
        return { kind: 'fixed', commit: entry.commit, note, files: entry.files, source: 'fix', quiet: null };
      }
      return { kind: 'skipped', commit: null, note: entry.note, files: [], source: 'fix', quiet: null };
    }
    const bullet = fix.deferred.find((d) => d.ids.includes(finding.id));
    if (bullet !== undefined) {
      return { kind: 'deferred', commit: null, note: textBlock(bullet.note), files: [], source: 'fix', quiet: null };
    }
  }
  const fromFrontmatter = resolved.get(finding.id);
  if (fromFrontmatter !== undefined) {
    return { kind: 'fixed', commit: fromFrontmatter.commit, note: textBlock(fromFrontmatter.note), files: [], source: 'review', quiet: null };
  }
  const fromBlockers = blockers.get(finding.id);
  if (fromBlockers !== undefined) {
    return { kind: 'fixed', commit: fromBlockers.commit, note: textBlock(fromBlockers.note), files: [], source: 'review', quiet: null };
  }
  if (finding.inlineResolved !== null) {
    return {
      kind: 'fixed',
      commit: finding.inlineResolved.commit,
      note: textBlock(finding.inlineResolved.note),
      files: [],
      source: 'review',
      quiet: null,
    };
  }
  if (fix !== null) {
    if (finding.severity === 'info') {
      return { kind: 'deferred', commit: null, note: textBlock(NOT_IN_SCOPE), files: [], source: 'none', quiet: null };
    }
    return { kind: 'open', commit: null, note: [], files: [], source: 'none', quiet: 'The fix run did not address this.' };
  }
  return { kind: 'open', commit: null, note: [], files: [], source: 'none', quiet: 'Nothing records a fix for this finding.' };
}

function replyOf(outcome: Outcome): ComposedReviewReply {
  if (outcome.kind === 'fixed') {
    return {
      outcome: 'fixed',
      mark: '✓',
      kicker: outcome.commit === null ? 'Fixed' : `Fixed in ${outcome.commit}`,
      commit: outcome.commit,
      note: outcome.note,
      files: outcome.files,
      quiet: null,
    };
  }
  if (outcome.kind === 'skipped') {
    return { outcome: 'skipped', mark: '–', kicker: 'Skipped on purpose', commit: null, note: outcome.note, files: [], quiet: null };
  }
  if (outcome.kind === 'deferred') {
    return {
      outcome: 'deferred',
      mark: '–',
      kicker: 'Not attempted',
      commit: null,
      note: outcome.note,
      files: [],
      quiet: outcome.note.length === 0 ? "Outside the fix run's scope" : null,
    };
  }
  return { outcome: 'open', mark: '…', kicker: 'No reply yet', commit: null, note: [], files: [], quiet: outcome.quiet };
}

// ---------------------------------------------------------------------------
// Spans, head and verdict
// ---------------------------------------------------------------------------

function spanLabel(span: { from: number; to: number }): string {
  return span.to !== span.from ? `L${span.from}–${span.to}` : `L${span.from}`;
}

function quickIdIn(text: string): string | null {
  if (text.length < 10) return null;
  for (let i = 0; i < 6; i++) if (!isDigitCh(text[i])) return null;
  if (text[6] !== '-') return null;
  for (let i = 7; i < 10; i++) {
    const ch = text[i];
    if (!((ch >= 'a' && ch <= 'z') || isDigitCh(ch))) return null;
  }
  return text.slice(0, 10);
}

/** "03-file-browsing" / "03" / 3 / "02.1-x" -> "3" / "2.1"; null when no leading number. */
function phaseNumberOf(phase: string): string | null {
  let i = 0;
  while (i < phase.length && isDigitCh(phase[i])) i += 1;
  if (i === 0) return null;
  let whole = phase.slice(0, i).replace(/^0+(?=\d)/, '');
  if (phase[i] === '.') {
    let j = i + 1;
    while (j < phase.length && isDigitCh(phase[j])) j += 1;
    if (j > i + 1) whole = `${whole}.${phase.slice(i + 1, j)}`;
  }
  return whole;
}

/** "01-identity-persistence-foundation" -> "Identity persistence foundation"; a quick id or a bare
 * number leaves no words, so null. */
function slugTitle(phase: string): string | null {
  const quick = quickIdIn(phase);
  let rest = quick !== null ? phase.slice(quick.length) : phase;
  if (quick === null) {
    let i = 0;
    while (i < rest.length && (isDigitCh(rest[i]) || rest[i] === '.')) i += 1;
    if (i > 0) rest = rest.slice(i);
  }
  while (rest.startsWith('-') || rest.startsWith(' ')) rest = rest.slice(1);
  const words = rest.split('-').join(' ').trim();
  return words === '' ? null : words[0].toUpperCase() + words.slice(1);
}

function eyebrowOf(fm: Rec, review: Rec): string {
  const phase = asStr(fm.phase).trim();
  const fmQuick = quickIdIn(phase);
  if (fmQuick === null) {
    const number = phaseNumberOf(phase);
    if (number !== null) return `Code review · Phase ${number}`;
  }
  const quickId = fmQuick ?? strOrNull(review.quickId);
  if (quickId !== null) return `Quick code review · ${quickId}`;
  const pathPhase = rec(review.pathPhase);
  const pathNumber = pathPhase === null ? null : phaseNumberOf(asStr(pathPhase.number));
  if (pathNumber !== null) return `Code review · Phase ${pathNumber}`;
  return 'Code review';
}

/** The H1 without its "Phase N:" / "Quick <id>:" lead and its "Code Review (Report)" words; null
 * when nothing (or only a parenthetical) is left. */
function titleFromH1(h1: string): string | null {
  let text = h1.trim();
  let lower = text.toLowerCase();
  if (lower.startsWith('phase ')) {
    let i = 6;
    while (i < text.length && (isDigitCh(text[i]) || text[i] === '.')) i += 1;
    text = text.slice(i).trim();
    if (text.startsWith(':')) text = text.slice(1).trim();
  } else if (lower.startsWith('quick ')) {
    let i = 6;
    while (i < text.length && text[i] !== ' ' && text[i] !== ':') i += 1;
    text = text.slice(i).trim();
    if (text.startsWith(':')) text = text.slice(1).trim();
  }
  for (const words of ['code review report', 'code review']) {
    lower = text.toLowerCase();
    if (lower.startsWith(words)) {
      text = text.slice(words.length).trim();
      break;
    }
    if (lower.endsWith(words)) {
      text = text.slice(0, text.length - words.length).trim();
      break;
    }
  }
  while (text.startsWith(':') || text.startsWith('-') || text.startsWith('—') || text.startsWith('–')) text = text.slice(1).trim();
  if (text === '' || (text.startsWith('(') && text.endsWith(')'))) return null;
  return text;
}

function headIdOf(headings: ViewInput['headings'], predicate: (normalized: string) => boolean): string | null {
  for (const heading of headings ?? []) {
    if (predicate(normalizeHeading(heading.text))) return heading.id;
  }
  return null;
}

interface Counts {
  critical: number;
  warning: number;
  info: number;
}

/** What the frontmatter says was found: `findings.total`, the sum of `findings.critical|warning|info`,
 * or the flat `critical_count` / `warning_count` / `info_count`. */
function frontmatterFindingCount(fm: Rec): number {
  const nested = rec(fm.findings);
  if (nested !== null) {
    const total = asNum(nested.total);
    if (total !== null && total > 0) return total;
    const sum = (asNum(nested.critical) ?? 0) + (asNum(nested.warning) ?? 0) + (asNum(nested.info) ?? 0);
    if (sum > 0) return sum;
  }
  return (asNum(fm.critical_count) ?? 0) + (asNum(fm.warning_count) ?? 0) + (asNum(fm.info_count) ?? 0);
}


// ---------------------------------------------------------------------------
// Files, ruler and the Also row
// ---------------------------------------------------------------------------

function baseName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}

function dirName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? '' : path.slice(0, slash);
}

function trimDot(path: string): string {
  return path.startsWith('./') ? path.slice(2) : path;
}

/** The same file: equal after dropping a leading "./", or one path ending with "/" + the other. */
function sameFile(a: string, b: string): boolean {
  const na = trimDot(a);
  const nb = trimDot(b);
  return na === nb || na.endsWith(`/${nb}`) || nb.endsWith(`/${na}`);
}

function spanText(spans: { from: number; to: number }[]): string {
  return spans.map((span) => (span.to !== span.from ? `${span.from}–${span.to}` : `${span.from}`)).join(', ');
}

function rulerOf(
  findings: ReadFinding[],
  path: string,
  outcomeOfId: (id: string) => Outcome,
): ComposedReviewRulerMark[] {
  if (path === '') return [];
  const marks: { from: number; to: number; finding: ReadFinding }[] = [];
  for (const finding of findings) {
    for (const ref of finding.refs) {
      if (ref.path !== path) continue;
      for (const span of ref.spans) marks.push({ ...span, finding });
    }
  }
  if (marks.length === 0) return [];
  const max = Math.max(...marks.map((mark) => mark.to)) * 1.08;
  const round = (value: number): number => Math.round(value * 10) / 10;
  return marks.map((mark) => ({
    left: round((mark.from / max) * 100),
    width: round(Math.max(((mark.to - mark.from) / max) * 100, 0.8)),
    severity: mark.finding.severity,
    outcome: outcomeOfId(mark.finding.id).kind,
    label: `${mark.finding.id} · ${spanLabel(mark)}`,
  }));
}

const MAX_LISTED = 1000;
const QUIET_NOTE = 'Reviewed with nothing to say';

/** "Structural Findings (fallow)" -> "Structural Findings". */
function withoutParenthetical(heading: string): string {
  const text = heading.trim();
  if (text.endsWith(')')) {
    const open = text.lastIndexOf('(');
    if (open > 0) return text.slice(0, open).trim();
  }
  return text;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** The composed REVIEW page, or null when the payload carries no projection. */
export function composeReviewThreads(input: ViewInput): ComposedReviewThreads | null {
  const structured = rec(input.structured);
  const review = structured === null ? null : rec(structured.review);
  if (review === null) return null;
  const fm = rec(input.frontmatter) ?? {};
  const context = rec(input.reviewContext);
  const fixContext = context === null ? null : rec(context.fix);
  const fixReport = fixContext === null ? null : readFixReport(fixContext.report);
  const findings: ReadFinding[] = [];
  for (const raw of list(review.findings)) {
    const finding = readFinding(raw);
    if (finding !== null) findings.push(finding);
  }
  const summary = rec(review.summary);
  const summaryBlocks = summary === null ? [] : blocksOf(summary.blocks);
  const summaryParagraphs = summaryBlocks.filter((block) => block.kind === 'paragraph');

  // Outcomes.
  const resolved = frontmatterResolved(fm.resolved);
  const blockers = blockersResolved(fm.blockers_resolved);
  const outcomes = new Map<string, Outcome>();
  for (const finding of findings) outcomes.set(finding.id, outcomeOf(finding, fixReport, resolved, blockers));
  const outcomeOfId = (id: string): Outcome =>
    outcomes.get(id) ?? { kind: 'open', commit: null, note: [], files: [], source: 'none', quiet: null };
  const count = (kind: ReviewOutcomeKind): number => findings.filter((f) => outcomeOfId(f.id).kind === kind).length;
  const n = findings.length;
  const open = count('open');
  const fixed = count('fixed');
  const skipped = count('skipped');
  const deferred = count('deferred');
  const hasOutcomes = findings.some((f) => outcomeOfId(f.id).kind !== 'open');
  const bySeverity: Counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  // Files and depth.
  const listed = list(fm.files_reviewed_list).map((item) => asStr(item).trim()).filter((item) => item !== '');
  const filesFm = asNum(fm.files_reviewed);
  const filesCount = filesFm !== null ? filesFm : listed.length > 0 ? listed.length : null;
  const depth = strOrNull(fm.depth);
  const filesText = filesCount === null ? null : plural(filesCount, 'file');

  // Verdict.
  const where =
    filesText !== null && depth !== null
      ? `Reviewed ${filesText} at ${depth} depth.`
      : filesText !== null
        ? `Reviewed ${filesText}.`
        : depth !== null
          ? `Reviewed at ${depth} depth.`
          : '';
  const parts: ComposedReviewVerdictPart[] = [];
  let verdictTone: ReviewTone;
  let sub: string;
  if (n === 0) {
    const counted = frontmatterFindingCount(fm);
    if (counted > 0) {
      verdictTone = VERDICT_TONE.unread;
      parts.push({ text: `${plural(counted, 'finding')} counted, none readable here.`, tone: null });
      sub = where;
    } else {
      verdictTone = VERDICT_TONE.clear;
      parts.push({ text: 'Clean.', tone: 'complete' });
      parts.push({ text: filesCount === null ? ' Nothing to fix.' : ` Nothing to fix across ${filesText}.`, tone: null });
      sub = depth === null ? '' : `${humanize(depth)} review.`;
    }
  } else {
    const left = n - fixed;
    const criticalLeft = findings.filter((f) => f.severity === 'critical' && outcomeOfId(f.id).kind !== 'fixed').length;
    verdictTone = criticalLeft > 0 ? VERDICT_TONE.critical : left > 0 ? VERDICT_TONE.remaining : VERDICT_TONE.clear;
    if (hasOutcomes) {
      if (left > 0) {
        parts.push({ text: `${fixed} of ${n} fixed. `, tone: null });
        parts.push({ text: `${left} still in the code`, tone: criticalLeft > 0 ? 'missing' : 'in-flight' });
        if (criticalLeft > 0) {
          parts.push({ text: ', ', tone: null });
          parts.push({ text: `${criticalLeft} critical`, tone: 'missing' });
        }
        parts.push({ text: '.', tone: null });
      } else {
        parts.push({ text: n === 1 ? 'The one finding is fixed.' : `All ${n} findings fixed.`, tone: 'complete' });
      }
      const bits = [
        open > 0 ? `${open} open` : null,
        skipped > 0 ? `${skipped} skipped on purpose` : null,
        deferred > 0 ? `${deferred} not attempted` : null,
      ].filter((bit): bit is string => bit !== null);
      sub = `${bits.length > 0 ? `${bits.join(', ')}. ` : ''}${where}`.trim();
    } else {
      parts.push({ text: plural(n, 'finding'), tone: null });
      if (bySeverity.critical > 0) {
        parts.push({ text: ', ', tone: null });
        parts.push({ text: `${bySeverity.critical} critical`, tone: 'missing' });
      }
      parts.push({
        text: `. ${bySeverity.critical > 0 || bySeverity.warning > 0 ? 'None fixed yet.' : 'Nothing that breaks.'}`,
        tone: null,
      });
      sub = `${plural(bySeverity.warning, 'warning')}, ${bySeverity.info} info. ${where}`.trim();
    }
  }

  // The reviewed files: the declared list in order, then any file a finding names that the list
  // does not (looked up through a basename index, never a nested scan).
  const listedFiles = listed.slice(0, MAX_LISTED);
  const rows: { path: string; outsideScope: boolean; ids: string[] }[] = listedFiles.map((path) => ({
    path,
    outsideScope: false,
    ids: [],
  }));
  const byBase = new Map<string, number[]>();
  const indexRow = (index: number): void => {
    const key = baseName(trimDot(rows[index].path));
    const bucket = byBase.get(key);
    if (bucket === undefined) byBase.set(key, [index]);
    else bucket.push(index);
  };
  rows.forEach((_, index) => indexRow(index));
  const rowsFor = (path: string): number[] =>
    (byBase.get(baseName(trimDot(path))) ?? []).filter((index) => sameFile(rows[index].path, path));
  if (listedFiles.length > 0) {
    for (const finding of findings) {
      for (const ref of finding.refs) {
        let matched = rowsFor(ref.path);
        if (matched.length === 0) {
          rows.push({ path: ref.path, outsideScope: true, ids: [] });
          indexRow(rows.length - 1);
          matched = [rows.length - 1];
        }
        for (const index of matched) if (!rows[index].ids.includes(finding.id)) rows[index].ids.push(finding.id);
      }
    }
  }
  const hasDialog = listedFiles.length > 0;
  const outsideScopePath = (path: string): boolean =>
    hasDialog && path !== '' && !listedFiles.some((entry) => sameFile(entry, path));
  const filesDialog: ComposedReviewThreads['filesDialog'] = hasDialog
    ? {
        title: `Files reviewed · ${listedFiles.length}`,
        note: filesFm !== null && filesFm !== listedFiles.length ? `The frontmatter counts ${filesFm}.` : null,
        rows,
      }
    : null;
  const quietRows = hasDialog ? rows.filter((row) => !row.outsideScope && row.ids.length === 0) : [];
  const quiet: ComposedReviewThreads['quiet'] =
    quietRows.length > 0
      ? { label: `${QUIET_NOTE} · ${quietRows.length}`, files: quietRows.map((row) => ({ name: baseName(row.path), path: row.path })) }
      : null;

  // Facts.
  const facts: ComposedReviewThreads['facts'] = [];
  if (filesCount !== null) facts.push({ label: 'Files', value: String(filesCount), opensFiles: filesDialog !== null });
  if (depth !== null) facts.push({ label: 'Depth', value: humanize(depth), opensFiles: false });
  if (fixContext !== null) {
    const fmFix = rec(fixContext.frontmatter) ?? {};
    const when = strOrNull(fmFix.fixed_at);
    const date = when === null ? null : formatStamp(when).split(' · ')[0];
    const iteration = asNum(fmFix.iteration);
    facts.push({
      label: 'Fix run',
      value: `${date ?? '—'}${iteration !== null ? ` · iteration ${iteration}` : ''}`,
      opensFiles: false,
    });
  } else if (findings.some((f) => outcomeOfId(f.id).source === 'review')) {
    facts.push({ label: 'Resolved', value: 'noted in the review itself', opensFiles: false });
  }

  // Tally.
  const tally: ComposedReviewThreads['tally'] = [];
  if (n > 0) {
    if (hasOutcomes) {
      tally.push({ key: 'open', label: 'Open', count: open, tone: open > 0 ? 'missing' : null });
      tally.push({ key: 'fixed', label: 'Fixed', count: fixed, tone: fixed > 0 ? 'complete' : null });
      tally.push({ key: 'skipped', label: 'Skipped', count: skipped, tone: null });
      tally.push({ key: 'deferred', label: 'Not attempted', count: deferred, tone: null });
    } else {
      tally.push({ key: 'critical', label: 'Critical', count: bySeverity.critical, tone: bySeverity.critical > 0 ? 'missing' : null });
      tally.push({ key: 'warning', label: 'Warning', count: bySeverity.warning, tone: null });
      tally.push({ key: 'info', label: 'Info', count: bySeverity.info, tone: null });
      tally.push({ key: 'total', label: 'Total', count: n, tone: null });
    }
  }

  // Quote.
  const first = summaryParagraphs[0];
  const summaryHeading = summary === null ? '' : normalizeHeading(asStr(summary.heading));
  const quote: ComposedReviewThreads['quote'] =
    first === undefined
      ? null
      : {
          text: squash(blockTextOf(first)),
          by: ['The reviewer', depth, filesCount === null ? null : `${filesCount} files`]
            .filter((bit): bit is string => bit !== null)
            .join(' · '),
          more: summaryBlocks.length > 1,
          summaryId: headIdOf(input.headings, (t) => t === summaryHeading || t.startsWith('summary')),
        };

  // Threads.
  const rankOf = (finding: ReadFinding): number =>
    SEVERITY_ORDER.indexOf(finding.severity) * 10 + OUTCOME_ORDER.indexOf(outcomeOfId(finding.id).kind);
  const sorted = findings
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => rankOf(a.finding) - rankOf(b.finding) || a.index - b.index)
    .map((entry) => entry.finding);
  const groups = new Map<string, ReadFinding[]>();
  for (const finding of sorted) {
    const key = finding.refs[0]?.path ?? '';
    const bucket = groups.get(key);
    if (bucket === undefined) groups.set(key, [finding]);
    else bucket.push(finding);
  }
  const files: ComposedReviewFileBlock[] = [...groups.entries()].map(([path, members]) => ({
    path,
    label: path === '' ? 'No file named' : path,
    count: members.length,
    outsideScope: outsideScopePath(path),
    ruler: rulerOf(findings, path, outcomeOfId),
    findings: members.map((finding): ComposedReviewFinding => {
      const outcome = outcomeOfId(finding.id);
      const firstRef = finding.refs[0];
      return {
        id: finding.id,
        anchorId: `review-finding-${finding.id.toLowerCase()}`,
        severity: finding.severity,
        severityLabel: SEVERITY_LABEL[finding.severity],
        severityTone: SEVERITY_TONE[finding.severity],
        title: finding.title,
        stamp: {
          label: OUTCOME_LABEL[outcome.kind],
          tone: outcomeTone(outcome.kind, finding.severity),
          outcome: outcome.kind,
          commit: outcome.commit,
        },
        gutter: firstRef === undefined ? [] : firstRef.spans.map(spanLabel),
        moreFiles: Math.max(0, finding.refs.length - 1),
        issue: finding.issue,
        fix: finding.fix,
        extra: finding.extra,
        reply: replyOf(outcome),
        defaultFolded: outcome.kind === 'fixed',
        firstLine: firstRef !== undefined && firstRef.spans[0] !== undefined ? `L${firstRef.spans[0].from}` : '',
        locations: finding.refs.slice(1).map((ref) => ({ name: baseName(ref.path), spans: spanText(ref.spans), dir: dirName(ref.path) })),
      };
    }),
  }));
  const lastParagraph = summaryParagraphs[summaryParagraphs.length - 1];
  const emptyLine = lastParagraph === undefined ? 'No issues found.' : squash(blockTextOf(lastParagraph));

  // Also in this report: the fix report, the files list, every other section, the frontmatter.
  const also: ComposedReviewAlso[] = [];
  if (fixContext !== null) {
    const status = strOrNull((rec(fixContext.frontmatter) ?? {}).status);
    also.push({
      label: status === null ? 'Fix report' : `Fix report · ${humanize(status)}`,
      kind: 'fix',
      targetId: null,
      url: strOrNull(fixContext.url),
    });
  }
  if (filesDialog !== null) {
    also.push({ label: `Files reviewed · ${filesCount ?? filesDialog.rows.length}`, kind: 'files', targetId: null, url: null });
  }
  for (const raw of list(review.sections)) {
    const section = rec(raw);
    if (section === null || section.handled === true || section.none === true) continue;
    const heading = asStr(section.heading).trim();
    if (heading === '') continue;
    const wanted = normalizeHeading(heading);
    also.push({
      label: withoutParenthetical(heading),
      kind: 'section',
      targetId: headIdOf(input.headings, (t) => t === wanted),
      url: null,
    });
  }
  if (Object.keys(fm).length > 0) also.push({ label: 'Frontmatter', kind: 'frontmatter', targetId: null, url: null });
  const reviewer = strOrNull(review.reviewer);

  // Head.
  const phaseName = context === null ? null : strOrNull(context.phaseName);
  const h1 = strOrNull(review.h1);
  const phaseFm = asStr(fm.phase).trim();
  const pathPhase = rec(review.pathPhase);
  const title =
    phaseName ??
    (h1 === null ? null : titleFromH1(h1)) ??
    (phaseFm === '' ? null : slugTitle(phaseFm)) ??
    (pathPhase === null ? null : slugTitle(asStr(pathPhase.slug)));
  const reviewedRaw = strOrNull(fm.reviewed) ?? strOrNull(fm.reviewed_at);

  return {
    head: {
      eyebrow: eyebrowOf(fm, review),
      title,
      reviewed: reviewedRaw === null ? null : formatStamp(reviewedRaw),
    },
    verdict: { parts, tone: verdictTone, sub },
    facts,
    tally,
    quote,
    threads: {
      heading: 'Review threads',
      aside: n === 0 ? 'none' : `${plural(files.length, 'file')} · ${plural(n, 'comment')}`,
      note: `Grouped by file, worst first.${fixed > 0 ? ' Fixed threads fold away like resolved conversations.' : ''}`,
      fixedCount: fixed,
      files,
      empty: n === 0 ? emptyLine : null,
    },
    quiet,
    filesDialog,
    also,
    footer: reviewer === null && depth === null ? null : { reviewer, depth },
  };
}
