// The SUMMARY page composer (quick-261006-iz7, sketch 020 winner D): a pure `ViewInput` ->
// `ComposedSummaryRun` merge of the frontmatter and `structured.summary` (built by
// `src/planning-repo/handlers/summary-run.ts`, with `pathPhase` and `quickId` added by the handler).
// It decides the B head (eyebrow, title, completed date, status, duration, started, type and
// self-check chips, the Tasks / Files / Requirements triggers and their modals), the Outcome rows
// with the proof pills that jump to the matching Proof row, the run timeline with every deviation
// hanging off its task, the full deviation cards, the Proof table, Decisions | Patterns, Also in
// this summary, Waiting on a human, the lineage strip, Next and the "In the source only" targets.
// No DOM, no rendering — `summary-run-components.tsx` is the only consumer. Returns `null` when
// the summary projection is missing or nothing beyond the head would compose, and the page then
// keeps the pre-existing promoted-block view (T-iz7-04). Dates are formatted by hand in UTC (via
// `formatStamp`) so Node and the browser agree, and an unparseable date renders as written.
// T-iz7-03: author-written paths, hashes and phase strings are never turned into an href here; the
// only urls come from `requirementPreviews` / `lineageLinks`, built with the server-generated route
// builders over the presentation the page already holds.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type {
  SummaryAccomplishment,
  SummaryDeviation,
  SummaryDeviations,
  SummaryOtherSection,
  SummaryPerformance,
  SummaryRunBody,
  SummarySubsection,
  SummaryTask,
} from '../../planning-repo/handlers/summary-run.ts';
import type { PhaseIdentity } from '../../domain/model.ts';
import { buildArtifactUrl, buildPhaseUrl } from '../../presentation/routes.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tones — the only place a status, a state or a chip becomes a tone
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the page draws from — never the parse-degradation tones
 * (`destructive` / `warning`), which stay reserved for the artifact-parse badge alone. */
export type SummaryTone = 'complete' | 'in-flight' | 'missing' | 'quiet' | 'active';

export type CheckState = 'pass' | 'fail' | 'unknown';

export const CHECK_STATE: Record<CheckState, SummaryTone> = {
  pass: 'complete',
  fail: 'missing',
  unknown: 'quiet',
};

/** A human-judgment deliverable always reads in-flight, whatever its checks say. */
export const HUMAN_TONE: SummaryTone = 'in-flight';
export const WAIT_TONE: SummaryTone = 'in-flight';
export const SETUP_TONE: SummaryTone = 'in-flight';
export const DEVIATION_TONE: SummaryTone = 'in-flight';

export const SELF_CHECK_TONE: Record<'passed' | 'failed' | 'other', SummaryTone> = {
  passed: 'complete',
  failed: 'missing',
  other: 'quiet',
};

export type RequirementState = 'completed' | 'partial' | 'pending';

export const REQ_STATE: Record<RequirementState, { label: string; tone: SummaryTone }> = {
  completed: { label: 'Completed', tone: 'complete' },
  partial: { label: 'Partial', tone: 'in-flight' },
  pending: { label: 'Pending', tone: 'in-flight' },
};

export type PatternKind = 'approach' | 'convention';

export const PATTERN_TONE: Record<PatternKind, SummaryTone> = {
  approach: 'quiet',
  convention: 'active',
};

export const PATTERN_LABEL: Record<PatternKind, string> = {
  approach: 'Approach',
  convention: 'Convention',
};

export const RULE_LABEL: Record<number, string> = {
  1: 'Bug',
  2: 'Missing piece',
  3: 'Blocker',
  4: 'Architecture',
};

export const NEW_FILE_TONE: SummaryTone = 'complete';
/** The Type chip, a task's kind chips and a New dependency chip read as quiet labels. */
export const TYPE_TONE: SummaryTone = 'quiet';
export const KIND_TONE: SummaryTone = 'quiet';
export const DEPENDENCY_TONE: SummaryTone = 'quiet';

