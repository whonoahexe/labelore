// The CONTEXT brief composer (quick-260923-lju, sketch-006 D1): a pure `ViewInput` ->
// `ComposedContextBrief` projection over `structured.brief` (built by
// `src/planning-repo/handlers/context-brief.ts`). No DOM, no rendering — `context-brief-
// components.tsx` is the only consumer. Returns `null` when the brief is missing/malformed, or
// holds neither a boundary nor any area — the page then falls back to the promoted-block view
// (C-1, T-lju-04).
import type {
  AreaEntry,
  Block,
  ContextBoundary,
  ContextBrief,
  IdeaItem,
} from '../../planning-repo/handlers/context-brief.ts';
import type { ViewInput } from './manifest.ts';
import type { DocumentSectionGroup } from './document-sections.ts';
import { INTRODUCTION_LABEL } from './manifest.ts';
import { stripEmoji } from '../pages/strip-emoji.ts';

// ---------------------------------------------------------------------------
// Composed model
// ---------------------------------------------------------------------------

export interface ComposedIntro {
  eyebrow: string;
  title: string | null;
  status: { label: string; tone: 'complete' | 'quiet' } | null;
  covers: string | null;
}

export interface ComposedBoundaryNote {
  id: string;
  title: string | null;
  blocks: Block[];
}

export interface ComposedBoundary {
  eyebrow: string;
  statement: string | null;
  restBlocks: Block[];
  inList: string[];
  outItems: { text: string; dest: string | null }[];
  outFromProse: boolean;
  drift: boolean;
}

export interface ComposedReversibility {
  word: string;
  text: string;
  /** Costly / one-way / irreversible — counted by the "hard to undo" stat and given the
   *  plain (untoned) chip, one step louder than `quiet`. */
  hardToUndo: boolean;
}

export interface ComposedClaudeNote {
  id: string;
  text: string;
}

export interface ComposedDecision {
  id: string;
  tag: string | null;
  summary: string;
  detail: string;
  reversibility: ComposedReversibility | null;
  expandable: boolean;
  openChips: { tag: string; id: string }[];
  claudeNotes: ComposedClaudeNote[];
}

export type ComposedAreaEntry =
  | { kind: 'note'; text: string }
  | { kind: 'decision'; decision: ComposedDecision };

export interface ComposedArea {
  id: string;
  title: string;
  lockedCount: number;
  openCount: number;
  entries: ComposedAreaEntry[];
}

export interface ComposedOpenQuestionRow {
  id: string;
  tag: string | null;
  label: string;
  summary: string;
  detail: string;
  expandable: boolean;
  blocks: { tag: string; id: string }[];
}

export interface ComposedOpenPanel {
  lead: Block[];
  rows: ComposedOpenQuestionRow[];
}

export interface ComposedDiscretionPanel {
  lead: Block[];
  loose: string[];
  trailer: Block[];
}

export interface ComposedIdeaItem {
  id: string;
  title: string | null;
  body: string;
}

export interface ComposedIdeasPanel {
  id: string;
  label: string;
  items: ComposedIdeaItem[];
}

export interface ComposedStat {
  id: string;
  count: number;
  label: string;
  target: string;
  /** The "open for the researcher" stat — rendered in the `in-flight` (awaiting someone) tone. */
  open: boolean;
}

/** One group inside a back-matter aside row — a `###`-titled subsection, or the untitled leading
 * group holding a section's lead prose (quick-260925-3ob). */
export interface ComposedAsideGroup {
  title: string | null;
  blocks: Block[];
}

/** One quiet, collapsed back-matter row closing the brief: requirement amendments, canonical
 * references, or existing code insights (quick-260925-3ob, 3OB-01/02/03). */
export interface ComposedAside {
  id: string;
  kind: 'amendments' | 'references' | 'code';
  label: string;
  count: number;
  hint: string | null;
  groups: ComposedAsideGroup[];
}

export interface ComposedContextBrief {
  intro: ComposedIntro;
  boundary: ComposedBoundary | null;
  boundaryNotes: ComposedBoundaryNote[];
  areas: ComposedArea[];
  decisionCount: number;
  decisionsPreamble: Block[];
  openPanel: ComposedOpenPanel | null;
  discretionPanel: ComposedDiscretionPanel | null;
  specifics: ComposedIdeasPanel | null;
  deferred: ComposedIdeasPanel | null;
  stats: ComposedStat[];
  refTargets: Record<string, string>;
  /** Unrecognised `##` document-section groups, rendered before the register (in document order),
   * plus the leading (no-heading) group when the brief's preamble held extra prose. */
  extras: DocumentSectionGroup[];
  /** Quiet, collapsed back-matter rows closing the brief, in order: amendments (one row per
   * section), then canonical references (merged), then existing code insights (merged) —
   * quick-260925-3ob. Canonical-references/existing-code-insights sections used to be held here
   * for a closed "More in this document" disclosure; that disclosure was removed in 1d0baf3 and
   * those sections now surface through `asides` instead. */
  asides: ComposedAside[];
}

