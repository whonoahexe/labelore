// Phase 9 (09-12): the review ledger's composers and static markup. composeLedgerHead and the strip over
// Lendshed phase 3 (a review and two shard fix reports) and a lone phase 4 review; composeReviewLedger and
// the Fix tab's markup over the same project and planted folders for the shapes it does not hold (many
// files modified, a fix file with no entries, a suffix longer than 24 characters); 09-13 adds the Disposition
// tab, the disposition-first head and the stale-disposition marks. The ledger's view contract is in
// review-ledger-view-contract.test.ts.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildLedgerContext } from '../../src/presentation/review-ledger.ts';
import type { LedgerContext } from '../../src/presentation/review-ledger.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composeLedgerHead, composeReviewLedger } from '../../src/web/views/review-ledger.ts';
import type {
  ComposedDispositionLedger,
  ComposedFixLedger,
  ComposedFixSection,
} from '../../src/web/views/review-ledger.ts';
import {
  DispositionTabView,
  FixTabView,
  LedgerTabView,
  ledgerHeaderProps,
  ledgerSwitcher,
} from '../../src/web/views/review-ledger-components.tsx';
import { fxRead, loadFiles, loadFixtureProject } from '../helpers/fixture-project.ts';
import type { LoadedProject } from '../helpers/fixture-project.ts';

const PHASE_03 = '.planning/phases/03-account-admin-and-sessions';

let lendshed: LoadedProject;
beforeAll(async () => {
  lendshed = await loadFixtureProject();
});

const contextOf = (path: string): LedgerContext =>
  buildLedgerContext(lendshed.presentation, lendshed.registry, path)!;

const markup = (node: React.ReactNode): string =>
  renderToStaticMarkup(createElement(MemoryRouter, null, node));

describe('composeLedgerHead', () => {
  it('totals the findings with one row per severity present and a bar of squares', () => {
    const head = composeLedgerHead(contextOf(`${PHASE_03}/03-REVIEW.md`))!;
    expect(head.open).toBeNull();
    expect(head.total).toBe(7);
    expect(head.note).toBe('4 fixed in the fix report');
    expect(head.severities.map((row) => [row.severity, row.label, row.fixed, row.total])).toEqual([
      ['warning', 'Warning', 3, 3],
      ['info', 'Info', 0, 4],
    ]);
    // Filled complete for the fixed ones, else the severity's own tone.
    expect(head.severities[0].squares).toEqual(['complete', 'complete', 'complete']);
    expect(head.severities[1].squares).toEqual(['quiet', 'quiet', 'quiet', 'quiet']);
  });

  it('draws a finding the fix report left alone in its severity tone', () => {
    const context = contextOf(`${PHASE_03}/03-REVIEW.md`);
    const partial: LedgerContext = {
      ...context,
      head: {
        ...context.head,
        bySeverity: [
          {
            severity: 'critical',
            open: null,
            total: 3,
            fixed: 1,
            ids: ['CR-01', 'CR-02', 'CR-03'],
          },
        ],
      },
    };
    expect(composeLedgerHead(partial)!.severities[0].squares).toEqual([
      'complete',
      'missing',
      'missing',
    ]);
  });

  it('is null for a lone file and for no context (D-11)', () => {
    expect(
      composeLedgerHead(contextOf('.planning/phases/04-bulk-loan-export/04-REVIEW.md')),
    ).toBeNull();
    expect(composeLedgerHead(null)).toBeNull();
  });
});

