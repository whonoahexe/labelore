// The dashboard ledger (quick-261018-4tb, sketch 026 B + P1): everything the dashboard shows below
// the project head, built once per snapshot from the in-memory domain model. Nothing here touches
// the filesystem, and every extractor is total: an unknown or malformed file gives an empty
// section, never a throw.
//
// T-4tb-02 (denial of service): section and entry text is capped before any regex runs
// (MAX_SECTION_CHARS, MAX_ENTRIES, MAX_ENTRY_CHARS) and only linear or bounded regexes are used.
// T-4tb-03: every function below is total; the tests cover each degradation.
// T-4tb-04: links come from the source resolver (route builders over discovered artifacts).
import type { Artifact, Phase, Project } from '../domain/model.ts';
import { fileTitleOf, sentencesOf } from '../planning-repo/handlers/note-lift.ts';
import { parseDuration } from '../presentation/dashboard-pace.ts';
import { buildRouteTable, type RouteTable } from '../presentation/route-table.ts';
import { buildPhaseUrl, buildPlanUrl } from '../presentation/routes.ts';
import {
  createSourceResolver,
  objectiveSentence,
  objectiveText,
  type LedgerMentionDto,
  type LedgerSourceDto,
  type SourceGroup,
} from './document-sources.ts';

const MAX_SECTION_CHARS = 200_000;
const MAX_ENTRIES = 1_000;
const MAX_ENTRY_CHARS = 4_000;

export interface LedgerBlockerDto {
  key: string;
  /** The `**Group**` line the blocker sits under, without a trailing colon or full stop. */
  group: string | null;
  urgent: boolean;
  resolved: boolean;
  /** A caps lead such as `ACTIVE PAUSE`, or the resolution word of a struck-through entry. */
  tag: string | null;
  title: string;
  why: string | null;
  /** The whitespace-collapsed entry, for the Copy text button. */
  text: string;
  sources: LedgerSourceDto[];
  mentions: LedgerMentionDto[];
  moreMentions: number;
}

export interface LedgerDecisionDto {
  key: string;
  /** The phase number as the entry wrote it, padded to two digits, or null. */
  phase: string | null;
  /** The plan, quick task or context document the entry names (`01-02`, `260714-3tp`, `01-CONTEXT`). */
  plan: string | null;
  title: string;
  why: string | null;
  /** The whitespace-collapsed entry, for the Copy text button. */
  text: string;
  /** "Phase 03 · while executing plan 03-01", "No phase", ... */
  logged: string;
  source: LedgerSourceDto | null;
  /** The phase's page, when the entry has a phase that exists. */
  phaseUrl: string | null;
}

/** One plan's recorded duration, rebuilt from its own SUMMARY.md. */
export interface PacePlanDto {
  id: string;
  /** The phase directory's number as written (`01`, `4`). */
  phase: string;
  /** The roadmap's name for the phase. */
  phaseName: string;
  milestone: string | null;
  /** The summary's completed date as YYYY-MM-DD, or null when it has none. */
  date: string | null;
  minutes: number | null;
  approx: boolean;
  /** Why the plan counts as untimed ("wall-clock time", "no duration", ...), or null when timed. */
  untimedReason: string | null;
  tasks: number | null;
  /** Where `minutes` came from: the plan's commits (quick-261018-hbd), its SUMMARY, or nowhere. */
  timing: 'commits' | 'summary' | null;
  /** How many commits timed the plan, when `timing` is 'commits'. */
  commits: number | null;
}

export type TodoSeverity = 'high' | 'medium' | 'low' | 'unrated';

/** A pending todo: a file under todos/pending/, or a bullet of STATE.md's Pending Todos. */
export interface LedgerTodoDto {
  key: string;
  title: string;
  /** The first body paragraph that is not the title (a file-backed todo only). */
  detail: string | null;
  area: string | null;
  severity: TodoSeverity;
  /** The severity or priority as the project wrote it ("major", "P2"), or null. */
  weight: string | null;
  /** YYYY-MM-DD, or null. */
  created: string | null;
  /** Files the todo points at, as written (`src/retry.ts:88-140`). */
  files: string[];
  /** The todo file's page. Null for a STATE.md todo, which has no file. */
  url: string | null;
  /** Documents a STATE.md todo names (empty for a file-backed todo). */
  sources: LedgerSourceDto[];
}

