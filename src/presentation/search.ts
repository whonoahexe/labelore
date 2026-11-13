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
import { parseMilestoneFileName, parseMilestoneQuickDirName } from '../planning-repo/naming.ts';
import type { ArtifactDto, MilestoneDto, ProjectPresentation } from '../server/project-presentation.ts';
import { artifactWarningTone, type ArtifactWarningTone } from './artifact-warning-tone.ts';
import { rootDocumentRedirect, sourceUrlOf } from './root-redirects.ts';
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
  /** 09 D-01: the address that opens the file itself (`/state?source=1`) for a root document whose title
   * leads to a designed page, else null. A snippet's heading lives in the file, so snippets lead here. */
  sourceUrl: string | null;
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
    // 09 D-01: a root document designed elsewhere leads to that page directly, with no redirect hop.
    url: rootDocumentRedirect(artifact) ?? hit.url,
    sourceUrl: sourceUrlOf(artifact),
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

// --- Sections: milestone, then phase (Phase 13, D-12, D-13, FIND-07) ---------------------------------------------

export type SearchSectionGroupKind = 'phase' | 'milestone-files' | 'quick';

export interface SearchSectionGroup {
  key: string;
  kind: SearchSectionGroupKind;
  /** The phase's name, 'Milestone files' or 'Quick tasks'. */
  label: string;
  /** The phase's number ('03', '2.1') for a phase group, else null. */
  phaseNumber: string | null;
  count: number;
  rows: SearchResultRow[];
}

export interface SearchMilestoneSection {
  key: string;
  version: string | null;
  /** The milestone's name. */
  label: string;
  archived: boolean;
  /** True only for a live milestone: the one the page opens expanded. */
  open: boolean;
  count: number;
  groups: SearchSectionGroup[];
}

export type SearchOutsideGroupKey = 'project' | 'quick' | 'research' | 'codebase' | 'other';

export interface SearchOutsideGroup {
  key: SearchOutsideGroupKey;
  label: string;
  count: number;
  rows: SearchResultRow[];
}

export interface SearchSections {
  milestones: SearchMilestoneSection[];
  outside: SearchOutsideGroup[];
}

const OUTSIDE_ORDER: readonly SearchOutsideGroupKey[] = ['project', 'quick', 'research', 'codebase', 'other'];
const OUTSIDE_LABELS: Record<SearchOutsideGroupKey, string> = {
  project: 'Project',
  quick: 'Quick tasks',
  research: 'Research',
  codebase: 'Codebase',
  other: 'Other',
};

// A folder under milestones/ that starts with a GSD version and a hyphen belongs to that milestone.
const MILESTONE_FOLDER_PREFIX = /^(v\d+\.\d+(?:\.\d+)?)-/i;

type SectionPlace =
  | { kind: 'phase'; milestoneKey: string; phaseKey: string }
  | { kind: 'milestone-files'; milestoneKey: string }
  | { kind: 'quick'; milestoneKey: string }
  | { kind: 'outside'; key: SearchOutsideGroupKey };

function milestoneByVersion(presentation: ProjectPresentation, version: string): MilestoneDto | null {
  const wanted = version.toLowerCase();
  return presentation.milestones.find((milestone) => milestone.version?.toLowerCase() === wanted) ?? null;
}

/** Where a milestone-root file lives, from the path segment after `milestones/`. */
function milestoneRootPlace(artifactPath: string, presentation: ProjectPresentation): SectionPlace {
  const segments = artifactPath.split('/');
  const at = segments.indexOf('milestones');
  const segment = at >= 0 ? segments[at + 1] : undefined;
  if (segment === undefined) return { kind: 'outside', key: 'other' };
  if (at + 2 === segments.length) {
    const file = parseMilestoneFileName(segment);
    const milestone = file.matched ? milestoneByVersion(presentation, file.version) : null;
    return milestone ? { kind: 'milestone-files', milestoneKey: milestone.key } : { kind: 'outside', key: 'other' };
  }
  const quick = parseMilestoneQuickDirName(segment);
  if (quick.matched) {
    const milestone = milestoneByVersion(presentation, quick.version);
    return milestone ? { kind: 'quick', milestoneKey: milestone.key } : { kind: 'outside', key: 'other' };
  }
  const prefixed = MILESTONE_FOLDER_PREFIX.exec(segment);
  const milestone = prefixed ? milestoneByVersion(presentation, prefixed[1]) : null;
  return milestone ? { kind: 'milestone-files', milestoneKey: milestone.key } : { kind: 'outside', key: 'other' };
}