describe('ledgerSwitcher', () => {
  it('returns null for a one-member context and for no context: a lone REVIEW draws no strip and no head', () => {
    expect(
      ledgerSwitcher(contextOf('.planning/phases/04-bulk-loan-export/04-REVIEW.md')),
    ).toBeNull();
    expect(ledgerSwitcher(null)).toBeNull();
  });

  it('draws the Review files strip with the pressed tab current, a count on each tab and the shared head', () => {
    const html = markup(ledgerSwitcher(contextOf(`${PHASE_03}/03-REVIEW-FIX-backend.md`)));
    expect(html).toContain('aria-label="Review files"');
    expect(html).toContain('class="plan-pair-switch"');
    expect(html).toContain('data-ledger="true"');
    expect(html).toContain('href="/v1.1/phase-3/review"');
    expect(html).toContain('href="/v1.1/phase-3/review-fix-backend"');
    // Only the Fix tab is pressed.
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(
      /aria-current="page"[^>]*>Fix<span class="view-review-ledger-count">5<\/span>/,
    );
    expect(html).toContain('>Review<span class="view-review-ledger-count">7</span>');
    // The head: total over the word, a row per severity and the muted line.
    expect(html).toContain('view-review-ledger-head');
    expect(html).toContain('>7</span><span class="view-review-ledger-word">findings</span>');
    expect(html).toContain('3 of 3 fixed');
    expect(html).toContain('0 of 4 fixed');
    expect(html).toContain('4 fixed in the fix report');
    expect(html).not.toContain('Disposition');
  });

  it('leads with the breadcrumb row, above the strip and the head, when crumbs are given', () => {
    const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Phase 03: Code Review Fix' }];
    const html = markup(ledgerSwitcher(contextOf(`${PHASE_03}/03-REVIEW-FIX-backend.md`), crumbs));
    const nav = html.indexOf('aria-label="Breadcrumb"');
    expect(nav).toBeGreaterThanOrEqual(0);
    expect(nav).toBeLessThan(html.indexOf('aria-label="Review files"'));
    expect(html.indexOf('aria-label="Review files"')).toBeLessThan(html.indexOf('view-review-ledger-head'));
    expect(markup(ledgerSwitcher(contextOf(`${PHASE_03}/03-REVIEW-FIX-backend.md`)))).not.toContain('Breadcrumb');
  });

  it('draws no tab for a file that does not exist: a ledger with only fix files has no Review tab', () => {
    const context = contextOf(`${PHASE_03}/03-REVIEW.md`);
    const fixOnly: LedgerContext = {
      ...context,
      members: context.members.filter((member) => member.tab === 'fix'),
      tabs: context.tabs.filter((tab) => tab.tab === 'fix'),
      active: 'fix',
    };
    const html = markup(ledgerSwitcher(fixOnly));
    expect(html).not.toContain('>Review<');
    expect(html).toContain('>Fix<');
  });
});

// ---------------------------------------------------------------------------
// The Fix tab
// ---------------------------------------------------------------------------

const fixInput = (project: LoadedProject, path: string): ViewInput => ({
  kind: 'review-fix',
  frontmatter: {},
  structured: {},
  groups: [],
  planSegments: [],
  ledgerContext: buildLedgerContext(project.presentation, project.registry, path),
});

/** The Fix tab model; throws when the composer returned the other tab or nothing. */
const fixLedger = (input: ViewInput): ComposedFixLedger | null => {
  const model = composeReviewLedger(input);
  if (model === null) return null;
  if (model.tab !== 'fix') throw new Error('expected the Fix tab');
  return model;
};

const sectionOf = (model: ComposedFixLedger, id: string): ComposedFixSection => {
  const section = model.sections.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`no section ${id}`);
  return section;
};

const PLANTED_FIX = [
  '---',
  'fixed_at: 2026-05-01T10:00:00Z',
  'fixed: 1',
  'skipped: 0',
  'status: all_fixed',
  '---',
  '',
  '# Phase 3: Code Review Fix Report',
  '',
  '## Fixed Issues',
  '',
  '### WR-01: A lagging feed receiver can drop a close',
  '',
  '**Files modified:** `a.ts`, `b.ts`, `c.ts`, `d.ts`, `e.ts`',
  '**Commit:** `abc1234def`',
  '**Applied fix:** done',
  '',
].join('\n');

const EMPTY_FIX = [
  '---',
  'fixed_at: 2026-05-02T10:00:00Z',
  'fixed: 0',
  'skipped: 0',
  'status: none',
  '---',
  '',
  '# Fix',
  '',
  'Nothing to do.',
  '',
].join('\n');

