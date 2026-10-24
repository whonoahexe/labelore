// Pure projection over an already-assembled ProjectPresentation for the planning-files drawer
// (sketch 038 winner C): places on the left (current phases, shipped milestones), the chosen
// place's files on the right. No filesystem I/O, no node:* import, no import from src/web — the
// same discipline as tree.ts. Project-level files (the root documents and research notes) are
// deliberately left out: the dashboard, roadmap, traceability and research pages cover them.
// Everything else the old tree showed still lands in exactly one place, so nothing disappears.
import {
  comparePhaseNumbers,
  parseMilestoneFileName,
  parseMilestoneQuickDirName,
  parsePhaseArtifactName,
  parseQuickDirName,
} from '../planning-repo/naming.ts';
import type { ArtifactDto, MilestoneDto, PhaseDto, ProjectPresentation } from '../server/project-presentation.ts';
import { artifactWarningTone, type ArtifactWarningTone } from './artifact-warning-tone.ts';
import { activityDateLabel, headPhaseOf } from './dashboard-head.ts';
import { milestoneEntries } from './roadmap.ts';
import { buildMilestoneUrl, buildPhaseUrl, milestoneKeyOf } from './routes.ts';
import {
  MILESTONE_DOC_ORDER,
  POST_PLAN_ARTIFACT_ORDER,
  PRE_PLAN_ARTIFACT_ORDER,
  labelOf,
  quickMonthOf,
  rankOf,
  sentenceCase,
  versionKeyOf,
} from './tree-labels.ts';

export interface DrawerFileRow {
  key: string;
  label: string;
  path: string;
  url: string;
  warningTone: ArtifactWarningTone;
}

export interface DrawerPlanRow {
  key: string;
  label: string;
  /** The plan id, `01-02`. */
  badge: string;
  url: string;
  /** True once the plan's summary exists. */
  done: boolean;
  /** Every page url that belongs to this row: the plan's own page and, when it exists, the summary's. */
  matchUrls: string[];
  warningTone: ArtifactWarningTone;
}

export type DrawerStatusTone = 'complete' | 'active' | 'quiet';

export interface DrawerPhasePlace {
  kind: 'phase';
  key: string;
  url: string;
  milestoneVersion: string | null;
  number: string;
  name: string;
  status: { label: string; tone: DrawerStatusTone };
  done: number;
  total: number;
  before: DrawerFileRow[];
  plans: DrawerPlanRow[];
  after: DrawerFileRow[];
  /** Not listed in the drawer; kept so a page on one of these files still opens the drawer on its phase. */
  other: DrawerFileRow[];
}

export interface DrawerQuickTask {
  key: string;
  label: string;
  /** The task's short date (`Oct 24`); null when its directory name carries none. */
  dateBadge: string | null;
  files: DrawerFileRow[];
}

export interface DrawerQuickPlace {
  kind: 'quick';
  key: string;
  /** The milestone these quick tasks were shipped with; null for the current ones. */
  milestoneVersion: string | null;
  count: number;
  months: { label: string; tasks: DrawerQuickTask[] }[];
}

export interface DrawerMilestonePlace {
  kind: 'milestone';
  key: string;
  url: string;
  version: string;
  name: string;
  shippedLabel: string | null;
  documents: DrawerFileRow[];
  phases: DrawerPhasePlace[];
  quick: DrawerQuickPlace;
}

export interface DrawerViewModel {
  current: { version: string | null; phases: DrawerPhasePlace[]; quick: DrawerQuickPlace };
  shipped: DrawerMilestonePlace[];
  defaultPlaceKey: string | null;
}

/** The key of the current quick-tasks place. */
export const CURRENT_QUICK_KEY = 'quick:current';

function isMarkdown(artifact: ArtifactDto): boolean {
  return artifact.path.toLowerCase().endsWith('.md');
}

function lastSegment(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? path;
}

/** Phases with a directory carry a padded number ("01") and roadmap-only phases a bare one ("3");
 * the drawer pads the whole part to two digits so every row reads the same ("03", "02.1"). */
function displayPhaseNumber(number: string): string {
  return number.replace(/^\d+/, (whole) => whole.padStart(2, '0'));
}

function byPath(left: { path: string }, right: { path: string }): number {
  return left.path.localeCompare(right.path);
}

function fileRowOf(artifact: ArtifactDto): DrawerFileRow {
  return {
    key: artifact.path,
    label: labelOf({ location: artifact.location, nodeType: 'file', path: artifact.path }, null).label,
    path: artifact.path,
    url: artifact.key,
    warningTone: artifactWarningTone(artifact),
  };
}

