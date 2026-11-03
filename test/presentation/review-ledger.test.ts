// Phase 9 (09-12, 09-13): buildLedgerContext and ledgerFixMembers. A folder's review-family files (the REVIEW,
// its REVIEW-DISPOSITION and every REVIEW-FIX, plain or suffixed) are found by directory and kind in the cached presentation; the same
// member set comes back from any one of them (the assumption-delta invariant), a lone file is a one-member
// context the page draws as nothing, and the head totals the findings by severity without a disposition and
// takes open and total from the disposition's rows when there is one (D-08).
// Fixtures are the made-up Lendshed project, planted in-memory folders for the shapes it does not hold, and
// every committed fixture root for the invariant.
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildLedgerContext,
  ledgerFixMembers,
  MAX_FIX_MEMBERS,
} from '../../src/presentation/review-ledger.ts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_FIXTURE_ROOTS } from '../helpers/fixture-roots.ts';
import { fxRead, loadFiles, loadFixtureProject, loadProject } from '../helpers/fixture-project.ts';
import type { LoadedProject } from '../helpers/fixture-project.ts';

const PHASE_03 = '.planning/phases/03-account-admin-and-sessions';
const REVIEW_03 = `${PHASE_03}/03-REVIEW.md`;
const FIX_BACKEND = `${PHASE_03}/03-REVIEW-FIX-backend.md`;
const FIX_FRONTEND = `${PHASE_03}/03-REVIEW-FIX-frontend.md`;

let lendshed: LoadedProject;
beforeAll(async () => {
  lendshed = await loadFixtureProject();
});

const contextOf = (project: LoadedProject, path: string) =>
  buildLedgerContext(project.presentation, project.registry, path);

describe('buildLedgerContext - Lendshed phase 3 (a review and two shard fix reports)', () => {
  it.each([REVIEW_03, FIX_BACKEND, FIX_FRONTEND])(
    'lists the same three members from %s',
    (path) => {
      const context = contextOf(lendshed, path);
      expect(context).not.toBeNull();
      expect(context!.members.map((member) => member.path)).toEqual([
        REVIEW_03,
        FIX_BACKEND,
        FIX_FRONTEND,
      ]);
      expect(context!.members.map((member) => member.tab)).toEqual(['review', 'fix', 'fix']);
      expect(context!.members.map((member) => member.suffix)).toEqual([
        null,
        'backend',
        'frontend',
      ]);
      expect(context!.members.every((member) => member.url !== null)).toBe(true);
    },
  );

  it('draws the Review and Fix tabs, each at its own url, with the active tab following the opened file', () => {
    const context = contextOf(lendshed, FIX_FRONTEND)!;
    expect(context.tabs.map((tab) => tab.label)).toEqual(['Review', 'Fix']);
    expect(context.tabs[0].url).toBe('/v1.1/phase-3/review');
    expect(context.tabs[1].url).toBe('/v1.1/phase-3/review-fix-backend');
    expect(context.active).toBe('fix');
    expect(context.activeSuffix).toBe('frontend');
    expect(contextOf(lendshed, REVIEW_03)!.active).toBe('review');
    expect(contextOf(lendshed, REVIEW_03)!.activeSuffix).toBeNull();
  });

  it('counts the review findings and the distinct finding ids the fix entries name', () => {
    const context = contextOf(lendshed, REVIEW_03)!;
    expect(context.tabs[0].count).toBe(7);
    // WR-01, WR-03, WR-02, IN-03 (skipped) and IN-09.
    expect(context.tabs[1].count).toBe(5);
  });

  it('heads the ledger with 7 findings over three warnings and four infos, and 4 fixed in the fix report', () => {
    const { head } = contextOf(lendshed, REVIEW_03)!;
    expect(head.open).toBeNull();
    expect(head.total).toBe(7);
    expect(head.fixedInReport).toBe(4);
    expect(head.bySeverity.map((row) => [row.severity, row.total, row.fixed, row.open])).toEqual([
      ['warning', 3, 3, null],
      ['info', 4, 0, null],
    ]);
    // IN-09 is fixed but is not one of the review's findings: it counts in the report, not in a severity row.
    expect(head.bySeverity.flatMap((row) => row.ids)).not.toContain('IN-09');
  });

  it('carries each fix file with its suffix, frontmatter and parsed report', () => {
    const { fixes } = contextOf(lendshed, REVIEW_03)!;
    expect(fixes.map((fix) => fix.suffix)).toEqual(['backend', 'frontend']);
    expect(fixes[0].frontmatter).toMatchObject({ fixed: 2, skipped: 0, status: 'all_fixed' });
    expect(fixes[1].frontmatter).toMatchObject({ fixed: 2, skipped: 1, status: 'partial' });
    expect(fixes[0].report?.entries).toHaveLength(2);
    expect(fixes[1].report?.entries).toHaveLength(3);
  });

  it('gives a severity to every id a fix names, the review fix-only ids by their token', () => {
    const { severityById } = contextOf(lendshed, REVIEW_03)!;
    expect(severityById['WR-01']).toBe('warning');
    expect(severityById['IN-09']).toBe('info');
  });
});

