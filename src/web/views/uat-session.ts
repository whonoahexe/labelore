// The UAT session composer (quick-261001-qk7, sketch 015 B): a pure `ViewInput` ->
// `ComposedUatSession` merge of the frontmatter and `structured.uat` (built by
// `src/planning-repo/handlers/uat-session.ts`). It decides the cover facts (status, Started,
// Updated and the gap between them, Tested from), the current test or the done line, one square
// per test, the result counts and the Summary-versus-tests mismatch, every test's Expected /
// Result pair, the gap register or prose cards, the folded extras and the "In the source only"
// targets. No DOM, no rendering — `uat-session-components.tsx` is the only consumer. Returns
// `null` when the session is missing or holds no test, and the page then keeps the pre-existing
// promoted-block view (T-qk7-04). Dates are formatted by hand in UTC so Node and the browser
// agree, and an unparseable date renders as written, never throwing.
// T-qk7-03: author-written paths and debug-session text are never turned into an href here.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type {
  UatField,
  UatGapArtifact,
  UatResult,
  UatSession,
  UatTest,
} from '../../planning-repo/handlers/uat-session.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';

// ---------------------------------------------------------------------------
// Tones — the only place a result, severity or status becomes a tone
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the UAT page draws from — never the parse-degradation
 * tones (`destructive`/`warning`), which stay reserved for the artifact-parse badge alone. */
export type UatTone = 'complete' | 'missing' | 'in-flight' | 'quiet' | 'active';

/** pass -> complete, issue -> missing, blocked -> in-flight, skipped and pending -> quiet (pending
 * is drawn dashed by the stylesheet), anything unrecognised -> quiet. */
export const RESULT_TONE: Record<UatResult, UatTone> = {
  pass: 'complete',
  issue: 'missing',
  blocked: 'in-flight',
  skipped: 'quiet',
  pending: 'quiet',
  other: 'quiet',
};

export const RESULT_LABEL: Record<Exclude<UatResult, 'other'>, string> = {
  pass: 'Pass',
  issue: 'Issue',
  blocked: 'Blocked',
  skipped: 'Skipped',
  pending: 'Pending',
};

export const RESULT_ORDER: readonly UatResult[] = ['pass', 'issue', 'blocked', 'skipped', 'pending', 'other'];

/** Results the Summary block counts (an unrecognised result has no Summary line). */
const COUNTED: readonly Exclude<UatResult, 'other'>[] = ['pass', 'issue', 'blocked', 'skipped', 'pending'];

/** blocker -> missing, major -> in-flight, minor and cosmetic -> quiet. */
export const SEVERITY_TONE: Record<string, UatTone> = {
  blocker: 'missing',
  major: 'in-flight',
  minor: 'quiet',
  cosmetic: 'quiet',
};

/** The "Now" chip on the current test. */
export const NOW_TONE: UatTone = 'active';
/** The "Not diagnosed yet" chip. */
export const NOT_DIAGNOSED_TONE: UatTone = 'quiet';
/** The "Resolved" strip's chip. */
export const RESOLVED_TONE: UatTone = 'complete';

export function severityTone(severity: string): UatTone {
  return SEVERITY_TONE[severity.trim().toLowerCase()] ?? 'quiet';
}

/** resolved / closed -> complete, failed / open -> missing, anything else quiet. */
export function gapStatusTone(status: string): UatTone {
  const text = status.toLowerCase();
  if (text.includes('resolved') || text.includes('closed')) return 'complete';
  if (text.includes('failed') || text.includes('open')) return 'missing';
  return 'quiet';
}

export interface UatStatus {
  label: string;
  tone: UatTone;
}

/** testing -> Testing (active), partial / diagnosed -> in-flight, complete / passed -> complete,
 * anything else is shown as written (or Unknown) and quiet. */
export function statusOf(raw: string): UatStatus {
  const text = raw.trim().toLowerCase();
  if (text.includes('testing')) return { label: 'Testing', tone: 'active' };
  if (text.includes('partial')) return { label: 'Partial', tone: 'in-flight' };
  if (text.includes('diagnosed')) return { label: 'Diagnosed', tone: 'in-flight' };
  if (text.includes('complete') || text.includes('passed')) {
    return { label: text === 'passed' ? 'Passed' : 'Complete', tone: 'complete' };
  }
  return { label: raw.trim() === '' ? 'Unknown' : raw.trim(), tone: 'quiet' };
}

