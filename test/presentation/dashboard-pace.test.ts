// quick-261018-4tb: Pace (sketch 026 P1) as pure functions. Expected values come from the sketch's
// own rules, written out in the plan's corpus facts. The fixture rows are read through the real
// reader.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import {
  formatMinutes,
  paceChart,
  paceScope,
  paceStats,
  parseDuration,
  scopedPlans,
  trendSentence,
} from '../../src/presentation/dashboard-pace.ts';
import { buildDashboardLedger, type PacePlanDto } from '../../src/server/dashboard-ledger.ts';
import { fromDirectory } from '../helpers/from-directory.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const READ_AT = '2026-10-18T12:00:00.000Z';

async function paceOf(root: string) {
  const snapshot = await new PlanningRepository(await fromDirectory(root), root).load();
  return buildDashboardLedger(snapshot.project!).pace;
}

function plan(overrides: Partial<PacePlanDto> & { id: string }): PacePlanDto {
  return {
    phase: '01',
    phaseName: 'Phase',
    milestone: 'v1.0',
    date: '2026-01-01',
    minutes: 10,
    approx: false,
    untimedReason: null,
    tasks: 1,
    timing: null,
    commits: null,
    ...overrides,
  };
}

const run = (...minutes: number[]): PacePlanDto[] =>
  minutes.map((value, index) => plan({ id: `01-${String(index + 1).padStart(2, '0')}`, minutes: value }));

describe('parseDuration', () => {
  it.each([
    ['~35min (this continuation session)', 35, true],
    ['1h', 60, false],
    ['1h 30m', 90, false],
    ['45 minutes', 45, false],
    ['about 2 hours', 120, true],
    ['20min-active', 20, false],
  ])('%s is %d minutes', (raw, minutes, approx) => {
    expect(parseDuration(raw)).toEqual({ minutes, approx, untimedReason: null });
  });

  it.each([
    ['7h 7m elapsed', 'wall-clock time'],
    ['recovered', 'unreadable duration'],
    ['0min', 'unreadable duration'],
    [undefined, 'no duration'],
    [null, 'no duration'],
  ])('%s is untimed: %s', (raw, untimedReason) => {
    expect(parseDuration(raw)).toEqual({ minutes: null, approx: false, untimedReason });
  });
});

describe('formatMinutes', () => {
  it.each([
    [18.6, '19 min'],
    [60, '1h'],
    [115, '1h 55m'],
    [980, '16h 20m'],
    [59.6, '1h'],
  ])('%d reads %s', (value, text) => {
    expect(formatMinutes(value)).toBe(text);
  });
});

describe('trend', () => {
  const sixteen = (first: number, second: number) => run(...Array(8).fill(first), ...Array(8).fill(second));

  it('calls a run of faster plans faster', () => {
    const { trend } = paceStats(sixteen(20, 10));
    expect(trend?.verdict).toBe('faster');
    expect(trendSentence(trend)).toBe(
      'The last 8 plans took a median 10.0 min a task, 50% less than the 8 before (20.0).',
    );
  });

  it('calls a small change steady', () => {
    const { trend } = paceStats(sixteen(20, 22));
    expect(trend?.verdict).toBe('steady');
    expect(trendSentence(trend)).toContain('about the same as');
  });

  it('calls a run of slower plans slower', () => {
    const { trend } = paceStats(sixteen(20, 30));
    expect(trend?.verdict).toBe('slower');
    expect(trendSentence(trend)).toContain('50% more than');
  });

  it('gives no trend under eight timed plans', () => {
    const stats = paceStats(run(1, 2, 3, 4, 5, 6, 7).map((p, i) => ({ ...p, minutes: 10 + i })));
    expect(stats.trend).toBeNull();
    expect(trendSentence(null)).toBe('Too few timed plans to call a trend.');
  });

  it('measures minutes a task, not minutes a plan', () => {
    const plans = [...run(...Array(8).fill(40)).map((p) => ({ ...p, tasks: 4 })), ...run(...Array(8).fill(40))];
    expect(paceStats(plans).trend?.verdict).toBe('slower');
  });
});

