// quick-261018-hbd: Pace timing from commits. The pure overlay covers the capped gaps, the first-commit
// gap, the summary fallback and plan ids that recur across milestones; an injected runner covers the
// cache, the reset and the failure path; a real temp repository covers the git call itself.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  applyCommitTimes,
  createCommitLog,
  parseCommitLog,
  type CommitEntry,
  type CommitLog,
} from '../../src/server/commit-times.ts';
import type { PacePlanDto } from '../../src/server/dashboard-ledger.ts';
import type { GitRunner } from '../../src/server/file-dates.ts';
import { createApp } from '../../src/server/index.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { fromDirectory } from '../helpers/from-directory.ts';

const LEDGER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures/dashboard/ledger');

function plan(overrides: Partial<PacePlanDto> & { id: string }): PacePlanDto {
  return {
    phase: '01',
    phaseName: 'Phase',
    milestone: 'v1.0',
    date: '2026-08-01',
    minutes: 90,
    approx: false,
    untimedReason: null,
    tasks: 2,
    timing: 'summary',
    commits: null,
    ...overrides,
  };
}

const T0 = Date.parse('2026-08-01T09:00:00Z') / 1000;
const at = (minutes: number, subject: string): CommitEntry => ({ at: T0 + minutes * 60, subject });

describe('parseCommitLog', () => {
  it('reads a timestamp and the subject after the first tab, and skips anything else', () => {
    expect(parseCommitLog('1786000000\tfeat(02-06): a\tb\n\nnot a line\n-5\tx\n1786000060\tdocs: y\n')).toEqual([
      { at: 1786000000, subject: 'feat(02-06): a\tb' },
      { at: 1786000060, subject: 'docs: y' },
    ]);
  });
});

describe('applyCommitTimes', () => {
  it('adds each commit gap, capped at 30 minutes, the first measured from the commit before it', () => {
    const [timed] = applyCommitTimes(
      [plan({ id: '02-06' })],
      [
        at(0, 'docs(02): plan phase 2'),
        at(10, 'feat(02-06): task 1'),
        // A usage-limit pause: eleven hours count as 30 minutes.
        at(10 + 11 * 60, 'feat(02-06): task 2'),
        at(10 + 11 * 60 + 5, 'docs(02-06): complete plan'),
      ],
    );
    expect(timed).toMatchObject({ minutes: 45, approx: false, timing: 'commits', commits: 3, untimedReason: null });
  });

  it('measures a later commit from the plan’s own previous commit, so interleaved plans each keep their time', () => {
    const [left, right] = applyCommitTimes(
      [plan({ id: '01-01' }), plan({ id: '01-02' })],
      [
        at(0, 'chore: start'),
        at(10, 'feat(01-01): a'),
        at(12, 'feat(01-02): a'),
        at(30, 'feat(01-01): b'),
        at(32, 'feat(01-02): b'),
      ],
    );
    expect([left.minutes, right.minutes]).toEqual([30, 22]);
  });

  it('ignores leading zeros and sorts the log by time', () => {
    const [timed] = applyCommitTimes(
      [plan({ id: '02-06' })],
      [at(25, 'fix(2-6): b'), at(5, 'test(02-06)!: a'), at(0, 'chore: start')],
    );
    expect(timed).toMatchObject({ minutes: 25, commits: 2 });
  });

  it('keeps the summary, marked approximate, for a plan with one commit or none', () => {
    const plans = applyCommitTimes(
      [plan({ id: '01-01', minutes: 40 }), plan({ id: '01-02', minutes: 20 })],
      [at(0, 'chore: start'), at(10, 'feat(01-01): only')],
    );
    expect(plans.map((p) => [p.minutes, p.approx, p.timing])).toEqual([
      [40, true, 'summary'],
      [20, true, 'summary'],
    ]);
  });

  it('times a plan whose summary only had wall-clock time, and leaves an untimed plan with no commits alone', () => {
    const untimed = { minutes: null, untimedReason: 'wall-clock time', timing: null } as const;
    const [timed, still] = applyCommitTimes(
      [plan({ id: '01-01', ...untimed }), plan({ id: '01-02', ...untimed })],
      [at(0, 'chore: start'), at(20, 'feat(01-01): a'), at(30, 'docs(01-01): b')],
    );
    expect(timed).toMatchObject({ minutes: 30, untimedReason: null, timing: 'commits' });
    expect(still).toMatchObject({ minutes: null, untimedReason: 'wall-clock time', timing: null });
  });

  it('falls back to every summary when there is no history', () => {
    const [only] = applyCommitTimes([plan({ id: '01-01' })], null);
    expect(only).toMatchObject({ minutes: 90, approx: true, timing: 'summary' });
  });

  it('gives a recurring plan id’s commits to the plan finished nearest to them', () => {
    const older = plan({ id: '01-01', milestone: 'v1.0', date: '2026-08-01' });
    const newer = plan({ id: '01-01', milestone: 'v2.0', date: '2026-09-20' });
    const later = Date.parse('2026-09-20T09:00:00Z') / 1000;
    const [first, second] = applyCommitTimes(
      [older, newer],
      [
        at(0, 'chore: a'),
        at(10, 'feat(01-01): v1 task'),
        at(20, 'docs(01-01): v1 done'),
        { at: later, subject: 'chore: b' },
        { at: later + 5 * 60, subject: 'feat(01-01): v2 task' },
        { at: later + 30 * 60, subject: 'docs(01-01): v2 done' },
      ],
    );
    expect([first.minutes, second.minutes]).toEqual([20, 30]);
  });

  it('keeps the summaries of a recurring plan id when one of them has no finish date', () => {
    const plans = applyCommitTimes(
      [plan({ id: '01-01', date: '2026-08-01' }), plan({ id: '01-01', milestone: 'v2.0', date: null })],
      [at(0, 'chore: a'), at(10, 'feat(01-01): a'), at(20, 'docs(01-01): b')],
    );
    expect(plans.map((p) => p.timing)).toEqual(['summary', 'summary']);
  });
});

