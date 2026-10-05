// The SECURITY console composer (quick-261003-527, sketch 017 winner D): a pure `ViewInput` ->
// `ComposedSecurityConsole` merge of the frontmatter and `structured.security` (built by
// `src/planning-repo/handlers/security-register.ts`). It decides the rail (identity, status chip,
// Created, ASVS, Blocks at, the threats-open gauge, the nav counts and the sign-off stamp), the
// severity x STRIDE board with one square per threat, the waiver ledger and its two-way links to the
// squares, the trust boundaries grouped by destination, the folded extras, the sign-off checklist, the audit runs
// and the "In the source only" targets. No DOM, no rendering — `security-console-components.tsx` is
// the only consumer. Returns `null` when the model is missing or holds neither register rows nor
// register prose, and the page then keeps the pre-existing promoted-block view (T-527-04). Dates
// are formatted by hand in UTC (via `formatStamp`) so Node and the browser agree, and an
// unparseable date renders as written, never throwing.
// T-527-03: author-written paths, signatures and run-by text are never turned into an href here.
// T-527-05: the view never invents a security status — the blocking count is the doc's own
// `threats_open`, each square's tone comes from the doc's own Status cell, and an unrecognised status
// stays quiet.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type {
  SecurityAuditRow,
  SecurityBoundaryRow,
  SecurityExtra,
  SecurityRegister,
  SecurityRiskRow,
  SecurityRowStatus,
  SecuritySeverityLevel,
  SecuritySignoffItem,
  SecurityThreatRow,
} from '../../planning-repo/handlers/security-register.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tones — the only place a status becomes a tone. Severity has none: it is a neutral pip scale.
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary this page draws from — never the parse-degradation tones,
 * which stay reserved for the artifact-parse badge alone. */
export type SecurityTone = 'complete' | 'missing' | 'in-flight' | 'quiet';

/** open (blocking) -> missing, open below the threshold -> in-flight, closed -> complete,
 * unrecognised -> quiet. */
export const STATUS_TONE: Record<SecurityRowStatus, SecurityTone> = {
  open: 'missing',
  'open-low': 'in-flight',
  closed: 'complete',
  unknown: 'quiet',
};

export const STATUS_LABEL: Record<SecurityRowStatus, string> = {
  open: 'Open',
  'open-low': 'Open · non-blocking',
  closed: 'Closed',
  unknown: '—',
};

/** verified -> complete, draft and open -> in-flight; anything else is shown as written, quiet. */
export const DOC_STATUS: Record<string, { label: string; tone: SecurityTone }> = {
  verified: { label: 'Verified', tone: 'complete' },
  draft: { label: 'Draft', tone: 'in-flight' },
  open: { label: 'Open', tone: 'in-flight' },
};

/** Signed off -> complete, otherwise quiet. */
export const STAMP_TONE: Record<'signed' | 'unsigned', SecurityTone> = {
  signed: 'complete',
  unsigned: 'quiet',
};

/** An audit run whose open cell starts at zero is clear (complete); a non-blocking open cell is
 * in-flight; any other open count is missing. */
export const RUN_TONE: Record<'clear' | 'non-blocking' | 'blocking', SecurityTone> = {
  clear: 'complete',
  'non-blocking': 'in-flight',
  blocking: 'missing',
};

/** A trust-boundary source that reads as unauthenticated, untrusted or anonymous is exposed
 * (in-flight); every other source, an at-rest holder and every data-crossing chip stays quiet.
 * Never destructive or warning, and boundaries never link to threats. */
export const BOUNDARY_TONE: Record<'exposed' | 'internal' | 'crossing', SecurityTone> = {
  exposed: 'in-flight',
  internal: 'quiet',
  crossing: 'quiet',
};

export const AT_REST_LABEL = 'At rest / in-process';

/** Neutral pips, never a hue: critical 4, high 3, medium 2, low 1, unrated 0. */
export const SEV_PIPS: Record<SecuritySeverityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

const SEV_LABEL: Record<SecuritySeverityLevel, string> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  unknown: 'Unrated',
};

const SEV_ORDER: readonly SecuritySeverityLevel[] = ['critical', 'high', 'medium', 'low', 'unknown'];

const STATUS_ORDER: readonly SecurityRowStatus[] = ['open', 'open-low', 'closed', 'unknown'];

