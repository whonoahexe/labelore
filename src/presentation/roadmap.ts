import type { MilestoneEntry } from '../planning-repo/handlers/milestones.ts';
import type {
  RetroPoint,
  RetroSectionKey,
  RetrospectiveEntry,
} from '../planning-repo/handlers/retrospective.ts';

export type { RetroPoint, RetroSectionKey };
import { comparePhaseNumbers } from '../planning-repo/naming.ts';
import type {
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
} from '../server/project-presentation.ts';
import { activityDateLabel } from './dashboard-head.ts';
import { buildMilestoneUrl, buildPhaseUrl, buildPlanUrl } from './routes.ts';

export interface RoadmapPlanRow {
  key: string;
  url: string;
  id: string;
  planNumber: string;
  description: string | null;
  complete: boolean;
  blockedBy: string[];
}

export interface WaveBand {
  key: string;
  label: string;
  authoredValue: unknown;
  unspecified: boolean;
  plans: RoadmapPlanRow[];
}

export interface RoadmapPhaseRow {
  key: string;
  url: string;
  milestoneKey: string;
  number: string;
  name: string;
  archived: boolean;
  goal: string | null;
  authoredDependencies: string | null;
  formalStatus: string | null;
  observedStatus: string;
  progress: PhaseDto['formalPlanProgress'];
  observedProgress: { completed: number; total: number };
  progressDisagreement: boolean;
  successCriteria: string[];
  requirements: Array<{
    id: string;
    text: string | null;
    checked: boolean | null;
    url: string | null;
  }>;
  waveBands: WaveBand[];
}

/** A milestone's entry in MILESTONES.md: what shipped, when, and what the author noted at close. */
export interface MilestoneRecord {
  name: string;
  /** "21 Sep 2026", or null when the entry carries no ship date. */
  shipped: string | null;
  /** The heading's parenthetical when it is not a ship date, e.g. "In Progress". */
  status: string | null;
  /** Days from start to ship, or null when nothing in the entry or the file dates it. */
  days: number | null;
  delivered: string | null;
  accomplishments: string[];
  stats: { text: string; items: string[] } | null;
  gitRange: string | null;
  whatsNext: string | null;
}

/** A milestone's RETROSPECTIVE.md section: its four point lists, always in this order, an absent
 * subsection as an empty list. */
export interface MilestoneRetrospective {
  sections: Array<{ key: RetroSectionKey; label: string; points: RetroPoint[] }>;
}

export interface MilestoneFlow {
  key: string;
  url: string;
  version: string | null;
  name: string;
  archived: boolean;
  empty: boolean;
  phases: RoadmapPhaseRow[];
  /** The milestone's MILESTONES.md entry, matched by version; null when there is none. */
  record: MilestoneRecord | null;
  /** The milestone's RETROSPECTIVE.md section, matched by version; null when there is none or it
   * has no points. */
  retrospective: MilestoneRetrospective | null;
}

export interface RoadmapViewModel {
  readAt: string;
  projectName: string | null;
  active: MilestoneFlow | null;
  history: MilestoneFlow[];
}

interface WaveIdentity {
  key: string;
  label: string;
  authoredValue: unknown;
  unspecified: boolean;
  sortValue: string;
}

function authoredWave(plan: PlanDto): WaveIdentity {
  if (!Object.prototype.hasOwnProperty.call(plan.frontmatter, 'wave')) {
    return {
      key: 'unspecified',
      label: 'Unspecified',
      authoredValue: undefined,
      unspecified: true,
      sortValue: '',
    };
  }
  const value = plan.frontmatter.wave;
  const display =
    typeof value === 'string'
      ? value.length > 0
        ? value
        : "''"
      : typeof value === 'number' || typeof value === 'boolean' || value === null
        ? String(value)
        : (JSON.stringify(value) ?? String(value));
  return {
    key: `authored:${JSON.stringify(value)}`,
    label: `Wave ${display}`,
    authoredValue: value,
    unspecified: false,
    sortValue: display,
  };
}

