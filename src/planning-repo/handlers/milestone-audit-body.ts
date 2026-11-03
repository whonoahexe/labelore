// The milestone audit reading (Phase 9, 09-14, VIEW-08), split from the handler (milestone-audit.ts) so a
// throwing extractor can be proven to leave the title, body and frontmatter alone. Real audits come in at least four
// shapes (research Pitfall 7): the canonical frontmatter-heavy shape `/gsd-audit-milestone` writes (status,
// scores, gaps, tech_debt, nyquist), this repo's own, which adds object debt items and extra keys, the
// dense fixture's prose-only audits (`**Status:**` and `**Audited:**` lines, no frontmatter), and the old
// heading-and-one-sentence fixture. `structured.audit` is the tolerant reading the audit page draws from.
//
// Frontmatter first (Claude's discretion in CONTEXT, research A5): the verdict and the audited date come
// from frontmatter, and from the `**Status:**` and `**Audited:**` prose lines only where frontmatter lacks
// them. Scores, gaps and debt are never extracted from prose. When frontmatter and prose disagree, the
// frontmatter wins and the prose line stays in the body, untouched, for the page's narrative: the two are
// never merged.
//
// SEC-01 / T-09-28: the body is capped before any scan and scanned one clipped line at a time; every string
// is capped; every list has a cap. Pure (no fs access) and never throws on any frontmatter value; the handler
// still wraps the extractor in try/catch so a throw only omits `structured.audit` (the page then falls back to
// the promoted-section view and the title, body and frontmatter survive).

export type AuditVerdictStatus = 'passed' | 'tech_debt' | 'gaps_found';

export interface AuditVerdict {
  /** The recognised verdict, or null when the file states none or states one this reader does not know. */
  status: AuditVerdictStatus | null;
  /** The status as written (capped) when it is not a recognised verdict; null when recognised or absent. */
  raw: string | null;
  /** Where the verdict was read from; null when the file states none. */
  source: 'frontmatter' | 'prose' | null;
}

export interface MilestoneAuditBody {
  /** The `milestone` frontmatter value (the version), else null. */
  milestone: string | null;
  /** The `milestone_name` frontmatter value, else null. */
  milestoneName: string | null;
  verdict: AuditVerdict;
  /** The audited date: a YAML date as YYYY-MM-DD, a string as written, else the `**Audited:**` line. */
  audited: string | null;
  /** The top-level frontmatter keys this reading consumed; every other key is in `extras`. */
  claimed: string[];
  /** One entry per `scores` key, in the author's order (at most 20). Empty without a readable `scores`. */
  scores: AuditScore[];
  /** The gap groups (`requirements`, `integration`, `flows` first, other keys after); null without a readable `gaps`. */
  gaps: AuditGapGroup[] | null;
  /** The tech debt groups in file order; null without a readable `tech_debt`. */
  techDebt: AuditDebtGroup[] | null;
  /** The Nyquist state; null without a readable `nyquist`. */
  nyquist: AuditNyquist | null;
  /** Every top-level frontmatter key this reading did not consume, flattened to labelled rows. */
  extras: AuditExtra[];
}

export interface AuditField {
  label: string;
  value: string;
}

/** One score. `n` over `m` for "3/4" and `{ n, m }`; `percent` alone for "75%"; `n` alone for a bare number;
 * everything null for a value this reader cannot read (`raw` then holds it as written). */
export interface AuditScore {
  key: string;
  n: number | null;
  m: number | null;
  percent: number | null;
  raw: string;
}

export interface AuditGapItem {
  /** A leading audit id ("INT-W1"), or an object gap's `id`. */
  id: string | null;
  text: string;
  evidence: string | null;
  status: string | null;
  /** Every other field of an object gap, as labelled rows. */
  fields: AuditField[];
}

export interface AuditGapGroup {
  key: string;
  items: AuditGapItem[];
}

export interface AuditDebtItem {
  id: string | null;
  text: string;
  /** The status word as written ("deferred", "advisory", "closed"), lower-cased; null when none is stated. */
  status: string | null;
  /** True when the status is closed or resolved: the item is told apart and left out of the total (research A6). */
  closed: boolean;
  fields: AuditField[];
}

