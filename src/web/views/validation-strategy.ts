// The VALIDATION strategy composer (quick-261003-526, sketch 016 winner A): a pure `ViewInput` ->
// `ComposedValidationStrategy` merge of the frontmatter and `structured.validation` (built by
// `src/planning-repo/handlers/validation-strategy.ts`). It decides the cover (status, dates, the
// quiet Nyquist / Wave 0 dims), the three verdict cells, the "How it's tested" rig (spec list,
// Quick / Full command lines with their copy text, the cadence ladder and latency meter), the task
// map (strip, filters, wave lanes, tiles and their inspector fields), the folded Wave 0 line, the
// human-check cards, the sign-off checklist and stamp, the folded extras and the "In the source
// only" targets. No DOM, no rendering — `validation-strategy-components.tsx` is the only consumer.
// Returns `null` when the strategy is missing or none of its six sections exists, and the page then
// keeps the pre-existing promoted-block view (T-526-05). Dates are formatted by hand in UTC so Node
// and the browser agree, and an unparseable date renders as written, never throwing.
// T-526-03: author-written commands, refs and notes are never turned into an href here, and no
// regular expression is ever built from document text.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type {
  ValidationFileKind,
  ValidationManualRow,
  ValidationRowStatus,
  ValidationStrategy,
  ValidationTaskRow,
  ValidationTestKind,
} from '../../planning-repo/handlers/validation-strategy.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tones — the only place a status, outcome, dim or stamp becomes a tone
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the VALIDATION page draws from — never the parse-degradation
 * tones, which stay reserved for the artifact-parse badge alone. */
export type ValidationTone = 'complete' | 'missing' | 'in-flight' | 'quiet' | 'active';

/** green -> complete, red -> missing, flaky -> in-flight, pending -> quiet (drawn dashed by the
 * stylesheet), no status -> quiet. */
export const STATUS_TONE: Record<ValidationRowStatus, ValidationTone> = {
  green: 'complete',
  red: 'missing',
  flaky: 'in-flight',
  pending: 'quiet',
  none: 'quiet',
};

export const STATUS_LABEL: Record<ValidationRowStatus, string> = {
  green: 'Green',
  red: 'Red',
  flaky: 'Flaky',
  pending: 'Pending',
  none: 'No status',
};

/** The order the strip and the status filter list the statuses in. */
export const STATUS_ORDER: readonly Exclude<ValidationRowStatus, 'none'>[] = ['green', 'red', 'flaky', 'pending'];

/** draft -> in-flight, ready -> active, validated -> complete; anything else is shown as written. */
export const DOC_STATUS: Record<'draft' | 'ready' | 'validated', { label: string; tone: ValidationTone }> = {
  draft: { label: 'Draft', tone: 'in-flight' },
  ready: { label: 'Ready', tone: 'active' },
  validated: { label: 'Validated', tone: 'complete' },
};

export const TEST_GLYPH: Record<ValidationTestKind, string> = {
  unit: 'UNIT',
  integration: 'INT',
  build: 'BUILD',
  e2e: 'E2E',
  manual: 'HUMAN',
  auto: 'AUTO',
};

/** A HUMAN task's glyph is drawn dashed in-flight. */
export const HUMAN_TONE: ValidationTone = 'in-flight';

export const FILE_LABEL: Record<ValidationFileKind, string> = {
  yes: 'File exists',
  create: 'File to create',
  extend: 'File needs new cases',
  na: 'No file',
  unknown: 'Not recorded',
};

export type ValidationOutcomeKind = 'pass' | 'not-observed' | 'awaiting';

export const OUTCOME_TONE: Record<ValidationOutcomeKind, ValidationTone> = {
  pass: 'complete',
  'not-observed': 'in-flight',
  awaiting: 'quiet',
};

export const OUTCOME_LABEL: Record<ValidationOutcomeKind, string> = {
  pass: 'Observed · pass',
  'not-observed': 'Not observed',
  awaiting: 'Awaiting a human',
};

export const DIM_TONE = {
  nyquist: { yes: 'complete', no: 'in-flight' },
  wave0: { yes: 'complete', no: 'quiet' },
} as const satisfies Record<string, Record<'yes' | 'no', ValidationTone>>;

