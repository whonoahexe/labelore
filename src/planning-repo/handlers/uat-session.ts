// The UAT.md session projection (quick-261001-qk7, sketch 015 B): a tolerant, fence-aware,
// line-scanned read of a user-acceptance-test document's body into `UatSession` — the current test
// (or the one-line current state), every test with its fields in source order, the Summary counts,
// the Gaps (YAML-ish items or prose cards), every other `##` section, a section ledger so the
// composer can prove nothing was dropped silently, and the number of HTML comments the template
// carries. It is a port of the sketch's `gen-data.mjs` parse with the pattern-map.ts discipline.
// T-qk7-01: HTML comments are removed by a linear indexOf scan (never a whole-document regex); the
// `##` and `###` splits go through `splitWithPreamble` (fence-aware, every line clipped to MAX_LINE
// up front); every regex here is applied to one clipped line at a time and none nests an unbounded
// quantifier, so one pathological line cannot make any scan expensive.
// `extractUatSession` is pure (no fs access) and never throws on a string; `UatHandler.parse` still
// wraps it in try/catch (T-qk7-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';
import { splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type UatResult = 'pass' | 'issue' | 'blocked' | 'skipped' | 'pending' | 'other';

export interface UatField {
  key: string;
  value: string;
  /** `value` parsed as paragraph / list / table / code blocks (empty for an empty value, and for the
   * scalar keys `result`, `severity` and `blocked_by`, which the composer reads by value). */
  blocks: Block[];
}

export interface UatTest {
  number: number;
  name: string;
  result: UatResult;
  /** The `result:` value as written (one pair of quotes removed, brackets kept). */
  resultRaw: string;
  fields: UatField[];
  /** Text before the test's first `key:` line. */
  lead: Block[];
}

export interface UatCurrent {
  /** As written (`5`, `1 (resolved)`). */
  number: string;
  name: string;
  expected: string;
  expectedBlocks: Block[];
  awaiting: string;
  /** The `##` section the current test was read from (`Current Test`, or `Resolution`). */
  fromSection: string;
}

export interface UatGapArtifact {
  path: string;
  issue: string;
}

export interface UatGapItem {
  /** Every string-valued `key: value` of the item (gap_id, truth, status, reason, severity, test,
   * root_cause, debug_session, resolved_*, fix, …). */
  values: Record<string, string>;
  artifacts: UatGapArtifact[];
  missing: string[];
}

export interface UatGapCard {
  title: string | null;
  blocks: Block[];
}

export interface UatGaps {
  mode: 'items' | 'prose' | 'none';
  /** The `##` heading as written (`Gaps`, `Gaps (round 1, historical …)`), or null when absent. */
  heading: string | null;
  /** The author's own text ahead of the cards, or for an empty section (`None — all tests passed.`). */
  lead: string;
  items: UatGapItem[];
  cards: UatGapCard[];
}

export interface UatExtra {
  heading: string;
  blocks: Block[];
}

export interface UatSection {
  heading: string;
  /** True for the sections the session consumes itself (current test, tests, summary, gaps). */
  claimed: boolean;
}

export interface UatSession {
  current: UatCurrent | null;
  /** The one-line current state (`testing complete`, `none — all items resolved …`) when no
   * current test with a name was found. */
  currentLine: string | null;
  tests: UatTest[];
  /** Prose between the `## Tests` heading and the first test. */
  testsNote: Block[];
  summary: Record<string, string> | null;
  gaps: UatGaps;
  extras: UatExtra[];
  sections: UatSection[];
  /** HTML comments the body carried (removed before parsing). */
  commentCount: number;
}

// ---------------------------------------------------------------------------
// Line helpers
// ---------------------------------------------------------------------------

const MAX_TESTS = 2000;
const MAX_ITEMS = 500;
const MAX_CARDS = 500;
const MAX_LEAD = 2000;
const MAX_HEADING = 300;

interface Fence {
  ch: string;
  len: number;
}

function fenceOpener(trimmed: string): Fence | null {
  const ch = trimmed[0];
  if (ch !== '`' && ch !== '~') return null;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === ch) len += 1;
  return len >= 3 ? { ch, len } : null;
}

function fenceCloses(trimmed: string, fence: Fence): boolean {
  if (trimmed[0] !== fence.ch) return false;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === fence.ch) len += 1;
  return len >= fence.len && trimmed.slice(len).trim() === '';
}

