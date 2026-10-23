// The note body projection (quick-261023-61l, sketch 028 A: annotated; quick-261023-u13, sketch 029 A: gist
// console): a tolerant, bounded read of one GSD note (`.planning/notes/<name>.md`). A quick note
// (`/gsd-note`: a date, `promoted`, one paragraph kept word for word) is lifted into a title and labelled
// clauses ("Decided:", "Bug:", "Want:", "Off limits:", ...), with the file references and code identifiers it
// mentions marked; an explore note (`/gsd-explore`: a frontmatter title or a heading) is lifted into its
// lede, its `##` sections (key sentence, bold-led items, tables, asides, flagged calls and measured
// figures) and the totals the page's big number and stat list read.
// It ports the sketch's `template.html` lifting block (`sentences`, `lift`, `REF_RE`, `refsOf`) with
// correction 1: the sketch made a whole lead clause the title, but the README's rule is "the first
// sentence is the title", so the sentence splitter also breaks before a backtick, the title is the first
// sentence, and the rest of a lead that runs several sentences becomes a first row headed "Then".
// Code spans are atomic: a sentence never splits inside one, and a span whose text is a file reference
// becomes one file run. The sketch's reference patterns run per whitespace-delimited token.
// quick-261023-u13 (sketch 029 A) additions, all from the file alone: each quick row carries its group
// (decided / ask / problem / limit / open / other, the sketch's `GROUP` table), its first sentence and the
// rest as separate runs, the note's word count, the file-name title and the file's line count; an Open
// question label takes the missing tone. An explore note ports the sketch's `docBody`, `sectionModel`,
// `exploreModel`, `figures` and `flagsOf`.
// T-61l-02 / T-u13-02: every line is clipped to MAX_LINE up front; fences are tracked so nothing inside one
// is read as a heading, a flag or a figure; the sentence split and the `Label:` test are character scans;
// the reference patterns run only on tokens of at most MAX_TOKEN characters (a token holding `://` is a
// URL and is skipped); the figure pattern runs per sentence of at most MAX_SENTENCE characters; an explore
// note reads at most MAX_EXPLORE_CHARS characters, MAX_SECTIONS sections and MAX_SECTION_LINES lines per
// section; the quick-note text is capped at MAX_TEXT characters and every list is capped. `extractNote` is
// pure (no fs access) and never throws on a string; `NoteHandler.parse` still wraps it in try/catch
// (T-61l-04).

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type NoteRunKind = 'text' | 'file' | 'ident';

export interface NoteRun {
  kind: NoteRunKind;
  /** A text run keeps its inline-markdown backticks; a file run is the bare path (with `:line`). */
  text: string;
}

export type NoteTone = 'complete' | 'in-flight' | 'missing';

/** The sketch's row groups, behind the count line ("1 decided · 1 ask · 1 problem · 3 limits"). */
export type NoteGroup = 'decided' | 'ask' | 'problem' | 'limit' | 'open' | 'other';

export interface NoteRow {
  /** The label as written ("Decided", "Off limits", "Today"), or null for the "Then" row. */
  label: string | null;
  /** "2026-10-21" from a dated label ("Decided 2026-10-21:"), else null. */
  date: string | null;
  tone: NoteTone | null;
  group: NoteGroup;
  /** The whole clause. */
  runs: NoteRun[];
  /** The clause's first sentence. */
  first: NoteRun[];
  /** The remaining sentences (joined by a space); empty when there are none. */
  rest: NoteRun[];
}

export interface NoteMention {
  path: string;
  count: number;
}

export type NoteFlagKind = 'decided' | 'blocked' | 'open' | 'rejected' | 'resolved' | 'corrected';
export type NoteFlagTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

/** A call the note flags in a sentence: "Decided", "Blocked", "Open question", "Rejected", "Resolved", "Corrected". */
export interface NoteFlag {
  kind: NoteFlagKind;
  label: string;
  tone: NoteFlagTone;
  /** The sentence as plain text, without a leading "Decided: ". */
  text: string;
}

/** A bold-led list item: `**term.** first sentence`; the term is null when the item does not lead with bold. */
export interface NoteItem {
  term: string | null;
  /** The item's first sentence (inline markdown kept). */
  text: string;
}

/** A measured figure: a number followed within two words by a unit ("~110 MB/s", "67 times"). */
export interface NoteFigure {
  value: string;
  unit: string;
  /** The sentence it was read from, as plain text, at most 140 characters. */
  phrase: string;
  /** The zero-based index of its section, or null for one in the introduction. */
  section: number | null;
}

export type NoteKeyFrom = 'para' | 'item' | 'table' | 'quote' | 'none';

