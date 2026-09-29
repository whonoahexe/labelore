// The RESEARCH.md briefing projection (quick-260929-3x3, sketches 008-A / 009 B+B / 010-B): a
// tolerant, fence-aware, line-scanned read of a RESEARCH document's body into `ResearchBriefing` —
// cover meta, summary + recommendation, the stack with its legitimacy audit, architecture,
// don't-hand-roll, pitfalls, open questions, environment, sources, the back-matter tables, and a
// section ledger plus a `sourceOnly` list so the composer can prove nothing was dropped silently.
// T-01-11 / T-3x3-02 discipline: every regex here is applied to one bounded line (or one bounded
// cell) at a time — never a whole-document regex, never a nested unbounded quantifier — and every
// line is clipped to MAX_LINE characters up front so a single pathological line cannot make any
// linear scan expensive. `extractResearchBriefing` is pure (no fs access) and never throws on
// well-typed input; `ResearchHandler.parse` still wraps it in try/catch (T-3x3-04).
import { firstSentence, parseBlocks, splitIdeaLead } from './context-brief.ts';
import type { Block } from './context-brief.ts';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type ConfidenceLevel = 'HIGH' | 'MEDIUM-HIGH' | 'MEDIUM' | 'MEDIUM-LOW' | 'LOW' | 'MIXED';

export interface ResearchBreakdownRow {
  area: string;
  level: string | null;
  note: string;
}

export interface ResearchMeta {
  title: string | null;
  phase: string | null;
  quickId: string | null;
  researched: string | null;
  domain: string | null;
  confidence: { raw: string; level: ConfidenceLevel | null } | null;
  /** Blocks between the header labels and the first `##` (a blockquote preamble, say). */
  preamble: Block[];
  breakdown: ResearchBreakdownRow[];
  breakdownText: string | null;
  validUntil: string | null;
  /** `validUntilShort(validUntil)` — computed here so the web composer needs no runtime import. */
  validUntilShort: string | null;
  researchDate: string | null;
}

export interface ResearchSummary {
  paragraphs: Block[];
  recommendation: string | null;
}

export interface ResearchPackage {
  name: string;
  version: string;
  date: string | null;
  purpose: string;
  why: string;
  sus: boolean;
  pinned: boolean;
  hostBinary: boolean;
}

export type ResearchGroupKind = 'core' | 'supporting' | 'other';

export interface ResearchStackGroup {
  label: string;
  kind: ResearchGroupKind;
  packages: ResearchPackage[];
  notes: Block[];
}

export type AlternativeVerdict = 'rejected' | 'harmful' | 'later' | 'viable';

export interface ResearchAlternative {
  chosen: string;
  other: string;
  tradeoff: string;
  verdict: AlternativeVerdict;
}

export interface ResearchStack {
  intro: Block[];
  groups: ResearchStackGroup[];
  alternatives: ResearchAlternative[];
  installation: boolean;
  versionVerification: boolean;
}

export type AuditVerdict = 'OK' | 'SUS' | 'SLOP' | 'OTHER';

export interface ResearchAuditRow {
  name: string;
  registry: string;
  age: string;
  downloads: string;
  repo: string;
  verdict: AuditVerdict;
  rule: string | null;
  disposition: string;
  plainApproval: boolean;
}

export interface ResearchRemoved {
  name: string;
  registry: string;
  age: string;
  downloads: string;
  repo: string;
  rule: string | null;
  reason: string;
  replacement: string | null;
}

export interface ResearchAudit {
  intro: string[];
  rows: ResearchAuditRow[];
  removed: ResearchRemoved[];
  susNote: string | null;
  extraNotes: string[];
  applicable: boolean;
  proseLines: string[];
}

export interface ResearchDiagram {
  text: string;
  lang: string;
  caption: Block[];
}

export interface ResearchStructure {
  text: string;
  notes: Block[];
}

export interface ResearchPattern {
  /** The `###` heading text as written (`Pattern 3: Title`), so a composer can link to it. */
  heading: string;
  title: string;
  what: string;
  when: string | null;
  hasMore: boolean;
}

export interface ResearchAntiPattern {
  lead: string;
  rest: string;
}

export interface ResearchArchitecture {
  intro: Block[];
  diagram: ResearchDiagram | null;
  structure: ResearchStructure | null;
  patterns: ResearchPattern[];
  antiPatterns: ResearchAntiPattern[];
}

export interface ResearchHandRollRow {
  problem: string;
  dont: string;
  use: string;
  why: string;
}

export interface ResearchHandRoll {
  rows: ResearchHandRollRow[];
  insight: string | null;
  notes: Block[];
}

export type PitfallSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ResearchPitfallRow {
  label: string | null;
  text: string;
  code: string[];
}

export interface ResearchPitfall {
  number: number;
  title: string;
  severity: PitfallSeverity | null;
  code: string | null;
  tag: string | null;
  rows: ResearchPitfallRow[];
}

export interface ResearchQuestion {
  number: number;
  title: string;
  resolved: boolean;
  body: Block[];
}

export interface ResearchQuestions {
  headingResolved: boolean;
  lead: Block[];
  items: ResearchQuestion[];
}

export type AvailableState = 'yes' | 'no' | 'unknown';

export interface ResearchEnvRow {
  dependency: string;
  requiredBy: string;
  available: AvailableState;
  availableText: string;
  version: string;
  fallback: string;
  blocking: boolean;
}

export interface ResearchEnvironment {
  rows: ResearchEnvRow[];
  notes: Block[];
  prose: Block[];
}

export type SourceTierKey = 'primary' | 'secondary' | 'tertiary' | 'other';

export interface ResearchSourceTier {
  tier: SourceTierKey;
  label: string;
  items: string[];
}

export interface ResearchSources {
  tiers: ResearchSourceTier[];
}

export interface ResearchLockedGroup {
  group: string | null;
  ids: string[];
}

export interface ResearchUserConstraints {
  lockedGroups: ResearchLockedGroup[];
  discretion: string[];
  deferred: string[];
}

export interface ResearchTable {
  rows: Record<string, string>[];
  notes: Block[];
}

export type ResearchSectionRole =
  | 'summary'
  | 'stack'
  | 'audit'
  | 'architecture'
  | 'handRoll'
  | 'pitfalls'
  | 'questions'
  | 'environment'
  | 'sources'
  | 'userConstraints'
  | 'requirements'
  | 'responsibilityMap'
  | 'metadata'
  | 'sourceOnly'
  | 'unrecognised';

export interface ResearchSectionEntry {
  heading: string;
  role: ResearchSectionRole;
  /** True when a chapter/back-matter parser accepted the section (so View mode renders it). A
   * `##` whose entry is not rendered must appear in `sourceOnly`. */
  rendered: boolean;
}

export interface SourceOnlyEntry {
  label: string;
  heading: string;
  parentHeading: string | null;
}

export interface ResearchBriefing {
  meta: ResearchMeta;
  summary: ResearchSummary | null;
  stack: ResearchStack | null;
  audit: ResearchAudit | null;
  architecture: ResearchArchitecture | null;
  handRoll: ResearchHandRoll | null;
  pitfalls: { items: ResearchPitfall[] } | null;
  questions: ResearchQuestions | null;
  environment: ResearchEnvironment | null;
  sources: ResearchSources | null;
  userConstraints: ResearchUserConstraints | null;
  requirements: ResearchTable | null;
  responsibilityMap: ResearchTable | null;
  sections: ResearchSectionEntry[];
  sourceOnly: SourceOnlyEntry[];
}

// ---------------------------------------------------------------------------
// Line-level helpers
// ---------------------------------------------------------------------------

/** No real RESEARCH line comes near this (the corpus maximum is ~1.5k); a longer line is clipped
 * so per-line regexes stay cheap on adversarial input (T-3x3-02). */
const MAX_LINE = 8000;
const TAG_ONLY_RE = /^<\/?[a-z_]+>$/;

