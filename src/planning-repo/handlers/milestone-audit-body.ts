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
  /** The top-level frontmatter keys this reading claims (so the page can list every other key). */
  claimed: string[];
}

const MAX_BODY = 1_000_000;
const MAX_LINE = 4000;
const MAX_TEXT = 2000;
const MAX_RAW_STATUS = 200;

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

export function extractMilestoneAudit(frontmatter: Record<string, unknown>, body: string): MilestoneAuditBody {
  const prose = proseLinesOf(body);
  const audited = dateOf(frontmatter.audited) ?? prose.audited;
  const claimed = CLAIMED_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(frontmatter, key));
  return {
    milestone: stringOf(frontmatter.milestone),
    milestoneName: stringOf(frontmatter.milestone_name),
    verdict: verdictOf(frontmatter.status, prose),
    audited,
    claimed,
  };
}

