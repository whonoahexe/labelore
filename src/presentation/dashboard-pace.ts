// Pace (quick-261018-4tb, sketch 026 P1): how long plans took, rebuilt from each plan's own
// SUMMARY.md duration. Pure — no node:* or React imports — so the server parses a duration with the
// same function the page uses to scope, total and chart the plans. The page maps `paceChart` to SVG
// and nothing else.
import type { PacePlanDto } from '../server/dashboard-ledger.ts';
import { activityDateLabel } from './dashboard-head.ts';

export interface ParsedDuration {
  /** Minutes of work, or null when the value says nothing usable. */
  minutes: number | null;
  /** True for "~35min", "about 2 hours" and "estimated ...". */
  approx: boolean;
  /** Why a plan counts as untimed, or null when it is timed. */
  untimedReason: string | null;
}

/** "~35min (a session)" gives 35, approximate; "1h 30m" gives 90; "7h 7m elapsed" is wall-clock
 * time, not work, so the plan is untimed; "recovered" and "0min" say nothing. */
export function parseDuration(raw: unknown): ParsedDuration {
  if (raw === null || raw === undefined) return { minutes: null, approx: false, untimedReason: 'no duration' };
  const text = String(raw).slice(0, 200).toLowerCase();
  if (/elapsed/.test(text)) return { minutes: null, approx: false, untimedReason: 'wall-clock time' };
  const hours = text.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\b/);
  const mins = text.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?\b/);
  const minutes = (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
  if ((!hours && !mins) || !minutes) return { minutes: null, approx: false, untimedReason: 'unreadable duration' };
  return { minutes, approx: /~|about|estimat/.test(text), untimedReason: null };
}

/** 18.6 gives "19 min", 60 gives "1h", 115 gives "1h 55m". */
export function formatMinutes(value: number): string {
  const rounded = Math.round(value);
  if (rounded < 60) return `${rounded} min`;
  const rest = rounded % 60;
  return `${Math.floor(rounded / 60)}h${rest ? ` ${rest}m` : ''}`;
}

const timedOf = (plans: PacePlanDto[]): PacePlanDto[] => plans.filter((plan) => (plan.minutes ?? 0) > 0);
const minutesOf = (plan: PacePlanDto): number => plan.minutes ?? 0;

export type PaceScopeKey = 'all' | string;

export interface PaceScope {
  /** Milestones that have a recorded plan, oldest first (numeric-aware). */
  milestones: string[];
  /** The current milestone once it has four timed plans, else everything. */
  defaultScope: PaceScopeKey;
}

export function paceScope(plans: PacePlanDto[], current: string | null): PaceScope {
  const milestones = [
    ...new Set(plans.map((plan) => plan.milestone).filter((value): value is string => value !== null)),
  ].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const currentTimed = current === null ? 0 : timedOf(plans.filter((plan) => plan.milestone === current)).length;
  return { milestones, defaultScope: current !== null && currentTimed >= 4 ? current : 'all' };
}

export function scopedPlans(plans: PacePlanDto[], scope: PaceScopeKey): PacePlanDto[] {
  return scope === 'all' ? plans : plans.filter((plan) => plan.milestone === scope);
}

export type TrendVerdict = 'faster' | 'steady' | 'slower';

export interface PaceTrend {
  /** How many plans each side holds. */
  w: number;
  recent: number;
  prior: number;
  change: number;
  verdict: TrendVerdict;
}

export interface PaceStats {
  plans: number;
  timed: number;
  untimed: number;
  approx: number;
  total: number;
  avg: number;
  median: number;
  perTask: number;
  trend: PaceTrend | null;
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length / 2;
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const perTaskMinutes = (plan: PacePlanDto): number => minutesOf(plan) / (plan.tasks || 1);

/** Totals over the timed plans, in finish order, and a trend: the median minutes a task of the last
 * w plans against the w before them. A median, so one long plan cannot flip the verdict, and only
 * with at least four plans on each side. */
export function paceStats(plans: PacePlanDto[]): PaceStats {
  const timed = timedOf(plans);
  const count = timed.length;
  const total = timed.reduce((sum, plan) => sum + minutesOf(plan), 0);
  const tasks = timed.reduce((sum, plan) => sum + (plan.tasks || 1), 0);
  const w = Math.min(8, Math.floor(count / 2));
  let trend: PaceTrend | null = null;
  if (w >= 4) {
    const recent = medianOf(timed.slice(-w).map(perTaskMinutes));
    const prior = medianOf(timed.slice(-2 * w, -w).map(perTaskMinutes));
    const change = (recent - prior) / prior;
    trend = {
      w,
      recent,
      prior,
      change,
      verdict: Math.abs(change) < 0.15 ? 'steady' : change < 0 ? 'faster' : 'slower',
    };
  }
  return {
    plans: plans.length,
    timed: count,
    untimed: plans.length - count,
    approx: timed.filter((plan) => plan.approx).length,
    total,
    avg: count ? total / count : 0,
    median: medianOf(timed.map(minutesOf)),
    perTask: total / Math.max(1, tasks),
    trend,
  };
}

export function trendSentence(trend: PaceTrend | null): string {
  if (!trend) return 'Too few timed plans to call a trend.';
  const against =
    trend.verdict === 'steady'
      ? 'about the same as'
      : trend.verdict === 'faster'
        ? `${Math.round(-trend.change * 100)}% less than`
        : `${Math.round(trend.change * 100)}% more than`;
  return `The last ${trend.w} plans took a median ${trend.recent.toFixed(1)} min a task, ${against} the ${trend.w} before (${trend.prior.toFixed(1)}).`;
}

export const TREND_LABEL: Record<TrendVerdict, string> = {
  faster: 'Getting faster',
  steady: 'Holding steady',
  slower: 'Slowing down',
};

// ---------- the dot timeline ----------

const WIDTH = 760;
const HEIGHT = 230;
const MARGIN = { left: 34, right: 8, top: 26, bottom: 22 };
const CAP_STEPS = [10, 20, 30, 40, 60, 90, 120, 180, 240, 360, 480];

const niceCap = (value: number): number =>
  CAP_STEPS.find((step) => step >= value) ?? Math.ceil(value / 60) * 60;

function p90(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] ?? 0;
}

