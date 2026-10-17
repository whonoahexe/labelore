// quick-261018-4tb: static-render checks of the dashboard's sections inside a MemoryRouter. The
// sections read their data from the ledger fixtures through the real reader; the page itself never
// reads a file.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildDashboardLedger } from '../../src/server/dashboard-ledger.ts';
import { BlockingBand } from '../../src/web/pages/dashboard-ledger.tsx';
import { fromDirectory } from '../helpers/from-directory.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEDGER_ROOT = join(REPO_ROOT, 'test/fixtures/dashboard/ledger');

async function ledgerOf(root: string) {
  const snapshot = await new PlanningRepository(await fromDirectory(root), root).load();
  return buildDashboardLedger(snapshot.project!);
}

const render = (node: React.ReactElement): string =>
  renderToStaticMarkup(createElement(MemoryRouter, null, node));

describe('Blocking band', () => {
  it('leads with the most urgent blocker and lists the rest, never naming STATE.md', async () => {
    const ledger = await ledgerOf(LEDGER_ROOT);
    const markup = render(createElement(BlockingBand, { blockers: ledger.blockers }));

    expect(markup).toContain('Blocking');
    expect(markup).toContain('>4<');
    expect(markup).toContain('open blockers, plus 1 marked resolved');
    for (const entry of ['All', 'Phase 3 review', 'Operational', 'Untagged']) expect(markup).toContain(entry);
    expect(markup).toContain('The sandbox certificate expires 2026-10-30');
    expect(markup).toContain('Time-bound · most urgent');
    const accessUrl = ledger.blockers[2].sources[0].url;
    expect(markup).toContain(`href="${accessUrl}"`);
    expect(markup).toContain('Requirement ACCESS-04');
    expect(markup).toContain('Also in portal');
    // The collapsed row chips: the first source and how many more, or Untagged.
    expect(markup).toContain('WR-02<b>+2</b>');
    expect(markup).toContain('WR-01<b>+1</b>');
    expect(markup).toContain('Untagged');
    // Three rows, no pager; the resolved blocker waits behind its toggle.
    expect(markup.match(/ledger-row-head/g)).toHaveLength(3);
    expect(markup).not.toContain('Flaky snapshot test');
    expect(markup).toContain('Show resolved');
    expect(markup).not.toContain('Showing');
    expect(markup).not.toContain('STATE.md');
    expect(markup).not.toContain('dangerouslySetInnerHTML');
  });

  it('collapses to one quiet line when no blocker is open', async () => {
    const snapshot = await new PlanningRepository(
      new InMemoryPlanningFilesystem({
        '.planning/STATE.md': '---\nstatus: x\n---\n\n## Accumulated Context\n\n### Blockers/Concerns\n\nNone yet.\n',
      }),
      '/project',
    ).load();
    const ledger = buildDashboardLedger(snapshot.project!);
    const markup = render(createElement(BlockingBand, { blockers: ledger.blockers }));
    expect(markup).toContain('Nothing blocking.');
    expect(markup).toContain('No open blockers are recorded.');
    expect(markup).not.toContain('Show resolved');
    expect(markup).not.toContain('STATE.md');
  });

  it('says how many are marked resolved when every blocker is resolved', () => {
    const resolved = {
      key: 'blocker-0',
      group: null,
      urgent: false,
      resolved: true,
      tag: 'RESOLVED',
      title: 'Old',
      why: null,
      text: 'Old',
      sources: [],
      mentions: [],
      moreMentions: 0,
    };
    const markup = render(createElement(BlockingBand, { blockers: [resolved] }));
    expect(markup).toContain('Nothing blocking.');
    expect(markup).toContain('No open blockers are recorded (1 marked resolved).');
  });

  it('renders text from a planning file as text, never as markup', () => {
    const hostile = {
      key: 'blocker-0',
      group: '<img src=x onerror=alert(1)>',
      urgent: true,
      resolved: false,
      tag: null,
      title: '<script>alert(1)</script> and `code`',
      why: '<b onclick="x">bold</b>',
      text: 'x',
      sources: [],
      mentions: [],
      moreMentions: 0,
    };
    const markup = render(createElement(BlockingBand, { blockers: [hostile] }));
    expect(markup).not.toContain('<script');
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('<b onclick');
    expect(markup).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(markup).toContain('<code>code</code>');
  });
});
