// REVIEWS.md reader (Phase 10, 10-22, VIEW-12, T-10-42). `extractReviews` reads what GSD's `/gsd-review` writes (the
// workflow embeds each reviewer's own output verbatim under `## {Name} Review`, then a `## Consensus Summary`) into what the
// Cross-AI reviews page (sketch 052 winner A, "Overlap") draws:
//   - the roster from the frontmatter (`reviewers`, `models`, `plan_coverage`), keyed by lower-cased letters and digits;
//   - one reviewer per `## {Name} Review` or `## {Name} Review ({instance})` heading, and ONLY those: a reviewer's own
//     `## 04-02` headings stay inside its body (RESEARCH Pitfall 13), splitting stops at `## Consensus Summary`, and the
//     Plan-Revision Conflicts block between its markers is not a reviewer. A heading with no roster entry still becomes a
//     reviewer. A file with no reviewer heading gives one reviewer carrying the whole text;
//   - per reviewer: the run status (a failed lane, a skipped lane), the reduced-weight tags, the concerns (a list item that
//     opens with HIGH, MEDIUM or LOW in any of the file's forms), each plan's stated risk and verdict, and the line range
//     and text of its section;
//   - the file's own consensus: its Agreed Strengths, Agreed Concerns and Divergent Views lists, and its text as written.
// Nothing is compared here: agreement and disagreement are derived by the page and shown beside the file's own words.
// Line scans over the fence-aware scanner only: no regular expression, none built from document text. The body is capped
// at 500,000 characters, reviewers at 20, concerns at 300 a reviewer, a concern at 2,000 characters (T-10-42). Every line
// is read a bounded number of times, so cost grows linearly with the body.
import { eachLineOutsideFences } from './fenced-sections.ts';

/** The most characters of a body the scan reads. */
export const REVIEWS_BODY_CAP = 500_000;
/** The most reviewers kept. */
export const REVIEWS_REVIEWER_CAP = 20;
/** The most concerns kept for one reviewer. */
export const REVIEWS_CONCERN_CAP = 300;
/** The most characters kept of one concern, verdict, heading or list item. */
export const REVIEWS_TEXT_CAP = 2000;
/** The most plan stances kept for one reviewer. */
export const REVIEWS_PLAN_CAP = 200;
/** The most other sections (not a reviewer, not the consensus) kept. */
export const REVIEWS_OTHER_CAP = 20;
/** The most consensus list items kept in each list. */
export const REVIEWS_CONSENSUS_CAP = 200;

export type ReviewSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type ReviewerStatus = 'ok' | 'failed' | 'skipped';
export type ReducedReason = 'no-repo-access' | 'no-source-citations';

export interface ReviewsRosterEntry {
  /** The frontmatter key, lower-cased letters and digits only. */
  slug: string;
  /** The frontmatter `models` value for it, verbatim ("unknown" included); null when absent or not a string. */
  model: string | null;
  /** The plan ids `plan_coverage.{slug}.missing` lists. */
  missing: string[];
}

export interface ReviewsConcern {
  /** HIGH, MEDIUM or LOW as the item opens, or null for a Concerns item that states none. */
  severity: ReviewSeverity | null;
  /** The item without its list marker and severity word. */
  text: string;
  /** The plan id of the `## 04-02` section the item sits in, or null. */
  planId: string | null;
}

export interface ReviewsPlanStance {
  planId: string | null;
  /** The first word of the plan's Risk Assessment when it is LOW, MEDIUM or HIGH. */
  risk: ReviewSeverity | null;
  /** The plan's Verdict line as written, or null. */
  verdict: string | null;
}