// ---------------------------------------------------------------------------
// Group partition — unrecognised sections (`extras`)
// ---------------------------------------------------------------------------

/** Lowercases, strips `*`/`` ` ``/`_`, collapses link syntax to its label, and normalises
 * whitespace — the same key both `recognizedHeadings` and each document-section group's own
 * heading are compared through. */
function normalizeHeading(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*`_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Every unrecognised, non-blank group, in document order, with the leading (no-heading) group
 * relabelled `INTRODUCTION_LABEL` when the brief's preamble held extra prose. Canonical-references
 * and existing-code-insights headings are already in `recognizedHeadings` (they surface through
 * `asides` instead), so they fall out here without a second bucket. */
function partitionGroups(
  groups: DocumentSectionGroup[],
  recognizedHeadings: string[],
  preambleExtra: boolean,
): { extras: DocumentSectionGroup[] } {
  const recognized = new Set(recognizedHeadings.map(normalizeHeading));
  const extras: DocumentSectionGroup[] = [];
  for (const group of groups) {
    if (group.html.trim() === '') continue;
    if (group.heading === null) {
      if (preambleExtra) extras.push({ ...group, heading: INTRODUCTION_LABEL });
      continue;
    }
    const key = normalizeHeading(group.heading);
    if (recognized.has(key)) continue;
    extras.push(group);
  }
  return { extras };
}

// ---------------------------------------------------------------------------
// Back-matter asides — amendments / references / code (quick-260925-3ob)
// ---------------------------------------------------------------------------

interface RawAsideSection {
  heading: string;
  groups: ComposedAsideGroup[];
}

/** Reads `value` (an older payload's `undefined`, or `ContextAside[]`) tolerantly — a non-array
 * becomes `[]`, and any entry/group failing the expected shape is dropped rather than thrown on
 * (T-3ob-03, C-1: an older server's payload must still compose). */
function tolerantAsideSections(value: unknown): RawAsideSection[] {
  if (!Array.isArray(value)) return [];
  const out: RawAsideSection[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.heading !== 'string' || !Array.isArray(e.groups)) continue;
    const groups: ComposedAsideGroup[] = [];
    let shapeOk = true;
    for (const g of e.groups) {
      if (!g || typeof g !== 'object') {
        shapeOk = false;
        break;
      }
      const gg = g as Record<string, unknown>;
      if (!(gg.title === null || typeof gg.title === 'string') || !Array.isArray(gg.blocks)) {
        shapeOk = false;
        break;
      }
      groups.push({ title: gg.title as string | null, blocks: gg.blocks as Block[] });
    }
    if (!shapeOk) continue;
    out.push({ heading: e.heading, groups });
  }
  return out;
}

function countAsideBlocks(blocks: Block[]): number {
  let count = 0;
  for (const block of blocks) {
    if (block.kind === 'list') count += block.items.length;
    if (block.kind === 'table') count += block.rows.length;
  }
  return count;
}

function countAsideGroups(groups: ComposedAsideGroup[]): number {
  return groups.reduce((sum, group) => sum + countAsideBlocks(group.blocks), 0);
}

/** Titled groups' titles, backticks/asterisks stripped, joined by ` · ` — `null` when no group in
 * `groups` has a title. */
function hintOfAsideGroups(groups: ComposedAsideGroup[]): string | null {
  const titles = groups.filter((g): g is { title: string; blocks: Block[] } => g.title !== null).map((g) => g.title.replace(/[`*]/g, ''));
  return titles.length > 0 ? titles.join(' · ') : null;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** ISO `YYYY-MM-DD` -> `Mon D, YYYY` through a fixed month table (never `Date`/`Intl` — no locale
 * dependency). Anything else comes back unchanged. */
export function formatGatheredDate(gathered: string | null): string | null {
  if (!gathered) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(gathered.trim());
  if (!match) return gathered;
  const [, year, monthStr, dayStr] = match;
  const monthIndex = Number(monthStr) - 1;
  if (monthIndex < 0 || monthIndex > 11) return gathered;
  const day = Number(dayStr);
  return `${MONTHS[monthIndex]} ${day}, ${year}`;
}

