// The DEBUG page composer (quick-261018-j5h, sketch 023 A: the case file): a pure `ViewInput` ->
// `ComposedDebugCase` merge of the frontmatter and `structured.debug` (built by
// `src/planning-repo/handlers/debug-session.ts`, with `slug` and `archived` added by the handler). It
// decides the head (eyebrow, humanized slug title, opened / updated stamps, Archived), the status badge,
// the reported quote and facts line, the status-adaptive lead (open, awaiting a check, diagnosed,
// resolved) with its causes, fix, verification chips and file chips, and the resolution parts for the
// "Resolution in full" dialog. No DOM, no filesystem access, no rendering - `debug-case-components.tsx`
// is the only consumer. The module imports types only from the handler module. Returns `null` when the
// projection is missing or the session has nothing to show; every other junk value degrades to an
// omitted part (T-j5h-03). Dates are read literally from the text (no time-zone shift) so Node and the
// browser agree.
// T-j5h-06: the only navigation targets are heading ids taken from `input.headings`, or null; no URL is
// built from document text, and no RegExp is built from it either.
import type { DebugEvidenceTag, DebugValue } from '../../planning-repo/handlers/debug-session.ts';
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export type DebugTone = 'complete' | 'in-flight' | 'quiet';
export type DebugVariant = 'open' | 'awaiting' | 'diagnosed' | 'resolved';

export const OPEN_STATUSES: readonly string[] = ['gathering', 'investigating', 'fixing', 'verifying'];

/** Label and tone per recognised status. Any other value is humanized and quiet. */
export const STATUS: Record<string, { label: string; tone: DebugTone }> = {
  resolved: { label: 'Resolved', tone: 'complete' },
  awaiting_human_verify: { label: 'Waiting on you', tone: 'in-flight' },
  diagnosed: { label: 'Diagnosed · not fixed', tone: 'in-flight' },
};

export const TAG_LABEL = {
  confirms: 'Confirms',
  eliminates: 'Rules out',
  fix: 'Fix',
  finding: 'Finding',
} as const;

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface ComposedDebugText {
  /** Whitespace-squashed text for the line; empty when the session has none. */
  text: string;
  value: DebugValue;
}

export interface ComposedDebugCause {
  label: string;
  text: string;
  /** True when the line is shorter than the cause: its More button always shows. */
  cut: boolean;
  value: DebugValue;
}

export interface ComposedDebugFix {
  label: string;
  text: string;
  cut: boolean;
  notApplied: boolean;
  value: DebugValue;
}

export interface ComposedDebugChip {
  name: string;
  result: 'pass' | 'fail' | 'open';
}

export interface ComposedDebugVerification {
  kicker: string;
  chips: ComposedDebugChip[] | null;
  text: string;
}

export interface ComposedDebugFile {
  path: string;
  name: string;
  title: string;
}

export interface ComposedDebugLead {
  variant: DebugVariant;
  tone: DebugTone;
  kicker: string | null;
  /** Open leads. */
  hypothesis: ComposedDebugText | null;
  test: ComposedDebugText | null;
  expecting: ComposedDebugText | null;
  /** "Next action" (open) or "What you need to check" (awaiting). */
  next: { label: string; text: string } | null;
  causes: { kicker: string; items: ComposedDebugCause[] } | null;
  fix: ComposedDebugFix | null;
  verification: ComposedDebugVerification | null;
  files: { kicker: string; items: ComposedDebugFile[] } | null;
  /** Show "The full root cause, fix and verification". */
  resolutionLink: boolean;
}

export interface ComposedDebugResolution {
  parts: { label: string; value: DebugValue }[];
  files: { path: string; note: string | null }[];
  targetId: string | null;
}

export interface ComposedDebugHead {
  eyebrow: string;
  /** The humanized slug, or null (the view then uses the artifact title). */
  title: string | null;
  /** "16 Sep 2026", or null. */
  opened: string | null;
  /** "18:55", "12 Oct 2026 · 22:10", or null. */
  updated: string | null;
  archived: boolean;
}

export interface ComposedDebugSymptoms {
  expected: { value: DebugValue } | null;
  actual: { value: DebugValue } | null;
  /** The other symptom fields, labelled by their humanized key. */
  rest: { label: string; value: DebugValue }[];
  targetId: string | null;
}

export type DebugColumnKey = 'confirmed' | 'ruled' | 'considered';

