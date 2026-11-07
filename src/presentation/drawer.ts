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
  parseQuickArtifactName,
} from '../planning-repo/naming.ts';
import type { FileClass } from '../domain/model.ts';
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
  /** Text, image, binary or large: the view reads it to mark a file that has no readable body. */
  fileClass: FileClass;
  /** The file's size on disk in bytes. */
  sizeBytes: number;
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
  /** Where the task's row goes: its PLAN, else its SUMMARY, else its first file. */
  url: string;
  files: DrawerFileRow[];
}

/** One milestone's quick tasks, newest first. */
export interface DrawerQuickGroup {
  key: string;
  /** True for the tasks in .planning/quick/, which belong to the milestone still in progress. */
  current: boolean;
  /** The milestone's version; null for current tasks when no live milestone has one. */
  version: string | null;
  /** A shipped milestone's recorded name; null for the current group. */
  name: string | null;
  tasks: DrawerQuickTask[];
}

/** Every quick task in one place, grouped by milestone: the current ones first, then each shipped
 * milestone's, newest first. A milestone with no quick tasks has no group. */
export interface DrawerQuickPlace {
  kind: 'quick';
  key: string;
  count: number;
  groups: DrawerQuickGroup[];
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
}

/** The drawer's two groups inside a workstream scope (Phase 11, 11-32, D-12; sketch 056 C): the files the scope shares
 * with the whole project, and the workstream's own. Present only on a workstream-scoped drawer; a flat project's
 * model has no such field at all (not an empty one), so it is exactly what it was. */
export interface DrawerScopeGroups {
  /** The open workstream. */
  name: string;
  /** Project-level files the scope overlays (PROJECT.md, config.json, codebase/, research/, todos/, milestones/),
   * whose `url` is the project's own address: the drawer links them outside the scope. */
  shared: DrawerFileRow[];
  /** The workstream's own files (ROADMAP.md, STATE.md, REQUIREMENTS.md, phases/, its own config.json), whose `url` is
   * inside the scope. */
  own: DrawerFileRow[];
}

export interface DrawerViewModel {
  current: { version: string | null; phases: DrawerPhasePlace[] };
  shipped: DrawerMilestonePlace[];
  quick: DrawerQuickPlace;
  defaultPlaceKey: string | null;
  scopeGroups?: DrawerScopeGroups;
}

/** The key of the one quick-tasks place. */
export const QUICK_KEY = 'quick';

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

function byFileName(left: { path: string }, right: { path: string }): number {
  return lastSegment(left.path).localeCompare(lastSegment(right.path));
}

// A phase folder's After stage lists the known post-plan documents first (ranks 0..5 from
// POST_PLAN_ARTIFACT_ORDER), then the recognised unprefixed files, then the non-text files (images,
// binaries, large files), each group alphabetical by file name. These ranks sit past every post-plan rank.
const UNPREFIXED_RANK = 1_000;
const NON_TEXT_RANK = 2_000;
// Unprefixed files GSD leaves in a phase folder; the label is the sentence-case of the kind.
const UNPREFIXED_KINDS: ReadonlySet<string> = new Set(['coverage', 'deferred-items', 'skeleton', 'continue-here']);

function fileRowOf(artifact: ArtifactDto): DrawerFileRow {
  return {
    key: artifact.path,
    label: labelOf({ location: artifact.location, nodeType: 'file', path: artifact.path }, null).label,
    path: artifact.path,
    url: artifact.key,
    warningTone: artifactWarningTone(artifact),
    fileClass: artifact.fileClass,
    sizeBytes: artifact.sizeBytes,
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
    } else if (UNPREFIXED_KINDS.has(artifact.kind)) {
      after.push({ row: { ...row, label: sentenceCase(artifact.kind) }, rank: UNPREFIXED_RANK });
      continue;
    }
    if (artifact.fileClass !== 'text') {
      // An image, binary, large or listed file reads by its full file name, extension included.
      after.push({ row: { ...row, label: lastSegment(artifact.path) }, rank: NON_TEXT_RANK });
      continue;
    }
    other.push(row);
  }
  const byRank = (left: PlacedFile, right: PlacedFile) =>
    left.rank - right.rank || (left.rank >= UNPREFIXED_RANK ? byFileName : byPath)(left.row, right.row);

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

