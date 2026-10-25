// The REVIEW.md and REVIEW-FIX.md body projections (quick-261017-k44, sketch 022 winner C): a
// tolerant, fence-aware, line-scanned read of one code-review report into `ReviewReportBody` (the
// findings with their severity, file references, problem, suggested change and any other labelled
// field, the reviewer's Summary, the reviewer, and a section ledger so the composer can prove
// nothing was dropped silently) and of one fix report into `ReviewFixReportBody` (the fixed and
// skipped entries with every finding ID of a combined heading such as "WR-04 / WR-05", the commit,
// the files modified, the applied fix or the reason, and the deferred bullets). It ports the
// sketch's `gen-data.mjs` parse (the regexes there are reference only) and fixes its two gaps:
// combined fix headings and same-path references that were not merged.
// T-k44-02: the `##` and `###` splits go through `splitWithPreamble` (fence-aware, every line
// clipped to MAX_LINE up front); the labelled fields, the IDs, the file references, the hex tokens
// and the footer lines are character scans over one clipped line or one capped field at a time,
// never a global pattern over a whole body. Every list and text is capped. Both entries are pure
// (no fs access) and never throw on a string; the handlers still wrap them in try/catch
// (T-k44-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';
import { splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type ReviewSeverity = 'critical' | 'warning' | 'info';

export interface ReviewSpan {
  from: number;
  to: number;
}

export interface ReviewRef {
  path: string;
  spans: ReviewSpan[];
}

export interface ReviewLabelled {
  label: string;
  blocks: Block[];
}

export interface ReviewFinding {
  id: string;
  title: string;
  severity: ReviewSeverity;
  /** The `##` section the finding sits under, as written. */
  section: string;
  /** The File / Files / Location field as written, whitespace collapsed. */
  fileRaw: string;
  refs: ReviewRef[];
  issue: Block[];
  fix: Block[];
  extra: ReviewLabelled[];
  /** The `> **RESOLVED ...**` note at the start of the finding, or null. */
  inlineResolved: { commit: string | null; note: string } | null;
}

export interface ReviewSection {
  heading: string;
  /** True for the Summary, a severity bucket and any section holding a finding. */
  handled: boolean;
  /** True when the section body (without its `###` subsections) is empty, "None", "N/A" or a rule. */
  none: boolean;
}

export interface ReviewReportBody {
  /** The `#` line as written, or null. */
  h1: string | null;
  summary: { heading: string; blocks: Block[] } | null;
  findings: ReviewFinding[];
  /** The `_Reviewer: ..._` footer value, or null. */
  reviewer: string | null;
  sections: ReviewSection[];
}

export interface ReviewFixEntry {
  /** Every leading finding ID of the heading ("WR-04 / WR-05" gives two). */
  ids: string[];
  title: string;
  outcome: 'fixed' | 'skipped';
  /** The first 6-40 character hex token of the Commit field, or null. */
  commit: string | null;
  /** The rest of the Commit field after the hash, backticks dropped, or null. */
  commitNote: string | null;
  /** The backticked paths of the Files modified (or File) field. */
  files: string[];
  /** The Applied fix (fixed) or Reason (skipped), else the text before the first label. */
  note: Block[];
}

export interface ReviewFixDeferred {
  ids: string[];
  note: string;
}

export interface ReviewFixSection {
  heading: string;
  handled: boolean;
}

export interface ReviewFixReportBody {
  h1: string | null;
  /** The `critical_warning` of "**Fix scope:** `critical_warning`", else of a "fix_scope:" mention. */
  fixScope: string | null;
  entries: ReviewFixEntry[];
  deferred: ReviewFixDeferred[];
  sections: ReviewFixSection[];
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const MAX_ITEMS = 500;
const MAX_REFS = 20;
const MAX_SPANS = 20;
const MAX_IDS = 20;
const MAX_BLOCKS = 200;
const MAX_SECTIONS = 500;
const MAX_TEXT = 6000;
/** A block field (problem, suggested change, applied fix) may hold a code sample; this keeps the
 * sample whole while still bounding what a hostile body can make the page carry. */
const MAX_FIELD = 20000;
const MAX_LINE = 8000;
const MAX_FRONTMATTER_LINES = 3000;
const MAX_LABEL = 40;

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isUpper(ch: string | undefined): boolean {
  return ch !== undefined && ch >= 'A' && ch <= 'Z';
}

function isAlnum(ch: string | undefined): boolean {
  return (
    ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9'))
  );
}

function isHex(ch: string): boolean {
  return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f');
}

function cap(text: string, max: number = MAX_TEXT): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Whitespace runs collapsed to one space, trimmed, capped. */
function squash(text: string, max: number = MAX_TEXT): string {
  return cap(text.slice(0, max * 2).replace(/\s+/g, ' ').trim(), max);
}

/** `**bold**`, backticks and stray emphasis removed, lower-cased - what the heading checks match. */
function norm(text: string): string {
  return text.slice(0, 300).replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Skips a leading `---` ... `---` frontmatter block (a malformed one comes through the handler
 * with the block still in the body). */
function stripFrontmatter(body: string): string {
  let i = 0;
  while (i < body.length && (body[i] === '\n' || body[i] === '\r' || body[i] === ' ' || body[i] === '\t')) i += 1;
  if (!body.startsWith('---', i)) return body;
  const eol = body.indexOf('\n', i);
  if (eol === -1 || body.slice(i, eol).trim() !== '---') return body;
  let pos = eol + 1;
  for (let n = 0; n < MAX_FRONTMATTER_LINES; n++) {
    const nl = body.indexOf('\n', pos);
    const line = nl === -1 ? body.slice(pos) : body.slice(pos, nl);
    if (line.trim() === '---') return nl === -1 ? '' : body.slice(nl + 1);
    if (nl === -1) return body;
    pos = nl + 1;
  }
  return body;
}

interface Fence {
  ch: string;
  len: number;
}

function openFenceOf(trimmed: string): Fence | null {
  const ch = trimmed[0];
  if (ch !== '`' && ch !== '~') return null;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === ch) len += 1;
  return len >= 3 ? { ch, len } : null;
}

function closesFenceOf(trimmed: string, fence: Fence): boolean {
  if (trimmed[0] !== fence.ch) return false;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === fence.ch) len += 1;
  return len >= fence.len && trimmed.slice(len).trim() === '';
}

const FOOTER_KEYS = ['reviewed', 'reviewer', 'depth', 'fixed', 'fixer', 'iteration', 'verified', 'verifier'];

/** True for `_Reviewed: ..._` / `*Depth: ...*` style footer lines (a short line only). */
function footerKeyOf(trimmed: string): string | null {
  if (trimmed.length > 400 || trimmed.length < 4) return null;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first !== '_' && first !== '*') || (last !== '_' && last !== '*')) return null;
  if (trimmed.startsWith('**')) return null;
  const colon = trimmed.indexOf(':');
  if (colon < 2 || colon > 20) return null;
  const key = trimmed.slice(1, colon).trim().toLowerCase();
  return FOOTER_KEYS.includes(key) ? key : null;
}