const STRIDE: readonly { key: string; letter: string; label: string; lead: string }[] = [
  { key: 'S', letter: 'S', label: 'Spoofing', lead: 'spoof' },
  { key: 'T', letter: 'T', label: 'Tampering', lead: 'tamper' },
  { key: 'R', letter: 'R', label: 'Repudiation', lead: 'repudi' },
  { key: 'I', letter: 'I', label: 'Information Disclosure', lead: 'inform' },
  { key: 'D', letter: 'D', label: 'Denial of Service', lead: 'denial' },
  { key: 'E', letter: 'E', label: 'Elevation of Privilege', lead: 'elevat' },
];

const LEVELS = ['critical', 'high', 'medium', 'low'];

/** A rationale longer than this clamps to three lines with more / less. */
export const LONG_RATIONALE = 320;

// ---------------------------------------------------------------------------
// Composed model
// ---------------------------------------------------------------------------

export interface ComposedSecurityIntro {
  eyebrow: string;
  title: string | null;
  status: { label: string; tone: SecurityTone };
  created: string | null;
  asvs: string | null;
  /** "high+" */
  blocksAt: string;
}

export interface ComposedSecurityGauge {
  open: number;
  alarm: boolean;
  lowOpen: number;
  closed: number;
  total: number;
  unit: 'threats' | 'groups';
  verdict: string;
  closedLine: string;
  segments: { status: SecurityRowStatus; tone: SecurityTone; count: number }[];
}

export interface ComposedSecurityNav {
  id: string;
  label: string;
  count: string;
}

export interface ComposedSecurityStamp {
  signed: boolean;
  tone: SecurityTone;
  approval: string | null;
}

export type SecurityDisposition = 'accept' | 'mitigate' | 'transfer' | 'mixed' | '—';

export interface ComposedSecurityThreat {
  index: number;
  anchorId: string;
  /** The first id, or the first id plus an ellipsis for a grouped row. */
  ref: string;
  ids: string[];
  /** The id cell as written (the grouped row's comma list). */
  idsText: string;
  grouped: boolean;
  title: string;
  titleFromCategory: boolean;
  category: string;
  column: string;
  severity: { level: SecuritySeverityLevel; display: string; pips: number };
  status: SecurityRowStatus;
  statusLabel: string;
  tone: SecurityTone;
  disposition: SecurityDisposition;
  accepted: boolean;
  mitigationLabel: string;
  mitigation: string;
  riskIndexes: number[];
  /** Indexes into `residuals.items` that name this threat. */
  residualIndexes: number[];
}

export interface ComposedSecurityBoard {
  unit: 'threats' | 'groups';
  columns: { key: string; letter: string; label: string }[];
  rows: {
    level: SecuritySeverityLevel;
    label: string;
    pips: number;
    cells: { key: string; empty: boolean; threatIndexes: number[] }[];
  }[];
  note: Block[];
  legendPresent: boolean;
  /** The author's own text when the register has no table. */
  prose: Block[] | null;
}

export interface ComposedSecurityWaiver {
  id: string;
  anchorId: string;
  refs: { text: string; threatIndex: number | null }[];
  title: string;
  rationale: string;
  long: boolean;
  by: string;
  date: string;
}

export interface ComposedSecurityWaivers {
  rows: ComposedSecurityWaiver[];
  note: Block[];
  /** The log's own text when it has no rows (prose-only or empty). */
  prose: Block[];
}

export interface ComposedSecurityCrossing {
  /** Table row index. */
  index: number;
  source: string;
  /** The destination as a block header would read it (backticks kept); the whole name at rest. */
  destination: string;
  /** Parenthetical text stripped from the destination, shown as a muted aside. */
  qualifier: string | null;
  data: string;
  description: string;
  tone: SecurityTone;
  dataTone: SecurityTone;
}

/** shared: a destination with two or more crossings. single: every one-crossing destination,
 * gathered into one list. at-rest: rows with no arrow, always last. */
export type SecurityBlockKind = 'shared' | 'single' | 'at-rest';

export interface ComposedSecurityDestination {
  /** Normalised destination; '' for the at-rest block, 'singles' for the single list. */
  key: string;
  /** security-dest-<n>, in render order. */
  anchorId: string;
  label: string;
  countText: string;
  kind: SecurityBlockKind;
  crossings: ComposedSecurityCrossing[];
}

export interface ComposedSecurityBoundaries {
  /** Boundary table rows (the nav count). */
  total: number;
  destinations: ComposedSecurityDestination[];
  note: Block[];
}

export interface ComposedSecurityResidual {
  index: number;
  /** security-residual-<index>. */
  anchorId: string;
  title: string;
  refs: { text: string; threatIndex: number | null }[];
  blocks: Block[];
}