export interface LedgerNoteDto {
  key: string;
  title: string;
  detail: string | null;
  /** "2026-10-17 09:12", "2026-10-16", or the file name's date. */
  date: string;
  promoted: boolean;
  url: string;
}

/** A row of STATE.md's Quick Tasks Completed table: a quick task (a folder id) or a fast one. */
export interface LedgerTaskDto {
  key: string;
  id: string;
  kind: 'quick' | 'fast';
  /** YYYY-MM-DD. */
  date: string;
  title: string;
  status: string | null;
  commit: string | null;
  /** The quick task's PLAN and SUMMARY pages, only where those files exist. */
  planUrl: string | null;
  summaryUrl: string | null;
}

/** Work queued after the next step: a plan not yet summarised, or a phase not yet finished. */
export interface LedgerQueueItemDto {
  kind: 'plan' | 'phase';
  /** The plan id (`03-02`), or "Phase 4". */
  id: string;
  label: string;
  title: string;
  detail: string | null;
  url: string;
}

export interface DashboardLedgerDto {
  blockers: LedgerBlockerDto[];
  /** Newest first. */
  decisions: LedgerDecisionDto[];
  pace: { current: string | null; plans: PacePlanDto[] };
  /** Highest severity first, newest first within a level. */
  todos: { items: LedgerTodoDto[]; done: number };
  /** Newest first. */
  notes: LedgerNoteDto[];
  /** Newest first. */
  recent: LedgerTaskDto[];
  queue: LedgerQueueItemDto[];
}

export function emptyLedger(): DashboardLedgerDto {
  return {
    blockers: [],
    decisions: [],
    pace: { current: null, plans: [] },
    todos: { items: [], done: 0 },
    notes: [],
    recent: [],
    queue: [],
  };
}

interface Bullet {
  text: string;
  group: SourceGroup | null;
}

function sectionBody(project: Project, field: string): string | null {
  const state = Object.values(project.artifacts).find((artifact) => artifact.kind === 'state');
  const section = state?.structured[field];
  if (section === null || typeof section !== 'object') return null;
  const body = (section as { body?: unknown }).body;
  return typeof body === 'string' ? body.slice(0, MAX_SECTION_CHARS) : null;
}

const ABSENT_MARKERS = new Set(['none', 'none yet', '*(none)*', 'no blockers', 'n/a']);

function isPlaceholder(text: string): boolean {
  return ABSENT_MARKERS.has(text.trim().replace(/\.$/, '').toLowerCase());
}

/** Top-level bullets joined with their wrapped and nested continuation lines, each with the
 * `**Group**` line it sits under. A non-bullet bold line starts a group; a blank line closes the
 * entry being read. */
function readBullets(body: string): Bullet[] {
  const bullets: Bullet[] = [];
  let group: SourceGroup | null = null;
  let current: Bullet | null = null;
  for (const line of body.split('\n')) {
    const bold = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (bold && !/^ ?[-*+]\s/.test(line)) {
      group = { name: bold[1].replace(/[:.]$/, ''), note: bold[2].slice(0, MAX_ENTRY_CHARS) || null };
      current = null;
      continue;
    }
    const bullet = line.match(/^ ?[-*+]\s+(.*)$/);
    if (bullet) {
      if (bullets.length >= MAX_ENTRIES) break;
      current = { text: bullet[1].slice(0, MAX_ENTRY_CHARS), group };
      bullets.push(current);
      continue;
    }
    if (current && /^\s+\S/.test(line)) {
      if (current.text.length < MAX_ENTRY_CHARS) {
        current.text = `${current.text} ${line.trim().replace(/^[-*+]\s+/, '')}`.slice(0, MAX_ENTRY_CHARS);
      }
    } else if (!line.trim()) {
      current = null;
    }
  }
  return bullets
    .map((bullet) => ({ ...bullet, text: bullet.text.replace(/\s+/g, ' ').trim() }))
    .filter((bullet) => bullet.text.length > 0 && !isPlaceholder(bullet.text));
}

/** "**Lead.** rest", else "title — why", else the whole thing as the title. */
function splitTitle(text: string): { title: string; why: string | null } {
  const bold = text.match(/^\*\*(.+?)\*\*[\s:—-]*(.*)$/);
  if (bold) return { title: bold[1].replace(/[.:]$/, ''), why: bold[2] || null };
  const dash = text.indexOf(' — ');
  if (dash > 0) return { title: text.slice(0, dash), why: text.slice(dash + 3) };
  return { title: text, why: null };
}

