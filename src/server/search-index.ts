// Full-text search index over the already-assembled ProjectSnapshot (FIND-01, FIND-02, FIND-05).
// Follows artifact-index.ts's shape exactly: a build*(snapshot) factory that reads the snapshot
// once and returns a frozen-shaped accessor — this module never imports node:fs or node:path, and
// never re-walks the filesystem. MiniSearch construction is scheduled off the request-serving path
// (D-04) so the server never blocks first paint on index readiness.
/// <reference types="node" />
import MiniSearch from 'minisearch';
import type { Artifact, PhaseIdentity } from '../domain/model.ts';
import type { ProjectSnapshot } from '../planning-repo/types.ts';
import { buildArtifactUrl, milestoneKeyOf, phaseKeyOf } from '../presentation/routes.ts';
import { segmentPlanBody } from '../rendering/plan-segments.ts';

/** Bounds per-request tokenization cost (T-03-01-01) — a query longer than this is truncated
 * before tokenization ever runs. */
export const MAX_QUERY_LENGTH = 256;

const DROPDOWN_SEARCH_OPTIONS = {
  prefix: true,
  fuzzy: false,
  combineWith: 'AND' as const,
  boost: { title: 3, frontmatterText: 2 },
};

export interface SearchDocument {
  id: string;
  path: string;
  kind: string;
  title: string;
  frontmatterText: string;
  body: string;
}

export interface SearchHit {
  path: string;
  title: string;
  kind: string;
  url: string;
  phaseKey: string | null;
  milestoneKey: string | null;
  score: number;
  matchedTerms: string[];
}

interface ReachableArtifact {
  artifact: Artifact;
  phaseIdentity: PhaseIdentity | null;
}

export type SearchIndexState =
  | { status: 'building' }
  | {
      status: 'ready';
      index: MiniSearch<SearchDocument>;
      documents: Map<string, SearchDocument>;
      owners: Map<string, PhaseIdentity | null>;
      builtAt: string;
    }
  | { status: 'error'; message: string };

/** The full API response shape `/api/search` returns in every readiness state. */
export interface SearchApiResponse {
  status: SearchIndexState['status'];
  query: string;
  total: number;
  results: SearchHit[];
}

// T-03-01-02 (DoS): anchored on the full token (^...$) with bounded quantifiers and no nested
// unbounded groups, so this cannot exhibit catastrophic backtracking regardless of input size or
// shape. The ID half reuses src/planning-repo/mentions.ts's ID_PATTERNS.requirement grammar (a
// letter, one-or-more letters/digits, a hyphen, two-or-more digits) anchored to the whole token
// instead of scanning prose for it; the path half requires at least one '/' with a bounded
// per-segment length (80) and a bounded segment count (21), so neither alternative can be driven
// into quadratic-time backtracking by a pathological query string.
const ID_OR_PATH_SHAPE = /^[A-Z][A-Z0-9]+-\d{2,}$|^[\w.-]{1,80}(?:\/[\w.-]{1,80}){1,20}$/;