/** Groups one milestone's quick-task files by their task and lays the tasks out newest first. */
function quickTasksOf(filesByTask: ReadonlyMap<string, ArtifactDto[]>): DrawerQuickTask[] {
  const tasks: { task: DrawerQuickTask; rank: number }[] = [];
  for (const [taskDir, artifacts] of filesByTask) {
    const isFile = taskDir.toLowerCase().endsWith('.md');
    const { label, badge } = labelOf({ location: 'quick', nodeType: isFile ? 'file' : 'directory', path: taskDir }, null);
    const files = artifacts
      .map((artifact) => ({
        row: fileRowOf(artifact),
        rank: rankOf({ location: 'quick', nodeType: 'file', path: artifact.path }),
      }))
      .sort((left, right) => left.rank - right.rank || byPath(left.row, right.row))
      .map((placed) => placed.row);
    const named = (artifact: string) =>
      files.find((row) => {
        const parsed = parseQuickArtifactName(lastSegment(row.path));
        return parsed.matched && parsed.artifact === artifact;
      });
    const url = (named('PLAN') ?? named('SUMMARY') ?? files[0]).url;
    tasks.push({
      task: { key: taskDir, label, dateBadge: badge, url, files },
      rank: rankOf({ location: 'quick', nodeType: isFile ? 'file' : 'directory', path: taskDir }),
    });
  }
  return tasks
    .sort(
      (left, right) =>
        left.rank - right.rank || lastSegment(left.task.key).localeCompare(lastSegment(right.task.key)),
    )
    .map(({ task }) => task);
}

const WORKSTREAMS_BASE = '.planning/workstreams/';
/** The root names a workstream carries instead of the project's, in the order the sketch draws them. */
const OWN_FILE_ORDER = ['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md'];
const SHARED_FILE_ORDER = ['PROJECT.md', 'config.json'];
const SHARED_DIR_ORDER = ['milestones', 'research', 'codebase', 'todos'];
/** The folder GSD archives a completed workstream into: the index's Completed bar lists these, not the drawer. */
const ARCHIVE_FOLDER = /^ws-.+-\d{4}-\d{2}-\d{2}(?:-\d{1,3})?$/;

function scopeNameOf(artifacts: readonly ArtifactDto[]): string | null {
  for (const artifact of artifacts) {
    if (artifact.realPath?.startsWith(WORKSTREAMS_BASE)) {
      const name = artifact.realPath.slice(WORKSTREAMS_BASE.length).split('/')[0];
      if (name) return name;
    }
  }
  return null;
}

function indexIn(order: readonly string[], value: string): number {
  const index = order.indexOf(value);
  return index < 0 ? order.length : index;
}

/** Splits a workstream-scoped presentation's artifacts on where each one really lives (`realPath`): under
 * `.planning/workstreams/{name}/` is the workstream's own, everything else at the project root is shared. Only the
 * files a person looks for are listed (the root files, the shared folders' files, one row per phase folder); quick
 * tasks and the phases' own files already have their places below. */
function scopeGroupsOf(
  presentation: ProjectPresentation,
  phaseUrls: ReadonlyMap<string, string>,
  scopeName: string | undefined,
): DrawerScopeGroups | undefined {
  const artifacts = presentation.artifacts;
  if (!artifacts.some((artifact) => artifact.realPath !== undefined)) return undefined;
  const name = scopeName ?? scopeNameOf(artifacts);
  if (name === undefined || name === null) return undefined;
  const base = `${WORKSTREAMS_BASE}${name}/`;

  const shared: { row: DrawerFileRow; rank: number; sub: string }[] = [];
  const ownFiles: { row: DrawerFileRow; rank: number }[] = [];
  const ownPhases = new Map<string, DrawerFileRow>();
  for (const artifact of artifacts) {
    const real = artifact.realPath;
    if (real === undefined) continue;
    if (real.startsWith(base)) {
      const rest = real.slice(base.length);
      const slash = rest.indexOf('/');
      if (slash < 0) {
        ownFiles.push({
          row: { ...fileRowOf(artifact), label: rest },
          rank: OWN_FILE_ORDER.includes(rest) ? OWN_FILE_ORDER.indexOf(rest) : rest === 'config.json' ? 100 : 200,
        });
      } else if (rest.startsWith('phases/')) {
        const dir = rest.split('/')[1];
        if (dir === undefined || dir === '' || rest.split('/').length < 3) continue;
        if (ownPhases.has(dir)) continue;
        const url = (artifact.phaseKey !== null ? phaseUrls.get(artifact.phaseKey) : undefined) ?? artifact.key;
        ownPhases.set(dir, {
          key: `${base}phases/${dir}`,
          label: `phases/${dir}`,
          path: `${base}phases/${dir}`,
          url,
          warningTone: null,
          fileClass: 'text',
          sizeBytes: 0,
        });
      }
      continue;
    }
    // A shared file: a root file of .planning/, or a file of one of the shared folders.
    if (!real.startsWith('.planning/')) continue;
    const rest = real.slice('.planning/'.length);
    const slash = rest.indexOf('/');
    if (slash < 0) {
      if (!SHARED_FILE_ORDER.includes(rest)) continue;
      shared.push({ row: { ...fileRowOf(artifact), label: rest }, rank: indexIn(SHARED_FILE_ORDER, rest), sub: rest });
      continue;
    }
    const dir = rest.slice(0, slash);
    if (!SHARED_DIR_ORDER.includes(dir)) continue;
    if (dir === 'milestones' && ARCHIVE_FOLDER.test(rest.slice(slash + 1).split('/')[0] ?? '')) continue;
    shared.push({
      row: { ...fileRowOf(artifact), label: rest },
      rank: SHARED_FILE_ORDER.length + indexIn(SHARED_DIR_ORDER, dir),
      sub: rest,
    });
  }

  shared.sort((left, right) => left.rank - right.rank || left.sub.localeCompare(right.sub));
  const own = [
    ...ownFiles.filter((file) => file.rank < OWN_FILE_ORDER.length).sort((left, right) => left.rank - right.rank),
    ...[...ownPhases.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, row]) => ({ row, rank: 50 })),
    ...ownFiles
      .filter((file) => file.rank >= OWN_FILE_ORDER.length)
      .sort((left, right) => left.rank - right.rank || left.row.label.localeCompare(right.row.label)),
  ];
  return { name, shared: shared.map((entry) => entry.row), own: own.map((entry) => entry.row) };
}

