import type { PhaseDto, PlanDto, ProjectPresentation } from '../server/project-presentation.ts';
import { buildArtifactUrl, buildPhaseUrl } from './routes.ts';

export interface SourceProvenance {
  kind: 'state' | 'roadmap' | 'summary' | 'derived';
  ref: string;
}

/**
 * Human-readable label for an attention/next-work row's provenance. This is deliberately a
 * pure, side-effect-free function (not a component) so both the dashboard page and the
 * G2-07 destination-matrix contract test can call it directly without importing JSX.
 */
export function provenanceLabel(provenance: SourceProvenance): string {
  switch (provenance.kind) {
    case 'state':
      return 'STATE';
    case 'roadmap':
      return 'ROADMAP';
    case 'summary':
      return 'SUMMARY files';
    case 'derived':
      return 'Snapshot projection';
  }
}

/**
 * Resolves a row's provenance to a navigable in-app destination, independently of the row's
 * primary `AttentionItem.url`/`NextWorkItem.url`. Only `state` and `roadmap` provenance kinds
 * name an on-disk markdown source that can be linked to; `summary` and `derived` provenance
 * never produce a second navigable link (G2-07: the two destinations must never be conflated).
 */
export function sourceDestination(provenance: SourceProvenance): string | null {
  if (!['state', 'roadmap'].includes(provenance.kind)) return null;
  const [path] = provenance.ref.split('#');
  return path.endsWith('.md') ? buildArtifactUrl(null, path) : null;
}

export interface SourcedValue<T> {
  value: T | null;
  display: string;
  provenance: SourceProvenance;
}

export interface AttentionItem {
  type: 'discrepancy' | 'blocker' | 'dependency' | 'checkpoint' | 'coverage';
  key: string;
  sourceKey: string;
  title: string;
  detail: string;
  url: string | null;
  provenance: SourceProvenance;
}

export interface NextWorkItem {
  kind: 'plan' | 'phase' | 'blocker' | 'human-verification' | 'wait';
  key: string;
  phaseKey: string;
  planKey: string | null;
  title: string;
  description: string;
  url: string;
}

export interface CompletionSignal {
  completed: number | null;
  total: number | null;
  status: string | null;
  provenance: SourceProvenance;
}

export interface DashboardViewModel {
  readAt: string;
  projectName: string | null;
  current: {
    milestone: SourcedValue<string>;
    phaseNumber: SourcedValue<string>;
    phaseName: SourcedValue<string>;
    status: SourcedValue<string>;
    progress: {
      completedPhases: SourcedValue<number>;
      totalPhases: SourcedValue<number>;
      completedPlans: SourcedValue<number>;
      totalPlans: SourcedValue<number>;
      authoredPercent: SourcedValue<number>;
      computedPercent: SourcedValue<number>;
    };
  };
  completion: {
    currentPhaseKey: string | null;
    formal: CompletionSignal;
    observed: CompletionSignal;
  };
  next: { immediate: NextWorkItem | null; previews: NextWorkItem[] };
  attention: AttentionItem[];
}

function stateText(value: string | null, ref: string): SourcedValue<string> {
  return { value, display: value ?? 'Unavailable', provenance: { kind: 'state', ref } };
}

function stateNumber(value: number | null, ref: string): SourcedValue<number> {
  return {
    value,
    display: value === null ? 'Not recorded' : String(value),
    provenance: { kind: 'state', ref },
  };
}

function formatPercentDisplay(value: number): string {
  return `${value.toFixed(1).replace(/\.0$/, '')}%`;
}

function samePhaseNumber(left: string, right: string): boolean {
  if (left === right) return true;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber === rightNumber;
}

function currentPhaseOf(presentation: ProjectPresentation): PhaseDto | null {
  const state = presentation.state;
  if (!state?.milestone || !state.phaseNumber) return null;
  const milestone = presentation.milestones.find(
    (candidate) => !candidate.archived && candidate.version === state.milestone,
  );
  return (
    milestone?.phases.find((phase) => samePhaseNumber(phase.identity.number, state.phaseNumber!)) ??
    null
  );
}

function completionOf(phase: PhaseDto | null): {
  formal: CompletionSignal;
  observed: CompletionSignal;
} {
  if (!phase) {
    return {
      formal: {
        completed: null,
        total: null,
        status: null,
        provenance: { kind: 'roadmap', ref: '.planning/ROADMAP.md' },
      },
      observed: {
        completed: null,
        total: null,
        status: null,
        provenance: { kind: 'summary', ref: 'current phase unavailable' },
      },
    };
  }
  const formal = phase.formalPlanProgress;
  return {
    formal: {
      completed: formal?.completed ?? null,
      total: formal?.total ?? null,
      status:
        phase.roadmapComplete === null ? null : phase.roadmapComplete ? 'complete' : 'incomplete',
      provenance: { kind: 'roadmap', ref: formal?.sourcePath ?? '.planning/ROADMAP.md' },
    },
    observed: {
      completed: phase.plans.filter((plan) => plan.complete).length,
      total: phase.plans.length,
      status: phase.diskStatus,
      provenance: { kind: 'summary', ref: phase.key },
    },
  };
}