export interface NoteSection {
  heading: string;
  /** The heading without a "(measured ...)" note or a ": RESOLVED ..." tail. */
  short: string;
  /** The section's key sentence (inline markdown kept), or null when it has none. */
  key: string | null;
  keyFrom: NoteKeyFrom;
  /** At most four items; `itemCount` is the full count. */
  items: NoteItem[];
  itemCount: number;
  /** Rows after the header of the first table, or null when the section holds no table. */
  tableRows: number | null;
  asides: number;
  subs: number;
  /** Paragraphs, which count as points beside items and table rows. */
  paras: number;
  flags: NoteFlag[];
  figures: NoteFigure[];
  /** The section's shape, one string each: "7 items", "table · 2 rows", "1 aside", "1 sub". */
  side: string[];
}

export interface NoteBody {
  shape: 'quick' | 'document';
  /** The title built from the file name ("Crop images and profile photos"); absent without a path. */
  fileTitle?: string;
  /** The file's own line count; absent without the option. */
  lines?: number;
  /** Quick only: the first sentence of the note ("Label: " prefixed when the lead is labelled). */
  title?: NoteRun[];
  /** Quick only: the clauses after the title, in reading order. */
  rows?: NoteRow[];
  /** Quick only: the whole (capped) text, word for word, with its references marked. */
  verbatim?: NoteRun[];
  /** Quick only: the text was cut at MAX_TEXT characters. */
  capped?: boolean;
  /** Quick only: file references with counts, in first-seen order. */
  mentions?: NoteMention[];
  /** Quick only: the number of words in the note. */
  words?: number;
  /** Explore only: the introduction's first paragraph (shortened to two sentences when it runs long). */
  lede?: string;
  /** Explore only: a first paragraph that only says where the note came from ("Captured from ..."). */
  boiler?: string;
  /** Explore only: the one-sentence shape ("Three sections: 7 features, footage facts and ..."). */
  summary?: string;
  /** Explore only: the `##` sections, in order. */
  sections?: NoteSection[];
  /** Explore only: every figure once (by value and unit), the introduction's first. */
  figures?: NoteFigure[];
  /** Explore only: the flagged calls counted before any cap. */
  flagTotals?: { all: number; decided: number; openOrBlocked: number };
  /** Explore only: items, table rows and paragraphs across the sections. */
  points?: number;
  /** Explore only: the sections that hold a table. */
  tables?: number;
}

// ---------------------------------------------------------------------------
// Caps
// ---------------------------------------------------------------------------

const MAX_LINE = 8000;
const MAX_TEXT = 32000;
const MAX_ROWS = 80;
const MAX_MENTIONS = 100;
const MAX_TOKEN = 300;
const MAX_LABEL = 22;
const MAX_FRONTMATTER_LINES = 200;
// Explore notes (T-u13-02).
const MAX_EXPLORE_CHARS = 200000;
const MAX_SECTIONS = 40;
const MAX_SECTION_LINES = 4000;
const MAX_ITEMS_KEPT = 4;
const MAX_FLAGS = 8;
const MAX_FIGURES_PER_SECTION = 12;
const MAX_FIGURES = 60;
const MAX_KEY = 600;
const MAX_PHRASE = 140;
const MAX_SENTENCE = 2000;
const MAX_PIECE = 2000;
const MAX_HEADING = 300;
const MAX_LEDE = 1200;
const LONG_LEDE = 340;
const MAX_HEAD_CELLS = 12;
const MAX_CELL = 60;

// The sketch's `REF_RE`, run per token. The file alternative first, then the identifier alternative.
const FILE_SOURCE = String.raw`(?:[\w.-]+\/)+[\w.-]+\.[a-z]{1,5}(?::\d+(?:-\d+)?)?|\b[\w-]+\.(?:ts|tsx|js|mjs|rs|md|json|css|py)(?::\d+)?\b`;
const IDENT_SOURCE = String.raw`\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\b[a-z]+(?:_[a-z0-9]+){2,}\b|\b[a-z]+[A-Z]\w*\(\)?`;
const REF_RE = new RegExp(`(${FILE_SOURCE})|(${IDENT_SOURCE})`, 'g');
const FILE_WHOLE_RE = new RegExp(`^(?:${FILE_SOURCE})$`);

// The sketch's `FIG_RE`: a number, then within two words a unit. The lookbehind keeps a match from starting
// inside a longer number or word, so the pattern is linear on a sentence.
const UNIT_SOURCE = String.raw`(?:MB\/s|GB\/s|MiB|GiB|GB|TB|MB|GbE|fps|ms|files|types|times|keys|lines|instances|link events|clips|sketches|days|weeks|%|s\b)`;
const FIGURE_SOURCE = String.raw`(~|about |around |under |over |up to )?(?<![×\w.])(\d[\d,.]*(?:\s?(?:of|\/)\s?\d[\d,.]*)?)\s?((?:[a-z][a-z-]*\s){0,2}?)(${UNIT_SOURCE})`;
const FIG_RE = new RegExp(FIGURE_SOURCE, 'g');

