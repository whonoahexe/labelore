// NAV-09, NAV-10, T-07-17..19: resolveProjectRoute is the one place a project-relative address becomes a
// page. Over the committed Shapes and Lendshed payloads every URL the server emits opens something, every
// redirect goes where the payload says, and every miss (an internal file, a bare folder, a phase or plan
// that does not exist) is the same not-found outcome.
import { describe, expect, it } from 'vitest';
import {
  buildPhaseUrl,
  parseRoutePath,
  presentationRoutePatterns,
} from '../../src/presentation/routes.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import {
  resolveProjectRoute,
  resolveUnprefixedRoute,
  type RouteOutcome,
} from '../../src/web/route-dispatch.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';
import {
  legacyArtifactUrl,
  legacyMilestoneUrl,
  legacyPhaseUrl,
  legacyPlanUrl,
} from '../helpers/legacy-urls.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const shapes: ProjectPresentation = (await loadProject(SHAPES_ROOT)).presentation;
const lendshed: ProjectPresentation = (await loadProject(FX_ROOT)).presentation;

const resolve = (path: string, presentation = shapes): RouteOutcome =>
  resolveProjectRoute(path, '', presentation);

describe('resolveProjectRoute over the Shapes payload', () => {
  it('opens the dashboard and the five pages', () => {
    expect(resolve('/')).toEqual({ kind: 'page', page: 'dashboard' });
    for (const page of ['roadmap', 'search', 'traceability', 'sketches', 'research'] as const) {
      expect(resolve(`/${page}`)).toEqual({ kind: 'page', page });
    }
  });

  it("opens a milestone's overview and a phase on the roadmap page (D-04)", () => {
    expect(resolve('/v1.1/overview')).toEqual({ kind: 'overview', milestone: 'v1.1' });
    expect(resolve('/v1.0/overview')).toEqual({ kind: 'overview', milestone: 'v1.0' });
    expect(resolve('/v1.1/phase-2.1')).toEqual({ kind: 'phase', url: '/v1.1/phase-2.1' });
    expect(resolve('/v1.1/phase-kr-3')).toEqual({ kind: 'phase', url: '/v1.1/phase-kr-3' });
  });

  it('opens the plan pair on its two addresses (D-05)', () => {
    expect(resolve('/v1.1/phase-2.1/plan-01')).toEqual({
      kind: 'plan-pair',
      planUrl: '/v1.1/phase-2.1/plan-01',
      active: 'plan',
    });
    expect(resolve('/v1.1/phase-2.1/plan-01/summary')).toEqual({
      kind: 'plan-pair',
      planUrl: '/v1.1/phase-2.1/plan-01',
      active: 'summary',
    });
  });

  it('keeps a heading out of the address it resolves', () => {
    expect(resolve('/v1.1/phase-2.1/plan-01#tasks')).toMatchObject({ kind: 'plan-pair', active: 'plan' });
    expect(resolve('/v1.1/phase-2.1#goal')).toEqual({ kind: 'phase', url: '/v1.1/phase-2.1' });
  });

  it("redirects a bare milestone to that milestone's roadmap (D-02)", () => {
    expect(resolve('/v1.0')).toEqual({ kind: 'redirect', to: '/v1.0/roadmap' });
    expect(resolve('/v1.1')).toEqual({ kind: 'redirect', to: '/roadmap' });
  });

  it('redirects the live milestone alias to the live roadmap (D-03)', () => {
    expect(resolve('/v1.1/roadmap')).toEqual({ kind: 'redirect', to: '/roadmap' });
  });

  it('opens an archived roadmap and a root file as documents', () => {
    expect(resolve('/v1.0/roadmap')).toMatchObject({ kind: 'document', url: '/v1.0/roadmap' });
    expect(resolve('/settings')).toMatchObject({ kind: 'document', url: '/settings' });
  });

  it('answers every miss with the one not-found outcome (D-11)', () => {
    for (const path of [
      '/file/state.json',
      '/quick',
      '/notes',
      '/codebase',
      '/v1.1/phase-99',
      '/v1.1/phase-2/plan-77',
      '/v1.1/phase-2/plan-01/summary/extra',
      '/v2.7',
      '/v2.7/overview',
      '/phase-2',
      '/milestones/m~v9.9',
      '/artifacts/a~x',
      '/a//b',
      '/%',
      '/..',
      '/v1.1/%2e%2e/state',
      '/no/such/thing',
    ]) {
      expect(resolve(path), path).toEqual({ kind: 'not-found' });
    }
  });

  it('answers a plan whose summary does not exist with not-found on the summary address', () => {
    expect(resolve('/v1.1/phase-kr-3/plan-01')).toMatchObject({ kind: 'plan-pair', active: 'plan' });
    expect(resolve('/v1.1/phase-kr-3/plan-01/summary')).toEqual({ kind: 'not-found' });
  });
});

