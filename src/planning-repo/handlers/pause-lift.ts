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
import { fenceMarker, scanFencedLines } from './fenced-sections.ts';
import type { FenceMarker } from './fenced-sections.ts';
import { parseMarkdownTable } from './markdown-sections.ts';

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

// ---------------------------------------------------------------------------------------------------------
// .continue-here.md
// ---------------------------------------------------------------------------------------------------------

export interface ContinueHereTags {
  currentState?: string;
  completedWork?: string;
  remainingWork?: string;
  decisionsMade?: string;
  blockers?: string;
  context?: string;
  nextAction?: string;
}

/** The seven pseudo-XML tag sections of the template, by the key the lift stores them under. */
const TAGS: ReadonlyMap<string, keyof ContinueHereTags> = new Map([
  ['current_state', 'currentState'],
  ['completed_work', 'completedWork'],
  ['remaining_work', 'remainingWork'],
  ['decisions_made', 'decisionsMade'],
  ['blockers', 'blockers'],
  ['context', 'context'],
  ['next_action', 'nextAction'],
]);

/** A `- [ ] CONSTRAINT: name — what — mitigation` line. A line that does not split keeps its whole text as
 * `name`; one split gives a name and a `what`; two give all three. */
export interface PauseConstraint {
  name: string;
  what?: string;
  mitigation?: string;
}

export interface PauseAntiPattern {
  pattern: string;
  description?: string;
  /** The severity cell as written. */
  severity?: string;
  /** True when the severity cell says blocking. */
  blocking: boolean;
  prevention?: string;
}

export interface PauseSection {
  heading: string;
  text: string;
}

export interface ContinueHereLift {
  /** `context` frontmatter: phase, spike and so on. */
  context?: string;
  phase?: string;
  task?: number | string;
  totalTasks?: number | string;
  status?: string;
  /** `last_updated` as the day, or the full ISO time when a time of day is present. */
  lastUpdated?: string;
  tags: ContinueHereTags;
  constraints: PauseConstraint[];
  antiPatterns: PauseAntiPattern[];
  /** Every other `##` heading with its text, in file order, after the text before the first one. */
  sections: PauseSection[];
  moreCount: number;
}

/** What `structured.pause` carries: a lift stamped with the file it came from. */
export type PauseBody =
  | (HandoffLift & { source: 'handoff' })
  | (ContinueHereLift & { source: 'continue-here' });

/** The tag a line names when it is only that tag (`<current_state>` or `</current_state>`), else null. */
function tagLine(line: string): { key: keyof ContinueHereTags; name: string; closing: boolean } | null {
  const trimmed = line.trim();
  if (trimmed.length < 9 || trimmed.length > 22) return null;
  if (trimmed.charCodeAt(0) !== 60 || trimmed.charCodeAt(trimmed.length - 1) !== 62) return null;
  const inner = trimmed.slice(1, -1);
  const closing = inner.charCodeAt(0) === 47;
  const name = closing ? inner.slice(1) : inner;
  const key = TAGS.get(name);
  return key === undefined ? null : { key, name, closing };
}

export interface PauseBodyScan {
  /** Each tag's text, read from the untouched body; the first block of a tag wins. */
  tags: ContinueHereTags;
  /** The lines outside every tag block, carriage returns dropped. */
  rest: string[];
  /** The body with every tag-only line blanked and all content kept (RESEARCH Pitfall 4). */
  blanked: string;
}

/**
 * One linear pass over a `.continue-here.md` body (fences honoured). Tag names such as `<context>` are
 * valid CommonMark HTML block openers, so a tag-only line swallows the heading after it when the body is
 * rendered: the renderer gets `blanked`, while the tags are read from the untouched lines. A tag with no
 * closing line is not a block (its content stays in `rest`); each tag name is searched for at most once,
 * so the scan costs at most seven passes over the lines.
 */
