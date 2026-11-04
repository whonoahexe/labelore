// The Codebase page composer (Phase 10, 10-08, VIEW-13, sketch 042 winner A): a pure `ViewInput` ->
// `ComposedCodebase` merge of the server's `codebaseContext` (which of the seven map documents exist, where
// each opens, GSD's readiness, the stamp) and the opened document's own `structured.codebase` and section
// groups. All seven documents open this same page on a different panel; the address picks the panel.
//
// The facts line follows GSD's readiness rule exactly and states no freshness: the commit is text only. A
// document the folder lacks is a ghost entry (no address, never hidden). The active panel shows its lifted part
// first (Stack chips, Concerns counts) and every section the page has no designed form for below it, as plain
// readable sections in document order, so nothing in a document is dropped and a document with no recognised
// heading is the plain rendering in full. A panel plan that draws a designed form for a section marks it
// consumed here; until then it stays in the plain list.
//
// No DOM, no filesystem access, no rendering, no regular expression and no module-level state (the tables
// below are frozen constants): two codebase pages composed alternately each compose only from their own
// input. Returns `null` when the context or the projection is missing, so the page keeps the promoted-section
// view without any notice (RESEARCH C1).
import type { MapReadiness } from '../../presentation/codebase-map.ts';
import type { ViewInput } from './manifest.ts';

/** The three tones this page writes: nothing on it is a failed read. */
export type CodebaseTone = 'complete' | 'in-flight' | 'quiet';

export const FAST_MAP_TITLE =
  'A fast map covers stack, integrations, architecture and structure; project setup needs the complete one.';
export const PARTIAL_MAP_TITLE = 'Some of the four core documents are missing; the map is not complete.';
export const NOT_MAPPED = 'Not mapped';

export interface ComposedCodebaseReadiness {
  key: MapReadiness;
  label: 'Complete map' | 'Fast map' | 'Partial map';
  tone: 'complete' | 'in-flight';
  title: string | null;
}

export interface ComposedCodebaseFacts {
  /** "4 of 7 documents mapped". */
  countText: string;
  readiness: ComposedCodebaseReadiness;
  /** "Mapped Oct 30, 2026", or null when no document carries a stamp. */
  mappedText: string | null;
  /** "Commit c4e91ab", or null when the newest document names none. */
  commitText: string | null;
}

export interface ComposedCodebasePanel {
  key: string;
  label: string;
  /** "01" to "07". */
  no: string;
  /** The in-app address, or null for a document the folder lacks. */
  url: string | null;
  /** True for a document the folder lacks: a "Not mapped" entry that is not a link. */
  ghost: boolean;
  /** True for the panel the address names. */
  current: boolean;
  /** The entry's key number as text, or null when the lift set none. */
  keyText: string | null;
}

export interface ComposedStackChip {
  name: string;
  version: string | null;
}

export interface ComposedStackSet {
  label: string;
  chips: ComposedStackChip[];
}

export interface ComposedStackGroup {
  label: 'Languages' | 'Runtime' | 'Frameworks';
  sets: ComposedStackSet[];
}

export interface ComposedConcernRow {
  label: string;
  count: number;
  /** `in-flight` for Security above zero, `quiet` (a dashed square) for a zero, null for a plain neutral count. */
  tone: 'in-flight' | 'quiet' | null;
}

export type ComposedCodebaseLifted =
  | { kind: 'stack'; groups: ComposedStackGroup[] }
  | { kind: 'concerns'; total: number; noun: 'concern' | 'concerns'; totalText: string; counts: ComposedConcernRow[] };

export interface ComposedCodebasePlain {
  /** The section's `id`, so an in-document anchor keeps working. */
  id: string | null;
  /** The section's heading, or null for the text before the first heading. */
  heading: string | null;
  /** The section's rendered HTML (the server-sanitised document), heading included. */
  html: string;
}

export interface ComposedCodebaseActive {
  key: string;
  label: string;
  no: string;
  /** "30 concerns" / "1 concern", or null when the lift set no key number. */
  keyPhrase: string | null;
  lifted: ComposedCodebaseLifted | null;
  /** Every section the page has no designed form for, in document order. */
  plain: ComposedCodebasePlain[];
  /** The headings of `plain`, in the same order (a section with no heading has none). */
  plainSections: string[];
}

