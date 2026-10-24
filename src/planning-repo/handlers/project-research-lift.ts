// The project-level research lift (quick-261024-k8u, sketches 031-035): turns the five files in a
// target project's `.planning/research/` (SUMMARY, STACK, FEATURES, ARCHITECTURE, PITFALLS) into
// typed structures the Research page reads.
//
// Sections are found by ROLE (a title regex) at any heading depth, never by position, so a project
// whose headings drift from the GSD template (Cinedise's "Headline" for "The Decision, Stated Once",
// `####` groups under Table Stakes, "Gaps to Address" as a `###`) degrades instead of breaking.
// Anything the lift does not recognise is simply left out.
//
// Every scan is one linear pass over lines with bounded single-line patterns, following the
// retrospective.ts header convention: no multi-line lazy regexes, no recursion over input. Body,
// line, section, row and text sizes are all capped before the scans run. Nothing here throws on any
// string, and nothing here touches a filesystem.

export const RESEARCH_FILE_KEYS = ['summary', 'stack', 'features', 'architecture', 'pitfalls'] as const;
export type ResearchFileKey = (typeof RESEARCH_FILE_KEYS)[number];

export type ConfidenceLevel = 'HIGH' | 'MEDIUM-HIGH' | 'MEDIUM' | 'LOW-MEDIUM' | 'LOW';

const MAX_BODY_CHARS = 400_000;
const MAX_LINE_CHARS = 4_000;
const MAX_SECTIONS = 600;
const MAX_ITEMS = 200;
const MAX_PHASES = 40;
const MAX_PITFALLS = 60;
const MAX_STEPS = 40;
const MAX_ROWS = 300;
const MAX_RIVALS = 8;
const MAX_TEXT_CHARS = 4_000;
const MAX_FIGURE_CHARS = 20_000;
const MAX_SPLIT_CHARS = 20_000;

export interface Confidence {
  level: ConfidenceLevel | null;
  text: string | null;
}

export interface LiftHead {
  title: string | null;
  project: string | null;
  domain: string | null;
  researched: string | null;
  confidence: Confidence;
}

export interface TextBlock {
  bullet: boolean;
  text: string;
}

export interface LeadItem {
  lead: string | null;
  body: string;
}

// ---------------------------------------------------------------------------------------------
// Summary

export interface SummaryPhase {
  n: string;
  name: string;
  rationale: string;
  delivers: string[];
  uses: string | null;
  implements: string | null;
  addresses: string | null;
  keeps: string | null;
  gate: string | null;
  flag: string | null;
  avoids: number[];
  parallelWith: number | null;
}

export interface FlagEntry {
  phase: string | null;
  lead: string | null;
  body: string;
}

export interface ConfidenceArea {
  area: string;
  level: ConfidenceLevel | null;
  note: string;
}

export type FindingKey = 'stack' | 'features' | 'architecture' | 'pitfalls';

export interface SummaryLift {
  file: 'summary';
  head: LiftHead;
  exec: string[];
  keyFindings: Partial<Record<FindingKey, string>>;
  preamble: string[];
  phases: SummaryPhase[];
  rationale: string[];
  flags: { needs: FlagEntry[]; standard: FlagEntry[] };
  gaps: LeadItem[];
  areas: ConfidenceArea[];
  overall: string | null;
}

// ---------------------------------------------------------------------------------------------
// Stack

export interface StackItem {
  name: string;
  version: string | null;
  purpose: string | null;
  why: string | null;
}

export interface StackLayer {
  title: string;
  note: string | null;
  whyLabel: string;
  items: StackItem[];
}

export interface StackAlternative {
  category: string | null;
  chosen: string;
  alt: string;
  text: string;
}

export interface StackLift {
  file: 'stack';
  head: LiftHead;
  decision: { verdict: string; rest: string[]; reasons: LeadItem[] } | null;
  layers: StackLayer[];
  alternatives: { kind: 'when' | 'whynot'; rows: StackAlternative[] } | null;
}

// ---------------------------------------------------------------------------------------------
// Features

export interface FeatureItem {
  group: string | null;
  name: string;
  why: string;
  complexity: ConfidenceLevel | null;
  notes: string | null;
}

export interface AntiFeatureItem {
  group: string | null;
  name: string;
  requested: string;
  problem: string;
  instead: string;
}

export interface FeatureCompetitors {
  rivals: string[];
  ours: string;
  rows: Array<{ feature: string; them: string[]; ours: string }>;
  note: string | null;
}

export interface FeaturesLift {
  file: 'features';
  head: LiftHead;
  expected: { lead: string | null; items: FeatureItem[] };
  differentiators: { lead: string | null; items: FeatureItem[] };
  anti: { lead: string | null; items: AntiFeatureItem[] };
  competitors: FeatureCompetitors | null;
}

// ---------------------------------------------------------------------------------------------
// Architecture

export interface AntiPattern {
  title: string;
  does: string | null;
  why: string | null;
  instead: string | null;
}

export interface BuildStep {
  id: string;
  name: string;
  deliverable: string;
  depends: string[];
  dependsText: string | null;
  notes: string | null;
}

export interface BuildOrder {
  note: string | null;
  grouping: string | null;
  steps: BuildStep[];
}

/** "Scaling Considerations" (or "Scalability"): the lead, the table as tiers × concerns, and the
 * numbered Scaling Priorities. A two-column table (Scale | Adjustments) lists one tier per row and
 * has a single concern, its second header; `byRow` marks that shape. */
export interface ScalingLift {
  lead: string | null;
  axis: string;
  byRow: boolean;
  tiers: string[];
  concerns: Array<{ name: string; cells: string[] }>;
  priorities: Array<{ label: string | null; text: string }>;
}

