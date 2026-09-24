// The CONTEXT.md D1 brief projection (quick-260923-lju): a tolerant, line-scanned read of a
// CONTEXT document's body into `ContextBrief` — boundary, decision areas, open questions,
// discretion, specific/deferred ideas, requirement amendments (quick-260925-3ob), and the
// recognised-heading ledger the composer needs to build the unrecognised-section remainder (C-1).
// Composed exclusively from `splitSections` /
// `splitSubsections` / `parseMarkdownTable` plus per-line bounded regexes (T-01-11) — never a
// whole-document regex, never a nested unbounded quantifier. Called from `ContextHandler.parse`
// inside a try/catch; a throw here must never break `structured.decisions`/`structured.sections`.
import { splitSections, splitSubsections, parseMarkdownTable } from './markdown-sections.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface ContextBriefMeta {
  title: string | null;
  phase: string | null;
  quickId: string | null;
  gathered: string | null;
  status: string | null;
  /** True only when the text between the H1 and the first `##`/tag line holds a non-blank line
   * other than the Gathered/Status lines. */
  preambleExtra: boolean;
}

export type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; rows: Record<string, string>[] }
  | { kind: 'code'; text: string };

export interface OutItem {
  text: string;
  dest: string | null;
}

export interface BoundaryExtra {
  title: string | null;
  blocks: Block[];
}

export interface ContextBoundary {
  /** The originating `##` heading text (e.g. "Phase Boundary"). */
  eyebrow: string;
  statement: string | null;
  statementRest: string;
  inList: string[];
  outList: OutItem[];
  outFromProse: boolean;
  outSource: string | null;
  drift: boolean;
  /** Every other summary-region block, in order (Task 1); Task 2 pulls table+label pairs out into
   * `notes` instead. */
  blocks: Block[];
  /** Table blocks (plus a directly-preceding label paragraph) moved out of `blocks` — never
   * rendered inside the narrow In card. */
  notes: BoundaryExtra[];
  /** `###` subsections (or `---` runs) after the summary region. */
  extras: BoundaryExtra[];
}

export type AreaEntry =
  | {
      kind: 'decision';
      tag: string | null;
      summary: string;
      detail: string;
      reversibility: { word: string; text: string } | null;
    }
  | { kind: 'note'; text: string };

export interface ContextArea {
  title: string;
  entries: AreaEntry[];
}

export interface OpenQuestionItem {
  tag: string | null;
  number: number;
  /** `D-NN` tags found in the tag's parenthetical, e.g. `(blocks D-09)`. */
  blocks: string[];
  summary: string;
  detail: string;
}

export interface OpenQuestionsSource {
  heading: string;
  lead: Block[];
  items: OpenQuestionItem[];
}

export interface DiscretionBlock {
  heading: string;
  lead: Block[];
  items: string[];
  trailer: Block[];
}

export interface IdeaItem {
  title: string | null;
  body: string;
}

/** One `###`-titled (or untitled, when it holds a section's lead prose) group of blocks inside a
 * back-matter aside section (amendments/references/code) — quick-260925-3ob. */
export interface AsideGroup {
  title: string | null;
  blocks: Block[];
}

/** One back-matter aside section — a `<blocking_amendments>`/`<canonical_refs>`/`<code_context>`
 * `##` section (or heading-matched equivalent), reduced to its own heading text plus its groups
 * (quick-260925-3ob). */
export interface ContextAside {
  heading: string;
  groups: AsideGroup[];
}

export interface ContextBrief {
  meta: ContextBriefMeta;
  boundary: ContextBoundary | null;
  decisionsPreamble: Block[];
  areas: ContextArea[];
  openQuestions: OpenQuestionsSource[];
  discretion: DiscretionBlock | null;
  specifics: IdeaItem[];
  deferred: IdeaItem[];
  /** Requirement-amendments back matter (quick-260925-3ob, 3OB-01) — recognised by the
   * `<blocking_amendments>` tag or a "Requirement amendments" heading. */
  amendments: ContextAside[];
  /** Canonical-references back matter (quick-260925-3ob, 3OB-02). */
  references: ContextAside[];
  /** Existing-code-insights back matter (quick-260925-3ob, 3OB-03). */
  codeInsights: ContextAside[];
  /** Every `##` heading text this extractor accounted for — the composer's partition key for the
   * unrecognised-section (`extras`) bucket. */
  recognizedHeadings: string[];
}

// ---------------------------------------------------------------------------
// firstSentence
// ---------------------------------------------------------------------------

