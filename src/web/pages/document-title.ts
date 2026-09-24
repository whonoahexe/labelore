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

/** GSD titles its phase documents `Phase 1: Portal-Owned Identity & Sessions - Discussion Log`.
 * On a cover page the eyebrow already names the document kind, so the phase moves up beside it
 * (`Phase 1 · Discussion log`) and the H1 keeps only the phase name. A title that doesn't match the
 * `Phase N: name` shape comes back unchanged with `phase: null`; the trailing ` - <kind>` is only
 * dropped when it repeats `kindLabel` (case-insensitive). */
export function splitPhaseTitle(
  title: string,
  kindLabel: string,
): { phase: string | null; title: string } {
  const match = /^\s*Phase\s+(\d+(?:\.\d+)*)\s*:\s*(.+?)\s*$/i.exec(title);
  if (!match) return { phase: null, title };
  let name = match[2]!;
  const suffix = new RegExp(`\\s+[-–—]\\s+${escapeRegExp(kindLabel.trim())}$`, 'i');
  name = name.replace(suffix, '').trim();
  if (!name) return { phase: null, title };
  return { phase: `Phase ${match[1]}`, title: name };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