// Splits on Unicode whitespace and a punctuation set that deliberately EXCLUDES '-', '/' and '.',
// so an ID token ('ROLE-07') and a path token ('backend/src/authz/mod.rs') survive tokenization
// intact instead of being shredded before processSearchTerm ever sees them. Carries the `u` flag
// and uses `\p{Z}` for whitespace so a non-ASCII path token tokenizes the same way an ASCII one
// does (FIND-02 encoding).
const TOKENIZE_SPLIT = /[\t\n\r\p{Z}]+|[!"#$%&'()*+,:;<=>?@[\]^`{|}~]+/u;

// Strips leading/trailing '.', '/' and '-' so a token like "src/foo.ts." (trailing sentence
// punctuation) or "-adapter" (leading hyphenated-list marker) normalizes before shape-testing.
const TRIM_SEPARATORS = /^[./-]+|[./-]+$/gu;

// Splits an ID/path-shaped literal into its constituent parts for the "split constituent parts"
// half of D-06's dual-indexing guarantee.
const SPLIT_PARTS = /[./-]+/u;

export function tokenizeSearchText(text: string, _field?: string): string[] {
  return text.split(TOKENIZE_SPLIT).filter((token) => token.length > 0);
}

/** D-06: an ID-or-path-shaped token is indexed as its intact lowercased literal AND every split
 * constituent part; an ordinary word is indexed as just its lowercased self. */
export function processSearchTerm(term: string, _field?: string): string | string[] | null {
  const trimmed = term.replace(TRIM_SEPARATORS, '');
  if (trimmed.length === 0) return null;
  const lower = trimmed.toLowerCase();
  if (!ID_OR_PATH_SHAPE.test(trimmed)) return lower;
  const parts = lower.split(SPLIT_PARTS).filter((part) => part.length > 1);
  return [lower, ...parts];
}

/** Every top-level GSD tree this project's ProjectSnapshot exposes an artifact map for, walked
 * uniformly so a future artifact-bearing collection (mirroring Phase.artifacts/QuickTask.artifacts)
 * needs no second copy of this function — search-index.ts's only artifact-discovery seam. */
function collectReachableArtifacts(snapshot: ProjectSnapshot): ReachableArtifact[] {
  const project = snapshot.project;
  if (!project) return [];
  const out: ReachableArtifact[] = [];
  for (const artifact of Object.values(project.artifacts)) {
    out.push({ artifact, phaseIdentity: null });
  }
  for (const phase of project.phases) {
    for (const artifact of Object.values(phase.artifacts)) {
      out.push({ artifact, phaseIdentity: phase.identity });
    }
  }
  return out;
}

/** Flattens frontmatter keys and scalar values (deeply) into one searchable string — never
 * re-derived by string-matching a rendered document, and cycle-guarded the same way
 * project-presentation.ts's jsonValue() is, since frontmatter can carry a self-referencing YAML
 * anchor. */
function flattenFrontmatter(value: unknown, into: string[], ancestors: Set<object>): void {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    if (value.length > 0) into.push(value);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    into.push(String(value));
    return;
  }
  if (typeof value !== 'object') return;
  if (ancestors.has(value)) return;
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    for (const item of value) flattenFrontmatter(item, into, nextAncestors);
    return;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    into.push(key);
    flattenFrontmatter(item, into, nextAncestors);
  }
}

function buildFrontmatterText(frontmatter: Record<string, unknown>): string {
  const parts: string[] = [];
  flattenFrontmatter(frontmatter, parts, new Set());
  return parts.join(' ');
}

/** Removes only the pseudo-XML wrapper tag tokens (open and close) segmentPlanBody recognizes from
 * a plan body, leaving the artifact's own prose between them verbatim — so `<action>` or `</task>`
 * never becomes a searchable term while the text those wrappers hold still does. Never calls the
 * artifact renderer; this reads the same segmenter the renderer uses, not its output. */
function stripPlanWrapperTags(body: string): string {
  const segments = segmentPlanBody(body);
  const ranges: Array<[number, number]> = [];
  for (const segment of segments) {
    if (segment.contentStart > segment.start) ranges.push([segment.start, segment.contentStart]);
    if (segment.end > segment.contentEnd) ranges.push([segment.contentEnd, segment.end]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let result = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) continue; // overlapping/duplicate span — already covered
    result += body.slice(cursor, start);
    cursor = Math.max(cursor, end);
  }
  result += body.slice(cursor);
  return result;
}

function toSearchDocument(artifact: Artifact): SearchDocument {
  return {
    id: artifact.path,
    path: artifact.path,
    kind: artifact.kind,
    title: artifact.title,
    frontmatterText: buildFrontmatterText(artifact.frontmatter),
    body: artifact.kind === 'plan' ? stripPlanWrapperTags(artifact.body) : artifact.body,
  };
}

/** Every artifact reachable from the assembled Project, one indexed document each (D-11). Reads
 * only Artifact.body/title/kind/frontmatter — never calls the artifact renderer, never re-walks
 * the filesystem. */
