// The PLAN task navigator composer (quick-261006-iz6, sketch 019 B): a pure `ViewInput` ->
// `ComposedPlanNavigator` merge of the frontmatter, `structured.plan` (built by
// `src/planning-repo/handlers/plan-structure.ts`, with the ref facts added by the handler), the paired
// SUMMARY's progress, the presentation lookups in `planContext` and the rendered document's headings.
// It decides the header (eyebrow, title, Planned date), the chips, triggers and stats, the objective
// definition list, every task's list entry, tabs and sections, the three modals, Done when and the
// "In the source only" entries with their Source-mode targets. No DOM, no rendering —
// `plan-navigator-components.tsx` is the only consumer. Returns `null` when the plan projection is
// missing, malformed or holds no task, and the page then keeps the sketch-004 B3 layout (T-iz6-05).
// Dates are formatted by hand in UTC (via `formatStamp`) so Node and the browser agree. T-iz6-03:
// author-written paths, ids and text are never turned into an href here.
import { parseBlocks } from '../../planning-repo/handlers/context-brief.ts';
import type { Block } from '../../planning-repo/handlers/context-brief.ts';
import type {
  PlanBlocks,
  PlanList,
  PlanLooseNote,
  PlanOption,
  PlanSourceBlock,
  PlanStructure,
  PlanTask,
  PlanVerifyItem,
} from '../../planning-repo/handlers/plan-structure.ts';
import type { ViewInput } from './manifest.ts';
import { normalizeHeading } from './pattern-map.ts';
import { formatStamp } from './uat-session.ts';

// ---------------------------------------------------------------------------
// Tones — the only place a type, a state or a chip becomes a tone
// ---------------------------------------------------------------------------

/** The document-content tone vocabulary the page draws from — never the parse-degradation tones
 * (`destructive` / `warning`), which stay reserved for the artifact-parse badge alone. */
export type PlanTone = 'complete' | 'in-flight' | 'missing' | 'quiet' | 'active';

export interface PlanTypeInfo {
  glyph: string;
  label: string;
  tone: PlanTone;
  /** The "Waits for …" label of a checkpoint; null for work the executor does alone. */
  waits: string | null;
}

export const TYPE_INFO: Record<string, PlanTypeInfo> = {
  auto: { glyph: 'A', label: 'Auto', tone: 'quiet', waits: null },
  tracer: { glyph: 'T', label: 'Tracer', tone: 'active', waits: null },
  'checkpoint:decision': { glyph: '?', label: 'Decision', tone: 'in-flight', waits: 'Waits for your choice' },
  'checkpoint:human-verify': { glyph: 'V', label: 'Verify', tone: 'in-flight', waits: 'Waits for you to look' },
  'checkpoint:human-action': { glyph: 'H', label: 'Action', tone: 'in-flight', waits: 'Waits for you to do it' },
};

export const CHECKPOINT_TONE: PlanTone = 'in-flight';
export const TRACER_TONE: PlanTone = 'active';
export const NEW_FILE_TONE: PlanTone = 'active';

export const STATUS: Record<'executed' | 'awaiting' | 'not-run', { label: string; tone: PlanTone }> = {
  executed: { label: 'Executed', tone: 'complete' },
  awaiting: { label: 'Awaiting checkpoint', tone: 'in-flight' },
  'not-run': { label: 'Not run yet', tone: 'quiet' },
};

/** high -> complete, med / medium -> in-flight, low -> missing, anything else no tone. */
export function confidenceTone(text: string): PlanTone | null {
  const lower = text.trim().toLowerCase();
  if (lower.startsWith('high')) return 'complete';
  if (lower.startsWith('med')) return 'in-flight';
  if (lower.startsWith('low')) return 'missing';
  return null;
}
export const CONFIDENCE_TONE = confidenceTone;

export const REVERSIBILITY: Record<string, { label: string; tone: PlanTone }> = {
  costly: { label: 'Costly to undo', tone: 'in-flight' },
  'one-way': { label: 'One-way', tone: 'in-flight' },
  reversible: { label: 'Reversible', tone: 'quiet' },
};

