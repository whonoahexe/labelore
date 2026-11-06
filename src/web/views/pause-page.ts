// The pause page's composer (Phase 11, 11-10, VIEW-17, sketch 054 winner C "Gate path"): a pure `ViewInput` ->
// `ComposedPause` merge of the server-built `pauseContext` (11-07's join of HANDOFF.json, the paired
// `.continue-here.md`, STATE and ROADMAP). One page serves both files (D-05); where they differ, both values are
// kept and named, never merged (D-05, project rule). The page answers "can I pick this up now, and where?":
//   - the head: the eyebrow "Paused work · {context}", the phase (or spike) name as the h1, and the lead
//     "Paused in {context}, {date} · {N} days ago", the age counted from the pause date to the day the project
//     was read (`readAt`, D-08), never the browser's clock;
//   - the path, top to bottom on one rail: Behind you, Stopped here, the gates, Resume here, Ahead (the later
//     steps are built on the same model);
//   - the stop line "Stopped here · task {N} of {M} · {status}" with the status verbatim.
// The composer holds no DOM, no filesystem access, no rendering, no regular expression and no module-level
// mutable state: two pause pages open at once each compose only from their own input. It returns `null` when the
// context is missing, so the page keeps the promoted-section view with no notice (Phase 10 C1, X2). T-11-12:
// every string is author text rendered as React text by the components.
import type { PauseMovedOn, PauseText } from '../../presentation/pause-context.ts';
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
  /** "Work has moved on since": a quiet fact beside the date (built by 11-11's note; carried now). */
  movedOn: PauseMovedOn | null;
  files: ComposedPauseFile[];
  /** "No .continue-here.md beside it" / "No HANDOFF.json" when one of the pair is absent. */
  missingPartner: string | null;
}

export interface ComposedPauseStop {
  /** "Stopped here · task 3 of 6 · paused": the pieces the file states, in that order. */
  label: string;
  /** The stopped task's name, else "Task {N}"; null when no task is stated. */
  title: string | null;
  progress: string | null;
}

export interface ComposedPauseResume {
  /** "Resume here" with no gates; "Resume here, after 4 gates" otherwise ("after 1 gate"). */
  label: string;
  /** The next action, as written, with the file it came from. */
  next: PauseText | null;
  /** The other file's wording when it differs, never merged into `next`. */
  other: PauseText | null;
}

export interface ComposedPause {
  head: ComposedPauseHead;
  stop: ComposedPauseStop;
  resume: ComposedPauseResume;
}

// ---------------------------------------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------------------------------------

function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
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
    files,
    missingPartner,
  };
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
  };
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

/** The pause page's model, or `null` when the input carries no pause context (the promoted-section view then
 * renders with no notice). */
export function composePause(input: ViewInput): ComposedPause | null {
  try {
    const head = headOf(input);
    if (head === null) return null;
    return { head, stop: stopOf(input), resume: resumeOf(input) };
  } catch {
    return null;
  }
}
