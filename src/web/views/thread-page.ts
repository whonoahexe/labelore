// The thread page's composer (Phase 11, 11-23, VIEW-16, D-02, sketch 058 winner A "Status dial"): a pure `ViewInput` ->
// `ComposedThread` merge of the thread lift (11-20's `structured.thread`) and the links context (the References resolved
// to payload addresses). A thread is a small piece of work that carries across sessions; the page answers "where does it
// stand and what should the next session do first?":
//   - the head: the eyebrow "Thread", the title as the h1 and the slug as meta;
//   - the dial card: a half-dial of the three statuses with the needle on this thread's own, the status chip under it
//     (`open` and `in_progress` in flight with the word telling them apart, `resolved` complete, any other word verbatim
//     and quiet), "Created {date}", "Updated {date}" and the age of the last update;
//   - beside it, "Next steps" numbered in the author's order and in the author's words (the first one boxed), over "Goal";
//   - below, "Context" and "References" (a reference that resolves to a payload artifact is a link, every other is text).
// An empty next-steps list draws nothing (no "No steps" line). The older shape (a `## Status: OPEN` section, no
// frontmatter) reads the same: its status word comes from the lift, its created date from the Context note.
// A name beside a value-looking string (`KEY=...`) in the prose is drawn as the name and the shared "Value not shown" mark
// (UI-SPEC section 1, rule 8). The composer holds no DOM, no filesystem access, no rendering, no regular expression and no
// module-level mutable state; it reads no clock (the age counts to the day the project was read). It returns `null` when the
// thread lift is missing or carries nothing beyond its slug and title, so the page keeps the promoted-section view with no
// notice (Phase 10 C1, X2). T-11-57: every string is author text rendered as React text by the components.
import type { ThreadLift } from '../../planning-repo/handlers/seed-thread-lift.ts';
import { splitLinkText } from '../../presentation/seed-thread-links.ts';
import type { SeedThreadLink } from '../../presentation/seed-thread-links.ts';
import { dayOfIso } from './pause-page.ts';
import { segmentsOf } from './seed-page.ts';
import type { SeedSegment } from './seed-page.ts';
import type { ViewInput } from './manifest.ts';

export const THREAD_EYEBROW = 'Thread';
export const NEXT_STEPS_LABEL = 'Next steps';
export const GOAL_LABEL = 'Goal';
export const CONTEXT_LABEL = 'Context';
export const REFERENCES_LABEL = 'References';
export const CREATED_LABEL = 'Created';
export const UPDATED_LABEL = 'Updated';
export const NOT_FOUND_LABEL = 'Not found';

const MS_PER_DAY = 86_400_000;

export type ThreadTone = 'quiet' | 'in-flight' | 'complete';
/** The three statuses the dial draws, in the order it draws them. */
export type ThreadDialKey = 'open' | 'in_progress' | 'resolved';
export const THREAD_DIAL: readonly { key: ThreadDialKey; word: string; tone: ThreadTone }[] = [
  { key: 'open', word: 'Open', tone: 'in-flight' },
  { key: 'in_progress', word: 'In progress', tone: 'in-flight' },
  { key: 'resolved', word: 'Resolved', tone: 'complete' },
];

// ---------------------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------------------

/** A run of an author's prose: plain text, or the name of a `NAME=value` pair whose value is never drawn. */
export type ThreadSegment = SeedSegment;

export type ComposedThreadBlock =
  | { kind: 'paragraph'; segments: ThreadSegment[] }
  | { kind: 'list'; items: ThreadSegment[][] };

export interface ComposedThreadStatus {
  /** The status word: the file's own for an unrecognised value, "open", "in progress" or "resolved" for a known one. */
  word: string;
  tone: ThreadTone;
  /** The dial position this status sits at; null leaves every arc grey and the needle at rest. */
  dial: ThreadDialKey | null;
}

export interface ComposedThreadStep {
  key: string;
  /** 1-based, the author's order. */
  number: number;
  segments: ThreadSegment[];
}

export interface ComposedThreadRef {
  key: string;
  /** The path as the author wrote it, else null for prose. */
  path: string | null;
  /** The words beside the path; for prose the whole bullet. */
  text: string | null;
  /** The in-app address of the payload artifact the path names. */
  url: string | null;
  /** `resolved` is a link; `not-found` is a path that names no payload artifact; `text` is prose or an unchecked path. */
  state: 'resolved' | 'not-found' | 'text';
}

export interface ComposedThread {
  head: {
    eyebrow: string;
    /** The title; null leaves the file's own title. */
    title: string | null;
    slug: string | null;
  };
  /** null when the file states no status. */
  status: ComposedThreadStatus | null;
  /** The created day as the file wrote it (frontmatter, else the Context note), else null. */
  created: string | null;
  updated: string | null;
  /** "{n} days since the last update", counted to the day the project was read; null when either date is unknown. */
  age: string | null;
  steps: ComposedThreadStep[];
  goal: ComposedThreadBlock[];
  context: ComposedThreadBlock[];
  references: ComposedThreadRef[];
}

// ---------------------------------------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------------------------------------

function statusKeyOf(word: string): string {
  return word.trim().toLowerCase().split(' ').join('_').split('-').join('_');
}

/** The status word, its tone and its place on the dial: open and in progress in flight, resolved complete, any other
 * word verbatim and quiet. The older shape's `OPEN` and `IN PROGRESS` read as the same statuses. */
export function threadStatusOf(word: string): ComposedThreadStatus {
  const key = statusKeyOf(word);
  for (const position of THREAD_DIAL) {
    if (position.key === key) {
      return { word: key.split('_').join(' '), tone: position.tone, dial: position.key };
    }
  }
  return { word: word.trim(), tone: 'quiet', dial: null };
}

