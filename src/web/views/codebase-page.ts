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
import { SECURITY_KEY, concernEntries, concernSections } from '../../presentation/codebase-map.ts';
import type {
  CodebaseHead,
  CodebaseHeadChip,
  CodebaseHeadStack,
  ConcernEntries,
  ConcernEntry,
  MapReadiness,
} from '../../presentation/codebase-map.ts';
import type { SwapItem } from '../../presentation/project-research-panels.ts';
import type { DiagramEdge, DiagramGraph, DiagramKind, DiagramNode } from '../../rendering/ascii-graph.ts';
import { stripLeadingHeading } from './document-sections.ts';
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
  /** A Key Dependencies chip's purpose line, shown as its title (10-14). */
  purpose?: string;
  /** The Integrations groups that name this tool (the cross-read, D-01); the chip carries a link to that panel. */
  xref?: string[];
}

export interface ComposedStackSet {
  label: string;
  chips: ComposedStackChip[];
  /** True for the "Not present" set: its chips are dashed ghosts, packages the document says are absent (10-14). */
  ghost?: true;
  /** Lifted sentences left out of the chips (a bullet that is prose, not a tool); they stay in the sections below. */
  notes?: number;
}

export interface ComposedStackGroup {
  label: 'Languages' | 'Runtime' | 'Frameworks' | 'Key Dependencies';
  sets: ComposedStackSet[];
}