/** Strips leading whitespace, symbols and emoji, and collapses whitespace. */
function cleanText(text: string): string {
  return text
    .replace(/^(?:[\s☀-➿\u{1F300}-\u{1FAFF}]|️)+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ParsedBlocker {
  urgent: boolean;
  resolved: boolean;
  tag: string | null;
  title: string;
  why: string | null;
}

function parseBlocker(raw: string): ParsedBlocker {
  const urgent = /^\s*⚠/.test(raw) || /\bexpires?\b|\bbefore 20\d\d-\d\d-\d\d/.test(raw);
  let text = cleanText(raw);
  let tag: string | null = null;
  // "~~old~~ **RESOLVED 2026-06-30:** how": struck through and marked resolved in place.
  const struck = text.match(/^~~(.+?)~~\s*\*\*([A-Z][A-Z +]+?)(?:\s+[\d-]+)?:?\*\*:?\s*(.*)$/);
  if (struck) {
    return {
      urgent: false,
      resolved: true,
      tag: struck[2].split(/\s*\+\s*/)[0],
      title: struck[1].replace(/^[A-Z][A-Z ]+ — /, ''),
      why: struck[3] || null,
    };
  }
  // "**ACTIVE PAUSE — title:** rest": the caps lead is a tag.
  const lead = text.match(/^\*\*([A-Z][A-Z ]{2,}?)(?: — |\s+(?=[a-z]))/);
  if (lead) {
    tag = lead[1].trim();
    text = `**${text.slice(lead[0].length)}`;
  }
  const resolved = /\b(COMPLETE|RESOLVED|CLOSED)\b/.test(text.slice(0, 120));
  const parts = splitTitle(text.replace(/^\*\*(.)/, (_match, first: string) => `**${first.toUpperCase()}`));
  // A long plain blocker: its first sentence is the title, the rest is the detail.
  if (!parts.why && text.length > 140) {
    const sentence = text.match(/^(.{30,}?[.!?])\s+(.+)$/);
    if (sentence) return { urgent, resolved, tag, title: sentence[1], why: sentence[2] };
  }
  return { urgent, resolved, tag, ...parts };
}

const DECISION_PLAN_ID = /^(\d+(?:\.\d+)?-(?:\d+|CONTEXT|RESEARCH)|\d{6}-[a-z0-9]{3})\s*:\s*(.*)$/i;

interface ParsedDecision {
  phase: string | null;
  plan: string | null;
  title: string;
  why: string | null;
}

/** A decision bullet: "[Phase 05]: 05-02: **Title** — why", with the tag and the plan id each
 * optional, a `[Quick id]` nested under `[Phase ?]`, and a plan id used as the tag itself. */
function parseDecision(text: string): ParsedDecision {
  const tag = text.match(/^\[Phase\s+([^\]]*)\]:\s*(.*)$/i);
  const quickTag = (tag ? tag[2] : text).match(/^\[Quick\s+(\d{6}-[a-z0-9]{3})[^\]]*\]:\s*(.*)$/i);
  if (quickTag) return { phase: null, plan: quickTag[1], ...splitTitle(quickTag[2]) };
  let tagValue = tag ? tag[1] : null;
  const tagPlan = tagValue?.trim().match(/^(?:quick-)?(\d{6}-[a-z0-9]{3}|\d+(?:\.\d+)?-\d+)$/i) ?? null;
  if (tagPlan) tagValue = /^\d{6}-/.test(tagPlan[1]) ? '?' : tagPlan[1].split('-')[0];
  const rest = tag ? tag[2] : text;
  const plan = rest.match(DECISION_PLAN_ID);
  const body = plan ? plan[2] : rest;
  const raw =
    tagValue !== null && tagValue.trim() !== '?'
      ? tagValue
      : plan && !/^\d{6}-/.test(plan[1])
        ? plan[1].split('-')[0]
        : null;
  const phase = raw ? String(+raw || raw).padStart(2, '0') : null;
  const id = plan ? plan[1] : tagPlan ? tagPlan[1] : null;
  return { phase, plan: id, ...splitTitle(body) };
}

function loggedOf(phase: string | null, plan: string | null): string {
  const where = phase ? `Phase ${phase}` : 'No phase';
  if (!plan) return where;
  if (/CONTEXT|RESEARCH/i.test(plan)) return `${where} · while gathering context`;
  if (/^\d{6}-/.test(plan)) return `${where} · during quick task ${plan}`;
  return `${where} · while executing plan ${plan}`;
}

