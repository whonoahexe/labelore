// The report lifts (Phase 11, 11-20, VIEW-18, D-03, RESEARCH C10). `reports/` holds two writers' files: the
// session report (`SESSION_REPORT.md`, `{YYYYMMDD}-session-report.md`) and the milestone summary
// (`MILESTONE_SUMMARY-v{version}.md`). `forensics/` holds `/gsd-forensics` reports. This module turns each into
// the projection the report and forensics pages compose from. It never writes and never throws on author text
// it can read around; the handlers still guard the call, so a throw only omits the structured key.
//
// Rules every function here follows.
//   * The variant of a `reports/` file is decided by its file name alone: `MILESTONE_SUMMARY-v*` is a milestone
//     summary, everything else is a session report.
//   * A headline number is kept as written text (C10, adopted at the 11-01 checkpoint): `~5 hours (first
//     commit ...)`, `3 (01-04, 01-05, 01-06)`. A line that is absent gives null, never 0 and never a guess.
//   * Lists keep the author's words and order. The one reorder is the forensics anomaly list, HIGH then MEDIUM
//     then LOW then any other word (stable inside each group), which is the page's promise (UI-SPEC section 6).
//   * A file with none of the known headings gives null, so the handler leaves `structured` empty and the page
//     falls back to the plain document.
//   * Tables are read by a local cell splitter that keeps header order and never keys an object by author text.
//     Lists are capped at REPORT_ROW_CAP, strings at LIFT_TEXT_CAP, and every scan is one linear pass over a
//     capped body (T-11-32).
import { eachLineOutsideFences, scanFencedLines, splitBodyLines } from './fenced-sections.ts';
import type { FencedSection } from './fenced-sections.ts';
import {
  LIFT_LIST_CAP,
  boldLabelLine,
  capText,
  findSection,
  firstH1,
  listItemText,
  listItems,
  sectionLines,
} from './seed-thread-lift.ts';

/** The most table rows any one lift keeps. */
export const REPORT_ROW_CAP = 500;
/** The most artifact grid cells kept. */
export const FORENSICS_GRID_CAP = 1000;

// ---------------------------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------------------------

export interface SessionReportLift {
  variant: 'session';
  title: string | null;
  generated: string | null;
  project: string | null;
  milestone: string | null;
  /** The bold-label head lines of Session Summary, as written. */
  duration: string | null;
  phaseProgress: string | null;
  plansExecuted: string | null;
  commitsMade: string | null;
  /** Phases Touched bullets as written. */
  phases: string[];
  outcomes: string[];
  /** Decisions Made bullets; [] when the section is prose or absent. */
  decisions: string[];
  /** The Decisions Made prose when the section holds no bullets (the writer states none were added). */
  decisionsNote: string | null;
  filesChanged: { summary: string | null; items: string[] };
  /** Blockers & Open Items bullets; a bullet that only says there are none reads as no blocker. */
  blockers: string[];
  resources: { metric: string; estimate: string }[];
}

export interface MilestoneStat {
  label: string | null;
  value: string;
}

export interface MilestonePhaseRow {
  phase: string;
  name: string;
  /** The status cell as written, a date folded in (`Complete (2026-01-30)`). */
  status: string;
  oneLiner: string;
}

export interface MilestoneRequirementRow {
  /** true for a check mark, false for a cross mark, null for any other lead. */
  covered: boolean | null;
  category: string;
  /** The ids as written (`MEMB-01 ... MEMB-05`). */
  ids: string;
  /** The parenthetical that ends the line (`Phase 1`), else null. */
  phase: string | null;
}

export interface MilestoneDecisionRow {
  /** Repeats across phases: key a row by phase plus id. */
  id: string;
  phase: string;
  decision: string;
  rationale: string;
}