export interface AuditDebtGroup {
  phase: string;
  items: AuditDebtItem[];
}

export interface AuditNyquist {
  compliant: string[];
  partial: string[];
  notValidated: string[];
  missing: string[];
  overall: string | null;
  reason: string | null;
}

export interface AuditExtra {
  key: string;
  rows: AuditField[];
}

const MAX_BODY = 1_000_000;
const MAX_LINE = 4000;
const MAX_TEXT = 2000;
const MAX_RAW_STATUS = 200;
const MAX_SCORES = 20;
const MAX_GAP_GROUPS = 20;
const MAX_DEBT_GROUPS = 100;
const MAX_ITEMS = 200;
const MAX_FIELDS = 20;
const MAX_LIST = 100;
const MAX_EXTRAS = 50;
const MAX_ROWS = 50;
const MAX_DEPTH = 3;

/** The frontmatter keys the audit page claims; every other top-level key is shown as a labelled list. */
export const CLAIMED_KEYS: readonly string[] = [
  'title',
  'milestone',
  'milestone_name',
  'audited',
  'status',
  'scores',
  'gaps',
  'tech_debt',
  'nyquist',
];

function cap(text: string, max: number = MAX_TEXT): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Backticks dropped, whitespace trimmed. Linear. */
function plain(text: string): string {
  return text.split('`').join('').trim();
}

function isWordChar(code: number): boolean {
  return (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
}

/** Lower-cased, with spaces and hyphens read as underscores: "Tech debt" and "tech-debt" are `tech_debt`. */
function normalised(text: string): string {
  const source = text.trim().slice(0, 80).toLowerCase();
  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    out += ch === ' ' || ch === '-' ? '_' : ch;
  }
  return out;
}

const VERDICTS: readonly AuditVerdictStatus[] = ['passed', 'tech_debt', 'gaps_found'];

/** A frontmatter status is a verdict only when the whole value reads as one. */
function exactVerdict(text: string): AuditVerdictStatus | null {
  const word = normalised(text);
  for (const verdict of VERDICTS) if (word === verdict) return verdict;
  return null;
}

/** A prose Status line is read by its leading words: "Passed" and "Tech debt - ..." are verdicts, "Passed2" is not. */
function leadingVerdict(text: string): AuditVerdictStatus | null {
  const word = normalised(text);
  for (const verdict of VERDICTS) {
    if (!word.startsWith(verdict)) continue;
    if (word.length === verdict.length || !isWordChar(word.charCodeAt(verdict.length))) return verdict;
  }
  return null;
}

function stringOf(value: unknown): string | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text === '' ? null : cap(text);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function dateOf(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  return typeof value === 'string' ? stringOf(value) : null;
}

/** The text after the first `**Status:**` and `**Audited:**` lines of the body, backticks dropped. */
interface ProseLines {
  status: string | null;
  audited: string | null;
}

function startsWithLabel(line: string, label: string): boolean {
  return line.length >= label.length && line.slice(0, label.length).toLowerCase() === label;
}

/** One pass over the capped body, one clipped line at a time, stopping once both labels are found. */
function proseLinesOf(body: string): ProseLines {
  const found: ProseLines = { status: null, audited: null };
  const text = body.length > MAX_BODY ? body.slice(0, MAX_BODY) : body;
  let from = 0;
  while (from <= text.length && (found.status === null || found.audited === null)) {
    let end = text.indexOf('\n', from);
    if (end === -1) end = text.length;
    const line = text.slice(from, Math.min(end, from + MAX_LINE)).trim();
    if (found.status === null && startsWithLabel(line, '**status:**')) {
      const value = plain(line.slice('**status:**'.length));
      if (value !== '') found.status = cap(value, MAX_RAW_STATUS);
    } else if (found.audited === null && startsWithLabel(line, '**audited:**')) {
      const value = plain(line.slice('**audited:**'.length));
      if (value !== '') found.audited = cap(value, MAX_RAW_STATUS);
    }
    from = end + 1;
  }
  return found;
}