describe('createCommitLog', () => {
  it('runs git log once with the hardened flags, caches it until reset, and gives null on failure', async () => {
    const calls: string[][] = [];
    let fail = false;
    const run: GitRunner = async (args) => {
      calls.push(args);
      if (fail) throw new Error('not a repository');
      return '1786000000\tfeat(01-01): a\n';
    };
    const log = createCommitLog('/repo', run);
    expect(await log.load()).toEqual([{ at: 1786000000, subject: 'feat(01-01): a' }]);
    await log.load();
    expect(calls).toHaveLength(1);
    expect(calls[0].slice(0, 4)).toEqual(['-c', 'core.fsmonitor=false', '--no-pager', 'log']);
    fail = true;
    log.reset();
    expect(await log.load()).toBeNull();
    expect(await createCommitLog('relative', run).load()).toBeNull();
  });

  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('reads a real repository, and gives null outside one', async () => {
    const root = mkdtempSync(join(tmpdir(), 'labelore-commit-times-'));
    dirs.push(root);
    const git = (args: string[], date: string) =>
      execFileSync('git', args, {
        cwd: root,
        stdio: 'pipe',
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 't',
          GIT_AUTHOR_EMAIL: 't@example.com',
          GIT_COMMITTER_NAME: 't',
          GIT_COMMITTER_EMAIL: 't@example.com',
          GIT_AUTHOR_DATE: date,
          GIT_COMMITTER_DATE: date,
        },
      });
    git(['init', '-q'], '2026-08-01T09:00:00Z');
    writeFileSync(join(root, 'a.txt'), 'a');
    git(['add', '.'], '2026-08-01T09:00:00Z');
    git(['commit', '-q', '-m', 'feat(01-01): a'], '2026-08-01T09:00:00Z');
    expect(await createCommitLog(root).load()).toEqual([{ at: T0, subject: 'feat(01-01): a' }]);

    const bare = mkdtempSync(join(tmpdir(), 'labelore-commit-times-'));
    dirs.push(bare);
    expect(await createCommitLog(bare).load()).toBeNull();
  });
});

describe('/api/dashboard pace timing', () => {
  let staticRoot: string;
  beforeAll(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), 'labelore-commit-times-static-'));
    await writeFile(join(staticRoot, 'index.html'), '<!doctype html><div id="root"></div>');
  });
  afterAll(async () => {
    await rm(staticRoot, { recursive: true, force: true });
  });

  it('times plans from the injected log and marks the rest as from their summary', async () => {
    const snapshot = await new PlanningRepository(await fromDirectory(LEDGER_ROOT), LEDGER_ROOT).load();
    const log: CommitLog = {
      load: async () => [
        { at: Date.parse('2026-07-10T09:00:00Z') / 1000, subject: 'docs(03): plan' },
        { at: Date.parse('2026-07-10T09:12:00Z') / 1000, subject: 'feat(03-01): a' },
        { at: Date.parse('2026-07-10T09:20:00Z') / 1000, subject: 'docs(03-01): done' },
      ],
      reset: () => {},
    };
    const response = await createApp({ getSnapshot: () => snapshot }, true, staticRoot, log).request('/api/dashboard');
    const body = (await response.json()) as { pace: { plans: PacePlanDto[] } };
    expect(body.pace.plans.map((p) => [p.id, p.minutes, p.approx, p.timing])).toEqual([
      ['01-01', 60, true, 'summary'],
      ['01-02', 35, true, 'summary'],
      ['02-01', null, false, null],
      ['03-01', 20, false, 'commits'],
    ]);
  });
});
