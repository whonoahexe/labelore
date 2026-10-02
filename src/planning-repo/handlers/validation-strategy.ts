// The VALIDATION.md strategy projection (quick-261003-526, sketch 016 winner A): a tolerant,
// fence-aware, line-scanned read of a phase's test contract into `ValidationStrategy` — the Test
// Infrastructure rows and prose, the Sampling Rate steps, the Per-Task Verification Map normalised
// to one row shape whatever columns the doc used (up to ten), Wave 0 items, the manual-only rows (or
// the author's prose), the sign-off checklist with its approval line, every other `##` section, a
// section ledger so the composer can prove nothing was dropped silently, and the number of HTML
// comments the template carries. It is a port of the sketch's `gen-data.mjs` with the
// pattern-map.ts / uat-session.ts discipline.
// T-526-01: HTML comments are removed by a linear indexOf scan (never a whole-document regex); the
// `##` split goes through `splitWithPreamble` (fence-aware, every line clipped to MAX_LINE up front);
// table cells are split by the linear `splitRow`; every regex here is applied to one clipped line or
// cell at a time and none nests an unbounded quantifier; rows, items and cell text are capped.
// `extractValidationStrategy` is pure (no fs access) and never throws on a string;
// `ValidationHandler.parse` still wraps it in try/catch (T-526-05).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';
import { splitRow } from './pattern-map.ts';
import { splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type ValidationFileKind = 'yes' | 'create' | 'extend' | 'na' | 'unknown';
export type ValidationTestKind = 'unit' | 'integration' | 'build' | 'e2e' | 'manual' | 'auto';
export type ValidationRowStatus = 'green' | 'red' | 'flaky' | 'pending' | 'none';

export interface ValidationInfraRow {
  /** Bold markers removed (`Quick run command (backend)`). */
  key: string;
  value: string;
}

export interface ValidationInfra {
  heading: string;
  rows: ValidationInfraRow[];
  /** Prose before the table. */
  lead: Block[];
  /** Prose after the table. */
  tail: Block[];
}

export interface ValidationSamplingStep {
  /** The leading bold `When:` label, or null when the bullet has none. */
  when: string | null;
  what: string;
}

export interface ValidationSampling {
  heading: string;
  lead: Block[];
  steps: ValidationSamplingStep[];
  tail: Block[];
}

export interface ValidationTaskRow {
  index: number;
  id: string;
  plan: string;
  wave: string;
  requirements: string[];
  threats: string[];
  behavior: string;
  testTypeRaw: string;
  testKind: ValidationTestKind;
  command: string;
  fileKind: ValidationFileKind;
  fileNote: string;
  status: ValidationRowStatus;
  statusRaw: string;
  prerequisite: string;
}

export interface ValidationMap {
  heading: string;
  columns: string[];
  rows: ValidationTaskRow[];
  /** The blockquote (or other prose) before the table. */
  preface: Block[];
  /** Authored prose after the table, the italic legend lines excluded. */
  notes: Block[];
  /** Italic status-legend / "Planner populates…" lines after the table, asterisks removed. */
  legend: string[];
  /** True when every row still holds the template's `{Placeholder}` tokens. */
  template: boolean;
}

export interface ValidationWave0Item {
  text: string;
  box: boolean;
  checked: boolean;
}

export interface ValidationWave0 {
  heading: string;
  lead: Block[];
  items: ValidationWave0Item[];
  tail: Block[];
}

export interface ValidationManualRow {
  behavior: string;
  requirements: string[];
  why: string;
  how: string;
  /** The Observed cell, or null when the table has no such column. */
  observed: string | null;
  /** The Outcome cell, or null when the table has no such column. */
  outcome: string | null;
}

export interface ValidationManual {
  heading: string;
  lead: Block[];
  tail: Block[];
  rows: ValidationManualRow[];
  /** The section's blocks when it has no table (the author's prose, rendered as written). */
  prose: Block[] | null;
}

export interface ValidationSignoffItem {
  text: string;
  checked: boolean;
}

export interface ValidationSignoff {
  heading: string;
  items: ValidationSignoffItem[];
  /** The `**Approval:**` line's text, or null. */
  approval: string | null;
  extra: Block[];
}

export interface ValidationExtra {
  heading: string;
  blocks: Block[];
}

export interface ValidationSection {
  heading: string;
  claimed: boolean;
}

export interface ValidationStrategy {
  infra: ValidationInfra | null;
  sampling: ValidationSampling | null;
  map: ValidationMap | null;
  wave0: ValidationWave0 | null;
  manual: ValidationManual | null;
  signoff: ValidationSignoff | null;
  extras: ValidationExtra[];
  sections: ValidationSection[];
  /** Text before the first `##` other than the H1 and horizontal rules. */
  preamble: boolean;
  /** HTML comments the body carried (removed before parsing). */
  commentCount: number;
}

// ---------------------------------------------------------------------------
// Caps and line helpers
// ---------------------------------------------------------------------------

const MAX_ROWS = 2000;
const MAX_CELL = 2000;
const MAX_ITEMS = 500;
const MAX_HEADING = 300;
const MAX_TEXT = 2000;

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
  return text.split('**').join('').split('`').join('').trim();
}