const ABBREV_TAIL_RE = /(?:^|[\s(])(e\.g|i\.e|etc|vs|cf)$/i;

/**
 * Splits `text` at its first sentence boundary: `[.!?]` followed by whitespace or end-of-text.
 * Masks the scan (never the returned substrings) against code spans (backticks) and bold spans
 * (`**…**`) — a sentence never ends inside a code span, and never inside an odd `**` count unless
 * `**` directly follows (in which case the boundary lands right after that closing marker).
 * Recognised abbreviations (e.g./i.e./etc./vs./cf.) never end a sentence. No boundary found means
 * the whole text, with an empty remainder.
 */
export function firstSentence(text: string): [string, string] {
  let backtickCount = 0;
  let boldCount = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '`') {
      backtickCount += 1;
      continue;
    }
    if (text.startsWith('**', i)) {
      boldCount += 1;
      i += 1; // consumes the second '*' too (loop's own i++ handles the first)
      continue;
    }
    if (ch === '.' || ch === '!' || ch === '?') {
      const insideCode = backtickCount % 2 === 1;
      if (insideCode) continue;
      if (ch === '.') {
        const before = text.slice(Math.max(0, i - 6), i);
        if (ABBREV_TAIL_RE.test(before)) continue;
      }
      const insideBold = boldCount % 2 === 1;
      // Inside an odd `**` count, a boundary only lands when `**` directly follows the
      // punctuation (closing the bold span right there) — the end then lands after that closing
      // marker, whitespace or not. Outside a bold span, the ordinary "followed by whitespace or
      // end of text" rule applies.
      if (insideBold) {
        if (text.startsWith('**', i + 1)) {
          const end = i + 1 + 2;
          return [text.slice(0, end), text.slice(end).trim()];
        }
        continue;
      }
      const next = text[i + 1];
      const followedByWs = next === undefined || /\s/.test(next);
      if (!followedByWs) continue;
      return [text.slice(0, i + 1), text.slice(i + 1).trim()];
    }
  }
  return [text, ''];
}

// ---------------------------------------------------------------------------
// parseBlocks — the shared block parser (paragraph / list / table / code)
// ---------------------------------------------------------------------------

const ORDERED_ITEM_RE = /^\d{1,3}[.)]\s+(.*)$/;
const UNORDERED_ITEM_RE = /^[-*]\s+(.*)$/;
const TABLE_SEPARATOR_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

function isIndentedContinuation(line: string): boolean {
  return /^[ \t]+\S/.test(line) && !/^[ \t]*(-|\*|\d{1,3}[.)])\s/.test(line);
}

/**
 * Turns `markdown` into paragraph/list/table/code blocks. Every non-blank line lands in exactly
 * one block. A run of consecutive pipe lines is a table only when its second line is a valid GFM
 * separator row; otherwise the run falls back to a paragraph (verbatim, C-2 conservative).
 */
export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '' || TAG_LINE_RE.test(trimmed)) {
      i += 1;
      continue;
    }

    // Fenced code block.
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // consume the closing fence
      blocks.push({ kind: 'code', text: codeLines.join('\n') });
      continue;
    }

    // Table run.
    if (trimmed.startsWith('|')) {
      const runStart = i;
      const runLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        runLines.push(lines[i]);
        i += 1;
      }
      const isTable = runLines.length >= 2 && TABLE_SEPARATOR_RE.test(runLines[1].trim());
      if (isTable) {
        blocks.push({ kind: 'table', rows: parseMarkdownTable(runLines.join('\n')) });
      } else {
        blocks.push({ kind: 'paragraph', text: runLines.map((l) => l.trim()).join(' ') });
      }
      void runStart;
      continue;
    }

    // List run.
    const orderedMatch = ORDERED_ITEM_RE.exec(trimmed);
    const unorderedMatch = UNORDERED_ITEM_RE.exec(trimmed);
    if (orderedMatch || unorderedMatch) {
      const ordered = !!orderedMatch;
      const items: string[] = [];
      let current = (orderedMatch ?? unorderedMatch)![1].trim();
      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        const nextTrimmed = next.trim();
        if (nextTrimmed === '') {
          // A blank line followed by an indented continuation keeps the list open (a
          // multi-paragraph item); otherwise it ends the run.
          if (i + 1 < lines.length && isIndentedContinuation(lines[i + 1])) {
            i += 1;
            continue;
          }
          break;
        }
        const nextOrdered = ORDERED_ITEM_RE.exec(nextTrimmed);
        const nextUnordered = UNORDERED_ITEM_RE.exec(nextTrimmed);
        if (nextOrdered || nextUnordered) {
          items.push(current);
          current = (nextOrdered ?? nextUnordered)![1].trim();
          i += 1;
          continue;
        }
        if (isIndentedContinuation(next)) {
          current += ' ' + nextTrimmed;
          i += 1;
          continue;
        }
        break;
      }
      items.push(current);
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // Paragraph: consecutive non-blank, non-list/table/code/heading lines.
    const paraLines: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('```') &&
      !ORDERED_ITEM_RE.test(lines[i].trim()) &&
      !UNORDERED_ITEM_RE.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
}

function blockText(block: Block): string {
  if (block.kind === 'paragraph') return block.text;
  if (block.kind === 'code') return block.text;
  if (block.kind === 'list') return block.items.join(' ');
  return block.rows.map((row) => Object.values(row).join(' ')).join(' ');
}