export interface ReviewerSection {
  /** The heading's name without " Review" and its instance ("Claude"), as written. */
  name: string;
  /** The text of a trailing "(instance)", or null. */
  instance: string | null;
  /** The roster key this reviewer matches, or null when the frontmatter has no such entry. */
  slug: string | null;
  /** The roster's model for it, or null. */
  model: string | null;
  status: ReviewerStatus;
  /** True when the output carries a reviewed-without-repo-access or reviewed-without-source-citations tag. */
  reduced: boolean;
  reducedWhy: ReducedReason[];
  /** The highest of the plans' stated risks, or null. */
  risk: ReviewSeverity | null;
  concerns: ReviewsConcern[];
  /** Each plan the section holds a stance for (a risk or a verdict), in file order. */
  plans: ReviewsPlanStance[];
  /** Every `## {plan id}` heading inside the section, in file order. */
  planIds: string[];
  /** Zero-based line range of the section's own text in the body: [start, end). */
  body: { start: number; end: number };
  /** The section's text as written (the carve-out of the conflicts block and trailing rules removed). */
  text: string;
}

export interface ReviewsConsensus {
  strengths: string[];
  concerns: string[];
  divergent: string[];
  /** The consensus section's text as written. */
  text: string;
}

export interface ReviewsOtherSection {
  heading: string;
  text: string;
}

export interface ReviewsBody {
  /** The frontmatter phase, else the number in the body title "Phase N", else null. */
  phase: string | null;
  /** The frontmatter `reviewed_at` as a UTC calendar day, or null. */
  reviewedAt: string | null;
  plansReviewed: string[];
  roster: ReviewsRosterEntry[];
  reviewers: ReviewerSection[];
  consensus: ReviewsConsensus | null;
  /** Sections the page does not claim (the Plan-Revision Conflicts block, any other section) with content. */
  others: ReviewsOtherSection[];
}

function cap(text: string): string {
  return text.length > REVIEWS_TEXT_CAP ? text.slice(0, REVIEWS_TEXT_CAP) : text;
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
}

function textOrNull(candidate: unknown): string | null {
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
  if (typeof candidate !== 'string') return null;
  const t = candidate.trim();
  return t === '' ? null : cap(t);
}

function isAlnum(code: number): boolean {
  return (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
}

/** Lower-cased letters and digits only: the roster's matching key ("LM Studio" and "lm-studio" are both "lmstudio"). */
export function slugOf(text: string): string {
  let out = '';
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) {
    const c = lower.charCodeAt(i);
    if (isAlnum(c)) out += lower.charAt(i);
  }
  return out;
}

function splitLines(body: string): string[] {
  const capped = body.length > REVIEWS_BODY_CAP ? body.slice(0, REVIEWS_BODY_CAP) : body;
  const lines = capped.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.length > 0 && line.charCodeAt(line.length - 1) === 13) lines[i] = line.slice(0, -1);
  }
  return lines;
}

/** The UTC calendar day of a frontmatter date (a Date, or a string that opens with one), or null. */
function dayOf(candidate: unknown): string | null {
  if (candidate instanceof Date) return Number.isNaN(candidate.valueOf()) ? null : candidate.toISOString().slice(0, 10);
  if (typeof candidate !== 'string') return null;
  const t = candidate.trim();
  return t.length >= 10 ? t.slice(0, 10) : null;
}

function listOfText(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) return [];
  const out: string[] = [];
  for (const item of candidate) {
    const t = textOrNull(item);
    if (t !== null && out.length < 200) out.push(t);
  }
  return out;
}

function rosterOf(frontmatter: Record<string, unknown>): ReviewsRosterEntry[] {
  const order: string[] = [];
  const models = new Map<string, string | null>();
  const missing = new Map<string, string[]>();
  const note = (slug: string): void => {
    if (slug !== '' && !order.includes(slug) && order.length < 100) order.push(slug);
  };
  for (const name of listOfText(frontmatter.reviewers)) note(slugOf(name));
  if (isRecord(frontmatter.models)) {
    for (const [key, value] of Object.entries(frontmatter.models)) {
      const slug = slugOf(key);
      if (slug === '') continue;
      note(slug);
      models.set(slug, typeof value === 'string' && value.trim() !== '' ? cap(value.trim()) : null);
    }
  }
  if (isRecord(frontmatter.plan_coverage)) {
    for (const [key, value] of Object.entries(frontmatter.plan_coverage)) {
      const slug = slugOf(key);
      if (slug === '' || !isRecord(value)) continue;
      note(slug);
      missing.set(slug, listOfText(value.missing));
    }
  }
  return order.map((slug) => ({ slug, model: models.get(slug) ?? null, missing: missing.get(slug) ?? [] }));
}

