// STATE.md — the project's living memory. Frontmatter is kept whole for pass-through (open map);
// the body is split into its ordered ## sections, including the "Quick Tasks Completed" table,
// which GSD-DOMAIN.md names as the authoritative status index for quick/ (never inferred from
// directory contents).
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { splitSections, splitSubsections, parseMarkdownTable } from './markdown-sections.ts';

/**
 * "### Quick Tasks Completed" is an observed-only subsection nested inside "## Accumulated
 * Context" (GSD-DOMAIN.md), not a top-level `##` section — search one level deeper.
 */
function findQuickTasksTable(sections: { heading: string; body: string }[]): string | null {
  for (const section of sections) {
    if (/quick tasks/i.test(section.heading)) return section.body;
    const sub = splitSubsections(section.body).find((s) => /quick tasks/i.test(s.heading));
    if (sub) return sub.body;
  }
  return null;
}

function isBlockersHeading(heading: string): boolean {
  return /^blockers(?:\s*\/\s*concerns)?$/i.test(heading.trim());
}

function isDecisionsHeading(heading: string): boolean {
  return /^decisions$/i.test(heading.trim());
}

/** First `##` section, or `###` subsection inside one, whose heading passes `matches`. */
function findSection(
  sections: { heading: string; body: string }[],
  matches: (heading: string) => boolean,
): { heading: string; body: string } | null {
  for (const section of sections) {
    if (matches(section.heading)) return section;
    const subsection = splitSubsections(section.body).find((candidate) =>
      matches(candidate.heading),
    );
    if (subsection) return subsection;
  }
  return null;
}

export const StateHandler: ArtifactHandler = {
  kind: 'state',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'STATE.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    const sections = splitSections(fm.body);
    const quickTasksBody = findQuickTasksTable(sections);
    const blockersConcerns = findSection(sections, isBlockersHeading);
    const decisions = findSection(sections, isDecisionsHeading);

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: {
        sections,
        blockersConcerns,
        decisions,
        quickTasksCompleted: quickTasksBody ? parseMarkdownTable(quickTasksBody) : [],
      },
    };
  },
};
