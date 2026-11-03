// Phase 9 (09-07, sketch 041 B): the PROJECT.md page composer and its masthead, through the real
// presentation and the real server join, on the made-up Lendshed project. Expected values come from the
// fixture's own PROJECT.md and the sketch's masthead, never from the composer's output.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildProjectContext } from '../../src/presentation/project-context.ts';
import type { ProjectContext } from '../../src/presentation/project-context.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { VIEW_MANIFESTS } from '../../src/web/views/manifests.ts';
import { composeProjectPage } from '../../src/web/views/project-page.ts';
import type { ComposedProjectPage } from '../../src/web/views/project-page.ts';
import { ProjectPageView } from '../../src/web/views/project-page-components.tsx';
import { loadFixtureProject } from '../helpers/fixture-project.ts';
import type { LoadedProject } from '../helpers/fixture-project.ts';

let lendshed: LoadedProject;
beforeAll(async () => {
  lendshed = await loadFixtureProject();
});

function inputOf(context: ProjectContext | null | undefined): ViewInput {
  return {
    kind: 'project',
    frontmatter: {},
    structured: {},
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
  it('Lendshed: the strip holds the four tiles from the context and no goal yet', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context))!;
    expect(page.strip).not.toBeNull();
    expect(page.strip!.goal).toBeNull();
    expect(page.strip!.tiles.map((tile) => tile.state)).toEqual(['complete', 'pending', 'validated', 'out-of-scope']);
    expect(page.strip!.tiles.map((tile) => tile.count)).toEqual(context.tiles!.map((tile) => tile.count));
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

  it('omits the strip when there are no tiles', () => {
    const context = buildProjectContext(lendshed.presentation);
    const out = markup(composeProjectPage(inputOf({ ...context, tiles: null }))!);
    expect(out).not.toContain('view-project-strip');
  });
});