/** HTML comments removed by a linear scan; an unterminated `<!--` leaves the rest untouched. */
function stripComments(text: string): { text: string; count: number } {
  let from = 0;
  let count = 0;
  const parts: string[] = [];
  for (;;) {
    const open = text.indexOf('<!--', from);
    if (open === -1) break;
    const close = text.indexOf('-->', open + 4);
    if (close === -1) break;
    parts.push(text.slice(from, open));
    from = close + 3;
    count += 1;
  }
  if (count === 0) return { text, count };
  parts.push(text.slice(from));
  return { text: parts.join(''), count };
}

function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').trim();
}

function headingKey(heading: string): string {
  return plain(heading.slice(0, MAX_HEADING)).toLowerCase();
}

/** `###`–`######` heading lines outside a fence become one bold line, so a sub-heading inside an
 * extra section reads as a heading rather than as literal hashes. Then parsed to blocks. */
function toBlocks(text: string): Block[] {
  if (text.trim() === '') return [];
  const out: string[] = [];
  let fence: Fence | null = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      out.push(line);
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      out.push(line);
      continue;
    }
    if (trimmed[0] === '#') {
      let level = 0;
      while (level < trimmed.length && trimmed[level] === '#') level += 1;
      if (level >= 3 && level <= 6 && (trimmed[level] === ' ' || trimmed[level] === '\t')) {
        const heading = trimmed.slice(level).trim();
        out.push(heading === '' ? '' : `**${heading}**`);
        out.push('');
        continue;
      }
    }
    out.push(line);
  }
  return parseBlocks(out.join('\n'));
}

function firstParagraph(text: string): string {
  const lines: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (lines.length > 0) break;
      continue;
    }
    lines.push(trimmed);
  }
  const joined = lines.join(' ');
  return joined.length > 600 ? joined.slice(0, 600) : joined;
}

function unbracket(text: string): string {
  let out = text.trim();
  if (out.startsWith('[')) out = out.slice(1);
  if (out.endsWith(']')) out = out.slice(0, -1);
  return out.trim();
}

// ---------------------------------------------------------------------------
// `key: value` fields
// ---------------------------------------------------------------------------

/** A lowercase key of 2-25 characters (letters, digits and underscores; `round_1`) at column 0, then a colon and
 * either nothing or whitespace and a value. */
const KEY_RE = /^([a-z][a-z0-9_]{1,24}):(?:\s(.*)|\s*)$/;

/** One pair of surrounding double quotes removed (escaped quotes unescaped inside). */
function unquote(value: string): string {
  if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
    return value.slice(1, -1).split('\\"').join('"');
  }
  return value;
}

interface RawField {
  key: string;
  lines: string[];
}

/** `blocks` is left empty for the scalar keys (result, severity, blocked_by, …) the composer reads by
 * value, and for every field when `withBlocks` is false (the Summary block). */
const SCALAR_KEYS = new Set(['result', 'severity', 'blocked_by']);

function scanFields(text: string, withBlocks = true): { fields: UatField[]; lead: string } {
  const raw: RawField[] = [];
  const lead: string[] = [];
  let current: RawField | null = null;
  let fence: Fence | null = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      if (current) current.lines.push(line.startsWith('  ') ? line.slice(2) : line);
      else lead.push(line);
      continue;
    }
    const match = KEY_RE.exec(line);
    if (match && match[1] !== 'http' && match[1] !== 'https') {
      const rest = (match[2] ?? '').trim();
      current = { key: match[1], lines: rest === '|' || rest === '' ? [] : [rest] };
      raw.push(current);
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) fence = opened;
    if (current) current.lines.push(line.startsWith('  ') ? line.slice(2) : line);
    else lead.push(line);
  }
  const fields: UatField[] = raw.map((field) => {
    const joined = field.lines.join('\n').replace(/^\n+/, '').trimEnd();
    const value = unquote(joined);
    const blocks = !withBlocks || value === '' || SCALAR_KEYS.has(field.key) ? [] : toBlocks(value);
    return { key: field.key, value, blocks };
  });
  return { fields, lead: lead.join('\n').trim() };
}

function valueOf(fields: UatField[], key: string): string | null {
  for (const field of fields) if (field.key === key) return field.value;
  return null;
}

