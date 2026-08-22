// Covers every artifact type whose only structured content is its frontmatter — VALIDATION,
// SECURITY, UI-SPEC, UAT, VERIFICATION, LEARNINGS. Matches on the artifact token from naming.ts,
// never on content, and lifts frontmatter as an open map with no type-specific parsing. Adding a
// future artifact type of this shape is a one-line token addition to KNOWN_TOKENS, keeping the
// registry additive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';

const KNOWN_TOKENS = new Set(['VALIDATION', 'SECURITY', 'UI-SPEC', 'UAT', 'VERIFICATION', 'LEARNINGS']);

export const FrontmatterOnlyHandler: ArtifactHandler = {
  kind: 'frontmatter-only',
  match: (ref) => {
    const token = artifactTokenOf(ref);
    return token !== null && KNOWN_TOKENS.has(token);
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
