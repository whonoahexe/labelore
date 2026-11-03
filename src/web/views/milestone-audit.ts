// The milestone audit composer (Phase 9, 09-14, VIEW-08): a pure `ViewInput` -> `ComposedMilestoneAudit` merge
// of `structured.audit` (the tolerant reading the handler made of the audit's frontmatter and its Status and
// Audited prose lines). The verdict is the first thing on the page: its label and tone sit in the header's meta
// row beside "Audited {date}". A verdict the file does not state is never invented: an absent status reads
// "Verdict not stated" and an unrecognised one reads as written, both in the quiet tone (the one prohibition
// of this plan). Under the cover sit the sections, each present only when the file has something for it:
//   Scores   - one tile per `scores` key in the author's order: the value, and a segmented bar (one segment per
//              unit up to 24, a proportional bar above that or for a percentage); a value it cannot read is
//              shown verbatim with no bar.
//   Gaps     - Requirements, Integration and Flows (other keys after); an empty group reads "No gaps" in the
//              complete tone, never a blank section.
//   Tech debt - grouped by phase in file order; a closed item is told apart (complete) and left out of the total.
//   Nyquist  - one chip row of the phase lists (empty lists omitted).
//   Other keys - every frontmatter key nothing above claimed, as labelled rows, so nothing is dropped silently.
// The body renders below as the folded "Audit narrative", open when the audit holds no scores, gaps or debt
// (the old prose-only shape). No DOM, no filesystem access, no rendering and no regular expression -
// `milestone-audit-components.tsx` is the only consumer. Returns `null` when the projection is missing, so an
// audit the handler could not shape keeps the promoted-section view.
// T-09-29: every string is author text rendered as React text by the components.
import type { ViewInput } from './manifest.ts';
import { formatStamp } from './uat-session.ts';

export type AuditTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

export interface ComposedAuditVerdict {
  label: string;
  tone: AuditTone;
}

export interface ComposedAuditIntro {
  eyebrow: 'Milestone audit';
  /** The milestone name, else the version, else null (the page then uses the document title). */
  title: string | null;
  verdict: ComposedAuditVerdict;
  /** The audited date formatted ("15 Mar 2026"), or as written when it is no date; null when none is stated. */
  audited: string | null;
}

/** A labelled value (a gap's extra field, a debt item's extra field, a row of an unclaimed key). */
export interface ComposedAuditField {
  /** Humanised ("closed by"); empty for a row that is just a value. */
  label: string;
  value: string;
  /** True when the value needs the 3-line clamp and its "Read more". */
  long: boolean;
}

export interface ComposedAuditScore {
  key: string;
  label: string;
  /** "34/34", "75%", "12", or the value as written when it cannot be read. */
  value: string;
  /** False for a value this reader could not read: it is shown verbatim, at Body size, with no bar. */
  read: boolean;
  /** The tile's square: complete when every unit is met, in-flight when some are, missing when none, else quiet. */
  tone: AuditTone;
  /** One tone per unit when the denominator is 1 to 24; null otherwise. */
  segments: AuditTone[] | null;
  /** 0 to 100 for the proportional bar (a denominator above 24, or a percentage); null otherwise. */
  fill: number | null;
}

export interface ComposedAuditGap {
  id: string | null;
  text: string;
  evidence: string | null;
  status: string | null;
  fields: ComposedAuditField[];
  /** True when the statement needs the 3-line clamp. */
  long: boolean;
  /** True when the evidence needs the 3-line clamp. */
  evidenceLong: boolean;
}

export interface ComposedAuditGapGroup {
  key: string;
  label: string;
  count: number;
  /** `complete` for an empty group, `missing` for one with gaps. */
  tone: 'complete' | 'missing';
  /** "No gaps" for an empty group, else null. */
  emptyText: string | null;
  items: ComposedAuditGap[];
}

export interface ComposedAuditDebtItem {
  id: string | null;
  /** The status word ("deferred", "closed"), or null when none is stated. */
  status: string | null;
  tone: AuditTone;
  closed: boolean;
  text: string;
  fields: ComposedAuditField[];
  long: boolean;
}

