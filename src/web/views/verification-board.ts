// The VERIFICATION page composer (quick-261017-18a, sketch 021 winner E): a pure `ViewInput` ->
// `ComposedVerificationBoard` merge of the frontmatter and `structured.verification` (built by
// `src/planning-repo/handlers/verification-report.ts`, with `pathPhase` and `quickId` added by the
// handler). It decides the console rail (eyebrow, title, status, verified stamp, the big-number frame,
// the stat rows and the human-check slips), the phase goal, the Gap -> fix ledger (every gap tied to
// the plan tasks that close it, with the scope meter and the Fixed-by tickets), the Truth board and
// the Requirement board with their inspectors, the numbered human steps, the anti-patterns, the
// "Also in this report" chips and the verifier footer. No DOM, no rendering -
// `verification-board-components.tsx` is the only consumer. Returns `null` only when the projection
// is missing; every other junk value degrades to an omitted part (T-18a-04). Dates are formatted by
// hand in UTC (via `formatStamp`) so Node and the browser agree.
// T-18a-03: the task -> gap and gap -> truth overlap passes take token sets from text capped at
// 4000 characters, over lists the extractor already capped (200 gaps, 50 plans of 100 tasks, 500
// truths). No RegExp is ever built from document text, and no url is built from it either (T-18a-06):
// the only navigation targets are heading ids taken from `input.headings`, or null.
import type {
  VerificationAntiPattern,
  VerificationFixPlan,
  VerificationHumanCheck,
  VerificationMetadata,
  VerificationRequirement,
  VerificationRequirementState,
  VerificationSection,
  VerificationSeverity,
  VerificationSpotCheck,
  VerificationTemplateGap,
  VerificationTruth,
  VerificationTruthState,
} from '../../planning-repo/handlers/verification-report.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tones - the only place a status, a state or a severity becomes a tone
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the page draws from - never the parse-degradation tones
 * (`destructive` / `warning`), which stay reserved for the artifact-parse badge alone. */
export type VerificationTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

export const STATUS_LABEL: Record<string, string> = {
  passed: 'Passed',
  gaps_found: 'Gaps found',
  human_needed: 'Human needed',
};

export const STATUS_TONE: Record<string, VerificationTone> = {
  passed: 'complete',
  gaps_found: 'missing',
  human_needed: 'in-flight',
};

export const TRUTH_STATE_LABEL: Record<VerificationTruthState, string> = {
  verified: 'Verified',
  coincidental: 'Holds incidentally',
  override: 'Accepted by override',
  mixed: 'Partly verified',
  unverified: 'Built, behaviour unchecked',
  uncertain: 'Could not check',
  failed: 'Failed',
};

export const TRUTH_TONE: Record<VerificationTruthState, VerificationTone> = {
  verified: 'complete',
  coincidental: 'complete',
  override: 'complete',
  mixed: 'in-flight',
  unverified: 'in-flight',
  uncertain: 'in-flight',
  failed: 'missing',
};

export const REQUIREMENT_LABEL: Record<VerificationRequirementState, string> = {
  blocked: 'Blocked',
  human: 'Needs a person',
  partial: 'With a caveat',
  satisfied: 'Satisfied',
};

export const REQUIREMENT_TONE: Record<VerificationRequirementState, VerificationTone> = {
  blocked: 'missing',
  human: 'in-flight',
  partial: 'complete',
  satisfied: 'complete',
};

export const SEVERITY_LABEL: Record<VerificationSeverity, string> = {
  blocker: 'Blocker',
  warning: 'Warning',
  info: 'Info',
  clear: 'Clear',
};

export const SEVERITY_TONE: Record<VerificationSeverity, VerificationTone> = {
  blocker: 'missing',
  warning: 'in-flight',
  info: 'quiet',
  clear: 'quiet',
};

/** A human-check pointer and a neutral chip read in these tones whatever the report says. */
export const HUMAN_TONE: VerificationTone = 'in-flight';
export const QUIET_TONE: VerificationTone = 'quiet';

/** The filled segments of the three-segment scope meter; 0 means the scope is not stated. */
export const SCOPE_SEGMENTS: Record<string, number> = { small: 1, medium: 2, large: 3 };

const TRUTH_HOLDS: ReadonlySet<VerificationTruthState> = new Set(['verified', 'coincidental', 'override']);
const TRUTH_OPEN: ReadonlySet<VerificationTruthState> = new Set(['unverified', 'uncertain', 'mixed']);

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface ComposedStat {
  key: string;
  label: string;
  value: string;
  tone: VerificationTone | null;
  /** A section id to jump to, 'spot-checks' for the modal, or null for a plain row. */
  target: string | null;
}

export interface ComposedBig {
  value: string;
  label: string;
  sub: string;
  tone: VerificationTone;
}

export interface ComposedSlip {
  n: number;
  title: string;
  preview: string;
  anchorId: string;
}

export interface ComposedRail {
  eyebrow: string;
  title: string | null;
  status: { label: string; tone: VerificationTone } | null;
  verified: string | null;
  big: ComposedBig | null;
  stats: ComposedStat[];
  slips: ComposedSlip[];
  slipsLabel: string;
}

export interface ComposedScope {
  label: string;
  /** 0 when the scope is not stated, else 1-3. */
  filled: number;
}

export interface ComposedChip {
  prefix: string;
  text: string;
}

export type ComposedWhy =
  | { kind: 'text'; text: string }
  | { kind: 'truth'; truth: string; where: { file: string; issue: string }[] };

export type ComposedFix = { kind: 'text'; text: string } | { kind: 'list'; items: string[] };

export interface ComposedGapColumns {
  missingLabel: string;
  missing: string | null;
  whyLabel: string;
  why: ComposedWhy | null;
  fixLabel: string;
  fix: ComposedFix | null;
}

export interface ComposedTicketTask {
  /** 1-based, as written in the plan. */
  n: number;
  text: string;
  verify: boolean;
  /** True when this task closes the gap. */
  hit: boolean;
}

export interface ComposedTicket {
  planIndex: number;
  file: string | null;
  name: string;
  scope: ComposedScope;
  tasks: ComposedTicketTask[];
  hitCount: number;
}

export interface ComposedGapRow {
  key: string;
  kind: 'critical' | 'noncritical';
  number: string;
  name: string;
  /** The one-line "missing" preview, hidden while the row is open. */
  preview: string | null;
  chips: ComposedChip[];
  scope: ComposedScope | null;
  columns: ComposedGapColumns;
  tickets: ComposedTicket[];
  /** The row's fix state: no plan exists, plans exist but none names it, or tickets follow. */
  fixState: 'no-plan' | 'unnamed' | 'tickets';
  truthIndex: number | null;
  anchorId: string;
}

