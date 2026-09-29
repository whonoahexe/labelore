// The RESEARCH briefing composer (quick-260929-3x3, sketch-008 A): a pure `ViewInput` ->
// `ComposedResearchBriefing` projection over `structured.briefing` (built by
// `src/planning-repo/handlers/research-briefing.ts`). No DOM, no rendering —
// `research-briefing-components.tsx` is the only consumer. Returns `null` when the briefing is
// missing/malformed, or holds neither a summary nor any claimed chapter — the page then falls back
// to the pre-existing promoted-block view (T-3x3-04). Every array/field is read defensively so a
// payload from an older server still composes.
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type { ResearchBriefing } from '../../planning-repo/handlers/research-briefing.ts';
import { isLiftableDiagram } from '../../rendering/ascii-lift.ts';
import { isDirectoryTree } from '../../rendering/ascii-tree.ts';
import type { OutlineEntry, ViewInput } from './manifest.ts';
import { formatGatheredDate } from './context-brief.ts';

// ---------------------------------------------------------------------------
// Composed model
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the briefing draws from — never the parse-degradation
 * tones (`destructive`/`warning`), which stay reserved for the artifact-parse badge alone. */
export type ResearchTone = 'active' | 'complete' | 'quiet' | 'in-flight' | 'missing';

export interface ComposedConfidenceRow {
  area: string;
  label: string | null;
  tone: ResearchTone;
  /** 1-4 filled steps of the row's level meter (0 when unrated). */
  steps: number;
  note: string;
}

export interface ComposedConfidence {
  label: string;
  tone: ResearchTone;
  raw: string;
  /** The confidence line minus its leading level (the title chip already shows it); null when
   * nothing is left. */
  summary: string | null;
  rows: ComposedConfidenceRow[];
  text: string | null;
}

export interface ComposedResearchIntro {
  eyebrow: string;
  title: string | null;
  researched: string | null;
  confidence: ComposedConfidence | null;
  validUntilShort: string | null;
  validUntil: string | null;
  domain: string | null;
  preamble: Block[];
}

/** One numbered finding: a paragraph plus any non-paragraph blocks that follow it. */
export interface ComposedResearchFinding {
  number: string;
  blocks: Block[];
}

/** The lead is the framing paragraph together with any non-paragraph blocks before the second
 * paragraph, in source order; every later paragraph opens a numbered finding. */
export interface ComposedResearchSummary {
  lead: Block[];
  findings: ComposedResearchFinding[];
  recommendation: string | null;
}

export interface ComposedSourceOnly {
  label: string;
  targetId: string | null;
}

/** Every chapter carries its sequential `number` (assigned over the chapters actually present) and
 * a stable anchor `id`; the per-kind payloads extend this base as the chapters land. */
export interface ComposedChapterBase {
  id: string;
  number: string;
  title: string;
  kind: string;
}

export interface ComposedPattern {
  title: string;
  what: string;
  when: string | null;
  /** The `###` heading id a quiet "source" link jumps to, when the pattern has more than What/When. */
  sourceTarget: string | null;
}

export interface ComposedArchitecture extends ComposedChapterBase {
  kind: 'architecture';
  /** `lifted` is true only when the figure is a real diagram (a rectangle or a connector flow);
   * otherwise it stays a plain framed figure. */
  diagram: { text: string; caption: Block[]; lifted: boolean } | null;
  /** `isTree` is true only with three or more tree-prefixed lines; otherwise a plain framed block. */
  structure: { text: string; isTree: boolean; notes: Block[] } | null;
  patterns: ComposedPattern[];
  antiPatterns: { lead: string; rest: string }[];
  handRoll: {
    rows: { problem: string; dont: string; use: string; why: string }[];
    insight: string | null;
  } | null;
}

export interface ComposedBadge {
  label: string;
  tone: ResearchTone;
}

export interface ComposedPackage {
  name: string;
  version: string;
  date: string | null;
  purpose: string;
  why: string;
  badges: ComposedBadge[];
}

export interface ComposedStackGroup {
  label: string;
  kind: 'core' | 'supporting' | 'other';
  packages: ComposedPackage[];
  notes: Block[];
}

export interface ComposedAlternative {
  chosen: string;
  other: string;
  tradeoff: string;
  verdict: 'rejected' | 'viable' | 'harmful' | 'later';
  verdictLabel: string;
  tone: ResearchTone;
  struck: boolean;
}

/** One audit signal: `label` is registry / age / downloads / repo / rule, `bad` marks the ones the
 * design flags (a fresh package, few downloads, no repo, a rule that fired). */
export interface LaneSignal {
  label: 'registry' | 'age' | 'downloads' | 'repo' | 'rule';
  value: string;
  bad: boolean;
}

export interface LaneFlaggedItem {
  name: string;
  signals: LaneSignal[];
  reason: string | null;
  replacement: string | null;
  disposition: string | null;
}

export interface LaneApprovedItem {
  name: string;
  /** True when the disposition is anything other than a plain "Approved". */
  dashed: boolean;
  disposition: string;
}

export interface ComposedLanes {
  slop: { items: LaneFlaggedItem[]; count: number };
  sus: { items: LaneFlaggedItem[]; count: number };
  ok: { items: LaneApprovedItem[]; count: number };
}

