// The PROJECT.md page composer (Phase 9, 09-07, sketch 041 B: masthead + spine): a pure `ViewInput` ->
// `ComposedProjectPage` merge of the `projectContext` the server joins on (the project's name, what it is,
// its core value and the requirement-state counts) and of `structured.project` (the current milestone and its
// goal, 09-08). It decides the masthead (eyebrow, the project name, the what-it-is line and the core-value
// card) and the strip under it: the goal cell ("Now building {milestone}" and its goal) and the count tiles.
// It also decides the margin (what binds the project, what it will not do, when it was last updated and the
// way back to the dashboard). It also decides the decision spine (09-09): every Key Decisions row in the
// author's order with its tone, the tally and the era markers where a milestone or phase tag changes.
// No DOM, no filesystem access, no rendering - `project-page-components.tsx` is the only consumer. The
// module imports types only. Returns `null` when the projection is missing, or when it holds nothing
// beyond the project's name, so a PROJECT.md with no recognised section keeps the generic document view
// and its existing fallback (the composer returns null, UI-SPEC thin and odd inputs). The composer builds no
// regular expression and uses no regular-expression literal (contract).
// T-09-14 / T-09-15: every string is author text rendered as React text by the components; the only
// navigation targets are urls the server's `projectContext` built from the fixed state list.
import type { ProjectBullet, ProjectDecisionOutcome, ProjectStructure } from '../../planning-repo/handlers/project.ts';
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

export type ComposedDecisionTone = 'complete' | 'in-flight' | 'missing' | 'quiet';

export interface ComposedDecisionRow {
  /** 1-based position in the table; the row's anchor is `view-project-decision-{n}`. */
  n: number;
  /** The position, two digits. */
  nn: string;
  decision: string;
  tag: string | null;
  /** The milestone or phase tag, or null (D-NN and quick tags never mark an era). */
  era: string | null;
  rationale: string;
  outcome: ProjectDecisionOutcome;
  outcomeLabel: string | null;
  note: string;
  tone: ComposedDecisionTone;
  /** True for Revisit, Reversed and Pending; Good and unclassified outcomes carry no chip. */
  chip: boolean;
}

export interface ComposedDecisionTally {
  outcome: ProjectDecisionOutcome;
  /** The legend word: good, revisit, reversed or pending. */
  label: string;
  tone: ComposedDecisionTone;
  count: number;
}

export interface ComposedDecisions {
  count: number;
  /** Every Key Decisions row, in the author's order. */
  rows: ComposedDecisionRow[];
  /** Per outcome, a zero tally dropped. */
  tally: ComposedDecisionTally[];
  /** Where the milestone or phase tag changes: the row index and the tag. */
  eras: Array<{ at: number; label: string }>;
}

export interface ComposedProjectPage {
  masthead: ComposedProjectMasthead;
  strip: ComposedProjectStrip | null;
  /** The margin, or null when there is no list and no last-updated line (the main column then fills the page). */
  margin: ComposedProjectMargin | null;
  /** The decision spine, or null without a Key Decisions table. */
  decisions: ComposedDecisions | null;
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

const TONES: Record<Exclude<ProjectDecisionOutcome, 'other'>, ComposedDecisionTone> = {
  good: 'complete',
  revisit: 'in-flight',
  reversed: 'missing',
  pending: 'quiet',
};
const OUTCOME_ORDER: Array<Exclude<ProjectDecisionOutcome, 'other'>> = ['good', 'revisit', 'reversed', 'pending'];

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function outcomeOf(value: unknown): ProjectDecisionOutcome {
  return value === 'good' || value === 'revisit' || value === 'reversed' || value === 'pending' ? value : 'other';
}

function decisionsOf(value: unknown): ComposedDecisions | null {
  if (!Array.isArray(value)) return null;
  const rows: ComposedDecisionRow[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    const decision = textOf(raw.decision);
    const outcome = outcomeOf(raw.outcome);
    const n = rows.length + 1;
    const tag = nonBlank(typeof raw.tag === 'string' ? raw.tag : null);
    rows.push({
      n,
      nn: String(n).padStart(2, '0'),
      decision,
      tag,
      era: tag !== null ? nonBlank(typeof raw.era === 'string' ? raw.era : null) : null,
      rationale: textOf(raw.rationale),
      outcome,
      outcomeLabel: outcome === 'other' ? null : outcome.charAt(0).toUpperCase() + outcome.slice(1),
      note: textOf(raw.note),
      tone: outcome === 'other' ? 'quiet' : TONES[outcome],
      chip: outcome === 'revisit' || outcome === 'reversed' || outcome === 'pending',
    });
  }
  if (rows.length === 0) return null;
  const tally: ComposedDecisionTally[] = [];
  for (const outcome of OUTCOME_ORDER) {
    const count = rows.filter((row) => row.outcome === outcome).length;
    if (count > 0) tally.push({ outcome, label: outcome, tone: TONES[outcome], count });
  }
  // An era marker sits where the milestone or phase tag changes; untagged and D-NN rows stay in the run they follow.
  const eras: Array<{ at: number; label: string }> = [];
  let current: string | null = null;
  rows.forEach((row, at) => {
    if (row.era !== null && row.era !== current) {
      eras.push({ at, label: row.era });
      current = row.era;
    }
  });
  return { count: rows.length, rows, tally, eras };
}

export function composeProjectPage(input: ViewInput): ComposedProjectPage | null {
  const context = input.projectContext;
  if (!context || typeof context.name !== 'string' || context.name.trim().length === 0) return null;
  const lead = nonBlank(context.lead);
  const coreValue = nonBlank(context.coreValue);
  const project = projectOf(input.structured);
  const strip = stripOf(context, project);
  const margin = marginOf(context, project);
  const decisions = decisionsOf(project?.decisions);
  if (lead === null && coreValue === null && strip === null && margin === null && decisions === null) return null;
  return {
    masthead: { eyebrow: 'Project', name: context.name, lead, coreValue },
    strip,
    margin,
    decisions,
  };
}