export interface ComposedCodebase {
  facts: ComposedCodebaseFacts;
  panels: ComposedCodebasePanel[];
  active: ComposedCodebaseActive;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordsOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

const MONTHS: readonly string[] = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);

/** A stamp day (YYYY-MM-DD) as "Oct 30, 2026"; anything else is shown as written. */
function formatDay(day: string): string {
  const parts = day.split('-');
  if (parts.length !== 3) return day;
  const month = Number(parts[1]);
  const date = Number(parts[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(date) || date < 1) return day;
  return `${MONTHS[month - 1]} ${date}, ${parts[0]}`;
}

function readinessOf(key: MapReadiness): ComposedCodebaseReadiness {
  if (key === 'complete') return { key, label: 'Complete map', tone: 'complete', title: null };
  if (key === 'fast') return { key, label: 'Fast map', tone: 'in-flight', title: FAST_MAP_TITLE };
  return { key, label: 'Partial map', tone: 'in-flight', title: PARTIAL_MAP_TITLE };
}

/** What a panel's key number counts, singular then plural (UI-SPEC section 2). Testing's key is a framework
 * name, not a count, so it has none. */
const UNITS: ReadonlyMap<string, readonly [string, string]> = new Map([
  ['stack', ['tool', 'tools']],
  ['architecture', ['component', 'components']],
  ['structure', ['directory', 'directories']],
  ['conventions', ['rule group', 'rule groups']],
  ['integrations', ['service', 'services']],
  ['concerns', ['concern', 'concerns']],
]);

function keyPhrase(key: string, count: number): string {
  const unit = UNITS.get(key);
  if (unit === undefined) return String(count);
  return `${count} ${count === 1 ? unit[0] : unit[1]}`;
}

// --- the Stack lift ---------------------------------------------------------------------------------------

function chipsOf(value: unknown, group: string): ComposedStackChip[] {
  return recordsOf(value)
    .filter((chip) => chip.group === group)
    .flatMap((chip) => {
      const name = textOrNull(chip.name);
      return name === null ? [] : [{ name, version: textOrNull(chip.version) }];
    });
}

function stackGroup(
  label: ComposedStackGroup['label'],
  list: unknown,
  sets: readonly (readonly [label: string, group: string])[],
): ComposedStackGroup | null {
  const composed = sets
    .map(([setLabel, group]) => ({ label: setLabel, chips: chipsOf(list, group) }))
    .filter((set) => set.chips.length > 0);
  return composed.length > 0 ? { label, sets: composed } : null;
}

function liftStack(codebase: Record<string, unknown>): ComposedCodebaseLifted | null {
  const stack = isRecord(codebase.stack) ? codebase.stack : null;
  if (stack === null) return null;
  const groups = [
    stackGroup('Languages', stack.languages, [
      ['Primary', 'primary'],
      ['Secondary', 'secondary'],
    ]),
    stackGroup('Runtime', stack.runtime, [['Environment', 'runtime']]),
    stackGroup('Frameworks', stack.frameworks, [
      ['Core', 'core'],
      ['Testing', 'testing'],
      ['Build and dev', 'build-dev'],
    ]),
  ].filter((group): group is ComposedStackGroup => group !== null);
  return groups.length > 0 ? { kind: 'stack', groups } : null;
}

// --- the Concerns lift ------------------------------------------------------------------------------------

const SECURITY_KEY = 'security-considerations';

/** The template heading of each known concern section, for a section the document lacks (shown as 0). */
const CONCERN_LABELS: ReadonlyMap<string, string> = new Map([
  ['tech-debt', 'Tech Debt'],
  ['known-bugs', 'Known Bugs'],
  [SECURITY_KEY, 'Security Considerations'],
  ['performance-bottlenecks', 'Performance Bottlenecks'],
  ['fragile-areas', 'Fragile Areas'],
  ['scaling-limits', 'Scaling Limits'],
  ['dependencies-at-risk', 'Dependencies at Risk'],
  ['missing-critical-features', 'Missing Critical Features'],
  ['test-coverage-gaps', 'Test Coverage Gaps'],
]);

interface ConcernEntry {
  key: string | null;
  label: string;
  count: number;
}

function liftConcerns(codebase: Record<string, unknown>): ComposedCodebaseLifted | null {
  const concerns = isRecord(codebase.concerns) ? codebase.concerns : null;
  if (concerns === null) return null;
  const entries: ConcernEntry[] = recordsOf(concerns.sections).flatMap((section) => {
    const label = textOrNull(section.heading);
    const count = section.count;
    if (label === null || typeof count !== 'number' || !Number.isFinite(count) || count < 0) return [];
    return [{ key: typeof section.key === 'string' ? section.key : null, label, count }];
  });
  const seen = new Set(entries.map((entry) => entry.key));
  const missing = Array.isArray(concerns.missing) ? concerns.missing : [];
  for (const key of missing) {
    if (typeof key !== 'string' || seen.has(key)) continue;
    const label = CONCERN_LABELS.get(key);
    if (label !== undefined) entries.push({ key, label, count: 0 });
  }
  if (entries.length === 0) return null;
  // Security first, then the rest in document order.
  const ordered = [...entries.filter((entry) => entry.key === SECURITY_KEY), ...entries.filter((entry) => entry.key !== SECURITY_KEY)];
  const sum = entries.reduce((total, entry) => total + entry.count, 0);
  const total = typeof concerns.total === 'number' && Number.isFinite(concerns.total) ? concerns.total : sum;
  return {
    kind: 'concerns',
    total,
    noun: total === 1 ? 'concern' : 'concerns',
    totalText: `${total} ${total === 1 ? 'concern' : 'concerns'}`,
    counts: ordered.map((entry) => ({
      label: entry.label,
      count: entry.count,
      tone: entry.count === 0 ? 'quiet' : entry.key === SECURITY_KEY ? 'in-flight' : null,
    })),
  };
}

function liftOf(key: string, codebase: Record<string, unknown>): ComposedCodebaseLifted | null {
  if (key === 'stack') return liftStack(codebase);
  if (key === 'concerns') return liftConcerns(codebase);
  return null;
}

export function composeCodebase(input: ViewInput): ComposedCodebase | null {
  const context = input.codebaseContext;
  const codebase = input.structured.codebase;
  if (!context || !Array.isArray(context.panels) || !isRecord(codebase)) return null;
  const currentIndex = context.panels.findIndex((panel) => panel.key === context.activeKey);
  if (currentIndex < 0) return null;
  const current = context.panels[currentIndex];

  const panels: ComposedCodebasePanel[] = context.panels.map((panel, index) => ({
    key: panel.key,
    label: panel.label,
    no: String(index + 1).padStart(2, '0'),
    url: panel.mapped ? panel.url : null,
    ghost: !panel.mapped,
    current: panel.key === context.activeKey,
    keyText: panel.mapped && typeof panel.keyNumber === 'number' ? String(panel.keyNumber) : null,
  }));

  const plain: ComposedCodebasePlain[] = input.groups
    .filter((group) => group.html.trim() !== '')
    .map((group) => ({ id: group.id, heading: group.heading, html: group.html }));

  return {
    facts: {
      countText: `${context.mappedCount} of 7 documents mapped`,
      readiness: readinessOf(context.readiness),
      mappedText: context.mappedAt !== null ? `Mapped ${formatDay(context.mappedAt)}` : null,
      commitText: context.commit !== null ? `Commit ${context.commit}` : null,
    },
    panels,
    active: {
      key: current.key,
      label: current.label,
      no: panels[currentIndex].no,
      keyPhrase: typeof current.keyNumber === 'number' ? keyPhrase(current.key, current.keyNumber) : null,
      lifted: liftOf(current.key, codebase),
      plain,
      plainSections: plain.flatMap((section) => (section.heading === null ? [] : [section.heading])),
    },
  };
}
