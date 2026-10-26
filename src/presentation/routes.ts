// The presentation URL grammar. Two things live here for now (07-04, additive until 07-06):
//
//  1. The READABLE grammar (D-01 to D-07): a `Route` union, `buildUrl`, the total `parseRoutePath` and
//     `addressOfPath`, which turns a file's path under `.planning/` into the one clean address it would
//     like (`/v1.1/phase-5/plan-03`, `/quick/261024-qhq/summary`, `/codebase/architecture`). Every address
//     here is project-relative: nav.tsx prepends the project slug in one place. The route table
//     (route-table.ts) decides which file actually gets a clean address and gives every other file its
//     lossless `file/` address, so no two files ever share a URL.
//  2. The OLD encoded builders (`buildPhaseUrl`, `buildPlanUrl`, ...), kept with today's output so the app
//     and every test stay green until 07-06 flips them. Their opaque key encoders moved to identity-keys.ts
//     (re-exported below, unchanged) and the old token parser moved to legacy-routes.ts.
import type { PhaseIdentity } from '../domain/model.ts';
import { parsePhaseArtifactName, parsePlanFileName } from '../planning-repo/naming.ts';
import { artifactTokenOf, assertNonEmpty, encodePart, milestoneKeyOf, phaseKeyOf } from './identity-keys.ts';
import { GSD_VERSION_PATTERN, PROJECT_PAGES } from './reserved.ts';

export { artifactTokenOf, milestoneKeyOf, phaseKeyOf } from './identity-keys.ts';
// The old parser and its types keep their old names for every current importer; legacy-routes.ts owns them.
export { parseLegacyUrl as parsePresentationUrl } from './legacy-routes.ts';
export type {
  LegacyRoute as PresentationRoute,
  LegacyRouteErrorCode as PresentationRouteErrorCode,
  LegacyRouteParseResult as PresentationRouteParseResult,
} from './legacy-routes.ts';

// ---------------------------------------------------------------------------------------------------------
// The old encoded builders (output unchanged until 07-06)
// ---------------------------------------------------------------------------------------------------------

export const presentationRoutePatterns = {
  dashboard: '/',
  roadmap: '/roadmap',
  search: '/search',
  traceability: '/traceability',
  sketches: '/sketches',
  research: '/research',
  milestone: '/milestones/:milestoneKey',
  phase: '/milestones/:milestoneKey/phases/:phaseKey',
  plan: '/milestones/:milestoneKey/phases/:phaseKey/plans/:planId',
  phaseArtifact: '/milestones/:milestoneKey/phases/:phaseKey/artifacts/:artifactToken',
  artifact: '/artifacts/:artifactToken',
} as const;

