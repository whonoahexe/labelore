// The old encoded-URL cases of routes.test.ts, calling parseLegacyUrl directly. routes.test.ts moved to the
// readable grammar in 07-06; this file leaves with legacy-routes.ts at v2.1 close.
import { describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import {
  artifactTokenOf,
  assertNonEmpty,
  encodePart,
  milestoneKeyOf,
  phaseKeyOf,
} from '../../src/presentation/identity-keys.ts';
import { presentationRoutePatterns, parseRoutePath, type Route } from '../../src/presentation/routes.ts';
import {
  legacyQueryRedirect,
  parseLegacyUrl,
  resolveLegacyTarget,
  resolveUnprefixedAddress,
} from '../../src/presentation/legacy-routes.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import {
  legacyArtifactUrl,
  legacyMilestoneUrl,
  legacyPhaseUrl,
  legacyPlanUrl,
} from '../helpers/legacy-urls.ts';

// The pre-v2.1 encoded builders, kept test-local: routes.ts now emits the readable grammar, and the decoder
// under test must keep reading what the old builders wrote (the redirect path turns those links into
// readable ones). They leave with legacy-routes.ts at v2.1 close.
function withHeading(path: string, heading?: string): string {
  if (heading === undefined) return path;
  const clean = heading.replace(/^#+/, '');
  assertNonEmpty(clean, 'Heading');
  return `${path}#${encodePart(clean)}`;
}

function buildMilestoneUrl(version: string | null): string {
  return `/milestones/${milestoneKeyOf(version)}`;
}

function buildPhaseUrl(identity: PhaseIdentity, heading?: string): string {
  return withHeading(`${buildMilestoneUrl(identity.milestoneVersion)}/phases/${phaseKeyOf(identity)}`, heading);
}

function buildPlanUrl(identity: PhaseIdentity, planId: string, heading?: string): string {
  assertNonEmpty(planId, 'Plan id');
  return withHeading(`${buildPhaseUrl(identity)}/plans/${encodePart(planId)}`, heading);
}

function buildArtifactUrl(identity: PhaseIdentity | null, artifactPath: string, heading?: string): string {
  const token = artifactTokenOf(artifactPath);
  const path = identity === null ? `/artifacts/${token}` : `${buildPhaseUrl(identity)}/artifacts/${token}`;
  return withHeading(path, heading);
}

const active: PhaseIdentity = {
  milestoneVersion: null,
  number: '01.2 / β',
  projectCode: 'LORE / 日本語',
  slug: 'route.codec / Δ',
};

const archived: PhaseIdentity = {
  ...active,
  milestoneVersion: 'v1.0 / archive',
};

describe('legacy route decoder (deleted at v2.1 close, D-14): milestone-qualified presentation route codec', () => {
  it('keeps active and archived duplicate phase numbers distinct', () => {
    expect(milestoneKeyOf(null)).toBe('current');
    expect(milestoneKeyOf(archived.milestoneVersion)).not.toBe(milestoneKeyOf(null));
    expect(phaseKeyOf(active)).not.toBe(phaseKeyOf(archived));
    expect(buildPhaseUrl(active)).not.toBe(buildPhaseUrl(archived));

    expect(parseLegacyUrl(buildPhaseUrl(active))).toEqual({
      ok: true,
      route: {
        kind: 'phase',
        milestoneVersion: null,
        phaseIdentity: active,
      },
    });
    expect(parseLegacyUrl(buildPhaseUrl(archived))).toEqual({
      ok: true,
      route: {
        kind: 'phase',
        milestoneVersion: archived.milestoneVersion,
        phaseIdentity: archived,
      },
    });
  });

  it('round-trips every route shape and preserves encoded separators exactly', () => {
    const milestone = 'v2.0 / 日本語 %2F';
    const phase = { ...active, milestoneVersion: milestone };
    const planId = '02-07 / plan.%2F 雪';
    const artifactPath = '.planning/phases/02.x / nested/%2F/研究.md';
    const heading = 'Why dots/slashes / %2F stay 同一';

    const cases = [
      [buildMilestoneUrl(milestone), { kind: 'milestone', milestoneVersion: milestone }],
      [buildPhaseUrl(phase), { kind: 'phase', milestoneVersion: milestone, phaseIdentity: phase }],
      [
        buildPlanUrl(phase, planId, heading),
        { kind: 'plan', milestoneVersion: milestone, phaseIdentity: phase, planId, heading },
      ],
      [
        buildArtifactUrl(phase, artifactPath, heading),
        {
          kind: 'artifact',
          milestoneVersion: milestone,
          phaseIdentity: phase,
          artifactToken: artifactTokenOf(artifactPath),
          artifactPath,
          heading,
        },
      ],
    ] as const;

    for (const [url, route] of cases) {
      expect(url).not.toContain(' ');
      expect(parseLegacyUrl(url)).toEqual({ ok: true, route });
    }
  });

  it('normalizes headings with accidental leading hashes', () => {
    expect(buildArtifactUrl(null, '.planning/STATE.md', '#blockersconcerns')).toBe(
      '/artifacts/a~.planning%2FSTATE.md#blockersconcerns',
    );
    expect(buildArtifactUrl(null, '.planning/STATE.md', '###blockersconcerns')).toBe(
      '/artifacts/a~.planning%2FSTATE.md#blockersconcerns',
    );
  });

  it('parses dashboard and roadmap routes without inventing identity', () => {
    expect(parseLegacyUrl('/')).toEqual({ ok: true, route: { kind: 'dashboard' } });
    expect(parseLegacyUrl('/roadmap')).toEqual({ ok: true, route: { kind: 'roadmap' } });
  });

  it('round-trips the /search route (D-03: query lives in ?q=, not the route itself)', () => {
    expect(presentationRoutePatterns.search).toBe('/search');
    expect(parseLegacyUrl('/search')).toEqual({ ok: true, route: { kind: 'search' } });
  });

  it('round-trips the /traceability route (D-16: its own top-level route)', () => {
    expect(presentationRoutePatterns.traceability).toBe('/traceability');
    expect(parseLegacyUrl('/traceability')).toEqual({
      ok: true,
      route: { kind: 'traceability' },
    });
  });

  it('round-trips the /research route', () => {
    expect(presentationRoutePatterns.research).toBe('/research');
    expect(parseLegacyUrl('/research')).toEqual({ ok: true, route: { kind: 'research' } });
    expect(parseLegacyUrl('/research/stack').ok).toBe(false);
  });

  it('round-trips the /sketches route, and leaves the sketch file URLs to the server', () => {
    expect(presentationRoutePatterns.sketches).toBe('/sketches');
    expect(parseLegacyUrl('/sketches')).toEqual({ ok: true, route: { kind: 'sketches' } });
    expect(parseLegacyUrl('/sketches/001-alpha/').ok).toBe(false);
  });

  it.each([
    ['/milestones/current/phases', 'truncated'],
    ['/milestones//phases/anything', 'empty-token'],
    ['/milestones/current/phases//plans/02-01', 'empty-token'],
    ['/milestones/current/phases/not-a-phase-key', 'malformed-token'],
    ['/milestones/current/milestones/current', 'duplicate-token'],
    ['/milestones/current/phases/p~n~v01~vslug/plans/', 'empty-token'],
    ['/milestones/current/phases/p~n~v01~vslug#', 'empty-token'],
    ['/not/a/presentation/route', 'unsupported-route'],
  ])('fails closed for %s', (url, code) => {
    const parsed = parseLegacyUrl(url);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.code).toBe(code);
  });

  it('treats traversal-shaped artifact text only as an opaque decoded value', () => {
    const artifactPath = '../../../../etc/passwd / %2e%2e';
    const parsed = parseLegacyUrl(buildArtifactUrl(archived, artifactPath));

    expect(parsed).toEqual({
      ok: true,
      route: {
        kind: 'artifact',
        milestoneVersion: archived.milestoneVersion,
        phaseIdentity: archived,
        artifactToken: artifactTokenOf(artifactPath),
        artifactPath,
        heading: null,
      },
    });
  });
});

