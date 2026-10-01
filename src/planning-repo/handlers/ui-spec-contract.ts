// The UI-SPEC.md design-contract projection (quick-261001-qk6, sketch 014 winner): a tolerant,
// fence-aware, line-scanned read of a UI design contract into `UiSpecContract` — the frontmatter
// facts as written, the title and tagline, the Design System rows, the Spacing / Typography / Color
// tables with the colour "reserved for" lists, the UI Considerations grouped by element, the
// Registry Safety table, the Checker Sign-Off dimensions and approval, and a section ledger so the
// composer can prove nothing was dropped silently. Everything else (Copywriting Contract, the
// phase-specific chapters, Layout, Motion, ...) is left for Source mode and only listed in the
// ledger.
// T-qk6-01 discipline: every regex here is applied to one bounded line (or one bounded cell) at a
// time — never a whole-document regex, never a nested unbounded quantifier — and every line is
// clipped to MAX_LINE characters up front (by `splitWithPreamble`) so one pathological line cannot
// make any scan expensive. Table rows are split by the linear `splitRow` character scan and every
// cell is clipped to MAX_CELL. `extractUiSpec` is pure (no fs access) and never throws;
// `UiSpecHandler.parse` still wraps it in try/catch (T-qk6-05).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';
import { splitRow } from './pattern-map.ts';
import { splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface UiSpecMeta {
  phase: string | null;
  slug: string | null;
  status: string | null;
  created: string | null;
  shadcnInitialized: string | null;
  preset: string | null;
}

export interface UiSpecKv {
  key: string;
  value: string;
}

export interface UiSpecTable {
  head: string[];
  rows: string[][];
  /** The rest of the section as prose blocks (fenced code dropped). */
  prose: Block[];
}

export type UiSpecStatus = 'covered' | 'backstop' | 'unresolved' | 'dismissed';

export interface UiSpecConsiderationRow {
  cats: string[];
  label: string;
  status: UiSpecStatus;
  tag: string | null;
  /** The element cell as written, for rows of a flat table; `null` for an `### E#` subsection row. */
  target: string | null;
  note: string;
}

export interface UiSpecElement {
  key: string;
  code: string | null;
  name: string;
  kinds: string | null;
  rows: UiSpecConsiderationRow[];
}

export interface UiSpecConsiderations {
  /** The lift-rule blockquote at the head of the section, joined. */
  quote: string | null;
  /** The remaining preamble prose, without the author's count line. */
  intro: Block[];
  /** The author's count, as written. */
  coverage: string | null;
  elements: UiSpecElement[];
  /** Every other `###` title in the section. */
  notes: string[];
  /** HTML comments inside the section (the status vocabulary). */
  comments: string[];
}

export type UiSpecVerdict = 'PASS' | 'FLAG' | 'BLOCK' | 'FAIL' | 'PENDING';

export interface UiSpecDimension {
  n: number;
  name: string;
  checked: boolean;
  verdict: UiSpecVerdict | null;
  qual: string | null;
  note: string;
}

export interface UiSpecSignoff {
  dims: UiSpecDimension[];
  approval: string | null;
  /** True when prose remains after the dimensions and the approval. */
  hasNotes: boolean;
}

export interface UiSpecSection {
  heading: string;
  claimed: boolean;
}

export interface UiSpecContract {
  meta: UiSpecMeta;
  title: string | null;
  tagline: string | null;
  scope: Block[];
  designSystem: UiSpecKv[] | null;
  spacing: UiSpecTable | null;
  typography: UiSpecTable | null;
  color: UiSpecTable | null;
  /** "Accent … reserved for" / "Destructive … reserved for" lists from the Color prose, by lower-case key. */
  reserved: Record<string, string[]>;
  considerations: UiSpecConsiderations | null;
  registry: UiSpecTable | null;
  signoff: UiSpecSignoff | null;
  sections: UiSpecSection[];
}

// ---------------------------------------------------------------------------
// Bounds and line-level helpers
// ---------------------------------------------------------------------------

const MAX_LINE = 8000;
const MAX_CELL = 2000;
const MAX_TABLE_ROWS = 400;
const MAX_ELEMENTS = 200;
const MAX_FRONTMATTER_LINES = 200;
const MAX_COMMENT_LINES = 200;

const CATS = ['empty', 'loading', 'error', 'populated', 'partial', 'overflow', 'zero-one-many', 'long-text'];

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\*/g, '').trim();
}