const PHASE_01 = '.planning/phases/01-member-sign-in-sessions';
const PHASE_02 = '.planning/phases/02-roles-and-permissions';

describe('buildLedgerContext - the disposition member (Lendshed phases 1 and 2)', () => {
  it.each([
    `${PHASE_01}/01-REVIEW.md`,
    `${PHASE_01}/01-REVIEW-DISPOSITION.md`,
    `${PHASE_01}/01-REVIEW-FIX.md`,
  ])(
    'lists review, disposition and fix from %s, tabs in the order Review, Disposition, Fix',
    (path) => {
      const context = contextOf(lendshed, path)!;
      expect(context.members.map((member) => member.tab)).toEqual(['review', 'disposition', 'fix']);
      expect(context.members.map((member) => member.fileName)).toEqual([
        '01-REVIEW.md',
        '01-REVIEW-DISPOSITION.md',
        '01-REVIEW-FIX.md',
      ]);
      expect(context.tabs.map((tab) => [tab.label, tab.url])).toEqual([
        ['Review', '/v1.1/phase-1/review'],
        ['Disposition', '/v1.1/phase-1/review-disposition'],
        ['Fix', '/v1.1/phase-1/review-fix'],
      ]);
      // The review's five findings, the disposition's six rows, the fix file's two fixed and three skipped ids.
      expect(context.tabs.map((tab) => tab.count)).toEqual([5, 6, 5]);
    },
  );

  it('marks the disposition as the active tab when its file is opened', () => {
    const context = contextOf(lendshed, `${PHASE_01}/01-REVIEW-DISPOSITION.md`)!;
    expect(context.active).toBe('disposition');
    expect(context.disposition?.rows.map((row) => row.id)).toEqual([
      'CR-01',
      'WR-01',
      'IN-01',
      'IN-02',
      'IN-03',
      'WR-02',
    ]);
    expect(context.disposition?.stated).toEqual({ open: 6, total: 6 });
  });

  it('lists review, disposition and fix for phase 2 as well', () => {
    const context = contextOf(lendshed, `${PHASE_02}/02-REVIEW-DISPOSITION.md`)!;
    expect(context.tabs.map((tab) => tab.label)).toEqual(['Review', 'Disposition', 'Fix']);
  });

  it('keeps a disposition-only folder a one-member context', async () => {
    const dir = '.planning/phases/09-alone';
    const project = await loadFiles({
      [`${dir}/09-REVIEW-DISPOSITION.md`]: fxRead(
        'phases/02-roles-and-permissions/02-REVIEW-DISPOSITION.md',
      ),
    });
    const context = contextOf(project, `${dir}/09-REVIEW-DISPOSITION.md`)!;
    expect(context.members).toHaveLength(1);
    expect(context.tabs.map((tab) => tab.label)).toEqual(['Disposition']);
    expect(context.review).toBeNull();
  });
});