// ---------------------------------------------------------------------------------------------------------
// The redirect path (NAV-11): an old address becomes the readable one, from payload data only
// ---------------------------------------------------------------------------------------------------------

const live: PhaseIdentity = {
  milestoneVersion: 'v1.1',
  projectCode: 'LORE',
  number: '02.1',
  slug: 'kiln-glaze',
};
const first: PhaseIdentity = { milestoneVersion: 'v1.0', projectCode: null, number: '1', slug: 'first' };

const payload = {
  artifacts: [
    { path: '.planning/STATE.md', key: '/state' },
    { path: '.planning/ROADMAP.md', key: '/roadmap' },
    { path: '.planning/phases/02.1-kiln-glaze/02.1-01-PLAN.md', key: '/v1.1/phase-lore-2.1/plan-01' },
  ],
  milestones: [
    {
      version: 'v1.1',
      archived: false,
      overviewUrl: '/v1.1/overview',
      roadmapUrl: '/roadmap',
      phases: [
        {
          identity: live,
          plans: [
            {
              id: '02.1-01',
              key: '/v1.1/phase-lore-2.1/plan-01',
              summary: { key: '/v1.1/phase-lore-2.1/plan-01/summary' },
            },
            { id: '02.1-02', key: '/v1.1/phase-lore-2.1/plan-02', summary: null },
          ],
        },
      ],
    },
    {
      version: 'v1.0',
      archived: true,
      overviewUrl: '/v1.0/overview',
      roadmapUrl: '/v1.0/roadmap',
      phases: [{ identity: first, plans: [] }],
    },
  ],
} as unknown as ProjectPresentation;

