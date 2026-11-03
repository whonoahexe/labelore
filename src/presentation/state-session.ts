// STATE.md's Session Continuity, Deferred Items and Operator Next Steps as one capped projection for the
// dashboard's Next up card (09 D-03 as amended 2026-11-02: STATE.md opens on the dashboard, so what only
// STATE.md held is filled there). Pure: no node:* or React imports, never throws. Author text is capped
// before any scan, every scan is one pass over lines with a bounded single-line pattern, and every link
// is an artifact key or sourceUrlOf plus a stableSlug anchor — nothing STATE.md says becomes a target.
import { stableSlug } from '../rendering/slug.ts';
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { activityDateLabel } from './dashboard-head.ts';
import { sourceUrlOf } from './root-redirects.ts';

const MAX_SECTION_CHARS = 20000;
const MAX_LINE_CHARS = 2000;
const MAX_FIELD_CHARS = 400;
const MAX_STEPS = 20;

export interface StateSession {
  stoppedAt: string | null;
  lastSession: string | null;
  /** "2 Nov" from lastSession's date, or null when its first ten characters are not a YYYY-MM-DD date. */
  lastSessionLabel: string | null;
  resumeFile: { path: string; url: string | null } | null;
  operatorSteps: string[];
  deferredCount: number | null;
  /** The address that opens STATE.md's own file. */
  sourceUrl: string | null;
  deferredUrl: string | null;
  stepsUrl: string | null;
}

interface Section {
  heading: string;
  body: string;
}

function isSection(candidate: unknown): candidate is Section {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const { heading, body } = candidate as { heading?: unknown; body?: unknown };
  return typeof heading === 'string' && typeof body === 'string';
}

function sectionNamed(sections: Section[], name: string): Section | null {
  return sections.find((section) => section.heading.slice(0, 200).trim().toLowerCase() === name) ?? null;
}

function cap(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

/** Drops the emphasis markers around a labelled value, then caps it. */
function cleanValue(text: string): string {
  return cap(text.replace(/\*\*|`/g, '').trim(), MAX_FIELD_CHARS);
}

const LABELLED = /^[\s>*_-]{0,8}(Last session|Stopped at|Resume file)\s*:\s*\**\s*(.{0,2000})$/i;

interface SessionFields {
  lastSession: string | null;
  stoppedAt: string | null;
  resumePath: string | null;
}

function sessionFields(body: string): SessionFields {
  const fields: SessionFields = { lastSession: null, stoppedAt: null, resumePath: null };
  for (const line of body.slice(0, MAX_SECTION_CHARS).split('\n')) {
    const match = line.slice(0, MAX_LINE_CHARS).match(LABELLED);
    if (!match) continue;
    const value = cleanValue(match[2]);
    if (!value) continue;
    const label = match[1].toLowerCase();
    if (label === 'last session') fields.lastSession ??= value;
    else if (label === 'stopped at') fields.stoppedAt ??= value;
    else fields.resumePath ??= value;
  }
  return fields;
}

/** The count of non-blank data rows in the section's first pipe table; null when it has none. */
function deferredRowCount(body: string): number | null {
  let header = false;
  let separator = false;
  let rows = 0;
  for (const raw of body.slice(0, MAX_SECTION_CHARS).split('\n')) {
    const line = raw.slice(0, MAX_LINE_CHARS).trim();
    if (!line.startsWith('|')) continue;
    if (!header) {
      header = true;
    } else if (!separator) {
      separator = true;
    } else if (line.split('|').slice(1, -1).some((cell) => cell.trim() !== '')) {
      rows += 1;
    }
  }
  return separator ? rows : null;
}

const TOP_LEVEL_BULLET = /^(?:[-*+]|\d{1,3}[.)])\s+(.{1,2000})$/;

function operatorSteps(body: string): string[] {
  const steps: string[] = [];
  for (const raw of body.slice(0, MAX_SECTION_CHARS).split('\n')) {
    if (steps.length >= MAX_STEPS) break;
    const match = raw.slice(0, MAX_LINE_CHARS).match(TOP_LEVEL_BULLET);
    if (!match) continue;
    const step = cleanValue(match[1]);
    if (step) steps.push(step);
  }
  return steps;
}

function resumeArtifactUrl(presentation: ProjectPresentation, resumePath: string): string | null {
  let path = resumePath.replace(/^\.\//, '');
  if (!path.startsWith('.planning/')) path = `.planning/${path}`;
  return presentation.artifacts.find((artifact) => artifact.path === path)?.key ?? null;
}

/** STATE.md's session lines, or null when it holds none of Session Continuity, Deferred Items or
 * Operator Next Steps (or the project has no STATE.md). */
export function buildStateSession(presentation: ProjectPresentation): StateSession | null {
  const artifact = presentation.artifacts.find(
    (candidate) =>
      candidate.kind === 'state' &&
      candidate.location === 'root' &&
      typeof candidate.path === 'string' &&
      candidate.path.endsWith('STATE.md'),
  );
  const rawSections = artifact?.structured.sections;
  if (!artifact || !Array.isArray(rawSections)) return null;
  const sections = (rawSections as unknown[]).filter(isSection);

  const session = sectionNamed(sections, 'session continuity');
  const deferred = sectionNamed(sections, 'deferred items');
  const steps = sectionNamed(sections, 'operator next steps');
  if (!session && !deferred && !steps) return null;

  const fields = session ? sessionFields(session.body) : { lastSession: null, stoppedAt: null, resumePath: null };
  const sourceUrl = sourceUrlOf(artifact);
  const anchored = (section: Section | null): string | null =>
    section && sourceUrl ? `${sourceUrl}#${stableSlug(section.heading)}` : null;

  return {
    stoppedAt: fields.stoppedAt,
    lastSession: fields.lastSession,
    lastSessionLabel: fields.lastSession
      ? activityDateLabel(fields.lastSession.slice(0, 10), presentation.readAt)
      : null,
    resumeFile: fields.resumePath
      ? { path: fields.resumePath, url: resumeArtifactUrl(presentation, fields.resumePath) }
      : null,
    operatorSteps: steps ? operatorSteps(steps.body) : [],
    deferredCount: deferred ? deferredRowCount(deferred.body) : null,
    sourceUrl,
    deferredUrl: anchored(deferred),
    stepsUrl: anchored(steps),
  };
}
