// The spike lifts (Phase 11, 11-12, VIEW-14, D-01). `/gsd-spike` writes a manifest (`spikes/MANIFEST.md`: ideas
// and a Spikes table), one README per spike folder, and, when a session is wrapped up, `WRAP-UP-SUMMARY.md` and
// `CONVENTIONS.md`. This module turns each into the projection the Spikes page's board context reads.
//
// Three rules shape every function here.
//   * A spike's id and name come from its folder name, never from `spike:` frontmatter: gray-matter reads
//     `spike: 001` as the number 1 and `spike: 010` as the number 8 (RESEARCH C6, Pitfall 3). Ids stay text.
//   * A README whose YAML does not parse (`verdict: PARTIAL: resume untested` is an unquoted colon pair) loses
//     its whole frontmatter, so the verdict is recovered by one scan of the head lines.
//   * A verdict cell is a keyword plus free text (`INVALIDATED (no spare test kiosk)`): the keyword groups, the
//     text is kept. Nothing is merged or corrected; the manifest's verdict and a README's verdict are separate
//     facts.
//
// Author keys (idea keys, table headers) are read through Maps and Object.hasOwn, never spread into a plain
// object (RESEARCH Pitfall 11). Tables are bounded (SPIKES_ROW_CAP rows, SPIKES_IDEA_CAP ideas) and every scan is
// one linear pass over a capped body, because the whole structured record ships to the browser (T-11-15, T-11-16).
import { eachLineOutsideFences, scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import type { FencedSection } from './fenced-sections.ts';
import { parseMarkdownTable } from './markdown-sections.ts';

/** The most manifest rows kept. */
export const SPIKES_ROW_CAP = 500;
/** The most ideas kept. */
export const SPIKES_IDEA_CAP = 200;
/** The longest cell or paragraph kept, in characters. */
export const SPIKES_TEXT_CAP = 2000;
/** The most requirements kept per idea. */
export const SPIKES_REQUIREMENT_CAP = 60;
/** The most README headings kept. */
export const SPIKES_HEADING_CAP = 40;
/** The most head lines a README scan reads. */
const HEAD_LINE_CAP = 80;

/** The key of the one idea a flat (pre-#1700) manifest, or a row with no Idea cell, belongs to. */
export const IMPLICIT_IDEA_KEY = 'spikes';

// ---------------------------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------------------------

export interface SpikeIdea {
  key: string;
  paragraph: string;
  requirements: string[];
  /** True for the one idea made from a flat manifest. */
  implicit?: true;
}

export interface SpikeManifestRow {
  /** Text, as the folder names it: `001`, `003b`. Never a number. */
  id: string;
  /** The idea key the row names; '' when the table has no Idea cell. */
  idea: string;
  name: string;
  type: string;
  validates: string;
  /** The cell's first word as written; '' for an empty cell. */
  verdictKeyword: string;
  verdictText: string;
  tags: string[];
}

export interface SpikesManifestBody {
  ideas: SpikeIdea[];
  rows: SpikeManifestRow[];
}

export type SpikeValidates = { given: string; when: string; then: string } | { whole: string };

export interface SpikeReadmeBody {
  id: string;
  name: string;
  idea?: string;
  type?: string;
  validates?: SpikeValidates;
  verdictKeyword?: string;
  verdictText?: string;
  related: string[];
  tags: string[];
  /** The README's `##` headings other than What This Validates and Results, in file order. */
  headings: string[];
  /** False when the frontmatter did not parse and the verdict came from the head scan. */
  frontmatterParsed: boolean;
}

export interface WrapUpProcessedRow {
  id: string;
  name: string;
  type: string;
  verdict: string;
  area: string;
}

export interface SpikesWrapUpBody {
  date?: string;
  count?: number;
  areas: string[];
  skillPath?: string;
  processed: WrapUpProcessedRow[];
  keyFindings: string;
}

export interface SpikesConventionsSection {
  /** `stack`, `structure`, `patterns` or `tools-and-libraries` when the heading is one of the writer's four. */
  key: string | null;
  heading: string;
  text: string;
}

export interface SpikesConventionsBody {
  sections: SpikesConventionsSection[];
}

// ---------------------------------------------------------------------------------------------------------
// Small readers
// ---------------------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capText(text: string, limit: number = SPIKES_TEXT_CAP): string {
  return text.length > limit ? text.slice(0, limit) : text;
}

