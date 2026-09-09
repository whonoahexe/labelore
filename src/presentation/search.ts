// Pure projection module (no I/O) turning a ranked MiniSearch hit list into the grouped,
// snippet-bearing surface FIND-03/FIND-04 require. Shaped like src/presentation/roadmap.ts:
// input is already-assembled server DTOs, output is UI-ready rows with server-built URLs — no
// domain logic crosses to the client, and every URL here is the hit's own (already built through
// presentation/routes.ts by search-index.ts).
//
// Deliberately imports only from planning-repo/naming.ts and server/project-presentation.ts (plus
// the extracted slug function) — never from server/search-index.ts, so this module never depends on
// the MiniSearch/index-construction layer. `SearchHitLike` below is a structural redeclaration of
// search-index.ts's `SearchHit` shape for exactly that reason: TypeScript's structural typing means
// a real `SearchHit[]` satisfies it without an import.
import { parseMilestoneFileName } from '../planning-repo/naming.ts';
import type { ArtifactDto, ProjectPresentation } from '../server/project-presentation.ts';
import { artifactWarningTone, type ArtifactWarningTone } from './artifact-warning-tone.ts';
import { stableSlug } from '../rendering/slug.ts';

/** Structurally mirrors src/server/search-index.ts's `SearchHit` — redeclared, not imported (see
 * module header). Any object shaped like this (including a real `SearchHit`) satisfies it. */
export interface SearchHitLike {
  path: string;
  title: string;
  kind: string;
  url: string;
  phaseKey: string | null;
  milestoneKey: string | null;
  score: number;
  matchedTerms: string[];
}

export interface SearchHighlightRange {
  start: number;
  end: number;
}

export interface SearchSnippet {
  /** The raw-body slice this snippet windows over (never rendered HTML). */
  text: string;
  /** Merged, non-overlapping ranges into `text` that should render as `<mark>`. */
  highlights: SearchHighlightRange[];
  /** Offset of `text`'s start within the artifact's raw body — lets a caller reconstruct an
   * absolute body position from a highlight range if ever needed. */
  bodyOffset: number;
  /** Slug of the nearest preceding ATX heading, or null when none precedes this window. */
  anchor: string | null;
}

export interface SearchResultRow extends SearchHitLike {
  snippets: SearchSnippet[];
  /** Total occurrence count of every matched term in the body — may exceed `snippets.length`
   * when several occurrences merged into shared windows. */
  matchCount: number;
  /** D-12: the row's damaged-artifact tone, from the same shared `artifactWarningTone()` the tree
   * uses — the row still renders either way (degrade, don't hide) rather than being dropped. */
  warningTone: ArtifactWarningTone;
}

export type SearchGroupKind = 'phase' | 'root' | 'research' | 'quick' | 'archived-milestone' | 'other';

export interface SearchResultGroup {
  key: string;
  label: string;
  kind: SearchGroupKind;
  order: number;
  rows: SearchResultRow[];
}

// D-07 within-group clustering: plan, summary, context, then everything else as generic — two
// hits of the same cluster order by path ascending.
const KIND_RANK: Record<string, number> = { plan: 0, summary: 1, context: 2 };

function kindRank(kind: string): number {
  return KIND_RANK[kind] ?? 3;
}

function compareHits(left: SearchHitLike, right: SearchHitLike): number {
  const rankDiff = kindRank(left.kind) - kindRank(right.kind);
  if (rankDiff !== 0) return rankDiff;
  return left.path.localeCompare(right.path);
}

function toRow(hit: SearchHitLike, artifact: ArtifactDto | undefined): SearchResultRow {
  return {
    ...hit,
    snippets: [],
    matchCount: 0,
    // D-13: the tone is presentation metadata attached after `compareHits` has already ordered
    // the hits — it never feeds back into ranking.
    warningTone: artifact ? artifactWarningTone(artifact) : null,
  };
}

function toRows(hits: SearchHitLike[], artifactsByPath: Map<string, ArtifactDto>): SearchResultRow[] {
  return [...hits].sort(compareHits).map((hit) => toRow(hit, artifactsByPath.get(hit.path)));
}

interface MutableGroup {
  label: string;
  hits: SearchHitLike[];
}

/**
 * Groups ranked hits by location taxonomy first, artifact type second (D-07/FIND-03). Group order:
 * every active-milestone phase (in phase-number order), then root docs, then research/, then
 * quick/, then one group per archived milestone (version ascending, archived-phase + milestone-root
 * hits together), then a trailing group for anything left over. Every hit's group comes from the
 * artifact's own `location` field in `presentation.artifacts` — never re-derived from its path.
 */
