// Decoder-only module for the encoded URLs Labelore used before v2.1 (`/milestones/m~.../phases/p~...`,
// `/artifacts/a~...`). Nothing new may import it except the redirect path that turns an old link into its
// readable address. It is deleted when milestone v2.1 closes (D-14): removing this file and its test
// removes no live code, because the key ENCODERS stayed behind in identity-keys.ts. The private helpers
// below are copies of the ones the readable grammar owns in routes.ts, so deleting this module takes them
// with it.
import type { PhaseIdentity } from '../domain/model.ts';
import { comparePhaseNumbers } from '../planning-repo/naming.ts';
import type {
  MilestoneDto,
  PhaseDto,
  ProjectPresentation,
} from '../server/project-presentation.ts';
import { ARTIFACT_PREFIX, MILESTONE_PREFIX } from './identity-keys.ts';
import { LEGACY_FIRST_SEGMENTS, PROJECT_PAGES } from './reserved.ts';
import { buildPhaseUrl, buildUrl, parseRoutePath, type Route } from './routes.ts';

const PHASE_PREFIX = 'p~';

export type LegacyRoute =
  | { kind: 'dashboard' }
  | { kind: 'roadmap' }
  | { kind: 'search' }
  | { kind: 'traceability' }
  | { kind: 'sketches' }
  | { kind: 'research' }
  | { kind: 'milestone'; milestoneVersion: string | null }
  | {
      kind: 'phase';
      milestoneVersion: string | null;
      phaseIdentity: PhaseIdentity;
      heading?: string;
    }
  | {
      kind: 'plan';
      milestoneVersion: string | null;
      phaseIdentity: PhaseIdentity;
      planId: string;
      heading: string | null;
    }
  | {
      kind: 'artifact';
      milestoneVersion: string | null;
      phaseIdentity: PhaseIdentity | null;
      artifactToken: string;
      artifactPath: string;
      heading: string | null;
    };

export type LegacyRouteErrorCode =
  'malformed-token' | 'truncated' | 'duplicate-token' | 'empty-token' | 'unsupported-route';

export type LegacyRouteParseResult =
  | { ok: true; route: LegacyRoute }
  | {
      ok: false;
      error: { code: LegacyRouteErrorCode; message: string; token?: string };
    };

