// The TODO page composer (quick-261023-61k, sketch 027 C: the lifecycle): a pure `ViewInput` -> `ComposedTodoLifecycle`
// merge of the frontmatter, `structured.todo` (built by `src/planning-repo/handlers/todo-file.ts`) and the
// `todoContext` the server joins on (the source notes with their urls, and the closing quick task's link).
// It decides the head (eyebrow, created day, title), the chip row (status, severity square, area), the
// three-step strip (Noted -> Captured -> Closed, or Now while the todo is open) and the numbered stages
// under it: the notes the todo was made from, the todo itself (lead beside plan, files, other sections
// folded), and how it closed or how long it has been open. No DOM, no filesystem access, no rendering -
// `todo-lifecycle-components.tsx` is the only consumer. The module imports types only from the handler
// and presentation modules. Returns `null` only when the projection is missing; every other junk value
// degrades to an omitted part (T-61k-08).
// Dates follow their zone: a date-only value, or a stamp at exactly 00:00:00 UTC (an unquoted YAML date),
// is a day with no time; a zone-less date-time is shown as written (/gsd-note writes local wall time); a
// stamp with `Z` or an offset is an instant shown in the viewer's time zone (add-todo writes UTC).
// T-61k-06: the only navigation targets are stage ids, or urls the server's `todoContext` resolved; no
// URL is built from document text, and no RegExp is built from it either.
import type { TodoBlock, TodoFileBody } from '../../planning-repo/handlers/todo-file.ts';
import type { TodoContext } from '../../presentation/todo-context.ts';
import type { ViewInput } from './manifest.ts';

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Stamp {
  year: number;
  month: number;
  day: number;
  /** "HH:MM", or null for a day with no time. */
  time: string | null;
}

export interface TodoDateOptions {
  now?: Date;
  /** An IANA zone name; defaults to the browser's. */
  timeZone?: string;
}

const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?)?$/i;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function zoneOf(timeZone: string | undefined): string {
  if (timeZone !== undefined && timeZone !== '') {
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone });
      return timeZone;
    } catch {
      return 'UTC';
    }
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The calendar fields of an instant in a zone. */
function partsIn(instant: Date, timeZone: string): Stamp | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant);
    const pick = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? Number.NaN);
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    const hour = pick('hour');
    const minute = pick('minute');
    if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
    return { year, month, day, time: `${pad2(hour)}:${pad2(minute)}` };
  } catch {
    return null;
  }
}

function offsetText(zone: string): string {
  if (zone.toUpperCase() === 'Z') return 'Z';
  const sign = zone[0];
  const digits = zone.slice(1).split(':').join('');
  const hours = digits.slice(0, 2);
  const minutes = digits.length >= 4 ? digits.slice(2, 4) : '00';
  return `${sign}${hours}:${minutes}`;
}

/**
 * Reads a date as text: a day with no time for a date-only value or a stamp at exactly 00:00:00 UTC; the
 * wall time as written for a zone-less date-time; the viewer's wall time for an instant (a stamp with `Z`
 * or an offset). Null when the text is not a date.
 */
export function readStamp(text: unknown, timeZone?: string): Stamp | null {
  if (typeof text !== 'string' || text.length > 64) return null;
  const match = STAMP_RE.exec(text.trim());
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (match[4] === undefined) return { year, month, day, time: null };
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? '0');
  if (hour > 23 || minute > 59 || second > 59) return null;
  const zone = match[7];
  if (zone === undefined) return { year, month, day, time: `${pad2(hour)}:${pad2(minute)}` };
  const offset = offsetText(zone);
  const instant = new Date(`${match[1]}-${match[2]}-${match[3]}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}${offset}`);
  if (Number.isNaN(instant.getTime())) return null;
  const utcMidnight = instant.getUTCHours() === 0 && instant.getUTCMinutes() === 0 && instant.getUTCSeconds() === 0;
  if (utcMidnight && (offset === 'Z' || offset === '+00:00' || offset === '-00:00')) return { year, month, day, time: null };
  return partsIn(instant, zoneOf(timeZone));
}

