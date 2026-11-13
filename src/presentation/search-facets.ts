// Pure facet module for the search surfaces (Phase 13, FIND-06): the selection a /search URL carries, the
// requirement each file is traced to, and the filtering and counts built from them. No I/O, and no import
// of server/search-index.ts - it reads hits through `SearchHitLike` (a real `SearchHit` satisfies it), so
// the server (13-03) and the search page (13-06) share one definition of "passes the filters" and "how many".
//
// The rules, from the phase's decisions:
// - D-08: a requirement filter keeps only files TRACED to that requirement (a plan's `requirements`, a
//   summary's `requirements-completed`, the owning phase's VERIFICATION, the root REQUIREMENTS.md), never a
//   file that merely mentions the ID in prose.
// - D-09: counts are disjunctive: each facet counts its values over the hits that pass every OTHER facet's
//   selection, and ignores its own, so picking one value never zeroes its siblings.
// - D-10: the URL is the state: repeated `phase`, `type` and `req` parameters, one writer, bounded reader.
import type { PhaseIdentity } from '../domain/model.ts';
import type { MilestoneDto, PhaseDto, ProjectPresentation } from '../server/project-presentation.ts';
import { buildPhaseUrl } from './routes.ts';
import type { SearchHitLike } from './search.ts';

export const FACET_DIMENSIONS = ['phase', 'type', 'req'] as const;
export type FacetDimension = (typeof FACET_DIMENSIONS)[number];

export interface FacetSelection {
  phase: string[];
  type: string[];
  req: string[];
}

export const EMPTY_SELECTION: Readonly<FacetSelection> = Object.freeze({ phase: [], type: [], req: [] });

/** T-13-06: at most this many values are read per dimension. */
export const MAX_FACET_VALUES = 50;
/** T-13-06: a value longer than this is not one the project can have. */
export const MAX_FACET_VALUE_LENGTH = 128;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/**
 * The selection a request carries. `read(dimension)` returns every raw value of that repeated parameter
 * (the server passes `c.req.queries(name) ?? []`, the page passes `searchParams.getAll(name)`). Bounded
 * before anything is counted: values holding a control character or longer than MAX_FACET_VALUE_LENGTH are
 * dropped, the rest are trimmed, deduped in first-seen order and capped at MAX_FACET_VALUES per dimension;
 * requirement ids are upper-cased (ids are written that way in the files).
 */
export function parseFacetSelection(read: (dimension: FacetDimension) => readonly string[]): FacetSelection {
  const selection: FacetSelection = { phase: [], type: [], req: [] };
  for (const dimension of FACET_DIMENSIONS) {
    const kept = new Set<string>();
    for (const raw of read(dimension)) {
      if (kept.size >= MAX_FACET_VALUES) break;
      if (typeof raw !== 'string' || hasControlCharacter(raw)) continue;
      const trimmed = raw.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_FACET_VALUE_LENGTH) continue;
      kept.add(dimension === 'req' ? trimmed.toUpperCase() : trimmed);
    }
    selection[dimension] = [...kept];
  }
  return selection;
}

/** The one writer of the search address (D-10): `q` first, then repeated phase, type and req. */
export function facetSearchParams(query: string, selection: FacetSelection): URLSearchParams {
  const params = new URLSearchParams();
  params.set('q', query);
  for (const dimension of FACET_DIMENSIONS) {
    for (const value of selection[dimension]) params.append(dimension, value);
  }
  return params;
}

/** A phase's filter token: its readable address without the leading slash ('v1.1/phase-3'). Unique across
 * milestones because the address carries the milestone. Part of shareable links, so it never changes shape. */