export function reversibilityChip(rating: string | null): PlanChip | null {
  if (rating === null || rating.trim() === '') return null;
  const key = rating.trim().toLowerCase();
  const known = REVERSIBILITY[key];
  if (known) return { label: known.label, tone: known.tone };
  return { label: `${humanize(key)} to undo`, tone: 'quiet' };
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface PlanChip {
  label: string;
  tone: PlanTone;
}

export interface PlanStat {
  label: string;
  value: string;
  tone: PlanTone | null;
}

export interface PlanTrigger {
  count: number;
  disabled: boolean;
}

export interface ComposedPlanIntro {
  eyebrow: string;
  /** The objective's first sentence as plain text; null falls back to the artifact title. */
  title: string | null;
  planned: { date: string; source: 'quick-id' | 'git' | 'mtime'; title: string } | null;
}

export interface PlanVerifyRow {
  kind: 'command' | 'note';
  /** `command`: the command text. */
  text: string;
  /** `command`: the "Fails when" line that follows it. */
  fails: string | null;
  /** `note`: a kicker such as "Human check", null for plain text. */
  label: string | null;
  /** `note`: the text parsed to blocks. */
  blocks: Block[];
}

export interface PlanOptionRow {
  name: string | null;
  description: string | null;
  pros: string | null;
  cons: string | null;
}

interface SectionBase {
  key: string;
  label: string;
  /** Muted text after the kicker, such as " · 13". */
  aside: string | null;
}

export type PlanSection =
  | (SectionBase & { kind: 'files'; files: string[] })
  | (SectionBase & { kind: 'blocks'; blocks: Block[]; clamp: boolean; words: number })
  | (SectionBase & { kind: 'list'; lead: string | null; items: string[] })
  | (SectionBase & { kind: 'verify'; rows: PlanVerifyRow[] })
  | (SectionBase & { kind: 'options'; options: PlanOptionRow[] })
  | (SectionBase & { kind: 'line'; text: string; large: boolean; done: boolean });

export interface PlanTab {
  key: 'main' | 'side' | 'done';
  label: string;
  count: number | null;
}

export interface PlanSourceRow {
  labels: { label: string; anchor: string }[];
}

export interface ComposedPlanTask {
  n: number;
  anchor: string;
  glyph: string;
  type: string;
  typeLabel: string;
  tone: PlanTone;
  gate: boolean;
  gateValue: string | null;
  tdd: boolean;
  waits: string | null;
  name: string;
  chips: PlanChip[];
  sub: string;
  tabs: PlanTab[];
  sections: { main: PlanSection[]; side: PlanSection[]; done: PlanSection[] };
  sourceRow: PlanSourceRow | null;
}

export interface PlanDependencyRow {
  id: string;
  title: string | null;
  status: PlanChip | null;
  url: string | null;
}

export interface PlanFileTaskRef {
  n: number;
  gate: boolean;
  name: string;
}

export interface PlanFileRow {
  path: string;
  name: string;
  isNew: boolean;
  /** The tone of the New chip — set only on a created file. */
  newTone: PlanTone | null;
  tasks: PlanFileTaskRef[];
}

export interface PlanFileGroup {
  dir: string;
  files: PlanFileRow[];
}

export interface PlanRequirementRow {
  id: string;
  text: string | null;
  source: 'requirements' | 'truth' | null;
}

export interface ComposedPlanModals {
  deps: PlanDependencyRow[];
  depsFooter: string;
  files: { groups: PlanFileGroup[]; total: number };
  requirements: PlanRequirementRow[];
}

export interface PlanDoneColumn {
  lead: string | null;
  items: string[];
}

export interface ComposedPlanDoneWhen {
  outcomes: PlanDoneColumn;
  checks: PlanDoneColumn;
  aside: string;
}

export interface PlanSourceEntry {
  label: string;
  /** A rendered section id (`plan-at-…`, a heading id) or null for the top of Source mode. */
  target: string | null;
}

export interface ComposedPlanNavigator {
  intro: ComposedPlanIntro;
  head: {
    chips: PlanChip[];
    triggers: { deps: PlanTrigger; files: PlanTrigger; requirements: PlanTrigger };
    stats: PlanStat[];
  };
  objective: { rest: Block[] | null; why: Block[] | null; youGet: Block[] | null };
  listHead: { count: number; waits: number };
  initialTask: number;
  tasks: ComposedPlanTask[];
  doneWhen: ComposedPlanDoneWhen | null;
  modals: ComposedPlanModals;
  sourceOnly: PlanSourceEntry[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** "per-type-document-views" -> "Per type document views", "read_first" -> "Read first". */
export function humanize(text: string): string {
  const spaced = text.split('_').join(' ').split('-').join(' ').trim();
  return spaced === '' ? '' : spaced[0].toUpperCase() + spaced.slice(1);
}

function plain(text: string): string {
  return text.split('**').join('').split('`').join('').trim();
}

function capitalize(text: string): string {
  return text === '' ? text : text[0].toUpperCase() + text.slice(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function listOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => stringOf(entry)).filter((entry): entry is string => entry !== null);
  }
  const single = stringOf(value);
  return single === null ? [] : single.split(',').map((part) => part.trim()).filter((part) => part !== '');
}

/** "10" -> "10", "05" -> "5", "02.1" -> "2.1", "A1" -> "A1". */
function stripLeadingZeros(number: string): string {
  let i = 0;
  while (i < number.length - 1 && number[i] === '0' && number[i + 1] >= '0' && number[i + 1] <= '9') i += 1;
  return number.slice(i);
}

/** 160000 -> "160k", 900 -> "900", absent -> "—". */
export function formatTokens(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return '—';
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value));
}

function numberOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function isDigits(text: string): boolean {
  if (text === '') return false;
  for (const ch of text) if (ch < '0' || ch > '9') return false;
  return true;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// ---------------------------------------------------------------------------
// Planned date
// ---------------------------------------------------------------------------

export interface PlannedDate {
  date: string;
  source: 'quick-id' | 'git' | 'mtime';
  title: string;
}

/** `260910-0x4` -> "2026-09-10", null when the prefix is not a real YYMMDD date. */
function quickIdDate(quickId: string): string | null {
  const prefix = quickId.slice(0, 6);
  if (!isDigits(prefix) || quickId[6] !== '-') return null;
  const year = 2000 + Number(prefix.slice(0, 2));
  const month = Number(prefix.slice(2, 4));
  const day = Number(prefix.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${prefix.slice(2, 4)}-${prefix.slice(4, 6)}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

/**
 * The Planned fact: the quick-ID prefix first, then the git author date of the commit that added the
 * file (its first ten characters — the author's own local date, so a late-night commit does not slip a
 * day in UTC), then the file's modification time as a UTC date. Null when none is usable.
 */
export function plannedDate(
  quickId: string | null,
  addedAt: string | null,
  mtimeMs: number | null,
): PlannedDate | null {
  if (quickId !== null) {
    const iso = quickIdDate(quickId);
    if (iso !== null) return { date: formatStamp(iso), source: 'quick-id', title: 'From the quick task id' };
  }
  if (addedAt !== null) {
    const day = addedAt.slice(0, 10);
    if (day.length === 10 && isDigits(day.slice(0, 4)) && day[4] === '-' && isDigits(day.slice(5, 7)) && day[7] === '-' && isDigits(day.slice(8, 10))) {
      return { date: formatStamp(day), source: 'git', title: 'The day the file was added to git' };
    }
  }
  if (mtimeMs !== null && Number.isFinite(mtimeMs) && mtimeMs > 0) {
    return {
      date: formatStamp(new Date(mtimeMs).toISOString().slice(0, 10)),
      source: 'mtime',
      title: "The file's last modified date",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Task sections
// ---------------------------------------------------------------------------

const CLAMP_CHARS = 900;

function wordsToTens(words: number): number {
  return Math.max(10, Math.round(words / 10) * 10);
}

function blocksSection(key: string, label: string, field: PlanBlocks | null | undefined, aside: string | null = null): PlanSection | null {
  if (!field || !Array.isArray(field.blocks) || field.blocks.length === 0) return null;
  const long = typeof field.chars === 'number' && field.chars > CLAMP_CHARS;
  return { kind: 'blocks', key, label, aside, blocks: field.blocks, clamp: long, words: wordsToTens(field.words ?? 0) };
}

function checksSection(key: string, label: string, field: PlanList | null | undefined, withCount: boolean): PlanSection | null {
  if (!field || !Array.isArray(field.items) || field.items.length === 0) return null;
  return {
    kind: 'list',
    key,
    label,
    aside: withCount ? ` · ${field.items.length}` : null,
    lead: field.lead ?? null,
    items: field.items,
  };
}

function lineSection(key: string, label: string, text: string | null | undefined, large: boolean, done: boolean): PlanSection | null {
  if (typeof text !== 'string' || text.trim() === '') return null;
  return { kind: 'line', key, label, aside: null, text, large, done };
}

function verifyRows(items: PlanVerifyItem[]): PlanVerifyRow[] {
  const rows: PlanVerifyRow[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.kind === 'automated') {
      const next = items[i + 1];
      const fails = next && next.kind === 'fails_when' ? next.text : null;
      if (fails !== null) i += 1;
      rows.push({ kind: 'command', text: item.text, fails, label: null, blocks: [] });
      continue;
    }
    const label =
      item.kind === 'text' ? null : item.kind === 'fails_when' ? 'Fails when' : item.kind === 'human-check' ? 'Human check' : humanize(item.kind);
    rows.push({ kind: 'note', text: item.text, fails: null, label, blocks: parseBlocks(item.text) });
  }
  return rows;
}

function optionRows(options: PlanOption[]): PlanOptionRow[] {
  return options.map((option) => ({
    name: option.name,
    description: option.description,
    pros: option.pros,
    cons: option.cons,
  }));
}

function compact(sections: (PlanSection | null)[]): PlanSection[] {
  return sections.filter((section): section is PlanSection => section !== null);
}

function infoOf(type: string): PlanTypeInfo {
  const known = TYPE_INFO[type];
  if (known) return known;
  if (type.startsWith('checkpoint')) {
    return { glyph: '?', label: humanize(type.slice(type.indexOf(':') + 1) || 'checkpoint'), tone: CHECKPOINT_TONE, waits: 'Waits for you' };
  }
  return { glyph: '·', label: humanize(type), tone: 'quiet', waits: null };
}

interface TaskSections {
  main: PlanSection[];
  side: PlanSection[];
  done: PlanSection[];
  tabs: PlanTab[];
}

function sectionsOf(task: PlanTask): TaskSections {
  const f = task.fields;
  const info = infoOf(task.type);
  const gate = task.type.startsWith('checkpoint');
  const used = new Set<string>();
  const take = (key: string, make: () => PlanSection | null): PlanSection | null => {
    const section = make();
    if (section !== null) used.add(key);
    return section;
  };

  const files = (): PlanSection | null =>
    task.files.length > 0
      ? { kind: 'files', key: 'files', label: 'Files', aside: ` · ${task.files.length}`, files: task.files }
      : null;
  const testsFirst = (): PlanSection | null => checksSection('behavior', 'Tests first', f.behavior, false);
  const doSection = (): PlanSection | null => blocksSection('action', 'Do', f.action);
  const verify = (): PlanSection | null =>
    f.verify && f.verify.items.length > 0
      ? { kind: 'verify', key: 'verify', label: 'Verify', aside: null, rows: verifyRows(f.verify.items) }
      : null;
  const acceptWhen = (): PlanSection | null => checksSection('acceptance', 'Accept when', f.acceptance, true);
  const undoCost = (): PlanSection | null =>
    f.reversibility && f.reversibility.text !== ''
      ? lineSection('reversibility', 'Undo cost', f.reversibility.text, false, false)
      : null;
  const context = (): PlanSection | null => blocksSection('context', 'Context', f.context);
  const checkAfterwards = (): PlanSection | null => blocksSection('verification', 'Check afterwards', f.verification);

  let main: PlanSection[];
  let side: PlanSection[];
  const done: PlanSection[] = [];

  if (!gate) {
    main = compact([take('files', files), take('context', context), take('behavior', testsFirst), take('action', doSection)]);
    side = compact([take('verify', verify), take('acceptance', acceptWhen), take('reversibility', undoCost)]);
    const doneLine = lineSection('done', 'Done', f.done?.text, true, true);
    if (doneLine !== null) {
      used.add('done');
      done.push(doneLine);
    }
  } else {
    const decide = (): PlanSection | null => lineSection('decision', 'Decide', f.decision?.text, true, false);
    const options = (): PlanSection | null =>
      f.options && f.options.items.length > 0
        ? { kind: 'options', key: 'options', label: 'Options', aside: null, options: optionRows(f.options.items) }
        : null;
    const whatBuilt = (): PlanSection | null => blocksSection('whatBuilt', 'What was built', f.whatBuilt);
    const howToCheck = (): PlanSection | null => blocksSection('howToVerify', 'How to check it', f.howToVerify);
    const steps = (): PlanSection | null => blocksSection('instructions', 'Steps', f.instructions);
    if (task.type === 'checkpoint:decision') {
      main = compact([
        take('decision', decide),
        take('context', () => blocksSection('context', 'Why it matters', f.context)) ??
          take('action', () => blocksSection('action', 'Why it matters', f.action)),
        take('options', options),
      ]);
    } else if (task.type === 'checkpoint:human-action') {
      main = compact([
        take('whatBuilt', () => blocksSection('whatBuilt', 'What to do', f.whatBuilt)) ??
          take('action', () => blocksSection('action', 'What to do', f.action)),
        take('instructions', steps),
      ]);
    } else {
      main = compact([take('decision', decide), take('options', options), take('whatBuilt', whatBuilt), take('howToVerify', howToCheck), take('instructions', steps)]);
    }
    const doneLabel = task.type === 'checkpoint:decision' ? 'Recorded when' : 'Done';
    side = compact([
      take('context', context),
      take('verification', checkAfterwards),
      take('files', files),
      take('action', doSection),
      take('verify', verify),
      take('acceptance', acceptWhen),
      take('behavior', testsFirst),
      take('done', () => lineSection('done', doneLabel, f.done?.text, false, true)),
      take('reversibility', undoCost),
    ]);
  }

  // Nothing the file holds is dropped: whatever a task type's layout did not place lands at the end
  // of the second tab, in a fixed order.
  const leftovers: [string, () => PlanSection | null][] = [
    ['decision', () => lineSection('decision', 'Decision', f.decision?.text, false, false)],
    ['context', context],
    ['whatBuilt', () => blocksSection('whatBuilt', 'What was built', f.whatBuilt)],
    ['howToVerify', () => blocksSection('howToVerify', 'How to check it', f.howToVerify)],
    ['instructions', () => blocksSection('instructions', 'Steps', f.instructions)],
    ['verification', checkAfterwards],
    ['options', () => (f.options && f.options.items.length > 0 ? { kind: 'options', key: 'options', label: 'Options', aside: null, options: optionRows(f.options.items) } : null)],
    ['files', files],
    ['action', doSection],
    ['behavior', testsFirst],
    ['verify', verify],
    ['acceptance', acceptWhen],
    ['reversibility', undoCost],
  ];
  const extra: PlanSection[] = [];
  for (const [key, make] of leftovers) {
    if (used.has(key)) continue;
    const section = make();
    if (section !== null) {
      used.add(key);
      extra.push(section);
    }
  }
  side = [...side, ...extra];

  // A tab with no sections is omitted (a task with no done line has no Done tab).
  const tabs: PlanTab[] = [];
  if (!gate) {
    if (main.length > 0) tabs.push({ key: 'main', label: 'Do', count: null });
    if (side.length > 0) tabs.push({ key: 'side', label: 'Prove it', count: f.acceptance?.items.length ? f.acceptance.items.length : null });
    if (done.length > 0) tabs.push({ key: 'done', label: 'Done', count: null });
  } else {
    if (main.length > 0) tabs.push({ key: 'main', label: info.label, count: null });
    if (side.length > 0) tabs.push({ key: 'side', label: task.type === 'checkpoint:human-action' ? 'Afterwards' : 'Context', count: null });
  }
  return { main, side, done, tabs };
}

const SOURCE_CHILD_LABELS: Record<string, string> = {
  precondition: 'Pre-condition',
  'pre-condition': 'Pre-condition',
};

function taskSourceRow(task: PlanTask): PlanSourceRow | null {
  const children = Array.isArray(task.sourceChildren) ? task.sourceChildren : [];
  if (children.length === 0) return null;
  const seen = new Map<string, number>();
  const labels = children.map((child) => {
    const base = SOURCE_CHILD_LABELS[child.tag] ?? humanize(child.tag);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { label: count === 1 ? base : `${base} ${count}`, anchor: child.anchor };
  });
  return { labels };
}

function composeTask(task: PlanTask, fallbackName: string): ComposedPlanTask {
  const info = infoOf(task.type);
  const gate = task.type.startsWith('checkpoint');
  const sections = sectionsOf(task);
  const chips: PlanChip[] = [{ label: info.label, tone: info.tone }];
  if (task.tdd) chips.push({ label: 'TDD', tone: 'quiet' });
  const reversibility = reversibilityChip(task.fields.reversibility?.rating ?? null);
  if (reversibility !== null) chips.push(reversibility);
  const subParts = [`T${task.n}`, info.label];
  if (task.tdd) subParts.push('TDD');
  if (gate) subParts.push('waits');
  else if (task.files.length > 0) subParts.push(plural(task.files.length, 'file', 'files'));
  return {
    n: task.n,
    anchor: task.anchor,
    glyph: info.glyph,
    type: task.type,
    typeLabel: info.label,
    tone: info.tone,
    gate,
    gateValue: task.gate,
    tdd: task.tdd,
    waits: info.waits,
    name: task.name ?? fallbackName,
    chips,
    sub: subParts.join(' · '),
    tabs: sections.tabs,
    sections: { main: sections.main, side: sections.side, done: sections.done },
    sourceRow: taskSourceRow(task),
  };
}

// ---------------------------------------------------------------------------
// Header: chips, triggers, stats
// ---------------------------------------------------------------------------

function headChips(
  input: ViewInput,
  tasks: PlanTask[],
  quickId: string | null,
): PlanChip[] {
  const fm = input.frontmatter;
  const chips: PlanChip[] = [];
  const type = stringOf(fm.type);
  if (type !== null) chips.push({ label: type.toLowerCase() === 'tdd' ? 'TDD' : humanize(type), tone: 'quiet' });
  const wave = stringOf(fm.wave);
  if (wave !== null) chips.push({ label: `Wave ${wave}`, tone: 'quiet' });
  const checkpoints = tasks.filter((task) => task.type.startsWith('checkpoint')).length;
  if (checkpoints > 0) chips.push({ label: plural(checkpoints, 'checkpoint', 'checkpoints'), tone: CHECKPOINT_TONE });
  else if (fm.autonomous === false) chips.push({ label: 'Not autonomous', tone: 'quiet' });
  else chips.push({ label: 'Autonomous', tone: 'quiet' });
  if (fm.gap_closure === true) chips.push({ label: 'Gap closure', tone: 'in-flight' });
  chips.push(executedChip(input, quickId));
  return chips;
}

function executedChip(input: ViewInput, quickId: string | null): PlanChip {
  const progress = input.planProgress;
  if (progress) {
    if (progress.complete) return STATUS.executed;
    if (progress.summaryStatus === 'awaiting-checkpoint') return STATUS.awaiting;
    return STATUS['not-run'];
  }
  if (quickId !== null) {
    const summaryName = `${quickId}-SUMMARY.md`;
    const paired = (input.siblingArtifacts ?? []).some(
      (sibling) => sibling.path === summaryName || sibling.path.endsWith(`/${summaryName}`),
    );
    if (paired) return STATUS.executed;
  }
  return STATUS['not-run'];
}

// ---------------------------------------------------------------------------
// Files modal
// ---------------------------------------------------------------------------

function filesNamedBy(path: string, taskFile: string): boolean {
  return path === taskFile || path.endsWith(`/${taskFile}`) || taskFile.endsWith(`/${path}`);
}

function composeFiles(
  modified: string[],
  creates: string[],
  tasks: PlanTask[],
  names: string[],
): { groups: PlanFileGroup[]; total: number } {
  const created = new Set(creates);
  const seen = new Set<string>();
  const all: string[] = [];
  for (const path of [...modified, ...creates]) {
    if (seen.has(path)) continue;
    seen.add(path);
    all.push(path);
  }
  const groups = new Map<string, PlanFileRow[]>();
  for (const path of all) {
    const slash = path.lastIndexOf('/');
    const dir = slash > 0 ? path.slice(0, slash) : '(root)';
    const row: PlanFileRow = {
      path,
      name: slash > 0 ? path.slice(slash + 1) : path,
      isNew: created.has(path),
      newTone: created.has(path) ? NEW_FILE_TONE : null,
      tasks: tasks
        .filter((task) => task.files.some((file) => filesNamedBy(path, file)))
        .map((task, index) => ({ n: task.n, gate: task.type.startsWith('checkpoint'), name: names[task.n - 1] ?? `Task ${index + 1}` })),
    };
    const bucket = groups.get(dir);
    if (bucket) bucket.push(row);
    else groups.set(dir, [row]);
  }
  const ordered = [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([dir, files]) => ({ dir, files: [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) }));
  return { groups: ordered, total: all.length };
}

// ---------------------------------------------------------------------------
// Requirements modal
// ---------------------------------------------------------------------------

function mustHaveTruths(frontmatter: Record<string, unknown>): string[] {
  const mustHaves = frontmatter.must_haves;
  if (!isRecord(mustHaves) || !Array.isArray(mustHaves.truths)) return [];
  const truths: string[] = [];
  for (const truth of mustHaves.truths) {
    if (typeof truth === 'string') truths.push(truth);
    else if (isRecord(truth)) {
      const statement = stringOf(truth.statement) ?? stringOf(truth.truth) ?? stringOf(truth.text);
      if (statement !== null) truths.push(statement);
    }
  }
  return truths;
}

function truthTextFor(id: string, truths: string[]): string | null {
  for (const truth of truths) {
    const text = truth.trim();
    if (!text.startsWith(id)) continue;
    const after = text.slice(id.length);
    let cut = -1;
    if (after.startsWith(':')) cut = 1;
    else if (after.startsWith(' —') || after.startsWith(' –')) cut = 2;
    else if (after.startsWith(' -')) cut = 2;
    if (cut < 0) continue;
    const body = after.slice(cut).trim();
    if (body !== '') return capitalize(body);
  }
  return null;
}

function hasMustHaves(frontmatter: Record<string, unknown>): boolean {
  const mustHaves = frontmatter.must_haves;
  if (!isRecord(mustHaves)) return false;
  return Object.values(mustHaves).some((value) => (Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== ''));
}

// ---------------------------------------------------------------------------
// Source-only entries
// ---------------------------------------------------------------------------

const KNOWN_BLOCK_LABELS: Record<string, string> = {
  threat_model: 'Threat model',
  context: 'Context files',
  execution_context: 'Execution context',
  output: 'Output',
};

function sourceBlockEntries(blocks: PlanSourceBlock[]): { before: PlanSourceEntry[]; others: PlanSourceEntry[]; output: PlanSourceEntry[] } {
  const counts = new Map<string, number>();
  const labelFor = (tag: string): string => {
    const base = KNOWN_BLOCK_LABELS[tag] ?? humanize(tag);
    const count = (counts.get(tag) ?? 0) + 1;
    counts.set(tag, count);
    return count === 1 ? base : `${base} ${count}`;
  };
  const entries = blocks.map((block) => ({ tag: block.tag, entry: { label: labelFor(block.tag), target: block.anchor } }));
  const pick = (tag: string): PlanSourceEntry[] => entries.filter((e) => e.tag === tag).map((e) => e.entry);
  return {
    before: [...pick('threat_model'), ...pick('context'), ...pick('execution_context')],
    others: entries.filter((e) => !(e.tag in KNOWN_BLOCK_LABELS)).map((e) => e.entry),
    output: pick('output'),
  };
}

function looseEntries(loose: PlanLooseNote[], headings: { id: string; text: string }[]): PlanSourceEntry[] {
  return loose.map((note) => {
    if (note.kind === 'trailing') return { label: 'Trailing notes', target: null };
    if (note.kind === 'between') return { label: 'Notes between blocks', target: null };
    const heading = note.heading ?? '';
    const wanted = normalizeHeading(heading);
    const match = headings.find((candidate) => normalizeHeading(candidate.text) === wanted);
    return { label: heading, target: match?.id ?? null };
  });
}

// ---------------------------------------------------------------------------
// composePlanNavigator
// ---------------------------------------------------------------------------

function readPlan(value: unknown): (PlanStructure & { ref?: { planId?: string | null; phaseNumber?: string | null; phaseSlug?: string | null; quickId?: string | null } }) | null {
  if (!isRecord(value) || !Array.isArray(value.tasks) || value.tasks.length === 0) return null;
  for (const task of value.tasks) {
    if (!isRecord(task) || !isRecord(task.fields) || typeof task.type !== 'string') return null;
  }
  return value as unknown as PlanStructure;
}

export function composePlanNavigator(input: ViewInput): ComposedPlanNavigator | null {
  const plan = readPlan(input.structured?.plan);
  if (plan === null) return null;
  const fm = isRecord(input.frontmatter) ? input.frontmatter : {};
  const context = input.planContext ?? null;
  const ref = isRecord(plan.ref) ? plan.ref : {};
  const planId = stringOf(ref.planId);
  const quickId = stringOf(ref.quickId);

  const taskNames = plan.tasks.map((task, index) => task.name ?? `Task ${index + 1}`);
  const tasks = plan.tasks.map((task, index) => composeTask(task, taskNames[index]));

  // Header.
  let eyebrow = 'Plan';
  if (quickId !== null) eyebrow = `Quick plan ${quickId}`;
  else if (planId !== null) {
    const number = stringOf(ref.phaseNumber);
    const slug = stringOf(ref.phaseSlug);
    eyebrow = `Plan ${planId}${number !== null ? ` · Phase ${stripLeadingZeros(number)}` : ''}${slug !== null ? ` · ${humanize(slug)}` : ''}`;
  }
  const objectiveTitle = plan.objective?.title ?? null;
  const description = context?.description ? plain(context.description) : null;
  const title = objectiveTitle ?? (description !== null && description !== '' ? description : planId !== null ? `Plan ${planId}` : null);
  const planned = plannedDate(quickId, context?.addedAt ?? null, context?.mtimeMs ?? null);

  const modifiedFiles = listOf(fm.files_modified);
  const createdFiles = listOf(fm.creates);
  const files = composeFiles(modifiedFiles, createdFiles, plan.tasks, taskNames);
  const dependsOn = listOf(fm.depends_on);
  const requirementIds = listOf(fm.requirements);

  const estimate = isRecord(fm.estimate) ? fm.estimate : {};
  const confidence = stringOf(estimate.confidence);
  const stats: PlanStat[] = [
    { label: 'Tasks', value: String(tasks.length), tone: null },
    { label: 'Confidence', value: confidence ?? '—', tone: confidence === null ? null : confidenceTone(confidence) },
    { label: 'Est. tokens', value: formatTokens(numberOf(estimate.tokens)), tone: null },
  ];

  const objective = plan.objective;
  const wave = stringOf(fm.wave);
  const contextDeps = context?.dependencies ?? [];
  const deps: PlanDependencyRow[] = dependsOn.map((id) => {
    const found = contextDeps.find((dependency) => dependency.raw === id || dependency.id === id);
    if (!found || found.url === null) return { id, title: found?.title ?? null, status: null, url: null };
    return { id, title: found.title, status: found.complete ? STATUS.executed : STATUS['not-run'], url: found.url };
  });

  const truths = mustHaveTruths(fm);
  const requirements: PlanRequirementRow[] = requirementIds.map((id) => {
    const live = context?.requirementTexts?.[id];
    if (typeof live === 'string' && live.trim() !== '') return { id, text: live, source: 'requirements' as const };
    const truth = truthTextFor(id, truths);
    return truth === null ? { id, text: null, source: null } : { id, text: truth, source: 'truth' as const };
  });

  const doneWhen =
    plan.success || plan.verification
      ? {
          outcomes: { lead: plan.success?.lead ?? null, items: plan.success?.items ?? [] },
          checks: { lead: plan.verification?.lead ?? null, items: plan.verification?.items ?? [] },
          aside: `${plural(plan.success?.items.length ?? 0, 'outcome', 'outcomes')} · ${plural(plan.verification?.items.length ?? 0, 'check', 'checks')}`,
        }
      : null;

  // The strip.
  const blocks = sourceBlockEntries(Array.isArray(plan.sourceBlocks) ? plan.sourceBlocks : []);
  const sourceOnly: PlanSourceEntry[] = [];
  if (hasMustHaves(fm)) sourceOnly.push({ label: 'Must-haves', target: null });
  sourceOnly.push(...blocks.before, ...blocks.others, ...blocks.output);
  sourceOnly.push(...looseEntries(Array.isArray(plan.loose) ? plan.loose : [], input.headings ?? []));
  if (plan.wrapperWarnings > 0) sourceOnly.push({ label: `Wrapper warnings · ${plan.wrapperWarnings}`, target: null });
  if (Object.keys(fm).length > 0) sourceOnly.push({ label: 'Frontmatter', target: null });

  return {
    intro: { eyebrow, title, planned },
    head: {
      chips: headChips(input, plan.tasks, quickId),
      triggers: {
        deps: { count: dependsOn.length, disabled: dependsOn.length === 0 },
        files: { count: files.total, disabled: files.total === 0 },
        requirements: { count: requirementIds.length, disabled: requirementIds.length === 0 },
      },
      stats,
    },
    objective: {
      rest: objective && objective.rest.length > 0 ? objective.rest : null,
      why: objective?.why ?? null,
      youGet: objective?.youGet ?? null,
    },
    listHead: { count: tasks.length, waits: tasks.filter((task) => task.gate).length },
    initialTask: 1,
    tasks,
    doneWhen,
    modals: {
      deps,
      depsFooter: `Each row opens that plan.${wave !== null ? ` Wave ${wave} runs after these finish.` : ''}`,
      files,
      requirements,
    },
    sourceOnly,
  };
}
