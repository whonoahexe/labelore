// PROJECT.md — named sections (What This Is / Core Value / Requirements / Context / Constraints /
// Key Decisions / Evolution) plus the Key Decisions table, which is the closest thing to a
// project-wide decision log outside per-phase D-NN ids (and is NOT ID-keyed at this level).
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { splitSections, parseMarkdownTable } from './markdown-sections.ts';

export const ProjectHandler: ArtifactHandler = {
  kind: 'project',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'PROJECT.md',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    const sections = splitSections(fm.body);
    const keyDecisionsSection = sections.find((s) => /key decisions/i.test(s.heading));

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: {
        sections,
        keyDecisions: keyDecisionsSection ? parseMarkdownTable(keyDecisionsSection.body) : [],
      },
    };
  },
};
