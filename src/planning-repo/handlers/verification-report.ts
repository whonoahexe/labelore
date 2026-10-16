// The VERIFICATION.md body projection (quick-261017-18a, sketch 021 winner E): a tolerant,
// fence-aware, line-scanned read of one verifier report into `VerificationReportBody` — the H1 and
// goal, the truth tables (any section, any plan grouping), the Requirements Coverage table, the
// anti-pattern rows, the human checks, the template's Critical / Non-Critical gaps, the Recommended
// Fix Plans (or the prose "gap-closure shape" some verifiers write instead), the Verification
// Metadata, the Behavioral Spot-Checks and a section ledger so the composer can prove nothing was
// dropped silently. It ports the sketch's `gen-data.mjs` parse (the regexes there are reference
// only) with the summary-run.ts discipline.
// T-18a-02: the `##` and `###` splits go through `splitWithPreamble` (fence-aware, every line
// clipped to MAX_LINE up front); every pattern here runs on one clipped line or cell at a time and
// none nests an unbounded quantifier; labelled fields, numbered blocks, plan tokens and the prose
// task split are character scans, never a global pattern over a whole body. Every list and text is
// capped. `extractVerificationReport` is pure (no fs access) and never throws on a string;
// `VerificationHandler.parse` still wraps it in try/catch (T-18a-04).
import { splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type VerificationTruthState =
  | 'verified'
  | 'coincidental'
  | 'override'
  | 'mixed'
  | 'unverified'
  | 'uncertain'
  | 'failed';

export type VerificationRequirementState = 'satisfied' | 'partial' | 'human' | 'blocked';

export type VerificationSeverity = 'clear' | 'blocker' | 'warning' | 'info';

export interface VerificationTruth {
  /** The `#` cell as written (it can read "4b"), else the 1-based position. */
  n: string;
  /** "Plan 04-01", "Roadmap success criteria", "Plan must-haves" or "Observable truths". */
  group: string;
  text: string;
  statusRaw: string;
  status: VerificationTruthState;
  evidence: string;
}

export interface VerificationRequirement {
  id: string;
  description: string;
  /** NN-NN plan tokens from the Source Plan(s) cell. */
  plans: string[];
  statusRaw: string;
  status: VerificationRequirementState;
  /** The Evidence or Blocking Issue cell; a lone dash becomes ''. */
  note: string;
}

export interface VerificationAntiPattern {
  file: string;
  line: string;
  pattern: string;
  severityRaw: string;
  severity: VerificationSeverity;
  impact: string;
}

export interface VerificationHumanCheck {
  /** The numbered heading without its number, or null. */
  title: string | null;
  test: string | null;
  expected: string | null;
  why: string | null;
}

export interface VerificationTemplateGap {
  name: string;
  /** The Missing field, else the Issue field. */
  missing: string | null;
  impact: string | null;
  /** The Fix field, else the Recommendation field. */
  fix: string | null;
  fixLabel: 'Fix' | 'Recommendation';
}

export interface VerificationFixTask {
  text: string;
  verify: boolean;
}

export interface VerificationFixPlan {
  /** "06-04-PLAN.md" or null (the prose shape names no file). */
  file: string | null;
  name: string;
  objective: string | null;
  tasks: VerificationFixTask[];
  /** "Small" / "Medium" / "Large" as written, or null. */
  scope: string | null;
}

export interface VerificationMetadata {
  approach: string | null;
  source: string | null;
  automatedPassed: number | null;
  automatedFailed: number | null;
  duration: string | null;
}

export interface VerificationSpotCheck {
  behavior: string;
  command: string;
  result: string;
  status: 'pass' | 'fail' | 'skip';
  statusRaw: string;
}

export interface VerificationSection {
  heading: string;
  level: 2 | 3;
  /** True for the sections the page consumes itself. */
  handled: boolean;
  /** True when the section has no content worth a chip: empty, "None" or "N/A". */
  blank: boolean;
}

/** The heading text of the section behind each part of the page, for its "Source" link. */
export interface VerificationAnchors {
  truths: string | null;
  requirements: string | null;
  anti: string | null;
  human: string | null;
  gaps: string | null;
  fixPlans: string | null;
  spot: string | null;
}

export interface VerificationReportBody {
  /** The `#` line as written, or null. */
  h1: string | null;
  goal: string | null;
  /** The `**Re-verification:**` value, or null. */
  reVerification: string | null;
  scoreLine: string | null;
  verifier: string | null;
  truths: VerificationTruth[];
  requirements: VerificationRequirement[];
  antiPatterns: VerificationAntiPattern[];
  /** The Anti-Patterns section's prose with the table and the summary line removed. */
  antiNote: string | null;
  humanChecks: VerificationHumanCheck[];
  /** The bold numbered list of the chosen Human Verification section. */
  humanTitles: string[];
  humanNote: string | null;
  gaps: {
    critical: VerificationTemplateGap[];
    nonCritical: VerificationTemplateGap[];
  };
  /** The Gaps Summary's own prose, whitespace collapsed. */
  gapProse: string | null;
  fixPlans: VerificationFixPlan[];
  fixShape: 'plans' | 'prose' | null;
  metadata: VerificationMetadata;
  spotChecks: VerificationSpotCheck[];
  anchors: VerificationAnchors;
  sections: VerificationSection[];
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const MAX_ITEMS = 500;
const MAX_TEXT = 6000;
const MAX_HUMAN = 100;
const MAX_GAPS = 200;
const MAX_PLANS = 50;
const MAX_TASKS = 100;
const MAX_SECTIONS = 500;
const MAX_FRONTMATTER_LINES = 3000;
const MAX_TABLES_PER_SECTION = 20;
const MAX_FIELDS = 200;

// ---------------------------------------------------------------------------
// Status classifiers — ported from gen-data.mjs
// ---------------------------------------------------------------------------

export function truthStatusOf(raw: string): VerificationTruthState {
  const t = raw.slice(0, 600).toUpperCase();
  const flat = t.split('PRESENT_BEHAVIOR_UNVERIFIED').join('⚠');
  const ok = /✓|(?<!_UN)VERIFIED|PASS/.test(flat);
  const warn = /⚠|BEHAVIOR_UNVERIFIED/.test(t);
  const unsure = /\?|UNCERTAIN|NEEDS HUMAN/.test(t);
  if (t.includes('OVERRIDE')) return 'override';
  if (/✗|FAILED/.test(t)) return 'failed';
  if (ok && (warn || unsure)) return 'mixed';
  if (warn) return 'unverified';
  if (unsure) return 'uncertain';
  if (ok) return t.includes('COINCIDENTAL') ? 'coincidental' : 'verified';
  return 'uncertain';
}

export function requirementStatusOf(raw: string): VerificationRequirementState {
  const t = raw.slice(0, 600).toUpperCase();
  if (t.startsWith('✓')) return /\?|HUMAN|WARNING|\(|\//.test(t) ? 'partial' : 'satisfied';
  if (/✗|BLOCKED|FAIL/.test(t)) return 'blocked';
  const met = /✓|SATISFIED|MET/.test(t);
  if (met && /\?|HUMAN|WARNING|\(/.test(t)) return 'partial';
  if (/\?|HUMAN/.test(t)) return 'human';
  if (met) return 'satisfied';
  return 'human';
}

export function severityOf(raw: string): VerificationSeverity {
  const text = raw.slice(0, 300);
  if (text.includes('✓') || text.trimStart().toLowerCase().startsWith('none')) return 'clear';
  if (text.includes('\u{1f6d1}') || text.toLowerCase().includes('blocker')) return 'blocker';
  if (text.includes('⚠') || text.toLowerCase().includes('warn')) return 'warning';
  return 'info';
}

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------

function emptyReport(): VerificationReportBody {
  return {
    h1: null,
    goal: null,
    reVerification: null,
    scoreLine: null,
    verifier: null,
    truths: [],
    requirements: [],
    antiPatterns: [],
    antiNote: null,
    humanChecks: [],
    humanTitles: [],
    humanNote: null,
    gaps: { critical: [], nonCritical: [] },
    gapProse: null,
    fixPlans: [],
    fixShape: null,
    metadata: { approach: null, source: null, automatedPassed: null, automatedFailed: null, duration: null },
    spotChecks: [],
    anchors: { truths: null, requirements: null, anti: null, human: null, gaps: null, fixPlans: null, spot: null },
    sections: [],
  };
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isLower(ch: string | undefined): boolean {
  return ch !== undefined && ch >= 'a' && ch <= 'z';
}

function isUpperOrDigit(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= 'A' && ch <= 'Z') || isDigit(ch));
}

function cap(text: string, max: number = MAX_TEXT): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Whitespace runs collapsed to one space, trimmed, capped. */
function squash(text: string, max: number = MAX_TEXT): string {
  return cap(text.slice(0, max * 2).replace(/\s+/g, ' ').trim(), max);
}

function capFirst(text: string): string {
  return text === '' ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** `**bold**` and backticks removed, lower-cased - what the heading checks match. */
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

/** The lines of `text` with fenced code blocks emptied (so nothing inside one is read as a table,
 * a field or a list), every line clipped by the caller's split. */
function linesOutsideFences(text: string): string[] {
  const lines = text.split('\n');
  let fenceCh = '';
  let fenceLen = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (fenceCh !== '') {
      let len = 0;
      while (len < trimmed.length && trimmed[len] === fenceCh) len += 1;
      const closes = len >= fenceLen && trimmed.slice(len).trim() === '';
      lines[i] = '';
      if (closes) fenceCh = '';
      continue;
    }
    const ch = trimmed[0];
    if (ch === '`' || ch === '~') {
      let len = 0;
      while (len < trimmed.length && trimmed[len] === ch) len += 1;
      if (len >= 3) {
        fenceCh = ch;
        fenceLen = len;
        lines[i] = '';
      }
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Labelled fields: `**Label:** value`, continued across non-blank, non-labelled lines
// ---------------------------------------------------------------------------

interface Field {
  key: string;
  value: string;
}

/** `**Label:** rest` / `**Label**: rest` (a list marker first is allowed) -> its parts, else null. */
function labelOf(line: string): { key: string; rest: string } | null {
  let t = line.trim();
  if (t.length > 2 && (t[0] === '-' || t[0] === '*') && t[1] === ' ') t = t.slice(2).trimStart();
  if (!t.startsWith('**')) return null;
  const close = t.indexOf('**', 2);
  if (close === -1 || close > 120) return null;
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
  if (label === '') return null;
  return { key: label.toLowerCase(), rest: rest.trim() };
}

function readFields(lines: string[]): Field[] {
  const fields: Field[] = [];
  let current: { key: string; parts: string[] } | null = null;
  const flush = (): void => {
    if (current !== null && fields.length < MAX_FIELDS) {
      fields.push({ key: current.key, value: squash(current.parts.join(' ')) });
    }
    current = null;
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      flush();
      continue;
    }
    const label = labelOf(line);
    if (label !== null) {
      flush();
      current = { key: label.key, parts: label.rest === '' ? [] : [label.rest] };
      continue;
    }
    if (current !== null) current.parts.push(trimmed);
  }
  flush();
  return fields;
}

function fieldOf(fields: Field[], ...keys: string[]): string | null {
  for (const key of keys) {
    const found = fields.find((f) => f.key === key);
    if (found && found.value !== '') return found.value;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

interface Table {
  head: string[];
  rows: Record<string, string>[];
}

/** Splits one pipe row into cells: one leading and one trailing pipe dropped, a split on every pipe
 * that is not backslash-escaped and not inside a *balanced* backtick span (a run of N backticks
 * opens a span only when a later run of exactly N closes it, as CommonMark reads it). The shared
 * `splitRow` toggles on every backtick, so a cell holding ``$` `` swallowed the cells after it
 * (labelore's own phase 5 report). A single forward scan; the closing-run search is bounded by the
 * 8000-character line clip. */
function splitCells(line: string): string[] {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && text[i + 1] === '|') {
      current += '|';
      i += 2;
      continue;
    }
    if (ch === '`') {
      let run = 0;
      while (text[i + run] === '`') run += 1;
      let close = -1;
      let j = i + run;
      while (j < text.length) {
        if (text[j] !== '`') {
          j += 1;
          continue;
        }
        let len = 0;
        while (text[j + len] === '`') len += 1;
        if (len === run) {
          close = j + len;
          break;
        }
        j += len;
      }
      const end = close === -1 ? i + run : close;
      current += text.slice(i, end).split('\\|').join('|');
      i = end;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(line: string): boolean {
  const cells = splitCells(line);
  if (cells.length === 0) return false;
  for (const cell of cells) {
    if (cell.length === 0) return false;
    for (const ch of cell) if (ch !== '-' && ch !== ':' && ch !== ' ') return false;
    if (!cell.includes('-')) return false;
  }
  return true;
}

function tablesIn(lines: string[]): Table[] {
  const out: Table[] = [];
  for (let i = 0; i + 1 < lines.length && out.length < MAX_TABLES_PER_SECTION; i++) {
    const head = lines[i].trim();
    if (!head.startsWith('|') || !lines[i + 1].trim().startsWith('|') || !isSeparatorRow(lines[i + 1])) continue;
    const names = splitCells(head).map((h) => h.replace(/[*`]/g, '').trim().toLowerCase());
    const rows: Record<string, string>[] = [];
    i += 2;
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      if (rows.length < MAX_ITEMS) {
        const cells = splitCells(lines[i]);
        const row: Record<string, string> = {};
        names.forEach((name, index) => {
          if (!(name in row)) row[name] = cap(cells[index] ?? '');
        });
        rows.push(row);
      }
      i += 1;
    }
    i -= 1;
    out.push({ head: names, rows });
  }
  return out;
}

/** The first cell whose header equals or starts with one of `names` (tried in order). */
function col(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    for (const key of Object.keys(row)) {
      if (key === name || key.startsWith(name)) return row[key];
    }
  }
  return '';
}

function headHas(table: Table, prefix: string): boolean {
  return table.head.some((h) => h.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Numbered `1. **Name**` blocks with `- Field: value` lines (the template's gap blocks)
// ---------------------------------------------------------------------------

interface NumberedBlock {
  name: string;
  rest: string;
  fields: Record<string, string>;
}

/** `12. **Name** rest` -> its parts, else null. */
function numberedBoldOf(line: string): { name: string; rest: string } | null {
  const t = line.trimStart();
  let i = 0;
  while (i < t.length && i < 4 && isDigit(t[i])) i += 1;
  if (i === 0 || t[i] !== '.' || (t[i + 1] !== ' ' && t[i + 1] !== '\t')) return null;
  const after = t.slice(i + 2).trimStart();
  if (!after.startsWith('**')) return null;
  const close = after.indexOf('**', 2);
  if (close === -1) return null;
  return { name: after.slice(2, close).trim(), rest: after.slice(close + 2).trim() };
}

function numberedBlocks(lines: string[]): NumberedBlock[] {
  const out: NumberedBlock[] = [];
  let current: NumberedBlock | null = null;
  let lastKey: string | null = null;
  for (const line of lines) {
    const head = numberedBoldOf(line);
    if (head !== null) {
      if (out.length >= MAX_GAPS) break;
      current = { name: cap(head.name), rest: cap(head.rest), fields: {} };
      out.push(current);
      lastKey = null;
      continue;
    }
    if (current === null) continue;
    const t = line.trim();
    if (t === '') {
      lastKey = null;
      continue;
    }
    if (line[0] === ' ' || line[0] === '\t') {
      if ((t[0] === '-' || t[0] === '*') && t[1] === ' ') {
        const body = t.slice(2);
        const colon = body.indexOf(':');
        if (colon > 0 && colon <= 30) {
          let letters = true;
          for (let k = 0; k < colon; k++) {
            const ch = body[k].toLowerCase();
            if (!((ch >= 'a' && ch <= 'z') || ch === ' ')) {
              letters = false;
              break;
            }
          }
          if (letters) {
            lastKey = body.slice(0, colon).trim().toLowerCase();
            current.fields[lastKey] = cap(body.slice(colon + 1).trim());
            continue;
          }
        }
      }
      if (lastKey !== null) current.fields[lastKey] = squash(`${current.fields[lastKey]} ${t}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sections: every `##` / `###` heading in document order
// ---------------------------------------------------------------------------

interface FlatSection {
  heading: string;
  level: 2 | 3;
  lines: string[];
  handled: boolean;
}

function flattenSections(body: string): { preamble: string; sections: FlatSection[] } {
  const top = splitWithPreamble(body, 2);
  const sections: FlatSection[] = [];
  const push = (heading: string, level: 2 | 3, text: string): void => {
    if (sections.length >= MAX_SECTIONS) return;
    sections.push({ heading: cap(heading, 300), level, lines: linesOutsideFences(text), handled: false });
  };
  // `###` headings that sit before the first `##` belong to the document preamble.
  const lead = splitWithPreamble(top.preamble, 3);
  for (const sub of lead.sections) push(sub.heading, 3, sub.body);
  for (const section of top.sections) {
    const split = splitWithPreamble(section.body, 3);
    push(section.heading, 2, split.preamble);
    for (const sub of split.sections) push(sub.heading, 3, sub.body);
  }
  return { preamble: lead.preamble, sections };
}

function isBlankBody(lines: string[]): boolean {
  let first = '';
  let count = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t === '') continue;
    count += 1;
    if (first === '') first = t;
    if (count > 3) return false;
  }
  if (count === 0) return true;
  let text = first;
  while (text.length > 0 && (text[0] === '*' || text[0] === '_' || text[0] === ' ')) text = text.slice(1);
  text = text.toLowerCase();
  if (text.startsWith('n/a')) return true;
  if (!text.startsWith('none')) return false;
  const next = text[4];
  return next === undefined || !(isLower(next) || isDigit(next));
}

// ---------------------------------------------------------------------------
// Prose gap-closure shape: `1. **Name:** task; task, and task.`
// ---------------------------------------------------------------------------

/** True when `text` at `index` is `, ` (optionally `, and `) followed by a lower-case word and a space. */
function commaSplitLength(text: string, index: number): number {
  if (text[index] !== ',') return 0;
  let i = index + 1;
  while (text[i] === ' ') i += 1;
  if (text.startsWith('and ', i)) {
    i += 4;
    while (text[i] === ' ') i += 1;
  }
  const wordStart = i;
  while (isLower(text[i])) i += 1;
  if (i === wordStart || text[i] !== ' ') return 0;
  return wordStart - index;
}

function splitProseTasks(text: string): string[] {
  const out: string[] = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ';') {
      out.push(current);
      current = '';
      while (text[i + 1] === ' ') i += 1;
      continue;
    }
    const skip = commaSplitLength(text, i);
    if (skip > 0) {
      out.push(current);
      current = '';
      i += skip - 1;
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function isVerifyTask(text: string, prose: boolean): boolean {
  const lower = text.trimStart().toLowerCase();
  if (lower.startsWith('verify')) return true;
  return prose && lower.includes('regression tests');
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

function firstH1(body: string): string | null {
  const lines = body.split('\n', 400);
  for (const line of lines) {
    if (line.length > 2 && line[0] === '#' && line[1] === ' ') return squash(line.slice(2), 600);
  }
  return null;
}

function planTokens(text: string): string[] {
  const out: string[] = [];
  for (const token of text.slice(0, 1000).split(/[^0-9-]+/)) {
    if (token === '' || out.length >= 40) continue;
    const dash = token.indexOf('-');
    if (dash <= 0 || dash !== token.lastIndexOf('-')) continue;
    if (!isDigit(token[dash + 1])) continue;
    out.push(token);
  }
  return out;
}

/** `PLAT-01: description` -> its parts; otherwise the whole cell is the id. */
function splitRequirementId(cell: string): { id: string; description: string } {
  const text = cell.replace(/[*`]/g, '').trim();
  let i = 0;
  if (!isUpperOrDigit(text[0]) || isDigit(text[0])) return { id: cap(text, 120), description: '' };
  while (i < text.length && isUpperOrDigit(text[i])) i += 1;
  if (text[i] !== '-') return { id: cap(text, 120), description: '' };
  i += 1;
  const digits = i;
  while (i < text.length && isDigit(text[i])) i += 1;
  if (i === digits) return { id: cap(text, 120), description: '' };
  if (isLower(text[i]) && !isLower(text[i + 1])) i += 1;
  const id = text.slice(0, i);
  const rest = text.slice(i);
  if (rest === '') return { id, description: '' };
  if (rest[0] !== ':' && rest[0] !== ' ') return { id: cap(text, 120), description: '' };
  return { id, description: cap(rest.slice(1).trim()) };
}

function countBefore(text: string, word: string): number | null {
  const at = text.toLowerCase().indexOf(word);
  if (at <= 0) return null;
  let end = at;
  while (end > 0 && text[end - 1] === ' ') end -= 1;
  let start = end;
  while (start > 0 && isDigit(text[start - 1])) start -= 1;
  if (start === end) return null;
  return Number(text.slice(start, end));
}

function verifierOf(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 400; i--) {
    let t = lines[i].trim();
    if (t.length === 0 || t.length > 300 || t[0] === '|') continue;
    while (t.length > 0 && (t[0] === '*' || t[0] === '_' || t[0] === ' ')) t = t.slice(1);
    if (!t.toLowerCase().startsWith('verifier')) continue;
    let rest = t.slice('verifier'.length);
    while (rest.length > 0 && (rest[0] === ':' || rest[0] === '*' || rest[0] === '_' || rest[0] === ' ')) {
      rest = rest.slice(1);
    }
    while (rest.length > 0 && (rest.endsWith('*') || rest.endsWith('_') || rest.endsWith(' '))) rest = rest.slice(0, -1);
    return rest === '' ? null : rest;
  }
  return null;
}

function numberedTitle(heading: string): string | null {
  let i = 0;
  while (i < heading.length && i < 4 && isDigit(heading[i])) i += 1;
  if (i === 0) return null;
  if (heading[i] !== '.' && heading[i] !== ')') return null;
  return heading.slice(i + 1).trim();
}

export function extractVerificationReport(rawBody: string): VerificationReportBody {
  const report = emptyReport();
  if (typeof rawBody !== 'string' || rawBody === '') return report;
  const body = stripFrontmatter(rawBody);
  report.h1 = firstH1(body);
  const { preamble, sections } = flattenSections(body);
  const preambleLines = linesOutsideFences(preamble);

  // ---- preamble fields -------------------------------------------------------------------
  const preambleFields = readFields(preambleLines);
  report.goal = fieldOf(preambleFields, 'phase goal', 'goal');
  report.reVerification = fieldOf(preambleFields, 're-verification');
  report.scoreLine = fieldOf(preambleFields, 'score');
  const sectionFields = new Map<number, Field[]>();
  const fieldsOfSection = (index: number): Field[] => {
    let fields = sectionFields.get(index);
    if (!fields) {
      fields = readFields(sections[index].lines);
      sectionFields.set(index, fields);
    }
    return fields;
  };
  if (report.goal === null || report.reVerification === null || report.scoreLine === null) {
    for (let i = 0; i < sections.length; i++) {
      const fields = fieldsOfSection(i);
      report.goal ??= fieldOf(fields, 'phase goal', 'goal');
      report.reVerification ??= fieldOf(fields, 're-verification');
      report.scoreLine ??= fieldOf(fields, 'score');
      if (report.goal !== null && report.reVerification !== null && report.scoreLine !== null) break;
    }
  }

  // ---- truth tables: any table with a Truth column, in any section -------------------------
  const considerTruths = (table: Table, title: string): boolean => {
    if (!headHas(table, 'truth')) return false;
    for (const row of table.rows) {
      if (report.truths.length >= MAX_ITEMS) break;
      const text = col(row, 'truth');
      if (text === '') continue;
      const plan = col(row, 'plan');
      const lowerTitle = norm(title);
      const group =
        plan !== ''
          ? `Plan ${plan}`
          : lowerTitle.includes('roadmap') || lowerTitle.includes('success')
            ? 'Roadmap success criteria'
            : lowerTitle.includes('plan')
              ? 'Plan must-haves'
              : 'Observable truths';
      const statusRaw = col(row, 'status');
      report.truths.push({
        n: col(row, '#') || String(report.truths.length + 1),
        group,
        text,
        statusRaw,
        status: truthStatusOf(statusRaw),
        evidence: col(row, 'evidence', 'details'),
      });
    }
    return true;
  };
  for (const table of tablesIn(preambleLines)) considerTruths(table, '');
  sections.forEach((section) => {
    for (const table of tablesIn(section.lines)) {
      if (considerTruths(table, section.heading)) {
        section.handled = true;
        report.anchors.truths ??= section.heading;
      }
    }
  });

  // ---- Goal Achievement (prose lives in Source) ---------------------------------------------
  for (const section of sections) {
    if (norm(section.heading).startsWith('goal achievement')) section.handled = true;
  }

  // ---- requirements ---------------------------------------------------------------------------
  const reqIndex = sections.findIndex((s) => norm(s.heading).includes('requirements coverage'));
  if (reqIndex !== -1) {
    const table = tablesIn(sections[reqIndex].lines).find((t) => headHas(t, 'requirement'));
    if (table) {
      sections[reqIndex].handled = true;
      report.anchors.requirements = sections[reqIndex].heading;
      for (const row of table.rows) {
        if (report.requirements.length >= MAX_ITEMS) break;
        const idCell = col(row, 'requirement');
        if (idCell === '') continue;
        const split = splitRequirementId(idCell);
        const statusRaw = col(row, 'status');
        const note = col(row, 'evidence', 'blocking issue');
        report.requirements.push({
          id: split.id,
          description: col(row, 'description') || split.description,
          plans: planTokens(col(row, 'source plan', 'plans')),
          statusRaw,
          status: requirementStatusOf(statusRaw),
          note: note.trim() === '-' ? '' : note,
        });
      }
    }
  }

  // ---- anti-patterns --------------------------------------------------------------------------
  const antiIndex = sections.findIndex((s) => norm(s.heading).includes('anti-pattern'));
  if (antiIndex !== -1) {
    const section = sections[antiIndex];
    section.handled = true;
    report.anchors.anti = section.heading;
    const table = tablesIn(section.lines)[0];
    if (table) {
      for (const row of table.rows) {
        if (report.antiPatterns.length >= MAX_ITEMS) break;
        const severityRaw = col(row, 'severity');
        report.antiPatterns.push({
          file: col(row, 'file').replace(/`/g, '').trim(),
          line: col(row, 'line'),
          pattern: col(row, 'pattern'),
          severityRaw,
          severity: severityOf(severityRaw),
          impact: col(row, 'impact'),
        });
      }
    }
    const prose = section.lines.filter((l) => {
      const t = l.trim();
      if (t.startsWith('|')) return false;
      const label = labelOf(l);
      return !(label !== null && label.key.startsWith('anti-pattern'));
    });
    const note = squash(prose.join(' '));
    report.antiNote = note === '' ? null : note;
  }

  // ---- human checks ---------------------------------------------------------------------------
  const candidates: number[] = [];
  sections.forEach((section, index) => {
    if (norm(section.heading).includes('human verification')) candidates.push(index);
  });
  const membersOf = (index: number): number[] => {
    const base = sections[index];
    const members: number[] = [];
    for (let j = index + 1; j < sections.length; j++) {
      const next = sections[j];
      const numbered = numberedTitle(next.heading) !== null;
      if (next.level > base.level) {
        if (numbered || fieldOf(fieldsOfSection(j), 'test') !== null) members.push(j);
        continue;
      }
      if (next.level === base.level && numbered) {
        members.push(j);
        continue;
      }
      break;
    }
    return members;
  };
  let chosen = -1;
  let chosenMembers: number[] = [];
  for (const index of candidates) {
    const members = membersOf(index);
    if (members.length > 0) {
      chosen = index;
      chosenMembers = members;
      break;
    }
  }
  if (chosen === -1) {
    const unresolved = candidates.find((index) => !norm(sections[index].heading).includes('resolved'));
    if (unresolved !== undefined) chosen = unresolved;
  }
  if (chosen !== -1) {
    sections[chosen].handled = true;
    report.anchors.human = sections[chosen].heading;
    for (const j of chosenMembers) {
      sections[j].handled = true;
      if (report.humanChecks.length >= MAX_HUMAN) continue;
      const fields = fieldsOfSection(j);
      report.humanChecks.push({
        title: numberedTitle(sections[j].heading) ?? sections[j].heading,
        test: fieldOf(fields, 'test'),
        expected: fieldOf(fields, 'expected'),
        why: fieldOf(fields, 'why human', 'why_human', 'why'),
      });
    }
    const own = sections[chosen].lines;
    for (const line of own) {
      if (report.humanTitles.length >= MAX_HUMAN) break;
      const bold = numberedBoldOf(line);
      if (bold !== null && bold.name !== '') report.humanTitles.push(bold.name);
    }
    const lead: string[] = [];
    for (const line of own) {
      if (numberedBoldOf(line) !== null) break;
      const t = line.trim();
      let marker = 0;
      while (marker < t.length && marker < 4 && isDigit(t[marker])) marker += 1;
      if (marker > 0 && (t[marker] === '.' || t[marker] === ')') && t[marker + 1] === ' ') break;
      if (t.startsWith('|')) continue;
      lead.push(t);
    }
    const note = squash(lead.join(' '), 600);
    report.humanNote = note === '' ? null : note;
  }

  // ---- gaps -----------------------------------------------------------------------------------
  const gapIndex = sections.findIndex((s) => norm(s.heading).startsWith('gaps summary'));
  const children: number[] = [];
  if (gapIndex !== -1) {
    sections[gapIndex].handled = true;
    report.anchors.gaps = sections[gapIndex].heading;
    const prose = squash(sections[gapIndex].lines.join(' '));
    report.gapProse = prose === '' ? null : prose;
    for (let j = gapIndex + 1; j < sections.length; j++) {
      if (sections[j].level === 2) break;
      children.push(j);
    }
  }
  const isNonCritical = (title: string): boolean => {
    const t = norm(title);
    return t.includes('non-critical') || t.includes('can defer');
  };
  const isCritical = (title: string): boolean => {
    const t = norm(title);
    return !isNonCritical(title) && (t.includes('block progress') || t.includes('critical gaps') || t.startsWith('critical'));
  };
  const toGap = (block: NumberedBlock): VerificationTemplateGap => ({
    name: block.name,
    missing: block.fields.missing ?? block.fields.issue ?? null,
    impact: block.fields.impact ?? null,
    fix: block.fields.fix ?? block.fields.recommendation ?? null,
    fixLabel: block.fields.recommendation !== undefined && block.fields.fix === undefined ? 'Recommendation' : 'Fix',
  });
  const critIndex = children.find((j) => isCritical(sections[j].heading));
  const nonIndex = children.find((j) => isNonCritical(sections[j].heading));
  if (critIndex !== undefined) {
    sections[critIndex].handled = true;
    report.gaps.critical = numberedBlocks(sections[critIndex].lines).map(toGap);
  }
  if (nonIndex !== undefined) {
    sections[nonIndex].handled = true;
    report.gaps.nonCritical = numberedBlocks(sections[nonIndex].lines).map(toGap);
  }

  // ---- fix plans: Recommended Fix Plans, else the prose gap-closure shape ---------------------
  const planIndex = sections.findIndex((s) => norm(s.heading).includes('recommended fix plans'));
  if (planIndex !== -1) {
    const base = sections[planIndex];
    base.handled = true;
    report.anchors.fixPlans = base.heading;
    report.fixShape = 'plans';
    for (let j = planIndex + 1; j < sections.length; j++) {
      const sub = sections[j];
      if (sub.level <= base.level) break;
      sub.handled = true;
      if (report.fixPlans.length >= MAX_PLANS) continue;
      const colon = sub.heading.indexOf(':');
      const head = colon === -1 ? '' : sub.heading.slice(0, colon).trim();
      const isFile = head.toLowerCase().endsWith('.md') && !head.includes(' ');
      const fields = fieldsOfSection(j);
      const tasks: VerificationFixTask[] = [];
      for (const line of sub.lines) {
        const trimmed = line.trimStart();
        let k = 0;
        while (k < trimmed.length && k < 4 && isDigit(trimmed[k])) k += 1;
        if (k === 0 || trimmed[k] !== '.' || (trimmed[k + 1] !== ' ' && trimmed[k + 1] !== '\t')) continue;
        if (tasks.length >= MAX_TASKS) break;
        const text = squash(trimmed.slice(k + 2));
        if (text !== '') tasks.push({ text, verify: isVerifyTask(text, false) });
      }
      report.fixPlans.push({
        file: isFile ? head : null,
        name: squash(isFile ? sub.heading.slice(colon + 1) : sub.heading, 300),
        objective: fieldOf(fields, 'objective'),
        tasks,
        scope: fieldOf(fields, 'estimated scope', 'scope'),
      });
    }
  } else {
    const closure = children.find((j) => {
      const t = norm(sections[j].heading);
      return t.includes('gap-closure') || t.includes('closure shape') || t.includes('fix plan');
    });
    if (closure !== undefined) {
      const sub = sections[closure];
      sub.handled = true;
      report.anchors.fixPlans = sub.heading;
      report.fixShape = 'prose';
      for (const line of sub.lines) {
        if (report.fixPlans.length >= MAX_PLANS) break;
        const item = numberedBoldOf(line);
        if (item === null) continue;
        let name = item.name;
        if (name.endsWith(':')) name = name.slice(0, -1).trim();
        let rest = item.rest;
        if (rest.startsWith(':')) rest = rest.slice(1).trim();
        if (rest === '') continue;
        const tasks: VerificationFixTask[] = [];
        for (const piece of splitProseTasks(rest.slice(0, MAX_TEXT))) {
          if (tasks.length >= MAX_TASKS) break;
          let text = squash(piece);
          if (text.endsWith('.')) text = text.slice(0, -1).trim();
          if (text === '') continue;
          tasks.push({ text: capFirst(text), verify: isVerifyTask(text, true) });
        }
        report.fixPlans.push({ file: null, name: squash(name, 300), objective: null, tasks, scope: null });
      }
      if (report.fixPlans.length === 0) report.fixShape = null;
    }
  }

  // ---- verification metadata ------------------------------------------------------------------
  const metaIndex = sections.findIndex((s) => norm(s.heading).includes('verification metadata'));
  if (metaIndex !== -1) {
    sections[metaIndex].handled = true;
    const fields = fieldsOfSection(metaIndex);
    const automated = fieldOf(fields, 'automated checks');
    report.metadata = {
      approach: fieldOf(fields, 'verification approach'),
      source: fieldOf(fields, 'must-haves source'),
      automatedPassed: automated === null ? null : (countBefore(automated, 'passed') ?? 0),
      automatedFailed: automated === null ? null : (countBefore(automated, 'failed') ?? 0),
      duration: fieldOf(fields, 'total verification time'),
    };
  }

  // ---- behavioral spot-checks (stays unhandled: it lands in "Also in this report") ------------
  const spotIndex = sections.findIndex((s) => norm(s.heading).includes('behavioral spot-checks'));
  if (spotIndex !== -1) {
    report.anchors.spot = sections[spotIndex].heading;
    const table = tablesIn(sections[spotIndex].lines)[0];
    if (table) {
      for (const row of table.rows) {
        if (report.spotChecks.length >= MAX_ITEMS) break;
        const statusRaw = col(row, 'status');
        const upper = statusRaw.toUpperCase();
        report.spotChecks.push({
          behavior: col(row, 'behavior'),
          command: col(row, 'command'),
          result: col(row, 'result'),
          status: /✗|FAIL/.test(upper) ? 'fail' : /SKIP|\?/.test(upper) ? 'skip' : 'pass',
          statusRaw,
        });
      }
    }
  }

  // ---- verifier footer and the section ledger -------------------------------------------------
  report.verifier = verifierOf(body.split('\n').slice(-400));
  report.sections = sections.map((section) => ({
    heading: section.heading,
    level: section.level,
    handled: section.handled,
    blank: isBlankBody(section.lines),
  }));
  return report;
}
