// The dashboard head (quick-261017-wlg, sketch 025 R3b; position block quick-261115-o34, sketches 066 C and
// 067 S): the project's name and What This Is lead, plus the position block built in dashboard-position.ts.
// Pure — no node:* or React imports. Every extractor is total, and author text is capped before any regex
// runs, so a hostile or huge PROJECT.md / STATE.md cannot throw or stall the dashboard route.
import type { PhaseDto, ProjectPresentation } from '../server/project-presentation.ts';
import { buildDashboardPosition, type DashboardPosition } from './dashboard-position.ts';
import { projectDisplayName } from './shell-header.ts';

const MAX_SECTION_CHARS = 20000;
const MAX_PARAGRAPH_CHARS = 2000;
const MAX_ACTIVITY_CHARS = 400;
const MAX_CLAUSE_CHARS = 72;

export interface DashboardHead {
  name: string;
  tagline: string | null;
  lead: string | null;
  /** Then / Now / Next, derived from the files on disk; null when there is no roadmap or phase to place. */
  position: DashboardPosition | null;
  /** The address of the root PROJECT.md (the project page); null when the project has none. */
  projectUrl: string | null;
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

/** Sentence split that ignores full stops inside code spans and in names like "lendshed.example". */
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

/** The lead of the root PROJECT.md's `## ` section whose heading matches, or null. */
export function projectSectionLead(presentation: ProjectPresentation, heading: RegExp): string | null {
  const body = projectSectionBody(presentation, heading);
  return body === null ? null : sectionLead(body);
}

function projectSectionBody(presentation: ProjectPresentation, heading: RegExp): string | null {
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
  return section ? section.body : null;
}

export function buildDashboardHead(presentation: ProjectPresentation): DashboardHead {
  const project = presentation.artifacts.find(
    (artifact) => artifact.kind === 'project' && artifact.location === 'root',
  );
  const { name, tagline } = splitProjectTitle(project ? presentation.projectName : null, presentation.rootPath);
  return {
    name,
    tagline,
    lead: projectSectionLead(presentation, /^what this is\b/i),
    position: buildDashboardPosition(presentation),
    projectUrl: project?.key ?? null,
  };
}
