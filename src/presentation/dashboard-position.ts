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
import { activityClause, activityDateLabel, displayPhaseNumber } from './dashboard-head.ts';
import { milestoneEntries } from './roadmap.ts';
import { buildPhaseUrl } from './routes.ts';
import { buildStateSession, type StateSession } from './state-session.ts';

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

interface StageInput {
  /** The phase number as it appears in a command. */
  number: string;
  hasFolder: boolean;
  context: PositionFile[];
  research: PositionFile[];
  verify: PositionFile[];
  total: number;
  summarised: number;
  done: boolean;
  step: StepKind;
}

function stageInputOf(presentation: ProjectPresentation, phase: PhaseDto, step: StepKind): StageInput {
  return {
    number: phaseLabel(phase),
    hasFolder: phase.dirPath !== null,
    context: phaseArtifacts(presentation, phase, CONTEXT_KINDS).map(fileOf),
    research: phaseArtifacts(presentation, phase, RESEARCH_KINDS).map(fileOf),
    verify: phaseArtifacts(presentation, phase, VERIFY_KINDS).map(fileOf),
    total: phase.plans.length,
    summarised: phase.plans.filter((plan) => plan.summary !== null).length,
    done: finished(presentation, phase),
    step,
  };
}

function stagesFrom(input: StageInput): PositionStage[] {
  const { context, research, verify, total, summarised, done, step, hasFolder, number } = input;
  const allSummarised = total > 0 && summarised === total;
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

// ---------------------------------------------------------------------------------------------
// Then: the newest markdown file on disk, plus one STATE.md session note.
// ---------------------------------------------------------------------------------------------

const KIND_WORDS: Record<string, string> = { 'ui-spec': 'UI-SPEC', 'ai-spec': 'AI-SPEC', uat: 'UAT' };

function kindWords(kind: string, fileName: string): string {
  if (KIND_WORDS[kind]) return KIND_WORDS[kind];
  if (!/^[a-z][a-z-]{0,40}$/.test(kind) || kind === 'unknown') return fileName;
  const words = kind.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const SKIPPED_KINDS = new Set(['state', 'sketches-manifest', 'spikes-manifest']);

function utcDate(mtimeMs: number): string {
  return new Date(mtimeMs).toISOString().slice(0, 10);
}

function planPaths(presentation: ProjectPresentation): { summaries: Map<string, string>; plans: Map<string, string> } {
  const summaries = new Map<string, string>();
  const plans = new Map<string, string>();
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      for (const plan of phase.plans) {
        plans.set(plan.path, plan.id);
        if (plan.summary) summaries.set(plan.summary.path, plan.id);
      }
    }
  }
  return { summaries, plans };
}

function whatWasWritten(presentation: ProjectPresentation, artifact: ArtifactDto, name: string): string {
  const { summaries, plans } = planPaths(presentation);
  const finishedPlan = summaries.get(artifact.path);
  if (finishedPlan !== undefined) return `Plan ${finishedPlan} finished`;
  const writtenPlan = plans.get(artifact.path);
  if (writtenPlan !== undefined) return `Plan ${writtenPlan} written`;
  const archived = artifact.path.match(/^\.planning\/milestones\/([A-Za-z0-9.]{1,20})-ROADMAP\.md$/);
  if (archived) return `${archived[1]} archived`;
  const exploration = artifact.path.match(/^\.planning\/(sketches|spikes)\/(\d{3})-/);
  if (exploration) return `${exploration[1] === 'sketches' ? 'Sketch' : 'Spike'} ${exploration[2]} written`;
  const quick = artifact.path.match(/^\.planning\/quick\/(\d{6}-[a-z0-9]{3})-/);
  if (quick) return `Quick task ${quick[1]} ${name.endsWith('-SUMMARY.md') ? 'finished' : 'written'}`;
  return `${kindWords(artifact.kind, name)} written`;
}