export interface ComposedSecurityResiduals {
  /** The section heading as written. */
  heading: string;
  /** 'Residual observations · N'. */
  label: string;
  /** The prose before the first bold-titled paragraph. */
  lead: Block[];
  items: ComposedSecurityResidual[];
}

export interface ComposedSecurityExtra {
  id: string;
  heading: string;
  blocks: Block[];
}

export interface ComposedSecuritySignoff {
  items: SecuritySignoffItem[];
  done: number;
  total: number;
  approval: string | null;
  note: Block[];
}

export interface ComposedSecurityRun {
  date: string;
  total: number | null;
  closed: number | null;
  openText: string;
  openCount: number | null;
  by: string;
  tone: SecurityTone;
}

export interface ComposedSecurityAudit {
  runs: ComposedSecurityRun[];
  note: Block[];
}

export interface ComposedSecuritySourceOnly {
  label: string;
  /** Heading id to scroll to in Source mode; null = the top. */
  targetId: string | null;
}

export interface ComposedSecurityConsole {
  intro: ComposedSecurityIntro;
  gauge: ComposedSecurityGauge;
  nav: ComposedSecurityNav[];
  stamp: ComposedSecurityStamp;
  summary: Block[] | null;
  threats: ComposedSecurityThreat[];
  board: ComposedSecurityBoard;
  waivers: ComposedSecurityWaivers;
  boundaries: ComposedSecurityBoundaries | null;
  residuals: ComposedSecurityResiduals | null;
  extras: ComposedSecurityExtra[];
  signoff: ComposedSecuritySignoff | null;
  audit: ComposedSecurityAudit | null;
  sourceOnly: ComposedSecuritySourceOnly[];
}

// ---------------------------------------------------------------------------
// Defensive readers (an older server's payload must still compose or return null)
// ---------------------------------------------------------------------------

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** Frontmatter arrives as strings, numbers or (from other loaders) Date instances. */
function scalarText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\*/g, '').trim();
}

/** The first run of digits in the text as a number, or null. */
function firstNumber(text: string): number | null {
  let i = 0;
  while (i < text.length && (text[i] < '0' || text[i] > '9')) i += 1;
  if (i === text.length) return null;
  let j = i;
  while (j < text.length && text[j] >= '0' && text[j] <= '9') j += 1;
  const value = Number(text.slice(i, Math.min(j, i + 9)));
  return Number.isFinite(value) ? value : null;
}

/** "03" -> "3", "02.1" -> "2.1", 1 -> "1"; null when the value does not open with a digit. */
function phaseNumber(phase: string): string | null {
  let i = 0;
  while (i < phase.length && phase[i] >= '0' && phase[i] <= '9') i += 1;
  if (i === 0) return null;
  let whole = phase.slice(0, i).replace(/^0+(?=\d)/, '');
  if (phase[i] === '.') {
    let j = i + 1;
    while (j < phase.length && phase[j] >= '0' && phase[j] <= '9') j += 1;
    if (j > i + 1) whole = `${whole}.${phase.slice(i + 1, j)}`;
  }
  return whole;
}

/** "account-administration-session-control" -> "Account administration session control"; a leading
 * number and dash are dropped; null when no words remain. */
function humanizeSlug(slug: string): string | null {
  let i = 0;
  while (i < slug.length && slug[i] >= '0' && slug[i] <= '9') i += 1;
  const rest = i > 0 && slug[i] === '-' ? slug.slice(i + 1) : slug;
  const words = rest.split('-').join(' ').trim();
  return words === '' ? null : words[0].toUpperCase() + words.slice(1);
}

function docStatusOf(raw: string): { label: string; tone: SecurityTone } {
  const text = raw.trim().toLowerCase();
  for (const key of Object.keys(DOC_STATUS)) {
    if (text.includes(key)) return DOC_STATUS[key];
  }
  return { label: raw.trim() === '' ? 'Unknown' : raw.trim(), tone: 'quiet' };
}

function levelOf(text: string | null): string | null {
  if (text === null) return null;
  const lower = text.trim().toLowerCase();
  return LEVELS.includes(lower) ? lower : null;
}

function columnOf(category: string): string {
  const lower = plain(category).toLowerCase();
  const hit = STRIDE.find((s) => lower.startsWith(s.lead));
  return hit ? hit.key : 'other';
}