/** approved -> complete, every check ticked but not approved -> active, otherwise in-flight. */
export const STAMP_TONE = { approved: 'complete', ticked: 'active', open: 'in-flight' } as const satisfies Record<
  string,
  ValidationTone
>;

/** The template-map notice's rule. */
export const TEMPLATE_TONE: ValidationTone = 'in-flight';

export function docStatusOf(raw: string): { label: string; tone: ValidationTone } {
  const text = raw.trim().toLowerCase();
  if (text.includes('validated')) return DOC_STATUS.validated;
  if (text.includes('ready')) return DOC_STATUS.ready;
  if (text.includes('draft')) return DOC_STATUS.draft;
  return { label: raw.trim() === '' ? 'Unknown' : raw.trim(), tone: 'quiet' };
}

// ---------------------------------------------------------------------------
// Composed model
// ---------------------------------------------------------------------------

export interface ComposedValidationDim {
  key: 'nyquist' | 'wave0';
  glyph: string;
  label: string;
  tone: ValidationTone;
}

export interface ComposedValidationIntro {
  eyebrow: string;
  title: string | null;
  status: { label: string; tone: ValidationTone };
  created: string | null;
  reconciled: string | null;
  updated: string | null;
  dims: ComposedValidationDim[];
}

export interface ComposedValidationSquare {
  index: number;
  tone: ValidationTone;
  /** "id · Status label". */
  title: string;
}

export interface ComposedValidationSignoffCell {
  checked: number;
  total: number;
  approval: string | null;
  items: { text: string; checked: boolean }[];
  stampLabel: string;
  stampTone: ValidationTone;
}

export interface ComposedValidationCells {
  tasks: { value: string | null; note: string; label: string; squares: ComposedValidationSquare[] };
  human: { count: number; note: string; hasSection: boolean };
  signoff: ComposedValidationSignoffCell | null;
}

export interface ComposedValidationCommand {
  text: string;
  /** Exactly the visible command (markers removed, whitespace collapsed); null for plain prose. */
  copy: string | null;
}

export interface ComposedValidationRun {
  qualifier: string | null;
  commands: ComposedValidationCommand[];
}

export interface ComposedValidationRig {
  spec: { key: string; value: string; muted: boolean }[];
  quick: ComposedValidationRun[];
  full: ComposedValidationRun[];
  runtime: string | null;
  prose: Block[];
  sampling: {
    lead: Block[];
    steps: { when: string; what: string; size: number }[];
    latency: { text: string; percent: number } | null;
    tail: Block[];
  } | null;
}

export interface ComposedValidationTask {
  index: number;
  anchorId: string;
  id: string;
  shortId: string;
  plan: string;
  wave: string;
  requirements: string[];
  /** The first two requirements plus "+N". */
  reqLabel: string;
  threats: string[];
  behavior: string;
  /** Markdown markers removed — the tile's text. */
  behaviorPlain: string;
  kind: ValidationTestKind;
  glyph: string;
  glyphTone: ValidationTone | null;
  status: ValidationRowStatus;
  statusLabel: string;
  tone: ValidationTone;
  file: { kind: ValidationFileKind; label: string; note: string };
  command: string;
  copy: string | null;
  commandLabel: 'Command' | 'Checked by';
  prerequisite: string;
  human: boolean;
}

export interface ComposedValidationLane {
  wave: string;
  count: number;
  plans: { plan: string; taskIndexes: number[] }[];
}

export interface ComposedValidationMap {
  heading: string;
  aside: string;
  /** "33 tasks: 33 pending" — the square strip's accessible name. */
  label: string;
  template: { id: string; command: string } | null;
  total: number;
  squares: ComposedValidationSquare[];
  statuses: { status: Exclude<ValidationRowStatus, 'none'>; label: string; tone: ValidationTone; count: number }[];
  hasStatus: boolean;
  toCreate: number;
  filters: {
    requirements: { value: string; count: number }[];
    kinds: { kind: ValidationTestKind; glyph: string; count: number }[];
    statuses: { status: Exclude<ValidationRowStatus, 'none'>; label: string; tone: ValidationTone; count: number }[];
  };
  lanes: ComposedValidationLane[];
  tasks: ComposedValidationTask[];
  notes: Block[];
}

export type ComposedValidationSegment = { text: string } | { taskId: string; index: number };