const TONES = new Map<string, NoteTone>([
  ['decided', 'complete'],
  ['bug', 'in-flight'],
  ['cause', 'in-flight'],
  ['observed', 'in-flight'],
  ['suggested', 'in-flight'],
  ['open question', 'missing'],
]);

// The sketch's `GROUP`, keyed by the whole lower-cased label. The Then row and any other label are 'other'.
const GROUPS = new Map<string, NoteGroup>([
  ['decided', 'decided'],
  ['bug', 'problem'],
  ['cause', 'problem'],
  ['today', 'problem'],
  ['observed', 'problem'],
  ['problem', 'problem'],
  ['fix', 'ask'],
  ['want', 'ask'],
  ['wanted', 'ask'],
  ['how', 'ask'],
  ['ui', 'ask'],
  ['output', 'ask'],
  ['suggested', 'ask'],
  ['plan', 'ask'],
  ['limits', 'limit'],
  ['off limits', 'limit'],
  ['known gap', 'limit'],
  ['preset constraint', 'limit'],
  ['estimated', 'limit'],
  ['batch', 'limit'],
  ['open question', 'open'],
]);

// The sketch's `FLAG_RULES`, in order: a sentence takes the first rule it matches.
const FLAG_RULES: { kind: NoteFlagKind; re: RegExp; label: string; tone: NoteFlagTone }[] = [
  { kind: 'decided', re: /\bDecided\b/, label: 'Decided', tone: 'complete' },
  { kind: 'blocked', re: /\bBlocked\b/i, label: 'Blocked', tone: 'missing' },
  { kind: 'open', re: /\bopen question\b/i, label: 'Open question', tone: 'missing' },
  { kind: 'rejected', re: /\brejected\b/i, label: 'Rejected', tone: 'quiet' },
  { kind: 'resolved', re: /\bRESOLVED\b|\bresolved \d{4}/, label: 'Resolved', tone: 'complete' },
  { kind: 'corrected', re: /\bCorrected\b/, label: 'Corrected', tone: 'in-flight' },
];

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

// ---------------------------------------------------------------------------
// Character helpers
// ---------------------------------------------------------------------------

function isSpaceCode(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13 || code === 12 || code === 11 || code === 160;
}

function isUpper(ch: string | undefined): boolean {
  return ch !== undefined && ch >= 'A' && ch <= 'Z';
}

function isLower(ch: string | undefined): boolean {
  return ch !== undefined && ch >= 'a' && ch <= 'z';
}

function isLetter(ch: string | undefined): boolean {
  return isUpper(ch) || isLower(ch);
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isWordChar(ch: string | undefined): boolean {
  return isLetter(ch) || isDigit(ch) || ch === '_';
}

/** Runs of whitespace become one space; the ends are trimmed. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

// ---------------------------------------------------------------------------
// Lines and shape
// ---------------------------------------------------------------------------

function clippedLines(body: string): string[] {
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].length > MAX_LINE) lines[i] = lines[i].slice(0, MAX_LINE);
  }
  return lines;
}

/** Drops a leading `---` ... `---` block (blank lines before it are allowed). */
function withoutFrontmatter(lines: string[]): string[] {
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') start += 1;
  if (start >= lines.length || lines[start].trim() !== '---') return lines;
  for (let i = start + 1; i < lines.length && i < start + MAX_FRONTMATTER_LINES; i += 1) {
    if (lines[i].trim() === '---') return lines.slice(i + 1);
  }
  return lines;
}

function isFenceLine(trimmed: string): boolean {
  return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

/** An H1-H3 line: up to three spaces, one to three `#`, then a space or the end. */
function isHeadingLine(line: string): boolean {
  let i = 0;
  while (i < 3 && line[i] === ' ') i += 1;
  let hashes = 0;
  while (line[i + hashes] === '#') hashes += 1;
  if (hashes < 1 || hashes > 3) return false;
  const after = line[i + hashes];
  return after === undefined || after === ' ' || after === '\t';
}

function hasHeading(lines: string[]): boolean {
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (isFenceLine(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && isHeadingLine(line)) return true;
  }
  return false;
}

/** The body's text with every run of whitespace collapsed, cut at MAX_TEXT characters. */
function collapsedText(lines: string[]): { text: string; capped: boolean } {
  let out = '';
  for (const line of lines) {
    const piece = line.replace(/\s+/g, ' ').trim();
    if (piece === '') continue;
    out = out === '' ? piece : `${out} ${piece}`;
    if (out.length > MAX_TEXT) return { text: out.slice(0, MAX_TEXT).trimEnd(), capped: true };
  }
  return { text: out, capped: false };
}

/** Space-separated words across every line (a scan, no allocation per word). */
function wordCount(lines: string[]): number {
  let words = 0;
  for (const line of lines) {
    let inWord = false;
    for (let i = 0; i < line.length; i += 1) {
      if (isSpaceCode(line.charCodeAt(i))) inWord = false;
      else if (!inWord) {
        inWord = true;
        words += 1;
      }
    }
  }
  return words;
}

/** The file's line count: a final newline does not start a line. */
function lineCountOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** The sketch's `slugTitle`: the last path segment without `.md` and a leading date, hyphens as spaces. */
function fileTitleOf(path: unknown): string | undefined {
  if (typeof path !== 'string') return undefined;
  let name = path.slice(path.lastIndexOf('/') + 1);
  if (name.endsWith('.md')) name = name.slice(0, -3);
  if (name.length >= 11 && isDateAt(name, 0) && name[10] === '-') name = name.slice(11);
  name = name.split('-').join(' ').trim();
  if (name === '') return undefined;
  return name[0].toUpperCase() + name.slice(1);
}

// ---------------------------------------------------------------------------
// Code spans, sentences and clauses
// ---------------------------------------------------------------------------

/** Marks every character that sits inside a code span (backticks included). A run of n backticks opens a
 * span that the next run of exactly n closes; an opener with no closer is plain text. */
function markCode(text: string): Uint8Array {
  const mark = new Uint8Array(text.length);
  const noCloser = new Set<number>();
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '`') {
      i += 1;
      continue;
    }
    let n = 0;
    while (text[i + n] === '`') n += 1;
    if (noCloser.has(n)) {
      i += n;
      continue;
    }
    let j = i + n;
    let closeAt = -1;
    while (j < text.length) {
      if (text[j] !== '`') {
        j += 1;
        continue;
      }
      let m = 0;
      while (text[j + m] === '`') m += 1;
      if (m === n) {
        closeAt = j + m;
        break;
      }
      j += m;
    }
    if (closeAt < 0) {
      noCloser.add(n);
      i += n;
      continue;
    }
    mark.fill(1, i, closeAt);
    i = closeAt;
  }
  return mark;
}