/** An own property of a record, never one inherited from a prototype. */
function own(record: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** A non-empty trimmed string, or a number or boolean read as text, else undefined. */
function scalarText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : capText(trimmed);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return undefined;
}

function unquote(text: string): string {
  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if ((first === '"' || first === "'") && first === last) return text.slice(1, -1);
  }
  return text;
}

function isLetter(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

// ---------------------------------------------------------------------------------------------------------
// Ids from folder names
// ---------------------------------------------------------------------------------------------------------

/**
 * The id and name a spike folder (or a manifest id cell) names. The id is the run before the first `-` when it is
 * digits and an optional letter run (`001`, `003b`); the name is the rest. A name that starts with no digit
 * (`SPIKE-006`) is its own id with no name. A leading `#` is dropped. Always text.
 */
export function spikeFolderIdentity(folder: string): { id: string; name: string } {
  let text = (folder.length > 200 ? folder.slice(0, 200) : folder).trim();
  if (text.startsWith('#')) text = text.slice(1).trim();
  let i = 0;
  while (i < text.length && isDigit(text.charCodeAt(i))) i += 1;
  if (i === 0) return { id: text, name: '' };
  let j = i;
  while (j < text.length && isLetter(text.charCodeAt(j))) j += 1;
  // A letter run counts as a suffix only when it ends the id (`003b-name`, `003b`), not when it runs into a name
  // (`001kiln`).
  const ends = j === text.length || text.charCodeAt(j) === 45;
  const idEnd = ends ? j : i;
  const id = text.slice(0, idEnd);
  let rest = text.slice(idEnd);
  if (rest.startsWith('-')) rest = rest.slice(1);
  return { id, name: rest.trim() };
}

/** The id of a README's folder: the segment above `README.md` in `.planning/spikes/<folder>/README.md`. */
export function spikeFolderOfPath(path: string): string {
  const segments = path.split('/');
  return segments.length >= 2 ? segments[segments.length - 2] : '';
}

/**
 * The comparison key of an id: lower-cased, leading zeros dropped from a leading number, so `001`, `1` and `001`
 * meet, and `003b` and `3B` meet. Text that starts with no digit is compared whole.
 */
export function spikeIdKey(id: string): string {
  const text = id.trim().toLowerCase();
  let i = 0;
  while (i < text.length && isDigit(text.charCodeAt(i))) i += 1;
  if (i === 0) return text;
  let z = 0;
  while (z < i - 1 && text.charCodeAt(z) === 48) z += 1;
  return text.slice(z);
}

/**
 * The spike id a pause or other text names: `SPIKE-006` names `006`, `003b-local-disk-staging` names `003b`.
 * The first run of digits and the letters that follow it, or null when the text holds no digit.
 */
export function spikeIdInText(text: string): string | null {
  const limit = Math.min(text.length, 200);
  let i = 0;
  while (i < limit && !isDigit(text.charCodeAt(i))) i += 1;
  if (i === limit) return null;
  let j = i;
  while (j < limit && isDigit(text.charCodeAt(j))) j += 1;
  let k = j;
  while (k < limit && isLetter(text.charCodeAt(k))) k += 1;
  // A letter run is a suffix only when it ends the id (`003b-name`), not when it runs into a word.
  return text.slice(i, k === limit || text.charCodeAt(k) === 45 ? k : j);
}

// ---------------------------------------------------------------------------------------------------------
// Verdict cells
// ---------------------------------------------------------------------------------------------------------

function isKeywordBreak(code: number): boolean {
  // whitespace, "(", ":", ",", ";"
  return code === 32 || code === 9 || code === 40 || code === 58 || code === 44 || code === 59;
}

function isSeparator(code: number): boolean {
  // whitespace, ":", "-", an en dash or em dash, ",", ";"
  return code === 32 || code === 9 || code === 58 || code === 45 || code === 0x2013 || code === 0x2014 || code === 44 || code === 59;
}

/**
 * A verdict cell split into its keyword and free text. The keyword is the first word as written. The text is the
 * inside of the first parenthesised group when nothing but separators sits between it and the keyword, else the
 * rest of the cell after the keyword (leading separators dropped), else ''. `INVALIDATED (no spare test kiosk)`
 * gives INVALIDATED and `no spare test kiosk`; `PARTIAL: resume untested` gives PARTIAL and `resume untested`.
 */
export function splitVerdict(cell: string): { keyword: string; text: string } {
  const source = capText(cell).trim();
  if (source === '') return { keyword: '', text: '' };
  let i = 0;
  while (i < source.length && !isKeywordBreak(source.charCodeAt(i))) i += 1;
  const keyword = source.slice(0, i);
  const rest = source.slice(i);
  let start = 0;
  while (start < rest.length && isSeparator(rest.charCodeAt(start))) start += 1;
  const after = rest.slice(start).trim();
  if (after.startsWith('(')) {
    let depth = 0;
    for (let k = 0; k < after.length; k += 1) {
      const code = after.charCodeAt(k);
      if (code === 40) depth += 1;
      else if (code === 41) {
        depth -= 1;
        if (depth === 0) return { keyword, text: after.slice(1, k).trim() };
      }
    }
    // Unclosed: the rest after the opening parenthesis.
    return { keyword, text: after.slice(1).trim() };
  }
  return { keyword, text: after };
}

// ---------------------------------------------------------------------------------------------------------
// Section helpers
// ---------------------------------------------------------------------------------------------------------

function sectionText(lines: readonly string[], section: FencedSection): string {
  return lines.slice(section.startLine + 1, section.endLine).join('\n');
}

function findH2(sections: readonly FencedSection[], name: string): FencedSection | undefined {
  return sections.find((section) => section.level === 2 && section.heading.trim().toLowerCase() === name);
}

function bulletText(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length < 3) return null;
  const mark = trimmed[0];
  if ((mark === '-' || mark === '*' || mark === '+') && (trimmed[1] === ' ' || trimmed[1] === '\t')) {
    const text = trimmed.slice(2).trim();
    return text === '' ? null : capText(text, 500);
  }
  return null;
}