export interface ComposedValidationWave0 {
  heading: string;
  label: string;
  boxes: { checked: boolean }[];
  summary: string;
  lead: Block[];
  items: { mark: string; done: boolean; segments: ComposedValidationSegment[] }[];
  tail: Block[];
}

export interface ComposedValidationOutcome {
  kind: ValidationOutcomeKind;
  label: string;
  tone: ValidationTone;
  date: string;
  text: string;
  /** Over 220 characters: clamped to three lines with more / less. */
  long: boolean;
}

export interface ComposedValidationCard {
  requirements: string[];
  backstop: string | null;
  title: string;
  why: string;
  how: string;
  outcome: ComposedValidationOutcome;
}

export interface ComposedValidationManual {
  heading: string;
  cards: ComposedValidationCard[];
  prose: Block[] | null;
  notes: Block[];
}

export interface ComposedValidationSignoff {
  heading: string;
  items: { text: string; checked: boolean }[];
  stamp: { label: string; tone: ValidationTone; approval: string | null };
  extra: Block[];
}

export interface ComposedValidationExtra {
  id: string;
  heading: string;
  blocks: Block[];
}

export interface ComposedValidationSourceOnly {
  label: string;
  /** Heading id to scroll to in Source mode; null = the top. */
  targetId: string | null;
  /** False for an entry that has no place to go (the template comments). */
  interactive: boolean;
}

export interface ComposedValidationSection {
  id: string;
  number: string;
  title: string;
  aside: string;
}

export interface ComposedValidationStrategy {
  intro: ComposedValidationIntro;
  cells: ComposedValidationCells;
  rig: ComposedValidationRig | null;
  map: ComposedValidationMap | null;
  wave0: ComposedValidationWave0 | null;
  manual: ComposedValidationManual | null;
  signoff: ComposedValidationSignoff | null;
  extras: ComposedValidationExtra[];
  sourceOnly: ComposedValidationSourceOnly[];
  sections: ComposedValidationSection[];
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

/** Frontmatter arrives as strings, numbers, booleans or (from other loaders) Date instances. */
function scalarText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

function boolOf(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === 'true') return true;
    if (text === 'false') return false;
  }
  return null;
}

/** `**bold**`, `*em*` and backticks removed. */
function plain(text: string): string {
  return text.split('**').join('').split('`').join('').split('*').join('').trim();
}

function collapse(text: string): string {
  return plain(text).split(/\s+/).join(' ').trim();
}