/** Collapses each same-prefix run of 3+ consecutive numbers to `PFX-a … PFX-b`, keeps ROADMAP
 * order otherwise, joins with ` · `. Empty input -> `null`. */
export function formatCovers(ids: string[] | null | undefined): string | null {
  if (!ids || ids.length === 0) return null;
  const parsed = ids.map((id) => {
    const m = /^([A-Za-z]+)-(\d+)$/.exec(id.trim());
    return m ? { raw: id.trim(), prefix: m[1], num: Number(m[2]) } : { raw: id.trim(), prefix: null, num: null };
  });

  const out: string[] = [];
  let i = 0;
  while (i < parsed.length) {
    const start = parsed[i];
    if (start.prefix === null) {
      out.push(start.raw);
      i += 1;
      continue;
    }
    let j = i;
    while (
      j + 1 < parsed.length &&
      parsed[j + 1].prefix === start.prefix &&
      parsed[j + 1].num === (parsed[j].num as number) + 1
    ) {
      j += 1;
    }
    const runLength = j - i + 1;
    if (runLength >= 3) {
      out.push(`${start.prefix}-${String(start.num).padStart(2, '0')} … ${start.prefix}-${String(parsed[j].num).padStart(2, '0')}`);
    } else {
      for (let k = i; k <= j; k++) out.push(parsed[k].raw);
    }
    i = j + 1;
  }
  return out.join(' · ');
}

function eyebrowOf(phase: string | null, quickId: string | null, gathered: string | null): string {
  const parts = ['Context'];
  if (phase) {
    const [whole, frac] = phase.split('.');
    parts.push(`Phase ${whole.padStart(2, '0')}${frac ? `.${frac}` : ''}`);
  } else if (quickId) {
    parts.push(`Quick task ${quickId}`);
  }
  const formattedGathered = formatGatheredDate(gathered);
  if (formattedGathered) parts.push(`Gathered ${formattedGathered}`);
  return parts.join(' · ');
}

const STATUS_COMPLETE_RE = /^(ready|complete|done|locked)/i;

function statusOf(status: string | null): ComposedIntro['status'] {
  if (!status) return null;
  return { label: status, tone: STATUS_COMPLETE_RE.test(status) ? 'complete' : 'quiet' };
}

const HARD_TO_UNDO_RE = /^(costly|one-way|irreversible)/i;

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isContextBrief(value: unknown): value is ContextBrief {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ContextBrief>;
  return (
    typeof v.meta === 'object' &&
    v.meta !== null &&
    Array.isArray(v.areas) &&
    Array.isArray(v.specifics) &&
    Array.isArray(v.deferred) &&
    Array.isArray(v.openQuestions) &&
    Array.isArray(v.recognizedHeadings)
  );
}

// ---------------------------------------------------------------------------
// composeContextBrief
// ---------------------------------------------------------------------------

