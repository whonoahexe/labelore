// The unconditionally-matching fallback handler (DATA-02, TGT-05). Registered LAST in HANDLERS —
// see the load-bearing comment at that array's declaration in registry.ts.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';

function deriveTitle(content: string, path: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  return path;
}

export const GenericMarkdownHandler: ArtifactHandler = {
  kind: 'unknown',
  match: () => true,
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title =
      typeof fm.data.title === 'string' && fm.data.title.length > 0
        ? fm.data.title
        : deriveTitle(fm.body, ref.path);
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
    };
  },
};