function endsWithAbbreviation(text: string, dotAt: number): boolean {
  for (const word of ['e.g', 'i.e', 'etc', 'vs', 'approx']) {
    const start = dotAt - word.length;
    if (start < 0 || text.slice(start, dotAt) !== word) continue;
    if (start === 0 || !isWordChar(text[start - 1])) return true;
  }
  return false;
}

function opensSentence(ch: string | undefined): boolean {
  return isUpper(ch) || ch === '(' || ch === '“' || ch === '"' || ch === '`' || ch === '*';
}

/** The sketch's `sentences`, as a character scan that also leaves code spans whole and breaks before a
 * backtick (correction 1). The text is already whitespace-collapsed. */
function splitSentences(text: string): string[] {
  const code = markCode(text);
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length - 2; i += 1) {
    const ch = text[i];
    if ((ch !== '.' && ch !== '!' && ch !== '?') || code[i] === 1 || text[i + 1] !== ' ') continue;
    if (!opensSentence(text[i + 2])) continue;
    if (ch === '.' && endsWithAbbreviation(text, i)) continue;
    const sentence = text.slice(start, i + 1).trim();
    if (sentence !== '') out.push(sentence);
    start = i + 2;
  }
  const last = text.slice(start).trim();
  if (last !== '') out.push(last);
  return out;
}

/** The sentences of free text (whitespace collapsed first). */
function sentencesOf(text: string): string[] {
  return splitSentences(collapse(text.length > MAX_PIECE ? text.slice(0, MAX_PIECE) : text));
}

function firstSentenceOf(text: string): string {
  const found = sentencesOf(text);
  return found.length > 0 ? found[0] : collapse(text);
}

interface Label {
  label: string;
  date: string | null;
  rest: string;
}

/** `^([A-Z][A-Za-z]*(?: [a-z]+){0,2})( \d{4}-\d{2}-\d{2})?:\s+(.*)$` with the label part at most MAX_LABEL
 * characters, as a scan over the first 40 characters. */
function labelOf(sentence: string): Label | null {
  const head = sentence.length > 40 ? sentence.slice(0, 40) : sentence;
  if (!isUpper(head[0])) return null;
  let i = 1;
  while (isLetter(head[i])) i += 1;
  for (let group = 0; group < 2; group += 1) {
    if (head[i] !== ' ' || !isLower(head[i + 1])) break;
    let j = i + 2;
    while (isLower(head[j])) j += 1;
    i = j;
  }
  const label = head.slice(0, i);
  let date: string | null = null;
  if (head[i] === ' ' && isDateAt(head, i + 1)) {
    date = head.slice(i + 1, i + 11);
    i += 11;
  }
  if (head[i] !== ':' || label.length > MAX_LABEL) return null;
  // `\s+` after the colon, then at least the rest of the sentence.
  if (!isSpaceCode(sentence.charCodeAt(i + 1))) return null;
  let k = i + 1;
  while (k < sentence.length && isSpaceCode(sentence.charCodeAt(k))) k += 1;
  const rest = sentence.slice(k);
  if (rest === '') return null;
  return { label, date, rest };
}

