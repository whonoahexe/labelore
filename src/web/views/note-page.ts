// The NOTE page composer (quick-261023-61l, sketch 028 A: annotated): a pure `ViewInput` -> `ComposedNotePage`
// merge of the frontmatter, `structured.note` (built by `src/planning-repo/handlers/note-lift.ts`) and the
// `noteContext` the server joins on (the todos the note became or is related to). It decides the head
// (eyebrow, noted day, promoted chip), the title, and then either the quick-note body - one row per
// labelled clause, the whole-note line, the word-for-word text and the files it mentions - or the explore
// note's lede and contents; both shapes end with the todo cards (or why there is none) and the Also chips.
// No DOM, no filesystem access, no rendering - `note-page-components.tsx` is the only consumer. The module
// imports types only from the handler and presentation modules. Returns `null` when the projection is
// missing, or for a quick note with no text; every other junk value degrades to an omitted part (T-61l-03).
// Dates are read literally, with no time-zone shift: /gsd-note writes local wall time with no zone.
// T-61l-06: the only navigation targets are heading ids from `input.headings` and urls the server's
// `noteContext` resolved; no URL is built from document text.
import type { NoteMention, NoteRun } from '../../planning-repo/handlers/note-lift.ts';
import type { NoteContext } from '../../presentation/note-context.ts';
import type { ViewInput } from './manifest.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface ComposedNoteRow {
  /** "Decided · 21 Oct 2026", "Off limits"; null for the first row of a multi-sentence lead (rendered "Then"). */
  label: string | null;
  then: boolean;
  runs: NoteRun[];
  /** 'complete' or 'in-flight' for the labels that carry a tone, else null. */
  tone: 'complete' | 'in-flight' | null;
}

export interface ComposedNoteWeight {
  /** "Minor", "P2", "Unrated". */
  text: string;
  level: 'high' | 'medium' | 'low' | 'unrated';
  /** "severity: minor", "priority: P2" or "No severity recorded". */
  title: string;
}

export interface ComposedNoteBatched {
  /** "21 Oct 2026 · 15:58 · Round profile photos ...". */
  text: string;
  url: string | null;
}

export interface ComposedNoteCard {
  /** "Became a todo" or "Related todo". */
  kicker: string;
  status: { label: string; tone: 'complete' | 'in-flight' | 'quiet' };
  statusKey: 'pending' | 'done' | 'unfiled';
  weight: ComposedNoteWeight;
  area: string | null;
  title: string;
  via: string;
  resolution: string | null;
  batched: ComposedNoteBatched[];
  url: string | null;
}

export interface ComposedNoteEmpty {
  kicker: string;
  /** Inline markdown (backticks) - rendered through ResearchInline. */
  text: string;
}

