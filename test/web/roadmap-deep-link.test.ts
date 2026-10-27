import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { PhaseIdentity } from '../../src/domain/model.ts';
import { buildMilestoneUrl, buildPhaseUrl } from '../../src/presentation/routes.ts';
import {
  milestoneContainsDeepLink,
  resolveRoadmapDeepLink,
  type RoadmapDeepLinkTarget,
} from '../../src/web/pages/roadmap-deep-link.ts';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const identity: PhaseIdentity = {
  milestoneVersion: 'v1.0',
  number: '02',
  projectCode: null,
  slug: 'situational-awareness',
};

describe('resolveRoadmapDeepLink', () => {
  it('resolves a phase url into a phase target carrying the same phase url and its milestone overview url', () => {
    const phaseUrl = buildPhaseUrl(identity);
    expect(phaseUrl).toBe('/v1.0/phase-2');
    expect(resolveRoadmapDeepLink(phaseUrl)).toEqual({
      kind: 'phase',
      phaseUrl,
      milestoneUrl: buildMilestoneUrl('v1.0'),
    });
  });

  it('resolves a milestone overview url into a milestone target with a null phase url', () => {
    expect(resolveRoadmapDeepLink('/v1.1/overview')).toEqual({
      kind: 'milestone',
      phaseUrl: null,
      milestoneUrl: '/v1.1/overview',
    });
    expect(resolveRoadmapDeepLink(buildMilestoneUrl('v1.0'))).toEqual({
      kind: 'milestone',
      phaseUrl: null,
      milestoneUrl: '/v1.0/overview',
    });
  });

  it('reads /v1.1/phase-2 as that phase of that milestone', () => {
    expect(resolveRoadmapDeepLink('/v1.1/phase-2')).toEqual({
      kind: 'phase',
      phaseUrl: '/v1.1/phase-2',
      milestoneUrl: '/v1.1/overview',
    });
  });

  it('drops a heading, so a deep link to a section targets the phase', () => {
    expect(resolveRoadmapDeepLink('/v1.1/phase-2#Goal')).toEqual({
      kind: 'phase',
      phaseUrl: '/v1.1/phase-2',
      milestoneUrl: '/v1.1/overview',
    });
  });

  it('canonicalises a zero-padded phase number to the url the roadmap rows carry', () => {
    expect(resolveRoadmapDeepLink('/v1.1/phase-02')?.phaseUrl).toBe(buildPhaseUrl({ ...identity, milestoneVersion: 'v1.1' }));
  });

  it('resolves an archived phase to the archived milestone', () => {
    const archived: PhaseIdentity = { ...identity, milestoneVersion: 'v0.9', number: '11' };
    expect(resolveRoadmapDeepLink(buildPhaseUrl(archived))).toEqual({
      kind: 'phase',
      phaseUrl: '/v0.9/phase-11',
      milestoneUrl: '/v0.9/overview',
    });
  });

  it('resolves an unversioned /phase-2 against the unversioned milestone', () => {
    expect(resolveRoadmapDeepLink('/phase-2')).toEqual({
      kind: 'phase',
      phaseUrl: '/phase-2',
      milestoneUrl: '/overview',
    });
  });

  it('returns null for the bare /roadmap pathname', () => {
    expect(resolveRoadmapDeepLink('/roadmap')).toBeNull();
  });

  it('returns null for the dashboard root pathname', () => {
    expect(resolveRoadmapDeepLink('/')).toBeNull();
  });

  it('returns null for a route that is neither a phase nor a milestone overview', () => {
    for (const pathname of ['/v1.1', '/v1.1/phase-2/plan-01', '/v1.1/phase-2/context', '/v1.1/roadmap', '/state']) {
      expect(resolveRoadmapDeepLink(pathname), pathname).toBeNull();
    }
  });

  it('returns null (never throws) for malformed input', () => {
    for (const pathname of ['', 'v1.1/phase-2', '/v1.1/phase-', '/v1.1//phase-2', '/v1.1/%E0%A4%A', '/v1.1/phase-2#', '/%2e%2e/phase-2']) {
      expect(() => resolveRoadmapDeepLink(pathname), pathname).not.toThrow();
      expect(resolveRoadmapDeepLink(pathname), pathname).toBeNull();
    }
  });

  it('round-trips a phase url whose project code and number are unusual', () => {
    const coded: PhaseIdentity = {
      milestoneVersion: 'v1.0',
      number: '02.1',
      projectCode: 'KR',
      slug: 'a b~c',
    };
    const phaseUrl = buildPhaseUrl(coded);
    expect(phaseUrl).toBe('/v1.0/phase-kr-2.1');
    expect(resolveRoadmapDeepLink(phaseUrl)?.phaseUrl).toBe(phaseUrl);
  });
});