function isDateAt(text: string, at: number): boolean {
  if (text.length < at + 10) return false;
  for (let k = 0; k < 10; k += 1) {
    const ch = text[at + k];
    if (k === 4 || k === 7) {
      if (ch !== '-') return false;
    } else if (!isDigit(ch)) return false;
  }
  return true;
}

/** "Today", "Estimated" or "Batch with" opening the sentence, word-bounded. */
function openerOf(sentence: string): string | null {
  for (const [word, label] of [
    ['Today', 'Today'],
    ['Estimated', 'Estimated'],
    ['Batch with', 'Batch'],
  ] as const) {
    if (sentence.startsWith(word) && !isWordChar(sentence[word.length])) return label;
  }
  return null;
}

interface Clause {
  label: string | null;
  date: string | null;
  /** True when the label came from an opener (Today ...), whose label is the sentence's own first word. */
  opener: boolean;
  sentences: string[];
}

function clausesOf(text: string): Clause[] {
  const clauses: Clause[] = [];
  let current: Clause | null = null;
  for (const sentence of splitSentences(text)) {
    const found = labelOf(sentence);
    if (found !== null) {
      current = { label: found.label, date: found.date, opener: false, sentences: [found.rest] };
      clauses.push(current);
      continue;
    }
    const opener = openerOf(sentence);
    if (opener !== null) {
      current = { label: opener, date: null, opener: true, sentences: [sentence] };
      clauses.push(current);
      continue;
    }
    if (current !== null) current.sentences.push(sentence);
    else {
      current = { label: null, date: null, opener: false, sentences: [sentence] };
      clauses.push(current);
    }
  }
  return clauses;
}

// ---------------------------------------------------------------------------
// Runs and mentions
// ---------------------------------------------------------------------------

function runsOf(text: string): NoteRun[] {
  const runs: NoteRun[] = [];
  let plain = '';
  const flush = (): void => {
    if (plain !== '') runs.push({ kind: 'text', text: plain });
    plain = '';
  };
  const token = (piece: string): void => {
    if (piece.length > MAX_TOKEN || piece.includes('://')) {
      plain += piece;
      return;
    }
    let last = 0;
    for (const match of piece.matchAll(REF_RE)) {
      const at = match.index ?? 0;
      plain += piece.slice(last, at);
      flush();
      runs.push({ kind: match[1] !== undefined ? 'file' : 'ident', text: match[0] });
      last = at + match[0].length;
    }
    plain += piece.slice(last);
  };
  const outside = (from: number, to: number): void => {
    let i = from;
    while (i < to) {
      let j = i;
      if (isSpaceCode(text.charCodeAt(i))) {
        while (j < to && isSpaceCode(text.charCodeAt(j))) j += 1;
        plain += text.slice(i, j);
      } else {
        while (j < to && !isSpaceCode(text.charCodeAt(j))) j += 1;
        token(text.slice(i, j));
      }
      i = j;
    }
  };
  const code = markCode(text);
  let pos = 0;
  while (pos < text.length) {
    if (code[pos] === 0) {
      let end = pos;
      while (end < text.length && code[end] === 0) end += 1;
      outside(pos, end);
      pos = end;
      continue;
    }
    let end = pos;
    while (end < text.length && code[end] === 1) end += 1;
    const span = text.slice(pos, end);
    const inner = span.replace(/^`+/, '').replace(/`+$/, '').trim();
    if (inner.length > 0 && inner.length <= MAX_TOKEN && !inner.includes(' ') && FILE_WHOLE_RE.test(inner)) {
      flush();
      runs.push({ kind: 'file', text: inner });
    } else {
      plain += span;
    }
    pos = end;
  }
  flush();
  return runs;
}

function mentionsOf(runs: NoteRun[]): NoteMention[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const run of runs) {
    if (run.kind !== 'file') continue;
    const seen = counts.get(run.text);
    if (seen === undefined) {
      if (order.length >= MAX_MENTIONS) continue;
      order.push(run.text);
      counts.set(run.text, 1);
    } else counts.set(run.text, seen + 1);
  }
  return order.map((path) => ({ path, count: counts.get(path) ?? 1 }));
}

// ---------------------------------------------------------------------------
// Quick notes
// ---------------------------------------------------------------------------

function rowOf(clause: Clause, sentences: string[]): NoteRow {
  const key = (clause.label ?? '').toLowerCase();
  const rest = sentences.slice(1).join(' ');
  return {
    label: clause.label,
    date: clause.date,
    tone: TONES.get(key) ?? null,
    group: clause.label === null ? 'other' : (GROUPS.get(key) ?? 'other'),
    runs: runsOf(sentences.join(' ')),
    first: runsOf(sentences[0] ?? ''),
    rest: rest === '' ? [] : runsOf(rest),
  };
}