describe('buildLedgerContext - the head takes open and total from the disposition (D-08)', () => {
  it('Lendshed 01: six rows against the review five, all six open, and the severities from the rows', () => {
    const { head } = contextOf(lendshed, `${PHASE_01}/01-REVIEW.md`)!;
    expect(head.total).toBe(6);
    expect(head.open).toBe(6);
    expect(head.bySeverity.map((row) => [row.severity, row.open, row.total])).toEqual([
      ['critical', 1, 1],
      ['warning', 2, 2],
      ['info', 3, 3],
    ]);
  });

  it('Lendshed 01: CR-01 and WR-01 are open in the disposition but fixed by the fix file, so two marks with their commits', () => {
    const context = contextOf(lendshed, `${PHASE_01}/01-REVIEW.md`)!;
    expect(context.marks).toEqual({
      'CR-01': { commit: 'c41e9d7' },
      'WR-01': { commit: '5ab20f3' },
    });
    expect(context.head.markedFixed).toBe(2);
    // The marks never change what the head counts: six open, the fix report's two fixed apart.
    expect(context.head.open).toBe(6);
    expect(context.head.fixedInReport).toBe(2);
  });

  it('Lendshed 02: open counts only the rows whose disposition is open', () => {
    const { head, marks } = contextOf(lendshed, `${PHASE_02}/02-REVIEW.md`)!;
    expect(head.total).toBe(6);
    expect(head.open).toBe(1);
    expect(head.bySeverity.map((row) => [row.severity, row.open, row.total])).toEqual([
      ['critical', 1, 2],
      ['warning', 0, 3],
      ['info', 0, 1],
    ]);
    // CR-02 is Open in the disposition and fixed in the fix report; CR-03 is fixed but is not a disposition row.
    expect(Object.keys(marks)).toEqual(['CR-02']);
  });

  it('Lendshed 03 (no disposition): the open count stays null and nothing is marked', () => {
    const { head, marks, disposition } = contextOf(lendshed, `${PHASE_03}/03-REVIEW.md`)!;
    expect(disposition).toBeNull();
    expect(head.open).toBeNull();
    expect(head.total).toBe(7);
    expect(head.markedFixed).toBe(0);
    expect(marks).toEqual({});
  });

  it("this repo's own phase 8: the head open and total equal the disposition rows, never the review five", async () => {
    const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
    const LB_PLANNING = join(LB_ROOT, '.planning');
    const project = await loadProject(LB_ROOT);
    const path = '.planning/phases/08-several-projects-and-a-switcher/08-REVIEW-DISPOSITION.md';
    expect(
      existsSync(
        join(LB_PLANNING, 'phases/08-several-projects-and-a-switcher/08-REVIEW-DISPOSITION.md'),
      ),
    ).toBe(true);
    const context = contextOf(project, path)!;
    const rows = context.disposition!.rows;
    expect(rows.length).toBeGreaterThan(5);
    expect(context.head.total).toBe(rows.length);
    expect(context.head.open).toBe(rows.filter((row) => row.disposition === 'open').length);
    const review = context.review;
    if (review !== null) expect(context.head.total).not.toBe(review.findings.length);
  });
});