describe('composeReviewLedger - Lendshed phase 3', () => {
  let model: ComposedFixLedger;
  beforeAll(() => {
    model = fixLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-frontend.md`))!;
  });

  it('has one section per fix file: fix-backend titled Backend and fix-frontend titled Frontend, with the file name', () => {
    expect(
      model.sections.map((section) => [section.id, section.heading, section.fileName]),
    ).toEqual([
      ['fix-backend', 'Backend', '03-REVIEW-FIX-backend.md'],
      ['fix-frontend', 'Frontend', '03-REVIEW-FIX-frontend.md'],
    ]);
    expect(model.title).toContain('Code Review');
  });

  it('leads each section with its own counts and fixed-at date and groups Fixed, Skipped, Deferred', () => {
    const backend = sectionOf(model, 'fix-backend');
    const frontend = sectionOf(model, 'fix-frontend');
    expect([backend.counts, backend.fixedAt]).toEqual(['2 fixed, 0 skipped', '9 Apr 2026 · 09:12']);
    expect([frontend.counts, frontend.fixedAt]).toEqual([
      '2 fixed, 1 skipped',
      '9 Apr 2026 · 10:03',
    ]);
    expect(backend.groups.map((group) => group.key)).toEqual(['fixed']);
    expect(frontend.groups.map((group) => group.key)).toEqual([
      'fixed',
      'skipped',
      'not-in-review',
    ]);
    expect(frontend.groups.map((group) => group.tone)).toEqual(['complete', 'quiet', 'quiet']);
  });

  it('shows both commits of WR-03 from the plural field, and the skipped reason', () => {
    const wr03 = sectionOf(model, 'fix-backend').groups[0].rows.find(
      (row) => row.ids[0].id === 'WR-03',
    )!;
    expect(wr03.commits.map((commit) => commit.short)).toEqual(['a1b2c3d', 'e4f5a6b']);
    expect(wr03.ids[0].severity).toBe('warning');
    const skipped = sectionOf(model, 'fix-frontend').groups.find(
      (group) => group.key === 'skipped',
    )!.rows[0];
    expect(skipped.ids[0].id).toBe('IN-03');
    expect(skipped.reason).toContain('passcode rules module is being reworked');
  });

  it('lists IN-09, fixed in the frontend file but absent from the review, under "Not in the review"', () => {
    const stray = sectionOf(model, 'fix-frontend').groups.find(
      (group) => group.key === 'not-in-review',
    )!;
    expect(stray.label).toBe('Not in the review');
    expect(stray.rows.map((row) => row.ids[0].id)).toEqual(['IN-09']);
    const fixed = sectionOf(model, 'fix-frontend').groups.find((group) => group.key === 'fixed')!;
    expect(fixed.rows.map((row) => row.ids[0].id)).toEqual(['WR-02']);
  });

  it("scrolls to the opened shard's section when the opened file is a suffixed one", () => {
    expect(model.scrollTo).toBe('fix-frontend');
    expect(fixLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-backend.md`))!.scrollTo).toBe(
      'fix-backend',
    );
  });
});