function quickNote(lines: string[]): NoteBody {
  const { text, capped } = collapsedText(lines);
  const clauses = clausesOf(text);
  const rows: NoteRow[] = [];
  let title: NoteRun[] = [];

  const lead = clauses[0];
  if (lead !== undefined) {
    const first = lead.sentences[0] ?? '';
    const titleText = lead.label !== null && !lead.opener ? `${lead.label}: ${first}` : first;
    title = runsOf(titleText);
    if (lead.sentences.length > 1) {
      rows.push(rowOf({ label: null, date: null, opener: false, sentences: [] }, lead.sentences.slice(1)));
    }
    for (const clause of clauses.slice(1)) {
      if (rows.length >= MAX_ROWS) break;
      rows.push(rowOf(clause, clause.sentences));
    }
  }

  const verbatim = runsOf(text);
  return { shape: 'quick', title, rows, verbatim, capped, mentions: mentionsOf(verbatim), words: wordCount(lines) };
}

// ---------------------------------------------------------------------------
// Explore notes
// ---------------------------------------------------------------------------

/** The sketch's `plain`: no bold marks, backticks or wiki-link brackets, whitespace collapsed. */
function plainOf(text: string): string {
  return collapse(text.split('**').join('').split('`').join('').split('[[').join('').split(']]').join(''));
}

/** Lines outside fenced blocks, capped. */
function proseLines(lines: string[]): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (isFenceLine(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    out.push(line);
    if (out.length >= MAX_SECTION_LINES) break;
  }
  return out;
}

/** The sketch's `flagsOf`, over the prose lines (blockquote and list markers stripped). */
function flagsOf(lines: string[]): NoteFlag[] {
  const out: NoteFlag[] = [];
  for (const raw of lines) {
    let line = raw;
    if (line.startsWith('>')) line = line.slice(line[1] === ' ' ? 2 : 1);
    line = line.replace(/^\s*([-*]|\d+\.)\s+/, '');
    if (line.trim() === '') continue;
    for (const sentence of sentencesOf(line)) {
      const text = sentence.length > MAX_SENTENCE ? sentence.slice(0, MAX_SENTENCE) : sentence;
      for (const rule of FLAG_RULES) {
        if (!rule.re.test(text)) continue;
        let plain = plainOf(text);
        if (plain.startsWith('Decided:')) plain = plain.slice(8).trimStart();
        out.push({ kind: rule.kind, label: rule.label, tone: rule.tone, text: plain });
        break;
      }
    }
  }
  return out;
}

