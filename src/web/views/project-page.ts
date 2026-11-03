// The PROJECT.md page composer (Phase 9, 09-07, sketch 041 B: masthead + spine): a pure `ViewInput` ->
// `ComposedProjectPage` merge of the `projectContext` the server joins on (the project's name, what it is,
// its core value and the requirement-state counts) and of `structured.project` (the current milestone and its
// goal, 09-08). It decides the masthead (eyebrow, the project name, the what-it-is line and the core-value
// card) and the strip under it: the goal cell ("Now building {milestone}" and its goal) and the count tiles.
// It also decides the margin (what binds the project, what it will not do, when it was last updated and the
// way back to the dashboard). The decision spine (09-09) is filled by that plan, so it stays null here.
// No DOM, no filesystem access, no rendering - `project-page-components.tsx` is the only consumer. The
// module imports types only. Returns `null` when the projection is missing, or when it holds nothing
// beyond the project's name, so a PROJECT.md with no recognised section keeps the generic document view
// and its existing fallback (the composer returns null, UI-SPEC thin and odd inputs). The composer builds no
// regular expression and uses no regular-expression literal (contract).
// T-09-14 / T-09-15: every string is author text rendered as React text by the components; the only
// navigation targets are urls the server's `projectContext` built from the fixed state list.
import type { ProjectBullet, ProjectStructure } from '../../planning-repo/handlers/project.ts';
import type { ProjectContext, ProjectTile } from '../../presentation/project-context.ts';
import type { ViewInput } from './manifest.ts';

export interface ComposedProjectMasthead {
  eyebrow: 'Project';
  name: string;
  /** What the project is, cut by the dashboard's lead rules, or null without that section. */
  lead: string | null;
  /** The core-value card's text, or null (the card is then omitted silently). */
  coreValue: string | null;
}

export interface ComposedProjectStrip {
  /** The goal cell's label ("Now building v1.1 Steward Desk"), or null without a Current Milestone section. */
  goalLabel: string | null;
  /** The Current Milestone's goal, or null (the cell then shows its label alone). */
  goal: string | null;
  /** The four count tiles, in order, each a link into traceability; null without a requirements projection. */
  tiles: ProjectTile[] | null;
}

export interface ComposedProjectMargin {
  /** "Bound by": PROJECT.md's Constraints bullets, in order. */
  constraints: ProjectBullet[];
  /** "Will not do": PROJECT.md's Out of Scope bullets, in order. */
  outOfScope: ProjectBullet[];
  /** The footer's "Last updated" text, or null. */
  lastUpdated: string | null;
  /** Where "Where the work is now" lands: the dashboard, from the server's context. */
  dashboardUrl: string;
}

export interface ComposedProjectPage {
  masthead: ComposedProjectMasthead;
  strip: ComposedProjectStrip | null;
  /** The margin, or null when there is no list and no last-updated line (the main column then fills the page). */
  margin: ComposedProjectMargin | null;
  /** 09-09: the decision spine. */
  decisions: null;
}

function nonBlank(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return value.trim().length > 0 ? value : null;
}

/** `structured.project`, tolerantly: an older server's payload, or a throwing extraction, has none. */
function projectOf(structured: Record<string, unknown> | undefined): Partial<ProjectStructure> | null {
  const project = structured?.project;
  if (typeof project !== 'object' || project === null || Array.isArray(project)) return null;
  return project as Partial<ProjectStructure>;
}

function bulletsOf(value: unknown): ProjectBullet[] {
  if (!Array.isArray(value)) return [];
  const bullets: ProjectBullet[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { name, text } = entry as Partial<ProjectBullet>;
    const kept = typeof text === 'string' ? text : '';
    const label = typeof name === 'string' ? name : '';
    if (label.trim() === '' && kept.trim() === '') continue;
    bullets.push({ name: label, text: kept });
  }
  return bullets;
}

function marginOf(context: ProjectContext, project: Partial<ProjectStructure> | null): ComposedProjectMargin | null {
  const constraints = bulletsOf(project?.constraints);
  const outOfScope = bulletsOf(project?.outOfScope);
  const lastUpdated = nonBlank(project?.lastUpdated);
  if (constraints.length === 0 && outOfScope.length === 0 && lastUpdated === null) return null;
  return { constraints, outOfScope, lastUpdated, dashboardUrl: context.dashboardUrl };
}

function stripOf(context: ProjectContext, project: Partial<ProjectStructure> | null): ComposedProjectStrip | null {
  const tiles = Array.isArray(context.tiles) && context.tiles.length > 0 ? context.tiles : null;
  const milestone = project?.milestone;
  let goalLabel: string | null = null;
  let goal: string | null = null;
  if (milestone && typeof milestone === 'object') {
    const label = nonBlank(milestone.label);
    goal = nonBlank(milestone.goal);
    goalLabel = label !== null ? `Now building ${label}` : goal !== null ? 'Now building' : null;
  }
  if (tiles === null && goalLabel === null && goal === null) return null;
  return { goalLabel, goal, tiles };
}

export function composeProjectPage(input: ViewInput): ComposedProjectPage | null {
  const context = input.projectContext;
  if (!context || typeof context.name !== 'string' || context.name.trim().length === 0) return null;
  const lead = nonBlank(context.lead);
  const coreValue = nonBlank(context.coreValue);
  const project = projectOf(input.structured);
  const strip = stripOf(context, project);
  const margin = marginOf(context, project);
  if (lead === null && coreValue === null && strip === null && margin === null) return null;
  return {
    masthead: { eyebrow: 'Project', name: context.name, lead, coreValue },
    strip,
    margin,
    decisions: null,
  };
}