function compareWaves(left: WaveIdentity, right: WaveIdentity): number {
  if (left.unspecified !== right.unspecified) return left.unspecified ? 1 : -1;
  const leftNumeric = /^\d+[A-Z]?(?:\.\d+)*$/.test(left.sortValue);
  const rightNumeric = /^\d+[A-Z]?(?:\.\d+)*$/.test(right.sortValue);
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  if (leftNumeric && rightNumeric) {
    const compared = comparePhaseNumbers(left.sortValue, right.sortValue);
    if (compared !== 0) return compared;
  }
  return left.sortValue.localeCompare(right.sortValue, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function blockedBy(plan: PlanDto, siblings: ReadonlyMap<string, PlanDto>): string[] {
  return plan.dependsOn.flatMap((dependency) => {
    const target = dependency.targetPlanKey ? siblings.get(dependency.targetPlanKey) : null;
    return target?.complete ? [] : [dependency.raw];
  });
}

function waveBands(phase: PhaseDto): WaveBand[] {
  const siblings = new Map(phase.plans.map((plan) => [plan.key, plan] as const));
  const bands = new Map<string, { identity: WaveIdentity; plans: RoadmapPlanRow[] }>();
  for (const plan of phase.plans) {
    const wave = authoredWave(plan);
    const band = bands.get(wave.key) ?? { identity: wave, plans: [] };
    band.plans.push({
      key: plan.key,
      url: buildPlanUrl(phase.identity, plan.id),
      id: plan.id,
      planNumber: plan.planNumber,
      description: plan.description,
      complete: plan.complete,
      blockedBy: blockedBy(plan, siblings),
    });
    bands.set(wave.key, band);
  }
  return [...bands.values()]
    .sort((left, right) => compareWaves(left.identity, right.identity))
    .map(({ identity, plans }) => ({
      key: `${phase.key}::wave:${identity.key}`,
      label: identity.label,
      authoredValue: identity.authoredValue,
      unspecified: identity.unspecified,
      plans: plans.sort((left, right) => {
        const compared = left.planNumber.localeCompare(right.planNumber, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        return compared === 0 ? left.id.localeCompare(right.id) : compared;
      }),
    }));
}

/** Disk-observed plan completion (SUMMARY.md presence), mirroring dashboard.ts's `observed`
 * signal — kept alongside the ROADMAP.md-authored `formalPlanProgress` ("formal") so a phase
 * row can flag when the two disagree instead of silently trusting whichever was read last. */
function observedProgressOf(phase: PhaseDto): { completed: number; total: number } {
  return {
    completed: phase.plans.filter((plan) => plan.complete).length,
    total: phase.plans.length,
  };
}

function hasProgressDisagreement(
  formal: PhaseDto['formalPlanProgress'],
  observed: { completed: number; total: number },
): boolean {
  return (
    formal !== null && (formal.completed !== observed.completed || formal.total !== observed.total)
  );
}

function phaseRow(phase: PhaseDto, presentation: ProjectPresentation): RoadmapPhaseRow {
  const requirementArtifact = presentation.artifacts.find(
    (artifact) => artifact.kind === 'requirements' && artifact.milestoneKey === null,
  );
  const observedProgress = observedProgressOf(phase);
  return {
    key: phase.key,
    url: buildPhaseUrl(phase.identity),
    milestoneKey: phase.milestoneKey,
    number: phase.identity.number,
    name: phase.name,
    archived: phase.archived,
    goal: phase.goal,
    authoredDependencies: phase.dependsOnRaw,
    formalStatus:
      phase.roadmapComplete === null ? null : phase.roadmapComplete ? 'complete' : 'incomplete',
    observedStatus: phase.diskStatus,
    progress: phase.formalPlanProgress ? { ...phase.formalPlanProgress } : null,
    observedProgress,
    progressDisagreement: hasProgressDisagreement(phase.formalPlanProgress, observedProgress),
    successCriteria: [...phase.successCriteria],
    requirements: phase.requirementIds.map((id) => {
      const requirement = presentation.requirements.find(
        (candidate) => candidate.id.toUpperCase() === id.toUpperCase(),
      );
      return {
        id,
        text: requirement?.text ?? null,
        checked: requirement?.checked ?? null,
        url: requirementArtifact
          ? `${requirementArtifact.key}#requirement-${id.toLowerCase()}`
          : null,
      };
    }),
    waveBands: waveBands(phase),
  };
}

function isMilestoneEntry(value: unknown): value is MilestoneEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<MilestoneEntry>;
  return (
    typeof entry.version === 'string' &&
    typeof entry.name === 'string' &&
    Array.isArray(entry.accomplishments) &&
    Array.isArray(entry.extra)
  );
}

const DAY_MS = 86_400_000;

function daysBetween(start: string, end: string): number | null {
  const from = Date.parse(`${start}T00:00:00Z`);
  const to = Date.parse(`${end}T00:00:00Z`);
  return Number.isNaN(from) || Number.isNaN(to) || to < from ? null : Math.round((to - from) / DAY_MS);
}

/** Days from start to ship: the template's "N days from start to ship" stat when the entry has
 * one, else a "YYYY-MM-DD → YYYY-MM-DD" range in its stats, else the gap since the previous
 * milestone shipped. */
function milestoneDays(entry: MilestoneEntry, previousShipped: string | null): number | null {
  const stats = entry.stats ? [entry.stats.text, ...entry.stats.items].join('; ') : '';
  const stated = stats.match(/\b(\d{1,5})\s+days?\b/i);
  if (stated) return Number(stated[1]);
  const range = stats.match(/(\d{4}-\d{2}-\d{2})\s*(?:→|->|–|—|to)\s*(\d{4}-\d{2}-\d{2})/);
  if (range) return daysBetween(range[1], range[2]);
  return entry.shipped && previousShipped ? daysBetween(previousShipped, entry.shipped) : null;
}

/** The root MILESTONES.md entries, keyed by lower-cased version; the first entry wins a repeat,
 * since the file is newest first. */
export function milestoneRecords(presentation: ProjectPresentation): Map<string, MilestoneRecord> {
  const records = new Map<string, MilestoneRecord>();
  const artifact = presentation.artifacts.find(
    (candidate) => candidate.kind === 'milestones' && candidate.location === 'root',
  );
  const entries = artifact?.structured.entries;
  if (!artifact || !Array.isArray(entries)) return records;
  const valid = entries.filter(isMilestoneEntry);
  for (const [index, entry] of valid.entries()) {
    const key = entry.version.toLowerCase();
    if (records.has(key)) continue;
    records.set(key, {
      name: entry.name,
      // An empty readAt never matches the entry's year, so the label always keeps it.
      shipped: activityDateLabel(entry.shipped, ''),
      status: entry.status,
      // Newest first, so the milestone shipped before this one is the next entry with a date.
      days: milestoneDays(entry, valid.slice(index + 1).find((older) => older.shipped)?.shipped ?? null),
      delivered: entry.delivered,
      accomplishments: [...entry.accomplishments],
      stats: entry.stats ? { text: entry.stats.text, items: [...entry.stats.items] } : null,
      gitRange: entry.gitRange,
      whatsNext: entry.whatsNext,
    });
  }
  return records;
}

const RETRO_SECTIONS: Array<{ key: RetroSectionKey; label: string }> = [
  { key: 'worked', label: 'What worked' },
  { key: 'inefficient', label: 'What was inefficient' },
  { key: 'patterns', label: 'Patterns established' },
  { key: 'lessons', label: 'Key lessons' },
];

function isRetrospectiveEntry(value: unknown): value is RetrospectiveEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<RetrospectiveEntry>;
  return (
    typeof entry.version === 'string' &&
    typeof entry.heading === 'string' &&
    typeof entry.sections === 'object' &&
    entry.sections !== null
  );
}

/** The root RETROSPECTIVE.md sections, keyed by lower-cased version; the first section wins a
 * repeat. A section without a single point is left out. */
export function milestoneRetrospectives(
  presentation: ProjectPresentation,
): Map<string, MilestoneRetrospective> {
  const retrospectives = new Map<string, MilestoneRetrospective>();
  const artifact = presentation.artifacts.find(
    (candidate) => candidate.kind === 'retrospective' && candidate.location === 'root',
  );
  const entries = artifact?.structured.entries;
  if (!artifact || !Array.isArray(entries)) return retrospectives;
  for (const entry of entries.filter(isRetrospectiveEntry)) {
    const key = entry.version.toLowerCase();
    if (retrospectives.has(key)) continue;
    const sections = RETRO_SECTIONS.map(({ key: section, label }) => ({
      key: section,
      label,
      points: Array.isArray(entry.sections[section]) ? [...entry.sections[section]] : [],
    }));
    if (sections.every((section) => section.points.length === 0)) continue;
    retrospectives.set(key, { sections });
  }
  return retrospectives;
}

function milestoneFlow(
  milestone: MilestoneDto,
  presentation: ProjectPresentation,
  records: ReadonlyMap<string, MilestoneRecord>,
  retrospectives: ReadonlyMap<string, MilestoneRetrospective>,
): MilestoneFlow {
  const phases = milestone.phases
    .map((phase) => phaseRow(phase, presentation))
    .sort((left, right) => comparePhaseNumbers(left.number, right.number));
  return {
    key: milestone.key,
    url: buildMilestoneUrl(milestone.version),
    version: milestone.version,
    name: milestone.name,
    archived: milestone.archived,
    empty: phases.length === 0,
    phases,
    record: milestone.version ? (records.get(milestone.version.toLowerCase()) ?? null) : null,
    retrospective: milestone.version
      ? (retrospectives.get(milestone.version.toLowerCase()) ?? null)
      : null,
  };
}

export function buildRoadmapViewModel(presentation: ProjectPresentation): RoadmapViewModel {
  const active = presentation.milestones.find((milestone) => !milestone.archived) ?? null;
  const records = milestoneRecords(presentation);
  const retrospectives = milestoneRetrospectives(presentation);
  return {
    readAt: presentation.readAt,
    projectName: presentation.projectName,
    active: active ? milestoneFlow(active, presentation, records, retrospectives) : null,
    history: presentation.milestones
      .filter((milestone) => milestone.archived)
      .map((milestone) => milestoneFlow(milestone, presentation, records, retrospectives)),
  };
}
