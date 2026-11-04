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
import { SECURITY_KEY, concernEntries } from '../../presentation/codebase-map.ts';
import type {
  CodebaseHead,
  CodebaseHeadChip,
  CodebaseHeadStack,
  ConcernEntries,
  ConcernEntry,
  MapReadiness,
} from '../../presentation/codebase-map.ts';
import type { ViewInput } from './manifest.ts';

/** The three tones this page writes: nothing on it is a failed read. */
export type CodebaseTone = 'complete' | 'in-flight' | 'quiet';

export const FAST_MAP_TITLE =
  'A fast map covers stack, integrations, architecture and structure; project setup needs the complete one.';
export const PARTIAL_MAP_TITLE = 'Some of the four core documents are missing; the map is not complete.';
export const NOT_MAPPED = 'Not mapped';
/** The map-only head's words (UI-SPEC section 3): the eyebrow, then the one sentence under it. */
export const MAPPED_NOT_STARTED = 'Mapped, not started';
export const MAPPED_NOT_STARTED_LEAD = 'This project has a codebase map and no roadmap yet.';
/** The one quiet line under the command (UI-SPEC section 3): the page never runs anything. */
export const NEVER_RUNS_NOTE = 'Labelore does not run commands. Paste it in your terminal.';

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

/** A head concern row: the short label, with the document's own heading as its title. */
export interface ComposedHeadConcernRow extends ComposedConcernRow {
  title: string;
}

/** The "Mapped, not started" head of a map-only project (sketch 042 A): the words, the stack, the concern
 * counts. The date, commit and readiness stay in the facts line the head's rail already carries. */
export interface ComposedCodebaseHead {
  eyebrow: string;
  lead: string;
  stack: ComposedStackSet[];
  concerns: {
    total: number;
    noun: 'concern' | 'concerns';
    counts: ComposedHeadConcernRow[];
  } | null;
  /** GSD's next step: one of four constant commands, the reason line, and the never-runs note. */
  next: { command: string; reason: string; note: string };
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
  /** The map-only head, or null for a project with a roadmap. */
  head: ComposedCodebaseHead | null;
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

function concernTone(entry: ConcernEntry): ComposedConcernRow['tone'] {
  if (entry.count === 0) return 'quiet';
  return entry.key === SECURITY_KEY ? 'in-flight' : null;
}

function liftConcerns(codebase: Record<string, unknown>): ComposedCodebaseLifted | null {
  const found = concernEntries(codebase.concerns);
  if (found === null) return null;
  const { total } = found;
  return {
    kind: 'concerns',
    total,
    noun: total === 1 ? 'concern' : 'concerns',
    totalText: `${total} ${total === 1 ? 'concern' : 'concerns'}`,
    counts: found.entries.map((entry) => ({ label: entry.heading, count: entry.count, tone: concernTone(entry) })),
  };
}

// --- the map-only head ------------------------------------------------------------------------------------

/** The head's concern labels are short (sketch 042 winner A, open point 1); the panel keeps the document's own
 * headings. A section the table does not know keeps its heading as written. */
const HEAD_CONCERN_LABELS: ReadonlyMap<string, string> = new Map([
  ['tech-debt', 'Tech debt'],
  ['known-bugs', 'Known bugs'],
  [SECURITY_KEY, 'Security'],
  ['performance-bottlenecks', 'Performance'],
  ['fragile-areas', 'Fragile areas'],
  ['scaling-limits', 'Scaling limits'],
  ['dependencies-at-risk', 'Dependencies at risk'],
  ['missing-critical-features', 'Missing features'],
  ['test-coverage-gaps', 'Test coverage gaps'],
]);

/** How many chips of each kind the head keeps: it is a glance, the Stack panel holds them all. */
const HEAD_LANGUAGES = 4;
const HEAD_RUNTIME = 3;
const HEAD_FRAMEWORKS: readonly (readonly [group: string, keep: number])[] = [
  ['core', 3],
  ['testing', 1],
  ['build-dev', 1],
];

function headChips(chips: readonly CodebaseHeadChip[]): ComposedStackChip[] {
  return chips.map((chip) => ({ name: chip.name, version: chip.version }));
}

function headStack(stack: CodebaseHeadStack | null): ComposedStackSet[] {
  if (stack === null) return [];
  const sets: ComposedStackSet[] = [
    { label: 'Languages', chips: headChips(stack.languages.slice(0, HEAD_LANGUAGES)) },
    { label: 'Runtime', chips: headChips(stack.runtime.slice(0, HEAD_RUNTIME)) },
    {
      label: 'Frameworks',
      chips: headChips(
        HEAD_FRAMEWORKS.flatMap(([group, keep]) => stack.frameworks.filter((chip) => chip.group === group).slice(0, keep)),
      ),
    },
  ];
  return sets.filter((set) => set.chips.length > 0);
}

function headConcerns(concerns: ConcernEntries | null): ComposedCodebaseHead['concerns'] {
  if (concerns === null) return null;
  const { total } = concerns;
  return {
    total,
    noun: total === 1 ? 'concern' : 'concerns',
    counts: concerns.entries.map((entry) => ({
      label: (entry.key === null ? undefined : HEAD_CONCERN_LABELS.get(entry.key)) ?? entry.heading,
      title: entry.heading,
      count: entry.count,
      tone: concernTone(entry),
    })),
  };
}

function composeHead(head: CodebaseHead | null | undefined): ComposedCodebaseHead | null {
  if (!head) return null;
  return {
    eyebrow: MAPPED_NOT_STARTED,
    lead: MAPPED_NOT_STARTED_LEAD,
    stack: headStack(head.stack),
    concerns: headConcerns(head.concerns),
    next: { command: head.nextStep.command, reason: head.nextStep.reason, note: NEVER_RUNS_NOTE },
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
    head: composeHead(context.head),
  };
}