export function buildSearchGroups(
  hits: readonly SearchHitLike[],
  presentation: ProjectPresentation,
): SearchResultGroup[] {
  const artifactsByPath = new Map(presentation.artifacts.map((artifact) => [artifact.path, artifact]));
  const activeMilestone = presentation.milestones.find((milestone) => !milestone.archived) ?? null;
  const archivedMilestonesInOrder = presentation.milestones.filter((milestone) => milestone.archived);

  const phaseGroups = new Map<string, MutableGroup>();
  const rootHits: SearchHitLike[] = [];
  const researchHits: SearchHitLike[] = [];
  const quickHits: SearchHitLike[] = [];
  const archivedGroups = new Map<string, MutableGroup>();
  const otherHits: SearchHitLike[] = [];

  for (const hit of hits) {
    const artifact = artifactsByPath.get(hit.path);
    const location = artifact?.location ?? 'other';

    if (location === 'phase') {
      const phase = activeMilestone?.phases.find((candidate) => candidate.key === hit.phaseKey);
      if (!phase) {
        otherHits.push(hit);
        continue;
      }
      const group = phaseGroups.get(phase.key) ?? { label: phase.name, hits: [] };
      group.hits.push(hit);
      phaseGroups.set(phase.key, group);
      continue;
    }

    if (location === 'root') {
      rootHits.push(hit);
      continue;
    }

    if (location === 'research') {
      researchHits.push(hit);
      continue;
    }

    if (location === 'quick') {
      quickHits.push(hit);
      continue;
    }

    if (location === 'archived-phase' || location === 'milestone-root') {
      const milestone = resolveArchivedMilestone(hit, artifact, presentation, archivedMilestonesInOrder);
      if (!milestone) {
        otherHits.push(hit);
        continue;
      }
      const group = archivedGroups.get(milestone.key) ?? { label: milestone.name, hits: [] };
      group.hits.push(hit);
      archivedGroups.set(milestone.key, group);
      continue;
    }

    otherHits.push(hit);
  }

  const groups: SearchResultGroup[] = [];
  let order = 0;

  // Active-milestone phase groups, in the phase order the milestone's own phase list already
  // carries (assembled and sorted by comparePhaseNumbers upstream) — no re-sort needed here.
  for (const phase of activeMilestone?.phases ?? []) {
    const group = phaseGroups.get(phase.key);
    if (!group) continue;
    groups.push({
      key: phase.key,
      label: group.label,
      kind: 'phase',
      order: order++,
      rows: toRows(group.hits, artifactsByPath),
    });
  }

  if (rootHits.length > 0) {
    groups.push({
      key: 'location:root',
      label: 'Root Documents',
      kind: 'root',
      order: order++,
      rows: toRows(rootHits, artifactsByPath),
    });
  }

  if (researchHits.length > 0) {
    groups.push({
      key: 'location:research',
      label: 'research/',
      kind: 'research',
      order: order++,
      rows: toRows(researchHits, artifactsByPath),
    });
  }

  if (quickHits.length > 0) {
    groups.push({
      key: 'location:quick',
      label: 'quick/',
      kind: 'quick',
      order: order++,
      rows: toRows(quickHits, artifactsByPath),
    });
  }

  // Archived milestones, in the version-ascending order presentation.milestones already carries.
  for (const milestone of archivedMilestonesInOrder) {
    const group = archivedGroups.get(milestone.key);
    if (!group) continue;
    groups.push({
      key: milestone.key,
      label: group.label,
      kind: 'archived-milestone',
      order: order++,
      rows: toRows(group.hits, artifactsByPath),
    });
  }

  if (otherHits.length > 0) {
    groups.push({
      key: 'location:other',
      label: 'Other',
      kind: 'other',
      order,
      rows: toRows(otherHits, artifactsByPath),
    });
  }

  return groups;
}

/**
 * An 'archived-phase' hit carries a resolvable milestoneKey via its own phaseIdentity (search-index
 * already built it through phaseKeyOf/milestoneKeyOf). A 'milestone-root' hit has no phase identity
 * at all, so its milestoneKey is always null on the hit — its version is recovered from the same
 * canonical filename grammar discovery.ts itself uses to classify it (parseMilestoneFileName), never
 * a bespoke path-prefix guess.
 */
function resolveArchivedMilestone(
  hit: SearchHitLike,
  artifact: ArtifactDto | undefined,
  presentation: ProjectPresentation,
  archivedMilestonesInOrder: ProjectPresentation['milestones'],
): ProjectPresentation['milestones'][number] | null {
  if (hit.milestoneKey) {
    return presentation.milestones.find((milestone) => milestone.key === hit.milestoneKey) ?? null;
  }
  const basename = (artifact?.path ?? hit.path).split('/').pop() ?? '';
  const parsed = parseMilestoneFileName(basename);
  if (!parsed.matched) return null;
  return archivedMilestonesInOrder.find((milestone) => milestone.version === parsed.version) ?? null;
}