/** `**bold**` and `*italic*` markers removed from a short cell, for matching and short labels. */
function stripStars(text: string): string {
  return text.split('*').join('').trim();
}

function clipText(text: string): string {
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;
}

function isRuleLine(trimmed: string): boolean {
  if (trimmed.length < 3) return false;
  const ch = trimmed[0];
  if (ch !== '-' && ch !== '*' && ch !== '_') return false;
  for (const c of trimmed) if (c !== ch && c !== ' ') return false;
  return true;
}

/** Horizontal-rule lines outside a fence removed, so a trailing `---` is not a paragraph. */
function withoutRules(text: string): string {
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
    if (isRuleLine(trimmed)) continue;
    out.push(line);
  }
  return out.join('\n');
}

/** `###`–`######` heading lines outside a fence become one bold line, then parsed to blocks. */
function toBlocks(text: string): Block[] {
  const source = withoutRules(text);
  if (source.trim() === '') return [];
  const out: string[] = [];
  let fence: Fence | null = null;
  for (const line of source.split('\n')) {
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

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return false;
  let dashes = 0;
  for (const ch of trimmed) {
    if (ch === '-') dashes += 1;
    else if (ch !== '|' && ch !== ':' && ch !== ' ' && ch !== '\t') return false;
  }
  return dashes > 0;
}

interface ParsedTable {
  head: string[];
  rows: string[][];
  before: string;
  after: string;
}

/** The first header line followed by a separator line (outside a fence); the rows run to the first
 * non-pipe line. A row with fewer cells than headers is padded with empty strings. */
function findTable(body: string): ParsedTable | null {
  const lines = body.split('\n');
  let fence: Fence | null = null;
  let start = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    const trimmed = lines[i].trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      continue;
    }
    if (trimmed.startsWith('|') && isSeparatorLine(lines[i + 1])) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const clipCell = (cell: string): string => (cell.length > MAX_CELL ? cell.slice(0, MAX_CELL) : cell);
  const head = splitRow(lines[start]).map(clipCell);
  const rows: string[][] = [];
  let k = start + 2;
  while (k < lines.length && lines[k].trim().startsWith('|')) {
    if (rows.length < MAX_ROWS) {
      const cells = splitRow(lines[k]).map(clipCell);
      while (cells.length < head.length) cells.push('');
      rows.push(cells);
    }
    k += 1;
  }
  return {
    head,
    rows,
    before: lines.slice(0, start).join('\n').trim(),
    after: lines.slice(k).join('\n').trim(),
  };
}