export interface ArchitectureLift {
  file: 'architecture';
  head: LiftHead;
  overview: string | null;
  components: number;
  structure: string | null;
  scaling: ScalingLift | null;
  antiPatterns: AntiPattern[];
  buildOrder: BuildOrder | null;
}

// ---------------------------------------------------------------------------------------------
// Pitfalls

export interface LevelText {
  level: string;
  text: string;
}

export interface LiftedPitfall {
  n: number;
  title: string;
  short: string | null;
  wrong: TextBlock[];
  why: TextBlock[];
  likely: LevelText | null;
  confidence: LevelText | null;
  avoid: string[];
  signs: string[];
  phase: string;
  mapPhase: string | null;
  verify: string | null;
}

export interface PitfallCheck {
  label: string | null;
  trap: string | null;
  check: string;
  pitfalls: number[];
}

export type PitfallTableKind = 'performance' | 'security' | 'ux';

/** One of the back tables (Performance Traps, Security Mistakes, UX Pitfalls): its lead paragraph,
 * header and rows, as written. */
export interface PitfallTable {
  kind: PitfallTableKind;
  lead: string | null;
  head: string[];
  rows: string[][];
}

export interface PitfallsLift {
  file: 'pitfalls';
  head: LiftHead;
  note: string | null;
  pitfalls: LiftedPitfall[];
  checks: PitfallCheck[];
  tables: PitfallTable[];
}

export type ProjectResearchLift = SummaryLift | StackLift | FeaturesLift | ArchitectureLift | PitfallsLift;

// ---------------------------------------------------------------------------------------------
// Shared primitives

function cap(text: string): string {
  return text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS - 1)}…` : text;
}

/** Strips emphasis and code marks, for length checks and plain-text comparisons. */
export function plainText(text: string): string {
  return text.replace(/\*\*|`/g, '');
}

function capitalise(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function clean(text: string | undefined): string {
  return cap((text ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim());
}

function boundedLines(body: string): string[] {
  const text = typeof body === 'string' ? body.slice(0, MAX_BODY_CHARS) : '';
  return text.split('\n').map((line) => {
    const trimmed = line.endsWith('\r') ? line.slice(0, -1) : line;
    return trimmed.length > MAX_LINE_CHARS ? trimmed.slice(0, MAX_LINE_CHARS) : trimmed;
  });
}

const FENCE_RE = /^\s{0,3}(```|~~~)/;
const HEADING_RE = /^(#{1,4})\s+(.+?)\s*#*\s*$/;

interface Section {
  depth: number;
  title: string;
  body: string[];
}

/** Every `#`..`####` heading outside a fenced block, with the lines up to the next heading. */
function readSections(lines: string[]): { sections: Section[] } {
  const sections: Section[] = [];
  let fence: string | null = null;
  for (const line of lines) {
    const fenceMatch = FENCE_RE.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1];
      else if (fence === fenceMatch[1]) fence = null;
    }
    const heading = fence === null && !fenceMatch ? HEADING_RE.exec(line) : null;
    if (heading) {
      if (sections.length >= MAX_SECTIONS) break;
      sections.push({ depth: heading[1].length, title: heading[2].trim(), body: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].body.push(line);
    }
  }
  return { sections };
}

/** A heading's role text: numbering ("1. "), emphasis and code marks dropped. */
function roleTitle(title: string): string {
  return plainText(title).replace(/^\d{1,2}[.)]\s*/, '').trim();
}

function findSection(sections: Section[], re: RegExp, minDepth = 2): { index: number; section: Section } | null {
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    if (section.depth >= minDepth && re.test(roleTitle(section.title))) return { index, section };
  }
  return null;
}

/** The sections nested under `sections[index]`: every following section that is deeper. */
function kidsOf(sections: Section[], index: number): Section[] {
  const kids: Section[] = [];
  const depth = sections[index].depth;
  for (let next = index + 1; next < sections.length && sections[next].depth > depth; next += 1) {
    kids.push(sections[next]);
  }
  return kids;
}

/** Paragraphs: lines joined by a space, split at a blank line or a `---` rule. */
function paragraphsOf(lines: string[]): string[] {
  const out: string[] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (current.length > 0) out.push(cap(current.join(' ')));
    current = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || /^-{3,}$/.test(trimmed)) flush();
    else current.push(trimmed);
    if (out.length >= MAX_ITEMS) break;
  }
  flush();
  return out.slice(0, MAX_ITEMS);
}

const BULLET_RE = /^\s{0,3}[-*]\s+(.*)$/;
const NUMBER_RE = /^\s{0,3}\d{1,3}[.)]\s+(.*)$/;

interface Block {
  kind: 'bullet' | 'number' | 'para';
  text: string;
}

/** Lines to blocks: a bullet or numbered line starts one, a paragraph runs to the next blank line,
 * and an indented line wraps the block above it. */
function readBlocks(lines: string[]): Block[] {
  const out: Block[] = [];
  let current: Block | null = null;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed === '' || /^-{3,}$/.test(trimmed)) {
      current = null;
      continue;
    }
    if (/^\s{2,}\S/.test(raw) && current) {
      current.text = cap(`${current.text} ${trimmed}`);
      continue;
    }
    const bullet = BULLET_RE.exec(raw);
    const number = bullet ? null : NUMBER_RE.exec(raw);
    if (bullet || number) {
      if (out.length >= MAX_ITEMS) break;
      current = { kind: bullet ? 'bullet' : 'number', text: cap((bullet ?? number)![1].replace(/^\[[ xX]\]\s*/, '').trim()) };
      out.push(current);
      continue;
    }
    if (current) {
      current.text = cap(`${current.text} ${trimmed}`);
    } else {
      if (out.length >= MAX_ITEMS) break;
      current = { kind: 'para', text: cap(trimmed) };
      out.push(current);
    }
  }
  return out;
}