export interface ComposedAuditDebtGroup {
  /** The phase as written. */
  phase: string;
  /** The mono phase number split from a slug ("02" of "02-shed-inventory-health"), else null. */
  number: string | null;
  /** The rest of the slug, or the phase as written when it has no number. */
  name: string;
  count: number;
  items: ComposedAuditDebtItem[];
}

export interface ComposedAuditDebt {
  /** "14 items across 5 phases". */
  heading: string;
  /** "3 closed" when some listed items are closed, else null. */
  closedNote: string | null;
  groups: ComposedAuditDebtGroup[];
}

export interface ComposedAuditChip {
  key: 'compliant' | 'partial' | 'notValidated' | 'missing' | 'overall';
  label: string;
  /** The phase list, "01, 03"; the overall value for the overall chip. */
  phases: string;
  tone: AuditTone;
}

export interface ComposedAuditNyquist {
  chips: ComposedAuditChip[];
  reason: string | null;
}

export interface ComposedAuditExtra {
  /** The key, humanised. */
  label: string;
  rows: ComposedAuditField[];
}

export interface ComposedMilestoneAudit {
  intro: ComposedAuditIntro;
  scores: ComposedAuditScore[] | null;
  gaps: ComposedAuditGapGroup[] | null;
  debt: ComposedAuditDebt | null;
  nyquist: ComposedAuditNyquist | null;
  extras: ComposedAuditExtra[];
  /** True when the audit holds no scores, gaps or debt (the old prose-only shape): the narrative is the page. */
  narrativeOpen: boolean;
}

export const VERDICT_NOT_STATED = 'Verdict not stated';
export const NO_GAPS = 'No gaps';
/** The most units a score draws as one segment each; above it the bar is proportional. */
export const SEGMENT_LIMIT = 24;
/** Text longer than this (or holding a line break) gets the 3-line clamp and its "Read more". */
export const LONG_TEXT = 160;

const VERDICT_LABELS: Readonly<Record<string, ComposedAuditVerdict>> = {
  passed: { label: 'Passed', tone: 'complete' },
  tech_debt: { label: 'Tech debt only', tone: 'in-flight' },
  gaps_found: { label: 'Gaps found', tone: 'missing' },
};

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function numberOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isLong(...texts: (string | null)[]): boolean {
  return texts.some((text) => text !== null && (text.length > LONG_TEXT || text.includes('\n')));
}