export interface ComposedNotePage {
  shape: 'quick' | 'document';
  head: {
    eyebrow: string;
    noted: { date: string; time: string | null } | null;
    promoted: { label: string; tone: 'complete' | 'quiet' } | null;
  };
  title: {
    /** Quick: the first sentence's runs. Document: empty. */
    runs: NoteRun[];
    /** Document: the frontmatter title, else the first H1, else null (the view uses the artifact title). */
    text: string | null;
    short: boolean;
  };
  lede: string | null;
  rows: ComposedNoteRow[];
  whole: string | null;
  verbatim: { runs: NoteRun[]; capped: boolean } | null;
  mentions: NoteMention[];
  contents: { text: string; id: string }[];
  todos: ComposedNoteCard[];
  empty: ComposedNoteEmpty | null;
  also: { label: string; targetId: string | null }[];
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const STATUS: Record<'pending' | 'done' | 'unfiled', { label: string; tone: 'complete' | 'in-flight' | 'quiet' }> = {
  done: { label: 'Done', tone: 'complete' },
  pending: { label: 'Pending', tone: 'in-flight' },
  unfiled: { label: 'Unfiled', tone: 'quiet' },
};

const VIA_TEXT: Record<string, string> = {
  frontmatter: 'Names this note in notes:',
  'wiki link': 'Links this note in its text',
  mentioned: 'Mentions this note in its text',
  promoted: 'Promoted from this note word for word',
};

const EMPTY_PROMOTED: ComposedNoteEmpty = {
  kicker: 'Promoted, but untraced',
  text: 'Marked `promoted: true`, but no todo names this note or carries its text.',
};

const WHOLE_NOTE = 'That’s the whole note — one line.';
const MAX_CONTENTS = 40;
const MAX_CARDS = 20;
const MAX_ROWS = 80;
const MAX_RUNS = 4000;

// ---------------------------------------------------------------------------
// Guarded readers
// ---------------------------------------------------------------------------

function rec(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStr(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function isDigits(text: string): boolean {
  for (const ch of text) if (ch < '0' || ch > '9') return false;
  return text !== '';
}

function upperFirst(text: string): string {
  return text === '' ? text : text[0].toUpperCase() + text.slice(1);
}

/** The runs of a projection, keeping only well-formed ones. */
function runsOf(value: unknown): NoteRun[] {
  const out: NoteRun[] = [];
  for (const entry of list(value)) {
    if (out.length >= MAX_RUNS) break;
    const run = rec(entry);
    const text = run.text;
    if (typeof text !== 'string' || text === '') continue;
    const kind = run.kind === 'file' || run.kind === 'ident' ? run.kind : 'text';
    out.push({ kind, text });
  }
  return out;
}

function hasText(runs: NoteRun[]): boolean {
  return runs.some((run) => run.text.trim() !== '');
}

// ---------------------------------------------------------------------------
// Dates (literal, no time-zone shift)
// ---------------------------------------------------------------------------

/** "2026-10-21 15:58" -> { date: "21 Oct 2026", time: "15:58" }; a Date or a date-only text has no time
 * unless it carries a non-midnight one; text that is not a date is returned as written. */
function stampOf(value: unknown): { date: string; time: string | null } | null {
  let text: string | null;
  if (value instanceof Date) text = Number.isNaN(value.getTime()) ? null : value.toISOString();
  else text = asStr(value);
  if (text === null) return null;
  const t = text.slice(0, 40);
  const shaped =
    t.length >= 10 && isDigits(t.slice(0, 4)) && t[4] === '-' && isDigits(t.slice(5, 7)) && t[7] === '-' && isDigits(t.slice(8, 10));
  if (!shaped) return { date: t, time: null };
  let time: string | null = null;
  if ((t[10] === 'T' || t[10] === ' ') && isDigits(t.slice(11, 13)) && t[13] === ':' && isDigits(t.slice(14, 16))) {
    time = t.slice(11, 16);
    if (time === '00:00') time = null;
  }
  return { date: formatStamp(t.slice(0, 10)), time };
}

function stampText(value: unknown): string | null {
  const stamp = stampOf(value);
  if (stamp === null) return null;
  return stamp.time === null ? stamp.date : `${stamp.date} · ${stamp.time}`;
}

// ---------------------------------------------------------------------------
// Pure html helper
// ---------------------------------------------------------------------------

/** Drops a leading `<h1 ...>...</h1>` and the whitespace after it; anything else is returned unchanged. */
export function dropLeadingH1(html: string): string {
  if (typeof html !== 'string') return '';
  const start = html.length - html.trimStart().length;
  if (!html.startsWith('<h1', start)) return html;
  const after = html[start + 3];
  if (after !== '>' && after !== ' ' && after !== '\n' && after !== '\t') return html;
  const close = html.indexOf('</h1>', start);
  if (close < 0) return html;
  return html.slice(close + 5).trimStart();
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function cardsOf(context: NoteContext | null | undefined): ComposedNoteCard[] {
  const cards: ComposedNoteCard[] = [];
  for (const entry of list(rec(context).todos)) {
    if (cards.length >= MAX_CARDS) break;
    const todo = rec(entry);
    const title = asStr(todo.title);
    if (title === null) continue;
    const statusKey = todo.status === 'pending' || todo.status === 'done' ? todo.status : 'unfiled';
    const weight = asStr(todo.weight);
    const weightKind = todo.weightKind === 'priority' ? 'priority' : 'severity';
    const level =
      todo.level === 'high' || todo.level === 'medium' || todo.level === 'low' ? todo.level : ('unrated' as const);
    const via = asStr(todo.via) ?? '';
    const batched: ComposedNoteBatched[] = [];
    for (const row of list(todo.batchedWith)) {
      const sibling = rec(row);
      const text = asStr(sibling.text);
      if (text === null) continue;
      const stamp = stampText(sibling.date);
      batched.push({ text: stamp === null ? text : `${stamp} · ${text}`, url: asStr(sibling.url) });
    }
    cards.push({
      kicker: todo.relation === 'became' ? 'Became a todo' : 'Related todo',
      status: STATUS[statusKey],
      statusKey,
      weight: {
        text: weight === null ? 'Unrated' : upperFirst(weight),
        level: weight === null ? 'unrated' : level,
        title: weight === null ? 'No severity recorded' : `${weightKind}: ${weight}`,
      },
      area: asStr(todo.area),
      title,
      via: VIA_TEXT[via] ?? via,
      resolution: asStr(todo.resolution),
      batched,
      url: asStr(todo.url),
    });
  }
  return cards;
}

export function composeNotePage(input: ViewInput): ComposedNotePage | null {
  const note = rec(rec(input?.structured).note);
  if (note.shape !== 'quick' && note.shape !== 'document') return null;
  const frontmatter = rec(input?.frontmatter);
  const shape = note.shape;

  const cards = cardsOf(input?.noteContext);
  const promotedFlag = frontmatter.promoted === true ? true : frontmatter.promoted === false ? false : null;
  const promoted =
    promotedFlag === true
      ? { label: cards.some((card) => card.kicker === 'Became a todo') ? 'Now a todo' : 'Promoted', tone: 'complete' as const }
      : promotedFlag === false
        ? { label: 'Not promoted', tone: 'quiet' as const }
        : null;
  const empty: ComposedNoteEmpty | null =
    cards.length > 0
      ? null
      : promotedFlag === true
        ? EMPTY_PROMOTED
        : {
            kicker: 'Still a note',
            text: shape === 'quick' ? 'Not promoted to a todo.' : 'No todo names this note.',
          };

  const head = { eyebrow: 'Note', noted: stampOf(frontmatter.date), promoted };
  const also = Object.keys(frontmatter).length > 0 ? [{ label: 'Frontmatter', targetId: null }] : [];

  if (shape === 'document') {
    const headings = list(input?.headings).map(rec);
    const firstH1 = headings.find((heading) => heading.depth === 1);
    const contents: { text: string; id: string }[] = [];
    for (const heading of headings) {
      if (contents.length >= MAX_CONTENTS) break;
      const text = asStr(heading.text);
      const id = asStr(heading.id);
      if (text === null || id === null || (heading.depth !== 2 && heading.depth !== 3)) continue;
      contents.push({ text, id });
    }
    return {
      shape,
      head,
      title: { runs: [], text: asStr(frontmatter.title) ?? asStr(firstH1?.text), short: false },
      lede: asStr(frontmatter.context),
      rows: [],
      whole: null,
      verbatim: null,
      mentions: [],
      contents,
      todos: cards,
      empty,
      also,
    };
  }

  const titleRuns = runsOf(note.title);
  if (!hasText(titleRuns)) return null;
  const rows: ComposedNoteRow[] = [];
  for (const entry of list(note.rows)) {
    if (rows.length >= MAX_ROWS) break;
    const row = rec(entry);
    const runs = runsOf(row.runs);
    const label = asStr(row.label);
    const date = asStr(row.date);
    const tone = row.tone === 'complete' || row.tone === 'in-flight' ? row.tone : null;
    rows.push({
      label: label === null ? null : date === null ? label : `${label} · ${formatStamp(date)}`,
      then: label === null,
      runs,
      tone: label === null ? null : tone,
    });
  }
  const verbatimRuns = runsOf(note.verbatim);
  const mentions: NoteMention[] = [];
  for (const entry of list(note.mentions)) {
    const mention = rec(entry);
    const path = asStr(mention.path);
    const count = typeof mention.count === 'number' && Number.isFinite(mention.count) && mention.count >= 1 ? Math.floor(mention.count) : 1;
    if (path !== null && mentions.length < 100) mentions.push({ path, count });
  }
  return {
    shape,
    head,
    title: { runs: titleRuns, text: null, short: note.short === true },
    lede: null,
    rows,
    whole: rows.length === 0 ? WHOLE_NOTE : null,
    verbatim: hasText(verbatimRuns) ? { runs: verbatimRuns, capped: note.capped === true } : null,
    mentions,
    contents: [],
    todos: cards,
    empty,
    also,
  };
}
