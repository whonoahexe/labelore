// Pure, DOM-free resolution of a matched roadmap route into a canonical deep-link target, and
// milestone containment matching against that target. Mirrors the seam
// document-reference-activation.ts already establishes for extracted web logic: no `document`,
// `window`, or React import, so vitest can exercise it directly with no jsdom.
import { buildMilestoneUrl, buildUrl, parseRoutePath } from '../../presentation/routes.ts';

export interface RoadmapDeepLinkTarget {
  kind: 'phase' | 'milestone';
  phaseUrl: string | null;
  milestoneUrl: string;
}

/**
 * Resolves a project-relative pathname into a roadmap deep-link target: `/v1.1/phase-2` targets that
 * phase, `/v1.1/overview` targets that milestone. Returns `null` on any non-ok parse result or any route
 * kind other than a phase or a milestone overview - never throws. Rebuilds the target through
 * `buildUrl`/`buildMilestoneUrl` (rather than comparing raw path segments) so the comparison is
 * encoding-proof against the same builders that produce every rendered row's `url` field.
 */
export function resolveRoadmapDeepLink(pathname: string): RoadmapDeepLinkTarget | null {
  const result = parseRoutePath(pathname);
  if (!result.ok) return null;
  const route = result.route;
  if (route.kind === 'phase') {
    return {
      kind: 'phase',
      phaseUrl: buildUrl({ ...route, heading: null }),
      milestoneUrl: buildMilestoneUrl(route.milestone),
    };
  }
  if (route.kind === 'overview') {
    return {
      kind: 'milestone',
      phaseUrl: null,
      milestoneUrl: buildMilestoneUrl(route.milestone),
    };
  }
  return null;
}

/**
 * True when `milestone` contains the resolved deep-link target: any phase whose `url` matches
 * `target.phaseUrl`, or — for a milestone-only target (`phaseUrl: null`) — when the milestone's
 * own `url` matches `target.milestoneUrl`. Always `false` for a `null` target.
 */
export function milestoneContainsDeepLink(
  milestone: { url: string; phases: ReadonlyArray<{ url: string }> },
  target: RoadmapDeepLinkTarget | null,
): boolean {
  if (target === null) return false;
  if (target.phaseUrl === null) return milestone.url === target.milestoneUrl;
  return milestone.phases.some((phase) => phase.url === target.phaseUrl);
}