// --- Snippet extraction (D-08, D-06) ---------------------------------------------------------

const DEFAULT_WINDOW_CHARS = 160;
// T-03-02-02 (DoS): plain indexOf scans, no constructed regular expression over corpus text, and
// the per-row snippet count is bounded by construction (one window per unconsumed occurrence).
const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;
const LOW_SURROGATE_MIN = 0xdc00;
const LOW_SURROGATE_MAX = 0xdfff;

interface Occurrence {
  start: number;
  end: number;
  term: string;
}

/** WR-02: a window candidate in absolute body coordinates, collected during seeding and merged
 * with any overlapping/abutting sibling before any text is sliced. `highlights` stays in absolute
 * body coordinates through the merge; only materialization converts to window-relative. */
interface CandidateWindow {
  start: number;
  end: number;
  highlights: SearchHighlightRange[];
}

/** WR-01: a length-preserving case fold. Iterates the input by code point (not UTF-16 unit),
 * lowercasing each one, but keeps the folded form only when its UTF-16 length equals the
 * original code point's UTF-16 length - otherwise the original code point is kept unchanged. This
 * makes the fold exactly length-preserving by construction, so index arithmetic performed against
 * the folded string (indexOf, slice) stays valid UTF-16 index arithmetic against the original,
 * unfolded string - no highlight range can drift off its match.
 *
 * Tradeoff, deliberate: a length-changing case mapping (e.g. 'İ' -> 'i' + COMBINING DOT ABOVE, one
 * UTF-16 unit -> two) is left unfolded and therefore will not participate in a case-insensitive
 * match at that position. This is strictly preferable to shifting every subsequent highlight range
 * in the document to accommodate one expanding character. (Verified: this returns "MATCH", not a
 * shifted slice, for the 'İMATCH end' / 'match' case.) */
function foldCase(input: string): string {
  let out = '';
  for (const char of input) {
    const folded = char.toLowerCase();
    out += folded.length === char.length ? folded : char;
  }
  return out;
}

function findOccurrences(bodyLower: string, term: string): Occurrence[] {
  const needle = foldCase(term);
  if (needle.length === 0) return [];
  const out: Occurrence[] = [];
  let cursor = 0;
  while (cursor <= bodyLower.length) {
    const index = bodyLower.indexOf(needle, cursor);
    if (index < 0) break;
    out.push({ start: index, end: index + needle.length, term: needle });
    cursor = index + needle.length;
  }
  return out;
}

function isHighSurrogate(code: number): boolean {
  return code >= HIGH_SURROGATE_MIN && code <= HIGH_SURROGATE_MAX;
}

function isLowSurrogate(code: number): boolean {
  return code >= LOW_SURROGATE_MIN && code <= LOW_SURROGATE_MAX;
}

/** Moves a boundary index outward (away from the match center) when it would otherwise fall
 * between the two halves of a UTF-16 surrogate pair. */
function safeBoundary(body: string, index: number, direction: -1 | 1): number {
  let boundary = Math.max(0, Math.min(index, body.length));
  if (boundary > 0 && boundary < body.length) {
    const before = body.charCodeAt(boundary - 1);
    const after = body.charCodeAt(boundary);
    if (isHighSurrogate(before) && isLowSurrogate(after)) {
      boundary += direction;
    }
  }
  return boundary;
}