function isRequirementsMarker(line: string): boolean {
  return line.trim().toLowerCase().startsWith('**requirements');
}

interface IdeaBlock {
  paragraph: string;
  requirements: string[];
}

/** An idea's paragraph (the lines before `**Requirements:**`) and its requirement bullets, fences honoured. */
function readIdeaBlock(lines: readonly string[], from: number, to: number): IdeaBlock {
  const paragraph: string[] = [];
  const requirements: string[] = [];
  let inRequirements = false;
  eachLineOutsideFences(lines, from, to, (line) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;
    if (isRequirementsMarker(trimmed)) {
      inRequirements = true;
      return;
    }
    if (inRequirements) {
      const bullet = bulletText(trimmed);
      if (bullet !== null && requirements.length < SPIKES_REQUIREMENT_CAP) requirements.push(bullet);
      return;
    }
    paragraph.push(trimmed);
  });
  return { paragraph: capText(paragraph.join(' ')), requirements };
}

// ---------------------------------------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------------------------------------

const ID_HEADERS = ['#', 'id', 'spike', 'no', 'no.', 'number'];

function lowerKeyed(row: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    const lower = key.trim().toLowerCase();
    if (!map.has(lower)) map.set(lower, value);
  }
  return map;
}

function firstOf(row: ReadonlyMap<string, string>, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = row.get(name);
    if (value !== undefined) return value;
  }
  return undefined;
}

function hasIdColumn(row: Record<string, string>): boolean {
  const map = lowerKeyed(row);
  return ID_HEADERS.some((name) => map.has(name));
}