/** `scope` is the open workstream's name when the presentation is a scope's (the server knows it); otherwise it is read
 * from the artifacts' `realPath`. A flat project's presentation carries neither, and its model has no `scopeGroups`. */
export function buildDrawerViewModel(presentation: ProjectPresentation, scope?: string): DrawerViewModel {
  const markdown = presentation.artifacts.filter(isMarkdown);

  // A phase folder lists its markdown and every file that has no readable body; quick-task and milestone
  // places keep the markdown-only filter.
  const artifactsByPhase = new Map<string, ArtifactDto[]>();
  for (const artifact of presentation.artifacts) {
    if (artifact.location !== 'phase' && artifact.location !== 'archived-phase') continue;
    if (artifact.phaseKey === null) continue;
    if (!isMarkdown(artifact) && artifact.fileClass === 'text') continue;
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
  // markdown file sitting directly there. A README in either is about the folder, not a task, and
  // is left out of the drawer.
  const isReadme = (artifact: ArtifactDto) => lastSegment(artifact.path).toLowerCase() === 'readme.md';
  const currentQuickFiles = new Map<string, ArtifactDto[]>();
  const quickFilesByVersion = new Map<string, Map<string, ArtifactDto[]>>();
  const documentsByVersion = new Map<string, ArtifactDto[]>();
  const versionNames = new Map<string, string>();
  for (const artifact of markdown) {
    if (artifact.location === 'quick') {
      const segments = artifact.path.split('/');
      if (segments.length < 3 || isReadme(artifact)) continue;
      const taskDir = segments.slice(0, 3).join('/');
      currentQuickFiles.set(taskDir, [...(currentQuickFiles.get(taskDir) ?? []), artifact]);
      continue;
    }
    const placed = classifyMilestoneRoot(artifact);
    if (placed === null || (placed.kind === 'quick' && isReadme(artifact))) continue;
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
      // UI-SPEC section 6: a milestone named as a destination links to its roadmap with no redirect hop.
      url: milestone?.roadmapUrl ?? buildMilestoneUrl(version),
      version,
      name: entry?.name || milestone?.name || version,
      shippedLabel: activityDateLabel(entry?.shipped ?? null, presentation.readAt),
      documents,
      phases: milestone ? sortedPhases(milestone).map((phase) => phasePlaceOf(phase, artifactsByPhase)) : [],
    };
  });

  const groups: DrawerQuickGroup[] = [
    { key: 'quick:current', current: true, version: currentVersion, name: null, tasks: quickTasksOf(currentQuickFiles) },
    ...shipped.map((milestone) => ({
      key: `quick:${milestone.key}`,
      current: false,
      version: milestone.version,
      name: milestone.name,
      tasks: quickTasksOf(quickFilesByVersion.get(milestone.version.toLowerCase()) ?? new Map()),
    })),
  ].filter((group) => group.tasks.length > 0);
  const quick: DrawerQuickPlace = {
    kind: 'quick',
    key: QUICK_KEY,
    count: groups.reduce((sum, group) => sum + group.tasks.length, 0),
    groups,
  };
  const phaseUrls = new Map(
    [...currentPhases, ...shipped.flatMap((milestone) => milestone.phases)].map((phase) => [phase.key, phase.url] as const),
  );
  const scopeGroups = scopeGroupsOf(presentation, phaseUrls, scope);
  return {
    current: { version: currentVersion, phases: currentPhases },
    shipped,
    quick,
    defaultPlaceKey: defaultPlaceKeyOf(presentation, currentPhases, quick, shipped),
    ...(scopeGroups ? { scopeGroups } : {}),
  };
}

function defaultPlaceKeyOf(
  presentation: ProjectPresentation,
  currentPhases: DrawerPhasePlace[],
  quick: DrawerQuickPlace,
  shipped: DrawerMilestonePlace[],
): string | null {
  const head = headPhaseOf(presentation);
  if (head && currentPhases.some((phase) => phase.key === head.key)) return head.key;
  const unfinished = currentPhases.find((phase) => phase.status.tone !== 'complete');
  if (unfinished) return unfinished.key;
  const last = currentPhases[currentPhases.length - 1];
  if (last) return last.key;
  if (quick.groups.some((group) => group.current)) return quick.key;
  return shipped[0]?.key ?? quick.key;
}