/** "21 Oct 2026". Text that is not a date is returned as written. */
export function formatDay(text: string, timeZone?: string): string {
  const stamp = readStamp(text, timeZone);
  return stamp === null ? text : `${stamp.day} ${MONTHS[stamp.month - 1]} ${stamp.year}`;
}

/** "21 Oct 16:01", or "16 Oct" for a day with no time. Text that is not a date is returned as written. */
export function formatShort(text: string, timeZone?: string): string {
  const stamp = readStamp(text, timeZone);
  if (stamp === null) return text;
  return `${stamp.day} ${MONTHS[stamp.month - 1]}${stamp.time === null ? '' : ` ${stamp.time}`}`;
}

function dayNumber(stamp: Stamp): number {
  return Date.UTC(stamp.year, stamp.month - 1, stamp.day) / 86_400_000;
}

/** Calendar days from the created day to today in the zone; null when created is not a date. */
export function daysOpen(created: string, now: Date, timeZone?: string): number | null {
  const from = readStamp(created, timeZone);
  const today = partsIn(now, zoneOf(timeZone));
  if (from === null || today === null) return null;
  return Math.max(0, Math.round(dayNumber(today) - dayNumber(from)));
}

function openLabel(days: number | null): string {
  if (days === null) return 'Open';
  if (days === 0) return 'Open less than a day';
  return `Open ${days} ${days === 1 ? 'day' : 'days'}`;
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type TodoTone = 'complete' | 'in-flight' | 'quiet';
export type TodoStepState = 'done' | 'now' | 'none';
export type TodoLevelName = 'high' | 'medium' | 'low' | 'unrated';

export interface ComposedTodoStep {
  key: 'noted' | 'captured' | 'closed' | 'now';
  state: TodoStepState;
  value: string;
  sub: string;
  /** The stage id the step jumps to, or null when that stage does not exist. */
  target: string | null;
}

export interface ComposedTodoNote {
  path: string;
  /** The in-app route of the note's page, or null. */
  url: string | null;
  /** "Note · 21 Oct 15:58", or "Note". */
  kicker: string;
  way: string;
  title: string | null;
  text: string;
  /** True when the card folds its text (no title, over 220 characters). */
  clamp: boolean;
  /** True when the listed note is not in the project. */
  missing: boolean;
}

export interface ComposedTodoNoted {
  id: string;
  number: number;
  kicker: string;
  notes: ComposedTodoNote[];
}

export interface ComposedTodoPart {
  label: string;
  blocks: TodoBlock[];
}

export interface ComposedTodoFileRow {
  dir: string;
  name: string;
  /** "L88–140", "L5", or null. */
  range: string | null;
  raw: string;
}

export interface ComposedTodoExtra {
  heading: string;
  blocks: TodoBlock[];
  open: boolean;
}

export interface ComposedTodoCaptured {
  id: string;
  number: number;
  kicker: string;
  lead: ComposedTodoPart | null;
  plan: (ComposedTodoPart & { checks: { done: number; total: number } | null }) | null;
  files: { count: number; rows: ComposedTodoFileRow[] } | null;
  extras: ComposedTodoExtra[];
  /** True only when the todo has no lead, plan or other section. */
  empty: boolean;
}

export type ComposedTodoEnd =
  | {
      kind: 'closed';
      id: string;
      number: number;
      title: string;
      kicker: string;
      closedBy: { label: string; url: string | null } | null;
      closedOn: string | null;
      closing: TodoBlock[] | null;
      commits: string[];
      /** "Moved to todos/completed/ with no resolution written." when there is no closing. */
      note: string | null;
    }
  | {
      kind: 'open';
      id: string;
      number: number;
      title: string;
      lead: string;
      rest: string;
    };

export interface ComposedTodoRef {
  slug: string;
  path: string;
  url: string;
}

export interface ComposedTodoLifecycle {
  head: { eyebrow: string; created: string | null; title: string | null };
  chips: {
    status: { label: 'Done' | 'Pending' | 'Unfiled'; tone: TodoTone };
    weight: { level: TodoLevelName; text: string; lead: string; tail: string | null; title: string };
    area: string | null;
  };
  steps: ComposedTodoStep[];
  noted: ComposedTodoNoted | null;
  captured: ComposedTodoCaptured;
  end: ComposedTodoEnd;
  /** Every note the text can link to: an existing note with a resolved url. */
  refs: ComposedTodoRef[];
  also: { label: string; targetId: string | null }[];
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

/** A date as text: a Date becomes its ISO string (a day when it is exactly midnight UTC), a string or a
 * number is kept as written. */
function asDateText(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const iso = value.toISOString();
    return iso.slice(11) === '00:00:00.000Z' ? iso.slice(0, 10) : iso;
  }
  return asStr(value);
}

function asNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function blocksOf(value: unknown): TodoBlock[] {
  return list(value).filter((block) => rec(block) !== null) as TodoBlock[];
}

function upperFirst(text: string): string {
  return text === '' ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

const WAYS: Record<string, string> = {
  listed: 'Listed in notes:',
  wiki: 'Linked in the text',
  mentioned: 'Mentioned in the text',
  promoted: 'Promoted word for word',
};

const CLAMP_AT = 220;

function levelOf(value: unknown): TodoLevelName {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'unrated';
}

function rangeOf(from: number | null, to: number | null): string | null {
  if (from === null) return null;
  const end = to ?? from;
  return from === end ? `L${from}` : `L${from}–${end}`;
}

function slugOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  return name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name;
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

export function composeTodoLifecycle(input: ViewInput, options: TodoDateOptions = {}): ComposedTodoLifecycle | null {
  const todo = rec(rec(input?.structured)?.todo) as Partial<TodoFileBody> | null;
  if (todo === null) return null;
  try {
    return compose(input, todo, options);
  } catch {
    return null;
  }
}

function compose(input: ViewInput, todo: Partial<TodoFileBody>, options: TodoDateOptions): ComposedTodoLifecycle {
  const timeZone = zoneOf(options.timeZone);
  const now = options.now ?? new Date();
  const frontmatter = rec(input.frontmatter) ?? {};
  const context = rec(input.todoContext) as Partial<TodoContext> | null;

  const status = todo.status === 'done' || todo.status === 'pending' ? todo.status : 'unfiled';
  const done = status === 'done';
  const folder = asStr(todo.folder);
  const created = asDateText(todo.created);
  const severity = asStr(todo.severity);
  const priority = asStr(todo.priority);
  const area = asStr(todo.area) ?? asStr(todo.theme);
  const source = asStr(todo.source);
  const quickTask = asStr(todo.quickTask);
  const closedOn = asDateText(todo.closedOn);
  const leadPart = rec(todo.lead);
  const planPart = rec(todo.plan);
  const closingPart = rec(todo.closing);
  const checks = rec(planPart?.checks);
  const checkDone = asNum(checks?.done);
  const checkTotal = asNum(checks?.total);
  const checkCount = checkDone !== null && checkTotal !== null && checkTotal > 0 ? { done: checkDone, total: checkTotal } : null;

  // The notes, in the order the server found them.
  const contextNotes = list(context?.notes)
    .map((entry) => rec(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null && asStr(entry.path) !== null);
  const dated = contextNotes
    .map((entry) => ({ entry, stamp: readStamp(asDateText(entry.date) ?? '', timeZone) }))
    .filter((item): item is { entry: Record<string, unknown>; stamp: Stamp } => item.stamp !== null)
    .sort((a, b) => stampKey(a.stamp) - stampKey(b.stamp));
  const noteCards: ComposedTodoNote[] = contextNotes.map((entry) => {
    const path = asStr(entry.path) as string;
    const title = asStr(entry.title);
    const body = asStr(entry.text) ?? '';
    const text = entry.cut === true && body !== '' ? `${body} …` : body;
    const date = asDateText(entry.date);
    const missing = entry.exists === false;
    return {
      path,
      url: missing ? null : asStr(entry.url),
      kicker: date === null ? 'Note' : `Note · ${formatShort(date, timeZone)}`,
      way: WAYS[asStr(entry.via) ?? ''] ?? 'Linked',
      title,
      text,
      clamp: !missing && title === null && text.length > CLAMP_AT,
      missing,
    };
  });
  const hasNotes = noteCards.length > 0;

  // Stage numbers: Noted is 1 when there are notes.
  const first = hasNotes ? 1 : 0;
  const notedId = 'todo-noted';
  const capturedId = 'todo-captured';
  const endId = 'todo-closed';

  // Head and chips.
  const writtenWeight = severity ?? priority;
  const level = levelOf(todo.level);
  const weight = {
    level,
    text: writtenWeight === null ? 'Unrated' : severity !== null && priority !== null ? `${upperFirst(severity)} · priority ${priority}` : upperFirst(writtenWeight),
    lead: writtenWeight === null ? 'Unrated' : upperFirst(writtenWeight),
    tail: severity !== null && priority !== null ? `priority ${priority}` : null,
    title: writtenWeight === null ? 'No severity recorded' : severity !== null ? `severity: ${severity}` : `priority: ${priority}`,
  };

  // The step strip.
  const noteCount = noteCards.length;
  const notedStep: ComposedTodoStep = hasNotes
    ? {
        key: 'noted',
        state: 'done',
        value: dated.length > 0 ? formatShort(asDateText(dated[0].entry.date) as string, timeZone) : 'Date not recorded',
        sub: `${plural(noteCount, 'note')}${dated.length > 1 ? ` · last ${formatShort(asDateText(dated[dated.length - 1].entry.date) as string, timeZone)}` : ''}`,
        target: notedId,
      }
    : { key: 'noted', state: 'none', value: 'No note', sub: 'Captured straight as a todo', target: null };
  const capturedStep: ComposedTodoStep = {
    key: 'captured',
    state: created === null ? 'none' : 'done',
    value: created === null ? 'Date not recorded' : formatShort(created, timeZone),
    sub: [severity ?? priority, area].filter((part): part is string => part !== null).join(' · ') || 'No severity or area',
    target: capturedId,
  };
  const days = created === null ? null : daysOpen(created, now, timeZone);
  const endStep: ComposedTodoStep = done
    ? {
        key: 'closed',
        state: 'done',
        value: quickTask !== null ? `quick ${quickTask}` : closedOn !== null ? formatDay(closedOn, timeZone) : 'Done',
        sub:
          closedOn !== null
            ? `${formatDay(closedOn, timeZone)}${closingPart !== null ? '' : ' · no resolution written'}`
            : closingPart !== null
              ? 'Date not recorded'
              : 'No resolution written',
        target: endId,
      }
    : {
        key: 'now',
        state: 'now',
        value: created === null ? 'Open' : openLabel(days),
        sub: checkCount !== null ? `${checkCount.done} of ${checkCount.total} done` : status === 'pending' ? 'Waiting in todos/pending/' : 'Filed outside todos/pending/',
        target: endId,
      };

  // The Noted stage.
  const noted: ComposedTodoNoted | null = hasNotes
    ? { id: notedId, number: 1, kicker: `${plural(noteCount, 'note')} · the todo was made from ${noteCount > 1 ? 'these' : 'this'}`, notes: noteCards }
    : null;

  // The Captured stage.
  const leadLabel = leadPart === null ? null : asStr(leadPart.heading) !== null ? upperFirst((asStr(leadPart.heading) as string).toLowerCase()) : 'What it’s about';
  const lead: ComposedTodoPart | null = leadPart === null ? null : { label: leadLabel as string, blocks: blocksOf(leadPart.blocks) };
  const planBase = planPart === null ? null : planPart.kind === 'acceptance' ? 'Done when' : planPart.kind === 'solution' ? 'Solution' : 'To do';
  const plan =
    planPart === null || planBase === null
      ? null
      : {
          label: `${planBase}${checkCount !== null ? ` · ${checkCount.done} of ${checkCount.total}` : ''}`,
          blocks: blocksOf(planPart.blocks),
          checks: checkCount,
        };
  const fileRows: ComposedTodoFileRow[] = list(todo.files)
    .map((entry) => rec(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null && asStr(entry.name) !== null)
    .map((entry) => ({
      dir: typeof entry.dir === 'string' ? entry.dir : '',
      name: asStr(entry.name) as string,
      range: rangeOf(asNum(entry.from), asNum(entry.to)),
      raw: asStr(entry.raw) ?? (asStr(entry.name) as string),
    }));
  const noLeadOrPlan = lead === null && plan === null;
  const extras: ComposedTodoExtra[] = list(todo.extras)
    .map((entry) => rec(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null && asStr(entry.heading) !== null)
    .map((entry, index) => ({ heading: asStr(entry.heading) as string, blocks: blocksOf(entry.blocks), open: noLeadOrPlan && index === 0 }));
  const captured: ComposedTodoCaptured = {
    id: capturedId,
    number: first + 1,
    kicker: `${created === null ? 'date not recorded' : formatShort(created, timeZone)}${source !== null ? ` · ${source}` : ''}`,
    lead,
    plan,
    files: fileRows.length > 0 ? { count: fileRows.length, rows: fileRows } : null,
    extras,
    empty: noLeadOrPlan && extras.length === 0,
  };

  // The end stage.
  const closedByRec = rec(context?.closedBy);
  const closedByLabel = asStr(closedByRec?.label) ?? (quickTask !== null ? `quick ${quickTask}` : null);
  const closedBy = closedByLabel === null ? null : { label: closedByLabel, url: asStr(closedByRec?.url) };
  const end: ComposedTodoEnd = done
    ? {
        kind: 'closed',
        id: endId,
        number: first + 2,
        title: 'Closed',
        kicker: [closedBy?.label ?? null, closedOn !== null ? formatDay(closedOn, timeZone) : null].filter((part): part is string => part !== null).join(' · ') || `moved to ${folder ?? 'completed'}/`,
        closedBy,
        closedOn,
        closing: closingPart === null ? null : blocksOf(closingPart.blocks),
        commits: list(todo.commits).filter((hash): hash is string => typeof hash === 'string'),
        note: closingPart === null ? `Moved to todos/${folder ?? 'completed'}/ with no resolution written.` : null,
      }
    : {
        kind: 'open',
        id: endId,
        number: first + 2,
        title: 'Still open',
        lead: days === null ? 'Still open.' : `${openLabel(days)}.`,
        rest: `Nothing has closed it yet${checkCount !== null ? ` — ${checkCount.done} of ${checkCount.total} items checked` : ''}.`,
      };

  const refs: ComposedTodoRef[] = noteCards
    .filter((note) => !note.missing && note.url !== null)
    .map((note) => ({ slug: slugOf(note.path), path: note.path, url: note.url as string }));

  return {
    head: {
      eyebrow: 'Todo',
      created: created === null ? null : formatDay(created, timeZone),
      title: asStr(frontmatter.title),
    },
    chips: {
      status: done ? { label: 'Done', tone: 'complete' } : status === 'pending' ? { label: 'Pending', tone: 'in-flight' } : { label: 'Unfiled', tone: 'quiet' },
      weight,
      area,
    },
    steps: [notedStep, capturedStep, endStep],
    noted,
    captured,
    end,
    refs,
    also: Object.keys(frontmatter).length > 0 ? [{ label: 'Frontmatter', targetId: null }] : [],
  };
}

function stampKey(stamp: Stamp): number {
  const minutes = stamp.time === null ? 0 : Number(stamp.time.slice(0, 2)) * 60 + Number(stamp.time.slice(3, 5));
  return Date.UTC(stamp.year, stamp.month - 1, stamp.day) / 60_000 + minutes;
}