function mergeHighlightRanges(ranges: SearchHighlightRange[]): SearchHighlightRange[] {
  const sorted = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: SearchHighlightRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

const ATX_HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/;

/** Scans backwards from `windowStart` for the nearest line that looks like a markdown ATX heading,
 * and slugs its text through the exact function the renderer uses for heading ids — so the fragment
 * always matches an id the renderer actually emitted. */
function resolveAnchor(body: string, windowStart: number): string | null {
  const before = body.slice(0, windowStart).split('\n');
  for (let index = before.length - 1; index >= 0; index -= 1) {
    const match = ATX_HEADING.exec(before[index].trim());
    if (match) return stableSlug(match[1]);
  }
  return null;
}

export interface ExtractSnippetsResult {
  snippets: SearchSnippet[];
  matchCount: number;
}

export interface ExtractSnippetsOptions {
  windowChars?: number;
}

/**
 * Locates every occurrence of every matched term in the artifact's raw markdown body (never
 * rendered HTML) and windows them into snippets. When occurrences of different terms overlap or
 * abut inside one window (e.g. an intact ID literal and one of its split parts, D-06), they merge
 * into a single window with merged, non-overlapping highlight ranges rather than producing separate
 * near-duplicate snippets. The longest matched term is preferred as a window's seed, so a snippet
 * naturally centers on the intact ID/path literal rather than a generic split-part word.
 *
 * WR-02: this merge is not limited to occurrences that landed inside one seed's window. Candidate
 * windows are collected in absolute body coordinates for every seed first, then sorted and merged
 * with any sibling window whose span overlaps or abuts - so two independently seeded windows that
 * happen to overlap (e.g. two matches spaced less than `windowChars` apart but more than
 * `windowChars / 2` apart, so neither consumes the other's occurrence at seed time) still produce
 * one merged snippet instead of two windows sharing duplicated body text.
 */
export function extractSnippets(
  body: string,
  matchedTerms: readonly string[],
  options: ExtractSnippetsOptions = {},
): ExtractSnippetsResult {
  const windowChars = options.windowChars ?? DEFAULT_WINDOW_CHARS;
  const half = windowChars / 2;
  // WR-01: length-preserving fold, not `body.toLowerCase()` - see foldCase's doc comment. A
  // length-changing case mapping (whole-string toLowerCase()) would desynchronize every index
  // found in the folded string from the original body's UTF-16 offsets.
  const bodyLower = foldCase(body);
  const uniqueTerms = [...new Set(matchedTerms.filter((term) => term.length > 0))];

  const occurrences = uniqueTerms.flatMap((term) => findOccurrences(bodyLower, term));
  const matchCount = occurrences.length;
  if (matchCount === 0) return { snippets: [], matchCount: 0 };

  // Priority order for picking window seeds: longest term first (the intact literal is always
  // longer than its split parts), then earliest position for a deterministic tiebreak.
  const priority = [...occurrences].sort(
    (left, right) => right.term.length - left.term.length || left.start - right.start,
  );
  const occurrenceIndex = new Map(occurrences.map((occurrence, index) => [occurrence, index]));
  const consumed = new Array<boolean>(occurrences.length).fill(false);

  // Pass 1 (seeding): collect every accepted window as a candidate in ABSOLUTE body coordinates -
  // no text sliced, no offsets converted to window-relative yet. Kept exactly as before: longest-
  // term-first seed priority, one window per unconsumed occurrence.
  const candidates: CandidateWindow[] = [];

  for (const seed of priority) {
    const seedIndex = occurrenceIndex.get(seed);
    if (seedIndex === undefined || consumed[seedIndex]) continue;

    const windowStart = safeBoundary(body, Math.max(0, seed.start - half), -1);
    const windowEnd = safeBoundary(body, Math.min(body.length, seed.end + half), 1);

    const highlights: SearchHighlightRange[] = [];
    for (let index = 0; index < occurrences.length; index += 1) {
      if (consumed[index]) continue;
      const occurrence = occurrences[index];
      if (occurrence.start >= windowStart && occurrence.end <= windowEnd) {
        // Absolute coordinates - converted to window-relative only at materialization, after
        // the merge pass below has had a chance to widen this window's span.
        highlights.push({ start: occurrence.start, end: occurrence.end });
        consumed[index] = true;
      }
    }

    candidates.push({ start: windowStart, end: windowEnd, highlights });
  }

  // Pass 2 (merge): a sort plus one linear pass over accepted windows - never a pairwise scan,
  // which could go quadratic on a body with many matches (T-Q1-03). Any candidate whose start
  // falls at or before the running window's end (overlap OR abut) is folded into it; its span
  // widens to the union and its highlights are appended.
  candidates.sort((left, right) => left.start - right.start);
  const mergedWindows: CandidateWindow[] = [];
  for (const candidate of candidates) {
    const last = mergedWindows[mergedWindows.length - 1];
    if (last && candidate.start <= last.end) {
      last.end = Math.max(last.end, candidate.end);
      last.highlights.push(...candidate.highlights);
    } else {
      mergedWindows.push({ start: candidate.start, end: candidate.end, highlights: [...candidate.highlights] });
    }
  }

  // Pass 3 (materialize): slice each merged window's text exactly once, convert its absolute
  // highlights to window-relative, and route them through the existing mergeHighlightRanges so the
  // ascending, non-overlapping guarantee highlightedSnippetNodes depends on holds after the union
  // (two merged windows' highlight sets are not pre-sorted with respect to each other).
  const snippets: SearchSnippet[] = mergedWindows.map((window) => {
    const relativeHighlights = window.highlights.map((highlight) => ({
      start: highlight.start - window.start,
      end: highlight.end - window.start,
    }));
    return {
      text: body.slice(window.start, window.end),
      highlights: mergeHighlightRanges(relativeHighlights),
      bodyOffset: window.start,
      anchor: resolveAnchor(body, window.start),
    };
  });

  snippets.sort((left, right) => left.bodyOffset - right.bodyOffset);
  return { snippets, matchCount };
}
