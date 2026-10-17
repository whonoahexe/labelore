// quick-261018-4tb: the pure filter, lead, paging and date helpers behind the dashboard's ledger
// sections. Expected values come from the sketch's own rules, written out in the plan's corpus
// facts. The blockers are read from the ledger fixture through the real reader.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import {
  NO_PHASE,
  activityWindow,
  blockerGroups,
  blockingLead,
  decisionPhaseCounts,
  filterBlockers,
  dayMark,
  filterDecisions,
  groupByDay,
  groupByPhase,
  isUntagged,
  matchesQuery,
  pageOf,
  relativeDay,
  severityLabel,
  type BlockerFilter,
} from '../../src/presentation/dashboard-ledger-view.ts';
import { buildDashboardLedger, severityOf } from '../../src/server/dashboard-ledger.ts';
import { fromDirectory } from '../helpers/from-directory.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEDGER_ROOT = join(REPO_ROOT, 'test/fixtures/dashboard/ledger');

async function blockers() {
  const snapshot = await new PlanningRepository(await fromDirectory(LEDGER_ROOT), LEDGER_ROOT).load();
  return buildDashboardLedger(snapshot.project!).blockers;
}

const NONE: BlockerFilter = { group: null, untagged: false, resolved: false, query: '' };
const titles = (list: { title: string }[]) => list.map((b) => b.title);

describe('blocker filtering and the lead', () => {
  it('gives the band its legend, lead and rows with no filter', async () => {
    const all = await blockers();
    const open = all.filter((b) => !b.resolved);
    expect(open).toHaveLength(4);
    expect(blockerGroups(open)).toEqual([
      { key: 'Phase 3 review', label: 'Phase 3 review', count: 2 },
      { key: 'Operational', label: 'Operational', count: 2 },
    ]);
    expect(open.filter(isUntagged)).toHaveLength(1);

    const shown = filterBlockers(all, NONE);
    const lead = blockingLead(shown);
    expect(lead?.title).toBe('The sandbox certificate expires 2026-10-30');
    expect(titles(shown.filter((b) => b !== lead))).toEqual([
      'Gateway retries stall',
      'WR-01 is still open: a retry storm on every 5xx.',
      'Vendor ticket WHAT-75 was opened on 10-14 and has no answer yet.',
    ]);
  });

  it('keeps the lead within a group filter', async () => {
    const all = await blockers();
    const shown = filterBlockers(all, { ...NONE, group: 'Operational' });
    const lead = blockingLead(shown);
    expect(lead?.title).toBe('The sandbox certificate expires 2026-10-30');
    expect(titles(shown.filter((b) => b !== lead))).toEqual([
      'Vendor ticket WHAT-75 was opened on 10-14 and has no answer yet.',
    ]);
  });

  it('leads with the untagged blocker when only untagged ones are in view', async () => {
    const all = await blockers();
    const shown = filterBlockers(all, { ...NONE, untagged: true });
    expect(titles(shown)).toEqual(['Vendor ticket WHAT-75 was opened on 10-14 and has no answer yet.']);
    expect(blockingLead(shown)).toBe(shown[0]);
  });

  it('adds the resolved blocker to the rows when the toggle is on', async () => {
    const all = await blockers();
    const shown = filterBlockers(all, { ...NONE, resolved: true });
    const lead = blockingLead(shown);
    expect(lead?.title).toBe('The sandbox certificate expires 2026-10-30');
    expect(titles(shown.filter((b) => b !== lead))).toContain('Flaky snapshot test');
    expect(shown).toHaveLength(5);
  });

  it('searches titles and each source kind, label and detail', async () => {
    const all = await blockers();
    // "retry" is in #2's title and in #1's review-finding detail ("Retry-After"), not in #1's title.
    expect(titles(filterBlockers(all, { ...NONE, query: 'retry' }))).toEqual([
      'Gateway retries stall',
      'WR-01 is still open: a retry storm on every 5xx.',
    ]);
    expect(titles(filterBlockers(all, { ...NONE, query: '  ACCESS-04 ' }))).toEqual([
      'The sandbox certificate expires 2026-10-30',
    ]);
    expect(filterBlockers(all, { ...NONE, query: 'zzz-nothing' })).toEqual([]);
  });

  it('falls back from urgent to open to anything for the lead', () => {
    const base = {
      key: 'k',
      group: null,
      tag: null,
      why: null,
      text: '',
      sources: [],
      mentions: [],
      moreMentions: 0,
    };
    const plain = { ...base, title: 'plain', urgent: false, resolved: false };
    const urgentResolved = { ...base, title: 'urgent but resolved', urgent: true, resolved: true };
    expect(blockingLead([urgentResolved, plain])?.title).toBe('plain');
    expect(blockingLead([urgentResolved])?.title).toBe('urgent but resolved');
    expect(blockingLead([])).toBeNull();
  });

  it('matches a query as a trimmed, case-insensitive substring across the parts', () => {
    expect(matchesQuery('', 'anything')).toBe(true);
    expect(matchesQuery('  GATE ', 'Gateway', null, undefined)).toBe(true);
    expect(matchesQuery('nope', 'Gateway', 'retry')).toBe(false);
  });
});

