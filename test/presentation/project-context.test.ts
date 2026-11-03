// Phase 9 (09-07, sketch 041 B): the project page's server join. buildProjectContext reads the root
// PROJECT.md's name, what-it-is lead and core value through the dashboard's own readers, so the pages that
// quote PROJECT.md quote it the same way, and builds the four count tiles from the traceability projection
// alone (D-05). The fixture is the made-up Lendshed project; expected values are the dashboard head's and
// the traceability page's own, not the builder's output.
import { beforeAll, describe, expect, it } from 'vitest';
import { buildDashboardHead } from '../../src/presentation/dashboard-head.ts';
import { buildProjectContext } from '../../src/presentation/project-context.ts';
import {
  buildTraceabilityViewModel,
  requirementStateCounts,
  traceabilityStateUrl,
} from '../../src/presentation/traceability.ts';
import { matchesTraceabilityFilter, seedTraceabilityFilter } from '../../src/web/pages/traceability-filter.ts';
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

describe('buildProjectContext tiles (D-05)', () => {
  it('Lendshed: four tiles in the order complete, pending, shipped before, out of scope', () => {
    const context = buildProjectContext(lendshed.presentation);
    const counts = requirementStateCounts(lendshed.presentation)!;
    expect(context.counts).toEqual(counts);
    expect(context.tiles!.map((tile) => tile.state)).toEqual(['complete', 'pending', 'validated', 'out-of-scope']);
    expect(context.tiles!.map((tile) => tile.label)).toEqual(['complete', 'pending', 'shipped before', 'out of scope']);
    expect(context.tiles!.map((tile) => tile.count)).toEqual([
      counts.complete,
      counts.pending,
      counts.validated,
      counts.outOfScope,
    ]);
    expect(context.tiles!.map((tile) => tile.url)).toEqual([
      traceabilityStateUrl('complete', 'v1.1'),
      traceabilityStateUrl('pending', 'v1.1'),
      traceabilityStateUrl('validated'),
      traceabilityStateUrl('out-of-scope'),
    ]);
  });

  it('Lendshed: the sub-lines name the milestone, the breakdown oldest first, and "by choice"', () => {
    const tiles = buildProjectContext(lendshed.presentation).tiles!;
    const archived = requirementStateCounts(lendshed.presentation)!.validatedByMilestone;
    expect(tiles[0].sub).toBe('in v1.1');
    expect(tiles[1].sub).toBe('in v1.1');
    expect(tiles[2].sub).toBe(archived.map((entry) => `${entry.version} ${entry.count}`).join(' · '));
    expect(tiles[2].sub.startsWith('v1.0 ')).toBe(true);
    expect(tiles[2].title).toBe(tiles[2].sub);
    expect(tiles[3].sub).toBe('by choice');
    expect(tiles[0].title).toBeNull();
    expect(tiles.map((tile) => tile.tone)).toEqual(['complete', 'quiet', 'complete', 'quiet']);
  });

  it('orders the shipped-before breakdown oldest first however the archives are listed', async () => {
    const archive = (version: string, ids: string[]): string =>
      `# Requirements Archive: ${version}\n\n## v1 Requirements\n\n### Core\n\n${ids
        .map((id) => `- [x] **${id}**: Done`)
        .join('\n')}\n`;
    const project = await loadFiles({
      '.planning/PROJECT.md': '# Old\n\n## What This Is\n\nA thing.\n',
      '.planning/milestones/v1.0-REQUIREMENTS.md': archive('v1.0', ['A-01', 'A-02']),
      '.planning/milestones/v1.1-REQUIREMENTS.md': archive('v1.1', ['B-01']),
    });
    const tile = buildProjectContext(project.presentation).tiles!.find((candidate) => candidate.state === 'validated')!;
    expect(tile.count).toBe(3);
    expect(tile.sub).toBe('v1.0 2 · v1.1 1');
  });

  it('Lendshed: each tile count equals the rows traceability shows under that tile address', () => {
    const view = buildTraceabilityViewModel(lendshed.presentation);
    const tiles = buildProjectContext(lendshed.presentation).tiles!;
    const shown = (url: string): number => {
      const filter = seedTraceabilityFilter(url.slice(url.indexOf('?')), view);
      if (filter.state === 'out-of-scope') return view.outOfScope.length;
      if (filter.state === 'validated') {
        return view.archivedMilestones
          .filter((archive) => filter.milestone === null || archive.version === filter.milestone)
          .reduce((sum, archive) => sum + archive.total, 0);
      }
      return view.groups.flatMap((group) => group.rows).filter((row) => matchesTraceabilityFilter(row, filter)).length;
    };
    for (const tile of tiles) expect(shown(tile.url), tile.url).toBe(tile.count);
  });

  it('a zero count keeps its tile with a quiet tone', async () => {
    const project = await loadFiles({
      '.planning/PROJECT.md': '# Zero\n\n## What This Is\n\nA thing.\n',
      '.planning/REQUIREMENTS.md':
        '# Requirements\n\n## v1 Requirements\n\n### Core\n\n- [ ] **CORE-01**: One\n\n## Out of Scope\n\n| Feature | Reason |\n|---|---|\n| Thing | No |\n',
    });
    const tiles = buildProjectContext(project.presentation).tiles!;
    expect(tiles.map((tile) => tile.count)).toEqual([0, 1, 0, 1]);
    expect(tiles[0].tone).toBe('quiet');
    expect(tiles[2].tone).toBe('quiet');
    expect(tiles[2].sub).toBe('none yet');
  });

  it('with no requirements and no archive, there are no tiles', async () => {
    const project = await loadFiles({ '.planning/PROJECT.md': '# Bare\n\n## What This Is\n\nA thing.\n' });
    const context = buildProjectContext(project.presentation);
    expect(context.counts).toBeNull();
    expect(context.tiles).toBeNull();
  });

  it('PROJECT.md requirement bullets are never counted', async () => {
    const planted = await loadFiles({
      '.planning/PROJECT.md': '# Planted\n\n## Requirements\n\n### Validated\n\n- ✓ One — v9\n- ✓ Two — v9\n',
    });
    expect(buildProjectContext(planted.presentation).tiles).toBeNull();
  });
});