const LEAD_RE = /^\*\*([^*]{1,300})\*\*:?\s*(.*)$/;

function leadItem(text: string): LeadItem {
  const match = LEAD_RE.exec(text);
  return match ? { lead: match[1].replace(/[:.]\s*$/, '').trim(), body: cap(match[2]) } : { lead: null, body: text };
}

/** Table cells of one `|` line: an escaped `\|` and a `|` inside backticks stay in the cell. */
function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  let tick = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\' && text[index + 1] === '|') {
      current += '|';
      index += 1;
    } else if (char === '`') {
      tick = !tick;
      current += char;
    } else if (char === '|' && !tick) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

interface Table {
  head: string[];
  rows: string[][];
  /** The index of the first line after the table. */
  end: number;
}

/** The first contiguous `|` table in `lines`, or null. */
function firstTable(lines: string[]): Table | null {
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith('|')) {
      start = index;
      break;
    }
  }
  if (start < 0) return null;
  const rows: string[][] = [];
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith('|')) {
    const line = lines[end];
    end += 1;
    if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line.trim())) continue;
    if (rows.length > MAX_ROWS) continue;
    rows.push(splitRow(line));
  }
  if (rows.length === 0) return null;
  return { head: rows[0], rows: rows.slice(1), end };
}

const LEVEL_RE = /\b(HIGH|MEDIUM-HIGH|MEDIUM-LOW|LOW-MEDIUM|MEDIUM|LOW)\b/;

export function normaliseLevel(raw: string | null | undefined): ConfidenceLevel | null {
  const match = LEVEL_RE.exec((raw ?? '').slice(0, MAX_LINE_CHARS).toUpperCase());
  if (!match) return null;
  return match[1] === 'MEDIUM-LOW' ? 'LOW-MEDIUM' : (match[1] as ConfidenceLevel);
}

/** The value of the first `**Label:** value` line whose label matches `label`, fences skipped. */
function fieldValue(lines: string[], label: RegExp): string | null {
  let fence: string | null = null;
  for (const line of lines) {
    const fenceMatch = FENCE_RE.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1];
      else if (fence === fenceMatch[1]) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const match = /^\*\*([^*]{1,60}?):\*\*\s*(.*)$/.exec(line.trim());
    if (match && label.test(match[1].trim()) && match[2].trim() !== '') return cap(match[2].trim());
  }
  return null;
}

/** The first fenced block's text under `lines`, or null. */
function firstFence(lines: string[]): string | null {
  let open: string | null = null;
  const collected: string[] = [];
  let size = 0;
  for (const line of lines) {
    const fenceMatch = FENCE_RE.exec(line);
    if (open === null) {
      if (fenceMatch) open = fenceMatch[1];
      continue;
    }
    if (fenceMatch && fenceMatch[1] === open) return collected.join('\n');
    size += line.length + 1;
    if (size > MAX_FIGURE_CHARS) return collected.join('\n');
    collected.push(line);
  }
  return open === null ? null : collected.join('\n');
}

function liftHead(lines: string[], sections: Section[]): LiftHead {
  const h1 = sections.find((section) => section.depth === 1);
  const text = fieldValue(lines, /^(?:overall )?confidence$/i);
  return {
    title: h1 ? plainText(h1.title) : null,
    project: fieldValue(lines, /^project$/i),
    domain: fieldValue(lines, /^domain$/i),
    researched: fieldValue(lines, /^researched$/i),
    confidence: { level: normaliseLevel(text), text },
  };
}

/** Splits `text` at top-level `;` (and, with `plus`, at `, plus ` / ` plus `), never inside
 * parentheses, backticks or double quotes. Each part is trimmed, loses a trailing period and is
 * capitalised. */
export function splitTopLevel(text: string, options: { plus?: boolean } = {}): string[] {
  const source = typeof text === 'string' ? text.slice(0, MAX_SPLIT_CHARS) : '';
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let tick = false;
  let quote = false;
  const plusRe = /,?\s+plus\s+/y;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '`') tick = !tick;
    else if (char === '"' && !tick) quote = !quote;
    else if (!tick && !quote && char === '(') depth += 1;
    else if (!tick && !quote && char === ')') depth = Math.max(0, depth - 1);
    const top = !tick && !quote && depth === 0;
    if (top && char === ';') {
      parts.push(current);
      current = '';
      continue;
    }
    if (top && options.plus && (char === ',' || char === ' ')) {
      plusRe.lastIndex = index;
      const match = plusRe.exec(source);
      if (match) {
        parts.push(current);
        current = '';
        index += match[0].length - 1;
        continue;
      }
    }
    current += char;
  }
  parts.push(current);
  return parts
    .map((part) => part.trim().replace(/\.$/, '').trim())
    .filter((part) => part !== '')
    .map(capitalise)
    .slice(0, MAX_ITEMS);
}

// ---------------------------------------------------------------------------------------------
// SUMMARY

const PHASE_HEADING_RE = /^Phase\s+(\w{1,6})\s*[:—–-]\s*(.{1,300})$/i;

/** `**Label:** value` fields, with bullets and wrapped lines under a label folded into it. */
function readFields(lines: string[]): Map<string, string[]> {
  const fields = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    const field = /^\*\*([^*]{1,60}?):\*\*\s*(.*)$/.exec(trimmed);
    if (field) {
      current = field[2] ? [field[2]] : [];
      fields.set(field[1].trim().toLowerCase(), current);
    } else if (current && /^\s*[-*]\s+/.test(line)) {
      if (current.length < MAX_ITEMS) current.push(line.replace(/^\s*[-*]\s+/, ''));
    } else if (current && trimmed !== '' && current.length > 0) {
      current[current.length - 1] = cap(`${current[current.length - 1]} ${trimmed}`);
    }
  }
  return fields;
}

