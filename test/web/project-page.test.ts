// Phase 9 (09-07, sketch 041 B): the PROJECT.md page composer and its masthead, through the real
// presentation and the real server join, on the made-up Lendshed project. Expected values come from the
// fixture's own PROJECT.md and the sketch's masthead, never from the composer's output.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ProjectHandler } from '../../src/planning-repo/handlers/project.ts';
import { buildProjectContext } from '../../src/presentation/project-context.ts';
import type { ProjectContext } from '../../src/presentation/project-context.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { VIEW_MANIFESTS } from '../../src/web/views/manifests.ts';
import { composeProjectPage } from '../../src/web/views/project-page.ts';
import type { ComposedProjectPage } from '../../src/web/views/project-page.ts';
import { ProjectPageView } from '../../src/web/views/project-page-components.tsx';
import { FX_ROOT, loadFixtureProject } from '../helpers/fixture-project.ts';
import type { LoadedProject } from '../helpers/fixture-project.ts';

let lendshed: LoadedProject;
beforeAll(async () => {
  lendshed = await loadFixtureProject();
});

/** `structured` as the real handler produces it for the Lendshed fixture's PROJECT.md. */
function lendshedStructured(): Record<string, unknown> {
  const content = readFileSync(join(FX_ROOT, '.planning', 'PROJECT.md'), 'utf8');
  const ref = { path: '.planning/PROJECT.md', kind: 'project', location: 'root', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as const;
  const parsed = ProjectHandler.parse({ path: ref.path, content, mtimeMs: 0, size: content.length }, ref);
  return JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>;
}

function inputOf(context: ProjectContext | null | undefined, structured: Record<string, unknown> = {}): ViewInput {
  return {
    kind: 'project',
    frontmatter: {},
    structured,
    groups: [],
    planSegments: [],
    projectContext: context === undefined ? null : (JSON.parse(JSON.stringify(context)) as ProjectContext | null),
  };
}

function markup(model: ComposedProjectPage): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ProjectPageView, {
        model,
        path: '.planning/PROJECT.md',
        mode: 'view',
        onModeChange: () => undefined,
        chip: null,
      }),
    ),
  );
}

describe('composeProjectPage', () => {
  it('Lendshed: the masthead names the project, what it is and its core value', () => {
    const page = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)));
    expect(page).not.toBeNull();
    expect(page!.masthead.eyebrow).toBe('Project');
    expect(page!.masthead.name).toBe('Lendshed');
    expect(page!.masthead.lead?.startsWith('A web app for a neighbourhood tool library')).toBe(true);
    expect(page!.masthead.coreValue).toBe(
      'A member can see what is on the shelf at every shed and borrow it without asking a steward to look it up.',
    );
    expect(page!.margin).toBeNull();
    expect(page!.decisions).toBeNull();
  });

  it('is null without a projectContext, and null when the context holds only the name', () => {
    expect(composeProjectPage(inputOf(null))).toBeNull();
    expect(composeProjectPage(inputOf(undefined))).toBeNull();
    const nameOnly: ProjectContext = {
      name: 'Bare',
      tagline: null,
      lead: null,
      coreValue: null,
      counts: null,
      tiles: null,
      dashboardUrl: '/',
    };
    expect(composeProjectPage(inputOf(nameOnly))).toBeNull();
  });

  it('omits the core value when the context has none, silently', () => {
    const context: ProjectContext = { ...buildProjectContext(lendshed.presentation), coreValue: null };
    const page = composeProjectPage(inputOf(context));
    expect(page!.masthead.coreValue).toBeNull();
    expect(markup(page!)).not.toContain('Core value');
  });

  it('the project manifest opts into the page and keeps promote as the fallback', () => {
    const manifest = VIEW_MANIFESTS.project;
    expect(manifest?.projectPage).toBe(composeProjectPage);
    expect(manifest?.promote.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ProjectPageView masthead', () => {
  it('renders the eyebrow, the one h1, the lead and the core-value card', () => {
    const page = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)))!;
    const html = markup(page);
    expect(html).toContain('<p class="eyebrow">Project</p>');
    expect(html.match(/<h1\b/g)?.length).toBe(1);
    expect(html).toContain('<h1 class="view-project-name">Lendshed</h1>');
    expect(html).toContain('view-project-what');
    expect(html).toContain('view-project-core');
    expect(html).toContain('Core value');
    expect(html).toContain('borrow it without asking a steward');
  });

  it('puts the View / Source toggle and the copy-path button in the masthead', () => {
    const page = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)))!;
    const html = markup(page);
    const masthead = html.slice(html.indexOf('view-project-masthead'));
    expect(masthead).toContain('aria-label="Document display"');
    expect(masthead).toContain('artifact-path-copy');
  });
});