function dispositionOf(raw: string): SecurityDisposition {
  const text = plain(raw).toLowerCase();
  const accept = text.includes('accept');
  if (accept && text.includes('mitigate')) return 'mixed';
  if (accept) return 'accept';
  if (text.includes('transfer')) return 'transfer';
  if (text.includes('mitigate')) return 'mitigate';
  return '—';
}

function statusKey(value: unknown): SecurityRowStatus {
  return value === 'open' || value === 'open-low' || value === 'closed' ? value : 'unknown';
}

function levelKey(value: unknown): SecuritySeverityLevel {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low' ? value : 'unknown';
}

// ---------------------------------------------------------------------------
// Trust boundaries (linear index scans only: no RegExp is ever built from text)
// ---------------------------------------------------------------------------

const EXPOSED_SOURCE = /unauthenticated|untrusted|anonymous/i;

/** Splits the text into what sits outside parentheses and the segments inside them. Parentheses
 * inside a backtick span are ignored, an unclosed '(' takes the rest of the text, and a stray ')'
 * stays in the outside text. */
function splitParentheticals(text: string): { outside: string; inside: string[] } {
  const inside: string[] = [];
  let outside = '';
  let depth = 0;
  let start = 0;
  let chunk = 0;
  let code = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '`') {
      code = !code;
    } else if (code) {
      continue;
    } else if (ch === '(') {
      if (depth === 0) {
        outside += text.slice(chunk, i);
        start = i + 1;
      }
      depth += 1;
    } else if (ch === ')' && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        inside.push(text.slice(start, i));
        chunk = i + 1;
      }
    }
  }
  if (depth > 0) inside.push(text.slice(start));
  else outside += text.slice(chunk);
  return { outside, inside };
}

function collapse(text: string): string {
  return text
    .split(/\s+/)
    .filter((word) => word !== '')
    .join(' ');
}

/** Backticks and parentheticals stripped, whitespace collapsed, lower-cased. When stripping leaves
 * nothing (an unbalanced '(' swallows the whole destination) the raw text is the key instead, so
 * the row still groups under a readable label. */
function destinationKey(to: string): string {
  const stripped = collapse(splitParentheticals(to).outside.split('`').join(''));
  return (stripped === '' ? collapse(to.split('`').join('')) : stripped).toLowerCase();
}

/** The first occurrence's destination minus its parentheticals, with a leading lowercase letter
 * raised; backticks stay (they render as code). Falls back to the raw text when nothing is left. */
function destinationLabel(to: string): string {
  const stripped = collapse(splitParentheticals(to).outside);
  const label = stripped === '' ? collapse(to) : stripped;
  const first = label[0];
  return first !== undefined && first >= 'a' && first <= 'z' ? first.toUpperCase() + label.slice(1) : label;
}

function qualifierOf(to: string): string | null {
  const parts = splitParentheticals(to)
    .inside.map((part) => collapse(part))
    .filter((part) => part !== '');
  return parts.length === 0 ? null : parts.join('; ');
}

function crossingOf(
  row: SecurityBoundaryRow,
  index: number,
  atRest: boolean,
  source: string,
  to: string,
): ComposedSecurityCrossing {
  return {
    index,
    source,
    destination: atRest ? source : destinationLabel(to),
    qualifier: atRest ? null : qualifierOf(to),
    data: stringOr(row.data, ''),
    description: stringOr(row.description, ''),
    tone: atRest ? BOUNDARY_TONE.internal : EXPOSED_SOURCE.test(source) ? BOUNDARY_TONE.exposed : BOUNDARY_TONE.crossing,
    dataTone: BOUNDARY_TONE.crossing,
  };
}

/** Destinations with two or more crossings get their own block (count descending, ties by first
 * appearance); every one-crossing destination goes into one list after them; rows with no arrow
 * form the final at-rest block. Null when the table has no rows. */
