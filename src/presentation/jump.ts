// The quick-jump palette's resolver (Phase 13, 13-01): a typed string in, grouped rows out. Pure - no I/O,
// no React, never throws, and it reads only the presentation (and the search hits and bodies) it is handed,
// so one request's rows come from one project's ready bundle and never from the filesystem (D-17).
//
// The group contract: JumpGroupKey names every group in its fixed order (exact, ids, pages, files, content).
// This plan ships the Exact producer for decision and finding ids; 13-04 adds the IDs, Pages and Files
// producers inside buildJumpGroups, filling the same JumpRow shape, and the palette host renders whatever
// groups come back. Like search.ts, this module never imports server/search-index.ts: the search hits are
// the structural SearchHitLike.
import type { MilestoneDto, PhaseDto, ProjectPresentation } from '../server/project-presentation.ts';
import { decisionAnchor, findingAnchor } from './jump-anchors.ts';
import { headPhaseOf, displayPhaseNumber } from './dashboard-head.ts';
import { rootDocumentRedirect } from './root-redirects.ts';
import { buildPhaseUrl } from './routes.ts';
import { extractSnippets } from './search.ts';
import type { SearchHighlightRange, SearchHitLike, SearchSnippet } from './search.ts';

export type JumpGroupKey = 'exact' | 'ids' | 'pages' | 'files' | 'content';

export type JumpRowKind =
  | 'decision'
  | 'finding'
  | 'requirement'
  | 'mention'
  | 'plan'
  | 'quick'
  | 'page'
  | 'file'
  | 'content';

export interface JumpChip {
  label: string;
  tone: 'complete' | 'quiet';
}

export interface JumpRow {
  /** Unique within one response; the palette's React key. */
  key: string;
  kind: JumpRowKind;
  /** The ID as the file writes it, for an ID row; else null. */
  id: string | null;
  title: string;
  subtitle: string;
  /** A project-relative address, server-built. */
  url: string;
  /** The element id the page scrolls to (jump-anchors.ts), or null. */
  anchor: string | null;
  chips: JumpChip[];
  artifactKind: string | null;
  phaseKey: string | null;
  titleHighlights: SearchHighlightRange[];
  subtitleHighlights: SearchHighlightRange[];
  snippet: SearchSnippet | null;
}

export interface JumpGroup {
  key: JumpGroupKey;
  rows: JumpRow[];
}

/** A file the palette may offer to open (the Files producer, 13-04). */
export interface JumpDocument {
  path: string;
  title: string;
  kind: string;
  url: string;
}

export interface JumpInput {
  query: string;
  presentation: ProjectPresentation;
  documents: readonly JumpDocument[];
  contentHits: readonly SearchHitLike[];
  /** The indexed body of a path, or null when the file has none. */
  bodyOf: (path: string) => string | null;
  /** The address the palette was opened on (untrusted; see viewingPhaseKey). */
  from: string;
}

export interface JumpResult {
  groups: JumpGroup[];
  contentTotal: number;
  /** The upper-cased ID the user typed when it has an ID shape and resolves to nothing, else null. */
  notFoundId: string | null;
}

/** UI-SPEC caps, settled: how many rows each group shows. */
export const JUMP_GROUP_CAPS: Readonly<Record<JumpGroupKey, number>> = {
  exact: 8,
  ids: 12,
  pages: 5,
  files: 6,
  content: 5,
};

export const JUMP_GROUP_LABELS: Readonly<Record<JumpGroupKey, string>> = {
  exact: 'Exact match',
  ids: 'IDs',
  pages: 'Pages',
  files: 'Files',
  content: 'Content matches',
};

/** The longest `from` address the resolver looks at. */
export const MAX_FROM_LENGTH = 512;
/** The longest query an exact ID compare runs for. */
export const MAX_ID_LENGTH = 32;

const GROUP_ORDER: readonly JumpGroupKey[] = ['exact', 'ids', 'pages', 'files', 'content'];
const TITLE_MAX = 140;
// Anchored, bounded shapes: a query that fits neither is not an ID.
const DECISION_SHAPE = /^D-\d{1,4}$/i;
const FINDING_SHAPE = /^[A-Z]{2}-\d{1,4}$/i;

/** 'Phase 5' ('05' reads 5, '2.1' stays 2.1), prefixed with the milestone version and ' · ' when the milestone
 * is archived. */
export function phaseLabelOf(phase: PhaseDto, milestone: MilestoneDto): string {
  const number = displayPhaseNumber(phase.identity.number) ?? phase.identity.number;
  const label = `Phase ${number}`;
  return milestone.archived ? `${milestone.version ?? milestone.name} · ${label}` : label;
}

