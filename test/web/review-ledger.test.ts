// Phase 9 (09-12): the review ledger's composers and static markup. composeLedgerHead and the strip over
// Lendshed phase 3 (a review and two shard fix reports) and a lone phase 4 review; composeReviewLedger and
// the Fix tab's markup over the same project and planted folders for the shapes it does not hold (many
// files modified, a fix file with no entries, a suffix longer than 24 characters). The ledger's view
// contract test lands in 09-13, once all three tab bodies exist.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildLedgerContext } from '../../src/presentation/review-ledger.ts';
import type { LedgerContext } from '../../src/presentation/review-ledger.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composeLedgerHead, composeReviewLedger } from '../../src/web/views/review-ledger.ts';
import type { ComposedFixSection, ComposedReviewLedger } from '../../src/web/views/review-ledger.ts';
import { FixTabView, fixHeaderProps, ledgerSwitcher } from '../../src/web/views/review-ledger-components.tsx';
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
        bySeverity: [{ severity: 'critical', open: null, total: 3, fixed: 1, ids: ['CR-01', 'CR-02', 'CR-03'] }],
      },
    };
    expect(composeLedgerHead(partial)!.severities[0].squares).toEqual(['complete', 'missing', 'missing']);
  });

  it('is null for a lone file and for no context (D-11)', () => {
    expect(composeLedgerHead(contextOf('.planning/phases/04-bulk-loan-export/04-REVIEW.md'))).toBeNull();
    expect(composeLedgerHead(null)).toBeNull();
  });
});

describe('ledgerSwitcher', () => {
  it('returns null for a one-member context and for no context: a lone REVIEW draws no strip and no head', () => {
    expect(ledgerSwitcher(contextOf('.planning/phases/04-bulk-loan-export/04-REVIEW.md'))).toBeNull();
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
    expect(html).toMatch(/aria-current="page"[^>]*>Fix<span class="view-review-ledger-count">5<\/span>/);
    expect(html).toContain('>Review<span class="view-review-ledger-count">7</span>');
    // The head: total over the word, a row per severity and the muted line.
    expect(html).toContain('view-review-ledger-head');
    expect(html).toContain('>7</span><span class="view-review-ledger-word">findings</span>');
    expect(html).toContain('3 of 3 fixed');
    expect(html).toContain('0 of 4 fixed');
    expect(html).toContain('4 fixed in the fix report');
    expect(html).not.toContain('Disposition');
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

const sectionOf = (model: ComposedReviewLedger, id: string): ComposedFixSection => {
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
  let model: ComposedReviewLedger;
  beforeAll(() => {
    model = composeReviewLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-frontend.md`))!;
  });

  it('has one section per fix file: fix-backend titled Backend and fix-frontend titled Frontend, with the file name', () => {
    expect(model.sections.map((section) => [section.id, section.heading, section.fileName])).toEqual([
      ['fix-backend', 'Backend', '03-REVIEW-FIX-backend.md'],
      ['fix-frontend', 'Frontend', '03-REVIEW-FIX-frontend.md'],
    ]);
    expect(model.title).toContain('Code Review');
  });

  it('leads each section with its own counts and fixed-at date and groups Fixed, Skipped, Deferred', () => {
    const backend = sectionOf(model, 'fix-backend');
    const frontend = sectionOf(model, 'fix-frontend');
    expect([backend.counts, backend.fixedAt]).toEqual(['2 fixed, 0 skipped', '9 Apr 2026 · 09:12']);
    expect([frontend.counts, frontend.fixedAt]).toEqual(['2 fixed, 1 skipped', '9 Apr 2026 · 10:03']);
    expect(backend.groups.map((group) => group.key)).toEqual(['fixed']);
    expect(frontend.groups.map((group) => group.key)).toEqual(['fixed', 'skipped', 'not-in-review']);
    expect(frontend.groups.map((group) => group.tone)).toEqual(['complete', 'quiet', 'quiet']);
  });

  it('shows both commits of WR-03 from the plural field, and the skipped reason', () => {
    const wr03 = sectionOf(model, 'fix-backend').groups[0].rows.find((row) => row.ids[0].id === 'WR-03')!;
    expect(wr03.commits.map((commit) => commit.short)).toEqual(['a1b2c3d', 'e4f5a6b']);
    expect(wr03.ids[0].severity).toBe('warning');
    const skipped = sectionOf(model, 'fix-frontend').groups.find((group) => group.key === 'skipped')!.rows[0];
    expect(skipped.ids[0].id).toBe('IN-03');
    expect(skipped.reason).toContain('passcode rules module is being reworked');
  });

  it('lists IN-09, fixed in the frontend file but absent from the review, under "Not in the review"', () => {
    const stray = sectionOf(model, 'fix-frontend').groups.find((group) => group.key === 'not-in-review')!;
    expect(stray.label).toBe('Not in the review');
    expect(stray.rows.map((row) => row.ids[0].id)).toEqual(['IN-09']);
    const fixed = sectionOf(model, 'fix-frontend').groups.find((group) => group.key === 'fixed')!;
    expect(fixed.rows.map((row) => row.ids[0].id)).toEqual(['WR-02']);
  });

  it("scrolls to the opened shard's section when the opened file is a suffixed one", () => {
    expect(model.scrollTo).toBe('fix-frontend');
    expect(composeReviewLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-backend.md`))!.scrollTo).toBe('fix-backend');
  });
});

