// The SECURITY.md projection (quick-261003-527, sketch 017 winner D): a tolerant, fence-aware,
// line-scanned read of a phase's threat contract into `SecurityRegister` — the lead paragraph, the
// trust boundaries, the threat register (one row shape, including grouped registers and registers
// without a Component column, with its note and legend), the accepted-risks log, the audit trail,
// the sign-off checklist, every other `##` section, the block_on hint and a section ledger so the
// composer can prove nothing was dropped silently. It is a port of the sketch's `gen-data.mjs` parse
// with the pattern-map.ts / uat-session.ts discipline.
// T-527-01: the `##` split goes through `splitWithPreamble` (fence-aware, every line clipped to
// MAX_LINE up front); table cells go through the linear `splitRow`; every regular expression below
// is a literal applied to one clipped line or one clipped cell at a time, none nests an unbounded
// quantifier, and none is built from document text — so one pathological line cannot make any scan
// expensive. `extractSecurityRegister` is pure (no fs access) and never throws on a string;
// `SecurityHandler.parse` still wraps it in try/catch (T-527-04).
import { parseBlocks } from './context-brief.ts';
import type { Block } from './context-brief.ts';
import { splitRow } from './pattern-map.ts';
import { splitWithPreamble } from './research-briefing.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type SecuritySeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';
export type SecurityRowStatus = 'open' | 'open-low' | 'closed' | 'unknown';

export interface SecurityBoundaryRow {
  name: string;
  /** The text before the first arrow in the name; null when the name has no arrow (a data store). */
  from: string | null;
  to: string | null;
  description: string;
  data: string;
}

export interface SecurityBoundaries {
  rows: SecurityBoundaryRow[];
  note: Block[];
}

export interface SecurityThreatRow {
  /** The id cell as written (`T-03-01`, or a comma list for a grouped row). */
  id: string;
  /** Every `T-…` token in the id cell, in order. */
  ids: string[];
  /** The group cell of a grouped register; null otherwise. */
  group: string | null;
  category: string;
  component: string;
  severity: { top: SecuritySeverityLevel; raw: string };
  disposition: string;
  status: SecurityRowStatus;
  statusRaw: string;
  mitigation: string;
}

export interface SecurityThreatRegister {
  grouped: boolean;
  rows: SecurityThreatRow[];
  /** Text between the heading and the table (LB v1.0/02's "69 unique threats …"). */
  note: Block[];
  /** The italic legend lines after the table, as written. */
  legend: string;
  /** The author's own text when the section has no table; null otherwise. */
  prose: Block[] | null;
}

export interface SecurityRiskRow {
  id: string;
  /** The Threat Ref cell as written. */
  ref: string;
  /** Every `T-…` token in the ref cell. */
  refs: string[];
  rationale: string;
  by: string;
  date: string;
}

export interface SecurityRisks {
  rows: SecurityRiskRow[];
  /** The text around the table, or the whole section when it has no table (prose-only risks). */
  note: Block[];
}

export interface SecurityAuditRow {
  date: string;
  total: string;
  closed: string;
  open: string;
  by: string;
}

export interface SecurityAudit {
  rows: SecurityAuditRow[];
  note: Block[];
}

export interface SecuritySignoffItem {
  checked: boolean;
  text: string;
}

export interface SecuritySignoff {
  items: SecuritySignoffItem[];
  /** The text after `**Approval:**`; null when the line is absent. */
  approval: string | null;
  note: Block[];
}

export interface SecurityExtra {
  heading: string;
  blocks: Block[];
}

export interface SecuritySection {
  heading: string;
  /** True for the five sections the console consumes itself. */
  claimed: boolean;
}

export interface SecurityRegister {
  /** The preamble between the H1 and the first `##`, without the H1, blockquote and rules. */
  lead: Block[];
  boundaries: SecurityBoundaries | null;
  register: SecurityThreatRegister | null;
  risks: SecurityRisks | null;
  audit: SecurityAudit | null;
  signoff: SecuritySignoff | null;
  extras: SecurityExtra[];
  /** The severity level the register legend names as the blocking threshold; null when none. */
  blockOn: string | null;
  sections: SecuritySection[];
}

// ---------------------------------------------------------------------------
// Line and table helpers
// ---------------------------------------------------------------------------