/** An H2 line's text ("## 04-02" gives "04-02"), or null when the line is not an H2. */
function h2Text(line: string): string | null {
  if (line.charCodeAt(0) !== 35 || line.charCodeAt(1) !== 35) return null;
  const third = line.charCodeAt(2);
  if (third !== 32 && third !== 9) return null;
  let text = line.slice(3).trim();
  let end = text.length;
  while (end > 0 && text.charCodeAt(end - 1) === 35) end -= 1;
  if (end < text.length && (end === 0 || text.charCodeAt(end - 1) === 32)) text = text.slice(0, end).trim();
  return text === '' ? null : text.length > 300 ? text.slice(0, 300) : text;
}

/** `Claude Review` or `Claude Review (opus)`: the name and the instance, or null when the heading is not a reviewer's. */
function reviewerHeading(text: string): { name: string; instance: string | null } | null {
  let base = text.trim();
  let instance: string | null = null;
  if (base.endsWith(')')) {
    const open = base.lastIndexOf('(');
    if (open > 0) {
      const inner = base.slice(open + 1, base.length - 1).trim();
      const before = base.slice(0, open).trimEnd();
      if (before.toLowerCase().endsWith(' review')) {
        instance = inner === '' ? null : inner;
        base = before;
      }
    }
  }
  const lower = base.toLowerCase();
  if (!lower.endsWith(' review')) return null;
  const name = base.slice(0, base.length - 7).trim();
  return name === '' ? null : { name, instance };
}

/** `04-02`, `12.6-01` or `Plan 04-02`: the plan id, or null. Digits (and dots) then a dash then digits. */
function planIdOf(text: string): string | null {
  let t = text.trim();
  if (t.toLowerCase().startsWith('plan ')) t = t.slice(5).trim();
  let i = 0;
  const digits = (): boolean => {
    const from = i;
    while (i < t.length && t.charCodeAt(i) >= 48 && t.charCodeAt(i) <= 57) i += 1;
    return i > from;
  };
  if (!digits()) return null;
  while (t.charCodeAt(i) === 46) {
    i += 1;
    if (!digits()) return null;
  }
  if (t.charCodeAt(i) !== 45) return null;
  i += 1;
  if (!digits()) return null;
  return i === t.length ? t : null;
}

function indentOf(line: string): number {
  let i = 0;
  while (i < line.length && (line.charCodeAt(i) === 32 || line.charCodeAt(i) === 9)) i += 1;
  return i;
}

/** The text of a list item (`- `, `* `, `+ `, `1. `), or null when the line is not one. */
function listItemOf(line: string): string | null {
  const t = line.trimStart();
  const first = t.charCodeAt(0);
  if (first === 45 || first === 42 || first === 43) return t.charCodeAt(1) === 32 ? t.slice(2).trim() : null;
  let i = 0;
  while (i < t.length && t.charCodeAt(i) >= 48 && t.charCodeAt(i) <= 57) i += 1;
  if (i === 0 || i > 4) return null;
  if ((t.charCodeAt(i) !== 46 && t.charCodeAt(i) !== 41) || t.charCodeAt(i + 1) !== 32) return null;
  return t.slice(i + 2).trim();
}

function isMark(code: number): boolean {
  return code === 42 || code === 95 || code === 96 || code === 32 || code === 91 || code === 40;
}

/** The severity word an item opens with, read through bold, backticks or brackets, and what follows it. `strict` asks for
 * a colon (inside or outside the marks) or a dash after the word, so "Low-risk shortcuts exist" is not a concern. */
