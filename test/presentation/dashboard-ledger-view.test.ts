// quick-261018-4tb: the pure filter, lead, paging and date helpers behind the dashboard's ledger
// sections. Expected values come from the sketch's own rules, written out in the plan's corpus
// facts. The blockers are read from the ledger fixture through the real reader.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import {
  blockerGroups,
  blockingLead,
  filterBlockers,
  isUntagged,
  matchesQuery,
  pageOf,
  relativeDay,
  type BlockerFilter,
} from '../../src/presentation/dashboard-ledger-view.ts';
import { buildDashboardLedger } from '../../src/server/dashboard-ledger.ts';
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