function hasDiscrepancy(formal: CompletionSignal, observed: CompletionSignal): boolean {
  return (
    formal.completed !== null &&
    formal.total !== null &&
    observed.completed !== null &&
    observed.total !== null &&
    (formal.completed !== observed.completed || formal.total !== observed.total)
  );
}

function planIndex(presentation: ProjectPresentation): Map<string, PlanDto> {
  return new Map(
    presentation.milestones.flatMap((milestone) =>
      milestone.phases.flatMap((phase) => phase.plans.map((plan) => [plan.key, plan] as const)),
    ),
  );
}

function dependencyBlockers(plan: PlanDto, plans: Map<string, PlanDto>): string[] {
  return plan.dependsOn.flatMap((dependency) => {
    const target = dependency.targetPlanKey ? plans.get(dependency.targetPlanKey) : null;
    return target?.complete ? [] : [dependency.raw];
  });
}

function ready(plan: PlanDto, plans: Map<string, PlanDto>): boolean {
  return !plan.complete && dependencyBlockers(plan, plans).length === 0;
}

function planWork(plan: PlanDto, phase: PhaseDto): NextWorkItem {
  const authoredTitle = plan.frontmatter.title;
  const title =
    (typeof authoredTitle === 'string' && authoredTitle.trim()) || plan.description || plan.id;
  return {
    kind: 'plan',
    key: plan.key,
    phaseKey: phase.key,
    planKey: plan.key,
    title,
    description:
      plan.description && plan.description !== title
        ? plan.description
        : `Plan ${plan.id} is ready to begin.`,
    url: plan.key,
  };
}

function phaseWork(phase: PhaseDto): NextWorkItem {
  return {
    kind: 'phase',
    key: phase.key,
    phaseKey: phase.key,
    planKey: null,
    title: phase.name,
    description: phase.goal ?? `Phase ${phase.identity.number} is the next planned phase.`,
    url: buildPhaseUrl(phase.identity),
  };
}

function checkpointWork(
  presentation: ProjectPresentation,
  currentPhase: PhaseDto | null,
): NextWorkItem | null {
  const checkpoint = presentation.checkpoints.find(
    (candidate) =>
      candidate.status === 'pending' && (!currentPhase || candidate.phaseKey === currentPhase.key),
  );
  if (!checkpoint) return null;
  const plan = planIndex(presentation).get(checkpoint.planKey);
  return {
    kind: 'human-verification',
    key: checkpoint.key,
    phaseKey: checkpoint.phaseKey,
    planKey: checkpoint.planKey,
    title: checkpoint.name,
    description: plan?.description
      ? `Review is required before completing: ${plan.description}`
      : `Review is required before Plan ${checkpoint.planId} can complete.`,
    url: checkpoint.planKey,
  };
}

function blockerWork(
  presentation: ProjectPresentation,
  currentPhase: PhaseDto | null,
): NextWorkItem | null {
  const blocker = presentation.blockers.find((candidate) => !isPlaceholderBlocker(candidate.text));
  if (!blocker) return null;
  return {
    kind: 'blocker',
    key: `next:${blocker.key}`,
    phaseKey: currentPhase?.key ?? '',
    planKey: null,
    title: 'Resolve the active blocker',
    description: blocker.text,
    url: currentPhase ? buildPhaseUrl(currentPhase.identity) : '/roadmap',
  };
}

function isPlaceholderBlocker(text: string): boolean {
  return /^none(?:\s+yet)?[.!]?$/i.test(text.trim());
}

function nextWork(
  presentation: ProjectPresentation,
  currentPhase: PhaseDto | null,
): { immediate: NextWorkItem | null; previews: NextWorkItem[] } {
  const plans = planIndex(presentation);
  const activePhases = presentation.milestones
    .filter((milestone) => !milestone.archived)
    .flatMap((milestone) => milestone.phases);
  const currentIndex = currentPhase
    ? activePhases.findIndex((phase) => phase.key === currentPhase.key)
    : -1;
  const candidatePhases = currentIndex >= 0 ? activePhases.slice(currentIndex) : activePhases;
  const readyPlans = candidatePhases.flatMap((phase) =>
    phase.plans.filter((plan) => ready(plan, plans)).map((plan) => planWork(plan, phase)),
  );
  let phaseCandidates = candidatePhases.filter((phase) => phase.diskStatus !== 'complete');
  if (currentPhase && currentPhase.plans.length > 0) {
    phaseCandidates = phaseCandidates.filter((phase) => phase.key !== currentPhase.key);
  }
  const phaseItems = phaseCandidates.map(phaseWork);
  const interrupt =
    blockerWork(presentation, currentPhase) ?? checkpointWork(presentation, currentPhase);
  const ordered = [
    ...(interrupt ? [interrupt] : []),
    ...(readyPlans.length > 0 ? [...readyPlans, ...phaseItems] : phaseItems),
  ];
  return { immediate: ordered[0] ?? null, previews: ordered.slice(1, 3) };
}