/** Index of the first header whose bold-stripped text satisfies `test`, else -1. */
function column(head: string[], test: (header: string) => boolean): number {
  return head.findIndex((h) => test(stripStars(h).toLowerCase()));
}

function splitList(text: string | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const part of text.split(',')) {
    const item = part.trim();
    if (item === '') continue;
    const lower = item.toLowerCase();
    if (item === '—' || item === '-' || lower === 'n/a') continue;
    out.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bullets
// ---------------------------------------------------------------------------

interface BulletScan {
  items: ValidationWave0Item[];
  lead: string;
  tail: string;
}

function leadingSpaces(line: string): number {
  let n = 0;
  while (n < line.length && (line[n] === ' ' || line[n] === '\t')) n += 1;
  return n;
}

/** Port of gen-data's `bullets`: a `- ` / `* ` line with fewer than four leading spaces starts an
 * item (an optional `[ ]` / `[x]` box); a line indented two or more spaces continues the last item;
 * other lines are the lead (before the first item) or the tail. */
function scanBullets(body: string): BulletScan {
  const items: ValidationWave0Item[] = [];
  const lead: string[] = [];
  const tail: string[] = [];
  let fence: Fence | null = null;
  for (const raw of body.split('\n')) {
    const trimmed = raw.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      (items.length > 0 ? tail : lead).push(raw);
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      (items.length > 0 ? tail : lead).push(raw);
      continue;
    }
    const indent = leadingSpaces(raw);
    const marker = raw[indent];
    if ((marker === '-' || marker === '*') && (raw[indent + 1] === ' ' || raw[indent + 1] === '\t') && indent < 4) {
      let text = raw.slice(indent + 2).trim();
      let box = false;
      let checked = false;
      if (text.length >= 3 && text[0] === '[' && text[2] === ']' && (text[1] === ' ' || text[1] === 'x' || text[1] === 'X')) {
        box = true;
        checked = text[1] !== ' ';
        text = text.slice(3).trim();
      }
      if (items.length < MAX_ITEMS) items.push({ text: clipText(text), box, checked });
      continue;
    }
    if (indent >= 2 && trimmed !== '' && items.length > 0) {
      const last = items[items.length - 1];
      if (last.text.length < MAX_TEXT) last.text = clipText(`${last.text} ${trimmed}`);
      continue;
    }
    (items.length > 0 ? tail : lead).push(raw);
  }
  return { items, lead: lead.join('\n').trim(), tail: tail.join('\n').trim() };
}

// ---------------------------------------------------------------------------
// Cell classifiers
// ---------------------------------------------------------------------------

const MARK_GREEN = '✅';
const MARK_RED = '❌';
const MARK_WARN = '⚠';
const MARK_PENDING = '⬜';
const VS16 = '️';

function wordsOf(text: string): string[] {
  return text.toLowerCase().split(/[^a-z]+/);
}

function statusOf(cell: string): ValidationRowStatus {
  if (cell.trim() === '') return 'none';
  const words = wordsOf(cell);
  if (cell.includes(MARK_PENDING) || words.includes('pending')) return 'pending';
  if (cell.includes(MARK_GREEN) || words.includes('green')) return 'green';
  if (cell.includes(MARK_RED) || words.includes('red')) return 'red';
  if (cell.includes(MARK_WARN) || words.includes('flaky')) return 'flaky';
  return 'none';
}

function stripLeadingMark(text: string, mark: string): string {
  let rest = text.slice(mark.length);
  if (rest.startsWith(VS16)) rest = rest.slice(1);
  return rest.trim();
}

