// The pause page's composer (Phase 11, 11-10, VIEW-17, sketch 054 winner C "Gate path"): a pure `ViewInput` ->
// `ComposedPause` merge of the server-built `pauseContext` (11-07's join of HANDOFF.json, the paired
// `.continue-here.md`, STATE and ROADMAP). One page serves both files (D-05); where they differ, both values are
// kept and named, never merged (D-05, project rule). The page answers "can I pick this up now, and where?":
//   - the head: the eyebrow "Paused work · {context}", the phase (or spike) name as the h1, and the lead
//     "Paused in {context}, {date} · {N} days ago", the age counted from the pause date to the day the project
//     was read (`readAt`, D-08), never the browser's clock;
//   - the path, top to bottom on one rail: Behind you (done tasks), Stopped here ("task {N} of {M} · {status}",
//     the status verbatim, then one block per field where the two files differ), the gates (blocking human
//     actions, then blocking constraints, then blocking anti-patterns, "Gate {i} of {n} · {kind}"), Resume here
//     ("after {n} gates") and Ahead (tasks left; a plan-shaped entry is one chip with its task count);
//   - side notes (a non-blocking human action, an advisory anti-pattern) branch off beside the stop and the first
//     gate; with nothing blocking, one cleared gate reads "No gates: nothing blocks resuming".
// The composer holds no DOM, no filesystem access, no rendering, no regular expression and no module-level
// mutable state: two pause pages open at once each compose only from their own input. It returns `null` when the
// context is missing, so the page keeps the promoted-section view with no notice (Phase 10 C1, X2). T-11-12:
// every string is author text rendered as React text by the components.
import type {
  PauseDisagreement,
  PauseGate,
  PauseMovedOn,
  PauseRestSection,
  PauseText,
} from '../../presentation/pause-context.ts';
import type { PauseTaskRow } from '../../planning-repo/handlers/pause-lift.ts';
import type { ViewInput } from './manifest.ts';

export const HANDOFF_NAME = 'HANDOFF.json';
export const CONTINUE_NAME = '.continue-here.md';

export const NO_CONTINUE_LABEL = 'No .continue-here.md beside it';
export const NO_HANDOFF_LABEL = 'No HANDOFF.json';

const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------------------

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

/** The `YYYY-MM-DD` day a date text starts with, else null. */
export function dayOfIso(iso: string | null | undefined): string | null {
  if (typeof iso !== 'string') return null;
  const head = iso.trim().slice(0, 10);
  if (head.length !== 10 || head.charCodeAt(4) !== 45 || head.charCodeAt(7) !== 45) return null;
  for (const at of [0, 1, 2, 3, 5, 6, 8, 9]) if (!isDigit(head.charCodeAt(at))) return null;
  return Number.isNaN(Date.parse(head)) ? null : head;
}

/**
 * The age of a pause in words, from whole UTC days between the pause's day and the day the project was read:
 * "today" at 0 (and for a pause dated after the read), "1 day ago" at 1, "{n} days ago" after that. Null when
 * either date does not start with a day.
 */
