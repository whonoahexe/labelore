// The dashboard head (quick-261017-wlg, sketch 025 R3b): the project's name and What This Is lead,
// a "Now" block for the current phase, and a Next up card scoped to that phase's own plans. Pure —
// no node:* or React imports. Every extractor is total, and author text is capped before any regex
// runs, so a hostile or huge PROJECT.md / STATE.md cannot throw or stall the dashboard route.
import type {
  ArtifactDto,
  PhaseDto,
  ProjectPresentation,
  ProjectStateDto,
} from '../server/project-presentation.ts';
import { projectDisplayName } from './shell-header.ts';

const MAX_SECTION_CHARS = 20000;
const MAX_PARAGRAPH_CHARS = 2000;
const MAX_ACTIVITY_CHARS = 400;
const MAX_CLAUSE_CHARS = 72;

export interface DashboardHeadNow {
  milestone: string | null;
  phase: string | null;
  title: string | null;
  status: string | null;
  done: boolean;
}

export interface DashboardHeadStep {
  kind: 'plan' | 'milestone' | 'focus' | 'phase';
  id: string | null;
  title: string;
  url: string | null;
}

export interface DashboardHeadNext {
  plans: { id: string; done: boolean; next: boolean }[];
  completed: number;
  percent: number | null;
  last: { date: string | null; dateLabel: string | null; text: string | null } | null;
  step: DashboardHeadStep | null;
}

export interface DashboardHead {
  name: string;
  tagline: string | null;
  lead: string | null;
  now: DashboardHeadNow | null;
  /** Null exactly when the project has no STATE.md. */
  next: DashboardHeadNext | null;
}

/** Splits a PROJECT.md title at its first spaced dash into a name and a tagline. A missing title,
 * or one deriveTitle fell back to the file path for, gives the shell header's display name. */
export function splitProjectTitle(
  title: string | null,
  rootPath: string,
): { name: string; tagline: string | null } {
  const text = title?.trim() ?? '';
  if (!text || text.endsWith('PROJECT.md')) {
    return { name: projectDisplayName(null, rootPath), tagline: null };
  }
  const dash = text.match(/\s+[—–]\s+/);
  if (!dash || dash.index === undefined || dash.index === 0) return { name: text, tagline: null };
  return {
    name: text.slice(0, dash.index),
    tagline: text.slice(dash.index + dash[0].length).trim() || null,
  };
}

/** The section as paragraphs, minus italic-only review notes and anything after a sub-heading. */
function paragraphs(body: string): string[] {
  const section = body.slice(0, MAX_SECTION_CHARS);
  const cut = section.split(/^#{3,}\s/m)[0];
  return cut
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.slice(0, MAX_PARAGRAPH_CHARS).replace(/\s*\n\s*/g, ' ').trim())
    .filter((paragraph) => paragraph && !/^\*[^*]/.test(paragraph) && paragraph !== '---');
}

/** Sentence split that ignores full stops inside code spans and in names like "sideby.me". */
function sentences(paragraph: string): string[] {
  const codes: string[] = [];
  const masked = paragraph.replace(/`[^`]*`/g, (code) => {
    codes.push(code);
    return `\uE000${codes.length - 1}\uE000`;
  });
  return masked
    .split(/(?<=[.!?](?:\*\*)?)\s+(?=[A-Z*(\uE000])/)
    .map((sentence) => sentence.replace(/\uE000(\d+)\uE000/g, (_, index: string) => codes[Number(index)]));
}

/** Drops emphasis markers outside code spans, keeping the backticks. */
function withoutEmphasis(text: string): string {
  return text
    .split(/(`[^`]*`)/)
    .map((part) => (part.startsWith('`') ? part : part.replace(/\*\*|[*_]/g, '')))
    .join('');
}

/** What This Is, cut to a lead: a leading bold sentence if there is one, otherwise sentences until
 * the lead reaches 70 characters (never more than two); a lead over 160 characters is cut at its
 * first " — " or ": ". */
