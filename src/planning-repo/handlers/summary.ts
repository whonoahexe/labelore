// SUMMARY.md — lifts its documented frontmatter (including the nested coverage array) as an open
// map, and keeps the body verbatim. An absent `coverage` key and an empty `coverage: []` array are
// both preserved as gray-matter parsed them — the distinction (legacy prose-only summary vs. a
// summary that deliberately classified zero deliverables) is never collapsed here.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parsePlanFileName } from '../naming.ts';

export const SummaryHandler: ArtifactHandler = {
  kind: 'summary',
  match: (ref) => {
    if (ref.location !== 'phase' && ref.location !== 'archived-phase') return false;
    const parsed = parsePlanFileName(basename(ref.path));
    return parsed.matched && parsed.kind === 'summary';
  },
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: {},
    };
  },
};
