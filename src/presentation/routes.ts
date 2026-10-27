// The presentation URL grammar (D-01 to D-07): a `Route` union, `buildUrl`, the total `parseRoutePath` and
// `addressOfPath`, which turns a file's path under `.planning/` into the one clean address it would like
// (`/v1.1/phase-5/plan-03`, `/quick/261024-qhq/summary`, `/codebase/architecture`). Every address here is
// project-relative: nav.tsx prepends the project slug in one place. The route table (route-table.ts)
// decides which file actually gets a clean address and gives every other file its lossless `file/` address,
// so no two files ever share a URL.
//
// The four builders every importer already uses (`buildArtifactUrl`, `buildPhaseUrl`, `buildPlanUrl`,
// `buildMilestoneUrl`) keep their names and signatures and emit this grammar (07-06). The opaque key
// encoders live in identity-keys.ts (re-exported below, unchanged); the old token parser lives in
// legacy-routes.ts and serves only the redirect path.
import type { PhaseIdentity } from '../domain/model.ts';
import { EXACT_NAME_KINDS, folderRuleOf } from '../planning-repo/folders.ts';
import type { ExactNameWhere, NameRule } from '../planning-repo/folders.ts';
import {
  parseMilestoneFileName,
  parseMilestonePhasesDirName,
  parseMilestoneQuickDirName,
  parsePhaseArtifactName,
  parsePlanFileName,
  parseQuickArtifactName,
  parseQuickDirName,
} from '../planning-repo/naming.ts';
import { assertNonEmpty, encodePart } from './identity-keys.ts';
import {
  GSD_VERSION_PATTERN,
  LEGACY_FIRST_SEGMENTS,
  MILESTONE_SCOPE_RESERVED,
  PROJECT_PAGES,
  RESERVED_SEGMENT_PREFIXES,
  ROOT_TOKEN_RESERVED,
} from './reserved.ts';

export { artifactTokenOf, milestoneKeyOf, phaseKeyOf } from './identity-keys.ts';

// The pre-07 names of the parser and its types, kept so importers do not churn; they are the readable
// grammar's own parser and types. The legacy parser is imported from legacy-routes.ts by its own test and
// by the redirect path only.
export { parseRoutePath as parsePresentationUrl };
export type {
  Route as PresentationRoute,
  RouteErrorCode as PresentationRouteErrorCode,
  RouteParseResult as PresentationRouteParseResult,
};

/** Route patterns of the web's interim router; 07-07 replaces them with the readable dispatcher. */
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

const MILESTONE_ESCAPE = 'milestone-';

/**
 * The URL segment of a milestone version. A GSD-shaped version (`v1.1`, `v2.0.3`) is its own segment. Any
 * other version (`v1.0 / 旧`, or a word the parser reserves such as `roadmap` or `phase-2`) gets exactly one
 * `milestone-` prefix and its encoded text, so it can never be read as a page, a phase or a document; the
 * parser strips exactly one prefix and decodes the rest.
 */
export function milestoneSegmentOf(version: string): string {
  assertNonEmpty(version, 'Milestone version');
  return GSD_VERSION_PATTERN.test(version) ? version : `${MILESTONE_ESCAPE}${encodePart(version)}`;
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
    case 'plan': {
      // Digits in every real plan id; encoded so a hostile id can never add a segment or a scope.
      const planUrl = `${scopeUrl(route.milestone, route.phase)}/plan-${encodePart(route.planNumber)}`;
      return withHeading(route.doc === 'summary' ? `${planUrl}/summary` : planUrl, route.heading ?? undefined);
    }
    case 'document':
      return withHeading(route.url, route.heading ?? undefined);
    case 'legacy':
      return route.pathname;
  }
}

// --- Path to address -------------------------------------------------------------------------------------

const isDotName = (token: string): boolean => token === '' || token === '.' || token === '..';
const startsWithReservedPrefix = (token: string): boolean =>
  RESERVED_SEGMENT_PREFIXES.some((prefix) => token.startsWith(prefix));

/** Drops a trailing `.md`; a name that would become '', '.' or '..' keeps its full file name, so the
 * browser can never collapse the segment. */
function dropMarkdown(name: string): string {
  const token = name.replace(/\.md$/i, '');
  return isDotName(token) ? name : token;
}

/** The URL token of a file name under a folder's name rule (see NameRule in folders.ts). */
function tokenOfName(name: string, rule: NameRule): string {
  if (rule === 'keep-all') return name;
  return dropMarkdown(rule === 'gsd-lower' ? name.toLowerCase() : name);
}