/** The status chip: complete / done / pass, then await / pending / checkpoint, then fail / block. */
export function statusOf(raw: string | null): { label: string; tone: SummaryTone } {
  if (raw === null || raw.trim() === '') return { label: '—', tone: 'quiet' };
  const lower = raw.toLowerCase();
  if (lower.includes('complete') || lower.includes('done') || lower.includes('pass')) {
    return { label: 'Complete', tone: 'complete' };
  }
  if (lower.includes('await') || lower.includes('pending') || lower.includes('checkpoint')) {
    return { label: 'Awaiting checkpoint', tone: 'in-flight' };
  }
  if (lower.includes('fail') || lower.includes('block')) return { label: 'Blocked', tone: 'missing' };
  return { label: humanize(raw), tone: 'quiet' };
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface ComposedSummaryHead {
  eyebrow: string;
  title: string | null;
  planId: string;
  /** "20 Sep 2026" or null. */
  completed: string | null;
  oneLiner: string | null;
  status: { label: string; tone: SummaryTone };
  duration: string | null;
  /** HH:MM as written, or null. */
  started: string | null;
  type: string | null;
  selfCheck: { label: string; tone: SummaryTone } | null;
}

export interface ComposedSummaryTriggers {
  tasks: { label: 'Tasks' | 'Commits'; count: number };
  files: { count: number };
  requirements: { done: number; pending: number };
}

export interface ComposedTaskRow {
  n: number;
  name: string | null;
  hashes: string[];
  kinds: string[];
}

export interface ComposedFileRow {
  path: string;
  note: string | null;
}

export interface ComposedRequirementRef {
  id: string;
  state: RequirementState;
}

export interface ComposedSummaryModals {
  tasks: { rows: ComposedTaskRow[]; commitCount: number; unnamed: boolean };
  files: { created: ComposedFileRow[]; modified: ComposedFileRow[]; listed: ComposedFileRow[] };
  requirements: ComposedRequirementRef[];
}

export interface ComposedPill {
  id: string;
  state: CheckState;
  human: boolean;
  title: string;
  anchorId: string;
}

export interface ComposedOutlineRow {
  n: string;
  head: string;
  rest: string;
  long: boolean;
  pills: ComposedPill[];
}

export interface ComposedOutcome {
  shipped: number;
  proven: number;
  human: number;
  fixed: number;
  rows: ComposedOutlineRow[];
}

export interface ComposedStopDeviation {
  index: number;
  rule: number | null;
  kicker: string;
  title: string;
  anchorId: string;
}

export type StopKind = 'start' | 'task' | 'commits' | 'wait' | 'end';

export interface ComposedStop {
  kind: StopKind;
  /** The small mono line: "Started · 20:34", "Task 1 · feat", "Waiting on a human", "Completed · ...". */
  label: string;
  n: number | null;
  hashes: string[];
  name: string | null;
  deviations: ComposedStopDeviation[];
}

export interface ComposedDeviationCard {
  anchorId: string;
  rule: number | null;
  kicker: string;
  title: string;
  commit: string | null;
  fields: { label: string; value: string }[];
  text: string | null;
}

export interface ComposedRun {
  aside: string;
  stops: ComposedStop[];
  cards: ComposedDeviationCard[];
  extras: SummarySubsection[];
  prose: Block[];
  /** "Went to plan." with its note, or null. */
  went: { note: string | null } | null;
}

export interface ComposedProofCheck {
  kind: string;
  ref: string;
  state: CheckState;
}

export interface ComposedProofRow {
  id: string;
  anchorId: string;
  description: string;
  requirement: string | null;
  human: boolean;
  rationale: string | null;
  checks: ComposedProofCheck[];
}

export interface ComposedDecisions {
  items: string[];
  body: Block[] | null;
}

export interface ComposedPatternItem {
  kind: PatternKind;
  label: string;
  tone: SummaryTone;
  text: string;
}

export interface ComposedPatterns {
  added: string[];
  items: ComposedPatternItem[];
}

export interface ComposedLooseSection {
  key: string;
  title: string;
  blocks: Block[];
}

export interface ComposedLineageRequire {
  /** The `requires` phase string as written — the lookup key for `lineageLinks`. */
  key: string;
  label: string;
  provides: string | null;
}

export interface ComposedLineageAffect {
  text: string;
  short: string;
}

export interface ComposedLineage {
  planId: string;
  requires: ComposedLineageRequire[];
  affects: ComposedLineageAffect[];
}

export interface ComposedSourceOnly {
  label: string;
  /** The heading id to scroll to in Source mode, or null for the top of the source. */
  targetId: string | null;
}

export interface ComposedSummaryRun {
  quick: boolean;
  head: ComposedSummaryHead;
  triggers: ComposedSummaryTriggers;
  setup: Block[] | null;
  modals: ComposedSummaryModals;
  outcome: ComposedOutcome | null;
  run: ComposedRun;
  proof: ComposedProofRow[] | null;
  decisions: ComposedDecisions;
  patterns: ComposedPatterns | null;
  also: ComposedLooseSection[];
  waits: ComposedLooseSection[];
  lineage: ComposedLineage | null;
  next: string | null;
  sourceOnly: ComposedSourceOnly[];
}

// ---------------------------------------------------------------------------
// Defensive readers
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

function textOf(value: unknown): string {
  const direct = asStr(value);
  if (direct !== '') return direct.trim();
  const r = rec(value);
  if (r === null) return '';
  for (const key of ['statement', 'description', 'decision', 'name', 'title', 'text', 'phase']) {
    const field = asStr(r[key]);
    if (field !== '') return field.trim();
  }
  return '';
}

function listOf(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function strList(value: unknown): string[] {
  return listOf(value)
    .map(textOf)
    .filter((s) => s !== '');
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function maybeString(value: unknown): string | null {
  const s = asStr(value).trim();
  return s === '' ? null : s;
}

function isHexWord(text: string): boolean {
  if (text.length < 4 || text.length > 40) return false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f'))) return false;
  }
  return true;
}

const ACRONYMS = new Set(['ui', 'api', 'db', 'css', 'cli', 'ux', 'e2e']);

/** "web-ui" -> "Web UI": separators become spaces, the first letter is upper-cased and the known
 * acronyms are upper-cased as words. */
export function humanize(text: string): string {
  const words = text.replace(/[-_]/g, ' ').trim().split(' ');
  return words
    .map((word, index) => {
      if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase();
      return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join(' ');
}

/** The sketch's `cap`: the first lower-case letter, after any leading non-letter, upper-cased. */
export function capFirst(text: string): string {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= 'a' && ch <= 'z') return text.slice(0, i) + ch.toUpperCase() + text.slice(i + 1);
    if ((ch >= 'A' && ch <= 'Z') || ch === '`' || ch === '*') return text;
  }
  return text;
}

function pad2(text: string): string {
  return text.length >= 2 ? text : `0${text}`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** An element id from an author id (a deliverable id, a deviation index). */
function anchorPart(text: string): string {
  let out = '';
  for (let i = 0; i < text.length && i < 60; i++) {
    const ch = text[i];
    const ok = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_' || ch === '-';
    out += ok ? ch : '-';
  }
  return out === '' ? 'x' : out;
}

// ---------------------------------------------------------------------------
// The structured payload, read safely
// ---------------------------------------------------------------------------

interface SafeSummary extends Omit<SummaryRunBody, 'deviations'> {
  deviations: SummaryDeviations | null;
  pathPhase: { number: string; slug: string } | null;
  quickId: string | null;
}

function readSummary(structured: Rec): SafeSummary | null {
  const raw = rec(structured.summary);
  if (raw === null) return null;
  const perf = rec(raw.performance);
  const performance: SummaryPerformance = {
    started: maybeString(perf?.started),
    completed: maybeString(perf?.completed),
    duration: maybeString(perf?.duration),
  };
  const dev = rec(raw.deviations);
  const deviations: SummaryDeviations | null =
    dev === null
      ? null
      : {
          none: dev.none === true,
          note: maybeString(dev.note),
          items: arr<SummaryDeviation>(dev.items),
          prose: arr<Block>(dev.prose),
          extras: arr<SummarySubsection>(dev.extras),
        };
  const phase = rec(raw.pathPhase);
  return {
    h1: maybeString(raw.h1),
    oneLiner: maybeString(raw.oneLiner),
    preamble: arr<{ key: string; value: string }>(raw.preamble),
    performance,
    accomplishments: arr<SummaryAccomplishment>(raw.accomplishments),
    tasks: arr<SummaryTask>(raw.tasks),
    taskSource: null,
    fileNotes: arr<{ path: string; note: string }>(raw.fileNotes),
    decisionsBody: Array.isArray(raw.decisionsBody) ? (raw.decisionsBody as Block[]) : null,
    deviations,
    userSetup: Array.isArray(raw.userSetup) ? (raw.userSetup as Block[]) : null,
    next: maybeString(raw.next),
    selfCheck: maybeString(raw.selfCheck),
    others: arr<SummaryOtherSection>(raw.others),
    sections: arr<{ heading: string; claimed: boolean }>(raw.sections),
    pathPhase: phase === null ? null : { number: asStr(phase.number), slug: asStr(phase.slug) },
    quickId: maybeString(raw.quickId),
  };
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

function stripLeadingZeros(text: string): string {
  let i = 0;
  while (i < text.length - 1 && text[i] === '0') i += 1;
  return text.slice(i);
}

function digitsPrefix(text: string): string {
  let i = 0;
  while (i < text.length && text[i] >= '0' && text[i] <= '9') i += 1;
  return text.slice(0, i);
}

interface Identity {
  /** Phase number as written ("05"), or null. */
  number: string | null;
  slug: string | null;
  quickId: string | null;
}

/** frontmatter `phase` "NN-slug" -> the handler's `pathPhase` -> `quick-<id>` -> the filename's quick id. */
function identityOf(fm: Rec, summary: SafeSummary): Identity {
  const phase = asStr(fm.phase).trim();
  if (phase !== '') {
    if (phase.toLowerCase().startsWith('quick-')) return { number: null, slug: null, quickId: phase.slice(6) };
    const digits = digitsPrefix(phase);
    if (digits !== '') {
      const rest = phase.slice(digits.length);
      const slug = rest.startsWith('-') ? rest.slice(1) : null;
      return { number: digits, slug: slug === '' ? null : slug, quickId: null };
    }
  }
  if (summary.pathPhase !== null && summary.pathPhase.number !== '') {
    return {
      number: summary.pathPhase.number,
      slug: summary.pathPhase.slug === '' ? null : summary.pathPhase.slug,
      quickId: null,
    };
  }
  if (summary.quickId !== null) return { number: null, slug: null, quickId: summary.quickId };
  return { number: null, slug: null, quickId: null };
}

function eyebrowOf(id: Identity): string {
  if (id.number !== null) {
    const base = `Summary · Phase ${stripLeadingZeros(id.number)}`;
    return id.slug === null ? base : `${base} · ${humanize(id.slug)}`;
  }
  if (id.quickId !== null) return `Quick summary · ${id.quickId}`;
  return 'Summary';
}

function planIdOf(id: Identity, fm: Rec): string {
  if (id.number !== null) {
    const plan = asStr(fm.plan).trim();
    return plan === '' ? id.number : `${id.number}-${pad2(plan)}`;
  }
  return id.quickId ?? '';
}

function stripParenSuffix(text: string): string {
  if (!text.endsWith(')')) return text;
  const open = text.lastIndexOf('(');
  return open > 0 ? text.slice(0, open).trimEnd() : text;
}

function dropSeparators(text: string, side: 'start' | 'end'): string {
  let start = 0;
  let end = text.length;
  const isSep = (ch: string): boolean => ch === ' ' || ch === '-' || ch === '—' || ch === '–' || ch === ':';
  if (side === 'start') while (start < end && isSep(text[start])) start += 1;
  else while (end > start && isSep(text[end - 1])) end -= 1;
  return text.slice(start, end);
}

/** The H1 minus its "Phase N Plan M:" / "Quick Task <id>:" / "Quick <id>:" / "<id>:" prefix and its
 * "Summary" / "— Summary" / "Summary (…)" suffix. Null when nothing is left. */
export function titleOf(h1: string | null): string | null {
  if (h1 === null) return null;
  let text = h1.trim();
  const prefix = /^(?:(?:Phase\s{1,4}[\w.-]{1,40}\s{1,4}Plan\s{1,4}[\w.-]{1,10}|Quick\s{1,4}Task\s{1,4}[\w-]{1,40}|\d{6}-[0-9a-z]{3})\s{0,4}(?::|[\u2014\u2013-])|Quick\s{1,4}[\w-]{1,40}\s{0,4}:|\d{1,3}-\d{1,3}\s{0,4}:)\s{0,4}/i.exec(text);
  if (prefix !== null) text = text.slice(prefix[0].length);
  const lead = /^(?:\d{1,3}-\d{1,3}\s{1,4})?Summary\s{0,4}[-—:]\s{0,4}/i.exec(text);
  if (lead !== null) text = text.slice(lead[0].length);
  const stripped = stripParenSuffix(text);
  if (stripped.toLowerCase().endsWith('summary')) {
    text = dropSeparators(stripped.slice(0, -7), 'end');
  }
  text = text.trim();
  return text === '' ? null : text;
}

function startedOf(text: string | null): string | null {
  if (text === null) return null;
  const match = /\d[T ](\d{2}:\d{2})/.exec(text.slice(0, 200));
  return match === null ? null : match[1];
}

function dateOf(text: string | null): string | null {
  if (text === null) return null;
  const stamp = formatStamp(text.slice(0, 120));
  const dot = stamp.indexOf(' · ');
  return dot === -1 ? stamp : stamp.slice(0, dot);
}

function typeOf(value: unknown): string | null {
  const parts = strList(value);
  if (parts.length === 0) return null;
  return parts.map(humanize).join(', ');
}

function selfCheckOf(text: string | null): { label: string; tone: SummaryTone } | null {
  if (text === null) return null;
  if (text === 'passed') return { label: 'Self-check passed', tone: SELF_CHECK_TONE.passed };
  if (text === 'failed') return { label: 'Self-check failed', tone: SELF_CHECK_TONE.failed };
  return { label: `Self-check ${text}`, tone: SELF_CHECK_TONE.other };
}

// ---------------------------------------------------------------------------
// Tasks, files, requirements
// ---------------------------------------------------------------------------

function commitCountOf(fm: Rec, taskCount: number): number {
  const actuals = rec(fm.actuals);
  const metrics = rec(fm.metrics);
  const fromActuals = actuals !== null && typeof actuals.commits === 'number' ? actuals.commits : null;
  if (fromActuals !== null && fromActuals >= 0) return fromActuals;
  for (const value of [fm.commits, metrics?.commits]) {
    if (typeof value === 'number' && value >= 0) return value;
    if (Array.isArray(value)) return value.length;
  }
  return taskCount;
}

function tasksOf(fm: Rec, summary: SafeSummary): ComposedTaskRow[] {
  if (summary.tasks.length > 0) {
    return summary.tasks.map((t, i) => ({
      n: typeof t.n === 'number' ? t.n : i + 1,
      name: typeof t.name === 'string' && t.name !== '' ? t.name : null,
      hashes: arr<string>(t.hashes).filter((h) => typeof h === 'string'),
      kinds: arr<string>(t.kinds).filter((k) => typeof k === 'string'),
    }));
  }
  const metrics = rec(fm.metrics);
  for (const value of [metrics?.commits, fm.commits]) {
    if (!Array.isArray(value)) continue;
    const hashes = value.map((h) => asStr(h).trim()).filter(isHexWord);
    if (hashes.length > 0) return hashes.map((h, i) => ({ n: i + 1, name: null, hashes: [h], kinds: [] }));
  }
  return [];
}

function pathsOf(value: unknown): string[] {
  return listOf(value)
    .map((entry) => {
      const direct = asStr(entry);
      if (direct !== '') return direct.trim();
      return maybeString(rec(entry)?.path) ?? '';
    })
    .filter((p) => p !== '');
}

function filesOf(fm: Rec, notes: { path: string; note: string }[]): ComposedSummaryModals['files'] {
  const keyFiles = rec(fm['key-files']);
  const byPath = new Map<string, string>();
  for (const n of notes) if (typeof n.path === 'string' && typeof n.note === 'string' && !byPath.has(n.path)) byPath.set(n.path, n.note);
  const rowOf = (path: string): ComposedFileRow => ({ path, note: byPath.get(path) ?? null });
  const created = pathsOf(keyFiles?.created).map(rowOf);
  const modified = pathsOf(keyFiles?.modified).map(rowOf);
  const listed =
    created.length === 0 && modified.length === 0 ? Array.from(byPath.keys()).map(rowOf) : [];
  return { created, modified, listed };
}

function requirementsOf(fm: Rec): ComposedRequirementRef[] {
  const done = strList(fm['requirements-completed'] ?? fm.requirements);
  const out: ComposedRequirementRef[] = [];
  const seen = new Set<string>();
  const push = (ids: string[], state: RequirementState): void => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, state });
    }
  };
  push(done, 'completed');
  push(strList(fm['requirements-partial']), 'partial');
  push(strList(fm['requirements-pending']), 'pending');
  return out;
}

