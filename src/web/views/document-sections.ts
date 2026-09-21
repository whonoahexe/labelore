// Splits an already-rendered document into top-level section groups, two ways: a pure, DOM-free
// grouping function (`groupDocumentSections`) consumed directly by unit tests, and a browser
// adapter (`splitRenderedDocument`) that walks the live DOM to produce the `SectionNode[]` input.
// A third browser adapter, `extractPlanSegments` (VIEW-04), reads the `data-plan-*` attributes
// `renderPlanRange` already emits per plan segment. Both adapters' DOM surface is described by
// small structural interfaces declared locally in this module rather than by importing `lib.dom`
// types — that keeps this file type-checkable both under `tsconfig.web.json` (real DOM lib
// present) and under `tsconfig.server.json` (no DOM lib; reached only via a direct test import of
// the DOM-free exports). The local `declare const DOMParser` shadows the real global for
// type-checking purposes only — `declare` erases at compile time, so the emitted JS still
// resolves `DOMParser` to whatever is actually in scope at runtime.

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

/** Populated by `extractPlanSegments` (below) from `renderPlanRange`'s `data-plan-ordinal`/
 * `data-plan-section`/`data-plan-gate` attributes (VIEW-04, Tag Projection Pattern 3). `tdd` and
 * `html` (sketch-004 B3, quick-260922-3us Task 2) are optional so existing literal
 * `PlanSegmentAttributes` fixtures in tests keep typechecking without every field. */
export interface PlanSegmentAttributes {
  ordinal: string;
  tag: string;
  label: string;
  gate: string | null;
  type: string | null;
  name: string | null;
  tdd?: string | null;
  html?: string;
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
  /** Read here only by `extractTableRows` (a table cell's own content html, for the "Evidence"
   * detail block) — a real `Element.innerHTML` getter, present on every actual DOM element. */
  innerHTML: string;
  textContent: string | null;
  children: ArrayLike<MinimalElement>;
  getAttribute(name: string): string | null;
  cloneNode(deep: boolean): MinimalElement;
  querySelector(selector: string): MinimalElement | null;
  querySelectorAll(selector: string): ArrayLike<MinimalElement>;
  remove(): void;
}