/** The value after `Reviewer:` on a footer line, up to the next `_ ` / `* ` marker or the end. */
function reviewerValueOf(trimmed: string): string | null {
  const at = trimmed.toLowerCase().indexOf('reviewer:');
  if (at === -1) return null;
  let value = trimmed.slice(at + 'reviewer:'.length);
  for (let i = 0; i < value.length - 1; i++) {
    if ((value[i] === '_' || value[i] === '*') && value[i + 1] === ' ') {
      value = value.slice(0, i);
      break;
    }
  }
  while (value.endsWith('_') || value.endsWith('*')) value = value.slice(0, -1);
  value = value.trim();
  return value === '' ? null : cap(value, 300);
}

/** The body with its frontmatter, clipped lines and footer lines (outside fences) removed. The
 * Reviewer value of the footer is returned alongside. */
function prepare(rawBody: string): { body: string; reviewer: string | null } {
  const text = typeof rawBody === 'string' ? rawBody : '';
  const lines = stripFrontmatter(text).split('\n');
  const kept: string[] = [];
  let fence: Fence | null = null;
  let reviewer: string | null = null;
  for (let line of lines) {
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line.length > MAX_LINE) line = line.slice(0, MAX_LINE);
    const trimmed = line.trim();
    if (fence !== null) {
      kept.push(line);
      if (closesFenceOf(trimmed, fence)) fence = null;
      continue;
    }
    const opened = openFenceOf(trimmed);
    if (opened !== null) {
      fence = opened;
      kept.push(line);
      continue;
    }
    const footer = footerKeyOf(trimmed);
    if (footer !== null) {
      if (reviewer === null) reviewer = reviewerValueOf(trimmed);
      continue;
    }
    kept.push(line);
  }
  return { body: kept.join('\n'), reviewer };
}