// ---------------------------------------------------------------------------
// Proof and Outcome
// ---------------------------------------------------------------------------

function checkState(value: unknown): CheckState {
  const text = asStr(value).trim().toLowerCase();
  if (text === 'pass' || text === 'passed') return 'pass';
  if (text === 'fail' || text === 'failed') return 'fail';
  return 'unknown';
}

function proofOf(fm: Rec): ComposedProofRow[] | null {
  const coverage = fm.coverage;
  if (!Array.isArray(coverage) || coverage.length === 0) return null;
  const used = new Set<string>();
  const rows: ComposedProofRow[] = [];
  for (const entry of coverage) {
    const c = rec(entry);
    if (c === null) continue;
    const id = textOf(c.id);
    if (id === '') continue;
    let anchor = `summary-proof-${anchorPart(id)}`;
    if (used.has(anchor)) anchor = `${anchor}-${rows.length + 1}`;
    used.add(anchor);
    rows.push({
      id,
      anchorId: anchor,
      description: textOf(c.description),
      requirement: maybeString(Array.isArray(c.requirement) ? c.requirement.map(asStr).join(', ') : c.requirement),
      human: c.human_judgment === true,
      rationale: maybeString(c.rationale),
      checks: listOf(c.verification)
        .map((v) => rec(v))
        .filter((v): v is Rec => v !== null)
        .map((v) => ({ kind: asStr(v.kind).replace(/_/g, ' '), ref: asStr(v.ref), state: checkState(v.status) })),
    });
  }
  return rows.length === 0 ? null : rows;
}

