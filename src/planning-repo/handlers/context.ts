// CONTEXT.md — the six pseudo-XML tag sections (never headings): <domain>, <decisions>,
// <specifics>, <canonical_refs>, <code_context>, <deferred>. No YAML frontmatter at all — this
// file's structure lives entirely in these tags, confirmed against gsd-core/templates/context.md.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { parseDecisionEntries } from './section-projection.ts';
import { extractContextBrief } from './context-brief.ts';

const CONTEXT_TAGS = ['domain', 'decisions', 'specifics', 'canonical_refs', 'code_context', 'deferred'] as const;

function extractTag(body: string, tag: string): string | null {
  // Line-scanning via a single anchored, non-backtracking-prone expression per tag (T-01-11) —
  // bounded by the specific tag name, never a catastrophic generic `.*` across the whole document.
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

/** The six tag names with no underscore (`domain`, `decisions`, `specifics`, `deferred`) are
 * valid CommonMark HTML tag names, so a standalone `<domain>`/`<decisions>`/… line opens an
 * HTML block (type 7) that swallows every following line — including an immediately-adjacent
 * `## Heading` line with no blank line to close the block — as literal, unparsed text. The real
 * `05-CONTEXT.md` corpus file hits this exactly: `<decisions>\n## Implementation Decisions`
 * never becomes an `<h2>`, so VIEW-05's `context` manifest has nothing to promote. `extractTag`
 * above already ran against the untouched `fm.body`; this only changes the copy handed to the
 * markdown-to-HTML render pipeline — blanking the six tag-only lines (never their content)
 * removes the HTML-block trigger without disturbing anything `structured.sections` reads. */
function stripContextTagLines(body: string): string {
  const pattern = new RegExp(`^[ \\t]*</?(?:${CONTEXT_TAGS.join('|')})>[ \\t]*$`, 'gm');
  return body.replace(pattern, '');
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

    // quick-260923-lju (sketch-006 D1): the CONTEXT brief projection, guarded by try/catch so a
    // throw here never breaks `decisions`/`sections` below (T-lju-04, C-1) — a parse failure just
    // omits `brief`, and the page falls back to the pre-existing promoted-block view.
    let brief;
    try {
      brief = extractContextBrief(fm.body);
    } catch {
      brief = undefined;
    }

    return {
      title,
      frontmatter: fm.data,
      body: stripContextTagLines(fm.body),
      warning: fm.warning,
      structured: { decisions: parseDecisionEntries(sections.decisions), sections, brief },
    };
  },
};