function natural(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

function isDigits(text: string): boolean {
  return text.length > 0 && [...text].every((c) => c >= '0' && c <= '9');
}

/** "03-file-browsing" -> "3", "02.1-x" -> "2.1", 4 -> "4" (leading zeros stripped). */
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

/** "roles-permission-enforcement" -> "Roles permission enforcement"; a leading phase number is
 * dropped; null when no words remain. */
function slugTitle(slug: string): string | null {
  let i = 0;
  while (i < slug.length && ((slug[i] >= '0' && slug[i] <= '9') || slug[i] === '.')) i += 1;
  const rest = i > 0 && slug[i] === '-' ? slug.slice(i + 1) : slug;
  const words = rest.split('-').join(' ').trim();
  return words === '' ? null : words[0].toUpperCase() + words.slice(1);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** Splits a command cell on " · " and on "; " before a backtick — never inside a code span. */
export function splitCommands(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inCode = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '`') inCode = !inCode;
    if (!inCode && ch === ';' && (value[i + 1] === ' ' || value[i + 1] === '\t')) {
      let j = i + 1;
      while (j < value.length && (value[j] === ' ' || value[j] === '\t')) j += 1;
      if (value[j] === '`') {
        parts.push(current);
        current = '';
        i = j - 1;
        continue;
      }
    }
    if (!inCode && ch === '·' && current.endsWith(' ') && value[i + 1] === ' ') {
      parts.push(current);
      current = '';
      i += 1;
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

function commandsOf(value: string): ComposedValidationCommand[] {
  return splitCommands(value).map((text) => ({ text, copy: text.includes('`') ? collapse(text) : null }));
}

/** "Quick run command (backend)" -> { base: "quick run command", qualifier: "backend" }. */
function keyParts(key: string): { base: string; qualifier: string | null } {
  const trimmed = key.trim();
  if (trimmed.endsWith(')')) {
    const open = trimmed.lastIndexOf('(');
    if (open > 0) {
      const qualifier = trimmed.slice(open + 1, -1).trim();
      return { base: trimmed.slice(0, open).trim().toLowerCase(), qualifier: qualifier === '' ? null : qualifier };
    }
  }
  return { base: trimmed.toLowerCase(), qualifier: null };
}

/** The first run of digits followed by optional spaces and an "s" — "90 seconds" -> 90. */
function secondsOf(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (text[i] < '0' || text[i] > '9') continue;
    let j = i;
    while (j < text.length && text[j] >= '0' && text[j] <= '9') j += 1;
    let k = j;
    while (k < text.length && text[k] === ' ') k += 1;
    if (text[k] === 's' || text[k] === 'S') return Number(text.slice(i, j));
    i = j;
  }
  return 0;
}

function rigOf(raw: ValidationStrategy): ComposedValidationRig | null {
  const infra = raw.infra;
  const sampling = raw.sampling;
  if (!infra && !sampling) return null;
  const spec: ComposedValidationRig['spec'] = [];
  const quick: ComposedValidationRun[] = [];
  const full: ComposedValidationRun[] = [];
  const runtime: string[] = [];
  for (const row of arrayOf<{ key: string; value: string }>(infra?.rows)) {
    const key = stringOr(row.key, '');
    const value = stringOr(row.value, '');
    const { base, qualifier } = keyParts(key);
    if (base.includes('quick')) quick.push({ qualifier, commands: commandsOf(value) });
    else if (base.includes('full')) full.push({ qualifier, commands: commandsOf(value) });
    else if (base.includes('runtime')) runtime.push(value);
    else spec.push({ key, value, muted: base.includes('config') });
  }
  const prose = [...arrayOf<Block>(infra?.lead), ...arrayOf<Block>(infra?.tail)];

  let composedSampling: ComposedValidationRig['sampling'] = null;
  if (sampling) {
    const items = arrayOf<{ when: string | null; what: string }>(sampling.steps);
    const isLatency = (when: string | null): boolean => {
      const lower = (when ?? '').toLowerCase();
      return lower.includes('max feedback') || lower.includes('latency');
    };
    const steps = items.filter((item) => !isLatency(item.when)).map((item, n) => ({
      when: nonEmpty(item.when) ?? `Step ${n + 1}`,
      what: stringOr(item.what, ''),
      size: Math.min(n, 3),
    }));
    const latencyItem = items.find((item) => (item.when ?? '').toLowerCase().includes('latency'));
    const latency = latencyItem
      ? {
          text: stringOr(latencyItem.what, ''),
          percent: Math.min(100, (secondsOf(stringOr(latencyItem.what, '')) / 120) * 100),
        }
      : null;
    composedSampling = { lead: arrayOf<Block>(sampling.lead), steps, latency, tail: arrayOf<Block>(sampling.tail) };
  }
  return {
    spec,
    quick,
    full,
    runtime: runtime.length > 0 ? runtime.join(' · ') : null,
    prose,
    sampling: composedSampling,
  };
}

// ---------------------------------------------------------------------------
// The map
// ---------------------------------------------------------------------------

/** "2-01-02" -> "01-02", "04-03-01" -> "03-01", "01-01 T1" -> "01 T1"; TBD stays. */
function shortIdOf(id: string): string {
  let i = 0;
  while (i < id.length && id[i] >= '0' && id[i] <= '9') i += 1;
  return i > 0 && id[i] === '-' ? id.slice(i + 1) : id;
}

/** A leading "N/A —" removed; '—' when nothing is left. */
function behaviorOf(text: string): string {
  let value = text.trim();
  if (value.toLowerCase().startsWith('n/a')) {
    value = value.slice(3).trim();
    if (value.startsWith('—') || value.startsWith('-')) value = value.slice(1).trim();
  }
  return value === '' ? '—' : value;
}

function waveRank(wave: string): number {
  return isDigits(wave) ? Number(wave) : Number.POSITIVE_INFINITY;
}

function taskOf(row: ValidationTaskRow): ComposedValidationTask {
  const status = row.status;
  const kind = row.testKind;
  const behavior = behaviorOf(stringOr(row.behavior, ''));
  const requirements = arrayOf<string>(row.requirements);
  const command = stringOr(row.command, '');
  const human = kind === 'manual';
  return {
    index: row.index,
    anchorId: `validation-task-${row.index}`,
    id: row.id,
    shortId: shortIdOf(row.id),
    plan: row.plan,
    wave: row.wave,
    requirements,
    reqLabel:
      requirements.length > 2 ? `${requirements.slice(0, 2).join(' ')} +${requirements.length - 2}` : requirements.join(' '),
    threats: arrayOf<string>(row.threats),
    behavior,
    behaviorPlain: behavior === '—' ? '—' : plain(behavior),
    kind,
    glyph: TEST_GLYPH[kind],
    glyphTone: human ? HUMAN_TONE : null,
    status,
    statusLabel: STATUS_LABEL[status],
    tone: STATUS_TONE[status],
    file: { kind: row.fileKind, label: FILE_LABEL[row.fileKind], note: stringOr(row.fileNote, '') },
    command,
    copy: !human && command.includes('`') ? collapse(command) : null,
    commandLabel: human ? 'Checked by' : 'Command',
    prerequisite: stringOr(row.prerequisite, ''),
    human,
  };
}

function mapOf(raw: ValidationStrategy): ComposedValidationMap | null {
  const map = raw.map;
  if (!map) return null;
  const rows = arrayOf<ValidationTaskRow>(map.rows);
  const template = map.template === true;
  const heading = stringOr(map.heading, 'Per-Task Verification Map');
  if (template) {
    const first = rows[0];
    return {
      heading,
      aside: 'Template only',
      label: 'No tasks',
      template: { id: stringOr(first?.id, ''), command: stringOr(first?.command, '') },
      total: 0,
      squares: [],
      statuses: [],
      hasStatus: false,
      toCreate: 0,
      filters: { requirements: [], kinds: [], statuses: [] },
      lanes: [],
      tasks: [],
      notes: arrayOf<Block>(map.notes),
    };
  }
  const tasks = rows.map(taskOf);
  const ordered = [...tasks].sort(
    (a, b) => waveRank(a.wave) - waveRank(b.wave) || natural(a.wave, b.wave) || natural(a.plan, b.plan) || a.index - b.index,
  );
  const waves = [...new Set(ordered.map((t) => t.wave))];
  const lanes: ComposedValidationLane[] = waves.map((wave) => {
    const inWave = ordered.filter((t) => t.wave === wave);
    const plans = [...new Set(inWave.map((t) => t.plan))].map((plan) => ({
      plan,
      taskIndexes: inWave.filter((t) => t.plan === plan).map((t) => t.index),
    }));
    return { wave, count: inWave.length, plans };
  });
  const countOf = (status: ValidationRowStatus): number => tasks.filter((t) => t.status === status).length;
  const statuses = STATUS_ORDER.filter((status) => countOf(status) > 0).map((status) => ({
    status,
    label: STATUS_LABEL[status],
    tone: STATUS_TONE[status],
    count: countOf(status),
  }));
  const requirements = [...new Set(tasks.flatMap((t) => t.requirements))].sort(natural).map((value) => ({
    value,
    count: tasks.filter((t) => t.requirements.includes(value)).length,
  }));
  const kinds = [...new Set(tasks.map((t) => t.kind))].map((kind) => ({
    kind,
    glyph: TEST_GLYPH[kind],
    count: tasks.filter((t) => t.kind === kind).length,
  }));
  return {
    heading,
    aside: 'Wave lanes · pick a task',
    label: statuses.length > 0 ? `${tasks.length} tasks: ${statuses.map((s) => `${s.count} ${s.label.toLowerCase()}`).join(', ')}` : `${tasks.length} tasks`,
    template: null,
    total: tasks.length,
    squares: ordered.map((t) => ({ index: t.index, tone: t.tone, title: `${t.id} · ${t.statusLabel}` })),
    statuses,
    hasStatus: tasks.some((t) => t.status !== 'none'),
    toCreate: tasks.filter((t) => t.file.kind === 'create').length,
    filters: { requirements, kinds, statuses },
    lanes,
    tasks,
    notes: arrayOf<Block>(map.notes),
  };
}

// ---------------------------------------------------------------------------
// Wave 0
// ---------------------------------------------------------------------------

function isIdRun(run: string): boolean {
  const parts = run.split('-');
  return (
    parts.length === 3 &&
    isDigits(parts[0]) &&
    parts[0].length <= 2 &&
    isDigits(parts[1]) &&
    parts[1].length === 2 &&
    isDigits(parts[2]) &&
    parts[2].length === 2
  );
}

function isWordChar(ch: string): boolean {
  return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '-' || ch === '_';
}

/** Splits an item's text at task IDs that exist in the map. One linear scan that tracks backticks,
 * so an ID inside a code span stays code text. */
export function segmentsOf(text: string, ids: Map<string, number>): ComposedValidationSegment[] {
  const segments: ComposedValidationSegment[] = [];
  let pending = '';
  let inCode = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '`') {
      inCode = !inCode;
      pending += ch;
      i += 1;
      continue;
    }
    if (!inCode && isWordChar(ch)) {
      let j = i;
      while (j < text.length && isWordChar(text[j])) j += 1;
      const run = text.slice(i, j);
      const index = isIdRun(run) ? ids.get(run) : undefined;
      if (index !== undefined) {
        if (pending !== '') segments.push({ text: pending });
        pending = '';
        segments.push({ taskId: run, index });
      } else {
        pending += run;
      }
      i = j;
      continue;
    }
    pending += ch;
    i += 1;
  }
  if (pending !== '') segments.push({ text: pending });
  return segments;
}