function attentionItems(
  presentation: ProjectPresentation,
  currentPhase: PhaseDto | null,
  formal: CompletionSignal,
  observed: CompletionSignal,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (currentPhase && hasDiscrepancy(formal, observed)) {
    items.push({
      type: 'discrepancy',
      key: `discrepancy:${currentPhase.key}`,
      sourceKey: currentPhase.key,
      title: 'Roadmap and observed completion disagree',
      detail: `ROADMAP records ${formal.completed}/${formal.total}; matching SUMMARY files record ${observed.completed}/${observed.total}.`,
      url: buildPhaseUrl(currentPhase.identity),
      provenance: { kind: 'derived', ref: presentation.readAt },
    });
  }
  for (const blocker of presentation.blockers) {
    if (isPlaceholderBlocker(blocker.text)) continue;
    items.push({
      type: 'blocker',
      key: `blocker:${blocker.key}`,
      sourceKey: blocker.key,
      title: 'Authored blocker',
      detail: blocker.text,
      url: currentPhase ? buildPhaseUrl(currentPhase.identity) : '/roadmap',
      provenance: { kind: 'state', ref: blocker.sourcePath },
    });
  }
  const plans = planIndex(presentation);
  for (const milestone of presentation.milestones) {
    if (milestone.archived) continue;
    for (const phase of milestone.phases) {
      for (const plan of phase.plans) {
        if (plan.complete) continue;
        const blockers = dependencyBlockers(plan, plans);
        if (blockers.length === 0) continue;
        items.push({
          type: 'dependency',
          key: `dependency:${plan.key}`,
          sourceKey: plan.key,
          title: `${plan.id} is dependency-blocked`,
          detail: `Blocked by ${blockers.join(', ')}.`,
          url: plan.key,
          provenance: { kind: 'derived', ref: plan.key },
        });
      }
    }
  }
  for (const checkpoint of presentation.checkpoints) {
    if (checkpoint.status !== 'pending') continue;
    items.push({
      type: 'checkpoint',
      key: `checkpoint:${checkpoint.key}`,
      sourceKey: checkpoint.key,
      title: checkpoint.name,
      detail: `${checkpoint.type}${checkpoint.gate ? ` (${checkpoint.gate})` : ''}`,
      url: checkpoint.planKey,
      provenance: { kind: 'derived', ref: checkpoint.key },
    });
  }
  for (const coverage of presentation.coverageWaits) {
    if (coverage.status !== 'pending') continue;
    items.push({
      type: 'coverage',
      key: `coverage:${coverage.key}`,
      sourceKey: coverage.key,
      title: coverage.description,
      detail: `Coverage ${coverage.coverageId} requires human judgment.`,
      url: coverage.planKey,
      provenance: { kind: 'derived', ref: coverage.key },
    });
  }
  const seen = new Set<string>();
  return items.filter((item) => {
    const identity = `${item.type}:${item.sourceKey}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function buildDashboardViewModel(presentation: ProjectPresentation): DashboardViewModel {
  const state = presentation.state;
  const statePath = state?.sourcePath ?? '.planning/STATE.md';
  const completedPlans = state?.progress.completedPlans ?? null;
  const totalPlans = state?.progress.totalPlans ?? null;
  const computedPercent =
    completedPlans !== null && totalPlans !== null && totalPlans > 0
      ? (completedPlans / totalPlans) * 100
      : null;
  const currentPhase = currentPhaseOf(presentation);
  const completion = completionOf(currentPhase);
  return {
    readAt: presentation.readAt,
    projectName: presentation.projectName,
    current: {
      milestone: stateText(state?.milestone ?? null, `${statePath}#milestone`),
      phaseNumber: stateText(state?.phaseNumber ?? null, `${statePath}#current_phase`),
      phaseName: stateText(state?.phaseName ?? null, `${statePath}#current_phase_name`),
      status: stateText(state?.status ?? null, `${statePath}#status`),
      progress: {
        completedPhases: stateNumber(
          state?.progress.completedPhases ?? null,
          `${statePath}#progress.completed_phases`,
        ),
        totalPhases: stateNumber(
          state?.progress.totalPhases ?? null,
          `${statePath}#progress.total_phases`,
        ),
        completedPlans: stateNumber(completedPlans, `${statePath}#progress.completed_plans`),
        totalPlans: stateNumber(totalPlans, `${statePath}#progress.total_plans`),
        authoredPercent: stateNumber(
          state?.progress.percent ?? null,
          `${statePath}#progress.percent`,
        ),
        computedPercent: {
          value: computedPercent,
          display:
            computedPercent === null ? 'Not recorded' : formatPercentDisplay(computedPercent),
          provenance: { kind: 'derived', ref: `${statePath}#progress.completed_plans/total_plans` },
        },
      },
    },
    completion: { currentPhaseKey: currentPhase?.key ?? null, ...completion },
    next: nextWork(presentation, currentPhase),
    attention: attentionItems(presentation, currentPhase, completion.formal, completion.observed),
  };
}