export interface MilestoneReportLift {
  variant: 'milestone';
  title: string | null;
  /** The version without its leading `v`: `1.0`. */
  version: string | null;
  generated: string | null;
  purpose: string | null;
  /** The numbered `##` sections in file order. The unnumbered Stats section is not one of them. */
  sections: { number: number; heading: string }[];
  stats: MilestoneStat[];
  phases: MilestonePhaseRow[];
  requirements: { rows: MilestoneRequirementRow[]; auditVerdict: string | null };
  decisions: MilestoneDecisionRow[];
}

export type ReportLift = SessionReportLift | MilestoneReportLift;

export interface ForensicsAnomaly {
  /** The heading text before `Confidence:`, trailing dash dropped. */
  type: string;
  /** HIGH, MEDIUM or LOW (upper-cased when written in another case); any other word verbatim; null when the heading has none. */
  confidence: string | null;
  evidence: string | null;
  interpretation: string | null;
}

export interface ForensicsEvidenceBlock {
  heading: string;
  /** The subsection's list items as written. */
  items: string[];
}

export interface ForensicsGridCell {
  phase: string;
  artifact: string;
  /** true for a check mark, false for a cross mark, null for any other cell. */
  present: boolean | null;
  /** The cell as written (`✅ (6/6)`, `❌`), so a parenthetical the page wants is never lost. */
  cell: string;
}

export interface ForensicsLift {
  title: string | null;
  generated: string | null;
  problem: string | null;
  evidence: ForensicsEvidenceBlock[];
  /** Ordered HIGH, MEDIUM, LOW, then any other word; stable inside a group. */
  anomalies: ForensicsAnomaly[];
  /** The writer's sentence under Anomalies Detected when it lists none (`No anomalies detected.`). */
  anomaliesNote: string | null;
  hypothesis: string | null;
  /** Recommended Actions in the author's order, markers dropped. */
  actions: string[];
  grid: ForensicsGridCell[];
}

// ---------------------------------------------------------------------------------------------------------
// Small readers
// ---------------------------------------------------------------------------------------------------------

function baseName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

const MILESTONE_PREFIX = 'milestone_summary-v';

/** The version a `MILESTONE_SUMMARY-v{version}.md` file name carries, else null. */
function versionFromFileName(fileName: string): string | null {
  const name = baseName(fileName);
  if (!name.toLowerCase().startsWith(MILESTONE_PREFIX)) return null;
  let rest = name.slice(MILESTONE_PREFIX.length);
  if (rest.toLowerCase().endsWith('.md')) rest = rest.slice(0, -3);
  return rest === '' ? null : rest;
}

export function isMilestoneSummaryName(fileName: string): boolean {
  return baseName(fileName).toLowerCase().startsWith(MILESTONE_PREFIX);
}

/** The first value of each wanted bold-label line over `lines` in [from, to), keyed by lower-cased label. */
function labelValues(lines: readonly string[], ranges: readonly [number, number][], wanted: ReadonlySet<string>): Map<string, string> {
  const found = new Map<string, string>();
  for (const [from, to] of ranges) {
    eachLineOutsideFences(lines, from, to, (line) => {
      const labelled = boldLabelLine(line);
      if (labelled === null) return;
      const key = labelled.label.toLowerCase();
      if (wanted.has(key) && !found.has(key) && labelled.value !== '') found.set(key, labelled.value);
    });
  }
  return found;
}

/** The index of the first H2 line, or the line count: the end of the head block. */
function headEnd(lines: readonly string[], sections: readonly FencedSection[]): number {
  const first = sections.find((section) => section.level === 2);
  return first === undefined ? lines.length : first.startLine;
}

/** A GFM pipe table over `lines`: header cells and data rows, separator dropped. Empty when there is no table. */
interface PipeTable {
  headers: string[];
  rows: string[][];
}

function cellsOf(line: string): string[] {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|')) text = text.slice(0, -1);
  return text.split('|').map((cell) => cell.trim());
}

