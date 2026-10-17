import { comparePhaseNumbers } from '../planning-repo/naming.ts';
import type {
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
} from '../server/project-presentation.ts';
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

export interface MilestoneFlow {
  key: string;
  url: string;
  version: string | null;
  name: string;
  archived: boolean;
  empty: boolean;
  phases: RoadmapPhaseRow[];
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

function milestoneFlow(milestone: MilestoneDto, presentation: ProjectPresentation): MilestoneFlow {
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
  };
}

export function buildRoadmapViewModel(presentation: ProjectPresentation): RoadmapViewModel {
  const active = presentation.milestones.find((milestone) => !milestone.archived) ?? null;
  return {
    readAt: presentation.readAt,
    projectName: presentation.projectName,
    active: active ? milestoneFlow(active, presentation) : null,
    history: presentation.milestones
      .filter((milestone) => milestone.archived)
      .map((milestone) => milestoneFlow(milestone, presentation)),
  };
}