export function readSeverity(text: string, strict: boolean): { severity: ReviewSeverity; rest: string } | null {
  const t = text.trim();
  let open = 0;
  while (open < t.length && isMark(t.charCodeAt(open))) open += 1;
  const head = t.slice(open, open + 7).toLowerCase();
  const words: readonly (readonly [string, ReviewSeverity])[] = [
    ['medium', 'MEDIUM'],
    ['high', 'HIGH'],
    ['low', 'LOW'],
  ];
  for (const [word, severity] of words) {
    if (!head.startsWith(word)) continue;
    let k = open + word.length;
    const after = t.charCodeAt(k);
    if ((after >= 97 && after <= 122) || (after >= 65 && after <= 90) || after === 95) continue;
    let separated = false;
    while (k < t.length && (t.charCodeAt(k) === 42 || t.charCodeAt(k) === 95 || t.charCodeAt(k) === 96 || t.charCodeAt(k) === 93 || t.charCodeAt(k) === 41)) k += 1;
    if (t.charCodeAt(k) === 58) {
      k += 1;
      separated = true;
      while (k < t.length && (t.charCodeAt(k) === 42 || t.charCodeAt(k) === 95 || t.charCodeAt(k) === 96)) k += 1;
    } else if (t.charCodeAt(k) === 32 && (t.charCodeAt(k + 1) === 45 || t.charCodeAt(k + 1) === 8211 || t.charCodeAt(k + 1) === 8212) && t.charCodeAt(k + 2) === 32) {
      k += 3;
      separated = true;
    }
    if (strict && !separated) continue;
    return { severity, rest: cap(t.slice(k).trim()) };
  }
  return null;
}

/** The first word of a Risk Assessment line when it is LOW, MEDIUM or HIGH. */
function riskWordOf(text: string): ReviewSeverity | null {
  const read = readSeverity(text, false);
  return read === null ? null : read.severity;
}

type Label = 'intro' | 'summary' | 'strengths' | 'concerns' | 'suggestions' | 'risk' | 'verdict' | 'other';

const LABELS: ReadonlyMap<string, Label> = new Map([
  ['summary', 'summary'],
  ['strengths', 'strengths'],
  ['concerns', 'concerns'],
  ['suggestions', 'suggestions'],
  ['risk assessment', 'risk'],
  ['risk', 'risk'],
  ['verdict', 'verdict'],
]);

function stripMarks(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && isMark(text.charCodeAt(start))) start += 1;
  while (end > start && (isMark(text.charCodeAt(end - 1)) || text.charCodeAt(end - 1) === 58)) end -= 1;
  return text.slice(start, end);
}

/** `Concerns:`, `**Concerns:**`, `Risk: MEDIUM. ...` or `Verdict: approve`: the label and any value on the line, or null.
 * Only a known label counts, so an item that happens to contain a colon is not one. */
function labelLine(text: string): { label: Label; value: string } | null {
  const t = text.trim();
  const colon = t.indexOf(':');
  if (colon <= 0 || colon > 24) return null;
  const label = LABELS.get(stripMarks(t.slice(0, colon)).toLowerCase());
  if (label === undefined) return null;
  const value = stripMarks(t.slice(colon + 1).trim());
  if ((label === 'risk' || label === 'verdict') && value !== '') return { label, value: cap(t.slice(colon + 1).trim()) };
  return value === '' ? { label, value: '' } : null;
}

function noneLike(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return lower.startsWith('none') || lower.startsWith('n/a') || lower.startsWith('no concerns') || lower.startsWith('no issues');
}

interface Section {
  concerns: ReviewsConcern[];
  plans: ReviewsPlanStance[];
  planIds: string[];
}