function pickField(fields: Map<string, string[]>, ...names: string[]): string[] {
  for (const name of names) {
    const found = fields.get(name);
    if (found) return found;
  }
  return [];
}

function liftPhase(section: Section, match: RegExpExecArray): SummaryPhase {
  const fields = readFields(section.body);
  const text = section.body.join('\n').slice(0, MAX_SECTION_TEXT);
  const parallel =
    /\(parallel with Phase (\d{1,3})\)/i.exec(match[2]) ??
    /(?:parallel with|overlaps?(?: with)?)\s+Phase\s+(\d{1,3})/i.exec(text);
  const joined = (names: string[]): string | null => {
    const value = pickField(fields, ...names).join(' ').trim();
    return value === '' ? null : cap(value);
  };
  const avoids = new Set<number>();
  for (const found of pickField(fields, 'avoids').join(' ').match(/\d{1,3}/g) ?? []) avoids.add(Number(found));
  return {
    n: match[1],
    name: match[2].replace(/\s*\((parallel[^)]*)\)\s*$/i, '').trim(),
    rationale: cap(pickField(fields, 'rationale').join(' ')),
    delivers: pickField(fields, 'delivers').map(cap).slice(0, MAX_ITEMS),
    uses: joined(['uses']),
    implements: joined(['implements']),
    addresses: joined(['addresses']),
    keeps: joined(['keeps']),
    gate: joined(['gate', 'gates']),
    flag: joined(['research flags', 'research flag']),
    avoids: [...avoids].slice(0, MAX_ITEMS),
    parallelWith: parallel ? Number(parallel[1]) : null,
  };
}

const MAX_SECTION_TEXT = 100_000;

export function liftSummary(body: string): SummaryLift {
  const lines = boundedLines(body);
  const { sections } = readSections(lines);
  const exec = findSection(sections, /^Executive Summary/i);
  const implications = findSection(sections, /^Implications for Roadmap/i);
  const confidence = findSection(sections, /^Confidence Assessment/i);
  const findings = findSection(sections, /^Key Findings/i);

  const phases: SummaryPhase[] = [];
  let rationale: string[] = [];
  const flags: SummaryLift['flags'] = { needs: [], standard: [] };
  let preamble: string[] = [];
  if (implications) {
    preamble = paragraphsOf(implications.section.body);
    for (const kid of kidsOf(sections, implications.index)) {
      const phase = PHASE_HEADING_RE.exec(roleTitle(kid.title));
      if (phase) {
        if (phases.length < MAX_PHASES) phases.push(liftPhase(kid, phase));
      } else if (/Ordering Rationale/i.test(kid.title)) {
        rationale = readBlocks(kid.body)
          .filter((block) => block.kind !== 'para')
          .map((block) => {
            const item = leadItem(block.text);
            return item.lead ? `**${item.lead}** ${item.body}` : item.body;
          });
      } else if (/Research Flags/i.test(kid.title)) {
        let mode: 'needs' | 'standard' = 'needs';
        for (const line of kid.body) {
          if (/^\S.*(standard|skip)/i.test(line)) mode = 'standard';
          else if (/^\S.*(need|deeper)/i.test(line)) mode = 'needs';
          if (!/^\s*[-*]\s/.test(line)) continue;
          const item = leadItem(line.replace(/^\s*[-*]\s+/, ''));
          const phaseRef = /Phase\s+(\w{1,6})/i.exec(item.lead ?? item.body);
          if (flags[mode].length < MAX_ITEMS) flags[mode].push({ phase: phaseRef ? phaseRef[1] : null, lead: item.lead, body: item.body });
        }
      }
    }
  }

  const gapsSection = findSection(sections, /^Gaps to Address/i);
  const gaps = gapsSection ? readBlocks(gapsSection.section.body).filter((b) => b.kind !== 'para').map((b) => leadItem(b.text)) : [];

  const areas: ConfidenceArea[] = [];
  let overall: string | null = null;
  if (confidence) {
    const table = firstTable(confidence.section.body);
    for (const row of table?.rows ?? []) {
      if (!row[0]) continue;
      areas.push({ area: plainText(row[0]).trim(), level: normaliseLevel(row[1]), note: clean(row[2]) });
    }
    const joined = confidence.section.body.join('\n');
    const match = /\*\*Overall confidence:?\s*([^*]{0,300})\*\*:?\s*([^\n]{0,600})/i.exec(joined);
    if (match) overall = clean(`${match[1]} ${match[2]}`) || null;
  }

  const keyFindings: SummaryLift['keyFindings'] = {};
  if (findings) {
    for (const kid of kidsOf(sections, findings.index)) {
      const key: FindingKey | null = /stack/i.test(kid.title)
        ? 'stack'
        : /feature/i.test(kid.title)
          ? 'features'
          : /architect/i.test(kid.title)
            ? 'architecture'
            : /pitfall/i.test(kid.title)
              ? 'pitfalls'
              : null;
      if (!key || keyFindings[key]) continue;
      const lede = paragraphsOf(kid.body).find((p) => !/^\*\*[^*]+:\*\*$/.test(p) && !/^[-*\d]/.test(p));
      if (lede) keyFindings[key] = lede;
    }
  }

  return {
    file: 'summary',
    head: liftHead(lines, sections),
    exec: exec ? paragraphsOf(exec.section.body) : [],
    keyFindings,
    preamble,
    phases,
    rationale,
    flags,
    gaps,
    areas,
    overall,
  };
}