const MAX_ROWS = 3000;
const MAX_SECTIONS = 200;
const MAX_ITEMS = 500;

/** A horizontal rule: three or more of one of `-`, `*`, `_` (spaces allowed). */
function isRule(line: string): boolean {
  const text = line.trim();
  if (text.length < 3) return false;
  const ch = text[0];
  if (ch !== '-' && ch !== '*' && ch !== '_') return false;
  for (const c of text) if (c !== ch && c !== ' ') return false;
  return true;
}

/** A pipe separator row: starts with a pipe, holds only pipes, dashes, colons and spaces, and has a dash. */
function isSeparatorRow(line: string): boolean {
  const text = line.trim();
  if (!text.startsWith('|')) return false;
  let dash = false;
  for (const c of text) {
    if (c === '-') dash = true;
    else if (c !== '|' && c !== ':' && c !== ' ') return false;
  }
  return dash;
}

/** A `###`-or-deeper heading line's text, or null. */
function subHeadingText(line: string): string | null {
  const text = line.trim();
  let n = 0;
  while (n < text.length && text[n] === '#') n += 1;
  if (n < 3 || n > 6 || text[n] !== ' ') return null;
  const rest = text.slice(n).trim();
  return rest === '' ? null : rest;
}

/** Text -> blocks: rules dropped, a `###` heading line kept as a bold line, then `parseBlocks`. */
function blocksOf(text: string): Block[] {
  if (text.trim() === '') return [];
  const kept: string[] = [];
  for (const line of text.split('\n')) {
    if (isRule(line)) continue;
    const sub = subHeadingText(line);
    kept.push(sub === null ? line : `**${sub}**`);
  }
  return parseBlocks(kept.join('\n'));
}

interface TableRead {
  head: string[];
  rows: string[][];
  before: string;
  after: string;
}

function stripAsterisks(text: string): string {
  return text.split('*').join('').trim();
}

/** The first pipe table: a pipe line whose next line is a separator row. Header cells lose their
 * asterisks; body rows run until the first non-pipe line; the text before and after is kept. */
function readTable(body: string): TableRead | null {
  const lines = body.split('\n');
  let start = -1;
  for (let i = 0; i + 1 < lines.length; i++) {
    if (lines[i].trim().startsWith('|') && isSeparatorRow(lines[i + 1])) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const head = splitRow(lines[start]).map(stripAsterisks);
  const rows: string[][] = [];
  let k = start + 2;
  while (k < lines.length && lines[k].trim().startsWith('|')) {
    if (rows.length < MAX_ROWS) rows.push(splitRow(lines[k]));
    k += 1;
  }
  return {
    head,
    rows,
    before: lines.slice(0, start).join('\n').trim(),
    after: lines.slice(k).join('\n').trim(),
  };
}

function colIndex(head: string[], test: (h: string) => boolean): number {
  return head.findIndex((h) => test(h.toLowerCase()));
}

function cell(row: string[], index: number): string {
  return index >= 0 ? (row[index] ?? '') : '';
}

/** Every `T-…` token in a cell, in order. */
function threatIds(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/T-[\w-]+/g)) {
    found.push(match[0]);
    if (found.length >= 200) break;
  }
  return found;
}

// ---------------------------------------------------------------------------
// Severity and status
// ---------------------------------------------------------------------------

const LEVELS: readonly SecuritySeverityLevel[] = ['critical', 'high', 'medium', 'low'];

/** The first of critical / high / medium / low found in the text (`med` read as medium). */
function severityOf(raw: string): { top: SecuritySeverityLevel; raw: string } {
  const lower = raw.toLowerCase().replace(/\bmed\b/g, 'medium');
  const hit = LEVELS.find((level) => lower.includes(level));
  return { top: hit ?? 'unknown', raw };
}

/** The doc's own Status cell: below / non-blocking -> open-low, starts with open -> open, accepted /
 * closed / verified / mitigated / resolved -> closed, anything else unknown. */
function statusOf(raw: string): SecurityRowStatus {
  const text = raw.toLowerCase().split('*').join('').trim();
  if (text.includes('below') || text.includes('non-blocking')) return 'open-low';
  if (text.startsWith('open')) return 'open';
  if (text.includes('accepted')) return 'closed';
  if (
    text.includes('closed') ||
    text.includes('verified') ||
    text.includes('mitigated') ||
    text.includes('resolved')
  ) {
    return 'closed';
  }
  return 'unknown';
}