/** One pass over a reviewer's lines (outside fences): the concerns, each plan's risk and verdict, the plan headings. */
function readReviewer(lines: readonly string[], from: number, to: number): Section {
  const concerns: ReviewsConcern[] = [];
  const stances = new Map<string | null, ReviewsPlanStance>();
  const planIds: string[] = [];
  let planId: string | null = null;
  let label: Label = 'intro';
  let pending: 'risk' | 'verdict' | null = null;
  let last: ReviewsConcern | null = null;
  let lastIndent = 0;
  const stanceOf = (id: string | null): ReviewsPlanStance | null => {
    const found = stances.get(id);
    if (found !== undefined) return found;
    if (stances.size >= REVIEWS_PLAN_CAP) return null;
    const made: ReviewsPlanStance = { planId: id, risk: null, verdict: null };
    stances.set(id, made);
    return made;
  };
  const setValue = (which: 'risk' | 'verdict', value: string): void => {
    const word = which === 'risk' ? riskWordOf(value) : null;
    const verdict = which === 'verdict' ? cap(stripMarks(value)) : '';
    if (word === null && verdict === '') return;
    const stance = stanceOf(planId);
    if (stance === null) return;
    if (word !== null && stance.risk === null) stance.risk = word;
    if (verdict !== '' && stance.verdict === null) stance.verdict = verdict;
  };
  const addConcern = (severity: ReviewSeverity | null, text: string, indent: number): void => {
    if (concerns.length >= REVIEWS_CONCERN_CAP) {
      last = null;
      return;
    }
    const concern: ReviewsConcern = { severity, text: cap(text), planId };
    concerns.push(concern);
    last = concern;
    lastIndent = indent;
  };
  eachLineOutsideFences(lines, from, to, (line) => {
    const t = line.trim();
    if (t === '') {
      last = null;
      return;
    }
    // A heading line.
    if (t.charCodeAt(0) === 35) {
      let depth = 0;
      while (depth < t.length && t.charCodeAt(depth) === 35) depth += 1;
      if (depth <= 6 && (t.charCodeAt(depth) === 32 || t.charCodeAt(depth) === 9)) {
        last = null;
        pending = null;
        const text = t.slice(depth).trim();
        if (depth <= 2) {
          const id = planIdOf(text);
          planId = id;
          label = 'intro';
          if (id !== null && planIds.length < REVIEWS_PLAN_CAP && !planIds.includes(id)) planIds.push(id);
        } else {
          label = LABELS.get(stripMarks(text).toLowerCase()) ?? 'other';
          if (label === 'risk' || label === 'verdict') pending = label;
        }
        return;
      }
    }
    if (pending !== null) {
      setValue(pending, t);
      pending = null;
      return;
    }
    const labelled = labelLine(t);
    if (labelled !== null) {
      last = null;
      label = labelled.label;
      if (labelled.value !== '' && (label === 'risk' || label === 'verdict')) setValue(label, labelled.value);
      else if (label === 'risk' || label === 'verdict') pending = label;
      return;
    }
    const indent = indentOf(line);
    const item = listItemOf(line);
    if (label === 'concerns') {
      const body = item ?? t;
      const read = readSeverity(body, item === null);
      if (read !== null) {
        addConcern(read.severity, read.rest, indent);
        return;
      }
      if (item !== null && !noneLike(item)) {
        addConcern(null, item, indent);
        return;
      }
    } else if (label === 'intro' || label === 'other') {
      const read = item === null ? null : readSeverity(item, true);
      if (read !== null) {
        addConcern(read.severity, read.rest, indent);
        return;
      }
    }
    if (last !== null && indent > lastIndent) {
      last.text = cap(`${last.text} ${t}`);
    }
  });
  return { concerns, plans: [...stances.values()], planIds };
}

function highest(risks: readonly (ReviewSeverity | null)[]): ReviewSeverity | null {
  let best: ReviewSeverity | null = null;
  for (const r of risks) {
    if (r === null) continue;
    if (best === null || rank(r) > rank(best)) best = r;
  }
  return best;
}

function rank(severity: ReviewSeverity): number {
  return severity === 'HIGH' ? 3 : severity === 'MEDIUM' ? 2 : 1;
}

/** The text of a line range, the conflicts block's lines left out, edge blank lines and trailing rules dropped. */
function textOfRange(lines: readonly string[], from: number, to: number, inRegion: Uint8Array): string {
  const kept: string[] = [];
  for (let i = from; i < to; i += 1) {
    if (inRegion[i] === 1) continue;
    kept.push(lines[i]);
  }
  let start = 0;
  let end = kept.length;
  const isRule = (line: string): boolean => {
    const t = line.trim();
    return t === '---' || t === '***' || t === '___';
  };
  while (start < end && (kept[start].trim() === '')) start += 1;
  while (end > start && (kept[end - 1].trim() === '' || isRule(kept[end - 1]))) end -= 1;
  return kept.slice(start, end).join('\n');
}