/** The sketch's `figures`, over the prose lines. */
function figuresOf(lines: string[], section: number | null): NoteFigure[] {
  const out: NoteFigure[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    if (out.length >= MAX_FIGURES_PER_SECTION) break;
    let line = raw.replace(/`[^`]*`/g, (span) => (/^`[\d.,~ ]+[A-Za-z/]*`$/.test(span) ? span.slice(1, -1) : ' '));
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line) || line.trim() === '') continue;
    line = line.trim();
    for (const sentence of sentencesOf(line)) {
      const text = sentence.length > MAX_SENTENCE ? sentence.slice(0, MAX_SENTENCE) : sentence;
      for (const match of text.matchAll(FIG_RE)) {
        const value = `${match[1] ?? ''}${match[2]}`.replace(/\.$/, '');
        const unit = `${match[3]}${match[4]}`.trim();
        const id = `${value} ${unit}`;
        if (seen.has(id) || seen.has(text)) continue;
        seen.add(id);
        seen.add(text);
        const phrase = plainOf(
          text
            .replace(/^\s*\|/, '')
            .replace(/^\s*([-*]|\d+\.)\s+/, '')
            .replace(/\s*\|\s*/g, ' · '),
        ).slice(0, MAX_PHRASE);
        out.push({ value, unit, phrase, section });
        if (out.length >= MAX_FIGURES_PER_SECTION) break;
      }
      if (out.length >= MAX_FIGURES_PER_SECTION) break;
    }
  }
  return out;
}

function cellsOf(row: string): string[] {
  let text = row.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|')) text = text.slice(0, -1);
  return text
    .split('|')
    .slice(0, MAX_HEAD_CELLS)
    .map((cell) => clip(cell.trim(), MAX_CELL));
}

/** `^(\d+\.|[-*])\s+(.*)$`: the text after a list marker at the start of a line, or null. */
function listItemText(line: string): string | null {
  const match = /^(?:\d+\.|[-*])\s+(.*)$/.exec(line);
  return match === null ? null : match[1];
}

function isIndentedText(line: string): boolean {
  return /^\s{2,}\S/.test(line);
}

function sectionOf(heading: string, lines: string[], index: number): NoteSection {
  const items: NoteItem[] = [];
  let itemCount = 0;
  let paras = 0;
  let firstPara: string | null = null;
  let tableHead: string[] | null = null;
  let tableRows = 0;
  let hasTable = false;
  let asides = 0;
  let firstAside: string | null = null;
  let subs = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (/^###\s/.test(line)) {
      subs += 1;
      continue;
    }
    if (line.startsWith('>')) {
      let quote = '';
      while (i < lines.length && lines[i].startsWith('>')) {
        if (quote.length < MAX_PIECE) quote += `${quote === '' ? '' : ' '}${lines[i].slice(lines[i][1] === ' ' ? 2 : 1)}`;
        i += 1;
      }
      i -= 1;
      asides += 1;
      if (firstAside === null) firstAside = quote;
      continue;
    }
    if (/^\s*\|/.test(line)) {
      let end = i;
      while (end + 1 < lines.length && /^\s*\|/.test(lines[end + 1])) end += 1;
      if (!hasTable) {
        hasTable = true;
        tableHead = cellsOf(line);
        tableRows = Math.max(0, end - i + 1 - 2);
      }
      i = end;
      continue;
    }
    if (isFenceLine(line.trimStart())) {
      i += 1;
      while (i < lines.length && !isFenceLine(lines[i].trimStart())) i += 1;
      continue;
    }
    const itemText = listItemText(line);
    if (itemText !== null) {
      let text = itemText;
      while (i + 1 < lines.length && isIndentedText(lines[i + 1]) && !/^\s+([-*]|\d+\.)\s/.test(lines[i + 1])) {
        i += 1;
        if (text.length < MAX_PIECE) text += ` ${lines[i].trim()}`;
      }
      itemCount += 1;
      if (items.length < MAX_ITEMS_KEPT) {
        const bold = /^\*\*(.+?)\*\*[.:]?\s*(.*)$/.exec(text);
        if (bold !== null) items.push({ term: bold[1].replace(/[.:]$/, ''), text: firstSentenceOf(bold[2]) });
        else items.push({ term: null, text: firstSentenceOf(text) });
      }
      continue;
    }
    if (isIndentedText(line)) continue;
    let para = line.trim();
    while (i + 1 < lines.length && lines[i + 1].trim() !== '' && !/^(\s*[-*]\s|\s*\d+\.\s|>|#|\s*\||```)/.test(lines[i + 1])) {
      i += 1;
      if (para.length < MAX_PIECE) para += ` ${lines[i].trim()}`;
    }
    paras += 1;
    if (firstPara === null) firstPara = para;
  }

  let key = '';
  let keyFrom: NoteKeyFrom = 'none';
  if (firstPara !== null) {
    key = firstSentenceOf(firstPara);
    keyFrom = 'para';
  } else if (items.length > 0) {
    const item = items[0];
    key = item.term !== null ? `${item.term}: ${item.text}` : item.text;
    keyFrom = 'item';
  } else if (hasTable) {
    key = `A table of ${tableRows} rows: ${(tableHead ?? []).join(' · ')}.`;
    keyFrom = 'table';
  } else if (firstAside !== null) {
    key = firstSentenceOf(firstAside);
    keyFrom = 'quote';
  }

  const prose = proseLines(lines);
  const flagLines = [heading, ...prose];
  const flags = flagsOf(flagLines);
  const side = [
    itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : '',
    hasTable ? `table · ${tableRows} rows` : '',
    asides > 0 ? `${asides} aside` : '',
    subs > 0 ? `${subs} sub` : '',
  ].filter((entry) => entry !== '');

  const short = heading.replace(/\s*\((?:measured|updated|as of)[^)]*\)/i, '').replace(/\s*[:—–-]\s*RESOLVED.*$/, '');
  return {
    heading,
    short,
    key: key === '' ? null : clip(key, MAX_KEY),
    keyFrom,
    items,
    itemCount,
    tableRows: hasTable ? tableRows : null,
    asides,
    subs,
    paras,
    flags,
    figures: figuresOf(prose, index),
    side,
  };
}

/** The sketch's `name`: the short heading without a leading "Axis 1 —" and anything after a colon or dash. */
function sectionNameOf(short: string): string {
  const base = short.slice(0, 200).replace(/^[A-Za-z]+ \d+\s*[—–-]\s*/, '');
  return base.split(/:\s| [—–] /)[0].trim();
}

function summaryOf(sections: NoteSection[]): string | undefined {
  if (sections.length === 0) return undefined;
  const parts = sections.map((section) => {
    const name = sectionNameOf(section.short);
    const plural = /^[A-Za-z]+( [A-Za-z]+)?s$/.test(name);
    return (plural && section.itemCount > 2 ? `${section.itemCount} ` : '') + name.replace(/^[A-Z](?=[a-z])/, (ch) => ch.toLowerCase());
  });
  const count = sections.length;
  const word = NUMBER_WORDS[count] ?? String(count);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `${word} ${count === 1 ? 'section' : 'sections'}: ${list}.`;
}