function splitList(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(',')) {
    const trimmed = part.trim();
    if (trimmed !== '' && out.length < 20) out.push(capText(trimmed, 100));
  }
  return out;
}

function rowFrom(raw: Record<string, string>): SpikeManifestRow | null {
  const map = lowerKeyed(raw);
  const idCell = firstOf(map, ID_HEADERS) ?? '';
  const identity = spikeFolderIdentity(idCell);
  if (identity.id === '') return null;
  const nameCell = firstOf(map, ['name'])?.trim();
  const verdict = splitVerdict(firstOf(map, ['verdict', 'status', 'result']) ?? '');
  return {
    id: identity.id,
    idea: capText((firstOf(map, ['idea']) ?? '').trim(), 200),
    name: capText(nameCell !== undefined && nameCell !== '' ? nameCell : identity.name, 200),
    type: capText((firstOf(map, ['type']) ?? '').trim(), 100),
    validates: capText((firstOf(map, ['validates', 'question']) ?? '').trim()),
    verdictKeyword: capText(verdict.keyword, 100),
    verdictText: verdict.text,
    tags: splitList(firstOf(map, ['tags']) ?? ''),
  };
}

function manifestRows(lines: readonly string[], sections: readonly FencedSection[]): SpikeManifestRow[] {
  // The Spikes section first; else the text before the first heading; else every other section in order.
  const regions: Array<{ from: number; to: number }> = [];
  const spikes = findH2(sections, 'spikes');
  if (spikes !== undefined) regions.push({ from: spikes.startLine + 1, to: spikes.endLine });
  const firstHeading = sections.length > 0 ? sections[0].startLine : lines.length;
  regions.push({ from: 0, to: firstHeading });
  for (const section of sections) {
    if (section !== spikes && section.level === 2) regions.push({ from: section.startLine + 1, to: section.endLine });
  }
  for (const region of regions) {
    const table = parseMarkdownTable(lines.slice(region.from, region.to).join('\n'));
    if (table.length === 0 || !hasIdColumn(table[0])) continue;
    const rows: SpikeManifestRow[] = [];
    for (const raw of table) {
      if (rows.length >= SPIKES_ROW_CAP) break;
      const row = rowFrom(raw);
      if (row !== null) rows.push(row);
    }
    return rows;
  }
  return [];
}

function manifestIdeas(lines: readonly string[], sections: readonly FencedSection[]): SpikeIdea[] {
  const ideasSection = findH2(sections, 'ideas');
  const byKey = new Map<string, SpikeIdea>();
  if (ideasSection !== undefined) {
    for (const section of sections) {
      if (section.level !== 3 || section.startLine <= ideasSection.startLine || section.startLine >= ideasSection.endLine) continue;
      const key = capText(section.heading.trim(), 200);
      if (key === '' || byKey.has(key) || byKey.size >= SPIKES_IDEA_CAP) continue;
      const block = readIdeaBlock(lines, section.startLine + 1, section.endLine);
      byKey.set(key, { key, paragraph: block.paragraph, requirements: block.requirements });
    }
    return [...byKey.values()];
  }
  // The pre-#1700 flat shape: `## Idea` and `## Requirements` describe the one idea the spikes answer.
  const idea = findH2(sections, 'idea');
  const requirements = findH2(sections, 'requirements');
  if (idea === undefined && requirements === undefined) return [];
  const paragraph = idea === undefined ? '' : readIdeaBlock(lines, idea.startLine + 1, idea.endLine).paragraph;
  // Under `## Requirements` the bullets stand without a `**Requirements:**` marker line.
  const bullets: string[] = [];
  if (requirements !== undefined) {
    eachLineOutsideFences(lines, requirements.startLine + 1, requirements.endLine, (line) => {
      const bullet = bulletText(line);
      if (bullet !== null && bullets.length < SPIKES_REQUIREMENT_CAP) bullets.push(bullet);
    });
  }
  return [{ key: IMPLICIT_IDEA_KEY, paragraph, requirements: bullets, implicit: true }];
}