function stripQuotes(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) return v.slice(1, -1);
  return v;
}

function isFenceLine(trimmed: string): boolean {
  return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

function isRuleLine(trimmed: string): boolean {
  if (trimmed.length < 3) return false;
  for (const ch of trimmed) if (ch !== '-') return false;
  return true;
}

function isSeparatorLine(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('|')) return false;
  let dash = false;
  for (const ch of t) {
    if (ch === '-') dash = true;
    else if (ch !== '|' && ch !== ':' && ch !== ' ') return false;
  }
  return dash;
}

/** Removes `<!-- … -->` spans that start a line (at most MAX_COMMENT_LINES long) and returns their
 * text. An unclosed comment is left in place. Fenced code is never touched. */
function stripComments(lines: string[]): { lines: string[]; comments: string[] } {
  const out: string[] = [];
  const comments: string[] = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (isFenceLine(trimmed)) fenced = !fenced;
    if (!fenced && trimmed.startsWith('<!--')) {
      let end = -1;
      for (let j = i; j < lines.length && j < i + MAX_COMMENT_LINES; j++) {
        if (lines[j].includes('-->')) {
          end = j;
          break;
        }
      }
      if (end !== -1) {
        const text = lines
          .slice(i, end + 1)
          .join('\n')
          .trim();
        const inner = text.slice(4, text.lastIndexOf('-->')).trim();
        if (inner !== '') comments.push(inner);
        i = end;
        continue;
      }
    }
    out.push(line);
  }
  return { lines: out, comments };
}

interface ScannedTable {
  start: number;
  end: number;
  head: string[];
  rows: string[][];
}

function cellsOf(line: string): string[] {
  return splitRow(line).map((c) => clip(c, MAX_CELL));
}

/** Every GFM table in `lines` (fence-aware), in order. */
function findTables(lines: string[]): ScannedTable[] {
  const tables: ScannedTable[] = [];
  let fenced = false;
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (isFenceLine(trimmed)) {
      fenced = !fenced;
      i += 1;
      continue;
    }
    if (!fenced && trimmed.startsWith('|') && i + 1 < lines.length && isSeparatorLine(lines[i + 1])) {
      const head = cellsOf(lines[i]);
      let j = i + 2;
      const rows: string[][] = [];
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        if (rows.length < MAX_TABLE_ROWS) rows.push(cellsOf(lines[j]));
        j += 1;
      }
      tables.push({ start: i, end: j, head, rows });
      i = j;
      continue;
    }
    i += 1;
  }
  return tables;
}

function withoutRanges(lines: string[], tables: ScannedTable[]): string[] {
  if (tables.length === 0) return lines;
  const out: string[] = [];
  let t = 0;
  for (let i = 0; i < lines.length; i++) {
    while (t < tables.length && i >= tables[t].end) t += 1;
    if (t < tables.length && i >= tables[t].start && i < tables[t].end) continue;
    out.push(lines[i]);
  }
  return out;
}

/** Prose blocks of `lines`: horizontal rules dropped, fenced code dropped. */
function proseOf(lines: string[]): Block[] {
  const kept: string[] = [];
  let fenced = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (isFenceLine(trimmed)) {
      fenced = !fenced;
      kept.push(line);
      continue;
    }
    if (!fenced && isRuleLine(trimmed)) continue;
    kept.push(line);
  }
  return parseBlocks(kept.join('\n')).filter((block) => block.kind !== 'code');
}

function linesOf(body: string): string[] {
  return body.split('\n').map((l) => clip(l.endsWith('\r') ? l.slice(0, -1) : l, MAX_LINE));
}

