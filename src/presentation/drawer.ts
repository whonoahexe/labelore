// Pure projection over an already-assembled ProjectPresentation for the planning-files drawer
// (sketch 038 winner C): places on the left (current phases, shipped milestones), the chosen
// place's files on the right. No filesystem I/O, no node:* import, no import from src/web — the
// same discipline as tree.ts. Project-level files (the root documents and research notes) are
// deliberately left out: the dashboard, roadmap, traceability and research pages cover them.
// Everything else the old tree showed still lands in exactly one place, so nothing disappears.
import { comparePhaseNumbers, parseMilestoneFileName, parsePhaseArtifactName } from '../planning-repo/naming.ts';
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
  other: DrawerFileRow[];
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

export interface DrawerViewModel {
  current: { version: string | null; phases: DrawerPhasePlace[] };
  shipped: DrawerMilestonePlace[];
  defaultPlaceKey: string | null;
}

function isMarkdown(artifact: ArtifactDto): boolean {
  return artifact.path.toLowerCase().endsWith('.md');
}

function lastSegment(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? path;
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
    number: phase.identity.number,
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

/** The version a file directly under `.planning/milestones/` belongs to, or null. */
function documentVersionOf(artifact: ArtifactDto): string | null {
  const segments = artifact.path.split('/');
  if (artifact.location !== 'milestone-root' || segments.length !== 3 || segments[1] !== 'milestones') {
    return null;
  }
  const parsed = parseMilestoneFileName(segments[2]);
  return parsed.matched ? parsed.version : null;
}

function documentRankOf(artifact: ArtifactDto): number {
  const parsed = parseMilestoneFileName(lastSegment(artifact.path));
  return parsed.matched ? (MILESTONE_DOC_ORDER[parsed.document] ?? 3) : 3;
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

  // Shipped: every archived milestone, plus any version only known from a milestone document.
  const documentsByVersion = new Map<string, ArtifactDto[]>();
  for (const artifact of markdown) {
    const version = documentVersionOf(artifact);
    if (version === null) continue;
    const list = documentsByVersion.get(version.toLowerCase()) ?? [];
    list.push(artifact);
    documentsByVersion.set(version.toLowerCase(), list);
  }

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
  for (const [lowered, artifacts] of documentsByVersion) {
    if (known.has(lowered) || seen.has(lowered)) continue;
    seen.add(lowered);
    const version = documentVersionOf(artifacts[0]);
    if (version !== null) sources.push({ version, milestone: null });
  }
  sources.sort((left, right) => versionKeyOf(right.version) - versionKeyOf(left.version));

  const shipped: DrawerMilestonePlace[] = sources.map(({ version, milestone }) => {
    const lowered = version.toLowerCase();
    const entry = recordedNames.get(lowered);
    const documents = [...(documentsByVersion.get(lowered) ?? [])]
      .sort((left, right) => documentRankOf(left) - documentRankOf(right) || byPath(left, right))
      .map((artifact) => {
        const parsed = parseMilestoneFileName(lastSegment(artifact.path));
        const row = fileRowOf(artifact);
        return parsed.matched ? { ...row, label: sentenceCase(parsed.document) } : row;
      });
    return {
      kind: 'milestone',
      key: milestone?.key ?? milestoneKeyOf(version),
      url: buildMilestoneUrl(version),
      version,
      name: entry?.name || milestone?.name || version,
      shippedLabel: activityDateLabel(entry?.shipped ?? null, presentation.readAt),
      documents,
      phases: milestone ? sortedPhases(milestone).map((phase) => phasePlaceOf(phase, artifactsByPhase)) : [],
    };
  });

  return {
    current: { version: currentVersion, phases: currentPhases },
    shipped,
    defaultPlaceKey: defaultPlaceKeyOf(presentation, currentPhases, shipped),
  };
}

function defaultPlaceKeyOf(
  presentation: ProjectPresentation,
  currentPhases: DrawerPhasePlace[],
  shipped: DrawerMilestonePlace[],
): string | null {
  const head = headPhaseOf(presentation);
  if (head && currentPhases.some((phase) => phase.key === head.key)) return head.key;
  const unfinished = currentPhases.find((phase) => phase.status.tone !== 'complete');
  if (unfinished) return unfinished.key;
  const last = currentPhases[currentPhases.length - 1];
  if (last) return last.key;
  return shipped[0]?.key ?? null;
}
