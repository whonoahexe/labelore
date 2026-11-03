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

/** The context for the root PROJECT.md page. */
export function buildProjectContext(presentation: ProjectPresentation): ProjectContext {
  const project = presentation.artifacts.find(
    (artifact) => artifact.kind === 'project' && artifact.location === 'root',
  );
  const { name, tagline } = splitProjectTitle(project ? presentation.projectName : null, presentation.rootPath);
  return {
    name,
    tagline,
    lead: projectSectionLead(presentation, /^what this is\b/i),
    coreValue: projectSectionLead(presentation, /^core value\b/i),
    counts: null,
    tiles: null,
    dashboardUrl: '/',
  };
}