/** "{n} days since the last update" from whole UTC days between the updated day and the day the project was read. */
export function sinceUpdateWords(updated: string | null, readAt: string | null | undefined): string | null {
  const from = dayOfIso(updated);
  const to = dayOfIso(readAt);
  if (from === null || to === null) return null;
  const days = Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
  if (days < 0) return null;
  if (days === 0) return 'updated today';
  return days === 1 ? '1 day since the last update' : `${days} days since the last update`;
}

/** The day of a Context note such as `*Created 2026-03-27.*` (or `_Created ..._`), else null. */
export function createdNoteDay(line: string): string | null {
  let text = line.trim();
  const wrapped =
    text.length > 2 && ((text.startsWith('*') && text.endsWith('*')) || (text.startsWith('_') && text.endsWith('_')));
  if (!wrapped) return null;
  text = text.slice(1, -1).trim();
  if (!text.toLowerCase().startsWith('created')) return null;
  return dayOfIso(text.slice('created'.length).trim());
}

/** Blank-line separated blocks of an author's text; a block whose every line starts "- " or "* " is a list. */
export function threadBlocksOf(text: string | null | undefined): ComposedThreadBlock[] {
  if (typeof text !== 'string') return [];
  const blocks: ComposedThreadBlock[] = [];
  let lines: string[] = [];
  const flush = (): void => {
    if (lines.length === 0) return;
    const bullets = lines.every((line) => line.startsWith('- ') || line.startsWith('* '));
    blocks.push(
      bullets
        ? { kind: 'list', items: lines.map((line) => segmentsOf(line.slice(2).trim())) }
        : { kind: 'paragraph', segments: segmentsOf(lines.join('\n')) },
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

// ---------------------------------------------------------------------------------------------------------
// Reading the input
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** The thread lift as the response carries it (JSON, so every field is read defensively), or null. */
function threadOf(input: ViewInput): ThreadLift | null {
  const thread = isRecord(input.structured) ? input.structured.thread : undefined;
  if (!isRecord(thread)) return null;
  return {
    slug: textOrNull(thread.slug),
    title: textOrNull(thread.title),
    status: textOrNull(thread.status),
    created: textOrNull(thread.created),
    updated: textOrNull(thread.updated),
    goal: textOrNull(thread.goal),
    context: textOrNull(thread.context),
    references: stringList(thread.references),
    nextSteps: stringList(thread.nextSteps),
  };
}

function hasAnyKnownField(thread: ThreadLift): boolean {
  return (
    thread.status !== null ||
    thread.created !== null ||
    thread.updated !== null ||
    thread.goal !== null ||
    thread.context !== null ||
    thread.references.length > 0 ||
    thread.nextSteps.length > 0
  );
}

/** The Context with its leading `*Created {date}.*` note taken out (the page draws the date in the dial card), and the
 * note's day. A note whose date cannot be read stays in the text. */
function contextOf(context: string | null): { created: string | null; text: string | null } {
  if (context === null) return { created: null, text: null };
  const lines = context.split('\n');
  const first = lines.findIndex((line) => line.trim() !== '');
  if (first < 0) return { created: null, text: null };
  const day = createdNoteDay(lines[first]!);
  if (day === null) return { created: null, text: context };
  const rest = lines.slice(first + 1).join('\n');
  return { created: day, text: rest.trim() === '' ? null : rest };
}

function linkIsUsable(link: unknown): link is SeedThreadLink {
  return isRecord(link) && typeof link.text === 'string';
}

/** The References: the server's resolved links when they match the lift's list, else the lift's bullets as text. */
function referencesOf(input: ViewInput, thread: ThreadLift): ComposedThreadRef[] {
  const links = input.seedThreadLinks;
  const resolved =
    links !== null &&
    links !== undefined &&
    links.kind === 'thread' &&
    Array.isArray(links.references) &&
    links.references.length === thread.references.length &&
    links.references.every(linkIsUsable);
  return thread.references.map((bullet, at): ComposedThreadRef => {
    const key = `ref-${at}`;
    if (resolved && links !== null && links !== undefined) {
      const link = links.references[at]!;
      const url = typeof link.url === 'string' && link.url !== '' ? link.url : null;
      if (link.path === null || link.path === undefined) {
        return { key, path: null, text: link.text, url: null, state: 'text' };
      }
      return { key, path: link.path, text: link.description ?? null, url, state: url === null ? 'not-found' : 'resolved' };
    }
    const { path, description } = splitLinkText(bullet);
    return path === null
      ? { key, path: null, text: bullet, url: null, state: 'text' }
      : { key, path, text: description, url: null, state: 'text' };
  });
}

/** The thread page's model, or `null` when the input carries no thread lift or the lift holds only a slug and a title (the
 * promoted-section view then renders with no notice). */
export function composeThread(input: ViewInput): ComposedThread | null {
  try {
    const thread = threadOf(input);
    if (thread === null || !hasAnyKnownField(thread)) return null;
    const readAt = input.seedThreadLinks?.readAt ?? null;
    const context = contextOf(thread.context);
    return {
      head: { eyebrow: THREAD_EYEBROW, title: thread.title, slug: thread.slug },
      status: thread.status === null ? null : threadStatusOf(thread.status),
      created: thread.created ?? context.created,
      updated: thread.updated,
      age: sinceUpdateWords(thread.updated, readAt),
      steps: thread.nextSteps.map((step, at) => ({ key: `step-${at}`, number: at + 1, segments: segmentsOf(step) })),
      goal: threadBlocksOf(thread.goal),
      context: threadBlocksOf(context.text),
      references: referencesOf(input, thread),
    };
  } catch {
    return null;
  }
}