function boundariesOf(rawRows: SecurityBoundaryRow[], note: Block[]): ComposedSecurityBoundaries | null {
  if (rawRows.length === 0) return null;
  const groups = new Map<string, { label: string; crossings: ComposedSecurityCrossing[] }>();
  const atRestRows: ComposedSecurityCrossing[] = [];
  rawRows.forEach((row, index) => {
    const from = typeof row.from === 'string' ? row.from.trim() : null;
    const to = typeof row.to === 'string' ? row.to : null;
    const key = to === null ? '' : destinationKey(to);
    if (from === null || to === null || from === '' || key === '') {
      atRestRows.push(crossingOf(row, index, true, stringOr(row.name, '').trim(), ''));
      return;
    }
    const group = groups.get(key) ?? { label: destinationLabel(to), crossings: [] };
    group.crossings.push(crossingOf(row, index, false, from, to));
    groups.set(key, group);
  });
  const all = [...groups.entries()];
  const shared = all.filter(([, group]) => group.crossings.length >= 2);
  // Array.prototype.sort is stable, so ties keep first appearance.
  shared.sort((a, b) => b[1].crossings.length - a[1].crossings.length);
  // Map order is first appearance, so the single list keeps document order.
  const singles = all.filter(([, group]) => group.crossings.length === 1).flatMap(([, group]) => group.crossings);
  const blocks: Omit<ComposedSecurityDestination, 'anchorId'>[] = shared.map(([key, group]) => ({
    key,
    label: group.label,
    countText: `${group.crossings.length} ways in`,
    kind: 'shared',
    crossings: group.crossings,
  }));
  if (singles.length > 0) {
    blocks.push({
      key: 'singles',
      label: shared.length > 0 ? 'Other crossings' : 'Crossings',
      countText: String(singles.length),
      kind: 'single',
      crossings: singles,
    });
  }
  if (atRestRows.length > 0) {
    blocks.push({
      key: '',
      label: AT_REST_LABEL,
      countText: String(atRestRows.length),
      kind: 'at-rest',
      crossings: atRestRows,
    });
  }
  return {
    total: rawRows.length,
    destinations: blocks.map((block, n) => ({ ...block, anchorId: `security-dest-${n}` })),
    note,
  };
}

// ---------------------------------------------------------------------------
// Residual observations (linear scans and fixed literal regexes only)
// ---------------------------------------------------------------------------

const RELATES = '(relates to';
const NO_REF = '(no threat ref';
const MAX_REFS = 20;

interface ParsedResidual {
  title: string;
  refTexts: string[];
  blocks: Block[];
}

/** A paragraph that opens with a closing-delimited bold title: the title's end index, or -1. */
function boldTitleEnd(block: Block): number {
  if (block.kind !== 'paragraph') return -1;
  const text = block.text.trim();
  if (!text.startsWith('**')) return -1;
  const close = text.indexOf('**', 2);
  return close >= 3 ? close : -1;
}

function stripTitleTail(title: string): string {
  let end = title.length;
  while (end > 0 && (title[end - 1] === '.' || title[end - 1] === ':' || title[end - 1].trim() === '')) end -= 1;
  return title.slice(0, end).trim();
}

/** Up to MAX_REFS distinct T-ids inside a "(relates to ...)" parenthetical. */
function refsIn(paren: string): string[] {
  if (!paren.toLowerCase().startsWith(RELATES)) return [];
  const refs: string[] = [];
  for (const match of paren.matchAll(/T-[\w-]+/g)) {
    if (!refs.includes(match[0])) refs.push(match[0]);
    if (refs.length >= MAX_REFS) break;
  }
  return refs;
}

function residualOf(block: Block): Omit<ParsedResidual, 'blocks'> & { rest: string } {
  const text = block.kind === 'paragraph' ? block.text.trim() : '';
  const close = text.indexOf('**', 2);
  let title = text.slice(2, close);
  let rest = text.slice(close + 2);
  let paren = '';
  const lower = title.toLowerCase();
  const at = Math.max(lower.lastIndexOf(RELATES), lower.lastIndexOf(NO_REF));
  if (at >= 0) {
    const closeParen = title.indexOf(')', at);
    const end = closeParen < 0 ? title.length : closeParen + 1;
    paren = title.slice(at, end);
    title = title.slice(0, at) + title.slice(end);
  } else {
    const opening = rest.trimStart();
    const head = opening.slice(0, NO_REF.length).toLowerCase();
    if (head.startsWith(RELATES) || head === NO_REF) {
      const closeParen = opening.indexOf(')');
      const end = closeParen < 0 ? opening.length : closeParen + 1;
      paren = opening.slice(0, end);
      rest = opening.slice(end);
      if (rest.startsWith('.')) rest = rest.slice(1);
    }
  }
  return { title: stripTitleTail(title), refTexts: refsIn(paren), rest: rest.trim() };
}

/** The lead (everything before the first bold-titled paragraph) and one item per bold-titled
 * paragraph, each owning the blocks that follow it up to the next title. */