describe('resolveProjectRoute over the Lendshed payload', () => {
  it('opens a phase file as a document and redirects both live aliases', () => {
    expect(resolve('/v1.1/phase-1/context', lendshed)).toMatchObject({
      kind: 'document',
      url: '/v1.1/phase-1/context',
    });
    expect(resolve('/v1.1/roadmap', lendshed)).toEqual({ kind: 'redirect', to: '/roadmap' });
    expect(resolve('/v1.1/requirements', lendshed)).toEqual({ kind: 'redirect', to: '/requirements' });
  });
});

describe.each([
  ['Shapes', shapes],
  ['Lendshed', lendshed],
])('every address the %s payload emits', (_name, presentation) => {
  it('opens a page: no artifact key and no plan key is a miss', () => {
    const misses: string[] = [];
    for (const artifact of presentation.artifacts) {
      const outcome = resolve(artifact.key, presentation);
      const ok =
        outcome.kind === 'document' ||
        outcome.kind === 'plan-pair' ||
        // ROADMAP.md IS the roadmap page.
        (outcome.kind === 'page' && artifact.key === '/roadmap');
      if (!ok) misses.push(`${artifact.key} -> ${outcome.kind}`);
    }
    for (const plan of presentation.milestones.flatMap((m) => m.phases).flatMap((p) => p.plans)) {
      for (const key of [plan.key, plan.summary?.key]) {
        if (key === undefined) continue;
        const kind = resolve(key, presentation).kind;
        if (kind !== 'plan-pair' && kind !== 'document') misses.push(`${key} -> ${kind}`);
      }
    }
    expect(misses).toEqual([]);
  });

  it('resolves every milestone and phase address the payload names', () => {
    for (const milestone of presentation.milestones) {
      expect(resolve(milestone.overviewUrl, presentation).kind, milestone.overviewUrl).toBe('overview');
      const bare = milestone.version === null ? null : `/${milestone.version}`;
      if (bare !== null) {
        expect(resolve(bare, presentation)).toEqual({ kind: 'redirect', to: milestone.roadmapUrl });
      }
    }
  });

  it('only redirects to a single-slash path taken from the payload (T-07-17)', () => {
    const allowed = new Set([
      ...presentation.milestones.map((milestone) => milestone.roadmapUrl),
      ...Object.values(presentation.routeAliases),
    ]);
    const probes = [
      ...presentation.milestones.map((milestone) => `/${milestone.version ?? ''}`),
      ...Object.keys(presentation.routeAliases),
    ];
    for (const probe of probes) {
      const outcome = resolve(probe, presentation);
      if (outcome.kind !== 'redirect') continue;
      expect(allowed.has(outcome.to), probe).toBe(true);
      expect(outcome.to.startsWith('/')).toBe(true);
      expect(outcome.to.startsWith('//')).toBe(false);
    }
  });
});