// ---------------------------------------------------------------------------
// Composed model
// ---------------------------------------------------------------------------

export interface ComposedUatIntro {
  eyebrow: string;
  title: string | null;
  status: UatStatus;
  started: string | null;
  updated: string | null;
  /** "35 min", "1h 35m", "11 days" — null when the stamps are missing or not in order. */
  gap: string | null;
  source: string[];
}

export type ComposedUatCurrent =
  | {
      live: true;
      n: number;
      padded: string;
      total: number;
      name: string;
      expectedBlocks: Block[];
      awaiting: string;
      updated: string | null;
      anchorId: string;
    }
  | {
      live: false;
      headline: string;
      passed: number;
      total: number;
      line: string | null;
      updated: string | null;
    };

export interface ComposedUatSquare {
  n: number;
  anchorId: string;
  result: UatResult;
  tone: UatTone;
  label: string;
  isNow: boolean;
  /** Plain-text name for the title and aria-label. */
  title: string;
}

export interface ComposedUatMore {
  /** The field key with underscores as spaces; '' for a test's unkeyed lead text. */
  label: string;
  blocks: Block[];
}

export interface ComposedUatTest {
  n: number;
  anchorId: string;
  name: string;
  result: UatResult;
  tone: UatTone;
  label: string;
  isNow: boolean;
  expectedBlocks: Block[];
  /** The raw expected text runs over 320 characters (clamped to three lines with more / less). */
  expectedLong: boolean;
  /** The raw result, only when it says more than its keyword. */
  rawResult: string | null;
  reported: Block[];
  severity: { value: string; tone: UatTone } | null;
  blockedBy: string | null;
  reason: { blocks: Block[]; quiet: boolean } | null;
  more: ComposedUatMore[];
}

export interface ComposedUatGapItem {
  index: number;
  anchorId: string;
  gapId: string;
  truth: string;
  status: { label: string; tone: UatTone };
  severity: { value: string; tone: UatTone } | null;
  test: string | null;
  /** The anchor of that test's pair when the document has one. */
  testAnchor: string | null;
  diagnosed: boolean;
  /** The reported reason with a leading "User reported:" removed. */
  reason: string | null;
  rootCause: string | null;
  artifacts: UatGapArtifact[];
  missing: string[];
  missingDone: boolean;
  debugSession: string | null;
  resolution: {
    resolvedAt: string | null;
    reverifiedAt: string | null;
    deployedAt: string | null;
    resolvedBy: string | null;
    fix: string | null;
    reverify: string | null;
  } | null;
  /** Keys the item carries that the register does not place — named, never dropped. */
  alsoInSource: string[];
}

export interface ComposedUatCard {
  title: string | null;
  blocks: Block[];
}

export interface ComposedUatGaps {
  mode: 'register' | 'cards' | 'none';
  /** "2 · 2 open" for a register, "12" for cards, "none" for neither. */
  aside: string;
  lead: string | null;
  /** The line an empty section shows: the author's own, else the default. */
  emptyLine: string;
  items: ComposedUatGapItem[];
  cards: ComposedUatCard[];
}

export interface ComposedUatExtra {
  id: string;
  heading: string;
  blocks: Block[];
}

export interface ComposedUatSourceOnly {
  label: string;
  /** Heading id to scroll to in Source mode; null = the top. */
  targetId: string | null;
  /** False for an entry that has no place to go (the template comments). */
  interactive: boolean;
}

export interface ComposedUatCounts {
  pass: number;
  issue: number;
  blocked: number;
  skipped: number;
  pending: number;
  other: number;
}

export interface ComposedUatSession {
  intro: ComposedUatIntro;
  current: ComposedUatCurrent;
  squares: ComposedUatSquare[];
  counts: ComposedUatCounts;
  total: number;
  mismatch: string | null;
  testsNote: Block[];
  tests: ComposedUatTest[];
  gaps: ComposedUatGaps;
  extras: ComposedUatExtra[];
  sourceOnly: ComposedUatSourceOnly[];
}

// ---------------------------------------------------------------------------
// Defensive readers (an older server's payload must still compose or return null)
// ---------------------------------------------------------------------------

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** Frontmatter arrives as strings, numbers, arrays or (from other loaders) Date instances. */
function scalarText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\*/g, '').trim();
}

