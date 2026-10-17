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
import { paceScope } from '../../src/presentation/dashboard-pace.ts';
import { buildDashboardLedger } from '../../src/server/dashboard-ledger.ts';
import { buildDashboardViewModel } from '../../src/presentation/dashboard.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import { OnDeckPanel, RecentWorkPanel } from '../../src/web/pages/dashboard-deck.tsx';
import { BlockingBand, DecisionsSection } from '../../src/web/pages/dashboard-ledger.tsx';
import { PaceSection } from '../../src/web/pages/dashboard-pace.tsx';
import { fromDirectory } from '../helpers/from-directory.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEDGER_ROOT = join(REPO_ROOT, 'test/fixtures/dashboard/ledger');
const SYNTHETIC_ROOT = join(REPO_ROOT, 'test/fixtures/dashboard/synthetic');
const DENSE_ROOT = join(REPO_ROOT, 'fixtures/dense');
const READ_AT = '2026-10-18T12:00:00.000Z';

async function ledgerOf(root: string) {
  const snapshot = await new PlanningRepository(await fromDirectory(root), root).load();
  return buildDashboardLedger(snapshot.project!);
}

const render = (node: React.ReactElement): string =>
  renderToStaticMarkup(createElement(MemoryRouter, null, node));

/** The visible text of some markup: tags dropped, so "<b>6</b> <span>logged</span>" reads "6 logged". */
const textOf = (markup: string): string => markup.replace(/<[^>]*>/g, '');

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

describe('Decisions section', () => {
  it('shows the count, the phase bars and the phase rail, never naming STATE.md', async () => {
    const ledger = await ledgerOf(LEDGER_ROOT);
    const markup = render(createElement(DecisionsSection, { decisions: ledger.decisions }));
    expect(markup).toContain('Settled');
    expect(markup).toContain('Decisions');
    expect(textOf(markup)).toContain('6 logged');
    for (const label of ['None', 'P01', 'P02', 'P03']) expect(markup).toContain(`>${label}<`);
    expect(markup).toContain('>Phase<');
    expect(markup).toContain('>No phase<');
    expect(markup).toContain('2 decisions');
    expect(markup.match(/ledger-row-head/g)).toHaveLength(6);
    expect(markup).toContain('Search decisions');
    expect(markup).not.toContain('Showing');
    expect(markup).not.toContain('STATE.md');
  });

  it('pages eight at a time', async () => {
    const ledger = await ledgerOf(SYNTHETIC_ROOT);
    const markup = render(createElement(DecisionsSection, { decisions: ledger.decisions }));
    expect(textOf(markup)).toContain('9 logged');
    expect(markup.match(/ledger-row-head/g)).toHaveLength(8);
    expect(markup).toContain('Showing 1–8 of 9');
    expect(markup).toContain('1 / 2');
  });

  it('says so when nothing is recorded', () => {
    const markup = render(createElement(DecisionsSection, { decisions: [] }));
    expect(markup).toContain('No decisions are recorded.');
    expect(markup).not.toContain('Search decisions');
  });
});

describe('Pace section', () => {
  const viewOf = async (root: string) => {
    const { pace } = await ledgerOf(root);
    return { ...pace, ...paceScope(pace.plans, pace.current) };
  };

  it('shows the dense fixture as a rail and a dot for every timed plan', async () => {
    const markup = render(createElement(PaceSection, { pace: await viewOf(DENSE_ROOT), readAt: READ_AT }));
    expect(markup).toContain('Pace');
    expect(markup).toContain('1h 33m');
    expect(markup).toContain('of execution across 5 timed plans');
    expect(markup).toContain('Plans completed');
    expect(markup).toContain('median 18 min');
    expect(markup).toContain('13.3 min');
    expect(markup).toContain('All milestones');
    expect(markup).toContain('Not enough plans yet');
    expect(markup).toContain('<svg');
    expect(markup.match(/pace-dot-mark/g)).toHaveLength(5);
    expect(markup).toContain('<title>01-01 · Phase 01 Bootstrap');
    expect(markup).toContain('Running median of 5');
    expect(markup).not.toContain('STATE.md');
  });

  it('counts the untimed plan in the ledger fixture without charting it', async () => {
    const markup = render(createElement(PaceSection, { pace: await viewOf(LEDGER_ROOT), readAt: READ_AT }));
    expect(markup).toContain('1h 55m');
    expect(markup).toContain('1 untimed');
    expect(markup.match(/pace-dot-mark/g)).toHaveLength(3);
  });

  it('says so when no completed plan has a recorded duration', async () => {
    const markup = render(createElement(PaceSection, { pace: await viewOf(SYNTHETIC_ROOT), readAt: READ_AT }));
    expect(markup).toContain('How fast plans land');
    expect(markup).toContain('No completed plan has a recorded duration yet.');
    expect(markup).not.toContain('<svg role');
  });
});

async function viewOf(root: string) {
  const snapshot = await new PlanningRepository(await fromDirectory(root), root).load();
  return buildDashboardViewModel(toProjectPresentation({ ...snapshot, readAt: READ_AT }));
}

