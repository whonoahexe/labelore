// The quick-jump palette's resolver (Phase 13, 13-01): a typed string in, grouped rows out. Pure - no I/O,
// no React, never throws, and it reads only the presentation (and the search hits and bodies) it is handed,
// so one request's rows come from one project's ready bundle and never from the filesystem (D-17).
//
// The group contract: JumpGroupKey names every group in its fixed order (exact, ids, pages, files, content).
// The Exact producers cover decision, finding, requirement, plan and quick-task ids; the IDs group completes
// a partial id by prefix; 13-04 adds the Pages and Files producers, all inside buildJumpGroups and all filling
// the same JumpRow shape, and the palette host renders whatever groups come back. Like search.ts, this module never imports server/search-index.ts: the search hits are
// the structural SearchHitLike.
import { ID_PATTERNS } from '../planning-repo/mentions.ts';
import { parseMilestoneQuickDirName, parseQuickDirName } from '../planning-repo/naming.ts';
import type {
  ArtifactDto,
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
} from '../server/project-presentation.ts';
import { decisionAnchor, findingAnchor, requirementAnchor } from './jump-anchors.ts';
import { headPhaseOf, displayPhaseNumber } from './dashboard-head.ts';
import { rootDocumentRedirect } from './root-redirects.ts';
import { buildPhaseUrl } from './routes.ts';
import { extractSnippets } from './search.ts';
import { compareNatural } from './search-facets.ts';
import type { SearchHighlightRange, SearchHitLike, SearchSnippet } from './search.ts';

export type JumpGroupKey = 'exact' | 'ids' | 'pages' | 'files' | 'content';

export type JumpRowKind =
  | 'decision'
  | 'finding'
  | 'requirement'
  | 'mention'
  | 'plan'
  | 'quick'
  | 'page'
  | 'file'
  | 'content';

export interface JumpChip {
  label: string;
  tone: 'complete' | 'quiet';
}

export interface JumpRow {
  /** Unique within one response; the palette's React key. */
  key: string;
  kind: JumpRowKind;
  /** The ID as the file writes it, for an ID row; else null. */
  id: string | null;
  title: string;
  subtitle: string;
  /** A project-relative address, server-built. */
  url: string;
  /** The element id the page scrolls to (jump-anchors.ts), or null. */
  anchor: string | null;
  chips: JumpChip[];
  artifactKind: string | null;
  phaseKey: string | null;
  titleHighlights: SearchHighlightRange[];
  subtitleHighlights: SearchHighlightRange[];
  snippet: SearchSnippet | null;
}

export interface JumpGroup {
  key: JumpGroupKey;
  rows: JumpRow[];
}

/** A file the palette may offer to open (the Files producer, 13-04). */
export interface JumpDocument {
  path: string;
  title: string;
  kind: string;
  url: string;
}

export interface JumpInput {
  query: string;
  presentation: ProjectPresentation;
  documents: readonly JumpDocument[];
  contentHits: readonly SearchHitLike[];
  /** The indexed body of a path, or null when the file has none. */
  bodyOf: (path: string) => string | null;
  /** The address the palette was opened on (untrusted; see viewingPhaseKey). */
  from: string;
}

export interface JumpResult {
  groups: JumpGroup[];
  contentTotal: number;
  /** The upper-cased ID the user typed when it has an ID shape and resolves to nothing, else null. */
  notFoundId: string | null;
}

/** UI-SPEC caps, settled: how many rows each group shows. */
export const JUMP_GROUP_CAPS: Readonly<Record<JumpGroupKey, number>> = {
  exact: 8,
  ids: 12,
  pages: 5,
  files: 6,
  content: 5,
};

export const JUMP_GROUP_LABELS: Readonly<Record<JumpGroupKey, string>> = {
  exact: 'Exact match',
  ids: 'IDs',
  pages: 'Pages',
  files: 'Files',
  content: 'Content matches',
};