function pipeTable(lines: readonly string[]): PipeTable {
  const tableLines: string[] = [];
  eachLineOutsideFences(lines, 0, lines.length, (line) => {
    if (line.trim().startsWith('|') && tableLines.length <= REPORT_ROW_CAP + 2) tableLines.push(line);
  });
  if (tableLines.length < 2) return { headers: [], rows: [] };
  return { headers: cellsOf(tableLines[0]), rows: tableLines.slice(2).map(cellsOf) };
}

/** The column index of the first header whose lower-cased text is one of `names`, else -1. */
function columnOf(headers: readonly string[], ...names: string[]): number {
  for (let i = 0; i < headers.length; i += 1) {
    if (names.includes(headers[i].toLowerCase())) return i;
  }
  return -1;
}

function cellAt(row: readonly string[], index: number): string {
  return index >= 0 && index < row.length ? capText(row[index], 1000) : '';
}

/** Non-blank paragraph text of a block, fences kept out; '' when none. */
function paragraphText(lines: readonly string[]): string {
  const kept: string[] = [];
  eachLineOutsideFences(lines, 0, lines.length, (line) => {
    kept.push(line);
  });
  return capText(kept.join('\n').trim());
}

/** The non-list prose of a block, trimmed; '' when none. */
function proseOnly(lines: readonly string[]): string {
  const kept: string[] = [];
  eachLineOutsideFences(lines, 0, lines.length, (line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (kept.length > 0 && kept[kept.length - 1] !== '') kept.push('');
      return;
    }
    if (listItemText(trimmed) === null) kept.push(trimmed);
  });
  return capText(kept.join('\n').trim());
}

const NONE_BULLETS: ReadonlySet<string> = new Set([
  'none',
  'none blocking',
  'no blockers',
  'no open items',
  'no blockers or open items',
  'nothing blocking',
  'n/a',
]);

/** A bullet that only says there is nothing to report (`None blocking.`). */
function isNoneBullet(text: string): boolean {
  let lower = text.trim().toLowerCase();
  while (lower.endsWith('.') || lower.endsWith('!')) lower = lower.slice(0, -1).trim();
  return NONE_BULLETS.has(lower);
}

function sectionRange(section: FencedSection | undefined): [number, number][] {
  return section === undefined ? [] : [[section.startLine + 1, section.endLine]];
}

// ---------------------------------------------------------------------------------------------------------
// Session report
// ---------------------------------------------------------------------------------------------------------

const SESSION_LABELS: ReadonlySet<string> = new Set([
  'generated',
  'project',
  'milestone',
  'duration',
  'phase progress',
  'plans executed',
  'commits made',
]);

const SESSION_HEADINGS: ReadonlySet<string> = new Set([
  'session summary',
  'work performed',
  'phases touched',
  'key outcomes',
  'decisions made',
  'files changed',
  'estimated resource usage',
]);

function hasSessionHeading(sections: readonly FencedSection[]): boolean {
  return sections.some((section) => {
    const lower = section.heading.trim().toLowerCase();
    return SESSION_HEADINGS.has(lower) || lower.startsWith('blockers');
  });
}

