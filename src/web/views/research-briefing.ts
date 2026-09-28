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
  note: string;
}

export interface ComposedConfidence {
  label: string;
  tone: ResearchTone;
  raw: string;
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

export interface ComposedResearchSummary {
  lead: string;
  rest: Block[];
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

export type ComposedChapter = ComposedArchitecture;

export interface ComposedResearchBriefing {
  intro: ComposedResearchIntro;
  summary: ComposedResearchSummary | null;
  chapters: ComposedChapter[];
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

function confidenceOf(meta: ResearchBriefing['meta']): ComposedConfidence | null {
  const confidence = meta.confidence;
  if (!confidence || typeof confidence.raw !== 'string') return null;
  const level = typeof confidence.level === 'string' ? confidence.level : null;
  return {
    label: level ? levelLabel(level) : 'Unrated',
    tone: levelTone(level),
    raw: confidence.raw,
    rows: arrayOf<{ area?: unknown; level?: unknown; note?: unknown }>(meta.breakdown).map((row) => {
      const rowLevel = typeof row.level === 'string' ? row.level : null;
      return {
        area: typeof row.area === 'string' ? row.area : '',
        label: rowLevel ? levelLabel(rowLevel) : null,
        tone: levelTone(rowLevel),
        note: typeof row.note === 'string' ? row.note : '',
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
  const firstIndex = paragraphs.findIndex((block) => block.kind === 'paragraph');
  const lead = firstIndex === -1 ? '' : (paragraphs[firstIndex] as { text: string }).text;
  return {
    lead,
    rest: paragraphs.filter((_, index) => index !== firstIndex),
    recommendation,
  };
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

type ChapterDraft = Omit<ComposedArchitecture, 'number'>;

function architectureOf(briefing: ResearchBriefing, input: ViewInput): ChapterDraft | null {
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

/** Chapters the briefing claims, in the fixed render order, numbered sequentially over the ones
 * actually present (a document with no architecture renumbers with no gap). */
function chaptersOf(briefing: ResearchBriefing, input: ViewInput): ComposedChapter[] {
  const drafts: ChapterDraft[] = [];
  const architecture = architectureOf(briefing, input);
  if (architecture) drafts.push(architecture);
  return drafts.map((draft, index) => ({ ...draft, number: String(index + 1).padStart(2, '0') }));
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
  const contextUrl = (input.siblingArtifacts ?? []).find((sibling) => sibling.kind === 'context')?.url ?? null;

  const outline: OutlineEntry[] = [];
  if (summary) outline.push({ id: 'research-summary', label: 'Summary' });
  for (const chapter of chapters) {
    outline.push({ id: chapter.id, label: `${chapter.number} ${chapter.title}` });
  }
  const sourceOnly = sourceOnlyOf(briefing, input);
  if (sourceOnly.length > 0) outline.push({ id: 'research-source-only', label: 'In the source only' });

  return {
    intro: introOf(briefing),
    summary,
    chapters,
    sourceOnly,
    contextUrl,
    outline,
  };
}