function sessionNote(
  presentation: ProjectPresentation,
  session: StateSession | null,
): { text: string; dateLabel: string | null } | null {
  const isoDay = (text: string | null): string | null => {
    const day = text?.slice(0, 10) ?? '';
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
  };
  const stopped = session?.stoppedAt ? { text: session.stoppedAt, day: isoDay(session.lastSession) } : null;
  const clause = activityClause(presentation.state?.lastActivityDescription ?? null);
  const activity = clause ? { text: clause, day: isoDay(presentation.state?.lastActivity ?? null) } : null;
  let chosen = stopped ?? activity;
  if (stopped && activity) {
    if (activity.day !== null && (stopped.day === null || activity.day > stopped.day)) chosen = activity;
    else chosen = stopped;
  }
  if (!chosen) return null;
  return { text: chosen.text, dateLabel: activityDateLabel(chosen.day, presentation.readAt) };
}

function thenOf(presentation: ProjectPresentation, session: StateSession | null): PositionThen | null {
  const newest = presentation.artifacts
    .filter(
      (artifact) =>
        artifact.fileClass === 'text' &&
        artifact.path.endsWith('.md') &&
        artifact.mtimeMs > 0 &&
        !SKIPPED_KINDS.has(artifact.kind),
    )
    .sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path))[0];
  const note = sessionNote(presentation, session);
  if (!newest && !note) return null;
  if (!newest) return { what: null, dateLabel: null, file: null, note };
  const file = fileOf(newest);
  return {
    what: whatWasWritten(presentation, newest, file.name),
    dateLabel: activityDateLabel(utcDate(newest.mtimeMs), presentation.readAt),
    file,
    note,
  };
}

// ---------------------------------------------------------------------------------------------
// The shipped and roadmap-less states.
// ---------------------------------------------------------------------------------------------

function versionParts(version: string | null): number[] {
  return (version?.match(/\d{1,6}/g) ?? []).slice(0, 4).map(Number);
}