// A control character in an address is never one the router produced.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * The phase the palette was opened on, or null. `from` is untrusted: it is used only when it is a plain
 * absolute path (one leading '/', at most MAX_FROM_LENGTH characters, no control characters), and even then
 * it is only compared with addresses already in the presentation - never turned into a path, never read.
 */
export function viewingPhaseKey(presentation: ProjectPresentation, from: unknown): string | null {
  if (typeof from !== 'string') return null;
  if (from.length === 0 || from.length > MAX_FROM_LENGTH) return null;
  if (!from.startsWith('/') || from.startsWith('//')) return null;
  if (CONTROL_CHARACTER.test(from)) return null;
  const cut = from.search(/[?#]/);
  const address = cut < 0 ? from : from.slice(0, cut);

  const artifact = presentation.artifacts.find((candidate) => candidate.key === address);
  if (artifact?.phaseKey) return artifact.phaseKey;

  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      for (const plan of phase.plans) {
        if (plan.key === address || plan.summary?.key === address) return phase.key;
      }
    }
  }

  let best: { key: string; length: number } | null = null;
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      const url = buildPhaseUrl(phase.identity);
      if (address === url || address.startsWith(`${url}/`)) {
        if (best === null || url.length > best.length) best = { key: phase.key, length: url.length };
      }
    }
  }
  return best?.key ?? null;
}

/** D-04: the phase you are viewing, else STATE's current phase, else null. */
export function currentPhaseKey(presentation: ProjectPresentation, from: unknown): string | null {
  return viewingPhaseKey(presentation, from) ?? headPhaseOf(presentation)?.key ?? null;
}

interface PhasePlace {
  phase: PhaseDto;
  milestone: MilestoneDto;
  /** 0.. for the live milestones in order, then the archived ones newest first. */
  rank: number;
  /** The phase's position in its milestone. */
  index: number;
}

function phasePlaces(presentation: ProjectPresentation): Map<string, PhasePlace> {
  const live = presentation.milestones.filter((milestone) => !milestone.archived);
  // presentation.milestones carries the archived ones version-ascending, so reverse for newest first.
  const archived = presentation.milestones.filter((milestone) => milestone.archived).reverse();
  const places = new Map<string, PhasePlace>();
  [...live, ...archived].forEach((milestone, rank) => {
    milestone.phases.forEach((phase, index) => {
      places.set(phase.key, { phase, milestone, rank, index });
    });
  });
  return places;
}