function resultOf(raw: string): UatResult {
  const text = raw.toLowerCase();
  if (text.includes('pending')) return 'pending';
  if (text.startsWith('pass') || text.startsWith('closed')) return 'pass';
  if (text.startsWith('issue') || text.includes('fail')) return 'issue';
  if (text.startsWith('skip')) return 'skipped';
  if (text.startsWith('block')) return 'blocked';
  return 'other';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const TEST_TITLE_RE = /^(\d{1,6})\.\s*(.+)$/;

function testsOf(body: string, tests: UatTest[]): Block[] {
  const { preamble, sections } = splitWithPreamble(body, 3);
  for (const section of sections) {
    if (tests.length >= MAX_TESTS) break;
    const title = section.heading.slice(0, MAX_HEADING);
    const match = TEST_TITLE_RE.exec(title);
    const { fields, lead } = scanFields(section.body);
    const rawResult = valueOf(fields, 'result') ?? '';
    tests.push({
      number: match ? Number(match[1]) : tests.length + 1,
      name: match ? match[2].trim() : title,
      result: resultOf(rawResult),
      resultRaw: rawResult,
      fields,
      lead: toBlocks(lead),
    });
  }
  return toBlocks(preamble);
}

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

const ITEM_START_RE = /^- ([a-z][a-z0-9_]{0,39}):\s*(.*)$/;
const ITEM_KEY_RE = /^ {2}([a-z][a-z0-9_]{0,39}):\s*(.*)$/;
const ITEM_LIST_RE = /^ {4}- (.*)$/;
const ITEM_ISSUE_RE = /^ {6}issue:\s*(.*)$/;

function stripQuotes(value: string): string {
  let out = value;
  if (out.startsWith('"')) out = out.slice(1);
  if (out.endsWith('"')) out = out.slice(0, -1);
  return out;
}

function hasItemStart(lines: string[]): boolean {
  let fence: Fence | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      continue;
    }
    if (ITEM_START_RE.test(line)) return true;
  }
  return false;
}

function itemsOf(lines: string[]): UatGapItem[] {
  const items: UatGapItem[] = [];
  let item: UatGapItem | null = null;
  let key: string | null = null;
  /** The list key currently collecting `    - …` lines (artifacts, missing or another). */
  let list: string | null = null;

  const setKey = (name: string, rawValue: string): void => {
    if (item === null) return;
    const value = rawValue.trim();
    key = name;
    if (value === '' || value === '[]') {
      list = name;
      if (name !== 'artifacts' && name !== 'missing') item.values[name] = '';
      return;
    }
    list = null;
    item.values[name] = stripQuotes(value);
  };

  for (const line of lines) {
    const start = ITEM_START_RE.exec(line);
    if (start) {
      if (items.length >= MAX_ITEMS) break;
      item = { values: {}, artifacts: [], missing: [] };
      items.push(item);
      key = null;
      list = null;
      setKey(start[1], start[2]);
      continue;
    }
    if (item === null) continue;
    const keyed = ITEM_KEY_RE.exec(line);
    if (keyed) {
      setKey(keyed[1], keyed[2]);
      continue;
    }
    const listed = ITEM_LIST_RE.exec(line);
    if (listed && list !== null) {
      const text = listed[1].trim();
      if (list === 'artifacts') {
        if (text.startsWith('path:')) {
          item.artifacts.push({ path: stripQuotes(text.slice(5).trim()), issue: '' });
        } else {
          item.artifacts.push({ path: stripQuotes(text), issue: '' });
        }
      } else if (list === 'missing') {
        item.missing.push(stripQuotes(text));
      } else {
        const prior = item.values[list] ?? '';
        item.values[list] = `${prior === '' ? '' : `${prior}\n`}- ${stripQuotes(text)}`;
      }
      continue;
    }
    const issue = ITEM_ISSUE_RE.exec(line);
    if (issue && list === 'artifacts' && item.artifacts.length > 0) {
      item.artifacts[item.artifacts.length - 1].issue = stripQuotes(issue[1].trim());
      continue;
    }
    const trimmed = line.trim();
    if (trimmed === '' || key === null) continue;
    const fragment = trimmed.endsWith('"') ? trimmed.slice(0, -1) : trimmed;
    if (list === 'missing' && item.missing.length > 0) {
      item.missing[item.missing.length - 1] += ` ${fragment}`;
    } else if (list === 'artifacts' && item.artifacts.length > 0) {
      const last = item.artifacts[item.artifacts.length - 1];
      last.issue = last.issue === '' ? fragment : `${last.issue} ${fragment}`;
    } else if (key in item.values) {
      item.values[key] = item.values[key] === '' ? fragment : `${item.values[key]} ${fragment}`;
    }
  }
  return items;
}