export function composeContextBrief(input: ViewInput): ComposedContextBrief | null {
  const raw = (input.structured as Record<string, unknown>).brief;
  if (!isContextBrief(raw)) return null;
  const brief = raw;

  if (!brief.boundary && brief.areas.length === 0) return null;

  const intro: ComposedIntro = {
    eyebrow: eyebrowOf(brief.meta.phase, brief.meta.quickId, brief.meta.gathered),
    title: null,
    status: statusOf(brief.meta.status),
    covers: formatCovers(input.phaseRequirementIds ?? null),
  };

  const refTargets: Record<string, string> = {};
  const decisionIdsSeen = new Map<string, number>();

  // First pass: assign every decision entry its final id, in area/entry order — recorded in a
  // flat queue (`decisionIdsInOrder`) so the second pass (building composed areas below) replays
  // the exact same ids rather than re-deriving them from a tag lookup, which would collapse a
  // duplicate tag's second occurrence onto the first (both `D-01` rows sharing one id).
  const decisionIdByTag = new Map<string, string>();
  const decisionIdsInOrder: string[] = [];
  let areaIndex = 0;
  for (const area of brief.areas) {
    let rowIndex = 0;
    for (const entry of area.entries) {
      if (entry.kind !== 'decision') continue;
      rowIndex += 1;
      let id: string;
      if (entry.tag) {
        const lowerTag = entry.tag.toLowerCase();
        const seen = decisionIdsSeen.get(lowerTag) ?? 0;
        decisionIdsSeen.set(lowerTag, seen + 1);
        id = seen === 0 ? `decision-${lowerTag}` : `decision-${lowerTag}-${seen + 1}`;
        if (seen === 0) decisionIdByTag.set(entry.tag, id);
      } else {
        id = `decision-a${areaIndex}-${rowIndex}`;
      }
      decisionIdsInOrder.push(id);
      refTargets[entry.tag ?? id] = entry.tag ? decisionIdByTag.get(entry.tag)! : id;
    }
    areaIndex += 1;
  }

  // Open-question ids + blocks-target resolution.
  const openRowsBySource: ComposedOpenQuestionRow[][] = [];
  const openIdByTag = new Map<string, string>();
  for (const source of brief.openQuestions) {
    const rows: ComposedOpenQuestionRow[] = [];
    for (const item of source.items) {
      const id = item.tag ? `question-${item.tag.toLowerCase()}` : `question-${item.number}`;
      if (item.tag) {
        openIdByTag.set(item.tag, id);
        refTargets[item.tag] = id;
      }
      rows.push({
        id,
        tag: item.tag,
        label: item.tag ?? String(item.number),
        summary: item.summary,
        detail: item.detail,
        expandable: item.detail.trim() !== '',
        blocks: item.blocks
          .filter((tag) => decisionIdByTag.has(tag))
          .map((tag) => ({ tag, id: decisionIdByTag.get(tag)! })),
      });
    }
    openRowsBySource.push(rows);
  }
  const allOpenRows = openRowsBySource.flat();

  // Claude-notes attachment + discretion loose list (Task 2 — tagging into the first D-NN a
  // discretion item names, only when a register row has that tag).
  const claudeNotesByDecisionId = new Map<string, ComposedClaudeNote[]>();
  const loose: string[] = [];
  if (brief.discretion) {
    let noteIndex = 0;
    for (const item of brief.discretion.items) {
      const match = /D-\d{1,3}/.exec(item);
      const targetId = match ? decisionIdByTag.get(match[0]) : undefined;
      if (targetId) {
        noteIndex += 1;
        const list = claudeNotesByDecisionId.get(targetId) ?? [];
        list.push({ id: `claude-note-${targetId}-${list.length + 1}`, text: item });
        claudeNotesByDecisionId.set(targetId, list);
      } else {
        loose.push(item);
      }
    }
    void noteIndex;
  }

  // Second pass: build composed areas, replaying `decisionIdsInOrder` (never re-deriving from
  // `decisionIdByTag`, which only remembers a duplicate tag's first id).
  const areas: ComposedArea[] = [];
  let decisionCursor = 0;
  areaIndex = 0;
  for (const area of brief.areas) {
    let lockedCount = 0;
    let openCount = 0;
    const entries: ComposedAreaEntry[] = [];
    for (const entry of area.entries as AreaEntry[]) {
      if (entry.kind === 'note') {
        entries.push({ kind: 'note', text: entry.text });
        continue;
      }
      lockedCount += 1;
      const id = decisionIdsInOrder[decisionCursor];
      decisionCursor += 1;
      const openChips = entry.tag
        ? allOpenRows.filter((row) => row.blocks.some((b) => b.tag === entry.tag)).map((row) => ({ tag: row.label, id: row.id }))
        : [];
      if (openChips.length > 0) openCount += 1;
      const reversibility = entry.reversibility
        ? { word: entry.reversibility.word, text: entry.reversibility.text, hardToUndo: HARD_TO_UNDO_RE.test(entry.reversibility.word) }
        : null;
      entries.push({
        kind: 'decision',
        decision: {
          id,
          tag: entry.tag,
          summary: entry.summary,
          detail: entry.detail,
          reversibility,
          expandable: entry.detail.trim() !== '' || reversibility !== null,
          openChips,
          claudeNotes: claudeNotesByDecisionId.get(id) ?? [],
        },
      });
    }
    areas.push({ id: `area-${areaIndex}`, title: area.title, lockedCount, openCount, entries });
    areaIndex += 1;
  }

  const decisionCount = areas.reduce((sum, a) => sum + a.lockedCount, 0);

  // Boundary.
  let boundary: ComposedBoundary | null = null;
  const boundaryNotes: ComposedBoundaryNote[] = [];
  if (brief.boundary) {
    const b: ContextBoundary = brief.boundary;
    boundary = {
      eyebrow: b.eyebrow,
      statement: b.statement,
      restBlocks: [
        ...(b.statementRest ? [{ kind: 'paragraph', text: b.statementRest } as Block] : []),
        ...b.blocks,
      ],
      inList: b.inList,
      outItems: b.outList,
      outFromProse: b.outFromProse,
      drift: b.drift,
    };
    let noteIdx = 0;
    for (const note of b.notes) {
      noteIdx += 1;
      boundaryNotes.push({ id: `boundary-note-${noteIdx}`, title: note.title, blocks: note.blocks });
    }
    for (const extra of b.extras) {
      noteIdx += 1;
      boundaryNotes.push({ id: `boundary-note-${noteIdx}`, title: extra.title, blocks: extra.blocks });
    }
  }

  // Open panel.
  const openLead = brief.openQuestions.flatMap((s) => s.lead);
  const openPanel: ComposedOpenPanel | null = allOpenRows.length > 0 ? { lead: openLead, rows: allOpenRows } : null;

  // Discretion panel.
  const discretionPanel: ComposedDiscretionPanel | null = brief.discretion
    ? { lead: brief.discretion.lead, loose, trailer: brief.discretion.trailer }
    : null;

  // Ideas.
  const ideaPanel = (items: IdeaItem[], prefix: string, label: string): ComposedIdeasPanel | null => {
    if (items.length === 0) return null;
    return {
      id: `context-${prefix}`,
      label,
      items: items.map((it, idx) => ({ id: `${prefix}-${idx + 1}`, title: it.title, body: it.body })),
    };
  };
  const specifics = ideaPanel(brief.specifics, 'specifics', 'Specific ideas');
  const deferred = ideaPanel(brief.deferred, 'deferred', 'Deferred');

  // Stats.
  const stats: ComposedStat[] = [];
  const firstDecisionId = areas.flatMap((a) => a.entries).find((e) => e.kind === 'decision');
  if (decisionCount > 0 && firstDecisionId && firstDecisionId.kind === 'decision') {
    stats.push({
      id: 'stat-locked',
      count: decisionCount,
      label: decisionCount === 1 ? 'decision locked' : 'decisions locked',
      target: firstDecisionId.decision.id,
      open: false,
    });
  }
  if (allOpenRows.length > 0) {
    stats.push({
      id: 'stat-open',
      count: allOpenRows.length,
      label: allOpenRows.length === 1 ? 'open for the researcher' : 'open for the researcher',
      target: allOpenRows[0].id,
      open: true,
    });
  }
  const hardToUndo = areas
    .flatMap((a) => a.entries)
    .filter((e): e is Extract<ComposedAreaEntry, { kind: 'decision' }> => e.kind === 'decision')
    .filter((e) => e.decision.reversibility?.hardToUndo);
  if (hardToUndo.length > 0) {
    stats.push({
      id: 'stat-hard',
      count: hardToUndo.length,
      label: 'hard to undo',
      target: hardToUndo[0].decision.id,
      open: false,
    });
  }
  const leftToClaude = (brief.discretion?.items.length ?? 0);
  if (leftToClaude > 0) {
    stats.push({
      id: 'stat-claude',
      count: leftToClaude,
      label: 'left to Claude',
      target: 'context-discretion',
      open: false,
    });
  }

  const { extras } = partitionGroups(input.groups, brief.recognizedHeadings, brief.meta.preambleExtra);

  // Back-matter asides (quick-260925-3ob): amendments (one row per section, in document order),
  // then a single merged canonical-references row, then a single merged code-insights row.
  const briefRecord = brief as unknown as Record<string, unknown>;
  const amendmentsSections = tolerantAsideSections(briefRecord.amendments);
  const amendmentsAsides: ComposedAside[] = amendmentsSections.map((section, index) => ({
    id: index === 0 ? 'context-amendments' : `context-amendments-${index + 1}`,
    kind: 'amendments',
    label: stripEmoji(section.heading) || 'Amendments',
    count: countAsideGroups(section.groups),
    hint: hintOfAsideGroups(section.groups),
    groups: section.groups,
  }));

  const mergedAside = (value: unknown, id: string, kind: 'references' | 'code', label: string): ComposedAside | null => {
    const sections = tolerantAsideSections(value);
    if (sections.length === 0) return null;
    const groups = sections.flatMap((section) => section.groups);
    return { id, kind, label, count: countAsideGroups(groups), hint: hintOfAsideGroups(groups), groups };
  };
  const referencesAside = mergedAside(briefRecord.references, 'context-references', 'references', 'Canonical references');
  const codeAside = mergedAside(briefRecord.codeInsights, 'context-code', 'code', 'Existing code insights');

  const asides: ComposedAside[] = [
    ...amendmentsAsides,
    ...(referencesAside ? [referencesAside] : []),
    ...(codeAside ? [codeAside] : []),
  ];

  return {
    intro,
    boundary,
    boundaryNotes,
    areas,
    decisionCount,
    decisionsPreamble: brief.decisionsPreamble,
    openPanel,
    discretionPanel,
    specifics,
    deferred,
    stats,
    refTargets,
    extras,
    asides,
  };
}