export function daysAgoWords(iso: string | null | undefined, readAt: string | null | undefined): string | null {
  const paused = dayOfIso(iso);
  const read = dayOfIso(readAt);
  if (paused === null || read === null) return null;
  const days = Math.round((Date.parse(read) - Date.parse(paused)) / MS_PER_DAY);
  if (days <= 0) return 'today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/** "1 gate" and "{n} gates". */
export function gateWords(count: number): string {
  return count === 1 ? '1 gate' : `${count} gates`;
}

function sentence(text: string): string {
  return text === '' ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

export interface ComposedPauseFile {
  /** The file's name as the page tags it: HANDOFF.json or .continue-here.md. */
  name: string;
  /** The project-relative path (the copy button copies this). */
  path: string;
}

export interface ComposedPauseHead {
  /** "Paused work · phase 3", or "Paused work" when the files name no context. */
  eyebrow: string;
  /** "phase 3", "spike SPIKE-006", or null. */
  contextLabel: string | null;
  /** The phase name, else "Phase N", else the context in sentence case; null leaves the file's own title. */
  title: string | null;
  /** "Paused in phase 3, 2026-04-06 · 31 days ago"; null when no pause date is stated. */
  dateLine: string | null;
  /** The day and the age pieces of the line, for a page that bolds the count. */
  date: string | null;
  age: string | null;
  /** "Work has moved on since": a quiet fact beside the date, apart from the handoff's own fields (D-08). */
  movedOn: PauseMovedOn | null;
  /** The note as one sentence: "Work has moved on since: Phase 3 ... is complete (ROADMAP, 2026-04-09)". */
  movedOnLine: string | null;
  files: ComposedPauseFile[];
  /** "No .continue-here.md beside it" / "No HANDOFF.json" when one of the pair is absent. */
  missingPartner: string | null;
}

export interface ComposedPauseChip {
  key: string;
  /** The task's id and name as written ("3 Keep a deleted member's loans attributed"). */
  label: string;
  /** The commit a done task carries. */
  commit: string | null;
  /** A plan-shaped entry's "2 tasks" ("1 task"); null for a plain task. */
  count: string | null;
  /** `complete` for a done task, `quiet` for a task left. */
  tone: 'complete' | 'quiet';
}

export interface ComposedPauseTasks {
  /** "Behind you · 2 tasks done" or "Ahead · 3 tasks left" ("1 task done", "1 task left"). */
  label: string;
  chips: ComposedPauseChip[];
}

/** One field where the two files differ: both values, each under its file's name, never merged. */
export interface ComposedPauseDisagreement {
  key: string;
  /** The field word: "task", "total tasks" or "status". */
  field: string;
  left: { label: string; value: string };
  right: { label: string; value: string };
}

export interface ComposedPauseSideNote {
  key: string;
  /** "Can wait" (a human action that does not block) or "Advisory" (an anti-pattern that does not block). */
  label: string;
  what: string;
  detail: string | null;
  file: string;
}

export interface ComposedPauseStop {
  /** "Stopped here · task 3 of 6 · paused": the pieces the file states, in that order. */
  label: string;
  /** The stopped task's name, else "Task {N}"; null when no task is stated. */
  title: string | null;
  progress: string | null;
  disagreements: ComposedPauseDisagreement[];
}

export interface ComposedPauseGate {
  key: string;
  /** "Gate 2 of 4 · Human action". */
  label: string;
  what: string;
  why: string | null;
  /** The mitigation or the prevention mechanism; null for a human action. */
  how: string | null;
  /** "Prevention" for an anti-pattern's mechanism; null when the text stands alone. */
  howLabel: string | null;
  file: string;
}

export interface ComposedPauseGates {
  items: ComposedPauseGate[];
  /** "No gates: nothing blocks resuming" when nothing blocks; null otherwise. */
  clearedLabel: string | null;
}

export interface ComposedPauseResume {
  /** "Resume here" with no gates; "Resume here, after 4 gates" otherwise ("after 1 gate"). */
  label: string;
  /** The next action, as written, with the file it came from. */
  next: PauseText | null;
  /** The other file's wording when it differs, never merged into `next`. */
  other: PauseText | null;
}

/** One block of a prose bar: a paragraph (its own line breaks kept), or a bulleted list. */
export type ComposedPauseBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

/** One closed bar of "The rest of the handoff", tagged with the file it came from. */
export interface ComposedPauseRestBar {
  key: string;
  title: string;
  /** HANDOFF.json or .continue-here.md. */
  file: string;
  /** The row count for a list ("40"); null for prose, which has no count. */
  count: string | null;
  /** `items`: rows of text with an optional detail and tag; `paths`: mono lines, each ellipsised with the full
   * value in its title (the uncommitted files, as written); `blocks`: author prose; `html`: a section of the
   * note rendered through the document's sanitised path. */
  body:
    | { kind: 'items'; items: { text: string; detail: string | null; tag: string | null }[] }
    | { kind: 'paths'; paths: string[] }
    | { kind: 'blocks'; blocks: ComposedPauseBlock[] }
    | { kind: 'html'; html: string };
}

export interface ComposedPause {
  head: ComposedPauseHead;
  /** Done tasks; null for a pause with none (the older HANDOFF layout lists no tasks). */
  behind: ComposedPauseTasks | null;
  stop: ComposedPauseStop;
  /** Side notes beside the stop (the first one) and beside the first gate (the rest). */
  stopSideNotes: ComposedPauseSideNote[];
  gates: ComposedPauseGates;
  gateSideNotes: ComposedPauseSideNote[];
  resume: ComposedPauseResume;
  /** Tasks left; null for a pause with none. */
  ahead: ComposedPauseTasks | null;
  /** "The rest of the handoff": closed bars, HANDOFF.json's first, then every continue-here section. */
  rest: ComposedPauseRestBar[];
}

// ---------------------------------------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------------------------------------

function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export const MOVED_ON_WORDS = 'Work has moved on since';

/** "Work has moved on since: {what} ({source}, {date})"; the date is left out when the source states none. */
export function movedOnLineOf(movedOn: PauseMovedOn | null): string | null {
  const what = textOf(movedOn?.what);
  if (movedOn === null || what === null) return null;
  const source = textOf(movedOn.source);
  const date = textOf(movedOn.date);
  const where = [source, date].filter((part): part is string => part !== null).join(', ');
  return where === '' ? `${MOVED_ON_WORDS}: ${what}` : `${MOVED_ON_WORDS}: ${what} (${where})`;
}

function headOf(input: ViewInput): ComposedPauseHead | null {
  const context = input.pauseContext;
  if (context === null || context === undefined) return null;
  const label = textOf(context.contextLabel);
  const pausedIso = textOf(context.pausedAt?.iso);
  const date = dayOfIso(pausedIso);
  const age = date === null ? null : daysAgoWords(pausedIso, context.readAt);
  let dateLine: string | null = null;
  if (date !== null) {
    const when = label === null ? `Paused ${date}` : `Paused in ${label}, ${date}`;
    dateLine = age === null ? when : `${when} · ${age}`;
  }
  const phaseName = textOf(context.headPhase?.name);
  const phaseNumber = textOf(context.headPhase?.number);
  let title: string | null = null;
  if (phaseName !== null) title = phaseName;
  else if (phaseNumber !== null) title = `Phase ${phaseNumber}`;
  else if (label !== null) title = sentence(label);

  const files: ComposedPauseFile[] = [];
  if (context.files?.handoff) files.push({ name: HANDOFF_NAME, path: context.files.handoff.path });
  if (context.files?.continueHere) files.push({ name: CONTINUE_NAME, path: context.files.continueHere.path });
  let missingPartner: string | null = null;
  if (context.files?.handoff && !context.files?.continueHere) missingPartner = NO_CONTINUE_LABEL;
  else if (context.files?.continueHere && !context.files?.handoff) missingPartner = NO_HANDOFF_LABEL;

  return {
    eyebrow: label === null ? 'Paused work' : `Paused work · ${label}`,
    contextLabel: label,
    title,
    dateLine,
    date,
    age,
    movedOn: context.movedOn ?? null,
    movedOnLine: movedOnLineOf(context.movedOn ?? null),
    files,
    missingPartner,
  };
}

const DISAGREEMENT_FIELDS: ReadonlyMap<PauseDisagreement['field'], string> = new Map([
  ['task', 'task'],
  ['totalTasks', 'total tasks'],
  ['status', 'status'],
]);

function disagreementsOf(input: ViewInput): ComposedPauseDisagreement[] {
  const rows = Array.isArray(input.pauseContext?.disagreements) ? input.pauseContext.disagreements : [];
  const out: ComposedPauseDisagreement[] = [];
  for (const row of rows) {
    // The next action's two wordings sit under the boxed sentence, not in a block of their own.
    const field = DISAGREEMENT_FIELDS.get(row.field);
    if (field === undefined) continue;
    out.push({
      key: row.field,
      field,
      left: { label: row.handoff.file, value: row.handoff.value },
      right: { label: row.continueHere.file, value: row.continueHere.value },
    });
  }
  return out;
}

function stopOf(input: ViewInput): ComposedPauseStop {
  const stop = input.pauseContext?.stop;
  const task = textOf(stop?.task);
  const total = textOf(stop?.totalTasks);
  const status = textOf(stop?.status);
  const pieces = ['Stopped here'];
  if (task !== null) pieces.push(total === null ? `task ${task}` : `task ${task} of ${total}`);
  if (status !== null) pieces.push(status);
  return {
    label: pieces.join(' · '),
    title: textOf(stop?.taskName) ?? (task === null ? null : `Task ${task}`),
    progress: textOf(stop?.progress),
    disagreements: disagreementsOf(input),
  };
}

function taskCountWords(count: number): string {
  return count === 1 ? '1 task' : `${count} tasks`;
}

function chipOf(row: PauseTaskRow, index: number, tone: 'complete' | 'quiet'): ComposedPauseChip {
  const label = [textOf(row.id), textOf(row.name)].filter((part): part is string => part !== null).join(' ');
  return {
    key: `${tone}-${index}`,
    label: label === '' ? `Task ${index + 1}` : label,
    commit: tone === 'complete' ? textOf(row.commit) : null,
    count: typeof row.taskCount === 'number' ? taskCountWords(row.taskCount) : null,
    tone,
  };
}

function tasksOf(rows: unknown, tone: 'complete' | 'quiet'): ComposedPauseTasks | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const chips = (rows as PauseTaskRow[]).map((row, index) => chipOf(row, index, tone));
  const word = tone === 'complete' ? 'done' : 'left';
  const lead = tone === 'complete' ? 'Behind you' : 'Ahead';
  return { label: `${lead} · ${taskCountWords(chips.length)} ${word}`, chips };
}

const GATE_KIND_WORDS: ReadonlyMap<PauseGate['kind'], string> = new Map([
  ['human-action', 'Human action'],
  ['constraint', 'Constraint'],
  ['anti-pattern', 'Anti-pattern'],
]);

const NO_GATES_LABEL = 'No gates: nothing blocks resuming';

function gatesOf(input: ViewInput): ComposedPauseGates {
  const rows = Array.isArray(input.pauseContext?.gates) ? input.pauseContext.gates : [];
  const items = rows.map((gate, index): ComposedPauseGate => {
    const kind = GATE_KIND_WORDS.get(gate.kind) ?? 'Gate';
    return {
      key: `gate-${index}`,
      label: `Gate ${index + 1} of ${rows.length} · ${kind}`,
      what: gate.what,
      why: textOf(gate.why),
      how: textOf(gate.how),
      howLabel: gate.kind === 'anti-pattern' ? 'Prevention' : null,
      file: gate.file,
    };
  });
  return { items, clearedLabel: items.length === 0 ? NO_GATES_LABEL : null };
}

function sideNotesOf(input: ViewInput): ComposedPauseSideNote[] {
  const rows = Array.isArray(input.pauseContext?.sideNotes) ? input.pauseContext.sideNotes : [];
  return rows.map((note, index) => ({
    key: `side-${index}`,
    label: note.kind === 'anti-pattern' ? 'Advisory' : 'Can wait',
    what: note.what,
    // A human action's context, or an advisory anti-pattern's prevention (the sketch's two side-note details).
    detail: note.kind === 'anti-pattern' ? (textOf(note.how) ?? textOf(note.why)) : textOf(note.why),
    file: note.file,
  }));
}

function resumeOf(input: ViewInput): ComposedPauseResume {
  const context = input.pauseContext;
  const gates = Array.isArray(context?.gates) ? context.gates.length : 0;
  return {
    label: gates === 0 ? 'Resume here' : `Resume here, after ${gateWords(gates)}`,
    next: context?.nextAction ?? null,
    other: context?.nextActionOther ?? null,
  };
}

/** Blank-line separated blocks of a section's text; a block whose every line starts "- " or "* " is a list. */
function blocksOf(text: string): ComposedPauseBlock[] {
  const blocks: ComposedPauseBlock[] = [];
  let lines: string[] = [];
  const flush = (): void => {
    if (lines.length === 0) return;
    const bullets = lines.every((line) => line.startsWith('- ') || line.startsWith('* '));
    blocks.push(
      bullets
        ? { kind: 'list', items: lines.map((line) => line.slice(2).trim()) }
        : { kind: 'paragraph', text: lines.join('\n') },
    );
    lines = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (line.trim() === '') flush();
    else lines.push(line.trimStart());
  }
  flush();
  return blocks;
}

function sameHeading(a: string | null, b: string): boolean {
  return a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * "The rest of the handoff" (UI-SPEC section 3, below the path): HANDOFF.json's bars as the context orders them, then
 * every continue-here section. A continue-here section that the document's own rendering holds under the same
 * heading goes through that sanitised HTML (a later section claims a heading before an earlier tag section can, so a
 * `## Context` heading and a `<context>` tag each get their own); any other section is shown as the author's text.
 */
function restOf(input: ViewInput): ComposedPauseRestBar[] {
  const sections: PauseRestSection[] = Array.isArray(input.pauseContext?.restSections)
    ? input.pauseContext.restSections
    : [];
  const groups = Array.isArray(input.groups) ? input.groups : [];
  const claimed = new Map<number, string>();
  const used = new Set<number>();
  for (let at = sections.length - 1; at >= 0; at -= 1) {
    const section = sections[at];
    if (section.file !== CONTINUE_NAME || section.text === null) continue;
    const found = groups.findIndex(
      (group, index) => !used.has(index) && sameHeading(group.heading, section.title) && group.html.trim() !== '',
    );
    if (found === -1) continue;
    used.add(found);
    claimed.set(at, groups[found].html);
  }
  const bars: ComposedPauseRestBar[] = [];
  sections.forEach((section, at) => {
    const base = { key: `rest-${at}`, title: section.title, file: section.file };
    const html = claimed.get(at);
    if (html !== undefined) {
      bars.push({ ...base, count: null, body: { kind: 'html', html } });
    } else if (section.items !== null) {
      const items = section.items.map((item) => ({ text: item.text, detail: item.detail, tag: item.tag }));
      const count = String(items.length);
      if (section.file === HANDOFF_NAME && section.title === 'Uncommitted files') {
        bars.push({ ...base, count, body: { kind: 'paths', paths: items.map((item) => item.text) } });
      } else {
        bars.push({ ...base, count, body: { kind: 'items', items } });
      }
    } else if (section.text !== null) {
      bars.push({ ...base, count: null, body: { kind: 'blocks', blocks: blocksOf(section.text) } });
    }
  });
  return bars;
}

/** The pause page's model, or `null` when the input carries no pause context (the promoted-section view then
 * renders with no notice). */
export function composePause(input: ViewInput): ComposedPause | null {
  try {
    const head = headOf(input);
    if (head === null) return null;
    const context = input.pauseContext;
    const sideNotes = sideNotesOf(input);
    return {
      head,
      behind: tasksOf(context?.behind, 'complete'),
      stop: stopOf(input),
      // The first side note branches off beside the stop, the rest beside the first gate (or the cleared gate).
      stopSideNotes: sideNotes.slice(0, 1),
      gates: gatesOf(input),
      gateSideNotes: sideNotes.slice(1),
      resume: resumeOf(input),
      ahead: tasksOf(context?.ahead, 'quiet'),
      rest: restOf(input),
    };
  } catch {
    return null;
  }
}
