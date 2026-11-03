// Phase 9 (09-12): buildLedgerContext and ledgerFixMembers. A folder's review-family files (the REVIEW and
// every REVIEW-FIX, plain or suffixed) are found by directory and kind in the cached presentation; the same
// member set comes back from any one of them (the assumption-delta invariant), a lone file is a one-member
// context the page draws as nothing, and the head totals the findings by severity without a disposition.
// Fixtures are the made-up Lendshed project, planted in-memory folders for the shapes it does not hold, and
// every committed fixture root for the invariant.
import { beforeAll, describe, expect, it } from 'vitest';
import { buildLedgerContext, ledgerFixMembers, MAX_FIX_MEMBERS } from '../../src/presentation/review-ledger.ts';
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
  it.each([REVIEW_03, FIX_BACKEND, FIX_FRONTEND])('lists the same three members from %s', (path) => {
    const context = contextOf(lendshed, path);
    expect(context).not.toBeNull();
    expect(context!.members.map((member) => member.path)).toEqual([REVIEW_03, FIX_BACKEND, FIX_FRONTEND]);
    expect(context!.members.map((member) => member.tab)).toEqual(['review', 'fix', 'fix']);
    expect(context!.members.map((member) => member.suffix)).toEqual([null, 'backend', 'frontend']);
    expect(context!.members.every((member) => member.url !== null)).toBe(true);
  });

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

describe('buildLedgerContext - one file, other kinds, other homes', () => {
  it('gives a lone live REVIEW a one-member context (the page draws no strip)', () => {
    const path = '.planning/phases/04-bulk-loan-export/04-REVIEW.md';
    const context = contextOf(lendshed, path)!;
    expect(context.members.map((member) => member.path)).toEqual([path]);
    expect(context.tabs.map((tab) => tab.label)).toEqual(['Review']);
  });

  it('pairs an archived phase REVIEW with its REVIEW-FIX from either file', () => {
    const dir = '.planning/milestones/v1.0-phases/04-shed-to-shed-transfers';
    for (const path of [`${dir}/04-REVIEW.md`, `${dir}/04-REVIEW-FIX.md`]) {
      const context = contextOf(lendshed, path)!;
      expect(context.members.map((member) => member.path)).toEqual([`${dir}/04-REVIEW.md`, `${dir}/04-REVIEW-FIX.md`]);
    }
  });

  it('is null for a file outside the review family, and for a disposition until 09-13', () => {
    expect(contextOf(lendshed, `${PHASE_03}/03-CONTEXT.md`)).toBeNull();
    expect(contextOf(lendshed, '.planning/phases/01-member-sign-in-sessions/01-REVIEW-DISPOSITION.md')).toBeNull();
    expect(contextOf(lendshed, '.planning/phases/99-missing/99-REVIEW.md')).toBeNull();
  });

  it('behaves the same in a quick-task folder', async () => {
    const dir = '.planning/quick/261024-vty-tidy-the-menu';
    const project = await loadFiles({
      [`${dir}/261024-vty-REVIEW.md`]: fxRead('phases/01-member-sign-in-sessions/01-REVIEW.md'),
      [`${dir}/261024-vty-REVIEW-FIX.md`]: fxRead('phases/01-member-sign-in-sessions/01-REVIEW-FIX.md'),
      [`${dir}/261024-vty-REVIEW-FIX-web.md`]: fxRead('phases/03-account-admin-and-sessions/03-REVIEW-FIX-frontend.md'),
    });
    for (const name of ['261024-vty-REVIEW.md', '261024-vty-REVIEW-FIX.md', '261024-vty-REVIEW-FIX-web.md']) {
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
      [`${dir}/05-REVIEW-FIX-backend.md`]: fxRead('phases/03-account-admin-and-sessions/03-REVIEW-FIX-backend.md'),
      [`${dir}/05-REVIEW-FIX-frontend.md`]: fxRead('phases/03-account-admin-and-sessions/03-REVIEW-FIX-frontend.md'),
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
    const first = ledgerFixMembers(project.presentation, project.registry, `${dir}/07-REVIEW-FIX-s00.md`);
    expect(first).toHaveLength(MAX_FIX_MEMBERS);
    expect(contextOf(project, `${dir}/07-REVIEW-FIX-s14.md`)!.members).toHaveLength(MAX_FIX_MEMBERS);
  });

  it('puts the plain fix file before the suffixed ones', async () => {
    const dir = '.planning/phases/08-order';
    const fix = fxRead('phases/01-member-sign-in-sessions/01-REVIEW-FIX.md');
    const project = await loadFiles({
      [`${dir}/08-REVIEW-FIX-zeta.md`]: fix,
      [`${dir}/08-REVIEW-FIX-alpha.md`]: fix,
      [`${dir}/08-REVIEW-FIX.md`]: fix,
    });
    const members = ledgerFixMembers(project.presentation, project.registry, `${dir}/08-REVIEW-FIX.md`);
    expect(members.map((member) => member.suffix)).toEqual([null, 'alpha', 'zeta']);
  });
});

describe.each(ALL_FIXTURE_ROOTS)('the assumption-delta invariant - %s', (root) => {
  it('lists the same members from every member of a review-family ledger', async () => {
    const project = await loadProject(root);
    for (const artifact of project.presentation.artifacts) {
      if (artifact.kind !== 'review' && artifact.kind !== 'review-fix') continue;
      const context = buildLedgerContext(project.presentation, project.registry, artifact.path);
      expect(context, artifact.path).not.toBeNull();
      if (context === null) continue;
      const paths = context.members.map((member) => member.path);
      // A second REVIEW in one folder is not a member of the first's ledger; its own page is a lone review.
      if (!paths.includes(artifact.path)) continue;
      for (const member of context.members) {
        const sibling = buildLedgerContext(project.presentation, project.registry, member.path);
        expect(sibling?.members.map((entry) => entry.path), `${artifact.path} -> ${member.path}`).toEqual(paths);
      }
    }
  });
});
