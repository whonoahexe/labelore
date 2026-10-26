import { describe, expect, it } from 'vitest';
import type { Project } from '../../src/domain/model.ts';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildUrl, fileUrlOf, parseRoutePath } from '../../src/presentation/routes.ts';
import { buildRouteTable } from '../../src/presentation/route-table.ts';
import type { RouteTable } from '../../src/presentation/route-table.ts';
import { ALL_FIXTURE_ROOTS } from '../helpers/fixture-roots.ts';
import { loadProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

function artifactCount(project: Project | null): number {
  if (project === null) return 0;
  let count = Object.keys(project.artifacts).length;
  for (const phase of project.phases) count += Object.keys(phase.artifacts).length;
  for (const quickTask of project.quickTasks) count += Object.keys(quickTask.artifacts).length;
  return count;
}

async function tableOf(files: Record<string, string>): Promise<RouteTable> {
  const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
  return buildRouteTable(snapshot.project);
}

const STATE_V11 = '---\nmilestone: v1.1\nmilestone_name: Firing Board\n---\n\n# State\n';

describe('route table - tracer (Shapes)', () => {
  it('takes a phase document from its path to a readable url and back to the same path', async () => {
    const { snapshot } = await loadShapesProject();
    const table = buildRouteTable(snapshot.project);
    const path = '.planning/phases/01-kiln-bookings/01-CONTEXT.md';

    const url = table.urlOf(path);
    expect(url).toBe('/v1.1/phase-1/context');

    const parsed = parseRoutePath(url as string);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.route.kind).toBe('document');
    expect(buildUrl(parsed.route)).toBe(url);

    expect(table.pathOf(url as string)).toBe(path);
  });
});

describe.each(ALL_FIXTURE_ROOTS)('NAV-10: every file has exactly one readable url - %s', (root) => {
  it('gives every artifact one url, shares none, reports no conflict, and round-trips each one', async () => {
    const { snapshot } = await loadProject(root);
    const table = buildRouteTable(snapshot.project);

    expect(table.size).toBe(artifactCount(snapshot.project));
    expect(table.conflicts).toEqual([]);
    const urls = [...table.urlByPath.values()];
    expect(new Set(urls).size).toBe(urls.length);

    for (const [path, url] of table.urlByPath) {
      expect(url.startsWith('/'), url).toBe(true);
      expect(url.startsWith('//'), url).toBe(false);
      expect(new URL(url, 'http://labelore.local').pathname, url).toBe(url);
      const parsed = parseRoutePath(url);
      expect(parsed.ok, url).toBe(true);
      if (parsed.ok) expect(buildUrl(parsed.route), url).toBe(url);
      expect(table.pathOf(url), url).toBe(path);
      expect(table.urlOf(path)).toBe(url);
    }
  });
});