/** The Stack panel's chips (10-14, sketch 045 C): the shipped chip groups plus Key Dependencies in the same chip set. */
export interface ComposedStack {
  kind: 'stack';
  groups: ComposedStackGroup[];
  /** Languages and frameworks (the key number, notes included), and the key dependencies. */
  toolCount: number;
  dependencyCount: number;
  /** The Integrations panel's address for the cross-read links, or null when it is not mapped. */
  integrationsUrl: string | null;
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

/** The Architecture panel's lifted parts (10-12, sketch 043 reuse): the System Overview fence for the shipped
 * figure, and the Anti-Patterns as the shipped swap rows (what happens and why it is wrong open under each). */
export interface ComposedArchitecture {
  kind: 'architecture';
  diagram: { info: string; text: string } | null;
  swaps: SwapItem[];
}

/** The Structure panel's designed part (10-12): the Directory Layout fence for the shipped clean tree. */
export interface ComposedStructure {
  kind: 'structure';
  tree: { info: string; text: string };
}

/** One concern for the risk piles (10-12, sketch 044 E): a mark in its section's pile, and, opened, its title over its
 * fields. `priority` tints the mark when the concern states High, Medium or Low. */
export interface ComposedConcern {
  /** "{section}:{item}", the position in the panel's order, which the mark and the dock share. */
  id: string;
  title: string;
  fields: { label: string | null; text: string }[];
  /** The first field's text, the line shown before "Read more"; null for a concern with no field. */
  gist: string | null;
  priority: 'high' | 'med' | 'low' | '';
}

export interface ComposedConcernSection {
  key: string | null;
  /** The short label under the pile ("Tech debt"); the document's own heading when the template does not know it. */
  label: string;
  heading: string;
  count: number;
  /** Security `in-flight` above zero and `complete` at zero; every other section untoned, a zero `quiet`. */
  tone: 'in-flight' | 'complete' | 'quiet' | null;
  items: ComposedConcern[];
  /** How many concerns the section counts that the lift did not keep (its per-section cap). */
  omitted: number;
  /** The section's own rendered text when it counts zero but says something ("None identified."), else null. */
  fallbackHtml: string | null;
}

export interface ComposedConcerns {
  kind: 'concerns';
  total: number;
  noun: 'concern' | 'concerns';
  totalText: string;
  /** The per-section counts the head also reads. */
  counts: ComposedConcernRow[];
  /** The text before the first heading, as rendered html, or null. */
  intro: string | null;
  /** Security first, the rest in document order, each known section the document lacks as a zero. */
  sections: ComposedConcernSection[];
  /** The id of the first Security concern, else the first Tech Debt concern: the mark that carries the ring. */
  top: string | null;
}

export type ComposedCodebaseLifted =
  | ComposedStack
  | ComposedIntegrations
  | ComposedArchitecture
  | ComposedStructure
  | ComposedConcerns;

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

/** The number's words: the panel's usual unit, or a layer when the lift counted layers (Architecture without a
 * component table). */
function keyPhrase(key: string, count: number, keyUnit?: unknown): string {
  if (key === 'architecture' && keyUnit === 'layer') return `${count} ${count === 1 ? 'layer' : 'layers'}`;
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

/** The longest chip name the Stack panel keeps (sketch 045): a longer lifted bullet is a sentence, not a tool. */
const PANEL_CHIP_NAME_MAX = 32;

/** A lifted chip as the panel draws it, or null when it is a sentence: a long name whose second word starts like a
 * version ("Node.js >=22.18.0 (engines in package.json)") is a name and a version, any other long name is a note. */
function panelChip(chip: ComposedStackChip): ComposedStackChip | null {
  if (chip.name.length <= PANEL_CHIP_NAME_MAX) return chip;
  if (chip.version !== null) return null;
  const [name, version] = chip.name.split(' ');
  if (name === undefined || version === undefined || name.length > PANEL_CHIP_NAME_MAX || !startsLikeVersion(version)) {
    return null;
  }
  return { name, version };
}

function stackGroup(
  label: ComposedStackGroup['label'],
  list: unknown,
  sets: readonly (readonly [label: string, group: string])[],
): ComposedStackGroup | null {
  const composed = sets
    .map(([setLabel, group]): ComposedStackSet => {
      const lifted = chipsOf(list, group);
      const kept = lifted.flatMap((chip) => {
        const chosen = panelChip(chip);
        return chosen === null ? [] : [chosen];
      });
      return kept.length === lifted.length
        ? { label: setLabel, chips: kept }
        : { label: setLabel, chips: kept, notes: lifted.length - kept.length };
    })
    .filter((set) => set.chips.length > 0 || (set.notes ?? 0) > 0);
  return composed.length > 0 ? { label, sets: composed } : null;
}

/** The Key Dependencies as chip sets, one per bold label, then the "Not present" names as ghosts. */
function dependencyGroup(stack: Record<string, unknown>): ComposedStackGroup | null {
  const sets: ComposedStackSet[] = recordsOf(stack.keyDependencies).flatMap((set) => {
    const label = textOrNull(set.label);
    const chips = recordsOf(set.deps).flatMap((dep): ComposedStackChip[] => {
      const name = textOrNull(dep.name);
      if (name === null) return [];
      const purpose = textOrNull(dep.purpose);
      return [purpose === null ? { name, version: textOrNull(dep.version) } : { name, version: textOrNull(dep.version), purpose }];
    });
    return label === null || chips.length === 0 ? [] : [{ label, chips }];
  });
  const absent = (Array.isArray(stack.notPresent) ? stack.notPresent : []).flatMap((name) => {
    const text = textOrNull(name);
    return text === null ? [] : [{ name: text, version: null }];
  });
  if (absent.length > 0) sets.push({ label: 'Not present', chips: absent, ghost: true });
  return sets.length > 0 ? { label: 'Key Dependencies', sets } : null;
}

function liftStack(
  codebase: Record<string, unknown>,
  urls: ReadonlyMap<string, string>,
  context: ViewInput['codebaseContext'],
): ComposedStack | null {
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
    dependencyGroup(stack),
  ].filter((group): group is ComposedStackGroup => group !== null);
  if (groups.length === 0) return null;
  const integrationsUrl = urls.get('INTEGRATIONS.md') ?? null;
  const texts = crossOf(context).integrations.map((group) => ({ label: group.label, text: crossText(group.text) }));
  if (integrationsUrl !== null && texts.length > 0) {
    for (const group of groups) {
      for (const set of group.sets) {
        if (set.ghost === true) continue;
        for (const chip of set.chips) {
          const labels = texts.filter((entry) => mentions(entry.text, chip.name)).map((entry) => withoutParenthetical(entry.label));
          if (labels.length > 0) chip.xref = labels.slice(0, 4);
        }
      }
    }
  }
  const count = (label: ComposedStackGroup['label']): number =>
    groups
      .filter((group) => group.label === label)
      .reduce(
        (sum, group) => sum + group.sets.filter((set) => set.ghost !== true).reduce((n, set) => n + set.chips.length + (set.notes ?? 0), 0),
        0,
      );
  return {
    kind: 'stack',
    groups,
    toolCount: count('Languages') + count('Frameworks'),
    dependencyCount: count('Key Dependencies'),
    integrationsUrl,
  };
}

// --- the Integrations lift (10-14, sketch 045 winner C) ---------------------------------------------------------

export interface ComposedVariable {
  name: string;
  /** True when the document writes a value beside the name: the page shows the quiet "Value not shown" mark. */
  hadValue: boolean;
  kind: 'required' | 'conditional' | 'optional' | 'named';
}

export interface ComposedQuietGroup {
  label: string;
  /** The group's own first line, or null for a known section the document lacks. */
  title: string | null;
}

/** The Integrations panel (sketch 045 C): the shipped lane diagram given a graph built from the groups in use, the
 * groups that say None as quiet chips, the variable names as tags with their values withheld. */
export interface ComposedIntegrations {
  kind: 'integrations';
  /** The app wired to one node per group in use; null when nothing is in use. */
  graph: DiagramGraph | null;
  inUse: number;
  quiet: ComposedQuietGroup[];
  variables: ComposedVariable[];
  /** The Environment Configuration section's own words, with every value removed, when the panel draws that section
   * itself (it holds only lines and names); null when it stays a plain section. */
  environment: { heading: string; groups: { label: string; lines: string[] }[] } | null;
  /** Groups that name a tool the Stack panel lists, with those tool names. */
  alsoInStack: { group: string; names: string[] }[];
  /** The Stack panel's address, or null when the document is not mapped. */
  stackUrl: string | null;
}

/** The lane each known section's groups sit in (sketch 045 C). A section the template does not have sits with the app. */
const SECTION_LANES: ReadonlyMap<string, DiagramKind> = new Map([
  ['external-services', 'external'],
  ['data-storage', 'data'],
  ['authentication', 'edge'],
  ['monitoring', 'channel'],
  ['ci-cd', 'worker'],
  ['webhooks', 'channel'],
]);

const SECTION_SHORT: ReadonlyMap<string, string> = new Map([
  ['external-services', 'External services'],
  ['data-storage', 'Data storage'],
  ['authentication', 'Authentication'],
  ['monitoring', 'Monitoring'],
  ['ci-cd', 'CI/CD'],
  ['environment-configuration', 'Environment'],
  ['webhooks', 'Webhooks'],
]);

/** The longest wire label (the lane layout's own cap). */
const WIRE_LABEL_CAP = 24;
const NODE_LABEL_CAP = 40;

function withoutParenthetical(label: string): string {
  const open = label.indexOf(' (');
  return (open > 0 ? label.slice(0, open) : label).trim();
}

/** The first backticked name in `text` that is not a variable (a client or tool name), or null. */
function firstToolName(text: string): string | null {
  let from = 0;
  for (;;) {
    const open = text.indexOf('`', from);
    if (open < 0) return null;
    const close = text.indexOf('`', open + 1);
    if (close < 0) return null;
    const span = text.slice(open + 1, close).trim();
    from = close + 1;
    if (span.length === 0 || span.includes('/') || span === span.toUpperCase()) continue;
    return span;
  }
}

interface LiftedGroup {
  section: string | null;
  label: string;
  inUse: boolean;
  firstLine: string;
  sdk: string | null;
  lines: string[];
}

function groupsOfIntegrations(integrations: Record<string, unknown>): LiftedGroup[] {
  return recordsOf(integrations.groups).flatMap((group): LiftedGroup[] => {
    const label = textOrNull(group.label);
    if (label === null) return [];
    const lines = (Array.isArray(group.lines) ? group.lines : []).filter((line): line is string => typeof line === 'string');
    const first = recordsOf(group.rows)[0];
    return [
      {
        section: typeof group.section === 'string' ? group.section : null,
        label,
        inUse: group.inUse === true,
        firstLine: typeof group.firstLine === 'string' ? group.firstLine : '',
        sdk: first === undefined ? null : textOrNull(first.sdk),
        lines,
      },
    ];
  });
}

/** The app in the service lane, wired to one node per group in use. The kind comes from the group's section, not from
 * the shared keyword classifier (which was written for Research diagrams). The app is the first layer and every group
 * the second, so the lanes draw as a fan out of the app. */
function integrationsGraph(groups: readonly LiftedGroup[]): DiagramGraph | null {
  const live = groups.filter((group) => group.inUse);
  if (live.length === 0) return null;
  const nodes: DiagramNode[] = [
    {
      id: 0,
      kind: 'service',
      label: { main: 'This app', sub: 'the codebase', code: false, full: 'This app' },
      details: [],
      notes: [],
      group: null,
      row: 0,
      col: 0,
    },
  ];
  const edges: DiagramEdge[] = [];
  live.forEach((group, index) => {
    const id = index + 1;
    const main = withoutParenthetical(group.label).slice(0, NODE_LABEL_CAP);
    const sub = firstToolName(group.lines.join(' ')) ?? (group.section === null ? '' : (SECTION_SHORT.get(group.section) ?? ''));
    nodes.push({
      id,
      kind: group.section === null ? 'service' : (SECTION_LANES.get(group.section) ?? 'service'),
      label: { main, sub, code: false, full: group.firstLine === '' ? group.label : group.firstLine },
      details: group.lines,
      notes: [],
      group: null,
      row: 2,
      col: index,
    });
    const wire = group.sdk === null ? null : firstToolName(group.sdk);
    edges.push({ from: 0, to: id, label: wire === null ? '' : wire.slice(0, WIRE_LABEL_CAP), directed: true, implied: false });
  });
  return { nodes, edges, groups: [], quality: 1, dangling: 0, thin: false };
}

/** A line of prose as the cross-read compares it: lower-cased, a code span that is a path or a file name left out, the
 * ticks of the others dropped. A character scan. */
function crossText(text: string): string {
  let out = '';
  let from = 0;
  for (;;) {
    const open = text.indexOf('`', from);
    const close = open < 0 ? -1 : text.indexOf('`', open + 1);
    if (open < 0 || close < 0) {
      out += text.slice(from);
      break;
    }
    out += text.slice(from, open);
    const span = text.slice(open + 1, close);
    const dot = span.lastIndexOf('.');
    const fileLike = dot > 0 && span.length - dot - 1 <= 5 && span.length - dot - 1 >= 1 && !span.includes(' ');
    out += span.includes('/') || fileLike ? ' ' : ` ${span} `;
    from = close + 1;
  }
  return out.toLowerCase();
}

function isNameChar(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '-');
}