function exploreNote(allLines: string[]): NoteBody {
  // The sketch's `docBody`: a leading `# ` line goes before the introduction is read.
  let lines = allLines;
  const firstAt = lines.findIndex((line) => line.trim() !== '');
  if (firstAt >= 0 && lines[firstAt].startsWith('# ')) lines = lines.slice(firstAt + 1);

  const intro: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  let current = intro;
  let inFence = false;
  let budget = MAX_EXPLORE_CHARS;
  for (const line of lines) {
    budget -= line.length + 1;
    if (budget < 0) break;
    if (isFenceLine(line.trim())) inFence = !inFence;
    if (!inFence && /^##\s/.test(line)) {
      if (sections.length >= MAX_SECTIONS) break;
      const next = { heading: clip(line.replace(/^##\s/, '').trim(), MAX_HEADING), lines: [] as string[] };
      sections.push(next);
      current = next.lines;
    } else if (current.length < MAX_SECTION_LINES) {
      current.push(line);
    }
  }

  // The introduction's first paragraph outside a fence that is not a quote, a table or a heading.
  const found: { text: string | null } = { text: null };
  let para = '';
  let introFence = false;
  const endPara = (): void => {
    const text = collapse(para);
    para = '';
    if (found.text === null && text !== '' && text[0] !== '>' && text[0] !== '|' && text[0] !== '#') found.text = text;
  };
  for (const line of intro) {
    if (found.text !== null) break;
    if (isFenceLine(line.trim())) {
      endPara();
      introFence = !introFence;
      continue;
    }
    if (introFence) continue;
    if (line.trim() === '') endPara();
    else if (para.length < MAX_PIECE) para += `${para === '' ? '' : ' '}${line.trim()}`;
  }
  endPara();

  let lede: string | undefined;
  let boiler: string | undefined;
  if (found.text !== null) {
    let text: string = found.text;
    const lowered = text.slice(0, 16).toLowerCase();
    const isBoiler =
      lowered.startsWith('captured from') ||
      lowered.startsWith('notes from') ||
      lowered.startsWith('note from') ||
      lowered.startsWith('written during');
    if (text.length > LONG_LEDE) text = sentencesOf(text).slice(0, 2).join(' ');
    text = text.length > MAX_LEDE ? clip(text, MAX_LEDE) : text;
    if (isBoiler) boiler = text;
    else lede = text;
  }

  const built = sections.map((section, index) => sectionOf(section.heading, section.lines, index));
  const introFigures = figuresOf(proseLines(intro), null);
  const figures: NoteFigure[] = [];
  const seenFigures = new Set<string>();
  for (const figure of [...introFigures, ...built.flatMap((section) => section.figures)]) {
    const id = `${figure.value}${figure.unit}`;
    if (seenFigures.has(id)) continue;
    seenFigures.add(id);
    figures.push(figure);
    if (figures.length >= MAX_FIGURES) break;
  }

  // Flag totals are counted before any per-section cap: sectionOf keeps every flag it finds, so cap here.
  let all = 0;
  let decided = 0;
  let openOrBlocked = 0;
  for (const section of built) {
    for (const flag of section.flags) {
      all += 1;
      if (flag.kind === 'decided' || flag.kind === 'resolved') decided += 1;
      else if (flag.kind === 'open' || flag.kind === 'blocked') openOrBlocked += 1;
    }
    if (section.flags.length > MAX_FLAGS) section.flags = section.flags.slice(0, MAX_FLAGS);
  }

  let points = 0;
  let tables = 0;
  for (const section of built) {
    points += section.itemCount + (section.tableRows ?? 0) + section.paras;
    if (section.tableRows !== null) tables += 1;
  }
  return { shape: 'document', lede, boiler, summary: summaryOf(built), sections: built, figures, flagTotals: { all, decided, openOrBlocked }, points, tables };
}

// ---------------------------------------------------------------------------
// The projection
// ---------------------------------------------------------------------------

export function extractNote(body: string, options: { titled: boolean; path?: string; lines?: number }): NoteBody {
  const source = typeof body === 'string' ? body : '';
  const lines = withoutFrontmatter(clippedLines(source));
  const common: Pick<NoteBody, 'fileTitle' | 'lines'> = {};
  const fileTitle = fileTitleOf(options?.path);
  if (fileTitle !== undefined) common.fileTitle = fileTitle;
  const lineCount = lineCountOf(options?.lines);
  if (lineCount !== undefined) common.lines = lineCount;

  if (options?.titled === true || hasHeading(lines)) return { ...exploreNote(lines), ...common };
  return { ...quickNote(lines), ...common };
}