describe('buildLedgerContext - one file, other kinds, other homes', () => {
  it('gives a lone live REVIEW a one-member context (the page draws no strip)', () => {
    const path = '.planning/phases/04-bulk-loan-export/04-REVIEW.md';
    const context = contextOf(lendshed, path)!;
    expect(context.members.map((member) => member.path)).toEqual([path]);
    expect(context.tabs.map((tab) => tab.label)).toEqual(['Review']);
  });

  it('joins an archived phase REVIEW with its REVIEW-DISPOSITION and REVIEW-FIX from any of the three files', () => {
    const dir = '.planning/milestones/v1.0-phases/04-shed-to-shed-transfers';
    for (const path of [
      `${dir}/04-REVIEW.md`,
      `${dir}/04-REVIEW-DISPOSITION.md`,
      `${dir}/04-REVIEW-FIX.md`,
    ]) {
      const context = contextOf(lendshed, path)!;
      expect(context.members.map((member) => member.path)).toEqual([
        `${dir}/04-REVIEW.md`,
        `${dir}/04-REVIEW-DISPOSITION.md`,
        `${dir}/04-REVIEW-FIX.md`,
      ]);
    }
  });

  it('is null for a file outside the review family and for a file that does not exist', () => {
    expect(contextOf(lendshed, `${PHASE_03}/03-CONTEXT.md`)).toBeNull();
    expect(contextOf(lendshed, '.planning/phases/99-missing/99-REVIEW.md')).toBeNull();
  });

  it('behaves the same in a quick-task folder', async () => {
    const dir = '.planning/quick/261024-vty-tidy-the-menu';
    const project = await loadFiles({
      [`${dir}/261024-vty-REVIEW.md`]: fxRead('phases/01-member-sign-in-sessions/01-REVIEW.md'),
      [`${dir}/261024-vty-REVIEW-FIX.md`]: fxRead(
        'phases/01-member-sign-in-sessions/01-REVIEW-FIX.md',
      ),
      [`${dir}/261024-vty-REVIEW-FIX-web.md`]: fxRead(
        'phases/03-account-admin-and-sessions/03-REVIEW-FIX-frontend.md',
      ),
    });
    for (const name of [
      '261024-vty-REVIEW.md',
      '261024-vty-REVIEW-FIX.md',
      '261024-vty-REVIEW-FIX-web.md',
    ]) {
      const context = contextOf(project, `${dir}/${name}`)!;
      expect(context.members.map((member) => member.fileName)).toEqual([
        '261024-vty-REVIEW.md',
        '261024-vty-REVIEW-FIX.md',
        '261024-vty-REVIEW-FIX-web.md',
      ]);
      expect(context.members.map((member) => member.suffix)).toEqual([null, null, 'web']);
    }
  });

  it('builds a fix-only folder from its fix members alone: two files give the Fix tab and a head over the fix entries', async () => {
    const dir = '.planning/phases/05-orphans';
    const project = await loadFiles({
      [`${dir}/05-REVIEW-FIX-backend.md`]: fxRead(
        'phases/03-account-admin-and-sessions/03-REVIEW-FIX-backend.md',
      ),
      [`${dir}/05-REVIEW-FIX-frontend.md`]: fxRead(
        'phases/03-account-admin-and-sessions/03-REVIEW-FIX-frontend.md',
      ),
    });
    const context = contextOf(project, `${dir}/05-REVIEW-FIX-frontend.md`)!;
    expect(context.members.map((member) => member.tab)).toEqual(['fix', 'fix']);
    expect(context.tabs.map((tab) => tab.label)).toEqual(['Fix']);
    expect(context.review).toBeNull();
    // WR-01, WR-03, WR-02, IN-03 (skipped), IN-09: five distinct ids.
    expect(context.head.total).toBe(5);
    expect(context.head.fixedInReport).toBe(4);
    expect(context.head.bySeverity.map((row) => [row.severity, row.total, row.fixed])).toEqual([
      ['warning', 3, 3],
      ['info', 2, 1],
    ]);
  });

  it('gives a folder with one fix file and no REVIEW a one-member context', async () => {
    const dir = '.planning/phases/06-lone';
    const project = await loadFiles({
      [`${dir}/06-REVIEW-FIX.md`]: fxRead('phases/01-member-sign-in-sessions/01-REVIEW-FIX.md'),
    });
    const context = contextOf(project, `${dir}/06-REVIEW-FIX.md`)!;
    expect(context.members).toHaveLength(1);
    expect(context.review).toBeNull();
  });

  it('keeps at most 12 fix files in a ledger, whichever fix file opens it', async () => {
    const dir = '.planning/phases/07-many';
    const files: Record<string, string> = {};
    for (let n = 0; n < MAX_FIX_MEMBERS + 3; n += 1) {
      files[`${dir}/07-REVIEW-FIX-s${String(n).padStart(2, '0')}.md`] = fxRead(
        'phases/01-member-sign-in-sessions/01-REVIEW-FIX.md',
      );
    }
    const project = await loadFiles(files);
    const first = ledgerFixMembers(
      project.presentation,
      project.registry,
      `${dir}/07-REVIEW-FIX-s00.md`,
    );
    expect(first).toHaveLength(MAX_FIX_MEMBERS);
    expect(contextOf(project, `${dir}/07-REVIEW-FIX-s14.md`)!.members).toHaveLength(
      MAX_FIX_MEMBERS,
    );
  });

  it('puts the plain fix file before the suffixed ones', async () => {
    const dir = '.planning/phases/08-order';
    const fix = fxRead('phases/01-member-sign-in-sessions/01-REVIEW-FIX.md');
    const project = await loadFiles({
      [`${dir}/08-REVIEW-FIX-zeta.md`]: fix,
      [`${dir}/08-REVIEW-FIX-alpha.md`]: fix,
      [`${dir}/08-REVIEW-FIX.md`]: fix,
    });
    const members = ledgerFixMembers(
      project.presentation,
      project.registry,
      `${dir}/08-REVIEW-FIX.md`,
    );
    expect(members.map((member) => member.suffix)).toEqual([null, 'alpha', 'zeta']);
  });
});

describe.each(ALL_FIXTURE_ROOTS)('the assumption-delta invariant - %s', (root) => {
  it('lists the same members from every member of a review-family ledger', async () => {
    const project = await loadProject(root);
    for (const artifact of project.presentation.artifacts) {
      if (
        artifact.kind !== 'review' &&
        artifact.kind !== 'review-fix' &&
        artifact.kind !== 'review-disposition'
      )
        continue;
      const context = buildLedgerContext(project.presentation, project.registry, artifact.path);
      expect(context, artifact.path).not.toBeNull();
      if (context === null) continue;
      const paths = context.members.map((member) => member.path);
      // A second REVIEW in one folder is not a member of the first's ledger; its own page is a lone review.
      if (!paths.includes(artifact.path)) continue;
      for (const member of context.members) {
        const sibling = buildLedgerContext(project.presentation, project.registry, member.path);
        expect(
          sibling?.members.map((entry) => entry.path),
          `${artifact.path} -> ${member.path}`,
        ).toEqual(paths);
      }
    }
  });
});