export function whatThisIsLead(sectionBody: string): string | null {
  const [first] = paragraphs(sectionBody);
  if (!first) return null;
  const bold = first.match(/^\*\*(.+?)\*\*/);
  if (bold) return withoutEmphasis(bold[1].trim());
  const parts = sentences(first);
  let lead = parts[0];
  if (lead.replace(/[`*]/g, '').length < 70 && parts[1]) lead += ` ${parts[1]}`;
  if (lead.length > 160) {
    const clause = lead.match(/^(.{20,}?)(?:\s+—\s+|:\s+)/);
    if (clause) lead = `${clause[1].replace(/[,;]$/, '')}.`;
  }
  return withoutEmphasis(lead);
}

/** A short activity clause: quick-task ids dropped, cut at the first " — ", unclosed " (" or "; ",
 * and capped at 72 characters. */
export function activityClause(text: string | null): string | null {
  if (!text) return null;
  let out = text.slice(0, MAX_ACTIVITY_CHARS);
  const quick = out.match(/quick task\s+[0-9a-z-]+\s*(?:\(([^)]+)\)|[—:-]\s*(.+))/i);
  if (quick) out = `Quick task: ${(quick[1] ?? quick[2]).split(/,\s+/)[0]}`;
  out = out.split(/\s+—\s+|\s+\((?!.*\)$)|;\s+/)[0].trim();
  if (out.length > MAX_CLAUSE_CHARS) out = `${out.slice(0, 70).replace(/\s+\S*$/, '')}…`;
  return out || null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "22 Aug", with the year added only when it differs from the snapshot's. */
export function activityDateLabel(isoDate: string | null, readAt: string): string | null {
  const match = isoDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  const year = match[1] === readAt.slice(0, 4) ? '' : ` ${match[1]}`;
  return `${Number(match[3])} ${month}${year}`;
}

/** '05' → '5', '02.1' → '2.1'; a non-numeric value as-is. */
export function displayPhaseNumber(raw: string | null): string | null {
  const text = raw?.trim();
  if (!text) return null;
  return text.replace(/^0+(?=\d)/, '');
}

function samePhaseNumber(left: string, right: string): boolean {
  if (left === right) return true;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber === rightNumber;
}

/** The current phase for the head: the live milestone first, then the archived milestone with the
 * same version (a shipped milestone's phases live only in its archive). */
export function headPhaseOf(presentation: ProjectPresentation): PhaseDto | null {
  const state = presentation.state;
  const number = state?.phaseNumber?.trim();
  if (!state || !number) return null;
  const version = state.milestone?.trim() || null;
  const candidates = [
    presentation.milestones.find((milestone) => !milestone.archived && milestone.version === version),
    version === null
      ? undefined
      : presentation.milestones.find((milestone) => milestone.archived && milestone.version === version),
  ];
  for (const milestone of candidates) {
    const phase = milestone?.phases.find((candidate) => samePhaseNumber(candidate.identity.number, number));
    if (phase) return phase;
  }
  return null;
}

function titleCaseSlug(name: string): string {
  return /^[a-z0-9-]+$/.test(name)
    ? name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : name;
}

function stateDone(state: ProjectStateDto): boolean {
  const { totalPlans, completedPlans, totalPhases, completedPhases } = state.progress;
  return (
    totalPlans !== null &&
    completedPlans !== null &&
    totalPhases !== null &&
    completedPhases !== null &&
    totalPlans > 0 &&
    completedPlans >= totalPlans &&
    completedPhases >= totalPhases
  );
}

function nowOf(state: ProjectStateDto | null, phase: PhaseDto | null): DashboardHeadNow | null {
  if (!state) return null;
  const milestone = [state.milestone?.trim(), state.milestoneName].filter(Boolean).join(' ') || null;
  const number = displayPhaseNumber(state.phaseNumber);
  const stateName = state.phaseName?.trim() ? titleCaseSlug(state.phaseName.trim()) : null;
  const title =
    (phase?.archived ? phase.name : null) ??
    stateName ??
    phase?.name ??
    (number ? `Phase ${number}` : null);
  const status = state.status?.trim()
    ? state.status.trim().charAt(0).toUpperCase() + state.status.trim().slice(1)
    : null;
  if (milestone === null && number === null && title === null && status === null) return null;
  return { milestone, phase: number, title, status, done: stateDone(state) };
}

function planTitleOf(artifacts: ArtifactDto[], path: string): string | null {
  const plan = artifacts.find((artifact) => artifact.path === path)?.structured.plan;
  const objective = plan && typeof plan === 'object' ? (plan as { objective?: unknown }).objective : null;
  const title = objective && typeof objective === 'object' ? (objective as { title?: unknown }).title : null;
  return typeof title === 'string' && title.trim() ? title.trim() : null;
}

function stepOf(presentation: ProjectPresentation, state: ProjectStateDto, done: boolean): DashboardHeadStep | null {
  const number = displayPhaseNumber(state.phaseNumber);
  if (!done && number !== null && Number.isFinite(Number(number))) {
    const phases = presentation.milestones
      .filter((milestone) => !milestone.archived)
      .flatMap((milestone) => milestone.phases)
      .filter((phase) => Number(phase.identity.number) >= Number(number))
      .sort((left, right) => Number(left.identity.number) - Number(right.identity.number));
    for (const phase of phases) {
      const plan = [...phase.plans].sort((left, right) => left.id.localeCompare(right.id)).find((candidate) => candidate.summary === null);
      if (plan) {
        return {
          kind: 'plan',
          id: plan.id,
          title: planTitleOf(presentation.artifacts, plan.path) ?? plan.description ?? `Plan ${plan.id}`,
          url: plan.key,
        };
      }
    }
  }
  if (done) return { kind: 'milestone', id: null, title: 'Start the next milestone', url: null };
  const focus = state.currentFocus?.replace(/`/g, '') ?? null;
  const focusClause = focus && !/^Phase\s/i.test(focus) ? activityClause(focus) : null;
  if (focusClause) return { kind: 'focus', id: null, title: focusClause, url: null };
  if (number !== null) {
    const verb = /plan/i.test(state.status ?? '') ? 'Plan' : 'Continue';
    return { kind: 'phase', id: null, title: `${verb} phase ${number}`, url: null };
  }
  return null;
}

function nextOf(presentation: ProjectPresentation, phase: PhaseDto | null): DashboardHeadNext | null {
  const state = presentation.state;
  if (!state) return null;
  const step = stepOf(presentation, state, stateDone(state));
  const plans = [...(phase?.plans ?? [])]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((plan) => ({
      id: plan.id,
      done: plan.summary !== null,
      next: step?.kind === 'plan' && step.id === plan.id,
    }));
  const completed = plans.filter((plan) => plan.done).length;
  const text = activityClause(state.lastActivityDescription);
  const dateLabel = activityDateLabel(state.lastActivity, presentation.readAt);
  return {
    plans,
    completed,
    percent: plans.length > 0 ? Math.round((completed / plans.length) * 100) : null,
    last: dateLabel || text ? { date: state.lastActivity, dateLabel, text } : null,
    step,
  };
}

export function buildDashboardHead(presentation: ProjectPresentation): DashboardHead {
  const project = presentation.artifacts.find(
    (artifact) => artifact.kind === 'project' && artifact.location === 'root',
  );
  const { name, tagline } = splitProjectTitle(project ? presentation.projectName : null, presentation.rootPath);
  const sections = project?.structured.sections;
  const whatThisIs = Array.isArray(sections)
    ? (sections as unknown[]).find(
        (section): section is { heading: string; body: string } =>
          typeof section === 'object' &&
          section !== null &&
          typeof (section as { heading?: unknown }).heading === 'string' &&
          typeof (section as { body?: unknown }).body === 'string' &&
          /^what this is\b/i.test((section as { heading: string }).heading),
      )
    : undefined;
  const phase = headPhaseOf(presentation);
  return {
    name,
    tagline,
    lead: whatThisIs ? whatThisIsLead(whatThisIs.body) : null,
    now: nowOf(presentation.state, phase),
    next: nextOf(presentation, phase),
  };
}
