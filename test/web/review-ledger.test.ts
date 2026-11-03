// Phase 9 (09-12): the review ledger's composers and static markup. composeLedgerHead over Lendshed phase 3
// (a review and two shard fix reports) and a lone phase 4 review, plus the strip and head ledgerSwitcher draws.
// The ledger's view contract test lands in 09-13, once all three tab bodies exist.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildLedgerContext } from '../../src/presentation/review-ledger.ts';
import type { LedgerContext } from '../../src/presentation/review-ledger.ts';
import { composeLedgerHead } from '../../src/web/views/review-ledger.ts';
import { ledgerSwitcher } from '../../src/web/views/review-ledger-components.tsx';
import { loadFixtureProject } from '../helpers/fixture-project.ts';
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

  it('draws no tab for a file that does not exist: a review with only fix files has no Review tab', () => {
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