/** Top-level `- ` bullets: the text before the first is the lead; each bullet runs to the next. */
function bulletsOf(text: string): { lead: string; bullets: string[] } | null {
  const lead: string[] = [];
  const bullets: string[][] = [];
  let fence: Fence | null = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      (bullets.length > 0 ? bullets[bullets.length - 1] : lead).push(line);
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) fence = opened;
    if (!opened && line.startsWith('- ')) {
      if (bullets.length >= MAX_CARDS) break;
      bullets.push([line.slice(2)]);
      continue;
    }
    if (bullets.length > 0) bullets[bullets.length - 1].push(line.startsWith('  ') ? line.slice(2) : line);
    else lead.push(line);
  }
  if (bullets.length === 0) return null;
  return { lead: lead.join('\n').trim(), bullets: bullets.map((b) => b.join('\n').trim()) };
}

function clipLead(text: string): string {
  return text.length > MAX_LEAD ? text.slice(0, MAX_LEAD) : text;
}

function gapsOf(heading: string, body: string): UatGaps {
  const text = body.trim();
  const empty: UatGaps = { mode: 'none', heading, lead: '', items: [], cards: [] };
  if (text === '' || text.toLowerCase() === '[none]') return empty;
  const lines = text.split('\n');
  if (hasItemStart(lines)) {
    return { mode: 'items', heading, lead: '', items: itemsOf(lines), cards: [] };
  }
  const { preamble, sections } = splitWithPreamble(text, 3);
  if (sections.length > 0) {
    return {
      mode: 'prose',
      heading,
      lead: clipLead(preamble.trim()),
      items: [],
      cards: sections.slice(0, MAX_CARDS).map((section) => ({
        title: section.heading.slice(0, MAX_HEADING),
        blocks: toBlocks(section.body),
      })),
    };
  }
  const bullets = bulletsOf(text);
  if (bullets) {
    return {
      mode: 'prose',
      heading,
      lead: clipLead(bullets.lead),
      items: [],
      cards: bullets.bullets.map((bullet) => ({ title: null, blocks: toBlocks(bullet) })),
    };
  }
  return { ...empty, lead: clipLead(text) };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function emptySession(): UatSession {
  return {
    current: null,
    currentLine: null,
    tests: [],
    testsNote: [],
    summary: null,
    gaps: { mode: 'none', heading: null, lead: '', items: [], cards: [] },
    extras: [],
    sections: [],
    commentCount: 0,
  };
}

/** The tolerant UAT projection. Pure; never throws on any string. */
export function extractUatSession(rawBody: string): UatSession {
  const session = emptySession();
  const body = typeof rawBody === 'string' ? rawBody : '';
  const stripped = stripComments(body);
  session.commentCount = stripped.count;
  const { sections } = splitWithPreamble(stripped.text, 2);
  let gapsSeen = false;
  let summarySeen = false;
  for (const section of sections) {
    const heading = plain(section.heading.slice(0, MAX_HEADING));
    const key = headingKey(section.heading);
    let claimed = false;
    if (key.startsWith('current test') || (key === 'resolution' && session.current === null)) {
      const { fields } = scanFields(section.body);
      const name = valueOf(fields, 'name');
      if (name !== null) {
        if (session.current === null) {
          const expectedField = fields.find((f) => f.key === 'expected');
          session.current = {
            number: valueOf(fields, 'number') ?? '',
            name,
            expected: expectedField?.value ?? '',
            expectedBlocks: expectedField?.blocks ?? [],
            awaiting: valueOf(fields, 'awaiting') ?? '',
            fromSection: heading,
          };
          claimed = true;
        }
      } else if (key !== 'resolution') {
        // A bare `[testing complete]` / `none — …` line: the one-line current state.
        claimed = true;
        if (session.currentLine === null) {
          const line = unbracket(firstParagraph(section.body));
          if (line !== '') session.currentLine = line;
        }
      }
    } else if (key === 'tests') {
      claimed = true;
      const note = testsOf(section.body, session.tests);
      if (session.testsNote.length === 0) session.testsNote = note;
    } else if (key === 'summary' && !summarySeen) {
      claimed = true;
      summarySeen = true;
      const summary: Record<string, string> = {};
      for (const field of scanFields(section.body, false).fields) summary[field.key] = field.value;
      session.summary = summary;
    } else if (key.startsWith('gaps') && !gapsSeen) {
      claimed = true;
      gapsSeen = true;
      session.gaps = gapsOf(heading, section.body);
    } else if (key === 'result' && session.currentLine === null) {
      // `## Result` also sets the one-line state, and stays an extra section.
      const line = firstParagraph(section.body);
      if (line !== '') session.currentLine = line;
    }
    if (!claimed) session.extras.push({ heading, blocks: toBlocks(section.body) });
    session.sections.push({ heading, claimed });
  }
  return session;
}
