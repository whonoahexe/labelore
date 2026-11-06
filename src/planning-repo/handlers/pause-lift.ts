// The pause lifts (Phase 11, 11-07, VIEW-17, D-05). `/gsd-pause-work` writes two files together: a
// HANDOFF.json (the machine record: where work stopped, the lists, the next action) and a `.continue-here.md`
// (the note: frontmatter, constraints, anti-patterns and pseudo-XML tag sections). This module turns each
// into the projection the pause page and the pause context read. It never writes and never throws on author
// data it can read around; the handlers still guard the call, so a throw only omits `structured.pause`.
//
// Every field is optional (a file may carry any subset, and the older layout has no lists at all): a scalar
// that is absent is left out of the object, a list that is absent is an empty array. Author keys are read
// through Object.hasOwn (RESEARCH Pitfall 11) and nothing from a file is spread into a plain object, so a
// key such as `constructor` cannot reach a prototype. Lists are capped at PAUSE_ROW_CAP rows and every
// string at PAUSE_TEXT_CAP characters, and the rows past the cap are counted in `moreCount`, because the
// whole structured record ships to the browser (T-11-09).

/** The most rows any one list keeps. */
export const PAUSE_ROW_CAP = 200;
/** The longest string kept, in characters. */
export const PAUSE_TEXT_CAP = 4000;

// ---------------------------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------------------------

/** A task row from `completed_tasks` or `remaining_tasks`. A plan-shaped entry (an id, a wave and nested
 * `tasks[]`) is one row naming the plan, with `taskCount` set to the number of tasks it nests (RESEARCH C9). */
export interface PauseTaskRow {
  id?: string;
  name?: string;
  status?: string;
  commit?: string;
  progress?: string;
  wave?: string;
  /** Set only for a plan-shaped entry: how many tasks it nests. */
  taskCount?: number;
}

export interface PauseHumanAction {
  action: string;
  context?: string;
  blocking: boolean;
}

export interface PauseBlocker {
  description: string;
  type?: string;
  workaround?: string;
}

export interface PauseDecision {
  decision: string;
  rationale?: string;
  phase?: string;
}

export interface PauseNote {
  text: string;
  detail?: string;
}

export interface HandoffLift {
  version?: string;
  /** The pause date as written: `timestamp`, else the older `paused_at`. */
  pausedAt?: string;
  /** Which key the date came from. */
  pausedAtSource?: 'timestamp' | 'paused_at';
  phase?: string;
  phaseName?: string;
  phaseDir?: string;
  plan?: string;
  task?: number | string;
  totalTasks?: number | string;
  status?: string;
  completed: PauseTaskRow[];
  remaining: PauseTaskRow[];
  blockers: PauseBlocker[];
  asyncJobs: PauseNote[];
  humanActions: PauseHumanAction[];
  decisions: PauseDecision[];
  uncommittedFiles: string[];
  nextAction?: string;
  contextNotes?: string;
  /** Top-level keys outside the known set, names only. */
  unknownKeys: string[];
  /** Rows dropped by the per-list cap, summed over every list. */
  moreCount: number;
}

// ---------------------------------------------------------------------------------------------------------
// Reading helpers
// ---------------------------------------------------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An own property, never one inherited from a prototype. */
function own(record: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

function cap(text: string): string {
  return text.length > PAUSE_TEXT_CAP ? text.slice(0, PAUSE_TEXT_CAP) : text;
}

/** A non-empty trimmed string, a number or a boolean read as text, else undefined. */
export function textOf(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : cap(trimmed);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return undefined;
}

/** A number kept as a number, a non-empty string kept as text, else undefined. */
function scalarOf(value: unknown): number | string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return textOf(value);
}

interface Overflow {
  more: number;
}

/** The first PAUSE_ROW_CAP entries of a list, the rest counted. Not a list gives an empty one. */
function rowsOf(value: unknown, overflow: Overflow): unknown[] {
  if (!Array.isArray(value)) return [];
  if (value.length > PAUSE_ROW_CAP) overflow.more += value.length - PAUSE_ROW_CAP;
  return value.length > PAUSE_ROW_CAP ? value.slice(0, PAUSE_ROW_CAP) : value;
}