/** True when `name` (one word, three characters or more) appears in the prepared `haystack` on word edges. */
function mentions(haystack: string, name: string): boolean {
  const word = (name.startsWith('@') ? name.slice(1) : name).toLowerCase();
  if (word.length < 3 || word.includes(' ')) return false;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(word, from);
    if (at < 0) return false;
    if (!isNameChar(haystack[at - 1]) && !isNameChar(haystack[at + word.length])) return true;
    from = at + 1;
  }
}

function crossOf(context: ViewInput['codebaseContext']): { stackNames: string[]; integrations: { label: string; text: string }[] } {
  const cross = context?.cross;
  return { stackNames: cross?.stackNames ?? [], integrations: cross?.integrations ?? [] };
}

function liftIntegrations(
  codebase: Record<string, unknown>,
  urls: ReadonlyMap<string, string>,
  context: ViewInput['codebaseContext'],
): ComposedIntegrations | null {
  const integrations = isRecord(codebase.integrations) ? codebase.integrations : null;
  if (integrations === null) return null;
  const groups = groupsOfIntegrations(integrations);
  const variables = recordsOf(integrations.variables).flatMap((variable): ComposedVariable[] => {
    const name = textOrNull(variable.name);
    if (name === null) return [];
    const kind = variable.kind === 'required' || variable.kind === 'conditional' || variable.kind === 'optional' ? variable.kind : 'named';
    return [{ name, hadValue: variable.hadValue === true, kind }];
  });
  const lifted = isRecord(integrations.environment) ? integrations.environment : null;
  const environment =
    lifted !== null && lifted.whole === true
      ? {
          heading: textOrNull(lifted.heading) ?? 'Environment Configuration',
          groups: recordsOf(lifted.groups).flatMap((group) => {
            const lines = (Array.isArray(group.lines) ? group.lines : []).filter((line): line is string => typeof line === 'string');
            return lines.length === 0 ? [] : [{ label: textOrNull(group.label) ?? '', lines }];
          }),
        }
      : null;
  if (groups.length === 0 && variables.length === 0 && environment === null) return null;

  const quiet: ComposedQuietGroup[] = groups
    .filter((group) => !group.inUse)
    .map((group) => ({
      label: `${group.section === null ? group.label : `${SECTION_SHORT.get(group.section) ?? group.label} · ${group.label}`}`,
      title: group.firstLine === '' ? null : group.firstLine,
    }));
  for (const key of Array.isArray(integrations.missing) ? integrations.missing : []) {
    const short = typeof key === 'string' ? SECTION_SHORT.get(key) : undefined;
    if (short !== undefined) quiet.push({ label: `${short} · not in this document`, title: null });
  }

  const { stackNames } = crossOf(context);
  const alsoInStack = groups.flatMap((group) => {
    if (!group.inUse) return [];
    const text = crossText(group.lines.join(' '));
    const names = stackNames.filter((name) => mentions(text, name)).slice(0, 6);
    return names.length === 0 ? [] : [{ group: withoutParenthetical(group.label), names }];
  });

  return {
    kind: 'integrations',
    graph: integrationsGraph(groups),
    inUse: groups.filter((group) => group.inUse).length,
    quiet,
    variables,
    environment,
    alsoInStack,
    stackUrl: urls.get('STACK.md') ?? null,
  };
}

