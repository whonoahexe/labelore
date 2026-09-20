// A document usually opens with an H1 that is also the artifact's own title — deriveTitle() takes
// the first `# ` heading — and the page header already renders that title as its H1. Showing both
// puts the same words on screen twice (and two H1s in the accessibility tree) directly above one
// another. DOM-free and separate from artifact-page.tsx so it is unit-testable.
import type { RenderedDocument } from '../../rendering/markdown.ts';

/** Returns the document without its leading H1 when that H1 repeats `title`; otherwise the
 * document unchanged (same object, so memoised consumers see no change). Only a first heading that
 * is depth 1, whose id opens the html, and whose text equals the title is removed — a frontmatter
 * title that differs from the H1 leaves both on the page, since they say different things. The
 * heading is dropped from `headings` too, so the outline never lists a section that is gone. */
export function dropLeadingTitle(document: RenderedDocument, title: string): RenderedDocument {
  const [first, ...rest] = document.headings;
  if (!first || first.depth !== 1 || first.text.trim() !== title.trim()) return document;
  const opening = `<h1 id="${first.id}"`;
  const html = document.html.trimStart();
  if (!html.startsWith(opening)) return document;
  const close = html.indexOf('</h1>');
  if (close === -1) return document;
  return {
    ...document,
    html: html.slice(close + '</h1>'.length).trimStart(),
    headings: rest,
  };
}
