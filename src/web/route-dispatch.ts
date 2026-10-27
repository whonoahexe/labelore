// The only place a project-relative address becomes a page (NAV-10). Pure and React-free: it takes
// the raw pathname the browser holds (the slug already taken off), parses it with the one grammar
// (`parseRoutePath`), and asks the loaded payload whether the thing the address names exists. It
// never reads a router parameter: the router decodes its splat, so a `%252F` would be decoded twice
// (07-RESEARCH "Pattern 7"); the raw text is split and decoded exactly once, in the parser.
//
// A parsed address is only ever a lookup key into the payload. An address no payload entry answers,
// an internal file's `file/` address included, is `not-found`, so a miss never hints that a file
// exists (D-11). A redirect target is always a value taken from the payload (T-07-17).
import { parseLegacyUrl, resolveLegacyTarget } from '../presentation/legacy-routes.ts';
import {
  buildPhaseUrl,
  buildUrl,
  parseRoutePath,
  type PageName,
  type Route,
} from '../presentation/routes.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';

export type RouteOutcome =
  | { kind: 'page'; page: 'dashboard' | PageName }
  | { kind: 'overview'; milestone: string | null }
  | { kind: 'phase'; url: string }
  | { kind: 'plan-pair'; planUrl: string; active: 'plan' | 'summary' }
  | { kind: 'document'; url: string; artifactPath: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'not-found' };

const NOT_FOUND: RouteOutcome = { kind: 'not-found' };

/** A redirect target must be a project-relative path: one leading '/', never '//host' or '/\host',
 * which a browser would read as another origin. Anything else becomes the not-found outcome. */
function redirectTo(target: string): RouteOutcome {
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return NOT_FOUND;
  return { kind: 'redirect', to: target };
}

/** An old encoded address (`/milestones/m~...`, `/artifacts/a~...`): a redirect to the readable address it
 * stands for, or the not-found outcome when the payload has nothing there (D-13). */
function legacyOutcome(pathname: string, search: string, presentation: ProjectPresentation): RouteOutcome {
  const parsed = parseLegacyUrl(pathname);
  if (!parsed.ok) return NOT_FOUND;
  const target = resolveLegacyTarget(parsed.route, search, presentation);
  return target === null ? NOT_FOUND : redirectTo(target);
}

/** The document outcome of an address some artifact carries as its key, else null. */
function documentOutcome(url: string, presentation: ProjectPresentation): RouteOutcome | null {
  const artifact = presentation.artifacts.find((candidate) => candidate.key === url);
  return artifact ? { kind: 'document', url, artifactPath: artifact.path } : null;
}

function pageOrOverviewOutcome(route: Route, presentation: ProjectPresentation): RouteOutcome | null {
  switch (route.kind) {
    case 'dashboard':
      return { kind: 'page', page: 'dashboard' };
    case 'page':
      return { kind: 'page', page: route.page };
    case 'milestone': {
      // D-02: a bare milestone sends the reader to that milestone's roadmap, silently.
      const milestone = presentation.milestones.find((candidate) => candidate.version === route.milestone);
      return milestone ? redirectTo(milestone.roadmapUrl) : NOT_FOUND;
    }
    case 'overview':
      // D-04: the milestone page. A null version is the unversioned project's own milestone.
      return presentation.milestones.some((candidate) => candidate.version === route.milestone)
        ? { kind: 'overview', milestone: route.milestone }
        : NOT_FOUND;
    default:
      return null;
  }
}

function planOutcome(
  route: Extract<Route, { kind: 'plan' }>,
  presentation: ProjectPresentation,
): RouteOutcome {
  const planUrl = buildUrl({ ...route, doc: 'plan', heading: null });
  const summaryUrl = buildUrl({ ...route, doc: 'summary', heading: null });
  const plan = presentation.milestones
    .flatMap((milestone) => milestone.phases)
    .flatMap((phase) => phase.plans)
    .find((candidate) => candidate.key === planUrl);
  if (plan) {
    // D-05: the Plan tab and the Summary tab are two addresses of one pair page.
    if (route.doc === 'plan') return { kind: 'plan-pair', planUrl, active: 'plan' };
    if (plan.summary?.key === summaryUrl) return { kind: 'plan-pair', planUrl, active: 'summary' };
  }
  // A file that sits at a plan-shaped address without being a plan of the payload (an orphan summary)
  // is still a file and opens as a document; anything else is a miss.
  return documentOutcome(route.doc === 'plan' ? planUrl : summaryUrl, presentation) ?? NOT_FOUND;
}

/**
 * Decides the page for a project-relative address. `path` is the raw pathname minus the project slug
 * (`/`, `/v1.1/phase-2/plan-01/summary`), `presentation` the loaded payload. `_search` is reserved for
 * the legacy `?doc=` redirects (07-08); no current address reads a query.
 */
export function resolveProjectRoute(
  path: string,
  search: string,
  presentation: ProjectPresentation,
): RouteOutcome {
  const parsed = parseRoutePath(path);
  if (!parsed.ok) return NOT_FOUND;
  if (parsed.route.kind === 'legacy') return legacyOutcome(parsed.route.pathname, search, presentation);
  const route = parsed.route;

  const simple = pageOrOverviewOutcome(route, presentation);
  if (simple !== null) return simple;

  switch (route.kind) {
    case 'phase': {
      const url = buildUrl({ ...route, heading: null });
      const exists = presentation.milestones
        .flatMap((milestone) => milestone.phases)
        .some((phase) => buildPhaseUrl(phase.identity) === url);
      return exists ? { kind: 'phase', url } : (documentOutcome(url, presentation) ?? NOT_FOUND);
    }
    case 'plan':
      return planOutcome(route, presentation);
    case 'document': {
      // D-03: a live alias has one address, the file's own.
      const alias = Object.hasOwn(presentation.routeAliases, route.url)
        ? presentation.routeAliases[route.url]
        : undefined;
      if (alias !== undefined) return redirectTo(alias);
      // D-11: only an artifact has a document page. An internal file, a bare folder and an unknown
      // address have no key, so they all end at the same miss.
      return documentOutcome(route.url, presentation) ?? NOT_FOUND;
    }
    default:
      return NOT_FOUND;
  }
}