function h1Of(preamble: string): string | null {
  for (const line of preamble.split('\n')) {
    if (line.startsWith('# ')) {
      const text = line.slice(2).trim();
      return text === '' ? null : cap(text, 300);
    }
  }
  return null;
}

/** A line that is only a rule (`---`, `***`, `___`, spaced or longer). */
function isRule(trimmed: string): boolean {
  if (trimmed.length < 3) return false;
  const ch = trimmed[0];
  if (ch !== '-' && ch !== '*' && ch !== '_') return false;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] !== ch && trimmed[i] !== ' ') return false;
  }
  return true;
}

/** Blank and rule lines trimmed off the end of a line list. */
function trimTail(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0) {
    const trimmed = lines[end - 1].trim();
    if (trimmed === '' || isRule(trimmed)) end -= 1;
    else break;
  }
  return lines.slice(0, end);
}

function blocksOf(lines: string[]): Block[] {
  const text = cap(trimTail(lines).join('\n').trim(), MAX_FIELD);
  if (text === '') return [];
  return parseBlocks(text).slice(0, MAX_BLOCKS);
}

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

/** Two to four capitals, a hyphen, one to four digits at `pos`; the end index or -1. */
function idEndAt(text: string, pos: number): number {
  let i = pos;
  while (i < text.length && i - pos < 5 && isUpper(text[i])) i += 1;
  const letters = i - pos;
  if (letters < 2 || letters > 4 || text[i] !== '-') return -1;
  i += 1;
  const digitsFrom = i;
  while (i < text.length && isDigit(text[i])) i += 1;
  const digits = i - digitsFrom;
  if (digits < 1 || digits > 4) return -1;
  if (isAlnum(text[i])) return -1;
  return i;
}

/** The finding ID the text starts with, else null. */
function leadingId(text: string): { id: string; end: number } | null {
  const end = idEndAt(text, 0);
  return end === -1 ? null : { id: text.slice(0, end), end };
}

/** After an ID: ":" " — " " – " " - " (or a bare space for the fix-report bullets), the rest. */
function titleAfter(text: string, end: number): string | null {
  const rest = text.slice(end);
  const trimmed = rest.trimStart();
  if (trimmed.startsWith(':')) return trimmed.slice(1).trim();
  if (rest.startsWith(' ')) {
    for (const dash of ['—', '–', '-']) {
      if (trimmed.startsWith(dash + ' ') || trimmed === dash) return trimmed.slice(dash.length).trim();
    }
  }
  return null;
}

/** Every leading ID of a fix-report heading, separated by " / ", ", ", " and ", " or " or " & ". */
function leadingIds(text: string): { ids: string[]; end: number } {
  const ids: string[] = [];
  let pos = 0;
  for (let n = 0; n < MAX_IDS; n++) {
    const end = idEndAt(text, pos);
    if (end === -1) break;
    ids.push(text.slice(pos, end));
    pos = end;
    let next = pos;
    while (text[next] === ' ') next += 1;
    let after = -1;
    for (const sep of ['/', ',', '&', 'and ', 'or ']) {
      if (text.startsWith(sep, next)) {
        after = next + sep.length;
        break;
      }
    }
    if (after === -1) break;
    while (text[after] === ' ') after += 1;
    if (idEndAt(text, after) === -1) break;
    pos = after;
  }
  return { ids, end: pos };
}