function failure(code: LegacyRouteErrorCode, message: string, token?: string): LegacyRouteParseResult {
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

function parseNullablePart(token: string): { ok: true; value: string | null } | { ok: false } {
  if (token === 'n') return { ok: true, value: null };
  if (!token.startsWith('v')) return { ok: false };
  const decoded = decodePart(token.slice(1));
  return decoded === null ? { ok: false } : { ok: true, value: decoded };
}

function milestoneVersionOf(key: string): { ok: true; value: string | null } | { ok: false } {
  if (key === 'current') return { ok: true, value: null };
  if (!key.startsWith(MILESTONE_PREFIX)) return { ok: false };
  const decoded = decodePart(key.slice(MILESTONE_PREFIX.length));
  return decoded === null || decoded.length === 0 ? { ok: false } : { ok: true, value: decoded };
}

function phaseIdentityOf(key: string): { ok: true; value: PhaseIdentity } | { ok: false } {
  if (!key.startsWith(PHASE_PREFIX)) return { ok: false };
  const parts = key.split('~');
  if (parts.length !== 5 || parts[0] !== 'p') return { ok: false };
  const milestone = parseNullablePart(parts[1]);
  const projectCode = parseNullablePart(parts[2]);
  if (!milestone.ok || !projectCode.ok || !parts[3].startsWith('v') || !parts[4].startsWith('v')) {
    return { ok: false };
  }
  const number = decodePart(parts[3].slice(1));
  const slug = decodePart(parts[4].slice(1));
  if (number === null || number.length === 0 || slug === null) return { ok: false };
  return {
    ok: true,
    value: {
      milestoneVersion: milestone.value,
      projectCode: projectCode.value,
      number,
      slug,
    },
  };
}

function artifactPathOf(token: string): { ok: true; value: string } | { ok: false } {
  if (!token.startsWith(ARTIFACT_PREFIX)) return { ok: false };
  const path = decodePart(token.slice(ARTIFACT_PREFIX.length));
  return path === null || path.length === 0 ? { ok: false } : { ok: true, value: path };
}

function parseHeading(
  input: string,
):
  | { ok: true; path: string; heading: string | null }
  | { ok: false; result: LegacyRouteParseResult } {
  const hashIndex = input.indexOf('#');
  if (hashIndex < 0) return { ok: true, path: input, heading: null };
  const path = input.slice(0, hashIndex);
  const rawHeading = input.slice(hashIndex + 1);
  if (rawHeading.length === 0) {
    return { ok: false, result: failure('empty-token', 'Heading token must not be empty') };
  }
  const heading = decodePart(rawHeading);
  if (heading === null || heading.length === 0) {
    return {
      ok: false,
      result: failure('malformed-token', 'Heading token is malformed', rawHeading),
    };
  }
  return { ok: true, path, heading };
}

function duplicateReservedSegment(segments: string[]): string | null {
  for (const reserved of ['milestones', 'phases', 'plans', 'artifacts']) {
    if (segments.filter((segment) => segment === reserved).length > 1) return reserved;
  }
  return null;
}

export function parseLegacyUrl(input: string): LegacyRouteParseResult {
  const headingResult = parseHeading(input);
  if (!headingResult.ok) return headingResult.result;

  let pathname: string;
  try {
    pathname = new URL(headingResult.path, 'http://labelore.local').pathname;
  } catch {
    return failure('malformed-token', 'URL could not be parsed');
  }
  if (pathname === '/') return { ok: true, route: { kind: 'dashboard' } };
  const segments = pathname.slice(1).split('/');
  if (segments.some((segment) => segment.length === 0)) {
    return failure('empty-token', 'Route contains an empty token');
  }
  const duplicate = duplicateReservedSegment(segments);
  if (duplicate)
    return failure('duplicate-token', `Route repeats reserved token: ${duplicate}`, duplicate);
  if (segments.length === 1 && segments[0] === 'roadmap') {
    return { ok: true, route: { kind: 'roadmap' } };
  }
  if (segments.length === 1 && segments[0] === 'search') {
    return { ok: true, route: { kind: 'search' } };
  }
  if (segments.length === 1 && segments[0] === 'traceability') {
    return { ok: true, route: { kind: 'traceability' } };
  }
  if (segments.length === 1 && segments[0] === 'sketches') {
    return { ok: true, route: { kind: 'sketches' } };
  }
  if (segments.length === 1 && segments[0] === 'research') {
    return { ok: true, route: { kind: 'research' } };
  }

  if (segments[0] === 'artifacts') {
    if (segments.length < 2) return failure('truncated', 'Artifact route is truncated');
    if (segments.length !== 2)
      return failure('unsupported-route', 'Artifact route has extra tokens');
    const artifact = artifactPathOf(segments[1]);
    if (!artifact.ok) return failure('malformed-token', 'Artifact token is malformed', segments[1]);
    return {
      ok: true,
      route: {
        kind: 'artifact',
        milestoneVersion: null,
        phaseIdentity: null,
        artifactToken: segments[1],
        artifactPath: artifact.value,
        heading: headingResult.heading,
      },
    };
  }

  if (segments[0] !== 'milestones') {
    return failure('unsupported-route', 'URL is outside the presentation route tree');
  }
  if (segments.length < 2) return failure('truncated', 'Milestone route is truncated');
  const milestone = milestoneVersionOf(segments[1]);
  if (!milestone.ok) return failure('malformed-token', 'Milestone token is malformed', segments[1]);
  if (segments.length === 2) {
    return { ok: true, route: { kind: 'milestone', milestoneVersion: milestone.value } };
  }
  if (segments.length < 4 && segments[2] === 'phases') {
    return failure('truncated', 'Phase route is truncated');
  }
  if (segments[2] !== 'phases') {
    return failure('unsupported-route', 'Milestone child route is unsupported');
  }
  const phase = phaseIdentityOf(segments[3]);
  if (!phase.ok) return failure('malformed-token', 'Phase token is malformed', segments[3]);
  if (phase.value.milestoneVersion !== milestone.value) {
    return failure(
      'malformed-token',
      'Phase key does not belong to the milestone route',
      segments[3],
    );
  }
  if (segments.length === 4) {
    const route: LegacyRoute = {
      kind: 'phase',
      milestoneVersion: milestone.value,
      phaseIdentity: phase.value,
      ...(headingResult.heading === null ? {} : { heading: headingResult.heading }),
    };
    return { ok: true, route };
  }
  if (segments.length < 6) return failure('truncated', 'Nested phase route is truncated');
  if (segments.length > 6)
    return failure('unsupported-route', 'Nested phase route has extra tokens');

  if (segments[4] === 'plans') {
    const planId = decodePart(segments[5]);
    if (planId === null || planId.length === 0) {
      return failure('malformed-token', 'Plan token is malformed', segments[5]);
    }
    return {
      ok: true,
      route: {
        kind: 'plan',
        milestoneVersion: milestone.value,
        phaseIdentity: phase.value,
        planId,
        heading: headingResult.heading,
      },
    };
  }
  if (segments[4] === 'artifacts') {
    const artifact = artifactPathOf(segments[5]);
    if (!artifact.ok) return failure('malformed-token', 'Artifact token is malformed', segments[5]);
    return {
      ok: true,
      route: {
        kind: 'artifact',
        milestoneVersion: milestone.value,
        phaseIdentity: phase.value,
        artifactToken: segments[5],
        artifactPath: artifact.value,
        heading: headingResult.heading,
      },
    };
  }
  return failure('unsupported-route', 'Nested phase route is unsupported');
}

// ---------------------------------------------------------------------------------------------------------
// The redirect path (NAV-11): an old address becomes the readable one it stands for
// ---------------------------------------------------------------------------------------------------------

/** A redirect target is a project-relative path: one leading '/', never '//host' or '/\host' (which a
 * browser reads as another origin), and it must parse as a live route, never as another legacy shape, so a
 * redirect can neither leave the app nor loop (T-07-20, T-07-21). The query of a target is not part of the
 * route text. Anything else is null. */
function safeTarget(value: string | null): string | null {
  if (value === null || !value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  const cut = value.search(/[?#]/);
  const parsed = parseRoutePath(cut < 0 ? value : value.slice(0, cut));
  return parsed.ok && parsed.route.kind !== 'legacy' ? value : null;
}

function artifactTarget(artifactPath: string, presentation: ProjectPresentation): string | null {
  return presentation.artifacts.find((artifact) => artifact.path === artifactPath)?.key ?? null;
}

/** The milestone an old `m~` / `current` key names. `current` (a null version) is the live milestone: the
 * one that carries no version, else the first one not archived. */
function milestoneOf(
  version: string | null,
  presentation: ProjectPresentation,
): MilestoneDto | null {
  const { milestones } = presentation;
  if (version !== null) return milestones.find((candidate) => candidate.version === version) ?? null;
  return (
    milestones.find((candidate) => candidate.version === null) ??
    milestones.find((candidate) => !candidate.archived) ??
    null
  );
}

function phaseOf(
  milestoneVersion: string | null,
  identity: PhaseIdentity,
  presentation: ProjectPresentation,
): PhaseDto | null {
  const milestone = milestoneOf(milestoneVersion, presentation);
  if (milestone === null) return null;
  return (
    milestone.phases.find(
      (phase) =>
        phase.identity.projectCode === identity.projectCode &&
        phase.identity.slug === identity.slug &&
        comparePhaseNumbers(phase.identity.number, identity.number) === 0,
    ) ?? null
  );
}

function planTarget(
  route: Extract<LegacyRoute, { kind: 'plan' }>,
  search: string,
  presentation: ProjectPresentation,
): string | null {
  const phase = phaseOf(route.milestoneVersion, route.phaseIdentity, presentation);
  const plan = phase?.plans.find((candidate) => candidate.id === route.planId);
  if (plan === undefined) return null;
  return wantsSummary(search) ? (plan.summary?.key ?? plan.key) : plan.key;
}

/** True for a query that carries `doc=summary` (the old way to open a plan's summary tab). */
function wantsSummary(search: string): boolean {
  return new URLSearchParams(search).get('doc') === 'summary';
}

/** The query of an old link, kept only when it is a plain `?...` string. */
function queryOf(search: string): string {
  return search.startsWith('?') && search.length > 1 ? search : '';
}

function legacyTargetOf(
  route: LegacyRoute,
  search: string,
  presentation: ProjectPresentation,
): string | null {
  switch (route.kind) {
    case 'artifact':
      return artifactTarget(route.artifactPath, presentation);
    case 'milestone':
      return milestoneOf(route.milestoneVersion, presentation)?.overviewUrl ?? null;
    case 'phase': {
      const phase = phaseOf(route.milestoneVersion, route.phaseIdentity, presentation);
      return phase === null ? null : buildPhaseUrl(phase.identity);
    }
    case 'plan':
      return planTarget(route, search, presentation);
    case 'roadmap':
    case 'search':
    case 'traceability':
    case 'sketches':
    case 'research':
      return `/${route.kind}${queryOf(search)}`;
    case 'dashboard':
      return null;
  }
}

/**
 * The readable address an old encoded address stands for, taken only from the loaded payload (artifact keys,
 * plan keys, phase identities, milestone overview addresses), or null when the payload has nothing there.
 * Null is a miss: the caller renders the not-found page, never a parent. `search` is the old link's query
 * (`?doc=summary` picks a plan's summary).
 */
export function resolveLegacyTarget(
  route: LegacyRoute,
  search: string,
  presentation: ProjectPresentation,
): string | null {
  return safeTarget(legacyTargetOf(route, search, presentation));
}

/**
 * The summary address of a new-form plan URL that still carries the old `?doc=summary` query (D-05), or
 * null when `route` is not a plan on its Plan tab, the query does not ask for the summary, or the plan has
 * no summary of the payload. Null means: open the page the address already names.
 */
export function legacyQueryRedirect(
  route: Route,
  search: string,
  presentation: ProjectPresentation,
): string | null {
  if (route.kind !== 'plan' || route.doc !== 'plan' || !wantsSummary(search)) return null;
  const planUrl = buildUrl({ ...route, doc: 'plan', heading: null });
  const plan = presentation.milestones
    .flatMap((milestone) => milestone.phases)
    .flatMap((phase) => phase.plans)
    .find((candidate) => candidate.key === planUrl);
  return safeTarget(plan?.summary?.key ?? null);
}

const UNPREFIXED_PAGES: ReadonlySet<string> = new Set(PROJECT_PAGES);
const UNPREFIXED_LEGACY: ReadonlySet<string> = new Set(LEGACY_FIRST_SEGMENTS);

/**
 * The slug-prefixed-form target of an address typed without the project slug, the way links were before
 * the slug existed: the old top-level pages (`/roadmap`, `/search?q=kiln`, ...) keep their query, and the
 * old `/milestones/...` and `/artifacts/...` shapes resolve as their slug-prefixed forms do. `path` is the
 * raw pathname. Any other first segment, or an address that resolves to nothing, is null.
 */
export function resolveUnprefixedAddress(
  path: string,
  search: string,
  presentation: ProjectPresentation,
): string | null {
  const first = path.split('/', 2)[1] ?? '';
  if (!UNPREFIXED_PAGES.has(first) && !UNPREFIXED_LEGACY.has(first)) return null;
  const parsed = parseLegacyUrl(path);
  return parsed.ok ? resolveLegacyTarget(parsed.route, search, presentation) : null;
}