interface MinimalParsedDocument {
  body: { children: ArrayLike<MinimalElement>; querySelectorAll(selector: string): ArrayLike<MinimalElement> };
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

// ---------------------------------------------------------------------------
// sketch-004 B3 (quick-260922-3us): browser adapters consumed by layout.ts's composer — a fold's
// own title already names its section/panel, so the section's leading heading is stripped before
// rendering the fold body; a panel's roll-up chip and glance body need a lightweight read of "how
// many items, and what does the first one say" without re-parsing markdown.
// ---------------------------------------------------------------------------

/** Strips a leading `<h1>`-`<h6>` element off `html` (a fold/panel's own title already names it) —
 * a clone of the remaining top-level children's `outerHTML`, joined. Returns `html` unchanged when
 * the first top-level element isn't a heading, or when `DOMParser` is unavailable (SSR/test). */
export function stripLeadingHeading(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const children = Array.from(doc.body.children);
  if (children.length === 0) return html;
  const first = children[0];
  if (!/^h[1-6]$/.test(first.tagName.toLowerCase())) return html;
  return children
    .slice(1)
    .map((child) => child.outerHTML)
    .join('');
}

/** The first `<ul>`/`<ol>` found anywhere in `html`, in document order — every direct `<li>` child
 * of that single list (nested sub-lists' own `<li>`s are not counted). Fallback (no `DOMParser`):
 * a regex count of every `<li` occurrence in the raw string. */
export function countListItems(html: string): number {
  if (typeof DOMParser === 'undefined') {
    return (html.match(/<li[\s>]/g) ?? []).length;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const list = Array.from(doc.body.querySelectorAll('ul, ol'))[0];
  if (!list) return 0;
  return Array.from(list.children).filter((child) => child.tagName.toLowerCase() === 'li').length;
}

/** The trimmed text content of every direct `<li>` child of the first `<ul>`/`<ol>` found in
 * `html`, in document order. Fallback (no `DOMParser`): `[]`. */
export function listItemTexts(html: string): string[] {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const list = Array.from(doc.body.querySelectorAll('ul, ol'))[0];
  if (!list) return [];
  return Array.from(list.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((child) => (child.textContent ?? '').trim());
}

// ---------------------------------------------------------------------------
// VIEW-04: plan task-structure extraction (Tag Projection Pattern 3, presentation-side only —
// `renderPlanRange` already emits every attribute read below).
// ---------------------------------------------------------------------------

/** Returns the first direct child of `el` that is a `<section data-plan-section="value">` — not
 * a deeper descendant, so a nested task's own `name`/`action`/etc. children never shadow the
 * segment being inspected. */
function directChildPlanSection(el: MinimalElement, value: string): MinimalElement | null {
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (
      child.tagName.toLowerCase() === 'section' &&
      child.getAttribute('data-plan-section') === value
    ) {
      return child;
    }
  }
  return null;
}

function planSegmentAttributesOf(el: MinimalElement): PlanSegmentAttributes {
  const ordinal = el.getAttribute('data-plan-ordinal') ?? '';
  const tag = el.getAttribute('data-plan-section') ?? '';
  const labelEl = el.querySelector('.plan-section-label');
  const label = labelEl ? textWithoutDescendant(labelEl, '.plan-section-ordinal') : '';
  const gate = el.getAttribute('data-plan-gate');
  const type = el.getAttribute('data-plan-type');
  const tdd = el.getAttribute('data-plan-tdd');
  let name: string | null = null;
  if (tag === 'task') {
    const nameEl = directChildPlanSection(el, 'name');
    name = nameEl ? textWithoutDescendant(nameEl, '.plan-section-label') : null;
  }
  return { ordinal, tag, label, gate, type, name, tdd, html: el.outerHTML };
}

/** Browser-only adapter (VIEW-04): reads every `section.plan-section[data-plan-ordinal]` out of
 * the already-rendered plan HTML, in document order, via the same inert `DOMParser` pattern
 * `splitRenderedDocument` uses. Falls back to `[]` when `DOMParser` is unavailable (SSR/test) —
 * the plan-task-index block then selects no rows and `composeView` omits it (D-06). */
export function extractPlanSegments(html: string): PlanSegmentAttributes[] {
  if (typeof DOMParser === 'undefined') {
    return [];
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.querySelectorAll('section.plan-section[data-plan-ordinal]'));
  return nodes.map(planSegmentAttributesOf);
}

export interface TableRow {
  header: string[];
  cells: { text: string; html: string }[];
}

const HEADING_LEVEL_RE = /^h([1-4])$/;

/** Browser-only adapter (sketch-004 B3, quick-260922-3us Task 2): finds the first `h1`-`h4` whose
 * text (without a `.heading-copy` copy-link button) matches `heading`, then the first `<table>`
 * appearing after it in document order but before the next heading at the same or a shallower
 * level — returns one entry per `tbody tr`, each carrying the shared `thead th` header texts and
 * its own `td` cells (`{ text, html }`, `html` being that cell's own inner markup, e.g. for an
 * "Evidence" column that legitimately holds inline formatting). Fallback (no `DOMParser`, or no
 * matching heading/table found): `[]`. */
export function extractTableRows(html: string, heading: RegExp): TableRow[] {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const all = Array.from(doc.body.querySelectorAll('*'));

  let targetIndex = -1;
  let targetLevel = 0;
  for (let i = 0; i < all.length; i++) {
    const level = HEADING_LEVEL_RE.exec(all[i].tagName.toLowerCase())?.[1];
    if (level === undefined) continue;
    if (heading.test(textWithoutDescendant(all[i], '.heading-copy'))) {
      targetIndex = i;
      targetLevel = Number(level);
      break;
    }
  }
  if (targetIndex === -1) return [];

  let table: MinimalElement | null = null;
  for (let i = targetIndex + 1; i < all.length; i++) {
    const tag = all[i].tagName.toLowerCase();
    const level = HEADING_LEVEL_RE.exec(tag)?.[1];
    if (level !== undefined && Number(level) <= targetLevel) break;
    if (tag === 'table') {
      table = all[i];
      break;
    }
  }
  if (!table) return [];

  const header = Array.from(table.querySelectorAll('thead th')).map((th) =>
    (th.textContent ?? '').trim(),
  );
  return Array.from(table.querySelectorAll('tbody tr')).map((row) => ({
    header,
    cells: Array.from(row.querySelectorAll('td')).map((td) => ({
      text: (td.textContent ?? '').trim(),
      html: td.innerHTML,
    })),
  }));
}