/** `a/b/name` as encoded url text, the last segment through the name rule and the directories as written. */
function encodedTail(segments: readonly string[], rule: NameRule): string {
  const last = segments[segments.length - 1];
  return [...segments.slice(0, -1), tokenOfName(last, rule)].map(encodePart).join('/');
}

/** The lower-cased kind token of a recognised unprefixed file (COVERAGE.md, deferred-items.md,
 * SKELETON.md, .continue-here.md), where its exact-name row applies, else null. */
function exactNameToken(name: string, wheres: readonly ExactNameWhere[]): string | null {
  return EXACT_NAME_KINDS.find((row) => row.name === name && wheres.includes(row.where))?.kind ?? null;
}

/** The segments after the phase folder when `rel` (a path under `.planning/`) sits inside one, else null:
 * `phases/<dir>/...` or `milestones/<vX.Y-phases>/<dir>/...`. */
function phaseFolderRest(rel: readonly string[]): string[] | null {
  if (rel[0] === 'phases' && rel.length >= 3) return rel.slice(2);
  if (rel[0] === 'milestones' && rel.length >= 4) return rel.slice(3);
  return null;
}

const PLAN_LIKE = /^plan-\d+$/i;

/** A file inside a phase folder, or null when it takes the `file/` address. */
function phaseFileAddress(owner: PhaseIdentity, rest: readonly string[]): string | null {
  const base = scopeUrl(owner.milestoneVersion, owner);
  if (rest.length === 1) {
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
    const exact = exactNameToken(name, ['phase-or-quick', 'any']);
    if (exact !== null) return `${base}/${encodePart(exact)}`;
  }
  // Free-form: keep case, drop .md. A name that touches plan-<digits> could shadow a plan or its summary.
  const tail = [...rest.slice(0, -1), dropMarkdown(rest[rest.length - 1])];
  if (PLAN_LIKE.test(tail[0])) return null;
  return `${base}/${tail.map(encodePart).join('/')}`;
}

/** A file in a quick task folder (live `quick/<dir>/...` or archived `milestones/vX.Y-quick/<dir>/...`):
 * `segments` start at the task folder. The URL carries the task ID, never the folder slug (D-07). */
function quickAddress(segments: readonly string[]): string | null {
  if (segments.length < 2) return null;
  const dir = parseQuickDirName(segments[0]);
  if (!dir.matched) return null;
  const id = `${dir.date}-${dir.timeToken}`;
  const base = `/quick/${encodePart(id)}`;
  const rest = segments.slice(1);
  if (rest.length === 1) {
    const artifact = parseQuickArtifactName(rest[0]);
    if (artifact.matched) {
      if (artifact.quickId !== id) return null;
      if (artifact.artifact === 'PLAN') return base;
      if (artifact.artifact === 'SUMMARY') return `${base}/summary`;
      return `${base}/${encodePart(artifact.artifact.toLowerCase())}`;
    }
    const exact = exactNameToken(rest[0], ['phase-or-quick', 'any']);
    if (exact !== null) return `${base}/${encodePart(exact)}`;
  }
  const tail = [...rest.slice(0, -1), dropMarkdown(rest[rest.length - 1])];
  // A free-form `summary` would shadow the task's SUMMARY address.
  if (tail[0] === 'summary') return null;
  return `${base}/${tail.map(encodePart).join('/')}`;
}

/** A milestone's own document (`vX.Y-<token>.md`, at the root or in milestones/): `/<v>/<token>`. */
function milestoneDocumentAddress(version: string, document: string): string | null {
  const token = document.toUpperCase() === 'MILESTONE-AUDIT' ? 'audit' : document.toLowerCase();
  if (isDotName(token) || MILESTONE_SCOPE_RESERVED.has(token) || startsWithReservedPrefix(token)) return null;
  return `/${milestoneSegmentOf(version)}/${encodePart(token)}`;
}

/** Another archived folder of a milestone (`milestones/vX.Y-<name>/...`): `/<v>/<name>/<rest>` under the
 * matching folder row's name rule, else keep-case. */
function milestoneFolderAddress(version: string, name: string, rest: readonly string[]): string | null {
  const row = folderRuleOf(`${name}/${rest[0]}`);
  if (row?.folder === 'workstreams') return null;
  const segment = row?.urlSegment ?? name;
  const lower = segment.toLowerCase();
  if (isDotName(segment) || MILESTONE_SCOPE_RESERVED.has(lower) || startsWithReservedPrefix(lower)) return null;
  return `/${milestoneSegmentOf(version)}/${encodePart(segment)}/${encodedTail(rest, row?.nameRule ?? 'keep-case')}`;
}