function clipLines(body: string): string[] {
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.endsWith('\r')) line = line.slice(0, -1);
    lines[i] = line.length > MAX_LINE ? line.slice(0, MAX_LINE) : line;
  }
  return lines;
}

interface Fence {
  ch: string;
  len: number;
}

function openFence(trimmed: string): Fence | null {
  const ch = trimmed[0];
  if (ch !== '`' && ch !== '~') return null;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === ch) len += 1;
  return len >= 3 ? { ch, len } : null;
}

function closesFence(trimmed: string, fence: Fence): boolean {
  if (trimmed[0] !== fence.ch) return false;
  let len = 0;
  while (len < trimmed.length && trimmed[len] === fence.ch) len += 1;
  return len >= fence.len && trimmed.slice(len).trim() === '';
}

export interface HeadingSection {
  heading: string;
  body: string;
}

function headingText(line: string, level: number): string | null {
  if (line.length <= level) return null;
  for (let i = 0; i < level; i++) if (line[i] !== '#') return null;
  const next = line[level];
  if (next !== ' ' && next !== '\t') return null;
  let text = line.slice(level).trim();
  while (text.endsWith('#')) text = text.slice(0, -1);
  text = text.trim();
  return text === '' ? null : text;
}

/** Splits `body` at every `#`×level heading that sits outside a fenced code block, dropping
 * tag-only lines (`<user_constraints>`, `</standard_stack>`, …) that sit outside fences. Returns the
 * text before the first heading as `preamble`. */
export function splitWithPreamble(
  body: string,
  level: number,
): { preamble: string; sections: HeadingSection[] } {
  const lines = clipLines(body);
  const preamble: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  let fence: Fence | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (fence) {
      (current ? current.lines : preamble).push(line);
      if (closesFence(trimmed, fence)) fence = null;
      continue;
    }
    const opened = openFence(trimmed);
    if (opened) {
      fence = opened;
      (current ? current.lines : preamble).push(line);
      continue;
    }
    const heading = headingText(line, level);
    if (heading !== null) {
      current = { heading, lines: [] };
      sections.push(current);
      continue;
    }
    if (TAG_ONLY_RE.test(trimmed)) continue;
    (current ? current.lines : preamble).push(line);
  }
  return {
    preamble: preamble.join('\n'),
    sections: sections.map((s) => ({ heading: s.heading, body: s.lines.join('\n') })),
  };
}

/** Fence-aware `#`×level split — the sections only, in document order (see splitWithPreamble). */
export function splitFenceAware(body: string, level: number): HeadingSection[] {
  return splitWithPreamble(body, level).sections;
}

/** `**bold**`, backticks and stray emphasis stripped — for matching and short labels. */
function plain(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').trim();
}

function plainHeading(heading: string): string {
  return plain(heading.slice(0, 300));
}

/** The heading with a trailing parenthetical removed, lower-cased — what the role table matches. */
function roleKey(heading: string): string {
  let key = plainHeading(heading);
  if (key.endsWith(')')) {
    const open = key.lastIndexOf('(');
    if (open > 0) key = key.slice(0, open).trim();
  }
  return key.toLowerCase();
}

interface LabelParts {
  label: string;
  rest: string;
}

/** `**Label:** rest` or `**Label**: rest` → its parts; null when the text has no bold label. */
function labelOf(text: string): LabelParts | null {
  if (!text.startsWith('**')) return null;
  const close = text.indexOf('**', 2);
  if (close === -1 || close > 162) return null;
  let label = text.slice(2, close);
  let after = text.slice(close + 2);
  let colon = false;
  if (label.endsWith(':')) {
    label = label.slice(0, -1);
    colon = true;
  } else if (after.startsWith(':')) {
    after = after.slice(1);
    colon = true;
  }
  if (!colon) return null;
  return { label: label.trim(), rest: after.trim() };
}

/** A bold label as a group title: emphasis stripped, trailing parenthetical dropped. */
function shortLabel(label: string): string {
  let text = plain(label.slice(0, 200));
  if (text.endsWith(')')) {
    const open = text.lastIndexOf('(');
    if (open > 0) text = text.slice(0, open).trim();
  }
  return text === '' ? 'Stack' : text;
}

function cell(row: Record<string, string>, keys: string[], pattern: RegExp, fallbackIndex: number): string {
  const key = keys.find((k) => pattern.test(k)) ?? keys[fallbackIndex];
  return key === undefined ? '' : (row[key] ?? '');
}