function fileOf(cell: string): { kind: ValidationFileKind; note: string } {
  const text = cell.trim();
  if (text === '') return { kind: 'unknown', note: '' };
  if (text.toLowerCase() === 'n/a') return { kind: 'na', note: '' };
  if (text.startsWith(MARK_GREEN)) return { kind: 'yes', note: stripLeadingMark(text, MARK_GREEN) };
  if (text.startsWith(MARK_RED)) return { kind: 'create', note: stripLeadingMark(text, MARK_RED) };
  if (text.startsWith(MARK_WARN)) return { kind: 'extend', note: stripLeadingMark(text, MARK_WARN) };
  return { kind: 'unknown', note: text };
}

function testKindOf(raw: string, command: string): ValidationTestKind {
  const type = raw.toLowerCase();
  if (type !== '') {
    if (type.includes('manual') || type.includes('checkpoint')) return 'manual';
    if (type.includes('integration')) return 'integration';
    if (type.includes('unit')) return 'unit';
    if (type.includes('build')) return 'build';
    if (type.includes('e2e')) return 'e2e';
    return 'auto';
  }
  const cmd = command.toLowerCase();
  if (cmd.includes('checkpoint') || cmd.includes('manual') || cmd.includes('browser protocol') || cmd.includes('evidence')) {
    return 'manual';
  }
  if ((cmd.includes('build') || cmd.includes('lint')) && !cmd.includes('test')) return 'build';
  return 'auto';
}

function hasBraceToken(text: string): boolean {
  const open = text.indexOf('{');
  if (open === -1) return false;
  return /\{[A-Za-z]+\}/.test(text.length > MAX_CELL * 3 ? text.slice(0, MAX_CELL * 3) : text);
}

/** "02-08" -> "08", "01-01" -> "01", "07" -> "07" (a leading phase group before a digit stripped). */
function planOf(cell: string): string {
  const text = cell.trim();
  let i = 0;
  while (i < text.length && text[i] >= '0' && text[i] <= '9') i += 1;
  if (i > 0 && text[i] === '-' && text[i + 1] >= '0' && text[i + 1] <= '9') return text.slice(i + 1);
  return text;
}

/** The second number group of a `P-NN-TT` task id ("04-07-01" -> "07"), or ''. */
function planFromId(id: string): string {
  const parts = id.trim().split('-');
  if (parts.length < 3) return '';
  const [a, b] = parts;
  const digits = (s: string): boolean => s.length > 0 && [...s].every((c) => c >= '0' && c <= '9');
  return digits(a) && digits(b) ? b : '';
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function parseInfra(heading: string, body: string): ValidationInfra | null {
  const table = findTable(body);
  if (table === null) return null;
  const rows: ValidationInfraRow[] = [];
  for (const cells of table.rows) {
    const key = stripStars(cells[0] ?? '');
    const value = cells.slice(1).filter((c) => c !== '').join(' · ');
    if (key === '' && value === '') continue;
    rows.push({ key, value });
  }
  return { heading, rows, lead: toBlocks(table.before), tail: toBlocks(table.after) };
}

function parseSampling(heading: string, body: string): ValidationSampling {
  const scan = scanBullets(body);
  const steps: ValidationSamplingStep[] = scan.items.map((item) => {
    const text = item.text;
    if (text.startsWith('**')) {
      const close = text.indexOf('**', 2);
      if (close > 2) {
        let when = text.slice(2, close).trim();
        if (when.endsWith(':')) when = when.slice(0, -1).trim();
        let what = text.slice(close + 2).trim();
        if (what.startsWith(':')) what = what.slice(1).trim();
        if (when !== '') return { when, what };
      }
    }
    return { when: null, what: text };
  });
  return { heading, lead: toBlocks(scan.lead), steps, tail: toBlocks(scan.tail) };
}

function isItalicLegend(trimmed: string): boolean {
  if (trimmed.length < 3) return false;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (!((first === '*' && last === '*') || (first === '_' && last === '_'))) return false;
  if (trimmed.startsWith('**')) return false;
  const lower = trimmed.toLowerCase();
  return lower.includes('status:') || lower.includes('planner populates');
}

function stripBlockquote(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (!trimmed.startsWith('>')) return line;
      const rest = trimmed.slice(1);
      return rest.startsWith(' ') ? rest.slice(1) : rest;
    })
    .join('\n');
}