export interface ComposedDebugSuspect {
  kind: string | null;
  text: string;
  /** What disproved a ruled-out suspect. */
  why: string | null;
}

export interface ComposedDebugSuspects {
  /** The "N considered" aside. */
  total: number;
  columns: { key: DebugColumnKey; label: string; items: ComposedDebugSuspect[] }[];
}

export type DebugEvidenceFilter = DebugEvidenceTag | 'all';

export interface ComposedDebugEvidenceEntry {
  /** 1-based document position across all rounds. */
  no: number;
  ts: string;
  round: string;
  tag: DebugEvidenceTag;
  checked: string;
  found: string;
  text: string;
  implication: string;
}

export interface ComposedDebugEvidence {
  entries: ComposedDebugEvidenceEntry[];
  counts: Record<DebugEvidenceTag, number>;
  total: number;
  defaultFilter: DebugEvidenceFilter;
  /** True when the entries span more than one section: round dividers show. */
  multiRound: boolean;
  targetId: string | null;
}

export interface ComposedDebugAlso {
  label: string;
  /** The full heading, for the tooltip. */
  title: string;
  targetId: string | null;
}

export interface ComposedDebugCase {
  head: ComposedDebugHead;
  status: { label: string; tone: DebugTone };
  trigger: { text: string; short: string | null } | null;
  facts: { label: string; value: string }[];
  lead: ComposedDebugLead;
  resolution: ComposedDebugResolution | null;
  symptoms: ComposedDebugSymptoms | null;
  suspects: ComposedDebugSuspects;
  evidence: ComposedDebugEvidence | null;
  also: ComposedDebugAlso[];
}

// ---------------------------------------------------------------------------
// Guarded readers
// ---------------------------------------------------------------------------