function wave0Of(raw: ValidationStrategy, ids: Map<string, number>): ComposedValidationWave0 | null {
  const wave0 = raw.wave0;
  if (!wave0) return null;
  const items = arrayOf<{ text: string; box: boolean; checked: boolean }>(wave0.items);
  const boxes = items.filter((item) => item.box).map((item) => ({ checked: item.checked === true }));
  const done = boxes.filter((box) => box.checked).length;
  const summary =
    boxes.length > 0 ? `${done} of ${boxes.length} in place` : `${items.length} note${items.length === 1 ? '' : 's'}`;
  return {
    heading: stringOr(wave0.heading, 'Wave 0 Requirements'),
    label: 'Wave 0 · before the first task',
    boxes,
    summary,
    lead: arrayOf<Block>(wave0.lead),
    items: items.map((item) => ({
      mark: item.box ? (item.checked ? '✓' : '○') : '·',
      done: item.checked === true,
      segments: segmentsOf(stringOr(item.text, ''), ids),
    })),
    tail: arrayOf<Block>(wave0.tail),
  };
}

// ---------------------------------------------------------------------------
// Manual checks and sign-off
// ---------------------------------------------------------------------------

const BACKSTOP_OPEN = '(**backstop**:';

/** A "(**backstop**: …)" clause cut out of a behaviour; parentheses inside the clause are balanced. */
function splitBackstop(text: string): { title: string; backstop: string | null } {
  const at = text.toLowerCase().indexOf(BACKSTOP_OPEN);
  if (at === -1) return { title: text.trim(), backstop: null };
  let depth = 0;
  let close = -1;
  for (let i = at; i < text.length; i++) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close === -1) return { title: text.trim(), backstop: null };
  const backstop = text.slice(at + BACKSTOP_OPEN.length, close).trim();
  return { title: `${text.slice(0, at)}${text.slice(close + 1)}`.trim(), backstop: backstop === '' ? null : backstop };
}

