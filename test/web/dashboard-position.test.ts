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

  it('renders Then with its date, kind phrase, file link and the quoted session note', async () => {
    const files = {
      '.planning/ROADMAP.md': ROADMAP,
      '.planning/STATE.md':
        '---\nmilestone: v1.0\nstatus: executing\n---\n\n## Session Continuity\n\nLast session: 2026-11-15T09:00:00.000Z\nStopped at: Phase 1 context gathered\n',
      '.planning/phases/01-first-slice/01-RESEARCH.md': '# Research\n',
    };
    const research = Date.parse('2026-11-14T10:00:00.000Z');
    const snapshot = await new PlanningRepository(
      new InMemoryPlanningFilesystem(files, { '.planning/phases/01-first-slice/01-RESEARCH.md': research }),
      '/project',
    ).load();
    const position = buildDashboardPosition(toProjectPresentation({ ...snapshot, readAt: '2026-11-15T12:00:00.000Z' }));
    const markup = render(position as DashboardPosition, null);
    expect(markup).toContain('Then · 14 Nov');
    expect(markup).toContain('Research written');
    expect(markup).toMatch(/<a[^>]*href="[^"]*research[^"]*"[^>]*>01-RESEARCH\.md<\/a>/);
    expect(markup).toContain('Session note');
    expect(markup).toContain('“Phase 1 context gathered”');
    expect(markup).toContain('15 Nov');
  });

  it('renders Between milestones with no stage cells for a shipped milestone', async () => {
    const files = {
      '.planning/STATE.md': '---\nmilestone: v1.1\nmilestone_name: Legible Documents\n---\n',
      '.planning/milestones/v1.1-ROADMAP.md': '# v1.1\n\n### Phase 5: Per-Type Document Views\n\n**Goal:** Views.\n',
      '.planning/milestones/v1.1-phases/05-x/05-01-PLAN.md': planFile('05-01'),
      '.planning/milestones/v1.1-phases/05-x/05-01-SUMMARY.md': '# Summary\n',
    };
    const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
    const position = buildDashboardPosition(toProjectPresentation({ ...snapshot, readAt: '2026-11-15T12:00:00.000Z' }));
    const markup = render(position as DashboardPosition, null);
    expect(markup).toContain('Between milestones');
    expect(markup).toContain('/gsd-new-milestone');
    expect(markup).not.toContain('position-cell');
  });

  it('renders the also list: ready phases, the step, and the deferred link to the STATE.md anchor', async () => {
    const files = {
      '.planning/ROADMAP.md': ROADMAP.replace('**Goal**: Second.', '**Goal**: Second.\n**Depends on**: Nothing'),
      '.planning/STATE.md':
        '---\nmilestone: v1.0\n---\n\n## Deferred Items\n\n| Item |\n|------|\n| one |\n\n## Operator Next Steps\n\n- Ask the operator about the team PCs\n',
    };
    const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
    const position = buildDashboardPosition(toProjectPresentation({ ...snapshot, readAt: '2026-11-15T12:00:00.000Z' }));
    const markup = render(position as DashboardPosition, null);
    expect(markup).toContain('Phase 2 has no open prerequisites and can be discussed alongside it.');
    expect(markup).toContain('Ask the operator about the team PCs');
    expect(markup).toMatch(/<a[^>]*href="[^"]*#deferred-items"[^>]*>1 deferred item<\/a>/);
    expect(markup).toContain('waiting in STATE.md');
  });

  describe('stage detail stays short at any plan count', () => {
    async function sixteen(): Promise<DashboardPosition> {
      const files: Record<string, string> = {
        '.planning/ROADMAP.md': '# Roadmap\n\n## Phase Details\n\n### Phase 9: Big Phase\n**Goal**: Many.\n',
        '.planning/STATE.md': '---\nmilestone: v1.0\n---\n',
      };
      for (let index = 1; index <= 16; index += 1) {
        const id = `09-${String(index).padStart(2, '0')}`;
        files[`.planning/phases/09-big-phase/${id}-PLAN.md`] = planFile(id);
        if (index <= 9) files[`.planning/phases/09-big-phase/${id}-SUMMARY.md`] = '# Summary\n';
      }
      const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
      const position = buildDashboardPosition(toProjectPresentation({ ...snapshot, readAt: '2026-11-15T12:00:00.000Z' }));
      if (!position) throw new Error('expected a position');
      return position;
    }

    it('Execute: one square per plan, three rows with Next on the first, and the All link', async () => {
      const markup = render(await sixteen(), 3);
      const detail = markup.slice(markup.indexOf('class="position-detail"'), markup.indexOf('data-point="next"'));
      expect(detail.match(/class="position-square"/g)).toHaveLength(16 + 3);
      expect(detail).toContain('9 of 16 done');
      expect(detail.match(/<li /g)).toHaveLength(3);
      expect(detail.match(/>Next</g)).toHaveLength(1);
      expect(detail).toContain('All 16 plans →');
      expect(detail).toMatch(/<a[^>]*class="position-more"[^>]*href="[^"]*\/phase-9"/);
      expect(detail.match(/class="position-one-line"/g)).toHaveLength(3);
    });

    it('Plan: one summary line plus the link', async () => {
      const markup = render(await sixteen(), 2);
      const detail = markup.slice(markup.indexOf('class="position-detail"'));
      expect(detail).toContain('16 PLAN files · 09-01 … 09-16');
      expect(detail).toContain('All 16 plans →');
      expect(detail).not.toContain('position-square');
    });

    it('an empty stage is one sentence naming its command', async () => {
      const files = { '.planning/ROADMAP.md': ROADMAP, '.planning/STATE.md': '---\nmilestone: v1.0\n---\n' };
      const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
      const position = buildDashboardPosition(toProjectPresentation({ ...snapshot, readAt: '2026-11-15T12:00:00.000Z' }));
      const markup = render(position as DashboardPosition, 0);
      const detail = markup.slice(markup.indexOf('class="position-detail"'), markup.indexOf('data-point="next"'));
      expect(detail).toContain('No phase folder yet. <b>/gsd-discuss-phase 1</b> creates it and writes NN-CONTEXT.md.');
    });
  });

  it('renders the shipped milestone phase squares with an All phases link', async () => {
    const files = {
      '.planning/STATE.md': '---\nmilestone: v1.1\n---\n',
      '.planning/milestones/v1.1-ROADMAP.md': '# v1.1\n\n### Phase 5: Views\n**Goal:** V.\n\n### Phase 6: Pages\n**Goal:** P.\n',
      '.planning/milestones/v1.1-phases/05-views/05-01-PLAN.md': planFile('05-01'),
      '.planning/milestones/v1.1-phases/05-views/05-01-SUMMARY.md': '# Summary\n',
      '.planning/milestones/v1.1-phases/06-pages/06-01-PLAN.md': planFile('06-01'),
      '.planning/milestones/v1.1-phases/06-pages/06-01-SUMMARY.md': '# Summary\n',
    };
    const snapshot = await new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load();
    const position = buildDashboardPosition(toProjectPresentation({ ...snapshot, readAt: '2026-11-15T12:00:00.000Z' }));
    const markup = render(position as DashboardPosition, null);
    expect(markup.match(/class="position-square"/g)).toHaveLength(2);
    expect(markup).toContain('2 of 2 phases');
    expect(markup).toContain('All 2 phases →');
    expect(markup).toMatch(/<a[^>]*href="[^"]*roadmap[^"]*"/);
  });

  it('opens the Discuss cell to list its files', async () => {
    const markup = render(await executing(), 0);
    expect(markup).toMatch(/<button[^>]*aria-expanded="true"[^>]*>/);
    expect(markup).toContain('class="position-detail"');
    expect(markup).toContain('01-CONTEXT.md');
  });
});