function severityOf(id: string, section: string): ReviewSeverity {
  const prefix = id.slice(0, id.indexOf('-'));
  if (prefix === 'CR' || prefix === 'BL') return 'critical';
  if (prefix === 'WR') return 'warning';
  if (prefix === 'IN') return 'info';
  const s = norm(section);
  if (s.includes('critical') || s.includes('blocker')) return 'critical';
  if (s.includes('warning')) return 'warning';
  return 'info';
}

// ---------------------------------------------------------------------------
// Labelled fields: `**Label:** value` / `**Label**: value`
// ---------------------------------------------------------------------------

interface Field {
  key: string;
  label: string;
  lines: string[];
}

function labelCharOk(ch: string): boolean {
  return isAlnum(ch) || ch === ' ' || ch === '/' || ch === "'" || ch === '-' || ch === '(' || ch === ')';
}

/** `**Label:** rest` / `**Label**: rest` -> its parts, else null. A label starts with a capital,
 * holds only letters, digits, spaces and `/'-()`, and is at most 40 characters, so a bold lead
 * such as "**However**" or "**Design decision - why:**" stays prose. */
function labelOf(line: string): { key: string; label: string; rest: string } | null {
  const t = line.trim();
  if (!t.startsWith('**')) return null;
  const close = t.indexOf('**', 2);
  if (close === -1 || close > MAX_LABEL + 3) return null;
  let label = t.slice(2, close);
  let rest = t.slice(close + 2);
  if (label.endsWith(':')) {
    label = label.slice(0, -1);
  } else if (rest.startsWith(':')) {
    rest = rest.slice(1);
  } else {
    return null;
  }
  label = label.trim();
  if (label.length < 2 || label.length > MAX_LABEL || !isUpper(label[0])) return null;
  for (let i = 0; i < label.length; i++) if (!labelCharOk(label[i])) return null;
  return { key: label.toLowerCase(), label, rest: rest.trim() };
}

/** Splits a section body into its lead (before the first label) and its labelled fields. A field
 * runs to the next label line outside a fence; the last one runs to the end. */
function readFields(body: string): { lead: string[]; fields: Field[] } {
  const lead: string[] = [];
  const fields: Field[] = [];
  let current: Field | null = null;
  let fence: Fence | null = null;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (fence !== null) {
      (current ? current.lines : lead).push(line);
      if (closesFenceOf(trimmed, fence)) fence = null;
      continue;
    }
    const opened = openFenceOf(trimmed);
    if (opened !== null) {
      fence = opened;
      (current ? current.lines : lead).push(line);
      continue;
    }
    const label = labelOf(line);
    if (label !== null && fields.length < MAX_SECTIONS) {
      current = { key: label.key, label: label.label, lines: label.rest === '' ? [] : [label.rest] };
      fields.push(current);
      continue;
    }
    (current ? current.lines : lead).push(line);
  }
  return { lead, fields };
}

function fieldText(field: Field): string {
  return trimTail(field.lines).join('\n').trim();
}

// ---------------------------------------------------------------------------
// File references: `path`, `path:42`, `path:42-45`, `path:3, 9-12`
// ---------------------------------------------------------------------------

const SOURCE_EXTENSIONS = [
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'rs', 'py', 'go', 'md', 'json', 'css', 'html', 'toml',
  'yaml', 'yml', 'sh', 'sql', 'lock', 'txt', 'env', 'java', 'kt', 'rb', 'php', 'c', 'h', 'cpp', 'swift',
];

