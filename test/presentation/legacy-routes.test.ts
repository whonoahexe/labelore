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
import { presentationRoutePatterns } from '../../src/presentation/routes.ts';
import { parseLegacyUrl } from '../../src/presentation/legacy-routes.ts';

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
