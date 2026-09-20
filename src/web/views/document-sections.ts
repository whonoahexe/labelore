// Splits an already-rendered document into top-level section groups, two ways: a pure, DOM-free
// grouping function (`groupDocumentSections`) consumed directly by unit tests, and a browser
// adapter (`splitRenderedDocument`) that walks the live DOM to produce the `SectionNode[]` input.
// `splitRenderedDocument`'s DOM surface is described by small structural interfaces declared
// locally in this module rather than by importing `lib.dom` types — that keeps this file
// type-checkable both under `tsconfig.web.json` (real DOM lib present) and under
// `tsconfig.server.json` (no DOM lib; reached only via a direct test import of the DOM-free
// exports). The local `declare const DOMParser` shadows the real global for type-checking
// purposes only — `declare` erases at compile time, so the emitted JS still resolves `DOMParser`
// to whatever is actually in scope at runtime.

export interface SectionNode {
  tag: string;
  id: string | null;
  text: string;
  html: string;
}

export interface DocumentSectionGroup {
  id: string | null;
  heading: string | null;
  html: string;
}

/** Populated by Plan 05-05 from `renderPlanRange`'s `data-plan-ordinal`/`data-plan-section`/
 * `data-plan-gate` attributes (VIEW-04, Tag Projection Pattern 3). Declared here now, alongside
 * the other view-input shapes, so 05-05 only has to populate it — never touch this type. */
export interface PlanSegmentAttributes {
  ordinal: string;
  tag: string;
  label: string;
  gate: string | null;
  type: string | null;
  name: string | null;
}

/**
 * Pure grouping over a flat, already-classified node list: a new group starts at every `h2` or
 * `plan-section` node (heading = the node's own text/id), and every other node's html is appended
 * to the currently-open group. Nodes before the first boundary form a leading group with
 * `heading: null, id: null`, emitted only when its concatenated html is non-blank (a document
 * with no real preamble must not produce an empty leading group).
 */
export function groupDocumentSections(nodes: SectionNode[]): DocumentSectionGroup[] {
  const groups: DocumentSectionGroup[] = [];
  const leadingParts: string[] = [];
  let current: { id: string | null; heading: string | null; parts: string[] } | null = null;

  for (const node of nodes) {
    if (node.tag === 'h2' || node.tag === 'plan-section') {
      if (current) {
        groups.push({ id: current.id, heading: current.heading, html: current.parts.join('') });
      }
      current = { id: node.id, heading: node.text, parts: [node.html] };
      continue;
    }
    if (current) {
      current.parts.push(node.html);
    } else {
      leadingParts.push(node.html);
    }
  }
  if (current) {
    groups.push({ id: current.id, heading: current.heading, html: current.parts.join('') });
  }

  const leadingHtml = leadingParts.join('');
  if (leadingHtml.trim() !== '') {
    groups.unshift({ id: null, heading: null, html: leadingHtml });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Browser adapter — minimal, self-contained DOM surface (see module comment above).
// ---------------------------------------------------------------------------

interface MinimalElement {
  tagName: string;
  id: string;
  outerHTML: string;
  textContent: string | null;
  children: ArrayLike<MinimalElement>;
  getAttribute(name: string): string | null;
  cloneNode(deep: boolean): MinimalElement;
  querySelector(selector: string): MinimalElement | null;
  remove(): void;
}

interface MinimalParsedDocument {
  body: { children: ArrayLike<MinimalElement> };
}

declare const DOMParser:
  | { new (): { parseFromString(html: string, type: string): MinimalParsedDocument } }
  | undefined;

/** Strips a `.heading-copy` (the rendered `#` copy-link button) or `.plan-section-ordinal` child
 * out of a clone of `el` before reading its text, so that chrome never leaks into a label. */
function textWithoutDescendant(el: MinimalElement, descendantSelector: string): string {
  const clone = el.cloneNode(true);
  clone.querySelector(descendantSelector)?.remove();
  return (clone.textContent ?? '').trim();
}

function sectionNodeOf(el: MinimalElement): SectionNode {
  const tag = el.tagName.toLowerCase();

  if (tag === 'h2') {
    return {
      tag: 'h2',
      id: el.id || null,
      text: textWithoutDescendant(el, '.heading-copy'),
      html: el.outerHTML,
    };
  }

  if (tag === 'section' && el.getAttribute('data-plan-section') !== null) {
    const label = el.querySelector('.plan-section-label');
    const text = label ? textWithoutDescendant(label, '.plan-section-ordinal') : '';
    const ordinal = el.getAttribute('data-plan-ordinal') ?? '';
    return { tag: 'plan-section', id: `plan-section-${ordinal}`, text, html: el.outerHTML };
  }

  return { tag, id: el.id || null, text: '', html: el.outerHTML };
}

/** Browser-only adapter: parses `html` with an inert `DOMParser` document (scripts never
 * execute; the input is already server-sanitized) and walks only its top-level `doc.body.children`
 * into `SectionNode`s before handing them to `groupDocumentSections`. Falls back to a single
 * whole-html group when `DOMParser` is unavailable (SSR/test). */
export function splitRenderedDocument(html: string): DocumentSectionGroup[] {
  if (typeof DOMParser === 'undefined') {
    return [{ id: null, heading: null, html }];
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.children).map(sectionNodeOf);
  return groupDocumentSections(nodes);
}