export interface ComposedLedger {
  aside: string;
  rows: ComposedGapRow[];
  unmapped: { text: string; plan: string }[];
  empty: string | null;
  sourceId: string | null;
  fixShape: 'plans' | 'prose' | null;
}

export interface ComposedGapLink {
  key: string;
  label: string;
  tone: VerificationTone;
}

export interface ComposedTruthCell {
  index: number;
  n: string;
  state: VerificationTruthState;
  label: string;
  title: string;
}

export interface ComposedTruthRow {
  key: 'failed' | 'open' | 'ok';
  label: string;
  count: number;
  /** How many of the four meter segments are filled. */
  filled: number;
  /** One list of cells per group, in the group order of `groups`. */
  cells: ComposedTruthCell[][];
}

export interface ComposedTruthDetail {
  index: number;
  n: string;
  group: string;
  text: string;
  state: VerificationTruthState;
  stateLabel: string;
  tone: VerificationTone;
  evidence: string | null;
  /** The status cell as written, when it is not one of the standard forms. */
  raw: string | null;
  behavior: { test: string; expected: string } | null;
  coincidental: { reason: string; harden: string } | null;
  gapLinks: ComposedGapLink[];
  humanLink: boolean;
}

export interface ComposedTruthBoard {
  aside: string;
  groups: { name: string; label: string }[];
  rows: ComposedTruthRow[];
  details: ComposedTruthDetail[];
}

export interface ComposedRequirementSquare {
  id: string;
  state: VerificationRequirementState;
}

export interface ComposedRequirementRow {
  state: VerificationRequirementState;
  label: string;
  count: number;
  squares: ComposedRequirementSquare[];
}

export interface ComposedRequirementDetail {
  id: string;
  state: VerificationRequirementState;
  label: string;
  tone: VerificationTone;
  description: string | null;
  plans: string[];
  noteLabel: string;
  note: string | null;
}

export interface ComposedRequirementBoard {
  aside: string;
  rows: ComposedRequirementRow[];
  details: ComposedRequirementDetail[];
}

export interface ComposedHumanStep {
  n: number;
  title: string;
  test: string | null;
  expected: string | null;
  why: string | null;
  anchorId: string;
}

export interface ComposedHuman {
  heading: string;
  aside: string;
  resolved: string | null;
  steps: ComposedHumanStep[];
  sourceId: string | null;
}

export interface ComposedAntiRow {
  severity: VerificationSeverity;
  where: string;
  pattern: string;
  impact: string;
}

export interface ComposedAnti {
  summary: string;
  blockers: ComposedAntiRow[];
  rows: ComposedAntiRow[];
  note: string | null;
  empty: string | null;
  sourceId: string | null;
}

export interface ComposedAlso {
  label: string;
  targetId: string | null;
}

export interface ComposedSpotRow {
  state: 'verified' | 'failed' | 'uncertain';
  behavior: string;
  result: string;
  command: string;
  note: string | null;
}

export interface ComposedSpotChecks {
  rows: ComposedSpotRow[];
  sourceId: string | null;
}

