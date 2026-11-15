// quick-261115-k9z: the planning file tree. The model's unit cases on synthetic artifact lists, then the whole slice:
// an in-memory .planning/ through PlanningRepository and toProjectPresentation into the rendered SearchPage at
// ?view=tree, with the presentation seeded the way the shell caches it.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { planningTreeOf } from '../../src/presentation/planning-tree.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { SearchPage } from '../../src/web/pages/search-page.tsx';
import { projectKey } from '../../src/web/query-keys.ts';

type Entry = Parameters<typeof planningTreeOf>[0][number];
const file = (path: string, key: string, fileClass: Entry['fileClass'] = 'text'): Entry => ({ path, key, fileClass });

describe('planningTreeOf', () => {
  const model = planningTreeOf([
    file('.planning/STATE.md', '/state'),
    file('.planning/phases/10-b/x.md', '/x'),
    file('.planning/phases/9-a/y.md', '/y'),
    file('.planning/phases/9-a/z.png', '/z.png', 'image'),
  ]);

  it('lists rows in pre-order with the root first, numeric-aware, folders before files', () => {
    expect(model.rows.map((row) => `${row.depth}:${row.name}`)).toEqual([
      '0:.planning/',
      '1:phases/',
      '2:9-a/',
      '3:y.md',
      '3:z.png',
      '2:10-b/',
      '3:x.md',
      '1:STATE.md',
    ]);
    expect(model.rows[0]).toMatchObject({ dir: true, parent: null, fileCount: 4, href: null });
  });

  it("names each row's folder as its parent and counts every file beneath a folder", () => {
    expect(model.rows[3].parent).toBe(2);
    expect(model.rows[7].parent).toBe(0);
    expect(model.rows[1].fileCount).toBe(3);
    expect(model.rows[2].fileCount).toBe(2);
    expect(model.files).toBe(4);
    expect(model.folders).toBe(4);
  });

  it('opens a text file in Source, an image on its own page, and gives a file with no address no link', () => {
    const byName = (name: string) => model.rows.find((row) => row.name === name);
    expect(byName('STATE.md')?.href).toBe('/state?source=1');
    expect(byName('z.png')?.href).toBe('/z.png');
    const bare = planningTreeOf([file('.planning/odd.bin', '', 'binary')]);
    expect(bare.rows[1].href).toBeNull();
  });

  it('builds its own roots for paths outside .planning/, skips empty segments and never repeats a folder', () => {
    const odd = planningTreeOf([file('other//a.md', '/a'), file('other/b.md', '/b'), file('loose.md', '/l')]);
    expect(odd.rows.filter((row) => row.dir).map((row) => row.name)).toEqual(['other/']);
    expect(odd.rows.map((row) => row.name)).toEqual(['other/', 'a.md', 'b.md', 'loose.md']);
    expect(odd.files).toBe(3);
    expect(planningTreeOf([]).rows).toEqual([]);
  });
});

const ROOT = '/project';
const FILES: Record<string, string> = {
  '.planning/STATE.md': '---\ncurrent_phase: 1\n---\n# State\n',
  '.planning/ROADMAP.md': '# Roadmap\n\n## Phase 1: Alpha\n',
  '.planning/config.json': '{}',
  '.planning/odd-notes.txt': 'some notes nobody planned for\n',
  '.planning/phases/01-alpha/01-CONTEXT.md': '# Context\n',
  '.planning/phases/01-alpha/01-01-PLAN.md': '---\nphase: 1\nplan: 1\n---\n# Plan\n',
};

let presentation: ProjectPresentation;
beforeAll(async () => {
  const repository = new PlanningRepository(new InMemoryPlanningFilesystem(FILES), ROOT);
  presentation = toProjectPresentation(await repository.load());
});

function renderPage(url: string): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(projectKey('demo', null, 'presentation'), presentation);
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        MemoryRouter,
        { initialEntries: [url] },
        createElement(Routes, null, createElement(Route, { path: '/:project/*', element: createElement(SearchPage) })),
      ),
    ),
  );
}

describe('the search page at ?view=tree', () => {
  let html = '';
  beforeAll(() => {
    html = renderPage('/demo/search?view=tree');
  });

  it('shows the switch with File tree pressed and no query field', () => {
    expect(html).toContain('class="search-mode-switch"');
    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)File tree<\/button>/);
    expect(html).not.toContain('search-query-input');
  });

  it('opens .planning/ and leaves the folders below it collapsed, each with its file count', () => {
    expect(html).toContain('<span>.planning/</span>');
    expect(html).toMatch(/aria-expanded="true"[^>]*><svg[\s\S]*?<span>\.planning\/<\/span>/);
    expect(html).toMatch(/aria-expanded="false"[^>]*><svg[\s\S]*?<span>phases\/<\/span>/);
    expect(html).toContain('2 files');
    expect(html).not.toContain('01-CONTEXT.md');
  });

  it('links a root text file to its Source address and lists a root file the reader does not know', () => {
    const state = presentation.artifacts.find((artifact) => artifact.path === '.planning/STATE.md');
    expect(state).toBeDefined();
    expect(html).toContain(`href="/demo${state?.key}?source=1"`);
    expect(html).toContain('odd-notes.txt');
  });

  it('is the ordinary search, switch and query field included, at /search with no view', () => {
    const search = renderPage('/demo/search');
    expect(search).toContain('search-query-input');
    expect(search).toMatch(/<button[^>]*aria-pressed="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)Search<\/button>/);
    expect(search).toContain('search-mode-switch');
  });
});