function fieldBlocks(fields: UatField[], key: string): Block[] {
  const field = fields.find((f) => f.key === key);
  return field && field.value.trim() !== '' ? arrayOf<Block>(field.blocks) : [];
}

function fieldValue(fields: UatField[], key: string): string | null {
  const field = fields.find((f) => f.key === key);
  return field ? nonEmpty(field.value) : null;
}

// ---------------------------------------------------------------------------
// Dates and spans (UTC, by hand)
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateOf(text: string): Date | null {
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "21 Jul 2026 · 09:12" — the time only when the value carries one that is not midnight; a value
 * that is not a date is returned as written. */
export function formatStamp(text: string): string {
  const date = dateOf(text);
  if (date === null) return text;
  const day = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  const carriesTime = text.includes('T') || text.includes(':');
  const midnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  return carriesTime && !midnight ? `${day} · ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}` : day;
}

/** "35 min", "1h 35m", "11 days"; null when either stamp is not a date or they are not in order. */
export function spanText(from: string, to: string): string | null {
  const a = dateOf(from);
  const b = dateOf(to);
  if (a === null || b === null) return null;
  const minutes = Math.floor(b.getTime() / 60000) - Math.floor(a.getTime() / 60000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 2880) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.round(minutes / 1440)} days`;
}

// ---------------------------------------------------------------------------
// Phase slug
// ---------------------------------------------------------------------------

/** "03-file-browsing" -> "3", "02.1-x" -> "2.1" (leading zeros stripped, as the other covers do). */
function phaseNumber(phase: string): string | null {
  let i = 0;
  while (i < phase.length && phase[i] >= '0' && phase[i] <= '9') i += 1;
  if (i === 0) return null;
  let whole = phase.slice(0, i).replace(/^0+(?=\d)/, '');
  if (phase[i] === '.') {
    let j = i + 1;
    while (j < phase.length && phase[j] >= '0' && phase[j] <= '9') j += 1;
    if (j > i + 1) whole = `${whole}.${phase.slice(i + 1, j)}`;
  }
  return whole;
}

/** "03-file-browsing" -> "File browsing"; null when no words remain. */
function phaseTitle(phase: string): string | null {
  let i = 0;
  while (i < phase.length && ((phase[i] >= '0' && phase[i] <= '9') || phase[i] === '.')) i += 1;
  const rest = i > 0 && (i === phase.length || phase[i] === '-') ? phase.slice(i + 1) : phase;
  const words = rest.split('-').join(' ').trim();
  return words === '' ? null : words[0].toUpperCase() + words.slice(1);
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function sourceOf(value: unknown): string[] {
  const items: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = scalarText(item);
      if (text !== null) items.push(text);
    }
  } else if (typeof value === 'string') {
    let text = value.trim();
    if (text.startsWith('[')) text = text.slice(1);
    if (text.endsWith(']')) text = text.slice(0, -1);
    for (const part of text.split(',')) {
      const piece = part.trim();
      if (piece !== '') items.push(piece);
    }
  }
  return items;
}

function headingIds(input: ViewInput): Map<string, string> {
  const ids = new Map<string, string>();
  for (const heading of input.headings ?? []) {
    if (heading.depth !== 2) continue;
    const key = normalizeHeading(heading.text);
    if (!ids.has(key)) ids.set(key, heading.id);
  }
  for (const group of input.groups ?? []) {
    if (group.heading === null || group.id === null) continue;
    const key = normalizeHeading(group.heading);
    if (!ids.has(key)) ids.set(key, group.id);
  }
  return ids;
}

function resultLabel(result: UatResult, raw: string): string {
  if (result !== 'other') return RESULT_LABEL[result];
  const text = plain(raw);
  if (text === '') return 'Unrecognised';
  return text.length > 24 ? text.slice(0, 24) : text;
}

const KEYWORDS = new Set(['pass', 'passed', 'issue', 'pending', 'skip', 'skipped', 'blocked', 'block', 'fail', 'failed', 'closed']);

function rawResultOf(test: UatTest): string | null {
  const raw = stringOr(test.resultRaw, '').trim();
  if (raw === '') return null;
  const bare = plain(raw).replace(/^\[|\]$/g, '').trim().toLowerCase();
  if (test.result !== 'other' && KEYWORDS.has(bare)) return null;
  return raw;
}

const SHOWN_FIELDS = new Set(['expected', 'result', 'reported', 'severity', 'blocked_by', 'reason']);

function moreOf(test: UatTest): ComposedUatMore[] {
  const more: ComposedUatMore[] = [];
  const lead = arrayOf<Block>(test.lead);
  if (lead.length > 0) more.push({ label: '', blocks: lead });
  for (const field of arrayOf<UatField>(test.fields)) {
    if (SHOWN_FIELDS.has(field.key)) continue;
    const blocks = arrayOf<Block>(field.blocks);
    if (blocks.length === 0) continue;
    more.push({ label: field.key.split('_').join(' '), blocks });
  }
  return more;
}

/** Summary comparison: `accepted` counts toward pass (a "closed …" result is a pass here). */
function mismatchOf(summary: Record<string, string> | null, counts: ComposedUatCounts): string | null {
  if (!summary || typeof summary !== 'object') return null;
  const number = (key: string): number => (typeof summary[key] === 'string' ? Number(summary[key]) : Number.NaN);
  const accepted = number('accepted');
  const doc: Record<Exclude<UatResult, 'other'>, number> = {
    pass: number('passed') + (Number.isNaN(accepted) ? 0 : accepted),
    issue: number('issues'),
    blocked: number('blocked'),
    skipped: number('skipped'),
    pending: number('pending'),
  };
  const differing = COUNTED.filter((result) => !Number.isNaN(doc[result]) && doc[result] !== counts[result]);
  if (differing.length === 0) return null;
  const said = differing.map((r) => `${doc[r]} ${RESULT_LABEL[r].toLowerCase()}`).join(', ');
  const counted = differing.map((r) => `${counts[r]}`).join(', ');
  return `The doc's Summary says ${said} — counted from the tests: ${counted}`;
}