describe('composeProjectPage strip', () => {
  it('Lendshed: the strip holds the four tiles from the context and no goal without structured.project', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context))!;
    expect(page.strip).not.toBeNull();
    expect(page.strip!.goalLabel).toBeNull();
    expect(page.strip!.goal).toBeNull();
    expect(page.strip!.tiles!.map((tile) => tile.state)).toEqual(['complete', 'pending', 'validated', 'out-of-scope']);
    expect(page.strip!.tiles!.map((tile) => tile.count)).toEqual(context.tiles!.map((tile) => tile.count));
  });

  it('Lendshed: the goal cell reads "Now building v1.1 Steward Desk" with the milestone goal', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context, lendshedStructured()))!;
    expect(page.strip!.goalLabel).toBe('Now building v1.1 Steward Desk');
    expect(page.strip!.goal?.startsWith('Lendshed owns its own sign-in')).toBe(true);
    expect(page.strip!.tiles).toHaveLength(4);
  });

  it('with tiles null the strip keeps only the goal cell', () => {
    const context = { ...buildProjectContext(lendshed.presentation), tiles: null };
    const page = composeProjectPage(inputOf(context, lendshedStructured()))!;
    expect(page.strip).not.toBeNull();
    expect(page.strip!.tiles).toBeNull();
    expect(page.strip!.goalLabel).toBe('Now building v1.1 Steward Desk');
  });

  it('with no Current Milestone section the goal cell is omitted and the tiles keep the strip', () => {
    const context = buildProjectContext(lendshed.presentation);
    const structured = { ...lendshedStructured(), project: { milestone: null } };
    const page = composeProjectPage(inputOf(context, structured))!;
    expect(page.strip!.goalLabel).toBeNull();
    expect(page.strip!.goal).toBeNull();
    expect(page.strip!.tiles).toHaveLength(4);
  });

  it('a milestone without a goal shows its label alone', () => {
    const context = buildProjectContext(lendshed.presentation);
    const structured = { project: { milestone: { label: 'v3.0 Quiet', version: 'v3.0', goal: null } } };
    const page = composeProjectPage(inputOf(context, structured))!;
    expect(page.strip!.goalLabel).toBe('Now building v3.0 Quiet');
    expect(page.strip!.goal).toBeNull();
  });

  it('a malformed structured.project is ignored, never thrown on', () => {
    const context = buildProjectContext(lendshed.presentation);
    for (const project of [null, 7, 'x', [], { milestone: 'x' }, { milestone: { label: 4, goal: {} } }]) {
      const page = composeProjectPage(inputOf(context, { project }));
      expect(page, JSON.stringify(project)).not.toBeNull();
      expect(page!.strip!.goalLabel).toBeNull();
    }
  });

  it('a PROJECT.md whose only recognised content is the milestone still composes', () => {
    const nameOnly: ProjectContext = {
      name: 'Bare',
      tagline: null,
      lead: null,
      coreValue: null,
      counts: null,
      tiles: null,
      dashboardUrl: '/',
    };
    const structured = { project: { milestone: { label: 'v1.0 First', version: 'v1.0', goal: 'Ship it.' } } };
    const page = composeProjectPage(inputOf(nameOnly, structured));
    expect(page).not.toBeNull();
    expect(page!.strip).toEqual({ goalLabel: 'Now building v1.0 First', goal: 'Ship it.', tiles: null });
  });

  it('is null without tiles, and a page with only tiles still composes', () => {
    const context = buildProjectContext(lendshed.presentation);
    expect(composeProjectPage(inputOf({ ...context, tiles: null }))!.strip).toBeNull();
    const onlyTiles = composeProjectPage(inputOf({ ...context, lead: null, coreValue: null }));
    expect(onlyTiles).not.toBeNull();
    expect(onlyTiles!.masthead.lead).toBeNull();
    expect(onlyTiles!.strip).not.toBeNull();
  });
});

