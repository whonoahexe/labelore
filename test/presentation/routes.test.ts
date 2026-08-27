import { describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import {
  artifactTokenOf,
  buildArtifactUrl,
  buildMilestoneUrl,
  buildPhaseUrl,
  buildPlanUrl,
  milestoneKeyOf,
  parsePresentationUrl,
  phaseKeyOf,
} from '../../src/presentation/routes.ts';

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

describe('milestone-qualified presentation route codec', () => {
  it('keeps active and archived duplicate phase numbers distinct', () => {
    expect(milestoneKeyOf(null)).toBe('current');
    expect(milestoneKeyOf(archived.milestoneVersion)).not.toBe(milestoneKeyOf(null));
    expect(phaseKeyOf(active)).not.toBe(phaseKeyOf(archived));
    expect(buildPhaseUrl(active)).not.toBe(buildPhaseUrl(archived));

    expect(parsePresentationUrl(buildPhaseUrl(active))).toEqual({
      ok: true,
      route: {
        kind: 'phase',
        milestoneVersion: null,
        phaseIdentity: active,
      },
    });
    expect(parsePresentationUrl(buildPhaseUrl(archived))).toEqual({
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
      expect(parsePresentationUrl(url)).toEqual({ ok: true, route });
    }
  });

  it('parses dashboard and roadmap routes without inventing identity', () => {
    expect(parsePresentationUrl('/')).toEqual({ ok: true, route: { kind: 'dashboard' } });
    expect(parsePresentationUrl('/roadmap')).toEqual({ ok: true, route: { kind: 'roadmap' } });
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
    const parsed = parsePresentationUrl(url);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.code).toBe(code);
  });

  it('treats traversal-shaped artifact text only as an opaque decoded value', () => {
    const artifactPath = '../../../../etc/passwd / %2e%2e';
    const parsed = parsePresentationUrl(buildArtifactUrl(archived, artifactPath));

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