export function buildSearchDocuments(snapshot: ProjectSnapshot): SearchDocument[] {
  return collectReachableArtifacts(snapshot).map(({ artifact }) => toSearchDocument(artifact));
}

function buildMiniSearchIndex(documents: SearchDocument[]): MiniSearch<SearchDocument> {
  const index = new MiniSearch<SearchDocument>({
    idField: 'id',
    fields: ['title', 'frontmatterText', 'body'],
    tokenize: tokenizeSearchText,
    processTerm: processSearchTerm,
    searchOptions: DROPDOWN_SEARCH_OPTIONS,
  });
  index.addAll(documents);
  return index;
}

/**
 * Non-blocking index construction (D-04, FIND-05). `state()` starts at `{ status: 'building' }`;
 * `buildFrom` schedules the actual MiniSearch construction on a `setImmediate` callback so it never
 * runs synchronously inside `createApp` — the HTTP server has already started accepting connections
 * by the time this callback fires. `ready` is assigned in a single statement after `addAll`
 * returns, so no caller can ever observe a partially-populated index; a thrown build error is
 * captured as the `error` member rather than crashing the process.
 */
export function createSearchIndexState(): {
  state(): SearchIndexState;
  buildFrom(snapshot: ProjectSnapshot): void;
} {
  let current: SearchIndexState = { status: 'building' };
  return {
    state(): SearchIndexState {
      return current;
    },
    buildFrom(snapshot: ProjectSnapshot): void {
      setImmediate(() => {
        try {
          const reachable = collectReachableArtifacts(snapshot);
          const documents = reachable.map(({ artifact }) => toSearchDocument(artifact));
          const owners = new Map<string, PhaseIdentity | null>(
            reachable.map(({ artifact, phaseIdentity }) => [artifact.path, phaseIdentity]),
          );
          const index = buildMiniSearchIndex(documents);
          const documentsByPath = new Map(documents.map((doc) => [doc.path, doc]));
          current = {
            status: 'ready',
            index,
            documents: documentsByPath,
            owners,
            builtAt: new Date().toISOString(),
          };
        } catch (error) {
          current = { status: 'error', message: error instanceof Error ? error.message : String(error) };
        }
      });
    },
  };
}

/**
 * Total over every query shape: not ready → empty results (never throws, never delegates to
 * MiniSearch until the index exists); a query longer than MAX_QUERY_LENGTH is truncated before
 * tokenization ever runs; a query that tokenizes to zero terms returns an empty result list rather
 * than handing an empty term list to MiniSearch. Ordering is score descending, then path ascending
 * — an explicit tiebreak (not MiniSearch's own internal order) is what makes two runs of the same
 * query against the same state byte-stable.
 */
export function searchIndex(state: SearchIndexState, query: string): SearchHit[] {
  if (state.status !== 'ready') return [];
  const bounded = query.length > MAX_QUERY_LENGTH ? query.slice(0, MAX_QUERY_LENGTH) : query;
  const terms = tokenizeSearchText(bounded, 'query').flatMap((token) => {
    const processed = processSearchTerm(token, 'query');
    if (processed === null) return [];
    return Array.isArray(processed) ? processed : [processed];
  });
  if (terms.length === 0) return [];

  const results = state.index.search(bounded, DROPDOWN_SEARCH_OPTIONS);
  const hits: SearchHit[] = [];
  for (const result of results) {
    const doc = state.documents.get(String(result.id));
    if (!doc) continue;
    const phaseIdentity = state.owners.get(doc.path) ?? null;
    hits.push({
      path: doc.path,
      title: doc.title,
      kind: doc.kind,
      url: buildArtifactUrl(phaseIdentity, doc.path),
      phaseKey: phaseIdentity ? phaseKeyOf(phaseIdentity) : null,
      milestoneKey: phaseIdentity ? milestoneKeyOf(phaseIdentity.milestoneVersion) : null,
      score: result.score,
      matchedTerms: Object.keys(result.match),
    });
  }
  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return hits;
}