function parseMap(heading: string, body: string): ValidationMap | null {
  const table = findTable(body);
  if (table === null) return null;
  const head = table.head;
  const iId = column(head, (h) => h.startsWith('task'));
  const iPlan = column(head, (h) => h === 'plan');
  const iWave = column(head, (h) => h.startsWith('wave'));
  const iReq = column(head, (h) => h.startsWith('requirement'));
  const iThreat = column(head, (h) => h.includes('threat'));
  const iBehavior = column(head, (h) => h.includes('behavior') || h.includes('behaviour'));
  const iType = column(head, (h) => h.includes('test type'));
  const iCommand = column(head, (h) => h.includes('command') || h === 'verification');
  const iFile = column(head, (h) => h.includes('file exists'));
  const iStatus = column(head, (h) => h.startsWith('status'));
  const iPrereq = column(head, (h) => h.includes('prerequisite'));
  const cell = (cells: string[], at: number): string => (at >= 0 ? (cells[at] ?? '') : '');

  const rows: ValidationTaskRow[] = table.rows.map((cells, index) => {
    const id = cell(cells, iId);
    const command = cell(cells, iCommand);
    const typeRaw = cell(cells, iType);
    const file = iFile >= 0 ? fileOf(cell(cells, iFile)) : { kind: 'unknown' as ValidationFileKind, note: '' };
    const statusRaw = cell(cells, iStatus);
    return {
      index,
      id,
      plan: iPlan >= 0 ? planOf(cell(cells, iPlan)) : planFromId(id),
      wave: cell(cells, iWave).trim(),
      requirements: splitList(cell(cells, iReq)),
      threats: splitList(cell(cells, iThreat)),
      behavior: cell(cells, iBehavior),
      testTypeRaw: typeRaw,
      testKind: testKindOf(typeRaw, command),
      command,
      fileKind: file.kind,
      fileNote: file.note,
      status: iStatus >= 0 ? statusOf(statusRaw) : 'none',
      statusRaw,
      prerequisite: cell(cells, iPrereq),
    };
  });

  const legend: string[] = [];
  const notes: string[] = [];
  let fence: Fence | null = null;
  for (const line of table.after.split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceCloses(trimmed, fence)) fence = null;
      notes.push(line);
      continue;
    }
    const opened = fenceOpener(trimmed);
    if (opened) {
      fence = opened;
      notes.push(line);
      continue;
    }
    if (isItalicLegend(trimmed)) {
      legend.push(stripStars(trimmed.replace(/^_+|_+$/g, '')));
      continue;
    }
    notes.push(line);
  }

  const template =
    rows.length > 0 &&
    rows.every((row) => hasBraceToken(`${row.id} ${row.command} ${row.requirements.join(' ')}`));

  return {
    heading,
    columns: head.map((h) => stripStars(h)),
    rows,
    preface: toBlocks(stripBlockquote(table.before)),
    notes: toBlocks(notes.join('\n')),
    legend,
    template,
  };
}

function parseWave0(heading: string, body: string): ValidationWave0 {
  const scan = scanBullets(body);
  return { heading, lead: toBlocks(scan.lead), items: scan.items, tail: toBlocks(scan.tail) };
}

