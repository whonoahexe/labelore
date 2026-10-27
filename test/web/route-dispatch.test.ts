// NAV-09, NAV-10, T-07-17..19: resolveProjectRoute is the one place a project-relative address becomes a
// page. Over the committed Shapes and Lendshed payloads every URL the server emits opens something, every
// redirect goes where the payload says, and every miss (an internal file, a bare folder, a phase or plan
// that does not exist) is the same not-found outcome.
import { describe, expect, it } from 'vitest';
import { presentationRoutePatterns } from '../../src/presentation/routes.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { resolveProjectRoute, type RouteOutcome } from '../../src/web/route-dispatch.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';
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
      '/milestones/m~v1.1',
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
