// The landing row's last-opened time (D-03): 'Opened 3 hours ago', 'Opened yesterday', or 'Not opened
// yet'. A pure formatter with the clock passed in, so a render stays pure and a test pins every edge.
// Modelled on formatRelativeReadAt (src/presentation/shell-header.ts), but worded by
// Intl.RelativeTimeFormat as 08-UI-SPEC section 2 asks.

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Largest first. A month is 30 days and a year 365: a row only needs "about how long ago". */
const UNITS: ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 365 * DAY },
  { unit: 'month', seconds: 30 * DAY },
  { unit: 'week', seconds: 7 * DAY },
  { unit: 'day', seconds: DAY },
  { unit: 'hour', seconds: HOUR },
  { unit: 'minute', seconds: MINUTE },
  { unit: 'second', seconds: 1 },
];

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** 'Opened {relative time}' for a time the project was last opened, 'Not opened yet' for null (or an
 * unreadable time). The largest unit whose magnitude is at least one is used, truncated toward zero
 * ("3 hours 59 minutes ago" reads "3 hours ago"); a time in the future reads as now. */
export function formatOpenedAgo(iso: string | null, now: number): string {
  if (iso === null) return 'Not opened yet';
  const opened = Date.parse(iso);
  if (Number.isNaN(opened)) return 'Not opened yet';
  const elapsed = Math.max(0, Math.floor((now - opened) / 1000));
  const step = UNITS.find((candidate) => elapsed >= candidate.seconds);
  if (step === undefined) return `Opened ${formatter.format(0, 'second')}`;
  return `Opened ${formatter.format(-Math.trunc(elapsed / step.seconds), step.unit)}`;
}

/** The absolute date, for the row's `title`; empty when the project was never opened. */
export function openedTitle(iso: string | null): string {
  if (iso === null) return '';
  const opened = new Date(iso);
  return Number.isNaN(opened.valueOf()) ? '' : opened.toLocaleString();
}