// ---------------------------------------------------------------------------------------------
// STACK

function columnIndex(head: string[], re: RegExp): number {
  return head.findIndex((cell) => re.test(cell));
}

function liftLayer(section: Section): StackLayer | null {
  const table = firstTable(section.body);
  if (!table || table.rows.length === 0) return null;
  const title = plainText(section.title);
  const split = /^(.{1,200}?)\s*\((.{1,400})\)\s*$/.exec(title);
  const versionCol = columnIndex(table.head, /version/i);
  const purposeCol = columnIndex(table.head, /purpose/i);
  const whyCol = columnIndex(table.head, /why|when|notes?|reason/i);
  const wider = table.rows.some((row) => row.length > table.head.length);
  const whyHead = table.head[table.head.length - 1] ?? '';
  const whyLabel = /when to use/i.test(whyHead) ? 'When to use' : /notes?/i.test(whyHead) ? 'Notes' : 'Why';
  const items: StackItem[] = table.rows.slice(0, MAX_ROWS).map((row) => {
    // A row wider than its header (Labelore's Development Tools: Tool | Purpose | Notes over name,
    // version, purpose, notes cells) reads positionally.
    const positional = versionCol < 0 && wider;
    const version = positional ? row[1] : versionCol >= 0 ? row[versionCol] : undefined;
    const purpose = positional ? row[2] : purposeCol >= 0 ? row[purposeCol] : row[1];
    const why = positional ? row[3] : whyCol >= 0 && whyCol !== purposeCol ? row[whyCol] : row[3];
    return {
      name: plainText(row[0] ?? '').trim(),
      version: version ? clean(version) : null,
      purpose: purpose ? clean(purpose) : null,
      why: why ? clean(why) : null,
    };
  });
  return {
    title: split ? split[1].trim() : title,
    note: split ? split[2].trim() : null,
    whyLabel,
    items: items.filter((item) => item.name !== ''),
  };
}

export function liftStack(body: string): StackLift {
  const lines = boundedLines(body);
  const { sections } = readSections(lines);

  let decision: StackLift['decision'] = null;
  const decided = findSection(sections, /^(The Decision|Headline)/i);
  if (decided) {
    const blocks = readBlocks(decided.section.body);
    const prose = blocks.filter((block) => block.kind !== 'number').map((block) => block.text);
    const head = prose[0] ?? '';
    const bold = /^\*\*(.+?)\*\*\s*$/.exec(head);
    const reasons = blocks
      .filter((block) => block.kind === 'number')
      .map((block) => leadItem(block.text));
    if (head !== '' || reasons.length > 0) {
      decision = { verdict: bold ? bold[1] : head, rest: prose.slice(1), reasons };
    }
  }

  const layers: StackLayer[] = [];
  const recommended = findSection(sections, /^Recommended Stack/i);
  if (recommended) {
    for (const kid of kidsOf(sections, recommended.index)) {
      const layer = liftLayer(kid);
      if (layer) layers.push(layer);
    }
  }

  let alternatives: StackLift['alternatives'] = null;
  const considered = findSection(sections, /^Alternatives Considered/i);
  const table = considered ? firstTable(considered.section.body) : null;
  if (table) {
    const head = table.head.map((cell) => cell.toLowerCase());
    const categoryCol = head.findIndex((cell) => /category/.test(cell));
    const chosenCol = head.findIndex((cell) => /recommended/.test(cell));
    const altCol = head.findIndex((cell) => /^alternative/.test(cell));
    const textCol = head.findIndex((_, index) => index !== categoryCol && index !== chosenCol && index !== altCol);
    alternatives = {
      kind: /why not/i.test(table.head[textCol] ?? '') ? 'whynot' : 'when',
      rows: table.rows.slice(0, MAX_ROWS).map((row) => ({
        category: categoryCol >= 0 && row[categoryCol] ? clean(row[categoryCol]) : null,
        chosen: clean(row[chosenCol >= 0 ? chosenCol : 0]),
        alt: clean(row[altCol >= 0 ? altCol : 1]),
        text: clean(row[textCol >= 0 ? textCol : 2]),
      })),
    };
  }

  return { file: 'stack', head: liftHead(lines, sections), decision, layers, alternatives };
}

// ---------------------------------------------------------------------------------------------
// FEATURES

interface KindRows {
  lead: string | null;
  rows: Array<{ group: string | null; cells: string[] }>;
}

/** The biggest section matching `re` (with its deeper subsections), as rows tagged with their group. */
function kindRows(sections: Section[], re: RegExp): KindRows {
  let best: KindRows = { lead: null, rows: [] };
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    if (section.depth < 2 || !re.test(roleTitle(section.title))) continue;
    const rows: KindRows['rows'] = [];
    const own = firstTable(section.body);
    for (const row of own?.rows ?? []) rows.push({ group: null, cells: row });
    for (const kid of kidsOf(sections, index)) {
      const table = firstTable(kid.body);
      const group = plainText(kid.title).replace(/\s*\(.*\)\s*$/, '').trim();
      for (const row of table?.rows ?? []) {
        if (rows.length < MAX_ROWS) rows.push({ group, cells: row });
      }
    }
    if (rows.length > best.rows.length) {
      const prose = paragraphsOf(section.body.filter((line) => !line.trim().startsWith('|')));
      best = { lead: prose.length > 0 ? prose.join(' ').slice(0, MAX_TEXT_CHARS) : null, rows: rows.slice(0, MAX_ROWS) };
    }
  }
  return best;
}