function extractSession(lines: readonly string[], sections: readonly FencedSection[]): SessionReportLift | null {
  if (!hasSessionHeading(sections)) return null;
  const any = (name: string) => findSection(sections, 3, (h) => h === name) ?? findSection(sections, 2, (h) => h === name);

  const summary = findSection(sections, 2, (h) => h === 'session summary');
  const ranges: [number, number][] = [[0, headEnd(lines, sections)], ...sectionRange(summary)];
  const labels = labelValues(lines, ranges, SESSION_LABELS);

  const phases = any('phases touched');
  const outcomes = any('key outcomes');
  const decisions = any('decisions made');
  const files = findSection(sections, 2, (h) => h === 'files changed');
  const blockers = findSection(sections, 2, (h) => h.startsWith('blockers'));
  const resources = findSection(sections, 2, (h) => h === 'estimated resource usage');

  const decisionLines = decisions === undefined ? [] : sectionLines(lines, decisions);
  const decisionItems = listItems(decisionLines);
  const decisionProse = decisionItems.length === 0 ? proseOnly(decisionLines) : '';

  const fileLines = files === undefined ? [] : sectionLines(lines, files);
  const fileSummary = proseOnly(fileLines);

  const table = resources === undefined ? { headers: [], rows: [] } : pipeTable(sectionLines(lines, resources));
  const metricCol = columnOf(table.headers, 'metric');
  const estimateCol = columnOf(table.headers, 'estimate');

  return {
    variant: 'session',
    title: firstH1(lines),
    generated: labels.get('generated') ?? null,
    project: labels.get('project') ?? null,
    milestone: labels.get('milestone') ?? null,
    duration: labels.get('duration') ?? null,
    phaseProgress: labels.get('phase progress') ?? null,
    plansExecuted: labels.get('plans executed') ?? null,
    commitsMade: labels.get('commits made') ?? null,
    phases: phases === undefined ? [] : listItems(sectionLines(lines, phases)),
    outcomes: outcomes === undefined ? [] : listItems(sectionLines(lines, outcomes)),
    decisions: decisionItems,
    decisionsNote: decisionProse === '' ? null : decisionProse,
    filesChanged: { summary: fileSummary === '' ? null : fileSummary, items: listItems(fileLines) },
    blockers: blockers === undefined ? [] : listItems(sectionLines(lines, blockers)).filter((item) => !isNoneBullet(item)),
    resources: table.rows
      .map((row) => ({ metric: cellAt(row, metricCol), estimate: cellAt(row, estimateCol) }))
      .filter((row) => row.metric !== '' || row.estimate !== ''),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Milestone summary
// ---------------------------------------------------------------------------------------------------------

/** `3. Phases Delivered` gives { number: 3, name: 'Phases Delivered' }; any other heading gives null. */
function numberedHeading(heading: string): { number: number; name: string } | null {
  let i = 0;
  while (i < heading.length && i < 4 && heading.charCodeAt(i) >= 48 && heading.charCodeAt(i) <= 57) i += 1;
  if (i === 0 || heading[i] !== '.') return null;
  const name = heading.slice(i + 1).trim();
  return name === '' ? null : { number: Number(heading.slice(0, i)), name };
}

function versionFromTitle(title: string | null): string | null {
  if (title === null) return null;
  const lower = title.toLowerCase();
  if (!lower.startsWith('milestone')) return null;
  const rest = title.slice('milestone'.length).trim();
  let end = 0;
  while (end < rest.length && rest[end] !== ' ' && rest[end] !== '\t') end += 1;
  let token = rest.slice(0, end);
  if (token.startsWith('v') || token.startsWith('V')) token = token.slice(1);
  return token === '' ? null : token;
}

function readMark(item: string): { covered: boolean | null; rest: string } {
  const first = item.codePointAt(0) ?? 0;
  if (first <= 127) return { covered: null, rest: item };
  // The lead run up to the first space is the mark (a check or cross, perhaps with a variation selector).
  let end = 0;
  while (end < item.length && item[end] !== ' ') end += 1;
  const mark = item.slice(0, end);
  const rest = item.slice(end).trim();
  if (mark.startsWith('✅') || mark.startsWith('✓') || mark.startsWith('✔')) return { covered: true, rest };
  if (mark.startsWith('❌') || mark.startsWith('✗') || mark.startsWith('✘') || mark.startsWith('✖')) return { covered: false, rest };
  return { covered: null, rest };
}

function readRequirement(item: string): MilestoneRequirementRow | null {
  const { covered, rest } = readMark(item);
  let category = '';
  let tail = rest;
  if (tail.startsWith('**')) {
    const close = tail.indexOf('**', 2);
    if (close > 2) {
      category = tail.slice(2, close).trim();
      tail = tail.slice(close + 2).trim();
    }
  }
  let k = 0;
  while (k < tail.length && (tail[k] === '-' || tail[k] === '–' || tail[k] === '—' || tail[k] === ':' || tail[k] === ' ')) k += 1;
  tail = tail.slice(k).trim();
  let phase: string | null = null;
  if (tail.endsWith(')')) {
    const open = tail.lastIndexOf('(');
    if (open >= 0) {
      phase = tail.slice(open + 1, -1).trim() || null;
      tail = tail.slice(0, open).trim();
    }
  }
  if (category === '' && tail === '') return null;
  return { covered, category: capText(category, 300), ids: capText(tail, 500), phase };
}

function extractMilestone(fileName: string, lines: readonly string[], sections: readonly FencedSection[]): MilestoneReportLift | null {
  const numbered: { number: number; heading: string; section: FencedSection; name: string }[] = [];
  for (const section of sections) {
    if (section.level !== 2) continue;
    const parsed = numberedHeading(section.heading.trim());
    if (parsed !== null && numbered.length < LIFT_LIST_CAP) numbered.push({ number: parsed.number, heading: parsed.name, section, name: parsed.name.toLowerCase() });
  }
  const stats = findSection(sections, 2, (h) => h === 'stats');
  if (numbered.length === 0 && stats === undefined) return null;

  const title = firstH1(lines);
  const head = labelValues(lines, [[0, headEnd(lines, sections)]], new Set(['generated', 'purpose']));

  const named = (needle: string) => numbered.find((entry) => entry.name.includes(needle))?.section;

  const phaseSection = named('phases delivered');
  const phaseTable = phaseSection === undefined ? { headers: [], rows: [] } : pipeTable(sectionLines(lines, phaseSection));
  const pCol = columnOf(phaseTable.headers, 'phase', '#');
  const nCol = columnOf(phaseTable.headers, 'name');
  const sCol = columnOf(phaseTable.headers, 'status');
  const oCol = columnOf(phaseTable.headers, 'one-liner', 'one liner', 'oneliner', 'summary');

  const decisionSection = named('key decisions');
  const decisionTable = decisionSection === undefined ? { headers: [], rows: [] } : pipeTable(sectionLines(lines, decisionSection));
  const iCol = columnOf(decisionTable.headers, 'id');
  const dpCol = columnOf(decisionTable.headers, 'phase');
  const dCol = columnOf(decisionTable.headers, 'decision');
  const rCol = columnOf(decisionTable.headers, 'rationale', 'why');

  const requirementSection = named('requirements');
  const requirementLines = requirementSection === undefined ? [] : sectionLines(lines, requirementSection);
  const requirementRows: MilestoneRequirementRow[] = [];
  let auditVerdict: string | null = null;
  eachLineOutsideFences(requirementLines, 0, requirementLines.length, (line) => {
    const labelled = boldLabelLine(line);
    if (labelled !== null && labelled.label.toLowerCase() === 'audit verdict') {
      if (auditVerdict === null && labelled.value !== '') auditVerdict = labelled.value;
    }
  });
  for (const item of listItems(requirementLines)) {
    if (requirementRows.length >= LIFT_LIST_CAP) break;
    const row = readRequirement(item);
    if (row !== null) requirementRows.push(row);
  }

  const statItems = stats === undefined ? [] : listItems(sectionLines(lines, stats));

  return {
    variant: 'milestone',
    title,
    version: versionFromTitle(title) ?? versionFromFileName(fileName),
    generated: head.get('generated') ?? null,
    purpose: head.get('purpose') ?? null,
    sections: numbered.map((entry) => ({ number: entry.number, heading: capText(entry.heading, 300) })),
    stats: statItems.map((item) => {
      const labelled = boldLabelLine(item);
      return labelled === null ? { label: null, value: item } : { label: labelled.label, value: labelled.value };
    }),
    phases: phaseTable.rows.map((row) => ({
      phase: cellAt(row, pCol),
      name: cellAt(row, nCol),
      status: cellAt(row, sCol),
      oneLiner: cellAt(row, oCol),
    })),
    requirements: { rows: requirementRows, auditVerdict },
    decisions: decisionTable.rows.slice(0, REPORT_ROW_CAP).map((row) => ({
      id: cellAt(row, iCol),
      phase: cellAt(row, dpCol),
      decision: cellAt(row, dCol),
      rationale: cellAt(row, rCol),
    })),
  };
}

/**
 * The projection of one `reports/` file. The variant comes from the file name alone. null when the body holds
 * none of that variant's known headings, so the page falls back to the plain document.
 */
export function extractReport(fileName: string, _frontmatter: Record<string, unknown>, body: string): ReportLift | null {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines);
  return isMilestoneSummaryName(fileName) ? extractMilestone(fileName, lines, sections) : extractSession(lines, sections);
}

// ---------------------------------------------------------------------------------------------------------
// Forensics
// ---------------------------------------------------------------------------------------------------------

const CONFIDENCE_RANK: ReadonlyMap<string, number> = new Map([
  ['HIGH', 0],
  ['MEDIUM', 1],
  ['LOW', 2],
]);

const HYPOTHESIS_LEAD = 'based on the evidence above, the most likely explanation is:';

function isDashChar(ch: string): boolean {
  return ch === '-' || ch === '–' || ch === '—' || ch === ':' || ch === ' ';
}

/** `### {type} — Confidence: {X}`: the type and the confidence word as written. */
function splitAnomalyHeading(heading: string): { type: string; confidence: string | null } {
  const lower = heading.toLowerCase();
  const at = lower.indexOf('confidence:');
  if (at < 0) return { type: capText(heading.trim(), 500), confidence: null };
  let type = heading.slice(0, at);
  let end = type.length;
  while (end > 0 && isDashChar(type[end - 1])) end -= 1;
  type = type.slice(0, end).trim();
  const word = heading.slice(at + 'confidence:'.length).trim();
  const upper = word.toUpperCase();
  return {
    type: capText(type === '' ? heading.trim() : type, 500),
    confidence: word === '' ? null : CONFIDENCE_RANK.has(upper) ? upper : capText(word, 100),
  };
}

function readAnomaly(lines: readonly string[], section: FencedSection): ForensicsAnomaly {
  const { type, confidence } = splitAnomalyHeading(section.heading.trim());
  const blocks = new Map<string, string[]>();
  let current: string[] | null = null;
  eachLineOutsideFences(lines, section.startLine + 1, section.endLine, (line) => {
    const labelled = boldLabelLine(line);
    if (labelled !== null) {
      const key = labelled.label.toLowerCase();
      if (key === 'evidence' || key === 'interpretation') {
        current = blocks.get(key) ?? [];
        blocks.set(key, current);
        if (labelled.value !== '') current.push(labelled.value);
        return;
      }
      current = null;
      return;
    }
    if (current !== null) (current as string[]).push(line);
  });
  const text = (key: string): string | null => {
    const block = blocks.get(key);
    if (block === undefined) return null;
    const joined = capText(block.join('\n').trim());
    return joined === '' ? null : joined;
  };
  return { type, confidence, evidence: text('evidence'), interpretation: text('interpretation') };
}

/** A check mark reads true, a cross mark false, anything else null. */
function readPresence(cell: string): boolean | null {
  const text = cell.trim();
  if (text.startsWith('✅') || text.startsWith('✓') || text.startsWith('✔')) return true;
  if (text.startsWith('❌') || text.startsWith('✗') || text.startsWith('✘') || text.startsWith('✖') || text.startsWith('×')) return false;
  return null;
}

const FORENSICS_HEADINGS: ReadonlySet<string> = new Set([
  'evidence summary',
  'anomalies detected',
  'root cause hypothesis',
  'recommended actions',
]);

/** The projection of one `forensics/report-*.md` body; null when it holds none of the four known headings. */
export function extractForensics(body: string): ForensicsLift | null {
  const lines = splitBodyLines(body);
  const sections = scanFencedLines(lines);
  if (!sections.some((section) => section.level === 2 && FORENSICS_HEADINGS.has(section.heading.trim().toLowerCase()))) return null;

  const head = labelValues(lines, [[0, headEnd(lines, sections)]], new Set(['generated', 'problem']));
  const evidence = findSection(sections, 2, (h) => h === 'evidence summary');
  const anomalies = findSection(sections, 2, (h) => h === 'anomalies detected');
  const hypothesis = findSection(sections, 2, (h) => h === 'root cause hypothesis');
  const actions = findSection(sections, 2, (h) => h === 'recommended actions');

  // The evidence subsections (Git Activity, Planning State, Artifact Completeness) and the grid.
  const blocks: ForensicsEvidenceBlock[] = [];
  const grid: ForensicsGridCell[] = [];
  if (evidence !== undefined) {
    for (const sub of sections) {
      if (sub.level !== 3 || sub.startLine <= evidence.startLine || sub.endLine > evidence.endLine) continue;
      if (blocks.length >= LIFT_LIST_CAP) break;
      const subLines = sectionLines(lines, sub);
      blocks.push({ heading: capText(sub.heading.trim(), 300), items: listItems(subLines) });
      if (sub.heading.trim().toLowerCase() !== 'artifact completeness') continue;
      const table = pipeTable(subLines);
      for (const row of table.rows) {
        const phase = cellAt(row, 0);
        for (let c = 1; c < table.headers.length; c += 1) {
          if (grid.length >= FORENSICS_GRID_CAP) break;
          const cell = cellAt(row, c);
          grid.push({ phase, artifact: capText(table.headers[c], 100), present: readPresence(cell), cell });
        }
      }
    }
  }

  // The anomalies: each `###` inside the section; the section's own prose is the writer's sentence.
  const found: ForensicsAnomaly[] = [];
  let note: string | null = null;
  if (anomalies !== undefined) {
    let firstSub = anomalies.endLine;
    for (const sub of sections) {
      if (sub.level !== 3 || sub.startLine <= anomalies.startLine || sub.endLine > anomalies.endLine) continue;
      if (sub.startLine < firstSub) firstSub = sub.startLine;
      if (found.length < LIFT_LIST_CAP) found.push(readAnomaly(lines, sub));
    }
    const intro = paragraphText(lines.slice(anomalies.startLine + 1, firstSub));
    note = intro === '' ? null : intro;
  }
  const ordered = found
    .map((anomaly, index) => ({ anomaly, index }))
    .sort((a, b) => {
      const ra = CONFIDENCE_RANK.get(a.anomaly.confidence ?? '') ?? 3;
      const rb = CONFIDENCE_RANK.get(b.anomaly.confidence ?? '') ?? 3;
      return ra - rb || a.index - b.index;
    })
    .map((entry) => entry.anomaly);

  // The hypothesis: the section's text without the writer's lead-in sentence.
  let hypothesisText: string | null = null;
  if (hypothesis !== undefined) {
    const kept = sectionLines(lines, hypothesis).filter((line) => line.trim().toLowerCase() !== HYPOTHESIS_LEAD);
    const text = paragraphText(kept);
    hypothesisText = text === '' ? null : text;
  }

  return {
    title: firstH1(lines),
    generated: head.get('generated') ?? null,
    problem: head.get('problem') ?? null,
    evidence: blocks,
    anomalies: ordered,
    anomaliesNote: note,
    hypothesis: hypothesisText,
    actions: actions === undefined ? [] : listItems(sectionLines(lines, actions)),
    grid,
  };
}