export interface SeamRow {
  name: string;
  registry: string;
  age: string;
  downloads: string;
  repo: string;
  verdict: string;
  verdictTone: ResearchTone;
  rule: string | null;
  disposition: string;
}

export interface ComposedAudit {
  intro: string[];
  lanes: ComposedLanes | null;
  /** The prose lines of a "Not applicable" audit, rendered instead of the lanes. */
  prose: string[] | null;
  susNote: string | null;
  extraNotes: string[];
  seamRows: SeamRow[];
}

export interface ComposedStack extends ComposedChapterBase {
  kind: 'stack';
  intro: Block[];
  groups: ComposedStackGroup[];
  alternatives: ComposedAlternative[];
  audit: ComposedAudit | null;
}

export interface ComposedPitfallRow {
  label: string | null;
  text: string;
  code: string[];
}

export interface ComposedPitfall {
  id: string;
  number: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  chips: ComposedBadge[];
  visible: ComposedPitfallRow | null;
  more: ComposedPitfallRow[];
}

export interface ComposedPitfalls extends ComposedChapterBase {
  kind: 'pitfalls';
  pitfalls: ComposedPitfall[];
}

export interface ComposedQuestion {
  id: string;
  number: string;
  title: string;
  resolved: boolean;
  chip: ComposedBadge;
  body: Block[];
}

export interface ComposedQuestions extends ComposedChapterBase {
  kind: 'questions';
  lead: Block[];
  items: ComposedQuestion[];
}

export interface ComposedEnvironment extends ComposedChapterBase {
  kind: 'environment';
  rows: {
    dependency: string;
    requiredBy: string;
    available: 'yes' | 'no' | 'unknown';
    availableText: string;
    version: string;
    fallback: string;
    fallbackRest: string;
    blocking: boolean;
  }[];
  notes: Block[];
  prose: Block[];
}

export interface ComposedSources extends ComposedChapterBase {
  kind: 'sources';
  summary: string;
  tiers: { tier: string; label: string; items: string[] }[];
}

export type ComposedChapter =
  | ComposedStack
  | ComposedArchitecture
  | ComposedPitfalls
  | ComposedQuestions
  | ComposedEnvironment
  | ComposedSources;

export interface ComposedGlanceRow {
  targetId: string;
  label: string;
  value: string;
  sub: string | null;
}

export interface ComposedDecisionId {
  id: string;
  /** In-app link to the phase's CONTEXT.md decision, or `null` (rendered as plain text). */
  href: string | null;
}

export type ComposedBackRow =
  | {
      kind: 'constraints';
      id: string;
      title: string;
      summary: string;
      groups: { group: string | null; ids: ComposedDecisionId[] }[];
      lockedCount: number;
      discretion: string[];
      deferred: string[];
      contextUrl: string | null;
      contextName: string | null;
    }
  | {
      kind: 'table';
      id: string;
      title: string;
      summary: string;
      rows: Record<string, string>[];
    };

export interface ComposedResearchBriefing {
  intro: ComposedResearchIntro;
  summary: ComposedResearchSummary | null;
  chapters: ComposedChapter[];
  glance: ComposedGlanceRow[];
  backMatter: ComposedBackRow[];
  sourceOnly: ComposedSourceOnly[];
  contextUrl: string | null;
  outline: OutlineEntry[];
}

// ---------------------------------------------------------------------------
// Guards and small helpers
// ---------------------------------------------------------------------------

function isBriefing(value: unknown): value is ResearchBriefing {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.meta === 'object' && candidate.meta !== null && Array.isArray(candidate.sections)
  );
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

const LEVEL_TONE: Record<string, ResearchTone> = {
  HIGH: 'complete',
  'MEDIUM-HIGH': 'complete',
  MEDIUM: 'in-flight',
  MIXED: 'in-flight',
  'MEDIUM-LOW': 'missing',
  LOW: 'missing',
};

/** HIGH / MEDIUM-HIGH -> complete, MEDIUM / MIXED -> in-flight, MEDIUM-LOW / LOW -> missing, an
 * unrecognised or absent level -> quiet. */
export function levelTone(level: string | null | undefined): ResearchTone {
  return (level && LEVEL_TONE[level]) || 'quiet';
}