interface PlacedFile {
  row: DrawerFileRow;
  rank: number;
}

function phaseStatusOf(
  phase: PhaseDto,
  done: number,
  total: number,
  tokens: ReadonlySet<string>,
): { label: string; tone: DrawerStatusTone } {
  if (total > 0) {
    return done === total
      ? { label: 'Complete', tone: 'complete' }
      : { label: 'In progress', tone: 'active' };
  }
  if (phase.roadmapComplete === true) return { label: 'Complete', tone: 'complete' };
  if (tokens.has('RESEARCH')) return { label: 'Researched', tone: 'quiet' };
  if (tokens.has('CONTEXT')) return { label: 'Discussed', tone: 'quiet' };
  return { label: 'Not started', tone: 'quiet' };
}

function phasePlaceOf(phase: PhaseDto, artifactsByPhase: ReadonlyMap<string, ArtifactDto[]>): DrawerPhasePlace {
  const files = artifactsByPhase.get(phase.key) ?? [];
  const byFilePath = new Map(files.map((artifact) => [artifact.path, artifact]));
  const ownedPaths = new Set<string>();

  const plans: DrawerPlanRow[] = phase.plans.map((plan) => {
    ownedPaths.add(plan.path);
    const planArtifact = byFilePath.get(plan.path);
    const summaryArtifact = plan.summary ? byFilePath.get(plan.summary.path) : undefined;
    if (plan.summary) ownedPaths.add(plan.summary.path);
    const matchUrls = [planArtifact?.key, summaryArtifact?.key].filter(
      (url): url is string => url !== undefined,
    );
    return {
      key: plan.key,
      label: `Plan ${plan.planNumber}`,
      badge: plan.id,
      url: plan.key,
      done: plan.summary !== null,
      matchUrls,
      warningTone: planArtifact ? artifactWarningTone(planArtifact) : null,
    };
  });
  const done = plans.filter((plan) => plan.done).length;

  const before: PlacedFile[] = [];
  const after: PlacedFile[] = [];
  const other: DrawerFileRow[] = [];
  const tokens = new Set<string>();
  for (const artifact of files) {
    if (ownedPaths.has(artifact.path)) continue;
    const row = fileRowOf(artifact);
    const parsed = parsePhaseArtifactName(lastSegment(artifact.path));
    if (parsed.matched) {
      tokens.add(parsed.artifact);
      const preIndex = PRE_PLAN_ARTIFACT_ORDER.indexOf(parsed.artifact);
      if (preIndex !== -1) {
        before.push({ row, rank: preIndex });
        continue;
      }
      const postIndex = POST_PLAN_ARTIFACT_ORDER.indexOf(parsed.artifact);
      if (postIndex !== -1) {
        after.push({ row, rank: postIndex });
        continue;
      }
    }
    other.push(row);
  }
  const byRank = (left: PlacedFile, right: PlacedFile) => left.rank - right.rank || byPath(left.row, right.row);

  return {
    kind: 'phase',
    key: phase.key,
    url: buildPhaseUrl(phase.identity),
    milestoneVersion: phase.identity.milestoneVersion,
    number: displayPhaseNumber(phase.identity.number),
    name: phase.name,
    status: phaseStatusOf(phase, done, plans.length, tokens),
    done,
    total: plans.length,
    before: before.sort(byRank).map((placed) => placed.row),
    plans,
    after: after.sort(byRank).map((placed) => placed.row),
    other: other.sort(byPath),
  };
}

function sortedPhases(milestone: MilestoneDto): PhaseDto[] {
  return [...milestone.phases].sort((left, right) =>
    comparePhaseNumbers(left.identity.number, right.identity.number),
  );
}

type MilestoneRootClass =
  | { kind: 'document'; version: string; direct: boolean }
  | { kind: 'quick'; version: string; taskDir: string };

/** Where a milestone-root file belongs: a document of a shipped milestone (a `vX.Y-*.md` file
 * directly under `.planning/milestones/`, or anything inside another `vX.Y-<name>/` directory), or
 * a quick task archived with it (`vX.Y-quick/<task>/...`). Null when no version can be recovered. */
