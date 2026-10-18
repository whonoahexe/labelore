// Pace timing from commits (quick-261018-hbd). A SUMMARY's `duration` is typed by an agent and means
// different things from plan to plan: active time, wall-clock time across a usage-limit pause, only
// the last session, or a guess. Commits are a record nobody types, so a plan is timed from the target
// repository's history instead: each of its commits (`feat(02-06): ...`) adds the gap since the plan's
// own previous commit, or since the commit just before it for the first one, each gap capped at
// GAP_CAP_MINUTES, so a pause counts as a break and not as work. A plan with fewer than MIN_COMMITS
// commits, or a project with no history, keeps its SUMMARY duration, marked approximate.
//
// T-hbd-01/02: `git log` only, through the hardened runner file-dates uses (no shell, no fsmonitor,
// no optional locks, no prompt, no pager), with a count cap, a timeout and a buffer cap; any failure
// gives null and every plan falls back to its summary. T-hbd-03: from each subject only a numeric
// timestamp and a scope matched by a bounded regex are read.
import type { PacePlanDto } from './dashboard-ledger.ts';
import { createGitRunner, type GitRunner } from './file-dates.ts';

export const GAP_CAP_MINUTES = 30;
const MIN_COMMITS = 2;
const MAX_COMMITS = 50_000;
const DAY_MS = 86_400_000;

export interface CommitEntry {
  /** Author time, seconds since the epoch. */
  at: number;
  subject: string;
}

export interface CommitLog {
  /** The repository's commits, or null when there is no readable history. */
  load(): Promise<CommitEntry[] | null>;
  /** Forget the cached log, so the next load reads it again (on refresh). */
  reset(): void;
}

const defaultRunner = createGitRunner(10_000, 16 * 1024 * 1024);

export function parseCommitLog(output: string): CommitEntry[] {
  const entries: CommitEntry[] = [];
  for (const line of output.split('\n')) {
    const tab = line.indexOf('\t');
    if (tab < 1) continue;
    const at = Number(line.slice(0, tab));
    if (Number.isInteger(at) && at > 0) entries.push({ at, subject: line.slice(tab + 1) });
  }
  return entries;
}

export function createCommitLog(rootPath: string, run: GitRunner = defaultRunner): CommitLog {
  let cached: Promise<CommitEntry[] | null> | null = null;

  async function read(): Promise<CommitEntry[] | null> {
    if (rootPath === '' || !rootPath.startsWith('/') || rootPath.includes('\0')) return null;
    try {
      const output = await run(
        ['-c', 'core.fsmonitor=false', '--no-pager', 'log', `--max-count=${MAX_COMMITS}`, '--format=%at%x09%s'],
        { cwd: rootPath },
      );
      const entries = parseCommitLog(String(output));
      return entries.length ? entries : null;
    } catch {
      return null;
    }
  }

  return {
    load() {
      cached ??= read();
      return cached;
    },
    reset() {
      cached = null;
    },
  };
}

/** `02-06` and `2-6` name the same plan. */
function planKey(id: string): string | null {
  const match = /^(\d{1,4})-(\d{1,4})$/.exec(id);
  return match ? `${Number(match[1])}-${Number(match[2])}` : null;
}

/** The plan a commit subject is scoped to: `feat(02-06): ...`, `test(2-06)!: ...`. */
function scopeKey(subject: string): string | null {
  const match = /^[a-z]{1,16}\((\d{1,4}-\d{1,4})\)/i.exec(subject);
  return match ? planKey(match[1]) : null;
}

const dayOf = (date: string): number => Date.parse(`${date}T12:00:00Z`);

/** Pace plans with `minutes` from their commits where the history has two or more of them; every
 * other timed plan keeps its summary duration, marked approximate. */
export function applyCommitTimes(plans: PacePlanDto[], commits: CommitEntry[] | null): PacePlanDto[] {
  const candidates = new Map<string, number[]>();
  plans.forEach((plan, index) => {
    const key = planKey(plan.id);
    if (key === null) return;
    const list = candidates.get(key) ?? [];
    list.push(index);
    candidates.set(key, list);
  });

  const totals = plans.map(() => ({ minutes: 0, commits: 0 }));
  if (commits) {
    const ordered = [...commits].sort((left, right) => left.at - right.at);
    const lastByPlan = new Map<number, number>();
    ordered.forEach((commit, position) => {
      const key = scopeKey(commit.subject);
      const owners = key === null ? undefined : candidates.get(key);
      if (!owners) return;
      // A plan id that recurs across milestones: the commit goes to the plan finished nearest to it.
      // When one of them has no finish date the commit cannot be placed, and the id keeps its summaries.
      let owner = owners[0];
      if (owners.length > 1) {
        if (owners.some((index) => plans[index].date === null)) return;
        const at = commit.at * 1000;
        owner = owners.reduce((best, index) =>
          Math.abs(dayOf(plans[index].date!) - at) < Math.abs(dayOf(plans[best].date!) - at) ? index : best,
        );
        if (Math.abs(dayOf(plans[owner].date!) - at) > 60 * DAY_MS) return;
      }
      const previous = lastByPlan.get(owner) ?? (position > 0 ? ordered[position - 1].at : commit.at);
      totals[owner].minutes += Math.min(Math.max(0, commit.at - previous) / 60, GAP_CAP_MINUTES);
      totals[owner].commits += 1;
      lastByPlan.set(owner, commit.at);
    });
  }

  return plans.map((plan, index) => {
    const total = totals[index];
    if (total.commits >= MIN_COMMITS && total.minutes > 0) {
      return {
        ...plan,
        minutes: Math.max(1, Math.round(total.minutes)),
        approx: false,
        untimedReason: null,
        timing: 'commits' as const,
        commits: total.commits,
      };
    }
    return plan.minutes === null ? plan : { ...plan, approx: true, timing: 'summary' as const, commits: null };
  });
}