describe('On deck panel', () => {
  it('opens on Next with the synthetic counts and the queue after the head plan', async () => {
    const view = await viewOf(SYNTHETIC_ROOT);
    const markup = render(createElement(OnDeckPanel, { onDeck: view.onDeck, readAt: READ_AT }));
    expect(markup).toContain('On deck');
    expect(markup).toContain('After the next step');
    expect(markup).toMatch(/Next<\/span> <b>3<\/b>/);
    expect(markup).toMatch(/Todos<\/span> <b>5<\/b>/);
    expect(markup).toMatch(/Notes<\/span> <b>3<\/b>/);
    expect(markup).toMatch(/aria-selected="true"[^>]*><span>Next/);
    expect(markup).toContain('Show unreconciled corrections in a broker review queue');
    expect(markup).not.toContain('Match each correction to its original filing');
    expect(markup).toContain('Importer Reporting');
    expect(markup).not.toContain('STATE.md');
  });

  it('opens on Todos when nothing is queued, with a severity gutter, meta line and one arrow', async () => {
    const view = await viewOf(SYNTHETIC_ROOT);
    const markup = render(
      createElement(OnDeckPanel, { onDeck: { ...view.onDeck, queue: [] }, readAt: READ_AT }),
    );
    expect(markup).toMatch(/aria-selected="true"[^>]*><span>Todos/);
    for (const label of ['High', 'Medium', 'Low', 'Unrated']) expect(markup).toContain(label);
    expect(markup).toContain('data-severity="high"');
    expect(markup).toContain('After five failed retries a filing just stops. Nothing tells the broker.');
    expect(markup).toContain('gateway');
    expect(markup).toContain('Added 6 days ago');
    expect(markup).toContain('title="src/gateway/retry-queue.ts:88-140"');
    expect(markup).toContain('>+1<');
    // Five to a page, with the done line after the pager: three file-backed todos link out.
    expect(markup.match(/todo-row/g)).toHaveLength(5);
    expect(markup.match(/todo-go/g)).toHaveLength(3);
    expect(markup).toContain('Untagged');
    expect(markup).not.toContain('Showing');
    expect(markup).toContain('1 todo done.');
  });

  it('lists notes with the promoted one last, dimmed', async () => {
    const view = await viewOf(SYNTHETIC_ROOT);
    const markup = render(
      createElement(OnDeckPanel, { onDeck: { ...view.onDeck, queue: [], todos: [] }, readAt: READ_AT }),
    );
    expect(markup).toMatch(/aria-selected="true"[^>]*><span>Notes/);
    expect(markup).toContain('Yesterday');
    expect(markup).toContain('data-promoted="true"');
    expect(markup).toContain('Now a todo');
    expect(markup.indexOf('phase 4 might be too big')).toBeLessThan(markup.indexOf('Now a todo'));
  });

  it('shows a quiet line on each empty tab', () => {
    const empty = { queue: [], todos: [], todosDone: 0, notes: [] };
    const on = (tab: 'next' | 'todos' | 'notes', onDeck = empty) =>
      render(createElement(OnDeckPanel, { onDeck, readAt: READ_AT, initialTab: tab }));
    expect(on('next')).toContain('Nothing is queued after the next step.');
    expect(on('todos')).toContain('No pending todos.');
    expect(on('todos', { ...empty, todosDone: 3 })).toContain('No pending todos — 3 done.');
    expect(on('notes')).toContain('No notes captured.');
    // Nothing anywhere opens on Next.
    expect(render(createElement(OnDeckPanel, { onDeck: empty, readAt: READ_AT }))).toContain(
      'Nothing is queued after the next step.',
    );
  });

  it('pages each tab on its own, five to a page', async () => {
    const view = await viewOf(SYNTHETIC_ROOT);
    const many = { ...view.onDeck, todos: [...view.onDeck.todos, ...view.onDeck.todos] };
    const markup = render(createElement(OnDeckPanel, { onDeck: many, readAt: READ_AT, initialTab: 'todos' }));
    expect(markup).toContain('Showing 1–5 of 10');
    expect(markup).toContain('1 / 2');
    expect(markup.match(/todo-row/g)).toHaveLength(5);
  });
});

describe('Recent work panel', () => {
  it('draws the synthetic activity and groups tasks by day', async () => {
    const view = await viewOf(SYNTHETIC_ROOT);
    const markup = render(createElement(RecentWorkPanel, { recent: view.recent, readAt: READ_AT }));
    expect(markup).toContain('Recent work');
    expect(markup).toContain('Quick and fast tasks');
    expect(textOf(markup)).toContain('7 in 3 weeks');
    expect(markup.match(/data-day=/g)).toHaveLength(21);
    expect(markup).toContain('26 Sep');
    expect(markup).toContain('16 Oct');
    expect(markup).toContain('>16<');
    expect(markup).toContain('Oct · Fri');
    expect(markup).toContain('Showing 1–5 of 7');
    expect(markup.match(/recent-day"/g)).toHaveLength(4);
    expect(markup.match(/recent-task-kind/g)).toHaveLength(5);
    expect(markup).toContain('Needs Review');
    // 261014-k2p has a PLAN but no SUMMARY; 261011-a7q has both.
    expect(markup.match(/>Plan</g)).toHaveLength(2);
    expect(markup.match(/>Summary</g)).toHaveLength(1);
  });

  it('shows a quiet line with no tasks', () => {
    const markup = render(createElement(RecentWorkPanel, { recent: [], readAt: READ_AT }));
    expect(markup).toContain('No quick or fast tasks logged yet.');
    expect(textOf(markup)).not.toContain('in 3 weeks');
  });
});
