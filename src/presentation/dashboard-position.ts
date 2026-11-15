// The dashboard's position block (quick-261115-o34, sketch 066 C "Then -> Now -> Next" extended with
// 067 S "Stage detail"): where the work stands, derived from the files on disk — phase folders, PLAN and
// SUMMARY pairs, CONTEXT / RESEARCH / VERIFICATION files, the ROADMAP — and never from STATE.md's status
// word or its current_phase alone. Pure: no node:* or React imports. Every function is total, and author
// text (phase names, dependency lines, STATE.md prose) is capped before any scan, so a hostile or huge
// planning file cannot throw or stall the dashboard route. The one string built into a command is a
// fixed verb plus a phase number the naming grammar already parsed.
import type {
  ArtifactDto,
  MilestoneDto,
  PhaseDto,
  PlanDto,
  ProjectPresentation,
} from '../server/project-presentation.ts';
import { displayPhaseNumber } from './dashboard-head.ts';
import { buildPhaseUrl } from './routes.ts';

const MAX_NAME_CHARS = 200;

export type PositionStageName = 'Discuss' | 'Research' | 'Plan' | 'Execute' | 'Verify';
export type PositionStageState = 'done' | 'now' | 'next' | 'todo' | 'skip';

export interface PositionFile {
  name: string;
  path: string;
  /** The artifact key: the file's own page. */
  url: string;
}

/** An empty stage's sentence in pieces, so the UI can set the command in bold without parsing a string. */
export interface PositionEmpty {
  text: string;
  command: string | null;
  tail: string | null;
}

export interface PositionStage {
  name: PositionStageName;
  state: PositionStageState;
  /** '2 files', '16 plans', '9/16 plans', 'to do' or '—'. */
  count: string;
  files: PositionFile[];
  empty: PositionEmpty | null;
  plansTotal: number;
  plansDone: number;
}

export interface PositionStep {
  kind: 'discuss' | 'plan' | 'execute' | 'verify' | 'complete-milestone' | 'new-milestone';
  title: string;
  command: string;
  why: string;
  /** Set only on an execute step: the first plan with no SUMMARY.md. */
  plan: { id: string; url: string } | null;
}

export type PositionNow =
  | {
      kind: 'phase';
      when: string;
      title: string;
      phaseUrl: string | null;
      stages: PositionStage[];
    }
  | {
      kind: 'between';
      when: string;
      title: string;
      why: string;
      milestoneUrl: string | null;
    };

export interface PositionThen {
  what: string | null;
  dateLabel: string | null;
  file: PositionFile | null;
  note: { text: string; dateLabel: string | null } | null;
}

export type PositionAlso =
  | { kind: 'phases'; text: string }
  | { kind: 'step'; text: string; moreUrl: string | null; moreCount: number }
  | { kind: 'deferred'; count: number; url: string | null };

export interface DashboardPosition {
  then: PositionThen | null;
  now: PositionNow;
  next: PositionStep;
  also: PositionAlso[];
}