function residualsOf(blocks: Block[]): { lead: Block[]; items: ParsedResidual[] } {
  const lead: Block[] = [];
  const items: ParsedResidual[] = [];
  for (const block of blocks) {
    if (boldTitleEnd(block) >= 0) {
      const parsed = residualOf(block);
      items.push({
        title: parsed.title,
        refTexts: parsed.refTexts,
        blocks: parsed.rest === '' ? [] : [{ kind: 'paragraph', text: parsed.rest }],
      });
    } else if (items.length > 0) {
      items[items.length - 1].blocks.push(block);
    } else {
      lead.push(block);
    }
  }
  return { lead, items };
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function threatOf(row: SecurityThreatRow, index: number, grouped: boolean): ComposedSecurityThreat {
  const idText = stringOr(row.id, '');
  const ids = arrayOf<string>(row.ids).filter((id) => typeof id === 'string');
  const component = stringOr(row.component, '').trim();
  const group = typeof row.group === 'string' ? row.group.trim() : '';
  const category = stringOr(row.category, '').trim();
  const fromCategory = component === '' && group === '' && category !== '';
  const title = component !== '' ? component : group !== '' ? group : category !== '' ? category : idText;
  const status = statusKey(row.status);
  const level = levelKey(row.severity?.top);
  const sevRaw = stringOr(row.severity?.raw, '').trim();
  const disposition = dispositionOf(stringOr(row.disposition, ''));
  const accepted = disposition === 'accept';
  const first = ids[0] ?? idText;
  return {
    index,
    anchorId: `security-threat-${index}`,
    ref: grouped && ids.length > 1 ? `${first}…` : first,
    ids,
    idsText: idText,
    grouped,
    title,
    titleFromCategory: fromCategory,
    category,
    column: columnOf(category),
    severity: {
      level,
      display: level === 'unknown' ? '—' : sevRaw.includes('/') ? sevRaw : level,
      pips: SEV_PIPS[level],
    },
    status,
    statusLabel: STATUS_LABEL[status],
    tone: STATUS_TONE[status],
    disposition,
    accepted,
    mitigationLabel: accepted ? 'Why acceptable' : 'Mitigation',
    mitigation: stringOr(row.mitigation, ''),
    riskIndexes: [],
    residualIndexes: [],
  };
}

function boardOf(
  threats: ComposedSecurityThreat[],
  grouped: boolean,
  note: Block[],
  legend: string,
  prose: Block[] | null,
): ComposedSecurityBoard {
  const present = new Set(threats.map((t) => t.column));
  const columns: ComposedSecurityBoard['columns'] = STRIDE.filter((s) => present.has(s.key)).map((s) => ({
    key: s.key,
    letter: s.letter,
    label: s.label,
  }));
  if (present.has('other')) {
    columns.push({ key: 'other', letter: '·', label: grouped ? 'Grouped' : 'Other' });
  }
  const rows: ComposedSecurityBoard['rows'] = [];
  for (const level of SEV_ORDER) {
    const inLevel = threats.filter((t) => t.severity.level === level);
    if (inLevel.length === 0) continue;
    rows.push({
      level,
      label: SEV_LABEL[level],
      pips: SEV_PIPS[level],
      cells: columns.map((column) => {
        const inCell = inLevel.filter((t) => t.column === column.key);
        // Open blocking first, then open non-blocking, then closed; document order inside each.
        inCell.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.index - b.index);
        return { key: column.key, empty: inCell.length === 0, threatIndexes: inCell.map((t) => t.index) };
      }),
    });
  }
  return {
    unit: grouped ? 'groups' : 'threats',
    columns,
    rows,
    note,
    legendPresent: legend.trim() !== '',
    prose,
  };
}

function wiredRisks(
  rows: SecurityRiskRow[],
  threats: ComposedSecurityThreat[],
): ComposedSecurityWaiver[] {
  return rows.map((risk, index) => {
    const id = stringOr(risk.id, '');
    const refTokens = arrayOf<string>(risk.refs).filter((r) => typeof r === 'string');
    const refCell = stringOr(risk.ref, '').trim();
    const refs: ComposedSecurityWaiver['refs'] = (refTokens.length > 0 ? refTokens : refCell !== '' ? [refCell] : []).map(
      (text) => {
        const at = threats.findIndex((t) => t.ids.includes(text));
        return { text, threatIndex: at >= 0 ? at : null };
      },
    );
    let title = '';
    for (const ref of refs) {
      if (ref.threatIndex === null) continue;
      const threat = threats[ref.threatIndex];
      if (title === '') title = threat.title;
      if (!threat.riskIndexes.includes(index)) threat.riskIndexes.push(index);
    }
    const rationale = stringOr(risk.rationale, '');
    const date = stringOr(risk.date, '').trim();
    return {
      id,
      anchorId: `security-risk-${id === '' ? index : id}`,
      refs,
      title,
      rationale,
      long: rationale.length > LONG_RATIONALE,
      by: stringOr(risk.by, ''),
      date: date === '' ? '' : formatStamp(date),
    };
  });
}