function classifyMilestoneRoot(artifact: ArtifactDto): MilestoneRootClass | null {
  const segments = artifact.path.split('/');
  if (artifact.location !== 'milestone-root' || segments[1] !== 'milestones') return null;
  if (segments.length === 3) {
    const parsed = parseMilestoneFileName(segments[2]);
    return parsed.matched ? { kind: 'document', version: parsed.version, direct: true } : null;
  }
  if (segments.length < 4) return null;
  const quick = parseMilestoneQuickDirName(segments[2]);
  if (quick.matched) {
    // A file sitting directly in vX.Y-quick/ is a one-file task of its own.
    const taskDir = segments.length === 4 ? artifact.path : segments.slice(0, 4).join('/');
    return { kind: 'quick', version: quick.version, taskDir };
  }
  const named = parseMilestoneFileName(`${segments[2]}.md`);
  return named.matched ? { kind: 'document', version: named.version, direct: false } : null;
}

function documentRankOf(artifact: ArtifactDto): number {
  if (artifact.path.split('/').length !== 3) return 4;
  const parsed = parseMilestoneFileName(lastSegment(artifact.path));
  return parsed.matched ? (MILESTONE_DOC_ORDER[parsed.document] ?? 3) : 3;
}

/** Groups quick-task files by their task and lays the tasks out newest first, one group per month. */
function quickPlaceOf(
  key: string,
  milestoneVersion: string | null,
  filesByTask: ReadonlyMap<string, ArtifactDto[]>,
): DrawerQuickPlace {
  interface Task {
    task: DrawerQuickTask;
    month: string;
    rank: number;
  }
  const tasks: Task[] = [];
  for (const [taskDir, artifacts] of filesByTask) {
    const isFile = taskDir.toLowerCase().endsWith('.md');
    const segment = lastSegment(taskDir);
    const parsedDir = isFile ? ({ matched: false } as const) : parseQuickDirName(segment);
    const { label, badge } = labelOf({ location: 'quick', nodeType: isFile ? 'file' : 'directory', path: taskDir }, null);
    const files = artifacts
      .map((artifact) => ({
        row: fileRowOf(artifact),
        rank: rankOf({ location: 'quick', nodeType: 'file', path: artifact.path }),
      }))
      .sort((left, right) => left.rank - right.rank || byPath(left.row, right.row))
      .map((placed) => placed.row);
    tasks.push({
      task: { key: taskDir, label, dateBadge: badge, files },
      month: (parsedDir.matched ? quickMonthOf(parsedDir.date) : null) ?? 'Undated',
      rank: rankOf({ location: 'quick', nodeType: isFile ? 'file' : 'directory', path: taskDir }),
    });
  }
  tasks.sort(
    (left, right) =>
      left.rank - right.rank || lastSegment(left.task.key).localeCompare(lastSegment(right.task.key)),
  );
  const months: DrawerQuickPlace['months'] = [];
  for (const { task, month } of tasks) {
    const last = months[months.length - 1];
    if (last && last.label === month) last.tasks.push(task);
    else months.push({ label: month, tasks: [task] });
  }
  return { kind: 'quick', key, milestoneVersion, count: tasks.length, months };
}