describe('pageOf', () => {
  it('labels a full page with its range and counts the pages', () => {
    expect(pageOf(14, 5, 0)).toMatchObject({ page: 0, pages: 3, start: 0, end: 5, label: 'Showing 1–5 of 14' });
  });

  it('labels a last page of one item with that item alone', () => {
    expect(pageOf(6, 5, 1)).toMatchObject({ page: 1, pages: 2, start: 5, end: 6, label: 'Showing 6 of 6' });
  });

  it('clamps a page past the end to the last page, and a negative one to the first', () => {
    expect(pageOf(14, 5, 9)).toMatchObject({ page: 2, start: 10, end: 14, label: 'Showing 11–14 of 14' });
    expect(pageOf(14, 5, -3).page).toBe(0);
  });

  it('is empty for nothing', () => {
    expect(pageOf(0, 5, 0)).toMatchObject({ page: 0, pages: 0, start: 0, end: 0 });
  });
});

describe('relativeDay', () => {
  const READ_AT = '2026-10-18T12:00:00.000Z';
  it.each([
    ['2026-10-18', 'Today'],
    ['2026-10-17', 'Yesterday'],
    ['2026-10-15', '3 days ago'],
    ['2026-10-11', '11 Oct'],
    ['2025-10-25', '25 Oct 2025'],
    ['2026-10-19', 'Today'],
    ['2026-10-17T09:00:00Z', 'Yesterday'],
  ])('%s reads %s', (iso, expected) => {
    expect(relativeDay(iso, READ_AT)).toBe(expected);
  });

  it('is empty for a value that is not date-shaped', () => {
    expect(relativeDay('soon', READ_AT)).toBe('');
    expect(relativeDay(null, READ_AT)).toBe('');
  });
});