function anchorsFor(tests: UatTest[]): string[] {
  const seen = new Map<number, number>();
  return tests.map((test) => {
    const times = seen.get(test.number) ?? 0;
    seen.set(test.number, times + 1);
    return times === 0 ? `uat-test-${test.number}` : `uat-test-${test.number}-${times + 1}`;
  });
}

const RESOLUTION_KEYS = ['resolved_by', 'resolved_at', 'reverified_at', 'reverify', 'fix', 'fix_deployed'];
const GAP_PLACED = new Set([
  'gap_id',
  'truth',
  'status',
  'reason',
  'severity',
  'test',
  'root_cause',
  'artifacts',
  'missing',
  'debug_session',
  ...RESOLUTION_KEYS,
]);

function userReportedStripped(reason: string): string {
  const prefix = 'user reported:';
  return reason.toLowerCase().startsWith(prefix) ? reason.slice(prefix.length).trim() : reason;
}

function gapsOf(session: UatSession, tests: ComposedUatTest[]): ComposedUatGaps {
  const raw = session.gaps;
  const defaultLine = 'No gaps — no test reported an issue.';
  const author = nonEmpty(raw?.lead);
  if (raw && raw.mode === 'items' && arrayOf(raw.items).length > 0) {
    const anchors = new Map(tests.map((t) => [String(t.n), t.anchorId]));
    const items: ComposedUatGapItem[] = arrayOf<{
      values: Record<string, string>;
      artifacts: UatGapArtifact[];
      missing: string[];
    }>(raw.items).map((item, index) => {
      const values = item.values && typeof item.values === 'object' ? item.values : {};
      const artifacts = arrayOf<UatGapArtifact>(item.artifacts);
      const missing = arrayOf<string>(item.missing);
      const statusText = nonEmpty(values.status) ?? '—';
      const status = { label: statusText, tone: gapStatusTone(statusText) };
      const severityText = nonEmpty(values.severity);
      const rootCause = nonEmpty(values.root_cause);
      const debugSession = nonEmpty(values.debug_session);
      const resolved = status.tone === 'complete';
      const hasResolution = RESOLUTION_KEYS.some((key) => nonEmpty(values[key]) !== null);
      const reason = nonEmpty(values.reason);
      const test = nonEmpty(values.test);
      return {
        index,
        anchorId: `uat-gap-${index}`,
        gapId: nonEmpty(values.gap_id) ?? String(index + 1),
        truth: nonEmpty(values.truth) ?? '',
        status,
        severity: severityText ? { value: severityText, tone: severityTone(severityText) } : null,
        test,
        testAnchor: test ? (anchors.get(test) ?? null) : null,
        diagnosed: rootCause !== null || artifacts.length > 0 || missing.length > 0 || debugSession !== null,
        reason: reason ? userReportedStripped(reason) : null,
        rootCause,
        artifacts,
        missing,
        missingDone: resolved,
        debugSession,
        resolution: hasResolution
          ? {
              resolvedAt: nonEmpty(values.resolved_at),
              reverifiedAt: nonEmpty(values.reverified_at),
              deployedAt:
                nonEmpty(values.fix_deployed) !== nonEmpty(values.resolved_at) ? nonEmpty(values.fix_deployed) : null,
              resolvedBy: nonEmpty(values.resolved_by),
              fix: nonEmpty(values.fix),
              reverify: nonEmpty(values.reverify),
            }
          : null,
        alsoInSource: Object.keys(values).filter((key) => !GAP_PLACED.has(key) && nonEmpty(values[key]) !== null),
      };
    });
    const open = items.filter((item) => item.status.tone !== 'complete').length;
    return {
      mode: 'register',
      aside: `${items.length} · ${open} open`,
      lead: author,
      emptyLine: defaultLine,
      items,
      cards: [],
    };
  }
  if (raw && raw.mode === 'prose' && arrayOf(raw.cards).length > 0) {
    const cards = arrayOf<ComposedUatCard>(raw.cards).map((card) => ({
      title: nonEmpty(card.title),
      blocks: arrayOf<Block>(card.blocks),
    }));
    return { mode: 'cards', aside: String(cards.length), lead: author, emptyLine: defaultLine, items: [], cards };
  }
  return { mode: 'none', aside: 'none', lead: null, emptyLine: author ?? defaultLine, items: [], cards: [] };
}

