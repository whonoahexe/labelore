// The header project switcher (PLAT-02, D-05, D-06) as a static contract: no browser here (the browser
// half is test/e2e/switcher.spec.ts). The trigger is a static render of ProjectSwitcher over a seeded
// QueryClient; the popup content is a static render of ProjectSwitcherPanel, because Base UI renders a
// popover's portal only on the client. Source reads pin what a render cannot show.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ProjectListEntry } from '../../src/presentation/project-list.ts';
import { ProjectSwitcher, ProjectSwitcherPanel } from '../../src/web/components/project-switcher.tsx';
import { projectsKey } from '../../src/web/query-keys.ts';

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

function entry(slug: string, name: string, overrides: Partial<ProjectListEntry> = {}): ProjectListEntry {
  return {
    slug,
    name,
    kind: 'local',
    target: `/srv/made-up/${slug}`,
    displayPath: `/srv/made-up/${slug}`,
    state: 'unloaded',
    reason: null,
    pathChecked: null,
    lastOpened: null,
    sessionOnly: false,
    ...overrides,
  };
}

function render(node: React.ReactElement, projects: ProjectListEntry[] | null): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (projects !== null) client.setQueryData(projectsKey, { projects, notices: [] });
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ['/'] }, node)),
  );
}

describe('the switcher trigger', () => {
  const lendshed = entry('lendshed', 'Lendshed');

  it('is a button named for the current project, a dialog opener, closed, with the full target as its title', () => {
    const markup = render(createElement(ProjectSwitcher, { current: lendshed, meta: 'v1.1 · Phase 4/4' }), [lendshed]);

    expect(markup).toContain('aria-label="Switch project. Current project: Lendshed"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain(`title="${lendshed.target}"`);
    expect(markup).toContain('class="project-switcher-trigger"');
    expect(markup).toContain('<span class="brand-project-name">Lendshed</span>');
    expect(markup).toContain('<small class="brand-meta">v1.1 · Phase 4/4</small>');
    expect(markup).toContain('lucide-chevrons-up-down');
    // The list is closed, so none of it is in the markup.
    expect(markup).not.toContain('project-switcher-popup');
    expect(markup).not.toContain('class="project-row"');
  });

  it('omits the meta line while it is empty', () => {
    const markup = render(createElement(ProjectSwitcher, { current: lendshed, meta: null }), [lendshed]);
    expect(markup).not.toContain('brand-meta');
  });

  it('renders a name or target that looks like markup as text only (T-08-40)', () => {
    const hostile = entry('hostile', '<img src=x onerror=alert(1)>', { target: '/tmp/"><script>x</script>' });
    const markup = render(createElement(ProjectSwitcher, { current: hostile, meta: null }), [hostile]);
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('<script');
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('the switcher list', () => {
  it('holds the Projects head, an All projects link to /, then the rows and the footer region, in that order', () => {
    const lendshed = entry('lendshed', 'Lendshed');
    const shapes = entry('shapes', 'Shapes');
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed' }), [lendshed, shapes]);

    const head = markup.indexOf('<p>Projects</p>');
    const allProjects = markup.indexOf('All projects');
    const firstRow = markup.indexOf('class="project-row"');
    const footer = markup.indexOf('class="project-switcher-footer"');
    expect(head).toBeGreaterThanOrEqual(0);
    expect(allProjects).toBeGreaterThan(head);
    expect(markup).toContain('class="text-link" href="/"');
    expect(firstRow).toBeGreaterThan(allProjects);
    expect(footer).toBeGreaterThan(firstRow);
    expect(markup).not.toContain('No projects yet.');
  });

  it('keeps the order the server sends and marks only the current project (accent rule, check, Current)', () => {
    const projects = [entry('shapes', 'Shapes'), entry('lendshed', 'Lendshed'), entry('kiln', 'Kiln')];
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed' }), projects);

    const positions = ['/shapes', '/lendshed', '/kiln'].map((href) => markup.indexOf(`href="${href}"`));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(markup.match(/class="project-row"/g)).toHaveLength(3);
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1);
    expect(markup.match(/data-current="true"/g)).toHaveLength(1);
    expect(markup.match(/>Current</g)).toHaveLength(1);
    const current = markup.indexOf('aria-current="true"');
    expect(markup.indexOf('href="/lendshed"')).toBeGreaterThan(current);
    expect(markup.indexOf('href="/kiln"')).toBeGreaterThan(markup.indexOf('href="/lendshed"'));
  });

  it('shows one row, marked current, for a one-project list', () => {
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed' }), [
      entry('lendshed', 'Lendshed'),
    ]);

    expect(markup.match(/class="project-row"/g)).toHaveLength(1);
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1);
    expect(markup).not.toContain('No projects yet.');
  });

  it('shows "No projects yet." before the footer, and no row, for an empty list', () => {
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed' }), []);

    const note = markup.indexOf('<div class="empty-note">No projects yet.</div>');
    const footer = markup.indexOf('class="project-switcher-footer"');
    expect(note).toBeGreaterThanOrEqual(0);
    expect(footer).toBeGreaterThan(note);
    expect(markup).not.toContain('class="project-row"');
    expect(markup).toContain('All projects');
  });

  it('never shows an empty-list note while the list has not arrived', () => {
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed' }), null);
    expect(markup).not.toContain('No projects yet.');
    expect(markup).toContain('Loading projects…');
  });

  it('keeps an unavailable row in its place with its reason, and links every row to its own project only (T-08-41)', () => {
    const projects = [
      entry('lendshed', 'Lendshed'),
      entry('gone', 'Gone', { state: 'unavailable', reason: 'The folder is missing.' }),
    ];
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed' }), projects);

    expect(markup).toContain('Unavailable');
    expect(markup).toContain('The folder is missing.');
    expect(markup).toContain('href="/gone"');
    // Never prefixed with the current project's slug.
    expect(markup).not.toContain('href="/lendshed/gone"');
    expect(markup).not.toContain('href="/lendshed/');
  });
});

describe('the switcher sources', () => {
  const switcher = source('src/web/components/project-switcher.tsx');

  it('reads the cheap list through fetchProjects with staleTime 0, and only while the list is open', () => {
    expect(switcher).toContain('queryKey: projectsKey');
    expect(switcher).toContain('queryFn: fetchProjects');
    expect(switcher).toContain('staleTime: 0');
    // The query lives in the panel the popup renders, not in the trigger's component.
    const trigger = switcher.slice(switcher.indexOf('export function ProjectSwitcher('));
    expect(trigger).not.toContain('useQuery');
  });

  it('is a Base UI popover whose popup is labelled Projects, and whose links go through AppLink', () => {
    expect(switcher).toContain("from '@base-ui/react/popover'");
    expect(switcher).toContain('aria-label="Projects"');
    expect(switcher).toContain('aria-haspopup="dialog"');
    expect(switcher).toContain('Switch project. Current project: ${current.name}');
    expect(switcher).toContain('AppLink');
    expect(switcher).not.toContain("from 'react-router'");
    expect(switcher).not.toContain('dangerouslySetInnerHTML');
  });

  it('is not a descendant of the brand link in the shell (a link may not contain a button)', () => {
    const shell = source('src/web/components/app-shell.tsx');
    const linkStart = shell.indexOf('<NavLink\n              className="brand"');
    expect(linkStart).toBeGreaterThanOrEqual(0);
    const linkEnd = shell.indexOf('</NavLink>', linkStart);
    expect(linkEnd).toBeGreaterThan(linkStart);
    const switcherAt = shell.indexOf('<ProjectSwitcher');
    expect(switcherAt).toBeGreaterThan(linkEnd);
    expect(shell.slice(linkStart, linkEnd)).not.toContain('ProjectSwitcher');
    // The switcher is a sibling in the lockup, the one `brand` grid area.
    expect(shell.slice(linkEnd, switcherAt)).not.toContain('<NavLink');
    expect(shell.indexOf('<div className="brand-lockup">')).toBeLessThan(linkStart);
  });
});