function isPathLike(path: string): boolean {
  if (path === '' || path.length > 300) return false;
  if (path.includes('://')) return false;
  if (path.includes('/')) return true;
  if (path === 'Dockerfile' || path === '.dockerignore') return true;
  const dot = path.lastIndexOf('.');
  if (dot < 1) return false;
  return SOURCE_EXTENSIONS.includes(path.slice(dot + 1));
}

function parseSpans(text: string): ReviewSpan[] | null {
  const spans: ReviewSpan[] = [];
  for (const part of text.split(',')) {
    const piece = part.trim();
    if (piece === '') continue;
    let dash = piece.indexOf('-');
    if (dash === -1) dash = piece.indexOf('–');
    const a = dash === -1 ? piece : piece.slice(0, dash).trim();
    const b = dash === -1 ? '' : piece.slice(dash + 1).trim();
    if (a === '' || a.length > 7 || b.length > 7) return null;
    for (const ch of a + b) if (!isDigit(ch)) return null;
    const from = Number(a);
    const toRaw = b === '' ? from : Number(b);
    if (!(from > 0)) continue;
    if (spans.length < MAX_SPANS) spans.push({ from, to: toRaw > 0 ? Math.max(from, toRaw) : from });
  }
  return spans;
}

function mergeRef(refs: ReviewRef[], path: string, spans: ReviewSpan[]): ReviewRef | null {
  const existing = refs.find((r) => r.path === path);
  if (existing) {
    for (const span of spans) {
      if (existing.spans.length >= MAX_SPANS) break;
      if (!existing.spans.some((s) => s.from === span.from && s.to === span.to)) existing.spans.push(span);
    }
    return existing;
  }
  if (refs.length >= MAX_REFS) return null;
  const ref: ReviewRef = { path, spans: [...spans] };
  refs.push(ref);
  return ref;
}

/** Every backticked path (or path:spans) in `text`, same-path references merged; a backtick span
 * that starts with ":" and spans continues the previous path. */
