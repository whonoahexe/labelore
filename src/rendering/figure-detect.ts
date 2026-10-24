// The single decision point for every fenced block in every document type: is it a box-drawing
// diagram, a directory tree, or ordinary code? The server markdown pipeline and every structured
// block renderer ask this one function, so a new document kind needs no figure wiring.
//
// Order matters: a system diagram on a real corpus often holds a full box rectangle AND three or
// more `├──` lines (a boxed package list), so the box-corner check runs before the tree check.
// Trees never contain the top corners, so a tree is never mistaken for a diagram. A flow drawn
// with branch glyphs but no boxes (three or more forward-arrow lines) is a diagram too. Pure and
// isomorphic: no DOM, no React.

import { isLiftableDiagram } from './ascii-lift.ts';
import { isDirectoryTree } from './ascii-tree.ts';

export type FigureKind = 'diagram' | 'tree';

/** Text over this size is never inspected. Mirrors the Mermaid source cap. */
export const FIGURE_MAX_CHARS = 256 * 1024;

/** Fence languages that may carry a figure. A fence tagged with a real language stays code, and
 * `mermaid` stays Mermaid. */
const FIGURE_LANGS: ReadonlySet<string> = new Set(['', 'text', 'txt', 'plain', 'plaintext', 'ascii']);

const BOX_CORNERS = ['┌', '┐', '└', '┘'] as const;

/** Forward arrows outside a `#` comment. A connector flow that borrows `├──` for its branches
 * ("├────►") has several lines with one; a directory tree's arrows live in its `#` comments. */
const FORWARD_ARROW = /[→►▶▼⟶➜➔]/;
const FLOW_ARROW_LINES = 3;

function hasFlowArrows(text: string): boolean {
  let count = 0;
  for (const line of text.split('\n')) {
    if (FORWARD_ARROW.test(line.slice(0, 2000).split('#', 1)[0])) count += 1;
    if (count >= FLOW_ARROW_LINES) return true;
  }
  return false;
}

/** First whitespace-delimited token of a fence info string, lowercased; '' when absent or blank. */
export function normalizeFenceLang(info: string | null | undefined): string {
  if (typeof info !== 'string') return '';
  const token = info.trim().split(/\s+/, 1)[0];
  return (token ?? '').toLowerCase();
}

export function classifyFence(lang: string | null | undefined, text: string): FigureKind | null {
  if (!FIGURE_LANGS.has(normalizeFenceLang(lang))) return null;
  if (text.length > FIGURE_MAX_CHARS) return null;

  const hasAllCorners = BOX_CORNERS.every((corner) => text.includes(corner));
  let liftable: boolean | null = null;
  const lifts = (): boolean => (liftable ??= isLiftableDiagram(text));

  if (hasAllCorners && lifts()) return 'diagram';
  if (isDirectoryTree(text)) {
    // Branch glyphs in a connector flow (three or more forward-arrow lines) are not a file tree.
    return hasFlowArrows(text) && lifts() ? 'diagram' : 'tree';
  }
  if (lifts()) return 'diagram';
  return null;
}