function verdictOf(statusValue: unknown, prose: ProseLines): AuditVerdict {
  if (typeof statusValue === 'string' && statusValue.trim() !== '') {
    const status = exactVerdict(statusValue);
    return { status, raw: status === null ? cap(plain(statusValue), MAX_RAW_STATUS) : null, source: 'frontmatter' };
  }
  if (prose.status !== null) {
    const status = leadingVerdict(prose.status);
    return { status, raw: status === null ? prose.status : null, source: 'prose' };
  }
  return { status: null, raw: null, source: null };
}

// ---------------------------------------------------------------------------
// Values of any shape
// ---------------------------------------------------------------------------

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
    ? (value as Record<string, unknown>)
    : null;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/** A value as one line of text. Arrays and objects are flattened to "a, b" and "k: v; k: v", MAX_DEPTH levels
 * deep, at most MAX_ROWS entries at the top level and 20 a level below; a running budget stops the walk once
 * the text is full, so the cost of one value is bounded whatever its shape. */
function compact(value: unknown, depth: number, budget: { left: number }): string {
  if (budget.left <= 0) return '';
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const out = cap(value.trim(), budget.left);
    budget.left -= out.length;
    return out;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    const out = String(value);
    budget.left -= out.length;
    return out;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  if (depth >= MAX_DEPTH) return '...';
  const limit = depth === 0 ? MAX_ROWS : 20;
  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (let i = 0; i < value.length && i < limit && budget.left > 0; i += 1) {
      const part = compact(value[i], depth + 1, budget);
      if (part !== '') parts.push(part);
    }
    return parts.join(', ');
  }
  const record = recordOf(value);
  if (record === null) return '';
  const parts: string[] = [];
  const keys = Object.keys(record);
  for (let i = 0; i < keys.length && i < limit && budget.left > 0; i += 1) {
    const part = compact(record[keys[i]], depth + 1, budget);
    if (part !== '') parts.push(`${cap(keys[i], 80)}: ${part}`);
  }
  return parts.join('; ');
}

function flat(value: unknown): string {
  return cap(compact(value, 0, { left: MAX_TEXT }));
}

/** The fields of a record other than `skip`, as labelled rows (the key as written), at most MAX_FIELDS. */
function fieldsOf(record: Record<string, unknown>, skip: readonly string[]): AuditField[] {
  const fields: AuditField[] = [];
  const keys = Object.keys(record);
  for (let i = 0; i < keys.length && fields.length < MAX_FIELDS; i += 1) {
    const key = keys[i];
    if (skip.includes(key)) continue;
    const value = flat(record[key]);
    if (value !== '') fields.push({ label: cap(key, 80), value });
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Audit ids and statuses
// ---------------------------------------------------------------------------

function isUpper(code: number): boolean {
  return code >= 65 && code <= 90;
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function isLetterOrDigit(code: number): boolean {
  return isUpper(code) || isDigit(code) || (code >= 97 && code <= 122);
}

const EN_DASH = '–';
const EM_DASH = '—';

/** The leading audit id of a string and what follows it: 2 to 6 capitals, a hyphen, then 1 to 6 capitals or
 * digits ("INT-W1", "WR-03", "AUTH-06", "FLOW-G"), ending before any other letter or digit. "HTTP-only" is no id. */
function leadingAuditId(text: string): { id: string; rest: string } | null {
  let i = 0;
  while (i < text.length && i < 7 && isUpper(text.charCodeAt(i))) i += 1;
  if (i < 2 || i > 6 || text[i] !== '-') return null;
  const start = i + 1;
  let j = start;
  while (j < text.length && j - start < 7) {
    const code = text.charCodeAt(j);
    if (!isUpper(code) && !isDigit(code)) break;
    j += 1;
  }
  const length = j - start;
  if (length < 1 || length > 6) return null;
  if (j < text.length && isLetterOrDigit(text.charCodeAt(j))) return null;
  let k = j;
  while (k < text.length && (text[k] === ':' || text[k] === ' ' || text[k] === '-' || text[k] === EN_DASH || text[k] === EM_DASH)) k += 1;
  const rest = text.slice(k).trim();
  return { id: text.slice(0, j), rest: rest === '' ? text : rest };
}

const DEBT_STATUS_WORDS: readonly string[] = ['deferred', 'open', 'advisory', 'skipped by design', 'closed', 'resolved'];

/** The last parenthetical that is a status word, lifted out of the text. Looks at the last 8 parentheticals. */
function takeStatus(text: string): { text: string; status: string | null } {
  let end = text.length;
  for (let tries = 0; tries < 8 && end > 0; tries += 1) {
    const close = text.lastIndexOf(')', end - 1);
    if (close === -1) break;
    const open = text.lastIndexOf('(', close);
    if (open === -1) break;
    const inner = text.slice(open + 1, close).trim().toLowerCase();
    if (DEBT_STATUS_WORDS.includes(inner)) {
      const before = text.slice(0, open).trimEnd();
      const after = text.slice(close + 1).trimStart();
      return { text: before === '' ? after : after === '' ? before : `${before} ${after}`, status: inner };
    }
    end = open;
  }
  return { text, status: null };
}

function idOf(value: unknown): string | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text === '' ? null : cap(text, 80);
  }
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
}

function textFieldOf(value: unknown): string | null {
  const text = flat(value);
  return text === '' ? null : text;
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

/** Digits only, 1 to 9 of them; otherwise null. */
function wholeNumber(text: string): number | null {
  const t = text.trim();
  if (t.length < 1 || t.length > 9) return null;
  for (let i = 0; i < t.length; i += 1) if (!isDigit(t.charCodeAt(i))) return null;
  return Number(t);
}

/** Digits with at most one point, 1 to 12 characters; otherwise null. */
function decimalNumber(text: string): number | null {
  const t = text.trim();
  if (t.length < 1 || t.length > 12) return null;
  let points = 0;
  let digits = 0;
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '.') points += 1;
    else if (isDigit(t.charCodeAt(i))) digits += 1;
    else return null;
  }
  return points <= 1 && digits > 0 ? Number(t) : null;
}