// ---------------------------------------------------------------------------
// Top-level-punctuation splitting (outside backticks and parentheses)
// ---------------------------------------------------------------------------

/** Splits `text` on every top-level occurrence of `sep` — never inside backticks or parens. */
function splitTopLevel(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inCode = false;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '`') inCode = !inCode;
    if (!inCode) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth = Math.max(0, depth - 1);
    }
    if (!inCode && depth === 0 && ch === sep) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/** Counts top-level occurrences of `sep` (outside backticks/parens), for the "at least N
 * separators" checks the discretion/in-scope splitters use. */
function countTopLevel(text: string, sep: string): number {
  return splitTopLevel(text, sep).length - 1;
}

function stripLeadingAndOr(item: string): string {
  return item.trim().replace(/^(and|or)\s+/i, '').trim();
}

function stripTrailingPeriod(item: string): string {
  return item.replace(/\.\s*$/, '').trim();
}

/** Splits a colon-list's tail on `;` if any top-level `;` exists, else on `,`; strips a leading
 * and/or and the trailing period from every item. Falls back to `[whole]` when splitting would
 * otherwise yield only one item. */
function splitColonListItems(tail: string): string[] {
  const bySemicolon = countTopLevel(tail, ';') > 0 ? splitTopLevel(tail, ';') : null;
  const raw = bySemicolon ?? splitTopLevel(tail, ',');
  const items = raw.map((part) => stripTrailingPeriod(stripLeadingAndOr(part))).filter((s) => s !== '');
  return items.length >= 1 ? items : [stripTrailingPeriod(tail.trim())];
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const TITLE_LINE_RE = /^#\s+(.+)$/m;
const PHASE_PREFIX_RE = /^Phase\s+(\d+(?:\.\d+)?)\s*:\s*/i;
const QUICK_PREFIX_RE = /^Quick Task\s+([\w-]+)\s*:\s*/i;
const CONTEXT_SUFFIX_RE = /\s*-\s*Context\s*$/i;
const GATHERED_LINE_RE = /^\*\*Gathered:\*\*\s*(.*)$/;
const STATUS_LINE_RE = /^\*\*Status:\*\*\s*(.*)$/;
const TAG_LINE_RE = /^<\/?[a-z_]+>$/;

function parseMeta(body: string): ContextBriefMeta {
  const titleMatch = TITLE_LINE_RE.exec(body);
  let title: string | null = null;
  let phase: string | null = null;
  let quickId: string | null = null;
  if (titleMatch) {
    let rest = titleMatch[1].trim();
    const phaseMatch = PHASE_PREFIX_RE.exec(rest);
    const quickMatch = QUICK_PREFIX_RE.exec(rest);
    if (phaseMatch) {
      phase = phaseMatch[1];
      rest = rest.slice(phaseMatch[0].length);
    } else if (quickMatch) {
      quickId = quickMatch[1];
      rest = rest.slice(quickMatch[0].length);
    }
    rest = rest.replace(CONTEXT_SUFFIX_RE, '').trim();
    title = rest;
  }

  let gathered: string | null = null;
  let status: string | null = null;
  const firstHeadingMatch = body.search(/^##\s+/m);
  const firstTagMatch = body.search(/^<[a-z_]+>\s*$/m);
  const candidates = [firstHeadingMatch, firstTagMatch].filter((n) => n !== -1);
  const preambleEnd = candidates.length > 0 ? Math.min(...candidates) : body.length;
  const preamble = body.slice(titleMatch ? titleMatch.index + titleMatch[0].length : 0, preambleEnd);
  let preambleExtra = false;
  for (const raw of preamble.split('\n')) {
    const line = raw.trim();
    if (line === '') continue;
    const gatheredMatch = GATHERED_LINE_RE.exec(line);
    if (gatheredMatch) {
      if (gathered === null) gathered = gatheredMatch[1].trim();
      continue;
    }
    const statusMatch = STATUS_LINE_RE.exec(line);
    if (statusMatch) {
      if (status === null) status = statusMatch[1].trim();
      continue;
    }
    preambleExtra = true;
  }

  return { title, phase, quickId, gathered, status, preambleExtra };
}

// ---------------------------------------------------------------------------
// Section role resolution
// ---------------------------------------------------------------------------

type Role = 'boundary' | 'decisions' | 'specifics' | 'deferred' | 'references' | 'code' | 'amendments' | null;

const ROLE_HEADING_TESTS: [RegExp, Role][] = [
  [/^(phase|task) boundary/i, 'boundary'],
  [/^implementation decisions/i, 'decisions'],
  [/^specific ideas/i, 'specifics'],
  [/^deferred ideas/i, 'deferred'],
  [/^canonical references/i, 'references'],
  [/^existing code insights/i, 'code'],
  // The leading non-alphanumeric run (never a letter/digit) lets a leading emoji ("⚠️ Requirement
  // amendments…") match without the character class ever consuming the following letter — the
  // scan stays linear (T-lju-02).
  [/^[^\p{L}\p{N}]*requirement amendments?\b/iu, 'amendments'],
];

const TAG_ROLE_BY_NAME: Record<string, Role> = {
  domain: 'boundary',
  decisions: 'decisions',
  specifics: 'specifics',
  deferred: 'deferred',
  canonical_refs: 'references',
  code_context: 'code',
  blocking_amendments: 'amendments',
};

function roleOfHeading(heading: string): Role {
  for (const [re, role] of ROLE_HEADING_TESTS) {
    if (re.test(heading.trim())) return role;
  }
  return null;
}

/** A CONTEXT.md's tag-only lines (`<domain>`, `</deferred>`, …) never nest, so a `##` section's
 * true end is either the next `##` heading (what `splitSections` already bounds it to) or its own
 * closing tag line, whichever comes first — the last tag-wrapped `##` section in the file (usually
 * `<deferred>`) has no following `##` to stop at, so `splitSections` would otherwise hand back
 * trailing footer content (a `---` rule, the closing `*Phase: …*`/`*Context gathered: …*` lines)
 * as if it belonged to that section. Clipped here, once, for every role-bearing top-level section. */
function clipAtFirstClosingTag(text: string): string {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^<\/[a-z_]+>$/.test(lines[i].trim())) {
      return lines.slice(0, i).join('\n');
    }
  }
  return text;
}

