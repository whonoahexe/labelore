// PLAN.md — lifts its documented frontmatter (including the nested must_haves object) as an open
// map with no schema validation, and keeps the body verbatim with its pseudo-XML task tags
// untouched — Phase 2's renderer needs them intact, not pre-parsed here.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { parsePlanFileName } from '../naming.ts';

export const PlanHandler: ArtifactHandler = {
  kind: 'plan',
  match: (ref) => {
    if (ref.location !== 'phase' && ref.location !== 'archived-phase') return false;
    const parsed = parsePlanFileName(basename(ref.path));
    return parsed.matched && parsed.kind === 'plan';
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