function scoreOf(key: string, value: unknown): AuditScore {
  const unreadable = (): AuditScore => ({ key, n: null, m: null, percent: null, raw: flat(value) });
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { key, n: value, m: null, percent: null, raw: String(value) };
  }
  const record = recordOf(value);
  if (record !== null) {
    const n = record.n;
    const m = record.m;
    return typeof n === 'number' && typeof m === 'number' && Number.isFinite(n) && Number.isFinite(m)
      ? { key, n, m, percent: null, raw: `${n}/${m}` }
      : unreadable();
  }
  if (typeof value !== 'string') return unreadable();
  const text = value.trim().slice(0, 80);
  if (text.endsWith('%')) {
    const percent = decimalNumber(text.slice(0, -1));
    return percent === null ? unreadable() : { key, n: null, m: null, percent, raw: text };
  }
  const slash = text.indexOf('/');
  const word = text.indexOf(' of ');
  const cut = slash !== -1 ? { at: slash, width: 1 } : word !== -1 ? { at: word, width: 4 } : null;
  if (cut !== null) {
    const n = wholeNumber(text.slice(0, cut.at));
    const m = wholeNumber(text.slice(cut.at + cut.width));
    return n !== null && m !== null ? { key, n, m, percent: null, raw: text } : unreadable();
  }
  const bare = decimalNumber(text);
  return bare === null ? unreadable() : { key, n: bare, m: null, percent: null, raw: text };
}

function scoresOf(value: unknown): AuditScore[] | null {
  const record = recordOf(value);
  if (record === null) return null;
  const keys = Object.keys(record);
  const scores: AuditScore[] = [];
  for (let i = 0; i < keys.length && scores.length < MAX_SCORES; i += 1) {
    scores.push(scoreOf(cap(keys[i], 80), record[keys[i]]));
  }
  return scores;
}

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

const GAP_ORDER: readonly string[] = ['requirements', 'integration', 'flows'];