/** `block_on <level>`, "at or above <level>" or "below <level> threshold" in the legend lines. */
function blockOnOf(legend: string): string | null {
  for (const line of legend.split('\n')) {
    const a = /block_on[:\s`=]*(critical|high|medium|low)/i.exec(line);
    if (a) return a[1].toLowerCase();
    const b = /at or above\s+`?(critical|high|medium|low)/i.exec(line);
    if (b) return b[1].toLowerCase();
    const c = /below\s+(critical|high|medium|low)\s+threshold/i.exec(line);
    if (c) return c[1].toLowerCase();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function boundariesOf(body: string): SecurityBoundaries {
  const table = readTable(body);
  if (!table) return { rows: [], note: blocksOf(body) };
  const iName = Math.max(
    colIndex(table.head, (h) => h.includes('boundary') || h === 'name'),
    0,
  );
  const dIdx = colIndex(table.head, (h) => h.includes('descr'));
  const xIdx = colIndex(table.head, (h) => h.includes('data'));
  const iDesc = dIdx >= 0 ? dIdx : 1;
  const iData = xIdx >= 0 ? xIdx : 2;
  const rows: SecurityBoundaryRow[] = table.rows.map((row) => {
    const name = cell(row, iName);
    const arrow = name.indexOf('→');
    const ascii = arrow < 0 ? name.indexOf('->') : -1;
    const at = arrow >= 0 ? arrow : ascii;
    const width = arrow >= 0 ? 1 : 2;
    return {
      name,
      from: at >= 0 ? name.slice(0, at).trim() : null,
      to: at >= 0 ? name.slice(at + width).trim() : null,
      description: cell(row, iDesc),
      data: cell(row, iData),
    };
  });
  return { rows, note: blocksOf([table.before, table.after].filter((t) => t !== '').join('\n\n')) };
}

function registerOf(body: string): SecurityThreatRegister {
  const table = readTable(body);
  if (!table) return { grouped: false, rows: [], note: [], legend: '', prose: blocksOf(body) };
  const h = table.head;
  const idHeader = colIndex(h, (x) => x === 'threat id' || x === 'id' || x === 'ids');
  const iId = idHeader >= 0 ? idHeader : 0;
  const iGroup = colIndex(h, (x) => x.includes('group'));
  const iCat = colIndex(h, (x) => x.includes('category'));
  const iComp = colIndex(h, (x) => x.includes('component'));
  const iSev = colIndex(h, (x) => x.startsWith('sev'));
  const iDisp = colIndex(h, (x) => x.includes('disposition'));
  const iMit = colIndex(h, (x) => x.includes('mitigation') || x.includes('evidence'));
  const iStatus = colIndex(h, (x) => x.startsWith('status'));
  const grouped = iGroup >= 0;
  const rows: SecurityThreatRow[] = table.rows.map((row) => {
    const id = cell(row, iId);
    const statusRaw = cell(row, iStatus);
    return {
      id,
      ids: threatIds(id),
      group: grouped ? cell(row, iGroup) : null,
      category: cell(row, iCat),
      component: cell(row, iComp),
      severity: severityOf(cell(row, iSev)),
      disposition: cell(row, iDisp),
      status: statusOf(statusRaw),
      statusRaw,
      mitigation: cell(row, iMit),
    };
  });
  return { grouped, rows, note: blocksOf(table.before), legend: table.after, prose: null };
}

function risksOf(body: string): SecurityRisks {
  const table = readTable(body);
  if (!table) return { rows: [], note: blocksOf(body) };
  const iId = Math.max(
    colIndex(table.head, (x) => x.includes('risk id') || x === 'id'),
    0,
  );
  const refIdx = colIndex(table.head, (x) => x.includes('ref'));
  const whyIdx = colIndex(table.head, (x) => x.includes('rationale'));
  const byIdx = colIndex(table.head, (x) => x.includes('accepted by') || x === 'by');
  const dateIdx = colIndex(table.head, (x) => x.includes('date'));
  const iRef = refIdx >= 0 ? refIdx : 1;
  const iWhy = whyIdx >= 0 ? whyIdx : 2;
  const iBy = byIdx >= 0 ? byIdx : 3;
  const iDate = dateIdx >= 0 ? dateIdx : 4;
  const rows: SecurityRiskRow[] = table.rows
    .filter((row) => row.some((c) => c.trim() !== ''))
    .map((row) => {
      const ref = cell(row, iRef);
      return {
        id: cell(row, iId),
        ref,
        refs: threatIds(ref),
        rationale: cell(row, iWhy),
        by: cell(row, iBy),
        date: cell(row, iDate),
      };
    });
  return { rows, note: blocksOf([table.before, table.after].filter((t) => t !== '').join('\n\n')) };
}

function auditOf(body: string): SecurityAudit {
  const table = readTable(body);
  if (!table) return { rows: [], note: blocksOf(body) };
  const rows: SecurityAuditRow[] = table.rows.map((row) => ({
    date: cell(row, 0),
    total: cell(row, 1),
    closed: cell(row, 2),
    open: cell(row, 3),
    by: cell(row, 4),
  }));
  return { rows, note: blocksOf([table.before, table.after].filter((t) => t !== '').join('\n\n')) };
}

/** `- [ ] text` / `- [x] text` (any indentation); an indented follow-on line extends the item. */
function checklistOf(body: string): { items: SecuritySignoffItem[]; rest: string[] } {
  const items: SecuritySignoffItem[] = [];
  const rest: string[] = [];
  let open = false;
  for (const line of body.split('\n')) {
    const text = line.trimStart();
    const inner = text.startsWith('-') ? text.slice(1).trimStart() : '';
    if (inner[0] === '[' && inner[2] === ']' && ' xX'.includes(inner[1] ?? '?')) {
      if (items.length < MAX_ITEMS) items.push({ checked: inner[1] !== ' ', text: inner.slice(3).trim() });
      open = true;
      continue;
    }
    if (open && items.length > 0 && /^\s{2,}\S/.test(line)) {
      items[items.length - 1].text += ` ${line.trim()}`;
      continue;
    }
    open = false;
    rest.push(line);
  }
  return { items, rest };
}

const APPROVAL = '**Approval:**';

function signoffOf(body: string): SecuritySignoff {
  const { items, rest } = checklistOf(body);
  let approval: string | null = null;
  const note: string[] = [];
  for (const line of rest) {
    const at = line.indexOf(APPROVAL);
    if (at >= 0 && approval === null) {
      approval = line.slice(at + APPROVAL.length).trim();
      continue;
    }
    note.push(line);
  }
  return { items, approval, note: blocksOf(note.join('\n')) };
}

function leadOf(preamble: string): Block[] {
  const kept: string[] = [];
  for (const line of preamble.split('\n')) {
    const text = line.trim();
    if (text.startsWith('# ') || text.startsWith('>') || isRule(line)) continue;
    kept.push(line);
  }
  return blocksOf(kept.join('\n').trim());
}

// ---------------------------------------------------------------------------
// Extractor
// ---------------------------------------------------------------------------

export function extractSecurityRegister(rawBody: string): SecurityRegister {
  const out: SecurityRegister = {
    lead: [],
    boundaries: null,
    register: null,
    risks: null,
    audit: null,
    signoff: null,
    extras: [],
    blockOn: null,
    sections: [],
  };
  const body = typeof rawBody === 'string' ? rawBody : '';
  if (body.trim() === '') return out;
  const { preamble, sections } = splitWithPreamble(body, 2);
  out.lead = leadOf(preamble);
  for (const section of sections.slice(0, MAX_SECTIONS)) {
    const heading = section.heading;
    const lower = heading.toLowerCase();
    let claimed = true;
    if (lower.includes('trust boundar') && out.boundaries === null) {
      out.boundaries = boundariesOf(section.body);
    } else if (lower.includes('threat register') && out.register === null) {
      out.register = registerOf(section.body);
    } else if (lower.includes('accepted risk') && out.risks === null) {
      out.risks = risksOf(section.body);
    } else if (lower.includes('audit trail') && out.audit === null) {
      out.audit = auditOf(section.body);
    } else if ((lower.includes('sign-off') || lower.includes('signoff')) && out.signoff === null) {
      out.signoff = signoffOf(section.body);
    } else {
      claimed = false;
      out.extras.push({ heading, blocks: blocksOf(section.body) });
    }
    out.sections.push({ heading, claimed });
  }
  out.blockOn = out.register ? blockOnOf(out.register.legend) : null;
  return out;
}