/** "tech_debt_reconciliation" -> "Tech debt reconciliation"; hyphens stay, so an id like "TGT-08" is untouched. */
export function humanize(key: string): string {
  let spaced = '';
  for (const ch of key) spaced += ch === '_' ? ' ' : ch;
  const text = spaced.trim();
  return text === '' ? key : text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

function verdictOf(audit: Record<string, unknown>): ComposedAuditVerdict {
  const verdict = recordOf(audit.verdict);
  const status = verdict === null ? null : textOf(verdict.status);
  if (status !== null && Object.prototype.hasOwnProperty.call(VERDICT_LABELS, status)) return VERDICT_LABELS[status];
  const raw = verdict === null ? null : textOf(verdict.raw);
  if (raw !== null) return { label: raw, tone: 'quiet' };
  return { label: VERDICT_NOT_STATED, tone: 'quiet' };
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

function fieldsOf(value: unknown): ComposedAuditField[] {
  const fields: ComposedAuditField[] = [];
  for (const entry of listOf(value)) {
    const row = recordOf(entry);
    if (row === null) continue;
    const label = typeof row.label === 'string' ? row.label : '';
    const text = textOf(row.value);
    if (text !== null) fields.push({ label: label === '' ? '' : humanize(label), value: text, long: isLong(text) });
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

function clampPercent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

function toneOfFraction(n: number, m: number): AuditTone {
  if (m <= 0) return 'quiet';
  if (n >= m) return 'complete';
  return n <= 0 ? 'missing' : 'in-flight';
}

function scoreModel(entry: Record<string, unknown>): ComposedAuditScore | null {
  const key = textOf(entry.key);
  if (key === null) return null;
  const n = numberOf(entry.n);
  const m = numberOf(entry.m);
  const percent = numberOf(entry.percent);
  const raw = typeof entry.raw === 'string' ? entry.raw : '';
  const label = humanize(key);
  if (n !== null && m !== null) {
    const tone = toneOfFraction(n, m);
    if (m >= 1 && m <= SEGMENT_LIMIT) {
      const met = Math.min(Math.max(Math.floor(n), 0), m);
      const filled: AuditTone = tone === 'complete' ? 'complete' : tone === 'in-flight' ? 'in-flight' : 'missing';
      const segments: AuditTone[] = [];
      for (let i = 0; i < m; i += 1) segments.push(i < met ? filled : 'missing');
      return { key, label, value: `${n}/${m}`, read: true, tone, segments, fill: null };
    }
    return { key, label, value: `${n}/${m}`, read: true, tone, segments: null, fill: m > 0 ? clampPercent((n / m) * 100) : null };
  }
  if (percent !== null) {
    return {
      key,
      label,
      value: raw === '' ? `${percent}%` : raw,
      read: true,
      tone: toneOfFraction(percent, 100),
      segments: null,
      fill: clampPercent(percent),
    };
  }
  if (n !== null) return { key, label, value: raw === '' ? String(n) : raw, read: true, tone: 'quiet', segments: null, fill: null };
  return { key, label, value: raw, read: false, tone: 'quiet', segments: null, fill: null };
}

function scoresOf(audit: Record<string, unknown>): ComposedAuditScore[] | null {
  const scores: ComposedAuditScore[] = [];
  for (const entry of listOf(audit.scores)) {
    const row = recordOf(entry);
    const model = row === null ? null : scoreModel(row);
    if (model !== null) scores.push(model);
  }
  return scores.length === 0 ? null : scores;
}

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

function gapOf(entry: Record<string, unknown>): ComposedAuditGap {
  const text = typeof entry.text === 'string' ? entry.text : '';
  const evidence = textOf(entry.evidence);
  return {
    id: textOf(entry.id),
    text,
    evidence,
    status: textOf(entry.status),
    fields: fieldsOf(entry.fields),
    long: isLong(text),
    evidenceLong: isLong(evidence),
  };
}

function gapsOf(audit: Record<string, unknown>): ComposedAuditGapGroup[] | null {
  const groups: ComposedAuditGapGroup[] = [];
  const source = audit.gaps;
  if (!Array.isArray(source)) return null;
  for (const entry of source) {
    const group = recordOf(entry);
    const key = group === null ? null : textOf(group.key);
    if (group === null || key === null) continue;
    const items: ComposedAuditGap[] = [];
    for (const item of listOf(group.items)) {
      const row = recordOf(item);
      if (row !== null) items.push(gapOf(row));
    }
    const empty = items.length === 0;
    groups.push({
      key,
      label: humanize(key),
      count: items.length,
      tone: empty ? 'complete' : 'missing',
      emptyText: empty ? NO_GAPS : null,
      items,
    });
  }
  return groups.length === 0 ? null : groups;
}

// ---------------------------------------------------------------------------
// Tech debt
// ---------------------------------------------------------------------------

const QUIET_STATUSES: readonly string[] = ['advisory', 'deferred', 'skipped by design'];

function debtToneOf(status: string | null, closed: boolean): AuditTone {
  if (closed) return 'complete';
  if (status !== null && QUIET_STATUSES.includes(status)) return 'quiet';
  return 'in-flight';
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** "02-shed-inventory-health" -> "02" and "shed-inventory-health"; "2.1-hotfix" -> "2.1" and "hotfix". A phase with
 * no leading number, or nothing after it, is its own name. */
function splitPhase(phase: string): { number: string | null; name: string } {
  let end = 0;
  while (end < phase.length && isDigit(phase[end])) end += 1;
  if (end === 0) return { number: null, name: phase };
  if (phase[end] === '.' && end + 1 < phase.length && isDigit(phase[end + 1])) {
    end += 1;
    while (end < phase.length && isDigit(phase[end])) end += 1;
  }
  if (phase[end] !== '-' || end + 1 >= phase.length) return { number: null, name: phase };
  return { number: phase.slice(0, end), name: phase.slice(end + 1) };
}

function debtItemOf(entry: Record<string, unknown>): ComposedAuditDebtItem {
  const text = typeof entry.text === 'string' ? entry.text : '';
  const status = textOf(entry.status);
  const closed = entry.closed === true;
  const fields = fieldsOf(entry.fields);
  return {
    id: textOf(entry.id),
    status,
    tone: debtToneOf(status, closed),
    closed,
    text,
    fields,
    long: isLong(text) || fields.some((field) => field.long),
  };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function debtOf(audit: Record<string, unknown>): ComposedAuditDebt | null {
  if (!Array.isArray(audit.techDebt)) return null;
  const groups: ComposedAuditDebtGroup[] = [];
  let open = 0;
  let closed = 0;
  for (const entry of audit.techDebt) {
    const group = recordOf(entry);
    const phase = group === null ? null : textOf(group.phase);
    if (group === null || phase === null) continue;
    const items: ComposedAuditDebtItem[] = [];
    for (const item of listOf(group.items)) {
      const row = recordOf(item);
      if (row !== null) items.push(debtItemOf(row));
    }
    if (items.length === 0) continue;
    for (const item of items) {
      if (item.closed) closed += 1;
      else open += 1;
    }
    const split = splitPhase(phase);
    groups.push({ phase, number: split.number, name: split.name, count: items.length, items });
  }
  if (groups.length === 0) return null;
  return {
    heading: `${plural(open, 'item', 'items')} across ${plural(groups.length, 'phase', 'phases')}`,
    closedNote: closed > 0 ? `${closed} closed` : null,
    groups,
  };
}

// ---------------------------------------------------------------------------
// Nyquist
// ---------------------------------------------------------------------------

function phaseListOf(value: unknown): string {
  return listOf(value)
    .filter((item): item is string => typeof item === 'string' && item !== '')
    .join(', ');
}

function nyquistOf(audit: Record<string, unknown>): ComposedAuditNyquist | null {
  const nyquist = recordOf(audit.nyquist);
  if (nyquist === null) return null;
  const chips: ComposedAuditChip[] = [];
  const lists: [ComposedAuditChip['key'], string, string, AuditTone][] = [
    ['compliant', 'Compliant', 'compliant', 'complete'],
    ['partial', 'Partial', 'partial', 'in-flight'],
    ['notValidated', 'Not validated', 'notValidated', 'missing'],
    ['missing', 'Missing', 'missing', 'quiet'],
  ];
  for (const [key, label, field, tone] of lists) {
    const phases = phaseListOf(nyquist[field]);
    if (phases !== '') chips.push({ key, label, phases, tone });
  }
  const overall = textOf(nyquist.overall);
  if (overall !== null) chips.push({ key: 'overall', label: 'Overall', phases: humanize(overall).toLowerCase(), tone: 'quiet' });
  const reason = textOf(nyquist.reason);
  return chips.length === 0 && reason === null ? null : { chips, reason };
}

// ---------------------------------------------------------------------------
// Unclaimed keys
// ---------------------------------------------------------------------------

function extrasOf(audit: Record<string, unknown>): ComposedAuditExtra[] {
  const extras: ComposedAuditExtra[] = [];
  for (const entry of listOf(audit.extras)) {
    const extra = recordOf(entry);
    const key = extra === null ? null : textOf(extra.key);
    if (extra === null || key === null) continue;
    const rows = fieldsOf(extra.rows);
    extras.push({ label: humanize(key), rows: rows.length > 0 ? rows : [{ label: '', value: 'Empty', long: false }] });
  }
  return extras;
}

export function composeMilestoneAudit(input: ViewInput): ComposedMilestoneAudit | null {
  const audit = recordOf(input.structured.audit);
  if (audit === null) return null;
  const audited = textOf(audit.audited);
  const scores = scoresOf(audit);
  const gaps = gapsOf(audit);
  const debt = debtOf(audit);
  return {
    intro: {
      eyebrow: 'Milestone audit',
      title: textOf(audit.milestoneName) ?? textOf(audit.milestone),
      verdict: verdictOf(audit),
      audited: audited === null ? null : formatStamp(audited),
    },
    scores,
    gaps,
    debt,
    nyquist: nyquistOf(audit),
    extras: extrasOf(audit),
    narrativeOpen: scores === null && gaps === null && debt === null,
  };
}