function firstTable(blocks: Block[]): Record<string, string>[] | null {
  for (const block of blocks) {
    if (block.kind === 'table' && block.rows.length > 0) return block.rows;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Column-zero item parser
// ---------------------------------------------------------------------------

export type ZeroEntry =
  | { type: 'text'; text: string }
  | { type: 'item'; number: number | null; first: string; rest: string[] };

const ZERO_ITEM_RE = /^(?:(\d{1,3})[.)]|[-*])\s+(.*)$/;

/** A list parser that opens an item only on an unindented `1.`/`1)`/`-`/`*` marker. Indented lines
 * (nested bullets, indented code fences, continuation lines) stay in that item's `rest`, kept in
 * order; any other unindented line is a `text` entry between/around the items. The shared
 * `parseBlocks` would split nested sub-bullets into sibling items, which is wrong for pitfall and
 * open-question lists. */
export function parseColumnZero(body: string): ZeroEntry[] {
  const entries: ZeroEntry[] = [];
  let current: Extract<ZeroEntry, { type: 'item' }> | null = null;
  let fence: Fence | null = null;
  let fenceOwned = false;
  for (const line of clipLines(body)) {
    const trimmed = line.trim();
    if (fence) {
      if (fenceOwned && current) current.rest.push(line);
      if (closesFence(trimmed, fence)) fence = null;
      continue;
    }
    const opened = openFence(trimmed);
    if (opened) {
      fence = opened;
      fenceOwned = current !== null && /^[ \t]/.test(line);
      if (fenceOwned && current) current.rest.push(line);
      else current = null;
      continue;
    }
    if (trimmed === '') {
      if (current) current.rest.push('');
      continue;
    }
    if (TAG_ONLY_RE.test(trimmed)) continue;
    const match = ZERO_ITEM_RE.exec(line);
    if (match) {
      current = { type: 'item', number: match[1] ? Number(match[1]) : null, first: match[2].trim(), rest: [] };
      entries.push(current);
      continue;
    }
    if (current && /^[ \t]/.test(line)) {
      current.rest.push(line);
      continue;
    }
    current = null;
    entries.push({ type: 'text', text: trimmed });
  }
  for (const entry of entries) {
    if (entry.type !== 'item') continue;
    while (entry.rest.length > 0 && entry.rest[entry.rest.length - 1].trim() === '') entry.rest.pop();
  }
  return entries;
}

function itemsOf(entries: ZeroEntry[]): Extract<ZeroEntry, { type: 'item' }>[] {
  return entries.filter((e): e is Extract<ZeroEntry, { type: 'item' }> => e.type === 'item');
}

/** An item's first line plus its indented continuation prose (nested code fences skipped),
 * joined on single spaces. */
function joinItem(item: Extract<ZeroEntry, { type: 'item' }>): string {
  const parts = [item.first];
  let fence: Fence | null = null;
  for (const line of item.rest) {
    const trimmed = line.trim();
    if (fence) {
      if (closesFence(trimmed, fence)) fence = null;
      continue;
    }
    const opened = openFence(trimmed);
    if (opened) {
      fence = opened;
      continue;
    }
    if (trimmed === '') continue;
    const bullet = ZERO_ITEM_RE.exec(trimmed);
    parts.push(bullet ? bullet[2].trim() : trimmed);
  }
  return parts.join(' ');
}

function dedent(lines: string[]): string[] {
  let min = Infinity;
  for (const line of lines) {
    if (line.trim() === '') continue;
    let indent = 0;
    while (indent < line.length && (line[indent] === ' ' || line[indent] === '\t')) indent += 1;
    if (indent < min) min = indent;
  }
  if (!Number.isFinite(min) || min === 0) return lines;
  return lines.map((line) => (line.trim() === '' ? '' : line.slice(min)));
}

// ---------------------------------------------------------------------------
// Confidence / dates
// ---------------------------------------------------------------------------

const LEVEL_WORD_RE = /\b(MEDIUM-HIGH|MEDIUM-LOW|LOW-MEDIUM|HIGH|MEDIUM|LOW)\b/g;
const HEADLINE_RE = /^\s*(MEDIUM-HIGH|MEDIUM-LOW|LOW-MEDIUM|HIGH|MEDIUM|LOW)\s*(?:[—–(.;-]|$)/;

function normaliseLevel(word: string): string {
  return word === 'LOW-MEDIUM' ? 'MEDIUM-LOW' : word;
}

/** The confidence level a `**Confidence:**` line names. A bare opening level word is the author's
 * own headline verdict and wins over any later qualifying clause; otherwise exactly one distinct
 * level word is that level, several are `MIXED`, none is `null`. */
export function confidenceLevelOf(line: string): ConfidenceLevel | null {
  const text = line.slice(0, 2000).replace(/\*\*/g, '');
  const found = new Set<string>();
  for (const match of text.matchAll(LEVEL_WORD_RE)) found.add(normaliseLevel(match[1]));
  if (found.size === 0) return null;
  const head = HEADLINE_RE.exec(text);
  if (head) return normaliseLevel(head[1]) as ConfidenceLevel;
  if (found.size === 1) return [...found][0] as ConfidenceLevel;
  return 'MIXED';
}

/** The short form of a Metadata `Valid until` value: its leading date, duration or noun phrase. */
export function validUntilShort(text: string): string {
  const t = plain(text.slice(0, 600));
  const date = /^~?\d{4}-\d{2}-\d{2}/.exec(t);
  if (date) return date[0];
  const span = /^~?\d{1,4}\s+(?:days?|weeks?|months?)/i.exec(t);
  if (span) return span[0];
  let end = t.length;
  for (const sep of [' (', ' — ', ' – ', ';', ':']) {
    const at = t.indexOf(sep);
    if (at > 0 && at < end) end = at;
  }
  let short = t.slice(0, Math.min(end, 48)).trim();
  while (short.endsWith('.') || short.endsWith(',')) short = short.slice(0, -1);
  return short;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const HEADER_LABEL_RE = /^\*\*(Researched|Domain|Confidence):\*\*\s*(.*)$/;
const PHASE_PREFIX_RE = /^Phase\s+(\d{1,3}(?:\.\d{1,3})?)\s*:\s*/i;
const QUICK_PREFIX_RE = /^Quick Task\s+([\w-]{1,40})\s*:\s*/i;

function parseTitle(h1: string): { title: string | null; phase: string | null; quickId: string | null } {
  let t = h1.slice(0, 300).trim();
  let phase: string | null = null;
  let quickId: string | null = null;
  const phaseMatch = PHASE_PREFIX_RE.exec(t);
  if (phaseMatch) {
    phase = phaseMatch[1];
    t = t.slice(phaseMatch[0].length);
  } else {
    const quickMatch = QUICK_PREFIX_RE.exec(t);
    if (quickMatch) {
      quickId = quickMatch[1];
      t = t.slice(quickMatch[0].length);
    }
  }
  const lower = t.toLowerCase();
  for (const suffix of [' - research', ' — research', ' – research']) {
    if (lower.endsWith(suffix)) {
      t = t.slice(0, t.length - suffix.length);
      break;
    }
  }
  t = t.trim();
  return { title: t === '' ? null : t, phase, quickId };
}

function parsePreamble(preamble: string): {
  h1: string | null;
  labels: Record<string, string>;
  blocks: Block[];
} {
  const lines = clipLines(preamble);
  let h1: string | null = null;
  const labels: Record<string, string> = {};
  const rest: string[] = [];
  let current: string | null = null;
  let fence: Fence | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (fence) {
      rest.push(line);
      if (closesFence(trimmed, fence)) fence = null;
      continue;
    }
    const opened = openFence(trimmed);
    if (opened) {
      fence = opened;
      rest.push(line);
      continue;
    }
    if (h1 === null && headingText(line, 1) !== null) {
      h1 = headingText(line, 1);
      continue;
    }
    if (TAG_ONLY_RE.test(trimmed)) continue;
    const labelMatch = HEADER_LABEL_RE.exec(trimmed);
    if (labelMatch) {
      current = labelMatch[1];
      labels[current] = labelMatch[2].trim();
      continue;
    }
    if (current !== null) {
      if (trimmed === '' || trimmed.startsWith('>') || trimmed.startsWith('**') || trimmed.startsWith('#')) {
        current = null;
      } else {
        labels[current] = `${labels[current]} ${trimmed}`.trim();
        continue;
      }
    }
    rest.push(trimmed.startsWith('>') ? line.replace(/^\s*>\s?/, '') : line);
  }
  return { h1, labels, blocks: parseBlocks(rest.join('\n')) };
}

function parseMetadata(body: string, meta: ResearchMeta): void {
  const lines = clipLines(body);
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const label = labelOf(trimmed);
    i += 1;
    if (!label) continue;
    const key = label.label.toLowerCase();
    if (key === 'confidence breakdown') {
      const bullets: string[] = [];
      let inline = label.rest;
      let j = i;
      while (j < lines.length) {
        const next = lines[j];
        const nextTrimmed = next.trim();
        if (nextTrimmed === '') {
          j += 1;
          continue;
        }
        if (labelOf(nextTrimmed)) break;
        const bullet = ZERO_ITEM_RE.exec(nextTrimmed);
        if (bullet && !/^[ \t]/.test(next)) {
          bullets.push(bullet[2].trim());
          j += 1;
          continue;
        }
        if (bullets.length > 0 && /^[ \t]/.test(next)) {
          bullets[bullets.length - 1] += ` ${nextTrimmed}`;
          j += 1;
          continue;
        }
        if (bullets.length === 0 && inline !== '') {
          inline = `${inline} ${nextTrimmed}`;
          j += 1;
          continue;
        }
        break;
      }
      i = j;
      for (const bullet of bullets) {
        const colon = bullet.indexOf(':');
        if (colon <= 0 || colon > 80) continue;
        const area = plain(bullet.slice(0, colon));
        const rest = bullet.slice(colon + 1).replace(/^\*\*\s*/, '').trim();
        const words = confidenceWords(rest);
        let note = rest;
        const lead = /^\*{0,2}(MEDIUM-HIGH|MEDIUM-LOW|LOW-MEDIUM|HIGH|MEDIUM|LOW)\*{0,2}\s*[—–-]{0,2}\s*/.exec(rest);
        if (lead) note = rest.slice(lead[0].length);
        meta.breakdown.push({ area, level: words[0] ?? null, note });
      }
      if (bullets.length === 0 && inline !== '') meta.breakdownText = inline;
      continue;
    }
    if (key === 'valid until') {
      meta.validUntil = label.rest === '' ? null : label.rest;
      continue;
    }
    if (key === 'research date') {
      meta.researchDate = label.rest === '' ? null : label.rest.split(/\s/)[0];
    }
  }
}

function confidenceWords(text: string): string[] {
  const out: string[] = [];
  for (const match of text.replace(/\*\*/g, '').slice(0, 2000).matchAll(LEVEL_WORD_RE)) {
    out.push(normaliseLevel(match[1]));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const SOURCE_ONLY_RE =
  /^(code examples|state of the art|assumptions log|security domain|validation architecture|verification strategy|project constraints)/;

function roleOf(heading: string): ResearchSectionRole {
  const key = roleKey(heading);
  if (/^summary$/.test(key)) return 'summary';
  if (/^standard stack/.test(key)) return 'stack';
  if (/^package legitimacy audit/.test(key)) return 'audit';
  if (/^architectural responsibility map/.test(key)) return 'responsibilityMap';
  if (/^architectur(e|al) patterns/.test(key)) return 'architecture';
  if (/^don.?t hand-roll/.test(key)) return 'handRoll';
  if (/^common pitfalls/.test(key)) return 'pitfalls';
  if (/^open questions/.test(key)) return 'questions';
  if (/^environment availability/.test(key)) return 'environment';
  if (/^sources$/.test(key)) return 'sources';
  if (/^user constraints/.test(key)) return 'userConstraints';
  if (/^phase requirements/.test(key)) return 'requirements';
  if (/^metadata$/.test(key)) return 'metadata';
  if (SOURCE_ONLY_RE.test(key)) return 'sourceOnly';
  return 'unrecognised';
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

type AddSource = (label: string, heading: string, parentHeading: string | null) => void;

/** The text before a section's first `###`; every `###` is handed to `extra` (source-only). */
function flatPreamble(body: string, parent: string, add: AddSource): string {
  const split = splitWithPreamble(body, 3);
  for (const sub of split.sections) {
    const child = plainHeading(sub.heading);
    add(`${parent} › ${child}`, child, parent);
  }
  return split.preamble;
}

function parseSummary(body: string, parent: string, add: AddSource): ResearchSummary | null {
  const blocks = parseBlocks(flatPreamble(body, parent, add));
  const paragraphs: Block[] = [];
  let recommendation: string | null = null;
  for (const block of blocks) {
    if (block.kind === 'paragraph') {
      const label = labelOf(block.text);
      if (label && /^primary recommendation/i.test(label.label) && recommendation === null) {
        recommendation = label.rest === '' ? null : label.rest;
        continue;
      }
    }
    paragraphs.push(block);
  }
  if (paragraphs.length === 0 && recommendation === null) return null;
  return { paragraphs, recommendation };
}

const DATE_RE = /\d{4}-\d{2}-\d{2}/g;

function splitVersion(cellText: string): { version: string; date: string | null; pinned: boolean } {
  let text = plain(cellText);
  let pinned = false;
  const pinnedAt = text.toLowerCase().indexOf('(already pinned)');
  if (pinnedAt !== -1) {
    pinned = true;
    text = `${text.slice(0, pinnedAt)}${text.slice(pinnedAt + '(already pinned)'.length)}`.trim();
  }
  const dates = [...text.matchAll(DATE_RE)];
  if (dates.length === 1) {
    const at = dates[0].index ?? 0;
    const after = text.slice(at + 10).trim();
    let before = text.slice(0, at).trimEnd();
    while (before.endsWith('/')) before = before.slice(0, -1).trimEnd();
    if (after === '' && before !== '') return { version: before, date: dates[0][0], pinned };
  }
  return { version: text, date: null, pinned };
}

function packageOf(row: Record<string, string>, keys: string[]): ResearchPackage {
  let name = keys.length > 0 ? (row[keys[0]] ?? '') : '';
  let sus = false;
  const warn = name.indexOf('[WARNING:');
  if (warn !== -1) {
    const close = name.indexOf(']', warn);
    if (close !== -1 && name.slice(warn, close).toLowerCase().includes('suspicious')) {
      sus = true;
      name = `${name.slice(0, warn)}${name.slice(close + 1)}`;
    }
  }
  let hostBinary = false;
  const host = name.toLowerCase().indexOf('(host binary)');
  if (host !== -1) {
    hostBinary = true;
    name = `${name.slice(0, host)}${name.slice(host + '(host binary)'.length)}`;
  }
  const versionCell = cell(row, keys, /version/i, 1);
  const { version, date, pinned } = splitVersion(versionCell);
  const purpose = cell(row, keys, /purpose/i, 2);
  const whyKey = keys.find((k) => /^(why|when)/i.test(k)) ?? keys[keys.length - 1];
  const why = whyKey === undefined ? '' : (row[whyKey] ?? '');
  return {
    name: plain(name),
    version,
    date,
    purpose: purpose.trim(),
    why: why.trim(),
    sus,
    pinned,
    hostBinary,
  };
}

function packagesOf(rows: Record<string, string>[]): ResearchPackage[] {
  const keys = Object.keys(rows[0] ?? {});
  return rows.map((row) => packageOf(row, keys));
}

function alternativeVerdict(tradeoff: string): AlternativeVerdict {
  const lead = plain(firstSentence(tradeoff.slice(0, 2000))[0]).toLowerCase();
  if (/^rejected\b/.test(lead)) return 'rejected';
  if (/actively harmful|do not use|don't use/.test(lead)) return 'harmful';
  if (/scoped to\s+(the\s+)?phase\s+\d|later phase|future phase|deferred to phase/.test(lead)) return 'later';
  // "Viable" only when the author says so; an option that simply wasn't chosen ("… Not worth it",
  // "Simpler-looking, but …") reads as rejected, never as an accent-toned endorsement.
  if (/\b(equally (legitimate|valid|good)|viable|also (valid|fine)|either works|acceptable alternative)\b/.test(lead)) {
    return 'viable';
  }
  return 'rejected';
}

function alternativesOf(rows: Record<string, string>[]): ResearchAlternative[] {
  const keys = Object.keys(rows[0] ?? {});
  return rows.map((row) => {
    const tradeoffKey = keys.find((k) => /trade/i.test(k)) ?? keys[keys.length - 1];
    const tradeoff = tradeoffKey === undefined ? '' : (row[tradeoffKey] ?? '').trim();
    return {
      chosen: (row[keys[0]] ?? '').trim(),
      other: (row[keys[1]] ?? '').trim(),
      tradeoff,
      verdict: alternativeVerdict(tradeoff),
    };
  });
}

interface StackParse {
  stack: ResearchStack | null;
  auditBody: string | null;
}

/** One body of the stack section (its preamble or a `###` subsection), split on the
 * Installation / Version-verification labels: the labelled blocks are flagged, never returned. */
function stackBlocks(text: string, flags: { installation: boolean; versionVerification: boolean }, order: string[]): Block[] {
  const kept: Block[] = [];
  let skipping = false;
  for (const block of parseBlocks(text)) {
    if (block.kind === 'paragraph') {
      const label = labelOf(block.text);
      if (label) {
        const key = label.label.toLowerCase();
        if (key.startsWith('installation')) {
          flags.installation = true;
          order.push('Installation');
          skipping = true;
          continue;
        }
        if (key.startsWith('version verification')) {
          flags.versionVerification = true;
          order.push('Version verification');
          skipping = false;
          continue;
        }
        skipping = false;
      }
    }
    if (skipping) continue;
    kept.push(block);
  }
  return kept;
}

function parseStack(body: string, parent: string, add: AddSource): StackParse {
  const split = splitWithPreamble(body, 3);
  const flags = { installation: false, versionVerification: false };
  const order: string[] = [];
  const groups: ResearchStackGroup[] = [];
  let alternatives: ResearchAlternative[] = [];
  const intro: Block[] = [];
  let auditBody: string | null = null;

  // Text directly under the `##`: intro prose, plus a table introduced by a bold label paragraph
  // (SP phases/03 has no `###` at all).
  const pre = stackBlocks(split.preamble, flags, order);
  let label: string | null = null;
  let tableSeen = false;
  let lastGroup: ResearchStackGroup | null = null;
  for (const block of pre) {
    if (block.kind === 'table') {
      if (block.rows.length === 0) continue;
      const group: ResearchStackGroup = {
        label: label ?? 'Stack',
        kind: 'other',
        packages: packagesOf(block.rows),
        notes: [],
      };
      groups.push(group);
      lastGroup = group;
      tableSeen = true;
      label = null;
      continue;
    }
    if (block.kind === 'paragraph') {
      const parts = labelOf(block.text);
      if (parts && parts.rest === '') {
        label = shortLabel(parts.label);
        continue;
      }
      if (parts) {
        // A labelled prose paragraph (`**Existing dependencies …:** text`) — keep it as prose.
        label = null;
      }
    }
    if (tableSeen && lastGroup) lastGroup.notes.push(block);
    else intro.push(block);
  }

  for (const sub of split.sections) {
    const heading = plainHeading(sub.heading);
    const key = heading.toLowerCase();
    if (/^package legitimacy audit/.test(key)) {
      if (auditBody === null) auditBody = sub.body;
      else add(`${parent} › ${heading}`, heading, parent);
      continue;
    }
    const blocks = stackBlocks(sub.body, flags, order);
    const table = firstTable(blocks);
    if (/^alternatives/.test(key) && table) {
      alternatives = alternatives.concat(alternativesOf(table));
      continue;
    }
    if (table) {
      const kind: ResearchGroupKind = /^core/.test(key) ? 'core' : /^supporting/.test(key) ? 'supporting' : 'other';
      const notes = blocks.filter((b) => b.kind !== 'table');
      groups.push({ label: heading, kind, packages: packagesOf(table), notes });
      continue;
    }
    add(`${parent} › ${heading}`, heading, parent);
  }

  for (const entry of order) add(entry, entry, parent);

  if (groups.length === 0 && alternatives.length === 0) {
    return { stack: null, auditBody };
  }
  return {
    stack: {
      intro,
      groups,
      alternatives,
      installation: flags.installation,
      versionVerification: flags.versionVerification,
    },
    auditBody,
  };
}

// --- audit ---------------------------------------------------------------

function verdictOf(text: string): { verdict: AuditVerdict; rule: string | null } {
  const word = /^([A-Za-z]{1,12})/.exec(text);
  const upper = word ? word[1].toUpperCase() : '';
  const verdict: AuditVerdict = upper === 'OK' || upper === 'SUS' || upper === 'SLOP' ? upper : 'OTHER';
  const open = text.indexOf('(');
  const close = open === -1 ? -1 : text.indexOf(')', open);
  const rule = open !== -1 && close !== -1 && close - open <= 62 ? text.slice(open + 1, close).trim() : null;
  return { verdict, rule: rule === '' ? null : rule };
}

function auditRowOf(row: Record<string, string>, keys: string[]): ResearchAuditRow {
  const verdictText = plain(cell(row, keys, /^verdict/i, 5));
  const { verdict, rule } = verdictOf(verdictText);
  const disposition = plain(cell(row, keys, /^disposition/i, 6));
  return {
    name: plain(cell(row, keys, /^package/i, 0)),
    registry: plain(cell(row, keys, /^registry/i, 1)),
    age: plain(cell(row, keys, /^age/i, 2)),
    downloads: plain(cell(row, keys, /^downloads/i, 3)),
    repo: plain(cell(row, keys, /repo/i, 4)),
    verdict,
    rule,
    disposition,
    plainApproval: /^approved\.?$/i.test(disposition),
  };
}

/** Leading run of backticked names (`a`, `b` and `c`) → the names plus the remaining prose. */
function leadingNames(text: string): { names: string[]; rest: string } {
  const names: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    while (pos < text.length && (text[pos] === ' ' || text[pos] === ',' || text[pos] === '\t')) pos += 1;
    if (text.startsWith('and ', pos)) {
      pos += 4;
      continue;
    }
    if (text[pos] !== '`') break;
    const close = text.indexOf('`', pos + 1);
    if (close === -1 || close - pos > 200) break;
    names.push(text.slice(pos + 1, close));
    pos = close + 1;
  }
  let rest = text.slice(pos).trim();
  while (rest.startsWith('.') || rest.startsWith(',') || rest.startsWith(';')) rest = rest.slice(1).trim();
  return { names, rest };
}

function isNone(text: string): boolean {
  return /^none\b/i.test(plain(text));
}

/** Splits a removal note into its reason and the replacement it names (`use X`, `replaced by X`,
 * `→ X`). Manual scans only — the note is untrusted prose. */
function reasonAndReplacement(text: string): { reason: string; replacement: string | null } {
  let cleaned = text.trim();
  while (cleaned.startsWith('—') || cleaned.startsWith('–') || cleaned.startsWith('-') || cleaned.startsWith(':')) {
    cleaned = cleaned.slice(1).trim();
  }
  const lower = cleaned.toLowerCase();
  let best = -1;
  let markerLength = 0;
  for (const marker of ['; use ', ', use ', '. use ', ' use ', 'replaced by ', '→ ', 'instead: ']) {
    const at = lower.indexOf(marker);
    if (at !== -1 && (best === -1 || at < best)) {
      best = at;
      markerLength = marker.length;
    }
  }
  if (best === -1) return { reason: cleaned, replacement: null };
  let reason = cleaned.slice(0, best).trim();
  while (reason.endsWith(';') || reason.endsWith(',') || reason.endsWith('.')) reason = reason.slice(0, -1).trim();
  let replacement = cleaned.slice(best + markerLength).trim();
  if (replacement.toLowerCase().endsWith(' instead.')) replacement = replacement.slice(0, -' instead.'.length);
  else if (replacement.toLowerCase().endsWith(' instead')) replacement = replacement.slice(0, -' instead'.length);
  replacement = replacement.trim();
  while (replacement.endsWith('.')) replacement = replacement.slice(0, -1).trim();
  return { reason, replacement: replacement === '' ? null : replacement };
}

/** Splits one prose line at every mid-line `**Packages …**` label, so two labelled segments that
 * share a line (`**Packages removed …:** none. **Packages flagged …:** none.`) become two pieces. */
function splitAtPackageLabels(line: string): string[] {
  const pieces: string[] = [];
  let from = 0;
  let cursor = 0;
  while (cursor < line.length) {
    const at = line.indexOf('**Packages ', cursor);
    if (at === -1) break;
    if (at > from) {
      pieces.push(line.slice(from, at));
      from = at;
    }
    cursor = at + 2;
  }
  pieces.push(line.slice(from));
  return pieces.map((piece) => piece.trim()).filter((piece) => piece !== '');
}

function parseAudit(body: string): ResearchAudit {
  const tableLines: string[] = [];
  const intro: string[] = [];
  const extraNotes: string[] = [];
  let removedText: string | null = null;
  let flaggedText: string | null = null;
  let seenTable = false;
  let openEntry: { label: string | null; text: string } | null = null;
  const entries: { label: string | null; text: string; afterTable: boolean }[] = [];
  for (const line of clipLines(body)) {
    const trimmed = line.trim();
    if (trimmed === '' || TAG_ONLY_RE.test(trimmed)) {
      openEntry = null;
      continue;
    }
    if (trimmed.startsWith('|')) {
      tableLines.push(trimmed);
      seenTable = true;
      openEntry = null;
      continue;
    }
    for (const piece of splitAtPackageLabels(trimmed)) {
      const label = labelOf(piece);
      const previous: { label: string | null; text: string } | null = openEntry;
      if (!label && previous && !piece.startsWith('**Packages ')) {
        previous.text = `${previous.text} ${piece}`;
        continue;
      }
      const entry = { label: label ? label.label : null, text: label ? label.rest : piece, afterTable: seenTable };
      entries.push(entry);
      openEntry = entry;
    }
  }
  for (const entry of entries) {
    const label = entry.label?.toLowerCase() ?? '';
    if (label.startsWith('packages removed')) {
      if (removedText === null) removedText = entry.text;
    } else if (label.startsWith('packages flagged')) {
      if (flaggedText === null) flaggedText = entry.text;
    } else if (entry.label !== null) {
      extraNotes.push(`**${entry.label}:** ${entry.text}`.trim());
    } else if (entry.afterTable) {
      extraNotes.push(entry.text);
    } else {
      intro.push(entry.text);
    }
  }
  const table = firstTable(parseBlocks(tableLines.join('\n')));

  const keys = Object.keys(table?.[0] ?? {});
  const rows = table ? table.map((row) => auditRowOf(row, keys)) : [];

  const removed: ResearchRemoved[] = [];
  const segment = removedText !== null && !isNone(removedText) ? leadingNames(removedText) : null;
  const segmentDetail = segment ? reasonAndReplacement(segment.rest) : null;
  for (const row of rows) {
    if (row.verdict !== 'SLOP') continue;
    const fromSegment = segment?.names.includes(row.name) ? segmentDetail : null;
    const fromDisposition = fromSegment ?? reasonAndReplacement(row.disposition);
    removed.push({
      name: row.name,
      registry: row.registry,
      age: row.age,
      downloads: row.downloads,
      repo: row.repo,
      rule: row.rule,
      reason: fromDisposition.reason,
      replacement: fromDisposition.replacement,
    });
  }
  if (segment && segmentDetail) {
    for (const name of segment.names) {
      if (removed.some((r) => r.name === name)) continue;
      removed.push({
        name,
        registry: '',
        age: '',
        downloads: '',
        repo: '',
        rule: null,
        reason: segmentDetail.reason,
        replacement: segmentDetail.replacement,
      });
    }
  }

  const susNote =
    flaggedText !== null && !isNone(flaggedText) ? (leadingNames(flaggedText).rest || null) : null;

  const applicable = table !== null;
  const proseLines: string[] = [];
  if (!applicable) {
    for (const line of clipLines(body)) {
      const trimmed = line.trim();
      if (trimmed === '' || TAG_ONLY_RE.test(trimmed) || trimmed.startsWith('|')) continue;
      proseLines.push(trimmed);
    }
  }
  return { intro, rows, removed, susNote, extraNotes, applicable, proseLines };
}

// --- architecture --------------------------------------------------------

interface FenceCapture {
  lang: string;
  text: string;
  before: string;
  after: string;
}

function firstFence(body: string): FenceCapture | null {
  const lines = clipLines(body);
  const before: string[] = [];
  const after: string[] = [];
  const inner: string[] = [];
  let lang = '';
  let state: 'before' | 'inside' | 'after' = 'before';
  let fence: Fence | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (state === 'before') {
      const opened = openFence(trimmed);
      if (opened) {
        fence = opened;
        lang = trimmed.slice(opened.len).trim().split(/\s/)[0] ?? '';
        state = 'inside';
      } else before.push(line);
      continue;
    }
    if (state === 'inside') {
      if (fence && closesFence(trimmed, fence)) state = 'after';
      else inner.push(line);
      continue;
    }
    after.push(line);
  }
  if (state === 'before') return null;
  return { lang, text: inner.join('\n'), before: before.join('\n'), after: after.join('\n') };
}

const PATTERN_HEADING_RE = /^Pattern\s+(\d{1,3})\s*[:.—–-]?\s*(.*)$/i;

function parsePattern(sub: HeadingSection): ResearchPattern | null {
  const heading = plainHeading(sub.heading);
  const match = PATTERN_HEADING_RE.exec(heading);
  if (!match) return null;
  const title = match[2].trim() === '' ? heading : match[2].trim();
  let what: string | null = null;
  let when: string | null = null;
  let consumed = 0;
  const blocks = parseBlocks(sub.body);
  for (const block of blocks) {
    if (block.kind === 'paragraph') {
      const label = labelOf(block.text);
      if (label && /^what$/i.test(label.label) && what === null) {
        what = label.rest;
        consumed += 1;
        continue;
      }
      if (label && /^when to use$/i.test(label.label) && when === null) {
        when = label.rest;
        consumed += 1;
        continue;
      }
    }
  }
  if (what === null) {
    const firstParagraph = blocks.find((b) => b.kind === 'paragraph');
    if (firstParagraph && firstParagraph.kind === 'paragraph') {
      what = firstParagraph.text;
      consumed += 1;
    }
  }
  return { heading, title, what: what ?? '', when, hasMore: blocks.length > consumed };
}

function parseAntiPatterns(body: string): ResearchAntiPattern[] {
  const out: ResearchAntiPattern[] = [];
  for (const item of itemsOf(parseColumnZero(body))) {
    const text = joinItem(item);
    const lead = splitIdeaLead(text);
    if (lead.title !== null) out.push({ lead: lead.title, rest: lead.body });
    else {
      const [head, rest] = firstSentence(text);
      out.push({ lead: head, rest });
    }
  }
  return out;
}

function parseArchitecture(body: string, parent: string, add: AddSource): ResearchArchitecture | null {
  const split = splitWithPreamble(body, 3);
  const intro = parseBlocks(split.preamble);
  let diagram: ResearchDiagram | null = null;
  let structure: ResearchStructure | null = null;
  const structureNotes: Block[] = [];
  const rationale: Block[] = [];
  const patterns: ResearchPattern[] = [];
  let antiPatterns: ResearchAntiPattern[] = [];
  let recognisedAny = false;
  for (const sub of split.sections) {
    const heading = plainHeading(sub.heading);
    const key = heading.toLowerCase();
    if (/system architecture diagram/.test(key)) {
      const fence = firstFence(sub.body);
      if (fence && diagram === null) {
        diagram = { text: fence.text, lang: fence.lang, caption: parseBlocks(fence.after) };
        recognisedAny = true;
        continue;
      }
    } else if (/recommended project structure/.test(key)) {
      const fence = firstFence(sub.body);
      if (fence && structure === null) {
        structure = { text: fence.text, notes: [] };
        structureNotes.push(...parseBlocks(fence.before), ...parseBlocks(fence.after));
        recognisedAny = true;
        continue;
      }
    } else if (/^structure rationale/.test(key)) {
      rationale.push(...parseBlocks(sub.body));
      recognisedAny = true;
      continue;
    } else if (/^pattern\s+\d/.test(key)) {
      const pattern = parsePattern(sub);
      if (pattern) {
        patterns.push(pattern);
        recognisedAny = true;
        continue;
      }
    } else if (/anti-?patterns/.test(key)) {
      const found = parseAntiPatterns(sub.body);
      if (found.length > 0) {
        antiPatterns = antiPatterns.concat(found);
        recognisedAny = true;
        continue;
      }
    }
    add(`${parent} › ${heading}`, heading, parent);
  }
  if (structure) structure.notes = [...structureNotes, ...rationale];
  if (!recognisedAny) return null;
  return { intro, diagram, structure, patterns, antiPatterns };
}

// --- hand-roll -----------------------------------------------------------

function parseHandRoll(body: string, parent: string, add: AddSource): ResearchHandRoll | null {
  const blocks = parseBlocks(flatPreamble(body, parent, add));
  const table = firstTable(blocks);
  const rows: ResearchHandRollRow[] = [];
  if (table) {
    const keys = Object.keys(table[0]);
    for (const row of table) {
      rows.push({
        problem: plain(row[keys[0]] ?? ''),
        dont: (row[keys[1]] ?? '').trim(),
        use: (row[keys[2]] ?? '').trim(),
        why: (row[keys[3]] ?? '').trim(),
      });
    }
  }
  let insight: string | null = null;
  const notes: Block[] = [];
  for (const block of blocks) {
    if (block.kind === 'table') continue;
    if (block.kind === 'paragraph') {
      const label = labelOf(block.text);
      if (label && /^key insight/i.test(label.label) && insight === null) {
        insight = label.rest === '' ? null : label.rest;
        continue;
      }
    }
    notes.push(block);
  }
  if (rows.length === 0 && insight === null) return null;
  return { rows, insight, notes };
}

// --- pitfalls ------------------------------------------------------------

const PITFALL_HEADING_RE = /^Pitfall\s+(\d{1,3})(?:\s*\(([^)]{1,80})\))?\s*[:—–.-]?\s*(.*)$/i;
const SEVERITY_RE = /\b(CRITICAL|HIGH|MEDIUM|LOW)\b/;
const F_CODE_RE = /\bF\d{1,3}\b/;

function parseLabelRows(body: string): ResearchPitfallRow[] {
  const rows: ResearchPitfallRow[] = [];
  let current: ResearchPitfallRow | null = null;
  let blank = false;
  let fence: Fence | null = null;
  let fenceLines: string[] = [];
  let pipeLines: string[] = [];
  const flushPipes = (): void => {
    if (pipeLines.length === 0) return;
    if (!current) {
      current = { label: null, text: '', code: [] };
      rows.push(current);
    }
    current.code.push(pipeLines.join('\n'));
    pipeLines = [];
  };
  for (const line of clipLines(body)) {
    const trimmed = line.trim();
    if (fence) {
      if (closesFence(trimmed, fence)) {
        if (!current) {
          current = { label: null, text: '', code: [] };
          rows.push(current);
        }
        current.code.push(fenceLines.join('\n'));
        fence = null;
        fenceLines = [];
      } else fenceLines.push(line);
      continue;
    }
    const opened = openFence(trimmed);
    if (opened) {
      flushPipes();
      fence = opened;
      fenceLines = [];
      continue;
    }
    if (trimmed === '') {
      flushPipes();
      blank = true;
      continue;
    }
    if (TAG_ONLY_RE.test(trimmed)) continue;
    if (trimmed.startsWith('|')) {
      pipeLines.push(trimmed);
      blank = false;
      continue;
    }
    flushPipes();
    const label = labelOf(trimmed);
    if (label && label.label.length <= 60) {
      current = { label: label.label, text: label.rest, code: [] };
      rows.push(current);
      blank = false;
      continue;
    }
    const bullet = ZERO_ITEM_RE.exec(trimmed);
    if (bullet && current && current.label !== null) {
      current.text = current.text === '' ? bullet[2].trim() : `${current.text} · ${bullet[2].trim()}`;
      blank = false;
      continue;
    }
    if (current && !blank) {
      current.text = current.text === '' ? trimmed : `${current.text} ${trimmed}`;
      continue;
    }
    if (current && blank && /^[ \t]/.test(line) && current.label !== null) {
      current.text = current.text === '' ? trimmed : `${current.text} ${trimmed}`;
      blank = false;
      continue;
    }
    current = { label: null, text: bullet ? bullet[2].trim() : trimmed, code: [] };
    rows.push(current);
    blank = false;
  }
  flushPipes();
  return rows;
}

function parsePitfalls(body: string, parent: string, add: AddSource): { items: ResearchPitfall[] } | null {
  const split = splitWithPreamble(body, 3);
  const items: ResearchPitfall[] = [];
  for (const sub of split.sections) {
    const heading = plainHeading(sub.heading);
    const match = PITFALL_HEADING_RE.exec(heading);
    if (!match) {
      add(`${parent} › ${heading}`, heading, parent);
      continue;
    }
    let severity: PitfallSeverity | null = null;
    let code: string | null = null;
    let tag: string | null = null;
    const paren = match[2];
    if (paren) {
      const sev = SEVERITY_RE.exec(paren);
      const fcode = F_CODE_RE.exec(paren);
      if (sev) severity = sev[1] as PitfallSeverity;
      if (fcode) code = fcode[0];
      if (!sev && !fcode) tag = paren.trim();
    }
    const title = match[3].trim() === '' ? heading : match[3].trim();
    items.push({ number: Number(match[1]), title, severity, code, tag, rows: parseLabelRows(sub.body) });
  }
  if (items.length === 0) {
    // SP phases/04 shape: a numbered list, `1. **Title.** body`.
    for (const item of itemsOf(parseColumnZero(split.preamble))) {
      if (item.number === null) continue;
      const text = joinItem(item);
      const lead = splitIdeaLead(text);
      const title = lead.title ?? firstSentence(text)[0];
      const rest = lead.title === null ? firstSentence(text)[1] : lead.body;
      items.push({
        number: item.number,
        title,
        severity: null,
        code: null,
        tag: null,
        rows: rest === '' ? [] : [{ label: null, text: rest, code: [] }],
      });
    }
  }
  if (items.length === 0) return null;
  return { items };
}

// --- questions -----------------------------------------------------------

const RESOLVED_RE = /\bRESOLVED\b/;

function titleLineResolved(line: string): boolean {
  const at = line.search(RESOLVED_RE);
  if (at === -1) return false;
  const before = line.slice(Math.max(0, at - 6), at).toLowerCase();
  return !/(^|\s)(un-?|not\s+)$/.test(before);
}

function parseQuestions(
  body: string,
  heading: string,
  parent: string,
  add: AddSource,
): ResearchQuestions | null {
  const headingResolved = /\(RESOLVED\)/i.test(heading);
  const split = splitWithPreamble(body, 3);
  for (const sub of split.sections) {
    const child = plainHeading(sub.heading);
    add(`${parent} › ${child}`, child, parent);
  }
  const entries = parseColumnZero(split.preamble);
  const leadLines: string[] = [];
  const items: ResearchQuestion[] = [];
  let sawItem = false;
  for (const entry of entries) {
    if (entry.type === 'text') {
      if (!sawItem) leadLines.push(entry.text);
      continue;
    }
    sawItem = true;
    const lead = splitIdeaLead(entry.first);
    const title = lead.title ?? firstSentence(entry.first)[0];
    const firstBody = lead.title === null ? firstSentence(entry.first)[1] : lead.body;
    const bodyLines = [...(firstBody === '' ? [] : [firstBody]), ...dedent(entry.rest)];
    items.push({
      number: entry.number ?? items.length + 1,
      title,
      resolved: headingResolved || titleLineResolved(entry.first),
      body: parseBlocks(bodyLines.join('\n')),
    });
  }
  const lead = parseBlocks(leadLines.join('\n\n'));
  if (items.length === 0) return null;
  return { headingResolved, lead, items };
}

// --- environment ---------------------------------------------------------

function envAvailable(text: string): AvailableState {
  const t = plain(text);
  if (t.startsWith('✓')) return 'yes';
  if (t.startsWith('✗')) return 'no';
  return 'unknown';
}

function parseEnvironment(body: string, parent: string, add: AddSource): ResearchEnvironment | null {
  const blocks = parseBlocks(flatPreamble(body, parent, add));
  const table = firstTable(blocks);
  const others = blocks.filter((b) => b.kind !== 'table');
  if (!table) {
    if (others.length === 0) return null;
    return { rows: [], notes: [], prose: others };
  }
  const keys = Object.keys(table[0]);
  const rows: ResearchEnvRow[] = table.map((row) => {
    const availableText = cell(row, keys, /^available/i, 2).trim();
    const fallback = cell(row, keys, /fallback/i, 4).trim();
    const fallbackPlain = plain(fallback).toLowerCase();
    return {
      dependency: cell(row, keys, /^(dependency|name)/i, 0).trim(),
      requiredBy: cell(row, keys, /required/i, 1).trim(),
      available: envAvailable(availableText),
      availableText: plain(availableText),
      version: cell(row, keys, /^version/i, 3).trim(),
      fallback,
      blocking: /\bblocking\b/.test(fallbackPlain) && !/non-?blocking/.test(fallbackPlain),
    };
  });
  return { rows, notes: others, prose: [] };
}

// --- sources -------------------------------------------------------------

function tierOf(heading: string): SourceTierKey {
  const key = plain(heading).toLowerCase();
  if (key.startsWith('primary')) return 'primary';
  if (key.startsWith('secondary')) return 'secondary';
  if (key.startsWith('tertiary')) return 'tertiary';
  return 'other';
}

function parseSources(body: string): ResearchSources | null {
  const split = splitWithPreamble(body, 3);
  const tiers: ResearchSourceTier[] = [];
  const add = (tier: SourceTierKey, label: string, text: string): void => {
    const items = itemsOf(parseColumnZero(text)).map(joinItem);
    if (items.length === 0) return;
    const existing = tiers.find((t) => t.tier === tier && tier !== 'other');
    if (existing) existing.items.push(...items);
    else tiers.push({ tier, label, items });
  };
  add('other', 'Sources', split.preamble);
  for (const sub of split.sections) add(tierOf(sub.heading), plainHeading(sub.heading), sub.body);
  if (tiers.length === 0) return null;
  const order: SourceTierKey[] = ['primary', 'secondary', 'tertiary', 'other'];
  tiers.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
  return { tiers };
}

// --- user constraints ----------------------------------------------------

const DECISION_ID_RE = /^\*{0,2}(D-\d{1,3})\b/;

function bulletsOrParagraphs(body: string): string[] {
  const entries = parseColumnZero(body);
  const items = itemsOf(entries).map(joinItem);
  if (items.length > 0) return items;
  return entries.filter((e): e is Extract<ZeroEntry, { type: 'text' }> => e.type === 'text').map((e) => e.text);
}

function lockedGroupsOf(body: string, heading: string): ResearchLockedGroup[] {
  const container = /^locked decisions$/i.test(plain(heading));
  const groups: ResearchLockedGroup[] = [];
  let current: ResearchLockedGroup | null = null;
  const start = (label: string | null): ResearchLockedGroup => {
    const group: ResearchLockedGroup = { group: label, ids: [] };
    groups.push(group);
    return group;
  };
  for (const entry of parseColumnZero(body)) {
    if (entry.type === 'text') {
      const bold = /^\*\*([^*]{1,120})\*\*$/.exec(entry.text);
      if (bold) current = start(bold[1].trim());
      continue;
    }
    const match = DECISION_ID_RE.exec(entry.first);
    if (!match) continue;
    if (!current) current = start(container ? null : plain(heading));
    current.ids.push(match[1]);
  }
  return groups.filter((g) => g.ids.length > 0);
}

function parseUserConstraints(body: string): ResearchUserConstraints | null {
  const split = splitWithPreamble(body, 3);
  const lockedGroups: ResearchLockedGroup[] = [];
  let discretion: string[] = [];
  let deferred: string[] = [];
  lockedGroups.push(...lockedGroupsOf(split.preamble, 'Locked decisions'));
  for (const sub of split.sections) {
    const key = plain(sub.heading).toLowerCase();
    if (/discretion/.test(key)) {
      discretion = discretion.concat(bulletsOrParagraphs(sub.body));
    } else if (/^deferred/.test(key)) {
      deferred = deferred.concat(bulletsOrParagraphs(sub.body));
    } else {
      lockedGroups.push(...lockedGroupsOf(sub.body, sub.heading));
    }
  }
  if (lockedGroups.length === 0 && discretion.length === 0 && deferred.length === 0) return null;
  return { lockedGroups, discretion, deferred };
}

// --- tables --------------------------------------------------------------

function parseTableSection(body: string, parent: string, add: AddSource): ResearchTable | null {
  const blocks = parseBlocks(flatPreamble(body, parent, add));
  const rows = firstTable(blocks);
  if (!rows) return null;
  return { rows, notes: blocks.filter((b) => b.kind !== 'table') };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function emptyMeta(): ResearchMeta {
  return {
    title: null,
    phase: null,
    quickId: null,
    researched: null,
    domain: null,
    confidence: null,
    preamble: [],
    breakdown: [],
    breakdownText: null,
    validUntil: null,
    validUntilShort: null,
    researchDate: null,
  };
}

/** Projects a RESEARCH document body into the briefing model. Pure and non-throwing on any string:
 * every parser returns `null` for an absent/unparseable section, and every `##`/`###` the briefing
 * does not claim lands in `sourceOnly` — nothing is dropped silently. */
export function extractResearchBriefing(rawBody: string): ResearchBriefing {
  const top = splitWithPreamble(rawBody, 2);
  const meta = emptyMeta();
  const header = parsePreamble(top.preamble);
  if (header.h1 !== null) {
    const parsed = parseTitle(header.h1);
    meta.title = parsed.title;
    meta.phase = parsed.phase;
    meta.quickId = parsed.quickId;
  }
  meta.researched = header.labels.Researched ?? null;
  meta.domain = header.labels.Domain ?? null;
  if (header.labels.Confidence !== undefined) {
    meta.confidence = {
      raw: header.labels.Confidence,
      level: confidenceLevelOf(header.labels.Confidence),
    };
  }
  meta.preamble = header.blocks;

  const briefing: ResearchBriefing = {
    meta,
    summary: null,
    stack: null,
    audit: null,
    architecture: null,
    handRoll: null,
    pitfalls: null,
    questions: null,
    environment: null,
    sources: null,
    userConstraints: null,
    requirements: null,
    responsibilityMap: null,
    sections: [],
    sourceOnly: [],
  };

  const addSource: AddSource = (label, heading, parentHeading) => {
    briefing.sourceOnly.push({ label, heading, parentHeading });
  };
  const claimed = new Set<ResearchSectionRole>();

  for (const section of top.sections) {
    const role = roleOf(section.heading);
    const heading = plainHeading(section.heading);
    let rendered = false;
    const duplicate = role !== 'architecture' && claimed.has(role);

    if (duplicate || role === 'sourceOnly' || role === 'unrecognised') {
      addSource(heading, heading, null);
    } else if (role === 'metadata') {
      parseMetadata(section.body, meta);
      meta.validUntilShort = meta.validUntil ? validUntilShort(meta.validUntil) : null;
      addSource(heading, heading, null);
    } else {
      switch (role) {
        case 'summary': {
          briefing.summary = parseSummary(section.body, heading, addSource);
          rendered = briefing.summary !== null;
          break;
        }
        case 'stack': {
          const parsed = parseStack(section.body, heading, addSource);
          briefing.stack = parsed.stack;
          rendered = parsed.stack !== null;
          if (parsed.auditBody !== null && briefing.audit === null) {
            briefing.audit = parseAudit(parsed.auditBody);
            claimed.add('audit');
          }
          break;
        }
        case 'audit': {
          briefing.audit = parseAudit(flatPreamble(section.body, heading, addSource));
          rendered = true;
          break;
        }
        case 'architecture': {
          const parsed = parseArchitecture(section.body, heading, addSource);
          if (parsed) {
            const merged = briefing.architecture;
            briefing.architecture = merged
              ? {
                  intro: merged.intro.concat(parsed.intro),
                  diagram: merged.diagram ?? parsed.diagram,
                  structure: merged.structure ?? parsed.structure,
                  patterns: merged.patterns.concat(parsed.patterns),
                  antiPatterns: merged.antiPatterns.concat(parsed.antiPatterns),
                }
              : parsed;
            rendered = true;
          }
          break;
        }
        case 'handRoll': {
          briefing.handRoll = parseHandRoll(section.body, heading, addSource);
          rendered = briefing.handRoll !== null;
          break;
        }
        case 'pitfalls': {
          briefing.pitfalls = parsePitfalls(section.body, heading, addSource);
          rendered = briefing.pitfalls !== null;
          break;
        }
        case 'questions': {
          briefing.questions = parseQuestions(section.body, section.heading, heading, addSource);
          rendered = briefing.questions !== null;
          break;
        }
        case 'environment': {
          briefing.environment = parseEnvironment(section.body, heading, addSource);
          rendered = briefing.environment !== null;
          break;
        }
        case 'sources': {
          briefing.sources = parseSources(section.body);
          rendered = briefing.sources !== null;
          break;
        }
        case 'userConstraints': {
          briefing.userConstraints = parseUserConstraints(section.body);
          rendered = briefing.userConstraints !== null;
          break;
        }
        case 'requirements': {
          briefing.requirements = parseTableSection(section.body, heading, addSource);
          rendered = briefing.requirements !== null;
          break;
        }
        case 'responsibilityMap': {
          briefing.responsibilityMap = parseTableSection(section.body, heading, addSource);
          rendered = briefing.responsibilityMap !== null;
          break;
        }
        default:
          break;
      }
      if (!rendered) addSource(heading, heading, null);
      claimed.add(role);
    }
    briefing.sections.push({ heading, role, rendered });
  }
  return briefing;
}