/** The longest `from` address the resolver looks at. */
export const MAX_FROM_LENGTH = 512;
/** The longest query an exact ID compare runs for. */
export const MAX_ID_LENGTH = 32;

const GROUP_ORDER: readonly JumpGroupKey[] = ['exact', 'ids', 'pages', 'files', 'content'];
const TITLE_MAX = 140;
// Anchored, bounded shapes: a query that fits neither is not an ID.
const DECISION_SHAPE = /^D-\d{1,4}$/i;
const FINDING_SHAPE = /^[A-Z]{2}-\d{1,4}$/i;

/** 'Phase 5' ('05' reads 5, '2.1' stays 2.1), prefixed with the milestone version and ' · ' when the milestone
 * is archived. */
export function phaseLabelOf(phase: PhaseDto, milestone: MilestoneDto): string {
  const number = displayPhaseNumber(phase.identity.number) ?? phase.identity.number;
  const label = `Phase ${number}`;
  return milestone.archived ? `${milestone.version ?? milestone.name} · ${label}` : label;
}

// A control character in an address is never one the router produced.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * The phase the palette was opened on, or null. `from` is untrusted: it is used only when it is a plain
 * absolute path (one leading '/', at most MAX_FROM_LENGTH characters, no control characters), and even then
 * it is only compared with addresses already in the presentation - never turned into a path, never read.
 */
export function viewingPhaseKey(presentation: ProjectPresentation, from: unknown): string | null {
  if (typeof from !== 'string') return null;
  if (from.length === 0 || from.length > MAX_FROM_LENGTH) return null;
  if (!from.startsWith('/') || from.startsWith('//')) return null;
  if (CONTROL_CHARACTER.test(from)) return null;
  const cut = from.search(/[?#]/);
  const address = cut < 0 ? from : from.slice(0, cut);

  const artifact = presentation.artifacts.find((candidate) => candidate.key === address);
  if (artifact?.phaseKey) return artifact.phaseKey;

  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      for (const plan of phase.plans) {
        if (plan.key === address || plan.summary?.key === address) return phase.key;
      }
    }
  }

  let best: { key: string; length: number } | null = null;
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      const url = buildPhaseUrl(phase.identity);
      if (address === url || address.startsWith(`${url}/`)) {
        if (best === null || url.length > best.length) best = { key: phase.key, length: url.length };
      }
    }
  }
  return best?.key ?? null;
}

/** D-04: the phase you are viewing, else STATE's current phase, else null. */
export function currentPhaseKey(presentation: ProjectPresentation, from: unknown): string | null {
  return viewingPhaseKey(presentation, from) ?? headPhaseOf(presentation)?.key ?? null;
}

interface PhasePlace {
  phase: PhaseDto;
  milestone: MilestoneDto;
  /** 0.. for the live milestones in order, then the archived ones newest first. */
  rank: number;
  /** The phase's position in its milestone. */
  index: number;
}

function phasePlaces(presentation: ProjectPresentation): Map<string, PhasePlace> {
  const live = presentation.milestones.filter((milestone) => !milestone.archived);
  // presentation.milestones carries the archived ones version-ascending, so reverse for newest first.
  const archived = presentation.milestones.filter((milestone) => milestone.archived).reverse();
  const places = new Map<string, PhasePlace>();
  [...live, ...archived].forEach((milestone, rank) => {
    milestone.phases.forEach((phase, index) => {
      places.set(phase.key, { phase, milestone, rank, index });
    });
  });
  return places;
}