export interface PaceBand {
  x: number;
  width: number;
  y: number;
  height: number;
  /** Every other band is shaded, starting with an unshaded one. */
  alt: boolean;
  /** "P01", or null when the band is too narrow to carry it. */
  label: string | null;
  labelX: number;
  labelY: number;
}

export interface PaceDot {
  id: string;
  x: number;
  y: number;
  approx: boolean;
  /** Above the cap: drawn at the top, with a caret. */
  over: boolean;
  /** The caret's path, for a dot above the cap. */
  caret: string | null;
  /** What hovering the dot names: the plan, its phase, time, tasks, date and milestone. */
  tip: string;
}

export interface PaceChart {
  width: number;
  height: number;
  cap: number;
  ticks: { value: number; label: string; y: number }[];
  left: number;
  right: number;
  bands: PaceBand[];
  /** The running median of 5, one value per plan. */
  medians: number[];
  /** The running median as a polyline path. */
  medianPath: string;
  dots: PaceDot[];
  anyOver: boolean;
}

/** The geometry of the timeline for the timed plans in finish order. The page only maps it to SVG. */
export function paceChart(plans: PacePlanDto[], readAt: string): PaceChart {
  const timed = timedOf(plans);
  const { left, right, top, bottom } = MARGIN;
  const minutes = timed.map(minutesOf);
  const cap = niceCap(Math.max(medianOf(minutes) * 3, p90(minutes)));
  const x = (index: number): number =>
    left + (timed.length === 1 ? (WIDTH - left - right) / 2 : (index / (timed.length - 1)) * (WIDTH - left - right));
  const y = (value: number): number => top + (1 - Math.min(value, cap) / cap) * (HEIGHT - top - bottom);

  // Consecutive runs of one phase (within a milestone) become the shaded bands.
  const runs: { key: string; phase: string; from: number; to: number }[] = [];
  timed.forEach((plan, index) => {
    const key = `${plan.milestone}/${plan.phase}`;
    const last = runs[runs.length - 1];
    if (last && last.key === key) last.to = index;
    else runs.push({ key, phase: plan.phase, from: index, to: index });
  });
  const bands = runs.map((run, index): PaceBand => {
    const x0 = index ? (x(run.from) + x(run.from - 1)) / 2 : left - 4;
    const x1 = run.to === timed.length - 1 ? WIDTH - right + 4 : (x(run.to) + x(run.to + 1)) / 2;
    return {
      x: x0,
      width: x1 - x0,
      y: top - 4,
      height: HEIGHT - top - bottom + 4,
      alt: index % 2 === 1,
      label: x1 - x0 > 26 ? `P${run.phase}` : null,
      labelX: (x0 + x1) / 2,
      labelY: top - 10,
    };
  });

  const medians = minutes.map((_, index) => {
    const window = minutes.slice(Math.max(0, index - 4), index + 1).sort((a, b) => a - b);
    return window[Math.floor(window.length / 2)];
  });
  const medianPath = medians
    .map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`)
    .join('');

  const dots = timed.map((plan, index): PaceDot => {
    const over = minutesOf(plan) > cap;
    const detail = [
      `${plan.approx ? '~' : ''}${formatMinutes(minutesOf(plan))}`,
      plan.tasks ? `${plan.tasks} ${plan.tasks === 1 ? 'task' : 'tasks'}` : null,
      activityDateLabel(plan.date, readAt),
      plan.milestone,
    ].filter(Boolean);
    return {
      id: plan.id,
      x: x(index),
      y: y(minutesOf(plan)),
      approx: plan.approx,
      over,
      caret: over ? `M${x(index) - 4},${y(cap) - 8}l4,-5l4,5` : null,
      tip: `${plan.id} · Phase ${plan.phase} ${plan.phaseName}\n${detail.join(' · ')}`,
    };
  });

  return {
    width: WIDTH,
    height: HEIGHT,
    cap,
    left,
    right: WIDTH - right,
    ticks: [0, cap / 2, cap].map((value) => ({
      value,
      label: value >= 60 ? formatMinutes(value) : String(value),
      y: y(value),
    })),
    bands,
    medians,
    medianPath,
    dots,
    anyOver: dots.some((dot) => dot.over),
  };
}