describe('decision helpers', () => {
  async function decisions() {
    const snapshot = await new PlanningRepository(await fromDirectory(LEDGER_ROOT), LEDGER_ROOT).load();
    return buildDashboardLedger(snapshot.project!).decisions;
  }
  const decisionTitle = (list: { title: string }[]) => list.map((d) => d.title);

  it('counts decisions per phase for the rail and the histogram', async () => {
    const counts = decisionPhaseCounts(await decisions());
    expect(counts.rail).toEqual([
      { key: '03', count: 1 },
      { key: '02', count: 1 },
      { key: '01', count: 2 },
      { key: NO_PHASE, count: 2 },
    ]);
    expect(counts.histogram.map((entry) => `${entry.key}:${entry.count}`)).toEqual(['—:2', '01:2', '02:1', '03:1']);
  });

  it('filters by phase and by a search over title, rationale, plan and phase', async () => {
    const all = await decisions();
    expect(decisionTitle(filterDecisions(all, { phase: '01', query: '' }))).toEqual([
      'Reconcile on entry number plus line number.',
      'Store the raw response beside the parsed one',
    ]);
    expect(decisionTitle(filterDecisions(all, { phase: NO_PHASE, query: '' }))).toEqual([
      'Keep the retry queue in Postgres, not Redis.',
      'Cache tariff lookups per session',
    ]);
    expect(decisionTitle(filterDecisions(all, { phase: null, query: 'entry' }))).toEqual([
      'Key filings by entry number',
      'Reconcile on entry number plus line number.',
    ]);
    expect(filterDecisions(all, { phase: '03', query: 'postgres' })).toEqual([]);
  });

  it('groups a page by phase in rail order, keeping newest first inside a group', async () => {
    const groups = groupByPhase(await decisions());
    expect(groups.map((g) => [g.key, decisionTitle(g.items)])).toEqual([
      ['03', ['Key filings by entry number']],
      ['02', ['Corrections are new filings, never edits in place.']],
      ['01', ['Reconcile on entry number plus line number.', 'Store the raw response beside the parsed one']],
      [NO_PHASE, ['Keep the retry queue in Postgres, not Redis.', 'Cache tariff lookups per session']],
    ]);
  });

  it('pages 17 decisions as three pages of eight', () => {
    expect(pageOf(17, 8, 0)).toMatchObject({ pages: 3, start: 0, end: 8, label: 'Showing 1–8 of 17' });
    expect(pageOf(17, 8, 2)).toMatchObject({ start: 16, end: 17, label: 'Showing 17 of 17' });
  });
});

describe('todo severity', () => {
  it.each([
    ['major', 'high'],
    ['high', 'high'],
    ['critical', 'high'],
    ['blocker', 'high'],
    ['P0', 'high'],
    ['p1', 'high'],
    ['medium', 'medium'],
    ['moderate', 'medium'],
    ['normal', 'medium'],
    ['P2', 'medium'],
    ['minor', 'low'],
    ['low', 'low'],
    ['cosmetic', 'low'],
    ['trivial', 'low'],
    ['p3', 'low'],
    ['P4', 'low'],
    ['whenever', 'unrated'],
    [null, 'unrated'],
  ] as const)('%s reads %s', (weight, severity) => {
    expect(severityOf(weight)).toBe(severity);
  });

  it('labels the four levels', () => {
    expect(['high', 'medium', 'low', 'unrated'].map((level) => severityLabel(level as 'high'))).toEqual([
      'High',
      'Medium',
      'Low',
      'Unrated',
    ]);
  });
});

describe('recent work helpers', () => {
  const SYNTHETIC_ROOT = join(REPO_ROOT, 'test/fixtures/dashboard/synthetic');
  async function recent() {
    const snapshot = await new PlanningRepository(await fromDirectory(SYNTHETIC_ROOT), SYNTHETIC_ROOT).load();
    return buildDashboardLedger(snapshot.project!).recent;
  }

  it('windows twenty-one days ending on the newest task', async () => {
    const window = activityWindow(await recent());
    expect(window.days).toHaveLength(21);
    expect(window.days[0].day).toBe('2026-09-26');
    expect(window.days[20].day).toBe('2026-10-16');
    expect(window.total).toBe(7);
    expect(window.days.find((d) => d.day === '2026-10-11')).toMatchObject({ quick: 1, fast: 1 });
    expect(window.max).toBe(2);
    expect(activityWindow([])).toEqual({ days: [], total: 0, max: 0 });
  });

  it('counts only tasks inside the window', async () => {
    const tasks = await recent();
    const old = { ...tasks[0], key: 'old', date: '2026-08-01' };
    expect(activityWindow([...tasks, old]).total).toBe(7);
  });

  it('groups a first page of five by day', async () => {
    const page = (await recent()).slice(0, 5);
    expect(groupByDay(page).map((g) => [g.day, g.items.length])).toEqual([
      ['2026-10-16', 1],
      ['2026-10-14', 1],
      ['2026-10-13', 1],
      ['2026-10-11', 2],
    ]);
  });

  it('marks a day with its number, month and weekday', () => {
    expect(dayMark('2026-10-16')).toEqual({ number: 16, label: 'Oct · Fri' });
    expect(dayMark('2026-01-01')).toEqual({ number: 1, label: 'Jan · Thu' });
  });
});
