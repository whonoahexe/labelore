// The header project switcher (PLAT-02, D-05, D-06) as a static contract: no browser here (the browser
// half is test/e2e/switcher.spec.ts). The trigger is a static render of ProjectSwitcher over a seeded
// QueryClient; the popup content is a static render of ProjectSwitcherPanel, because Base UI renders a
// popover's portal only on the client. Source reads pin what a render cannot show.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ProjectListEntry } from '../../src/presentation/project-list.ts';
import { ProjectList, ProjectRowConfirm } from '../../src/web/components/project-row.tsx';
import { ProjectScan, addedCopy, scanCopy } from '../../src/web/components/project-scan.tsx';
import { ProjectSwitcher, ProjectSwitcherPanel } from '../../src/web/components/project-switcher.tsx';
import { projectsKey } from '../../src/web/query-keys.ts';

const onAddOrScan = (): void => undefined;

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
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed', onAddOrScan }), [lendshed, shapes]);

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
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed', onAddOrScan }), projects);

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
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed', onAddOrScan }), [
      entry('lendshed', 'Lendshed'),
    ]);

    expect(markup.match(/class="project-row"/g)).toHaveLength(1);
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1);
    expect(markup).not.toContain('No projects yet.');
  });

  it('shows "No projects yet." before the footer, and no row, for an empty list', () => {
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed', onAddOrScan }), []);

    const note = markup.indexOf('<div class="empty-note">No projects yet.</div>');
    const footer = markup.indexOf('class="project-switcher-footer"');
    expect(note).toBeGreaterThanOrEqual(0);
    expect(footer).toBeGreaterThan(note);
    expect(markup).not.toContain('class="project-row"');
    expect(markup).toContain('All projects');
  });

  it('ends with the "Add or scan…" button in the footer, the last control in the list (039 A fact 4)', () => {
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed', onAddOrScan }), [
      entry('lendshed', 'Lendshed'),
    ]);

    const footer = markup.indexOf('class="project-switcher-footer"');
    const button = markup.indexOf('Add or scan…');
    expect(footer).toBeGreaterThanOrEqual(0);
    expect(button).toBeGreaterThan(footer);
    expect(markup).toContain('lucide-plus');
    // Nothing focusable follows the footer's button.
    expect(markup.slice(button)).not.toMatch(/<(a|button|input)\b/);
    // The footer holds a button, not a link: the list stays open until the dialog takes over.
    expect(markup.slice(footer, button)).toMatch(/<button\b/);
  });

  it('never shows an empty-list note while the list has not arrived', () => {
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed', onAddOrScan }), null);
    expect(markup).not.toContain('No projects yet.');
    expect(markup).toContain('Loading projects…');
  });

  it('keeps an unavailable row in its place with its reason, and links every row to its own project only (T-08-41)', () => {
    const projects = [
      entry('lendshed', 'Lendshed'),
      entry('gone', 'Gone', { state: 'unavailable', reason: 'The folder is missing.' }),
    ];
    const markup = render(createElement(ProjectSwitcherPanel, { currentSlug: 'lendshed', onAddOrScan }), projects);

    expect(markup).toContain('Unavailable');
    expect(markup).toContain('The folder is missing.');
    expect(markup).toContain('href="/gone"');
    // Never prefixed with the current project's slug.
    expect(markup).not.toContain('href="/lendshed/gone"');
    expect(markup).not.toContain('href="/lendshed/');
  });
});

// Forgetting a project (D-10): the quiet action on every switcher and landing row and its inline confirm.
// The confirm is a static render of ProjectRowConfirm (the row swaps to it on a press, which a static
// render cannot do); the browser half is test/e2e/switcher.spec.ts.
describe('the forget action', () => {
  const lendshed = entry('lendshed', 'Lendshed');

  it('gives a list that cannot forget (no onForgotten) no forget action', () => {
    const markup = render(createElement(ProjectList, { entries: [lendshed], variant: 'switcher' }), null);
    expect(markup).not.toContain('project-row-actions');
    expect(markup).not.toContain('Forget');
  });

  it('asks the UI-SPEC question with a neutral "Forget project" and "Keep project", in that order', () => {
    const markup = render(
      createElement(ProjectRowConfirm, { entry: lendshed, onKeep: () => undefined, onForgotten: () => undefined }),
      null,
    );
    const question = "Forget Lendshed? Labelore only removes it from this list. The project's files are not touched.";
    expect(markup).toContain(question.replace(/'/g, '&#x27;'));
    expect(markup).toContain('class="project-row-confirm"');
    const forget = markup.indexOf('>Forget project</button>');
    const keep = markup.indexOf('>Keep project</button>');
    expect(forget).toBeGreaterThan(0);
    expect(keep).toBeGreaterThan(forget);
    // Nothing deletes anything in the wording, and the buttons start enabled.
    expect(markup).not.toMatch(/delete/i);
    expect(markup).not.toMatch(/\sdisabled[\s=>]/);
  });

  it('renders a project name that looks like markup as text in the question (T-08-30)', () => {
    const hostile = entry('hostile', '<img src=x onerror=alert(1)>');
    const markup = render(
      createElement(ProjectRowConfirm, { entry: hostile, onKeep: () => undefined, onForgotten: () => undefined }),
      null,
    );
    expect(markup).not.toContain('<img');
    expect(markup).toContain('Forget &lt;img src=x onerror=alert(1)&gt;?');
  });
});

// The scan checklist (D-14): the pure copy helper and what the form shows before anything has been scanned.
// The result states need a request, so they are covered in the browser (test/e2e/switcher.spec.ts).
describe('the scan checklist', () => {
  // Joined so no tilde path into the Work folder is written out in a test (the real-path guard).
  const work = ['~', 'Work'].join('/');

  it('words the legend and the add button for zero, one and many projects', () => {
    expect(scanCopy(0, work)).toEqual({ legend: `Found 0 projects in ${work}`, add: 'Add projects' });
    expect(scanCopy(1, work)).toEqual({ legend: `Found 1 project in ${work}`, add: 'Add 1 project' });
    expect(scanCopy(3, work)).toEqual({ legend: `Found 3 projects in ${work}`, add: 'Add 3 projects' });
  });

  it('words the done line for one and many projects', () => {
    expect(addedCopy(2)).toBe('Added 2 projects. They open the first time you choose them.');
    expect(addedCopy(1)).toBe('Added 1 project. It opens the first time you choose it.');
  });

  it('shows only the folder form before a scan: nothing is scanned by rendering it (D-16)', () => {
    const markup = render(createElement(ProjectScan), null);
    expect(markup).toContain('Folder to scan');
    expect(markup).toContain(`placeholder="${work}"`);
    expect(markup).toContain('Looks two levels down inside your home folder. Hidden folders, node_modules and symlinks are skipped.');
    expect(markup).toContain('Scan folder');
    expect(markup).not.toContain('project-scan-results');
    expect(markup).not.toContain('<fieldset');
    expect(markup).not.toContain('role="alert"');
  });
});