function put<T extends object, K extends string>(target: T, key: K, value: unknown): void {
  if (value !== undefined) (target as Record<string, unknown>)[key] = value;
}

// ---------------------------------------------------------------------------------------------------------
// Task lists
// ---------------------------------------------------------------------------------------------------------

/**
 * Both task shapes of a HANDOFF list, defensively (RESEARCH C9): a task object (`id`, `name`, `status`,
 * `commit` or `progress`) and a plan-shaped entry (`id`, `wave`, nested `tasks[]`), which becomes one row
 * naming the plan with its task count. A bare string is a row with only a name. Nothing is dropped.
 */
export function normaliseTasks(list: unknown, overflow: Overflow = { more: 0 }): PauseTaskRow[] {
  const rows: PauseTaskRow[] = [];
  for (const entry of rowsOf(list, overflow)) {
    const row: PauseTaskRow = {};
    if (isRecord(entry)) {
      put(row, 'id', textOf(own(entry, 'id')));
      put(row, 'name', textOf(own(entry, 'name')) ?? textOf(own(entry, 'title')) ?? textOf(own(entry, 'description')));
      put(row, 'status', textOf(own(entry, 'status')));
      put(row, 'commit', textOf(own(entry, 'commit')));
      put(row, 'progress', textOf(own(entry, 'progress')));
      put(row, 'wave', textOf(own(entry, 'wave')));
      const nested = own(entry, 'tasks');
      if (Array.isArray(nested)) row.taskCount = nested.length;
    } else {
      const name = textOf(entry);
      if (name === undefined) continue;
      row.name = name;
    }
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------
// HANDOFF.json
// ---------------------------------------------------------------------------------------------------------

/** The keys the lift reads, plus the made-up example markers. Anything else is listed in `unknownKeys`. */
const KNOWN_HANDOFF_KEYS: ReadonlySet<string> = new Set([
  'version',
  'timestamp',
  'paused_at',
  'phase',
  'phase_name',
  'phase_dir',
  'plan',
  'task',
  'total_tasks',
  'status',
  'completed_tasks',
  'remaining_tasks',
  'blockers',
  'async_jobs',
  'human_actions_pending',
  'decisions',
  'uncommitted_files',
  'next_action',
  'context_notes',
  'made_up_example',
  'derived_from',
  'gsd_core_version',
]);

function humanActionsOf(value: unknown, overflow: Overflow): PauseHumanAction[] {
  const rows: PauseHumanAction[] = [];
  for (const entry of rowsOf(value, overflow)) {
    if (isRecord(entry)) {
      const action = textOf(own(entry, 'action')) ?? textOf(own(entry, 'description'));
      if (action === undefined) continue;
      const row: PauseHumanAction = { action, blocking: own(entry, 'blocking') === true || own(entry, 'blocking') === 'true' };
      put(row, 'context', textOf(own(entry, 'context')));
      rows.push(row);
    } else {
      const action = textOf(entry);
      if (action !== undefined) rows.push({ action, blocking: false });
    }
  }
  return rows;
}

function blockersOf(value: unknown, overflow: Overflow): PauseBlocker[] {
  const rows: PauseBlocker[] = [];
  for (const entry of rowsOf(value, overflow)) {
    if (isRecord(entry)) {
      const description = textOf(own(entry, 'description')) ?? textOf(own(entry, 'blocker'));
      if (description === undefined) continue;
      const row: PauseBlocker = { description };
      put(row, 'type', textOf(own(entry, 'type')));
      put(row, 'workaround', textOf(own(entry, 'workaround')));
      rows.push(row);
    } else {
      const description = textOf(entry);
      if (description !== undefined) rows.push({ description });
    }
  }
  return rows;
}

function decisionsOf(value: unknown, overflow: Overflow): PauseDecision[] {
  const rows: PauseDecision[] = [];
  for (const entry of rowsOf(value, overflow)) {
    if (isRecord(entry)) {
      const decision = textOf(own(entry, 'decision')) ?? textOf(own(entry, 'summary'));
      if (decision === undefined) continue;
      const row: PauseDecision = { decision };
      put(row, 'rationale', textOf(own(entry, 'rationale')));
      put(row, 'phase', textOf(own(entry, 'phase')));
      rows.push(row);
    } else {
      const decision = textOf(entry);
      if (decision !== undefined) rows.push({ decision });
    }
  }
  return rows;
}

function notesOf(value: unknown, overflow: Overflow): PauseNote[] {
  const rows: PauseNote[] = [];
  for (const entry of rowsOf(value, overflow)) {
    if (isRecord(entry)) {
      const text =
        textOf(own(entry, 'description')) ??
        textOf(own(entry, 'name')) ??
        textOf(own(entry, 'job')) ??
        textOf(own(entry, 'command')) ??
        textOf(own(entry, 'id'));
      if (text === undefined) continue;
      const row: PauseNote = { text };
      put(row, 'detail', textOf(own(entry, 'status')) ?? textOf(own(entry, 'note')) ?? textOf(own(entry, 'result')));
      rows.push(row);
    } else {
      const text = textOf(entry);
      if (text !== undefined) rows.push({ text });
    }
  }
  return rows;
}

/** The porcelain lines as written (a leading space is part of the status code), capped, never trimmed. */
function porcelainOf(value: unknown, overflow: Overflow): string[] {
  const rows: string[] = [];
  for (const entry of rowsOf(value, overflow)) {
    if (typeof entry !== 'string' || entry.trim() === '') continue;
    rows.push(cap(entry.trimEnd()));
  }
  return rows;
}

/**
 * The projection of a parsed HANDOFF.json. `value` is the parsed object (prototype keys already stripped by
 * tryParseJson). Every field is optional; lists default to empty. Throws on a value that is not an object,
 * which the handler's guard turns into "no structured.pause".
 */
export function extractHandoff(value: unknown): HandoffLift {
  if (!isRecord(value)) throw new TypeError('A HANDOFF.json lift needs an object');
  const overflow: Overflow = { more: 0 };
  const lift: HandoffLift = {
    completed: normaliseTasks(own(value, 'completed_tasks'), overflow),
    remaining: normaliseTasks(own(value, 'remaining_tasks'), overflow),
    blockers: blockersOf(own(value, 'blockers'), overflow),
    asyncJobs: notesOf(own(value, 'async_jobs'), overflow),
    humanActions: humanActionsOf(own(value, 'human_actions_pending'), overflow),
    decisions: decisionsOf(own(value, 'decisions'), overflow),
    uncommittedFiles: porcelainOf(own(value, 'uncommitted_files'), overflow),
    unknownKeys: [],
    moreCount: 0,
  };
  put(lift, 'version', textOf(own(value, 'version')));
  const timestamp = textOf(own(value, 'timestamp'));
  const pausedAt = textOf(own(value, 'paused_at'));
  if (timestamp !== undefined) {
    lift.pausedAt = timestamp;
    lift.pausedAtSource = 'timestamp';
  } else if (pausedAt !== undefined) {
    lift.pausedAt = pausedAt;
    lift.pausedAtSource = 'paused_at';
  }
  put(lift, 'phase', textOf(own(value, 'phase')));
  put(lift, 'phaseName', textOf(own(value, 'phase_name')));
  put(lift, 'phaseDir', textOf(own(value, 'phase_dir')));
  put(lift, 'plan', textOf(own(value, 'plan')));
  put(lift, 'task', scalarOf(own(value, 'task')));
  put(lift, 'totalTasks', scalarOf(own(value, 'total_tasks')));
  put(lift, 'status', textOf(own(value, 'status')));
  put(lift, 'nextAction', textOf(own(value, 'next_action')));
  put(lift, 'contextNotes', textOf(own(value, 'context_notes')));
  for (const key of Object.keys(value)) {
    if (KNOWN_HANDOFF_KEYS.has(key)) continue;
    if (lift.unknownKeys.length >= PAUSE_ROW_CAP) {
      overflow.more += 1;
      continue;
    }
    lift.unknownKeys.push(key.length > 200 ? key.slice(0, 200) : key);
  }
  lift.moreCount = overflow.more;
  return lift;
}

/** What `structured.pause` carries: a lift stamped with the file it came from. */
export type PauseBody = HandoffLift & { source: 'handoff' };