function target(url: string, search = ''): string | null {
  const parsed = parseLegacyUrl(url);
  if (!parsed.ok) throw new Error(`unparseable ${url}`);
  return resolveLegacyTarget(parsed.route, search, payload);
}

describe('resolveLegacyTarget (NAV-11)', () => {
  it('sends a milestone to its overview, and `current` to the live milestone', () => {
    expect(target('/milestones/m~v1.0')).toBe('/v1.0/overview');
    expect(target('/milestones/m~v1.1')).toBe('/v1.1/overview');
    expect(target('/milestones/current')).toBe('/v1.1/overview');
    expect(target('/milestones/m~v9.9')).toBeNull();
  });

  it('sends a phase to the payload phase with the same code, number and slug', () => {
    expect(target(legacyPhaseUrl(live))).toBe('/v1.1/phase-lore-2.1');
    expect(target(legacyPhaseUrl({ ...live, number: '02.10' }))).toBeNull();
    expect(target(legacyPhaseUrl({ ...live, slug: 'other' }))).toBeNull();
    expect(target(legacyPhaseUrl({ ...first, number: '01' }))).toBe('/v1.0/phase-1');
    // A null milestone is the live one.
    expect(target(legacyPhaseUrl({ ...live, milestoneVersion: null }))).toBe('/v1.1/phase-lore-2.1');
  });

  it('sends a plan to its key, and to its summary with doc=summary', () => {
    const url = legacyPlanUrl(live, '02.1-01');
    expect(target(url)).toBe('/v1.1/phase-lore-2.1/plan-01');
    expect(target(url, '?doc=summary')).toBe('/v1.1/phase-lore-2.1/plan-01/summary');
    expect(target(legacyPlanUrl(live, '02.1-02'), '?doc=summary')).toBe('/v1.1/phase-lore-2.1/plan-02');
    expect(target(legacyPlanUrl(live, '02.1-09'))).toBeNull();
  });

  it('sends an artifact, phase-scoped or not, to its key, and a missing file nowhere', () => {
    expect(target(legacyArtifactUrl('.planning/STATE.md'))).toBe('/state');
    expect(target(legacyArtifactUrl('.planning/STATE.md', live))).toBe('/state');
    expect(target(legacyArtifactUrl('.planning/ROADMAP.md'))).toBe('/roadmap');
    expect(target(legacyArtifactUrl('.planning'))).toBeNull();
    expect(target(legacyArtifactUrl('.planning/gone.md'))).toBeNull();
  });

  it('refuses a target that is not a single-slash, non-legacy path (T-07-20)', () => {
    for (const key of ['//evil.example/x', '/\\evil.example', 'https://evil.example', '', '/milestones/m~v1.0']) {
      const hostile = {
        ...payload,
        artifacts: [{ path: '.planning/STATE.md', key }],
      } as unknown as ProjectPresentation;
      const parsed = parseLegacyUrl(legacyArtifactUrl('.planning/STATE.md'));
      if (!parsed.ok) throw new Error('unparseable');
      expect(resolveLegacyTarget(parsed.route, '', hostile), JSON.stringify(key)).toBeNull();
    }
  });
});