function refsOf(text: string): ReviewRef[] {
  const refs: ReviewRef[] = [];
  const source = cap(text, MAX_TEXT);
  let previous: ReviewRef | null = null;
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf('`', i);
    if (open === -1) break;
    const close = source.indexOf('`', open + 1);
    if (close === -1) break;
    i = close + 1;
    const content = source.slice(open + 1, close).trim();
    if (content === '' || content.length > 320) continue;
    if (content[0] === ':') {
      const spans = parseSpans(content.slice(1));
      if (previous !== null && spans !== null) mergeRef(refs, previous.path, spans);
      continue;
    }
    const colon = content.indexOf(':');
    const path = colon === -1 ? content : content.slice(0, colon);
    if (!isPathLike(path)) continue;
    let ok = true;
    for (let k = 0; k < path.length; k++) {
      const ch = path[k];
      if (ch === ' ' || ch === '\t') {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const spans = colon === -1 ? [] : parseSpans(content.slice(colon + 1));
    if (spans === null) continue;
    previous = mergeRef(refs, path, spans) ?? previous;
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Hash tokens
// ---------------------------------------------------------------------------

/** The first token of 6 to 40 lowercase hex characters that holds a digit (so "decade" is not a
 * commit), with the text before and after it. */
function hexTokenIn(text: string): { token: string; before: string; after: string } | null {
  const source = cap(text, MAX_TEXT);
  let i = 0;
  while (i < source.length) {
    if (!isAlnum(source[i])) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < source.length && isAlnum(source[j])) j += 1;
    const token = source.slice(i, j);
    if (token.length >= 6 && token.length <= 40) {
      let hex = true;
      let digit = false;
      for (const ch of token) {
        if (!isHex(ch)) {
          hex = false;
          break;
        }
        if (isDigit(ch)) digit = true;
      }
      if (hex && digit) return { token, before: source.slice(0, i), after: source.slice(j) };
    }
    i = j;
  }
  return null;
}

function stripNoteLead(text: string): string {
  let t = text.trim();
  while (
    t.startsWith('.') || t.startsWith('`') || t.startsWith('—') || t.startsWith('–') || t.startsWith('-') || t.startsWith(',')
  ) {
    t = t.slice(1).trim();
  }
  return t;
}

/** The `> **RESOLVED ...**` quote at the start of a finding's lead: its commit and note, and the
 * lead without the quote lines. */
function inlineResolvedOf(lead: string[]): {
  resolved: { commit: string | null; note: string } | null;
  rest: string[];
} {
  let start = -1;
  for (let i = 0; i < lead.length; i++) {
    const t = lead[i].trim();
    if (t === '') continue;
    if (t.startsWith('>')) {
      const inner = t.slice(1).trimStart();
      if (inner.startsWith('**RESOLVED')) start = i;
    }
    break;
  }
  if (start === -1) return { resolved: null, rest: lead };
  let end = start;
  const quoted: string[] = [];
  while (end < lead.length && lead[end].trim().startsWith('>')) {
    quoted.push(lead[end].trim().slice(1).trim());
    end += 1;
  }
  const text = cap(quoted.join(' '), MAX_TEXT);
  let commit: string | null = null;
  let note = '';
  const lower = text.toLowerCase();
  const at = lower.indexOf('commit');
  if (at !== -1) {
    const found = hexTokenIn(text.slice(at, at + 200));
    if (found !== null) {
      commit = found.token;
      const tokenEnd = at + found.before.length + found.token.length;
      note = squash(stripNoteLead(text.slice(tokenEnd)));
    }
  }
  if (commit === null) {
    const close = text.indexOf('**', 2);
    note = squash(stripNoteLead(close === -1 ? '' : text.slice(close + 2)));
  }
  return { resolved: { commit, note }, rest: [...lead.slice(0, start), ...lead.slice(end)] };
}

// ---------------------------------------------------------------------------
// REVIEW.md
// ---------------------------------------------------------------------------

const ISSUE_KEYS = ['issue', 'problem'];
const FIX_KEYS = ['fix', 'suggested fix', 'suggestion', 'fix (optional)', 'recommendation', 'suggested change'];
const FILE_KEYS = ['file', 'files', 'location'];

function emptyReview(): ReviewReportBody {
  return { h1: null, summary: null, findings: [], reviewer: null, sections: [] };
}

function isBucket(heading: string): boolean {
  const h = norm(heading);
  return h.startsWith('critical') || h.startsWith('blocker') || h.startsWith('warning') || h.startsWith('info');
}

/** True when the text holds nothing worth a chip: empty, a rule, "None" or "N/A". */
function isBlankText(text: string): boolean {
  const lines = text.split('\n');
  let seen = '';
  for (const line of lines) {
    const t = line.trim();
    if (t === '' || isRule(t)) continue;
    if (seen !== '') return false;
    seen = t;
  }
  if (seen === '') return true;
  const plain = norm(seen);
  let trimmed = plain;
  while (trimmed.endsWith('.')) trimmed = trimmed.slice(0, -1);
  return trimmed === 'none' || trimmed === 'n/a' || trimmed === 'none found';
}

function findingOf(id: string, title: string, section: string, body: string): ReviewFinding {
  const { lead, fields } = readFields(body);
  const { resolved, rest } = inlineResolvedOf(lead);
  const finding: ReviewFinding = {
    id,
    title: cap(title, 400),
    severity: severityOf(id, section),
    section: cap(section, 300),
    fileRaw: '',
    refs: [],
    issue: [],
    fix: [],
    extra: [],
    inlineResolved: resolved,
  };
  let haveFile = false;
  let haveIssue = false;
  let haveFix = false;
  for (const field of fields) {
    if (FILE_KEYS.includes(field.key) && !haveFile) {
      haveFile = true;
      const text = fieldText(field);
      finding.fileRaw = squash(text);
      finding.refs = refsOf(text);
      continue;
    }
    if (ISSUE_KEYS.includes(field.key) && !haveIssue) {
      haveIssue = true;
      finding.issue = blocksOf(field.lines);
      continue;
    }
    if (FIX_KEYS.includes(field.key) && !haveFix) {
      haveFix = true;
      finding.fix = blocksOf(field.lines);
      continue;
    }
    const blocks = blocksOf(field.lines);
    if (finding.extra.length < MAX_SECTIONS) finding.extra.push({ label: field.label, blocks });
  }
  if (!haveIssue) finding.issue = blocksOf(rest);
  return finding;
}

/** Never throws on a string. */
export function extractReviewReport(rawBody: string): ReviewReportBody {
  const model = emptyReview();
  const { body, reviewer } = prepare(rawBody);
  model.reviewer = reviewer;
  const top = splitWithPreamble(body, 2);
  model.h1 = h1Of(top.preamble);
  for (const section of top.sections) {
    if (model.sections.length >= MAX_SECTIONS) break;
    const heading = cap(section.heading, 300);
    const isSummary = norm(heading).startsWith('summary');
    const sub = splitWithPreamble(section.body, 3);
    let findingCount = 0;
    if (!isSummary) {
      for (const subsection of sub.sections) {
        const lead = leadingId(subsection.heading);
        if (lead === null) continue;
        const title = titleAfter(subsection.heading, lead.end);
        if (title === null) continue;
        if (model.findings.length >= MAX_ITEMS) break;
        model.findings.push(findingOf(lead.id, title, heading, subsection.body));
        findingCount += 1;
      }
    }
    if (isSummary && model.summary === null) {
      model.summary = { heading, blocks: blocksOf(section.body.split('\n')) };
    }
    model.sections.push({
      heading,
      handled: isSummary || isBucket(heading) || findingCount > 0,
      none: isBlankText(sub.preamble),
    });
  }
  return model;
}

// ---------------------------------------------------------------------------
// REVIEW-FIX.md
// ---------------------------------------------------------------------------

const SHORT_FIX_KEYS = ['commit', 'files modified', 'files', 'file'];

type FixMode = 'fixed' | 'skipped' | 'deferred' | null;

function fixModeOf(heading: string): FixMode {
  const h = norm(heading);
  if (h.startsWith('fixed')) return 'fixed';
  if (h.startsWith('skipped')) return 'skipped';
  if (h.includes('deferred') || h.includes('out of scope') || h.includes('not attempted')) return 'deferred';
  return null;
}

/** The first backticked token of the "Fix scope" label in the preamble, else the word after a
 * "fix_scope:" mention anywhere in the body. */
function fixScopeOf(preamble: string, body: string): string | null {
  for (const line of preamble.split('\n')) {
    const label = labelOf(line);
    if (label === null || label.key !== 'fix scope') continue;
    const open = label.rest.indexOf('`');
    const close = open === -1 ? -1 : label.rest.indexOf('`', open + 1);
    if (open !== -1 && close > open + 1) return cap(label.rest.slice(open + 1, close).trim(), 60);
    const word = label.rest.split(' ')[0];
    if (word !== '') return cap(word, 60);
  }
  const at = body.indexOf('fix_scope:');
  if (at === -1) return null;
  let i = at + 'fix_scope:'.length;
  while (i < body.length && (body[i] === ' ' || body[i] === '`')) i += 1;
  let j = i;
  while (j < body.length && j - i < 60 && ((body[j] >= 'a' && body[j] <= 'z') || body[j] === '_')) j += 1;
  return j > i ? body.slice(i, j) : null;
}

/** `- **IN-01** - text` / `- **IN-01**: text` bullets (with indented continuation lines). */
function deferredBullets(body: string): ReviewFixDeferred[] {
  const out: ReviewFixDeferred[] = [];
  let current: { ids: string[]; parts: string[] } | null = null;
  let fence: Fence | null = null;
  const flush = (): void => {
    if (current !== null && out.length < MAX_ITEMS) out.push({ ids: current.ids, note: squash(current.parts.join(' ')) });
    current = null;
  };
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (fence !== null) {
      if (closesFenceOf(trimmed, fence)) fence = null;
      continue;
    }
    const opened = openFenceOf(trimmed);
    if (opened !== null) {
      fence = opened;
      continue;
    }
    if (trimmed === '') {
      flush();
      continue;
    }
    if ((trimmed[0] === '-' || trimmed[0] === '*') && trimmed[1] === ' ') {
      flush();
      const item = trimmed.slice(2).trimStart();
      if (!item.startsWith('**')) continue;
      const close = item.indexOf('**', 2);
      if (close === -1 || close > 200) continue;
      let inner = item.slice(2, close);
      let after = item.slice(close + 2);
      if (inner.endsWith(':')) inner = inner.slice(0, -1);
      const { ids, end } = leadingIds(inner.trim());
      if (ids.length === 0 || inner.trim().slice(end).trim() !== '') continue;
      after = after.trimStart();
      if (after.startsWith(':')) after = after.slice(1);
      else if (after.startsWith('—') || after.startsWith('–') || after.startsWith('-')) after = after.slice(1);
      current = { ids, parts: after.trim() === '' ? [] : [after.trim()] };
      continue;
    }
    if (current !== null) current.parts.push(trimmed);
  }
  flush();
  return out;
}

function emptyFix(): ReviewFixReportBody {
  return { h1: null, fixScope: null, entries: [], deferred: [], sections: [] };
}

/** Never throws on a string. */
export function extractReviewFixReport(rawBody: string): ReviewFixReportBody {
  const model = emptyFix();
  const { body } = prepare(rawBody);
  const top = splitWithPreamble(body, 2);
  model.h1 = h1Of(top.preamble);
  model.fixScope = fixScopeOf(top.preamble, body);
  for (const section of top.sections) {
    if (model.sections.length >= MAX_SECTIONS) break;
    const heading = cap(section.heading, 300);
    const mode = fixModeOf(heading);
    model.sections.push({ heading, handled: mode !== null });
    if (mode === 'deferred') {
      for (const bullet of deferredBullets(section.body)) {
        if (model.deferred.length < MAX_ITEMS) model.deferred.push(bullet);
      }
      continue;
    }
    if (mode === null) continue;
    const sub = splitWithPreamble(section.body, 3);
    for (const subsection of sub.sections) {
      const { ids, end } = leadingIds(subsection.heading);
      if (ids.length === 0) continue;
      const title = titleAfter(subsection.heading, end);
      if (title === null) continue;
      if (model.entries.length >= MAX_ITEMS) break;
      const read = readFields(subsection.body);
      // Commit and Files modified are one-paragraph fields: anything after their first blank line
      // is the entry's own prose (some fix reports write the narrative straight after them).
      const spill: string[] = [];
      const fields = read.fields.map((field): Field => {
        if (!SHORT_FIX_KEYS.includes(field.key)) return field;
        const blank = field.lines.findIndex((l) => l.trim() === '');
        if (blank === -1) return field;
        spill.push(...field.lines.slice(blank + 1));
        return { ...field, lines: field.lines.slice(0, blank) };
      });
      const pick = (...keys: string[]): Field | undefined => fields.find((f) => keys.includes(f.key));
      const commitField = pick('commit');
      let commit: string | null = null;
      let commitNote: string | null = null;
      if (commitField !== undefined) {
        const text = fieldText(commitField).split('`').join('');
        const found = hexTokenIn(text);
        if (found !== null) {
          commit = found.token;
          const note = squash(`${found.before} ${found.after}`);
          commitNote = note === '' ? null : note;
        } else {
          const note = squash(text);
          commitNote = note === '' ? null : note;
        }
      }
      const filesField = pick('files modified', 'files', 'file');
      const files = filesField === undefined ? [] : refsOf(fieldText(filesField)).map((r) => r.path);
      const noteField = mode === 'fixed' ? pick('applied fix', 'fix') : pick('reason');
      model.entries.push({
        ids,
        title: cap(title, 400),
        outcome: mode,
        commit,
        commitNote,
        files,
        note: noteField === undefined ? blocksOf([...read.lead, ...spill]) : blocksOf(noteField.lines),
      });
    }
  }
  return model;
}