describe('composeReviewLedger - the other shapes', () => {
  it('gives a phase with one plain fix file one section with no heading (Lendshed phase 1)', () => {
    const one = fixLedger(
      fixInput(lendshed, '.planning/phases/01-member-sign-in-sessions/01-REVIEW-FIX.md'),
    )!;
    expect(one.sections).toHaveLength(1);
    expect(one.sections[0].id).toBe('fix');
    expect(one.sections[0].heading).toBeNull();
    expect(one.scrollTo).toBeNull();
    expect(one.sections[0].groups[0].key).toBe('fixed');
  });

  it('caps files modified at three and counts the rest', async () => {
    const project = await loadFiles({
      [`${PHASE_03}/03-REVIEW.md`]: fxRead('phases/03-account-admin-and-sessions/03-REVIEW.md'),
      [`${PHASE_03}/03-REVIEW-FIX.md`]: PLANTED_FIX,
    });
    const model = fixLedger(fixInput(project, `${PHASE_03}/03-REVIEW-FIX.md`))!;
    const row = model.sections[0].groups[0].rows[0];
    expect(row.files).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(row.moreFiles).toBe(2);
    expect(row.commits.map((commit) => [commit.short, commit.full])).toEqual([
      ['abc1234', 'abc1234def'],
    ]);
    expect(row.title).toContain('lagging feed receiver');
  });

  it('keeps a section and lead for a fix file with no entries, and says so once', async () => {
    const project = await loadFiles({
      [`${PHASE_03}/03-REVIEW.md`]: fxRead('phases/03-account-admin-and-sessions/03-REVIEW.md'),
      [`${PHASE_03}/03-REVIEW-FIX-backend.md`]: PLANTED_FIX,
      [`${PHASE_03}/03-REVIEW-FIX-empty.md`]: EMPTY_FIX,
    });
    const model = fixLedger(fixInput(project, `${PHASE_03}/03-REVIEW-FIX-empty.md`))!;
    const empty = sectionOf(model, 'fix-empty');
    expect(empty.empty).toBe(true);
    expect(empty.groups).toEqual([]);
    expect(empty.counts).toBe('0 fixed, 0 skipped');
    expect(sectionOf(model, 'fix-backend').empty).toBe(false);
    const html = renderToStaticMarkup(createElement(FixTabView, { model }));
    expect(html.match(/No fixes listed for this file\./g)).toHaveLength(1);
    expect(html).toContain('id="fix-empty"');
  });

  it('clamps a suffix longer than 24 characters with an ellipsis and keeps the full value in title', async () => {
    const project = await loadFiles({
      [`${PHASE_03}/03-REVIEW.md`]: fxRead('phases/03-account-admin-and-sessions/03-REVIEW.md'),
      [`${PHASE_03}/03-REVIEW-FIX-an-extremely-long-shard-name.md`]: PLANTED_FIX,
      [`${PHASE_03}/03-REVIEW-FIX-web.md`]: PLANTED_FIX,
    });
    const model = fixLedger(fixInput(project, `${PHASE_03}/03-REVIEW-FIX-web.md`))!;
    const long = sectionOf(model, 'fix-an-extremely-long-shard-name');
    expect(long.headingFull).toBe('An Extremely Long Shard Name');
    expect(long.heading!.length).toBe(24);
    expect(long.heading!.endsWith('…')).toBe(true);
    const html = renderToStaticMarkup(createElement(FixTabView, { model }));
    expect(html).toContain('title="An Extremely Long Shard Name"');
    expect(html).toContain('id="fix-web"');
  });

  it('is null without a ledger context', () => {
    expect(
      composeReviewLedger({
        kind: 'review-fix',
        frontmatter: {},
        structured: {},
        groups: [],
        planSegments: [],
      }),
    ).toBeNull();
  });

  it('draws the Fix tab as text: severity pips with ids, chips for files, mono commits, no link and no raw HTML', () => {
    const model = fixLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-backend.md`))!;
    const html = renderToStaticMarkup(createElement(FixTabView, { model }));
    expect(html).toContain('id="fix-backend"');
    expect(html).toContain('id="fix-frontend"');
    expect(html).toContain('<h2 class="view-review-ledger-heading" title="Backend">Backend</h2>');
    expect(html).toContain('<span class="view-review-sev" data-severity="warning">WR-01</span>');
    expect(html).toContain(
      '<code class="view-review-ledger-chip" title="server/src/socket/index.ts">',
    );
    expect(html).toContain('title="a1b2c3d');
    expect(html).toContain('Not in the review');
    expect(html).not.toContain('<a ');
  });

  it('headers the page "Review fix" with the review title', () => {
    const model = fixLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-backend.md`))!;
    expect(ledgerHeaderProps(model, 'fallback')).toEqual({
      eyebrow: 'Review fix',
      title: model.title,
      lead: null,
    });
    expect(ledgerHeaderProps({ ...model, title: null }, 'fallback').title).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// The Disposition tab (09-13)
// ---------------------------------------------------------------------------

const dispositionInput = (project: LoadedProject, path: string): ViewInput => ({
  kind: 'review-disposition',
  frontmatter: {},
  structured: {},
  groups: [],
  planSegments: [],
  ledgerContext: buildLedgerContext(project.presentation, project.registry, path),
});

/** The Disposition tab model; throws when the composer returned the other tab or nothing. */
const dispositionLedger = (project: LoadedProject, path: string): ComposedDispositionLedger => {
  const model = composeReviewLedger(dispositionInput(project, path));
  if (model === null || model.tab !== 'disposition')
    throw new Error(`no disposition tab for ${path}`);
  return model;
};

const PHASE_01 = '.planning/phases/01-member-sign-in-sessions';
const PHASE_02 = '.planning/phases/02-roles-and-permissions';
const ARCHIVED_04 = '.planning/milestones/v1.0-phases/04-shed-to-shed-transfers';

describe('composeReviewLedger - the Disposition tab', () => {
  it('Lendshed phase 1: one Open group of six rows, and no other group', () => {
    const model = dispositionLedger(lendshed, `${PHASE_01}/01-REVIEW-DISPOSITION.md`);
    expect(
      model.groups.map((group) => [group.key, group.label, group.tone, group.rows.length]),
    ).toEqual([['open', 'Open', 'in-flight', 6]]);
    const first = model.groups[0].rows[0];
    expect([first.id, first.severity]).toEqual(['CR-01', 'critical']);
    expect(first.title).toContain('Cookie signing falls back');
    expect([first.reason, first.commit, first.sourceText, first.missingCommit]).toEqual([
      null,
      null,
      null,
      false,
    ]);
  });

  it('Lendshed phase 2: Open, Deferred, Skipped, Fixed and Other in that order, Other verbatim', () => {
    const model = dispositionLedger(lendshed, `${PHASE_02}/02-REVIEW-DISPOSITION.md`);
    expect(
      model.groups.map((group) => [group.key, group.tone, group.dashed, group.rows.length]),
    ).toEqual([
      ['open', 'in-flight', false, 1],
      ['deferred', 'quiet', false, 1],
      ['skipped', 'quiet', true, 1],
      ['fixed', 'complete', false, 1],
      ['other', 'quiet', true, 2],
    ]);
    const other = model.groups[4].rows;
    expect(other.map((row) => [row.id, row.raw])).toEqual([
      ['WR-03', 'Accepted'],
      ['IN-01', 'Wont-fix'],
    ]);
  });

  it('shows a deferral and a skip with the reason from the Note column', () => {
    const model = dispositionLedger(lendshed, `${PHASE_02}/02-REVIEW-DISPOSITION.md`);
    const deferred = model.groups.find((group) => group.key === 'deferred')!.rows[0];
    expect(deferred.reason).toBe('Waits for the capability list to move into code (phase 3)');
    const skipped = model.groups.find((group) => group.key === 'skipped')!.rows[0];
    expect(skipped.reason).toContain('Revoked rows are the audit trail');
    expect(skipped.long).toBe(false);
  });

  it('takes the commit of a fixed row from the fix file where it names the id', () => {
    const fixed = dispositionLedger(lendshed, `${PHASE_02}/02-REVIEW-DISPOSITION.md`).groups.find(
      (group) => group.key === 'fixed',
    )!.rows[0];
    expect(fixed.id).toBe('CR-01');
    expect(fixed.commit).toEqual({ short: 'e57f1b9', full: 'e57f1b9' });
    expect(fixed.sourceText).toBeNull();
    expect(fixed.missingCommit).toBe(false);
  });

  it("archived phase 4: fixed rows take the fix file's commit, and CR-01, which that file does not name, shows the '(see ...)' text", () => {
    const model = dispositionLedger(lendshed, `${ARCHIVED_04}/04-REVIEW-DISPOSITION.md`);
    expect(model.groups.map((group) => [group.key, group.rows.length])).toEqual([
      ['open', 1],
      ['deferred', 1],
      ['fixed', 5],
    ]);
    const fixed = model.groups.find((group) => group.key === 'fixed')!.rows;
    expect(fixed.map((row) => [row.id, row.commit?.short ?? null, row.sourceText])).toEqual([
      ['CR-01', null, '(see 04-REVIEW-FIX.md)'],
      ['WR-01', '4be07a2', null],
      ['WR-02', 'a19c3d5', null],
      ['WR-03', '0f6e8b1', null],
      ['WR-06', 'e8a41f3', null],
    ]);
    // The two-column shape keeps a deferral's reason in the cell after the word.
    const deferred = model.groups.find((group) => group.key === 'deferred')!.rows[0];
    expect(deferred.reason).toBe('harmless until the next refactor of the timeline');
  });

  it("a fixed row with no commit and no text of its own says 'Commit not recorded'", async () => {
    const dir = '.planning/phases/05-planted';
    const project = await loadFiles({
      [`${dir}/05-REVIEW-DISPOSITION.md`]: [
        '| Finding | Disposition |',
        '|---------|-------------|',
        '| CR-01: Something broke | fixed |',
        '',
      ].join('\n'),
    });
    const model = dispositionLedger(project, `${dir}/05-REVIEW-DISPOSITION.md`);
    const row = model.groups[0].rows[0];
    expect([row.commit, row.sourceText, row.missingCommit]).toEqual([null, null, true]);
    const html = renderToStaticMarkup(createElement(DispositionTabView, { model }));
    expect(html).toContain('Commit not recorded');
  });

  it('clamps a long reason to the 3-line form with Read more, and not a short one', async () => {
    const dir = '.planning/phases/05-planted';
    const long = 'Because the capability list must move into code first. '.repeat(6).trim();
    const project = await loadFiles({
      [`${dir}/05-REVIEW-DISPOSITION.md`]: [
        '| ID | Severity | Finding | Disposition | Note |',
        '|----|----------|---------|-------------|------|',
        `| WR-01 | Warning | Long one | Deferred | ${long} |`,
        '| WR-02 | Warning | Short one | Skipped | Not worth it |',
        '',
      ].join('\n'),
    });
    const model = dispositionLedger(project, `${dir}/05-REVIEW-DISPOSITION.md`);
    const rows = model.groups.flatMap((group) => group.rows);
    expect(rows.map((row) => [row.id, row.long])).toEqual([
      ['WR-01', true],
      ['WR-02', false],
    ]);
    const html = renderToStaticMarkup(createElement(DispositionTabView, { model }));
    expect(html.match(/Read more/g)).toHaveLength(1);
    expect(html).toContain('data-clamped="true"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('draws the groups as text: a square and count per group head, a severity pip with the id, no link, no raw HTML', () => {
    const model = dispositionLedger(lendshed, `${PHASE_02}/02-REVIEW-DISPOSITION.md`);
    const html = renderToStaticMarkup(createElement(DispositionTabView, { model }));
    expect(html).toContain(
      '<h3 class="view-review-group-head"><i class="status-square view-review-group-square" data-tone="in-flight" data-dashed="false" aria-hidden="true"></i><span>Open</span>',
    );
    expect(html).toContain('data-dashed="true"');
    expect(html).toContain('<span class="view-review-sev" data-severity="critical">CR-02</span>');
    expect(html).toContain('Wont-fix');
    expect(html).toContain('title="e57f1b9"');
    expect(html).not.toContain('<a ');
    expect(renderToStaticMarkup(createElement(LedgerTabView, { model }))).toBe(html);
  });

  it('headers the page "Review disposition" with the review title', () => {
    const model = dispositionLedger(lendshed, `${PHASE_02}/02-REVIEW-DISPOSITION.md`);
    expect(ledgerHeaderProps(model, 'fallback')).toEqual({
      eyebrow: 'Review disposition',
      title: model.title,
      lead: null,
    });
    expect(ledgerHeaderProps({ ...model, title: null }, 'fallback').title).toBe('fallback');
  });

  it('is null for a disposition that holds no rows, so the promoted table shows', async () => {
    const dir = '.planning/phases/05-planted';
    const project = await loadFiles({
      [`${dir}/05-REVIEW-DISPOSITION.md`]: '# Nothing here\n\nNo table.\n',
    });
    expect(
      composeReviewLedger(dispositionInput(project, `${dir}/05-REVIEW-DISPOSITION.md`)),
    ).toBeNull();
  });

  it('the strip over a phase with a disposition reads Review, Disposition, Fix with the Disposition tab pressed', () => {
    const html = markup(ledgerSwitcher(contextOf(`${PHASE_01}/01-REVIEW-DISPOSITION.md`)));
    expect(html.indexOf('>Review<')).toBeLessThan(html.indexOf('>Disposition<'));
    expect(html.indexOf('>Disposition<')).toBeLessThan(html.indexOf('>Fix<'));
    expect(html).toContain('href="/v1.1/phase-1/review-disposition"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(
      /aria-current="page"[^>]*>Disposition<span class="view-review-ledger-count">6<\/span>/,
    );
  });

  it('the head over Lendshed 01 reads open of total in the lead number style', () => {
    const html = markup(ledgerSwitcher(contextOf(`${PHASE_01}/01-REVIEW.md`)));
    expect(html).toContain('>6</span><span class="view-review-ledger-word">of 6 findings</span>');
    expect(html).toContain('1 of 1 open');
    expect(html).toContain('2 of 2 open');
    expect(html).toContain('3 of 3 open');
  });
});

// ---------------------------------------------------------------------------
// Disposition-first totals and the stale-disposition mark (09-13, D-08)
// ---------------------------------------------------------------------------

describe('composeLedgerHead - the disposition decides what is open', () => {
  it('Lendshed 01: 6 of 6 open per severity from the rows, and the note names the two the fix report calls fixed', () => {
    const head = composeLedgerHead(contextOf(`${PHASE_01}/01-REVIEW.md`))!;
    expect([head.open, head.total]).toEqual([6, 6]);
    expect(head.severities.map((row) => [row.severity, row.open, row.total])).toEqual([
      ['critical', 1, 1],
      ['warning', 2, 2],
      ['info', 3, 3],
    ]);
    expect(head.note).toBe('2 open here are marked fixed in the fix report');
  });

  it('counts a finding the fix report calls fixed as open, never as fixed (T-09-26)', () => {
    const context = contextOf(`${PHASE_01}/01-REVIEW.md`);
    expect(context.head.open).toBe(6);
    expect(context.head.fixedInReport).toBe(2);
    expect(composeLedgerHead(context)!.open).toBe(6);
  });

  it('Lendshed 02: one open of six, and a note naming the one fixed in the report', () => {
    const head = composeLedgerHead(contextOf(`${PHASE_02}/02-REVIEW.md`))!;
    expect([head.open, head.total]).toEqual([1, 6]);
    expect(head.note).toBe('1 open here are marked fixed in the fix report');
  });

  it('Lendshed 03 (no disposition): no open count and the fixed note, as in 09-12', () => {
    const head = composeLedgerHead(contextOf(`${PHASE_03}/03-REVIEW.md`))!;
    expect(head.open).toBeNull();
    expect(head.note).toBe('4 fixed in the fix report');
  });

  it('says nothing when the disposition and the fix report agree', async () => {
    const dir = '.planning/phases/05-agree';
    const project = await loadFiles({
      [`${dir}/05-REVIEW.md`]: fxRead('phases/01-member-sign-in-sessions/01-REVIEW.md'),
      [`${dir}/05-REVIEW-FIX.md`]: fxRead('phases/01-member-sign-in-sessions/01-REVIEW-FIX.md'),
      [`${dir}/05-REVIEW-DISPOSITION.md`]: fxRead(
        'phases/01-member-sign-in-sessions/01-REVIEW-DISPOSITION.md',
      )
        .replace('disposition: open\n    title: "Cookie', 'disposition: fixed\n    title: "Cookie')
        .replace(
          'disposition: open\n    title: "Signing',
          'disposition: fixed\n    title: "Signing',
        )
        .split('| CR-01 | critical | open |')
        .join('| CR-01 | critical | fixed |')
        .split('| WR-01 | warning | open |')
        .join('| WR-01 | warning | fixed |'),
    });
    const context = buildLedgerContext(
      project.presentation,
      project.registry,
      `${dir}/05-REVIEW.md`,
    )!;
    expect(context.head.open).toBe(4);
    expect(context.head.markedFixed).toBe(0);
    expect(composeLedgerHead(context)!.note).toBeNull();
  });

  it('draws the open-of-total number and a muted line, and the note is absent when there is none', () => {
    const html = markup(ledgerSwitcher(contextOf(`${PHASE_01}/01-REVIEW.md`)));
    expect(html).toContain('2 open here are marked fixed in the fix report');
    const context = contextOf(`${PHASE_01}/01-REVIEW.md`);
    const head = composeLedgerHead(context)!;
    const none = markup(
      createElement(
        'div',
        null,
        ledgerSwitcher({ ...context, head: { ...context.head, markedFixed: 0 } }),
      ),
    );
    expect(head.note).not.toBeNull();
    expect(none).not.toContain('view-review-ledger-note');
  });
});

describe('the stale-disposition mark on the ledger tabs', () => {
  it('marks CR-01 and WR-01 in the Disposition tab Open group with the fix commit, and no other row', () => {
    const model = dispositionLedger(lendshed, `${PHASE_01}/01-REVIEW-DISPOSITION.md`);
    const rows = model.groups[0].rows;
    expect(
      rows.filter((row) => row.mark !== null).map((row) => [row.id, row.mark?.commit?.short]),
    ).toEqual([
      ['CR-01', 'c41e9d7'],
      ['WR-01', '5ab20f3'],
    ]);
    const html = renderToStaticMarkup(createElement(DispositionTabView, { model }));
    expect(html).toContain('title="c41e9d7">Fixed in c41e9d7, disposition not updated</span>');
    expect(html).toContain('title="5ab20f3">Fixed in 5ab20f3, disposition not updated</span>');
    expect(html.match(/disposition not updated/g)).toHaveLength(2);
    expect(html).toContain('data-tone="quiet"');
  });

  it('marks the same findings on the Fix tab rows', () => {
    const model = fixLedger(fixInput(lendshed, `${PHASE_01}/01-REVIEW-FIX.md`))!;
    const fixed = model.sections[0].groups.find((group) => group.key === 'fixed')!;
    expect(fixed.rows.map((row) => [row.ids[0].id, row.mark?.commit?.short])).toEqual([
      ['CR-01', 'c41e9d7'],
      ['WR-01', '5ab20f3'],
    ]);
    const skipped = model.sections[0].groups.find((group) => group.key === 'skipped')!;
    expect(skipped.rows.every((row) => row.mark === null)).toBe(true);
    const html = renderToStaticMarkup(createElement(FixTabView, { model }));
    expect(html.match(/disposition not updated/g)).toHaveLength(2);
  });

  it('shows no mark and no chip anywhere without a disposition, or on a lone REVIEW (D-11)', () => {
    const fix = fixLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-backend.md`))!;
    expect(renderToStaticMarkup(createElement(FixTabView, { model: fix }))).not.toContain(
      'disposition not updated',
    );
    expect(
      fix.sections
        .flatMap((section) => section.groups.flatMap((group) => group.rows))
        .every((row) => row.mark === null),
    ).toBe(true);
    const lone = markup(
      ledgerSwitcher(contextOf('.planning/phases/04-bulk-loan-export/04-REVIEW.md')),
    );
    expect(lone).not.toContain('disposition not updated');
  });

  it('marks the one finding Lendshed 02 leaves open that the fix report fixed, and none of the Fixed or Other rows', () => {
    const model = dispositionLedger(lendshed, `${PHASE_02}/02-REVIEW-DISPOSITION.md`);
    const marked = model.groups.flatMap((group) =>
      group.rows.filter((row) => row.mark !== null).map((row) => [group.key, row.id]),
    );
    expect(marked).toEqual([['open', 'CR-02']]);
  });
});