describe('composeReviewLedger - the other shapes', () => {
  it('gives a phase with one plain fix file one section with no heading (Lendshed phase 1)', () => {
    const one = composeReviewLedger(fixInput(lendshed, '.planning/phases/01-member-sign-in-sessions/01-REVIEW-FIX.md'))!;
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
    const model = composeReviewLedger(fixInput(project, `${PHASE_03}/03-REVIEW-FIX.md`))!;
    const row = model.sections[0].groups[0].rows[0];
    expect(row.files).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(row.moreFiles).toBe(2);
    expect(row.commits.map((commit) => [commit.short, commit.full])).toEqual([['abc1234', 'abc1234def']]);
    expect(row.title).toContain('lagging feed receiver');
  });

  it('keeps a section and lead for a fix file with no entries, and says so once', async () => {
    const project = await loadFiles({
      [`${PHASE_03}/03-REVIEW.md`]: fxRead('phases/03-account-admin-and-sessions/03-REVIEW.md'),
      [`${PHASE_03}/03-REVIEW-FIX-backend.md`]: PLANTED_FIX,
      [`${PHASE_03}/03-REVIEW-FIX-empty.md`]: EMPTY_FIX,
    });
    const model = composeReviewLedger(fixInput(project, `${PHASE_03}/03-REVIEW-FIX-empty.md`))!;
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
    const model = composeReviewLedger(fixInput(project, `${PHASE_03}/03-REVIEW-FIX-web.md`))!;
    const long = sectionOf(model, 'fix-an-extremely-long-shard-name');
    expect(long.headingFull).toBe('An Extremely Long Shard Name');
    expect(long.heading!.length).toBe(24);
    expect(long.heading!.endsWith('…')).toBe(true);
    const html = renderToStaticMarkup(createElement(FixTabView, { model }));
    expect(html).toContain('title="An Extremely Long Shard Name"');
    expect(html).toContain('id="fix-web"');
  });

  it('is null without a ledger context', () => {
    expect(composeReviewLedger({ kind: 'review-fix', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
  });

  it('draws the Fix tab as text: severity pips with ids, chips for files, mono commits, no link and no raw HTML', () => {
    const model = composeReviewLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-backend.md`))!;
    const html = renderToStaticMarkup(createElement(FixTabView, { model }));
    expect(html).toContain('id="fix-backend"');
    expect(html).toContain('id="fix-frontend"');
    expect(html).toContain('<h2 class="view-review-ledger-heading" title="Backend">Backend</h2>');
    expect(html).toContain('<span class="view-review-sev" data-severity="warning">WR-01</span>');
    expect(html).toContain('<code class="view-review-ledger-chip" title="server/src/socket/index.ts">');
    expect(html).toContain('title="a1b2c3d');
    expect(html).toContain('Not in the review');
    expect(html).not.toContain('<a ');
  });

  it('headers the page "Review fix" with the review title', () => {
    const model = composeReviewLedger(fixInput(lendshed, `${PHASE_03}/03-REVIEW-FIX-backend.md`))!;
    expect(fixHeaderProps(model, 'fallback')).toEqual({ eyebrow: 'Review fix', title: model.title, lead: null });
    expect(fixHeaderProps({ ...model, title: null }, 'fallback').title).toBe('fallback');
  });
});