describe('legacyQueryRedirect (D-05)', () => {
  const routeOf = (url: string): Route => {
    const parsed = parseRoutePath(url);
    if (!parsed.ok) throw new Error(`unparseable ${url}`);
    return parsed.route;
  };

  it('sends a plan address carrying ?doc=summary to its /summary address', () => {
    expect(legacyQueryRedirect(routeOf('/v1.1/phase-lore-2.1/plan-01'), '?doc=summary', payload)).toBe(
      '/v1.1/phase-lore-2.1/plan-01/summary',
    );
  });

  it('leaves everything else alone', () => {
    const plan = routeOf('/v1.1/phase-lore-2.1/plan-01');
    expect(legacyQueryRedirect(plan, '', payload)).toBeNull();
    expect(legacyQueryRedirect(plan, '?doc=plan', payload)).toBeNull();
    expect(
      legacyQueryRedirect(routeOf('/v1.1/phase-lore-2.1/plan-01/summary'), '?doc=summary', payload),
    ).toBeNull();
    // A plan with no summary stays on its own page.
    expect(legacyQueryRedirect(routeOf('/v1.1/phase-lore-2.1/plan-02'), '?doc=summary', payload)).toBeNull();
    expect(legacyQueryRedirect(routeOf('/roadmap'), '?doc=summary', payload)).toBeNull();
  });
});

describe('resolveUnprefixedAddress (NAV-11)', () => {
  it('keeps the page and its query for the old top-level pages', () => {
    expect(resolveUnprefixedAddress('/roadmap', '?x=1', payload)).toBe('/roadmap?x=1');
    expect(resolveUnprefixedAddress('/search', '?q=kiln', payload)).toBe('/search?q=kiln');
    for (const page of ['traceability', 'research', 'sketches']) {
      expect(resolveUnprefixedAddress(`/${page}`, '', payload)).toBe(`/${page}`);
    }
  });

  it('resolves the old encoded shapes as their slug-prefixed forms do', () => {
    expect(resolveUnprefixedAddress(legacyPhaseUrl(live), '', payload)).toBe('/v1.1/phase-lore-2.1');
    expect(resolveUnprefixedAddress(legacyMilestoneUrl('v1.0'), '', payload)).toBe('/v1.0/overview');
    expect(resolveUnprefixedAddress(legacyArtifactUrl('.planning/STATE.md'), '', payload)).toBe('/state');
    expect(resolveUnprefixedAddress(legacyArtifactUrl('.planning/gone.md'), '', payload)).toBeNull();
  });

  it('returns null for any other first segment or a longer page path', () => {
    for (const path of ['/', '/state', '/v1.1/overview', '/someone-else', '/roadmap/extra', '/milestones']) {
      expect(resolveUnprefixedAddress(path, '', payload), path).toBeNull();
    }
  });
});