export function buildDrawerViewModel(presentation: ProjectPresentation): DrawerViewModel {
  const markdown = presentation.artifacts.filter(isMarkdown);

  const artifactsByPhase = new Map<string, ArtifactDto[]>();
  for (const artifact of markdown) {
    if (artifact.location !== 'phase' && artifact.location !== 'archived-phase') continue;
    if (artifact.phaseKey === null) continue;
    const list = artifactsByPhase.get(artifact.phaseKey) ?? [];
    list.push(artifact);
    artifactsByPhase.set(artifact.phaseKey, list);
  }

  // Current: the phases of every milestone that has not shipped.
  const liveMilestones = presentation.milestones.filter((milestone) => !milestone.archived);
  const currentPhases = liveMilestones.flatMap((milestone) =>
    sortedPhases(milestone).map((phase) => phasePlaceOf(phase, artifactsByPhase)),
  );
  const stateMilestone = presentation.state?.milestone?.trim() || null;
  const currentVersion =
    liveMilestones.find((milestone) => milestone.version !== null && milestone.version === stateMilestone)?.version ??
    liveMilestones.find((milestone) => milestone.version !== null)?.version ??
    null;

  // Quick tasks: the current ones live in .planning/quick/, a shipped milestone's in
  // .planning/milestones/vX.Y-quick/. A task is the directory right under either root, or a
  // markdown file sitting directly there.
  const currentQuickFiles = new Map<string, ArtifactDto[]>();
  const quickFilesByVersion = new Map<string, Map<string, ArtifactDto[]>>();
  const documentsByVersion = new Map<string, ArtifactDto[]>();
  const versionNames = new Map<string, string>();
  for (const artifact of markdown) {
    if (artifact.location === 'quick') {
      const segments = artifact.path.split('/');
      if (segments.length < 3) continue;
      const taskDir = segments.slice(0, 3).join('/');
      currentQuickFiles.set(taskDir, [...(currentQuickFiles.get(taskDir) ?? []), artifact]);
      continue;
    }
    const placed = classifyMilestoneRoot(artifact);
    if (placed === null) continue;
    const lowered = placed.version.toLowerCase();
    if (!versionNames.has(lowered)) versionNames.set(lowered, placed.version);
    if (placed.kind === 'document') {
      documentsByVersion.set(lowered, [...(documentsByVersion.get(lowered) ?? []), artifact]);
    } else {
      const byTask = quickFilesByVersion.get(lowered) ?? new Map<string, ArtifactDto[]>();
      byTask.set(placed.taskDir, [...(byTask.get(placed.taskDir) ?? []), artifact]);
      quickFilesByVersion.set(lowered, byTask);
    }
  }

  // Shipped: every archived milestone, plus any version only known from its documents or quick tasks.
  const recordedNames = new Map(
    milestoneEntries(presentation).map((entry) => [entry.version.toLowerCase(), entry] as const),
  );
  const known = new Set(
    presentation.milestones
      .map((milestone) => milestone.version?.toLowerCase())
      .filter((version): version is string => version !== undefined),
  );
  interface ShippedSource {
    version: string;
    milestone: MilestoneDto | null;
  }
  const sources: ShippedSource[] = [];
  const seen = new Set<string>();
  for (const milestone of presentation.milestones) {
    if (!milestone.archived || milestone.version === null) continue;
    const lowered = milestone.version.toLowerCase();
    if (seen.has(lowered)) continue;
    seen.add(lowered);
    sources.push({ version: milestone.version, milestone });
  }
  for (const [lowered, version] of versionNames) {
    if (known.has(lowered) || seen.has(lowered)) continue;
    seen.add(lowered);
    sources.push({ version, milestone: null });
  }
  sources.sort((left, right) => versionKeyOf(right.version) - versionKeyOf(left.version));

  const shipped: DrawerMilestonePlace[] = sources.map(({ version, milestone }) => {
    const lowered = version.toLowerCase();
    const entry = recordedNames.get(lowered);
    const key = milestone?.key ?? milestoneKeyOf(version);
    const documents = [...(documentsByVersion.get(lowered) ?? [])]
      .sort((left, right) => documentRankOf(left) - documentRankOf(right) || byPath(left, right))
      .map((artifact) => {
        const parsed = parseMilestoneFileName(lastSegment(artifact.path));
        const row = fileRowOf(artifact);
        return parsed.matched && artifact.path.split('/').length === 3
          ? { ...row, label: sentenceCase(parsed.document) }
          : row;
      });
    return {
      kind: 'milestone',
      key,
      url: buildMilestoneUrl(version),
      version,
      name: entry?.name || milestone?.name || version,
      shippedLabel: activityDateLabel(entry?.shipped ?? null, presentation.readAt),
      documents,
      phases: milestone ? sortedPhases(milestone).map((phase) => phasePlaceOf(phase, artifactsByPhase)) : [],
      quick: quickPlaceOf(`quick:${key}`, version, quickFilesByVersion.get(lowered) ?? new Map()),
    };
  });

  const currentQuick = quickPlaceOf(CURRENT_QUICK_KEY, null, currentQuickFiles);
  return {
    current: { version: currentVersion, phases: currentPhases, quick: currentQuick },
    shipped,
    defaultPlaceKey: defaultPlaceKeyOf(presentation, currentPhases, currentQuick, shipped),
  };
}

function defaultPlaceKeyOf(
  presentation: ProjectPresentation,
  currentPhases: DrawerPhasePlace[],
  currentQuick: DrawerQuickPlace,
  shipped: DrawerMilestonePlace[],
): string | null {
  const head = headPhaseOf(presentation);
  if (head && currentPhases.some((phase) => phase.key === head.key)) return head.key;
  const unfinished = currentPhases.find((phase) => phase.status.tone !== 'complete');
  if (unfinished) return unfinished.key;
  const last = currentPhases[currentPhases.length - 1];
  if (last) return last.key;
  if (currentQuick.count > 0) return currentQuick.key;
  return shipped[0]?.key ?? currentQuick.key;
}