/** The sketch's token set: a backticked span (kept with its ticks) or a word of five or more
 * characters that starts with a letter, from a lower-cased string, found by one character scan. */
function tokenSet(text: string): Set<string> {
  const lower = text.toLowerCase().slice(0, 4000);
  const out = new Set<string>();
  let i = 0;
  while (i < lower.length) {
    const ch = lower[i];
    if (ch === '`') {
      const close = lower.indexOf('`', i + 1);
      if (close > i + 1) {
        out.add(lower.slice(i, close + 1));
        i = close + 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (ch >= 'a' && ch <= 'z') {
      let j = i + 1;
      while (j < lower.length) {
        const c = lower[j];
        const wordChar = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c === '_' || c === '.' || c === '-';
        if (!wordChar) break;
        j += 1;
      }
      if (j - i >= 5) out.add(lower.slice(i, j));
      i = j;
      continue;
    }
    i += 1;
  }
  return out;
}

/** The accomplishment index each deliverable shares the most tokens with (a backticked span weighs
 * 3, a word 1; the best score above 1 wins, ties to the first), or -1. */
export function matchProof(accomplishments: { head: string; rest: string }[], proof: ComposedProofRow[]): number[] {
  const accTokens = accomplishments.map((a) => tokenSet(`${a.head} ${a.rest}`));
  return proof.map((row) => {
    const wanted = tokenSet(row.description);
    let best = -1;
    let score = 1;
    accTokens.forEach((tokens, index) => {
      let s = 0;
      wanted.forEach((token) => {
        if (tokens.has(token)) s += token.startsWith('`') ? 3 : 1;
      });
      if (s > score) {
        score = s;
        best = index;
      }
    });
    return best;
  });
}

function pillState(row: ComposedProofRow): CheckState {
  return row.checks.every((c) => c.state === 'pass') ? 'pass' : 'unknown';
}

function outcomeOf(
  accomplishments: SummaryAccomplishment[],
  proof: ComposedProofRow[] | null,
  fixed: number,
): ComposedOutcome | null {
  if (accomplishments.length === 0) return null;
  const rows: ComposedOutlineRow[] = accomplishments.map((a, i) => {
    const head = typeof a.head === 'string' ? a.head : '';
    const rest = typeof a.rest === 'string' ? a.rest : '';
    return { n: pad2(String(i + 1)), head: capFirst(head), rest, long: rest.length > 220, pills: [] };
  });
  if (proof !== null) {
    const assigned = matchProof(accomplishments.map((a) => ({ head: asStr(a.head), rest: asStr(a.rest) })), proof);
    proof.forEach((row, index) => {
      const target = assigned[index];
      if (target < 0) return;
      rows[target].pills.push({
        id: row.id,
        state: pillState(row),
        human: row.human,
        title: row.description,
        anchorId: row.anchorId,
      });
    });
  }
  return {
    shipped: rows.length,
    proven: proof === null ? 0 : proof.length,
    human: proof === null ? 0 : proof.filter((p) => p.human).length,
    fixed,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Run timeline and deviations
// ---------------------------------------------------------------------------

function ruleKicker(dev: SummaryDeviation): string {
  const rule = typeof dev.rule === 'number' ? dev.rule : null;
  const type = typeof dev.type === 'string' ? dev.type : '';
  if (rule === null) return type === '' ? 'Deviation' : humanize(type);
  const label = RULE_LABEL[rule] ?? (type === '' ? null : type);
  return label === null ? `Rule ${rule}` : `Rule ${rule} · ${label}`;
}

/** The first "Task N" in `text`. */
function taskNumberIn(text: string | null): number | null {
  if (text === null) return null;
  const match = /\bTask\s{0,3}(\d{1,4})\b/i.exec(text.slice(0, 300));
  return match === null ? null : Number(match[1]);
}

function isHumanTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('pending') ||
    lower.includes('human') ||
    lower.includes('awaiting') ||
    lower.includes('not yet') ||
    lower.includes('checkpoint')
  );
}

function cardOf(dev: SummaryDeviation, index: number): ComposedDeviationCard {
  const fields: { label: string; value: string }[] = [];
  if (dev.found) fields.push({ label: 'Found', value: dev.found });
  if (dev.issue) fields.push({ label: 'Problem', value: dev.issue });
  if (dev.fix) fields.push({ label: 'Fix', value: dev.fix });
  if (dev.files) fields.push({ label: 'Files', value: dev.files });
  for (const other of arr<{ label: string; value: string }>(dev.others)) {
    if (typeof other.label === 'string' && typeof other.value === 'string' && other.value !== '') {
      fields.push({ label: other.label, value: other.value });
    }
  }
  return {
    anchorId: `summary-dev-${index}`,
    rule: typeof dev.rule === 'number' ? dev.rule : null,
    kicker: ruleKicker(dev),
    title: typeof dev.title === 'string' ? dev.title : '',
    commit: typeof dev.commit === 'string' && dev.commit !== '' ? dev.commit : null,
    fields,
    text: typeof dev.text === 'string' && dev.text !== '' ? dev.text : null,
  };
}

function runOf(
  summary: SafeSummary,
  tasks: ComposedTaskRow[],
  commitCount: number,
  head: { started: string | null; completed: string | null; duration: string | null },
  waits: ComposedLooseSection[],
): ComposedRun {
  const items = summary.deviations?.items ?? [];
  const cards = items.map(cardOf);
  const stopDev = (index: number, dev: SummaryDeviation, withFixed: boolean): ComposedStopDeviation => ({
    index,
    rule: typeof dev.rule === 'number' ? dev.rule : null,
    kicker: withFixed ? `${ruleKicker(dev)} · fixed on the way` : ruleKicker(dev),
    title: typeof dev.title === 'string' ? dev.title : '',
    anchorId: `summary-dev-${index}`,
  });
  const byTask = new Map<number, number[]>();
  const loose: number[] = [];
  const taskNumbers = new Set(tasks.map((t) => t.n));
  items.forEach((dev, index) => {
    if (tasks.length === 0) return;
    const n = taskNumberIn(typeof dev.found === 'string' ? dev.found : null);
    if (n !== null && taskNumbers.has(n)) byTask.set(n, [...(byTask.get(n) ?? []), index]);
    else loose.push(index);
  });

  const stops: ComposedStop[] = [];
  stops.push({
    kind: 'start',
    label: head.started === null ? 'Started' : `Started · ${head.started}`,
    n: null,
    hashes: [],
    name: null,
    deviations: [],
  });
  if (tasks.length > 0) {
    for (const task of tasks) {
      const kinds = task.kinds.length > 0 ? ` · ${task.kinds.join(', ')}` : '';
      stops.push({
        kind: 'task',
        label: `Task ${task.n}${kinds}`,
        n: task.n,
        hashes: task.hashes,
        name: task.name,
        deviations: (byTask.get(task.n) ?? []).map((i) => stopDev(i, items[i], true)),
      });
    }
  } else {
    stops.push({
      kind: 'commits',
      label: plural(commitCount, 'commit', 'commits'),
      n: null,
      hashes: [],
      name: null,
      deviations: items.map((dev, i) => stopDev(i, dev, false)),
    });
  }
  for (const wait of waits) {
    stops.push({ kind: 'wait', label: 'Waiting on a human', n: null, hashes: [], name: wait.title, deviations: [] });
  }
  const endBits: string[] = [head.completed === null ? 'Not completed yet' : `Completed · ${head.completed}`];
  if (head.duration !== null) endBits.push(head.duration);
  stops.push({
    kind: 'end',
    label: endBits.join(' · '),
    n: null,
    hashes: [],
    name: null,
    deviations: loose.map((i) => stopDev(i, items[i], false)),
  });

  const devs = summary.deviations;
  const went = devs !== null && devs.none && items.length === 0 ? { note: devs.note === null ? null : capFirst(devs.note) } : null;
  const taskCount = tasks.length > 0 ? tasks.length : commitCount;
  const aside = `${plural(taskCount, tasks.length > 0 ? 'task' : 'commit', tasks.length > 0 ? 'tasks' : 'commits')} · ${items.length} fixed on the way`;
  return {
    aside,
    stops,
    cards,
    extras: devs?.extras ?? [],
    prose: devs?.prose ?? [],
    went,
  };
}

// ---------------------------------------------------------------------------
// Lineage, source-only
// ---------------------------------------------------------------------------

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function lineageOf(fm: Rec, planId: string): ComposedLineage | null {
  const graph = rec(fm['dependency-graph']);
  const requires: ComposedLineageRequire[] = listOf(fm.requires ?? graph?.requires)
    .map((entry): ComposedLineageRequire | null => {
      const direct = asStr(entry);
      const r = rec(entry);
      const key = direct !== '' ? direct.trim() : textOf(r?.phase ?? r?.plan ?? '');
      if (key === '') return null;
      const digits = digitsPrefix(key);
      const label = digits !== '' && key[digits.length] === '-' ? `Phase ${stripLeadingZeros(digits)}` : clip(key, 60);
      return { key, label, provides: maybeString(r?.provides) };
    })
    .filter((r): r is ComposedLineageRequire => r !== null);
  const affects: ComposedLineageAffect[] = strList(fm.affects ?? graph?.affects).map((text) => ({ text, short: clip(text, 60) }));
  if (requires.length === 0 && affects.length === 0) return null;
  return { planId, requires, affects };
}

function headingIdOf(headings: ViewInput['headings'], predicate: (normalized: string) => boolean): string | null {
  for (const heading of headings ?? []) {
    if (predicate(normalizeHeading(heading.text))) return heading.id;
  }
  return null;
}

function sourceOnlyOf(fm: Rec, summary: SafeSummary, headings: ViewInput['headings']): ComposedSourceOnly[] {
  const graph = rec(fm['dependency-graph']);
  const out: ComposedSourceOnly[] = [];
  if (strList(fm.tags).length > 0) out.push({ label: 'Tags', targetId: null });
  if (strList(fm.provides).length > 0 || strList(graph?.provides).length > 0) out.push({ label: 'Provides', targetId: null });
  if (rec(fm.actuals) !== null || rec(fm.metrics) !== null) out.push({ label: 'Actuals', targetId: null });
  if (summary.sections.some((s) => normalizeHeading(asStr(s.heading)) === 'performance')) {
    out.push({ label: 'Performance', targetId: headingIdOf(headings, (t) => t === 'performance') });
  }
  if (summary.sections.some((s) => normalizeHeading(asStr(s.heading)).startsWith('self-check'))) {
    out.push({ label: 'Self-check', targetId: headingIdOf(headings, (t) => t.startsWith('self-check')) });
  }
  if (Object.keys(fm).length > 0) out.push({ label: 'Frontmatter', targetId: null });
  return out;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** The composed SUMMARY page, or null when the payload carries no projection or nothing beyond the
 * head would compose. */
export function composeSummaryRun(input: ViewInput): ComposedSummaryRun | null {
  const structured = rec(input.structured);
  if (structured === null) return null;
  const summary = readSummary(structured);
  if (summary === null) return null;
  const fm = rec(input.frontmatter) ?? {};
  const metrics = rec(fm.metrics);

  const identity = identityOf(fm, summary);
  const planId = planIdOf(identity, fm);

  const factStatus = summary.preamble.find((f) => typeof f.key === 'string' && f.key.toLowerCase() === 'status');
  const statusText = maybeString(fm.status) ?? (factStatus ? maybeString(factStatus.value) : null);
  const completedRaw = maybeString(fm.completed) ?? maybeString(metrics?.completed) ?? summary.performance.completed;
  const completed = dateOf(completedRaw);
  const duration = maybeString(fm.duration) ?? maybeString(metrics?.duration) ?? summary.performance.duration;
  const started = startedOf(summary.performance.started);

  const tasks = tasksOf(fm, summary);
  const commitCount = commitCountOf(fm, tasks.length);
  const files = filesOf(fm, summary.fileNotes);
  const requirements = requirementsOf(fm);

  const proof = proofOf(fm);
  const fixed = summary.deviations?.items.length ?? 0;
  const outcome = outcomeOf(summary.accomplishments, proof, fixed);

  const waits: ComposedLooseSection[] = [];
  const also: ComposedLooseSection[] = [];
  summary.others.forEach((section, index) => {
    if (typeof section.title !== 'string' || section.none === true) return;
    const entry = { key: `summary-also-${index}`, title: section.title, blocks: arr<Block>(section.blocks) };
    (isHumanTitle(section.title) ? waits : also).push(entry);
  });

  const run = runOf(summary, tasks, commitCount, { started, completed, duration }, waits);

  const decisionItems = strList(fm['key-decisions'] ?? fm.decisions);
  const decisions: ComposedDecisions = {
    items: decisionItems,
    body: decisionItems.length === 0 ? summary.decisionsBody : null,
  };

  const stack = rec(fm['tech-stack']);
  const patternItems: ComposedPatternItem[] = [
    ...strList(stack?.patterns).map((text): ComposedPatternItem => ({ kind: 'approach', label: PATTERN_LABEL.approach, tone: PATTERN_TONE.approach, text })),
    ...strList(fm['patterns-established']).map((text): ComposedPatternItem => ({ kind: 'convention', label: PATTERN_LABEL.convention, tone: PATTERN_TONE.convention, text })),
  ];
  const added = strList(stack?.added);
  const patterns: ComposedPatterns | null = patternItems.length === 0 && added.length === 0 ? null : { added, items: patternItems };

  const hasBody =
    outcome !== null ||
    tasks.length > 0 ||
    commitCount > 0 ||
    proof !== null ||
    fixed > 0 ||
    decisionItems.length > 0 ||
    decisions.body !== null ||
    also.length > 0 ||
    waits.length > 0;
  if (!hasBody) return null;

  const quick = identity.number === null && identity.quickId !== null;
  return {
    quick,
    head: {
      eyebrow: eyebrowOf(identity),
      title: titleOf(summary.h1),
      planId,
      completed,
      oneLiner: summary.oneLiner,
      status: statusOf(statusText),
      duration,
      started,
      type: typeOf(fm.subsystem),
      selfCheck: selfCheckOf(summary.selfCheck),
    },
    triggers: {
      tasks: { label: tasks.length > 0 ? 'Tasks' : 'Commits', count: tasks.length > 0 ? tasks.length : commitCount },
      files: { count: files.created.length + files.modified.length + files.listed.length },
      requirements: {
        done: requirements.filter((r) => r.state === 'completed').length,
        pending: requirements.filter((r) => r.state !== 'completed').length,
      },
    },
    setup: summary.userSetup,
    modals: {
      tasks: { rows: tasks, commitCount, unnamed: tasks.length > 0 && tasks.every((t) => t.name === null) },
      files,
      requirements,
    },
    outcome,
    run,
    proof,
    decisions,
    patterns,
    also,
    waits,
    lineage: lineageOf(fm, planId),
    next: summary.next === null ? null : summary.next,
    sourceOnly: sourceOnlyOf(fm, summary, input.headings),
  };
}

// ---------------------------------------------------------------------------
// Lookups over the presentation the page already holds
// ---------------------------------------------------------------------------

/** The slice of `ProjectPresentation` the lookups read — a structural subset, so a literal works
 * in a test and the real presentation satisfies it. */
export interface SummaryPresentation {
  artifacts: { path: string; structured: Record<string, unknown> }[];
  milestones: { phases: { identity: PhaseIdentity }[] }[];
}

export interface RequirementPreview {
  id: string;
  found: boolean;
  /** The requirement's text, or null when not found. */
  text: string | null;
  /** The not-found sentence, or null when found. */
  notFound: string | null;
  status: string;
  /** The REQUIREMENTS file path, or "—". */
  location: string;
  phase: string;
  /** `buildArtifactUrl(null, path)`, or null when not found. */
  url: string | null;
}

const ROOT_REQUIREMENTS = '.planning/REQUIREMENTS.md';

/** The version in `.planning/milestones/vX.Y-phases/...` or `.../vX.Y-quick/...`, or null. */
function milestoneOf(path: string): string | null {
  const match = /(?:^|\/)milestones\/(v\d{1,3}\.\d{1,3}(?:\.\d{1,3})?)-(?:phases|quick)\//.exec(path.slice(0, 400));
  return match === null ? null : match[1];
}

function versionOf(path: string): number[] | null {
  const match = /milestones\/v(\d{1,3})\.(\d{1,3})(?:\.(\d{1,3}))?-REQUIREMENTS\.md$/.exec(path.slice(0, 400));
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

function newestFirst(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return b[i] - a[i];
  return 0;
}

interface RequirementsFile {
  path: string;
  items: { id: string; text: string; checked: boolean | null }[];
  traceability: { requirementId: string; phase: string; status: string }[];
}

function requirementsFiles(presentation: SummaryPresentation, summaryPath: string): RequirementsFile[] {
  const byPath = new Map<string, RequirementsFile>();
  const archives: { file: RequirementsFile; version: number[] }[] = [];
  for (const artifact of presentation.artifacts) {
    const items = arr<{ id: string; text: string; checked: boolean | null }>(artifact.structured?.items);
    if (items.length === 0 && !Array.isArray(artifact.structured?.items)) continue;
    const version = versionOf(artifact.path);
    if (artifact.path !== ROOT_REQUIREMENTS && version === null) continue;
    const file: RequirementsFile = {
      path: artifact.path,
      items,
      traceability: arr<{ requirementId: string; phase: string; status: string }>(artifact.structured.traceability),
    };
    byPath.set(artifact.path, file);
    if (version !== null) archives.push({ file, version });
  }
  const ordered: RequirementsFile[] = [];
  const own = milestoneOf(summaryPath);
  const add = (file: RequirementsFile | undefined): void => {
    if (file !== undefined && !ordered.includes(file)) ordered.push(file);
  };
  if (own !== null) add(byPath.get(`.planning/milestones/${own}-REQUIREMENTS.md`));
  add(byPath.get(ROOT_REQUIREMENTS));
  archives.sort((a, b) => newestFirst(a.version, b.version));
  for (const archive of archives) add(archive.file);
  return ordered;
}

/** Resolves each requirement ID to its text and facts. The summary's own milestone file comes first,
 * then the root file, then the other archives newest first; an ID found nowhere reads as the
 * summary's own record of it, with no link. */
export function requirementPreviews(
  presentation: SummaryPresentation | null | undefined,
  summaryPath: string,
  refs: ComposedRequirementRef[],
  quick: boolean,
): Record<string, RequirementPreview> {
  const files = presentation ? requirementsFiles(presentation, summaryPath) : [];
  const out: Record<string, RequirementPreview> = {};
  for (const ref of refs) {
    let preview: RequirementPreview | null = null;
    for (const file of files) {
      const item = file.items.find((i) => i.id === ref.id);
      if (item === undefined) continue;
      const row = file.traceability.find((r) => r.requirementId === ref.id);
      const checkbox = item.checked === true ? 'Complete' : item.checked === false ? 'Pending' : 'Not recorded';
      preview = {
        id: ref.id,
        found: true,
        text: typeof item.text === 'string' ? item.text : '',
        notFound: null,
        status: row && row.status !== '' ? row.status : checkbox,
        location: file.path,
        phase: row && row.phase !== '' ? row.phase : '—',
        url: buildArtifactUrl(null, file.path),
      };
      break;
    }
    if (preview === null) {
      const word = ref.state === 'completed' ? 'Complete' : ref.state === 'partial' ? 'Partial' : 'Pending';
      preview = {
        id: ref.id,
        found: false,
        text: null,
        notFound: quick ? "Not in this project's requirements files. A quick-task ID." : "Not in this project's requirements files.",
        status: `${word} in this summary`,
        location: '—',
        phase: '—',
        url: null,
      };
    }
    out[ref.id] = preview;
  }
  return out;
}

/** Resolves each `requires` phase string ("02-situational-awareness-artifact-reading") to its phase
 * page url — matched by number (zeros stripped) and slug, the summary's own milestone preferred —
 * or null when no phase resolves. */
export function lineageLinks(
  presentation: SummaryPresentation | null | undefined,
  summaryPath: string,
  requires: { key: string }[],
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  const own = milestoneOf(summaryPath);
  for (const entry of requires) {
    out[entry.key] = null;
    if (!presentation) continue;
    const digits = digitsPrefix(entry.key);
    if (digits === '' || entry.key[digits.length] !== '-') continue;
    const number = stripLeadingZeros(digits);
    const slug = entry.key.slice(digits.length + 1);
    let best: PhaseIdentity | null = null;
    for (const milestone of presentation.milestones) {
      for (const phase of milestone.phases) {
        const identity = phase.identity;
        if (stripLeadingZeros(digitsPrefix(asStr(identity.number))) !== number || identity.slug !== slug) continue;
        if (best === null || (own !== null && identity.milestoneVersion === own)) best = identity;
      }
    }
    if (best !== null) out[entry.key] = buildPhaseUrl(best);
  }
  return out;
}