// --- the Concerns lift ------------------------------------------------------------------------------------

function concernTone(entry: ConcernEntry): ComposedConcernRow['tone'] {
  if (entry.count === 0) return 'quiet';
  return entry.key === SECURITY_KEY ? 'in-flight' : null;
}

// --- the Concerns panel's concerns (10-12) ---------------------------------------------------------------

const FIELD_LABEL_MAX = 40;
const FIELD_LABEL_WORDS = 5;

function isBulletLine(text: string): boolean {
  return (text[0] === '-' || text[0] === '*' || text[0] === '+') && text[1] === ' ';
}

function stripStars(text: string): string {
  let from = 0;
  while (from < text.length && (text[from] === '*' || text[from] === ' ')) from += 1;
  return text.slice(from);
}

/** `Label: value` (a bold label and backticks tolerated), or null when the text does not start with a short label. */
function splitField(text: string): { label: string; text: string } | null {
  const colon = text.indexOf(':');
  if (colon < 1 || colon > FIELD_LABEL_MAX) return null;
  const label = text.slice(0, colon).replaceAll('*', '').replaceAll('`', '').trim();
  if (label === '' || label.split(' ').length > FIELD_LABEL_WORDS) return null;
  return { label, text: stripStars(text.slice(colon + 1)).trim() };
}

