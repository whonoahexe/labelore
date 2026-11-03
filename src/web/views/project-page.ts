// The PROJECT.md page composer (Phase 9, 09-07, sketch 041 B: masthead + spine): a pure `ViewInput` ->
// `ComposedProjectPage` merge of the `projectContext` the server joins on (the project's name, what it is,
// its core value and the requirement-state counts). It decides the masthead (eyebrow, the project name, the
// what-it-is line and the core-value card) and the strip of count tiles under it; the milestone goal and the
// margin (09-08) and the decision spine (09-09) are filled by those plans, so they stay null here.
// No DOM, no filesystem access, no rendering - `project-page-components.tsx` is the only consumer. The
// module imports types only. Returns `null` when the projection is missing, or when it holds nothing
// beyond the project's name, so a PROJECT.md with no recognised section keeps the generic document view
// and its existing fallback (the composer returns null, UI-SPEC thin and odd inputs). The composer builds no
// regular expression and uses no regular-expression literal (contract).
// T-09-14 / T-09-15: every string is author text rendered as React text by the components; the only
// navigation targets are urls the server's `projectContext` built from the fixed state list.
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
  /** The milestone goal cell's label and text; 09-08 fills them, null until then. */
  goalLabel: string | null;
  goal: string | null;
  /** The four count tiles, in order; each a link into traceability. */
  tiles: ProjectTile[];
}

export interface ComposedProjectPage {
  masthead: ComposedProjectMasthead;
  strip: ComposedProjectStrip | null;
  /** 09-08: the margin (Bound by, Will not do and the footer links). */
  margin: null;
  /** 09-09: the decision spine. */
  decisions: null;
}

function nonBlank(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return value.trim().length > 0 ? value : null;
}

function stripOf(context: ProjectContext): ComposedProjectStrip | null {
  const tiles = context.tiles;
  if (!Array.isArray(tiles) || tiles.length === 0) return null;
  return { goalLabel: null, goal: null, tiles };
}

export function composeProjectPage(input: ViewInput): ComposedProjectPage | null {
  const context = input.projectContext;
  if (!context || typeof context.name !== 'string' || context.name.trim().length === 0) return null;
  const lead = nonBlank(context.lead);
  const coreValue = nonBlank(context.coreValue);
  const strip = stripOf(context);
  if (lead === null && coreValue === null && strip === null) return null;
  return {
    masthead: { eyebrow: 'Project', name: context.name, lead, coreValue },
    strip,
    margin: null,
    decisions: null,
  };
}