describe('ProjectPageView strip', () => {
  const html = (): string => markup(composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)))!);

  it('renders each tile as a link with a square, the numeral, the label and the sub-line', () => {
    const out = html();
    expect(out.match(/class="view-project-tile"/g)?.length).toBe(4);
    expect(out).toContain('href="/traceability?milestone=v1.1&amp;state=complete"');
    expect(out).toContain('href="/traceability?milestone=v1.1&amp;state=pending"');
    expect(out).toContain('href="/traceability?state=validated"');
    expect(out).toContain('href="/traceability?state=out-of-scope"');
    expect(out).toContain('class="status-square" data-tone="complete" aria-hidden="true"');
    expect(out).toContain('shipped before');
    expect(out).toContain('by choice');
  });

  it('gives each tile an accessible name of its count, label and sub-line, and the breakdown a title', () => {
    const out = html();
    expect(out).toContain('aria-label="2 out of scope by choice"');
    expect(out).toContain('title="v1.0 ');
  });

  it('a zero-count tile shows 0 with a quiet square', () => {
    const context = buildProjectContext(lendshed.presentation);
    const tiles = context.tiles!.map((tile) =>
      tile.state === 'pending' ? { ...tile, count: 0, tone: 'quiet' as const } : tile,
    );
    const out = markup(composeProjectPage(inputOf({ ...context, tiles }))!);
    expect(out).toContain('aria-label="0 pending in v1.1"');
    expect(out).toContain('data-tone="quiet" aria-hidden="true"></i>0<');
  });

  it('renders the goal cell first, with its label and the clamped goal text', () => {
    const context = buildProjectContext(lendshed.presentation);
    const out = markup(composeProjectPage(inputOf(context, lendshedStructured()))!);
    expect(out).toContain('data-goal="true" data-tiles="true"');
    expect(out).toContain('<p class="view-project-goal-label">Now building v1.1 Steward Desk</p>');
    expect(out).toContain('view-project-goal-text');
    expect(out).toContain('Lendshed owns its own sign-in');
    expect(out.indexOf('view-project-goal')).toBeLessThan(out.indexOf('view-project-tile'));
  });

  it('with tiles absent the goal cell spans the strip', () => {
    const context = { ...buildProjectContext(lendshed.presentation), tiles: null };
    const out = markup(composeProjectPage(inputOf(context, lendshedStructured()))!);
    expect(out).toContain('data-goal="true" data-tiles="false"');
    expect(out).not.toContain('view-project-tile"');
  });

  it('with no goal the strip is the four tiles alone', () => {
    const out = html();
    expect(out).toContain('data-goal="false" data-tiles="true"');
    expect(out).not.toContain('view-project-goal');
  });

  it('omits the strip when there are no tiles', () => {
    const context = buildProjectContext(lendshed.presentation);
    const out = markup(composeProjectPage(inputOf({ ...context, tiles: null }))!);
    expect(out).not.toContain('view-project-strip');
  });
});

