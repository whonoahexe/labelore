// Phase 9 (09-07, sketch 041 B): the project page's server join. buildProjectContext reads the root
// PROJECT.md's name, what-it-is lead and core value through the dashboard's own readers, so the pages that
// quote PROJECT.md quote it the same way. The fixture is the made-up Lendshed project; expected values are
// the dashboard head's, not the builder's own output.
import { beforeAll, describe, expect, it } from 'vitest';
import { buildDashboardHead } from '../../src/presentation/dashboard-head.ts';
import { buildProjectContext } from '../../src/presentation/project-context.ts';
import { loadFiles, loadFixtureProject } from '../helpers/fixture-project.ts';
import type { LoadedProject } from '../helpers/fixture-project.ts';

let lendshed: LoadedProject;
beforeAll(async () => {
  lendshed = await loadFixtureProject();
});

describe('buildProjectContext', () => {
  it('Lendshed: the name, the What This Is lead the dashboard shows, and the core value', () => {
    const context = buildProjectContext(lendshed.presentation);
    const head = buildDashboardHead(lendshed.presentation);
    expect(context.name).toBe('Lendshed');
    expect(context.tagline).toBeNull();
    expect(context.lead).not.toBeNull();
    expect(context.lead).toBe(head.lead);
    expect(context.lead!.startsWith('A web app for a neighbourhood tool library')).toBe(true);
    expect(context.coreValue).toBe(
      'A member can see what is on the shelf at every shed and borrow it without asking a steward to look it up.',
    );
    expect(context.dashboardUrl).toBe('/');
  });

  it('splits a title at its first spaced dash into a name and a tagline', async () => {
    const project = await loadFiles({
      '.planning/PROJECT.md': '# Kiln — A pottery studio booking tool\n\n## What This Is\n\nBook kiln time.\n',
    });
    const context = buildProjectContext(project.presentation);
    expect(context.name).toBe('Kiln');
    expect(context.tagline).toBe('A pottery studio booking tool');
    expect(context.lead).toBe('Book kiln time.');
    expect(context.coreValue).toBeNull();
  });

  it('a payload without PROJECT.md never throws and names the project from its folder', async () => {
    const project = await loadFiles({ '.planning/STATE.md': '---\nstatus: planning\n---\n' });
    const context = buildProjectContext(project.presentation);
    expect(typeof context.name).toBe('string');
    expect(context.name.length).toBeGreaterThan(0);
    expect(context.lead).toBeNull();
    expect(context.coreValue).toBeNull();
  });

  it('a PROJECT.md with no recognised section gives a context of only the name', async () => {
    const project = await loadFiles({ '.planning/PROJECT.md': '# Bare\n\nJust a paragraph.\n' });
    const context = buildProjectContext(project.presentation);
    expect(context.name).toBe('Bare');
    expect(context.lead).toBeNull();
    expect(context.coreValue).toBeNull();
  });
});