export function liftFeatures(body: string): FeaturesLift {
  const lines = boundedLines(body);
  const { sections } = readSections(lines);
  const feature = (row: KindRows['rows'][number]): FeatureItem => ({
    group: row.group && row.group !== '' ? row.group : null,
    name: clean(plainText(row.cells[0] ?? '')),
    why: clean(row.cells[1]),
    complexity: normaliseLevel(row.cells[2]),
    notes: clean(row.cells[3]) || null,
  });
  const stakes = kindRows(sections, /Table Stakes/i);
  const differentiators = kindRows(sections, /Differentiators/i);
  const anti = kindRows(sections, /Anti-Features/i);

  let competitors: FeatureCompetitors | null = null;
  const analysis = findSection(sections, /Competitor Feature Analysis/i);
  const table = analysis ? firstTable(analysis.section.body) : null;
  if (analysis && table && table.head.length >= 3) {
    const after = analysis.section.body.slice(table.end);
    const note = paragraphsOf(after).join(' ').trim();
    competitors = {
      rivals: table.head.slice(1, -1).map(clean).slice(0, MAX_RIVALS),
      ours: clean(table.head[table.head.length - 1]),
      rows: table.rows.map((row) => ({
        feature: clean(row[0]),
        them: row.slice(1, -1).map(clean).slice(0, MAX_RIVALS),
        ours: clean(row[row.length - 1]),
      })),
      note: note === '' ? null : cap(note),
    };
  }

  return {
    file: 'features',
    head: liftHead(lines, sections),
    expected: { lead: stakes.lead, items: stakes.rows.map(feature) },
    differentiators: { lead: differentiators.lead, items: differentiators.rows.map(feature) },
    anti: {
      lead: anti.lead,
      items: anti.rows.map((row) => ({
        group: row.group && row.group !== '' ? row.group : null,
        name: clean(plainText(row.cells[0] ?? '')),
        requested: clean(row.cells[1]),
        problem: clean(row.cells[2]),
        instead: clean(row.cells[3]),
      })),
    },
    competitors,
  };
}

// ---------------------------------------------------------------------------------------------
// ARCHITECTURE

function readLabelledFields(lines: string[]): Map<string, string> {
  const fields = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^-{3,}$/.test(trimmed)) {
      current = null;
      continue;
    }
    const field = /^\*\*([^*]{1,60}?):\*\*\s*(.*)$/.exec(trimmed);
    if (field) {
      current = [field[2]];
      fields.set(field[1].trim().toLowerCase(), current);
    } else if (current && trimmed !== '') {
      current.push(trimmed);
    }
  }
  const out = new Map<string, string>();
  for (const [key, value] of fields) {
    const text = clean(value.join(' '));
    if (text !== '') out.set(key, text);
  }
  return out;
}