/** `splitSections(body)`, with every section's body clipped at its own closing tag line (see
 * `clipAtFirstClosingTag`) — the one seam every role extractor below reads top-level `##`
 * sections through. */
export function topSections(body: string): { heading: string; body: string }[] {
  return splitSections(body).map((s) => ({ heading: s.heading, body: clipAtFirstClosingTag(s.body) }));
}

/** The tag name directly opening above a `##` heading — scans the raw body for the nearest
 * `<tag>` line preceding the heading's own line, stopping at the previous `##` heading or the
 * start of the body (bounded, line-scanned — never a whole-document regex). */
function tagRoleAbove(body: string, headingText: string): Role {
  const lines = body.split('\n');
  const headingRe = new RegExp(`^##\\s+${headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i].trim())) {
      for (let j = i - 1; j >= 0; j--) {
        const trimmed = lines[j].trim();
        if (trimmed === '') continue;
        if (trimmed.startsWith('##')) return null;
        const openTag = /^<([a-z_]+)>$/.exec(trimmed);
        if (openTag) return TAG_ROLE_BY_NAME[openTag[1]] ?? null;
        return null;
      }
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Back-matter asides — amendments / references / code (quick-260925-3ob)
// ---------------------------------------------------------------------------

/** A thematic-break run (three or more of `-`, `*` or `_`, optionally space-separated) — a rule
 * carries no prose, so it is dropped from an aside group's blocks. */
const THEMATIC_BREAK_RE = /^[-*_](?:\s*[-*_]){2,}$/;

function dropThematicBreaks(blocks: Block[]): Block[] {
  return blocks.filter((block) => !(block.kind === 'paragraph' && THEMATIC_BREAK_RE.test(block.text.trim())));
}

/** Every `role`-bearing `##` section (by heading test or opening tag), reduced to its own groups:
 * an untitled leading group for any prose before the first `###` (omitted when empty), then one
 * group per `###` subsection (kept even when empty). A section that yields zero groups is omitted
 * entirely. Used for the amendments/references/code back-matter rows (quick-260925-3ob). */
export function asideSectionsOf(body: string, role: 'amendments' | 'references' | 'code'): ContextAside[] {
  const sections = topSections(body).filter(
    (s) => roleOfHeading(s.heading) === role || tagRoleAbove(body, s.heading) === role,
  );
  const asides: ContextAside[] = [];
  for (const section of sections) {
    const firstSubIndex = section.body.search(/^###\s+/m);
    const preambleText = firstSubIndex === -1 ? section.body : section.body.slice(0, firstSubIndex);
    const groups: AsideGroup[] = [];
    const preambleBlocks = dropThematicBreaks(parseBlocks(preambleText));
    if (preambleBlocks.length > 0) groups.push({ title: null, blocks: preambleBlocks });
    for (const sub of splitSubsections(section.body)) {
      groups.push({ title: sub.heading, blocks: dropThematicBreaks(parseBlocks(sub.body)) });
    }
    if (groups.length === 0) continue;
    asides.push({ heading: section.heading, groups });
  }
  return asides;
}

// ---------------------------------------------------------------------------
// Boundary
// ---------------------------------------------------------------------------

const IN_LABEL_RE = /^(in scope|in this phase)\b/i;
const OUT_LABEL_RE = /^(explicitly\s+)?(not in scope|not in this phase|not this phase|out of scope)\b/i;
const PROSE_OUT_RE = /^This (phase|task) does not\b/i;
const OUT_ARROW_RE = /^(.*?)\s*→\s*(.+)$/;

function stripBold(text: string): string {
  return text.replace(/\*\*/g, '');
}

/** A colon appearing within `maxChars` of the label's start (outside backticks). */
function colonWithin(text: string, maxChars: number): number {
  const scope = text.slice(0, maxChars);
  const idx = scope.indexOf(':');
  return idx;
}

function splitProseOut(paragraph: string): { items: string[]; split: boolean } {
  const [head, rest] = firstSentence(paragraph);
  if (rest.trim() !== '') return { items: [paragraph], split: false };
  if (!/^This (phase|task) does not\b/i.test(head)) return { items: [paragraph], split: false };
  // Split on ", does not" / ", and does not" / " — and does not" boundaries (lookahead on "does not").
  const boundaryRe = /(,\s+and\s+does not\b|,\s+does not\b|\s+—\s+and\s+does not\b)/gi;
  const pieces: string[] = [];
  let match: RegExpExecArray | null;
  const stripped = head.replace(/\.\s*$/, '');
  boundaryRe.lastIndex = 0;
  const boundaries: number[] = [];
  while ((match = boundaryRe.exec(stripped)) !== null) {
    boundaries.push(match.index);
  }
  if (boundaries.length === 0) return { items: [paragraph], split: false };
  let cursor = 0;
  const segments: string[] = [];
  for (const b of boundaries) {
    segments.push(stripped.slice(cursor, b));
    cursor = b;
  }
  segments.push(stripped.slice(cursor));
  // First segment: drop leading "This phase/task does not ".
  const leadRe = /^This (phase|task) does not\s+/i;
  const joinerRe = /^(,\s+and\s+does not\s+|,\s+does not\s+|\s+—\s+and\s+does not\s+)/i;
  for (let idx = 0; idx < segments.length; idx++) {
    let seg = segments[idx];
    if (idx === 0) seg = seg.replace(leadRe, '');
    else seg = seg.replace(joinerRe, '');
    pieces.push(seg.trim());
  }
  const filtered = pieces.filter((p) => p !== '');
  if (filtered.length < 2) return { items: [paragraph], split: false };
  return { items: filtered, split: true };
}

function extractBoundary(body: string): ContextBoundary | null {
  const domainSections = topSections(body).filter((s) => roleOfHeading(s.heading) === 'boundary' || tagRoleAbove(body, s.heading) === 'boundary');
  const section = domainSections[0];
  if (!section) return null;

  // Summary region: content before the first `---` or `###`.
  const ruleIndex = section.body.search(/^---\s*$/m);
  const subIndex = section.body.search(/^###\s+/m);
  const candidates = [ruleIndex, subIndex].filter((n) => n !== -1);
  const summaryEnd = candidates.length > 0 ? Math.min(...candidates) : section.body.length;
  const summaryText = section.body.slice(0, summaryEnd);
  const extrasText = section.body.slice(summaryEnd);

  const blocks = parseBlocks(summaryText);

  let inList: string[] = [];
  let outList: OutItem[] = [];
  let outFromProse = false;
  let outSource: string | null = null;
  let drift = false;
  let statement: string | null = null;
  let statementRest = '';
  const remaining: Block[] = [];

  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    if (block.kind !== 'paragraph') {
      remaining.push(block);
      continue;
    }
    const stripped = stripBold(block.text);
    const colonIdx = colonWithin(stripped, 80);

    if (colonIdx !== -1 && IN_LABEL_RE.test(stripped.trimStart())) {
      const tail = stripped.slice(colonIdx + 1).trim();
      const items = splitColonListItems(tail);
      inList = items;
      continue;
    }

    if (colonIdx !== -1 && OUT_LABEL_RE.test(stripped.trimStart())) {
      drift = /drift/i.test(stripped);
      const next = blocks[idx + 1];
      if (next && next.kind === 'list') {
        outList = next.items.map((item) => {
          const m = OUT_ARROW_RE.exec(item);
          return m ? { text: m[1].trim(), dest: m[2].trim() } : { text: item.trim(), dest: null };
        });
        idx += 1;
      } else {
        const tail = stripped.slice(colonIdx + 1).trim();
        outList = [{ text: tail, dest: null }];
      }
      outSource = block.text;
      continue;
    }

    if (PROSE_OUT_RE.test(block.text.trim())) {
      const { items, split } = splitProseOut(block.text.trim());
      outFromProse = true;
      outSource = block.text.trim();
      outList = items.map((text) => ({ text, dest: null }));
      void split;
      continue;
    }

    if (statement === null) {
      const [head, rest] = firstSentence(block.text);
      statement = head;
      statementRest = rest;
      continue;
    }

    remaining.push(block);
  }

  const extraBlocks = parseBlocks(extrasText);
  const extras: BoundaryExtra[] = [];
  // Group extras by ### subsections.
  const subsections = splitSubsections(extrasText);
  if (subsections.length > 0) {
    for (const sub of subsections) {
      extras.push({ title: sub.heading, blocks: parseBlocks(sub.body) });
    }
  } else if (extraBlocks.length > 0) {
    extras.push({ title: null, blocks: extraBlocks });
  }

  return {
    eyebrow: section.heading,
    statement,
    statementRest,
    inList,
    outList,
    outFromProse,
    outSource,
    drift,
    blocks: remaining,
    notes: [],
    extras,
  };
}

/** Task 2: moves every table block (plus a directly-preceding label paragraph ending in ':')
 * out of `boundary.blocks` and into `boundary.notes` — the narrow In card never holds a table. */
function extractBoundaryNotes(boundary: ContextBoundary): ContextBoundary {
  const notes: BoundaryExtra[] = [];
  const kept: Block[] = [];
  for (let i = 0; i < boundary.blocks.length; i++) {
    const block = boundary.blocks[i];
    if (block.kind === 'table') {
      const prev = kept[kept.length - 1];
      if (prev && prev.kind === 'paragraph' && /:\s*$/.test(prev.text.trim())) {
        kept.pop();
        notes.push({ title: prev.text.trim(), blocks: [block] });
      } else {
        notes.push({ title: null, blocks: [block] });
      }
      continue;
    }
    kept.push(block);
  }
  return { ...boundary, blocks: kept, notes };
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

const DECISION_OPEN_RE = /^\*\*(D-\d{1,3})[:.]?\*\*[:.]?\s*/;
const REVERSIBILITY_SPLIT_RE = /\s[—–-]\s\*\*Reversibility:\*\*\s*/;
const REVERSIBILITY_WORD_RE = /^(reversible|costly|one-way|irreversible)/i;
const DISCRETION_HEADING_RE = /discretion/i;
// Anchored at the start (not a bare substring test) — a heading like "The STATE.md open question
// is already answered" (SP 03's `<resolved_open_question>` block) legitimately contains the words
// "open question" without being one; only a heading that itself IS an open-questions heading
// ("Open questions for the researcher", "Open Questions Carried Forward", …) should match.
const OPEN_QUESTIONS_HEADING_RE = /^open questions?\b/i;

function splitReversibility(text: string): { text: string; reversibility: { word: string; text: string } | null } {
  const parts = text.split(REVERSIBILITY_SPLIT_RE);
  if (parts.length < 2) return { text, reversibility: null };
  const [head, ...revParts] = parts;
  const revText = revParts.join(' ').trim();
  const wordMatch = REVERSIBILITY_WORD_RE.exec(revText);
  const word = wordMatch ? wordMatch[1].toLowerCase() : (revText.split(/\s+/)[0] ?? '').toLowerCase();
  return { text: head.trim(), reversibility: { word, text: revText } };
}

/** Line-scans a `###` area body into note/decision entries, in source order. A `- `/`* `/`N.`/`N)`
 * bullet opens a decision; an indented (or blank-then-indented) continuation extends it; a blank
 * line followed by a non-indented line closes it; a non-bullet paragraph is a note entry. */
function parseAreaEntries(body: string): AreaEntry[] {
  const lines = body.split('\n');
  const entries: AreaEntry[] = [];
  let current: { tag: string | null; parts: string[] } | null = null;
  let noteParts: string[] = [];

  const closeDecision = (): void => {
    if (!current) return;
    const joined = current.parts.join(' ').trim();
    const { text, reversibility } = splitReversibility(joined);
    const [summary, detail] = firstSentence(text);
    entries.push({ kind: 'decision', tag: current.tag, summary, detail: detail || '', reversibility });
    current = null;
  };
  const closeNote = (): void => {
    if (noteParts.length === 0) return;
    entries.push({ kind: 'note', text: noteParts.join(' ').trim() });
    noteParts = [];
  };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === '' || TAG_LINE_RE.test(trimmed)) {
      // A blank line followed by an indented line continues an open decision (multi-paragraph).
      if (current && i + 1 < lines.length && /^[ \t]+\S/.test(lines[i + 1])) {
        i += 1;
        continue;
      }
      closeDecision();
      closeNote();
      i += 1;
      continue;
    }

    // A bullet only opens a NEW decision at column 0 — a nested (indented) sub-bullet is prose
    // detail belonging to the decision already open, not a sibling entry (a real corpus decision
    // routinely nests a `  - sub-point` list under its own top-level `- **D-NN:**` bullet).
    const isTopLevelLine = !/^[ \t]/.test(raw);
    const bulletMatch = isTopLevelLine ? (UNORDERED_ITEM_RE.exec(trimmed) ?? ORDERED_ITEM_RE.exec(trimmed)) : null;
    if (bulletMatch) {
      closeDecision();
      closeNote();
      const content = bulletMatch[1];
      const tagMatch = DECISION_OPEN_RE.exec(content);
      const tag = tagMatch ? tagMatch[1] : null;
      const rest = tagMatch ? content.slice(tagMatch[0].length) : content;
      current = { tag, parts: [rest.trim()] };
      i += 1;
      continue;
    }

    if (current && /^[ \t]+\S/.test(raw)) {
      current.parts.push(trimmed);
      i += 1;
      continue;
    }

    if (current) {
      // A non-indented, non-bullet line while a decision is open (e.g. a reversibility line at
      // column 0) still continues it — real corpus decisions wrap without indentation markers
      // beyond the block's own paragraph flow.
      current.parts.push(trimmed);
      i += 1;
      continue;
    }

    noteParts.push(trimmed);
    i += 1;
  }
  closeDecision();
  closeNote();

  return entries;
}

function extractDecisionsAndAreas(body: string): { preamble: Block[]; areas: ContextArea[] } {
  const decisionsSections = topSections(body).filter(
    (s) => roleOfHeading(s.heading) === 'decisions' || tagRoleAbove(body, s.heading) === 'decisions',
  );
  const section = decisionsSections[0];
  if (!section) return { preamble: [], areas: [] };

  const firstSubIndex = section.body.search(/^###\s+/m);
  const preambleText = firstSubIndex === -1 ? section.body : section.body.slice(0, firstSubIndex);
  const preamble = parseBlocks(preambleText);

  const areas: ContextArea[] = [];
  for (const sub of splitSubsections(section.body)) {
    if (DISCRETION_HEADING_RE.test(sub.heading) || OPEN_QUESTIONS_HEADING_RE.test(sub.heading)) continue;
    areas.push({ title: sub.heading, entries: parseAreaEntries(sub.body) });
  }

  return { preamble, areas };
}

// ---------------------------------------------------------------------------
// Open questions (Task 2)
// ---------------------------------------------------------------------------

const OPEN_TAG_RE = /^\*\*(OPEN-\d{1,3})(?:\s*\(([^)]{1,80})\))?:\*\*\s*/;
const D_TAG_IN_TEXT_RE = /D-\d{1,3}/g;

function openQuestionItemsFromBlocks(blocks: Block[]): OpenQuestionItem[] {
  const items: OpenQuestionItem[] = [];
  let number = 0;
  for (const block of blocks) {
    if (block.kind !== 'list') continue;
    for (const raw of block.items) {
      number += 1;
      const match = OPEN_TAG_RE.exec(raw);
      let tag: string | null = null;
      let rest = raw;
      let blockedTags: string[] = [];
      if (match) {
        tag = match[1];
        rest = raw.slice(match[0].length);
        if (match[2]) blockedTags = match[2].match(D_TAG_IN_TEXT_RE) ?? [];
      }
      const [summary, detail] = firstSentence(rest.trim());
      items.push({ tag, number, blocks: blockedTags, summary, detail: detail || '' });
    }
  }
  return items;
}

function extractOpenQuestions(body: string): OpenQuestionsSource[] {
  const sources: OpenQuestionsSource[] = [];

  // Source 1: a `###` subsection of the decisions section matching /open questions/i.
  for (const decisionsSection of topSections(body).filter(
    (s) => roleOfHeading(s.heading) === 'decisions' || tagRoleAbove(body, s.heading) === 'decisions',
  )) {
    for (const sub of splitSubsections(decisionsSection.body)) {
      if (!OPEN_QUESTIONS_HEADING_RE.test(sub.heading)) continue;
      const blocks = parseBlocks(sub.body);
      const items = openQuestionItemsFromBlocks(blocks);
      if (items.length === 0) continue;
      const lead = blocks.filter((b) => b.kind !== 'list');
      sources.push({ heading: sub.heading, lead, items });
    }
  }

  // Source 2: any `##` section whose heading or opening tag matches open_questions.
  for (const section of topSections(body)) {
    if (roleOfHeading(section.heading) === 'decisions') continue;
    const headingMatches = OPEN_QUESTIONS_HEADING_RE.test(section.heading);
    const tagMatches = tagRoleAbove(body, section.heading) === null && isOpenQuestionsTag(body, section.heading);
    if (!headingMatches && !tagMatches) continue;
    const blocks = parseBlocks(section.body);
    const items = openQuestionItemsFromBlocks(blocks);
    if (items.length === 0) continue;
    const lead = blocks.filter((b) => b.kind !== 'list');
    sources.push({ heading: section.heading, lead, items });
  }

  return sources;
}

function isOpenQuestionsTag(body: string, headingText: string): boolean {
  const lines = body.split('\n');
  const headingRe = new RegExp(`^##\\s+${headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
  for (let i = 0; i < lines.length; i++) {
    if (!headingRe.test(lines[i].trim())) continue;
    for (let j = i - 1; j >= 0; j--) {
      const trimmed = lines[j].trim();
      if (trimmed === '') continue;
      return trimmed === '<open_questions>';
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Discretion (Task 2)
// ---------------------------------------------------------------------------

function extractDiscretion(body: string): DiscretionBlock | null {
  for (const decisionsSection of topSections(body).filter(
    (s) => roleOfHeading(s.heading) === 'decisions' || tagRoleAbove(body, s.heading) === 'decisions',
  )) {
    for (const sub of splitSubsections(decisionsSection.body)) {
      if (!DISCRETION_HEADING_RE.test(sub.heading)) continue;
      const blocks = parseBlocks(sub.body);
      const firstListIndex = blocks.findIndex((b) => b.kind === 'list');

      if (firstListIndex !== -1) {
        const list = blocks[firstListIndex] as { kind: 'list'; ordered: boolean; items: string[] };
        const lead = blocks.slice(0, firstListIndex);
        const trailer = blocks.slice(firstListIndex + 1);
        return { heading: sub.heading, lead, items: list.items, trailer };
      }

      // No list: look for exactly one paragraph with a top-level colon followed by a
      // comma/semicolon list of at least 2 top-level separators.
      const paragraphs = blocks.filter((b): b is { kind: 'paragraph'; text: string } => b.kind === 'paragraph');
      if (paragraphs.length === 1) {
        const text = paragraphs[0].text;
        const colonIdx = topLevelColonIndex(text);
        if (colonIdx !== -1) {
          const tail = text.slice(colonIdx + 1).trim();
          const semicolons = countTopLevel(tail, ';');
          const commas = countTopLevel(tail, ',');
          if (semicolons >= 2 || commas >= 2) {
            const items = splitColonListItems(tail);
            return { heading: sub.heading, lead: [{ kind: 'paragraph', text: text.slice(0, colonIdx + 1) }], items, trailer: [] };
          }
        }
      }

      return { heading: sub.heading, lead: blocks, items: [], trailer: [] };
    }
  }
  return null;
}

function topLevelColonIndex(text: string): number {
  let depth = 0;
  let inCode = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '`') inCode = !inCode;
    if (!inCode) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth = Math.max(0, depth - 1);
    }
    if (!inCode && depth === 0 && ch === ':') return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Specifics / deferred (Task 2)
// ---------------------------------------------------------------------------

const IDEA_TITLE_RE = /^\*\*([^*]{1,160}?)\*\*(:|\.|\s[—-])\s*(.*)$/;

function ideaItemsOf(body: string, role: 'specifics' | 'deferred'): IdeaItem[] {
  const sections = topSections(body).filter((s) => roleOfHeading(s.heading) === role || tagRoleAbove(body, s.heading) === role);
  const section = sections[0];
  if (!section) return [];
  const blocks = parseBlocks(section.body);
  const items: IdeaItem[] = [];
  for (const block of blocks) {
    if (block.kind === 'list') {
      for (const raw of block.items) {
        const match = IDEA_TITLE_RE.exec(raw);
        if (match) {
          items.push({ title: match[1].trim(), body: match[3].trim() });
        } else {
          items.push({ title: null, body: raw.trim() });
        }
      }
      continue;
    }
    if (block.kind === 'paragraph') {
      items.push({ title: null, body: block.text.trim() });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// extractContextBrief
// ---------------------------------------------------------------------------

/** Strips a line that is only an opening/closing lowercase-or-underscore tag. */
function isTagOnlyLine(line: string): boolean {
  return TAG_LINE_RE.test(line.trim());
}

export function extractContextBrief(body: string): ContextBrief {
  void isTagOnlyLine; // retained for documentation of the tag-stripping discipline below

  const meta = parseMeta(body);

  let boundary = extractBoundary(body);
  const { preamble: decisionsPreamble, areas } = extractDecisionsAndAreas(body);
  const openQuestions = extractOpenQuestions(body);
  const discretion = extractDiscretion(body);
  const specifics = ideaItemsOf(body, 'specifics');
  const deferred = ideaItemsOf(body, 'deferred');
  const amendments = asideSectionsOf(body, 'amendments');
  const references = asideSectionsOf(body, 'references');
  const codeInsights = asideSectionsOf(body, 'code');

  if (boundary) boundary = extractBoundaryNotes(boundary);

  const recognizedHeadings: string[] = [];
  for (const section of topSections(body)) {
    const role = roleOfHeading(section.heading) ?? tagRoleAbove(body, section.heading);
    if (role === 'boundary' && boundary && section.heading === boundary.eyebrow) recognizedHeadings.push(section.heading);
    if (role === 'decisions') recognizedHeadings.push(section.heading);
    if (role === 'specifics' && specifics.length > 0) recognizedHeadings.push(section.heading);
    if (role === 'deferred' && deferred.length > 0) recognizedHeadings.push(section.heading);
    if (role === 'references') recognizedHeadings.push(section.heading);
    if (role === 'code') recognizedHeadings.push(section.heading);
    if (role === 'amendments') recognizedHeadings.push(section.heading);
  }
  for (const source of openQuestions) {
    // A `##`-level open-questions source (not a `###` subsection of decisions) earns its own
    // recognised heading; a `###` source's parent (`decisions`) is already recognised above.
    const isTopLevel = topSections(body).some((s) => s.heading === source.heading);
    if (isTopLevel) recognizedHeadings.push(source.heading);
  }

  return {
    meta,
    boundary,
    decisionsPreamble,
    areas,
    openQuestions,
    discretion,
    specifics,
    deferred,
    amendments,
    references,
    codeInsights,
    recognizedHeadings,
  };
}

export { blockText };