describe('paceScope', () => {
  it('defaults to everything for the dense and ledger fixtures', async () => {
    for (const root of [join(REPO_ROOT, 'fixtures/dense'), join(REPO_ROOT, 'test/fixtures/dashboard/ledger')]) {
      const pace = await paceOf(root);
      expect(paceScope(pace.plans, pace.current).defaultScope).toBe('all');
    }
    const ledger = await paceOf(join(REPO_ROOT, 'test/fixtures/dashboard/ledger'));
    expect(paceScope(ledger.plans, ledger.current).milestones).toEqual(['v1.0', 'v2.0']);
  });

  it('defaults to the current milestone once it has four timed plans', () => {
    const plans = [...run(10, 10, 10).map((p) => ({ ...p, milestone: 'v1.0' })), ...run(10, 10, 10, 10).map((p) => ({ ...p, milestone: 'v2.0' }))];
    expect(paceScope(plans, 'v2.0').defaultScope).toBe('v2.0');
    expect(paceScope(plans, 'v1.0').defaultScope).toBe('all');
    expect(paceScope(plans, null).defaultScope).toBe('all');
    expect(scopedPlans(plans, 'v2.0')).toHaveLength(4);
    expect(scopedPlans(plans, 'all')).toHaveLength(7);
  });

  it('orders milestones numerically', () => {
    const plans = ['v10.0', 'v2.0', 'v1.0'].map((milestone, i) => plan({ id: `0${i}-01`, milestone }));
    expect(paceScope(plans, null).milestones).toEqual(['v1.0', 'v2.0', 'v10.0']);
  });
});

describe('paceStats', () => {
  it('totals the dense fixture over its five timed plans', async () => {
    const stats = paceStats((await paceOf(join(REPO_ROOT, 'fixtures/dense'))).plans);
    expect(stats).toMatchObject({ plans: 5, timed: 5, untimed: 0, total: 93, median: 18, trend: null });
    expect(formatMinutes(stats.total)).toBe('1h 33m');
    expect(formatMinutes(stats.avg)).toBe('19 min');
    expect(stats.perTask.toFixed(1)).toBe('13.3');
  });

  it('leaves the untimed plan out of the ledger fixture totals', async () => {
    const stats = paceStats((await paceOf(join(REPO_ROOT, 'test/fixtures/dashboard/ledger'))).plans);
    expect(stats).toMatchObject({ plans: 4, timed: 3, untimed: 1, total: 115, median: 35, approx: 1 });
    expect(formatMinutes(stats.total)).toBe('1h 55m');
    expect(formatMinutes(stats.avg)).toBe('38 min');
    expect(stats.perTask.toFixed(1)).toBe('19.2');
    expect(stats.trend).toBeNull();
  });
});

describe('paceChart', () => {
  it('lays out the dense fixture', async () => {
    const chart = paceChart((await paceOf(join(REPO_ROOT, 'fixtures/dense'))).plans, READ_AT);
    expect(chart.cap).toBe(60);
    expect(chart.ticks.map((tick) => tick.label)).toEqual(['0', '30', '1h']);
    expect(chart.bands.map((band) => band.label)).toEqual(['P01', 'P01', 'P02', 'P01']);
    expect(chart.bands.map((band) => band.alt)).toEqual([false, true, false, true]);
    expect(chart.medians).toEqual([15, 18, 16, 18, 18]);
    expect(chart.dots).toHaveLength(5);
    expect(chart.dots.some((dot) => dot.over)).toBe(false);
    expect(chart.anyOver).toBe(false);
    // Left to right in finish order, and a longer plan sits higher (a smaller y).
    expect(chart.dots.map((dot) => dot.x)).toEqual([...chart.dots.map((dot) => dot.x)].sort((a, b) => a - b));
    expect(chart.dots[4].y).toBeLessThan(chart.dots[0].y);
    expect(chart.dots[0].tip).toBe('01-01 · Phase 01 Bootstrap\n15 min · from its summary · 1 task · 25 Oct 2025 · v1.0');
  });

  it('flags a plan above the cap and draws it at the top', () => {
    const chart = paceChart(run(...Array(12).fill(10), 200), READ_AT);
    expect(chart.cap).toBe(30);
    const over = chart.dots.filter((dot) => dot.over);
    expect(over).toHaveLength(1);
    expect(over[0].caret).not.toBeNull();
    expect(over[0].y).toBe(chart.ticks[2].y);
    expect(chart.anyOver).toBe(true);
  });

  it('marks an approximate plan, centres a single plan, and tolerates no plan', () => {
    const [only] = paceChart([plan({ id: '01-01', approx: true, minutes: 35 })], READ_AT).dots;
    expect(only.approx).toBe(true);
    expect(only.tip).toContain('~35 min');
    expect(paceChart([], READ_AT).dots).toEqual([]);
  });
});