function listsOfConsensus(lines: readonly string[], from: number, to: number): { strengths: string[]; concerns: string[]; divergent: string[] } {
  const out = { strengths: [] as string[], concerns: [] as string[], divergent: [] as string[] };
  let into: string[] | null = null;
  let current = -1;
  eachLineOutsideFences(lines, from, to, (line) => {
    const t = line.trim();
    if (t.startsWith('###') && t.charCodeAt(3) !== 35) {
      const lower = t.slice(3).trim().toLowerCase();
      current = -1;
      if (lower.startsWith('agreed strength')) into = out.strengths;
      else if (lower.startsWith('agreed concern')) into = out.concerns;
      else if (lower.startsWith('divergent')) into = out.divergent;
      else into = null;
      return;
    }
    if (into === null || t === '') return;
    const item = listItemOf(line);
    if (item !== null) {
      if (into.length < REVIEWS_CONSENSUS_CAP) {
        into.push(cap(item));
        current = into.length - 1;
      } else {
        current = -1;
      }
      return;
    }
    if (current >= 0 && indentOf(line) > 0) into[current] = cap(`${into[current]} ${t}`);
  });
  return out;
}

function phaseOfBody(lines: readonly string[]): string | null {
  for (let i = 0; i < lines.length && i < 40; i += 1) {
    const t = lines[i].trim();
    if (!t.startsWith('# ')) continue;
    const lower = t.toLowerCase();
    const at = lower.indexOf('phase');
    if (at < 0) return null;
    let k = at + 5;
    while (k < lower.length && lower.charCodeAt(k) === 32) k += 1;
    const start = k;
    while (k < lower.length && ((lower.charCodeAt(k) >= 48 && lower.charCodeAt(k) <= 57) || lower.charCodeAt(k) === 46)) k += 1;
    let end = k;
    while (end > start && lower.charCodeAt(end - 1) === 46) end -= 1;
    return end > start ? lower.slice(start, end) : null;
  }
  return null;
}

/** Reads a REVIEWS.md. Never throws on text; bounded and linear. `frontmatter` is the parsed frontmatter, `body` the text
 * after it. */