/**
 * Groups hits by milestone, then phase, with the files that sit outside any phase beside them (D-12, D-13).
 * Every hit lands in exactly one group - anything unclassifiable goes to 'Other', never away (FIND-07). The
 * classification reads each hit's artifact in `presentation` (the index's own, never a newer bundle's) and
 * only recovers a version from a path where discovery leaves the artifact without one.
 *
 * Order: the live milestone first and open, archived milestones newest first and closed; inside one, its
 * phases in roadmap order, then Milestone files, then Quick tasks; the outside groups in a fixed order. A
 * group or milestone with no rows is left out.
 */
export function buildSearchSections(hits: readonly SearchHitLike[], presentation: ProjectPresentation): SearchSections {
  const artifactsByPath = new Map(presentation.artifacts.map((artifact) => [artifact.path, artifact]));
  const phaseOwner = new Map<string, MilestoneDto>();
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) phaseOwner.set(phase.key, milestone);
  }

  const phaseHits = new Map<string, SearchHitLike[]>();
  const filesHits = new Map<string, SearchHitLike[]>();
  const quickHits = new Map<string, SearchHitLike[]>();
  const outsideHits = new Map<SearchOutsideGroupKey, SearchHitLike[]>();
  const push = (map: Map<string, SearchHitLike[]>, key: string, hit: SearchHitLike): void => {
    const list = map.get(key);
    if (list) list.push(hit);
    else map.set(key, [hit]);
  };

  for (const hit of hits) {
    const artifact = artifactsByPath.get(hit.path);
    let place: SectionPlace;
    if (artifact === undefined) {
      place = { kind: 'outside', key: 'other' };
    } else if (artifact.kind.startsWith('codebase-')) {
      place = { kind: 'outside', key: 'codebase' };
    } else if (artifact.location === 'phase' || artifact.location === 'archived-phase') {
      const owner = hit.phaseKey ? phaseOwner.get(hit.phaseKey) : undefined;
      place = owner && hit.phaseKey
        ? { kind: 'phase', milestoneKey: owner.key, phaseKey: hit.phaseKey }
        : { kind: 'outside', key: 'other' };
    } else if (artifact.location === 'milestone-root') {
      place = milestoneRootPlace(artifact.path, presentation);
    } else if (artifact.location === 'root') {
      place = { kind: 'outside', key: 'project' };
    } else if (artifact.location === 'quick') {
      place = { kind: 'outside', key: 'quick' };
    } else if (artifact.location === 'research') {
      place = { kind: 'outside', key: 'research' };
    } else {
      place = { kind: 'outside', key: 'other' };
    }

    if (place.kind === 'phase') push(phaseHits, place.phaseKey, hit);
    else if (place.kind === 'milestone-files') push(filesHits, place.milestoneKey, hit);
    else if (place.kind === 'quick') push(quickHits, place.milestoneKey, hit);
    else {
      const list = outsideHits.get(place.key);
      if (list) list.push(hit);
      else outsideHits.set(place.key, [hit]);
    }
  }

  const live = presentation.milestones.filter((milestone) => !milestone.archived);
  // presentation.milestones carries the archived ones version-ascending, so reverse for newest first.
  const archived = presentation.milestones.filter((milestone) => milestone.archived).reverse();

  const milestones: SearchMilestoneSection[] = [];
  for (const milestone of [...live, ...archived]) {
    const groups: SearchSectionGroup[] = [];
    for (const phase of milestone.phases) {
      const found = phaseHits.get(phase.key);
      if (!found) continue;
      const rows = toRows(found, artifactsByPath);
      groups.push({
        key: phase.key,
        kind: 'phase',
        label: phase.name,
        phaseNumber: phase.identity.number,
        count: rows.length,
        rows,
      });
    }
    const files = filesHits.get(milestone.key);
    if (files) {
      const rows = toRows(files, artifactsByPath);
      groups.push({
        key: `${milestone.key}:files`,
        kind: 'milestone-files',
        label: 'Milestone files',
        phaseNumber: null,
        count: rows.length,
        rows,
      });
    }
    const quick = quickHits.get(milestone.key);
    if (quick) {
      const rows = toRows(quick, artifactsByPath);
      groups.push({
        key: `${milestone.key}:quick`,
        kind: 'quick',
        label: 'Quick tasks',
        phaseNumber: null,
        count: rows.length,
        rows,
      });
    }
    if (groups.length === 0) continue;
    milestones.push({
      key: milestone.key,
      version: milestone.version,
      label: milestone.name,
      archived: milestone.archived,
      open: !milestone.archived,
      count: groups.reduce((total, group) => total + group.count, 0),
      groups,
    });
  }

  const outside: SearchOutsideGroup[] = [];
  for (const key of OUTSIDE_ORDER) {
    const found = outsideHits.get(key);
    if (!found) continue;
    const rows = toRows(found, artifactsByPath);
    outside.push({ key, label: OUTSIDE_LABELS[key], count: rows.length, rows });
  }
  return { milestones, outside };
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
export function foldCase(input: string): string {
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