/** The manifest's ideas and table rows. Throws nothing on author text; the handler still guards the call. */
export function extractManifest(body: string): SpikesManifestBody {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines);
  return { ideas: manifestIdeas(lines, sections), rows: manifestRows(lines, sections) };
}

// ---------------------------------------------------------------------------------------------------------
// A spike README
// ---------------------------------------------------------------------------------------------------------

/** The lines between the opening and closing frontmatter fences of a file, or null when it has no fence. */
function headLines(content: string): { lines: string[]; end: number } | null {
  const lines = splitBodyLines(content.length > 20_000 ? content.slice(0, 20_000) : content);
  if (lines.length === 0 || lines[0].trim() !== '---') return null;
  const inside: string[] = [];
  const limit = Math.min(lines.length, HEAD_LINE_CAP);
  for (let i = 1; i < limit; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === '---' || trimmed === '...') return { lines: inside, end: i };
    inside.push(lines[i]);
  }
  return { lines: inside, end: -1 };
}

/** The value of a top-level `key: value` head line, unquoted, or undefined. Case-insensitive on the key. */
function headScalar(head: readonly string[], key: string): string | undefined {
  for (const line of head) {
    if (line.length === 0 || line.charCodeAt(0) === 32 || line.charCodeAt(0) === 9 || line.charCodeAt(0) === 35) continue;
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    if (line.slice(0, colon).trim().toLowerCase() !== key) continue;
    const value = unquote(line.slice(colon + 1).trim());
    return value === '' ? undefined : capText(value);
  }
  return undefined;
}

/** A head list (`key: [a, b]` or a block of `- item` lines) read as text, so `002` stays `002`. Null when absent. */
function headList(head: readonly string[], key: string): string[] | null {
  for (let i = 0; i < head.length; i += 1) {
    const line = head[i];
    const colon = line.indexOf(':');
    if (colon <= 0 || line.charCodeAt(0) === 32 || line.slice(0, colon).trim().toLowerCase() !== key) continue;
    const value = line.slice(colon + 1).trim();
    if (value.startsWith('[')) {
      const close = value.indexOf(']');
      return splitList(close === -1 ? value.slice(1) : value.slice(1, close)).map((item) => unquote(item));
    }
    if (value === '') {
      const items: string[] = [];
      for (let j = i + 1; j < head.length && items.length < 20; j += 1) {
        const next = head[j].trim();
        if (!next.startsWith('-')) break;
        const item = unquote(next.slice(1).trim());
        if (item !== '') items.push(capText(item, 100));
      }
      return items;
    }
    return splitList(value).map((item) => unquote(item));
  }
  return null;
}

function listText(value: unknown): string[] {
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) {
      const text = scalarText(item);
      if (text !== undefined && out.length < 20) out.push(text);
    }
    return out;
  }
  const single = scalarText(value);
  return single === undefined ? [] : splitList(single);
}

/** The index of a whole-word, case-insensitive `word` in `text` at or after `from`, or -1. */
function findWord(text: string, word: string, from: number): number {
  const first = word.charCodeAt(0);
  for (let i = from; i + word.length <= text.length; i += 1) {
    if ((text.charCodeAt(i) | 32) !== first) continue;
    if (text.slice(i, i + word.length).toLowerCase() !== word) continue;
    if (i > 0 && isLetter(text.charCodeAt(i - 1))) continue;
    const after = i + word.length;
    if (after < text.length && isLetter(text.charCodeAt(after))) continue;
    return i;
  }
  return -1;
}

function trimClause(text: string): string {
  let out = text.trim();
  while (out.length > 0 && (out.endsWith(',') || out.endsWith(';'))) out = out.slice(0, -1).trimEnd();
  return out;
}