/** `HIGH` -> `High`, `MEDIUM-HIGH` -> `Medium-high`, `MIXED` -> `Mixed`. */
export function levelLabel(level: string): string {
  const lower = level.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function eyebrowOf(phase: string | null, quickId: string | null): string {
  const parts = ['Research'];
  if (phase) {
    const [whole, frac] = phase.split('.');
    parts.push(`Phase ${whole.padStart(2, '0')}${frac ? `.${frac}` : ''}`);
  } else if (quickId) {
    parts.push(`Quick task ${quickId}`);
  }
  return parts.join(' · ');
}

/** Lower-case, strip emphasis/backticks, collapse whitespace — how a source-only heading and a
 * rendered heading are compared. */
export function normalizeHeading(text: string): string {
  return text.replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const LEVEL_STEPS: Record<string, number> = {
  HIGH: 4,
  'MEDIUM-HIGH': 3,
  MEDIUM: 2,
  MIXED: 2,
  'MEDIUM-LOW': 1,
  'LOW-MEDIUM': 1,
  LOW: 1,
};

const LEAD_LEVEL_RE = /^\*{0,2}(MEDIUM-HIGH|MEDIUM-LOW|LOW-MEDIUM|HIGH|MEDIUM|LOW|MIXED)\*{0,2}\s*(?:[—–:-]+\s*)?/i;

/** Tidies a breakdown note or confidence line for display: drops a leading level (and a leftover
 * "confidence —"), repairs the unbalanced `**` a stripped bold level leaves behind, and
 * capitalises the first letter. */
export function tidyConfidenceText(text: string, { dropLevel }: { dropLevel: boolean }): string {
  let out = text.trim();
  if (dropLevel) out = out.replace(LEAD_LEVEL_RE, '');
  out = out.replace(/^confidence\b\s*[—–:-]*\s*/i, '');
  if ((out.match(/\*\*/g) ?? []).length % 2 === 1) out = out.replace('**', '');
  return out.replace(/^([a-z])/, (letter) => letter.toUpperCase());
}

function confidenceOf(meta: ResearchBriefing['meta']): ComposedConfidence | null {
  const confidence = meta.confidence;
  if (!confidence || typeof confidence.raw !== 'string') return null;
  const level = typeof confidence.level === 'string' ? confidence.level : null;
  return {
    label: level ? levelLabel(level) : 'Unrated',
    tone: levelTone(level),
    raw: confidence.raw,
    summary: tidyConfidenceText(confidence.raw, { dropLevel: true }) || null,
    rows: arrayOf<{ area?: unknown; level?: unknown; note?: unknown }>(meta.breakdown).map((row) => {
      const rowLevel = typeof row.level === 'string' ? row.level : null;
      return {
        area: typeof row.area === 'string' ? row.area : '',
        label: rowLevel ? levelLabel(rowLevel) : null,
        tone: levelTone(rowLevel),
        steps: (rowLevel && LEVEL_STEPS[rowLevel]) || 0,
        note: typeof row.note === 'string' ? tidyConfidenceText(row.note, { dropLevel: false }) : '',
      };
    }),
    text: stringOrNull(meta.breakdownText),
  };
}

function introOf(briefing: ResearchBriefing): ComposedResearchIntro {
  const meta = briefing.meta;
  const validUntil = stringOrNull(meta.validUntil);
  return {
    eyebrow: eyebrowOf(stringOrNull(meta.phase), stringOrNull(meta.quickId)),
    title: stringOrNull(meta.title),
    researched: formatGatheredDate(stringOrNull(meta.researched) ?? stringOrNull(meta.researchDate)),
    confidence: confidenceOf(meta),
    validUntilShort: stringOrNull(meta.validUntilShort),
    validUntil,
    domain: stringOrNull(meta.domain),
    preamble: arrayOf<Block>(meta.preamble),
  };
}

function summaryOf(briefing: ResearchBriefing): ComposedResearchSummary | null {
  const summary = briefing.summary;
  if (!summary || typeof summary !== 'object') return null;
  const paragraphs = arrayOf<Block>(summary.paragraphs);
  const recommendation = stringOrNull(summary.recommendation);
  if (paragraphs.length === 0 && recommendation === null) return null;
  const lead: Block[] = [];
  const findings: ComposedResearchFinding[] = [];
  let leadTaken = false;
  for (const block of paragraphs) {
    if (block.kind === 'paragraph' && !leadTaken) {
      leadTaken = true;
      lead.push(block);
    } else if (block.kind === 'paragraph') {
      findings.push({ number: pad2(findings.length + 1), blocks: [block] });
    } else {
      (findings.at(-1)?.blocks ?? lead).push(block);
    }
  }
  return { lead, findings, recommendation };
}

/** Each source-only entry's Source-mode target: a rendered `h2` group by heading, a `###` heading
 * for a `Parent › Child` entry, else the parent group, else `null`. */
function sourceOnlyOf(briefing: ResearchBriefing, input: ViewInput): ComposedSourceOnly[] {
  const groupIds = new Map<string, string>();
  for (const group of input.groups) {
    if (group.heading === null || group.id === null) continue;
    const key = normalizeHeading(group.heading);
    if (!groupIds.has(key)) groupIds.set(key, group.id);
  }
  const subIds = new Map<string, string>();
  for (const heading of input.headings ?? []) {
    if (heading.depth !== 3) continue;
    const key = normalizeHeading(heading.text);
    if (!subIds.has(key)) subIds.set(key, heading.id);
  }
  return arrayOf<{ label?: unknown; heading?: unknown; parentHeading?: unknown }>(briefing.sourceOnly)
    .filter((entry) => typeof entry.label === 'string' && typeof entry.heading === 'string')
    .map((entry) => {
      const heading = normalizeHeading(entry.heading as string);
      const parent = typeof entry.parentHeading === 'string' ? normalizeHeading(entry.parentHeading) : null;
      let targetId: string | null;
      if (parent === null) targetId = groupIds.get(heading) ?? null;
      else targetId = subIds.get(heading) ?? groupIds.get(parent) ?? null;
      return { label: entry.label as string, targetId };
    });
}

type Draft<T> = T extends unknown ? Omit<T, 'number'> : never;
type ChapterDraft = Draft<ComposedChapter>;
type ArchitectureDraft = Draft<ComposedArchitecture>;

function architectureOf(briefing: ResearchBriefing, input: ViewInput): ArchitectureDraft | null {
  const architecture = briefing.architecture ?? null;
  const handRoll = briefing.handRoll ?? null;
  const diagramSource = architecture?.diagram ?? null;
  const structureSource = architecture?.structure ?? null;
  const subHeadings = new Map<string, string>();
  for (const heading of input.headings ?? []) {
    if (heading.depth !== 3) continue;
    const key = normalizeHeading(heading.text);
    if (!subHeadings.has(key)) subHeadings.set(key, heading.id);
  }
  const patterns = arrayOf<{ heading?: unknown; title?: unknown; what?: unknown; when?: unknown; hasMore?: unknown }>(
    architecture?.patterns,
  ).map((pattern): ComposedPattern => {
    const heading = typeof pattern.heading === 'string' ? normalizeHeading(pattern.heading) : null;
    return {
      title: typeof pattern.title === 'string' ? pattern.title : '',
      what: typeof pattern.what === 'string' ? pattern.what : '',
      when: stringOrNull(pattern.when),
      sourceTarget: pattern.hasMore === true && heading ? (subHeadings.get(heading) ?? null) : null,
    };
  });
  const antiPatterns = arrayOf<{ lead?: unknown; rest?: unknown }>(architecture?.antiPatterns).map((entry) => ({
    lead: typeof entry.lead === 'string' ? entry.lead : '',
    rest: typeof entry.rest === 'string' ? entry.rest : '',
  }));
  const handRollRows = arrayOf<{ problem?: unknown; dont?: unknown; use?: unknown; why?: unknown }>(
    handRoll?.rows,
  ).map((row) => ({
    problem: typeof row.problem === 'string' ? row.problem : '',
    dont: typeof row.dont === 'string' ? row.dont : '',
    use: typeof row.use === 'string' ? row.use : '',
    why: typeof row.why === 'string' ? row.why : '',
  }));
  const insight = stringOrNull(handRoll?.insight);

  const diagram =
    diagramSource && typeof diagramSource.text === 'string'
      ? {
          text: diagramSource.text,
          caption: arrayOf<Block>(diagramSource.caption),
          lifted: isLiftableDiagram(diagramSource.text),
        }
      : null;
  const structure =
    structureSource && typeof structureSource.text === 'string'
      ? {
          text: structureSource.text,
          isTree: isDirectoryTree(structureSource.text),
          notes: arrayOf<Block>(structureSource.notes),
        }
      : null;
  const hasHandRoll = handRollRows.length > 0 || insight !== null;
  if (!diagram && !structure && patterns.length === 0 && antiPatterns.length === 0 && !hasHandRoll) {
    return null;
  }
  return {
    id: 'research-architecture',
    title: 'Architecture',
    kind: 'architecture',
    diagram,
    structure,
    patterns,
    antiPatterns,
    handRoll: hasHandRoll ? { rows: handRollRows, insight } : null,
  };
}

// --- stack + legitimacy audit -----------------------------------------------------------------

const VERDICT_META: Record<ComposedAlternative['verdict'], { label: string; tone: ResearchTone }> = {
  rejected: { label: 'rejected', tone: 'quiet' },
  viable: { label: 'viable alternative', tone: 'complete' },
  harmful: { label: 'do not use', tone: 'missing' },
  later: { label: 'later phase', tone: 'in-flight' },
};

const FRESH_AGE_RE = /^\d{1,3}\s*(d|w|days?|weeks?)$/i;
const DOWNLOADS_RE = /^([\d,.]{1,20})\s*([kKmM]?)/;
const LOW_DOWNLOADS = 5000;

function downloadsAreLow(value: string): boolean {
  const match = DOWNLOADS_RE.exec(value.trim());
  if (!match) return false;
  const number = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(number)) return false;
  const factor = match[2].toLowerCase() === 'k' ? 1000 : match[2].toLowerCase() === 'm' ? 1_000_000 : 1;
  return number * factor < LOW_DOWNLOADS;
}

interface SignalSource {
  registry: string;
  age: string;
  downloads: string;
  repo: string;
  rule: string | null;
}

function signalsOf(source: SignalSource): LaneSignal[] {
  const signals: LaneSignal[] = [];
  if (source.registry !== '') signals.push({ label: 'registry', value: source.registry, bad: false });
  if (source.age !== '') signals.push({ label: 'age', value: source.age, bad: FRESH_AGE_RE.test(source.age) });
  if (source.downloads !== '') {
    const value = /^\d[\d,]*$/.test(source.downloads) ? `${source.downloads}/wk` : source.downloads;
    signals.push({ label: 'downloads', value, bad: downloadsAreLow(source.downloads) });
  }
  if (source.repo !== '') {
    const missing = source.repo === '—' || source.repo === '-';
    const gone = source.repo.includes('404');
    signals.push({
      label: 'repo',
      value: missing ? 'no repo' : gone ? 'repo 404' : source.repo,
      bad: missing || gone,
    });
  }
  if (source.rule) signals.push({ label: 'rule', value: source.rule, bad: false });
  return signals;
}

function verdictTone(verdict: string): ResearchTone {
  if (verdict === 'OK') return 'quiet';
  if (verdict === 'SUS') return 'in-flight';
  if (verdict === 'SLOP') return 'missing';
  return 'quiet';
}

function auditOf(briefing: ResearchBriefing): ComposedAudit | null {
  const audit = briefing.audit;
  if (!audit || typeof audit !== 'object') return null;
  const rows = arrayOf<ResearchBriefing['audit'] extends infer A ? (A extends { rows: (infer R)[] } ? R : never) : never>(
    audit.rows,
  );
  const removed = arrayOf<{
    name: string;
    registry: string;
    age: string;
    downloads: string;
    repo: string;
    rule: string | null;
    reason: string;
    replacement: string | null;
  }>(audit.removed);
  const str = (value: unknown): string => (typeof value === 'string' ? value : '');
  const lanesWanted = rows.length > 0 || removed.length > 0;
  const proseLines = arrayOf<string>(audit.proseLines).filter((line) => typeof line === 'string');

  let lanes: ComposedLanes | null = null;
  if (lanesWanted) {
    const flagged = (row: (typeof rows)[number]): LaneFlaggedItem => ({
      name: str(row.name),
      signals: signalsOf({
        registry: str(row.registry),
        age: str(row.age),
        downloads: str(row.downloads),
        repo: str(row.repo),
        rule: typeof row.rule === 'string' ? row.rule : null,
      }),
      reason: null,
      replacement: null,
      disposition: str(row.disposition) === '' ? null : str(row.disposition),
    });
    const slopItems: LaneFlaggedItem[] = removed.map((entry) => ({
      name: str(entry.name),
      signals: signalsOf({
        registry: str(entry.registry),
        age: str(entry.age),
        downloads: str(entry.downloads),
        repo: str(entry.repo),
        rule: typeof entry.rule === 'string' ? entry.rule : null,
      }),
      reason: str(entry.reason) === '' ? null : str(entry.reason),
      replacement: typeof entry.replacement === 'string' ? entry.replacement : null,
      disposition: null,
    }));
    const susItems = rows.filter((row) => row.verdict === 'SUS').map(flagged);
    const okItems: LaneApprovedItem[] = rows
      .filter((row) => row.verdict === 'OK')
      .map((row) => ({
        name: str(row.name),
        dashed: row.plainApproval !== true,
        disposition: str(row.disposition),
      }));
    lanes = {
      slop: { items: slopItems, count: slopItems.length },
      sus: { items: susItems, count: susItems.length },
      ok: { items: okItems, count: okItems.length },
    };
  }

  const seamRows: SeamRow[] = rows.map((row) => ({
    name: str(row.name),
    registry: str(row.registry),
    age: str(row.age),
    downloads: str(row.downloads),
    repo: str(row.repo),
    verdict: str(row.verdict),
    verdictTone: verdictTone(str(row.verdict)),
    rule: typeof row.rule === 'string' ? row.rule : null,
    disposition: str(row.disposition),
  }));
  for (const entry of removed) {
    if (seamRows.some((row) => row.name === entry.name)) continue;
    seamRows.unshift({
      name: str(entry.name),
      registry: str(entry.registry),
      age: str(entry.age),
      downloads: str(entry.downloads),
      repo: str(entry.repo),
      verdict: 'SLOP',
      verdictTone: 'missing',
      rule: typeof entry.rule === 'string' ? entry.rule : null,
      disposition: 'Removed',
    });
  }

  return {
    intro: arrayOf<string>(audit.intro),
    lanes,
    prose: lanes === null && proseLines.length > 0 ? proseLines : null,
    susNote: stringOrNull(audit.susNote),
    extraNotes: arrayOf<string>(audit.extraNotes),
    seamRows,
  };
}

function stackOf(briefing: ResearchBriefing): Draft<ComposedStack> | null {
  const stack = briefing.stack;
  if (!stack || typeof stack !== 'object') return null;
  const groups: ComposedStackGroup[] = arrayOf<ResearchBriefing['stack'] extends infer S ? (S extends { groups: (infer G)[] } ? G : never) : never>(
    stack.groups,
  ).map((group) => ({
    label: typeof group.label === 'string' ? group.label : 'Stack',
    kind: group.kind === 'core' || group.kind === 'supporting' ? group.kind : 'other',
    notes: arrayOf<Block>(group.notes),
    packages: arrayOf<(typeof group.packages)[number]>(group.packages).map((pkg) => {
      const badges: ComposedBadge[] = [];
      if (pkg.sus === true) badges.push({ label: 'SUS', tone: 'in-flight' });
      if (pkg.pinned === true) badges.push({ label: 'already pinned', tone: 'quiet' });
      if (pkg.hostBinary === true) badges.push({ label: 'host binary', tone: 'quiet' });
      return {
        name: typeof pkg.name === 'string' ? pkg.name : '',
        version: typeof pkg.version === 'string' ? pkg.version : '',
        date: stringOrNull(pkg.date),
        purpose: typeof pkg.purpose === 'string' ? pkg.purpose : '',
        why: typeof pkg.why === 'string' ? pkg.why : '',
        badges,
      };
    }),
  }));
  const alternatives: ComposedAlternative[] = arrayOf<(typeof stack.alternatives)[number]>(stack.alternatives).map(
    (alt) => {
      const verdict = alt.verdict === 'rejected' || alt.verdict === 'harmful' || alt.verdict === 'later' ? alt.verdict : 'viable';
      return {
        chosen: typeof alt.chosen === 'string' ? alt.chosen : '',
        other: typeof alt.other === 'string' ? alt.other : '',
        tradeoff: typeof alt.tradeoff === 'string' ? alt.tradeoff : '',
        verdict,
        verdictLabel: VERDICT_META[verdict].label,
        tone: VERDICT_META[verdict].tone,
        struck: verdict !== 'viable',
      };
    },
  );
  if (groups.length === 0 && alternatives.length === 0) return null;
  return {
    id: 'research-stack',
    title: 'Standard stack',
    kind: 'stack',
    intro: arrayOf<Block>(stack.intro),
    groups,
    alternatives,
    audit: auditOf(briefing),
  };
}

// --- pitfalls, questions, environment, sources -------------------------------------------------

const SEVERITY_TONE: Record<string, ResearchTone> = {
  CRITICAL: 'missing',
  HIGH: 'in-flight',
  MEDIUM: 'quiet',
  LOW: 'quiet',
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function pitfallsOf(briefing: ResearchBriefing): Draft<ComposedPitfalls> | null {
  const items = arrayOf<NonNullable<ResearchBriefing['pitfalls']>['items'][number]>(briefing.pitfalls?.items);
  if (items.length === 0) return null;
  const pitfalls = items.map((item, index): ComposedPitfall => {
    const severity =
      item.severity === 'CRITICAL' || item.severity === 'HIGH' || item.severity === 'MEDIUM' || item.severity === 'LOW'
        ? item.severity
        : null;
    const chips: ComposedBadge[] = [];
    if (severity) chips.push({ label: severity.toLowerCase(), tone: SEVERITY_TONE[severity] });
    if (typeof item.code === 'string' && item.code !== '') chips.push({ label: item.code, tone: 'quiet' });
    if (typeof item.tag === 'string' && item.tag !== '') chips.push({ label: item.tag, tone: 'quiet' });
    const rows = arrayOf<{ label?: unknown; text?: unknown; code?: unknown }>(item.rows).map(
      (row): ComposedPitfallRow => {
        const label = typeof row.label === 'string' ? row.label : null;
        return {
          label: label && /^why it happens$/i.test(label) ? 'Why' : label,
          text: typeof row.text === 'string' ? row.text : '',
          code: arrayOf<string>(row.code).filter((c) => typeof c === 'string'),
        };
      },
    );
    let visibleIndex = rows.findIndex((row) => row.label !== null && /^what goes wrong/i.test(row.label));
    if (visibleIndex === -1) visibleIndex = rows.length > 0 ? 0 : -1;
    return {
      id: `research-pitfall-${index + 1}`,
      number: pad2(typeof item.number === 'number' ? item.number : index + 1),
      title: typeof item.title === 'string' ? item.title : '',
      severity,
      chips,
      visible: visibleIndex === -1 ? null : rows[visibleIndex],
      more: rows.filter((_, rowIndex) => rowIndex !== visibleIndex),
    };
  });
  return { id: 'research-pitfalls', title: 'Common pitfalls', kind: 'pitfalls', pitfalls };
}

function questionsOf(briefing: ResearchBriefing): Draft<ComposedQuestions> | null {
  const questions = briefing.questions;
  const items = arrayOf<NonNullable<ResearchBriefing['questions']>['items'][number]>(questions?.items);
  if (!questions || items.length === 0) return null;
  return {
    id: 'research-questions',
    title: 'Open questions',
    kind: 'questions',
    lead: arrayOf<Block>(questions.lead),
    items: items.map((item, index): ComposedQuestion => {
      const resolved = item.resolved === true;
      return {
        id: `research-question-${index + 1}`,
        number: `Q${typeof item.number === 'number' ? item.number : index + 1}`,
        title: typeof item.title === 'string' ? item.title : '',
        resolved,
        chip: resolved ? { label: 'resolved', tone: 'quiet' } : { label: 'open', tone: 'in-flight' },
        body: arrayOf<Block>(item.body),
      };
    }),
  };
}

/** A blocking fallback reads `**None — blocking.** rest`: the chip says "blocking", `rest` is what
 * remains of the cell once that lead is removed. */
function fallbackRestOf(fallback: string): string {
  const plainText = fallback.replace(/\*\*/g, '').trim();
  const at = plainText.toLowerCase().indexOf('blocking');
  if (at === -1) return plainText;
  let rest = plainText.slice(at + 'blocking'.length).trim();
  while (rest.startsWith('.') || rest.startsWith(';') || rest.startsWith(',')) rest = rest.slice(1).trim();
  return rest;
}

function environmentOf(briefing: ResearchBriefing): Draft<ComposedEnvironment> | null {
  const environment = briefing.environment;
  if (!environment || typeof environment !== 'object') return null;
  const rows = arrayOf<NonNullable<ResearchBriefing['environment']>['rows'][number]>(environment.rows).map(
    (row) => {
      const fallback = typeof row.fallback === 'string' ? row.fallback : '';
      const blocking = row.blocking === true;
      return {
        dependency: typeof row.dependency === 'string' ? row.dependency : '',
        requiredBy: typeof row.requiredBy === 'string' ? row.requiredBy : '',
        available: row.available === 'yes' || row.available === 'no' ? row.available : ('unknown' as const),
        availableText: typeof row.availableText === 'string' ? row.availableText : '',
        version: typeof row.version === 'string' ? row.version : '',
        fallback,
        fallbackRest: blocking ? fallbackRestOf(fallback) : fallback,
        blocking,
      };
    },
  );
  const notes = arrayOf<Block>(environment.notes);
  const prose = arrayOf<Block>(environment.prose);
  if (rows.length === 0 && prose.length === 0) return null;
  return { id: 'research-environment', title: 'Environment', kind: 'environment', rows, notes, prose };
}

const TIER_NAMES: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
  other: 'Other',
};

function sourcesOf(briefing: ResearchBriefing): Draft<ComposedSources> | null {
  const tiers = arrayOf<NonNullable<ResearchBriefing['sources']>['tiers'][number]>(briefing.sources?.tiers)
    .map((tier) => {
      const key = typeof tier.tier === 'string' ? tier.tier : 'other';
      return {
        tier: key,
        label: TIER_NAMES[key] ?? 'Other',
        items: arrayOf<string>(tier.items).filter((item) => typeof item === 'string'),
      };
    })
    .filter((tier) => tier.items.length > 0);
  if (tiers.length === 0) return null;
  return {
    id: 'research-sources',
    title: 'Sources',
    kind: 'sources',
    summary: tiers.map((tier) => `${tier.label} ${tier.items.length}`).join(' · '),
    tiers,
  };
}

/** Chapters the briefing claims, in the fixed render order, numbered sequentially over the ones
 * actually present (a document with no architecture renumbers with no gap). */
function chaptersOf(briefing: ResearchBriefing, input: ViewInput): ComposedChapter[] {
  const drafts: ChapterDraft[] = [];
  for (const draft of [
    stackOf(briefing),
    architectureOf(briefing, input),
    pitfallsOf(briefing),
    questionsOf(briefing),
    environmentOf(briefing),
    sourcesOf(briefing),
  ]) {
    if (draft) drafts.push(draft);
  }
  return drafts.map((draft, index) => ({ ...draft, number: pad2(index + 1) }) as ComposedChapter);
}

// --- at a glance + back matter ------------------------------------------------------------------

function glanceOf(chapters: ComposedChapter[]): ComposedGlanceRow[] {
  const rows: ComposedGlanceRow[] = [];
  for (const chapter of chapters) {
    if (chapter.kind === 'stack') {
      const entries = chapter.groups.reduce((sum, group) => sum + group.packages.length, 0);
      const audit = chapter.audit;
      const suspicious = audit?.lanes
        ? audit.lanes.sus.count
        : chapter.groups.reduce((sum, g) => sum + g.packages.filter((p) => p.badges.some((b) => b.label === 'SUS')).length, 0);
      rows.push({
        targetId: chapter.id,
        label: `Stack entries${suspicious > 0 ? ` · ${suspicious} flagged SUS` : ''}`,
        value: String(entries),
        sub: null,
      });
    } else if (chapter.kind === 'pitfalls') {
      const counts = new Map<string, number>();
      for (const pitfall of chapter.pitfalls) {
        if (pitfall.severity) counts.set(pitfall.severity, (counts.get(pitfall.severity) ?? 0) + 1);
      }
      const split = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        .filter((level) => counts.has(level))
        .map((level) => `${counts.get(level)} ${level.toLowerCase()}`)
        .join(', ');
      rows.push({
        targetId: chapter.id,
        label: `Pitfalls${split !== '' ? ` · ${split}` : ''}`,
        value: String(chapter.pitfalls.length),
        sub: null,
      });
    } else if (chapter.kind === 'questions') {
      const open = chapter.items.filter((item) => !item.resolved).length;
      rows.push({ targetId: chapter.id, label: 'Open questions', value: String(open), sub: `/${chapter.items.length}` });
    } else if (chapter.kind === 'environment' && chapter.rows.length > 0) {
      const gaps = chapter.rows.filter((row) => row.available === 'no').length;
      const blocking = chapter.rows.filter((row) => row.blocking).length;
      rows.push({
        targetId: chapter.id,
        label: `Environment gaps${blocking > 0 ? ` · ${blocking} blocking` : ''}`,
        value: String(gaps),
        sub: null,
      });
    }
  }
  return rows;
}

const DECISION_ID_RE = /^D-\d{1,3}$/;

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function backMatterOf(
  briefing: ResearchBriefing,
  contextUrl: string | null,
  contextPath: string | null,
): ComposedBackRow[] {
  const rows: ComposedBackRow[] = [];
  const constraints = briefing.userConstraints;
  if (constraints && typeof constraints === 'object') {
    const groups = arrayOf<{ group?: unknown; ids?: unknown }>(constraints.lockedGroups).map((group) => ({
      group: typeof group.group === 'string' ? group.group : null,
      ids: arrayOf<string>(group.ids)
        .filter((id) => typeof id === 'string' && DECISION_ID_RE.test(id))
        .map((id): ComposedDecisionId => ({
          id,
          href: contextUrl ? `${contextUrl}#decision-${id.toLowerCase()}` : null,
        })),
    }));
    const locked = groups.reduce((sum, group) => sum + group.ids.length, 0);
    const discretion = arrayOf<string>(constraints.discretion);
    const deferred = arrayOf<string>(constraints.deferred);
    const noDeferred = deferred.length === 0 || (deferred.length === 1 && /^none/i.test(deferred[0].replace(/[*`]/g, '')));
    rows.push({
      kind: 'constraints',
      id: 'research-back-constraints',
      title: 'User constraints',
      summary: `${locked} locked · ${discretion.length} discretion · ${noDeferred ? 'no' : deferred.length} deferred`,
      groups,
      lockedCount: locked,
      discretion,
      deferred,
      contextUrl,
      contextName: contextPath ? basename(contextPath) : null,
    });
  }
  const requirements = briefing.requirements;
  if (requirements && arrayOf<Record<string, string>>(requirements.rows).length > 0) {
    const tableRows = arrayOf<Record<string, string>>(requirements.rows);
    rows.push({
      kind: 'table',
      id: 'research-back-requirements',
      title: 'Phase requirements',
      summary: `${tableRows.length} requirements`,
      rows: tableRows,
    });
  }
  const map = briefing.responsibilityMap;
  if (map && arrayOf<Record<string, string>>(map.rows).length > 0) {
    const tableRows = arrayOf<Record<string, string>>(map.rows);
    rows.push({
      kind: 'table',
      id: 'research-back-map',
      title: 'Architectural responsibility map',
      summary: `${tableRows.length} capabilities`,
      rows: tableRows,
    });
  }
  return rows;
}

/** Splits a source item into text and external-link parts. Only `http(s)` URLs — bare, or the
 * target of a `[label](url)` link — become links (T-3x3-03); any other scheme stays plain text. */
export type SourcePart = { type: 'text'; text: string } | { type: 'link'; label: string; href: string };

const SOURCE_LINK_RE =
  /\[([^\]]{1,200})\]\((https?:\/\/[^\s)]{1,500})\)|(https?:\/\/[^\s<>"'()`\]]{1,500})/g;

export function splitSourceLinks(text: string): SourcePart[] {
  const parts: SourcePart[] = [];
  let last = 0;
  SOURCE_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  const clipped = text.slice(0, 6000);
  while ((match = SOURCE_LINK_RE.exec(clipped)) !== null) {
    let label = match[1];
    let href = match[2];
    let consumed = match[0];
    if (match[3] !== undefined) {
      let url = match[3];
      while (url.length > 0 && '.,;:'.includes(url[url.length - 1])) url = url.slice(0, -1);
      consumed = url;
      href = url;
      label = url;
      SOURCE_LINK_RE.lastIndex = match.index + url.length;
    }
    if (match.index > last) parts.push({ type: 'text', text: clipped.slice(last, match.index) });
    parts.push({ type: 'link', label, href });
    last = match.index + consumed.length;
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) });
  return parts;
}

function hasClaimedChapter(briefing: ResearchBriefing): boolean {
  return [
    briefing.stack,
    briefing.architecture,
    briefing.pitfalls,
    briefing.questions,
    briefing.environment,
    briefing.sources,
    briefing.handRoll,
  ].some((part) => part !== null && part !== undefined);
}

export function composeResearchBriefing(input: ViewInput): ComposedResearchBriefing | null {
  const raw = (input.structured as Record<string, unknown>).briefing;
  if (!isBriefing(raw)) return null;
  const briefing = raw;

  const summary = summaryOf(briefing);
  if (summary === null && !hasClaimedChapter(briefing)) return null;

  const chapters = chaptersOf(briefing, input);
  const context = (input.siblingArtifacts ?? []).find((sibling) => sibling.kind === 'context') ?? null;
  const contextUrl = context?.url ?? null;
  const backMatter = backMatterOf(briefing, contextUrl, context?.path ?? null);

  const outline: OutlineEntry[] = [];
  if (summary) outline.push({ id: 'research-summary', label: 'Summary' });
  for (const chapter of chapters) {
    outline.push({ id: chapter.id, label: `${chapter.number} ${chapter.title}` });
  }
  if (backMatter.length > 0) outline.push({ id: 'research-back-matter', label: 'Back matter' });
  const sourceOnly = sourceOnlyOf(briefing, input);
  if (sourceOnly.length > 0) outline.push({ id: 'research-source-only', label: 'In the source only' });

  return {
    intro: introOf(briefing),
    summary,
    chapters,
    glance: glanceOf(chapters),
    backMatter,
    sourceOnly,
    contextUrl,
    outline,
  };
}