function compareVersions(left: string | null, right: string | null): number {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const diff = (a[index] ?? -1) - (b[index] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** An archived milestone's name without its emoji, version token, "(Phases 6-13)" and "— SHIPPED …" tail. */
function cleanedMilestoneName(name: string, version: string | null): string {
  let out = cap(name, MAX_NAME_CHARS);
  out = out.replace(/\s+[—–-]\s+SHIPPED\b.*$/i, '');
  out = out.replace(/\s*\([^()]*\)\s*$/, '');
  out = out.replace(/^[^\p{L}\p{N}]+/u, '');
  if (version && out.toLowerCase().startsWith(version.toLowerCase())) out = out.slice(version.length);
  return out.replace(/^[\s:—–-]+/, '').trim();
}

function auditedMilestone(presentation: ProjectPresentation, version: string | null): boolean {
  if (!version) return false;
  const bare = version.replace(/^v/i, '').toLowerCase();
  return presentation.artifacts.some((artifact) => {
    if (artifact.kind !== 'milestone-audit') return false;
    const name = artifact.path.slice(artifact.path.lastIndexOf('/') + 1).toLowerCase();
    return name.startsWith(`${version.toLowerCase()}-`) || name.startsWith(`${bare}-`);
  });
}

function shippedMilestone(presentation: ProjectPresentation): MilestoneDto | null {
  const archived = presentation.milestones.filter((milestone) => milestone.archived);
  if (archived.length === 0) return null;
  const version = presentation.state?.milestone?.trim().toLowerCase() ?? null;
  const matching = archived.find((milestone) => version !== null && milestone.version?.toLowerCase() === version);
  if (matching) return matching;
  return [...archived].sort((left, right) => compareVersions(right.version, left.version))[0];
}

function shippedLabel(presentation: ProjectPresentation, milestone: MilestoneDto): string {
  const version = milestone.version?.trim() ?? '';
  const entry = milestoneEntries(presentation).find(
    (candidate) => candidate.version.toLowerCase() === version.toLowerCase(),
  );
  const state = presentation.state;
  const sameAsState = state?.milestone?.trim().toLowerCase() === version.toLowerCase();
  const name =
    [
      entry ? cap(entry.name, MAX_NAME_CHARS) : '',
      sameAsState && state?.milestoneName ? cap(state.milestoneName, MAX_NAME_CHARS) : '',
      cleanedMilestoneName(milestone.name, version),
    ].find((candidate) => candidate.trim() !== '') ?? '';
  return [version, name].filter(Boolean).join(' ');
}

function shippedPosition(presentation: ProjectPresentation, milestone: MilestoneDto): DashboardPosition {
  const label = shippedLabel(presentation, milestone);
  const phaseCount = milestone.phases.length;
  const planCount = milestone.phases.reduce((total, phase) => total + phase.plans.length, 0);
  const audited = auditedMilestone(presentation, milestone.version);
  const archivedWord = audited ? 'audited and archived' : 'archived';
  const why =
    phaseCount === 0
      ? `${label || 'The milestone'} is archived.`
      : `${plural(planCount, 'plan', 'plans')} across ${plural(phaseCount, 'phase', 'phases')}, ${archivedWord}.`;
  const version = milestone.version?.trim() || 'The last milestone';
  return {
    then: null,
    now: {
      kind: 'between',
      when: [label, phaseCount === 0 ? '' : phaseCount === 1 ? '1 phase' : `all ${phaseCount} phases`]
        .filter(Boolean)
        .join(' · '),
      title: 'Between milestones',
      why,
      milestoneUrl: milestone.roadmapUrl,
    },
    next: {
      kind: 'new-milestone',
      title: 'Start the next milestone',
      command: '/gsd-new-milestone',
      why: `${version} is ${archivedWord}; ROADMAP.md has no open phases.`,
      plan: null,
    },
    also: [],
  };
}

/** STATE.md names a phase but no ROADMAP.md entry or phase folder exists for it. */
function statePhasePosition(presentation: ProjectPresentation): DashboardPosition | null {
  const state = presentation.state;
  const raw = displayPhaseNumber(state?.phaseNumber ?? null);
  // The number goes into a command, so only a plain number is taken.
  if (!state || !raw || !/^\d{1,3}(?:\.\d{1,3})?$/.test(raw)) return null;
  const milestone = [state.milestone?.trim(), state.milestoneName?.trim()]
    .filter(Boolean)
    .map((text) => cap(text as string, MAX_NAME_CHARS))
    .join(' ');
  const name = state.phaseName?.trim() ? titleCaseSlug(cap(state.phaseName.trim(), MAX_NAME_CHARS)) : `Phase ${raw}`;
  return {
    then: null,
    now: {
      kind: 'phase',
      when: `${milestone ? `${milestone} · ` : ''}Phase ${raw}`,
      title: name,
      phaseUrl: null,
      stages: stagesFrom({
        number: raw,
        hasFolder: false,
        context: [],
        research: [],
        verify: [],
        total: 0,
        summarised: 0,
        done: false,
        step: 'discuss',
      }),
    },
    next: {
      kind: 'discuss',
      title: `Discuss phase ${raw}`,
      command: `/gsd-discuss-phase ${raw}`,
      why: `STATE.md names phase ${raw}; no ROADMAP.md entry or phase folder exists for it yet.`,
      plan: null,
    },
    also: [],
  };
}

// ---------------------------------------------------------------------------------------------
// The "also" items: phases that could start now, operator steps that add something, deferred items.
// ---------------------------------------------------------------------------------------------

const MAX_DEPENDS_CHARS = 400;
const NUMBER = String.raw`\d{1,3}(?:\.\d{1,2})?`;
const PHASE_LIST = new RegExp(
  String.raw`\bphases?\s+(${NUMBER}(?:\s*(?:,\s*and|,|and|&)\s*${NUMBER}){0,10})`,
  'gi',
);

/** True when every phase the `Depends on` line names is finished or not in this milestone; false when it
 * names nothing readable. "Nothing" and "None" mean no prerequisites. */
function prerequisitesMet(raw: string | null, phases: PhaseDto[], presentation: ProjectPresentation): boolean {
  const text = cap((raw ?? '').trim(), MAX_DEPENDS_CHARS);
  if (!text) return false;
  if (/^(?:nothing|none)\b/i.test(text)) return true;
  const stripped = text.replace(/`[^`]{0,200}`/g, ' ').replace(/\([^()]{0,300}\)/g, ' ');
  const numbers: string[] = [];
  for (const match of stripped.matchAll(PHASE_LIST)) {
    numbers.push(...(match[1].match(new RegExp(NUMBER, 'g')) ?? []));
  }
  if (numbers.length === 0) return false;
  return numbers.every((number) => {
    const target = phases.find((phase) => Number(phase.identity.number) === Number(number));
    return target === undefined || finished(presentation, target);
  });
}

function readyPhasesText(numbers: string[]): string {
  const shown = numbers.slice(0, 4);
  const more = numbers.length - shown.length;
  const list =
    shown.length === 1
      ? shown[0]
      : `${shown.slice(0, -1).join(', ')}${more > 0 ? `, ${shown[shown.length - 1]}` : ` and ${shown[shown.length - 1]}`}`;
  const tail = more > 0 ? ` and ${more} more` : '';
  return `${numbers.length === 1 ? 'Phase' : 'Phases'} ${list}${tail} ${numbers.length === 1 ? 'has' : 'have'} no open prerequisites and can be discussed alongside it.`;
}

function readyPhaseNumbers(
  presentation: ProjectPresentation,
  phases: PhaseDto[],
  current: PhaseDto,
): string[] {
  return phases
    .filter(
      (phase) =>
        phase !== current &&
        !finished(presentation, phase) &&
        phase.plans.length === 0 &&
        !presentation.artifacts.some((artifact) => artifact.phaseKey === phase.key) &&
        prerequisitesMet(phase.dependsOnRaw, phases, presentation),
    )
    .map(phaseLabel);
}

/** True when `step` repeats the derived Next step: it holds the command (not as the start of a longer
 * number), or opens with the step's own title. */
function repeatsStep(step: string, next: PositionStep): boolean {
  let from = 0;
  for (;;) {
    const at = step.indexOf(next.command, from);
    if (at === -1) break;
    const after = step.charAt(at + next.command.length);
    const following = step.charAt(at + next.command.length + 1);
    const continuesNumber = /\d/.test(after) || (after === '.' && /\d/.test(following));
    if (!continuesNumber) return true;
    from = at + 1;
  }
  const title = next.title.toLowerCase();
  const lower = step.toLowerCase();
  return lower.startsWith(title) && !/\d/.test(lower.charAt(title.length));
}

function alsoOf(
  session: StateSession | null,
  next: PositionStep,
  readyPhases: string[],
): PositionAlso[] {
  const also: PositionAlso[] = [];
  if (readyPhases.length > 0) also.push({ kind: 'phases', text: readyPhasesText(readyPhases) });
  const kept = (session?.operatorSteps ?? []).filter((step) => !repeatsStep(step, next));
  if (kept.length > 0) {
    also.push({
      kind: 'step',
      text: kept[0],
      moreUrl: kept.length > 1 ? (session?.stepsUrl ?? null) : null,
      moreCount: kept.length - 1,
    });
  }
  if (session?.deferredCount && session.deferredCount > 0) {
    also.push({ kind: 'deferred', count: session.deferredCount, url: session.deferredUrl });
  }
  return also;
}

export function buildDashboardPosition(presentation: ProjectPresentation): DashboardPosition | null {
  const session = buildStateSession(presentation);
  const milestone = liveMilestone(presentation);
  let position: DashboardPosition | null;
  if (milestone) {
    const phases = [...milestone.phases].sort(byPhaseNumber);
    const frontier = frontierOf(presentation, phases);
    const { phase } = frontier;
    const next = stepOf(presentation, milestone, frontier);
    position = {
      then: null,
      now: {
        kind: 'phase',
        when: whenOf(milestone, phases, phase),
        title: cap(phase.name.trim(), MAX_NAME_CHARS) || `Phase ${phaseLabel(phase)}`,
        phaseUrl: buildPhaseUrl(phase.identity),
        stages: stagesFrom(stageInputOf(presentation, phase, frontier.step)),
      },
      next,
      also: alsoOf(session, next, readyPhaseNumbers(presentation, phases, phase)),
    };
  } else {
    const shipped = shippedMilestone(presentation);
    position = shipped ? shippedPosition(presentation, shipped) : statePhasePosition(presentation);
    if (position) position.also = alsoOf(session, position.next, []);
  }
  if (!position) return null;
  position.then = thenOf(presentation, session);
  return position;
}