/** A validates sentence split into Given, When and Then, else kept whole. */
function splitValidates(text: string): SpikeValidates {
  const whole = capText(text.trim());
  const given = findWord(whole, 'given', 0);
  // Given must open the sentence (after at most punctuation or spaces).
  if (given === -1 || whole.slice(0, given).trim().length > 0) return { whole };
  const when = findWord(whole, 'when', given + 5);
  const then = when === -1 ? -1 : findWord(whole, 'then', when + 4);
  if (when === -1 || then === -1) return { whole };
  return {
    given: trimClause(whole.slice(given + 5, when)),
    when: trimClause(whole.slice(when + 4, then)),
    then: trimClause(whole.slice(then + 4)),
  };
}

const VALIDATES_HEADING = 'what this validates';
const RESULTS_HEADING = 'results';

/**
 * A spike README lifted. `path` supplies the id and name (from the folder); `frontmatter` and `body` are
 * tryParseFrontmatter's; `warned` is true when the frontmatter did not parse, in which case `body` is the whole
 * file and the verdict is recovered by one scan of the head lines. `rawContent` (the whole file, default `body`)
 * lets list fields such as `related: [002]` be read as text instead of as YAML numbers.
 */
export function extractSpikeReadme(
  path: string,
  frontmatter: Record<string, unknown>,
  body: string,
  warned: boolean,
  rawContent: string = body,
): SpikeReadmeBody {
  const fm = isRecord(frontmatter) ? frontmatter : {};
  const identity = spikeFolderIdentity(spikeFolderOfPath(path));
  const head = headLines(rawContent);
  const headRows = head === null ? [] : head.lines;

  const verdictText = scalarText(own(fm, 'verdict')) ?? headScalar(headRows, 'verdict');
  const verdict = verdictText === undefined ? undefined : splitVerdict(verdictText);

  let lines = splitBodyLines(body);
  // A README whose YAML failed keeps its fence lines in the body: skip them before looking for headings.
  if (warned && head !== null && head.end !== -1) lines = lines.slice(head.end + 1);
  const sections = scanFencedLines(lines);

  let validatesText = scalarText(own(fm, 'validates')) ?? headScalar(headRows, 'validates');
  if (validatesText === undefined) {
    const section = sections.find((s) => s.level === 2 && s.heading.trim().toLowerCase() === VALIDATES_HEADING);
    if (section !== undefined) {
      const paragraph: string[] = [];
      eachLineOutsideFences(lines, section.startLine + 1, section.endLine, (line) => {
        const trimmed = line.trim();
        if (trimmed !== '' && !trimmed.startsWith('#')) paragraph.push(trimmed);
      });
      validatesText = paragraph.length === 0 ? undefined : capText(paragraph.join(' '));
    }
  }

  const headings: string[] = [];
  for (const section of sections) {
    if (section.level !== 2 || headings.length >= SPIKES_HEADING_CAP) continue;
    const lower = section.heading.trim().toLowerCase();
    if (lower === VALIDATES_HEADING || lower === RESULTS_HEADING) continue;
    headings.push(section.heading);
  }

  const related = headList(headRows, 'related') ?? listText(own(fm, 'related'));
  const result: SpikeReadmeBody = {
    id: identity.id,
    name: identity.name,
    related,
    tags: listText(own(fm, 'tags')),
    headings,
    frontmatterParsed: !warned,
  };
  const idea = scalarText(own(fm, 'idea')) ?? headScalar(headRows, 'idea');
  if (idea !== undefined) result.idea = idea;
  const type = scalarText(own(fm, 'type')) ?? headScalar(headRows, 'type');
  if (type !== undefined) result.type = type;
  if (validatesText !== undefined) result.validates = splitValidates(validatesText);
  if (verdict !== undefined) {
    result.verdictKeyword = verdict.keyword;
    result.verdictText = verdict.text;
  }
  if (result.tags.length === 0 && warned) result.tags = headList(headRows, 'tags') ?? [];
  return result;
}

// ---------------------------------------------------------------------------------------------------------
// The wrap-up and the conventions
// ---------------------------------------------------------------------------------------------------------