describe('milestoneContainsDeepLink', () => {
  const phaseUrl = buildPhaseUrl(identity);
  const milestoneUrl = buildMilestoneUrl('v1.0');
  const target: RoadmapDeepLinkTarget = { kind: 'phase', phaseUrl, milestoneUrl };

  it('is true when any phase url equals the target phase url', () => {
    expect(
      milestoneContainsDeepLink({ url: milestoneUrl, phases: [{ url: phaseUrl }] }, target),
    ).toBe(true);
  });

  it('is false when no phase url matches the target phase url', () => {
    expect(
      milestoneContainsDeepLink(
        { url: milestoneUrl, phases: [{ url: '/v1.0/phase-9' }] },
        target,
      ),
    ).toBe(false);
  });

  it('is true only when milestone.url matches target.milestoneUrl for a milestone-only target', () => {
    const milestoneTarget: RoadmapDeepLinkTarget = {
      kind: 'milestone',
      phaseUrl: null,
      milestoneUrl,
    };
    expect(
      milestoneContainsDeepLink({ url: milestoneUrl, phases: [] }, milestoneTarget),
    ).toBe(true);
    expect(
      milestoneContainsDeepLink(
        { url: buildMilestoneUrl('v2.0'), phases: [] },
        milestoneTarget,
      ),
    ).toBe(false);
  });

  it('is false for a null target', () => {
    expect(milestoneContainsDeepLink({ url: milestoneUrl, phases: [{ url: phaseUrl }] }, null)).toBe(
      false,
    );
  });

  it('resolves the correct milestone when two milestones each contain a phase numbered 02', () => {
    const otherIdentity: PhaseIdentity = {
      milestoneVersion: 'v2.0',
      number: '02',
      projectCode: null,
      slug: 'other-phase',
    };
    const otherPhaseUrl = buildPhaseUrl(otherIdentity);
    const matchingMilestone = { url: milestoneUrl, phases: [{ url: phaseUrl }] };
    const otherMilestone = { url: buildMilestoneUrl('v2.0'), phases: [{ url: otherPhaseUrl }] };

    expect(milestoneContainsDeepLink(matchingMilestone, target)).toBe(true);
    expect(milestoneContainsDeepLink(otherMilestone, target)).toBe(false);
  });
});

describe('roadmap-deep-link module purity', () => {
  it('contains no document, window, or React reference', async () => {
    const contents = await source('src/web/pages/roadmap-deep-link.ts');
    expect(contents).not.toMatch(/document\.|window\.|from 'react'/);
  });
});

describe('roadmap-page wiring source contract', () => {
  it('reads the matched route and resolves a deep-link target', async () => {
    const page = await source('src/web/pages/roadmap-page.tsx');
    expect(page).toContain('useProjectPathname');
    expect(page).toContain('resolveRoadmapDeepLink');
    expect(page).toContain('milestoneContainsDeepLink');
    expect(page).toContain('data-deep-link-target');
    expect(page).toContain('requestAnimationFrame');
    const scrollCalls = page.match(/scrollIntoView/g) ?? [];
    expect(scrollCalls).toHaveLength(1);
  });
});