function milestonesAddress(rel: readonly string[], owner: AddressOwner): string | null {
  if (rel.length === 2) {
    const file = parseMilestoneFileName(rel[1]);
    return file.matched ? milestoneDocumentAddress(file.version, file.document) : null;
  }
  const dir = rel[1];
  if (parseMilestonePhasesDirName(dir).matched) {
    const rest = owner === null ? null : phaseFolderRest(rel);
    return owner !== null && rest !== null ? phaseFileAddress(owner.phase, rest) : null;
  }
  if (parseMilestoneQuickDirName(dir).matched) return quickAddress(rel.slice(2));
  // `vX.Y-<name>` read through the one milestone-name grammar by giving it the shape of a document name.
  const folder = parseMilestoneFileName(`${dir}.md`);
  return folder.matched ? milestoneFolderAddress(folder.version, folder.document, rel.slice(2)) : null;
}

/** A file under a top-level folder of the folder table: `/<urlSegment>/<path>` under its name rule. */
function folderAddress(rel: readonly string[]): string | null {
  const rule = folderRuleOf(rel.join('/'));
  if (rule === null || rule.folder === 'workstreams') return null;
  return `/${encodePart(rule.urlSegment)}/${encodedTail(rel.slice(1), rule.nameRule)}`;
}

/** A file directly under `.planning/`: its lower-cased name without `.md` or `.json`. */
function rootFileAddress(name: string): string | null {
  if (name === 'config.json') return '/settings';
  const exact = exactNameToken(name, ['any']);
  if (exact !== null) return `/${encodePart(exact)}`;
  const milestoneFile = parseMilestoneFileName(name);
  if (milestoneFile.matched) return milestoneDocumentAddress(milestoneFile.version, milestoneFile.document);

  const lower = name.toLowerCase();
  const token = lower.replace(/\.(md|json)$/, '');
  if (isDotName(token)) return `/${encodePart(lower)}`;
  const isPageWord = (PROJECT_PAGES as readonly string[]).includes(token);
  // ROADMAP.md IS the roadmap page; any other file that lands on a page word, the settings or overview
  // address, a version shape or a reserved prefix would shadow something.
  if (
    GSD_VERSION_PATTERN.test(token) ||
    startsWithReservedPrefix(token) ||
    ROOT_TOKEN_RESERVED.has(token) ||
    (isPageWord && name !== 'ROADMAP.md')
  ) {
    return null;
  }
  return `/${encodePart(token)}`;
}

function addressInScope(rel: readonly string[], owner: AddressOwner): string | null {
  if (rel.length === 1) return rootFileAddress(rel[0]);
  switch (rel[0]) {
    case 'phases': {
      const rest = owner === null ? null : phaseFolderRest(rel);
      return owner !== null && rest !== null ? phaseFileAddress(owner.phase, rest) : null;
    }
    case 'quick':
      return quickAddress(rel.slice(1));
    case 'milestones':
      return milestonesAddress(rel, owner);
    default:
      return folderAddress(rel);
  }
}

/**
 * The one clean address a file would like, from its path (starting `.planning/`) and its owner. Pure and
 * total: anything that fits no clean pattern gets `fileUrlOf(path)`. This does NOT guarantee uniqueness;
 * the route table groups by this address and sends every file but one to `file/`.
 */