export function scanPauseBody(body: string): PauseBodyScan {
  const lines = body.split('\n');
  const blanked = lines.slice();
  const inBlock = new Uint8Array(lines.length);
  const tags: ContinueHereTags = {};
  const settled = new Set<string>();
  let fence: FenceMarker | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const marker = fenceMarker(line);
    if (fence !== null) {
      if (marker !== null && marker.bare && marker.char === fence.char && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker !== null) {
      fence = marker;
      continue;
    }
    const tag = tagLine(line);
    if (tag === null) continue;
    blanked[i] = '';
    if (tag.closing || settled.has(tag.name)) continue;
    settled.add(tag.name);
    let close = -1;
    for (let j = i + 1; j < lines.length; j += 1) {
      const candidate = tagLine(lines[j]);
      if (candidate !== null && candidate.closing && candidate.name === tag.name) {
        close = j;
        break;
      }
    }
    if (close === -1) continue;
    const text = lines.slice(i + 1, close).join('\n').trim();
    if (text !== '') tags[tag.key] = cap(text);
    for (let k = i; k <= close; k += 1) inBlock[k] = 1;
    blanked[close] = '';
    i = close;
  }
  const rest: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (inBlock[i] === 1) continue;
    const line = lines[i];
    rest.push(line.endsWith('\r') ? line.slice(0, -1) : line);
  }
  return { tags, rest, blanked: blanked.join('\n') };
}

/** The body for the renderer: every tag-only line blanked, everything else untouched. */
export function blankPauseTagLines(body: string): string {
  return scanPauseBody(body).blanked;
}

const LINE_CAP = PAUSE_TEXT_CAP + 200;
const SEPARATOR = ' — ';

/** The text after `CONSTRAINT:` on a `- [ ] CONSTRAINT: …` list line, else undefined. No regular expression. */
function constraintText(line: string): string | undefined {
  const text = (line.length > LINE_CAP ? line.slice(0, LINE_CAP) : line).trimStart();
  const bullet = text.charCodeAt(0);
  if (bullet !== 45 && bullet !== 42) return undefined;
  let i = 1;
  while (text.charCodeAt(i) === 32) i += 1;
  if (text.charCodeAt(i) !== 91 || text.charCodeAt(i + 2) !== 93) return undefined;
  i += 3;
  while (text.charCodeAt(i) === 32) i += 1;
  if (text.slice(i, i + 11).toLowerCase() !== 'constraint:') return undefined;
  const value = text.slice(i + 11).trim();
  return value === '' ? undefined : value;
}

/** Splits a constraint on its em-dash separators into name, what and mitigation; a line that does not split
 * stays whole in `name`. */
export function splitConstraint(text: string): PauseConstraint {
  const parts = text.split(SEPARATOR).map((part) => part.trim());
  if (parts.length < 2 || parts[0] === '') return { name: cap(text) };
  const constraint: PauseConstraint = { name: cap(parts[0]) };
  if (parts[1] !== '') constraint.what = cap(parts[1]);
  if (parts.length > 2) {
    const mitigation = parts.slice(2).join(SEPARATOR).trim();
    if (mitigation !== '') constraint.mitigation = cap(mitigation);
  }
  return constraint;
}

/** A YAML Date as the day, or the full ISO time when a time of day is present; anything else as text. */
function dateOf(value: unknown): string | undefined {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    const iso = value.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  }
  return textOf(value);
}

/** The cell whose header starts with `prefix`, compared lower-cased. */
function cellOf(row: Record<string, string>, prefix: string): string | undefined {
  for (const header of Object.keys(row)) {
    if (header.toLowerCase().startsWith(prefix)) return textOf(row[header]);
  }
  return undefined;
}

/** A line that is one HTML comment and nothing else (the made-up example markers sit on such a line). */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('<!--') && trimmed.endsWith('-->');
}

/** The text of a heading line without its hashes. */
function headingOf(line: string): string {
  let i = 0;
  while (line.charCodeAt(i) === 35) i += 1;
  return line.slice(i).trim();
}

/**
 * The projection of a `.continue-here.md`: its frontmatter fields, the seven tag sections read from the
 * untouched body, the constraint lines, the Critical Anti-Patterns table, and every other `##` heading as a
 * section (the text before the first one is a section headed by its title line). The handler still guards
 * the call.
 */