function outcomeOf(row: ValidationManualRow): ComposedValidationOutcome {
  const observed = row.observed;
  const outcome = row.outcome;
  let kind: ValidationOutcomeKind = 'awaiting';
  if (observed !== null && observed !== undefined) kind = 'not-observed';
  if (outcome !== null && outcome !== undefined) kind = 'not-observed';
  if (kind !== 'awaiting') {
    const probe = `${observed ?? ''} ${(outcome ?? '').slice(0, 20)}`.toLowerCase();
    if (probe.includes('✅') || probe.includes('pass')) kind = 'pass';
  }
  let date = (observed ?? '').trim();
  if (date.startsWith('✅') || date.startsWith('⬜')) date = date.slice(1).trim();
  if (date.toLowerCase() === 'not observed') date = '';
  const text = outcome ?? '';
  return {
    kind,
    label: OUTCOME_LABEL[kind],
    tone: OUTCOME_TONE[kind],
    date,
    text,
    long: text.length > 220,
  };
}

function manualOf(raw: ValidationStrategy): ComposedValidationManual | null {
  const manual = raw.manual;
  if (!manual) return null;
  const rows = arrayOf<ValidationManualRow>(manual.rows);
  const prose = manual.prose ? arrayOf<Block>(manual.prose) : null;
  if (rows.length === 0 && (prose === null || prose.length === 0)) return null;
  const cards: ComposedValidationCard[] = rows.map((row) => {
    const { title, backstop } = splitBackstop(stringOr(row.behavior, ''));
    return {
      requirements: arrayOf<string>(row.requirements),
      backstop,
      title,
      why: stringOr(row.why, ''),
      how: stringOr(row.how, ''),
      outcome: outcomeOf(row),
    };
  });
  return {
    heading: stringOr(manual.heading, 'Manual-Only Verifications'),
    cards,
    prose: rows.length === 0 ? prose : null,
    notes: [...arrayOf<Block>(manual.lead), ...arrayOf<Block>(manual.tail)],
  };
}

