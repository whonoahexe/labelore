// The unconditionally-matching fallback handler (DATA-02, TGT-05). Registered LAST in HANDLERS —
// see the load-bearing comment at that array's declaration in registry.ts.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';

export const GenericMarkdownHandler: ArtifactHandler = {
  kind: 'unknown',
  match: () => true,
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
    };
  },
};