export function extractContinueHere(frontmatter: Record<string, unknown>, body: string): ContinueHereLift {
  const fm = isRecord(frontmatter) ? frontmatter : {};
  const scan = scanPauseBody(body);
  const overflow: Overflow = { more: 0 };
  const lift: ContinueHereLift = { tags: scan.tags, constraints: [], antiPatterns: [], sections: [], moreCount: 0 };
  put(lift, 'context', textOf(own(fm, 'context')));
  put(lift, 'phase', textOf(own(fm, 'phase')));
  put(lift, 'task', scalarOf(own(fm, 'task')));
  put(lift, 'totalTasks', scalarOf(own(fm, 'total_tasks')));
  put(lift, 'status', textOf(own(fm, 'status')));
  put(lift, 'lastUpdated', dateOf(own(fm, 'last_updated')));

  // Constraint lines, outside fences, anywhere in what is left of the file.
  const lines = scan.rest;
  const isConstraint = new Uint8Array(lines.length);
  let fence: FenceMarker | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const marker = fenceMarker(lines[i]);
    if (fence !== null) {
      if (marker !== null && marker.bare && marker.char === fence.char && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker !== null) {
      fence = marker;
      continue;
    }
    const text = constraintText(lines[i]);
    if (text === undefined) continue;
    isConstraint[i] = 1;
    if (lift.constraints.length >= PAUSE_ROW_CAP) overflow.more += 1;
    else lift.constraints.push(splitConstraint(text));
  }

  const textBetween = (from: number, to: number): string => {
    const kept: string[] = [];
    for (let i = from; i < to; i += 1) if (isConstraint[i] === 0) kept.push(lines[i]);
    return kept.join('\n').trim();
  };
  const headings = scanFencedLines(lines).filter((section) => section.level === 2);
  const firstHeading = headings.length > 0 ? headings[0].startLine : lines.length;
  const sections: PauseSection[] = [];

  // The text before the first `##`: a title line gives the heading; a BLOCKING CONSTRAINTS block that
  // yielded constraints is not repeated as a section.
  let first = 0;
  while (first < firstHeading && (lines[first].trim() === '' || isCommentLine(lines[first]))) first += 1;
  let title = '';
  let from = 0;
  let droppedConstraintBlock = false;
  if (first < firstHeading && lines[first].charCodeAt(0) === 35) {
    title = headingOf(lines[first]);
    from = first + 1;
    droppedConstraintBlock = lift.constraints.length > 0 && title.toLowerCase().startsWith('blocking constraints');
  }
  if (!droppedConstraintBlock) {
    const text = textBetween(from, firstHeading);
    if (text !== '') sections.push({ heading: title === '' ? 'Note' : title.slice(0, 300), text: cap(text) });
  }

  for (const section of headings) {
    const text = textBetween(section.startLine + 1, section.endLine);
    if (section.heading.toLowerCase().startsWith('critical anti-pattern')) {
      const rows = parseMarkdownTable(text);
      if (rows.length > 0) {
        for (const row of rows) {
          const pattern = cellOf(row, 'pattern');
          if (pattern === undefined) continue;
          if (lift.antiPatterns.length >= PAUSE_ROW_CAP) {
            overflow.more += 1;
            continue;
          }
          const severity = cellOf(row, 'severity');
          const entry: PauseAntiPattern = {
            pattern,
            blocking: severity !== undefined && severity.toLowerCase().startsWith('blocking'),
          };
          put(entry, 'description', cellOf(row, 'description'));
          put(entry, 'severity', severity);
          put(entry, 'prevention', cellOf(row, 'prevention'));
          lift.antiPatterns.push(entry);
        }
        continue;
      }
    }
    if (text === '') continue;
    if (sections.length >= PAUSE_ROW_CAP) {
      overflow.more += 1;
      continue;
    }
    sections.push({ heading: section.heading, text: cap(text) });
  }
  lift.sections = sections;
  lift.moreCount = overflow.more;
  return lift;
}