/** The `**Label:** value` lines of a body, outside fences, keyed by the lower-cased label without its colon. */
function boldLabels(lines: readonly string[]): Map<string, string> {
  const labels = new Map<string, string>();
  eachLineOutsideFences(lines, 0, lines.length, (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('**')) return;
    const close = trimmed.indexOf('**', 2);
    if (close === -1) return;
    let label = trimmed.slice(2, close).trim();
    let value = trimmed.slice(close + 2).trim();
    if (label.endsWith(':')) label = label.slice(0, -1).trim();
    else if (value.startsWith(':')) value = value.slice(1).trim();
    else return;
    const key = label.toLowerCase();
    if (!labels.has(key)) labels.set(key, capText(value, 500));
  });
  return labels;
}

function stripTicks(text: string): string {
  let out = text.trim();
  while (out.startsWith('`')) out = out.slice(1);
  while (out.endsWith('`')) out = out.slice(0, -1);
  return unquote(out.trim()).trim();
}

/** The wrap-up's date, count, areas, skill path, Processed Spikes table and Key Findings. */
export function extractWrapUp(_frontmatter: Record<string, unknown>, body: string): SpikesWrapUpBody {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines);
  const labels = boldLabels(lines);
  const result: SpikesWrapUpBody = { areas: [], processed: [], keyFindings: '' };

  const date = labels.get('date');
  if (date !== undefined && date !== '') result.date = date;
  const count = labels.get('spikes processed');
  if (count !== undefined) {
    let end = 0;
    while (end < count.length && isDigit(count.charCodeAt(end))) end += 1;
    if (end > 0) result.count = Number.parseInt(count.slice(0, end), 10);
  }
  const areas = labels.get('feature areas');
  if (areas !== undefined) result.areas = splitList(areas);
  const skill = labels.get('skill output');
  if (skill !== undefined && stripTicks(skill) !== '') result.skillPath = capText(stripTicks(skill), 500);

  const processed = findH2(sections, 'processed spikes');
  if (processed !== undefined) {
    for (const raw of parseMarkdownTable(sectionText(lines, processed))) {
      if (result.processed.length >= SPIKES_ROW_CAP) break;
      const map = lowerKeyed(raw);
      const identity = spikeFolderIdentity(firstOf(map, ID_HEADERS) ?? '');
      if (identity.id === '') continue;
      const nameCell = firstOf(map, ['name'])?.trim();
      result.processed.push({
        id: identity.id,
        name: capText(nameCell !== undefined && nameCell !== '' ? nameCell : identity.name, 200),
        type: capText((firstOf(map, ['type']) ?? '').trim(), 100),
        verdict: capText((firstOf(map, ['verdict']) ?? '').trim(), 300),
        area: capText((firstOf(map, ['feature area', 'feature areas', 'area']) ?? '').trim(), 200),
      });
    }
  }

  const findings = findH2(sections, 'key findings');
  if (findings !== undefined) result.keyFindings = capText(sectionText(lines, findings).trim(), 4000);
  return result;
}

const CONVENTION_KEYS: ReadonlySet<string> = new Set(['stack', 'structure', 'patterns', 'tools-and-libraries']);

function headingSlug(heading: string): string {
  const text = (heading.length > 200 ? heading.slice(0, 200) : heading).toLowerCase().split('&').join(' and ');
  let out = '';
  let pendingDash = false;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if ((code >= 97 && code <= 122) || (code >= 48 && code <= 57)) {
      if (pendingDash && out !== '') out += '-';
      out += ch;
      pendingDash = false;
    } else {
      pendingDash = true;
    }
  }
  return out;
}

/** The conventions file's `##` sections in file order, each with the writer's key where its heading is one. */
export function extractConventions(_frontmatter: Record<string, unknown>, body: string): SpikesConventionsBody {
  const lines = splitBodyLines(body);
  const sections: SpikesConventionsSection[] = [];
  for (const section of scanFencedLines(lines)) {
    if (section.level !== 2 || sections.length >= SPIKES_HEADING_CAP) continue;
    const slug = headingSlug(section.heading);
    sections.push({
      key: CONVENTION_KEYS.has(slug) ? slug : null,
      heading: section.heading,
      text: capText(sectionText(lines, section).trim(), 4000),
    });
  }
  return { sections };
}