function liftAntiPatterns(sections: Section[]): AntiPattern[] {
  const out: AntiPattern[] = [];
  for (const section of sections) {
    const match = /^Anti-Pattern\s+\d{1,3}:\s*(.+)$/i.exec(roleTitle(section.title));
    if (!match || out.length >= MAX_ITEMS) continue;
    const fields = readLabelledFields(section.body);
    const find = (re: RegExp): string | null => {
      for (const [key, value] of fields) if (re.test(key)) return value;
      return null;
    };
    out.push({
      title: match[1].trim(),
      does: find(/^what people do$/),
      why: find(/^why (?:it['’]s )?wrong$/),
      instead: find(/^(?:do this )?instead$/),
    });
  }
  return out;
}

function liftBuildOrder(sections: Section[]): BuildOrder | null {
  const found = findSection(sections, /^(?:Suggested|Recommended) Build Order/i);
  if (!found) return null;
  const { index, section: top } = found;
  const kids = kidsOf(sections, index);
  const table = firstTable(top.body);
  const afterFence = (() => {
    const text = top.body.join('\n');
    const last = text.lastIndexOf('```');
    return last >= 0 ? text.slice(last + 3) : text;
  })();
  const grouping = /\*\*Roadmap grouping suggestion:\*\*\s*([^\n]{1,1000})/.exec(afterFence)?.[1]?.trim() ?? null;
  const firstFenceAt = top.body.findIndex((line) => FENCE_RE.test(line));
  const noteLines = firstFenceAt >= 0 ? top.body.slice(0, firstFenceAt) : top.body.filter((line) => !line.trim().startsWith('|'));
  const note = paragraphsOf(noteLines).join(' ').trim();

  if (table && table.rows.length > 0) {
    const ascii = firstFence(top.body) ?? '';
    const short = new Map<string, string>();
    for (const m of ascii.matchAll(/\b([A-Z]\d{1,2})\s+([a-z][^─►┬┴├└│\n(]{0,80})/g)) short.set(m[1], m[2].trim());
    const steps: BuildStep[] = table.rows.slice(0, MAX_STEPS).map((row) => {
      const [id = '', deliverable = '', depends = '', notes = ''] = row.map((cell) => clean(cell));
      const ids = [...new Set(depends.match(/\b[A-Z]\d{1,2}\b/g) ?? [])];
      return {
        id,
        name: short.get(id) ?? deliverable.split(/[:,(]/)[0].trim(),
        deliverable,
        depends: ids,
        dependsText: /^none$/i.test(depends) || depends === '' ? null : depends,
        notes: notes === '' ? null : notes,
      };
    });
    const known = new Set(steps.map((step) => step.id));
    for (const step of steps) step.depends = step.depends.filter((dep) => known.has(dep) && dep !== step.id);
    return { note: note === '' ? null : note, grouping, steps: steps.filter((step) => step.id !== '') };
  }

  const steps: BuildStep[] = [];
  for (const kid of kids) {
    const match = /^Phase\s+([A-Z])\s*[—–-]\s*(.{1,200})$/i.exec(roleTitle(kid.title));
    if (!match || steps.length >= MAX_STEPS) continue;
    const text = kid.body.join(' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_CHARS);
    const deps = new Set<string>();
    for (const sentence of text.split(/(?<=\.)\s+/)) {
      if (!/depend|needs/i.test(sentence) || /depends on nothing/i.test(sentence)) continue;
      for (const range of sentence.matchAll(/Phases?\s+([A-Z])(?:\s*[–-]\s*([A-Z]))?/g)) {
        const from = range[1].charCodeAt(0);
        const to = (range[2] ?? range[1]).charCodeAt(0);
        for (let code = from; code <= to && code - from < 26; code += 1) deps.add(String.fromCharCode(code));
      }
    }
    const id = match[1].toUpperCase();
    deps.delete(id);
    const plans = /\*\*(~[^*]{1,80}?plans?)[:.]?\*\*/.exec(text)?.[1] ?? null;
    steps.push({
      id,
      name: match[2].trim(),
      deliverable: (text.split(/(?<=\.)\s+/)[0] ?? '').replace(/\s*\*\*Why this order.*$/, ''),
      depends: [...deps],
      dependsText: null,
      notes: plans,
    });
  }
  const known = new Set(steps.map((step) => step.id));
  for (const step of steps) step.depends = step.depends.filter((dep) => known.has(dep) && dep !== step.id);
  const allText = [top, ...kids].map((s) => s.body.join('\n')).join('\n').slice(0, MAX_SECTION_TEXT);
  const why = /\*\*Why this order, restated:\*\*\s*([^\n]{1,2000})/.exec(allText)?.[1]?.trim() ?? null;
  return { note: why, grouping: null, steps };
}

function liftScaling(sections: Section[]): ScalingLift | null {
  const found = findSection(sections, /^Scal(?:ing|ability) Considerations/i);
  if (!found) return null;
  const { index, section } = found;
  const table = firstTable(section.body);
  const firstRow = section.body.findIndex((line) => line.trim().startsWith('|'));
  const lead = paragraphsOf(firstRow >= 0 ? section.body.slice(0, firstRow) : section.body)[0] ?? null;

  let tiers: string[] = [];
  let concerns: ScalingLift['concerns'] = [];
  const byRow = table !== null && table.head.length === 2;
  if (table && byRow) {
    tiers = table.rows.map((row) => clean(row[0]));
    concerns = [{ name: clean(table.head[1]), cells: table.rows.map((row) => clean(row[1])) }];
  } else if (table && table.head.length > 2) {
    tiers = table.head.slice(1).map((cell) => clean(cell));
    concerns = table.rows.map((row) => ({ name: clean(row[0]), cells: tiers.map((_, at) => clean(row[at + 1])) }));
  }

  const priorities: ScalingLift['priorities'] = [];
  const prioritiesAt = kidsOf(sections, index).find((kid) => /Scaling Priorities/i.test(roleTitle(kid.title)));
  for (const block of prioritiesAt ? readBlocks(prioritiesAt.body) : []) {
    if (block.kind !== 'number') continue;
    const { lead: label, body } = leadItem(block.text);
    priorities.push({ label, text: body });
  }

  if (tiers.length === 0 && priorities.length === 0) return null;
  return { lead, axis: table ? clean(table.head[0]) : '', byRow, tiers, concerns, priorities };
}

export function liftArchitecture(body: string): ArchitectureLift {
  const lines = boundedLines(body);
  const { sections } = readSections(lines);

  let overview: string | null = null;
  const overviewAt = findSection(sections, /^System Overview/i);
  if (overviewAt) {
    overview = firstFence(overviewAt.section.body);
    if (overview === null) {
      for (const kid of kidsOf(sections, overviewAt.index)) {
        overview = firstFence(kid.body);
        if (overview !== null) break;
      }
    }
  }

  let components = 0;
  for (let index = 0; index < sections.length; index += 1) {
    if (sections[index].depth < 2 || !/Component Responsibilities/i.test(roleTitle(sections[index].title))) continue;
    let rows = firstTable(sections[index].body)?.rows.length ?? 0;
    for (const kid of kidsOf(sections, index)) rows += firstTable(kid.body)?.rows.length ?? 0;
    components = Math.max(components, rows);
  }

  const structureAt = findSection(sections, /Recommended Project Structure/i);
  const structure = structureAt ? firstFence(structureAt.section.body) : null;

  return {
    file: 'architecture',
    head: liftHead(lines, sections),
    overview,
    components,
    structure,
    scaling: liftScaling(sections),
    antiPatterns: liftAntiPatterns(sections),
    buildOrder: liftBuildOrder(sections),
  };
}

// ---------------------------------------------------------------------------------------------
// PITFALLS

const PITFALL_LEVEL_RE = /^(very high|medium-high|medium-low|low-medium|high|medium|low)\b/i;

function levelText(text: string, re: RegExp): LevelText | null {
  const match = re.exec(text);
  if (!match) return null;
  return { level: match[1].replace(/^./, (c) => c.toUpperCase()), text: text.slice(match[0].length).replace(/^[\s.,:—–-]+/, '') };
}

function blocksOf(lines: string[]): TextBlock[] {
  return readBlocks(lines).map((block) => ({ bullet: block.kind !== 'para', text: block.text }));
}

function liftPitfall(section: Section, match: RegExpExecArray): LiftedPitfall {
  const fields = new Map<string, string[]>();
  let key: string | null = null;
  for (const line of section.body) {
    const field = /^\*\*([^*]{1,80}?):\*\*\s*(.*)$/.exec(line.trim());
    if (field) {
      key = field[1].trim().toLowerCase();
      fields.set(key, field[2] ? [field[2]] : []);
    } else if (key) {
      fields.get(key)?.push(line);
    }
  }
  const get = (re: RegExp): TextBlock[] => {
    for (const [name, value] of fields) if (re.test(name)) return blocksOf(value);
    return [];
  };
  const textOf = (blocks: TextBlock[]): string => blocks.map((block) => block.text).join(' ');
  const likely = levelText(textOf(get(/how likely/)), PITFALL_LEVEL_RE);
  const confidence = levelText(textOf(get(/^confidence/)), /^(HIGH|MEDIUM-HIGH|MEDIUM-LOW|LOW-MEDIUM|MEDIUM|LOW)\b/);
  const signBlocks = get(/warning signs/);
  let signs = signBlocks.some((block) => block.bullet)
    ? signBlocks.filter((block) => block.bullet).map((block) => block.text)
    : splitTopLevel(textOf(signBlocks));
  // One bullet of several short sentences is several signs.
  if (signs.length === 1) {
    const sentences = signs[0].split(/(?<=\.)\s+(?=[A-Z])/);
    if (sentences.length > 1 && sentences.every((sentence) => sentence.length < 140)) signs = sentences;
  }
  return {
    n: Number(match[1]),
    title: match[2].trim(),
    short: null,
    wrong: get(/what goes wrong/),
    why: get(/why it happens/),
    likely,
    confidence,
    avoid: get(/how to avoid/).map((block) => block.text),
    signs: signs.map((sign) => sign.replace(/\.$/, '')).slice(0, MAX_ITEMS),
    phase: textOf(get(/phase to address/)),
    mapPhase: null,
    verify: null,
  };
}

const PITFALL_TABLES: ReadonlyArray<[PitfallTableKind, RegExp]> = [
  ['performance', /^Performance Traps/i],
  ['security', /^Security Mistakes/i],
  ['ux', /^UX Pitfalls/i],
];

function liftPitfallTables(sections: Section[]): PitfallTable[] {
  const out: PitfallTable[] = [];
  for (const [kind, re] of PITFALL_TABLES) {
    const found = findSection(sections, re);
    const table = found ? firstTable(found.section.body) : null;
    if (!found || !table) continue;
    const rows = table.rows.map((row) => row.map((cell) => clean(cell))).filter((row) => row[0] !== '');
    if (rows.length === 0) continue;
    const firstRow = found.section.body.findIndex((line) => line.trim().startsWith('|'));
    const lead = paragraphsOf(found.section.body.slice(0, firstRow))[0] ?? null;
    out.push({ kind, lead, head: table.head.map((cell) => clean(cell)), rows });
  }
  return out;
}

export function liftPitfalls(body: string): PitfallsLift {
  const lines = boundedLines(body);
  const { sections } = readSections(lines);

  const pitfalls: LiftedPitfall[] = [];
  for (const section of sections) {
    const match = /^Pitfall\s+(\d{1,3}):\s*(.+)$/i.exec(roleTitle(section.title));
    if (match && pitfalls.length < MAX_PITFALLS) pitfalls.push(liftPitfall(section, match));
  }

  const mapping = findSection(sections, /Pitfall-to-Phase/i);
  const table = mapping ? firstTable(mapping.section.body) : null;
  for (const row of table?.rows ?? []) {
    const m = /^(?:Pitfall\s+)?(\d{1,3})[.):]?\s+(.+)$/i.exec(plainText(row[0] ?? ''));
    const pitfall = m ? pitfalls.find((candidate) => candidate.n === Number(m[1])) : undefined;
    if (!m || !pitfall) continue;
    pitfall.short = clean(m[2]);
    pitfall.mapPhase = row[1] ? clean(row[1]) : null;
    pitfall.verify = row[2] ? clean(row[2]) : null;
  }

  const checks: PitfallCheck[] = [];
  const done = findSection(sections, /Looks Done/i);
  for (const line of done?.section.body ?? []) {
    if (!/^\s*-\s*\[[ xX]\]/.test(line) || checks.length >= MAX_ITEMS) continue;
    let text = line.replace(/^\s*-\s*\[[ xX]\]\s*/, '');
    const labelled = /^\*\*([^*]{1,200}?):?\*\*:?\s*(.*)$/.exec(text);
    const label = labelled ? labelled[1].replace(/:$/, '') : null;
    text = labelled ? labelled[2] : text;
    const refs = [...text.matchAll(/\(Pitfall (\d{1,3})\)/g)].map((m) => Number(m[1]));
    text = text.replace(/\s*\(Pitfall \d{1,3}\)/g, '').trim();
    const often = /^often (.{1,600}?)\s+-\s+(verify .{1,600})$/i.exec(text);
    checks.push({
      label,
      trap: often ? often[1] : null,
      check: capitalise(often ? often[2] : text),
      pitfalls: refs,
    });
  }

  const critical = findSection(sections, /^Critical Pitfalls/i);
  const note = critical ? (blocksOf(critical.section.body)[0]?.text ?? null) : null;

  return { file: 'pitfalls', head: liftHead(lines, sections), note, pitfalls, checks, tables: liftPitfallTables(sections) };
}

// ---------------------------------------------------------------------------------------------

/** Lifts one research file by key. Never throws: the caller treats a thrown lift as absent. */
export function extractProjectResearch(file: ResearchFileKey, body: string): ProjectResearchLift {
  switch (file) {
    case 'summary':
      return liftSummary(body);
    case 'stack':
      return liftStack(body);
    case 'features':
      return liftFeatures(body);
    case 'architecture':
      return liftArchitecture(body);
    case 'pitfalls':
      return liftPitfalls(body);
  }
}