/** Appends a `#heading` fragment (leading hashes dropped, the rest encoded once). */
export function withHeading(path: string, heading?: string): string {
  if (heading === undefined) return path;
  const clean = heading.replace(/^#+/, '');
  assertNonEmpty(clean, 'Heading');
  return `${path}#${encodePart(clean)}`;
}

export function buildMilestoneUrl(version: string | null): string {
  return `/milestones/${milestoneKeyOf(version)}`;
}

export function buildPhaseUrl(identity: PhaseIdentity, heading?: string): string {
  return withHeading(
    `${buildMilestoneUrl(identity.milestoneVersion)}/phases/${phaseKeyOf(identity)}`,
    heading,
  );
}

export function buildPlanUrl(identity: PhaseIdentity, planId: string, heading?: string): string {
  assertNonEmpty(planId, 'Plan id');
  return withHeading(`${buildPhaseUrl(identity)}/plans/${encodePart(planId)}`, heading);
}

export function buildArtifactUrl(
  identity: PhaseIdentity | null,
  artifactPath: string,
  heading?: string,
): string {
  const token = artifactTokenOf(artifactPath);
  const path =
    identity === null ? `/artifacts/${token}` : `${buildPhaseUrl(identity)}/artifacts/${token}`;
  return withHeading(path, heading);
}

// ---------------------------------------------------------------------------------------------------------
// The readable grammar
// ---------------------------------------------------------------------------------------------------------

export type PageName = (typeof PROJECT_PAGES)[number];

/** A phase as a URL names it: the project code lower-cased and the number normalised (`05` is `5`). */
export interface PhaseAddress {
  projectCode: string | null;
  number: string;
}

/** Who owns a file when its address is computed: its phase, or null for everything else. A live phase's
 * identity carries the live milestone's version (STATE.md owns it), which a path alone cannot know. */
export type AddressOwner = { phase: PhaseIdentity } | null;

export type Route =
  | { kind: 'dashboard' }
  | { kind: 'page'; page: PageName }
  | { kind: 'milestone'; milestone: string }
  | { kind: 'overview'; milestone: string | null }
  | { kind: 'phase'; milestone: string | null; phase: PhaseAddress; heading: string | null }
  | {
      kind: 'plan';
      milestone: string | null;
      phase: PhaseAddress;
      planNumber: string;
      doc: 'plan' | 'summary';
      heading: string | null;
    }
  | { kind: 'document'; url: string; heading: string | null }
  | { kind: 'legacy'; pathname: string };

export type RouteErrorCode =
  'malformed-token' | 'truncated' | 'duplicate-token' | 'empty-token' | 'unsupported-route';

export type RouteParseResult =
  | { ok: true; route: Route }
  | { ok: false; error: { code: RouteErrorCode; message: string; token?: string } };

function failure(code: RouteErrorCode, message: string, token?: string): RouteParseResult {
  return { ok: false, error: { code, message, ...(token === undefined ? {} : { token }) } };
}

function decodePart(token: string): string | null {
  if (token.length === 0) return null;
  try {
    return decodeURIComponent(token);
  } catch {
    return null;
  }
}

function parseHeading(
  input: string,
): { ok: true; path: string; heading: string | null } | { ok: false; result: RouteParseResult } {
  const hashIndex = input.indexOf('#');
  if (hashIndex < 0) return { ok: true, path: input, heading: null };
  const path = input.slice(0, hashIndex);
  const rawHeading = input.slice(hashIndex + 1);
  if (rawHeading.length === 0) {
    return { ok: false, result: failure('empty-token', 'Heading token must not be empty') };
  }
  const heading = decodePart(rawHeading);
  if (heading === null || heading.length === 0) {
    return { ok: false, result: failure('malformed-token', 'Heading token is malformed', rawHeading) };
  }
  return { ok: true, path, heading };
}

/**
 * A phase number as a URL carries it, on the grammar `comparePhaseNumbers` reads: the base without leading
 * zeros, the variant letter lower-cased, each dotted part without leading zeros (`05` is `5`, `02.1` is
 * `2.1`, `12A` is `12a`). A value outside that grammar is lower-cased and nothing more. The text is NOT
 * percent-encoded here: `phaseSegmentOf` encodes the whole segment exactly once.
 */
export function normalizePhaseNumber(raw: string): string {
  const match = raw.match(/^(\d+)([A-Za-z]?)((?:\.\d+)*)$/);
  if (!match) return raw.toLowerCase();
  const stripZeros = (digits: string): string => digits.replace(/^0+(?=\d)/, '');
  const dotted = match[3] === '' ? '' : match[3].slice(1).split('.').map((part) => `.${stripZeros(part)}`).join('');
  return `${stripZeros(match[1])}${match[2].toLowerCase()}${dotted}`;
}

/** The URL segment of a phase: `phase-` + the lower-cased project code and `-` when present + the
 * normalised number, percent-encoded once. */
export function phaseSegmentOf(address: PhaseAddress | PhaseIdentity): string {
  assertNonEmpty(address.number, 'Phase number');
  const code = address.projectCode ? `${address.projectCode.toLowerCase()}-` : '';
  return encodePart(`phase-${code}${normalizePhaseNumber(address.number)}`);
}

/** The URL segment of a milestone version. A GSD-shaped version (`v1.1`) is its own segment. */
export function milestoneSegmentOf(version: string): string {
  assertNonEmpty(version, 'Milestone version');
  return encodePart(version);
}

const PLANNING_PREFIX = '.planning/';

function underPlanning(path: string): string {
  return path.startsWith(PLANNING_PREFIX) ? path.slice(PLANNING_PREFIX.length) : path;
}

/** The lossless address of any file: `/file/` + each segment of its path under `.planning/`, encoded once. */
export function fileUrlOf(path: string): string {
  return `/file/${underPlanning(path).split('/').map(encodePart).join('/')}`;
}

function scopeUrl(milestone: string | null, phase: PhaseAddress | PhaseIdentity): string {
  const phaseSegment = phaseSegmentOf(phase);
  return milestone === null ? `/${phaseSegment}` : `/${milestoneSegmentOf(milestone)}/${phaseSegment}`;
}

const PLAN_SEGMENT = /^plan-(\d+)$/;

export function buildUrl(route: Route): string {
  switch (route.kind) {
    case 'dashboard':
      return '/';
    case 'page':
      return `/${route.page}`;
    case 'milestone':
      return `/${milestoneSegmentOf(route.milestone)}`;
    case 'overview':
      return route.milestone === null ? '/overview' : `/${milestoneSegmentOf(route.milestone)}/overview`;
    case 'phase':
      return withHeading(scopeUrl(route.milestone, route.phase), route.heading ?? undefined);
    case 'plan':
      return withHeading(
        `${scopeUrl(route.milestone, route.phase)}/plan-${route.planNumber}${route.doc === 'summary' ? '/summary' : ''}`,
        route.heading ?? undefined,
      );
    case 'document':
      return withHeading(route.url, route.heading ?? undefined);
    case 'legacy':
      return route.pathname;
  }
}

// --- Path to address -------------------------------------------------------------------------------------

/** The segments after the phase folder when `rel` (a path under `.planning/`) sits inside one, else null:
 * `phases/<dir>/...` or `milestones/<vX.Y-phases>/<dir>/...`. */
function phaseFolderRest(rel: readonly string[]): string[] | null {
  if (rel[0] === 'phases' && rel.length >= 3) return rel.slice(2);
  if (rel[0] === 'milestones' && rel.length >= 4) return rel.slice(3);
  return null;
}

/** A file inside a phase folder, or null when it takes the `file/` address. */
function phaseFileAddress(owner: PhaseIdentity, rest: readonly string[]): string | null {
  const base = scopeUrl(owner.milestoneVersion, owner);
  if (rest.length !== 1) return null;
  const name = rest[0];
  const samePhase = (filePhase: string): boolean =>
    normalizePhaseNumber(filePhase) === normalizePhaseNumber(owner.number);

  const plan = parsePlanFileName(name);
  if (plan.matched) {
    if (!samePhase(plan.phase)) return null;
    return `${base}/plan-${plan.plan}${plan.kind === 'summary' ? '/summary' : ''}`;
  }
  const artifact = parsePhaseArtifactName(name);
  if (artifact.matched) {
    // D-06: a numeric prefix that is not the folder's own number takes the file/ address.
    if (!samePhase(artifact.phase)) return null;
    return `${base}/${encodePart(artifact.artifact.toLowerCase())}`;
  }
  return null;
}

/** A root file: its lower-cased name without `.md`. */
function rootFileAddress(name: string): string | null {
  if (!name.toLowerCase().endsWith('.md')) return null;
  const token = name.slice(0, -'.md'.length).toLowerCase();
  if (token === '' || token === '.' || token === '..') return null;
  return `/${encodePart(token)}`;
}

/**
 * The one clean address a file would like, from its path (starting `.planning/`) and its owner. Pure and
 * total: anything that fits no clean pattern gets `fileUrlOf(path)`. This does NOT guarantee uniqueness;
 * the route table groups by this address and sends every file but one to `file/`.
 */
export function addressOfPath(path: string, owner: AddressOwner): string {
  const rel = underPlanning(path).split('/');
  if (rel.length === 1) return rootFileAddress(rel[0]) ?? fileUrlOf(path);
  const phaseRest = owner === null ? null : phaseFolderRest(rel);
  if (owner !== null && phaseRest !== null) return phaseFileAddress(owner.phase, phaseRest) ?? fileUrlOf(path);
  return fileUrlOf(path);
}

// --- Address to route ------------------------------------------------------------------------------------

const PHASE_SEGMENT = /^phase-(?:([a-z][a-z0-9_]*)-)?(\d+[a-z]?(?:\.\d+)*)$/;

/** A `phase-...` segment (already decoded) as a phase address, or null when nothing follows the prefix. */
function parsePhaseSegment(segment: string): PhaseAddress | null {
  const lower = segment.toLowerCase();
  const match = lower.match(PHASE_SEGMENT);
  if (match) return { projectCode: match[1] ?? null, number: normalizePhaseNumber(match[2]) };
  const rest = lower.slice('phase-'.length);
  return rest.length === 0 ? null : { projectCode: null, number: normalizePhaseNumber(rest) };
}

function documentUrl(segments: readonly string[]): string {
  return `/${segments.map(encodePart).join('/')}`;
}

function isPage(segment: string): segment is PageName {
  return (PROJECT_PAGES as readonly string[]).includes(segment);
}

/**
 * Parses a project-relative path (what follows the slug) into a Route. Total: every input gives a Route or
 * a structured error, never a throw.
 *
 * Feed it the RAW pathname, never react-router's splat parameter: the router decodes the splat, so a
 * `%252F` would be decoded twice. This splits the raw text on `/` and decodes each segment exactly once.
 * A parsed Route is only a lookup key: nothing here, and no consumer, joins a Route field into a filesystem
 * path (the server looks a document up by url in the route table). A segment that decodes to `.` or `..` is
 * refused, so no parsed address can walk anywhere.
 *
 * A `#heading` fragment becomes `heading`. One trailing slash is ignored; any other empty segment is an
 * error. A `document` route carries the canonical re-encoding of its once-decoded segments, so `%7E` and
 * `~` (or `%41` and `A`) give the same url.
 */
export function parseRoutePath(input: string): RouteParseResult {
  const headingResult = parseHeading(input);
  if (!headingResult.ok) return headingResult.result;
  const { path, heading } = headingResult;
  if (!path.startsWith('/')) return failure('unsupported-route', 'Route must start with a slash');
  if (path === '/') return { ok: true, route: { kind: 'dashboard' } };

  const rawSegments = path.slice(1).split('/');
  if (rawSegments.length > 1 && rawSegments[rawSegments.length - 1] === '') rawSegments.pop();
  const segments: string[] = [];
  for (const raw of rawSegments) {
    if (raw.length === 0) return failure('empty-token', 'Route contains an empty token');
    const decoded = decodePart(raw);
    if (decoded === null || decoded === '.' || decoded === '..') {
      return failure('malformed-token', 'Route token is malformed', raw);
    }
    segments.push(decoded);
  }

  if (segments.length === 1 && isPage(segments[0])) {
    return { ok: true, route: { kind: 'page', page: segments[0] } };
  }

  // An optional milestone segment, then a phase scope.
  const hasMilestone = segments.length > 1 && GSD_VERSION_PATTERN.test(segments[0]);
  const milestone = hasMilestone ? segments[0] : null;
  const scoped = hasMilestone ? segments.slice(1) : segments;
  if (scoped[0].startsWith('phase-')) {
    const phase = parsePhaseSegment(scoped[0]);
    if (phase === null) return failure('malformed-token', 'Phase token is malformed', scoped[0]);
    const tail = scoped.slice(1);
    if (tail.length === 0) return { ok: true, route: { kind: 'phase', milestone, phase, heading } };
    const planMatch = tail[0].match(PLAN_SEGMENT);
    if (planMatch && (tail.length === 1 || (tail.length === 2 && tail[1] === 'summary'))) {
      return {
        ok: true,
        route: { kind: 'plan', milestone, phase, planNumber: planMatch[1], doc: tail.length === 1 ? 'plan' : 'summary', heading },
      };
    }
    const base = scopeUrl(milestone, phase);
    return { ok: true, route: { kind: 'document', url: `${base}${documentUrl(tail)}`, heading } };
  }
  return { ok: true, route: { kind: 'document', url: documentUrl(segments), heading } };
}