/** The first table of a section plus the rest of the section as prose. */
function tableSection(lines: string[]): { table: UiSpecTable | null; rest: string[] } {
  const tables = findTables(lines);
  if (tables.length === 0) return { table: null, rest: lines };
  const first = tables[0];
  const rest = withoutRanges(lines, [first]);
  return { table: { head: first.head, rows: first.rows, prose: proseOf(rest) }, rest };
}

// ---------------------------------------------------------------------------
// Frontmatter and preamble
// ---------------------------------------------------------------------------

function readFrontmatter(lines: string[]): { meta: UiSpecMeta; bodyStart: number; status: string } {
  const meta: UiSpecMeta = { phase: null, slug: null, status: null, created: null, shadcnInitialized: null, preset: null };
  if (lines.length === 0 || lines[0].trim() !== '---') return { meta, bodyStart: 0, status: '' };
  let end = -1;
  for (let i = 1; i < lines.length && i <= MAX_FRONTMATTER_LINES; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { meta, bodyStart: 0, status: '' };
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    const value = stripQuotes(line.slice(colon + 1));
    if (value === '') continue;
    if (key === 'phase') meta.phase = value;
    else if (key === 'slug') meta.slug = value;
    else if (key === 'status') meta.status = value;
    else if (key === 'created') meta.created = value;
    else if (key === 'shadcn_initialized') meta.shadcnInitialized = value;
    else if (key === 'preset') meta.preset = value;
  }
  return { meta, bodyStart: end + 1, status: meta.status ?? '' };
}

function readPreamble(preamble: string): { title: string | null; tagline: string | null; scope: Block[] } {
  const lines = linesOf(preamble);
  let titleIndex = -1;
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (isFenceLine(trimmed)) fenced = !fenced;
    if (!fenced && lines[i].startsWith('# ') && lines[i].slice(2).trim() !== '') {
      titleIndex = i;
      break;
    }
  }
  const title = titleIndex === -1 ? null : clip(plain(lines[titleIndex].slice(2)), 300);
  let i = titleIndex + 1;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  const quote: string[] = [];
  const quoteStart = i;
  while (i < lines.length && lines[i].trim().startsWith('>')) {
    const text = lines[i].trim().slice(1).trim();
    if (text !== '') quote.push(text);
    i += 1;
  }
  const hadQuote = i > quoteStart;
  const tagline = hadQuote && quote.length > 0 ? quote.join(' ') : null;
  const scopeLines = lines.filter((_, index) => index !== titleIndex && !(hadQuote && index >= quoteStart && index < i));
  const stripped = stripComments(scopeLines).lines;
  return { title, tagline, scope: proseOf(stripped) };
}

// ---------------------------------------------------------------------------
// UI Considerations
// ---------------------------------------------------------------------------