describe('route table - the Shapes addresses', () => {
  it('holds each shape at the url its folder, number and name choose', async () => {
    const { snapshot } = await loadShapesProject();
    const table = buildRouteTable(snapshot.project);
    const expected: Record<string, string> = {
      '.planning/phases/02.1-glaze-hotfix/02.1-01-PLAN.md': '/v1.1/phase-2.1/plan-01',
      '.planning/phases/02.1-glaze-hotfix/02.1-01-SUMMARY.md': '/v1.1/phase-2.1/plan-01/summary',
      '.planning/phases/02-glaze-recipes/02-01-PLAN.md': '/v1.1/phase-2/plan-01',
      '.planning/phases/KR-03-firing-calendar/03-CONTEXT.md': '/v1.1/phase-kr-3/context',
      '.planning/milestones/v1.0-phases/01-studio-accounts/01-01-SUMMARY.md': '/v1.0/phase-1/plan-01/summary',
      '.planning/milestones/v1.0-phases/01-studio-accounts/01-CONTEXT.md': '/v1.0/phase-1/context',
      '.planning/milestones/v1.0-ROADMAP.md': '/v1.0/roadmap',
      '.planning/milestones/v1.0-REQUIREMENTS.md': '/v1.0/requirements',
      '.planning/milestones/v1.0-MILESTONE-AUDIT.md': '/v1.0/audit',
      '.planning/milestones/v1.0-research/STACK.md': '/v1.0/research/stack',
      '.planning/milestones/v1.0-quick/260310-a7c-fix-kiln-label/260310-a7c-PLAN.md': '/quick/260310-a7c',
      '.planning/quick/261020-k4m-shelf-tags/261020-k4m-PLAN.md': '/quick/261020-k4m',
      '.planning/quick/261020-k4m-shelf-tags/261020-k4m-SUMMARY.md': '/quick/261020-k4m/summary',
      '.planning/quick/261020-k4m-shelf-tags/261020-k4m-CONTEXT.md': '/quick/261020-k4m/context',
      '.planning/config.json': '/settings',
      '.planning/ROADMAP.md': '/roadmap',
      '.planning/MILESTONES.md': '/milestones',
      '.planning/HANDOFF.json': '/handoff',
      '.planning/.continue-here.md': '/continue-here',
      '.planning/phases/02-glaze-recipes/COVERAGE.md': '/v1.1/phase-2/coverage',
      '.planning/phases/02-glaze-recipes/.continue-here.md': '/v1.1/phase-2/continue-here',
      '.planning/phases/02-glaze-recipes/scratch/mixing order.md': '/v1.1/phase-2/scratch/mixing%20order',
      '.planning/codebase/ARCHITECTURE.md': '/codebase/architecture',
      '.planning/spikes/CONVENTIONS.md': '/spikes/conventions',
      '.planning/ui-reviews/screenshots/glaze-panel.png': '/ui-reviews/screenshots/glaze-panel.png',
      '.planning/phases/02-glaze-recipes/03-RESEARCH.md': fileUrlOf('.planning/phases/02-glaze-recipes/03-RESEARCH.md'),
      '.planning/phases/02-glaze-recipes/plan-01.md': fileUrlOf('.planning/phases/02-glaze-recipes/plan-01.md'),
      '.planning/phases/README.md': '/file/phases/README.md',
      '.planning/quick/README.md': '/file/quick/README.md',
      '.planning/notes/kiln % notes.md': '/notes/kiln%20%25%20notes',
      '.planning/notes/glaze #2.md': '/notes/glaze%20%232',
      '.planning/notes/über-glaze.md': '/notes/%C3%BCber-glaze',
    };
    for (const [path, url] of Object.entries(expected)) expect(table.urlOf(path), path).toBe(url);
    expect(table.conflicts).toEqual([]);
  });

  it('has no url for internal files, which are not artifacts', async () => {
    const { snapshot } = await loadShapesProject();
    const table = buildRouteTable(snapshot.project);
    expect(table.urlOf('.planning/state.json')).toBeNull();
    expect(table.urlOf('.planning/tmp/agent-result.json')).toBeNull();
    for (const url of table.urlByPath.values()) {
      expect(url).not.toBe('/state.json');
      expect(url).not.toContain('agent-result');
    }
  });

  it('keeps the live roadmap at one address, with the milestone-scoped address as an alias', async () => {
    const { snapshot } = await loadShapesProject();
    const table = buildRouteTable(snapshot.project);
    expect(table.aliasOf('/v1.1/roadmap')).toBe('/roadmap');
    expect(table.aliases.get('/v1.1/roadmap')).toBe('/roadmap');
    expect(table.pathOf('/v1.1/roadmap')).toBeNull();
    expect(table.aliasOf('/roadmap')).toBeNull();
    expect(table.aliasOf('/v1.0/roadmap')).toBeNull();
  });

  it('points a bare milestone at its roadmap (D-02)', async () => {
    const { snapshot } = await loadShapesProject();
    const table = buildRouteTable(snapshot.project);
    expect(table.milestoneRoadmapUrl('v1.0')).toBe('/v1.0/roadmap');
    expect(table.milestoneRoadmapUrl('v1.1')).toBe('/roadmap');
    expect(table.milestoneRoadmapUrl('v0.9')).toBe('/v0.9/overview');
  });
});