/** One line of plain text: whitespace runs collapse, emphasis markers and backticks go, long text is cut. */
function oneLine(text: string): string {
  const flat = text
    .replace(/\s+/g, ' ')
    .replace(/[*_`]/g, '')
    .trim();
  return flat.length > TITLE_MAX ? `${flat.slice(0, TITLE_MAX - 1).trimEnd()}…` : flat;
}


interface IdEntry {
  id: string;
  title: string;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** The entries of `list` that carry a string id and a string `titleField`, one per id. */
function idEntries(list: unknown, titleField: string): IdEntry[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: IdEntry[] = [];
  for (const raw of list) {
    const entry = recordOf(raw);
    if (entry === null) continue;
    const id = entry.id;
    const title = entry[titleField];
    if (typeof id !== 'string' || id.length === 0 || typeof title !== 'string') continue;
    const folded = id.toUpperCase();
    if (seen.has(folded)) continue;
    seen.add(folded);
    out.push({ id, title });
  }
  return out;
}

/** Every finding id the review page anchors: structured.review.findings (the projection
 * composeReviewThreads reads), else, for a review with no such projection, structured.warnings. */
function findingEntries(structured: Record<string, unknown>): IdEntry[] {
  const review = recordOf(structured.review);
  if (review !== null) return idEntries(review.findings, 'title');
  return idEntries(structured.warnings, 'title');
}

interface Site {
  kind: 'decision' | 'finding';
  id: string;
  title: string;
  artifactPath: string;
  artifactKey: string;
  artifactKind: string;
  artifactTitle: string;
  phaseKey: string | null;
}

/** Every definition site of the ids `matches` accepts, walked straight from the artifacts: the reference
 * registry's resolution maps collapse a repeated ID to null, which would lose every site but one. */
function idSites(presentation: ProjectPresentation, matches: (id: string) => boolean): Site[] {
  const sites: Site[] = [];
  for (const artifact of presentation.artifacts) {
    let kind: Site['kind'];
    let entries: IdEntry[];
    if (artifact.kind === 'context') {
      kind = 'decision';
      entries = idEntries(artifact.structured.decisions, 'text');
    } else if (artifact.kind === 'review') {
      kind = 'finding';
      entries = findingEntries(artifact.structured);
    } else {
      continue;
    }
    for (const entry of entries) {
      if (!matches(entry.id)) continue;
      sites.push({
        kind,
        id: entry.id,
        title: entry.title,
        artifactPath: artifact.path,
        artifactKey: artifact.key,
        artifactKind: artifact.kind,
        artifactTitle: artifact.title,
        phaseKey: artifact.phaseKey,
      });
    }
  }
  return sites;
}

const NO_PHASE = Number.MAX_SAFE_INTEGER;

/** What D-04 needs to order anything that belongs to a phase: the phase's place, and the current phase. */
interface Ordering {
  places: Map<string, PhasePlace>;
  current: string | null;
}

/** The D-04 sort key of a phase: the current phase, then live milestones in order, then archived newest first.
 * A thing with no phase sorts after every phase. */
function orderKeyOf(ordering: Ordering, phaseKey: string | null): [number, number, number] {
  if (phaseKey !== null && phaseKey === ordering.current) return [0, 0, 0];
  const place = phaseKey === null ? undefined : ordering.places.get(phaseKey);
  return place === undefined ? [1, NO_PHASE, 0] : [1, place.rank, place.index];
}

function compareOrder(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Sorts `items` by the D-04 phase order, then by `tie` text. */
function sortByPhase<T>(
  items: readonly T[],
  ordering: Ordering,
  phaseKeyOf: (item: T) => string | null,
  tie: (item: T) => string,
): T[] {
  return items
    .map((item) => ({ item, order: orderKeyOf(ordering, phaseKeyOf(item)), tie: tie(item) }))
    .sort((left, right) => compareOrder(left.order, right.order) || compareText(left.tie, right.tie))
    .map((entry) => entry.item);
}

/** The first row of an Exact group carries the Exact chip; the others a quiet label saying where they are. */
function leadChips(position: number, quietLabel: string | null): JumpChip[] {
  if (position === 0) return [{ label: 'Exact', tone: 'complete' }];
  return quietLabel === null ? [] : [{ label: quietLabel, tone: 'quiet' }];
}

function exactRows(input: JumpInput, query: string, ordering: Ordering): JumpRow[] {
  if (query.length === 0 || query.length > MAX_ID_LENGTH) return [];
  const folded = query.toUpperCase();
  const sites = idSites(input.presentation, (id) => id.toUpperCase() === folded);
  if (sites.length === 0) return [];

  const ordered = sortByPhase(
    sites,
    ordering,
    (site) => site.phaseKey,
    (site) => site.artifactPath,
  ).slice(0, JUMP_GROUP_CAPS.exact);

  return ordered.map((site, position) => {
    const where = site.kind === 'decision' ? 'CONTEXT' : 'REVIEW';
    const place = site.phaseKey === null ? undefined : ordering.places.get(site.phaseKey);
    const phaseLabel = place ? phaseLabelOf(place.phase, place.milestone) : null;
    return {
      key: `exact:${site.kind}:${site.artifactPath}:${site.id}`,
      kind: site.kind,
      id: site.id,
      title: oneLine(site.title),
      subtitle: phaseLabel === null ? site.artifactTitle : `${phaseLabel} · ${where}`,
      url: site.artifactKey,
      anchor: site.kind === 'decision' ? decisionAnchor(site.id) : findingAnchor(site.id),
      chips: leadChips(position, phaseLabel),
      artifactKind: site.artifactKind,
      phaseKey: site.phaseKey,
      titleHighlights: [],
      subtitleHighlights: [],
      snippet: null,
    };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Requirement, plan and quick-task ids (13-04, D-06). Each has one destination; the shapes are disjoint
// (a requirement starts with a letter, a plan with two or three digits, a quick id with six), so the
// producers never compete, except that a finding id beats a requirement id (RESEARCH open question 3).

/** The key prefix the mention index files a requirement's mentions under (domain/model.ts: scheme + ':' + id). */
const REQUIREMENT_MENTION_PREFIX = 'requirement:';
/** The definition file a requirement's own row already opens. */
const ROOT_REQUIREMENTS_PATH = '.planning/REQUIREMENTS.md';
const PLAN_SHAPE = /^(\d{2,3})-(\d{2,3})$/;
const QUICK_SHAPE = /^\d{6}-[a-z0-9]{2,6}$/i;
// The prefix-completion shape: a short run of letters and digits, an optional hyphen, a short tail. Anchored
// and bounded, and only run on a query of at most MAX_ID_LENGTH characters (T-13-11).
const IDS_SHAPE = /^[A-Za-z0-9]{1,24}-?[A-Za-z0-9]{0,8}$/;

function requirementUrl(id: string): string {
  return `/traceability?q=${encodeURIComponent(id)}`;
}

function requirementRows(input: JumpInput, query: string, ordering: Ordering): JumpRow[] {
  const folded = query.toUpperCase();
  const requirement = input.presentation.requirements.find((entry) => entry.id.toUpperCase() === folded);
  if (requirement === undefined) return [];

  const covered = requirement.coveringPhases.length > 0;
  const definition: JumpRow = {
    key: `exact:requirement:${requirement.id}`,
    kind: 'requirement',
    id: requirement.id,
    title: oneLine(requirement.text),
    subtitle: 'Definition and traceability',
    url: requirementUrl(requirement.id),
    anchor: requirementAnchor(requirement.id),
    chips: [covered ? { label: 'Covered', tone: 'complete' } : { label: 'Not covered', tone: 'quiet' }],
    artifactKind: null,
    phaseKey: null,
    titleHighlights: [],
    subtitleHighlights: [],
    snippet: null,
  };

  // Files that merely mention the id follow the definition, marked Mentions, never as coverage (D-06).
  const artifactsByPath = new Map(input.presentation.artifacts.map((artifact) => [artifact.path, artifact]));
  const mentions = input.presentation.mentions?.byId?.[`${REQUIREMENT_MENTION_PREFIX}${requirement.id}`] ?? [];
  const seen = new Set<string>();
  const mentioning: ArtifactDto[] = [];
  for (const mention of mentions) {
    if (mention.artifactPath === ROOT_REQUIREMENTS_PATH || seen.has(mention.artifactPath)) continue;
    const artifact = artifactsByPath.get(mention.artifactPath);
    if (artifact === undefined) continue;
    seen.add(mention.artifactPath);
    mentioning.push(artifact);
  }
  // Current phase first (D-04), then by path: a mention is a pointer, not a place in the roadmap.
  const current = ordering.current;
  mentioning.sort(
    (left, right) =>
      Number(right.phaseKey === current && current !== null) - Number(left.phaseKey === current && current !== null) ||
      compareText(left.path, right.path),
  );

  const rows = mentioning.slice(0, JUMP_GROUP_CAPS.exact - 1).map<JumpRow>((artifact) => ({
    key: `exact:mention:${artifact.path}`,
    kind: 'mention',
    id: null,
    title: artifact.title,
    subtitle: artifact.path,
    url: rootDocumentRedirect(artifact) ?? artifact.key,
    anchor: null,
    chips: [{ label: 'Mentions', tone: 'quiet' }],
    artifactKind: artifact.kind,
    phaseKey: artifact.phaseKey,
    titleHighlights: [],
    subtitleHighlights: [],
    snippet: null,
  }));
  return [definition, ...rows];
}

interface PlanPlace {
  plan: PlanDto;
  phase: PhaseDto;
  milestone: MilestoneDto;
}

function plansOf(presentation: ProjectPresentation): PlanPlace[] {
  const out: PlanPlace[] = [];
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      for (const plan of phase.plans) out.push({ plan, phase, milestone });
    }
  }
  return out;
}

/** 'Plan 6' for plan number '06'; a number that is not plain digits stays as written. */
function planLabelOf(plan: PlanDto): string {
  const number = /^\d+$/.test(plan.planNumber) ? String(Number(plan.planNumber)) : plan.planNumber;
  return `Plan ${number}`;
}

function planRow(
  entry: PlanPlace,
  artifactsByKey: Map<string, ArtifactDto>,
  chips: JumpChip[],
  subtitle: string,
  keyPrefix: string,
): JumpRow {
  const artifact = artifactsByKey.get(entry.plan.key);
  return {
    key: `${keyPrefix}:plan:${entry.plan.key}`,
    kind: 'plan',
    id: entry.plan.id,
    title: oneLine(entry.plan.description ?? artifact?.title ?? entry.plan.id),
    subtitle,
    url: entry.plan.key,
    anchor: null,
    chips,
    artifactKind: artifact?.kind ?? 'plan',
    phaseKey: entry.phase.key,
    titleHighlights: [],
    subtitleHighlights: [],
    snippet: null,
  };
}

function planRows(input: JumpInput, query: string, ordering: Ordering): JumpRow[] {
  const shape = PLAN_SHAPE.exec(query);
  if (shape === null) return [];
  const phaseNumber = Number(shape[1]);
  const planNumber = Number(shape[2]);
  const found = plansOf(input.presentation).filter(
    (entry) => Number(entry.phase.identity.number) === phaseNumber && Number(entry.plan.planNumber) === planNumber,
  );
  if (found.length === 0) return [];
  const artifactsByKey = new Map(input.presentation.artifacts.map((artifact) => [artifact.key, artifact]));
  return sortByPhase(
    found,
    ordering,
    (entry) => entry.phase.key,
    (entry) => entry.plan.path,
  )
    .slice(0, JUMP_GROUP_CAPS.exact)
    .map((entry, position) => {
      const phaseLabel = phaseLabelOf(entry.phase, entry.milestone);
      return planRow(entry, artifactsByKey, leadChips(position, phaseLabel), `${phaseLabel} · ${planLabelOf(entry.plan)}`, 'exact');
    });
}

interface QuickTask {
  id: string;
  /** The milestone version of an archived task, else null. */
  version: string | null;
  slug: string;
  artifacts: ArtifactDto[];
}

/** The task folder a quick artifact sits in: live `quick/<dir>/...` or archived `milestones/vX.Y-quick/<dir>/...`. */
function quickFolderOf(artifact: ArtifactDto): { dir: string; version: string | null } | null {
  const segments = artifact.path.split('/');
  let at = -1;
  let version: string | null = null;
  if (artifact.location === 'quick') {
    at = segments.indexOf('quick');
  } else if (artifact.location === 'milestone-root') {
    at = segments.findIndex((segment) => parseMilestoneQuickDirName(segment).matched);
    const parsed = at < 0 ? null : parseMilestoneQuickDirName(segments[at]!);
    version = parsed?.matched ? parsed.version : null;
  }
  // The folder needs a file inside it: a bare file directly in quick/ belongs to no task.
  if (at < 0 || at + 2 >= segments.length) return null;
  return { dir: segments[at + 1]!, version };
}

/** Every quick task, from the artifacts that sit in a task folder. Live tasks first, then archived. */
function quickTasksOf(presentation: ProjectPresentation): QuickTask[] {
  const tasks = new Map<string, QuickTask>();
  for (const artifact of presentation.artifacts) {
    const folder = quickFolderOf(artifact);
    if (folder === null) continue;
    const name = parseQuickDirName(folder.dir);
    if (!name.matched) continue;
    const id = `${name.date}-${name.timeToken}`;
    const key = `${folder.version ?? ''}|${id}`;
    const task = tasks.get(key) ?? { id, version: folder.version, slug: name.slug, artifacts: [] };
    task.artifacts.push(artifact);
    tasks.set(key, task);
  }
  return [...tasks.values()].sort(
    (left, right) =>
      Number(left.version !== null) - Number(right.version !== null) ||
      compareText(left.version ?? '', right.version ?? '') ||
      compareNatural(left.id, right.id),
  );
}

/** The page a quick task opens: its PLAN's address (/quick/<id>), else its first artifact by path. */
function quickTarget(task: QuickTask): ArtifactDto {
  const plan = task.artifacts.find((artifact) => artifact.key === `/quick/${task.id}`);
  return plan ?? [...task.artifacts].sort((left, right) => compareText(left.path, right.path))[0]!;
}

/** The task's title: its PLAN's title, else the readable folder slug (a PLAN with no title is titled by its path). */
function quickTitleOf(task: QuickTask): string {
  const plan = task.artifacts.find((artifact) => artifact.key === `/quick/${task.id}`);
  if (plan !== undefined && plan.title.trim().length > 0 && plan.title !== plan.path) return plan.title;
  const spaced = task.slug.replace(/-/g, ' ').trim();
  return spaced.length === 0 ? task.id : `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

function quickWhere(task: QuickTask): string {
  return task.version === null ? 'Quick task' : `Quick task · ${task.version}`;
}

function quickRow(task: QuickTask, chips: JumpChip[], keyPrefix: string): JumpRow {
  const target = quickTarget(task);
  return {
    key: `${keyPrefix}:quick:${task.version ?? ''}:${task.id}`,
    kind: 'quick',
    id: task.id,
    title: oneLine(quickTitleOf(task)),
    subtitle: quickWhere(task),
    url: target.key,
    anchor: null,
    chips,
    artifactKind: target.kind,
    phaseKey: null,
    titleHighlights: [],
    subtitleHighlights: [],
    snippet: null,
  };
}

function quickRows(input: JumpInput, query: string): JumpRow[] {
  if (!QUICK_SHAPE.test(query)) return [];
  const wanted = query.toLowerCase();
  return quickTasksOf(input.presentation)
    .filter((task) => task.id === wanted)
    .slice(0, JUMP_GROUP_CAPS.exact)
    .map((task, position) => quickRow(task, leadChips(position, task.version), 'exact'));
}

// ---------------------------------------------------------------------------------------------------------
// The IDs group (13-04, D-07): a partial id completes by prefix, one row per distinct id.

interface IdsSite {
  kind: JumpRowKind;
  id: string;
  title: string;
  where: string;
  url: string;
  anchor: string | null;
  artifactKind: string | null;
  phaseKey: string | null;
}

function idsRows(input: JumpInput, query: string, ordering: Ordering): JumpRow[] {
  if (query.length < 2 || query.length > MAX_ID_LENGTH || !IDS_SHAPE.test(query)) return [];
  const prefix = query.toUpperCase();
  const startsWith = (id: string): boolean => id.toUpperCase().startsWith(prefix);
  const presentation = input.presentation;
  const bySite = new Map<string, IdsSite[]>();
  const add = (site: IdsSite): void => {
    const key = site.id.toUpperCase();
    const list = bySite.get(key);
    if (list === undefined) bySite.set(key, [site]);
    else list.push(site);
  };

  for (const requirement of presentation.requirements) {
    if (!startsWith(requirement.id)) continue;
    add({
      kind: 'requirement',
      id: requirement.id,
      title: requirement.text,
      where: 'Requirement',
      url: requirementUrl(requirement.id),
      anchor: requirementAnchor(requirement.id),
      artifactKind: null,
      phaseKey: null,
    });
  }
  for (const site of idSites(presentation, startsWith)) {
    const place = site.phaseKey === null ? undefined : ordering.places.get(site.phaseKey);
    const where = site.kind === 'decision' ? 'CONTEXT' : 'REVIEW';
    add({
      kind: site.kind,
      id: site.id,
      title: site.title,
      where: place ? `${phaseLabelOf(place.phase, place.milestone)} · ${where}` : site.artifactTitle,
      url: site.artifactKey,
      anchor: site.kind === 'decision' ? decisionAnchor(site.id) : findingAnchor(site.id),
      artifactKind: site.artifactKind,
      phaseKey: site.phaseKey,
    });
  }
  const artifactsByKey = new Map(presentation.artifacts.map((artifact) => [artifact.key, artifact]));
  for (const entry of plansOf(presentation)) {
    if (!startsWith(entry.plan.id)) continue;
    add({
      kind: 'plan',
      id: entry.plan.id,
      title: entry.plan.description ?? artifactsByKey.get(entry.plan.key)?.title ?? entry.plan.id,
      where: `${phaseLabelOf(entry.phase, entry.milestone)} · ${planLabelOf(entry.plan)}`,
      url: entry.plan.key,
      anchor: null,
      artifactKind: artifactsByKey.get(entry.plan.key)?.kind ?? 'plan',
      phaseKey: entry.phase.key,
    });
  }
  for (const task of quickTasksOf(presentation)) {
    if (!startsWith(task.id)) continue;
    const target = quickTarget(task);
    add({
      kind: 'quick',
      id: task.id,
      title: quickTitleOf(task),
      where: quickWhere(task),
      url: target.key,
      anchor: null,
      artifactKind: target.kind,
      phaseKey: null,
    });
  }

  return [...bySite.keys()]
    .sort(compareNatural)
    .slice(0, JUMP_GROUP_CAPS.ids)
    .map((key) => {
      const sites = sortByPhase(
        bySite.get(key)!,
        ordering,
        (site) => site.phaseKey,
        (site) => site.url,
      );
      const first = sites[0]!;
      return {
        key: `ids:${key}`,
        kind: first.kind,
        id: first.id,
        title: oneLine(first.title),
        subtitle:
          sites.length === 1
            ? first.where
            : `Defined in ${sites.length} ${sites.every((site) => site.phaseKey !== null) ? 'phases' : 'places'}`,
        url: first.url,
        anchor: first.anchor,
        chips: [],
        artifactKind: first.artifactKind,
        phaseKey: first.phaseKey,
        titleHighlights: [],
        subtitleHighlights: [],
        snippet: null,
      };
    });
}

/** The canonical id a query has the full shape of (decision, finding, requirement, plan or quick), else null. */
function idShapeOf(query: string): string | null {
  if (query.length === 0 || query.length > MAX_ID_LENGTH) return null;
  if (QUICK_SHAPE.test(query)) return query.toLowerCase();
  const upper = query.toUpperCase();
  if (DECISION_SHAPE.test(query) || FINDING_SHAPE.test(query) || PLAN_SHAPE.test(query)) return upper;
  // The scanner's own requirement grammar, anchored to the whole query: a global match must be the query itself.
  const requirement = upper.match(ID_PATTERNS.requirement);
  return requirement !== null && requirement.length === 1 && requirement[0] === upper ? upper : null;
}

/** The Content group: the first JUMP_GROUP_CAPS.content search hits, each with its first snippet drawn from the
 * indexed body (highlight ranges into plain text, never markup). A root document that has a designed page opens
 * there, the rule search.ts applies to its own rows. */
function contentRows(input: JumpInput): JumpRow[] {
  const artifactsByPath = new Map(input.presentation.artifacts.map((artifact) => [artifact.path, artifact]));
  return input.contentHits.slice(0, JUMP_GROUP_CAPS.content).map((hit) => {
    const body = input.bodyOf(hit.path);
    const snippet = body === null ? null : (extractSnippets(body, hit.matchedTerms).snippets[0] ?? null);
    return {
      key: `content:${hit.path}`,
      kind: 'content',
      id: null,
      title: hit.title,
      subtitle: hit.path,
      url: rootDocumentRedirect(artifactsByPath.get(hit.path)) ?? hit.url,
      anchor: null,
      chips: [],
      artifactKind: hit.kind,
      phaseKey: hit.phaseKey,
      titleHighlights: [],
      subtitleHighlights: [],
      snippet,
    };
  });
}

/**
 * The palette's rows for a typed string. Groups come out in the fixed GROUP_ORDER and a group with no rows
 * is left out. `notFoundId` lets the palette say "No D-99 in this project." instead of a generic no-match
 * line when an ID-shaped query resolves to nothing.
 */
export function buildJumpGroups(input: JumpInput): JumpResult {
  const query = input.query.trim();
  const byGroup: Partial<Record<JumpGroupKey, JumpRow[]>> = {};

  const idQuery = query.length > 0 && query.length <= MAX_ID_LENGTH;
  if (idQuery) {
    const ordering: Ordering = {
      places: phasePlaces(input.presentation),
      current: currentPhaseKey(input.presentation, input.from),
    };
    // Decision and finding ids first: a finding id that also looks like a requirement id is a finding.
    const marked = exactRows(input, query, ordering);
    const exact = [
      ...marked,
      ...(marked.length === 0 ? requirementRows(input, query, ordering) : []),
      ...planRows(input, query, ordering),
      ...quickRows(input, query),
    ].slice(0, JUMP_GROUP_CAPS.exact);
    byGroup.exact = exact;
    if (exact.length === 0) byGroup.ids = idsRows(input, query, ordering);
  }
  byGroup.content = contentRows(input);

  const groups: JumpGroup[] = [];
  for (const key of GROUP_ORDER) {
    const rows = byGroup[key];
    if (rows !== undefined && rows.length > 0) groups.push({ key, rows });
  }

  const resolved = (byGroup.exact ?? []).length > 0 || (byGroup.ids ?? []).length > 0;
  return {
    groups,
    contentTotal: input.contentHits.length,
    notFoundId: resolved ? null : idShapeOf(query),
  };
}