export function addressOfPath(path: string, owner: AddressOwner): string {
  return addressInScope(underPlanning(path).split('/'), owner) ?? fileUrlOf(path);
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

/** A decoded segment as a milestone version: a GSD-shaped version as is, or the text after exactly one
 * `milestone-` prefix. `'malformed'` is a bare prefix with nothing after it; null is not a milestone. */
function milestoneOfSegment(segment: string): { version: string } | 'malformed' | null {
  if (GSD_VERSION_PATTERN.test(segment)) return { version: segment };
  if (!segment.startsWith(MILESTONE_ESCAPE)) return null;
  const version = segment.slice(MILESTONE_ESCAPE.length);
  return version.length === 0 ? 'malformed' : { version };
}

function documentUrl(segments: readonly string[]): string {
  return `/${segments.map(encodePart).join('/')}`;
}

function isPage(segment: string): segment is PageName {
  return (PROJECT_PAGES as readonly string[]).includes(segment);
}

/** True for the old `/milestones/m~...` and `/artifacts/a~...` shapes, decided from the raw first two
 * segments only (`split` with a limit stops after three pieces, so a hostile path costs nothing). */
function isLegacyPath(path: string): boolean {
  const [, first, second] = path.split('/', 3);
  if (second === undefined || !(LEGACY_FIRST_SEGMENTS as readonly string[]).includes(first)) return false;
  return first === 'milestones' ? second === 'current' || second.startsWith('m~') : second.startsWith('a~');
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
 * `~` (or `%41` and `A`) give the same url. The old encoded shapes come back as a `legacy` route holding
 * the input untouched, for the redirect path to decode.
 */
export function parseRoutePath(input: string): RouteParseResult {
  const hashIndex = input.indexOf('#');
  if (isLegacyPath(hashIndex < 0 ? input : input.slice(0, hashIndex))) {
    return { ok: true, route: { kind: 'legacy', pathname: input } };
  }
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

  if (segments.length === 1) {
    const only = segments[0];
    if (isPage(only)) return { ok: true, route: { kind: 'page', page: only } };
    if (only === 'overview') return { ok: true, route: { kind: 'overview', milestone: null } };
  }

  // An optional leading milestone segment, then the scope it opens.
  const leading = milestoneOfSegment(segments[0]);
  if (leading === 'malformed') return failure('malformed-token', 'Milestone token is malformed', segments[0]);
  if (leading !== null && segments.length === 1) {
    return { ok: true, route: { kind: 'milestone', milestone: leading.version } };
  }
  const milestone = leading === null ? null : leading.version;
  const scoped = leading === null ? segments : segments.slice(1);

  if (milestone !== null && scoped.length === 1 && scoped[0] === 'overview') {
    return { ok: true, route: { kind: 'overview', milestone } };
  }
  if (scoped[0].startsWith('phase-')) {
    const phase = parsePhaseSegment(scoped[0]);
    if (phase === null) return failure('malformed-token', 'Phase token is malformed', scoped[0]);
    const tail = scoped.slice(1);
    if (tail.length === 0) return { ok: true, route: { kind: 'phase', milestone, phase, heading } };
    const planMatch = tail[0].match(PLAN_SEGMENT);
    if (planMatch && (tail.length === 1 || (tail.length === 2 && tail[1] === 'summary'))) {
      const doc = tail.length === 1 ? 'plan' : 'summary';
      return { ok: true, route: { kind: 'plan', milestone, phase, planNumber: planMatch[1], doc, heading } };
    }
    return { ok: true, route: { kind: 'document', url: `${scopeUrl(milestone, phase)}${documentUrl(tail)}`, heading } };
  }
  const url = milestone === null ? documentUrl(segments) : `/${milestoneSegmentOf(milestone)}${documentUrl(scoped)}`;
  return { ok: true, route: { kind: 'document', url, heading } };
}

// ---------------------------------------------------------------------------------------------------------
// The builders (names and signatures unchanged since v1.1; output is the readable grammar)
// ---------------------------------------------------------------------------------------------------------

/** D-04: a milestone's `/<v>/overview` page (`/overview` for the unversioned project). */
export function buildMilestoneUrl(version: string | null): string {
  return buildUrl({ kind: 'overview', milestone: version });
}

/** D-01: a phase page; the milestone segment is always present for a phase that has a milestone. */
export function buildPhaseUrl(identity: PhaseIdentity, heading?: string): string {
  return buildUrl({
    kind: 'phase',
    milestone: identity.milestoneVersion,
    phase: { projectCode: identity.projectCode, number: identity.number },
    heading: heading ?? null,
  });
}

function planRouteOf(
  identity: PhaseIdentity,
  planId: string,
  doc: 'plan' | 'summary',
  heading?: string,
): Route {
  assertNonEmpty(planId, 'Plan id');
  return {
    kind: 'plan',
    milestone: identity.milestoneVersion,
    phase: { projectCode: identity.projectCode, number: identity.number },
    planNumber: planId.slice(planId.lastIndexOf('-') + 1),
    doc,
    heading: heading ?? null,
  };
}

/** The plan page of a plan id (`07-06`): `/v1.1/phase-7/plan-06`. */
export function buildPlanUrl(identity: PhaseIdentity, planId: string, heading?: string): string {
  return buildUrl(planRouteOf(identity, planId, 'plan', heading));
}

/** D-05: the summary page of a plan id: `/v1.1/phase-7/plan-06/summary`. */
export function buildPlanSummaryUrl(identity: PhaseIdentity, planId: string): string {
  return buildUrl(planRouteOf(identity, planId, 'summary'));
}

/** The address a file would like given its owner (`addressOfPath`); the route table is the authority for
 * the address a file really has, and server code that holds a table reads it from there. */
export function buildArtifactUrl(
  identity: PhaseIdentity | null,
  artifactPath: string,
  heading?: string,
): string {
  return withHeading(addressOfPath(artifactPath, identity ? { phase: identity } : null), heading);
}