function runOf(row: SecurityAuditRow): ComposedSecurityRun {
  const openText = stringOr(row.open, '').trim();
  const openCount = firstNumber(openText);
  const tone =
    openCount === null || openCount === 0
      ? RUN_TONE.clear
      : openText.toLowerCase().includes('non-blocking')
        ? RUN_TONE['non-blocking']
        : RUN_TONE.blocking;
  const date = stringOr(row.date, '').trim();
  return {
    date: date === '' ? '—' : formatStamp(date),
    total: firstNumber(stringOr(row.total, '')),
    closed: firstNumber(stringOr(row.closed, '')),
    openText,
    openCount,
    by: stringOr(row.by, ''),
    tone,
  };
}

export function composeSecurityConsole(input: ViewInput): ComposedSecurityConsole | null {
  const raw = input.structured?.security as Partial<SecurityRegister> | undefined | null;
  if (!raw || typeof raw !== 'object') return null;
  const register = raw.register && typeof raw.register === 'object' ? raw.register : null;
  const rawRows = arrayOf<SecurityThreatRow>(register?.rows);
  const prose = register && Array.isArray(register.prose) ? register.prose : null;
  if (rawRows.length === 0 && (prose === null || prose.length === 0)) return null;
  const fm = input.frontmatter ?? {};
  const grouped = register?.grouped === true;

  // ---- threats --------------------------------------------------------------------------------
  const threats = rawRows.map((row, index) => threatOf(row, index, grouped));
  const unit: 'threats' | 'groups' = grouped ? 'groups' : 'threats';
  const risks = raw.risks && typeof raw.risks === 'object' ? raw.risks : null;
  const waiverRows = wiredRisks(arrayOf<SecurityRiskRow>(risks?.rows), threats);

  // ---- intro ----------------------------------------------------------------------------------
  const phase = scalarText(fm.phase);
  const number = phase === null ? null : phaseNumber(phase);
  const slug = scalarText(fm.slug);
  const created = scalarText(fm.created);
  const asvs = scalarText(fm.asvs_level);
  const level =
    levelOf(scalarText(fm.block_on)) ?? levelOf(typeof raw.blockOn === 'string' ? raw.blockOn : null) ?? 'high';
  const intro: ComposedSecurityIntro = {
    eyebrow: number === null ? 'Security' : `Security · Phase ${number}`,
    title: slug === null ? null : humanizeSlug(slug),
    status: docStatusOf(scalarText(fm.status) ?? ''),
    created: created === null ? null : formatStamp(created),
    asvs: asvs === null ? null : `Level ${asvs}`,
    blocksAt: `${level}+`,
  };

  // ---- gauge ----------------------------------------------------------------------------------
  const count = (status: SecurityRowStatus): number => threats.filter((t) => t.status === status).length;
  const openRows = count('open');
  const lowOpen = count('open-low');
  const closed = count('closed');
  const fmOpen = scalarText(fm.threats_open);
  const fmOpenNumber = fmOpen !== null && /^\d{1,6}$/.test(fmOpen) ? Number(fmOpen) : null;
  const open = fmOpenNumber ?? openRows;
  const total = threats.length;
  const gauge: ComposedSecurityGauge = {
    open,
    alarm: open > 0,
    lowOpen,
    closed,
    total,
    unit,
    verdict: open > 0 ? 'blocking sign-off' : lowOpen > 0 ? `${lowOpen} below ${level}, non-blocking` : 'nothing blocking',
    closedLine: `${closed} of ${total} closed`,
    segments: (['closed', 'open-low', 'open'] as const)
      .map((status) => ({ status, tone: STATUS_TONE[status], count: count(status) }))
      .filter((segment) => segment.count > 0),
  };

  // ---- board, waivers, boundaries, extras, sign-off, audit ------------------------------------------
  const board = boardOf(
    threats,
    grouped,
    arrayOf<Block>(register?.note),
    stringOr(register?.legend, ''),
    prose,
  );
  const risksNote = arrayOf<Block>(risks?.note);
  const waivers: ComposedSecurityWaivers = {
    rows: waiverRows,
    note: waiverRows.length > 0 ? risksNote : [],
    prose: waiverRows.length === 0 ? risksNote : [],
  };

  const rawBoundaries = raw.boundaries && typeof raw.boundaries === 'object' ? raw.boundaries : null;
  const boundaries = boundariesOf(arrayOf<SecurityBoundaryRow>(rawBoundaries?.rows), arrayOf<Block>(rawBoundaries?.note));

  let extras: ComposedSecurityExtra[] = arrayOf<SecurityExtra>(raw.extras).map((extra, index) => ({
    id: `security-extra-${index}`,
    heading: stringOr(extra.heading, ''),
    blocks: arrayOf<Block>(extra.blocks),
  }));

  // The first "Residual Observations" extra with at least one bold-titled paragraph becomes its own
  // toggle; without one it stays a folded extra.
  let residuals: ComposedSecurityResiduals | null = null;
  const residualExtra = extras.find((extra) => extra.heading.toLowerCase().includes('residual observation'));
  if (residualExtra) {
    const parsed = residualsOf(residualExtra.blocks);
    if (parsed.items.length > 0) {
      const items: ComposedSecurityResidual[] = parsed.items.map((item, index) => {
        const refs = item.refTexts.map((text) => {
          const at = threats.findIndex((t) => t.ids.includes(text));
          if (at >= 0 && !threats[at].residualIndexes.includes(index)) threats[at].residualIndexes.push(index);
          return { text, threatIndex: at >= 0 ? at : null };
        });
        return {
          index,
          anchorId: `security-residual-${index}`,
          title: item.title === '' ? `Observation ${index + 1}` : item.title,
          refs,
          blocks: item.blocks,
        };
      });
      residuals = {
        heading: residualExtra.heading,
        label: `Residual observations · ${items.length}`,
        lead: parsed.lead,
        items,
      };
      extras = extras.filter((extra) => extra !== residualExtra);
    }
  }

  const rawSignoff = raw.signoff && typeof raw.signoff === 'object' ? raw.signoff : null;
  const items = arrayOf<SecuritySignoffItem>(rawSignoff?.items).map((item) => ({
    checked: item.checked === true,
    text: stringOr(item.text, ''),
  }));
  const approvalRaw = typeof rawSignoff?.approval === 'string' ? rawSignoff.approval.trim() : '';
  const approval = approvalRaw === '' ? null : approvalRaw;
  const done = items.filter((item) => item.checked).length;
  const signoff: ComposedSecuritySignoff | null = rawSignoff
    ? { items, done, total: items.length, approval, note: arrayOf<Block>(rawSignoff.note) }
    : null;
  const signed = items.length > 0 && done === items.length && !(approval ?? '').toLowerCase().includes('pending');
  const stamp: ComposedSecurityStamp = {
    signed,
    tone: signed ? STAMP_TONE.signed : STAMP_TONE.unsigned,
    approval,
  };

  const rawAudit = raw.audit && typeof raw.audit === 'object' ? raw.audit : null;
  const runs = arrayOf<SecurityAuditRow>(rawAudit?.rows).map(runOf);
  const auditNote = arrayOf<Block>(rawAudit?.note);
  const audit: ComposedSecurityAudit | null =
    rawAudit && (runs.length > 0 || auditNote.length > 0) ? { runs, note: auditNote } : null;

  // ---- nav, summary, source-only ---------------------------------------------------------------
  const nav: ComposedSecurityNav[] = [
    { id: 'security-board', label: 'Threats', count: String(total) },
    { id: 'security-waivers', label: 'Accepted risks', count: String(waiverRows.length) },
  ];
  if (boundaries) nav.push({ id: 'security-boundaries', label: 'Trust boundaries', count: String(boundaries.total) });
  if (signoff) nav.push({ id: 'security-signoff', label: 'Sign-off', count: `${done}/${signoff.total}` });

  const lead = arrayOf<Block>(raw.lead);
  const sourceOnly: ComposedSecuritySourceOnly[] = [{ label: 'Frontmatter', targetId: null }];
  if (board.legendPresent) {
    const heading = (input.headings ?? []).find(
      (h) => h.depth === 2 && normalizeHeading(h.text).includes('threat register'),
    );
    if (heading) sourceOnly.push({ label: 'Register legend', targetId: heading.id });
  }

  return {
    intro,
    gauge,
    nav,
    stamp,
    summary: lead.length > 0 ? lead : null,
    threats,
    board,
    waivers,
    boundaries,
    residuals,
    extras,
    signoff,
    audit,
    sourceOnly,
  };
}