function isoDay(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value !== 'string') return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d\d-\d\d$/.test(day) ? day : null;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function taskCount(planBody: string | undefined, summary: Record<string, unknown>): number | null {
  const counted = ((planBody ?? '').slice(0, MAX_SECTION_CHARS).match(/<task\b/g) ?? []).length;
  if (counted > 0) return counted;
  const metrics = recordOf(summary.metrics);
  const authored = Number(metrics?.tasks_completed ?? summary.tasks_completed ?? 0);
  return Number.isFinite(authored) && authored > 0 ? authored : null;
}

/** Every phase plan's recorded duration, from the plan's own SUMMARY.md rather than STATE.md's
 * hand-appended metrics table: `duration` and `completed`, top level or under `metrics`. */
function paceOf(project: Project): { current: string | null; plans: PacePlanDto[] } {
  const state = Object.values(project.artifacts).find((artifact) => artifact.kind === 'state');
  const milestone = state?.frontmatter.milestone;
  const current = typeof milestone === 'string' && milestone.trim() ? milestone.trim() : null;
  const plans: PacePlanDto[] = [];
  for (const entry of project.milestones) {
    for (const phase of entry.phases) {
      for (const plan of phase.plans) {
        if (!plan.summary) continue;
        const summary = plan.summary.frontmatter;
        const metrics = recordOf(summary.metrics);
        const parsed = parseDuration(summary.duration ?? metrics?.duration);
        plans.push({
          id: plan.id,
          phase: phase.identity.number,
          phaseName: phase.name,
          milestone: entry.version,
          date: isoDay(summary.completed ?? metrics?.completed),
          minutes: parsed.minutes,
          approx: parsed.approx,
          untimedReason: parsed.untimedReason,
          tasks: taskCount(phase.artifacts[plan.path]?.body, summary),
          timing: parsed.minutes === null ? null : 'summary',
          commits: null,
        });
      }
    }
  }
  const text = (value: string | null) => value ?? '';
  plans.sort(
    (left, right) =>
      (left.date ?? '9').localeCompare(right.date ?? '9') ||
      text(left.milestone).localeCompare(text(right.milestone)) ||
      left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
  return { current, plans };
}

const baseName = (path: string): string => path.split('/').pop() ?? path;
const SEVERITY_RANK: Record<TodoSeverity, number> = { high: 0, medium: 1, low: 2, unrated: 3 };

/** Todo severity however a project spells it ("severity: major", "priority: P2"), as three levels. */
export function severityOf(weight: string | null): TodoSeverity {
  if (/^(blocker|critical|major|high|p0|p1)$/i.test(weight ?? '')) return 'high';
  if (/^(medium|moderate|normal|p2)$/i.test(weight ?? '')) return 'medium';
  if (/^(minor|low|cosmetic|trivial|p3|p4)$/i.test(weight ?? '')) return 'low';
  return 'unrated';
}

function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** The first body paragraph that is not a heading or a quote, whitespace collapsed. */
function paragraphsOf(body: string): string[] {
  return body
    .slice(0, MAX_SECTION_CHARS)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !paragraph.startsWith('#'));
}

function artifactsUnder(project: Project, prefix: string, resolverHas: (path: string) => boolean): Artifact[] {
  return Object.values(project.artifacts)
    .filter((artifact) => artifact.path.startsWith(prefix) && artifact.path.endsWith('.md') && resolverHas(artifact.path))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

function dayOf(value: unknown): string | null {
  return isoDay(value);
}

function todosOf(
  project: Project,
  resolver: ReturnType<typeof createSourceResolver>,
): { items: LedgerTodoDto[]; done: number } {
  const has = (path: string) => resolver.artifactUrl(path) !== null;
  const files = artifactsUnder(project, '.planning/todos/pending/', has).map((artifact, index): LedgerTodoDto => {
    const front = artifact.frontmatter;
    const title = textOf(front.title) ?? baseName(artifact.path).replace(/\.md$/, '');
    const paragraph = paragraphsOf(artifact.body).find((candidate) => !candidate.startsWith('>'));
    const detail = paragraph?.replace(/\s+/g, ' ');
    const weight = textOf(front.severity) ?? textOf(front.priority);
    return {
      key: `todo-file-${index}`,
      title,
      detail: detail && detail !== title ? detail : null,
      area: textOf(front.area) ?? textOf(front.theme),
      severity: severityOf(weight),
      weight,
      created: dayOf(front.created) ?? dayOf(front.date),
      files: Array.isArray(front.files) ? front.files.filter((file): file is string => typeof file === 'string') : [],
      url: resolver.artifactUrl(artifact.path),
      sources: [],
    };
  });
  const body = sectionBody(project, 'pendingTodos');
  const listed = body
    ? readBullets(body).map(
        (bullet, index): LedgerTodoDto => ({
          key: `todo-state-${index}`,
          title: bullet.text,
          detail: null,
          area: null,
          severity: 'unrated',
          weight: null,
          created: null,
          files: [],
          url: null,
          sources: resolver.sourcesOf(bullet.text, bullet.group).sources,
        }),
      )
    : [];
  const items = [...files, ...listed].sort(
    (left, right) =>
      SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity] ||
      (right.created ?? '').localeCompare(left.created ?? ''),
  );
  const done =
    artifactsUnder(project, '.planning/todos/done/', has).length +
    artifactsUnder(project, '.planning/todos/completed/', has).length;
  return { items, done };
}

