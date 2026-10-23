// The note body projection (quick-261023-61l, sketch 028 A: annotated): a tolerant, bounded read of one
// GSD note (`.planning/notes/<name>.md`). A quick note (`/gsd-note`: a date, `promoted`, one paragraph kept
// word for word) is lifted into a title and labelled clauses ("Decided:", "Bug:", "Want:", "Off limits:", ...),
// with the file references and code identifiers it mentions marked; an explore note (`/gsd-explore`: a
// frontmatter title or a heading) is only tagged as a document, because the page draws it with the app's
// own renderer.
// It ports the sketch's `template.html` lifting block (`sentences`, `lift`, `REF_RE`, `refsOf`) with
// correction 1: the sketch made a whole lead clause the title, but the README's rule is "the first
// sentence is the title", so the sentence splitter also breaks before a backtick, the title is the first
// sentence, and the rest of a lead that runs several sentences becomes a first row headed "Then".
// Code spans are atomic: a sentence never splits inside one, and a span whose text is a file reference
// becomes one file run. The sketch's reference patterns run per whitespace-delimited token.
// T-61l-02: every line is clipped to MAX_LINE up front; fences are tracked so nothing inside one is read
// as a heading; the sentence split and the `Label:` test are character scans; the reference patterns run
// only on tokens of at most MAX_TOKEN characters (a token holding `://` is a URL and is skipped); the
// quick-note text is capped at MAX_TEXT characters and every list is capped. `extractNote` is pure (no fs
// access) and never throws on a string; `NoteHandler.parse` still wraps it in try/catch (T-61l-04).

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type NoteRunKind = 'text' | 'file' | 'ident';

export interface NoteRun {
  kind: NoteRunKind;
  /** A text run keeps its inline-markdown backticks; a file run is the bare path (with `:line`). */
  text: string;
}

export type NoteTone = 'complete' | 'in-flight';

export interface NoteRow {
  /** The label as written ("Decided", "Off limits", "Today"), or null for the "Then" row. */
  label: string | null;
  /** "2026-10-21" from a dated label ("Decided 2026-10-21:"), else null. */
  date: string | null;
  tone: NoteTone | null;
  runs: NoteRun[];
}

export interface NoteMention {
  path: string;
  count: number;
}

export interface NoteBody {
  shape: 'quick' | 'document';
  /** Quick only: the first sentence of the note ("Label: " prefixed when the lead is labelled). */
  title?: NoteRun[];
  /** Quick only: the title sentence is under 70 characters. */
  short?: boolean;
  /** Quick only: the clauses after the title, in reading order. */
  rows?: NoteRow[];
  /** Quick only: the whole (capped) text, word for word, with its references marked. */
  verbatim?: NoteRun[];
  /** Quick only: the text was cut at MAX_TEXT characters. */
  capped?: boolean;
  /** Quick only: file references with counts, in first-seen order. */
  mentions?: NoteMention[];
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
const SHORT_TITLE = 70;
const MAX_FRONTMATTER_LINES = 200;

// The sketch's `REF_RE`, run per token. The file alternative first, then the identifier alternative.
const FILE_SOURCE = String.raw`(?:[\w.-]+\/)+[\w.-]+\.[a-z]{1,5}(?::\d+(?:-\d+)?)?|\b[\w-]+\.(?:ts|tsx|js|mjs|rs|md|json|css|py)(?::\d+)?\b`;
const IDENT_SOURCE = String.raw`\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\b[a-z]+(?:_[a-z0-9]+){2,}\b|\b[a-z]+[A-Z]\w*\(\)?`;
const REF_RE = new RegExp(`(${FILE_SOURCE})|(${IDENT_SOURCE})`, 'g');
const FILE_WHOLE_RE = new RegExp(`^(?:${FILE_SOURCE})$`);

const TONES = new Map<string, NoteTone>([
  ['decided', 'complete'],
  ['bug', 'in-flight'],
  ['cause', 'in-flight'],
  ['observed', 'in-flight'],
  ['suggested', 'in-flight'],
]);

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
  return isUpper(ch) || ch === '(' || ch === '“' || ch === '"' || ch === '`';
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
// The projection
// ---------------------------------------------------------------------------

export function extractNote(body: string, options: { titled: boolean }): NoteBody {
  const source = typeof body === 'string' ? body : '';
  const lines = withoutFrontmatter(clippedLines(source));
  if (options?.titled === true || hasHeading(lines)) return { shape: 'document' };

  const { text, capped } = collapsedText(lines);
  const clauses = clausesOf(text);
  const rows: NoteRow[] = [];
  let title: NoteRun[] = [];
  let short = false;

  const lead = clauses[0];
  if (lead !== undefined) {
    const first = lead.sentences[0] ?? '';
    const titleText = lead.label !== null && !lead.opener ? `${lead.label}: ${first}` : first;
    title = runsOf(titleText);
    short = titleText.length < SHORT_TITLE;
    if (lead.sentences.length > 1) {
      rows.push({ label: null, date: null, tone: null, runs: runsOf(lead.sentences.slice(1).join(' ')) });
    }
    for (const clause of clauses.slice(1)) {
      if (rows.length >= MAX_ROWS) break;
      const key = (clause.label ?? '').toLowerCase();
      rows.push({
        label: clause.label,
        date: clause.date,
        tone: TONES.get(key) ?? null,
        runs: runsOf(clause.sentences.join(' ')),
      });
    }
  }

  const verbatim = runsOf(text);
  return { shape: 'quick', title, short, rows, verbatim, capped, mentions: mentionsOf(verbatim) };
}