describe('composeProjectPage margin', () => {
  it('Lendshed: three constraints, two exclusions, the last-updated line and the dashboard url', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context, lendshedStructured()))!;
    expect(page.margin).not.toBeNull();
    expect(page.margin!.constraints.map((c) => c.name)).toEqual(['Tech stack', 'Security', 'Hardware']);
    expect(page.margin!.outOfScope.map((c) => c.name)).toEqual(['Payments and deposits', 'Mobile app']);
    expect(page.margin!.lastUpdated).toBe('2026-04-09 after Phase 3 — Account Admin & Sessions');
    expect(page.margin!.dashboardUrl).toBe('/');
  });

  it('is null when both lists are empty and lastUpdated is null', () => {
    const context = buildProjectContext(lendshed.presentation);
    const structured = { project: { milestone: null, constraints: [], outOfScope: [], lastUpdated: null } };
    expect(composeProjectPage(inputOf(context, structured))!.margin).toBeNull();
    expect(composeProjectPage(inputOf(context))!.margin).toBeNull();
  });

  it('a last-updated line alone still makes a margin', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context, { project: { constraints: [], outOfScope: [], lastUpdated: '2026-01-01' } }))!;
    expect(page.margin).toEqual({ constraints: [], outOfScope: [], lastUpdated: '2026-01-01', dashboardUrl: '/' });
  });

  it('drops malformed entries, keeps a nameless one with its text', () => {
    const context = buildProjectContext(lendshed.presentation);
    const project = { constraints: [null, 4, { name: 1, text: 2 }, { name: '', text: 'Kept' }, { name: 'N', text: 'T' }] };
    const page = composeProjectPage(inputOf(context, { project }))!;
    expect(page.margin!.constraints).toEqual([
      { name: '', text: 'Kept' },
      { name: 'N', text: 'T' },
    ]);
  });

  it('a PROJECT.md whose only recognised content is structured.project still composes', () => {
    const nameOnly: ProjectContext = { name: 'Bare', tagline: null, lead: null, coreValue: null, counts: null, tiles: null, dashboardUrl: '/' };
    const page = composeProjectPage(inputOf(nameOnly, { project: { outOfScope: [{ name: 'X', text: 'y' }] } }));
    expect(page).not.toBeNull();
    expect(page!.strip).toBeNull();
    expect(page!.margin!.outOfScope).toEqual([{ name: 'X', text: 'y' }]);
  });
});

describe('ProjectPageView margin', () => {
  const page = (): ComposedProjectPage => composeProjectPage(inputOf(buildProjectContext(lendshed.presentation), lendshedStructured()))!;

  it('lists "Bound by · 3" and "Will not do · 2" with names in dt and text in dd', () => {
    const out = markup(page());
    expect(out).toContain('>Bound by · 3</h2>');
    expect(out).toContain('>Will not do · 2</h2>');
    expect(out).toContain('<dt class="view-project-rule-name"><span>Tech stack</span></dt>');
    expect(out).toContain('view-project-rule-text');
    expect(out).toContain('data-refused="true"');
  });

  it('renders one aria-pressed toggle, closed by default, and the footer', () => {
    const out = markup(page());
    expect(out).toContain('aria-pressed="false"');
    expect(out).toContain('>Read in full<');
    expect(out).toContain('data-full="false"');
    expect(out).toContain('Last updated 2026-04-09 after Phase 3');
    expect(out).toContain('href="/"');
    expect(out).toContain('Where the work is now');
  });

  it('puts the margin after the masthead, in the body', () => {
    const out = markup(page());
    expect(out.indexOf('view-project-masthead')).toBeLessThan(out.indexOf('view-project-body'));
    expect(out.indexOf('view-project-body')).toBeLessThan(out.indexOf('view-project-margin"'));
  });

  it('omits the body and the margin when there is nothing to show', () => {
    const out = markup(composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)))!);
    expect(out).not.toContain('view-project-body');
    expect(out).not.toContain('Where the work is now');
  });

  it('renders a nameless constraint as its text alone', () => {
    const context = buildProjectContext(lendshed.presentation);
    const out = markup(composeProjectPage(inputOf(context, { project: { constraints: [{ name: '', text: 'Plain rule' }] } }))!);
    expect(out).toContain('Plain rule');
    expect(out).toContain('>Bound by · 1</h2>');
    expect(out).not.toContain('Will not do');
  });
});