describe('route table - accident trees', () => {
  it('keeps the first of two phase folders with one phase address and reports the clash', async () => {
    const table = await tableOf({
      '.planning/STATE.md': STATE_V11,
      '.planning/phases/05-a/05-CONTEXT.md': '# Context a\n',
      '.planning/phases/5-b/5-CONTEXT.md': '# Context b\n',
      '.planning/phases/5-b/5-RESEARCH.md': '# Research b\n',
    });
    expect(table.urlOf('.planning/phases/05-a/05-CONTEXT.md')).toBe('/v1.1/phase-5/context');
    expect(table.urlOf('.planning/phases/5-b/5-CONTEXT.md')).toBe(fileUrlOf('.planning/phases/5-b/5-CONTEXT.md'));
    expect(table.urlOf('.planning/phases/5-b/5-RESEARCH.md')).toBe('/v1.1/phase-5/research');
    expect(table.conflicts).toEqual([
      { url: '/v1.1/phase-5', paths: ['.planning/phases/05-a', '.planning/phases/5-b'] },
      {
        url: '/v1.1/phase-5/context',
        paths: ['.planning/phases/05-a/05-CONTEXT.md', '.planning/phases/5-b/5-CONTEXT.md'],
      },
    ]);
  });

  it('keeps 07-COVERAGE.md and sends COVERAGE.md to its file/ address', async () => {
    const table = await tableOf({
      '.planning/STATE.md': STATE_V11,
      '.planning/phases/07-x/07-CONTEXT.md': '# Context\n',
      '.planning/phases/07-x/07-COVERAGE.md': '# Coverage a\n',
      '.planning/phases/07-x/COVERAGE.md': '# Coverage b\n',
    });
    expect(table.urlOf('.planning/phases/07-x/07-COVERAGE.md')).toBe('/v1.1/phase-7/coverage');
    expect(table.urlOf('.planning/phases/07-x/COVERAGE.md')).toBe('/file/phases/07-x/COVERAGE.md');
    expect(table.conflicts).toEqual([
      {
        url: '/v1.1/phase-7/coverage',
        paths: ['.planning/phases/07-x/07-COVERAGE.md', '.planning/phases/07-x/COVERAGE.md'],
      },
    ]);
  });

  it('keeps Foo.md and sends foo.md to file/ under a lower-casing folder', async () => {
    const table = await tableOf({
      '.planning/research/Foo.md': '# Upper\n',
      '.planning/research/foo.md': '# Lower\n',
    });
    expect(table.urlOf('.planning/research/Foo.md')).toBe('/research/foo');
    expect(table.urlOf('.planning/research/foo.md')).toBe('/file/research/foo.md');
    expect(table.conflicts).toEqual([
      { url: '/research/foo', paths: ['.planning/research/Foo.md', '.planning/research/foo.md'] },
    ]);
  });

  it('demotes a stray milestones/<live>-ROADMAP.md to file/ and reports it, the alias winning (D-03)', async () => {
    const table = await tableOf({
      '.planning/STATE.md': STATE_V11,
      '.planning/ROADMAP.md': '# Roadmap\n',
      '.planning/phases/01-a/01-CONTEXT.md': '# Context\n',
      '.planning/milestones/v1.1-ROADMAP.md': '# Stray copy\n',
    });
    expect(table.urlOf('.planning/ROADMAP.md')).toBe('/roadmap');
    expect(table.urlOf('.planning/milestones/v1.1-ROADMAP.md')).toBe('/file/milestones/v1.1-ROADMAP.md');
    expect(table.aliasOf('/v1.1/roadmap')).toBe('/roadmap');
    expect(table.conflicts).toEqual([{ url: '/v1.1/roadmap', paths: ['.planning/milestones/v1.1-ROADMAP.md'] }]);
  });

  it('builds the same table whatever order the files arrive in', async () => {
    const files: Record<string, string> = {
      '.planning/STATE.md': STATE_V11,
      '.planning/ROADMAP.md': '# Roadmap\n',
      '.planning/phases/05-a/05-CONTEXT.md': '# a\n',
      '.planning/phases/5-b/5-CONTEXT.md': '# b\n',
      '.planning/phases/07-x/07-COVERAGE.md': '# c\n',
      '.planning/phases/07-x/COVERAGE.md': '# d\n',
      '.planning/research/Foo.md': '# e\n',
      '.planning/research/foo.md': '# f\n',
      '.planning/milestones/v1.1-ROADMAP.md': '# g\n',
    };
    const reversed = Object.fromEntries(Object.entries(files).reverse());
    const a = await tableOf(files);
    const b = await tableOf(reversed);
    expect([...a.urlByPath.entries()].sort()).toEqual([...b.urlByPath.entries()].sort());
    expect(a.conflicts).toEqual(b.conflicts);
    expect([...a.aliases.entries()]).toEqual([...b.aliases.entries()]);
  });

  it('builds an empty table for no project', () => {
    const table = buildRouteTable(null);
    expect(table.size).toBe(0);
    expect(table.conflicts).toEqual([]);
    expect(table.milestoneRoadmapUrl('v1.0')).toBe('/v1.0/overview');
    expect(table.milestoneRoadmapUrl(null)).toBe('/overview');
  });
});