function notesOf(project: Project, resolver: ReturnType<typeof createSourceResolver>): LedgerNoteDto[] {
  const has = (path: string) => resolver.artifactUrl(path) !== null;
  return artifactsUnder(project, '.planning/notes/', has)
    .map((artifact, index): LedgerNoteDto => {
      const front = artifact.frontmatter;
      const paragraphs = paragraphsOf(artifact.body);
      const name = baseName(artifact.path);
      // An untitled note whose opening paragraph runs past one sentence is the note itself, not its
      // title: name it from the file and lead the detail with that paragraph's first sentence.
      const lead = textOf(front.title) ? null : paragraphs.shift() ?? null;
      const leadSentences = lead === null ? [] : sentencesOf(lead);
      const multiSentence = leadSentences.length > 1;
      const title = textOf(front.title) ?? (multiSentence ? null : lead) ?? fileTitleOf(artifact.path) ?? name;
      const date = front.date instanceof Date
        ? Number.isNaN(front.date.getTime())
          ? null
          : front.date.toISOString().slice(0, 16).replace('T', ' ')
        : textOf(front.date)?.slice(0, 16) ?? null;
      const context = textOf(front.context) ?? (multiSentence ? leadSentences[0] : paragraphs[0]) ?? null;
      return {
        key: `note-${index}`,
        title: title.replace(/\s+/g, ' '),
        detail: context ? context.replace(/\s+/g, ' ') : null,
        date: (date ?? name.slice(0, 10)).replace(' 00:00', ''),
        promoted: front.promoted === true,
        url: resolver.artifactUrl(artifact.path) ?? '',
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}

const lowerKeys = (row: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), typeof value === 'string' ? value.trim() : '']),
  );

/** The rows of STATE.md's Quick Tasks Completed table with a valid date, newest first. */
function recentOf(project: Project, resolver: ReturnType<typeof createSourceResolver>): LedgerTaskDto[] {
  const state = Object.values(project.artifacts).find((artifact) => artifact.kind === 'state');
  const rows = state?.structured.quickTasksCompleted;
  if (!Array.isArray(rows)) return [];
  const tasks: (LedgerTaskDto & { order: number })[] = [];
  rows.slice(0, MAX_ENTRIES).forEach((raw, order) => {
    if (raw === null || typeof raw !== 'object') return;
    const row = lowerKeys(raw as Record<string, unknown>);
    const date = (row.date ?? '').match(/^\d{4}-\d\d-\d\d/)?.[0];
    const id = row['#'] ?? '';
    if (!date || !id) return;
    const folder = (row.directory ?? '').slice(0, 400).match(/\]\(([^)]+)\)/)?.[1]?.replace(/\/$/, '').split('/').pop();
    const quick =
      project.quickTasks.find((candidate) => folder && baseName(candidate.path) === folder) ??
      project.quickTasks.find((candidate) => candidate.id === id) ??
      null;
    const artifactOf = (suffix: string) =>
      quick ? Object.values(quick.artifacts).find((artifact) => artifact.path.endsWith(suffix)) : undefined;
    const planPath = artifactOf('-PLAN.md')?.path;
    const summaryPath = artifactOf('-SUMMARY.md')?.path;
    const status = (row.status ?? '').replace(/^[—-]$/, '');
    tasks.push({
      key: `task-${order}`,
      id,
      kind: /^\d{6}-[a-z0-9]{3}$/.test(id) ? 'quick' : 'fast',
      date,
      title: splitTitle((row.description ?? '').replace(/\*\*/g, '')).title,
      status: status ? status.replace(/\*\*/g, '').split(/[(;—:.,]/)[0].trim().slice(0, 28) || null : null,
      commit: (row.commit ?? '').match(/[0-9a-f]{7}/)?.[0] ?? null,
      planUrl: planPath ? resolver.artifactUrl(planPath) : null,
      summaryUrl: summaryPath ? resolver.artifactUrl(summaryPath) : null,
      order,
    });
  });
  return tasks
    .sort((left, right) => right.date.localeCompare(left.date) || right.order - left.order)
    .map(({ order: _order, ...task }) => task);
}

