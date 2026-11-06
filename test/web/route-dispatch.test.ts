// NAV-09, NAV-10, T-07-17..19: resolveProjectRoute is the one place a project-relative address becomes a
// page. Over the committed Shapes and Lendshed payloads every URL the server emits opens something, every
// redirect goes where the payload says, and every miss (an internal file, a bare folder, a phase or plan
// that does not exist) is the same not-found outcome.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import {
  ROOT_DOCUMENT_TARGETS,
  archivedCopyTarget,
  rootDocumentRedirect,
} from '../../src/presentation/root-redirects.ts';
import { FX_ROOT, loadProject } from '../helpers/fixture-project.ts';
import {
  legacyArtifactUrl,
  legacyMilestoneUrl,
  legacyPhaseUrl,
  legacyPlanUrl,
} from '../helpers/legacy-urls.ts';
import { writeIngestDocsProject } from '../helpers/index-fixtures.ts';
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

  it('opens an archived roadmap on the roadmap page (09 D-02) and a root file as a document', () => {
    expect(resolve('/v1.0/roadmap')).toEqual({ kind: 'archive-block', page: 'roadmap', version: 'v1.0' });
    expect(resolve('/settings')).toMatchObject({ kind: 'document', url: '/settings' });
  });

  it('answers every miss with the one not-found outcome (D-11)', () => {
    for (const path of [
      '/file/state.json',
      '/quick',
      '/notes',
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

describe('root documents designed elsewhere (09 D-01)', () => {
  const withSearch = (path: string, search: string, presentation = lendshed): RouteOutcome =>
    resolveProjectRoute(path, search, presentation);

  it('redirects the root documents to the page that shows them', () => {
    expect(resolve('/state', lendshed)).toEqual({ kind: 'redirect', to: '/' });
    expect(resolve('/requirements', lendshed)).toEqual({ kind: 'redirect', to: '/traceability' });
    expect(resolve('/milestones', lendshed)).toEqual({ kind: 'redirect', to: '/roadmap#history' });
  });

  it('keeps /roadmap the roadmap page', () => {
    expect(resolve('/roadmap', lendshed)).toEqual({ kind: 'page', page: 'roadmap' });
  });

  it('opens the file itself on ?source=1, for every redirected row of the table', () => {
    const opened: string[] = [];
    for (const row of ROOT_DOCUMENT_TARGETS) {
      if (row.fileName === 'ROADMAP.md') continue;
      const artifact = lendshed.artifacts
        .concat(shapes.artifacts)
        .find((candidate) => candidate.location === 'root' && candidate.path.endsWith(`/${row.fileName}`));
      if (artifact === undefined) continue;
      const presentation = lendshed.artifacts.includes(artifact) ? lendshed : shapes;
      expect(withSearch(artifact.key, '?source=1', presentation), row.fileName).toEqual({
        kind: 'document',
        url: artifact.key,
        artifactPath: artifact.path,
      });
      opened.push(row.fileName);
    }
    expect(opened).toContain('STATE.md');
  });

  it('opens ROADMAP.md itself on /roadmap?source=1, and only there', () => {
    expect(withSearch('/roadmap', '')).toEqual({ kind: 'page', page: 'roadmap' });
    expect(withSearch('/roadmap', '?source=1')).toMatchObject({
      kind: 'document',
      url: '/roadmap',
      artifactPath: expect.stringMatching(/ROADMAP\.md$/),
    });
    expect(withSearch('/roadmap', '?source=0')).toEqual({ kind: 'page', page: 'roadmap' });
    expect(withSearch('/search', '?source=1')).toEqual({ kind: 'page', page: 'search' });
    expect(withSearch('/traceability', '?source=1')).toEqual({ kind: 'page', page: 'traceability' });
  });

  it('falls back to the roadmap page when the payload carries no ROADMAP.md artifact', () => {
    const bare: ProjectPresentation = {
      ...lendshed,
      artifacts: lendshed.artifacts.filter((artifact) => artifact.key !== '/roadmap'),
    };
    expect(withSearch('/roadmap', '?source=1', bare)).toEqual({ kind: 'page', page: 'roadmap' });
  });

  it('ignores a flag value other than 1', () => {
    expect(withSearch('/state', '?source=0')).toEqual({ kind: 'redirect', to: '/' });
  });

  it('is still not-found for an address no artifact carries, flag or not', () => {
    expect(withSearch('/nope', '?source=1')).toEqual({ kind: 'not-found' });
    expect(withSearch('/file/state.json', '?source=1')).toEqual({ kind: 'not-found' });
  });

  it('does not redirect a STATE.md that is not at the root', () => {
    const nested: ProjectPresentation = {
      ...lendshed,
      artifacts: [
        ...lendshed.artifacts,
        {
          ...lendshed.artifacts[0]!,
          key: '/research/state',
          path: '.planning/research/STATE.md',
          location: 'research',
        },
      ],
    };
    expect(withSearch('/research/state', '', nested)).toMatchObject({
      kind: 'document',
      url: '/research/state',
    });
  });
});

describe('archived milestone copies (09 D-02)', () => {
  const withSearch = (path: string, search: string, presentation = lendshed): RouteOutcome =>
    resolveProjectRoute(path, search, presentation);

  it('opens the archived roadmap on the live roadmap at its milestone block', () => {
    expect(resolve('/v1.0/roadmap', lendshed)).toEqual({
      kind: 'archive-block',
      page: 'roadmap',
      version: 'v1.0',
    });
  });

  it('opens the archived requirements on traceability at its milestone block', () => {
    expect(resolve('/v1.0/requirements', lendshed)).toEqual({
      kind: 'archive-block',
      page: 'traceability',
      version: 'v1.0',
    });
  });

  it('carries no URL in the outcome: the target page and version come from the payload', () => {
    const outcome = resolve('/v1.0/roadmap', lendshed);
    expect(Object.keys(outcome).sort()).toEqual(['kind', 'page', 'version']);
  });

  it('opens the file itself on ?source=1', () => {
    expect(withSearch('/v1.0/roadmap', '?source=1')).toMatchObject({
      kind: 'document',
      url: '/v1.0/roadmap',
    });
    expect(withSearch('/v1.0/requirements', '?source=1')).toMatchObject({
      kind: 'document',
      url: '/v1.0/requirements',
    });
  });

  it('still redirects a bare milestone to its roadmap, which now lands on the block', () => {
    expect(resolve('/v1.0', lendshed)).toEqual({ kind: 'redirect', to: '/v1.0/roadmap' });
  });

  it('keeps an archived copy with no History block a plain document, never archive-block', () => {
    const orphan = lendshed.artifacts.find((artifact) => artifact.key === '/v1.0/roadmap')!;
    const planted: ProjectPresentation = {
      ...lendshed,
      artifacts: [
        ...lendshed.artifacts,
        { ...orphan, key: '/v9.9/roadmap', path: '.planning/milestones/v9.9-ROADMAP.md' },
      ],
    };
    expect(resolve('/v9.9/roadmap', planted)).toMatchObject({ kind: 'document', url: '/v9.9/roadmap' });
  });

  it('adds no page component for archived documents: the outcome names a live page', () => {
    const pages = new Set<string>();
    for (const address of ['/v1.0/roadmap', '/v1.0/requirements']) {
      const outcome = resolve(address, lendshed);
      if (outcome.kind === 'archive-block') pages.add(outcome.page);
    }
    expect([...pages].sort()).toEqual(['roadmap', 'traceability']);
  });
});

describe.each([
  ['Shapes', shapes],
  ['Lendshed', lendshed],
])('every address the %s payload emits', (_name, presentation) => {
  it('opens a page (or, for a root document designed elsewhere, redirects to one): no artifact key and no plan key is a miss', () => {
    const misses: string[] = [];
    for (const artifact of presentation.artifacts) {
      const outcome = resolve(artifact.key, presentation);
      const ok =
        outcome.kind === 'document' ||
        outcome.kind === 'plan-pair' ||
        // ROADMAP.md IS the roadmap page.
        (outcome.kind === 'page' && artifact.key === '/roadmap') ||
        // 09 D-01: a root document designed elsewhere redirects to the page that shows it.
        (outcome.kind === 'redirect' && outcome.to === rootDocumentRedirect(artifact)) ||
        // 09 D-02: an archived milestone copy opens on its live page, at its block.
        (outcome.kind === 'archive-block' && archivedCopyTarget(artifact, presentation) !== null);
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
        const next = outcomeOf(target);
        if (next.kind !== 'redirect') continue;
        // 09 D-01 (updated expectation): an old link to a root document designed elsewhere is a legacy
        // hop followed by exactly one more, to the page that shows it, and that page is never a redirect.
        expect(
          ROOT_DOCUMENT_TARGETS.some((row) => row.to === next.to),
          `${target} -> ${next.to}`,
        ).toBe(true);
        expect(outcomeOf(next.to).kind, next.to).not.toBe('redirect');
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

describe('a project that holds only a codebase map (TGT-09)', () => {
  const isMapDocument = (artifact: ProjectPresentation['artifacts'][number]): boolean =>
    artifact.path.startsWith('.planning/codebase/');
  // The Shapes map holds STACK, ARCHITECTURE and CONVENTIONS, so STACK is first in page order. The
  // map-only payload keeps just those documents; the fixture's own artifacts are all dropped.
  const mapOnly: ProjectPresentation = { ...shapes, artifacts: shapes.artifacts.filter(isMapDocument) };
  const stack = shapes.artifacts.find((artifact) => artifact.path === '.planning/codebase/STACK.md');
  const noMap: ProjectPresentation = {
    ...shapes,
    artifacts: shapes.artifacts.filter((artifact) => !isMapDocument(artifact)),
  };
  const neither: ProjectPresentation = {
    ...shapes,
    artifacts: shapes.artifacts.filter(
      (artifact) => !isMapDocument(artifact) && artifact.path !== '.planning/ROADMAP.md' && artifact.location !== 'phase',
    ),
  };

  it('has a STACK.md artifact in the Shapes payload to stand on', () => {
    expect(stack).toBeDefined();
  });

  it('opens the dashboard address on the first present map document, taken from the payload key', () => {
    expect(resolve('/', mapOnly)).toEqual({
      kind: 'document',
      url: stack!.key,
      artifactPath: '.planning/codebase/STACK.md',
    });
  });

  it('opens the next document in page order when the first is missing', () => {
    const noStack: ProjectPresentation = {
      ...mapOnly,
      artifacts: mapOnly.artifacts.filter((artifact) => artifact.path !== '.planning/codebase/STACK.md'),
    };
    expect(resolve('/', noStack)).toMatchObject({ kind: 'document', artifactPath: '.planning/codebase/ARCHITECTURE.md' });
  });

  it('keeps the dashboard page for a project with a roadmap', () => {
    expect(resolve('/', shapes)).toEqual({ kind: 'page', page: 'dashboard' });
    expect(resolve('/', lendshed)).toEqual({ kind: 'page', page: 'dashboard' });
  });

  it('keeps the dashboard page for a .planning with neither a map document nor a roadmap', () => {
    expect(resolve('/', neither)).toEqual({ kind: 'page', page: 'dashboard' });
    expect(resolve('/', { ...shapes, artifacts: [] })).toEqual({ kind: 'page', page: 'dashboard' });
  });

  it('redirects a bare /codebase to the first present map document in a normal project', () => {
    expect(resolve('/codebase', shapes)).toEqual({ kind: 'redirect', to: stack!.key });
  });

  it('redirects a bare /codebase to the dashboard address in a map-only project', () => {
    expect(resolve('/codebase', mapOnly)).toEqual({ kind: 'redirect', to: '/' });
  });

  it('keeps a bare /codebase not-found in a project with no map', () => {
    expect(resolve('/codebase', noMap)).toEqual({ kind: 'not-found' });
    expect(resolve('/codebase', lendshed)).toEqual({ kind: 'not-found' });
  });

  it('still opens each map document at its own address', () => {
    expect(resolve(stack!.key, shapes)).toMatchObject({ kind: 'document', url: stack!.key });
    expect(resolve(stack!.key, mapOnly)).toMatchObject({ kind: 'document', url: stack!.key });
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

describe('the bare /spikes (Phase 11, 11-15, RESEARCH C1)', () => {
  const manifest = lendshed.artifacts.find((artifact) => artifact.kind === 'spikes-manifest');
  const noManifest: ProjectPresentation = {
    ...lendshed,
    artifacts: lendshed.artifacts.filter((artifact) => artifact.kind !== 'spikes-manifest'),
  };

  it("redirects to the manifest's own address where the project has one", () => {
    expect(manifest).toBeDefined();
    expect(resolve('/spikes', lendshed)).toEqual({ kind: 'redirect', to: manifest!.key });
    expect(manifest!.key).toBe('/spikes/manifest');
  });

  it("redirects to the first spike's README by id order where the project has no manifest", () => {
    const readmes = noManifest.artifacts.filter((artifact) => artifact.kind === 'spike');
    expect(readmes.length).toBeGreaterThan(1);
    // Listed last in the payload, the 001 spike still leads: the order is the id's, not the payload's.
    const reversed: ProjectPresentation = { ...noManifest, artifacts: [...noManifest.artifacts].reverse() };
    const first = readmes.find((artifact) => artifact.path === '.planning/spikes/001-badge-reader-latency/README.md');
    expect(first).toBeDefined();
    expect(resolve('/spikes', noManifest)).toEqual({ kind: 'redirect', to: first!.key });
    expect(resolve('/spikes', reversed)).toEqual({ kind: 'redirect', to: first!.key });
  });

  it('is not-found where the project has no spikes', async () => {
    const tidemark = (await loadProject(join(FX_ROOT, '..', 'tidemark'))).presentation;
    expect(resolve('/spikes', tidemark)).toEqual({ kind: 'not-found' });
    expect(resolve('/spikes', shapes)).toMatchObject({ kind: 'redirect' });
  });

  it('opens each spike address as a document, never a redirect', () => {
    for (const artifact of lendshed.artifacts.filter((a) => a.kind.startsWith('spike'))) {
      expect(resolve(artifact.key, lendshed), artifact.key).toMatchObject({ kind: 'document', url: artifact.key });
    }
  });
});

describe('the bare /indexes (Phase 11, 11-18, RESEARCH C1)', () => {
  it("redirects to the Graph tile's own address on Lendshed", () => {
    const graph = lendshed.artifacts.find((artifact) => artifact.path === '.planning/graphs/graph.json');
    expect(graph?.key).toBe('/graphs/graph.json');
    expect(resolve('/indexes', lendshed)).toEqual({ kind: 'redirect', to: '/graphs/graph.json' });
  });

  it('redirects to the first intel tile when there is no graphs/ folder', () => {
    const noGraphs: ProjectPresentation = {
      ...lendshed,
      artifacts: lendshed.artifacts.filter((artifact) => !artifact.path.startsWith('.planning/graphs/')),
    };
    const arch = lendshed.artifacts.find((artifact) => artifact.path === '.planning/intel/arch-decisions.json');
    expect(resolve('/indexes', noGraphs)).toEqual({ kind: 'redirect', to: arch!.key });
  });

  it('redirects to the Synthesis tile on a project whose intel is the ingest-docs markdown only', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labelore-ingest-'));
    try {
      writeIngestDocsProject(dir);
      const ingest = (await loadProject(dir)).presentation;
      expect(resolve('/indexes', ingest)).toEqual({ kind: 'redirect', to: '/intel/SYNTHESIS.md' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is not-found where the project has no intel and no graphs', () => {
    expect(resolve('/indexes', shapes)).toEqual({ kind: 'not-found' });
  });

  it('is not-found when the payload holds only the stamp or files no tile owns', () => {
    const stampOnly: ProjectPresentation = {
      ...lendshed,
      artifacts: lendshed.artifacts.filter(
        (artifact) =>
          !artifact.path.startsWith('.planning/graphs/') &&
          (!artifact.path.startsWith('.planning/intel/') || artifact.path.endsWith('.last-refresh.json')),
      ),
    };
    expect(stampOnly.artifacts.some((artifact) => artifact.path.endsWith('.last-refresh.json'))).toBe(true);
    expect(resolve('/indexes', stampOnly)).toEqual({ kind: 'not-found' });
  });

  it('always leads to a key some payload artifact carries, never to a typed address', () => {
    const outcome = resolve('/indexes', lendshed);
    expect(outcome.kind).toBe('redirect');
    const to = outcome.kind === 'redirect' ? outcome.to : '';
    expect(lendshed.artifacts.some((artifact) => artifact.key === to)).toBe(true);
    // An artifact with an empty key (no address) is never a target.
    const keyless: ProjectPresentation = {
      ...lendshed,
      artifacts: lendshed.artifacts.map((artifact) =>
        artifact.path.startsWith('.planning/graphs/') || artifact.path.startsWith('.planning/intel/')
          ? { ...artifact, key: '' }
          : artifact,
      ),
    };
    expect(resolve('/indexes', keyless)).toEqual({ kind: 'not-found' });
  });

  it('opens each intel and graph address as a document, never a redirect', () => {
    const indexFiles = lendshed.artifacts.filter((artifact) => artifact.kind === 'intel' || artifact.kind === 'graph');
    expect(indexFiles.length).toBeGreaterThan(5);
    for (const artifact of indexFiles) {
      expect(resolve(artifact.key, lendshed), artifact.key).toMatchObject({ kind: 'document', url: artifact.key });
    }
  });
});