/** One line of plain text: whitespace runs collapse, emphasis markers and backticks go, long text is cut. */
function oneLine(text: string): string {
  const flat = text
    .replace(/\s+/g, ' ')
    .replace(/[*_`]/g, '')
    .trim();
  return flat.length > TITLE_MAX ? `${flat.slice(0, TITLE_MAX - 1).trimEnd()}…` : flat;
}

interface IdEntry {
  id: string;
  title: string;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** The entries of `list` that carry a string id and a string `titleField`, one per id. */
function idEntries(list: unknown, titleField: string): IdEntry[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: IdEntry[] = [];
  for (const raw of list) {
    const entry = recordOf(raw);
    if (entry === null) continue;
    const id = entry.id;
    const title = entry[titleField];
    if (typeof id !== 'string' || id.length === 0 || typeof title !== 'string') continue;
    const folded = id.toUpperCase();
    if (seen.has(folded)) continue;
    seen.add(folded);
    out.push({ id, title });
  }
  return out;
}

/** Every finding id the review page anchors: structured.review.findings (the projection
 * composeReviewThreads reads), else, for a review with no such projection, structured.warnings. */
function findingEntries(structured: Record<string, unknown>): IdEntry[] {
  const review = recordOf(structured.review);
  if (review !== null) return idEntries(review.findings, 'title');
  return idEntries(structured.warnings, 'title');
}

interface Site {
  kind: 'decision' | 'finding';
  id: string;
  title: string;
  artifactPath: string;
  artifactKey: string;
  artifactKind: string;
  artifactTitle: string;
  phaseKey: string | null;
}

/** Every definition site of the typed ID, walked straight from the artifacts: the reference registry's
 * resolution maps collapse a repeated ID to null, which would lose every site but one. */
function exactSites(presentation: ProjectPresentation, folded: string): Site[] {
  const sites: Site[] = [];
  for (const artifact of presentation.artifacts) {
    let kind: Site['kind'];
    let entries: IdEntry[];
    if (artifact.kind === 'context') {
      kind = 'decision';
      entries = idEntries(artifact.structured.decisions, 'text');
    } else if (artifact.kind === 'review') {
      kind = 'finding';
      entries = findingEntries(artifact.structured);
    } else {
      continue;
    }
    for (const entry of entries) {
      if (entry.id.toUpperCase() !== folded) continue;
      sites.push({
        kind,
        id: entry.id,
        title: entry.title,
        artifactPath: artifact.path,
        artifactKey: artifact.key,
        artifactKind: artifact.kind,
        artifactTitle: artifact.title,
        phaseKey: artifact.phaseKey,
      });
    }
  }
  return sites;
}

function exactRows(input: JumpInput, query: string): JumpRow[] {
  if (query.length === 0 || query.length > MAX_ID_LENGTH) return [];
  const presentation = input.presentation;
  const sites = exactSites(presentation, query.toUpperCase());
  if (sites.length === 0) return [];

  const places = phasePlaces(presentation);
  const current = currentPhaseKey(presentation, input.from);
  const NO_PHASE = Number.MAX_SAFE_INTEGER;
  const ordered = sites
    .map((site) => {
      const place = site.phaseKey === null ? undefined : places.get(site.phaseKey);
      return { site, place };
    })
    .sort((left, right) => {
      const leftCurrent = current !== null && left.site.phaseKey === current ? 0 : 1;
      const rightCurrent = current !== null && right.site.phaseKey === current ? 0 : 1;
      if (leftCurrent !== rightCurrent) return leftCurrent - rightCurrent;
      const rank = (left.place?.rank ?? NO_PHASE) - (right.place?.rank ?? NO_PHASE);
      if (rank !== 0) return rank;
      const index = (left.place?.index ?? 0) - (right.place?.index ?? 0);
      if (index !== 0) return index;
      return left.site.artifactPath < right.site.artifactPath
        ? -1
        : left.site.artifactPath > right.site.artifactPath
          ? 1
          : 0;
    })
    .slice(0, JUMP_GROUP_CAPS.exact);

  return ordered.map(({ site, place }, position) => {
    const where = site.kind === 'decision' ? 'CONTEXT' : 'REVIEW';
    const phaseLabel = place ? phaseLabelOf(place.phase, place.milestone) : null;
    const chips: JumpChip[] = [];
    if (position === 0) chips.push({ label: 'Exact', tone: 'complete' });
    else if (phaseLabel !== null) chips.push({ label: phaseLabel, tone: 'quiet' });
    return {
      key: `exact:${site.kind}:${site.artifactPath}:${site.id}`,
      kind: site.kind,
      id: site.id,
      title: oneLine(site.title),
      subtitle: phaseLabel === null ? site.artifactTitle : `${phaseLabel} · ${where}`,
      url: site.artifactKey,
      anchor: site.kind === 'decision' ? decisionAnchor(site.id) : findingAnchor(site.id),
      chips,
      artifactKind: site.artifactKind,
      phaseKey: site.phaseKey,
      titleHighlights: [],
      subtitleHighlights: [],
      snippet: null,
    };
  });
}

/** The Content group: the first JUMP_GROUP_CAPS.content search hits, each with its first snippet drawn from the
 * indexed body (highlight ranges into plain text, never markup). A root document that has a designed page opens
 * there, the rule search.ts applies to its own rows. */
function contentRows(input: JumpInput): JumpRow[] {
  const artifactsByPath = new Map(input.presentation.artifacts.map((artifact) => [artifact.path, artifact]));
  return input.contentHits.slice(0, JUMP_GROUP_CAPS.content).map((hit) => {
    const body = input.bodyOf(hit.path);
    const snippet = body === null ? null : (extractSnippets(body, hit.matchedTerms).snippets[0] ?? null);
    return {
      key: `content:${hit.path}`,
      kind: 'content',
      id: null,
      title: hit.title,
      subtitle: hit.path,
      url: rootDocumentRedirect(artifactsByPath.get(hit.path)) ?? hit.url,
      anchor: null,
      chips: [],
      artifactKind: hit.kind,
      phaseKey: hit.phaseKey,
      titleHighlights: [],
      subtitleHighlights: [],
      snippet,
    };
  });
}

/**
 * The palette's rows for a typed string. Groups come out in the fixed GROUP_ORDER and a group with no rows
 * is left out. `notFoundId` lets the palette say "No D-99 in this project." instead of a generic no-match
 * line when an ID-shaped query resolves to nothing.
 */
export function buildJumpGroups(input: JumpInput): JumpResult {
  const query = input.query.trim();
  const byGroup: Partial<Record<JumpGroupKey, JumpRow[]>> = {};

  byGroup.exact = exactRows(input, query);
  byGroup.content = contentRows(input);

  const groups: JumpGroup[] = [];
  for (const key of GROUP_ORDER) {
    const rows = byGroup[key];
    if (rows !== undefined && rows.length > 0) groups.push({ key, rows });
  }

  const exactEmpty = (byGroup.exact ?? []).length === 0;
  const idShaped = query.length <= MAX_ID_LENGTH && (DECISION_SHAPE.test(query) || FINDING_SHAPE.test(query));
  return {
    groups,
    contentTotal: input.contentHits.length,
    notFoundId: exactEmpty && idShaped ? query.toUpperCase() : null,
  };
}