function parseManual(heading: string, body: string): ValidationManual {
  const table = findTable(body);
  if (table === null) {
    return { heading, lead: [], tail: [], rows: [], prose: toBlocks(body) };
  }
  const head = table.head;
  const iBehavior = Math.max(
    column(head, (h) => h.includes('behavior') || h.includes('behaviour') || h.startsWith('gate')),
    0,
  );
  const iReq = column(head, (h) => h.includes('requirement'));
  const iWhy = column(head, (h) => h.includes('why'));
  const iHow = column(head, (h) => h.includes('instruction'));
  const iObserved = column(head, (h) => h.includes('observed'));
  const iOutcome = column(head, (h) => h.includes('outcome'));
  const rows: ValidationManualRow[] = table.rows.map((cells) => ({
    behavior: cells[iBehavior] ?? '',
    requirements: splitList(iReq >= 0 ? (cells[iReq] ?? '').split('/').join(',') : ''),
    why: iWhy >= 0 ? (cells[iWhy] ?? '') : '',
    how: iHow >= 0 ? (cells[iHow] ?? '') : '',
    observed: iObserved >= 0 ? (cells[iObserved] ?? '') : null,
    outcome: iOutcome >= 0 ? (cells[iOutcome] ?? '') : null,
  }));
  return { heading, lead: toBlocks(table.before), tail: toBlocks(table.after), rows, prose: null };
}

function parseSignoff(heading: string, body: string): ValidationSignoff {
  let approval: string | null = null;
  const remaining: string[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (approval === null && trimmed.toLowerCase().startsWith('**approval')) {
      const close = trimmed.indexOf('**', 2);
      if (close > 2) {
        let rest = trimmed.slice(close + 2).trim();
        if (rest.startsWith(':')) rest = rest.slice(1).trim();
        approval = clipText(rest);
        continue;
      }
    }
    remaining.push(line);
  }
  const scan = scanBullets(remaining.join('\n'));
  const lead = scan.lead === '' ? '' : `${scan.lead}\n\n`;
  return {
    heading,
    items: scan.items.map((item) => ({ text: item.text, checked: item.checked })),
    approval,
    extra: toBlocks(`${lead}${scan.tail}`),
  };
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

function emptyStrategy(): ValidationStrategy {
  return {
    infra: null,
    sampling: null,
    map: null,
    wave0: null,
    manual: null,
    signoff: null,
    extras: [],
    sections: [],
    preamble: false,
    commentCount: 0,
  };
}

function hasPreamble(text: string): boolean {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || isRuleLine(trimmed)) continue;
    if (trimmed[0] === '#' && trimmed[1] === ' ') continue;
    return true;
  }
  return false;
}

/** The tolerant VALIDATION projection. Pure; never throws on any string. */
export function extractValidationStrategy(rawBody: string): ValidationStrategy {
  const strategy = emptyStrategy();
  const body = typeof rawBody === 'string' ? rawBody : '';
  const stripped = stripComments(body);
  strategy.commentCount = stripped.count;
  const { preamble, sections } = splitWithPreamble(stripped.text, 2);
  strategy.preamble = hasPreamble(preamble);
  for (const section of sections) {
    const heading = plain(section.heading.slice(0, MAX_HEADING));
    const key = heading.toLowerCase();
    const text = withoutRules(section.body);
    let claimed = false;
    if (key.startsWith('test infrastructure') && strategy.infra === null) {
      strategy.infra = parseInfra(heading, text);
      claimed = strategy.infra !== null;
    } else if (key.startsWith('sampling') && strategy.sampling === null) {
      strategy.sampling = parseSampling(heading, text);
      claimed = true;
    } else if (key.includes('verification map') && strategy.map === null) {
      strategy.map = parseMap(heading, text);
      claimed = strategy.map !== null;
    } else if (key.startsWith('wave 0') && strategy.wave0 === null) {
      strategy.wave0 = parseWave0(heading, text);
      claimed = true;
    } else if (key.startsWith('manual') && strategy.manual === null) {
      strategy.manual = parseManual(heading, text);
      claimed = true;
    } else if ((key.includes('sign-off') || key.includes('signoff')) && strategy.signoff === null) {
      strategy.signoff = parseSignoff(heading, text);
      claimed = true;
    }
    if (!claimed) strategy.extras.push({ heading, blocks: toBlocks(text) });
    strategy.sections.push({ heading, claimed });
  }
  return strategy;
}