/** Unfinished plans from the current phase on, then phases that are not finished and have no plan
 * queued. The reader does not parse ROADMAP's checklist bullets, so "unchecked" reads as "not
 * finished": a live phase that is not complete. */
function queueOf(project: Project, resolver: ReturnType<typeof createSourceResolver>): LedgerQueueItemDto[] {
  const state = Object.values(project.artifacts).find((artifact) => artifact.kind === 'state');
  const current = parseFloat(String(state?.frontmatter.current_phase ?? ''));
  if (Number.isNaN(current)) return [];
  const phases: Phase[] = project.milestones
    .filter((milestone) => !milestone.archived)
    .flatMap((milestone) => milestone.phases)
    .filter((phase) => parseFloat(phase.identity.number) >= current)
    .sort((left, right) => parseFloat(left.identity.number) - parseFloat(right.identity.number));
  const queue: LedgerQueueItemDto[] = [];
  const queued = new Set<string>();
  for (const phase of phases) {
    const open = phase.plans
      .filter((plan) => plan.summary === null)
      .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
    for (const plan of open) {
      const body = phase.artifacts[plan.path]?.body ?? '';
      queued.add(phase.identity.number);
      queue.push({
        kind: 'plan',
        id: plan.id,
        label: plan.id,
        title: objectiveSentence(body) ?? objectiveText(body) ?? baseName(plan.path),
        detail: null,
        url: resolver.artifactUrl(plan.path) ?? buildPlanUrl(phase.identity, plan.id),
      });
    }
  }
  for (const phase of phases) {
    if (phase.roadmapComplete === true || phase.diskStatus === 'complete') continue;
    if (queued.has(phase.identity.number)) continue;
    const number = parseFloat(phase.identity.number);
    if (number === current && queue.length > 0) continue;
    const label = `Phase ${phase.identity.number.replace(/^0+(?=\d)/, '')}`;
    queue.push({ kind: 'phase', id: label, label, title: phase.name, detail: phase.goal, url: buildPhaseUrl(phase.identity) });
  }
  return queue;
}

export function buildDashboardLedger(
  project: Project,
  routeTable: RouteTable = buildRouteTable(project),
): DashboardLedgerDto {
  const resolver = createSourceResolver(project, routeTable);
  const blockersBody = sectionBody(project, 'blockersConcerns');
  const blockers = blockersBody
    ? readBullets(blockersBody).map((bullet, index): LedgerBlockerDto => {
        const parsed = parseBlocker(bullet.text);
        const trail = resolver.sourcesOf(bullet.text, bullet.group);
        return {
          key: `blocker-${index}`,
          group: bullet.group?.name ?? null,
          ...parsed,
          text: bullet.text,
          ...trail,
        };
      })
    : [];
  const decisionsBody = sectionBody(project, 'decisions');
  const decisions = decisionsBody
    ? readBullets(decisionsBody)
        .map((bullet, index): LedgerDecisionDto => {
          const parsed = parseDecision(bullet.text);
          return {
            key: `decision-${index}`,
            ...parsed,
            text: bullet.text,
            logged: loggedOf(parsed.phase, parsed.plan),
            source: resolver.decisionSource(parsed.plan),
            phaseUrl: parsed.phase ? resolver.phaseUrl(parsed.phase) : null,
          };
        })
        .reverse()
    : [];
  return {
    blockers,
    decisions,
    pace: paceOf(project),
    todos: todosOf(project, resolver),
    notes: notesOf(project, resolver),
    recent: recentOf(project, resolver),
    queue: queueOf(project, resolver),
  };
}