function isApproved(approval: string | null): boolean {
  const text = (approval ?? '').toLowerCase();
  return (text.includes('approved') || text.includes('validated')) && !text.includes('pending');
}

function stampOf(
  items: { text: string; checked: boolean }[],
  approval: string | null,
): { label: string; tone: ValidationTone } {
  const approved = isApproved(approval);
  const checked = items.filter((item) => item.checked).length;
  const allTicked = items.length > 0 && checked === items.length;
  return {
    label: approved ? 'Approved' : 'Pending',
    tone: approved ? STAMP_TONE.approved : allTicked ? STAMP_TONE.ticked : STAMP_TONE.open,
  };
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

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

function introOf(input: ViewInput): ComposedValidationIntro {
  const fm = input.frontmatter ?? {};
  const phase = scalarText(fm.phase);
  const number = phase === null ? null : phaseNumber(phase);
  const slug = scalarText(fm.slug);
  const stamp = (value: unknown): string | null => {
    const text = scalarText(value);
    return text === null ? null : formatStamp(text);
  };
  const dims: ComposedValidationDim[] = [];
  const nyquist = boolOf(fm.nyquist_compliant);
  if (nyquist !== null) {
    dims.push({
      key: 'nyquist',
      glyph: nyquist ? '✓' : '✗',
      label: nyquist ? 'Nyquist compliant' : 'Not Nyquist compliant',
      tone: nyquist ? DIM_TONE.nyquist.yes : DIM_TONE.nyquist.no,
    });
  }
  const wave0 = boolOf(fm.wave_0_complete);
  if (wave0 !== null) {
    dims.push({
      key: 'wave0',
      glyph: wave0 ? '✓' : '○',
      label: wave0 ? 'Wave 0 complete' : 'Wave 0 not complete',
      tone: wave0 ? DIM_TONE.wave0.yes : DIM_TONE.wave0.no,
    });
  }
  return {
    eyebrow: number === null ? 'Validation strategy' : `Validation strategy · Phase ${number}`,
    title: slug === null ? null : slugTitle(slug),
    status: docStatusOf(scalarText(fm.status) ?? ''),
    created: stamp(fm.created),
    reconciled: stamp(fm.reconciled),
    updated: stamp(fm.updated),
    dims,
  };
}

/** Composes the VALIDATION page model, or `null` when the input carries no usable strategy. */
export function composeValidationStrategy(input: ViewInput): ComposedValidationStrategy | null {
  const raw = (input.structured ?? {}).validation as ValidationStrategy | undefined | null;
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.infra && !raw.sampling && !raw.map && !raw.wave0 && !raw.manual && !raw.signoff) return null;

  const map = mapOf(raw);
  const taskIds = new Map<string, number>();
  for (const task of map?.tasks ?? []) if (!taskIds.has(task.id)) taskIds.set(task.id, task.index);
  const rig = rigOf(raw);
  const wave0 = wave0Of(raw, taskIds);
  const manual = manualOf(raw);
  const rawSignoff = raw.signoff;
  const signoffItems = rawSignoff
    ? arrayOf<{ text: string; checked: boolean }>(rawSignoff.items).map((item) => ({
        text: stringOr(item.text, ''),
        checked: item.checked === true,
      }))
    : [];
  const approval = rawSignoff ? nonEmpty(rawSignoff.approval) : null;
  const stamp = stampOf(signoffItems, approval);
  const signoff: ComposedValidationSignoff | null = rawSignoff
    ? {
        heading: stringOr(rawSignoff.heading, 'Validation Sign-Off'),
        items: signoffItems,
        stamp: { label: stamp.label, tone: stamp.tone, approval },
        extra: arrayOf<Block>(rawSignoff.extra),
      }
    : null;
  const checkedCount = signoffItems.filter((item) => item.checked).length;

  // ---- cover cells ---------------------------------------------------------------------------
  const tasks = map?.tasks ?? [];
  const green = tasks.filter((t) => t.status === 'green').length;
  const hasStatus = map?.hasStatus === true;
  let tasksNote: string;
  if (map === null || map.template !== null) tasksNote = 'map never filled in';
  else if (hasStatus) tasksNote = `of ${map.total} green`;
  else tasksNote = `${map.total} task${map.total === 1 ? '' : 's'} · no status column`;
  const humanRows = arrayOf<ValidationManualRow>(raw.manual?.rows);
  const humanCards = manual?.cards ?? [];
  const observed = humanCards.filter((card) => card.outcome.kind === 'pass').length;
  const hasObservedColumn = humanRows.some((row) => row.observed !== null && row.observed !== undefined);
  const cells: ComposedValidationCells = {
    tasks: {
      value: map !== null && map.template === null && hasStatus ? String(green) : null,
      note: tasksNote,
      label: map?.label ?? 'No tasks',
      squares: map?.squares ?? [],
    },
    human: {
      count: humanCards.length,
      note: humanCards.length === 0 ? 'none listed' : hasObservedColumn ? `${observed} observed` : 'not yet observed',
      hasSection: manual !== null,
    },
    signoff: signoff
      ? {
          checked: checkedCount,
          total: signoffItems.length,
          approval,
          items: signoffItems,
          stampLabel: stamp.label,
          stampTone: stamp.tone,
        }
      : null,
  };

  // ---- extras, source-only, numbered sections ------------------------------------------------
  const extras: ComposedValidationExtra[] = arrayOf<{ heading: string; blocks: Block[] }>(raw.extras).map(
    (extra, index) => ({
      id: `validation-extra-${index}`,
      heading: stringOr(extra.heading, ''),
      blocks: arrayOf<Block>(extra.blocks),
    }),
  );
  const ids = headingIds(input);
  const mapHeadingId = map ? (ids.get(normalizeHeading(map.heading)) ?? null) : null;
  const sourceOnly: ComposedValidationSourceOnly[] = [];
  if (raw.preamble === true) sourceOnly.push({ label: 'Preamble', targetId: null, interactive: true });
  if (arrayOf<Block>(raw.map?.preface).length > 0) {
    sourceOnly.push({ label: 'Map preface', targetId: mapHeadingId, interactive: true });
  }
  if (arrayOf<string>(raw.map?.legend).length > 0) {
    sourceOnly.push({ label: 'Status legend', targetId: mapHeadingId, interactive: true });
  }
  sourceOnly.push({ label: 'Frontmatter', targetId: null, interactive: true });
  if (typeof raw.commentCount === 'number' && raw.commentCount > 0) {
    sourceOnly.push({ label: 'Template comments', targetId: null, interactive: false });
  }

  const sections: ComposedValidationSection[] = [];
  const addSection = (id: string, title: string, aside: string): void => {
    sections.push({ id, number: String(sections.length + 1).padStart(2, '0'), title, aside });
  };
  if (rig) addSection('validation-rig', "How it's tested", 'Infrastructure · sampling rate');
  if (map) addSection('validation-map', 'Task verification', map.aside);
  if (manual) {
    addSection(
      'validation-manual',
      'Checked by a human',
      manual.cards.length > 0 ? `${manual.cards.length} behaviours no test can reach` : 'Prose · as written',
    );
  }
  if (signoff) addSection('validation-signoff', 'Sign-off', `${checkedCount} of ${signoffItems.length} checks`);

  return {
    intro: introOf(input),
    cells,
    rig,
    map,
    wave0,
    manual,
    signoff,
    extras,
    sourceOnly,
    sections,
  };
}
