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

/** GSD's next action, routed the way `/gsd-next` routes it — from the plan, summary, context and
 * verification files on disk, never from STATE.md's wording. `plan` is set only on an execute step:
 * the first plan in that phase with no SUMMARY.md. */
export interface DashboardHeadStep {
  kind: 'execute' | 'discuss' | 'plan' | 'verify' | 'complete-milestone' | 'new-milestone';
  title: string;
  plan: { id: string; url: string } | null;
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

/** A PROJECT.md section cut to a lead: a leading bold sentence if there is one, otherwise sentences
 * until the lead reaches 70 characters (never more than two); a lead over 160 characters is cut at
 * its first " — " or ": ". */
export function sectionLead(sectionBody: string): string | null {
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

/** About two lines of a 48rem lede. */
const MAX_TWO_LINE_CHARS = 150;

/** A section's first paragraph, emphasis flattened, cut to the whole sentences that fit two lede
 * lines. A first sentence too long on its own is cut at its last " — ", ":", ";" or "," that fits
 * and closed with a full stop; null when even that does not fit, never an ellipsis. */
export function twoLineLead(sectionBody: string): string | null {
  const [first] = paragraphs(sectionBody);
  if (!first) return null;
  const text = withoutEmphasis(first);
  let lead = '';
  for (const sentence of sentences(text)) {
    const next = lead ? `${lead} ${sentence}` : sentence;
    if (next.length > MAX_TWO_LINE_CHARS) break;
    lead = next;
  }
  if (lead) return lead;
  const clause = text.slice(0, MAX_TWO_LINE_CHARS).match(/^(.{20,})(?:\s+—\s+|[:;,]\s+)/);
  return clause ? `${clause[1]}.` : null;
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

function byPhaseNumber(left: PhaseDto, right: PhaseDto): number {
  return Number(left.identity.number) - Number(right.identity.number);
}

function firstOpenPlan(phase: PhaseDto) {
  return [...phase.plans].sort((left, right) => left.id.localeCompare(right.id)).find((plan) => plan.summary === null);
}

function phaseArtifacts(presentation: ProjectPresentation, phase: PhaseDto, kind: string): ArtifactDto[] {
  return presentation.artifacts.filter((artifact) => artifact.phaseKey === phase.key && artifact.kind === kind);
}

/** A phase is verified once its VERIFICATION.md passed or its UAT.md is complete. */
function phaseVerified(presentation: ProjectPresentation, phase: PhaseDto): boolean {
  const statusIs = (kind: string, value: string) =>
    phaseArtifacts(presentation, phase, kind).some(
      (artifact) => typeof artifact.frontmatter.status === 'string' && artifact.frontmatter.status.trim().toLowerCase() === value,
    );
  return statusIs('verification', 'passed') || statusIs('uat', 'complete');
}

function phaseLabel(phase: PhaseDto): string {
  return displayPhaseNumber(phase.identity.number) ?? phase.identity.number;
}

function executeStep(phase: PhaseDto): DashboardHeadStep | null {
  const plan = firstOpenPlan(phase);
  return plan
    ? { kind: 'execute', title: `Execute phase ${phaseLabel(phase)}`, plan: { id: plan.id, url: plan.key } }
    : null;
}

function stepOf(presentation: ProjectPresentation, state: ProjectStateDto, current: PhaseDto | null): DashboardHeadStep | null {
  if (current?.archived) return { kind: 'new-milestone', title: 'Start the next milestone', plan: null };
  const version = state.milestone?.trim() || null;
  const phases = [
    ...(presentation.milestones.find((milestone) => !milestone.archived && milestone.version === version)?.phases ?? []),
  ].sort(byPhaseNumber);
  // A phase anywhere in the milestone with plans still missing summaries comes first, even below
  // the current one — a session that died mid-execution can leave STATE.md already moved on.
  for (const phase of phases) {
    const step = executeStep(phase);
    if (step) return step;
  }
  const number = displayPhaseNumber(state.phaseNumber);
  if (!current) return number ? { kind: 'discuss', title: `Discuss phase ${number}`, plan: null } : null;
  const label = phaseLabel(current);
  if (current.plans.length === 0) {
    const ready =
      phaseArtifacts(presentation, current, 'context').length > 0 || phaseArtifacts(presentation, current, 'research').length > 0;
    return { kind: ready ? 'plan' : 'discuss', title: `${ready ? 'Plan' : 'Discuss'} phase ${label}`, plan: null };
  }
  if (!phaseVerified(presentation, current)) return { kind: 'verify', title: `Verify phase ${label}`, plan: null };
  const following = phases.find((phase) => Number(phase.identity.number) > Number(current.identity.number));
  return following
    ? { kind: 'discuss', title: `Discuss phase ${phaseLabel(following)}`, plan: null }
    : { kind: 'complete-milestone', title: 'Complete the milestone', plan: null };
}

function nextOf(presentation: ProjectPresentation, phase: PhaseDto | null): DashboardHeadNext | null {
  const state = presentation.state;
  if (!state) return null;
  const step = stepOf(presentation, state, phase);
  const plans = [...(phase?.plans ?? [])]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((plan) => ({
      id: plan.id,
      done: plan.summary !== null,
      next: step?.plan?.url === plan.key,
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

/** The lead of the root PROJECT.md's `## ` section whose heading matches, or null. */
export function projectSectionLead(presentation: ProjectPresentation, heading: RegExp): string | null {
  const project = presentation.artifacts.find(
    (artifact) => artifact.kind === 'project' && artifact.location === 'root',
  );
  const sections = project?.structured.sections;
  const section = Array.isArray(sections)
    ? (sections as unknown[]).find(
        (candidate): candidate is { heading: string; body: string } =>
          typeof candidate === 'object' &&
          candidate !== null &&
          typeof (candidate as { heading?: unknown }).heading === 'string' &&
          typeof (candidate as { body?: unknown }).body === 'string' &&
          heading.test((candidate as { heading: string }).heading),
      )
    : undefined;
  return section ? sectionLead(section.body) : null;
}

export function buildDashboardHead(presentation: ProjectPresentation): DashboardHead {
  const project = presentation.artifacts.find(
    (artifact) => artifact.kind === 'project' && artifact.location === 'root',
  );
  const { name, tagline } = splitProjectTitle(project ? presentation.projectName : null, presentation.rootPath);
  const phase = headPhaseOf(presentation);
  return {
    name,
    tagline,
    lead: projectSectionLead(presentation, /^what this is\b/i),
    now: nowOf(presentation.state, phase),
    next: nextOf(presentation, phase),
  };
}