function cap(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

export function titleCaseSlug(name: string): string {
  return /^[a-z0-9-]+$/.test(name)
    ? name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : name;
}

export function byPhaseNumber(left: PhaseDto, right: PhaseDto): number {
  return Number(left.identity.number) - Number(right.identity.number);
}

function byPlanId(left: PlanDto, right: PlanDto): number {
  return left.id.localeCompare(right.id, undefined, { numeric: true });
}

export function firstOpenPlan(phase: PhaseDto): PlanDto | undefined {
  return [...phase.plans].sort(byPlanId).find((plan) => plan.summary === null);
}

export function phaseArtifacts(presentation: ProjectPresentation, phase: PhaseDto, kinds: readonly string[]): ArtifactDto[] {
  return presentation.artifacts
    .filter((artifact) => artifact.phaseKey === phase.key && kinds.includes(artifact.kind))
    .sort((left, right) => left.path.localeCompare(right.path));
}

/** A phase is verified once its VERIFICATION.md passed or its UAT.md is complete. */
export function phaseVerified(presentation: ProjectPresentation, phase: PhaseDto): boolean {
  const statusIs = (kind: string, value: string) =>
    phaseArtifacts(presentation, phase, [kind]).some(
      (artifact) => typeof artifact.frontmatter.status === 'string' && artifact.frontmatter.status.trim().toLowerCase() === value,
    );
  return statusIs('verification', 'passed') || statusIs('uat', 'complete');
}

export function phaseLabel(phase: PhaseDto): string {
  return displayPhaseNumber(phase.identity.number) ?? phase.identity.number;
}

/** Verified, or the ROADMAP marks it complete and every plan has a SUMMARY. */
export function finished(presentation: ProjectPresentation, phase: PhaseDto): boolean {
  if (phaseVerified(presentation, phase)) return true;
  return phase.roadmapComplete === true && phase.plans.length > 0 && phase.plans.every((plan) => plan.summary !== null);
}

function started(presentation: ProjectPresentation, phase: PhaseDto): boolean {
  if (phase.dirPath === null) return false;
  return phase.plans.length > 0 || presentation.artifacts.some((artifact) => artifact.phaseKey === phase.key);
}

function liveMilestone(presentation: ProjectPresentation): MilestoneDto | null {
  const live = presentation.milestones.filter((milestone) => !milestone.archived && milestone.phases.length > 0);
  const version = presentation.state?.milestone?.trim().toLowerCase() ?? null;
  return live.find((milestone) => version !== null && milestone.version?.toLowerCase() === version) ?? live[0] ?? null;
}

function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${['th', 'st', 'nd', 'rd'][value % 10] ?? 'th'}`;
}

/** The milestone's version plus its name, unless the name is the default 'Current' or empty. */
function milestoneLabel(milestone: MilestoneDto): string {
  const version = milestone.version?.trim() ?? '';
  const raw = cap(milestone.name.trim(), MAX_NAME_CHARS);
  const name = raw.toLowerCase() === 'current' ? '' : raw;
  if (version && name.toLowerCase().startsWith(version.toLowerCase())) return name;
  return [version, name].filter(Boolean).join(' ');
}

type StepKind = PositionStep['kind'];

interface Frontier {
  phase: PhaseDto;
  step: StepKind;
  /** The phase the frontier moved on from, when it was finished. */
  after: PhaseDto | null;
}

/** The current phase from the files on disk, the way `/gsd-next` routes it. */
function frontierOf(presentation: ProjectPresentation, phases: PhaseDto[]): Frontier {
  for (const phase of phases) {
    if (firstOpenPlan(phase)) return { phase, step: 'execute', after: null };
  }
  const startedPhases = phases.filter((phase) => started(presentation, phase));
  const last = startedPhases[startedPhases.length - 1];
  if (!last) return { phase: phases[0], step: 'discuss', after: null };
  if (!finished(presentation, last)) {
    if (last.plans.length > 0) return { phase: last, step: 'verify', after: null };
    const ready = phaseArtifacts(presentation, last, ['context', 'research']).length > 0;
    return { phase: last, step: ready ? 'plan' : 'discuss', after: null };
  }
  const following = phases[phases.indexOf(last) + 1];
  if (following) return { phase: following, step: 'discuss', after: last };
  return { phase: last, step: 'complete-milestone', after: null };
}

const CONTEXT_KINDS = ['context', 'discussion-log'];
const RESEARCH_KINDS = ['research', 'patterns', 'ui-spec', 'ai-spec', 'spec'];
const VERIFY_KINDS = ['verification', 'uat'];

function fileOf(artifact: ArtifactDto): PositionFile {
  return { name: artifact.path.slice(artifact.path.lastIndexOf('/') + 1), path: artifact.path, url: artifact.key };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function stagesOf(presentation: ProjectPresentation, phase: PhaseDto, step: StepKind): PositionStage[] {
  const context = phaseArtifacts(presentation, phase, CONTEXT_KINDS).map(fileOf);
  const research = phaseArtifacts(presentation, phase, RESEARCH_KINDS).map(fileOf);
  const verify = phaseArtifacts(presentation, phase, VERIFY_KINDS).map(fileOf);
  const total = phase.plans.length;
  const summarised = phase.plans.filter((plan) => plan.summary !== null).length;
  const done = finished(presentation, phase);
  const allSummarised = total > 0 && summarised === total;
  const hasFolder = phase.dirPath !== null;
  const number = phaseLabel(phase);
  const command = (verb: string) => `/gsd-${verb} ${number}`;

  const discussState: PositionStageState =
    context.length > 0 ? 'done' : research.length > 0 || total > 0 ? 'skip' : step === 'discuss' ? 'next' : 'todo';
  const researchState: PositionStageState = research.length > 0 ? 'done' : total > 0 ? 'skip' : 'todo';
  const planState: PositionStageState = total > 0 ? 'done' : step === 'plan' ? 'next' : 'todo';
  const executeState: PositionStageState =
    total === 0 ? 'todo' : allSummarised ? 'done' : summarised > 0 ? 'now' : 'next';
  const verifyState: PositionStageState = done
    ? 'done'
    : allSummarised
      ? verify.length > 0
        ? 'now'
        : 'next'
      : 'todo';

  const countOf = (state: PositionStageState, files: PositionFile[]): string =>
    files.length > 0 ? plural(files.length, 'file', 'files') : state === 'next' ? 'to do' : '—';

  const discussEmpty: PositionEmpty | null =
    context.length > 0
      ? null
      : discussState === 'skip'
        ? skipped()
        : discussState === 'next'
          ? hasFolder
            ? { text: 'No CONTEXT.md yet.', command: command('discuss-phase'), tail: null }
            : { text: 'No phase folder yet.', command: command('discuss-phase'), tail: 'creates it and writes NN-CONTEXT.md.' }
          : { text: 'Not started.', command: null, tail: null };
  const researchEmpty: PositionEmpty | null =
    research.length > 0
      ? null
      : researchState === 'skip'
        ? skipped()
        : { text: 'Optional; runs after Discuss.', command: null, tail: null };
  const planEmpty: PositionEmpty | null =
    total > 0
      ? null
      : planState === 'next'
        ? {
            text: 'No PLAN files yet.',
            command: command('plan-phase'),
            tail: research.length > 0 ? 'writes them from CONTEXT and RESEARCH.' : 'writes them from CONTEXT.',
          }
        : { text: 'Starts after Discuss.', command: null, tail: null };
  const executeEmpty: PositionEmpty | null = total > 0 ? null : { text: 'Starts once there are plans.', command: null, tail: null };
  const verifyEmpty: PositionEmpty | null =
    verify.length > 0
      ? null
      : verifyState === 'next'
        ? {
            text: 'No VERIFICATION.md or UAT.md yet.',
            command: command('verify-work'),
            tail: 'checks the phase goal against what was built.',
          }
        : verifyState === 'todo'
          ? { text: 'Starts once every plan has a SUMMARY.', command: null, tail: null }
          : { text: 'No VERIFICATION.md or UAT.md on disk.', command: null, tail: null };

  return [
    { name: 'Discuss', state: discussState, count: countOf(discussState, context), files: context, empty: discussEmpty, plansTotal: 0, plansDone: 0 },
    { name: 'Research', state: researchState, count: countOf(researchState, research), files: research, empty: researchEmpty, plansTotal: 0, plansDone: 0 },
    {
      name: 'Plan',
      state: planState,
      count: total > 0 ? plural(total, 'plan', 'plans') : planState === 'next' ? 'to do' : '—',
      files: [],
      empty: planEmpty,
      plansTotal: total,
      plansDone: summarised,
    },
    {
      name: 'Execute',
      state: executeState,
      count: total > 0 ? `${summarised}/${total} plans` : '—',
      files: [],
      empty: executeEmpty,
      plansTotal: total,
      plansDone: summarised,
    },
    { name: 'Verify', state: verifyState, count: countOf(verifyState, verify), files: verify, empty: verifyEmpty, plansTotal: 0, plansDone: 0 },
  ];
}

function skipped(): PositionEmpty {
  return { text: 'Skipped: the phase went on without one.', command: null, tail: null };
}

function stepOf(
  presentation: ProjectPresentation,
  milestone: MilestoneDto,
  frontier: Frontier,
): PositionStep {
  const { phase, step, after } = frontier;
  const number = phaseLabel(phase);
  const label = milestoneLabel(milestone);
  if (step === 'complete-milestone') {
    return {
      kind: 'complete-milestone',
      title: 'Complete the milestone',
      command: '/gsd-complete-milestone',
      why: `Every phase of ${label || 'the milestone'} is verified.`,
      plan: null,
    };
  }
  if (step === 'execute') {
    const plan = firstOpenPlan(phase);
    return {
      kind: 'execute',
      title: `Execute phase ${number}`,
      command: `/gsd-execute-phase ${number}`,
      why: plan ? `${plan.id}-PLAN.md is the first plan with no SUMMARY.md.` : 'A plan has no SUMMARY.md.',
      plan: plan ? { id: plan.id, url: plan.key } : null,
    };
  }
  if (step === 'verify') {
    const total = phase.plans.length;
    const verifyFiles = phaseArtifacts(presentation, phase, VERIFY_KINDS);
    return {
      kind: 'verify',
      title: `Verify phase ${number}`,
      command: `/gsd-verify-work ${number}`,
      why:
        verifyFiles.length > 0
          ? "The phase's verification has not passed yet."
          : `All ${total} ${total === 1 ? 'plan has a SUMMARY.md' : 'plans have a SUMMARY.md'}; nothing has checked the phase goal yet.`,
      plan: null,
    };
  }
  if (step === 'plan') {
    const names = [
      phaseArtifacts(presentation, phase, CONTEXT_KINDS).length > 0 ? 'CONTEXT' : null,
      phaseArtifacts(presentation, phase, ['research']).length > 0 ? 'RESEARCH' : null,
    ].filter((name): name is string => name !== null);
    const written = names.length === 2 ? `${names[0]} and ${names[1]} are written` : `${names[0] ?? 'Phase notes'} is written`;
    return {
      kind: 'plan',
      title: `Plan phase ${number}`,
      command: `/gsd-plan-phase ${number}`,
      why: `${written}; the phase folder has no PLAN files yet.`,
      plan: null,
    };
  }
  let why: string;
  if (after) why = `Phase ${phaseLabel(after)} is verified; phase ${number} has no CONTEXT.md yet.`;
  else if (phase.dirPath !== null) why = 'The phase folder has no CONTEXT.md yet.';
  else why = `The ${milestone.version ? `${milestone.version} ` : ''}roadmap is written; no phase has a folder yet.`;
  return { kind: 'discuss', title: `Discuss phase ${number}`, command: `/gsd-discuss-phase ${number}`, why, plan: null };
}

function whenOf(milestone: MilestoneDto, phases: PhaseDto[], phase: PhaseDto): string {
  const label = milestoneLabel(milestone);
  const number = phaseLabel(phase);
  const index = phases.indexOf(phase) + 1;
  const place = Number(phase.identity.number) === index ? ` of ${phases.length}` : ` · ${ordinal(index)} of ${phases.length}`;
  return `${label ? `${label} · ` : ''}Phase ${number}${place}`;
}

export function buildDashboardPosition(presentation: ProjectPresentation): DashboardPosition | null {
  const milestone = liveMilestone(presentation);
  if (!milestone) return null;
  const phases = [...milestone.phases].sort(byPhaseNumber);
  const frontier = frontierOf(presentation, phases);
  const { phase } = frontier;
  return {
    then: null,
    now: {
      kind: 'phase',
      when: whenOf(milestone, phases, phase),
      title: cap(phase.name.trim(), MAX_NAME_CHARS) || `Phase ${phaseLabel(phase)}`,
      phaseUrl: buildPhaseUrl(phase.identity),
      stages: stagesOf(presentation, phase, frontier.step),
    },
    next: stepOf(presentation, milestone, frontier),
    also: [],
  };
}