export function phaseTokenOf(identity: PhaseIdentity): string {
  return buildPhaseUrl(identity).replace(/^\//, '');
}

// --- The requirement each file is traced to (D-08) -----------------------------------------------------------

/** Ids named by a frontmatter value: an array of strings, or one comma-separated string. Never evaluated. */
function idsOf(value: unknown, known: ReadonlySet<string>): string[] {
  const raw: string[] = [];
  if (typeof value === 'string') raw.push(value);
  else if (Array.isArray(value)) for (const item of value) if (typeof item === 'string') raw.push(item);
  const out: string[] = [];
  for (const piece of raw.flatMap((text) => text.split(','))) {
    const id = piece.trim().toUpperCase();
    if (id.length > 0 && known.has(id)) out.push(id);
  }
  return out;
}

/** Natural order: runs of digits compare as numbers, so SIGN-2 sorts before SIGN-10. */
export function compareNatural(left: string, right: string): number {
  const leftParts = left.match(/\d+|\D+/g) ?? [];
  const rightParts = right.match(/\d+|\D+/g) ?? [];
  const shared = Math.min(leftParts.length, rightParts.length);
  for (let index = 0; index < shared; index += 1) {
    const a = leftParts[index];
    const b = rightParts[index];
    if (a === b) continue;
    const bothNumeric = /^\d/.test(a) && /^\d/.test(b);
    if (bothNumeric) {
      const diff = Number(a) - Number(b);
      if (diff !== 0) return diff;
      continue;
    }
    return a < b ? -1 : 1;
  }
  return leftParts.length - rightParts.length;
}

/**
 * path -> the requirement ids the file is traced to, sorted and deduped. Plans: frontmatter `requirements`;
 * summaries: `requirements-completed`; a VERIFICATION file: its phase's requirement ids; the root
 * REQUIREMENTS.md: every id the project defines. Only ids `presentation.requirements` defines are kept, so a
 * stray or hostile value never becomes a facet value. A file absent from the map has no requirement values.
 */
export function buildRequirementMap(presentation: ProjectPresentation): Map<string, string[]> {
  const known = new Set(presentation.requirements.map((requirement) => requirement.id.toUpperCase()));
  const phaseByKey = new Map<string, PhaseDto>();
  for (const milestone of presentation.milestones) for (const phase of milestone.phases) phaseByKey.set(phase.key, phase);

  const map = new Map<string, string[]>();
  for (const artifact of presentation.artifacts) {
    let ids: string[] = [];
    if (artifact.kind === 'plan') {
      ids = idsOf(artifact.frontmatter.requirements, known);
    } else if (artifact.kind === 'summary') {
      ids = idsOf(artifact.frontmatter['requirements-completed'], known);
    } else if (artifact.kind === 'verification') {
      const phase = artifact.phaseKey ? phaseByKey.get(artifact.phaseKey) : undefined;
      ids = phase ? idsOf(phase.requirementIds, known) : [];
    } else if (artifact.kind === 'requirements' && artifact.location === 'root') {
      ids = [...known];
    }
    if (ids.length > 0) map.set(artifact.path, [...new Set(ids)].sort(compareNatural));
  }
  return map;
}

// --- The context the filters and counts read ------------------------------------------------------------------

export interface PhaseFacetInfo {
  key: string;
  label: string;
  /** Live milestone first, archived newest first, roadmap order inside each. */
  order: number;
}

export interface FacetContext {
  phaseTokenByKey: Map<string, string>;
  phaseByToken: Map<string, PhaseFacetInfo>;
  requirementsByPath: Map<string, string[]>;
  knownKinds: Set<string>;
  knownRequirementIds: Set<string>;
}

/** '3' reads '03', '2.1' reads '02.1': the two-digit pad of the leading digits. */
function paddedNumber(number: string): string {
  return number.replace(/^\d+/, (digits) => digits.padStart(2, '0'));
}

function phaseLabel(phase: PhaseDto, milestone: MilestoneDto): string {
  const label = `${paddedNumber(phase.identity.number)} ${phase.name}`;
  return milestone.archived ? `${label} · ${milestone.version ?? milestone.name}` : label;
}

export function buildFacetContext(
  presentation: ProjectPresentation,
  documentKinds: Iterable<string>,
  requirementsByPath: Map<string, string[]>,
): FacetContext {
  const live = presentation.milestones.filter((milestone) => !milestone.archived);
  // presentation.milestones carries the archived ones version-ascending, so reverse for newest first.
  const archived = presentation.milestones.filter((milestone) => milestone.archived).reverse();
  const phaseTokenByKey = new Map<string, string>();
  const phaseByToken = new Map<string, PhaseFacetInfo>();
  let order = 0;
  for (const milestone of [...live, ...archived]) {
    for (const phase of milestone.phases) {
      const token = phaseTokenOf(phase.identity);
      phaseTokenByKey.set(phase.key, token);
      if (!phaseByToken.has(token)) {
        phaseByToken.set(token, { key: phase.key, label: phaseLabel(phase, milestone), order: order++ });
      }
    }
  }
  return {
    phaseTokenByKey,
    phaseByToken,
    requirementsByPath,
    knownKinds: new Set(documentKinds),
    knownRequirementIds: new Set(presentation.requirements.map((requirement) => requirement.id.toUpperCase())),
  };
}

/** URL contract: a value the project does not have is ignored, never echoed and never an error (T-13-07). */
export function knownSelection(selection: FacetSelection, context: FacetContext): FacetSelection {
  return {
    phase: selection.phase.filter((token) => context.phaseByToken.has(token)),
    type: selection.type.filter((kind) => context.knownKinds.has(kind)),
    req: selection.req.filter((id) => context.knownRequirementIds.has(id)),
  };
}

// --- Filtering and counting ------------------------------------------------------------------------------------

function valuesOf(hit: SearchHitLike, dimension: FacetDimension, context: FacetContext): readonly string[] {
  if (dimension === 'phase') {
    const token = hit.phaseKey ? context.phaseTokenByKey.get(hit.phaseKey) : undefined;
    return token === undefined ? [] : [token];
  }
  if (dimension === 'type') return [hit.kind];
  return context.requirementsByPath.get(hit.path) ?? [];
}

/** OR within a dimension, AND across them; `except` leaves one dimension out (its own, for its counts). */
function passes(
  hit: SearchHitLike,
  selection: FacetSelection,
  context: FacetContext,
  except: FacetDimension | null,
): boolean {
  for (const dimension of FACET_DIMENSIONS) {
    if (dimension === except) continue;
    const wanted = selection[dimension];
    if (wanted.length === 0) continue;
    if (!valuesOf(hit, dimension, context).some((value) => wanted.includes(value))) return false;
  }
  return true;
}

export function applyFacetSelection<Hit extends SearchHitLike>(
  hits: readonly Hit[],
  selection: FacetSelection,
  context: FacetContext,
): Hit[] {
  return hits.filter((hit) => passes(hit, selection, context, null));
}

export interface SearchFacetValue {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface SearchFacet {
  /** Hits passing every OTHER facet's selection: the count behind the facet's 'All' tab. */
  allCount: number;
  values: SearchFacetValue[];
}

export type SearchFacets = Record<FacetDimension, SearchFacet>;

function labelOf(dimension: FacetDimension, value: string, context: FacetContext): string {
  if (dimension === 'phase') return context.phaseByToken.get(value)?.label ?? value;
  return value;
}

/**
 * The counts for every facet over the full, unfiltered hit list (D-09). Each facet lists every value present
 * in the unfiltered hits (zero included) plus any selected value, counted over the hits that pass the OTHER
 * facets' selections; a hit with several values of a dimension adds one to each. `selection` is expected to
 * be known (see `knownSelection`). Ties never reorder between requests: types by unfiltered count then kind,
 * phases by roadmap order, requirements by natural id order.
 */
export function computeFacets(
  hits: readonly SearchHitLike[],
  selection: FacetSelection,
  context: FacetContext,
): SearchFacets {
  const facets = {} as SearchFacets;
  for (const dimension of FACET_DIMENSIONS) {
    const unfiltered = new Map<string, number>();
    for (const hit of hits) {
      for (const value of new Set(valuesOf(hit, dimension, context))) {
        unfiltered.set(value, (unfiltered.get(value) ?? 0) + 1);
      }
    }
    const counts = new Map<string, number>();
    for (const value of unfiltered.keys()) counts.set(value, 0);
    for (const value of selection[dimension]) if (!counts.has(value)) counts.set(value, 0);
    let allCount = 0;
    for (const hit of hits) {
      if (!passes(hit, selection, context, dimension)) continue;
      allCount += 1;
      for (const value of new Set(valuesOf(hit, dimension, context))) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const selected = new Set(selection[dimension]);
    const values: SearchFacetValue[] = [...counts].map(([value, count]) => ({
      value,
      label: labelOf(dimension, value, context),
      count,
      selected: selected.has(value),
    }));
    values.sort((left, right) => {
      if (dimension === 'type') {
        return (unfiltered.get(right.value) ?? 0) - (unfiltered.get(left.value) ?? 0) || left.value.localeCompare(right.value);
      }
      if (dimension === 'phase') {
        const leftOrder = context.phaseByToken.get(left.value)?.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = context.phaseByToken.get(right.value)?.order ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder || left.value.localeCompare(right.value);
      }
      return compareNatural(left.value, right.value);
    });
    facets[dimension] = { allCount, values };
  }
  return facets;
}
