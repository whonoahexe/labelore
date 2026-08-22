// CONTEXT.md — the six pseudo-XML tag sections (never headings): <domain>, <decisions>,
// <specifics>, <canonical_refs>, <code_context>, <deferred>. No YAML frontmatter at all — this
// file's structure lives entirely in these tags, confirmed against gsd-core/templates/context.md.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';

const CONTEXT_TAGS = ['domain', 'decisions', 'specifics', 'canonical_refs', 'code_context', 'deferred'] as const;

function extractTag(body: string, tag: string): string | null {
  // Line-scanning via a single anchored, non-backtracking-prone expression per tag (T-01-11) —
  // bounded by the specific tag name, never a catastrophic generic `.*` across the whole document.
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

export const ContextHandler: ArtifactHandler = {
  kind: 'context',
  match: (ref) => artifactTokenOf(ref) === 'CONTEXT',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    const sections: Record<string, string | null> = {};
    for (const tag of CONTEXT_TAGS) {
      sections[tag] = extractTag(fm.body, tag);
    }

    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: { sections },
    };
  },
};