export function extractReviews(frontmatter: Record<string, unknown>, body: string): ReviewsBody {
  const lines = splitLines(body);
  const roster = rosterOf(frontmatter);
  const rosterBy = new Map<string, ReviewsRosterEntry>();
  for (const entry of roster) rosterBy.set(entry.slug, entry);

  // The Plan-Revision Conflicts block between its markers is not a reviewer and no heading inside it counts.
  const inRegion = new Uint8Array(lines.length);
  const others: ReviewsOtherSection[] = [];
  {
    let begin = -1;
    eachLineOutsideFences(lines, 0, lines.length, (line, index) => {
      const t = line.trim();
      if (t.startsWith('<!--') && t.includes('plan-revision-conflicts:begin')) {
        if (begin < 0) begin = index;
        return;
      }
      if (t.startsWith('<!--') && t.includes('plan-revision-conflicts:end') && begin >= 0) {
        const kept: string[] = [];
        for (let i = begin; i <= index; i += 1) {
          inRegion[i] = 1;
          const raw = lines[i].trim();
          if (i === begin || i === index || h2Text(lines[i]) !== null || raw === '') continue;
          kept.push(lines[i]);
        }
        const text = kept.join('\n').trim();
        if (text !== '' && others.length < REVIEWS_OTHER_CAP) others.push({ heading: 'Plan-Revision Conflicts', text: cap(text) });
        begin = -1;
      }
    });
  }

  // Every H2 outside a fence and outside the conflicts block.
  const heads: { index: number; text: string }[] = [];
  eachLineOutsideFences(lines, 0, lines.length, (line, index) => {
    if (inRegion[index] === 1) return;
    const text = h2Text(line);
    if (text !== null) heads.push({ index, text });
  });

  let consensusAt = -1;
  for (const h of heads) {
    if (h.text.toLowerCase() === 'consensus summary') {
      consensusAt = h.index;
      break;
    }
  }
  const limit = consensusAt >= 0 ? consensusAt : lines.length;
  const starts: { index: number; name: string; instance: string | null }[] = [];
  for (const h of heads) {
    if (h.index >= limit) break;
    const found = reviewerHeading(h.text);
    if (found !== null) starts.push({ index: h.index, name: found.name, instance: found.instance });
  }

  const sectionOf = (name: string, instance: string | null, from: number, to: number): ReviewerSection => {
    const slug = slugOf(name);
    const entry = rosterBy.get(slug);
    const read = readReviewer(lines, from, to);
    const text = textOfRange(lines, from, to, inRegion);
    const lower = text.toLowerCase();
    const reducedWhy: ReducedReason[] = [];
    if (lower.includes('reviewed-without-repo-access')) reducedWhy.push('no-repo-access');
    if (lower.includes('reviewed-without-source-citations')) reducedWhy.push('no-source-citations');
    // A stub is a whole section that only says it failed or was skipped: a review that merely quotes the phrase has plan
    // sections or concerns of its own.
    const substantive = read.planIds.length > 0 || read.concerns.length > 0 || read.plans.length > 0;
    let status: ReviewerStatus = 'ok';
    if (!substantive && lower.includes('review skipped: prompt budget')) status = 'skipped';
    else if (!substantive && lower.includes('failed or returned empty output')) status = 'failed';
    return {
      name: cap(name),
      instance: instance === null ? null : cap(instance),
      slug: entry === undefined ? null : slug,
      model: entry === undefined ? null : entry.model,
      status,
      reduced: reducedWhy.length > 0,
      reducedWhy,
      risk: highest(read.plans.map((p) => p.risk)),
      concerns: read.concerns,
      plans: read.plans,
      planIds: read.planIds,
      body: { start: from, end: to },
      text,
    };
  };

  const reviewers: ReviewerSection[] = [];
  const kept = starts.slice(0, REVIEWS_REVIEWER_CAP);
  for (let i = 0; i < kept.length; i += 1) {
    const to = i + 1 < starts.length ? starts[i + 1].index : limit;
    reviewers.push(sectionOf(kept[i].name, kept[i].instance, kept[i].index + 1, to));
  }

  if (starts.length === 0) {
    // No reviewer heading: one reviewer carries the whole text, so the page shows it as written and groups nothing.
    let from = 0;
    while (from < limit && (lines[from].trim() === '' || lines[from].trim().startsWith('# '))) from += 1;
    const whole = textOfRange(lines, from, limit, inRegion);
    if (whole !== '') {
      const only = roster.length === 1 ? roster[0] : undefined;
      const name = only === undefined ? 'Review' : only.slug.charAt(0).toUpperCase() + only.slug.slice(1);
      reviewers.push(sectionOf(name, null, from, limit));
    }
  } else {
    // Sections before the first reviewer that are not the conflicts block: unclaimed, kept as written.
    for (let i = 0; i < heads.length; i += 1) {
      const h = heads[i];
      if (h.index >= starts[0].index) break;
      const to = Math.min(i + 1 < heads.length ? heads[i + 1].index : limit, starts[0].index);
      const text = textOfRange(lines, h.index + 1, to, inRegion);
      if (text !== '' && others.length < REVIEWS_OTHER_CAP) others.push({ heading: h.text, text });
    }
  }

  let consensus: ReviewsConsensus | null = null;
  if (consensusAt >= 0) {
    const lists = listsOfConsensus(lines, consensusAt + 1, lines.length);
    consensus = { ...lists, text: textOfRange(lines, consensusAt + 1, lines.length, inRegion) };
  }

  return {
    phase: textOrNull(frontmatter.phase) ?? phaseOfBody(lines),
    reviewedAt: dayOf(frontmatter.reviewed_at),
    plansReviewed: listOfText(frontmatter.plans_reviewed),
    roster,
    reviewers,
    consensus,
    others,
  };
}
