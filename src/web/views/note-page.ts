// The NOTE page composer (quick-261023-61l, sketch 028 A: annotated; quick-261023-u13, sketch 029 A: gist
// console): a pure `ViewInput` -> `ComposedNotePage` merge of the frontmatter, `structured.note` (built by
// `src/planning-repo/handlers/note-lift.ts`) and the `noteContext` the server joins on (the todos the note
// became or is related to). It decides the rail (eyebrow, the title, where the note went, one big number
// and a stat list), the gist said large beside it, and then either a quick note's "What it says" ledger
// (one numbered row per lifted clause, or the whole-note state for a one-liner) or an explore note's
// "Section by section" ledger (each section's key sentence, bold-led items, flagged calls and figure
// chips, paired to its heading id so the view can open it in place); both shapes end with the todo cards
// (or why there is none), the mentions and the Also chips.
// No DOM, no filesystem access, no rendering - `note-page-components.tsx` is the only consumer. The module
// imports types only from the handler and presentation modules. Returns `null` when the projection is
// missing, or for a quick note with no text; every other junk value degrades to an omitted part (T-61l-03,
// T-u13-03). The composer builds no regular expression and uses no regular-expression literal (contract).
// Dates are read literally, with no time-zone shift: /gsd-note writes local wall time with no zone. The
// note's age is the one value that reads the clock, through `options.now` (tests pass a fixed date).
// T-61l-06 / T-u13-05: the only navigation targets are heading ids from `input.headings` and urls the
// server's `noteContext` resolved; no URL is built from document text.
import type { NoteMention, NoteRun } from '../../planning-repo/handlers/note-lift.ts';
import type { NoteContext } from '../../presentation/note-context.ts';
import type { ViewInput } from './manifest.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type NoteStage = 'done' | 'open' | 'untraced' | 'note';
export type NoteMarkTone = 'complete' | 'in-flight' | 'missing';
export type NoteToneValue = NoteMarkTone | 'quiet';

export interface ComposedNoteRow {
  /** "01", "02" ... */
  index: string;
  /** "Decided · 21 Oct 2026", "Off limits"; null for the first row of a multi-sentence lead (rendered "Then"). */
  label: string | null;
  then: boolean;
  /** The label's own tone, for the labels that carry one, else null. */
  tone: NoteMarkTone | null;
  /** The index mark: the label tone, else the group tone (decided complete, problem in-flight, open missing). */
  mark: NoteMarkTone | null;
  first: NoteRun[];
  rest: NoteRun[];
}

export interface ComposedNotePart {
  /** "01", "02" ... */
  index: string;
  /** Inline markdown - rendered through ResearchInline. */
  heading: string;
  /** The key sentence, or null when it would repeat the first item. */
  key: string | null;
  items: { term: string | null; text: string }[];
  /** Items beyond the ones shown ("+3 more"). */
  more: number;
  flags: { label: string; tone: NoteToneValue; text: string }[];
  figures: { value: string; unit: string; phrase: string }[];
  /** Figures beyond the five shown. */
  moreFigures: number;
  side: string[];
  /** The depth-2 heading id of the same section, or null when it could not be paired. */
  id: string | null;
}

