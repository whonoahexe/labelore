// quick-261115-o34: static renders of the dashboard's "Where the work stands" line (sketches 066 C and
// 067 S). The page component holds only the open cell; everything else comes from the position the
// server derived, so the stateless view is rendered here with a chosen `open`.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildDashboardPosition, type DashboardPosition } from '../../src/presentation/dashboard-position.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import { nextOpenStage, PositionLineView } from '../../src/web/pages/dashboard-position.tsx';

const ROADMAP = `# Roadmap

## Phase Details

### Phase 1: First Slice
**Goal**: First.

### Phase 2: Second Slice
**Goal**: Second.
`;

const planFile = (id: string) =>
  `---\nphase: 01\nplan: ${id.slice(3)}\n---\n<objective>\nBuild ${id}.\n</objective>\n`;

async function executing(): Promise<DashboardPosition> {
  const files = {
    '.planning/ROADMAP.md': ROADMAP,
    '.planning/STATE.md': '---\nmilestone: v1.0\nstatus: executing\n---\n',
    '.planning/phases/01-first-slice/01-CONTEXT.md': '# Context\n',
    '.planning/phases/01-first-slice/01-01-PLAN.md': planFile('01-01'),
    '.planning/phases/01-first-slice/01-01-SUMMARY.md': '# Summary\n',
    '.planning/phases/01-first-slice/01-02-PLAN.md': planFile('01-02'),
  };
  const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
  const position = buildDashboardPosition(toProjectPresentation({ ...snapshot, readAt: '2026-11-15T12:00:00.000Z' }));
  if (!position) throw new Error('expected a position');
  return position;
}

const render = (position: DashboardPosition, open: number | null): string =>
  renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(PositionLineView, { position, open, onToggle: () => undefined })),
  );

describe('dashboard position line', () => {
  it('toggles: choosing the open cell closes it, choosing another switches', () => {
    expect(nextOpenStage(null, 2)).toBe(2);
    expect(nextOpenStage(2, 2)).toBeNull();
    expect(nextOpenStage(2, 3)).toBe(3);
  });

  it('renders the three points and five closed cells, with no STATE.md status word', async () => {
    const markup = render(await executing(), null);
    expect(markup).toContain('aria-label="Where the work stands"');
    expect(markup).toContain('data-point="then"');
    expect(markup).toContain('data-point="now"');
    expect(markup).toContain('data-point="next"');
    const cells = markup.match(/<button[^>]*class="position-cell"[^>]*>/g) ?? [];
    expect(cells).toHaveLength(5);
    for (const cell of cells) expect(cell).toContain('aria-expanded="false"');
    for (const name of ['Discuss', 'Research', 'Plan', 'Execute', 'Verify']) expect(markup).toContain(`>${name}<`);
    expect(markup).toContain('1/2 plans');
    expect(markup).toContain('/gsd-execute-phase 1');
    expect(markup).toMatch(/href="[^"]*\/phase-1\/plan-02"/);
    expect(markup).not.toContain('position-detail');
    expect(markup).not.toContain('Executing');
  });

  it('opens the Discuss cell to list its files', async () => {
    const markup = render(await executing(), 0);
    expect(markup).toMatch(/<button[^>]*aria-expanded="true"[^>]*>/);
    expect(markup).toContain('class="position-detail"');
    expect(markup).toContain('01-CONTEXT.md');
  });
});