export function composeUatSession(input: ViewInput): ComposedUatSession | null {
  const raw = input.structured?.uat as Partial<UatSession> | undefined | null;
  if (!raw || typeof raw !== 'object') return null;
  const rawTests = arrayOf<UatTest>(raw.tests);
  if (rawTests.length === 0) return null;
  const fm = input.frontmatter ?? {};

  // ---- intro ---------------------------------------------------------------------------------
  const statusText = scalarText(fm.status) ?? '';
  const status = statusOf(statusText);
  const phase = scalarText(fm.phase);
  const number = phase === null ? null : phaseNumber(phase);
  const startedRaw = scalarText(fm.started);
  const updatedRaw = scalarText(fm.updated);
  const started = startedRaw === null ? null : formatStamp(startedRaw);
  const updated = updatedRaw === null ? null : formatStamp(updatedRaw);
  const intro: ComposedUatIntro = {
    eyebrow: number === null ? 'User acceptance test' : `User acceptance test · Phase ${number}`,
    title: phase === null ? null : phaseTitle(phase),
    status,
    started,
    updated,
    gap: startedRaw !== null && updatedRaw !== null ? spanText(startedRaw, updatedRaw) : null,
    source: sourceOf(fm.source),
  };

  // ---- current test --------------------------------------------------------------------------
  const lowerStatus = statusText.toLowerCase();
  const inProgress = lowerStatus.includes('testing') || lowerStatus.includes('partial');
  const rawCurrent = raw.current && typeof raw.current === 'object' ? raw.current : null;
  const currentNumberText = rawCurrent ? /\d+/.exec(stringOr(rawCurrent.number, '').slice(0, 20)) : null;
  const nowN = currentNumberText ? Number(currentNumberText[0]) : null;
  const live =
    inProgress &&
    rawCurrent !== null &&
    nonEmpty(rawCurrent.name) !== null &&
    nowN !== null &&
    !stringOr(rawCurrent.awaiting, '').trim().toLowerCase().startsWith('none');

  // ---- tests, squares, counts ----------------------------------------------------------------
  const anchors = anchorsFor(rawTests);
  const counts: ComposedUatCounts = { pass: 0, issue: 0, blocked: 0, skipped: 0, pending: 0, other: 0 };
  const squares: ComposedUatSquare[] = [];
  const tests: ComposedUatTest[] = rawTests.map((test, index) => {
    const result: UatResult = (RESULT_ORDER as readonly string[]).includes(test.result) ? test.result : 'other';
    counts[result] += 1;
    const resultRaw = stringOr(test.resultRaw, '');
    const label = resultLabel(result, resultRaw);
    const isNow = live && nowN === test.number;
    const name = stringOr(test.name, '');
    const fields = arrayOf<UatField>(test.fields);
    const expectedField = fields.find((f) => f.key === 'expected');
    const severityText = fieldValue(fields, 'severity');
    const reasonBlocks = fieldBlocks(fields, 'reason');
    squares.push({
      n: test.number,
      anchorId: anchors[index],
      result,
      tone: RESULT_TONE[result],
      label,
      isNow,
      title: `${test.number}. ${plain(name)} — ${label}`,
    });
    return {
      n: test.number,
      anchorId: anchors[index],
      name,
      result,
      tone: RESULT_TONE[result],
      label,
      isNow,
      expectedBlocks: fieldBlocks(fields, 'expected'),
      expectedLong: (expectedField ? stringOr(expectedField.value, '').length : 0) > 320,
      rawResult: rawResultOf({ ...test, result }),
      reported: fieldBlocks(fields, 'reported'),
      severity: severityText ? { value: severityText, tone: severityTone(severityText) } : null,
      blockedBy: fieldValue(fields, 'blocked_by'),
      reason: reasonBlocks.length > 0 ? { blocks: reasonBlocks, quiet: result === 'skipped' } : null,
      more: moreOf(test),
    };
  });
  const total = tests.length;
  const nowTest = live ? tests.find((t) => t.n === nowN) : undefined;

  const currentLine = nonEmpty(raw.currentLine);
  const sayingComplete = currentLine !== null && currentLine.toLowerCase().includes('testing complete');
  const current: ComposedUatCurrent =
    live && rawCurrent && nowN !== null
      ? {
          live: true,
          n: nowN,
          padded: String(nowN).padStart(2, '0'),
          total,
          name: stringOr(rawCurrent.name, ''),
          expectedBlocks: arrayOf<Block>(rawCurrent.expectedBlocks),
          awaiting: nonEmpty(rawCurrent.awaiting) ?? 'response',
          updated,
          anchorId: nowTest?.anchorId ?? `uat-test-${nowN}`,
        }
      : {
          live: false,
          headline: inProgress && !sayingComplete ? 'Testing in progress' : 'Testing complete',
          passed: counts.pass,
          total,
          line: currentLine !== null && !sayingComplete ? currentLine : null,
          updated,
        };

  // ---- gaps, extras, source-only -------------------------------------------------------------
  const summary = raw.summary && typeof raw.summary === 'object' ? (raw.summary as Record<string, string>) : null;
  const ids = headingIds(input);
  const extras: ComposedUatExtra[] = arrayOf<{ heading: string; blocks: Block[] }>(raw.extras).map((extra, index) => ({
    id: `uat-extra-${index}`,
    heading: stringOr(extra.heading, ''),
    blocks: arrayOf<Block>(extra.blocks),
  }));
  const sourceOnly: ComposedUatSourceOnly[] = [];
  if (rawCurrent && nonEmpty(rawCurrent.name) !== null && !live) {
    const fromSection = stringOr(rawCurrent.fromSection, 'Current Test');
    sourceOnly.push({
      label: `${fromSection} (resolved current test)`,
      targetId: ids.get(normalizeHeading(fromSection)) ?? null,
      interactive: true,
    });
  }
  if (summary) {
    sourceOnly.push({ label: 'Summary block', targetId: ids.get('summary') ?? null, interactive: true });
  }
  sourceOnly.push({ label: 'Frontmatter', targetId: null, interactive: true });
  if (typeof raw.commentCount === 'number' && raw.commentCount > 0) {
    sourceOnly.push({ label: 'Template comments', targetId: null, interactive: false });
  }

  return {
    intro,
    current,
    squares,
    counts,
    total,
    mismatch: mismatchOf(summary, counts),
    testsNote: arrayOf<Block>(raw.testsNote),
    tests,
    gaps: gapsOf(raw as UatSession, tests),
    extras,
    sourceOnly,
  };
}
