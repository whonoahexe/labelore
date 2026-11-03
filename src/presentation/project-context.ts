// The project page's server-side join (Phase 9, 09-07, sketch 041 B): what the PROJECT.md page needs
// from elsewhere in the cached presentation, built once per document request - the project's name and
// tagline, the what-it-is lead and the core value (the dashboard's own PROJECT.md readers, so the pages
// that quote PROJECT.md quote it the same way), and the requirement-state counts with the links the
// count tiles carry (traceability's own projection, never PROJECT.md's bullets, D-05).
// Pure: it reads the cached `ProjectPresentation`, never a file, imports nothing from Node and builds no
// regular expression from document text. It never throws on presentation data. Every link is built by
// `traceabilityStateUrl` from the fixed state list and the payload's own milestone version (T-09-15).
import type { ProjectPresentation } from '../server/project-presentation.ts';
import { projectSectionLead, splitProjectTitle } from './dashboard-head.ts';
import { requirementStateCounts, traceabilityStateUrl } from './traceability.ts';
import type { RequirementState, RequirementStateCounts } from './traceability.ts';

/** One count tile: a requirement state, its number and the traceability address that lists those rows. */
export interface ProjectTile {
  state: RequirementState;
  count: number;
  label: 'complete' | 'pending' | 'shipped before' | 'out of scope';
  /** The mono sub-line: "in v1.1", "v1.0 45 · v1.1 11", "by choice". */
  sub: string;
  /** The full sub-line text for the tooltip, or null when the sub-line is not shortened. */
  title: string | null;
  url: string;
  tone: 'complete' | 'quiet';
}

export interface ProjectContext {
  name: string;
  tagline: string | null;
  /** The What This Is lead, cut by the dashboard's lead rules, or null without that section. */
  lead: string | null;
  /** The Core Value lead, cut by the same rules, or null without that section. */
  coreValue: string | null;
  /** The traceability projection's counts, or null when there is nothing to count. */
  counts: RequirementStateCounts | null;
  /** The four tiles in the order complete, pending, shipped before, out of scope; null without counts. */
  tiles: ProjectTile[] | null;
  /** The dashboard, where the page's footer link ("Where the work is now") lands. */
  dashboardUrl: '/';
}

/** A tile's tone: the numbered states take their documented tone, and a count of 0 is always quiet. */
function toneOf(count: number, tone: ProjectTile['tone']): ProjectTile['tone'] {
  return count === 0 ? 'quiet' : tone;
}

/** The shipped-before breakdown, oldest first ("v1.0 45 · v1.1 11"), or null when no milestone shipped. */
function breakdownOf(counts: RequirementStateCounts): string | null {
  if (counts.validatedByMilestone.length === 0) return null;
  return [...counts.validatedByMilestone]
    .sort((left, right) => left.version.localeCompare(right.version, undefined, { numeric: true }))
    .map((entry) => `${entry.version} ${entry.count}`)
    .join(' \u00b7 ');
}

/** The four count tiles (D-05): every number from `requirementStateCounts`, every link from
 * `traceabilityStateUrl` with the milestone only on the two that describe the active tier. */
function tilesOf(counts: RequirementStateCounts): ProjectTile[] {
  const inMilestone = counts.milestone === null ? 'in the current milestone' : `in ${counts.milestone}`;
  const breakdown = breakdownOf(counts);
  return [
    {
      state: 'complete',
      count: counts.complete,
      label: 'complete',
      sub: inMilestone,
      title: null,
      url: traceabilityStateUrl('complete', counts.milestone),
      tone: toneOf(counts.complete, 'complete'),
    },
    {
      state: 'pending',
      count: counts.pending,
      label: 'pending',
      sub: inMilestone,
      title: null,
      url: traceabilityStateUrl('pending', counts.milestone),
      tone: 'quiet',
    },
    {
      state: 'validated',
      count: counts.validated,
      label: 'shipped before',
      sub: breakdown ?? 'none yet',
      title: breakdown,
      url: traceabilityStateUrl('validated'),
      tone: toneOf(counts.validated, 'complete'),
    },
    {
      state: 'out-of-scope',
      count: counts.outOfScope,
      label: 'out of scope',
      sub: 'by choice',
      title: null,
      url: traceabilityStateUrl('out-of-scope'),
      tone: 'quiet',
    },
  ];
}

/** The context for the root PROJECT.md page. */
export function buildProjectContext(presentation: ProjectPresentation): ProjectContext {
  const project = presentation.artifacts.find(
    (artifact) => artifact.kind === 'project' && artifact.location === 'root',
  );
  const { name, tagline } = splitProjectTitle(project ? presentation.projectName : null, presentation.rootPath);
  const counts = requirementStateCounts(presentation);
  return {
    name,
    tagline,
    lead: projectSectionLead(presentation, /^what this is\b/i),
    coreValue: projectSectionLead(presentation, /^core value\b/i),
    counts,
    tiles: counts === null ? null : tilesOf(counts),
    dashboardUrl: '/',
  };
}
