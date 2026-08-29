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
  it('resolves a phase url into a phase target carrying the same phase url and its milestone url', () => {
    const phaseUrl = buildPhaseUrl(identity);
    expect(resolveRoadmapDeepLink(phaseUrl)).toEqual({
      kind: 'phase',
      phaseUrl,
      milestoneUrl: buildMilestoneUrl('v1.0'),
    });
  });

  it('resolves a milestone url into a milestone target with a null phase url', () => {
    const milestoneUrl = buildMilestoneUrl('v1.0');
    expect(resolveRoadmapDeepLink(milestoneUrl)).toEqual({
      kind: 'milestone',
      phaseUrl: null,
      milestoneUrl,
    });
  });

  it('returns null for the bare /roadmap pathname', () => {
    expect(resolveRoadmapDeepLink('/roadmap')).toBeNull();
  });

  it('returns null for the dashboard root pathname', () => {
    expect(resolveRoadmapDeepLink('/')).toBeNull();
  });

  it('returns null (never throws) for a malformed phase token', () => {
    expect(resolveRoadmapDeepLink('/milestones/m~v1.0/phases/not-a-phase-token')).toBeNull();
  });

  it('returns null for a phase key that does not belong to its milestone segment', () => {
    expect(
      resolveRoadmapDeepLink('/milestones/m~v1.0/phases/p~vv2.0~n~v02~vother'),
    ).toBeNull();
  });

  it('round-trips a phase url whose slug contains a space and a tilde', () => {
    const spacedIdentity: PhaseIdentity = {
      milestoneVersion: 'v1.0',
      number: '02',
      projectCode: null,
      slug: 'a b~c',
    };
    const phaseUrl = buildPhaseUrl(spacedIdentity);
    const resolved = resolveRoadmapDeepLink(phaseUrl);
    expect(resolved?.phaseUrl).toBe(phaseUrl);
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
        { url: milestoneUrl, phases: [{ url: '/milestones/m~v1.0/phases/other' }] },
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
    expect(page).toContain('useLocation');
    expect(page).toContain('resolveRoadmapDeepLink');
    expect(page).toContain('milestoneContainsDeepLink');
    expect(page).toContain('data-deep-link-target');
    expect(page).toContain('requestAnimationFrame');
    const scrollCalls = page.match(/scrollIntoView/g) ?? [];
    expect(scrollCalls).toHaveLength(1);
  });
});