/** A concern's lines as fields: each top-level `- Label: value` line (or `Label: value` row line) starts one, an
 * indented line or a line with no label continues the one before it. A character scan over capped lines. */
function fieldsOf(lines: readonly string[]): ComposedConcern['fields'] {
  const fields: ComposedConcern['fields'] = [];
  for (const raw of lines) {
    if (raw.trim() === '') continue;
    const indented = raw[0] === ' ' || raw[0] === '\t';
    const bullet = !indented && isBulletLine(raw);
    const text = (bullet ? raw.slice(2) : raw).trim();
    const last = fields[fields.length - 1];
    if (indented && last !== undefined) {
      last.text = `${last.text} ${isBulletLine(text) ? text.slice(2).trim() : text}`.trim();
      continue;
    }
    const field = splitField(text);
    if (field !== null) fields.push(field);
    else if (last !== undefined && !bullet) last.text = `${last.text} ${text}`.trim();
    else fields.push({ label: null, text });
  }
  return fields;
}

function priorityOf(fields: ComposedConcern['fields']): ComposedConcern['priority'] {
  const field = fields.find((candidate) => candidate.label?.toLowerCase() === 'priority');
  const value = field?.text.toLowerCase() ?? '';
  if (value.startsWith('high')) return 'high';
  if (value.startsWith('medium')) return 'med';
  if (value.startsWith('low')) return 'low';
  return '';
}

function concernOf(id: string, raw: unknown): ComposedConcern | null {
  if (!isRecord(raw)) return null;
  const lines = Array.isArray(raw.lines) ? raw.lines.filter((line): line is string => typeof line === 'string') : [];
  const label = textOrNull(raw.label);
  const title = label ?? textOrNull(lines[0]?.trim());
  if (title === null) return null;
  const fields = fieldsOf(label === null ? lines.slice(1) : lines);
  return { id, title, fields, gist: fields[0]?.text || null, priority: priorityOf(fields) };
}

/** A heading as the page compares it to a rendered group's text: lower-cased, backticks and stars out, spaces collapsed. */
function headingForm(text: string | null): string {
  return (text ?? '').replaceAll('`', '').replaceAll('*', '').split(' ').filter((word) => word !== '').join(' ').toLowerCase();
}

function pileTone(entry: { key: string | null; count: number }): ComposedConcernSection['tone'] {
  if (entry.key === SECURITY_KEY) return entry.count > 0 ? 'in-flight' : 'complete';
  return entry.count === 0 ? 'quiet' : null;
}