describe('redirect targets that are not a project-relative path (T-07-17)', () => {
  const hostile = (target: string): ProjectPresentation => ({
    ...shapes,
    routeAliases: { '/v1.1/roadmap': target },
  });

  it.each(['//evil.example/x', '/\\evil.example', 'https://evil.example', 'roadmap', ''])(
    'turns %j into not-found',
    (target) => {
      expect(resolve('/v1.1/roadmap', hostile(target))).toEqual({ kind: 'not-found' });
    },
  );

  it('does not read an inherited property as an alias', () => {
    expect(resolve('/constructor')).toEqual({ kind: 'not-found' });
    expect(resolve('/__proto__')).toEqual({ kind: 'not-found' });
  });
});

describe('an old artifact link (NAV-11, tracer)', () => {
  it("redirects to the file's readable address", () => {
    expect(resolveProjectRoute(legacyArtifactUrl('.planning/STATE.md'), '', shapes)).toEqual({
      kind: 'redirect',
      to: '/state',
    });
  });

  it('is not-found when the payload has no such file, never a parent page (D-13)', () => {
    expect(resolveProjectRoute(legacyArtifactUrl('.planning/no-such-file.md'), '', shapes)).toEqual({
      kind: 'not-found',
    });
  });
});

describe('every legacy shape and query (NAV-11, D-12, D-13)', () => {
  const phaseOf = (presentation: ProjectPresentation, phaseKey: string | null) =>
    presentation.milestones.flatMap((m) => m.phases).find((phase) => phase.key === phaseKey);
  const to = (url: string): RouteOutcome => ({ kind: 'redirect', to: url });

  it('sends the milestone forms to the overview', () => {
    expect(resolve('/milestones/m~v1.0')).toEqual(to('/v1.0/overview'));
    expect(resolve('/milestones/m~v1.1')).toEqual(to('/v1.1/overview'));
    expect(resolve('/milestones/m~v9.9')).toEqual({ kind: 'not-found' });
  });

  it('sends ?doc=summary on a new-form plan address to its /summary path', () => {
    expect(resolveProjectRoute('/v1.1/phase-2.1/plan-01', '?doc=summary', shapes)).toEqual(
      to('/v1.1/phase-2.1/plan-01/summary'),
    );
    // No summary: the plan page opens as it is.
    expect(resolveProjectRoute('/v1.1/phase-kr-3/plan-01', '?doc=summary', shapes)).toMatchObject({
      kind: 'plan-pair',
      active: 'plan',
    });
  });

  it('answers an old link to nothing with not-found, never a parent page', () => {
    const [phase] = shapes.milestones.flatMap((m) => m.phases);
    const ghost = { ...phase.identity, slug: 'no-such-slug' };
    expect(resolve(legacyPhaseUrl(ghost))).toEqual({ kind: 'not-found' });
    expect(resolve(legacyPlanUrl(phase.identity, '99-99'))).toEqual({ kind: 'not-found' });
    expect(resolve(legacyPlanUrl(ghost, '99-99'))).toEqual({ kind: 'not-found' });
  });

  describe.each([
    ['Shapes', shapes],
    ['Lendshed', lendshed],
  ])('over the %s payload', (_name, presentation) => {
    const outcomeOf = (path: string, search = ''): RouteOutcome =>
      resolveProjectRoute(path, search, presentation);
    const phases = presentation.milestones.flatMap((milestone) => milestone.phases);
    // Every old address the payload can be asked about, with the target it must reach; shared so the
    // loop check below does not depend on the order the other tests ran in.
    const cases: { url: string; search: string; expected: string; label: string }[] = [];
    const expectRedirect = (outcome: RouteOutcome, expected: string, label: string): void => {
      expect(outcome, label).toEqual({ kind: 'redirect', to: expected });
    };
    for (const artifact of presentation.artifacts) {
      cases.push({ url: legacyArtifactUrl(artifact.path), search: '', expected: artifact.key, label: artifact.path });
    }
    for (const milestone of presentation.milestones) {
      cases.push({ url: legacyMilestoneUrl(milestone.version), search: '', expected: milestone.overviewUrl, label: milestone.name });
    }
    for (const phase of phases) {
      cases.push({ url: legacyPhaseUrl(phase.identity), search: '', expected: buildPhaseUrl(phase.identity), label: phase.name });
      for (const plan of phase.plans) {
        const url = legacyPlanUrl(phase.identity, plan.id);
        cases.push({ url, search: '', expected: plan.key, label: plan.id });
        cases.push({ url, search: '?doc=summary', expected: plan.summary?.key ?? plan.key, label: `${plan.id} summary` });
      }
    }

    it('redirects every artifact, by both old forms, to its key', () => {
      for (const artifact of presentation.artifacts) {
        expectRedirect(outcomeOf(legacyArtifactUrl(artifact.path)), artifact.key, artifact.path);
        const owner = phaseOf(presentation, artifact.phaseKey);
        if (owner !== undefined) {
          expectRedirect(
            outcomeOf(legacyArtifactUrl(artifact.path, owner.identity)),
            artifact.key,
            `${artifact.path} (phase-scoped)`,
          );
        }
      }
    });

    it('redirects every milestone and phase to its current address', () => {
      for (const milestone of presentation.milestones) {
        expectRedirect(
          outcomeOf(legacyMilestoneUrl(milestone.version)),
          milestone.overviewUrl,
          milestone.name,
        );
      }
      for (const phase of phases) {
        expectRedirect(outcomeOf(legacyPhaseUrl(phase.identity)), buildPhaseUrl(phase.identity), phase.name);
      }
    });

    it('redirects every plan, with and without doc=summary, to its key or summary key', () => {
      for (const phase of phases) {
        for (const plan of phase.plans) {
          const url = legacyPlanUrl(phase.identity, plan.id);
          expectRedirect(outcomeOf(url), plan.key, plan.id);
          expectRedirect(outcomeOf(url, '?doc=summary'), plan.summary?.key ?? plan.key, `${plan.id} summary`);
          if (plan.summary !== null) {
            expectRedirect(outcomeOf(plan.key, '?doc=summary'), plan.summary.key, `${plan.key} new form`);
          }
        }
      }
    });

    it('never redirects to a legacy address or to another redirect', () => {
      expect(cases.length).toBeGreaterThan(0);
      for (const { url, search } of cases) {
        const target = (outcomeOf(url, search) as { to: string }).to;
        expect(target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\'), target).toBe(true);
        const parsed = parseRoutePath(target);
        expect(parsed.ok && parsed.route.kind !== 'legacy', target).toBe(true);
        expect(outcomeOf(target).kind, target).not.toBe('redirect');
      }
    });
  });
});

describe('resolveUnprefixedRoute (NAV-11)', () => {
  const unprefixed = (path: string, search = ''): RouteOutcome =>
    resolveUnprefixedRoute(path, search, shapes);

  it('keeps the old top-level pages and their query', () => {
    expect(unprefixed('/roadmap')).toEqual({ kind: 'redirect', to: '/roadmap' });
    expect(unprefixed('/search', '?q=kiln')).toEqual({ kind: 'redirect', to: '/search?q=kiln' });
    for (const page of ['traceability', 'research', 'sketches']) {
      expect(unprefixed(`/${page}`)).toEqual({ kind: 'redirect', to: `/${page}` });
    }
  });

  it('resolves old encoded shapes and answers a miss with not-found', () => {
    expect(unprefixed(legacyArtifactUrl('.planning/STATE.md'))).toEqual({ kind: 'redirect', to: '/state' });
    expect(unprefixed(legacyArtifactUrl('.planning/gone.md'))).toEqual({ kind: 'not-found' });
    expect(unprefixed('/someone-else')).toEqual({ kind: 'not-found' });
  });
});

describe('presentationRoutePatterns', () => {
  it('holds only the six page paths', () => {
    expect(Object.keys(presentationRoutePatterns)).toEqual([
      'dashboard',
      'roadmap',
      'search',
      'traceability',
      'sketches',
      'research',
    ]);
  });
});