export interface ComposedVerificationBoard {
  rail: ComposedRail;
  goal: string | null;
  ledger: ComposedLedger;
  truths: ComposedTruthBoard | null;
  requirements: ComposedRequirementBoard | null;
  human: ComposedHuman | null;
  anti: ComposedAnti | null;
  also: ComposedAlso[];
  footer: { verifier: string | null; source: string | null } | null;
  spotChecks: ComposedSpotChecks | null;
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

function clean(value: unknown): string {
  return asStr(value).replace(/\s+/g, ' ').trim();
}

function maybe(value: unknown): string | null {
  const text = clean(value);
  return text === '' ? null : text;
}

function listOf(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function humanize(text: string): string {
  const spaced = text.replace(/[-_]/g, ' ').trim();
  return spaced === '' ? spaced : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The sketch's `cap`: the first lower-case letter, after any leading non-letter, upper-cased. */
function capFirst(text: string): string {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= 'a' && ch <= 'z') return text.slice(0, i) + ch.toUpperCase() + text.slice(i + 1);
    if ((ch >= 'A' && ch <= 'Z') || ch === '`' || ch === '*') return text;
  }
  return text;
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

/** The first `n/m` in `text`, or null. */
function scoreOf(text: string): { n: number; m: number } | null {
  let from = 0;
  for (let guard = 0; guard < 20; guard++) {
    const slash = text.indexOf('/', from);
    if (slash === -1) return null;
    let a = slash;
    while (a > 0 && text[a - 1] === ' ') a -= 1;
    let start = a;
    while (start > 0 && isDigit(text[start - 1])) start -= 1;
    let b = slash + 1;
    while (text[b] === ' ') b += 1;
    let end = b;
    while (isDigit(text[end])) end += 1;
    if (start < a && end > b) return { n: Number(text.slice(start, a)), m: Number(text.slice(b, end)) };
    from = slash + 1;
  }
  return null;
}

/** "06" -> "6", "02.1" -> "2.1". */
function stripZeros(text: string): string {
  let i = 0;
  while (i < text.length - 1 && text[i] === '0' && isDigit(text[i + 1])) i += 1;
  return text.slice(i);
}

/** The phase number out of an `NN-slug` string, or null. */
function phaseNumberOf(phase: string): string | null {
  let i = 0;
  while (i < phase.length && (isDigit(phase[i]) || (phase[i] === '.' && isDigit(phase[i + 1]) && i > 0))) i += 1;
  return i === 0 ? null : stripZeros(phase.slice(0, i));
}

/** "01-identity-slice" -> "Identity slice". */
function slugTitle(phase: string): string | null {
  let i = 0;
  while (i < phase.length && (isDigit(phase[i]) || phase[i] === '.')) i += 1;
  if (i === 0 || phase[i] !== '-') return null;
  const rest = phase.slice(i + 1);
  return rest === '' ? null : humanize(rest);
}

/** The first sentence: up to a period (any closing emphasis after it) followed by a space or the end. */
export function firstSentence(text: string): string {
  const limit = Math.min(text.length, 1200);
  for (let i = 0; i < limit; i++) {
    if (text[i] !== '.') continue;
    let j = i + 1;
    while (text[j] === '*' || text[j] === '_') j += 1;
    if (j >= text.length || text[j] === ' ') return text.slice(0, j);
  }
  return text.length > 400 ? text.slice(0, 400) : text;
}

// ---------------------------------------------------------------------------
// Title and eyebrow
// ---------------------------------------------------------------------------

/** The H1 without its "Phase N:" / "Quick <id>:" lead and its "Verification Report" tail. */
export function cleanTitle(h1: string): string | null {
  let text = h1.slice(0, 600).trim();
  const lead =
    /^(?:phase\s+[\d.]+|quick(?:\s+task)?\s+\S+|quick-\S+|\d{6}-[a-z0-9]{3})\s*(?:verification)?\s*:\s*/i.exec(text);
  if (lead) text = text.slice(lead[0].length);
  for (let pass = 0; pass < 3; pass++) {
    const before = text;
    text = text.replace(/\s*\((?:re-)?verification\)\s*$/i, '');
    text = text.replace(/\s*[-–—]\s*verification report\s*$/i, '');
    text = text.replace(/\s+verification report\s*$/i, '');
    if (text === before) break;
  }
  text = text.trim();
  return text === '' ? null : text;
}

function eyebrowOf(fm: Rec, verification: Rec): string {
  const phase = clean(fm.phase);
  const task = clean(fm.task);
  const quickOf = (value: string): string | null => (value.startsWith('quick-') ? value.slice(6) : null);
  const number = phase !== '' ? phaseNumberOf(phase) : null;
  if (number !== null) return `Verification · Phase ${number}`;
  const quick = quickOf(phase) ?? quickOf(task);
  if (quick !== null && quick !== '') return `Quick verification · ${quick}`;
  const pathPhase = rec(verification.pathPhase);
  const pathNumber = pathPhase !== null ? clean(pathPhase.number) : '';
  if (pathNumber !== '') return `Verification · Phase ${stripZeros(pathNumber)}`;
  const quickId = clean(verification.quickId);
  if (quickId !== '') return `Quick verification · ${quickId}`;
  return 'Verification';
}

// ---------------------------------------------------------------------------
// The structured payload, read safely
// ---------------------------------------------------------------------------

interface SafeReport {
  h1: string | null;
  goal: string | null;
  reVerification: string | null;
  verifier: string | null;
  truths: VerificationTruth[];
  requirements: VerificationRequirement[];
  antiPatterns: VerificationAntiPattern[];
  antiNote: string | null;
  humanChecks: VerificationHumanCheck[];
  humanTitles: string[];
  critical: VerificationTemplateGap[];
  nonCritical: VerificationTemplateGap[];
  gapProse: string | null;
  fixPlans: VerificationFixPlan[];
  fixShape: 'plans' | 'prose' | null;
  metadata: VerificationMetadata;
  spotChecks: VerificationSpotCheck[];
  anchors: Record<string, string | null>;
  sections: VerificationSection[];
}

const TRUTH_STATES = new Set<string>(['verified', 'coincidental', 'override', 'mixed', 'unverified', 'uncertain', 'failed']);
const REQUIREMENT_STATES = new Set<string>(['satisfied', 'partial', 'human', 'blocked']);
const SEVERITIES = new Set<string>(['clear', 'blocker', 'warning', 'info']);

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readReport(raw: Rec): SafeReport {
  const meta = rec(raw.metadata);
  const gaps = rec(raw.gaps);
  const anchors: Record<string, string | null> = {};
  const rawAnchors = rec(raw.anchors);
  for (const key of ['truths', 'requirements', 'anti', 'human', 'gaps', 'fixPlans', 'spot']) {
    anchors[key] = rawAnchors === null ? null : maybe(rawAnchors[key]);
  }
  const truths: VerificationTruth[] = [];
  for (const item of arr<unknown>(raw.truths)) {
    const r = rec(item);
    if (r === null) continue;
    const state = asStr(r.status);
    truths.push({
      n: clean(r.n),
      group: clean(r.group) || 'Observable truths',
      text: clean(r.text),
      statusRaw: clean(r.statusRaw),
      status: TRUTH_STATES.has(state) ? (state as VerificationTruthState) : 'uncertain',
      evidence: clean(r.evidence),
    });
  }
  const requirements: VerificationRequirement[] = [];
  for (const item of arr<unknown>(raw.requirements)) {
    const r = rec(item);
    if (r === null || clean(r.id) === '') continue;
    const state = asStr(r.status);
    requirements.push({
      id: clean(r.id),
      description: clean(r.description),
      plans: arr<unknown>(r.plans).map(clean).filter((p) => p !== ''),
      statusRaw: clean(r.statusRaw),
      status: REQUIREMENT_STATES.has(state) ? (state as VerificationRequirementState) : 'human',
      note: clean(r.note),
    });
  }
  const antiPatterns: VerificationAntiPattern[] = [];
  for (const item of arr<unknown>(raw.antiPatterns)) {
    const r = rec(item);
    if (r === null) continue;
    const severity = asStr(r.severity);
    antiPatterns.push({
      file: clean(r.file),
      line: clean(r.line),
      pattern: clean(r.pattern),
      severityRaw: clean(r.severityRaw),
      severity: SEVERITIES.has(severity) ? (severity as VerificationSeverity) : 'info',
      impact: clean(r.impact),
    });
  }
  const humanChecks: VerificationHumanCheck[] = [];
  for (const item of arr<unknown>(raw.humanChecks)) {
    const r = rec(item);
    if (r === null) continue;
    humanChecks.push({ title: maybe(r.title), test: maybe(r.test), expected: maybe(r.expected), why: maybe(r.why) });
  }
  const readGaps = (value: unknown): VerificationTemplateGap[] => {
    const out: VerificationTemplateGap[] = [];
    for (const item of arr<unknown>(value)) {
      const r = rec(item);
      if (r === null || clean(r.name) === '') continue;
      out.push({
        name: clean(r.name),
        missing: maybe(r.missing),
        impact: maybe(r.impact),
        fix: maybe(r.fix),
        fixLabel: r.fixLabel === 'Recommendation' ? 'Recommendation' : 'Fix',
      });
    }
    return out;
  };
  const fixPlans: VerificationFixPlan[] = [];
  for (const item of arr<unknown>(raw.fixPlans)) {
    const r = rec(item);
    if (r === null) continue;
    const tasks = arr<unknown>(r.tasks)
      .map((t) => {
        const tr = rec(t);
        return tr === null ? null : { text: clean(tr.text), verify: tr.verify === true };
      })
      .filter((t): t is { text: string; verify: boolean } => t !== null && t.text !== '');
    fixPlans.push({
      file: maybe(r.file),
      name: clean(r.name),
      objective: maybe(r.objective),
      tasks,
      scope: maybe(r.scope),
    });
  }
  const spotChecks: VerificationSpotCheck[] = [];
  for (const item of arr<unknown>(raw.spotChecks)) {
    const r = rec(item);
    if (r === null) continue;
    const status = asStr(r.status);
    spotChecks.push({
      behavior: clean(r.behavior),
      command: clean(r.command),
      result: clean(r.result),
      status: status === 'fail' || status === 'skip' ? status : 'pass',
      statusRaw: clean(r.statusRaw),
    });
  }
  const sections: VerificationSection[] = [];
  for (const item of arr<unknown>(raw.sections)) {
    const r = rec(item);
    if (r === null || clean(r.heading) === '') continue;
    sections.push({
      heading: clean(r.heading),
      level: r.level === 3 ? 3 : 2,
      handled: r.handled === true,
      blank: r.blank === true,
    });
  }
  return {
    h1: maybe(raw.h1),
    goal: maybe(raw.goal),
    reVerification: maybe(raw.reVerification),
    verifier: maybe(raw.verifier),
    truths,
    requirements,
    antiPatterns,
    antiNote: maybe(raw.antiNote),
    humanChecks,
    humanTitles: arr<unknown>(raw.humanTitles).map(clean).filter((t) => t !== ''),
    critical: readGaps(gaps?.critical),
    nonCritical: readGaps(gaps?.nonCritical),
    gapProse: maybe(raw.gapProse),
    fixPlans,
    fixShape: raw.fixShape === 'plans' || raw.fixShape === 'prose' ? raw.fixShape : null,
    metadata: {
      approach: maybe(meta?.approach),
      source: maybe(meta?.source),
      automatedPassed: numOrNull(meta?.automatedPassed),
      automatedFailed: numOrNull(meta?.automatedFailed),
      duration: maybe(meta?.duration),
    },
    spotChecks,
    anchors,
    sections,
  };
}

// ---------------------------------------------------------------------------
// Fix-plan mapping - tokens / STOP / overlap ported from the sketch's gen-data.mjs
// ---------------------------------------------------------------------------

const STOP = new Set([
  'with',
  'from',
  'that',
  'this',
  'into',
  'when',
  'than',
  'then',
  'only',
  'each',
  'every',
  'which',
  'their',
  'there',
  'have',
  'does',
  'test',
  'tests',
  'verify',
  'phase',
  'plan',
  'call',
  'calls',
  'real',
  'make',
  'show',
  'shows',
  'still',
  'after',
  'before',
  'never',
  'file',
  'files',
]);

const MAX_TOKEN_INPUT = 4000;

function isWordChar(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '_' || ch === ':' || ch === '.' || ch === '-';
}

/** Backtick spans and words of four or more characters starting with a letter, trimmed and stemmed. */
export function tokens(text: string): Set<string> {
  const lower = text.slice(0, MAX_TOKEN_INPUT).toLowerCase();
  const raw: string[] = [];
  let i = 0;
  while (i < lower.length) {
    const ch = lower[i];
    if (ch === '`') {
      const close = lower.indexOf('`', i + 1);
      if (close > i + 1) {
        raw.push(lower.slice(i, close + 1));
        i = close + 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (ch >= 'a' && ch <= 'z') {
      let j = i + 1;
      while (j < lower.length && isWordChar(lower[j])) j += 1;
      if (j - i >= 4) raw.push(lower.slice(i, j));
      i = j;
      continue;
    }
    i += 1;
  }
  const out = new Set<string>();
  for (const token of raw) {
    let end = token.length;
    while (end > 0 && (token[end - 1] === '`' || token[end - 1] === '.' || token[end - 1] === ':')) end -= 1;
    let t = token.slice(0, end);
    if (t.startsWith('`')) t = t.slice(1);
    if (t === '' || STOP.has(t)) continue;
    out.add(/[()_:]/.test(t) ? t : t.slice(0, 5));
  }
  return out;
}

function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let n = 0;
  for (const token of a) if (b.has(token)) n += 1;
  return n;
}

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

interface WorkGap {
  key: string;
  kind: 'critical' | 'noncritical';
  number: string;
  name: string;
  missing: string | null;
  impact: string | null;
  fix: string | null;
  fixLabel: 'Fix' | 'Recommendation';
  missingList: string[];
  artifacts: { path: string; issue: string }[];
  truth: string | null;
  fromFrontmatter: boolean;
  fixes: { plan: number; task: number; verify: boolean }[];
  truthIndex: number | null;
}

function templateGapOf(gap: VerificationTemplateGap, kind: 'critical' | 'noncritical', index: number): WorkGap {
  const prefix = kind === 'critical' ? 'C' : 'N';
  return {
    key: `${prefix.toLowerCase()}${index + 1}`,
    kind,
    number: `${prefix}${index + 1}`,
    name: gap.name,
    missing: gap.missing,
    impact: gap.impact,
    fix: gap.fix,
    fixLabel: gap.fixLabel,
    missingList: [],
    artifacts: [],
    truth: null,
    fromFrontmatter: false,
    fixes: [],
    truthIndex: null,
  };
}

function frontmatterGaps(fm: Rec): WorkGap[] {
  const out: WorkGap[] = [];
  for (const item of listOf(fm.gaps)) {
    const r = rec(item);
    if (r === null || out.length >= 200) continue;
    const truth = clean(r.truth);
    const reason = clean(r.reason);
    const name = truth !== '' ? truth : reason;
    if (name === '') continue;
    const index = out.length;
    out.push({
      key: `c${index + 1}`,
      kind: 'critical',
      number: `C${index + 1}`,
      name,
      missing: reason === '' ? null : reason,
      impact: null,
      fix: null,
      fixLabel: 'Fix',
      missingList: listOf(r.missing).map(clean).filter((m) => m !== '').slice(0, 50),
      artifacts: listOf(r.artifacts)
        .map((a) => {
          const ar = rec(a);
          return ar === null ? null : { path: clean(ar.path), issue: clean(ar.issue) };
        })
        .filter((a): a is { path: string; issue: string } => a !== null && (a.path !== '' || a.issue !== ''))
        .slice(0, 50),
      truth: truth === '' ? null : truth,
      fromFrontmatter: true,
      fixes: [],
      truthIndex: null,
    });
  }
  return out;
}

function mapTasks(gaps: WorkGap[], plans: VerificationFixPlan[]): void {
  const gapTokens = gaps.map((gap) =>
    tokens(
      [
        gap.name,
        gap.missing ?? '',
        gap.fix ?? '',
        ...gap.missingList,
        ...gap.artifacts.map((a) => `${a.issue} ${a.path}`),
      ].join(' '),
    ),
  );
  plans.forEach((plan, planIndex) => {
    plan.tasks.forEach((task, taskIndex) => {
      const taskTokens = tokens(task.text);
      const scores = gapTokens.map((gt) => overlap(gt, taskTokens));
      if (task.verify) {
        scores.forEach((score, gi) => {
          if (score >= 2) gaps[gi].fixes.push({ plan: planIndex, task: taskIndex, verify: true });
        });
        return;
      }
      let best = 0;
      scores.forEach((score) => {
        if (score > best) best = score;
      });
      if (best < 2) return;
      gaps[scores.indexOf(best)].fixes.push({ plan: planIndex, task: taskIndex, verify: false });
    });
  });
  for (const gap of gaps) {
    gap.fixes = gap.fixes
      .filter((fix) => !fix.verify || gap.fixes.some((other) => !other.verify && other.plan === fix.plan))
      .sort((a, b) => a.plan - b.plan || a.task - b.task);
  }
}

function plainText(text: string): string {
  return text.replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function mapTruths(gaps: WorkGap[], truths: VerificationTruth[]): void {
  const truthTokens = truths.map((t) => tokens(t.text));
  for (const gap of gaps) {
    if (gap.truth !== null) {
      const wanted = plainText(gap.truth);
      const head = wanted.slice(0, 40);
      const direct = truths.findIndex((t) => {
        const text = plainText(t.text);
        return text === wanted || (head.length >= 40 && text.startsWith(head));
      });
      if (direct !== -1) {
        gap.truthIndex = direct;
        continue;
      }
    }
    const gapTokens = tokens(
      [gap.name, gap.missing ?? '', gap.fix ?? '', ...gap.missingList, ...gap.artifacts.map((a) => `${a.issue} ${a.path}`)].join(' '),
    );
    let best = -1;
    let bestScore = 0;
    truths.forEach((truth, index) => {
      if (truth.status === 'verified') return;
      const score = overlap(gapTokens, truthTokens[index]);
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    gap.truthIndex = best !== -1 && bestScore >= (gap.fromFrontmatter ? 4 : 2) ? best : null;
  }
}

function scopeOf(scope: string | null): ComposedScope {
  if (scope === null) return { label: 'Scope not stated', filled: 0 };
  const lower = scope.toLowerCase();
  for (const key of ['small', 'medium', 'large']) {
    if (lower.includes(key)) return { label: scope, filled: SCOPE_SEGMENTS[key] };
  }
  return { label: scope, filled: 0 };
}

function chipPrefix(plan: VerificationFixPlan): string {
  if (plan.file !== null) {
    const lower = plan.file.toLowerCase();
    return lower.endsWith('-plan.md') ? plan.file.slice(0, -8) : plan.file;
  }
  const name = plan.name.trim();
  let end = 0;
  while (end < name.length && name[end] !== ' ' && name[end] !== '/') end += 1;
  return name.slice(0, end);
}

function baseName(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? path : path.slice(cut + 1);
}

function columnsOf(gap: WorkGap): ComposedGapColumns {
  const wrong = gap.fixLabel === 'Recommendation';
  let why: ComposedWhy | null = null;
  if (gap.impact !== null) {
    why = { kind: 'text', text: capFirst(gap.impact) };
  } else if (gap.truth !== null) {
    why = {
      kind: 'truth',
      truth: gap.truth,
      where: gap.artifacts.map((a) => ({ file: baseName(a.path), issue: a.issue })),
    };
  }
  let fix: ComposedFix | null = null;
  if (gap.fix !== null) fix = { kind: 'text', text: capFirst(gap.fix) };
  else if (gap.missingList.length > 0) fix = { kind: 'list', items: gap.missingList };
  return {
    missingLabel: wrong ? 'What’s wrong' : 'What’s missing',
    missing: gap.missing === null ? null : capFirst(gap.missing),
    whyLabel: gap.kind === 'critical' ? 'Why it blocks' : 'Why it can wait',
    why,
    fixLabel: wrong ? 'Recommendation' : 'Fix',
    fix,
  };
}

function composeLedger(
  report: SafeReport,
  fm: Rec,
  headingId: (text: string | null) => string | null,
): { ledger: ComposedLedger; gaps: WorkGap[] } {
  let gaps: WorkGap[] = [
    ...report.critical.map((g, i) => templateGapOf(g, 'critical', i)),
    ...report.nonCritical.map((g, i) => templateGapOf(g, 'noncritical', i)),
  ];
  if (report.critical.length === 0) {
    const fromFrontmatter = frontmatterGaps(fm);
    if (fromFrontmatter.length > 0) gaps = [...fromFrontmatter, ...gaps.filter((g) => g.kind === 'noncritical')];
  }
  mapTasks(gaps, report.fixPlans);
  mapTruths(gaps, report.truths);
  const used = new Set<string>();
  for (const gap of gaps) for (const fix of gap.fixes) used.add(`${fix.plan}.${fix.task}`);

  const rows: ComposedGapRow[] = gaps.map((gap) => {
    const planOrder: number[] = [];
    for (const fix of gap.fixes) if (!planOrder.includes(fix.plan)) planOrder.push(fix.plan);
    const chips: ComposedChip[] = [];
    for (const fix of gap.fixes) {
      if (fix.verify) continue;
      const plan = report.fixPlans[fix.plan];
      chips.push({ prefix: chipPrefix(plan), text: plan.tasks[fix.task].text });
    }
    const tickets: ComposedTicket[] = planOrder.map((planIndex) => {
      const plan = report.fixPlans[planIndex];
      const hits = new Set(gap.fixes.filter((f) => f.plan === planIndex).map((f) => f.task));
      return {
        planIndex,
        file: plan.file,
        name: plan.name,
        scope: scopeOf(plan.scope),
        tasks: plan.tasks.map((task, index) => ({
          n: index + 1,
          text: task.text,
          verify: task.verify,
          hit: hits.has(index),
        })),
        hitCount: hits.size,
      };
    });
    return {
      key: gap.key,
      kind: gap.kind,
      number: gap.number,
      name: gap.name,
      preview: gap.missing,
      chips,
      scope: planOrder.length > 0 ? scopeOf(report.fixPlans[planOrder[0]].scope) : null,
      columns: columnsOf(gap),
      tickets,
      fixState: report.fixPlans.length === 0 ? 'no-plan' : planOrder.length === 0 ? 'unnamed' : 'tickets',
      truthIndex: gap.truthIndex,
      anchorId: `verification-gap-${gap.key}`,
    };
  });

  const unmapped: { text: string; plan: string }[] = [];
  report.fixPlans.forEach((plan, planIndex) => {
    plan.tasks.forEach((task, taskIndex) => {
      if (!task.verify && !used.has(`${planIndex}.${taskIndex}`)) unmapped.push({ text: task.text, plan: plan.name });
    });
  });

  const critical = gaps.filter((g) => g.kind === 'critical').length;
  const minor = gaps.length - critical;
  return {
    gaps,
    ledger: {
      aside: gaps.length === 0 ? 'none' : `${critical} critical · ${minor} can wait`,
      rows,
      unmapped: gaps.length === 0 ? [] : unmapped,
      empty: gaps.length === 0 ? (report.gapProse !== null ? firstSentence(report.gapProse) : 'No gaps found.') : null,
      sourceId: headingId(report.anchors.gaps),
      fixShape: report.fixShape,
    },
  };
}

// ---------------------------------------------------------------------------
// Truths
// ---------------------------------------------------------------------------

const STANDARD_STATUS = new Set(['VERIFIED', 'FAILED', 'PRESENT_BEHAVIOR_UNVERIFIED', 'UNCERTAIN']);

function isStandardStatus(raw: string): boolean {
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '✓' || ch === '✗' || ch === '⚠' || ch === '️' || ch === '?' || ch === ' ') i += 1;
    else break;
  }
  return STANDARD_STATUS.has(raw.slice(i).trim());
}

function groupLabel(name: string): string {
  if (name === 'Roadmap success criteria') return 'Roadmap';
  if (name === 'Observable truths') return 'Truths';
  return name;
}

function composeTruths(
  report: SafeReport,
  fm: Rec,
  gaps: WorkGap[],
  humanAvailable: boolean,
): ComposedTruthBoard | null {
  const truths = report.truths;
  if (truths.length === 0) return null;
  const groupNames: string[] = [];
  for (const truth of truths) if (!groupNames.includes(truth.group)) groupNames.push(truth.group);
  const rowDefs: { key: 'failed' | 'open' | 'ok'; label: string; match: (state: VerificationTruthState) => boolean }[] = [
    { key: 'failed', label: 'Failed', match: (s) => s === 'failed' },
    { key: 'open', label: 'Not proven', match: (s) => TRUTH_OPEN.has(s) },
    { key: 'ok', label: 'Holds', match: (s) => TRUTH_HOLDS.has(s) },
  ];
  const rows: ComposedTruthRow[] = rowDefs.map((def) => {
    const count = truths.filter((t) => def.match(t.status)).length;
    return {
      key: def.key,
      label: def.label,
      count,
      filled: Math.ceil((count / Math.max(truths.length, 1)) * 4),
      cells: groupNames.map((name) =>
        truths
          .map((truth, index) => ({ truth, index }))
          .filter(({ truth }) => truth.group === name && def.match(truth.status))
          .map(({ truth, index }) => ({
            index,
            n: truth.n,
            state: truth.status,
            label: TRUTH_STATE_LABEL[truth.status],
            title: truth.text.length > 100 ? truth.text.slice(0, 100) : truth.text,
          })),
      ),
    };
  });

  const behaviorItems = listOf(fm.behavior_unverified_items).map(rec).filter((r): r is Rec => r !== null);
  const coincidentalItems = listOf(fm.coincidental_reliance_items).map(rec).filter((r): r is Rec => r !== null);
  const details: ComposedTruthDetail[] = truths.map((truth, index) => {
    const key = truth.text.slice(0, 30).toLowerCase();
    const behavior =
      key.length < 8
        ? undefined
        : behaviorItems.find((item) => {
            const t = clean(item.truth).toLowerCase();
            return t !== '' && (t.includes(key) || key.includes(t.slice(0, 30)));
          });
    const coincidental =
      key.length < 8
        ? undefined
        : coincidentalItems.find((item) => clean(item.truth).toLowerCase().startsWith(key.slice(0, 24)));
    return {
      index,
      n: truth.n,
      group: truth.group,
      text: truth.text,
      state: truth.status,
      stateLabel: TRUTH_STATE_LABEL[truth.status],
      tone: TRUTH_TONE[truth.status],
      evidence: truth.evidence === '' ? null : truth.evidence,
      raw: truth.statusRaw !== '' && !isStandardStatus(truth.statusRaw) ? truth.statusRaw : null,
      behavior:
        behavior === undefined ? null : { test: clean(behavior.test), expected: clean(behavior.expected) },
      coincidental:
        coincidental === undefined
          ? null
          : { reason: humanize(clean(coincidental.reason)), harden: clean(coincidental.harden) },
      gapLinks: gaps
        .filter((gap) => gap.truthIndex === index)
        .map((gap) => ({
          key: gap.key,
          label: `${gap.kind === 'critical' ? 'Critical gap' : 'Gap'}: ${gap.name}`,
          tone: gap.kind === 'critical' ? 'missing' : 'in-flight',
        })),
      humanLink: behavior !== undefined && humanAvailable,
    };
  });
  return {
    aside: `${truths.length} truths · ${groupNames.length > 1 ? 'by plan' : 'by outcome'}`,
    groups: groupNames.map((name) => ({ name, label: groupLabel(name) })),
    rows,
    details,
  };
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

function composeRequirements(report: SafeReport): ComposedRequirementBoard | null {
  const list = report.requirements;
  if (list.length === 0) return null;
  const order: VerificationRequirementState[] = ['blocked', 'human', 'partial', 'satisfied'];
  const rows: ComposedRequirementRow[] = order
    .filter((state) => list.some((r) => r.status === state))
    .map((state) => {
      const members = list.filter((r) => r.status === state);
      return {
        state,
        label: REQUIREMENT_LABEL[state],
        count: members.length,
        squares: members.map((r) => ({ id: r.id, state })),
      };
    });
  const satisfied = list.filter((r) => r.status === 'satisfied' || r.status === 'partial').length;
  return {
    aside: `${satisfied} of ${list.length} satisfied`,
    rows,
    details: list.map((r) => ({
      id: r.id,
      state: r.status,
      label: REQUIREMENT_LABEL[r.status],
      tone: REQUIREMENT_TONE[r.status],
      description: r.description === '' ? null : r.description,
      plans: r.plans,
      noteLabel: r.status === 'blocked' ? 'Blocking' : 'Evidence',
      note: r.note === '' ? null : r.note,
    })),
  };
}

// ---------------------------------------------------------------------------
// Human checks
// ---------------------------------------------------------------------------

/** The test's first clause: up to `.`, `;`, `(` or " - ", at most 90 characters. */
function firstClause(text: string): string {
  let end = text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '.' || ch === ';' || ch === '(') {
      end = i;
      break;
    }
    if (ch === '—' && text[i - 1] === ' ' && text[i + 1] === ' ') {
      end = i - 1;
      break;
    }
  }
  const clause = text.slice(0, Math.min(end, 90)).trim();
  return clause === '' ? text.slice(0, 90).trim() : clause;
}

interface HumanSource {
  checks: { title: string; test: string | null; expected: string | null; why: string | null }[];
  resolved: string | null;
}

function humanSourceOf(report: SafeReport, fm: Rec): HumanSource {
  const resolvedRec = rec(fm.human_verification_resolved);
  const resolvedFlag = clean(fm.human_verification).toLowerCase() === 'resolved' || resolvedRec !== null;
  let resolved: string | null = null;
  if (resolvedFlag) {
    const by = resolvedRec === null ? '' : clean(resolvedRec.by);
    const at = resolvedRec === null ? '' : clean(resolvedRec.at);
    resolved = ['Resolved', by, at === '' ? '' : formatStamp(at)].filter((p) => p !== '').join(' · ');
  }
  if (report.humanChecks.length > 0) {
    return {
      checks: report.humanChecks.map((c, i) => ({
        title: c.title ?? `Check ${i + 1}`,
        test: c.test,
        expected: c.expected,
        why: c.why,
      })),
      resolved,
    };
  }
  const items = listOf(fm.human_verification)
    .map((item) => {
      const r = rec(item);
      if (r !== null) {
        return { test: maybe(r.test), expected: maybe(r.expected), why: maybe(r.why_human ?? r.why) };
      }
      const text = maybe(item);
      return text === null || text.toLowerCase() === 'resolved' ? null : { test: text, expected: null, why: null };
    })
    .filter((item): item is { test: string | null; expected: string | null; why: string | null } => item !== null)
    .slice(0, 100);
  const useTitles = report.humanTitles.length === items.length;
  return {
    checks: items.map((item, i) => ({
      title: useTitles ? report.humanTitles[i] : firstClause(item.test ?? '') || `Check ${i + 1}`,
      ...item,
    })),
    resolved,
  };
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function stripTrailingParenthetical(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.endsWith(')')) return trimmed;
  const open = trimmed.lastIndexOf('(');
  return open > 0 ? trimmed.slice(0, open).trim() : trimmed;
}

function dateText(value: unknown): string | null {
  const text = clean(value);
  return text === '' ? null : formatStamp(text);
}

/** The composed VERIFICATION page, or null when the payload carries no projection. */
export function composeVerificationBoard(input: ViewInput): ComposedVerificationBoard | null {
  const structured = rec(input.structured);
  if (structured === null) return null;
  const raw = rec(structured.verification);
  if (raw === null) return null;
  const fm = rec(input.frontmatter) ?? {};
  const report = readReport(raw);
  const headings = input.headings ?? [];
  const headingId = (text: string | null): string | null => {
    if (text === null) return null;
    const wanted = normalizeHeading(text);
    for (const heading of headings) if (normalizeHeading(heading.text) === wanted) return heading.id;
    return null;
  };

  const statusKey = clean(fm.status).toLowerCase();
  const status =
    statusKey === ''
      ? null
      : { label: STATUS_LABEL[statusKey] ?? humanize(statusKey), tone: STATUS_TONE[statusKey] ?? ('quiet' as VerificationTone) };

  const human = humanSourceOf(report, fm);
  const resolved = human.resolved !== null;
  const open = resolved ? [] : human.checks;
  const { ledger, gaps } = composeLedger(report, fm, headingId);
  const truths = composeTruths(report, fm, gaps, human.checks.length > 0);
  const requirements = composeRequirements(report);

  // --- the big number -------------------------------------------------------------------------
  const holding = report.truths.filter((t) => TRUTH_HOLDS.has(t.status)).length;
  const fmScore = scoreOf(clean(fm.score));
  const score = fmScore ?? (report.truths.length > 0 ? { n: holding, m: report.truths.length } : null);
  const criticalCount = gaps.filter((g) => g.kind === 'critical').length;
  const minorCount = gaps.length - criticalCount;
  let big: ComposedBig | null;
  const scoreFrame = (tone: VerificationTone, label: string, sub: string): ComposedBig | null =>
    score === null ? null : { value: `${score.n}/${score.m}`, label, sub, tone };
  if (statusKey === 'gaps_found' && criticalCount > 0) {
    const parts: string[] = [];
    if (minorCount > 0) parts.push(`${minorCount} more can wait`);
    if (score !== null) parts.push(`${score.n} of ${score.m} truths hold`);
    big = {
      value: String(criticalCount),
      label: criticalCount === 1 ? 'gap blocks the goal' : 'gaps block the goal',
      sub: parts.join(' \u00b7 '),
      tone: 'missing',
    };
  } else if (statusKey === 'human_needed' && open.length > 0) {
    big = {
      value: String(open.length),
      label: open.length === 1 ? 'check left for a person' : 'checks left for a person',
      sub: score === null ? '' : `machine checks done · ${score.n} of ${score.m}`,
      tone: 'in-flight',
    };
  } else if (statusKey === 'passed') {
    big = scoreFrame(
      'complete',
      'truths hold · goal achieved',
      open.length > 0 ? `${plural(open.length, 'human check', 'human checks')} recorded` : 'nothing left for a person',
    );
  } else {
    big = scoreFrame(STATUS_TONE[statusKey] ?? 'quiet', 'truths hold', '');
  }

  // --- the stat rows -------------------------------------------------------------------------
  const stats: ComposedStat[] = [];
  if (report.truths.length > 0 || score !== null) {
    const n = report.truths.length > 0 ? holding : (score?.n ?? 0);
    const m = report.truths.length > 0 ? report.truths.length : (score?.m ?? 0);
    stats.push({
      key: 'truths',
      label: 'Truths',
      value: `${n}/${m}`,
      tone: n < m ? 'missing' : null,
      target: truths !== null ? 'verification-truths' : null,
    });
  }
  if (report.requirements.length > 0) {
    const satisfied = report.requirements.filter((r) => r.status === 'satisfied' || r.status === 'partial').length;
    stats.push({
      key: 'requirements',
      label: 'Requirements',
      value: `${satisfied}/${report.requirements.length}`,
      tone: satisfied < report.requirements.length ? 'in-flight' : null,
      target: 'verification-requirements',
    });
  }
  const hasAnti = report.anchors.anti !== null;
  const blockers = report.antiPatterns.filter((a) => a.severity === 'blocker').length;
  if (hasAnti) {
    stats.push({
      key: 'anti-patterns',
      label: 'Anti-patterns',
      value: report.antiPatterns.length > 0 ? `${blockers} blocking · ${report.antiPatterns.length}` : '0',
      tone: blockers > 0 ? 'missing' : null,
      target: 'verification-anti',
    });
  }
  const spotRows: ComposedSpotRow[] = report.spotChecks.map((check) => {
    const open = check.statusRaw.indexOf('(');
    return {
      state: check.status === 'pass' ? 'verified' : check.status === 'fail' ? 'failed' : 'uncertain',
      behavior: check.behavior,
      result: check.result,
      command: check.command,
      note: open !== -1 && check.statusRaw.endsWith(')') ? check.statusRaw.slice(open) : null,
    };
  });
  const hasSpot = spotRows.length > 0;
  const meta = report.metadata;
  if (meta.automatedPassed !== null || meta.automatedFailed !== null) {
    const passed = meta.automatedPassed ?? 0;
    const failed = meta.automatedFailed ?? 0;
    stats.push({
      key: 'automated',
      label: 'Automated',
      value: `${passed} ✓ · ${failed} ✗`,
      tone: failed > 0 ? 'missing' : null,
      target: hasSpot ? 'spot-checks' : null,
    });
  } else if (hasSpot) {
    const passed = spotRows.filter((r) => r.state === 'verified').length;
    const failed = spotRows.filter((r) => r.state === 'failed').length;
    const skipped = spotRows.length - passed - failed;
    stats.push({
      key: 'spot-checks',
      label: 'Spot-checks',
      value: `${passed} ✓ · ${failed} ✗${skipped > 0 ? ` · ${skipped} skip` : ''}`,
      tone: failed > 0 ? 'missing' : null,
      target: 'spot-checks',
    });
  }
  let approach: string | null = meta.approach === null ? null : stripTrailingParenthetical(meta.approach);
  if (approach === null && report.reVerification !== null) {
    approach = report.reVerification.toLowerCase().startsWith('no') ? 'Initial verification' : 'Re-verification';
  }
  if (approach === null) {
    const flag = fm.re_verification;
    if (flag === true || (typeof flag === 'string' && flag.trim() !== '' && flag.toLowerCase() !== 'false')) {
      approach = 'Re-verification';
    }
  }
  if (approach !== null && approach !== '') {
    stats.push({ key: 'approach', label: 'Approach', value: approach, tone: null, target: null });
  }
  if (meta.duration !== null) {
    stats.push({ key: 'took', label: 'Took', value: meta.duration, tone: null, target: null });
  }

  const slips: ComposedSlip[] = open.map((check, i) => ({
    n: i + 1,
    title: check.title,
    preview: clip(check.expected ?? '', 90),
    anchorId: `verification-check-${i + 1}`,
  }));

  // --- the rail ------------------------------------------------------------------------------
  const h1Title = report.h1 === null ? null : cleanTitle(report.h1);
  const phaseSlug = clean(fm.phase);
  const title = h1Title ?? (phaseSlug !== '' ? slugTitle(phaseSlug) : null);
  const rail: ComposedRail = {
    eyebrow: eyebrowOf(fm, raw),
    title,
    status,
    verified: dateText(fm.verified),
    big,
    stats,
    slips,
    slipsLabel: statusKey === 'gaps_found' ? 'For a person · after the gaps' : 'For a person',
  };

  // --- the human steps -----------------------------------------------------------------------
  const humanSection =
    human.checks.length === 0
      ? null
      : {
          heading: resolved ? 'Checked by a person' : statusKey === 'gaps_found' ? 'Needs a person, after the gaps' : 'Needs a person first',
          aside: plural(human.checks.length, 'check', 'checks'),
          resolved: human.resolved,
          steps: human.checks.map((check, i) => ({
            n: i + 1,
            title: check.title,
            test: check.test,
            expected: check.expected,
            why: check.why,
            anchorId: `verification-check-${i + 1}`,
          })),
          sourceId: headingId(report.anchors.human),
        };

  // --- the anti-patterns ---------------------------------------------------------------------
  let anti: ComposedAnti | null = null;
  if (hasAnti) {
    const whereOf = (a: VerificationAntiPattern): string => {
      const file = a.file;
      const line = a.line === '—' || a.line === '-' ? '' : a.line;
      return line === '' ? file : `${file}:${line}`;
    };
    const rowOf = (a: VerificationAntiPattern): ComposedAntiRow => ({
      severity: a.severity,
      where: whereOf(a),
      pattern: a.pattern,
      impact: a.impact,
    });
    const counts: [VerificationSeverity, string, string][] = [
      ['blocker', 'blocker', 'blockers'],
      ['warning', 'warning', 'warnings'],
      ['info', 'info', 'info'],
      ['clear', 'clear', 'clear'],
    ];
    const summary = counts
      .map(([severity, one, many]) => {
        const n = report.antiPatterns.filter((a) => a.severity === severity).length;
        return n === 0 ? null : `${n} ${n === 1 ? one : many}`;
      })
      .filter((s): s is string => s !== null)
      .join(' · ');
    anti = {
      summary,
      blockers: report.antiPatterns.filter((a) => a.severity === 'blocker').map(rowOf),
      rows: report.antiPatterns.filter((a) => a.severity !== 'blocker').map(rowOf),
      note: report.antiPatterns.length > 0 ? report.antiNote : null,
      empty: report.antiPatterns.length === 0 ? (report.antiNote !== null ? clip(report.antiNote, 260) : 'None found.') : null,
      sourceId: headingId(report.anchors.anti),
    };
  }

  // --- also in this report -------------------------------------------------------------------
  const also: ComposedAlso[] = [];
  const previous = rec(fm.previous_verification);
  const closed = previous === null ? [] : listOf(previous.gaps_closed);
  if (closed.length > 0) also.push({ label: `Closed since last verification · ${closed.length}`, targetId: null });
  const blockedData = listOf(fm.data_blocked);
  const dataBlockedSection = report.sections.some((s) => {
    const t = normalizeHeading(s.heading);
    return t.includes('data-blocked') || t.includes('data blocked');
  });
  if (blockedData.length > 0 && !dataBlockedSection) {
    also.push({ label: `Blocked by missing data · ${blockedData.length}`, targetId: null });
  }
  if (report.gapProse !== null && gaps.some((g) => g.fromFrontmatter)) {
    also.push({ label: 'Verifier’s gap summary', targetId: headingId(report.anchors.gaps) });
  }
  for (const section of report.sections) {
    if (section.handled || section.blank) continue;
    also.push({ label: stripTrailingParenthetical(section.heading), targetId: headingId(section.heading) });
  }

  return {
    rail,
    goal: report.goal,
    ledger,
    truths,
    requirements,
    human: humanSection,
    anti,
    also,
    footer: report.verifier === null && meta.source === null ? null : { verifier: report.verifier, source: meta.source },
    spotChecks: hasSpot ? { rows: spotRows, sourceId: headingId(report.anchors.spot) } : null,
  };
}