function liftConcerns(
  codebase: Record<string, unknown>,
  groups: readonly { heading: string | null; html: string }[],
  drawn: Set<number>,
): ComposedCodebaseLifted | null {
  const found = concernEntries(codebase.concerns);
  const detailed = concernSections(codebase.concerns);
  if (found === null || detailed === null) return null;
  const { total } = found;

  // Each section takes the first unused group with its heading; the text before the first heading is the intro.
  const byHeading = new Map<string, number[]>();
  groups.forEach((group, index) => {
    if (group.heading === null) return;
    const form = headingForm(group.heading);
    byHeading.set(form, [...(byHeading.get(form) ?? []), index]);
  });
  const sections: ComposedConcernSection[] = detailed.entries.map((entry, at) => {
    const items = entry.items.flatMap((raw, index) => {
      const concern = concernOf(`${at}:${index}`, raw);
      return concern === null ? [] : [concern];
    });
    const queue = byHeading.get(headingForm(entry.heading));
    const groupIndex = queue?.shift();
    if (groupIndex !== undefined) drawn.add(groupIndex);
    const html = groupIndex === undefined ? '' : groups[groupIndex].html;
    return {
      key: entry.key,
      label: (entry.key === null ? undefined : HEAD_CONCERN_LABELS.get(entry.key)) ?? entry.heading,
      heading: entry.heading,
      count: entry.count,
      tone: pileTone(entry),
      items,
      omitted: Math.max(0, entry.count - items.length),
      fallbackHtml: items.length === 0 && stripLeadingHeading(html).trim() !== '' ? html : null,
    };
  });
  const lead = groups.findIndex((group) => group.heading === null && group.html.trim() !== '');
  if (lead >= 0) drawn.add(lead);

  const security = sections.find((section) => section.key === SECURITY_KEY && section.items.length > 0);
  const debt = sections.find((section) => section.key === 'tech-debt' && section.items.length > 0);
  return {
    kind: 'concerns',
    total,
    noun: total === 1 ? 'concern' : 'concerns',
    totalText: `${total} ${total === 1 ? 'concern' : 'concerns'}`,
    counts: found.entries.map((entry) => ({ label: entry.heading, count: entry.count, tone: concernTone(entry) })),
    intro: lead >= 0 ? groups[lead].html : null,
    sections,
    top: (security ?? debt)?.items[0]?.id ?? null,
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

/** The head shows named tools, not sentences: a lifted bullet whose name runs past this many characters is
 * prose ("Module system: ESM only (...)") and stays in the Stack panel. A long version keeps its first word
 * ("≥22.18.0 (engines in package.json)" shows "≥22.18.0") and is left out when that is still long. */
const HEAD_CHIP_NAME_MAX = 28;
const HEAD_VERSION_MAX = 20;

function headVersion(version: string | null): string | null {
  if (version === null || version.length <= HEAD_VERSION_MAX) return version;
  const space = version.indexOf(' ');
  const first = space < 0 ? version : version.slice(0, space);
  return first.length > 0 && first.length <= HEAD_VERSION_MAX ? first : null;
}

/** A long bullet the lift could not split ("Node.js >=22.18.0 (engines in package.json)") is a name and a version
 * when its second word starts like a version (a digit, or a comparator or caret before one); anything else is
 * prose and has no chip in the head. A character scan, never a pattern over the text. */
function startsLikeVersion(word: string): boolean {
  const first = word[0];
  return first !== undefined && ((first >= '0' && first <= '9') || '>=<^~≥≤'.includes(first));
}

function headChip(chip: CodebaseHeadChip): ComposedStackChip | null {
  if (chip.name.length <= HEAD_CHIP_NAME_MAX) return { name: chip.name, version: headVersion(chip.version) };
  if (chip.version !== null) return null;
  const words = chip.name.split(' ');
  const [name, version] = words;
  if (name === undefined || version === undefined || name.length > HEAD_CHIP_NAME_MAX || !startsLikeVersion(version)) {
    return null;
  }
  return { name, version: headVersion(version) };
}

function headChips(chips: readonly CodebaseHeadChip[], keep: number): ComposedStackChip[] {
  return chips
    .flatMap((chip) => {
      const kept = headChip(chip);
      return kept === null ? [] : [kept];
    })
    .slice(0, keep);
}

function headStack(stack: CodebaseHeadStack | null): ComposedStackSet[] {
  if (stack === null) return [];
  const sets: ComposedStackSet[] = [
    { label: 'Languages', chips: headChips(stack.languages, HEAD_LANGUAGES) },
    { label: 'Runtime', chips: headChips(stack.runtime, HEAD_RUNTIME) },
    {
      label: 'Frameworks',
      chips: HEAD_FRAMEWORKS.flatMap(([group, keep]) =>
        headChips(
          stack.frameworks.filter((chip) => chip.group === group),
          keep,
        ),
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

// --- the Architecture lift (10-12) -----------------------------------------------------------------------

function liftArchitecture(codebase: Record<string, unknown>): ComposedArchitecture | null {
  const architecture = isRecord(codebase.architecture) ? codebase.architecture : null;
  if (architecture === null) return null;
  const fence = isRecord(architecture.diagram) ? architecture.diagram : null;
  const text = fence === null ? null : textOrNull(fence.text);
  const diagram = fence !== null && text !== null ? { info: typeof fence.info === 'string' ? fence.info : '', text: String(fence.text) } : null;
  const swaps = recordsOf(architecture.antiPatterns).flatMap((entry): SwapItem[] => {
    const name = textOrNull(entry.name);
    const instead = textOrNull(entry.doInstead);
    if (name === null || instead === null) return [];
    const details: SwapItem['details'] = [];
    const happens = textOrNull(entry.whatHappens);
    const wrong = textOrNull(entry.whyWrong);
    if (happens !== null) details.push({ label: 'What happens', text: happens });
    if (wrong !== null) details.push({ label: "Why it's wrong", text: wrong });
    for (const part of recordsOf(entry.more)) {
      const label = textOrNull(part.label);
      const more = textOrNull(part.text);
      if (label !== null && more !== null) details.push({ label, text: more });
    }
    return [{ bad: name, good: instead, details }];
  });
  return diagram === null && swaps.length === 0 ? null : { kind: 'architecture', diagram, swaps };
}

function liftStructure(codebase: Record<string, unknown>): ComposedStructure | null {
  const structure = isRecord(codebase.structure) ? codebase.structure : null;
  const tree = structure !== null && isRecord(structure.tree) ? structure.tree : null;
  if (tree === null || textOrNull(tree.text) === null) return null;
  return { kind: 'structure', tree: { info: typeof tree.info === 'string' ? tree.info : '', text: String(tree.text) } };
}

function liftOf(
  key: string,
  codebase: Record<string, unknown>,
  groups: readonly { heading: string | null; html: string }[],
  drawn: Set<number>,
  urls: ReadonlyMap<string, string>,
  context: ViewInput['codebaseContext'],
): ComposedCodebaseLifted | null {
  if (key === 'stack') return liftStack(codebase, urls, context);
  if (key === 'integrations') return liftIntegrations(codebase, urls, context);
  if (key === 'architecture') return liftArchitecture(codebase);
  if (key === 'structure') return liftStructure(codebase);
  if (key === 'concerns') return liftConcerns(codebase, groups, drawn);
  return null;
}

/** The keys of the sections a lifted part already draws, so the plain list does not show them twice. */
function consumedKeys(lifted: ComposedCodebaseLifted | null): ReadonlySet<string> {
  const keys = new Set<string>();
  if (lifted?.kind === 'architecture') {
    if (lifted.diagram !== null) keys.add('system-overview');
    if (lifted.swaps.length > 0) keys.add('anti-patterns');
  }
  if (lifted?.kind === 'structure') keys.add('directory-layout');
  if (lifted?.kind === 'integrations' && lifted.environment !== null) keys.add('environment-configuration');
  return keys;
}

/**
 * The indexes of the section groups whose section a lifted part draws. The page cuts the rendered document into
 * one group per `##` heading, and the lift lists the `##` sections in the same order, so the two pair by
 * position when their counts agree (a heading the renderer rewrote still pairs); when they do not, a group is
 * consumed only on an exact (case-insensitive) heading match.
 */
function consumedGroups(
  groups: readonly { heading: string | null }[],
  codebase: Record<string, unknown>,
  keys: ReadonlySet<string>,
): Set<number> {
  const consumed = new Set<number>();
  if (keys.size === 0) return consumed;
  const sections = recordsOf(codebase.sections).filter((section) => section.level === 2);
  const headed = groups.flatMap((group, index) => (group.heading === null ? [] : [index]));
  headed.forEach((groupIndex, position) => {
    const section = headed.length === sections.length ? sections[position] : undefined;
    const byHeading =
      section === undefined
        ? sections.find((candidate) => textOrNull(candidate.heading)?.toLowerCase() === groups[groupIndex].heading?.trim().toLowerCase())
        : section;
    if (byHeading !== undefined && typeof byHeading.key === 'string' && keys.has(byHeading.key)) consumed.add(groupIndex);
  });
  return consumed;
}

// --- cross-links between map panels (10-12) -------------------------------------------------------------------

const MAP_FILE_NAMES: ReadonlySet<string> = new Set([
  'STACK.md',
  'ARCHITECTURE.md',
  'STRUCTURE.md',
  'CONVENTIONS.md',
  'TESTING.md',
  'INTEGRATIONS.md',
  'CONCERNS.md',
]);
const MAP_PATH_PREFIX = '.planning/codebase/';
/** The longest map file name ("ARCHITECTURE" and its suffix); the walk back from ".md" never goes further. */
const MAP_NAME_MAX = 'ARCHITECTURE'.length;

export interface MentionPart {
  text: string;
  /** The in-app address of a mapped panel, taken from `urls`; null for plain text. Never built from `text`. */
  to: string | null;
  /** Present (true) when the mention sat in backticks: the link is shown as code. */
  code?: true;
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '_');
}

/**
 * Cuts `text` into plain parts and links to another map panel. A mention is one of the seven exact file names
 * (STACK.md ... CONCERNS.md), alone or after `.planning/codebase/`, on a word edge, and links only when `urls` holds
 * that name, that is, when the document is mapped; the address always comes from `urls`, never from the text.
 * A character scan from each ".md", bounded per hit, so the cost is linear in the text.
 */
export function linkMapMentions(text: string, urls: ReadonlyMap<string, string>): MentionPart[] {
  if (text === '') return [];
  const parts: MentionPart[] = [];
  let cursor = 0;
  let from = 0;
  for (;;) {
    const dot = text.indexOf('.md', from);
    if (dot < 0) break;
    from = dot + 3;
    if (isWordChar(text[dot + 3])) continue;
    let start = dot;
    while (start > 0 && dot - start < MAP_NAME_MAX && text[start - 1] >= 'A' && text[start - 1] <= 'Z') start -= 1;
    const name = text.slice(start, dot + 3);
    if (!MAP_FILE_NAMES.has(name)) continue;
    const url = urls.get(name);
    if (url === undefined) continue;
    let linkStart = start;
    if (start >= MAP_PATH_PREFIX.length && text.slice(start - MAP_PATH_PREFIX.length, start) === MAP_PATH_PREFIX) {
      linkStart = start - MAP_PATH_PREFIX.length;
    }
    const before = text[linkStart - 1];
    if (linkStart > cursor && (isWordChar(before) || before === '-' || before === '/' || before === '.')) continue;
    if (linkStart < cursor) continue;
    let linkEnd = dot + 3;
    const wrapped = before === '`' && text[linkEnd] === '`' && linkStart > cursor;
    if (wrapped) {
      linkStart -= 1;
      linkEnd += 1;
    }
    if (linkStart > cursor) parts.push({ text: text.slice(cursor, linkStart), to: null });
    const label = text.slice(wrapped ? linkStart + 1 : linkStart, wrapped ? linkEnd - 1 : linkEnd);
    parts.push(wrapped ? { text: label, to: url, code: true } : { text: label, to: url });
    cursor = linkEnd;
    from = linkEnd;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), to: null });
  return parts;
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

  // A lifted part that draws whole sections (Concerns) adds the groups it used to `drawn` itself.
  const drawn = new Set<number>();
  // Another mapped panel's address by its file name (never the current one): the cross-read links read it.
  const urls = new Map(
    context.panels.flatMap((panel) =>
      panel.mapped && panel.url !== null && panel.key !== context.activeKey
        ? [[`${panel.key.toUpperCase()}.md`, panel.url] as const]
        : [],
    ),
  );
  const lifted = liftOf(current.key, codebase, input.groups, drawn, urls, context);
  for (const index of consumedGroups(input.groups, codebase, consumedKeys(lifted))) drawn.add(index);
  const plain: ComposedCodebasePlain[] = input.groups
    .filter((group, index) => group.html.trim() !== '' && !drawn.has(index))
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
      keyPhrase:
        typeof current.keyNumber === 'number' ? keyPhrase(current.key, current.keyNumber, codebase.keyUnit) : null,
      lifted,
      plain,
      plainSections: plain.flatMap((section) => (section.heading === null ? [] : [section.heading])),
    },
    head: composeHead(context.head),
  };
}