function statusOf(raw: string): UiSpecStatus {
  const s = raw.replace(/[*_`]/g, '').toLowerCase();
  if (s.includes('dismiss') || s.includes('n/a')) return 'dismissed';
  if (s.includes('backstop')) return 'backstop';
  if (s.includes('unresolved') || s.includes('⚠')) return 'unresolved';
  if (s.includes('covered') || s.includes('resolved') || s.includes('✅')) return 'covered';
  return 'unresolved';
}

function categoryOf(raw: string): { cats: string[]; label: string } {
  const s = raw.replace(/[*_`]/g, '').toLowerCase().trim();
  const hit = CATS.filter((c) => s.includes(c));
  return { cats: hit.length > 0 ? hit : ['other'], label: raw.replace(/[`*]/g, '').trim() };
}

function tagOf(raw: string): string | null {
  const start = raw.indexOf('(P-');
  if (start === -1) return null;
  const end = raw.indexOf(')', start);
  if (end === -1) return null;
  const tag = raw.slice(start + 1, end);
  for (let i = 2; i < tag.length; i++) if (tag[i] < '0' || tag[i] > '9') return null;
  return tag.length > 2 ? tag : null;
}

/** `E12` at the very start of `text` (followed by a non-digit), or null. */
function leadingCode(text: string, loose = false): { code: string; rest: string } | null {
  if (text[0] !== 'E') return null;
  let i = 1;
  while (i < text.length && text[i] >= '0' && text[i] <= '9') i += 1;
  if (i === 1 || i > 4) return null;
  const next = text[i];
  if (!loose && next !== undefined && next !== ' ' && next !== '—' && next !== '–' && next !== '-' && next !== ':' && next !== '/') return null;
  return { code: text.slice(0, i), rest: text.slice(i) };
}

function isKindToken(item: string): boolean {
  const t = item.replace(/`/g, '').trim();
  if (t === '' || t.length > 40) return false;
  for (const ch of t) if (!((ch >= 'a' && ch <= 'z') || ch === '-')) return false;
  return true;
}

/** A trailing `(a, b, c)` whose every item is a lower-case kebab token reads as kinds. */
function splitKinds(text: string): { name: string; kinds: string | null } {
  const t = text.trim();
  if (!t.endsWith(')')) return { name: t, kinds: null };
  const open = t.lastIndexOf('(');
  if (open <= 0) return { name: t, kinds: null };
  const items = t
    .slice(open + 1, -1)
    .split(',')
    .map((x) => x.trim());
  if (items.length === 0 || !items.every(isKindToken)) return { name: t, kinds: null };
  return { name: t.slice(0, open).trim(), kinds: items.map((x) => x.replace(/`/g, '')).join(', ') };
}

/** An element cell of a flat table: its code (from a leading `E#` token or an `(E#…)`
 * parenthetical), its name with parentheticals and a trailing " — note" removed, and its kinds. */
function elementOfCell(raw: string): { code: string | null; name: string; kinds: string | null } {
  const text = raw.replace(/`/g, '').trim();
  let code: string | null = null;
  let body = text;
  const lead = leadingCode(text);
  if (lead) {
    code = lead.code;
    body = lead.rest.replace(/^[\s—–:/-]+/, '');
  } else {
    const open = text.indexOf('(E');
    if (open !== -1) {
      const close = text.indexOf(')', open);
      if (close !== -1) {
        const inner = text.slice(open + 1, close);
        const m = leadingCode(inner, true);
        if (m) code = m.code;
      }
    }
  }
  const split = splitKinds(body);
  let name = split.name;
  // Remove remaining parentheticals (a linear scan, no backtracking).
  let cleaned = '';
  let depth = 0;
  for (const ch of name) {
    if (ch === '(') depth += 1;
    else if (ch === ')' && depth > 0) depth -= 1;
    else if (depth === 0) cleaned += ch;
  }
  name = cleaned.replace(/\s+/g, ' ').trim();
  const dash = name.indexOf(' — ');
  if (dash !== -1) name = name.slice(0, dash).trim();
  return { code, name: name === '' ? text.slice(0, 80) : name, kinds: split.kinds };
}

function lowerHead(table: ScannedTable): string[] {
  return table.head.map((h) => plain(h).toLowerCase());
}

function colIndex(head: string[], test: (h: string) => boolean): number {
  return head.findIndex(test);
}

function isConsiderationTable(head: string[]): boolean {
  return (
    colIndex(head, (h) => h.includes('category') || h.includes('consideration')) !== -1 &&
    colIndex(head, (h) => h.includes('status')) !== -1
  );
}

function pushRows(table: ScannedTable, target: UiSpecElement | null, elements: UiSpecElement[]): void {
  const head = lowerHead(table);
  const ci = colIndex(head, (h) => h.includes('category') || h.includes('consideration'));
  const si = colIndex(head, (h) => h.includes('status'));
  const ei = colIndex(head, (h) => h.includes('element'));
  const ri = colIndex(head, (h) => h.includes('resolution') || h.includes('truth') || h.includes('reason'));
  for (const r of table.rows) {
    const cat = categoryOf(r[ci] ?? '');
    const statusCell = r[si] ?? '';
    const row: UiSpecConsiderationRow = {
      cats: cat.cats,
      label: cat.label,
      status: statusOf(statusCell),
      tag: tagOf(statusCell),
      target: null,
      note: r[ri] ?? '',
    };
    if (target) {
      target.rows.push(row);
      continue;
    }
    const raw = (r[ei] ?? '').replace(/`/g, '').trim();
    const el = elementOfCell(raw);
    const key = el.code ?? el.name.toLowerCase();
    let group = elements.find((e) => e.key === key);
    if (!group) {
      if (elements.length >= MAX_ELEMENTS) continue;
      group = { key, code: el.code, name: el.name, kinds: el.kinds, rows: [] };
      elements.push(group);
    } else if (group.kinds === null && el.kinds !== null) group.kinds = el.kinds;
    row.target = raw;
    group.rows.push(row);
  }
}

function elementHeading(heading: string): { code: string; name: string } | null {
  const text = clip(heading, 300);
  const lead = leadingCode(text);
  if (!lead) return null;
  const rest = lead.rest.trimStart();
  const dash = rest[0];
  if (dash !== '—' && dash !== '–' && dash !== '-') return null;
  const name = rest.slice(1).trim();
  return name === '' ? null : { code: lead.code, name };
}

function kindsLine(lines: string[]): string | null {
  for (const line of lines) {
    const at = line.indexOf('Element kinds');
    if (at === -1) continue;
    const colon = line.indexOf(':', at);
    if (colon === -1) continue;
    const value = plain(line.slice(colon + 1));
    if (value !== '') return clip(value, 300);
  }
  return null;
}

/** The author's count — the bold "N applicable …" span, else "Resolved: **…**", else the
 * "Applicable state considerations resolved:" line — and the index of the line it came from. */
function coverageOf(lines: string[]): { text: string; line: number } | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = line.indexOf('**');
    if (open === -1) continue;
    const close = line.indexOf('**', open + 2);
    if (close === -1) continue;
    let inner = line.slice(open + 2, close).trim();
    if (inner.startsWith('Coverage:')) inner = inner.slice('Coverage:'.length).trim();
    let k = 0;
    while (k < inner.length && inner[k] >= '0' && inner[k] <= '9') k += 1;
    if (k > 0 && inner.slice(k).startsWith(' applicable')) return { text: clip(inner, 300), line: i };
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const at = line.indexOf('Resolved:');
    if (at === -1) continue;
    const open = line.indexOf('**', at);
    const close = open === -1 ? -1 : line.indexOf('**', open + 2);
    if (open !== -1 && close !== -1) return { text: clip(line.slice(open + 2, close).trim(), 300), line: i };
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = 'Applicable state considerations resolved:';
    const at = line.indexOf(marker);
    if (at === -1) continue;
    const after = line.slice(at + marker.length).trim();
    const open = after.indexOf('**');
    const close = open === -1 ? -1 : after.indexOf('**', open + 2);
    const text = open !== -1 && close !== -1 ? after.slice(open + 2, close).trim() : plain(after);
    if (text !== '') return { text: clip(text, 300), line: i };
  }
  // Last resort: a prose line that states "N applicable …" without bold.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const at = line.indexOf(' applicable');
    if (at < 1) continue;
    let start = at;
    while (start > 0 && line[start - 1] >= '0' && line[start - 1] <= '9') start -= 1;
    if (start === at) continue;
    return { text: clip(plain(line.slice(start)), 300), line: i };
  }
  return null;
}

function readConsiderations(body: string): UiSpecConsiderations {
  const stripped = stripComments(linesOf(body));
  const split = splitWithPreamble(stripped.lines.join('\n'), 3);
  const preLines = linesOf(split.preamble);

  // The lift-rule blockquote at the head of the section.
  let i = 0;
  while (i < preLines.length && preLines[i].trim() === '') i += 1;
  const quoteLines: string[] = [];
  const quoteStart = i;
  while (i < preLines.length && preLines[i].trim().startsWith('>')) {
    const text = preLines[i].trim().slice(1).trim();
    if (text !== '') quoteLines.push(text);
    i += 1;
  }
  const quote = i > quoteStart && quoteLines.length > 0 ? quoteLines.join(' ') : null;
  const afterQuote = preLines.slice(i);

  const elements: UiSpecElement[] = [];
  const kindsByCode = new Map<string, string>();
  const preTables = findTables(afterQuote);
  const consumed: ScannedTable[] = [];
  for (const table of preTables) {
    const head = lowerHead(table);
    if (isConsiderationTable(head)) {
      pushRows(table, null, elements);
      consumed.push(table);
    } else if (colIndex(head, (h) => h.includes('element')) !== -1 && colIndex(head, (h) => h.includes('kinds')) !== -1) {
      const ei = colIndex(head, (h) => h.includes('element'));
      const ki = colIndex(head, (h) => h.includes('kinds'));
      for (const row of table.rows) {
        const el = elementOfCell(row[ei] ?? '');
        const kinds = plain(row[ki] ?? '');
        if (el.code && kinds !== '') kindsByCode.set(el.code, clip(kinds, 300));
      }
      consumed.push(table);
    }
  }
  const introLines = withoutRanges(afterQuote, consumed);
  const coverage = coverageOf(introLines);
  const introWithoutCount = coverage ? introLines.filter((_, index) => index !== coverage.line) : introLines;

  const notes: string[] = [];
  for (const section of split.sections) {
    const named = elementHeading(section.heading);
    const lines = linesOf(section.body);
    const tables = findTables(lines);
    const usable = tables.find((t) => isConsiderationTable(lowerHead(t)));
    if (named && usable) {
      const parsed = splitKinds(clip(named.name, 300).replace(/`/g, ''));
      let el = elements.find((e) => e.key === named.code);
      if (!el) {
        if (elements.length >= MAX_ELEMENTS) continue;
        el = { key: named.code, code: named.code, name: parsed.name === '' ? named.name : parsed.name, kinds: null, rows: [] };
        elements.push(el);
      }
      el.kinds = el.kinds ?? parsed.kinds ?? kindsLine(lines);
      pushRows(usable, el, elements);
    } else {
      notes.push(clip(plain(section.heading), 200));
    }
  }
  for (const el of elements) {
    if (el.kinds === null && el.code && kindsByCode.has(el.code)) el.kinds = kindsByCode.get(el.code) ?? null;
  }

  return {
    quote,
    intro: proseOf(introWithoutCount),
    coverage: coverage ? coverage.text : null,
    elements,
    notes,
    comments: stripped.comments,
  };
}

// ---------------------------------------------------------------------------
// Color: reserved-for lists
// ---------------------------------------------------------------------------

function listItem(line: string): string | null {
  const t = line.trim();
  let i = 0;
  while (i < t.length && t[i] >= '0' && t[i] <= '9') i += 1;
  if (i > 0 && t[i] === '.' && (t[i + 1] === ' ' || t[i + 1] === '\t')) return t.slice(i + 1).trim();
  if ((t[0] === '-' || t[0] === '*') && (t[1] === ' ' || t[1] === '\t')) return t.slice(2).trim();
  return null;
}

function reservedLead(line: string): { key: string; after: string } | null {
  const trimmed = line.trim().replace(/^\*+\s*/, '');
  const lower = trimmed.toLowerCase();
  const key = lower.startsWith('accent') ? 'accent' : lower.startsWith('destructive') ? 'destructive' : null;
  if (!key) return null;
  const at = lower.indexOf('reserved for');
  if (at === -1) return null;
  return { key, after: trimmed.slice(at + 'reserved for'.length) };
}

function reservedOf(lines: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (let i = 0; i < lines.length; i++) {
    const lead = reservedLead(lines[i]);
    if (!lead || out[lead.key]) continue;
    const items: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t.startsWith('**') || t.startsWith('#')) break;
      if (reservedLead(lines[j])) break;
      const item = listItem(lines[j]);
      if (item !== null && item !== '') items.push(clip(item, MAX_CELL));
    }
    if (items.length > 0) {
      out[lead.key] = items;
      continue;
    }
    const colon = lead.after.indexOf(':');
    const inline = colon === -1 ? '' : lead.after.slice(colon + 1).replace(/\*\*\s*$/, '').trim();
    if (inline !== '') {
      out[lead.key] = [clip(inline, MAX_CELL)];
      continue;
    }
    const tail: string[] = [];
    let k = i + 1;
    while (k < lines.length && lines[k].trim() === '') k += 1;
    while (k < lines.length && lines[k].trim() !== '') {
      tail.push(lines[k].trim());
      k += 1;
    }
    if (tail.length > 0) out[lead.key] = [clip(tail.join(' '), MAX_CELL)];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Checker sign-off
// ---------------------------------------------------------------------------

function verdictOf(text: string): UiSpecVerdict | null {
  const t = text.trimStart().toUpperCase();
  for (const v of ['PASS', 'FLAG', 'BLOCK', 'FAIL'] as const) if (t.startsWith(v)) return v;
  return null;
}

function parseDimensionLine(line: string): UiSpecDimension | null {
  if (!line.startsWith('- [')) return null;
  const box = line[3];
  if ((box !== ' ' && box !== 'x' && box !== 'X') || line[4] !== ']') return null;
  const rest = line.slice(5).trimStart();
  if (!rest.startsWith('Dimension ')) return null;
  const afterWord = rest.slice('Dimension '.length);
  let k = 0;
  while (k < afterWord.length && afterWord[k] >= '0' && afterWord[k] <= '9') k += 1;
  if (k === 0 || afterWord[k] !== ' ') return null;
  const n = Number(afterWord.slice(0, k));
  const afterNumber = afterWord.slice(k + 1);
  const colon = afterNumber.indexOf(':');
  if (colon === -1) return null;
  const name = afterNumber.slice(0, colon).trim();
  const text = afterNumber.slice(colon + 1).replace(/\*\*/g, '').trim();
  const verdict = verdictOf(text);
  let qual: string | null = null;
  let note = text;
  if (verdict) {
    note = text.slice(verdict.length).trimStart();
    if (note.startsWith('(')) {
      const close = note.indexOf(')');
      if (close !== -1) {
        qual = note.slice(1, close);
        note = note.slice(close + 1).trimStart();
      }
    }
    note = note.replace(/^[—–-]\s*/, '').trim();
  }
  return { n, name, checked: box !== ' ', verdict, qual, note: clip(note, MAX_CELL) };
}

function readSignoff(body: string, status: string): UiSpecSignoff {
  const raw = stripComments(linesOf(body)).lines;
  // Join indented continuation lines onto their `- [ ] Dimension` line.
  const joined: string[] = [];
  for (const line of raw) {
    const indented = line.length > 1 && (line[0] === ' ' || line[0] === '\t') && line.trim() !== '';
    const last = joined.length > 0 ? joined[joined.length - 1] : null;
    if (indented && last !== null && last.startsWith('- [')) {
      joined[joined.length - 1] = clip(`${last} ${line.trim()}`, MAX_LINE);
    } else joined.push(line);
  }
  const dims: UiSpecDimension[] = [];
  let rest: string[] = [];
  for (const line of joined) {
    const dim = parseDimensionLine(line);
    if (dim && dims.length < 40) dims.push(dim);
    else rest.push(line);
  }
  if (dims.length === 0) {
    const tables = findTables(rest);
    const table = tables.find((t) => {
      const head = lowerHead(t);
      return colIndex(head, (h) => h.includes('dimension')) !== -1 && colIndex(head, (h) => h.includes('verdict')) !== -1;
    });
    if (table) {
      const head = lowerHead(table);
      const ni = colIndex(head, (h) => h === '#');
      const di = colIndex(head, (h) => h.includes('dimension'));
      const vi = colIndex(head, (h) => h.includes('verdict'));
      const oi = colIndex(head, (h) => h.includes('note'));
      for (const row of table.rows) {
        const cell = (row[vi] ?? '').toUpperCase();
        const found = (['PASS', 'FLAG', 'BLOCK', 'FAIL'] as const).find((v) => cell.includes(v));
        const parsedN = Number(row[ni] ?? '');
        dims.push({
          n: Number.isFinite(parsedN) && ni !== -1 ? parsedN : dims.length + 1,
          name: plain(row[di] ?? ''),
          checked: true,
          verdict: found ?? 'PENDING',
          qual: null,
          note: row[oi] ?? '',
        });
      }
      rest = withoutRanges(rest, [table]);
    }
  }
  // The approval: the `**Approval:**` line and the lines that continue it.
  let approval: string | null = null;
  const approvalAt = rest.findIndex((l) => l.includes('**Approval:**'));
  if (approvalAt !== -1) {
    const first = rest[approvalAt];
    const parts = [first.slice(first.indexOf('**Approval:**') + '**Approval:**'.length).trim()];
    let end = approvalAt + 1;
    while (end < rest.length && rest[end].trim() !== '') {
      parts.push(rest[end].trim());
      end += 1;
    }
    approval = clip(parts.filter((p) => p !== '').join(' '), MAX_CELL) || null;
    rest = [...rest.slice(0, approvalAt), ...rest.slice(end)];
  }
  const pending = approval === null || approval.toLowerCase().startsWith('pending');
  const draft = status.toLowerCase().includes('draft');
  for (const d of dims) if (!d.checked && d.verdict === 'PASS' && (pending || draft)) d.verdict = 'PENDING';
  const hasNotes = proseOf(rest).length > 0;
  return { dims, approval, hasNotes };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function headingFamily(heading: string): string | null {
  const h = plain(clip(heading, 300)).toLowerCase();
  if (h.startsWith('design system')) return 'design-system';
  if (h.startsWith('spacing')) return 'spacing';
  if (h.startsWith('typography')) return 'typography';
  if (h.startsWith('color') || h.startsWith('colour')) return 'color';
  if (h.startsWith('ui considerations')) return 'considerations';
  if (h.startsWith('registry safety')) return 'registry';
  if (h.startsWith('checker sign-off') || h.startsWith('checker signoff')) return 'signoff';
  return null;
}

export function extractUiSpec(rawContent: string): UiSpecContract {
  const content = typeof rawContent === 'string' ? rawContent : '';
  const lines = content.split('\n');
  const fm = readFrontmatter(lines.map((l) => clip(l, MAX_LINE)));
  const body = lines.slice(fm.bodyStart).join('\n');
  const split = splitWithPreamble(body, 2);
  const pre = readPreamble(split.preamble);

  const contract: UiSpecContract = {
    meta: fm.meta,
    title: pre.title,
    tagline: pre.tagline,
    scope: pre.scope,
    designSystem: null,
    spacing: null,
    typography: null,
    color: null,
    reserved: {},
    considerations: null,
    registry: null,
    signoff: null,
    sections: [],
  };

  const seen = new Set<string>();
  for (const section of split.sections) {
    const heading = clip(plain(section.heading), 300);
    const family = headingFamily(section.heading);
    const claimed = family !== null && !seen.has(family);
    contract.sections.push({ heading, claimed });
    if (!claimed || family === null) continue;
    seen.add(family);
    const prepared = stripComments(linesOf(section.body)).lines;
    if (family === 'design-system') {
      const { table } = tableSection(prepared);
      contract.designSystem = table
        ? table.rows.filter((r) => r.length >= 2).map((r) => ({ key: r[0], value: r[1] }))
        : [];
    } else if (family === 'spacing') {
      contract.spacing = tableSection(prepared).table;
    } else if (family === 'typography') {
      contract.typography = tableSection(prepared).table;
    } else if (family === 'color') {
      const { table, rest } = tableSection(prepared);
      contract.color = table;
      contract.reserved = reservedOf(rest);
    } else if (family === 'considerations') {
      contract.considerations = readConsiderations(section.body);
    } else if (family === 'registry') {
      contract.registry = tableSection(prepared).table;
    } else if (family === 'signoff') {
      contract.signoff = readSignoff(section.body, fm.status);
    }
  }
  return contract;
}