function rec(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStr(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function squash(text: string): string {
  return text.slice(0, 16000).replace(/\s+/g, ' ').trim();
}

const EMPTY_VALUE: DebugValue = { shape: 'blocks', blocks: [] };

function valueOf(raw: unknown): DebugValue {
  const v = rec(raw);
  if (v === null) return EMPTY_VALUE;
  if (v.shape === 'fields') {
    const fields: { label: string; blocks: Block[] }[] = [];
    for (const f of list(v.fields)) {
      const field = rec(f);
      const label = field === null ? null : asStr(field.label);
      if (field === null || label === null) continue;
      fields.push({ label, blocks: blocksOf(field.blocks) });
    }
    return { shape: 'fields', fields };
  }
  return { shape: 'blocks', blocks: blocksOf(v.blocks) };
}

function blocksOf(value: unknown): Block[] {
  const out: Block[] = [];
  for (const raw of list(value)) {
    const block = rec(raw);
    if (block === null) continue;
    if (block.kind === 'paragraph' && typeof block.text === 'string') out.push({ kind: 'paragraph', text: block.text });
    else if (block.kind === 'code' && typeof block.text === 'string') out.push({ kind: 'code', text: block.text });
    else if (block.kind === 'list' && Array.isArray(block.items)) {
      out.push({ kind: 'list', ordered: block.ordered === true, items: block.items.filter((i): i is string => typeof i === 'string') });
    } else if (block.kind === 'table' && Array.isArray(block.rows)) {
      const rows: Record<string, string>[] = [];
      for (const r of block.rows) {
        const row = rec(r);
        if (row === null) continue;
        const clean: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) if (typeof v === 'string') clean[k] = v;
        rows.push(clean);
      }
      out.push({ kind: 'table', rows });
    }
  }
  return out;
}

function humanize(text: string): string {
  const t = text.slice(0, 200).replace(/[_-]/g, ' ').trim();
  return t === '' ? t : t.charAt(0).toUpperCase() + t.slice(1);
}

function headingId(headings: ViewInput['headings'], text: string): string | null {
  if (!Array.isArray(headings)) return null;
  const wanted = normalizeHeading(text);
  for (const h of headings) {
    if (h && typeof h.text === 'string' && typeof h.id === 'string' && normalizeHeading(h.text) === wanted) return h.id;
  }
  return null;
}

/** The sketch's empty(): blank, "[]", or a value that starts "empty", "none" or "not applied". */
function isEmpty(value: string): boolean {
  const t = value.trim();
  if (t === '' || t.replace(/\s+/g, '') === '[]') return true;
  const lower = (t[0] === '(' ? t.slice(1, 20) : t.slice(0, 20)).toLowerCase();
  for (const word of ['empty', 'none', 'not applied']) {
    if (lower.startsWith(word)) {
      const next = lower[word.length];
      if (next === undefined || next < 'a' || next > 'z') return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Dates (read literally, no time-zone shift)
// ---------------------------------------------------------------------------

interface Stamp {
  /** "2026-09-16" or null. */
  date: string | null;
  /** "18:55", null for midnight or no time. */
  time: string | null;
  raw: string | null;
}

function isDigits(text: string): boolean {
  for (const ch of text) if (ch < '0' || ch > '9') return false;
  return text !== '';
}

function stampOf(value: unknown): Stamp {
  let text: string | null;
  if (value instanceof Date) text = Number.isNaN(value.getTime()) ? null : value.toISOString();
  else text = asStr(value);
  if (text === null) return { date: null, time: null, raw: null };
  const t = text.slice(0, 40);
  const shaped =
    t.length >= 10 && isDigits(t.slice(0, 4)) && t[4] === '-' && isDigits(t.slice(5, 7)) && t[7] === '-' && isDigits(t.slice(8, 10));
  if (!shaped) return { date: null, time: null, raw: t };
  const date = t.slice(0, 10);
  let time: string | null = null;
  if ((t[10] === 'T' || t[10] === ' ') && isDigits(t.slice(11, 13)) && t[13] === ':' && isDigits(t.slice(14, 16))) {
    time = t.slice(11, 16);
    if (time === '00:00') time = null;
  }
  return { date, time, raw: t };
}

function datesOf(created: unknown, updated: unknown): { opened: string | null; updated: string | null } {
  const c = stampOf(created);
  const u = stampOf(updated);
  const opened = c.date !== null ? formatStamp(c.date) : c.raw;
  let upd: string | null;
  if (u.date === null) upd = u.raw;
  else if (c.date !== null && u.date === c.date) upd = u.time;
  else upd = u.time !== null ? `${formatStamp(u.date)} · ${u.time}` : formatStamp(u.date);
  return { opened, updated: upd };
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

interface FieldRec {
  key: string;
  text: string;
  value: DebugValue;
}

function fieldsOf(value: unknown): FieldRec[] {
  const out: FieldRec[] = [];
  for (const raw of list(value)) {
    const f = rec(raw);
    if (f === null) continue;
    const key = typeof f.key === 'string' ? f.key : '';
    const text = typeof f.text === 'string' ? f.text : '';
    out.push({ key, text, value: valueOf(f.value) });
  }
  return out;
}

/** The last focus field whose key (lower-cased) is `key`. */
function focusField(focus: FieldRec[], key: string): FieldRec | null {
  let hit: FieldRec | null = null;
  for (const f of focus) if (f.key.toLowerCase() === key) hit = f;
  return hit;
}

function textOf(field: FieldRec | null): ComposedDebugText | null {
  if (field === null) return null;
  return { text: squash(field.text), value: field.value };
}

function statusOf(raw: unknown): { key: string; label: string; tone: DebugTone } {
  const text = asStr(raw);
  if (text === null) return { key: '', label: 'Unknown', tone: 'quiet' };
  const key = text.toLowerCase();
  const known = STATUS[key];
  if (known !== undefined) return { key, ...known };
  if (OPEN_STATUSES.includes(key)) return { key, label: humanize(key), tone: 'in-flight' };
  return { key, label: humanize(text), tone: 'quiet' };
}

function causesOf(value: unknown): ComposedDebugCause[] {
  const out: ComposedDebugCause[] = [];
  for (const raw of list(value)) {
    const c = rec(raw);
    if (c === null) continue;
    const text = asStr(c.text);
    if (text === null) continue;
    out.push({ label: asStr(c.label) ?? `Cause ${out.length + 1}`, text, cut: c.cut === true, value: valueOf(c.value) });
  }
  return out;
}

function chipsOf(value: unknown): ComposedDebugChip[] | null {
  if (!Array.isArray(value)) return null;
  const out: ComposedDebugChip[] = [];
  for (const raw of value) {
    const c = rec(raw);
    const name = c === null ? null : asStr(c.name);
    if (c === null || name === null) continue;
    out.push({ name, result: c.result === 'pass' || c.result === 'fail' ? c.result : 'open' });
  }
  return out.length > 0 ? out : null;
}

function baseName(path: string): string {
  const at = path.lastIndexOf('/');
  return at === -1 ? path : path.slice(at + 1);
}

function leadOf(
  status: { key: string; tone: DebugTone },
  focus: FieldRec[],
  resolution: Record<string, unknown> | null,
): ComposedDebugLead {
  const causes = causesOf(resolution?.causes);
  const fixRaw = rec(resolution?.fix);
  const verRaw = rec(resolution?.verification);
  const fileItems: ComposedDebugFile[] = [];
  const filesForModal: { path: string; note: string | null }[] = [];
  for (const raw of list(resolution?.files)) {
    const f = rec(raw);
    const path = f === null ? null : asStr(f.path);
    if (f === null || path === null) continue;
    const note = asStr(f.note);
    filesForModal.push({ path, note });
    fileItems.push({ path, name: baseName(path), title: note === null ? path : `${path} — ${note}` });
  }

  const hasRootCause = causes.length > 0;
  let variant: DebugVariant;
  if (OPEN_STATUSES.includes(status.key) || (!hasRootCause && status.key !== 'resolved')) variant = 'open';
  else if (status.key === 'awaiting_human_verify') variant = 'awaiting';
  else if (status.key === 'diagnosed') variant = 'diagnosed';
  else variant = 'resolved';

  const kicker =
    variant === 'open'
      ? 'Where it stands'
      : variant === 'awaiting'
        ? 'Fixed, waiting on your check'
        : variant === 'diagnosed'
          ? 'Root cause found · not fixed yet'
          : null;

  const nextField = focusField(focus, 'next_action');
  const nextText = nextField === null || isEmpty(nextField.text) ? '' : squash(nextField.text);
  const next =
    variant === 'open' && nextText !== ''
      ? { label: 'Next action', text: nextText }
      : variant === 'awaiting' && nextText !== ''
        ? { label: 'What you need to check', text: nextText }
        : null;

  const withCauses = variant !== 'open' && hasRootCause;
  const fixLabel = variant === 'awaiting' ? 'Fix applied' : variant === 'diagnosed' ? 'Fix' : 'The fix';
  const fixText = fixRaw === null ? null : asStr(fixRaw.text);
  const fix: ComposedDebugFix | null =
    variant === 'open' || fixRaw === null || fixText === null
      ? null
      : {
          label: fixRaw.notApplied === true ? 'Suggested fix · not applied' : fixLabel,
          text: fixText,
          cut: fixRaw.cut === true,
          notApplied: fixRaw.notApplied === true,
          value: valueOf(fixRaw.value),
        };

  const chips = verRaw === null ? null : chipsOf(verRaw.chips);
  const verText = verRaw === null ? '' : (asStr(verRaw.text) ?? '');
  const verdict = verRaw === null ? null : asStr(verRaw.verdict);
  const verification: ComposedDebugVerification | null =
    (variant === 'awaiting' || variant === 'resolved') && verRaw !== null && (chips !== null || verText !== '')
      ? { kicker: verdict === null ? 'Verified' : `Verified · ${verdict}`, chips, text: verText }
      : null;

  const files =
    (variant === 'awaiting' || variant === 'resolved') && fileItems.length > 0
      ? { kicker: `Files changed · ${fileItems.length}`, items: fileItems }
      : null;

  const anyResolution = hasRootCause || fixText !== null || verRaw !== null || fileItems.length > 0;
  return {
    variant,
    tone: status.tone,
    kicker,
    hypothesis: variant === 'open' ? textOf(focusField(focus, 'hypothesis')) : null,
    test: variant === 'open' ? textOf(focusField(focus, 'test')) : null,
    expecting: variant === 'open' ? textOf(focusField(focus, 'expecting')) : null,
    next,
    causes: withCauses ? { kicker: causes.length > 1 ? `Root cause · ${causes.length}` : 'Root cause', items: causes } : null,
    fix,
    verification,
    files,
    resolutionLink: variant !== 'open' && anyResolution,
  };
}

function resolutionOf(
  resolution: Record<string, unknown> | null,
  headings: ViewInput['headings'],
): ComposedDebugResolution | null {
  if (resolution === null) return null;
  const parts: { label: string; value: DebugValue }[] = [];
  const fields = fieldsOf(resolution.fields);
  const take = (key: string, label: string): void => {
    const f = fields.find((x) => x.key === key);
    if (f !== undefined && (!isEmpty(f.text) || (key === 'fix' && f.text.trim() !== ''))) parts.push({ label, value: f.value });
  };
  const fixRaw = rec(resolution.fix);
  take('root_cause', 'Root cause');
  take('fix', fixRaw !== null && fixRaw.notApplied === true ? 'Suggested fix · not applied' : 'Fix');
  take('verification', 'Verification');
  const files: { path: string; note: string | null }[] = [];
  for (const raw of list(resolution.files)) {
    const f = rec(raw);
    const path = f === null ? null : asStr(f.path);
    if (f !== null && path !== null) files.push({ path, note: asStr(f.note) });
  }
  const heading = asStr(resolution.heading);
  return { parts, files, targetId: heading === null ? null : headingId(headings, heading) };
}

// ---------------------------------------------------------------------------
// The trail: symptoms, suspects, evidence, the Also row
// ---------------------------------------------------------------------------

const TAGS: readonly DebugEvidenceTag[] = ['confirms', 'eliminates', 'fix', 'finding'];

function isTag(value: unknown): value is DebugEvidenceTag {
  return value === 'confirms' || value === 'eliminates' || value === 'fix' || value === 'finding';
}

/** First sentence, never ending inside a `code span`; at most 260 characters. */
function firstSentence(text: string): string {
  const t = squash(text);
  let code = false;
  for (let i = 0; i < t.length && i < 260; i++) {
    const ch = t[i];
    if (ch === '`') code = !code;
    else if (!code && i >= 30 && (ch === '.' || ch === '!' || ch === '?') && (i + 1 === t.length || t[i + 1] === ' ')) {
      return t.slice(0, i + 1);
    }
  }
  if (t.length <= 260) return t;
  const cut = t.slice(0, 260);
  const at = cut.lastIndexOf(' ');
  return `${at === -1 ? cut : cut.slice(0, at).trimEnd()}…`;
}

function symptomsOf(value: unknown, heading: unknown, headings: ViewInput['headings']): ComposedDebugSymptoms | null {
  const fields = fieldsOf(value);
  if (fields.length === 0) return null;
  const startsWith = (f: FieldRec, word: string): boolean => f.key.slice(0, word.length).toLowerCase() === word;
  const exp = fields.find((f) => startsWith(f, 'expected')) ?? null;
  const act = fields.find((f) => startsWith(f, 'actual')) ?? null;
  const rest = fields
    .filter((f) => f !== exp && f !== act && f.key !== '')
    .map((f) => ({ label: humanize(f.key), value: f.value }));
  const text = asStr(heading);
  return {
    expected: exp === null ? null : { value: exp.value },
    actual: act === null ? null : { value: act.value },
    rest,
    targetId: text === null ? null : headingId(headings, text),
  };
}

function suspectsOf(report: Record<string, unknown>, status: { key: string }, focus: FieldRec[], rootCause: string): ComposedDebugSuspects {
  const confirmed: ComposedDebugSuspect[] = [];
  const ruled: ComposedDebugSuspect[] = [];
  const considered: ComposedDebugSuspect[] = [];
  for (const raw of list(report.eliminated)) {
    const e = rec(raw);
    const text = e === null ? null : asStr(e.hypothesis);
    if (e === null || text === null) continue;
    ruled.push({ kind: null, text: squash(text), why: asStr(e.evidence) });
  }
  const reasoning = rec(report.reasoning);
  const settled = status.key === 'resolved' || status.key === 'awaiting_human_verify' || status.key === 'diagnosed';
  for (const raw of list(reasoning?.candidates)) {
    const c = rec(raw);
    const text = c === null ? null : asStr(c.text);
    if (c === null || text === null) continue;
    const suspect = { kind: asStr(c.kind), text: squash(text), why: null };
    if (c.verdict === 'eliminated') ruled.push(suspect);
    else if (c.verdict === 'confirmed' || settled) confirmed.push(suspect);
    else considered.push(suspect);
  }
  if (confirmed.length === 0 && !isEmpty(rootCause)) {
    confirmed.push({ kind: 'root cause', text: firstSentence(rootCause), why: null });
  }
  const hypothesis = focusField(focus, 'hypothesis');
  if (confirmed.length === 0 && OPEN_STATUSES.includes(status.key) && hypothesis !== null && squash(hypothesis.text) !== '') {
    considered.unshift({ kind: 'testing now', text: squash(hypothesis.text), why: null });
  }
  const open = OPEN_STATUSES.includes(status.key);
  return {
    total: confirmed.length + ruled.length + considered.length,
    columns: [
      { key: 'confirmed', label: open ? 'Leading' : 'Confirmed', items: confirmed },
      { key: 'ruled', label: 'Ruled out', items: ruled },
      { key: 'considered', label: open ? 'Still open' : 'Also considered', items: considered },
    ],
  };
}

function evidenceOf(value: unknown, headings: ViewInput['headings']): ComposedDebugEvidence | null {
  const entries: ComposedDebugEvidenceEntry[] = [];
  for (const raw of list(value)) {
    const e = rec(raw);
    if (e === null) continue;
    entries.push({
      no: entries.length + 1,
      ts: typeof e.ts === 'string' ? e.ts : '',
      round: typeof e.round === 'string' ? e.round : '',
      tag: isTag(e.tag) ? e.tag : 'finding',
      checked: typeof e.checked === 'string' ? e.checked : '',
      found: typeof e.found === 'string' ? e.found : '',
      text: typeof e.text === 'string' ? e.text : '',
      implication: typeof e.implication === 'string' ? e.implication : '',
    });
  }
  if (entries.length === 0) return null;
  const counts: Record<DebugEvidenceTag, number> = { confirms: 0, eliminates: 0, fix: 0, finding: 0 };
  for (const e of entries) counts[e.tag] += 1;
  const rounds = new Set(entries.map((e) => e.round));
  return {
    entries,
    counts,
    total: entries.length,
    defaultFilter: counts.confirms > 0 ? 'confirms' : 'all',
    multiRound: rounds.size > 1,
    targetId: entries[0].round === '' ? null : headingId(headings, entries[0].round),
  };
}

/** The filter buttons: tags that are present in the order Confirms, Rules out, Fix, Finding, then All. */
export function evidenceFilters(model: ComposedDebugEvidence): { filter: DebugEvidenceFilter; label: string; count: number }[] {
  const out: { filter: DebugEvidenceFilter; label: string; count: number }[] = [];
  for (const tag of TAGS) if (model.counts[tag] > 0) out.push({ filter: tag, label: TAG_LABEL[tag], count: model.counts[tag] });
  out.push({ filter: 'all', label: 'All', count: model.total });
  return out;
}

export function entriesFor(model: ComposedDebugEvidence, filter: DebugEvidenceFilter): ComposedDebugEvidenceEntry[] {
  return filter === 'all' ? model.entries : model.entries.filter((e) => e.tag === filter);
}

/** The round heading a divider shows before each entry number, only when the evidence spans rounds: the
 * first shown entry gets one, then each entry whose round differs from the previous shown entry's. */
export function roundBreaks(model: ComposedDebugEvidence, filter: DebugEvidenceFilter): Map<number, string> {
  const breaks = new Map<number, string>();
  if (!model.multiRound) return breaks;
  let round: string | null = null;
  for (const e of entriesFor(model, filter)) {
    if (e.round !== round) {
      round = e.round;
      breaks.set(e.no, e.round);
    }
  }
  return breaks;
}

function stripTrailingParen(text: string): string {
  const t = text.trimEnd();
  if (!t.endsWith(')')) return t;
  let depth = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === ')') depth += 1;
    else if (t[i] === '(') {
      depth -= 1;
      if (depth === 0) return t.slice(0, i).trimEnd();
    }
  }
  return t;
}

/** Cuts at the first spaced dash (" - ", " – ", " — ") that sits outside parentheses. */
function cutAtDash(text: string): string {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0 && (ch === '-' || ch === '–' || ch === '—') && text[i - 1] === ' ' && text[i + 1] === ' ') {
      return text.slice(0, i).trimEnd();
    }
  }
  return text;
}

function alsoOf(report: Record<string, unknown>, fm: Record<string, unknown>, headings: ViewInput['headings']): ComposedDebugAlso[] {
  const raw: { heading: string; label: string; short: string; targetId: string | null }[] = [];
  for (const s of list(report.sections)) {
    const section = rec(s);
    const heading = section === null ? null : asStr(section.heading);
    if (section === null || heading === null || section.role !== 'other') continue;
    const short = stripTrailingParen(heading.slice(0, 300));
    const label = stripTrailingParen(cutAtDash(short)) || short;
    raw.push({ heading, label, short, targetId: headingId(headings, heading) });
  }
  const counts = new Map<string, number>();
  for (const r of raw) counts.set(r.label, (counts.get(r.label) ?? 0) + 1);
  const out: ComposedDebugAlso[] = raw.map((r) => ({
    label: (counts.get(r.label) ?? 0) > 1 ? r.short : r.label,
    title: r.heading,
    targetId: r.targetId,
  }));
  const reasoning = rec(report.reasoning);
  if (reasoning !== null && (list(reasoning.fields).length > 0 || list(reasoning.candidates).length > 0)) {
    const focusHeading = asStr(report.focusHeading);
    out.push({
      label: 'Reasoning checkpoint',
      title: focusHeading ?? 'Reasoning checkpoint',
      targetId: focusHeading === null ? null : headingId(headings, focusHeading),
    });
  }
  if (Object.keys(fm).length > 0) out.push({ label: 'Frontmatter', title: 'Frontmatter', targetId: null });
  return out;
}

export function composeDebugCase(input: ViewInput): ComposedDebugCase | null {
  const report = rec(input.structured?.debug);
  if (report === null) return null;
  const fm = rec(input.frontmatter) ?? {};

  const focus = fieldsOf(report.focus);
  const symptoms = fieldsOf(report.symptoms);
  const evidence = list(report.evidence).filter((e) => rec(e) !== null);
  const eliminated = list(report.eliminated).filter((e) => rec(e) !== null);
  const resolution = rec(report.resolution);
  const resolutionFilled =
    resolution !== null &&
    fieldsOf(resolution.fields).some((f) => !isEmpty(f.text));
  const triggerText = asStr(fm.trigger);
  if (
    triggerText === null &&
    focus.length === 0 &&
    symptoms.length === 0 &&
    evidence.length === 0 &&
    eliminated.length === 0 &&
    !resolutionFilled
  ) {
    return null;
  }

  const status = statusOf(fm.status);
  const slug = asStr(report.slug);
  const dates = datesOf(fm.created, fm.updated);
  const head: ComposedDebugHead = {
    eyebrow: 'Debug session',
    title: slug === null ? null : humanize(slug),
    opened: dates.opened,
    updated: dates.updated,
    archived: report.archived === true,
  };

  let trigger: ComposedDebugCase['trigger'] = null;
  if (triggerText !== null) {
    let short: string | null = null;
    if (triggerText.length > 260) {
      const cut = triggerText.slice(0, 250);
      const at = cut.lastIndexOf(' ');
      short = `${(at === -1 ? cut : cut.slice(0, at)).trimEnd()} …`;
    }
    trigger = { text: triggerText, short };
  }

  const facts: { label: string; value: string }[] = [];
  const bugClass = focusField(focus, 'bug_class');
  if (bugClass !== null && squash(bugClass.text) !== '') {
    const t = squash(bugClass.text);
    let end = 0;
    while (end < t.length && t[end] !== ' ' && t[end] !== '(' && t[end] !== '—') end += 1;
    if (end > 0) facts.push({ label: 'Bug class', value: t.slice(0, end) });
  }
  facts.push({ label: 'Evidence', value: String(evidence.length) });
  facts.push({ label: 'Ruled out', value: String(eliminated.length) });
  const rounds = new Set<string>();
  for (const e of evidence) rounds.add(String(rec(e)?.round ?? ''));
  if (rounds.size > 1) facts.push({ label: 'Rounds', value: String(rounds.size) });

  const rootCauseField = resolution === null ? undefined : fieldsOf(resolution.fields).find((f) => f.key === 'root_cause');
  return {
    head,
    status: { label: status.label, tone: status.tone },
    trigger,
    facts,
    lead: leadOf(status, focus, resolution),
    resolution: resolutionOf(resolution, input.headings),
    symptoms: symptomsOf(report.symptoms, report.symptomsHeading, input.headings),
    suspects: suspectsOf(report, status, focus, rootCauseField === undefined ? '' : rootCauseField.text),
    evidence: evidenceOf(report.evidence, input.headings),
    also: alsoOf(report, fm, input.headings),
  };
}