function gapItemOf(value: unknown): AuditGapItem | null {
  if (typeof value === 'string') {
    const text = cap(value.trim());
    if (text === '') return null;
    const lead = leadingAuditId(text);
    return { id: lead === null ? null : lead.id, text: lead === null ? text : lead.rest, evidence: null, status: null, fields: [] };
  }
  const record = recordOf(value);
  if (record === null) {
    const text = flat(value);
    return text === '' ? null : { id: null, text, evidence: null, status: null, fields: [] };
  }
  return {
    id: idOf(record.id),
    text: textFieldOf(record.description) ?? textFieldOf(record.text) ?? '',
    evidence: textFieldOf(record.evidence),
    status: textFieldOf(record.status),
    fields: fieldsOf(record, ['id', 'description', 'text', 'evidence', 'status']),
  };
}

function gapItemsOf(value: unknown): AuditGapItem[] {
  const list = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  const items: AuditGapItem[] = [];
  for (let i = 0; i < list.length && i < MAX_ITEMS; i += 1) {
    const item = gapItemOf(list[i]);
    if (item !== null) items.push(item);
  }
  return items;
}

function gapsOf(value: unknown): AuditGapGroup[] | null {
  const record = recordOf(value);
  if (record === null) return null;
  const keys = Object.keys(record);
  const ordered = [...GAP_ORDER.filter((key) => hasOwn(record, key)), ...keys.filter((key) => !GAP_ORDER.includes(key))];
  const groups: AuditGapGroup[] = [];
  for (let i = 0; i < ordered.length && groups.length < MAX_GAP_GROUPS; i += 1) {
    groups.push({ key: cap(ordered[i], 80), items: gapItemsOf(record[ordered[i]]) });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Tech debt
// ---------------------------------------------------------------------------

function debtItemOf(value: unknown): AuditDebtItem | null {
  if (typeof value === 'string') {
    const raw = cap(value.trim());
    if (raw === '') return null;
    const lead = leadingAuditId(raw);
    const taken = takeStatus(lead === null ? raw : lead.rest);
    const status = taken.status;
    return {
      id: lead === null ? null : lead.id,
      text: taken.text,
      status,
      closed: status === 'closed' || status === 'resolved',
      fields: [],
    };
  }
  const record = recordOf(value);
  if (record === null) {
    const text = flat(value);
    return text === '' ? null : { id: null, text, status: null, closed: false, fields: [] };
  }
  const statusText = textFieldOf(record.status);
  const status = statusText === null ? null : cap(statusText.toLowerCase(), 80);
  return {
    id: idOf(record.id),
    text: textFieldOf(record.description) ?? textFieldOf(record.text) ?? '',
    status,
    closed: status === 'closed' || status === 'resolved',
    fields: fieldsOf(record, ['id', 'description', 'text', 'status']),
  };
}

function debtItemsOf(value: unknown): AuditDebtItem[] {
  const list = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  const items: AuditDebtItem[] = [];
  for (let i = 0; i < list.length && i < MAX_ITEMS; i += 1) {
    const item = debtItemOf(list[i]);
    if (item !== null) items.push(item);
  }
  return items;
}

/** The group name for debt items that name no phase (a flat list of strings). */
export const UNGROUPED_DEBT = 'Not grouped by phase';

function debtOf(value: unknown): AuditDebtGroup[] | null {
  const groups: AuditDebtGroup[] = [];
  if (Array.isArray(value)) {
    const loose: unknown[] = [];
    for (let i = 0; i < value.length && groups.length < MAX_DEBT_GROUPS; i += 1) {
      const entry = recordOf(value[i]);
      if (entry !== null && hasOwn(entry, 'items')) {
        groups.push({ phase: idOf(entry.phase) ?? UNGROUPED_DEBT, items: debtItemsOf(entry.items) });
      } else if (loose.length < MAX_ITEMS) {
        loose.push(value[i]);
      }
    }
    if (loose.length > 0) groups.push({ phase: UNGROUPED_DEBT, items: debtItemsOf(loose) });
    return groups;
  }
  const record = recordOf(value);
  if (record === null) return null;
  const keys = Object.keys(record);
  for (let i = 0; i < keys.length && groups.length < MAX_DEBT_GROUPS; i += 1) {
    groups.push({ phase: cap(keys[i], 120), items: debtItemsOf(record[keys[i]]) });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Nyquist
// ---------------------------------------------------------------------------

/** A phase list: numbers display zero-padded to two digits (YAML 1.1 reads 01 as the number 1), strings verbatim. */
function phaseListOf(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  const out: string[] = [];
  for (let i = 0; i < list.length && out.length < MAX_LIST; i += 1) {
    const item = list[i];
    if (typeof item === 'number' && Number.isFinite(item)) {
      const whole = Number.isInteger(item) && item >= 0 && item < 10;
      out.push(whole ? `0${item}` : String(item));
    } else if (typeof item === 'string' && item.trim() !== '') {
      out.push(cap(item.trim(), 80));
    }
  }
  return out;
}

function nyquistOf(value: unknown): AuditNyquist | null {
  const record = recordOf(value);
  if (record === null) return null;
  return {
    compliant: phaseListOf(record.compliant_phases),
    partial: phaseListOf(record.partial_phases),
    notValidated: phaseListOf(record.not_validated_phases),
    missing: phaseListOf(record.missing_phases),
    overall: textFieldOf(record.overall),
    reason: textFieldOf(record.reason),
  };
}

// ---------------------------------------------------------------------------
// Keys the page does not claim
// ---------------------------------------------------------------------------

/** One unclaimed key as labelled rows: an object's entries, an array's items (labelled by their `id` or their
 * place), anything else as one unlabelled row. Nested values go one level deep, the rest as text. */
function extraOf(key: string, value: unknown): AuditExtra {
  const rows: AuditField[] = [];
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length && rows.length < MAX_ROWS; i += 1) {
      const item = recordOf(value[i]);
      const id = item === null ? null : idOf(item.id);
      const text = cap(compact(value[i], 1, { left: MAX_TEXT }));
      if (text !== '') rows.push({ label: id ?? String(i + 1), value: text });
    }
  } else {
    const record = recordOf(value);
    if (record !== null) {
      const keys = Object.keys(record);
      for (let i = 0; i < keys.length && rows.length < MAX_ROWS; i += 1) {
        const text = cap(compact(record[keys[i]], 1, { left: MAX_TEXT }));
        if (text !== '') rows.push({ label: cap(keys[i], 80), value: text });
      }
    } else {
      const text = flat(value);
      if (text !== '') rows.push({ label: '', value: text });
    }
  }
  return { key: cap(key, 80), rows };
}

export function extractMilestoneAudit(frontmatter: Record<string, unknown>, body: string): MilestoneAuditBody {
  const prose = proseLinesOf(body);
  const milestone = stringOf(frontmatter.milestone);
  const milestoneName = stringOf(frontmatter.milestone_name);
  const auditedFrontmatter = dateOf(frontmatter.audited);
  const scores = scoresOf(frontmatter.scores);
  const gaps = gapsOf(frontmatter.gaps);
  const techDebt = debtOf(frontmatter.tech_debt);
  const nyquist = nyquistOf(frontmatter.nyquist);
  // A key is claimed only when this reading consumed its value; a key it could not read is listed in `extras`
  // instead of being dropped.
  const consumed = new Set<string>();
  const claim = (key: string, read: boolean): void => {
    if (read && hasOwn(frontmatter, key)) consumed.add(key);
  };
  claim('title', typeof frontmatter.title === 'string');
  claim('milestone', milestone !== null);
  claim('milestone_name', milestoneName !== null);
  claim('audited', auditedFrontmatter !== null);
  claim('status', typeof frontmatter.status === 'string' && frontmatter.status.trim() !== '');
  claim('scores', scores !== null);
  claim('gaps', gaps !== null);
  claim('tech_debt', techDebt !== null);
  claim('nyquist', nyquist !== null);
  const extras: AuditExtra[] = [];
  const keys = Object.keys(frontmatter);
  for (let i = 0; i < keys.length && extras.length < MAX_EXTRAS; i += 1) {
    if (!consumed.has(keys[i])) extras.push(extraOf(keys[i], frontmatter[keys[i]]));
  }
  return {
    milestone,
    milestoneName,
    verdict: verdictOf(frontmatter.status, prose),
    audited: auditedFrontmatter ?? prose.audited,
    claimed: CLAIMED_KEYS.filter((key) => consumed.has(key)),
    scores: scores ?? [],
    gaps,
    techDebt,
    nyquist,
    extras,
  };
}