export interface ComposedNoteStat {
  label: string;
  value: string;
  tone: NoteToneValue | null;
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
  rail: {
    eyebrow: string;
    /** A quick note: the title made from the file name. An explore note: its title. Null: the view uses the artifact title. */
    title: string | null;
    context: string | null;
    stage: { key: NoteStage; text: string };
    big: { value: string; label: string; sub: string; stage: NoteStage };
    stats: ComposedNoteStat[];
  };
  gist: {
    /** A quick note's gist (its first sentence), with its references marked. */
    runs: NoteRun[];
    /** An explore note's gist: the lede, else the one-sentence shape (inline markdown). */
    text: string | null;
    long: boolean;
    /** The line under the gist: where the note went, or the explore note's shape or origin. */
    line: string | null;
  };
  rows: ComposedNoteRow[];
  /** "1 decided · 1 ask · 1 problem · 3 limits"; '' when there are no rows. */
  counts: string;
  /** A quick note with nothing to lift: the whole-note line and the kicker of its "Where it went" ledger. */
  oneLine: { whole: string; kicker: string } | null;
  parts: ComposedNotePart[];
  /** The ledger's heading and kicker, or null when the page shows no ledger. */
  ledger: { title: string; kicker: string } | null;
  /** Whether the Lifted | As written toggle shows. */
  toggle: boolean;
  verbatim: { runs: NoteRun[]; capped: boolean } | null;
  mentions: NoteMention[];
  todos: ComposedNoteCard[];
  empty: ComposedNoteEmpty | null;
  /** The cards sit in the rail, except for a one-liner, where they sit in its "Where it went" ledger. */
  cardsInRail: boolean;
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

const EMPTY_EXPLORE: ComposedNoteEmpty = {
  kicker: 'No todo points here',
  text: 'No todo names or mentions this note.',
};

/** The count line's groups, in the sketch's order, with their singular and plural words. */
const GROUP_WORDS: [string, string, string][] = [
  ['decided', 'decided', 'decided'],
  ['ask', 'ask', 'asks'],
  ['problem', 'problem', 'problems'],
  ['limit', 'limit', 'limits'],
  ['open', 'open question', 'open questions'],
  ['other', 'other', 'other'],
];

const GROUP_TONE: Record<string, NoteMarkTone | undefined> = {
  decided: 'complete',
  problem: 'in-flight',
  open: 'missing',
};

const MAX_CARDS = 20;
const MAX_ROWS = 80;
const MAX_RUNS = 4000;
const MAX_PARTS = 40;
const MAX_ITEMS_SHOWN = 4;
const MAX_FLAGS_SHOWN = 3;
const MAX_FIGURES_SHOWN = 5;
const MAX_FLAG_TEXT = 180;
const DAY_MS = 86400000;

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

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function isDigits(text: string): boolean {
  for (const ch of text) if (ch < '0' || ch > '9') return false;
  return text !== '';
}

function upperFirst(text: string): string {
  return text === '' ? text : text[0].toUpperCase() + text.slice(1);
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function plural(count: number, one: string, many: string = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
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

function toneOf(value: unknown): NoteMarkTone | null {
  return value === 'complete' || value === 'in-flight' || value === 'missing' ? value : null;
}

function flagToneOf(value: unknown): NoteToneValue {
  return value === 'complete' || value === 'in-flight' || value === 'missing' || value === 'quiet' ? value : 'quiet';
}

/** The sketch's `plain`: no bold marks, backticks or wiki-link brackets, whitespace collapsed. */
function plainText(text: string): string {
  const stripped = text.split('**').join('').split('`').join('').split('[[').join('').split(']]').join('');
  return stripped.split(' ').filter((word) => word !== '').join(' ').trim();
}

/** `[[name]]` wiki links read as code, the way the sketch shows them (the inline renderer has no wiki-link
 * token, so the brackets would print). Only the brackets change; nothing is read as a link target. */
function wikiAsCode(text: string): string {
  let out = '';
  let at = 0;
  for (;;) {
    const open = text.indexOf('[[', at);
    const close = open < 0 ? -1 : text.indexOf(']]', open + 2);
    if (open < 0 || close < 0) return out + text.slice(at);
    out += `${text.slice(at, open)}\`${text.slice(open + 2, close)}\``;
    at = close + 2;
  }
}

// ---------------------------------------------------------------------------
// Dates (literal, no time-zone shift)
// ---------------------------------------------------------------------------

function isDateText(t: string): boolean {
  return t.length >= 10 && isDigits(t.slice(0, 4)) && t[4] === '-' && isDigits(t.slice(5, 7)) && t[7] === '-' && isDigits(t.slice(8, 10));
}

/** The date value as the text it was written as ("2026-10-21 15:58"), or null. */
function dateTextOf(value: unknown): string | null {
  let text: string | null;
  if (value instanceof Date) text = Number.isNaN(value.getTime()) ? null : value.toISOString();
  else text = asStr(value);
  return text === null ? null : text.slice(0, 40);
}

/** "2026-10-21 15:58" -> { date: "21 Oct 2026", time: "15:58" }; a Date or a date-only text has no time
 * unless it carries a non-midnight one; text that is not a date is returned as written. */
function stampOf(value: unknown): { date: string; time: string | null } | null {
  const t = dateTextOf(value);
  if (t === null) return null;
  if (!isDateText(t)) return { date: t, time: null };
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

/** The note's written wall time as a local Date (date and HH:MM read literally), or null. */
function writtenAt(value: unknown): Date | null {
  const t = dateTextOf(value);
  if (t === null || !isDateText(t)) return null;
  let hours = 0;
  let minutes = 0;
  if ((t[10] === 'T' || t[10] === ' ') && isDigits(t.slice(11, 13)) && t[13] === ':' && isDigits(t.slice(14, 16))) {
    hours = Number(t.slice(11, 13));
    minutes = Number(t.slice(14, 16));
  }
  const date = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, Number(t.slice(8, 10)), hours, minutes);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The calendar day of a "YYYY-MM-DD..." text as a UTC day number, or null. */
function dayNumber(text: string): number | null {
  if (!isDateText(text)) return null;
  const time = Date.UTC(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10)));
  return Number.isNaN(time) ? null : Math.round(time / DAY_MS);
}

/** The first "(YYYY-MM-DD)" in a text, as "YYYY-MM-DD", or null. */
function shippedDateIn(text: string | null): string | null {
  if (text === null) return null;
  let at = text.indexOf('(');
  while (at >= 0) {
    const candidate = text.slice(at + 1, at + 11);
    if (text[at + 11] === ')' && isDateText(candidate)) return candidate;
    at = text.indexOf('(', at + 1);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pure html helpers
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

/** The html of one section: from just after the `<h2 ... id="<id>" ...>...</h2>` to the next `<h2` or the
 * end. '' when the id is not found. Cut only at element boundaries of the server's sanitized render. */
export function sectionHtml(html: string, id: string): string {
  if (typeof html !== 'string' || typeof id !== 'string' || id === '') return '';
  const needle = ` id="${id}"`;
  let at = html.indexOf('<h2');
  while (at >= 0) {
    const after = html[at + 3];
    const tagEnd = html.indexOf('>', at);
    if (tagEnd < 0) return '';
    if ((after === ' ' || after === '>') && html.slice(at, tagEnd).includes(needle)) {
      const close = html.indexOf('</h2>', tagEnd);
      if (close < 0) return '';
      const from = close + 5;
      const next = html.indexOf('<h2', from);
      return (next < 0 ? html.slice(from) : html.slice(from, next)).trim();
    }
    at = html.indexOf('<h2', at + 3);
  }
  return '';
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

interface Journey {
  stage: NoteStage;
  text: string;
  sentence: string;
  /** "YYYY-MM-DD" the first Became todo shipped, or null. */
  shipped: string | null;
}

/** Whole days since the note was written, never below 0 ("less than a day" at 0). */
function ageDays(written: Date | null, now: Date): number | null {
  if (written === null) return null;
  return Math.max(0, Math.round((now.getTime() - written.getTime()) / DAY_MS));
}

function ageText(days: number): string {
  return days === 0 ? 'less than a day' : plural(days, 'day');
}

function journeyOf(cards: ComposedNoteCard[], promoted: boolean | null, days: number | null): Journey {
  const became = cards.find((card) => card.kicker === 'Became a todo');
  if (became !== undefined && became.statusKey === 'done') {
    const shipped = shippedDateIn(became.resolution);
    return {
      stage: 'done',
      text: 'Shipped',
      sentence: shipped === null ? 'Became a todo and shipped.' : `Became a todo and shipped ${formatStamp(shipped)}.`,
      shipped,
    };
  }
  if (became !== undefined) return { stage: 'open', text: 'Todo open', sentence: 'Became a todo, still open.', shipped: null };
  if (promoted === true) return { stage: 'untraced', text: 'Untraced', sentence: 'Promoted, but no todo carries it.', shipped: null };
  return {
    stage: 'note',
    text: 'Still a note',
    sentence: days === null ? 'Still a note.' : `Still a note, ${ageText(days)} on.`,
    shipped: null,
  };
}

function countLine(rows: { group: string }[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.group, (counts.get(row.group) ?? 0) + 1);
  const parts: string[] = [];
  for (const [group, one, many] of GROUP_WORDS) {
    const n = counts.get(group) ?? 0;
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`);
  }
  return parts.join(' · ');
}

function mentionsOf(value: unknown): NoteMention[] {
  const mentions: NoteMention[] = [];
  for (const entry of list(value)) {
    const mention = rec(entry);
    const path = asStr(mention.path);
    const count = typeof mention.count === 'number' && Number.isFinite(mention.count) && mention.count >= 1 ? Math.floor(mention.count) : 1;
    if (path !== null && mentions.length < 100) mentions.push({ path, count });
  }
  return mentions;
}

function composeQuick(
  note: Record<string, unknown>,
  frontmatter: Record<string, unknown>,
  cards: ComposedNoteCard[],
  promotedFlag: boolean | null,
  now: Date,
  also: ComposedNotePage['also'],
): ComposedNotePage | null {
  const gistRuns = runsOf(note.title);
  if (!hasText(gistRuns)) return null;

  const rows: ComposedNoteRow[] = [];
  const groups: { group: string }[] = [];
  for (const entry of list(note.rows)) {
    if (rows.length >= MAX_ROWS) break;
    const row = rec(entry);
    const label = asStr(row.label);
    const date = asStr(row.date);
    const tone = label === null ? null : toneOf(row.tone);
    const group =
      row.group === 'decided' || row.group === 'ask' || row.group === 'problem' || row.group === 'limit' || row.group === 'open'
        ? row.group
        : 'other';
    let first = runsOf(row.first);
    let rest = runsOf(row.rest);
    if (!hasText(first)) {
      first = runsOf(row.runs);
      rest = [];
    }
    rows.push({
      index: pad2(rows.length + 1),
      label: label === null ? null : date === null ? label : `${label} · ${formatStamp(date)}`,
      then: label === null,
      tone,
      mark: label === null ? null : (tone ?? GROUP_TONE[group] ?? null),
      first,
      rest,
    });
    groups.push({ group });
  }

  const verbatimRuns = runsOf(note.verbatim);
  const mentions = mentionsOf(note.mentions);
  const wordsValue = typeof note.words === 'number' && Number.isFinite(note.words) && note.words >= 0 ? Math.floor(note.words) : null;
  const written = writtenAt(frontmatter.date);
  const days = ageDays(written, now);
  const journey = journeyOf(cards, promotedFlag, days);
  const counts = countLine(groups);
  const one = rows.length === 0;

  const became = cards.find((card) => card.kicker === 'Became a todo');
  const noted = stampText(frontmatter.date);
  const notedDay = dateTextOf(frontmatter.date);
  const shippedDay = journey.shipped === null ? null : dayNumber(journey.shipped);
  const notedDayNumber = notedDay === null ? null : dayNumber(notedDay);
  const toShipped = shippedDay !== null && notedDayNumber !== null ? shippedDay - notedDayNumber + 1 : null;

  const stats: ComposedNoteStat[] = [];
  if (noted !== null) stats.push({ label: 'Noted', value: noted, tone: null });
  if (days !== null) stats.push({ label: 'Age', value: ageText(days), tone: null });
  if (promotedFlag !== null) stats.push({ label: 'Promoted', value: promotedFlag ? 'Yes' : 'No', tone: promotedFlag ? null : 'missing' });
  if (became !== undefined) stats.push({ label: 'Todo', value: became.status.label, tone: became.status.tone });
  if (toShipped !== null && toShipped >= 1) stats.push({ label: 'Note → shipped', value: ageText(toShipped), tone: null });
  stats.push({ label: 'Mentions', value: String(mentions.length), tone: null });
  if (wordsValue !== null) stats.push({ label: 'Words', value: String(wordsValue), tone: null });

  const big = one
    ? {
        value: '1',
        label: 'line, nothing else to lift',
        sub: wordsValue === null ? journey.sentence : `${plural(wordsValue, 'word')} · ${journey.sentence}`,
        stage: journey.stage,
      }
    : {
        value: String(rows.length),
        label: `${rows.length === 1 ? 'thing it says' : 'things it says'}, after the gist`,
        sub: counts,
        stage: journey.stage,
      };

  const empty: ComposedNoteEmpty | null =
    cards.length > 0 ? null : promotedFlag === true ? EMPTY_PROMOTED : { kicker: 'Still a note', text: 'Not promoted to a todo.' };

  return {
    shape: 'quick',
    rail: {
      eyebrow: 'Note',
      title: asStr(note.fileTitle),
      context: null,
      stage: { key: journey.stage, text: journey.text },
      big,
      stats,
    },
    gist: { runs: gistRuns, text: null, long: false, line: journey.sentence },
    rows,
    counts,
    oneLine: one
      ? {
          whole: `That’s the whole note: one line.${journey.stage === 'note' ? ' It hasn’t been promoted to a todo.' : ''}`,
          kicker: journey.text,
        }
      : null,
    parts: [],
    ledger: one ? null : { title: 'What it says', kicker: counts },
    toggle: !one,
    verbatim: hasText(verbatimRuns) ? { runs: verbatimRuns, capped: note.capped === true } : null,
    mentions,
    todos: cards,
    empty,
    cardsInRail: !one,
    also,
  };
}

/** A heading's text without bold marks, backticks and wiki-link brackets, lower-cased, for pairing. */
function headingKey(text: string): string {
  return plainText(text).toLowerCase();
}

function composeDocument(
  note: Record<string, unknown>,
  frontmatter: Record<string, unknown>,
  headings: Record<string, unknown>[],
  cards: ComposedNoteCard[],
  also: ComposedNotePage['also'],
): ComposedNotePage {
  const firstH1 = headings.find((heading) => heading.depth === 1);
  const h2: { id: string; key: string }[] = [];
  for (const heading of headings) {
    const id = asStr(heading.id);
    const text = asStr(heading.text);
    if (heading.depth === 2 && id !== null && text !== null) h2.push({ id, key: headingKey(text) });
  }

  const sectionEntries = list(note.sections).slice(0, MAX_PARTS).map(rec);
  const sections = sectionEntries.filter((section) => asStr(section.heading) !== null);
  const byOrder = sections.length === h2.length;
  const used = new Set<number>();

  const parts: ComposedNotePart[] = sections.map((section, index) => {
    const heading = asStr(section.heading) ?? '';
    let id: string | null = null;
    if (byOrder) id = h2[index].id;
    else {
      const key = headingKey(heading);
      const at = h2.findIndex((candidate, position) => !used.has(position) && candidate.key === key);
      if (at >= 0) {
        used.add(at);
        id = h2[at].id;
      }
    }
    const allItems = list(section.items).map(rec);
    const items = allItems.slice(0, MAX_ITEMS_SHOWN).map((item) => ({
      term: asStr(item.term),
      text: typeof item.text === 'string' ? item.text : '',
    }));
    const shownItems = items.map((item) => ({ term: item.term === null ? null : wikiAsCode(item.term), text: wikiAsCode(item.text) }));
    const itemCount = Math.max(asCount(section.itemCount), allItems.length);
    const keyText = asStr(section.key);
    const shownText = items.map((item) => plainText(item.text));
    const flags: ComposedNotePart['flags'] = [];
    for (const entry of list(section.flags)) {
      if (flags.length >= MAX_FLAGS_SHOWN) break;
      const flag = rec(entry);
      const label = asStr(flag.label);
      const text = typeof flag.text === 'string' ? flag.text : '';
      if (label === null || text === '') continue;
      if (shownText.some((shown) => shown !== '' && text.includes(shown))) continue;
      flags.push({ label, tone: flagToneOf(flag.tone), text: text.length > MAX_FLAG_TEXT ? `${text.slice(0, MAX_FLAG_TEXT)}…` : text });
    }
    const figures = list(section.figures)
      .map(rec)
      .filter((figure) => asStr(figure.value) !== null)
      .map((figure) => ({
        value: asStr(figure.value) ?? '',
        unit: typeof figure.unit === 'string' ? figure.unit : '',
        phrase: typeof figure.phrase === 'string' ? figure.phrase : '',
      }));
    return {
      index: pad2(index + 1),
      heading: wikiAsCode(heading),
      key: keyText !== null && !(section.keyFrom === 'item' && items.length > 0) ? wikiAsCode(keyText) : null,
      items: shownItems,
      more: Math.max(0, itemCount - MAX_ITEMS_SHOWN),
      flags,
      figures: figures.slice(0, MAX_FIGURES_SHOWN),
      moreFigures: Math.max(0, figures.length - MAX_FIGURES_SHOWN),
      side: list(section.side).filter((entry): entry is string => typeof entry === 'string' && entry !== ''),
      id,
    };
  });

  const totals = rec(note.flagTotals);
  const flagsAll = asCount(totals.all);
  const decided = asCount(totals.decided);
  const openOrBlocked = asCount(totals.openOrBlocked);
  const points = asCount(note.points);
  const tables = asCount(note.tables);
  const figureCount = list(note.figures).length;
  const sectionCount = sections.length;
  const lede = asStr(note.lede);
  const summary = asStr(note.summary);
  const boiler = asStr(note.boiler);
  const lines = typeof note.lines === 'number' && Number.isInteger(note.lines) && note.lines >= 0 ? note.lines : null;

  const stage: NoteStage = cards.length > 0 ? 'open' : 'note';
  const noted = stampOf(frontmatter.date);
  const stats: ComposedNoteStat[] = [];
  if (noted !== null) stats.push({ label: 'Noted', value: noted.date, tone: null });
  stats.push({ label: 'Sections', value: String(sectionCount), tone: null });
  stats.push({ label: 'Points', value: String(points), tone: null });
  stats.push({ label: 'Tables', value: String(tables), tone: null });
  stats.push({ label: 'Decided', value: String(decided), tone: 'complete' });
  stats.push({ label: 'Open / blocked', value: String(openOrBlocked), tone: openOrBlocked > 0 ? 'missing' : null });
  if (lines !== null) stats.push({ label: 'Lines', value: String(lines), tone: null });

  const gistText = lede !== null ? wikiAsCode(lede) : summary !== null ? wikiAsCode(summary) : null;
  const sub = `${plural(points, 'point')} across ${plural(sectionCount, 'section')}${flagsAll > 0 ? ` · ${plural(flagsAll, 'call')} flagged` : ''}`;
  return {
    shape: 'document',
    rail: {
      eyebrow: 'Explore note',
      title: asStr(frontmatter.title) ?? asStr(firstH1?.text),
      context: asStr(frontmatter.context),
      stage: { key: stage, text: plural(sectionCount, 'section') },
      big: {
        value: String(figureCount > 0 ? figureCount : points),
        label: figureCount > 0 ? (figureCount === 1 ? 'measured figure' : 'measured figures') : points === 1 ? 'point made' : 'points made',
        sub,
        stage: openOrBlocked > 0 ? 'untraced' : 'done',
      },
      stats,
    },
    gist: { runs: [], text: gistText, long: lede !== null && lede.length > 200, line: lede !== null ? summary : boiler },
    rows: [],
    counts: '',
    oneLine: null,
    parts,
    ledger: { title: 'Section by section', kicker: `${plural(points, 'point')} · ${plural(figureCount, 'figure')}` },
    toggle: true,
    verbatim: null,
    mentions: [],
    todos: cards,
    empty: cards.length > 0 ? null : EMPTY_EXPLORE,
    cardsInRail: true,
    also,
  };
}

export function composeNotePage(input: ViewInput, options: { now?: Date } = {}): ComposedNotePage | null {
  const note = rec(rec(input?.structured).note);
  if (note.shape !== 'quick' && note.shape !== 'document') return null;
  const frontmatter = rec(input?.frontmatter);
  const cards = cardsOf(input?.noteContext);
  const promotedFlag = frontmatter.promoted === true ? true : frontmatter.promoted === false ? false : null;
  const also = Object.keys(frontmatter).length > 0 ? [{ label: 'Frontmatter', targetId: null }] : [];
  const given = options?.now;
  const now = given instanceof Date && !Number.isNaN(given.getTime()) ? given : new Date();

  if (note.shape === 'document') {
    const headings = list(input?.headings).map(rec);
    return composeDocument(note, frontmatter, headings, cards, also);
  }
  return composeQuick(note, frontmatter, cards, promotedFlag, now, also);
}
